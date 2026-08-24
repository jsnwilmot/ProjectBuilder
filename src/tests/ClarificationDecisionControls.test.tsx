// @ts-expect-error -- Vitest runs static source isolation assertions in Node; app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ClarificationDecisionControls,
  type PlanningDecisionUiFeedback,
  type SubmitPlanningClarificationDecision
} from "../components/Planning/ClarificationDecisionControls";
import {
  buildPlanningUserAnswerLocator,
  type PlanningClarificationHumanDecisionAction
} from "../lib/planningClarificationDecisionContract";
import type { PlanningClarificationDecisionFeedback } from "../lib/planningClarificationDecisionFeedback";
import type { PlanningClarificationAnswerSchemaContext } from "../lib/planningClarificationAnswerSchemaResolver";
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

type UiDecisionInput = PlanningClarificationDecisionRepositoryInput<PlanningClarificationHumanDecisionAction>;

const projectId = "decision-controls-project";
const proposalId = "22222222-2222-4222-8222-000000000001";
const proposalTitle = "Confirm the backend schema";
const decisionRegionName = `Clarification decision actions for ${proposalTitle}`;
const projectRuleSourceId = "11111111-1111-4111-8111-000000000001";
const readinessSourceId = "11111111-1111-4111-8111-000000000002";
const userAnswerSourceId = "11111111-1111-4111-8111-000000000003";
const reviseDecisionId = "44444444-4444-4444-8444-000000000001";
const confirmDecisionId = "44444444-4444-4444-8444-000000000002";
const deferDecisionId = "44444444-4444-4444-8444-000000000003";
const confirmedAnswerSourceId = "11111111-1111-4111-8111-000000000004";
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

