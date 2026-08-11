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
  analyzePlanningClarificationHumanDecision,
  buildPlanningUserAnswerLocator,
  type PlanningClarificationHumanDecisionAction
} from "../lib/planningClarificationDecisionContract";
import { getPlanningRuleById } from "../lib/planningRules";

const projectId = "tti-project";
const proposalId = "22222222-2222-4222-8222-000000000001";
const secondProposalId = "22222222-2222-4222-8222-000000000002";
const projectRuleSourceId = "11111111-1111-4111-8111-000000000001";
const readinessSourceId = "11111111-1111-4111-8111-000000000002";
const userAnswerSourceId = "11111111-1111-4111-8111-000000000003";
const reviseDecisionId = "44444444-4444-4444-8444-000000000001";
const conflictId = "66666666-6666-4666-8666-000000000001";
const timestamp = "2026-08-01T10:30:00.000Z";
const fingerprint = "b".repeat(64);

function textValue(value = "User supplied answer."): PlanningProposalValue {
  return { kind: "text", value };
}

function booleanValue(): PlanningProposalValue {
  return { kind: "boolean", value: true };
}

function enumValue(): PlanningProposalValue {
  return { kind: "enum", value: "confirmed-option" };
}

function stringListValue(): PlanningProposalValue {
  return { kind: "stringList", value: ["First", "Second"] };
}

function structuredValue(): PlanningProposalValue {
  return {
    kind: "structuredRecord",
    value: {
      owner: { kind: "text", value: "Business owner" },
      approved: { kind: "boolean", value: true }
    }
  };
}

function nestedStructuredValue(): PlanningProposalValue {
  return {
    kind: "structuredRecord",
    value: {
      owner: { kind: "text", value: "Business owner" },
      approved: { kind: "boolean", value: true },
      environment: { kind: "enum", value: "Production" },
      responsibilities: { kind: "stringList", value: ["Review", "Confirm"] },
      details: {
        kind: "structuredRecord",
        value: {
          notes: { kind: "text", value: "Nested answer remains allowed." },
          confirmed: { kind: "boolean", value: true }
        }
      }
    }
  };
}

function structuredWithNested(value: PlanningProposalValue): PlanningProposalValue {
  return {
    kind: "structuredRecord",
    value: {
      response: value
    }
  };
}

function deeplyNestedProhibitedValue(): PlanningProposalValue {
  return structuredWithNested(structuredWithNested(structuredWithNested({
    kind: "notApplicable",
    reason: "No longer applies."
  } as PlanningProposalValue)));
}

function ruleFor(ruleId: string) {
  const rule = getPlanningRuleById(ruleId);
  if (!rule) throw new Error(`Missing fixture rule ${ruleId}`);
  return rule;
}

function source(record: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return {
    sourceId: projectRuleSourceId,
    sourceType: "projectRule",
    locator: "planning-rule:pp.canvas.schema.confirmation",
    label: "Planning rule",
    authority: "approved",
    availability: "current",
    version: "1.0.0",
    ...record
  };
}

function sourcesFor(ruleId = "pp.canvas.schema.confirmation"): PlanningSourceReference[] {
  const rule = ruleFor(ruleId);
  return [
    source({
      sourceId: projectRuleSourceId,
      sourceType: "projectRule",
      locator: `planning-rule:${rule.ruleId}`,
      label: rule.title,
      version: rule.ruleVersion
    }),
    source({
      sourceId: readinessSourceId,
      sourceType: "readinessPrerequisite",
      locator: `phase-gate:${rule.target.targetKey}`,
      label: rule.title,
      version: undefined
    })
  ];
}

function proposalFor(
  ruleId = "pp.canvas.schema.confirmation",
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

function reviseDecision(
  value: PlanningProposalValue,
  sourceIds: readonly string[] = [projectRuleSourceId, readinessSourceId, userAnswerSourceId],
  overrides: Partial<PlanningDecisionRecord> = {}
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
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ...overrides
  };
}

function userAnswerSource(overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return source({
    sourceId: userAnswerSourceId,
    sourceType: "userAnswer",
    locator: buildPlanningUserAnswerLocator(proposalId, reviseDecisionId)!,
    label: "User answer",
    authority: "informational",
    availability: "current",
    version: undefined,
    ...overrides
  });
}

