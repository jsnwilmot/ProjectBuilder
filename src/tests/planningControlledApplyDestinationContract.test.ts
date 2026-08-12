import { describe, expect, it } from "vitest";
import {
  analyzePlanningControlledApplyProjectFieldDestination,
  type PlanningControlledApplyProjectFieldDestinationIssueCode
} from "../lib/planningControlledApplyDestinationContract";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningDependencyRecord,
  type ProjectPlanningState,
  type PlanningProposalRecord,
  type PlanningProposalValue,
  type PlanningSourceReference
} from "../lib/planningProposals";
import { getPlanningRuleRegistry } from "../lib/planningRules";
import { createProject, EMPTY_PROJECT_INTAKE } from "../lib/createProject";
import type { ProjectIntake, ProjectRecord } from "../types/project";

const projectId = "controlled-apply-destination-project";
const sourceId = "11111111-1111-4111-8111-111111111111";
const approvedSourceId = "11111111-1111-4111-8111-111111111112";
const proposalId = "22222222-2222-4222-8222-222222222222";
const otherProposalId = "22222222-2222-4222-8222-222222222223";
const decisionId = "33333333-3333-4333-8333-333333333333";
const dependencyId = "44444444-4444-4444-8444-444444444444";
const conflictId = "55555555-5555-4555-8555-555555555555";
const alternativeGroupId = "66666666-6666-4666-8666-666666666666";
const fingerprint = "c".repeat(64);
const timestamp = "2026-08-12T01:00:00.000Z";
const desiredValue = "Confirmed destination value";

function textValue(value = desiredValue): PlanningProposalValue {
  return { kind: "text", value };
}

function source(overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return {
    sourceId,
    sourceType: "confirmedIntake",
    locator: "intake.appPurpose",
    label: "Confirmed intake",
    authority: "confirmed",
    availability: "current",
    ...overrides
  };
}

function proposal(fieldKey = "appPurpose", overrides: Partial<PlanningProposalRecord> = {}): PlanningProposalRecord {
  return {
    proposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: `future.project-field.${fieldKey}`,
    ruleVersion: "1.0.0",
    fingerprint,
    target: {
      kind: "projectField",
      domain: "foundation",
      targetKey: fieldKey,
      fieldKey,
      operation: "setValue"
    },
    category: "architectProposal",
    status: "Confirmed",
    value: textValue(),
    title: `Apply ${fieldKey}`,
    recommendation: "Use the confirmed future value.",
    rationale: "This fixture models a future explicit project-field proposal.",
    sourceIds: [sourceId],
    uncertainty: "Known",
    restriction: "concreteProposalAllowed",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastDecisionId: decisionId,
    ...overrides
  };
}

function decision(overrides: Partial<PlanningDecisionRecord> = {}): PlanningDecisionRecord {
  return {
    decisionId,
    proposalId,
    projectId,
    action: "confirm",
    previousStatus: "Revised",
    resultingStatus: "Confirmed",
    origin: "userAction",
    recordedAt: timestamp,
    sourceIds: [sourceId],
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ...overrides
  };
}

function dependency(overrides: Partial<PlanningDependencyRecord> = {}): PlanningDependencyRecord {
  return {
    dependencyId,
    sourceProposalId: proposalId,
    dependencyType: "requiresProposal",
    target: { kind: "proposalId", proposalId: otherProposalId },
    required: true,
    rationale: "Dependency fixture.",
    ...overrides
  };
}

function conflict(overrides: Partial<PlanningConflictRecord> = {}): PlanningConflictRecord {
  return {
    conflictId,
    projectId,
    conflictType: "proposalVsIntake",
    severity: "blocking",
    status: "open",
    involvedReferences: [{ kind: "proposalId", proposalId }],
    explanation: "Conflict fixture.",
    blocking: true,
    createdAt: timestamp,
    ...overrides
  };
}

function planning(overrides: {
  sources?: PlanningSourceReference[];
  proposals?: PlanningProposalRecord[];
  decisions?: PlanningDecisionRecord[];
  dependencies?: PlanningDependencyRecord[];
  conflicts?: PlanningConflictRecord[];
} = {}): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: overrides.sources ?? [source()],
    proposals: overrides.proposals ?? [proposal()],
    decisions: overrides.decisions ?? [decision()],
    dependencies: overrides.dependencies ?? [],
    conflicts: overrides.conflicts ?? []
  };
}

