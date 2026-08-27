// @ts-expect-error -- Vitest runs static App wiring assertions in Node; app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../components/AppShell/AppHeader", () => ({
  AppHeader: () => null
}));

vi.mock("../components/AppShell/AppNavigation", () => ({
  AppNavigation: ({ onNavigate }: { onNavigate: (view: "planning") => void }) => (
    <nav aria-label="Primary navigation">
      <button type="button" onClick={() => onNavigate("planning")}>Planning</button>
    </nav>
  )
}));

vi.mock("../components/DocumentViewer/DocumentViewer", () => ({ DocumentViewer: () => null }));
vi.mock("../components/ExportPanel/ExportPanel", () => ({ ExportPanel: () => null }));
vi.mock("../components/IntakeBuilder/IntakeBuilder", () => ({ IntakeBuilder: () => null }));
vi.mock("../components/MissionControl/MissionControl", () => ({ MissionControl: () => null }));

import { App } from "../app/App";
import { createProject } from "../lib/createProject";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { loadStorageState, saveStorageState } from "../lib/projectRepository";
import { getPlanningRuleById } from "../lib/planningRules";
import type { ProjectRecord } from "../types/project";

const projectId = "planning-decisions-project";
const proposalId = "22222222-2222-4222-8222-000000000001";
const projectRuleSourceId = "11111111-1111-4111-8111-000000000001";
const readinessSourceId = "11111111-1111-4111-8111-000000000002";
const timestamp = "2026-08-14T12:00:00.000Z";

