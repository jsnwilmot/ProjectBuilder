import type { ProjectRecord } from "../types/project";
import { classifyResolutionValue, ECOMMERCE_CURRENCY_CODES, ecommerceResolvedSelections, validatedEcommerceConfiguration } from "./ecommerceDecisions";

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
  const directPrefix = new RegExp(`(?:^|\\b)(?:(?:no|without|exclude(?:d)?)\\s+(?:(?!but\\b|and\\b|or\\b)[\\p{L}\\p{N}-]+\\s+){0,3}|not\\s+|do\\s+not\\s+(?:support|use|allow|accept|require|include|enable)\\s+(?:the\\s+)?|not\\s+(?:supporting|using|allowing|accepting|requiring|including|enabling)\\s+(?:the\\s+)?|rather\\s+than\\s+)${escaped}\\b`, "iu");
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
// Selection subjects, not domain-object states such as pending orders. All
// option families use this grammar and the existing resolution classifier.
const DECISION_SUBJECT = "(?:payment currency|payment provider|checkout mode|shipping provider|shipping model|tax jurisdiction|tax model|return policy|currency|provider|checkout|MFA|authentication|delivery|integration|option|selection|choice|decision)";
const decisionSubjectPrefix = new RegExp(`^${DECISION_SUBJECT}\\s+(.+)$`, "i");
const awaitingSubjectPrefix = new RegExp(`^awaiting\\s+(${DECISION_SUBJECT})\\s+(decision|approval|confirmation|selection)\\b`, "i");
const approvalOfSubjectPrefix = new RegExp(`^((?:awaiting|pending)\\s+(?:approval|confirmation|decision|selection))\\s+(?:of|for|on)\\s+${DECISION_SUBJECT}\\b`, "i");
const speculativePrefix = /\b(?:maybe|possibly|probably|likely|may\s+be)\s*$/i;
const speculativePostfix = /^(?:(?:is|are|remains?)\s+)?(?:maybe|possibly|probably|likely|(?:being\s+)?considered|under\s+consideration)\b/i;
const decisionNounTail = /^(?:(?:final|client|stakeholder|vendor)\s+)*(approval|confirmation|selection|decision)(?:\s+for\s+(?:launch|implementation|release|deployment))?$/iu;
const attributedDecisionTail = /^(?:(?:final|client|stakeholder|vendor)\s+)*(approval|confirmation|selection|decision)\s+(?:by|from)\s+(?:the\s+)?(.+)$/iu;
// An attributed action has a completed actor subject plus a predicate and its
// complement. Actor heads use grammatical role/collective shapes; predicate
// spelling and s/es morphology are deliberately not semantic authorities.
const attributedCollectiveHead = /^(?:committee|board|group|team|staff)$/iu;
const attributedRoleHead = /^[\p{L}-]+(?:er|ers|or|ors|ist|ists|yst|ysts|ant|ants|ent|ents)$/iu;
function hasAttributedActionContinuation(actorText: string): boolean {
  const words = actorText.trim().split(/\s+/)
    .map(word => word.replace(/[^\p{L}-]/gu, ""))
    .filter(Boolean);
  let collectiveIndex = -1;
  for (let index = words.length - 1; index >= 0; index -= 1) {
    if (attributedCollectiveHead.test(words[index])) {
      collectiveIndex = index;
      break;
    }
  }
  if (collectiveIndex >= 0) return words.length - collectiveIndex - 1 >= 2;
  return words.some((word, index) => attributedRoleHead.test(word) && words.length - index - 1 >= 2);
}
function candidateDecisionNoun(text: string): string | undefined {
  const simple = decisionNounTail.exec(text);
  if (simple) return simple[1];
  const attributed = attributedDecisionTail.exec(text);
  if (!attributed || hasAttributedActionContinuation(attributed[2])) return undefined;
  return attributed[1];
}

