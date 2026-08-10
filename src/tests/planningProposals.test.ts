import {
  PLANNING_CATEGORIES,
  PLANNING_CONFLICT_SEVERITIES,
  PLANNING_CONFLICT_STATUSES,
  PLANNING_CONFLICT_TYPES,
  PLANNING_DECISION_ACTIONS,
  PLANNING_DECISION_ORIGINS,
  PLANNING_DEPENDENCY_TYPES,
  PLANNING_RESTRICTIONS,
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  PLANNING_SOURCE_AVAILABILITY,
  PLANNING_SOURCE_AUTHORITIES,
  PLANNING_SOURCE_TYPES,
  PLANNING_STALE_REASONS,
  PLANNING_STATUSES,
  PLANNING_TARGET_DOMAINS,
  PLANNING_TARGET_KINDS,
  PLANNING_TARGET_OPERATIONS,
  PLANNING_UNCERTAINTY_STATES,
  createEmptyProjectPlanningState,
  getPlanningSourcePrecedence,
  isPlanningStatusOutputEligible,
  isPlanningStatusReadinessEligible,
  isValidPlanningTransition,
  normalizeProjectPlanningState,
  type PlanningConflictRecord,
  type PlanningDependencyRecord,
  type PlanningProposalRecord,
  type PlanningProposalStatus,
  type PlanningProposalValue,
  type PlanningSourceReference
} from "../lib/planningProposals";

const projectId = "legacy-project-id";
const sourceId = "11111111-1111-4111-8111-111111111111";
const proposalId = "22222222-2222-4222-8222-222222222222";
const proposalIdTwo = "33333333-3333-4333-8333-333333333333";
const decisionId = "44444444-4444-4444-8444-444444444444";
const dependencyId = "55555555-5555-4555-8555-555555555555";
const conflictId = "66666666-6666-4666-8666-666666666666";
const fingerprint = "a".repeat(64);
const timestamp = "2026-08-01T10:30:00-06:00";
const timestampUtc = "2026-08-01T16:30:00.000Z";

function source(overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  const sourceType = overrides.sourceType ?? "confirmedIntake";
  return {
    sourceId,
    sourceType,
    locator: "foundation.appPurpose",
    label: "App purpose",
    authority: authorityFor(sourceType),
    availability: "current",
    ...overrides
  };
}

function authorityFor(sourceType: PlanningSourceReference["sourceType"]): PlanningSourceReference["authority"] {
  if (sourceType === "userAnswer" || sourceType === "confirmedIntake") {
    return "confirmed";
  }
  if (
    sourceType === "approvedDocument" ||
    sourceType === "platformRule" ||
    sourceType === "projectRule" ||
    sourceType === "projectTypePreset" ||
    sourceType === "readinessPrerequisite"
  ) {
    return "approved";
  }
  return "informational";
}

function value(kind: PlanningProposalValue["kind"] = "text"): PlanningProposalValue {
  if (kind === "boolean") return { kind, value: true };
  if (kind === "enum") return { kind, value: "option-a" };
  if (kind === "stringList") return { kind, value: ["One", "Two"] };
  if (kind === "structuredRecord") return { kind, value: { field: { kind: "text", value: "Value" } } };
  if (kind === "recordCreation") return { kind, value: { name: { kind: "text", value: "Record" } } };
  if (kind === "notApplicable") return { kind, reason: "Not applicable for this project." };
  if (kind === "deferred") return { kind, reason: "Deferred until Architect review." };
  if (kind === "clarification") return { kind, question: "Which option should be used?" };
  return { kind, value: "Use the confirmed intake value." };
}

function proposal(overrides: Partial<PlanningProposalRecord> = {}): PlanningProposalRecord {
  return {
    proposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: "foundation-purpose-rule",
    ruleVersion: "phase-5c.1.1",
    fingerprint,
    target: {
      kind: "projectField",
      domain: "foundation",
      targetKey: "appPurpose",
      operation: "setValue"
    },
    category: "architectProposal",
    status: "Proposed",
    value: value(),
    title: "Confirm app purpose",
    recommendation: "Use the confirmed intake purpose.",
    rationale: "The intake answer is the highest available confirmed source.",
    sourceIds: [sourceId],
    uncertainty: "Known",
    restriction: "concreteProposalAllowed",
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides
  };
}

function decision(overrides: Partial<import("../lib/planningProposals").PlanningDecisionRecord> = {}) {
  return {
    decisionId,
    proposalId,
    projectId,
    action: "confirm",
    previousStatus: "Proposed",
    resultingStatus: "Confirmed",
    origin: "userAction",
    recordedAt: timestamp,
    ...overrides
  };
}

