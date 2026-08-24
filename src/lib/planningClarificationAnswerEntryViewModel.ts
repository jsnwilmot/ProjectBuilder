import { analyzePlanningClarificationDecisionCapabilities } from "./planningClarificationDecisionContract";
import {
  resolveProductionPlanningClarificationAnswerSchema,
  type PlanningClarificationAnswerSchemaContext,
  type PlanningClarificationAnswerSchemaResolutionReason
} from "./planningClarificationAnswerSchemaResolver";
import {
  normalizeProjectPlanningState,
  type PlanningDecisionRecord,
  type PlanningProposalStatus,
  type PlanningProposalValue,
  type ProjectPlanningState
} from "./planningProposals";
import {
  validatePlanningClarificationAnswer,
  type PlanningClarificationAnswerSchema
} from "./planningClarificationAnswerSchema";

export interface PlanningClarificationAnswerEntrySelectorInput {
  projectId: string;
  planning: ProjectPlanningState;
  proposalId: string;
  answerSchemaContext?: PlanningClarificationAnswerSchemaContext;
}

export type PlanningClarificationAnswerEntrySelection =
  | {
      state: "eligible";
      proposalId: string;
      ruleId: string;
      ruleVersion: string;
      schema: PlanningClarificationAnswerSchema;
    }
  | {
      state: "schemaUnavailable";
      proposalId?: string;
      reason: PlanningClarificationAnswerSchemaResolutionReason;
    }
  | {
      state: "unavailable";
      proposalId?: string;
    };

export type PlanningClarificationAnswerReviewSelection =
  | {
      state: "available";
      proposalId: string;
      status: Extract<PlanningProposalStatus, "Needs Clarification" | "Revised" | "Confirmed" | "Deferred">;
      ruleId: string;
      ruleVersion: string;
      schema: PlanningClarificationAnswerSchema;
      answer: PlanningProposalValue;
    }
  | {
      state: "schemaUnavailable";
      proposalId?: string;
      reason: PlanningClarificationAnswerSchemaResolutionReason;
    }
  | {
      state: "unavailable";
      proposalId?: string;
    };

export type PlanningClarificationDeferralSelection =
  | { state: "available"; reason: string }
  | { state: "unavailable" };

export function selectPlanningClarificationAnswerEntry(
  input: PlanningClarificationAnswerEntrySelectorInput
): PlanningClarificationAnswerEntrySelection {
  const capabilities = analyzePlanningClarificationDecisionCapabilities(input);
  const revise = capabilities.capabilities.find((entry) => entry.action === "revise");

  if (!isPlainObject(input)) return withProposalId("unavailable", capabilities.proposalId);
  const normalized = normalizeProjectPlanningState(input.planning, input.projectId);
  if (normalized.issues.length > 0) {
    return withProposalId("unavailable", capabilities.proposalId);
  }

  const proposal = normalized.planning.proposals.find((entry) => entry.proposalId === input.proposalId);
  if (!proposal) {
    return withProposalId("unavailable", capabilities.proposalId);
  }
  if (proposal.status !== "Needs Clarification") {
    return { state: "unavailable", proposalId: proposal.proposalId };
  }

  if (revise?.state === "answerSchemaRequired" && revise.requiredInput === "answerSchema") {
    const resolution = resolveProductionPlanningClarificationAnswerSchema(
      proposal.ruleId,
      proposal.ruleVersion,
      input.answerSchemaContext
    );
    return {
      state: "schemaUnavailable",
      proposalId: proposal.proposalId,
      reason: resolution.state === "unavailable" ? resolution.reason : "schemaNotRegistered"
    };
  }

  if (revise?.state !== "inputRequired" || revise.requiredInput !== "answer") {
    return { state: "unavailable", proposalId: proposal.proposalId };
  }

  const resolution = resolveProductionPlanningClarificationAnswerSchema(
    proposal.ruleId,
    proposal.ruleVersion,
    input.answerSchemaContext
  );
  if (resolution.state === "unavailable") {
    return { state: "schemaUnavailable", proposalId: proposal.proposalId, reason: resolution.reason };
  }

  return {
    state: "eligible",
    proposalId: proposal.proposalId,
    ruleId: proposal.ruleId,
    ruleVersion: proposal.ruleVersion,
    schema: resolution.schema
  };
}

export function selectPlanningClarificationAnswerReview(
  input: PlanningClarificationAnswerEntrySelectorInput
): PlanningClarificationAnswerReviewSelection {
  if (!isPlainObject(input)) return { state: "unavailable" };

  const normalized = normalizeProjectPlanningState(input.planning, input.projectId);
  if (normalized.issues.length > 0) return { state: "unavailable" };

  const proposal = normalized.planning.proposals.find((entry) => entry.proposalId === input.proposalId);
  if (!proposal || proposal.category !== "clarification") {
    return proposal ? { state: "unavailable", proposalId: proposal.proposalId } : { state: "unavailable" };
  }
  if (!hasProvenSavedAnswer(input, normalized.planning, proposal.status)) {
    return { state: "unavailable", proposalId: proposal.proposalId };
  }

  const resolution = resolveProductionPlanningClarificationAnswerSchema(
    proposal.ruleId,
    proposal.ruleVersion,
    input.answerSchemaContext
  );
  if (resolution.state === "unavailable") {
    return { state: "schemaUnavailable", proposalId: proposal.proposalId, reason: resolution.reason };
  }

  const validation = validatePlanningClarificationAnswer(resolution.schema, proposal.value);
  if (validation.outcome !== "valid") {
    return { state: "unavailable", proposalId: proposal.proposalId };
  }

  return {
    state: "available",
    proposalId: proposal.proposalId,
    status: proposal.status,
    ruleId: proposal.ruleId,
    ruleVersion: proposal.ruleVersion,
    schema: resolution.schema,
    answer: validation.answer
  };
}

