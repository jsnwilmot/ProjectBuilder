import { createProject as createProjectRecord, type CreateProjectOptions } from "./createProject";
import { applyProjectFieldChanges } from "./projectFields";
import {
  getGeneratedFileCount,
  getProjectDisplayStatus,
  getReadinessSections
} from "./projectSelectors";
import { EMPTY_STORAGE_STATE, migrateStorageState } from "./storageVersion";
import { getOutstandingFields } from "./validateIntake";
import {
  deriveReviewItems,
  getClientReviewReadiness,
  reviewItemBlocksReadiness,
  updateReviewItemDecision
} from "./clientReview";
import type {
  GeneratedDocument,
  ProjectInputField,
  ProjectRecord,
  ReadinessChecklistId,
  ReviewItem,
  StorageState
} from "../types/project";

export const STORAGE_KEY = "gpt-project-builder.storage.v1";
export const LEGACY_STORAGE_KEY = "gpt-project-builder:project:v1";

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const unavailableStorage: StorageAdapter = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
};

function browserStorage(): StorageAdapter {
  try {
    return window.localStorage;
  } catch {
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
    const state: StorageState = { version: 1, activeProjectId: project.identity.id, projects: [project] };
    saveStorageState(state, storage);
    storage.removeItem(LEGACY_STORAGE_KEY);
    return synchronizeStorageState(state);
  } catch {
    storage.removeItem(LEGACY_STORAGE_KEY);
    return null;
  }
}

export function loadStorageState(storage: StorageAdapter = browserStorage()): StorageState {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) return migrateLegacyProject(storage) ?? { ...EMPTY_STORAGE_STATE, projects: [] };
    return synchronizeStorageState(migrateStorageState(JSON.parse(stored)));
  } catch {
    // Corrupt or inaccessible browser storage must never prevent the app from loading.
    return { ...EMPTY_STORAGE_STATE, projects: [] };
  }
}

export function saveStorageState(state: StorageState, storage: StorageAdapter = browserStorage()): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(synchronizeStorageState(migrateStorageState(state))));
  } catch {
    // Storage can be unavailable or over quota; the caller remains in a safe in-memory state.
  }
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
    now
  }));
  saveStorageState({
    ...state,
    activeProjectId: duplicate.identity.id,
    projects: [...state.projects, duplicate]
  }, storage);
  return duplicate;
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

export function resetStorage(storage: StorageAdapter = browserStorage()): StorageState {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(LEGACY_STORAGE_KEY);
  return { ...EMPTY_STORAGE_STATE, projects: [] };
}
