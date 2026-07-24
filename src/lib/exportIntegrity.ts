import { CORE_DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../data/folderStructure";
import type { ProjectRecord } from "../types/project";
import { normalizeFileName, sanitizeProjectFolderName } from "./documentHelpers";
import { countPackageMissingMarkers } from "./documentReview";
import { expectedDocumentLocations } from "./powerPlatform";
import { documentTemplates } from "../templates/documents";
import { orphanMissingMarkers } from "./canvasTraceability";
import {
  evaluateGeneratedPackageReadiness,
  PROHIBITED_GENERATED_CONTENT_PATTERNS
} from "./generatedPackageReadiness";

export const EXPORT_MANIFEST_PATH = "00_Project_Overview/EXPORT_MANIFEST.md";
export const EXPORT_SCHEMA_VERSION = 3;

export interface ExportManifestSummary {
  schemaVersion: number;
  rootFolder: string;
  expectedFileCount: number;
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

// eslint-disable-next-line no-control-regex -- intentional check for unsafe path characters
const controlCharacters = /[\u0000-\u001f\u007f]/;

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
  return countPackageMissingMarkers(project.generatedDocuments);
}

export function findBlankMarkdownSections(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const sections: Array<{ title: string; body: string[] }> = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) sections.push(current);

  return sections
    .filter((section) => !sectionHasMeaningfulMarkdown(section.body))
    .map((section) => section.title);
}

