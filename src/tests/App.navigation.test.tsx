/* eslint-disable @typescript-eslint/no-unused-vars -- shared App UI test import block keeps split suites mechanically aligned */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
// @ts-expect-error -- Vitest runs this metadata assertion in Node; the app tsconfig intentionally excludes Node ambient types.
import { existsSync, readFileSync } from "node:fs";
// @ts-expect-error -- Vitest runs this metadata assertion in Node; the app tsconfig intentionally excludes Node ambient types.
import { resolve } from "node:path";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { App } from "../app/App";
import { createSeedProject } from "../data/seedProject";
import { PowerPlatformIntake } from "../components/IntakeBuilder/PowerPlatformIntake";
import { createProject } from "../lib/createProject";
import { countDocumentMissingMarkers, countPackageMissingMarkers } from "../lib/documentReview";
import * as exportProjectPackageModule from "../lib/exportProjectPackage";
import {
  createDefaultDataverseColumn,
  createDefaultDataverseRelationship,
  createDefaultDataverseTable,
  createDefaultSharePointColumn,
  createDefaultSharePointLibrary,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import { STORAGE_KEY, clearPersistenceWarning, loadStorageState, saveStorageState } from "../lib/projectRepository";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById } from "../lib/planningRules";
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import {
  calculateModelDrivenExternalConnectorSelectionGate,
  calculateModelDrivenSecurityArchitectureGate
} from "../lib/powerPlatform";
import { evaluatePhaseGate } from "../lib/phaseGates";
import type { ProjectRecord } from "../types/project";
import { createDraftGeneratedProject, createGeneratedProject } from "./helpers/generatedProject";
import { createReadyPreviewProject, seedApp } from "./helpers/appTestHelpers";

declare const process: { cwd(): string };

function planningAnswerProject(): ProjectRecord {
  const projectId = "app-navigation-answer-project";
  const rule = getPlanningRuleById("pp.canvas.yamlplanning.confirmation");
  if (!rule) throw new Error("Missing YAML planning rule fixture.");
  const projectRuleSourceId = "11111111-1111-4111-8111-000000000101";
  const readinessSourceId = "11111111-1111-4111-8111-000000000102";
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
    proposalId: "22222222-2222-4222-8222-000000000101",
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    fingerprint: "d".repeat(64),
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
    createdAt: "2026-08-22T12:00:00.000Z",
    updatedAt: "2026-08-22T12:00:00.000Z",
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
      identity: { id: projectId, projectName: "Navigation Answer Project" },
      intake: { appType: "powerAppsCanvas", appPurpose: "Validate guarded planning navigation." },
      now: "2026-08-22T12:00:00.000Z"
    }),
    planning
  };
}

function seedPlanningAnswerApp() {
  const project = planningAnswerProject();
  saveStorageState({
    version: CURRENT_STORAGE_VERSION,
    activeProjectId: project.identity.id,
    projects: [project]
  });
}

