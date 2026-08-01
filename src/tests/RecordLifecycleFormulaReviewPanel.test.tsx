import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecordLifecycleFormulaReviewPanel } from "../components/ClientReview/RecordLifecycleFormulaReviewPanel";
import {
  RECORD_LIFECYCLE_FORMULA_REVIEW_SUMMARY_SAFETY_NOTICES,
  type RecordLifecycleFormulaReviewSummary
} from "../lib/recordLifecycleFormulaReviewSummary";
import "../styles/global.css";

function summary(overrides: Partial<RecordLifecycleFormulaReviewSummary> = {}): RecordLifecycleFormulaReviewSummary {
  return {
    reviewState: "Review Required",
    applicable: true,
    formulaIdentity: {
      assetId: "record-lifecycle-power-fx",
      reviewContractVersion: "phase-5b.4d.2.1",
      reviewContractChecksum: "fnv1a-contract",
      formulaContentChecksum: "fnv1a-formula",
      sourcePlanningAssetId: "canvas-record-lifecycle-plan",
      sourcePlanningAssetChecksum: "fnv1a-plan",
      planningGenerationVersion: "phase-5b.4c",
      formulaGenerationVersion: "phase-5b.4c"
    },
    reviewReference: {
      status: "Not Provided",
      issues: []
    },
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
    safetyNotices: [...RECORD_LIFECYCLE_FORMULA_REVIEW_SUMMARY_SAFETY_NOTICES],
    ...overrides
  };
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

describe("RecordLifecycleFormulaReviewPanel", () => {
  it("renders nothing when the summary is not applicable", () => {
    const { container } = render(<RecordLifecycleFormulaReviewPanel summary={summary({ applicable: false, reviewState: "Not Applicable" })} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows Review Required without implying approval", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary()} />);

    expect(screen.getByRole("heading", { name: "Lifecycle formula review" })).toBeInTheDocument();
    expect(screen.getByText("Formula review state").closest("div")).toHaveTextContent("Review Required");
    expect(screen.getByText(/human review is still required/i)).toBeInTheDocument();
    expect(screen.getByText(/does not mean the formula is approved/i)).toBeInTheDocument();
  });

  it("shows Blocked state copy and blockers", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      reviewState: "Blocked",
      formulaBlockers: ["Record lifecycle formula review requires a valid generated lifecycle formula asset."]
    })} />);

    expect(screen.getByText("Formula review state").closest("div")).toHaveTextContent("Blocked");
    expect(screen.getByRole("heading", { name: "Formula blockers" })).toBeInTheDocument();
    expect(screen.getByText("Record lifecycle formula review requires a valid generated lifecycle formula asset.")).toBeInTheDocument();
  });

  it("shows not-provided evidence empty states", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary()} />);

    expect(screen.getByText("No Technical Review evidence has been recorded.")).toBeInTheDocument();
    expect(screen.getByText("No Power Apps Studio Validation evidence has been recorded.")).toBeInTheDocument();
  });

  it("shows current technical review evidence counts and outcomes", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      technicalReview: {
        evidenceType: "Technical Review",
        status: "Current",
        recordCount: 1,
        currentCount: 1,
        staleCount: 0,
        invalidCount: 0,
        currentOutcomes: ["Accepted"],
        staleOutcomes: [],
        issues: []
      }
    })} />);

    const technical = screen.getByRole("heading", { name: "Technical Review" }).closest("section")!;
    expect(within(technical).getAllByText("Current").length).toBeGreaterThanOrEqual(1);
    expect(within(technical).getByText("Accepted")).toBeInTheDocument();
  });

  it("shows current Studio validation evidence counts and outcomes", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      studioValidation: {
        evidenceType: "Power Apps Studio Validation",
        status: "Current",
        recordCount: 1,
        currentCount: 1,
        staleCount: 0,
        invalidCount: 0,
        currentOutcomes: ["Passed"],
        staleOutcomes: [],
        issues: []
      }
    })} />);

    const studio = screen.getByRole("heading", { name: "Power Apps Studio Validation" }).closest("section")!;
    expect(within(studio).getAllByText("Current").length).toBeGreaterThanOrEqual(1);
    expect(within(studio).getByText("Passed")).toBeInTheDocument();
  });

  it("shows both evidence types independently", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      technicalReview: {
        evidenceType: "Technical Review",
        status: "Current",
        recordCount: 1,
        currentCount: 1,
        staleCount: 0,
        invalidCount: 0,
        currentOutcomes: ["Accepted"],
        staleOutcomes: [],
        issues: []
      },
      studioValidation: {
        evidenceType: "Power Apps Studio Validation",
        status: "Current",
        recordCount: 1,
        currentCount: 1,
        staleCount: 0,
        invalidCount: 0,
        currentOutcomes: ["Passed"],
        staleOutcomes: [],
        issues: []
      }
    })} />);

    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("shows rejected technical review evidence as evidence, not a command", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      technicalReview: {
        evidenceType: "Technical Review",
        status: "Current",
        recordCount: 1,
        currentCount: 1,
        staleCount: 0,
        invalidCount: 0,
        currentOutcomes: ["Rejected"],
        staleOutcomes: [],
        issues: []
      }
    })} />);

    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });

  it("shows regeneration-required technical review evidence as evidence, not a command", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      technicalReview: {
        evidenceType: "Technical Review",
        status: "Current",
        recordCount: 1,
        currentCount: 1,
        staleCount: 0,
        invalidCount: 0,
        currentOutcomes: ["Regeneration Required"],
        staleOutcomes: [],
        issues: []
      }
    })} />);

    expect(screen.getByText("Regeneration Required")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /regenerate/i })).not.toBeInTheDocument();
  });

  it("shows failed Studio validation as evidence, not a command", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      studioValidation: {
        evidenceType: "Power Apps Studio Validation",
        status: "Current",
        recordCount: 1,
        currentCount: 1,
        staleCount: 0,
        invalidCount: 0,
        currentOutcomes: ["Failed"],
        staleOutcomes: [],
        issues: []
      }
    })} />);

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /validate/i })).not.toBeInTheDocument();
  });

  it("shows stale technical review status and outcomes", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      technicalReview: {
        evidenceType: "Technical Review",
        status: "Stale",
        recordCount: 1,
        currentCount: 0,
        staleCount: 1,
        invalidCount: 0,
        currentOutcomes: [],
        staleOutcomes: ["Accepted"],
        issues: ["Technical evidence checksum is stale."]
      }
    })} />);

    expect(screen.getByText("Technical evidence checksum is stale.")).toBeInTheDocument();
    expect(screen.getAllByText(/no longer matches the current formula review contract/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows stale Studio validation status and outcomes", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      studioValidation: {
        evidenceType: "Power Apps Studio Validation",
        status: "Stale",
        recordCount: 1,
        currentCount: 0,
        staleCount: 1,
        invalidCount: 0,
        currentOutcomes: [],
        staleOutcomes: ["Passed"],
        issues: ["Studio validation evidence is stale."]
      }
    })} />);

    expect(screen.getByText("Studio validation evidence is stale.")).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("shows invalid technical review issues", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      technicalReview: {
        evidenceType: "Technical Review",
        status: "Invalid",
        recordCount: 1,
        currentCount: 0,
        staleCount: 0,
        invalidCount: 1,
        currentOutcomes: [],
        staleOutcomes: [],
        issues: ["Technical evidence record is malformed."]
      }
    })} />);

    expect(screen.getByText("Technical evidence record is malformed.")).toBeInTheDocument();
  });

  it("shows invalid Studio validation issues", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      studioValidation: {
        evidenceType: "Power Apps Studio Validation",
        status: "Invalid",
        recordCount: 1,
        currentCount: 0,
        staleCount: 0,
        invalidCount: 1,
        currentOutcomes: [],
        staleOutcomes: [],
        issues: ["Studio validation record is malformed."]
      }
    })} />);

    expect(screen.getByText("Studio validation record is malformed.")).toBeInTheDocument();
  });

  it("shows conflicting current technical outcomes without resolving them", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      technicalReview: {
        evidenceType: "Technical Review",
        status: "Current",
        recordCount: 2,
        currentCount: 2,
        staleCount: 0,
        invalidCount: 0,
        currentOutcomes: ["Accepted", "Rejected"],
        staleOutcomes: [],
        issues: ["Conflicting current Technical Review outcomes exist."]
      }
    })} />);

    expect(screen.getByText("Accepted, Rejected")).toBeInTheDocument();
    expect(screen.getByText("Conflicting current Technical Review outcomes exist.")).toBeInTheDocument();
  });

  it("shows conflicting current Studio outcomes without resolving them", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      studioValidation: {
        evidenceType: "Power Apps Studio Validation",
        status: "Current",
        recordCount: 2,
        currentCount: 2,
        staleCount: 0,
        invalidCount: 0,
        currentOutcomes: ["Passed", "Failed"],
        staleOutcomes: [],
        issues: ["Conflicting current Power Apps Studio Validation outcomes exist."]
      }
    })} />);

    expect(screen.getByText("Passed, Failed")).toBeInTheDocument();
    expect(screen.getByText("Conflicting current Power Apps Studio Validation outcomes exist.")).toBeInTheDocument();
  });

  it("shows stale review reference status and issues", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      reviewReference: {
        status: "Stale",
        issues: ["Formula review reference checksum is stale."]
      }
    })} />);

    expect(screen.getByRole("heading", { name: "Review reference" }).closest("section")).toHaveTextContent("Stale");
    expect(screen.getByText("Formula review reference checksum is stale.")).toBeInTheDocument();
  });

  it("shows invalid review reference status and issues", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      reviewReference: {
        status: "Invalid",
        issues: ["Formula review reference contains unsafe characters."]
      }
    })} />);

    expect(screen.getByText("Formula review reference contains unsafe characters.")).toBeInTheDocument();
  });

  it("shows stored collection issues", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      collectionIssues: ["recordLifecycleFormulaReviewEvidence must be an array."]
    })} />);

    expect(screen.getByRole("heading", { name: "Stored review data" })).toBeInTheDocument();
    expect(screen.getByText("recordLifecycleFormulaReviewEvidence must be an array.")).toBeInTheDocument();
  });

  it("shows permanent-delete blocker text when projected by the summary", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      reviewState: "Blocked",
      formulaBlockers: ["Permanent delete requires explicit Architect approval before formula generation."]
    })} />);

    expect(screen.getByText("Permanent delete requires explicit Architect approval before formula generation.")).toBeInTheDocument();
  });

  it("keeps evidence history collapsed initially", () => {
    render(<RecordLifecycleFormulaReviewPanel idPrefix="history-panel" summary={summary({
      history: [{ evidenceId: "evidence-1", evidenceType: "Technical Review", status: "Current", outcome: "Accepted", recordedAt: "2026-07-31T12:00:00.000Z", issues: [] }]
    })} />);

    expect(screen.getByRole("button", { name: "Show evidence history" })).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("history-panel-history")).toHaveAttribute("hidden");
  });

  it("expands evidence history by keyboard activation", async () => {
    const user = userEvent.setup();
    render(<RecordLifecycleFormulaReviewPanel idPrefix="history-panel" summary={summary({
      history: [{ evidenceId: "evidence-1", evidenceType: "Technical Review", status: "Current", outcome: "Accepted", recordedAt: "2026-07-31T12:00:00.000Z", issues: [] }]
    })} />);

    screen.getByRole("button", { name: "Show evidence history" }).focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "Hide evidence history" })).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("history-panel-history")).not.toHaveAttribute("hidden");
  });

  it("toggles evidence history aria-expanded and controlled region", async () => {
    const user = userEvent.setup();
    render(<RecordLifecycleFormulaReviewPanel idPrefix="history-panel" summary={summary({
      history: [{ evidenceId: "evidence-1", status: "Stale", issues: ["Stale evidence."] }]
    })} />);

    const button = screen.getByRole("button", { name: "Show evidence history" });
    expect(button).toHaveAttribute("aria-controls", "history-panel-history");
    await user.click(button);
    expect(screen.getByRole("button", { name: "Hide evidence history" })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Hide evidence history" }));
    expect(screen.getByRole("button", { name: "Show evidence history" })).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps focus on the history disclosure button after toggling", async () => {
    const user = userEvent.setup();
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      history: [{ evidenceId: "evidence-1", status: "Current", issues: [] }]
    })} />);

    const button = screen.getByRole("button", { name: "Show evidence history" });
    await user.click(button);

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Hide evidence history" }));
  });

  it("preserves evidence history order from the summary", async () => {
    const user = userEvent.setup();
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      history: [
        { evidenceId: "third-recorded-first", status: "Stale", issues: [] },
        { evidenceId: "first-recorded-second", status: "Current", issues: [] },
        { evidenceId: "second-recorded-third", status: "Invalid", issues: [] }
      ]
    })} />);

    await user.click(screen.getByRole("button", { name: "Show evidence history" }));
    const items = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
    expect(items.join("|")).toMatch(/third-recorded-first.*first-recorded-second.*second-recorded-third/);
  });

  it("does not label evidence as latest or primary", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      history: [{ evidenceId: "evidence-1", status: "Current", issues: [] }]
    })} />);

    expect(screen.queryByText(/\blatest\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bprimary\b/i)).not.toBeInTheDocument();
  });

  it("keeps technical details collapsed initially", () => {
    render(<RecordLifecycleFormulaReviewPanel idPrefix="technical-panel" summary={summary()} />);

    expect(screen.getByRole("button", { name: "Show technical details" })).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("technical-panel-technical-details")).toHaveAttribute("hidden");
  });

  it("expands technical details with accessible controls", async () => {
    const user = userEvent.setup();
    render(<RecordLifecycleFormulaReviewPanel idPrefix="technical-panel" summary={summary()} />);

    const button = screen.getByRole("button", { name: "Show technical details" });
    expect(button).toHaveAttribute("aria-controls", "technical-panel-technical-details");
    await user.click(button);

    expect(screen.getByRole("button", { name: "Hide technical details" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Review contract checksum")).toBeInTheDocument();
  });

  it("renders long checksum values inside technical details", async () => {
    const user = userEvent.setup();
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      formulaIdentity: {
        assetId: "record-lifecycle-power-fx",
        reviewContractChecksum: "fnv1a-very-long-contract-checksum-value-for-responsive-layout"
      }
    })} />);

    await user.click(screen.getByRole("button", { name: "Show technical details" }));

    expect(screen.getByText("fnv1a-very-long-contract-checksum-value-for-responsive-layout")).toBeInTheDocument();
  });

  it("always renders safety notices", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary()} />);

    for (const notice of RECORD_LIFECYCLE_FORMULA_REVIEW_SUMMARY_SAFETY_NOTICES) {
      expect(screen.getByText(notice)).toBeInTheDocument();
    }
  });

  it("does not expose reviewer identity or notes in history", async () => {
    const user = userEvent.setup();
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      history: [{ evidenceId: "evidence-1", status: "Current", outcome: "Accepted", issues: [] }]
    })} />);

    await user.click(screen.getByRole("button", { name: "Show evidence history" }));

    expect(screen.queryByText(/Jordan Reviewer/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reviewed against contract metadata/i)).not.toBeInTheDocument();
  });

  it("does not expose formula source content", async () => {
    const user = userEvent.setup();
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      history: [{ evidenceId: "evidence-1", status: "Current", outcome: "Accepted", issues: [] }]
    })} />);

    await user.click(screen.getByRole("button", { name: "Show evidence history" }));
    await user.click(screen.getByRole("button", { name: "Show technical details" }));

    expect(screen.queryByText(/Patch\(/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/RemoveIf\(/i)).not.toBeInTheDocument();
  });

  it("does not render mutation, validation, export, install, or approval controls", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      history: [{ evidenceId: "evidence-1", status: "Current", issues: [] }]
    })} />);

    expect(screen.queryByRole("button", {
      name: /save|edit|delete|approve|reject|regenerate|validate|record|clear|copy|download|export|install|deploy|mark ready/i
    })).not.toBeInTheDocument();
  });

  it("does not mutate the supplied summary object", async () => {
    const user = userEvent.setup();
    const input = summary({
      history: [{ evidenceId: "evidence-1", status: "Current", issues: [] }]
    });
    const before = JSON.stringify(input);
    render(<RecordLifecycleFormulaReviewPanel summary={input} />);

    await user.click(screen.getByRole("button", { name: "Show evidence history" }));
    await user.click(screen.getByRole("button", { name: "Show technical details" }));

    expect(JSON.stringify(input)).toBe(before);
  });

  it("renders responsive panel structure classes", () => {
    const { container } = render(<RecordLifecycleFormulaReviewPanel summary={summary()} />);

    expect(container.querySelector(".formula-review-panel")).toBeInTheDocument();
    expect(container.querySelector(".formula-review-summary-grid")).toBeInTheDocument();
    expect(container.querySelector(".formula-review-evidence-grid")).toBeInTheDocument();
  });

  it("uses container-aware evidence grids and keeps narrow stacking available", () => {
    const styleRules = getAllStyleRuleText();
    const narrowRules = getMediaRuleText("(max-width: 640px)");

    expect(styleRules).toMatch(/\.formula-review-summary-grid,\s*\.formula-review-evidence-grid\s*\{[^}]*min-width:\s*0;/i);
    expect(styleRules).toMatch(/\.formula-review-summary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*14rem\),\s*1fr\)\);/i);
    expect(styleRules).toMatch(/\.formula-review-evidence-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*24rem\),\s*1fr\)\);/i);
    expect(styleRules).toMatch(/\.formula-review-counts\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*8rem\),\s*1fr\)\);/i);
    expect(narrowRules).toMatch(/\.formula-review-summary-grid,\s*\.formula-review-evidence-grid,\s*\.formula-review-counts,\s*\.formula-review-technical-details,\s*\.formula-review-history-item dl\s*\{[^}]*grid-template-columns:\s*1fr;/i);
  });

  it("keeps formula review grid children and status badges constrained", () => {
    const styleRules = getAllStyleRuleText();

    expect(styleRules).toMatch(/\.formula-review-status-card,\s*\.formula-review-evidence-section,\s*\.formula-review-reference,\s*\.formula-review-safety,\s*\.formula-review-disclosure\s*\{[^}]*min-width:\s*0;/i);
    expect(styleRules).toMatch(/\.formula-review-status\s*\{[^}]*max-width:\s*100%;[^}]*overflow-wrap:\s*anywhere;/i);
    expect(styleRules).toMatch(/\.formula-review-warning li,\s*\.formula-review-safety li,\s*\.formula-review-issues li,\s*\.formula-review-history-item\s*\{[^}]*overflow-wrap:\s*anywhere;/i);
    expect(styleRules).toMatch(/\.formula-review-counts dd,\s*\.formula-review-technical-details dd,\s*\.formula-review-history-item dd\s*\{[^}]*overflow-wrap:\s*anywhere;/i);
  });

  it("uses a sanitized id prefix for disclosure relationships", () => {
    render(<RecordLifecycleFormulaReviewPanel idPrefix="bad prefix!" summary={summary({
      history: [{ evidenceId: "evidence-1", status: "Current", issues: [] }]
    })} />);

    expect(screen.getByRole("button", { name: "Show evidence history" })).toHaveAttribute("aria-controls", "bad-prefix--history");
  });

  it("keeps first render source-free and read-only for time-to-interactive safety", () => {
    render(<RecordLifecycleFormulaReviewPanel summary={summary({
      reviewState: "Blocked",
      formulaBlockers: ["Formula review asset has unresolved required dependencies."],
      history: [{ evidenceId: "evidence-1", status: "Current", issues: [] }]
    })} />);

    expect(screen.getByText("Formula review asset has unresolved required dependencies.")).toBeInTheDocument();
    expect(screen.queryByText(/Patch\(|RemoveIf\(|SubmitForm\(/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Show evidence history",
      "Show technical details"
    ]);
  });
});
