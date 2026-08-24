// @ts-expect-error -- Vitest runs static source isolation checks in Node; app TypeScript excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  humanizePlanningClarificationEnumOption,
  planningClarificationItemLabel,
  selectPlanningClarificationAnswerEntry,
  selectPlanningClarificationAnswerReview,
  selectPlanningClarificationDeferral
} from "../lib/planningClarificationAnswerEntryViewModel";
import * as answerSchemaRegistry from "../lib/planningClarificationAnswerSchemaRegistry";
import {
  analyzePlanningClarificationDecisionCapabilities,
  buildPlanningUserAnswerLocator
} from "../lib/planningClarificationDecisionContract";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById } from "../lib/planningRules";

const projectId = "answer-entry-foundation-project";
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

function uuid(value: number): string {
  return `00000000-0000-4000-8000-${value.toString().padStart(12, "0")}`;
}

function planningFor(
  ruleId: string,
  index = 1,
  proposalOverrides: Partial<PlanningProposalRecord> = {}
): ProjectPlanningState {
  const rule = getPlanningRuleById(ruleId);
  if (!rule) throw new Error(`Missing rule fixture: ${ruleId}`);
  const proposalId = uuid(index);
  const projectRuleSourceId = uuid(1000 + index * 2);
  const readinessSourceId = uuid(1001 + index * 2);
  const sources: PlanningSourceReference[] = [
    {
      sourceId: projectRuleSourceId,
      sourceType: "projectRule",
      locator: `planning-rule:${rule.ruleId}`,
      label: "SECRET SOURCE LABEL",
      authority: "approved",
      availability: "current",
      version: rule.ruleVersion,
      excerpt: "SECRET SOURCE CONTENT"
    },
    {
      sourceId: readinessSourceId,
      sourceType: "readinessPrerequisite",
      locator: `phase-gate:${rule.target.targetKey}`,
      label: "Readiness requirement",
      authority: "approved",
      availability: "current"
    }
  ];
  const proposal: PlanningProposalRecord = {
    proposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    fingerprint: "a".repeat(64),
    target: { ...rule.target },
    category: "clarification",
    status: "Needs Clarification",
    value: { kind: "clarification", question: rule.question },
    title: rule.title,
    recommendation: "Ask the client to resolve this planning blocker.",
    rationale: rule.rationale,
    consequence: rule.consequence,
    sourceIds: [projectRuleSourceId, readinessSourceId],
    uncertainty: rule.uncertainty,
    restriction: rule.restriction,
    createdAt: "2026-08-22T12:00:00.000Z",
    updatedAt: "2026-08-22T12:00:00.000Z",
    readinessRequirementIds: [rule.target.targetKey],
    applicableProjectTypes: ["powerAppsCanvas"],
    applicableDomains: [rule.target.domain],
    ...proposalOverrides
  };
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources,
    proposals: [proposal],
    decisions: [],
    dependencies: [],
    conflicts: []
  };
}

function select(ruleId: string, index = 1, proposalOverrides: Partial<PlanningProposalRecord> = {}) {
  const planning = planningFor(ruleId, index, proposalOverrides);
  return selectPlanningClarificationAnswerEntry({
    projectId,
    planning,
    proposalId: planning.proposals[0].proposalId
  });
}

function review(ruleId: string, proposalOverrides: Partial<PlanningProposalRecord> = {}) {
  const planning = planningFor(ruleId, 1, proposalOverrides);
  return selectPlanningClarificationAnswerReview({
    projectId,
    planning,
    proposalId: planning.proposals[0].proposalId
  });
}

const yamlAnswer = {
  kind: "structuredRecord" as const,
  value: {
    installationResponsibility: { kind: "text" as const, value: "Solution owner" },
    validationResponsibility: { kind: "text" as const, value: "Technical reviewer" },
    yamlInstallationLocation: { kind: "text" as const, value: "Approved Canvas app" },
    yamlParentRelationship: { kind: "text" as const, value: "Approved parent" }
  }
};

