import { createProject } from "../lib/createProject";
import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  createCanonicalAssetPayload,
  createImplementationAssetManifest,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetDependencies,
  evaluateImplementationAssetGraph,
  evaluateImplementationAssetStatus,
  IMPLEMENTATION_ASSET_GENERATION_VERSION,
  IMPLEMENTATION_ASSET_MANIFEST_JSON_PATH,
  IMPLEMENTATION_ASSET_MANIFEST_MARKDOWN_PATH,
  gateResultsForAsset,
  normalizeImplementationAssetRegistry,
  parseFormulaProperties,
  renderImplementationAssetManifestMarkdown,
  validateImplementationAssetManifest,
  validateImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetDependency
} from "../lib/implementationAssets";
import {
  createApplicabilityDecision,
  createDefaultCanvasComponentTarget,
  createDefaultCanvasComponentUsageTarget,
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultConnectorField,
  createDefaultConnectorResource,
  createDefaultDataverseColumn,
  createDefaultDataverseTable,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";

function createCanvasProject(formulaProperties = "OnSelect") {
  const project = createProject({
    identity: { id: "canvas-assets", projectName: "Canvas Assets" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Track approved service requests.",
      requiredFeatures: "Create and review requests.",
      workflows: "Submit request.",
      outOfScope: "Live deployment.",
      successCriteria: "Assets are reviewed before implementation.",
      accessibilityNotes: "Labels and keyboard order are required.",
      permissionRules: "Least privilege.",
      screens: "Request form",
      acceptanceNotes: "Create request is accepted.",
      targetUsers: "Requesters",
      userRoles: "Requester",
      dataSources: "SharePoint",
      dataEntities: "Requests",
      fields: "Title",
      dataCollections: "Requests",
      securityConfirmed: "Confirmed"
    } as any
  });
  const pp = project.powerPlatform!;
  pp.common.tenant = "Tenant";
  pp.common.environment = "Dev";
  pp.common.environmentAccessStatus = "confirmed";
  pp.common.authenticationRequirements = "Microsoft Entra ID.";
  pp.common.authorizationRequirements = "Least privilege.";
  pp.common.recordAccessRules = "Users see permitted records.";
  pp.common.auditRequirements = "Audit changes.";
  pp.common.privacyRequirements = "No secrets.";
  pp.common.securityReviewStatus = "confirmed";
  pp.common.functionalTesting = "Functional tests.";
  pp.common.connectorTesting = "Connector tests.";
  pp.common.permissionTesting = "Permission tests.";
  pp.common.accessibilityTesting = "Accessibility tests.";
  pp.common.deploymentTesting = "Deployment test plan only.";
  pp.common.testingPlanConfirmationStatus = "confirmed";
  pp.common.deploymentResponsibility = "Deployment owner handles external deployment.";
  pp.common.deploymentOwner = "Deployment owner";
  pp.common.deploymentResponsibilityStatus = "confirmed";
  pp.common.connectors = [
    createDefaultConnector({
      id: "connector-sharepoint",
      displayName: "SharePoint",
      dataSourceName: "Requests",
      dataSourceType: "sharePointList",
      canvasRole: "primary",
      connectorClassification: "standard",
      classificationConfirmationStatus: "confirmed",
      licenceRequirement: "Standard connector.",
      licensingConfirmationStatus: "confirmed",
      authenticationMethod: "Microsoft Entra ID",
      connectionOwner: "Operations owner",
      connectionOwnerRole: "Environment maker",
      connectionOwnershipStatus: "confirmed",
      requiredConnectorPermissions: "Read and write list items.",
      permissionOwner: "SharePoint owner",
      permissionValidationMethod: "Owner confirmation.",
      permissionConfirmationStatus: "confirmed",
      delegationSupport: "Delegation supported for indexed columns.",
      limitations: "Avoid non-delegable expressions.",
      approvalConfirmationStatus: "confirmed"
    })
  ];
  pp.canvas!.primaryDataSourceType = "sharePointList";
  pp.canvas!.primaryConnectorId = "connector-sharepoint";
  pp.canvas!.sourcePurpose = "Store requests.";
  pp.canvas!.sourceOwnership = "Operations.";
  pp.canvas!.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
  pp.canvas!.sharePointListSchemas = [
    createDefaultSharePointList({
      id: "list-requests",
      displayName: "Requests",
      purpose: "Track requests.",
      expectedRecordCount: "1000",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  pp.canvas!.sharePointColumnSchemas = [
    createDefaultSharePointColumn({
      id: "field-title",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Title",
      internalName: "Title",
      columnType: "Single line of text",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  pp.canvas!.screenNamingConvention = "scrName";
  pp.canvas!.controlNamingConvention = "prefixName";
  pp.canvas!.controlTypePrefixes = "btn for buttons";
  pp.canvas!.variableNamingConvention = "varName";
  pp.canvas!.collectionNamingConvention = "colName";
  pp.canvas!.componentNamingConvention = "cmpName";
  pp.canvas!.formulaFileNamingConvention = "property.fx";
  pp.canvas!.yamlFileNamingConvention = "target.yaml";
  pp.canvas!.namingStandardConfirmationStatus = "confirmed";
  pp.canvas!.appFormulasRequirements = "Use named formulas where applicable.";
  pp.canvas!.startScreenRequirements = "Start on home.";
  pp.canvas!.onStartRequirements = "Initialize state.";
  pp.canvas!.namedFormulaRequirements = "Use reusable formulas.";
  pp.canvas!.createBehavior = "Patch request.";
  pp.canvas!.readBehavior = "Read requests.";
  pp.canvas!.updateBehavior = "Update request.";
  pp.canvas!.validationRequirements = "Validate title.";
  pp.canvas!.errorHandlingRequirements = "Notify errors.";
  pp.canvas!.searchRequirements = "Search title.";
  pp.canvas!.filteringRequirements = "Filter by status.";
  pp.canvas!.sortingRequirements = "Sort by modified date.";
  pp.canvas!.powerFxStatus = "confirmed";
  pp.canvas!.expectedRecordCounts = "1000";
  pp.canvas!.delegationRequirements = "Use delegable filters.";
  pp.canvas!.delegationStatus = "confirmed";
  pp.canvas!.componentApplicabilityDecision = createApplicabilityDecision({
    status: "notApplicable",
    notApplicableReason: "No reusable components are required.",
    confirmationStatus: "confirmed"
  });
  pp.canvas!.screenTargets = [
    createDefaultCanvasScreenTarget({
      id: "screen-request-form",
      displayName: "Request form",
      approvedScreenName: "scrRequestForm",
      purpose: "Collect request details.",
      confirmationSource: "Architect",
      dataSourceApplicabilityDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "Screen does not need direct data-source binding.",
        confirmationStatus: "confirmed"
      }),
      confirmationStatus: "confirmed",
      yamlOutputDecision: createApplicabilityDecision({
        status: "required",
        details: "Generate screen YAML plan.",
        confirmationStatus: "confirmed"
      }),
      yamlOutputType: "Screen YAML",
      yamlParentType: "app",
      yamlInstallationLocation: "Power Apps Studio tree view",
      yamlValidationResponsibility: "Developer"
    })
  ];
  pp.canvas!.controlTargets = [
    createDefaultCanvasControlTarget({
      id: "control-save-request",
      screenId: "screen-request-form",
      approvedControlName: "btnSaveRequest",
      controlType: "Button",
      purpose: "Save the request.",
      operation: "create",
      formulaProperties,
      connectorId: "connector-sharepoint",
      entityId: "list-requests",
      requiredFieldIds: ["field-title"],
      dependencies: "Depends on confirmed SharePoint request list and Title field.",
      dependencyApplicabilityDecision: createApplicabilityDecision({
        status: "required",
        details: "Depends on confirmed SharePoint request list and Title field.",
        confirmationStatus: "confirmed"
      }),
      formulaOutputDecision: createApplicabilityDecision({
        status: "required",
        details: "Generate save formula plan.",
        confirmationStatus: "confirmed"
      }),
      yamlOutputDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "Existing button will be updated manually.",
        confirmationStatus: "confirmed"
      }),
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  return project;
}

function createModelProject() {
  const project = createProject({
    identity: { id: "model-assets", projectName: "Model Assets" },
    intake: { appType: "powerAppsModelDriven", appPurpose: "Manage cases." }
  });
  const pp = project.powerPlatform!;
  pp.common.solutionName = "Case Solution";
  pp.common.publisherName = "Publisher";
  pp.common.publisherPrefix = "rp";
  pp.common.connectionReferences = "Use environment connection references.";
  pp.common.environmentVariables = "Use environment variables.";
  pp.modelDriven!.securityRoles = "Case Manager";
  pp.modelDriven!.forms = "Main case form.";
  pp.modelDriven!.views = "Active cases view.";
  pp.modelDriven!.formDefinitions = "Main case form references table-case and column-case-title.";
  pp.modelDriven!.viewDefinitions = "Active cases view references table-case and column-case-title.";
  pp.modelDriven!.navigation = "Cases area.";
  pp.modelDriven!.navigationDefinitions = "Navigation links to table-case.";
  pp.modelDriven!.teams = "Case team.";
  pp.modelDriven!.fieldSecurityProfiles = "Sensitive profile protects column-case-title on table-case.";
  pp.modelDriven!.automations = "Notify owner when table-case column-case-title changes.";
  pp.modelDriven!.automationsDecision = createApplicabilityDecision({
    status: "required",
    details: "Notify case owner.",
    confirmationStatus: "confirmed"
  });
  pp.modelDriven!.dataverseTableSchemas = [
    createDefaultDataverseTable({
      id: "table-case",
      displayName: "Case",
      logicalName: "rp_case",
      schemaName: "rp_Case",
      ownershipType: "User or team",
      primaryNameColumn: "rp_name",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  pp.modelDriven!.dataverseColumnSchemas = [
    createDefaultDataverseColumn({
      id: "column-case-title",
      tableId: "table-case",
      displayName: "Case title",
      logicalName: "rp_title",
      schemaName: "rp_Title",
      dataType: "Text",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  return project;
}

function approveRegistry(registry: ReturnType<typeof buildImplementationAssetRegistry>) {
  return {
    assets: registry.assets.map((asset) => ({
      assetId: asset.assetId,
      approvalStatus: "Approved",
      contentChecksum: asset.contentChecksum,
      generationVersion: asset.generationVersion
    }))
  };
}

function cloneAsset(asset: ImplementationAsset): ImplementationAsset {
  return JSON.parse(JSON.stringify(asset)) as ImplementationAsset;
}

function cloneDependency(dependency: ImplementationAssetDependency): ImplementationAssetDependency {
  return JSON.parse(JSON.stringify(dependency)) as ImplementationAssetDependency;
}

function createCanvasProjectWithControlYaml(formulaProperties = "OnSelect") {
  const project = createCanvasProject(formulaProperties);
  project.powerPlatform!.canvas!.controlTargets[0].yamlOutputDecision = createApplicabilityDecision({
    status: "required",
    details: "Generate control YAML plan.",
    confirmationStatus: "confirmed"
  });
  project.powerPlatform!.canvas!.controlTargets[0].yamlOutputType = "Control YAML";
  project.powerPlatform!.canvas!.controlTargets[0].yamlParentType = "screen";
  project.powerPlatform!.canvas!.controlTargets[0].yamlParentId = "screen-request-form";
  project.powerPlatform!.canvas!.controlTargets[0].yamlInstallationLocation = "Power Apps Studio";
  project.powerPlatform!.canvas!.controlTargets[0].yamlValidationResponsibility = "Developer";
  return project;
}

function withValidChecksum(asset: ImplementationAsset): ImplementationAsset {
  const status = evaluateImplementationAssetStatus(asset);
  const withoutChecksum = { ...asset, assetStatus: status, contentChecksum: "" };
  return { ...withoutChecksum, contentChecksum: calculateImplementationAssetChecksum(withoutChecksum) };
}

function readyAsset(asset: ImplementationAsset): ImplementationAsset {
  return withValidChecksum({
    ...asset,
    approvalStatus: "Approved",
    gateEvaluationSnapshot: asset.gateEvaluationSnapshot.map((gate) => ({ ...gate, passed: true, status: "confirmed", blockingReason: "" })),
    dependencies: asset.dependencies.map((dependency) => ({ ...dependency, resolved: true, blockingIssue: undefined, resolutionReason: "Test-ready dependency." })),
    blockingIssues: []
  });
}

function approvedConnector(overrides: Parameters<typeof createDefaultConnector>[0]) {
  return createDefaultConnector({
    displayName: "Approved connector",
    dataSourceName: "Approved source",
    purpose: "Test connector.",
    connectorClassification: "standard",
    classificationConfirmationStatus: "confirmed",
    licenceRequirement: "Standard connector.",
    licensingConfirmationStatus: "confirmed",
    authenticationMethod: "Microsoft Entra ID",
    connectionOwner: "Operations owner",
    connectionOwnerRole: "Environment maker",
    connectionOwnershipStatus: "confirmed",
    requiredConnectorPermissions: "Read and write.",
    permissionOwner: "System owner",
    permissionValidationMethod: "Owner confirmation.",
    permissionConfirmationStatus: "confirmed",
    approvalConfirmationStatus: "confirmed",
    ...overrides
  });
}

function createMultiConnectorProject() {
  const project = createCanvasProject();
  const canvas = project.powerPlatform!.canvas!;
  project.powerPlatform!.common.connectors = [
    project.powerPlatform!.common.connectors[0],
    approvedConnector({
      id: "connector-dataverse",
      displayName: "Dataverse",
      dataSourceName: "Case table",
      dataSourceType: "dataverse",
      canvasRole: "secondary"
    }),
    approvedConnector({
      id: "connector-external",
      displayName: "External service",
      dataSourceName: "External cases",
      dataSourceType: "customConnector",
      canvasRole: "secondary"
    })
  ];
  canvas.primaryDataSourceType = "multiple";
  canvas.selectedDataSourceTypes = ["sharePointList", "dataverse", "customConnector"];
  canvas.primaryConnectorId = "connector-sharepoint";
  canvas.secondaryConnectorIds = ["connector-dataverse", "connector-external"];
  canvas.sharePointListSchemas.push(createDefaultSharePointList({
    id: "list-other",
    displayName: "Other list",
    purpose: "Unrelated list.",
    expectedRecordCount: "100",
    confirmationStatus: "confirmed",
    confirmationSource: "Architect"
  }));
  canvas.sharePointColumnSchemas.push(createDefaultSharePointColumn({
    id: "field-other-list-title",
    parentType: "list",
    parentId: "list-other",
    displayName: "Other title",
    internalName: "Title",
    columnType: "Single line of text",
    confirmationStatus: "confirmed",
    confirmationSource: "Architect"
  }));
  canvas.dataverseTableSchemas = [
    createDefaultDataverseTable({
      id: "dv-account",
      displayName: "Account",
      logicalName: "account",
      schemaName: "Account",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultDataverseTable({
      id: "dv-contact",
      displayName: "Contact",
      logicalName: "contact",
      schemaName: "Contact",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.dataverseColumnSchemas = [
    createDefaultDataverseColumn({
      id: "dv-account-name",
      tableId: "dv-account",
      displayName: "Account name",
      logicalName: "name",
      schemaName: "Name",
      dataType: "Text",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultDataverseColumn({
      id: "dv-contact-name",
      tableId: "dv-contact",
      displayName: "Contact name",
      logicalName: "fullname",
      schemaName: "FullName",
      dataType: "Text",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.connectorResourceSchemas = [
    createDefaultConnectorResource({
      id: "resource-cases",
      connectorId: "connector-external",
      resourceName: "Cases",
      resourceType: "REST resource",
      purpose: "External case records.",
      keyOrIdentifier: "caseId",
      authenticationRequirement: "OAuth",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultConnectorResource({
      id: "resource-accounts",
      connectorId: "connector-external",
      resourceName: "Accounts",
      resourceType: "REST resource",
      purpose: "External account records.",
      keyOrIdentifier: "accountId",
      authenticationRequirement: "OAuth",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.connectorFieldSchemas = [
    createDefaultConnectorField({
      id: "external-case-name",
      connectorId: "connector-external",
      resourceId: "resource-cases",
      displayName: "Case name",
      fieldIdentifier: "caseName",
      fieldType: "string",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultConnectorField({
      id: "external-account-name",
      connectorId: "connector-external",
      resourceId: "resource-accounts",
      displayName: "Account name",
      fieldIdentifier: "accountName",
      fieldType: "string",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  return project;
}

function setControlDataReference(project: ReturnType<typeof createCanvasProject>, connectorId: string, entityId: string, fieldIds: string[]) {
  const control = project.powerPlatform!.canvas!.controlTargets[0];
  control.connectorId = connectorId;
  control.entityId = entityId;
  control.requiredFieldIds = fieldIds;
}

describe("implementation asset registry correction", () => {
  it("parses one formula property", () => {
    expect(parseFormulaProperties("OnSelect")).toEqual(["OnSelect"]);
  });

  it("parses multiple newline-separated formula properties", () => {
    expect(parseFormulaProperties("OnSelect\nDisplayMode\nVisible")).toEqual(["OnSelect", "DisplayMode", "Visible"]);
  });

  it("parses multiple comma-separated formula properties", () => {
    expect(parseFormulaProperties("OnSelect, DisplayMode, Visible")).toEqual(["OnSelect", "DisplayMode", "Visible"]);
  });

  it("removes duplicate, blank, semicolon, and placeholder formula properties", () => {
    expect(parseFormulaProperties("OnSelect;;\nPending,\nOnSelect,\nVisible")).toEqual(["OnSelect", "Visible"]);
  });

  it("generates one Power Fx plan asset per formula property with stable paths", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject("OnSelect\nDisplayMode\nVisible"), "2026-07-15T12:00:00.000Z");

    expect(registry.assets.map((asset) => asset.assetId)).toEqual(expect.arrayContaining([
      "asset-canvas-powerfx-control-save-request-onselect",
      "asset-canvas-powerfx-control-save-request-displaymode",
      "asset-canvas-powerfx-control-save-request-visible"
    ]));
    expect(registry.assets.map((asset) => asset.intendedPath)).toEqual(expect.arrayContaining([
      "07_Development/PowerFx/screen-request-form/control-save-request/onselect.fx",
      "07_Development/PowerFx/screen-request-form/control-save-request/displaymode.fx",
      "07_Development/PowerFx/screen-request-form/control-save-request/visible.fx"
    ]));
    expect(registry.assets.find((asset) => asset.assetId.endsWith("displaymode"))?.approvedPropertyName).toBe("DisplayMode");
  });

  it("detects formula path collisions for distinct properties that normalize to the same path", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject("Display Mode\nDisplay-Mode"), "2026-07-15T12:00:00.000Z");

    expect(validateImplementationAssetRegistry(registry)).toEqual(expect.arrayContaining([
      "Duplicate asset ID: asset-canvas-powerfx-control-save-request-display-mode.",
      "Duplicate implementation asset path: 07_Development/PowerFx/screen-request-form/control-save-request/display-mode.fx."
    ]));
  });

  it("does not create Power Fx or YAML assets for not-applicable targets", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.controlTargets[0].formulaOutputDecision = createApplicabilityDecision({
      status: "notApplicable",
      notApplicableReason: "No formula asset needed.",
      confirmationStatus: "confirmed"
    });
    project.powerPlatform!.canvas!.screenTargets[0].yamlOutputDecision = createApplicabilityDecision({
      status: "notApplicable",
      notApplicableReason: "Existing screen remains in place.",
      confirmationStatus: "confirmed"
    });

    const registry = buildImplementationAssetRegistry(project, "2026-07-15T12:00:00.000Z");

    expect(registry.assets).toHaveLength(1);
    expect(registry.assets[0].assetCategory).toBe("Installation");
  });

  it("uses typed gate identifiers on assets and snapshots", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets[0];

    expect(asset.requiredGateIds).toContain("formulaTargets");
    expect(asset.gateEvaluationSnapshot[0].gateId).toBeTruthy();
  });

  it("resolves valid Canvas formula dependencies from structured records", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.every((dependency) => dependency.resolved)).toBe(true);
    expect(asset.dependencies.map((dependency) => dependency.type)).toEqual(["screen", "control", "connector", "entity", "field"]);
  });

  it("5A.1 resolves a valid field belonging to the selected entity", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "field:field-title")?.resolved).toBe(true);
  });

  it("5A.1 does not resolve an existing SharePoint field belonging to another list", () => {
    const project = createMultiConnectorProject();
    setControlDataReference(project, "connector-sharepoint", "list-requests", ["field-other-list-title"]);

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "field:field-other-list-title")?.resolved).toBe(false);
  });

  it("5A.1 does not resolve an existing Dataverse field belonging to another table", () => {
    const project = createMultiConnectorProject();
    setControlDataReference(project, "connector-dataverse", "dv-account", ["dv-contact-name"]);

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "field:dv-contact-name")?.resolved).toBe(false);
  });

  it("5A.1 does not resolve an existing external connector field belonging to another resource", () => {
    const project = createMultiConnectorProject();
    setControlDataReference(project, "connector-external", "resource-cases", ["external-account-name"]);

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "field:external-account-name")?.resolved).toBe(false);
  });

  it("5A.1 resolves an entity belonging to the selected connector", () => {
    const project = createMultiConnectorProject();
    setControlDataReference(project, "connector-dataverse", "dv-account", ["dv-account-name"]);

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "entity:dv-account")?.resolved).toBe(true);
  });

  it("5A.1 does not resolve an active entity belonging to another active connector", () => {
    const project = createMultiConnectorProject();
    setControlDataReference(project, "connector-dataverse", "list-requests", ["field-title"]);

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "entity:list-requests")?.resolved).toBe(false);
  });

  it("5A.1 preserves connector and entity relationships when multiple connectors are active", () => {
    const project = createMultiConnectorProject();
    setControlDataReference(project, "connector-external", "resource-cases", ["external-case-name"]);

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "connector:connector-external")?.resolved).toBe(true);
    expect(asset.dependencies.find((dependency) => dependency.id === "entity:resource-cases")?.resolved).toBe(true);
    expect(asset.dependencies.find((dependency) => dependency.id === "field:external-case-name")?.resolved).toBe(true);
  });

  it("5A.1 detects when a current required gate changes from passing to blocked", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    project.intake.accessibilityNotes = "";

    expect(validateImplementationAssetRegistry(registry, project)).toEqual(expect.arrayContaining([
      `Gate snapshot for ${registry.assets[0].assetId} is stale.`,
      `Checksum mismatch for ${registry.assets[0].assetId}.`
    ]));
  });

  it("5A.1 recalculates a restored gate snapshot correctly", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    project.intake.accessibilityNotes = "";
    project.intake.accessibilityNotes = "Labels and keyboard order are required.";

    expect(validateImplementationAssetRegistry(registry, project)).not.toContain(`Gate snapshot for ${registry.assets[0].assetId} is stale.`);
  });

  it("5A.1 rejects a manually tampered passing gate snapshot", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const asset = cloneAsset(registry.assets[0]);
    asset.gateEvaluationSnapshot[0] = { ...asset.gateEvaluationSnapshot[0], passed: true, status: "confirmed", blockingReason: "Tampered" };
    asset.contentChecksum = calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });

    expect(validateImplementationAssetRegistry({ ...registry, assets: [asset, ...registry.assets.slice(1)] }, project)).toContain(`Gate snapshot for ${asset.assetId} is stale.`);
  });

  it("5A.1 changes an asset checksum when a current gate changes", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    project.intake.accessibilityNotes = "";

    const changed = deriveImplementationAssetRegistryState(project, registry.assets).assets[0];

    expect(changed.contentChecksum).not.toBe(registry.assets[0].contentChecksum);
  });

  it("5A.1 resets stored approval when a current gate changes", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const approved = normalizeImplementationAssetRegistry(approveRegistry(registry), project);
    project.intake.accessibilityNotes = "";

    const normalized = normalizeImplementationAssetRegistry(approveRegistry(approved), project);

    expect(normalized.assets[0].approvalStatus).toBe("Review required");
  });

  it("5A.1 changes an asset checksum when a relationship changes", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    project.powerPlatform!.canvas!.sharePointColumnSchemas[0].parentId = "list-other";

    const changed = deriveImplementationAssetRegistryState(project, registry.assets).assets[0];

    expect(changed.contentChecksum).not.toBe(registry.assets[0].contentChecksum);
  });

  it("5A.1 resets stored approval when a relationship changes", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const approved = normalizeImplementationAssetRegistry(approveRegistry(registry), project);
    project.powerPlatform!.canvas!.sharePointColumnSchemas[0].parentId = "list-other";

    const normalized = normalizeImplementationAssetRegistry(approveRegistry(approved), project);

    expect(normalized.assets[0].approvalStatus).toBe("Review required");
  });

  it("5A.1A marks a registry stale when the current control changes to another valid entity", () => {
    const project = createMultiConnectorProject();
    const registry = buildImplementationAssetRegistry(project);
    setControlDataReference(project, "connector-sharepoint", "list-other", ["field-other-list-title"]);

    expect(validateImplementationAssetRegistry(registry, project)).toEqual(expect.arrayContaining([
      `Dependency resolution for ${registry.assets[0].assetId} is stale.`,
      `Checksum mismatch for ${registry.assets[0].assetId}.`
    ]));
  });

  it("5A.1A marks a registry stale when the current control changes to another valid field", () => {
    const project = createMultiConnectorProject();
    project.powerPlatform!.canvas!.sharePointColumnSchemas.push(createDefaultSharePointColumn({
      id: "field-request-status",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Status",
      internalName: "Status",
      columnType: "Choice",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }));
    const registry = buildImplementationAssetRegistry(project);
    setControlDataReference(project, "connector-sharepoint", "list-requests", ["field-request-status"]);

    expect(validateImplementationAssetRegistry(registry, project)).toContain(`Dependency resolution for ${registry.assets[0].assetId} is stale.`);
  });

  it("5A.1A derivation adopts the current valid connector, entity, and field relationship", () => {
    const project = createMultiConnectorProject();
    const registry = buildImplementationAssetRegistry(project);
    setControlDataReference(project, "connector-sharepoint", "list-other", ["field-other-list-title"]);

    const current = deriveImplementationAssetRegistryState(project, registry.assets).assets[0];

    expect(current.connectorIds).toEqual(["connector-sharepoint"]);
    expect(current.entityIds).toEqual(["list-other"]);
    expect(current.fieldIds).toEqual(["field-other-list-title"]);
    expect(current.dependencies.map((dependency) => dependency.targetRecordId)).toEqual(expect.arrayContaining(["list-other", "field-other-list-title"]));
  });

  it("5A.1A normalization resets approval after a valid relationship change", () => {
    const project = createMultiConnectorProject();
    const registry = buildImplementationAssetRegistry(project);
    const approved = normalizeImplementationAssetRegistry(approveRegistry(registry), project);
    setControlDataReference(project, "connector-sharepoint", "list-other", ["field-other-list-title"]);

    const normalized = normalizeImplementationAssetRegistry(approveRegistry(approved), project);

    expect(normalized.assets[0].approvalStatus).toBe("Review required");
  });

  it("5A.1A rejects tampered relationship context even when the tampered relationship exists", () => {
    const project = createMultiConnectorProject();
    const registry = buildImplementationAssetRegistry(project);
    const asset = cloneAsset(registry.assets[0]);
    asset.dependencies = asset.dependencies.map((dependency) => {
      if (dependency.type === "entity") return { ...dependency, targetRecordId: "list-other", relationshipContext: { ...dependency.relationshipContext, entityId: "list-other", parentConnectorId: "connector-sharepoint" } };
      if (dependency.type === "field") return { ...dependency, targetRecordId: "field-other-list-title", relationshipContext: { ...dependency.relationshipContext, fieldId: "field-other-list-title", parentEntityId: "list-other", parentConnectorId: "connector-sharepoint" } };
      return dependency;
    });

    expect(validateImplementationAssetRegistry({ ...registry, assets: [asset, ...registry.assets.slice(1)] }, project)).toContain(`Dependency resolution for ${asset.assetId} is stale.`);
  });

  it("5A.1A rejects tampered relationship context even when its checksum was recomputed", () => {
    const project = createMultiConnectorProject();
    const registry = buildImplementationAssetRegistry(project);
    const asset = cloneAsset(registry.assets[0]);
    asset.dependencies = asset.dependencies.map((dependency) => {
      if (dependency.type === "entity") return { ...dependency, targetRecordId: "list-other", relationshipContext: { ...dependency.relationshipContext, entityId: "list-other", parentConnectorId: "connector-sharepoint" } };
      if (dependency.type === "field") return { ...dependency, targetRecordId: "field-other-list-title", relationshipContext: { ...dependency.relationshipContext, fieldId: "field-other-list-title", parentEntityId: "list-other", parentConnectorId: "connector-sharepoint" } };
      return dependency;
    });
    asset.contentChecksum = calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });

    expect(validateImplementationAssetRegistry({ ...registry, assets: [asset, ...registry.assets.slice(1)] }, project)).toContain(`Dependency resolution for ${asset.assetId} is stale.`);
  });

  it("5A.1A does not allow a model-driven table with the same ID to satisfy a Canvas entity dependency", () => {
    const project = createCanvasProject();
    setControlDataReference(project, "connector-sharepoint", "shared-record", ["field-title"]);
    project.powerPlatform!.modelDriven = {
      dataverseTableSchemas: [createDefaultDataverseTable({ id: "shared-record", confirmationStatus: "confirmed", confirmationSource: "Architect" })],
      dataverseColumnSchemas: []
    } as any;

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "entity:shared-record")?.resolved).toBe(false);
  });

  it("5A.1A does not allow a model-driven column with the same ID to satisfy a Canvas field dependency", () => {
    const project = createCanvasProject();
    setControlDataReference(project, "connector-sharepoint", "list-requests", ["shared-field"]);
    project.powerPlatform!.modelDriven = {
      dataverseTableSchemas: [],
      dataverseColumnSchemas: [createDefaultDataverseColumn({ id: "shared-field", tableId: "table-any", confirmationStatus: "confirmed", confirmationSource: "Architect" })]
    } as any;

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "field:shared-field")?.resolved).toBe(false);
  });

  it("5A.1A does not allow a Canvas entity with the same ID to satisfy a model-driven dependency", () => {
    const project = createModelProject();
    project.powerPlatform!.canvas = createCanvasProject().powerPlatform!.canvas;
    project.powerPlatform!.canvas!.sharePointListSchemas[0].id = "table-case";
    project.powerPlatform!.modelDriven!.dataverseTableSchemas[0].confirmationStatus = "reviewNeeded";

    const forms = buildImplementationAssetRegistry(project).assets.find((asset) => asset.targetId === "forms-and-views")!;

    expect(forms.dependencies.find((dependency) => dependency.id === "entity:table-case")?.resolved).toBe(false);
  });

  it("5A.1A keeps a valid model-driven dependency resolved", () => {
    const forms = buildImplementationAssetRegistry(createModelProject()).assets.find((asset) => asset.targetId === "forms-and-views")!;

    expect(forms.dependencies.find((dependency) => dependency.id === "entity:table-case")?.resolved).toBe(true);
  });

  it("blocks invalid screen references", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.controlTargets[0].screenId = "missing-screen";

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.type === "screen")?.resolved).toBe(false);
    expect(asset.assetStatus).toBe("Blocked");
  });

  it("blocks invalid connector references", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.controlTargets[0].connectorId = "missing-connector";

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.type === "connector")?.resolved).toBe(false);
    expect(asset.assetStatus).toBe("Blocked");
  });

  it("blocks invalid entity references", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.controlTargets[0].entityId = "missing-entity";

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.type === "entity")?.resolved).toBe(false);
    expect(asset.assetStatus).toBe("Blocked");
  });

  it("blocks invalid field references instead of treating non-empty field IDs as resolved", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.controlTargets[0].requiredFieldIds = ["missing-field"];

    const asset = buildImplementationAssetRegistry(project).assets.find((candidate) => candidate.assetType === "powerFxPlan")!;

    expect(asset.dependencies.find((dependency) => dependency.id === "field:missing-field")?.resolved).toBe(false);
    expect(asset.blockingIssues).toEqual(expect.arrayContaining([
      "Field/column reference missing-field is missing, unconfirmed, or belongs to another parent entity."
    ]));
  });

  it("adds installation dependencies for every required implementation asset", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject("OnSelect\nVisible"));
    const requiredNonInstall = registry.assets.filter((asset) => asset.required && asset.assetType !== "installationGuide");
    const install = registry.assets.find((asset) => asset.assetType === "installationGuide")!;

    expect(install.dependencies.map((dependency) => dependency.targetAssetId).sort()).toEqual(requiredNonInstall.map((asset) => asset.assetId).sort());
    expect(install.assetStatus).toBe("Blocked");
  });

  it("links required control YAML assets to their formula assets", () => {
    const project = createCanvasProject("OnSelect\nVisible");
    project.powerPlatform!.canvas!.controlTargets[0].yamlOutputDecision = createApplicabilityDecision({
      status: "required",
      details: "Generate control YAML plan.",
      confirmationStatus: "confirmed"
    });
    project.powerPlatform!.canvas!.controlTargets[0].yamlOutputType = "Control YAML";
    project.powerPlatform!.canvas!.controlTargets[0].yamlParentType = "screen";
    project.powerPlatform!.canvas!.controlTargets[0].yamlParentId = "screen-request-form";
    project.powerPlatform!.canvas!.controlTargets[0].yamlInstallationLocation = "Power Apps Studio";
    project.powerPlatform!.canvas!.controlTargets[0].yamlValidationResponsibility = "Developer";

    const registry = buildImplementationAssetRegistry(project);
    const yaml = registry.assets.find((asset) => asset.assetId === "asset-canvas-yaml-control-control-save-request")!;

    expect(yaml.dependencies.filter((dependency) => dependency.type === "asset").map((dependency) => dependency.targetAssetId).sort()).toEqual([
      "asset-canvas-powerfx-control-save-request-onselect",
      "asset-canvas-powerfx-control-save-request-visible"
    ]);
  });

  it("validates component YAML usage targets", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.componentApplicabilityDecision = createApplicabilityDecision({
      status: "required",
      details: "Use a reusable header.",
      confirmationStatus: "confirmed"
    });
    project.powerPlatform!.canvas!.componentTargets = [
      createDefaultCanvasComponentTarget({
        id: "component-header",
        approvedComponentName: "cmpHeader",
        purpose: "Reusable header.",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect",
        usageTargets: [
          createDefaultCanvasComponentUsageTarget({
            id: "usage-screen",
            targetType: "screen",
            targetId: "screen-request-form",
            purpose: "Show header.",
            confirmationStatus: "confirmed",
            confirmationSource: "Architect"
          })
        ],
        yamlOutputDecision: createApplicabilityDecision({
          status: "required",
          details: "Generate component YAML plan.",
          confirmationStatus: "confirmed"
        }),
        yamlOutputType: "Component YAML",
        yamlParentType: "app",
        yamlInstallationLocation: "Power Apps Studio",
        yamlValidationResponsibility: "Developer"
      })
    ];

    const registry = buildImplementationAssetRegistry(project);
    const component = registry.assets.find((asset) => asset.assetId === "asset-canvas-yaml-component-component-header")!;

    expect(component.dependencies.find((dependency) => dependency.id === "component-usage:usage-screen")?.resolved).toBe(true);

    project.powerPlatform!.canvas!.componentTargets[0].usageTargets[0].targetId = "missing-screen";
    const invalid = buildImplementationAssetRegistry(project).assets.find((asset) => asset.assetId === "asset-canvas-yaml-component-component-header")!;
    expect(invalid.dependencies.find((dependency) => dependency.id === "component-usage:usage-screen")?.resolved).toBe(false);
  });

  it("detects missing asset dependencies", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const install = cloneAsset(registry.assets.find((asset) => asset.assetType === "installationGuide")!);
    install.dependencies.push({
      id: "asset:missing",
      type: "asset",
      label: "Missing",
      targetAssetId: "missing",
      required: true,
      resolved: true,
      resolutionReason: "Tampered.",
      sourceSection: "Test"
    });
    const tampered = { ...registry, assets: [registry.assets[0], install] };

    expect(validateImplementationAssetRegistry(tampered)).toContain("asset-installation-canvas-assets: dependency asset missing is missing.");
  });

  it("detects duplicate dependency IDs, duplicate target assets, duplicate target records, and self-dependencies", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const asset = cloneAsset(registry.assets[0]);
    const duplicate = cloneDependency(asset.dependencies[0]);
    asset.dependencies.push(duplicate, { ...duplicate, id: "other-duplicate-id" });
    asset.dependencies.push({
      id: "asset:install-one",
      type: "asset",
      label: "Install",
      targetAssetId: "asset-installation-canvas-assets",
      required: true,
      resolved: true,
      resolutionReason: "Tampered.",
      sourceSection: "Test"
    }, {
      id: "asset:install-two",
      type: "asset",
      label: "Install duplicate",
      targetAssetId: "asset-installation-canvas-assets",
      required: true,
      resolved: true,
      resolutionReason: "Tampered.",
      sourceSection: "Test"
    });
    asset.dependencies.push({
      id: "asset:self",
      type: "asset",
      label: "Self",
      targetAssetId: asset.assetId,
      required: true,
      resolved: true,
      resolutionReason: "Tampered.",
      sourceSection: "Test"
    });

    const issues = evaluateImplementationAssetGraph([asset]);

    expect(issues.duplicateDependencyIssues.some((issue) => issue.includes("duplicate dependency ID"))).toBe(true);
    expect(issues.duplicateDependencyIssues.some((issue) => issue.includes("duplicate target asset dependency"))).toBe(true);
    expect(issues.duplicateDependencyIssues.some((issue) => issue.includes("duplicate target record dependency"))).toBe(true);
    expect(issues.selfDependencyIssues).toEqual([`${asset.assetId}: self-dependency is not allowed.`]);
  });

  it("detects circular asset dependencies and suppresses complete order", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const first = cloneAsset(registry.assets[0]);
    const second = cloneAsset(registry.assets[1]);
    first.dependencies.push({
      id: `asset:${second.assetId}`,
      type: "asset",
      label: "Second",
      targetAssetId: second.assetId,
      required: true,
      resolved: true,
      resolutionReason: "Tampered.",
      sourceSection: "Test"
    });
    second.dependencies.push({
      id: `asset:${first.assetId}`,
      type: "asset",
      label: "First",
      targetAssetId: first.assetId,
      required: true,
      resolved: true,
      resolutionReason: "Tampered.",
      sourceSection: "Test"
    });

    const graph = evaluateImplementationAssetGraph([first, second]);

    expect(graph.circularDependencyIssues[0]).toContain("Circular dependency detected");
    expect(graph.installationOrder).toEqual([]);
  });

  it("orders dependencies before dependants using deterministic asset ID tie-breaks", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject("OnSelect\nVisible"));
    const install = registry.assets.find((asset) => asset.assetType === "installationGuide")!;
    const graph = evaluateImplementationAssetGraph(registry.assets);

    expect(graph.installationOrder.indexOf(install.assetId)).toBeGreaterThan(graph.installationOrder.indexOf("asset-canvas-powerfx-control-save-request-onselect"));
    expect(graph.installationOrder).toEqual([...graph.installationOrder].sort((a, b) => {
      if (b === install.assetId) return -1;
      if (a === install.assetId) return 1;
      return a.localeCompare(b);
    }));
  });

  it("creates deterministic checksums across generation timestamps", () => {
    const first = buildImplementationAssetRegistry(createCanvasProject(), "2026-07-15T12:00:00.000Z").assets[0];
    const second = buildImplementationAssetRegistry(createCanvasProject(), "2026-07-16T12:00:00.000Z").assets[0];

    expect(first.contentChecksum).toBe(second.contentChecksum);
  });

  it("changes checksum when intended path changes", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets[0];
    const changed = { ...asset, intendedPath: "07_Development/PowerFx/changed.fx", contentChecksum: "" };

    expect(calculateImplementationAssetChecksum(changed)).not.toBe(asset.contentChecksum);
  });

  it("changes checksum when dependencies change", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets[0];
    const changed = { ...asset, dependencies: [...asset.dependencies, { ...asset.dependencies[0], id: "screen:other", targetRecordId: "other" }], contentChecksum: "" };

    expect(calculateImplementationAssetChecksum(changed)).not.toBe(asset.contentChecksum);
  });

  it("changes checksum when gate snapshots change", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets[0];
    const changed = { ...asset, gateEvaluationSnapshot: [{ ...asset.gateEvaluationSnapshot[0], status: "blocked" as const }], contentChecksum: "" };

    expect(calculateImplementationAssetChecksum(changed)).not.toBe(asset.contentChecksum);
  });

  it("changes checksum when connector, entity, or field IDs change", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets[0];

    expect(calculateImplementationAssetChecksum({ ...asset, connectorIds: ["other"], contentChecksum: "" })).not.toBe(asset.contentChecksum);
    expect(calculateImplementationAssetChecksum({ ...asset, entityIds: ["other"], contentChecksum: "" })).not.toBe(asset.contentChecksum);
    expect(calculateImplementationAssetChecksum({ ...asset, fieldIds: ["other"], contentChecksum: "" })).not.toBe(asset.contentChecksum);
  });

  it("changes checksum when installation requirements, validation requirements, or source content changes", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets[0];

    expect(calculateImplementationAssetChecksum({ ...asset, manualInstallationRequirements: ["Changed"], contentChecksum: "" })).not.toBe(asset.contentChecksum);
    expect(calculateImplementationAssetChecksum({ ...asset, validationRequirements: ["Changed"], contentChecksum: "" })).not.toBe(asset.contentChecksum);
    expect(calculateImplementationAssetChecksum({ ...asset, sourceContent: `${asset.sourceContent}\nChanged`, contentChecksum: "" })).not.toBe(asset.contentChecksum);
  });

  it("changes checksum when known limitations or blocking issues change", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets[0];

    expect(calculateImplementationAssetChecksum({ ...asset, knownLimitations: ["Changed"], contentChecksum: "" })).not.toBe(asset.contentChecksum);
    expect(calculateImplementationAssetChecksum({ ...asset, blockingIssues: ["Changed"], contentChecksum: "" })).not.toBe(asset.contentChecksum);
  });

  it("canonical payload excludes timestamp and approval status", () => {
    const asset = buildImplementationAssetRegistry(createCanvasProject()).assets[0];
    const changed = { ...asset, generationTimestamp: "2099-01-01T00:00:00.000Z", approvalStatus: "Approved" as const };

    expect(createCanonicalAssetPayload(changed)).toBe(createCanonicalAssetPayload(asset));
  });

  it("preserves approval only when checksum and version still match", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const approved = normalizeImplementationAssetRegistry(approveRegistry(registry), createCanvasProject(), "2026-07-15T12:00:00.000Z");

    expect(approved.assets.find((asset) => asset.assetId === registry.assets[0].assetId)?.approvalStatus).toBe("Approved");
  });

  it("resets approval when display name changes", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "btnChanged";

    const normalized = normalizeImplementationAssetRegistry(approveRegistry(registry), project);

    expect(normalized.assets.find((asset) => asset.assetId === registry.assets[0].assetId)?.approvalStatus).toBe("Review required");
  });

  it("resets approval when path or dependency changes", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.controlTargets[0].screenId = "missing-screen";

    const normalized = normalizeImplementationAssetRegistry(approveRegistry(registry), project);

    expect(normalized.assets.find((asset) => asset.assetId === registry.assets[0].assetId)?.approvalStatus).toBe("Review required");
  });

  it("resets approval when gate status changes, generation version is stale, or checksum is missing", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const stored = approveRegistry(registry);
    stored.assets[0].generationVersion = "legacy";
    stored.assets[1].contentChecksum = "";

    const normalized = normalizeImplementationAssetRegistry(stored, createCanvasProject());

    expect(normalized.assets[0].approvalStatus).toBe("Review required");
    expect(normalized.assets[1].approvalStatus).toBe("Review required");
  });

  it("normalizes malformed approval values safely", () => {
    const registry = normalizeImplementationAssetRegistry({
      assets: [{ assetId: "asset-canvas-powerfx-control-save-request-onselect", approvalStatus: "Exported", contentChecksum: "x", generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION }]
    }, createCanvasProject());

    expect(registry.assets[0].approvalStatus).toBe("Review required");
    expect(registry.assets.every((asset) => asset.assetStatus !== "Exported")).toBe(true);
  });

  it("recomputes validation from current assets instead of trusting stored registry issues", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const tampered = { ...registry, dependencyIssues: [], circularDependencyIssues: [] };
    const asset = cloneAsset(tampered.assets[0]);
    asset.dependencies.push({
      id: "asset:missing",
      type: "asset",
      label: "Missing",
      targetAssetId: "missing",
      required: true,
      resolved: true,
      resolutionReason: "Tampered.",
      sourceSection: "Test"
    });

    expect(validateImplementationAssetRegistry({ ...tampered, assets: [asset] })).toContain(`${asset.assetId}: dependency asset missing is missing.`);
  });

  it("detects tampered unresolved record dependencies during validation", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const asset = cloneAsset(registry.assets[0]);
    asset.dependencies[0].resolved = false;
    asset.dependencies[0].blockingIssue = "Tampered unresolved record.";

    expect(validateImplementationAssetRegistry({ ...registry, assets: [asset] })).toContain(`${asset.assetId}: Tampered unresolved record.`);
  });

  it("detects duplicate asset IDs, duplicate paths, and checksum mismatch during validation", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const first = cloneAsset(registry.assets[0]);
    const duplicate = { ...cloneAsset(registry.assets[1]), assetId: first.assetId, intendedPath: first.intendedPath, contentChecksum: "bad" };

    const issues = validateImplementationAssetRegistry({ ...registry, assets: [first, duplicate] });

    expect(issues).toEqual(expect.arrayContaining([
      `Duplicate asset ID: ${first.assetId}.`,
      `Duplicate implementation asset path: ${first.intendedPath}.`,
      `Checksum mismatch for ${duplicate.assetId}.`
    ]));
  });

  it("keeps model-driven source records and entity IDs semantically distinct", () => {
    const registry = buildImplementationAssetRegistry(createModelProject());
    const forms = registry.assets.find((asset) => asset.targetId === "forms-and-views")!;
    const navigation = registry.assets.find((asset) => asset.targetId === "navigation")!;
    const security = registry.assets.find((asset) => asset.targetId === "security")!;
    const automation = registry.assets.find((asset) => asset.targetId === "automations")!;

    expect(forms.sourceRecordIds).toContain("forms-and-views");
    expect(forms.entityIds).toEqual(["table-case"]);
    expect(forms.entityIds).not.toContain("forms-and-views");
    expect(navigation.entityIds).toEqual(["table-case"]);
    expect(navigation.entityIds).not.toContain("navigation");
    expect(security.sourceRecordIds).toEqual(expect.arrayContaining(["security", "security-roles", "teams", "field-security"]));
    expect(security.fieldIds).toContain("column-case-title");
    expect(automation.connectorIds).toEqual([]);
    expect(automation.entityIds).toEqual(["table-case"]);
  });

  it("does not fabricate model-driven solution XML or importable source", () => {
    const registry = buildImplementationAssetRegistry(createModelProject());

    expect(registry.assets.every((asset) => !/solution\s+xml|<ImportExportXml|customizations\.xml|\.zip/i.test(asset.sourceContent))).toBe(true);
  });

  it("keeps project package readiness and implementation readiness distinct", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());

    expect(registry.packageReadiness).toBe("Draft");
    expect(registry.summary.assetPackageStatus).not.toBe("Not Applicable");
    expect(registry.summary.effectiveImplementationReadiness).not.toBe("Ready for Export");
  });

  it("returns a not-applicable empty registry for non-Power-Platform projects", () => {
    const registry = buildImplementationAssetRegistry(createProject({
      identity: { id: "website", projectName: "Website" },
      intake: { appType: "businessWebsite" }
    }));

    expect(registry.assets).toHaveLength(0);
    expect(registry.summary.assetPackageStatus).toBe("Not Applicable");
    expect(validateImplementationAssetRegistry(registry)).toEqual([]);
  });

  it("creates complete manifest foundations and validates them", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    const markdown = renderImplementationAssetManifestMarkdown(manifest);

    expect(IMPLEMENTATION_ASSET_MANIFEST_JSON_PATH).toBe("07_Development/IMPLEMENTATION_ASSET_MANIFEST.json");
    expect(IMPLEMENTATION_ASSET_MANIFEST_MARKDOWN_PATH).toBe("07_Development/IMPLEMENTATION_ASSET_MANIFEST.md");
    expect(manifest.assetCount).toBe(registry.assets.length);
    expect(manifest.assetPaths).toEqual(registry.assets.map((asset) => asset.intendedPath));
    expect(manifest.generationOrder).toEqual(registry.generationOrder);
    expect(manifest.installationOrder).toEqual(registry.installationOrder);
    expect(manifest.projectPackageReadiness).toBe(registry.packageReadiness);
    expect(manifest.assetPackageStatus).toBe(registry.assetPackageStatus);
    expect(manifest.effectiveImplementationReadiness).toBe(registry.effectiveImplementationReadiness);
    expect(validateImplementationAssetManifest(manifest, registry, project)).toEqual([]);
    expect(markdown).toContain("GPT Project Builder has not installed, imported, tested in Studio, published, deployed, or production-verified");
  });

  it("rejects tampered manifests", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    manifest.assetCount += 1;
    manifest.assets[0].checksum = "bad";
    manifest.installationOrder = ["missing"];

    expect(validateImplementationAssetManifest(manifest, registry, project)).toEqual(expect.arrayContaining([
      "Manifest assetCount does not match registry.",
      `Manifest asset ${registry.assets[0].assetId} does not match registry projection.`,
      "Manifest installation order does not match registry projection."
    ]));
  });

  it("rejects manifests with missing assets, path mismatches, status mismatches, and dependency issue mismatches", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    manifest.assets = manifest.assets.slice(1);
    manifest.assetPaths = ["bad/path.md"];
    manifest.dependencyIssues = ["bad issue"];
    manifest.circularDependencyIssues = ["bad cycle"];
    manifest.generationOrder = ["bad-order"];
    manifest.assets[0].intendedPath = "changed.md";
    manifest.assets[0].status = "Exported";

    const issues = validateImplementationAssetManifest(manifest, registry, project);

    expect(issues).toEqual(expect.arrayContaining([
      "Manifest asset paths do not match registry.",
      "Manifest dependency issues do not match registry projection.",
      "Manifest circular dependency issues do not match registry projection.",
      "Manifest generation order does not match registry projection.",
      `Manifest is missing asset ${registry.assets[0].assetId}.`,
      "Manifest asset list count does not match registry."
    ]));
  });

  it("rejects stale registry summary counts, readiness, and order fields", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const tampered = {
      ...registry,
      assetPackageStatus: "Ready for Export" as const,
      effectiveImplementationReadiness: "Ready for Export" as const,
      generationOrder: [...registry.generationOrder].reverse(),
      installationOrder: ["tampered"],
      dependencyIssues: ["tampered"],
      summary: {
        ...registry.summary,
        readyAssetCount: registry.summary.readyAssetCount + 1,
        blockedAssetCount: registry.summary.blockedAssetCount + 1,
        assetPackageStatus: "Ready for Export" as const,
        effectiveImplementationReadiness: "Ready for Export" as const
      }
    };

    expect(validateImplementationAssetRegistry(tampered, project)).toEqual(expect.arrayContaining([
      "Registry asset package status is stale.",
      "Registry effective implementation readiness is stale.",
      "Registry dependency issue list is stale.",
      "Registry generation order is stale.",
      "Registry installation order is stale.",
      "Registry summary readyAssetCount is stale.",
      "Registry summary blockedAssetCount is stale."
    ]));
  });

  it("derives complete registry state from current project and asset data", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const state = deriveImplementationAssetRegistryState(project, registry.assets);

    expect(state.assets.map((asset) => asset.assetStatus)).toEqual(registry.assets.map((asset) => asset.assetStatus));
    expect(state.graph.generationOrder).toEqual(registry.generationOrder);
    expect(state.graph.installationOrder).toEqual(registry.installationOrder);
    expect(state.summary.readyAssetCount).toBe(registry.summary.readyAssetCount);
    expect(state.assetPackageStatus).toBe(registry.assetPackageStatus);
    expect(state.effectiveImplementationReadiness).toBe(registry.effectiveImplementationReadiness);
  });

  it("rejects an asset manually marked ready while its recalculated dependency is blocked", () => {
    const project = createCanvasProjectWithControlYaml();
    const registry = buildImplementationAssetRegistry(project);
    const yaml = cloneAsset(registry.assets.find((asset) => asset.assetType === "canvasYamlPlan" && asset.targetId === "control-save-request")!);
    yaml.assetStatus = "Ready for Export";
    yaml.approvalStatus = "Approved";
    yaml.dependencies = yaml.dependencies.map((dependency) => dependency.type === "asset" ? { ...dependency, resolved: true } : dependency);
    yaml.contentChecksum = calculateImplementationAssetChecksum({ ...yaml, contentChecksum: "" });

    expect(validateImplementationAssetRegistry({ ...registry, assets: registry.assets.map((asset) => asset.assetId === yaml.assetId ? yaml : asset) }, project)).toContain(`Asset status for ${yaml.assetId} is stale.`);
  });

  it("recalculates current asset dependency status from the referenced asset instead of stored resolved values", () => {
    const project = createCanvasProjectWithControlYaml();
    const registry = buildImplementationAssetRegistry(project);
    const formula = cloneAsset(registry.assets.find((asset) => asset.assetType === "powerFxPlan")!);
    const yaml = cloneAsset(registry.assets.find((asset) => asset.assetType === "canvasYamlPlan" && asset.targetId === "control-save-request")!);
    yaml.dependencies = yaml.dependencies.map((dependency) => dependency.type === "asset" ? { ...dependency, resolved: true } : dependency);

    const derived = evaluateImplementationAssetDependencies(project, [formula, yaml]).assets.find((asset) => asset.assetId === yaml.assetId)!;

    expect(derived.dependencies.find((dependency) => dependency.type === "asset")?.resolved).toBe(false);
    expect(derived.assetStatus).toBe("Blocked");
  });

  it("requires YAML formula dependencies to be Ready for Export and checksum-valid", () => {
    const project = createCanvasProjectWithControlYaml();
    const registry = buildImplementationAssetRegistry(project);
    const baseFormula = registry.assets.find((asset) => asset.assetType === "powerFxPlan")!;
    const baseYaml = registry.assets.find((asset) => asset.assetType === "canvasYamlPlan" && asset.targetId === "control-save-request")!;
    const blockedProject = createCanvasProjectWithControlYaml();
    blockedProject.powerPlatform!.canvas!.sharePointColumnSchemas[0].parentId = "missing-parent";
    const blocked = buildImplementationAssetRegistry(blockedProject).assets.find((asset) => asset.assetType === "powerFxPlan")!;
    const draft = withValidChecksum({ ...cloneAsset(baseFormula), applicabilityStatus: "undecided", blockingIssues: [], approvalStatus: "Approved" });
    const review = withValidChecksum({ ...cloneAsset(baseFormula), blockingIssues: [], approvalStatus: "Review required" });
    const ready = readyAsset(baseFormula);
    const changedChecksum = { ...ready, contentChecksum: "bad-checksum" };

    expect(evaluateImplementationAssetDependencies(blockedProject, [blocked, cloneAsset(baseYaml)]).assets[1].dependencies.find((dependency) => dependency.type === "asset")?.resolved).toBe(false);
    expect(evaluateImplementationAssetDependencies(project, [draft, cloneAsset(baseYaml)]).assets[1].dependencies.find((dependency) => dependency.type === "asset")?.resolved).toBe(false);
    expect(evaluateImplementationAssetDependencies(project, [review, cloneAsset(baseYaml)]).assets[1].dependencies.find((dependency) => dependency.type === "asset")?.resolved).toBe(false);
    expect(evaluateImplementationAssetDependencies(project, [ready, cloneAsset(baseYaml)]).assets[1].dependencies.find((dependency) => dependency.type === "asset")?.resolved).toBe(true);
    expect(validateImplementationAssetRegistry({ ...registry, assets: [changedChecksum, cloneAsset(baseYaml)] }, project)).toContain(`Checksum mismatch for ${changedChecksum.assetId}.`);
    expect(evaluateImplementationAssetDependencies(project, [cloneAsset(baseYaml)]).assets[0].dependencies.find((dependency) => dependency.type === "asset")?.resolved).toBe(false);
  });

  it("requires installation dependencies to be Ready upstream assets and its own approval before export", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const formula = registry.assets.find((asset) => asset.assetType === "powerFxPlan")!;
    const install = cloneAsset(registry.assets.find((asset) => asset.assetType === "installationGuide")!);
    install.dependencies = install.dependencies.filter((dependency) => dependency.targetAssetId === formula.assetId);
    const blockedProject = createCanvasProject();
    blockedProject.powerPlatform!.canvas!.sharePointColumnSchemas[0].parentId = "missing-parent";
    const blockedFormula = buildImplementationAssetRegistry(blockedProject).assets.find((asset) => asset.assetType === "powerFxPlan")!;
    const reviewFormula = withValidChecksum({ ...cloneAsset(formula), blockingIssues: [], approvalStatus: "Review required" });
    const readyFormula = readyAsset(formula);

    expect(evaluateImplementationAssetDependencies(blockedProject, [blockedFormula, cloneAsset(install)]).assets[1].assetStatus).toBe("Blocked");
    expect(evaluateImplementationAssetDependencies(project, [reviewFormula, cloneAsset(install)]).assets[1].assetStatus).toBe("Blocked");
    expect(evaluateImplementationAssetDependencies(project, [cloneAsset(install)]).assets[0].assetStatus).toBe("Blocked");
    const derived = evaluateImplementationAssetDependencies(project, [readyFormula, cloneAsset(install)]).assets[1];
    expect(derived.dependencies.every((dependency) => dependency.resolved)).toBe(true);
    expect(derived.assetStatus).toBe("Review Required");
  });

  it("does not resolve unapproved or incomplete connectors", () => {
    const project = createCanvasProject();
    project.powerPlatform!.common.connectors[0].approvalConfirmationStatus = "reviewNeeded";
    expect(buildImplementationAssetRegistry(project).assets.find((asset) => asset.assetType === "powerFxPlan")?.dependencies.find((dependency) => dependency.type === "connector")?.resolved).toBe(false);

    const unclassified = createCanvasProject();
    unclassified.powerPlatform!.common.connectors[0].classificationConfirmationStatus = "reviewNeeded";
    expect(buildImplementationAssetRegistry(unclassified).assets.find((asset) => asset.assetType === "powerFxPlan")?.dependencies.find((dependency) => dependency.type === "connector")?.resolved).toBe(false);

    const missingOwner = createCanvasProject();
    missingOwner.powerPlatform!.common.connectors[0].connectionOwner = "";
    expect(buildImplementationAssetRegistry(missingOwner).assets.find((asset) => asset.assetType === "powerFxPlan")?.dependencies.find((dependency) => dependency.type === "connector")?.resolved).toBe(false);
  });

  it("keeps free-text model-driven specifications from claiming all tables and columns", () => {
    const project = createModelProject();
    project.powerPlatform!.modelDriven!.formDefinitions = "";
    project.powerPlatform!.modelDriven!.viewDefinitions = "";
    project.powerPlatform!.modelDriven!.navigationDefinitions = "";
    project.powerPlatform!.modelDriven!.fieldSecurityProfiles = "Sensitive profile.";
    project.powerPlatform!.modelDriven!.automations = "Notify case owner.";

    const registry = buildImplementationAssetRegistry(project);
    const forms = registry.assets.find((asset) => asset.targetId === "forms-and-views")!;
    const navigation = registry.assets.find((asset) => asset.targetId === "navigation")!;
    const security = registry.assets.find((asset) => asset.targetId === "security")!;
    const automation = registry.assets.find((asset) => asset.targetId === "automations")!;

    expect(forms.entityIds).toEqual([]);
    expect(navigation.entityIds).toEqual([]);
    expect(security.fieldIds).toEqual([]);
    expect(automation.entityIds).toEqual([]);
    expect([forms, navigation, security, automation].every((asset) => asset.assetStatus === "Blocked")).toBe(true);
  });

  it("resets approval when duplicate persisted approval records conflict", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const approval = approveRegistry(registry);
    approval.assets.push({ ...approval.assets[0], contentChecksum: "different" });

    const normalized = normalizeImplementationAssetRegistry(approval, createCanvasProject());

    expect(normalized.assets.find((asset) => asset.assetId === approval.assets[0].assetId)?.approvalStatus).toBe("Review required");
  });

  it("rejects manifest dependency, gate, approval, and instruction tampering", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    manifest.assets[0].dependencies = [];
    manifest.assets[0].gateSnapshots = [];
    manifest.assets[0].approvalStatus = "Approved";
    manifest.assets[0].manualInstallationRequirements = ["Tampered"];
    manifest.assets[0].validationRequirements = ["Tampered"];
    manifest.assets[0].targetDisplayName = "Tampered";
    manifest.assets[0].assetCategory = "Installation";
    manifest.assets[0].assetType = "installationGuide";
    manifest.generationTimestamp = "2099-01-01T00:00:00.000Z";

    expect(validateImplementationAssetManifest(manifest, registry, project)).toEqual(expect.arrayContaining([
      "Manifest generationTimestamp does not match registry.",
      `Manifest asset ${registry.assets[0].assetId} does not match registry projection.`
    ]));
  });

  it("rejects duplicate, missing, and extra manifest assets and paths", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    manifest.assets = [
      { ...manifest.assets[0] },
      { ...manifest.assets[0], intendedPath: manifest.assets[0].intendedPath },
      { ...manifest.assets[0], assetId: "extra-asset", intendedPath: "extra.md" }
    ];

    expect(validateImplementationAssetManifest(manifest, registry, project)).toEqual(expect.arrayContaining([
      `Duplicate manifest asset ID: ${registry.assets[0].assetId}.`,
      `Duplicate manifest path: ${registry.assets[0].intendedPath}.`,
      `Manifest is missing asset ${registry.assets[1].assetId}.`,
      "Manifest has extra asset extra-asset."
    ]));
  });

  it("5A.2 validates a manifest created from a valid current registry", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);

    expect(validateImplementationAssetManifest(manifest, registry, project)).toEqual([]);
  });

  it("5A.2 manifest creation recalculates stale registry summary counts", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const stale = { ...registry, summary: { ...registry.summary, blockedAssetCount: 0, readyAssetCount: 99 } };

    const manifest = createImplementationAssetManifest(stale, project);

    expect(manifest.blockedAssetCount).toBe(registry.summary.blockedAssetCount);
    expect(manifest.readyAssetCount).toBe(registry.summary.readyAssetCount);
  });

  it("5A.2 manifest creation recalculates stale asset package status", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest({ ...registry, assetPackageStatus: "Ready for Export" }, project);

    expect(manifest.assetPackageStatus).toBe(registry.assetPackageStatus);
  });

  it("5A.2 manifest creation recalculates stale effective readiness", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest({ ...registry, effectiveImplementationReadiness: "Ready for Export" }, project);

    expect(manifest.effectiveImplementationReadiness).toBe(registry.effectiveImplementationReadiness);
  });

  it("5A.2 manifest creation recalculates stale dependency issues", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest({ ...registry, dependencyIssues: [] }, project);

    expect(manifest.dependencyIssues).toEqual(registry.dependencyIssues);
  });

  it("5A.2 manifest creation recalculates stale generation and installation order", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest({ ...registry, generationOrder: ["stale"], installationOrder: ["stale"] }, project);

    expect(manifest.generationOrder).toEqual(registry.generationOrder);
    expect(manifest.installationOrder).toEqual(registry.installationOrder);
  });

  it("5A.2 prevents a stale Ready registry with a blocked asset from producing a Ready manifest", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const stale = {
      ...registry,
      assetPackageStatus: "Ready for Export" as const,
      effectiveImplementationReadiness: "Ready for Export" as const,
      summary: { ...registry.summary, readyAssetCount: registry.assets.length, blockedAssetCount: 0 }
    };

    const manifest = createImplementationAssetManifest(stale, project);

    expect(manifest.assetPackageStatus).not.toBe("Ready for Export");
    expect(manifest.blockedAssetCount).toBeGreaterThan(0);
  });

  it("5A.2 invalidates a manifest created before a current gate failure", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    project.intake.accessibilityNotes = "";

    expect(validateImplementationAssetManifest(manifest, registry, project)).toEqual(expect.arrayContaining([
      expect.stringContaining("Registry integrity: Gate snapshot")
    ]));
  });

  it("5A.2 invalidates a manifest created before a current relationship change", () => {
    const project = createMultiConnectorProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    setControlDataReference(project, "connector-sharepoint", "list-other", ["field-other-list-title"]);

    expect(validateImplementationAssetManifest(manifest, registry, project)).toEqual(expect.arrayContaining([
      expect.stringContaining("Registry integrity: Dependency resolution")
    ]));
  });

  it("5A.2 validates a manifest created from current derived state after a change", () => {
    const project = createMultiConnectorProject();
    const registry = buildImplementationAssetRegistry(project);
    setControlDataReference(project, "connector-sharepoint", "list-other", ["field-other-list-title"]);
    const currentRegistry = { ...registry, assets: deriveImplementationAssetRegistryState(project, registry.assets).assets };
    const manifest = createImplementationAssetManifest(currentRegistry, project);

    expect(validateImplementationAssetManifest(manifest, currentRegistry, project)).toEqual([]);
  });

  it("5A.2 rejects a registry project ID mismatch", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);

    expect(validateImplementationAssetManifest(manifest, { ...registry, projectId: "other-project" }, project)).toContain("Registry integrity: Registry project ID does not match project.");
  });

  it("5A.2 rejects a manifest project ID mismatch", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = { ...createImplementationAssetManifest(registry, project), projectId: "other-project" };

    expect(validateImplementationAssetManifest(manifest, registry, project)).toContain("Manifest project ID does not match project.");
  });

  it("5A.2 rejects a manifest project name mismatch", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = { ...createImplementationAssetManifest(registry, project), projectName: "Other name" };

    expect(validateImplementationAssetManifest(manifest, registry, project)).toContain("Manifest project name does not match project.");
  });

  it("5A.2 rejects a manifest project type mismatch", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = { ...createImplementationAssetManifest(registry, project), projectType: "Other type" };

    expect(validateImplementationAssetManifest(manifest, registry, project)).toContain("Manifest project type does not match project.");
  });

  it("5A.2 keeps manifest dependency tampering rejected", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    manifest.assets[0].dependencies = [];

    expect(validateImplementationAssetManifest(manifest, registry, project)).toContain(`Manifest asset ${registry.assets[0].assetId} does not match registry projection.`);
  });

  it("5A.2 keeps manifest gate tampering rejected", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    manifest.assets[0].gateSnapshots = [];

    expect(validateImplementationAssetManifest(manifest, registry, project)).toContain(`Manifest asset ${registry.assets[0].assetId} does not match registry projection.`);
  });

  it("5A.2 keeps manifest approval tampering rejected", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const manifest = createImplementationAssetManifest(registry, project);
    manifest.assets[0].approvalStatus = "Approved";

    expect(validateImplementationAssetManifest(manifest, registry, project)).toContain(`Manifest asset ${registry.assets[0].assetId} does not match registry projection.`);
  });

  it("5A.2 manifest creation does not mutate the supplied registry", () => {
    const project = createCanvasProject();
    const registry = buildImplementationAssetRegistry(project);
    const before = JSON.stringify(registry);

    createImplementationAssetManifest(registry, project);

    expect(JSON.stringify(registry)).toBe(before);
  });

  it("converts gate snapshots back to typed phase gate results", () => {
    const result = gateResultsForAsset(buildImplementationAssetRegistry(createCanvasProject()).assets[0]);

    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("sourceSection");
  });

  it("normalizes null, non-object, missing arrays, malformed records, unknown statuses, legacy versions, and duplicates safely", () => {
    const project = createCanvasProject();

    expect(normalizeImplementationAssetRegistry(null, project).assets.length).toBeGreaterThan(0);
    expect(normalizeImplementationAssetRegistry("legacy", project).assets.length).toBeGreaterThan(0);
    expect(normalizeImplementationAssetRegistry({ assets: "bad" }, project).assets.length).toBeGreaterThan(0);
    const normalized = normalizeImplementationAssetRegistry({
      assets: [
        null,
        { assetId: "asset-canvas-powerfx-control-save-request-onselect", approvalStatus: "Bad", contentChecksum: "legacy", generationVersion: "legacy" },
        { assetId: "asset-canvas-powerfx-control-save-request-onselect", approvalStatus: "Approved", contentChecksum: "legacy", generationVersion: "legacy" }
      ]
    }, project);
    expect(normalized.assets.find((asset) => asset.assetId === "asset-canvas-powerfx-control-save-request-onselect")?.approvalStatus).toBe("Review required");
  });

  it("keeps Phase 5A source content as planning records only", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject());
    const combined = registry.assets.map((asset) => asset.sourceContent).join("\n");

    expect(combined).toContain("Phase 5A registry output only");
    expect(combined).not.toMatch(/\bPatch\s*\(|<CanvasApp|<ImportExportXml|solution\.xml|Published successfully|Deployed successfully/i);
  });
});
