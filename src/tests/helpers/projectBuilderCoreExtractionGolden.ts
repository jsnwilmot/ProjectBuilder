import { createProject as createProjectRecord } from "../../lib/createProject";
import {
  PROJECT_CONFIRMATION_ACTION_ORIGIN,
  PROJECT_CONFIRMATION_ASSURANCE_TYPE,
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
  PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS,
  PROJECT_CONFIRMATION_VALUE_KIND,
  type ProjectConfirmationProvenance,
  type ProjectConfirmationSourceFieldId,
  type ProjectFieldConfirmationEvent
} from "../../lib/projectConfirmationProvenance";
import { createInitialProjectConfirmationProvenance } from "../../lib/projectConfirmationRevisionReconciliation";
import {
  deriveProjectConfirmationCurrentFields,
  type ProjectConfirmationRequest
} from "../../lib/projectConfirmationTransaction";
import { STORAGE_KEY, type ProjectConfirmationRepositoryRuntime, type RepositoryPersistenceRuntime, type StorageAdapter } from "../../lib/projectRepository";
import type { PowerPlatformCanvasData, ProjectRecord, ProjectType } from "../../types/project";

export const GOLDEN_TIMESTAMP_A = "2026-08-31T12:00:00.000Z";
export const GOLDEN_TIMESTAMP_B = "2026-08-31T12:05:00.000Z";
export const GOLDEN_ACTION_A = goldenUuid(300);
export const GOLDEN_ACTION_B = goldenUuid(301);
export const GOLDEN_ACTION_C = goldenUuid(302);

export const CANVAS_CONFIRMATION_VALUE_KEYS = [
  "fullScreenYamlRequired",
  "controlLevelYamlRequired",
  "containerYamlRequired",
  "componentYamlRequired",
  "paYamlSourceRequired",
  "expectedInstallationMethod",
  "existingSourceAvailability"
] as const satisfies readonly (keyof Pick<
  PowerPlatformCanvasData,
  | "fullScreenYamlRequired"
  | "controlLevelYamlRequired"
  | "containerYamlRequired"
  | "componentYamlRequired"
  | "paYamlSourceRequired"
  | "expectedInstallationMethod"
  | "existingSourceAvailability"
>)[];

export class GoldenMemoryStorage implements StorageAdapter {
  protected readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

export class GoldenControlledReadStorage extends GoldenMemoryStorage {
  private readonly readCounts = new Map<string, number>();
  readonly writtenKeys: string[] = [];
  onRead: ((key: string, count: number, storage: GoldenControlledReadStorage) => void) | null = null;

  override getItem(key: string): string | null {
    const count = (this.readCounts.get(key) ?? 0) + 1;
    this.readCounts.set(key, count);
    this.onRead?.(key, count, this);
    return super.getItem(key);
  }

  override setItem(key: string, value: string): void {
    this.writtenKeys.push(key);
    super.setItem(key, value);
  }

  replaceValue(key: string, value: string): void {
    this.values.set(key, value);
  }

