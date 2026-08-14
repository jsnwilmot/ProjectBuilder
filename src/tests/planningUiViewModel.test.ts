import { createProject } from "../lib/createProject";
import {
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
  type PlanningProposalStatus,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById, getPlanningRuleRegistry } from "../lib/planningRules";
import { buildPlanningUiViewModel } from "../lib/planningUiViewModel";
import type { ProjectRecord } from "../types/project";

const projectId = "planning-ui-project";
const timestamp = "2026-08-14T12:00:00.000Z";
const sourceId = uuid(1);
const proposalId = uuid(101);
const decisionId = uuid(201);
const applyId = uuid(301);

function uuid(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function source(overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return {
    sourceId,
    sourceType: "confirmedIntake",
    locator: "intake.appPurpose",
    label: "Confirmed project purpose",
    authority: "confirmed",
    availability: "current",
    excerpt: "Persisted evidence excerpt.",
    version: "1.0",
    observedAt: timestamp,
    ...overrides
  };
}

function proposal(
  status: PlanningProposalStatus = "Proposed",
  index = 1,
  overrides: Partial<PlanningProposalRecord> = {}
): PlanningProposalRecord {
  const id = overrides.proposalId ?? uuid(100 + index);
  return {
    proposalId: id,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: `future.architecture.${index}`,
    ruleVersion: "1.0.0",
    fingerprint: String(index).padStart(64, "a").slice(-64),
    target: {
      kind: "futureArchitectureRecord",
      domain: "foundation",
      targetKey: `futureTarget${index}`
    },
    category: "architectProposal",
    status,
    value: { kind: "text", value: `Proposed value ${index}` },
    title: `Planning item ${index}`,
    recommendation: `Persisted recommendation ${index}.`,
    rationale: `Persisted rationale ${index}.`,
    consequence: `Persisted consequence ${index}.`,
    sourceIds: [sourceId],
    uncertainty: "Known",
    restriction: "optionsOnly",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(status === "Stale" ? { staleReason: "sourceChanged", staleAt: timestamp } : {}),
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

function planning(overrides: Partial<ProjectPlanningState> = {}): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: [source()],
    proposals: [],
    decisions: [],
    dependencies: [],
    conflicts: [],
    ...overrides
  };
}

function project(planningState?: ProjectPlanningState): ProjectRecord {
  return {
    ...createProject({
      identity: { id: projectId, projectName: "Planning UI Project" },
      intake: { appPurpose: "" },
      now: timestamp
    }),
    ...(planningState ? { planning: planningState } : {})
  };
}

function writableProposal(overrides: Partial<PlanningProposalRecord> = {}): PlanningProposalRecord {
  return proposal("Confirmed", 1, {
    proposalId,
    ruleId: "future.project-field.app-purpose",
    target: {
      kind: "projectField",
      domain: "foundation",
      targetKey: "appPurpose",
      fieldKey: "appPurpose",
      operation: "setValue"
    },
    category: "architectProposal",
    value: { kind: "text", value: "Approved project purpose" },
    title: "Apply approved project purpose",
    uncertainty: "Known",
    restriction: "concreteProposalAllowed",
    lastDecisionId: decisionId,
    ...overrides
  });
}

function clarificationProposal(
  ruleId = "pp.canvas.schema.confirmation",
  status: PlanningProposalStatus = "Needs Clarification",
  index = 1
): PlanningProposalRecord {
  const rule = getPlanningRuleById(ruleId);
  if (!rule) throw new Error(`Missing rule ${ruleId}`);
  return proposal(status, index, {
    ruleId,
    ruleVersion: rule.ruleVersion,
    target: { ...rule.target },
    category: "clarification",
    value: { kind: "clarification", question: rule.question },
    title: rule.title,
    recommendation: "Ask for authoritative clarification.",
    rationale: rule.rationale,
    consequence: rule.consequence,
    uncertainty: rule.uncertainty,
    restriction: rule.restriction,
    applicableProjectTypes: ["powerAppsCanvas"],
    applicableDomains: [rule.target.domain]
  });
}

describe("buildPlanningUiViewModel", () => {
  it("returns a deliberate empty state without fabricating Recommendations", () => {
    const model = buildPlanningUiViewModel(project());

    expect(model).toMatchObject({
      state: "empty",
      emptyMessage: "No planning items are available for this project yet.",
      groups: [],
      proposalCount: 0
    });
  });

  it("fails closed for malformed planning without mutating or repairing it", () => {
    const input = project();
    input.planning = { schemaVersion: "wrong" } as unknown as ProjectPlanningState;
    const before = JSON.stringify(input);

    const model = buildPlanningUiViewModel(input);

    expect(model.state).toBe("invalid");
    expect(model.issues).toEqual([
      expect.objectContaining({ code: "invalidPlanning", message: expect.stringContaining("could not be validated") })
    ]);
    expect(JSON.stringify(input)).toBe(before);
  });

  it.each([
    ["Proposed", "recommendations", "Recommendation"],
    ["Needs Clarification", "questions", "Answer required"],
    ["Revised", "questions", "Answer provided - confirm required"],
    ["Confirmed", "confirmed", "Confirmed decision"],
    ["Deferred", "deferred", "Deferred"],
    ["Not Applicable", "deferred", "Not applicable"],
    ["Blocked", "attention", "Blocked"],
    ["Stale", "attention", "Refresh required"],
    ["Rejected", "attention", "Rejected"],
    ["Superseded", "attention", "Superseded"]
  ] as const)("maps %s to the exact lifecycle group and status label", (status, groupId, label) => {
    const model = buildPlanningUiViewModel(project(planning({ proposals: [proposal(status)] })));

    expect(model.groups).toHaveLength(1);
    expect(model.groups[0].id).toBe(groupId);
    expect(model.groups[0].proposals[0].statusLabel).toBe(label);
  });

  it("omits every empty lifecycle group", () => {
    const model = buildPlanningUiViewModel(project(planning({
      proposals: [proposal("Revised")]
    })));

    expect(model.groups.map((group) => group.label)).toEqual(["Questions to answer"]);
    expect(model.groups.some((group) => group.label === "Recommendations")).toBe(false);
  });

  it("orders contiguous registered proposals by registry priority", () => {
    const later = clarificationProposal("pp.testing.outcomes.confirmation", "Needs Clarification", 2);
    const earlier = clarificationProposal("pp.canvas.schema.confirmation", "Needs Clarification", 1);
    const model = buildPlanningUiViewModel(project(planning({ proposals: [later, earlier] })));

    expect(model.groups[0].proposals.map((entry) => entry.title)).toEqual([
      "Confirm the backend schema",
      "Confirm observable testing outcomes"
    ]);
  });

  it("preserves unknown proposal order and uses unknown proposals as registered-run anchors", () => {
    const registeredLate = clarificationProposal("pp.testing.outcomes.confirmation", "Needs Clarification", 2);
    const unknown = proposal("Needs Clarification", 3, { title: "Unknown anchor" });
    const registeredEarly = clarificationProposal("pp.canvas.schema.confirmation", "Needs Clarification", 1);
    const unknownSecond = proposal("Needs Clarification", 4, { title: "Unknown second" });
    const model = buildPlanningUiViewModel(project(planning({
      proposals: [registeredLate, unknown, registeredEarly, unknownSecond]
    })));

    expect(model.groups[0].proposals.map((entry) => entry.title)).toEqual([
      registeredLate.title,
      "Unknown anchor",
      registeredEarly.title,
      "Unknown second"
    ]);
  });

  it.each(["Known", "Likely", "Uncertain", "Unknown"] as const)("preserves the %s uncertainty state", (uncertainty) => {
    const model = buildPlanningUiViewModel(project(planning({
      proposals: [proposal("Proposed", 1, { uncertainty })]
    })));

    expect(model.groups[0].proposals[0].uncertainty).toBe(uncertainty);
  });

  it("preserves recommendation, rationale, consequence, and target presentation", () => {
    const item = clarificationProposal();
    const model = buildPlanningUiViewModel(project(planning({ proposals: [item] })));
    const presented = model.groups[0].proposals[0];

    expect(presented).toMatchObject({
      recommendation: item.recommendation,
      rationale: item.rationale,
      consequence: item.consequence,
      targetArea: "Data - Schema"
    });
  });

  it("presents safe source fields and optional details without source IDs or locators", () => {
    const model = buildPlanningUiViewModel(project(planning({ proposals: [proposal()] })));
    const presented = model.groups[0].proposals[0].sources[0];
    const serialized = JSON.stringify(presented);

    expect(presented).toEqual({
      resolved: true,
      label: "Confirmed project purpose",
      sourceType: "Confirmed intake",
      authority: "Confirmed",
      availability: "Current",
      excerpt: "Persisted evidence excerpt.",
      version: "1.0",
      observedAt: timestamp
    });
    expect(serialized).not.toContain(sourceId);
    expect(serialized).not.toContain("intake.appPurpose");
  });

  it("shows unavailable evidence safely when a persisted source is marked missing", () => {
    const model = buildPlanningUiViewModel(project(planning({
      sources: [source({ availability: "missing" })],
      proposals: [proposal()]
    })));

    expect(model.state).toBe("ready");
    expect(model.groups[0].proposals[0].sources[0]).toEqual({
      resolved: false,
      label: "Confirmed project purpose",
      sourceType: "Confirmed intake",
      authority: "Confirmed",
      availability: "Missing"
    });
  });

  it("presents dependencies and conflicts without their raw IDs", () => {
    const dependent = proposal("Proposed", 1, { proposalId });
    const required = proposal("Proposed", 2, { proposalId: uuid(102), title: "Required architecture" });
    const dependency: PlanningDependencyRecord = {
      dependencyId: uuid(401),
      sourceProposalId: proposalId,
      dependencyType: "requiresProposal",
      target: { kind: "proposalId", proposalId: required.proposalId },
      required: true,
      rationale: "The required architecture must be reviewed first."
    };
    const conflict: PlanningConflictRecord = {
      conflictId: uuid(501),
      projectId,
      conflictType: "proposalVsIntake",
      severity: "blocking",
      status: "open",
      involvedReferences: [
        { kind: "proposalId", proposalId },
        { kind: "proposalId", proposalId: required.proposalId }
      ],
      explanation: "The proposal conflicts with confirmed intake.",
      blocking: true,
      createdAt: timestamp
    };
    const model = buildPlanningUiViewModel(project(planning({
      proposals: [dependent, required],
      dependencies: [dependency],
      conflicts: [conflict]
    })));
    const presented = model.groups[0].proposals.find((entry) => entry.key === proposalId)!;
    const serialized = JSON.stringify({ dependencies: presented.dependencies, conflicts: presented.conflicts });

    expect(presented.dependencies).toEqual([{
      dependencyType: "Requires proposal",
      rationale: dependency.rationale,
      required: true,
      targetLabel: "Required architecture"
    }]);
    expect(presented.conflicts).toEqual([{
      severity: "Blocking",
      status: "Open",
      explanation: conflict.explanation,
      affectedProposalTitles: ["Planning item 1", "Required architecture"]
    }]);
    expect(serialized).not.toContain(dependency.dependencyId);
    expect(serialized).not.toContain(conflict.conflictId);
  });

  it("keeps every current rule read-only and planning-only when Confirmed", () => {
    const rules = getPlanningRuleRegistry();
    const proposals = rules.map((rule, index) => clarificationProposal(rule.ruleId, "Confirmed", index + 1));
    const model = buildPlanningUiViewModel(project(planning({ proposals })));
    const presented = model.groups.flatMap((group) => group.proposals);

    expect(rules).toHaveLength(11);
    expect(presented).toHaveLength(11);
    expect(presented.every((item) => item.applyState?.state === "planningOnly")).toBe(true);
    expect(presented.every((item) => item.applyState?.label === "Planning decision only - no project field change available")).toBe(true);
  });

  it("preserves the registry Not Applicable facts without adding controls", () => {
    const rules = getPlanningRuleRegistry();
    expect(rules.filter((rule) => rule.notApplicableAllowed).map((rule) => rule.target.targetKey)).toEqual([
      "componentTargets",
      "yaml"
    ]);
    expect(rules.filter((rule) => !rule.notApplicableAllowed).map((rule) => rule.target.targetKey)).toEqual([
      "schema",
      "internalNames",
      "screenTargets",
      "controlTargets",
      "delegation",
      "security",
      "testing",
      "alm",
      "releaseApproval"
    ]);
  });

  it("uses controlled transaction preparation for a future writable Ready to apply state", () => {
    const model = buildPlanningUiViewModel(project(planning({
      proposals: [writableProposal()],
      decisions: [decision()]
    })));

    expect(model.groups[0].proposals[0].applyState).toEqual({
      state: "ready",
      label: "Ready to apply",
      fieldLabel: "App purpose",
      currentValue: "",
      proposedValue: "Approved project purpose",
      historyOutcome: "changed"
    });
  });

  it("presents alreadyApplied without exposing existingApplyId", () => {
    const history: PlanningControlledApplyHistoryRecord = {
      applyId,
      applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
      projectId,
      proposalId,
      decisionId,
      fieldKey: "appPurpose",
      previousValue: "",
      appliedValue: "Approved project purpose",
      sourceIds: [sourceId],
      appliedAt: timestamp,
      outcome: "changed"
    };
    const input = project(planning({ proposals: [writableProposal()], decisions: [decision()] }));
    input.intake.appPurpose = "Approved project purpose";
    input.controlledApplyHistory = [history];

    const model = buildPlanningUiViewModel(input);
    const applyState = model.groups[0].proposals[0].applyState;

    expect(applyState).toEqual({ state: "alreadyApplied", label: "Already applied" });
    expect(JSON.stringify(applyState)).not.toContain(applyId);
  });

  it("humanizes a blocked future writable state without exposing issue codes", () => {
    const input = project(planning({ proposals: [writableProposal()], decisions: [decision()] }));
    input.intake.appPurpose = "Existing meaningful purpose";

    const model = buildPlanningUiViewModel(input);
    const applyState = model.groups[0].proposals[0].applyState;

    expect(applyState).toMatchObject({
      state: "blocked",
      label: "Not currently available to apply",
      details: [expect.stringContaining("transaction preparation")]
    });
    expect(JSON.stringify(applyState)).not.toMatch(/destinationConflict|candidateBlocked/);
  });

  it("does not run Apply preparation for a non-Confirmed proposal", () => {
    const model = buildPlanningUiViewModel(project(planning({
      proposals: [writableProposal({ status: "Proposed", lastDecisionId: undefined })],
      decisions: []
    })));

    expect(model.groups[0].proposals[0].applyState).toBeUndefined();
  });

  it("reads valid controlled Apply history with disclosure values and no actor identity", () => {
    const history: PlanningControlledApplyHistoryRecord = {
      applyId,
      applySchemaVersion: CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION,
      projectId,
      proposalId,
      decisionId,
      fieldKey: "appPurpose",
      previousValue: "Prior purpose",
      appliedValue: "Approved project purpose",
      sourceIds: [sourceId],
      appliedAt: timestamp,
      outcome: "changed"
    };
    const input = project(planning({ proposals: [writableProposal()], decisions: [decision()] }));
    input.intake.appPurpose = "Approved project purpose";
    input.controlledApplyHistory = [history];

    const model = buildPlanningUiViewModel(input);
    const presented = model.history[0];

    expect(presented).toEqual({
      key: applyId,
      appliedAt: timestamp,
      fieldLabel: "App purpose",
      outcome: "Changed",
      proposalTitle: "Apply approved project purpose",
      previousValue: "Prior purpose",
      appliedValue: "Approved project purpose"
    });
    expect(JSON.stringify(presented)).not.toMatch(/actor|username|email/i);
  });

  it("does not mutate nested planning, source, dependency, conflict, or history input", () => {
    const input = project(planning({
      proposals: [clarificationProposal()],
      sources: [source()],
      dependencies: [],
      conflicts: []
    }));
    const before = JSON.stringify(input);

    buildPlanningUiViewModel(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});
