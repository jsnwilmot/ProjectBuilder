import { GENERATE_STAGE_INDEX, REVIEW_STAGE_INDEX } from "../data/intakeStages";
import { getProjectTypeLabel } from "../data/projectTypes";
import { PROJECT_STATUSES } from "../types/project";
import type {
  DashboardNextAction,
  DashboardWarning,
  ProjectRecord,
  ProjectManagementCounts,
  ReviewStatus,
  ProjectStatus,
  ProjectStageProgress,
  ProjectSummary,
  ReadinessSection
} from "../types/project";
import { getFirstIncompleteStep, validateIntake } from "./validateIntake";
import { getClientReviewReadiness } from "./clientReview";

const readinessDefinitions = [
  { id: "requirements", label: "Requirements", steps: [0, 1, 2] },
  { id: "architecture", label: "Architecture", steps: [0, 3] },
  { id: "data-model", label: "Data model", steps: [3] },
  { id: "ui-workflows", label: "UI and workflows", steps: [2, 4] },
  { id: "security", label: "Security", steps: [5] },
  { id: "testing-deployment", label: "Testing and deployment", steps: [6, 7] }
] as const;

const statusSet = new Set(PROJECT_STATUSES);

function safeProjectName(project: ProjectRecord): string {
  return project.identity.projectName.trim() || "Untitled Project";
}

