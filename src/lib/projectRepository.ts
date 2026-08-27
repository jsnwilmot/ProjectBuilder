import { createProject as createProjectRecord, type CreateProjectOptions } from "./createProject";
import { applyProjectFieldChanges, getProjectFieldValue } from "./projectFields";
import {
  getGeneratedFileCount,
  getProjectDisplayStatus,
  getReadinessSections
} from "./projectSelectors";
import { CURRENT_STORAGE_VERSION, EMPTY_STORAGE_STATE, migrateStorageState } from "./storageVersion";
import { getOutstandingFields } from "./validateIntake";
import {
  deriveReviewItems,
  getClientReviewReadiness,
  reviewItemBlocksReadiness,
  updateReviewItemDecision
} from "./clientReview";
import { duplicatePowerPlatformForProject, normalizePowerPlatformData } from "./powerPlatform";
import {
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  validateProjectConfirmationProvenance,
  type ProjectConfirmationProvenance
} from "./projectConfirmationProvenance";
import {
  analyzeProjectConfirmationRevisionReconciliation,
  applicableProjectConfirmationSourceFieldIds,
  collectProjectConfirmationProvenanceIds,
  createInitialProjectConfirmationProvenance,
  materializeProjectConfirmationRevisionReconciliation
} from "./projectConfirmationRevisionReconciliation";
import {
  allocateProjectConfirmationUuids,
  type ProjectConfirmationUuidRuntime
} from "./projectConfirmationRuntime";
import {
  collectCanonicalUuidsFromParsedJson,
  cloneParsedJsonValue,
  parsedJsonStructurallyEqual,
  type ProjectConfirmationQuarantineSidecar
} from "./projectConfirmationQuarantine";
import { createEmptyProjectPlanningState } from "./planningProposals";
import { buildPlanningClarificationAnswerSchemaContext } from "./planningClarificationAnswerSchemaResolver";
import {
  finalizePlanningClarificationMaterialization,
  invalidProjectIdResult,
  persistenceFailedResult,
  preparePlanningClarificationMaterialization,
  projectChangedDuringMaterializationResult,
  projectNotFoundResult,
  unsupportedProjectTypeResult,
  type PlanningClarificationRepositoryInput,
  type PlanningClarificationRepositoryResult,
  type PlanningClarificationRepositoryRuntime
} from "./planningClarificationMaterialization";
import {
  finalizePlanningClarificationStaleMaterialization,
  invalidProjectIdStaleResult,
  persistenceFailedStaleResult,
  preparePlanningClarificationStaleMaterialization,
  projectChangedDuringStaleMaterializationResult,
  projectNotFoundStaleResult,
  unsupportedProjectTypeStaleResult,
  type PlanningClarificationStaleRepositoryInput,
  type PlanningClarificationStaleRepositoryResult,
  type PlanningClarificationStaleRepositoryRuntime
} from "./planningClarificationStaleMaterialization";
import {
  finalizePlanningClarificationReplacementMaterialization,
  invalidProjectIdReplacementResult,
  persistenceFailedReplacementResult,
  preparePlanningClarificationReplacementMaterialization,
  projectChangedDuringReplacementMaterializationResult,
  projectNotFoundReplacementResult,
  unsupportedProjectTypeReplacementResult,
  type PlanningClarificationReplacementRepositoryInput,
  type PlanningClarificationReplacementRepositoryResult,
  type PlanningClarificationReplacementRepositoryRuntime
} from "./planningClarificationReplacementMaterialization";
import {
  finalizePlanningClarificationDecisionMaterialization,
  invalidProjectIdDecisionResult,
  persistenceFailedDecisionResult,
  preparePlanningClarificationDecisionMaterialization,
  projectChangedDuringDecisionMaterializationResult,
  projectNotFoundDecisionResult,
  unsupportedProjectTypeDecisionResult,
  type PlanningClarificationDecisionRepositoryInput,
  type PlanningClarificationDecisionRepositoryResult,
  type PlanningClarificationDecisionRepositoryRuntime
} from "./planningClarificationDecisionMaterialization";
import {
  preparePlanningControlledApplyTransaction,
  type PlanningControlledApplyTransactionPreparationIssue,
  type ReadyPlanningControlledApplyTransactionPlan
} from "./planningControlledApplyTransactionPreparation";
import {
  finalizePlanningControlledApplyTransaction,
  type FinalizedPlanningControlledApplyTransactionEvidence,
  type PlanningControlledApplyTransactionFinalizationIssue,
  type PlanningControlledApplyTransactionFinalizationRuntime
} from "./planningControlledApplyTransactionFinalization";
import type { PlanningControlledApplyHistoryRecord } from "./planningControlledApplyHistory";
import type {
  GeneratedDocument,
  ProjectInputField,
  PowerPlatformProjectData,
  ProjectRecord,
  ReadinessChecklistId,
  ReviewItem,
  StorageState
} from "../types/project";

export const STORAGE_KEY = "gpt-project-builder.storage.v2";
export const PREVIOUS_STORAGE_KEY = "gpt-project-builder.storage.v1";
export const LEGACY_STORAGE_KEY = "gpt-project-builder:project:v1";

const STORAGE_UNAVAILABLE_WARNING = "Saving is currently unavailable in this browser context. Keep this tab open to avoid losing unsaved changes.";
const STORAGE_WRITE_WARNING = "We could not save project changes to browser storage. Free local storage space or check browser privacy settings.";
const STORAGE_MIGRATION_WARNING = "Project data is available read-only because storage migration could not be completed.";
const PROVENANCE_WRITE_WARNING = "Project changes could not be saved because confirmation provenance could not be preserved safely.";

let persistenceWarning: string | null = null;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const REPOSITORY_MIGRATION_ISSUE_CODES = Object.freeze([
  "storageUnavailable",
  "storageReadFailed",
  "storageParseFailed",
  "unsupportedStorageVersion",
  "uuidUnavailable",
  "uuidInvalid",
  "uuidCollision",
  "migrationValidationFailed",
  "migrationSerializationFailed",
  "migrationWriteFailed"
] as const);

export type RepositoryMigrationIssueCode = (typeof REPOSITORY_MIGRATION_ISSUE_CODES)[number];

export interface RepositoryPersistenceRuntime extends ProjectConfirmationUuidRuntime {
  readonly serialize?: (value: unknown) => string;
}

export interface RepositoryReadStatus {
  readonly writeMode: "readWrite" | "blocked";
  readonly issueCodes: readonly RepositoryMigrationIssueCode[];
  readonly quarantinedProjectIds: readonly string[];
}

interface RepositoryReadSnapshot extends RepositoryReadStatus {
  readonly state: StorageState;
  readonly rawCurrentStorage: string | null;
  readonly quarantines: ReadonlyMap<string, ProjectConfirmationQuarantineSidecar>;
}

type RepositoryWriteIntent =
  | { readonly kind: "generic" }
  | { readonly kind: "create"; readonly projectId: string }
  | { readonly kind: "duplicate"; readonly projectId: string; readonly sourceProjectId: string }
  | { readonly kind: "delete"; readonly projectId: string }
  | { readonly kind: "ordinaryUpdate"; readonly projectId: string }
  | { readonly kind: "archiveRestore"; readonly projectId: string }
  | { readonly kind: "activeProjectOnly" }
  | { readonly kind: "planning"; readonly projectId: string }
  | { readonly kind: "controlledApply"; readonly projectId: string };

export type PlanningControlledApplyRepositoryIssueCode =
  | "invalidProjectId"
  | "storageUnavailable"
  | "storageReadFailed"
  | "corruptStorage"
  | "storageVersionMismatch"
  | "noncanonicalStorage"
  | "ambiguousProjectIdentity"
  | "preparationBlocked"
  | "snapshotUnavailable"
  | "projectChangedDuringApply"
  | "destinationChangedDuringApply"
  | "finalizationBlocked"
  | "finalizationStateMismatch"
  | "finalizationEvidenceMismatch"
  | "candidateValidationFailed"
  | "projectChangedBeforeWrite"
  | "destinationChangedBeforeWrite"
  | "storageChangedBeforeWrite"
  | "writeSerializationFailed"
  | "persistenceFailed";

export interface PlanningControlledApplyRepositoryIssue {
  readonly code: PlanningControlledApplyRepositoryIssueCode;
  readonly message: string;
  readonly preparationIssues?: readonly PlanningControlledApplyTransactionPreparationIssue[];
  readonly finalizationIssues?: readonly PlanningControlledApplyTransactionFinalizationIssue[];
}

export interface PlanningControlledApplyRepositorySuccessEvidence {
  readonly projectId: string;
  readonly proposalId: string;
  readonly decisionId: string;
  readonly fieldKey: ProjectInputField;
  readonly applyId: string;
  readonly appliedAt: string;
  readonly historyOutcome: "changed" | "unchanged";
}

export interface PlanningControlledApplyRepositoryAlreadyAppliedEvidence {
  readonly projectId: string;
  readonly proposalId: string;
  readonly decisionId: string;
  readonly fieldKey: ProjectInputField;
  readonly existingApplyId: string;
}

export type PlanningControlledApplyRepositoryResult =
  | {
      readonly outcome: "appliedChanged" | "appliedUnchanged";
      readonly issues: readonly [];
      readonly evidence: PlanningControlledApplyRepositorySuccessEvidence;
    }
  | {
      readonly outcome: "alreadyApplied";
      readonly issues: readonly [];
      readonly evidence: PlanningControlledApplyRepositoryAlreadyAppliedEvidence;
    }
  | {
      readonly outcome: "blocked";
      readonly issues: readonly PlanningControlledApplyRepositoryIssue[];
      readonly evidence?: undefined;
    }
  | {
      readonly outcome: "projectNotFound";
      readonly projectId: string;
      readonly issues: readonly [];
      readonly evidence?: undefined;
    }
  | {
      readonly outcome: "persistenceFailed";
      readonly issues: readonly PlanningControlledApplyRepositoryIssue[];
      readonly evidence?: undefined;
    };