function projectForDestination(options: {
  fieldKey?: string;
  currentValue?: string;
  proposalRecord?: PlanningProposalRecord;
  sources?: PlanningSourceReference[];
  decisions?: PlanningDecisionRecord[];
  dependencies?: PlanningDependencyRecord[];
  conflicts?: PlanningConflictRecord[];
  archivedAt?: string | null;
  includePlanning?: boolean;
} = {}): ProjectRecord {
  const fieldKey = options.fieldKey ?? "appPurpose";
  const currentValue = options.currentValue ?? "";
  const identity = { id: projectId, projectName: fieldKey === "appName" ? currentValue : "" };
  const client = {
    clientName: fieldKey === "clientName" ? currentValue : "",
    businessName: fieldKey === "businessName" ? currentValue : ""
  };
  const intake: Partial<ProjectIntake> = {};
  if (fieldKey !== "appName" && fieldKey !== "clientName" && fieldKey !== "businessName") {
    (intake as Record<string, string>)[fieldKey] = currentValue;
  }

  const project = createProject({
    identity,
    client,
    intake,
    archivedAt: options.archivedAt ?? null,
    now: timestamp
  });
  if (options.includePlanning === false) {
    return project;
  }
  return {
    ...project,
    planning: planning({
      sources: options.sources,
      proposals: [options.proposalRecord ?? proposal(fieldKey)],
      decisions: options.decisions,
      dependencies: options.dependencies,
      conflicts: options.conflicts
    })
  };
}

function analyze(project: ProjectRecord = projectForDestination()) {
  return analyzePlanningControlledApplyProjectFieldDestination({ project, proposalId });
}

function expectBlockedCode(
  result: ReturnType<typeof analyzePlanningControlledApplyProjectFieldDestination>,
  code: PlanningControlledApplyProjectFieldDestinationIssueCode
): void {
  expect(result).toMatchObject({
    outcome: "blocked",
    issues: [expect.objectContaining({ code })]
  });
}

function expectProjectUnchanged(project: ProjectRecord, action: () => void): void {
  const before = JSON.stringify(project);
  action();
  expect(JSON.stringify(project)).toBe(before);
}

