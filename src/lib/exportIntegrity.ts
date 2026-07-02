import { DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../data/folderStructure";
import { GENERATED_FILES } from "../data/generatedFiles";
import type { ProjectRecord } from "../types/project";
import { normalizeFileName, sanitizeProjectFolderName } from "./documentHelpers";
import { validateIntake } from "./validateIntake";

export const EXPORT_MANIFEST_PATH = "00_Project_Overview/EXPORT_MANIFEST.md";
export const EXPORT_SCHEMA_VERSION = 1;

export interface ExportManifestSummary {
  schemaVersion: number;
  rootFolder: string;
  coreFileCount: number;
  missingMarkerCount: number;
  readiness: "Draft" | "Ready for Codex";
  manifestPath: string;
}

export interface ExportIntegrityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileCount: number;
  expectedFileCount: number;
  missingFiles: string[];
  extraFiles: string[];
  unsafePaths: string[];
  duplicatePaths: string[];
  folderMapStatus: "valid" | "invalid";
  generatedAt: string;
  manifestSummary: ExportManifestSummary;
}

const controlCharacters = /[\u0000-\u001f\u007f]/;
const missingMarkerPattern = /\[MISSING:[^\]]+\]/g;

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function hasUnsafeFolderPath(folder: string): boolean {
  if (!folder || folder.startsWith("/") || folder.endsWith("/") || folder.includes("\\") || controlCharacters.test(folder)) {
    return true;
  }
  const segments = folder.split("/");
  return segments.some((segment) =>
    !segment
    || segment === "."
    || segment === ".."
    || !/^[a-zA-Z0-9_-]+$/.test(segment)
  );
}

function hasUnsafeFileName(fileName: string): boolean {
  return !fileName
    || fileName.includes("/")
    || fileName.includes("\\")
    || fileName.includes("..")
    || controlCharacters.test(fileName)
    || normalizeFileName(fileName) !== fileName;
}

export function countMissingMarkers(project: ProjectRecord): number {
  return project.generatedDocuments.reduce((total, document) => {
    const matches = document.content.match(missingMarkerPattern);
    return total + (matches?.length ?? 0);
  }, 0);
}

export function validateExportPackage(
  project: ProjectRecord | null,
  generatedAt = new Date().toISOString()
): ExportIntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFiles: string[] = [];
  const extraFiles: string[] = [];
  const unsafePaths: string[] = [];
  const duplicatePaths: string[] = [];
  const expectedFileCount = GENERATED_FILES.length;

  if (!project) {
    errors.push("No active project is available to export.");
    return {
      isValid: false,
      errors,
      warnings,
      fileCount: 0,
      expectedFileCount,
      missingFiles: [...GENERATED_FILES],
      extraFiles,
      unsafePaths,
      duplicatePaths,
      folderMapStatus: "invalid",
      generatedAt,
      manifestSummary: {
        schemaVersion: EXPORT_SCHEMA_VERSION,
        rootFolder: "untitled-project",
        coreFileCount: 0,
        missingMarkerCount: 0,
        readiness: "Draft",
        manifestPath: EXPORT_MANIFEST_PATH
      }
    };
  }

  const documents = project.generatedDocuments;
  const rootFolder = sanitizeProjectFolderName(project.identity.projectName);
  const expectedLocations = new Map<string, string>(
    DOCUMENT_LOCATIONS.map((location) => [location.fileName, location.folder])
  );
  const actualNames = new Set(documents.map((document) => document.fileName));
  const pathCounts = new Map<string, number>();
  let folderMapStatus: ExportIntegrityResult["folderMapStatus"] = "valid";

  if (documents.length === 0) errors.push("Generate the project package before exporting.");

  for (const fileName of GENERATED_FILES) {
    if (!actualNames.has(fileName)) missingFiles.push(fileName);
  }

  for (const document of documents) {
    const rawPath = document.folder ? `${document.folder}/${document.fileName}` : document.fileName;
    const expectedFolder = expectedLocations.get(document.fileName);

    if (!expectedFolder) extraFiles.push(document.fileName);
    else if (document.folder !== expectedFolder) {
      folderMapStatus = "invalid";
      errors.push(`${document.fileName} must be mapped to ${expectedFolder}.`);
    }

    if (hasUnsafeFolderPath(document.folder) || hasUnsafeFileName(document.fileName)) {
      unsafePaths.push(rawPath);
    }

    const normalizedPath = `${document.folder}/${normalizeFileName(document.fileName)}`;
    pathCounts.set(normalizedPath, (pathCounts.get(normalizedPath) ?? 0) + 1);

    if (!document.content.trim()) errors.push(`${document.fileName} has empty generated content.`);
  }

  for (const [path, count] of pathCounts) {
    if (count > 1) duplicatePaths.push(path);
  }

  if (missingFiles.length > 0) errors.push(`${missingFiles.length} required generated file(s) are missing.`);
  if (extraFiles.length > 0) errors.push(`${extraFiles.length} unexpected generated file(s) were found.`);
  if (unsafePaths.length > 0) errors.push(`${unsafePaths.length} unsafe export path(s) were found.`);
  if (duplicatePaths.length > 0) errors.push(`${duplicatePaths.length} duplicate export path(s) were found.`);
  if (documents.length !== expectedFileCount) {
    errors.push(`Expected ${expectedFileCount} generated documents but found ${documents.length}.`);
  }

  const missingMarkerCount = countMissingMarkers(project);
  const readiness = validateIntake(project).isValid ? "Ready for Codex" : "Draft";
  if (missingMarkerCount > 0) {
    warnings.push(`${missingMarkerCount} missing-information marker(s) will remain in the export.`);
  }
  if (readiness === "Draft") {
    warnings.push("Package readiness is Draft because required intake information is still missing.");
  }
  const sourceName = project.identity.projectName.trim();
  if (!sourceName || rootFolder !== sourceName.toLowerCase().replace(/\s+/g, "-")) {
    warnings.push(`The ZIP root folder name will be sanitized as "${rootFolder}".`);
  }

  return {
    isValid: errors.length === 0,
    errors: unique(errors),
    warnings: unique(warnings),
    fileCount: documents.length,
    expectedFileCount,
    missingFiles: unique(missingFiles),
    extraFiles: unique(extraFiles),
    unsafePaths: unique(unsafePaths),
    duplicatePaths: unique(duplicatePaths),
    folderMapStatus,
    generatedAt,
    manifestSummary: {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      rootFolder,
      coreFileCount: documents.length,
      missingMarkerCount,
      readiness,
      manifestPath: EXPORT_MANIFEST_PATH
    }
  };
}

export function getStableCoreDocuments(project: ProjectRecord) {
  const documentsByName = new Map(project.generatedDocuments.map((document) => [document.fileName, document]));
  return DOCUMENT_LOCATIONS.map((location) => ({
    ...documentsByName.get(location.fileName)!,
    fileName: location.fileName,
    folder: location.folder,
    path: `${location.folder}/${location.fileName}`
  }));
}

export function getStableFolderSummary() {
  return PROJECT_FOLDERS.map((folder) => ({
    folder,
    coreFileCount: DOCUMENT_LOCATIONS.filter((location) => location.folder === folder).length
  }));
}