const unavailableStorage: StorageAdapter = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
};

function setPersistenceWarning(message: string | null): void {
  persistenceWarning = message;
}

export function getPersistenceWarning(): string | null {
  return persistenceWarning;
}

export function clearPersistenceWarning(): void {
  persistenceWarning = null;
}

function browserStorage(): StorageAdapter {
  try {
    return window.localStorage;
  } catch {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return unavailableStorage;
  }
}

function synchronizeDerivedFields(project: ProjectRecord): ProjectRecord {
  const reviewItems = deriveReviewItems(project);
  const reviewProject = { ...project, reviewItems };
  const unresolvedReviewFields = [...new Set(
    reviewItems.filter(reviewItemBlocksReadiness).map((item) => item.fieldKey)
  )];
  const synchronized = {
    ...reviewProject,
    generatedFileCount: getGeneratedFileCount(reviewProject),
    outstandingQuestions: unresolvedReviewFields.length > 0
      ? unresolvedReviewFields
      : getOutstandingFields(reviewProject),
    readinessSections: getReadinessSections(reviewProject)
  };
  const readiness = getClientReviewReadiness(synchronized);
  return {
    ...synchronized,
    status: getProjectDisplayStatus(synchronized),
    reviewStatus: readiness.isReady ? "Approved" : synchronized.reviewStatus
  };
}

function synchronizeStorageState(state: StorageState): StorageState {
  return {
    ...state,
    projects: state.projects.map(synchronizeDerivedFields)
  };
}

function cloneControlledApplyHistory(
  history: ProjectRecord["controlledApplyHistory"]
): ProjectRecord["controlledApplyHistory"] {
  return history.map((record) => ({
    ...record,
    sourceIds: [...record.sourceIds]
  }));
}

function emptySnapshot(
  writeMode: RepositoryReadStatus["writeMode"] = "readWrite",
  issueCodes: readonly RepositoryMigrationIssueCode[] = []
): RepositoryReadSnapshot {
  return {
    state: { ...EMPTY_STORAGE_STATE, projects: [] },
    writeMode,
    issueCodes,
    quarantinedProjectIds: [],
    quarantines: new Map(),
    rawCurrentStorage: null
  };
}

function blockedSnapshot(
  state: StorageState,
  issueCode: RepositoryMigrationIssueCode,
  rawCurrentStorage: string | null
): RepositoryReadSnapshot {
  setPersistenceWarning(STORAGE_MIGRATION_WARNING);
  return {
    state,
    writeMode: "blocked",
    issueCodes: Object.freeze([issueCode]),
    quarantinedProjectIds: [],
    quarantines: new Map(),
    rawCurrentStorage
  };
}

function readStorageValue(
  storage: StorageAdapter,
  key: string
): { outcome: "read"; value: string | null } | { outcome: "blocked" } {
  try {
    return { outcome: "read", value: storage.getItem(key) };
  } catch {
    return { outcome: "blocked" };
  }
}

function repositorySerialize(value: unknown, runtime: RepositoryPersistenceRuntime): string {
  return (runtime.serialize ?? JSON.stringify)(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLegacyStorageVersion(value: unknown): value is 1 | 2 | 3 | 4 | 5 | 6 {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6;
}

function prepareLegacyStorage7Candidate(
  legacyInput: unknown,
  runtime: RepositoryPersistenceRuntime
): { outcome: "ready"; state: StorageState } | { outcome: "blocked"; issueCode: RepositoryMigrationIssueCode } {
  const normalized = synchronizeStorageState(migrateStorageState(legacyInput));
  if (isRecord(legacyInput)) {
    const rawProjects = Array.isArray(legacyInput.projects) ? legacyInput.projects : [];
    const normalizedIds = normalized.projects.map((project) => project.identity.id);
    if (
      rawProjects.length !== normalized.projects.length ||
      new Set(normalizedIds).size !== normalizedIds.length
    ) {
      return { outcome: "blocked", issueCode: "migrationValidationFailed" };
    }
  }
  const revisionCount = normalized.projects.reduce(
    (count, project) => count + applicableProjectConfirmationSourceFieldIds(project.intake.appType).length,
    0
  );
  const allocation = allocateProjectConfirmationUuids(revisionCount, runtime);
  if (allocation.outcome === "blocked") return allocation;

  let allocationIndex = 0;
  const projects: ProjectRecord[] = [];
  for (const project of normalized.projects) {
    const count = applicableProjectConfirmationSourceFieldIds(project.intake.appType).length;
    const initialized = createInitialProjectConfirmationProvenance(
      project.intake.appType,
      allocation.values.slice(allocationIndex, allocationIndex + count)
    );
    if (initialized.outcome === "blocked") {
      return { outcome: "blocked", issueCode: "migrationValidationFailed" };
    }
    allocationIndex += count;
    projects.push({ ...project, confirmationProvenance: initialized.provenance });
  }

  const state: StorageState = { ...normalized, version: CURRENT_STORAGE_VERSION, projects };
  return validateCanonicalStorage7State(state)
    ? { outcome: "ready", state }
    : { outcome: "blocked", issueCode: "migrationValidationFailed" };
}

function validateCanonicalStorage7State(state: StorageState): boolean {
  if (state.version !== CURRENT_STORAGE_VERSION) return false;
  const projectIds = new Set<string>();
  for (const project of state.projects) {
    if (!project.identity.id || projectIds.has(project.identity.id)) return false;
    projectIds.add(project.identity.id);
    const validation = validateProjectConfirmationProvenance(project.confirmationProvenance, {
      projectId: project.identity.id,
      applicableSourceFieldIds: applicableProjectConfirmationSourceFieldIds(project.intake.appType)
    });
    if (validation.outcome !== "valid") return false;
  }
  return true;
}

function readStorage7Snapshot(raw: string, parsed: Record<string, unknown>): RepositoryReadSnapshot {
  const state = synchronizeStorageState(migrateStorageState(parsed));
  const rawProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
  const normalizedIds = state.projects.map((project) => project.identity.id);
  if (
    rawProjects.length !== state.projects.length ||
    new Set(normalizedIds).size !== normalizedIds.length
  ) {
    return blockedSnapshot(state, "migrationValidationFailed", raw);
  }

  const quarantines = new Map<string, ProjectConfirmationQuarantineSidecar>();
  for (const project of state.projects) {
    const matching = rawProjects.filter((candidate) =>
      isRecord(candidate) && isRecord(candidate.identity) && candidate.identity.id === project.identity.id
    );
    if (matching.length !== 1) return blockedSnapshot(state, "migrationValidationFailed", raw);
    const rawProject = matching[0] as Record<string, unknown>;
    const present = Object.prototype.hasOwnProperty.call(rawProject, "confirmationProvenance");
    const validation = validateProjectConfirmationProvenance(rawProject.confirmationProvenance, {
      projectId: project.identity.id,
      applicableSourceFieldIds: applicableProjectConfirmationSourceFieldIds(project.intake.appType)
    });
    if (validation.outcome === "quarantined") {
      quarantines.set(project.identity.id, {
        projectId: project.identity.id,
        rawProvenancePropertyPresent: present,
        ...(present ? { rawProvenance: cloneParsedJsonValue(rawProject.confirmationProvenance) } : {}),
        issueCodes: validation.issueCodes,
        provenanceWritesBlocked: true,
        wholeProjectWriteDisposition: "preserveRawProvenanceExactlyOrBlock"
      });
    }
  }

  setPersistenceWarning(null);
  return {
    state,
    writeMode: "readWrite",
    issueCodes: [],
    quarantinedProjectIds: Object.freeze([...quarantines.keys()]),
    quarantines,
    rawCurrentStorage: raw
  };
}

function persistLegacyMigration(
  legacyInput: unknown,
  readableLegacyState: StorageState,
  rawCurrentStorage: string | null,
  sourceKey: string,
  storage: StorageAdapter,
  runtime: RepositoryPersistenceRuntime
): RepositoryReadSnapshot {
  const prepared = prepareLegacyStorage7Candidate(legacyInput, runtime);
  if (prepared.outcome === "blocked") {
    return blockedSnapshot(readableLegacyState, prepared.issueCode, rawCurrentStorage);
  }

  let serialized: string;
  let parsed: Record<string, unknown>;
  try {
    serialized = repositorySerialize(prepared.state, runtime);
    const roundTrip = JSON.parse(serialized);
    if (!isRecord(roundTrip)) throw new Error("Invalid serialized storage state.");
    parsed = roundTrip;
    if (!validateCanonicalStorage7State(migrateStorageState(parsed))) {
      return blockedSnapshot(readableLegacyState, "migrationValidationFailed", rawCurrentStorage);
    }
  } catch {
    return blockedSnapshot(readableLegacyState, "migrationSerializationFailed", rawCurrentStorage);
  }

  try {
    storage.setItem(STORAGE_KEY, serialized);
  } catch {
    return blockedSnapshot(readableLegacyState, "migrationWriteFailed", rawCurrentStorage);
  }

  if (sourceKey !== STORAGE_KEY) {
    try {
      storage.removeItem(sourceKey);
    } catch {
      // The canonical current key is authoritative; a retained legacy copy is harmless.
    }
  }
  return readStorage7Snapshot(serialized, parsed);
}

function readParsedStorageState(
  raw: string,
  sourceKey: string,
  storage: StorageAdapter,
  runtime: RepositoryPersistenceRuntime
): RepositoryReadSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return blockedSnapshot({ ...EMPTY_STORAGE_STATE, projects: [] }, "storageParseFailed", sourceKey === STORAGE_KEY ? raw : null);
  }
  if (!isRecord(parsed)) {
    return blockedSnapshot({ ...EMPTY_STORAGE_STATE, projects: [] }, "storageParseFailed", sourceKey === STORAGE_KEY ? raw : null);
  }
  if (parsed.version === CURRENT_STORAGE_VERSION) return readStorage7Snapshot(raw, parsed);
  if (!isLegacyStorageVersion(parsed.version)) {
    return blockedSnapshot({ ...EMPTY_STORAGE_STATE, projects: [] }, "unsupportedStorageVersion", sourceKey === STORAGE_KEY ? raw : null);
  }

  const normalized = synchronizeStorageState(migrateStorageState(parsed));
  const readableLegacyState: StorageState = { ...normalized, version: parsed.version };
  return persistLegacyMigration(
    parsed,
    readableLegacyState,
    sourceKey === STORAGE_KEY ? raw : null,
    sourceKey,
    storage,
    runtime
  );
}

