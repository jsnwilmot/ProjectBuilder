import { createProject, EMPTY_PROJECT_INTAKE } from "./createProject";
import type {
  ClientDetails,
  GeneratedDocument,
  ProjectIdentity,
  ProjectIntake,
  ProjectRecord,
  StorageState,
  StorageVersion
} from "../types/project";
import { PROJECT_STATUSES, REVIEW_STATUSES } from "../types/project";

export const CURRENT_STORAGE_VERSION: StorageVersion = 1;

export const EMPTY_STORAGE_STATE: StorageState = {
  version: CURRENT_STORAGE_VERSION,
  activeProjectId: null,
  projects: []
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeProject(value: unknown): ProjectRecord | null {
  if (!isObject(value) || !isObject(value.identity) || !isObject(value.client) || !isObject(value.intake)) {
    return null;
  }

  const identity = value.identity as Record<string, unknown>;
  const client = value.client as Record<string, unknown>;
  const intake = value.intake as Record<string, unknown>;
  const id = asString(identity.id);
  if (!id) return null;

  const generatedDocuments: GeneratedDocument[] = Array.isArray(value.generatedDocuments)
    ? value.generatedDocuments.flatMap((document) => {
        if (!isObject(document)) return [];
        const fileName = asString(document.fileName);
        const folder = asString(document.folder);
        const content = asString(document.content);
        return fileName ? [{ fileName, folder, content }] : [];
      })
    : [];

  const project = createProject({
    identity: {
      id,
      projectName: asString(identity.projectName)
    } satisfies ProjectIdentity,
    client: {
      clientName: asString(client.clientName),
      businessName: asString(client.businessName)
    } satisfies ClientDetails,
    intake: Object.fromEntries(
      Object.keys(EMPTY_PROJECT_INTAKE).map((field) => [field, asString(intake[field])])
    ) as unknown as ProjectIntake,
    generatedDocuments,
    status: PROJECT_STATUSES.includes(value.status as ProjectRecord["status"])
      ? value.status as ProjectRecord["status"]
      : "Intake Started",
    reviewStatus: REVIEW_STATUSES.includes(value.reviewStatus as ProjectRecord["reviewStatus"])
      ? value.reviewStatus as ProjectRecord["reviewStatus"]
      : "Not reviewed",
    now: asString(value.createdAt) || new Date().toISOString()
  });
  return {
    ...project,
    updatedAt: asString(value.updatedAt) || project.createdAt
  };
}

export function migrateStorageState(input: unknown): StorageState {
  if (!isObject(input) || input.version !== CURRENT_STORAGE_VERSION || !Array.isArray(input.projects)) {
    return { ...EMPTY_STORAGE_STATE, projects: [] };
  }

  const projects = input.projects.map(normalizeProject).filter((project): project is ProjectRecord => project !== null);
  const requestedActiveId = typeof input.activeProjectId === "string" ? input.activeProjectId : null;
  const activeProjectId = projects.some((project) => project.identity.id === requestedActiveId)
    ? requestedActiveId
    : projects[0]?.identity.id ?? null;

  return {
    version: CURRENT_STORAGE_VERSION,
    activeProjectId,
    projects
  };
}