function planningProject(ruleId = "pp.canvas.yamlplanning.confirmation"): ProjectRecord {
  const rule = getPlanningRuleById(ruleId);
  if (!rule) throw new Error("Missing planning rule fixture.");
  const sources: PlanningSourceReference[] = [
    {
      sourceId: projectRuleSourceId,
      sourceType: "projectRule",
      locator: `planning-rule:${rule.ruleId}`,
      label: rule.title,
      authority: "approved",
      availability: "current",
      version: rule.ruleVersion
    },
    {
      sourceId: readinessSourceId,
      sourceType: "readinessPrerequisite",
      locator: `phase-gate:${rule.target.targetKey}`,
      label: rule.title,
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
    fingerprint: "c".repeat(64),
    target: { ...rule.target },
    category: "clarification",
    status: "Needs Clarification",
    value: { kind: "clarification", question: rule.question },
    title: rule.title,
    recommendation: "Capture the approved YAML planning responsibilities.",
    rationale: rule.rationale,
    consequence: rule.consequence,
    sourceIds: [projectRuleSourceId, readinessSourceId],
    uncertainty: rule.uncertainty,
    restriction: rule.restriction,
    createdAt: timestamp,
    updatedAt: timestamp,
    readinessRequirementIds: [rule.target.targetKey],
    applicableProjectTypes: ["powerAppsCanvas"],
    applicableDomains: [rule.target.domain]
  };
  const planning: ProjectPlanningState = {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources,
    proposals: [proposal],
    decisions: [],
    dependencies: [],
    conflicts: []
  };
  return {
    ...createProject({
      identity: { id: projectId, projectName: "Planning Decisions Project" },
      intake: { appType: "powerAppsCanvas", appPurpose: "Plan a controlled Canvas application." },
      now: timestamp
    }),
    planning
  };
}

describe("App - planning decisions", () => {
  it("runs the live Revise, read-only review, separate Confirm, and durable repository flow", async () => {
    const user = userEvent.setup();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const inputProject = planningProject();
    saveStorageState({
      version: 6,
      activeProjectId: inputProject.identity.id,
      projects: [inputProject]
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));
    expect(screen.getByRole("heading", { level: 1, name: "Architecture Planning" })).toBeInTheDocument();
    expect(screen.queryByText(/Saving is currently unavailable/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Solution owner");
    await user.type(screen.getByRole("textbox", { name: /Validation responsibility/ }), "Technical reviewer");
    await user.type(screen.getByRole("textbox", { name: /Application location/ }), "Approved Canvas app");
    await user.type(screen.getByRole("textbox", { name: /Parent relationship/ }), "Approved parent relationship");
    await waitFor(() => expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(true));
    await user.click(screen.getByRole("button", { name: "Save answer for review" }));

    const savedFeedback = await screen.findByText("Planning answer saved for review.");
    expect(savedFeedback).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Answer for review" })).toBeInTheDocument();
    expect(screen.getByText("Solution owner")).toBeInTheDocument();
    await waitFor(() => expect(remove.mock.calls.some(([type]) => type === "beforeunload")).toBe(true));
    const revisedPlanning = loadStorageState().projects[0]?.planning;
    expect(revisedPlanning?.proposals[0]).toMatchObject({
      proposalId,
      status: "Revised",
      value: {
        kind: "structuredRecord",
        value: { installationResponsibility: { kind: "text", value: "Solution owner" } }
      }
    });
    expect(revisedPlanning?.decisions).toHaveLength(1);
    expect(revisedPlanning?.decisions[0]).toMatchObject({ proposalId, action: "revise", resultingStatus: "Revised" });
    expect(screen.queryByRole("button", { name: "Answer question" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm decision" })).not.toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Edit answer" }));
    const editField = screen.getByRole("textbox", { name: /Installation responsibility/ });
    expect(editField).toHaveValue("Solution owner");
    expect(screen.getByRole("button", { name: "Refresh planning" })).toBeEnabled();
    expect(loadStorageState().projects[0]?.planning?.decisions).toHaveLength(1);
    const untouchedEditUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(untouchedEditUnload);
    expect(untouchedEditUnload.defaultPrevented).toBe(false);
    await user.clear(editField);
    await user.type(editField, "Temporary owner");
    expect(screen.getByRole("button", { name: "Refresh planning" })).toBeDisabled();
    await user.clear(editField);
    await user.type(editField, "Solution owner");
    expect(screen.getByRole("button", { name: "Refresh planning" })).toBeEnabled();
    await user.clear(editField);
    await user.type(editField, "Updated solution owner");
    const changedEditUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(changedEditUnload);
    expect(changedEditUnload.defaultPrevented).toBe(true);
    await user.click(screen.getByRole("button", { name: "Save updated answer for review" }));

    await screen.findByText("Planning answer saved for review.");
    expect(loadStorageState().projects[0]?.planning?.decisions.map(({ action }) => action))
      .toEqual(["revise", "reopen", "revise"]);
    expect(screen.getByText("Updated solution owner")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm decision" }));

    expect(await screen.findByText("Planning decision confirmed.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirmed answer" })).toBeInTheDocument();
    expect(screen.getByText("Updated solution owner")).toBeInTheDocument();
    const confirmedPlanning = loadStorageState().projects[0]?.planning;
    expect(confirmedPlanning?.proposals[0]).toMatchObject({
      proposalId,
      status: "Confirmed"
    });
    expect(confirmedPlanning?.decisions).toHaveLength(4);
    expect(confirmedPlanning?.decisions.map(({ action }) => action)).toEqual(["revise", "reopen", "revise", "confirm"]);
    expect(screen.queryByRole("form", { name: "Answer question" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Change answer" }));
    const changeField = screen.getByRole("textbox", { name: /Installation responsibility/ });
    await user.clear(changeField);
    await user.type(changeField, "Changed confirmed owner");
    await user.click(screen.getByRole("button", { name: "Save changed answer for review" }));
    await screen.findByText("Changed confirmed owner");
    expect(loadStorageState().projects[0]?.planning?.decisions.map(({ action }) => action))
      .toEqual(["revise", "reopen", "revise", "confirm", "revise"]);
    expect(screen.getByRole("button", { name: "Confirm decision" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm decision" }));
    expect(await screen.findByRole("heading", { name: "Confirmed answer" })).toBeInTheDocument();
    expect(loadStorageState().projects[0]?.planning?.decisions.map(({ action }) => action))
      .toEqual(["revise", "reopen", "revise", "confirm", "revise", "confirm"]);

    await user.click(screen.getByRole("button", { name: "Change answer" }));
    const deferredField = screen.getByRole("textbox", { name: /Installation responsibility/ });
    await user.clear(deferredField);
    await user.type(deferredField, "Deferred answer owner");
    await user.click(screen.getByRole("button", { name: "Save changed answer for review" }));
    await screen.findByText("Deferred answer owner");

    await user.click(screen.getByRole("button", { name: "Defer" }));
    await user.type(screen.getByRole("textbox", { name: "Deferral reason" }), "Waiting for final owner review.");
    await user.click(screen.getByRole("button", { name: "Defer decision" }));
    expect(await screen.findByRole("region", { name: "Deferral reason" }))
      .toHaveTextContent("Waiting for final owner review.");
    expect(screen.getByRole("heading", { name: "Saved answer" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume decision" }));
    expect(await screen.findByRole("heading", { name: "Answer for review" })).toBeInTheDocument();
    expect(screen.getByText("Deferred answer owner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit answer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm decision" })).toBeInTheDocument();
    expect(loadStorageState().projects[0]?.planning?.decisions.map(({ action }) => action))
      .toEqual(["revise", "reopen", "revise", "confirm", "revise", "confirm", "revise", "defer", "reopen"]);
    await user.click(screen.getByRole("button", { name: "Confirm decision" }));
    expect(await screen.findByRole("heading", { name: "Confirmed answer" })).toBeInTheDocument();
    expect(loadStorageState().projects[0]?.planning?.decisions.map(({ action }) => action))
      .toEqual(["revise", "reopen", "revise", "confirm", "revise", "confirm", "revise", "defer", "reopen", "confirm"]);
    expect(screen.queryByRole("button", { name: /apply/i })).not.toBeInTheDocument();
    add.mockRestore();
    remove.mockRestore();
  }, 60000);

  it("runs the real unanswered Deferred resume path without fabricating a saved answer", async () => {
    const user = userEvent.setup();
    const inputProject = planningProject();
    saveStorageState({
      version: 6,
      activeProjectId: inputProject.identity.id,
      projects: [inputProject]
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));
    await user.click(screen.getByRole("button", { name: "Defer" }));
    await user.type(screen.getByRole("textbox", { name: "Deferral reason" }), "Waiting for the first answer.");
    await user.click(screen.getByRole("button", { name: "Defer decision" }));

    expect(await screen.findByRole("region", { name: "Deferral reason" }))
      .toHaveTextContent("Waiting for the first answer.");
    expect(screen.queryByRole("heading", { name: "Saved answer" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume decision" }));

    expect(await screen.findByRole("button", { name: "Answer question" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Saved answer" })).not.toBeInTheDocument();
    const persisted = loadStorageState().projects[0]?.planning;
    expect(persisted?.proposals[0].status).toBe("Needs Clarification");
    expect(persisted?.decisions.map(({ action }) => action)).toEqual(["defer", "reopen"]);
  });

  it("keeps undecided backend answer entry unavailable after Deferred resume", async () => {
    const user = userEvent.setup();
    const inputProject = planningProject("pp.canvas.schema.confirmation");
    saveStorageState({
      version: 6,
      activeProjectId: inputProject.identity.id,
      projects: [inputProject]
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));
    await user.click(screen.getByRole("button", { name: "Defer" }));
    await user.type(screen.getByRole("textbox", { name: "Deferral reason" }), "Waiting for backend schema approval.");
    await user.click(screen.getByRole("button", { name: "Defer decision" }));
    await user.click(await screen.findByRole("button", { name: "Resume decision" }));

    expect(await screen.findByText(
      "Confirm a single backend/data-source type before answering this question."
    )).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Answer question" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /answer/i })).not.toBeInTheDocument();
    const persisted = loadStorageState().projects[0]?.planning;
    expect(persisted?.proposals[0].status).toBe("Needs Clarification");
    expect(persisted?.decisions.map(({ action }) => action)).toEqual(["defer", "reopen"]);
  });

  it("persists and confirms a SharePoint List backend answer through the real App flow", async () => {
    const user = userEvent.setup();
    const inputProject = planningProject("pp.canvas.schema.confirmation");
    inputProject.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    inputProject.powerPlatform!.canvas!.selectedDataSourceTypes = [];
    saveStorageState({
      version: 6,
      activeProjectId: inputProject.identity.id,
      projects: [inputProject]
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));
    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.click(screen.getByRole("button", { name: /Add item to Data sources/ }));
    await user.type(screen.getByRole("textbox", { name: /Data source name/ }), "Projects");
    await user.type(screen.getByRole("textbox", { name: /^Purpose/ }), "Track delivery");
    await user.type(screen.getByRole("textbox", { name: /Expected record volume/ }), "Up to 10,000 records");
    await user.type(screen.getByRole("textbox", { name: /Ownership/ }), "Operations");
    await user.type(screen.getByRole("textbox", { name: /^Relationships/ }), "Projects link to assignments.");
    await user.type(screen.getByRole("textbox", { name: /Schema confirmation source/ }), "Approved solution design");
    await user.click(screen.getByRole("button", { name: "Save answer for review" }));

    expect(await screen.findByRole("heading", { name: "Answer for review" })).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    const revised = loadStorageState().projects[0]?.planning;
    expect(loadStorageState().projects[0]?.powerPlatform?.canvas?.selectedDataSourceTypes).toEqual([]);
    expect(revised?.decisions.map(({ action }) => action)).toEqual(["revise"]);
    expect(revised?.decisions[0]).not.toHaveProperty("answerSchemaContext");
    expect(revised?.proposals[0].value).toMatchObject({
      kind: "structuredRecord",
      value: {
        relationships: { kind: "text", value: "Projects link to assignments." },
        confirmationSource: { kind: "text", value: "Approved solution design" }
      }
    });

    await user.click(screen.getByRole("button", { name: "Confirm decision" }));
    expect(await screen.findByRole("heading", { name: "Confirmed answer" })).toBeInTheDocument();
    expect(loadStorageState().projects[0]?.planning?.decisions.map(({ action }) => action))
      .toEqual(["revise", "confirm"]);
    expect(screen.queryByRole("button", { name: /apply/i })).not.toBeInTheDocument();
  });

  it("keeps App limited to hook-to-PlanningView wiring with separate persistence warning presentation", () => {
    const sourceText = readFileSync("src/app/App.tsx", "utf8");

    expect(sourceText).toContain("submitPlanningClarificationDecision,");
    expect(sourceText).toContain("onSubmitClarificationDecision={submitPlanningClarificationDecision}");
    expect(sourceText).toContain("onAnswerDraftMeaningfulChange={handlePlanningAnswerDraftMeaningfulChange}");
    expect(sourceText).toContain("useCallback((proposalId: string, meaningful: boolean)");
    expect(sourceText).toMatch(/persistenceWarning[\s\S]*className="persistence-warning"/);
    expect(sourceText).not.toMatch(/useState[^\n]*(answerDraft|reasonDraft|submittingProposal|decisionFeedback)/);
    expect(sourceText).not.toMatch(/setMeaningfulPlanningAnswerDrafts[^\n]*(draft|answerSchema|ruleId|source)/);
  });
});
