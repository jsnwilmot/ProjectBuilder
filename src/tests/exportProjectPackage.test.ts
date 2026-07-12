import JSZip from "jszip";
import { DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createProject } from "../lib/createProject";
import {
  createProjectArchive,
  ExportIntegrityError,
  getExpectedArchivePaths
} from "../lib/exportProjectPackage";
import {
  createProject as persistProject,
  getActiveProject,
  saveGeneratedDocuments,
  setActiveProject,
  type StorageAdapter
} from "../lib/projectRepository";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import {
  createGeneratedProject,
  createLargeGeneratedProject
} from "./helpers/generatedProject";

class MemoryStorage implements StorageAdapter {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

async function blobToArchive(blob: Blob) {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
  return JSZip.loadAsync(bytes);
}

describe("createProjectArchive", () => {
  it("includes the exact deterministic path list and both manifests", async () => {
    const project = createGeneratedProject();
    const options = { exportedAt: "2026-06-28T18:00:00.000Z" };
    const first = await blobToArchive(await createProjectArchive(project, options));
    const second = await blobToArchive(await createProjectArchive(project, options));
    const firstPaths = Object.keys(first.files);
    const secondPaths = Object.keys(second.files);

    expect(firstPaths).toEqual(getExpectedArchivePaths(project));
    expect(secondPaths).toEqual(firstPaths);
    expect(first.file(`${firstPaths[0]}00_Project_Overview/EXPORT_MANIFEST.md`)).not.toBeNull();
    expect(first.file(`${firstPaths[0]}project-manifest.json`)).not.toBeNull();

    const manifest = JSON.parse(
      await first.file(`${firstPaths[0]}project-manifest.json`)!.async("string")
    ) as { files: unknown[]; generatedDocumentCount: number; packageSchemaVersion: number };
    expect(manifest.files).toHaveLength(DOCUMENT_LOCATIONS.length);
    expect(manifest.generatedDocumentCount).toBe(DOCUMENT_LOCATIONS.length);
    expect(manifest.packageSchemaVersion).toBe(2);
    const clientQuestions = await first.file(
      `${firstPaths[0]}01_Requirements/CLIENT_QUESTIONS.md`
    )!.async("string");
    const handoffChecklist = await first.file(
      `${firstPaths[0]}00_Project_Overview/HANDOFF_CHECKLIST.md`
    )!.async("string");
    expect(clientQuestions).toContain("## Questions grouped for client review");
    expect(handoffChecklist).toContain("## Required handoff checks");
    expect(firstPaths.some((path) => path.includes("16-document"))).toBe(false);
  });

  it("fails safely before generation instead of creating an empty ZIP", async () => {
    const project = createProject({ identity: { projectName: "Not generated" } });
    await expect(createProjectArchive(project)).rejects.toBeInstanceOf(ExportIntegrityError);
  });

  it("fails safely when a package contains an unsafe path", async () => {
    const project = createGeneratedProject();
    project.generatedDocuments[0] = {
      ...project.generatedDocuments[0],
      folder: "../00_Project_Overview"
    };
    await expect(createProjectArchive(project)).rejects.toMatchObject({
      name: "ExportIntegrityError"
    });
  });

  it("exports a large project with a sanitized root and preserved missing markers", async () => {
    const project = createLargeGeneratedProject();
    const archive = await blobToArchive(await createProjectArchive(project, {
      exportedAt: "2026-06-28T18:00:00.000Z"
    }));
    const paths = Object.keys(archive.files);
    const root = paths[0];
    expect(root).not.toMatch(/[\\]/);
    expect(paths).toHaveLength(getExpectedArchivePaths(project).length);
    const scope = await archive.file(`${root}00_Project_Overview/PROJECT_SCOPE.md`)!.async("string");
    expect(scope.length).toBeGreaterThan(1000);
    expect(scope).toContain("[MISSING:");
  });

  it("exports only the active project's persisted documents after switching projects", async () => {
    const storage = new MemoryStorage();
    const projectA = persistProject({
      identity: { id: "project-a", projectName: "Project A" },
      client: { clientName: "Client A" }
    }, storage);
    const projectB = persistProject({
      identity: { id: "project-b", projectName: "Project B" },
      client: { clientName: "Client B" }
    }, storage);
    saveGeneratedDocuments(projectA.identity.id, generateProjectPackage(projectA).documents, storage);
    saveGeneratedDocuments(projectB.identity.id, generateProjectPackage(projectB).documents, storage);
    setActiveProject(projectB.identity.id, storage);

    const active = getActiveProject(storage)!;
    const archive = await blobToArchive(await createProjectArchive(active, {
      exportedAt: "2026-06-28T18:00:00.000Z"
    }));
    const root = Object.keys(archive.files)[0];
    const readme = await archive.file(`${root}00_Project_Overview/README.md`)!.async("string");

    expect(active.identity.id).toBe(projectB.identity.id);
    expect(readme).toContain("Project B");
    expect(readme).not.toContain("Project A");
    expect(getActiveProject(storage)!.generatedDocuments).toHaveLength(DOCUMENT_LOCATIONS.length);
  });
});
