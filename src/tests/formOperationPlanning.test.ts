import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  createImplementationAssetManifest,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetStatus,
  normalizeImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import {
  CANVAS_FORM_OPERATIONS_ASSET_ID,
  CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY,
  CANVAS_FORM_OPERATIONS_OPERATION,
  CANVAS_FORM_OPERATIONS_PLAN_PATH,
  CANVAS_FORM_OPERATIONS_TARGET_DISPLAY_NAME,
  CANVAS_FORM_OPERATIONS_TARGET_ID,
  canvasFormOperationFragmentPath
} from "../lib/formOperationPlanning";
import {
  createApplicabilityDecision,
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import type { CanvasFormOperationTarget, ProjectRecord } from "../types/project";

const NOW = "2026-07-17T12:00:00.000Z";

function target(overrides: Partial<CanvasFormOperationTarget> = {}): CanvasFormOperationTarget {
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

function createFormProject(targets: CanvasFormOperationTarget[] = [target()]): ProjectRecord {
  const project = createProject({
    identity: { id: "form-planning", projectName: "Form Planning" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Plan form operations.",
      requiredFeatures: "Create and edit records.",
      workflows: "Submit request form.",
      outOfScope: "Deployment.",
      successCriteria: "Planning asset is reviewed.",
      accessibilityNotes: "Keyboard and labels are required.",
      permissionRules: "Least privilege list permissions.",
      screens: "Request form.",
      acceptanceNotes: "Form submission is planned.",
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
    })
  ];
  const canvas = pp.canvas!;
  canvas.primaryDataSourceType = "sharePointList";
  canvas.selectedDataSourceTypes = ["sharePointList"];
  canvas.primaryConnectorId = "connector-sharepoint";
  canvas.sourcePurpose = "Store requests.";
  canvas.sourceOwnership = "Operations.";
  canvas.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
  canvas.sharePointSiteTitle = "Operations";
  canvas.sharePointSiteOwner = "Operations owner";
  canvas.sharePointAccessStatus = "confirmed";
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
      confirmationStatus: "confirmed"
      ,
      dataSourceApplicabilityDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "Form controls own the data interaction.",
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
      screenId: "screen-request",
      approvedControlName: "btnSubmitEdit",
      controlType: "button",
      purpose: "Submit edit form.",
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
    }),
    createDefaultSharePointColumn({
      id: "field-optional",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Optional",
      internalName: "Optional",
      columnType: "Single line of text",
      requiredStatus: "optional",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.formOperationTargets = targets;
  return project;
}

function registryFor(project: ProjectRecord): ImplementationAssetRegistry {
  return buildImplementationAssetRegistry(project, NOW);
}

function formAsset(registry: ImplementationAssetRegistry): ImplementationAsset | undefined {
  return registry.assets.find((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID);
}

function approvedRegistry(project: ProjectRecord): ImplementationAssetRegistry {
  const registry = registryFor(project);
  return normalizeImplementationAssetRegistry({
    assets: registry.assets.map((asset) => ({
      assetId: asset.assetId,
      approvalStatus: "Approved",
      contentChecksum: asset.contentChecksum,
      generationVersion: asset.generationVersion
    }))
  }, project, NOW);
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

function installAsset(registry: ImplementationAssetRegistry): ImplementationAsset | undefined {
  return registry.assets.find((asset) => asset.assetType === "installationGuide");
}

function formDependency(asset: ImplementationAsset): NonNullable<ImplementationAsset["dependencies"][number]> | undefined {
  return asset.dependencies.find((dependency) => dependency.id.includes(":control:form:"));
}

function submitDependency(asset: ImplementationAsset): NonNullable<ImplementationAsset["dependencies"][number]> | undefined {
  return asset.dependencies.find((dependency) => dependency.id.includes(":control:submit:"));
}

function screenDependency(asset: ImplementationAsset): NonNullable<ImplementationAsset["dependencies"][number]> | undefined {
  return asset.dependencies.find((dependency) => dependency.type === "screen" && dependency.id.includes(":screen:"));
}

describe("Canvas form-operation planning asset", () => {
  it("creates no form-operation planning asset when there are no targets", () => {
    expect(formAsset(registryFor(createFormProject([])))).toBeUndefined();
  });

  it.each([
    ["create", target()],
    ["edit", target({ id: "form-op-edit-request", operation: "edit", submitControlId: "button-submit-edit" })]
  ] as const)("creates one combined planning asset for one valid %s target", (_label, formTarget) => {
    const assets = registryFor(createFormProject([formTarget])).assets.filter((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID);
    expect(assets).toHaveLength(1);
  });

  it("keeps multiple targets in one deterministic combined planning asset", () => {
    const asset = formAsset(registryFor(createFormProject([
      target({ id: "z-edit", operation: "edit", submitControlId: "button-submit-edit", sortOrder: 20 }),
      target({ id: "a-create", operation: "create", submitControlId: "button-submit-create", sortOrder: 10 })
    ])))!;
    expect(asset.generationInputs?.formOperationTargets?.map((item) => item.id)).toEqual(["a-create", "z-edit"]);
  });

  it("uses the canonical form-operation asset identity", () => {
    const asset = formAsset(registryFor(createFormProject()))!;
    expect(asset.assetId).toBe(CANVAS_FORM_OPERATIONS_ASSET_ID);
    expect(asset.targetId).toBe(CANVAS_FORM_OPERATIONS_TARGET_ID);
    expect(asset.targetDisplayName).toBe(CANVAS_FORM_OPERATIONS_TARGET_DISPLAY_NAME);
    expect(asset.platform).toBe("Power Apps Canvas");
    expect(asset.assetCategory).toBe("Power Fx");
    expect(asset.assetType).toBe("powerFxPlan");
    expect(asset.generationInputs?.operation).toBe(CANVAS_FORM_OPERATIONS_OPERATION);
    expect(asset.approvedPropertyName).toBe(CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY);
    expect(asset.generationInputs?.formulaProperty).toBe(CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY);
    expect(asset.intendedPath).toBe(CANVAS_FORM_OPERATIONS_PLAN_PATH);
  });

  it("starts valid unapproved assets as Review Required", () => {
    expect(formAsset(registryFor(createFormProject()))?.assetStatus).toBe("Review Required");
  });

  it("sets required true when any target is required and false when every target is optional", () => {
    expect(formAsset(registryFor(createFormProject([target({ required: true })])))?.required).toBe(true);
    expect(formAsset(registryFor(createFormProject([target({ required: false })])))?.required).toBe(false);
  });

  it("stores current structured generation inputs and future fragment paths", () => {
    const asset = formAsset(registryFor(createFormProject()))!;
    const input = asset.generationInputs?.formOperationTargets?.[0];
    expect(input).toMatchObject({
      screenImplementationName: "scrRequest",
      formControlImplementationName: "frmRequest",
      submitControlImplementationName: "btnSubmitCreate",
      sourceImplementationName: "Requests",
      requiredFieldIds: ["field-title"],
      formulaProperty: "OnSelect"
    });
    expect(input?.intendedFragmentPath).toBe("07_Development/PowerFx/screen-request/button-submit-create/OnSelect.form-operation.fx");
    expect(canvasFormOperationFragmentPath(target())).toBe(input?.intendedFragmentPath);
  });

  it("blocks duplicate future fragment paths", () => {
    const asset = formAsset(registryFor(createFormProject([
      target({ id: "one", operation: "create", submitControlId: "button-submit-create", sortOrder: 10 }),
      target({ id: "two", operation: "edit", submitControlId: "button-submit-create", sortOrder: 20 })
    ])))!;
    expect(asset.assetStatus).toBe("Blocked");
    expect(asset.blockingIssues.join(" ")).toContain("Duplicate form-operation intended fragment path");
  });

  it("creates only the required current-project dependencies", () => {
    const asset = formAsset(registryFor(createFormProject()))!;
    expect(asset.dependencies.map((dependency) => dependency.type).sort()).toEqual(["connector", "control", "control", "entity", "field", "screen"]);
    expect(asset.dependencies.some((dependency) => dependency.type === "environmentVariable")).toBe(false);
    expect(asset.dependencies.some((dependency) => dependency.type === "connectionReference")).toBe(false);
    expect(asset.dependencies.some((dependency) => dependency.type === "asset")).toBe(false);
  });

  it("uses the canonical nine-gate contract", () => {
    expect(formAsset(registryFor(createFormProject()))?.requiredGateIds).toEqual([
      "screenTargets",
      "controlTargets",
      "connectorSelection",
      "schema",
      "namingStandards",
      "connectorPermissions",
      "dataSourcePermissions",
      "security",
      "accessibility"
    ]);
  });

  it.each([
    ["screen-target", (project: ProjectRecord) => { project.powerPlatform!.canvas!.screenTargets[0].confirmationStatus = "reviewNeeded"; }],
    ["control-target", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].confirmationStatus = "reviewNeeded"; }],
    ["connector-selection", (project: ProjectRecord) => { project.powerPlatform!.canvas!.primaryConnectorId = "missing"; }],
    ["schema", (project: ProjectRecord) => { project.powerPlatform!.canvas!.sharePointColumnSchemas = []; }],
    ["naming", (project: ProjectRecord) => { project.powerPlatform!.canvas!.namingStandardConfirmationStatus = "reviewNeeded"; }],
    ["connector-permissions", (project: ProjectRecord) => { project.powerPlatform!.common.connectors[0].permissionConfirmationStatus = "reviewNeeded"; }],
    ["data-source-permissions", (project: ProjectRecord) => { project.intake.permissionRules = ""; project.powerPlatform!.common.recordAccessRules = ""; }],
    ["security", (project: ProjectRecord) => { project.powerPlatform!.common.securityReviewStatus = "reviewNeeded"; }],
    ["accessibility", (project: ProjectRecord) => { project.intake.accessibilityNotes = ""; }]
  ])("blocks when the current %s gate fails", (_label, mutate) => {
    const project = createFormProject();
    mutate(project);
    expect(formAsset(registryFor(project))?.assetStatus).toBe("Blocked");
  });

  it.each([
    ["target addition", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets.push(target({ id: "edit", operation: "edit", submitControlId: "button-submit-edit", sortOrder: 20 })); }],
    ["target removal", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets = []; }],
    ["target order", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].sortOrder = 99; }],
    ["operation", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].operation = "edit"; project.powerPlatform!.canvas!.formOperationTargets[0].submitControlId = "button-submit-edit"; }],
    ["screen", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].screenId = "missing-screen"; }],
    ["form control", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].formControlId = "missing-form"; }],
    ["submit control", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].submitControlId = "button-submit-edit"; }],
    ["connector", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].sourceConnectorId = "missing-connector"; }],
    ["entity", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].sourceEntityId = "missing-entity"; }],
    ["required field", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].requiredFieldIds = ["field-title", "field-optional"]; }],
    ["implementation name", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "frmChanged"; }],
    ["trigger", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].submissionTrigger = "manual" as any; }],
    ["required flag", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].required = false; }],
    ["confirmation", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].confirmationStatus = "reviewNeeded"; }]
  ])("changes checksum when %s changes", (_label, mutate) => {
    const before = formAsset(registryFor(createFormProject()))!.contentChecksum;
    const project = createFormProject();
    mutate(project);
    const after = formAsset(registryFor(project))?.contentChecksum ?? "";
    expect(after).not.toBe(before);
  });

  it("does not change checksum when only the generation timestamp changes", () => {
    const project = createFormProject();
    expect(formAsset(buildImplementationAssetRegistry(project, "2026-07-17T00:00:00.000Z"))?.contentChecksum)
      .toBe(formAsset(buildImplementationAssetRegistry(project, "2026-07-17T01:00:00.000Z"))?.contentChecksum);
  });

  it("keeps an unchanged explicitly approved form plan Ready for Export", () => {
    expect(formAsset(approvedRegistry(createFormProject()))?.assetStatus).toBe("Ready for Export");
  });

  it("requires review after an approved form plan changes and excludes stale readiness", () => {
    const project = createFormProject();
    const approved = approvedRegistry(project);
    project.powerPlatform!.canvas!.formOperationTargets[0].sortOrder = 99;
    const state = deriveImplementationAssetRegistryState(project, approved.assets);
    const asset = state.assets.find((item) => item.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID)!;
    expect(asset.assetStatus).not.toBe("Ready for Export");
    expect(state.summary.readyAssetCount).toBeLessThan(approved.summary.readyAssetCount);
    expect(createImplementationAssetManifest(approved, project).assets.find((item) => item.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID)?.status).not.toBe("Ready for Export");
    expect(installAsset({ ...approved, assets: state.assets })?.dependencies.find((dependency) => dependency.targetAssetId === CANVAS_FORM_OPERATIONS_ASSET_ID)?.resolved).toBe(false);
  });

  it("rebuilds stored identity, gates, dependencies, and structured inputs from the current project", () => {
    const project = createFormProject();
    const approved = approvedRegistry(project);
    const mutated = {
      ...approved,
      assets: approved.assets.map((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID
        ? {
            ...asset,
            targetId: "tampered",
            requiredGateIds: [],
            dependencies: [],
            generationInputs: { ...asset.generationInputs, formOperationTargets: [] }
          }
        : asset)
    };
    const derived = deriveImplementationAssetRegistryState(project, mutated.assets).assets.find((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID)!;
    expect(derived.targetId).toBe(CANVAS_FORM_OPERATIONS_TARGET_ID);
    expect(derived.requiredGateIds).toHaveLength(9);
    expect(derived.dependencies.length).toBeGreaterThan(0);
    expect(derived.generationInputs?.formOperationTargets).toHaveLength(1);
    expect(evaluateImplementationAssetStatus(derived)).not.toBe("Ready for Export");
  });

  it("keeps readable source safe while preserving structural details", () => {
    const project = createFormProject();
    project.powerPlatform!.canvas!.formOperationTargets[0].id = "target-secret-id";
    project.powerPlatform!.canvas!.formOperationTargets[0].sourceConnectorId = "connector-sharepoint";
    const asset = formAsset(registryFor(project))!;
    expect(asset.generationInputs?.formOperationTargets?.[0].id).toBe("target-secret-id");
    expect(asset.sourceContent).not.toContain("target-secret-id");
    expect(asset.sourceContent).not.toContain("connector-sharepoint");
    expect(asset.sourceContent).not.toContain("list-requests");
    expect(asset.sourceContent).not.toContain("field-title");
  });

  it("displays validated simple implementation identifiers for valid unblocked plans", () => {
    const asset = formAsset(registryFor(createFormProject()))!;
    expect(asset.assetStatus).toBe("Review Required");
    expect(asset.sourceContent).toContain("form frmRequest");
    expect(asset.sourceContent).toContain("submit button btnSubmitCreate");
    expect(asset.sourceContent).toContain("entity Requests");
  });

  it.each([
    ["form-control name", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "frm Request"; }, "frm Request"],
    ["submit-control name", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[1].approvedControlName = "btn.Submit"; }, "btn.Submit"],
    ["entity implementation name", (project: ProjectRecord) => { project.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "Requests list"; }, "Requests list"],
    ["punctuation text", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "frm<Request>"; }, "frm<Request>"],
    ["formula-looking value", (project: ProjectRecord) => { project.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "SubmitForm(frmRequest)"; }, "SubmitForm(frmRequest)"]
  ])("redacts invalid %s from blocked readable source while preserving structure", (_label, mutate, hiddenValue) => {
    const project = createFormProject();
    mutate(project);
    const asset = formAsset(registryFor(project))!;
    expect(asset.assetStatus).toBe("Blocked");
    expect(asset.sourceContent).toContain("implementation identifiers stored structurally");
    expect(asset.sourceContent).not.toContain(hiddenValue);
    expect(JSON.stringify(asset.generationInputs?.formOperationTargets)).toContain(hiddenValue);
  });

  it("keeps blocked readable content deterministic while hidden invalid identifiers still affect checksums", () => {
    const first = createFormProject();
    first.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "frm Request";
    const second = createFormProject();
    second.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "frm Other Request";
    const firstAsset = formAsset(registryFor(first))!;
    const secondAsset = formAsset(registryFor(second))!;
    expect(firstAsset.sourceContent).toBe(secondAsset.sourceContent);
    expect(firstAsset.contentChecksum).not.toBe(secondAsset.contentChecksum);
  });

  it("renders blocked readable content as a safe issue count while keeping structural blockers", () => {
    const asset = formAsset(registryFor(createFormProject([target({ requiredFieldIds: [] })])))!;
    expect(asset.assetStatus).toBe("Blocked");
    expect(asset.sourceContent).toContain("form-operation planning issues are stored structurally");
    expect(asset.sourceContent).not.toContain("missing required field reference");
    expect(asset.blockingIssues.join(" ")).toContain("missing required field reference");
  });

  it("does not print formula-like values or generate executable Power Fx", () => {
    const project = createFormProject();
    project.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "SubmitForm(frmRequest)";
    const asset = formAsset(registryFor(project))!;
    expect(asset.generationInputs?.formOperationTargets?.[0].sourceImplementationName).toBe("SubmitForm(frmRequest)");
    expect(asset.sourceContent).not.toContain("SubmitForm(");
    expect(asset.sourceContent).not.toContain("NewForm(");
    expect(asset.sourceContent).not.toContain("EditForm(");
    expect(asset.sourceContent).not.toContain("Patch(");
    expect(asset.intendedPath.endsWith(".md")).toBe(true);
    expect(asset.generationInputs?.formOperationTargets?.[0].intendedFragmentPath.endsWith(".fx")).toBe(true);
  });

  it("resolves valid relationship-aware screen, form, submit, entity, and field dependencies", () => {
    const asset = formAsset(registryFor(createFormProject()))!;
    expect(screenDependency(asset)?.resolved).toBe(true);
    expect(formDependency(asset)?.resolved).toBe(true);
    expect(submitDependency(asset)?.resolved).toBe(true);
    expect(asset.dependencies.find((dependency) => dependency.type === "entity")?.resolved).toBe(true);
    expect(asset.dependencies.find((dependency) => dependency.type === "field")?.resolved).toBe(true);
  });

  it.each([
    ["form moved to another screen", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].screenId = "other-screen"; }],
    ["form changed to display form", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].controlType = "display form"; }],
    ["form changed to gallery", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].controlType = "gallery"; }],
    ["form invalid implementation name", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "frm Request"; }]
  ])("blocks when the editable-form dependency is invalid: %s", (_label, mutate) => {
    const project = createFormProject();
    mutate(project);
    const asset = formAsset(registryFor(project))!;
    expect(formDependency(asset)?.resolved).toBe(false);
    expect(asset.assetStatus).toBe("Blocked");
  });

  it.each([
    ["submit moved to another screen", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[1].screenId = "other-screen"; }],
    ["submit changed to icon", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[1].controlType = "icon"; }],
    ["submit changed to unsupported type", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[1].controlType = "label"; }],
    ["submit invalid implementation name", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[1].approvedControlName = "btn Submit"; }]
  ])("blocks when the submit dependency is invalid: %s", (_label, mutate) => {
    const project = createFormProject();
    mutate(project);
    const asset = formAsset(registryFor(project))!;
    expect(submitDependency(asset)?.resolved).toBe(false);
    expect(asset.assetStatus).toBe("Blocked");
  });

  it("blocks when the screen dependency has an invalid current implementation name", () => {
    const project = createFormProject();
    project.powerPlatform!.canvas!.screenTargets[0].approvedScreenName = "scr Request";
    const asset = formAsset(registryFor(project))!;
    expect(screenDependency(asset)?.resolved).toBe(false);
    expect(asset.assetStatus).toBe("Blocked");
  });

  it("preserves specialized unresolved form dependencies through current-state derivation", () => {
    const project = createFormProject();
    const approved = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].controlType = "gallery";
    const state = deriveImplementationAssetRegistryState(project, approved.assets);
    const asset = state.assets.find((item) => item.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID)!;
    expect(formDependency(asset)?.resolved).toBe(false);
    expect(asset.assetStatus).toBe("Blocked");
    expect(state.graph.unresolvedRecordDependencyIssues.join(" ")).toContain("Form control");
    expect(state.summary.readyAssetCount).toBeLessThan(approved.summary.readyAssetCount);
    expect(createImplementationAssetManifest(approved, project).assets.find((item) => item.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID)?.status).not.toBe("Ready for Export");
    expect(installAsset({ ...approved, assets: state.assets })?.dependencies.find((dependency) => dependency.targetAssetId === CANVAS_FORM_OPERATIONS_ASSET_ID)?.resolved).toBe(false);
  });

  it("preserves specialized unresolved submit dependencies through current-state derivation", () => {
    const project = createFormProject();
    const approved = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[1].controlType = "icon";
    const state = deriveImplementationAssetRegistryState(project, approved.assets);
    const asset = state.assets.find((item) => item.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID)!;
    expect(submitDependency(asset)?.resolved).toBe(false);
    expect(asset.assetStatus).toBe("Blocked");
  });

  it("does not mutate project or registry inputs", () => {
    const project = createFormProject();
    const beforeProject = JSON.parse(JSON.stringify(project));
    const registry = registryFor(project);
    const beforeRegistry = JSON.parse(JSON.stringify(registry));
    deriveImplementationAssetRegistryState(project, registry.assets);
    expect(project).toEqual(beforeProject);
    expect(registry).toEqual(beforeRegistry);
  });

  it("does not create implementation assets when no form target exists and creates no UI/export integration", () => {
    const assetIds = registryFor(createFormProject()).assets.map((asset) => asset.assetId);
    expect(assetIds).toContain(CANVAS_FORM_OPERATIONS_ASSET_ID);
    expect(assetIds).not.toContain("asset-canvas-powerfx-form-operation-submitform");
    expect(assetIds.some((id) => id.includes("ui") || id.includes("export"))).toBe(false);
  });

  it("permits approval through the normal registry path", () => {
    const project = createFormProject();
    const approved = approveFrom(registryFor(project), project);
    expect(formAsset(approved)?.approvalStatus).toBe("Approved");
    expect(formAsset(approved)?.assetStatus).toBe("Ready for Export");
    expect(formAsset(approved)?.contentChecksum).toBe(calculateImplementationAssetChecksum({ ...formAsset(approved)!, contentChecksum: "" }));
  });
});
