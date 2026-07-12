import { CORE_DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createProject } from "../lib/createProject";
import {
  calculateCanvasDataverseSchemaGate,
  calculateConnectorClassificationGate,
  calculateConnectorSelectionGate,
  calculateAlmGate,
  calculateCanvasDelegationPlanningGate,
  calculateInternalNameGate,
  calculateLicensingGate,
  calculateLogicalNameGate,
  calculateCanvasPowerFxPlanningGate,
  calculateCanvasYamlPlanningGate,
  calculateModelDrivenBusinessLogicGate,
  calculateModelDrivenExtensionsGate,
  calculateModelDrivenFormsAndViewsGate,
  calculateModelDrivenDataverseSchemaGate,
  calculateModelDrivenEligibilityGate,
  calculateModelDrivenExternalConnectorClassificationGate,
  calculateModelDrivenExternalConnectorLicensingGate,
  calculateModelDrivenExternalConnectorSelectionGate,
  calculateModelDrivenNavigationGate,
  calculateModelDrivenSecurityArchitectureGate,
  calculateOtherConnectorSchemaGate,
  calculatePowerPlatformReadiness,
  calculateSharePointSchemaGate,
  createDefaultConnectorField,
  createDefaultConnector,
  createDefaultConnectorResource,
  createDefaultDataverseColumn,
  createDefaultDataverseRelationship,
  createDefaultDataverseTable,
  createDefaultSharePointColumn,
  createDefaultSharePointLibrary,
  createDefaultSharePointList,
  expectedDocumentLocations,
  expectedPowerPlatformDocuments,
  getSelectedCanvasDataSourceTypes,
  isCanvasProject,
  isLegacyMicrosoftProject,
  isModelDrivenProject,
  normalizePowerPlatformData,
  requiresDataverseLicensing,
  requiresInternalColumnNames,
  requiresLogicalNames,
  reconcileCanvasConnectorRoles,
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

  it("keeps canvas readiness blocked until the backend and schema are explicit", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });

    expect(calculateConnectorSelectionGate(project)).toBe("missingInformation");
    expect(calculatePowerPlatformReadiness(project).isReadyForCodex).toBe(false);

    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.sourcePurpose = "Track requests";
    project.powerPlatform!.canvas!.sourceOwnership = "Operations";
    project.powerPlatform!.canvas!.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
    project.powerPlatform!.canvas!.sharePointListDefinitions = "Requests list";
    project.powerPlatform!.canvas!.sharePointColumnDefinitions = "Title / Title / Single line text";
    project.powerPlatform!.canvas!.expectedRecordCounts = "500 active records";
    project.powerPlatform!.canvas!.schemaStatus = "confirmed";
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({
        id: "sp",
        displayName: "SharePoint",
        purpose: "Primary backend",
        dataSourceName: "Requests",
        dataSourceType: "sharePointList",
        canvasRole: "primary",
        connectorClassification: "standard",
        classificationConfirmationStatus: "confirmed",
        licenceRequirement: "Included",
        licensingConfirmationStatus: "confirmed"
      })
    ];

    expect(calculateConnectorSelectionGate(project)).toBe("confirmed");
    expect(calculateSharePointSchemaGate(project)).toBe("reviewNeeded");
    expect(calculateInternalNameGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.canvas!.internalNameStatus = "confirmed";
    expect(calculateInternalNameGate(project)).toBe("confirmed");
    expect(calculateSharePointSchemaGate(project)).toBe("confirmed");
  });

  it("requires explicit connector classification and licensing for custom Canvas connectors", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "customConnector";
    project.powerPlatform!.canvas!.sourcePurpose = "Read external tickets";
    project.powerPlatform!.canvas!.sourceOwnership = "IT";
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({ id: "tickets", displayName: "Tickets API", dataSourceType: "customConnector", canvasRole: "primary", connectorClassification: "unknown" })
    ];

    expect(calculateConnectorClassificationGate(project)).toBe("missingInformation");
    expect(calculateLicensingGate(project)).toBe("missingInformation");

    project.powerPlatform!.common.connectors[0].connectorClassification = "custom";
    project.powerPlatform!.common.connectors[0].classificationConfirmationStatus = "confirmed";
    project.powerPlatform!.common.connectors[0].licenceRequirement = "Premium connector licence confirmed";
    project.powerPlatform!.common.connectors[0].licensingConfirmationStatus = "confirmed";
    project.powerPlatform!.canvas!.otherDataSources = "Tickets API";
    project.powerPlatform!.canvas!.otherConnectorSchemaDefinitions = "GET /tickets";
    project.powerPlatform!.canvas!.otherConnectorFieldDefinitions = "id, title, status";
    project.powerPlatform!.canvas!.otherConnectorConfirmationSource = "API documentation";
    project.powerPlatform!.canvas!.schemaStatus = "confirmed";

    expect(calculateConnectorClassificationGate(project)).toBe("confirmed");
    expect(calculateLicensingGate(project)).toBe("confirmed");
    expect(calculateOtherConnectorSchemaGate(project)).toBe("confirmed");
  });

  it("requires Dataverse logical names for Canvas and model-driven projects", () => {
    const canvasProject = createProject({ intake: { appType: "powerAppsCanvas" } });
    canvasProject.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    canvasProject.powerPlatform!.canvas!.dataverseEnvironment = "Production";
    canvasProject.powerPlatform!.canvas!.dataverseSolution = "ServiceApp";
    canvasProject.powerPlatform!.canvas!.dataversePublisherPrefix = "svc";
    canvasProject.powerPlatform!.canvas!.dataverseTableDefinitions = "Request / svc_request";
    canvasProject.powerPlatform!.canvas!.dataverseColumnDefinitions = "Name / svc_name";
    canvasProject.powerPlatform!.canvas!.dataverseSchemaConfirmationStatus = "confirmed";

    expect(calculateLogicalNameGate(canvasProject)).toBe("reviewNeeded");
    canvasProject.powerPlatform!.canvas!.logicalNameStatus = "confirmed";
    expect(calculateLogicalNameGate(canvasProject)).toBe("confirmed");
    expect(calculateCanvasDataverseSchemaGate(canvasProject)).toBe("confirmed");

    const modelProject = createProject({ intake: { appType: "powerAppsModelDriven" } });
    modelProject.powerPlatform!.common.dataverseAvailability = "confirmed";
    modelProject.powerPlatform!.common.licensingConfirmationStatus = "confirmed";
    modelProject.powerPlatform!.common.environmentAccessStatus = "confirmed";
    modelProject.powerPlatform!.common.solutionName = "ServiceApp";
    modelProject.powerPlatform!.common.publisherName = "Contoso";
    modelProject.powerPlatform!.common.publisherPrefix = "svc";
    modelProject.powerPlatform!.modelDriven!.solutionPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.tableCreationPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.securityRoleConfigurationPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.importPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.deploymentPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.modelDrivenLicensingStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.tableDefinitions = "Request / svc_request";
    modelProject.powerPlatform!.modelDriven!.columnDefinitions = "Name / svc_name";
    modelProject.powerPlatform!.modelDriven!.relationshipDefinitions = "Account lookup";
    modelProject.powerPlatform!.modelDriven!.securityRoles = "Service Manager";
    modelProject.powerPlatform!.modelDriven!.schemaStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.logicalNameStatus = "confirmed";

    expect(calculateModelDrivenEligibilityGate(modelProject)).toBe("confirmed");
    expect(calculateModelDrivenDataverseSchemaGate(modelProject)).toBe("confirmed");
    expect(calculateLogicalNameGate(modelProject)).toBe("confirmed");
  });

  it("never returns duplicate expected document paths", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    const docs = expectedDocumentLocations(project);
    const keys = docs.map((doc) => `${doc.folder}/${doc.fileName}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.some((path) => path.includes("-"))).toBe(false);
  });

  it("uses exact controlled status values so negative wording never confirms connector gates", () => {
    const negativeStatuses = ["Not confirmed", "Not approved", "Not available", "No", "Pending", "Needs review"];

    for (const status of negativeStatuses) {
      const project = createProject({ intake: { appType: "powerAppsCanvas" } });
      project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
      project.powerPlatform!.canvas!.sourcePurpose = "Track requests";
      project.powerPlatform!.canvas!.sourceOwnership = "Operations";
      project.powerPlatform!.common.connectors = [
        createDefaultConnector({
          id: "sp",
          dataSourceType: "sharePointList",
          canvasRole: "primary",
          connectorClassification: "standard",
          classificationConfirmationStatus: status,
          licenceRequirement: "Included",
          licensingConfirmationStatus: status
        })
      ];

      expect(calculateConnectorClassificationGate(project)).not.toBe("confirmed");
      expect(calculateLicensingGate(project)).not.toBe("confirmed");
    }

    const confirmed = createProject({ intake: { appType: "powerAppsCanvas" } });
    confirmed.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    confirmed.powerPlatform!.canvas!.sourcePurpose = "Track requests";
    confirmed.powerPlatform!.canvas!.sourceOwnership = "Operations";
    confirmed.powerPlatform!.common.connectors = [
      createDefaultConnector({
        id: "sp",
        dataSourceType: "sharePointList",
        canvasRole: "primary",
        connectorClassification: "standard",
        classificationConfirmationStatus: "confirmed",
        licenceRequirement: "Included",
        licensingConfirmationStatus: "confirmed"
      })
    ];

    expect(calculateConnectorClassificationGate(confirmed)).toBe("confirmed");
    expect(calculateLicensingGate(confirmed)).toBe("confirmed");
  });

  it("uses exact mixed Canvas source selections for helpers, gates, and documents", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "dataverse"];
    project.powerPlatform!.canvas!.sourcePurpose = "Track service requests";
    project.powerPlatform!.canvas!.sourceOwnership = "Operations";
    project.powerPlatform!.common.dataverseAvailability = "confirmed";
    project.powerPlatform!.common.licensingConfirmationStatus = "confirmed";
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({
        id: "sp",
        dataSourceType: "sharePointList",
        canvasRole: "primary",
        connectorClassification: "standard",
        classificationConfirmationStatus: "confirmed",
        licenceRequirement: "Included",
        licensingConfirmationStatus: "confirmed"
      }),
      createDefaultConnector({
        id: "dv",
        dataSourceType: "dataverse",
        canvasRole: "secondary",
        connectorClassification: "premium",
        classificationConfirmationStatus: "confirmed",
        licenceRequirement: "Per-app licence",
        licensingConfirmationStatus: "confirmed"
      })
    ];

    expect(getSelectedCanvasDataSourceTypes(project)).toEqual(["sharePointList", "dataverse"]);
    expect(usesMultipleDataSources(project)).toBe(true);
    expect(usesSharePoint(project)).toBe(true);
    expect(usesDataverse(project)).toBe(true);
    expect(usesOtherConnector(project)).toBe(false);
    expect(calculateConnectorSelectionGate(project)).toBe("confirmed");
    expect(calculateConnectorClassificationGate(project)).toBe("confirmed");
    expect(calculateLicensingGate(project)).toBe("confirmed");

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);
    expect(fileNames).toEqual(expect.arrayContaining(["SHAREPOINT_SCHEMA.md", "DATAVERSE_SCHEMA.md"]));
    expect(fileNames).not.toContain("CONNECTOR_SCHEMA.md");
  });

  it("blocks selected Canvas backends with no connector assessment and does not infer connector classification", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.sourcePurpose = "Track requests";
    project.powerPlatform!.canvas!.sourceOwnership = "Operations";

    expect(calculateConnectorSelectionGate(project)).toBe("missingInformation");
    expect(calculateConnectorClassificationGate(project)).toBe("missingInformation");
    expect(calculateLicensingGate(project)).toBe("missingInformation");

    project.powerPlatform!.common.connectors = [
      createDefaultConnector({
        dataSourceType: "sharePointList",
        licenceRequirement: "Included",
        licensingConfirmationStatus: "confirmed"
      })
    ];

    expect(calculateConnectorClassificationGate(project)).toBe("missingInformation");
    expect(project.powerPlatform!.common.connectors[0].connectorClassification).toBe("unknown");
  });

  it("inspects every structured SharePoint column and never derives internal names", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
    project.powerPlatform!.canvas!.sharePointListSchemas = [
      createDefaultSharePointList({ id: "requests", displayName: "Requests", purpose: "Track requests", expectedRecordCount: "500", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.sharePointLibrarySchemas = [
      createDefaultSharePointLibrary({ id: "docs", displayName: "Documents", purpose: "Store uploads", fileTypes: "PDF", metadataColumnIds: ["Title"], confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.sharePointColumnSchemas = [
      createDefaultSharePointColumn({ id: "good", parentType: "list", parentId: "requests", displayName: "Title", internalName: "Title", columnType: "Text", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
      createDefaultSharePointColumn({ id: "library-meta", parentType: "library", parentId: "docs", displayName: "File Status", internalName: "FileStatus", columnType: "Choice", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
      createDefaultSharePointColumn({ id: "missing", parentType: "list", parentId: "requests", displayName: "Customer Name", internalName: "", columnType: "Text", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];

    expect(calculateInternalNameGate(project)).toBe("missingInformation");
    expect(project.powerPlatform!.canvas!.sharePointColumnSchemas[2].internalName).toBe("");

    project.powerPlatform!.canvas!.sharePointColumnSchemas[2].internalName = "CustomerName";
    project.powerPlatform!.canvas!.sharePointColumnSchemas[2].confirmationStatus = "reviewNeeded";
    expect(calculateInternalNameGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.canvas!.sharePointColumnSchemas = project.powerPlatform!.canvas!.sharePointColumnSchemas.filter((column) => column.id !== "missing");
    expect(calculateInternalNameGate(project)).toBe("confirmed");
    expect(calculateSharePointSchemaGate(project)).toBe("confirmed");
  });

  it("inspects structured Dataverse table, column, and relationship logical names without deriving them", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    project.powerPlatform!.canvas!.dataverseEnvironment = "Production";
    project.powerPlatform!.canvas!.dataverseSolution = "ServiceApp";
    project.powerPlatform!.canvas!.dataversePublisherPrefix = "svc";
    project.powerPlatform!.canvas!.dataverseSchemaConfirmationStatus = "confirmed";
    project.powerPlatform!.canvas!.dataverseTableSchemas = [
      createDefaultDataverseTable({ id: "request", displayName: "Request", logicalName: "svc_request", schemaName: "svc_Request", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.dataverseColumnSchemas = [
      createDefaultDataverseColumn({ tableId: "request", displayName: "Name", logicalName: "", schemaName: "svc_Name", dataType: "Text", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.dataverseRelationshipSchemas = [
      createDefaultDataverseRelationship({ relationshipType: "Lookup", parentTableId: "request", childTableId: "request", parentTable: "Account", childTable: "Request", relationshipSchemaName: "", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];

    expect(calculateLogicalNameGate(project)).toBe("missingInformation");
    expect(project.powerPlatform!.canvas!.dataverseColumnSchemas[0].logicalName).toBe("");

    project.powerPlatform!.canvas!.dataverseColumnSchemas[0].logicalName = "svc_name";
    project.powerPlatform!.canvas!.dataverseTableSchemas.push(createDefaultDataverseTable({ id: "account", displayName: "Account", logicalName: "account", schemaName: "Account", confirmationStatus: "confirmed", confirmationSource: "Architect" }));
    project.powerPlatform!.canvas!.dataverseRelationshipSchemas[0].parentTableId = "account";
    project.powerPlatform!.canvas!.dataverseRelationshipSchemas[0].relationshipSchemaName = "svc_account_request";
    project.powerPlatform!.canvas!.dataverseRelationshipSchemas[0].confirmationStatus = "reviewNeeded";
    expect(calculateLogicalNameGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.canvas!.dataverseRelationshipSchemas[0].confirmationStatus = "confirmed";
    expect(calculateLogicalNameGate(project)).toBe("confirmed");
    expect(calculateCanvasDataverseSchemaGate(project)).toBe("confirmed");
  });

  it("inspects structured other-connector resources and fields", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "externalApi";
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({ id: "api", displayName: "Tickets API", dataSourceType: "externalApi", canvasRole: "primary" })
    ];
    project.powerPlatform!.canvas!.connectorResourceSchemas = [
      createDefaultConnectorResource({ id: "tickets-resource", connectorId: "api", resourceName: "Tickets", keyOrIdentifier: "", authenticationRequirement: "API key", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.connectorFieldSchemas = [
      createDefaultConnectorField({ connectorId: "api", resourceId: "tickets-resource", displayName: "Ticket ID", fieldIdentifier: "", fieldType: "Text", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];

    expect(calculateOtherConnectorSchemaGate(project)).toBe("missingInformation");

    project.powerPlatform!.canvas!.connectorResourceSchemas[0].keyOrIdentifier = "id";
    project.powerPlatform!.canvas!.connectorFieldSchemas[0].fieldIdentifier = "ticketId";
    project.powerPlatform!.canvas!.connectorFieldSchemas[0].confirmationStatus = "reviewNeeded";
    expect(calculateOtherConnectorSchemaGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.canvas!.connectorFieldSchemas[0].confirmationStatus = "confirmed";
    project.powerPlatform!.canvas!.otherConnectorSchemaConfirmationStatus = "confirmed";
    expect(calculateOtherConnectorSchemaGate(project)).toBe("confirmed");
  });

  it("repairs connector roles deterministically and requires exactly one primary", () => {
    const connectors = [
      createDefaultConnector({ id: "old-primary", dataSourceType: "sharePointList", canvasRole: "primary" }),
      createDefaultConnector({ id: "new-primary", dataSourceType: "dataverse", canvasRole: "primary" }),
      createDefaultConnector({ id: "secondary", dataSourceType: "dataverse", canvasRole: "secondary" })
    ];

    const ambiguous = reconcileCanvasConnectorRoles(connectors, "", ["secondary"]);
    expect(ambiguous.primaryConnectorId).toBe("");
    expect(ambiguous.connectors.filter((connector) => connector.canvasRole === "primary")).toHaveLength(0);

    const explicit = reconcileCanvasConnectorRoles(connectors, "new-primary", ["new-primary", "secondary"]);
    expect(explicit.primaryConnectorId).toBe("new-primary");
    expect(explicit.secondaryConnectorIds).toEqual(["secondary"]);
    expect(explicit.connectors.find((connector) => connector.id === "new-primary")?.canvasRole).toBe("primary");
    expect(explicit.connectors.find((connector) => connector.id === "old-primary")?.canvasRole).toBe("");
  });

  it("requires Canvas Power Fx, YAML, delegation, and ALM planning before readiness", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.appFormulasRequirements = "Use formulas for reusable calculations";
    project.powerPlatform!.canvas!.startScreenRequirements = "Route by role";
    project.powerPlatform!.canvas!.onStartRequirements = "Load reference data";
    project.powerPlatform!.canvas!.namedFormulaRequirements = "Named formulas required";
    project.powerPlatform!.canvas!.createBehavior = "Create requests";
    project.powerPlatform!.canvas!.readBehavior = "Read requests";
    project.powerPlatform!.canvas!.updateBehavior = "Update requests";
    project.powerPlatform!.canvas!.validationRequirements = "Validate required fields";
    project.powerPlatform!.canvas!.errorHandlingRequirements = "Show errors";
    project.powerPlatform!.canvas!.searchRequirements = "Search by name";
    project.powerPlatform!.canvas!.filteringRequirements = "Filter by status";
    project.powerPlatform!.canvas!.sortingRequirements = "Sort by created date";
    expect(calculateCanvasPowerFxPlanningGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.canvas!.powerFxStatus = "confirmed";
    expect(calculateCanvasPowerFxPlanningGate(project)).toBe("confirmed");

    project.powerPlatform!.canvas!.fullScreenYamlRequired = "Full-screen YAML not required";
    project.powerPlatform!.canvas!.controlLevelYamlRequired = "Control YAML not required";
    project.powerPlatform!.canvas!.containerYamlRequired = "Container YAML not required";
    project.powerPlatform!.canvas!.componentYamlRequired = "Component YAML not required";
    project.powerPlatform!.canvas!.paYamlSourceRequired = ".pa.yaml unavailable";
    project.powerPlatform!.canvas!.expectedInstallationMethod = "Manual Studio build";
    project.powerPlatform!.canvas!.existingSourceAvailability = "No existing source";
    project.powerPlatform!.canvas!.validationResponsibility = "Developer";
    project.powerPlatform!.canvas!.yamlStatus = "confirmed";
    expect(calculateCanvasYamlPlanningGate(project)).toBe("confirmed");

    project.powerPlatform!.canvas!.expectedRecordCounts = "5000";
    project.powerPlatform!.canvas!.delegationRequirements = "Use delegable filters";
    project.powerPlatform!.canvas!.delegationStatus = "confirmed";
    project.powerPlatform!.common.connectors = [createDefaultConnector({ id: "sp", delegationSupport: "Delegable for indexed columns" })];
    expect(calculateCanvasDelegationPlanningGate(project)).toBe("confirmed");

    project.powerPlatform!.common.sourceControlApproach = "Repository notes";
    project.powerPlatform!.common.deploymentMethod = "Managed deployment";
    project.powerPlatform!.common.deploymentResponsibility = "Technical owner";
    project.powerPlatform!.common.deploymentStrategy = "Dev/test/prod";
    project.powerPlatform!.common.connectionReferences = "Connection references documented";
    project.powerPlatform!.common.environmentVariables = "Environment variables documented";
    project.powerPlatform!.common.pipelineRequirements = "Manual approval pipeline";
    project.powerPlatform!.common.rollbackExpectations = "Rollback to previous version";
    project.powerPlatform!.common.releaseApprovalResponsibility = "App owner";
    expect(calculateAlmGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.common.almConfirmationStatus = "confirmed";
    expect(calculateAlmGate(project)).toBe("confirmed");
  });

  it("requires model-driven applicability decisions for optional architecture groups", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    project.powerPlatform!.modelDriven!.formDefinitions = "Main form";
    project.powerPlatform!.modelDriven!.viewDefinitions = "Active records view";
    project.powerPlatform!.modelDriven!.formsAndViewsStatus = "confirmed";
    expect(calculateModelDrivenFormsAndViewsGate(project)).toBe("missingInformation");

    project.powerPlatform!.modelDriven!.chartsDecision = { status: "notApplicable", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.dashboardsDecision = { status: "notApplicable", details: "", notApplicableReason: "No dashboard", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.appPagesDecision = { status: "notApplicable", details: "", notApplicableReason: "No app page", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.customPagesDecision = { status: "required", details: "Custom intake page", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenFormsAndViewsGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.chartsDecision.notApplicableReason = "No charts";
    expect(calculateModelDrivenFormsAndViewsGate(project)).toBe("confirmed");

    project.powerPlatform!.modelDriven!.navigationDefinitions = "Area > group > table";
    expect(calculateModelDrivenNavigationGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.modelDriven!.navigationStatus = "confirmed";
    expect(calculateModelDrivenNavigationGate(project)).toBe("confirmed");

    project.powerPlatform!.modelDriven!.securityRoles = "Manager";
    project.powerPlatform!.modelDriven!.businessUnits = "Operations";
    project.powerPlatform!.modelDriven!.ownerTeams = "Owner team";
    project.powerPlatform!.modelDriven!.accessTeams = "Access team";
    project.powerPlatform!.modelDriven!.tablePrivileges = "Create/read/update";
    project.powerPlatform!.modelDriven!.privilegeDepth = "BU-level";
    project.powerPlatform!.modelDriven!.recordOwnership = "Team owned";
    project.powerPlatform!.modelDriven!.sharingExpectations = "No manual sharing";
    project.powerPlatform!.modelDriven!.fieldSecurityProfiles = "Sensitive fields protected";
    project.powerPlatform!.modelDriven!.securityArchitectureStatus = "confirmed";
    project.powerPlatform!.modelDriven!.teamModelDecision = { status: "required", details: "Owner and access teams", notApplicableReason: "", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.hierarchySecurityDecision = { status: "notApplicable", details: "", notApplicableReason: "No hierarchy security", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.fieldSecurityDecision = { status: "required", details: "Sensitive fields protected", notApplicableReason: "", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.applicationUsersDecision = { status: "notApplicable", details: "", notApplicableReason: "No app users", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.servicePrincipalsDecision = { status: "notApplicable", details: "", notApplicableReason: "No service principals", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("confirmed");

    project.powerPlatform!.modelDriven!.businessProcessFlowsDecision = { status: "notApplicable", details: "", notApplicableReason: "No BPF", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.automationsDecision = { status: "notApplicable", details: "", notApplicableReason: "No automation", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.businessRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No business rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.validationRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No validation rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.duplicatePreventionDecision = { status: "notApplicable", details: "", notApplicableReason: "No duplicate prevention", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.modelDriven!.businessLogicStatus = "confirmed";
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");

    project.powerPlatform!.modelDriven!.commandBarRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No command changes", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.clientSideJavaScriptDecision = { status: "notApplicable", details: "", notApplicableReason: "No JavaScript", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.webResourcesDecision = { status: "notApplicable", details: "", notApplicableReason: "No web resources", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.htmlWebResourcesDecision = { status: "notApplicable", details: "", notApplicableReason: "No HTML resources", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.imageWebResourcesDecision = { status: "notApplicable", details: "", notApplicableReason: "No image resources", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.pluginsDecision = { status: "notApplicable", details: "", notApplicableReason: "No plug-ins", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.customWorkflowActivitiesDecision = { status: "notApplicable", details: "", notApplicableReason: "No custom workflow activities", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.customApisDecision = { status: "notApplicable", details: "", notApplicableReason: "No APIs", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.pcfControlsDecision = { status: "notApplicable", details: "", notApplicableReason: "No PCF", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.azureIntegrationsDecision = { status: "notApplicable", details: "", notApplicableReason: "No Azure integrations", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.externalServicesDecision = { status: "notApplicable", details: "", notApplicableReason: "No external services", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenExtensionsGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.modelDriven!.extensionsStatus = "confirmed";
    expect(calculateModelDrivenExtensionsGate(project)).toBe("confirmed");

    project.powerPlatform!.common.sourceControlApproach = "Repository notes";
    project.powerPlatform!.common.deploymentMethod = "Managed deployment";
    project.powerPlatform!.common.deploymentResponsibility = "Technical owner";
    project.powerPlatform!.common.deploymentStrategy = "Dev/test/prod";
    project.powerPlatform!.common.connectionReferences = "Connection references documented";
    project.powerPlatform!.common.environmentVariables = "Environment variables documented";
    project.powerPlatform!.common.pipelineRequirements = "Manual approval pipeline";
    project.powerPlatform!.common.rollbackExpectations = "Rollback to previous version";
    project.powerPlatform!.common.releaseApprovalResponsibility = "App owner";
    project.powerPlatform!.common.almConfirmationStatus = "confirmed";
    expect(calculateAlmGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.almReadinessStatus = "confirmed";
    expect(calculateAlmGate(project)).toBe("confirmed");
  });

  it("requires controlled business-rule applicability decisions", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    project.powerPlatform!.modelDriven!.businessLogicStatus = "confirmed";
    project.powerPlatform!.modelDriven!.businessProcessFlowsDecision = { status: "notApplicable", details: "", notApplicableReason: "No BPF", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.automationsDecision = { status: "notApplicable", details: "", notApplicableReason: "No automation", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.validationRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No validation rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.duplicatePreventionDecision = { status: "notApplicable", details: "", notApplicableReason: "No duplicate prevention", confirmationStatus: "confirmed" };

    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.businessRulesDecision = { status: "required", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.businessRulesDecision.details = "Status cannot move to Closed without a resolution.";
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");
    project.powerPlatform!.modelDriven!.businessRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.businessRulesDecision.notApplicableReason = "No table-level business rules.";
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");
  });

  it("requires full external connector selection, classification, and licensing for model-driven projects", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("notApplicable");
    expect(calculateModelDrivenExternalConnectorClassificationGate(project)).toBe("notApplicable");
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("notApplicable");

    project.powerPlatform!.common.connectors = [createDefaultConnector({
      id: "premium-api",
      displayName: "Premium Service API",
      dataSourceName: "Premium Service",
      dataSourceType: "externalApi",
      connectorClassification: "premium"
    })];
    expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("missingInformation");

    Object.assign(project.powerPlatform!.common.connectors[0], {
      purpose: "Read service account status.",
      authenticationMethod: "OAuth",
      gatewayRequirement: "No gateway",
      environmentRequirement: "Production environment variable",
      dlpImpact: "Requires Business DLP group",
      approvalStatus: "Approved by admin"
    });
    expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.common.connectors[0].approvalConfirmationStatus = "confirmed";
    expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("confirmed");
    expect(calculateModelDrivenExternalConnectorClassificationGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.common.connectors[0].classificationConfirmationStatus = "confirmed";
    expect(calculateModelDrivenExternalConnectorClassificationGate(project)).toBe("confirmed");
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.common.dataverseAvailability = "confirmed";
    project.powerPlatform!.common.licensingConfirmationStatus = "confirmed";
    project.powerPlatform!.modelDriven!.modelDrivenLicensingStatus = "confirmed";
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("missingInformation");
    project.powerPlatform!.common.connectors[0].licenceRequirement = "Premium connector licence required; not assumed.";
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.common.connectors[0].licensingConfirmationStatus = "confirmed";
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("confirmed");
    expect(calculateLicensingGate(project)).toBe("confirmed");
  });

  it("does not infer connector approval from approval notes", () => {
    const negativeNotes = [
      "Not approved",
      "Approval not confirmed",
      "Pending approval",
      "Not approved by administration",
      "Approval denied"
    ];
    for (const note of negativeNotes) {
      const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
      project.powerPlatform!.common.connectors = [createDefaultConnector({
        displayName: "External API",
        purpose: "Read records",
        dataSourceName: "External",
        dataSourceType: "externalApi",
        authenticationMethod: "OAuth",
        gatewayRequirement: "No gateway",
        environmentRequirement: "Production variable",
        dlpImpact: "Business DLP",
        approvalStatus: note,
        approvalConfirmationStatus: "reviewNeeded"
      })];
      expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("reviewNeeded");
      project.powerPlatform!.common.connectors[0].approvalConfirmationStatus = "confirmed";
      expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("confirmed");
    }
  });

  it("normalizes connector approval notes only for exact legacy approvals", () => {
    const approved = normalizePowerPlatformData({
      common: { connectors: [{ id: "approved", approvalStatus: "approved" }] },
      modelDriven: {}
    }, "powerAppsModelDriven")!;
    expect(approved.common.connectors[0].approvalStatus).toBe("approved");
    expect(approved.common.connectors[0].approvalConfirmationStatus).toBe("confirmed");

    const sentence = normalizePowerPlatformData({
      common: { connectors: [{ id: "sentence", approvalStatus: "Approved by admin" }] },
      modelDriven: {}
    }, "powerAppsModelDriven")!;
    expect(sentence.common.connectors[0].approvalStatus).toBe("Approved by admin");
    expect(sentence.common.connectors[0].approvalConfirmationStatus).toBe("missingInformation");

    const negative = normalizePowerPlatformData({
      common: { connectors: [{ id: "negative", approvalStatus: "Not approved" }] },
      modelDriven: { businessRules: "Keep existing text" }
    }, "powerAppsModelDriven")!;
    expect(negative.common.connectors[0].approvalConfirmationStatus).toBe("missingInformation");
    expect(negative.modelDriven!.businessRules).toBe("Keep existing text");
    expect(negative.modelDriven!.teamModelDecision.status).toBe("undecided");
    expect(negative.modelDriven!.validationRulesDecision.status).toBe("undecided");
  });

  it("requires controlled security applicability decisions", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    project.powerPlatform!.modelDriven!.securityRoles = "Manager";
    project.powerPlatform!.modelDriven!.businessUnits = "Operations";
    project.powerPlatform!.modelDriven!.tablePrivileges = "Read/write";
    project.powerPlatform!.modelDriven!.privilegeDepth = "BU";
    project.powerPlatform!.modelDriven!.recordOwnership = "Team";
    project.powerPlatform!.modelDriven!.sharingExpectations = "No sharing";
    project.powerPlatform!.modelDriven!.securityArchitectureStatus = "confirmed";

    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.teamModelDecision = { status: "required", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.teamModelDecision.details = "Owner team and access team";
    project.powerPlatform!.modelDriven!.hierarchySecurityDecision = { status: "notApplicable", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.hierarchySecurityDecision.notApplicableReason = "No hierarchy security";
    project.powerPlatform!.modelDriven!.fieldSecurityDecision = { status: "required", details: "Protect SIN field", notApplicableReason: "", confirmationStatus: "reviewNeeded" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.modelDriven!.fieldSecurityDecision.confirmationStatus = "confirmed";
    project.powerPlatform!.modelDriven!.applicationUsersDecision = { status: "notApplicable", details: "", notApplicableReason: "No application users", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.servicePrincipalsDecision = { status: "notApplicable", details: "", notApplicableReason: "No service principals", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("confirmed");
  });

  it("requires validation and duplicate-prevention applicability in business logic readiness", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    project.powerPlatform!.modelDriven!.businessLogicStatus = "confirmed";
    project.powerPlatform!.modelDriven!.businessRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No business rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.businessProcessFlowsDecision = { status: "notApplicable", details: "", notApplicableReason: "No BPF", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.automationsDecision = { status: "notApplicable", details: "", notApplicableReason: "No automations", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.validationRulesDecision = { status: "required", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.validationRulesDecision.details = "Require status reason.";
    project.powerPlatform!.modelDriven!.duplicatePreventionDecision = { status: "required", details: "Duplicate detection on account number.", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");
    project.powerPlatform!.modelDriven!.validationRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No validation rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.duplicatePreventionDecision = { status: "notApplicable", details: "", notApplicableReason: "No duplicate prevention", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");
  });
});
