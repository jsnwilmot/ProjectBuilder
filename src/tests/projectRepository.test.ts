// @ts-expect-error -- Vitest runs Web Crypto setup in Node; the app tsconfig intentionally excludes Node ambient types.
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, vi } from "vitest";
import { CORE_DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createSeedProject } from "../data/seedProject";
import { expectedDocumentLocations } from "../lib/powerPlatform";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  createEmptyProjectPlanningState,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningDependencyRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
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
import { getPlanningRuleById } from "../lib/planningRules";
import type { ProjectRecord } from "../types/project";
import {
  RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
  RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS,
  type RecordLifecycleFormulaReviewEvidenceRecord,
  type RecordLifecycleFormulaStudioValidationChecks
} from "../lib/recordLifecycleFormulaEvidence";
import { RECORD_LIFECYCLE_POWER_FX_ASSET_ID } from "../lib/recordLifecyclePowerFxGeneration";
import {
  clearPersistenceWarning,
  getPersistenceWarning,
  LEGACY_STORAGE_KEY,
  PREVIOUS_STORAGE_KEY,
  STORAGE_KEY,
  archiveProject,
  createProject,
  deleteProject,
  duplicateProject,
  getActiveProject,
  getProjectById,
  listProjects,
  loadStorageState,
  materializeProjectPlanningClarifications,
  materializeProjectPlanningClarificationReplacements,
  materializeProjectPlanningClarificationStaleTransitions,
  resetStorage,
  restoreProject,
  saveGeneratedDocuments,
  saveStorageState,
  setActiveProject,
  updateProjectFields,
  updateProject,
  updateReadinessConfirmation,
  updateReviewItem,
  type StorageAdapter
} from "../lib/projectRepository";
import { CURRENT_STORAGE_VERSION, migrateStorageState } from "../lib/storageVersion";
import type { PowerPlatformGateStatus } from "../types/project";