function confirmedPlanning(): ProjectPlanningState {
  const revised = revisedPlanning();
  const proposal = revised.proposals[0];
  const staleInformational = { ...revised.sources.at(-1)!, availability: "stale" as const };
  const confirmedSource = {
    ...staleInformational,
    sourceId: confirmedAnswerSourceId,
    locator: buildPlanningUserAnswerLocator(proposalId, confirmDecisionId)!,
    authority: "confirmed" as const,
    availability: "current" as const
  };
  const sourceIds = [projectRuleSourceId, readinessSourceId, confirmedAnswerSourceId];
  const confirmDecision: PlanningDecisionRecord = {
    decisionId: confirmDecisionId,
    proposalId,
    projectId,
    action: "confirm",
    previousStatus: "Revised",
    resultingStatus: "Confirmed",
    origin: "userAction",
    recordedAt: timestamp,
    sourceIds,
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
  return {
    ...revised,
    sources: [...revised.sources.slice(0, -1), staleInformational, confirmedSource],
    proposals: [{ ...proposal, status: "Confirmed", sourceIds, lastDecisionId: confirmDecisionId }],
    decisions: [...revised.decisions, confirmDecision]
  };
}

function deferredPlanning(answered = true): ProjectPlanningState {
  const base = answered ? revisedPlanning() : planningFor("pp.canvas.yamlplanning.confirmation");
  const proposal = base.proposals[0];
  const deferDecision: PlanningDecisionRecord = {
    decisionId: deferDecisionId,
    proposalId,
    projectId,
    action: "defer",
    previousStatus: answered ? "Revised" : "Needs Clarification",
    resultingStatus: "Deferred",
    origin: "userAction",
    recordedAt: timestamp,
    reason: "Waiting for owner approval.",
    sourceIds: proposal.sourceIds,
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
  return {
    ...base,
    proposals: [{ ...proposal, status: "Deferred", lastDecisionId: deferDecisionId }],
    decisions: [...base.decisions, deferDecision]
  };
}

function successfulFeedback(action: UiDecisionInput["action"]) {
  const messages = {
    confirm: "Planning decision confirmed.",
    reject: "Planning item rejected.",
    defer: "Planning item deferred.",
    markNotApplicable: "Planning item marked not applicable.",
    revise: "Planning answer saved for review.",
    reopen: "Planning item reopened."
  } as const;
  return { kind: "persisted" as const, successful: true, message: messages[action] };
}

function ControlHarness({
  planning,
  onSubmit,
  onMeaningfulChange = () => undefined,
  answerSchemaContext = {
    projectType: "powerAppsCanvas",
    primaryDataSourceType: "undecided",
    selectedDataSourceTypes: []
  }
}: {
  planning: ProjectPlanningState;
  onSubmit: SubmitPlanningClarificationDecision;
  onMeaningfulChange?: (proposalId: string, meaningful: boolean) => void;
  answerSchemaContext?: PlanningClarificationAnswerSchemaContext;
}) {
  const [feedback, setFeedback] = useState<PlanningDecisionUiFeedback | null>(null);
  return (
    <>
      <ClarificationDecisionControls
        projectId={projectId}
        planning={planning}
        answerSchemaContext={answerSchemaContext}
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
  onMeaningfulChange: (proposalId: string, meaningful: boolean) => void = () => undefined,
  answerSchemaContext?: PlanningClarificationAnswerSchemaContext
) {
  return render(
    <ControlHarness
      planning={planning}
      onSubmit={onSubmit}
      onMeaningfulChange={onMeaningfulChange}
      answerSchemaContext={answerSchemaContext}
    />
  );
}

describe("ClarificationDecisionControls", () => {
  it("requires a single backend selection without exposing internal identifiers", () => {
    const { container } = renderControls(planningFor());
    const controls = screen.getByRole("region", { name: decisionRegionName });

    expect(within(controls).queryByRole("button", { name: "Confirm decision" })).not.toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Defer" })).toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(within(controls).queryByRole("button", { name: "Not applicable" })).not.toBeInTheDocument();
    expect(within(controls).queryByRole("button", { name: /revise|answer|edit/i })).not.toBeInTheDocument();
    expect(screen.getByText(
      "Confirm a single backend/data-source type before answering this question."
    )).toBeInTheDocument();
    expect(container.innerHTML).not.toContain(proposalId);
    expect(container.innerHTML).not.toContain("pp.canvas.schema.confirmation");
  });

  it("edits and submits the exact SharePoint List backend answer contract", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_project: string, input: UiDecisionInput) => ({
      feedback: successfulFeedback(input.action)
    }));
    renderControls(
      planningFor(),
      onSubmit,
      undefined,
      {
        projectType: "powerAppsCanvas",
        primaryDataSourceType: "sharePointList",
        selectedDataSourceTypes: ["sharePointList"]
      }
    );

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.click(screen.getByRole("button", { name: /Add item to Data sources/ }));
    await user.type(screen.getByRole("textbox", { name: /Data source name/ }), "Projects");
    await user.type(screen.getByRole("textbox", { name: /^Purpose/ }), "Track project delivery");
    await user.type(screen.getByRole("textbox", { name: /Expected record volume/ }), "Up to 10,000 records");
    await user.type(screen.getByRole("textbox", { name: /Ownership/ }), "Operations");
    await user.type(screen.getByRole("textbox", { name: /^Relationships/ }), "Projects link to assignments.");
    await user.type(screen.getByRole("textbox", { name: /Schema confirmation source/ }), "Approved solution design");
    await user.click(screen.getByRole("button", { name: "Save answer for review" }));

    expect(onSubmit).toHaveBeenCalledWith(projectId, {
      proposalId,
      action: "revise",
      value: {
        kind: "structuredRecord",
        value: {
          dataSources: {
            kind: "structuredRecordList",
            value: [{
              dataSourceName: { kind: "text", value: "Projects" },
              purpose: { kind: "text", value: "Track project delivery" },
              expectedRecordVolume: { kind: "text", value: "Up to 10,000 records" },
              ownership: { kind: "text", value: "Operations" }
            }]
          },
          relationships: { kind: "text", value: "Projects link to assignments." },
          confirmationSource: { kind: "text", value: "Approved solution design" }
        }
      }
    });
    expect(Object.keys(onSubmit.mock.calls[0][1]).sort()).toEqual(["action", "proposalId", "value"]);
  });

  it.each([
    [{ projectType: "powerAppsCanvas", primaryDataSourceType: "dataverse", selectedDataSourceTypes: ["dataverse"] },
      "Project Builder does not yet have an approved answer form for the selected backend type."],
    [{ projectType: "powerAppsCanvas", primaryDataSourceType: "multiple", selectedDataSourceTypes: ["sharePointList", "dataverse"] },
      "Project Builder does not yet have an approved answer form for projects using multiple backend types."]
  ] as const)("renders the exact backend unavailable message for context %#", (answerSchemaContext, message) => {
    renderControls(planningFor(), undefined, undefined, answerSchemaContext);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Answer question" })).not.toBeInTheDocument();
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

  it("opens Revised Edit answer prefilled and clean, then cancels without persistence", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_project: string, input: UiDecisionInput) => ({
      feedback: successfulFeedback(input.action)
    }));
    const onMeaningfulChange = vi.fn();
    const confirm = vi.spyOn(window, "confirm");
    renderControls(revisedPlanning(), onSubmit, onMeaningfulChange);

    const edit = screen.getByRole("button", { name: "Edit answer" });
    await user.click(edit);
    expect(screen.getByRole("heading", { name: "Edit answer" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toHaveValue("Solution owner");
    expect(screen.getByRole("button", { name: "Save updated answer for review" })).toBeDisabled();
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, false);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit answer" })).toHaveFocus();
    confirm.mockRestore();
  });

  it("keeps a changed Edit draft when discard is declined and closes without persistence when accepted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderControls(revisedPlanning(), onSubmit as SubmitPlanningClarificationDecision);

    await user.click(screen.getByRole("button", { name: "Edit answer" }));
    const field = screen.getByRole("textbox", { name: /Installation responsibility/ });
    await user.clear(field);
    await user.type(field, "Unsaved replacement");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(field).toHaveValue("Unsaved replacement");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit answer" })).toHaveFocus();
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirm.mock.calls.flat().join(" ")).not.toContain("Unsaved replacement");
    confirm.mockRestore();
  });

  it("saves a changed Revised answer sequentially through reopen then revise", async () => {
    const user = userEvent.setup();
    const calls: UiDecisionInput[] = [];
    const onSubmit = vi.fn(async (_project: string, input: UiDecisionInput) => {
      calls.push(input);
      return { feedback: successfulFeedback(input.action) };
    });
    renderControls(revisedPlanning(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Edit answer" }));
    const field = screen.getByRole("textbox", { name: /Installation responsibility/ });
    await user.clear(field);
    await user.type(field, "Updated owner");
    await user.click(screen.getByRole("button", { name: "Save updated answer for review" }));

    expect(calls.map((input) => input.action)).toEqual(["reopen", "revise"]);
    expect(calls[0]).toEqual({ proposalId, action: "reopen" });
    expect(calls[1]).toMatchObject({ proposalId, action: "revise" });
    expect(screen.getByRole("status")).toHaveTextContent("Planning answer saved for review.");
    expect(screen.queryByText("Planning item reopened.")).not.toBeInTheDocument();
  });

  it("keeps a replacement draft open and never revises when Edit reopen fails", async () => {
    const user = userEvent.setup();
    const calls: UiDecisionInput[] = [];
    renderControls(revisedPlanning(), async (_project, input) => {
      calls.push(input);
      return {
        feedback: {
          kind: "stateChanged",
          successful: false,
          message: "This project changed before the decision could be saved."
        }
      };
    });

    await user.click(screen.getByRole("button", { name: "Edit answer" }));
    const field = screen.getByRole("textbox", { name: /Installation responsibility/ });
    await user.clear(field);
    await user.type(field, "Preserved after reopen failure");
    await user.click(screen.getByRole("button", { name: "Save updated answer for review" }));

    expect(calls.map((input) => input.action)).toEqual(["reopen"]);
    expect(field).toHaveValue("Preserved after reopen failure");
    expect(screen.getByRole("heading", { name: "Edit answer" })).toBeInTheDocument();
  });

  it("preserves a changed Edit draft after partial failure and retries revise without reopening again", async () => {
    const user = userEvent.setup();
    const calls: UiDecisionInput[] = [];
    const outcomes = [true, false, true];
    const onSubmit = vi.fn(async (_project: string, input: UiDecisionInput) => {
      calls.push(input);
      const successful = outcomes[calls.length - 1];
      return {
        feedback: successful
          ? successfulFeedback(input.action)
          : { kind: "blocked" as const, successful: false, message: "This planning decision could not be saved." }
      };
    });
    renderControls(revisedPlanning(), onSubmit);

    await user.click(screen.getByRole("button", { name: "Edit answer" }));
    const field = screen.getByRole("textbox", { name: /Installation responsibility/ });
    await user.clear(field);
    await user.type(field, "Preserved replacement");
    const save = screen.getByRole("button", { name: "Save updated answer for review" });
    await user.click(save);

    expect(screen.getByText("The item was reopened, but the updated answer was not saved. Your draft is preserved.")).toHaveFocus();
    expect(field).toHaveValue("Preserved replacement");
    await user.click(save);
    expect(calls.map((input) => input.action)).toEqual(["reopen", "revise", "revise"]);
  });

  it("changes a Confirmed answer with revise only and keeps confirmation explicit", async () => {
    const user = userEvent.setup();
    const calls: UiDecisionInput[] = [];
    renderControls(confirmedPlanning(), async (_project, input) => {
      calls.push(input);
      return { feedback: successfulFeedback(input.action) };
    });

    await user.click(screen.getByRole("button", { name: "Change answer" }));
    const field = screen.getByRole("textbox", { name: /Installation responsibility/ });
    expect(field).toHaveValue("Solution owner");
    await user.clear(field);
    await user.type(field, "Changed owner");
    await user.click(screen.getByRole("button", { name: "Save changed answer for review" }));
    expect(calls.map((input) => input.action)).toEqual(["revise"]);
  });

  it.each([true, false])("resumes a valid %s Deferred decision once", async (answered) => {
    let resolve!: (value: { feedback: PlanningClarificationDecisionFeedback }) => void;
    const onSubmit = vi.fn((_project: string, _input: UiDecisionInput) =>
      new Promise<{ feedback: PlanningClarificationDecisionFeedback }>((complete) => { resolve = complete; })
    );
    renderControls(deferredPlanning(answered), onSubmit);

    const resume = screen.getByRole("button", { name: "Resume decision" });
    fireEvent.click(resume);
    fireEvent.click(resume);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(projectId, { proposalId, action: "reopen" });
    resolve({ feedback: successfulFeedback("reopen") });
    await waitFor(() => expect(resume).toBeEnabled());
  });

  it("fails malformed Deferred history closed without exposing its persisted reason", () => {
    const malformed = deferredPlanning(true);
    malformed.decisions = malformed.decisions.map((decision) => decision.action === "defer"
      ? { ...decision, origin: "migration" }
      : decision);
    renderControls(malformed);

    expect(screen.queryByRole("button", { name: "Resume decision" })).not.toBeInTheDocument();
    expect(screen.getByText(
      "This deferred item cannot be resumed because its saved decision history could not be validated."
    )).toBeInTheDocument();
    expect(screen.queryByText("Waiting for owner approval.")).not.toBeInTheDocument();
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
        "Edit answer",
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
    const firstAnswer = screen.getByRole("textbox", { name: /Installation responsibility/ });
    expect(firstAnswer).toHaveFocus();
    expect(firstAnswer).toHaveValue("");
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, false);

    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Solution owner");
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, true);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0]?.[0]).toBe("Discard answer and stop editing? Select Cancel to keep editing.");
    expect(confirm.mock.calls[0]?.[0]).not.toContain("Solution owner");
    expect(confirm.mock.calls[0]?.[0]).not.toContain(proposalId);
    expect(confirm.mock.calls[0]?.[0]).not.toContain("pp.canvas.yamlplanning.confirmation");
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
    const onSubmit = vi.fn(async (_submittedProjectId: string, input: UiDecisionInput) => ({
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
    ["text", { kind: "text" }, "textbox", /^Answer/],
    ["boolean", { kind: "boolean" }, "radio", "Yes"],
    ["enum", { kind: "enum", options: ["confirmed", "blocked"] }, "combobox", /^Answer/],
    ["zero-row string list", { kind: "stringList" }, "button", "Add item"],
    ["structured record", {
      kind: "structuredRecord",
      fields: [{ key: "owner", label: "Owner", required: true, schema: { kind: "text" } }]
    }, "textbox", /Owner/],
    ["zero-row structured record list", {
      kind: "structuredRecordList",
      fields: [{ key: "owner", label: "Owner", required: true, schema: { kind: "text" } }]
    }, "button", /Add item to Answer/]
  ] as const)("focuses the first enabled %s answer control", async (_kind, schema, role, name) => {
    const getter = vi.spyOn(answerSchemaRegistry, "getProductionPlanningClarificationAnswerSchema")
      .mockReturnValue(schema as PlanningClarificationAnswerSchema);
    const user = userEvent.setup();
    const { unmount } = renderControls(planningFor("pp.canvas.yamlplanning.confirmation"));

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    expect(screen.getByRole("heading", { name: "Answer question" })).toBeInTheDocument();
    expect(screen.getByRole(role, { name })).toHaveFocus();
    expect(screen.queryByText(/schema kind is not supported|draft type does not match|editor is unavailable/)).not.toBeInTheDocument();

    unmount();
    getter.mockRestore();
  });

  it("falls back to the answer heading when a valid schema has no interactive descendant", async () => {
    const getter = vi.spyOn(answerSchemaRegistry, "getProductionPlanningClarificationAnswerSchema")
      .mockReturnValue({ kind: "structuredRecord", fields: [] });
    const user = userEvent.setup();
    renderControls(planningFor("pp.canvas.yamlplanning.confirmation"));

    await user.click(screen.getByRole("button", { name: "Answer question" }));

    expect(screen.getByRole("heading", { name: "Answer question" })).toHaveFocus();
    getter.mockRestore();
  });

  it("treats explicit false as meaningful and submits its canonical primitive value", async () => {
    const getter = vi.spyOn(answerSchemaRegistry, "getProductionPlanningClarificationAnswerSchema")
      .mockReturnValue({ kind: "boolean" });
    const user = userEvent.setup();
    const onMeaningfulChange = vi.fn();
    const onSubmit = vi.fn(async (_project: string, input: UiDecisionInput) => ({
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
    const onSubmit = vi.fn(async (_project: string, input: UiDecisionInput) => ({
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
    expect(screen.queryByRole("button", { name: "Defer" })).not.toBeInTheDocument();
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
    const staleStatus = screen.getByText(/Planning changed while this answer was being edited/);
    expect(staleStatus).toHaveFocus();
    expect(staleStatus).toHaveAttribute("role", "status");
    expect(staleStatus).toHaveAttribute("tabindex", "-1");
    expect(staleStatus.id).not.toContain(proposalId);
    expect(staleStatus.id).not.toContain("pp.canvas.yamlplanning.confirmation");
    const answerForm = screen.getByRole("heading", { name: "Answer question" }).closest("form");
    expect(answerForm).toHaveAttribute("aria-describedby", staleStatus.id);
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toHaveValue("Preserved draft");
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save answer for review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(onMeaningfulChange).toHaveBeenLastCalledWith(proposalId, true);
  });

  it("submits Confirm exactly once with no reason or value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_submittedProjectId: string, input: UiDecisionInput) => ({
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
    const onSubmit = vi.fn(async (_submittedProjectId: string, input: UiDecisionInput) => ({
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
    const onSubmit = vi.fn(async (_submittedProjectId: string, input: UiDecisionInput) => ({
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
    expect(sourceText).toContain("onAnswerDraftMeaningfulChange: (proposalId: string, meaningful: boolean) => void");
    expect(sourceText).not.toMatch(/type=["']hidden["']|data-[a-z]|console\.|analytics/);
  });

  it("uses the existing responsive breakpoints for touch targets, layout, and width safety", () => {
    const css = readFileSync("src/styles/global.css", "utf8");

    expect(css).toMatch(/@media \(max-width: 860px\)[\s\S]*?\.planning-decision-actions \.button,[\s\S]*?min-height: 44px/);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(max-width: 480px\)[\s\S]*?\.planning-decision-actions,[\s\S]*?grid-template-columns: 1fr/);
    expect(css).toMatch(/\.planning-decision-controls \{[\s\S]*?min-width: 0/);
    expect(css).toMatch(/\.planning-decision-reason-form textarea \{[\s\S]*?width: 100%[\s\S]*?max-width: 100%/);
    expect(css).toMatch(/\.planning-decision-feedback,[\s\S]*?overflow-wrap: anywhere/);
    expect(css).toMatch(/\.planning-decision-answer-form \{[\s\S]*?width: 100%[\s\S]*?box-sizing: border-box/);
    expect(css).toMatch(/\.planning-decision-answer-editor \{[\s\S]*?min-width: 0[\s\S]*?overflow-wrap: anywhere/);
    expect(css).toMatch(/\.planning-answer-structured \{[\s\S]*?width: 100%[\s\S]*?box-sizing: border-box/);
    expect(css).toMatch(/\.planning-answer-renderer-field dd \{[\s\S]*?overflow-wrap: anywhere/);
  });
});
