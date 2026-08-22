// @ts-expect-error -- Vitest runs static source isolation assertions in Node; app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  isPlanningStatusOutputEligible,
  isPlanningStatusReadinessEligible,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningProposalValue,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import {
  finalizePlanningClarificationDecisionMaterialization,
  preparePlanningClarificationDecisionMaterialization,
  projectChangedDuringDecisionMaterializationResult
} from "../lib/planningClarificationDecisionMaterialization";
import { buildPlanningUserAnswerLocator } from "../lib/planningClarificationDecisionContract";
import { getPlanningRuleById } from "../lib/planningRules";

const projectId = "tti-project";
const proposalId = "22222222-2222-4222-8222-000000000001";
const projectRuleSourceId = "11111111-1111-4111-8111-000000000001";
const readinessSourceId = "11111111-1111-4111-8111-000000000002";
const userAnswerSourceId = "11111111-1111-4111-8111-000000000003";
const reviseDecisionId = "44444444-4444-4444-8444-000000000001";
const decisionId = "55555555-5555-4555-8555-000000000001";
const sourceId = "66666666-6666-4666-8666-000000000001";
const duplicateId = "11111111-1111-4111-8111-000000000001";
const conflictId = "77777777-7777-4777-8777-000000000001";
const timestamp = "2026-08-01T10:30:00.000Z";
const nextTimestamp = "2026-08-01T10:45:00.000Z";
const fingerprint = "c".repeat(64);

function textValue(value = "User supplied answer."): PlanningProposalValue {
  return { kind: "text", value };
}

function structuredValue(): PlanningProposalValue {
  return {
    kind: "structuredRecordList",
    value: [{
      approvedComponentName: textValue("Licence summary"),
      purpose: textValue("Show licence allocation totals"),
      inputs: textValue("Licence records"),
      outputs: textValue("Allocation summary"),
      usageTargets: {
        kind: "structuredRecordList",
        value: [{ targetType: { kind: "enum", value: "screen" }, targetId: textValue("dashboard") }]
      },
      confirmationSource: textValue("Approved component review")
    }]
  };
}

function ruleFor(ruleId: string) {
  const rule = getPlanningRuleById(ruleId);
  if (!rule) throw new Error(`Missing fixture rule ${ruleId}`);
  return rule;
}

function sourcesFor(ruleId = "pp.canvas.components.confirmation"): PlanningSourceReference[] {
  const rule = ruleFor(ruleId);
  return [
    {
      sourceId: projectRuleSourceId,
      sourceType: "projectRule",
      locator: `planning-rule:${rule.ruleId}`,
      label: rule.title,
      authority: "approved",
      availability: "current",
      version: rule.ruleVersion
    },
    {
      sourceId: readinessSourceId,
      sourceType: "readinessPrerequisite",
      locator: `phase-gate:${rule.target.targetKey}`,
      label: rule.title,
      authority: "approved",
      availability: "current"
    }
  ];
}

function proposalFor(
  ruleId = "pp.canvas.components.confirmation",
  overrides: Partial<PlanningProposalRecord> = {}
): PlanningProposalRecord {
  const rule = ruleFor(ruleId);
  return {
    proposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    fingerprint,
    target: { ...rule.target },
    category: "clarification",
    status: "Needs Clarification",
    value: { kind: "clarification", question: rule.question },
    title: rule.title,
    recommendation: "Ask the client to resolve this planning blocker.",
    rationale: rule.rationale,
    sourceIds: [projectRuleSourceId, readinessSourceId],
    uncertainty: rule.uncertainty,
    restriction: rule.restriction,
    createdAt: timestamp,
    updatedAt: timestamp,
    consequence: rule.consequence,
    readinessRequirementIds: [rule.target.targetKey],
    applicableProjectTypes: ["powerAppsCanvas"],
    applicableDomains: [rule.target.domain],
    ...overrides
  };
}

function userAnswerSource(overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return {
    sourceId: userAnswerSourceId,
    sourceType: "userAnswer",
    locator: buildPlanningUserAnswerLocator(proposalId, reviseDecisionId)!,
    label: "User answer",
    authority: "informational",
    availability: "current",
    observedAt: timestamp,
    ...overrides
  };
}