function confirmedPlanningFor(ruleId = "pp.canvas.yamlplanning.confirmation"): ProjectPlanningState {
  const state = planningFor(ruleId);
  const proposal = state.proposals[0];
  const informationalSourceId = uuid(5001);
  const confirmedSourceId = uuid(5002);
  const reviseDecisionId = uuid(6001);
  const confirmDecisionId = uuid(6002);
  const informationalSource: PlanningSourceReference = {
    sourceId: informationalSourceId,
    sourceType: "userAnswer",
    locator: buildPlanningUserAnswerLocator(proposal.proposalId, reviseDecisionId)!,
    label: "User answer",
    authority: "informational",
    availability: "stale",
    observedAt: proposal.updatedAt
  };
  const confirmedSource: PlanningSourceReference = {
    ...informationalSource,
    sourceId: confirmedSourceId,
    locator: buildPlanningUserAnswerLocator(proposal.proposalId, confirmDecisionId)!,
    authority: "confirmed",
    availability: "current"
  };
  const reviseDecision: PlanningDecisionRecord = {
    decisionId: reviseDecisionId,
    proposalId: proposal.proposalId,
    projectId,
    action: "revise",
    previousStatus: "Needs Clarification",
    resultingStatus: "Revised",
    origin: "userAction",
    recordedAt: proposal.updatedAt,
    value: yamlAnswer,
    sourceIds: [...proposal.sourceIds, informationalSourceId],
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
  const confirmedSourceIds = [...proposal.sourceIds, confirmedSourceId];
  const confirmDecision: PlanningDecisionRecord = {
    decisionId: confirmDecisionId,
    proposalId: proposal.proposalId,
    projectId,
    action: "confirm",
    previousStatus: "Revised",
    resultingStatus: "Confirmed",
    origin: "userAction",
    recordedAt: proposal.updatedAt,
    sourceIds: confirmedSourceIds,
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
  return {
    ...state,
    sources: [...state.sources, informationalSource, confirmedSource],
    proposals: [{
      ...proposal,
      status: "Confirmed",
      value: yamlAnswer,
      sourceIds: confirmedSourceIds,
      lastDecisionId: confirmDecisionId
    }],
    decisions: [reviseDecision, confirmDecision]
  };
}

function revisedPlanningFor(ruleId = "pp.canvas.yamlplanning.confirmation"): ProjectPlanningState {
  const confirmed = confirmedPlanningFor(ruleId);
  const reviseDecision = confirmed.decisions[0];
  const informationalSource = confirmed.sources.find(
    (source) => source.sourceType === "userAnswer" && source.authority === "informational"
  );
  if (!reviseDecision || !informationalSource || !reviseDecision.sourceIds) {
    throw new Error("Missing revised fixture lineage");
  }
  return {
    ...confirmed,
    sources: confirmed.sources
      .filter((source) => source.authority !== "confirmed")
      .map((source) => source.sourceId === informationalSource.sourceId
        ? { ...source, availability: "current" as const }
        : source),
    proposals: [{
      ...confirmed.proposals[0],
      status: "Revised",
      sourceIds: reviseDecision.sourceIds,
      lastDecisionId: reviseDecision.decisionId
    }],
    decisions: [reviseDecision]
  };
}

describe("planning clarification answer-entry view model", () => {
  it("authorizes all ten bound current Needs Clarification rules through exact capability and schema identity", () => {
    expect(BOUND_RULE_IDS).toHaveLength(10);
    BOUND_RULE_IDS.forEach((ruleId, index) => {
      const result = select(ruleId, index + 1);
      expect(result).toMatchObject({
        state: "eligible",
        ruleId,
        ruleVersion: "1.0.0"
      });
      if (result.state === "eligible") {
        expect(result.schema).toEqual(
          answerSchemaRegistry.getProductionPlanningClarificationAnswerSchema(ruleId, "1.0.0")
        );
      }
    });
  });

  it("returns schemaUnavailable for the unbound backend rule without a fallback schema", () => {
    const result = select("pp.canvas.schema.confirmation");
    expect(result).toEqual({ state: "schemaUnavailable", proposalId: uuid(1) });
    expect(result).not.toHaveProperty("schema");
  });

  it("fails closed for exact rule-version mismatch and for a schema-bound non-Revise lifecycle", () => {
    expect(select("pp.canvas.yamlplanning.confirmation", 1, { ruleVersion: "1.0.1" }).state).toBe("unavailable");
    expect(select("pp.canvas.yamlplanning.confirmation", 1, { status: "Deferred" }).state).toBe("unavailable");
  });

  it("keeps the current generic answer-entry selector unavailable for Confirmed despite contract revise capability", () => {
    const planning = confirmedPlanningFor();
    const input = { projectId, planning, proposalId: planning.proposals[0].proposalId };
    const revise = analyzePlanningClarificationDecisionCapabilities(input).capabilities.find(
      (entry) => entry.action === "revise"
    );

    expect(revise).toMatchObject({ state: "inputRequired", requiredInput: "answer" });
    expect(selectPlanningClarificationAnswerEntry(input)).toEqual({
      state: "unavailable",
      proposalId: planning.proposals[0].proposalId
    });
  });

  it("does not let schema presence or caller-supplied schema authorize entry", () => {
    const planning = planningFor("pp.canvas.yamlplanning.confirmation", 1, { status: "Deferred" });
    const input = { projectId, planning, proposalId: planning.proposals[0].proposalId };
    expect(selectPlanningClarificationAnswerEntry(input).state).toBe("unavailable");
    expect(selectPlanningClarificationAnswerEntry({
      ...input,
      schema: { kind: "text" }
    } as typeof input).state).toBe("unavailable");
  });

  it("defensively returns schemaUnavailable when authorized capability lookup is followed by a missing schema", () => {
    const ruleId = "pp.canvas.yamlplanning.confirmation";
    const schema = answerSchemaRegistry.getProductionPlanningClarificationAnswerSchema(ruleId, "1.0.0");
    if (!schema) throw new Error("Missing bound schema fixture");
    const getter = vi.spyOn(answerSchemaRegistry, "getProductionPlanningClarificationAnswerSchema");
    getter.mockReturnValueOnce(schema).mockReturnValueOnce(undefined);

    expect(select(ruleId)).toEqual({ state: "schemaUnavailable", proposalId: uuid(1) });
    getter.mockRestore();
  });

  it("returns defensive schema copies and no answer, source, readiness, or repository content", () => {
    const first = select("pp.canvas.yamlplanning.confirmation");
    expect(first.state).toBe("eligible");
    if (first.state !== "eligible") return;
    (first.schema as { kind: string }).kind = "boolean";

    const second = select("pp.canvas.yamlplanning.confirmation");
    expect(second).toMatchObject({ state: "eligible", schema: { kind: "structuredRecord" } });
    expect(JSON.stringify(second)).not.toMatch(/SECRET|sourceIds|readinessRequirementIds|decisions|repository/i);
  });

  it.each(["Revised", "Confirmed"] as const)(
    "selects the exact-bound normalized saved answer for %s review",
    (status) => {
      const planning = status === "Revised" ? revisedPlanningFor() : confirmedPlanningFor();
      const result = selectPlanningClarificationAnswerReview({
        projectId,
        planning,
        proposalId: planning.proposals[0].proposalId
      });
      expect(result).toEqual({
        state: "available",
        proposalId: uuid(1),
        status,
        ruleId: "pp.canvas.yamlplanning.confirmation",
        ruleVersion: "1.0.0",
        schema: answerSchemaRegistry.getProductionPlanningClarificationAnswerSchema(
          "pp.canvas.yamlplanning.confirmation",
          "1.0.0"
        ),
        answer: yamlAnswer
      });
      expect(Object.keys(result).sort()).toEqual([
        "answer", "proposalId", "ruleId", "ruleVersion", "schema", "state", "status"
      ]);
      expect(JSON.stringify(result)).not.toMatch(/SECRET|sourceIds|readinessRequirementIds|decisions|repository/i);
    }
  );

  it("fails saved-answer review closed outside its lifecycle and for every absent exact schema", () => {
    expect(review("pp.canvas.yamlplanning.confirmation")).toEqual({
      state: "unavailable",
      proposalId: uuid(1)
    });
    expect(review("pp.canvas.yamlplanning.confirmation", {
      status: "Revised",
      value: yamlAnswer,
      ruleVersion: "1.0.1"
    })).toEqual({ state: "unavailable", proposalId: uuid(1) });
    const unbound = revisedPlanningFor("pp.canvas.schema.confirmation");
    expect(selectPlanningClarificationAnswerReview({
      projectId,
      planning: unbound,
      proposalId: unbound.proposals[0].proposalId
    })).toEqual({ state: "schemaUnavailable", proposalId: uuid(1) });
    expect(review("pp.canvas.schema.confirmation", {
      status: "Confirmed",
      value: { kind: "text", value: "SECRET HISTORICAL ANSWER" }
    })).toEqual({ state: "unavailable", proposalId: uuid(1) });
  });

  it("fails status-shaped saved answers closed when human provenance is absent or malformed", () => {
    expect(review("pp.canvas.yamlplanning.confirmation", { status: "Revised", value: yamlAnswer })).toEqual({
      state: "unavailable",
      proposalId: uuid(1)
    });
    const malformed = revisedPlanningFor();
    malformed.sources = malformed.sources.map((source) => source.sourceType === "userAnswer"
      ? { ...source, locator: "planning:userAnswer:wrong" }
      : source);
    expect(selectPlanningClarificationAnswerReview({
      projectId,
      planning: malformed,
      proposalId: malformed.proposals[0].proposalId
    })).toEqual({ state: "unavailable", proposalId: uuid(1) });
  });

  it("selects only a coherent Deferred reason and exposes no decision identity", () => {
    const revised = revisedPlanningFor();
    const deferDecisionId = uuid(7001);
    const proposal = revised.proposals[0];
    const deferDecision: PlanningDecisionRecord = {
      decisionId: deferDecisionId,
      proposalId: proposal.proposalId,
      projectId,
      action: "defer",
      previousStatus: "Revised",
      resultingStatus: "Deferred",
      origin: "userAction",
      recordedAt: proposal.updatedAt,
      reason: "Waiting for approved evidence.",
      sourceIds: proposal.sourceIds,
      ruleSetVersion: PLANNING_RULE_SET_VERSION
    };
    const deferred: ProjectPlanningState = {
      ...revised,
      proposals: [{ ...proposal, status: "Deferred", lastDecisionId: deferDecisionId }],
      decisions: [...revised.decisions, deferDecision]
    };
    const input = { projectId, planning: deferred, proposalId: proposal.proposalId };
    expect(selectPlanningClarificationDeferral(input)).toEqual({
      state: "available",
      reason: "Waiting for approved evidence."
    });
    expect(Object.keys(selectPlanningClarificationDeferral(input)).sort()).toEqual(["reason", "state"]);
    expect(selectPlanningClarificationDeferral({
      ...input,
      planning: { ...deferred, decisions: [...deferred.decisions.slice(0, -1), { ...deferDecision, origin: "migration" }] }
    })).toEqual({ state: "unavailable" });
  });

  it("humanizes enum display values deterministically without replacing canonical values", () => {
    const canonical = ["notStarted", "missingInformation", "review_needed", "already-confirmed"];
    expect(canonical.map(humanizePlanningClarificationEnumOption)).toEqual([
      "Not Started",
      "Missing Information",
      "Review Needed",
      "Already Confirmed"
    ]);
    expect(canonical).toEqual(["notStarted", "missingInformation", "review_needed", "already-confirmed"]);
  });

  it("creates deterministic generic repeated-item labels", () => {
    expect([0, 1, 2].map(planningClarificationItemLabel)).toEqual(["Item 1", "Item 2", "Item 3"]);
    expect(planningClarificationItemLabel(-1)).toBe("Item");
  });

  it("remains a pure non-React capability and registry boundary", () => {
    const source = readFileSync("src/lib/planningClarificationAnswerEntryViewModel.ts", "utf8");
    expect(source).toContain("analyzePlanningClarificationDecisionCapabilities");
    expect(source).toContain("getProductionPlanningClarificationAnswerSchema");
    expect(source).not.toMatch(/from ["']react|react-dom|projectRepository|storageVersion|readiness|controlledApply|generateProjectPackage|exportProjectPackage|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|Math\.random|randomUUID|Date\.now|new Date|analytics/i);
  });

  it("exposes 3I.2 labels only in the scoped Planning UI", () => {
    const currentUi = [
      readFileSync("src/components/Planning/ClarificationDecisionControls.tsx", "utf8"),
      readFileSync("src/components/Planning/PlanningView.tsx", "utf8"),
      readFileSync("src/app/App.tsx", "utf8")
    ].join("\n");

    expect(currentUi).toMatch(/Edit answer|Change answer|Resume decision/i);
    expect(readFileSync("src/app/App.tsx", "utf8")).not.toMatch(/Edit answer|Change answer|Resume decision/i);
  });
});
