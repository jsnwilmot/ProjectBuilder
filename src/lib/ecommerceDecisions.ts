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
    const valid = /^[A-Z][A-Z0-9-]*$/.test(id) && !/^EC-(?:RECORD|LEGACY-OQ)-\d+$/.test(id) && ["architecture", "launch", "optional"].includes(gate) && ["Needs answer", "Deferred", "Answered", "Not applicable"].includes(status) && Boolean(question);
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
    const resolved = status === "Answered" ? hasMeaningfulResolvedValue(answer) : status === "Not applicable" ? hasMeaningfulResolvedValue(reason) : false;
    const previous = records.get(id);
    records.set(id, { id, field: "ecommerceDecisions", originField: previous?.originField ?? previous?.field ?? "ecommerceDecisions", gate: gate as EcommerceDecision["gate"], status: resolved ? status as EcommerceDecision["status"] : status === "Deferred" && reason ? "Deferred" : "Needs answer", question, reason, answer });
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
