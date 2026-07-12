import { CORE_DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createProject } from "../lib/createProject";
import {
  expectedDocumentLocations,
  expectedPowerPlatformDocuments,
  isCanvasProject,
  isLegacyMicrosoftProject,
  isModelDrivenProject,
  requiresDataverseLicensing,
  requiresInternalColumnNames,
  requiresLogicalNames,
  usesDataverse,
  usesMultipleDataSources,
  usesOtherConnector,
  usesSharePoint
} from "../lib/powerPlatform";

describe("power platform foundation", () => {
  it("creates connector-neutral canvas defaults", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });

    expect(isCanvasProject(project)).toBe(true);
    expect(project.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
    expect(project.powerPlatform?.common.connectors).toEqual([]);
    expect(usesDataverse(project)).toBe(false);
    expect(requiresDataverseLicensing(project)).toBe(false);
  });

  it("creates model-driven defaults without confirmed dataverse or licensing", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });

    expect(isModelDrivenProject(project)).toBe(true);
    expect(project.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
    expect(project.powerPlatform?.modelDriven?.modelDrivenLicensingStatus).toBe("missingInformation");
    expect(requiresDataverseLicensing(project)).toBe(true);
    expect(requiresLogicalNames(project)).toBe(true);
  });

  it("keeps legacy microsoft project type loadable", () => {
    const project = createProject({ intake: { appType: "microsoft365" } });
    expect(isLegacyMicrosoftProject(project)).toBe(true);
  });

  it("retains core docs for non-power-platform projects", () => {
    const project = createProject({ intake: { appType: "webApplication" } });
    const docs = expectedDocumentLocations(project);
    expect(docs).toEqual(CORE_DOCUMENT_LOCATIONS);
  });

  it("selects sharepoint documents for sharepoint-only canvas projects", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.secondaryConnectorIds = [];

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);

    expect(usesSharePoint(project)).toBe(true);
    expect(requiresInternalColumnNames(project)).toBe(true);
    expect(fileNames).toContain("SHAREPOINT_SCHEMA.md");
    expect(fileNames).toContain("INTERNAL_COLUMN_NAMES.md");
    expect(fileNames).not.toContain("DATAVERSE_SCHEMA.md");
    expect(fileNames).not.toContain("LOGICAL_NAMES.md");
  });

  it("selects dataverse documents for dataverse-only canvas projects", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);

    expect(usesDataverse(project)).toBe(true);
    expect(fileNames).toContain("DATAVERSE_SCHEMA.md");
    expect(fileNames).toContain("LOGICAL_NAMES.md");
    expect(fileNames).not.toContain("SHAREPOINT_SCHEMA.md");
    expect(fileNames).not.toContain("INTERNAL_COLUMN_NAMES.md");
  });

  it("selects both backend document groups for mixed canvas projects", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.common.connectors = [{
      id: "dv",
      displayName: "Dataverse",
      purpose: "data",
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
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.secondaryConnectorIds = ["dv"];

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);

    expect(usesMultipleDataSources(project)).toBe(true);
    expect(fileNames).toContain("SHAREPOINT_SCHEMA.md");
    expect(fileNames).toContain("INTERNAL_COLUMN_NAMES.md");
    expect(fileNames).toContain("DATAVERSE_SCHEMA.md");
    expect(fileNames).toContain("LOGICAL_NAMES.md");
  });

  it("selects connector schema for other-connector canvas projects", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "otherConnector";

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);
    expect(usesOtherConnector(project)).toBe(true);
    expect(fileNames).toContain("CONNECTOR_SCHEMA.md");
  });

  it("selects model-driven dataverse and model-driven document groups", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);

    expect(fileNames).toEqual(expect.arrayContaining([
      "DATAVERSE_SCHEMA.md",
      "LOGICAL_NAMES.md",
      "SOLUTION_ARCHITECTURE.md",
      "SECURITY_ROLES.md"
    ]));
  });

  it("never returns duplicate expected document paths", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    const docs = expectedDocumentLocations(project);
    const keys = docs.map((doc) => `${doc.folder}/${doc.fileName}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.some((path) => path.includes("-"))).toBe(false);
  });
});
