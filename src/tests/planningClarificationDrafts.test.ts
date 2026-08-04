// @ts-expect-error -- Vitest runs this static source isolation assertion in Node; the app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PhaseGateId, PhaseGateResult } from "../lib/phaseGates";
import {
  generatePlanningClarificationDrafts,
  type PlanningClarificationDraft,
  type PlanningClarificationDraftGenerationIssueCode
} from "../lib/planningClarificationDrafts";
import { getPlanningRuleById, getPlanningRuleRegistry } from "../lib/planningRules";
import type { PowerPlatformGateStatus, ProjectType } from "../types/project";

const projectId = "tti-software-licence-tracker";

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

function generate(
  gateResults: readonly PhaseGateResult[] = ttiGateResults(),
  projectType: ProjectType = "powerAppsCanvas",
  id = projectId
) {
  return generatePlanningClarificationDrafts({
    projectId: id,
    projectType,
    gateResults
  });
}

function issueCodes(input: unknown): PlanningClarificationDraftGenerationIssueCode[] {
  return generatePlanningClarificationDrafts(input).issues.map((issue) => issue.code);
}

function onlyOneUnresolved(status: PowerPlatformGateStatus): PhaseGateResult[] {
  return ttiGateResults({
    schema: status,
    internalNames: "confirmed",
    screenTargets: "confirmed",
    controlTargets: "confirmed",
    componentTargets: "confirmed",
    yaml: "confirmed",
    delegation: "confirmed",
    security: "confirmed",
    testing: "confirmed",
    alm: "confirmed",
    releaseApproval: "confirmed"
  });
}

function draftKeys(drafts: readonly PlanningClarificationDraft[]): string[] {
  return drafts.map((draft) => draft.draftKey);
}

