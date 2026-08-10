// @ts-expect-error -- Vitest runs Web Crypto setup in Node; the app tsconfig intentionally excludes Node ambient types.
import { webcrypto } from "node:crypto";
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
import { analyzePlanningClarificationReplacements } from "../lib/planningClarificationReplacementAnalysis";
import {
  finalizePlanningClarificationReplacementMaterialization,
  preparePlanningClarificationReplacementMaterialization,
  type PlanningClarificationReplacementMaterializationPreparation,
  type PlanningClarificationReplacementRepositoryRuntime
} from "../lib/planningClarificationReplacementMaterialization";
import {
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  createEmptyProjectPlanningState,
  isPlanningStatusOutputEligible,
  isPlanningStatusReadinessEligible,
  normalizeProjectPlanningState,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type PlanningStaleReason,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById } from "../lib/planningRules";
import type { PowerPlatformGateStatus } from "../types/project";

const projectId = "tti-software-licence-tracker";
const timestamp = "2026-07-22T12:00:00.000Z";
const staleTimestamp = "2026-07-22T13:00:00.000Z";
const materializedAt = "2026-07-22T14:00:00.000Z";

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
  return {
    ...createEmptyProjectPlanningState(),
    sources,
    proposals: fixture.proposals.map((proposal, index) =>
      proposalRecord(proposal, fixture.fingerprints[index], index + 1, proposal.sourceKeys.map((sourceKey) => sourceIdsByKey.get(sourceKey)!))
    )
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
    applicableDomains: [...proposal.applicableDomains],
    ...overrides
  };
}

function existingSourceKey(source: PlanningSourceReference): string {
  return source.sourceType === "projectRule"
    ? `projectRule|${source.locator.slice("planning-rule:".length)}|${source.version}`
    : `readinessPrerequisite|${source.locator.slice("phase-gate:".length)}`;
}

function sourceIdForKey(planning: ProjectPlanningState, sourceKey: string): string {
  return planning.sources.find((source) => existingSourceKey(source) === sourceKey)!.sourceId;
}

function proposalSourceKey(fixture: Awaited<ReturnType<typeof ttiFixture>>, proposalIndex: number, prefix: string): string {
  return fixture.proposals[proposalIndex].sourceKeys.find((sourceKey) => sourceKey.startsWith(prefix))!;
}

function markSourceStale(planning: ProjectPlanningState, sourceKey: string, availability: PlanningSourceReference["availability"] = "stale"): string {
  const sourceId = sourceIdForKey(planning, sourceKey);
  planning.sources = planning.sources.map((source) =>
    source.sourceId === sourceId ? { ...source, availability } : source
  );
  return sourceId;
}

function markProposalStale(
  planning: ProjectPlanningState,
  proposalIndex: number,
  reason: PlanningStaleReason,
  options: Partial<PlanningProposalRecord> = {}
): { proposalId: string; decisionId: string } {
  const proposal = planning.proposals[proposalIndex];
  const decisionId = decisionUuid(proposalIndex + 1);
  planning.proposals = planning.proposals.map((entry, index) => index === proposalIndex ? {
    ...entry,
    ...options,
    status: "Stale",
    staleReason: reason,
    staleAt: staleTimestamp,
    updatedAt: staleTimestamp,
    lastDecisionId: decisionId
  } : entry);
  planning.decisions = [...planning.decisions, {
    decisionId,
    proposalId: proposal.proposalId,
    projectId,
    action: "markStale",
    previousStatus: proposal.status,
    resultingStatus: "Stale",
    origin: "deterministicRule",
    recordedAt: staleTimestamp,
    reason,
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  }];
  return { proposalId: proposal.proposalId, decisionId };
}

async function changedSourceFixture(
  fixture: Awaited<ReturnType<typeof ttiFixture>>,
  sourceKey: string
): Promise<Awaited<ReturnType<typeof ttiFixture>>> {
  const sources = fixture.sources.map((source) =>
    source.sourceKey === sourceKey ? { ...source, label: `${source.label} updated` } : source
  );
  const proposals = withUpdatedSourceEvidenceInputs(fixture.proposals, sources);
  return recomputeFixture(sources, proposals);
}

function applyRuleChangedPostD(
  planning: ProjectPlanningState,
  generatedProposal: PlanningClarificationProposalBlueprint,
  oldRuleVersion: string,
  sourceAvailability: PlanningSourceReference["availability"] = "stale"
): string {
  const newProjectRuleSourceKey = generatedProposal.sourceKeys.find((sourceKey) => sourceKey.startsWith("projectRule|"))!;
  const projectRuleSource = planning.sources.find((source) => existingSourceKey(source) === newProjectRuleSourceKey)!;
  planning.sources = planning.sources.map((source) =>
    source.sourceId === projectRuleSource.sourceId ? { ...source, availability: sourceAvailability, version: oldRuleVersion } : source
  );
  planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
    ...proposal,
    ruleVersion: oldRuleVersion,
    fingerprint: fingerprint(90)
  } : proposal);
  return projectRuleSource.sourceId;
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

