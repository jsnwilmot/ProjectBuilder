import type { ProjectInputField, ProjectRecord, ReviewItem } from "../types/project";

export interface EcommerceDecision {
  id: string;
  field: ProjectInputField;
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
  "pending", "t b d", "tbd", "to be determined", "unanswered", "unconfirmed", "unknown"
]);
export function hasMeaningfulResolvedValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
  return Boolean(normalized) && !unresolvedValues.has(normalized);
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
  return keys.every(key => hasMeaningfulResolvedValue(entries.get(key.toLocaleLowerCase())));
}
function validRoutes(value: string): boolean {
  const rows = value.split(/\r?\n/).filter(line => line.trim()).map(line => line.split("|").map(part => part.trim()));
  return rows.length > 0 && rows.every(([route,brand,catalog,...extra]) => /^\/[a-zA-Z0-9/-]*$/.test(route) && !route.includes("//") && brand && catalog && !extra.length)
    && new Set(rows.map(row => row[0])).size === rows.length;
}

export const PHASE_KEYS = ["objective", "prerequisites", "files", "contracts", "security", "accessibility", "testCommands", "acceptanceCriteria", "evidence", "stopConditions"] as const;
export type EcommercePhase = Record<typeof PHASE_KEYS[number], string>;
export function ecommercePhases(p: ProjectRecord): EcommercePhase[] {
  try {
    const values: unknown = JSON.parse(p.intake.ecommercePhases || "[]");
    if (!Array.isArray(values) || !values.length) return [];
    return values.every(v => v && PHASE_KEYS.every(key => hasMeaningfulResolvedValue(v[key]))) ? values : [];
  } catch { return []; }
}

/** Compatibility adapter plus explicit records. No keyword occurrence becomes an answer. */
export function ecommerceDecisions(p: ProjectRecord): EcommerceDecision[] {
  if (!isEcommerce(p)) return [];
  const records = new Map<string, EcommerceDecision>();
  const matches = [...p.intake.assumptions.matchAll(/(?:^|\n)\s*(OQ-\d+)\s*:\s*([^\n]+)/g)];
  for (const match of matches) {
    const question = match[2].split("?")[0] + "?";
    records.set(match[1], { id: match[1], field: "assumptions", gate: /architecture|before implementation/i.test(match[2]) ? "architecture" : "launch", status: "Deferred", question, reason: match[2], answer: "" });
  }
  for (const [index, line] of (p.intake.ecommerceDecisions || "").split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const [id, gate, status, question, reason = "", answer = ""] = line.split("|").map(v => v.trim());
    const valid = /^[A-Z][A-Z0-9-]*$/.test(id) && ["architecture", "launch", "optional"].includes(gate) && ["Needs answer", "Deferred", "Answered", "Not applicable"].includes(status) && Boolean(question);
    if (!valid) {
      const errorId = `EC-RECORD-${index + 1}`;
      records.set(errorId, { id: errorId, field: "ecommerceDecisions", gate: "architecture", status: "Needs answer", question: `Correct decision register line ${index + 1}`, reason: "Use the documented six-column format.", answer: "" });
      continue;
    }
    const resolved = status === "Answered" ? hasMeaningfulResolvedValue(answer) : status === "Not applicable" ? hasMeaningfulResolvedValue(reason) : false;
    records.set(id, { id, field: "ecommerceDecisions", gate: gate as EcommerceDecision["gate"], status: resolved ? status as EcommerceDecision["status"] : status === "Deferred" && reason ? "Deferred" : "Needs answer", question, reason, answer });
  }
  const require = (id: string, field: ProjectInputField, question: string, satisfied: boolean) => {
    if (!satisfied) records.set(id, { id, field, gate: "architecture", status: "Needs answer", question, reason: "Required before implementation; planning may resolve this decision.", answer: "" });
  };
  require("EC-STOREFRONTS", "ecommerceStorefrontModel", "Confirm storefront model", /unified|single merchant|marketplace/i.test(p.intake.ecommerceStorefrontModel || "") && !/unknown|undecided|deferred/i.test(p.intake.ecommerceStorefrontModel));
  require("EC-ROUTES", "ecommerceRoutes", "Confirm unique route, brand/theme and catalog context mapping", validRoutes(p.intake.ecommerceRoutes || ""));
  require("EC-CART", "ecommerceCartScope", "Confirm shared or separate cart scope", /shared|separate/i.test(p.intake.ecommerceCartScope || "") && !/unknown|undecided|deferred/i.test(p.intake.ecommerceCartScope));
  require("EC-ARCHITECTURE", "ecommerceArchitecture", "Approve runtime, backend, database, integrations and repository architecture", approvedContract(p.intake.ecommerceArchitecture || "", ARCHITECTURE_KEYS));
  require("EC-DEPLOYMENT", "ecommerceDeployment", "Approve complete web deployment contract", approvedContract(p.intake.ecommerceDeployment || "", DEPLOYMENT_KEYS));
  require("EC-PHASES", "ecommercePhases", "Approve executable implementation phase contracts", ecommercePhases(p).length > 0);
  return [...records.values()];
}

export function ecommerceDecisionState(p: ProjectRecord) {
  const decisions = ecommerceDecisions(p);
  const unresolved = decisions.filter(open);
  const implementationBlockers = unresolved.filter(d => d.gate === "architecture");
  const launchBlockers = unresolved.filter(d => d.gate === "launch");
  return { decisions, unresolved, implementationBlockers, launchBlockers, planningReady: true, implementationReady: implementationBlockers.length === 0, launchReady: implementationBlockers.length + launchBlockers.length === 0 };
}

export function ecommerceReviewItems(p: ProjectRecord, now: string): ReviewItem[] {
  return ecommerceDecisions(p).map(d => ({ id: `ecommerce-${d.id}`, fieldKey: d.field, gateId: d.id, section: d.gate === "architecture" ? "Deployment" : "Foundation", label: `${d.id}: ${d.question}`, recommendedQuestion: `${d.id}: ${d.question}`, reason: d.reason, status: d.status, notApplicableReason: d.status === "Not applicable" ? d.reason : "", deferredReason: d.status === "Deferred" ? d.reason : "", blocking: d.gate !== "optional", allowDeferred: d.gate === "optional", source: "gate", updatedAt: now }));
}
