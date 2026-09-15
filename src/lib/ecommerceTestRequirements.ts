import type { ProjectRecord } from "../types/project";
import { classifyResolutionValue, validatedEcommerceConfiguration } from "./ecommerceDecisions";

export interface EcommerceTestRequirement {
  category: string;
  expectedResult: string;
}

type EcommerceSourceField = keyof ProjectRecord["intake"];

const SOURCE_FIELDS: Array<[EcommerceSourceField, string]> = [
  ["requiredFeatures", "required features"],
  ["featureDescription", "feature description"],
  ["workflows", "workflows"],
  ["workflowTrigger", "workflow trigger"],
  ["workflowSteps", "workflow steps"],
  ["screens", "screens"],
  ["websitePages", "pages"],
  ["dataEntities", "data entities"],
  ["dataCollections", "data collections"],
  ["fields", "fields"],
  ["integrations", "integrations"],
  ["rolePermissionsSummary", "role permissions"],
  ["authenticationExpectation", "authentication"],
  ["permissionRules", "permission rules"],
  ["constraints", "constraints"],
  ["acceptanceNotes", "acceptance notes"],
  ["successCriteria", "success criteria"],
  ["outOfScope", "out of scope"],
  ["accessibilityNotes", "accessibility"],
  ["ecommerceStorefrontModel", "storefront model"],
  ["ecommerceRoutes", "storefront routes"],
  ["ecommerceCartScope", "cart scope"]
];

interface SourceFragment {
  field: EcommerceSourceField;
  label: string;
  text: string;
}

function sourceFragments(project: ProjectRecord): SourceFragment[] {
  const configuration = validatedEcommerceConfiguration(project);
  return SOURCE_FIELDS.flatMap(([field, label]) => String(field in configuration
    ? configuration[field as keyof typeof configuration].value
    : project.intake[field] ?? "")
    .split(/\r?\n|;\s*/)
    .map(text => text.trim())
    .filter(Boolean)
    .map(text => ({ field, label, text })));
}

function matching(fragments: SourceFragment[], pattern: RegExp): SourceFragment[] {
  return fragments.filter(fragment => pattern.test(fragment.text));
}

interface CandidateMatch {
  value: string;
  matchedText: string;
  index: number;
  length: number;
}

type EvidencePolarity = "positive" | "negative" | "unresolved";
interface OptionEvidence {
  value: string;
  sourceField: EcommerceSourceField;
  sourceText: string;
  clause: string;
  polarity: EvidencePolarity;
  index: number;
  length: number;
}
type CandidateMatcher = RegExp | ((text: string) => CandidateMatch[]);

function candidateMatches(text: string, pattern: RegExp): CandidateMatch[] {
  const matcher = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  return [...text.matchAll(matcher)].map(match => ({
    value: match[1] ?? match[0],
    matchedText: match[0],
    index: match.index ?? 0,
    length: match[0].length
  }));
}

function candidateClauseSpan(text: string, index: number, length: number): { start: number; end: number; text: string } {
  let leftBoundary = 0;
  let rightBoundary = text.length;
  const boundaries = /[;\n.]|,\s*(?:but|however|instead)\b|\b(?:but|however|instead)\b/gi;
  for (const boundary of text.matchAll(boundaries)) {
    const start = boundary.index ?? 0;
    const end = start + boundary[0].length;
    if (end <= index) leftBoundary = end;
    else if (start >= index + length) {
      rightBoundary = start;
      break;
    }
  }
  const raw = text.slice(leftBoundary, rightBoundary);
  const leadingWhitespace = raw.length - raw.trimStart().length;
  const trailingWhitespace = raw.length - raw.trimEnd().length;
  const start = leftBoundary + leadingWhitespace;
  const end = rightBoundary - trailingWhitespace;
  return { start, end, text: text.slice(start, end) };
}

function candidateClause(text: string, index: number, length: number): string {
  return candidateClauseSpan(text, index, length).text;
}

