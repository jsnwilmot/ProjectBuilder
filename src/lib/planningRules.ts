import type { PhaseGateId } from "./phaseGates";
import type {
  PlanningProposalCategory,
  PlanningRestriction,
  PlanningSourceAuthority,
  PlanningSourceAvailability,
  PlanningSourceType,
  PlanningTargetDomain,
  PlanningTargetReference,
  PlanningUncertainty
} from "./planningProposals";
import {
  PLANNING_CATEGORIES,
  PLANNING_RESTRICTIONS,
  PLANNING_SOURCE_AUTHORITIES,
  PLANNING_SOURCE_AVAILABILITY,
  PLANNING_SOURCE_TYPES,
  PLANNING_TARGET_DOMAINS,
  PLANNING_TARGET_KINDS,
  PLANNING_TARGET_OPERATIONS,
  PLANNING_UNCERTAINTY_STATES
} from "./planningProposals";
import type { ProjectType } from "../types/project";

export const PLANNING_RULE_REGISTRY_ID =
  "project-builder-clarification-rules";

export const PLANNING_RULE_REGISTRY_VERSION =
  "phase-5c.2.1a";

export const PLANNING_RULE_STATUSES = [
  "active",
  "deprecated"
] as const;
export type PlanningRuleStatus = (typeof PLANNING_RULE_STATUSES)[number];

export interface PlanningRuleSourceRequirement {
  sourceType: PlanningSourceType;
  authority: PlanningSourceAuthority;
  availability: PlanningSourceAvailability;
}

export interface PlanningClarificationRule {
  ruleId: string;
  ruleVersion: string;
  status: PlanningRuleStatus;
  applicableProjectTypes: readonly ProjectType[];
  target: PlanningTargetReference & {
    targetKey: PhaseGateId;
    kind: "readinessRequirement";
    operation: "clarificationOnly";
  };
  category: PlanningProposalCategory;
  restriction: PlanningRestriction;
  uncertainty: PlanningUncertainty;
  acceptableSources: readonly PlanningRuleSourceRequirement[];
  title: string;
  question: string;
  rationale: string;
  consequence: string;
  priority: number;
  notApplicableAllowed: boolean;
  deferralAllowed: boolean;
  architectApprovalRequired: boolean;
  deprecatedByRuleId?: string;
}

export interface PlanningRuleRegistryDefinition {
  registryId: typeof PLANNING_RULE_REGISTRY_ID;
  registryVersion: typeof PLANNING_RULE_REGISTRY_VERSION;
  rules: readonly PlanningClarificationRule[];
}

export type PlanningRuleValidationIssueCode =
  | "invalidRegistry"
  | "invalidRegistryIdentity"
  | "invalidRegistryVersion"
  | "invalidRule"
  | "invalidRuleId"
  | "duplicateRuleId"
  | "invalidRuleVersion"
  | "invalidRuleStatus"
  | "invalidPriority"
  | "duplicatePriority"
  | "invalidProjectType"
  | "invalidTarget"
  | "invalidCategory"
  | "invalidRestriction"
  | "invalidUncertainty"
  | "invalidSourceRequirement"
  | "invalidText"
  | "invalidDeprecation"
  | "deprecationCycle";

export interface PlanningRuleValidationIssue {
  code: PlanningRuleValidationIssueCode;
  message: string;
  ruleId?: string;
  field?: string;
}

export interface PlanningRuleRegistryValidationResult {
  valid: boolean;
  issues: PlanningRuleValidationIssue[];
}

const CANVAS_PROJECT_TYPE = "powerAppsCanvas" satisfies ProjectType;
const INITIAL_RULE_COUNT = 11;
const INITIAL_RULE_VERSION = "1.0.0";
const RULE_ID_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)*$/;
const RULE_VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;

const INITIAL_RULE_GATE_IDS = [
  "schema",
  "internalNames",
  "screenTargets",
  "controlTargets",
  "componentTargets",
  "yaml",
  "delegation",
  "security",
  "testing",
  "alm",
  "releaseApproval"
] as const satisfies readonly PhaseGateId[];

