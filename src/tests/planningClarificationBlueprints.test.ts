// @ts-expect-error -- Vitest runs this static source isolation assertion in Node; the app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PhaseGateId, PhaseGateResult } from "../lib/phaseGates";
import {
  generatePlanningClarificationBlueprints,
  type PlanningClarificationBlueprintGenerationIssueCode,
  type PlanningClarificationProposalBlueprint,
  type PlanningClarificationSourceBlueprint
} from "../lib/planningClarificationBlueprints";
import {
  generatePlanningClarificationDrafts,
  type PlanningClarificationDraft
} from "../lib/planningClarificationDrafts";
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

function gate(
  id: PhaseGateId,
  status: PowerPlatformGateStatus,
  blockingReason = `TTI ${id} blocker remains unresolved.`,
  sourceSection = `TTI ${id} source section`
): PhaseGateResult {
  return {
    id,
    label: `Gate ${id}`,
    status,
    blockingReason,
    sourceSection
  };
}

function ttiGateResults(overrides: Partial<Record<PhaseGateId, PowerPlatformGateStatus>> = {}): PhaseGateResult[] {
  return ruleIds.map((ruleId) => {
    const targetKey = getPlanningRuleById(ruleId)!.target.targetKey;
    return gate(targetKey, overrides[targetKey] ?? ttiStatuses[targetKey]);
  });
}

function ttiDrafts(overrides: Partial<Record<PhaseGateId, PowerPlatformGateStatus>> = {}): PlanningClarificationDraft[] {
  const result = generatePlanningClarificationDrafts({
    projectId,
    projectType: "powerAppsCanvas",
    gateResults: ttiGateResults(overrides)
  });
  expect(result.issues).toEqual([]);
  return result.drafts as PlanningClarificationDraft[];
}

function generate(drafts: readonly PlanningClarificationDraft[] = ttiDrafts(), id = projectId) {
  return generatePlanningClarificationBlueprints({ projectId: id, drafts });
}

function issueCodes(input: unknown): PlanningClarificationBlueprintGenerationIssueCode[] {
  return generatePlanningClarificationBlueprints(input).issues.map((issue) => issue.code);
}

function mutateFirst(mutation: (draft: PlanningClarificationDraft) => void): PlanningClarificationDraft[] {
  const drafts = ttiDrafts();
  mutation(drafts[0]);
  return drafts;
}

function parsedFingerprint(proposal: PlanningClarificationProposalBlueprint): Record<string, unknown> {
  return JSON.parse(proposal.fingerprintInput) as Record<string, unknown>;
}

