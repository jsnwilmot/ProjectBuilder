// @ts-expect-error Vitest runs in a Node environment for static source isolation checks.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createProject } from "../lib/createProject";
import {
  finalizePlanningControlledApplyTransaction,
  type PlanningControlledApplyTransactionFinalizationIssueCode,
  type PlanningControlledApplyTransactionFinalizationResult
} from "../lib/planningControlledApplyTransactionFinalization";
import {
  CONTROLLED_APPLY_HISTORY_RECORD_LIMIT,
  CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
  normalizePlanningControlledApplyHistory,
  type PlanningControlledApplyHistoryRecord
} from "../lib/planningControlledApplyHistory";
import { preparePlanningControlledApplyTransaction } from "../lib/planningControlledApplyTransactionPreparation";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningProposalValue,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleRegistry } from "../lib/planningRules";
import type { ProjectInputField, ProjectIntake, ProjectRecord } from "../types/project";

const projectId = "controlled-apply-finalization-project";
const sourceId = "11111111-1111-4111-8111-111111111111";
const otherSourceId = "11111111-1111-4111-8111-111111111112";
const proposalId = "22222222-2222-4222-8222-222222222222";
const decisionId = "33333333-3333-4333-8333-333333333333";
const timestamp = "2026-08-12T04:00:00.000Z";
const laterTimestamp = "2026-08-12T04:00:00.001Z";
const desiredValue = "Confirmed transaction value";
const generatedApplyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fingerprint = "f".repeat(64);

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
    rationale: "Finalization fixture for future controlled apply.",
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

function planning(overrides: {
  sources?: PlanningSourceReference[];
  proposals?: PlanningProposalRecord[];
  decisions?: PlanningDecisionRecord[];
} = {}): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: overrides.sources ?? [source()],
    proposals: overrides.proposals ?? [proposal()],
    decisions: overrides.decisions ?? [decision()],
    dependencies: [],
    conflicts: []
  };
}

