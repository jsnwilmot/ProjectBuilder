import { CORE_DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createSeedProject } from "../data/seedProject";
import { expectedDocumentLocations } from "../lib/powerPlatform";
import type { ProjectRecord } from "../types/project";
import {
  clearPersistenceWarning,
  getPersistenceWarning,
  LEGACY_STORAGE_KEY,
  PREVIOUS_STORAGE_KEY,
  STORAGE_KEY,
  archiveProject,
  createProject,
  deleteProject,
  duplicateProject,
  getActiveProject,
  getProjectById,
  listProjects,
  loadStorageState,
  resetStorage,
  restoreProject,
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

class WriteFailStorage extends MemoryStorage {
  override setItem(key: string, value: string) {
    if (key === STORAGE_KEY) {
      throw new Error("quota exceeded");
    }
    super.setItem(key, value);
  }
}

describe("projectRepository", () => {
  it("saves and loads versioned state", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    saveStorageState({ version: 2, activeProjectId: project.identity.id, projects: [project] }, storage);
    const loaded = loadStorageState(storage);
    expect(loaded.version).toBe(2);
    expect(loaded.activeProjectId).toBe(project.identity.id);
    expect(loaded.projects[0].identity.projectName).toBe("Community Services Portal");
    expect(loaded.projects[0].status).toBe("Intake Complete");
  });

  it("recovers safely from invalid localStorage data", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{not-json");
    expect(loadStorageState(storage)).toEqual({ version: 2, activeProjectId: null, projects: [] });
  });

  it("does not fallback to older keys when the current storage key is corrupt", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{broken-json");
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: "previous-id",
      projects: [createProject({ identity: { id: "previous-id", projectName: "Previous" } }, new MemoryStorage())]
    }));

    const loaded = loadStorageState(storage);

    expect(loaded).toEqual({ version: 2, activeProjectId: null, projects: [] });
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).not.toBeNull();
  });

  it("prioritizes the current storage key when both current and previous keys exist", () => {
    const storage = new MemoryStorage();
    const current = createProject({ identity: { id: "current", projectName: "Current" } }, new MemoryStorage());
    const previous = createProject({ identity: { id: "previous", projectName: "Previous" } }, new MemoryStorage());
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, activeProjectId: current.identity.id, projects: [current] }));
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({ version: 1, activeProjectId: previous.identity.id, projects: [previous] }));

    const loaded = loadStorageState(storage);

    expect(loaded.projects).toHaveLength(1);
    expect(loaded.projects[0].identity.id).toBe("current");
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).not.toBeNull();
  });

  it("migrates previous versioned storage into v2 and removes the previous key after a successful write", () => {
    const storage = new MemoryStorage();
    const previous = createProject({ identity: { id: "previous", projectName: "Previous" } }, new MemoryStorage());
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: previous.identity.id,
      projects: [previous]
    }));

    const loaded = loadStorageState(storage);

    expect(loaded.version).toBe(2);
    expect(loaded.projects[0].identity.id).toBe("previous");
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).toBeNull();
  });

  it("migrates a version-1 multi-project store while preserving active project, generated docs, review data, and legacy microsoft type", () => {
    const sourceStorageA = new MemoryStorage();
    const sourceStorageB = new MemoryStorage();

    const projectA = createProject({
      identity: { id: "project-a-stable", projectName: "Project A Stable" },
      client: { clientName: "Client A", businessName: "Business A" },
      intake: { appPurpose: "Track requests", requiredFeatures: "Dashboard" },
      status: "Project Package Generated",
      reviewStatus: "In review",
      now: "2026-07-11T09:00:00.000Z"
    }, sourceStorageA);
    const reviewItem = projectA.reviewItems[0];
    updateReviewItem(projectA.identity.id, reviewItem.id, {
      status: "Not applicable",
      notApplicableReason: "Handled in the source system."
    }, sourceStorageA);
    updateReadinessConfirmation(projectA.identity.id, "scopeReviewed", true, sourceStorageA);
    saveGeneratedDocuments(projectA.identity.id, [
      { fileName: "README.md", folder: "00_Project_Overview", content: "# Preserved" }
    ], sourceStorageA);
    const persistedA = getProjectById(projectA.identity.id, sourceStorageA)!;

    const projectB = createProject({
      identity: { id: "project-b-stable", projectName: "Project B Stable" },
      client: { clientName: "Client B", businessName: "Business B" },
      intake: { appType: "microsoft365", appPurpose: "Legacy flow", workflows: "Approve requests" },
      status: "Intake Complete",
      reviewStatus: "Review needed",
      now: "2026-07-11T09:05:00.000Z"
    }, sourceStorageB);

    const storage = new MemoryStorage();
    storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: projectB.identity.id,
      projects: [persistedA, projectB]
    }));

    const loaded = loadStorageState(storage);
    const loadedA = loaded.projects.find((project) => project.identity.id === "project-a-stable")!;
    const loadedB = loaded.projects.find((project) => project.identity.id === "project-b-stable")!;

    expect(loaded.version).toBe(2);
    expect(loaded.projects).toHaveLength(2);
    expect(loaded.projects.map((project) => project.identity.id)).toEqual(
      expect.arrayContaining(["project-a-stable", "project-b-stable"])
    );
    expect(loaded.activeProjectId).toBe("project-b-stable");
    expect(loadedA.generatedDocuments).toHaveLength(1);
    expect(loadedA.generatedDocuments[0].fileName).toBe("README.md");
    expect(loadedA.packageGeneratedAt).not.toBeNull();
    expect(loadedA.reviewItems.find((item) => item.id === reviewItem.id)?.status).toBe("Not applicable");
    expect(loadedA.readinessConfirmations.scopeReviewed).toBe(true);
    expect(loadedB.intake.appType).toBe("microsoft365");
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).toBeNull();
  });

  it("keeps the previous key when migration cannot write to the current key", () => {
    clearPersistenceWarning();
    try {
      const storage = new WriteFailStorage();
      const previous = createProject({ identity: { id: "previous", projectName: "Previous" } }, new MemoryStorage());
      storage.setItem(PREVIOUS_STORAGE_KEY, JSON.stringify({
        version: 1,
        activeProjectId: previous.identity.id,
        projects: [previous]
      }));

      let loaded: ReturnType<typeof loadStorageState> | undefined;
      expect(() => {
        loaded = loadStorageState(storage);
      }).not.toThrow();

      expect(loaded?.version).toBe(2);
      expect(loaded?.projects[0].identity.id).toBe("previous");
      expect(storage.getItem(PREVIOUS_STORAGE_KEY)).not.toBeNull();
      expect(storage.getItem(STORAGE_KEY)).toBeNull();
      expect((getPersistenceWarning() ?? "").length).toBeGreaterThan(0);
    } finally {
      clearPersistenceWarning();
    }
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
      version: 2,
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
      version: 2,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.intake.appType).toBe("webApplication");
    expect(loaded.intake.brandStatus).toBe("");
    expect(loaded.intake.websitePages).toBe("");
    expect(loaded.archivedAt).toBeNull();
    expect(loaded.sourceProjectId).toBeNull();
    expect(loaded.duplicatedAt).toBeNull();
  });

  it("safely adds client review defaults to older stored projects", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as Record<string, unknown>;
    delete storedProject.reviewItems;
    delete storedProject.readinessConfirmations;
    delete storedProject.packageGeneratedAt;
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
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
      version: 2,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    expect(loadStorageState(storage).projects[0].intake.appType).toBe("");
  });

  it("adds safe Power Platform defaults when loading legacy canvas projects", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as ProjectRecord;
    (storedProject.intake as unknown as Record<string, string>).appType = "Power Apps Canvas App";
    delete (storedProject as unknown as Record<string, unknown>).powerPlatform;
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      activeProjectId: project.identity.id,
      projects: [storedProject]
    }));

    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.intake.appType).toBe("powerAppsCanvas");
    expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
    expect(loaded.powerPlatform?.common.connectors).toEqual([]);
  });

  it("normalizes invalid connector classifications and keeps unknown instead of premium", () => {
    const storage = new MemoryStorage();
    const project = createSeedProject();
    const storedProject = JSON.parse(JSON.stringify(project)) as Record<string, unknown>;
    storedProject.intake = {
      ...(storedProject.intake as Record<string, unknown>),
      appType: "powerAppsCanvas"
    };
    storedProject.powerPlatform = {
      common: {
        connectors: [{
          id: "c1",
          displayName: "Unknown Connector",
          connectorClassification: "invalid-value"
        }]
      },
      canvas: {
        primaryDataSourceType: "invalid-data-source"
      }
    };
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      activeProjectId: "community-services-portal",
      projects: [storedProject]
    }));

    const loaded = loadStorageState(storage).projects[0];
    expect(loaded.powerPlatform?.common.connectors[0].connectorClassification).toBe("unknown");
    expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
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

  it("duplicates a project with a new id, Copy name, lineage, and stale generated output", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "source", projectName: "Client Portal" },
      client: { clientName: "Client" },
      intake: { appPurpose: "Manage client requests" },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Ready" }],
      packageGeneratedAt: "2026-07-01T12:00:00.000Z",
      status: "Ready for Codex",
      now: "2026-07-01T12:00:00.000Z"
    }, storage);

    const duplicated = duplicateProject(source.identity.id, storage, "2026-07-04T12:00:00.000Z")!;
    const state = loadStorageState(storage);
    const persistedSource = state.projects.find((project) => project.identity.id === source.identity.id)!;

    expect(duplicated.identity.id).not.toBe(source.identity.id);
    expect(duplicated.identity.projectName).toBe("Client Portal Copy");
    expect(duplicated.sourceProjectId).toBe(source.identity.id);
    expect(duplicated.duplicatedAt).toBe("2026-07-04T12:00:00.000Z");
    expect(duplicated.createdAt).toBe("2026-07-04T12:00:00.000Z");
    expect(duplicated.updatedAt).toBe("2026-07-04T12:00:00.000Z");
    expect(duplicated.generatedDocuments).toEqual([]);
    expect(duplicated.packageGeneratedAt).toBeNull();
    expect(duplicated.status).toBe("Intake Started");
    expect(duplicated.client).toEqual(source.client);
    expect(duplicated.intake).toEqual(source.intake);
    expect(state.activeProjectId).toBe(duplicated.identity.id);
    expect(state.projects).toHaveLength(2);
    expect(persistedSource.generatedDocuments).toHaveLength(1);
    expect(persistedSource.identity.projectName).toBe("Client Portal");
  });

  it("duplicates Power Platform details with deep copy semantics and reset implementation progress", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "canvas-source", projectName: "Canvas Source" },
      intake: { appType: "powerAppsCanvas" }
    }, storage);
    updateProject(source.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        common: {
          ...current.powerPlatform!.common,
          connectors: [{
            id: "sp",
            displayName: "SharePoint",
            purpose: "Data",
            dataSourceName: "Main List",
            dataSourceType: "sharePointList",
            connectorClassification: "standard",
            classificationConfirmed: true,
            licenceRequirement: "Included",
            licensingConfirmed: true,
            authenticationMethod: "AAD",
            gatewayRequirement: "None",
            environmentRequirement: "Default",
            dlpImpact: "Low",
            delegationSupport: "Partial",
            expectedRecordVolume: "1000",
            supportedOperations: { read: true },
            offlineSupport: "No",
            securityNotes: "",
            limitations: "",
            approvalStatus: "approved"
          }]
        },
        canvas: {
          ...current.powerPlatform!.canvas!,
          primaryDataSourceType: "sharePointList",
          sharePointLists: "Main List",
          secondaryConnectorIds: ["sp"],
          powerFxStatus: "Complete",
          yamlStatus: "Ready",
          manualInstallationStatus: "Installed",
          studioValidationStatus: "Validated",
          publicationStatus: "Published",
          deploymentStatus: "Deployed"
        },
        progress: {
          ...current.powerPlatform!.progress,
          connectorSelection: "confirmed",
          securityReview: "ready",
          canvas: {
            ...current.powerPlatform!.progress.canvas,
            sharePointSchema: "confirmed",
            powerFx: "confirmed",
            yaml: "confirmed"
          }
        }
      }
    }), storage);

    const duplicated = duplicateProject(source.identity.id, storage)!;

    expect(duplicated.intake.appType).toBe("powerAppsCanvas");
    expect(duplicated.powerPlatform?.canvas?.primaryDataSourceType).toBe("sharePointList");
    expect(duplicated.powerPlatform?.canvas?.sharePointLists).toBe("Main List");
    expect(duplicated.powerPlatform?.common.connectors[0].licenceRequirement).toBe("Included");
    expect(duplicated.powerPlatform?.common.connectors).toHaveLength(1);
    expect(duplicated.powerPlatform?.progress.connectorSelection).toBe("reviewNeeded");
    expect(duplicated.powerPlatform?.progress.securityReview).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.canvas.sharePointSchema).toBe("reviewNeeded");
    expect(duplicated.powerPlatform?.progress.canvas.powerFx).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.canvas.yaml).toBe("notStarted");
    expect(duplicated.powerPlatform?.canvas?.powerFxStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.yamlStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.manualInstallationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.studioValidationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.publicationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.deploymentStatus).toBe("");
    expect(duplicated.generatedDocuments).toEqual([]);
    expect(duplicated.packageGeneratedAt).toBeNull();

    const sourcePersisted = getProjectById(source.identity.id, storage)!;
    expect(duplicated.powerPlatform?.common.connectors).not.toBe(sourcePersisted.powerPlatform?.common.connectors);
    expect(duplicated.powerPlatform?.common.connectors[0].supportedOperations).not.toBe(
      sourcePersisted.powerPlatform?.common.connectors[0].supportedOperations
    );
    expect(duplicated.powerPlatform?.canvas?.secondaryConnectorIds).not.toBe(
      sourcePersisted.powerPlatform?.canvas?.secondaryConnectorIds
    );

    duplicated.powerPlatform!.common.connectors[0].displayName = "Mutated";
    expect(getProjectById(source.identity.id, storage)?.powerPlatform?.common.connectors[0].displayName).toBe("SharePoint");
  });

  it("duplicates a dataverse-backed canvas project with requirements preserved and implementation progress reset", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "canvas-dataverse-source", projectName: "Canvas Dataverse Source" },
      intake: { appType: "powerAppsCanvas" }
    }, storage);
    updateProject(source.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        common: {
          ...current.powerPlatform!.common,
          connectors: [{
            id: "dv",
            displayName: "Dataverse",
            purpose: "Primary backend",
            dataSourceName: "Dataverse",
            dataSourceType: "dataverse",
            connectorClassification: "premium",
            classificationConfirmed: true,
            licenceRequirement: "Per app plan",
            licensingConfirmed: true,
            authenticationMethod: "AAD",
            gatewayRequirement: "None",
            environmentRequirement: "Managed",
            dlpImpact: "Review",
            delegationSupport: "Full",
            expectedRecordVolume: "50000",
            supportedOperations: { read: true, create: true, update: true },
            offlineSupport: "Limited",
            securityNotes: "Environment isolation",
            limitations: "",
            approvalStatus: "approved"
          }]
        },
        canvas: {
          ...current.powerPlatform!.canvas!,
          primaryDataSourceType: "dataverse",
          dataverseTables: "Accounts, Cases",
          logicalNameStatus: "Confirmed logical names",
          secondaryConnectorIds: ["dv"],
          powerFxStatus: "Done",
          yamlStatus: "Done",
          manualInstallationStatus: "Installed",
          studioValidationStatus: "Validated",
          publicationStatus: "Published",
          deploymentStatus: "Deployed"
        },
        progress: {
          ...current.powerPlatform!.progress,
          schema: "confirmed",
          canvas: {
            ...current.powerPlatform!.progress.canvas,
            dataverseSchema: "confirmed",
            logicalNames: "confirmed",
            powerFx: "confirmed",
            yaml: "confirmed"
          }
        }
      }
    }), storage);

    const duplicated = duplicateProject(source.identity.id, storage)!;
    const persistedSource = getProjectById(source.identity.id, storage)!;

    expect(duplicated.intake.appType).toBe("powerAppsCanvas");
    expect(duplicated.powerPlatform?.canvas?.primaryDataSourceType).toBe("dataverse");
    expect(duplicated.powerPlatform?.canvas?.dataverseTables).toBe("Accounts, Cases");
    expect(duplicated.powerPlatform?.common.connectors[0].licenceRequirement).toBe("Per app plan");
    expect(duplicated.powerPlatform?.progress.canvas.dataverseSchema).toBe("reviewNeeded");
    expect(duplicated.powerPlatform?.progress.canvas.logicalNames).toBe("reviewNeeded");
    expect(duplicated.powerPlatform?.progress.canvas.powerFx).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.canvas.yaml).toBe("notStarted");
    expect(duplicated.powerPlatform?.canvas?.powerFxStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.yamlStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.manualInstallationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.studioValidationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.publicationStatus).toBe("");
    expect(duplicated.powerPlatform?.canvas?.deploymentStatus).toBe("");
    expect(duplicated.powerPlatform?.common.connectors).not.toBe(persistedSource.powerPlatform?.common.connectors);
    expect(duplicated.powerPlatform?.canvas).not.toBe(persistedSource.powerPlatform?.canvas);
    expect(duplicated.powerPlatform?.canvas?.secondaryConnectorIds).not.toBe(
      persistedSource.powerPlatform?.canvas?.secondaryConnectorIds
    );
  });

  it("duplicates a model-driven project with requirements preserved and implementation progress reset", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "model-source", projectName: "Model Source" },
      intake: { appType: "powerAppsModelDriven" }
    }, storage);
    updateProject(source.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        common: {
          ...current.powerPlatform!.common,
          publisherName: "Contoso",
          publisherPrefix: "cts",
          licensingStatus: "Model-driven license required",
          connectors: [{
            id: "dv",
            displayName: "Dataverse",
            purpose: "Model data",
            dataSourceName: "Dataverse",
            dataSourceType: "dataverse",
            connectorClassification: "premium",
            classificationConfirmed: true,
            licenceRequirement: "Per user",
            licensingConfirmed: true,
            authenticationMethod: "AAD",
            gatewayRequirement: "None",
            environmentRequirement: "Managed",
            dlpImpact: "Review",
            delegationSupport: "Full",
            expectedRecordVolume: "200000",
            supportedOperations: { read: true, create: true, update: true, delete: true },
            offlineSupport: "No",
            securityNotes: "Role based",
            limitations: "",
            approvalStatus: "approved"
          }]
        },
        modelDriven: {
          ...current.powerPlatform!.modelDriven!,
          dataverseAvailability: "Dataverse available",
          modelDrivenLicensingStatus: "Confirmed licensing note",
          solutionArchitecture: "Managed solution architecture",
          tables: "Accounts;Cases",
          columns: "Name;Priority",
          relationships: "Account to Case",
          forms: "Main form",
          views: "Active view",
          securityRoles: "Case Manager",
          automations: "Assignment flow",
          plugins: "Validation plugin",
          customApis: "Submit API",
          pcfControls: "Status control",
          environmentVariables: "EnvFlag",
          connectionReferences: "DataverseConnection",
          manualConfigurationStatus: "Completed",
          testingStatus: "Completed",
          importStatus: "Completed",
          publicationStatus: "Completed",
          deploymentStatus: "Completed",
          solutionSourceStatus: "Exported"
        },
        progress: {
          ...current.powerPlatform!.progress,
          modelDriven: {
            ...current.powerPlatform!.progress.modelDriven,
            solutionComponents: "confirmed",
            solutionValidation: "confirmed",
            solutionImport: "confirmed",
            publication: "confirmed"
          }
        }
      }
    }), storage);

    const duplicated = duplicateProject(source.identity.id, storage)!;
    const persistedSource = getProjectById(source.identity.id, storage)!;

    expect(duplicated.intake.appType).toBe("powerAppsModelDriven");
    expect(duplicated.powerPlatform?.modelDriven?.solutionArchitecture).toBe("Managed solution architecture");
    expect(duplicated.powerPlatform?.modelDriven?.tables).toBe("Accounts;Cases");
    expect(duplicated.powerPlatform?.modelDriven?.columns).toBe("Name;Priority");
    expect(duplicated.powerPlatform?.modelDriven?.relationships).toBe("Account to Case");
    expect(duplicated.powerPlatform?.modelDriven?.forms).toBe("Main form");
    expect(duplicated.powerPlatform?.modelDriven?.views).toBe("Active view");
    expect(duplicated.powerPlatform?.modelDriven?.securityRoles).toBe("Case Manager");
    expect(duplicated.powerPlatform?.modelDriven?.automations).toBe("Assignment flow");
    expect(duplicated.powerPlatform?.modelDriven?.plugins).toBe("Validation plugin");
    expect(duplicated.powerPlatform?.modelDriven?.customApis).toBe("Submit API");
    expect(duplicated.powerPlatform?.modelDriven?.pcfControls).toBe("Status control");
    expect(duplicated.powerPlatform?.modelDriven?.environmentVariables).toBe("EnvFlag");
    expect(duplicated.powerPlatform?.modelDriven?.connectionReferences).toBe("DataverseConnection");
    expect(duplicated.powerPlatform?.common.publisherName).toBe("Contoso");
    expect(duplicated.powerPlatform?.common.publisherPrefix).toBe("cts");
    expect(duplicated.powerPlatform?.common.licensingStatus).toBe("Model-driven license required");
    expect(duplicated.powerPlatform?.progress.modelDriven.solutionComponents).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.modelDriven.solutionValidation).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.modelDriven.solutionImport).toBe("notStarted");
    expect(duplicated.powerPlatform?.progress.modelDriven.publication).toBe("notStarted");
    expect(duplicated.powerPlatform?.modelDriven?.manualConfigurationStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.testingStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.importStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.publicationStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.deploymentStatus).toBe("");
    expect(duplicated.powerPlatform?.modelDriven?.solutionSourceStatus).toBe("");
    expect(duplicated.powerPlatform?.common.connectors).not.toBe(persistedSource.powerPlatform?.common.connectors);
  });

  it("reconciles Power Platform structures when app type changes", () => {
    const storage = new MemoryStorage();
    const source = createProject({
      identity: { id: "transition", projectName: "Transition" },
      intake: { appType: "powerAppsCanvas" }
    }, storage);
    updateProject(source.identity.id, (current) => ({
      ...current,
      powerPlatform: {
        ...current.powerPlatform!,
        common: {
          ...current.powerPlatform!.common,
          connectors: [{
            id: "sp",
            displayName: "SharePoint",
            purpose: "Data",
            dataSourceName: "Main List",
            dataSourceType: "sharePointList",
            connectorClassification: "standard",
            classificationConfirmed: true,
            licenceRequirement: "Included",
            licensingConfirmed: true,
            authenticationMethod: "AAD",
            gatewayRequirement: "None",
            environmentRequirement: "Default",
            dlpImpact: "Low",
            delegationSupport: "Partial",
            expectedRecordVolume: "1000",
            supportedOperations: { read: true },
            offlineSupport: "No",
            securityNotes: "",
            limitations: "",
            approvalStatus: "approved"
          }]
        },
        canvas: {
          ...current.powerPlatform!.canvas!,
          primaryDataSourceType: "sharePointList"
        }
      }
    }), storage);

    updateProjectFields(source.identity.id, { appType: "powerAppsModelDriven" }, storage);
    const modelDriven = getProjectById(source.identity.id, storage)!;
    expect(modelDriven.intake.appType).toBe("powerAppsModelDriven");
    expect(modelDriven.powerPlatform?.canvas).toBeUndefined();
    expect(modelDriven.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
    expect(modelDriven.powerPlatform?.common.connectors).toHaveLength(1);

    updateProjectFields(source.identity.id, { appType: "powerAppsCanvas" }, storage);
    const canvas = getProjectById(source.identity.id, storage)!;
    expect(canvas.intake.appType).toBe("powerAppsCanvas");
    expect(canvas.powerPlatform?.modelDriven).toBeUndefined();
    expect(canvas.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
  });

  it("uses Untitled Project Copy when duplicating a project without a name", () => {
    const storage = new MemoryStorage();
    const source = createProject({ identity: { id: "untitled" } }, storage);

    expect(duplicateProject(source.identity.id, storage)?.identity.projectName).toBe("Untitled Project Copy");
  });

  it("returns null when saved-project operations target a missing id", () => {
    const storage = new MemoryStorage();

    expect(duplicateProject("missing", storage)).toBeNull();
    expect(archiveProject("missing", storage)).toBeNull();
    expect(restoreProject("missing", storage)).toBeNull();
  });

  it("archives a project without deleting its data and hides it from active selection", () => {
    const storage = new MemoryStorage();
    const first = createProject({
      identity: { id: "first", projectName: "First" },
      intake: { appPurpose: "Preserve this purpose" }
    }, storage);
    const second = createProject({ identity: { id: "second", projectName: "Second" } }, storage);
    setActiveProject(first.identity.id, storage);

    const archived = archiveProject(first.identity.id, storage, "2026-07-04T13:00:00.000Z")!;
    const state = loadStorageState(storage);

    expect(archived.archivedAt).toBe("2026-07-04T13:00:00.000Z");
    expect(archived.intake.appPurpose).toBe("Preserve this purpose");
    expect(state.projects).toHaveLength(2);
    expect(state.projects.find((project) => project.identity.id === first.identity.id)?.archivedAt).toBe(
      "2026-07-04T13:00:00.000Z"
    );
    expect(state.activeProjectId).toBe(second.identity.id);
  });

  it("keeps the active id when archiving another project and clears it when the last active project is archived", () => {
    const storage = new MemoryStorage();
    const first = createProject({ identity: { id: "first", projectName: "First" } }, storage);
    const second = createProject({ identity: { id: "second", projectName: "Second" } }, storage);
    setActiveProject(first.identity.id, storage);

    archiveProject(second.identity.id, storage);
    expect(loadStorageState(storage).activeProjectId).toBe(first.identity.id);

    archiveProject(first.identity.id, storage);
    expect(loadStorageState(storage).activeProjectId).toBeNull();
  });

  it("selects the most recently updated active project when archiving the current project", () => {
    const storage = new MemoryStorage();
    const current = createProject({
      identity: { id: "current", projectName: "Current" },
      now: "2026-07-04T10:00:00.000Z"
    }, storage);
    createProject({
      identity: { id: "newest", projectName: "Newest" },
      now: "2026-07-04T12:00:00.000Z"
    }, storage);
    createProject({
      identity: { id: "older", projectName: "Older" },
      now: "2026-07-04T11:00:00.000Z"
    }, storage);
    setActiveProject(current.identity.id, storage);

    archiveProject(current.identity.id, storage);

    expect(loadStorageState(storage).activeProjectId).toBe("newest");
  });

  it("restores an archived project without changing its saved project data", () => {
    const storage = new MemoryStorage();
    const project = createProject({
      identity: { id: "archived", projectName: "Archived" },
      intake: { appPurpose: "Keep this purpose" },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Saved" }]
    }, storage);
    archiveProject(project.identity.id, storage, "2026-07-04T13:00:00.000Z");

    const restored = restoreProject(project.identity.id, storage, "2026-07-04T14:00:00.000Z")!;

    expect(restored.archivedAt).toBeNull();
    expect(restored.updatedAt).toBe("2026-07-04T14:00:00.000Z");
    expect(restored.intake.appPurpose).toBe("Keep this purpose");
    expect(restored.generatedDocuments).toEqual(project.generatedDocuments);
    expect(restored.reviewItems).toEqual(project.reviewItems);
    expect(restored.readinessConfirmations).toEqual(project.readinessConfirmations);
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
    storage.setItem(PREVIOUS_STORAGE_KEY, "{\"version\":1,\"projects\":[]}");
    storage.setItem(LEGACY_STORAGE_KEY, "{\"intake\":{\"appName\":\"Legacy\"}}");
    expect(resetStorage(storage)).toEqual({ version: 2, activeProjectId: null, projects: [] });
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(PREVIOUS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  describe("project-type transition matrix", () => {
    it("supports web application to canvas transition with connector-neutral defaults", () => {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "transition-web-canvas", projectName: "Web to Canvas" },
        intake: { appType: "webApplication" }
      }, storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsCanvas" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.canvas).toBeDefined();
      expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
      expect(loaded.powerPlatform?.common.connectors).toEqual([]);
      expect(loaded.powerPlatform?.common.connectors.some((connector) => connector.connectorClassification === "premium")).toBe(false);
    });

    it("supports web application to model-driven transition with unconfirmed defaults", () => {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "transition-web-model", projectName: "Web to Model" },
        intake: { appType: "webApplication" }
      }, storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsModelDriven" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.modelDriven).toBeDefined();
      expect(loaded.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
      expect(loaded.powerPlatform?.modelDriven?.modelDrivenLicensingStatus).toBe("missingInformation");
    });

    it("supports canvas to model-driven transition without carrying canvas progress", () => {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "transition-canvas-model", projectName: "Canvas to Model" },
        intake: { appType: "powerAppsCanvas" }
      }, storage);
      updateProject(project.identity.id, (current) => ({
        ...current,
        powerPlatform: {
          ...current.powerPlatform!,
          common: {
            ...current.powerPlatform!.common,
            appOwner: "Owner",
            connectors: [{
              id: "sp",
              displayName: "SharePoint",
              purpose: "Data",
              dataSourceName: "Main",
              dataSourceType: "sharePointList",
              connectorClassification: "standard",
              classificationConfirmed: true,
              licenceRequirement: "Included",
              licensingConfirmed: true,
              authenticationMethod: "AAD",
              gatewayRequirement: "None",
              environmentRequirement: "Default",
              dlpImpact: "Low",
              delegationSupport: "Partial",
              expectedRecordVolume: "500",
              supportedOperations: { read: true },
              offlineSupport: "No",
              securityNotes: "",
              limitations: "",
              approvalStatus: "approved"
            }]
          },
          progress: {
            ...current.powerPlatform!.progress,
            canvas: {
              ...current.powerPlatform!.progress.canvas,
              sharePointSchema: "confirmed",
              powerFx: "confirmed"
            }
          }
        }
      }), storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsModelDriven" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.canvas).toBeUndefined();
      expect(loaded.powerPlatform?.modelDriven).toBeDefined();
      expect(loaded.powerPlatform?.common.appOwner).toBe("Owner");
      expect(loaded.powerPlatform?.common.connectors).toHaveLength(1);
      expect(loaded.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
      expect(loaded.powerPlatform?.modelDriven?.modelDrivenLicensingStatus).toBe("missingInformation");
      expect(loaded.powerPlatform?.progress.modelDriven.solutionValidation).toBe("notStarted");
    });

    it("supports model-driven to canvas transition with undecided backend and no premium assumptions", () => {
      const storage = new MemoryStorage();
      const project = createProject({
        identity: { id: "transition-model-canvas", projectName: "Model to Canvas" },
        intake: { appType: "powerAppsModelDriven" }
      }, storage);
      updateProject(project.identity.id, (current) => ({
        ...current,
        powerPlatform: {
          ...current.powerPlatform!,
          common: {
            ...current.powerPlatform!.common,
            connectors: [{
              id: "dv",
              displayName: "Dataverse",
              purpose: "Data",
              dataSourceName: "Dataverse",
              dataSourceType: "dataverse",
              connectorClassification: "unknown",
              classificationConfirmed: false,
              licenceRequirement: "",
              licensingConfirmed: false,
              authenticationMethod: "",
              gatewayRequirement: "",
              environmentRequirement: "",
              dlpImpact: "",
              delegationSupport: "",
              expectedRecordVolume: "",
              supportedOperations: {},
              offlineSupport: "",
              securityNotes: "",
              limitations: "",
              approvalStatus: ""
            }]
          },
          modelDriven: {
            ...current.powerPlatform!.modelDriven!,
            dataverseAvailability: "Confirmed"
          }
        }
      }), storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsCanvas" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.modelDriven).toBeUndefined();
      expect(loaded.powerPlatform?.canvas).toBeDefined();
      expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
      expect(loaded.powerPlatform?.common.connectors.some((connector) => connector.connectorClassification === "premium")).toBe(false);
    });

    it("supports canvas to web application transition and clears power platform data", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage);

      updateProjectFields(project.identity.id, { appType: "webApplication" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform).toBeUndefined();
      expect(expectedDocumentLocations(loaded)).toEqual(CORE_DOCUMENT_LOCATIONS);
    });

    it("supports model-driven to business website transition and clears power platform data", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsModelDriven" } }, storage);

      updateProjectFields(project.identity.id, { appType: "businessWebsite" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform).toBeUndefined();
      expect(expectedDocumentLocations(loaded)).toEqual(CORE_DOCUMENT_LOCATIONS);
    });

    it("supports canvas to legacy microsoft transition with common-only structure", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage);

      updateProjectFields(project.identity.id, { appType: "microsoft365" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform).toBeDefined();
      expect(loaded.powerPlatform?.common).toBeDefined();
      expect(loaded.powerPlatform?.canvas).toBeUndefined();
      expect(loaded.powerPlatform?.modelDriven).toBeUndefined();
      expect(loaded.powerPlatform?.common.connectors.some((connector) => connector.connectorClassification === "premium")).toBe(false);
    });

    it("supports model-driven to legacy microsoft transition with common-only structure", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsModelDriven" } }, storage);

      updateProjectFields(project.identity.id, { appType: "microsoft365" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform).toBeDefined();
      expect(loaded.powerPlatform?.common).toBeDefined();
      expect(loaded.powerPlatform?.canvas).toBeUndefined();
      expect(loaded.powerPlatform?.modelDriven).toBeUndefined();
    });

    it("supports canvas to canvas updates without discarding compatible data", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage);
      updateProject(project.identity.id, (current) => ({
        ...current,
        powerPlatform: {
          ...current.powerPlatform!,
          canvas: {
            ...current.powerPlatform!.canvas!,
            primaryDataSourceType: "sharePointList",
            sharePointLists: "Main List"
          }
        }
      }), storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsCanvas" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.canvas?.primaryDataSourceType).toBe("sharePointList");
      expect(loaded.powerPlatform?.canvas?.sharePointLists).toBe("Main List");
    });

    it("supports model-driven to model-driven updates without discarding compatible data", () => {
      const storage = new MemoryStorage();
      const project = createProject({ intake: { appType: "powerAppsModelDriven" } }, storage);
      updateProject(project.identity.id, (current) => ({
        ...current,
        powerPlatform: {
          ...current.powerPlatform!,
          modelDriven: {
            ...current.powerPlatform!.modelDriven!,
            tables: "Accounts",
            dataverseAvailability: "missingInformation",
            modelDrivenLicensingStatus: "missingInformation"
          }
        }
      }), storage);

      updateProjectFields(project.identity.id, { appType: "powerAppsModelDriven" }, storage);
      const loaded = getProjectById(project.identity.id, storage)!;

      expect(loaded.powerPlatform?.modelDriven?.tables).toBe("Accounts");
      expect(loaded.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
      expect(loaded.powerPlatform?.modelDriven?.modelDrivenLicensingStatus).toBe("missingInformation");
    });
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

      expect(loaded.version).toBe(2);
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

      expect(loadStorageState(storage)).toEqual({ version: 2, activeProjectId: null, projects: [] });
    });

    it("discards an unparsable legacy record instead of crashing", () => {
      const storage = new MemoryStorage();
      storage.setItem(LEGACY_STORAGE_KEY, "{not-valid-json");

      expect(loadStorageState(storage)).toEqual({ version: 2, activeProjectId: null, projects: [] });
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
        expect(loadStorageState()).toEqual({ version: 2, activeProjectId: null, projects: [] });
        expect(() => saveStorageState({ version: 2, activeProjectId: null, projects: [] })).not.toThrow();
        expect(resetStorage()).toEqual({ version: 2, activeProjectId: null, projects: [] });
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
