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
import * as formulaReviewPanelViewModel from "../lib/recordLifecycleFormulaReviewPanelViewModel";
import type { RecordLifecycleFormulaReviewSummary } from "../lib/recordLifecycleFormulaReviewSummary";
import type { ProjectRecord } from "../types/project";
import { createDraftGeneratedProject, createGeneratedProject } from "./helpers/generatedProject";
import { createReadyPreviewProject, seedApp } from "./helpers/appTestHelpers";
import "../styles/global.css";

function createFormulaReviewPanelSummary(
  overrides: Partial<RecordLifecycleFormulaReviewSummary> = {}
): RecordLifecycleFormulaReviewSummary {
  return {
    reviewState: "Review Required",
    applicable: true,
    formulaIdentity: {
      assetId: "record-lifecycle-power-fx",
      reviewContractVersion: "phase-5b.4d.2.1",
      reviewContractChecksum: "fnv1a-contract",
      formulaContentChecksum: "fnv1a-formula"
    },
    reviewReference: { status: "Not Provided", issues: [] },
    formulaBlockers: [],
    technicalReview: {
      evidenceType: "Technical Review",
      status: "Not Provided",
      recordCount: 0,
      currentCount: 0,
      staleCount: 0,
      invalidCount: 0,
      currentOutcomes: [],
      staleOutcomes: [],
      issues: []
    },
    studioValidation: {
      evidenceType: "Power Apps Studio Validation",
      status: "Not Provided",
      recordCount: 0,
      currentCount: 0,
      staleCount: 0,
      invalidCount: 0,
      currentOutcomes: [],
      staleOutcomes: [],
      issues: []
    },
    history: [],
    collectionIssues: [],
    safetyNotices: [
      "Current formula evidence confirms current binding only. It does not mean Approved.",
      "Technical Review and Power Apps Studio Validation are independent.",
      "Formula evidence does not change project readiness or clear project blockers.",
      "Formula source, copying, export, installation, and deployment are unavailable."
    ],
    ...overrides
  };
}

function getMediaRuleText(conditionText: string): string {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }

    for (const rule of Array.from(rules)) {
      const mediaRule = rule as CSSMediaRule;
      if (mediaRule.conditionText === conditionText && mediaRule.cssRules) {
        return Array.from(mediaRule.cssRules).map((childRule) => childRule.cssText).join("\n");
      }
    }
  }

  return "";
}

