import { createSeedProject } from "../data/seedProject";
import { DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createProject } from "../lib/createProject";
import { deriveReviewItems } from "../lib/clientReview";
import { validateExportPackage } from "../lib/exportIntegrity";
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
  getProjectManagementCounts,
  getProjectStageProgress,
  getReadinessSections,
  getRecentProjectSummaries,
  getReviewStatus
} from "../lib/projectSelectors";
import { PROJECT_STATUSES, REVIEW_STATUSES } from "../types/project";
import type { ProjectRecord } from "../types/project";

function createSelectorReadyProject(): ProjectRecord {
  const project = createProject({
    identity: { id: "selector-ready", projectName: "Selector Ready" },
    client: { clientName: "Client", businessName: "Business" },
    intake: {
      appType: "webApplication",
      appPurpose: "Coordinate approved work.",
      problemStatement: "Teams need one governed workflow.",
      targetPlatform: "Responsive web",
      targetUsers: "Staff",
      userRoles: "Requester\nReviewer",
      requiredFeatures: "Create request\nReview request",
      workflows: "Submit and review",
      screens: "Home\nRequest detail",
      dataSources: "Application data store",
      dataEntities: "Request",
      dataCollections: "Requests",
      fields: "Title, Status",
      fieldTypes: "Title: text\nStatus: choice",
      requiredDataFields: "Title\nStatus",
      relationships: "Request has status history",
      dataOwnership: "Business owns records",
      dataRetentionNotes: "Retain per policy",
      permissionRules: "Requesters view own requests; reviewers view assigned requests.",
      sensitiveDataNotes: "No secrets",
      authenticationExpectation: "Organization sign-in",
      authorizationExpectation: "Application roles",
      auditLoggingNeeds: "Track status changes",
      dataProtectionExpectations: "Least privilege",
      complianceNotes: "Internal use",
      automations: "Notify reviewers",
      notifications: "Submission confirmation",
      integrations: "Email notification service",
      reportsDashboards: "Open requests by status",
      brandingNotes: "Approved brand",
      accessibilityNotes: "Keyboard and focus support",
      acceptanceNotes: "Submit and review flow passes",
      constraints: "Keep scope focused",
      risks: "Permissions must be correct",
      assumptions: "Email service available",
      outOfScope: "Payments",
      successCriteria: "Requests can be submitted and reviewed."
    }
  });
  project.readinessConfirmations = {
    scopeReviewed: true,
    acceptanceCriteriaReviewed: true,
    draftPackageReviewed: true
  };
  project.reviewItems = deriveReviewItems(project).map((item) => ({ ...item, status: "Answered" }));
  project.generatedDocuments = DOCUMENT_LOCATIONS.map((location) => ({
    fileName: location.fileName,
    folder: location.folder,
    content: `# ${location.fileName}\n\nComplete approved content.`
  }));
  project.generatedFileCount = project.generatedDocuments.length;
  project.packageGeneratedAt = "2026-07-12T12:00:00.000Z";
  project.status = "Project Package Generated";
  return project;
}

describe("project selectors", () => {
  it("calculates dashboard values without mutating the project", () => {
    const project = createSeedProject();
    const before = JSON.stringify(project);
    expect(getOutstandingQuestionCount(project)).toBeGreaterThan(0);
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

  it("keeps canonical project and review status labels distinct", () => {
    expect(PROJECT_STATUSES).toEqual([
      "Intake Started",
      "Intake Complete",
      "Project Package Generated",
      "Architect Review Needed",
      "Ready for Codex",
      "In Development",
      "Needs Review",
      "Complete"
    ]);
    expect(REVIEW_STATUSES).toEqual([
      "Not reviewed",
      "Review needed",
      "In review",
      "Approved",
      "Changes requested"
    ]);
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

  it("next action routes to client review when generated documents still have blockers", () => {
    const project = createSeedProject();
    project.generatedDocuments = [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# Doc" }
    ];
    const action = getNextActionDetails(project);
    expect(action.targetView).toBe("scope");
  });

  it("counts active, archived, ready, draft, and blocked projects without treating archived projects as active", () => {
    const active = createProject({ identity: { id: "active", projectName: "Active" } });
    const archived = createProject({
      identity: { id: "archived", projectName: "Archived" },
      archivedAt: "2026-07-04T12:00:00.000Z"
    });
    const draft = createProject({
      identity: { id: "draft", projectName: "Draft" },
      generatedDocuments: [{ fileName: "README.md", folder: "", content: "# Draft" }]
    });

    expect(getProjectManagementCounts([active, archived, draft])).toEqual({
      active: 2,
      archived: 1,
      readyForCodex: 0,
      draft: 1,
      withBlockers: 2
    });
  });

  it("blocks Ready for Codex status when required intake is missing", () => {
    const project = createProject({
      identity: { id: "not-ready", projectName: "Not Ready" },
      status: "Ready for Codex"
    });

    expect(getProjectDisplayStatus(project)).toBe("Needs Review");
  });

  it("keeps client-review-ready projects with incomplete generated content out of Ready counts", () => {
    const project = createSelectorReadyProject();
    project.generatedDocuments[0] = {
      ...project.generatedDocuments[0],
      content: `${project.generatedDocuments[0].content}\n[MISSING: app purpose]`
    };

    expect(getProjectDisplayStatus(project)).toBe("Project Package Generated");
    expect(validateExportPackage(project).manifestSummary.readiness).toBe("Draft");
    expect(validateExportPackage(project).isValid).toBe(true);
    expect(getProjectManagementCounts([project])).toMatchObject({
      readyForCodex: 0,
      draft: 1,
      withBlockers: 1
    });
  });

  it("counts a fully ready generated project as Ready everywhere selectors can report it", () => {
    const project = createSelectorReadyProject();

    expect(validateExportPackage(project).manifestSummary.readiness).toBe("Ready for Codex");
    expect(getProjectDisplayStatus(project)).toBe("Ready for Codex");
    expect(getProjectManagementCounts([project])).toMatchObject({
      readyForCodex: 1,
      draft: 0,
      withBlockers: 0
    });
  });
});
