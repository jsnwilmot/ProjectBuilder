// @ts-expect-error -- Vitest runs static source isolation assertions in Node; app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ClarificationDecisionControls,
  type PlanningDecisionUiFeedback,
  type SubmitPlanningClarificationDecision
} from "../components/Planning/ClarificationDecisionControls";
import { buildPlanningUserAnswerLocator } from "../lib/planningClarificationDecisionContract";
import type { PlanningClarificationDecisionFeedback } from "../lib/planningClarificationDecisionFeedback";
import * as answerSchemaRegistry from "../lib/planningClarificationAnswerSchemaRegistry";
import type { PlanningClarificationAnswerSchema } from "../lib/planningClarificationAnswerSchema";
import type { PlanningClarificationDecisionRepositoryInput } from "../lib/planningClarificationDecisionMaterialization";
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

const projectId = "decision-controls-project";
const proposalId = "22222222-2222-4222-8222-000000000001";
const proposalTitle = "Confirm the backend schema";
const decisionRegionName = `Clarification decision actions for ${proposalTitle}`;
const projectRuleSourceId = "11111111-1111-4111-8111-000000000001";
const readinessSourceId = "11111111-1111-4111-8111-000000000002";
const userAnswerSourceId = "11111111-1111-4111-8111-000000000003";
const reviseDecisionId = "44444444-4444-4444-8444-000000000001";
const timestamp = "2026-08-14T12:00:00.000Z";

function ruleFor(ruleId: string) {
  const rule = getPlanningRuleById(ruleId);
  if (!rule) throw new Error(`Missing fixture rule ${ruleId}`);
  return rule;
}

function source(overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return {
    sourceId: projectRuleSourceId,
    sourceType: "projectRule",
    locator: "planning-rule:pp.canvas.schema.confirmation",
    label: "Planning rule",
    authority: "approved",
    availability: "current",
    version: "1.0.0",
    ...overrides
  };
}

function sourcesFor(ruleId: string): PlanningSourceReference[] {
  const rule = ruleFor(ruleId);
  return [
    source({
      sourceId: projectRuleSourceId,
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
    fingerprint: "b".repeat(64),
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
    createdAt: timestamp,
    updatedAt: timestamp,
    readinessRequirementIds: [rule.target.targetKey],
    applicableProjectTypes: ["powerAppsCanvas"],
    applicableDomains: [rule.target.domain],
    ...overrides
  };
}

function planningFor(
  ruleId = "pp.canvas.schema.confirmation",
  proposalOverrides: Partial<PlanningProposalRecord> = {},
  planningOverrides: Partial<ProjectPlanningState> = {}
): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: sourcesFor(ruleId),
    proposals: [proposalFor(ruleId, proposalOverrides)],
    decisions: [],
    dependencies: [],
    conflicts: [],
    ...planningOverrides
  };
}

function yamlAnswer() {
  return {
    kind: "structuredRecord" as const,
    value: {
      installationResponsibility: { kind: "text" as const, value: "Solution owner" },
      validationResponsibility: { kind: "text" as const, value: "Technical reviewer" },
      yamlInstallationLocation: { kind: "text" as const, value: "Approved Canvas app" },
      yamlParentRelationship: { kind: "text" as const, value: "Install under the approved parent" }
    }
  };
}

