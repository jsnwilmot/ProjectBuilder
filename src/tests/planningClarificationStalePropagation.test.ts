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
import { analyzePlanningClarificationStalePropagation } from "../lib/planningClarificationStalePropagation";
import {
  PLANNING_SCHEMA_VERSION,
  createEmptyProjectPlanningState,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById } from "../lib/planningRules";
import type { PowerPlatformGateStatus } from "../types/project";

const projectId = "tti-software-licence-tracker";
const timestamp = "2026-07-22T12:00:00.000Z";

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
    gateResults: ruleIds.map((ruleId) => {
      const rule = getPlanningRuleById(ruleId)!;
      return gate(rule.target.targetKey, ttiStatuses[rule.target.targetKey]);
    })
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
  return {
    sources: clone(blueprintResult.sources) as PlanningClarificationSourceBlueprint[],
    proposals: clone(blueprintResult.proposals) as PlanningClarificationProposalBlueprint[],
    fingerprints: clone(fingerprintResult.fingerprints) as PlanningClarificationFingerprintRecord[]
  };
}

function exactPlanning(fixture: Awaited<ReturnType<typeof ttiFixture>>): ProjectPlanningState {
  const sources = fixture.sources.map(sourceRecord);
  const sourceIdsByKey = new Map(sources.map((source) => [existingSourceKey(source), source.sourceId]));
  const proposals = fixture.proposals.map((proposal, index) =>
    proposalRecord(proposal, fixture.fingerprints[index], index + 1, proposal.sourceKeys.map((sourceKey) => sourceIdsByKey.get(sourceKey)!))
  );
  return {
    ...createEmptyProjectPlanningState(),
    sources,
    proposals
  };
}

function sourceRecord(source: PlanningClarificationSourceBlueprint, index: number): PlanningSourceReference {
  return {
    sourceId: uuid(index + 1),
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

function existingSourceKey(source: PlanningSourceReference): string {
  return source.sourceType === "projectRule"
    ? `projectRule|${source.locator.slice("planning-rule:".length)}|${source.version}`
    : `readinessPrerequisite|${source.locator.slice("phase-gate:".length)}`;
}

async function withRecomputedFingerprints(
  sources: PlanningClarificationSourceBlueprint[],
  proposals: PlanningClarificationProposalBlueprint[]
): Promise<Awaited<ReturnType<typeof ttiFixture>>> {
  const fingerprintResult = await generatePlanningClarificationFingerprints({
    projectId,
    sources,
    proposals
  });
  expect(fingerprintResult.issues).toEqual([]);
  return {
    sources: clone(sources),
    proposals: clone(proposals),
    fingerprints: clone(fingerprintResult.fingerprints) as PlanningClarificationFingerprintRecord[]
  };
}

function withUpdatedSourceEvidenceInputs(
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
      fingerprintInput: JSON.stringify({
        ...parsed,
        sourceEvidence
      })
    };
  });
}

function applyOldRuleSourceRollover(
  planning: ProjectPlanningState,
  generatedProposal: PlanningClarificationProposalBlueprint,
  oldRuleVersion: string,
  options: { sourceAvailability?: PlanningSourceReference["availability"] } = {}
): { oldProjectRuleSourceKey: string; newProjectRuleSourceKey: string; projectRuleSourceId: string } {
  const newProjectRuleSourceKey = generatedProposal.sourceKeys.find((sourceKey) => sourceKey.startsWith("projectRule|"))!;
  const projectRuleSource = planning.sources.find((source) => existingSourceKey(source) === newProjectRuleSourceKey)!;
  planning.sources = planning.sources.map((source) =>
    source.sourceId === projectRuleSource.sourceId ? {
      ...source,
      ...(options.sourceAvailability ? { availability: options.sourceAvailability } : {}),
      version: oldRuleVersion
    } : source
  );
  planning.proposals = planning.proposals.map((proposal) => proposal.proposalId === planning.proposals[0].proposalId ? {
    ...proposal,
    ruleVersion: oldRuleVersion,
    fingerprint: fingerprint(60)
  } : proposal);
  return {
    oldProjectRuleSourceKey: `projectRule|${generatedProposal.ruleId}|${oldRuleVersion}`,
    newProjectRuleSourceKey,
    projectRuleSourceId: projectRuleSource.sourceId
  };
}

