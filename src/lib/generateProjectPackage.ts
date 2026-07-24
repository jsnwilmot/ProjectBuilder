import { PROJECT_FOLDERS } from "../data/folderStructure";
import { missingMarker, normalizeFileName, sanitizeProjectFolderName } from "./documentHelpers";
import { documentTemplates } from "../templates/documents";
import type { GeneratedDocument, ProjectPackage, ProjectRecord } from "../types/project";
import { deriveReviewItems } from "./clientReview";
import { getProjectDisplayStatus } from "./projectSelectors";
import { expectedDocumentLocations } from "./powerPlatform";
import { evaluateGeneratedPackageReadiness } from "./generatedPackageReadiness";
import { getDocumentReviewStatus } from "./documentReview";

export function generateProjectPackage(project: ProjectRecord): ProjectPackage {
  const rootFolder = sanitizeProjectFolderName(project.identity.projectName);
  const packageGeneratedAt = new Date().toISOString();
  const renderProject: ProjectRecord = {
    ...project,
    packageGeneratedAt,
    reviewItems: deriveReviewItems(project, packageGeneratedAt)
  };
  renderProject.status = getProjectDisplayStatus(renderProject);
  type GenerationContext = { readiness?: ReturnType<typeof evaluateGeneratedPackageReadiness>; documentStatuses?: Record<string, string> };
  const renderDocuments = (context?: GenerationContext) => expectedDocumentLocations(renderProject).map(({ fileName, folder }) => {
    const template = documentTemplates[fileName];
    if (!template) throw new Error(`No document template registered for ${fileName}.`);
    const projectForTemplate = {
      ...renderProject,
      generationContext: context,
      currentDocumentName: fileName
    } as ProjectRecord & {
      generationContext?: typeof context;
      currentDocumentName?: string;
    };
    const content = template(projectForTemplate).trim() || missingMarker(`content for ${fileName}`);
    return {
      fileName: normalizeFileName(fileName),
      folder,
      content
    };
  });

  const evaluationSignature = (
    readiness: ReturnType<typeof evaluateGeneratedPackageReadiness>,
    documentStatuses: Record<string, string>
  ) => JSON.stringify({
    status: readiness.status,
    blockers: [...readiness.blockers].sort(),
    missingMarkerCount: readiness.missingMarkerCount,
    prohibitedContentCount: readiness.prohibitedContentCount,
    missingDocumentCount: readiness.missingDocumentCount,
    blankDocumentCount: readiness.blankDocumentCount,
    duplicateExpectedPathCount: readiness.duplicateExpectedPathCount,
    missingTemplateCount: readiness.missingTemplateCount,
    orphanMarkerCount: readiness.orphanMarkerCount,
    documentStatuses
  });

  let context: GenerationContext | undefined;
  let previousSignature = "";
  let documents: GeneratedDocument[] = [];
  const maxPasses = 5;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    documents = renderDocuments(context);
    const evaluationProject = {
      ...renderProject,
      generatedDocuments: documents,
      generatedFileCount: documents.length
    };
    const readiness = evaluateGeneratedPackageReadiness(evaluationProject, documents);
    const documentStatuses = Object.fromEntries(
      documents.map((document) => [document.fileName, getDocumentReviewStatus(document, evaluationProject)])
    );
    const signature = evaluationSignature(readiness, documentStatuses);
    if (signature === previousSignature) {
      context = { readiness, documentStatuses };
      break;
    }
    previousSignature = signature;
    context = { readiness, documentStatuses };
    if (pass === maxPasses - 1) {
      throw new Error("Project package generation did not converge after evaluating readiness metadata.");
    }
  }

  return {
    projectId: project.identity.id,
    projectName: project.identity.projectName.trim(),
    rootFolder,
    folders: PROJECT_FOLDERS,
    documents
  };
}