function normalizedDate(dateString: string): Date | null {
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getLastUpdatedLabel(project: ProjectRecord): string {
  const parsed = normalizedDate(project.updatedAt);
  if (!parsed) return "Unknown";
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

export function getReviewStatus(project: ProjectRecord): ReviewStatus {
  return project.reviewStatus;
}

export function getOutstandingQuestionCount(project: ProjectRecord): number {
  return getClientReviewReadiness(project).unresolvedItems.length;
}

export function getGeneratedFileCount(project: ProjectRecord): number {
  return project.generatedDocuments.filter((document) => document.content.trim().length > 0).length;
}

export function getProjectStageProgress(project: ProjectRecord): ProjectStageProgress[] {
  return validateIntake(project).sectionResults.map((section) => ({
    stageId: section.stageId,
    label: section.label,
    percentComplete: section.percentComplete,
    isComplete: section.isComplete,
    missingCount: section.missingFields.length,
    warningCount: section.warnings.length
  }));
}

export function getReadinessSections(project: ProjectRecord): ReadinessSection[] {
  const progress = getProjectStageProgress(project);
  return readinessDefinitions.map(({ id, label, steps }) => {
    const related = steps.map((stepIndex) => progress[stepIndex]).filter(Boolean);
    if (related.length === 0) {
      return { id, label, percent: 0, state: "Not started", missingCount: 0, warningCount: 0 };
    }
    const percent = Math.round(related.reduce((total, item) => total + item.percentComplete, 0) / related.length);
    const missingCount = related.reduce((total, item) => total + item.missingCount, 0);
    const warningCount = related.reduce((total, item) => total + item.warningCount, 0);
    return {
      id,
      label,
      percent,
      state: percent === 100 ? "Complete" : percent > 0 ? "In progress" : "Not started",
      missingCount,
      warningCount
    };
  });
}

export function getProjectCompletionPercent(project: ProjectRecord): number {
  const sections = validateIntake(project).sectionResults.filter((section) => section.stageId !== "review" && section.stageId !== "generate");
  if (sections.length === 0) return 0;
  return Math.round(sections.reduce((total, section) => total + section.percentComplete, 0) / sections.length);
}

export function getProjectDisplayStatus(project: ProjectRecord): ProjectStatus {
  if (statusSet.has(project.status) && ["In Development", "Complete"].includes(project.status)) {
    return project.status;
  }
  const readiness = getClientReviewReadiness(project);
  if (readiness.isReady) return "Ready for Codex";
  if (project.status === "Ready for Codex") return "Needs Review";
  if (getGeneratedFileCount(project) > 0) {
    return project.status === "Needs Review" ? "Needs Review" : "Project Package Generated";
  }
  if (project.status === "Architect Review Needed") return "Architect Review Needed";
  if (validateIntake(project).isValid) return "Intake Complete";
  return "Intake Started";
}

export function getDashboardWarnings(project: ProjectRecord): DashboardWarning[] {
  const warnings: DashboardWarning[] = [];
  if (getGeneratedFileCount(project) === 0 && project.status === "Project Package Generated") {
    warnings.push({
      level: "warning",
      message: "Status shows Project Package Generated but no generated documents are stored."
    });
  }
  if (!getClientReviewReadiness(project).isReady && project.status === "Ready for Codex") {
    warnings.push({
      level: "error",
      message: "Project is marked Ready for Codex but client review blockers remain."
    });
  }
  if (!normalizedDate(project.updatedAt)) {
    warnings.push({ level: "warning", message: "Last updated date is invalid." });
  }
  return warnings;
}

export function getNextAction(project: ProjectRecord): string {
  return getNextActionDetails(project).label;
}

export function getNextActionDetails(project: ProjectRecord): DashboardNextAction {
  const validation = validateIntake(project);
  const readiness = getClientReviewReadiness(project);
  const step = getFirstIncompleteStep(project);

  if (getGeneratedFileCount(project) > 0) {
    if (!readiness.isReady) {
      return {
        label: `Resolve ${readiness.blockerCount} readiness blocker${readiness.blockerCount === 1 ? "" : "s"}`,
        description: "Complete the client review workflow, then regenerate the package.",
        targetView: "scope",
        targetStage: REVIEW_STAGE_INDEX
      };
    }
    return {
      label: "Review generated documents",
      description: "Open generated docs for quality review or export.",
      targetView: "documents"
    };
  }

  if (validation.isValid) {
    return {
      label: "Generate project package",
      description: "Generate and persist all project package documents.",
      targetView: "intake",
      targetStage: GENERATE_STAGE_INDEX
    };
  }

  const labels = [
    "Complete Foundation",
    "Define target users and roles",
    "Add required features",
    "Define data model",
    "Map workflows",
    "Define security model",
    "Review scope",
    "Generate project package"
  ];

  const descriptions = [
    "Capture project identity, purpose, and success criteria.",
    "Add users, roles, and access expectations.",
    "Capture required features and acceptance notes.",
    "Capture entities, fields, and relationships.",
    "Map triggers, steps, and outcomes.",
    "Capture permission rules and sensitive-data expectations.",
    "Review missing and warning items before generation.",
    "Generate package documents."
  ];

  return {
    label: labels[step] ?? "Continue intake",
    description: descriptions[step] ?? "Continue guided intake.",
    targetView: "intake",
    targetStage: step === REVIEW_STAGE_INDEX ? REVIEW_STAGE_INDEX : step
  };
}

export function getActiveProjectSummary(project: ProjectRecord | null): ProjectSummary | null {
  if (!project) return null;
  return {
    id: project.identity.id,
    projectName: safeProjectName(project),
    archivedAt: project.archivedAt,
    status: getProjectDisplayStatus(project),
    reviewStatus: getReviewStatus(project),
    clientName: project.client.clientName.trim() || "Missing",
    appType: getProjectTypeLabel(project.intake.appType).trim() || "Missing",
    lastUpdatedLabel: getLastUpdatedLabel(project),
    generatedFileCount: getGeneratedFileCount(project),
    outstandingQuestionCount: getOutstandingQuestionCount(project),
    completionPercent: getProjectCompletionPercent(project),
    nextAction: getNextActionDetails(project)
  };
}

export function getProjectManagementCounts(projects: ProjectRecord[]): ProjectManagementCounts {
  const activeProjects = projects.filter((project) => !project.archivedAt);
  const readiness = activeProjects.map((project) => ({
    project,
    clientReview: getClientReviewReadiness(project)
  }));

  return {
    active: activeProjects.length,
    archived: projects.length - activeProjects.length,
    readyForCodex: readiness.filter(({ clientReview }) => clientReview.isReady).length,
    draft: readiness.filter(({ project, clientReview }) =>
      getGeneratedFileCount(project) > 0 && !clientReview.isReady
    ).length,
    withBlockers: readiness.filter(({ clientReview }) => clientReview.blockerCount > 0).length
  };
}

export function getRecentProjectSummaries(projects: ProjectRecord[], activeProjectId: string | null): Array<ProjectSummary & { isActive: boolean }> {
  return [...projects]
    .sort((a, b) => {
      const aDate = normalizedDate(a.updatedAt)?.getTime() ?? 0;
      const bDate = normalizedDate(b.updatedAt)?.getTime() ?? 0;
      return bDate - aDate;
    })
    .map((project) => ({
      ...(getActiveProjectSummary(project) as ProjectSummary),
      isActive: project.identity.id === activeProjectId
    }));
}