export function selectPlanningClarificationDeferral(
  input: PlanningClarificationAnswerEntrySelectorInput
): PlanningClarificationDeferralSelection {
  if (!isPlainObject(input)) return { state: "unavailable" };
  const normalized = normalizeProjectPlanningState(input.planning, input.projectId);
  if (normalized.issues.length > 0) return { state: "unavailable" };

  const proposal = normalized.planning.proposals.find((entry) => entry.proposalId === input.proposalId);
  if (!proposal || proposal.category !== "clarification" || proposal.status !== "Deferred" || !proposal.lastDecisionId) {
    return { state: "unavailable" };
  }

  const proposalDecisions = normalized.planning.decisions.filter(
    (decision) => decision.proposalId === proposal.proposalId
  );
  const matching = proposalDecisions.filter((decision) => decision.decisionId === proposal.lastDecisionId);
  const decision = matching.length === 1 ? matching[0] : undefined;
  const reopen = analyzePlanningClarificationDecisionCapabilities(input).capabilities.find(
    (entry) => entry.action === "reopen"
  );
  if (
    !decision ||
    proposalDecisions.at(-1)?.decisionId !== decision.decisionId ||
    decision.action !== "defer" ||
    decision.origin !== "userAction" ||
    decision.resultingStatus !== "Deferred" ||
    decision.value !== undefined ||
    !isNonblankReason(decision.reason) ||
    !sameSourceIds(decision.sourceIds, proposal.sourceIds) ||
    reopen?.state !== "available" ||
    reopen.requiredInput !== "none"
  ) {
    return { state: "unavailable" };
  }

  return { state: "available", reason: decision.reason.trim() };
}

export function humanizePlanningClarificationEnumOption(option: string): string {
  return option
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function planningClarificationItemLabel(zeroBasedIndex: number): string {
  return Number.isInteger(zeroBasedIndex) && zeroBasedIndex >= 0
    ? `Item ${zeroBasedIndex + 1}`
    : "Item";
}

export function planningClarificationAnswerSchemaUnavailableMessage(
  reason: PlanningClarificationAnswerSchemaResolutionReason
): string {
  switch (reason) {
    case "backendSelectionRequired":
      return "Confirm a single backend/data-source type before answering this question.";
    case "backendTypeUnsupported":
      return "Project Builder does not yet have an approved answer form for the selected backend type.";
    case "mixedBackendUnsupported":
      return "Project Builder does not yet have an approved answer form for projects using multiple backend types.";
    default:
      return "This planning question does not yet have an approved answer form.";
  }
}

function withProposalId(
  state: "unavailable",
  proposalId: string | undefined
): PlanningClarificationAnswerEntrySelection {
  return proposalId ? { state, proposalId } : { state };
}

function hasProvenSavedAnswer(
  input: PlanningClarificationAnswerEntrySelectorInput,
  planning: ProjectPlanningState,
  status: PlanningProposalStatus
): status is Extract<PlanningProposalStatus, "Needs Clarification" | "Revised" | "Confirmed" | "Deferred"> {
  if (!(["Needs Clarification", "Revised", "Confirmed", "Deferred"] as const).includes(
    status as "Needs Clarification" | "Revised" | "Confirmed" | "Deferred"
  )) return false;

  const proposal = planning.proposals.find((entry) => entry.proposalId === input.proposalId);
  if (!proposal || !hasClaimedHumanSource(planning, proposal.sourceIds)) return false;
  const capabilities = analyzePlanningClarificationDecisionCapabilities(input).capabilities;
  const proofAction = status === "Confirmed" || status === "Needs Clarification" ? "revise" : "reopen";
  const capability = capabilities.find((entry) => entry.action === proofAction);
  return proofAction === "revise"
    ? capability?.state === "inputRequired" && capability.requiredInput === "answer"
    : capability?.state === "available" && capability.requiredInput === "none";
}

function hasClaimedHumanSource(planning: ProjectPlanningState, sourceIds: readonly string[]): boolean {
  return sourceIds.some((sourceId) => {
    const matches = planning.sources.filter((source) => source.sourceId === sourceId);
    const source = matches.length === 1 ? matches[0] : undefined;
    return Boolean(source && (
      source.sourceType === "userAnswer" ||
      source.label === "User answer" ||
      source.locator.startsWith("planning:userAnswer:")
    ));
  });
}

function isNonblankReason(reason: PlanningDecisionRecord["reason"]): reason is string {
  return typeof reason === "string" && reason.trim().length > 0;
}

function sameSourceIds(left: readonly string[] | undefined, right: readonly string[]): boolean {
  return Boolean(left) && left?.length === right.length && left.every((value, index) => value === right[index]);
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}