function isNegative(fragment: SourceFragment, candidate: CandidateMatch): boolean {
  if (fragment.field === "outOfScope") return true;
  const clauseSpan = candidateClauseSpan(fragment.text, candidate.index, candidate.length);
  const clause = clauseSpan.text;
  const escaped = candidate.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const relativeIndex = Math.max(0, candidate.index - clauseSpan.start);
  const before = clause.slice(0, relativeIndex);
  const after = clause.slice(relativeIndex + candidate.length);
  const leftComma = before.lastIndexOf(",");
  const nextComma = after.indexOf(",");
  const localStart = leftComma + 1;
  const localEnd = nextComma >= 0 ? relativeIndex + candidate.length + nextComma : clause.length;
  const local = clause.slice(localStart, localEnd).trim();
  const directPrefix = new RegExp(`(?:^|\\b)(?:(?:no|without|exclude(?:d)?)\\s+(?:(?!but\\b|and\\b|or\\b)[\\p{L}\\p{N}-]+\\s+){0,3}|do\\s+not\\s+(?:support|use|allow|accept|require|include|enable)\\s+(?:the\\s+)?|not\\s+(?:supporting|using|allowing|accepting|requiring|including|enabling)\\s+(?:the\\s+)?|rather\\s+than\\s+)${escaped}\\b`, "iu");
  const directPostfix = new RegExp(`\\b${escaped}\\b(?:\\s+[\\p{L}\\p{N}-]+){0,3}\\s+(?:(?:is|are)\\s+)?(?:not\\s+(?:approved|required|supported|in\\s+scope|accepted|available|allowed|enabled)|disabled|excluded|unsupported|unavailable)\\b`, "iu");
  if (directPrefix.test(local) || directPostfix.test(local)) return true;

  const localPositive = new RegExp(`\\b${escaped}\\b(?:\\s+(?:is|are))?\\s+(?:only|required|accepted|supported|approved|available|allowed|enabled)\\b`, "iu").test(local);
  if (localPositive) return false;

  const leadingNegative = /^\s*(?:(?:no|without|exclude(?:d)?)\b|do\s+not\s+(?:support|use|allow|accept|require|include|enable)\b|not\s+(?:supporting|using|allowing|accepting|requiring|including|enabling)\b)/iu;
  if (leadingNegative.test(clause) && /,|\b(?:and|or)\b/i.test(before)) return true;

  const coordinatedPostfix = /\b(?:is|are)\s+not\s+(?:approved|required|supported|in\s+scope|accepted|available|allowed|enabled)\b|\b(?:disabled|excluded|unsupported|unavailable)\b/iu;
  const postfixMatch = coordinatedPostfix.exec(after);
  if (postfixMatch && /,|\b(?:and|or)\b/i.test(after.slice(0, postfixMatch.index))) return true;
  return false;
}

function matchesFor(text: string, matcher: CandidateMatcher): CandidateMatch[] {
  return matcher instanceof RegExp ? candidateMatches(text, matcher) : matcher(text);
}

// These nouns qualify the matched requirement itself. Arbitrary prose cannot
// bridge an option to a later order/payment/job state.
const REQUIREMENT_QUALIFIERS = /^(?:\s*(?:handling|treatment|jurisdiction|model|provider|integration|policy|role|roles|delivery|location|method|mode|scope|configuration|contract|implementation|requirements?|setup|approach|support|rates?|thresholds?|process|rules?|payments?|webhooks?)\b){0,4}\s*(?:(?:is|are|remains?)\s+)?[:=-]?\s*/i;
function classifyCandidateEvidence(fragment: SourceFragment, candidate: CandidateMatch): EvidencePolarity {
  if (isNegative(fragment, candidate)) return "negative";
  const span = candidateClauseSpan(fragment.text, candidate.index, candidate.length);
  const relativeIndex = candidate.index - span.start;
  const before = span.text.slice(0, relativeIndex).trim();
  const after = span.text.slice(relativeIndex + candidate.length).trim();
  const subjectStatus = after.replace(REQUIREMENT_QUALIFIERS, "");
  if (classifyResolutionValue(subjectStatus) === "unresolved") return "unresolved";

  // A status preceding the subject must explicitly govern it ("pending
  // approval for VAT"), or be a standalone placeholder immediately before it.
  const governedPrefix = before.match(/(?:^|[, :])((?:pending|awaiting|needs?|to be determined|deferred|unknown|unconfirmed|undecided|TBD)\b[^,]*?)\s+(?:for|of|on)\s*$/i)?.[1];
  if (governedPrefix && classifyResolutionValue(governedPrefix) === "unresolved") return "unresolved";
  if (/^(?:TBD|unknown|unconfirmed|undecided|unresolved)\s*[:=-]?$/i.test(before)) return "unresolved";
  return "positive";
}