const INITIAL_RULE_RESTRICTIONS: Record<string, PlanningRestriction> = {
  "pp.canvas.schema.confirmation": "authoritativeSourceRequired",
  "pp.sharepoint.internalnames.confirmation": "authoritativeSourceRequired",
  "pp.canvas.screentargets.confirmation": "authoritativeSourceRequired",
  "pp.canvas.controltargets.confirmation": "authoritativeSourceRequired",
  "pp.canvas.components.confirmation": "clarificationOnly",
  "pp.canvas.yamlplanning.confirmation": "clarificationOnly",
  "pp.canvas.delegation.confirmation": "clarificationOnly",
  "pp.security.permissions.confirmation": "architectApprovalRequired",
  "pp.testing.outcomes.confirmation": "architectApprovalRequired",
  "pp.alm.rollback.confirmation": "architectApprovalRequired",
  "pp.release.approval.confirmation": "architectApprovalRequired"
};

const INITIAL_RULE_IDS = Object.keys(INITIAL_RULE_RESTRICTIONS);

const ACCEPTABLE_SOURCES = deepFreeze([
  {
    sourceType: "userAnswer",
    authority: "confirmed",
    availability: "current"
  },
  {
    sourceType: "confirmedIntake",
    authority: "confirmed",
    availability: "current"
  },
  {
    sourceType: "approvedDocument",
    authority: "approved",
    availability: "current"
  }
] as const satisfies readonly PlanningRuleSourceRequirement[]);

function target(targetKey: PhaseGateId, domain: PlanningTargetDomain): PlanningClarificationRule["target"] {
  return {
    kind: "readinessRequirement",
    domain,
    targetKey,
    operation: "clarificationOnly"
  };
}

function rule(input: {
  ruleId: string;
  priority: number;
  targetKey: PhaseGateId;
  domain: PlanningTargetDomain;
  restriction: PlanningRestriction;
  notApplicableAllowed: boolean;
  title: string;
  question: string;
  rationale: string;
  consequence: string;
}): PlanningClarificationRule {
  return {
    ruleId: input.ruleId,
    ruleVersion: INITIAL_RULE_VERSION,
    status: "active",
    applicableProjectTypes: [CANVAS_PROJECT_TYPE],
    target: target(input.targetKey, input.domain),
    category: "clarification",
    restriction: input.restriction,
    uncertainty: "Unknown",
    acceptableSources: ACCEPTABLE_SOURCES,
    title: input.title,
    question: input.question,
    rationale: input.rationale,
    consequence: input.consequence,
    priority: input.priority,
    notApplicableAllowed: input.notApplicableAllowed,
    deferralAllowed: true,
    architectApprovalRequired: true
  };
}