function projectForFinalization(options: {
  fieldKey?: ProjectInputField | string;
  currentValue?: string;
  proposalRecord?: PlanningProposalRecord;
  sources?: PlanningSourceReference[];
  decisions?: PlanningDecisionRecord[];
  history?: PlanningControlledApplyHistoryRecord[];
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
  const project = createProject({ identity, client, intake, now: timestamp });
  return {
    ...project,
    controlledApplyHistory: (options.history ?? []).map(cloneRecord),
    planning: planning({
      sources: options.sources,
      proposals: [options.proposalRecord ?? proposal(String(fieldKey))],
      decisions: options.decisions
    })
  };
}

function historyRecord(overrides: Partial<PlanningControlledApplyHistoryRecord> = {}): PlanningControlledApplyHistoryRecord {
  const previousValue = overrides.previousValue ?? "Previous value";
  const appliedValue = overrides.appliedValue ?? "Previously applied value";
  return {
    applyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
    projectId,
    proposalId,
    decisionId: generatedDecisionId(1),
    fieldKey: "appPurpose",
    previousValue,
    appliedValue,
    sourceIds: [sourceId],
    appliedAt: timestamp,
    outcome: previousValue === appliedValue ? "unchanged" : "changed",
    ...overrides
  };
}

function generatedDecisionId(index: number): string {
  return `33333333-3333-4333-8333-${String(index).padStart(12, "0")}`;
}

function generatedHistoryId(index: number): string {
  return `bbbbbbbb-bbbb-4bbb-8bbb-${String(index).padStart(12, "0")}`;
}

function cloneRecord(record: PlanningControlledApplyHistoryRecord): PlanningControlledApplyHistoryRecord {
  return { ...record, sourceIds: [...record.sourceIds] };
}

function finalize(
  project: ProjectRecord,
  now: () => string = () => timestamp,
  uuid: () => string = () => generatedApplyId
): PlanningControlledApplyTransactionFinalizationResult {
  return finalizePlanningControlledApplyTransaction({ project, proposalId }, { now, uuid });
}

function expectFinalized(result: PlanningControlledApplyTransactionFinalizationResult) {
  expect(result.outcome).toBe("finalized");
  if (result.outcome !== "finalized") throw new Error("Expected finalized result.");
  return result.evidence;
}

function expectBlockedCode(
  result: PlanningControlledApplyTransactionFinalizationResult,
  code: PlanningControlledApplyTransactionFinalizationIssueCode
): void {
  expect(result).toMatchObject({ outcome: "blocked" });
  if (result.outcome !== "blocked") throw new Error("Expected blocked result.");
  expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
}

describe("planning controlled apply transaction finalization", () => {
  it("rejects unsupported semantic and runtime input fields", () => {
    const project = projectForFinalization();
    expectBlockedCode(finalizePlanningControlledApplyTransaction({ project, proposalId, applyId: generatedApplyId }, {}), "invalidInput");
    expectBlockedCode(finalizePlanningControlledApplyTransaction({ project, proposalId }, { now: () => timestamp, actor: "user" } as never), "invalidInput");
    expectBlockedCode(finalizePlanningControlledApplyTransaction({ project, proposalId }, { now: timestamp } as never), "timestampUnavailable");
    expectBlockedCode(finalizePlanningControlledApplyTransaction({ project, proposalId }, { uuid: generatedApplyId } as never), "uuidUnavailable");
  });

  it("propagates D.3C.3A blockers defensively without runtime allocation", () => {
    const project = projectForFinalization({ currentValue: "Existing meaningful destination" });
    const now = vi.fn(() => timestamp);
    const uuid = vi.fn(() => generatedApplyId);
    const result = finalize(project, now, uuid);

    expectBlockedCode(result, "preparationBlocked");
    expect(now).not.toHaveBeenCalled();
    expect(uuid).not.toHaveBeenCalled();
    if (result.outcome !== "blocked") throw new Error("Expected blocked.");
    expect(result.issues[0].preparationIssues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "destinationBlocked" })]));
  });

  it("returns alreadyApplied with existing evidence and zero runtime calls", () => {
    const existing = historyRecord({
      decisionId,
      previousValue: "",
      appliedValue: desiredValue,
      outcome: "changed"
    });
    const project = projectForFinalization({ currentValue: desiredValue, history: [existing] });
    const before = JSON.stringify(project);
    const now = vi.fn(() => laterTimestamp);
    const uuid = vi.fn(() => generatedApplyId);
    const result = finalize(project, now, uuid);

    expect(result).toEqual({
      outcome: "alreadyApplied",
      issues: [],
      evidence: expect.objectContaining({
        existingApplyId: existing.applyId,
        destinationMutationRequired: false,
        historyAppendRequired: false,
        writeAuthorized: false,
        readinessEligible: false,
        outputEligible: false
      })
    });
    expect(now).not.toHaveBeenCalled();
    expect(uuid).not.toHaveBeenCalled();
    if (result.outcome !== "alreadyApplied") throw new Error("Expected alreadyApplied.");
    expect(Object.keys(result.evidence)).not.toEqual(expect.arrayContaining(["candidateRecord", "candidateHistory", "appliedAt"]));
    expect(JSON.stringify(project)).toBe(before);
  });

  it("finalizes changed evidence with timestamp before UUID and exact record fields", () => {
    const project = projectForFinalization({ currentValue: "" });
    const callOrder: string[] = [];
    const evidence = expectFinalized(finalize(
      project,
      () => { callOrder.push("now"); return timestamp; },
      () => { callOrder.push("uuid"); return generatedApplyId; }
    ));

    expect(callOrder).toEqual(["now", "uuid"]);
    expect(evidence).toMatchObject({
      projectId,
      proposalId,
      decisionId,
      fieldKey: "appPurpose",
      desiredValue,
      expectedCurrentValue: "",
      previousValue: "",
      appliedValue: desiredValue,
      historyOutcome: "changed",
      destinationMutationRequired: true,
      historyAppendRequired: true,
      applyId: generatedApplyId,
      appliedAt: timestamp,
      writeAuthorized: false,
      readinessEligible: false,
      outputEligible: false
    });
    expect(Object.keys(evidence.candidateRecord)).toEqual([
      "applyId",
      "applySchemaVersion",
      "projectId",
      "proposalId",
      "decisionId",
      "fieldKey",
      "previousValue",
      "appliedValue",
      "sourceIds",
      "appliedAt",
      "outcome"
    ]);
    expect(evidence.candidateRecord).toEqual({
      applyId: generatedApplyId,
      applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
      projectId,
      proposalId,
      decisionId,
      fieldKey: "appPurpose",
      previousValue: "",
      appliedValue: desiredValue,
      sourceIds: [sourceId],
      appliedAt: timestamp,
      outcome: "changed"
    });
  });

  it("finalizes exact destination equality only as unchanged", () => {
    const evidence = expectFinalized(finalize(projectForFinalization({ currentValue: desiredValue })));

    expect(evidence).toMatchObject({
      expectedCurrentValue: desiredValue,
      previousValue: desiredValue,
      appliedValue: desiredValue,
      historyOutcome: "unchanged",
      destinationMutationRequired: false
    });
    expect(evidence.candidateRecord.outcome).toBe("unchanged");
  });

  it("preserves whitespace-only destinations exactly as changed", () => {
    const whitespace = " \r\n\t ";
    const evidence = expectFinalized(finalize(projectForFinalization({ currentValue: whitespace })));

    expect(evidence.expectedCurrentValue).toBe(whitespace);
    expect(evidence.previousValue).toBe(whitespace);
    expect(evidence.candidateRecord.previousValue).toBe(whitespace);
    expect(evidence.historyOutcome).toBe("changed");
  });

  it.each([
    ["case", desiredValue.toLowerCase()],
    ["leading whitespace", ` ${desiredValue}`],
    ["trailing whitespace", `${desiredValue} `]
  ])("does not reinterpret %s differences as unchanged", (_label, currentValue) => {
    const now = vi.fn(() => timestamp);
    const uuid = vi.fn(() => generatedApplyId);
    const result = finalize(projectForFinalization({ currentValue }), now, uuid);

    expect(result.outcome).toBe("blocked");
    expect(JSON.stringify(result)).not.toMatch(/"historyOutcome":"unchanged"/);
    expect(now).not.toHaveBeenCalled();
    expect(uuid).not.toHaveBeenCalled();
  });

  it("accepts canonical valid calendar timestamps", () => {
    expect(expectFinalized(finalize(projectForFinalization(), () => "2028-02-29T23:59:59.999Z")).appliedAt)
      .toBe("2028-02-29T23:59:59.999Z");
  });

  it.each([
    "not-a-date",
    "2026-02-29T04:00:00.000Z",
    "2026-08-12T04:00:00Z",
    "2026-08-12T04:00:00.000-00:00",
    " 2026-08-12T04:00:00.000Z"
  ])("blocks invalid or noncanonical timestamp %s before UUID allocation", (value) => {
    const uuid = vi.fn(() => generatedApplyId);
    expectBlockedCode(finalize(projectForFinalization(), () => value, uuid), "invalidTimestamp");
    expect(uuid).not.toHaveBeenCalled();
  });

  it("fails closed when now throws before UUID allocation", () => {
    const uuid = vi.fn(() => generatedApplyId);
    expectBlockedCode(finalize(projectForFinalization(), () => { throw new Error("clock unavailable"); }, uuid), "timestampUnavailable");
    expect(uuid).not.toHaveBeenCalled();
  });

  it("accepts equal and later chronology and blocks earlier chronology", () => {
    expect(finalize(projectForFinalization(), () => timestamp).outcome).toBe("finalized");
    expect(finalize(projectForFinalization(), () => laterTimestamp).outcome).toBe("finalized");
    const earlier = finalize(projectForFinalization(), () => "2026-08-12T03:59:59.999Z");
    expectBlockedCode(earlier, "invalidCandidateHistory");
    if (earlier.outcome !== "blocked") throw new Error("Expected blocked.");
    expect(earlier.issues[0].historyIssues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "applyPrecedesConfirmation" })]));
  });

  it.each(["AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA", "not-a-uuid", "aaaaaaaa-aaaa-0aaa-8aaa-aaaaaaaaaaaa"])(
    "blocks invalid generated UUID %s without retry",
    (value) => {
      const uuid = vi.fn(() => value);
      expectBlockedCode(finalize(projectForFinalization(), () => timestamp, uuid), "invalidUuid");
      expect(uuid).toHaveBeenCalledTimes(1);
    }
  );

  it("fails closed when UUID allocation throws without retry", () => {
    const uuid = vi.fn(() => { throw new Error("uuid unavailable"); });
    expectBlockedCode(finalize(projectForFinalization(), () => timestamp, uuid), "uuidUnavailable");
    expect(uuid).toHaveBeenCalledTimes(1);
  });

  it("blocks an applyId duplicate only within controlled-apply history", () => {
    const existingDecisionId = generatedDecisionId(1);
    const existing = historyRecord({ decisionId: existingDecisionId });
    const project = projectForFinalization({
      history: [existing],
      decisions: [decision(), decision({ decisionId: existingDecisionId })]
    });
    const uuid = vi.fn(() => existing.applyId);

    expectBlockedCode(finalize(project, () => timestamp, uuid), "duplicateUuid");
    expect(uuid).toHaveBeenCalledTimes(1);
  });

  it("does not impose cross-namespace UUID uniqueness", () => {
    const evidence = expectFinalized(finalize(projectForFinalization(), () => timestamp, () => proposalId));
    expect(evidence.applyId).toBe(proposalId);
  });

  it("constructs and validates a complete cloned history without mutating existing records", () => {
    const existingDecisionId = generatedDecisionId(1);
    const existing = historyRecord({ decisionId: existingDecisionId, sourceIds: [sourceId] });
    const project = projectForFinalization({
      history: [existing],
      decisions: [decision(), decision({ decisionId: existingDecisionId })],
      sources: [source(), source({ sourceId: otherSourceId })],
      proposalRecord: proposal("appPurpose", { sourceIds: [sourceId] })
    });
    const before = JSON.stringify(project);
    const evidence = expectFinalized(finalize(project));

    expect(evidence.candidateHistory).toHaveLength(2);
    expect(evidence.candidateHistory[0]).toEqual(existing);
    expect(evidence.candidateHistory[1]).toEqual(evidence.candidateRecord);
    expect(normalizePlanningControlledApplyHistory({ projectId, planning: project.planning, history: evidence.candidateHistory }))
      .toEqual({ outcome: "valid", history: evidence.candidateHistory, issues: [] });
    expect(JSON.stringify(project)).toBe(before);

    (evidence.candidateHistory[0].sourceIds as string[]).push("mutated-result");
    (evidence.candidateRecord.sourceIds as string[]).push("mutated-record");
    expect(project.controlledApplyHistory[0].sourceIds).toEqual([sourceId]);
    expect(expectFinalized(finalize(project)).candidateRecord.sourceIds).toEqual([sourceId]);
  });

  it("fails closed on semantic duplicate history before runtime allocation", () => {
    const project = projectForFinalization({
      currentValue: "Different applied value",
      proposalRecord: proposal("appPurpose", { value: textValue("Different applied value") }),
      history: [historyRecord({ decisionId, appliedValue: desiredValue })]
    });
    const now = vi.fn(() => timestamp);
    const uuid = vi.fn(() => generatedApplyId);
    const result = finalize(project, now, uuid);

    expectBlockedCode(result, "preparationBlocked");
    expect(now).not.toHaveBeenCalled();
    expect(uuid).not.toHaveBeenCalled();
  });

  it("fails closed at the 1000-record capacity without runtime allocation", () => {
    const records = Array.from({ length: CONTROLLED_APPLY_HISTORY_RECORD_LIMIT }, (_, index) => historyRecord({
      applyId: generatedHistoryId(index + 1),
      decisionId: generatedDecisionId(index + 1)
    }));
    const decisions = [decision(), ...records.map((record) => decision({ decisionId: record.decisionId }))];
    const project = projectForFinalization({ history: records, decisions });
    const now = vi.fn(() => timestamp);
    const uuid = vi.fn(() => generatedApplyId);
    const result = finalize(project, now, uuid);

    expectBlockedCode(result, "preparationBlocked");
    if (result.outcome !== "blocked") throw new Error("Expected blocked.");
    expect(result.issues[0].preparationIssues).toEqual(expect.arrayContaining([expect.objectContaining({ code: "historyCapacityReached" })]));
    expect(now).not.toHaveBeenCalled();
    expect(uuid).not.toHaveBeenCalled();
  });

  it("does not mutate project, planning, history, sources, or separately captured preparation evidence", () => {
    const project = projectForFinalization({
      sources: [source(), source({ sourceId: otherSourceId, sourceType: "approvedDocument", authority: "approved" })],
      proposalRecord: proposal("appPurpose", { sourceIds: [sourceId, otherSourceId] }),
      decisions: [decision({ sourceIds: [sourceId, otherSourceId] })]
    });
    const preparation = preparePlanningControlledApplyTransaction({ project, proposalId });
    const projectBefore = JSON.stringify(project);
    const preparationBefore = JSON.stringify(preparation);

    const evidence = expectFinalized(finalize(project));
    expect(JSON.stringify(project)).toBe(projectBefore);
    expect(JSON.stringify(preparation)).toBe(preparationBefore);
    expect(evidence.sourceIds).toEqual([sourceId, otherSourceId]);
    expect(evidence.candidateRecord.sourceIds).toEqual([sourceId, otherSourceId]);
  });

  it("keeps current 11 clarification rules and appType blocked before finalization", () => {
    const now = vi.fn(() => timestamp);
    const uuid = vi.fn(() => generatedApplyId);
    const ruleResults = getPlanningRuleRegistry().map((rule) => finalizePlanningControlledApplyTransaction({
      project: projectForFinalization({
        proposalRecord: proposal(rule.target.targetKey, {
          ruleId: rule.ruleId,
          ruleVersion: rule.ruleVersion,
          target: { ...rule.target },
          category: rule.category,
          restriction: rule.restriction,
          uncertainty: rule.uncertainty,
          value: { kind: "clarification", question: rule.question }
        })
      }),
      proposalId
    }, { now, uuid }));
    const appTypeResult = finalize(projectForFinalization({ fieldKey: "appType" }), now, uuid);

    expect(getPlanningRuleRegistry()).toHaveLength(11);
    expect(ruleResults.every((result) => result.outcome === "blocked")).toBe(true);
    expect(appTypeResult.outcome).toBe("blocked");
    expect(now).not.toHaveBeenCalled();
    expect(uuid).not.toHaveBeenCalled();
  });

  it("is statically isolated from repository, storage, mutation, readiness, output, UI, network, and deployment", () => {
    const sourceText = readFileSync("src/lib/planningControlledApplyTransactionFinalization.ts", "utf8");

    expect(sourceText).toMatch(/preparePlanningControlledApplyTransaction/);
    expect(sourceText).toMatch(/normalizePlanningControlledApplyHistory/);
    expect(sourceText).toMatch(/CONTROLLED_APPLY_HISTORY_RECORD_LIMIT/);
    expect(sourceText).toMatch(/JSON\.stringify\(candidate\) === JSON\.stringify\(normalized\)/);
    expect(sourceText).not.toMatch(/from "\.\/projectRepository"|from "\.\/storageVersion"|from "\.\/projectFields"|from "\.\/clientReview"/);
    expect(sourceText).not.toMatch(/StorageAdapter|localStorage|browserStorage|updateProject|updateProjectFields|saveStorageState|writeCurrentStorageState|applyProjectFieldChanges/);
    expect(sourceText).not.toMatch(/readinessConfirmations|reviewItems|reviewStatus|packageGeneratedAt|generatedDocuments|generateProjectPackage|exportProjectPackage/);
    expect(sourceText).not.toMatch(/React|tsx|fetch\s*\(|XMLHttpRequest|WebSocket|wrangler|cloudflare|PowerFx|Power Fx|YAML generation/i);
    expect(sourceText).not.toMatch(/actor|approver|reviewer|rollback/i);
  });

  it("retains Draft TTI blockers and never presents finalization as persistence or apply authorization", () => {
    const result = finalize(projectForFinalization());
    const evidence = expectFinalized(result);
    const serialized = JSON.stringify({
      candidateRecord: evidence.candidateRecord,
      writeAuthorized: evidence.writeAuthorized,
      readinessEligible: evidence.readinessEligible,
      outputEligible: evidence.outputEligible
    });

    expect(serialized).not.toMatch(/Ready for Codex|schema confirmed|security approved|internal names derived|connector classified/i);
    expect(serialized).not.toMatch(/Power Fx|paste-ready YAML|Dataverse|premium connector|Graph|Power BI|SPFx|mobile support/i);
    expect(serialized).not.toMatch(/persisted|writeAuthorized":true|readinessEligible":true|outputEligible":true/i);
  });
});
