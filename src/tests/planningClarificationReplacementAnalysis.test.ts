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
import { analyzePlanningClarificationReplacements } from "../lib/planningClarificationReplacementAnalysis";
import {
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  createEmptyProjectPlanningState,
  type PlanningDecisionRecord,
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

function proposalSourceKey(fixture: Awaited<ReturnType<typeof ttiFixture>>, proposalIndex: number, prefix: string): string {
  return fixture.proposals[proposalIndex].sourceKeys.find((sourceKey) => sourceKey.startsWith(prefix))!;
}

function sourceIdForKey(planning: ProjectPlanningState, sourceKey: string): string {
  return planning.sources.find((source) => existingSourceKey(source) === sourceKey)!.sourceId;
}

function markSourceStale(planning: ProjectPlanningState, sourceKey: string): string {
  const sourceId = sourceIdForKey(planning, sourceKey);
  planning.sources = planning.sources.map((source) =>
    source.sourceId === sourceId ? { ...source, availability: "stale" } : source
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
  const staleProposal = {
    ...proposal,
    ...options,
    status: "Stale" as const,
    staleReason: reason,
    staleAt: staleTimestamp,
    updatedAt: staleTimestamp,
    lastDecisionId: decisionId
  };
  const decision: PlanningDecisionRecord = {
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
  };
  planning.proposals = planning.proposals.map((entry, index) => index === proposalIndex ? staleProposal : entry);
  planning.decisions = [...planning.decisions, decision];
  return { proposalId: proposal.proposalId, decisionId };
}

function attachUserAnswer(
  planning: ProjectPlanningState,
  proposalIndex: number,
  index: number,
  authority: Extract<PlanningSourceReference["authority"], "informational" | "confirmed">,
  availability: PlanningSourceReference["availability"] = "current"
): PlanningSourceReference {
  const proposal = planning.proposals[proposalIndex];
  const source: PlanningSourceReference = {
    sourceId: uuid(index),
    sourceType: "userAnswer",
    locator: `planning:userAnswer:${proposal.proposalId}:${decisionUuid(index)}`,
    label: "User answer",
    authority,
    availability,
    observedAt: timestamp
  };
  planning.sources = [...planning.sources, source];
  planning.proposals = planning.proposals.map((entry, entryIndex) => entryIndex === proposalIndex ? {
    ...entry,
    sourceIds: [...entry.sourceIds, source.sourceId]
  } : entry);
  return source;
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

function applyRuleChangedPostD(
  planning: ProjectPlanningState,
  generatedProposal: PlanningClarificationProposalBlueprint,
  oldRuleVersion: string,
  sourceAvailability: PlanningSourceReference["availability"] = "stale"
): { oldProjectRuleSourceKey: string; newProjectRuleSourceKey: string; staleSourceId: string } {
  const newProjectRuleSourceKey = generatedProposal.sourceKeys.find((sourceKey) => sourceKey.startsWith("projectRule|"))!;
  const projectRuleSource = planning.sources.find((source) => existingSourceKey(source) === newProjectRuleSourceKey)!;
  planning.sources = planning.sources.map((source) =>
    source.sourceId === projectRuleSource.sourceId ? {
      ...source,
      availability: sourceAvailability,
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
    staleSourceId: projectRuleSource.sourceId
  };
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
    fingerprints: fixture.fingerprints.filter((fingerprintRecord) => proposalKeySet.has(fingerprintRecord.proposalKey))
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

function fingerprint(index: number): string {
  return `${index.toString(16).padStart(2, "0")}`.repeat(32);
}

function humanAnswerValue(): PlanningProposalRecord["value"] {
  return {
    kind: "structuredRecord",
    value: {
      answer: { kind: "text", value: "Human-approved answer" }
    }
  };
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

describe("planning clarification replacement analysis", () => {
  it("A keeps exact current TTI planning unchanged", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);

    const result = await analyzePlanningClarificationReplacements(inputFor(fixture, planning));

    expect(result).toMatchObject({
      projectId,
      outcome: "unchanged",
      proposalReplacements: [],
      sourceReplacements: [],
      issues: []
    });
  });

  it("B pairs sourceChanged with current informational human provenance", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    const staleSourceId = markSourceStale(planning, sourceKey);
    const userAnswerSource = attachUserAnswer(planning, 0, 90, "informational");
    const staleProposal = markProposalStale(planning, 0, "sourceChanged", { value: humanAnswerValue() });
    const changedFixture = await changedSourceFixture(fixture, sourceKey);

    const result = await analyzePlanningClarificationReplacements(inputFor(changedFixture, planning));

    expect(result.outcome).toBe("replacementRequired");
    expect(result.proposalReplacements).toEqual([{
      proposalKey: fixture.proposals[0].proposalKey,
      staleProposalId: staleProposal.proposalId,
      staleReason: "sourceChanged",
      existingFingerprint: fixture.fingerprints[0].fingerprint,
      generatedFingerprint: changedFixture.fingerprints[0].fingerprint,
      replacementSourceKeys: [sourceKey]
    }]);
    expect(result.sourceReplacements).toEqual([{
      sourceKey,
      staleSourceId,
      replacementSourceKey: sourceKey,
      cause: "sourceChanged"
    }]);
    expect(result.issues).toEqual([]);
    expect(result.sourceReplacements.some((entry) => entry.staleSourceId === userAnswerSource.sourceId)).toBe(false);
  });

  it("C and D pair ruleChanged post-D topology with old historical project-rule source", async () => {
    const fixture = await ttiFixture();
    for (const sourceAvailability of ["stale", "deleted"] as const) {
      const planning = exactPlanning(fixture);
      const rollover = applyRuleChangedPostD(planning, fixture.proposals[0], `phase-5c.old-${sourceAvailability}-rule-version`, sourceAvailability);
      const userAnswerSource = attachUserAnswer(
        planning,
        0,
        sourceAvailability === "stale" ? 91 : 92,
        sourceAvailability === "stale" ? "confirmed" : "informational",
        sourceAvailability === "stale" ? "current" : "stale"
      );
      const staleProposal = markProposalStale(planning, 0, "ruleChanged", { value: humanAnswerValue() });

      const result = await analyzePlanningClarificationReplacements(inputFor(fixture, planning));

      expect(result.outcome).toBe("replacementRequired");
      expect(result.proposalReplacements).toEqual([expect.objectContaining({
        proposalKey: fixture.proposals[0].proposalKey,
        staleProposalId: staleProposal.proposalId,
        staleReason: "ruleChanged",
        replacementSourceKeys: [rollover.newProjectRuleSourceKey]
      })]);
      expect(result.sourceReplacements).toEqual([{
        sourceKey: rollover.oldProjectRuleSourceKey,
        staleSourceId: rollover.staleSourceId,
        replacementSourceKey: rollover.newProjectRuleSourceKey,
        cause: "ruleChanged"
      }]);
      expect(result.sourceReplacements.some((entry) => entry.staleSourceId === userAnswerSource.sourceId)).toBe(false);
    }
  });

  it("E pairs applicabilityChanged with stale historical human provenance without source replacements", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const userAnswerSource = attachUserAnswer(planning, 0, 93, "informational", "stale");
    const staleProposal = markProposalStale(planning, 0, "applicabilityChanged", {
      applicableDomains: ["security"],
      value: humanAnswerValue(),
      fingerprint: fingerprint(44)
    });

    const result = await analyzePlanningClarificationReplacements(inputFor(fixture, planning));

    expect(result.outcome).toBe("replacementRequired");
    expect(result.proposalReplacements).toEqual([expect.objectContaining({
      proposalKey: fixture.proposals[0].proposalKey,
      staleProposalId: staleProposal.proposalId,
      staleReason: "applicabilityChanged",
      replacementSourceKeys: []
    })]);
    expect(result.sourceReplacements).toEqual([]);
    expect(planning.sources.find((source) => source.sourceId === userAnswerSource.sourceId)).toEqual(userAnswerSource);
  });

  it("E.1 keeps unrelated value differences blocked without user-answer provenance", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    markProposalStale(planning, 0, "applicabilityChanged", {
      applicableDomains: ["security"],
      value: humanAnswerValue(),
      fingerprint: fingerprint(47)
    });

    const result = await analyzePlanningClarificationReplacements(inputFor(fixture, planning));

    expect(result.outcome).toBe("blocked");
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "replacementCauseMismatch",
      field: "value"
    }));
  });

  it("F blocks stale proposals that no longer have a generated replacement", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    for (const sourceKey of fixture.proposals[0].sourceKeys) {
      markSourceStale(planning, sourceKey);
    }
    markProposalStale(planning, 0, "applicabilityChanged", { applicableDomains: ["security"], fingerprint: fingerprint(10) });
    const reducedProposals = fixture.proposals.slice(1);
    const reducedKeys = new Set(reducedProposals.flatMap((proposal) => proposal.sourceKeys));

    const result = await analyzePlanningClarificationReplacements({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources.filter((source) => reducedKeys.has(source.sourceKey)),
      proposals: reducedProposals,
      fingerprints: fixture.fingerprints.slice(1)
    });

    expect(result.outcome).toBe("blocked");
    expect(result.proposalReplacements).toEqual([]);
    expect(result.sourceReplacements).toEqual([]);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "staleProposalNoReplacement",
      proposalKey: fixture.proposals[0].proposalKey
    }));
  });

  it("G blocks stale proposals that exact-match current generation", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    markProposalStale(planning, 0, "applicabilityChanged");

    const result = await analyzePlanningClarificationReplacements(inputFor(fixture, planning));

    expect(result.outcome).toBe("blocked");
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "staleProposalMatchesCurrentGeneration",
      proposalKey: fixture.proposals[0].proposalKey
    }));
  });

  it.each([
    { label: "missing lastDecisionId", mutate: (proposal: PlanningProposalRecord) => ({ ...proposal, lastDecisionId: undefined }) },
    { label: "wrong decision action", mutateDecision: (decision: PlanningDecisionRecord) => ({ ...decision, action: "confirm" as const }) },
    { label: "wrong decision reason", mutateDecision: (decision: PlanningDecisionRecord) => ({ ...decision, reason: "ruleChanged" }) },
    { label: "wrong recordedAt", mutateDecision: (decision: PlanningDecisionRecord) => ({ ...decision, recordedAt: "2026-07-22T13:00:01.000Z" }) },
    { label: "wrong proposalId", mutateDecision: (decision: PlanningDecisionRecord) => ({ ...decision, proposalId: proposalUuid(99) }) }
  ])("H blocks incoherent markStale history: $label", async ({ mutate, mutateDecision }) => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    markProposalStale(planning, 0, "applicabilityChanged", { applicableDomains: ["security"], fingerprint: fingerprint(12) });
    if (mutate) {
      planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? mutate(proposal) : proposal);
    }
    if (mutateDecision) {
      planning.decisions = planning.decisions.map((decision) => mutateDecision(decision));
    }

    const result = await analyzePlanningClarificationReplacements(inputFor(fixture, planning));

    expect(result.outcome).toBe("blocked");
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: mutateDecision ? expect.stringMatching(/invalidStaleHistory|invalidExistingPlanning/) : "invalidStaleHistory"
    }));
  });

  it("I blocks unsupported stale reasons without inventing semantics", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    markProposalStale(planning, 0, "targetChanged");

    const result = await analyzePlanningClarificationReplacements(inputFor(fixture, planning));

    expect(result.outcome).toBe("blocked");
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "unsupportedReplacementReason",
      proposalKey: fixture.proposals[0].proposalKey
    }));
  });

  it("J and K block sourceChanged when content or source topology also changes", async () => {
    const fixture = await ttiFixture();
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    const changedFixture = await changedSourceFixture(fixture, sourceKey);
    const contentPlanning = exactPlanning(fixture);
    markSourceStale(contentPlanning, sourceKey);
    markProposalStale(contentPlanning, 0, "sourceChanged", { recommendation: "Changed content.", fingerprint: fingerprint(15) });
    const contentResult = await analyzePlanningClarificationReplacements(inputFor(changedFixture, contentPlanning));
    expect(contentResult.outcome).toBe("blocked");
    expect(contentResult.issues).toContainEqual(expect.objectContaining({ code: "replacementCauseMismatch" }));

    const sourcePlanning = exactPlanning(fixture);
    markSourceStale(sourcePlanning, sourceKey);
    markProposalStale(sourcePlanning, 0, "sourceChanged");
    const substitutedFixture = {
      sources: changedFixture.sources.filter((source) => source.sourceKey !== sourceKey),
      proposals: changedFixture.proposals.map((proposal, index) => index === 0 ? {
        ...proposal,
        sourceKeys: proposal.sourceKeys.filter((entry) => entry !== sourceKey)
      } : proposal),
      fingerprints: changedFixture.fingerprints
    };
    const sourceResult = await analyzePlanningClarificationReplacements(inputFor(substitutedFixture, sourcePlanning));
    expect(sourceResult.outcome).toBe("blocked");
    expect(sourceResult.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "sourceReconciliationFailed" })
    ]));
  });

  it("L blocks invalid rule rollover shapes", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    applyRuleChangedPostD(planning, fixture.proposals[0], "phase-5c.invalid-rollover");
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      sourceIds: proposal.sourceIds.slice(1)
    } : proposal);
    markProposalStale(planning, 0, "ruleChanged");

    const result = await analyzePlanningClarificationReplacements(inputFor(fixture, planning));

    expect(result.outcome).toBe("blocked");
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "ruleRolloverUnresolved" }));
  });

  it("M blocks applicabilityChanged when source topology also changes", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    markSourceStale(planning, sourceKey);
    markProposalStale(planning, 0, "applicabilityChanged", { applicableDomains: ["security"], fingerprint: fingerprint(16) });
    const changedFixture = await changedSourceFixture(fixture, sourceKey);

    const result = await analyzePlanningClarificationReplacements(inputFor(changedFixture, planning));

    expect(result.outcome).toBe("blocked");
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "replacementCauseMismatch" }));
  });

  it("M.1 keeps unsupported non-user-answer and unresolved source IDs fail closed", async () => {
    const fixture = await ttiFixture();
    const unsupportedPlanning = exactPlanning(fixture);
    const unsupportedSource: PlanningSourceReference = {
      sourceId: uuid(94),
      sourceType: "approvedDocument",
      locator: "approved-document:unexpected",
      label: "Unexpected approved document",
      authority: "approved",
      availability: "current",
      observedAt: timestamp
    };
    unsupportedPlanning.sources = [...unsupportedPlanning.sources, unsupportedSource];
    unsupportedPlanning.proposals = unsupportedPlanning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      sourceIds: [...proposal.sourceIds, unsupportedSource.sourceId]
    } : proposal);
    markProposalStale(unsupportedPlanning, 0, "applicabilityChanged", {
      applicableDomains: ["security"],
      fingerprint: fingerprint(45)
    });

    const unsupported = await analyzePlanningClarificationReplacements(inputFor(fixture, unsupportedPlanning));

    expect(unsupported.outcome).toBe("blocked");
    expect(unsupported.issues).toContainEqual(expect.objectContaining({
      code: expect.stringMatching(/sourceReconciliationFailed|replacementCauseMismatch/)
    }));

    const unresolvedPlanning = exactPlanning(fixture);
    unresolvedPlanning.proposals = unresolvedPlanning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      sourceIds: [...proposal.sourceIds, uuid(95)]
    } : proposal);
    markProposalStale(unresolvedPlanning, 0, "applicabilityChanged", {
      applicableDomains: ["security"],
      fingerprint: fingerprint(46)
    });

    const unresolved = await analyzePlanningClarificationReplacements(inputFor(fixture, unresolvedPlanning));

    expect(unresolved.outcome).toBe("blocked");
    expect(unresolved.issues).toContainEqual(expect.objectContaining({ code: "invalidExistingPlanning" }));
  });

  it("N and O block non-Stale changed proposal/source states until stale materialization runs first", async () => {
    const fixture = await ttiFixture();
    const proposalPlanning = exactPlanning(fixture);
    proposalPlanning.proposals = proposalPlanning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      applicableDomains: ["security"],
      fingerprint: fingerprint(17)
    } : proposal);
    const proposalResult = await analyzePlanningClarificationReplacements(inputFor(fixture, proposalPlanning));
    expect(proposalResult.outcome).toBe("blocked");
    expect(proposalResult.issues).toContainEqual(expect.objectContaining({ code: "staleTransitionRequiredFirst" }));

    const sourcePlanning = exactPlanning(fixture);
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    sourcePlanning.sources = sourcePlanning.sources.map((source) =>
      existingSourceKey(source) === sourceKey ? { ...source, label: "Prior current source label" } : source
    );
    const sourceResult = await analyzePlanningClarificationReplacements(inputFor(fixture, sourcePlanning));
    expect(sourceResult.outcome).toBe("blocked");
    expect(sourceResult.issues).toContainEqual(expect.objectContaining({ code: "staleTransitionRequiredFirst" }));
  });

  it("P blocks current existing-only source/proposal lifecycles", async () => {
    const fixture = await ttiFixture();
    const sourcePlanning = exactPlanning(fixture);
    sourcePlanning.sources = [...sourcePlanning.sources, {
      ...sourcePlanning.sources[0],
      sourceId: uuid(90),
      locator: "planning-rule:pp.extra.current.confirmation",
      version: "phase-5c.extra-current"
    }];
    sourcePlanning.proposals = sourcePlanning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      status: "Rejected",
      sourceIds: [...proposal.sourceIds, uuid(90)]
    } : proposal);
    const sourceResult = await analyzePlanningClarificationReplacements(inputFor(fixture, sourcePlanning));
    expect(sourceResult.outcome).toBe("blocked");
    expect(sourceResult.issues).toContainEqual(expect.objectContaining({ code: "unresolvedCurrentSourceLifecycle" }));

    const proposalPlanning = exactPlanning(fixture);
    const reducedProposals = fixture.proposals.slice(1);
    const reducedKeys = new Set(reducedProposals.flatMap((proposal) => proposal.sourceKeys));
    const proposalResult = await analyzePlanningClarificationReplacements({
      projectId,
      existingPlanning: proposalPlanning,
      sources: fixture.sources.filter((source) => reducedKeys.has(source.sourceKey)),
      proposals: reducedProposals,
      fingerprints: fixture.fingerprints.slice(1)
    });
    expect(proposalResult.outcome).toBe("blocked");
    expect(proposalResult.issues).toContainEqual(expect.objectContaining({ code: "unresolvedCurrentProposalLifecycle" }));
  });

  it("Q and R ignore unrelated new proposals while returning legitimate replacements", async () => {
    const fixture = await ttiFixture();
    const newOnlyPlanning = exactPlanning(fixtureForProposalIndexes(fixture, [0]));
    const newOnlyResult = await analyzePlanningClarificationReplacements(inputFor(fixture, newOnlyPlanning));
    expect(newOnlyResult.outcome).toBe("unchanged");
    expect(newOnlyResult.proposalReplacements).toEqual([]);

    const mixedPlanning = exactPlanning(fixtureForProposalIndexes(fixture, [0, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    markSourceStale(mixedPlanning, sourceKey);
    markProposalStale(mixedPlanning, 0, "sourceChanged");
    const changedFixture = await changedSourceFixture(fixture, sourceKey);
    const mixedResult = await analyzePlanningClarificationReplacements(inputFor(changedFixture, mixedPlanning));
    expect(mixedResult.outcome).toBe("replacementRequired");
    expect(mixedResult.proposalReplacements).toHaveLength(1);
    expect(mixedResult.proposalReplacements[0].proposalKey).toBe(fixture.proposals[0].proposalKey);
  });

  it("S orders multiple replacement candidates deterministically", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const firstSourceKey = proposalSourceKey(fixture, 1, "readinessPrerequisite|");
    const secondSourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    markSourceStale(planning, firstSourceKey);
    markSourceStale(planning, secondSourceKey);
    markProposalStale(planning, 1, "sourceChanged");
    markProposalStale(planning, 0, "sourceChanged");
    const firstChangedFixture = await changedSourceFixture(fixture, firstSourceKey);
    const changedFixture = await changedSourceFixture(firstChangedFixture, secondSourceKey);

    const result = await analyzePlanningClarificationReplacements({
      projectId,
      existingPlanning: {
        ...planning,
        sources: [...planning.sources].reverse(),
        proposals: [...planning.proposals].reverse(),
        decisions: [...planning.decisions].reverse()
      },
      sources: [...changedFixture.sources].reverse(),
      proposals: [...changedFixture.proposals].reverse(),
      fingerprints: [...changedFixture.fingerprints].reverse()
    });

    expect(result.outcome).toBe("replacementRequired");
    expect(result.proposalReplacements.map((entry) => entry.proposalKey)).toEqual(
      [...result.proposalReplacements.map((entry) => entry.proposalKey)].sort()
    );
    expect(result.sourceReplacements.map((entry) => [entry.replacementSourceKey, entry.staleSourceId])).toEqual(
      [...result.sourceReplacements.map((entry) => [entry.replacementSourceKey, entry.staleSourceId])].sort()
    );
  });

  it("T records that shared stale source replacement is not naturally produced by clarification blueprints", async () => {
    const fixture = await ttiFixture();
    const sourceUsageCounts = new Map<string, number>();
    for (const proposal of fixture.proposals) {
      for (const sourceKey of proposal.sourceKeys) {
        sourceUsageCounts.set(sourceKey, (sourceUsageCounts.get(sourceKey) ?? 0) + 1);
      }
    }

    expect([...sourceUsageCounts.values()].every((count) => count === 1)).toBe(true);
  });

  it("U ignores terminal history without reopening or pairing", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => {
      if (index === 0) return { ...proposal, status: "Rejected" };
      if (index === 1) return { ...proposal, status: "Superseded", supersededByProposalId: proposalUuid(3) };
      return proposal;
    });

    const result = await analyzePlanningClarificationReplacements(inputFor(fixture, planning));

    expect(result.outcome).toBe("unchanged");
    expect(result.proposalReplacements).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("V fails closed on malformed or ambiguous reconciliation input", async () => {
    const fixture = await ttiFixture();
    const malformed = await analyzePlanningClarificationReplacements({
      projectId,
      existingPlanning: { ...exactPlanning(fixture), proposals: [null] } as unknown as ProjectPlanningState,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });
    expect(malformed.outcome).toBe("blocked");
    expect(malformed.proposalReplacements).toEqual([]);
    expect(malformed.sourceReplacements).toEqual([]);
    expect(malformed.issues).toContainEqual(expect.objectContaining({ code: "invalidExistingPlanning" }));

    const ambiguousPlanning = exactPlanning(fixture);
    ambiguousPlanning.sources = [...ambiguousPlanning.sources, { ...ambiguousPlanning.sources[0], sourceId: uuid(99) }];
    const ambiguous = await analyzePlanningClarificationReplacements(inputFor(fixture, ambiguousPlanning));
    expect(ambiguous.outcome).toBe("blocked");
    expect(ambiguous.proposalReplacements).toEqual([]);
    expect(ambiguous.issues).toContainEqual(expect.objectContaining({ code: "sourceReconciliationFailed" }));
  });

  it("W and X are input-order invariant, immutable, and defensively cloned", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const sourceKey = proposalSourceKey(fixture, 0, "readinessPrerequisite|");
    markSourceStale(planning, sourceKey);
    markProposalStale(planning, 0, "sourceChanged");
    const changedFixture = await changedSourceFixture(fixture, sourceKey);
    const beforeFixture = JSON.stringify(changedFixture);
    const beforePlanning = JSON.stringify(planning);

    const forward = await analyzePlanningClarificationReplacements(inputFor(changedFixture, planning));
    const reversed = await analyzePlanningClarificationReplacements({
      projectId,
      existingPlanning: {
        ...planning,
        sources: [...planning.sources].reverse(),
        proposals: [...planning.proposals].reverse()
      },
      sources: [...changedFixture.sources].reverse(),
      proposals: [...changedFixture.proposals].reverse(),
      fingerprints: [...changedFixture.fingerprints].reverse()
    });

    expect(reversed).toEqual(forward);
    expect(JSON.stringify(changedFixture)).toBe(beforeFixture);
    expect(JSON.stringify(planning)).toBe(beforePlanning);
    (forward.proposalReplacements[0].replacementSourceKeys as string[]).push("caller-mutation");
    const fresh = await analyzePlanningClarificationReplacements(inputFor(changedFixture, planning));
    expect(fresh.proposalReplacements[0].replacementSourceKeys).toEqual([sourceKey]);
  });

  it("Y keeps replacement analysis isolated from UUID, time, persistence, decisions, readiness, output, UI, network, and AI", async () => {
    await expect(analyzePlanningClarificationReplacements(null)).resolves.toMatchObject({
      outcome: "blocked",
      issues: [expect.objectContaining({ code: "invalidInput" })]
    });
    const source = readFileSync("src/lib/planningClarificationReplacementAnalysis.ts", "utf8");
    expect(source).not.toMatch(/randomUUID|Math\.random|Date\.now|new Date|localStorage|setItem|getItem|fetch\s*\(|XMLHttpRequest|axios|apiKey|accessToken|telemetry/i);
    expect(source).not.toMatch(/appendDecision|PlanningConflictRecord|PlanningDependencyRecord|readyForCodex|generateProjectPackage|exportProjectPackage|Power Fx|YAML/i);
    expect(source).not.toMatch(/supersededByProposalId:\s|action:\s*["']supersede|status:\s*["']Superseded/);
  });
});
