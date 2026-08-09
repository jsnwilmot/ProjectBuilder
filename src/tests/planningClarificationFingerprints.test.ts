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
  computePlanningSha256Fingerprint,
  generatePlanningClarificationFingerprints,
  type PlanningClarificationFingerprintGenerationIssueCode,
  type PlanningClarificationFingerprintRecord
} from "../lib/planningClarificationFingerprints";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION
} from "../lib/planningProposals";
import { getPlanningRuleById, getPlanningRuleRegistry } from "../lib/planningRules";
import type { PowerPlatformGateStatus } from "../types/project";

const projectId = "tti-software-licence-tracker";

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

function ttiBlueprints() {
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
  return {
    sources: clone(blueprintResult.sources) as PlanningClarificationSourceBlueprint[],
    proposals: clone(blueprintResult.proposals) as PlanningClarificationProposalBlueprint[]
  };
}

async function generate(
  overrides: Partial<{
    id: string;
    sources: readonly PlanningClarificationSourceBlueprint[] | unknown;
    proposals: readonly PlanningClarificationProposalBlueprint[] | unknown;
  }> = {}
) {
  const blueprints = ttiBlueprints();
  return generatePlanningClarificationFingerprints({
    projectId: overrides.id ?? projectId,
    sources: overrides.sources ?? blueprints.sources,
    proposals: overrides.proposals ?? blueprints.proposals
  });
}

async function issueCodes(input: unknown): Promise<PlanningClarificationFingerprintGenerationIssueCode[]> {
  return (await generatePlanningClarificationFingerprints(input)).issues.map((entry) => entry.code);
}

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function parsedInput(proposal: PlanningClarificationProposalBlueprint): Record<string, unknown> {
  return JSON.parse(proposal.fingerprintInput) as Record<string, unknown>;
}

function withCanonicalMutation(
  proposal: PlanningClarificationProposalBlueprint,
  mutation: (parsed: Record<string, unknown>) => void
): PlanningClarificationProposalBlueprint {
  const next = clone(proposal);
  const parsed = parsedInput(next);
  mutation(parsed);
  next.fingerprintInput = JSON.stringify(parsed);
  return next;
}

