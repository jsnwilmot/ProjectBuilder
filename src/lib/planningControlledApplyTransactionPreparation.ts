import {
  analyzePlanningControlledApplyProjectFieldDestination,
  type PlanningControlledApplyProjectFieldDestinationIssue
} from "./planningControlledApplyDestinationContract";
import {
  CONTROLLED_APPLY_HISTORY_RECORD_LIMIT,
  normalizePlanningControlledApplyHistory,
  type PlanningControlledApplyHistoryIssue,
  type PlanningControlledApplyHistoryOutcome,
  type PlanningControlledApplyHistoryRecord
} from "./planningControlledApplyHistory";
import type { ProjectInputField, ProjectRecord } from "../types/project";

export interface PlanningControlledApplyTransactionPreparationInput {
  project: ProjectRecord;
  proposalId: string;
}

export type PlanningControlledApplyTransactionPreparationIssueCode =
  | "invalidInput"
  | "destinationBlocked"
  | "invalidHistory"
  | "historyValueMismatch"
  | "destinationDriftAfterApply"
  | "historyCapacityReached"
  | "projectSnapshotUnavailable";

export interface PlanningControlledApplyTransactionPreparationIssue {
  code: PlanningControlledApplyTransactionPreparationIssueCode;
  message: string;
  proposalId?: string;
  decisionId?: string;
  fieldKey?: string;
  destinationIssues?: readonly PlanningControlledApplyProjectFieldDestinationIssue[];
  historyIssues?: readonly PlanningControlledApplyHistoryIssue[];
  existingApplyId?: string;
}

interface BasePlanningControlledApplyTransactionPlan {
  projectId: string;
  proposalId: string;
  decisionId: string;
  fieldKey: ProjectInputField;
  desiredValue: string;
  expectedCurrentValue: string;
  sourceIds: readonly string[];
  expectedProjectSnapshot: string;
  destinationMutationRequired: boolean;
  historyAppendRequired: boolean;
  writeAuthorized: false;
  readinessEligible: false;
  outputEligible: false;
}

export interface ReadyPlanningControlledApplyTransactionPlan extends BasePlanningControlledApplyTransactionPlan {
  previousValue: string;
  appliedValue: string;
  historyOutcome: PlanningControlledApplyHistoryOutcome;
}

export interface AlreadyAppliedPlanningControlledApplyTransactionPlan extends BasePlanningControlledApplyTransactionPlan {
  existingApplyId: string;
  destinationMutationRequired: false;
  historyAppendRequired: false;
}

export type PlanningControlledApplyTransactionPreparationResult =
  | {
      outcome: "ready";
      issues: readonly [];
      plan: ReadyPlanningControlledApplyTransactionPlan;
    }
  | {
      outcome: "alreadyApplied";
      issues: readonly [];
      plan: AlreadyAppliedPlanningControlledApplyTransactionPlan;
    }
  | {
      outcome: "blocked";
      issues: readonly PlanningControlledApplyTransactionPreparationIssue[];
      plan?: undefined;
    };

const inputFields = new Set<string>(["project", "proposalId"]);

