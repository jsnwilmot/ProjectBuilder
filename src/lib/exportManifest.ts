import { DOCUMENT_LOCATIONS } from "../data/folderStructure";
import type { ProjectRecord } from "../types/project";
import {
  EXPORT_MANIFEST_PATH,
  EXPORT_SCHEMA_VERSION,
  getStableFolderSummary,
  type ExportIntegrityResult
} from "./exportIntegrity";

export interface ExportManifestFile {
  fileName: string;
  folder: string;
  path: string;
}

export interface ExportManifest {
  packageSchemaVersion: number;
  activeProjectId: string;
  projectName: string;
  clientName: string;
  appType: string;
  projectStatus: string;
  reviewStatus: string;
  exportedAt: string;
  generatedDocumentCount: number;
  expectedDocumentCount: number;
  missingInformationMarkerCount: number;
  exportWarnings: string[];
  exportErrors: string[];
  rootFolder: string;
  folderStructure: Array<{ folder: string; coreFileCount: number }>;
  files: ExportManifestFile[];
  diagnosticFiles: string[];
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function listOrNone(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

export function createExportManifest(
  project: ProjectRecord,
  integrity: ExportIntegrityResult
): ExportManifest {
  return {
    packageSchemaVersion: EXPORT_SCHEMA_VERSION,
    activeProjectId: project.identity.id,
    projectName: project.identity.projectName.trim() || "Untitled project",
    clientName: project.client.clientName.trim() || "[MISSING: client name]",
    appType: project.intake.appType.trim() || "[MISSING: app type]",
    projectStatus: project.status,
    reviewStatus: project.reviewStatus,
    exportedAt: integrity.generatedAt,
    generatedDocumentCount: integrity.fileCount,
    expectedDocumentCount: integrity.expectedFileCount,
    missingInformationMarkerCount: integrity.manifestSummary.missingMarkerCount,
    exportWarnings: [...integrity.warnings],
    exportErrors: [...integrity.errors],
    rootFolder: integrity.manifestSummary.rootFolder,
    folderStructure: getStableFolderSummary(),
    files: DOCUMENT_LOCATIONS.map(({ fileName, folder }) => ({
      fileName,
      folder,
      path: `${folder}/${fileName}`
    })),
    diagnosticFiles: [EXPORT_MANIFEST_PATH, "project-manifest.json"]
  };
}

export function renderExportManifestMarkdown(manifest: ExportManifest): string {
  const folders = manifest.folderStructure
    .map(({ folder, coreFileCount }) => `| ${markdownCell(folder)} | ${coreFileCount} |`)
    .join("\n");
  const files = manifest.files
    .map(({ fileName, folder, path }) =>
      `| ${markdownCell(fileName)} | ${markdownCell(folder)} | ${markdownCell(path)} |`
    )
    .join("\n");

  return `# Export Manifest

## Package summary

| Field | Value |
| --- | --- |
| Package schema version | ${manifest.packageSchemaVersion} |
| Active project id | ${markdownCell(manifest.activeProjectId)} |
| Project name | ${markdownCell(manifest.projectName)} |
| Client name | ${markdownCell(manifest.clientName)} |
| App type | ${markdownCell(manifest.appType)} |
| Project status | ${markdownCell(manifest.projectStatus)} |
| Review status | ${markdownCell(manifest.reviewStatus)} |
| Exported date | ${markdownCell(manifest.exportedAt)} |
| ZIP root folder | ${markdownCell(manifest.rootFolder)} |
| Generated documents | ${manifest.generatedDocumentCount} |
| Expected documents | ${manifest.expectedDocumentCount} |
| Missing information markers | ${manifest.missingInformationMarkerCount} |

## Export warnings

${listOrNone(manifest.exportWarnings)}

## Export errors

${listOrNone(manifest.exportErrors)}

## Folder structure

| Folder | Core files |
| --- | ---: |
${folders}

## Core file list

| File | Folder | Export path |
| --- | --- | --- |
${files}

## Diagnostic files

${manifest.diagnosticFiles.map((path) => `- ${path}`).join("\n")}
`;
}
