import type { ProjectRecord } from "../types/project";

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

const UNRESOLVED = /\b(?:unresolved|unknown|pending|undecided|unconfirmed|TBD|to be determined|awaiting (?:decision|approval|confirmation)|needs? (?:decision|approval|confirmation))\b/i;

interface SourceFragment {
  field: EcommerceSourceField;
  label: string;
  text: string;
}

function sourceFragments(project: ProjectRecord): SourceFragment[] {
  return SOURCE_FIELDS.flatMap(([field, label]) => String(project.intake[field] ?? "")
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

function candidateMatches(text: string, pattern: RegExp): CandidateMatch[] {
  const matcher = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  return [...text.matchAll(matcher)].map(match => ({
    value: match[1] ?? match[0],
    matchedText: match[0],
    index: match.index ?? 0,
    length: match[0].length
  }));
}

function candidateClause(text: string, index: number, length: number): string {
  const before = text.slice(0, index);
  const leftBoundary = Math.max(before.lastIndexOf(";"), before.lastIndexOf(","), before.lastIndexOf("\n"), before.lastIndexOf("."));
  const after = text.slice(index + length);
  const offsets = [after.indexOf(";"), after.indexOf(","), after.indexOf("\n"), after.indexOf(".")].filter(offset => offset >= 0);
  const rightBoundary = offsets.length ? index + length + Math.min(...offsets) : text.length;
  return text.slice(leftBoundary + 1, rightBoundary).trim();
}

function isNegative(fragment: SourceFragment, candidate: CandidateMatch): boolean {
  if (fragment.field === "outOfScope") return true;
  const clause = candidateClause(fragment.text, candidate.index, candidate.length);
  const escaped = candidate.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = new RegExp(`(?:^|\\b)(?:(?:no|without|exclude(?:d)?)\\s+(?:(?!but\\b|and\\b|or\\b)[\\p{L}\\p{N}-]+\\s+){0,3}|do\\s+not\\s+(?:support|use|allow|accept|require|include|enable)\\s+(?:the\\s+)?|not\\s+(?:supporting|using|allowing|accepting|requiring|including|enabling)\\s+(?:the\\s+)?)${escaped}\\b`, "iu");
  const postfix = new RegExp(`\\b${escaped}\\b(?:\\s+[\\p{L}\\p{N}-]+){0,3}\\s+(?:(?:is|are)\\s+)?(?:not\\s+(?:approved|required|supported|in\\s+scope|accepted|available|allowed|enabled)|disabled|excluded|unsupported|unavailable)\\b`, "iu");
  return prefix.test(clause) || postfix.test(clause);
}

function positiveMatches(fragment: SourceFragment, pattern: RegExp): CandidateMatch[] {
  return candidateMatches(fragment.text, pattern).filter(candidate => {
    const clause = candidateClause(fragment.text, candidate.index, candidate.length);
    return !UNRESOLVED.test(clause) && !isNegative(fragment, candidate);
  });
}

function evidence(fragments: SourceFragment[], pattern: RegExp): SourceFragment[] {
  const matches = matching(fragments, pattern);
  return matches.filter(fragment => positiveMatches(fragment, pattern).length > 0);
}

function describeEvidence(fragments: SourceFragment[]): string {
  return fragments.slice(0, 5).map(fragment => `${fragment.label}: ${fragment.text}`).join("; ");
}

function firstPositiveMatch(fragments: SourceFragment[], pattern: RegExp): string {
  for (const fragment of fragments) {
    const match = positiveMatches(fragment, pattern)[0];
    if (match) return match.value;
  }
  return "";
}

function mentionedButUnresolved(fragments: SourceFragment[], pattern: RegExp): boolean {
  return matching(fragments, pattern).some(fragment => candidateMatches(fragment.text, pattern)
    .some(candidate => UNRESOLVED.test(candidateClause(fragment.text, candidate.index, candidate.length))));
}

/** Build verification only from universal commerce invariants and recorded intake evidence. */
export function ecommerceTestRequirements(project: ProjectRecord): EcommerceTestRequirement[] {
  const fragments = sourceFragments(project);
  const checkoutMode = firstPositiveMatch(fragments, /\b(guest checkout|authenticated customer checkout|authenticated checkout|account checkout|mixed checkout)\b/i).toLocaleLowerCase();
  const currency = firstPositiveMatch(fragments, /\b(CAD|USD|EUR|GBP|AUD|NZD|JPY|CNY|INR|CHF|SEK|NOK|DKK|MXN|BRL)\b/);
  const paymentProvider = firstPositiveMatch(fragments, /\b([A-Z][A-Za-z0-9&.-]+)\s+(?:payments?|webhooks?)\b/);
  const tax = evidence(fragments, /\btax(?:es|ation)?\b|\bGST\b|\bHST\b|\bVAT\b/i);
  const shipping = evidence(fragments, /\bshipping\b|\bcarrier\b/i);
  const pickup = evidence(fragments, /\bpickup\b|\bpick-up\b/i);
  const inventory = evidence(fragments, /\binventory\b|\bstock\b/i);
  const digital = evidence(fragments, /\bdigital\b|\bsoftware\b|\bdownload\b|\bentitlement\b/i);
  const quotes = evidence(fragments, /\bquotes?\b|\buploads?\b|\bcustom work\b/i);
  const lookup = evidence(fragments, /\border lookup\b|\border status\b|\bguest lookup\b/i);
  const returns = evidence(fragments, /\breturns?\b|\brefunds?\b|\bfinal[- ]sale\b/i);
  const roles = evidence(fragments, /\broles?\b|\badmin(?:istrator)?\b|\bpermissions?\b|\bprivileged\b/i);
  const mfa = firstPositiveMatch(fragments, /\b(admin(?:istrator)? MFA)\b/i);
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