const RULES = deepFreeze([
  rule({
    ruleId: "pp.canvas.schema.confirmation",
    priority: 100,
    targetKey: "schema",
    domain: "data",
    restriction: "authoritativeSourceRequired",
    notApplicableAllowed: false,
    title: "Confirm the backend schema",
    question: "What approved backend schema should be used, including the data sources, relationships, expected record volumes, ownership, and confirmation source?",
    rationale: "Data-bound implementation cannot safely proceed until the backend structure and its authoritative confirmation source are documented.",
    consequence: "The schema gate remains unresolved and later data-bound implementation phases remain blocked."
  }),
  rule({
    ruleId: "pp.sharepoint.internalnames.confirmation",
    priority: 200,
    targetKey: "internalNames",
    domain: "data",
    restriction: "authoritativeSourceRequired",
    notApplicableAllowed: false,
    title: "Confirm SharePoint internal column names",
    question: "What are the authoritative SharePoint internal column names for every column used by the application?",
    rationale: "SharePoint internal names cannot be derived from display names and renamed columns retain their original internal names.",
    consequence: "SharePoint-bound formulas, mappings, and implementation targets remain blocked."
  }),
  rule({
    ruleId: "pp.canvas.screentargets.confirmation",
    priority: 300,
    targetKey: "screenTargets",
    domain: "powerPlatform",
    restriction: "authoritativeSourceRequired",
    notApplicableAllowed: false,
    title: "Confirm Canvas screen targets",
    question: "What are the approved stable screen targets, including their IDs, names, purposes, confirmation status, and confirmation source?",
    rationale: "Screen targets must be explicitly confirmed before implementation assets or formulas can reference them.",
    consequence: "Screen-bound implementation, formula planning, and YAML planning remain blocked."
  }),
  rule({
    ruleId: "pp.canvas.controltargets.confirmation",
    priority: 400,
    targetKey: "controlTargets",
    domain: "powerPlatform",
    restriction: "authoritativeSourceRequired",
    notApplicableAllowed: false,
    title: "Confirm Canvas control targets",
    question: "What are the approved stable control targets, including their IDs, names, control types, parent screens, purposes, formula properties, and confirmation sources?",
    rationale: "Control names, types, parent relationships, and formula properties cannot be invented or inferred.",
    consequence: "Control-bound implementation and Power Fx target planning remain blocked."
  }),
  rule({
    ruleId: "pp.canvas.components.confirmation",
    priority: 500,
    targetKey: "componentTargets",
    domain: "powerPlatform",
    restriction: "clarificationOnly",
    notApplicableAllowed: true,
    title: "Confirm Canvas component applicability",
    question: "Are reusable Canvas components required, and if so, what are their approved names, purposes, inputs, outputs, usage locations, and confirmation sources?",
    rationale: "Reusable components require structured targets, while a not-applicable decision requires a controlled confirmed reason.",
    consequence: "Component and related YAML planning remain unresolved until applicability is confirmed."
  }),
  rule({
    ruleId: "pp.canvas.yamlplanning.confirmation",
    priority: 600,
    targetKey: "yaml",
    domain: "powerPlatform",
    restriction: "clarificationOnly",
    notApplicableAllowed: true,
    title: "Confirm Canvas YAML planning",
    question: "Who is responsible for installing and validating any approved Canvas YAML, where would it be applied, and is YAML applicable to this project?",
    rationale: "YAML applicability, installation location, parent relationship, and validation responsibility must be confirmed without generating paste-ready YAML.",
    consequence: "YAML remains unavailable for implementation and no paste-ready YAML may be produced."
  }),
  rule({
    ruleId: "pp.canvas.delegation.confirmation",
    priority: 700,
    targetKey: "delegation",
    domain: "powerPlatform",
    restriction: "clarificationOnly",
    notApplicableAllowed: false,
    title: "Confirm delegation planning",
    question: "What record volumes, search patterns, filter operations, sort operations, connector limitations, and mitigation requirements must be considered for delegation?",
    rationale: "Delegation behaviour depends on the selected connector, data shape, expected volume, and planned query operations.",
    consequence: "Search, filtering, sorting, and large-data implementation remain blocked from final approval."
  }),
  rule({
    ruleId: "pp.security.permissions.confirmation",
    priority: 800,
    targetKey: "security",
    domain: "security",
    restriction: "architectApprovalRequired",
    notApplicableAllowed: false,
    title: "Confirm the permission matrix",
    question: "What can each approved user role view, create, edit, archive, restore, approve, or administer, and what authoritative permission source confirms those decisions?",
    rationale: "Role names alone do not define permissions, and least-privilege access must be explicitly documented.",
    consequence: "Security review remains unresolved and implementation cannot claim an approved access model."
  }),
  rule({
    ruleId: "pp.testing.outcomes.confirmation",
    priority: 900,
    targetKey: "testing",
    domain: "testing",
    restriction: "architectApprovalRequired",
    notApplicableAllowed: false,
    title: "Confirm observable testing outcomes",
    question: "What observable outcomes will prove the project is complete, who will perform each test, and in which approved environment will each test occur?",
    rationale: "Testing requirements must be measurable and must identify responsibility and environment without claiming that testing has already occurred.",
    consequence: "The testing gate remains unresolved and completion cannot be objectively demonstrated."
  }),
  rule({
    ruleId: "pp.alm.rollback.confirmation",
    priority: 1000,
    targetKey: "alm",
    domain: "deployment",
    restriction: "architectApprovalRequired",
    notApplicableAllowed: false,
    title: "Confirm ALM and rollback responsibilities",
    question: "Who owns source control, solution packaging, connection references, environment variables, deployment, rollback, and recovery responsibilities?",
    rationale: "ALM responsibilities must be explicitly assigned before publication or deployment can be approved.",
    consequence: "ALM readiness remains unresolved and deployment phases remain blocked."
  }),
  rule({
    ruleId: "pp.release.approval.confirmation",
    priority: 1100,
    targetKey: "releaseApproval",
    domain: "deployment",
    restriction: "architectApprovalRequired",
    notApplicableAllowed: false,
    title: "Confirm release approval responsibility",
    question: "Who is authorized to approve release, what evidence must be reviewed, and what controlled status records that approval?",
    rationale: "Release approval requires a named responsibility, evidence requirements, and controlled confirmation status.",
    consequence: "The project cannot be approved for release or deployment."
  })
] as const satisfies readonly PlanningClarificationRule[]);

