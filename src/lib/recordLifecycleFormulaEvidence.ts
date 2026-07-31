import type {
  RecordLifecycleFormulaReviewEvidenceRecord,
  RecordLifecycleFormulaStudioValidationCheck,
  RecordLifecycleFormulaStudioValidationChecks,
  RecordLifecycleFormulaStudioValidationOutcome,
  RecordLifecycleFormulaTechnicalReviewOutcome
} from "../types/project";

export type {
  RecordLifecycleFormulaReviewEvidenceRecord,
  RecordLifecycleFormulaStudioValidationCheck,
  RecordLifecycleFormulaStudioValidationChecks,
  RecordLifecycleFormulaStudioValidationEvidenceRecord,
  RecordLifecycleFormulaStudioValidationOutcome,
  RecordLifecycleFormulaTechnicalReviewEvidenceRecord,
  RecordLifecycleFormulaTechnicalReviewOutcome
} from "../types/project";

export const RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION = "phase-5b.4d.2.2.1";
export const RECORD_LIFECYCLE_FORMULA_EVIDENCE_ASSET_ID = "asset-canvas-record-lifecycle-powerfx-onselect";

export const RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS = [
  "targetScreenConfirmed",
  "targetControlConfirmed",
  "targetPropertyConfirmed",
  "connectorConfirmed",
  "entityOrListConfirmed",
  "internalFieldNamesConfirmed",
  "archiveValueConfirmed",
  "restoreValueConfirmed",
  "archiveBehaviorPassed",
  "restoreBehaviorPassed",
  "duplicateSubmissionProtectionPassed",
  "savingStateResetPassed",
  "failurePathPassed",
  "successNotificationPassed",
  "failureNotificationPassed",
  "retryAfterFailurePassed",
  "permanentDeleteAbsenceConfirmed"
] as const;

const TECHNICAL_OUTCOMES: readonly RecordLifecycleFormulaTechnicalReviewOutcome[] = [
  "Accepted",
  "Rejected",
  "Regeneration Required"
];

const STUDIO_OUTCOMES: readonly RecordLifecycleFormulaStudioValidationOutcome[] = [
  "Passed",
  "Failed"
];

const SINGLE_LINE_LIMITS = {
  evidenceId: 128,
  projectId: 200,
  assetId: 200,
  reviewContractVersion: 100,
  reviewContractChecksum: 200,
  reviewerDisplayName: 120,
  reviewerRole: 120,
  validationEnvironment: 240
} as const;

const MULTILINE_LIMIT = 2000;
// eslint-disable-next-line no-control-regex -- intentional persisted-evidence safety boundary.
const C0_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/;
// eslint-disable-next-line no-control-regex -- line breaks are handled separately for single-line fields.
const DISALLOWED_MULTILINE_CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const FORMULA_SOURCE_PATTERN = /\b(?:Patch|IfError|Notify|Set|Remove|RemoveIf)\s*\(/i;
const EVIDENCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const ISO_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/;

interface NormalizedEvidenceBase {
  evidenceId: string;
  projectId: string;
  assetId: string;
  reviewContractVersion: string;
  reviewContractChecksum: string;
  reviewerDisplayName: string;
  reviewerRole: string;
  recordedAt: string;
  notes?: string;
  rejectionReason?: string;
  regenerationReason?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function singleLineText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized || normalized.length > maxLength) return null;
  if (normalized.includes("\n") || C0_CONTROL_PATTERN.test(normalized)) return null;
  if (FORMULA_SOURCE_PATTERN.test(normalized)) return null;
  return normalized;
}

function evidenceIdText(value: unknown): string | null {
  const normalized = singleLineText(value, SINGLE_LINE_LIMITS.evidenceId);
  if (!normalized || !EVIDENCE_ID_PATTERN.test(normalized)) return null;
  return normalized;
}

function optionalMultilineText(value: unknown): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return undefined;
  if (normalized.length > MULTILINE_LIMIT) return null;
  if (DISALLOWED_MULTILINE_CONTROL_PATTERN.test(normalized)) return null;
  if (FORMULA_SOURCE_PATTERN.test(normalized)) return null;
  return normalized;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function recordedAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = ISO_TIMESTAMP_PATTERN.exec(trimmed);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zoneText, zoneHourText, zoneMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const zoneHour = zoneText === "Z" ? 0 : Number(zoneHourText);
  const zoneMinute = zoneText === "Z" ? 0 : Number(zoneMinuteText);
  if (
    month < 1
    || month > 12
    || day < 1
    || day > daysInMonth(year, month)
    || hour > 23
    || minute > 59
    || second > 59
    || zoneHour > 23
    || zoneMinute > 59
  ) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function optionalTextFields(input: Record<string, unknown>): Pick<NormalizedEvidenceBase, "notes" | "rejectionReason" | "regenerationReason"> | null {
  const notes = optionalMultilineText(input.notes);
  const rejectionReason = optionalMultilineText(input.rejectionReason);
  const regenerationReason = optionalMultilineText(input.regenerationReason);
  if (notes === null || rejectionReason === null || regenerationReason === null) return null;
  return {
    ...(notes === undefined ? {} : { notes }),
    ...(rejectionReason === undefined ? {} : { rejectionReason }),
    ...(regenerationReason === undefined ? {} : { regenerationReason })
  };
}

