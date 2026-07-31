import {
  RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
  normalizeRecordLifecycleFormulaReviewEvidenceForEvaluation,
  type RecordLifecycleFormulaReviewEvidenceRecord
} from "./recordLifecycleFormulaEvidence";
import type {
  RecordLifecycleFormulaStudioValidationOutcome,
  RecordLifecycleFormulaTechnicalReviewOutcome
} from "../types/project";

export type RecordLifecycleFormulaEvidenceEvaluationStatus =
  | "Not Provided"
  | "Current"
  | "Stale"
  | "Invalid";

export type RecordLifecycleFormulaEvidenceEvaluationType =
  | "Technical Review"
  | "Power Apps Studio Validation";

export interface RecordLifecycleFormulaEvidenceEvaluationContext {
  projectId?: string;
  assetId?: string;
  reviewContractVersion?: string;
  reviewContractChecksum?: string;
}

export interface RecordLifecycleFormulaEvidenceRecordEvaluation {
  evidenceId?: string;
  evidenceType?: RecordLifecycleFormulaEvidenceEvaluationType;
  recordedAt?: string;
  outcome?: RecordLifecycleFormulaTechnicalReviewOutcome | RecordLifecycleFormulaStudioValidationOutcome;
  status: Exclude<RecordLifecycleFormulaEvidenceEvaluationStatus, "Not Provided">;
  issues: string[];
}

export interface RecordLifecycleFormulaEvidenceTypeEvaluation {
  evidenceType: RecordLifecycleFormulaEvidenceEvaluationType;
  status: RecordLifecycleFormulaEvidenceEvaluationStatus;
  records: RecordLifecycleFormulaEvidenceRecordEvaluation[];
  currentRecords: RecordLifecycleFormulaEvidenceRecordEvaluation[];
  staleRecords: RecordLifecycleFormulaEvidenceRecordEvaluation[];
  invalidRecords: RecordLifecycleFormulaEvidenceRecordEvaluation[];
  issues: string[];
}

export interface RecordLifecycleFormulaEvidenceEvaluationResult {
  technicalReview: RecordLifecycleFormulaEvidenceTypeEvaluation;
  studioValidation: RecordLifecycleFormulaEvidenceTypeEvaluation;
  records: RecordLifecycleFormulaEvidenceRecordEvaluation[];
  collectionIssues: string[];
}

const EVIDENCE_TYPES: readonly RecordLifecycleFormulaEvidenceEvaluationType[] = [
  "Technical Review",
  "Power Apps Studio Validation"
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function evidenceTypeFromInput(input: unknown): RecordLifecycleFormulaEvidenceEvaluationType | undefined {
  if (!isObject(input)) return undefined;
  return EVIDENCE_TYPES.includes(input.evidenceType as RecordLifecycleFormulaEvidenceEvaluationType)
    ? input.evidenceType as RecordLifecycleFormulaEvidenceEvaluationType
    : undefined;
}

function schemaIssue(input: unknown): string {
  if (!isObject(input)) return "Formula evidence record must be an object.";
  return input.evidenceSchemaVersion === RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION
    ? "Formula evidence record is malformed or missing required validation fields."
    : "Formula evidence schema version is unsupported.";
}

function contextIssues(record: RecordLifecycleFormulaReviewEvidenceRecord, context: RecordLifecycleFormulaEvidenceEvaluationContext): string[] {
  if (
    !context.projectId
    || !context.assetId
    || !context.reviewContractVersion
    || !context.reviewContractChecksum
  ) return ["No current formula review contract is available."];

  return [
    record.projectId === context.projectId ? "" : "Formula evidence project ID does not match the current project.",
    record.assetId === context.assetId ? "" : "Formula evidence asset ID does not match the current formula asset.",
    record.reviewContractVersion === context.reviewContractVersion ? "" : "Formula evidence review contract version is stale.",
    record.reviewContractChecksum === context.reviewContractChecksum ? "" : "Formula evidence review contract checksum is stale."
  ].filter(Boolean);
}

function evaluateValidRecord(
  record: RecordLifecycleFormulaReviewEvidenceRecord,
  context: RecordLifecycleFormulaEvidenceEvaluationContext
): RecordLifecycleFormulaEvidenceRecordEvaluation {
  const issues = contextIssues(record, context);
  return {
    evidenceId: record.evidenceId,
    evidenceType: record.evidenceType,
    recordedAt: record.recordedAt,
    outcome: record.outcome,
    status: issues.length > 0 ? "Stale" : "Current",
    issues
  };
}

function invalidRecord(
  input: unknown,
  issue: string
): RecordLifecycleFormulaEvidenceRecordEvaluation {
  return {
    evidenceType: evidenceTypeFromInput(input),
    status: "Invalid",
    issues: [issue]
  };
}

function sparseCollectionIssue(index: number): string {
  return `Formula evidence collection contains a sparse entry at index ${index}.`;
}

function duplicateEvidenceIds(records: RecordLifecycleFormulaEvidenceRecordEvaluation[]): Set<string> {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (!record.evidenceId) continue;
    counts.set(record.evidenceId, (counts.get(record.evidenceId) ?? 0) + 1);
  }
  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([evidenceId]) => evidenceId)
  );
}

