import { createProject, EMPTY_PROJECT_INTAKE } from "./createProject";
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
import { isProjectType } from "../data/projectTypes";

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
  const normalizedIntake = Object.fromEntries(
    Object.keys(EMPTY_PROJECT_INTAKE).map((field) => [field, asString(intake[field])])
  ) as unknown as ProjectIntake;
  const storedProjectType = asString(intake.appType);
  normalizedIntake.appType = isProjectType(storedProjectType) ? storedProjectType : "";

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
