import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSeedProject } from "../data/seedProject";
import { createProject as createProjectRecord } from "../lib/createProject";
import {
  CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
  type PlanningControlledApplyHistoryRecord
} from "../lib/planningControlledApplyHistory";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById } from "../lib/planningRules";
import {
  applyConfirmedPlanningProposal,
  clearPersistenceWarning,
  getPersistenceWarning,
  STORAGE_KEY,
  type PlanningControlledApplyRepositoryIssueCode,
  type PlanningControlledApplyRepositoryResult,
  type StorageAdapter
} from "../lib/projectRepository";
import { CURRENT_STORAGE_VERSION, migrateStorageState } from "../lib/storageVersion";
import type { ProjectInputField, ProjectRecord, StorageState } from "../types/project";

const projectId = "controlled-apply-repository-project";
const otherProjectId = "controlled-apply-unrelated-project";
const sourceId = "11111111-1111-4111-8111-111111111111";
const proposalId = "22222222-2222-4222-8222-222222222222";
const decisionId = "33333333-3333-4333-8333-333333333333";
const applyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const appliedAt = "2026-08-13T18:00:00.000Z";
const confirmedAt = "2026-08-13T17:59:00.000Z";
const initialAt = "2026-08-13T17:00:00.000Z";
const desiredValue = "Confirmed  exact value";
const fingerprint = "f".repeat(64);

class ScriptedStorage implements StorageAdapter {
  raw: string | null;
  reads = 0;
  writes = 0;
  throwOnRead = new Set<number>();
  failWrite = false;
  onRead?: (read: number, raw: string | null) => string | null;

  constructor(state: StorageState | string | null) {
    this.raw = typeof state === "string" || state === null ? state : JSON.stringify(state);
  }

  getItem(key: string): string | null {
    if (key !== STORAGE_KEY) return null;
    this.reads += 1;
    if (this.throwOnRead.has(this.reads)) throw new Error("read unavailable");
    return this.onRead ? this.onRead(this.reads, this.raw) : this.raw;
  }

  setItem(key: string, value: string): void {
    if (key !== STORAGE_KEY) return;
    this.writes += 1;
    if (this.failWrite) throw new Error("quota exceeded");
    this.raw = value;
  }

  removeItem(): void {
    this.raw = null;
  }
}

function source(overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return {
    sourceId,
    sourceType: "confirmedIntake",
    locator: "intake.appPurpose",
    label: "Confirmed intake",
    authority: "confirmed",
    availability: "current",
    ...overrides
  };
}

function proposal(
  fieldKey: string = "appPurpose",
  overrides: Partial<PlanningProposalRecord> = {}
): PlanningProposalRecord {
  return {
    proposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: `future.project-field.${fieldKey}`,
    ruleVersion: "1.0.0",
    fingerprint,
    target: {
      kind: "projectField",
      domain: "foundation",
      targetKey: fieldKey,
      fieldKey,
      operation: "setValue"
    },
    category: "architectProposal",
    status: "Confirmed",
    value: { kind: "text", value: desiredValue },
    title: `Apply ${fieldKey}`,
    recommendation: "Use the confirmed value.",
    rationale: "Repository transaction fixture.",
    sourceIds: [sourceId],
    uncertainty: "Known",
    restriction: "concreteProposalAllowed",
    createdAt: confirmedAt,
    updatedAt: confirmedAt,
    lastDecisionId: decisionId,
    ...overrides
  };
}

function decision(overrides: Partial<PlanningDecisionRecord> = {}): PlanningDecisionRecord {
  return {
    decisionId,
    proposalId,
    projectId,
    action: "confirm",
    previousStatus: "Revised",
    resultingStatus: "Confirmed",
    origin: "userAction",
    recordedAt: confirmedAt,
    sourceIds: [sourceId],
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ...overrides
  };
}

function planning(overrides: Partial<ProjectPlanningState> = {}): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: [source()],
    proposals: [proposal()],
    decisions: [decision()],
    dependencies: [],
    conflicts: [],
    ...overrides
  };
}

function historyRecord(overrides: Partial<PlanningControlledApplyHistoryRecord> = {}): PlanningControlledApplyHistoryRecord {
  const previousValue = overrides.previousValue ?? "";
  const appliedValue = overrides.appliedValue ?? desiredValue;
  return {
    applyId,
    applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
    projectId,
    proposalId,
    decisionId,
    fieldKey: "appPurpose",
    previousValue,
    appliedValue,
    sourceIds: [sourceId],
    appliedAt,
    outcome: previousValue === appliedValue ? "unchanged" : "changed",
    ...overrides
  };
}