function dependency(overrides: Partial<PlanningDependencyRecord> = {}): PlanningDependencyRecord {
  return {
    dependencyId,
    sourceProposalId: proposalId,
    dependencyType: "requiresProposal",
    target: { kind: "proposalId", proposalId: proposalIdTwo },
    required: true,
    rationale: "The dependent proposal must be resolved first.",
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
    explanation: "The proposal conflicts with confirmed intake.",
    blocking: true,
    createdAt: timestamp,
    ...overrides
  };
}

function planning(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: [source()],
    proposals: [proposal()],
    decisions: [],
    dependencies: [],
    conflicts: [],
    ...overrides
  };
}

describe("planning proposal normalization", () => {
  it("creates an empty optional planning state without readiness or output data", () => {
    expect(createEmptyProjectPlanningState()).toEqual({
      schemaVersion: PLANNING_SCHEMA_VERSION,
      ruleSetId: PLANNING_RULE_SET_ID,
      ruleSetVersion: PLANNING_RULE_SET_VERSION,
      sources: [],
      proposals: [],
      decisions: [],
      dependencies: [],
      conflicts: []
    });
  });

  it("returns empty state issues for unsupported schema, non-object input, and sparse collections", () => {
    expect(normalizeProjectPlanningState(null, projectId).issues.map((issue) => issue.code)).toContain("nonObjectInput");
    expect(
      normalizeProjectPlanningState({ ...planning(), schemaVersion: "future" }, projectId).issues.map((issue) => issue.code)
    ).toContain("unsupportedSchema");

    const sparseSources = [source()];
    sparseSources.length = 2;
    const result = normalizeProjectPlanningState(planning({ sources: sparseSources }), projectId);
    expect(result.planning.sources).toEqual([]);
    expect(result.issues.map((issue) => issue.code)).toContain("sparseCollection");
  });

  it("does not mutate input while normalizing timestamps and IDs", () => {
    const input = planning({
      sources: [source({ sourceId: sourceId.toUpperCase(), observedAt: timestamp })],
      proposals: [proposal({ proposalId: proposalId.toUpperCase(), fingerprint: fingerprint.toUpperCase() })]
    });
    const before = JSON.stringify(input);
    const result = normalizeProjectPlanningState(input, projectId);

    expect(JSON.stringify(input)).toBe(before);
    expect(result.planning.sources[0].sourceId).toBe(sourceId);
    expect(result.planning.sources[0].observedAt).toBe(timestampUtc);
    expect(result.planning.proposals[0].proposalId).toBe(proposalId);
    expect(result.planning.proposals[0].fingerprint).toBe(fingerprint);
  });

  it("accepts every approved category, status, uncertainty, restriction, source type, and source availability", () => {
    const sources = PLANNING_SOURCE_TYPES.map((sourceType, index) =>
      source({
        sourceId: `11111111-1111-4111-8111-1111111111${String(index).padStart(2, "0")}`,
        sourceType,
        availability: PLANNING_SOURCE_AVAILABILITY[index % PLANNING_SOURCE_AVAILABILITY.length]
      })
    );
    const records = PLANNING_CATEGORIES.map((category, index) =>
      proposal({
        proposalId: `22222222-2222-4222-8222-2222222222${String(index).padStart(2, "0")}`,
        sourceIds: [sources[index].sourceId],
        category,
        status: PLANNING_STATUSES[index % PLANNING_STATUSES.length],
        uncertainty: PLANNING_UNCERTAINTY_STATES[index % PLANNING_UNCERTAINTY_STATES.length],
        restriction: PLANNING_RESTRICTIONS[index % PLANNING_RESTRICTIONS.length],
        staleReason: PLANNING_STATUSES[index % PLANNING_STATUSES.length] === "Stale" ? "sourceChanged" : undefined,
        staleAt: PLANNING_STATUSES[index % PLANNING_STATUSES.length] === "Stale" ? timestamp : undefined
      })
    );
    const result = normalizeProjectPlanningState(planning({ sources, proposals: records }), projectId);

    expect(result.planning.sources.map((record) => record.sourceType)).toEqual(PLANNING_SOURCE_TYPES);
    expect(result.planning.proposals.map((record) => record.category)).toEqual(PLANNING_CATEGORIES);
    expect(result.planning.proposals).toHaveLength(PLANNING_CATEGORIES.length);
  });

  it("accepts every target kind, target operation, and proposal value kind", () => {
    const valueKinds: PlanningProposalValue["kind"][] = [
      "text",
      "boolean",
      "enum",
      "stringList",
      "structuredRecord",
      "recordCreation",
      "notApplicable",
      "deferred",
      "clarification"
    ];
    const proposals = PLANNING_TARGET_KINDS.map((kind, index) =>
      proposal({
        proposalId: `22222222-2222-4222-8222-3333333333${String(index).padStart(2, "0")}`,
        target: {
          kind,
          domain: PLANNING_TARGET_DOMAINS[index % PLANNING_TARGET_DOMAINS.length],
          targetKey: `target-${index}`,
          operation: PLANNING_TARGET_OPERATIONS[index % PLANNING_TARGET_OPERATIONS.length]
        },
        value: value(valueKinds[index % valueKinds.length])
      })
    );
    const result = normalizeProjectPlanningState(planning({ proposals }), projectId);

    expect(result.planning.proposals.map((record) => record.target.kind)).toEqual(PLANNING_TARGET_KINDS);
    expect(new Set(result.planning.proposals.map((record) => record.target.operation))).toEqual(
      new Set(PLANNING_TARGET_OPERATIONS)
    );
  });

  it("derives active source precedence from source type, authority, and current availability", () => {
    expect(getPlanningSourcePrecedence(source({ sourceType: "userAnswer", authority: "confirmed" }))).toBe(1);
    expect(getPlanningSourcePrecedence(source({ sourceType: "approvedDocument", authority: "approved" }))).toBe(2);
    expect(getPlanningSourcePrecedence(source({ sourceType: "confirmedIntake", authority: "confirmed" }))).toBe(3);
    expect(getPlanningSourcePrecedence(source({ sourceType: "platformRule", authority: "approved" }))).toBe(4);
    expect(getPlanningSourcePrecedence(source({ sourceType: "projectRule", authority: "approved" }))).toBe(4);
    expect(getPlanningSourcePrecedence(source({ sourceType: "readinessPrerequisite", authority: "approved" }))).toBe(4);
    expect(getPlanningSourcePrecedence(source({ sourceType: "projectTypePreset", authority: "approved" }))).toBe(5);
    expect(getPlanningSourcePrecedence(source({ sourceType: "userAnswer", authority: "informational" }))).toBe(6);
    expect(getPlanningSourcePrecedence(source({ sourceType: "derivedDependency", authority: "informational" }))).toBe(7);
    expect(getPlanningSourcePrecedence(source({ sourceType: "generalRecommendation", authority: "informational" }))).toBe(8);
  });

  it("keeps informational user answers below approved and confirmed sources", () => {
    const informationalUserAnswer = source({ sourceType: "userAnswer", authority: "informational" });
    const approvedDocument = source({ sourceType: "approvedDocument", authority: "approved" });
    const confirmedIntake = source({ sourceType: "confirmedIntake", authority: "confirmed" });

    expect(getPlanningSourcePrecedence(informationalUserAnswer)).toBe(6);
    expect(getPlanningSourcePrecedence(informationalUserAnswer)).toBeGreaterThan(getPlanningSourcePrecedence(approvedDocument)!);
    expect(getPlanningSourcePrecedence(informationalUserAnswer)).toBeGreaterThan(getPlanningSourcePrecedence(confirmedIntake)!);
  });

  it("does not automatically treat a current user answer as confirmed", () => {
    const result = normalizeProjectPlanningState(
      planning({ sources: [source({ sourceType: "userAnswer", authority: "informational" })] }),
      projectId
    );

    expect(result.planning.sources[0]).toMatchObject({
      sourceType: "userAnswer",
      authority: "informational",
      availability: "current"
    });
    expect(getPlanningSourcePrecedence(result.planning.sources[0])).toBe(6);
  });

  it("returns null precedence for every non-current source availability", () => {
    for (const availability of ["stale", "missing", "deleted", "unverified"] as const) {
      expect(getPlanningSourcePrecedence(source({ sourceType: "userAnswer", authority: "confirmed", availability }))).toBeNull();
    }
  });

  it("rejects invalid source authority combinations and missing or unknown authority", () => {
    const invalidSources = [
      source({ sourceType: "userAnswer", authority: "approved" as never }),
      source({ sourceType: "confirmedIntake", authority: "informational" }),
      source({ sourceType: "approvedDocument", authority: "confirmed" }),
      source({ sourceType: "platformRule", authority: "informational" }),
      source({ sourceType: "projectRule", authority: "confirmed" }),
      source({ sourceType: "projectTypePreset", authority: "confirmed" }),
      source({ sourceType: "readinessPrerequisite", authority: "informational" }),
      source({ sourceType: "derivedDependency", authority: "approved" }),
      source({ sourceType: "generalRecommendation", authority: "confirmed" }),
      { ...source(), authority: undefined },
      { ...source(), authority: "trusted" }
    ];

    for (const invalidSource of invalidSources) {
      const result = normalizeProjectPlanningState(planning({ sources: [invalidSource] }), projectId);
      expect(result.planning.sources).toEqual([]);
      expect(result.issues.map((issue) => issue.code)).toContain("invalidRecord");
    }
  });

  it("removes proposals referencing sources rejected for invalid authority without echoing raw excerpts", () => {
    const result = normalizeProjectPlanningState(
      planning({
        sources: [
          source({
            authority: "approved" as never,
            excerpt: "protected SharePoint internal-name source excerpt"
          })
        ],
        proposals: [proposal()]
      }),
      projectId
    );

    expect(result.planning.sources).toEqual([]);
    expect(result.planning.proposals).toEqual([]);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["invalidRecord", "invalidCrossReference"]));
    expect(JSON.stringify(result.issues)).not.toContain("protected SharePoint");
  });

  it("preserves source authority as provenance without identity, authentication, readiness, or output meaning", () => {
    const result = normalizeProjectPlanningState(
      planning({
        sources: PLANNING_SOURCE_AUTHORITIES.map((authority, index) =>
          source({
            sourceId: `11111111-1111-4111-8111-2222222222${String(index).padStart(2, "0")}`,
            sourceType: authority === "approved" ? "approvedDocument" : "userAnswer",
            authority
          })
        )
      }),
      projectId
    );

    expect(result.planning.sources.map((record) => record.authority)).toEqual(PLANNING_SOURCE_AUTHORITIES);
    for (const record of result.planning.sources) {
      expect(Object.keys(record)).not.toEqual(expect.arrayContaining(["actor", "identity", "authentication", "role"]));
    }
    expect(isPlanningStatusReadinessEligible("Confirmed")).toBe(false);
    expect(isPlanningStatusOutputEligible("Confirmed")).toBe(false);
  });

  it("validates UUIDs, fingerprints, strict timestamps, and foreign project bindings", () => {
    const invalidTimestamp = normalizeProjectPlanningState(
      planning({ proposals: [proposal({ createdAt: "2026-02-30T10:00:00Z" })] }),
      projectId
    );
    expect(invalidTimestamp.planning.proposals).toHaveLength(0);

    const invalidOffset = normalizeProjectPlanningState(
      planning({ proposals: [proposal({ updatedAt: "2026-08-01T10:00:00+24:00" })] }),
      projectId
    );
    expect(invalidOffset.planning.proposals).toHaveLength(0);

    const invalidUuid = normalizeProjectPlanningState(planning({ proposals: [proposal({ proposalId: "not-a-uuid" })] }), projectId);
    expect(invalidUuid.planning.proposals).toHaveLength(0);

    const invalidFingerprint = normalizeProjectPlanningState(
      planning({ proposals: [proposal({ fingerprint: "abc" })] }),
      projectId
    );
    expect(invalidFingerprint.planning.proposals).toHaveLength(0);

    const foreignProject = normalizeProjectPlanningState(
      planning({ proposals: [proposal({ projectId: "other-project" })] }),
      projectId
    );
    expect(foreignProject.planning.proposals).toHaveLength(0);
  });

  it("implements all approved valid and invalid state transitions", () => {
    const valid: Record<PlanningProposalStatus, PlanningProposalStatus[]> = {
      Proposed: [
        "Confirmed",
        "Revised",
        "Rejected",
        "Deferred",
        "Not Applicable",
        "Stale",
        "Superseded",
        "Blocked",
        "Needs Clarification"
      ],
      Confirmed: ["Revised", "Stale", "Superseded"],
      Revised: ["Confirmed", "Rejected", "Deferred", "Stale", "Superseded", "Blocked", "Needs Clarification"],
      Rejected: [],
      Deferred: ["Proposed", "Revised", "Rejected", "Stale", "Superseded", "Needs Clarification"],
      "Not Applicable": ["Stale", "Superseded"],
      Stale: ["Proposed", "Revised", "Confirmed", "Rejected", "Deferred", "Superseded", "Blocked", "Needs Clarification"],
      Superseded: [],
      Blocked: ["Proposed", "Revised", "Rejected", "Deferred", "Stale", "Superseded", "Needs Clarification"],
      "Needs Clarification": ["Proposed", "Revised", "Rejected", "Deferred", "Stale", "Blocked", "Superseded"]
    };

    for (const from of PLANNING_STATUSES) {
      expect(isValidPlanningTransition(from, from)).toBe(false);
      for (const to of PLANNING_STATUSES) {
        expect(isValidPlanningTransition(from, to)).toBe(from !== to && valid[from].includes(to));
      }
    }
    expect(isValidPlanningTransition("Blocked", "Stale")).toBe(true);
    expect(isValidPlanningTransition("Needs Clarification", "Stale")).toBe(true);
    expect(isValidPlanningTransition("Rejected", "Stale")).toBe(false);
    expect(isValidPlanningTransition("Superseded", "Stale")).toBe(false);
    expect(isValidPlanningTransition("Stale", "Stale")).toBe(false);
    expect(valid.Rejected).toHaveLength(0);
    expect(valid.Superseded).toHaveLength(0);
  });

  it("keeps planning statuses isolated from readiness and generated output eligibility", () => {
    for (const status of PLANNING_STATUSES) {
      expect(isPlanningStatusReadinessEligible(status)).toBe(false);
      expect(isPlanningStatusOutputEligible(status)).toBe(false);
    }
  });

  it("removes every duplicate ID independently across all collections", () => {
    const duplicateSource = source();
    const result = normalizeProjectPlanningState(
      planning({
        sources: [duplicateSource, duplicateSource],
        proposals: [proposal(), proposal()],
        decisions: [decision(), decision()],
        dependencies: [dependency(), dependency()],
        conflicts: [conflict(), conflict()]
      }),
      projectId
    );

    expect(result.planning.sources).toHaveLength(0);
    expect(result.planning.proposals).toHaveLength(0);
    expect(result.planning.decisions).toHaveLength(0);
    expect(result.planning.dependencies).toHaveLength(0);
    expect(result.planning.conflicts).toHaveLength(0);
    expect(result.issues.filter((issue) => issue.code === "duplicateId")).toHaveLength(5);
  });

  it("removes records with missing source references, proposal references, or invalid last decisions", () => {
    const confirmedProposal = proposal({ status: "Confirmed", lastDecisionId: decisionId });
    const mismatchedDecision = decision({ resultingStatus: "Rejected" });
    const result = normalizeProjectPlanningState(
      planning({
        proposals: [
          proposal({ proposalId, sourceIds: ["99999999-9999-4999-8999-999999999999"] }),
          confirmedProposal
        ],
        decisions: [
          mismatchedDecision,
          decision({
            decisionId: "77777777-7777-4777-8777-777777777777",
            proposalId: "88888888-8888-4888-8888-888888888888"
          })
        ],
        dependencies: [dependency({ sourceProposalId: "99999999-9999-4999-8999-999999999999" })],
        conflicts: [conflict({ involvedReferences: [{ kind: "proposalId", proposalId: "99999999-9999-4999-8999-999999999999" }] })]
      }),
      projectId
    );

    expect(result.planning.proposals).toHaveLength(0);
    expect(result.planning.decisions).toHaveLength(0);
    expect(result.planning.dependencies).toHaveLength(0);
    expect(result.planning.conflicts).toHaveLength(0);
    expect(result.issues.map((issue) => issue.code)).toContain("invalidCrossReference");
  });

  it("normalizes dependency contracts and removes bounded proposal cycles", () => {
    const first = proposal({ proposalId });
    const second = proposal({ proposalId: proposalIdTwo });
    const firstDependency = dependency({
      dependencyId,
      sourceProposalId: proposalId,
      target: { kind: "proposalId", proposalId: proposalIdTwo }
    });
    const secondDependency = dependency({
      dependencyId: "77777777-7777-4777-8777-777777777777",
      sourceProposalId: proposalIdTwo,
      target: { kind: "proposalId", proposalId }
    });
    const result = normalizeProjectPlanningState(
      planning({ proposals: [first, second], dependencies: [firstDependency, secondDependency] }),
      projectId
    );

    expect(result.planning.dependencies).toHaveLength(0);
    expect(result.issues.map((issue) => issue.code)).toContain("dependencyCycle");

    for (const dependencyType of PLANNING_DEPENDENCY_TYPES) {
      const valid = normalizeProjectPlanningState(
        planning({
          proposals: [first, second],
          dependencies: [
            dependency({
              dependencyId: "88888888-8888-4888-8888-888888888888",
              dependencyType,
              target: { kind: "targetReference", target: first.target }
            })
          ]
        }),
        projectId
      );
      expect(valid.planning.dependencies[0].dependencyType).toBe(dependencyType);
    }
  });

  it("removes unknown dependency targets and enforces stale metadata requirements", () => {
    const unknownDependency = normalizeProjectPlanningState(
      planning({ dependencies: [dependency({ target: { kind: "sourceId", sourceId: "99999999-9999-4999-8999-999999999999" } })] }),
      projectId
    );
    expect(unknownDependency.planning.dependencies).toHaveLength(0);

    const missingStaleMetadata = normalizeProjectPlanningState(
      planning({ proposals: [proposal({ status: "Stale" })] }),
      projectId
    );
    expect(missingStaleMetadata.planning.proposals).toHaveLength(0);

    const stale = normalizeProjectPlanningState(
      planning({ proposals: [proposal({ status: "Stale", staleReason: "sourceChanged", staleAt: timestamp })] }),
      projectId
    );
    expect(stale.planning.proposals[0]).toMatchObject({ status: "Stale", staleReason: "sourceChanged", staleAt: timestampUtc });
    expect(PLANNING_STALE_REASONS).toContain("conflictDetected");
  });

  it("normalizes conflict types, statuses, severity blocking rules, and explicit resolutions", () => {
    for (const conflictType of PLANNING_CONFLICT_TYPES) {
      const result = normalizeProjectPlanningState(
        planning({ proposals: [proposal()], conflicts: [conflict({ conflictType })] }),
        projectId
      );
      expect(result.planning.conflicts[0].conflictType).toBe(conflictType);
    }
    for (const status of PLANNING_CONFLICT_STATUSES) {
      const result = normalizeProjectPlanningState(planning({ conflicts: [conflict({ status })] }), projectId);
      expect(result.planning.conflicts[0].status).toBe(status);
    }
    for (const severity of PLANNING_CONFLICT_SEVERITIES) {
      const blocking = severity === "informational" ? false : true;
      const result = normalizeProjectPlanningState(planning({ conflicts: [conflict({ severity, blocking })] }), projectId);
      expect(result.planning.conflicts[0].severity).toBe(severity);
      expect(result.planning.conflicts[0].blocking).toBe(blocking);
    }

    expect(
      normalizeProjectPlanningState(planning({ conflicts: [conflict({ severity: "blocking", blocking: false })] }), projectId)
        .planning.conflicts
    ).toHaveLength(0);
    expect(
      normalizeProjectPlanningState(planning({ conflicts: [conflict({ severity: "informational", blocking: true })] }), projectId)
        .planning.conflicts
    ).toHaveLength(0);
  });

  it("removes all recommended flags when an alternative group has multiple recommendations", () => {
    const first = proposal({
      proposalId,
      alternativeGroupId: "77777777-7777-4777-8777-777777777777",
      recommendedAlternative: true
    });
    const second = proposal({
      proposalId: proposalIdTwo,
      alternativeGroupId: "77777777-7777-4777-8777-777777777777",
      recommendedAlternative: true
    });
    const result = normalizeProjectPlanningState(planning({ proposals: [first, second] }), projectId);

    expect(result.planning.proposals).toHaveLength(2);
    expect(result.planning.proposals.some((record) => record.recommendedAlternative)).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("multipleRecommendedAlternatives");
  });

  it("rejects capped collections, text limits, target array positions, structured depth, keys, and size", () => {
    expect(
      normalizeProjectPlanningState(planning({ sources: Array.from({ length: 1001 }, (_, index) => source({ sourceId: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}` })) }), projectId)
        .planning.sources
    ).toHaveLength(0);
    expect(normalizeProjectPlanningState(planning({ proposals: [proposal({ title: "x".repeat(241) })] }), projectId).planning.proposals).toHaveLength(0);
    expect(
      normalizeProjectPlanningState(
        planning({ proposals: [proposal({ target: { ...proposal().target, targetKey: "features[0].name" } })] }),
        projectId
      ).planning.proposals
    ).toHaveLength(0);
    expect(
      normalizeProjectPlanningState(planning({ proposals: [proposal({ value: { kind: "text", value: "x".repeat(4001) } })] }), projectId)
        .planning.proposals
    ).toHaveLength(0);
    expect(
      normalizeProjectPlanningState(
        planning({
          proposals: [
            proposal({
              value: {
                kind: "structuredRecord",
                value: Object.fromEntries(Array.from({ length: 51 }, (_, index) => [`field${index}`, value()]))
              }
            })
          ]
        }),
        projectId
      ).planning.proposals
    ).toHaveLength(0);
    expect(
      normalizeProjectPlanningState(
        planning({
          proposals: [
            proposal({
              value: {
                kind: "structuredRecord",
                value: { a: { kind: "structuredRecord", value: { b: { kind: "structuredRecord", value: { c: { kind: "structuredRecord", value: { d: value() } } } } } } }
              }
            })
          ]
        }),
        projectId
      ).planning.proposals
    ).toHaveLength(0);
  });

  it("rejects executable source while accepting ordinary architectural discussion", () => {
    const unsafeTexts = [
      "Set(varArchive, true)",
      "screen:\n  controls:\n    - Button1",
      "function run() { return true; }",
      "<script>alert('x')</script>",
      "javascript:alert('x')",
      "<button onclick=\"run()\">Run</button>"
    ];

    for (const unsafeText of unsafeTexts) {
      const result = normalizeProjectPlanningState(
        planning({ proposals: [proposal({ value: { kind: "text", value: unsafeText } })] }),
        projectId
      );
      expect(result.planning.proposals).toHaveLength(0);
    }

    const safeDiscussion = normalizeProjectPlanningState(
      planning({
        proposals: [
          proposal({
            value: {
              kind: "text",
              value: "Discuss Power Fx, YAML, JavaScript, and HTML risks without providing paste-ready source."
            }
          })
        ]
      }),
      projectId
    );
    expect(safeDiscussion.planning.proposals).toHaveLength(1);
  });

  it("preserves high-risk restrictions without treating them as authorization", () => {
    const result = normalizeProjectPlanningState(
      planning({
        proposals: PLANNING_RESTRICTIONS.map((restriction, index) =>
          proposal({
            proposalId: `22222222-2222-4222-8222-4444444444${String(index).padStart(2, "0")}`,
            restriction,
            status: "Confirmed"
          })
        )
      }),
      projectId
    );

    expect(result.planning.proposals.map((record) => record.restriction)).toEqual(PLANNING_RESTRICTIONS);
    for (const record of result.planning.proposals) {
      expect(isPlanningStatusReadinessEligible(record.status)).toBe(false);
      expect(isPlanningStatusOutputEligible(record.status)).toBe(false);
    }
  });

  it("keeps TTI safety blockers outside planning normalization authority", () => {
    const ttiPlanning = normalizeProjectPlanningState(
      planning({
        proposals: [
          proposal({
            status: "Confirmed",
            title: "Do not invent SharePoint internal names",
            recommendation: "Keep Package readiness Draft and leave schema, security, testing, and ALM gates in Review needed.",
            rationale: "Planning metadata is not readiness, export, YAML, Power Fx, licensing, permission, or release evidence.",
            restriction: "neverAutoGenerate",
            target: {
              kind: "readinessRequirement",
              domain: "readiness",
              targetKey: "powerPlatformGatesConfirmed",
              operation: "clarificationOnly"
            }
          })
        ]
      }),
      projectId
    );

    expect(ttiPlanning.planning.proposals).toHaveLength(1);
    expect(isPlanningStatusReadinessEligible("Confirmed")).toBe(false);
    expect(isPlanningStatusOutputEligible("Confirmed")).toBe(false);
  });

  it("normalizes decision origins and actions without confirmer identity", () => {
    for (const origin of PLANNING_DECISION_ORIGINS) {
      for (const action of PLANNING_DECISION_ACTIONS) {
        const result = normalizeProjectPlanningState(
          planning({
            proposals: [proposal({ status: "Confirmed", lastDecisionId: decisionId })],
            decisions: [decision({ origin, action })]
          }),
          projectId
        );
        expect(result.planning.decisions[0]).toMatchObject({ origin, action });
        expect(Object.keys(result.planning.decisions[0])).not.toContain("actorIdentity");
      }
    }
  });

  it("normalizes optional proposal and decision metadata without readiness or actor fields", () => {
    const result = normalizeProjectPlanningState(
      planning({
        sources: [source(), source({ sourceId: "77777777-7777-4777-8777-777777777777" })],
        proposals: [
          proposal({
            status: "Confirmed",
            consequence: "This affects the future architecture review.",
            supersededByProposalId: proposalIdTwo,
            readinessRequirementIds: ["powerPlatformGatesConfirmed"],
            applicableProjectTypes: ["powerAppsCanvas"],
            applicableDomains: ["powerPlatform", "readiness"],
            lastDecisionId: decisionId
          })
        ],
        decisions: [
          decision({
            value: value("enum"),
            reason: "Confirmed explicitly.",
            sourceIds: [sourceId, "77777777-7777-4777-8777-777777777777"],
            supersedesDecisionId: "88888888-8888-4888-8888-888888888888",
            ruleSetVersion: PLANNING_RULE_SET_VERSION
          })
        ]
      }),
      projectId
    );

    expect(result.planning.proposals[0]).toMatchObject({
      status: "Confirmed",
      consequence: "This affects the future architecture review.",
      readinessRequirementIds: ["powerPlatformGatesConfirmed"],
      applicableProjectTypes: ["powerAppsCanvas"],
      applicableDomains: ["powerPlatform", "readiness"]
    });
    expect(result.planning.decisions[0]).toMatchObject({
      reason: "Confirmed explicitly.",
      supersedesDecisionId: "88888888-8888-4888-8888-888888888888",
      ruleSetVersion: PLANNING_RULE_SET_VERSION
    });
    expect(Object.keys(result.planning.proposals[0])).not.toEqual(
      expect.arrayContaining(["readinessEligible", "outputEligible", "approved", "actorIdentity"])
    );
  });

  it("preserves valid source, target, readiness, and conflict references while filtering unknown optional references", () => {
    const knownDecision = decision();
    const result = normalizeProjectPlanningState(
      planning({
        proposals: [
          proposal({ proposalId, status: "Confirmed", lastDecisionId: decisionId }),
          proposal({ proposalId: proposalIdTwo })
        ],
        decisions: [knownDecision],
        dependencies: [
          dependency({
            dependencyId: "77777777-7777-4777-8777-777777777777",
            target: { kind: "sourceId", sourceId }
          }),
          dependency({
            dependencyId: "88888888-8888-4888-8888-888888888888",
            target: { kind: "readinessRequirementId", readinessRequirementId: "powerPlatformGatesConfirmed" }
          })
        ],
        conflicts: [
          conflict({
            involvedReferences: [
              { kind: "sourceId", sourceId },
              { kind: "decisionId", decisionId },
              { kind: "targetReference", target: proposal().target }
            ],
            resolutionOptionProposalIds: [proposalIdTwo, "99999999-9999-4999-8999-999999999999"],
            affectedProposalIds: [proposalId, "99999999-9999-4999-8999-999999999999"],
            resolvedAt: timestamp,
            resolutionDecisionId: decisionId
          })
        ]
      }),
      projectId
    );

    expect(result.planning.dependencies.map((record) => record.target.kind)).toEqual(["sourceId", "readinessRequirementId"]);
    expect(result.planning.conflicts[0].involvedReferences.map((reference) => reference.kind)).toEqual([
      "sourceId",
      "decisionId",
      "targetReference"
    ]);
    expect(result.planning.conflicts[0].resolutionOptionProposalIds).toEqual([proposalIdTwo]);
    expect(result.planning.conflicts[0].affectedProposalIds).toEqual([proposalId]);
    expect(result.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(["resolutionOptionProposalIds", "affectedProposalIds"])
    );
  });

  it("reports invalid collections and optional metadata without retaining raw corrupt input", () => {
    const result = normalizeProjectPlanningState(
      planning({
        proposals: "not an array",
        sources: [source({ excerpt: "x".repeat(501) })],
        conflicts: [conflict({ resolvedAt: "2026-08-01T10:00:00", affectedProposalIds: ["not-a-uuid"] })]
      }),
      projectId
    );

    expect(result.planning.sources).toEqual([]);
    expect(result.planning.proposals).toEqual([]);
    expect(result.planning.conflicts).toEqual([]);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["invalidCollection", "invalidRecord"])
    );
    expect(JSON.stringify(result.issues)).not.toContain("x".repeat(100));
  });

  it("normalizes line endings and rejects C0 controls in text fields", () => {
    const normalized = normalizeProjectPlanningState(
      planning({
        proposals: [
          proposal({
            recommendation: "First line\r\nSecond line\rThird line",
            rationale: "Architectural rationale"
          })
        ]
      }),
      projectId
    );
    expect(normalized.planning.proposals[0].recommendation).toBe("First line\nSecond line\nThird line");

    const rejected = normalizeProjectPlanningState(
      planning({ proposals: [proposal({ recommendation: `Bad${String.fromCharCode(1)}Text` })] }),
      projectId
    );
    expect(rejected.planning.proposals).toEqual([]);
  });

  it("rejects invalid optional proposal metadata, unknown target operations, and malformed dependency targets", () => {
    expect(
      normalizeProjectPlanningState(planning({ proposals: [proposal({ recommendedAlternative: "yes" as unknown as boolean })] }), projectId)
        .planning.proposals
    ).toEqual([]);
    expect(
      normalizeProjectPlanningState(planning({ proposals: [proposal({ staleReason: "sourceChanged", staleAt: timestamp })] }), projectId)
        .planning.proposals
    ).toEqual([]);
    expect(
      normalizeProjectPlanningState(
        planning({ proposals: [proposal({ target: { ...proposal().target, operation: "deleteRecord" as never } })] }),
        projectId
      ).planning.proposals
    ).toEqual([]);
    expect(
      normalizeProjectPlanningState(
        planning({ dependencies: [dependency({ target: { kind: "proposalId", proposalId: "not-a-uuid" } })] }),
        projectId
      ).planning.dependencies
    ).toEqual([]);
  });
});