function readLegacyProjectState(
  raw: string,
  storage: StorageAdapter,
  runtime: RepositoryPersistenceRuntime
): RepositoryReadSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return blockedSnapshot({ ...EMPTY_STORAGE_STATE, projects: [] }, "storageParseFailed", null);
  }
  if (!isRecord(parsed) || !isRecord(parsed.intake)) {
    return blockedSnapshot({ ...EMPTY_STORAGE_STATE, projects: [] }, "storageParseFailed", null);
  }
  const metadata = isRecord(parsed.metadata) ? parsed.metadata : {};
  const intakeRecord = parsed.intake as Record<string, unknown>;
  const appName = typeof intakeRecord.appName === "string" ? intakeRecord.appName : "";
  const clientName = typeof intakeRecord.clientName === "string" ? intakeRecord.clientName : "";
  const businessName = typeof intakeRecord.businessName === "string" ? intakeRecord.businessName : "";
  const intake = Object.fromEntries(
    Object.entries(intakeRecord).filter(([key]) => !["appName", "clientName", "businessName"].includes(key))
  ) as Record<string, string>;
  const project = createProjectRecord({
    identity: {
      id: typeof metadata.id === "string" ? metadata.id : undefined,
      projectName: appName
    },
    client: { clientName, businessName },
    intake,
    status: metadata.status as ProjectRecord["status"] | undefined,
    reviewStatus: metadata.reviewStatus as ProjectRecord["reviewStatus"] | undefined,
    now: typeof metadata.lastUpdated === "string" ? metadata.lastUpdated : undefined
  });
  const legacyState: StorageState = { version: 1, activeProjectId: project.identity.id, projects: [project] };
  const readable = { ...synchronizeStorageState(migrateStorageState(legacyState)), version: 1 as const };
  return persistLegacyMigration(legacyState, readable, null, LEGACY_STORAGE_KEY, storage, runtime);
}

function readRepositorySnapshot(
  storage: StorageAdapter,
  runtime: RepositoryPersistenceRuntime = {}
): RepositoryReadSnapshot {
  if (storage === unavailableStorage) {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return emptySnapshot("blocked", ["storageUnavailable"]);
  }

  const current = readStorageValue(storage, STORAGE_KEY);
  if (current.outcome === "blocked") {
    return blockedSnapshot({ ...EMPTY_STORAGE_STATE, projects: [] }, "storageReadFailed", null);
  }
  if (current.value !== null) return readParsedStorageState(current.value, STORAGE_KEY, storage, runtime);

  const previous = readStorageValue(storage, PREVIOUS_STORAGE_KEY);
  if (previous.outcome === "blocked") {
    return blockedSnapshot({ ...EMPTY_STORAGE_STATE, projects: [] }, "storageReadFailed", null);
  }
  if (previous.value !== null) return readParsedStorageState(previous.value, PREVIOUS_STORAGE_KEY, storage, runtime);

  const legacy = readStorageValue(storage, LEGACY_STORAGE_KEY);
  if (legacy.outcome === "blocked") {
    return blockedSnapshot({ ...EMPTY_STORAGE_STATE, projects: [] }, "storageReadFailed", null);
  }
  if (legacy.value !== null) return readLegacyProjectState(legacy.value, storage, runtime);

  setPersistenceWarning(null);
  return emptySnapshot();
}

function registeredConfirmationValuesEqual(current: ProjectRecord, candidate: ProjectRecord): boolean {
  const currentCanvas = current.powerPlatform?.canvas;
  const candidateCanvas = candidate.powerPlatform?.canvas;
  return currentCanvas?.fullScreenYamlRequired === candidateCanvas?.fullScreenYamlRequired &&
    currentCanvas?.controlLevelYamlRequired === candidateCanvas?.controlLevelYamlRequired &&
    currentCanvas?.containerYamlRequired === candidateCanvas?.containerYamlRequired &&
    currentCanvas?.componentYamlRequired === candidateCanvas?.componentYamlRequired &&
    currentCanvas?.paYamlSourceRequired === candidateCanvas?.paYamlSourceRequired &&
    currentCanvas?.expectedInstallationMethod === candidateCanvas?.expectedInstallationMethod &&
    currentCanvas?.existingSourceAvailability === candidateCanvas?.existingSourceAvailability;
}

function provenanceStructurallyEqual(
  current: ProjectConfirmationProvenance | undefined,
  candidate: ProjectConfirmationProvenance | undefined
): boolean {
  return parsedJsonStructurallyEqual(current, candidate);
}

function intentAllowsAddition(intent: RepositoryWriteIntent, projectId: string): boolean {
  return (intent.kind === "create" || intent.kind === "duplicate") && intent.projectId === projectId;
}

function intentAllowsDeletion(intent: RepositoryWriteIntent, projectId: string): boolean {
  return intent.kind === "delete" && intent.projectId === projectId;
}

function serializeStateWithQuarantines(
  state: StorageState,
  snapshot: RepositoryReadSnapshot,
  runtime: RepositoryPersistenceRuntime
): { outcome: "serialized"; value: string } | { outcome: "blocked" } {
  let serializable: Record<string, unknown>;
  try {
    serializable = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  } catch {
    return { outcome: "blocked" };
  }
  const projects = Array.isArray(serializable.projects) ? serializable.projects : [];

  for (const quarantine of snapshot.quarantines.values()) {
    const project = projects.find((candidate) =>
      isRecord(candidate) && isRecord(candidate.identity) && candidate.identity.id === quarantine.projectId
    );
    if (!project || !isRecord(project)) continue;
    if (quarantine.rawProvenancePropertyPresent) {
      project.confirmationProvenance = cloneParsedJsonValue(quarantine.rawProvenance);
    } else {
      delete project.confirmationProvenance;
    }
  }

  let value: string;
  let roundTrip: unknown;
  try {
    value = repositorySerialize(serializable, runtime);
    roundTrip = JSON.parse(value);
  } catch {
    return { outcome: "blocked" };
  }
  if (!isRecord(roundTrip) || roundTrip.version !== CURRENT_STORAGE_VERSION || !Array.isArray(roundTrip.projects)) {
    return { outcome: "blocked" };
  }

  for (const quarantine of snapshot.quarantines.values()) {
    const project = roundTrip.projects.find((candidate) =>
      isRecord(candidate) && isRecord(candidate.identity) && candidate.identity.id === quarantine.projectId
    );
    if (!project || !isRecord(project)) continue;
    const present = Object.prototype.hasOwnProperty.call(project, "confirmationProvenance");
    if (present !== quarantine.rawProvenancePropertyPresent) return { outcome: "blocked" };
    if (present && !parsedJsonStructurallyEqual(project.confirmationProvenance, quarantine.rawProvenance)) {
      return { outcome: "blocked" };
    }
  }
  return { outcome: "serialized", value };
}

