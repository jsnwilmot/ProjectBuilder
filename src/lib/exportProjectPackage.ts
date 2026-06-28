import JSZip from "jszip";
import type { ProjectPackage } from "../types/project";
import { normalizeFileName } from "./documentHelpers";

export async function createProjectArchive(projectPackage: ProjectPackage): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(projectPackage.rootFolder);
  if (!root) throw new Error("Unable to create the project export folder.");

  projectPackage.folders.forEach((folder) => root.folder(folder));
  projectPackage.documents.forEach((document) => {
    const safeFolder = document.folder
      .split("/")
      .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ""))
      .filter(Boolean)
      .join("/");
    const safeFileName = normalizeFileName(document.fileName);
    const path = safeFolder ? `${safeFolder}/${safeFileName}` : safeFileName;
    root.file(path, document.content);
  });

  root.file("project-manifest.json", JSON.stringify({
    projectName: projectPackage.projectName,
    generatedAt: new Date().toISOString(),
    folders: projectPackage.folders,
    documents: projectPackage.documents.map(({ fileName, folder }) => ({ fileName, folder }))
  }, null, 2));

  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export function downloadArchive(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
