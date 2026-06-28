import type { ProjectRecord, ProjectStatus, ReadinessSection } from "../types/project";
import { getFirstIncompleteStep, getOutstandingFields, getStepCompletion, validateIntake } from "./validateIntake";
import { GENERATE_STAGE_INDEX } from "../data/intakeStages";

const readinessDefinitions = [
  { id: "requirements", label: "Requirements", steps: [0, 1, 2] },
  { id: "architecture", label: "Architecture", steps: [0, 3] },
  { id: "data-model", label: "Data model", steps: [3] },
  { id: "ui-workflows", label: "UI & workflows", steps: [2, 4] },
  { id: "security", label: "Security", steps: [5] },
  { id: "testing-deployment", label: "Testing & deployment", steps: [6, 7] }
] as const;

export function getOutstandingQuestionCount(project: ProjectRecord): number {
  return getOutstandingFields(project).length;
}

export function getGeneratedFileCount(project: ProjectRecord): number {
  return project.generatedDocuments.length;
}

export function getReadinessSections(project: ProjectRecord): ReadinessSection[] {
  return readinessDefinitions.map(({ id, label, steps }) => {
    const percent = Math.round(
      steps.reduce<number>((total, stepIndex) => total + getStepCompletion(project, stepIndex), 0) / steps.length
    );
    return {
      id,
      label,
      percent,
      state: percent === 100 ? "Complete" : percent > 0 ? "In progress" : "Not started"
    };
  });
}

export function getProjectCompletionPercent(project: ProjectRecord): number {
  const sections = validateIntake(project).sectionResults.filter((section) => section.stageId !== "review" && section.stageId !== "generate");
  if (sections.length === 0) return 0;
  return Math.round(sections.reduce((total, section) => total + section.percentComplete, 0) / sections.length);
}

export function getNextAction(project: ProjectRecord): string {
  if (project.generatedDocuments.length > 0) return "Review generated project package";
  if (validateIntake(project).isValid) return "Generate project package";
  const step = getFirstIncompleteStep(project);
  const labels = [
    "Complete the project foundation",
    "Define target users and roles",
    "Define required features and screens",
    "Define the data model",
    "Map workflows and notifications",
    "Define security and constraints",
    "Confirm success criteria",
    "Review project intake"
  ];
  if (step === GENERATE_STAGE_INDEX) return "Generate project package";
  return labels[step] ?? "Continue project intake";
}

export function getProjectDisplayStatus(project: ProjectRecord): ProjectStatus {
  if (["Architect Review Needed", "Ready for Codex", "In Development", "Needs Review", "Complete"].includes(project.status)) {
    return project.status;
  }
  if (project.generatedDocuments.length > 0) return "Project Package Generated";
  if (validateIntake(project).isValid) return "Intake Complete";
  return "Intake Started";
}
