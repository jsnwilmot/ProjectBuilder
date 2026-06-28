import { DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../data/folderStructure";
import { documentTemplates } from "../templates/documents";
import type { ProjectPackage, ProjectRecord, ValidationIssue } from "../types/project";
import { toProjectTemplateData } from "./projectFields";
import { sanitizeProjectName } from "./sanitizeProjectName";
import { validateIntake } from "./validateIntake";

export class ProjectValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super("Complete the required intake fields before generating the package.");
    this.name = "ProjectValidationError";
  }
}

export function generateProjectPackage(project: ProjectRecord): ProjectPackage {
  const issues = validateIntake(project).missingFields;
  if (issues.length > 0) throw new ProjectValidationError(issues);

  const intake = toProjectTemplateData(project);
  const rootFolder = sanitizeProjectName(project.identity.projectName);
  const documents = DOCUMENT_LOCATIONS.map(({ fileName, folder }) => {
    const template = documentTemplates[fileName];
    if (!template) throw new Error(`No document template registered for ${fileName}.`);
    return { fileName, folder, content: template(intake) };
  });

  return {
    projectId: project.identity.id,
    projectName: project.identity.projectName.trim(),
    rootFolder,
    folders: PROJECT_FOLDERS,
    documents
  };
}
