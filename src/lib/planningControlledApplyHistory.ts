import { EMPTY_PROJECT_INTAKE } from "./createProject";
import {
  normalizeProjectPlanningState,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "./planningProposals";
import type { ProjectInputField } from "../types/project";

export const CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION = "phase-5c.2.3d.3c.2a";
export const CONTROLLED_APPLY_HISTORY_RECORD_LIMIT = 1000;

export type PlanningControlledApplyHistoryOutcome = "changed" | "unchanged";

export interface PlanningControlledApplyHistoryRecord {
  applyId: string;
  applySchemaVersion: typeof CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION;
  projectId: string;
  proposalId: string;
  decisionId: string;
  fieldKey: ProjectInputField;
  previousValue: string;
  appliedValue: string;
  sourceIds: readonly string[];
  appliedAt: string;
  outcome: PlanningControlledApplyHistoryOutcome;
}

export type PlanningControlledApplyHistoryIssueCode =
  | "invalidInput"
  | "collectionCapExceeded"
  | "sparseCollection"
  | "invalidRecord"
  | "unexpectedRecordField"
  | "invalidApplyId"
  | "duplicateApplyId"
  | "duplicateSemanticApply"
  | "projectMismatch"
  | "invalidPlanning"
  | "proposalNotFound"
  | "decisionNotFound"
  | "invalidConfirmingDecision"
  | "targetMismatch"
  | "unsupportedProjectField"
  | "unsupportedSideEffectField"
  | "invalidPreviousValue"
  | "invalidAppliedValue"
  | "invalidSourceIds"
  | "sourceBindingMismatch"
  | "sourceNotFound"
  | "invalidTimestamp"
  | "outcomeValueMismatch";

export interface PlanningControlledApplyHistoryIssue {
  code: PlanningControlledApplyHistoryIssueCode;
  message: string;
  index?: number;
  applyId?: string;
  proposalId?: string;
  decisionId?: string;
  sourceId?: string;
  field?: string;
}

export interface PlanningControlledApplyHistoryInput {
  projectId: string;
  planning?: ProjectPlanningState;
  history: unknown;
}

export type PlanningControlledApplyHistoryNormalizationResult =
  | {
      outcome: "valid";
      history: readonly PlanningControlledApplyHistoryRecord[];
      issues: readonly [];
    }
  | {
      outcome: "invalid";
      issues: readonly PlanningControlledApplyHistoryIssue[];
      history?: undefined;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;
const PROJECT_ID_LIMIT = 200;

const RECORD_FIELDS = [
  "applyId",
  "applySchemaVersion",
  "projectId",
  "proposalId",
  "decisionId",
  "fieldKey",
  "previousValue",
  "appliedValue",
  "sourceIds",
  "appliedAt",
  "outcome"
] as const;

const recordFieldSet = new Set<string>(RECORD_FIELDS);
const clientFieldKeys = new Set<string>(["clientName", "businessName"]);
const unsupportedSideEffectFields = new Set<string>(["appType"]);

export function normalizePlanningControlledApplyHistory(
  input: unknown
): PlanningControlledApplyHistoryNormalizationResult {
  if (!isPlainObject(input)) {
    return invalid([issue("invalidInput", "Controlled-apply history input must be an object.")]);
  }

  const projectId = normalizeProjectId(input.projectId);
  if (!projectId) {
    return invalid([issue("invalidInput", "Controlled-apply history requires a valid owning project ID.", undefined, undefined, undefined, undefined, undefined, "projectId")]);
  }

  const history = input.history;
  if (!Array.isArray(history)) {
    return invalid([issue("invalidInput", "Controlled-apply history must be an array.", undefined, undefined, undefined, undefined, undefined, "history")]);
  }

  if (history.length > CONTROLLED_APPLY_HISTORY_RECORD_LIMIT) {
    return invalid([issue("collectionCapExceeded", "Controlled-apply history exceeds the approved 1000-record cap.", undefined, undefined, undefined, undefined, undefined, "history")]);
  }

  if (hasSparseArrayEntry(history)) {
    return invalid([issue("sparseCollection", "Controlled-apply history cannot contain sparse entries.", undefined, undefined, undefined, undefined, undefined, "history")]);
  }

  if (history.length === 0) {
    return { outcome: "valid", history: [], issues: [] };
  }

  const normalizedPlanning = normalizeProjectPlanningState(input.planning, projectId);
  if (normalizedPlanning.issues.length > 0) {
    return invalid([issue("invalidPlanning", "Planning normalization failed; controlled-apply history validation is closed.", undefined, undefined, undefined, undefined, undefined, "planning")]);
  }

  const issues: PlanningControlledApplyHistoryIssue[] = [];
  const applyIds = new Set<string>();
  const semanticApplyIds = new Set<string>();
  const normalizedRecords: PlanningControlledApplyHistoryRecord[] = [];

  history.forEach((rawRecord, index) => {
    const record = normalizeRecord(rawRecord, index, projectId, normalizedPlanning.planning, applyIds, semanticApplyIds, issues);
    if (record) {
      normalizedRecords.push(record);
    }
  });

  if (issues.length > 0) {
    return invalid(issues);
  }

  return {
    outcome: "valid",
    history: normalizedRecords.map(cloneRecord),
    issues: []
  };
}

function normalizeRecord(
  input: unknown,
  index: number,
  projectId: string,
  planning: ProjectPlanningState,
  applyIds: Set<string>,
  semanticApplyIds: Set<string>,
  issues: PlanningControlledApplyHistoryIssue[]
): PlanningControlledApplyHistoryRecord | null {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidRecord", "Controlled-apply history record must be an object.", index));
    return null;
  }

  for (const key of Object.keys(input)) {
    if (!recordFieldSet.has(key)) {
      issues.push(issue("unexpectedRecordField", "Controlled-apply history record contains an unapproved field.", index, asString(input.applyId), undefined, undefined, undefined, key));
    }
  }

  for (const key of RECORD_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      issues.push(issue("invalidRecord", "Controlled-apply history record is missing a required field.", index, asString(input.applyId), undefined, undefined, undefined, key));
    }
  }

  const applyId = typeof input.applyId === "string" ? input.applyId : "";
  if (!UUID_PATTERN.test(applyId)) {
    issues.push(issue("invalidApplyId", "applyId must be a canonical UUID.", index, applyId, undefined, undefined, undefined, "applyId"));
  } else if (applyIds.has(applyId)) {
    issues.push(issue("duplicateApplyId", "applyId must be unique within controlled-apply history.", index, applyId, undefined, undefined, undefined, "applyId"));
  } else {
    applyIds.add(applyId);
  }

  if (input.applySchemaVersion !== CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION) {
    issues.push(issue("invalidRecord", "Controlled-apply history record has an unsupported schema version.", index, applyId, undefined, undefined, undefined, "applySchemaVersion"));
  }

  if (input.projectId !== projectId) {
    issues.push(issue("projectMismatch", "Controlled-apply history projectId must match the owning project.", index, applyId, undefined, undefined, undefined, "projectId"));
  }

  const proposalId = typeof input.proposalId === "string" ? input.proposalId : "";
  const decisionId = typeof input.decisionId === "string" ? input.decisionId : "";
  const rawFieldKey = typeof input.fieldKey === "string" ? input.fieldKey : "";
  const previousValue = input.previousValue;
  const appliedValue = input.appliedValue;
  const outcome = input.outcome;

  const proposal = proposalId ? exactlyOne(planning.proposals, (candidate) => candidate.proposalId === proposalId) : null;
  if (!proposal) {
    issues.push(issue("proposalNotFound", "History proposalId must resolve exactly once in planning.", index, applyId, proposalId, undefined, undefined, "proposalId"));
  } else if (proposal.projectId !== projectId) {
    issues.push(issue("projectMismatch", "History proposal must belong to the owning project.", index, applyId, proposalId, undefined, undefined, "proposalId"));
  }

  const decision = decisionId ? exactlyOne(planning.decisions, (candidate) => candidate.decisionId === decisionId) : null;
  if (!decision) {
    issues.push(issue("decisionNotFound", "History decisionId must resolve exactly once in planning.", index, applyId, proposalId, decisionId, undefined, "decisionId"));
  } else {
    validateDecision(decision, projectId, proposalId, index, applyId, issues);
  }

  const fieldKey = validateFieldKey(rawFieldKey, index, applyId, proposalId, issues);
  if (proposal && fieldKey) {
    validateTarget(proposal, fieldKey, index, applyId, proposalId, issues);
  }

  if (typeof previousValue !== "string") {
    issues.push(issue("invalidPreviousValue", "previousValue must be an exact string.", index, applyId, proposalId, decisionId, undefined, "previousValue"));
  }
  if (typeof appliedValue !== "string") {
    issues.push(issue("invalidAppliedValue", "appliedValue must be an exact string.", index, applyId, proposalId, decisionId, undefined, "appliedValue"));
  }

  if (outcome !== "changed" && outcome !== "unchanged") {
    issues.push(issue("invalidRecord", "Controlled-apply history outcome must be changed or unchanged.", index, applyId, proposalId, decisionId, undefined, "outcome"));
  } else if (typeof previousValue === "string" && typeof appliedValue === "string") {
    if (outcome === "changed" && previousValue === appliedValue) {
      issues.push(issue("outcomeValueMismatch", "changed history records require previousValue and appliedValue to differ exactly.", index, applyId, proposalId, decisionId, undefined, "outcome"));
    }
    if (outcome === "unchanged" && previousValue !== appliedValue) {
      issues.push(issue("outcomeValueMismatch", "unchanged history records require previousValue and appliedValue to match exactly.", index, applyId, proposalId, decisionId, undefined, "outcome"));
    }
  }

  const sourceIds = normalizeSourceIds(input.sourceIds, index, applyId, proposalId, decisionId, issues);
  if (sourceIds && decision) {
    validateSourceBinding(sourceIds, decision.sourceIds, planning.sources, index, applyId, proposalId, decisionId, issues);
  }

  if (typeof input.appliedAt !== "string" || !isCanonicalUtcTimestamp(input.appliedAt)) {
    issues.push(issue("invalidTimestamp", "appliedAt must be canonical UTC with milliseconds.", index, applyId, proposalId, decisionId, undefined, "appliedAt"));
  }

  if (proposalId && decisionId && fieldKey) {
    const semanticIdentity = `${projectId}\u0000${proposalId}\u0000${decisionId}\u0000${fieldKey}`;
    if (semanticApplyIds.has(semanticIdentity)) {
      issues.push(issue("duplicateSemanticApply", "No two history records may share projectId, proposalId, decisionId, and fieldKey.", index, applyId, proposalId, decisionId, undefined, "fieldKey"));
    } else {
      semanticApplyIds.add(semanticIdentity);
    }
  }

  if (
    issues.some((entry) => entry.index === index) ||
    !fieldKey ||
    typeof previousValue !== "string" ||
    typeof appliedValue !== "string" ||
    (outcome !== "changed" && outcome !== "unchanged") ||
    !sourceIds ||
    typeof input.appliedAt !== "string"
  ) {
    return null;
  }

  return {
    applyId,
    applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
    projectId,
    proposalId,
    decisionId,
    fieldKey,
    previousValue,
    appliedValue,
    sourceIds: [...sourceIds],
    appliedAt: input.appliedAt,
    outcome
  };
}