function reviseDecision(
  value: PlanningProposalValue,
  sourceIds: readonly string[] = [projectRuleSourceId, readinessSourceId, userAnswerSourceId]
): PlanningDecisionRecord {
  return {
    decisionId: reviseDecisionId,
    proposalId,
    projectId,
    action: "revise",
    previousStatus: "Needs Clarification",
    resultingStatus: "Revised",
    origin: "userAction",
    recordedAt: timestamp,
    value,
    sourceIds,
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
}

function blockingConflict(): PlanningConflictRecord {
  return {
    conflictId,
    projectId,
    conflictType: "proposalVsIntake",
    severity: "blocking",
    status: "open",
    involvedReferences: [{ kind: "proposalId", proposalId }],
    explanation: "Conflicting planning evidence.",
    blocking: true,
    createdAt: timestamp
  };
}

function planning(overrides: Partial<ProjectPlanningState> = {}): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: sourcesFor(),
    proposals: [proposalFor()],
    decisions: [],
    dependencies: [],
    conflicts: [],
    ...overrides
  };
}

function revisedPlanning(
  value: PlanningProposalValue = structuredValue(),
  overrides: Partial<ProjectPlanningState> = {},
  proposalOverrides: Partial<PlanningProposalRecord> = {}
): ProjectPlanningState {
  return revisedPlanningForRule("pp.canvas.components.confirmation", value, overrides, proposalOverrides);
}

function revisedPlanningForRule(
  ruleId: string,
  value: PlanningProposalValue,
  overrides: Partial<ProjectPlanningState> = {},
  proposalOverrides: Partial<PlanningProposalRecord> = {}
): ProjectPlanningState {
  return planning({
    sources: [...sourcesFor(ruleId), userAnswerSource()],
    proposals: [
      proposalFor(ruleId, {
        status: "Revised",
        value,
        sourceIds: [projectRuleSourceId, readinessSourceId, userAnswerSourceId],
        lastDecisionId: reviseDecisionId,
        ...proposalOverrides
      })
    ],
    decisions: [reviseDecision(value)],
    ...overrides
  });
}

function materialize(
  state: ProjectPlanningState,
  input: unknown,
  ids: readonly string[] = [decisionId, sourceId],
  now = nextTimestamp
) {
  const preparation = preparePlanningClarificationDecisionMaterialization(projectId, state, input);
  if (preparation.kind !== "ready") {
    return { preparation, finalized: undefined };
  }
  let index = 0;
  const finalized = finalizePlanningClarificationDecisionMaterialization(preparation, {
    now: () => now,
    uuid: () => ids[index++] ?? ""
  });
  return { preparation, finalized };
}

function expectBlockedCode(result: unknown, code: string): void {
  expect(result).toHaveProperty("result");
  const issues = (result as { result: { issues: readonly { code: string }[] } }).result.issues;
  expect(issues.map((issue) => issue.code)).toContain(code);
}

function withSourceAvailability(
  state: ProjectPlanningState,
  sourceId: string,
  availability: PlanningSourceReference["availability"]
): ProjectPlanningState {
  return {
    ...state,
    sources: state.sources.map((source) =>
      source.sourceId === sourceId ? { ...source, availability } : { ...source }
    ),
    proposals: state.proposals.map((proposal) => ({ ...proposal, sourceIds: [...proposal.sourceIds] })),
    decisions: state.decisions.map((decision) => ({
      ...decision,
      sourceIds: decision.sourceIds ? [...decision.sourceIds] : undefined,
      value: decision.value ? JSON.parse(JSON.stringify(decision.value)) as PlanningProposalValue : undefined
    })),
    dependencies: state.dependencies.map((dependency) => ({ ...dependency })),
    conflicts: state.conflicts.map((conflict) => ({ ...conflict }))
  };
}

