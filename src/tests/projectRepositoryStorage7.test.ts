import { describe, expect, it, vi } from "vitest";
import { ALL_PROJECT_TYPE_VALUES } from "../data/projectTypes";
import { createProject as createProjectRecord } from "../lib/createProject";
import {
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS,
  type ProjectConfirmationProvenance,
  type ProjectConfirmationSourceFieldId
} from "../lib/projectConfirmationProvenance";
import { createInitialProjectConfirmationProvenance } from "../lib/projectConfirmationRevisionReconciliation";
import {
  LEGACY_STORAGE_KEY,
  PREVIOUS_STORAGE_KEY,
  STORAGE_KEY,
  archiveProject,
  clearPersistenceWarning,
  createProject,
  deleteProject,
  duplicateProject,
  getPersistenceWarning,
  getProjectById,
  getRepositoryReadStatus,
  loadStorageState,
  restoreProject,
  saveGeneratedDocuments,
  saveStorageState,
  setActiveProject,
  updateProject,
  updateProjectFields,
  updateProjectPowerPlatform,
  updateReadinessConfirmation,
  updateReviewItem,
  type RepositoryPersistenceRuntime,
  type StorageAdapter
} from "../lib/projectRepository";
import type { PowerPlatformCanvasData, ProjectRecord, StorageVersion } from "../types/project";

class MemoryStorage implements StorageAdapter {
  protected readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

class FailingWriteStorage extends MemoryStorage {
  failWrites = false;
  override setItem(key: string, value: string): void {
    if (this.failWrites && key === STORAGE_KEY) throw new Error("quota");
    super.setItem(key, value);
  }
}

class ControlledReadStorage extends MemoryStorage {
  private readonly readCounts = new Map<string, number>();
  readonly removedKeys: string[] = [];
  readonly writtenKeys: string[] = [];
  onRead: ((key: string, count: number, storage: ControlledReadStorage) => void) | null = null;

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

  override removeItem(key: string): void {
    this.removedKeys.push(key);
    super.removeItem(key);
  }

  replaceValue(key: string, value: string): void {
    this.values.set(key, value);
  }

