import {
  analyzePlanningControlledApplyCandidate,
  type PlanningControlledApplyCandidateIssueCode
} from "../lib/planningControlledApplyContract";
import {
  PLANNING_CATEGORIES,
  PLANNING_DECISION_ACTIONS,
  PLANNING_DECISION_ORIGINS,
  PLANNING_RESTRICTIONS,
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  PLANNING_SOURCE_AVAILABILITY,
  PLANNING_STATUSES,
  PLANNING_TARGET_KINDS,
  PLANNING_TARGET_OPERATIONS,
  PLANNING_UNCERTAINTY_STATES,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningDependencyRecord,
  type PlanningProposalRecord,
  type PlanningProposalValue,
  type PlanningSourceReference
} from "../lib/planningProposals";
import { getPlanningRuleRegistry } from "../lib/planningRules";

const projectId = "controlled-apply-project";
const sourceId = "11111111-1111-4111-8111-111111111111";
const approvedSourceId = "11111111-1111-4111-8111-111111111112";
const informationalSourceId = "11111111-1111-4111-8111-111111111113";
const proposalId = "22222222-2222-4222-8222-222222222222";
const otherProposalId = "22222222-2222-4222-8222-222222222223";
const decisionId = "33333333-3333-4333-8333-333333333333";
const dependencyId = "44444444-4444-4444-8444-444444444444";
const conflictId = "55555555-5555-4555-8555-555555555555";
const alternativeGroupId = "66666666-6666-4666-8666-666666666666";
const fingerprint = "b".repeat(64);
const timestamp = "2026-08-11T18:30:00.000Z";

function textValue(value = "Confirmed future project-field value."): PlanningProposalValue {
  return { kind: "text", value };
}

