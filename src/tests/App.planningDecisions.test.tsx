// @ts-expect-error -- Vitest runs static App wiring assertions in Node; app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
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
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import type { ProjectRecord } from "../types/project";

const projectId = "planning-decisions-project";
const proposalId = "22222222-2222-4222-8222-000000000001";
const projectRuleSourceId = "11111111-1111-4111-8111-000000000001";
const readinessSourceId = "11111111-1111-4111-8111-000000000002";
const timestamp = "2026-08-14T12:00:00.000Z";

function planningProject(): ProjectRecord {
  const rule = getPlanningRuleById("pp.canvas.schema.confirmation");
  if (!rule) throw new Error("Missing schema clarification rule fixture.");
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
    recommendation: "Ask for authoritative schema clarification.",
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
  it("wires a rendered clarification decision through the integrated hook and durable repository", async () => {
    const user = userEvent.setup();
    const inputProject = planningProject();
    saveStorageState({
      version: CURRENT_STORAGE_VERSION,
      activeProjectId: inputProject.identity.id,
      projects: [inputProject]
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));
    expect(screen.getByRole("heading", { level: 1, name: "Architecture Planning" })).toBeInTheDocument();
    expect(screen.queryByText(/Saving is currently unavailable/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Defer" }));
    await user.type(screen.getByRole("textbox", { name: "Deferral reason" }), "Awaiting the authoritative schema.");
    await user.click(screen.getByRole("button", { name: "Defer decision" }));

    expect(await screen.findByText("Planning item deferred.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deferred or not needed" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Questions to answer" })).not.toBeInTheDocument();
    const storedProposal = loadStorageState().projects[0]?.planning?.proposals[0];
    expect(storedProposal).toMatchObject({ proposalId, status: "Deferred" });
    expect(screen.queryByRole("button", { name: /apply/i })).not.toBeInTheDocument();
  }, 30000);

  it("keeps App limited to hook-to-PlanningView wiring with separate persistence warning presentation", () => {
    const sourceText = readFileSync("src/app/App.tsx", "utf8");

    expect(sourceText).toContain("submitPlanningClarificationDecision,");
    expect(sourceText).toContain("onSubmitClarificationDecision={submitPlanningClarificationDecision}");
    expect(sourceText).toMatch(/persistenceWarning[\s\S]*className="persistence-warning"/);
    expect(sourceText).not.toMatch(/useState[^\n]*(answerDraft|reasonDraft|submittingProposal|decisionFeedback)/);
  });
});