function baseFields(input: Record<string, unknown>): NormalizedEvidenceBase | null {
  const evidenceId = evidenceIdText(input.evidenceId);
  const projectId = singleLineText(input.projectId, SINGLE_LINE_LIMITS.projectId);
  const assetId = singleLineText(input.assetId, SINGLE_LINE_LIMITS.assetId);
  const reviewContractVersion = singleLineText(input.reviewContractVersion, SINGLE_LINE_LIMITS.reviewContractVersion);
  const reviewContractChecksum = singleLineText(input.reviewContractChecksum, SINGLE_LINE_LIMITS.reviewContractChecksum);
  const reviewerDisplayName = singleLineText(input.reviewerDisplayName, SINGLE_LINE_LIMITS.reviewerDisplayName);
  const reviewerRole = singleLineText(input.reviewerRole, SINGLE_LINE_LIMITS.reviewerRole);
  const normalizedRecordedAt = recordedAt(input.recordedAt);
  const optionalFields = optionalTextFields(input);
  if (
    !evidenceId
    || !projectId
    || assetId !== RECORD_LIFECYCLE_FORMULA_EVIDENCE_ASSET_ID
    || !reviewContractVersion
    || !reviewContractChecksum
    || !reviewerDisplayName
    || !reviewerRole
    || !normalizedRecordedAt
    || !optionalFields
  ) return null;
  return {
    evidenceId,
    projectId,
    assetId,
    reviewContractVersion,
    reviewContractChecksum,
    reviewerDisplayName,
    reviewerRole,
    recordedAt: normalizedRecordedAt,
    ...optionalFields
  };
}

function normalizeChecks(value: unknown): RecordLifecycleFormulaStudioValidationChecks | null {
  if (!isObject(value)) return null;
  const expectedKeys = new Set(RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS);
  if (Object.keys(value).some((key) => !expectedKeys.has(key as RecordLifecycleFormulaStudioValidationCheck))) return null;
  const entries = RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS.map((check) => {
    const candidate = value[check];
    return typeof candidate === "boolean" ? [check, candidate] as const : null;
  });
  if (entries.some((entry) => entry === null)) return null;
  return Object.fromEntries(entries as Array<readonly [RecordLifecycleFormulaStudioValidationCheck, boolean]>) as RecordLifecycleFormulaStudioValidationChecks;
}

function isStudioOutcomeConsistent(
  outcome: RecordLifecycleFormulaStudioValidationOutcome,
  checks: RecordLifecycleFormulaStudioValidationChecks
): boolean {
  const values = Object.values(checks);
  return outcome === "Passed"
    ? values.every((passed) => passed)
    : values.some((passed) => !passed);
}

function normalizeEvidenceRecord(input: unknown): RecordLifecycleFormulaReviewEvidenceRecord | null {
  if (!isObject(input)) return null;
  if (input.evidenceSchemaVersion !== RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION) return null;
  const base = baseFields(input);
  if (!base) return null;
  if (input.evidenceType === "Technical Review") {
    const outcome = input.outcome;
    if (!TECHNICAL_OUTCOMES.includes(outcome as RecordLifecycleFormulaTechnicalReviewOutcome)) return null;
    return {
      ...base,
      evidenceSchemaVersion: RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
      evidenceType: "Technical Review",
      outcome: outcome as RecordLifecycleFormulaTechnicalReviewOutcome
    };
  }
  if (input.evidenceType === "Power Apps Studio Validation") {
    const outcome = input.outcome;
    const validationEnvironment = singleLineText(input.validationEnvironment, SINGLE_LINE_LIMITS.validationEnvironment);
    const checks = normalizeChecks(input.checks);
    if (
      !STUDIO_OUTCOMES.includes(outcome as RecordLifecycleFormulaStudioValidationOutcome)
      || !validationEnvironment
      || !checks
      || !isStudioOutcomeConsistent(outcome as RecordLifecycleFormulaStudioValidationOutcome, checks)
    ) return null;
    return {
      ...base,
      evidenceSchemaVersion: RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
      evidenceType: "Power Apps Studio Validation",
      outcome: outcome as RecordLifecycleFormulaStudioValidationOutcome,
      validationEnvironment,
      checks
    };
  }
  return null;
}

export function normalizeRecordLifecycleFormulaReviewEvidence(input: unknown): RecordLifecycleFormulaReviewEvidenceRecord[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const records: RecordLifecycleFormulaReviewEvidenceRecord[] = [];
  for (const candidate of input) {
    const normalized = normalizeEvidenceRecord(candidate);
    if (!normalized || seen.has(normalized.evidenceId)) continue;
    seen.add(normalized.evidenceId);
    records.push(normalized);
  }
  return records;
}
