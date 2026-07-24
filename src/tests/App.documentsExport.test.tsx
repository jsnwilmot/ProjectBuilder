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

describe("App - documents Export", () => {
  it("shows generated documents without injecting HTML", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    expect(screen.getByRole("heading", { name: "Project Package Preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview README.md" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview DATA_MODEL.md" }));
    expect(screen.getByRole("heading", { name: "DATA_MODEL.md" })).toBeInTheDocument();
    expect(screen.getAllByText(/\[MISSING: data sources\]/).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole("button", { name: "Back to document list" }));
    await user.type(screen.getByRole("textbox", { name: "Search documents" }), "does-not-exist");
    expect(screen.getByRole("heading", { name: "No matching documents" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("button", { name: "Preview DATA_MODEL.md" })).toBeInTheDocument();
  });

  it("reads generated documents from the active project", async () => {
    const volunteerProject = createProject({
      identity: { id: "volunteer-management-app", projectName: "Volunteer Management App" },
      client: { clientName: "Volunteer Services" },
      intake: { appPurpose: "Coordinate volunteer applications." }
    });
    seedApp([createSeedProject(), volunteerProject]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    expect(screen.getByRole("heading", { name: "Project Package Preview" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview README.md" }));
    expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument();
    expect(screen.getByText(/Community Services Portal/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mission Control" }));
    await user.click(screen.getByRole("button", { name: "Open Volunteer Management App" }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    await user.click(screen.getByRole("button", { name: "Preview README.md" }));
    expect(screen.getByText(/Volunteer Management App/)).toBeInTheDocument();
  });

  it("reviews all 19 generated documents with purposes, marker counts, preview, and copy actions", async () => {
    const project = createDraftGeneratedProject(createProject({
      identity: { id: "document-review-ui", projectName: "Document Review UI" },
      intake: { appType: "businessWebsite" }
    }));
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));

    expect(screen.getByRole("heading", { name: "Project Package Preview" })).toBeInTheDocument();
    const reviewRegion = screen.getByRole("region", { name: "Generated document review" });
    expect(within(reviewRegion).getAllByRole("listitem")).toHaveLength(19);
    expect(screen.getByText("Defines approved scope, boundaries, assumptions, and success criteria.")).toBeInTheDocument();

    const scopeDocument = project.generatedDocuments.find((document) => document.fileName === "PROJECT_SCOPE.md")!;
    const scopeRow = screen.getByRole("button", { name: "Preview PROJECT_SCOPE.md" }).closest("article")!;
    expect(scopeRow).toHaveTextContent("00_Project_Overview");
    expect(scopeRow).toHaveTextContent(`${countDocumentMissingMarkers(scopeDocument.content)} missing marker`);

    const summary = screen.getByRole("region", { name: "Package summary" });
    expect(within(summary).getByText("Documents").closest("div")).toHaveTextContent("19/19");
    expect(within(summary).getByText("Missing markers").closest("div")).toHaveTextContent(
      String(countPackageMissingMarkers(project.generatedDocuments))
    );
    expect(within(summary).getByText("Package status").closest("div")).toHaveTextContent("Draft");
    expect(within(summary).getByText("Final readiness").closest("div")).toHaveTextContent("Not ready");
    expect(within(summary).getByText(/Missing information remains/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preview PROJECT_SCOPE.md" }));
    expect(screen.getByRole("heading", { name: "PROJECT_SCOPE.md" })).toBeInTheDocument();
    expect(screen.getByText(/# Project Scope/)).toHaveTextContent("Document Review UI");
    await user.click(screen.getByRole("button", { name: "Copy document" }));
    expect(await navigator.clipboard.readText()).toBe(scopeDocument.content);
    expect(screen.getByText("PROJECT_SCOPE.md copied.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to document list" }));

    await user.click(screen.getByRole("button", { name: "Quick copy ARCHITECT_INSTRUCTIONS.md" }));
    expect(await navigator.clipboard.readText()).toContain("# Architect Instructions");
    expect(screen.getByText("ARCHITECT_INSTRUCTIONS.md copied.")).toBeInTheDocument();
  });

  it("shows zero readiness blockers for a Ready for Codex package preview", async () => {
    seedApp([createReadyPreviewProject()]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));

    const summary = screen.getByRole("region", { name: "Package summary" });
    expect(within(summary).getByText("Package status").closest("div")).toHaveTextContent("Ready for Codex");
    expect(within(summary).getByText("Ready for Codex blockers").closest("div")).toHaveTextContent("0");
    expect(within(summary).getByText("Readiness checklist").closest("div")).toHaveTextContent("13/13");
    expect(within(summary).getByText("Final readiness").closest("div")).toHaveTextContent("Ready");
  });

  it("shows marker trace sources and routes Edit source to the expected intake stage", async () => {
    const project = createProject({
      identity: { id: "trace-preview", projectName: "" },
      client: { clientName: "Trace Client" },
      intake: { appPurpose: "Trace generated markers." }
    });
    project.generatedDocuments = [
      {
        fileName: "README.md",
        folder: "00_Project_Overview",
        content: [
          "# README",
          "",
          "[MISSING: app name]",
          "[MISSING: unknown package detail]",
          "[MISSING: unknown package detail]"
        ].join("\n")
      }
    ];
    project.generatedFileCount = 1;
    seedApp([project]);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));
    await user.click(screen.getByRole("button", { name: "Preview README.md" }));

    expect(screen.getByRole("heading", { name: "Missing marker sources" })).toBeInTheDocument();
    expect(screen.getByText("[MISSING: app name]")).toBeInTheDocument();
    expect(screen.getByText("Foundation / Project identity / App name")).toBeInTheDocument();
    expect(screen.getByText("project.identity.projectName")).toBeInTheDocument();
    expect(screen.getAllByText("Orphan marker")).toHaveLength(2);

    const appNameTrace = screen.getByText("[MISSING: app name]").closest("article")!;
    await user.click(within(appNameTrace).getByRole("button", { name: "Edit source" }));
    expect(await screen.findByRole("heading", { name: "Set the project foundation" })).toBeInTheDocument();
    expect(document.activeElement).toHaveAttribute("id", "main-content");
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("Encountered two children with the same key"));
    consoleError.mockRestore();
  });

  it("keeps the Ready preview fixture free of generated missing markers", () => {
    const project = createReadyPreviewProject();
    expect(countPackageMissingMarkers(project.generatedDocuments)).toBe(0);
  });

  it("uses the clipboard selection fallback for document review copy actions", async () => {
    const project = createGeneratedProject();
    seedApp([project]);
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));
    await user.click(screen.getByRole("button", { name: "Copy README.md" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("README.md copied.")).toBeInTheDocument();
  });

  it("blocks export before generation and reports readiness after generation", async () => {
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));

    expect(screen.getByText("Cannot export yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate project package first" })).toBeInTheDocument();
    expect(screen.getByText("0/19")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate project package first" }));
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));

    expect(screen.getByText(/Warnings present|Ready to export/)).toBeInTheDocument();
    expect(screen.getByText("19/19")).toBeInTheDocument();
    expect(screen.getByText("No export errors.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Use This Project Package" })).toBeInTheDocument();
  });

  it("downloads a verified package and reports success", async () => {
    seedApp([createGeneratedProject()]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    expect(screen.getByRole("button", { name: /Download verified package/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Download verified package/ }));

    expect(await screen.findByText("Export complete")).toBeInTheDocument();
    expect(screen.getByText(/Package downloaded successfully\./)).toBeInTheDocument();
  });

  it("shows a friendly error message when building the archive fails", async () => {
    seedApp([createGeneratedProject()]);
    const user = userEvent.setup();
    vi.spyOn(exportProjectPackageModule, "createProjectArchive").mockRejectedValue(
      new Error("The archive service is temporarily unavailable.")
    );
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: /Download verified package/ }));

    expect(await screen.findByText("Export failed")).toBeInTheDocument();
    expect(screen.getByText(/The archive service is temporarily unavailable\./)).toBeInTheDocument();
  });

  it("falls back to a generic error message when a non-Error value is thrown during export", async () => {
    seedApp([createGeneratedProject()]);
    const user = userEvent.setup();
    vi.spyOn(exportProjectPackageModule, "createProjectArchive").mockRejectedValue("boom");
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: /Download verified package/ }));

    expect(await screen.findByText("Export failed")).toBeInTheDocument();
    expect(screen.getByText(/The project archive could not be created\./)).toBeInTheDocument();
  });

  it("shows the underlying error message when copying a handoff document fails unexpectedly", async () => {
    seedApp([createGeneratedProject()]);
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: "Copy Architect Instructions" }));

    // document.execCommand is not implemented in jsdom by default (and is not
    // stubbed in this test), so the copy-selection fallback itself throws,
    // exercising ExportPanel's own catch-and-report path rather than the
    // "selected" fallback message.
    expect(await screen.findByText(/execCommand/)).toBeInTheDocument();
  });
});
