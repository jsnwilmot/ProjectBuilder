// @ts-expect-error Vitest runs in a Node environment for static source isolation checks.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import {
  preparePlanningControlledApplyTransaction,
  type PlanningControlledApplyTransactionPreparationIssueCode,
  type PlanningControlledApplyTransactionPreparationResult
} from "../lib/planningControlledApplyTransactionPreparation";
import {
  CONTROLLED_APPLY_HISTORY_RECORD_LIMIT,
  CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
  type PlanningControlledApplyHistoryRecord
} from "../lib/planningControlledApplyHistory";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningDependencyRecord,
  type PlanningProposalRecord,
  type PlanningProposalValue,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleRegistry } from "../lib/planningRules";
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import type { ProjectInputField, ProjectIntake, ProjectRecord } from "../types/project";

const projectId = "controlled-apply-transaction-project";
const sourceId = "11111111-1111-4111-8111-111111111111";
const otherSourceId = "11111111-1111-4111-8111-111111111112";
const proposalId = "22222222-2222-4222-8222-222222222222";
const otherProposalId = "22222222-2222-4222-8222-222222222223";
const decisionId = "33333333-3333-4333-8333-333333333333";
const conflictId = "55555555-5555-4555-8555-555555555555";
const dependencyId = "66666666-6666-4666-8666-666666666666";
const timestamp = "2026-08-12T04:00:00.000Z";
const desiredValue = "Confirmed transaction value";
const fingerprint = "e".repeat(64);

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
    rationale: "Transaction preparation fixture for future controlled apply.",
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

function projectForTransaction(options: {
  fieldKey?: ProjectInputField | string;
  currentValue?: string;
  proposalRecord?: PlanningProposalRecord;
  sources?: PlanningSourceReference[];
  decisions?: PlanningDecisionRecord[];
  dependencies?: PlanningDependencyRecord[];
  conflicts?: PlanningConflictRecord[];
  history?: PlanningControlledApplyHistoryRecord[];
  archivedAt?: string | null;
  includePlanning?: boolean;
  generatedDocuments?: ProjectRecord["generatedDocuments"];
  readinessConfirmations?: ProjectRecord["readinessConfirmations"];
  reviewStatus?: ProjectRecord["reviewStatus"];
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
    generatedDocuments: options.generatedDocuments,
    readinessConfirmations: options.readinessConfirmations,
    reviewStatus: options.reviewStatus,
    now: timestamp
  });
  const projectWithHistory = {
    ...project,
    controlledApplyHistory: [...(options.history ?? [])]
  };
  if (options.includePlanning === false) {
    return projectWithHistory;
  }
  return {
    ...projectWithHistory,
    planning: planning({
      sources: options.sources,
      proposals: [options.proposalRecord ?? proposal(String(fieldKey))],
      decisions: options.decisions,
      dependencies: options.dependencies,
      conflicts: options.conflicts
    })
  };
}

function applyId(index = 1): string {
  return `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, "0")}`;
}

function generatedDecisionId(index: number): string {
  return `33333333-3333-4333-8333-${String(index).padStart(12, "0")}`;
}

function historyRecord(overrides: Partial<PlanningControlledApplyHistoryRecord> = {}): PlanningControlledApplyHistoryRecord {
  const previousValue = overrides.previousValue ?? "Previous value";
  const appliedValue = overrides.appliedValue ?? desiredValue;
  return {
    applyId: applyId(),
    applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
    projectId,
    proposalId,
    decisionId,
    fieldKey: "appPurpose",
    previousValue,
    appliedValue,
    sourceIds: [sourceId],
    appliedAt: timestamp,
    outcome: previousValue === appliedValue ? "unchanged" : "changed",
    ...overrides
  };
}

function prepare(project: ProjectRecord): PlanningControlledApplyTransactionPreparationResult {
  return preparePlanningControlledApplyTransaction({ project, proposalId });
}

function expectBlockedCode(
  result: PlanningControlledApplyTransactionPreparationResult,
  code: PlanningControlledApplyTransactionPreparationIssueCode
): void {
  expect(result).toMatchObject({ outcome: "blocked" });
  if (result.outcome !== "blocked") throw new Error("Expected blocked result.");
  expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
}

function expectProjectUnchanged(project: ProjectRecord, action: () => void): void {
  const before = JSON.stringify(project);
  action();
  expect(JSON.stringify(project)).toBe(before);
}

function expectReadyPlan(result: PlanningControlledApplyTransactionPreparationResult) {
  expect(result.outcome).toBe("ready");
  if (result.outcome !== "ready") throw new Error("Expected ready.");
  return result.plan;
}