function validateDecision(
  decision: PlanningDecisionRecord,
  projectId: string,
  proposalId: string,
  index: number,
  applyId: string,
  issues: PlanningControlledApplyHistoryIssue[]
): void {
  if (
    decision.projectId !== projectId ||
    decision.proposalId !== proposalId ||
    decision.action !== "confirm" ||
    decision.origin !== "userAction" ||
    decision.resultingStatus !== "Confirmed"
  ) {
    issues.push(issue("invalidConfirmingDecision", "History decisionId must reference the explicit human Confirmed decision for the proposal.", index, applyId, proposalId, decision.decisionId, undefined, "decisionId"));
  }
}

function validateTarget(
  proposal: PlanningProposalRecord,
  fieldKey: ProjectInputField,
  index: number,
  applyId: string,
  proposalId: string,
  issues: PlanningControlledApplyHistoryIssue[]
): void {
  if (
    proposal.target.kind !== "projectField" ||
    proposal.target.operation !== "setValue" ||
    !proposal.target.fieldKey ||
    proposal.target.fieldKey !== fieldKey ||
    proposal.target.targetKey !== proposal.target.fieldKey ||
    proposal.target.entityId !== undefined
  ) {
    issues.push(issue("targetMismatch", "History fieldKey must match a projectField setValue proposal target with no entityId.", index, applyId, proposalId, undefined, undefined, "fieldKey"));
  }
}

