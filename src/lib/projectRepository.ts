import { createProject as createProjectRecord, type CreateProjectOptions } from "./createProject";
import { applyProjectFieldChanges } from "./projectFields";
import {
  getGeneratedFileCount,
  getProjectDisplayStatus,
  getReadinessSections
} from "./projectSelectors";
import { EMPTY_STORAGE_STATE, migrateStorageState } from "./storageVersion";
import { getOutstandingFields } from "./validateIntake";
import type {
  GeneratedDocument,
  ProjectInputField,
  ProjectRecord,
  StorageState
} from "../types/project";

export const STORAGE_KEY = "gpt-project-builder.storage.v1";
const LEGACY_STORAGE_KEY = "gpt-project-builder:project:v1";

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
  const synchronized = {
    ...project,
    generatedFileCount: getGeneratedFileCount(project),
    outstandingQuestions: getOutstandingFields(project),
    readinessSections: getReadinessSections(project)
  };
  return { ...synchronized, status: getProjectDisplayStatus(synchronized) };
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
    status: "Project Package Generated",
    reviewStatus: "Review needed"
  }, storage);
}

export function deleteProject(id: string, storage: StorageAdapter = browserStorage()): StorageState {
  const state = loadStorageState(storage);
  const projects = state.projects.filter((project) => project.identity.id !== id);
  const activeProjectId = state.activeProjectId === id
    ? [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.identity.id ?? null
    : state.activeProjectId;
  const next = { ...state, activeProjectId, projects };
  saveStorageState(next, storage);
  return next;
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
