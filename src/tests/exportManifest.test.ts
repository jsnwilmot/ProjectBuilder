import { DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createProject } from "../lib/createProject";
import { createExportManifest, renderExportManifestMarkdown } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { expectedDocumentLocations } from "../lib/powerPlatform";
import { createGeneratedProject } from "./helpers/generatedProject";

describe("export manifest", () => {
  it("creates a stable diagnostic object and Markdown file", () => {
    const project = createGeneratedProject();
    const integrity = validateExportPackage(project, "2026-06-28T18:00:00.000Z");
    const manifest = createExportManifest(project, integrity);
    const markdown = renderExportManifestMarkdown(manifest);

    expect(manifest.packageSchemaVersion).toBe(3);
    expect(manifest.activeProjectId).toBe(project.identity.id);
    expect(manifest.generatedDocumentCount).toBe(DOCUMENT_LOCATIONS.length);
    expect(manifest.expectedDocumentCount).toBe(DOCUMENT_LOCATIONS.length);
    expect(manifest.files).toHaveLength(DOCUMENT_LOCATIONS.length);
    expect(manifest.readiness).toBe("Draft");
    expect(manifest.files[0]).toEqual({
      fileName: "README.md",
      folder: "00_Project_Overview",
      path: "00_Project_Overview/README.md"
    });
    expect(markdown).toContain("# Export Manifest");
    expect(markdown).toContain("| Exported date | 2026-06-28T18:00:00.000Z |");
    expect(markdown).toContain("| Package readiness | Draft |");
    expect(markdown).toContain("00_Project_Overview/EXPORT_MANIFEST.md");
  });

  it("uses project-aware expected folder counts for conditional document sets", () => {
    const modelDriven = createGeneratedProject(createProject({
      identity: { id: "model", projectName: "Model" },
      intake: { appType: "powerAppsModelDriven" }
    }));

    const manifest = createExportManifest(modelDriven, validateExportPackage(modelDriven, "2026-06-28T18:00:00.000Z"));
    const countsFromFiles = manifest.files.reduce((acc, file) => {
      acc.set(file.folder, (acc.get(file.folder) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

    for (const folder of manifest.folderStructure) {
      expect(folder.expectedFileCount).toBe(countsFromFiles.get(folder.folder) ?? 0);
    }
  });

  it("computes dynamic folder summaries for non-power-platform, canvas backend variants, and model-driven projects", () => {
    const nonPowerPlatform = createGeneratedProject(createProject({
      identity: { id: "std", projectName: "Standard" },
      intake: { appType: "webApplication" }
    }));

    const sharePointSource = createProject({
      identity: { id: "sp", projectName: "SharePoint Canvas" },
      intake: { appType: "powerAppsCanvas" }
    });
    sharePointSource.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    sharePointSource.powerPlatform!.canvas!.sharePointLists = "Main List";
    const sharePointCanvas = createGeneratedProject(sharePointSource);

    const dataverseSource = createProject({
      identity: { id: "dv", projectName: "Dataverse Canvas" },
      intake: { appType: "powerAppsCanvas" }
    });
    dataverseSource.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    dataverseSource.powerPlatform!.canvas!.dataverseTables = "Accounts";
    const dataverseCanvas = createGeneratedProject(dataverseSource);

    const mixedSource = createProject({
      identity: { id: "mix", projectName: "Mixed Canvas" },
      intake: { appType: "powerAppsCanvas" }
    });
    mixedSource.powerPlatform!.common.connectors = [{
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
    }];
    mixedSource.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    mixedSource.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "dataverse"];
    mixedSource.powerPlatform!.canvas!.primaryConnectorId = "sp";
    mixedSource.powerPlatform!.canvas!.secondaryConnectorIds = ["dv"];
    mixedSource.powerPlatform!.common.connectors.unshift({
      id: "sp",
      displayName: "SharePoint",
      purpose: "Primary list",
      dataSourceName: "SharePoint",
      dataSourceType: "sharePointList",
      connectorClassification: "standard",
      classificationConfirmed: true,
      licenceRequirement: "Included",
      licensingConfirmed: true,
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
      canvasRole: "primary",
      approvalStatus: ""
    });
    mixedSource.powerPlatform!.canvas!.sharePointLists = "Main List";
    const mixedCanvas = createGeneratedProject(mixedSource);

    const otherSource = createProject({
      identity: { id: "other", projectName: "Other Connector Canvas" },
      intake: { appType: "powerAppsCanvas" }
    });
    otherSource.powerPlatform!.canvas!.primaryDataSourceType = "otherConnector";
    otherSource.powerPlatform!.canvas!.otherDataSources = "Custom API";
    const otherConnectorCanvas = createGeneratedProject(otherSource);

    const modelDriven = createGeneratedProject(createProject({
      identity: { id: "model", projectName: "Model" },
      intake: { appType: "powerAppsModelDriven" }
    }));

    const scenarios = [
      { name: "standard", project: nonPowerPlatform },
      { name: "sharepoint", project: sharePointCanvas },
      { name: "dataverse", project: dataverseCanvas },
      { name: "mixed", project: mixedCanvas },
      { name: "other", project: otherConnectorCanvas },
      { name: "model", project: modelDriven }
    ];

    for (const scenario of scenarios) {
      const expectedLocations = expectedDocumentLocations(scenario.project);
      const expectedPaths = expectedLocations.map((location) => `${location.folder}/${location.fileName}`);
      expect(new Set(expectedPaths).size).toBe(expectedPaths.length);

      const manifest = createExportManifest(
        scenario.project,
        validateExportPackage(scenario.project, "2026-06-28T18:00:00.000Z")
      );
      const expectedByFolder = expectedLocations.reduce((acc, location) => {
        acc.set(location.folder, (acc.get(location.folder) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());
      const summaryTotal = manifest.folderStructure.reduce((sum, folder) => sum + folder.expectedFileCount, 0);

      expect(summaryTotal).toBe(expectedLocations.length);
      for (const folder of manifest.folderStructure) {
        expect(folder.expectedFileCount).toBe(expectedByFolder.get(folder.folder) ?? 0);
      }
    }

    const sharePointFiles = expectedDocumentLocations(sharePointCanvas).map((location) => location.fileName);
    expect(sharePointFiles).toContain("SHAREPOINT_SCHEMA.md");
    expect(sharePointFiles).not.toContain("DATAVERSE_SCHEMA.md");

    const dataverseFiles = expectedDocumentLocations(dataverseCanvas).map((location) => location.fileName);
    expect(dataverseFiles).toContain("DATAVERSE_SCHEMA.md");
    expect(dataverseFiles).not.toContain("SHAREPOINT_SCHEMA.md");

    const mixedFiles = expectedDocumentLocations(mixedCanvas).map((location) => location.fileName);
    expect(mixedFiles).toContain("SHAREPOINT_SCHEMA.md");
    expect(mixedFiles).toContain("DATAVERSE_SCHEMA.md");

    const otherConnectorFiles = expectedDocumentLocations(otherConnectorCanvas).map((location) => location.fileName);
    expect(otherConnectorFiles).toContain("CONNECTOR_SCHEMA.md");

    const modelFiles = expectedDocumentLocations(modelDriven).map((location) => location.fileName);
    expect(modelFiles).toEqual(expect.arrayContaining([
      "DATAVERSE_SCHEMA.md",
      "SOLUTION_ARCHITECTURE.md",
      "SECURITY_ROLES.md"
    ]));
  });
});
