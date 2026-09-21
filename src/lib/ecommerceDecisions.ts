import type { ProjectInputField, ProjectRecord, ReviewItem } from "../types/project";
import { ECOMMERCE_CART_SCOPES, ECOMMERCE_STOREFRONT_MODELS } from "../data/ecommerceOptions";
import { getProjectFieldValue } from "./projectFields";
import { requiredProjectFields, visibleIntakeFields } from "./projectCapabilities";

export interface EcommerceDecision {
  id: string;
  field: ProjectInputField;
  originField?: ProjectInputField;
  gate: "architecture" | "launch" | "optional";
  status: ReviewItem["status"];
  question: string;
  reason: string;
  answer: string;
}
export const isEcommerce = (p: ProjectRecord) => p.intake.appType === "ecommerceSite";
const open = (d: EcommerceDecision) => d.status === "Needs answer" || d.status === "Deferred";
const unresolvedValues = new Set([
  "deferred", "missing", "n a", "n a pending", "needs review", "no approved approach",
  "no confirmation", "no decision yet", "none", "none yet", "not applicable", "not decided",
  "pending", "t b d", "tbd", "to be determined", "unanswered", "unconfirmed", "unknown", "unresolved"
]);
export type ResolutionValueClassification = "resolved" | "unresolved" | "empty";
const unresolvedResolutionPatterns = [
  /^(?:still\s+)?not\s+(?:yet\s+)?(?:decided|confirmed|selected|approved)(?:\s+yet)?$/,
  /^decision\s+not\s+yet\s+made$/,
  /^t\s*b\s*[dc](?:\s+(?:after|until|pending|awaiting|by|during|following)\b.+)?$/,
  /^pending(?:\s+(?:client|stakeholder|architecture|architect|vendor|owner|business|security|technical))*\s+(?:approval|confirmation|decision|discovery|selection|review|response|testing)(?:\s+.*)?$/,
  /^unknown(?:\s+(?:after|until|pending|awaiting)\b.+)?$/,
  /^unconfirmed(?:\s+(?:after|until|pending|awaiting)\b.+)?$/,
  /^undecided(?:\s+(?:after|until|pending|awaiting)\b.+)?$/,
  /^awaiting\s+(?:approval|confirmation|decision|discovery|review|testing|(?:architecture|architect|client|stakeholder|vendor|owner)\s+(?:approval|confirmation|decision|response|review|selection))(?:\s+.*)?$/,
  /^needs?\s+(?:approval|confirmation|decision|discovery|review|testing|(?:client|stakeholder|vendor|owner)\s+(?:approval|confirmation|decision|response|review|selection))(?:\s+.*)?$/,
  /^not\s+decided(?:\s+(?:after|until|pending|awaiting)\b.+)?$/,
  /^(?:not\s+(?:sure|certain|known)|unsure|uncertain|don\s*t\s+know|do\s+not\s+know)(?:\s+yet)?(?:\s+(?:after|until|pending|awaiting)\b.+)?$/,
  /^to\s+be\s+determined(?:\s+(?:after|until|pending|awaiting|by|during|following)\b.+)?$/,
  /^deferred\s+(?:after|until|pending|awaiting)\b.+$/,
  /^no\s+(?:decision\s+yet|approved\s+approach)$/
];
function normalizedResolutionValue(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim()
    : "";
}
export function classifyResolutionValue(value: unknown): ResolutionValueClassification {
  const normalized = normalizedResolutionValue(value);
  if (!normalized) return "empty";
  if (unresolvedValues.has(normalized) || unresolvedResolutionPatterns.some(pattern => pattern.test(normalized))) return "unresolved";
  return "resolved";
}
export function hasMeaningfulResolvedValue(value: unknown): value is string {
  return typeof value === "string" && classifyResolutionValue(value) === "resolved";
}
export type EcommerceSelectionKind = "paymentProvider" | "currency" | "checkoutMode";
export interface EcommerceResolvedSelection {
  kind: EcommerceSelectionKind;
  value: string;
  decision: EcommerceDecision;
}
export type EcommerceRequirementDomain = "tax" | "shipping" | "pickup" | "inventory" | "digital" | "quotes" | "lookup" | "returns" | "roles" | "webhooks";
export interface EcommerceRequirementEvidence {
  field: ProjectInputField;
  label: string;
  text: string;
}
export interface EcommerceRequirementOutcome {
  domain: EcommerceRequirementDomain;
  notApplicableDecisions: EcommerceDecision[];
  positiveDecisions: EcommerceDecision[];
  positiveEvidence: EcommerceRequirementEvidence[];
  conflict: boolean;
  excluded: boolean;
}
export const ECOMMERCE_CURRENCY_CODES = ["CAD", "USD", "EUR", "GBP", "AUD", "NZD", "JPY", "CNY", "INR", "CHF", "SEK", "NOK", "DKK", "MXN", "BRL"] as const;
const currencySelection = new RegExp(`^(${ECOMMERCE_CURRENCY_CODES.join("|")})$`, "iu");
const checkoutSelection = /^(guest checkout|authenticated customer checkout|authenticated checkout|account checkout|mixed checkout)$/iu;
const negativeOnlySelection = /^(?:(?:not|no|without|excluded?)\b|do\s+not\s+(?:use|support|allow|accept|select|choose)\b)/iu;
const unsettledSelection = /^(?:maybe|probably|perhaps|possibly|likely)\b|\b(?:pending|awaiting)\s+(?:approval|confirmation|decision|selection)\b|\bsubject\s+to\s+(?:approval|confirmation|decision|selection)\b|\bif\s+(?:approved|confirmed|decided|selected)\b/iu;
const alternativeSelection = /\s+or\s+|\s*\/\s*/iu;
export function ecommerceSelectionKind(question: string): EcommerceSelectionKind | undefined {
  if (/\bpayment\s+provider\b/iu.test(question)) return "paymentProvider";
  if (/\b(?:checkout|payment)\s+currency\b|\bwhich\s+currency\b/iu.test(question)) return "currency";
  if (/\bcheckout\s+mode\b|\bwhich\s+(?:type\s+of\s+)?checkout\b/iu.test(question)) return "checkoutMode";
  return undefined;
}
export function normalizedEcommerceSelectionAnswer(kind: EcommerceSelectionKind, answer: unknown): string | undefined {
  if (!hasMeaningfulResolvedValue(answer)) return undefined;
  const value = String(answer).trim().replace(/[.;]+$/u, "").trim();
  if (!value || negativeOnlySelection.test(value) || unsettledSelection.test(value) || alternativeSelection.test(value)) return undefined;
  if (kind === "currency") return currencySelection.exec(value)?.[1].toUpperCase();
  if (kind === "checkoutMode") return checkoutSelection.exec(value)?.[1];
  return value;
}
const selectionConflictIds: Record<EcommerceSelectionKind, string> = {
  paymentProvider: "EC-SELECTION-CONFLICT-PAYMENT-PROVIDER",
  currency: "EC-SELECTION-CONFLICT-CURRENCY",
  checkoutMode: "EC-SELECTION-CONFLICT-CHECKOUT"
};
const selectionLabels: Record<EcommerceSelectionKind, string> = {
  paymentProvider: "payment provider",
  currency: "checkout currency",
  checkoutMode: "checkout mode"
};
function strongestGate(decisions: EcommerceDecision[]): EcommerceDecision["gate"] {
  if (decisions.some(decision => decision.gate === "architecture")) return "architecture";
  if (decisions.some(decision => decision.gate === "launch")) return "launch";
  return "optional";
}
function selectionComparisonValue(kind: EcommerceSelectionKind, value: string): string {
  return kind === "currency" ? value.toUpperCase() : value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}
