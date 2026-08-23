import {
  PLANNING_RULE_SET_VERSION,
  isPlanningStatusOutputEligible,
  isPlanningStatusReadinessEligible,
  isValidPlanningTransition,
  normalizeProjectPlanningState,
  type PlanningDecisionRecord,
  type PlanningDecisionOrigin,
  type PlanningProposalRecord,
  type PlanningProposalStatus,
  type PlanningProposalValue,
  type PlanningSourceReference,
  type PlanningTargetReference,
  type ProjectPlanningState
} from "./planningProposals";
import { validatePlanningClarificationAnswer } from "./planningClarificationAnswerSchema";
import { getProductionPlanningClarificationAnswerSchema } from "./planningClarificationAnswerSchemaRegistry";
import { getPlanningRuleById, type PlanningClarificationRule } from "./planningRules";

export type PlanningClarificationHumanDecisionAction =
  | "revise"
  | "confirm"
  | "reject"
  | "defer"
  | "markNotApplicable"
  | "reopen";

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
  | "answerSchema"
  | "answer";

export type PlanningClarificationDecisionContractOutcome =
  | "allowed"
  | "blocked";

export type PlanningClarificationUserAnswerSourceAction =
  | "none"
  | "createInformational"
  | "replaceCurrentHumanWithInformational"
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
  | "answerSchemaRequired"
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
  PlanningClarificationDecisionContractIssueCode;

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
  "markNotApplicable",
  "reopen"
];