async function recomputeFixture(
  sources: readonly PlanningClarificationSourceBlueprint[],
  proposals: readonly PlanningClarificationProposalBlueprint[]
): Promise<Awaited<ReturnType<typeof ttiFixture>>> {
  const fingerprintResult = await generatePlanningClarificationFingerprints({ projectId, sources, proposals });
  expect(fingerprintResult.issues).toEqual([]);
  return {
    sources: clone(sources) as PlanningClarificationSourceBlueprint[],
    proposals: clone(proposals) as PlanningClarificationProposalBlueprint[],
    fingerprints: clone(fingerprintResult.fingerprints) as PlanningClarificationFingerprintRecord[]
  };
}

function fixtureForProposalIndexes(
  fixture: Awaited<ReturnType<typeof ttiFixture>>,
  indexes: readonly number[]
): Awaited<ReturnType<typeof ttiFixture>> {
  const proposals = indexes.map((index) => fixture.proposals[index]);
  const proposalKeySet = new Set(proposals.map((proposal) => proposal.proposalKey));
  const sourceKeys = new Set(proposals.flatMap((proposal) => proposal.sourceKeys));
  return {
    sources: fixture.sources.filter((source) => sourceKeys.has(source.sourceKey)),
    proposals,
    fingerprints: fixture.fingerprints.filter((record) => proposalKeySet.has(record.proposalKey))
  };
}

function inputFor(fixture: Awaited<ReturnType<typeof ttiFixture>>) {
  return {
    sources: fixture.sources,
    proposals: fixture.proposals,
    fingerprints: fixture.fingerprints
  };
}

async function prepareReady(
  planning: ProjectPlanningState,
  fixture: Awaited<ReturnType<typeof ttiFixture>>
): Promise<Extract<PlanningClarificationReplacementMaterializationPreparation, { kind: "ready" }>> {
  const preparation = await preparePlanningClarificationReplacementMaterialization(projectId, planning, inputFor(fixture));
  expect(preparation.kind).toBe("ready");
  return preparation as Extract<PlanningClarificationReplacementMaterializationPreparation, { kind: "ready" }>;
}

