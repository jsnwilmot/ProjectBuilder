import JSZip from "jszip";
import { createSeedProject } from "../data/seedProject";
import { createProjectArchive } from "../lib/exportProjectPackage";
import { generateProjectPackage } from "../lib/generateProjectPackage";

describe("createProjectArchive", () => {
  it("writes the root document, standard folders, and manifest into the ZIP", async () => {
    const projectPackage = generateProjectPackage(createSeedProject());
    const blob = await createProjectArchive(projectPackage);
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    const archive = await JSZip.loadAsync(bytes);
    const root = `${projectPackage.rootFolder}/`;

    expect(archive.file(`${root}00_Project_Overview/README.md`)).not.toBeNull();
    expect(archive.file(`${root}project-manifest.json`)).not.toBeNull();
    expect(archive.file(`${root}11_Codex_Prompts/PHASED_CODEX_PROMPTS.md`)).not.toBeNull();

    const manifest = JSON.parse(
      await archive.file(`${root}project-manifest.json`)!.async("string")
    ) as { documents: unknown[]; folders: unknown[] };
    expect(manifest.documents).toHaveLength(16);
    expect(manifest.folders).toHaveLength(12);
  });

  it("sanitizes unsafe export file paths", async () => {
    const projectPackage = generateProjectPackage(createSeedProject());
    projectPackage.documents.push({
      fileName: "../unsafe/../../name.md",
      folder: "05_Workflows",
      content: "unsafe"
    });

    const blob = await createProjectArchive(projectPackage);
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    const archive = await JSZip.loadAsync(bytes);
    const paths: string[] = [];
    archive.forEach((relativePath) => paths.push(relativePath));

    expect(paths.some((path) => path.includes(".."))).toBe(false);
    expect(paths.some((path) => /\\/.test(path))).toBe(false);
  });
});