describe("planning controlled apply project-field destination contract", () => {
  it("returns ready for an empty ordinary intake destination with the exact expected-value plan", () => {
    const project = projectForDestination({ fieldKey: "appPurpose", currentValue: "" });
    const before = JSON.stringify(project);
    const result = analyze(project);
    const repeat = analyze(project);

    expect(result).toEqual(repeat);
    expect(result).toMatchObject({
      outcome: "ready",
      issues: [],
      plan: {
        projectId,
        proposalId,
        decisionId,
        fieldKey: "appPurpose",
        desiredValue,
        expectedCurrentValue: "",
        sourceIds: [sourceId],
        writeAuthorized: false,
        readinessEligible: false,
        outputEligible: false
      }
    });
    expect(JSON.stringify(project)).toBe(before);
  });

  it("treats whitespace-only destinations as ready while preserving the raw expected value", () => {
    const project = projectForDestination({ currentValue: " \r\n\t " });
    const result = analyze(project);

    expect(result).toMatchObject({
      outcome: "ready",
      plan: { expectedCurrentValue: " \r\n\t " }
    });
  });

  it("returns unchanged only for exact raw string equality", () => {
    const project = projectForDestination({ currentValue: desiredValue });
    expectProjectUnchanged(project, () => {
      expect(analyze(project)).toMatchObject({
        outcome: "unchanged",
        plan: { expectedCurrentValue: desiredValue, desiredValue }
      });
    });
  });

  it.each([
    ["trailing whitespace", `${desiredValue} `],
    ["leading whitespace", ` ${desiredValue}`],
    ["case difference", desiredValue.toUpperCase()],
    ["punctuation difference", `${desiredValue}.`],
    ["newline difference", desiredValue.replace(" ", "\n")]
  ])("blocks a near-match destination with %s", (_label, currentValue) => {
    expectBlockedCode(analyze(projectForDestination({ currentValue })), "destinationConflict");
  });

  it("blocks meaningful existing destination values without using source precedence as overwrite authority", () => {
    expectBlockedCode(analyze(projectForDestination({ currentValue: "Existing confirmed project value" })), "destinationConflict");
    expectBlockedCode(
      analyze(projectForDestination({
        currentValue: "Existing confirmed project value",
        sources: [source({ sourceId: approvedSourceId, sourceType: "approvedDocument", authority: "approved" })],
        proposalRecord: proposal("appPurpose", { sourceIds: [approvedSourceId] }),
        decisions: [decision({ sourceIds: [approvedSourceId] })]
      })),
      "destinationConflict"
    );
  });

  it.each(["Unknown yet", "TBD", "N/A", "Missing information"])("keeps marker-like value %s meaningful", (currentValue) => {
    expectBlockedCode(analyze(projectForDestination({ currentValue })), "destinationConflict");
  });

  it("supports appName without aliases and blocks a different existing project name", () => {
    expect(analyze(projectForDestination({ fieldKey: "appName", currentValue: "" }))).toMatchObject({
      outcome: "ready",
      plan: { fieldKey: "appName", expectedCurrentValue: "" }
    });
    expectBlockedCode(analyze(projectForDestination({ fieldKey: "appName", currentValue: "Existing app" })), "destinationConflict");
  });

  it.each(["clientName", "businessName"] as const)("supports %s empty, unchanged, and conflict behavior", (fieldKey) => {
    expect(analyze(projectForDestination({ fieldKey, currentValue: "" }))).toMatchObject({
      outcome: "ready",
      plan: { fieldKey, expectedCurrentValue: "" }
    });
    expect(analyze(projectForDestination({ fieldKey, currentValue: desiredValue }))).toMatchObject({
      outcome: "unchanged",
      plan: { fieldKey, expectedCurrentValue: desiredValue }
    });
    expectBlockedCode(analyze(projectForDestination({ fieldKey, currentValue: "Existing client value" })), "destinationConflict");
  });

  it("recognizes ordinary intake keys through EMPTY_PROJECT_INTAKE ownership", () => {
    expect(Object.prototype.hasOwnProperty.call(EMPTY_PROJECT_INTAKE, "successCriteria")).toBe(true);
    expect(analyze(projectForDestination({ fieldKey: "successCriteria", currentValue: "" }))).toMatchObject({
      outcome: "ready",
      plan: { fieldKey: "successCriteria", expectedCurrentValue: "" }
    });
  });

  it("blocks appType because it has existing side-effecting normalization behavior", () => {
    expectBlockedCode(analyze(projectForDestination({ fieldKey: "appType", currentValue: "" })), "unsupportedSideEffectField");
  });

  it("blocks unknown runtime project fields after D.3A structural candidate validation passes", () => {
    expectBlockedCode(analyze(projectForDestination({ fieldKey: "notAProjectField", currentValue: "" })), "unsupportedProjectField");
  });

  it("blocks archived projects and missing planning before destination readiness", () => {
    expectProjectUnchanged(projectForDestination({ archivedAt: timestamp }), () => {
      expectBlockedCode(analyze(projectForDestination({ archivedAt: timestamp })), "projectArchived");
    });
    expectBlockedCode(analyze(projectForDestination({ includePlanning: false })), "planningMissing");
  });

  it("blocks malformed input, malformed projects, and unreadable destinations", () => {
    expectBlockedCode(analyzePlanningControlledApplyProjectFieldDestination(null), "invalidInput");
    expectBlockedCode(analyzePlanningControlledApplyProjectFieldDestination({ project: {}, proposalId }), "invalidProject");
    expectBlockedCode(analyzePlanningControlledApplyProjectFieldDestination({ project: projectForDestination(), proposalId: 7 }), "invalidInput");

    const malformedProject = projectForDestination();
    (malformedProject.intake as unknown as Record<string, unknown>).appPurpose = undefined;
    expectBlockedCode(analyze(malformedProject), "destinationUnreadable");
  });

  it("preserves defensive source ID copies across result mutation and later analysis", () => {
    const project = projectForDestination();
    const result = analyze(project);
    if (result.outcome === "blocked") throw new Error("Expected non-blocked result.");

    (result.plan.sourceIds as string[]).push(approvedSourceId);

    expect(analyze(project)).toMatchObject({
      outcome: "ready",
      plan: { sourceIds: [sourceId] }
    });
  });

  it.each([
    ["ready", projectForDestination({ currentValue: "" })],
    ["unchanged", projectForDestination({ currentValue: desiredValue })],
    ["blocked", projectForDestination({ currentValue: "Existing value" })]
  ])("does not mutate the complete project for %s results", (_label, project) => {
    expectProjectUnchanged(project, () => {
      analyze(project);
    });
  });

  it("propagates representative D.3A blockers as candidateBlocked without reaching destination readiness", () => {
    expectBlockedCode(analyze(projectForDestination({ proposalRecord: proposal("appPurpose", { status: "Proposed", lastDecisionId: undefined }) })), "candidateBlocked");
    expectBlockedCode(analyze(projectForDestination({ sources: [source({ availability: "stale" })] })), "candidateBlocked");
    expectBlockedCode(analyze(projectForDestination({ conflicts: [conflict()] })), "candidateBlocked");
    expectBlockedCode(analyze(projectForDestination({ dependencies: [dependency()] })), "candidateBlocked");
    expectBlockedCode(analyze(projectForDestination({ proposalRecord: proposal("appPurpose", { alternativeGroupId }) })), "candidateBlocked");

    const blocked = analyze(projectForDestination({ conflicts: [conflict()] }));
    expect(blocked).toMatchObject({
      outcome: "blocked",
      issues: [
        expect.objectContaining({
          code: "candidateBlocked",
          candidateIssues: [expect.objectContaining({ code: "openConflict" })]
        })
      ]
    });
    if (blocked.outcome !== "blocked") throw new Error("Expected blocked.");
    const originalLength = blocked.issues[0].candidateIssues?.length ?? 0;
    (blocked.issues[0].candidateIssues as Array<unknown>).push({ code: "mutated" });
    const repeated = analyze(projectForDestination({ conflicts: [conflict()] }));
    expect(repeated).toMatchObject({
      outcome: "blocked",
      issues: [expect.objectContaining({ candidateIssues: expect.arrayContaining([expect.objectContaining({ code: "openConflict" })]) })]
    });
    if (repeated.outcome !== "blocked") throw new Error("Expected blocked.");
    expect(repeated.issues[0].candidateIssues).toHaveLength(originalLength);
  });

  it("keeps all current clarification rules blocked before project-field destination analysis", () => {
    const rules = getPlanningRuleRegistry();
    expect(rules).toHaveLength(11);

    for (const rule of rules) {
      const result = analyze(projectForDestination({
        proposalRecord: proposal(rule.target.targetKey, {
          ruleId: rule.ruleId,
          ruleVersion: rule.ruleVersion,
          target: { ...rule.target },
          category: rule.category,
          restriction: rule.restriction,
          uncertainty: rule.uncertainty,
          value: { kind: "clarification", question: rule.question }
        })
      }));
      expectBlockedCode(result, "candidateBlocked");
    }
  });

  it("keeps TTI-style Draft blockers unresolved and outside destination/output semantics", () => {
    const ttiResults = getPlanningRuleRegistry().map((rule) =>
      analyze(projectForDestination({
        proposalRecord: proposal(rule.target.targetKey, {
          ruleId: rule.ruleId,
          ruleVersion: rule.ruleVersion,
          target: { ...rule.target },
          category: rule.category,
          restriction: rule.restriction,
          uncertainty: rule.uncertainty,
          value: { kind: "clarification", question: `TTI ${rule.target.targetKey} remains unresolved.` }
        })
      }))
    );

    expect(ttiResults.every((result) => result.outcome === "blocked")).toBe(true);
    expect(JSON.stringify(ttiResults)).not.toMatch(/Ready for Codex|generatedDocuments|Power Fx|YAML output|schema confirmed|internal names derived/i);
  });

  it("is isolated from mutation, persistence, readiness, output, runtime, network, Cloudflare, and rule-mapping concerns", () => {
    const sourceText = analyzePlanningControlledApplyProjectFieldDestination.toString();
    expect(sourceText).toMatch(/analyzePlanningControlledApplyCandidate/);
    expect(sourceText).toMatch(/getProjectFieldValue/);
    expect(sourceText).not.toMatch(/applyProjectFieldChanges|updateProjectFields|updateProjectPowerPlatform|updateProject\(/);
    expect(sourceText).not.toMatch(/projectRepository|browserStorage|localStorage|StorageAdapter/);
    expect(sourceText).not.toMatch(/generateProjectPackage|exportProjectPackage|generatedDocuments|packageGeneratedAt|reviewStatus|readinessConfirmations/);
    expect(sourceText).not.toMatch(/PowerFx|Power Fx|YAML generation|fetch\(|XMLHttpRequest|openai|wrangler|cloudflare/i);
    expect(sourceText).not.toMatch(/\bDate\b|Date\.now|randomUUID|crypto|Math\.random/);
    expect(sourceText).not.toMatch(/ruleId.*fieldKey|readiness.*fieldKey|targetKey.*appPurpose/);
  });
});