const REGISTRY = deepFreeze({
  registryId: PLANNING_RULE_REGISTRY_ID,
  registryVersion: PLANNING_RULE_REGISTRY_VERSION,
  rules: RULES
} as const satisfies PlanningRuleRegistryDefinition);

export function getPlanningRuleRegistry(): PlanningClarificationRule[] {
  return sortRules(REGISTRY.rules).map(cloneRule);
}

export function getPlanningRuleById(ruleId: string): PlanningClarificationRule | undefined {
  const match = REGISTRY.rules.find((candidate) => candidate.ruleId === ruleId);
  return match ? cloneRule(match) : undefined;
}

export function getActivePlanningRulesForProjectType(projectType: ProjectType): PlanningClarificationRule[] {
  return sortRules(REGISTRY.rules)
    .filter((candidate) => candidate.status === "active" && candidate.applicableProjectTypes.includes(projectType))
    .map(cloneRule);
}

export function getActivePlanningRuleForReadinessGate(gateId: PhaseGateId): PlanningClarificationRule | undefined {
  const match = sortRules(REGISTRY.rules).find(
    (candidate) => candidate.status === "active" && candidate.target.targetKey === gateId
  );
  return match ? cloneRule(match) : undefined;
}

export function validatePlanningRuleRegistry(input: unknown = REGISTRY): PlanningRuleRegistryValidationResult {
  const issues: PlanningRuleValidationIssue[] = [];
  if (!isPlainObject(input)) {
    return {
      valid: false,
      issues: [issue("invalidRegistry", "Registry must be an object.")]
    };
  }

  if (input.registryId !== PLANNING_RULE_REGISTRY_ID) {
    issues.push(issue("invalidRegistryIdentity", "Registry ID is invalid.", undefined, "registryId"));
  }
  if (input.registryVersion !== PLANNING_RULE_REGISTRY_VERSION) {
    issues.push(issue("invalidRegistryVersion", "Registry version is invalid.", undefined, "registryVersion"));
  }
  if (!Array.isArray(input.rules)) {
    issues.push(issue("invalidRegistry", "Registry rules must be an array.", undefined, "rules"));
    return { valid: false, issues };
  }

  const rules = input.rules;
  const ruleIds = new Map<string, number>();
  const priorities = new Map<number, number>();
  const deprecatedEdges = new Map<string, string>();
  const presentRuleIds = new Set<string>();

  for (const rawRule of rules) {
    if (isPlainObject(rawRule) && typeof rawRule.ruleId === "string") {
      presentRuleIds.add(rawRule.ruleId);
    }
  }

  if (rules.length !== INITIAL_RULE_COUNT) {
    issues.push(issue("invalidRegistry", "Registry must contain exactly 11 initial rules.", undefined, "rules"));
  }

  for (const rawRule of rules) {
    validateRule(rawRule, issues, ruleIds, priorities, deprecatedEdges, presentRuleIds);
  }

  for (const [ruleId, count] of ruleIds) {
    if (count > 1) {
      issues.push(issue("duplicateRuleId", "Rule ID must be globally unique.", ruleId, "ruleId"));
    }
  }

  for (const [priority, count] of priorities) {
    if (count > 1) {
      issues.push(issue("duplicatePriority", "Rule priority must be unique.", undefined, `priority:${priority}`));
    }
  }

  for (const [ruleId, replacementId] of deprecatedEdges) {
    if (!presentRuleIds.has(replacementId)) {
      issues.push(issue("invalidDeprecation", "Deprecated rule must reference an existing replacement rule.", ruleId, "deprecatedByRuleId"));
    }
    if (ruleId === replacementId) {
      issues.push(issue("invalidDeprecation", "Deprecated rule cannot reference itself.", ruleId, "deprecatedByRuleId"));
    }
  }

  for (const ruleId of findDeprecationCycles(deprecatedEdges)) {
    issues.push(issue("deprecationCycle", "Deprecated rule replacement chain cannot contain a cycle.", ruleId, "deprecatedByRuleId"));
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

function validateRule(
  rawRule: unknown,
  issues: PlanningRuleValidationIssue[],
  ruleIds: Map<string, number>,
  priorities: Map<number, number>,
  deprecatedEdges: Map<string, string>,
  presentRuleIds: Set<string>
): void {
  if (!isPlainObject(rawRule)) {
    issues.push(issue("invalidRule", "Rule must be an object."));
    return;
  }

  const ruleId = typeof rawRule.ruleId === "string" ? rawRule.ruleId : undefined;
  if (!ruleId || ruleId.length > 128 || !RULE_ID_PATTERN.test(ruleId) || containsArrayPosition(ruleId)) {
    issues.push(issue("invalidRuleId", "Rule ID is invalid.", ruleId, "ruleId"));
  } else {
    ruleIds.set(ruleId, (ruleIds.get(ruleId) ?? 0) + 1);
  }

  if (typeof rawRule.ruleVersion !== "string" || !RULE_VERSION_PATTERN.test(rawRule.ruleVersion)) {
    issues.push(issue("invalidRuleVersion", "Rule version must be semantic.", ruleId, "ruleVersion"));
  }
  if (ruleId && INITIAL_RULE_IDS.includes(ruleId) && rawRule.ruleVersion !== INITIAL_RULE_VERSION) {
    issues.push(issue("invalidRuleVersion", "Initial rules must use version 1.0.0.", ruleId, "ruleVersion"));
  }

  const status = enumValue(rawRule.status, PLANNING_RULE_STATUSES);
  if (!status) {
    issues.push(issue("invalidRuleStatus", "Rule status is invalid.", ruleId, "status"));
  }
  if (ruleId && INITIAL_RULE_IDS.includes(ruleId) && rawRule.status !== "active") {
    issues.push(issue("invalidRuleStatus", "Initial rules must be active.", ruleId, "status"));
  }

  const priority = rawRule.priority;
  if (typeof priority !== "number" || !Number.isInteger(priority) || priority <= 0) {
    issues.push(issue("invalidPriority", "Rule priority must be a positive integer.", ruleId, "priority"));
  } else {
    priorities.set(priority, (priorities.get(priority) ?? 0) + 1);
  }

  validateProjectTypes(rawRule.applicableProjectTypes, issues, ruleId);
  validateTarget(rawRule.target, issues, ruleId);

  if (rawRule.category !== "clarification" || !enumValue(rawRule.category, PLANNING_CATEGORIES)) {
    issues.push(issue("invalidCategory", "Rule category must be clarification.", ruleId, "category"));
  }

  const restriction = enumValue(rawRule.restriction, PLANNING_RESTRICTIONS);
  if (!restriction || (ruleId && INITIAL_RULE_RESTRICTIONS[ruleId] && restriction !== INITIAL_RULE_RESTRICTIONS[ruleId])) {
    issues.push(issue("invalidRestriction", "Rule restriction is invalid.", ruleId, "restriction"));
  }

  if (rawRule.uncertainty !== "Unknown" || !enumValue(rawRule.uncertainty, PLANNING_UNCERTAINTY_STATES)) {
    issues.push(issue("invalidUncertainty", "Rule uncertainty must be Unknown.", ruleId, "uncertainty"));
  }

  validateAcceptableSources(rawRule.acceptableSources, issues, ruleId);
  validateText(rawRule.title, 240, "title", issues, ruleId);
  validateText(rawRule.question, 500, "question", issues, ruleId);
  validateText(rawRule.rationale, 2000, "rationale", issues, ruleId);
  validateText(rawRule.consequence, 2000, "consequence", issues, ruleId);

  if (typeof rawRule.notApplicableAllowed !== "boolean") {
    issues.push(issue("invalidRule", "Rule notApplicableAllowed must be boolean.", ruleId, "notApplicableAllowed"));
  }
  if (rawRule.deferralAllowed !== true) {
    issues.push(issue("invalidRule", "Initial rules must allow deferral without resolving gates.", ruleId, "deferralAllowed"));
  }
  if (rawRule.architectApprovalRequired !== true) {
    issues.push(issue("invalidRule", "Initial rules must require Architect approval.", ruleId, "architectApprovalRequired"));
  }

  if (rawRule.deprecatedByRuleId !== undefined) {
    if (status === "active") {
      issues.push(issue("invalidDeprecation", "Active rules cannot contain deprecatedByRuleId.", ruleId, "deprecatedByRuleId"));
    }
    if (typeof rawRule.deprecatedByRuleId !== "string" || !RULE_ID_PATTERN.test(rawRule.deprecatedByRuleId)) {
      issues.push(issue("invalidDeprecation", "Deprecated replacement rule ID is invalid.", ruleId, "deprecatedByRuleId"));
    } else if (ruleId) {
      deprecatedEdges.set(ruleId, rawRule.deprecatedByRuleId);
      if (!presentRuleIds.has(rawRule.deprecatedByRuleId)) {
        issues.push(issue("invalidDeprecation", "Deprecated replacement rule is missing.", ruleId, "deprecatedByRuleId"));
      }
    }
  }
}

function validateProjectTypes(
  input: unknown,
  issues: PlanningRuleValidationIssue[],
  ruleId: string | undefined
): void {
  if (!Array.isArray(input) || input.length === 0) {
    issues.push(issue("invalidProjectType", "Applicable project types must be a non-empty array.", ruleId, "applicableProjectTypes"));
    return;
  }
  if (hasSparseArrayEntry(input) || input.some((projectType) => projectType !== CANVAS_PROJECT_TYPE)) {
    issues.push(issue("invalidProjectType", "Only the canonical Power Apps Canvas project type is valid.", ruleId, "applicableProjectTypes"));
  }
}

function validateTarget(
  input: unknown,
  issues: PlanningRuleValidationIssue[],
  ruleId: string | undefined
): void {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidTarget", "Rule target must be an object.", ruleId, "target"));
    return;
  }
  if (
    input.kind !== "readinessRequirement" ||
    input.operation !== "clarificationOnly" ||
    !(INITIAL_RULE_GATE_IDS as readonly string[]).includes(String(input.targetKey)) ||
    !enumValue(input.domain, PLANNING_TARGET_DOMAINS) ||
    containsArrayPosition(input.targetKey) ||
    !enumValue(input.kind, PLANNING_TARGET_KINDS) ||
    !enumValue(input.operation, PLANNING_TARGET_OPERATIONS)
  ) {
    issues.push(issue("invalidTarget", "Rule target must reference an approved readiness gate for clarification only.", ruleId, "target"));
  }
}

function validateAcceptableSources(
  input: unknown,
  issues: PlanningRuleValidationIssue[],
  ruleId: string | undefined
): void {
  if (!Array.isArray(input) || input.length === 0 || hasSparseArrayEntry(input)) {
    issues.push(issue("invalidSourceRequirement", "Acceptable sources must be a non-empty array.", ruleId, "acceptableSources"));
    return;
  }
  if (input.length !== ACCEPTABLE_SOURCES.length) {
    issues.push(issue("invalidSourceRequirement", "Initial rules must use exactly the approved source-authority pairs.", ruleId, "acceptableSources"));
  }

  for (const source of input) {
    if (!isPlainObject(source)) {
      issues.push(issue("invalidSourceRequirement", "Source requirement must be an object.", ruleId, "acceptableSources"));
      continue;
    }
    if (
      !enumValue(source.sourceType, PLANNING_SOURCE_TYPES) ||
      !enumValue(source.authority, PLANNING_SOURCE_AUTHORITIES) ||
      !enumValue(source.availability, PLANNING_SOURCE_AVAILABILITY) ||
      source.availability !== "current" ||
      source.authority === "informational" ||
      !isApprovedSourceRequirement(source)
    ) {
      issues.push(issue("invalidSourceRequirement", "Source requirement is not one of the approved current authority pairs.", ruleId, "acceptableSources"));
    }
  }
}

function validateText(
  input: unknown,
  limit: number,
  field: string,
  issues: PlanningRuleValidationIssue[],
  ruleId: string | undefined
): void {
  if (typeof input !== "string") {
    issues.push(issue("invalidText", "Rule text must be a string.", ruleId, field));
    return;
  }
  const normalized = input.trim();
  if (!normalized || normalized.length > limit || /[\r\n]/.test(normalized) || hasDisallowedControls(normalized) || !isSafeText(normalized)) {
    issues.push(issue("invalidText", "Rule text must be bounded, plain language, and non-executable.", ruleId, field));
  }
}

function isApprovedSourceRequirement(input: Record<string, unknown>): boolean {
  return ACCEPTABLE_SOURCES.some(
    (source) =>
      source.sourceType === input.sourceType &&
      source.authority === input.authority &&
      source.availability === input.availability
  );
}

function findDeprecationCycles(edges: Map<string, string>): Set<string> {
  const cyclic = new Set<string>();
  for (const start of edges.keys()) {
    const seen = new Set<string>();
    let current: string | undefined = start;
    while (current && edges.has(current)) {
      if (seen.has(current)) {
        for (const id of seen) cyclic.add(id);
        break;
      }
      seen.add(current);
      current = edges.get(current);
    }
  }
  return cyclic;
}

function sortRules(rules: readonly PlanningClarificationRule[]): PlanningClarificationRule[] {
  return [...rules].sort((first, second) => first.priority - second.priority || first.ruleId.localeCompare(second.ruleId));
}

function cloneRule(ruleToClone: PlanningClarificationRule): PlanningClarificationRule {
  return {
    ...ruleToClone,
    applicableProjectTypes: [...ruleToClone.applicableProjectTypes],
    target: { ...ruleToClone.target },
    acceptableSources: ruleToClone.acceptableSources.map((source) => ({ ...source }))
  };
}

function issue(
  code: PlanningRuleValidationIssueCode,
  message: string,
  ruleId?: string,
  field?: string
): PlanningRuleValidationIssue {
  return dropUndefined({ code, message, ruleId, field });
}

function enumValue<T extends string>(input: unknown, allowedValues: readonly T[]): T | null {
  return typeof input === "string" && (allowedValues as readonly string[]).includes(input) ? input as T : null;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function containsArrayPosition(value: unknown): boolean {
  return typeof value === "string" && (/\[\d+\]/.test(value) || /(?:^|[./])\d+(?:[./]|$)/.test(value));
}

function hasSparseArrayEntry(input: readonly unknown[]): boolean {
  for (let index = 0; index < input.length; index += 1) {
    if (!(index in input)) {
      return true;
    }
  }
  return false;
}

function hasDisallowedControls(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

function isSafeText(value: string): boolean {
  const lower = value.toLowerCase();
  if (/<\s*script\b/.test(lower) || /javascript\s*:/.test(lower) || /\son[a-z]+\s*=/.test(lower)) {
    return false;
  }
  if (/^\s*(function\s+\w*|\(?\s*[\w,\s]*\)?\s*=>|class\s+\w+|import\s+.+\s+from\s+|export\s+)/m.test(value)) {
    return false;
  }
  if (/^\s*(set|collect|patch|submitform|navigate|remove|updatecontext)\s*\(/im.test(value)) {
    return false;
  }
  if (/^\s*(screens?|controls?|properties?|items?|onselect):\s*$/im.test(value)) {
    return false;
  }
  if (/^\s*[\w.-]+\s*:\s*[\w[{]/m.test(value) && /(?:\n\s+[\w.-]+\s*:|\n\s*-\s+)/.test(value)) {
    return false;
  }
  return true;
}

function deepFreeze<T>(input: T): T {
  if (typeof input !== "object" || input === null || Object.isFrozen(input)) {
    return input;
  }
  for (const value of Object.values(input)) {
    deepFreeze(value);
  }
  return Object.freeze(input);
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