function revisedPlanning(
  ruleId = "pp.canvas.yamlplanning.confirmation",
  answer: PlanningProposalRecord["value"] = yamlAnswer()
): ProjectPlanningState {
  const userAnswerSource = source({
    sourceId: userAnswerSourceId,
    sourceType: "userAnswer",
    locator: buildPlanningUserAnswerLocator(proposalId, reviseDecisionId)!,
    label: "User answer",
    authority: "informational",
    version: undefined
  });
  const reviseDecision: PlanningDecisionRecord = {
    decisionId: reviseDecisionId,
    proposalId,
    projectId,
    action: "revise",
    previousStatus: "Needs Clarification",
    resultingStatus: "Revised",
    origin: "userAction",
    recordedAt: timestamp,
    value: answer,
    sourceIds: [projectRuleSourceId, readinessSourceId, userAnswerSourceId],
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
  return planningFor(ruleId, {
    status: "Revised",
    value: answer,
    sourceIds: [projectRuleSourceId, readinessSourceId, userAnswerSourceId],
    lastDecisionId: reviseDecisionId
  }, {
    sources: [...sourcesFor(ruleId), userAnswerSource],
    decisions: [reviseDecision]
  });
}

function successfulFeedback(action: PlanningClarificationDecisionRepositoryInput["action"]) {
  const messages = {
    confirm: "Planning decision confirmed.",
    reject: "Planning item rejected.",
    defer: "Planning item deferred.",
    markNotApplicable: "Planning item marked not applicable.",
    revise: "Planning answer saved for review."
  } as const;
  return { kind: "persisted" as const, successful: true, message: messages[action] };
}

function ControlHarness({
  planning,
  onSubmit,
  onMeaningfulChange = () => undefined
}: {
  planning: ProjectPlanningState;
  onSubmit: SubmitPlanningClarificationDecision;
  onMeaningfulChange?: (proposalId: string, meaningful: boolean) => void;
}) {
  const [feedback, setFeedback] = useState<PlanningDecisionUiFeedback | null>(null);
  return (
    <>
      <ClarificationDecisionControls
        projectId={projectId}
        planning={planning}
        proposalId={proposalId}
        proposalTitle={proposalTitle}
        onSubmitClarificationDecision={onSubmit}
        onFeedback={setFeedback}
        onAnswerDraftMeaningfulChange={onMeaningfulChange}
      />
      {feedback ? <div role="status">{feedback.message}</div> : null}
      <p>Other proposal evidence remains readable.</p>
    </>
  );
}

function renderControls(
  planning: ProjectPlanningState,
  onSubmit: SubmitPlanningClarificationDecision = async (_submittedProjectId, input) => ({
    feedback: successfulFeedback(input.action)
  }),
  onMeaningfulChange: (proposalId: string, meaningful: boolean) => void = () => undefined
) {
  return render(
    <ControlHarness
      planning={planning}
      onSubmit={onSubmit}
      onMeaningfulChange={onMeaningfulChange}
    />
  );
}

describe("ClarificationDecisionControls", () => {
  it("keeps the unbound backend answer structure unavailable without a Revise submission", () => {
    const { container } = renderControls(planningFor());
    const controls = screen.getByRole("region", { name: decisionRegionName });

    expect(within(controls).queryByRole("button", { name: "Confirm decision" })).not.toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Defer" })).toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(within(controls).queryByRole("button", { name: "Not applicable" })).not.toBeInTheDocument();
    expect(within(controls).queryByRole("button", { name: /revise|answer|edit/i })).not.toBeInTheDocument();
    expect(screen.getByText(/required answer structure is not registered/)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain(proposalId);
    expect(container.innerHTML).not.toContain("pp.canvas.schema.confirmation");
  });

  it("shows Answer question for a bound eligible rule without pre-populating an editor", () => {
    const { container } = renderControls(planningFor("pp.canvas.yamlplanning.confirmation"));
    const controls = screen.getByRole("region", { name: decisionRegionName });

    expect(screen.queryByText(/Answer entry is not available yet/)).not.toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Answer question" })).toBeInTheDocument();
    expect(within(controls).queryByRole("button", { name: "Save answer for review" })).not.toBeInTheDocument();
    expect(within(controls).queryByRole("textbox", { name: /answer/i })).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("pp.canvas.yamlplanning.confirmation");
  });

  it("derives Not Applicable availability from the governing capability and preserves action order", () => {
    renderControls(planningFor("pp.canvas.components.confirmation"));

    expect(within(screen.getByRole("region", { name: decisionRegionName }))
      .getAllByRole("button").map((button) => button.textContent)).toEqual([
        "Answer question",
        "Defer",
        "Not applicable",
        "Reject"
      ]);
  });

  it("shows Confirm first only for a confirmable Revised clarification", () => {
    renderControls(revisedPlanning());

    expect(within(screen.getByRole("region", { name: decisionRegionName }))
      .getAllByRole("button").map((button) => button.textContent)).toEqual([
        "Confirm decision",
        "Defer",
        "Reject"
      ]);
    expect(screen.queryByRole("button", { name: "Not applicable" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revise/i })).not.toBeInTheDocument();
  });

  it("hides Confirm for an unbound historical backend Revised proposal", () => {
    renderControls(revisedPlanning(
      "pp.canvas.schema.confirmation",
      { kind: "text", value: "Historical backend answer" }
    ));

    const controls = screen.getByRole("region", { name: decisionRegionName });
    expect(within(controls).queryByRole("button", { name: "Confirm decision" })).not.toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Defer" })).toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(controls).not.toHaveTextContent("Historical backend answer");
  });

  it("opens an empty structured answer, reports meaningful changes, and discards only with confirmation", async () => {
    const user = userEvent.setup();
    const onMeaningfulChange = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderControls(planningFor("pp.canvas.yamlplanning.confirmation"), undefined, onMeaningfulChange);

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    expect(screen.getByRole("heading", { name: "Answer question" })).toHaveFocus();
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toHaveValue("");
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, false);

    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Solution owner");
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, true);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toHaveValue("Solution owner");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("textbox", { name: /Installation responsibility/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Answer question" })).toHaveFocus();
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, false);
    confirm.mockRestore();
  });

  it("cancels an untouched editor without confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm");
    renderControls(planningFor("pp.canvas.yamlplanning.confirmation"));

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Answer question" })).toHaveFocus();
    confirm.mockRestore();
  });

  it("projects safe validation issues, focuses the summary, and makes no invalid repository call", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderControls(planningFor("pp.canvas.yamlplanning.confirmation"), onSubmit);

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.click(screen.getByRole("button", { name: "Save answer for review" }));

    const summary = screen.getByRole("alert");
    expect(summary).toHaveFocus();
    expect(summary).toHaveTextContent("Installation responsibility");
    expect(summary).not.toHaveTextContent("SECRET");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits only the canonical structured answer through Revise and clears the saved draft", async () => {
    const user = userEvent.setup();
    const onMeaningfulChange = vi.fn();
    const onSubmit = vi.fn(async (_submittedProjectId: string, input: PlanningClarificationDecisionRepositoryInput) => ({
      feedback: successfulFeedback(input.action)
    }));
    renderControls(planningFor("pp.canvas.yamlplanning.confirmation"), onSubmit, onMeaningfulChange);

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Solution owner");
    await user.type(screen.getByRole("textbox", { name: /Validation responsibility/ }), "Technical reviewer");
    await user.type(screen.getByRole("textbox", { name: /Application location/ }), "Approved Canvas app");
    await user.type(screen.getByRole("textbox", { name: /Parent relationship/ }), "Install under the approved parent");
    await user.click(screen.getByRole("button", { name: "Save answer for review" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith(projectId, {
      proposalId,
      action: "revise",
      value: yamlAnswer()
    });
    expect(Object.keys(onSubmit.mock.calls[0][1]).sort()).toEqual(["action", "proposalId", "value"]);
    expect(await screen.findByText("Planning answer saved for review.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save answer for review" })).not.toBeInTheDocument();
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, false);
  });

  it.each([
    ["text", { kind: "text" }],
    ["boolean", { kind: "boolean" }],
    ["enum", { kind: "enum", options: ["confirmed", "blocked"] }],
    ["stringList", { kind: "stringList", minItems: 1 }],
    ["structuredRecord", { kind: "structuredRecord", fields: [] }],
    ["structuredRecordList", { kind: "structuredRecordList", minItems: 1, fields: [] }]
  ] as const)("dispatches the %s root schema to an approved editor", async (_kind, schema) => {
    const getter = vi.spyOn(answerSchemaRegistry, "getProductionPlanningClarificationAnswerSchema")
      .mockReturnValue(schema as PlanningClarificationAnswerSchema);
    const user = userEvent.setup();
    const { unmount } = renderControls(planningFor("pp.canvas.yamlplanning.confirmation"));

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    expect(screen.getByRole("heading", { name: "Answer question" })).toBeInTheDocument();
    expect(screen.queryByText(/schema kind is not supported|draft type does not match|editor is unavailable/)).not.toBeInTheDocument();

    unmount();
    getter.mockRestore();
  });

  it("treats explicit false as meaningful and submits its canonical primitive value", async () => {
    const getter = vi.spyOn(answerSchemaRegistry, "getProductionPlanningClarificationAnswerSchema")
      .mockReturnValue({ kind: "boolean" });
    const user = userEvent.setup();
    const onMeaningfulChange = vi.fn();
    const onSubmit = vi.fn(async (_project: string, input: PlanningClarificationDecisionRepositoryInput) => ({
      feedback: successfulFeedback(input.action)
    }));
    renderControls(planningFor("pp.canvas.yamlplanning.confirmation"), onSubmit, onMeaningfulChange);

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.click(screen.getByRole("radio", { name: "No" }));
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, true);
    await user.click(screen.getByRole("button", { name: "Save answer for review" }));

    expect(onSubmit).toHaveBeenCalledWith(projectId, {
      proposalId,
      action: "revise",
      value: { kind: "boolean", value: false }
    });
    getter.mockRestore();
  });

  it("treats an engaged empty list as meaningful without persisting it", async () => {
    const getter = vi.spyOn(answerSchemaRegistry, "getProductionPlanningClarificationAnswerSchema")
      .mockReturnValue({ kind: "stringList", minItems: 1 });
    const user = userEvent.setup();
    const onMeaningfulChange = vi.fn();
    const onSubmit = vi.fn();
    renderControls(planningFor("pp.canvas.yamlplanning.confirmation"), onSubmit, onMeaningfulChange);

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.click(screen.getByRole("button", { name: "Add item" }));

    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, true);
    expect(onSubmit).not.toHaveBeenCalled();
    getter.mockRestore();
  });

  it("submits a canonical nested structured-list answer through the same Revise path", async () => {
    const user = userEvent.setup();
    const onMeaningfulChange = vi.fn();
    const onSubmit = vi.fn(async (_project: string, input: PlanningClarificationDecisionRepositoryInput) => ({
      feedback: successfulFeedback(input.action)
    }));
    renderControls(planningFor("pp.canvas.components.confirmation"), onSubmit, onMeaningfulChange);
    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.click(screen.getByRole("button", { name: /Add item to Answer/ }));
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, true);
    await user.type(screen.getByRole("textbox", { name: /Approved component name/ }), "Header component");
    await user.type(screen.getByRole("textbox", { name: /^Purpose/ }), "Display approved navigation");
    await user.type(screen.getByRole("textbox", { name: /^Inputs/ }), "Current user");
    await user.type(screen.getByRole("textbox", { name: /^Outputs/ }), "Selected destination");
    await user.type(screen.getByRole("textbox", { name: /Confirmation source/ }), "Approved component inventory");
    await user.click(screen.getByRole("button", { name: /Add item to Usage locations/ }));
    await user.selectOptions(screen.getByRole("combobox", { name: /Target type/ }), "screen");
    await user.type(screen.getByRole("textbox", { name: /Target ID/ }), "screen-home");
    await user.click(screen.getByRole("button", { name: "Save answer for review" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][1]).toEqual({
      proposalId,
      action: "revise",
      value: {
        kind: "structuredRecordList",
        value: [{
          approvedComponentName: { kind: "text", value: "Header component" },
          purpose: { kind: "text", value: "Display approved navigation" },
          inputs: { kind: "text", value: "Current user" },
          outputs: { kind: "text", value: "Selected destination" },
          usageTargets: {
            kind: "structuredRecordList",
            value: [{
              targetType: { kind: "enum", value: "screen" },
              targetId: { kind: "text", value: "screen-home" }
            }]
          },
          confirmationSource: { kind: "text", value: "Approved component inventory" }
        }]
      }
    });
  });

  it("preserves a failed answer draft and locks every action during one pending Save", async () => {
    const user = userEvent.setup();
    let resolveSubmission: ((value: { feedback: PlanningClarificationDecisionFeedback }) => void) | undefined;
    const onSubmit = vi.fn(() => new Promise<{ feedback: PlanningClarificationDecisionFeedback }>((resolve) => {
      resolveSubmission = resolve;
    }));
    renderControls(planningFor("pp.canvas.yamlplanning.confirmation"), onSubmit);
    await user.click(screen.getByRole("button", { name: "Answer question" }));
    for (const [name, value] of [
      [/Installation responsibility/, "Solution owner"],
      [/Validation responsibility/, "Technical reviewer"],
      [/Application location/, "Approved Canvas app"],
      [/Parent relationship/, "Approved parent"]
    ] as const) await user.type(screen.getByRole("textbox", { name }), value);

    await user.click(screen.getByRole("button", { name: "Save answer for review" }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Save answer for review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Defer" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toBeDisabled();
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent("Saving answer...");
    await user.click(screen.getByRole("button", { name: "Save answer for review" }));
    expect(onSubmit).toHaveBeenCalledOnce();

    resolveSubmission?.({
      feedback: {
        kind: "stateChanged",
        successful: false,
        message: "This project changed before the decision could be saved. Review the latest planning state before trying again."
      }
    });
    expect(await screen.findByText(/changed before the decision could be saved/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toHaveValue("Solution owner");
  });

  it("preserves the answer draft and uses safe feedback when the repository throws", async () => {
    const user = userEvent.setup();
    renderControls(planningFor("pp.canvas.yamlplanning.confirmation"), async () => {
      throw new Error("SECRET ANSWER MATERIALIZATION DETAIL");
    });
    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Preserve after exception");
    await user.type(screen.getByRole("textbox", { name: /Validation responsibility/ }), "Reviewer");
    await user.type(screen.getByRole("textbox", { name: /Application location/ }), "Canvas app");
    await user.type(screen.getByRole("textbox", { name: /Parent relationship/ }), "Approved parent");
    await user.click(screen.getByRole("button", { name: "Save answer for review" }));

    expect(await screen.findByText(
      "The planning decision could not be completed. Review the latest saved state before trying again."
    )).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toHaveValue("Preserve after exception");
    expect(screen.queryByText("SECRET ANSWER MATERIALIZATION DETAIL")).not.toBeInTheDocument();
  });

  it("preserves a meaningful draft across unrelated rerenders and disables it after exact identity changes", async () => {
    const user = userEvent.setup();
    const onMeaningfulChange = vi.fn();
    const initialPlanning = planningFor("pp.canvas.yamlplanning.confirmation");
    const rendered = renderControls(initialPlanning, undefined, onMeaningfulChange);
    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Preserved draft");

    rendered.rerender(
      <ControlHarness
        planning={{ ...initialPlanning, dependencies: [] }}
        onSubmit={async (_project, input) => ({ feedback: successfulFeedback(input.action) })}
        onMeaningfulChange={onMeaningfulChange}
      />
    );
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toHaveValue("Preserved draft");

    rendered.rerender(
      <ControlHarness
        planning={planningFor("pp.canvas.yamlplanning.confirmation", { ruleVersion: "1.0.1" })}
        onSubmit={async (_project, input) => ({ feedback: successfulFeedback(input.action) })}
        onMeaningfulChange={onMeaningfulChange}
      />
    );
    expect(screen.getByText(/Planning changed while this answer was being edited/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toHaveValue("Preserved draft");
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save answer for review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, true);
  });

  it("submits Confirm exactly once with no reason or value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_submittedProjectId: string, input: PlanningClarificationDecisionRepositoryInput) => ({
      feedback: successfulFeedback(input.action)
    }));
    renderControls(revisedPlanning(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Confirm decision" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(projectId, { proposalId, action: "confirm" });
    expect(screen.getByRole("status")).toHaveTextContent("Planning decision confirmed.");
  });

  it.each([
    ["Defer", "Deferral reason", "Defer decision", "defer", "Awaiting approved evidence.", planningFor()],
    ["Reject", "Rejection reason", "Reject decision", "reject", "Outside approved scope.", planningFor()],
    ["Not applicable", "Not applicable reason", "Mark not applicable", "markNotApplicable", "Components are not used.", planningFor("pp.canvas.components.confirmation")]
  ] as const)("binds %s to the exact reason submission", async (
    openLabel,
    inputLabel,
    submitLabel,
    action,
    reason,
    planning
  ) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_submittedProjectId: string, input: PlanningClarificationDecisionRepositoryInput) => ({
      feedback: successfulFeedback(input.action)
    }));
    renderControls(planning, onSubmit);

    await user.click(screen.getByRole("button", { name: openLabel }));
    const reasonInput = screen.getByRole("textbox", { name: inputLabel });
    expect(reasonInput).toHaveFocus();
    await user.type(reasonInput, reason);
    await user.click(screen.getByRole("button", { name: submitLabel }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(projectId, { proposalId, action, reason });
  });

  it("enforces the reason limit, blocks blanks, clears on Cancel, and clears when switching actions", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_submittedProjectId: string, input: PlanningClarificationDecisionRepositoryInput) => ({
      feedback: successfulFeedback(input.action)
    }));
    renderControls(planningFor(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Reject" }));
    const rejectionReason = screen.getByRole("textbox", { name: "Rejection reason" });
    const rejectButton = screen.getByRole("button", { name: "Reject" });
    expect(rejectButton).toHaveAttribute("aria-expanded", "true");
    expect(rejectButton).toHaveAttribute("aria-controls", rejectionReason.closest("form")?.id);
    expect(rejectionReason).toHaveFocus();
    expect(rejectionReason).toHaveAttribute("required");
    expect(rejectionReason).toHaveAttribute("maxLength", "2000");
    expect(screen.getByRole("button", { name: "Reject decision" })).toBeDisabled();
    await user.type(rejectionReason, "   ");
    expect(screen.getByRole("button", { name: "Reject decision" })).toBeDisabled();
    await user.clear(rejectionReason);
    await user.type(rejectionReason, "Unsent rejection reason.");
    await user.click(screen.getByRole("button", { name: "Defer" }));
    const deferralReason = screen.getByRole("textbox", { name: "Deferral reason" });
    const deferButton = screen.getByRole("button", { name: "Defer" });
    expect(deferralReason).toHaveValue("");
    expect(deferralReason).toHaveFocus();
    expect(deferButton).toHaveAttribute("aria-expanded", "true");
    expect(rejectButton).toHaveAttribute("aria-expanded", "false");
    expect(rejectButton).not.toHaveAttribute("aria-controls");
    await user.type(deferralReason, "Unsent deferral reason.");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox", { name: "Deferral reason" })).not.toBeInTheDocument();
    expect(deferButton).toHaveFocus();
    expect(deferButton).toHaveAttribute("aria-expanded", "false");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("locks one proposal while pending and prevents duplicate submission without hiding unrelated content", async () => {
    const user = userEvent.setup();
    let resolveSubmission: ((value: { feedback: ReturnType<typeof successfulFeedback> }) => void) | undefined;
    const onSubmit = vi.fn(() => new Promise<{ feedback: ReturnType<typeof successfulFeedback> }>((resolve) => {
      resolveSubmission = resolve;
    }));
    renderControls(planningFor(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Defer" }));
    await user.type(screen.getByRole("textbox", { name: "Deferral reason" }), "Wait for the owner.");
    await user.click(screen.getByRole("button", { name: "Defer decision" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    const controls = screen.getByRole("region", { name: decisionRegionName });
    const progress = screen.getByRole("status", { name: "" });
    expect(controls).toHaveAttribute("aria-busy", "true");
    expect(progress).toHaveTextContent("Saving decision...");
    expect(progress).toHaveAttribute("aria-live", "polite");
    expect(progress).toHaveAttribute("aria-atomic", "true");
    expect(screen.getByRole("textbox", { name: "Deferral reason" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Defer" })).toBeDisabled();
    expect(screen.getByText("Other proposal evidence remains readable.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Defer decision" }));
    expect(onSubmit).toHaveBeenCalledOnce();

    resolveSubmission?.({ feedback: successfulFeedback("defer") });
    expect(await screen.findByText("Planning item deferred.")).toBeInTheDocument();
    expect(controls).toHaveAttribute("aria-busy", "false");
  });

  it("preserves the reason and surfaces only safe unsuccessful feedback", async () => {
    const user = userEvent.setup();
    const onSubmit: SubmitPlanningClarificationDecision = async () => ({
      feedback: {
        kind: "stateChanged",
        successful: false,
        message: "This project changed before the decision could be saved. Review the latest planning state before trying again."
      }
    });
    renderControls(planningFor(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Defer" }));
    await user.type(screen.getByRole("textbox", { name: "Deferral reason" }), "Preserve this draft.");
    await user.click(screen.getByRole("button", { name: "Defer decision" }));

    expect(await screen.findByRole("status")).toHaveTextContent("This project changed before the decision could be saved.");
    expect(screen.getByRole("textbox", { name: "Deferral reason" })).toHaveValue("Preserve this draft.");
  });

  it("preserves the reason and hides an unexpected raw exception message", async () => {
    const user = userEvent.setup();
    const onSubmit: SubmitPlanningClarificationDecision = async () => {
      throw new Error("SECRET INTERNAL ERROR");
    };
    renderControls(planningFor(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Reject" }));
    await user.type(screen.getByRole("textbox", { name: "Rejection reason" }), "Preserve rejected draft.");
    await user.click(screen.getByRole("button", { name: "Reject decision" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "The planning decision could not be completed. Review the latest saved state before trying again."
    );
    expect(screen.queryByText("SECRET INTERNAL ERROR")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Rejection reason" })).toHaveValue("Preserve rejected draft.");
  });

  it.each(["Confirmed", "Rejected", "Superseded", "Not Applicable"] as const)(
    "renders no controls for the closed %s state",
    (status) => {
      renderControls(planningFor("pp.canvas.components.confirmation", {
        status,
        value: status === "Not Applicable"
          ? { kind: "notApplicable", reason: "Not used." }
          : { kind: "clarification", question: ruleFor("pp.canvas.components.confirmation").question }
      }));

      expect(screen.queryByRole("region", { name: decisionRegionName })).not.toBeInTheDocument();
    }
  );

  it("fails closed for a general proposal and exposes no modal", () => {
    renderControls(planningFor("pp.canvas.schema.confirmation", { category: "architectProposal" }));

    expect(screen.queryByRole("region", { name: decisionRegionName })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("contains one controlled Revise path and no Apply, readiness, output, storage, or raw-diagnostic path", () => {
    const sourceText = readFileSync("src/components/Planning/ClarificationDecisionControls.tsx", "utf8");

    expect(sourceText.match(/action:\s*["']revise["']/g)).toHaveLength(1);
    expect(sourceText).not.toMatch(/applyConfirmedPlanningProposal|readinessConfirmations|setReadinessConfirmation/);
    expect(sourceText).not.toMatch(/generateProjectPackage|exportProjectPackage|localStorage|sessionStorage/);
    expect(sourceText).not.toMatch(/reasonCodes|repositoryResult|materializationIssues/);
  });

  it("uses the existing responsive breakpoints for touch targets, layout, and width safety", () => {
    const css = readFileSync("src/styles/global.css", "utf8");

    expect(css).toMatch(/@media \(max-width: 860px\)[\s\S]*?\.planning-decision-actions \.button,[\s\S]*?min-height: 44px/);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(max-width: 480px\)[\s\S]*?\.planning-decision-actions,[\s\S]*?grid-template-columns: 1fr/);
    expect(css).toMatch(/\.planning-decision-controls \{[\s\S]*?min-width: 0/);
    expect(css).toMatch(/\.planning-decision-reason-form textarea \{[\s\S]*?width: 100%[\s\S]*?max-width: 100%/);
    expect(css).toMatch(/\.planning-decision-feedback,[\s\S]*?overflow-wrap: anywhere/);
  });
});