function expectNonCurrentEvidenceBlocked(
  state: ProjectPlanningState,
  input: unknown,
  sourceId: string,
  availability: PlanningSourceReference["availability"]
): void {
  const before = JSON.stringify(state);
  const preparation = preparePlanningClarificationDecisionMaterialization(projectId, state, input);
  expect(preparation).toMatchObject({
    kind: "blocked",
    result: {
      outcome: "blocked",
      issues: [
        expect.objectContaining({
          code: "nonCurrentEvidenceSource",
          proposalId,
          sourceId,
          field: "sourceIds",
          sourceAvailability: availability
        })
      ]
    }
  });
  let nowCalls = 0;
  let uuidCalls = 0;
  if (preparation.kind === "ready") {
    finalizePlanningClarificationDecisionMaterialization(preparation, {
      now: () => {
        nowCalls += 1;
        return nextTimestamp;
      },
      uuid: () => {
        uuidCalls += 1;
        return decisionId;
      }
    });
  }
  expect(nowCalls).toBe(0);
  expect(uuidCalls).toBe(0);
  expect(JSON.stringify(state)).toBe(before);
}

describe("planning clarification human decision materialization", () => {
  it("persists revise with one decision, one informational user-answer source, complete evidence binding, and preserved fingerprint", () => {
    const answer = structuredValue();
    const state = planning();
    const before = JSON.stringify(state);

    const { finalized } = materialize(state, { proposalId, action: "revise", value: answer });

    expect(finalized?.result).toMatchObject({
      outcome: "persisted",
      projectId,
      proposalId,
      action: "revise",
      decisionId,
      createdSourceId: sourceId
    });
    expect(JSON.stringify(state)).toBe(before);
    if (!finalized?.planning) throw new Error("Expected persisted planning.");
    const candidate = finalized.planning;
    const proposal = candidate.proposals[0];
    const decision = candidate.decisions.at(-1)!;
    const source = candidate.sources.at(-1)!;
    expect(finalized?.materializedAt).toBe(nextTimestamp);
    expect(proposal).toMatchObject({
      proposalId,
      status: "Revised",
      value: answer,
      fingerprint,
      sourceIds: [projectRuleSourceId, readinessSourceId, sourceId],
      lastDecisionId: decisionId,
      updatedAt: nextTimestamp,
      createdAt: timestamp
    });
    expect(source).toMatchObject({
      sourceId,
      sourceType: "userAnswer",
      authority: "informational",
      availability: "current",
      label: "User answer",
      locator: `planning:userAnswer:${proposalId}:${decisionId}`,
      observedAt: nextTimestamp
    });
    expect(decision).toMatchObject({
      decisionId,
      proposalId,
      projectId,
      action: "revise",
      previousStatus: "Needs Clarification",
      resultingStatus: "Revised",
      origin: "userAction",
      recordedAt: nextTimestamp,
      value: answer,
      sourceIds: proposal.sourceIds,
      ruleSetVersion: PLANNING_RULE_SET_VERSION
    });
    expect(decision.reason).toBeUndefined();
    expect(isPlanningStatusReadinessEligible(proposal.status)).toBe(false);
    expect(isPlanningStatusOutputEligible(proposal.status)).toBe(false);
  });

  it("persists confirm by staling prior informational source and creating a new confirmed user-answer source in the same position", () => {
    const state = revisedPlanning();

    const { finalized } = materialize(state, { proposalId, action: "confirm" });

    expect(finalized?.result).toMatchObject({
      outcome: "persisted",
      action: "confirm",
      decisionId,
      createdSourceId: sourceId,
      staleSourceId: userAnswerSourceId
    });
    if (!finalized?.planning) throw new Error("Expected persisted planning.");
    const candidate = finalized.planning;
    const proposal = candidate.proposals[0];
    const oldSource = candidate.sources.find((source) => source.sourceId === userAnswerSourceId)!;
    const newSource = candidate.sources.find((source) => source.sourceId === sourceId)!;
    const oldDecision = candidate.decisions.find((decision) => decision.decisionId === reviseDecisionId)!;
    const confirmDecision = candidate.decisions.at(-1)!;
    expect(oldSource).toMatchObject({
      sourceId: userAnswerSourceId,
      authority: "informational",
      availability: "stale",
      locator: `planning:userAnswer:${proposalId}:${reviseDecisionId}`,
      observedAt: timestamp
    });
    expect(newSource).toMatchObject({
      sourceId,
      authority: "confirmed",
      availability: "current",
      locator: `planning:userAnswer:${proposalId}:${decisionId}`,
      observedAt: nextTimestamp
    });
    expect(proposal.sourceIds).toEqual([projectRuleSourceId, readinessSourceId, sourceId]);
    expect(oldDecision.sourceIds).toContain(userAnswerSourceId);
    expect(confirmDecision).toMatchObject({
      action: "confirm",
      previousStatus: "Revised",
      resultingStatus: "Confirmed",
      origin: "userAction",
      sourceIds: proposal.sourceIds,
      ruleSetVersion: PLANNING_RULE_SET_VERSION
    });
    expect(confirmDecision.value).toBeUndefined();
    expect(confirmDecision.reason).toBeUndefined();
  });

  it.each([
    ["reject", { proposalId, action: "reject", reason: "Not acceptable." }, "Rejected", "Not acceptable."],
    ["defer", { proposalId, action: "defer", reason: "Wait for client." }, "Deferred", "Wait for client."]
  ])("persists %s without creating user-answer sources", (_label, input, resultingStatus, reason) => {
    const { finalized } = materialize(planning(), input, [decisionId]);
    if (!finalized?.planning) throw new Error("Expected persisted planning.");
    const candidate = finalized.planning;
    const proposal = candidate.proposals[0];
    const decision = candidate.decisions.at(-1)!;
    expect(finalized?.result).toMatchObject({ outcome: "persisted", decisionId });
    expect(candidate.sources).toHaveLength(2);
    expect(proposal).toMatchObject({
      status: resultingStatus,
      value: { kind: "clarification", question: ruleFor("pp.canvas.components.confirmation").question },
      sourceIds: [projectRuleSourceId, readinessSourceId],
      lastDecisionId: decisionId,
      updatedAt: nextTimestamp
    });
    expect(decision).toMatchObject({
      action: input.action,
      reason,
      sourceIds: proposal.sourceIds,
      origin: "userAction",
      ruleSetVersion: PLANNING_RULE_SET_VERSION
    });
    expect(decision.value).toBeUndefined();
  });

  it("persists Not Applicable value without duplicating the reason into decision reason", () => {
    const componentPlanning = planning({
      sources: sourcesFor("pp.canvas.components.confirmation"),
      proposals: [proposalFor("pp.canvas.components.confirmation")]
    });

    const { finalized } = materialize(componentPlanning, {
      proposalId,
      action: "markNotApplicable",
      reason: "No reusable components are required."
    }, [decisionId]);

    if (!finalized?.planning) throw new Error("Expected persisted planning.");
    const candidate = finalized.planning;
    const proposal = candidate.proposals[0];
    const decision = candidate.decisions.at(-1)!;
    const value = { kind: "notApplicable", reason: "No reusable components are required." };
    expect(candidate.sources).toHaveLength(2);
    expect(proposal).toMatchObject({ status: "Not Applicable", value, sourceIds: [projectRuleSourceId, readinessSourceId] });
    expect(decision).toMatchObject({ action: "markNotApplicable", value, sourceIds: proposal.sourceIds });
    expect(decision.reason).toBeUndefined();
  });

  it("blocks contract failures before timestamp or UUID allocation", () => {
    let nowCalls = 0;
    let uuidCalls = 0;
    const preparation = preparePlanningClarificationDecisionMaterialization(projectId, planning(), {
      proposalId,
      action: "revise",
      value: { kind: "structuredRecord", value: { nested: { kind: "notApplicable", reason: "No." } } }
    });

    expectBlockedCode(preparation, "invalidAnswerValue");
    if (preparation.kind === "ready") {
      finalizePlanningClarificationDecisionMaterialization(preparation, {
        now: () => {
          nowCalls += 1;
          return nextTimestamp;
        },
        uuid: () => {
          uuidCalls += 1;
          return decisionId;
        }
      });
    }
    expect(nowCalls).toBe(0);
    expect(uuidCalls).toBe(0);
  });

  it.each([
    "stale",
    "missing",
    "deleted",
    "unverified"
  ] as const)("blocks revise before runtime allocation when bound evidence is %s", (availability) => {
    expectNonCurrentEvidenceBlocked(
      withSourceAvailability(planning(), readinessSourceId, availability),
      { proposalId, action: "revise", value: structuredValue() },
      readinessSourceId,
      availability
    );
  });

  it("blocks confirm before runtime allocation when deterministic evidence is non-current", () => {
    expectNonCurrentEvidenceBlocked(
      withSourceAvailability(revisedPlanning(), projectRuleSourceId, "stale"),
      { proposalId, action: "confirm" },
      projectRuleSourceId,
      "stale"
    );
  });

  it.each([
    ["reject", { proposalId, action: "reject", reason: "No longer acceptable." }],
    ["defer", { proposalId, action: "defer", reason: "Waiting for client evidence." }],
    ["markNotApplicable", { proposalId, action: "markNotApplicable", reason: "No components required." }]
  ] as const)("blocks %s before runtime allocation when bound evidence is non-current", (_label, input) => {
    const base = input.action === "markNotApplicable"
      ? planning({
          sources: sourcesFor("pp.canvas.components.confirmation"),
          proposals: [proposalFor("pp.canvas.components.confirmation")]
        })
      : planning();
    expectNonCurrentEvidenceBlocked(
      withSourceAvailability(base, readinessSourceId, "stale"),
      input,
      readinessSourceId,
      "stale"
    );
  });

  it.each([
    ["schema NA", "pp.canvas.schema.confirmation"],
    ["internal names NA", "pp.sharepoint.internalnames.confirmation"]
  ])("keeps TTI %s blocked for Not Applicable", (_label, ruleId) => {
    const state = planning({
      sources: sourcesFor(ruleId),
      proposals: [proposalFor(ruleId)]
    });
    const preparation = preparePlanningClarificationDecisionMaterialization(projectId, state, {
      proposalId,
      action: "markNotApplicable",
      reason: "No."
    });
    expectBlockedCode(preparation, "notApplicableNotAllowed");
  });

  it.each([
    ["direct confirm", planning(), { proposalId, action: "confirm" }, "invalidStatusTransition"],
    ["blocking conflict", revisedPlanning(structuredValue(), { conflicts: [blockingConflict()] }), { proposalId, action: "confirm" }, "blockingConflict"],
    ["alternative group", revisedPlanning(structuredValue(), {}, { alternativeGroupId: "22222222-2222-4222-8222-000000000002" }), { proposalId, action: "confirm" }, "alternativeDecisionRequiresControlledResolution"],
    ["stale confirm", planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { status: "Stale", staleReason: "sourceChanged", staleAt: timestamp })] }), { proposalId, action: "confirm" }, "staleClarificationRequiresReplacement"],
    ["terminal reject", planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { status: "Rejected" })] }), { proposalId, action: "revise", value: textValue() }, "terminalProposal"]
  ])("blocks %s before runtime allocation", (_label, state, input, code) => {
    const preparation = preparePlanningClarificationDecisionMaterialization(projectId, state, input);
    expectBlockedCode(preparation, code);
  });

  it.each([
    ["invalid timestamp", ["not-a-timestamp", decisionId], "invalidMaterializationTimestamp"],
    ["uuid unavailable", [nextTimestamp, undefined], "uuidUnavailable"],
    ["malformed uuid", [nextTimestamp, "BAD"], "invalidGeneratedUuid"],
    ["existing id collision", [nextTimestamp, duplicateId], "duplicateGeneratedUuid"],
    ["transaction id collision", [nextTimestamp, decisionId, decisionId], "duplicateGeneratedUuid"]
  ])("blocks %s without returning persisted", (_label, values, code) => {
    const preparation = preparePlanningClarificationDecisionMaterialization(projectId, planning(), {
      proposalId,
      action: "revise",
      value: structuredValue()
    });
    expect(preparation.kind).toBe("ready");
    let index = 0;
    const finalized = finalizePlanningClarificationDecisionMaterialization(preparation as Extract<typeof preparation, { kind: "ready" }>, {
      now: () => values[index++] as string,
      uuid: (() => values[index++]) as () => string
    });
    expect(finalized.result.outcome).toBe("blocked");
    expect(finalized.result.issues.map((issue) => issue.code)).toContain(code);
    expect(finalized.planning).toBeUndefined();
  });

  it("returns defensively isolated candidate values and fails repeated action through the current contract", () => {
    const answer = structuredValue();
    const { finalized } = materialize(planning(), { proposalId, action: "revise", value: answer });
    expect(finalized?.result.outcome).toBe("persisted");
    if (!finalized?.planning) throw new Error("Expected persisted planning.");
    const candidate = finalized.planning;
    if (candidate.proposals[0].value.kind !== "structuredRecordList") throw new Error("Expected structured-record-list answer.");
    candidate.proposals[0].value.value[0].approvedComponentName = textValue("Mutated copy");
    expect(answer).toEqual(structuredValue());

    const repeat = preparePlanningClarificationDecisionMaterialization(projectId, finalized?.planning, {
      proposalId,
      action: "revise",
      value: textValue("Second answer")
    });
    expectBlockedCode(repeat, "invalidStatusTransition");
  });

  it("blocks an unbound backend Revise before timestamp or UUID allocation", () => {
    let nowCalls = 0;
    let uuidCalls = 0;
    const backend = planning({
      sources: sourcesFor("pp.canvas.schema.confirmation"),
      proposals: [proposalFor("pp.canvas.schema.confirmation")]
    });
    const preparation = preparePlanningClarificationDecisionMaterialization(projectId, backend, {
      proposalId,
      action: "revise",
      value: textValue("Backend choice")
    });

    expectBlockedCode(preparation, "answerSchemaRequired");
    if (preparation.kind === "ready") {
      finalizePlanningClarificationDecisionMaterialization(preparation, {
        now: () => {
          nowCalls += 1;
          return nextTimestamp;
        },
        uuid: () => {
          uuidCalls += 1;
          return decisionId;
        }
      });
    }
    expect(nowCalls).toBe(0);
    expect(uuidCalls).toBe(0);
  });

  it.each([
    ["schema-invalid bound", revisedPlanning(textValue("Persistable but invalid")), "invalidAnswerValue"],
    [
      "unbound backend",
      revisedPlanningForRule("pp.canvas.schema.confirmation", textValue("Historical backend answer")),
      "answerSchemaRequired"
    ]
  ])("does not materialize %s historical Confirm", (_label, state, issueCode) => {
    const preparation = preparePlanningClarificationDecisionMaterialization(projectId, state, {
      proposalId,
      action: "confirm"
    });

    expectBlockedCode(preparation, issueCode);
    expect(preparation.kind).toBe("blocked");
  });

  it("exposes precise project-changed result and preserves readiness, output, dependencies, conflicts, and TTI gates as external state", () => {
    expect(projectChangedDuringDecisionMaterializationResult(projectId)).toMatchObject({
      outcome: "blocked",
      issues: [expect.objectContaining({ code: "projectChangedDuringDecisionMaterialization" })]
    });
    const result = materialize(planning({
      dependencies: [],
      conflicts: []
    }), { proposalId, action: "reject", reason: "No." }, [decisionId]).finalized;
    expect(result?.planning?.dependencies).toEqual([]);
    expect(result?.planning?.conflicts).toEqual([]);
    expect(isPlanningStatusReadinessEligible("Confirmed")).toBe(false);
    expect(isPlanningStatusOutputEligible("Confirmed")).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/Power Fx|generatedDocuments|readinessConfirmations|actor|email|username|approver/i);
  });

  it("does not import output, UI, readiness apply, remote, external AI, or Cloudflare concerns", () => {
    const sourceText = readFileSync("src/lib/planningClarificationDecisionMaterialization.ts", "utf8");
    expect(sourceText).not.toMatch(/generateProjectPackage|document|readinessConfirmation|applyProjectField|PowerFx|Yaml|fetch\(|XMLHttpRequest|wrangler|cloudflare|openai|external/i);
    expect(sourceText).toContain("analyzePlanningClarificationHumanDecision");
  });
});
