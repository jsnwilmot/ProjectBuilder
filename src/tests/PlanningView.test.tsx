import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanningView } from "../components/Planning/PlanningView";
import type { SubmitPlanningClarificationDecision } from "../components/Planning/ClarificationDecisionControls";
import { createProject } from "../lib/createProject";
import { buildPlanningUserAnswerLocator } from "../lib/planningClarificationDecisionContract";
import { CONTROLLED_APPLY_HISTORY_SCHEMA_VERSION } from "../lib/planningControlledApplyHistory";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningDependencyRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById } from "../lib/planningRules";
import type { ProjectRecord } from "../types/project";

const projectId = "planning-view-project";
const timestamp = "2026-08-14T12:00:00.000Z";
const sourceId = "11111111-1111-4111-8111-111111111111";
const proposalId = "22222222-2222-4222-8222-222222222222";
const decisionId = "33333333-3333-4333-8333-333333333333";
const applyId = "44444444-4444-4444-8444-444444444444";
const userAnswerSourceId = "11111111-1111-4111-8111-111111111112";
const reviseDecisionId = "33333333-3333-4333-8333-333333333334";

function source(overrides: Partial<PlanningSourceReference> = {}): PlanningSourceReference {
  return {
    sourceId,
    sourceType: "approvedDocument",
    locator: "internal:approved-document:architecture",
    label: "Approved architecture document",
    authority: "approved",
    availability: "current",
    excerpt: "Approved evidence excerpt.",
    version: "2.0",
    observedAt: timestamp,
    ...overrides
  };
}

function writableProposal(overrides: Partial<PlanningProposalRecord> = {}): PlanningProposalRecord {
  return {
    proposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: "future.project-field.app-purpose",
    ruleVersion: "1.0.0",
    fingerprint: "a".repeat(64),
    target: {
      kind: "projectField",
      domain: "foundation",
      targetKey: "appPurpose",
      fieldKey: "appPurpose",
      operation: "setValue"
    },
    category: "architectProposal",
    status: "Confirmed",
    value: { kind: "text", value: "Approved project purpose" },
    title: "Apply approved project purpose",
    recommendation: "Use the approved project purpose.",
    rationale: "The approved document provides current authoritative evidence.",
    consequence: "A changed value will require project review.",
    sourceIds: [sourceId],
    uncertainty: "Known",
    restriction: "concreteProposalAllowed",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastDecisionId: decisionId,
    ...overrides
  };
}

function clarificationProposal(overrides: Partial<PlanningProposalRecord> = {}): PlanningProposalRecord {
  const rule = getPlanningRuleById("pp.canvas.schema.confirmation");
  if (!rule) throw new Error("Missing schema clarification rule.");
  return {
    ...writableProposal(),
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    target: { ...rule.target },
    category: "clarification",
    status: "Needs Clarification",
    value: { kind: "clarification", question: rule.question },
    title: rule.title,
    recommendation: "Ask for authoritative schema clarification.",
    rationale: rule.rationale,
    consequence: rule.consequence,
    uncertainty: rule.uncertainty,
    restriction: rule.restriction,
    lastDecisionId: undefined,
    ...overrides
  };
}

function decision(): PlanningDecisionRecord {
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
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
}

function planning(overrides: Partial<ProjectPlanningState> = {}): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: [source()],
    proposals: [clarificationProposal()],
    decisions: [],
    dependencies: [],
    conflicts: [],
    ...overrides
  };
}

function project(planningState?: ProjectPlanningState): ProjectRecord {
  return {
    ...createProject({
      identity: { id: projectId, projectName: "Planning View Project" },
      intake: { appType: "powerAppsCanvas", appPurpose: "" },
      now: timestamp
    }),
    ...(planningState ? { planning: planningState } : {})
  };
}

const defaultSubmitClarificationDecision: SubmitPlanningClarificationDecision = async () => ({
  feedback: {
    kind: "blocked",
    successful: false,
    message: "This planning decision could not be saved. Review the latest planning state and required information."
  }
});

function renderPlanningView(
  input: ProjectRecord,
  onSubmitClarificationDecision: SubmitPlanningClarificationDecision = defaultSubmitClarificationDecision,
  onAnswerDraftMeaningfulChange: (proposalId: string, meaningful: boolean) => void = () => undefined
) {
  return render(
    <PlanningView
      project={input}
      onSubmitClarificationDecision={onSubmitClarificationDecision}
      onAnswerDraftMeaningfulChange={onAnswerDraftMeaningfulChange}
    />
  );
}