function getAllStyleRuleText(): string {
  const rules: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      rules.push(...Array.from(sheet.cssRules).map((rule) => rule.cssText));
    } catch {
      continue;
    }
  }

  return rules.join("\n");
}

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

  it("does not show the formula review panel when the summary is not applicable", async () => {
    const project = createProject({
      identity: { id: "non-applicable-formula-review", projectName: "Non Applicable Formula Review" },
      intake: { appType: "webApplication" },
      now: "2026-07-31T12:00:00.000Z"
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));

    expect(screen.queryByRole("heading", { name: "Lifecycle formula review" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Missing Information Review" })).toBeInTheDocument();
  });

  it("places the formula review panel after readiness and before missing information review", async () => {
    const project = createProject({
      identity: { id: "hosted-formula-review", projectName: "Hosted Formula Review" },
      intake: { appType: "powerAppsCanvas" },
      packageGeneratedAt: "2026-07-30T19:00:00.000Z",
      now: "2026-07-31T12:00:00.000Z"
    });
    seedApp([project]);
    const spy = vi.spyOn(formulaReviewPanelViewModel, "buildRecordLifecycleFormulaReviewPanelViewModel")
      .mockReturnValue(createFormulaReviewPanelSummary());
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));

    const readinessHeading = screen.getByRole("heading", { name: "Draft package" });
    const panelHeading = screen.getByRole("heading", { name: "Lifecycle formula review" });
    const missingHeading = screen.getByRole("heading", { name: "Missing Information Review" });
    expect(readinessHeading.compareDocumentPosition(panelHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(panelHeading.compareDocumentPosition(missingHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(spy.mock.calls.at(-1)?.[0].reviewReference).toBeUndefined();
    expect(spy.mock.calls.at(-1)?.[0].implementationRegistry).toMatchObject({
      generatedAt: "2026-07-30T19:00:00.000Z"
    });
    spy.mockRestore();
  });

  it("scopes full-width sidebar-mode review layout to the confirmed review-stage wrapper", async () => {
    const user = userEvent.setup();
    const styleRules = getAllStyleRuleText();
    const compactRules = getMediaRuleText("(max-width: 860px)");
    const project = createProject({
      identity: { id: "review-layout-root", projectName: "Review Layout Root" },
      intake: { appType: "powerAppsCanvas" },
      now: "2026-07-31T12:00:00.000Z"
    });
    seedApp([project]);
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));

    expect(document.querySelector("main.intake-page")).toHaveClass("review-intake-page");
    expect(styleRules).toMatch(/\.intake-layout\s*\{[^}]*grid-template-columns:\s*224px minmax\(0,\s*840px\);[^}]*justify-content:\s*center;/i);
    expect(styleRules).toMatch(/\.review-intake-page \.intake-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\);[^}]*justify-content:\s*stretch;/i);
    expect(styleRules).toMatch(/\.review-intake-page \.intake-step-list\s*\{[^}]*grid-template-columns:\s*repeat\(8,\s*minmax\(95px,\s*1fr\)\);[^}]*overflow-x:\s*auto;/i);
    expect(styleRules).toMatch(/\.review-intake-page \.intake-form-panel,\s*\.review-intake-page \.generate-stage,\s*\.review-intake-page \.client-review-workflow,\s*\.review-intake-page \.client-review-section\s*\{[^}]*min-width:\s*0;/i);
    expect(compactRules).toMatch(/\.app-shell\s*\{[^}]*display:\s*block;/i);
    expect(compactRules).toMatch(/\.app-navigation\s*\{[^}]*width:\s*100%;/i);
  });

  it("keeps non-review intake stages on the existing intake layout", async () => {
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);

    expect(document.querySelector("main.intake-page")).not.toHaveClass("review-intake-page");
    expect(screen.getByRole("heading", { name: "Set the project foundation" })).toBeInTheDocument();
  });

  it("uses updatedAt as the stable formula registry timestamp when packageGeneratedAt is absent", async () => {
    const project = createProject({
      identity: { id: "updated-at-formula-review", projectName: "Updated At Formula Review" },
      intake: { appType: "powerAppsCanvas" },
      now: "2026-07-31T12:00:00.000Z"
    });
    seedApp([project]);
    const spy = vi.spyOn(formulaReviewPanelViewModel, "buildRecordLifecycleFormulaReviewPanelViewModel")
      .mockReturnValue(createFormulaReviewPanelSummary());
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));

    expect(spy.mock.calls.at(-1)?.[0].implementationRegistry).toMatchObject({
      generatedAt: "2026-07-31T12:00:00.000Z"
    });
    spy.mockRestore();
  });

  it("keeps hosted formula review controls read-only", async () => {
    const project = createProject({
      identity: { id: "readonly-formula-review", projectName: "Readonly Formula Review" },
      intake: { appType: "powerAppsCanvas" },
      now: "2026-07-31T12:00:00.000Z"
    });
    seedApp([project]);
    const spy = vi.spyOn(formulaReviewPanelViewModel, "buildRecordLifecycleFormulaReviewPanelViewModel")
      .mockReturnValue(createFormulaReviewPanelSummary({
        history: [{ evidenceId: "evidence-1", status: "Current", outcome: "Accepted", issues: [] }]
      }));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));

    expect(screen.getByRole("button", { name: "Show evidence history" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show technical details" })).toBeInTheDocument();
    const panel = screen.getByRole("heading", { name: "Lifecycle formula review" }).closest("section")!;
    expect(within(panel).queryByRole("button", {
      name: /save|edit|delete|approve|reject|regenerate|validate|record|clear|copy|download|export|install|deploy|mark ready/i
    })).not.toBeInTheDocument();
    spy.mockRestore();
  });

  it("does not leak formula source or reviewer notes through the hosted panel", async () => {
    const project = createProject({
      identity: { id: "privacy-formula-review", projectName: "Privacy Formula Review" },
      intake: { appType: "powerAppsCanvas" },
      now: "2026-07-31T12:00:00.000Z"
    });
    seedApp([project]);
    const spy = vi.spyOn(formulaReviewPanelViewModel, "buildRecordLifecycleFormulaReviewPanelViewModel")
      .mockReturnValue(createFormulaReviewPanelSummary({
        history: [{ evidenceId: "evidence-1", status: "Current", outcome: "Accepted", issues: [] }]
      }));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));
    await user.click(screen.getByRole("button", { name: "Show evidence history" }));
    await user.click(screen.getByRole("button", { name: "Show technical details" }));

    const panel = screen.getByRole("heading", { name: "Lifecycle formula review" }).closest("section")!;
    expect(panel).not.toHaveTextContent(/Patch\(|RemoveIf\(|reviewerDisplayName|reviewerRole|notes/i);
    spy.mockRestore();
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