function value(kind: PlanningProposalValue["kind"]): PlanningProposalValue {
  if (kind === "text") return textValue();
  if (kind === "boolean") return { kind, value: true };
  if (kind === "enum") return { kind, value: "option-a" };
  if (kind === "stringList") return { kind, value: ["One", "Two"] };
  if (kind === "structuredRecord") return { kind, value: { field: textValue("Nested") } };
  if (kind === "recordCreation") return { kind, value: { name: textValue("Record") } };
  if (kind === "notApplicable") return { kind, reason: "Not applicable." };
  if (kind === "deferred") return { kind, reason: "Deferred." };
  return { kind, question: "What is missing?" };
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

function proposal(overrides: Partial<PlanningProposalRecord> = {}): PlanningProposalRecord {
  return {
    proposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: "future.project-field.app-purpose",
    ruleVersion: "1.0.0",
    fingerprint,
    target: {
      kind: "projectField",
      domain: "foundation",
      targetKey: "appPurpose",
      fieldKey: "appPurpose",
      operation: "setValue"
    },
    category: "architectProposal",
    status: "Confirmed",
    value: textValue(),
    title: "Apply app purpose",
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

function otherProposal(): PlanningProposalRecord {
  return proposal({
    proposalId: otherProposalId,
    status: "Proposed",
    lastDecisionId: undefined,
    target: {
      kind: "projectField",
      domain: "foundation",
      targetKey: "problemStatement",
      fieldKey: "problemStatement",
      operation: "setValue"
    }
  });
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
} = {}) {
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

function analyze(overrides: Parameters<typeof planning>[0] = {}, inputOverrides: Record<string, unknown> = {}) {
  return analyzePlanningControlledApplyCandidate({
    projectId,
    planning: planning(overrides),
    proposalId,
    ...inputOverrides
  });
}

function expectBlockedCode(result: ReturnType<typeof analyzePlanningControlledApplyCandidate>, code: PlanningControlledApplyCandidateIssueCode): void {
  expect(result).toMatchObject({
    outcome: "blocked",
    issues: [expect.objectContaining({ code })]
  });
}

describe("planning controlled apply candidate contract", () => {
  it("returns a defensive candidate plan for the initial explicit project-field setValue text shape", () => {
    const state = planning();
    const before = JSON.stringify(state);
    const result = analyzePlanningControlledApplyCandidate({ projectId, planning: state, proposalId });

    expect(result).toMatchObject({
      outcome: "candidate",
      plan: {
        projectId,
        proposalId,
        decisionId,
        target: {
          kind: "projectField",
          targetKey: "appPurpose",
          fieldKey: "appPurpose",
          operation: "setValue"
        },
        value: textValue(),
        sourceIds: [sourceId],
        writeAuthorized: false,
        readinessEligible: false,
        outputEligible: false
      },
      issues: []
    });
    expect(JSON.stringify(state)).toBe(before);
    if (result.outcome !== "candidate") throw new Error("Expected candidate.");
    result.plan.target.targetKey = "mutated";
    (result.plan.value as { value: string }).value = "mutated";
    (result.plan.sourceIds as string[]).push(approvedSourceId);
    expect(analyzePlanningControlledApplyCandidate({ projectId, planning: state, proposalId })).toMatchObject({
      outcome: "candidate",
      plan: {
        target: { targetKey: "appPurpose" },
        value: textValue(),
        sourceIds: [sourceId]
      }
    });
  });

  it("blocks invalid input, project IDs, proposal IDs, invalid planning, and missing proposals", () => {
    expectBlockedCode(analyzePlanningControlledApplyCandidate(null), "invalidInput");
    expectBlockedCode(analyze({}, { projectId: "bad\nproject" }), "invalidProjectId");
    expectBlockedCode(analyze({}, { proposalId: "not-a-uuid" }), "invalidProposalId");
    expectBlockedCode(
      analyzePlanningControlledApplyCandidate({ projectId, proposalId, planning: { ...planning(), schemaVersion: "future" } }),
      "invalidPlanning"
    );
    expectBlockedCode(analyze({}, { proposalId: otherProposalId }), "proposalNotFound");
  });

  it.each(PLANNING_STATUSES.filter((status) => status !== "Confirmed"))("blocks non-Confirmed status %s", (status) => {
    const nextDecision = status === "Proposed"
      ? []
      : [decision({
          previousStatus: status === "Revised" ? "Needs Clarification" : "Proposed",
          resultingStatus: status,
          action: status === "Revised" ? "revise" : "confirm"
        })];
    const result = analyze({
      proposals: [proposal({ status, lastDecisionId: nextDecision.length > 0 ? decisionId : undefined })],
      decisions: nextDecision
    });
    expect(result.outcome).toBe("blocked");
  });

  it.each(PLANNING_TARGET_KINDS.filter((kind) => kind !== "projectField"))("blocks target kind %s", (kind) => {
    expectBlockedCode(
      analyze({ proposals: [proposal({ target: { kind, domain: "foundation", targetKey: "appPurpose", fieldKey: "appPurpose", operation: "setValue" } })] }),
      "unsupportedTargetKind"
    );
  });

  it("blocks unsupported and omitted operations while setValue remains eligible", () => {
    expect(analyze()).toMatchObject({ outcome: "candidate" });
    for (const operation of PLANNING_TARGET_OPERATIONS.filter((candidate) => candidate !== "setValue")) {
      expectBlockedCode(
        analyze({ proposals: [proposal({ target: { kind: "projectField", domain: "foundation", targetKey: "appPurpose", fieldKey: "appPurpose", operation } })] }),
        "unsupportedTargetOperation"
      );
    }
    expectBlockedCode(
      analyze({ proposals: [proposal({ target: { kind: "projectField", domain: "foundation", targetKey: "appPurpose", fieldKey: "appPurpose" } })] }),
      "unsupportedTargetOperation"
    );
  });

  it("requires explicit self-identifying field targets with no entity ID", () => {
    expectBlockedCode(
      analyze({ proposals: [proposal({ target: { kind: "projectField", domain: "foundation", targetKey: "appPurpose", operation: "setValue" } })] }),
      "missingFieldKey"
    );
    expectBlockedCode(
      analyze({ proposals: [proposal({ target: { kind: "projectField", domain: "foundation", targetKey: "appPurpose", fieldKey: "problemStatement", operation: "setValue" } })] }),
      "targetKeyFieldMismatch"
    );
    expectBlockedCode(
      analyze({ proposals: [proposal({ target: { kind: "projectField", domain: "foundation", targetKey: "appPurpose", fieldKey: "appPurpose", entityId: "entity-1", operation: "setValue" } })] }),
      "targetEntityNotSupported"
    );
  });

  it.each(["boolean", "enum", "stringList", "structuredRecord", "recordCreation", "notApplicable", "deferred", "clarification"] as const)(
    "blocks value kind %s",
    (kind) => {
      expectBlockedCode(analyze({ proposals: [proposal({ value: value(kind) })] }), "unsupportedValueKind");
    }
  );

  it.each(["userFact", "approvedConstraint", "architectProposal"] as const)("allows category %s", (category) => {
    expect(analyze({ proposals: [proposal({ category })] })).toMatchObject({ outcome: "candidate" });
  });

  it.each(PLANNING_CATEGORIES.filter((category) => !["userFact", "approvedConstraint", "architectProposal"].includes(category)))(
    "blocks category %s",
    (category) => {
      expectBlockedCode(analyze({ proposals: [proposal({ category })] }), "unsupportedCategory");
    }
  );

  it.each(PLANNING_RESTRICTIONS.filter((restriction) => restriction !== "concreteProposalAllowed"))(
    "blocks restriction %s",
    (restriction) => {
      expectBlockedCode(analyze({ proposals: [proposal({ restriction })] }), "unsupportedRestriction");
    }
  );

  it.each(PLANNING_UNCERTAINTY_STATES.filter((uncertainty) => uncertainty !== "Known"))("blocks uncertainty %s", (uncertainty) => {
    expectBlockedCode(analyze({ proposals: [proposal({ uncertainty })] }), "uncertaintyNotKnown");
  });

  it("validates explicit human confirmation and fails closed for normalization-invalid decision references", () => {
    expectBlockedCode(analyze({ proposals: [proposal({ lastDecisionId: undefined })], decisions: [] }), "confirmationDecisionMissing");
    expectBlockedCode(analyze({ decisions: [decision({ action: "revise" })] }), "confirmationDecisionInvalid");
    expectBlockedCode(analyze({ decisions: [decision({ origin: "deterministicRule" })] }), "confirmationDecisionInvalid");
    expectBlockedCode(analyze({ decisions: [decision({ ruleSetVersion: "old-rule-set" })] }), "confirmationDecisionInvalid");

    for (const action of PLANNING_DECISION_ACTIONS.filter((candidate) => candidate !== "confirm" && candidate !== "revise")) {
      expectBlockedCode(analyze({ decisions: [decision({ action })] }), "confirmationDecisionInvalid");
    }
    for (const origin of PLANNING_DECISION_ORIGINS.filter((candidate) => candidate !== "userAction")) {
      expectBlockedCode(analyze({ decisions: [decision({ origin })] }), "confirmationDecisionInvalid");
    }
    expectBlockedCode(analyze({ decisions: [] }), "invalidPlanning");
    expectBlockedCode(analyze({ decisions: [decision({ proposalId: otherProposalId })] }), "invalidPlanning");
    expectBlockedCode(analyze({ decisions: [decision({ projectId: "other-project" })] }), "invalidPlanning");
    expectBlockedCode(analyze({ decisions: [decision({ resultingStatus: "Revised", action: "revise" })] }), "invalidPlanning");
  });

  it("requires confirming decision source IDs to exactly match proposal source IDs in order", () => {
    expectBlockedCode(analyze({ decisions: [decision({ sourceIds: undefined })] }), "decisionSourceBindingMismatch");
    expectBlockedCode(analyze({ decisions: [decision({ sourceIds: [sourceId, approvedSourceId] })] }), "decisionSourceBindingMismatch");
    expectBlockedCode(
      analyze({
        sources: [source(), source({ sourceId: approvedSourceId, sourceType: "approvedDocument", authority: "approved" })],
        proposals: [proposal({ sourceIds: [sourceId, approvedSourceId] })],
        decisions: [decision({ sourceIds: [sourceId] })]
      }),
      "decisionSourceBindingMismatch"
    );
    expectBlockedCode(
      analyze({
        sources: [source(), source({ sourceId: approvedSourceId, sourceType: "approvedDocument", authority: "approved" })],
        proposals: [proposal({ sourceIds: [sourceId, approvedSourceId] })],
        decisions: [decision({ sourceIds: [approvedSourceId, sourceId] })]
      }),
      "decisionSourceBindingMismatch"
    );
  });

  it.each(PLANNING_SOURCE_AVAILABILITY.filter((availability) => availability !== "current"))(
    "blocks source availability %s",
    (availability) => {
      expectBlockedCode(analyze({ sources: [source({ availability })] }), "sourceNotCurrent");
    }
  );

  it("requires confirmed or approved evidence authority and does not treat precedence as write authorization", () => {
    expect(analyze({ sources: [source({ authority: "confirmed" })] })).toMatchObject({ outcome: "candidate" });
    expect(analyze({ sources: [source({ sourceType: "approvedDocument", authority: "approved" })] })).toMatchObject({ outcome: "candidate" });
    expectBlockedCode(
      analyze({
        sources: [source({ sourceId: informationalSourceId, sourceType: "userAnswer", authority: "informational" })],
        proposals: [proposal({ sourceIds: [informationalSourceId] })],
        decisions: [decision({ sourceIds: [informationalSourceId] })]
      }),
      "insufficientSourceAuthority"
    );
    const result = analyze();
    expect(result).toMatchObject({ outcome: "candidate", plan: { writeAuthorized: false } });
  });

  it("blocks alternatives, involved open conflicts, and dependencies without mutating planning", () => {
    expectBlockedCode(analyze({ proposals: [proposal({ alternativeGroupId })] }), "alternativeGroupNotSupported");
    expectBlockedCode(analyze({ conflicts: [conflict()] }), "openConflict");
    expect(analyze({
      proposals: [proposal(), otherProposal()],
      conflicts: [conflict({ involvedReferences: [{ kind: "proposalId", proposalId: otherProposalId }] })]
    })).toMatchObject({ outcome: "candidate" });
    expect(analyze({ conflicts: [conflict({ status: "resolved", resolvedAt: timestamp })] })).toMatchObject({ outcome: "candidate" });
    expectBlockedCode(analyze({ proposals: [proposal(), otherProposal()], dependencies: [dependency()] }), "dependencyNotSupported");
    expectBlockedCode(
      analyze({
        proposals: [proposal(), otherProposal()],
        dependencies: [dependency({ sourceProposalId: otherProposalId, target: { kind: "proposalId", proposalId } })]
      }),
      "dependencyNotSupported"
    );
  });

  it("blocks all current clarification rules through the non-writable target boundary", () => {
    const rules = getPlanningRuleRegistry();
    expect(rules).toHaveLength(11);
    for (const rule of rules) {
      expectBlockedCode(
        analyze({
          proposals: [
            proposal({
              ruleId: rule.ruleId,
              ruleVersion: rule.ruleVersion,
              target: { ...rule.target },
              category: rule.category,
              restriction: rule.restriction,
              uncertainty: rule.uncertainty,
              value: { kind: "clarification", question: rule.question }
            })
          ]
        }),
        "unsupportedTargetKind"
      );
    }
  });

  it("keeps TTI-style Draft blockers outside candidate eligibility and avoids Power Fx or YAML output semantics", () => {
    const ttiRules = getPlanningRuleRegistry().map((rule) =>
      analyze({
        proposals: [
          proposal({
            ruleId: rule.ruleId,
            ruleVersion: rule.ruleVersion,
            target: { ...rule.target },
            category: rule.category,
            restriction: rule.restriction,
            uncertainty: rule.uncertainty,
            value: { kind: "clarification", question: `TTI ${rule.target.targetKey} remains unresolved.` }
          })
        ]
      })
    );

    expect(ttiRules.every((result) => result.outcome === "blocked")).toBe(true);
    expect(JSON.stringify(ttiRules)).not.toMatch(/Ready for Codex|generatedDocuments|Power Fx|YAML output|schema confirmed/i);
  });

  it("is isolated from repository, destination, readiness, output, runtime, network, and deployment concerns", () => {
    const sourceText = analyzePlanningControlledApplyCandidate.toString();
    expect(sourceText).not.toMatch(/projectRepository|projectFields|powerPlatform|applyProjectFieldChanges|updateProjectFields|updateProjectPowerPlatform/);
    expect(sourceText).not.toMatch(/ProjectRecord|StorageAdapter|localStorage|browserStorage|generatedDocuments|packageGeneratedAt|reviewStatus|readinessConfirmations/);
    expect(sourceText).not.toMatch(/generateProjectPackage|exportProjectPackage|PowerFx|Power Fx|YAML generation|fetch\(|XMLHttpRequest|openai|wrangler|cloudflare/i);
    expect(sourceText).not.toMatch(/\bDate\b|Date\.now|randomUUID|crypto|Math\.random/);
  });
});
