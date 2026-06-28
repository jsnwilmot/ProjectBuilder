import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import {
  getActiveProjectSummary,
  getDashboardWarnings,
  getGeneratedFileCount,
  getLastUpdatedLabel,
  getNextAction,
  getNextActionDetails,
  getOutstandingQuestionCount,
  getProjectCompletionPercent,
  getProjectDisplayStatus,
  getProjectStageProgress,
  getReadinessSections,
  getRecentProjectSummaries,
  getReviewStatus
} from "../lib/projectSelectors";

describe("project selectors", () => {
  it("calculates dashboard values without mutating the project", () => {
    const project = createSeedProject();
    const before = JSON.stringify(project);
    expect(getOutstandingQuestionCount(project)).toBe(0);
    expect(getGeneratedFileCount(project)).toBe(0);
    expect(getReadinessSections(project)).toHaveLength(6);
    expect(getProjectStageProgress(project)).toHaveLength(8);
    expect(getProjectCompletionPercent(project)).toBeGreaterThan(0);
    expect(getNextAction(project)).toBeTruthy();
    expect(getProjectDisplayStatus(project)).toBe("Intake Complete");
    expect(getLastUpdatedLabel(project)).toBeTruthy();
    expect(getReviewStatus(project)).toBe("Not reviewed");
    expect(JSON.stringify(project)).toBe(before);
  });

  it("returns intake guidance for an empty project", () => {
    const project = createProject({ identity: { id: "empty" } });
    expect(getProjectDisplayStatus(project)).toBe("Intake Started");
    expect(getActiveProjectSummary(project)?.projectName).toBe("Untitled Project");
    expect(getNextAction(project)).toBe("Complete Foundation");
  });

  it("builds active project summary", () => {
    const project = createSeedProject();
    const summary = getActiveProjectSummary(project);
    expect(summary?.projectName).toBe("Community Services Portal");
    expect(summary?.nextAction.targetView).toBe("intake");
    expect(summary?.completionPercent).toBeGreaterThan(0);
  });

  it("sorts recent project summaries by updated date descending", () => {
    const older = createProject({
      identity: { id: "older", projectName: "Older" },
      now: "2026-06-20T10:00:00.000Z"
    });
    const newer = createProject({
      identity: { id: "newer", projectName: "Newer" },
      now: "2026-06-21T10:00:00.000Z"
    });
    const summaries = getRecentProjectSummaries([older, newer], "newer");
    expect(summaries[0].id).toBe("newer");
    expect(summaries[0].isActive).toBe(true);
  });

  it("returns dashboard warnings for inconsistent status combinations", () => {
    const project = createProject({
      identity: { id: "warning", projectName: "Warning" },
      status: "Project Package Generated"
    });
    const warnings = getDashboardWarnings(project);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("next action routes to documents when generated documents exist", () => {
    const project = createSeedProject();
    project.generatedDocuments = [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# Doc" }
    ];
    const action = getNextActionDetails(project);
    expect(action.targetView).toBe("documents");
  });
});
