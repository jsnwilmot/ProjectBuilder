import {
  analyzePlanningControlledApplyCandidate,
  type PlanningControlledApplyCandidateIssue
} from "./planningControlledApplyContract";
import { EMPTY_PROJECT_INTAKE } from "./createProject";
import { getProjectFieldValue } from "./projectFields";
import type { ProjectInputField, ProjectRecord } from "../types/project";

export interface PlanningControlledApplyProjectFieldDestinationInput {
  project: ProjectRecord;
  proposalId: string;
}

export type PlanningControlledApplyProjectFieldDestinationIssueCode =
  | "invalidInput"
  | "invalidProject"
  | "projectArchived"
  | "planningMissing"
  | "candidateBlocked"
  | "unsupportedProjectField"
  | "unsupportedSideEffectField"
  | "destinationConflict"
  | "destinationUnreadable";

export interface PlanningControlledApplyProjectFieldDestinationIssue {
  code: PlanningControlledApplyProjectFieldDestinationIssueCode;
  message: string;
  proposalId?: string;
  fieldKey?: string;
  candidateIssues?: readonly PlanningControlledApplyCandidateIssue[];
}

export interface PlanningControlledApplyProjectFieldDestinationPlan {
  projectId: string;
  proposalId: string;
  decisionId: string;
  fieldKey: ProjectInputField;
  desiredValue: string;
  expectedCurrentValue: string;
  sourceIds: readonly string[];
  writeAuthorized: false;
  readinessEligible: false;
  outputEligible: false;
}

export type PlanningControlledApplyProjectFieldDestinationResult =
  | {
      outcome: "ready" | "unchanged";
      issues: readonly [];
      plan: PlanningControlledApplyProjectFieldDestinationPlan;
    }
  | {
      outcome: "blocked";
      issues: readonly PlanningControlledApplyProjectFieldDestinationIssue[];
      plan?: undefined;
    };

const clientFieldKeys = new Set<string>(["clientName", "businessName"]);
const unsupportedSideEffectFields = new Set<string>(["appType"]);

export function analyzePlanningControlledApplyProjectFieldDestination(
  input: unknown
): PlanningControlledApplyProjectFieldDestinationResult {
  if (!isPlainObject(input)) {
    return blocked([issue("invalidInput", "Controlled-apply destination input must be an object.")]);
  }

  const project = input.project;
  if (!isProjectRecordLike(project)) {
    return blocked([issue("invalidProject", "Destination validation requires a current project record.")]);
  }

  const proposalId = typeof input.proposalId === "string" ? input.proposalId : undefined;
  if (!proposalId) {
    return blocked([issue("invalidInput", "Destination validation requires a proposal ID.", undefined, undefined)]);
  }

  if (project.archivedAt !== null) {
    return blocked([issue("projectArchived", "Archived projects cannot be prepared for controlled apply.", proposalId)]);
  }

  if (project.planning === undefined) {
    return blocked([issue("planningMissing", "Destination validation requires existing project planning.", proposalId)]);
  }

  const candidate = analyzePlanningControlledApplyCandidate({
    projectId: project.identity.id,
    planning: project.planning,
    proposalId
  });
  if (candidate.outcome === "blocked") {
    return blocked([
      issue(
        "candidateBlocked",
        "Controlled-apply candidate validation blocked before destination validation.",
        proposalId,
        undefined,
        cloneCandidateIssues(candidate.issues)
      )
    ]);
  }

  const fieldKey = candidate.plan.target.fieldKey;
  if (!fieldKey || typeof fieldKey !== "string") {
    return blocked([issue("unsupportedProjectField", "Candidate fieldKey is not a supported project field.", proposalId)]);
  }
  if (unsupportedSideEffectFields.has(fieldKey)) {
    return blocked([issue("unsupportedSideEffectField", "Candidate fieldKey has side-effecting project-field behavior and is not supported by this contract.", proposalId, fieldKey)]);
  }
  if (!isSupportedProjectInputField(fieldKey)) {
    return blocked([issue("unsupportedProjectField", "Candidate fieldKey is not a supported project field.", proposalId, fieldKey)]);
  }

  const currentValue = getProjectFieldValue(project, fieldKey);
  if (typeof currentValue !== "string") {
    return blocked([issue("destinationUnreadable", "Destination value is not readable as a string.", proposalId, fieldKey)]);
  }

  const desiredValue = candidate.plan.value.value;
  const plan: PlanningControlledApplyProjectFieldDestinationPlan = {
    projectId: candidate.plan.projectId,
    proposalId: candidate.plan.proposalId,
    decisionId: candidate.plan.decisionId,
    fieldKey,
    desiredValue,
    expectedCurrentValue: currentValue,
    sourceIds: [...candidate.plan.sourceIds],
    writeAuthorized: false,
    readinessEligible: false,
    outputEligible: false
  };

  if (currentValue === desiredValue) {
    return { outcome: "unchanged", issues: [], plan };
  }
  if (currentValue.trim().length === 0) {
    return { outcome: "ready", issues: [], plan };
  }

  return blocked([issue("destinationConflict", "Destination already contains a meaningful value that differs from the candidate value.", proposalId, fieldKey)]);
}

function isSupportedProjectInputField(fieldKey: string): fieldKey is ProjectInputField {
  return fieldKey === "appName" ||
    clientFieldKeys.has(fieldKey) ||
    Object.prototype.hasOwnProperty.call(EMPTY_PROJECT_INTAKE, fieldKey);
}

function cloneCandidateIssues(
  issues: readonly PlanningControlledApplyCandidateIssue[]
): readonly PlanningControlledApplyCandidateIssue[] {
  return issues.map((candidateIssue) => ({ ...candidateIssue }));
}

function blocked(
  issues: readonly PlanningControlledApplyProjectFieldDestinationIssue[]
): PlanningControlledApplyProjectFieldDestinationResult {
  return { outcome: "blocked", issues };
}

function issue(
  code: PlanningControlledApplyProjectFieldDestinationIssueCode,
  message: string,
  proposalId?: string,
  fieldKey?: string,
  candidateIssues?: readonly PlanningControlledApplyCandidateIssue[]
): PlanningControlledApplyProjectFieldDestinationIssue {
  return {
    code,
    message,
    ...(proposalId !== undefined ? { proposalId } : {}),
    ...(fieldKey !== undefined ? { fieldKey } : {}),
    ...(candidateIssues !== undefined ? { candidateIssues } : {})
  };
}

function isProjectRecordLike(input: unknown): input is ProjectRecord {
  if (!isPlainObject(input)) {
    return false;
  }
  return isPlainObject(input.identity) &&
    typeof input.identity.id === "string" &&
    isPlainObject(input.client) &&
    isPlainObject(input.intake) &&
    Object.prototype.hasOwnProperty.call(input, "archivedAt");
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}