function sectionHasMeaningfulMarkdown(lines: string[]): boolean {
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed || /^<!--.*-->$/.test(trimmed) || /^#{3,6}\s+/.test(trimmed)) continue;
    if (/^```/.test(trimmed)) {
      const fenceBody: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        fenceBody.push(lines[index]);
        index += 1;
      }
      if (fenceBody.some((line) => line.trim().length > 0)) return true;
      continue;
    }
    if (/^([-*+]|\d+\.)\s*$/.test(trimmed)) continue;
    if (trimmed.includes("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().includes("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      index -= 1;
      if (tableHasData(tableLines)) return true;
      continue;
    }
    if (/^[:\-\s|]+$/.test(trimmed)) continue;
    return true;
  }
  return false;
}

function tableHasData(lines: string[]): boolean {
  const separatorIndex = lines.findIndex((line) => /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line));
  if (separatorIndex === -1) {
    return lines.some((line) => tableCells(line).some((cell) => cell.length > 0));
  }
  return lines.slice(separatorIndex + 1).some((line) => tableCells(line).some((cell) => cell.length > 0));
}

function tableCells(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0 && !/^:?-{2,}:?$/.test(cell));
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
  const expectedLocations = project ? expectedDocumentLocations(project) : CORE_DOCUMENT_LOCATIONS;
  const expectedFiles = expectedLocations.map((location) => location.fileName);
  const expectedPaths = expectedLocations.map((location) => `${location.folder}/${location.fileName}`);
  const expectedFileCount = expectedFiles.length;
  const duplicateExpectedPaths = expectedPaths.filter((path, index) => expectedPaths.indexOf(path) !== index);

  if (!project) {
    errors.push("No active project is available to export.");
    return {
      isValid: false,
      errors,
      warnings,
      fileCount: 0,
      expectedFileCount,
      missingFiles: [...expectedFiles],
      extraFiles,
      unsafePaths,
      duplicatePaths,
      folderMapStatus: "invalid",
      generatedAt,
      manifestSummary: {
        schemaVersion: EXPORT_SCHEMA_VERSION,
        rootFolder: "untitled-project",
        expectedFileCount: 0,
        missingMarkerCount: 0,
        readiness: "Draft",
        manifestPath: EXPORT_MANIFEST_PATH
      }
    };
  }

  const documents = project.generatedDocuments;
  const rootFolder = sanitizeProjectFolderName(project.identity.projectName);
  const expectedLocationMap = new Map<string, string>(
    expectedLocations.map((location) => [location.fileName, location.folder])
  );
  const actualNames = new Set(documents.map((document) => document.fileName));
  const pathCounts = new Map<string, number>();
  const prohibitedFindings: string[] = [];
  let folderMapStatus: ExportIntegrityResult["folderMapStatus"] = "valid";

  if (documents.length === 0) errors.push("Generate the project package before exporting.");

  for (const fileName of expectedFiles) {
    if (!actualNames.has(fileName)) missingFiles.push(fileName);
    if (!documentTemplates[fileName]) errors.push(`${fileName} has no registered document template.`);
  }

  for (const document of documents) {
    const rawPath = document.folder ? `${document.folder}/${document.fileName}` : document.fileName;
    const expectedFolder = expectedLocationMap.get(document.fileName);

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
    for (const { pattern, label } of PROHIBITED_GENERATED_CONTENT_PATTERNS) {
      if (pattern.test(document.content)) prohibitedFindings.push(`${document.fileName} contains prohibited ${label}.`);
    }
    const blankSections = findBlankMarkdownSections(document.content);
    if (blankSections.length > 0) {
      warnings.push(`${document.fileName} contains blank section(s): ${blankSections.join(", ")}.`);
    }
  }

  for (const [path, count] of pathCounts) {
    if (count > 1) duplicatePaths.push(path);
  }

  if (missingFiles.length > 0) errors.push(`${missingFiles.length} required generated file(s) are missing.`);
  if (extraFiles.length > 0) errors.push(`${extraFiles.length} unexpected generated file(s) were found.`);
  if (unsafePaths.length > 0) errors.push(`${unsafePaths.length} unsafe export path(s) were found.`);
  if (duplicatePaths.length > 0) errors.push(`${duplicatePaths.length} duplicate export path(s) were found.`);
  if (duplicateExpectedPaths.length > 0) errors.push(`${duplicateExpectedPaths.length} duplicate expected document path(s) were registered.`);
  if (documents.length !== expectedFileCount) {
    errors.push(`Expected ${expectedFileCount} generated documents but found ${documents.length}.`);
  }

  const missingMarkerCount = countMissingMarkers(project);
  const missingTemplates = expectedFiles.filter((fileName) => !documentTemplates[fileName]);
  const generatedReadiness = evaluateGeneratedPackageReadiness(project, documents, missingTemplates);
  const readiness = generatedReadiness.status;
  for (const finding of prohibitedFindings) {
    if (readiness === "Ready for Codex") errors.push(finding);
    else warnings.push(finding);
  }
  if (missingMarkerCount > 0) {
    const message = `${missingMarkerCount} missing-information marker(s) will remain in the export.`;
    if (readiness === "Ready for Codex") errors.push(`Ready for Codex export is invalid: ${message}`);
    else warnings.push(message);
  }
  if (readiness === "Draft") {
    warnings.push(`Package readiness is Draft because ${generatedReadiness.blockers.length} readiness blocker(s) remain.`);
  }
  const orphanMarkers = orphanMissingMarkers(project, documents);
  if (orphanMarkers.length > 0) {
    errors.push(`${orphanMarkers.length} orphan missing-information marker(s) have no visible intake, derivation, or applicability source.`);
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
      expectedFileCount,
      missingMarkerCount,
      readiness,
      manifestPath: EXPORT_MANIFEST_PATH
    }
  };
}

export function getStableExpectedDocuments(project: ProjectRecord) {
  const documentsByName = new Map(project.generatedDocuments.map((document) => [document.fileName, document]));
  return expectedDocumentLocations(project).map((location) => ({
    ...(documentsByName.get(location.fileName) ?? { content: "" }),
    fileName: location.fileName,
    folder: location.folder,
    path: `${location.folder}/${location.fileName}`
  }));
}

export function getStableFolderSummary(project: ProjectRecord) {
  const expectedByFolder = expectedDocumentLocations(project).reduce((map, location) => {
    map.set(location.folder, (map.get(location.folder) ?? 0) + 1);
    return map;
  }, new Map<string, number>());

  return PROJECT_FOLDERS.map((folder) => ({
    folder,
    expectedFileCount: expectedByFolder.get(folder) ?? 0
  }));
}
