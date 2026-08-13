import {
  preparePlanningControlledApplyTransaction,
  type PlanningControlledApplyTransactionPreparationIssue,
  type ReadyPlanningControlledApplyTransactionPlan
} from "./planningControlledApplyTransactionPreparation";
import {
  CONTROLLED_APPLY_HISTORY_RECORD_LIMIT,
  CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
  normalizePlanningControlledApplyHistory,
  type PlanningControlledApplyHistoryIssue,
  type PlanningControlledApplyHistoryRecord
} from "./planningControlledApplyHistory";
import type { ProjectInputField, ProjectRecord } from "../types/project";

export interface PlanningControlledApplyTransactionFinalizationInput {
  project: ProjectRecord;
  proposalId: string;
}

export interface PlanningControlledApplyTransactionFinalizationRuntime {
  now?: () => string;
  uuid?: () => string;
}

export type PlanningControlledApplyTransactionFinalizationIssueCode =
  | "invalidInput"
  | "preparationBlocked"
  | "invalidPreparation"
  | "timestampUnavailable"
  | "invalidTimestamp"
  | "uuidUnavailable"
  | "invalidUuid"
  | "duplicateUuid"
  | "historyCapacityReached"
  | "invalidCandidateHistory"
  | "historyNormalizationMismatch";

export interface PlanningControlledApplyTransactionFinalizationIssue {
  code: PlanningControlledApplyTransactionFinalizationIssueCode;
  message: string;
  proposalId?: string;
  decisionId?: string;
  fieldKey?: string;
  generatedValue?: string;
  preparationIssues?: readonly PlanningControlledApplyTransactionPreparationIssue[];
  historyIssues?: readonly PlanningControlledApplyHistoryIssue[];
}

