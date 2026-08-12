import { describe, expect, it } from "vitest";
import { EMPTY_PROJECT_INTAKE } from "../lib/createProject";
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import {
  CONTROLLED_APPLY_HISTORY_RECORD_LIMIT,
  CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
  normalizePlanningControlledApplyHistory,
  type PlanningControlledApplyHistoryIssueCode,
  type PlanningControlledApplyHistoryRecord
} from "../lib/planningControlledApplyHistory";
import {
  PLANNING_DECISION_ACTIONS,
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleRegistry } from "../lib/planningRules";

const projectId = "controlled-apply-history-project";
const otherProjectId = "other-controlled-apply-history-project";
const sourceId = "11111111-1111-4111-8111-111111111111";
const otherSourceId = "11111111-1111-4111-8111-111111111112";
const missingSourceId = "11111111-1111-4111-8111-111111111113";
const proposalId = "22222222-2222-4222-8222-222222222222";
const otherProposalId = "22222222-2222-4222-8222-222222222223";
const decisionId = "33333333-3333-4333-8333-333333333333";
const otherDecisionId = "33333333-3333-4333-8333-333333333334";
const staleDecisionId = "33333333-3333-4333-8333-333333333335";
const conflictId = "55555555-5555-4555-8555-555555555555";
const timestamp = "2026-08-12T03:00:00.000Z";
const fingerprint = "d".repeat(64);

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
    value: { kind: "text", value: "Applied value" },
    title: `Apply ${fieldKey}`,
    recommendation: "Use the confirmed future value.",
    rationale: "History fixture for future controlled apply.",
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

function conflict(overrides: Partial<PlanningConflictRecord> = {}): PlanningConflictRecord {
  return {
    conflictId,
    projectId,
    conflictType: "proposalVsIntake",
    severity: "blocking",
    status: "open",
    involvedReferences: [{ kind: "proposalId", proposalId }],
    explanation: "Later conflict fixture.",
    blocking: true,
    createdAt: timestamp,
    ...overrides
  };
}

function planning(overrides: {
  sources?: PlanningSourceReference[];
  proposals?: PlanningProposalRecord[];
  decisions?: PlanningDecisionRecord[];
  conflicts?: PlanningConflictRecord[];
} = {}): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: overrides.sources ?? [source()],
    proposals: overrides.proposals ?? [proposal()],
    decisions: overrides.decisions ?? [decision()],
    dependencies: [],
    conflicts: overrides.conflicts ?? []
  };
}

function applyId(index = 1): string {
  return `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, "0")}`;
}

function generatedDecisionId(index: number): string {
  return `33333333-3333-4333-8333-${String(index).padStart(12, "0")}`;
}

function record(overrides: Partial<PlanningControlledApplyHistoryRecord> = {}): PlanningControlledApplyHistoryRecord {
  const fieldKey = overrides.fieldKey ?? "appPurpose";
  return {
    applyId: applyId(),
    applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
    projectId,
    proposalId,
    decisionId,
    fieldKey,
    previousValue: "Previous value",
    appliedValue: "Applied value",
    sourceIds: [sourceId],
    appliedAt: timestamp,
    outcome: "changed",
    ...overrides
  };
}

function normalize(history: unknown, state: unknown = planning(), ownerProjectId = projectId) {
  return normalizePlanningControlledApplyHistory({
    projectId: ownerProjectId,
    planning: state,
    history
  });
}

function expectInvalidCode(result: ReturnType<typeof normalizePlanningControlledApplyHistory>, code: PlanningControlledApplyHistoryIssueCode): void {
  expect(result).toMatchObject({ outcome: "invalid" });
  if (result.outcome !== "invalid") throw new Error("Expected invalid.");
  expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
  expect("history" in result).toBe(false);
}

