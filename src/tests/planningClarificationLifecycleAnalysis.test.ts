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
import { analyzePlanningClarificationLifecycleChanges } from "../lib/planningClarificationLifecycleAnalysis";
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

function sourceKeyForBlueprint(source: PlanningClarificationSourceBlueprint): string {
  return source.sourceKey;
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
): { projectRuleSource: PlanningSourceReference; oldProjectRuleSourceKey: string } {
  const currentProjectRuleSourceKey = generatedProposal.sourceKeys.find((sourceKey) => sourceKey.startsWith("projectRule|"))!;
  const projectRuleSource = planning.sources.find((source) => existingSourceKey(source) === currentProjectRuleSourceKey)!;
  planning.sources = planning.sources.map((source) =>
    source.sourceId === projectRuleSource.sourceId ? {
      ...source,
      ...(options.sourceAvailability ? { availability: options.sourceAvailability } : {}),
      version: oldRuleVersion
    } : source
  );
  planning.proposals = planning.proposals.map((proposal) => proposal.proposalId === planning.proposals[0].proposalId ? {
    ...proposal,
    ruleVersion: oldRuleVersion
  } : proposal);
  return {
    projectRuleSource,
    oldProjectRuleSourceKey: `projectRule|${generatedProposal.ruleId}|${oldRuleVersion}`
  };
}

