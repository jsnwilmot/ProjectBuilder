import { createProject, EMPTY_PROJECT_INTAKE } from "./createProject";
import { normalizePlanningControlledApplyHistory } from "./planningControlledApplyHistory";
import { createEmptyProjectPlanningState, normalizeProjectPlanningState } from "./planningProposals";
import { normalizePowerPlatformData } from "./powerPlatform";
import type {
  ClientDetails,
  GeneratedDocument,
  ProjectIdentity,
  ProjectIntake,
  ProjectRecord,
  ReadinessConfirmations,
  ReviewItem,
  StorageState,
  StorageVersion
} from "../types/project";
import {
  CLIENT_REVIEW_SECTIONS,
  PROJECT_STATUSES,
  READINESS_CHECKLIST_IDS,
  REVIEW_ITEM_STATUSES,
  REVIEW_STATUSES
} from "../types/project";
import { normalizeProjectTypeValue } from "../data/projectTypes";

export const CURRENT_STORAGE_VERSION: StorageVersion = 5;

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

function normalizeReviewStatus(value: unknown): ProjectRecord["reviewStatus"] {
  if (value === "Needs review") return "Review needed";
  return REVIEW_STATUSES.includes(value as ProjectRecord["reviewStatus"])
    ? value as ProjectRecord["reviewStatus"]
    : "Not reviewed";
}

function normalizeReviewItems(value: unknown): ReviewItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!isObject(candidate)) return [];
    const fieldKey = asString(candidate.fieldKey) as ReviewItem["fieldKey"];
    const section = asString(candidate.section) as ReviewItem["section"];
    const status = asString(candidate.status) as ReviewItem["status"];
    const source = asString(candidate.source) as ReviewItem["source"];
    if (
      !asString(candidate.id)
      || !fieldKey
      || !CLIENT_REVIEW_SECTIONS.includes(section)
      || !REVIEW_ITEM_STATUSES.includes(status)
      || !["missing", "warning", "weak"].includes(source)
    ) return [];
    return [{
      id: asString(candidate.id),
      section,
      fieldKey,
      label: asString(candidate.label),
      reason: asString(candidate.reason),
      recommendedQuestion: asString(candidate.recommendedQuestion),
      status,
      notApplicableReason: asString(candidate.notApplicableReason),
      deferredReason: asString(candidate.deferredReason),
      blocking: candidate.blocking !== false,
      allowDeferred: candidate.allowDeferred === true,
      source,
      updatedAt: asString(candidate.updatedAt)
    }];
  });
}

function normalizeReadinessConfirmations(value: unknown): ReadinessConfirmations {
  if (!isObject(value)) return {};
  return Object.fromEntries(
    READINESS_CHECKLIST_IDS
      .filter((id) => typeof value[id] === "boolean")
      .map((id) => [id, value[id]])
  ) as ReadinessConfirmations;
}

function normalizeProject(value: unknown, sourceVersion: StorageVersion): ProjectRecord | null {
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
  const normalizedIntake = Object.fromEntries(
    Object.keys(EMPTY_PROJECT_INTAKE).map((field) => [field, asString(intake[field])])
  ) as unknown as ProjectIntake;
  const storedProjectType = asString(intake.appType);
  normalizedIntake.appType = normalizeProjectTypeValue(storedProjectType);

  const project = createProject({
    identity: {
      id,
      projectName: asString(identity.projectName)
    } satisfies ProjectIdentity,
    client: {
      clientName: asString(client.clientName),
      businessName: asString(client.businessName)
    } satisfies ClientDetails,
    intake: normalizedIntake,
    generatedDocuments,
    reviewItems: normalizeReviewItems(value.reviewItems),
    readinessConfirmations: normalizeReadinessConfirmations(value.readinessConfirmations),
    packageGeneratedAt: Object.prototype.hasOwnProperty.call(value, "packageGeneratedAt")
      ? asString(value.packageGeneratedAt) || null
      : generatedDocuments.length > 0
        ? asString(value.updatedAt) || asString(value.createdAt) || new Date().toISOString()
        : null,
    status: PROJECT_STATUSES.includes(value.status as ProjectRecord["status"])
      ? value.status as ProjectRecord["status"]
      : "Intake Started",
    reviewStatus: normalizeReviewStatus(value.reviewStatus),
    archivedAt: asString(value.archivedAt) || null,
    sourceProjectId: asString(value.sourceProjectId) || null,
    duplicatedAt: asString(value.duplicatedAt) || null,
    powerPlatform: normalizePowerPlatformData(value.powerPlatform, normalizedIntake.appType),
    now: asString(value.createdAt) || new Date().toISOString()
  });
  const planning = sourceVersion === 4 || sourceVersion === 5
    ? normalizeProjectPlanningState(value.planning, id).planning
    : createEmptyProjectPlanningState();
  const normalizedHistory = sourceVersion === CURRENT_STORAGE_VERSION
    ? normalizePlanningControlledApplyHistory({
        projectId: id,
        planning,
        history: value.controlledApplyHistory
      })
    : { outcome: "valid" as const, history: [] };

  return {
    ...project,
    planning,
    controlledApplyHistory: normalizedHistory.outcome === "valid"
      ? normalizedHistory.history.map((record) => ({ ...record, sourceIds: [...record.sourceIds] }))
      : [],
    updatedAt: asString(value.updatedAt) || project.createdAt
  };
}

function normalizeStateProjects(projectsValue: unknown, sourceVersion: StorageVersion): ProjectRecord[] {
  if (!Array.isArray(projectsValue)) return [];
  return projectsValue
    .map((project) => normalizeProject(project, sourceVersion))
    .filter((project): project is ProjectRecord => project !== null);
}

function finalizeState(
  version: StorageVersion,
  activeProjectId: unknown,
  projectsValue: unknown,
  sourceVersion: StorageVersion = version
): StorageState {
  const projects = normalizeStateProjects(projectsValue, sourceVersion);
  const requestedActiveId = typeof activeProjectId === "string" ? activeProjectId : null;
  const safeActiveProjectId = projects.some((project) => project.identity.id === requestedActiveId)
    ? requestedActiveId
    : projects.find((project) => !project.archivedAt)?.identity.id ?? null;

  return {
    version,
    activeProjectId: safeActiveProjectId,
    projects
  };
}

function migrateLegacyStorage(input: Record<string, unknown>): StorageState {
  // Pre-v5 migration preserves project data, normalizes legacy app-type labels,
  // and initializes safe optional Power Platform structures where applicable.
  return finalizeState(CURRENT_STORAGE_VERSION, input.activeProjectId, input.projects, input.version as StorageVersion);
}

export function migrateStorageState(input: unknown): StorageState {
  if (!isObject(input)) {
    return { ...EMPTY_STORAGE_STATE, projects: [] };
  }

  if (input.version === CURRENT_STORAGE_VERSION) {
    return finalizeState(CURRENT_STORAGE_VERSION, input.activeProjectId, input.projects);
  }

  if (input.version === 1 || input.version === 2 || input.version === 3 || input.version === 4) {
    return migrateLegacyStorage(input);
  }

  return { ...EMPTY_STORAGE_STATE, projects: [] };
}
