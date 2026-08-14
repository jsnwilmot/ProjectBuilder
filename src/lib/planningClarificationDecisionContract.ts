import {
  PLANNING_RULE_SET_VERSION,
  isPlanningStatusOutputEligible,
  isPlanningStatusReadinessEligible,
  isValidPlanningTransition,
  normalizeProjectPlanningState,
  type PlanningDecisionOrigin,
  type PlanningProposalRecord,
  type PlanningProposalStatus,
  type PlanningProposalValue,
  type PlanningSourceReference,
  type PlanningTargetReference,
  type ProjectPlanningState
} from "./planningProposals";
import { getPlanningRuleById, type PlanningClarificationRule } from "./planningRules";

export type PlanningClarificationHumanDecisionAction =
  | "revise"
  | "confirm"
  | "reject"
  | "defer"
  | "markNotApplicable";

export interface PlanningClarificationDecisionContractInput {
  projectId: string;
  planning: ProjectPlanningState;
  proposalId: string;
  action: PlanningClarificationHumanDecisionAction;
  value?: PlanningProposalValue;
  reason?: string;
}

export interface PlanningClarificationDecisionCapabilityInput {
  projectId: string;
  planning: ProjectPlanningState;
  proposalId: string;
}

export type PlanningClarificationDecisionCapabilityState =
  | "available"
  | "inputRequired"
  | "answerSchemaRequired"
  | "unavailable";

export type PlanningClarificationDecisionCapabilityRequiredInput =
  | "none"
  | "reason"
  | "answerSchema";

export type PlanningClarificationDecisionContractOutcome =
  | "allowed"
  | "blocked";

export type PlanningClarificationUserAnswerSourceAction =
  | "none"
  | "createInformational"
  | "createConfirmedAndStalePriorInformational";

export interface PlanningClarificationDecisionPlan {
  proposalId: string;
  action: PlanningClarificationHumanDecisionAction;
  previousStatus: PlanningProposalStatus;
  resultingStatus: PlanningProposalStatus;
  nextValue: PlanningProposalValue;
  decisionValue?: PlanningProposalValue;
  decisionReason?: string;
  userAnswerSourceAction: PlanningClarificationUserAnswerSourceAction;
  futureDecisionOrigin: Extract<PlanningDecisionOrigin, "userAction">;
  futureDecisionRuleSetVersion: typeof PLANNING_RULE_SET_VERSION;
  futureDecisionSourceIds: "completeResultingCurrentEvidenceSet";
  futureProposalLastDecisionId: "newDecisionId";
  futureProposalUpdatedAt: "transactionTimestamp";
  preserveProposalId: true;
  preserveFingerprint: true;
  readinessEligible: false;
  outputEligible: false;
}

export type PlanningClarificationDecisionContractIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "invalidProposalId"
  | "invalidPlanning"
  | "proposalNotFound"
  | "proposalNotClarification"
  | "unknownPlanningRule"
  | "ruleMismatch"
  | "unsupportedHumanAction"
  | "invalidStatusTransition"
  | "answerRequired"
  | "invalidAnswerValue"
  | "reasonRequired"
  | "notApplicableNotAllowed"
  | "deferralNotAllowed"
  | "revisionHistoryInvalid"
  | "userAnswerSourceMissing"
  | "userAnswerSourceInvalid"
  | "blockingConflict"
  | "alternativeDecisionRequiresControlledResolution"
  | "terminalProposal"
  | "staleClarificationRequiresReplacement";

export interface PlanningClarificationDecisionContractIssue {
  code: PlanningClarificationDecisionContractIssueCode;
  message: string;
  proposalId?: string;
  field?: string;
  underlyingIssueCode?: string;
}

export type PlanningClarificationDecisionCapabilityReasonCode =
  | PlanningClarificationDecisionContractIssueCode
  | "answerSchemaRequired";

export interface PlanningClarificationDecisionActionCapability {
  action: PlanningClarificationHumanDecisionAction;
  state: PlanningClarificationDecisionCapabilityState;
  requiredInput: PlanningClarificationDecisionCapabilityRequiredInput;
  reasonCodes: readonly PlanningClarificationDecisionCapabilityReasonCode[];
}

export interface PlanningClarificationDecisionCapabilitiesResult {
  proposalId?: string;
  capabilities: readonly PlanningClarificationDecisionActionCapability[];
  issues: readonly PlanningClarificationDecisionContractIssue[];
}

