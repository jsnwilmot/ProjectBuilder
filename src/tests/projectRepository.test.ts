import { createSeedProject } from "../data/seedProject";
import type { ProjectRecord } from "../types/project";
import {
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
  createProject,
  deleteProject,
  getActiveProject,
  getProjectById,
  listProjects,
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

  describe("legacy project migration", () => {
    it("migrates a legacy single-project record into the versioned store", () => {
      const storage = new MemoryStorage();
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
        intake: {
          appName: "Legacy App",
          clientName: "Legacy Client",
          businessName: "Legacy Business",
          appPurpose: "Track legacy widgets"
        },
        metadata: { id: "legacy-id", status: "Intake Started", reviewStatus: "Review needed" }
      }));

      const loaded = loadStorageState(storage);

      expect(loaded.projects).toHaveLength(1);
      expect(loaded.activeProjectId).toBe(loaded.projects[0].identity.id);
      expect(loaded.projects[0].identity.projectName).toBe("Legacy App");
      expect(loaded.projects[0].client.clientName).toBe("Legacy Client");
      expect(loaded.projects[0].client.businessName).toBe("Legacy Business");
      expect(loaded.projects[0].intake.appPurpose).toBe("Track legacy widgets");
      expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    });

    it("migrates a legacy record with no name fields by falling back to empty defaults", () => {
      const storage = new MemoryStorage();
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({
        intake: { appPurpose: "No names on this legacy record" }
      }));

      const loaded = loadStorageState(storage);

      expect(loaded.projects).toHaveLength(1);
      expect(loaded.projects[0].identity.projectName).toBe("");
      expect(loaded.projects[0].client.clientName).toBe("");
      expect(loaded.projects[0].client.businessName).toBe("");
      expect(loaded.projects[0].intake.appPurpose).toBe("No names on this legacy record");
    });

    it("ignores a legacy record with no intake payload and starts with an empty state", () => {
      const storage = new MemoryStorage();
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ metadata: { id: "orphaned" } }));

      expect(loadStorageState(storage)).toEqual({ version: 1, activeProjectId: null, projects: [] });
    });

    it("discards an unparsable legacy record instead of crashing", () => {
      const storage = new MemoryStorage();
      storage.setItem(LEGACY_STORAGE_KEY, "{not-valid-json");

      expect(loadStorageState(storage)).toEqual({ version: 1, activeProjectId: null, projects: [] });
      expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    });

    it("does not run legacy migration once versioned storage already exists", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Current" } }, storage);
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ intake: { appName: "Should be ignored" } }));

      const loaded = loadStorageState(storage);

      expect(loaded.projects).toHaveLength(1);
      expect(loaded.projects[0].identity.projectName).toBe(project.identity.projectName);
      expect(storage.getItem(LEGACY_STORAGE_KEY)).not.toBeNull();
    });
  });

  describe("default browser storage fallback", () => {
    it("falls back to a safe empty state when window.localStorage is inaccessible", () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new Error("SecurityError: localStorage is disabled in this context");
        }
      });

      try {
        expect(loadStorageState()).toEqual({ version: 1, activeProjectId: null, projects: [] });
        expect(() => saveStorageState({ version: 1, activeProjectId: null, projects: [] })).not.toThrow();
        expect(resetStorage()).toEqual({ version: 1, activeProjectId: null, projects: [] });
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, "localStorage", originalDescriptor);
        }
      }
    });
  });

  describe("not-found and empty-state branches", () => {
    it("returns null from getProjectById when the id does not exist", () => {
      const storage = new MemoryStorage();
      createProject({ identity: { projectName: "Only project" } }, storage);
      expect(getProjectById("missing-id", storage)).toBeNull();
    });

    it("returns null from updateProject when the id does not exist", () => {
      const storage = new MemoryStorage();
      createProject({ identity: { projectName: "Only project" } }, storage);
      expect(updateProject("missing-id", { reviewStatus: "Review needed" }, storage)).toBeNull();
    });

    it("returns null from setActiveProject when the id does not exist and leaves the active id unchanged", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Only project" } }, storage);
      expect(setActiveProject("missing-id", storage)).toBeNull();
      expect(loadStorageState(storage).activeProjectId).toBe(project.identity.id);
    });

    it("returns null from getActiveProject when no project is active", () => {
      const storage = new MemoryStorage();
      expect(getActiveProject(storage)).toBeNull();
    });

    it("keeps project.status when updating review decisions on a project with no generated documents yet", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Draft project" } }, storage);
      const reviewItem = project.reviewItems[0];

      const updated = updateReviewItem(project.identity.id, reviewItem.id, {
        status: "Not applicable",
        notApplicableReason: "Not relevant yet"
      }, storage);

      expect(updated?.status).toBe(project.status);
    });

    it("keeps project.status when confirming readiness on a project with no generated documents yet", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Draft project" } }, storage);

      const updated = updateReadinessConfirmation(project.identity.id, "scopeReviewed", true, storage);

      expect(updated?.status).toBe(project.status);
    });

    it("flags the project as Needs Review when a review decision changes after documents were generated", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Generated project" } }, storage);
      saveGeneratedDocuments(project.identity.id, [
        { fileName: "README.md", folder: "", content: "# Generated" }
      ], storage);
      const reviewItem = project.reviewItems[0];

      const updated = updateReviewItem(project.identity.id, reviewItem.id, {
        status: "Not applicable",
        notApplicableReason: "Confirmed outside this project."
      }, storage);

      expect(updated?.status).toBe("Needs Review");
    });

    it("flags the project as Needs Review when readiness is confirmed after documents were generated", () => {
      const storage = new MemoryStorage();
      const project = createProject({ identity: { projectName: "Generated project" } }, storage);
      saveGeneratedDocuments(project.identity.id, [
        { fileName: "README.md", folder: "", content: "# Generated" }
      ], storage);

      const updated = updateReadinessConfirmation(project.identity.id, "scopeReviewed", true, storage);

      expect(updated?.status).toBe("Needs Review");
    });
  });

  it("lists projects most-recently-updated first", async () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { projectName: "First" } }, storage);
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = createProject({ identity: { projectName: "Second" } }, storage);
    await new Promise((resolve) => setTimeout(resolve, 2));
    updateProjectFields(first.identity.id, { appPurpose: "Touch first most recently" }, storage);

    const listed = listProjects(storage);

    expect(listed.map((project) => project.identity.id)).toEqual([first.identity.id, second.identity.id]);
  });

  describe("deleteProject", () => {
    it("ranks multiple remaining projects by most recently updated when reassigning the active id", async () => {
      const storage = new MemoryStorage();
      const first = createProject({ identity: { projectName: "First" } }, storage);
      const second = createProject({ identity: { projectName: "Second" } }, storage);
      const third = createProject({ identity: { projectName: "Third" } }, storage);
      setActiveProject(third.identity.id, storage);
      await new Promise((resolve) => setTimeout(resolve, 2));
      updateProjectFields(second.identity.id, { appPurpose: "Touch second to make it most recent" }, storage);

      const result = deleteProject(third.identity.id, storage);

      expect(result.projects.map((project) => project.identity.id)).toEqual(
        expect.arrayContaining([first.identity.id, second.identity.id])
      );
      expect(result.activeProjectId).toBe(second.identity.id);
    });

    it("switches the active project to the most recently updated remaining project", async () => {
      const storage = new MemoryStorage();
      const first = createProject({ identity: { projectName: "First" } }, storage);
      const second = createProject({ identity: { projectName: "Second" } }, storage);
      setActiveProject(second.identity.id, storage);
      await new Promise((resolve) => setTimeout(resolve, 2));
      updateProjectFields(first.identity.id, { appPurpose: "Touch first to make it most recent" }, storage);

      const result = deleteProject(second.identity.id, storage);

      expect(result.projects).toHaveLength(1);
      expect(result.activeProjectId).toBe(first.identity.id);
    });

    it("clears the active project id when deleting the last remaining project", () => {
      const storage = new MemoryStorage();
      const only = createProject({ identity: { projectName: "Only project" } }, storage);

      const result = deleteProject(only.identity.id, storage);

      expect(result.projects).toHaveLength(0);
      expect(result.activeProjectId).toBeNull();
    });

    it("leaves the active project id unchanged when deleting a non-active project", () => {
      const storage = new MemoryStorage();
      const first = createProject({ identity: { projectName: "First" } }, storage);
      const second = createProject({ identity: { projectName: "Second" } }, storage);
      setActiveProject(first.identity.id, storage);

      const result = deleteProject(second.identity.id, storage);

      expect(result.projects).toHaveLength(1);
      expect(result.activeProjectId).toBe(first.identity.id);
    });
  });
});