function optionEvidence(fragments: SourceFragment[], matcher: CandidateMatcher): OptionEvidence[] {
  return fragments.flatMap(fragment => matchesFor(fragment.text, matcher).map(candidate => {
    const clause = candidateClause(fragment.text, candidate.index, candidate.length);
    const polarity = classifyCandidateEvidence(fragment, candidate);
    return { value: candidate.value, sourceField: fragment.field, sourceText: fragment.text, clause, polarity, index: candidate.index, length: candidate.length };
  }));
}

function positiveMatches(fragment: SourceFragment, pattern: RegExp): CandidateMatch[] {
  const positive = optionEvidence([fragment], pattern).filter(candidate => candidate.polarity === "positive");
  return positive.map(candidate => ({ value: candidate.value, matchedText: candidate.value, index: candidate.index, length: candidate.length }));
}

function evidence(fragments: SourceFragment[], pattern: RegExp): SourceFragment[] {
  const matches = matching(fragments, pattern);
  return matches.filter(fragment => positiveMatches(fragment, pattern).length > 0);
}

function describeEvidence(fragments: SourceFragment[]): string {
  return fragments.slice(0, 5).map(fragment => `${fragment.label}: ${fragment.text}`).join("; ");
}

function firstPositiveMatch(fragments: SourceFragment[], matcher: CandidateMatcher): OptionEvidence | undefined {
  return optionEvidence(fragments, matcher).find(candidate => candidate.polarity === "positive");
}

function mentionedButUnresolved(fragments: SourceFragment[], pattern: RegExp): boolean {
  return optionEvidence(matching(fragments, pattern), pattern).some(candidate => candidate.polarity === "unresolved");
}

const PROVIDER_LEADING_WORDS = new Set(["use", "using", "support", "supports", "supported", "recorded", "approved", "no"]);
function providerName(value: string): string {
  const words = value.trim().split(/\s+/);
  while (words.length > 1 && PROVIDER_LEADING_WORDS.has(words[0].toLocaleLowerCase())) words.shift();
  return words.join(" ");
}

function providerCandidateMatches(text: string): CandidateMatch[] {
  const patterns = [
    /\b([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,4})\s+(?:payments?|webhooks?)\b/g,
    /\b(?:payments?|webhooks?)\s+(?:through|via|from)\s+([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,3})\b/g,
    /\b([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,3})\s+(?:is\s+)?not\s+(?:supported|approved|accepted|allowed|available|enabled)\b/g
  ];
  const matches = patterns.flatMap(pattern => [...text.matchAll(pattern)].map(match => {
    const value = providerName(match[1]);
    const captureOffset = match[0].indexOf(match[1]);
    return { value, matchedText: match[0], index: (match.index ?? 0) + captureOffset, length: match[1].length };
  }));
  const exclusion = text.match(/\b(?:no|do\s+not\s+use|without|exclude(?:d)?)\s+([^;.]+)/i);
  if (exclusion) {
    const offset = (exclusion.index ?? 0) + exclusion[0].indexOf(exclusion[1]);
    for (const name of exclusion[1].matchAll(/\b([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*)*)\b/g)) {
      matches.push({ value: name[1], matchedText: name[0], index: offset + (name.index ?? 0), length: name[0].length });
    }
  }
  return matches
    .filter(match => Boolean(match.value))
    .sort((left, right) => left.index - right.index)
    .filter((match, index, all) => !all.slice(0, index).some(previous => previous.index === match.index && previous.value === match.value));
}