export type PlanningClarificationDecisionContractResult =
  | {
      outcome: "allowed";
      plan: PlanningClarificationDecisionPlan;
      issues: readonly [];
    }
  | {
      outcome: "blocked";
      issues: readonly PlanningClarificationDecisionContractIssue[];
      plan?: undefined;
    };

const SUPPORTED_ACTIONS: readonly PlanningClarificationHumanDecisionAction[] = [
  "revise",
  "confirm",
  "reject",
  "defer",
  "markNotApplicable"
];

const TERMINAL_STATUSES = new Set<PlanningProposalStatus>(["Rejected", "Superseded"]);
const REVISION_VALUE_KINDS = new Set<PlanningProposalValue["kind"]>([
  "text",
  "boolean",
  "enum",
  "stringList",
  "structuredRecord"
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CAPABILITY_INPUT_KEYS = new Set(["projectId", "planning", "proposalId"]);

const LIMITS = {
  projectId: 200,
  recordId: 128,
  shortText: 500,
  longText: 2000,
  textValue: 4000,
  listItems: 100,
  listItem: 500,
  structuredKeys: 50,
  structuredDepth: 4,
  structuredSize: 12000
} as const;

export function buildPlanningUserAnswerLocator(
  proposalId: string,
  decisionId: string
): string | null {
  const normalizedProposalId = normalizeUuid(proposalId);
  const normalizedDecisionId = normalizeUuid(decisionId);
  return normalizedProposalId && normalizedDecisionId
    ? `planning:userAnswer:${normalizedProposalId}:${normalizedDecisionId}`
    : null;
}

export function analyzePlanningClarificationDecisionCapabilities(
  input: unknown
): PlanningClarificationDecisionCapabilitiesResult {
  if (!isPlainObject(input)) {
    return unavailableCapabilities([
      issue("invalidInput", "Clarification decision capability input must be an object.")
    ]);
  }

  const forbiddenKey = Object.keys(input).find((key) => !CAPABILITY_INPUT_KEYS.has(key));
  if (forbiddenKey) {
    return unavailableCapabilities([
      issue("invalidInput", "Clarification decision capability input contains an unsupported field.", undefined, forbiddenKey)
    ]);
  }

  const projectId = normalizeProjectId(input.projectId);
  if (!projectId) {
    return unavailableCapabilities([
      issue("invalidProjectId", "Project ID must be a non-empty bounded single-line value.", undefined, "projectId")
    ]);
  }

  const proposalId = normalizeUuid(input.proposalId);
  if (!proposalId) {
    return unavailableCapabilities([
      issue("invalidProposalId", "Proposal ID must be a canonical lowercase UUID.", undefined, "proposalId")
    ]);
  }

  const context = resolveClarificationDecisionContext(projectId, input.planning, proposalId);
  if (context.outcome === "blocked") {
    return unavailableCapabilities(context.issues, proposalId);
  }

  const { planning, proposal, rule } = context;
  return {
    proposalId,
    capabilities: SUPPORTED_ACTIONS.map((action) => {
      switch (action) {
        case "revise": {
          const structuralIssue = validateReviseAvailability(proposal);
          return structuralIssue
            ? unavailableCapability(action, structuralIssue.code)
            : capability(action, "answerSchemaRequired", "answerSchema", ["answerSchemaRequired"]);
        }
        case "confirm": {
          const structuralIssue = validateConfirmAvailability(planning, proposal);
          return structuralIssue
            ? unavailableCapability(action, structuralIssue.code)
            : capability(action, "available", "none");
        }
        case "reject": {
          const structuralIssue = validateRejectAvailability(proposal);
          return structuralIssue
            ? unavailableCapability(action, structuralIssue.code)
            : capability(action, "inputRequired", "reason", ["reasonRequired"]);
        }
        case "defer": {
          const structuralIssue = validateDeferAvailability(proposal, rule);
          return structuralIssue
            ? unavailableCapability(action, structuralIssue.code)
            : capability(action, "inputRequired", "reason", ["reasonRequired"]);
        }
        case "markNotApplicable": {
          const structuralIssue = validateMarkNotApplicableAvailability(proposal, rule);
          return structuralIssue
            ? unavailableCapability(action, structuralIssue.code)
            : capability(action, "inputRequired", "reason", ["reasonRequired"]);
        }
      }
    }),
    issues: []
  };
}

export function analyzePlanningClarificationHumanDecision(
  input: unknown
): PlanningClarificationDecisionContractResult {
  if (!isPlainObject(input)) {
    return blocked(issue("invalidInput", "Clarification human decision input must be an object."));
  }

  const projectId = normalizeProjectId(input.projectId);
  if (!projectId) {
    return blocked(issue("invalidProjectId", "Project ID must be a non-empty bounded single-line value.", undefined, "projectId"));
  }

  const proposalId = normalizeUuid(input.proposalId);
  if (!proposalId) {
    return blocked(issue("invalidProposalId", "Proposal ID must be a canonical lowercase UUID.", undefined, "proposalId"));
  }

  const action = isSupportedAction(input.action) ? input.action : null;
  if (!action) {
    return blocked(issue("unsupportedHumanAction", "Human action is outside the clarification decision contract.", proposalId, "action"));
  }

  const context = resolveClarificationDecisionContext(projectId, input.planning, proposalId);
  if (context.outcome === "blocked") return blocked(...context.issues);
  const { planning, proposal, rule } = context;

  switch (action) {
    case "revise":
      return analyzeRevise(input.value, proposal);
    case "confirm":
      return analyzeConfirm(planning, proposal);
    case "reject":
      return analyzeReject(input.reason, proposal);
    case "defer":
      return analyzeDefer(input.reason, proposal, rule);
    case "markNotApplicable":
      return analyzeMarkNotApplicable(input.reason, proposal, rule);
  }
}

function analyzeRevise(
  inputValue: unknown,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractResult {
  const structuralIssue = validateReviseAvailability(proposal);
  if (structuralIssue) return blocked(structuralIssue);

  if (inputValue === undefined) {
    return blocked(issue("answerRequired", "Revision requires an answer value.", proposal.proposalId, "value"));
  }

  const value = normalizeRevisionValue(inputValue);
  if (!value) {
    return blocked(issue("invalidAnswerValue", "Revision answer value kind is not permitted.", proposal.proposalId, "value"));
  }

  return allowed({
    proposal,
    action: "revise",
    resultingStatus: "Revised",
    nextValue: value,
    decisionValue: value,
    userAnswerSourceAction: "createInformational"
  });
}

function analyzeConfirm(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractResult {
  const structuralIssue = validateConfirmAvailability(planning, proposal);
  if (structuralIssue) return blocked(structuralIssue);

  return allowed({
    proposal,
    action: "confirm",
    resultingStatus: "Confirmed",
    nextValue: proposal.value,
    userAnswerSourceAction: "createConfirmedAndStalePriorInformational"
  });
}

function analyzeReject(
  reasonInput: unknown,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractResult {
  const reason = normalizeReason(reasonInput);
  if (!reason) {
    return blocked(issue("reasonRequired", "Rejection requires a bounded reason.", proposal.proposalId, "reason"));
  }
  const structuralIssue = validateRejectAvailability(proposal);
  if (structuralIssue) return blocked(structuralIssue);
  return allowed({
    proposal,
    action: "reject",
    resultingStatus: "Rejected",
    nextValue: proposal.value,
    decisionReason: reason,
    userAnswerSourceAction: "none"
  });
}

function analyzeDefer(
  reasonInput: unknown,
  proposal: PlanningProposalRecord,
  rule: PlanningClarificationRule
): PlanningClarificationDecisionContractResult {
  const reason = normalizeReason(reasonInput);
  if (!reason) {
    return blocked(issue("reasonRequired", "Deferral requires a bounded reason.", proposal.proposalId, "reason"));
  }
  const structuralIssue = validateDeferAvailability(proposal, rule);
  if (structuralIssue) return blocked(structuralIssue);
  return allowed({
    proposal,
    action: "defer",
    resultingStatus: "Deferred",
    nextValue: proposal.value,
    decisionReason: reason,
    userAnswerSourceAction: "none"
  });
}

function analyzeMarkNotApplicable(
  reasonInput: unknown,
  proposal: PlanningProposalRecord,
  rule: PlanningClarificationRule
): PlanningClarificationDecisionContractResult {
  const reason = normalizeReason(reasonInput);
  if (!reason) {
    return blocked(issue("reasonRequired", "Not Applicable requires a bounded reason.", proposal.proposalId, "reason"));
  }
  const structuralIssue = validateMarkNotApplicableAvailability(proposal, rule);
  if (structuralIssue) return blocked(structuralIssue);

  const nextValue: PlanningProposalValue = { kind: "notApplicable", reason };
  return allowed({
    proposal,
    action: "markNotApplicable",
    resultingStatus: "Not Applicable",
    nextValue,
    decisionValue: nextValue,
    userAnswerSourceAction: "none"
  });
}

type ClarificationDecisionContextResolution =
  | {
      outcome: "resolved";
      planning: ProjectPlanningState;
      proposal: PlanningProposalRecord;
      rule: PlanningClarificationRule;
    }
  | {
      outcome: "blocked";
      issues: readonly PlanningClarificationDecisionContractIssue[];
    };

function resolveClarificationDecisionContext(
  projectId: string,
  planningInput: unknown,
  proposalId: string
): ClarificationDecisionContextResolution {
  const normalized = normalizeProjectPlanningState(planningInput, projectId);
  if (normalized.issues.length > 0) {
    return {
      outcome: "blocked",
      issues: normalized.issues.map((entry) =>
        issue("invalidPlanning", "Planning state failed normalization.", entry.recordId, entry.field ?? entry.collection, entry.code)
      )
    };
  }

  const planning = normalized.planning;
  const proposal = planning.proposals.find((candidate) => candidate.proposalId === proposalId);
  if (!proposal) {
    return {
      outcome: "blocked",
      issues: [issue("proposalNotFound", "Proposal was not found in normalized planning.", proposalId, "proposalId")]
    };
  }

  const scopeIssue = validateClarificationScope(proposal);
  if (scopeIssue) return { outcome: "blocked", issues: [scopeIssue] };

  if (TERMINAL_STATUSES.has(proposal.status)) {
    return {
      outcome: "blocked",
      issues: [issue("terminalProposal", "Terminal clarification history cannot be changed by human decision.", proposalId, "status")]
    };
  }

  const rule = getPlanningRuleById(proposal.ruleId);
  if (!rule) {
    return {
      outcome: "blocked",
      issues: [issue("unknownPlanningRule", "Clarification proposal is not associated with a known planning rule.", proposalId, "ruleId")]
    };
  }

  const ruleIssue = validateRuleAuthority(proposal, rule);
  return ruleIssue
    ? { outcome: "blocked", issues: [ruleIssue] }
    : { outcome: "resolved", planning, proposal, rule };
}

function validateReviseAvailability(
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractIssue | null {
  return !isValidPlanningTransition(proposal.status, "Revised") || proposal.status !== "Needs Clarification"
    ? issue("invalidStatusTransition", "Clarification revisions must start from Needs Clarification.", proposal.proposalId, "status")
    : null;
}

function validateConfirmAvailability(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractIssue | null {
  if (proposal.status === "Stale") {
    return issue("staleClarificationRequiresReplacement", "Stale clarification records require deterministic replacement before human confirmation.", proposal.proposalId, "status");
  }
  if (!isValidPlanningTransition(proposal.status, "Confirmed") || proposal.status !== "Revised") {
    return issue("invalidStatusTransition", "Clarification confirmation requires a previously revised proposal.", proposal.proposalId, "status");
  }
  if (proposal.alternativeGroupId) {
    return issue("alternativeDecisionRequiresControlledResolution", "Alternative-group confirmation requires controlled resolution.", proposal.proposalId, "alternativeGroupId");
  }
  if (hasOpenBlockingConflict(planning, proposal.proposalId)) {
    return issue("blockingConflict", "Open blocking conflicts must be resolved before confirmation.", proposal.proposalId, "conflicts");
  }
  return validateRevisionHistory(planning, proposal);
}

function validateRejectAvailability(
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractIssue | null {
  return isValidPlanningTransition(proposal.status, "Rejected")
    ? null
    : issue("invalidStatusTransition", "Current proposal status cannot transition to Rejected.", proposal.proposalId, "status");
}

function validateDeferAvailability(
  proposal: PlanningProposalRecord,
  rule: PlanningClarificationRule
): PlanningClarificationDecisionContractIssue | null {
  if (!rule.deferralAllowed) {
    return issue("deferralNotAllowed", "The governing clarification rule does not allow deferral.", proposal.proposalId, "ruleId");
  }
  return isValidPlanningTransition(proposal.status, "Deferred")
    ? null
    : issue("invalidStatusTransition", "Current proposal status cannot transition to Deferred.", proposal.proposalId, "status");
}

function validateMarkNotApplicableAvailability(
  proposal: PlanningProposalRecord,
  rule: PlanningClarificationRule
): PlanningClarificationDecisionContractIssue | null {
  if (!rule.notApplicableAllowed) {
    return issue("notApplicableNotAllowed", "The governing clarification rule does not allow Not Applicable.", proposal.proposalId, "ruleId");
  }
  return isValidPlanningTransition(proposal.status, "Not Applicable")
    ? null
    : issue("invalidStatusTransition", "Current proposal status cannot transition to Not Applicable.", proposal.proposalId, "status");
}

function validateClarificationScope(proposal: PlanningProposalRecord): PlanningClarificationDecisionContractIssue | null {
  if (
    proposal.category !== "clarification" ||
    proposal.target.kind !== "readinessRequirement" ||
    proposal.target.operation !== "clarificationOnly"
  ) {
    return issue("proposalNotClarification", "Proposal is outside the clarification readiness contract.", proposal.proposalId, "target");
  }
  return null;
}

function validateRuleAuthority(
  proposal: PlanningProposalRecord,
  rule: PlanningClarificationRule
): PlanningClarificationDecisionContractIssue | null {
  if (
    rule.status !== "active" ||
    proposal.ruleId !== rule.ruleId ||
    proposal.ruleVersion !== rule.ruleVersion ||
    proposal.category !== rule.category ||
    proposal.restriction !== rule.restriction ||
    !sameTarget(proposal.target, rule.target)
  ) {
    return issue("ruleMismatch", "Proposal does not exactly match the active governing clarification rule.", proposal.proposalId, "ruleId");
  }
  return null;
}

function validateRevisionHistory(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractIssue | null {
  if (!proposal.lastDecisionId) {
    return issue("revisionHistoryInvalid", "Revised proposal is missing lastDecisionId.", proposal.proposalId, "lastDecisionId");
  }

  const decisions = planning.decisions.filter((decision) => decision.decisionId === proposal.lastDecisionId);
  if (decisions.length !== 1) {
    return issue("revisionHistoryInvalid", "Revised proposal must reference exactly one revision decision.", proposal.proposalId, "lastDecisionId");
  }

  const decision = decisions[0];
  if (
    decision.proposalId !== proposal.proposalId ||
    decision.action !== "revise" ||
    decision.previousStatus !== "Needs Clarification" ||
    decision.resultingStatus !== "Revised" ||
    decision.origin !== "userAction" ||
    !decision.value ||
    !sameValue(decision.value, proposal.value) ||
    !decision.sourceIds ||
    !sameStringArray(decision.sourceIds, proposal.sourceIds)
  ) {
    return issue("revisionHistoryInvalid", "Revised proposal history does not prove a valid user revision.", proposal.proposalId, "lastDecisionId");
  }

  const expectedLocator = buildPlanningUserAnswerLocator(proposal.proposalId, decision.decisionId);
  if (!expectedLocator) {
    return issue("revisionHistoryInvalid", "Revision history cannot produce a canonical user-answer locator.", proposal.proposalId, "lastDecisionId");
  }

  const currentSources = new Map(planning.sources.map((source) => [source.sourceId, source]));
  const revisionSources = proposal.sourceIds
    .map((sourceId) => currentSources.get(sourceId))
    .filter((source): source is PlanningSourceReference => Boolean(source));
  const userAnswerSources = revisionSources.filter((source) =>
    source.sourceType === "userAnswer" &&
    source.authority === "informational" &&
    source.availability === "current"
  );

  if (userAnswerSources.length === 0) {
    return issue("userAnswerSourceMissing", "Revised proposal is missing a current informational user-answer source.", proposal.proposalId, "sourceIds");
  }
  if (userAnswerSources.length !== 1 || userAnswerSources[0].locator !== expectedLocator || userAnswerSources[0].label !== "User answer") {
    return issue("userAnswerSourceInvalid", "Revised proposal user-answer source does not use the canonical informational source contract.", proposal.proposalId, "sourceIds");
  }

  return null;
}

function hasOpenBlockingConflict(planning: ProjectPlanningState, proposalId: string): boolean {
  return planning.conflicts.some((conflict) =>
    conflict.status === "open" &&
    conflict.blocking === true &&
    (
      conflict.involvedReferences.some((reference) => reference.kind === "proposalId" && reference.proposalId === proposalId) ||
      conflict.affectedProposalIds?.includes(proposalId) === true ||
      conflict.resolutionOptionProposalIds?.includes(proposalId) === true
    )
  );
}

function allowed(input: {
  proposal: PlanningProposalRecord;
  action: PlanningClarificationHumanDecisionAction;
  resultingStatus: PlanningProposalStatus;
  nextValue: PlanningProposalValue;
  decisionValue?: PlanningProposalValue;
  decisionReason?: string;
  userAnswerSourceAction: PlanningClarificationUserAnswerSourceAction;
}): PlanningClarificationDecisionContractResult {
  const plan = dropUndefined({
    proposalId: input.proposal.proposalId,
    action: input.action,
    previousStatus: input.proposal.status,
    resultingStatus: input.resultingStatus,
    nextValue: cloneValue(input.nextValue),
    decisionValue: input.decisionValue ? cloneValue(input.decisionValue) : undefined,
    decisionReason: input.decisionReason,
    userAnswerSourceAction: input.userAnswerSourceAction,
    futureDecisionOrigin: "userAction" as const,
    futureDecisionRuleSetVersion: PLANNING_RULE_SET_VERSION,
    futureDecisionSourceIds: "completeResultingCurrentEvidenceSet" as const,
    futureProposalLastDecisionId: "newDecisionId" as const,
    futureProposalUpdatedAt: "transactionTimestamp" as const,
    preserveProposalId: true as const,
    preserveFingerprint: true as const,
    readinessEligible: isPlanningStatusReadinessEligible(input.resultingStatus),
    outputEligible: isPlanningStatusOutputEligible(input.resultingStatus)
  }) as PlanningClarificationDecisionPlan;
  return { outcome: "allowed", plan, issues: [] };
}

function capability(
  action: PlanningClarificationHumanDecisionAction,
  state: PlanningClarificationDecisionCapabilityState,
  requiredInput: PlanningClarificationDecisionCapabilityRequiredInput,
  reasonCodes: readonly PlanningClarificationDecisionCapabilityReasonCode[] = []
): PlanningClarificationDecisionActionCapability {
  return { action, state, requiredInput, reasonCodes: [...reasonCodes] };
}

function unavailableCapability(
  action: PlanningClarificationHumanDecisionAction,
  reasonCode: PlanningClarificationDecisionCapabilityReasonCode
): PlanningClarificationDecisionActionCapability {
  return capability(action, "unavailable", "none", [reasonCode]);
}

function unavailableCapabilities(
  issues: readonly PlanningClarificationDecisionContractIssue[],
  proposalId?: string
): PlanningClarificationDecisionCapabilitiesResult {
  const reasonCodes = issues.map((entry) => entry.code);
  return dropUndefined({
    proposalId,
    capabilities: SUPPORTED_ACTIONS.map((action) =>
      capability(action, "unavailable", "none", reasonCodes)
    ),
    issues: issues.map((entry) => ({ ...entry }))
  }) as PlanningClarificationDecisionCapabilitiesResult;
}

function blocked(
  ...issues: readonly PlanningClarificationDecisionContractIssue[]
): PlanningClarificationDecisionContractResult {
  return { outcome: "blocked", issues: issues.map((entry) => ({ ...entry })) };
}

function issue(
  code: PlanningClarificationDecisionContractIssueCode,
  message: string,
  proposalId?: string,
  field?: string,
  underlyingIssueCode?: string
): PlanningClarificationDecisionContractIssue {
  return dropUndefined({ code, message, proposalId, field, underlyingIssueCode });
}

function isSupportedAction(input: unknown): input is PlanningClarificationHumanDecisionAction {
  return typeof input === "string" && (SUPPORTED_ACTIONS as readonly string[]).includes(input);
}

function normalizeRevisionValue(input: unknown): PlanningProposalValue | null {
  return normalizeRevisionSafeValue(input, 1);
}

function normalizeRevisionSafeValue(input: unknown, depth: number): PlanningProposalValue | null {
  if (!isPlainObject(input) || depth > LIMITS.structuredDepth || !REVISION_VALUE_KINDS.has(input.kind as PlanningProposalValue["kind"])) return null;
  switch (input.kind) {
    case "text": {
      const value = normalizeMultiline(input.value, LIMITS.textValue);
      return value ? { kind: "text", value } : null;
    }
    case "boolean":
      return typeof input.value === "boolean" ? { kind: "boolean", value: input.value } : null;
    case "enum": {
      const value = normalizeSingleLine(input.value, LIMITS.shortText);
      return value ? { kind: "enum", value } : null;
    }
    case "stringList": {
      const value = normalizeStringList(input.value, LIMITS.listItems, LIMITS.listItem);
      return value ? { kind: "stringList", value } : null;
    }
    case "structuredRecord": {
      const value = normalizeRevisionStructuredRecord(input.value, depth + 1);
      return value && JSON.stringify(value).length <= LIMITS.structuredSize
        ? { kind: "structuredRecord", value }
        : null;
    }
    default:
      return null;
  }
}

function normalizeRevisionStructuredRecord(input: unknown, depth: number): Record<string, PlanningProposalValue> | null {
  if (!isPlainObject(input) || depth > LIMITS.structuredDepth) return null;
  const entries = Object.entries(input);
  if (entries.length > LIMITS.structuredKeys) return null;
  const normalized: Record<string, PlanningProposalValue> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = normalizeSingleLine(rawKey, LIMITS.shortText);
    const value = normalizeRevisionSafeValue(rawValue, depth);
    if (!key || !value || key === "__proto__" || key === "constructor" || key === "prototype") return null;
    normalized[key] = value;
  }
  return normalized;
}

function normalizeReason(input: unknown): string | null {
  return normalizeMultiline(input, LIMITS.longText);
}

function normalizeProjectId(input: unknown): string | null {
  return normalizeSingleLine(input, LIMITS.projectId);
}

function normalizeUuid(input: unknown): string | null {
  const value = normalizeSingleLine(input, LIMITS.recordId);
  return value && value === value.toLowerCase() && UUID_PATTERN.test(value) ? value : null;
}

function normalizeStringList(input: unknown, cap: number, itemLimit: number): readonly string[] | null {
  if (!Array.isArray(input) || input.length > cap || hasSparseArrayEntry(input)) return null;
  const normalized = input.map((item) => normalizeSingleLine(item, itemLimit));
  return normalized.every(Boolean) ? (normalized as string[]) : null;
}

function normalizeSingleLine(input: unknown, limit: number): string | null {
  if (typeof input !== "string") return null;
  const normalized = normalizeLineEndings(input).trim();
  if (!normalized || normalized.length > limit || /[\r\n]/.test(normalized) || hasDisallowedControls(normalized)) return null;
  return isSafeText(normalized) ? normalized : null;
}

function normalizeMultiline(input: unknown, limit: number): string | null {
  if (typeof input !== "string") return null;
  const normalized = normalizeLineEndings(input).trim();
  if (!normalized || normalized.length > limit || hasDisallowedControls(normalized)) return null;
  return isSafeText(normalized) ? normalized : null;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
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
  if (/<\s*script\b/.test(lower) || /javascript\s*:/.test(lower) || /\son[a-z]+\s*=/.test(lower)) return false;
  if (/^\s*(function\s+\w*|\(?\s*[\w,\s]*\)?\s*=>|class\s+\w+|import\s+.+\s+from\s+|export\s+)/m.test(value)) return false;
  if (/^\s*(set|collect|patch|submitform|navigate|remove|updatecontext)\s*\(/im.test(value)) return false;
  if (/^\s*(screens?|controls?|properties?|items?|onselect):\s*$/im.test(value)) return false;
  if (/^\s*[\w.-]+\s*:\s*[\w[{]/m.test(value) && /(?:\n\s+[\w.-]+\s*:|\n\s*-\s+)/.test(value)) return false;
  return true;
}

function hasSparseArrayEntry(input: readonly unknown[]): boolean {
  for (let index = 0; index < input.length; index += 1) {
    if (!(index in input)) return true;
  }
  return false;
}

function sameTarget(first: PlanningTargetReference, second: PlanningTargetReference): boolean {
  return (
    first.kind === second.kind &&
    first.domain === second.domain &&
    first.targetKey === second.targetKey &&
    first.entityId === second.entityId &&
    first.fieldKey === second.fieldKey &&
    first.operation === second.operation
  );
}

function sameStringArray(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((entry, index) => entry === second[index]);
}

function sameValue(first: PlanningProposalValue, second: PlanningProposalValue): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function cloneValue<T extends PlanningProposalValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
