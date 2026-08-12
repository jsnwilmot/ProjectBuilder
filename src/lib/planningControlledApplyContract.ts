import {
  PLANNING_RULE_SET_VERSION,
  normalizeProjectPlanningState,
  type PlanningConflictRecord,
  type PlanningDependencyRecord,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type PlanningTargetReference,
  type PlanningTextValue,
  type ProjectPlanningState
} from "./planningProposals";

export interface PlanningControlledApplyCandidateInput {
  projectId: string;
  planning: ProjectPlanningState;
  proposalId: string;
}

export type PlanningControlledApplyCandidateIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "invalidProposalId"
  | "invalidPlanning"
  | "proposalNotFound"
  | "proposalNotConfirmed"
  | "unsupportedTargetKind"
  | "unsupportedTargetOperation"
  | "missingFieldKey"
  | "targetKeyFieldMismatch"
  | "targetEntityNotSupported"
  | "unsupportedValueKind"
  | "unsupportedCategory"
  | "unsupportedRestriction"
  | "uncertaintyNotKnown"
  | "confirmationDecisionMissing"
  | "confirmationDecisionInvalid"
  | "decisionSourceBindingMismatch"
  | "sourceMissing"
  | "sourceNotCurrent"
  | "insufficientSourceAuthority"
  | "alternativeGroupNotSupported"
  | "openConflict"
  | "dependencyNotSupported";

export interface PlanningControlledApplyCandidateIssue {
  code: PlanningControlledApplyCandidateIssueCode;
  message: string;
  proposalId?: string;
  decisionId?: string;
  sourceId?: string;
  field?: string;
}

export interface PlanningControlledApplyCandidatePlan {
  projectId: string;
  proposalId: string;
  decisionId: string;
  target: PlanningTargetReference;
  value: PlanningTextValue;
  sourceIds: readonly string[];
  writeAuthorized: false;
  readinessEligible: false;
  outputEligible: false;
}

