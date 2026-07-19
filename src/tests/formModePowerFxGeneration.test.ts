import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import {
  FORM_MODE_POWER_FX_GENERATION_VERSION,
  generateFormModePowerFxForAsset,
  generateFormModePowerFxForRegistry
} from "../lib/formModePowerFxGeneration";
import {
  CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
  CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION,
  CANVAS_FORM_MODE_ACTIONS_OPERATION,
  CANVAS_FORM_MODE_ACTIONS_PLAN_PATH,
  CANVAS_FORM_MODE_ACTIONS_TARGET_ID
} from "../lib/formModePlanning";
import {
  CANVAS_FORM_OPERATIONS_ASSET_ID
} from "../lib/formOperationPlanning";
import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetDependencies,
  evaluateImplementationAssetGraph,
  normalizeImplementationAssetRegistry,
  validateImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import {
  createApplicabilityDecision,
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultDataverseColumn,
  createDefaultDataverseTable,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import { generateFormOperationPowerFxForAsset } from "../lib/formOperationPowerFxGeneration";
import { generateCollectionPowerFxForAsset } from "../lib/collectionPowerFxGeneration";
import { generatePowerFxForAsset } from "../lib/powerFxGeneration";
import { generateStatePowerFxForAsset } from "../lib/statePowerFxGeneration";
import type { CanvasFormModeTarget, CanvasFormOperationTarget, ProjectRecord } from "../types/project";

const NOW = "2026-07-19T12:00:00.000Z";
const FORBIDDEN_FORMULAS = [
  "SubmitForm(",
  "ResetForm(",
  "ViewForm(",
  "Patch(",
  "Defaults(",
  "Navigate(",
  "Notify(",
  "Set(",
  "UpdateContext(",
  "Select(",
  "Back(",
  "If(",
  "IfError(",
  "Errors(",
  "Refresh(",
  "Remove(",
  "RemoveIf(",
  "Collect(",
  "ClearCollect(",
  "Filter(",
  "Search(",
  "Sort(",
  "LookUp("
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function formOperationTarget(overrides: Partial<CanvasFormOperationTarget> = {}): CanvasFormOperationTarget {
  return {
    id: overrides.id ?? "form-op-create-request",
    operation: overrides.operation ?? "create",
    screenId: overrides.screenId ?? "screen-request",
    formControlId: overrides.formControlId ?? "form-request",
    submitControlId: overrides.submitControlId ?? "button-submit-create",
    sourceConnectorId: overrides.sourceConnectorId ?? "connector-sharepoint",
    sourceEntityId: overrides.sourceEntityId ?? "list-requests",
    requiredFieldIds: overrides.requiredFieldIds ?? ["field-title"],
    submissionTrigger: overrides.submissionTrigger ?? "controlOnSelect",
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function editOperationTarget(overrides: Partial<CanvasFormOperationTarget> = {}): CanvasFormOperationTarget {
  return formOperationTarget({
    id: "form-op-edit-request",
    operation: "edit",
    screenId: "screen-other",
    formControlId: "form-request-edit",
    submitControlId: "button-submit-edit",
    sourceConnectorId: "connector-dataverse",
    sourceEntityId: "table-requests-edit",
    requiredFieldIds: ["column-name-edit"],
    sortOrder: 20,
    ...overrides
  });
}

function formModeTarget(overrides: Partial<CanvasFormModeTarget> = {}): CanvasFormModeTarget {
  return {
    id: overrides.id ?? "mode-new-request",
    formOperationTargetId: overrides.formOperationTargetId ?? "form-op-create-request",
    action: overrides.action ?? "new",
    triggerControlId: overrides.triggerControlId ?? "button-new-mode",
    trigger: overrides.trigger ?? "controlOnSelect",
    editRecordContextStatus: overrides.editRecordContextStatus ?? "notRequired",
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function editModeTarget(overrides: Partial<CanvasFormModeTarget> = {}): CanvasFormModeTarget {
  return formModeTarget({
    id: "mode-edit-request",
    formOperationTargetId: "form-op-edit-request",
    action: "edit",
    triggerControlId: "button-edit-mode",
    editRecordContextStatus: "confirmedExistingItemBinding",
    sortOrder: 20,
    ...overrides
  });
}

function createCanvasProject(
  formModeTargets: CanvasFormModeTarget[] = [formModeTarget()],
  formOperationTargets: CanvasFormOperationTarget[] = [formOperationTarget()]
): ProjectRecord {
  const project = createProject({
    identity: { id: "project-unique-742", projectName: "Unique Project 742" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Generate form-mode action fragments.",
      requiredFeatures: "Create and edit records.",
      workflows: "Start form modes.",
      outOfScope: "Deployment.",
      successCriteria: "Form modes are reviewed.",
      accessibilityNotes: "Keyboard and labels are required.",
      permissionRules: "Least privilege list permissions.",
      screens: "Request form.",
      acceptanceNotes: "Form modes are reviewed.",
      targetUsers: "Users",
      userRoles: "User",
      dataSources: "SharePoint",
      dataEntities: "Requests",
      fields: "Title",
      securityConfirmed: "Confirmed"
    } as any
  });
  const pp = project.powerPlatform!;
  pp.common.tenant = "Tenant";
  pp.common.environment = "Development";
  pp.common.environmentAccessStatus = "confirmed";
  pp.common.authenticationRequirements = "Microsoft Entra ID";
  pp.common.authorizationRequirements = "Least privilege";
  pp.common.recordAccessRules = "Users access approved records.";
  pp.common.auditRequirements = "Audit writes.";
  pp.common.privacyRequirements = "No secrets.";
  pp.common.securityReviewStatus = "confirmed";
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
      connectionOwner: "Owner",
      connectionOwnerRole: "Environment maker",
      connectionOwnershipStatus: "confirmed",
      requiredConnectorPermissions: "Read and write items.",
      permissionOwner: "Owner",
      permissionValidationMethod: "Owner confirmation.",
      permissionConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      supportedOperations: { read: true, create: true, update: true }
    }),
    createDefaultConnector({
      id: "connector-dataverse",
      displayName: "Dataverse",
      dataSourceName: "Dataverse",
      dataSourceType: "dataverse",
      canvasRole: "secondary",
      connectorClassification: "standard",
      classificationConfirmationStatus: "confirmed",
      licenceRequirement: "Standard connector.",
      licensingConfirmationStatus: "confirmed",
      authenticationMethod: "Microsoft Entra ID",
      connectionOwner: "Owner",
      connectionOwnerRole: "Environment maker",
      connectionOwnershipStatus: "confirmed",
      requiredConnectorPermissions: "Read and write items.",
      permissionOwner: "Owner",
      permissionValidationMethod: "Owner confirmation.",
      permissionConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      supportedOperations: { read: true, update: true }
    })
  ];
  const canvas = pp.canvas!;
  canvas.primaryDataSourceType = "multiple";
  canvas.selectedDataSourceTypes = ["sharePointList", "dataverse"];
  canvas.primaryConnectorId = "connector-sharepoint";
  canvas.secondaryConnectorIds = ["connector-dataverse"];
  canvas.dataverseEnvironment = "Development";
  canvas.dataverseSolution = "Solution";
  canvas.dataversePublisherPrefix = "crb";
  canvas.dataverseSchemaConfirmationStatus = "confirmed";
  canvas.sourcePurpose = "Store requests.";
  canvas.sourceOwnership = "Operations.";
  canvas.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
  canvas.screenNamingConvention = "scrName";
  canvas.controlNamingConvention = "prefixName";
  canvas.controlTypePrefixes = "btn for buttons and frm for forms.";
  canvas.variableNamingConvention = "varName";
  canvas.collectionNamingConvention = "colName";
  canvas.componentNamingConvention = "cmpName";
  canvas.formulaFileNamingConvention = "property.fx";
  canvas.yamlFileNamingConvention = "target.yaml";
  canvas.namingStandardConfirmationStatus = "confirmed";
  canvas.componentApplicabilityDecision = createApplicabilityDecision({
    status: "notApplicable",
    notApplicableReason: "No components are required.",
    confirmationStatus: "confirmed"
  });
  canvas.screenTargets = [
    createDefaultCanvasScreenTarget({
      id: "screen-request",
      displayName: "Request",
      approvedScreenName: "scrRequest",
      purpose: "Request form.",
      confirmationSource: "Architect",
      confirmationStatus: "confirmed",
      dataSourceApplicabilityDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "Form controls own the data interaction.",
        confirmationStatus: "confirmed"
      })
    }),
    createDefaultCanvasScreenTarget({
      id: "screen-other",
      displayName: "Other",
      approvedScreenName: "scrOther",
      purpose: "Other screen.",
      confirmationSource: "Architect",
      confirmationStatus: "confirmed",
      dataSourceApplicabilityDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "No data.",
        confirmationStatus: "confirmed"
      })
    })
  ];
  canvas.controlTargets = [
    createDefaultCanvasControlTarget({
      id: "form-request",
      screenId: "screen-request",
      approvedControlName: "frmRequest",
      controlType: "edit form",
      purpose: "Edit request fields.",
      confirmationSource: "Architect",
      confirmationStatus: "confirmed"
    }),
    createDefaultCanvasControlTarget({
      id: "button-submit-create",
      screenId: "screen-request",
      approvedControlName: "btnSubmitCreate",
      controlType: "button",
      purpose: "Submit create form.",
      confirmationSource: "Architect",
      confirmationStatus: "confirmed"
    }),
    createDefaultCanvasControlTarget({
      id: "button-submit-edit",
      screenId: "screen-other",
      approvedControlName: "btnSubmitEdit",
      controlType: "button",
      purpose: "Submit edit form.",
      confirmationSource: "Architect",
      confirmationStatus: "confirmed"
    }),
    createDefaultCanvasControlTarget({
      id: "form-request-edit",
      screenId: "screen-other",
      approvedControlName: "frmRequestEdit",
      controlType: "edit form",
      purpose: "Edit existing request fields.",
      confirmationSource: "Architect",
      confirmationStatus: "confirmed"
    }),
    createDefaultCanvasControlTarget({
      id: "button-new-mode",
      screenId: "screen-request",
      approvedControlName: "btnNewMode",
      controlType: "button",
      purpose: "Start new mode.",
      confirmationSource: "Architect",
      confirmationStatus: "confirmed"
    }),
    createDefaultCanvasControlTarget({
      id: "button-edit-mode",
      screenId: "screen-other",
      approvedControlName: "btnEditMode",
      controlType: "button",
      purpose: "Start edit mode.",
      confirmationSource: "Architect",
      confirmationStatus: "confirmed"
    })
  ];
  canvas.sharePointListSchemas = [
    createDefaultSharePointList({
      id: "list-requests",
      displayName: "Requests",
      purpose: "Track requests.",
      expectedRecordCount: "100",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.sharePointColumnSchemas = [
    createDefaultSharePointColumn({
      id: "field-title",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Title",
      internalName: "Title",
      columnType: "Single line of text",
      requiredStatus: "required",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.dataverseTableSchemas = [
    createDefaultDataverseTable({
      id: "table-requests-edit",
      displayName: "EditRequests",
      logicalName: "crb_editrequest",
      schemaName: "crb_EditRequest",
      purpose: "Track editable requests.",
      ownershipType: "User or team",
      primaryNameColumn: "crb_name",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.dataverseColumnSchemas = [
    createDefaultDataverseColumn({
      id: "column-name-edit",
      tableId: "table-requests-edit",
      displayName: "Name",
      logicalName: "crb_name",
      schemaName: "crb_Name",
      dataType: "Text",
      requiredLevel: "required",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.formOperationTargets = formOperationTargets;
  canvas.formModeTargets = formModeTargets;
  return project;
}

function registryFor(project: ProjectRecord): ImplementationAssetRegistry {
  return buildImplementationAssetRegistry(project, NOW);
}

function approveFrom(registry: ImplementationAssetRegistry, project: ProjectRecord): ImplementationAssetRegistry {
  return normalizeImplementationAssetRegistry({
    assets: registry.assets.map((asset) => ({
      assetId: asset.assetId,
      approvalStatus: "Approved",
      contentChecksum: asset.contentChecksum,
      generationVersion: asset.generationVersion
    }))
  }, project, NOW);
}

function approvedRegistry(project = createCanvasProject()): ImplementationAssetRegistry {
  let registry = registryFor(project);
  for (let index = 0; index < 5; index += 1) {
    registry = approveFrom(registry, project);
  }
  return registry;
}

function modeAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  return registry.assets.find((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID)!;
}

function generate(project = createCanvasProject(), registry: unknown = approvedRegistry(project)) {
  return generateFormModePowerFxForAsset({ project, registry });
}

function withAsset(project: ProjectRecord, mutate: (asset: ImplementationAsset, registry: ImplementationAssetRegistry) => void) {
  const registry = approvedRegistry(project);
  mutate(modeAsset(registry), registry);
  return generate(project, registry);
}

function expectBlocked(result: ReturnType<typeof generate>): string {
  expect(result.status).toBe("Blocked");
  expect(result.fragments).toEqual([]);
  expect(result.generatedChecksum).toBe("");
  return result.blockingIssues.join(" ");
}

describe("Canvas form-mode Power Fx generation", () => {
  it("generates one NewForm fragment for one approved new target", () => {
    const result = generate();
    expect(result.blockingIssues).toEqual([]);
    expect(result.status).toBe("Generated");
    expect(result.fragments).toHaveLength(1);
    expect(result.fragments[0]).toMatchObject({
      formModeTargetId: "mode-new-request",
      formOperationTargetId: "form-op-create-request",
      action: "new",
      triggerControlId: "button-new-mode",
      triggerControlApprovedName: "btnNewMode",
      screenTargetId: "screen-request",
      formControlId: "form-request",
      formControlApprovedName: "frmRequest",
      intendedPath: "07_Development/PowerFx/screen-request/button-new-mode/OnSelect.form-mode.fx",
      formula: "NewForm(frmRequest)\n",
      sourcePlanningAssetId: CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
      generationVersion: FORM_MODE_POWER_FX_GENERATION_VERSION
    });
    expect(result.fragments[0].approvedPlanningChecksum).toBe(result.sourceChecksum);
  });

  it("generates one EditForm fragment for one approved edit target", () => {
    const project = createCanvasProject([editModeTarget()], [editOperationTarget()]);
    const result = generate(project);
    expect(result.status).toBe("Generated");
    expect(result.fragments).toHaveLength(1);
    expect(result.fragments[0].formula).toBe("EditForm(frmRequestEdit)\n");
  });

  it("creates one separate fragment per target in canonical planning order", () => {
    const project = createCanvasProject(
      [editModeTarget({ sortOrder: 20 }), formModeTarget({ sortOrder: 10 })],
      [editOperationTarget(), formOperationTarget()]
    );
    const result = generate(project);
    expect(result.blockingIssues).toEqual([]);
    expect(result.status).toBe("Generated");
    expect(result.fragments.map((fragment) => fragment.formModeTargetId)).toEqual(["mode-new-request", "mode-edit-request"]);
    expect(result.fragments.map((fragment) => fragment.formula)).toEqual(["NewForm(frmRequest)\n", "EditForm(frmRequestEdit)\n"]);
  });

  it("does not change generated output when input order changes but canonical sort order is unchanged", () => {
    const first = generate(createCanvasProject(
      [editModeTarget({ sortOrder: 20 }), formModeTarget({ sortOrder: 10 })],
      [editOperationTarget(), formOperationTarget()]
    ));
    const second = generate(createCanvasProject(
      [formModeTarget({ sortOrder: 10 }), editModeTarget({ sortOrder: 20 })],
      [formOperationTarget(), editOperationTarget()]
    ));
    expect(first.generatedChecksum).toBe(second.generatedChecksum);
    expect(first.fragments).toEqual(second.fragments);
  });

  it("keeps formulas to one statement, one trailing newline, and no prose or traceability", () => {
    const result = generate();
    const formula = result.fragments[0].formula;
    expect(formula).toBe("NewForm(frmRequest)\n");
    expect(formula.endsWith("\n")).toBe(true);
    expect(formula.trim()).not.toContain(";");
    expect(formula).not.toContain("//");
    expect(formula).not.toContain("#");
    expect(formula).not.toContain("project-unique-742");
    expect(formula).not.toContain(CANVAS_FORM_MODE_ACTIONS_ASSET_ID);
  });

  it("keeps traceability outside formulas", () => {
    const result = generate();
    expect(result.traceability).toMatchObject({
      projectId: "project-unique-742",
      sourcePlanningAssetId: CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
      formModeTargetIds: ["mode-new-request"],
      formOperationTargetIds: ["form-op-create-request"],
      actions: ["new"],
      screenTargetIds: ["screen-request"],
      triggerControlIds: ["button-new-mode"],
      formControlIds: ["form-request"],
      intendedPaths: ["07_Development/PowerFx/screen-request/button-new-mode/OnSelect.form-mode.fx"],
      generationVersion: FORM_MODE_POWER_FX_GENERATION_VERSION
    });
    expect(result.fragments[0].formula).not.toContain("sourcePlanningAssetId");
  });

  it.each([
    ["missing source asset", (registry: ImplementationAssetRegistry) => { registry.assets = registry.assets.filter((asset) => asset.assetId !== CANVAS_FORM_MODE_ACTIONS_ASSET_ID); }, "does not exist"],
    ["duplicate source asset", (registry: ImplementationAssetRegistry) => { registry.assets.push(clone(modeAsset(registry))); }, "Duplicate asset ID"],
    ["wrong project source", (registry: ImplementationAssetRegistry) => { modeAsset(registry).projectId = "wrong-project"; }, "wrong-project"],
    ["wrong identity", (registry: ImplementationAssetRegistry) => { modeAsset(registry).targetId = "wrong-target"; }, "target ID"],
    ["unapproved source", (registry: ImplementationAssetRegistry) => { modeAsset(registry).approvalStatus = "Review required"; }, "not approved"],
    ["non-ready source", (registry: ImplementationAssetRegistry) => { modeAsset(registry).assetStatus = "Draft"; }, "Ready for Export"],
    ["stale checksum", (registry: ImplementationAssetRegistry) => { modeAsset(registry).contentChecksum = "fnv1a-stale"; }, "checksum"],
    ["dependency stale", (registry: ImplementationAssetRegistry) => { modeAsset(registry).dependencies[0].resolved = false; modeAsset(registry).dependencies[0].blockingIssue = "Source dependency stale."; modeAsset(registry).contentChecksum = calculateImplementationAssetChecksum({ ...modeAsset(registry), contentChecksum: "" }); }, "Dependency resolution"],
    ["gate stale", (registry: ImplementationAssetRegistry) => { modeAsset(registry).gateEvaluationSnapshot[0].passed = false; modeAsset(registry).gateEvaluationSnapshot[0].blockingReason = "Gate stale."; modeAsset(registry).contentChecksum = calculateImplementationAssetChecksum({ ...modeAsset(registry), contentChecksum: "" }); }, "Gate snapshot"],
    ["input stale", (registry: ImplementationAssetRegistry) => { modeAsset(registry).generationInputs!.formModeTargets![0].formControlApprovedName = "frmOther"; modeAsset(registry).contentChecksum = calculateImplementationAssetChecksum({ ...modeAsset(registry), contentChecksum: "" }); }, "Checksum mismatch"]
  ])("blocks %s evidence", (_label, mutate, expected) => {
    const project = createCanvasProject();
    const registry = approvedRegistry(project);
    mutate(registry);
    expect(expectBlocked(generate(project, registry))).toContain(expected);
  });

  it("blocks when current project reconstruction changes after source approval", () => {
    const project = createCanvasProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "form-request")!.approvedControlName = "frmChanged";
    expect(expectBlocked(generate(project, registry))).toContain("Checksum mismatch");
  });

  it.each([
    ["unknown action", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].action = "delete" as any; }, "action"],
    ["mismatched action", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].action = "edit"; }, "Checksum mismatch"],
    ["missing form name", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].formControlApprovedName = ""; }, "Checksum mismatch"],
    ["null form name", (asset: ImplementationAsset) => { (asset.generationInputs!.formModeTargets![0] as any).formControlApprovedName = null; }, "formControlApprovedName must be a string"],
    ["non-string form name", (asset: ImplementationAsset) => { (asset.generationInputs!.formModeTargets![0] as any).formControlApprovedName = 42; }, "formControlApprovedName must be a string"],
    ["unsafe form name", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].formControlApprovedName = "frm.Request"; }, "Checksum mismatch"],
    ["formula-looking form name", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].formControlApprovedName = "SubmitForm(frmRequest)"; }, "Checksum mismatch"],
    ["duplicate paths", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets!.push({ ...asset.generationInputs!.formModeTargets![0], formModeTargetId: "other" }); }, "Duplicate"],
    ["backslash path", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].intendedPath = "07_Development\\PowerFx\\screen-request\\button-new-mode\\OnSelect.form-mode.fx"; }, "backslash"],
    ["absolute path", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].intendedPath = "C:/repo/OnSelect.form-mode.fx"; }, "absolute"],
    ["parent path", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].intendedPath = "07_Development/PowerFx/../button-new-mode/OnSelect.form-mode.fx"; }, "parent"],
    ["wrong suffix", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].intendedPath = "07_Development/PowerFx/screen-request/button-new-mode/OnSelect.fx"; }, "must end in OnSelect.form-mode.fx"],
    ["stale path", (asset: ImplementationAsset) => { asset.generationInputs!.formModeTargets![0].intendedPath = "07_Development/PowerFx/screen-request/button-edit-mode/OnSelect.form-mode.fx"; }, "does not match current screen"]
  ])("blocks malformed source input: %s", (_label, mutate, expected) => {
    const project = createCanvasProject();
    const result = withAsset(project, (asset) => {
      mutate(asset);
      asset.contentChecksum = calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });
    });
    expect(expectBlocked(result)).toContain(expected);
  });

  it.each([
    ["moved form", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "form-request")!.screenId = "screen-other"; }, "Form control form-request"],
    ["wrong-screen form", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].screenId = "screen-other"; }, "Form control form-request"],
    ["wrong-type form", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "form-request")!.controlType = "label"; }, "Form control form-request"],
    ["missing trigger", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formModeTargets[0].triggerControlId = "missing"; }, "Checksum mismatch"],
    ["cross-screen trigger", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "button-new-mode")!.screenId = "screen-other"; }, "Checksum mismatch"],
    ["non-button trigger", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "button-new-mode")!.controlType = "icon"; }, "Checksum mismatch"],
    ["trigger reused as submit", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formModeTargets[0].triggerControlId = "button-submit-create"; }, "Checksum mismatch"]
  ])("blocks stale current project validation: %s", (_label, mutate, expected) => {
    const project = createCanvasProject();
    const registry = approvedRegistry(project);
    mutate(project);
    expect(expectBlocked(generate(project, registry))).toContain(expected);
  });

  it("returns Not Applicable when current Canvas targets are not applicable and no stale source remains", () => {
    const project = createCanvasProject([]);
    const registry = approvedRegistry(project);
    const result = generate(project, registry);
    expect(result.status).toBe("Not Applicable");
    expect(result.fragments).toEqual([]);
    expect(result.generatedChecksum).toBe("");
  });

  it("blocks when a stale source asset remains after targets are removed", () => {
    const project = createCanvasProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.formModeTargets = [];
    expect(expectBlocked(generate(project, registry))).toContain("stale");
  });

  it("blocks malformed current form-mode target storage", () => {
    const project = createCanvasProject();
    const registry = approvedRegistry(project);
    (project.powerPlatform!.canvas as any).formModeTargets = "bad";
    expect(expectBlocked(generate(project, registry))).toContain("Canvas form-mode target data must be an array");
  });

  it("blocks malformed unrelated registry assets through registry validation", () => {
    const project = createCanvasProject();
    const registry = approvedRegistry(project) as unknown as { assets: unknown[] };
    registry.assets.push({ assetId: "bad", dependencies: "bad" });
    expect(expectBlocked(generate(project, registry))).toContain("registry.assets");
  });

  it("does not throw for exported safety boundaries", () => {
    const project = createCanvasProject();
    expect(() => validateImplementationAssetRegistry({ assets: [null] }, project)).not.toThrow();
    expect(() => evaluateImplementationAssetGraph([{ assetId: "bad", intendedPath: "x", dependencies: "bad" }])).not.toThrow();
    expect(() => evaluateImplementationAssetDependencies(project, [null])).not.toThrow();
    expect(() => deriveImplementationAssetRegistryState(project, [null])).not.toThrow();
    expect(expectBlocked(generate(project, { assets: [null] }))).toContain("registry.assets");
  });

  it("creates deterministic fragment and top-level checksums", () => {
    const first = generate();
    const second = generate();
    expect(first.fragments[0].fragmentChecksum).toBe(second.fragments[0].fragmentChecksum);
    expect(first.generatedChecksum).toBe(second.generatedChecksum);
  });

  it.each([
    ["target order", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formModeTargets[0].sortOrder = 99; }],
    ["form name", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "form-request")!.approvedControlName = "frmChanged"; }],
    ["action", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formModeTargets[0].action = "edit"; project.powerPlatform!.canvas!.formModeTargets[0].editRecordContextStatus = "confirmedExistingItemBinding"; }],
    ["path", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formModeTargets[0].triggerControlId = "button-edit-mode"; }]
  ])("%s changes alter or block checksums", (_label, mutate) => {
    const baseline = generate();
    const project = createCanvasProject();
    mutate(project);
    const result = generate(project, approvedRegistry(project));
    if (result.status === "Generated") expect(result.generatedChecksum).not.toBe(baseline.generatedChecksum);
    else expect(result.generatedChecksum).toBe("");
  });

  it("timestamps do not alter generated checksums", () => {
    const project = createCanvasProject();
    const first = approveFrom(approveFrom(buildImplementationAssetRegistry(project, "2026-07-19T00:00:00.000Z"), project), project);
    const second = approveFrom(approveFrom(buildImplementationAssetRegistry(project, "2026-07-19T01:00:00.000Z"), project), project);
    expect(generate(project, first).generatedChecksum).toBe(generate(project, second).generatedChecksum);
  });

  it("does not mutate project, registry, or source assets", () => {
    const project = createCanvasProject();
    const registry = approvedRegistry(project);
    const beforeProject = clone(project);
    const beforeRegistry = clone(registry);
    const beforeAsset = clone(modeAsset(registry));
    generate(project, registry);
    expect(project).toEqual(beforeProject);
    expect(registry).toEqual(beforeRegistry);
    expect(modeAsset(registry)).toEqual(beforeAsset);
  });

  it("does not generate prohibited formulas or create file artifacts", () => {
    const result = generate();
    expect(result.status).toBe("Generated");
    const serialized = JSON.stringify(result);
    FORBIDDEN_FORMULAS.forEach((token) => expect(serialized).not.toContain(token));
    expect(result.fragments.every((fragment) => fragment.intendedPath.endsWith(".fx"))).toBe(true);
  });

  it("keeps earlier phase generation boundaries separate", () => {
    const project = createCanvasProject();
    const registry = approvedRegistry(project);
    expect(generateFormModePowerFxForRegistry(project, registry)).toHaveLength(1);
    expect(generateFormOperationPowerFxForAsset({ project, registry }).fragments.every((fragment) => fragment.formula.startsWith("SubmitForm("))).toBe(true);
    expect(generateCollectionPowerFxForAsset({ project, registry }).status).not.toBe("Generated");
    expect(generatePowerFxForAsset({ project, registry, assetId: "missing-navigation-asset" }).status).not.toBe("Generated");
    expect(generateStatePowerFxForAsset({ project, registry }).status).not.toBe("Generated");
  });

  it("commits only metadata paths and no generated .fx file content", () => {
    const result = generate();
    expect(result.fragments[0].intendedPath).toBe("07_Development/PowerFx/screen-request/button-new-mode/OnSelect.form-mode.fx");
    expect(result.fragments[0].formula).not.toContain("07_Development");
    expect(result.manualInstallationInstructions.join(" ")).toContain("Do not create .fx files");
  });

  it("preserves canonical source planning identity", () => {
    const result = generate();
    expect(result).toMatchObject({
      assetId: CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
      targetId: CANVAS_FORM_MODE_ACTIONS_TARGET_ID,
      operation: CANVAS_FORM_MODE_ACTIONS_OPERATION,
      propertyName: "OnSelect",
      generationVersion: FORM_MODE_POWER_FX_GENERATION_VERSION
    });
    expect(modeAsset(approvedRegistry()).generationInputs).toMatchObject({
      sourcePlanningAssetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
      planningGenerationVersion: CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION
    });
    expect(modeAsset(approvedRegistry()).intendedPath).toBe(CANVAS_FORM_MODE_ACTIONS_PLAN_PATH);
  });
});
