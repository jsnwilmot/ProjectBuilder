import { createSeedProject } from "../data/seedProject";
import type { ProjectRecord } from "../types/project";
import {
  STORAGE_KEY,
  createProject,
  getActiveProject,
  getProjectById,
  loadStorageState,
  resetStorage,
  saveGeneratedDocuments,
  saveStorageState,
  setActiveProject,
  updateProjectFields,
  updateProject,
  updateReadinessConfirmation,
  updateReviewItem,
  type StorageAdapter
} from "../lib/projectRepository";

class MemoryStorage implements StorageAdapter {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("projectRepository", () => {
  it("saves and loads versioned state", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    saveStorageState({ version: 1, activeProjectId: project.identity.id, projects: [project] }, storage);
    const loaded = loadStorageState(storage);
    expect(loaded.version).toBe(1);
    expect(loaded.activeProjectId).toBe(project.identity.id);
    expect(loaded.projects[0].identity.projectName).toBe("Community Services Portal");
    expect(loaded.projects[0].status).toBe("Intake Complete");
  });

  it("recovers safely from invalid localStorage data", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{not-json");
    expect(loadStorageState(storage)).toEqual({ version: 1, activeProjectId: null, projects: [] });
  });

  it("recovers invalid activeProjectId by selecting the first available project", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { id: "first", projectName: "First" } }, storage);
    createProject({ identity: { id: "second", projectName: "Second" } }, storage);