/** Build verification only from universal commerce invariants and recorded intake evidence. */
export function ecommerceTestRequirements(project: ProjectRecord): EcommerceTestRequirement[] {
  const fragments = sourceFragments(project);
  const checkoutEvidence = firstPositiveMatch(fragments, /\b(guest checkout|authenticated customer checkout|authenticated checkout|account checkout|mixed checkout)\b/i);
  const currencyEvidence = firstPositiveMatch(fragments, /\b(CAD|USD|EUR|GBP|AUD|NZD|JPY|CNY|INR|CHF|SEK|NOK|DKK|MXN|BRL)\b/);
  const providerEvidence = firstPositiveMatch(fragments, providerCandidateMatches);
  const checkoutMode = checkoutEvidence?.value.toLocaleLowerCase() ?? "";
  const currency = currencyEvidence?.value ?? "";
  const paymentProvider = providerEvidence?.value ?? "";
  const tax = evidence(fragments, /\btax(?:es|ation)?\b|\bGST\b|\bHST\b|\bVAT\b/i);
  const shipping = evidence(fragments, /\bshipping\b|\bcarrier\b/i);
  const pickup = evidence(fragments, /\bpickup\b|\bpick-up\b/i);
  const inventory = evidence(fragments, /\binventory\b|\bstock\b/i);
  const digital = evidence(fragments, /\bdigital\b|\bsoftware\b|\bdownload\b|\bentitlement\b/i);
  const quotes = evidence(fragments, /\bquotes?\b|\buploads?\b|\bcustom work\b/i);
  const lookup = evidence(fragments, /\border lookup\b|\border status\b|\bguest lookup\b/i);
  const returns = evidence(fragments, /\breturns?\b|\brefunds?\b|\bfinal[- ]sale\b/i);
  const roles = evidence(fragments, /\broles?\b|\badmin(?:istrator)?s?\b|\bpermissions?\b|\bprivileged\b/i);
  const mfa = firstPositiveMatch(fragments, /\b(admin(?:istrator)? MFA)\b/i)?.value ?? "";
  const accessibilityTarget = String(project.intake.accessibilityNotes ?? "").trim();
  const dependencies: string[] = [];

  if (!checkoutMode) dependencies.push("resolve the recorded checkout mode before mode-specific checkout verification");
  if (!currency) dependencies.push("resolve the recorded currency before currency-specific totals and payment verification");
  if (!paymentProvider) dependencies.push("resolve the recorded payment provider before provider-specific webhook and refund verification");
  if (!tax.length && mentionedButUnresolved(fragments, /\btax(?:es|ation)?\b|\bjurisdiction\b|\bGST\b|\bHST\b|\bVAT\b/i)) dependencies.push("resolve the recorded tax jurisdiction and model before tax verification");
  if (!shipping.length && mentionedButUnresolved(fragments, /\bshipping\b|\bcarrier\b/i)) dependencies.push("resolve the recorded shipping model before shipping verification");
  if (!returns.length && mentionedButUnresolved(fragments, /\breturns?\b|\brefunds?\b/i)) dependencies.push("resolve the recorded return and refund policy before policy verification");

  const rows: EcommerceTestRequirement[] = [
    {
      category: "Catalog/storefront",
      expectedResult: "Verify every configured route resolves to its recorded brand/theme and catalog context; preserve merchant and item attribution, and hide unpublished items."
    },
    {
      category: "Cart",
      expectedResult: "Add, change and remove eligible items; enforce the recorded shared or separate cart scope and calculate totals using the approved server-side pricing contract."
    },
    {
      category: "Checkout/payment",
      expectedResult: `Test the recorded ${checkoutMode || "checkout"} flow${currency ? ` in ${currency}` : ""}${paymentProvider ? ` using the recorded ${paymentProvider} payment integration` : ""}; exercise approved success and failure outcomes, keep payment secrets out of client and log output, and verify server-calculated totals.`
    }
  ];

  if (dependencies.length) rows.push({
    category: "Scope dependencies",
    expectedResult: `${dependencies.join("; ")}. Do not treat an unresolved business choice as a passing result.`
  });
  if (paymentProvider || evidence(fragments, /\bwebhooks?\b|\bidempoten/i).length) rows.push({
    category: "Webhooks/idempotency/reconciliation",
    expectedResult: `Verify signatures and event authenticity using the recorded ${paymentProvider ? `${paymentProvider} integration` : "provider contract"}; replay valid events without duplicate charges or orders, and reconcile delayed, reordered and failed events with provider records.`
  });
  if (tax.length) rows.push({ category: "Tax", expectedResult: `Test the recorded tax scope (${describeEvidence(tax)}), including approved categories, jurisdiction rules and rounding; unresolved tax decisions block release.` });
  if (shipping.length) rows.push({ category: "Shipping", expectedResult: `Test the recorded shipping scope (${describeEvidence(shipping)}), including applicable rate failures, address validation, eligibility and approved thresholds.` });
  if (pickup.length) rows.push({ category: "Pickup", expectedResult: `Test only the recorded pickup scope (${describeEvidence(pickup)}); show approved locations, timing and instructions only for eligible carts.` });
  if (inventory.length) rows.push({ category: "Inventory", expectedResult: `Test the recorded inventory scope (${describeEvidence(inventory)}), including concurrent availability changes and approved order, cancellation and refund adjustments; prevent overselling.` });
  if (digital.length) rows.push({ category: "Digital delivery", expectedResult: `Test the recorded digital-product scope (${describeEvidence(digital)}); create authorized delivery or entitlements only after verified payment and prevent cross-order access.` });
  if (quotes.length) rows.push({ category: "Quotes/uploads", expectedResult: `Test the recorded quote or upload scope (${describeEvidence(quotes)}); enforce approved file restrictions and authorization through review, approval, payment and delivery.` });
  if (lookup.length) rows.push({ category: "Order lookup", expectedResult: `Test the recorded order-access scope (${describeEvidence(lookup)}); use non-enumerating responses, rate limits and order-scoped authorization with the recorded verification method.` });
  if (returns.length) rows.push({ category: "Refunds/returns", expectedResult: `Test the recorded return and refund policy (${describeEvidence(returns)}), including eligibility, item policy snapshots, approved exceptions, provider failures and inventory/order reconciliation.` });
  if (roles.length) rows.push({ category: "Roles", expectedResult: `Test the recorded role and permission scope (${describeEvidence(roles)})${mfa ? `, including ${mfa}` : ""}; enforce server-side authorization for privileged operations and prevent credential, role or unauthorized export access.` });

  rows.push(
    { category: "Accessibility", expectedResult: `Test keyboard, focus, screen readers, labels and errors, contrast and reduced motion across configured commerce journeys${accessibilityTarget ? ` against the recorded target (${accessibilityTarget})` : " after the accessibility target is recorded"}.` },
    { category: "Security", expectedResult: "Verify CSRF, XSS, injection and SSRF controls; isolate secrets, authenticate signed requests, secure privileged sessions, rate-limit sensitive operations and mask logs." },
    { category: "Performance", expectedResult: "Measure configured storefront and transaction paths on recorded devices; agree budgets before acceptance and report actual measurements without invented thresholds." },
    { category: "Backup/restore", expectedResult: "Restore an isolated backup and reconcile applicable orders, inventory and digital access; record evidence against the approved recovery objectives." },
    { category: "Smoke testing", expectedResult: "After an approved deployment, verify configured routes, catalog, cart, checkout, applicable integrations, notifications, health and rollback using approved test data." }
  );
  return rows;
}
