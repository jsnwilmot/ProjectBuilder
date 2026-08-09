// @ts-expect-error -- Vitest runs Web Crypto setup in Node; the app tsconfig intentionally excludes Node ambient types.
import { webcrypto } from "node:crypto";
// @ts-expect-error -- Vitest runs static source isolation assertions in Node; the app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PhaseGateId, PhaseGateResult } from "../lib/phaseGates";
import {
  generatePlanningClarificationBlueprints,
  type PlanningClarificationProposalBlueprint,
  type PlanningClarificationSourceBlueprint
} from "../lib/planningClarificationBlueprints";
import { generatePlanningClarificationDrafts } from "../lib/planningClarificationDrafts";
import {
  generatePlanningClarificationFingerprints,
  type PlanningClarificationFingerprintRecord
} from "../lib/planningClarificationFingerprints";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  createEmptyProjectPlanningState,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningDependencyRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference
} from "../lib/planningProposals";
import {
  STORAGE_KEY,
  createProject,
  getProjectById,
  loadStorageState,
  materializeProjectPlanningClarifications,
  saveStorageState,
  type StorageAdapter
} from "../lib/projectRepository";
import { getPlanningRuleById } from "../lib/planningRules";
import type { PowerPlatformGateStatus, ProjectRecord, StorageState } from "../types/project";

const projectId = "tti-software-licence-tracker";
const timestamp = "2026-07-22T12:00:00.000Z";
const fingerprint = "b".repeat(64);

const ruleIds = [
  "pp.canvas.schema.confirmation",
  "pp.sharepoint.internalnames.confirmation",
  "pp.canvas.screentargets.confirmation",
  "pp.canvas.controltargets.confirmation",
  "pp.canvas.components.confirmation",
  "pp.canvas.yamlplanning.confirmation",
  "pp.canvas.delegation.confirmation",
  "pp.security.permissions.confirmation",
  "pp.testing.outcomes.confirmation",
  "pp.alm.rollback.confirmation",
  "pp.release.approval.confirmation"
] as const;

const ttiStatuses: Record<PhaseGateId, PowerPlatformGateStatus> = {
  schema: "reviewNeeded",
  internalNames: "reviewNeeded",
  screenTargets: "missingInformation",
  controlTargets: "missingInformation",
  componentTargets: "missingInformation",
  yaml: "reviewNeeded",
  delegation: "missingInformation",
  security: "reviewNeeded",
  testing: "reviewNeeded",
  alm: "reviewNeeded",
  releaseApproval: "reviewNeeded"
} as Record<PhaseGateId, PowerPlatformGateStatus>;

class CountingStorage implements StorageAdapter {
  values = new Map<string, string>();
  writes = 0;
  getCount = 0;
  failWrites = false;
  beforeGet?: (storage: CountingStorage) => void;