function projectForApply(options: {
  fieldKey?: ProjectInputField | string;
  currentValue?: string;
  desired?: string;
  validIntake?: boolean;
  documents?: ProjectRecord["generatedDocuments"];
  history?: PlanningControlledApplyHistoryRecord[];
  planningState?: ProjectPlanningState;
} = {}): ProjectRecord {
  const fieldKey = options.fieldKey ?? "appPurpose";
  const currentValue = options.currentValue ?? "";
  const base = options.validIntake
    ? createSeedProject()
    : createProjectRecord({ identity: { id: projectId }, now: initialAt });
  const identity = {
    ...base.identity,
    id: projectId,
    projectName: fieldKey === "appName" ? currentValue : base.identity.projectName
  };
  const client = {
    ...base.client,
    ...(fieldKey === "clientName" ? { clientName: currentValue } : {}),
    ...(fieldKey === "businessName" ? { businessName: currentValue } : {})
  };
  const intake = { ...base.intake };
  if (fieldKey !== "appName" && fieldKey !== "clientName" && fieldKey !== "businessName") {
    (intake as unknown as Record<string, string>)[fieldKey] = currentValue;
  }
  const proposalRecord = proposal(String(fieldKey), {
    value: { kind: "text", value: options.desired ?? desiredValue }
  });
  return {
    ...base,
    identity,
    client,
    intake,
    generatedDocuments: options.documents ?? base.generatedDocuments,
    planning: options.planningState ?? planning({ proposals: [proposalRecord] }),
    controlledApplyHistory: (options.history ?? []).map(cloneHistoryRecord),
    createdAt: initialAt,
    updatedAt: initialAt
  };
}

function unrelatedProject(name = "Unrelated"): ProjectRecord {
  return {
    ...createProjectRecord({
      identity: { id: otherProjectId, projectName: name },
      intake: { appType: "webApplication" },
      now: initialAt
    }),
    planning: {
      schemaVersion: PLANNING_SCHEMA_VERSION,
      ruleSetId: PLANNING_RULE_SET_ID,
      ruleSetVersion: PLANNING_RULE_SET_VERSION,
      sources: [],
      proposals: [],
      decisions: [],
      dependencies: [],
      conflicts: []
    }
  };
}

function canonicalState(
  projects: ProjectRecord[],
  activeProjectId: string | null = projects[0]?.identity.id ?? null
): StorageState {
  const state = migrateStorageState({ version: CURRENT_STORAGE_VERSION, activeProjectId, projects });
  expect(migrateStorageState(state)).toEqual(state);
  return state;
}

function cloneState(state: StorageState): StorageState {
  return JSON.parse(JSON.stringify(state)) as StorageState;
}

function cloneHistoryRecord(record: PlanningControlledApplyHistoryRecord): PlanningControlledApplyHistoryRecord {
  return { ...record, sourceIds: [...record.sourceIds] };
}

function persistedState(storage: ScriptedStorage): StorageState {
  if (!storage.raw) throw new Error("Expected persisted state.");
  return JSON.parse(storage.raw) as StorageState;
}

function target(state: StorageState): ProjectRecord {
  const project = state.projects.find((candidate) => candidate.identity.id === projectId);
  if (!project) throw new Error("Expected target project.");
  return project;
}

function runtime() {
  return {
    now: vi.fn(() => appliedAt),
    uuid: vi.fn(() => applyId)
  };
}

function expectBlocked(
  result: PlanningControlledApplyRepositoryResult,
  code: PlanningControlledApplyRepositoryIssueCode
): void {
  expect(result.outcome).toBe("blocked");
  if (result.outcome !== "blocked") throw new Error("Expected blocked result.");
  expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
}

function mutateTargetRaw(
  raw: string | null,
  mutate: (project: ProjectRecord) => ProjectRecord
): string {
  if (!raw) throw new Error("Expected raw state.");
  const state = JSON.parse(raw) as StorageState;
  return JSON.stringify(migrateStorageState({
    ...state,
    projects: state.projects.map((project) => project.identity.id === projectId ? mutate(project) : project)
  }));
}

function projectWithPriorHistory(): ProjectRecord {
  const project = projectForApply();
  const priorProposalId = "22222222-2222-4222-8222-222222222223";
  const priorDecisionId = "33333333-3333-4333-8333-333333333334";
  const priorProposal = proposal("problemStatement", {
    proposalId: priorProposalId,
    fingerprint: "e".repeat(64),
    lastDecisionId: priorDecisionId,
    value: { kind: "text", value: "Prior value" }
  });
  const priorDecision = decision({
    decisionId: priorDecisionId,
    proposalId: priorProposalId
  });
  return {
    ...project,
    planning: planning({
      proposals: [project.planning!.proposals[0], priorProposal],
      decisions: [project.planning!.decisions[0], priorDecision]
    }),
    controlledApplyHistory: [historyRecord({
      applyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
      proposalId: priorProposalId,
      decisionId: priorDecisionId,
      fieldKey: "problemStatement",
      previousValue: "",
      appliedValue: "Prior value"
    })]
  };
}

beforeEach(() => {
  clearPersistenceWarning();
  vi.useRealTimers();
});

