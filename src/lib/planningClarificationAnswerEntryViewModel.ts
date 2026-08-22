import { analyzePlanningClarificationDecisionCapabilities } from "./planningClarificationDecisionContract";
import {
  getProductionPlanningClarificationAnswerSchema
} from "./planningClarificationAnswerSchemaRegistry";
import {
  normalizeProjectPlanningState,
  type ProjectPlanningState
} from "./planningProposals";
import type { PlanningClarificationAnswerSchema } from "./planningClarificationAnswerSchema";

export interface PlanningClarificationAnswerEntrySelectorInput {
  projectId: string;
  planning: ProjectPlanningState;
  proposalId: string;
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
    }
  | {
      state: "unavailable";
      proposalId?: string;
    };

export function selectPlanningClarificationAnswerEntry(
  input: PlanningClarificationAnswerEntrySelectorInput
): PlanningClarificationAnswerEntrySelection {
  const capabilities = analyzePlanningClarificationDecisionCapabilities(input);
  const revise = capabilities.capabilities.find((entry) => entry.action === "revise");

  if (revise?.state === "answerSchemaRequired" && revise.requiredInput === "answerSchema") {
    return withProposalId("schemaUnavailable", capabilities.proposalId);
  }

  if (revise?.state !== "inputRequired" || revise.requiredInput !== "answer" || !isPlainObject(input)) {
    return withProposalId("unavailable", capabilities.proposalId);
  }

  const normalized = normalizeProjectPlanningState(input.planning, input.projectId);
  if (normalized.issues.length > 0) {
    return withProposalId("unavailable", capabilities.proposalId);
  }

  const proposal = normalized.planning.proposals.find((entry) => entry.proposalId === input.proposalId);
  if (!proposal) {
    return withProposalId("unavailable", capabilities.proposalId);
  }

  const schema = getProductionPlanningClarificationAnswerSchema(proposal.ruleId, proposal.ruleVersion);
  if (!schema) {
    return { state: "schemaUnavailable", proposalId: proposal.proposalId };
  }

  return {
    state: "eligible",
    proposalId: proposal.proposalId,
    ruleId: proposal.ruleId,
    ruleVersion: proposal.ruleVersion,
    schema
  };
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

function withProposalId(
  state: "schemaUnavailable" | "unavailable",
  proposalId: string | undefined
): PlanningClarificationAnswerEntrySelection {
  return proposalId ? { state, proposalId } : { state };
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}