describe("planning controlled apply history contract", () => {
  it("accepts canonical empty history without requiring or fabricating planning", () => {
    const result = normalizePlanningControlledApplyHistory({ projectId, history: [] });

    expect(result).toEqual({
      outcome: "valid",
      history: [],
      issues: []
    });
  });

  it("accepts a successful changed record with exact provenance and no live candidate reanalysis", () => {
    const result = normalize([record()]);

    expect(result).toMatchObject({
      outcome: "valid",
      history: [
        {
          applyId: applyId(),
          applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
          projectId,
          proposalId,
          decisionId,
          fieldKey: "appPurpose",
          previousValue: "Previous value",
          appliedValue: "Applied value",
          sourceIds: [sourceId],
          appliedAt: timestamp,
          outcome: "changed"
        }
      ],
      issues: []
    });
  });

  it("accepts a successful unchanged record only when exact raw values match", () => {
    expect(normalize([record({ previousValue: "Same", appliedValue: "Same", outcome: "unchanged" })])).toMatchObject({
      outcome: "valid",
      history: [expect.objectContaining({ previousValue: "Same", appliedValue: "Same", outcome: "unchanged" })]
    });
  });

  it("preserves empty, whitespace, newline, and marker-like historical values exactly", () => {
    const whitespace = " \r\n\t Previous value  ";
    const markerValues = ["TBD", "N/A", "Unknown yet", "Missing information"];
    const result = normalize([
      record({ previousValue: "", appliedValue: "Applied value" }),
      record({ applyId: applyId(2), decisionId: otherDecisionId, previousValue: whitespace, appliedValue: "Applied value" }),
      record({ applyId: applyId(3), decisionId: generatedDecisionId(3), previousValue: markerValues.join(" | "), appliedValue: "Applied value" })
    ], planning({
      decisions: [
        decision(),
        decision({ decisionId: otherDecisionId }),
        decision({ decisionId: generatedDecisionId(3) })
      ]
    }));

    expect(result).toMatchObject({ outcome: "valid" });
    if (result.outcome !== "valid") throw new Error("Expected valid.");
    expect(result.history[0].previousValue).toBe("");
    expect(result.history[1].previousValue).toBe(whitespace);
    expect(result.history[2].previousValue).toBe(markerValues.join(" | "));
  });

  it.each(["appName", "clientName", "businessName", "appPurpose"] as const)("accepts supported field %s through canonical field ownership", (fieldKey) => {
    if (fieldKey === "appPurpose") {
      expect(Object.prototype.hasOwnProperty.call(EMPTY_PROJECT_INTAKE, fieldKey)).toBe(true);
    }
    expect(normalize([record({ fieldKey })], planning({ proposals: [proposal(fieldKey)] }))).toMatchObject({
      outcome: "valid",
      history: [expect.objectContaining({ fieldKey })]
    });
  });

  it("blocks appType and unknown project fields without casting arbitrary strings", () => {
    expectInvalidCode(normalize([record({ fieldKey: "appType" })], planning({ proposals: [proposal("appType")] })), "unsupportedSideEffectField");
    expectInvalidCode(normalize([record({ fieldKey: "notAProjectField" as never })], planning({ proposals: [proposal("notAProjectField")] })), "unsupportedProjectField");
  });

  it("blocks duplicate applyId and duplicate semantic identity without partial salvage", () => {
    expectInvalidCode(
      normalize([
        record(),
        record({ applyId: applyId(), decisionId: otherDecisionId })
      ], planning({ decisions: [decision(), decision({ decisionId: otherDecisionId })] })),
      "duplicateApplyId"
    );
    expectInvalidCode(
      normalize([
        record(),
        record({ applyId: applyId(2), previousValue: "Different", appliedValue: "Different applied" })
      ]),
      "duplicateSemanticApply"
    );
  });

  it("allows the same proposal and field with a different valid confirming decision identity", () => {
    const result = normalize([
      record(),
      record({ applyId: applyId(2), decisionId: otherDecisionId })
    ], planning({ decisions: [decision(), decision({ decisionId: otherDecisionId })] }));

    expect(result).toMatchObject({
      outcome: "valid",
      history: [expect.objectContaining({ decisionId }), expect.objectContaining({ decisionId: otherDecisionId })]
    });
  });

  it("validates project, proposal, and decision binding", () => {
    expectInvalidCode(normalize([record({ projectId: otherProjectId })]), "projectMismatch");
    expectInvalidCode(normalize([record({ proposalId: otherProposalId })], planning({ proposals: [proposal(undefined, { lastDecisionId: undefined })] })), "proposalNotFound");
    expectInvalidCode(normalize([record({ decisionId: otherDecisionId })], planning({ proposals: [proposal(undefined, { lastDecisionId: undefined })], decisions: [] })), "decisionNotFound");
    expectInvalidCode(
      normalize([record({ decisionId: otherDecisionId })], planning({
        proposals: [proposal(), proposal("problemStatement", { proposalId: otherProposalId, lastDecisionId: otherDecisionId })],
        decisions: [decision(), decision({ proposalId: otherProposalId, decisionId: otherDecisionId })]
      })),
      "invalidConfirmingDecision"
    );
  });

  it("requires the confirming decision action, origin, and resulting status", () => {
    const looseProposal = proposal("appPurpose", { lastDecisionId: undefined });
    expectInvalidCode(normalize([record()], planning({ proposals: [looseProposal], decisions: [decision({ action: "revise", previousStatus: "Needs Clarification", resultingStatus: "Revised" })] })), "invalidConfirmingDecision");
    expectInvalidCode(normalize([record()], planning({ proposals: [looseProposal], decisions: [decision({ origin: "deterministicRule" })] })), "invalidConfirmingDecision");
    expectInvalidCode(normalize([record()], planning({ proposals: [looseProposal], decisions: [decision({ origin: "migration" })] })), "invalidConfirmingDecision");
    expectInvalidCode(normalize([record()], planning({ proposals: [looseProposal], decisions: [decision({ resultingStatus: "Rejected" })] })), "invalidConfirmingDecision");
  });

  it("does not require the current proposal lifecycle to still satisfy live apply eligibility", () => {
    const staleDecision = decision({
      decisionId: staleDecisionId,
      action: "markStale",
      previousStatus: "Confirmed",
      resultingStatus: "Stale",
      origin: "deterministicRule",
      sourceIds: undefined
    });
    const state = planning({
      proposals: [proposal("appPurpose", { status: "Stale", staleReason: "sourceChanged", staleAt: timestamp, lastDecisionId: staleDecisionId })],
      decisions: [decision(), staleDecision]
    });

    expect(normalize([record()], state)).toMatchObject({ outcome: "valid" });
  });

  it("does not require historical sources to remain current or authoritative for a past apply event", () => {
    const result = normalize([record()], planning({
      sources: [source({ availability: "stale", authority: "informational", sourceType: "userAnswer" })]
    }));

    expect(result).toMatchObject({ outcome: "valid" });
  });

  it("does not invalidate history because a later open conflict would block a new live apply", () => {
    expect(normalize([record()], planning({ conflicts: [conflict()] }))).toMatchObject({ outcome: "valid" });
  });

  it("validates projectField setValue target semantics and exact field binding", () => {
    expectInvalidCode(normalize([record()], planning({ proposals: [proposal("appPurpose", { target: { kind: "readinessRequirement", domain: "readiness", targetKey: "schema", operation: "clarificationOnly" } })] })), "targetMismatch");
    expectInvalidCode(normalize([record()], planning({ proposals: [proposal("appPurpose", { target: { kind: "projectField", domain: "foundation", targetKey: "appPurpose", fieldKey: "appPurpose", operation: "clarificationOnly" } })] })), "targetMismatch");
    expectInvalidCode(normalize([record()], planning({ proposals: [proposal("appPurpose", { target: { kind: "projectField", domain: "foundation", targetKey: "appPurpose", fieldKey: "problemStatement", operation: "setValue" } })] })), "targetMismatch");
    expectInvalidCode(normalize([record()], planning({ proposals: [proposal("appPurpose", { target: { kind: "projectField", domain: "foundation", targetKey: "problemStatement", fieldKey: "appPurpose", operation: "setValue" } })] })), "targetMismatch");
    expectInvalidCode(normalize([record()], planning({ proposals: [proposal("appPurpose", { target: { kind: "projectField", domain: "foundation", targetKey: "appPurpose", fieldKey: "appPurpose", entityId: "entity-1", operation: "setValue" } })] })), "targetMismatch");
  });

  it("enforces exact source ID shape, ordering, existence, and confirming-decision binding", () => {
    const stateWithTwoSources = planning({
      sources: [source(), source({ sourceId: otherSourceId, sourceType: "approvedDocument", authority: "approved" })],
      proposals: [proposal("appPurpose", { sourceIds: [sourceId, otherSourceId] })],
      decisions: [decision({ sourceIds: [sourceId, otherSourceId] })]
    });
    expectInvalidCode(normalize([record({ sourceIds: [] })]), "invalidSourceIds");
    expectInvalidCode(normalize([record({ sourceIds: [sourceId, sourceId] })]), "invalidSourceIds");
    expectInvalidCode(normalize([record({ sourceIds: [sourceId] })], stateWithTwoSources), "sourceBindingMismatch");
    expectInvalidCode(normalize([record({ sourceIds: [sourceId, otherSourceId] })]), "sourceBindingMismatch");
    expectInvalidCode(normalize([record({ sourceIds: [otherSourceId, sourceId] })], stateWithTwoSources), "sourceBindingMismatch");
    expectInvalidCode(normalize([record({ sourceIds: [otherSourceId] })], planning({ sources: [source(), source({ sourceId: otherSourceId })] })), "sourceBindingMismatch");
    expectInvalidCode(normalize([record({ sourceIds: [missingSourceId] })], planning({ decisions: [decision({ sourceIds: [missingSourceId] })] })), "sourceNotFound");
  });

  it("enforces outcome/value invariants and exact string value types", () => {
    expectInvalidCode(normalize([record({ previousValue: "Same", appliedValue: "Same", outcome: "changed" })]), "outcomeValueMismatch");
    expectInvalidCode(normalize([record({ previousValue: "Previous", appliedValue: "Applied", outcome: "unchanged" })]), "outcomeValueMismatch");
    expectInvalidCode(normalize([{ ...record(), previousValue: null }]), "invalidPreviousValue");
    expectInvalidCode(normalize([{ ...record(), appliedValue: 7 }]), "invalidAppliedValue");
  });

  it("accepts only canonical UTC timestamps with milliseconds", () => {
    expectInvalidCode(normalize([record({ appliedAt: "0099-01-01T00:00:00.000Z" })]), "invalidTimestamp");
    expect(normalize([record({ appliedAt: "2026-02-29T23:59:59.999Z" })])).toMatchObject({ outcome: "invalid" });
    expect(normalize(
      [record({ appliedAt: "2024-02-29T23:59:59.999Z" })],
      planning({ decisions: [decision({ recordedAt: "2024-02-29T23:59:59.999Z" })] })
    )).toMatchObject({ outcome: "valid" });
    expectInvalidCode(normalize([record({ appliedAt: "2026-08-12T03:00:00Z" })]), "invalidTimestamp");
    expectInvalidCode(normalize([record({ appliedAt: "2026-08-12T03:00:00" })]), "invalidTimestamp");
    expectInvalidCode(normalize([record({ appliedAt: "2026-08-12T03:00:00.000-06:00" })]), "invalidTimestamp");
    expectInvalidCode(normalize([record({ appliedAt: "not-a-date" })]), "invalidTimestamp");
  });

  it("enforces confirmation-before-apply chronology using absolute instants", () => {
    expectInvalidCode(
      normalize([record({ appliedAt: "2026-08-12T02:59:59.999Z" })]),
      "applyPrecedesConfirmation"
    );
    expect(normalize([record({ appliedAt: "2026-08-12T03:00:00.000Z" })])).toMatchObject({ outcome: "valid" });
    expect(normalize([record({ appliedAt: "2026-08-12T03:00:00.001Z" })])).toMatchObject({ outcome: "valid" });
    expect(normalize(
      [record({ appliedAt: "2026-08-12T03:00:00.000Z" })],
      planning({ decisions: [decision({ recordedAt: "2026-08-11T21:00:00.000-06:00" })] })
    )).toMatchObject({ outcome: "valid" });
    expectInvalidCode(
      normalize(
        [record({ appliedAt: "2026-08-12T03:00:00.000Z" })],
        planning({ decisions: [decision({ recordedAt: "2026-08-11T21:00:00.001-06:00" })] })
      ),
      "applyPrecedesConfirmation"
    );
    expect(normalize(
      [record({ appliedAt: "2026-08-12T03:00:00.000Z" })],
      planning({ decisions: [decision({ recordedAt: "2026-08-12T03:00:00Z" })] })
    )).toMatchObject({ outcome: "valid" });
    expectInvalidCode(
      normalize(
        [record()],
        planning({ decisions: [decision({ recordedAt: "2026-02-29T03:00:00.000Z" })] })
      ),
      "invalidPlanning"
    );
  });

  it("enforces collection cap and sparse-array rejection without truncation or compaction", () => {
    const decisions = Array.from({ length: CONTROLLED_APPLY_HISTORY_RECORD_LIMIT }, (_, index) =>
      decision({ decisionId: generatedDecisionId(index + 1) })
    );
    const records = decisions.map((entry, index) =>
      record({ applyId: applyId(index + 1), decisionId: entry.decisionId })
    );
    const state = planning({
      proposals: [proposal("appPurpose", { lastDecisionId: generatedDecisionId(1) })],
      decisions
    });

    expect(normalize(records, state)).toMatchObject({ outcome: "valid" });
    expectInvalidCode(normalize([...records, record({ applyId: applyId(1001), decisionId: generatedDecisionId(1001) })], state), "collectionCapExceeded");

    const sparse = [record()] as unknown[];
    sparse.length = 2;
    expectInvalidCode(normalize(sparse), "sparseCollection");
  });

  it("rejects unexpected or missing record fields and provides no partial salvage", () => {
    expectInvalidCode(normalize([{ ...record(), actor: "Jason" }]), "unexpectedRecordField");
    const missing = { ...record() } as Partial<PlanningControlledApplyHistoryRecord>;
    delete missing.applySchemaVersion;
    expectInvalidCode(normalize([missing]), "invalidRecord");
    const result = normalize([record(), record({ applyId: "not-a-uuid", decisionId: otherDecisionId })], planning({
      decisions: [decision(), decision({ decisionId: otherDecisionId })]
    }));
    expectInvalidCode(result, "invalidApplyId");
  });

  it("defensively copies valid history records and never mutates caller input", () => {
    const history = [record()];
    const state = planning();
    const beforeHistory = JSON.stringify(history);
    const beforePlanning = JSON.stringify(state);
    const result = normalize(history, state);

    expect(result).toMatchObject({ outcome: "valid" });
    if (result.outcome !== "valid") throw new Error("Expected valid.");
    (result.history as PlanningControlledApplyHistoryRecord[]).push(record({ applyId: applyId(2), decisionId: otherDecisionId }));
    (result.history[0] as PlanningControlledApplyHistoryRecord).appliedValue = "mutated";
    (result.history[0].sourceIds as string[]).push(otherSourceId);

    expect(JSON.stringify(history)).toBe(beforeHistory);
    expect(JSON.stringify(state)).toBe(beforePlanning);
    expect(normalize(history, state)).toEqual(normalize(history, state));
    expect(normalize(history, state)).toMatchObject({
      outcome: "valid",
      history: [expect.objectContaining({ appliedValue: "Applied value", sourceIds: [sourceId] })]
    });
  });

  it("does not mutate caller input for invalid results and remains deterministic", () => {
    const history = [{ ...record(), readinessEligible: true }];
    const state = planning();
    const beforeHistory = JSON.stringify(history);
    const beforePlanning = JSON.stringify(state);

    const first = normalize(history, state);
    const second = normalize(history, state);

    expect(first).toEqual(second);
    expect(first).toMatchObject({ outcome: "invalid" });
    expect(JSON.stringify(history)).toBe(beforeHistory);
    expect(JSON.stringify(state)).toBe(beforePlanning);
  });

  it("rejects malformed top-level input shapes without treating them as canonical empty history", () => {
    for (const input of [null, undefined, "history", 7, { projectId, history: null }, { projectId, history: {} }]) {
      expectInvalidCode(normalizePlanningControlledApplyHistory(input), "invalidInput");
    }
  });

  it("keeps the contract statically isolated from mutation, persistence, D.3A/D.3B, readiness, output, runtime, network, and UI", () => {
    const sourceText = normalizePlanningControlledApplyHistory.toString();
    expect(sourceText).toMatch(/normalizeProjectPlanningState/);
    expect(sourceText).toMatch(/normalizeRecord/);
    expect(sourceText).not.toMatch(/planningControlledApplyContract|analyzePlanningControlledApplyCandidate/);
    expect(sourceText).not.toMatch(/planningControlledApplyDestinationContract|analyzePlanningControlledApplyProjectFieldDestination/);
    expect(sourceText).not.toMatch(/projectRepository|updateProject|updateProjectFields|applyProjectFieldChanges|browserStorage|localStorage|StorageAdapter/);
    expect(sourceText).not.toMatch(/generateProjectPackage|exportProjectPackage|generatedDocuments|packageGeneratedAt|readinessConfirmations|reviewStatus/);
    expect(sourceText).not.toMatch(/PowerFx|Power Fx|YAML generation|fetch\(|XMLHttpRequest|openai|wrangler|cloudflare|React|tsx/i);
    expect(sourceText).not.toMatch(/randomUUID|crypto|Math\.random|\bnew Date\b|Date\.now/);
  });

  it("preserves storage, ProjectRecord, planning schema, decision action, decision record, and rule isolation", () => {
    const rules = getPlanningRuleRegistry();

    expect(CURRENT_STORAGE_VERSION).toBe(4);
    expect(PLANNING_SCHEMA_VERSION).toBe("phase-5c.1.1");
    expect(PLANNING_DECISION_ACTIONS).toEqual([
      "confirm",
      "revise",
      "reject",
      "defer",
      "markNotApplicable",
      "markStale",
      "supersede",
      "block",
      "requestClarification",
      "reopen",
      "resolveConflict"
    ]);
    expect(rules).toHaveLength(11);
    for (const rule of rules) {
      expect(rule.target).toMatchObject({ kind: "readinessRequirement", operation: "clarificationOnly" });
    }
  });

  it("does not make current TTI clarification rules writable or resolve TTI Draft readiness", () => {
    const results = getPlanningRuleRegistry().map((rule, index) =>
      normalize([
        record({
          applyId: applyId(index + 1),
          fieldKey: "appPurpose",
          proposalId: rule.ruleId as never
        })
      ], planning({
        proposals: [
          proposal("appPurpose", {
            proposalId: rule.ruleId as never,
            ruleId: rule.ruleId,
            ruleVersion: rule.ruleVersion,
            target: { ...rule.target },
            category: rule.category,
            restriction: rule.restriction,
            uncertainty: rule.uncertainty,
            value: { kind: "clarification", question: rule.question }
          })
        ]
      }))
    );

    expect(results.every((result) => result.outcome === "invalid")).toBe(true);
    expect(JSON.stringify(results)).not.toMatch(/Ready for Codex|schema confirmed|internal names derived|Power Fx|YAML output/i);
  });
});