  rawValue(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  resetObservations(): void {
    this.readCounts.clear();
    this.writtenKeys.length = 0;
  }
}

export function goldenUuid(index: number): string {
  return `10000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

export function sequenceRuntime(start = 1): RepositoryPersistenceRuntime & { calls: () => number } {
  let index = start;
  let calls = 0;
  return {
    uuid: () => {
      calls += 1;
      return goldenUuid(index++);
    },
    calls: () => calls
  };
}

export function confirmationRuntime(
  start: number,
  timestamp = GOLDEN_TIMESTAMP_A
): ProjectConfirmationRepositoryRuntime & { uuidCalls: () => number; timestampCalls: () => number } {
  let index = start;
  let uuidCalls = 0;
  let timestampCalls = 0;
  return {
    uuid: () => {
      uuidCalls += 1;
      return goldenUuid(index++);
    },
    now: () => {
      timestampCalls += 1;
      return timestamp;
    },
    uuidCalls: () => uuidCalls,
    timestampCalls: () => timestampCalls
  };
}

export function createGoldenProvenance(
  projectType: ProjectType,
  start = 1
): ProjectConfirmationProvenance {
  const revisionCount = projectType === "powerAppsCanvas" ? PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.length : 0;
  const result = createInitialProjectConfirmationProvenance(
    projectType,
    Array.from({ length: revisionCount }, (_, index) => goldenUuid(start + index))
  );
  if (result.outcome !== "materialized") throw new Error(`Golden provenance failed: ${result.issueCode}`);
  return result.provenance;
}

export function createGoldenProject(
  projectType: ProjectType,
  id: string,
  start = 1
): ProjectRecord {
  const project = createProjectRecord({
    identity: { id, projectName: id },
    intake: { appType: projectType, appPurpose: "Golden reference project" },
    confirmationProvenance: createGoldenProvenance(projectType, start),
    now: "2026-08-31T11:00:00.000Z"
  });
  if (projectType === "powerAppsCanvas") setGoldenCanvasValues(project);
  return project;
}

export function setGoldenCanvasValues(project: ProjectRecord, prefix = "Canvas value"): ProjectRecord {
  const canvas = project.powerPlatform?.canvas as unknown as Record<string, string> | undefined;
  if (!canvas) throw new Error("Golden Canvas values require a Canvas project.");
  CANVAS_CONFIRMATION_VALUE_KEYS.forEach((key, index) => {
    canvas[key] = `${prefix} ${index + 1}`;
  });
  return project;
}

export function seedGoldenStorage7(
  storage: StorageAdapter,
  projects: ProjectRecord[],
  activeProjectId = projects[0]?.identity.id ?? null
): string {
  const raw = JSON.stringify({ version: 7, activeProjectId, projects });
  storage.setItem(STORAGE_KEY, raw);
  return raw;
}

export function persistedGoldenState(
  storage: StorageAdapter
): { version: number; activeProjectId: string | null; projects: ProjectRecord[] } {
  return JSON.parse(storage.getItem(STORAGE_KEY)!) as {
    version: number;
    activeProjectId: string | null;
    projects: ProjectRecord[];
  };
}

export function persistedGoldenProject(storage: StorageAdapter, projectId: string): ProjectRecord {
  const project = persistedGoldenState(storage).projects.find((candidate) => candidate.identity.id === projectId);
  if (!project) throw new Error(`Missing persisted golden project ${projectId}`);
  return project;
}

export function goldenEventsFor(storage: StorageAdapter, projectId: string): readonly ProjectFieldConfirmationEvent[] {
  return persistedGoldenProject(storage, projectId).confirmationProvenance?.confirmationEvents ?? [];
}

export function rawGoldenProvenance(storage: StorageAdapter, projectId: string): unknown {
  return persistedGoldenState(storage).projects.find((project) => project.identity.id === projectId)?.confirmationProvenance;
}

export async function goldenConfirmationRequestFor(
  project: ProjectRecord,
  actionId = GOLDEN_ACTION_A,
  sourceIds: readonly ProjectConfirmationSourceFieldId[] = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS
): Promise<ProjectConfirmationRequest> {
  const current = await deriveProjectConfirmationCurrentFields(project);
  if (current.outcome !== "derived") throw new Error(`Current field derivation failed: ${current.issueCode}`);
  const currentById = new Map(current.fields.map((field) => [field.sourceFieldId, field] as const));
  const fields = sourceIds.map((sourceFieldId) => {
    const field = currentById.get(sourceFieldId);
    if (!field) throw new Error(`Missing golden source field ${sourceFieldId}`);
    return {
      sourceFieldId,
      expectedRevisionId: field.currentRevisionId,
      expectedValueFingerprint: field.currentValueFingerprint,
      expectedConfirmationHeadId: field.currentConfirmationHeadId
    };
  });
  return {
    projectId: project.identity.id,
    confirmationActionId: actionId,
    fields: fields as [ProjectConfirmationRequest["fields"][number], ...ProjectConfirmationRequest["fields"][number][]]
  };
}

export function goldenEvent(
  project: ProjectRecord,
  sourceFieldId = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0],
  overrides: Partial<ProjectFieldConfirmationEvent> = {}
): ProjectFieldConfirmationEvent {
  return {
    confirmationId: goldenUuid(800),
    confirmationContractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    projectId: project.identity.id,
    sourceFieldId,
    sourceFieldRevisionId: project.confirmationProvenance!.fieldRevisions[sourceFieldId]!.revisionId,
    valueKind: PROJECT_CONFIRMATION_VALUE_KIND,
    serializationVersion: PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
    fingerprintVersion: PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
    valueFingerprint: "a".repeat(64),
    confirmationActionId: goldenUuid(801),
    actionOrigin: PROJECT_CONFIRMATION_ACTION_ORIGIN,
    confirmedAt: GOLDEN_TIMESTAMP_A,
    actorAssurance: {
      contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
      assuranceType: PROJECT_CONFIRMATION_ASSURANCE_TYPE
    },
    ...overrides
  };
}