describe("controlled apply repository reader and baseline", () => {
  it("accepts canonical current-v5 storage and persists a changed result", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    const controlledRuntime = runtime();

    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime);

    expect(result).toEqual({
      outcome: "appliedChanged",
      issues: [],
      evidence: {
        projectId,
        proposalId,
        decisionId,
        fieldKey: "appPurpose",
        applyId,
        appliedAt,
        historyOutcome: "changed"
      }
    });
    expect(Object.isFrozen(result.outcome === "appliedChanged" ? result.evidence : null)).toBe(true);
    expect(storage.reads).toBe(4);
    expect(storage.writes).toBe(1);
    expect(controlledRuntime.now).toHaveBeenCalledTimes(1);
    expect(controlledRuntime.uuid).toHaveBeenCalledTimes(1);
  });

  it("returns projectNotFound without falling back when STORAGE_KEY is missing", () => {
    const storage = new ScriptedStorage(null);
    const controlledRuntime = runtime();
    expect(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime)).toEqual({
      outcome: "projectNotFound",
      projectId,
      issues: []
    });
    expect(storage.reads).toBe(1);
    expect(storage.writes).toBe(0);
    expect(controlledRuntime.now).not.toHaveBeenCalled();
  });

  it("blocks getItem failures, corrupt JSON, and non-object JSON without runtime or writes", () => {
    const readFailure = new ScriptedStorage(canonicalState([projectForApply()]));
    readFailure.throwOnRead.add(1);
    const corrupt = new ScriptedStorage("{broken-json");
    const scalar = new ScriptedStorage("null");
    for (const [storage, code] of [
      [readFailure, "storageReadFailed"],
      [corrupt, "corruptStorage"],
      [scalar, "corruptStorage"]
    ] as const) {
      const controlledRuntime = runtime();
      expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime), code);
      expect(storage.writes).toBe(0);
      expect(controlledRuntime.now).not.toHaveBeenCalled();
      expect(controlledRuntime.uuid).not.toHaveBeenCalled();
    }
    expect(getPersistenceWarning()).not.toBeNull();
  });

  it.each([4, 999])("blocks raw storage version %s without migration or write", (version) => {
    const state = canonicalState([projectForApply()]);
    const storage = new ScriptedStorage(JSON.stringify({ ...state, version }));
    const controlledRuntime = runtime();
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime), "storageVersionMismatch");
    expect(storage.writes).toBe(0);
    expect(controlledRuntime.now).not.toHaveBeenCalled();
  });

  it("blocks current-v5 state that migration would repair or strip", () => {
    const state = canonicalState([projectForApply()]);
    const repair = cloneState(state) as StorageState & { unexpected?: string };
    repair.unexpected = "must be rejected";
    const storage = new ScriptedStorage(JSON.stringify(repair));
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()), "noncanonicalStorage");
    expect(storage.writes).toBe(0);
  });

  it("blocks invalid current-v5 history normalization without partial salvage", () => {
    const state = canonicalState([projectForApply()]);
    target(state).controlledApplyHistory = [historyRecord({ applyId: "invalid" })];
    const storage = new ScriptedStorage(JSON.stringify(state));
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()), "noncanonicalStorage");
    expect(storage.writes).toBe(0);
  });

  it("blocks duplicate target IDs at the baseline read", () => {
    const first = projectForApply();
    const duplicate = { ...projectForApply(), identity: { ...first.identity } };
    const storage = new ScriptedStorage(canonicalState([first, duplicate]));
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()), "ambiguousProjectIdentity");
    expect(storage.writes).toBe(0);
  });

  it.each(["", "   ", "line\nbreak", "x".repeat(201)])("blocks invalid project ID %j", (invalidId) => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    expectBlocked(applyConfirmedPlanningProposal(invalidId, proposalId, storage, runtime()), "invalidProjectId");
    expect(storage.reads).toBe(0);
    expect(storage.writes).toBe(0);
  });

  it("returns preparation blockers with copied D.3C.3A evidence", () => {
    const blockedProject = projectForApply({
      planningState: planning({ proposals: [proposal("appPurpose", { status: "Needs Clarification" })] })
    });
    const storage = new ScriptedStorage(canonicalState([blockedProject]));
    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());
    expectBlocked(result, "preparationBlocked");
    if (result.outcome === "blocked") {
      expect(result.issues[0].preparationIssues?.length).toBeGreaterThan(0);
    }
    expect(storage.reads).toBe(1);
    expect(storage.writes).toBe(0);
  });

  it("returns alreadyApplied immediately with zero reread, runtime, write, or warning change", () => {
    const project = projectForApply({
      currentValue: desiredValue,
      history: [historyRecord()]
    });
    const storage = new ScriptedStorage(canonicalState([project]));
    const controlledRuntime = runtime();
    const priorWarning = getPersistenceWarning();

    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime);

    expect(result).toEqual({
      outcome: "alreadyApplied",
      issues: [],
      evidence: { projectId, proposalId, decisionId, fieldKey: "appPurpose", existingApplyId: applyId }
    });
    expect(storage.reads).toBe(1);
    expect(storage.writes).toBe(0);
    expect(controlledRuntime.now).not.toHaveBeenCalled();
    expect(controlledRuntime.uuid).not.toHaveBeenCalled();
    expect(getPersistenceWarning()).toBe(priorWarning);
  });
});

