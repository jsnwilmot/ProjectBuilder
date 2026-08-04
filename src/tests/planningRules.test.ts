// @ts-expect-error -- Vitest runs this static source isolation assertion in Node; the app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PLANNING_RULE_REGISTRY_ID,
  PLANNING_RULE_REGISTRY_VERSION,
  PLANNING_RULE_STATUSES,
  getActivePlanningRuleForReadinessGate,
  getActivePlanningRulesForProjectType,
  getPlanningRuleById,
  getPlanningRuleRegistry,
  validatePlanningRuleRegistry,
  type PlanningClarificationRule,
  type PlanningRuleRegistryDefinition,
  type PlanningRuleValidationIssueCode
} from "../lib/planningRules";

const expectedRules = [
  {
    ruleId: "pp.canvas.schema.confirmation",
    priority: 100,
    targetKey: "schema",
    domain: "data",
    restriction: "authoritativeSourceRequired",
    notApplicableAllowed: false,
    title: "Confirm the backend schema",
    question: "What approved backend schema should be used, including the data sources, relationships, expected record volumes, ownership, and confirmation source?",
    rationale: "Data-bound implementation cannot safely proceed until the backend structure and its authoritative confirmation source are documented.",
    consequence: "The schema gate remains unresolved and later data-bound implementation phases remain blocked."
  },
  {
    ruleId: "pp.sharepoint.internalnames.confirmation",
    priority: 200,
    targetKey: "internalNames",
    domain: "data",
    restriction: "authoritativeSourceRequired",
    notApplicableAllowed: false,
    title: "Confirm SharePoint internal column names",
    question: "What are the authoritative SharePoint internal column names for every column used by the application?",
    rationale: "SharePoint internal names cannot be derived from display names and renamed columns retain their original internal names.",
    consequence: "SharePoint-bound formulas, mappings, and implementation targets remain blocked."
  },
  {
    ruleId: "pp.canvas.screentargets.confirmation",
    priority: 300,
    targetKey: "screenTargets",
    domain: "powerPlatform",
    restriction: "authoritativeSourceRequired",
    notApplicableAllowed: false,
    title: "Confirm Canvas screen targets",
    question: "What are the approved stable screen targets, including their IDs, names, purposes, confirmation status, and confirmation source?",
    rationale: "Screen targets must be explicitly confirmed before implementation assets or formulas can reference them.",
    consequence: "Screen-bound implementation, formula planning, and YAML planning remain blocked."
  },
  {
    ruleId: "pp.canvas.controltargets.confirmation",
    priority: 400,
    targetKey: "controlTargets",
    domain: "powerPlatform",
    restriction: "authoritativeSourceRequired",
    notApplicableAllowed: false,
    title: "Confirm Canvas control targets",
    question: "What are the approved stable control targets, including their IDs, names, control types, parent screens, purposes, formula properties, and confirmation sources?",
    rationale: "Control names, types, parent relationships, and formula properties cannot be invented or inferred.",
    consequence: "Control-bound implementation and Power Fx target planning remain blocked."
  },
  {
    ruleId: "pp.canvas.components.confirmation",
    priority: 500,
    targetKey: "componentTargets",
    domain: "powerPlatform",
    restriction: "clarificationOnly",
    notApplicableAllowed: true,
    title: "Confirm Canvas component applicability",
    question: "Are reusable Canvas components required, and if so, what are their approved names, purposes, inputs, outputs, usage locations, and confirmation sources?",
    rationale: "Reusable components require structured targets, while a not-applicable decision requires a controlled confirmed reason.",
    consequence: "Component and related YAML planning remain unresolved until applicability is confirmed."
  },
  {
    ruleId: "pp.canvas.yamlplanning.confirmation",
    priority: 600,
    targetKey: "yaml",
    domain: "powerPlatform",
    restriction: "clarificationOnly",
    notApplicableAllowed: true,
    title: "Confirm Canvas YAML planning",
    question: "Who is responsible for installing and validating any approved Canvas YAML, where would it be applied, and is YAML applicable to this project?",
    rationale: "YAML applicability, installation location, parent relationship, and validation responsibility must be confirmed without generating paste-ready YAML.",
    consequence: "YAML remains unavailable for implementation and no paste-ready YAML may be produced."
  },
  {
    ruleId: "pp.canvas.delegation.confirmation",
    priority: 700,
    targetKey: "delegation",
    domain: "powerPlatform",
    restriction: "clarificationOnly",
    notApplicableAllowed: false,
    title: "Confirm delegation planning",
    question: "What record volumes, search patterns, filter operations, sort operations, connector limitations, and mitigation requirements must be considered for delegation?",
    rationale: "Delegation behaviour depends on the selected connector, data shape, expected volume, and planned query operations.",
    consequence: "Search, filtering, sorting, and large-data implementation remain blocked from final approval."
  },
  {
    ruleId: "pp.security.permissions.confirmation",
    priority: 800,
    targetKey: "security",
    domain: "security",
    restriction: "architectApprovalRequired",
    notApplicableAllowed: false,
    title: "Confirm the permission matrix",
    question: "What can each approved user role view, create, edit, archive, restore, approve, or administer, and what authoritative permission source confirms those decisions?",
    rationale: "Role names alone do not define permissions, and least-privilege access must be explicitly documented.",
    consequence: "Security review remains unresolved and implementation cannot claim an approved access model."
  },
  {
    ruleId: "pp.testing.outcomes.confirmation",
    priority: 900,
    targetKey: "testing",
    domain: "testing",
    restriction: "architectApprovalRequired",
    notApplicableAllowed: false,
    title: "Confirm observable testing outcomes",
    question: "What observable outcomes will prove the project is complete, who will perform each test, and in which approved environment will each test occur?",
    rationale: "Testing requirements must be measurable and must identify responsibility and environment without claiming that testing has already occurred.",
    consequence: "The testing gate remains unresolved and completion cannot be objectively demonstrated."
  },
  {
    ruleId: "pp.alm.rollback.confirmation",
    priority: 1000,
    targetKey: "alm",
    domain: "deployment",
    restriction: "architectApprovalRequired",
    notApplicableAllowed: false,
    title: "Confirm ALM and rollback responsibilities",
    question: "Who owns source control, solution packaging, connection references, environment variables, deployment, rollback, and recovery responsibilities?",
    rationale: "ALM responsibilities must be explicitly assigned before publication or deployment can be approved.",
    consequence: "ALM readiness remains unresolved and deployment phases remain blocked."
  },
  {
    ruleId: "pp.release.approval.confirmation",
    priority: 1100,
    targetKey: "releaseApproval",
    domain: "deployment",
    restriction: "architectApprovalRequired",
    notApplicableAllowed: false,
    title: "Confirm release approval responsibility",
    question: "Who is authorized to approve release, what evidence must be reviewed, and what controlled status records that approval?",
    rationale: "Release approval requires a named responsibility, evidence requirements, and controlled confirmation status.",
    consequence: "The project cannot be approved for release or deployment."
  }
] as const;

