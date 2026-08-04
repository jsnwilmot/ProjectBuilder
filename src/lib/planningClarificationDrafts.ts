import type { PhaseGateId, PhaseGateResult } from "./phaseGates";
import type {
  PlanningClarificationRule,
  PlanningRuleSourceRequirement
} from "./planningRules";
import { getActivePlanningRulesForProjectType } from "./planningRules";
import type {
  PlanningClarificationValue,
  PlanningProposalCategory,
  PlanningRestriction,
  PlanningTargetReference,
  PlanningUncertainty
} from "./planningProposals";
import type { PowerPlatformGateStatus, ProjectType } from "../types/project";

export interface PlanningClarificationDraftGenerationInput {
  projectId: string;
  projectType: ProjectType;
  gateResults: readonly PhaseGateResult[];
}

export interface PlanningClarificationDraft {
  draftKey: string;
  projectId: string;
  ruleId: string;
  ruleVersion: string;
  target: PlanningTargetReference & {
    targetKey: PhaseGateId;
    kind: "readinessRequirement";
    operation: "clarificationOnly";
  };
  category: PlanningProposalCategory;
  restriction: PlanningRestriction;
  uncertainty: PlanningUncertainty;
  value: PlanningClarificationValue;
  title: string;
  question: string;
  rationale: string;
  consequence: string;
  priority: number;
  acceptableSources: readonly PlanningRuleSourceRequirement[];
  notApplicableAllowed: boolean;
  deferralAllowed: boolean;
  architectApprovalRequired: boolean;
  gateStatus: PowerPlatformGateStatus;
  gateBlockingReason: string;
  gateSourceSection: string;
}

export type PlanningClarificationDraftGenerationIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "invalidProjectType"
  | "invalidGateResults"
  | "invalidGateResult"
  | "invalidGateStatus"
  | "missingGateResult"
  | "duplicateGateResult"
  | "disallowedNotApplicableStatus"
  | "duplicateDraftKey";

export interface PlanningClarificationDraftGenerationIssue {
  code: PlanningClarificationDraftGenerationIssueCode;
  message: string;
  ruleId?: string;
  gateId?: PhaseGateId | string;
  field?: string;
}

export interface PlanningClarificationDraftGenerationResult {
  drafts: readonly PlanningClarificationDraft[];
  issues: readonly PlanningClarificationDraftGenerationIssue[];
}

const CANVAS_PROJECT_TYPE = "powerAppsCanvas" satisfies ProjectType;

const VALID_PROJECT_TYPES = [
  "staticWebsite",
  "businessWebsite",
  "webApplication",
  "mobileApp",
  "androidApp",
  "iosApp",
  "game",
  "dashboardReporting",
  "microsoft365",
  "powerAppsCanvas",
  "powerAppsModelDriven",
  "automationWorkflow",
  "apiBackend",
  "ecommerceSite",
  "aiAssistantChatbot",
  "desktopSoftware",
  "otherDigitalProject"
] as const satisfies readonly ProjectType[];

const RESOLVED_STATUSES = [
  "confirmed",
  "ready",
  "passed"
] as const satisfies readonly PowerPlatformGateStatus[];

const UNRESOLVED_STATUSES = [
  "notStarted",
  "missingInformation",
  "reviewNeeded",
  "manualValidationRequired",
  "inProgress",
  "blocked",
  "failed"
] as const satisfies readonly PowerPlatformGateStatus[];

const VALID_GATE_STATUSES = [
  ...RESOLVED_STATUSES,
  "notApplicable",
  ...UNRESOLVED_STATUSES
] as const satisfies readonly PowerPlatformGateStatus[];

