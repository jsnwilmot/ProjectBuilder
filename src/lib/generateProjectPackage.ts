import { DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../data/folderStructure";
import { documentTemplates } from "../templates/documents";
import type { ProjectIntake, ProjectPackage, ValidationIssue } from "../types/project";
import { sanitizeProjectName } from "./sanitizeProjectName";
import { validateIntake } from "./validateIntake";

export class ProjectValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super("Complete the required intake fields before generating the package.");
    this.name = "ProjectValidationError";
  }
}

export function generateProjectPackage(intake: ProjectIntake): ProjectPackage {
  const issues = validateIntake(intake);
  if (issues.length > 0) throw new ProjectValidationError(issues);

  const rootFolder = sanitizeProjectName(intake.appName);
  const documents = DOCUMENT_LOCATIONS.map(({ fileName, folder }) => {
    const template = documentTemplates[fileName];
    if (!template) throw new Error(`No document template registered for ${fileName}.`);
    return { fileName, folder, content: template(intake) };
  });

  return {
    projectName: intake.appName.trim(),
    rootFolder,
    folders: PROJECT_FOLDERS,
    documents
  };
}