function expectAlreadyAppliedPlan(result: PlanningControlledApplyTransactionPreparationResult) {
  expect(result.outcome).toBe("alreadyApplied");
  if (result.outcome !== "alreadyApplied") throw new Error("Expected alreadyApplied.");
  return result.plan;
}

describe("planning controlled apply transaction preparation", () => {
  it("prepares a changed transaction from the live D.3B destination plan without write authority", () => {
    const project = projectForTransaction({ currentValue: "" });
    const plan = expectReadyPlan(prepare(project));

    expect(plan).toEqual({
      projectId,
      proposalId,
      decisionId,
      fieldKey: "appPurpose",
      desiredValue,
      expectedCurrentValue: "",
      previousValue: "",
      appliedValue: desiredValue,
      sourceIds: [sourceId],
      expectedProjectSnapshot: JSON.stringify(project),
      historyOutcome: "changed",
      destinationMutationRequired: true,
      historyAppendRequired: true,
      writeAuthorized: false,
      readinessEligible: false,
      outputEligible: false
    });
    expect(JSON.stringify(plan)).not.toMatch(/applyId|appliedAt|actor|repository|storage|rollback/i);
  });

  it("treats whitespace-only destinations as changed while preserving the exact expected value", () => {
    const project = projectForTransaction({ currentValue: " \r\n\t " });
    const plan = expectReadyPlan(prepare(project));

    expect(plan).toMatchObject({
      expectedCurrentValue: " \r\n\t ",
      previousValue: " \r\n\t ",
      appliedValue: desiredValue,
      historyOutcome: "changed",
      destinationMutationRequired: true,
      historyAppendRequired: true
    });
  });

  it("prepares a new unchanged history append when D.3B reports exact destination equality", () => {
    const project = projectForTransaction({ currentValue: desiredValue });
    const plan = expectReadyPlan(prepare(project));

    expect(plan).toMatchObject({
      desiredValue,
      expectedCurrentValue: desiredValue,
      previousValue: desiredValue,
      appliedValue: desiredValue,
      historyOutcome: "unchanged",
      destinationMutationRequired: false,
      historyAppendRequired: true,
      writeAuthorized: false,
      readinessEligible: false,
      outputEligible: false
    });
  });

  it("returns alreadyApplied for an idempotent changed retry without allocating a duplicate history append", () => {
    const project = projectForTransaction({
      currentValue: desiredValue,
      history: [historyRecord({ previousValue: "", appliedValue: desiredValue, outcome: "changed" })]
    });
    const plan = expectAlreadyAppliedPlan(prepare(project));

    expect(plan).toEqual({
      projectId,
      proposalId,
      decisionId,
      fieldKey: "appPurpose",
      desiredValue,
      expectedCurrentValue: desiredValue,
      existingApplyId: applyId(),
      sourceIds: [sourceId],
      expectedProjectSnapshot: JSON.stringify(project),
      destinationMutationRequired: false,
      historyAppendRequired: false,
      writeAuthorized: false,
      readinessEligible: false,
      outputEligible: false
    });
  });

  it("returns alreadyApplied for an idempotent unchanged retry", () => {
    const project = projectForTransaction({
      currentValue: desiredValue,
      history: [historyRecord({ previousValue: desiredValue, appliedValue: desiredValue, outcome: "unchanged" })]
    });

    expectAlreadyAppliedPlan(prepare(project));
  });

  it("blocks when existing semantic history has a different applied value", () => {
    const project = projectForTransaction({
      currentValue: "Different applied value",
      proposalRecord: proposal("appPurpose", { value: textValue("Different applied value") }),
      history: [historyRecord({ appliedValue: desiredValue })]
    });

    expectBlockedCode(prepare(project), "historyValueMismatch");
  });

  it("blocks when destination has been cleared after a matching apply history record", () => {
    const project = projectForTransaction({
      currentValue: "",
      history: [historyRecord({ previousValue: "", appliedValue: desiredValue })]
    });

    expectBlockedCode(prepare(project), "destinationDriftAfterApply");
  });

  it("preserves D.3B destination-conflict evidence for meaningful drift", () => {
    const result = prepare(projectForTransaction({
      currentValue: "Existing meaningful value",
      history: [historyRecord({ previousValue: "", appliedValue: desiredValue })]
    }));

    expectBlockedCode(result, "destinationBlocked");
    if (result.outcome !== "blocked") throw new Error("Expected blocked.");
    expect(result.issues[0].destinationIssues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "destinationConflict" })]));
  });

  it("validates persisted history before idempotency evidence and fails closed for invalid history", () => {
    const project = projectForTransaction({
      currentValue: desiredValue,
      history: [historyRecord({ applySchemaVersion: "invalid" as never })]
    });

    expectBlockedCode(prepare(project), "invalidHistory");
    expect(project.controlledApplyHistory).toHaveLength(1);
  });

  it("blocks new append preparation at the 1000-record history capacity", () => {
    const existing = Array.from({ length: CONTROLLED_APPLY_HISTORY_RECORD_LIMIT }, (_, index) =>
      historyRecord({
        applyId: applyId(index + 1),
        decisionId: generatedDecisionId(index + 1)
      })
    );
    const decisions = existing.map((record) => decision({ decisionId: record.decisionId }));
    const project = projectForTransaction({
      currentValue: "",
      history: existing,
      decisions: [decision(), ...decisions]
    });

    expectBlockedCode(prepare(project), "historyCapacityReached");
  });

  it("does not let the 1000-record cap block an idempotent retry", () => {
    const fillerRecords = Array.from({ length: CONTROLLED_APPLY_HISTORY_RECORD_LIMIT - 1 }, (_, index) =>
      historyRecord({
        applyId: applyId(index + 2),
        decisionId: generatedDecisionId(index + 2)
      })
    );
    const fillerDecisions = fillerRecords.map((record) => decision({ decisionId: record.decisionId }));
    const project = projectForTransaction({
      currentValue: desiredValue,
      history: [historyRecord({ previousValue: "", appliedValue: desiredValue }), ...fillerRecords],
      decisions: [decision(), ...fillerDecisions]
    });

    expectAlreadyAppliedPlan(prepare(project));
  });

  it("preserves D.3B candidate blockers, archived projects, missing planning, destination conflicts, and appType exclusion", () => {
    const candidateBlocked = prepare(projectForTransaction({ proposalRecord: proposal("appPurpose", { status: "Proposed", lastDecisionId: undefined }) }));
    expectBlockedCode(candidateBlocked, "destinationBlocked");
    if (candidateBlocked.outcome !== "blocked") throw new Error("Expected blocked.");
    expect(candidateBlocked.issues[0].destinationIssues?.[0]).toMatchObject({ code: "candidateBlocked" });

    expectBlockedCode(prepare(projectForTransaction({ archivedAt: timestamp })), "destinationBlocked");
    expectBlockedCode(prepare(projectForTransaction({ includePlanning: false })), "destinationBlocked");
    expectBlockedCode(prepare(projectForTransaction({ currentValue: "Meaningful destination" })), "destinationBlocked");
    expectBlockedCode(prepare(projectForTransaction({ fieldKey: "appType", currentValue: "" })), "destinationBlocked");
    expectBlockedCode(prepare(projectForTransaction({ dependencies: [dependency()] })), "destinationBlocked");
    expectBlockedCode(prepare(projectForTransaction({ conflicts: [conflict()] })), "destinationBlocked");
  });

  it("captures complete deterministic project snapshots and keeps them stable after caller mutation", () => {
    const firstProject = projectForTransaction({
      generatedDocuments: [{ fileName: "README.md", content: "A", folder: "00_Project_Overview" }],
      readinessConfirmations: { projectTypeConfirmed: true },
      reviewStatus: "Review needed"
    });
    const firstPlan = expectReadyPlan(prepare(firstProject));
    firstProject.intake.appPurpose = "mutated after preparation";
    firstProject.generatedDocuments.push({ fileName: "NEXT_STEPS.md", content: "B", folder: "10_Documentation" });

    expect(firstPlan.expectedProjectSnapshot).not.toBe(JSON.stringify(firstProject));
    expect(JSON.parse(firstPlan.expectedProjectSnapshot)).toMatchObject({
      generatedDocuments: [{ fileName: "README.md" }],
      readinessConfirmations: { projectTypeConfirmed: true },
      reviewStatus: "Review needed",
      controlledApplyHistory: []
    });
    expect(prepare(projectForTransaction())).toEqual(prepare(projectForTransaction()));

    const secondPlan = expectReadyPlan(prepare(projectForTransaction({ reviewStatus: "Approved" })));
    expect(secondPlan.expectedProjectSnapshot).not.toBe(firstPlan.expectedProjectSnapshot);
  });

  it("blocks when the supplied project cannot produce an expected project snapshot", () => {
    const project = projectForTransaction();
    const historyBefore = JSON.stringify(project.controlledApplyHistory);
    const intakeBefore = JSON.stringify(project.intake);
    (project as unknown as Record<string, unknown>).self = project;

    const result = prepare(project);

    expectBlockedCode(result, "projectSnapshotUnavailable");
    expect("plan" in result).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/expectedProjectSnapshot/);
    expect(JSON.stringify(project.controlledApplyHistory)).toBe(historyBefore);
    expect(JSON.stringify(project.intake)).toBe(intakeBefore);
  });

  it("blocks when JSON serialization returns a non-string snapshot without throwing", () => {
    const project = projectForTransaction();
    const historyBefore = JSON.stringify(project.controlledApplyHistory);
    const intakeBefore = JSON.stringify(project.intake);
    (project as unknown as { toJSON: () => undefined }).toJSON = () => undefined;

    const result = prepare(project);

    expect(JSON.stringify(project)).toBeUndefined();
    expectBlockedCode(result, "projectSnapshotUnavailable");
    expect("plan" in result).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/expectedProjectSnapshot/);
    expect(JSON.stringify(project.controlledApplyHistory)).toBe(historyBefore);
    expect(JSON.stringify(project.intake)).toBe(intakeBefore);
  });

  it("uses D.3B expected destination values and defensive source copies exactly", () => {
    const project = projectForTransaction({
      currentValue: "",
      sources: [source(), source({ sourceId: otherSourceId, sourceType: "approvedDocument", authority: "approved" })],
      proposalRecord: proposal("appPurpose", { sourceIds: [sourceId, otherSourceId] }),
      decisions: [decision({ sourceIds: [sourceId, otherSourceId] })]
    });
    const firstPlan = expectReadyPlan(prepare(project));
    (firstPlan.sourceIds as string[]).push("mutated");

    expect(firstPlan.expectedCurrentValue).toBe("");
    expect(expectReadyPlan(prepare(project)).sourceIds).toEqual([sourceId, otherSourceId]);
  });

  it.each([
    ["ready", projectForTransaction({ currentValue: "" })],
    ["alreadyApplied", projectForTransaction({ currentValue: desiredValue, history: [historyRecord({ previousValue: "", appliedValue: desiredValue })] })],
    ["blocked", projectForTransaction({ currentValue: "Meaningful destination" })]
  ])("does not mutate the input project for %s results", (_label, project) => {
    expectProjectUnchanged(project, () => {
      prepare(project);
    });
  });

  it("is statically isolated from runtime allocation, persistence, readiness, output, storage versions, and schema changes", () => {
    const sourceText = readFileSync("src/lib/planningControlledApplyTransactionPreparation.ts", "utf8");

    expect(sourceText).toMatch(/analyzePlanningControlledApplyProjectFieldDestination/);
    expect(sourceText).toMatch(/normalizePlanningControlledApplyHistory/);
    expect(sourceText).toMatch(/expectedProjectSnapshot/);
    expect(sourceText).toMatch(/expectedCurrentValue/);
    expect(sourceText).not.toMatch(/from "\.\/projectRepository"|from "\.\/storageVersion"|from "\.\/createProject"|from "\.\/planningRules"/);
    expect(sourceText).not.toMatch(/projectRepository|browserStorage|localStorage|StorageAdapter|updateProject|applyProjectFieldChanges/);
    expect(sourceText).not.toMatch(/randomUUID|crypto|Math\.random|Date\.now|\bnew Date\b|appliedAt|actor/);
    expect(sourceText).not.toMatch(/generateProjectPackage|exportProjectPackage|readinessConfirmations|reviewStatus|packageGeneratedAt|PowerFx|Power Fx|YAML generation|fetch\(|XMLHttpRequest|openai|wrangler|cloudflare|React|tsx/i);
    expect(sourceText).not.toMatch(/StorageVersion|CURRENT_STORAGE_VERSION|PLANNING_SCHEMA_VERSION|PLANNING_RULE_SET_VERSION|PLANNING_DECISION_ACTIONS/);
    expect(CURRENT_STORAGE_VERSION).toBe(5);
    expect(PLANNING_SCHEMA_VERSION).toBe("phase-5c.1.1");
    expect(PLANNING_RULE_SET_VERSION).toBe("phase-5c.1.1");
  });

  it("keeps current clarification rules non-applicable to controlled-apply transaction preparation and TTI blockers unresolved", () => {
    const results = getPlanningRuleRegistry().map((rule) =>
      prepare(projectForTransaction({
        proposalRecord: proposal(rule.target.targetKey, {
          proposalId,
          ruleId: rule.ruleId,
          ruleVersion: rule.ruleVersion,
          target: { ...rule.target },
          category: rule.category,
          restriction: rule.restriction,
          uncertainty: rule.uncertainty,
          value: { kind: "clarification", question: rule.question }
        })
      }))
    );

    expect(results.every((result) => result.outcome === "blocked")).toBe(true);
    expect(JSON.stringify(results)).not.toMatch(/Ready for Codex|schema confirmed|internal names derived|Power Fx|YAML output|Dataverse|premium connector/i);
  });
});