function validateFieldKey(
  fieldKey: string,
  index: number,
  applyId: string,
  proposalId: string,
  issues: PlanningControlledApplyHistoryIssue[]
): ProjectInputField | null {
  if (!fieldKey) {
    issues.push(issue("unsupportedProjectField", "History fieldKey must be a supported project input field.", index, applyId, proposalId, undefined, undefined, "fieldKey"));
    return null;
  }
  if (unsupportedSideEffectFields.has(fieldKey)) {
    issues.push(issue("unsupportedSideEffectField", "appType remains excluded from the initial controlled-apply history contract.", index, applyId, proposalId, undefined, undefined, "fieldKey"));
    return null;
  }
  if (!isSupportedProjectInputField(fieldKey)) {
    issues.push(issue("unsupportedProjectField", "History fieldKey is not a supported project input field.", index, applyId, proposalId, undefined, undefined, "fieldKey"));
    return null;
  }
  return fieldKey;
}

function isSupportedProjectInputField(fieldKey: string): fieldKey is ProjectInputField {
  return fieldKey === "appName" ||
    clientFieldKeys.has(fieldKey) ||
    Object.prototype.hasOwnProperty.call(EMPTY_PROJECT_INTAKE, fieldKey);
}

function normalizeSourceIds(
  input: unknown,
  index: number,
  applyId: string,
  proposalId: string,
  decisionId: string,
  issues: PlanningControlledApplyHistoryIssue[]
): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || hasSparseArrayEntry(input)) {
    issues.push(issue("invalidSourceIds", "sourceIds must be a non-empty dense array.", index, applyId, proposalId, decisionId, undefined, "sourceIds"));
    return null;
  }
  const sourceIds: string[] = [];
  const seen = new Set<string>();
  for (const sourceId of input) {
    if (typeof sourceId !== "string" || !sourceId || seen.has(sourceId)) {
      issues.push(issue("invalidSourceIds", "sourceIds must contain unique non-empty strings.", index, applyId, proposalId, decisionId, typeof sourceId === "string" ? sourceId : undefined, "sourceIds"));
      return null;
    }
    seen.add(sourceId);
    sourceIds.push(sourceId);
  }
  return sourceIds;
}