    const state = loadStorageState(storage);
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, activeProjectId: "missing-project" }));

    expect(loadStorageState(storage).activeProjectId).toBe(first.identity.id);
  });

  it("migrates the legacy review label to the canonical review status", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: project.identity.id,
      projects: [{ ...project, reviewStatus: "Needs review" }]
    }));

    expect(loadStorageState(storage).projects[0].reviewStatus).toBe("Review needed");
  });

  it("preserves project type fields and supplies safe defaults for older stored intake", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as ProjectRecord;
    delete (storedProject.intake as unknown as Record<string, string>).brandStatus;
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.intake.appType).toBe("Web application");
    expect(loaded.intake.brandStatus).toBe("");
    expect(loaded.intake.websitePages).toBe("");
  });

  it("safely adds client review defaults to older stored projects", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as Record<string, unknown>;
    delete storedProject.reviewItems;
    delete storedProject.readinessConfirmations;
    delete storedProject.packageGeneratedAt;
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.reviewItems.length).toBeGreaterThan(0);
    expect(loaded.readinessConfirmations).toEqual({});
    expect(loaded.packageGeneratedAt).toBeNull();
  });

  it("requires older free-text app types to be reselected from a supported preset", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as ProjectRecord;
    (storedProject.intake as unknown as Record<string, string>).appType = "Legacy custom app type";
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    expect(loadStorageState(storage).projects[0].intake.appType).toBe("");
  });

  it("creates multiple projects without erasing existing projects and sets the active id", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { projectName: "First" } }, storage);
    const second = createProject({ identity: { projectName: "Second" } }, storage);
    const state = loadStorageState(storage);
    expect(state.projects.map((project) => project.identity.projectName)).toEqual(["First", "Second"]);
    expect(state.activeProjectId).toBe(second.identity.id);
    expect(first.identity.id).not.toBe(second.identity.id);
  });

  it("sets the active project", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { projectName: "First" } }, storage);
    createProject({ identity: { projectName: "Second" } }, storage);
    expect(setActiveProject(first.identity.id, storage)?.identity.id).toBe(first.identity.id);
    expect(getActiveProject(storage)?.identity.projectName).toBe("First");
  });

  it("updates nested fields without losing existing intake", () => {
    const storage = new MemoryStorage();
    const project = createProject({
      identity: { projectName: "Original" },
      intake: { appPurpose: "Keep this purpose", workflows: "Existing workflow" }
    }, storage);
    updateProject(project.identity.id, {
      identity: { ...project.identity, projectName: "Renamed" },
      intake: { ...project.intake, permissions: "Reviewer can approve" }
    }, storage);
    const updated = getProjectById(project.identity.id, storage)!;
    expect(updated.identity.projectName).toBe("Renamed");
    expect(updated.intake.appPurpose).toBe("Keep this purpose");
    expect(updated.intake.workflows).toBe("Existing workflow");
    expect(updated.intake.permissions).toBe("Reviewer can approve");
  });

  it("persists generated documents and derived file count", () => {
    const storage = new MemoryStorage();
    const project = createProject({ identity: { projectName: "Generated project" } }, storage);
    saveGeneratedDocuments(project.identity.id, [
      { fileName: "README.md", folder: "", content: "# Generated" }
    ], storage);
    const loaded = getProjectById(project.identity.id, storage)!;
    expect(loaded.generatedDocuments).toHaveLength(1);
    expect(loaded.generatedFileCount).toBe(1);
    expect(loaded.status).toBe("Project Package Generated");
    expect(loaded.reviewStatus).toBe("Review needed");
  });

  it("keeps generated documents after intake edits", () => {
    const storage = new MemoryStorage();
    const project = createProject({ identity: { projectName: "Generated project" } }, storage);
    saveGeneratedDocuments(project.identity.id, [
      { fileName: "README.md", folder: "", content: "# Generated" }
    ], storage);

    updateProjectFields(project.identity.id, { appPurpose: "Updated purpose" }, storage);
    const loaded = getProjectById(project.identity.id, storage)!;

    expect(loaded.generatedDocuments).toHaveLength(1);
    expect(loaded.generatedFileCount).toBe(1);
    expect(loaded.intake.appPurpose).toBe("Updated purpose");
    expect(loaded.status).toBe("Needs Review");
    expect(loaded.reviewStatus).toBe("Review needed");
    expect(loaded.packageGeneratedAt).toBeNull();
  });

  it("persists review decisions and readiness confirmations", () => {
    const storage = new MemoryStorage();
    const project = createProject({ identity: { projectName: "Client review" } }, storage);
    const reviewItem = project.reviewItems[0];

    updateReviewItem(project.identity.id, reviewItem.id, {
      status: "Not applicable",
      notApplicableReason: "Confirmed outside this project."
    }, storage);
    updateReadinessConfirmation(project.identity.id, "scopeReviewed", true, storage);

    const loaded = getProjectById(project.identity.id, storage)!;
    expect(loaded.reviewItems.find((item) => item.id === reviewItem.id)).toMatchObject({
      status: "Not applicable",
      notApplicableReason: "Confirmed outside this project."
    });
    expect(loaded.readinessConfirmations.scopeReviewed).toBe(true);
  });

  it("replaces generated documents when generation is run again", () => {
    const storage = new MemoryStorage();
    const project = createProject({ identity: { projectName: "Generated project" } }, storage);
    saveGeneratedDocuments(project.identity.id, [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# First" }
    ], storage);

    saveGeneratedDocuments(project.identity.id, [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# Second" },
      { fileName: "PROJECT_SCOPE.md", folder: "00_Project_Overview", content: "# Scope" }
    ], storage);

    const loaded = getProjectById(project.identity.id, storage)!;
    expect(loaded.generatedDocuments).toHaveLength(2);
    expect(loaded.generatedDocuments[0].content).toBe("# Second");
    expect(loaded.generatedFileCount).toBe(2);
    expect(loaded.status).toBe("Project Package Generated");
  });

  it("does not overwrite another project during intake updates", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { projectName: "First" } }, storage);
    const second = createProject({ identity: { projectName: "Second" } }, storage);

    updateProjectFields(first.identity.id, { appPurpose: "First project purpose" }, storage);

    expect(getProjectById(first.identity.id, storage)?.intake.appPurpose).toBe("First project purpose");
    expect(getProjectById(second.identity.id, storage)?.intake.appPurpose).toBe("");
  });

  it("resets storage safely", () => {
    const storage = new MemoryStorage();
    createProject({ identity: { projectName: "Disposable" } }, storage);
    expect(resetStorage(storage)).toEqual({ version: 1, activeProjectId: null, projects: [] });
    expect(loadStorageState(storage).projects).toEqual([]);
  });
});