const TERMINAL_STATUSES = new Set<PlanningProposalStatus>(["Rejected", "Superseded"]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CAPABILITY_INPUT_KEYS = new Set(["projectId", "planning", "proposalId"]);
const DECISION_INPUT_KEYS = new Set(["projectId", "planning", "proposalId", "action", "value", "reason"]);

const LIMITS = {
  projectId: 200,
  recordId: 128,
  shortText: 500,
  longText: 2000
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
          const structuralIssue = validateReviseAvailability(planning, proposal);
          if (structuralIssue) return unavailableCapability(action, structuralIssue.code);
          return getProductionPlanningClarificationAnswerSchema(proposal.ruleId, proposal.ruleVersion)
            ? capability(action, "inputRequired", "answer", ["answerRequired"])
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
        case "reopen": {
          const resolution = resolveReopenTransition(planning, proposal);
          return resolution.outcome === "blocked"
            ? unavailableCapability(action, resolution.issue.code)
            : capability(action, "available", "none");
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

  const forbiddenKey = Object.keys(input).find((key) => !DECISION_INPUT_KEYS.has(key));
  if (forbiddenKey) {
    return blocked(issue("invalidInput", "Clarification human decision input contains an unsupported field.", undefined, forbiddenKey));
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
      return analyzeRevise(input.value, planning, proposal);
    case "confirm":
      return analyzeConfirm(planning, proposal);
    case "reject":
      return analyzeReject(input.reason, proposal);
    case "defer":
      return analyzeDefer(input.reason, proposal, rule);
    case "markNotApplicable":
      return analyzeMarkNotApplicable(input.reason, proposal, rule);
    case "reopen":
      return analyzeReopen(planning, proposal);
  }
}

function analyzeRevise(
  inputValue: unknown,
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractResult {
  const structuralIssue = validateReviseAvailability(planning, proposal);
  if (structuralIssue) return blocked(structuralIssue);

  const schema = getProductionPlanningClarificationAnswerSchema(proposal.ruleId, proposal.ruleVersion);
  if (!schema) {
    return blocked(issue("answerSchemaRequired", "Revision requires an exact registered answer schema.", proposal.proposalId, "value"));
  }

  if (inputValue === undefined) {
    return blocked(issue("answerRequired", "Revision requires an answer value.", proposal.proposalId, "value"));
  }

  const validation = validatePlanningClarificationAnswer(schema, inputValue);
  if (validation.outcome === "invalid") {
    return blocked(invalidAnswerIssue(proposal, validation.issues[0]?.code));
  }
  const value = validation.answer;

  return allowed({
    proposal,
    action: "revise",
    resultingStatus: "Revised",
    nextValue: value,
    decisionValue: value,
    userAnswerSourceAction: hasClaimedHumanAnswerSource(planning, proposal)
      ? "replaceCurrentHumanWithInformational"
      : "createInformational"
  });
}

function analyzeReopen(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractResult {
  const resolution = resolveReopenTransition(planning, proposal);
  if (resolution.outcome === "blocked") return blocked(resolution.issue);

  return allowed({
    proposal,
    action: "reopen",
    resultingStatus: resolution.resultingStatus,
    nextValue: proposal.value,
    userAnswerSourceAction: "none"
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
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractIssue | null {
  const sourceResolutionIssue = validateProposalSourceResolution(planning, proposal);
  if (sourceResolutionIssue) return sourceResolutionIssue;
  if (
    !isValidPlanningTransition(proposal.status, "Revised") ||
    (proposal.status !== "Needs Clarification" && proposal.status !== "Confirmed")
  ) {
    return issue("invalidStatusTransition", "Clarification revisions must start from Needs Clarification or Confirmed.", proposal.proposalId, "status");
  }

  if (proposal.status === "Confirmed") {
    return validateConfirmedHumanAnswerLineage(planning, proposal);
  }

  return hasClaimedHumanAnswerSource(planning, proposal)
    ? validateReopenedNeedsClarificationLineage(planning, proposal)
    : null;
}

function validateConfirmAvailability(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractIssue | null {
  const sourceResolutionIssue = validateProposalSourceResolution(planning, proposal);
  if (sourceResolutionIssue) return sourceResolutionIssue;
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
  const revisionIssue = validateRevisionHistory(planning, proposal);
  if (revisionIssue) return revisionIssue;

  const schema = getProductionPlanningClarificationAnswerSchema(proposal.ruleId, proposal.ruleVersion);
  if (!schema) {
    return issue("answerSchemaRequired", "Confirmation requires an exact registered answer schema.", proposal.proposalId, "value");
  }
  const validation = validatePlanningClarificationAnswer(schema, proposal.value);
  return validation.outcome === "invalid"
    ? invalidAnswerIssue(proposal, validation.issues[0]?.code)
    : null;
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
  const currentSource = resolveCurrentHumanAnswerSource(planning, proposal, "informational");
  if (currentSource.outcome === "blocked") return currentSource.issue;

  const lineageIssue = validateInformationalRevisionLineage(
    planning,
    proposal,
    currentSource.source,
    "current"
  );
  if (lineageIssue) return lineageIssue;

  const proposalDecisions = planning.decisions.filter((decision) => decision.proposalId === proposal.proposalId);
  const lastDecision = resolveLastProposalDecision(proposal, proposalDecisions);
  if (!lastDecision) {
    return issue("revisionHistoryInvalid", "Revised proposal does not reference the final persisted decision.", proposal.proposalId, "lastDecisionId");
  }

  if (lastDecision.action === "revise") {
    return lastDecision.resultingStatus === "Revised" &&
      lastDecision.origin === "userAction" &&
      sameOptionalSourceIds(lastDecision.sourceIds, proposal.sourceIds) &&
      sameValue(lastDecision.value as PlanningProposalValue, proposal.value)
      ? null
      : issue("revisionHistoryInvalid", "Revised proposal history does not prove the current user revision.", proposal.proposalId, "lastDecisionId");
  }

  const lastIndex = proposalDecisions.length - 1;
  const deferDecision = proposalDecisions[lastIndex - 1];
  return lastDecision.action === "reopen" &&
    lastDecision.previousStatus === "Deferred" &&
    lastDecision.resultingStatus === "Revised" &&
    lastDecision.origin === "userAction" &&
    lastDecision.value === undefined &&
    lastDecision.reason === undefined &&
    sameOptionalSourceIds(lastDecision.sourceIds, proposal.sourceIds) &&
    deferDecision?.action === "defer" &&
    deferDecision.previousStatus === "Revised" &&
    deferDecision.resultingStatus === "Deferred" &&
    deferDecision.origin === "userAction" &&
    Boolean(deferDecision.reason) &&
    sameOptionalSourceIds(deferDecision.sourceIds, proposal.sourceIds)
    ? null
    : issue("revisionHistoryInvalid", "Revised proposal history does not prove a valid Deferred resume.", proposal.proposalId, "lastDecisionId");
}

type ReopenTransitionResolution =
  | { outcome: "allowed"; resultingStatus: Extract<PlanningProposalStatus, "Needs Clarification" | "Revised"> }
  | { outcome: "blocked"; issue: PlanningClarificationDecisionContractIssue };

function resolveReopenTransition(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): ReopenTransitionResolution {
  const sourceResolutionIssue = validateProposalSourceResolution(planning, proposal);
  if (sourceResolutionIssue) return { outcome: "blocked", issue: sourceResolutionIssue };
  if (proposal.status === "Stale") {
    return {
      outcome: "blocked",
      issue: issue("staleClarificationRequiresReplacement", "Stale clarification records require deterministic replacement.", proposal.proposalId, "status")
    };
  }

  if (proposal.status === "Revised") {
    const lineageIssue = validateRevisionHistory(planning, proposal);
    return lineageIssue
      ? { outcome: "blocked", issue: lineageIssue }
      : { outcome: "allowed", resultingStatus: "Needs Clarification" };
  }

  if (proposal.status !== "Deferred" || !isValidPlanningTransition(proposal.status, "Needs Clarification")) {
    return {
      outcome: "blocked",
      issue: issue("invalidStatusTransition", "Clarification reopen is available only for valid Revised or Deferred history.", proposal.proposalId, "status")
    };
  }

  const claimedSources = claimedHumanAnswerSources(planning, proposal);
  const deferIssue = validateDeferredLastDecision(planning, proposal, claimedSources.length > 0);
  if (deferIssue) return { outcome: "blocked", issue: deferIssue };

  if (claimedSources.length === 0) {
    return { outcome: "allowed", resultingStatus: "Needs Clarification" };
  }

  const currentSource = resolveCurrentHumanAnswerSource(planning, proposal, "informational");
  if (currentSource.outcome === "blocked") return currentSource;
  const lineageIssue = validateInformationalRevisionLineage(planning, proposal, currentSource.source, "current");
  if (lineageIssue) return { outcome: "blocked", issue: lineageIssue };

  const schema = getProductionPlanningClarificationAnswerSchema(proposal.ruleId, proposal.ruleVersion);
  if (!schema) {
    return {
      outcome: "blocked",
      issue: issue("answerSchemaRequired", "Deferred saved-answer resume requires an exact registered answer schema.", proposal.proposalId, "value")
    };
  }
  const validation = validatePlanningClarificationAnswer(schema, proposal.value);
  if (!isValidPlanningTransition(proposal.status, "Revised")) {
    return {
      outcome: "blocked",
      issue: issue("invalidStatusTransition", "Deferred saved-answer history cannot transition to Revised.", proposal.proposalId, "status")
    };
  }
  return validation.outcome === "invalid"
    ? { outcome: "blocked", issue: invalidAnswerIssue(proposal, validation.issues[0]?.code) }
    : { outcome: "allowed", resultingStatus: "Revised" };
}

function validateReopenedNeedsClarificationLineage(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractIssue | null {
  const currentSource = resolveCurrentHumanAnswerSource(planning, proposal, "informational");
  if (currentSource.outcome === "blocked") return currentSource.issue;
  const lineageIssue = validateInformationalRevisionLineage(planning, proposal, currentSource.source, "current");
  if (lineageIssue) return lineageIssue;

  const decisions = planning.decisions.filter((decision) => decision.proposalId === proposal.proposalId);
  const lastDecision = resolveLastProposalDecision(proposal, decisions);
  return lastDecision?.action === "reopen" &&
    lastDecision.previousStatus === "Revised" &&
    lastDecision.resultingStatus === "Needs Clarification" &&
    lastDecision.origin === "userAction" &&
    lastDecision.value === undefined &&
    lastDecision.reason === undefined &&
    sameOptionalSourceIds(lastDecision.sourceIds, proposal.sourceIds)
    ? null
    : issue("revisionHistoryInvalid", "Needs Clarification human-answer history does not prove a controlled reopen.", proposal.proposalId, "lastDecisionId");
}

function validateConfirmedHumanAnswerLineage(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractIssue | null {
  const currentSource = resolveCurrentHumanAnswerSource(planning, proposal, "confirmed");
  if (currentSource.outcome === "blocked") return currentSource.issue;
  const confirmDecision = resolveCanonicalUserAnswerDecision(planning, proposal, currentSource.source);
  if (!confirmDecision ||
    confirmDecision.action !== "confirm" ||
    confirmDecision.previousStatus !== "Revised" ||
    confirmDecision.resultingStatus !== "Confirmed" ||
    confirmDecision.origin !== "userAction" ||
    confirmDecision.value !== undefined ||
    confirmDecision.reason !== undefined ||
    !sameOptionalSourceIds(confirmDecision.sourceIds, proposal.sourceIds)
  ) {
    return issue("userAnswerSourceInvalid", "Confirmed proposal does not have coherent current human-answer provenance.", proposal.proposalId, "sourceIds");
  }

  const decisions = planning.decisions.filter((decision) => decision.proposalId === proposal.proposalId);
  if (resolveLastProposalDecision(proposal, decisions)?.decisionId !== confirmDecision.decisionId) {
    return issue("revisionHistoryInvalid", "Confirmed proposal does not reference its final confirmation decision.", proposal.proposalId, "lastDecisionId");
  }
  const priorRevisedDecision = decisions[decisions.length - 2];
  if (!priorRevisedDecision || priorRevisedDecision.resultingStatus !== "Revised") {
    return issue("revisionHistoryInvalid", "Confirmed proposal is missing the revision history that established its answer.", proposal.proposalId, "lastDecisionId");
  }

  const priorSources = resolveSourcesByIds(planning, priorRevisedDecision.sourceIds ?? []);
  const informationalSources = priorSources.filter((source) =>
    source.sourceType === "userAnswer" &&
    source.authority === "informational" &&
    source.availability === "stale"
  );
  if (informationalSources.length !== 1) {
    return issue("userAnswerSourceInvalid", "Confirmed proposal is missing one historical informational answer source.", proposal.proposalId, "sourceIds");
  }
  const lineageIssue = validateInformationalRevisionLineage(planning, proposal, informationalSources[0], "stale");
  if (lineageIssue) return lineageIssue;

  if (priorRevisedDecision.action === "reopen") {
    const deferDecision = decisions[decisions.length - 3];
    if (
      priorRevisedDecision.previousStatus !== "Deferred" ||
      !priorRevisedDecision.sourceIds ||
      deferDecision?.action !== "defer" ||
      deferDecision.previousStatus !== "Revised" ||
      deferDecision.resultingStatus !== "Deferred" ||
      !sameOptionalSourceIds(deferDecision.sourceIds, priorRevisedDecision.sourceIds)
    ) {
      return issue("revisionHistoryInvalid", "Confirmed proposal resume history is not coherent.", proposal.proposalId, "lastDecisionId");
    }
  } else if (priorRevisedDecision.action !== "revise") {
    return issue("revisionHistoryInvalid", "Confirmed proposal was not established by a valid revision.", proposal.proposalId, "lastDecisionId");
  }

  return null;
}

function validateDeferredLastDecision(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord,
  hasSavedAnswer: boolean
): PlanningClarificationDecisionContractIssue | null {
  const decisions = planning.decisions.filter((decision) => decision.proposalId === proposal.proposalId);
  const lastDecision = resolveLastProposalDecision(proposal, decisions);
  return lastDecision?.action === "defer" &&
    lastDecision.previousStatus === (hasSavedAnswer ? "Revised" : "Needs Clarification") &&
    lastDecision.resultingStatus === "Deferred" &&
    lastDecision.origin === "userAction" &&
    Boolean(lastDecision.reason) &&
    lastDecision.value === undefined &&
    sameOptionalSourceIds(lastDecision.sourceIds, proposal.sourceIds)
    ? null
    : issue("revisionHistoryInvalid", "Deferred proposal does not have coherent deferral history.", proposal.proposalId, "lastDecisionId");
}

type CurrentHumanAnswerSourceResolution =
  | { outcome: "resolved"; source: PlanningSourceReference }
  | { outcome: "blocked"; issue: PlanningClarificationDecisionContractIssue };

function resolveCurrentHumanAnswerSource(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord,
  authority: Extract<PlanningSourceReference["authority"], "informational" | "confirmed">
): CurrentHumanAnswerSourceResolution {
  const claimedSources = claimedHumanAnswerSources(planning, proposal);
  if (claimedSources.length === 0) {
    return {
      outcome: "blocked",
      issue: issue("userAnswerSourceMissing", "Proposal is missing its current human-answer source.", proposal.proposalId, "sourceIds")
    };
  }
  const source = claimedSources[0];
  if (
    claimedSources.length !== 1 ||
    source.sourceType !== "userAnswer" ||
    source.authority !== authority ||
    source.availability !== "current" ||
    source.label !== "User answer"
  ) {
    return {
      outcome: "blocked",
      issue: issue("userAnswerSourceInvalid", "Proposal human-answer provenance is ambiguous or malformed.", proposal.proposalId, "sourceIds")
    };
  }
  return { outcome: "resolved", source };
}

function validateInformationalRevisionLineage(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord,
  source: PlanningSourceReference,
  availability: Extract<PlanningSourceReference["availability"], "current" | "stale">
): PlanningClarificationDecisionContractIssue | null {
  const decision = resolveCanonicalUserAnswerDecision(planning, proposal, source);
  if (
    source.sourceType !== "userAnswer" ||
    source.authority !== "informational" ||
    source.availability !== availability ||
    source.label !== "User answer" ||
    !decision
  ) {
    return issue("userAnswerSourceInvalid", "Human-answer source does not use the canonical informational source contract.", proposal.proposalId, "sourceIds");
  }
  return source.sourceType === "userAnswer" &&
    source.authority === "informational" &&
    source.availability === availability &&
    source.label === "User answer" &&
    decision.action === "revise" &&
    decision.origin === "userAction" &&
    decision.resultingStatus === "Revised" &&
    Boolean(decision.value) &&
    sameValue(decision.value as PlanningProposalValue, proposal.value) &&
    decision.sourceIds?.includes(source.sourceId) === true
    ? null
    : issue("revisionHistoryInvalid", "Human-answer source does not prove a valid originating revision.", proposal.proposalId, "sourceIds");
}

function resolveCanonicalUserAnswerDecision(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord,
  source: PlanningSourceReference
): PlanningDecisionRecord | null {
  const matches = planning.decisions.filter((decision) =>
    decision.proposalId === proposal.proposalId &&
    buildPlanningUserAnswerLocator(proposal.proposalId, decision.decisionId) === source.locator
  );
  return matches.length === 1 ? matches[0] : null;
}

function resolveLastProposalDecision(
  proposal: PlanningProposalRecord,
  decisions: readonly PlanningDecisionRecord[]
): PlanningDecisionRecord | null {
  if (!proposal.lastDecisionId || decisions.length === 0) return null;
  const matches = decisions.filter((decision) => decision.decisionId === proposal.lastDecisionId);
  const lastDecision = decisions[decisions.length - 1];
  return matches.length === 1 && lastDecision?.decisionId === proposal.lastDecisionId
    ? lastDecision
    : null;
}

function claimedHumanAnswerSources(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningSourceReference[] {
  return resolveSourcesByIds(planning, proposal.sourceIds).filter((source) =>
    source.sourceType === "userAnswer" ||
    source.label === "User answer" ||
    source.locator.startsWith("planning:userAnswer:")
  );
}

function hasClaimedHumanAnswerSource(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): boolean {
  return claimedHumanAnswerSources(planning, proposal).length > 0;
}

function resolveSourcesByIds(
  planning: ProjectPlanningState,
  sourceIds: readonly string[]
): PlanningSourceReference[] {
  return sourceIds.flatMap((sourceId) => {
    const matches = planning.sources.filter((source) => source.sourceId === sourceId);
    return matches.length === 1 ? [matches[0]] : [];
  });
}

function validateProposalSourceResolution(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionContractIssue | null {
  return proposal.sourceIds.every((sourceId) =>
    planning.sources.filter((source) => source.sourceId === sourceId).length === 1
  )
    ? null
    : issue("userAnswerSourceInvalid", "Proposal evidence cannot be resolved exactly once.", proposal.proposalId, "sourceIds");
}

function sameOptionalSourceIds(
  sourceIds: readonly string[] | undefined,
  expected: readonly string[]
): boolean {
  return Boolean(sourceIds) && sameStringArray(sourceIds as readonly string[], expected);
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

function invalidAnswerIssue(
  proposal: PlanningProposalRecord,
  underlyingIssueCode?: string
): PlanningClarificationDecisionContractIssue {
  return issue(
    "invalidAnswerValue",
    "Clarification answer does not satisfy the exact registered schema.",
    proposal.proposalId,
    "value",
    underlyingIssueCode
  );
}

function isSupportedAction(input: unknown): input is PlanningClarificationHumanDecisionAction {
  return typeof input === "string" && (SUPPORTED_ACTIONS as readonly string[]).includes(input);
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
