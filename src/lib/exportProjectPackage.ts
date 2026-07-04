import JSZip from "jszip";
import { PROJECT_FOLDERS } from "../data/folderStructure";
import type { ProjectRecord } from "../types/project";
import { normalizeFileName, sanitizeProjectFolderName } from "./documentHelpers";
import {
  EXPORT_MANIFEST_PATH,
  getStableCoreDocuments,
  validateExportPackage,
  type ExportIntegrityResult
} from "./exportIntegrity";
import { createExportManifest, renderExportManifestMarkdown } from "./exportManifest";

export interface CreateArchiveOptions {
  exportedAt?: string;
}

export class ExportIntegrityError extends Error {
  constructor(public readonly integrity: ExportIntegrityResult) {
    super(integrity.errors.join(" ") || "The project package failed export integrity checks.");
    this.name = "ExportIntegrityError";
  }
}

const stableZipDate = new Date("1980-01-01T00:00:00.000Z");

function sanitizeFolderSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function getExpectedArchivePaths(project: ProjectRecord): string[] {
  const root = sanitizeProjectFolderName(project.identity.projectName);
  return [
    `${root}/`,
    ...PROJECT_FOLDERS.map((folder) => `${root}/${folder}/`),
    ...getStableCoreDocuments(project).map((document) => `${root}/${document.path}`),
    `${root}/${EXPORT_MANIFEST_PATH}`,
    `${root}/project-manifest.json`
  ];
}

export async function createProjectArchive(
  project: ProjectRecord,
  options: CreateArchiveOptions = {}
): Promise<Blob> {
  const generatedAt = options.exportedAt ?? new Date().toISOString();
  const integrity = validateExportPackage(project, generatedAt);
  if (!integrity.isValid) throw new ExportIntegrityError(integrity);

  const rootFolder = sanitizeProjectFolderName(project.identity.projectName);
  const zip = new JSZip();
  const fileOptions = { date: stableZipDate };
  const directoryOptions = { dir: true, date: stableZipDate };

  zip.file(`${rootFolder}/`, "", directoryOptions);
  for (const folder of PROJECT_FOLDERS) {
    const safeFolder = sanitizeFolderSegment(folder);
    if (!safeFolder || safeFolder !== folder) {
      throw new ExportIntegrityError({
        ...integrity,
        isValid: false,
        errors: [...integrity.errors, `Approved folder "${folder}" is unsafe.`],
        unsafePaths: [...integrity.unsafePaths, folder],
        folderMapStatus: "invalid"
      });
    }
    zip.file(`${rootFolder}/${safeFolder}/`, "", directoryOptions);
  }

  for (const document of getStableCoreDocuments(project)) {
    const safeFileName = normalizeFileName(document.fileName);
    const path = `${rootFolder}/${document.folder}/${safeFileName}`;
    zip.file(path, document.content, fileOptions);
  }

  const manifest = createExportManifest(project, integrity);
  zip.file(
    `${rootFolder}/${EXPORT_MANIFEST_PATH}`,
    renderExportManifestMarkdown(manifest),
    fileOptions
  );
  zip.file(
    `${rootFolder}/project-manifest.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
    fileOptions
  );

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "DOS"
  });
}

export function downloadArchive(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  if (/jsdom/i.test(globalThis.navigator?.userAgent ?? "")) {
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 0);
}
