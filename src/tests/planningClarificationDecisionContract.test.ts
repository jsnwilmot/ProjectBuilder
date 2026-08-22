// @ts-expect-error -- Vitest runs static source isolation assertions in Node; app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  isPlanningStatusOutputEligible,
  isPlanningStatusReadinessEligible,
  normalizeProjectPlanningState,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningProposalValue,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import {
  analyzePlanningClarificationDecisionCapabilities,
  analyzePlanningClarificationHumanDecision,
  buildPlanningUserAnswerLocator,
  type PlanningClarificationDecisionCapabilitiesResult,
  type PlanningClarificationHumanDecisionAction
} from "../lib/planningClarificationDecisionContract";
import { getPlanningRuleById, getPlanningRuleRegistry } from "../lib/planningRules";

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
const BOUND_RULE_IDS = [
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

function textValue(value = "User supplied answer."): PlanningProposalValue {
  return { kind: "text", value };
}

function yamlAnswer(valuePrefix = "Approved"): PlanningProposalValue {
  return {
    kind: "structuredRecord",
    value: {
      installationResponsibility: textValue(`${valuePrefix} installation owner`),
      validationResponsibility: textValue(`${valuePrefix} validation owner`),
      yamlInstallationLocation: textValue(`${valuePrefix} installation location`),
      yamlParentRelationship: textValue(`${valuePrefix} parent relationship`)
    }
  };
}

function internalNamesAnswer(): PlanningProposalValue {
  return {
    kind: "structuredRecordList",
    value: [{
      parentType: { kind: "enum", value: "list" },
      parentId: textValue("tti-software-titles"),
      displayName: textValue("Software Title"),
      internalName: textValue("SoftwareTitle"),
      confirmationSource: textValue("Authoritative SharePoint list settings")
    }]
  };
}

function componentsAnswer(): PlanningProposalValue {
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

function securityAnswer(): PlanningProposalValue {
  return {
    kind: "structuredRecordList",
    value: [{
      userRole: textValue("Licence manager"),
      viewPermission: textValue("Approved records"),
      createPermission: textValue("Authorized assignments"),
      editPermission: textValue("Authorized assignments"),
      archivePermission: textValue("Authorized assignments"),
      restorePermission: textValue("Authorized assignments"),
      approvePermission: textValue("Approved exceptions"),
      administerPermission: textValue("No administration"),
      confirmationSource: textValue("Approved security review")
    }]
  };
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

function sourcesFor(ruleId = "pp.canvas.yamlplanning.confirmation"): PlanningSourceReference[] {
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
  ruleId = "pp.canvas.yamlplanning.confirmation",
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
  value: PlanningProposalValue = yamlAnswer(),
  overrides: Partial<ProjectPlanningState> = {},
  proposalOverrides: Partial<PlanningProposalRecord> = {}
): ProjectPlanningState {
  return planning({
    sources: [...sourcesFor(), userAnswerSource()],
    proposals: [
      proposalFor("pp.canvas.yamlplanning.confirmation", {
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

function analyzeCapabilities(
  state: ProjectPlanningState = planning(),
  id: string = proposalId
): PlanningClarificationDecisionCapabilitiesResult {
  return analyzePlanningClarificationDecisionCapabilities({ projectId, planning: state, proposalId: id });
}

function capability(
  result: PlanningClarificationDecisionCapabilitiesResult,
  action: PlanningClarificationHumanDecisionAction
) {
  const match = result.capabilities.find((candidate) => candidate.action === action);
  if (!match) throw new Error(`Missing capability ${action}`);
  return match;
}

function expectAllCapabilitiesUnavailable(result: PlanningClarificationDecisionCapabilitiesResult): void {
  expect(result.capabilities).toHaveLength(5);
  expect(result.capabilities.every((entry) => entry.state === "unavailable" && entry.requiredInput === "none")).toBe(true);
}

describe("planning clarification human decision contract", () => {
  it("allows a valid exact-schema root structured-record-list revision", () => {
    const value = internalNamesAnswer();
    const state = planning({
      sources: sourcesFor("pp.sharepoint.internalnames.confirmation"),
      proposals: [proposalFor("pp.sharepoint.internalnames.confirmation")]
    });
    const result = analyze({ action: "revise", value, state });

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

  it("allows a nested structured-record-list only through its exact registered schema", () => {
    const value = componentsAnswer();
    const state = planning({
      sources: sourcesFor("pp.canvas.components.confirmation"),
      proposals: [proposalFor("pp.canvas.components.confirmation")]
    });
    const result = analyze({ action: "revise", value, state });

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
    expect(normalizeProjectPlanningState(state, projectId).issues).toEqual([]);
  });

  it.each([
    ["missingRequiredField", { kind: "structuredRecord", value: {} }, "missingRequiredField"],
    ["wrong kind", textValue("Wrong kind"), "kindMismatch"],
    ["unexpected field", {
      ...yamlAnswer(),
      value: { ...(yamlAnswer() as Extract<PlanningProposalValue, { kind: "structuredRecord" }>).value, SECRET_UNKNOWN_FIELD: textValue("SECRET CONTENT") }
    }, "unexpectedField"]
  ])("projects %s semantic failures as one private contract issue", (_label, value, underlyingIssueCode) => {
    const result = analyze({ action: "revise", value: value as PlanningProposalValue });
    expect(result).toMatchObject({
      outcome: "blocked",
      issues: [{ code: "invalidAnswerValue", field: "value", underlyingIssueCode }]
    });
    expect(JSON.stringify(result)).not.toMatch(/SECRET_UNKNOWN_FIELD|SECRET CONTENT|Wrong kind/);
  });

  it.each([
    ["invalid enum", {
      kind: "structuredRecordList",
      value: [{
        parentType: { kind: "enum", value: "SECRET INVALID ENUM" },
        parentId: textValue("tti-software-titles"),
        displayName: textValue("Software Title"),
        internalName: textValue("SoftwareTitle"),
        confirmationSource: textValue("Approved source")
      }]
    }, "enumOptionInvalid"],
    ["minimum items", { kind: "structuredRecordList", value: [] }, "minItemsNotMet"],
    ["aggregate bound", { kind: "structuredRecordList", value: Array.from({ length: 101 }, () => (internalNamesAnswer() as Extract<PlanningProposalValue, { kind: "structuredRecordList" }>).value[0]) }, "invalidAnswer"]
  ])("fails closed for internal-name %s without echoing submitted content", (_label, value, underlyingIssueCode) => {
    const state = planning({
      sources: sourcesFor("pp.sharepoint.internalnames.confirmation"),
      proposals: [proposalFor("pp.sharepoint.internalnames.confirmation")]
    });
    const result = analyze({ action: "revise", value: value as PlanningProposalValue, state });
    expect(result).toMatchObject({
      outcome: "blocked",
      issues: [{ code: "invalidAnswerValue", field: "value", underlyingIssueCode }]
    });
    expect(JSON.stringify(result)).not.toContain("SECRET INVALID ENUM");
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
        nextValue: yamlAnswer(),
        userAnswerSourceAction: "createConfirmedAndStalePriorInformational",
        futureDecisionOrigin: "userAction",
        readinessEligible: false,
        outputEligible: false
      }
    });
    expect(result.outcome === "allowed" ? result.plan.decisionValue : "unexpected").toBeUndefined();
  });

  it("blocks capability and execution for a schema-invalid historical bound revision", () => {
    const state = revisedPlanning(textValue("SECRET HISTORICAL ANSWER"));
    expect(capability(analyzeCapabilities(state), "confirm")).toMatchObject({
      state: "unavailable",
      requiredInput: "none",
      reasonCodes: ["invalidAnswerValue"]
    });
    const result = analyze({ action: "confirm", state });
    expect(result).toMatchObject({
      outcome: "blocked",
      issues: [{ code: "invalidAnswerValue", field: "value", underlyingIssueCode: "kindMismatch" }]
    });
    expect(JSON.stringify(result)).not.toContain("SECRET HISTORICAL ANSWER");
  });

  it("blocks capability and execution for an unbound historical backend revision", () => {
    const value = textValue("Historical backend answer");
    const state = planning({
      sources: [...sourcesFor("pp.canvas.schema.confirmation"), userAnswerSource()],
      proposals: [proposalFor("pp.canvas.schema.confirmation", {
        status: "Revised",
        value,
        sourceIds: [projectRuleSourceId, readinessSourceId, userAnswerSourceId],
        lastDecisionId: reviseDecisionId
      })],
      decisions: [reviseDecision(value)]
    });
    expect(capability(analyzeCapabilities(state), "confirm")).toMatchObject({
      state: "unavailable",
      requiredInput: "none",
      reasonCodes: ["answerSchemaRequired"]
    });
    expect(analyze({ action: "confirm", state })).toMatchObject({
      outcome: "blocked",
      issues: [{ code: "answerSchemaRequired", field: "value" }]
    });
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
      analyze({
        action: "markNotApplicable",
        reason: "Schema is not needed.",
        state: planning({
          sources: sourcesFor("pp.canvas.schema.confirmation"),
          proposals: [proposalFor("pp.canvas.schema.confirmation")]
        })
      }),
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
    const result = analyze({ action: "revise", value: yamlAnswer() });

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
    const value = yamlAnswer();
    const beforeState = JSON.stringify(state);
    const beforeValue = JSON.stringify(value);
    const result = analyze({ action: "revise", value, state });

    expect(JSON.stringify(state)).toBe(beforeState);
    expect(JSON.stringify(value)).toBe(beforeValue);
    if (result.outcome !== "allowed" || result.plan.nextValue.kind !== "structuredRecord") {
      throw new Error("Expected allowed structured revision plan.");
    }
    result.plan.nextValue.value.installationResponsibility = textValue("Mutated returned plan only.");

    expect(JSON.stringify(state)).toBe(beforeState);
    expect(JSON.stringify(value)).toBe(beforeValue);
    expect(analyze({ action: "revise", value, state })).toMatchObject({ outcome: "allowed", plan: { nextValue: yamlAnswer() } });
  });

  it("uses the semantic validator's canonical answer instead of the caller object", () => {
    const value = yamlAnswer() as Extract<PlanningProposalValue, { kind: "structuredRecord" }>;
    value.value.installationResponsibility = textValue("  Approved installation owner  ");
    const before = JSON.stringify(value);
    const result = analyze({ action: "revise", value });

    expect(result).toMatchObject({
      outcome: "allowed",
      plan: {
        nextValue: { kind: "structuredRecord", value: { installationResponsibility: textValue("Approved installation owner") } },
        decisionValue: { kind: "structuredRecord", value: { installationResponsibility: textValue("Approved installation owner") } }
      }
    });
    expect(JSON.stringify(value)).toBe(before);
  });

  it("is independent of source and decision input order where identity, sourceIds, and history are unchanged", () => {
    const ordered = analyze({ action: "confirm", state: revisedPlanning() });
    const reversed = analyze({
      action: "confirm",
      state: revisedPlanning(yamlAnswer(), {
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

  it.each(["answerSchema", "actor"])("rejects unsupported direct contract field %s without using its contents", (field) => {
    const secret = "SECRET CALLER SCHEMA CONTENT";
    const result = analyzePlanningClarificationHumanDecision({
      projectId,
      planning: planning(),
      proposalId,
      action: "revise",
      value: yamlAnswer(),
      [field]: { secret }
    });

    expect(result).toMatchObject({ outcome: "blocked", issues: [{ code: "invalidInput", field }] });
    expect(JSON.stringify(result)).not.toContain(secret);
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
      value: securityAnswer(),
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

  describe("pre-input action capabilities", () => {
    it("returns exactly five deterministic action capabilities and only approved input metadata", () => {
      const first = analyzeCapabilities();
      const second = analyzeCapabilities();

      expect(first).toEqual(second);
      expect(first.capabilities.map((entry) => entry.action)).toEqual([
        "revise",
        "confirm",
        "reject",
        "defer",
        "markNotApplicable"
      ]);
      expect(new Set(first.capabilities.map((entry) => entry.state))).toEqual(new Set([
        "unavailable",
        "inputRequired"
      ]));
      expect(first.capabilities.every((entry) => ["none", "reason", "answerSchema", "answer"].includes(entry.requiredInput))).toBe(true);
      expect(JSON.stringify(first)).not.toMatch(/text|boolean|enum|stringList|structuredRecord|editorType|valueKind/);
    });

    it("reports the exact Needs Clarification matrix without fabricating answer or reason input", () => {
      const result = analyzeCapabilities();

      expect(capability(result, "revise")).toEqual({
        action: "revise",
        state: "inputRequired",
        requiredInput: "answer",
        reasonCodes: ["answerRequired"]
      });
      expect(capability(result, "confirm")).toMatchObject({ state: "unavailable", requiredInput: "none" });
      expect(capability(result, "reject")).toEqual({
        action: "reject",
        state: "inputRequired",
        requiredInput: "reason",
        reasonCodes: ["reasonRequired"]
      });
      expect(capability(result, "defer")).toEqual({
        action: "defer",
        state: "inputRequired",
        requiredInput: "reason",
        reasonCodes: ["reasonRequired"]
      });
      expect(capability(result, "markNotApplicable")).toMatchObject({
        state: "inputRequired",
        requiredInput: "reason",
        reasonCodes: ["reasonRequired"]
      });
    });

    it("reports schema-supported Revise capability for all ten exact bound identities", () => {
      for (const ruleId of BOUND_RULE_IDS) {
        const state = planning({ sources: sourcesFor(ruleId), proposals: [proposalFor(ruleId)] });
        expect(capability(analyzeCapabilities(state), "revise"), ruleId).toEqual({
          action: "revise",
          state: "inputRequired",
          requiredInput: "answer",
          reasonCodes: ["answerRequired"]
        });
      }
    });

    it("keeps the unbound backend schema-blocked without accepting a generic fallback", () => {
      const state = planning({
        sources: sourcesFor("pp.canvas.schema.confirmation"),
        proposals: [proposalFor("pp.canvas.schema.confirmation")]
      });
      expect(capability(analyzeCapabilities(state), "revise")).toEqual({
        action: "revise",
        state: "answerSchemaRequired",
        requiredInput: "answerSchema",
        reasonCodes: ["answerSchemaRequired"]
      });
      expect(analyze({ action: "revise", value: textValue("Generic fallback must not run."), state })).toMatchObject({
        outcome: "blocked",
        issues: [{ code: "answerSchemaRequired", field: "value" }]
      });
    });

    it("reports the exact Revised matrix and makes Confirm available only with coherent evidence", () => {
      const result = analyzeCapabilities(revisedPlanning());

      expect(capability(result, "revise")).toMatchObject({ state: "unavailable", requiredInput: "none" });
      expect(capability(result, "confirm")).toEqual({
        action: "confirm",
        state: "available",
        requiredInput: "none",
        reasonCodes: []
      });
      expect(capability(result, "reject")).toMatchObject({ state: "inputRequired", requiredInput: "reason" });
      expect(capability(result, "defer")).toMatchObject({ state: "inputRequired", requiredInput: "reason" });
      expect(capability(result, "markNotApplicable")).toMatchObject({ state: "unavailable", requiredInput: "none" });
    });

    it.each([
      ["Confirmed", planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { status: "Confirmed", value: textValue() })] })],
      ["Rejected", planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { status: "Rejected" })] })],
      ["Superseded", planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { status: "Superseded" })] })],
      ["Not Applicable", planning({
        sources: sourcesFor("pp.canvas.components.confirmation"),
        proposals: [proposalFor("pp.canvas.components.confirmation", {
          status: "Not Applicable",
          value: { kind: "notApplicable", reason: "Components are not required." }
        })]
      })]
    ])("makes all actions unavailable for %s", (_status, state) => {
      expectAllCapabilitiesUnavailable(analyzeCapabilities(state));
    });

    it.each([
      ["Deferred", planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { status: "Deferred" })] }), false],
      ["Stale", planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", {
        status: "Stale",
        staleReason: "sourceChanged",
        staleAt: timestamp
      })] }), true],
      ["Blocked", planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { status: "Blocked" })] }), true]
    ])("reflects the existing Reject/Defer boundary for %s", (_status, state, deferAllowed) => {
      const result = analyzeCapabilities(state);

      expect(capability(result, "revise")).toMatchObject({ state: "unavailable" });
      expect(capability(result, "confirm")).toMatchObject({ state: "unavailable" });
      expect(capability(result, "reject")).toMatchObject({ state: "inputRequired", requiredInput: "reason" });
      expect(capability(result, "defer")).toMatchObject(deferAllowed
        ? { state: "inputRequired", requiredInput: "reason" }
        : { state: "unavailable", requiredInput: "none" });
      expect(capability(result, "markNotApplicable")).toMatchObject({ state: "unavailable" });
      expect(result.capabilities.map((entry) => entry.action)).not.toContain("replace");
      expect(result.capabilities.map((entry) => entry.action)).not.toContain("unblock");
    });

    it("disables Confirm for conflicts, alternative groups, broken history, and invalid informational evidence", () => {
      const cases: Array<[ProjectPlanningState, string]> = [
        [revisedPlanning(textValue(), { conflicts: [blockingConflict()] }), "blockingConflict"],
        [revisedPlanning(textValue(), {}, { alternativeGroupId: secondProposalId }), "alternativeDecisionRequiresControlledResolution"],
        [revisedPlanning(textValue(), { decisions: [reviseDecision(textValue("Different answer."))] }), "revisionHistoryInvalid"],
        [revisedPlanning(textValue(), {
          sources: [...sourcesFor(), userAnswerSource({ locator: "planning:userAnswer:not-canonical" })]
        }), "userAnswerSourceInvalid"]
      ];

      for (const [state, reasonCode] of cases) {
        expect(capability(analyzeCapabilities(state), "confirm")).toMatchObject({
          state: "unavailable",
          requiredInput: "none",
          reasonCodes: [reasonCode]
        });
      }

      const missingEvidence = analyzeCapabilities(revisedPlanning(textValue(), { sources: sourcesFor() }));
      expectAllCapabilitiesUnavailable(missingEvidence);
      expect(missingEvidence.issues.map((entry) => entry.code)).toContain("invalidPlanning");
    });

    it("derives current N/A capabilities from all 11 registered rule flags", () => {
      const rules = getPlanningRuleRegistry();
      const states = rules.map((rule) => ({
        ruleId: rule.ruleId,
        allowed: rule.notApplicableAllowed,
        capability: capability(analyzeCapabilities(planning({
          sources: sourcesFor(rule.ruleId),
          proposals: [proposalFor(rule.ruleId)]
        })), "markNotApplicable")
      }));

      expect(rules).toHaveLength(11);
      for (const entry of states) {
        expect(entry.capability).toMatchObject(entry.allowed
          ? { state: "inputRequired", requiredInput: "reason", reasonCodes: ["reasonRequired"] }
          : { state: "unavailable", requiredInput: "none", reasonCodes: ["notApplicableNotAllowed"] });
      }
      expect(states.filter((entry) => entry.capability.state === "inputRequired").map((entry) => entry.ruleId)).toEqual([
        "pp.canvas.components.confirmation",
        "pp.canvas.yamlplanning.confirmation"
      ]);
      expect(states.filter((entry) => entry.capability.state === "unavailable")).toHaveLength(9);

      const sourceText = readFileSync("src/lib/planningClarificationDecisionContract.ts", "utf8");
      expect(sourceText).not.toContain("pp.canvas.components.confirmation");
      expect(sourceText).not.toContain("pp.canvas.yamlplanning.confirmation");
    });

    it("fails closed for unknown rules, mismatches, malformed planning, and non-clarification proposals", () => {
      const cases: Array<[ProjectPlanningState, string]> = [
        [planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { ruleId: "pp.unknown.confirmation" })] }), "unknownPlanningRule"],
        [planning({ proposals: [proposalFor("pp.canvas.schema.confirmation", { ruleVersion: "2.0.0" })] }), "ruleMismatch"],
        [{ ...planning(), schemaVersion: "future" } as unknown as ProjectPlanningState, "invalidPlanning"],
        [planning({ proposals: [{ ...proposalFor(), category: "architectProposal" }] }), "proposalNotClarification"]
      ];

      for (const [state, issueCode] of cases) {
        const result = analyzeCapabilities(state);
        expectAllCapabilitiesUnavailable(result);
        expect(result.issues.map((entry) => entry.code)).toContain(issueCode);
        expect(result.capabilities.every((entry) => entry.reasonCodes.includes(issueCode as never))).toBe(true);
      }
    });

    it("rejects non-capability fields and invalid identity inputs without accepting an action", () => {
      const withReason = analyzePlanningClarificationDecisionCapabilities({
        projectId,
        planning: planning(),
        proposalId,
        reason: "Do not accept pre-input data."
      });
      expectAllCapabilitiesUnavailable(withReason);
      expect(withReason.issues).toEqual([expect.objectContaining({ code: "invalidInput", field: "reason" })]);

      const invalidProject = analyzePlanningClarificationDecisionCapabilities({ projectId: "", planning: planning(), proposalId });
      expectAllCapabilitiesUnavailable(invalidProject);
      expect(invalidProject.issues).toEqual([expect.objectContaining({ code: "invalidProjectId" })]);

      const missingProposal = analyzeCapabilities(planning(), secondProposalId);
      expectAllCapabilitiesUnavailable(missingProposal);
      expect(missingProposal.issues).toEqual([expect.objectContaining({ code: "proposalNotFound" })]);
    });

    it("is pure, leaves caller input unchanged, and returns defensive deterministic results", () => {
      const state = revisedPlanning();
      const input = { projectId, planning: state, proposalId };
      const before = JSON.stringify(input);
      const first = analyzePlanningClarificationDecisionCapabilities(input);

      expect(JSON.stringify(input)).toBe(before);
      if (first.capabilities[0]) {
        (first.capabilities[0].reasonCodes as string[]).push("local-result-mutation");
      }
      const second = analyzePlanningClarificationDecisionCapabilities(input);
      const third = analyzePlanningClarificationDecisionCapabilities(input);

      expect(JSON.stringify(input)).toBe(before);
      expect(second).toEqual(third);
      expect(JSON.stringify(second)).not.toContain("local-result-mutation");
    });
  });
});