function applyDuplicateInvalidation(records: RecordLifecycleFormulaEvidenceRecordEvaluation[]): RecordLifecycleFormulaEvidenceRecordEvaluation[] {
  const duplicateIds = duplicateEvidenceIds(records);
  if (duplicateIds.size === 0) return records;
  return records.map((record) =>
    record.evidenceId && duplicateIds.has(record.evidenceId)
      ? {
        ...record,
        status: "Invalid",
        issues: Array.from(new Set([...record.issues, "Duplicate formula evidence ID."]))
      }
      : record
  );
}

function statusForRecords(
  records: RecordLifecycleFormulaEvidenceRecordEvaluation[],
  collectionIssues: string[]
): RecordLifecycleFormulaEvidenceEvaluationStatus {
  if (records.some((record) => record.status === "Current")) return "Current";
  if (records.some((record) => record.status === "Stale")) return "Stale";
  if (records.some((record) => record.status === "Invalid") || collectionIssues.length > 0) return "Invalid";
  return "Not Provided";
}

function typeEvaluation(
  evidenceType: RecordLifecycleFormulaEvidenceEvaluationType,
  records: RecordLifecycleFormulaEvidenceRecordEvaluation[],
  collectionIssues: string[]
): RecordLifecycleFormulaEvidenceTypeEvaluation {
  const applicable = records.filter((record) => record.evidenceType === evidenceType);
  const currentRecords = applicable.filter((record) => record.status === "Current");
  const staleRecords = applicable.filter((record) => record.status === "Stale");
  const invalidRecords = applicable.filter((record) => record.status === "Invalid");
  const issues = Array.from(new Set([
    ...collectionIssues,
    ...applicable.flatMap((record) => record.issues)
  ])).sort();

  return {
    evidenceType,
    status: statusForRecords(applicable, collectionIssues),
    records: applicable,
    currentRecords,
    staleRecords,
    invalidRecords,
    issues
  };
}

export function evaluateRecordLifecycleFormulaReviewEvidence(
  input: unknown,
  context: RecordLifecycleFormulaEvidenceEvaluationContext
): RecordLifecycleFormulaEvidenceEvaluationResult {
  if (input === undefined || input === null) {
    return {
      technicalReview: typeEvaluation("Technical Review", [], []),
      studioValidation: typeEvaluation("Power Apps Studio Validation", [], []),
      records: [],
      collectionIssues: []
    };
  }

  if (!Array.isArray(input)) {
    const collectionIssues = ["Formula evidence collection must be an array."];
    return {
      technicalReview: typeEvaluation("Technical Review", [], collectionIssues),
      studioValidation: typeEvaluation("Power Apps Studio Validation", [], collectionIssues),
      records: [],
      collectionIssues
    };
  }

  const collectionIssues: string[] = [];
  const evaluated: RecordLifecycleFormulaEvidenceRecordEvaluation[] = [];
  for (let index = 0; index < input.length; index += 1) {
    if (!(index in input)) {
      collectionIssues.push(sparseCollectionIssue(index));
      continue;
    }
    const candidate = input[index];
    const normalized = normalizeRecordLifecycleFormulaReviewEvidenceForEvaluation(candidate);
    evaluated.push(
      normalized
        ? evaluateValidRecord(normalized, context)
        : invalidRecord(candidate, schemaIssue(candidate))
    );
  }
  const records = applyDuplicateInvalidation(evaluated);

  return {
    technicalReview: typeEvaluation("Technical Review", records, []),
    studioValidation: typeEvaluation("Power Apps Studio Validation", records, []),
    records,
    collectionIssues
  };
}