export type PlanningControlledApplyCandidateResult =
  | {
      outcome: "candidate";
      plan: PlanningControlledApplyCandidatePlan;
      issues: readonly [];
    }
  | {
      outcome: "blocked";
      issues: readonly PlanningControlledApplyCandidateIssue[];
      plan?: undefined;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PROJECT_ID_LIMIT = 200;

const ELIGIBLE_CATEGORIES = new Set<PlanningProposalRecord["category"]>([
  "userFact",
  "approvedConstraint",
  "architectProposal"
]);

export function analyzePlanningControlledApplyCandidate(input: unknown): PlanningControlledApplyCandidateResult {
  if (!isPlainObject(input)) {
    return blocked([issue("invalidInput", "Controlled-apply candidate input must be an object.")]);
  }

  const projectId = normalizeProjectId(input.projectId);
  if (!projectId) {
    return blocked([issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId")]);
  }

  const proposalId = normalizeProposalId(input.proposalId);
  if (!proposalId) {
    return blocked([issue("invalidProposalId", "Proposal ID must be a canonical UUID.", undefined, undefined, undefined, "proposalId")]);
  }

  const normalized = normalizeProjectPlanningState(input.planning, projectId);
  if (normalized.issues.length > 0) {
    return blocked([issue("invalidPlanning", "Planning normalization failed; controlled-apply candidate analysis is closed.", proposalId, undefined, undefined, "planning")]);
  }

  const proposal = normalized.planning.proposals.find((candidate) => candidate.proposalId === proposalId);
  if (!proposal) {
    return blocked([issue("proposalNotFound", "Proposal was not found.", proposalId, undefined, undefined, "proposalId")]);
  }

  const proposalIssue = validateProposalShape(proposal);
  if (proposalIssue) {
    return blocked([proposalIssue]);
  }

  const decision = findConfirmingDecision(normalized.planning, proposal);
  if (!decision) {
    return blocked([issue("confirmationDecisionMissing", "Confirmed proposal must reference exactly one confirming decision.", proposal.proposalId, proposal.lastDecisionId, undefined, "lastDecisionId")]);
  }

  const decisionIssue = validateConfirmingDecision(decision, proposal, projectId);
  if (decisionIssue) {
    return blocked([decisionIssue]);
  }

  const sourceIssue = validateCurrentSources(normalized.planning, proposal);
  if (sourceIssue) {
    return blocked([sourceIssue]);
  }

  if (proposal.alternativeGroupId) {
    return blocked([issue("alternativeGroupNotSupported", "Alternative groups are not supported by the initial controlled-apply candidate contract.", proposal.proposalId, undefined, undefined, "alternativeGroupId")]);
  }

  const conflict = normalized.planning.conflicts.find((candidate) => conflictInvolvesProposal(candidate, proposal));
  if (conflict) {
    return blocked([issue("openConflict", "Open conflicts involving the proposal block controlled-apply candidate eligibility.", proposal.proposalId, undefined, undefined, "conflicts")]);
  }

  const dependency = normalized.planning.dependencies.find((candidate) => dependencyInvolvesProposal(candidate, proposal.proposalId));
  if (dependency) {
    return blocked([issue("dependencyNotSupported", "Planning dependencies involving the proposal block controlled-apply candidate eligibility.", proposal.proposalId, undefined, undefined, "dependencies")]);
  }

  return {
    outcome: "candidate",
    issues: [],
    plan: {
      projectId,
      proposalId: proposal.proposalId,
      decisionId: decision.decisionId,
      target: cloneTarget(proposal.target),
      value: cloneTextValue(proposal.value as PlanningTextValue),
      sourceIds: [...proposal.sourceIds],
      writeAuthorized: false,
      readinessEligible: false,
      outputEligible: false
    }
  };
}

function validateProposalShape(proposal: PlanningProposalRecord): PlanningControlledApplyCandidateIssue | null {
  if (proposal.status !== "Confirmed") {
    return issue("proposalNotConfirmed", "Only Confirmed planning proposals can become controlled-apply candidates.", proposal.proposalId, undefined, undefined, "status");
  }
  if (proposal.target.kind !== "projectField") {
    return issue("unsupportedTargetKind", "Initial controlled-apply candidates must target projectField.", proposal.proposalId, undefined, undefined, "target.kind");
  }
  if (proposal.target.operation !== "setValue") {
    return issue("unsupportedTargetOperation", "Initial controlled-apply candidates must use setValue.", proposal.proposalId, undefined, undefined, "target.operation");
  }
  if (!proposal.target.fieldKey) {
    return issue("missingFieldKey", "Project-field candidates must include fieldKey.", proposal.proposalId, undefined, undefined, "target.fieldKey");
  }
  if (proposal.target.targetKey !== proposal.target.fieldKey) {
    return issue("targetKeyFieldMismatch", "Project-field candidates must have targetKey equal fieldKey.", proposal.proposalId, undefined, undefined, "target.targetKey");
  }
  if (proposal.target.entityId !== undefined) {
    return issue("targetEntityNotSupported", "Project-field candidates cannot include entityId.", proposal.proposalId, undefined, undefined, "target.entityId");
  }
  if (proposal.value.kind !== "text") {
    return issue("unsupportedValueKind", "Initial controlled-apply candidates must carry text values.", proposal.proposalId, undefined, undefined, "value.kind");
  }
  if (!ELIGIBLE_CATEGORIES.has(proposal.category)) {
    return issue("unsupportedCategory", "Proposal category is not eligible for controlled-apply candidate analysis.", proposal.proposalId, undefined, undefined, "category");
  }
  if (proposal.restriction !== "concreteProposalAllowed") {
    return issue("unsupportedRestriction", "Proposal restriction must be concreteProposalAllowed.", proposal.proposalId, undefined, undefined, "restriction");
  }
  if (proposal.uncertainty !== "Known") {
    return issue("uncertaintyNotKnown", "Proposal uncertainty must be Known.", proposal.proposalId, undefined, undefined, "uncertainty");
  }
  if (!proposal.lastDecisionId) {
    return issue("confirmationDecisionMissing", "Confirmed proposal must include lastDecisionId.", proposal.proposalId, undefined, undefined, "lastDecisionId");
  }
  return null;
}

function findConfirmingDecision(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningDecisionRecord | null {
  const matches = planning.decisions.filter((decision) => decision.decisionId === proposal.lastDecisionId);
  return matches.length === 1 ? matches[0] : null;
}

function validateConfirmingDecision(
  decision: PlanningDecisionRecord,
  proposal: PlanningProposalRecord,
  projectId: string
): PlanningControlledApplyCandidateIssue | null {
  if (
    decision.proposalId !== proposal.proposalId ||
    decision.projectId !== projectId ||
    decision.action !== "confirm" ||
    decision.resultingStatus !== "Confirmed" ||
    decision.origin !== "userAction" ||
    decision.ruleSetVersion !== PLANNING_RULE_SET_VERSION
  ) {
    return issue("confirmationDecisionInvalid", "Referenced decision is not the required current user confirmation.", proposal.proposalId, decision.decisionId, undefined, "lastDecisionId");
  }
  if (!sameStringArray(decision.sourceIds ?? [], proposal.sourceIds)) {
    return issue("decisionSourceBindingMismatch", "Confirming decision source IDs must exactly match proposal source IDs.", proposal.proposalId, decision.decisionId, undefined, "sourceIds");
  }
  return null;
}

function validateCurrentSources(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningControlledApplyCandidateIssue | null {
  let hasAuthoritativeSource = false;
  for (const sourceId of proposal.sourceIds) {
    const matches = planning.sources.filter((source) => source.sourceId === sourceId);
    const source = matches[0];
    if (matches.length !== 1 || !source) {
      return issue("sourceMissing", "Proposal source ID must resolve to exactly one planning source.", proposal.proposalId, undefined, sourceId, "sourceIds");
    }
    if (source.availability !== "current") {
      return issue("sourceNotCurrent", "Proposal source must be current.", proposal.proposalId, undefined, source.sourceId, "sourceIds");
    }
    if (sourceHasEvidenceAuthority(source)) {
      hasAuthoritativeSource = true;
    }
  }
  if (!hasAuthoritativeSource) {
    return issue("insufficientSourceAuthority", "At least one current proposal source must be confirmed or approved.", proposal.proposalId, undefined, undefined, "sourceIds");
  }
  return null;
}

function sourceHasEvidenceAuthority(source: PlanningSourceReference): boolean {
  return source.authority === "confirmed" || source.authority === "approved";
}

function conflictInvolvesProposal(conflict: PlanningConflictRecord, proposal: PlanningProposalRecord): boolean {
  if (conflict.status !== "open") {
    return false;
  }
  if ((proposal.conflictIds ?? []).includes(conflict.conflictId)) {
    return true;
  }
  return conflict.involvedReferences.some((reference) =>
    reference.kind === "proposalId" && reference.proposalId === proposal.proposalId
  ) || (conflict.affectedProposalIds ?? []).includes(proposal.proposalId);
}

function dependencyInvolvesProposal(dependency: PlanningDependencyRecord, proposalId: string): boolean {
  return dependency.sourceProposalId === proposalId ||
    (dependency.target.kind === "proposalId" && dependency.target.proposalId === proposalId);
}

function blocked(issues: readonly PlanningControlledApplyCandidateIssue[]): PlanningControlledApplyCandidateResult {
  return { outcome: "blocked", issues };
}

function issue(
  code: PlanningControlledApplyCandidateIssueCode,
  message: string,
  proposalId?: string,
  decisionId?: string,
  sourceId?: string,
  field?: string
): PlanningControlledApplyCandidateIssue {
  return { code, message, proposalId, decisionId, sourceId, field };
}

function cloneTarget(target: PlanningTargetReference): PlanningTargetReference {
  return { ...target };
}

function cloneTextValue(value: PlanningTextValue): PlanningTextValue {
  return { kind: "text", value: value.value };
}

function normalizeProjectId(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value && value.length <= PROJECT_ID_LIMIT && !/[\r\n]/.test(value) ? value : null;
}

function normalizeProposalId(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value === input && value === value.toLowerCase() && UUID_PATTERN.test(value) ? value : null;
}

function sameStringArray(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
