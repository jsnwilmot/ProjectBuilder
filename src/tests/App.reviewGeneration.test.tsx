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

describe("App - review Generation", () => {
  it("shows missing information in the review stage", async () => {
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    await user.click(screen.getByRole("button", { name: "Scope Review" }));

    expect(screen.getByRole("heading", { name: "Review project readiness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scope Review" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("[MISSING: app purpose]")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Missing Information Review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Client Questions Review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ready for Codex checklist" })).toBeInTheDocument();
  });

  it("records not-applicable reasons and copies grouped client questions", async () => {
    const project = createProject({
      identity: { id: "client-review-ui", projectName: "Client Review UI" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));
    const firstStatus = screen.getAllByRole("combobox", { name: "Status" })[0];
    await user.selectOptions(firstStatus, "Not applicable");
    const reason = screen.getByLabelText(/Why this is not applicable/i);
    expect(reason).toHaveAttribute("aria-invalid", "true");
    await user.type(reason, "Confirmed outside this project.");
    expect(reason).toHaveValue("Confirmed outside this project.");

    await user.click(screen.getByRole("button", { name: "Copy all questions" }));
    expect(await navigator.clipboard.readText()).toContain("Foundation");
    expect(screen.getByText("Client questions copied.")).toBeInTheDocument();
  });

  it("shows readiness counts in the generate stage and allows generation", async () => {
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(screen.getByRole("button", { name: "Export" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/Readiness blockers:/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What happens after generation?" })).toBeInTheDocument();
    expect(screen.getByText("Complete the Ready for Codex checklist.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    expect(screen.getByRole("heading", { name: "Project Package Preview" })).toBeInTheDocument();
    expect(screen.getByText("19 generated documents")).toBeInTheDocument();
  });

  it("does not lose intake data when switching stages", async () => {
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    await user.type(screen.getByLabelText(/App name/i), "Stage Persistence App");

    await user.click(screen.getByRole("button", { name: "Continue to users" }));
    expect(screen.getByRole("heading", { name: "Define users and roles" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByLabelText(/App name/i)).toHaveValue("Stage Persistence App");
  });

  it("copies active-project Architect instructions after generation", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: "Copy Architect Instructions" }));

    const copiedText = await navigator.clipboard.readText();
    expect(copiedText).toContain("# Architect Instructions");
    expect(copiedText).toContain("Community Services Portal");
    expect(screen.getByText("Architect Instructions copied.")).toBeInTheDocument();
  });

  it("uses the selection fallback when clipboard permission is denied", async () => {
    seedApp();
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: "Copy Architect Instructions" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("Architect Instructions copied.")).toBeInTheDocument();
  });

  it("uses the selection fallback when client question clipboard access is denied", async () => {
    const project = createProject({
      identity: { id: "client-copy-fallback", projectName: "Client Copy Fallback" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));
    await user.click(screen.getByRole("button", { name: "Copy all questions" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("Client questions copied.")).toBeInTheDocument();
  });

  it("leaves client questions selected when browser copy commands are unavailable", async () => {
    const project = createProject({
      identity: { id: "client-selection-fallback", projectName: "Client Selection Fallback" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false)
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));
    await user.click(screen.getByRole("button", { name: "Copy all questions" }));

    expect(screen.getByText("Client questions selected. Press Ctrl+C to copy.")).toBeInTheDocument();
    expect(screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Selected text ready to copy"
    }).value).toContain("Foundation");

    await user.click(screen.getByRole("heading", { name: "Client Questions Review" }));
    expect(screen.queryByRole("textbox", { name: "Selected text ready to copy" })).not.toBeInTheDocument();
  });
});
