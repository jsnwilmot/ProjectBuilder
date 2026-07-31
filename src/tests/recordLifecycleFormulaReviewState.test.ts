import { createProject } from "../lib/createProject";
import {
  buildImplementationAssetRegistry,
  normalizeImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetDependency
} from "../lib/implementationAssets";
import {
  buildRecordLifecycleFormulaReviewContract,
  buildRecordLifecycleFormulaReviewState,
  RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
  type RecordLifecycleFormulaReviewReference
} from "../lib/recordLifecycleFormulaReviewState";
import { CANVAS_RECORD_LIFECYCLE_ASSET_ID } from "../lib/recordLifecyclePlanning";
import {
  PERMANENT_DELETE_BLOCKER,
  RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
  RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION
} from "../lib/recordLifecyclePowerFxGeneration";
import {
  createApplicabilityDecision,
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import type { CanvasRecordLifecycleTarget, CanvasStateVariableTarget, ProjectRecord } from "../types/project";

const NOW = "2026-07-15T12:00:00.000Z";

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
  pp.common.securityTesting = "Security tests.";
  pp.common.accessibilityTesting = "Accessibility tests.";
  pp.common.performanceTesting = "Performance tests.";
  pp.common.volumeTesting = "Volume tests.";
  pp.common.integrationTesting = "Integration tests.";
  pp.common.regressionTesting = "Regression tests.";
  pp.common.userAcceptanceTesting = "User acceptance tests.";
  pp.common.deploymentTesting = "Deployment test plan only.";
  pp.common.productionSmokeTesting = "Production smoke tests.";
  pp.common.testingPlanConfirmationStatus = "confirmed";
  pp.common.sourceControlApproach = "Source-control notes.";
  pp.common.gitIntegration = "Not applicable because Git integration is not approved for this fixture.";
  pp.common.powerPlatformCliAvailability = "Not applicable because CLI automation is not approved for this fixture.";
  pp.common.deploymentMethod = "Manual deployment.";
  pp.common.deploymentResponsibility = "Deployment owner handles external deployment.";
  pp.common.deploymentOwner = "Deployment owner";
  pp.common.deploymentResponsibilityStatus = "confirmed";
  pp.common.deploymentStrategy = "Dev/test/prod.";
  pp.common.connectionReferences = "SharePoint connection reference.";
  pp.common.environmentVariables = "SharePoint site URL.";
  pp.common.pipelineRequirements = "Manual approval.";
  pp.common.rollbackExpectations = "Restore previous app version.";
  pp.common.releaseApprovalResponsibility = "Business owner.";
  pp.common.almConfirmationStatus = "confirmed";
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
      supportedOperations: { read: true, create: true, update: true, delete: true, archive: true, restore: true },
      approvalConfirmationStatus: "confirmed"
    })
  ];
  pp.canvas!.primaryDataSourceType = "sharePointList";
  pp.canvas!.primaryConnectorId = "connector-sharepoint";
  pp.canvas!.sourcePurpose = "Store requests.";
  pp.canvas!.sourceOwnership = "Operations.";
  pp.canvas!.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
  pp.canvas!.sharePointSiteTitle = "Operations";
  pp.canvas!.sharePointSiteOwner = "Operations owner";
  pp.canvas!.sharePointAccessStatus = "confirmed";
  pp.canvas!.schemaStatus = "confirmed";
  pp.canvas!.internalNameStatus = "confirmed";
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

function lifecycleTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return {
    id: overrides.id ?? "archive-request",
    action: overrides.action ?? "archive",
    trigger: overrides.trigger ?? "controlOnSelect",
    triggerControlId: overrides.triggerControlId ?? "control-archive-request",
    screenTargetId: overrides.screenTargetId ?? "screen-request-form",
    connectorId: overrides.connectorId ?? "connector-sharepoint",
    entityId: overrides.entityId ?? "list-requests",
    recordContextType: overrides.recordContextType ?? "selectedRecord",
    recordContextReferenceId: overrides.recordContextReferenceId ?? "control-request-gallery",
    archiveStrategy: overrides.archiveStrategy ?? "statusField",
    lifecycleFieldId: overrides.lifecycleFieldId ?? "field-status",
    archiveValue: overrides.archiveValue ?? "Archived",
    restoreValue: overrides.restoreValue ?? "Active",
    deleteStrategy: overrides.deleteStrategy ?? "missingDecision",
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    destructiveActionConfirmed: overrides.destructiveActionConfirmed ?? false,
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function restoreLifecycleTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "restore-request",
    action: "restore",
    triggerControlId: "control-restore-request",
    sortOrder: 20,
    ...overrides
  });
}

function deleteLifecycleTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "delete-request",
    action: "delete",
    triggerControlId: "control-delete-request",
    archiveStrategy: "notApplicable",
    lifecycleFieldId: "",
    archiveValue: "",
    restoreValue: "",
    deleteStrategy: "permanentDeleteApproved",
    destructiveActionConfirmed: true,
    sortOrder: 30,
    ...overrides
  });
}

function savingStateVariable(overrides: Partial<CanvasStateVariableTarget> = {}): CanvasStateVariableTarget {
  return {
    id: overrides.id ?? "state-lifecycle-saving",
    implementationName: overrides.implementationName ?? "varLifecycleSaving",
    purpose: overrides.purpose ?? "Tracks lifecycle save state.",
    stateRole: overrides.stateRole ?? "savingState",
    initialValue: overrides.initialValue ?? { kind: "boolean", value: false },
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function createRecordLifecycleProject(targets: CanvasRecordLifecycleTarget[] = [lifecycleTarget(), restoreLifecycleTarget()]): ProjectRecord {
  const project = createCanvasProject();
  const canvas = project.powerPlatform!.canvas!;
  canvas.controlTargets = [
    ...canvas.controlTargets,
    createDefaultCanvasControlTarget({ id: "control-archive-request", screenId: "screen-request-form", approvedControlName: "btnArchiveRequest", controlType: "button", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "control-restore-request", screenId: "screen-request-form", approvedControlName: "btnRestoreRequest", controlType: "button", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "control-delete-request", screenId: "screen-request-form", approvedControlName: "btnDeleteRequest", controlType: "button", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "control-request-gallery", screenId: "screen-request-form", approvedControlName: "galRequests", controlType: "gallery", confirmationStatus: "confirmed", confirmationSource: "Architect" })
  ];
  canvas.stateVariableTargets = [
    savingStateVariable(),
    {
      id: "state-selected-record",
      implementationName: "varSelectedRecord",
      purpose: "Selected request record.",
      stateRole: "selectedRecord",
      initialValue: { kind: "blank" },
      confirmationStatus: "confirmed",
      required: true,
      sortOrder: 20
    }
  ];
  canvas.sharePointColumnSchemas = [
    ...canvas.sharePointColumnSchemas,
    createDefaultSharePointColumn({
      id: "field-status",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Status",
      internalName: "Status",
      columnType: "Single line of text",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.recordLifecycleTargets = targets;
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

function approvedRegistryFor(project: ProjectRecord) {
  return normalizeImplementationAssetRegistry(approveRegistry(buildImplementationAssetRegistry(project, NOW)), project, NOW);
}

function formulaAsset(registry: ReturnType<typeof buildImplementationAssetRegistry>): ImplementationAsset {
  const asset = registry.assets.find((candidate) => candidate.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID);
  if (!asset) throw new Error("Record lifecycle formula asset missing");
  return asset;
}

function planningAsset(registry: ReturnType<typeof buildImplementationAssetRegistry>): ImplementationAsset {
  const asset = registry.assets.find((candidate) => candidate.assetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID);
  if (!asset) throw new Error("Record lifecycle planning asset missing");
  return asset;
}

function cloneAsset(asset: ImplementationAsset): ImplementationAsset {
  return JSON.parse(JSON.stringify(asset)) as ImplementationAsset;
}

function cloneDependency(dependency: ImplementationAssetDependency): ImplementationAssetDependency {
  return JSON.parse(JSON.stringify(dependency)) as ImplementationAssetDependency;
}

function baselineFormulaRegistry() {
  return approvedRegistryFor(createRecordLifecycleProject());
}

function baselineReferenceFor(contractResult: ReturnType<typeof buildRecordLifecycleFormulaReviewContract>): RecordLifecycleFormulaReviewReference {
  return {
    assetId: contractResult.contract.assetId,
    reviewContractVersion: contractResult.contract.reviewContractVersion,
    reviewContractChecksum: contractResult.reviewContractChecksum
  };
}

function referenceStatusAgainstContract(
  reference: RecordLifecycleFormulaReviewReference,
  contractResult: ReturnType<typeof buildRecordLifecycleFormulaReviewContract>
) {
  return reference.assetId === contractResult.contract.assetId
    && reference.reviewContractVersion === contractResult.contract.reviewContractVersion
    && reference.reviewContractChecksum === contractResult.reviewContractChecksum
    ? "Current"
    : "Stale";
}

function registryReplacingFormulaAsset(
  registry: ReturnType<typeof buildImplementationAssetRegistry>,
  originalAssetId: string,
  changedAsset: ImplementationAsset
) {
  return {
    ...registry,
    assets: registry.assets.map((asset) => asset.assetId === originalAssetId ? changedAsset : asset)
  };
}

function mutateDependencyByType(
  asset: ImplementationAsset,
  type: ImplementationAssetDependency["type"],
  mutate: (dependency: ImplementationAssetDependency) => void
) {
  const dependency = asset.dependencies.find((candidate) => candidate.type === type);
  if (!dependency) throw new Error(`Missing ${type} dependency`);
  mutate(dependency);
}

function mutateFirstDependency(asset: ImplementationAsset, mutate: (dependency: ImplementationAssetDependency) => void) {
  const dependency = asset.dependencies[0];
  if (!dependency) throw new Error("Missing formula dependency");
  mutate(dependency);
}

type AssetMutationCase = {
  name: string;
  mutate: (asset: ImplementationAsset) => void;
};

const checksumMutationCases: AssetMutationCase[] = [
  { name: "contentChecksum", mutate: (asset) => { asset.contentChecksum = "fnv1a-11111111"; } },
  { name: "generationVersion", mutate: (asset) => { asset.generationVersion = "phase-5b.4c.2"; } },
  { name: "sourcePlanningAssetId", mutate: (asset) => { asset.generationInputs = { ...asset.generationInputs, sourcePlanningAssetId: "asset-other-planning" }; } },
  { name: "sourcePlanningAssetChecksum", mutate: (asset) => { asset.generationInputs = { ...asset.generationInputs, sourcePlanningAssetChecksum: "fnv1a-22222222" }; } },
  { name: "planningGenerationVersion", mutate: (asset) => { asset.generationInputs = { ...asset.generationInputs, planningGenerationVersion: "phase-5b.4d.2" }; } },
  { name: "connectorIds", mutate: (asset) => { asset.connectorIds = [...asset.connectorIds, "connector-secondary"]; } },
  { name: "entityIds", mutate: (asset) => { asset.entityIds = [...asset.entityIds, "list-secondary"]; } },
  { name: "fieldIds", mutate: (asset) => { asset.fieldIds = [...asset.fieldIds, "field-secondary"]; } },
  { name: "screen dependency", mutate: (asset) => mutateDependencyByType(asset, "screen", (dependency) => { dependency.targetRecordId = "screen-other"; }) },
  { name: "control dependency", mutate: (asset) => mutateDependencyByType(asset, "control", (dependency) => { dependency.targetRecordId = "control-other"; }) },
  { name: "saving-state dependency", mutate: (asset) => mutateDependencyByType(asset, "stateVariable", (dependency) => { dependency.targetRecordId = "state-other"; }) },
  { name: "sourceRecordIds", mutate: (asset) => { asset.sourceRecordIds = [...asset.sourceRecordIds, "record-other"]; } },
  { name: "requiredGateIds", mutate: (asset) => { asset.requiredGateIds = [...asset.requiredGateIds, "testing"]; } },
  { name: "gate status", mutate: (asset) => { asset.gateEvaluationSnapshot[0].status = "blocked" as never; } },
  { name: "gate passed value", mutate: (asset) => { asset.gateEvaluationSnapshot[0].passed = !asset.gateEvaluationSnapshot[0].passed; } },
  { name: "gate blocking reason", mutate: (asset) => { asset.gateEvaluationSnapshot[0].blockingReason = "Changed blocking reason."; } },
  { name: "dependency ID", mutate: (asset) => mutateFirstDependency(asset, (dependency) => { dependency.id = `${dependency.id}:changed`; }) },
  { name: "dependency type", mutate: (asset) => mutateFirstDependency(asset, (dependency) => { dependency.type = "connector"; }) },
  { name: "dependency targetAssetId", mutate: (asset) => mutateFirstDependency(asset, (dependency) => { dependency.targetAssetId = "asset-other"; }) },
  { name: "dependency targetRecordId", mutate: (asset) => mutateFirstDependency(asset, (dependency) => { dependency.targetRecordId = "record-other"; }) },
  { name: "dependency required value", mutate: (asset) => mutateFirstDependency(asset, (dependency) => { dependency.required = !dependency.required; }) },
  { name: "dependency resolved value", mutate: (asset) => mutateFirstDependency(asset, (dependency) => { dependency.resolved = !dependency.resolved; }) },
  { name: "dependency blockingIssue", mutate: (asset) => mutateFirstDependency(asset, (dependency) => { dependency.blockingIssue = "Changed blocking issue."; }) },
  { name: "generation input operation", mutate: (asset) => { asset.generationInputs = { ...asset.generationInputs, operation: "restore" }; } },
  { name: "generation input formulaProperty", mutate: (asset) => { asset.generationInputs = { ...asset.generationInputs, formulaProperty: "OnChange" }; } },
  { name: "generation input sourceScreenId", mutate: (asset) => { asset.generationInputs = { ...asset.generationInputs, sourceScreenId: "screen-other" }; } },
  { name: "generation input sourceControlId", mutate: (asset) => { asset.generationInputs = { ...asset.generationInputs, sourceControlId: "control-other" }; } },
  { name: "intendedPath", mutate: (asset) => { asset.intendedPath = "07_Development/PowerFx/record-lifecycle/changed.fx"; } },
  { name: "approvedPropertyName", mutate: (asset) => { asset.approvedPropertyName = "OnChange"; } },
  { name: "manualInstallationRequirements", mutate: (asset) => { asset.manualInstallationRequirements = [...asset.manualInstallationRequirements, "Changed manual step."]; } },
  { name: "validationRequirements", mutate: (asset) => { asset.validationRequirements = [...asset.validationRequirements, "Changed validation step."]; } },
  { name: "knownLimitations", mutate: (asset) => { asset.knownLimitations = [...asset.knownLimitations, "Changed limitation."]; } },
  { name: "required", mutate: (asset) => { asset.required = !asset.required; } },
  { name: "platform", mutate: (asset) => { asset.platform = "Power Platform"; } },
  { name: "assetCategory", mutate: (asset) => { asset.assetCategory = "Validation"; } },
  { name: "assetType", mutate: (asset) => { asset.assetType = "validationChecklist"; } },
  { name: "targetId", mutate: (asset) => { asset.targetId = "target-other"; } },
  { name: "projectId", mutate: (asset) => { asset.projectId = "project-other"; } },
  { name: "assetId", mutate: (asset) => { asset.assetId = "asset-other-formula"; } }
];

const cosmeticExclusionCases: AssetMutationCase[] = [
  { name: "generationTimestamp", mutate: (asset) => { asset.generationTimestamp = "2099-01-01T00:00:00.000Z"; } },
  { name: "approvalStatus", mutate: (asset) => { asset.approvalStatus = "Approved"; } },
  { name: "assetStatus", mutate: (asset) => { asset.assetStatus = "Ready for Export"; } },
  { name: "project display name", mutate: (asset) => { asset.generationInputs = { ...asset.generationInputs, projectName: "Changed Project" }; } },
  { name: "target display name", mutate: (asset) => { asset.targetDisplayName = "Changed display label"; } },
  {
    name: "dependency label wording",
    mutate: (asset) => {
      asset.dependencies = asset.dependencies.map((dependency) => ({
        ...cloneDependency(dependency),
        label: `Changed ${dependency.label}`,
        resolutionReason: `Changed ${dependency.resolutionReason}`,
        sourceSection: `Changed ${dependency.sourceSection}`
      }));
    }
  },
  {
    name: "input array ordering",
    mutate: (asset) => {
      asset.sourceRecordIds.reverse();
      asset.connectorIds.reverse();
      asset.entityIds.reverse();
      asset.fieldIds.reverse();
      asset.requiredGateIds.reverse();
      asset.gateEvaluationSnapshot.reverse();
      asset.dependencies.reverse();
      asset.manualInstallationRequirements.reverse();
      asset.validationRequirements.reverse();
      asset.knownLimitations.reverse();
    }
  },
  { name: "sourceContent", mutate: (asset) => { asset.sourceContent = `${asset.sourceContent}\nNotify("cosmetic only")`; } }
];

function expectNoFormulaSource(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("sourceContent");
  expect(serialized).not.toContain("Patch(");
  expect(serialized).not.toContain("IfError(");
  expect(serialized).not.toContain("Notify(");
  expect(serialized).not.toContain("Set(");
  expect(serialized).not.toContain("Remove(");
  expect(serialized).not.toContain("RemoveIf(");
}

describe("record lifecycle formula review state", () => {
  it("returns Review Required with the exact phase contract and no source-content leak for eligible formula assets", () => {
    const registry = approvedRegistryFor(createRecordLifecycleProject());
    const asset = formulaAsset(registry);
    const sourceInputs = asset.generationInputs;
    if (!sourceInputs) throw new Error("Formula generation inputs missing");
    const result = buildRecordLifecycleFormulaReviewState(registry);

    expect(result.reviewState).toBe("Review Required");
    expect(result.assetId).toBe(RECORD_LIFECYCLE_POWER_FX_ASSET_ID);
    expect(result.reviewContractVersion).toBe(RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION);
    expect(result.reviewContractVersion).toBe("phase-5b.4d.2.1");
    expect(result.reviewContractChecksum).toMatch(/^fnv1a-[a-f0-9]{8}$/);
    expect(result.formulaContentChecksum).toBe(asset.contentChecksum);
    expect(result.formulaGenerationVersion).toBe(RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION);
    expect(result.sourcePlanningAssetId).toBe(CANVAS_RECORD_LIFECYCLE_ASSET_ID);
    expect(result.sourcePlanningAssetChecksum).toBe(sourceInputs.sourcePlanningAssetChecksum);
    expect(result.planningGenerationVersion).toBe(sourceInputs.planningGenerationVersion);
    expect(result.blockingIssues).toEqual([]);
    expect(result.reviewReferenceStatus).toBe("Not Provided");
    expect(result.reviewReferenceIssues).toEqual([]);
    expect(JSON.stringify(result)).not.toContain(asset.sourceContent);
    expect(JSON.stringify(result)).not.toContain("Patch(");
    expectNoFormulaSource(result);
    expectNoFormulaSource(buildRecordLifecycleFormulaReviewContract(asset).contract);
    expect(asset.assetStatus).toBe("Review Required");
    expect(asset.approvalStatus).toBe("Review required");
  });

  it("treats a minimal matching review reference as Current without changing review state or implying approval", () => {
    const registry = approvedRegistryFor(createRecordLifecycleProject());
    const first = buildRecordLifecycleFormulaReviewState(registry);
    const result = buildRecordLifecycleFormulaReviewState(registry, {
      assetId: first.assetId,
      reviewContractVersion: first.reviewContractVersion,
      reviewContractChecksum: first.reviewContractChecksum
    });
    const asset = formulaAsset(registry);

    expect(result.reviewState).toBe("Review Required");
    expect(result.reviewReferenceStatus).toBe("Current");
    expect(result.reviewReferenceIssues).toEqual([]);
    expect(asset.assetStatus).toBe("Review Required");
    expect(asset.approvalStatus).toBe("Review required");
  });

  it("reports stale references for contract checksum or contract version mismatches", () => {
    const registry = approvedRegistryFor(createRecordLifecycleProject());
    const first = buildRecordLifecycleFormulaReviewState(registry);

    expect(buildRecordLifecycleFormulaReviewState(registry, {
      assetId: first.assetId,
      reviewContractVersion: first.reviewContractVersion,
      reviewContractChecksum: "fnv1a-00000000"
    }).reviewReferenceStatus).toBe("Stale");

    const staleVersion = buildRecordLifecycleFormulaReviewState(registry, {
      assetId: first.assetId,
      reviewContractVersion: "phase-5b.4d.2.0",
      reviewContractChecksum: first.reviewContractChecksum
    });
    expect(staleVersion.reviewReferenceStatus).toBe("Stale");
    expect(staleVersion.reviewReferenceIssues).toContain("Formula review reference contract version is stale.");
  });

  it("reports invalid references when asset IDs are wrong or formula-like source text is supplied", () => {
    const registry = approvedRegistryFor(createRecordLifecycleProject());
    const result = buildRecordLifecycleFormulaReviewState(registry, {
      assetId: "asset-other",
      reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
      reviewContractChecksum: "fnv1a-00000000"
    });
    const sourceReference = buildRecordLifecycleFormulaReviewState(registry, {
      assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
      reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
      reviewContractChecksum: "Patch(Requests,{Title:\"x\"})"
    });

    expect(result.reviewReferenceStatus).toBe("Invalid");
    expect(result.reviewReferenceIssues).toContain("Formula review reference assetId is invalid.");
    expect(sourceReference.reviewReferenceStatus).toBe("Invalid");
    expect(sourceReference.reviewReferenceIssues).toContain("Formula review reference must not contain formula source.");
  });

  it.each([
    ["blank asset ID", { assetId: "", reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION, reviewContractChecksum: "fnv1a-00000000" }],
    ["blank version", { assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID, reviewContractVersion: "", reviewContractChecksum: "fnv1a-00000000" }],
    ["blank checksum", { assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID, reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION, reviewContractChecksum: "" }],
    ["control characters", { assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID, reviewContractVersion: `${RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION}\u0001`, reviewContractChecksum: "fnv1a-00000000" }],
    ["delimiter input", { assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID, reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION, reviewContractChecksum: "fnv1a-00000000;drop" }],
    ["malformed runtime object", "not-an-object"],
    ["array value", { assetId: [RECORD_LIFECYCLE_POWER_FX_ASSET_ID], reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION, reviewContractChecksum: "fnv1a-00000000" }],
    ["unexpected field", { assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID, reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION, reviewContractChecksum: "fnv1a-00000000", reviewer: "Architect" }]
  ])("reports Invalid for %s review references", (_name, reference) => {
    const registry = baselineFormulaRegistry();
    const result = buildRecordLifecycleFormulaReviewState(registry, reference);

    expect(result.reviewState).toBe("Review Required");
    expect(result.reviewReferenceStatus).toBe("Invalid");
    expect(result.reviewReferenceIssues.length).toBeGreaterThan(0);
    expect([...result.reviewReferenceIssues].sort()).toEqual(result.reviewReferenceIssues);
  });

  it("reports Not Provided for undefined and omitted references", () => {
    const registry = baselineFormulaRegistry();

    expect(buildRecordLifecycleFormulaReviewState(registry).reviewReferenceStatus).toBe("Not Provided");
    expect(buildRecordLifecycleFormulaReviewState(registry, undefined).reviewReferenceStatus).toBe("Not Provided");
  });

  it("returns Blocked with no formula contract when generation is blocked by permanent-delete scope", () => {
    const registry = approvedRegistryFor(createRecordLifecycleProject([deleteLifecycleTarget()]));
    const result = buildRecordLifecycleFormulaReviewState(registry);

    expect(registry.assets.some((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID)).toBe(false);
    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewContractChecksum).toBeUndefined();
    expect(result.formulaContentChecksum).toBeUndefined();
    expect(result.sourcePlanningAssetId).toBeUndefined();
    expect(result.blockingIssues).toContain(PERMANENT_DELETE_BLOCKER);
    expect(JSON.stringify(registry)).not.toContain("Remove(");
    expect(JSON.stringify(registry)).not.toContain("RemoveIf(");
  });

  it("returns Blocked and formula-free for mixed delete generation requests", () => {
    const registry = approvedRegistryFor(createRecordLifecycleProject([lifecycleTarget(), deleteLifecycleTarget()]));
    const result = buildRecordLifecycleFormulaReviewState(registry);

    expect(registry.assets.some((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID)).toBe(false);
    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewContractChecksum).toBeUndefined();
    expect(result.blockingIssues).toContain(PERMANENT_DELETE_BLOCKER);
  });

  it("returns Blocked and formula-free for restore/delete generation requests", () => {
    const registry = approvedRegistryFor(createRecordLifecycleProject([restoreLifecycleTarget(), deleteLifecycleTarget()]));
    const result = buildRecordLifecycleFormulaReviewState(registry);

    expect(registry.assets.some((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID)).toBe(false);
    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewContractChecksum).toBeUndefined();
    expect(result.blockingIssues).toContain(PERMANENT_DELETE_BLOCKER);
    expect(JSON.stringify(registry)).not.toContain("Remove(");
    expect(JSON.stringify(registry)).not.toContain("RemoveIf(");
  });

  it("returns Blocked and formula-free for TTI-like Draft planning assets", () => {
    const project = createRecordLifecycleProject([
      lifecycleTarget({ screenTargetId: "missing-screen", triggerControlId: "missing-control" })
    ]);
    const registry = buildImplementationAssetRegistry(project, NOW);
    const result = buildRecordLifecycleFormulaReviewState(registry, {
      assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
      reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
      reviewContractChecksum: "fnv1a-11111111"
    });

    expect(planningAsset(registry).assetStatus).toBe("Blocked");
    expect(registry.assets.some((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID)).toBe(false);
    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewReferenceStatus).toBe("Stale");
    expect(result.reviewReferenceIssues).toContain("No current formula review contract is available.");
    expect(result.reviewContractChecksum).toBeUndefined();
    expect(JSON.stringify(registry)).not.toContain("Patch(");
  });

  it("returns Not Applicable when no lifecycle planning or formula asset exists", () => {
    const registry = buildImplementationAssetRegistry(createCanvasProject(), NOW);
    const result = buildRecordLifecycleFormulaReviewState(registry);

    expect(registry.assets.some((asset) => asset.assetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID)).toBe(false);
    expect(result.reviewState).toBe("Not Applicable");
    expect(result.blockingIssues).toEqual([]);
    expect(result.reviewReferenceStatus).toBe("Not Provided");
  });

  it("returns Not Applicable for non-Canvas projects", () => {
    const project = createProject({
      identity: { id: "model-review-state", projectName: "Model Review State" },
      intake: { appType: "powerAppsModelDriven", appPurpose: "Manage cases." }
    });
    const registry = buildImplementationAssetRegistry(project, NOW);
    const result = buildRecordLifecycleFormulaReviewState(registry);

    expect(result.reviewState).toBe("Not Applicable");
    expect(result.blockingIssues).toEqual([]);
    expect(registry.assets.some((asset) => asset.assetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID)).toBe(false);
  });

  it("returns Blocked when lifecycle generation is requested but no valid generated formula asset exists", () => {
    const registry = buildImplementationAssetRegistry(createRecordLifecycleProject(), NOW);
    const result = buildRecordLifecycleFormulaReviewState(registry);

    expect(planningAsset(registry).assetStatus).toBe("Review Required");
    expect(registry.assets.some((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID)).toBe(false);
    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewContractChecksum).toBeUndefined();
  });

  it("blocks duplicate generated formula assets", () => {
    const registry = baselineFormulaRegistry();
    const asset = formulaAsset(registry);
    const result = buildRecordLifecycleFormulaReviewState({
      ...registry,
      assets: [...registry.assets, cloneAsset(asset)]
    });

    expect(result.reviewState).toBe("Blocked");
    expect(result.blockingIssues).toContain("Formula review found duplicate generated lifecycle formula assets.");
    expect(result.reviewContractChecksum).toBeUndefined();
  });

  it("does not accept a wrong-ID formula asset as the valid lifecycle formula asset", () => {
    const registry = baselineFormulaRegistry();
    const original = formulaAsset(registry);
    const wrongId = cloneAsset(original);
    wrongId.assetId = "asset-other-formula";
    const result = buildRecordLifecycleFormulaReviewState(registryReplacingFormulaAsset(registry, original.assetId, wrongId));
    const baselineContract = buildRecordLifecycleFormulaReviewContract(original);
    const wrongContract = buildRecordLifecycleFormulaReviewContract(wrongId);

    expect(wrongContract.contract.assetId).toBe("asset-other-formula");
    expect(wrongContract.reviewContractChecksum).not.toBe(baselineContract.reviewContractChecksum);
    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewContractChecksum).toBeUndefined();
    expect(result.reviewReferenceStatus).toBe("Not Provided");
  });

  it.each([
    ["Approved approval status", { approvalStatus: "Approved" as const }],
    ["Ready-for-Export asset status", { assetStatus: "Ready for Export" as const }],
    ["Exported asset status", { assetStatus: "Exported" as const }]
  ])("blocks unexpected %s without approving or validating the formula", (_name, override) => {
    const registry = approvedRegistryFor(createRecordLifecycleProject());
    const mutated = cloneAsset(formulaAsset(registry));
    Object.assign(mutated, override);
    const result = buildRecordLifecycleFormulaReviewState({ ...registry, assets: registry.assets.map((asset) => asset.assetId === mutated.assetId ? mutated : asset) });

    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewContractChecksum).toBeUndefined();
    expect(result.blockingIssues.length).toBeGreaterThan(0);
  });

  it("blocks formula assets missing the source planning dependency", () => {
    const registry = baselineFormulaRegistry();
    const mutated = cloneAsset(formulaAsset(registry));
    mutated.dependencies = mutated.dependencies.filter((dependency) => dependency.targetAssetId !== CANVAS_RECORD_LIFECYCLE_ASSET_ID);
    const result = buildRecordLifecycleFormulaReviewState(registryReplacingFormulaAsset(registry, RECORD_LIFECYCLE_POWER_FX_ASSET_ID, mutated));

    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewContractChecksum).toBeUndefined();
    expect(result.blockingIssues).toContain("Formula review asset requires a source planning asset dependency.");
  });

  it("blocks formula assets with unresolved required dependencies", () => {
    const registry = baselineFormulaRegistry();
    const mutated = cloneAsset(formulaAsset(registry));
    mutateFirstDependency(mutated, (dependency) => {
      dependency.required = true;
      dependency.resolved = false;
      dependency.blockingIssue = "Dependency unresolved for test.";
    });
    const result = buildRecordLifecycleFormulaReviewState(registryReplacingFormulaAsset(registry, RECORD_LIFECYCLE_POWER_FX_ASSET_ID, mutated));

    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewContractChecksum).toBeUndefined();
    expect(result.blockingIssues).toContain("Formula review asset has unresolved required dependencies.");
  });

  it("blocks malformed registry input", () => {
    const result = buildRecordLifecycleFormulaReviewState({ assets: "not-an-array" });

    expect(result.reviewState).toBe("Blocked");
    expect(result.reviewContractChecksum).toBeUndefined();
    expect(result.blockingIssues).toContain("Formula review state requires an implementation asset array.");
  });

  it.each(checksumMutationCases)("changes checksum and makes the baseline reference Stale when %s changes", ({ mutate }) => {
    const registry = baselineFormulaRegistry();
    const original = formulaAsset(registry);
    const mutated = cloneAsset(original);
    const baseline = buildRecordLifecycleFormulaReviewContract(original);
    const reference = baselineReferenceFor(baseline);

    mutate(mutated);

    const changed = buildRecordLifecycleFormulaReviewContract(mutated);

    expect(changed.contract).not.toEqual(baseline.contract);
    expect(changed.reviewContractChecksum).not.toBe(baseline.reviewContractChecksum);
    expect(referenceStatusAgainstContract(reference, changed)).toBe("Stale");
  });

  it.each(cosmeticExclusionCases)("keeps the contract and checksum Current when only %s changes", ({ mutate }) => {
    const registry = baselineFormulaRegistry();
    const original = formulaAsset(registry);
    const mutated = cloneAsset(original);
    const baseline = buildRecordLifecycleFormulaReviewContract(original);
    const reference = baselineReferenceFor(baseline);

    mutate(mutated);

    const changed = buildRecordLifecycleFormulaReviewContract(mutated);

    expect(changed.contract).toEqual(baseline.contract);
    expect(changed.reviewContractChecksum).toBe(baseline.reviewContractChecksum);
    expect(referenceStatusAgainstContract(reference, changed)).toBe("Current");
  });
});
