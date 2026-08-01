import type {
  RecordLifecycleFormulaStudioValidationOutcome,
  RecordLifecycleFormulaTechnicalReviewOutcome,
  ProjectRecord
} from "../types/project";
import {
  evaluateRecordLifecycleFormulaReviewEvidence,
  type RecordLifecycleFormulaEvidenceEvaluationStatus,
  type RecordLifecycleFormulaEvidenceEvaluationType,
  type RecordLifecycleFormulaEvidenceRecordEvaluation,
  type RecordLifecycleFormulaEvidenceTypeEvaluation
} from "./recordLifecycleFormulaEvidenceEvaluation";
import {
  buildRecordLifecycleFormulaReviewState,
  type RecordLifecycleFormulaReviewReferenceStatus,
  type RecordLifecycleFormulaReviewState
} from "./recordLifecycleFormulaReviewState";

export const RECORD_LIFECYCLE_FORMULA_REVIEW_SUMMARY_SAFETY_NOTICES = [
  "Current formula evidence confirms current binding only. It does not mean Approved.",
  "Technical Review and Power Apps Studio Validation are independent.",
  "Formula evidence does not change project readiness or clear project blockers.",
  "Formula source, copying, export, installation, and deployment are unavailable."
] as const;

export interface RecordLifecycleFormulaReviewSummaryInput {
  project: ProjectRecord;
  implementationRegistry: unknown;
  reviewReference?: unknown;
}

export interface RecordLifecycleFormulaReviewSummaryIdentity {
  assetId?: string;
  reviewContractVersion?: string;
  reviewContractChecksum?: string;
  formulaContentChecksum?: string;
  sourcePlanningAssetId?: string;
  sourcePlanningAssetChecksum?: string;
  planningGenerationVersion?: string;
  formulaGenerationVersion?: string;
}

export interface RecordLifecycleFormulaReviewReferenceSummary {
  status: RecordLifecycleFormulaReviewReferenceStatus;
  issues: string[];
}

export interface RecordLifecycleFormulaEvidenceTypeSummary {
  evidenceType: RecordLifecycleFormulaEvidenceEvaluationType;
  status: RecordLifecycleFormulaEvidenceEvaluationStatus;
  recordCount: number;
  currentCount: number;
  staleCount: number;
  invalidCount: number;
  currentOutcomes: Array<RecordLifecycleFormulaTechnicalReviewOutcome | RecordLifecycleFormulaStudioValidationOutcome>;
  staleOutcomes: Array<RecordLifecycleFormulaTechnicalReviewOutcome | RecordLifecycleFormulaStudioValidationOutcome>;
  issues: string[];
}

export interface RecordLifecycleFormulaReviewSummaryHistoryItem {
  evidenceId?: string;
  evidenceType?: RecordLifecycleFormulaEvidenceEvaluationType;
  recordedAt?: string;
  outcome?: RecordLifecycleFormulaTechnicalReviewOutcome | RecordLifecycleFormulaStudioValidationOutcome;
  status: Exclude<RecordLifecycleFormulaEvidenceEvaluationStatus, "Not Provided">;
  issues: string[];
}

export interface RecordLifecycleFormulaReviewSummary {
  reviewState: RecordLifecycleFormulaReviewState;
  applicable: boolean;
  formulaIdentity?: RecordLifecycleFormulaReviewSummaryIdentity;
  reviewReference: RecordLifecycleFormulaReviewReferenceSummary;
  formulaBlockers: string[];
  technicalReview: RecordLifecycleFormulaEvidenceTypeSummary;
  studioValidation: RecordLifecycleFormulaEvidenceTypeSummary;
  history: RecordLifecycleFormulaReviewSummaryHistoryItem[];
  collectionIssues: string[];
  safetyNotices: string[];
}

const TECHNICAL_OUTCOME_ORDER: readonly RecordLifecycleFormulaTechnicalReviewOutcome[] = [
  "Accepted",
  "Rejected",
  "Regeneration Required"
];