describe("controlled apply latest and commit concurrency", () => {
  const latestTargetRaces: Array<[string, (project: ProjectRecord) => ProjectRecord]> = [
    ["archived", (project) => ({ ...project, archivedAt: appliedAt })],
    ["planning", (project) => ({ ...project, planning: { ...project.planning!, proposals: project.planning!.proposals.map((item) => ({ ...item, title: "Changed" })) } })],
    ["proposal", (project) => ({ ...project, planning: { ...project.planning!, proposals: project.planning!.proposals.map((item) => ({ ...item, title: "Changed" })) } })],
    ["decision", (project) => ({ ...project, planning: { ...project.planning!, decisions: project.planning!.decisions.map((item) => ({ ...item, recordedAt: appliedAt })) } })],
    ["source", (project) => ({ ...project, planning: { ...project.planning!, sources: project.planning!.sources.map((item) => ({ ...item, label: "Changed" })) } })],
    ["destination", (project) => ({ ...project, intake: { ...project.intake, appPurpose: "Concurrent" } })],
    ["unrelated target field", (project) => ({ ...project, intake: { ...project.intake, risks: "Concurrent" } })],
    ["updatedAt", (project) => ({ ...project, updatedAt: appliedAt })],
    ["packageGeneratedAt", (project) => ({ ...project, packageGeneratedAt: appliedAt })],
    ["review state", (project) => ({ ...project, reviewStatus: "Approved" })]
  ];

  it.each(latestTargetRaces)("blocks latest %s race before runtime", (_name, mutate) => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    storage.onRead = (read, raw) => read === 2 ? mutateTargetRaw(raw, mutate) : raw;
    const controlledRuntime = runtime();
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime), "projectChangedDuringApply");
    expect(controlledRuntime.now).not.toHaveBeenCalled();
    expect(controlledRuntime.uuid).not.toHaveBeenCalled();
    expect(storage.writes).toBe(0);
  });

  it("blocks a canonical latest history change before runtime", () => {
    const storage = new ScriptedStorage(canonicalState([projectWithPriorHistory()]));
    storage.onRead = (read, raw) => read === 2
      ? mutateTargetRaw(raw, (project) => ({ ...project, controlledApplyHistory: [] }))
      : raw;
    const controlledRuntime = runtime();
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime), "projectChangedDuringApply");
    expect(controlledRuntime.now).not.toHaveBeenCalled();
    expect(storage.writes).toBe(0);
  });

  it("returns projectNotFound when the target is deleted on latest read", () => {
    const state = canonicalState([projectForApply(), unrelatedProject()]);
    const storage = new ScriptedStorage(state);
    storage.onRead = (read, raw) => {
      if (read !== 2 || !raw) return raw;
      const current = JSON.parse(raw) as StorageState;
      return JSON.stringify(migrateStorageState({ ...current, projects: current.projects.filter((project) => project.identity.id !== projectId) }));
    };
    const controlledRuntime = runtime();
    expect(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime).outcome).toBe("projectNotFound");
    expect(controlledRuntime.now).not.toHaveBeenCalled();
    expect(storage.writes).toBe(0);
  });

  it("blocks duplicate target identity introduced on latest read", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    storage.onRead = (read, raw) => {
      if (read !== 2 || !raw) return raw;
      const state = JSON.parse(raw) as StorageState;
      return JSON.stringify({ ...state, projects: [...state.projects, cloneState(state).projects[0]] });
    };
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()), "ambiguousProjectIdentity");
    expect(storage.writes).toBe(0);
  });

  it("keeps the independent exact destination guard after snapshot equality", async () => {
    vi.resetModules();
    let latestReadStarted = false;
    let latestPurposeReads = 0;
    vi.doMock("../lib/projectFields", async () => {
      const actual = await vi.importActual<typeof import("../lib/projectFields")>("../lib/projectFields");
      return {
        ...actual,
        getProjectFieldValue: vi.fn((project: ProjectRecord, field: ProjectInputField) => {
          if (latestReadStarted && field === "appPurpose") {
            latestPurposeReads += 1;
            const stack = new Error().stack ?? "";
            if (!/validateIntake|createProject|storageVersion/.test(stack)) {
              return "independent destination drift";
            }
          }
          return actual.getProjectFieldValue(project, field);
        })
      };
    });
    const repository = await import("../lib/projectRepository");
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    storage.onRead = (read, raw) => {
      if (read === 2) latestReadStarted = true;
      return raw;
    };
    const controlledRuntime = runtime();
    try {
      const result = repository.applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime);
      expect(latestPurposeReads).toBeGreaterThan(0);
      expectBlocked(result, "destinationChangedDuringApply");
      expect(controlledRuntime.now).not.toHaveBeenCalled();
      expect(storage.writes).toBe(0);
    } finally {
      vi.doUnmock("../lib/projectFields");
      vi.resetModules();
    }
  });

  it("fails closed when the latest target snapshot cannot be serialized", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    const originalStringify = JSON.stringify;
    let projectSerializations = 0;
    const stringify = vi.spyOn(JSON, "stringify").mockImplementation((value: unknown, ...args: unknown[]) => {
      if (value && typeof value === "object" && "identity" in value && "intake" in value) {
        projectSerializations += 1;
        if (projectSerializations === 2) return undefined as never;
      }
      return originalStringify(value, ...(args as [never, never]));
    });
    try {
      expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()), "snapshotUnavailable");
      expect(storage.writes).toBe(0);
    } finally {
      stringify.mockRestore();
    }
  });

  it.each([
    ["destination", (project: ProjectRecord) => ({ ...project, intake: { ...project.intake, appPurpose: "Commit race" } })],
    ["planning", (project: ProjectRecord) => ({ ...project, planning: { ...project.planning!, proposals: project.planning!.proposals.map((item) => ({ ...item, title: "Commit changed" })) } })],
    ["updatedAt", (project: ProjectRecord) => ({ ...project, updatedAt: appliedAt })],
    ["archive", (project: ProjectRecord) => ({ ...project, archivedAt: appliedAt })]
  ])("blocks commit-read %s target race and discards runtime evidence", (_name, mutate) => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    storage.onRead = (read, raw) => read === 3 ? mutateTargetRaw(raw, mutate) : raw;
    const controlledRuntime = runtime();
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime), "projectChangedBeforeWrite");
    expect(controlledRuntime.now).toHaveBeenCalledTimes(1);
    expect(controlledRuntime.uuid).toHaveBeenCalledTimes(1);
    expect(storage.writes).toBe(0);
  });

  it("blocks a canonical commit-read history change and discards runtime evidence", () => {
    const storage = new ScriptedStorage(canonicalState([projectWithPriorHistory()]));
    storage.onRead = (read, raw) => read === 3
      ? mutateTargetRaw(raw, (project) => ({ ...project, controlledApplyHistory: [] }))
      : raw;
    const controlledRuntime = runtime();
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime), "projectChangedBeforeWrite");
    expect(controlledRuntime.now).toHaveBeenCalledTimes(1);
    expect(controlledRuntime.uuid).toHaveBeenCalledTimes(1);
    expect(storage.writes).toBe(0);
  });

  it("keeps the independent commit destination defense after commit snapshot equality", async () => {
    vi.resetModules();
    let commitReadStarted = false;
    vi.doMock("../lib/projectFields", async () => {
      const actual = await vi.importActual<typeof import("../lib/projectFields")>("../lib/projectFields");
      return {
        ...actual,
        getProjectFieldValue: vi.fn((project: ProjectRecord, field: ProjectInputField) => {
          const stack = new Error().stack ?? "";
          if (
            commitReadStarted &&
            field === "appPurpose" &&
            !/validateIntake|createProject|storageVersion/.test(stack)
          ) {
            return "independent commit destination drift";
          }
          return actual.getProjectFieldValue(project, field);
        })
      };
    });
    const repository = await import("../lib/projectRepository");
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    storage.onRead = (read, raw) => {
      if (read === 3) commitReadStarted = true;
      return raw;
    };
    const controlledRuntime = runtime();
    try {
      expectBlocked(
        repository.applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime),
        "destinationChangedBeforeWrite"
      );
      expect(controlledRuntime.now).toHaveBeenCalledTimes(1);
      expect(controlledRuntime.uuid).toHaveBeenCalledTimes(1);
      expect(storage.writes).toBe(0);
    } finally {
      vi.doUnmock("../lib/projectFields");
      vi.resetModules();
    }
  });

  it("returns projectNotFound when the target is deleted on commit read", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply(), unrelatedProject()]));
    storage.onRead = (read, raw) => {
      if (read !== 3 || !raw) return raw;
      const state = JSON.parse(raw) as StorageState;
      return JSON.stringify(migrateStorageState({ ...state, projects: state.projects.filter((project) => project.identity.id !== projectId) }));
    };
    const controlledRuntime = runtime();
    expect(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime).outcome).toBe("projectNotFound");
    expect(controlledRuntime.now).toHaveBeenCalledTimes(1);
    expect(storage.writes).toBe(0);
  });

  it("blocks duplicate target identity introduced on commit read", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    storage.onRead = (read, raw) => {
      if (read !== 3 || !raw) return raw;
      const state = JSON.parse(raw) as StorageState;
      return JSON.stringify(migrateStorageState({
        ...state,
        projects: [...state.projects, cloneState(state).projects[0]]
      }));
    };
    const controlledRuntime = runtime();
    expectBlocked(
      applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime),
      "ambiguousProjectIdentity"
    );
    expect(controlledRuntime.now).toHaveBeenCalledTimes(1);
    expect(storage.writes).toBe(0);
  });

  it("preserves commit-read unrelated additions, removals, edits, ordering, and activeProjectId", () => {
    const initialOther = unrelatedProject("Before");
    const initial = canonicalState([projectForApply(), initialOther], projectId);
    const newestOther = { ...initialOther, identity: { ...initialOther.identity, projectName: "Newest" } };
    const added = { ...unrelatedProject("Added"), identity: { id: "added-project", projectName: "Added" } };
    const commitState = canonicalState([newestOther, target(initial), added], otherProjectId);
    const commitRaw = JSON.stringify(commitState);
    const storage = new ScriptedStorage(initial);
    storage.onRead = (read, raw) => read >= 3 ? commitRaw : raw;

    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());

    expect(result.outcome).toBe("appliedChanged");
    const persisted = persistedState(storage);
    expect(persisted.activeProjectId).toBe(otherProjectId);
    expect(persisted.projects.map((project) => project.identity.id)).toEqual([otherProjectId, projectId, "added-project"]);
    expect(persisted.projects[0].identity.projectName).toBe("Newest");
    expect(storage.writes).toBe(1);
  });

  it("blocks final raw storage change without retry or a second runtime allocation", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    storage.onRead = (read, raw) => read === 4 && raw ? `${raw} ` : raw;
    const controlledRuntime = runtime();
    expectBlocked(applyConfirmedPlanningProposal(projectId, proposalId, storage, controlledRuntime), "storageChangedBeforeWrite");
    expect(storage.writes).toBe(0);
    expect(controlledRuntime.now).toHaveBeenCalledTimes(1);
    expect(controlledRuntime.uuid).toHaveBeenCalledTimes(1);
  });

  it("blocks final guard read failure without reporting persistenceFailed", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    storage.throwOnRead.add(4);
    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());
    expectBlocked(result, "storageReadFailed");
    expect(storage.writes).toBe(0);
  });

  it("blocks final-state serialization failure before setItem", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    const originalStringify = JSON.stringify;
    let stateSerializations = 0;
    const stringify = vi.spyOn(JSON, "stringify").mockImplementation((value: unknown, ...args: unknown[]) => {
      if (value && typeof value === "object" && "version" in value && "projects" in value) {
        stateSerializations += 1;
        if (stateSerializations === 4) return undefined as never;
      }
      return originalStringify(value, ...(args as [never, never]));
    });
    try {
      expectBlocked(
        applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()),
        "writeSerializationFailed"
      );
      expect(storage.writes).toBe(0);
    } finally {
      stringify.mockRestore();
    }
  });
});