export function generatePlanningClarificationDrafts(input: unknown): PlanningClarificationDraftGenerationResult {
  const issues: PlanningClarificationDraftGenerationIssue[] = [];
  if (!isPlainObject(input)) {
    return result([], [issue("invalidInput", "Clarification draft input must be an object.")]);
  }

  const projectId = validateProjectId(input.projectId, issues);
  const projectType = validateProjectType(input.projectType, issues);
  const gateResults = validateGateResultsArray(input.gateResults, issues);

  if (!projectId || !projectType || !gateResults) {
    return result([], issues);
  }

  if (projectType !== CANVAS_PROJECT_TYPE) {
    return result([], issues);
  }

  const rules = getActivePlanningRulesForProjectType(projectType);
  const relevantGateIds = new Set(rules.map((rule) => rule.target.targetKey));
  const gateState = collectRelevantGateResults(gateResults, relevantGateIds, issues);
  const drafts: PlanningClarificationDraft[] = [];
  const draftKeys = new Set<string>();

  for (const rule of sortRules(rules)) {
    const gateId = rule.target.targetKey;
    const count = gateState.counts.get(gateId) ?? 0;
    if (count === 0) {
      issues.push(issue("missingGateResult", "Applicable clarification rule has no matching gate result.", rule.ruleId, gateId, "gateResults"));
      continue;
    }
    if (count > 1) {
      issues.push(issue("duplicateGateResult", "Applicable clarification rule has more than one matching gate result.", rule.ruleId, gateId, "gateResults"));
      continue;
    }
    if (gateState.invalidGateIds.has(gateId)) {
      continue;
    }

    const gateResult = gateState.validResults.get(gateId);
    if (!gateResult) {
      continue;
    }
    if ((RESOLVED_STATUSES as readonly PowerPlatformGateStatus[]).includes(gateResult.status)) {
      continue;
    }
    if (gateResult.status === "notApplicable" && rule.notApplicableAllowed) {
      continue;
    }
    if (gateResult.status === "notApplicable" && !rule.notApplicableAllowed) {
      issues.push(issue("disallowedNotApplicableStatus", "Mandatory clarification rule cannot be resolved by Not Applicable.", rule.ruleId, gateId, "status"));
    }
    if (
      gateResult.status !== "notApplicable" &&
      !(UNRESOLVED_STATUSES as readonly PowerPlatformGateStatus[]).includes(gateResult.status)
    ) {
      continue;
    }

    const draft = createDraft(projectId, rule, gateResult);
    if (draftKeys.has(draft.draftKey)) {
      issues.push(issue("duplicateDraftKey", "Generated clarification draft key must be unique.", rule.ruleId, gateId, "draftKey"));
      continue;
    }
    draftKeys.add(draft.draftKey);
    drafts.push(draft);
  }

  return result(sortDrafts(drafts), issues);
}

function validateProjectId(
  input: unknown,
  issues: PlanningClarificationDraftGenerationIssue[]
): string | null {
  if (
    typeof input !== "string" ||
    input.trim().length === 0 ||
    input.length > 200 ||
    /[\r\n]/.test(input)
  ) {
    issues.push(issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, "projectId"));
    return null;
  }
  return input;
}

function validateProjectType(
  input: unknown,
  issues: PlanningClarificationDraftGenerationIssue[]
): ProjectType | null {
  if (!isProjectType(input)) {
    issues.push(issue("invalidProjectType", "Project type must be one of the existing canonical project types.", undefined, undefined, "projectType"));
    return null;
  }
  return input;
}

function validateGateResultsArray(
  input: unknown,
  issues: PlanningClarificationDraftGenerationIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue("invalidGateResults", "Gate results must be an array.", undefined, undefined, "gateResults"));
    return null;
  }
  return input;
}