interface BasePlanningControlledApplyFinalizationEvidence {
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

export interface FinalizedPlanningControlledApplyTransactionEvidence
  extends BasePlanningControlledApplyFinalizationEvidence {
  previousValue: string;
  appliedValue: string;
  historyOutcome: PlanningControlledApplyHistoryRecord["outcome"];
  applyId: string;
  appliedAt: string;
  candidateRecord: PlanningControlledApplyHistoryRecord;
  candidateHistory: readonly PlanningControlledApplyHistoryRecord[];
}

export interface AlreadyAppliedPlanningControlledApplyTransactionEvidence
  extends BasePlanningControlledApplyFinalizationEvidence {
  existingApplyId: string;
  destinationMutationRequired: false;
  historyAppendRequired: false;
}

export type PlanningControlledApplyTransactionFinalizationResult =
  | {
      outcome: "finalized";
      issues: readonly [];
      evidence: FinalizedPlanningControlledApplyTransactionEvidence;
    }
  | {
      outcome: "alreadyApplied";
      issues: readonly [];
      evidence: AlreadyAppliedPlanningControlledApplyTransactionEvidence;
    }
  | {
      outcome: "blocked";
      issues: readonly PlanningControlledApplyTransactionFinalizationIssue[];
      evidence?: undefined;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;
const inputFields = new Set<string>(["project", "proposalId"]);
const runtimeFields = new Set<string>(["now", "uuid"]);

export function finalizePlanningControlledApplyTransaction(
  input: unknown,
  runtime: PlanningControlledApplyTransactionFinalizationRuntime = {}
): PlanningControlledApplyTransactionFinalizationResult {
  const inputIssue = validateInput(input, runtime);
  if (inputIssue) return blocked([inputIssue]);

  const typedInput = input as PlanningControlledApplyTransactionFinalizationInput;
  const preparation = preparePlanningControlledApplyTransaction(typedInput);
  if (preparation.outcome === "blocked") {
    return blocked([
      issue(
        "preparationBlocked",
        "Controlled-apply transaction finalization is blocked by transaction preparation.",
        typedInput.proposalId,
        undefined,
        undefined,
        undefined,
        clonePreparationIssues(preparation.issues)
      )
    ]);
  }

  if (preparation.outcome === "alreadyApplied") {
    return {
      outcome: "alreadyApplied",
      issues: [],
      evidence: {
        projectId: preparation.plan.projectId,
        proposalId: preparation.plan.proposalId,
        decisionId: preparation.plan.decisionId,
        fieldKey: preparation.plan.fieldKey,
        desiredValue: preparation.plan.desiredValue,
        expectedCurrentValue: preparation.plan.expectedCurrentValue,
        existingApplyId: preparation.plan.existingApplyId,
        sourceIds: [...preparation.plan.sourceIds],
        expectedProjectSnapshot: preparation.plan.expectedProjectSnapshot,
        destinationMutationRequired: false,
        historyAppendRequired: false,
        writeAuthorized: false,
        readinessEligible: false,
        outputEligible: false
      }
    };
  }

  const preparationIssue = validateReadyPreparation(preparation.plan, typedInput);
  if (preparationIssue) return blocked([preparationIssue]);

  const appliedAtResult = allocateAppliedAt(runtime);
  if (appliedAtResult.issue) return blocked([appliedAtResult.issue]);
  const appliedAt = appliedAtResult.value as string;

  const applyIdResult = allocateApplyId(runtime);
  if (applyIdResult.issue) return blocked([applyIdResult.issue]);
  const applyId = applyIdResult.value as string;
  if (typedInput.project.controlledApplyHistory.some((record) => record.applyId === applyId)) {
    return blocked([
      issue(
        "duplicateUuid",
        "Generated apply UUID must be unique within the current project's controlled-apply history.",
        preparation.plan.proposalId,
        preparation.plan.decisionId,
        preparation.plan.fieldKey,
        applyId
      )
    ]);
  }

  const existingHistory = normalizePlanningControlledApplyHistory({
    projectId: preparation.plan.projectId,
    planning: typedInput.project.planning,
    history: typedInput.project.controlledApplyHistory
  });
  if (existingHistory.outcome === "invalid") {
    return blocked([
      issue(
        "invalidCandidateHistory",
        "Existing controlled-apply history became invalid before finalization evidence was constructed.",
        preparation.plan.proposalId,
        preparation.plan.decisionId,
        preparation.plan.fieldKey,
        undefined,
        undefined,
        cloneHistoryIssues(existingHistory.issues)
      )
    ]);
  }

  if (existingHistory.history.length + 1 > CONTROLLED_APPLY_HISTORY_RECORD_LIMIT) {
    return blocked([
      issue(
        "historyCapacityReached",
        "Candidate controlled-apply history would exceed the approved 1000-record cap.",
        preparation.plan.proposalId,
        preparation.plan.decisionId,
        preparation.plan.fieldKey
      )
    ]);
  }

  const candidateRecord = buildCandidateRecord(preparation.plan, applyId, appliedAt);
  const candidateHistory = [
    ...existingHistory.history.map(cloneHistoryRecord),
    cloneHistoryRecord(candidateRecord)
  ];
  const normalizedCandidate = normalizePlanningControlledApplyHistory({
    projectId: preparation.plan.projectId,
    planning: typedInput.project.planning,
    history: candidateHistory
  });
  if (normalizedCandidate.outcome === "invalid") {
    return blocked([
      issue(
        "invalidCandidateHistory",
        "Candidate controlled-apply history failed complete history validation.",
        preparation.plan.proposalId,
        preparation.plan.decisionId,
        preparation.plan.fieldKey,
        undefined,
        undefined,
        cloneHistoryIssues(normalizedCandidate.issues)
      )
    ]);
  }

  if (!structurallyEquivalent(candidateHistory, normalizedCandidate.history)) {
    return blocked([
      issue(
        "historyNormalizationMismatch",
        "Candidate controlled-apply history changed during normalization and cannot be trusted.",
        preparation.plan.proposalId,
        preparation.plan.decisionId,
        preparation.plan.fieldKey
      )
    ]);
  }

  return {
    outcome: "finalized",
    issues: [],
    evidence: {
      ...cloneReadyPlan(preparation.plan),
      applyId,
      appliedAt,
      candidateRecord: cloneHistoryRecord(candidateRecord),
      candidateHistory: candidateHistory.map(cloneHistoryRecord),
      writeAuthorized: false,
      readinessEligible: false,
      outputEligible: false
    }
  };
}

function validateInput(
  input: unknown,
  runtime: unknown
): PlanningControlledApplyTransactionFinalizationIssue | null {
  if (!isPlainObject(input)) {
    return issue("invalidInput", "Controlled-apply transaction finalization input must be an object.");
  }
  if (Object.keys(input).some((key) => !inputFields.has(key))) {
    return issue("invalidInput", "Controlled-apply transaction finalization received an unsupported input field.");
  }
  if (!isPlainObject(runtime) || Object.keys(runtime).some((key) => !runtimeFields.has(key))) {
    return issue("invalidInput", "Controlled-apply transaction finalization runtime contains an unsupported field.");
  }
  if (runtime.now !== undefined && typeof runtime.now !== "function") {
    return issue("timestampUnavailable", "Controlled-apply timestamp runtime must be a function.");
  }
  if (runtime.uuid !== undefined && typeof runtime.uuid !== "function") {
    return issue("uuidUnavailable", "Controlled-apply UUID runtime must be a function.");
  }
  return null;
}

function validateReadyPreparation(
  plan: ReadyPlanningControlledApplyTransactionPlan,
  input: PlanningControlledApplyTransactionFinalizationInput
): PlanningControlledApplyTransactionFinalizationIssue | null {
  const expectedOutcome = plan.expectedCurrentValue === plan.desiredValue ? "unchanged" : "changed";
  const destinationMutationRequired = expectedOutcome === "changed";
  if (
    plan.projectId !== input.project.identity.id ||
    plan.proposalId !== input.proposalId ||
    plan.previousValue !== plan.expectedCurrentValue ||
    plan.appliedValue !== plan.desiredValue ||
    plan.historyOutcome !== expectedOutcome ||
    plan.destinationMutationRequired !== destinationMutationRequired ||
    plan.historyAppendRequired !== true ||
    plan.writeAuthorized !== false ||
    plan.readinessEligible !== false ||
    plan.outputEligible !== false
  ) {
    return issue(
      "invalidPreparation",
      "Ready transaction preparation evidence is internally inconsistent.",
      plan.proposalId,
      plan.decisionId,
      plan.fieldKey
    );
  }
  return null;
}

function allocateAppliedAt(
  runtime: PlanningControlledApplyTransactionFinalizationRuntime
): { value?: string; issue?: PlanningControlledApplyTransactionFinalizationIssue } {
  let value: unknown;
  try {
    value = (runtime.now ?? defaultNow)();
  } catch {
    return { issue: issue("timestampUnavailable", "Controlled-apply timestamp allocation failed.") };
  }
  if (typeof value !== "string" || !isCanonicalUtcTimestamp(value)) {
    return {
      issue: issue(
        "invalidTimestamp",
        "Controlled-apply timestamp must be canonical UTC with milliseconds.",
        undefined,
        undefined,
        undefined,
        typeof value === "string" ? value : undefined
      )
    };
  }
  return { value };
}

function allocateApplyId(
  runtime: PlanningControlledApplyTransactionFinalizationRuntime
): { value?: string; issue?: PlanningControlledApplyTransactionFinalizationIssue } {
  const generator = runtime.uuid ?? globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (typeof generator !== "function") {
    return { issue: issue("uuidUnavailable", "Controlled-apply UUID generation is unavailable.") };
  }
  let value: unknown;
  try {
    value = generator();
  } catch {
    return { issue: issue("uuidUnavailable", "Controlled-apply UUID allocation failed.") };
  }
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    return {
      issue: issue(
        "invalidUuid",
        "Generated apply UUID must use canonical lowercase UUID syntax.",
        undefined,
        undefined,
        undefined,
        typeof value === "string" ? value : undefined
      )
    };
  }
  return { value };
}

function buildCandidateRecord(
  plan: ReadyPlanningControlledApplyTransactionPlan,
  applyId: string,
  appliedAt: string
): PlanningControlledApplyHistoryRecord {
  return {
    applyId,
    applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
    projectId: plan.projectId,
    proposalId: plan.proposalId,
    decisionId: plan.decisionId,
    fieldKey: plan.fieldKey,
    previousValue: plan.previousValue,
    appliedValue: plan.appliedValue,
    sourceIds: [...plan.sourceIds],
    appliedAt,
    outcome: plan.historyOutcome
  };
}

function cloneReadyPlan(
  plan: ReadyPlanningControlledApplyTransactionPlan
): Omit<FinalizedPlanningControlledApplyTransactionEvidence, "applyId" | "appliedAt" | "candidateRecord" | "candidateHistory"> {
  return {
    projectId: plan.projectId,
    proposalId: plan.proposalId,
    decisionId: plan.decisionId,
    fieldKey: plan.fieldKey,
    desiredValue: plan.desiredValue,
    expectedCurrentValue: plan.expectedCurrentValue,
    previousValue: plan.previousValue,
    appliedValue: plan.appliedValue,
    sourceIds: [...plan.sourceIds],
    expectedProjectSnapshot: plan.expectedProjectSnapshot,
    historyOutcome: plan.historyOutcome,
    destinationMutationRequired: plan.destinationMutationRequired,
    historyAppendRequired: plan.historyAppendRequired,
    writeAuthorized: false,
    readinessEligible: false,
    outputEligible: false
  };
}

function cloneHistoryRecord(record: PlanningControlledApplyHistoryRecord): PlanningControlledApplyHistoryRecord {
  return {
    ...record,
    sourceIds: [...record.sourceIds]
  };
}

function clonePreparationIssues(
  issues: readonly PlanningControlledApplyTransactionPreparationIssue[]
): readonly PlanningControlledApplyTransactionPreparationIssue[] {
  return issues.map((entry) => ({
    ...entry,
    destinationIssues: entry.destinationIssues?.map((destinationIssue) => ({
      ...destinationIssue,
      candidateIssues: destinationIssue.candidateIssues?.map((candidateIssue) => ({ ...candidateIssue }))
    })),
    historyIssues: entry.historyIssues?.map((historyIssue) => ({ ...historyIssue }))
  }));
}

function cloneHistoryIssues(
  issues: readonly PlanningControlledApplyHistoryIssue[]
): readonly PlanningControlledApplyHistoryIssue[] {
  return issues.map((entry) => ({ ...entry }));
}

function structurallyEquivalent(
  candidate: readonly PlanningControlledApplyHistoryRecord[],
  normalized: readonly PlanningControlledApplyHistoryRecord[]
): boolean {
  return JSON.stringify(candidate) === JSON.stringify(normalized);
}

function defaultNow(): string {
  return new Date().toISOString();
}

function isCanonicalUtcTimestamp(input: string): boolean {
  const match = UTC_TIMESTAMP_PATTERN.exec(input);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  return year >= 100 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function issue(
  code: PlanningControlledApplyTransactionFinalizationIssueCode,
  message: string,
  proposalId?: string,
  decisionId?: string,
  fieldKey?: string,
  generatedValue?: string,
  preparationIssues?: readonly PlanningControlledApplyTransactionPreparationIssue[],
  historyIssues?: readonly PlanningControlledApplyHistoryIssue[]
): PlanningControlledApplyTransactionFinalizationIssue {
  return dropUndefined({
    code,
    message,
    proposalId,
    decisionId,
    fieldKey,
    generatedValue,
    preparationIssues,
    historyIssues
  });
}

function blocked(
  issues: readonly PlanningControlledApplyTransactionFinalizationIssue[]
): PlanningControlledApplyTransactionFinalizationResult {
  return {
    outcome: "blocked",
    issues: issues.map((entry) => ({
      ...entry,
      preparationIssues: entry.preparationIssues ? clonePreparationIssues(entry.preparationIssues) : undefined,
      historyIssues: entry.historyIssues ? cloneHistoryIssues(entry.historyIssues) : undefined
    }))
  };
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