describe("controlled apply refreshed finalization binding", () => {
  it("maps a refreshed finalizer blocker without a write", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, {
      now: () => "not-a-timestamp",
      uuid: () => applyId
    });
    expectBlocked(result, "finalizationBlocked");
    expect(storage.writes).toBe(0);
  });

  it("fails closed on unexpected refreshed alreadyApplied", async () => {
    vi.resetModules();
    vi.doMock("../lib/planningControlledApplyTransactionFinalization", async () => {
      const actual = await vi.importActual<typeof import("../lib/planningControlledApplyTransactionFinalization")>(
        "../lib/planningControlledApplyTransactionFinalization"
      );
      return {
        ...actual,
        finalizePlanningControlledApplyTransaction: vi.fn((input, controlledRuntime) => {
          const finalized = actual.finalizePlanningControlledApplyTransaction(input, controlledRuntime);
          if (finalized.outcome !== "finalized") return finalized;
          return {
            outcome: "alreadyApplied",
            issues: [],
            evidence: {
              projectId,
              proposalId,
              decisionId,
              fieldKey: "appPurpose",
              desiredValue,
              expectedCurrentValue: "",
              existingApplyId: applyId,
              sourceIds: [sourceId],
              expectedProjectSnapshot: finalized.evidence.expectedProjectSnapshot,
              destinationMutationRequired: false,
              historyAppendRequired: false,
              writeAuthorized: false,
              readinessEligible: false,
              outputEligible: false
            }
          };
        })
      };
    });
    const repository = await import("../lib/projectRepository");
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    try {
      expectBlocked(repository.applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()), "finalizationStateMismatch");
      expect(storage.writes).toBe(0);
    } finally {
      vi.doUnmock("../lib/planningControlledApplyTransactionFinalization");
      vi.resetModules();
    }
  });

  const evidenceMutations: Array<[string, (evidence: Record<string, unknown>) => void]> = [
    ["projectId", (evidence) => { evidence.projectId = "other-project"; }],
    ["proposalId", (evidence) => { evidence.proposalId = "22222222-2222-4222-8222-222222222299"; }],
    ["decisionId", (evidence) => { evidence.decisionId = "33333333-3333-4333-8333-333333333399"; }],
    ["fieldKey", (evidence) => { evidence.fieldKey = "risks"; }],
    ["expectedProjectSnapshot", (evidence) => { evidence.expectedProjectSnapshot = "{}"; }],
    ["expectedCurrentValue", (evidence) => { evidence.expectedCurrentValue = "other"; }],
    ["previousValue", (evidence) => { evidence.previousValue = "other"; }],
    ["appliedValue", (evidence) => { evidence.appliedValue = "other"; }],
    ["sourceIds", (evidence) => { evidence.sourceIds = ["other-source"]; }],
    ["historyOutcome", (evidence) => { evidence.historyOutcome = "unchanged"; }],
    ["writeAuthorized", (evidence) => { evidence.writeAuthorized = true; }],
    ["readinessEligible", (evidence) => { evidence.readinessEligible = true; }],
    ["outputEligible", (evidence) => { evidence.outputEligible = true; }]
  ];

  it.each(evidenceMutations)("blocks mismatched finalized %s evidence", async (_name, mutate) => {
    vi.resetModules();
    vi.doMock("../lib/planningControlledApplyTransactionFinalization", async () => {
      const actual = await vi.importActual<typeof import("../lib/planningControlledApplyTransactionFinalization")>(
        "../lib/planningControlledApplyTransactionFinalization"
      );
      return {
        ...actual,
        finalizePlanningControlledApplyTransaction: vi.fn((input, controlledRuntime) => {
          const finalized = actual.finalizePlanningControlledApplyTransaction(input, controlledRuntime);
          if (finalized.outcome !== "finalized") return finalized;
          const evidence = {
            ...finalized.evidence,
            sourceIds: [...finalized.evidence.sourceIds]
          } as unknown as Record<string, unknown>;
          mutate(evidence);
          return { ...finalized, evidence } as never;
        })
      };
    });
    const repository = await import("../lib/projectRepository");
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    try {
      expectBlocked(
        repository.applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()),
        "finalizationEvidenceMismatch"
      );
      expect(storage.writes).toBe(0);
    } finally {
      vi.doUnmock("../lib/planningControlledApplyTransactionFinalization");
      vi.resetModules();
    }
  });
});