function yamlProposal(
  status: "Revised" | "Confirmed",
  value: PlanningProposalRecord["value"] = {
    kind: "structuredRecord",
    value: {
      installationResponsibility: { kind: "text", value: "Solution owner" },
      validationResponsibility: { kind: "text", value: "Technical reviewer" },
      yamlInstallationLocation: { kind: "text", value: "Approved Canvas app" },
      yamlParentRelationship: { kind: "text", value: "Approved parent" }
    }
  }
): PlanningProposalRecord {
  const rule = getPlanningRuleById("pp.canvas.yamlplanning.confirmation");
  if (!rule) throw new Error("Missing YAML planning rule.");
  return clarificationProposal({
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    target: { ...rule.target },
    status,
    value,
    title: rule.title,
    recommendation: "Review the saved YAML planning answer.",
    rationale: rule.rationale,
    consequence: rule.consequence,
    uncertainty: rule.uncertainty,
    restriction: rule.restriction
  });
}

function revisedYamlPlanning(): ProjectPlanningState {
  const proposal = yamlProposal("Revised");
  const answer = proposal.value;
  const userAnswer = source({
    sourceId: userAnswerSourceId,
    sourceType: "userAnswer",
    locator: buildPlanningUserAnswerLocator(proposalId, reviseDecisionId)!,
    label: "User answer",
    authority: "informational",
    availability: "current",
    version: undefined,
    excerpt: undefined,
    observedAt: undefined
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
    sourceIds: [sourceId, userAnswerSourceId],
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
  return planning({
    sources: [source(), userAnswer],
    proposals: [{
      ...proposal,
      sourceIds: [sourceId, userAnswerSourceId],
      lastDecisionId: reviseDecisionId
    }],
    decisions: [reviseDecision]
  });
}

describe("PlanningView", () => {
  it("renders the Architecture Planning landmark and deliberate zero-planning state", () => {
    renderPlanningView(project());

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveFocus();
    expect(screen.getByRole("heading", { level: 1, name: "Architecture Planning" })).toBeInTheDocument();
    expect(screen.getByText("No planning items are available for this project yet.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recommendations" })).not.toBeInTheDocument();
  });

  it("shows only the safe issue presentation for partially invalid planning", () => {
    const survivor = clarificationProposal({ status: "Confirmed" });
    const invalidSource = {
      ...source({ sourceId: "11111111-1111-4111-8111-111111111112" }),
      authority: "invalid-authority"
    } as unknown as PlanningSourceReference;
    const input = project(planning({
      sources: [source(), invalidSource],
      proposals: [survivor]
    }));

    renderPlanningView(input);

    expect(screen.getByRole("heading", { level: 1, name: "Architecture Planning" })).toBeInTheDocument();
    expect(screen.getByText("Some planning information cannot be displayed safely.")).toBeInTheDocument();
    expect(screen.getByText("Planning information is unavailable or incomplete because saved planning data could not be validated.")).toBeInTheDocument();
    expect(screen.queryByText(survivor.title)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recommendations" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Questions to answer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Confirmed decisions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Applied history" })).not.toBeInTheDocument();
    expect(screen.queryByText("Ready to apply")).not.toBeInTheDocument();
    expect(screen.queryByText("Planning decision only - no project field change available")).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ planning items?$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders exact groups, status, uncertainty, recommendation, rationale, and consequence", () => {
    const second = clarificationProposal({
      proposalId: "22222222-2222-4222-8222-222222222223",
      ruleId: "future.revised",
      title: "Revised planning item",
      status: "Revised",
      value: { kind: "text", value: "Recorded answer" },
      uncertainty: "Likely"
    });
    renderPlanningView(project(planning({ proposals: [clarificationProposal(), second] })));

    expect(screen.getByRole("heading", { level: 2, name: "Questions to answer" })).toBeInTheDocument();
    expect(screen.getByText("Answer required")).toBeInTheDocument();
    expect(screen.getByText("Answer provided - confirm required")).toBeInTheDocument();
    expect(screen.getByText("Uncertainty: Unknown")).toBeInTheDocument();
    expect(screen.getByText("Uncertainty: Likely")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 4, name: "Why this is recommended" })).toHaveLength(2);
    expect(screen.getAllByText("Ask for authoritative schema clarification.").length).toBeGreaterThan(0);
    expect(screen.getAllByText(getPlanningRuleById("pp.canvas.schema.confirmation")!.consequence).length).toBeGreaterThan(0);
  });

  it("gives simultaneous clarification regions distinct proposal-title names without raw IDs", () => {
    const componentRule = getPlanningRuleById("pp.canvas.components.confirmation");
    if (!componentRule) throw new Error("Missing component clarification rule.");
    const componentProposalId = "22222222-2222-4222-8222-222222222224";
    const componentProposal = clarificationProposal({
      proposalId: componentProposalId,
      ruleId: componentRule.ruleId,
      ruleVersion: componentRule.ruleVersion,
      target: { ...componentRule.target },
      value: { kind: "clarification", question: componentRule.question },
      title: componentRule.title,
      rationale: componentRule.rationale,
      consequence: componentRule.consequence,
      uncertainty: componentRule.uncertainty,
      restriction: componentRule.restriction
    });
    const { container } = renderPlanningView(project(planning({
      proposals: [clarificationProposal(), componentProposal]
    })));

    expect(screen.getByRole("region", {
      name: "Clarification decision actions for Confirm the backend schema"
    })).toBeInTheDocument();
    expect(screen.getByRole("region", {
      name: `Clarification decision actions for ${componentRule.title}`
    })).toBeInTheDocument();
    expect(container).not.toHaveTextContent(proposalId);
    expect(container).not.toHaveTextContent(componentProposalId);
    expect(container.innerHTML).not.toContain(componentRule.ruleId);
  });

  it("renders a valid Revised saved answer before the separate Confirm decision action", () => {
    renderPlanningView(project(revisedYamlPlanning()));

    const reviewHeading = screen.getByRole("heading", { name: "Answer for review" });
    const confirm = screen.getByRole("button", { name: "Confirm decision" });
    expect(reviewHeading.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Solution owner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Answer question|Save answer/ })).not.toBeInTheDocument();
  });

  it("renders a valid Confirmed answer read-only without decision controls", () => {
    renderPlanningView(project(planning({ proposals: [yamlProposal("Confirmed")] })));

    expect(screen.getByRole("heading", { name: "Confirmed answer" })).toBeInTheDocument();
    expect(screen.getByText("Approved Canvas app")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirm decision|Answer question|Save answer/ })).not.toBeInTheDocument();
  });

  it("fails a semantically invalid bound historical answer closed and leaves Confirm unavailable", () => {
    renderPlanningView(project(planning({
      proposals: [yamlProposal("Revised", {
        kind: "structuredRecord",
        value: { installationResponsibility: { kind: "text", value: "SECRET PARTIAL ANSWER" } }
      })]
    })));

    expect(screen.getByText(/no longer matches the approved answer structure/)).toBeInTheDocument();
    expect(screen.queryByText("SECRET PARTIAL ANSWER")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm decision" })).not.toBeInTheDocument();
  });

  it.each(["Revised", "Confirmed"] as const)(
    "does not expose an unbound %s historical answer",
    (status) => {
      renderPlanningView(project(planning({ proposals: [clarificationProposal({
        status,
        value: { kind: "text", value: "SECRET UNBOUND ANSWER" }
      })] })));

      expect(screen.getByText(/approved answer structure is unavailable/)).toBeInTheDocument();
      expect(screen.queryByText("SECRET UNBOUND ANSWER")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Confirm decision" })).not.toBeInTheDocument();
    }
  );

  it("does not render saved-answer review for Needs Clarification", () => {
    renderPlanningView(project(planning({ proposals: [clarificationProposal()] })));
    expect(screen.queryByRole("heading", { name: /Answer for review|Confirmed answer/ })).not.toBeInTheDocument();
  });

  it("renders safe source summaries and keeps optional details collapsed", async () => {
    const user = userEvent.setup();
    const { container } = renderPlanningView(project(planning()));

    expect(screen.getByText("Approved architecture document")).toBeInTheDocument();
    expect(screen.getByText("Approved document")).toBeInTheDocument();
    expect(screen.getByText("Authority: Approved")).toBeInTheDocument();
    expect(screen.getByText("Availability: Current")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(sourceId);
    expect(container).not.toHaveTextContent("internal:approved-document:architecture");

    const summary = screen.getByText("Source details").closest("summary");
    const details = summary?.closest("details");
    expect(details).not.toHaveAttribute("open");
    summary?.focus();
    expect(summary).toHaveFocus();
    await user.click(summary!);
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("Approved evidence excerpt.")).toBeInTheDocument();
    expect(screen.getByText("2.0")).toBeInTheDocument();
  });

  it("renders dependency and conflict details without controls or raw IDs", async () => {
    const user = userEvent.setup();
    const dependency: PlanningDependencyRecord = {
      dependencyId: "55555555-5555-4555-8555-555555555555",
      sourceProposalId: proposalId,
      dependencyType: "requiresReadiness",
      target: { kind: "readinessRequirementId", readinessRequirementId: "schema" },
      required: true,
      rationale: "Schema readiness is required."
    };
    const conflict: PlanningConflictRecord = {
      conflictId: "66666666-6666-4666-8666-666666666666",
      projectId,
      conflictType: "proposalVsIntake",
      severity: "blocking",
      status: "open",
      involvedReferences: [{ kind: "proposalId", proposalId }],
      explanation: "Confirmed intake conflicts with the planning item.",
      blocking: true,
      createdAt: timestamp
    };
    const { container } = renderPlanningView(project(planning({
      proposals: [clarificationProposal({ proposalId })],
      dependencies: [dependency],
      conflicts: [conflict]
    })));

    const summary = screen.getByText("Dependency and conflict details").closest("summary");
    summary?.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByText("Requires readiness")).toBeInTheDocument();
    expect(screen.getByText("Schema readiness is required.")).toBeInTheDocument();
    expect(screen.getByText("Severity: Blocking")).toBeInTheDocument();
    expect(screen.getByText("Confirmed intake conflicts with the planning item.")).toBeInTheDocument();
    expect(container).not.toHaveTextContent(dependency.dependencyId);
    expect(container).not.toHaveTextContent(conflict.conflictId);
    expect(screen.queryByRole("button", { name: /resolve conflict/i })).not.toBeInTheDocument();
  });

  it("shows a current-rule Confirmed proposal as planning-only with no decision or Apply controls", () => {
    const confirmed = clarificationProposal({ status: "Confirmed" });
    renderPlanningView(project(planning({ proposals: [confirmed] })));

    expect(screen.getByText("Confirmed decision")).toBeInTheDocument();
    expect(screen.getByText("Planning decision only - no project field change available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm|answer|revise|reject|defer|not applicable|reopen|mark stale|supersede|block|resolve conflict|apply/i })).not.toBeInTheDocument();
  });

  it("shows read-only Ready to apply details for a future writable proposal without an Apply control", () => {
    renderPlanningView(project(planning({
      proposals: [writableProposal()],
      decisions: [decision()]
    })));

    expect(screen.getByText("Ready to apply")).toBeInTheDocument();
    expect(screen.getByText("App purpose")).toBeInTheDocument();
    expect(screen.getByText("Approved project purpose")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /apply/i })).not.toBeInTheDocument();
  });

  it("shows Already applied and a collapsed history value disclosure without raw IDs", () => {
    const input = project(planning({ proposals: [writableProposal()], decisions: [decision()] }));
    input.intake.appPurpose = "Approved project purpose";
    input.controlledApplyHistory = [{
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
    }];
    const { container } = renderPlanningView(input);

    expect(screen.getByText("Already applied")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Applied history" })).toBeInTheDocument();
    expect(screen.getByText("Changed")).toBeInTheDocument();
    const summary = screen.getByText("Show previous and applied values").closest("summary");
    expect(summary?.closest("details")).not.toHaveAttribute("open");
    expect(container).not.toHaveTextContent(applyId);
    expect(container).not.toHaveTextContent(decisionId);
    expect(container).not.toHaveTextContent(proposalId);
    expect(container).not.toHaveTextContent(projectId);
  });

  it("keeps valid planning visible while warning about invalid controlled Apply history", () => {
    const input = project(planning());
    input.controlledApplyHistory = [
      { applySchemaVersion: "wrong" } as unknown as ProjectRecord["controlledApplyHistory"][number]
    ];

    renderPlanningView(input);

    expect(screen.getByRole("heading", { name: "Questions to answer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirm the backend schema" })).toBeInTheDocument();
    expect(screen.getByText("Some planning information cannot be displayed safely.")).toBeInTheDocument();
    expect(screen.getByText("Applied history is unavailable because saved history could not be validated.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Applied history" })).not.toBeInTheDocument();
  });

  it("renders a TTI-like unresolved clarification without a recommendation group or readiness claim", () => {
    renderPlanningView(project(planning({ proposals: [clarificationProposal()] })));

    expect(screen.getByRole("heading", { name: "Questions to answer" })).toBeInTheDocument();
    expect(screen.getByText("Answer required")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recommendations" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ready for Codex/i)).not.toBeInTheDocument();
    expect(screen.getByText(/required answer structure is not registered/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Defer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revise|provide answer|edit answer/i })).not.toBeInTheDocument();
  });

  it("uses logical proposal headings and non-interactive cards", () => {
    renderPlanningView(project(planning()));

    const group = screen.getByRole("heading", { level: 2, name: "Questions to answer" });
    const proposalHeading = screen.getByRole("heading", { level: 3, name: "Confirm the backend schema" });
    const article = proposalHeading.closest("article");
    expect(group).toBeInTheDocument();
    expect(article).not.toHaveAttribute("role", "button");
    expect(within(article!).getByRole("button", { name: "Defer" })).toBeInTheDocument();
    expect(within(article!).getByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("keeps safe feedback visible and moves a decision only after persisted project rerender", async () => {
    const user = userEvent.setup();
    const submit: SubmitPlanningClarificationDecision = async () => ({
      feedback: { kind: "persisted", successful: true, message: "Planning item deferred." }
    });
    const initialProject = project(planning());
    const { rerender } = renderPlanningView(initialProject, submit);

    await user.click(screen.getByRole("button", { name: "Defer" }));
    await user.type(screen.getByRole("textbox", { name: "Deferral reason" }), "Awaiting approved evidence.");
    await user.click(screen.getByRole("button", { name: "Defer decision" }));

    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent("Planning item deferred.");
    expect(feedback).toHaveAttribute("aria-live", "polite");
    expect(feedback).toHaveAttribute("aria-atomic", "true");
    expect(feedback).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(feedback).toHaveFocus());
    expect(screen.getByRole("heading", { name: "Questions to answer" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Deferred or not needed" })).not.toBeInTheDocument();

    const deferredDecision: PlanningDecisionRecord = {
      decisionId,
      proposalId,
      projectId,
      action: "defer",
      previousStatus: "Needs Clarification",
      resultingStatus: "Deferred",
      origin: "userAction",
      recordedAt: timestamp,
      reason: "Awaiting approved evidence.",
      sourceIds: [sourceId],
      ruleSetVersion: PLANNING_RULE_SET_VERSION
    };
    const persistedProject = project(planning({
      proposals: [clarificationProposal({ status: "Deferred", lastDecisionId: decisionId })],
      decisions: [deferredDecision]
    }));

    rerender(
      <PlanningView
        project={persistedProject}
        onSubmitClarificationDecision={submit}
        onAnswerDraftMeaningfulChange={() => undefined}
      />
    );

    expect(screen.getByText("Planning item deferred.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deferred or not needed" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Questions to answer" })).not.toBeInTheDocument();
    expect(feedback).toHaveFocus();
  });

  it("announces unsuccessful feedback without moving focus to it or clearing the reason", async () => {
    const user = userEvent.setup();
    const submit: SubmitPlanningClarificationDecision = async () => ({
      feedback: {
        kind: "stateChanged",
        successful: false,
        message: "This project changed before the decision could be saved. Review the latest planning state before trying again."
      }
    });
    renderPlanningView(project(planning()), submit);

    await user.click(screen.getByRole("button", { name: "Defer" }));
    const reason = screen.getByRole("textbox", { name: "Deferral reason" });
    await user.type(reason, "Preserve this reason.");
    await user.click(screen.getByRole("button", { name: "Defer decision" }));

    const feedback = await screen.findByRole("status");
    expect(feedback).not.toHaveFocus();
    expect(feedback).toHaveAttribute("tabindex", "-1");
    expect(reason).toHaveValue("Preserve this reason.");
  });

  it("keeps focus in the decision form and hides raw unexpected errors", async () => {
    const user = userEvent.setup();
    const submit: SubmitPlanningClarificationDecision = async () => {
      throw new Error("SECRET INTERNAL ERROR");
    };
    renderPlanningView(project(planning()), submit);

    await user.click(screen.getByRole("button", { name: "Reject" }));
    const reason = screen.getByRole("textbox", { name: "Rejection reason" });
    await user.type(reason, "Preserve this rejection reason.");
    await user.click(screen.getByRole("button", { name: "Reject decision" }));

    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent(
      "The planning decision could not be completed. Review the latest saved state before trying again."
    );
    expect(feedback).not.toHaveFocus();
    expect(reason).toHaveValue("Preserve this rejection reason.");
    expect(screen.queryByText("SECRET INTERNAL ERROR")).not.toBeInTheDocument();
  });
});