function uuid(index: number): string {
  return `72000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function proposalUuid(index: number): string {
  return `73000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function fingerprint(index: number): string {
  return `${index.toString(16).padStart(2, "0")}`.repeat(32);
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("planning clarification lifecycle analysis", () => {
  it("reports exact persisted TTI planning as unchanged without issues or stale reasons", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    expect(result.issues).toEqual([]);
    expect(result.sources).toHaveLength(22);
    expect(result.proposals.filter((entry) => entry.proposalReconciliationDisposition !== "historical")).toHaveLength(11);
    expect(result.sources.every((entry) => entry.disposition === "unchanged")).toBe(true);
    expect(result.proposals.every((entry) => entry.disposition === "unchanged")).toBe(true);
    expect(result.sources.some((entry) => entry.staleReason)).toBe(false);
    expect(result.proposals.some((entry) => entry.staleReason)).toBe(false);
  });

  it("maps changed readiness evidence to sourceChanged without mutating planning", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const before = JSON.stringify(planning);
    const changedSourceKey = fixture.sources.find((source) => source.sourceKey.startsWith("readinessPrerequisite|"))!.sourceKey;
    const changedSourceId = planning.sources.find((source) => existingSourceKey(source) === changedSourceKey)!.sourceId;
    planning.sources = planning.sources.map((source) =>
      source.sourceId === changedSourceId ? { ...source, label: "Prior readiness evidence label" } : source
    );

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const source = result.sources.find((entry) => entry.semanticKey === changedSourceKey)!;
    expect(source).toMatchObject({
      persistedId: changedSourceId,
      disposition: "staleRequired",
      staleReason: "sourceChanged",
      changedFields: ["label"]
    });
    expect(result.proposals.some((entry) => entry.proposalReconciliationDisposition === "changedProposal")).toBe(false);
    expect(JSON.stringify(planning)).not.toBe(before);
    expect(JSON.stringify(result).includes("staleAt")).toBe(false);
  });

  it("keeps proposal-only rule-version differences ambiguous without source rollover evidence", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      ruleVersion: "phase-5c.old-rule-version",
      fingerprint: fingerprint(1)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(proposal.disposition).toBe("ambiguous");
    expect(proposal.staleReason).toBeUndefined();
    expect(proposal.changedFields).toContain("ruleVersion");
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "proposalChangeAmbiguous",
      proposalKey: fixture.proposals[0].proposalKey
    }));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "lifecycleCauseUnresolved",
      proposalKey: fixture.proposals[0].proposalKey
    }));
    expect(result.issues).not.toContainEqual(expect.objectContaining({
      code: "multipleLifecycleReasons",
      proposalKey: fixture.proposals[0].proposalKey
    }));
  });

  it("maps realistic project-rule source identity rollover to proposal ruleChanged without fabricated lineage", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const generatedProposal = fixture.proposals[0];
    const oldRuleVersion = "phase-5c.old-rule-version";
    const currentProjectRuleSourceKey = generatedProposal.sourceKeys.find((sourceKey) => sourceKey.startsWith("projectRule|"))!;
    const currentProjectRuleSource = planning.sources.find((source) => existingSourceKey(source) === currentProjectRuleSourceKey)!;
    const oldProjectRuleSourceKey = `projectRule|${generatedProposal.ruleId}|${oldRuleVersion}`;
    const oldProjectRuleSource = {
      ...currentProjectRuleSource,
      version: oldRuleVersion
    };
    planning.sources = planning.sources.map((source) =>
      source.sourceId === currentProjectRuleSource.sourceId ? oldProjectRuleSource : source
    );
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      ruleVersion: oldRuleVersion,
      fingerprint: fingerprint(11)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: oldProjectRuleSourceKey,
      persistedId: oldProjectRuleSource.sourceId,
      disposition: "noLongerGenerated"
    }));
    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: currentProjectRuleSourceKey,
      disposition: "unchanged",
      sourceReconciliationDisposition: "newSource"
    }));
    const proposal = result.proposals.find((entry) => entry.semanticKey === generatedProposal.proposalKey)!;
    expect(proposal.disposition).toBe("staleRequired");
    expect(proposal.staleReason).toBe("ruleChanged");
    expect(proposal.changedFields).toEqual(expect.arrayContaining(["ruleVersion", "sourceIds"]));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "lifecycleCauseUnresolved",
      sourceKey: oldProjectRuleSourceKey
    }));
    expect(result.issues).not.toContainEqual(expect.objectContaining({ code: "multipleLifecycleReasons" }));
    expect(result.issues).not.toContainEqual(expect.objectContaining({
      code: "proposalChangeAmbiguous",
      proposalKey: generatedProposal.proposalKey
    }));
  });

  it("maps non-current old project-rule source identity rollover to proposal ruleChanged", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const generatedProposal = fixture.proposals[0];
    const oldRuleVersion = "phase-5c.non-current-old-rule-version";
    const currentProjectRuleSourceKey = generatedProposal.sourceKeys.find((sourceKey) => sourceKey.startsWith("projectRule|"))!;
    const currentProjectRuleSource = planning.sources.find((source) => existingSourceKey(source) === currentProjectRuleSourceKey)!;
    const oldProjectRuleSourceKey = `projectRule|${generatedProposal.ruleId}|${oldRuleVersion}`;
    planning.sources = planning.sources.map((source) =>
      source.sourceId === currentProjectRuleSource.sourceId ? {
        ...source,
        availability: "stale",
        version: oldRuleVersion
      } : source
    );
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      ruleVersion: oldRuleVersion,
      fingerprint: fingerprint(15)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: oldProjectRuleSourceKey,
      persistedId: currentProjectRuleSource.sourceId,
      disposition: "historical",
      sourceReconciliationDisposition: "nonCurrent"
    }));
    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: currentProjectRuleSourceKey,
      disposition: "unchanged",
      sourceReconciliationDisposition: "newSource"
    }));
    const proposal = result.proposals.find((entry) => entry.semanticKey === generatedProposal.proposalKey)!;
    expect(proposal.disposition).toBe("staleRequired");
    expect(proposal.staleReason).toBe("ruleChanged");
    expect(proposal.changedFields).toEqual(expect.arrayContaining(["ruleVersion", "sourceIds"]));
    expect(result.issues).not.toContainEqual(expect.objectContaining({
      code: "proposalChangeAmbiguous",
      proposalKey: generatedProposal.proposalKey
    }));
  });

  it("rejects unrelated additional project-rule sources during rule-version rollover", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const generatedProposal = fixture.proposals[0];
    const oldRuleVersion = "phase-5c.extra-source-old-rule-version";
    const currentProjectRuleSourceKey = generatedProposal.sourceKeys.find((sourceKey) => sourceKey.startsWith("projectRule|"))!;
    const currentProjectRuleSource = planning.sources.find((source) => existingSourceKey(source) === currentProjectRuleSourceKey)!;
    const extraProjectRuleSource = {
      ...currentProjectRuleSource,
      sourceId: uuid(77),
      locator: "planning-rule:pp.extra.unrelated.confirmation",
      version: "phase-5c.extra-unrelated-rule-version"
    };
    planning.sources = [
      ...planning.sources.map((source) =>
        source.sourceId === currentProjectRuleSource.sourceId ? { ...source, version: oldRuleVersion } : source
      ),
      extraProjectRuleSource
    ];
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      ruleVersion: oldRuleVersion,
      sourceIds: [...proposal.sourceIds, extraProjectRuleSource.sourceId],
      fingerprint: fingerprint(16)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const proposal = result.proposals.find((entry) => entry.semanticKey === generatedProposal.proposalKey)!;
    expect(proposal.disposition).toBe("ambiguous");
    expect(proposal.staleReason).toBeUndefined();
    expect(proposal.changedFields).toEqual(expect.arrayContaining(["ruleVersion", "sourceIds"]));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "proposalChangeAmbiguous",
      proposalKey: generatedProposal.proposalKey
    }));
    expect(result.issues).not.toContainEqual(expect.objectContaining({
      code: "multipleLifecycleReasons",
      proposalKey: generatedProposal.proposalKey
    }));
  });

  it("rejects missing readiness source identity during rule-version rollover", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const generatedProposal = fixture.proposals[0];
    const oldRuleVersion = "phase-5c.missing-readiness-old-rule-version";
    const currentProjectRuleSourceKey = generatedProposal.sourceKeys.find((sourceKey) => sourceKey.startsWith("projectRule|"))!;
    const currentProjectRuleSource = planning.sources.find((source) => existingSourceKey(source) === currentProjectRuleSourceKey)!;
    planning.sources = planning.sources.map((source) =>
      source.sourceId === currentProjectRuleSource.sourceId ? { ...source, version: oldRuleVersion } : source
    );
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      ruleVersion: oldRuleVersion,
      sourceIds: [currentProjectRuleSource.sourceId],
      fingerprint: fingerprint(17)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const proposal = result.proposals.find((entry) => entry.semanticKey === generatedProposal.proposalKey)!;
    expect(proposal.disposition).toBe("ambiguous");
    expect(proposal.staleReason).toBeUndefined();
    expect(proposal.changedFields).toEqual(expect.arrayContaining(["ruleVersion", "sourceIds"]));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "proposalChangeAmbiguous",
      proposalKey: generatedProposal.proposalKey
    }));
  });

  it("fails closed through authoritative normalization for legacy proposal rule-set versions", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      ruleSetVersion: "phase-5c.old-rule-set-version" as PlanningProposalRecord["ruleSetVersion"],
      fingerprint: fingerprint(18)
    } : proposal);
    const before = JSON.stringify(planning);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    expect(result.sources).toEqual([]);
    expect(result.proposals).toEqual([]);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "invalidExistingPlanning",
      sourceIssueCode: "invalidRecord"
    }));
    expect(result.issues).not.toContainEqual(expect.objectContaining({ code: "proposalChangeAmbiguous" }));
    expect(JSON.stringify(planning)).toBe(before);
  });

  it("does not create lifecycle conclusions for legacy rule-set versions with source-set differences", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      ruleSetVersion: "phase-5c.old-rule-set-version" as PlanningProposalRecord["ruleSetVersion"],
      sourceIds: proposal.sourceIds.slice(0, 1),
      fingerprint: fingerprint(19)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    expect(result.sources).toEqual([]);
    expect(result.proposals).toEqual([]);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "invalidExistingPlanning",
      sourceIssueCode: "invalidRecord"
    }));
  });

  it.each([
    {
      label: "rule plus applicability",
      oldRuleVersion: "phase-5c.multi-rule-applicability-version",
      mutate: () => ({ applicableDomains: ["security" as const], fingerprint: fingerprint(20) })
    },
    {
      label: "rule plus content",
      oldRuleVersion: "phase-5c.multi-rule-content-version",
      mutate: () => ({
        recommendation: "Changed recommendation while the rule version also changed.",
        fingerprint: fingerprint(21)
      })
    }
  ] as const)("keeps realistic rollover plus $label changes ambiguous without a stale-reason winner", async ({ oldRuleVersion, mutate }) => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    applyOldRuleSourceRollover(planning, fixture.proposals[0], oldRuleVersion);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      ...mutate()
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(proposal.disposition).toBe("ambiguous");
    expect(proposal.staleReason).toBeUndefined();
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "multipleLifecycleReasons",
      proposalKey: fixture.proposals[0].proposalKey
    }));
  });

  it("keeps realistic rule-version rollover plus applicability change ambiguous", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const generatedProposal = fixture.proposals[0];
    const oldRuleVersion = "phase-5c.rollover-plus-applicability-version";
    const currentProjectRuleSourceKey = generatedProposal.sourceKeys.find((sourceKey) => sourceKey.startsWith("projectRule|"))!;
    const currentProjectRuleSource = planning.sources.find((source) => existingSourceKey(source) === currentProjectRuleSourceKey)!;
    planning.sources = planning.sources.map((source) =>
      source.sourceId === currentProjectRuleSource.sourceId ? { ...source, version: oldRuleVersion } : source
    );
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      ruleVersion: oldRuleVersion,
      applicableDomains: ["security"],
      fingerprint: fingerprint(22)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const proposal = result.proposals.find((entry) => entry.semanticKey === generatedProposal.proposalKey)!;
    expect(proposal.disposition).toBe("ambiguous");
    expect(proposal.staleReason).toBeUndefined();
    expect(proposal.changedFields).toEqual(expect.arrayContaining(["applicableDomains", "ruleVersion", "sourceIds"]));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "multipleLifecycleReasons",
      proposalKey: generatedProposal.proposalKey
    }));
  });

  it("keeps realistic rule-version rollover plus applicability and content changes ambiguous", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const generatedProposal = fixture.proposals[0];
    const oldRuleVersion = "phase-5c.rollover-plus-applicability-content-version";
    applyOldRuleSourceRollover(planning, generatedProposal, oldRuleVersion);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      applicableDomains: ["security"],
      recommendation: "Changed recommendation while rule and applicability also changed.",
      fingerprint: fingerprint(23)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const proposal = result.proposals.find((entry) => entry.semanticKey === generatedProposal.proposalKey)!;
    expect(proposal.disposition).toBe("ambiguous");
    expect(proposal.staleReason).toBeUndefined();
    expect(proposal.changedFields).toEqual(expect.arrayContaining(["applicableDomains", "recommendation", "ruleVersion", "sourceIds"]));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "multipleLifecycleReasons",
      proposalKey: generatedProposal.proposalKey
    }));
  });

  it("ignores Confirmed lifecycle status during realistic valid rule rollover analysis", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const oldRuleVersion = "phase-5c.confirmed-old-rule-version";
    applyOldRuleSourceRollover(planning, fixture.proposals[0], oldRuleVersion);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      status: "Confirmed",
      fingerprint: fingerprint(12)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(proposal.disposition).toBe("staleRequired");
    expect(proposal.staleReason).toBe("ruleChanged");
    expect(proposal.changedFields).toEqual(expect.arrayContaining(["ruleVersion", "sourceIds"]));
    expect(proposal.changedFields).not.toContain("status");
    expect(result.issues).not.toContainEqual(expect.objectContaining({
      code: "proposalChangeAmbiguous",
      proposalKey: fixture.proposals[0].proposalKey
    }));
  });

  it.each([
    {
      label: "applicability change",
      mutate: (proposal: PlanningProposalRecord) => ({
        ...proposal,
        applicableDomains: ["security" as const],
        fingerprint: fingerprint(13)
      }),
      expectedReason: "applicabilityChanged",
      expectedIssue: undefined
    },
    {
      label: "same-version content regeneration",
      mutate: (proposal: PlanningProposalRecord) => ({
        ...proposal,
        recommendation: "Changed confirmed recommendation without a version change.",
        fingerprint: fingerprint(14)
      }),
      expectedReason: "proposalRegenerated",
      expectedIssue: "unversionedRuleContentChange"
    }
  ] as const)("ignores Confirmed lifecycle status during $label analysis", async ({ mutate, expectedReason, expectedIssue }) => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...mutate(proposal),
      status: "Confirmed"
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(proposal.disposition).toBe("staleRequired");
    expect(proposal.staleReason).toBe(expectedReason);
    expect(proposal.changedFields).not.toContain("status");
    expect(proposal.disposition).not.toBe("ambiguous");
    if (expectedIssue) {
      expect(result.issues).toContainEqual(expect.objectContaining({ code: expectedIssue }));
    } else {
      expect(result.issues).toEqual([]);
    }
  });

  it("maps applicability-only proposal changes to applicabilityChanged", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      applicableDomains: ["security"],
      fingerprint: fingerprint(2)
    } : proposal);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(proposal).toMatchObject({
      disposition: "staleRequired",
      staleReason: "applicabilityChanged",
      changedFields: ["applicableDomains"]
    });
    expect(result.issues).toEqual([]);
  });

  it("flags same-version regenerated proposal content and multiple independent reasons", async () => {
    const fixture = await ttiFixture();
    const contentPlanning = exactPlanning(fixture);
    contentPlanning.proposals = contentPlanning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      recommendation: "Changed recommendation without a version change.",
      fingerprint: fingerprint(3)
    } : proposal);
    const contentResult = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: contentPlanning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });
    const regenerated = contentResult.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(regenerated.disposition).toBe("staleRequired");
    expect(regenerated.staleReason).toBe("proposalRegenerated");
    expect(contentResult.issues).toEqual([expect.objectContaining({ code: "unversionedRuleContentChange" })]);

    const mixedPlanning = exactPlanning(fixture);
    mixedPlanning.proposals = mixedPlanning.proposals.map((proposal, index) => index === 0 ? {
      ...proposal,
      recommendation: "Changed recommendation with applicability change.",
      applicableDomains: ["security"],
      fingerprint: fingerprint(4)
    } : proposal);
    const mixedResult = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: mixedPlanning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });
    const mixed = mixedResult.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(mixed.disposition).toBe("ambiguous");
    expect(mixed.staleReason).toBeUndefined();
    expect(mixedResult.issues).toEqual([expect.objectContaining({ code: "multipleLifecycleReasons" })]);
  });

  it("treats fingerprint-only proposal differences from changed source evidence as unresolved ambiguity without multiple reasons", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const changedSourceKey = fixture.proposals[0].sourceKeys.find((sourceKey) => sourceKey.startsWith("readinessPrerequisite|"))!;
    const changedSources = fixture.sources.map((source) => sourceKeyForBlueprint(source) === changedSourceKey
      ? { ...source, label: `${source.label} changed` }
      : source);
    const changedProposals = withUpdatedSourceEvidenceInputs(fixture.proposals, changedSources);
    const changedFixture = await withRecomputedFingerprints(changedSources, changedProposals);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: changedFixture.sources,
      proposals: changedFixture.proposals,
      fingerprints: changedFixture.fingerprints
    });

    expect(result.sources).toContainEqual(expect.objectContaining({
      semanticKey: changedSourceKey,
      disposition: "staleRequired",
      staleReason: "sourceChanged",
      changedFields: ["label"]
    }));
    const proposal = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(proposal.disposition).toBe("ambiguous");
    expect(proposal.staleReason).toBeUndefined();
    expect(proposal.changedFields).toEqual(["fingerprint"]);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "proposalChangeAmbiguous",
      proposalKey: fixture.proposals[0].proposalKey,
      field: "fingerprint"
    }));
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "lifecycleCauseUnresolved",
      proposalKey: fixture.proposals[0].proposalKey
    }));
    expect(result.issues).not.toContainEqual(expect.objectContaining({ code: "multipleLifecycleReasons" }));
  });

  it("reports existing-only records without fabricating replacement lineage and preserves terminal history", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.proposals = planning.proposals.map((proposal, index) => index === 1 ? { ...proposal, status: "Rejected" } : proposal);
    const reducedProposals = fixture.proposals.slice(1);
    const reducedProposalKeys = new Set(reducedProposals.flatMap((proposal) => proposal.sourceKeys));
    const reducedSources = fixture.sources.filter((source) => reducedProposalKeys.has(source.sourceKey));
    const reducedFingerprints = fixture.fingerprints.slice(1);

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: reducedSources,
      proposals: reducedProposals,
      fingerprints: reducedFingerprints
    });

    const existingOnly = result.proposals.find((entry) => entry.semanticKey === fixture.proposals[0].proposalKey)!;
    expect(existingOnly.disposition).toBe("noLongerGenerated");
    expect(existingOnly.staleReason).toBeUndefined();
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "lifecycleCauseUnresolved",
      proposalKey: fixture.proposals[0].proposalKey
    }));

    const historical = result.proposals.find((entry) => entry.persistedId === planning.proposals[1].proposalId)!;
    expect(historical).toMatchObject({
      disposition: "historical",
      proposalReconciliationDisposition: "historical"
    });
  });

  it("propagates malformed and ambiguous reconciliation issues without lifecycle conclusions", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    planning.sources = [...planning.sources, { ...planning.sources[0], sourceId: uuid(99) }];

    const result = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });

    expect(result.sources).toEqual([]);
    expect(result.proposals).toEqual([]);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: "sourceChangeAmbiguous",
      sourceIssueCode: "ambiguousExistingSourceKey"
    }));
  });

  it("is input-order invariant and does not mutate inputs or returned records", async () => {
    const fixture = await ttiFixture();
    const planning = exactPlanning(fixture);
    const beforeFixture = JSON.stringify(fixture);
    const beforePlanning = JSON.stringify(planning);

    const forward = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });
    const reversed = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: [...fixture.sources].reverse(),
      proposals: [...fixture.proposals].reverse(),
      fingerprints: [...fixture.fingerprints].reverse()
    });

    expect(reversed).toEqual(forward);
    expect(JSON.stringify(fixture)).toBe(beforeFixture);
    expect(JSON.stringify(planning)).toBe(beforePlanning);
    const mutable = forward.sources[0].changedFields as string[] | undefined;
    mutable?.push("mutated");
    const fresh = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: planning,
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    });
    expect(fresh).toEqual(forward);
  });

  it("rejects invalid input and keeps UUID, time, storage, UI, readiness, output, and network boundaries absent", async () => {
    await expect(analyzePlanningClarificationLifecycleChanges(null)).resolves.toMatchObject({
      issues: [expect.objectContaining({ code: "invalidInput" })]
    });
    const source = readFileSync("src/lib/planningClarificationLifecycleAnalysis.ts", "utf8");
    expect(source).not.toMatch(/randomUUID|Math\.random|Date\.now|new Date|localStorage|setItem|getItem|fetch\s*\(|XMLHttpRequest|axios|apiKey|accessToken|telemetry/i);
    expect(source).not.toMatch(/markStale|supersededByProposalId:\s|appendDecision|PlanningDecisionRecord|PlanningConflictRecord|readyForCodex|generateProjectPackage|exportProjectPackage|Power Fx|YAML/i);
  });
});
