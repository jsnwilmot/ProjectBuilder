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
  finalizePlanningClarificationStaleMaterialization,
  preparePlanningClarificationStaleMaterialization,
  type PlanningClarificationStaleMaterializationPreparation,
  type PlanningClarificationStaleRepositoryRuntime
} from "../lib/planningClarificationStaleMaterialization";
import {
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  createEmptyProjectPlanningState,
  normalizeProjectPlanningState,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningProposalStatus,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById } from "../lib/planningRules";
import type { PowerPlatformGateStatus } from "../types/project";

const projectId = "tti-software-licence-tracker";
const timestamp = "2026-07-22T12:00:00.000Z";
const staleTimestamp = "2026-07-22T13:00:00.000Z";

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
    availability: "current",
    observedAt: timestamp,
    ...(source.version ? { version: source.version } : {}),
    ...(source.excerpt ? { excerpt: source.excerpt } : {})
  };
}

function proposalRecord(
  proposal: PlanningClarificationProposalBlueprint,
  fingerprintRecord: PlanningClarificationFingerprintRecord,
  index: number,
  sourceIds: readonly string[],
  overrides: Partial<PlanningProposalRecord> = {}
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
    status: "Needs Clarification",
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
    applicableDomains: [...proposal.applicableDomains],
    ...overrides
  };
}