const exactSources = [
  { sourceType: "userAnswer", authority: "confirmed", availability: "current" },
  { sourceType: "confirmedIntake", authority: "confirmed", availability: "current" },
  { sourceType: "approvedDocument", authority: "approved", availability: "current" }
] as const;

function registryFromRules(rules: PlanningClarificationRule[]): PlanningRuleRegistryDefinition {
  return {
    registryId: PLANNING_RULE_REGISTRY_ID,
    registryVersion: PLANNING_RULE_REGISTRY_VERSION,
    rules
  };
}

function issueCodes(input: unknown): PlanningRuleValidationIssueCode[] {
  return validatePlanningRuleRegistry(input).issues.map((issue) => issue.code);
}

function mutateRule(
  mutation: (rule: PlanningClarificationRule) => void,
  index = 0
): PlanningRuleRegistryDefinition {
  const rules = getPlanningRuleRegistry();
  mutation(rules[index]);
  return registryFromRules(rules);
}

describe("planning clarification rule registry", () => {
  it("exposes the exact registry identity and exactly 11 deterministic rules", () => {
    const rules = getPlanningRuleRegistry();

    expect(PLANNING_RULE_REGISTRY_ID).toBe("project-builder-clarification-rules");
    expect(PLANNING_RULE_REGISTRY_VERSION).toBe("phase-5c.2.1a");
    expect(PLANNING_RULE_STATUSES).toEqual(["active", "deprecated"]);
    expect(rules).toHaveLength(11);
    expect(rules.map((rule) => rule.ruleId)).toEqual(expectedRules.map((rule) => rule.ruleId));
  });

  it("matches every approved initial rule exactly", () => {
    const rules = getPlanningRuleRegistry();

    for (const expected of expectedRules) {
      const actual = rules.find((rule) => rule.ruleId === expected.ruleId);
      expect(actual).toMatchObject({
        ruleId: expected.ruleId,
        priority: expected.priority,
        target: {
          kind: "readinessRequirement",
          operation: "clarificationOnly",
          targetKey: expected.targetKey,
          domain: expected.domain
        },
        restriction: expected.restriction,
        title: expected.title,
        question: expected.question,
        rationale: expected.rationale,
        consequence: expected.consequence,
        notApplicableAllowed: expected.notApplicableAllowed
      });
    }
  });

  it("keeps all initial rules within the clarification-only contract", () => {
    for (const rule of getPlanningRuleRegistry()) {
      expect(rule.category).toBe("clarification");
      expect(rule.target.kind).toBe("readinessRequirement");
      expect(rule.target.operation).toBe("clarificationOnly");
      expect(rule.uncertainty).toBe("Unknown");
      expect(rule.ruleVersion).toBe("1.0.0");
      expect(rule.status).toBe("active");
      expect(rule.architectApprovalRequired).toBe(true);
      expect(rule.deferralAllowed).toBe(true);
      expect(rule.applicableProjectTypes).toEqual(["powerAppsCanvas"]);
      expect(rule.deprecatedByRuleId).toBeUndefined();
    }
  });

  it("uses exactly the approved current source-authority pairs", () => {
    for (const rule of getPlanningRuleRegistry()) {
      expect(rule.acceptableSources).toEqual(exactSources);
      expect(rule.acceptableSources.some((source) => source.authority === "informational")).toBe(false);
      expect(rule.acceptableSources.some((source) => source.availability !== "current")).toBe(false);
    }
  });

  it("validates the built-in registry and unordered but otherwise valid inputs", () => {
    expect(validatePlanningRuleRegistry().valid).toBe(true);
    expect(validatePlanningRuleRegistry(registryFromRules([...getPlanningRuleRegistry()].reverse())).valid).toBe(true);
  });

  it("returns structured issues for invalid registry envelopes without throwing", () => {
    expect(() => validatePlanningRuleRegistry(null)).not.toThrow();
    expect(issueCodes(null)).toContain("invalidRegistry");
    expect(issueCodes({ registryId: "wrong", registryVersion: PLANNING_RULE_REGISTRY_VERSION, rules: [] })).toContain(
      "invalidRegistryIdentity"
    );
    expect(issueCodes({ registryId: PLANNING_RULE_REGISTRY_ID, registryVersion: "wrong", rules: [] })).toContain(
      "invalidRegistryVersion"
    );
    expect(issueCodes({ registryId: PLANNING_RULE_REGISTRY_ID, registryVersion: PLANNING_RULE_REGISTRY_VERSION, rules: {} })).toContain(
      "invalidRegistry"
    );
  });

  it("rejects missing fields and invalid rule IDs, versions, statuses, priorities, project types, and targets", () => {
    expect(issueCodes(registryFromRules([{} as PlanningClarificationRule]))).toEqual(
      expect.arrayContaining(["invalidRuleId", "invalidRuleVersion", "invalidRuleStatus", "invalidPriority"])
    );
    expect(issueCodes(mutateRule((rule) => { rule.ruleId = "PP.bad"; }))).toContain("invalidRuleId");
    expect(issueCodes(mutateRule((rule) => { rule.ruleVersion = "1"; }))).toContain("invalidRuleVersion");
    expect(issueCodes(mutateRule((rule) => { rule.status = "draft" as PlanningClarificationRule["status"]; }))).toContain("invalidRuleStatus");
    expect(issueCodes(mutateRule((rule) => { rule.priority = 0; }))).toContain("invalidPriority");
    expect(issueCodes(mutateRule((rule) => { rule.applicableProjectTypes = ["powerAppsModelDriven"]; }))).toContain("invalidProjectType");
    expect(issueCodes(mutateRule((rule) => { rule.target.targetKey = "screenTargets[0]" as PlanningClarificationRule["target"]["targetKey"]; }))).toContain("invalidTarget");
  });

  it("rejects invalid category, restriction, uncertainty, and source-authority combinations", () => {
    expect(issueCodes(mutateRule((rule) => { rule.category = "assumption"; }))).toContain("invalidCategory");
    expect(issueCodes(mutateRule((rule) => { rule.restriction = "neverAutoGenerate"; }))).toContain("invalidRestriction");
    expect(issueCodes(mutateRule((rule) => { rule.uncertainty = "Known"; }))).toContain("invalidUncertainty");
    expect(issueCodes(mutateRule((rule) => { rule.acceptableSources[0].authority = "informational"; }))).toContain("invalidSourceRequirement");
    expect(issueCodes(mutateRule((rule) => { rule.acceptableSources[0].availability = "stale"; }))).toContain("invalidSourceRequirement");
    expect(issueCodes(mutateRule((rule) => { rule.acceptableSources[0].sourceType = "generalRecommendation"; }))).toContain("invalidSourceRequirement");
  });

  it("rejects duplicate IDs and duplicate priorities", () => {
    expect(issueCodes(mutateRule((rule) => { rule.ruleId = expectedRules[1].ruleId; }))).toContain("duplicateRuleId");
    expect(issueCodes(mutateRule((rule) => { rule.priority = expectedRules[1].priority; }))).toContain("duplicatePriority");
  });

  it("rejects empty, over-length, executable, final-formula, and paste-ready YAML-like text", () => {
    expect(issueCodes(mutateRule((rule) => { rule.title = ""; }))).toContain("invalidText");
    expect(issueCodes(mutateRule((rule) => { rule.question = "x".repeat(501); }))).toContain("invalidText");
    expect(issueCodes(mutateRule((rule) => { rule.rationale = "function run() { return true; }"; }))).toContain("invalidText");
    expect(issueCodes(mutateRule((rule) => { rule.consequence = "Patch(Items, selectedRecord)"; }))).toContain("invalidText");
    expect(issueCodes(mutateRule((rule) => { rule.question = "screens:\n  - name: Home"; }))).toContain("invalidText");
  });

  it("validates deprecation metadata and cycles without mutating input", () => {
    const activeWithReplacement = mutateRule((rule) => { rule.deprecatedByRuleId = expectedRules[1].ruleId; });
    expect(issueCodes(activeWithReplacement)).toContain("invalidDeprecation");

    const missingReplacement = mutateRule((rule) => {
      rule.status = "deprecated";
      rule.deprecatedByRuleId = "missing.rule";
    });
    expect(issueCodes(missingReplacement)).toContain("invalidDeprecation");

    const selfReplacement = mutateRule((rule) => {
      rule.status = "deprecated";
      rule.deprecatedByRuleId = rule.ruleId;
    });
    expect(issueCodes(selfReplacement)).toContain("invalidDeprecation");

    const cycle = getPlanningRuleRegistry();
    cycle[0].status = "deprecated";
    cycle[0].deprecatedByRuleId = cycle[1].ruleId;
    cycle[1].status = "deprecated";
    cycle[1].deprecatedByRuleId = cycle[0].ruleId;
    expect(issueCodes(registryFromRules(cycle))).toContain("deprecationCycle");
  });

  it("sorts deterministically by priority with rule ID tie-breaker", () => {
    const reversed = registryFromRules([...getPlanningRuleRegistry()].reverse());
    expect(validatePlanningRuleRegistry(reversed).valid).toBe(true);
    expect(getPlanningRuleRegistry().map((rule) => rule.priority)).toEqual(expectedRules.map((rule) => rule.priority));

    const tied = getPlanningRuleRegistry().slice(0, 2).reverse();
    tied[0].priority = 100;
    tied[1].priority = 100;
    expect(
      tied.sort((first, second) => first.priority - second.priority || first.ruleId.localeCompare(second.ruleId))
        .map((rule) => rule.ruleId)
    ).toEqual(["pp.canvas.schema.confirmation", "pp.sharepoint.internalnames.confirmation"]);
  });

  it("performs exact lookups without guessing or aliasing", () => {
    expect(getPlanningRuleById("pp.canvas.schema.confirmation")?.title).toBe("Confirm the backend schema");
    expect(getPlanningRuleById("PP.canvas.schema.confirmation")).toBeUndefined();
    expect(getPlanningRuleById("missing.rule")).toBeUndefined();

    expect(getActivePlanningRulesForProjectType("powerAppsCanvas").map((rule) => rule.ruleId)).toEqual(
      expectedRules.map((rule) => rule.ruleId)
    );
    expect(getActivePlanningRulesForProjectType("businessWebsite")).toEqual([]);

    expect(getActivePlanningRuleForReadinessGate("schema")?.ruleId).toBe("pp.canvas.schema.confirmation");
    expect(getActivePlanningRuleForReadinessGate("powerFx")).toBeUndefined();
  });

  it("protects registry, rule, target, and source requirement results from external mutation", () => {
    const first = getPlanningRuleRegistry();
    first.pop();
    expect(getPlanningRuleRegistry()).toHaveLength(11);

    const rule = getPlanningRuleById("pp.canvas.schema.confirmation")!;
    rule.title = "Changed";
    expect(getPlanningRuleById("pp.canvas.schema.confirmation")?.title).toBe("Confirm the backend schema");

    rule.target.targetKey = "testing";
    expect(getPlanningRuleById("pp.canvas.schema.confirmation")?.target.targetKey).toBe("schema");

    rule.acceptableSources[0].authority = "informational";
    expect(getPlanningRuleById("pp.canvas.schema.confirmation")?.acceptableSources).toEqual(exactSources);
  });

  it("does not mutate validation input", () => {
    const input = registryFromRules([...getPlanningRuleRegistry()].reverse());
    const before = JSON.stringify(input);

    validatePlanningRuleRegistry(input);

    expect(JSON.stringify(input)).toBe(before);
  });

  it("keeps the production module isolated from prohibited behaviours", () => {
    const source = readFileSync("src/lib/planningRules.ts", "utf8");

    expect(source).not.toMatch(/\bProjectRecord\b/);
    expect(source).not.toMatch(/projectRepository|storageVersion|STORAGE_KEY|localStorage|browserStorage/);
    expect(source).not.toMatch(/from\s+["']\.\.?\/components|from\s+["']\.\.?\/app/);
    expect(source).not.toMatch(/generateProjectPackage|documentReview|exportManifest|exportProjectPackage|exportIntegrity/);
    expect(source).not.toMatch(/import\s+\{[^}]*\}\s+from\s+["']\.\/phaseGates["']/);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|axios|navigator\.sendBeacon/);
    expect(source).not.toMatch(/provider|modelId|modelName|modelProvider|apiKey|api_key|accessToken|refreshToken|telemetry/i);
    expect(source).not.toMatch(/PlanningProposalRecord|PlanningSourceReference|sourceId|fingerprint|randomUUID|crypto/);
    expect(source).not.toMatch(/createPlanningProposal|createPlanningSource|appendDecision|markStale|superseded/);
  });
});