class MemoryStorage implements StorageAdapter {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

class WriteFailStorage extends MemoryStorage {
  override setItem(key: string, value: string) {
    if (key === STORAGE_KEY) {
      throw new Error("quota exceeded");
    }
    super.setItem(key, value);
  }
}

class CountingStorage extends MemoryStorage {
  writes = 0;
  override setItem(key: string, value: string) {
    if (key === STORAGE_KEY) {
      this.writes += 1;
    }
    super.setItem(key, value);
  }
}

class ChangingReadStorage extends MemoryStorage {
  private currentReads = 0;
  override getItem(key: string) {
    const value = super.getItem(key);
    if (key !== STORAGE_KEY || !value) {
      return value;
    }
    this.currentReads += 1;
    if (this.currentReads === 2) {
      const parsed = JSON.parse(value) as { projects: ProjectRecord[] };
      super.setItem(key, JSON.stringify({
        ...parsed,
        projects: parsed.projects.map((project, index) => index === 0 ? {
          ...project,
          updatedAt: "2026-07-22T13:30:00.000Z"
        } : project)
      }));
      return super.getItem(key);
    }
    return value;
  }
}

function evidenceChecks(): RecordLifecycleFormulaStudioValidationChecks {
  return Object.fromEntries(RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS.map((check) => [check, true])) as RecordLifecycleFormulaStudioValidationChecks;
}

function technicalEvidence(overrides: Partial<RecordLifecycleFormulaReviewEvidenceRecord> = {}): RecordLifecycleFormulaReviewEvidenceRecord {
  return {
    evidenceId: "evidence-tech-001",
    evidenceSchemaVersion: RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
    evidenceType: "Technical Review",
    projectId: "original-project",
    assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
    reviewContractVersion: "phase-5b.4d.2.1",
    reviewContractChecksum: "fnv1a-evidence001",
    reviewerDisplayName: "Review Owner",
    reviewerRole: "Technical reviewer",
    recordedAt: "2026-07-31T18:30:00.000Z",
    outcome: "Accepted",
    ...overrides
  } as RecordLifecycleFormulaReviewEvidenceRecord;
}

function studioEvidence(overrides: Partial<RecordLifecycleFormulaReviewEvidenceRecord> = {}): RecordLifecycleFormulaReviewEvidenceRecord {
  return {
    evidenceId: "evidence-studio-001",
    evidenceSchemaVersion: RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
    evidenceType: "Power Apps Studio Validation",
    projectId: "original-project",
    assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
    reviewContractVersion: "phase-5b.4d.2.1",
    reviewContractChecksum: "fnv1a-evidence001",
    reviewerDisplayName: "Studio Owner",
    reviewerRole: "Studio validator",
    recordedAt: "2026-07-31T19:30:00.000Z",
    outcome: "Passed",
    validationEnvironment: "Power Apps test environment",
    checks: evidenceChecks(),
    ...overrides
  } as RecordLifecycleFormulaReviewEvidenceRecord;
}

const planningSourceId = "11111111-1111-4111-8111-111111111111";
const planningProposalId = "22222222-2222-4222-8222-222222222222";
const planningDecisionId = "33333333-3333-4333-8333-333333333333";
const planningDependencyId = "44444444-4444-4444-8444-444444444444";
const planningConflictId = "55555555-5555-4555-8555-555555555555";
const planningTimestamp = "2026-08-01T10:30:00-06:00";
const planningTimestampUtc = "2026-08-01T16:30:00.000Z";
const planningFingerprint = "a".repeat(64);
const staleProjectId = "tti-software-licence-tracker";
const staleTimestamp = "2026-07-22T12:00:00.000Z";
const staleMaterializedAt = "2026-07-22T13:00:00.000Z";
const staleDecisionId = "74000000-0000-4000-8000-000000000001";
const staleRuleIds = [
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

const staleGateStatuses: Record<PhaseGateId, PowerPlatformGateStatus> = {
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

function planningSource(overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return {
    sourceId: planningSourceId,
    sourceType: "confirmedIntake",
    locator: "foundation.appPurpose",
    label: "App purpose",
    authority: "confirmed",
    availability: "current",
    ...overrides
  };
}

function planningProposal(projectId: string, overrides: Partial<PlanningProposalRecord> = {}): PlanningProposalRecord {
  return {
    proposalId: planningProposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: "foundation-purpose-rule",
    ruleVersion: "phase-5c.1.1",
    fingerprint: planningFingerprint,
    target: {
      kind: "projectField",
      domain: "foundation",
      targetKey: "appPurpose",
      operation: "setValue"
    },
    category: "architectProposal",
    status: "Proposed",
    value: { kind: "text", value: "Use the confirmed intake purpose." },
    title: "Confirm app purpose",
    recommendation: "Use the confirmed intake purpose.",
    rationale: "The intake answer is the highest available confirmed source.",
    sourceIds: [planningSourceId],
    uncertainty: "Known",
    restriction: "concreteProposalAllowed",
    createdAt: planningTimestamp,
    updatedAt: planningTimestamp,
    ...overrides
  };
}

function planningDecision(projectId: string, overrides: Partial<PlanningDecisionRecord> = {}): PlanningDecisionRecord {
  return {
    decisionId: planningDecisionId,
    proposalId: planningProposalId,
    projectId,
    action: "confirm",
    previousStatus: "Proposed",
    resultingStatus: "Confirmed",
    origin: "userAction",
    recordedAt: planningTimestamp,
    ...overrides
  };
}

function planningDependency(overrides: Partial<PlanningDependencyRecord> = {}): PlanningDependencyRecord {
  return {
    dependencyId: planningDependencyId,
    sourceProposalId: planningProposalId,
    dependencyType: "requiresReadiness",
    target: { kind: "readinessRequirementId", readinessRequirementId: "powerPlatformGatesConfirmed" },
    required: true,
    rationale: "The readiness requirement must remain unresolved until explicitly confirmed.",
    ...overrides
  };
}

function planningConflict(projectId: string, overrides: Partial<PlanningConflictRecord> = {}): PlanningConflictRecord {
  return {
    conflictId: planningConflictId,
    projectId,
    conflictType: "proposalVsIntake",
    severity: "blocking",
    status: "open",
    involvedReferences: [{ kind: "proposalId", proposalId: planningProposalId }],
    explanation: "The proposal conflicts with confirmed intake.",
    blocking: true,
    createdAt: planningTimestamp,
    ...overrides
  };
}

function validPlanning(projectId: string, overrides: Partial<ProjectPlanningState> = {}): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: [planningSource()],
    proposals: [planningProposal(projectId)],
    decisions: [],
    dependencies: [],
    conflicts: [],
    ...overrides
  };
}

function staleGate(id: PhaseGateId, status: PowerPlatformGateStatus): PhaseGateResult {
  return {
    id,
    label: `Gate ${id}`,
    status,
    blockingReason: `TTI ${id} blocker remains unresolved.`,
    sourceSection: `TTI ${id} source section`
  };
}

async function staleFixture() {
  const draftResult = generatePlanningClarificationDrafts({
    projectId: staleProjectId,
    projectType: "powerAppsCanvas",
    gateResults: staleRuleIds.map((ruleId) => {
      const rule = getPlanningRuleById(ruleId)!;
      return staleGate(rule.target.targetKey, staleGateStatuses[rule.target.targetKey]);
    })
  });
  expect(draftResult.issues).toEqual([]);
  const blueprintResult = generatePlanningClarificationBlueprints({
    projectId: staleProjectId,
    drafts: draftResult.drafts
  });
  expect(blueprintResult.issues).toEqual([]);
  const fingerprintResult = await generatePlanningClarificationFingerprints({
    projectId: staleProjectId,
    sources: blueprintResult.sources,
    proposals: blueprintResult.proposals
  });
  expect(fingerprintResult.issues).toEqual([]);
  return {
    sources: JSON.parse(JSON.stringify(blueprintResult.sources)) as PlanningClarificationSourceBlueprint[],
    proposals: JSON.parse(JSON.stringify(blueprintResult.proposals)) as PlanningClarificationProposalBlueprint[],
    fingerprints: JSON.parse(JSON.stringify(fingerprintResult.fingerprints)) as PlanningClarificationFingerprintRecord[]
  };
}

function stalePlanning(fixture: Awaited<ReturnType<typeof staleFixture>>): ProjectPlanningState {
  const sources = fixture.sources.map((source, index) => staleSourceRecord(source, index));
  const sourceIdsByKey = new Map(sources.map((source) => [staleSourceKey(source), source.sourceId]));
  return {
    ...createEmptyProjectPlanningState(),
    sources,
    proposals: fixture.proposals.map((proposal, index) => staleProposalRecord(
      proposal,
      fixture.fingerprints[index],
      index,
      proposal.sourceKeys.map((sourceKey) => sourceIdsByKey.get(sourceKey)!)
    ))
  };
}

function staleSourceRecord(source: PlanningClarificationSourceBlueprint, index: number): PlanningSourceReference {
  return {
    sourceId: `75000000-0000-4000-8000-${(index + 1).toString().padStart(12, "0")}`,
    sourceType: source.sourceType,
    locator: source.locator,
    label: source.label,
    authority: source.authority,
    availability: "current",
    observedAt: staleTimestamp,
    ...(source.version ? { version: source.version } : {}),
    ...(source.excerpt ? { excerpt: source.excerpt } : {})
  };
}

function staleProposalRecord(
  proposal: PlanningClarificationProposalBlueprint,
  fingerprintRecord: PlanningClarificationFingerprintRecord,
  index: number,
  sourceIds: readonly string[]
): PlanningProposalRecord {
  return {
    proposalId: `76000000-0000-4000-8000-${(index + 1).toString().padStart(12, "0")}`,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId: staleProjectId,
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
    createdAt: staleTimestamp,
    updatedAt: staleTimestamp,
    consequence: proposal.consequence,
    readinessRequirementIds: [...proposal.readinessRequirementIds],
    applicableProjectTypes: [...proposal.applicableProjectTypes],
    applicableDomains: [...proposal.applicableDomains]
  };
}

function staleSourceKey(source: PlanningSourceReference): string {
  return source.sourceType === "projectRule"
    ? `projectRule|${source.locator.slice("planning-rule:".length)}|${source.version}`
    : `readinessPrerequisite|${source.locator.slice("phase-gate:".length)}`;
}

function staleProposalSourceKey(
  fixture: Awaited<ReturnType<typeof staleFixture>>,
  proposalIndex: number,
  prefix: string
): string {
  return fixture.proposals[proposalIndex].sourceKeys.find((sourceKey) => sourceKey.startsWith(prefix))!;
}

function mutateStaleSourceLabel(planning: ProjectPlanningState, sourceKey: string): string {
  const source = planning.sources.find((entry) => staleSourceKey(entry) === sourceKey)!;
  planning.sources = planning.sources.map((entry) =>
    entry.sourceId === source.sourceId ? { ...entry, label: `${entry.label} previous` } : entry
  );
  return source.sourceId;
}

function markReplacementSourceStale(planning: ProjectPlanningState, sourceKey: string): string {
  const source = planning.sources.find((entry) => staleSourceKey(entry) === sourceKey)!;
  planning.sources = planning.sources.map((entry) =>
    entry.sourceId === source.sourceId ? { ...entry, availability: "stale" } : entry
  );
  return source.sourceId;
}

function markReplacementProposalStale(
  planning: ProjectPlanningState,
  proposalIndex: number,
  reason: "sourceChanged" | "ruleChanged" | "applicabilityChanged",
  overrides: Partial<PlanningProposalRecord> = {}
): { proposalId: string; decisionId: string } {
  const proposal = planning.proposals[proposalIndex];
  const decisionId = `78000000-0000-4000-8000-${(proposalIndex + 1).toString().padStart(12, "0")}`;
  planning.proposals = planning.proposals.map((entry, index) => index === proposalIndex ? {
    ...entry,
    ...overrides,
    status: "Stale",
    staleReason: reason,
    staleAt: staleMaterializedAt,
    updatedAt: staleMaterializedAt,
    lastDecisionId: decisionId
  } : entry);
  planning.decisions = [...planning.decisions, {
    decisionId,
    proposalId: proposal.proposalId,
    projectId: staleProjectId,
    action: "markStale",
    previousStatus: proposal.status,
    resultingStatus: "Stale",
    origin: "deterministicRule",
    recordedAt: staleMaterializedAt,
    reason,
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  }];
  return { proposalId: proposal.proposalId, decisionId };
}

async function replacementChangedSourceFixture(
  fixture: Awaited<ReturnType<typeof staleFixture>>,
  sourceKey: string
): Promise<Awaited<ReturnType<typeof staleFixture>>> {
  const sources = fixture.sources.map((source) =>
    source.sourceKey === sourceKey ? { ...source, label: `${source.label} replacement` } : source
  );
  const proposals = replacementWithUpdatedSourceEvidenceInputs(fixture.proposals, sources);
  const fingerprintResult = await generatePlanningClarificationFingerprints({
    projectId: staleProjectId,
    sources,
    proposals
  });
  expect(fingerprintResult.issues).toEqual([]);
  return {
    sources: JSON.parse(JSON.stringify(sources)) as PlanningClarificationSourceBlueprint[],
    proposals: JSON.parse(JSON.stringify(proposals)) as PlanningClarificationProposalBlueprint[],
    fingerprints: JSON.parse(JSON.stringify(fingerprintResult.fingerprints)) as PlanningClarificationFingerprintRecord[]
  };
}

function replacementWithUpdatedSourceEvidenceInputs(
  proposals: readonly PlanningClarificationProposalBlueprint[],
  sources: readonly PlanningClarificationSourceBlueprint[]
): PlanningClarificationProposalBlueprint[] {
  const sourcesByKey = new Map(sources.map((source) => [source.sourceKey, source]));
  return proposals.map((proposal) => {
    const parsed = JSON.parse(proposal.fingerprintInput) as {
      sourceEvidence: Array<Record<string, unknown> & { sourceKey: string }>;
    };
    const sourceEvidence = parsed.sourceEvidence.map((entry) => {
      const source = sourcesByKey.get(entry.sourceKey);
      return source
        ? {
            ...entry,
            sourceType: source.sourceType,
            locator: source.locator,
            label: source.label,
            authority: source.authority,
            availability: source.availability,
            version: source.version ?? null,
            excerpt: source.excerpt ?? null
          }
        : entry;
    });
    return {
      ...proposal,
      fingerprintInput: JSON.stringify({ ...parsed, sourceEvidence })
    };
  });
}

function replacementUuid(index: number): string {
  return `79000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("projectRepository", () => {
  it("saves and loads versioned state", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    saveStorageState({ version: 3, activeProjectId: project.identity.id, projects: [project] }, storage);
    const loaded = loadStorageState(storage);
    expect(CURRENT_STORAGE_VERSION).toBe(4);
    expect(loaded.version).toBe(4);
    expect(loaded.activeProjectId).toBe(project.identity.id);
    expect(loaded.projects[0].identity.projectName).toBe("Community Services Portal");
    expect(loaded.projects[0].status).toBe("Intake Complete");
    expect(loaded.projects[0].planning).toEqual(createEmptyProjectPlanningState());
  });

  it("guards clarification materialization project lookup and project-type boundaries without storage writes", async () => {
    const storage = new MemoryStorage();
    createProject({
      identity: { id: "web-project", projectName: "Web Project" },
      intake: { appType: "webApplication" }
    }, storage);
    const before = storage.getItem(STORAGE_KEY);

    await expect(materializeProjectPlanningClarifications("missing-project", {
      sources: [],
      proposals: [],
      fingerprints: []
    }, storage)).resolves.toMatchObject({ outcome: "projectNotFound" });
    await expect(materializeProjectPlanningClarifications("invalid\nproject", {
      sources: [],
      proposals: [],
      fingerprints: []
    }, storage)).resolves.toMatchObject({
      outcome: "blocked",
      issues: [expect.objectContaining({ code: "invalidProjectId" })]
    });
    await expect(materializeProjectPlanningClarifications("web-project", {
      sources: [],
      proposals: [],
      fingerprints: []
    }, storage)).resolves.toMatchObject({ outcome: "unsupportedProjectType" });

    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("guards stale-transition materialization project lookup and project-type boundaries without storage writes or runtime calls", async () => {
    const storage = new MemoryStorage();
    createProject({
      identity: { id: "web-project", projectName: "Web Project" },
      intake: { appType: "webApplication" }
    }, storage);
    const before = storage.getItem(STORAGE_KEY);
    const runtimeCalls = { now: 0, uuid: 0 };
    const runtime = {
      now: () => {
        runtimeCalls.now += 1;
        return staleMaterializedAt;
      },
      uuid: () => {
        runtimeCalls.uuid += 1;
        return staleDecisionId;
      }
    };

    await expect(materializeProjectPlanningClarificationStaleTransitions("missing-project", {
      sources: [],
      proposals: [],
      fingerprints: []
    }, storage, runtime)).resolves.toMatchObject({ outcome: "projectNotFound" });
    await expect(materializeProjectPlanningClarificationStaleTransitions("invalid\nproject", {
      sources: [],
      proposals: [],
      fingerprints: []
    }, storage, runtime)).resolves.toMatchObject({
      outcome: "blocked",
      issues: [expect.objectContaining({ code: "invalidProjectId" })]
    });
    await expect(materializeProjectPlanningClarificationStaleTransitions("web-project", {
      sources: [],
      proposals: [],
      fingerprints: []
    }, storage, runtime)).resolves.toMatchObject({ outcome: "unsupportedProjectType" });

    expect(runtimeCalls).toEqual({ now: 0, uuid: 0 });
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("persists stale transitions atomically while preserving non-planning project fields", async () => {
    const fixture = await staleFixture();
    const planning = stalePlanning(fixture);
    const sourceKey = staleProposalSourceKey(fixture, 0, "readinessPrerequisite|");
    const sourceId = mutateStaleSourceLabel(planning, sourceKey);
    const storage = new CountingStorage();
    const project = createProject({
      identity: { id: staleProjectId, projectName: "TTI Software Licence Tracker" },
      intake: { appType: "powerAppsCanvas" },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Existing package" }],
      packageGeneratedAt: "2026-07-22T11:00:00.000Z",
      readinessConfirmations: { scopeReviewed: true },
      now: staleTimestamp
    }, new MemoryStorage());
    saveStorageState({
      version: 4,
      activeProjectId: staleProjectId,
      projects: [{ ...project, planning }]
    }, storage);
    const writesBefore = storage.writes;

    const result = await materializeProjectPlanningClarificationStaleTransitions(staleProjectId, {
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    }, storage, {
      now: () => staleMaterializedAt,
      uuid: () => staleDecisionId
    });

    expect(result).toMatchObject({
      outcome: "persisted",
      transitionedSources: [{ semanticKey: sourceKey, persistedId: sourceId, staleReason: "sourceChanged" }],
      transitionedProposals: [{ decisionId: staleDecisionId, staleReason: "sourceChanged" }],
      issues: []
    });
    expect(storage.writes).toBe(writesBefore + 1);
    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.updatedAt).toBe(staleMaterializedAt);
    expect(loaded.generatedDocuments).toEqual(project.generatedDocuments);
    expect(loaded.packageGeneratedAt).toBe("2026-07-22T11:00:00.000Z");
    expect(loaded.readinessConfirmations).toEqual({ scopeReviewed: true });
    expect(loaded.planning?.sources.find((source) => source.sourceId === sourceId)).toMatchObject({
      availability: "stale",
      observedAt: staleTimestamp
    });
    expect(loaded.planning?.proposals[0]).toMatchObject({
      status: "Stale",
      staleReason: "sourceChanged",
      staleAt: staleMaterializedAt,
      updatedAt: staleMaterializedAt,
      lastDecisionId: staleDecisionId
    });
    expect(loaded.planning?.decisions[0]).toMatchObject({
      decisionId: staleDecisionId,
      action: "markStale",
      previousStatus: "Needs Clarification",
      resultingStatus: "Stale",
      origin: "deterministicRule",
      reason: "sourceChanged",
      recordedAt: staleMaterializedAt
    });
    expect(loaded.planning?.decisions[0].sourceIds).toBeUndefined();
  });

  it("blocks stale materialization when the project changes between preparation and write", async () => {
    const fixture = await staleFixture();
    const planning = stalePlanning(fixture);
    mutateStaleSourceLabel(planning, staleProposalSourceKey(fixture, 0, "readinessPrerequisite|"));
    const storage = new ChangingReadStorage();
    const project = createProject({
      identity: { id: staleProjectId, projectName: "TTI Software Licence Tracker" },
      intake: { appType: "powerAppsCanvas" },
      now: staleTimestamp
    }, new MemoryStorage());
    saveStorageState({
      version: 4,
      activeProjectId: staleProjectId,
      projects: [{ ...project, planning }]
    }, storage);
    const beforeRuntime = { now: 0, uuid: 0 };

    const result = await materializeProjectPlanningClarificationStaleTransitions(staleProjectId, {
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    }, storage, {
      now: () => {
        beforeRuntime.now += 1;
        return staleMaterializedAt;
      },
      uuid: () => {
        beforeRuntime.uuid += 1;
        return staleDecisionId;
      }
    });

    expect(result).toMatchObject({
      outcome: "blocked",
      issues: [expect.objectContaining({ code: "projectChangedDuringMaterialization" })]
    });
    expect(beforeRuntime).toEqual({ now: 0, uuid: 0 });
    expect(loadStorageState(storage).projects[0].updatedAt).toBe("2026-07-22T13:30:00.000Z");
  });

  it("reports stale materialization persistence failure without mutating caller-owned project objects", async () => {
    clearPersistenceWarning();
    try {
      const fixture = await staleFixture();
      const planning = stalePlanning(fixture);
      mutateStaleSourceLabel(planning, staleProposalSourceKey(fixture, 0, "readinessPrerequisite|"));
      const project = createProject({
        identity: { id: staleProjectId, projectName: "TTI Software Licence Tracker" },
        intake: { appType: "powerAppsCanvas" },
        now: staleTimestamp
      }, new MemoryStorage());
      const callerState = {
        version: 4 as const,
        activeProjectId: staleProjectId,
        projects: [{ ...project, planning }]
      };
      const before = JSON.stringify(callerState);
      const storage = new WriteFailStorage();
      storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify(callerState));

      const result = await materializeProjectPlanningClarificationStaleTransitions(staleProjectId, {
        sources: fixture.sources,
        proposals: fixture.proposals,
        fingerprints: fixture.fingerprints
      }, storage, {
        now: () => staleMaterializedAt,
        uuid: () => staleDecisionId
      });

      expect(result).toMatchObject({
        outcome: "persistenceFailed",
        transitionedSources: [],
        transitionedProposals: [],
        issues: [expect.objectContaining({ code: "persistenceFailed" })]
      });
      expect(JSON.stringify(callerState)).toBe(before);
      expect(storage.getItem(STORAGE_KEY)).toBeNull();
      expect(storage.getItem(PREVIOUS_STORAGE_KEY)).not.toBeNull();
    } finally {
      clearPersistenceWarning();
    }
  });

  it("guards replacement materialization project lookup and project-type boundaries without storage writes or runtime calls", async () => {
    const storage = new MemoryStorage();
    createProject({
      identity: { id: "web-project", projectName: "Web Project" },
      intake: { appType: "webApplication" }
    }, storage);
    const before = storage.getItem(STORAGE_KEY);
    const runtimeCalls = { now: 0, uuid: 0 };
    const runtime = {
      now: () => {
        runtimeCalls.now += 1;
        return staleMaterializedAt;
      },
      uuid: () => {
        runtimeCalls.uuid += 1;
        return replacementUuid(1);
      }
    };

    await expect(materializeProjectPlanningClarificationReplacements("missing-project", {
      sources: [],
      proposals: [],
      fingerprints: []
    }, storage, runtime)).resolves.toMatchObject({ outcome: "projectNotFound" });
    await expect(materializeProjectPlanningClarificationReplacements("invalid\nproject", {
      sources: [],
      proposals: [],
      fingerprints: []
    }, storage, runtime)).resolves.toMatchObject({
      outcome: "blocked",
      issues: [expect.objectContaining({ code: "invalidProjectId" })]
    });
    await expect(materializeProjectPlanningClarificationReplacements("web-project", {
      sources: [],
      proposals: [],
      fingerprints: []
    }, storage, runtime)).resolves.toMatchObject({ outcome: "unsupportedProjectType" });

    expect(runtimeCalls).toEqual({ now: 0, uuid: 0 });
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("persists replacement materialization atomically while preserving project readiness and output fields", async () => {
    const fixture = await staleFixture();
    const planning = stalePlanning(fixture);
    const sourceKey = staleProposalSourceKey(fixture, 0, "readinessPrerequisite|");
    const staleSourceId = markReplacementSourceStale(planning, sourceKey);
    const staleProposal = markReplacementProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await replacementChangedSourceFixture(fixture, sourceKey);
    const storage = new CountingStorage();
    const project = createProject({
      identity: { id: staleProjectId, projectName: "TTI Software Licence Tracker" },
      intake: { appType: "powerAppsCanvas" },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Existing package" }],
      packageGeneratedAt: "2026-07-22T11:00:00.000Z",
      readinessConfirmations: { scopeReviewed: true },
      now: staleTimestamp
    }, new MemoryStorage());
    saveStorageState({
      version: 4,
      activeProjectId: staleProjectId,
      projects: [{ ...project, planning }]
    }, storage);
    const writesBefore = storage.writes;

    const result = await materializeProjectPlanningClarificationReplacements(staleProjectId, {
      sources: changedFixture.sources,
      proposals: changedFixture.proposals,
      fingerprints: changedFixture.fingerprints
    }, storage, {
      now: () => staleMaterializedAt,
      uuid: (() => {
        const ids = [replacementUuid(1), replacementUuid(2), replacementUuid(3)];
        let index = 0;
        return () => ids[index++]!;
      })()
    });

    expect(result).toMatchObject({
      outcome: "persisted",
      createdSources: [{ semanticKey: sourceKey, persistedId: replacementUuid(1) }],
      createdProposals: [{
        persistedId: replacementUuid(2),
        predecessorProposalId: staleProposal.proposalId,
        supersedeDecisionId: replacementUuid(3)
      }],
      issues: []
    });
    expect(storage.writes).toBe(writesBefore + 1);
    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.updatedAt).toBe(staleMaterializedAt);
    expect(loaded.generatedDocuments).toEqual(project.generatedDocuments);
    expect(loaded.packageGeneratedAt).toBe("2026-07-22T11:00:00.000Z");
    expect(loaded.readinessConfirmations).toEqual({ scopeReviewed: true });
    expect(loaded.planning?.sources.find((source) => source.sourceId === staleSourceId)).toMatchObject({ availability: "stale" });
    expect(loaded.planning?.sources.find((source) => source.sourceId === replacementUuid(1))).toMatchObject({
      availability: "current",
      observedAt: staleMaterializedAt
    });
    expect(loaded.planning?.proposals.find((proposal) => proposal.proposalId === staleProposal.proposalId)).toMatchObject({
      status: "Superseded",
      supersededByProposalId: replacementUuid(2),
      lastDecisionId: replacementUuid(3)
    });
    expect(loaded.planning?.proposals.find((proposal) => proposal.proposalId === replacementUuid(2))).toMatchObject({
      status: "Needs Clarification",
      createdAt: staleMaterializedAt,
      updatedAt: staleMaterializedAt
    });
    expect(loaded.planning?.decisions.at(-1)).toMatchObject({
      decisionId: replacementUuid(3),
      action: "supersede",
      previousStatus: "Stale",
      resultingStatus: "Superseded",
      origin: "deterministicRule"
    });
  });

  it("keeps replacement materialization idempotent after a successful transaction", async () => {
    const fixture = await staleFixture();
    const planning = stalePlanning(fixture);
    const sourceKey = staleProposalSourceKey(fixture, 0, "readinessPrerequisite|");
    markReplacementSourceStale(planning, sourceKey);
    markReplacementProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await replacementChangedSourceFixture(fixture, sourceKey);
    const storage = new CountingStorage();
    const project = createProject({
      identity: { id: staleProjectId, projectName: "TTI Software Licence Tracker" },
      intake: { appType: "powerAppsCanvas" },
      now: staleTimestamp
    }, new MemoryStorage());
    saveStorageState({ version: 4, activeProjectId: staleProjectId, projects: [{ ...project, planning }] }, storage);

    await materializeProjectPlanningClarificationReplacements(staleProjectId, changedFixture, storage, {
      now: () => staleMaterializedAt,
      uuid: (() => {
        const ids = [replacementUuid(4), replacementUuid(5), replacementUuid(6)];
        let index = 0;
        return () => ids[index++]!;
      })()
    });
    const writesAfterFirst = storage.writes;
    const runtimeCalls = { now: 0, uuid: 0 };
    const second = await materializeProjectPlanningClarificationReplacements(staleProjectId, changedFixture, storage, {
      now: () => {
        runtimeCalls.now += 1;
        return staleMaterializedAt;
      },
      uuid: () => {
        runtimeCalls.uuid += 1;
        return replacementUuid(7);
      }
    });

    expect(second).toMatchObject({ outcome: "unchanged", createdSources: [], createdProposals: [], issues: [] });
    expect(runtimeCalls).toEqual({ now: 0, uuid: 0 });
    expect(storage.writes).toBe(writesAfterFirst);
  });

  it("blocks replacement materialization when the project changes between preparation and write", async () => {
    const fixture = await staleFixture();
    const planning = stalePlanning(fixture);
    const sourceKey = staleProposalSourceKey(fixture, 0, "readinessPrerequisite|");
    markReplacementSourceStale(planning, sourceKey);
    markReplacementProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await replacementChangedSourceFixture(fixture, sourceKey);
    const storage = new ChangingReadStorage();
    const project = createProject({
      identity: { id: staleProjectId, projectName: "TTI Software Licence Tracker" },
      intake: { appType: "powerAppsCanvas" },
      now: staleTimestamp
    }, new MemoryStorage());
    saveStorageState({ version: 4, activeProjectId: staleProjectId, projects: [{ ...project, planning }] }, storage);
    const runtimeCalls = { now: 0, uuid: 0 };

    const result = await materializeProjectPlanningClarificationReplacements(staleProjectId, changedFixture, storage, {
      now: () => {
        runtimeCalls.now += 1;
        return staleMaterializedAt;
      },
      uuid: () => {
        runtimeCalls.uuid += 1;
        return replacementUuid(8);
      }
    });

    expect(result).toMatchObject({
      outcome: "blocked",
      issues: [expect.objectContaining({ code: "projectChangedDuringReplacementMaterialization" })]
    });
    expect(runtimeCalls).toEqual({ now: 0, uuid: 0 });
    expect(loadStorageState(storage).projects[0].updatedAt).toBe("2026-07-22T13:30:00.000Z");
  });

  it("reports replacement materialization persistence failure without false success", async () => {
    clearPersistenceWarning();
    try {
      const fixture = await staleFixture();
      const planning = stalePlanning(fixture);
      const sourceKey = staleProposalSourceKey(fixture, 0, "readinessPrerequisite|");
      markReplacementSourceStale(planning, sourceKey);
      markReplacementProposalStale(planning, 0, "sourceChanged");
      const changedFixture = await replacementChangedSourceFixture(fixture, sourceKey);
      const project = createProject({
        identity: { id: staleProjectId, projectName: "TTI Software Licence Tracker" },
        intake: { appType: "powerAppsCanvas" },
        now: staleTimestamp
      }, new MemoryStorage());
      const storage = new WriteFailStorage();
      storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
        version: 4,
        activeProjectId: staleProjectId,
        projects: [{ ...project, planning }]
      }));

      const result = await materializeProjectPlanningClarificationReplacements(staleProjectId, changedFixture, storage, {
        now: () => staleMaterializedAt,
        uuid: (() => {
          const ids = [replacementUuid(9), replacementUuid(10), replacementUuid(11)];
          let index = 0;
          return () => ids[index++]!;
        })()
      });

      expect(result).toMatchObject({
        outcome: "persistenceFailed",
        createdSources: [],
        createdProposals: [],
        issues: [expect.objectContaining({ code: "persistenceFailed" })]
      });
      expect(storage.getItem(STORAGE_KEY)).toBeNull();
    } finally {
      clearPersistenceWarning();
    }
  });

  it("keeps legacy-compatible storage keys and does not rewrite current saved records while loading", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    project.generatedDocuments = [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# Legacy wording\n\nGenerated by GPT Project Builder." }
    ];
    const persistedState = JSON.stringify({
      version: 2,
      activeProjectId: project.identity.id,
      projects: [project]
    });

    storage.setItem(STORAGE_KEY, persistedState);
    const loaded = loadStorageState(storage);

    expect(STORAGE_KEY).toBe("gpt-project-builder.storage.v2");
    expect(PREVIOUS_STORAGE_KEY).toBe("gpt-project-builder.storage.v1");
    expect(LEGACY_STORAGE_KEY).toBe("gpt-project-builder:project:v1");
    expect(loaded.projects[0].generatedDocuments[0].content).toContain("GPT Project Builder");
    expect(storage.getItem(STORAGE_KEY)).toBe(persistedState);
  });

  it("recovers safely from invalid localStorage data", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{not-json");
    expect(loadStorageState(storage)).toEqual({ version: 4, activeProjectId: null, projects: [] });
  });

  it("does not fallback to older keys when the current storage key is corrupt", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{broken-json");
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: "previous-id",
      projects: [createProject({ identity: { id: "previous-id", projectName: "Previous" } }, new MemoryStorage())]
    }));

    const loaded = loadStorageState(storage);

    expect(loaded).toEqual({ version: 4, activeProjectId: null, projects: [] });
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).not.toBeNull();
  });

  it("prioritizes the current storage key when both current and previous keys exist", () => {
    const storage = new MemoryStorage();
    const current = createProject({ identity: { id: "current", projectName: "Current" } }, new MemoryStorage());
    const previous = createProject({ identity: { id: "previous", projectName: "Previous" } }, new MemoryStorage());
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, activeProjectId: current.identity.id, projects: [current] }));
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({ version: 1, activeProjectId: previous.identity.id, projects: [previous] }));

    const loaded = loadStorageState(storage);

    expect(loaded.projects).toHaveLength(1);
    expect(loaded.projects[0].identity.id).toBe("current");
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).not.toBeNull();
  });

  it("migrates current-key version 3 projects to version 4 with separate empty planning and no fabricated records", () => {
    const storage = new MemoryStorage();
    const first = createProject({
      identity: { id: "v3-first", projectName: "V3 First" },
      intake: {
        appPurpose: "Track assets",
        requiredFeatures: "[MISSING: confirm required features]"
      },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Existing" }],
      packageGeneratedAt: "2026-07-31T10:00:00.000Z",
      status: "Project Package Generated",
      archivedAt: "2026-07-31T11:00:00.000Z",
      now: "2026-07-31T09:00:00.000Z"
    }, new MemoryStorage());
    const second = createProject({
      identity: { id: "v3-second", projectName: "V3 Second" },
      intake: { appPurpose: "Track licences" },
      now: "2026-07-31T09:05:00.000Z"
    }, new MemoryStorage());
    const rawState = {
      version: 3,
      activeProjectId: second.identity.id,
      projects: [
        {
          ...first,
          planning: validPlanning(first.identity.id)
        },
        second
      ]
    };
    const before = JSON.stringify(rawState);
    const persisted = JSON.stringify(rawState);
    storage.setItem(STORAGE_KEY, persisted);

    expect(migrateStorageState(rawState).version).toBe(4);
    const loaded = loadStorageState(storage);

    expect(JSON.stringify(rawState)).toBe(before);
    expect(storage.getItem(STORAGE_KEY)).toBe(persisted);
    expect(loaded.version).toBe(4);
    expect(loaded.activeProjectId).toBe(second.identity.id);
    expect(loaded.projects.map((project) => project.identity.id)).toEqual(["v3-first", "v3-second"]);
    expect(loaded.projects[0].generatedDocuments).toEqual(first.generatedDocuments);
    expect(loaded.projects[0].packageGeneratedAt).toBe("2026-07-31T10:00:00.000Z");
    expect(loaded.projects[0].reviewItems).toEqual(first.reviewItems);
    expect(loaded.projects[0].readinessConfirmations).toEqual(first.readinessConfirmations);
    expect(loaded.projects[0].archivedAt).toBe("2026-07-31T11:00:00.000Z");
    expect(loaded.projects[0].intake.requiredFeatures).toBe("[MISSING: confirm required features]");
    for (const project of loaded.projects) {
      expect(project.planning).toEqual(createEmptyProjectPlanningState());
      expect(project.planning?.sources).toEqual([]);
      expect(project.planning?.proposals).toEqual([]);
      expect(project.planning?.decisions).toEqual([]);
      expect(project.planning?.dependencies).toEqual([]);
      expect(project.planning?.conflicts).toEqual([]);
    }
    expect(loaded.projects[0].planning).not.toBe(loaded.projects[1].planning);
    expect(loaded.projects[0].planning?.sources).not.toBe(loaded.projects[1].planning?.sources);
  });

  it("normalizes valid version 4 planning and rejects malformed, unsupported, foreign, duplicate, over-cap, and unsafe planning", () => {
    const storage = new MemoryStorage();
    const validProject = createProject({
      identity: { id: "valid-planning-project", projectName: "Valid Planning" }
    }, new MemoryStorage());
    const missingPlanningProject = createProject({
      identity: { id: "missing-planning-project", projectName: "Missing Planning" }
    }, new MemoryStorage());
    const malformedPlanningProject = createProject({
      identity: { id: "malformed-planning-project", projectName: "Malformed Planning" }
    }, new MemoryStorage());
    const unsupportedPlanningProject = createProject({
      identity: { id: "unsupported-planning-project", projectName: "Unsupported Planning" }
    }, new MemoryStorage());
    const foreignPlanningProject = createProject({
      identity: { id: "foreign-planning-project", projectName: "Foreign Planning" }
    }, new MemoryStorage());
    const duplicatePlanningProject = createProject({
      identity: { id: "duplicate-planning-project", projectName: "Duplicate Planning" }
    }, new MemoryStorage());
    const overCapPlanningProject = createProject({
      identity: { id: "over-cap-planning-project", projectName: "Over Cap Planning" }
    }, new MemoryStorage());
    const unsafePlanningProject = createProject({
      identity: { id: "unsafe-planning-project", projectName: "Unsafe Planning" }
    }, new MemoryStorage());
    const invalidAuthorityProject = createProject({
      identity: { id: "invalid-authority-project", projectName: "Invalid Authority" }
    }, new MemoryStorage());
    const validState = validPlanning(validProject.identity.id, {
      proposals: [
        planningProposal(validProject.identity.id, {
          proposalId: planningProposalId.toUpperCase(),
          fingerprint: planningFingerprint.toUpperCase()
        })
      ]
    });
    const rawState = {
      version: 4,
      activeProjectId: validProject.identity.id,
      projects: [
        { ...validProject, planning: validState },
        missingPlanningProject,
        { ...malformedPlanningProject, planning: "not an object" },
        { ...unsupportedPlanningProject, planning: { ...validPlanning(unsupportedPlanningProject.identity.id), schemaVersion: "future" } },
        { ...foreignPlanningProject, planning: validPlanning(foreignPlanningProject.identity.id, { proposals: [planningProposal("other-project")] }) },
        {
          ...duplicatePlanningProject,
          planning: validPlanning(duplicatePlanningProject.identity.id, {
            sources: [planningSource(), planningSource()],
            proposals: [
              planningProposal(duplicatePlanningProject.identity.id),
              planningProposal(duplicatePlanningProject.identity.id)
            ]
          })
        },
        {
          ...overCapPlanningProject,
          planning: validPlanning(overCapPlanningProject.identity.id, {
            sources: Array.from({ length: 1001 }, (_, index) =>
              planningSource({ sourceId: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}` })
            )
          })
        },
        {
          ...unsafePlanningProject,
          planning: validPlanning(unsafePlanningProject.identity.id, {
            proposals: [
              planningProposal(unsafePlanningProject.identity.id, {
                value: { kind: "text", value: "Set(varArchive, true)" }
              })
            ]
          })
        },
        {
          ...invalidAuthorityProject,
          planning: validPlanning(invalidAuthorityProject.identity.id, {
            sources: [planningSource({ sourceType: "userAnswer", authority: "approved" as never })]
          })
        }
      ]
    };
    const before = JSON.stringify(rawState);
    storage.setItem(STORAGE_KEY, JSON.stringify(rawState));

    const loaded = loadStorageState(storage);
    const byId = Object.fromEntries(loaded.projects.map((project) => [project.identity.id, project]));

    expect(JSON.stringify(rawState)).toBe(before);
    expect(byId[validProject.identity.id].planning?.sources[0].sourceId).toBe(planningSourceId);
    expect(byId[validProject.identity.id].planning?.proposals[0]).toMatchObject({
      proposalId: planningProposalId,
      fingerprint: planningFingerprint,
      createdAt: planningTimestampUtc,
      updatedAt: planningTimestampUtc
    });
    expect(byId[missingPlanningProject.identity.id].planning).toEqual(createEmptyProjectPlanningState());
    expect(byId[malformedPlanningProject.identity.id].planning).toEqual(createEmptyProjectPlanningState());
    expect(byId[unsupportedPlanningProject.identity.id].planning).toEqual(createEmptyProjectPlanningState());
    expect(byId[foreignPlanningProject.identity.id].planning?.proposals).toEqual([]);
    expect(byId[duplicatePlanningProject.identity.id].planning?.sources).toEqual([]);
    expect(byId[duplicatePlanningProject.identity.id].planning?.proposals).toEqual([]);
    expect(byId[overCapPlanningProject.identity.id].planning?.sources).toEqual([]);
    expect(byId[unsafePlanningProject.identity.id].planning?.proposals).toEqual([]);
    expect(byId[invalidAuthorityProject.identity.id].planning?.sources).toEqual([]);
  });

  it("persists normalized planning through save and keeps caller objects and persisted state isolated on failed writes", () => {
    clearPersistenceWarning();
    try {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "atomic-planning-project", projectName: "Atomic Planning" }
      }, new MemoryStorage());
      saveStorageState({
        version: 4,
        activeProjectId: project.identity.id,
        projects: [{ ...project, planning: validPlanning(project.identity.id) }]
      }, storage);
      const persistedBefore = storage.getItem(STORAGE_KEY);
      const callerPlanning = validPlanning(project.identity.id);
      const callerState = {
        version: 4 as const,
        activeProjectId: project.identity.id,
        projects: [{ ...project, planning: callerPlanning }]
      };
      const callerBefore = JSON.stringify(callerState);
      const failingStorage = new WriteFailStorage();
      failingStorage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify(callerState));

      saveStorageState(callerState, failingStorage);

      expect(JSON.stringify(callerState)).toBe(callerBefore);
      expect(failingStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(failingStorage.getItem(PREVIOUS_STORAGE_KEY)).not.toBeNull();
      expect((getPersistenceWarning() ?? "").length).toBeGreaterThan(0);
      expect(storage.getItem(STORAGE_KEY)).toBe(persistedBefore);
      expect(loadStorageState(storage).projects[0].planning?.proposals[0].proposalId).toBe(planningProposalId);
    } finally {
      clearPersistenceWarning();
    }
  });

  it("migrates previous versioned storage into v4 and removes the previous key after a successful write", () => {
    const storage = new MemoryStorage();
    const previous = createProject({ identity: { id: "previous", projectName: "Previous" } }, new MemoryStorage());
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: previous.identity.id,
      projects: [previous]
    }));

    const loaded = loadStorageState(storage);

    expect(loaded.version).toBe(4);
    expect(loaded.projects[0].identity.id).toBe("previous");
    expect(loaded.projects[0].planning).toEqual(createEmptyProjectPlanningState());
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).toBeNull();
  });

  it("migrates a version-1 multi-project store while preserving active project, generated docs, review data, and legacy microsoft type", () => {
    const sourceStorageA = new MemoryStorage();
    const sourceStorageB = new MemoryStorage();

    const projectA = createProject({
      identity: { id: "project-a-stable", projectName: "Project A Stable" },
      client: { clientName: "Client A", businessName: "Business A" },
      intake: { appPurpose: "Track requests", requiredFeatures: "Dashboard" },
      status: "Project Package Generated",
      reviewStatus: "In review",
      now: "2026-07-11T09:00:00.000Z"
    }, sourceStorageA);
    const reviewItem = projectA.reviewItems[0];
    updateReviewItem(projectA.identity.id, reviewItem.id, {
      status: "Not applicable",
      notApplicableReason: "Handled in the source system."
    }, sourceStorageA);
    updateReadinessConfirmation(projectA.identity.id, "scopeReviewed", true, sourceStorageA);
    saveGeneratedDocuments(projectA.identity.id, [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# Preserved" }
    ], sourceStorageA);
    const persistedA = getProjectById(projectA.identity.id, sourceStorageA)!;

    const projectB = createProject({
      identity: { id: "project-b-stable", projectName: "Project B Stable" },
      client: { clientName: "Client B", businessName: "Business B" },
      intake: { appType: "microsoft365", appPurpose: "Legacy flow", workflows: "Approve requests" },
      status: "Intake Complete",
      reviewStatus: "Review needed",
      now: "2026-07-11T09:05:00.000Z"
    }, sourceStorageB);

    const storage = new MemoryStorage();
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: projectB.identity.id,
      projects: [persistedA, projectB]
    }));

    const loaded = loadStorageState(storage);
    const loadedA = loaded.projects.find((project) => project.identity.id === "project-a-stable")!;
    const loadedB = loaded.projects.find((project) => project.identity.id === "project-b-stable")!;

    expect(loaded.version).toBe(4);
    expect(loaded.projects).toHaveLength(2);
    expect(loaded.projects.map((project) => project.identity.id)).toEqual(
      expect.arrayContaining(["project-a-stable", "project-b-stable"])
    );
    expect(loaded.activeProjectId).toBe("project-b-stable");
    expect(loadedA.generatedDocuments).toHaveLength(1);
    expect(loadedA.generatedDocuments[0].fileName).toBe("README.md");
    expect(loadedA.packageGeneratedAt).not.toBeNull();
    expect(loadedA.reviewItems.find((item) => item.id === reviewItem.id)?.status).toBe("Not applicable");
    expect(loadedA.readinessConfirmations.scopeReviewed).toBe(true);
    expect(loadedB.intake.appType).toBe("microsoft365");
    expect(loadedA.planning).toEqual(createEmptyProjectPlanningState());
    expect(loadedB.planning).toEqual(createEmptyProjectPlanningState());
    expect(loadedA.planning).not.toBe(loadedB.planning);
    expect(loadedA.planning?.proposals).not.toBe(loadedB.planning?.proposals);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).toBeNull();
  });

  it("keeps the previous key when migration cannot write to the current key", () => {
    clearPersistenceWarning();
    try {
      const storage = new WriteFailStorage();
      const previous = createProject({ identity: { id: "previous", projectName: "Previous" } }, new MemoryStorage());
      storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
        version: 1,
        activeProjectId: previous.identity.id,
        projects: [previous]
      }));

      let loaded: ReturnType<typeof loadStorageState> | undefined;
      expect(() => {
        loaded = loadStorageState(storage);
      }).not.toThrow();

      expect(loaded?.version).toBe(4);
      expect(loaded?.projects[0].identity.id).toBe("previous");
      expect(loaded?.projects[0].planning).toEqual(createEmptyProjectPlanningState());
      expect(storage.getItem(PREVIOUS_STORAGE_KEY)).not.toBeNull();
      expect(storage.getItem(STORAGE_KEY)).toBeNull();
      expect((getPersistenceWarning() ?? "").length).toBeGreaterThan(0);
    } finally {
      clearPersistenceWarning();
    }
  });

  it("recovers invalid activeProjectId by selecting the first available project", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { id: "first", projectName: "First" } }, storage);
    createProject({ identity: { id: "second", projectName: "Second" } }, storage);

    const state = loadStorageState(storage);
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, activeProjectId: "missing-project" }));

    expect(loadStorageState(storage).activeProjectId).toBe(first.identity.id);
  });

  it("migrates the legacy review label to the canonical review status", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      activeProjectId: project.identity.id,
      projects: [{ ...project, reviewStatus: "Needs review" }]
    }));

    expect(loadStorageState(storage).projects[0].reviewStatus).toBe("Review needed");
  });

  it("preserves project type fields and supplies safe defaults for older stored intake", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as ProjectRecord;
    delete (storedProject.intake as unknown as Record<string, string>).brandStatus;
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.intake.appType).toBe("webApplication");
    expect(loaded.intake.brandStatus).toBe("");
    expect(loaded.intake.websitePages).toBe("");
    expect(loaded.archivedAt).toBeNull();
    expect(loaded.sourceProjectId).toBeNull();
    expect(loaded.duplicatedAt).toBeNull();
  });

  it("safely adds client review defaults to older stored projects", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as Record<string, unknown>;
    delete storedProject.reviewItems;
    delete storedProject.readinessConfirmations;
    delete storedProject.packageGeneratedAt;
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.reviewItems.length).toBeGreaterThan(0);
    expect(loaded.readinessConfirmations).toEqual({});
    expect(loaded.packageGeneratedAt).toBeNull();
  });

  it("requires older free-text app types to be reselected from a supported preset", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as ProjectRecord;
    (storedProject.intake as unknown as Record<string, string>).appType = "Legacy custom app type";
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    expect(loadStorageState(storage).projects[0].intake.appType).toBe("");
  });

  it("adds safe Power Platform defaults when loading legacy canvas projects", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as ProjectRecord;
    (storedProject.intake as unknown as Record<string, string>).appType = "Power Apps Canvas App";
    delete (storedProject as unknown as Record<string, unknown>).powerPlatform;
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.intake.appType).toBe("powerAppsCanvas");
    expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
    expect(loaded.powerPlatform?.common.connectors).toEqual([]);
  });

  it("migrates version-2 Canvas projects to storage version 4 with empty formula evidence and planning by default", () => {
    const storage = new MemoryStorage();
    const project = createProject({
      identity: { id: "canvas-v2", projectName: "Canvas V2" },
      intake: { appType: "powerAppsCanvas" }
    }, new MemoryStorage());
    delete (project.powerPlatform!.canvas as unknown as Record<string, unknown>).recordLifecycleFormulaReviewEvidence;
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      activeProjectId: project.identity.id,
      projects: [project]
    }));

    const loaded = loadStorageState(storage);

    expect(loaded.version).toBe(4);
    expect(loaded.projects[0].powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual([]);
    expect(loaded.projects[0].planning).toEqual(createEmptyProjectPlanningState());
  });

  it("migrates version-1 Canvas projects through storage version 4 with empty formula evidence and planning by default", () => {
    const storage = new MemoryStorage();
    const project = createProject({
      identity: { id: "canvas-v1", projectName: "Canvas V1" },
      intake: { appType: "powerAppsCanvas" }
    }, new MemoryStorage());
    delete (project.powerPlatform!.canvas as unknown as Record<string, unknown>).recordLifecycleFormulaReviewEvidence;
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: project.identity.id,
      projects: [project]
    }));

    const loaded = loadStorageState(storage);

    expect(loaded.version).toBe(4);
    expect(loaded.projects[0].powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual([]);
    expect(loaded.projects[0].planning).toEqual(createEmptyProjectPlanningState());
  });

  it("normalizes invalid connector classifications and keeps unknown instead of premium", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as Record<string, unknown>;
    storedProject.intake = {
      ...(storedProject.intake as Record<string, unknown>),
      appType: "powerAppsCanvas"
    };
    storedProject.powerPlatform = {
      common: {
        connectors: [{
          id: "c1",
          displayName: "Unknown Connector",
          connectorClassification: "invalid-value"
        }]
      },
      canvas: {
        primaryDataSourceType: "invalid-data-source"
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      activeProjectId: "community-services-portal",
      projects: [storedProject]
    }));

    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.powerPlatform?.common.connectors[0].connectorClassification).toBe("unknown");
    expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
  });

  it("creates multiple projects without erasing existing projects and sets the active id", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { projectName: "First" } }, storage);
    const second = createProject({ identity: { projectName: "Second" } }, storage);
    const state = loadStorageState(storage);
    expect(state.projects.map((project) => project.identity.projectName)).toEqual(["First", "Second"]);
    expect(state.activeProjectId).toBe(second.identity.id);
    expect(first.identity.id).not.toBe(second.identity.id);
  });

  it("duplicates a project with a new id, Copy name, lineage, and stale generated output", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "source", projectName: "Client Portal" },
      client: { clientName: "Client" },
      intake: { appPurpose: "Manage client requests" },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Ready" }],
      packageGeneratedAt: "2026-07-01T12:00:00.000Z",
      status: "Ready for Codex",
      now: "2026-07-01T12:00:00.000Z"
    }, storage);

    const duplicated = duplicateProject(source.identity.id, storage, "2026-07-04T12:00:00.000Z")!;
    const state = loadStorageState(storage);
    const persistedSource = state.projects.find((project) => project.identity.id === source.identity.id)!;

    expect(duplicated.identity.id).not.toBe(source.identity.id);
    expect(duplicated.identity.projectName).toBe("Client Portal Copy");
    expect(duplicated.sourceProjectId).toBe(source.identity.id);
    expect(duplicated.duplicatedAt).toBe("2026-07-04T12:00:00.000Z");
    expect(duplicated.createdAt).toBe("2026-07-04T12:00:00.000Z");
    expect(duplicated.updatedAt).toBe("2026-07-04T12:00:00.000Z");
    expect(duplicated.generatedDocuments).toEqual([]);
    expect(duplicated.packageGeneratedAt).toBeNull();
    expect(duplicated.status).toBe("Intake Started");
    expect(duplicated.client).toEqual(source.client);
    expect(duplicated.intake).toEqual(source.intake);
    expect(state.activeProjectId).toBe(duplicated.identity.id);
    expect(state.projects).toHaveLength(2);
    expect(persistedSource.generatedDocuments).toHaveLength(1);
    expect(persistedSource.identity.projectName).toBe("Client Portal");
  });

  it("duplicates a project with canonical empty planning while preserving source planning isolation", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "planning-source", projectName: "Planning Source" },
      client: { clientName: "Client" },
      intake: { appPurpose: "Manage planning lifecycle" },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Ready" }],
      packageGeneratedAt: "2026-07-01T12:00:00.000Z",
      status: "Ready for Codex",
      now: "2026-07-01T12:00:00.000Z"
    }, new MemoryStorage());
    saveStorageState({
      version: 4,
      activeProjectId: source.identity.id,
      projects: [{ ...source, planning: validPlanning(source.identity.id) }]
    }, storage);

    const duplicated = duplicateProject(source.identity.id, storage, "2026-08-01T12:00:00.000Z")!;
    const persisted = loadStorageState(storage);
    const persistedSource = persisted.projects.find((project) => project.identity.id === source.identity.id)!;
    const persistedDuplicate = persisted.projects.find((project) => project.identity.id === duplicated.identity.id)!;

    expect(duplicated.client).toEqual(source.client);
    expect(duplicated.intake).toEqual(source.intake);
    expect(duplicated.generatedDocuments).toEqual([]);
    expect(duplicated.packageGeneratedAt).toBeNull();
    expect(duplicated.planning).toEqual(createEmptyProjectPlanningState());
    expect(persistedDuplicate.planning).toEqual(createEmptyProjectPlanningState());
    expect(persistedSource.planning?.proposals).toHaveLength(1);
    expect(JSON.stringify(persistedDuplicate.planning)).not.toContain(planningProposalId);
    expect(duplicated.planning).not.toBe(persistedSource.planning);
    expect(duplicated.planning?.proposals).not.toBe(persistedSource.planning?.proposals);

    duplicated.planning = validPlanning(duplicated.identity.id);
    expect(getProjectById(source.identity.id, storage)?.planning?.proposals).toHaveLength(1);
    expect(getProjectById(duplicated.identity.id, storage)?.planning?.proposals).toEqual([]);
  });

  it("duplicates Power Platform details with deep copy semantics and reset implementation progress", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "canvas-source", projectName: "Canvas Source" },
      intake: { appType: "powerAppsCanvas" }
    }, storage);
    updateProject(source.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        common: {
          ...current.powerPlatform!.common,
          connectors: [{
            id: "sp",
            displayName: "SharePoint",
            purpose: "Data",
            dataSourceName: "Main List",
            dataSourceType: "sharePointList",
            connectorClassification: "standard",
            classificationConfirmed: true,
            licenceRequirement: "Included",
            licensingConfirmed: true,
            authenticationMethod: "AAD",
            gatewayRequirement: "None",
            environmentRequirement: "Default",
            dlpImpact: "Low",
            delegationSupport: "Partial",
            expectedRecordVolume: "1000",
            supportedOperations: { read: true },
            offlineSupport: "No",
            securityNotes: "",
            limitations: "",
            approvalStatus: "approved"
          }]
        },
        canvas: {
          ...current.powerPlatform!.canvas!,
          primaryDataSourceType: "sharePointList",
          sharePointLists: "Main List",
          secondaryConnectorIds: ["sp"],
          powerFxStatus: "Complete",
          yamlStatus: "Ready",
          manualInstallationStatus: "Installed",
          studioValidationStatus: "Validated",
          publicationStatus: "Published",
          deploymentStatus: "Deployed"
        },
        progress: {
          ...current.powerPlatform!.progress,
          connectorSelection: "confirmed",
          securityReview: "ready",
          canvas: {
            ...current.powerPlatform!.progress.canvas,
            sharePointSchema: "confirmed",
            powerFx: "confirmed",
            yaml: "confirmed"
          }
        }
      }
    }), storage);

    const duplicated = duplicateProject(source.identity.id, storage)!;

    expect(duplicated.intake.appType).toBe("powerAppsCanvas");
    expect(duplicated.powerPlatform?.canvas?.primaryDataSourceType).toBe("sharePointList");
    expect(duplicated.powerPlatform?.canvas?.sharePointLists).toBe("Main List");
    expect(duplicated.powerPlatform?.common.connectors[0].licenceRequirement).toBe("Included");
    expect(duplicated.powerPlatform?.common.connectors).toHaveLength(1);
    expect(duplicated.powerPlatform?.progress.connectorSelection).toBe("reviewNeeded");
    expect(duplicated.powerPlatform?.progress.securityReview).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.canvas.sharePointSchema).toBe("reviewNeeded");
    expect(duplicated.powerPlatform?.progress.canvas.powerFx).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.canvas.yaml).toBe("notStarted");
    expect(duplicated.powerPlatform?.canvas?.powerFxStatus).toBe("notStarted");
    expect(duplicated.powerPlatform?.canvas?.yamlStatus).toBe("notStarted");
    expect(duplicated.powerPlatform?.canvas?.manualInstallationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.studioValidationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.publicationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.deploymentStatus).toBe("");
    expect(duplicated.generatedDocuments).toEqual([]);
    expect(duplicated.packageGeneratedAt).toBeNull();

    const sourcePersisted = getProjectById(source.identity.id, storage)!;
    expect(duplicated.powerPlatform?.common.connectors).not.toBe(sourcePersisted.powerPlatform?.common.connectors);
    expect(duplicated.powerPlatform?.common.connectors[0].supportedOperations).not.toBe(
      sourcePersisted.powerPlatform?.common.connectors[0].supportedOperations
    );
    expect(duplicated.powerPlatform?.canvas?.secondaryConnectorIds).not.toBe(
      sourcePersisted.powerPlatform?.canvas?.secondaryConnectorIds
    );

    duplicated.powerPlatform!.common.connectors[0].displayName = "Mutated";
    expect(getProjectById(source.identity.id, storage)?.powerPlatform?.common.connectors[0].displayName).toBe("SharePoint");
  });

  it("preserves formula review evidence as historical records when duplicating a Canvas project", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "original-project", projectName: "Original Canvas" },
      intake: { appType: "powerAppsCanvas" },
      status: "Ready for Codex",
      reviewStatus: "Approved"
    }, storage);
    updateProject(source.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        canvas: {
          ...current.powerPlatform!.canvas!,
          recordLifecycleFormulaReviewEvidence: [
            technicalEvidence(),
            studioEvidence()
          ]
        }
      }
    }), storage);

    const duplicated = duplicateProject(source.identity.id, storage, "2026-07-31T20:00:00.000Z")!;

    expect(duplicated.identity.id).not.toBe("original-project");
    expect(duplicated.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual([
      technicalEvidence(),
      studioEvidence()
    ]);
    expect(duplicated.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence[0].projectId).toBe("original-project");
    expect(duplicated.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence[0].reviewContractChecksum).toBe("fnv1a-evidence001");
    expect(JSON.stringify(duplicated.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence)).not.toContain("isCurrent");
    expect(duplicated.status).toBe("Intake Started");
    expect(duplicated.reviewStatus).toBe("Review needed");
  });

  it("duplicates a dataverse-backed canvas project with requirements preserved and implementation progress reset", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "canvas-dataverse-source", projectName: "Canvas Dataverse Source" },
      intake: { appType: "powerAppsCanvas" }
    }, storage);
    updateProject(source.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        common: {
          ...current.powerPlatform!.common,
          connectors: [{
            id: "dv",
            displayName: "Dataverse",
            purpose: "Primary backend",
            dataSourceName: "Dataverse",
            dataSourceType: "dataverse",
            connectorClassification: "premium",
            classificationConfirmed: true,
            licenceRequirement: "Per app plan",
            licensingConfirmed: true,
            authenticationMethod: "AAD",
            gatewayRequirement: "None",
            environmentRequirement: "Managed",
            dlpImpact: "Review",
            delegationSupport: "Full",
            expectedRecordVolume: "50000",
            supportedOperations: { read: true, create: true, update: true },
            offlineSupport: "Limited",
            securityNotes: "Environment isolation",
            limitations: "",
            approvalStatus: "approved"
          }]
        },
        canvas: {
          ...current.powerPlatform!.canvas!,
          primaryDataSourceType: "dataverse",
          dataverseTables: "Accounts, Cases",
          logicalNameStatus: "Confirmed logical names",
          secondaryConnectorIds: ["dv"],
          powerFxStatus: "Done",
          yamlStatus: "Done",
          manualInstallationStatus: "Installed",
          studioValidationStatus: "Validated",
          publicationStatus: "Published",
          deploymentStatus: "Deployed"
        },
        progress: {
          ...current.powerPlatform!.progress,
          schema: "confirmed",
          canvas: {
            ...current.powerPlatform!.progress.canvas,
            dataverseSchema: "confirmed",
            logicalNames: "confirmed",
            powerFx: "confirmed",
            yaml: "confirmed"
          }
        }
      }
    }), storage);

    const duplicated = duplicateProject(source.identity.id, storage)!;
    const persistedSource = getProjectById(source.identity.id, storage)!;

    expect(duplicated.intake.appType).toBe("powerAppsCanvas");
    expect(duplicated.powerPlatform?.canvas?.primaryDataSourceType).toBe("dataverse");
    expect(duplicated.powerPlatform?.canvas?.dataverseTables).toBe("Accounts, Cases");
    expect(duplicated.powerPlatform?.common.connectors[0].licenceRequirement).toBe("Per app plan");
    expect(duplicated.powerPlatform?.progress.canvas.dataverseSchema).toBe("reviewNeeded");
    expect(duplicated.powerPlatform?.progress.canvas.logicalNames).toBe("reviewNeeded");
    expect(duplicated.powerPlatform?.progress.canvas.powerFx).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.canvas.yaml).toBe("notStarted");
    expect(duplicated.powerPlatform?.canvas?.powerFxStatus).toBe("notStarted");
    expect(duplicated.powerPlatform?.canvas?.yamlStatus).toBe("notStarted");
    expect(duplicated.powerPlatform?.canvas?.manualInstallationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.studioValidationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.publicationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.deploymentStatus).toBe("");
    expect(duplicated.powerPlatform?.common.connectors).not.toBe(persistedSource.powerPlatform?.common.connectors);
    expect(duplicated.powerPlatform?.canvas).not.toBe(persistedSource.powerPlatform?.canvas);
    expect(duplicated.powerPlatform?.canvas?.secondaryConnectorIds).not.toBe(
      persistedSource.powerPlatform?.canvas?.secondaryConnectorIds
    );
  });

  it("duplicates a model-driven project with requirements preserved and implementation progress reset", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "model-source", projectName: "Model Source" },
      intake: { appType: "powerAppsModelDriven" }
    }, storage);
    updateProject(source.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        common: {
          ...current.powerPlatform!.common,
          publisherName: "Contoso",
          publisherPrefix: "cts",
          licensingStatus: "Model-driven license required",
          connectors: [{
            id: "dv",
            displayName: "Dataverse",
            purpose: "Model data",
            dataSourceName: "Dataverse",
            dataSourceType: "dataverse",
            connectorClassification: "premium",
            classificationConfirmed: true,
            licenceRequirement: "Per user",
            licensingConfirmed: true,
            authenticationMethod: "AAD",
            gatewayRequirement: "None",
            environmentRequirement: "Managed",
            dlpImpact: "Review",
            delegationSupport: "Full",
            expectedRecordVolume: "200000",
            supportedOperations: { read: true, create: true, update: true, delete: true },
            offlineSupport: "No",
            securityNotes: "Role based",
            limitations: "",
            approvalStatus: "approved"
          }]
        },
        modelDriven: {
          ...current.powerPlatform!.modelDriven!,
          dataverseAvailability: "Dataverse available",
          modelDrivenLicensingStatus: "Confirmed licensing note",
          solutionArchitecture: "Managed solution architecture",
          tables: "Accounts;Cases",
          columns: "Name;Priority",
          relationships: "Account to Case",
          forms: "Main form",
          views: "Active view",
          securityRoles: "Case Manager",
          automations: "Assignment flow",
          plugins: "Validation plugin",
          customApis: "Submit API",
          pcfControls: "Status control",
          environmentVariables: "EnvFlag",
          connectionReferences: "DataverseConnection",
          manualConfigurationStatus: "Completed",
          testingStatus: "Completed",
          importStatus: "Completed",
          publicationStatus: "Completed",
          deploymentStatus: "Completed",
          solutionSourceStatus: "Exported"
        },
        progress: {
          ...current.powerPlatform!.progress,
          modelDriven: {
            ...current.powerPlatform!.progress.modelDriven,
            solutionComponents: "confirmed",
            solutionValidation: "confirmed",
            solutionImport: "confirmed",
            publication: "confirmed"
          }
        }
      }
    }), storage);

    const duplicated = duplicateProject(source.identity.id, storage)!;
    const persistedSource = getProjectById(source.identity.id, storage)!;

    expect(duplicated.intake.appType).toBe("powerAppsModelDriven");
    expect(duplicated.powerPlatform?.modelDriven?.solutionArchitecture).toBe("Managed solution architecture");
    expect(duplicated.powerPlatform?.modelDriven?.tables).toBe("Accounts;Cases");
    expect(duplicated.powerPlatform?.modelDriven?.columns).toBe("Name;Priority");
    expect(duplicated.powerPlatform?.modelDriven?.relationships).toBe("Account to Case");
    expect(duplicated.powerPlatform?.modelDriven?.forms).toBe("Main form");
    expect(duplicated.powerPlatform?.modelDriven?.views).toBe("Active view");
    expect(duplicated.powerPlatform?.modelDriven?.securityRoles).toBe("Case Manager");
    expect(duplicated.powerPlatform?.modelDriven?.automations).toBe("Assignment flow");
    expect(duplicated.powerPlatform?.modelDriven?.plugins).toBe("Validation plugin");
    expect(duplicated.powerPlatform?.modelDriven?.customApis).toBe("Submit API");
    expect(duplicated.powerPlatform?.modelDriven?.pcfControls).toBe("Status control");
    expect(duplicated.powerPlatform?.modelDriven?.environmentVariables).toBe("EnvFlag");
    expect(duplicated.powerPlatform?.modelDriven?.connectionReferences).toBe("DataverseConnection");
    expect(duplicated.powerPlatform?.common.publisherName).toBe("Contoso");
    expect(duplicated.powerPlatform?.common.publisherPrefix).toBe("cts");
    expect(duplicated.powerPlatform?.common.licensingStatus).toBe("Model-driven license required");
    expect(duplicated.powerPlatform?.progress.modelDriven.solutionComponents).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.modelDriven.solutionValidation).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.modelDriven.solutionImport).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.modelDriven.publication).toBe("notStarted");
    expect(duplicated.powerPlatform?.modelDriven?.manualConfigurationStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.testingStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.importStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.publicationStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.deploymentStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.solutionSourceStatus).toBe("");
    expect(duplicated.powerPlatform?.common.connectors).not.toBe(persistedSource.powerPlatform?.common.connectors);
  });

  it("reconciles Power Platform structures when app type changes", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "transition", projectName: "Transition" },
      intake: { appType: "powerAppsCanvas" }
    }, storage);
    updateProject(source.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        common: {
          ...current.powerPlatform!.common,
          connectors: [{
            id: "sp",
            displayName: "SharePoint",
            purpose: "Data",
            dataSourceName: "Main List",
            dataSourceType: "sharePointList",
            connectorClassification: "standard",
            classificationConfirmed: true,
            licenceRequirement: "Included",
            licensingConfirmed: true,
            authenticationMethod: "AAD",
            gatewayRequirement: "None",
            environmentRequirement: "Default",
            dlpImpact: "Low",
            delegationSupport: "Partial",
            expectedRecordVolume: "1000",
            supportedOperations: { read: true },
            offlineSupport: "No",
            securityNotes: "",
            limitations: "",
            approvalStatus: "approved"
          }]
        },
        canvas: {
          ...current.powerPlatform!.canvas!,
          primaryDataSourceType: "sharePointList"
        }
      }
    }), storage);

    updateProjectFields(source.identity.id, { appType: "powerAppsModelDriven" }, storage);
    const modelDriven = getProjectById(source.identity.id, storage)!;
    expect(modelDriven.intake.appType).toBe("powerAppsModelDriven");
    expect(modelDriven.powerPlatform?.canvas).toBeUndefined();
    expect(modelDriven.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
    expect(modelDriven.powerPlatform?.common.connectors).toHaveLength(1);

    updateProjectFields(source.identity.id, { appType: "powerAppsCanvas" }, storage);
    const canvas = getProjectById(source.identity.id, storage)!;
    expect(canvas.intake.appType).toBe("powerAppsCanvas");
    expect(canvas.powerPlatform?.modelDriven).toBeUndefined();
    expect(canvas.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
  });

  it("uses Untitled Project Copy when duplicating a project without a name", () => {
    const storage = new MemoryStorage();
    const source = createProject({ identity: { id: "untitled" } }, storage);

    expect(duplicateProject(source.identity.id, storage)?.identity.projectName).toBe("Untitled Project Copy");
  });

  it("returns null when saved-project operations target a missing id", () => {
    const storage = new MemoryStorage();

    expect(duplicateProject("missing", storage)).toBeNull();
    expect(archiveProject("missing", storage)).toBeNull();
    expect(restoreProject("missing", storage)).toBeNull();
  });

  it("archives a project without deleting its data and hides it from active selection", () => {
    const storage = new MemoryStorage();
    const first = createProject({
      identity: { id: "first", projectName: "First" },
      intake: { appPurpose: "Preserve this purpose" }
    }, storage);
    const second = createProject({ identity: { id: "second", projectName: "Second" } }, storage);
    setActiveProject(first.identity.id, storage);

    const archived = archiveProject(first.identity.id, storage, "2026-07-04T13:00:00.000Z")!;
    const state = loadStorageState(storage);

    expect(archived.archivedAt).toBe("2026-07-04T13:00:00.000Z");
    expect(archived.intake.appPurpose).toBe("Preserve this purpose");
    expect(state.projects).toHaveLength(2);
    expect(state.projects.find((project) => project.identity.id === first.identity.id)?.archivedAt).toBe(
      "2026-07-04T13:00:00.000Z"
    );
    expect(state.activeProjectId).toBe(second.identity.id);
  });

  it("preserves formula review evidence through archive and restore", () => {
    const storage = new MemoryStorage();
    const project = createProject({
      identity: { id: "original-project", projectName: "Evidence Archive" },
      intake: { appType: "powerAppsCanvas" }
    }, storage);
    updateProject(project.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        canvas: {
          ...current.powerPlatform!.canvas!,
          recordLifecycleFormulaReviewEvidence: [technicalEvidence()]
        }
      }
    }), storage);

    archiveProject(project.identity.id, storage, "2026-07-31T21:00:00.000Z");
    const archived = getProjectById(project.identity.id, storage)!;
    const restored = restoreProject(project.identity.id, storage, "2026-07-31T22:00:00.000Z")!;

    expect(archived.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual([technicalEvidence()]);
    expect(restored.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual([technicalEvidence()]);
  });

  it("preserves normalized planning through archive and restore without status, decision, or timestamp changes", () => {
    const storage = new MemoryStorage();
    const project = createProject({
      identity: { id: "planning-archive", projectName: "Planning Archive" }
    }, new MemoryStorage());
    const planning = validPlanning(project.identity.id, {
      proposals: [
        planningProposal(project.identity.id, {
          status: "Confirmed",
          lastDecisionId: planningDecisionId
        })
      ],
      decisions: [planningDecision(project.identity.id)],
      dependencies: [planningDependency()],
      conflicts: [planningConflict(project.identity.id)]
    });
    const rawState = {
      version: 4 as const,
      activeProjectId: project.identity.id,
      projects: [{ ...project, planning }]
    };
    const before = JSON.stringify(rawState);
    saveStorageState(rawState, storage);

    archiveProject(project.identity.id, storage, "2026-08-01T21:00:00.000Z");
    const archived = getProjectById(project.identity.id, storage)!;
    const restored = restoreProject(project.identity.id, storage, "2026-08-01T22:00:00.000Z")!;

    expect(JSON.stringify(rawState)).toBe(before);
    expect(archived.planning?.proposals[0].status).toBe("Confirmed");
    expect(restored.planning?.proposals[0].status).toBe("Confirmed");
    expect(archived.planning?.decisions).toHaveLength(1);
    expect(restored.planning?.decisions).toHaveLength(1);
    expect(archived.planning?.dependencies).toHaveLength(1);
    expect(restored.planning?.dependencies).toHaveLength(1);
    expect(archived.planning?.conflicts).toHaveLength(1);
    expect(restored.planning?.conflicts).toHaveLength(1);
    expect(archived.planning?.proposals[0].createdAt).toBe(planningTimestampUtc);
    expect(restored.planning?.proposals[0].updatedAt).toBe(planningTimestampUtc);
    expect(restored.updatedAt).toBe("2026-08-01T22:00:00.000Z");
  });

  it("keeps the active id when archiving another project and clears it when the last active project is archived", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { id: "first", projectName: "First" } }, storage);
    const second = createProject({ identity: { id: "second", projectName: "Second" } }, storage);
    setActiveProject(first.identity.id, storage);

    archiveProject(second.identity.id, storage);
    expect(loadStorageState(storage).activeProjectId).toBe(first.identity.id);

    archiveProject(first.identity.id, storage);
    expect(loadStorageState(storage).activeProjectId).toBeNull();
  });

  it("selects the most recently updated active project when archiving the current project", () => {
    const storage = new MemoryStorage();
    const current = createProject({
      identity: { id: "current", projectName: "Current" },
      now: "2026-07-04T10:00:00.000Z"
    }, storage);
    createProject({
      identity: { id: "newest", projectName: "Newest" },
      now: "2026-07-04T12:00:00.000Z"
    }, storage);
    createProject({
      identity: { id: "older", projectName: "Older" },
      now: "2026-07-04T11:00:00.000Z"
    }, storage);
    setActiveProject(current.identity.id, storage);

    archiveProject(current.identity.id, storage);

    expect(loadStorageState(storage).activeProjectId).toBe("newest");
  });

  it("restores an archived project without changing its saved project data", () => {
    const storage = new MemoryStorage();
    const project = createProject({
      identity: { id: "archived", projectName: "Archived" },
      intake: { appPurpose: "Keep this purpose" },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Saved" }]
    }, storage);
    archiveProject(project.identity.id, storage, "2026-07-04T13:00:00.000Z");

    const restored = restoreProject(project.identity.id, storage, "2026-07-04T14:00:00.000Z")!;

    expect(restored.archivedAt).toBeNull();
    expect(restored.updatedAt).toBe("2026-07-04T14:00:00.000Z");
    expect(restored.intake.appPurpose).toBe("Keep this purpose");
    expect(restored.generatedDocuments).toEqual(project.generatedDocuments);
    expect(restored.reviewItems).toEqual(project.reviewItems);
    expect(restored.readinessConfirmations).toEqual(project.readinessConfirmations);
  });

  it("sets the active project", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { projectName: "First" } }, storage);
    createProject({ identity: { projectName: "Second" } }, storage);
    expect(setActiveProject(first.identity.id, storage)?.identity.id).toBe(first.identity.id);
    expect(getActiveProject(storage)?.identity.projectName).toBe("First");
  });

  it("updates nested fields without losing existing intake", () => {
    const storage = new MemoryStorage();
    const project = createProject({
      identity: { projectName: "Original" },
      intake: { appPurpose: "Keep this purpose", workflows: "Existing workflow" }
    }, storage);
    updateProject(project.identity.id, {
      identity: { ...project.identity, projectName: "Renamed" },
      intake: { ...project.intake, permissions: "Reviewer can approve" }
    }, storage);
    const updated = getProjectById(project.identity.id, storage)!;
    expect(updated.identity.projectName).toBe("Renamed");
    expect(updated.intake.appPurpose).toBe("Keep this purpose");
    expect(updated.intake.workflows).toBe("Existing workflow");
    expect(updated.intake.permissions).toBe("Reviewer can approve");
  });

  it("persists generated documents and derived file count", () => {
    const storage = new MemoryStorage();
    const project = createProject({ identity: { projectName: "Generated project" } }, storage);
    saveGeneratedDocuments(project.identity.id, [
      { fileName: "README.md", folder: "", content: "# Generated" }
    ], storage);
    const loaded = getProjectById(project.identity.id, storage)!;
    expect(loaded.generatedDocuments).toHaveLength(1);
    expect(loaded.generatedFileCount).toBe(1);
    expect(loaded.status).toBe("Needs Review");
    expect(loaded.reviewStatus).toBe("Review needed");
  });

  it("keeps generated documents after intake edits", () => {
    const storage = new MemoryStorage();
    const project = createProject({ identity: { projectName: "Generated project" } }, storage);
    saveGeneratedDocuments(project.identity.id, [
      { fileName: "README.md", folder: "", content: "# Generated" }
    ], storage);

    updateProjectFields(project.identity.id, { appPurpose: "Updated purpose" }, storage);
    const loaded = getProjectById(project.identity.id, storage)!;

    expect(loaded.generatedDocuments).toHaveLength(1);
    expect(loaded.generatedFileCount).toBe(1);
    expect(loaded.intake.appPurpose).toBe("Updated purpose");
    expect(loaded.status).toBe("Needs Review");
    expect(loaded.reviewStatus).toBe("Review needed");
    expect(loaded.packageGeneratedAt).toBeNull();
  });

  it("persists review decisions and readiness confirmations", () => {
    const storage = new MemoryStorage();
    const project = createProject({ identity: { projectName: "Client review" } }, storage);
    const reviewItem = project.reviewItems[0];

    updateReviewItem(project.identity.id, reviewItem.id, {
      status: "Not applicable",
      notApplicableReason: "Confirmed outside this project."
    }, storage);
    updateReadinessConfirmation(project.identity.id, "scopeReviewed", true, storage);

    const loaded = getProjectById(project.identity.id, storage)!;
    expect(loaded.reviewItems.find((item) => item.id === reviewItem.id)).toMatchObject({
      status: "Not applicable",
      notApplicableReason: "Confirmed outside this project."
    });
    expect(loaded.readinessConfirmations.scopeReviewed).toBe(true);
  });

  it("replaces generated documents when generation is run again", () => {
    const storage = new MemoryStorage();
    const project = createProject({ identity: { projectName: "Generated project" } }, storage);
    saveGeneratedDocuments(project.identity.id, [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# First" }
    ], storage);

    saveGeneratedDocuments(project.identity.id, [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# Second" },
      { fileName: "PROJECT_SCOPE.md", folder: "00_Project_Overview", content: "# Scope" }
    ], storage);

    const loaded = getProjectById(project.identity.id, storage)!;
    expect(loaded.generatedDocuments).toHaveLength(2);
    expect(loaded.generatedDocuments[0].content).toBe("# Second");
    expect(loaded.generatedFileCount).toBe(2);
    expect(loaded.status).toBe("Needs Review");
  });

  it("does not overwrite another project during intake updates", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { projectName: "First" } }, storage);
    const second = createProject({ identity: { projectName: "Second" } }, storage);

    updateProjectFields(first.identity.id, { appPurpose: "First project purpose" }, storage);

    expect(getProjectById(first.identity.id, storage)?.intake.appPurpose).toBe("First project purpose");
    expect(getProjectById(second.identity.id, storage)?.intake.appPurpose).toBe("");
  });

  it("resets storage safely", () => {
    const storage = new MemoryStorage();
    createProject({ identity: { projectName: "Disposable" } }, storage);
    storage.setItem(PREVIOUS_STORAGE_KEY, "{\"version\":1,\"projects\":[]}");
    storage.setItem(LEGACY_STORAGE_KEY, "{\"intake\":{\"appName\":\"Legacy\"}}");
    expect(resetStorage(storage)).toEqual({ version: 4, activeProjectId: null, projects: [] });
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  describe("project-type transition matrix", () => {
    it("supports web application to canvas transition with connector-neutral defaults", () => {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "transition-web-canvas", projectName: "Web to Canvas" },
        intake: { appType: "webApplication" }
      }, storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsCanvas" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.canvas).toBeDefined();
      expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
      expect(loaded.powerPlatform?.common.connectors).toEqual([]);
      expect(loaded.powerPlatform?.common.connectors.some((connector) => connector.connectorClassification === "premium")).toBe(false);
    });

    it("supports web application to model-driven transition with unconfirmed defaults", () => {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "transition-web-model", projectName: "Web to Model" },
        intake: { appType: "webApplication" }
      }, storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsModelDriven" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.modelDriven).toBeDefined();
      expect(loaded.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
      expect(loaded.powerPlatform?.modelDriven?.modelDrivenLicensingStatus).toBe("missingInformation");
    });

    it("supports canvas to model-driven transition without carrying canvas progress", () => {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "transition-canvas-model", projectName: "Canvas to Model" },
        intake: { appType: "powerAppsCanvas" }
      }, storage);
      updateProject(project.identity.id, (current) => ({
        ...current,
        powerPlatform: {
          ...current.powerPlatform!,
          common: {
            ...current.powerPlatform!.common,
            appOwner: "Owner",
            connectors: [{
              id: "sp",
              displayName: "SharePoint",
              purpose: "Data",
              dataSourceName: "Main",
              dataSourceType: "sharePointList",
              connectorClassification: "standard",
              classificationConfirmed: true,
              licenceRequirement: "Included",
              licensingConfirmed: true,
              authenticationMethod: "AAD",
              gatewayRequirement: "None",
              environmentRequirement: "Default",
              dlpImpact: "Low",
              delegationSupport: "Partial",
              expectedRecordVolume: "500",
              supportedOperations: { read: true },
              offlineSupport: "No",
              securityNotes: "",
              limitations: "",
              approvalStatus: "approved"
            }]
          },
          progress: {
            ...current.powerPlatform!.progress,
            canvas: {
              ...current.powerPlatform!.progress.canvas,
              sharePointSchema: "confirmed",
              powerFx: "confirmed"
            }
          }
        }
      }), storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsModelDriven" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.canvas).toBeUndefined();
      expect(loaded.powerPlatform?.modelDriven).toBeDefined();
      expect(loaded.powerPlatform?.common.appOwner).toBe("Owner");
      expect(loaded.powerPlatform?.common.connectors).toHaveLength(1);
      expect(loaded.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
      expect(loaded.powerPlatform?.modelDriven?.modelDrivenLicensingStatus).toBe("missingInformation");
      expect(loaded.powerPlatform?.progress.modelDriven.solutionValidation).toBe("notStarted");
    });

    it("supports model-driven to canvas transition with undecided backend and no premium assumptions", () => {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "transition-model-canvas", projectName: "Model to Canvas" },
        intake: { appType: "powerAppsModelDriven" }
      }, storage);
      updateProject(project.identity.id, (current) => ({
        ...current,
        powerPlatform: {
          ...current.powerPlatform!,
          common: {
            ...current.powerPlatform!.common,
            connectors: [{
              id: "dv",
              displayName: "Dataverse",
              purpose: "Data",
              dataSourceName: "Dataverse",
              dataSourceType: "dataverse",
              connectorClassification: "unknown",
              classificationConfirmed: false,
              licenceRequirement: "",
              licensingConfirmed: false,
              authenticationMethod: "",
              gatewayRequirement: "",
              environmentRequirement: "",
              dlpImpact: "",
              delegationSupport: "",
              expectedRecordVolume: "",
              supportedOperations: {},
              offlineSupport: "",
              securityNotes: "",
              limitations: "",
              approvalStatus: ""
            }]
          },
          modelDriven: {
            ...current.powerPlatform!.modelDriven!,
            dataverseAvailability: "Confirmed"
          }
        }
      }), storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsCanvas" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.modelDriven).toBeUndefined();
      expect(loaded.powerPlatform?.canvas).toBeDefined();
      expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
      expect(loaded.powerPlatform?.common.connectors.some((connector) => connector.connectorClassification === "premium")).toBe(false);
    });

    it("supports canvas to web application transition and clears power platform data", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage);

      updateProjectFields(project.identity.id, { appType: "webApplication" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform).toBeUndefined();
      expect(expectedDocumentLocations(loaded)).toEqual(CORE_DOCUMENT_LOCATIONS);
    });

    it("supports model-driven to business website transition and clears power platform data", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsModelDriven" } }, storage);

      updateProjectFields(project.identity.id, { appType: "businessWebsite" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform).toBeUndefined();
      expect(expectedDocumentLocations(loaded)).toEqual(CORE_DOCUMENT_LOCATIONS);
    });

    it("supports canvas to legacy microsoft transition with common-only structure", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage);

      updateProjectFields(project.identity.id, { appType: "microsoft365" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform).toBeDefined();
      expect(loaded.powerPlatform?.common).toBeDefined();
      expect(loaded.powerPlatform?.canvas).toBeUndefined();
      expect(loaded.powerPlatform?.modelDriven).toBeUndefined();
      expect(loaded.powerPlatform?.common.connectors.some((connector) => connector.connectorClassification === "premium")).toBe(false);
    });

    it("supports model-driven to legacy microsoft transition with common-only structure", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsModelDriven" } }, storage);

      updateProjectFields(project.identity.id, { appType: "microsoft365" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform).toBeDefined();
      expect(loaded.powerPlatform?.common).toBeDefined();
      expect(loaded.powerPlatform?.canvas).toBeUndefined();
      expect(loaded.powerPlatform?.modelDriven).toBeUndefined();
    });

    it("supports canvas to canvas updates without discarding compatible data", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage);
      updateProject(project.identity.id, (current) => ({
        ...current,
        powerPlatform: {
          ...current.powerPlatform!,
          canvas: {
            ...current.powerPlatform!.canvas!,
            primaryDataSourceType: "sharePointList",
            sharePointLists: "Main List"
          }
        }
      }), storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsCanvas" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("sharePointList");
      expect(loaded.powerPlatform?.canvas?.sharePointLists).toBe("Main List");
    });

    it("supports model-driven to model-driven updates without discarding compatible data", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsModelDriven" } }, storage);
      updateProject(project.identity.id, (current) => ({
        ...current,
        powerPlatform: {
          ...current.powerPlatform!,
          modelDriven: {
            ...current.powerPlatform!.modelDriven!,
            tables: "Accounts",
            dataverseAvailability: "missingInformation",
            modelDrivenLicensingStatus: "missingInformation"
          }
        }
      }), storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsModelDriven" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.modelDriven?.tables).toBe("Accounts");
      expect(loaded.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
      expect(loaded.powerPlatform?.modelDriven?.modelDrivenLicensingStatus).toBe("missingInformation");
    });
  });

  describe("legacy project migration", () => {
    it("migrates a legacy single-project record into the versioned store", () => {
      const storage = new MemoryStorage();
      const legacyData = {
        intake: {
          appName: "Legacy App",
          clientName: "Legacy Client",
          businessName: "Legacy Business",
          appPurpose: "Track legacy widgets"
        },
        metadata: {
          id: "legacy-id",
          status: "Intake Started",
          reviewStatus: "Review needed",
          lastUpdated: "2026-08-01T12:00:00.000Z"
        }
      };
      const legacyBefore = JSON.stringify(legacyData);
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyData));

      const loaded = loadStorageState(storage);
      const persisted = JSON.parse(storage.getItem(STORAGE_KEY)!) as ReturnType<typeof loadStorageState>;

      expect(JSON.stringify(legacyData)).toBe(legacyBefore);
      expect(loaded.version).toBe(4);
      expect(loaded.projects).toHaveLength(1);
      expect(loaded.activeProjectId).toBe(loaded.projects[0].identity.id);
      expect(loaded.projects[0].identity.projectName).toBe("Legacy App");
      expect(loaded.projects[0].client.clientName).toBe("Legacy Client");
      expect(loaded.projects[0].client.businessName).toBe("Legacy Business");
      expect(loaded.projects[0].intake.appPurpose).toBe("Track legacy widgets");
      expect(loaded.projects[0].status).toBe("Intake Started");
      expect(loaded.projects[0].reviewStatus).toBe("Review needed");
      expect(loaded.projects[0].createdAt).toBe("2026-08-01T12:00:00.000Z");
      expect(loaded.projects[0].updatedAt).toBe("2026-08-01T12:00:00.000Z");
      expect(loaded.projects[0].planning).toEqual(createEmptyProjectPlanningState());
      expect(loaded.projects[0].planning?.sources).toEqual([]);
      expect(loaded.projects[0].planning?.proposals).toEqual([]);
      expect(loaded.projects[0].planning?.decisions).toEqual([]);
      expect(loaded.projects[0].planning?.dependencies).toEqual([]);
      expect(loaded.projects[0].planning?.conflicts).toEqual([]);
      expect(JSON.stringify(loaded.projects[0].planning)).not.toContain("proposalId");
      expect(JSON.stringify(loaded.projects[0].planning)).not.toContain("fingerprint");
      expect(persisted.version).toBe(4);
      expect(persisted.projects[0].planning).toEqual(loaded.projects[0].planning);
      expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    });

    it("returns normalized empty planning on the first legacy load when current-key persistence fails", () => {
      clearPersistenceWarning();
      try {
        const storage = new WriteFailStorage();
        const legacyData = {
          intake: {
            appName: "Legacy Write Failure",
            clientName: "Legacy Client",
            businessName: "Legacy Business",
            appPurpose: "Track legacy failure path"
          },
          metadata: {
            id: "legacy-fail-id",
            status: "Intake Started" as const,
            reviewStatus: "Review needed" as const,
            lastUpdated: "2026-08-01T13:00:00.000Z"
          }
        };
        const legacyBefore = JSON.stringify(legacyData);
        storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyData));

        let loaded: ReturnType<typeof loadStorageState> | undefined;
        expect(() => {
          loaded = loadStorageState(storage);
        }).not.toThrow();

        expect(JSON.stringify(legacyData)).toBe(legacyBefore);
        expect(loaded?.version).toBe(4);
        expect(loaded?.projects[0].identity.id).toBe("legacy-fail-id");
        expect(loaded?.projects[0].identity.projectName).toBe("Legacy Write Failure");
        expect(loaded?.projects[0].client.clientName).toBe("Legacy Client");
        expect(loaded?.projects[0].client.businessName).toBe("Legacy Business");
        expect(loaded?.projects[0].intake.appPurpose).toBe("Track legacy failure path");
        expect(loaded?.projects[0].createdAt).toBe("2026-08-01T13:00:00.000Z");
        expect(loaded?.projects[0].updatedAt).toBe("2026-08-01T13:00:00.000Z");
        expect(loaded?.projects[0].planning).toEqual(createEmptyProjectPlanningState());
        expect(loaded?.projects[0].planning?.sources).toEqual([]);
        expect(loaded?.projects[0].planning?.proposals).toEqual([]);
        expect(loaded?.projects[0].planning?.decisions).toEqual([]);
        expect(loaded?.projects[0].planning?.dependencies).toEqual([]);
        expect(loaded?.projects[0].planning?.conflicts).toEqual([]);
        expect(storage.getItem(STORAGE_KEY)).toBeNull();
        expect(storage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
        expect((getPersistenceWarning() ?? "").length).toBeGreaterThan(0);
      } finally {
        clearPersistenceWarning();
      }
    });

    it("migrates a legacy record with no name fields by falling back to empty defaults", () => {
      const storage = new MemoryStorage();
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
        intake: { appPurpose: "No names on this legacy record" }
      }));

      const loaded = loadStorageState(storage);

      expect(loaded.projects).toHaveLength(1);
      expect(loaded.projects[0].identity.projectName).toBe("");
      expect(loaded.projects[0].client.clientName).toBe("");
      expect(loaded.projects[0].client.businessName).toBe("");
      expect(loaded.projects[0].intake.appPurpose).toBe("No names on this legacy record");
    });

    it("ignores a legacy record with no intake payload and starts with an empty state", () => {
      const storage = new MemoryStorage();
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ metadata: { id: "orphaned" } }));

      expect(loadStorageState(storage)).toEqual({ version: 4, activeProjectId: null, projects: [] });
    });

    it("discards an unparsable legacy record instead of crashing", () => {
      const storage = new MemoryStorage();
      storage.setItem(LEGACY_STORAGE_KEY, "{not-valid-json");

      expect(loadStorageState(storage)).toEqual({ version: 4, activeProjectId: null, projects: [] });
      expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    });

    it("does not run legacy migration once versioned storage already exists", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Current" } }, storage);
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ intake: { appName: "Should be ignored" } }));

      const loaded = loadStorageState(storage);

      expect(loaded.projects).toHaveLength(1);
      expect(loaded.projects[0].identity.projectName).toBe(project.identity.projectName);
      expect(storage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
    });
  });

  describe("default browser storage fallback", () => {
    it("falls back to a safe empty state when window.localStorage is inaccessible", () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new Error("SecurityError: localStorage is disabled in this context");
        }
      });

      try {
        expect(loadStorageState()).toEqual({ version: 4, activeProjectId: null, projects: [] });
        expect(() => saveStorageState({ version: 3, activeProjectId: null, projects: [] })).not.toThrow();
        expect(resetStorage()).toEqual({ version: 4, activeProjectId: null, projects: [] });
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, "localStorage", originalDescriptor);
        }
      }
    });
  });

  describe("not-found and empty-state branches", () => {
    it("returns null from getProjectById when the id does not exist", () => {
      const storage = new MemoryStorage();
      createProject({ identity: { projectName: "Only project" } }, storage);
      expect(getProjectById("missing-id", storage)).toBeNull();
    });

    it("returns null from updateProject when the id does not exist", () => {
      const storage = new MemoryStorage();
      createProject({ identity: { projectName: "Only project" } }, storage);
      expect(updateProject("missing-id", { reviewStatus: "Review needed" }, storage)).toBeNull();
    });

    it("returns null from setActiveProject when the id does not exist and leaves the active id unchanged", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Only project" } }, storage);
      expect(setActiveProject("missing-id", storage)).toBeNull();
      expect(loadStorageState(storage).activeProjectId).toBe(project.identity.id);
    });

    it("returns null from getActiveProject when no project is active", () => {
      const storage = new MemoryStorage();
      expect(getActiveProject(storage)).toBeNull();
    });

    it("keeps project.status when updating review decisions on a project with no generated documents yet", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Draft project" } }, storage);
      const reviewItem = project.reviewItems[0];

      const updated = updateReviewItem(project.identity.id, reviewItem.id, {
        status: "Not applicable",
        notApplicableReason: "Not relevant yet"
      }, storage);

      expect(updated?.status).toBe(project.status);
    });

    it("keeps project.status when confirming readiness on a project with no generated documents yet", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Draft project" } }, storage);

      const updated = updateReadinessConfirmation(project.identity.id, "scopeReviewed", true, storage);

      expect(updated?.status).toBe(project.status);
    });

    it("flags the project as Needs Review when a review decision changes after documents were generated", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Generated project" } }, storage);
      saveGeneratedDocuments(project.identity.id, [
        { fileName: "README.md", folder: "", content: "# Generated" }
      ], storage);
      const reviewItem = project.reviewItems[0];

      const updated = updateReviewItem(project.identity.id, reviewItem.id, {
        status: "Not applicable",
        notApplicableReason: "Confirmed outside this project."
      }, storage);

      expect(updated?.status).toBe("Needs Review");
    });

    it("flags the project as Needs Review when readiness is confirmed after documents were generated", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Generated project" } }, storage);
      saveGeneratedDocuments(project.identity.id, [
        { fileName: "README.md", folder: "", content: "# Generated" }
      ], storage);

      const updated = updateReadinessConfirmation(project.identity.id, "scopeReviewed", true, storage);

      expect(updated?.status).toBe("Needs Review");
    });
  });

  it("lists projects most-recently-updated first", async () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { projectName: "First" } }, storage);
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = createProject({ identity: { projectName: "Second" } }, storage);
    await new Promise((resolve) => setTimeout(resolve, 2));
    updateProjectFields(first.identity.id, { appPurpose: "Touch first most recently" }, storage);

    const listed = listProjects(storage);

    expect(listed.map((project) => project.identity.id)).toEqual([first.identity.id, second.identity.id]);
  });

  describe("deleteProject", () => {
    it("ranks multiple remaining projects by most recently updated when reassigning the active id", async () => {
      const storage = new MemoryStorage();
      const first = createProject({ identity: { projectName: "First" } }, storage);
      const second = createProject({ identity: { projectName: "Second" } }, storage);
      const third = createProject({ identity: { projectName: "Third" } }, storage);
      setActiveProject(third.identity.id, storage);
      await new Promise((resolve) => setTimeout(resolve, 2));
      updateProjectFields(second.identity.id, { appPurpose: "Touch second to make it most recent" }, storage);

      const result = deleteProject(third.identity.id, storage);

      expect(result.projects.map((project) => project.identity.id)).toEqual(
        expect.arrayContaining([first.identity.id, second.identity.id])
      );
      expect(result.activeProjectId).toBe(second.identity.id);
    });

    it("switches the active project to the most recently updated remaining project", async () => {
      const storage = new MemoryStorage();
      const first = createProject({ identity: { projectName: "First" } }, storage);
      const second = createProject({ identity: { projectName: "Second" } }, storage);
      setActiveProject(second.identity.id, storage);
      await new Promise((resolve) => setTimeout(resolve, 2));
      updateProjectFields(first.identity.id, { appPurpose: "Touch first to make it most recent" }, storage);

      const result = deleteProject(second.identity.id, storage);

      expect(result.projects).toHaveLength(1);
      expect(result.activeProjectId).toBe(first.identity.id);
    });

    it("clears the active project id when deleting the last remaining project", () => {
      const storage = new MemoryStorage();
      const only = createProject({ identity: { projectName: "Only project" } }, storage);

      const result = deleteProject(only.identity.id, storage);

      expect(result.projects).toHaveLength(0);
      expect(result.activeProjectId).toBeNull();
    });

    it("removes formula review evidence with the containing project record", () => {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "original-project", projectName: "Evidence Delete" },
        intake: { appType: "powerAppsCanvas" }
      }, storage);
      updateProject(project.identity.id, (current) => ({
        ...current,
        powerPlatform: {
          ...current.powerPlatform!,
          canvas: {
            ...current.powerPlatform!.canvas!,
            recordLifecycleFormulaReviewEvidence: [technicalEvidence()]
          }
        }
      }), storage);

      const result = deleteProject(project.identity.id, storage);

      expect(result.projects).toEqual([]);
      expect(storage.getItem("recordLifecycleFormulaReviewEvidence")).toBeNull();
    });

    it("removes planning with the deleted project while preserving other project planning and active fallback", async () => {
      const storage = new MemoryStorage();
      const deleted = createProject({
        identity: { id: "delete-planning", projectName: "Delete Planning" },
        now: "2026-08-01T10:00:00.000Z"
      }, new MemoryStorage());
      const survivor = createProject({
        identity: { id: "survive-planning", projectName: "Survive Planning" },
        now: "2026-08-01T10:05:00.000Z"
      }, new MemoryStorage());
      saveStorageState({
        version: 4,
        activeProjectId: deleted.identity.id,
        projects: [
          { ...deleted, planning: validPlanning(deleted.identity.id) },
          { ...survivor, planning: validPlanning(survivor.identity.id) }
        ]
      }, storage);
      await new Promise((resolve) => setTimeout(resolve, 2));
      updateProjectFields(survivor.identity.id, { appPurpose: "Touch survivor" }, storage);

      const result = deleteProject(deleted.identity.id, storage);
      const stored = storage.getItem(STORAGE_KEY) ?? "";

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].identity.id).toBe(survivor.identity.id);
      expect(result.projects[0].planning?.proposals).toHaveLength(1);
      expect(result.activeProjectId).toBe(survivor.identity.id);
      expect(stored).toContain(survivor.identity.id);
      expect(stored).not.toContain(deleted.identity.id);
      expect(storage.getItem("planning")).toBeNull();
    });

    it("leaves the active project id unchanged when deleting a non-active project", () => {
      const storage = new MemoryStorage();
      const first = createProject({ identity: { projectName: "First" } }, storage);
      const second = createProject({ identity: { projectName: "Second" } }, storage);
      setActiveProject(first.identity.id, storage);

      const result = deleteProject(second.identity.id, storage);

      expect(result.projects).toHaveLength(1);
      expect(result.activeProjectId).toBe(first.identity.id);
    });
  });
});