function proposalSourceKey(fixture: Awaited<ReturnType<typeof ttiFixture>>, proposalIndex: number, prefix: string): string {
  return fixture.proposals[proposalIndex].sourceKeys.find((sourceKey) => sourceKey.startsWith(prefix))!;
}

function mutatePersistedSourceLabel(planning: ProjectPlanningState, sourceKey: string, label: string): string {
  const source = planning.sources.find((entry) => existingSourceKey(entry) === sourceKey)!;
  planning.sources = planning.sources.map((entry) =>
    entry.sourceId === source.sourceId ? { ...entry, label } : entry
  );
  return source.sourceId;
}

function inputFor(fixture: Awaited<ReturnType<typeof ttiFixture>>, planning: ProjectPlanningState) {
  return {
    projectId,
    existingPlanning: planning,
    sources: fixture.sources,
    proposals: fixture.proposals,
    fingerprints: fixture.fingerprints
  };
}

function uuid(index: number): string {
  return `72000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function proposalUuid(index: number): string {
  return `73000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function fingerprint(index: number): string {
  return `${index.toString(16).padStart(2, "0")}`.repeat(32);
}

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("planning clarification stale propagation", () => {
  it("A reports exact TTI persisted planning as unchanged", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    expect(result.outcome).toBe("unchanged");
    expect(result.issues).toEqual([]);
    expect(result.sources.every((source) => source.baseDisposition === "unchanged" && source.effectiveDisposition === "unchanged")).toBe(true);
    expect(result.proposals.every((proposal) => proposal.baseDisposition === "unchanged" && proposal.effectiveDisposition === "unchanged")).toBe(true);
  });

  it("B propagates a changed persisted source to an otherwise unchanged dependent proposal", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    const sourceId = mutatePersistedSourceLabel(planning, sourceKey, "Prior readiness label");

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(result.outcome).toBe("staleTransitionsRequired");
    expect(result.issues).toEqual([]);
    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: sourceKey,
      persistedId: sourceId,
      baseDisposition: "staleRequired",
      effectiveDisposition: "staleRequired",
      staleReason: "sourceChanged"
    }));
    expect(proposal).toMatchObject({
      baseDisposition: "unchanged",
      effectiveDisposition: "staleRequired",
      staleReason: "sourceChanged",
      propagatedFromSourceKeys: [sourceKey],
      propagatedFromSourceIds: [sourceId]
    });
  });

  it("C resolves fingerprint-only proposal ambiguity when changed generated source evidence is the sole dependency cause", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    const sourceId = planning.sources.find((source) => existingSourceKey(source) === sourceKey)!.sourceId;
    const changedSources = fixture.sources.map((source) =>
      source.sourceKey === sourceKey ? { ...source, label: `${source.label} changed` } : source
    );
    const changedProposals = withUpdatedSourceEvidenceInputs(fixture.proposals, changedSources);
    const changedFixture = await withRecomputedFingerprints(changedSources, changedProposals);

    const result = await analyzePlanningClarificationStalePropagation(inputFor(changedFixture, planning));

    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(result.outcome).toBe("staleTransitionsRequired");
    expect(result.issues).toEqual([]);
    expect(proposal).toMatchObject({
      baseDisposition: "ambiguous",
      effectiveDisposition: "staleRequired",
      staleReason: "sourceChanged",
      changedFields: ["fingerprint"],
      propagatedFromSourceKeys: [sourceKey],
      propagatedFromSourceIds: [sourceId]
    });
  });

  it("D records multiple changed sources for one dependent proposal as one sourceChanged cause", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const sourceKeys = [
      proposalSourceKey(fixture, 0, "projectRule|"),
      proposalSourceKey(fixture, 0, "readinessPrerequisite|")
    ].sort();
    const sourceIds = sourceKeys.map((sourceKey, index) =>
      mutatePersistedSourceLabel(planning, sourceKey, `Prior source label ${index}`)
    );

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(result.outcome).toBe("staleTransitionsRequired");
    expect(result.issues).toEqual([]);
    expect(proposal.effectiveDisposition).toBe("staleRequired");
    expect(proposal.staleReason).toBe("sourceChanged");
    expect(proposal.propagatedFromSourceKeys).toEqual(sourceKeys);
    expect(proposal.propagatedFromSourceIds).toEqual(sourceIds);
  });

  it("E blocks when source propagation and a direct applicability change both apply", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    mutatePersistedSourceLabel(planning, sourceKey, "Prior readiness label");
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      applicableDomains: ["security"],
      fingerprint: fingerprint(5)
    } : proposal);

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(result.outcome).toBe("blocked");
    expect(proposal.effectiveDisposition).toBe("ambiguous");
    expect(proposal.staleReason).toBeUndefined();
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "multipleLifecycleReasons",
      proposalKey: fixture.proposals[0].proposalKey
    }));
  });

  it("F promotes the current old project-rule source during exact rule rollover", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const rollover = applyOldRuleSourceRollover(planning, fixture.proposals[0], "phase-5c.old-rule-version");

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    expect(result.outcome).toBe("staleTransitionsRequired");
    expect(result.issues).toEqual([]);
    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: rollover.oldProjectRuleSourceKey,
      persistedId: rollover.projectRuleSourceId,
      baseDisposition: "noLongerGenerated",
      effectiveDisposition: "staleRequired",
      staleReason: "ruleChanged"
    }));
    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: rollover.newProjectRuleSourceKey,
      baseDisposition: "unchanged",
      effectiveDisposition: "unchanged",
      sourceReconciliationDisposition: "newSource"
    }));
    expect(result.proposals).toContainEqual(expect.objectContaining({
      semanticKey: fixture.proposals[0].proposalKey,
      baseDisposition: "staleRequired",
      effectiveDisposition: "staleRequired",
      staleReason: "ruleChanged"
    }));
  });

  it("G keeps already non-current old rule sources historical while preserving the ruleChanged proposal", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const rollover = applyOldRuleSourceRollover(planning, fixture.proposals[0], "phase-5c.non-current-old-rule-version", {
      sourceAvailability: "stale"
    });

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    expect(result.outcome).toBe("staleTransitionsRequired");
    expect(result.issues).toEqual([]);
    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: rollover.oldProjectRuleSourceKey,
      persistedId: rollover.projectRuleSourceId,
      baseDisposition: "historical",
      effectiveDisposition: "historical"
    }));
    expect(result.proposals).toContainEqual(expect.objectContaining({
      semanticKey: fixture.proposals[0].proposalKey,
      effectiveDisposition: "staleRequired",
      staleReason: "ruleChanged"
    }));
  });

  it("H blocks ordinary existing-only sources without inferring lineage", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const extraSource = {
      ...planning.sources[0],
      sourceId: uuid(77),
      locator: "planning-rule:pp.extra.ordinary.confirmation",
      version: "phase-5c.extra-source"
    };
    planning.sources = [...planning.sources, extraSource];
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      sourceIds: [...proposal.sourceIds, extraSource.sourceId],
      fingerprint: fingerprint(7)
    } : proposal);

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    expect(result.outcome).toBe("blocked");
    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: "projectRule|pp.extra.ordinary.confirmation|phase-5c.extra-source",
      effectiveDisposition: "noLongerGenerated"
    }));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "sourceDependencyUnresolved",
      sourceKey: "projectRule|pp.extra.ordinary.confirmation|phase-5c.extra-source"
    }));
  });

  it("I blocks existing-only proposals without deterministic stale propagation", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const reducedProposals = fixture.proposals.slice(1);
    const reducedProposalKeys = new Set(reducedProposals.flatMap((proposal) => proposal.sourceKeys));
    const reducedFixture = {
      sources: fixture.sources.filter((source) => reducedProposalKeys.has(source.sourceKey)),
      proposals: reducedProposals,
      fingerprints: fixture.fingerprints.slice(1)
    };

    const result = await analyzePlanningClarificationStalePropagation(inputFor(reducedFixture, planning));

    expect(result.outcome).toBe("blocked");
    expect(result.proposals).toContainEqual(expect.objectContaining({
      semanticKey: fixture.proposals[0].proposalKey,
      effectiveDisposition: "noLongerGenerated"
    }));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "unresolvedLifecycleChange",
      proposalKey: fixture.proposals[0].proposalKey
    }));
  });

  it("J blocks unversioned generated proposal content changes", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      recommendation: "Changed recommendation without versioned rule evidence.",
      fingerprint: fingerprint(8)
    } : proposal);

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    expect(result.outcome).toBe("blocked");
    expect(result.proposals).toContainEqual(expect.objectContaining({
      semanticKey: fixture.proposals[0].proposalKey,
      effectiveDisposition: "staleRequired",
      staleReason: "proposalRegenerated"
    }));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "unversionedRuleContentChange",
      proposalKey: fixture.proposals[0].proposalKey
    }));
  });

  it("K keeps Rejected and Superseded proposal history historical without propagation or reopening", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => {
      if (index === 0) return { ...proposal, status: "Rejected" };
      if (index === 1) return { ...proposal, status: "Superseded", supersededByProposalId: proposalUuid(3) };
      return proposal;
    });
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    mutatePersistedSourceLabel(planning, sourceKey, "Prior readiness label");

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    const rejected = result.proposals.find((entry) => entry.persistedId === proposalUuid(1))!;
    const superseded = result.proposals.find((entry) => entry.persistedId === proposalUuid(2))!;
    expect(rejected).toMatchObject({ baseDisposition: "historical", effectiveDisposition: "historical" });
    expect(superseded).toMatchObject({ baseDisposition: "historical", effectiveDisposition: "historical" });
    expect(rejected.propagatedFromSourceIds).toBeUndefined();
    expect(superseded.propagatedFromSourceIds).toBeUndefined();
  });

  it("L is input-order invariant", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 0, "projectRule|"), "Prior project rule label");
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 0, "readinessPrerequisite|"), "Prior readiness label");

    const forward = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));
    const reversed = await analyzePlanningClarificationStalePropagation({
      projectId,
      existingPlanning: {
        ...planning,
        sources: [...planning.sources].reverse(),
        proposals: [...planning.proposals].reverse()
      },
      sources: [...fixture.sources].reverse(),
      proposals: [...fixture.proposals].reverse(),
      fingerprints: [...fixture.fingerprints].reverse()
    });

    expect(reversed).toEqual(forward);
  });

  it("blocks malformed persisted source members without raw propagation map access", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const malformedPlanning = {
      ...planning,
      sources: [null]
    } as unknown as ProjectPlanningState;
    const before = JSON.stringify(malformedPlanning);

    const result = await analyzePlanningClarificationStalePropagation({
      projectId,
      existingPlanning: malformedPlanning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    expect(result.outcome).toBe("blocked");
    expect(result.sources).toEqual([]);
    expect(result.proposals).toEqual([]);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "lifecycleAnalysisFailed",
      underlyingIssueCode: "invalidExistingPlanning"
    }));
    expect(JSON.stringify(malformedPlanning)).toBe(before);
  });

  it("blocks malformed generated proposal members without raw generated proposal map access", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);

    const result = await analyzePlanningClarificationStalePropagation({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: [null] as unknown as PlanningClarificationProposalBlueprint[],
      fingerprints: fixture.fingerprints
    });

    expect(result.outcome).toBe("blocked");
    expect(result.sources).toEqual([]);
    expect(result.proposals).toEqual([]);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "lifecycleAnalysisFailed",
      underlyingIssueCode: "sourceReconciliationFailed"
    }));
    expect(result.proposals.some((proposal) => proposal.propagatedFromSourceIds)).toBe(false);
  });

  it("blocks malformed generated source members with zero transition records", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);

    const result = await analyzePlanningClarificationStalePropagation({
      projectId,
      existingPlanning: planning,
      sources: [null] as unknown as PlanningClarificationSourceBlueprint[],
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    expect(result).toMatchObject({
      outcome: "blocked",
      sources: [],
      proposals: []
    });
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "lifecycleAnalysisFailed",
      underlyingIssueCode: "sourceReconciliationFailed"
    }));
  });

  it("stops at the B failure gate when invalid project input also contains malformed nested state", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const malformedPlanning = {
      ...planning,
      sources: [null],
      proposals: [null]
    } as unknown as ProjectPlanningState;

    const result = await analyzePlanningClarificationStalePropagation({
      projectId: "",
      existingPlanning: malformedPlanning,
      sources: [null] as unknown as PlanningClarificationSourceBlueprint[],
      proposals: [null] as unknown as PlanningClarificationProposalBlueprint[],
      fingerprints: fixture.fingerprints
    });

    expect(result).toMatchObject({
      projectId: "",
      outcome: "blocked",
      sources: [],
      proposals: [],
      issues: [expect.objectContaining({
        code: "lifecycleAnalysisFailed",
        underlyingIssueCode: "invalidProjectId"
      })]
    });
  });

  it("returns zero source and proposal conclusions for B validation or reconciliation failure", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);

    const results = await Promise.all([
      analyzePlanningClarificationStalePropagation({
        projectId,
        existingPlanning: { ...planning, proposals: [null] } as unknown as ProjectPlanningState,
        sources: fixture.sources,
        proposals: fixture.proposals,
        fingerprints: fixture.fingerprints
      }),
      analyzePlanningClarificationStalePropagation({
        projectId,
        existingPlanning: planning,
        sources: fixture.sources,
        proposals: [null] as unknown as PlanningClarificationProposalBlueprint[],
        fingerprints: fixture.fingerprints
      })
    ]);

    for (const result of results) {
      expect(result.outcome).toBe("blocked");
      expect(result.sources).toEqual([]);
      expect(result.proposals).toEqual([]);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "lifecycleAnalysisFailed" })
      ]));
    }
  });

  it("M does not mutate inputs and keeps isolation boundaries absent", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const beforeFixture = JSON.stringify(fixture);
    const beforePlanning = JSON.stringify(planning);

    const result = await analyzePlanningClarificationStalePropagation(inputFor(fixture, planning));

    expect(JSON.stringify(fixture)).toBe(beforeFixture);
    expect(JSON.stringify(planning)).toBe(beforePlanning);
    expect(result).toMatchObject({ outcome: "unchanged" });
    await expect(analyzePlanningClarificationStalePropagation(null)).resolves.toMatchObject({
      outcome: "blocked",
      issues: [expect.objectContaining({ code: "lifecycleAnalysisFailed", underlyingIssueCode: "invalidInput" })]
    });
    const source = readFileSync("src/lib/planningClarificationStalePropagation.ts", "utf8");
    expect(source).not.toMatch(/randomUUID|Math\.random|Date\.now|new Date|localStorage|setItem|getItem|fetch\s*\(|XMLHttpRequest|axios|apiKey|accessToken|telemetry/i);
    expect(source).not.toMatch(/markStale|supersededByProposalId:\s|appendDecision|PlanningDecisionRecord|PlanningConflictRecord|readyForCodex|generateProjectPackage|exportProjectPackage|Power Fx|YAML/i);
  });
});
