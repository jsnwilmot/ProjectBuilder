// @ts-expect-error -- Vitest runs static source isolation assertions in Node; app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildPlanningClarificationDecisionFeedback,
  type PlanningClarificationDecisionFeedback
} from "../lib/planningClarificationDecisionFeedback";
import type {
  PlanningClarificationDecisionMaterializationIssue,
  PlanningClarificationDecisionRepositoryResult
} from "../lib/planningClarificationDecisionMaterialization";
import type { PlanningClarificationHumanDecisionAction } from "../lib/planningClarificationDecisionContract";

const projectId = "sensitive-project-id";
const proposalId = "22222222-2222-4222-8222-000000000001";
const decisionId = "44444444-4444-4444-8444-000000000001";
const createdSourceId = "11111111-1111-4111-8111-000000000003";
const staleSourceId = "11111111-1111-4111-8111-000000000004";

function issue(
  code: PlanningClarificationDecisionMaterializationIssue["code"],
  message = "INTERNAL diagnostic source 12345"
): PlanningClarificationDecisionMaterializationIssue {
  return { code, message, proposalId, sourceId: createdSourceId, decisionId };
}

function result(
  outcome: PlanningClarificationDecisionRepositoryResult["outcome"],
  overrides: Partial<PlanningClarificationDecisionRepositoryResult> = {}
): PlanningClarificationDecisionRepositoryResult {
  return {
    outcome,
    projectId,
    proposalId,
    decisionId,
    createdSourceId,
    staleSourceId,
    issues: [],
    ...overrides
  };
}

describe("planning clarification decision feedback", () => {
  it.each([
    ["revise", "Planning answer saved for review."],
    ["confirm", "Planning decision confirmed."],
    ["reject", "Planning item rejected."],
    ["defer", "Planning item deferred."],
    ["markNotApplicable", "Planning item marked not applicable."],
    ["reopen", "Planning item reopened."]
  ] as const)("returns safe persisted feedback for %s", (action, message) => {
    expect(buildPlanningClarificationDecisionFeedback(result("persisted", { action }))).toEqual({
      kind: "persisted",
      successful: true,
      message
    });
  });

  it("uses safe generic persisted feedback when action is unexpectedly absent", () => {
    expect(buildPlanningClarificationDecisionFeedback(result("persisted"))).toEqual({
      kind: "persisted",
      successful: true,
      message: "Planning decision saved."
    });
  });

  it("maps generic blocked results without exposing repository diagnostics", () => {
    const feedback = buildPlanningClarificationDecisionFeedback(result("blocked", {
      action: "reject",
      issues: [issue("invalidStatusTransition")]
    }));

    expect(feedback).toEqual({
      kind: "blocked",
      successful: false,
      message: "This planning decision could not be saved. Review the latest planning state and required information."
    });
    expect(feedback.message).not.toContain("INTERNAL diagnostic source 12345");
  });

  it("gives concurrency precedence over generic blocked feedback", () => {
    const feedback = buildPlanningClarificationDecisionFeedback(result("blocked", {
      issues: [issue("invalidStatusTransition"), issue("projectChangedDuringDecisionMaterialization")]
    }));

    expect(feedback).toEqual({
      kind: "stateChanged",
      successful: false,
      message: "This project changed before the decision could be saved. Review the latest planning state before trying again."
    });
  });

  it.each([
    ["projectNotFound", "projectNotFound", "This project is no longer available."],
    ["unsupportedProjectType", "unsupportedProjectType", "Planning clarification decisions are not available for this project type."],
    ["persistenceFailed", "persistenceFailed", "The planning decision could not be saved. Check the current saved state before trying again."]
  ] as const)("maps %s to safe unsuccessful feedback", (outcome, kind, message) => {
    expect(buildPlanningClarificationDecisionFeedback(result(outcome, {
      issues: [issue(outcome)]
    }))).toEqual({ kind, successful: false, message });
  });

  it("excludes raw identities, issue messages, diagnostics, and authority claims from every feedback model", () => {
    const repositoryResults: PlanningClarificationDecisionRepositoryResult[] = [
      result("persisted", { action: "confirm" }),
      result("persisted", { action: "reopen" }),
      result("blocked", { issues: [issue("invalidStatusTransition")] }),
      result("blocked", { issues: [issue("projectChangedDuringDecisionMaterialization")] }),
      result("projectNotFound", { issues: [issue("projectNotFound")] }),
      result("unsupportedProjectType", { issues: [issue("unsupportedProjectType")] }),
      result("persistenceFailed", { issues: [issue("persistenceFailed")] })
    ];

    for (const repositoryResult of repositoryResults) {
      const serialized = JSON.stringify(buildPlanningClarificationDecisionFeedback(repositoryResult));
      expect(serialized).not.toContain(projectId);
      expect(serialized).not.toContain(proposalId);
      expect(serialized).not.toContain(decisionId);
      expect(serialized).not.toContain(createdSourceId);
      expect(serialized).not.toContain(staleSourceId);
      expect(serialized).not.toContain("INTERNAL diagnostic source 12345");
      expect(serialized).not.toMatch(/Architect Approved|readiness complete|Ready package|Power Fx generated|YAML generated|Apply complete|output generated/i);
    }
  });

  it("is deterministic, pure, and does not mutate the repository result", () => {
    const input = result("blocked", {
      action: "defer",
      issues: [issue("projectChangedDuringDecisionMaterialization")]
    });
    const before = JSON.stringify(input);
    const first = buildPlanningClarificationDecisionFeedback(input);
    const second = buildPlanningClarificationDecisionFeedback(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(before);
    (first as PlanningClarificationDecisionFeedback).message = "Mutated local feedback.";
    expect(buildPlanningClarificationDecisionFeedback(input)).toEqual(second);
  });

  it("remains isolated from React, browser, repository, readiness, output, Apply, and schema behavior", () => {
    const sourceText = readFileSync("src/lib/planningClarificationDecisionFeedback.ts", "utf8");

    expect(sourceText).not.toMatch(/from ["']react|PlanningView|\bApp\b|window\.|document\.|localStorage|sessionStorage/i);
    expect(sourceText).not.toMatch(/materializeProjectPlanningClarificationHumanDecision|applyConfirmedPlanningProposal/);
    expect(sourceText).not.toMatch(/readinessConfirmations|reviewStatus|generateProjectPackage|powerFx|yaml|exportProjectPackage/i);
    expect(sourceText).not.toMatch(/answerKind|valueKind|editorType|structuredRecord|enum values/i);
  });

  it("keeps persisted action typing aligned with the six-action clarification contract", () => {
    const actions: PlanningClarificationHumanDecisionAction[] = [
      "revise",
      "confirm",
      "reject",
      "defer",
      "markNotApplicable",
      "reopen"
    ];

    expect(actions.map((action) => buildPlanningClarificationDecisionFeedback(result("persisted", { action })).kind))
      .toEqual(["persisted", "persisted", "persisted", "persisted", "persisted", "persisted"]);
  });
});
