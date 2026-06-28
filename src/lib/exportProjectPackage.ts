import JSZip from "jszip";
import type { ProjectPackage } from "../types/project";

export async function createProjectArchive(projectPackage: ProjectPackage): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder(projectPackage.rootFolder);
  if (!root) throw new Error("Unable to create the project export folder.");

  projectPackage.folders.forEach((folder) => root.folder(folder));
  projectPackage.documents.forEach((document) => {
    const path = document.folder ? `${document.folder}/${document.fileName}` : document.fileName;
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