function writeCurrentStorageState(
  state: StorageState,
  storage: StorageAdapter,
  intent: RepositoryWriteIntent,
  runtime: RepositoryPersistenceRuntime = {}
): boolean {
  if (storage === unavailableStorage) {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return false;
  }

  if (state.version !== CURRENT_STORAGE_VERSION) {
    if (intent.kind !== "generic") {
      setPersistenceWarning(STORAGE_MIGRATION_WARNING);
      return false;
    }
    const current = readStorageValue(storage, STORAGE_KEY);
    if (current.outcome === "blocked") {
      setPersistenceWarning(STORAGE_MIGRATION_WARNING);
      return false;
    }
    if (current.value !== null) {
      try {
        const parsed = JSON.parse(current.value) as { version?: unknown };
        if (parsed.version === CURRENT_STORAGE_VERSION) {
          setPersistenceWarning(PROVENANCE_WRITE_WARNING);
          return false;
        }
      } catch {
        setPersistenceWarning(STORAGE_MIGRATION_WARNING);
        return false;
      }
    }
    const readable = { ...synchronizeStorageState(migrateStorageState(state)), version: state.version };
    const migrated = persistLegacyMigration(state, readable, current.value, STORAGE_KEY, storage, runtime);
    return migrated.writeMode === "readWrite" && migrated.rawCurrentStorage !== null;
  }

  const snapshot = readRepositorySnapshot(storage, runtime);
  if (snapshot.writeMode === "blocked") {
    setPersistenceWarning(STORAGE_MIGRATION_WARNING);
    return false;
  }

  const originalProjects = new Map(state.projects.map((project) => [project.identity.id, project]));
  const normalized: StorageState = {
    ...state,
    projects: state.projects.map((project) => ({ ...project }))
  };
  const candidateIds = normalized.projects.map((project) => project.identity.id);
  if (new Set(candidateIds).size !== candidateIds.length) {
    setPersistenceWarning(PROVENANCE_WRITE_WARNING);
    return false;
  }

  const baselineById = new Map(snapshot.state.projects.map((project) => [project.identity.id, project]));
  const candidateById = new Map(normalized.projects.map((project) => [project.identity.id, project]));
  for (const project of snapshot.state.projects) {
    if (!candidateById.has(project.identity.id) && !intentAllowsDeletion(intent, project.identity.id)) {
      setPersistenceWarning(PROVENANCE_WRITE_WARNING);
      return false;
    }
  }

  const analyses = new Map<
    string,
    Extract<ReturnType<typeof analyzeProjectConfirmationRevisionReconciliation>, { outcome: "ready" }>
  >();
  let requiredUuidCount = 0;
  const forbiddenUuids = new Set<string>();
  snapshot.state.projects.forEach((project) => {
    collectProjectConfirmationProvenanceIds(project.confirmationProvenance).forEach((value) => forbiddenUuids.add(value));
  });

  for (const candidate of normalized.projects) {
    const current = baselineById.get(candidate.identity.id);
    const originalCandidate = originalProjects.get(candidate.identity.id) ?? candidate;
    if (!current) {
      if (!intentAllowsAddition(intent, candidate.identity.id)) {
        setPersistenceWarning(PROVENANCE_WRITE_WARNING);
        return false;
      }
      const validation = validateProjectConfirmationProvenance(originalCandidate.confirmationProvenance, {
        projectId: candidate.identity.id,
        applicableSourceFieldIds: applicableProjectConfirmationSourceFieldIds(candidate.intake.appType)
      });
      if (validation.outcome !== "valid" || validation.provenance.confirmationEvents.length !== 0) {
        setPersistenceWarning(PROVENANCE_WRITE_WARNING);
        return false;
      }
      candidate.confirmationProvenance = validation.provenance;
      continue;
    }

    const quarantine = snapshot.quarantines.get(current.identity.id);
    if (quarantine) {
      if (
        current.intake.appType !== candidate.intake.appType ||
        !registeredConfirmationValuesEqual(current, candidate) ||
        originalCandidate.confirmationProvenance !== undefined
      ) {
        setPersistenceWarning(PROVENANCE_WRITE_WARNING);
        return false;
      }
      delete candidate.confirmationProvenance;
      continue;
    }

    if (!provenanceStructurallyEqual(current.confirmationProvenance, originalCandidate.confirmationProvenance)) {
      setPersistenceWarning(PROVENANCE_WRITE_WARNING);
      return false;
    }
    const analysis = analyzeProjectConfirmationRevisionReconciliation(current, candidate);
    if (analysis.outcome === "blocked") {
      setPersistenceWarning(PROVENANCE_WRITE_WARNING);
      return false;
    }
    analyses.set(candidate.identity.id, analysis);
    requiredUuidCount += analysis.requiredUuidCount;
  }

  const allocation = allocateProjectConfirmationUuids(requiredUuidCount, runtime, forbiddenUuids);
  if (allocation.outcome === "blocked") {
    setPersistenceWarning(PROVENANCE_WRITE_WARNING);
    return false;
  }

  let allocationIndex = 0;
  for (const candidate of normalized.projects) {
    const analysis = analyses.get(candidate.identity.id);
    const current = baselineById.get(candidate.identity.id);
    if (!analysis || !current?.confirmationProvenance) continue;
    const revisionIds = allocation.values.slice(
      allocationIndex,
      allocationIndex + analysis.requiredUuidCount
    );
    allocationIndex += analysis.requiredUuidCount;
    const materialized = materializeProjectConfirmationRevisionReconciliation(
      current.confirmationProvenance,
      analysis,
      revisionIds
    );
    if (materialized.outcome === "blocked") {
      setPersistenceWarning(PROVENANCE_WRITE_WARNING);
      return false;
    }
    candidate.confirmationProvenance = materialized.provenance;
  }

  const nonQuarantinedState: StorageState = { ...normalized, projects: normalized.projects };
  for (const project of nonQuarantinedState.projects) {
    if (snapshot.quarantines.has(project.identity.id)) continue;
    const validation = validateProjectConfirmationProvenance(project.confirmationProvenance, {
      projectId: project.identity.id,
      applicableSourceFieldIds: applicableProjectConfirmationSourceFieldIds(project.intake.appType)
    });
    if (validation.outcome !== "valid") {
      setPersistenceWarning(PROVENANCE_WRITE_WARNING);
      return false;
    }
  }

  const serialized = serializeStateWithQuarantines(nonQuarantinedState, snapshot, runtime);
  if (serialized.outcome === "blocked") {
    setPersistenceWarning(STORAGE_WRITE_WARNING);
    return false;
  }

  const currentGuard = readStorageValue(storage, STORAGE_KEY);
  if (currentGuard.outcome === "blocked" || currentGuard.value !== snapshot.rawCurrentStorage) {
    setPersistenceWarning(STORAGE_WRITE_WARNING);
    return false;
  }
  try {
    storage.setItem(STORAGE_KEY, serialized.value);
    setPersistenceWarning(null);
    return true;
  } catch {
    setPersistenceWarning(STORAGE_WRITE_WARNING);
    return false;
  }
}

export function getRepositoryReadStatus(
  storage: StorageAdapter = browserStorage(),
  runtime: RepositoryPersistenceRuntime = {}
): RepositoryReadStatus {
  const snapshot = readRepositorySnapshot(storage, runtime);
  return {
    writeMode: snapshot.writeMode,
    issueCodes: snapshot.issueCodes,
    quarantinedProjectIds: snapshot.quarantinedProjectIds
  };
}

export function loadStorageState(
  storage: StorageAdapter = browserStorage(),
  runtime: RepositoryPersistenceRuntime = {}
): StorageState {
  return readRepositorySnapshot(storage, runtime).state;
}

export function saveStorageState(
  state: StorageState,
  storage: StorageAdapter = browserStorage(),
  runtime: RepositoryPersistenceRuntime = {}
): void {
  writeCurrentStorageState(state, storage, { kind: "generic" }, runtime);
}

