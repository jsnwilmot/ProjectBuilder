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
import { createEmptyProjectPlanningState } from "./planningProposals";
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

let persistenceWarning: string | null = null;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

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

function writeCurrentStorageState(state: StorageState, storage: StorageAdapter): boolean {
  if (storage === unavailableStorage) {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return false;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(synchronizeStorageState(migrateStorageState(state))));
    setPersistenceWarning(null);
    return true;
  } catch {
    setPersistenceWarning(STORAGE_WRITE_WARNING);
    return false;
  }
}

function migratePreviousVersionedState(storage: StorageAdapter): StorageState | null {
  const previousStored = storage.getItem(PREVIOUS_STORAGE_KEY);
  if (!previousStored) return null;

  let migrated: StorageState;
  try {
    migrated = synchronizeStorageState(migrateStorageState(JSON.parse(previousStored)));
  } catch {
    return null;
  }

  const wroteCurrentKey = writeCurrentStorageState(migrated, storage);
  if (wroteCurrentKey) {
    storage.removeItem(PREVIOUS_STORAGE_KEY);
  }

  return migrated;
}

function migrateLegacyProject(storage: StorageAdapter): StorageState | null {
  const legacy = storage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return null;
  try {
    const parsed = JSON.parse(legacy) as {
      intake?: Record<string, string>;
      metadata?: { id?: string; status?: ProjectRecord["status"]; reviewStatus?: ProjectRecord["reviewStatus"]; lastUpdated?: string };
    };
    if (!parsed.intake) return null;
    const { appName = "", clientName = "", businessName = "", ...intake } = parsed.intake;
    const project = createProjectRecord({
      identity: { id: parsed.metadata?.id, projectName: appName },
      client: { clientName, businessName },
      intake,
      status: parsed.metadata?.status,
      reviewStatus: parsed.metadata?.reviewStatus,
      now: parsed.metadata?.lastUpdated
    });
    const state: StorageState = {
      version: EMPTY_STORAGE_STATE.version,
      activeProjectId: project.identity.id,
      projects: [project]
    };
    const migrated = synchronizeStorageState(migrateStorageState(state));
    const wroteCurrentKey = writeCurrentStorageState(migrated, storage);
    if (wroteCurrentKey) {
      storage.removeItem(LEGACY_STORAGE_KEY);
    }
    return migrated;
  } catch {
    storage.removeItem(LEGACY_STORAGE_KEY);
    return null;
  }
}

export function loadStorageState(storage: StorageAdapter = browserStorage()): StorageState {
  const currentStored = storage.getItem(STORAGE_KEY);
  if (currentStored) {
    try {
      return synchronizeStorageState(migrateStorageState(JSON.parse(currentStored)));
    } catch {
      // Corrupt current storage returns a safe empty state. We do not auto-fallback to older keys in the same load.
      return { ...EMPTY_STORAGE_STATE, projects: [] };
    }
  }

  const previousMigrated = migratePreviousVersionedState(storage);
  if (previousMigrated) return previousMigrated;

  return migrateLegacyProject(storage) ?? { ...EMPTY_STORAGE_STATE, projects: [] };
}

export function saveStorageState(state: StorageState, storage: StorageAdapter = browserStorage()): void {
  writeCurrentStorageState(state, storage);
}