const STUDIO_OUTCOME_ORDER: readonly RecordLifecycleFormulaStudioValidationOutcome[] = [
  "Passed",
  "Failed"
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function projectIdFrom(input: ProjectRecord): string | undefined {
  const project = input as unknown;
  if (!isObject(project) || !isObject(project.identity)) return undefined;
  return typeof project.identity.id === "string" ? project.identity.id : undefined;
}

function formulaEvidenceFrom(input: ProjectRecord): unknown {
  const project = input as unknown;
  if (!isObject(project) || !isObject(project.powerPlatform) || !isObject(project.powerPlatform.canvas)) {
    return undefined;
  }
  return project.powerPlatform.canvas.recordLifecycleFormulaReviewEvidence;
}

function uniqueInInputOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function formulaIdentityFrom(state: ReturnType<typeof buildRecordLifecycleFormulaReviewState>): RecordLifecycleFormulaReviewSummaryIdentity | undefined {
  const identity: RecordLifecycleFormulaReviewSummaryIdentity = {
    ...(state.assetId ? { assetId: state.assetId } : {}),
    ...(state.reviewContractVersion ? { reviewContractVersion: state.reviewContractVersion } : {}),
    ...(state.reviewContractChecksum ? { reviewContractChecksum: state.reviewContractChecksum } : {}),
    ...(state.formulaContentChecksum ? { formulaContentChecksum: state.formulaContentChecksum } : {}),
    ...(state.sourcePlanningAssetId ? { sourcePlanningAssetId: state.sourcePlanningAssetId } : {}),
    ...(state.sourcePlanningAssetChecksum ? { sourcePlanningAssetChecksum: state.sourcePlanningAssetChecksum } : {}),
    ...(state.planningGenerationVersion ? { planningGenerationVersion: state.planningGenerationVersion } : {}),
    ...(state.formulaGenerationVersion ? { formulaGenerationVersion: state.formulaGenerationVersion } : {})
  };
  return Object.keys(identity).length > 0 ? identity : undefined;
}

function outcomesFrom(
  records: RecordLifecycleFormulaEvidenceRecordEvaluation[],
  evidenceType: RecordLifecycleFormulaEvidenceEvaluationType
): Array<RecordLifecycleFormulaTechnicalReviewOutcome | RecordLifecycleFormulaStudioValidationOutcome> {
  const order = evidenceType === "Technical Review" ? TECHNICAL_OUTCOME_ORDER : STUDIO_OUTCOME_ORDER;
  const present = new Set(records.map((record) => record.outcome).filter(Boolean));
  return order.filter((outcome) => present.has(outcome));
}

function summarizeEvidenceType(evaluation: RecordLifecycleFormulaEvidenceTypeEvaluation): RecordLifecycleFormulaEvidenceTypeSummary {
  return {
    evidenceType: evaluation.evidenceType,
    status: evaluation.status,
    recordCount: evaluation.records.length,
    currentCount: evaluation.currentRecords.length,
    staleCount: evaluation.staleRecords.length,
    invalidCount: evaluation.invalidRecords.length,
    currentOutcomes: outcomesFrom(evaluation.currentRecords, evaluation.evidenceType),
    staleOutcomes: outcomesFrom(evaluation.staleRecords, evaluation.evidenceType),
    issues: [...evaluation.issues]
  };
}

function historyItemFrom(record: RecordLifecycleFormulaEvidenceRecordEvaluation): RecordLifecycleFormulaReviewSummaryHistoryItem {
  return {
    ...(record.evidenceId ? { evidenceId: record.evidenceId } : {}),
    ...(record.evidenceType ? { evidenceType: record.evidenceType } : {}),
    ...(record.recordedAt ? { recordedAt: record.recordedAt } : {}),
    ...(record.outcome ? { outcome: record.outcome } : {}),
    status: record.status,
    issues: [...record.issues]
  };
}

export function buildRecordLifecycleFormulaReviewSummary(
  input: RecordLifecycleFormulaReviewSummaryInput
): RecordLifecycleFormulaReviewSummary {
  const reviewState = buildRecordLifecycleFormulaReviewState(input.implementationRegistry, input.reviewReference);
  const evidenceEvaluation = evaluateRecordLifecycleFormulaReviewEvidence(
    formulaEvidenceFrom(input.project),
    {
      projectId: projectIdFrom(input.project),
      assetId: reviewState.assetId,
      reviewContractVersion: reviewState.reviewContractVersion,
      reviewContractChecksum: reviewState.reviewContractChecksum
    }
  );

  return {
    reviewState: reviewState.reviewState,
    applicable: reviewState.reviewState !== "Not Applicable",
    formulaIdentity: formulaIdentityFrom(reviewState),
    reviewReference: {
      status: reviewState.reviewReferenceStatus,
      issues: [...reviewState.reviewReferenceIssues]
    },
    formulaBlockers: uniqueInInputOrder(reviewState.blockingIssues),
    technicalReview: summarizeEvidenceType(evidenceEvaluation.technicalReview),
    studioValidation: summarizeEvidenceType(evidenceEvaluation.studioValidation),
    history: evidenceEvaluation.records.map(historyItemFrom),
    collectionIssues: [...evidenceEvaluation.collectionIssues],
    safetyNotices: [...RECORD_LIFECYCLE_FORMULA_REVIEW_SUMMARY_SAFETY_NOTICES]
  };
}