describe("App - navigation", () => {
  it("renders the Project Builder Ai navigation logo without the obsolete text brand or mark", () => {
    seedApp();
    render(<App />);

    const logo = screen.getByRole("img", { name: "Project Builder Ai" });
    expect(logo).toHaveAttribute("src", "/branding/project-builder-ai-horizontal.png");
    expect(screen.queryByText("GPT Project Builder")).not.toBeInTheDocument();
    expect(screen.queryByText("</>")).not.toBeInTheDocument();
  });

  it("uses Project Builder Ai browser metadata and favicon asset references", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

    expect(html).toContain("<title>Project Builder Ai</title>");
    expect(html).toContain("Project Builder Ai turns rough app ideas into structured project plans");
    expect(html).toContain('href="/favicon-16x16.png"');
    expect(html).toContain('href="/favicon-32x32.png"');
    expect(html).toContain('href="/favicon-48x48.png"');
    expect(html).toContain('href="/apple-touch-icon.png"');
  });

  it("keeps required brand and favicon files available to the app", () => {
    const requiredAssets = [
      "public/branding/project-builder-ai-horizontal.png",
      "public/branding/project-builder-ai-stacked.png",
      "public/branding/project-builder-ai-icon.png",
      "public/favicon-16x16.png",
      "public/favicon-32x32.png",
      "public/favicon-48x48.png",
      "public/apple-touch-icon.png",
      "public/icon-192.png",
      "public/icon-512.png"
    ];

    for (const assetPath of requiredAssets) {
      expect(existsSync(resolve(process.cwd(), assetPath))).toBe(true);
    }
  });

  it("moves focus to the main landmark from the skip link", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Skip to main content" }));

    expect(screen.getByRole("main")).toHaveFocus();
  }, 20000);

  it("places Planning between Guided Intake and Scope Review", () => {
    seedApp();
    render(<App />);

    const labels = within(screen.getByRole("navigation")).getAllByRole("button")
      .map((button) => button.textContent?.trim());
    expect(labels).toEqual([
      "Mission Control",
      "Guided Intake",
      "Planning",
      "Scope Review",
      "Documents",
      "Export"
    ]);
  });

  it("opens Architecture Planning for an active project and focuses its main content", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));

    expect(screen.getByRole("heading", { level: 1, name: "Architecture Planning" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("guards Planning-to-Dashboard navigation and preserves the draft when discard is declined", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    seedPlanningAnswerApp();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Planning" }));
    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Preserve navigation draft");

    await user.click(screen.getByRole("button", { name: "Mission Control" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Discard unsaved planning answer"));
    expect(screen.getByRole("heading", { name: "Architecture Planning" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Installation responsibility/ })).toHaveValue("Preserve navigation draft");
    confirm.mockRestore();
  });

  it("discards once after confirmation and guards a separate Planning-to-Intake path", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    seedPlanningAnswerApp();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Planning" }));
    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Discard navigation draft");

    await user.click(screen.getByRole("button", { name: "Guided Intake" }));
    expect(screen.getByRole("heading", { name: "Architecture Planning" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guided Intake" }));

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("heading", { name: "Set the project foundation" })).toBeInTheDocument();
    expect(screen.queryByText("Discard navigation draft")).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it("guards New project and creates it only after confirmed discard", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    seedPlanningAnswerApp();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Planning" }));
    await user.click(screen.getByRole("button", { name: "Answer question" }));
    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Guard new project draft");

    await user.click(screen.getAllByRole("button", { name: "New project" })[0]);
    expect(screen.getByRole("heading", { name: "Architecture Planning" })).toBeInTheDocument();
    expect(loadStorageState().projects).toHaveLength(1);

    await user.click(screen.getAllByRole("button", { name: "New project" })[0]);
    expect(screen.getByRole("heading", { name: "Set the project foundation" })).toBeInTheDocument();
    expect(loadStorageState().projects).toHaveLength(2);
    confirm.mockRestore();
  });

  it("registers beforeunload only for a meaningful draft and removes it after discard", async () => {
    const user = userEvent.setup();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    seedPlanningAnswerApp();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Planning" }));
    await user.click(screen.getByRole("button", { name: "Answer question" }));
    expect(add.mock.calls.filter(([type]) => type === "beforeunload")).toHaveLength(0);

    await user.type(screen.getByRole("textbox", { name: /Installation responsibility/ }), "Unload guard draft");
    await waitFor(() => expect(add.mock.calls.some(([type]) => type === "beforeunload")).toBe(true));
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(remove.mock.calls.some(([type]) => type === "beforeunload")).toBe(true));
    confirm.mockRestore();
    add.mockRestore();
    remove.mockRestore();
  });

  it("keeps no-project Planning navigation on Mission Control without persisting a project", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));

    expect(screen.getByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Architecture Planning" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("opens the next incomplete stage when continuing intake", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Continue intake/i }));
    expect(screen.getByRole("heading", { name: "Generate the handoff package" })).toBeInTheDocument();
  });

  it("opens a selected intake stage from Mission Control", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Users: 100% complete/i }));

    expect(screen.getByRole("heading", { name: "Define users and roles" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Target users/i)).toHaveValue(
      "Residents\nProgram coordinators\nDepartment reviewers"
    );
  });

  it("requires a project type and shows website-specific questions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Create New Project" }));
    const projectType = screen.getByRole("combobox", { name: /Project type/i });
    expect(projectType).toBeRequired();
    await user.selectOptions(projectType, "businessWebsite");

    expect(screen.getByText("Use this for service business websites, local business sites, brochure sites, and marketing pages.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Domain status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hosting status/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Game genre/i)).not.toBeInTheDocument();
  });

  it("shows game-specific questions only for the game preset", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Create New Project" }));
    await user.selectOptions(screen.getByRole("combobox", { name: /Project type/i }), "game");

    expect(screen.getByText("Use this for projects with a gameplay loop, controls, progression, art, audio, levels, or scoring.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Game genre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target devices/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Domain status/i)).not.toBeInTheDocument();
  });

  it("shows first-run guidance and prevents blank project routes", async () => {
    const user = userEvent.setup();
    render(<App />);

    const logos = screen.getAllByRole("img", { name: "Project Builder Ai" });
    expect(logos.some((logo) => logo.getAttribute("src") === "/branding/project-builder-ai-stacked.png")).toBe(true);
    expect(logos.find((logo) => logo.getAttribute("src") === "/branding/project-builder-ai-stacked.png")).toHaveAttribute(
      "src",
      "/branding/project-builder-ai-stacked.png"
    );
    expect(screen.getByText("AI-guided project architecture and developer handoff")).toBeInTheDocument();
    expect(screen.getByText(/Project Builder Ai creates structured project plans/)).toBeInTheDocument();
    expect(screen.getByText(/does not embed an AI model/)).toBeInTheDocument();
    expect(screen.queryByText(/built-in AI assistant/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Turn a rough project idea into a clear Codex handoff" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What it creates" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What it does not create" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create New Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Example Workflow" })).toBeInTheDocument();
    expect(screen.getByText("Choose type")).toBeInTheDocument();
    expect(screen.getByText("Review missing")).toBeInTheDocument();
    expect(screen.getByText("Review Codex output with GPT Architect")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guided Intake" }));
    expect(screen.getByRole("heading", { name: "Turn a rough project idea into a clear Codex handoff" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create New Project" }));
    expect(screen.getByRole("heading", { name: "Set the project foundation" })).toBeInTheDocument();
  });

  it("opens and closes the read-only example without creating a project", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "View Example Workflow" }));

    expect(screen.getByRole("heading", { name: "Sample Local Business Website" })).toBeInTheDocument();
    expect(screen.getByText("Business website")).toBeInTheDocument();
    expect(screen.getByText("Customers, Owner, Administrator")).toBeInTheDocument();
    expect(screen.getByText(/Service and contact pages, Brand guide, SEO notes, Phased Codex prompts/)).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Close example" }));
    expect(screen.queryByRole("heading", { name: "Sample Local Business Website" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("bypasses onboarding for existing projects and explains readiness states", () => {
    const readyProject = createGeneratedProject();
    seedApp([readyProject]);
    render(<App />);

    expect(screen.queryByRole("heading", { name: "Turn a rough project idea into a clear Codex handoff" })).not.toBeInTheDocument();
    expect(screen.getByText("Ready for Codex:").closest("p")).toHaveTextContent(
      "Ready for Codex: Scope, client review, and the readiness checklist are complete."
    );
  });

  it("explains Draft and Client Questions Pending for generated packages with blockers", () => {
    const draftProject = createDraftGeneratedProject(createProject({
      identity: { id: "draft-status-help", projectName: "Draft Status Help" }
    }));
    seedApp([draftProject]);
    render(<App />);

    expect(screen.getByText("Draft:").closest("p")).toHaveTextContent(
      "Draft: The package can be reviewed, but required information is still missing."
    );
    expect(screen.getByText("Client Questions Pending:").closest("p")).toHaveTextContent(
      "Client Questions Pending: Some client questions still need answers before the project can be Ready for Codex."
    );
  });
});
