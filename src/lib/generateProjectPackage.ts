import { DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../data/folderStructure";
import { missingMarker, normalizeFileName, sanitizeProjectFolderName } from "./documentHelpers";
import { documentTemplates } from "../templates/documents";
import type { ProjectPackage, ProjectRecord } from "../types/project";
import { deriveReviewItems } from "./clientReview";
import { getProjectDisplayStatus } from "./projectSelectors";

export function generateProjectPackage(project: ProjectRecord): ProjectPackage {
  const rootFolder = sanitizeProjectFolderName(project.identity.projectName);
  const packageGeneratedAt = new Date().toISOString();
  const renderProject: ProjectRecord = {
    ...project,
    packageGeneratedAt,
    reviewItems: deriveReviewItems(project, packageGeneratedAt)
  };
  renderProject.status = getProjectDisplayStatus(renderProject);
  const documents = DOCUMENT_LOCATIONS.map(({ fileName, folder }) => {
    const template = documentTemplates[fileName];
    if (!template) throw new Error(`No document template registered for ${fileName}.`);
    const content = template(renderProject).trim() || missingMarker(`content for ${fileName}`);
    return {
      fileName: normalizeFileName(fileName),
      folder,
      content
    };
  });

  return {
    projectId: project.identity.id,
    projectName: project.identity.projectName.trim(),
    rootFolder,
    folders: PROJECT_FOLDERS,
    documents
  };
}