function existingSourceKey(source: PlanningSourceReference): string {
  return source.sourceType === "projectRule"
    ? `projectRule|${source.locator.slice("planning-rule:".length)}|${source.version}`
    : `readinessPrerequisite|${source.locator.slice("phase-gate:".length)}`;
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

function mutateProposalStatus(planning: ProjectPlanningState, proposalIndex: number, status: PlanningProposalStatus): string {
  const proposal = planning.proposals[proposalIndex];
  planning.proposals = planning.proposals.map((entry, index) =>
    index === proposalIndex ? { ...entry, status } : entry
  );
  return proposal.proposalId;
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
  planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
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

async function recomputeFixture(
  sources: PlanningClarificationSourceBlueprint[],
  proposals: PlanningClarificationProposalBlueprint[]
): Promise<Awaited<ReturnType<typeof ttiFixture>>> {
  const fingerprintResult = await generatePlanningClarificationFingerprints({ projectId, sources, proposals });
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

function runtime(ids: string[], calls = { now: 0, uuid: 0 }): PlanningClarificationStaleRepositoryRuntime {
  return {
    now: () => {
      calls.now += 1;
      return staleTimestamp;
    },
    uuid: () => {
      calls.uuid += 1;
      return ids[calls.uuid - 1] ?? uuid(900 + calls.uuid);
    }
  };
}

async function prepareReady(fixture: Awaited<ReturnType<typeof ttiFixture>>, planning: ProjectPlanningState) {
  const preparation = await preparePlanningClarificationStaleMaterialization(projectId, planning, inputFor(fixture, planning));
  expect(preparation.kind).toBe("ready");
  return preparation as Extract<PlanningClarificationStaleMaterializationPreparation, { kind: "ready" }>;
}

function uuid(index: number): string {
  return `72000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function proposalUuid(index: number): string {
  return `73000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function decisionUuid(index: number): string {
  return `74000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
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

describe("planning clarification stale materialization", () => {
  it("leaves exact TTI planning unchanged without clock, UUID, or mutation", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const beforePlanning = JSON.stringify(planning);
    const beforeInput = JSON.stringify(inputFor(fixture, planning));
    const calls = { now: 0, uuid: 0 };

    const preparation = await preparePlanningClarificationStaleMaterialization(projectId, planning, inputFor(fixture, planning));

    expect(preparation).toMatchObject({
      kind: "unchanged",
      result: {
        outcome: "unchanged",
        transitionedSources: [],
        transitionedProposals: [],
        issues: []
      }
    });
    expect(calls).toEqual({ now: 0, uuid: 0 });
    expect(JSON.stringify(planning)).toBe(beforePlanning);
    expect(JSON.stringify(inputFor(fixture, planning))).toBe(beforeInput);
  });

  it("materializes sourceChanged into one stale source, one stale proposal, and one deterministic decision", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    const sourceId = mutatePersistedSourceLabel(planning, sourceKey, "Prior readiness label");
    const oldProposal = clone(planning.proposals[0]);
    const preparation = await prepareReady(fixture, planning);
    const finalized = finalizePlanningClarificationStaleMaterialization(preparation, runtime([decisionUuid(1)]));

    expect(finalized.result).toMatchObject({
      outcome: "persisted",
      transitionedSources: [{ semanticKey: sourceKey, persistedId: sourceId, staleReason: "sourceChanged" }],
      transitionedProposals: [{
        semanticKey: fixture.proposals[0].proposalKey,
        persistedId: oldProposal.proposalId,
        staleReason: "sourceChanged",
        decisionId: decisionUuid(1)
      }],
      issues: []
    });
    const planningAfter = finalized.planning!;
    expect(planningAfter.sources.find((source) => source.sourceId === sourceId)).toMatchObject({
      availability: "stale",
      observedAt: timestamp
    });
    expect(Object.keys(planningAfter.sources.find((source) => source.sourceId === sourceId)!)).not.toContain("staleReason");
    const proposal = planningAfter.proposals.find((entry) => entry.proposalId === oldProposal.proposalId)!;
    expect(proposal).toMatchObject({
      status: "Stale",
      staleReason: "sourceChanged",
      staleAt: staleTimestamp,
      updatedAt: staleTimestamp,
      lastDecisionId: decisionUuid(1)
    });
    expect(proposal.fingerprint).toBe(oldProposal.fingerprint);
    expect(proposal.recommendation).toBe(oldProposal.recommendation);
    expect(planningAfter.sources).toHaveLength(planning.sources.length);
    expect(planningAfter.proposals).toHaveLength(planning.proposals.length);
    expect(planningAfter.decisions).toEqual([{
      decisionId: decisionUuid(1),
      proposalId: oldProposal.proposalId,
      projectId,
      action: "markStale",
      previousStatus: "Needs Clarification",
      resultingStatus: "Stale",
      origin: "deterministicRule",
      recordedAt: staleTimestamp,
      reason: "sourceChanged",
      ruleSetVersion: PLANNING_RULE_SET_VERSION
    }]);
    expect(normalizeProjectPlanningState(planningAfter, projectId).issues).toEqual([]);
  });

  it("materializes exact rule-version rollover while keeping generated replacement records unpersisted", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const rollover = applyOldRuleSourceRollover(planning, fixture.proposals[0], "phase-5c.old-rule-version");
    const preparation = await prepareReady(fixture, planning);
    const finalized = finalizePlanningClarificationStaleMaterialization(preparation, runtime([decisionUuid(2)]));

    expect(finalized.result.transitionedSources).toEqual([{
      semanticKey: rollover.oldProjectRuleSourceKey,
      persistedId: rollover.projectRuleSourceId,
      staleReason: "ruleChanged"
    }]);
    expect(finalized.result.transitionedProposals[0]).toMatchObject({ staleReason: "ruleChanged" });
    expect(finalized.planning!.sources.find((source) => existingSourceKey(source) === rollover.oldProjectRuleSourceKey)).toMatchObject({ availability: "stale" });
    expect(finalized.planning!.sources.some((source) => existingSourceKey(source) === rollover.newProjectRuleSourceKey)).toBe(false);
    expect(finalized.planning!.proposals).toHaveLength(planning.proposals.length);
  });

  it("does not duplicate a source transition when the old rule source is already historical", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const rollover = applyOldRuleSourceRollover(planning, fixture.proposals[0], "phase-5c.non-current-old-rule-version", {
      sourceAvailability: "stale"
    });
    const preparation = await prepareReady(fixture, planning);
    const finalized = finalizePlanningClarificationStaleMaterialization(preparation, runtime([decisionUuid(3)]));

    expect(finalized.result.transitionedSources).toEqual([]);
    expect(finalized.result.transitionedProposals[0]).toMatchObject({ staleReason: "ruleChanged" });
    expect(finalized.planning!.sources.find((source) => source.sourceId === rollover.projectRuleSourceId)).toMatchObject({
      availability: "stale",
      observedAt: timestamp
    });
  });

  it("materializes applicabilityChanged without changing sources or generated proposal content", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const oldProposal = planning.proposals[0];
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      applicableDomains: ["security"],
      fingerprint: fingerprint(44)
    } : proposal);
    const preparation = await prepareReady(fixture, planning);
    const finalized = finalizePlanningClarificationStaleMaterialization(preparation, runtime([decisionUuid(4)]));

    expect(finalized.result.transitionedSources).toEqual([]);
    expect(finalized.result.transitionedProposals).toEqual([{
      semanticKey: fixture.proposals[0].proposalKey,
      persistedId: oldProposal.proposalId,
      staleReason: "applicabilityChanged",
      decisionId: decisionUuid(4)
    }]);
    expect(finalized.planning!.proposals[0]).toMatchObject({
      status: "Stale",
      staleReason: "applicabilityChanged",
      fingerprint: fingerprint(44),
      applicableDomains: ["security"]
    });
  });

  it("uses one timestamp and deterministic proposal ordering for multiple proposal transitions", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 1, "readinessPrerequisite|"), "Prior readiness label 1");
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      applicableDomains: ["security"],
      fingerprint: fingerprint(45)
    } : proposal);
    const calls = { now: 0, uuid: 0 };
    const preparation = await prepareReady(fixture, planning);
    const finalized = finalizePlanningClarificationStaleMaterialization(
      preparation,
      runtime([decisionUuid(10), decisionUuid(11)], calls)
    );

    expect(calls).toEqual({ now: 1, uuid: 2 });
    expect(finalized.result.transitionedProposals.map((entry) => entry.semanticKey)).toEqual(
      [...finalized.result.transitionedProposals.map((entry) => entry.semanticKey)].sort()
    );
    expect(finalized.result.transitionedProposals.map((entry) => entry.decisionId)).toEqual([decisionUuid(10), decisionUuid(11)]);
    expect(new Set(finalized.planning!.proposals.filter((proposal) => proposal.status === "Stale").map((proposal) => proposal.staleAt))).toEqual(new Set([staleTimestamp]));
    expect(new Set(finalized.planning!.decisions.map((decision) => decision.recordedAt))).toEqual(new Set([staleTimestamp]));
  });

  it("blocks C-blocked and unversioned content cases without runtime calls", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 0, "readinessPrerequisite|"), "Prior readiness label");
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      applicableDomains: ["security"],
      fingerprint: fingerprint(46)
    } : proposal);

    const blocked = await preparePlanningClarificationStaleMaterialization(projectId, planning, inputFor(fixture, planning));
    expect(blocked).toMatchObject({
      kind: "blocked",
      result: {
        outcome: "blocked",
        issues: expect.arrayContaining([expect.objectContaining({ code: "stalePropagationBlocked" })])
      }
    });

    const unversionedPlanning = exactPlanning(fixture);
    unversionedPlanning.proposals = unversionedPlanning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      recommendation: "Changed recommendation without versioned evidence.",
      fingerprint: fingerprint(47)
    } : proposal);
    const unversioned = await preparePlanningClarificationStaleMaterialization(projectId, unversionedPlanning, inputFor(fixture, unversionedPlanning));
    expect(unversioned).toMatchObject({
      kind: "blocked",
      result: {
        outcome: "blocked",
        issues: expect.arrayContaining([expect.objectContaining({ sourceIssueCode: "unversionedRuleContentChange" })])
      }
    });
  });

  it("allows Needs Clarification, Blocked, and Confirmed proposals to become stale", async () => {
    const fixture = await ttiFixture();
    for (const status of ["Needs Clarification", "Blocked", "Confirmed"] as const) {
      const planning = exactPlanning(fixture);
      const proposalId = mutateProposalStatus(planning, 0, status);
      mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 0, "readinessPrerequisite|"), `Prior ${status} source label`);
      const preparation = await prepareReady(fixture, planning);
      const finalized = finalizePlanningClarificationStaleMaterialization(preparation, runtime([decisionUuid(status.length)]));
      const proposal = finalized.planning!.proposals.find((entry) => entry.proposalId === proposalId)!;
      const decision = finalized.planning!.decisions.find((entry) => entry.decisionId === proposal.lastDecisionId)!;

      expect(proposal).toMatchObject({ status: "Stale", staleReason: "sourceChanged" });
      expect(decision).toMatchObject({
        action: "markStale",
        previousStatus: status,
        resultingStatus: "Stale",
        origin: "deterministicRule",
        reason: "sourceChanged"
      });
    }
  });

  it("keeps Rejected and Superseded proposal history terminal without reopening", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => {
      if (index === 0) return { ...proposal, status: "Rejected" };
      if (index === 1) return { ...proposal, status: "Superseded", supersededByProposalId: proposalUuid(3) };
      return proposal;
    });
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 0, "readinessPrerequisite|"), "Prior readiness label");
    const preparation = await prepareReady(fixture, planning);
    const finalized = finalizePlanningClarificationStaleMaterialization(preparation, runtime([decisionUuid(20)]));

    expect(finalized.planning!.proposals.find((entry) => entry.proposalId === proposalUuid(1))?.status).toBe("Rejected");
    expect(finalized.planning!.proposals.find((entry) => entry.proposalId === proposalUuid(2))?.status).toBe("Superseded");
    expect(finalized.planning!.decisions.some((decision) => decision.proposalId === proposalUuid(1))).toBe(false);
    expect(finalized.planning!.decisions.some((decision) => decision.proposalId === proposalUuid(2))).toBe(false);
  });

  it("blocks invalid UUID runtime cases before producing partial candidates", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 0, "readinessPrerequisite|"), "Prior readiness label");
    const preparation = await prepareReady(fixture, planning);

    vi.stubGlobal("crypto", undefined);
    expect(finalizePlanningClarificationStaleMaterialization(preparation, { now: () => staleTimestamp }).result.issues[0].code).toBe("uuidUnavailable");
    vi.stubGlobal("crypto", webcrypto);
    expect(finalizePlanningClarificationStaleMaterialization(preparation, { now: () => staleTimestamp, uuid: () => "NOT-A-UUID" }).result.issues[0].code).toBe("invalidGeneratedUuid");
    expect(finalizePlanningClarificationStaleMaterialization(preparation, { now: () => staleTimestamp, uuid: () => planning.proposals[0].proposalId }).result.issues[0].code).toBe("duplicateGeneratedUuid");

    const multiPlanning = exactPlanning(fixture);
    mutatePersistedSourceLabel(multiPlanning, proposalSourceKey(fixture, 0, "readinessPrerequisite|"), "Prior readiness label 0");
    mutatePersistedSourceLabel(multiPlanning, proposalSourceKey(fixture, 1, "readinessPrerequisite|"), "Prior readiness label 1");
    const multiPreparation = await prepareReady(fixture, multiPlanning);
    const duplicateRuntime = {
      now: () => staleTimestamp,
      uuid: () => decisionUuid(88)
    };
    expect(finalizePlanningClarificationStaleMaterialization(multiPreparation, duplicateRuntime).result.issues[0].code).toBe("duplicateGeneratedUuid");
  });

  it("blocks invalid timestamps before UUID generation", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 0, "readinessPrerequisite|"), "Prior readiness label");
    const preparation = await prepareReady(fixture, planning);
    const calls = { now: 0, uuid: 0 };
    const finalized = finalizePlanningClarificationStaleMaterialization(preparation, {
      now: () => {
        calls.now += 1;
        return "2026-07-22T13:00:00Z";
      },
      uuid: () => {
        calls.uuid += 1;
        return decisionUuid(90);
      }
    });

    expect(finalized.result).toMatchObject({
      outcome: "blocked",
      issues: [{ code: "invalidMaterializationTimestamp" }]
    });
    expect(calls).toEqual({ now: 1, uuid: 0 });
  });

  it("preserves coherent already-stale deterministic history without duplicate decisions", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    const staleDecision: PlanningDecisionRecord = {
      decisionId: decisionUuid(30),
      proposalId: planning.proposals[0].proposalId,
      projectId,
      action: "markStale",
      previousStatus: "Needs Clarification",
      resultingStatus: "Stale",
      origin: "deterministicRule",
      recordedAt: staleTimestamp,
      reason: "sourceChanged",
      ruleSetVersion: PLANNING_RULE_SET_VERSION
    };
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      status: "Stale",
      staleReason: "sourceChanged",
      staleAt: staleTimestamp,
      updatedAt: staleTimestamp,
      lastDecisionId: staleDecision.decisionId
    } : proposal);
    planning.decisions = [staleDecision];
    mutatePersistedSourceLabel(planning, sourceKey, "Prior readiness label");
    const preparation = await prepareReady(fixture, planning);
    const calls = { now: 0, uuid: 0 };
    const finalized = finalizePlanningClarificationStaleMaterialization(preparation, runtime([decisionUuid(31)], calls));

    expect(finalized.result.transitionedProposals).toEqual([]);
    expect(finalized.planning!.decisions).toHaveLength(1);
    expect(finalized.planning!.proposals[0]).toMatchObject({
      staleAt: staleTimestamp,
      updatedAt: staleTimestamp,
      lastDecisionId: staleDecision.decisionId
    });
    expect(calls).toEqual({ now: 1, uuid: 0 });
  });

  it("blocks incoherent already-stale deterministic history", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      status: "Stale",
      staleReason: "sourceChanged",
      staleAt: staleTimestamp,
      updatedAt: staleTimestamp
    } : proposal);
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 0, "readinessPrerequisite|"), "Prior readiness label");

    const preparation = await preparePlanningClarificationStaleMaterialization(projectId, planning, inputFor(fixture, planning));

    expect(preparation).toMatchObject({
      kind: "blocked",
      result: { issues: [expect.objectContaining({ code: "invalidExistingStaleDecisionHistory" })] }
    });
  });

  it("is input-order invariant and assigns UUIDs by canonical proposal order", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 0, "readinessPrerequisite|"), "Prior readiness label 0");
    mutatePersistedSourceLabel(planning, proposalSourceKey(fixture, 1, "readinessPrerequisite|"), "Prior readiness label 1");
    const reversedFixture = {
      sources: [...fixture.sources].reverse(),
      proposals: [...fixture.proposals].reverse(),
      fingerprints: [...fixture.fingerprints].reverse()
    };

    const forward = await prepareReady(fixture, planning);
    const reversed = await prepareReady(reversedFixture, {
      ...planning,
      sources: [...planning.sources].reverse(),
      proposals: [...planning.proposals].reverse()
    });

    expect(reversed.sourceTransitions).toEqual(forward.sourceTransitions);
    expect(reversed.proposalTransitions).toEqual(forward.proposalTransitions);
    const finalized = finalizePlanningClarificationStaleMaterialization(reversed, runtime([decisionUuid(41), decisionUuid(42)]));
    expect(finalized.result.transitionedProposals.map((entry) => entry.decisionId)).toEqual([decisionUuid(41), decisionUuid(42)]);
  });

  it("keeps caller-owned inputs immutable and planning isolated from readiness/output/external effects", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const changedSources = fixture.sources.map((source, index) => index === 0 ? { ...source, label: `${source.label} changed` } : source);
    const changedProposals = withUpdatedSourceEvidenceInputs(fixture.proposals, changedSources);
    const changedFixture = await recomputeFixture(changedSources, changedProposals);
    const beforeFixture = JSON.stringify(changedFixture);
    const beforePlanning = JSON.stringify(planning);
    const preparation = await prepareReady(changedFixture, planning);
    const finalized = finalizePlanningClarificationStaleMaterialization(preparation, runtime([decisionUuid(50)]));

    expect(JSON.stringify(changedFixture)).toBe(beforeFixture);
    expect(JSON.stringify(planning)).toBe(beforePlanning);
    expect(finalized.planning).not.toBe(planning);
    const source = readFileSync("src/lib/planningClarificationStaleMaterialization.ts", "utf8");
    expect(source).not.toMatch(/localStorage|setItem|getItem|fetch\s*\(|XMLHttpRequest|axios|apiKey|accessToken|telemetry|Power Fx|YAML/i);
    expect(source).not.toMatch(/readyForCodex|generateProjectPackage|exportProjectPackage/);
  });
});