function runtime(ids: readonly string[], calls = { now: 0, uuid: 0 }): PlanningClarificationReplacementRepositoryRuntime {
  let index = 0;
  return {
    now: () => {
      calls.now += 1;
      return materializedAt;
    },
    uuid: () => {
      calls.uuid += 1;
      return ids[index++] ?? "";
    }
  };
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

function newSourceUuid(index: number): string {
  return `75000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function newProposalUuid(index: number): string {
  return `76000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function newDecisionUuid(index: number): string {
  return `77000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
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

describe("planning clarification replacement materialization", () => {
  it("keeps exact current planning unchanged without clock, UUID, or persistence candidate", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const calls = { now: 0, uuid: 0 };

    const preparation = await preparePlanningClarificationReplacementMaterialization(projectId, planning, inputFor(fixture));

    expect(preparation).toMatchObject({
      kind: "unchanged",
      result: { outcome: "unchanged", createdSources: [], createdProposals: [], issues: [] }
    });
    expect(calls).toEqual({ now: 0, uuid: 0 });
  });

  it("atomically materializes sourceChanged replacements and supersedes stale predecessors", async () => {
    const fixture = await ttiFixture();
    const scoped = fixtureForProposalIndexes(fixture, [0]);
    const planning = exactPlanning(scoped);
    const sourceKey = proposalSourceKey(scoped, 0, "readinessPrerequisite|");
    const staleSourceId = markSourceStale(planning, sourceKey);
    const staleProposal = markProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await changedSourceFixture(scoped, sourceKey);
    const preparation = await prepareReady(planning, changedFixture);
    const originalMarkStaleDecision = clone(planning.decisions[0]);

    const finalized = await finalizePlanningClarificationReplacementMaterialization(preparation, runtime([
      newSourceUuid(1),
      newProposalUuid(1),
      newDecisionUuid(1)
    ]));

    expect(finalized.result).toEqual({
      outcome: "persisted",
      projectId,
      createdSources: [{ semanticKey: sourceKey, persistedId: newSourceUuid(1) }],
      createdProposals: [{
        semanticKey: changedFixture.proposals[0].proposalKey,
        persistedId: newProposalUuid(1),
        predecessorProposalId: staleProposal.proposalId,
        supersedeDecisionId: newDecisionUuid(1)
      }],
      issues: []
    });
    expect(finalized.materializedAt).toBe(materializedAt);
    expect(finalized.planning?.sources.find((source) => source.sourceId === staleSourceId)).toMatchObject({ availability: "stale", observedAt: timestamp });
    expect(finalized.planning?.sources.find((source) => source.sourceId === newSourceUuid(1))).toMatchObject({
      availability: "current",
      observedAt: materializedAt,
      label: `${scoped.sources.find((source) => source.sourceKey === sourceKey)!.label} updated`
    });
    const predecessor = finalized.planning!.proposals.find((proposal) => proposal.proposalId === staleProposal.proposalId)!;
    expect(predecessor).toMatchObject({
      status: "Superseded",
      supersededByProposalId: newProposalUuid(1),
      updatedAt: materializedAt,
      lastDecisionId: newDecisionUuid(1)
    });
    expect(predecessor.staleReason).toBeUndefined();
    expect(predecessor.staleAt).toBeUndefined();
    expect(finalized.planning?.decisions[0]).toEqual(originalMarkStaleDecision);
    expect(finalized.planning?.decisions[1]).toEqual({
      decisionId: newDecisionUuid(1),
      proposalId: staleProposal.proposalId,
      projectId,
      action: "supersede",
      previousStatus: "Stale",
      resultingStatus: "Superseded",
      origin: "deterministicRule",
      recordedAt: materializedAt,
      ruleSetVersion: PLANNING_RULE_SET_VERSION
    });
    const successor = finalized.planning!.proposals.find((proposal) => proposal.proposalId === newProposalUuid(1))!;
    expect(successor.status).toBe("Needs Clarification");
    expect(successor.fingerprint).toBe(changedFixture.fingerprints[0].fingerprint);
    expect(successor.sourceIds).toEqual([sourceIdForKey(finalized.planning!, changedFixture.proposals[0].sourceKeys[0]), newSourceUuid(1)]);
    expect(normalizeProjectPlanningState(finalized.planning, projectId).issues).toEqual([]);
    await expect(analyzePlanningClarificationReplacements({
      projectId,
      existingPlanning: finalized.planning!,
      sources: changedFixture.sources,
      proposals: changedFixture.proposals,
      fingerprints: changedFixture.fingerprints
    })).resolves.toMatchObject({ outcome: "unchanged", issues: [] });
  });

  it("materializes ruleChanged replacements with deleted historical rule sources", async () => {
    const fixture = await ttiFixture();
    const generated = fixtureForProposalIndexes(fixture, [0]);
    const planning = exactPlanning(generated);
    const staleSourceId = applyRuleChangedPostD(planning, generated.proposals[0], "0.9.0", "deleted");
    const staleProposal = markProposalStale(planning, 0, "ruleChanged");

    const finalized = await finalizePlanningClarificationReplacementMaterialization(await prepareReady(planning, generated), runtime([
      newSourceUuid(2),
      newProposalUuid(2),
      newDecisionUuid(2)
    ]));

    expect(finalized.result.outcome).toBe("persisted");
    expect(finalized.result.createdSources).toEqual([{ semanticKey: generated.proposals[0].sourceKeys[0], persistedId: newSourceUuid(2) }]);
    expect(finalized.planning?.sources.find((source) => source.sourceId === staleSourceId)).toMatchObject({ availability: "deleted", version: "0.9.0" });
    expect(finalized.planning?.proposals.find((proposal) => proposal.proposalId === staleProposal.proposalId)).toMatchObject({
      status: "Superseded",
      supersededByProposalId: newProposalUuid(2)
    });
  });

  it("materializes applicabilityChanged replacements by reusing exact current sources in blueprint order", async () => {
    const fixture = await ttiFixture();
    const changedFixture = fixtureForProposalIndexes(fixture, [0]);
    const planning = exactPlanning(changedFixture);
    const staleProposal = markProposalStale(planning, 0, "applicabilityChanged", {
      applicableDomains: [],
      fingerprint: fingerprint(91)
    });
    const reversedInput = {
      sources: [...changedFixture.sources].reverse(),
      proposals: changedFixture.proposals,
      fingerprints: changedFixture.fingerprints
    };

    const preparation = await preparePlanningClarificationReplacementMaterialization(projectId, planning, reversedInput);
    expect(preparation.kind).toBe("ready");
    const finalized = await finalizePlanningClarificationReplacementMaterialization(preparation as Extract<PlanningClarificationReplacementMaterializationPreparation, { kind: "ready" }>, runtime([
      newProposalUuid(3),
      newDecisionUuid(3)
    ]));

    expect(finalized.result.createdSources).toEqual([]);
    expect(finalized.result.createdProposals[0]).toMatchObject({
      persistedId: newProposalUuid(3),
      predecessorProposalId: staleProposal.proposalId,
      supersedeDecisionId: newDecisionUuid(3)
    });
    expect(finalized.planning?.proposals.find((proposal) => proposal.proposalId === newProposalUuid(3))?.sourceIds).toEqual(
      changedFixture.proposals[0].sourceKeys.map((sourceKey) => sourceIdForKey(planning, sourceKey))
    );
  });

  it("materializes multiple replacements with one timestamp and deterministic UUID ordering", async () => {
    const fixture = await ttiFixture();
    const scoped = fixtureForProposalIndexes(fixture, [0, 1]);
    const planning = exactPlanning(scoped);
    const firstSourceKey = proposalSourceKey(scoped, 1, "readinessPrerequisite|");
    const secondSourceKey = proposalSourceKey(scoped, 0, "readinessPrerequisite|");
    markSourceStale(planning, firstSourceKey);
    markProposalStale(planning, 1, "sourceChanged");
    markSourceStale(planning, secondSourceKey);
    markProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await changedSourceFixture(scoped, firstSourceKey);
    const changedAgain = await changedSourceFixture(changedFixture, secondSourceKey);
    const calls = { now: 0, uuid: 0 };

    const finalized = await finalizePlanningClarificationReplacementMaterialization(await prepareReady(planning, changedAgain), runtime([
      newSourceUuid(10),
      newSourceUuid(11),
      newProposalUuid(10),
      newProposalUuid(11),
      newDecisionUuid(10),
      newDecisionUuid(11)
    ], calls));

    expect(calls).toEqual({ now: 1, uuid: 6 });
    expect(finalized.result.createdSources.map((source) => source.semanticKey)).toEqual([...finalized.result.createdSources.map((source) => source.semanticKey)].sort());
    expect(finalized.result.createdProposals.map((proposal) => proposal.semanticKey)).toEqual([...finalized.result.createdProposals.map((proposal) => proposal.semanticKey)].sort());
    expect(new Set(finalized.planning?.proposals.map((proposal) => proposal.updatedAt))).toContain(materializedAt);
  });

  it("excludes unrelated new proposals and sources from mixed replacement inputs", async () => {
    const fixture = await ttiFixture();
    const scoped = fixtureForProposalIndexes(fixture, [0]);
    const planning = exactPlanning(scoped);
    const sourceKey = proposalSourceKey(scoped, 0, "readinessPrerequisite|");
    markSourceStale(planning, sourceKey);
    markProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await changedSourceFixture(fixture, sourceKey);

    const finalized = await finalizePlanningClarificationReplacementMaterialization(await prepareReady(planning, changedFixture), runtime([
      newSourceUuid(20),
      newProposalUuid(20),
      newDecisionUuid(20)
    ]));

    expect(finalized.result.createdProposals).toHaveLength(1);
    expect(finalized.planning?.proposals).toHaveLength(2);
    expect(finalized.planning?.proposals.some((proposal) => proposal.ruleId === fixture.proposals[1].ruleId)).toBe(false);
  });

  it("blocks E failures, pre-linked predecessors, and partial replacement ambiguity without runtime use", async () => {
    const fixture = await ttiFixture();
    const scoped = fixtureForProposalIndexes(fixture, [0]);
    const planning = exactPlanning(scoped);
    const sourceKey = proposalSourceKey(scoped, 0, "readinessPrerequisite|");
    markSourceStale(planning, sourceKey);
    markProposalStale(planning, 0, "sourceChanged");
    planning.proposals = [...planning.proposals, { ...planning.proposals[0], proposalId: proposalUuid(99), status: "Needs Clarification", staleReason: undefined, staleAt: undefined, lastDecisionId: undefined }];
    const changedFixture = await changedSourceFixture(scoped, sourceKey);

    const blocked = await preparePlanningClarificationReplacementMaterialization(projectId, planning, inputFor(changedFixture));
    expect(blocked).toMatchObject({
      kind: "blocked",
      result: { issues: [expect.objectContaining({ code: "replacementAnalysisBlocked" })] }
    });

    const linkedPlanning = exactPlanning(scoped);
    markSourceStale(linkedPlanning, sourceKey);
    markProposalStale(linkedPlanning, 0, "sourceChanged", { supersededByProposalId: proposalUuid(88) });
    const linked = await preparePlanningClarificationReplacementMaterialization(projectId, linkedPlanning, inputFor(changedFixture));
    expect(linked).toMatchObject({
      kind: "blocked",
      result: { issues: [expect.objectContaining({ code: "predecessorAlreadyLinked" })] }
    });
  });

  it("validates timestamp before UUIDs and blocks unavailable, malformed, and duplicate UUIDs", async () => {
    const fixture = await ttiFixture();
    const scoped = fixtureForProposalIndexes(fixture, [0]);
    const planning = exactPlanning(scoped);
    const sourceKey = proposalSourceKey(scoped, 0, "readinessPrerequisite|");
    markSourceStale(planning, sourceKey);
    markProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await changedSourceFixture(scoped, sourceKey);
    const preparation = await prepareReady(planning, changedFixture);
    const calls = { now: 0, uuid: 0 };

    const badTimestamp = await finalizePlanningClarificationReplacementMaterialization(preparation, {
      now: () => {
        calls.now += 1;
        return "2026-07-22";
      },
      uuid: () => {
        calls.uuid += 1;
        return newSourceUuid(1);
      }
    });
    expect(badTimestamp.result.issues[0].code).toBe("invalidMaterializationTimestamp");
    expect(calls).toEqual({ now: 1, uuid: 0 });
    vi.stubGlobal("crypto", undefined);
    await expect(finalizePlanningClarificationReplacementMaterialization(preparation, { now: () => materializedAt })).resolves.toMatchObject({ result: { issues: [expect.objectContaining({ code: "uuidUnavailable" })] } });
    vi.stubGlobal("crypto", webcrypto);
    await expect(finalizePlanningClarificationReplacementMaterialization(preparation, { now: () => materializedAt, uuid: () => "NOT-A-UUID" })).resolves.toMatchObject({ result: { issues: [expect.objectContaining({ code: "invalidGeneratedUuid" })] } });
    await expect(finalizePlanningClarificationReplacementMaterialization(preparation, { now: () => materializedAt, uuid: () => sourceIdForKey(planning, sourceKey) })).resolves.toMatchObject({ result: { issues: [expect.objectContaining({ code: "duplicateGeneratedUuid" })] } });
    await expect(finalizePlanningClarificationReplacementMaterialization(preparation, runtime([
      newSourceUuid(1),
      newSourceUuid(1)
    ]))).resolves.toMatchObject({ result: { issues: [expect.objectContaining({ code: "duplicateGeneratedUuid" })] } });
  });

  it("keeps caller-owned input immutable and returns defensive result copies", async () => {
    const fixture = await ttiFixture();
    const scoped = fixtureForProposalIndexes(fixture, [0]);
    const planning = exactPlanning(scoped);
    const sourceKey = proposalSourceKey(scoped, 0, "readinessPrerequisite|");
    markSourceStale(planning, sourceKey);
    markProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await changedSourceFixture(scoped, sourceKey);
    const snapshots = [planning, changedFixture.sources, changedFixture.proposals, changedFixture.fingerprints].map((entry) => JSON.stringify(entry));

    await finalizePlanningClarificationReplacementMaterialization(await prepareReady(planning, changedFixture), runtime([
      newSourceUuid(30),
      newProposalUuid(30),
      newDecisionUuid(30)
    ]));

    expect([planning, changedFixture.sources, changedFixture.proposals, changedFixture.fingerprints].map((entry) => JSON.stringify(entry))).toEqual(snapshots);
  });

  it("preserves TTI blockers and keeps replacement successors out of readiness and output eligibility", async () => {
    const fixture = await ttiFixture();
    const scoped = fixtureForProposalIndexes(fixture, [0]);
    const planning = exactPlanning(scoped);
    const sourceKey = proposalSourceKey(scoped, 0, "readinessPrerequisite|");
    markSourceStale(planning, sourceKey);
    markProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await changedSourceFixture(scoped, sourceKey);

    const finalized = await finalizePlanningClarificationReplacementMaterialization(await prepareReady(planning, changedFixture), runtime([
      newSourceUuid(40),
      newProposalUuid(40),
      newDecisionUuid(40)
    ]));

    const successor = finalized.planning!.proposals.find((proposal) => proposal.proposalId === newProposalUuid(40))!;
    expect(successor.status).toBe("Needs Clarification");
    expect(isPlanningStatusReadinessEligible(successor.status)).toBe(false);
    expect(isPlanningStatusOutputEligible(successor.status)).toBe(false);
    expect(successor.value).toMatchObject({ kind: "clarification" });
    expect(JSON.stringify(finalized.planning)).not.toMatch(/internal name|Power Fx|\.pa\.yaml/i);
  });
});