function collectRelevantGateResults(
  gateResults: readonly unknown[],
  relevantGateIds: ReadonlySet<PhaseGateId>,
  issues: PlanningClarificationDraftGenerationIssue[]
): {
  counts: Map<PhaseGateId, number>;
  validResults: Map<PhaseGateId, PhaseGateResult>;
  invalidGateIds: Set<PhaseGateId>;
} {
  const counts = new Map<PhaseGateId, number>();
  const validResults = new Map<PhaseGateId, PhaseGateResult>();
  const invalidGateIds = new Set<PhaseGateId>();

  for (const rawResult of gateResults) {
    if (!isPlainObject(rawResult)) {
      issues.push(issue("invalidGateResult", "Gate result must be an object.", undefined, undefined, "gateResults"));
      continue;
    }

    const gateId = rawResult.id;
    if (typeof gateId !== "string") {
      issues.push(issue("invalidGateResult", "Gate result ID must be a string.", undefined, undefined, "id"));
      continue;
    }
    if (!relevantGateIds.has(gateId as PhaseGateId)) {
      continue;
    }

    const typedGateId = gateId as PhaseGateId;
    counts.set(typedGateId, (counts.get(typedGateId) ?? 0) + 1);

    if (
      typeof rawResult.label !== "string" ||
      typeof rawResult.blockingReason !== "string" ||
      typeof rawResult.sourceSection !== "string"
    ) {
      issues.push(issue("invalidGateResult", "Relevant gate result must contain string label, blockingReason, and sourceSection fields.", undefined, typedGateId, "gateResults"));
      invalidGateIds.add(typedGateId);
      continue;
    }

    if (!isGateStatus(rawResult.status)) {
      issues.push(issue("invalidGateStatus", "Relevant gate result status is invalid.", undefined, typedGateId, "status"));
      invalidGateIds.add(typedGateId);
      continue;
    }

    validResults.set(typedGateId, {
      id: typedGateId,
      label: rawResult.label,
      status: rawResult.status,
      blockingReason: rawResult.blockingReason,
      sourceSection: rawResult.sourceSection
    });
  }

  return { counts, validResults, invalidGateIds };
}

function createDraft(
  projectId: string,
  rule: PlanningClarificationRule,
  gateResult: PhaseGateResult
): PlanningClarificationDraft {
  return {
    draftKey: `${rule.ruleId}|${rule.target.targetKey}`,
    projectId,
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    target: cloneTarget(rule.target),
    category: rule.category,
    restriction: rule.restriction,
    uncertainty: rule.uncertainty,
    value: {
      kind: "clarification",
      question: rule.question
    },
    title: rule.title,
    question: rule.question,
    rationale: rule.rationale,
    consequence: rule.consequence,
    priority: rule.priority,
    acceptableSources: rule.acceptableSources.map((source) => ({ ...source })),
    notApplicableAllowed: rule.notApplicableAllowed,
    deferralAllowed: rule.deferralAllowed,
    architectApprovalRequired: rule.architectApprovalRequired,
    gateStatus: gateResult.status,
    gateBlockingReason: gateResult.blockingReason,
    gateSourceSection: gateResult.sourceSection
  };
}

function sortRules(rules: readonly PlanningClarificationRule[]): PlanningClarificationRule[] {
  return [...rules].sort((first, second) => first.priority - second.priority || first.ruleId.localeCompare(second.ruleId));
}

function sortDrafts(drafts: readonly PlanningClarificationDraft[]): PlanningClarificationDraft[] {
  return [...drafts].sort((first, second) => first.priority - second.priority || first.ruleId.localeCompare(second.ruleId));
}

function cloneDraft(draft: PlanningClarificationDraft): PlanningClarificationDraft {
  return {
    ...draft,
    target: cloneTarget(draft.target),
    value: { ...draft.value },
    acceptableSources: draft.acceptableSources.map((source) => ({ ...source }))
  };
}

function cloneTarget(
  target: PlanningClarificationDraft["target"]
): PlanningClarificationDraft["target"] {
  return { ...target };
}

function result(
  drafts: readonly PlanningClarificationDraft[],
  issues: readonly PlanningClarificationDraftGenerationIssue[]
): PlanningClarificationDraftGenerationResult {
  return {
    drafts: drafts.map(cloneDraft),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningClarificationDraftGenerationIssueCode,
  message: string,
  ruleId?: string,
  gateId?: PhaseGateId | string,
  field?: string
): PlanningClarificationDraftGenerationIssue {
  return dropUndefined({ code, message, ruleId, gateId, field });
}

function isProjectType(input: unknown): input is ProjectType {
  return typeof input === "string" && (VALID_PROJECT_TYPES as readonly string[]).includes(input);
}

function isGateStatus(input: unknown): input is PowerPlatformGateStatus {
  return typeof input === "string" && (VALID_GATE_STATUSES as readonly string[]).includes(input);
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