  getItem(key: string): string | null {
    this.getCount += 1;
    this.beforeGet?.(this);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites && key === STORAGE_KEY) {
      throw new Error("write failed");
    }
    this.writes += 1;
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function gate(id: PhaseGateId, status: PowerPlatformGateStatus): PhaseGateResult {
  return {
    id,
    label: `Gate ${id}`,
    status,
    blockingReason: `TTI ${id} blocker remains unresolved.`,
    sourceSection: `TTI ${id} source section`
  };
}

async function ttiFixture() {
  const draftResult = generatePlanningClarificationDrafts({
    projectId,
    projectType: "powerAppsCanvas",
    gateResults: ruleIds.map((ruleId) => gate(getPlanningRuleById(ruleId)!.target.targetKey, ttiStatuses[getPlanningRuleById(ruleId)!.target.targetKey]))
  });
  expect(draftResult.issues).toEqual([]);
  const blueprintResult = generatePlanningClarificationBlueprints({
    projectId,
    drafts: draftResult.drafts
  });
  expect(blueprintResult.issues).toEqual([]);
  const fingerprintResult = await generatePlanningClarificationFingerprints({
    projectId,
    sources: blueprintResult.sources,
    proposals: blueprintResult.proposals
  });
  expect(fingerprintResult.issues).toEqual([]);
  expect(blueprintResult.sources).toHaveLength(22);
  expect(blueprintResult.proposals).toHaveLength(11);
  return {
    sources: clone(blueprintResult.sources) as PlanningClarificationSourceBlueprint[],
    proposals: clone(blueprintResult.proposals) as PlanningClarificationProposalBlueprint[],
    fingerprints: clone(fingerprintResult.fingerprints) as PlanningClarificationFingerprintRecord[]
  };
}

function createCanvasProject(storage: CountingStorage, overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return createProject({
    identity: { id: projectId, projectName: "TTI Software Licence Tracker" },
    intake: {
      appType: "powerAppsCanvas",
      sharePointLists: "Review needed",
      fields: "Review needed"
    },
    status: "Needs Review",
    reviewStatus: "Review needed",
    now: "2026-07-20T10:00:00.000Z",
    ...overrides
  }, storage);
}

function uuidFactory(start = 1): { uuid: () => string; calls: () => number } {
  let count = 0;
  return {
    uuid: () => {
      count += 1;
      return uuid(start + count - 1);
    },
    calls: () => count
  };
}

function uuid(index: number): string {
  return `70000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function proposalUuid(index: number): string {
  return `71000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function stateFrom(storage: CountingStorage): StorageState {
  const value = storage.values.get(STORAGE_KEY);
  expect(value).toBeTruthy();
  return JSON.parse(value!) as StorageState;
}

function persistProject(storage: CountingStorage, project: ProjectRecord): void {
  const state = loadStorageState(storage);
  saveStorageState({
    ...state,
    projects: state.projects.map((entry) => entry.identity.id === project.identity.id ? project : entry)
  }, storage);
}

function planningSource(index: number, overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return {
    sourceId: uuid(index),
    sourceType: "confirmedIntake",
    locator: `intake:${index}`,
    label: `Intake source ${index}`,
    authority: "confirmed",
    availability: "current",
    ...overrides
  };
}

function planningProposal(sourceId: string, overrides: Partial<PlanningProposalRecord> = {}): PlanningProposalRecord {
  return {
    proposalId: proposalUuid(1),
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: "unrelated.rule",
    ruleVersion: "phase-5c.1.1",
    fingerprint,
    target: { kind: "projectField", domain: "foundation", targetKey: "appPurpose", operation: "setValue" },
    category: "architectProposal",
    status: "Proposed",
    value: { kind: "text", value: "Unrelated" },
    title: "Unrelated proposal",
    recommendation: "Keep unrelated proposal.",
    rationale: "Used to test existing ID collisions.",
    sourceIds: [sourceId],
    uncertainty: "Known",
    restriction: "concreteProposalAllowed",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides
  };
}

function planningDecision(proposalId: string, overrides: Partial<PlanningDecisionRecord> = {}): PlanningDecisionRecord {
  return {
    decisionId: uuid(80),
    proposalId,
    projectId,
    action: "confirm",
    previousStatus: "Proposed",
    resultingStatus: "Confirmed",
    origin: "userAction",
    recordedAt: timestamp,
    ...overrides
  };
}

function planningDependency(proposalId: string, overrides: Partial<PlanningDependencyRecord> = {}): PlanningDependencyRecord {
  return {
    dependencyId: uuid(81),
    sourceProposalId: proposalId,
    dependencyType: "requiresReadiness",
    target: { kind: "readinessRequirementId", readinessRequirementId: "schema" },
    required: true,
    rationale: "Existing unrelated dependency remains historical.",
    ...overrides
  };
}

function planningConflict(proposalId: string, overrides: Partial<PlanningConflictRecord> = {}): PlanningConflictRecord {
  return {
    conflictId: uuid(82),
    projectId,
    conflictType: "proposalVsIntake",
    severity: "blocking",
    status: "open",
    involvedReferences: [{ kind: "proposalId", proposalId }],
    explanation: "Existing unrelated conflict remains historical.",
    blocking: true,
    createdAt: timestamp,
    ...overrides
  };
}

function sourceRecord(source: PlanningClarificationSourceBlueprint, index: number): PlanningSourceReference {
  return {
    sourceId: uuid(index),
    sourceType: source.sourceType,
    locator: source.locator,
    label: source.label,
    authority: source.authority,
    availability: source.availability,
    observedAt: timestamp,
    ...(source.version ? { version: source.version } : {}),
    ...(source.excerpt ? { excerpt: source.excerpt } : {})
  };
}

function proposalRecord(
  proposal: PlanningClarificationProposalBlueprint,
  fingerprintRecord: PlanningClarificationFingerprintRecord,
  index: number,
  sourceIds: readonly string[]
): PlanningProposalRecord {
  return {
    proposalId: proposalUuid(index),
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: proposal.ruleSetId,
    ruleSetVersion: proposal.ruleSetVersion,
    ruleId: proposal.ruleId,
    ruleVersion: proposal.ruleVersion,
    fingerprint: fingerprintRecord.fingerprint,
    target: { ...proposal.target },
    category: proposal.category,
    status: proposal.status,
    value: { ...proposal.value },
    title: proposal.title,
    recommendation: proposal.recommendation,
    rationale: proposal.rationale,
    sourceIds: [...sourceIds],
    uncertainty: proposal.uncertainty,
    restriction: proposal.restriction,
    createdAt: timestamp,
    updatedAt: timestamp,
    consequence: proposal.consequence,
    readinessRequirementIds: [...proposal.readinessRequirementIds],
    applicableProjectTypes: [...proposal.applicableProjectTypes],
    applicableDomains: [...proposal.applicableDomains]
  };
}

async function persistExactSubset(
  storage: CountingStorage,
  fixture: Awaited<ReturnType<typeof ttiFixture>>,
  proposalCount: number
): Promise<ProjectRecord> {
  const sourceKeys = new Set(fixture.proposals.slice(0, proposalCount).flatMap((proposal) => proposal.sourceKeys));
  const sources = fixture.sources.filter((source) => sourceKeys.has(source.sourceKey)).map(sourceRecord);
  const sourceIdsByKey = new Map(sources.map((source) => [existingSourceKey(source), source.sourceId]));
  const proposals = fixture.proposals.slice(0, proposalCount).map((proposal, index) =>
    proposalRecord(proposal, fixture.fingerprints[index], index + 1, proposal.sourceKeys.map((sourceKey) => sourceIdsByKey.get(sourceKey)!))
  );
  const project = getProjectById(projectId, storage)!;
  const updated = {
    ...project,
    planning: {
      ...createEmptyProjectPlanningState(),
      sources,
      proposals
    }
  };
  persistProject(storage, updated);
  return getProjectById(projectId, storage)!;
}

function existingSourceKey(source: PlanningSourceReference): string {
  return source.sourceType === "projectRule"
    ? `projectRule|${source.locator.slice("planning-rule:".length)}|${source.version}`
    : `readinessPrerequisite|${source.locator.slice("phase-gate:".length)}`;
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("planning clarification materialization", () => {
  it("persists the TTI fixture once, reloads it, and then no-ops idempotently", async () => {
    const fixture = await ttiFixture();
    const storage = new CountingStorage();
    createCanvasProject(storage);
    const beforeProject = getProjectById(projectId, storage)!;
    storage.writes = 0;
    const uuids = uuidFactory();
    let clockCalls = 0;

    const first = await materializeProjectPlanningClarifications(projectId, fixture, storage, {
      uuid: uuids.uuid,
      now: () => {
        clockCalls += 1;
        return timestamp;
      }
    });

    expect(first.outcome).toBe("persisted");
    expect(first.createdSources).toHaveLength(22);
    expect(first.createdProposals).toHaveLength(11);
    expect(first.reusedSources).toEqual([]);
    expect(first.reusedProposals).toEqual([]);
    expect(uuids.calls()).toBe(33);
    expect(clockCalls).toBe(1);
    expect(storage.writes).toBe(1);

    const persisted = getProjectById(projectId, storage)!;
    expect(persisted.updatedAt).toBe(timestamp);
    expect(persisted.status).toBe(beforeProject.status);
    expect(persisted.reviewStatus).toBe(beforeProject.reviewStatus);
    expect(persisted.packageGeneratedAt).toBe(beforeProject.packageGeneratedAt);
    expect(persisted.planning?.sources).toHaveLength(22);
    expect(persisted.planning?.proposals).toHaveLength(11);
    expect(persisted.planning?.decisions).toEqual([]);
    expect(persisted.planning?.dependencies).toEqual([]);
    expect(persisted.planning?.conflicts).toEqual([]);
    expect(new Set([
      ...persisted.planning!.sources.map((source) => source.sourceId),
      ...persisted.planning!.proposals.map((proposal) => proposal.proposalId)
    ])).toHaveLength(33);
    expect(persisted.planning!.proposals.every((proposal) => proposal.status === "Needs Clarification")).toBe(true);
    expect(persisted.planning!.proposals.map((proposal) => proposal.fingerprint)).toEqual(fixture.fingerprints.map((entry) => entry.fingerprint));
    expect(persisted.planning!.proposals.every((proposal) => proposal.sourceIds.every((sourceId) => persisted.planning!.sources.some((source) => source.sourceId === sourceId)))).toBe(true);

    const beforeNoOp = JSON.stringify(loadStorageState(storage));
    storage.writes = 0;
    let noOpUuidCalls = 0;
    let noOpClockCalls = 0;
    const second = await materializeProjectPlanningClarifications(projectId, fixture, storage, {
      uuid: () => {
        noOpUuidCalls += 1;
        return uuid(99);
      },
      now: () => {
        noOpClockCalls += 1;
        return "2026-07-23T12:00:00.000Z";
      }
    });

    expect(second.outcome).toBe("unchanged");
    expect(second.createdSources).toEqual([]);
    expect(second.createdProposals).toEqual([]);
    expect(second.reusedSources).toHaveLength(22);
    expect(second.reusedProposals).toHaveLength(11);
    expect(noOpUuidCalls).toBe(0);
    expect(noOpClockCalls).toBe(0);
    expect(storage.writes).toBe(0);
    expect(JSON.stringify(loadStorageState(storage))).toBe(beforeNoOp);
  });

  it("appends only genuinely new records while reusing exact identities", async () => {
    const fixture = await ttiFixture();
    const storage = new CountingStorage();
    createCanvasProject(storage);
    await persistExactSubset(storage, fixture, 9);
    storage.writes = 0;
    const uuids = uuidFactory(100);

    const result = await materializeProjectPlanningClarifications(projectId, fixture, storage, {
      uuid: uuids.uuid,
      now: () => timestamp
    });

    expect(result.outcome).toBe("persisted");
    expect(result.reusedSources).toHaveLength(18);
    expect(result.reusedProposals).toHaveLength(9);
    expect(result.createdSources).toHaveLength(4);
    expect(result.createdProposals).toHaveLength(2);
    expect(uuids.calls()).toBe(6);
    expect(storage.writes).toBe(1);
    const persisted = getProjectById(projectId, storage)!;
    expect(persisted.planning?.sources.slice(0, 18).map((source) => source.sourceId)).toEqual(Array.from({ length: 18 }, (_, index) => uuid(index)));
    expect(persisted.planning?.sources).toHaveLength(22);
    expect(persisted.planning?.proposals).toHaveLength(11);
  });

  it("blocks lifecycle-required source/proposal changes and existing-only records atomically", async () => {
    const fixture = await ttiFixture();
    const cases = [
      {
        mutate: async (storage: CountingStorage) => {
          const project = await persistExactSubset(storage, fixture, 11);
          persistProject(storage, {
            ...project,
            planning: {
              ...project.planning!,
              sources: project.planning!.sources.map((source, index) => index === 0 ? { ...source, label: "Changed source label" } : source)
            }
          });
          return fixture;
        },
        expectedKey: "changedSource"
      },
      {
        mutate: async (storage: CountingStorage) => {
          const project = await persistExactSubset(storage, fixture, 11);
          persistProject(storage, {
            ...project,
            planning: {
              ...project.planning!,
              proposals: project.planning!.proposals.map((proposal, index) => index === 0 ? { ...proposal, fingerprint: "c".repeat(64) } : proposal)
            }
          });
          return fixture;
        },
        expectedKey: "changedProposal"
      },
      {
        mutate: async (storage: CountingStorage) => {
          await persistExactSubset(storage, fixture, 11);
          const removed = new Set(fixture.proposals[0].sourceKeys);
          return {
            sources: fixture.sources.filter((source) => !removed.has(source.sourceKey)),
            proposals: fixture.proposals.slice(1),
            fingerprints: (await generatePlanningClarificationFingerprints({
              projectId,
              sources: fixture.sources.filter((source) => !removed.has(source.sourceKey)),
              proposals: fixture.proposals.slice(1)
            })).fingerprints
          };
        },
        expectedKey: "noLongerGenerated"
      }
    ];

    for (const entry of cases) {
      const storage = new CountingStorage();
      createCanvasProject(storage);
      const input = await entry.mutate(storage);
      storage.writes = 0;
      let uuidCalls = 0;
      let clockCalls = 0;
      const result = await materializeProjectPlanningClarifications(projectId, input, storage, {
        uuid: () => {
          uuidCalls += 1;
          return uuid(200);
        },
        now: () => {
          clockCalls += 1;
          return timestamp;
        }
      });

      expect(result.outcome).toBe("blocked");
      expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "lifecycleMutationRequired" })]));
      expect(JSON.stringify(result)).toContain(entry.expectedKey === "noLongerGenerated" ? "Existing-only" : "Changed");
      expect(uuidCalls).toBe(0);
      expect(clockCalls).toBe(0);
      expect(storage.writes).toBe(0);
    }
  });

  it("blocks exact proposal source-binding mismatches without repair", async () => {
    const fixture = await ttiFixture();
    const storage = new CountingStorage();
    createCanvasProject(storage);
    const project = await persistExactSubset(storage, fixture, 11);
    persistProject(storage, {
      ...project,
      planning: {
        ...project.planning!,
        proposals: project.planning!.proposals.map((proposal, index) => index === 0
          ? { ...proposal, sourceIds: [...proposal.sourceIds].reverse() }
          : proposal)
      }
    });
    const before = JSON.stringify(loadStorageState(storage));
    storage.writes = 0;

    const result = await materializeProjectPlanningClarifications(projectId, fixture, storage, {
      uuid: () => uuid(200),
      now: () => timestamp
    });

    expect(result.outcome).toBe("blocked");
    expect(result.issues).toEqual([expect.objectContaining({ code: "existingProposalSourceBindingMismatch" })]);
    expect(storage.writes).toBe(0);
    expect(JSON.stringify(loadStorageState(storage))).toBe(before);
  });

  it("detects concurrent project changes before UUID, clock, or storage write", async () => {
    const fixture = await ttiFixture();
    const storage = new CountingStorage();
    createCanvasProject(storage);
    storage.getCount = 0;
    storage.beforeGet = (target) => {
      if (target.getCount === 2) {
        const state = stateFrom(target);
        target.values.set(STORAGE_KEY, JSON.stringify({
          ...state,
          projects: state.projects.map((project) => project.identity.id === projectId
            ? { ...project, identity: { ...project.identity, projectName: "Changed during materialization" } }
            : project)
        }));
      }
    };
    storage.writes = 0;
    let uuidCalls = 0;
    let clockCalls = 0;

    const result = await materializeProjectPlanningClarifications(projectId, fixture, storage, {
      uuid: () => {
        uuidCalls += 1;
        return uuid(300);
      },
      now: () => {
        clockCalls += 1;
        return timestamp;
      }
    });

    expect(result.outcome).toBe("blocked");
    expect(result.issues).toEqual([expect.objectContaining({ code: "projectChangedDuringMaterialization" })]);
    expect(uuidCalls).toBe(0);
    expect(clockCalls).toBe(0);
    expect(storage.writes).toBe(0);
    expect(getProjectById(projectId, storage)?.identity.projectName).toBe("Changed during materialization");
  });

  it("fails runtime UUID and clock defects without partial persistence", async () => {
    const fixture = await ttiFixture();
    const runtimeCases = [
      { issueCode: "uuidUnavailable", uuid: () => null as unknown as string, now: () => timestamp },
      { issueCode: "invalidGeneratedUuid", uuid: () => "not-a-uuid", now: () => timestamp },
      { issueCode: "invalidGeneratedUuid", uuid: () => "70000000-0000-4000-8000-0000000000AA", now: () => timestamp },
      { issueCode: "duplicateGeneratedUuid", uuid: () => uuid(400), now: () => timestamp },
      { issueCode: "invalidMaterializationTimestamp", uuid: () => uuid(401), now: () => "2026-07-22T12:00:00Z" },
      { issueCode: "invalidMaterializationTimestamp", uuid: () => uuid(402), now: () => "2026-07-22T12:00:00.000-06:00" },
      { issueCode: "invalidMaterializationTimestamp", uuid: () => uuid(403), now: () => "2026-02-30T12:00:00.000Z" }
    ];

    for (const entry of runtimeCases) {
      const storage = new CountingStorage();
      createCanvasProject(storage);
      const before = JSON.stringify(loadStorageState(storage));
      storage.writes = 0;
      const result = await materializeProjectPlanningClarifications(projectId, fixture, storage, entry);
      expect(result.outcome).toBe("blocked");
      expect(result.issues).toEqual([expect.objectContaining({ code: entry.issueCode })]);
      expect(storage.writes).toBe(0);
      expect(JSON.stringify(loadStorageState(storage))).toBe(before);
    }
  });

  it("detects generated UUID collisions against every existing planning ID collection", async () => {
    const fixture = await ttiFixture();
    const unrelatedSource = planningSource(500);
    const unrelatedProposal = planningProposal(unrelatedSource.sourceId);
    const decision = planningDecision(unrelatedProposal.proposalId);
    const dependency = planningDependency(unrelatedProposal.proposalId);
    const conflict = planningConflict(unrelatedProposal.proposalId);
    const collisionIds = [
      unrelatedSource.sourceId,
      unrelatedProposal.proposalId,
      decision.decisionId,
      dependency.dependencyId,
      conflict.conflictId
    ];

    for (const collisionId of collisionIds) {
      const storage = new CountingStorage();
      const project = createCanvasProject(storage);
      persistProject(storage, {
        ...project,
        planning: {
          ...createEmptyProjectPlanningState(),
          sources: [unrelatedSource],
          proposals: [unrelatedProposal],
          decisions: [decision],
          dependencies: [dependency],
          conflicts: [conflict]
        }
      });
      storage.writes = 0;
      const result = await materializeProjectPlanningClarifications(projectId, fixture, storage, {
        uuid: () => collisionId,
        now: () => timestamp
      });
      expect(result.outcome).toBe("blocked");
      expect(result.issues).toEqual([expect.objectContaining({ code: "duplicateGeneratedUuid", persistedId: collisionId })]);
      expect(storage.writes).toBe(0);
    }
  });

  it("fails candidate normalization for collection caps and storage failures atomically", async () => {
    const fixture = await ttiFixture();
    const capStorage = new CountingStorage();
    const capProject = createCanvasProject(capStorage);
    persistProject(capStorage, {
      ...capProject,
      planning: {
        ...createEmptyProjectPlanningState(),
        sources: Array.from({ length: 990 }, (_, index) => planningSource(index + 1))
      }
    });
    capStorage.writes = 0;
    const capResult = await materializeProjectPlanningClarifications(projectId, fixture, capStorage, {
      uuid: uuidFactory(2000).uuid,
      now: () => timestamp
    });
    expect(capResult.outcome).toBe("blocked");
    expect(capResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "candidatePlanningInvalid", sourceIssueCode: "collectionCapExceeded" })
    ]));
    expect(capStorage.writes).toBe(0);

    const failStorage = new CountingStorage();
    createCanvasProject(failStorage);
    failStorage.writes = 0;
    failStorage.failWrites = true;
    const failure = await materializeProjectPlanningClarifications(projectId, fixture, failStorage, {
      uuid: uuidFactory(700).uuid,
      now: () => timestamp
    });
    expect(failure.outcome).toBe("persistenceFailed");
    expect(failure.issues).toEqual([expect.objectContaining({ code: "persistenceFailed" })]);
    expect(getProjectById(projectId, failStorage)?.planning?.sources ?? []).toEqual([]);
  });

  it("preserves input, historical records, unrelated projects, readiness/output/UI boundaries, and privacy", async () => {
    const fixture = await ttiFixture();
    const storage = new CountingStorage();
    const project = createCanvasProject(storage);
    const other = createProject({ identity: { id: "other-project", projectName: "Other" }, now: "2026-07-20T10:00:00.000Z" }, storage);
    const historicalSource = sourceRecord(fixture.sources[0], 900);
    const historicalProposal = proposalRecord(fixture.proposals[0], fixture.fingerprints[0], 900, [historicalSource.sourceId]);
    persistProject(storage, {
      ...project,
      planning: {
        ...createEmptyProjectPlanningState(),
        sources: [{ ...historicalSource, availability: "stale" }],
        proposals: [{ ...historicalProposal, status: "Rejected" }]
      }
    });
    const input = clone(fixture);
    const beforeInput = JSON.stringify(input);
    const beforeOther = JSON.stringify(getProjectById(other.identity.id, storage));
    const beforeHistorical = JSON.stringify(getProjectById(projectId, storage)?.planning);

    const result = await materializeProjectPlanningClarifications(projectId, input, storage, {
      uuid: uuidFactory(800).uuid,
      now: () => timestamp
    });
    expect(result.outcome).toBe("persisted");
    expect(JSON.stringify(input)).toBe(beforeInput);
    expect(JSON.stringify(getProjectById(other.identity.id, storage))).toBe(beforeOther);
    expect(JSON.stringify(getProjectById(projectId, storage)?.planning)).toContain(JSON.parse(beforeHistorical).sources[0].sourceId);
    const source = readFileSync("src/lib/planningClarificationMaterialization.ts", "utf8");
    expect(source).not.toMatch(/Math\.random|Date\.now|fetch\s*\(|XMLHttpRequest|axios|provider|apiKey|accessToken|telemetry/i);
    expect(source).not.toMatch(/markStale|supersededByProposalId:\s|appendDecision|createDependency|createConflict|readyForCodex|generateProjectPackage|exportProjectPackage|Power Fx|YAML/i);

    const mutable = await materializeProjectPlanningClarifications(projectId, fixture, storage);
    (mutable.createdSources as Array<unknown>).push({ semanticKey: "changed", persistedId: "changed" });
    const fresh = await materializeProjectPlanningClarifications(projectId, fixture, storage);
    expect(fresh.createdSources).toEqual([]);
    expect(fresh.outcome).toBe("unchanged");
  });

  it("returns project boundary failures without writes", async () => {
    const fixture = await ttiFixture();
    const storage = new CountingStorage();
    createProject({ identity: { id: "web-project" }, intake: { appType: "webApplication" } }, storage);
    storage.writes = 0;
    await expect(materializeProjectPlanningClarifications("missing-project", fixture, storage)).resolves.toMatchObject({ outcome: "projectNotFound" });
    await expect(materializeProjectPlanningClarifications("bad\nid", fixture, storage)).resolves.toMatchObject({ outcome: "blocked", issues: [expect.objectContaining({ code: "invalidProjectId" })] });
    await expect(materializeProjectPlanningClarifications("web-project", fixture, storage)).resolves.toMatchObject({ outcome: "unsupportedProjectType" });
    expect(storage.writes).toBe(0);
  });
});