function validateSourceBinding(
  sourceIds: readonly string[],
  decisionSourceIds: readonly string[] | undefined,
  planningSources: readonly PlanningSourceReference[],
  index: number,
  applyId: string,
  proposalId: string,
  decisionId: string,
  issues: PlanningControlledApplyHistoryIssue[]
): void {
  if (!sameStringArray(sourceIds, decisionSourceIds ?? [])) {
    issues.push(issue("sourceBindingMismatch", "History sourceIds must exactly match confirming decision sourceIds in order.", index, applyId, proposalId, decisionId, undefined, "sourceIds"));
    return;
  }
  for (const sourceId of sourceIds) {
    if (planningSources.filter((source) => source.sourceId === sourceId).length !== 1) {
      issues.push(issue("sourceNotFound", "Every history sourceId must resolve exactly once in planning.", index, applyId, proposalId, decisionId, sourceId, "sourceIds"));
    }
  }
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
  if (
    !Number.isInteger(year) ||
    year < 100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return false;
  }
  return true;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function exactlyOne<T>(values: readonly T[], predicate: (value: T) => boolean): T | null {
  const matches = values.filter(predicate);
  return matches.length === 1 ? matches[0] : null;
}

function cloneRecord(record: PlanningControlledApplyHistoryRecord): PlanningControlledApplyHistoryRecord {
  return {
    ...record,
    sourceIds: [...record.sourceIds]
  };
}

function invalid(
  issues: readonly PlanningControlledApplyHistoryIssue[]
): PlanningControlledApplyHistoryNormalizationResult {
  return {
    outcome: "invalid",
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningControlledApplyHistoryIssueCode,
  message: string,
  index?: number,
  applyId?: string,
  proposalId?: string,
  decisionId?: string,
  sourceId?: string,
  field?: string
): PlanningControlledApplyHistoryIssue {
  return dropUndefined({ code, message, index, applyId, proposalId, decisionId, sourceId, field });
}

function normalizeProjectId(input: unknown): string | null {
  return typeof input === "string" &&
    input.length > 0 &&
    input.length <= PROJECT_ID_LIMIT &&
    !/[\r\n]/.test(input)
    ? input
    : null;
}

function hasSparseArrayEntry(input: readonly unknown[]): boolean {
  for (let index = 0; index < input.length; index += 1) {
    if (!(index in input)) return true;
  }
  return false;
}

function sameStringArray(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((entry, index) => entry === second[index]);
}

function asString(input: unknown): string | undefined {
  return typeof input === "string" ? input : undefined;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