function stubDigest(bytes: number[] | Uint8Array) {
  vi.stubGlobal("crypto", {
    subtle: {
      digest: vi.fn(async () => new Uint8Array(bytes).buffer)
    }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

describe("planning clarification fingerprint generation", () => {
  it("computes the approved SHA-256 primitive exactly and preserves byte input", async () => {
    const abc = await computePlanningSha256Fingerprint("abc");
    expect(abc).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(abc).toMatch(/^[0-9a-f]{64}$/);
    expect(await computePlanningSha256Fingerprint("abc")).toBe(abc);
    expect(await computePlanningSha256Fingerprint("abcd")).not.toBe(abc);
    expect(await computePlanningSha256Fingerprint(" abc ")).not.toBe(abc);
    expect(await computePlanningSha256Fingerprint("cafe")).not.toBe(await computePlanningSha256Fingerprint("cafe\u0301"));
    expect(await computePlanningSha256Fingerprint("TTI snowman \u2603")).toBe(await computePlanningSha256Fingerprint("TTI snowman \u2603"));
  });

  it("returns structured input issues and preserves input objects", async () => {
    await expect(generatePlanningClarificationFingerprints(null)).resolves.toEqual({
      fingerprints: [],
      issues: [expect.objectContaining({ code: "invalidInput" })]
    });
    await expect(issueCodes({ projectId: "", sources: [], proposals: [] })).resolves.toContain("invalidProjectId");
    await expect(issueCodes({ projectId: "x".repeat(201), sources: [], proposals: [] })).resolves.toContain("invalidProjectId");
    await expect(issueCodes({ projectId: "one\ntwo", sources: [], proposals: [] })).resolves.toContain("invalidProjectId");
    await expect(issueCodes({ projectId, sources: {}, proposals: [] })).resolves.toContain("invalidSources");
    await expect(issueCodes({ projectId, sources: [], proposals: {} })).resolves.toContain("invalidProposals");

    const blueprints = ttiBlueprints();
    const before = JSON.stringify(blueprints);
    await generatePlanningClarificationFingerprints({ projectId, ...blueprints });
    expect(JSON.stringify(blueprints)).toBe(before);
  });

  it("validates sources, equivalent duplicates, and conflicting duplicates", async () => {
    const { sources, proposals } = ttiBlueprints();
    const sourceTypes = new Set(sources.map((source) => source.sourceType));
    expect(sourceTypes).toEqual(new Set(["projectRule", "readinessPrerequisite"]));
    await expect(generate({ sources: [...sources, clone(sources[0])] })).resolves.toMatchObject({
      issues: [],
      fingerprints: expect.arrayContaining([expect.objectContaining({ proposalKey: proposals[0].proposalKey })])
    });

    for (const mutation of [
      (source: PlanningClarificationSourceBlueprint) => { source.sourceType = "approvedDocument" as PlanningClarificationSourceBlueprint["sourceType"]; },
      (source: PlanningClarificationSourceBlueprint) => { source.authority = "confirmed" as PlanningClarificationSourceBlueprint["authority"]; },
      (source: PlanningClarificationSourceBlueprint) => { source.availability = "stale" as PlanningClarificationSourceBlueprint["availability"]; },
      (source: PlanningClarificationSourceBlueprint) => { source.label = "<script>alert(1)</script>"; }
    ]) {
      const changed = clone(sources);
      mutation(changed[0]);
      const result = await generate({ sources: changed });
      expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "invalidSource" })]));
    }

    const conflicting = clone(sources);
    conflicting.push({ ...conflicting[0], label: "Different approved rule label" });
    const conflict = await generate({ sources: conflicting });
    expect(conflict.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "conflictingSource", sourceKey: sources[0].sourceKey })
    ]));
    const dependentProposal = proposals.find((proposal) => proposal.sourceKeys.includes(sources[0].sourceKey))!;
    expect(conflict.fingerprints.map((record) => record.proposalKey)).not.toContain(dependentProposal.proposalKey);
  });

  it("validates proposal blueprints against active rules and fixed Phase 5C.2.1C semantics", async () => {
    const { proposals } = ttiBlueprints();
    const cases: Array<[PlanningClarificationFingerprintGenerationIssueCode, (proposal: PlanningClarificationProposalBlueprint) => void, string]> = [
      ["projectIdMismatch", (proposal) => { proposal.projectId = "different-project"; }, "projectId"],
      ["unknownRule", (proposal) => { proposal.ruleId = "unknown.rule"; proposal.proposalKey = "clarification|unknown.rule|schema"; }, "ruleId"],
      ["ruleMismatch", (proposal) => { proposal.ruleVersion = "2.0.0"; }, "ruleVersion"],
      ["ruleMismatch", (proposal) => { proposal.status = "Proposed" as PlanningClarificationProposalBlueprint["status"]; }, "status"],
      ["ruleMismatch", (proposal) => { proposal.recommendation = "Changed recommendation"; }, "recommendation"],
      ["ruleMismatch", (proposal) => { proposal.sourceKeys = [...proposal.sourceKeys].reverse(); }, "sourceKeys"],
      ["ruleMismatch", (proposal) => { proposal.readinessRequirementIds = ["testing" as PhaseGateId]; }, "readinessRequirementIds"],
      ["ruleMismatch", (proposal) => { proposal.applicableProjectTypes = ["businessWebsite" as PlanningClarificationProposalBlueprint["applicableProjectTypes"][number]]; }, "applicableProjectTypes"],
      ["ruleMismatch", (proposal) => { proposal.applicableDomains = ["security"]; }, "applicableDomains"],
      ["invalidProposal", (proposal) => { (proposal as PlanningClarificationProposalBlueprint & { proposalId: string }).proposalId = "11111111-1111-4111-8111-111111111111"; }, "proposalId"]
    ];

    for (const [code, mutation, field] of cases) {
      const changed = clone(proposals);
      mutation(changed[0]);
      const result = await generate({ proposals: changed });
      expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code, field })]));
      expect(result.fingerprints.map((record) => record.proposalKey)).not.toContain(proposals[0].proposalKey);
    }

    const duplicate = await generate({ proposals: [proposals[0], clone(proposals[0])] });
    expect(duplicate.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "duplicateProposalKey", proposalKey: proposals[0].proposalKey })
    ]));
    expect(duplicate.fingerprints).toEqual([]);
  });

  it("validates canonical JSON serialization, property order, size, and semantic equality", async () => {
    const { proposals } = ttiBlueprints();
    const base = proposals[0];
    const rule = getPlanningRuleRegistry()[0];
    expect(parsedInput(base)).toMatchObject({
      schemaVersion: PLANNING_SCHEMA_VERSION,
      ruleSetId: PLANNING_RULE_SET_ID,
      ruleSetVersion: PLANNING_RULE_SET_VERSION,
      projectId,
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion
    });

    const invalidJson = clone(base);
    invalidJson.fingerprintInput = "{";
    const pretty = clone(base);
    pretty.fingerprintInput = JSON.stringify(parsedInput(pretty), null, 2);
    const topOrder = clone(base);
    topOrder.fingerprintInput = JSON.stringify({ projectId, ...parsedInput(topOrder) });
    const targetOrder = clone(base);
    targetOrder.fingerprintInput = JSON.stringify({
      ...parsedInput(targetOrder),
      target: { domain: base.target.domain, kind: base.target.kind, targetKey: base.target.targetKey, entityId: null, fieldKey: null, operation: base.target.operation }
    });
    const sourceOrder = clone(base);
    sourceOrder.fingerprintInput = JSON.stringify({
      ...parsedInput(sourceOrder),
      sourceEvidence: [...(parsedInput(sourceOrder).sourceEvidence as unknown[])].reverse()
    });
    const sourcePropertyOrder = clone(base);
    const propertyOrderParsed = parsedInput(sourcePropertyOrder);
    const sourceEvidence = propertyOrderParsed.sourceEvidence as Array<Record<string, unknown>>;
    sourceEvidence[0] = { sourceType: sourceEvidence[0].sourceType, sourceKey: sourceEvidence[0].sourceKey, locator: sourceEvidence[0].locator, label: sourceEvidence[0].label, authority: sourceEvidence[0].authority, availability: sourceEvidence[0].availability, version: sourceEvidence[0].version, excerpt: sourceEvidence[0].excerpt };
    sourcePropertyOrder.fingerprintInput = JSON.stringify(propertyOrderParsed);

    const cases = [
      invalidJson,
      pretty,
      topOrder,
      withCanonicalMutation(base, (parsed) => { delete parsed.restriction; }),
      withCanonicalMutation(base, (parsed) => { parsed.extra = true; }),
      withCanonicalMutation(base, (parsed) => { parsed.schemaVersion = "wrong"; }),
      withCanonicalMutation(base, (parsed) => { parsed.ruleSetId = "wrong"; }),
      withCanonicalMutation(base, (parsed) => { parsed.ruleSetVersion = "wrong"; }),
      withCanonicalMutation(base, (parsed) => { parsed.projectId = "wrong"; }),
      withCanonicalMutation(base, (parsed) => { parsed.ruleId = "wrong"; }),
      withCanonicalMutation(base, (parsed) => { parsed.ruleVersion = "9.9.9"; }),
      targetOrder,
      withCanonicalMutation(base, (parsed) => { (parsed.target as Record<string, unknown>).targetKey = "testing"; }),
      withCanonicalMutation(base, (parsed) => { parsed.value = { kind: "clarification", question: "Changed question" }; }),
      withCanonicalMutation(base, (parsed) => { parsed.title = "Changed title"; }),
      withCanonicalMutation(base, (parsed) => { parsed.recommendation = "Changed recommendation"; }),
      withCanonicalMutation(base, (parsed) => { parsed.rationale = "Changed rationale"; }),
      withCanonicalMutation(base, (parsed) => { parsed.consequence = "Changed consequence"; }),
      sourceOrder,
      sourcePropertyOrder,
      withCanonicalMutation(base, (parsed) => { ((parsed.sourceEvidence as Array<Record<string, unknown>>)[0]).locator = "planning-rule:changed"; }),
      withCanonicalMutation(base, (parsed) => { parsed.uncertainty = "Known"; }),
      withCanonicalMutation(base, (parsed) => { parsed.restriction = "neverAutoGenerate"; }),
      withCanonicalMutation(base, (parsed) => { parsed.readinessRequirementIds = ["testing"]; }),
      withCanonicalMutation(base, (parsed) => { parsed.applicableProjectTypes = ["businessWebsite"]; }),
      withCanonicalMutation(base, (parsed) => { parsed.applicableDomains = ["security"]; })
    ];

    for (const proposal of cases) {
      const result = await generate({ proposals: [proposal] });
      expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "invalidFingerprintInput" })]));
      expect(result.fingerprints).toEqual([]);
    }

    const oversized = clone(base);
    oversized.fingerprintInput = "x".repeat(20_001);
    expect((await generate({ proposals: [oversized] })).issues).toEqual([
      expect.objectContaining({ code: "oversizedFingerprintInput" })
    ]);
  });

  it("rejects duplicate canonical inputs and simulated SHA-256 collisions without selecting a winner", async () => {
    const { proposals } = ttiBlueprints();
    const duplicateInput = clone(proposals);
    duplicateInput[1].fingerprintInput = duplicateInput[0].fingerprintInput;
    const duplicate = await generate({ proposals: duplicateInput.slice(0, 2) });
    expect(duplicate.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "duplicateFingerprintInput", proposalKey: proposals[0].proposalKey }),
      expect.objectContaining({ code: "duplicateFingerprintInput", proposalKey: proposals[1].proposalKey })
    ]));
    expect(duplicate.fingerprints).toEqual([]);

    stubDigest(new Array(32).fill(7));
    const collision = await generate({ proposals: proposals.slice(0, 2) });
    expect(collision.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "fingerprintCollision", proposalKey: proposals[0].proposalKey }),
      expect.objectContaining({ code: "fingerprintCollision", proposalKey: proposals[1].proposalKey })
    ]));
    expect(collision.fingerprints).toEqual([]);
  });

  it("converts Web Crypto failures into controlled top-level issues", async () => {
    const { proposals } = ttiBlueprints();

    vi.stubGlobal("crypto", undefined);
    await expect(generate({ proposals: [proposals[0]] })).resolves.toEqual({
      fingerprints: [],
      issues: [expect.objectContaining({ code: "hashUnavailable" })]
    });

    vi.stubGlobal("crypto", {});
    await expect(generate({ proposals: [proposals[0]] })).resolves.toEqual({
      fingerprints: [],
      issues: [expect.objectContaining({ code: "hashUnavailable" })]
    });

    vi.stubGlobal("crypto", { subtle: { digest: vi.fn(async () => { throw new Error("digest failed"); }) } });
    await expect(generate({ proposals: [proposals[0]] })).resolves.toEqual({
      fingerprints: [],
      issues: [expect.objectContaining({ code: "hashFailure" })]
    });

    stubDigest(new Array(31).fill(1));
    await expect(generate({ proposals: [proposals[0]] })).resolves.toEqual({
      fingerprints: [],
      issues: [expect.objectContaining({ code: "invalidFingerprint" })]
    });
  });

  it("generates the exact TTI fingerprint fixture deterministically and independent of input order", async () => {
    const { sources, proposals } = ttiBlueprints();
    const forward = await generate({ sources, proposals });
    const repeated = await generate({ sources, proposals });
    const reversed = await generate({ sources: [...sources].reverse(), proposals: [...proposals].reverse() });

    expect(forward.issues).toEqual([]);
    expect(forward.fingerprints).toHaveLength(11);
    expect(new Set(forward.fingerprints.map((record) => record.proposalKey))).toHaveLength(11);
    expect(new Set(forward.fingerprints.map((record) => record.fingerprint))).toHaveLength(11);
    expect(forward.fingerprints.every((record) => /^[0-9a-f]{64}$/.test(record.fingerprint))).toBe(true);
    expect(repeated).toEqual(forward);
    expect(reversed).toEqual(forward);
    expect(forward.fingerprints.map((record) => record.proposalKey)).toEqual(getPlanningRuleRegistry().map((rule) => `clarification|${rule.ruleId}|${rule.target.targetKey}`));
    expect(JSON.stringify(forward)).not.toMatch(/proposalId|sourceId|createdAt|updatedAt|PlanningProposalRecord|PlanningSourceReference/);
  });

  it("hashes exact canonical strings and changes only on semantic canonical changes", async () => {
    const { proposals } = ttiBlueprints();
    const base = proposals[0].fingerprintInput;
    const baseHash = await computePlanningSha256Fingerprint(base);
    const variants = [
      withCanonicalMutation(proposals[0], (parsed) => { parsed.ruleVersion = "1.0.1"; }),
      withCanonicalMutation(proposals[0], (parsed) => { parsed.value = { kind: "clarification", question: "Different approved question?" }; }),
      withCanonicalMutation(proposals[0], (parsed) => { parsed.target = { ...(parsed.target as Record<string, unknown>), targetKey: "testing" }; }),
      withCanonicalMutation(proposals[0], (parsed) => { parsed.restriction = "clarificationOnly"; }),
      withCanonicalMutation(proposals[0], (parsed) => { ((parsed.sourceEvidence as Array<Record<string, unknown>>)[0]).locator = "planning-rule:changed"; }),
      withCanonicalMutation(proposals[0], (parsed) => { ((parsed.sourceEvidence as Array<Record<string, unknown>>)[0]).label = "Changed label"; }),
      withCanonicalMutation(proposals[0], (parsed) => { ((parsed.sourceEvidence as Array<Record<string, unknown>>)[1]).excerpt = "Changed excerpt"; }),
      withCanonicalMutation(proposals[0], (parsed) => { ((parsed.sourceEvidence as Array<Record<string, unknown>>)[0]).version = "1.0.1"; }),
      withCanonicalMutation(proposals[0], (parsed) => { parsed.readinessRequirementIds = ["testing"]; }),
      withCanonicalMutation(proposals[0], (parsed) => { parsed.applicableDomains = ["testing"]; })
    ];

    for (const variant of variants) {
      expect(await computePlanningSha256Fingerprint(variant.fingerprintInput)).not.toBe(baseHash);
    }

    const forward = await generate({ proposals });
    const reversed = await generate({ proposals: [...proposals].reverse() });
    expect(reversed.fingerprints.map((record) => record.fingerprint)).toEqual(forward.fingerprints.map((record) => record.fingerprint));
  });

  it("defensively copies results and preserves prior contracts", async () => {
    const blueprints = ttiBlueprints();
    const beforeBlueprints = JSON.stringify(blueprints);
    const first = await generatePlanningClarificationFingerprints({ projectId, ...blueprints });
    (first.fingerprints as PlanningClarificationFingerprintRecord[]).pop();
    (first.issues as Array<unknown>).push({ code: "invalidInput", message: "changed" });

    const second = await generatePlanningClarificationFingerprints({ projectId, ...blueprints });
    expect(second.fingerprints).toHaveLength(11);
    expect(second.issues).toEqual([]);
    expect(JSON.stringify(blueprints)).toBe(beforeBlueprints);
    expect(generatePlanningClarificationBlueprints({
      projectId,
      drafts: generatePlanningClarificationDrafts({
        projectId,
        projectType: "powerAppsCanvas",
        gateResults: ruleIds.map((ruleId) => gate(getPlanningRuleById(ruleId)!.target.targetKey, ttiStatuses[getPlanningRuleById(ruleId)!.target.targetKey]))
      }).drafts
    }).proposals).toHaveLength(11);
    expect(getPlanningRuleById("pp.canvas.schema.confirmation")!.target.targetKey).toBe("schema");
  });

  it("keeps the production module isolated from prohibited behaviours", () => {
    const source = readFileSync("src/lib/planningClarificationFingerprints.ts", "utf8");

    expect(source).not.toMatch(/\bProjectRecord\b|\bProjectPlanningState\b|\bPlanningDecisionRecord\b|\bPlanningDependencyRecord\b|\bPlanningConflictRecord\b/);
    expect(source).not.toMatch(/projectRepository|storageVersion|STORAGE_KEY|localStorage|browserStorage/);
    expect(source).not.toMatch(/from\s+["']\.\.?\/components|from\s+["']\.\.?\/app|use[A-Z][A-Za-z]+\(/);
    expect(source).not.toMatch(/generateProjectPackage|documentReview|exportManifest|exportProjectPackage|exportIntegrity/);
    expect(source).not.toMatch(/buildPhaseGateResults|evaluatePhaseGate|isPhaseGatePassing|PHASE_GATE_EVALUATORS/);
    expect(source).not.toMatch(/import\s+\{[^}]*\}\s+from\s+["']\.\/phaseGates["']/);
    expect(source).not.toMatch(/randomUUID|Math\.random|crypto\.getRandomValues/);
    expect(source).not.toMatch(/Date\.now|new Date|performance\.now|createdAt:\s|updatedAt:\s|observedAt:\s/);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|axios|navigator\.sendBeacon/);
    expect(source).not.toMatch(/provider|modelId|modelName|modelProvider|apiKey|api_key|accessToken|refreshToken|telemetry/i);
    expect(source).not.toMatch(/createPlanningProposal|createPlanningSource|appendDecision|createDependency|createConflict/);
    expect(source).not.toMatch(/markStale|superseded|reconcile/i);
  });
});
