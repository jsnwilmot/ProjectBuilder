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

describe("App - project Management", () => {
  it("creates and switches persisted projects without replacing existing records", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    expect(screen.getByRole("heading", { name: "Set the project foundation" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/App name/i), "Second Project");
    await user.click(screen.getByRole("button", { name: "Mission Control" }));

    expect(screen.getByRole("heading", { name: "Second Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Community Services Portal" })).toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as {
      activeProjectId: string;
      projects: Array<{ identity: { id: string; projectName: string } }>;
    };
    expect(stored.projects).toHaveLength(2);
    expect(stored.projects.some((project) => project.identity.projectName === "Community Services Portal")).toBe(true);
    expect(stored.projects.find((project) => project.identity.id === stored.activeProjectId)?.identity.projectName).toBe("Second Project");

    await user.click(screen.getByRole("button", { name: "Open Community Services Portal" }));
    expect(screen.getByRole("heading", { name: "Community Services Portal" })).toBeInTheDocument();
  });

  it("duplicates, archives, views, and restores saved projects from Mission Control", async () => {
    const source = createProject({
      identity: { id: "managed-source", projectName: "Managed Project" },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Managed" }]
    });
    seedApp([source]);
    const user = userEvent.setup();
    render(<App />);

    expect(
      within(screen.getByLabelText("Project counts")).getByText("Active projects").parentElement
    ).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Duplicate Managed Project" }));

    expect(screen.getByText(/Managed Project Copy created/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Managed Project Copy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Managed Project Copy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archive Managed Project Copy" }));
    expect(screen.getByText(/Managed Project Copy archived/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Managed Project Copy" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show archived (1)" }));
    expect(screen.getByRole("button", { name: "Open Managed Project Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore Managed Project Copy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restore Managed Project Copy" }));
    expect(screen.getByText(/Managed Project Copy restored/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive Managed Project Copy" })).toBeInTheDocument();
  });

  it("requires confirmation before deleting active and archived projects", async () => {
    const active = createProject({ identity: { id: "active-delete", projectName: "Active Delete" } });
    const archived = createProject({
      identity: { id: "archived-delete", projectName: "Archived Delete" },
      archivedAt: "2026-07-04T12:00:00.000Z"
    });
    seedApp([active, archived], active.identity.id);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Delete Active Delete" }));
    expect(screen.getByRole("dialog", { name: "Delete Active Delete?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Open Active Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Active Delete" }));
    await user.click(screen.getByRole("button", { name: "Permanently Delete" }));
    expect(screen.queryByRole("button", { name: "Open Active Delete" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show archived (1)" }));
    await user.click(screen.getByRole("button", { name: "Delete Archived Delete" }));
    expect(screen.getByRole("dialog", { name: "Delete Archived Delete?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Open Archived Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Archived Delete" }));
    await user.click(screen.getByRole("button", { name: "Permanently Delete" }));
    expect(screen.queryByRole("button", { name: "Open Archived Delete" })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).projects).toHaveLength(0);
  });

  it("keeps keyboard focus in the delete dialog and closes it with Escape", async () => {
    const project = createProject({
      identity: { id: "keyboard-delete", projectName: "Keyboard Delete" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    const deleteButton = screen.getByRole("button", { name: "Delete Keyboard Delete" });
    await user.click(deleteButton);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Permanently Delete" });
    expect(cancelButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Delete Keyboard Delete?" })).not.toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
  });
});
