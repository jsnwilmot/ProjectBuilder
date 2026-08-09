// @ts-expect-error -- Vitest runs this static source isolation assertion in Node; the app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
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
import {
  reconcilePlanningClarifications,
  type PlanningClarificationCurrentReconciliation,
  type PlanningClarificationReconciliationIssueCode
} from "../lib/planningClarificationReconciliation";
import {
  createEmptyProjectPlanningState,
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningProposalStatus,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById, getPlanningRuleRegistry } from "../lib/planningRules";
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

async function ttiFixture(overrides: Partial<{ proposals: PlanningClarificationProposalBlueprint[] }> = {}) {
  const draftResult = generatePlanningClarificationDrafts({
    projectId,
    projectType: "powerAppsCanvas",
    gateResults: ruleIds.map((ruleId) => {
      const targetKey = getPlanningRuleById(ruleId)!.target.targetKey;
      return gate(targetKey, ttiStatuses[targetKey]);
    })
  });
  expect(draftResult.issues).toEqual([]);
  const blueprintResult = generatePlanningClarificationBlueprints({
    projectId,
    drafts: draftResult.drafts
  });
  expect(blueprintResult.issues).toEqual([]);
  const proposals = overrides.proposals ?? clone(blueprintResult.proposals) as PlanningClarificationProposalBlueprint[];
  const sources = clone(blueprintResult.sources) as PlanningClarificationSourceBlueprint[];
  const fingerprintResult = await generatePlanningClarificationFingerprints({ projectId, sources, proposals });
  expect(fingerprintResult.issues).toEqual([]);
  return {
    sources,
    proposals,
    fingerprints: clone(fingerprintResult.fingerprints) as PlanningClarificationFingerprintRecord[]
  };
}

function emptyPlanning(): ProjectPlanningState {
  return createEmptyProjectPlanningState();
}

function planningSource(index: number) {
  return {
    sourceId: uuid(index),
    sourceType: "projectRule",
    locator: `planning-rule:test-${index}`,
    label: `Planning source ${index}`,
    authority: "approved",
    availability: "current",
    version: "1.0.0",
    observedAt: timestamp
  } as const;
}

function proposalRecord(
  proposal: PlanningClarificationProposalBlueprint,
  fingerprint: PlanningClarificationFingerprintRecord,
  index: number,
  status: PlanningProposalStatus = "Needs Clarification",
  overrides: Record<string, unknown> = {}
): ProjectPlanningState["proposals"][number] {
  return {
    proposalId: proposalUuid(index),
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId: proposal.projectId,
    ruleSetId: proposal.ruleSetId,
    ruleSetVersion: proposal.ruleSetVersion,
    ruleId: proposal.ruleId,
    ruleVersion: proposal.ruleVersion,
    fingerprint: fingerprint.fingerprint,
    target: { ...proposal.target },
    category: proposal.category,
    status,
    value: { ...proposal.value },
    title: proposal.title,
    recommendation: proposal.recommendation,
    rationale: proposal.rationale,
    sourceIds: [uuid(1)],
    uncertainty: proposal.uncertainty,
    restriction: proposal.restriction,
    createdAt: timestamp,
    updatedAt: timestamp,
    consequence: proposal.consequence,
    readinessRequirementIds: [...proposal.readinessRequirementIds],
    applicableProjectTypes: [...proposal.applicableProjectTypes],
    applicableDomains: [...proposal.applicableDomains],
    ...(status === "Stale" ? { staleReason: "proposalRegenerated", staleAt: timestamp } : {}),
    ...overrides
  } as ProjectPlanningState["proposals"][number];
}

async function planningWithExactMatches(status: PlanningProposalStatus = "Needs Clarification") {
  const fixture = await ttiFixture();
  return {
    ...emptyPlanning(),
    sources: [planningSource(1)],
    proposals: fixture.proposals.map((proposal, index) =>
      proposalRecord(proposal, fixture.fingerprints[index], index + 1, status)
    )
  };
}

async function reconcile(overrides: Partial<{
  existingPlanning: unknown;
  sources: unknown;
  proposals: unknown;
  fingerprints: unknown;
  id: string;
}> = {}) {
  const fixture = await ttiFixture();
  return reconcilePlanningClarifications({
    projectId: overrides.id ?? projectId,
    existingPlanning: overrides.existingPlanning ?? emptyPlanning(),
    sources: overrides.sources ?? fixture.sources,
    proposals: overrides.proposals ?? fixture.proposals,
    fingerprints: overrides.fingerprints ?? fixture.fingerprints
  });
}

