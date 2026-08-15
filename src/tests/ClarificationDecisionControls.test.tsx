// @ts-expect-error -- Vitest runs static source isolation assertions in Node; app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ClarificationDecisionControls,
  type PlanningDecisionUiFeedback,
  type SubmitPlanningClarificationDecision
} from "../components/Planning/ClarificationDecisionControls";
import { buildPlanningUserAnswerLocator } from "../lib/planningClarificationDecisionContract";
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

function revisedPlanning(): ProjectPlanningState {
  const answer = { kind: "text" as const, value: "Approved backend schema." };
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
  return planningFor("pp.canvas.schema.confirmation", {
    status: "Revised",
    value: answer,
    sourceIds: [projectRuleSourceId, readinessSourceId, userAnswerSourceId],
    lastDecisionId: reviseDecisionId
  }, {
    sources: [...sourcesFor("pp.canvas.schema.confirmation"), userAnswerSource],
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
  onSubmit
}: {
  planning: ProjectPlanningState;
  onSubmit: SubmitPlanningClarificationDecision;
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
  })
) {
  return render(<ControlHarness planning={planning} onSubmit={onSubmit} />);
}

describe("ClarificationDecisionControls", () => {
  it("derives Needs Clarification controls from capability authority without a Revise submission", () => {
    const { container } = renderControls(planningFor());
    const controls = screen.getByRole("region", { name: decisionRegionName });

    expect(within(controls).queryByRole("button", { name: "Confirm decision" })).not.toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Defer" })).toBeInTheDocument();
    expect(within(controls).getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(within(controls).queryByRole("button", { name: "Not applicable" })).not.toBeInTheDocument();
    expect(within(controls).queryByRole("button", { name: /revise|answer|edit/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Answer entry is not available yet/)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain(proposalId);
    expect(container.innerHTML).not.toContain("pp.canvas.schema.confirmation");
  });

  it("derives Not Applicable availability from the governing capability and preserves action order", () => {
    renderControls(planningFor("pp.canvas.components.confirmation"));

    expect(within(screen.getByRole("region", { name: decisionRegionName }))
      .getAllByRole("button").map((button) => button.textContent)).toEqual([
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

  it("contains no Revise, Apply, readiness, output, storage, or raw-diagnostic submission path", () => {
    const sourceText = readFileSync("src/components/Planning/ClarificationDecisionControls.tsx", "utf8");

    expect(sourceText).not.toMatch(/action:\s*["']revise["']/);
    expect(sourceText).not.toMatch(/applyConfirmedPlanningProposal|readinessConfirmations|setReadinessConfirmation/);
    expect(sourceText).not.toMatch(/generateProjectPackage|exportProjectPackage|localStorage|sessionStorage/);
    expect(sourceText).not.toMatch(/reasonCodes|repositoryResult|issue\.message/);
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