function blockingConflict(overrides: Partial<PlanningConflictRecord> = {}): PlanningConflictRecord {
  return {
    conflictId,
    projectId,
    conflictType: "proposalVsIntake",
    severity: "blocking",
    status: "open",
    involvedReferences: [{ kind: "proposalId", proposalId }],
    explanation: "Conflicting planning evidence.",
    blocking: true,
    createdAt: timestamp,
    ...overrides
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
  value: PlanningProposalValue = textValue(),
  overrides: Partial<ProjectPlanningState> = {},
  proposalOverrides: Partial<PlanningProposalRecord> = {}
): ProjectPlanningState {
  return planning({
    sources: [...sourcesFor(), userAnswerSource()],
    proposals: [
      proposalFor("pp.canvas.schema.confirmation", {
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

function analyze(input: {
  action: PlanningClarificationHumanDecisionAction | string;
  value?: PlanningProposalValue;
  reason?: string;
  state?: ProjectPlanningState;
  id?: string;
}) {
  return analyzePlanningClarificationHumanDecision({
    projectId,
    planning: input.state ?? planning(),
    proposalId: input.id ?? proposalId,
    action: input.action,
    value: input.value,
    reason: input.reason
  });
}

function expectBlockedCode(result: ReturnType<typeof analyze>, code: string): void {
  expect(result.outcome).toBe("blocked");
  expect(result.issues.map((issue) => issue.code)).toContain(code);
}

describe("planning clarification human decision contract", () => {
  it.each([
    ["text", textValue()],
    ["boolean", booleanValue()],
    ["enum", enumValue()],
    ["string-list", stringListValue()],
    ["structured-record", structuredValue()]
  ])("allows Needs Clarification -> Revised with a valid %s answer", (_label, value) => {
    const result = analyze({ action: "revise", value });

    expect(result).toMatchObject({
      outcome: "allowed",
      plan: {
        proposalId,
        action: "revise",
        previousStatus: "Needs Clarification",
        resultingStatus: "Revised",
        nextValue: value,
        decisionValue: value,
        userAnswerSourceAction: "createInformational",
        futureDecisionOrigin: "userAction",
        futureDecisionRuleSetVersion: PLANNING_RULE_SET_VERSION,
        preserveProposalId: true,
        preserveFingerprint: true,
        readinessEligible: false,
        outputEligible: false
      }
    });
  });

  it.each([
    ["clarification", { kind: "clarification", question: "Still unanswered?" } as PlanningProposalValue],
    ["deferred", { kind: "deferred", reason: "Later." } as PlanningProposalValue],
    ["not-applicable", { kind: "notApplicable", reason: "No longer applies." } as PlanningProposalValue],
    ["record-creation", { kind: "recordCreation", value: { name: textValue("Record") } } as PlanningProposalValue]
  ])("rejects %s values as revision answers", (_label, value) => {
    expectBlockedCode(analyze({ action: "revise", value }), "invalidAnswerValue");
  });

  it.each([
    ["nested not-applicable", structuredWithNested({ kind: "notApplicable", reason: "No longer applies." } as PlanningProposalValue)],
    ["nested deferred", structuredWithNested({ kind: "deferred", reason: "Later." } as PlanningProposalValue)],
    ["nested clarification", structuredWithNested({ kind: "clarification", question: "Still unresolved?" } as PlanningProposalValue)],
    ["nested record-creation", structuredWithNested({ kind: "recordCreation", value: { name: textValue("Record") } } as PlanningProposalValue)],
    ["deeply nested not-applicable", deeplyNestedProhibitedValue()]
  ])("rejects %s values inside structured revision answers", (_label, value) => {
    expectBlockedCode(analyze({ action: "revise", value }), "invalidAnswerValue");
  });

  it("allows valid nested structured revision answers", () => {
    const value = nestedStructuredValue();

    const result = analyze({ action: "revise", value });

    expect(result).toMatchObject({
      outcome: "allowed",
      plan: {
        action: "revise",
        resultingStatus: "Revised",
        nextValue: value,
        decisionValue: value,
        userAnswerSourceAction: "createInformational"
      }
    });
  });

  it("blocks direct Needs Clarification -> Confirmed and allows Revised -> Confirmed with coherent revision history", () => {
    expectBlockedCode(analyze({ action: "confirm" }), "invalidStatusTransition");

    const result = analyze({ action: "confirm", state: revisedPlanning() });

    expect(result).toMatchObject({
      outcome: "allowed",
      plan: {
        action: "confirm",
        previousStatus: "Revised",
        resultingStatus: "Confirmed",
        nextValue: textValue(),
        userAnswerSourceAction: "createConfirmedAndStalePriorInformational",
        futureDecisionOrigin: "userAction",
        readinessEligible: false,
        outputEligible: false
      }
    });
    expect(result.outcome === "allowed" ? result.plan.decisionValue : "unexpected").toBeUndefined();
  });

  it("blocks confirmation when informational user-answer provenance is missing or malformed", () => {
    expectBlockedCode(
      analyze({
        action: "confirm",
        state: revisedPlanning(textValue(), { sources: sourcesFor() })
      }),
      "invalidPlanning"
    );

    expectBlockedCode(
      analyze({
        action: "confirm",
        state: revisedPlanning(textValue(), {
          sources: [...sourcesFor(), userAnswerSource({ locator: "planning:userAnswer:not-canonical" })]
        })
      }),
      "userAnswerSourceInvalid"
    );
  });

  it("blocks confirmation when revision decision value or source binding does not match the current proposal", () => {
    expectBlockedCode(
      analyze({
        action: "confirm",
        state: revisedPlanning(textValue(), {
          decisions: [reviseDecision(textValue("Different answer."))]
        })
      }),
      "revisionHistoryInvalid"
    );

    expectBlockedCode(
      analyze({
        action: "confirm",
        state: revisedPlanning(textValue(), {
          decisions: [reviseDecision(textValue(), [projectRuleSourceId, userAnswerSourceId])]
        })
      }),
      "revisionHistoryInvalid"
    );
  });

  it("allows Needs Clarification -> Not Applicable only when the governing rule permits it", () => {
    const component = analyze({
      action: "markNotApplicable",
      reason: "No reusable components are required.",
      state: planning({
        sources: sourcesFor("pp.canvas.components.confirmation"),
        proposals: [proposalFor("pp.canvas.components.confirmation")]
      })
    });
    expect(component).toMatchObject({
      outcome: "allowed",
      plan: {
        resultingStatus: "Not Applicable",
        nextValue: { kind: "notApplicable", reason: "No reusable components are required." },
        decisionValue: { kind: "notApplicable", reason: "No reusable components are required." },
        userAnswerSourceAction: "none"
      }
    });
    expect(component.outcome === "allowed" ? component.plan.decisionReason : "unexpected").toBeUndefined();

    expectBlockedCode(
      analyze({ action: "markNotApplicable", reason: "Schema is not needed." }),
      "notApplicableNotAllowed"
    );
    expectBlockedCode(
      analyze({
        action: "markNotApplicable",
        reason: "Internal names are not needed.",
        state: planning({
          sources: sourcesFor("pp.sharepoint.internalnames.confirmation"),
          proposals: [proposalFor("pp.sharepoint.internalnames.confirmation")]
        })
      }),
      "notApplicableNotAllowed"
    );
  });

  it("requires reasons for Not Applicable, reject, and defer", () => {
    expectBlockedCode(analyze({ action: "markNotApplicable", state: planning({
      sources: sourcesFor("pp.canvas.yamlplanning.confirmation"),
      proposals: [proposalFor("pp.canvas.yamlplanning.confirmation")]
    }) }), "reasonRequired");
    expectBlockedCode(analyze({ action: "reject" }), "reasonRequired");
    expectBlockedCode(analyze({ action: "defer" }), "reasonRequired");
  });

  it("allows reject and defer with reason while preserving value and creating no user-answer source", () => {
    expect(analyze({ action: "reject", reason: "Question is based on wrong scope." })).toMatchObject({
      outcome: "allowed",
      plan: {
        resultingStatus: "Rejected",
        decisionReason: "Question is based on wrong scope.",
        nextValue: { kind: "clarification" },
        userAnswerSourceAction: "none"
      }
    });

    expect(analyze({ action: "defer", reason: "Waiting for stakeholder review." })).toMatchObject({
      outcome: "allowed",
      plan: {
        resultingStatus: "Deferred",
        decisionReason: "Waiting for stakeholder review.",
        nextValue: { kind: "clarification" },
        userAnswerSourceAction: "none"
      }
    });
  });

  it("enforces the deferral rule flag in the production contract", () => {
    const sourceText = readFileSync("src/lib/planningClarificationDecisionContract.ts", "utf8");

    expect(sourceText).toContain("rule.deferralAllowed");
    expect(sourceText).toContain("deferralNotAllowed");
  });

  it("blocks confirmation for open blocking conflicts and alternative groups", () => {
    expectBlockedCode(
      analyze({ action: "confirm", state: revisedPlanning(textValue(), { conflicts: [blockingConflict()] }) }),
      "blockingConflict"
    );
    expectBlockedCode(
      analyze({ action: "confirm", state: revisedPlanning(textValue(), {}, { alternativeGroupId: secondProposalId }) }),
      "alternativeDecisionRequiresControlledResolution"
    );
  });

  it("blocks stale clarification confirmation and every action on terminal history", () => {
    expectBlockedCode(
      analyze({
        action: "confirm",
        state: planning({
          proposals: [proposalFor("pp.canvas.schema.confirmation", { status: "Stale", staleReason: "sourceChanged", staleAt: timestamp })]
        })
      }),
      "staleClarificationRequiresReplacement"
    );

    for (const status of ["Rejected", "Superseded"] as const) {
      for (const action of ["revise", "confirm", "reject", "defer", "markNotApplicable"] as const) {
        expectBlockedCode(
          analyze({
            action,
            value: textValue(),
            reason: "Terminal records stay historical.",
            state: planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { status })] })
          }),
          "terminalProposal"
        );
      }
    }
  });

  it("builds only canonical user-answer locators", () => {
    const alphabeticProposalId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const alphabeticDecisionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    expect(buildPlanningUserAnswerLocator(proposalId, reviseDecisionId)).toBe(
      `planning:userAnswer:${proposalId}:${reviseDecisionId}`
    );
    expect(buildPlanningUserAnswerLocator(alphabeticProposalId, alphabeticDecisionId)).toBe(
      `planning:userAnswer:${alphabeticProposalId}:${alphabeticDecisionId}`
    );
    expect(buildPlanningUserAnswerLocator(alphabeticProposalId.toUpperCase(), alphabeticDecisionId)).toBeNull();
    expect(buildPlanningUserAnswerLocator(proposalId, "not-a-uuid")).toBeNull();
  });

  it("keeps revision fingerprints deterministic and outside human answer content", () => {
    const result = analyze({ action: "revise", value: textValue("A revised answer.") });

    expect(result.outcome).toBe("allowed");
    expect(result.outcome === "allowed" ? result.plan.preserveFingerprint : false).toBe(true);
    expect(JSON.stringify(result)).not.toContain("humanFingerprint");
  });

  it("keeps decision plans isolated from readiness, output, actor identity, persistence, runtime, and controlled apply", () => {
    const result = analyze({ action: "confirm", state: revisedPlanning() });
    const serialized = JSON.stringify(result);
    const sourceText = readFileSync("src/lib/planningClarificationDecisionContract.ts", "utf8");

    expect(serialized).not.toMatch(/actor|username|email|approver|role|identity/i);
    expect(serialized).not.toMatch(/sourceId":"[0-9a-f-]{36}|decisionId":"[0-9a-f-]{36}/);
    expect(isPlanningStatusReadinessEligible("Confirmed")).toBe(false);
    expect(isPlanningStatusOutputEligible("Confirmed")).toBe(false);
    expect(sourceText).not.toMatch(/\bDate\b|Date\.now|randomUUID|crypto|localStorage|browserStorage|writeCurrentStorageState/);
    expect(sourceText).not.toMatch(/generateProjectPackage|exportProjectPackage|readinessConfirmations|powerFx|yaml/i);
  });

  it("returns defensive plan copies and does not mutate caller planning or values", () => {
    const state = planning();
    const value = structuredValue();
    const beforeState = JSON.stringify(state);
    const beforeValue = JSON.stringify(value);
    const result = analyze({ action: "revise", value, state });

    expect(JSON.stringify(state)).toBe(beforeState);
    expect(JSON.stringify(value)).toBe(beforeValue);
    if (result.outcome !== "allowed" || result.plan.nextValue.kind !== "structuredRecord") {
      throw new Error("Expected allowed structured revision plan.");
    }
    result.plan.nextValue.value.owner = textValue("Mutated returned plan only.");

    expect(JSON.stringify(state)).toBe(beforeState);
    expect(JSON.stringify(value)).toBe(beforeValue);
    expect(analyze({ action: "revise", value, state })).toMatchObject({ outcome: "allowed", plan: { nextValue: structuredValue() } });
  });

  it("is independent of source and decision input order where identity, sourceIds, and history are unchanged", () => {
    const ordered = analyze({ action: "confirm", state: revisedPlanning() });
    const reversed = analyze({
      action: "confirm",
      state: revisedPlanning(textValue(), {
        sources: [...revisedPlanning().sources].reverse(),
        decisions: [...revisedPlanning().decisions].reverse()
      })
    });

    expect(reversed).toEqual(ordered);
  });

  it("blocks unknown, non-clarification, mismatched-rule, invalid-planning, and unsupported-action inputs", () => {
    expectBlockedCode(analyze({ action: "revise", value: textValue(), id: secondProposalId }), "proposalNotFound");
    expectBlockedCode(
      analyze({
        action: "revise",
        value: textValue(),
        state: planning({ proposals: [{ ...proposalFor(), category: "architectProposal" }] })
      }),
      "proposalNotClarification"
    );
    expectBlockedCode(
      analyze({
        action: "revise",
        value: textValue(),
        state: planning({ proposals: [{ ...proposalFor(), ruleVersion: "2.0.0" }] })
      }),
      "ruleMismatch"
    );
    expectBlockedCode(analyzePlanningClarificationHumanDecision(null) as ReturnType<typeof analyze>, "invalidInput");
    expectBlockedCode(
      analyzePlanningClarificationHumanDecision({ projectId, planning: { ...planning(), schemaVersion: "future" }, proposalId, action: "revise", value: textValue() }) as ReturnType<typeof analyze>,
      "invalidPlanning"
    );
    expectBlockedCode(analyze({ action: "markStale", value: textValue() }), "unsupportedHumanAction");
  });

  it("keeps TTI component and YAML Not Applicable allowed while schema and internal names remain blocked", () => {
    for (const ruleId of ["pp.canvas.components.confirmation", "pp.canvas.yamlplanning.confirmation"]) {
      expect(analyze({
        action: "markNotApplicable",
        reason: "This target is not applicable for the approved TTI scope.",
        state: planning({ sources: sourcesFor(ruleId), proposals: [proposalFor(ruleId)] })
      })).toMatchObject({ outcome: "allowed", plan: { resultingStatus: "Not Applicable" } });
    }

    for (const ruleId of ["pp.canvas.schema.confirmation", "pp.sharepoint.internalnames.confirmation"]) {
      expectBlockedCode(
        analyze({
          action: "markNotApplicable",
          reason: "Do not fabricate this blocker.",
          state: planning({ sources: sourcesFor(ruleId), proposals: [proposalFor(ruleId)] })
        }),
        "notApplicableNotAllowed"
      );
    }
  });

  it("allows TTI security content revision without implying Architect approval, readiness, output, Power Fx, or YAML generation", () => {
    const result = analyze({
      action: "revise",
      value: textValue("Security matrix requires role-by-role confirmation from the approved source."),
      state: planning({
        sources: sourcesFor("pp.security.permissions.confirmation"),
        proposals: [proposalFor("pp.security.permissions.confirmation")]
      })
    });

    expect(result).toMatchObject({
      outcome: "allowed",
      plan: {
        action: "revise",
        resultingStatus: "Revised",
        futureDecisionOrigin: "userAction",
        readinessEligible: false,
        outputEligible: false
      }
    });
    expect(JSON.stringify(result)).not.toMatch(/Architect approved|Power Fx|YAML|generatedDocuments|export/i);
  });
});
