/* eslint-disable @typescript-eslint/no-unused-vars -- shared App UI test import block keeps split suites mechanically aligned */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
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
import { STORAGE_KEY, clearPersistenceWarning } from "../lib/projectRepository";
import {
  calculateModelDrivenExternalConnectorSelectionGate,
  calculateModelDrivenSecurityArchitectureGate
} from "../lib/powerPlatform";
import { evaluatePhaseGate } from "../lib/phaseGates";
import type { ProjectRecord } from "../types/project";
import { createDraftGeneratedProject, createGeneratedProject } from "./helpers/generatedProject";
import { createReadyPreviewProject, seedApp } from "./helpers/appTestHelpers";

describe("App - navigation", () => {
  it("moves focus to the main landmark from the skip link", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Skip to main content" }));

    expect(screen.getByRole("main")).toHaveFocus();
  }, 20000);

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