export function listProjects(storage: StorageAdapter = browserStorage()): ProjectRecord[] {
  return [...loadStorageState(storage).projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProjectById(id: string, storage: StorageAdapter = browserStorage()): ProjectRecord | null {
  return loadStorageState(storage).projects.find((project) => project.identity.id === id) ?? null;
}

export function createProject(
  options: CreateProjectOptions = {},
  storage: StorageAdapter = browserStorage(),
  runtime: RepositoryPersistenceRuntime = {}
): ProjectRecord {
  const state = loadStorageState(storage, runtime);
  const draft = synchronizeDerivedFields(createProjectRecord(options));
  const applicableCount = applicableProjectConfirmationSourceFieldIds(draft.intake.appType).length;
  const allocation = allocateProjectConfirmationUuids(applicableCount, runtime);
  if (allocation.outcome === "blocked") {
    setPersistenceWarning(PROVENANCE_WRITE_WARNING);
    throw new Error("Project creation was blocked because confirmation provenance could not be initialized.");
  }
  const initialized = createInitialProjectConfirmationProvenance(draft.intake.appType, allocation.values);
  if (initialized.outcome === "blocked") {
    setPersistenceWarning(PROVENANCE_WRITE_WARNING);
    throw new Error("Project creation was blocked because confirmation provenance could not be initialized.");
  }
  const project = { ...draft, confirmationProvenance: initialized.provenance };
  const wrote = writeCurrentStorageState({
    ...state,
    version: CURRENT_STORAGE_VERSION,
    activeProjectId: project.identity.id,
    projects: [...state.projects, project]
  }, storage, { kind: "create", projectId: project.identity.id }, runtime);
  if (!wrote) throw new Error("Project creation could not be persisted.");
  return project;
}

export function duplicateProject(
  id: string,
  storage: StorageAdapter = browserStorage(),
  now = new Date().toISOString(),
  runtime: RepositoryPersistenceRuntime = {}
): ProjectRecord | null {
  const snapshot = readRepositorySnapshot(storage, runtime);
  const state = snapshot.state;
  const source = state.projects.find((project) => project.identity.id === id);
  if (!source) return null;

  const projectName = source.identity.projectName.trim() || "Untitled Project";
  const duplicateDraft = synchronizeDerivedFields(createProjectRecord({
    identity: { projectName: `${projectName} Copy` },
    client: { ...source.client },
    intake: { ...source.intake },
    reviewItems: source.reviewItems.map((item) => ({ ...item })),
    readinessConfirmations: { ...source.readinessConfirmations },
    packageGeneratedAt: null,
    status: "Intake Started",
    reviewStatus: "Review needed",
    sourceProjectId: source.identity.id,
    duplicatedAt: now,
    powerPlatform: duplicatePowerPlatformForProject(source.powerPlatform, source.intake.appType),
    now
  }));
  const forbidden = new Set(collectProjectConfirmationProvenanceIds(source.confirmationProvenance));
  collectCanonicalUuidsFromParsedJson(snapshot.quarantines.get(id)?.rawProvenance)
    .forEach((value) => forbidden.add(value));
  const applicableCount = applicableProjectConfirmationSourceFieldIds(duplicateDraft.intake.appType).length;
  const allocation = allocateProjectConfirmationUuids(applicableCount, runtime, forbidden);
  if (allocation.outcome === "blocked") {
    setPersistenceWarning(PROVENANCE_WRITE_WARNING);
    return null;
  }
  const initialized = createInitialProjectConfirmationProvenance(duplicateDraft.intake.appType, allocation.values);
  if (initialized.outcome === "blocked") {
    setPersistenceWarning(PROVENANCE_WRITE_WARNING);
    return null;
  }
  const duplicate = { ...duplicateDraft, confirmationProvenance: initialized.provenance };
  const duplicateWithPlanning = {
    ...duplicate,
    planning: createEmptyProjectPlanningState()
  };
  const wrote = writeCurrentStorageState({
    ...state,
    version: CURRENT_STORAGE_VERSION,
    activeProjectId: duplicateWithPlanning.identity.id,
    projects: [...state.projects, duplicateWithPlanning]
  }, storage, {
    kind: "duplicate",
    projectId: duplicateWithPlanning.identity.id,
    sourceProjectId: source.identity.id
  }, runtime);
  return wrote ? duplicateWithPlanning : null;
}

export type ProjectUpdate =
  | Partial<ProjectRecord>
  | ((current: ProjectRecord) => ProjectRecord);

export function updateProject(
  id: string,
  update: ProjectUpdate,
  storage: StorageAdapter = browserStorage(),
  runtime: RepositoryPersistenceRuntime = {}
): ProjectRecord | null {
  const state = loadStorageState(storage, runtime);
  const current = state.projects.find((project) => project.identity.id === id);
  if (!current) return null;

  const preservedControlledApplyHistory = cloneControlledApplyHistory(current.controlledApplyHistory);
  const candidate = typeof update === "function"
    ? update(current)
    : {
        ...current,
        ...update,
        identity: { ...current.identity, ...update.identity },
        client: { ...current.client, ...update.client },
        intake: { ...current.intake, ...update.intake }
      };
  const updated = synchronizeDerivedFields({
    ...candidate,
    identity: { ...candidate.identity, id: current.identity.id },
    controlledApplyHistory: preservedControlledApplyHistory,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString()
  });
  const wrote = writeCurrentStorageState({
    ...state,
    projects: state.projects.map((project) => project.identity.id === id ? updated : project)
  }, storage, { kind: "ordinaryUpdate", projectId: id }, runtime);
  return wrote ? getProjectById(id, storage) : null;
}

export function updateProjectFields(
  id: string,
  changes: Partial<Record<ProjectInputField, string>>,
  storage: StorageAdapter = browserStorage(),
  runtime: RepositoryPersistenceRuntime = {}
): ProjectRecord | null {
  return updateProject(id, (project) => {
    const updated = applyProjectFieldChanges(project, changes);
    return {
      ...updated,
      packageGeneratedAt: null,
      reviewStatus: "Review needed",
      status: project.generatedDocuments.length > 0 ? "Needs Review" : "Intake Started"
    };
  }, storage, runtime);
}

export function updateProjectPowerPlatform(
  id: string,
  updater: (current: PowerPlatformProjectData | undefined, project: ProjectRecord) => PowerPlatformProjectData | undefined,
  storage: StorageAdapter = browserStorage(),
  runtime: RepositoryPersistenceRuntime = {}
): ProjectRecord | null {
  return updateProject(id, (project) => {
    const nextPowerPlatform = updater(project.powerPlatform, project);
    return {
      ...project,
      powerPlatform: normalizePowerPlatformData(nextPowerPlatform, project.intake.appType),
      packageGeneratedAt: null,
      reviewStatus: "Review needed",
      status: project.generatedDocuments.length > 0 ? "Needs Review" : "Intake Started"
    };
  }, storage, runtime);
}

export function saveGeneratedDocuments(
  id: string,
  documents: GeneratedDocument[],
  storage: StorageAdapter = browserStorage()
): ProjectRecord | null {
  return updateProject(id, {
    generatedDocuments: documents,
    generatedFileCount: documents.length,
    packageGeneratedAt: new Date().toISOString(),
    status: "Project Package Generated",
    reviewStatus: "Review needed"
  }, storage);
}

export function updateReviewItem(
  id: string,
  reviewItemId: string,
  changes: Partial<Pick<ReviewItem, "status" | "notApplicableReason" | "deferredReason">>,
  storage: StorageAdapter = browserStorage()
): ProjectRecord | null {
  return updateProject(id, (project) => ({
    ...project,
    reviewItems: deriveReviewItems(project).map((item) =>
      item.id === reviewItemId ? updateReviewItemDecision(item, changes) : item
    ),
    packageGeneratedAt: null,
    reviewStatus: "In review",
    status: project.generatedDocuments.length > 0 ? "Needs Review" : project.status
  }), storage);
}

export function updateReadinessConfirmation(
  id: string,
  checklistId: ReadinessChecklistId,
  checked: boolean,
  storage: StorageAdapter = browserStorage()
): ProjectRecord | null {
  return updateProject(id, (project) => ({
    ...project,
    readinessConfirmations: {
      ...project.readinessConfirmations,
      [checklistId]: checked
    },
    packageGeneratedAt: null,
    reviewStatus: "In review",
    status: project.generatedDocuments.length > 0 ? "Needs Review" : project.status
  }), storage);
}

export function deleteProject(id: string, storage: StorageAdapter = browserStorage()): StorageState {
  const state = loadStorageState(storage);
  const projects = state.projects.filter((project) => project.identity.id !== id);
  const activeProjectId = state.activeProjectId === id
    ? [...projects]
      .filter((project) => !project.archivedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.identity.id ?? null
    : state.activeProjectId;
  const next = { ...state, activeProjectId, projects };
  const wrote = writeCurrentStorageState(next, storage, { kind: "delete", projectId: id });
  return wrote ? next : state;
}

export function archiveProject(
  id: string,
  storage: StorageAdapter = browserStorage(),
  now = new Date().toISOString()
): ProjectRecord | null {
  const state = loadStorageState(storage);
  const current = state.projects.find((project) => project.identity.id === id);
  if (!current) return null;

  const archived = { ...current, archivedAt: now, updatedAt: now };
  const projects = state.projects.map((project) => project.identity.id === id ? archived : project);
  const activeProjectId = state.activeProjectId === id
    ? [...projects]
      .filter((project) => !project.archivedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.identity.id ?? null
    : state.activeProjectId;
  const wrote = writeCurrentStorageState(
    { ...state, activeProjectId, projects },
    storage,
    { kind: "archiveRestore", projectId: id }
  );
  return wrote ? archived : null;
}

export function restoreProject(
  id: string,
  storage: StorageAdapter = browserStorage(),
  now = new Date().toISOString()
): ProjectRecord | null {
  const state = loadStorageState(storage);
  const current = state.projects.find((project) => project.identity.id === id);
  if (!current) return null;

  const restored = { ...current, archivedAt: null, updatedAt: now };
  const wrote = writeCurrentStorageState({
    ...state,
    projects: state.projects.map((project) => project.identity.id === id ? restored : project)
  }, storage, { kind: "archiveRestore", projectId: id });
  return wrote ? restored : null;
}

export function setActiveProject(id: string, storage: StorageAdapter = browserStorage()): ProjectRecord | null {
  const state = loadStorageState(storage);
  const project = state.projects.find((candidate) => candidate.identity.id === id);
  if (!project) return null;
  const wrote = writeCurrentStorageState(
    { ...state, activeProjectId: id },
    storage,
    { kind: "activeProjectOnly" }
  );
  return wrote ? project : null;
}

export function getActiveProject(storage: StorageAdapter = browserStorage()): ProjectRecord | null {
  const state = loadStorageState(storage);
  return state.projects.find((project) => project.identity.id === state.activeProjectId) ?? null;
}

export async function materializeProjectPlanningClarifications(
  projectId: string,
  input: unknown,
  storage: StorageAdapter = browserStorage(),
  runtime: PlanningClarificationRepositoryRuntime = {}
): Promise<PlanningClarificationRepositoryResult> {
  if (
    typeof projectId !== "string" ||
    projectId.trim().length === 0 ||
    projectId.length > 200 ||
    /[\r\n]/.test(projectId)
  ) {
    return invalidProjectIdResult(typeof projectId === "string" ? projectId : "");
  }

  const baselineState = loadStorageState(storage);
  const baselineProject = baselineState.projects.find((project) => project.identity.id === projectId);
  if (!baselineProject) {
    return projectNotFoundResult(projectId);
  }
  if (baselineProject.intake.appType !== "powerAppsCanvas") {
    return unsupportedProjectTypeResult(projectId);
  }

  const baselineSnapshot = JSON.stringify(baselineProject);
  const preparation = await preparePlanningClarificationMaterialization(
    projectId,
    baselineProject.planning ?? createEmptyProjectPlanningState(),
    input as PlanningClarificationRepositoryInput
  );
  if (preparation.kind === "blocked" || preparation.kind === "unchanged") {
    return preparation.result;
  }

  const latestState = loadStorageState(storage);
  const latestProject = latestState.projects.find((project) => project.identity.id === projectId);
  if (!latestProject || JSON.stringify(latestProject) !== baselineSnapshot) {
    return projectChangedDuringMaterializationResult(projectId);
  }

  const finalized = finalizePlanningClarificationMaterialization(preparation, runtime);
  if (!finalized.planning || !finalized.materializedAt || finalized.result.outcome !== "persisted") {
    return finalized.result;
  }

  const updatedProject: ProjectRecord = {
    ...latestProject,
    planning: finalized.planning,
    createdAt: latestProject.createdAt,
    updatedAt: finalized.materializedAt
  };
  const wrote = writeCurrentStorageState({
    ...latestState,
    projects: latestState.projects.map((project) => project.identity.id === projectId ? updatedProject : project)
  }, storage, { kind: "planning", projectId });
  return wrote ? finalized.result : persistenceFailedResult(projectId);
}

export async function materializeProjectPlanningClarificationStaleTransitions(
  projectId: string,
  input: unknown,
  storage: StorageAdapter = browserStorage(),
  runtime: PlanningClarificationStaleRepositoryRuntime = {}
): Promise<PlanningClarificationStaleRepositoryResult> {
  if (
    typeof projectId !== "string" ||
    projectId.trim().length === 0 ||
    projectId.length > 200 ||
    /[\r\n]/.test(projectId)
  ) {
    return invalidProjectIdStaleResult(typeof projectId === "string" ? projectId : "");
  }

  const baselineState = loadStorageState(storage);
  const baselineProject = baselineState.projects.find((project) => project.identity.id === projectId);
  if (!baselineProject) {
    return projectNotFoundStaleResult(projectId);
  }
  if (baselineProject.intake.appType !== "powerAppsCanvas") {
    return unsupportedProjectTypeStaleResult(projectId);
  }

  const baselineSnapshot = JSON.stringify(baselineProject);
  const preparation = await preparePlanningClarificationStaleMaterialization(
    projectId,
    baselineProject.planning ?? createEmptyProjectPlanningState(),
    input as PlanningClarificationStaleRepositoryInput
  );
  if (preparation.kind === "blocked" || preparation.kind === "unchanged") {
    return preparation.result;
  }

  const latestState = loadStorageState(storage);
  const latestProject = latestState.projects.find((project) => project.identity.id === projectId);
  if (!latestProject || JSON.stringify(latestProject) !== baselineSnapshot) {
    return projectChangedDuringStaleMaterializationResult(projectId);
  }

  const finalized = finalizePlanningClarificationStaleMaterialization(preparation, runtime);
  if (!finalized.planning || !finalized.materializedAt || finalized.result.outcome !== "persisted") {
    return finalized.result;
  }

  const updatedProject: ProjectRecord = {
    ...latestProject,
    planning: finalized.planning,
    createdAt: latestProject.createdAt,
    updatedAt: finalized.materializedAt
  };
  const wrote = writeCurrentStorageState({
    ...latestState,
    projects: latestState.projects.map((project) => project.identity.id === projectId ? updatedProject : project)
  }, storage, { kind: "planning", projectId });
  return wrote ? finalized.result : persistenceFailedStaleResult(projectId);
}

export async function materializeProjectPlanningClarificationReplacements(
  projectId: string,
  input: unknown,
  storage: StorageAdapter = browserStorage(),
  runtime: PlanningClarificationReplacementRepositoryRuntime = {}
): Promise<PlanningClarificationReplacementRepositoryResult> {
  if (
    typeof projectId !== "string" ||
    projectId.trim().length === 0 ||
    projectId.length > 200 ||
    /[\r\n]/.test(projectId)
  ) {
    return invalidProjectIdReplacementResult(typeof projectId === "string" ? projectId : "");
  }

  const baselineState = loadStorageState(storage);
  const baselineProject = baselineState.projects.find((project) => project.identity.id === projectId);
  if (!baselineProject) {
    return projectNotFoundReplacementResult(projectId);
  }
  if (baselineProject.intake.appType !== "powerAppsCanvas") {
    return unsupportedProjectTypeReplacementResult(projectId);
  }

  const baselineSnapshot = JSON.stringify(baselineProject);
  const preparation = await preparePlanningClarificationReplacementMaterialization(
    projectId,
    baselineProject.planning ?? createEmptyProjectPlanningState(),
    input as PlanningClarificationReplacementRepositoryInput
  );
  if (preparation.kind === "blocked" || preparation.kind === "unchanged") {
    return preparation.result;
  }

  const latestState = loadStorageState(storage);
  const latestProject = latestState.projects.find((project) => project.identity.id === projectId);
  if (!latestProject || JSON.stringify(latestProject) !== baselineSnapshot) {
    return projectChangedDuringReplacementMaterializationResult(projectId);
  }

  const finalized = await finalizePlanningClarificationReplacementMaterialization(preparation, runtime);
  if (!finalized.planning || !finalized.materializedAt || finalized.result.outcome !== "persisted") {
    return finalized.result;
  }

  const updatedProject: ProjectRecord = {
    ...latestProject,
    planning: finalized.planning,
    createdAt: latestProject.createdAt,
    updatedAt: finalized.materializedAt
  };
  const wrote = writeCurrentStorageState({
    ...latestState,
    projects: latestState.projects.map((project) => project.identity.id === projectId ? updatedProject : project)
  }, storage, { kind: "planning", projectId });
  return wrote ? finalized.result : persistenceFailedReplacementResult(projectId);
}

export async function materializeProjectPlanningClarificationHumanDecision(
  projectId: string,
  input: unknown,
  storage: StorageAdapter = browserStorage(),
  runtime: PlanningClarificationDecisionRepositoryRuntime = {}
): Promise<PlanningClarificationDecisionRepositoryResult> {
  if (
    typeof projectId !== "string" ||
    projectId.trim().length === 0 ||
    projectId.length > 200 ||
    /[\r\n]/.test(projectId)
  ) {
    return invalidProjectIdDecisionResult(typeof projectId === "string" ? projectId : "");
  }

  const baselineState = loadStorageState(storage);
  const baselineProject = baselineState.projects.find((project) => project.identity.id === projectId);
  if (!baselineProject) {
    return projectNotFoundDecisionResult(projectId);
  }
  if (baselineProject.intake.appType !== "powerAppsCanvas") {
    return unsupportedProjectTypeDecisionResult(projectId);
  }

  const baselineSnapshot = JSON.stringify(baselineProject);
  const preparation = preparePlanningClarificationDecisionMaterialization(
    projectId,
    baselineProject.planning ?? createEmptyProjectPlanningState(),
    input as PlanningClarificationDecisionRepositoryInput,
    buildPlanningClarificationAnswerSchemaContext(baselineProject)
  );
  if (preparation.kind === "blocked") {
    return preparation.result;
  }

  const latestState = loadStorageState(storage);
  const latestProject = latestState.projects.find((project) => project.identity.id === projectId);
  if (!latestProject || JSON.stringify(latestProject) !== baselineSnapshot) {
    return projectChangedDuringDecisionMaterializationResult(projectId);
  }

  const finalized = finalizePlanningClarificationDecisionMaterialization(preparation, runtime);
  if (!finalized.planning || !finalized.materializedAt || finalized.result.outcome !== "persisted") {
    return finalized.result;
  }

  const updatedProject: ProjectRecord = {
    ...latestProject,
    planning: finalized.planning,
    createdAt: latestProject.createdAt,
    updatedAt: finalized.materializedAt
  };
  const wrote = writeCurrentStorageState({
    ...latestState,
    projects: latestState.projects.map((project) => project.identity.id === projectId ? updatedProject : project)
  }, storage, { kind: "planning", projectId });
  return wrote ? finalized.result : persistenceFailedDecisionResult(projectId);
}

interface ControlledCurrentStorageRead {
  state: StorageState;
  raw: string;
}

type ControlledCurrentStorageReadResult =
  | { outcome: "loaded"; value: ControlledCurrentStorageRead }
  | { outcome: "missing" }
  | { outcome: "blocked"; issue: PlanningControlledApplyRepositoryIssue };

type ControlledProjectResolution =
  | { outcome: "found"; project: ProjectRecord }
  | { outcome: "missing" }
  | { outcome: "ambiguous" };

type ControlledWriteResult =
  | { outcome: "written" }
  | { outcome: "blocked"; issue: PlanningControlledApplyRepositoryIssue }
  | { outcome: "persistenceFailed"; issue: PlanningControlledApplyRepositoryIssue };

function controlledIssue(
  code: PlanningControlledApplyRepositoryIssueCode,
  message: string,
  details: Partial<Pick<PlanningControlledApplyRepositoryIssue, "preparationIssues" | "finalizationIssues">> = {}
): PlanningControlledApplyRepositoryIssue {
  return { code, message, ...details };
}

function controlledBlocked(
  issue: PlanningControlledApplyRepositoryIssue
): PlanningControlledApplyRepositoryResult {
  return { outcome: "blocked", issues: [issue] };
}

function controlledProjectNotFound(projectId: string): PlanningControlledApplyRepositoryResult {
  return { outcome: "projectNotFound", projectId, issues: [] };
}

function readControlledCurrentStorageState(storage: StorageAdapter): ControlledCurrentStorageReadResult {
  if (storage === unavailableStorage) {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return {
      outcome: "blocked",
      issue: controlledIssue("storageUnavailable", "Controlled Apply cannot read browser storage in this context.")
    };
  }

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return {
      outcome: "blocked",
      issue: controlledIssue("storageReadFailed", "Controlled Apply could not read the current repository state.")
    };
  }
  if (raw === null) return { outcome: "missing" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      outcome: "blocked",
      issue: controlledIssue("corruptStorage", "Controlled Apply found corrupt JSON in the current repository state.")
    };
  }
  if (!isPlainRecord(parsed)) {
    return {
      outcome: "blocked",
      issue: controlledIssue("corruptStorage", "Controlled Apply requires the current repository state to be a JSON object.")
    };
  }
  if (parsed.version !== CURRENT_STORAGE_VERSION) {
    return {
      outcome: "blocked",
      issue: controlledIssue("storageVersionMismatch", `Controlled Apply requires storage version ${CURRENT_STORAGE_VERSION}.`)
    };
  }

  let normalized: StorageState;
  let normalizedPersisted: StorageState;
  try {
    normalized = migrateStorageState(parsed);
    normalizedPersisted = JSON.parse(JSON.stringify(normalized)) as StorageState;
  } catch {
    return {
      outcome: "blocked",
      issue: controlledIssue("noncanonicalStorage", "Controlled Apply could not validate the current repository state as canonical.")
    };
  }
  if (!structurallyEquivalent(parsed, normalizedPersisted)) {
    return {
      outcome: "blocked",
      issue: controlledIssue("noncanonicalStorage", "Controlled Apply requires a canonical current-version repository state.")
    };
  }

  return { outcome: "loaded", value: { state: normalizedPersisted, raw } };
}

function readControlledRawStorageValue(
  storage: StorageAdapter
): { outcome: "read"; raw: string | null } | { outcome: "blocked"; issue: PlanningControlledApplyRepositoryIssue } {
  if (storage === unavailableStorage) {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return {
      outcome: "blocked",
      issue: controlledIssue("storageUnavailable", "Controlled Apply cannot complete its final storage guard in this context.")
    };
  }
  try {
    return { outcome: "read", raw: storage.getItem(STORAGE_KEY) };
  } catch {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return {
      outcome: "blocked",
      issue: controlledIssue("storageReadFailed", "Controlled Apply could not complete its final storage guard.")
    };
  }
}

function resolveControlledProject(state: StorageState, projectId: string): ControlledProjectResolution {
  const matches = state.projects.filter((project) => project.identity.id === projectId);
  if (matches.length === 0) return { outcome: "missing" };
  if (matches.length !== 1) return { outcome: "ambiguous" };
  return { outcome: "found", project: matches[0] };
}

function serializeControlledProject(project: ProjectRecord): string | null {
  try {
    const serialized = JSON.stringify(project);
    return typeof serialized === "string" ? serialized : null;
  } catch {
    return null;
  }
}

function cloneControlledHistory(
  history: readonly PlanningControlledApplyHistoryRecord[]
): PlanningControlledApplyHistoryRecord[] {
  return history.map((record) => ({ ...record, sourceIds: [...record.sourceIds] }));
}

function cloneControlledPreparationIssues(
  issues: readonly PlanningControlledApplyTransactionPreparationIssue[]
): PlanningControlledApplyTransactionPreparationIssue[] {
  return issues.map((entry) => ({
    ...entry,
    destinationIssues: entry.destinationIssues?.map((destinationIssue) => ({
      ...destinationIssue,
      candidateIssues: destinationIssue.candidateIssues?.map((candidateIssue) => ({ ...candidateIssue }))
    })),
    historyIssues: entry.historyIssues?.map((historyIssue) => ({ ...historyIssue }))
  }));
}

function cloneControlledFinalizationIssues(
  issues: readonly PlanningControlledApplyTransactionFinalizationIssue[]
): PlanningControlledApplyTransactionFinalizationIssue[] {
  return issues.map((entry) => ({
    ...entry,
    preparationIssues: entry.preparationIssues
      ? cloneControlledPreparationIssues(entry.preparationIssues)
      : undefined,
    historyIssues: entry.historyIssues?.map((historyIssue) => ({ ...historyIssue }))
  }));
}

function cloneReadyControlledPlan(
  plan: ReadyPlanningControlledApplyTransactionPlan
): ReadyPlanningControlledApplyTransactionPlan {
  return { ...plan, sourceIds: [...plan.sourceIds] };
}

function buildChangedControlledProject(
  latestProject: ProjectRecord,
  evidence: FinalizedPlanningControlledApplyTransactionEvidence,
  candidateHistory: PlanningControlledApplyHistoryRecord[]
): ProjectRecord {
  const changed = applyProjectFieldChanges(latestProject, {
    [evidence.fieldKey]: evidence.appliedValue
  });
  const seeded: ProjectRecord = {
    ...changed,
    controlledApplyHistory: candidateHistory,
    updatedAt: evidence.appliedAt,
    packageGeneratedAt: null,
    status: latestProject.generatedDocuments.length > 0 ? "Needs Review" : "Intake Started",
    reviewStatus: "Review needed"
  };
  const reviewItems = deriveReviewItems(seeded, evidence.appliedAt);
  const reviewProject = { ...seeded, reviewItems };
  const unresolvedReviewFields = [...new Set(
    reviewItems.filter(reviewItemBlocksReadiness).map((item) => item.fieldKey)
  )];
  const derived: ProjectRecord = {
    ...reviewProject,
    generatedFileCount: getGeneratedFileCount(reviewProject),
    outstandingQuestions: unresolvedReviewFields.length > 0
      ? unresolvedReviewFields
      : getOutstandingFields(reviewProject),
    readinessSections: getReadinessSections(reviewProject)
  };
  return {
    ...derived,
    status: latestProject.generatedDocuments.length > 0 ? "Needs Review" : getProjectDisplayStatus(derived),
    reviewStatus: "Review needed"
  };
}

function validateChangedControlledProject(
  candidate: ProjectRecord,
  latestProject: ProjectRecord,
  evidence: FinalizedPlanningControlledApplyTransactionEvidence,
  candidateHistory: readonly PlanningControlledApplyHistoryRecord[]
): boolean {
  const expectedIdentity = evidence.fieldKey === "appName"
    ? { ...latestProject.identity, projectName: evidence.appliedValue }
    : latestProject.identity;
  const expectedClient = evidence.fieldKey === "clientName" || evidence.fieldKey === "businessName"
    ? { ...latestProject.client, [evidence.fieldKey]: evidence.appliedValue }
    : latestProject.client;
  const expectedIntake = evidence.fieldKey !== "appName" &&
    evidence.fieldKey !== "clientName" &&
    evidence.fieldKey !== "businessName"
    ? { ...latestProject.intake, [evidence.fieldKey]: evidence.appliedValue }
    : latestProject.intake;
  const unresolvedReviewFields = [...new Set(
    candidate.reviewItems.filter(reviewItemBlocksReadiness).map((item) => item.fieldKey)
  )];
  const expectedOutstandingQuestions = unresolvedReviewFields.length > 0
    ? unresolvedReviewFields
    : getOutstandingFields(candidate);
  const expectedStatus = latestProject.generatedDocuments.length > 0
    ? "Needs Review"
    : getProjectDisplayStatus({
        ...candidate,
        status: "Intake Started",
        reviewStatus: "Review needed"
      });
  return candidate.identity.id === latestProject.identity.id &&
    structurallyEquivalent(candidate.identity, expectedIdentity) &&
    structurallyEquivalent(candidate.client, expectedClient) &&
    structurallyEquivalent(candidate.intake, expectedIntake) &&
    candidate.createdAt === latestProject.createdAt &&
    structurallyEquivalent(candidate.planning, latestProject.planning) &&
    structurallyEquivalent(candidate.powerPlatform, latestProject.powerPlatform) &&
    candidate.intake.appType === latestProject.intake.appType &&
    getProjectFieldValue(candidate, evidence.fieldKey) === evidence.appliedValue &&
    structurallyEquivalent(candidate.controlledApplyHistory, candidateHistory) &&
    candidate.updatedAt === evidence.appliedAt &&
    candidate.packageGeneratedAt === null &&
    structurallyEquivalent(candidate.generatedDocuments, latestProject.generatedDocuments) &&
    structurallyEquivalent(candidate.readinessConfirmations, latestProject.readinessConfirmations) &&
    candidate.reviewStatus === "Review needed" &&
    candidate.generatedFileCount === getGeneratedFileCount(candidate) &&
    structurallyEquivalent(candidate.readinessSections, getReadinessSections(candidate)) &&
    structurallyEquivalent(candidate.outstandingQuestions, expectedOutstandingQuestions) &&
    candidate.status === expectedStatus &&
    candidate.archivedAt === latestProject.archivedAt &&
    candidate.sourceProjectId === latestProject.sourceProjectId &&
    candidate.duplicatedAt === latestProject.duplicatedAt;
}

function buildUnchangedControlledProject(
  latestProject: ProjectRecord,
  evidence: FinalizedPlanningControlledApplyTransactionEvidence,
  candidateHistory: PlanningControlledApplyHistoryRecord[]
): ProjectRecord {
  return {
    ...latestProject,
    controlledApplyHistory: candidateHistory,
    updatedAt: evidence.appliedAt
  };
}

function validateUnchangedControlledProject(
  candidate: ProjectRecord,
  latestProject: ProjectRecord,
  evidence: FinalizedPlanningControlledApplyTransactionEvidence,
  candidateHistory: readonly PlanningControlledApplyHistoryRecord[]
): boolean {
  return structurallyEquivalent(candidate, {
    ...latestProject,
    controlledApplyHistory: cloneControlledHistory(candidateHistory),
    updatedAt: evidence.appliedAt
  });
}

function finalizedEvidenceMatchesBaseline(
  evidence: FinalizedPlanningControlledApplyTransactionEvidence,
  baseline: ReadyPlanningControlledApplyTransactionPlan
): boolean {
  return evidence.projectId === baseline.projectId &&
    evidence.proposalId === baseline.proposalId &&
    evidence.decisionId === baseline.decisionId &&
    evidence.fieldKey === baseline.fieldKey &&
    evidence.expectedProjectSnapshot === baseline.expectedProjectSnapshot &&
    evidence.expectedCurrentValue === baseline.expectedCurrentValue &&
    evidence.previousValue === baseline.previousValue &&
    evidence.appliedValue === baseline.appliedValue &&
    evidence.historyOutcome === baseline.historyOutcome &&
    sameStringArray(evidence.sourceIds, baseline.sourceIds) &&
    evidence.writeAuthorized === false &&
    evidence.readinessEligible === false &&
    evidence.outputEligible === false;
}

function sameStringArray(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function structurallyEquivalent(first: unknown, second: unknown): boolean {
  if (Object.is(first, second)) return true;
  if (Array.isArray(first) || Array.isArray(second)) {
    return Array.isArray(first) && Array.isArray(second) &&
      first.length === second.length &&
      first.every((value, index) => structurallyEquivalent(value, second[index]));
  }
  if (!isPlainRecord(first) || !isPlainRecord(second)) return false;
  const firstKeys = Object.keys(first).sort();
  const secondKeys = Object.keys(second).sort();
  return sameStringArray(firstKeys, secondKeys) &&
    firstKeys.every((key) => structurallyEquivalent(first[key], second[key]));
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function writeControlledCurrentStorageState(
  state: StorageState,
  storage: StorageAdapter,
  projectId: string
): ControlledWriteResult {
  if (storage === unavailableStorage) {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return {
      outcome: "blocked",
      issue: controlledIssue("storageUnavailable", "Controlled Apply cannot write browser storage in this context.")
    };
  }

  try {
    if (typeof JSON.stringify(state) !== "string") {
      throw new Error("Controlled Apply state serialization returned no value.");
    }
  } catch {
    return {
      outcome: "blocked",
      issue: controlledIssue("writeSerializationFailed", "Controlled Apply could not serialize the final repository state.")
    };
  }

  return writeCurrentStorageState(state, storage, { kind: "controlledApply", projectId })
    ? { outcome: "written" }
    : {
        outcome: "persistenceFailed",
        issue: controlledIssue("persistenceFailed", "Controlled Apply could not persist the repository transaction.")
      };
}

export function applyConfirmedPlanningProposal(
  projectId: string,
  proposalId: string,
  storage: StorageAdapter = browserStorage(),
  runtime: PlanningControlledApplyTransactionFinalizationRuntime = {}
): PlanningControlledApplyRepositoryResult {
  if (
    typeof projectId !== "string" ||
    projectId.trim().length === 0 ||
    projectId.length > 200 ||
    /[\r\n]/.test(projectId)
  ) {
    return controlledBlocked(controlledIssue(
      "invalidProjectId",
      "Controlled Apply requires a non-empty single-line project ID no longer than 200 characters."
    ));
  }

  const baselineRead = readControlledCurrentStorageState(storage);
  if (baselineRead.outcome === "missing") return controlledProjectNotFound(projectId);
  if (baselineRead.outcome === "blocked") return controlledBlocked(baselineRead.issue);
  const baselineResolution = resolveControlledProject(baselineRead.value.state, projectId);
  if (baselineResolution.outcome === "missing") return controlledProjectNotFound(projectId);
  if (baselineResolution.outcome === "ambiguous") {
    return controlledBlocked(controlledIssue(
      "ambiguousProjectIdentity",
      "Controlled Apply requires the target project ID to resolve exactly once."
    ));
  }

  const preparation = preparePlanningControlledApplyTransaction({
    project: baselineResolution.project,
    proposalId
  });
  if (preparation.outcome === "blocked") {
    return controlledBlocked(controlledIssue(
      "preparationBlocked",
      "Controlled Apply was blocked by transaction preparation.",
      { preparationIssues: cloneControlledPreparationIssues(preparation.issues) }
    ));
  }
  if (preparation.outcome === "alreadyApplied") {
    return {
      outcome: "alreadyApplied",
      issues: [],
      evidence: Object.freeze({
        projectId: preparation.plan.projectId,
        proposalId: preparation.plan.proposalId,
        decisionId: preparation.plan.decisionId,
        fieldKey: preparation.plan.fieldKey,
        existingApplyId: preparation.plan.existingApplyId
      })
    };
  }
  const baselinePlan = cloneReadyControlledPlan(preparation.plan);

  const latestRead = readControlledCurrentStorageState(storage);
  if (latestRead.outcome === "missing") return controlledProjectNotFound(projectId);
  if (latestRead.outcome === "blocked") return controlledBlocked(latestRead.issue);
  const latestResolution = resolveControlledProject(latestRead.value.state, projectId);
  if (latestResolution.outcome === "missing") return controlledProjectNotFound(projectId);
  if (latestResolution.outcome === "ambiguous") {
    return controlledBlocked(controlledIssue(
      "ambiguousProjectIdentity",
      "Controlled Apply requires the latest target project ID to resolve exactly once."
    ));
  }
  const latestProject = latestResolution.project;
  const latestSnapshot = serializeControlledProject(latestProject);
  if (latestSnapshot === null) {
    return controlledBlocked(controlledIssue(
      "snapshotUnavailable",
      "Controlled Apply could not serialize the latest target project snapshot."
    ));
  }
  if (latestSnapshot !== baselinePlan.expectedProjectSnapshot) {
    return controlledBlocked(controlledIssue(
      "projectChangedDuringApply",
      "The target project changed after Controlled Apply preparation."
    ));
  }
  if (getProjectFieldValue(latestProject, baselinePlan.fieldKey) !== baselinePlan.expectedCurrentValue) {
    return controlledBlocked(controlledIssue(
      "destinationChangedDuringApply",
      "The target destination changed after Controlled Apply preparation."
    ));
  }

  const finalization = finalizePlanningControlledApplyTransaction({ project: latestProject, proposalId }, runtime);
  if (finalization.outcome === "blocked") {
    return controlledBlocked(controlledIssue(
      "finalizationBlocked",
      "Controlled Apply was blocked by refreshed transaction finalization.",
      { finalizationIssues: cloneControlledFinalizationIssues(finalization.issues) }
    ));
  }
  if (finalization.outcome === "alreadyApplied") {
    return controlledBlocked(controlledIssue(
      "finalizationStateMismatch",
      "Controlled Apply finalization unexpectedly changed from ready to already applied."
    ));
  }
  const evidence = finalization.evidence;
  if (!finalizedEvidenceMatchesBaseline(evidence, baselinePlan)) {
    return controlledBlocked(controlledIssue(
      "finalizationEvidenceMismatch",
      "Controlled Apply finalization evidence does not match the guarded baseline evidence."
    ));
  }
  if (evidence.fieldKey === "appType") {
    return controlledBlocked(controlledIssue(
      "candidateValidationFailed",
      "Controlled Apply does not support project-type mutation."
    ));
  }

  const changedEligible = evidence.historyOutcome === "changed" &&
    evidence.destinationMutationRequired === true &&
    evidence.historyAppendRequired === true &&
    evidence.previousValue !== evidence.appliedValue;
  const unchangedEligible = evidence.historyOutcome === "unchanged" &&
    evidence.destinationMutationRequired === false &&
    evidence.historyAppendRequired === true &&
    evidence.previousValue === evidence.appliedValue &&
    evidence.expectedCurrentValue === evidence.appliedValue;
  if (!changedEligible && !unchangedEligible) {
    return controlledBlocked(controlledIssue(
      "candidateValidationFailed",
      "Controlled Apply finalization evidence does not authorize a valid changed or unchanged candidate."
    ));
  }

  const candidateHistory = cloneControlledHistory(evidence.candidateHistory);
  const candidateProject = changedEligible
    ? buildChangedControlledProject(latestProject, evidence, candidateHistory)
    : buildUnchangedControlledProject(latestProject, evidence, candidateHistory);
  const candidateValid = changedEligible
    ? validateChangedControlledProject(candidateProject, latestProject, evidence, candidateHistory)
    : validateUnchangedControlledProject(candidateProject, latestProject, evidence, candidateHistory);
  if (!candidateValid) {
    return controlledBlocked(controlledIssue(
      "candidateValidationFailed",
      "Controlled Apply candidate project validation failed."
    ));
  }

  const commitRead = readControlledCurrentStorageState(storage);
  if (commitRead.outcome === "missing") return controlledProjectNotFound(projectId);
  if (commitRead.outcome === "blocked") return controlledBlocked(commitRead.issue);
  const commitResolution = resolveControlledProject(commitRead.value.state, projectId);
  if (commitResolution.outcome === "missing") return controlledProjectNotFound(projectId);
  if (commitResolution.outcome === "ambiguous") {
    return controlledBlocked(controlledIssue(
      "ambiguousProjectIdentity",
      "Controlled Apply requires the commit target project ID to resolve exactly once."
    ));
  }
  const commitSnapshot = serializeControlledProject(commitResolution.project);
  if (commitSnapshot === null) {
    return controlledBlocked(controlledIssue(
      "snapshotUnavailable",
      "Controlled Apply could not serialize the commit target project snapshot."
    ));
  }
  if (commitSnapshot !== latestSnapshot) {
    return controlledBlocked(controlledIssue(
      "projectChangedBeforeWrite",
      "The target project changed before Controlled Apply persistence."
    ));
  }
  if (getProjectFieldValue(commitResolution.project, evidence.fieldKey) !== evidence.expectedCurrentValue) {
    return controlledBlocked(controlledIssue(
      "destinationChangedBeforeWrite",
      "The target destination changed before Controlled Apply persistence."
    ));
  }

  let replacementCount = 0;
  const finalState: StorageState = {
    ...commitRead.value.state,
    projects: commitRead.value.state.projects.map((project) => {
      if (project.identity.id !== projectId) return project;
      replacementCount += 1;
      return candidateProject;
    })
  };
  if (replacementCount !== 1 || finalState.version !== CURRENT_STORAGE_VERSION) {
    return controlledBlocked(controlledIssue(
      "candidateValidationFailed",
      "Controlled Apply could not construct a current-version state with exactly one target replacement."
    ));
  }

  const finalGuard = readControlledRawStorageValue(storage);
  if (finalGuard.outcome === "blocked") return controlledBlocked(finalGuard.issue);
  if (finalGuard.raw !== commitRead.value.raw) {
    return controlledBlocked(controlledIssue(
      "storageChangedBeforeWrite",
      "The repository storage value changed immediately before Controlled Apply persistence."
    ));
  }

  const write = writeControlledCurrentStorageState(finalState, storage, projectId);
  if (write.outcome === "blocked") return controlledBlocked(write.issue);
  if (write.outcome === "persistenceFailed") {
    return { outcome: "persistenceFailed", issues: [write.issue] };
  }

  const successEvidence = Object.freeze({
    projectId: evidence.projectId,
    proposalId: evidence.proposalId,
    decisionId: evidence.decisionId,
    fieldKey: evidence.fieldKey,
    applyId: evidence.applyId,
    appliedAt: evidence.appliedAt,
    historyOutcome: evidence.historyOutcome
  });
  return {
    outcome: changedEligible ? "appliedChanged" : "appliedUnchanged",
    issues: [],
    evidence: successEvidence
  };
}

export function resetStorage(storage: StorageAdapter = browserStorage()): StorageState {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(PREVIOUS_STORAGE_KEY);
  storage.removeItem(LEGACY_STORAGE_KEY);
  return { ...EMPTY_STORAGE_STATE, projects: [] };
}