function uuid(index: number): string {
  return `10000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function proposalUuid(index: number): string {
  return `20000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function dispositions(current: readonly PlanningClarificationCurrentReconciliation[]) {
  return current.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.disposition] = (counts[entry.disposition] ?? 0) + 1;
    return counts;
  }, {});
}

async function issueCodes(input: unknown): Promise<PlanningClarificationReconciliationIssueCode[]> {
  return (await reconcilePlanningClarifications(input)).issues.map((entry) => entry.code);
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("planning clarification reconciliation classification", () => {
  it("validates root input, project ID, collection shape, and immutability", async () => {
    await expect(reconcilePlanningClarifications(null)).resolves.toEqual({
      current: [],
      existingOnly: [],
      historical: [],
      issues: [expect.objectContaining({ code: "invalidInput" })]
    });
    await expect(issueCodes({ projectId: "", existingPlanning: {}, sources: [], proposals: [], fingerprints: [] })).resolves.toContain("invalidProjectId");
    await expect(issueCodes({ projectId: "x".repeat(201), existingPlanning: {}, sources: [], proposals: [], fingerprints: [] })).resolves.toContain("invalidProjectId");
    await expect(issueCodes({ projectId: "one\ntwo", existingPlanning: {}, sources: [], proposals: [], fingerprints: [] })).resolves.toContain("invalidProjectId");
    await expect(reconcile({ sources: {} })).resolves.toEqual(expect.objectContaining({ current: [], issues: [expect.objectContaining({ code: "invalidSources" })] }));
    await expect(reconcile({ proposals: {} })).resolves.toEqual(expect.objectContaining({ current: [], issues: [expect.objectContaining({ code: "invalidProposals" })] }));
    await expect(reconcile({ fingerprints: {} })).resolves.toEqual(expect.objectContaining({ current: [], issues: [expect.objectContaining({ code: "invalidFingerprints" })] }));

    const fixture = await ttiFixture();
    const root = {
      projectId,
      existingPlanning: emptyPlanning(),
      sources: fixture.sources,
      proposals: fixture.proposals,
      fingerprints: fixture.fingerprints
    };
    const before = JSON.stringify(root);
    await reconcilePlanningClarifications(root);
    expect(JSON.stringify(root)).toBe(before);
  });

  it("fails closed on existing planning normalization issues", async () => {
    const fixture = await ttiFixture();
    const validPopulated = await planningWithExactMatches();
    expect((await reconcile({ existingPlanning: validPopulated })).issues).toEqual([]);

    const cases = [
      { ...emptyPlanning(), schemaVersion: "wrong" },
      { ...emptyPlanning(), proposals: [null] },
      { ...validPopulated, proposals: [validPopulated.proposals[0], { ...validPopulated.proposals[0] }] },
      { ...validPopulated, proposals: [{ ...validPopulated.proposals[0], sourceIds: [uuid(99)] }] }
    ];
    for (const existingPlanning of cases) {
      const result = await reconcilePlanningClarifications({
        projectId,
        existingPlanning,
        sources: fixture.sources,
        proposals: fixture.proposals,
        fingerprints: fixture.fingerprints
      });
      expect(result.current).toEqual([]);
      expect(result.existingOnly).toEqual([]);
      expect(result.historical).toEqual([]);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "existingPlanningNormalizationIssue" })
      ]));
    }
  });

  it("verifies the supplied generated fingerprint set and fails closed on mismatch", async () => {
    const fixture = await ttiFixture();
    await expect(reconcile({ fingerprints: fixture.fingerprints })).resolves.toMatchObject({ issues: [] });

    const duplicate = [...fixture.fingerprints, clone(fixture.fingerprints[0])];
    expect((await reconcile({ fingerprints: duplicate })).issues).toEqual([
      expect.objectContaining({ code: "duplicateFingerprintProposalKey" })
    ]);

    expect((await reconcile({ fingerprints: fixture.fingerprints.slice(1) })).issues).toEqual([
      expect.objectContaining({ code: "missingFingerprint", proposalKey: fixture.fingerprints[0].proposalKey })
    ]);

    const unexpected = [...fixture.fingerprints, { proposalKey: "clarification|unexpected|gate", fingerprintInput: "{}", fingerprint: "a".repeat(64) }];
    expect((await reconcile({ fingerprints: unexpected })).issues).toEqual([
      expect.objectContaining({ code: "unexpectedFingerprint" })
    ]);

    const inputMismatch = clone(fixture.fingerprints);
    inputMismatch[0].fingerprintInput = "{}";
    expect((await reconcile({ fingerprints: inputMismatch })).issues).toEqual([
      expect.objectContaining({ code: "fingerprintInputMismatch" })
    ]);

    const fingerprintMismatch = clone(fixture.fingerprints);
    fingerprintMismatch[0].fingerprint = "b".repeat(64);
    expect((await reconcile({ fingerprints: fingerprintMismatch })).issues).toEqual([
      expect.objectContaining({ code: "fingerprintMismatch" })
    ]);

    const invalidRecord = clone(fixture.fingerprints);
    invalidRecord[0].fingerprint = "not-a-fingerprint";
    expect((await reconcile({ fingerprints: invalidRecord })).issues).toEqual([
      expect.objectContaining({ code: "invalidFingerprints" })
    ]);

    const badSources = clone(fixture.sources);
    badSources[0].label = "<script>alert(1)</script>";
    const generatedInvalid = await reconcile({ sources: badSources });
    expect(generatedInvalid.current).toEqual([]);
    expect(generatedInvalid.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "generatedPlanningInvalid", sourceIssueCode: "invalidSource" })
    ]));
  });

  it("classifies the TTI empty-planning scenario as new proposals", async () => {
    const result = await reconcile();

    expect(result.issues).toEqual([]);
    expect(result.current).toHaveLength(11);
    expect(dispositions(result.current)).toEqual({ newProposal: 11 });
    expect(result.existingOnly).toEqual([]);
    expect(result.historical).toEqual([]);
    expect(result.current.map((entry) => entry.proposalKey)).toEqual(
      getPlanningRuleRegistry().map((rule) => `clarification|${rule.ruleId}|${rule.target.targetKey}`)
    );
  });

  it("classifies exact current matches and preserves existing UUIDs and statuses", async () => {
    const existingPlanning = await planningWithExactMatches("Confirmed");
    const result = await reconcile({ existingPlanning });

    expect(result.issues).toEqual([]);
    expect(result.current).toHaveLength(11);
    expect(dispositions(result.current)).toEqual({ exactMatch: 11 });
    expect(result.current[0]).toMatchObject({
      disposition: "exactMatch",
      existingProposalId: proposalUuid(1),
      existingStatus: "Confirmed"
    });
  });

  it("classifies changed proposals without stale, supersession, or decision mutation", async () => {
    const fixture = await ttiFixture();
    const existingPlanning = await planningWithExactMatches();
    existingPlanning.proposals[0] = {
      ...existingPlanning.proposals[0],
      fingerprint: "c".repeat(64)
    };
    const before = JSON.stringify(existingPlanning);
    const result = await reconcile({ existingPlanning });

    expect(result.issues).toEqual([]);
    expect(dispositions(result.current)).toEqual({ changedProposal: 1, exactMatch: 10 });
    expect(result.current.find((entry) => entry.proposalKey === fixture.fingerprints[0].proposalKey)).toMatchObject({
      disposition: "changedProposal",
      existingFingerprint: "c".repeat(64)
    });
    expect(JSON.stringify(existingPlanning)).toBe(before);
    expect(JSON.stringify(result)).not.toMatch(/staleReason|supersededByProposalId|decisionId|createdAt|updatedAt/);
  });

  it("reports no-longer-generated existing proposals and ignores unrelated records", async () => {
    const fixture = await ttiFixture();
    const currentProposals = fixture.proposals.slice(1);
    const currentFingerprintResult = await generatePlanningClarificationFingerprints({
      projectId,
      sources: fixture.sources,
      proposals: currentProposals
    });
    expect(currentFingerprintResult.issues).toEqual([]);
    const basePlanning = await planningWithExactMatches();
    const existingPlanning: ProjectPlanningState = {
      ...basePlanning,
      proposals: [
        ...basePlanning.proposals,
        {
      proposalId: proposalUuid(99),
      proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
      projectId,
      ruleSetId: PLANNING_RULE_SET_ID,
      ruleSetVersion: PLANNING_RULE_SET_VERSION,
      ruleId: "unrelated.rule",
      ruleVersion: "1.0.0",
      fingerprint: "d".repeat(64),
      target: { kind: "projectField", domain: "foundation", targetKey: "projectName", operation: "setValue" },
      category: "userFact",
      status: "Proposed",
      value: { kind: "text", value: "Unrelated" },
      title: "Unrelated proposal",
      recommendation: "Record unrelated fact.",
      rationale: "Used to confirm unrelated planning is ignored.",
      sourceIds: [uuid(1)],
      uncertainty: "Known",
      restriction: "concreteProposalAllowed",
      createdAt: timestamp,
      updatedAt: timestamp
        }
      ]
    };

    const result = await reconcile({
      existingPlanning,
      proposals: currentProposals,
      fingerprints: currentFingerprintResult.fingerprints
    });

    expect(result.issues).toEqual([]);
    expect(result.current).toHaveLength(10);
    expect(result.existingOnly).toEqual([
      expect.objectContaining({
        proposalKey: fixture.fingerprints[0].proposalKey,
        disposition: "noLongerGenerated",
        existingProposalId: proposalUuid(1)
      })
    ]);
  });

  it("handles ambiguous semantic keys, ambiguous fingerprints, and identity drift without selecting winners", async () => {
    const fixture = await ttiFixture();
    const ambiguousKeyPlanning = await planningWithExactMatches();
    ambiguousKeyPlanning.proposals = [
      ...ambiguousKeyPlanning.proposals,
      { ...ambiguousKeyPlanning.proposals[0], proposalId: proposalUuid(50), fingerprint: "e".repeat(64) }
    ];
    const ambiguousKey = await reconcile({ existingPlanning: ambiguousKeyPlanning });
    expect(ambiguousKey.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ambiguousExistingProposalKey", proposalKey: fixture.fingerprints[0].proposalKey })
    ]));
    expect(ambiguousKey.current.map((entry) => entry.proposalKey)).not.toContain(fixture.fingerprints[0].proposalKey);
    expect(ambiguousKey.current).toHaveLength(10);

    const ambiguousFingerprintPlanning = await planningWithExactMatches();
    ambiguousFingerprintPlanning.proposals[1] = {
      ...ambiguousFingerprintPlanning.proposals[1],
      fingerprint: fixture.fingerprints[0].fingerprint
    };
    const ambiguousFingerprint = await reconcile({ existingPlanning: ambiguousFingerprintPlanning });
    expect(ambiguousFingerprint.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ambiguousExistingFingerprint", proposalKey: fixture.fingerprints[0].proposalKey })
    ]));
    expect(ambiguousFingerprint.current.map((entry) => entry.proposalKey)).not.toContain(fixture.fingerprints[0].proposalKey);

    const identityDriftPlanning = await planningWithExactMatches();
    identityDriftPlanning.proposals[0] = {
      ...identityDriftPlanning.proposals[0],
      title: "Changed stable identity title"
    };
    const identityDrift = await reconcile({ existingPlanning: identityDriftPlanning });
    expect(identityDrift.issues).toEqual([
      expect.objectContaining({ code: "existingProposalIdentityMismatch", field: "title" })
    ]);
    expect(identityDrift.current.map((entry) => entry.proposalKey)).not.toContain(fixture.fingerprints[0].proposalKey);
  });

  it("reports terminal history separately and never reuses or reopens it", async () => {
    const fixture = await ttiFixture();
    const existingPlanning = {
      ...emptyPlanning(),
      sources: [planningSource(1)],
      proposals: [
        proposalRecord(fixture.proposals[0], fixture.fingerprints[0], 1, "Rejected"),
        proposalRecord(fixture.proposals[1], fixture.fingerprints[1], 2, "Superseded")
      ]
    };
    const before = JSON.stringify(existingPlanning);
    const result = await reconcile({ existingPlanning });

    expect(result.issues).toEqual([]);
    expect(result.historical).toEqual([
      expect.objectContaining({ proposalKey: fixture.fingerprints[0].proposalKey, existingStatus: "Rejected" }),
      expect.objectContaining({ proposalKey: fixture.fingerprints[1].proposalKey, existingStatus: "Superseded" })
    ]);
    expect(result.current.find((entry) => entry.proposalKey === fixture.fingerprints[0].proposalKey)).toMatchObject({ disposition: "newProposal" });
    expect(result.current.find((entry) => entry.proposalKey === fixture.fingerprints[1].proposalKey)).toMatchObject({ disposition: "newProposal" });
    expect(JSON.stringify(existingPlanning)).toBe(before);
  });

  it("is deterministic across reversed existing and generated input order", async () => {
    const fixture = await ttiFixture();
    const existingPlanning = await planningWithExactMatches();
    const forward = await reconcile({ existingPlanning });
    const reversed = await reconcile({
      existingPlanning: {
        ...existingPlanning,
        sources: [...existingPlanning.sources].reverse(),
        proposals: [...existingPlanning.proposals].reverse()
      },
      sources: [...fixture.sources].reverse(),
      proposals: [...fixture.proposals].reverse(),
      fingerprints: [...fixture.fingerprints].reverse()
    });

    expect(reversed).toEqual(forward);
  });

  it("defensively copies results and preserves prior contracts", async () => {
    const fixture = await ttiFixture();
    const existingPlanning = await planningWithExactMatches();
    const first = await reconcile({ existingPlanning });
    (first.current as PlanningClarificationCurrentReconciliation[]).pop();
    (first.existingOnly as Array<unknown>).push({ changed: true });
    (first.historical as Array<unknown>).push({ changed: true });
    (first.issues as Array<unknown>).push({ code: "invalidInput", message: "changed" });

    const second = await reconcile({ existingPlanning });
    expect(second.current).toHaveLength(11);
    expect(second.existingOnly).toEqual([]);
    expect(second.historical).toEqual([]);
    expect(second.issues).toEqual([]);
    expect(getPlanningRuleById("pp.canvas.schema.confirmation")!.target.targetKey).toBe("schema");
    expect(generatePlanningClarificationBlueprints({
      projectId,
      drafts: generatePlanningClarificationDrafts({
        projectId,
        projectType: "powerAppsCanvas",
        gateResults: ruleIds.map((ruleId) => gate(getPlanningRuleById(ruleId)!.target.targetKey, ttiStatuses[getPlanningRuleById(ruleId)!.target.targetKey]))
      }).drafts
    }).proposals).toHaveLength(11);
    expect((await generatePlanningClarificationFingerprints({
      projectId,
      sources: fixture.sources,
      proposals: fixture.proposals
    })).fingerprints).toHaveLength(11);
  });

  it("keeps reconciliation metadata local and isolated from TTI blockers and prohibited behaviours", async () => {
    const result = await reconcile();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/HomeScreen|SubmitButton|AdminGroup|Patch\(|Set\(|Collect\(|screens:\s*\n|controls:\s*\n|release approved|owner assigned/i);
    expect(serialized).not.toMatch(/readyForCodex|readinessEligible|outputEligible|reviewStatus|projectStatus|packagePreview|manifest|zip/i);

    const source = readFileSync("src/lib/planningClarificationReconciliation.ts", "utf8");
    expect(source).not.toMatch(/randomUUID|Math\.random|crypto\.getRandomValues/);
    expect(source).not.toMatch(/Date\.now|new Date|performance\.now|createdAt:\s|updatedAt:\s|staleAt:\s|observedAt:\s/);
    expect(source).not.toMatch(/projectRepository|storageVersion|STORAGE_KEY|localStorage|browserStorage/);
    expect(source).not.toMatch(/from\s+["']\.\.?\/components|from\s+["']\.\.?\/app|use[A-Z][A-Za-z]+\(/);
    expect(source).not.toMatch(/generateProjectPackage|documentReview|exportManifest|exportProjectPackage|exportIntegrity/);
    expect(source).not.toMatch(/buildPhaseGateResults|evaluatePhaseGate|isPhaseGatePassing|PHASE_GATE_EVALUATORS/);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|axios|navigator\.sendBeacon/);
    expect(source).not.toMatch(/provider|modelId|modelName|modelProvider|apiKey|api_key|accessToken|refreshToken|telemetry/i);
    expect(source).not.toMatch(/createPlanningProposal|createPlanningSource|appendDecision|createDependency|createConflict/);
    expect(source).not.toMatch(/markStale|markSuperseded|supersededByProposalId:\s|reopen|confirmProposal|rejectProposal/i);
  });
});