describe("planning clarification materialization blueprints", () => {
  it("generates the exact TTI blueprint fixture counts with zero issues", () => {
    const result = generate();

    expect(result.issues).toEqual([]);
    expect(result.sources).toHaveLength(22);
    expect(result.proposals).toHaveLength(11);
    expect(result.proposals.map((proposal) => proposal.fingerprintInput)).toHaveLength(11);
    expect(result.sources.filter((source) => source.sourceType === "projectRule")).toHaveLength(11);
    expect(result.sources.filter((source) => source.sourceType === "readinessPrerequisite")).toHaveLength(11);
    expect(result.proposals.every((proposal) => proposal.status === "Needs Clarification")).toBe(true);
  });

  it("returns structured input issues without unexpected throws", () => {
    expect(() => generatePlanningClarificationBlueprints(null)).not.toThrow();
    expect(issueCodes(null)).toEqual(["invalidInput"]);
    expect(issueCodes({ projectId: "", drafts: [] })).toContain("invalidProjectId");
    expect(issueCodes({ projectId: "x".repeat(201), drafts: [] })).toContain("invalidProjectId");
    expect(issueCodes({ projectId: "one\ntwo", drafts: [] })).toContain("invalidProjectId");
    expect(issueCodes({ projectId, drafts: {} })).toContain("invalidDrafts");
    expect(issueCodes({ projectId, drafts: [null] })).toContain("invalidDraft");
  });

  it("rejects draft project ID mismatches without rewriting the draft", () => {
    const drafts = mutateFirst((draft) => { draft.projectId = "different-project"; });
    const before = JSON.stringify(drafts[0]);
    const result = generate(drafts);

    expect(result.issues).toEqual([
      expect.objectContaining({ code: "projectIdMismatch", field: "projectId" })
    ]);
    expect(result.proposals.map((proposal) => proposal.ruleId)).not.toContain("pp.canvas.schema.confirmation");
    expect(JSON.stringify(drafts[0])).toBe(before);
  });

  it("validates draft rule integrity and rejects tampered fields", () => {
    const cases: Array<[PlanningClarificationBlueprintGenerationIssueCode, (draft: PlanningClarificationDraft) => void, string]> = [
      ["unknownRule", (draft) => { draft.ruleId = "unknown.rule"; draft.draftKey = "unknown.rule|schema"; }, "ruleId"],
      ["ruleMismatch", (draft) => { draft.ruleVersion = "2.0.0"; }, "ruleVersion"],
      ["ruleMismatch", (draft) => { draft.target.domain = "security"; }, "target"],
      ["ruleMismatch", (draft) => { draft.category = "assumption"; }, "category"],
      ["ruleMismatch", (draft) => { draft.restriction = "neverAutoGenerate"; }, "restriction"],
      ["ruleMismatch", (draft) => { draft.uncertainty = "Known"; }, "uncertainty"],
      ["ruleMismatch", (draft) => { draft.value.question = "Changed question"; }, "value"],
      ["ruleMismatch", (draft) => { draft.title = "Changed title"; }, "title"],
      ["ruleMismatch", (draft) => { draft.rationale = "Changed rationale"; }, "rationale"],
      ["ruleMismatch", (draft) => { draft.consequence = "Changed consequence"; }, "consequence"],
      ["ruleMismatch", (draft) => { draft.priority = 101; }, "priority"],
      ["ruleMismatch", (draft) => { draft.acceptableSources[0].authority = "informational"; }, "acceptableSources"],
      ["ruleMismatch", (draft) => { draft.notApplicableAllowed = true; }, "notApplicableAllowed"],
      ["ruleMismatch", (draft) => { draft.deferralAllowed = false; }, "deferralAllowed"],
      ["ruleMismatch", (draft) => { draft.architectApprovalRequired = false; }, "architectApprovalRequired"],
      ["invalidDraftKey", (draft) => { draft.draftKey = "wrong|schema"; }, "draftKey"]
    ];

    for (const [code, mutation, field] of cases) {
      const result = generate(mutateFirst(mutation));
      expect(result.issues).toEqual([expect.objectContaining({ code, field })]);
      expect(result.proposals.map((proposal) => proposal.ruleId)).not.toContain("pp.canvas.schema.confirmation");
    }
  });

  it("rejects duplicate draft and proposal keys without selecting one", () => {
    const first = ttiDrafts()[0];
    const result = generate([first, { ...first, target: { ...first.target }, value: { ...first.value }, acceptableSources: [...first.acceptableSources] }]);

    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "duplicateDraftKey", draftKey: "pp.canvas.schema.confirmation|schema" }),
      expect.objectContaining({ code: "duplicateProposalKey", proposalKey: "clarification|pp.canvas.schema.confirmation|schema" })
    ]));
    expect(result.proposals).toEqual([]);
  });

  it("handles eligible and ineligible gate statuses exactly", () => {
    for (const status of ["notStarted", "missingInformation", "reviewNeeded", "manualValidationRequired", "inProgress", "blocked", "failed"] as const) {
      const draft = ttiDrafts()[0];
      draft.gateStatus = status;
      const result = generate([draft]);

      expect(result.issues).toEqual([]);
      expect(result.proposals).toHaveLength(1);
    }

    const mandatoryDraftResult = generatePlanningClarificationDrafts({
      projectId,
      projectType: "powerAppsCanvas",
      gateResults: ttiGateResults({ internalNames: "notApplicable" })
    });
    expect(mandatoryDraftResult.issues).toEqual([
      expect.objectContaining({ code: "disallowedNotApplicableStatus", gateId: "internalNames" })
    ]);
    const mandatoryNotApplicable = mandatoryDraftResult.drafts[1] as PlanningClarificationDraft;
    const notApplicableResult = generate([mandatoryNotApplicable]);
    expect(notApplicableResult.issues).toEqual([]);
    expect(notApplicableResult.proposals).toHaveLength(1);

    for (const status of ["confirmed", "ready", "passed"] as const) {
      const draft = ttiDrafts()[0];
      draft.gateStatus = status;
      expect(generate([draft]).issues).toEqual([expect.objectContaining({ code: "ineligibleGateStatus", field: "gateStatus" })]);
    }

    const allowedNotApplicable = ttiDrafts()[4];
    allowedNotApplicable.gateStatus = "notApplicable";
    expect(generate([allowedNotApplicable]).issues).toEqual([expect.objectContaining({ code: "ineligibleGateStatus", field: "gateStatus" })]);
  });

  it("maps project-rule and readiness source blueprints exactly", () => {
    const result = generate();
    const firstRule = getPlanningRuleById("pp.canvas.schema.confirmation")!;
    const projectRuleSource = result.sources.find((source) => source.sourceKey === "projectRule|pp.canvas.schema.confirmation|1.0.0")!;
    const readinessSource = result.sources.find((source) => source.sourceKey === "readinessPrerequisite|schema")!;

    expect(projectRuleSource).toEqual({
      sourceKey: `projectRule|${firstRule.ruleId}|${firstRule.ruleVersion}`,
      sourceType: "projectRule",
      locator: `planning-rule:${firstRule.ruleId}`,
      label: firstRule.title,
      authority: "approved",
      availability: "current",
      version: firstRule.ruleVersion
    });
    expect(readinessSource).toEqual({
      sourceKey: "readinessPrerequisite|schema",
      sourceType: "readinessPrerequisite",
      locator: "phase-gate:schema",
      label: "TTI schema source section",
      authority: "approved",
      availability: "current",
      excerpt: "TTI schema blocker remains unresolved."
    });
  });

  it("validates source text and handles equivalent and conflicting source keys", () => {
    const invalidSource = generate(mutateFirst((draft) => { draft.gateBlockingReason = "Patch(Items, selectedRecord)"; }));
    expect(invalidSource.issues).toEqual([expect.objectContaining({ code: "invalidSourceBlueprint", field: "sourceText" })]);
    expect(invalidSource.proposals.map((proposal) => proposal.ruleId)).not.toContain("pp.canvas.schema.confirmation");

    const result = generate();
    expect(new Set(result.sources.map((source) => source.sourceKey)).size).toBe(22);
    expect(result.sources.map((source) => source.sourceKey)).toEqual([...result.sources.map((source) => source.sourceKey)].sort());

    const first = ttiDrafts()[0];
    const conflict = { ...first, target: { ...first.target }, value: { ...first.value }, acceptableSources: [...first.acceptableSources], gateBlockingReason: "A different blocker." };
    const conflicting = generate([first, conflict]);
    expect(conflicting.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "conflictingSourceBlueprint", sourceKey: "readinessPrerequisite|schema" })
    ]));
    expect(conflicting.sources.find((source) => source.sourceKey === "readinessPrerequisite|schema")).toBeUndefined();
    expect(conflicting.proposals).toEqual([]);
  });

  it("maps proposal blueprints exactly and orders them by rule priority", () => {
    const result = generate([...ttiDrafts()].reverse());
    const rules = getPlanningRuleRegistry();
    const proposal = result.proposals[0];

    expect(result.proposals.map((entry) => entry.ruleId)).toEqual(rules.map((rule) => rule.ruleId));
    expect(proposal).toMatchObject({
      proposalKey: "clarification|pp.canvas.schema.confirmation|schema",
      projectId,
      ruleSetId: PLANNING_RULE_SET_ID,
      ruleSetVersion: PLANNING_RULE_SET_VERSION,
      ruleId: "pp.canvas.schema.confirmation",
      ruleVersion: "1.0.0",
      target: rules[0].target,
      category: "clarification",
      status: "Needs Clarification",
      value: { kind: "clarification", question: rules[0].question },
      title: rules[0].title,
      recommendation: "Answer the clarification question and provide the applicable confirmation source.",
      rationale: rules[0].rationale,
      sourceKeys: ["projectRule|pp.canvas.schema.confirmation|1.0.0", "readinessPrerequisite|schema"],
      uncertainty: rules[0].uncertainty,
      restriction: rules[0].restriction,
      consequence: rules[0].consequence,
      readinessRequirementIds: ["schema"],
      applicableProjectTypes: ["powerAppsCanvas"],
      applicableDomains: ["data"]
    });
    expect(proposal).not.toHaveProperty("priority");
  });

  it("creates exact fixed-shape canonical fingerprint input serialization", () => {
    const proposal = generate().proposals[0];
    const parsed = parsedFingerprint(proposal);

    expect(proposal.fingerprintInput).not.toContain("\n");
    expect(proposal.fingerprintInput).not.toContain('": ');
    expect(Object.keys(parsed)).toEqual([
      "schemaVersion",
      "ruleSetId",
      "ruleSetVersion",
      "projectId",
      "ruleId",
      "ruleVersion",
      "target",
      "category",
      "status",
      "value",
      "title",
      "recommendation",
      "rationale",
      "consequence",
      "sourceEvidence",
      "uncertainty",
      "restriction",
      "readinessRequirementIds",
      "applicableProjectTypes",
      "applicableDomains"
    ]);
    expect(parsed.schemaVersion).toBe(PLANNING_SCHEMA_VERSION);
    expect(Object.keys(parsed.target as Record<string, unknown>)).toEqual(["kind", "domain", "targetKey", "entityId", "fieldKey", "operation"]);
    expect(parsed.target).toMatchObject({ entityId: null, fieldKey: null });

    const sourceEvidence = parsed.sourceEvidence as Array<Record<string, unknown>>;
    expect(sourceEvidence.map((source) => Object.keys(source))).toEqual([
      ["sourceKey", "sourceType", "locator", "label", "authority", "availability", "version", "excerpt"],
      ["sourceKey", "sourceType", "locator", "label", "authority", "availability", "version", "excerpt"]
    ]);
    expect(sourceEvidence[0]).toMatchObject({ sourceType: "projectRule", version: "1.0.0", excerpt: null });
    expect(sourceEvidence[1]).toMatchObject({ sourceType: "readinessPrerequisite", version: null, excerpt: "TTI schema blocker remains unresolved." });
  });

  it("keeps canonical input repeatable, order-independent, and sensitive to semantic source evidence", () => {
    const first = generate(ttiDrafts()).proposals[0].fingerprintInput;
    const second = generate(ttiDrafts()).proposals[0].fingerprintInput;
    const reversed = generate([...ttiDrafts()].reverse()).proposals[0].fingerprintInput;
    expect(first).toBe(second);
    expect(first).toBe(reversed);

    const blocked = ttiDrafts();
    blocked[0].gateStatus = "blocked";
    expect(generate(blocked).proposals[0].fingerprintInput).toBe(first);

    const changedEvidence = mutateFirst((draft) => { draft.gateBlockingReason = "A different blocker remains unresolved."; });
    expect(generate(changedEvidence).proposals[0].fingerprintInput).not.toBe(first);

    const parsed = parsedFingerprint(generate().proposals[0]);
    expect(parsed.ruleVersion).toBe("1.0.0");
    expect(parsed.value).toEqual({ kind: "clarification", question: getPlanningRuleRegistry()[0].question });
    expect(parsed.target).toMatchObject({ targetKey: "schema", operation: "clarificationOnly" });
    expect(parsed.restriction).toBe("authoritativeSourceRequired");
  });

  it("keeps TTI blueprints free of substantive implementation content and stored-record metadata", () => {
    const serialized = JSON.stringify(generate());

    expect(serialized).not.toMatch(/"sourceId"|"proposalId"|"fingerprint"|"createdAt"|"updatedAt"|"lastDecisionId"/);
    expect(serialized).not.toMatch(/decisionIds|conflictIds|staleReason|superseded|readinessEligible|outputEligible|uiState|persistence/i);
    expect(serialized).not.toMatch(/randomUUID|PlanningSourceReference|PlanningProposalRecord/);
    expect(serialized).not.toMatch(/Patch\(|Set\(|Collect\(|SubmitForm\(|Navigate\(/);
    expect(serialized).not.toMatch(/screens:\s*\n|controls:\s*\n|OnSelect:/i);
    expect(serialized).not.toMatch(/HomeScreen|SubmitButton|AdminGroup|Release approved|owner assigned/i);
    expect(serialized).not.toMatch(/https?:\/\/|api key|accessToken|refreshToken|modelId|modelName|modelProvider|telemetry/i);
  });

  it("does not mutate input draft arrays or draft records", () => {
    const drafts = ttiDrafts();
    const before = JSON.stringify(drafts);

    generate(drafts);

    expect(JSON.stringify(drafts)).toBe(before);
  });

  it("protects returned sources, proposals, nested values, issues, registry data, and drafts from mutation", () => {
    const first = generate();
    (first.sources as PlanningClarificationSourceBlueprint[]).pop();
    (first.proposals as PlanningClarificationProposalBlueprint[]).pop();
    expect(generate().sources).toHaveLength(22);
    expect(generate().proposals).toHaveLength(11);

    const source = generate().sources[0] as PlanningClarificationSourceBlueprint;
    source.label = "Changed";
    expect(generate().sources[0].label).not.toBe("Changed");

    const proposal = generate().proposals[0] as PlanningClarificationProposalBlueprint;
    proposal.target.targetKey = "testing";
    (proposal.sourceKeys as string[])[0] = "changed";
    (proposal.readinessRequirementIds as PhaseGateId[])[0] = "testing";
    (proposal.applicableDomains as string[])[0] = "security";
    proposal.value.question = "Changed";

    expect(generate().proposals[0].target.targetKey).toBe("schema");
    expect(generate().proposals[0].sourceKeys[0]).toBe("projectRule|pp.canvas.schema.confirmation|1.0.0");
    expect(generate().proposals[0].readinessRequirementIds[0]).toBe("schema");
    expect(generate().proposals[0].applicableDomains[0]).toBe("data");
    expect(generate().proposals[0].value.question).toBe(getPlanningRuleRegistry()[0].question);

    const issueResult = generatePlanningClarificationBlueprints({ projectId: "", drafts: [] });
    (issueResult.issues as Array<unknown>).pop();
    expect(generatePlanningClarificationBlueprints({ projectId: "", drafts: [] }).issues).toHaveLength(1);

    const draft = ttiDrafts()[0];
    const beforeDraft = JSON.stringify(draft);
    generate([draft]);
    expect(JSON.stringify(draft)).toBe(beforeDraft);
    expect(getPlanningRuleById("pp.canvas.schema.confirmation")!.target.targetKey).toBe("schema");
  });

  it("keeps the production module isolated from prohibited behaviours", () => {
    const source = readFileSync("src/lib/planningClarificationBlueprints.ts", "utf8");

    expect(source).not.toMatch(/\bProjectRecord\b|\bProjectPlanningState\b/);
    expect(source).not.toMatch(/projectRepository|storageVersion|STORAGE_KEY|localStorage|browserStorage/);
    expect(source).not.toMatch(/from\s+["']\.\.?\/components|from\s+["']\.\.?\/app|use[A-Z][A-Za-z]+\(/);
    expect(source).not.toMatch(/generateProjectPackage|documentReview|exportManifest|exportProjectPackage|exportIntegrity/);
    expect(source).not.toMatch(/buildPhaseGateResults|evaluatePhaseGate|isPhaseGatePassing|PHASE_GATE_EVALUATORS/);
    expect(source).not.toMatch(/import\s+\{[^}]*\}\s+from\s+["']\.\/phaseGates["']/);
    expect(source).not.toMatch(/randomUUID|createHash|subtle|sha256|SHA-256|crypto|Date\.now|new Date|performance\.now/);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|axios|navigator\.sendBeacon/);
    expect(source).not.toMatch(/provider|modelId|modelName|modelProvider|apiKey|api_key|accessToken|refreshToken|telemetry/i);
    expect(source).not.toMatch(/PlanningProposalRecord|PlanningSourceReference|sourceId|proposalId|appendDecision|createDependency|createConflict/);
    expect(source).not.toMatch(/markStale|superseded|reconcile/i);
  });
});