describe("controlled apply changed and unchanged persistence", () => {
  it.each([
    ["appName", "identity", "projectName"],
    ["clientName", "client", "clientName"],
    ["businessName", "client", "businessName"],
    ["screens", "intake", "screens"]
  ] as const)("applies exact changed %s value through one atomic write", (fieldKey, section, property) => {
    const project = projectForApply({ fieldKey, desired: desiredValue });
    const planningBefore = JSON.stringify(project.planning);
    const storage = new ScriptedStorage(canonicalState([project]));
    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());
    expect(result.outcome).toBe("appliedChanged");
    const persisted = target(persistedState(storage));
    expect((persisted[section] as unknown as Record<string, string>)[property]).toBe(desiredValue);
    expect(JSON.stringify(persisted.planning)).toBe(planningBefore);
    expect(persisted.controlledApplyHistory[0]).toMatchObject({
      applyId,
      fieldKey,
      appliedValue: desiredValue,
      sourceIds: [sourceId],
      outcome: "changed"
    });
    expect(persisted.updatedAt).toBe(appliedAt);
    expect(storage.writes).toBe(1);
  });

  it("preserves nonblank documents and confirmations, clears package freshness, and requires review", () => {
    const documents = [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# Existing" },
      { fileName: "BLANK.md", folder: "00_Project_Overview", content: "" }
    ];
    const project = projectForApply({ documents });
    project.packageGeneratedAt = initialAt;
    project.reviewStatus = "Approved";
    project.status = "Ready for Codex";
    project.readinessConfirmations = { scopeReviewed: true, draftPackageReviewed: true };
    const confirmations = JSON.stringify(project.readinessConfirmations);
    const storage = new ScriptedStorage(canonicalState([project]));

    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());

    expect(result.outcome).toBe("appliedChanged");
    const persisted = target(persistedState(storage));
    expect(persisted.generatedDocuments).toEqual(documents);
    expect(persisted.generatedFileCount).toBe(1);
    expect(persisted.packageGeneratedAt).toBeNull();
    expect(persisted.reviewStatus).toBe("Review needed");
    expect(persisted.status).toBe("Needs Review");
    expect(JSON.stringify(persisted.readinessConfirmations)).toBe(confirmations);
    expect(persisted.reviewItems.length).toBeGreaterThan(0);
    expect(persisted.outstandingQuestions.length).toBeGreaterThan(0);
    expect(persisted.readinessSections.length).toBeGreaterThan(0);
  });

  it("preserves Needs Review for blank-only stored documents when changed intake becomes valid", () => {
    const documents = [
      { fileName: "README.md", folder: "00_Project_Overview", content: "" },
      { fileName: "PROJECT_SCOPE.md", folder: "01_Requirements", content: "   \n\t" }
    ];
    const project = projectForApply({
      validIntake: true,
      currentValue: "",
      desired: "Completed purpose",
      documents
    });
    project.packageGeneratedAt = initialAt;
    project.reviewStatus = "Approved";
    project.status = "Ready for Codex";
    const storage = new ScriptedStorage(canonicalState([project]));

    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());

    expect(result.outcome).toBe("appliedChanged");
    const persisted = target(persistedState(storage));
    expect(persisted.generatedDocuments).toEqual(documents);
    expect(persisted.generatedFileCount).toBe(0);
    expect(persisted.packageGeneratedAt).toBeNull();
    expect(persisted.status).toBe("Needs Review");
    expect(persisted.reviewStatus).toBe("Review needed");
    expect(persisted.updatedAt).toBe(appliedAt);
    expect(storage.writes).toBe(1);
  });

  it("preserves Needs Review for blank-only stored documents when changed intake remains incomplete", () => {
    const documents = [
      { fileName: "README.md", folder: "00_Project_Overview", content: "" },
      { fileName: "PROJECT_SCOPE.md", folder: "01_Requirements", content: " \t " }
    ];
    const storage = new ScriptedStorage(canonicalState([projectForApply({ documents })]));

    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());

    expect(result.outcome).toBe("appliedChanged");
    const persisted = target(persistedState(storage));
    expect(persisted.generatedDocuments).toEqual(documents);
    expect(persisted.generatedFileCount).toBe(0);
    expect(persisted.status).toBe("Needs Review");
    expect(persisted.reviewStatus).toBe("Review needed");
    expect(storage.writes).toBe(1);
  });

  it("uses appliedAt for reconciled review evidence rather than ambient wall-clock time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2035-01-01T00:00:00.000Z"));
    const project = projectForApply();
    const priorPurposeItem = project.reviewItems.find((item) => item.fieldKey === "appPurpose");
    expect(priorPurposeItem?.status).toBe("Needs answer");
    const storage = new ScriptedStorage(canonicalState([project]));

    expect(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()).outcome).toBe("appliedChanged");

    const persistedPurposeItem = target(persistedState(storage)).reviewItems.find((item) => item.fieldKey === "appPurpose");
    expect(persistedPurposeItem).toMatchObject({ status: "Answered", updatedAt: appliedAt });
    expect(persistedPurposeItem?.updatedAt).not.toBe("2035-01-01T00:00:00.000Z");
  });

  it("derives Intake Complete with no stored documents when an applied value completes otherwise valid intake", () => {
    const project = projectForApply({ validIntake: true, currentValue: "", desired: "Completed purpose" });
    const storage = new ScriptedStorage(canonicalState([project]));
    expect(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()).outcome).toBe("appliedChanged");
    expect(target(persistedState(storage)).status).toBe("Intake Complete");
  });

  it("derives Intake Started with no stored documents when concrete intake remains incomplete", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    expect(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()).outcome).toBe("appliedChanged");
    expect(target(persistedState(storage)).status).toBe("Intake Started");
  });

  it("persists unchanged history and updatedAt only", () => {
    const project = projectForApply({ currentValue: desiredValue });
    project.packageGeneratedAt = initialAt;
    project.reviewStatus = "Approved";
    project.status = "Complete";
    const canonical = canonicalState([project]);
    const before = target(cloneState(canonical));
    const storage = new ScriptedStorage(canonical);

    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());

    expect(result.outcome).toBe("appliedUnchanged");
    const persisted = target(persistedState(storage));
    const expected = {
      ...before,
      controlledApplyHistory: [expect.objectContaining({ outcome: "unchanged", previousValue: desiredValue, appliedValue: desiredValue })],
      updatedAt: appliedAt
    };
    expect(persisted).toEqual(expected);
    expect(persisted.packageGeneratedAt).toBe(initialAt);
    expect(persisted.reviewStatus).toBe("Approved");
    expect(persisted.status).toBe("Complete");
    expect(storage.writes).toBe(1);
  });

  it("blocks appType before mutation and preserves Power Platform state", () => {
    const project = projectForApply({ fieldKey: "appType", desired: "website" });
    const powerPlatformBefore = JSON.stringify(project.powerPlatform);
    const storage = new ScriptedStorage(canonicalState([project]));
    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());
    expect(result.outcome).toBe("blocked");
    expect(storage.writes).toBe(0);
    expect(JSON.stringify(target(canonicalState([project])).powerPlatform)).toBe(powerPlatformBefore);
  });

  it("does not synchronize unrelated project state", () => {
    const unrelated = unrelatedProject();
    unrelated.reviewStatus = "Not reviewed";
    const canonical = canonicalState([projectForApply(), unrelated]);
    const unrelatedBefore = canonical.projects.find((project) => project.identity.id === otherProjectId);
    const storage = new ScriptedStorage(canonical);
    expect(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()).outcome).toBe("appliedChanged");
    expect(persistedState(storage).projects.find((project) => project.identity.id === otherProjectId)).toEqual(unrelatedBefore);
  });

  it("reports one attempted write failure without success evidence, fallback, or retry", () => {
    const storage = new ScriptedStorage(canonicalState([projectForApply()]));
    storage.failWrite = true;
    const result = applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime());
    expect(result.outcome).toBe("persistenceFailed");
    expect("evidence" in result).toBe(false);
    expect(storage.writes).toBe(1);
    expect(getPersistenceWarning()).not.toBeNull();
  });

  it("clears an existing persistence warning after successful controlled persistence", () => {
    const failed = new ScriptedStorage(canonicalState([projectForApply()]));
    failed.failWrite = true;
    applyConfirmedPlanningProposal(projectId, proposalId, failed, runtime());
    expect(getPersistenceWarning()).not.toBeNull();

    const success = new ScriptedStorage(canonicalState([projectForApply()]));
    expect(applyConfirmedPlanningProposal(projectId, proposalId, success, runtime()).outcome).toBe("appliedChanged");
    expect(getPersistenceWarning()).toBeNull();
  });

  it("keeps representative current clarification-only planning non-writable", () => {
    const rule = getPlanningRuleById("pp.canvas.yamlplanning.confirmation");
    if (!rule) throw new Error("Expected current YAML clarification rule.");
    const currentRuleProposal = proposal("appPurpose", {
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      target: { ...rule.target },
      category: rule.category,
      restriction: rule.restriction,
      uncertainty: rule.uncertainty
    });
    const project = projectForApply({ planningState: planning({ proposals: [currentRuleProposal] }) });
    const storage = new ScriptedStorage(canonicalState([project]));
    expect(applyConfirmedPlanningProposal(projectId, proposalId, storage, runtime()).outcome).toBe("blocked");
    expect(storage.writes).toBe(0);
  });
});