describe("planning clarification draft generation", () => {
  it("generates the exact ordered 11-draft TTI fixture for valid Canvas input", () => {
    const result = generate();
    const rules = getPlanningRuleRegistry();

    expect(result.issues).toEqual([]);
    expect(result.drafts).toHaveLength(11);
    expect(draftKeys(result.drafts)).toEqual(rules.map((rule) => `${rule.ruleId}|${rule.target.targetKey}`));
    expect(result.drafts.map((draft) => draft.ruleId)).toEqual(rules.map((rule) => rule.ruleId));
    expect(result.drafts.map((draft) => draft.priority)).toEqual(rules.map((rule) => rule.priority));
    expect(result.drafts.map((draft) => draft.target.targetKey)).toEqual(rules.map((rule) => rule.target.targetKey));

    for (const [index, rule] of rules.entries()) {
      const draft = result.drafts[index];
      expect(draft).toMatchObject({
        projectId,
        ruleId: rule.ruleId,
        ruleVersion: rule.ruleVersion,
        target: rule.target,
        category: rule.category,
        restriction: rule.restriction,
        uncertainty: rule.uncertainty,
        title: rule.title,
        question: rule.question,
        rationale: rule.rationale,
        consequence: rule.consequence,
        acceptableSources: rule.acceptableSources,
        notApplicableAllowed: rule.notApplicableAllowed,
        deferralAllowed: rule.deferralAllowed,
        architectApprovalRequired: rule.architectApprovalRequired,
        gateStatus: ttiStatuses[rule.target.targetKey],
        gateBlockingReason: `TTI ${rule.target.targetKey} blocker remains unresolved.`,
        gateSourceSection: `TTI ${rule.target.targetKey} source section`
      });
      expect(draft.value).toEqual({ kind: "clarification", question: rule.question });
    }
  });

  it("returns structured input issues without unexpected throws", () => {
    expect(() => generatePlanningClarificationDrafts(null)).not.toThrow();
    expect(issueCodes(null)).toEqual(["invalidInput"]);
    expect(issueCodes({ projectId: "", projectType: "powerAppsCanvas", gateResults: [] })).toContain("invalidProjectId");
    expect(issueCodes({ projectId: "x".repeat(201), projectType: "powerAppsCanvas", gateResults: [] })).toContain("invalidProjectId");
    expect(issueCodes({ projectId: "one\ntwo", projectType: "powerAppsCanvas", gateResults: [] })).toContain("invalidProjectId");
    expect(issueCodes({ projectId, projectType: "Power Apps Canvas App", gateResults: [] })).toContain("invalidProjectType");
    expect(issueCodes({ projectId, projectType: "powerAppsCanvas", gateResults: {} })).toContain("invalidGateResults");
    expect(issueCodes({ projectId, projectType: "powerAppsCanvas", gateResults: [null] })).toContain("invalidGateResult");
  });

  it("preserves the exact project ID and never trims or rewrites it", () => {
    const spacedId = "  exact-project-id  ";
    const result = generate(ttiGateResults(), "powerAppsCanvas", spacedId);

    expect(result.issues).toEqual([]);
    expect(result.drafts[0].projectId).toBe(spacedId);
  });

  it("selects Canvas rules only for the canonical Canvas project type", () => {
    expect(generate().drafts).toHaveLength(11);
    expect(generate(ttiGateResults(), "businessWebsite").drafts).toEqual([]);
    expect(generate(ttiGateResults(), "businessWebsite").issues).toEqual([]);
    expect(generatePlanningClarificationDrafts({ projectId, projectType: "power apps canvas", gateResults: ttiGateResults() }).drafts).toEqual([]);
    expect(issueCodes({ projectId, projectType: "power apps canvas", gateResults: ttiGateResults() })).toContain("invalidProjectType");
  });

  it("generates a schema draft for every unresolved status", () => {
    for (const status of ["notStarted", "missingInformation", "reviewNeeded", "manualValidationRequired", "inProgress", "blocked", "failed"] as const) {
      const result = generate(onlyOneUnresolved(status));

      expect(result.issues).toEqual([]);
      expect(result.drafts).toHaveLength(1);
      expect(result.drafts[0].ruleId).toBe("pp.canvas.schema.confirmation");
      expect(result.drafts[0].gateStatus).toBe(status);
    }
  });

  it("suppresses drafts for confirmed, ready, and passed statuses", () => {
    for (const status of ["confirmed", "ready", "passed"] as const) {
      expect(generate(onlyOneUnresolved(status)).drafts).toEqual([]);
    }
  });

  it("handles allowed and disallowed Not Applicable statuses exactly", () => {
    expect(generate(ttiGateResults({ componentTargets: "notApplicable" })).drafts.map((draft) => draft.ruleId))
      .not.toContain("pp.canvas.components.confirmation");
    expect(generate(ttiGateResults({ yaml: "notApplicable" })).drafts.map((draft) => draft.ruleId))
      .not.toContain("pp.canvas.yamlplanning.confirmation");

    const mandatory = generate(ttiGateResults({ internalNames: "notApplicable" }));
    expect(mandatory.issues).toEqual([
      expect.objectContaining({
        code: "disallowedNotApplicableStatus",
        ruleId: "pp.sharepoint.internalnames.confirmation",
        gateId: "internalNames",
        field: "status"
      })
    ]);
    expect(mandatory.drafts.map((draft) => draft.ruleId)).toContain("pp.sharepoint.internalnames.confirmation");
  });

  it("produces zero drafts when all applicable gates have allowed resolved statuses", () => {
    const result = generate(ttiGateResults({
      schema: "confirmed",
      internalNames: "ready",
      screenTargets: "passed",
      controlTargets: "confirmed",
      componentTargets: "notApplicable",
      yaml: "notApplicable",
      delegation: "confirmed",
      security: "ready",
      testing: "passed",
      alm: "confirmed",
      releaseApproval: "ready"
    }));

    expect(result).toEqual({ drafts: [], issues: [] });
  });

  it("reports invalid status for a relevant gate and generates no affected draft", () => {
    const gates = ttiGateResults();
    gates[0] = { ...gates[0], status: "almostReady" as PowerPlatformGateStatus };

    const result = generate(gates);

    expect(result.issues).toEqual([
      expect.objectContaining({ code: "invalidGateStatus", gateId: "schema", field: "status" })
    ]);
    expect(result.drafts.map((draft) => draft.ruleId)).not.toContain("pp.canvas.schema.confirmation");
    expect(result.drafts).toHaveLength(10);
  });

  it("matches gates by exact PhaseGateId and never aliases or guesses", () => {
    const gates = ttiGateResults().filter((result) => result.id !== "schema");
    gates.push({ ...gate("powerFx", "reviewNeeded"), id: "powerFx" });

    const result = generate(gates);

    expect(result.issues).toEqual([
      expect.objectContaining({
        code: "missingGateResult",
        ruleId: "pp.canvas.schema.confirmation",
        gateId: "schema"
      })
    ]);
    expect(result.drafts.map((draft) => draft.ruleId)).not.toContain("pp.canvas.schema.confirmation");
  });

  it("reports missing and duplicate relevant gate results without selecting a duplicate", () => {
    const missing = generate(ttiGateResults().filter((result) => result.id !== "testing"));
    expect(missing.issues).toEqual([
      expect.objectContaining({
        code: "missingGateResult",
        ruleId: "pp.testing.outcomes.confirmation",
        gateId: "testing"
      })
    ]);
    expect(missing.drafts.map((draft) => draft.ruleId)).not.toContain("pp.testing.outcomes.confirmation");

    const duplicate = generate([...ttiGateResults(), gate("security", "blocked", "second security blocker", "second security section")]);
    expect(duplicate.issues).toEqual([
      expect.objectContaining({
        code: "duplicateGateResult",
        ruleId: "pp.security.permissions.confirmation",
        gateId: "security"
      })
    ]);
    expect(duplicate.drafts.map((draft) => draft.ruleId)).not.toContain("pp.security.permissions.confirmation");
  });

  it("ignores unrelated valid gates and duplicate unrelated gates", () => {
    const withUnrelated = [
      gate("scope", "blocked"),
      ...ttiGateResults(),
      gate("scope", "confirmed"),
      gate("powerFx", "failed")
    ];

    expect(generate(withUnrelated)).toEqual(generate(ttiGateResults()));
  });

  it("preserves valid unrelated processing when a relevant gate is malformed", () => {
    const gates = ttiGateResults();
    gates[2] = { ...gates[2], sourceSection: 100 as unknown as string };

    const result = generate(gates);

    expect(result.issues).toEqual([
      expect.objectContaining({ code: "invalidGateResult", gateId: "screenTargets", field: "gateResults" })
    ]);
    expect(result.drafts.map((draft) => draft.ruleId)).not.toContain("pp.canvas.screentargets.confirmation");
    expect(result.drafts).toHaveLength(10);
  });

  it("is independent from input gate-result order", () => {
    const forward = generate(ttiGateResults());
    const reversed = generate([...ttiGateResults()].reverse());

    expect(reversed).toEqual(forward);
  });

  it("uses the exact non-persisted draft contract and excludes proposal metadata", () => {
    const draft = generate().drafts[0];

    expect(Object.keys(draft)).toEqual([
      "draftKey",
      "projectId",
      "ruleId",
      "ruleVersion",
      "target",
      "category",
      "restriction",
      "uncertainty",
      "value",
      "title",
      "question",
      "rationale",
      "consequence",
      "priority",
      "acceptableSources",
      "notApplicableAllowed",
      "deferralAllowed",
      "architectApprovalRequired",
      "gateStatus",
      "gateBlockingReason",
      "gateSourceSection"
    ]);
    expect(draft).not.toHaveProperty("proposalId");
    expect(draft).not.toHaveProperty("sourceId");
    expect(draft).not.toHaveProperty("fingerprint");
    expect(draft).not.toHaveProperty("createdAt");
    expect(draft).not.toHaveProperty("updatedAt");
    expect(draft).not.toHaveProperty("status");
    expect(draft).not.toHaveProperty("actor");
    expect(draft).not.toHaveProperty("readinessEligible");
    expect(draft).not.toHaveProperty("outputEligible");
    expect(draft.value).toEqual({ kind: "clarification", question: draft.question });
  });

  it("keeps TTI drafts clarification-only and free of substantive generated answers", () => {
    const serialized = JSON.stringify(generate().drafts);

    expect(serialized).not.toMatch(/proposalId|sourceId|fingerprint|createdAt|updatedAt|PlanningProposalRecord|PlanningSourceReference/);
    expect(serialized).not.toMatch(/Patch\(|Set\(|Collect\(|SubmitForm\(|Navigate\(/);
    expect(serialized).not.toMatch(/screens:\s*\n|controls:\s*\n|OnSelect:/i);
    expect(serialized).not.toMatch(/HomeScreen|SubmitButton|AdminGroup|Release approved|owner assigned/i);
    expect(serialized).not.toMatch(/Dataverse logical name|premium connector|custom connector|Graph|Power BI|SPFx/i);
    expect(serialized).not.toMatch(/https?:\/\/|api key|accessToken|refreshToken|modelId|modelName|modelProvider|telemetry/i);
  });

  it("does not mutate input arrays or gate-result records", () => {
    const gates = ttiGateResults();
    const before = JSON.stringify(gates);

    generate(gates);

    expect(JSON.stringify(gates)).toBe(before);
  });

  it("protects returned drafts, nested fields, values, issues, and the rule registry from external mutation", () => {
    const first = generate();
    (first.drafts as PlanningClarificationDraft[]).pop();
    expect(generate().drafts).toHaveLength(11);

    const draft = generate().drafts[0] as PlanningClarificationDraft;
    draft.target.targetKey = "testing";
    draft.acceptableSources[0].authority = "informational";
    draft.value.question = "Changed question";

    const rule = getPlanningRuleById("pp.canvas.schema.confirmation")!;
    expect(rule.target.targetKey).toBe("schema");
    expect(rule.acceptableSources[0].authority).toBe("confirmed");
    expect(generate().drafts[0].value.question).toBe(rule.question);

    const issueResult = generatePlanningClarificationDrafts({ projectId: "", projectType: "powerAppsCanvas", gateResults: [] });
    (issueResult.issues as Array<unknown>).pop();
    expect(generatePlanningClarificationDrafts({ projectId: "", projectType: "powerAppsCanvas", gateResults: [] }).issues).toHaveLength(1);
  });

  it("keeps the production module isolated from prohibited behaviours", () => {
    const source = readFileSync("src/lib/planningClarificationDrafts.ts", "utf8");

    expect(source).not.toMatch(/\bProjectRecord\b|\bProjectPlanningState\b/);
    expect(source).not.toMatch(/projectRepository|storageVersion|STORAGE_KEY|localStorage|browserStorage/);
    expect(source).not.toMatch(/from\s+["']\.\.?\/components|from\s+["']\.\.?\/app|use[A-Z][A-Za-z]+\(/);
    expect(source).not.toMatch(/generateProjectPackage|documentReview|exportManifest|exportProjectPackage|exportIntegrity/);
    expect(source).not.toMatch(/import\s+\{[^}]*\}\s+from\s+["']\.\/phaseGates["']/);
    expect(source).not.toMatch(/buildPhaseGateResults|evaluatePhaseGate|isPhaseGatePassing|PHASE_GATE_EVALUATORS/);
    expect(source).not.toMatch(/randomUUID|crypto|fingerprint|Date\.now|new Date|performance\.now/);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|axios|navigator\.sendBeacon/);
    expect(source).not.toMatch(/provider|modelId|modelName|modelProvider|apiKey|api_key|accessToken|refreshToken|telemetry/i);
    expect(source).not.toMatch(/PlanningProposalRecord|PlanningSourceReference|sourceId|createPlanningProposal|createPlanningSource/);
    expect(source).not.toMatch(/appendDecision|createDependency|createConflict|markStale|superseded|reconcile/i);
  });
});