export function preparePlanningControlledApplyTransaction(
  input: unknown
): PlanningControlledApplyTransactionPreparationResult {
  if (!isPlainObject(input)) {
    return blocked([issue("invalidInput", "Controlled-apply transaction preparation input must be an object.")]);
  }

  const extraKey = Object.keys(input).find((key) => !inputFields.has(key));
  if (extraKey) {
    return blocked([issue("invalidInput", "Controlled-apply transaction preparation received an unsupported input field.")]);
  }

  if (!isProjectRecordLike(input.project)) {
    return blocked([issue("invalidInput", "Controlled-apply transaction preparation requires a current project record.")]);
  }

  const proposalId = typeof input.proposalId === "string" ? input.proposalId : undefined;
  if (!proposalId) {
    return blocked([issue("invalidInput", "Controlled-apply transaction preparation requires a proposal ID.")]);
  }

  const expectedProjectSnapshot = serializeProjectSnapshot(input.project);
  if (expectedProjectSnapshot === null) {
    return blocked([issue("projectSnapshotUnavailable", "The supplied project record cannot be serialized into a deterministic expected-project snapshot.", proposalId)]);
  }

  const destination = analyzePlanningControlledApplyProjectFieldDestination({
    project: input.project,
    proposalId
  });

  if (destination.outcome === "blocked") {
    return blocked([
      issue(
        "destinationBlocked",
        "Controlled-apply transaction preparation is blocked by the live project-field destination contract.",
        proposalId,
        undefined,
        undefined,
        cloneDestinationIssues(destination.issues)
      )
    ]);
  }

  const historyResult = normalizePlanningControlledApplyHistory({
    projectId: destination.plan.projectId,
    planning: input.project.planning,
    history: input.project.controlledApplyHistory
  });

  if (historyResult.outcome === "invalid") {
    return blocked([
      issue(
        "invalidHistory",
        "Controlled-apply transaction preparation is blocked because persisted apply history is invalid.",
        destination.plan.proposalId,
        destination.plan.decisionId,
        destination.plan.fieldKey,
        undefined,
        cloneHistoryIssues(historyResult.issues)
      )
    ]);
  }

  const matchingRecord = historyResult.history.find((record) => hasSameSemanticIdentity(record, {
    projectId: destination.plan.projectId,
    proposalId: destination.plan.proposalId,
    decisionId: destination.plan.decisionId,
    fieldKey: destination.plan.fieldKey
  }));

  if (matchingRecord) {
    if (matchingRecord.appliedValue !== destination.plan.desiredValue) {
      return blocked([
        issue(
          "historyValueMismatch",
          "Existing controlled-apply history for this semantic identity has a different applied value.",
          destination.plan.proposalId,
          destination.plan.decisionId,
          destination.plan.fieldKey,
          undefined,
          undefined,
          matchingRecord.applyId
        )
      ]);
    }

    if (destination.outcome === "ready") {
      return blocked([
        issue(
          "destinationDriftAfterApply",
          "Existing controlled-apply history matches the desired value, but the current destination has drifted away from that applied value.",
          destination.plan.proposalId,
          destination.plan.decisionId,
          destination.plan.fieldKey,
          undefined,
          undefined,
          matchingRecord.applyId
        )
      ]);
    }

    return {
      outcome: "alreadyApplied",
      issues: [],
      plan: {
        projectId: destination.plan.projectId,
        proposalId: destination.plan.proposalId,
        decisionId: destination.plan.decisionId,
        fieldKey: destination.plan.fieldKey,
        desiredValue: destination.plan.desiredValue,
        expectedCurrentValue: destination.plan.expectedCurrentValue,
        existingApplyId: matchingRecord.applyId,
        sourceIds: [...destination.plan.sourceIds],
        expectedProjectSnapshot,
        destinationMutationRequired: false,
        historyAppendRequired: false,
        writeAuthorized: false,
        readinessEligible: false,
        outputEligible: false
      }
    };
  }

  if (historyResult.history.length >= CONTROLLED_APPLY_HISTORY_RECORD_LIMIT) {
    return blocked([
      issue(
        "historyCapacityReached",
        "Controlled-apply transaction preparation cannot append because history is already at the approved 1000-record cap.",
        destination.plan.proposalId,
        destination.plan.decisionId,
        destination.plan.fieldKey
      )
    ]);
  }

  const historyOutcome: PlanningControlledApplyHistoryOutcome = destination.outcome === "ready" ? "changed" : "unchanged";

  return {
    outcome: "ready",
    issues: [],
    plan: {
      projectId: destination.plan.projectId,
      proposalId: destination.plan.proposalId,
      decisionId: destination.plan.decisionId,
      fieldKey: destination.plan.fieldKey,
      desiredValue: destination.plan.desiredValue,
      expectedCurrentValue: destination.plan.expectedCurrentValue,
      previousValue: destination.plan.expectedCurrentValue,
      appliedValue: destination.plan.desiredValue,
      sourceIds: [...destination.plan.sourceIds],
      expectedProjectSnapshot,
      historyOutcome,
      destinationMutationRequired: destination.outcome === "ready",
      historyAppendRequired: true,
      writeAuthorized: false,
      readinessEligible: false,
      outputEligible: false
    }
  };
}

function hasSameSemanticIdentity(
  record: PlanningControlledApplyHistoryRecord,
  identity: {
    projectId: string;
    proposalId: string;
    decisionId: string;
    fieldKey: ProjectInputField;
  }
): boolean {
  return record.projectId === identity.projectId &&
    record.proposalId === identity.proposalId &&
    record.decisionId === identity.decisionId &&
    record.fieldKey === identity.fieldKey;
}

function serializeProjectSnapshot(project: ProjectRecord): string | null {
  try {
    return JSON.stringify(project);
  } catch {
    return null;
  }
}

function cloneDestinationIssues(
  issues: readonly PlanningControlledApplyProjectFieldDestinationIssue[]
): readonly PlanningControlledApplyProjectFieldDestinationIssue[] {
  return issues.map((entry) => ({
    ...entry,
    candidateIssues: entry.candidateIssues?.map((candidateIssue) => ({ ...candidateIssue }))
  }));
}

function cloneHistoryIssues(
  issues: readonly PlanningControlledApplyHistoryIssue[]
): readonly PlanningControlledApplyHistoryIssue[] {
  return issues.map((entry) => ({ ...entry }));
}

function issue(
  code: PlanningControlledApplyTransactionPreparationIssueCode,
  message: string,
  proposalId?: string,
  decisionId?: string,
  fieldKey?: string,
  destinationIssues?: readonly PlanningControlledApplyProjectFieldDestinationIssue[],
  historyIssues?: readonly PlanningControlledApplyHistoryIssue[],
  existingApplyId?: string
): PlanningControlledApplyTransactionPreparationIssue {
  return dropUndefined({
    code,
    message,
    proposalId,
    decisionId,
    fieldKey,
    destinationIssues,
    historyIssues,
    existingApplyId
  });
}

function blocked(
  issues: readonly PlanningControlledApplyTransactionPreparationIssue[]
): PlanningControlledApplyTransactionPreparationResult {
  return {
    outcome: "blocked",
    issues
  };
}

function isProjectRecordLike(input: unknown): input is ProjectRecord {
  return isPlainObject(input) &&
    isPlainObject(input.identity) &&
    typeof input.identity.id === "string" &&
    Array.isArray(input.controlledApplyHistory);
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