const pendingWhileStatus = /^while\s+(.+?)\s+(?:is|are|remains?)\s+(?:still\s+)?(?:pending|awaiting|unapproved|unconfirmed|undecided)\b.*$/iu;
const providerDecisionSubject = /^(?:(.+?)\s+)?(approval|confirmation|selection|decision|authorization|review)$/iu;
const possessiveDecisionActor = /^(?:[\p{L}\p{N}-]+(?:\s+[\p{L}\p{N}-]+){0,4})['’]s$/iu;
function isProviderSelectionDecisionSubject(rawSubject: string): boolean {
  const subject = rawSubject.trim().replace(/^the\s+/iu, "").trim();
  const decision = providerDecisionSubject.exec(subject);
  if (!decision) return false;
  const qualifier = (decision[1] ?? "").trim();
  if (!qualifier) return true;
  if (/^(?:payment\s+)?provider$/iu.test(qualifier)) return true;
  if (/^(?:client|stakeholder|vendor)$/iu.test(qualifier)) return true;
  return possessiveDecisionActor.test(qualifier);
}
function unresolvedDecisionStatus(text: string): boolean {
  // Canonicalize candidate-bound approval grammar for the shared resolution
  // authority. No arbitrary noun phrase can bridge a candidate to this state.
  let status = text.split(/[:,]/, 1)[0].trim()
    .replace(/^(?:(?:is|are|was|were|remains?|still)\s+)+/i, "")
    .replace(/^subject\s+to\s+.*\b(approval|confirmation|decision|selection|review)\b.*$/i, "pending $1")
    .replace(/^under\s+(review|consideration)\b.*$/i, "awaiting $1");
  const pendingWhile = pendingWhileStatus.exec(status);
  if (pendingWhile && isProviderSelectionDecisionSubject(pendingWhile[1])) status = "pending approval";
  status = status
    .replace(/^(?:has\s+not\s+(?:yet\s+)?been\s+|not\s+(?:yet\s+)?)(?:approved|confirmed|selected|accepted)\b.*$/i, "unconfirmed")
    .replace(/^unapproved\b.*$/i, "unconfirmed")
    .replace(/^((?:pending|awaiting)\s+)final\s+(approval|confirmation|selection)\b/i, "$1$2");
  return classifyResolutionValue(status) === "unresolved";
}

function unresolvedCandidatePrefix(before: string, after: string): boolean {
  if (speculativePrefix.test(before)) return true;
  if (/^(?:we\s+)?(?:considered|are\s+considering|have\s+considered)\s*$/i.test(before)) return true;
  const question = before.match(/^(?:(?:we\s+are|i\s+am)\s+)?(.+?)\s+(?:which|whether|if|what)\b/i);
  if (question && classifyResolutionValue(question[1]) === "unresolved") return true;
  const subject = decisionSubjectPrefix.exec(before);
  if (subject && unresolvedDecisionStatus(subject[1])) return true;
  const awaiting = awaitingSubjectPrefix.exec(before);
  if (awaiting && classifyResolutionValue(`awaiting ${awaiting[2]}`) === "unresolved") return true;
  const approval = approvalOfSubjectPrefix.exec(before);
  if (approval && classifyResolutionValue(approval[1]) === "unresolved") return true;
  const governed = before.match(/(?:^|[, :])((?:pending|awaiting|needs?|to be determined|deferred|unknown|unconfirmed|undecided|TBD)\b[^,]*?)\s+(?:for|of|on)\s*$/i)?.[1];
  if (governed && classifyResolutionValue(governed) === "unresolved") return true;
  const decisionNoun = candidateDecisionNoun(after.replace(REQUIREMENT_QUALIFIERS, "").trim());
  if (decisionNoun && classifyResolutionValue(`${before} ${decisionNoun}`) === "unresolved") return true;
  // A bare state adjective governs the candidate only when that candidate
  // completes the subject/value phrase. Continuation into a noun phrase/action
  // ("pending inventory refunds require review") describes a business object,
  // irrespective of the object's vocabulary. Qualified requirement subjects
  // and value-list delimiters remain supported.
  const continuation = after.replace(REQUIREMENT_QUALIFIERS, "").split(/[:,]/, 1)[0].trim();
  return !continuation && classifyResolutionValue(before) === "unresolved";
}

function classifyCandidateEvidence(fragment: SourceFragment, candidate: CandidateMatch): EvidencePolarity {
  if (isNegative(fragment, candidate)) return "negative";
  const span = candidateClauseSpan(fragment.text, candidate.index, candidate.length);
  const relativeIndex = candidate.index - span.start;
  const before = span.text.slice(0, relativeIndex).trim();
  const after = span.text.slice(relativeIndex + candidate.length).trim();
  const subjectStatus = after.replace(REQUIREMENT_QUALIFIERS, "");
  // An explicit subsequent approval of this candidate can supersede tentative
  // wording. Other candidates' approvals cannot resolve this one.
  if (/^,?\s*(?:(?:maybe|possibly|probably|likely)\s*,\s*)?(?:has\s+)?(?:now|since)\s+(?:been\s+)?(?:approved|selected|confirmed|accepted)\s*[.!]?$/i.test(subjectStatus)) return "positive";
  if (unresolvedDecisionStatus(subjectStatus) || speculativePostfix.test(subjectStatus)) return "unresolved";
  const laterStatus = subjectStatus.match(/^(?:approved|accepted|supported|only)\s*,\s*(.+)$/i)?.[1];
  if (laterStatus && unresolvedDecisionStatus(laterStatus)) return "unresolved";
  if (unresolvedCandidatePrefix(before, after)) return "unresolved";
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
const CURRENCY_CODES = ECOMMERCE_CURRENCY_CODES.join("|");
const currencyCode = new RegExp(`\\b(?:${CURRENCY_CODES})\\b`, "i");
// Legacy "Name payments/webhooks" is inherently less explicit. Reject state,
// channel and geographic descriptors, not vendors; explicit relationship forms
// are preferred and do not depend on a vendor allowlist.
const paymentDescriptor = /\b(?:pending|failed|successful|success|unknown|deferred|unconfirmed|undecided|unapproved|online|offline|guest|authenticated|Canadian|American|European|international|domestic|local|credit|debit|card|cash|digital|mobile|recurring|manual|automatic)\b/i;
function providerName(value: string): string {
  const words = value.trim().split(/\s+/);
  while (words.length > 1 && PROVIDER_LEADING_WORDS.has(words[0].toLocaleLowerCase())) words.shift();
  return words.join(" ");
}

// Explicit relationships establish that the following text starts with a
// provider entity, but the rest of the clause can describe its status or scope.
// Keep that continuation in the source fragment so candidate-relative polarity
// classification can still evaluate it.
const explicitProviderContextPatterns = [
  /\s+(?=(?:is|are|was|were|has|have|remains?|still)\b)/iu,
  /\s+(?=(?:pending|awaiting|unapproved|unconfirmed|undecided|deferred)\b)/iu,
  /\s+(?=(?:subject\s+to|under\s+(?:review|consideration)|not\s+(?:yet\s+)?(?:approved|confirmed|selected|accepted))\b)/iu,
  /\s+(?=(?:for|when|while)\b)/iu
];
function explicitProviderContextStart(value: string): number | undefined {
  const boundaries = explicitProviderContextPatterns
    .map(pattern => pattern.exec(value)?.index)
    .filter((index): index is number => typeof index === "number" && index > 0);
  return boundaries.length ? Math.min(...boundaries) : undefined;
}
function extractExplicitProviderCandidate(rawValue: string): { value: string; offset: number } {
  const leadingWhitespace = rawValue.search(/\S/);
  if (leadingWhitespace < 0) return { value: "", offset: 0 };
  const completeValue = rawValue.trim();
  const contextStart = explicitProviderContextStart(completeValue);
  const value = (contextStart === undefined ? completeValue : completeValue.slice(0, contextStart)).trim();
  return { value, offset: leadingWhitespace };
}

function explicitProviderCandidates(text: string): CandidateMatch[] {
  const relationships = [
    /\b(?:payments?|webhooks?)\s+(?:through|via|from)\s+([^;.\n,]+)/gi,
    /\bpayment\s+provider\s*(?::|is)\s*([^;.\n,]+)/gi,
    /\buse\s+([^;.\n,]+?)\s+for\s+payments?\b/gi
  ];
  return relationships.flatMap(pattern => [...text.matchAll(pattern)].flatMap(match => {
    const { value, offset } = extractExplicitProviderCandidate(match[1]);
    if (classifyResolutionValue(value) !== "resolved" || currencyCode.test(value)) return [];
    const directNegation = /^(?:not|no)\s+(.+)$/iu.exec(value);
    const candidateValue = directNegation?.[1].trim() ?? value;
    if (classifyResolutionValue(candidateValue) !== "resolved" || currencyCode.test(candidateValue)) return [];
    const captureOffset = match[0].lastIndexOf(match[1]) + offset;
    const valueOffset = directNegation ? value.lastIndexOf(candidateValue) : 0;
    return [{ value: candidateValue, matchedText: match[0], index: (match.index ?? 0) + captureOffset + valueOffset, length: candidateValue.length }];
  }));
}

function providerCandidateMatches(text: string): CandidateMatch[] {
  const name = "([A-Z][A-Za-z0-9&.-]*(?:\\s+[A-Z][A-Za-z0-9&.-]*){0,4})";
  const relationships = [
    `\\b${name}\\s+payment\\s+(?:provider|integration)\\b`
  ];
  const discover = (pattern: RegExp, legacy: boolean): CandidateMatch[] => [...text.matchAll(pattern)].flatMap(match => {
    const value = providerName(match[1]);
    if (classifyResolutionValue(value) !== "resolved" || currencyCode.test(value) || (legacy && paymentDescriptor.test(value))) return [];
    const captureOffset = match[0].indexOf(match[1]) + match[1].lastIndexOf(value);
    const candidate = { value, matchedText: match[0], index: (match.index ?? 0) + captureOffset, length: value.length };
    if (legacy) {
      // The compatibility shorthand must be a declaration/command subject,
      // never an arbitrary capitalized phrase embedded in business prose.
      const span = candidateClauseSpan(text, candidate.index, candidate.length);
      const prefix = text.slice(span.start, candidate.index).trim();
      const tail = text.slice((match.index ?? 0) + match[0].length, span.end).trim();
      const declarationPrefix = /^(?:(?:use|using|support|supports|supported|recorded|approved|no)\s*)?$/i.test(prefix)
        || /(?:[:]|->)\s*$/.test(prefix);
      const declarationTail = !tail || /^(?:->|and\s+webhook|reconcile\b|retry\b)/i.test(tail)
        || /^(?:(?:is|are|has|was|were|now|since|still|remains?)\s+)*(?:been\s+)?(?:approved|selected|confirmed|accepted|supported|not\b|pending\b|awaiting\b|unapproved\b|unconfirmed\b|under\s+consideration)/i.test(tail);
      if (!declarationPrefix || !declarationTail) return [];
    }
    return [candidate];
  });
  const matches = explicitProviderCandidates(text);
  matches.push(...relationships.flatMap(pattern => discover(new RegExp(pattern, "g"), false)));
  matches.push(...discover(new RegExp(`\\b${name}\\s+(?:payments?|webhooks?)\\b`, "g"), true));
  return matches
    .filter(match => Boolean(match.value))
    .sort((left, right) => left.index - right.index)
    .filter((match, index, all) => !all.slice(0, index).some(previous => previous.index === match.index && previous.value === match.value));
}

/** Build verification only from universal commerce invariants and recorded intake evidence. */
export function ecommerceTestRequirements(project: ProjectRecord): EcommerceTestRequirement[] {
  const fragments = sourceFragments(project);
  const resolvedSelections = ecommerceResolvedSelections(project);
  const checkoutEvidence = resolvedSelections.checkoutMode ? undefined : firstPositiveMatch(fragments, /\b(guest checkout|authenticated customer checkout|authenticated checkout|account checkout|mixed checkout)\b/i);
  const currencyEvidence = resolvedSelections.currency ? undefined : firstPositiveMatch(fragments, new RegExp(`\\b(${CURRENCY_CODES})\\b`, "i"));
  const providerEvidence = resolvedSelections.paymentProvider ? undefined : firstPositiveMatch(fragments, providerCandidateMatches);
  const checkoutMode = resolvedSelections.checkoutMode?.value.toLocaleLowerCase() ?? checkoutEvidence?.value.toLocaleLowerCase() ?? "";
  const currency = resolvedSelections.currency?.value.toUpperCase() ?? currencyEvidence?.value.toUpperCase() ?? "";
  const paymentProvider = resolvedSelections.paymentProvider?.value ?? providerEvidence?.value ?? "";
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