export function listProjects(storage: StorageAdapter = browserStorage()): ProjectRecord[] {
  return [...loadStorageState(storage).projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getProjectById(id: string, storage: StorageAdapter = browserStorage()): ProjectRecord | null {
  return loadStorageState(storage).projects.find((project) => project.identity.id === id) ?? null;
}

export function createProject(
  options: CreateProjectOptions = {},
  storage: StorageAdapter = browserStorage()
): ProjectRecord {
  const state = loadStorageState(storage);
  const project = synchronizeDerivedFields(createProjectRecord(options));
  saveStorageState({
    ...state,
    activeProjectId: project.identity.id,
    projects: [...state.projects, project]
  }, storage);
  return project;
}

export function duplicateProject(
  id: string,
  storage: StorageAdapter = browserStorage(),
  now = new Date().toISOString()
): ProjectRecord | null {
  const state = loadStorageState(storage);
  const source = state.projects.find((project) => project.identity.id === id);
  if (!source) return null;

  const projectName = source.identity.projectName.trim() || "Untitled Project";
  const duplicate = synchronizeDerivedFields(createProjectRecord({
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
  const duplicateWithPlanning = {
    ...duplicate,
    planning: createEmptyProjectPlanningState()
  };
  saveStorageState({
    ...state,
    activeProjectId: duplicateWithPlanning.identity.id,
    projects: [...state.projects, duplicateWithPlanning]
  }, storage);
  return duplicateWithPlanning;
}

export type ProjectUpdate =
  | Partial<ProjectRecord>
  | ((current: ProjectRecord) => ProjectRecord);

export function updateProject(
  id: string,
  update: ProjectUpdate,
  storage: StorageAdapter = browserStorage()
): ProjectRecord | null {
  const state = loadStorageState(storage);
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
  saveStorageState({
    ...state,
    projects: state.projects.map((project) => project.identity.id === id ? updated : project)
  }, storage);
  return updated;
}

export function updateProjectFields(
  id: string,
  changes: Partial<Record<ProjectInputField, string>>,
  storage: StorageAdapter = browserStorage()
): ProjectRecord | null {
  return updateProject(id, (project) => {
    const updated = applyProjectFieldChanges(project, changes);
    return {
      ...updated,
      packageGeneratedAt: null,
      reviewStatus: "Review needed",
      status: project.generatedDocuments.length > 0 ? "Needs Review" : "Intake Started"
    };
  }, storage);
}

export function updateProjectPowerPlatform(
  id: string,
  updater: (current: PowerPlatformProjectData | undefined, project: ProjectRecord) => PowerPlatformProjectData | undefined,
  storage: StorageAdapter = browserStorage()
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
  }, storage);
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
  saveStorageState(next, storage);
  return next;
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
  saveStorageState({ ...state, activeProjectId, projects }, storage);
  return archived;
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
  saveStorageState({
    ...state,
    projects: state.projects.map((project) => project.identity.id === id ? restored : project)
  }, storage);
  return restored;
}

export function setActiveProject(id: string, storage: StorageAdapter = browserStorage()): ProjectRecord | null {
  const state = loadStorageState(storage);
  const project = state.projects.find((candidate) => candidate.identity.id === id);
  if (!project) return null;
  saveStorageState({ ...state, activeProjectId: id }, storage);
  return project;
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
  }, storage);
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
  }, storage);
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
  }, storage);
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
    input as PlanningClarificationDecisionRepositoryInput
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
  }, storage);
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
    status: getProjectDisplayStatus(derived),
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
  const expectedStatus = getProjectDisplayStatus({
    ...candidate,
    status: latestProject.generatedDocuments.length > 0 ? "Needs Review" : "Intake Started",
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
  storage: StorageAdapter
): ControlledWriteResult {
  if (storage === unavailableStorage) {
    setPersistenceWarning(STORAGE_UNAVAILABLE_WARNING);
    return {
      outcome: "blocked",
      issue: controlledIssue("storageUnavailable", "Controlled Apply cannot write browser storage in this context.")
    };
  }

  let serialized: string;
  try {
    const candidate = JSON.stringify(state);
    if (typeof candidate !== "string") {
      return {
        outcome: "blocked",
        issue: controlledIssue("writeSerializationFailed", "Controlled Apply could not serialize the final repository state.")
      };
    }
    serialized = candidate;
  } catch {
    return {
      outcome: "blocked",
      issue: controlledIssue("writeSerializationFailed", "Controlled Apply could not serialize the final repository state.")
    };
  }

  try {
    storage.setItem(STORAGE_KEY, serialized);
    setPersistenceWarning(null);
    return { outcome: "written" };
  } catch {
    setPersistenceWarning(STORAGE_WRITE_WARNING);
    return {
      outcome: "persistenceFailed",
      issue: controlledIssue("persistenceFailed", "Controlled Apply could not persist the repository transaction.")
    };
  }
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

  const write = writeControlledCurrentStorageState(finalState, storage);
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