function resolvedSelectionGroups(decisions: EcommerceDecision[]): Map<EcommerceSelectionKind, Map<string, EcommerceResolvedSelection[]>> {
  const groups = new Map<EcommerceSelectionKind, Map<string, EcommerceResolvedSelection[]>>();
  for (const decision of decisions) {
    if (decision.status !== "Answered") continue;
    const kind = ecommerceSelectionKind(decision.question);
    if (!kind) continue;
    const value = normalizedEcommerceSelectionAnswer(kind, decision.answer);
    if (!value) continue;
    const byValue = groups.get(kind) ?? new Map<string, EcommerceResolvedSelection[]>();
    const comparisonValue = selectionComparisonValue(kind, value);
    byValue.set(comparisonValue, [...(byValue.get(comparisonValue) ?? []), { kind, value, decision }]);
    groups.set(kind, byValue);
  }
  return groups;
}

const requirementDomainDefinitions: Record<EcommerceRequirementDomain, { label: string; question: RegExp; evidence: RegExp; conflictId: string }> = {
  tax: { label: "tax", question: /\b(?:tax|taxes|taxation|GST|HST|VAT)\b/iu, evidence: /\b(?:tax|taxes|taxation|GST|HST|VAT)\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-TAX" },
  shipping: { label: "shipping", question: /\b(?:shipping|carrier)\b/iu, evidence: /\b(?:shipping|carrier)\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-SHIPPING" },
  pickup: { label: "pickup", question: /\bpick-?up\b/iu, evidence: /\bpick-?up\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-PICKUP" },
  inventory: { label: "inventory", question: /\b(?:inventory|stock)\b/iu, evidence: /\b(?:inventory|stock)\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-INVENTORY" },
  digital: { label: "digital or software delivery", question: /\b(?:digital (?:product|delivery)|software delivery|download|entitlement)\b/iu, evidence: /\b(?:digital|software|download|entitlement)\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-DIGITAL" },
  quotes: { label: "quotes or custom work", question: /\b(?:quotes?|custom work|uploads?)\b/iu, evidence: /\b(?:quotes?|custom work|uploads?)\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-QUOTES" },
  lookup: { label: "order lookup", question: /\b(?:order|guest) (?:lookup|status)\b/iu, evidence: /\b(?:order|guest) (?:lookup|status)\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-ORDER-LOOKUP" },
  returns: { label: "returns and refunds", question: /\b(?:returns?|refunds?|final[- ]sale)\b/iu, evidence: /\b(?:returns?|refunds?|final[- ]sale)\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-RETURNS" },
  roles: { label: "roles and permissions", question: /\b(?:roles?|permissions?|privileged access|administrators?)\b/iu, evidence: /\b(?:roles?|permissions?|privileged|administrators?)\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-ROLES" },
  webhooks: { label: "webhooks and integration behavior", question: /\b(?:webhooks?|idempoten(?:cy|t)|integration behavior)\b/iu, evidence: /\b(?:webhooks?|idempoten(?:cy|t))\b/iu, conflictId: "EC-EVIDENCE-CONFLICT-WEBHOOKS" }
};
const requirementEvidenceFields: Array<[ProjectInputField, string]> = [
  ["requiredFeatures", "required features"], ["featureDescription", "feature description"], ["workflows", "workflows"],
  ["workflowTrigger", "workflow trigger"], ["workflowSteps", "workflow steps"], ["screens", "screens"],
  ["websitePages", "pages"], ["dataEntities", "data entities"], ["dataCollections", "data collections"], ["fields", "fields"],
  ["integrations", "integrations"], ["rolePermissionsSummary", "role permissions"], ["authenticationExpectation", "authentication"],
  ["permissionRules", "permission rules"], ["constraints", "constraints"], ["acceptanceNotes", "acceptance notes"],
  ["successCriteria", "success criteria"], ["accessibilityNotes", "accessibility"]
];
const negativeRequirementAnswer = /^(?:no|not\s+(?:required|applicable|included|supported)|none|without|exclude(?:d)?)\b/iu;
function positiveRequirementMention(text: string, pattern: RegExp): boolean {
  const matcher = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const match of text.matchAll(matcher)) {
    const before = text.slice(0, match.index);
    const after = text.slice((match.index ?? 0) + match[0].length);
    if (/(?:^|\b)(?:no|without|exclude(?:d)?|do(?:es)?\s+not\s+(?:require|include|support)|not\s+(?:requiring|including|supporting))\s+(?:[\p{L}\p{N}-]+\s+){0,4}$/iu.test(before)) continue;
    if (/^(?:\s+[\p{L}\p{N}-]+){0,4}\s+(?:(?:is|are)\s+)?(?:not\s+(?:required|applicable|included|supported|offered|in scope)|excluded|disabled|out of scope)\b/iu.test(after)) continue;
    if (/\b(?:pending|awaiting|unknown|unconfirmed|undecided|TBD|not sure|to be determined)\b/iu.test(text)
      && /\b(?:decision|approval|confirmation|selection|model|scope|requirement)\b/iu.test(text)) continue;
    return true;
  }
  return false;
}
export function ecommerceRequirementDomain(question: string): EcommerceRequirementDomain | undefined {
  return (Object.entries(requirementDomainDefinitions) as Array<[EcommerceRequirementDomain, typeof requirementDomainDefinitions[EcommerceRequirementDomain]]>)
    .find(([, definition]) => definition.question.test(question))?.[0];
}
function requirementSourceEvidence(project: ProjectRecord, domain: EcommerceRequirementDomain): EcommerceRequirementEvidence[] {
  const pattern = requirementDomainDefinitions[domain].evidence;
  return requirementEvidenceFields.flatMap(([field, label]) => String(getProjectFieldValue(project, field) ?? "")
    .split(/\r?\n|;\s*/)
    .map(text => text.trim())
    .filter(text => Boolean(text) && positiveRequirementMention(text, pattern))
    .map(text => ({ field, label, text })));
}
function normalizedRequirementOutcomes(project: ProjectRecord, decisions: EcommerceDecision[]): EcommerceRequirementOutcome[] {
  return (Object.keys(requirementDomainDefinitions) as EcommerceRequirementDomain[]).map(domain => {
    const related = decisions.filter(decision => ecommerceRequirementDomain(decision.question) === domain);
    const notApplicableDecisions = related.filter(decision => decision.status === "Not applicable");
    const positiveDecisions = related.filter(decision => decision.status === "Answered"
      && hasMeaningfulResolvedValue(decision.answer) && !negativeRequirementAnswer.test(decision.answer.trim()));
    const positiveEvidence = requirementSourceEvidence(project, domain);
    const conflict = notApplicableDecisions.length > 0 && (positiveDecisions.length > 0 || positiveEvidence.length > 0);
    return { domain, notApplicableDecisions, positiveDecisions, positiveEvidence, conflict, excluded: notApplicableDecisions.length > 0 && !conflict };
  });
}
export function isEcommerceRequiredSourceFieldResolved(project: ProjectRecord, field: ProjectInputField): boolean {
  return hasMeaningfulResolvedValue(getProjectFieldValue(project, field));
}
const unresolvedConfigurationPattern = /(?:^|\s)(?:t\s*b\s*[dc]|unknown|unanswered|pending|deferred|undecided|unconfirmed|missing|none(?:\s+yet)?|n\s+a|not\s+(?:applicable|decided|confirmed|known)|to\s+be\s+(?:determined|confirmed)|awaiting\s+(?:decision|confirmation|approval)|needs?\s+(?:decision|confirmation|approval|review)|no\s+(?:decision|confirmation|approved\s+approach))(?:\s|$)/i;
function normalizedConfigurationValue(value: unknown): string {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim()
    : "";
}
export function hasMeaningfulConfigurationValue(value: unknown): value is string {
  const normalized = normalizedConfigurationValue(value);
  return Boolean(normalized) && hasMeaningfulResolvedValue(value) && !unresolvedConfigurationPattern.test(normalized);
}
export const ARCHITECTURE_KEYS = ["runtime", "backend", "database", "integrations", "repository"];
export const DEPLOYMENT_KEYS = ["environments", "source control", "CI", "build", "deployment", "DNS", "secrets", "migrations", "integrations", "observability", "backup", "restore", "rollback", "smoke", "responsibilities"];
function approvedContract(value: string, keys: string[]): boolean {
  if (!/^Approved\s*:/i.test(value.trim())) return false;
  const entries = new Map<string, string>();
  const rows = value.trim().replace(/^Approved\s*:/i, "").split(/[;\n]/).map(row => row.trim()).filter(Boolean);
  for (const row of rows) {
    const match = row.match(/^([^:=]+?)\s*[:=]\s*(.*)$/);
    if (!match) return false;
    const key = match[1].trim().toLocaleLowerCase().replace(/\s+/g, " ");
    if (!key || entries.has(key)) return false;
    entries.set(key, match[2].trim());
  }
  return keys.every(key => hasMeaningfulConfigurationValue(entries.get(key.toLocaleLowerCase())));
}
function validRoutes(value: string): boolean {
  const rows = value.split(/\r?\n/).filter(line => line.trim()).map(line => line.split("|").map(part => part.trim()));
  return rows.length > 0 && rows.every(([route, brand, catalog, ...extra]) =>
    (route === "/" || /^\/[a-zA-Z0-9][a-zA-Z0-9/-]*$/.test(route))
    && !route.includes("//")
    && (route === "/" || hasMeaningfulConfigurationValue(route.slice(1)))
    && hasMeaningfulConfigurationValue(brand)
    && hasMeaningfulConfigurationValue(catalog)
    && !extra.length)
    && new Set(rows.map(row => row[0].toLocaleLowerCase())).size === rows.length;
}

export const PHASE_KEYS = ["objective", "prerequisites", "files", "contracts", "security", "accessibility", "testCommands", "acceptanceCriteria", "evidence", "stopConditions"] as const;
export type EcommercePhase = Record<typeof PHASE_KEYS[number], string>;
export function ecommercePhases(p: ProjectRecord): EcommercePhase[] {
  try {
    const values: unknown = JSON.parse(p.intake.ecommercePhases || "[]");
    if (!Array.isArray(values) || !values.length) return [];
    return values.every(v => v && PHASE_KEYS.every(key => hasMeaningfulConfigurationValue(v[key]))) ? values : [];
  } catch { return []; }
}

type DecisionRegisterParseResult = { fields: [string, string, string, string, string, string] } | { error: string };
function parseDecisionRegisterLine(line: string): DecisionRegisterParseResult {
  const fields: string[] = [];
  let field = "";
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\\") {
      const escaped = line[index + 1];
      if (escaped !== "\\" && escaped !== "|") {
        return { error: "Decision register contains a malformed escape sequence. Only \\| and \\\\ are valid escapes." };
      }
      field += escaped;
      index += 1;
      continue;
    }
    if (character === "|") {
      fields.push(field.trim());
      field = "";
      continue;
    }
    field += character;
  }
  fields.push(field.trim());
  if (fields.length < 6) return { error: "Decision register contains fewer than six unescaped fields." };
  if (fields.length > 6) return { error: "Decision register contains more than six unescaped fields. Escape literal pipe characters as \\|." };
  return { fields: fields as [string, string, string, string, string, string] };
}

/** Compatibility adapter plus explicit records. No keyword occurrence becomes an answer. */
export function ecommerceDecisions(p: ProjectRecord): EcommerceDecision[] {
  if (!isEcommerce(p)) return [];
  const records = new Map<string, EcommerceDecision>();
  const explicitIds = new Set<string>();
  const legacyIds = new Set<string>();
  for (const [index, line] of p.intake.assumptions.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*(OQ-\d+)\s*:\s*([^\n]+)/);
    if (!match) continue;
    if (legacyIds.has(match[1])) {
      const errorId = `EC-LEGACY-OQ-${index + 1}`;
      records.set(errorId, {
        id: errorId, field: "assumptions", gate: "architecture", status: "Needs answer",
        question: `Remove duplicate legacy decision ID ${match[1]}`,
        reason: `Duplicate ${match[1]} found in Assumptions on source line ${index + 1}; the first occurrence remains effective.`,
        answer: ""
      });
      continue;
    }
    legacyIds.add(match[1]);
    const question = match[2].split("?")[0] + "?";
    records.set(match[1], { id: match[1], field: "assumptions", gate: /architecture|before implementation/i.test(match[2]) ? "architecture" : "launch", status: "Deferred", question, reason: match[2], answer: "" });
  }
  for (const [index, line] of (p.intake.ecommerceDecisions || "").split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const parsed = parseDecisionRegisterLine(line);
    if ("error" in parsed) {
      const errorId = `EC-RECORD-${index + 1}`;
      records.set(errorId, { id: errorId, field: "ecommerceDecisions", gate: "architecture", status: "Needs answer", question: `Correct decision register line ${index + 1}`, reason: `Decision register line ${index + 1} ${parsed.error.slice("Decision register ".length)}`, answer: "" });
      continue;
    }
    const [id, gate, status, question, reason, answer] = parsed.fields;
    const valid = /^[A-Z][A-Z0-9-]*$/.test(id)
      && !/^EC-(?:RECORD|LEGACY-OQ)-\d+$/.test(id)
      && !/^EC-(?:SELECTION-CONFLICT|EVIDENCE-CONFLICT)-/.test(id)
      && ["architecture", "launch", "optional"].includes(gate)
      && ["Needs answer", "Deferred", "Answered", "Not applicable"].includes(status)
      && Boolean(question);
    if (!valid) {
      const errorId = `EC-RECORD-${index + 1}`;
      records.set(errorId, { id: errorId, field: "ecommerceDecisions", gate: "architecture", status: "Needs answer", question: `Correct decision register line ${index + 1}`, reason: "Use the documented six-column format.", answer: "" });
      continue;
    }
    if (explicitIds.has(id)) {
      const errorId = `EC-RECORD-${index + 1}`;
      const firstGate = records.get(id)?.gate;
      const duplicateGate: EcommerceDecision["gate"] = firstGate === "architecture" || gate === "architecture"
        ? "architecture" : firstGate === "launch" || gate === "launch" ? "launch" : "optional";
      records.set(errorId, {
        id: errorId,
        field: "ecommerceDecisions",
        gate: duplicateGate,
        status: "Needs answer",
        question: `Remove duplicate decision ID ${id}`,
        reason: `Duplicate explicit decision ID ${id} on source line ${index + 1}; the first explicit record remains effective.`,
        answer: ""
      });
      continue;
    }
    explicitIds.add(id);
    const selectionKind = ecommerceSelectionKind(question);
    const resolved = status === "Answered"
      ? selectionKind ? Boolean(normalizedEcommerceSelectionAnswer(selectionKind, answer)) : hasMeaningfulResolvedValue(answer)
      : status === "Not applicable" ? !selectionKind && hasMeaningfulResolvedValue(reason) : false;
    const previous = records.get(id);
    records.set(id, { id, field: "ecommerceDecisions", originField: previous?.originField ?? previous?.field ?? "ecommerceDecisions", gate: gate as EcommerceDecision["gate"], status: resolved ? status as EcommerceDecision["status"] : status === "Deferred" && reason ? "Deferred" : "Needs answer", question, reason, answer });
  }
  const sourceDecisions = [...records.values()];
  for (const [kind, byValue] of resolvedSelectionGroups(sourceDecisions)) {
    if (byValue.size < 2) continue;
    const selections = [...byValue.values()].flat();
    const id = selectionConflictIds[kind];
    const details = selections.map(selection => `${selection.decision.id}=${selection.value}`).join(", ");
    records.set(id, {
      id,
      field: "ecommerceDecisions",
      gate: strongestGate(selections.map(selection => selection.decision)),
      status: "Needs answer",
      question: `Resolve conflicting ${selectionLabels[kind]} Decision Register answers`,
      reason: `Conflicting ${selectionLabels[kind]} answers (${details}) are all currently effective. Reconcile the identified source records; register order cannot select a winner.`,
      answer: ""
    });
  }
  for (const outcome of normalizedRequirementOutcomes(p, sourceDecisions)) {
    if (!outcome.conflict) continue;
    const definition = requirementDomainDefinitions[outcome.domain];
    const excludedBy = outcome.notApplicableDecisions.map(decision => decision.id).join(", ");
    const structured = outcome.positiveDecisions.map(decision => `${decision.id}: ${decision.answer}`);
    const source = outcome.positiveEvidence.map(item => `${item.label}: ${item.text}`);
    records.set(definition.conflictId, {
      id: definition.conflictId,
      field: "ecommerceDecisions",
      gate: strongestGate([...outcome.notApplicableDecisions, ...outcome.positiveDecisions]),
      status: "Needs answer",
      question: `Reconcile conflicting ${definition.label} requirements`,
      reason: `${definition.label} is marked Not applicable by ${excludedBy}, but positive evidence remains (${[...structured, ...source].join("; ")}). Reconcile the Decision Register and source intake before generating verification.`,
      answer: ""
    });
  }
  const require = (id: string, field: ProjectInputField, question: string, satisfied: boolean) => {
    if (!satisfied) records.set(id, { id, field, gate: "architecture", status: "Needs answer", question, reason: "Required before implementation; planning may resolve this decision.", answer: "" });
  };
  for (const [field, configuration] of Object.entries(validatedEcommerceConfiguration(p))) {
    require(configuration.decisionId, field as ConfigurationField, configuration.question, !configuration.unresolved);
  }
  const fieldLabels = new Map(visibleIntakeFields(p).map(field => [field.name, field.label]));
  for (const field of requiredProjectFields(p)) {
    if (isEcommerceRequiredSourceFieldResolved(p, field)) continue;
    const id = `EC-FIELD-${field.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toUpperCase()}`;
    const label = fieldLabels.get(field) ?? field;
    records.set(id, {
      id,
      field,
      gate: "architecture",
      status: "Needs answer",
      question: `Provide required ecommerce intake field: ${label}`,
      reason: `${label} is required by the selected ecommerce project-type contract and must be completed in its source intake field.`,
      answer: ""
    });
  }
  return [...records.values()];
}

export function ecommerceResolvedSelections(p: ProjectRecord): Partial<Record<EcommerceSelectionKind, EcommerceResolvedSelection>> {
  const selections: Partial<Record<EcommerceSelectionKind, EcommerceResolvedSelection>> = {};
  for (const [kind, byValue] of resolvedSelectionGroups(ecommerceDecisions(p))) {
    if (byValue.size !== 1) continue;
    const selected = [...byValue.values()][0][0];
    selections[kind] = selected;
  }
  return selections;
}

export function ecommerceRequirementOutcomes(p: ProjectRecord): EcommerceRequirementOutcome[] {
  return normalizedRequirementOutcomes(p, ecommerceDecisions(p));
}

export function ecommerceDecisionState(p: ProjectRecord) {
  const decisions = ecommerceDecisions(p);
  const unresolved = decisions.filter(open);
  const blockingUnresolvedDecisions = unresolved.filter(d => d.gate !== "optional");
  const optionalUnresolvedDecisions = unresolved.filter(d => d.gate === "optional");
  const implementationBlockers = unresolved.filter(d => d.gate === "architecture");
  const launchBlockers = unresolved.filter(d => d.gate === "launch");
  return { decisions, unresolved, blockingUnresolvedDecisions, optionalUnresolvedDecisions, implementationBlockers, launchBlockers, planningReady: true, implementationReady: implementationBlockers.length === 0, launchReady: blockingUnresolvedDecisions.length === 0 };
}

export function ecommerceReviewItems(p: ProjectRecord, now: string): ReviewItem[] {
  const fieldLabels = new Map(visibleIntakeFields(p).map(field => [field.name, field.label]));
  return ecommerceDecisions(p).map(d => {
    const origin = d.originField ?? d.field;
    const resolutionFieldKey = /^OQ-/.test(d.id) || d.field === "ecommerceDecisions" ? "ecommerceDecisions" : d.field;
    const resolutionFieldLabel = resolutionFieldKey === "ecommerceDecisions" ? "Ecommerce Decision Register"
      : resolutionFieldKey === "workflowSteps" ? "Workflow Steps" : fieldLabels.get(resolutionFieldKey) ?? resolutionFieldKey;
    const resolutionInstruction = /^EC-RECORD-/.test(d.id)
      ? `Correct the indicated register line in ${resolutionFieldLabel}. ${d.question}.`
      : resolutionFieldKey === "ecommerceDecisions"
        ? `Add or update ${d.id} in ${resolutionFieldLabel} with its approved status, reason, and answer.`
        : `Update ${resolutionFieldLabel} to resolve this item.`;
    return { id: `ecommerce-${d.id}`, fieldKey: origin, gateId: d.id, section: d.gate === "architecture" ? "Deployment" : "Foundation", label: `${d.id}: ${d.question}`, recommendedQuestion: `${d.id}: ${d.question}`, reason: d.reason, status: d.status, notApplicableReason: d.status === "Not applicable" ? d.reason : "", deferredReason: d.status === "Deferred" ? d.reason : "", blocking: d.gate !== "optional", allowDeferred: d.gate === "optional", source: "gate", resolutionMode: "source", sourceFieldLabel: fieldLabels.get(origin) ?? origin, resolutionFieldKey, resolutionFieldLabel, resolutionInstruction, updatedAt: now };
  });
}

const CONFIGURATION_DECISIONS = {
  ecommerceStorefrontModel: ["EC-STOREFRONTS", "Confirm storefront model"],
  ecommerceRoutes: ["EC-ROUTES", "Confirm unique route, brand/theme and catalog context mapping"],
  ecommerceCartScope: ["EC-CART", "Confirm shared or separate cart scope"],
  ecommerceArchitecture: ["EC-ARCHITECTURE", "Approve runtime, backend, database, integrations and repository architecture"],
  ecommerceDeployment: ["EC-DEPLOYMENT", "Approve complete web deployment contract"],
  ecommercePhases: ["EC-PHASES", "Approve executable implementation phase contracts"]
} as const;
type ConfigurationField = keyof typeof CONFIGURATION_DECISIONS;
interface ValidatedConfigurationValue { value: string; decisionId: string; unresolved: boolean; question: string }
const normalizedStorefrontModels = new Set(ECOMMERCE_STOREFRONT_MODELS.map(value => normalizedConfigurationValue(value).toLocaleLowerCase()));
const normalizedCartScopes = new Set(ECOMMERCE_CART_SCOPES.map(value => normalizedConfigurationValue(value).toLocaleLowerCase()));
/** Shared validation authority for decision records, rendering and evidence. */
export function validatedEcommerceConfiguration(p: ProjectRecord): Record<ConfigurationField, ValidatedConfigurationValue> {
  const approved: Record<ConfigurationField, boolean> = {
    ecommerceStorefrontModel: hasMeaningfulConfigurationValue(p.intake.ecommerceStorefrontModel)
      && normalizedStorefrontModels.has(normalizedConfigurationValue(p.intake.ecommerceStorefrontModel).toLocaleLowerCase()),
    ecommerceRoutes: validRoutes(p.intake.ecommerceRoutes || ""),
    ecommerceCartScope: hasMeaningfulConfigurationValue(p.intake.ecommerceCartScope)
      && normalizedCartScopes.has(normalizedConfigurationValue(p.intake.ecommerceCartScope).toLocaleLowerCase()),
    ecommerceArchitecture: approvedContract(p.intake.ecommerceArchitecture || "", ARCHITECTURE_KEYS),
    ecommerceDeployment: approvedContract(p.intake.ecommerceDeployment || "", DEPLOYMENT_KEYS),
    ecommercePhases: ecommercePhases(p).length > 0
  };
  return Object.fromEntries(Object.entries(CONFIGURATION_DECISIONS).map(([field, [decisionId, question]]) => {
    const unresolved = !approved[field as ConfigurationField];
    return [field, { value: unresolved ? "" : p.intake[field as ConfigurationField], decisionId, unresolved, question }];
  })) as Record<ConfigurationField, ValidatedConfigurationValue>;
}