  rawValue(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  resetObservations(): void {
    this.readCounts.clear();
    this.removedKeys.length = 0;
    this.writtenKeys.length = 0;
  }
}

function uuid(index: number): string {
  return `10000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function sequenceRuntime(start = 1): RepositoryPersistenceRuntime & { calls: () => number } {
  let index = start;
  let count = 0;
  return {
    uuid: () => {
      count += 1;
      return uuid(index++);
    },
    calls: () => count
  };
}

function initialProvenance(type: ProjectRecord["intake"]["appType"], start = 1): ProjectConfirmationProvenance {
  const count = type === "powerAppsCanvas" ? 7 : 0;
  const result = createInitialProjectConfirmationProvenance(
    type,
    Array.from({ length: count }, (_, index) => uuid(start + index))
  );
  if (result.outcome !== "materialized") throw new Error("Test provenance failed.");
  return result.provenance;
}

function canonicalProject(type: ProjectRecord["intake"]["appType"], id: string, start = 1): ProjectRecord {
  return createProjectRecord({
    identity: { id, projectName: id },
    intake: { appType: type },
    confirmationProvenance: initialProvenance(type, start)
  });
}

function seedStorage7(storage: StorageAdapter, projects: ProjectRecord[], activeProjectId = projects[0]?.identity.id ?? null): string {
  const raw = JSON.stringify({ version: 7, activeProjectId, projects });
  storage.setItem(STORAGE_KEY, raw);
  return raw;
}

function seedLegacy(storage: StorageAdapter, version: Exclude<StorageVersion, 7>, projects: ProjectRecord[]): string {
  const raw = JSON.stringify({ version, activeProjectId: projects[0]?.identity.id ?? null, projects });
  storage.setItem(STORAGE_KEY, raw);
  return raw;
}

const registeredFields: ReadonlyArray<{
  sourceId: ProjectConfirmationSourceFieldId;
  field: keyof Pick<
    PowerPlatformCanvasData,
    | "fullScreenYamlRequired"
    | "controlLevelYamlRequired"
    | "containerYamlRequired"
    | "componentYamlRequired"
    | "paYamlSourceRequired"
    | "expectedInstallationMethod"
    | "existingSourceAvailability"
  >;
}> = [
  { sourceId: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0], field: "fullScreenYamlRequired" },
  { sourceId: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[1], field: "controlLevelYamlRequired" },
  { sourceId: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[2], field: "containerYamlRequired" },
  { sourceId: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[3], field: "componentYamlRequired" },
  { sourceId: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[4], field: "paYamlSourceRequired" },
  { sourceId: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[5], field: "expectedInstallationMethod" },
  { sourceId: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[6], field: "existingSourceAvailability" }
];

function validEvent(
  confirmationId: string,
  actionId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const provenance = initialProvenance("powerAppsCanvas");
  const sourceId = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
  return {
    confirmationId,
    confirmationContractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    projectId: "quarantine",
    sourceFieldId: sourceId,
    sourceFieldRevisionId: provenance.fieldRevisions[sourceId]!.revisionId,
    valueKind: "text",
    serializationVersion: "canonical-text-json-v1",
    fingerprintVersion: "sha256-v1",
    valueFingerprint: "a".repeat(64),
    confirmationActionId: actionId,
    actionOrigin: "localExplicitConfirmation",
    confirmedAt: "2026-08-27T12:00:00.000Z",
    actorAssurance: {
      contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
      assuranceType: "unauthenticatedLocalOperator"
    },
    ...overrides
  };
}

describe("Storage 7 migration and persistence", () => {
  it("reports storage and production UUID unavailability without fallback", () => {
    vi.stubGlobal("crypto", {});
    try {
      const storage = new MemoryStorage();
      const project = createProjectRecord({ identity: { id: "no-crypto" }, intake: { appType: "powerAppsCanvas" } });
      const original = seedLegacy(storage, 6, [project]);
      expect(getRepositoryReadStatus(storage)).toMatchObject({
        writeMode: "blocked",
        issueCodes: ["uuidUnavailable"]
      });
      expect(storage.getItem(STORAGE_KEY)).toBe(original);
    } finally {
      vi.unstubAllGlobals();
    }

    const localStorageGetter = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    try {
      expect(getRepositoryReadStatus()).toMatchObject({
        writeMode: "blocked",
        issueCodes: ["storageUnavailable"]
      });
    } finally {
      localStorageGetter.mockRestore();
    }
  });

  it.each([1, 2, 3, 4, 5, 6] as const)("migrates v%i immediately and idempotently to canonical Storage 7", (version) => {
    const storage = new MemoryStorage();
    const canvas = createProjectRecord({ identity: { id: `canvas-v${version}` }, intake: { appType: "powerAppsCanvas" } });
    const nonCanvas = createProjectRecord({ identity: { id: `web-v${version}` }, intake: { appType: "webApplication" } });
    const original = seedLegacy(storage, version, [canvas, nonCanvas]);
    const runtime = sequenceRuntime();

    const migrated = loadStorageState(storage, runtime);
    const persisted = storage.getItem(STORAGE_KEY)!;
    expect(persisted).not.toBe(original);
    expect(JSON.parse(persisted).version).toBe(7);
    expect(migrated.version).toBe(7);
    expect(Object.keys(migrated.projects[0].confirmationProvenance!.fieldRevisions)).toHaveLength(7);
    expect(Object.keys(migrated.projects[1].confirmationProvenance!.fieldRevisions)).toHaveLength(0);
    expect(migrated.projects.every((project) => project.confirmationProvenance!.confirmationEvents.length === 0)).toBe(true);
    expect(runtime.calls()).toBe(7);

    const noMigrationRuntime = { uuid: () => { throw new Error("must not allocate"); } };
    const reloaded = loadStorageState(storage, noMigrationRuntime);
    expect(reloaded.projects[0].confirmationProvenance).toEqual(migrated.projects[0].confirmationProvenance);
  });

  it.each([
    ["uuidUnavailable", { uuid: (): string => { throw new Error("unavailable"); } }],
    ["uuidInvalid", { uuid: (): string => "not-a-uuid" }],
    ["uuidCollision", { uuid: (): string => uuid(1) }]
  ] as const)("keeps legacy authority and blocks writes for %s", (issueCode, runtime) => {
    const storage = new MemoryStorage();
    const project = createProjectRecord({ identity: { id: "legacy-canvas" }, intake: { appType: "powerAppsCanvas" } });
    const original = seedLegacy(storage, 6, [project]);

    const loaded = loadStorageState(storage, runtime);
    expect(loaded.version).toBe(6);
    expect(loaded.projects[0].confirmationProvenance).toBeUndefined();
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
    expect(getRepositoryReadStatus(storage, runtime)).toMatchObject({ writeMode: "blocked", issueCodes: [issueCode] });
    expect(updateProjectFields(project.identity.id, { appPurpose: "Blocked" }, storage, runtime)).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  it("blocks after partial UUID allocation without replacing any project", () => {
    const storage = new MemoryStorage();
    const projects = ["first", "second"].map((id) =>
      createProjectRecord({ identity: { id }, intake: { appType: "powerAppsCanvas" } })
    );
    const original = seedLegacy(storage, 6, projects);
    let calls = 0;
    const runtime = { uuid: () => (++calls === 10 ? "invalid" : uuid(calls)) };

    expect(loadStorageState(storage, runtime).version).toBe(6);
    expect(calls).toBe(10);
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  it("keeps legacy storage on serialization and setItem failure", () => {
    const serializationStorage = new MemoryStorage();
    const project = createProjectRecord({ identity: { id: "serialize" }, intake: { appType: "powerAppsCanvas" } });
    const serializationOriginal = seedLegacy(serializationStorage, 6, [project]);
    expect(loadStorageState(serializationStorage, {
      ...sequenceRuntime(),
      serialize: () => { throw new Error("serialize"); }
    }).version).toBe(6);
    expect(storageValue(serializationStorage)).toBe(serializationOriginal);

    const writeStorage = new FailingWriteStorage();
    const writeOriginal = seedLegacy(writeStorage, 6, [project]);
    writeStorage.failWrites = true;
    expect(loadStorageState(writeStorage, sequenceRuntime()).version).toBe(6);
    expect(storageValue(writeStorage)).toBe(writeOriginal);
    writeStorage.failWrites = false;
    expect(getRepositoryReadStatus(writeStorage, sequenceRuntime()).writeMode).toBe("readWrite");
  });

  it("blocks unsupported versions, storage reads, and invalid legacy projects with bounded issues", () => {
    const unsupported = new MemoryStorage();
    unsupported.setItem(STORAGE_KEY, JSON.stringify({ version: 8, activeProjectId: null, projects: [] }));
    expect(getRepositoryReadStatus(unsupported)).toMatchObject({
      writeMode: "blocked",
      issueCodes: ["unsupportedStorageVersion"]
    });

    const readFailure: StorageAdapter = {
      getItem: () => { throw new Error("read"); },
      setItem: () => undefined,
      removeItem: () => undefined
    };
    expect(getRepositoryReadStatus(readFailure)).toMatchObject({
      writeMode: "blocked",
      issueCodes: ["storageReadFailed"]
    });

    const invalidProjectStorage = new MemoryStorage();
    const original = JSON.stringify({ version: 6, activeProjectId: "missing-id", projects: [{ identity: {} }] });
    invalidProjectStorage.setItem(STORAGE_KEY, original);
    expect(getRepositoryReadStatus(invalidProjectStorage)).toMatchObject({
      writeMode: "blocked",
      issueCodes: ["migrationValidationFailed"]
    });
    expect(invalidProjectStorage.getItem(STORAGE_KEY)).toBe(original);
  });

  it("blocks current-key migration when its prepared source changes before commit", () => {
    const storage = new ControlledReadStorage();
    const project = createProjectRecord({ identity: { id: "current-stale" }, intake: { appType: "webApplication" } });
    const original = seedLegacy(storage, 6, [project]);
    const newer = JSON.stringify({ version: 6, activeProjectId: null, projects: [] });
    storage.resetObservations();
    storage.onRead = (key, count, controlled) => {
      if (key === STORAGE_KEY && count === 2) controlled.replaceValue(key, newer);
    };

    expect(getRepositoryReadStatus(storage)).toMatchObject({
      writeMode: "blocked",
      issueCodes: ["storageChangedDuringMigration"]
    });
    expect(original).not.toBe(newer);
    expect(storage.rawValue(STORAGE_KEY)).toBe(newer);
    expect(storage.writtenKeys).toEqual([]);
    expect(storage.removedKeys).toEqual([]);
  });

  it("blocks previous-key migration when the source changes before commit", () => {
    const storage = new ControlledReadStorage();
    const project = createProjectRecord({ identity: { id: "previous-stale" }, intake: { appType: "webApplication" } });
    const original = JSON.stringify({ version: 6, activeProjectId: project.identity.id, projects: [project] });
    const newer = JSON.stringify({ version: 6, activeProjectId: null, projects: [] });
    storage.setItem(PREVIOUS_STORAGE_KEY, original);
    storage.resetObservations();
    storage.onRead = (key, count, controlled) => {
      if (key === PREVIOUS_STORAGE_KEY && count === 2) controlled.replaceValue(key, newer);
    };

    expect(getRepositoryReadStatus(storage)).toMatchObject({
      writeMode: "blocked",
      issueCodes: ["storageChangedDuringMigration"]
    });
    expect(storage.rawValue(PREVIOUS_STORAGE_KEY)).toBe(newer);
    expect(storage.rawValue(STORAGE_KEY)).toBeNull();
    expect(storage.writtenKeys).toEqual([]);
    expect(storage.removedKeys).toEqual([]);
  });

  it("blocks previous-key migration when the current target appears before commit", () => {
    const storage = new ControlledReadStorage();
    const sourceProject = createProjectRecord({ identity: { id: "previous-target" }, intake: { appType: "webApplication" } });
    const targetProject = canonicalProject("webApplication", "new-current", 20);
    const source = JSON.stringify({ version: 6, activeProjectId: sourceProject.identity.id, projects: [sourceProject] });
    const target = JSON.stringify({ version: 7, activeProjectId: targetProject.identity.id, projects: [targetProject] });
    storage.setItem(PREVIOUS_STORAGE_KEY, source);
    storage.resetObservations();
    storage.onRead = (key, count, controlled) => {
      if (key === STORAGE_KEY && count === 2) controlled.replaceValue(key, target);
    };

    expect(getRepositoryReadStatus(storage)).toMatchObject({
      writeMode: "blocked",
      issueCodes: ["storageChangedDuringMigration"]
    });
    expect(storage.rawValue(STORAGE_KEY)).toBe(target);
    expect(storage.rawValue(PREVIOUS_STORAGE_KEY)).toBe(source);
    expect(storage.writtenKeys).toEqual([]);
    expect(storage.removedKeys).toEqual([]);
  });

  it("blocks single-project legacy migration when its source changes before commit", () => {
    const storage = new ControlledReadStorage();
    const original = JSON.stringify({
      metadata: { id: "legacy-stale" },
      intake: { appName: "Legacy", appType: "webApplication" }
    });
    const newer = JSON.stringify({
      metadata: { id: "legacy-newer" },
      intake: { appName: "Newer", appType: "webApplication" }
    });
    storage.setItem(LEGACY_STORAGE_KEY, original);
    storage.resetObservations();
    storage.onRead = (key, count, controlled) => {
      if (key === LEGACY_STORAGE_KEY && count === 2) controlled.replaceValue(key, newer);
    };

    expect(getRepositoryReadStatus(storage)).toMatchObject({
      writeMode: "blocked",
      issueCodes: ["storageChangedDuringMigration"]
    });
    expect(storage.rawValue(LEGACY_STORAGE_KEY)).toBe(newer);
    expect(storage.rawValue(STORAGE_KEY)).toBeNull();
    expect(storage.writtenKeys).toEqual([]);
    expect(storage.removedKeys).toEqual([]);
  });

  it("continues to migrate an unchanged previous-key source and removes it after commit", () => {
    const storage = new ControlledReadStorage();
    const project = createProjectRecord({ identity: { id: "previous-normal" }, intake: { appType: "webApplication" } });
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
      version: 6,
      activeProjectId: project.identity.id,
      projects: [project]
    }));
    storage.resetObservations();

    expect(loadStorageState(storage).version).toBe(7);
    expect(JSON.parse(storage.rawValue(STORAGE_KEY)!).version).toBe(7);
    expect(storage.rawValue(PREVIOUS_STORAGE_KEY)).toBeNull();
    expect(storage.writtenKeys).toEqual([STORAGE_KEY]);
    expect(storage.removedKeys).toEqual([PREVIOUS_STORAGE_KEY]);
  });
});

describe("Storage 7 creation, duplication, and revisions", () => {
  it("creates Canvas with seven revisions and every non-Canvas type with zero", () => {
    const canvasStorage = new MemoryStorage();
    const canvas = createProject({ intake: { appType: "powerAppsCanvas" } }, canvasStorage, sequenceRuntime());
    expect(Object.keys(canvas.confirmationProvenance!.fieldRevisions)).toHaveLength(7);
    expect(canvas.confirmationProvenance!.confirmationEvents).toEqual([]);

    for (const type of ALL_PROJECT_TYPE_VALUES.filter((candidate) => candidate !== "powerAppsCanvas")) {
      const storage = new MemoryStorage();
      const created = createProject(
        { intake: { appType: type } },
        storage,
        { uuid: () => { throw new Error("non-Canvas must not allocate"); } }
      );
      expect(Object.keys(created.confirmationProvenance!.fieldRevisions)).toHaveLength(0);
      expect(created.confirmationProvenance!.confirmationEvents).toEqual([]);
    }
  });

  it("does not persist Canvas creation when UUID allocation fails", () => {
    const storage = new MemoryStorage();
    expect(() => createProject(
      { intake: { appType: "powerAppsCanvas" } },
      storage,
      { uuid: () => "invalid" }
    )).toThrow(/blocked/);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("blocks Canvas creation when allocation collides with another valid project", () => {
    const storage = new MemoryStorage();
    const existing = canonicalProject("powerAppsCanvas", "existing-create", 1);
    const original = seedStorage7(storage, [existing]);

    expect(() => createProject(
      { intake: { appType: "powerAppsCanvas" } },
      storage,
      { uuid: () => uuid(1) }
    )).toThrow(/blocked/);
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  it("duplicates with fresh revisions, no events, and no inherited authority", () => {
    const storage = new MemoryStorage();
    const source = createProject({ intake: { appType: "powerAppsCanvas" } }, storage, sequenceRuntime(1));
    const duplicate = duplicateProject(source.identity.id, storage, "2026-08-27T12:00:00.000Z", sequenceRuntime(20))!;
    const sourceIds = Object.values(source.confirmationProvenance!.fieldRevisions).map((entry) => entry!.revisionId);
    const duplicateIds = Object.values(duplicate.confirmationProvenance!.fieldRevisions).map((entry) => entry!.revisionId);
    expect(duplicateIds).toHaveLength(7);
    expect(duplicateIds.some((value) => sourceIds.includes(value))).toBe(false);
    expect(duplicate.confirmationProvenance!.confirmationEvents).toEqual([]);
    expect(getProjectById(source.identity.id, storage)!.confirmationProvenance).toEqual(source.confirmationProvenance);
  });

  it("blocks duplication when allocation collides with an unrelated valid project", () => {
    const storage = new MemoryStorage();
    const source = canonicalProject("powerAppsCanvas", "duplicate-source", 1);
    const unrelated = canonicalProject("powerAppsCanvas", "duplicate-unrelated", 20);
    const original = seedStorage7(storage, [source, unrelated], source.identity.id);

    expect(duplicateProject(source.identity.id, storage, "2026-08-27T12:00:00.000Z", {
      uuid: () => uuid(20)
    })).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  it.each(registeredFields)("rotates only $field and does not rotate a same-value write", ({ field, sourceId }) => {
    const storage = new MemoryStorage();
    const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage, sequenceRuntime(1));
    const before = project.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId;
    const changed = updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!,
      canvas: { ...current!.canvas!, [field]: "B" }
    }), storage, sequenceRuntime(20))!;
    const changedId = changed.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId;
    expect(changedId).not.toBe(before);
    expect(Object.entries(changed.confirmationProvenance!.fieldRevisions).filter(
      ([id, revision]) => revision!.revisionId !== project.confirmationProvenance!.fieldRevisions[id as ProjectConfirmationSourceFieldId]!.revisionId
    )).toHaveLength(1);

    const unchanged = updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!,
      canvas: { ...current!.canvas!, [field]: "B" }
    }), storage, { uuid: () => { throw new Error("same value must not allocate"); } })!;
    expect(unchanged.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId).toBe(changedId);
  });

  it("proves A to B to A creates three distinct revision identities", () => {
    const storage = new MemoryStorage();
    const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage, sequenceRuntime(1));
    const sourceId = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
    const r1 = project.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId;
    const b = updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!, canvas: { ...current!.canvas!, fullScreenYamlRequired: "B" }
    }), storage, sequenceRuntime(20))!;
    const r2 = b.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId;
    const a = updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!, canvas: { ...current!.canvas!, fullScreenYamlRequired: "" }
    }), storage, sequenceRuntime(30))!;
    const r3 = a.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId;
    expect(new Set([r1, r2, r3]).size).toBe(3);
  });

  it("does not rotate revisions for an unrelated Power Platform write", () => {
    const storage = new MemoryStorage();
    const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage, sequenceRuntime());
    const before = project.confirmationProvenance;
    const updated = updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!,
      common: { ...current!.common, environmentName: "Development" }
    }), storage, { uuid: () => { throw new Error("unrelated write must not allocate"); } })!;
    expect(updated.confirmationProvenance).toEqual(before);
  });

  it("removes Canvas revisions, preserves history, and creates fresh revisions on return", () => {
    const storage = new MemoryStorage();
    const project = canonicalProject("powerAppsCanvas", "type-change", 1);
    const sourceId = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
    const event = {
      confirmationId: uuid(30),
      confirmationContractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
      projectId: project.identity.id,
      sourceFieldId: sourceId,
      sourceFieldRevisionId: project.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId,
      valueKind: "text" as const,
      serializationVersion: "canonical-text-json-v1" as const,
      fingerprintVersion: "sha256-v1" as const,
      valueFingerprint: "a".repeat(64),
      confirmationActionId: uuid(31),
      actionOrigin: "localExplicitConfirmation" as const,
      confirmedAt: "2026-08-27T12:00:00.000Z",
      actorAssurance: {
        contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
        assuranceType: "unauthenticatedLocalOperator" as const
      }
    };
    project.confirmationProvenance = { ...project.confirmationProvenance!, confirmationEvents: [event] };
    seedStorage7(storage, [project]);
    const oldIds = Object.values(project.confirmationProvenance.fieldRevisions).map((entry) => entry!.revisionId);

    const away = updateProjectFields(project.identity.id, { appType: "webApplication" }, storage, {
      uuid: () => { throw new Error("removal must not allocate"); }
    })!;
    expect(Object.keys(away.confirmationProvenance!.fieldRevisions)).toHaveLength(0);
    expect(away.confirmationProvenance!.confirmationEvents).toEqual([event]);

    const returned = updateProjectFields(project.identity.id, { appType: "powerAppsCanvas" }, storage, sequenceRuntime(50))!;
    const returnedIds = Object.values(returned.confirmationProvenance!.fieldRevisions).map((entry) => entry!.revisionId);
    expect(returnedIds).toHaveLength(7);
    expect(returnedIds.some((value) => oldIds.includes(value))).toBe(false);
    expect(returned.confirmationProvenance!.confirmationEvents).toEqual([event]);
  });

  it("blocks the entire project-type mutation when applicability allocation fails", () => {
    const storage = new MemoryStorage();
    const project = createProject({ intake: { appType: "webApplication" } }, storage);
    expect(updateProjectFields(project.identity.id, { appType: "powerAppsCanvas" }, storage, {
      uuid: () => "invalid"
    })).toBeNull();
    expect(getProjectById(project.identity.id, storage)!.intake.appType).toBe("webApplication");
  });

  it("blocks caller-owned provenance mutation", () => {
    const storage = new MemoryStorage();
    const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage, sequenceRuntime());
    const persisted = storage.getItem(STORAGE_KEY);
    expect(updateProject(project.identity.id, (current) => ({
      ...current,
      confirmationProvenance: {
        ...current.confirmationProvenance!,
        confirmationEvents: []
      }
    }), storage)).not.toBeNull();
    expect(updateProject(project.identity.id, (current) => ({
      ...current,
      confirmationProvenance: {
        ...current.confirmationProvenance!,
        fieldRevisions: {}
      }
    }), storage)).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).not.toBe(persisted);
  });

  it("preserves valid provenance through archive and restore", () => {
    const storage = new MemoryStorage();
    const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage, sequenceRuntime());
    const provenance = project.confirmationProvenance;
    expect(archiveProject(project.identity.id, storage)!.confirmationProvenance).toEqual(provenance);
    expect(restoreProject(project.identity.id, storage)!.confirmationProvenance).toEqual(provenance);
  });

  it("retains the previous Storage 7 value when a normal mutation cannot persist", () => {
    const storage = new FailingWriteStorage();
    const project = createProject({ intake: { appType: "webApplication" } }, storage);
    const before = storage.getItem(STORAGE_KEY);
    storage.failWrites = true;
    expect(updateProjectFields(project.identity.id, { appPurpose: "Not persisted" }, storage)).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("retains a failed-write warning across reads and clears it after a successful write", () => {
    const storage = new FailingWriteStorage();
    const project = createProject({ intake: { appType: "webApplication" } }, storage);
    storage.failWrites = true;

    expect(updateProjectFields(project.identity.id, { appPurpose: "Not persisted" }, storage)).toBeNull();
    const warning = getPersistenceWarning();
    expect(warning).toMatch(/could not save/i);
    expect(loadStorageState(storage).projects[0].intake.appPurpose).not.toBe("Not persisted");
    expect(getPersistenceWarning()).toBe(warning);

    storage.failWrites = false;
    expect(updateProjectFields(project.identity.id, { appPurpose: "Persisted" }, storage)).not.toBeNull();
    expect(getPersistenceWarning()).toBeNull();
    clearPersistenceWarning();
  });
});

describe("Storage 7 quarantine", () => {
  it.each([
    ["missing provenance", undefined],
    ["unknown contract", { ...initialProvenance("powerAppsCanvas"), contractVersion: "unknown" }],
    ["wrong revision set", { ...initialProvenance("powerAppsCanvas"), fieldRevisions: {} }],
    ["invalid UUID", {
      ...initialProvenance("powerAppsCanvas"),
      fieldRevisions: {
        ...initialProvenance("powerAppsCanvas").fieldRevisions,
        [PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0]]: { revisionId: "invalid" }
      }
    }],
    ["unknown source", {
      ...initialProvenance("powerAppsCanvas"),
      fieldRevisions: { ...initialProvenance("powerAppsCanvas").fieldRevisions, unknown: { revisionId: uuid(90) } }
    }],
    ["invalid event", { ...initialProvenance("powerAppsCanvas"), confirmationEvents: [{}] }],
    ["invalid lineage", {
      ...initialProvenance("powerAppsCanvas"),
      confirmationEvents: [validEvent(uuid(91), uuid(92)), validEvent(uuid(93), uuid(94))]
    }],
    ["invalid fingerprint", {
      ...initialProvenance("powerAppsCanvas"),
      confirmationEvents: [validEvent(uuid(95), uuid(96), { valueFingerprint: "bad" })]
    }],
    ["invalid assurance", {
      ...initialProvenance("powerAppsCanvas"),
      confirmationEvents: [validEvent(uuid(97), uuid(98), { actorAssurance: { assuranceType: "server" } })]
    }]
  ])("quarantines %s with zero authority and no repair", (_label, malformed) => {
    const storage = new MemoryStorage();
    const project = createProjectRecord({ identity: { id: "quarantine" }, intake: { appType: "powerAppsCanvas" } });
    const rawProject = { ...project, ...(malformed === undefined ? {} : { confirmationProvenance: malformed }) };
    const original = JSON.stringify({ version: 7, activeProjectId: project.identity.id, projects: [rawProject] });
    storage.setItem(STORAGE_KEY, original);

    expect(loadStorageState(storage).projects[0].confirmationProvenance).toBeUndefined();
    expect(getRepositoryReadStatus(storage)).toMatchObject({
      writeMode: "readWrite",
      quarantinedProjectIds: [project.identity.id]
    });
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  it("preserves malformed provenance structurally through unrelated writes and blocks registered/type writes", () => {
    const storage = new MemoryStorage();
    const project = createProjectRecord({ identity: { id: "quarantine-writes" }, intake: { appType: "powerAppsCanvas" } });
    const malformed = { contractVersion: "unknown", nested: { values: [null, 1, "x"] } };
    seedStorage7(storage, [{ ...project, confirmationProvenance: malformed as unknown as ProjectConfirmationProvenance }]);

    expect(updateProjectFields(project.identity.id, { appPurpose: "Allowed" }, storage)).not.toBeNull();
    expect(rawProvenance(storage, project.identity.id)).toEqual(malformed);
    const reviewItem = loadStorageState(storage).projects[0].reviewItems[0];
    expect(updateReviewItem(project.identity.id, reviewItem.id, { status: "Deferred", deferredReason: "Later" }, storage)).not.toBeNull();
    expect(updateReadinessConfirmation(project.identity.id, "scopeReviewed", true, storage)).not.toBeNull();
    expect(rawProvenance(storage, project.identity.id)).toEqual(malformed);
    expect(saveGeneratedDocuments(project.identity.id, [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Test" }], storage)).not.toBeNull();
    expect(rawProvenance(storage, project.identity.id)).toEqual(malformed);
    expect(archiveProject(project.identity.id, storage)).not.toBeNull();
    expect(rawProvenance(storage, project.identity.id)).toEqual(malformed);
    expect(restoreProject(project.identity.id, storage)).not.toBeNull();
    expect(rawProvenance(storage, project.identity.id)).toEqual(malformed);

    expect(updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!, canvas: { ...current!.canvas!, fullScreenYamlRequired: "blocked" }
    }), storage)).toBeNull();
    expect(updateProjectFields(project.identity.id, { appType: "webApplication" }, storage)).toBeNull();
    expect(rawProvenance(storage, project.identity.id)).toEqual(malformed);
  });

  it("preserves missing provenance as absent through a generic unrelated write", () => {
    const storage = new MemoryStorage();
    const project = createProjectRecord({ identity: { id: "missing-provenance" }, intake: { appType: "webApplication" } });
    seedStorage7(storage, [project]);
    const state = loadStorageState(storage);
    state.projects[0] = { ...state.projects[0], updatedAt: "2026-08-27T13:00:00.000Z" };
    saveStorageState(state, storage);
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY)!) as { projects: Array<Record<string, unknown>> };
    expect(Object.prototype.hasOwnProperty.call(parsed.projects[0], "confirmationProvenance")).toBe(false);
  });

  it("preserves quarantine during active-project changes and deletion of another project", () => {
    const storage = new MemoryStorage();
    const quarantined = createProjectRecord({ identity: { id: "quarantined" }, intake: { appType: "powerAppsCanvas" } });
    const valid = canonicalProject("webApplication", "valid", 20);
    const malformed = { invalid: true };
    seedStorage7(storage, [
      { ...quarantined, confirmationProvenance: malformed as unknown as ProjectConfirmationProvenance },
      valid
    ], quarantined.identity.id);

    expect(setActiveProject(valid.identity.id, storage)).not.toBeNull();
    expect(rawProvenance(storage, quarantined.identity.id)).toEqual(malformed);
    deleteProject(valid.identity.id, storage);
    expect(rawProvenance(storage, quarantined.identity.id)).toEqual(malformed);
  });

  it("allows quarantined deletion and creates a clean fresh duplicate without touching the source", () => {
    const storage = new MemoryStorage();
    const source = createProjectRecord({ identity: { id: "quarantined-source" }, intake: { appType: "powerAppsCanvas" } });
    const malformed = { contractVersion: "bad", fieldRevisions: { unsafe: { revisionId: uuid(60) } } };
    seedStorage7(storage, [{ ...source, confirmationProvenance: malformed as unknown as ProjectConfirmationProvenance }]);

    const duplicate = duplicateProject(source.identity.id, storage, "2026-08-27T12:00:00.000Z", sequenceRuntime(70))!;
    expect(Object.keys(duplicate.confirmationProvenance!.fieldRevisions)).toHaveLength(7);
    expect(duplicate.confirmationProvenance!.confirmationEvents).toEqual([]);
    expect(rawProvenance(storage, source.identity.id)).toEqual(malformed);
    expect(deleteProject(source.identity.id, storage).projects.map((project) => project.identity.id)).toEqual([duplicate.identity.id]);
    expect(getRepositoryReadStatus(storage).quarantinedProjectIds).toEqual([]);
  });

  it("blocks a quarantined duplicate when allocation collides with a raw malformed UUID", () => {
    const storage = new MemoryStorage();
    const source = createProjectRecord({ identity: { id: "quarantined-collision" }, intake: { appType: "powerAppsCanvas" } });
    const malformed = { contractVersion: "bad", fieldRevisions: { unsafe: { revisionId: uuid(70) } } };
    const original = seedStorage7(storage, [
      { ...source, confirmationProvenance: malformed as unknown as ProjectConfirmationProvenance }
    ]);

    expect(duplicateProject(source.identity.id, storage, "2026-08-27T12:00:00.000Z", {
      uuid: () => uuid(70)
    })).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  it("blocks creation when allocation collides with another quarantined raw provenance subtree", () => {
    const storage = new MemoryStorage();
    const quarantined = createProjectRecord({ identity: { id: "quarantine-create" }, intake: { appType: "powerAppsCanvas" } });
    const malformed = { contractVersion: "bad", nested: { reserved: uuid(80) } };
    const original = seedStorage7(storage, [
      { ...quarantined, confirmationProvenance: malformed as unknown as ProjectConfirmationProvenance }
    ]);

    expect(() => createProject(
      { intake: { appType: "powerAppsCanvas" } },
      storage,
      { uuid: () => uuid(80) }
    )).toThrow(/blocked/);
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  it("blocks existing revision rotation against another quarantined raw provenance subtree", () => {
    const storage = new MemoryStorage();
    const valid = canonicalProject("powerAppsCanvas", "rotation-valid", 1);
    const quarantined = createProjectRecord({ identity: { id: "rotation-quarantine" }, intake: { appType: "powerAppsCanvas" } });
    const malformed = { contractVersion: "bad", nested: { reserved: uuid(80) } };
    const original = seedStorage7(storage, [
      valid,
      { ...quarantined, confirmationProvenance: malformed as unknown as ProjectConfirmationProvenance }
    ], valid.identity.id);

    expect(updateProjectPowerPlatform(valid.identity.id, (current) => ({
      ...current!,
      canvas: { ...current!.canvas!, fullScreenYamlRequired: "B" }
    }), storage, { uuid: () => uuid(80) })).toBeNull();
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
  });

  it("rechecks added provenance against the central writer's latest quarantine snapshot", () => {
    const storage = new ControlledReadStorage();
    const quarantined = createProjectRecord({ identity: { id: "central-defense" }, intake: { appType: "powerAppsCanvas" } });
    seedStorage7(storage, [{
      ...quarantined,
      confirmationProvenance: { contractVersion: "bad", nested: { reserved: uuid(80) } } as unknown as ProjectConfirmationProvenance
    }]);
    let allocationCount = 0;
    let concurrentRaw = "";
    const runtime: RepositoryPersistenceRuntime = {
      uuid: () => {
        allocationCount += 1;
        if (allocationCount === 1) {
          const parsed = JSON.parse(storage.rawValue(STORAGE_KEY)!) as { projects: Array<Record<string, unknown>> };
          parsed.projects[0].confirmationProvenance = {
            contractVersion: "bad",
            nested: { concurrentlyReserved: uuid(90) }
          };
          concurrentRaw = JSON.stringify(parsed);
          storage.replaceValue(STORAGE_KEY, concurrentRaw);
        }
        return uuid(89 + allocationCount);
      }
    };

    expect(() => createProject({ intake: { appType: "powerAppsCanvas" } }, storage, runtime)).toThrow(/persisted/);
    expect(allocationCount).toBe(7);
    expect(storage.rawValue(STORAGE_KEY)).toBe(concurrentRaw);
  });

  it("keeps quarantine rejection warnings through refresh and clears them after a successful write", () => {
    const storage = new MemoryStorage();
    const project = createProjectRecord({ identity: { id: "quarantine-warning" }, intake: { appType: "powerAppsCanvas" } });
    const malformed = { contractVersion: "bad", nested: { unchanged: true } };
    const original = seedStorage7(storage, [
      { ...project, confirmationProvenance: malformed as unknown as ProjectConfirmationProvenance }
    ]);

    expect(updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!,
      canvas: { ...current!.canvas!, fullScreenYamlRequired: "blocked" }
    }), storage)).toBeNull();
    const warning = getPersistenceWarning();
    expect(warning).toMatch(/confirmation provenance/i);
    expect(storage.getItem(STORAGE_KEY)).toBe(original);
    expect(loadStorageState(storage).projects[0].powerPlatform?.canvas?.fullScreenYamlRequired).not.toBe("blocked");
    expect(getPersistenceWarning()).toBe(warning);

    expect(updateProjectFields(project.identity.id, { appPurpose: "Allowed" }, storage)).not.toBeNull();
    expect(getPersistenceWarning()).toBeNull();
    expect(rawProvenance(storage, project.identity.id)).toEqual(malformed);
  });
});

function storageValue(storage: StorageAdapter): string | null {
  return storage.getItem(STORAGE_KEY);
}

function rawProvenance(storage: StorageAdapter, projectId: string): unknown {
  const parsed = JSON.parse(storage.getItem(STORAGE_KEY)!) as { projects: Array<Record<string, unknown>> };
  const project = parsed.projects.find((candidate) =>
    (candidate.identity as { id?: string } | undefined)?.id === projectId
  );
  return project?.confirmationProvenance;
}
