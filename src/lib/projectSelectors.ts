import { GENERATE_STAGE_INDEX, REVIEW_STAGE_INDEX } from "../data/intakeStages";
import { PROJECT_STATUSES } from "../types/project";
import type {
  DashboardNextAction,
  DashboardWarning,
  ProjectRecord,
  ProjectStatus,
  ProjectStageProgress,
  ProjectSummary,
  ReadinessSection
} from "../types/project";
import { getFirstIncompleteStep, getOutstandingFields, getStepCompletion, validateIntake } from "./validateIntake";

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

export function getReviewStatus(project: ProjectRecord): string {
  const map: Record<string, string> = {
    "Not reviewed": "Not reviewed",
    "Needs review": "Review needed",
    "Approved": "Approved",
    "Review needed": "Review needed",
    "In review": "In review",
    "Changes requested": "Changes requested"
  };
  return map[project.reviewStatus] ?? "Review needed";
}

export function getOutstandingQuestionCount(project: ProjectRecord): number {
  return validateIntake(project).missingFields.length;
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
  const advancedStatuses: ProjectStatus[] = [
    "Architect Review Needed",
    "Ready for Codex",
    "In Development",
    "Needs Review",
    "Complete"
  ];

  if (statusSet.has(project.status) && advancedStatuses.includes(project.status)) {
    if (project.status === "Ready for Codex" && !validateIntake(project).isValid) return "Needs Review";
    return project.status;
  }

  if (getGeneratedFileCount(project) > 0) return "Project Package Generated";
  if (validateIntake(project).isValid) return "Intake Complete";
  return "Intake Started";
}

export function getDashboardWarnings(project: ProjectRecord): DashboardWarning[] {
  const warnings: DashboardWarning[] = [];
  if (getGeneratedFileCount(project) === 0 && project.status === "Project Package Generated") {
    warnings.push({
      level: "warning",
      message: "Status shows Project Package Generated but no generated files are stored."
    });
  }
  if (validateIntake(project).missingFields.length > 0 && project.status === "Ready for Codex") {
    warnings.push({
      level: "error",
      message: "Project is marked Ready for Codex but required intake information is still missing."
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
  const step = getFirstIncompleteStep(project);

  if (getGeneratedFileCount(project) > 0) {
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
    status: getProjectDisplayStatus(project),
    reviewStatus: getReviewStatus(project),
    clientName: project.client.clientName.trim() || "Missing",
    appType: project.intake.appType.trim() || "Missing",
    lastUpdatedLabel: getLastUpdatedLabel(project),
    generatedFileCount: getGeneratedFileCount(project),
    outstandingQuestionCount: getOutstandingQuestionCount(project),
    completionPercent: getProjectCompletionPercent(project),
    nextAction: getNextActionDetails(project)
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
