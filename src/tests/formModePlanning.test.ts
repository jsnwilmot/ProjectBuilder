import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
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
  CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
  CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY,
  CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION,
  CANVAS_FORM_MODE_ACTIONS_OPERATION,
  CANVAS_FORM_MODE_ACTIONS_PLAN_PATH,
  CANVAS_FORM_MODE_ACTIONS_TARGET_ID,
  buildCanvasFormModePlanningModel,
  validateCanvasFormModeActionIntendedPaths
} from "../lib/formModePlanning";
import { CANVAS_FORM_OPERATIONS_ASSET_ID } from "../lib/formOperationPlanning";
import {
  createApplicabilityDecision,
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import type { CanvasFormModeTarget, CanvasFormOperationTarget, ProjectRecord } from "../types/project";

const NOW = "2026-07-18T12:00:00.000Z";
const FORBIDDEN_FORMULAS = [
  "NewForm(",
  "EditForm(",
  "ResetForm(",
  "ViewForm(",
  "SubmitForm(",
  "Patch(",
  "Navigate(",
  "Notify(",
  "Set(",
  "UpdateContext(",
  "ClearCollect(",
  "Collect(",
  "Clear("
];

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
    submitControlId: "button-submit-edit",
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
      appPurpose: "Plan form-mode actions.",
      requiredFeatures: "Create and edit records.",
      workflows: "Start form modes.",
      outOfScope: "Deployment.",
      successCriteria: "Form modes are planned.",
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
    })
  ];
  const canvas = pp.canvas!;
  canvas.primaryDataSourceType = "sharePointList";
  canvas.selectedDataSourceTypes = ["sharePointList"];
  canvas.primaryConnectorId = "connector-sharepoint";
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
      screenId: "screen-request",
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

function fullyApprovedRegistry(project: ProjectRecord): ImplementationAssetRegistry {
  return approveFrom(approveFrom(registryFor(project), project), project);
}

function modeAsset(registry: ImplementationAssetRegistry): ImplementationAsset | undefined {
  return registry.assets.find((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID);
}

function formOperationAsset(registry: ImplementationAssetRegistry): ImplementationAsset | undefined {
  return registry.assets.find((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function registryIssuesForAsset(asset: ImplementationAsset, project = createCanvasProject()): string {
  return validateImplementationAssetRegistry({ ...registryFor(project), assets: [asset] }, project).join(" ");
}

function validModeAsset(): ImplementationAsset {
  return modeAsset(registryFor(createCanvasProject()))!;
}

function validModeInput() {
  return validModeAsset().generationInputs!.formModeTargets![0];
}

function withMalformedAsset(overrides: Record<string, unknown>): string {
  return registryIssuesForAsset({ ...validModeAsset(), ...overrides } as unknown as ImplementationAsset);
}

function withMalformedGenerationInputs(formModeTargets: unknown): string {
  return withMalformedAsset({
    assetId: "asset-unrelated-form-mode-input",
    generationInputs: {
      ...validModeAsset().generationInputs,
      formModeTargets
    }
  });
}

describe("Canvas form-mode action planning asset", () => {
  it.each([
    ["new", [formModeTarget()], [formOperationTarget()]],
    ["edit", [editModeTarget()], [editOperationTarget()]]
  ])("creates one combined planning asset for a valid single %s-mode target", (_label, modeTargets, operationTargets) => {
    const asset = modeAsset(registryFor(createCanvasProject(modeTargets, operationTargets)));
    expect(asset).toBeDefined();
    expect(asset?.generationInputs?.formModeTargets).toHaveLength(1);
  });

  it("keeps multiple targets in one combined asset without merging structured entries", () => {
    const asset = modeAsset(registryFor(createCanvasProject(
      [editModeTarget({ sortOrder: 20 }), formModeTarget({ sortOrder: 10 })],
      [editOperationTarget(), formOperationTarget()]
    )))!;
    expect(asset.generationInputs?.formModeTargets?.map((target) => target.formModeTargetId)).toEqual(["mode-new-request", "mode-edit-request"]);
    expect(asset.generationInputs?.formModeTargets?.map((target) => target.action)).toEqual(["new", "edit"]);
  });

  it("is deterministic when input array order changes", () => {
    const first = modeAsset(registryFor(createCanvasProject(
      [editModeTarget({ sortOrder: 20 }), formModeTarget({ sortOrder: 10 })],
      [editOperationTarget(), formOperationTarget()]
    )))!;
    const second = modeAsset(registryFor(createCanvasProject(
      [formModeTarget({ sortOrder: 10 }), editModeTarget({ sortOrder: 20 })],
      [formOperationTarget(), editOperationTarget()]
    )))!;
    expect(first.contentChecksum).toBe(second.contentChecksum);
    expect(first.generationInputs?.formModeTargets).toEqual(second.generationInputs?.formModeTargets);
  });

  it("uses the exact canonical identity and generation contract", () => {
    const asset = modeAsset(registryFor(createCanvasProject()))!;
    expect(asset.assetId).toBe(CANVAS_FORM_MODE_ACTIONS_ASSET_ID);
    expect(asset.targetId).toBe(CANVAS_FORM_MODE_ACTIONS_TARGET_ID);
    expect(asset.generationInputs?.operation).toBe(CANVAS_FORM_MODE_ACTIONS_OPERATION);
    expect(asset.approvedPropertyName).toBe(CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY);
    expect(asset.generationInputs?.formulaProperty).toBe(CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY);
    expect(asset.intendedPath).toBe(CANVAS_FORM_MODE_ACTIONS_PLAN_PATH);
    expect(asset.generationVersion).toBe(CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION);
    expect(asset.generationInputs?.planningGenerationVersion).toBe(CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION);
  });

  it("preserves required structured target inputs from current canonical project values", () => {
    const input = modeAsset(registryFor(createCanvasProject()))!.generationInputs?.formModeTargets?.[0];
    expect(input).toMatchObject({
      formModeTargetId: "mode-new-request",
      formOperationTargetId: "form-op-create-request",
      action: "new",
      trigger: "controlOnSelect",
      triggerControlId: "button-new-mode",
      triggerControlApprovedName: "btnNewMode",
      screenTargetId: "screen-request",
      screenApprovedName: "scrRequest",
      formControlId: "form-request",
      formControlApprovedName: "frmRequest",
      editRecordContextStatus: "notRequired",
      required: true,
      sortOrder: 10,
      intendedPath: "07_Development/PowerFx/screen-request/button-new-mode/OnSelect.form-mode.fx"
    });
  });

  it("describes the current project identity in deterministic planning content", () => {
    const asset = modeAsset(registryFor(createCanvasProject()))!;
    expect(asset.projectId).toBe("project-unique-742");
    expect(asset.generationInputs?.projectName).toBe("Unique Project 742");
    expect(asset.sourceContent).toContain("Project ID: project-unique-742");
    expect(asset.sourceContent).toContain("Project name: Unique Project 742");
  });

  it("requires the canonical form-operation planning asset to be approved and Ready for Export", () => {
    const initial = registryFor(createCanvasProject());
    expect(formOperationAsset(initial)?.assetStatus).toBe("Review Required");
    expect(modeAsset(initial)?.assetStatus).toBe("Blocked");
    expect(modeAsset(initial)?.blockingIssues.join(" ")).toContain(CANVAS_FORM_OPERATIONS_ASSET_ID);

    const sourceApproved = approveFrom(initial, createCanvasProject());
    expect(formOperationAsset(sourceApproved)?.assetStatus).toBe("Ready for Export");
    expect(modeAsset(sourceApproved)?.assetStatus).toBe("Review Required");
  });

  it.each([
    ["missing source", (registry: ImplementationAssetRegistry) => ({ ...registry, assets: registry.assets.filter((asset) => asset.assetId !== CANVAS_FORM_OPERATIONS_ASSET_ID) })],
    ["duplicate source", (registry: ImplementationAssetRegistry) => ({ ...registry, assets: [...registry.assets, clone(formOperationAsset(registry)!)] })],
    ["wrong-project source", (registry: ImplementationAssetRegistry) => ({ ...registry, assets: registry.assets.map((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID ? { ...asset, projectId: "other-project" } : asset) })],
    ["wrong source identity", (registry: ImplementationAssetRegistry) => ({ ...registry, assets: registry.assets.map((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID ? { ...asset, targetId: "wrong-target" } : asset) })],
    ["unapproved source", (registry: ImplementationAssetRegistry) => ({ ...registry, assets: registry.assets.map((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID ? { ...asset, approvalStatus: "Review required" as const, assetStatus: "Review Required" as const } : asset) })],
    ["non-ready source", (registry: ImplementationAssetRegistry) => ({ ...registry, assets: registry.assets.map((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID ? { ...asset, assetStatus: "Review Required" as const } : asset) })],
    ["stale source checksum", (registry: ImplementationAssetRegistry) => ({ ...registry, assets: registry.assets.map((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID ? { ...asset, contentChecksum: "stale" } : asset) })]
  ])("blocks when the source form-operation planning asset is %s", (_label, mutate) => {
    const project = createCanvasProject();
    const registry = mutate(fullyApprovedRegistry(project));
    const state = deriveImplementationAssetRegistryState(project, registry.assets);
    expect(state.assets.find((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID)?.assetStatus).toBe("Blocked");
  });

  it("binds source planning asset checksum into the current asset checksum", () => {
    const project = createCanvasProject();
    const approved = fullyApprovedRegistry(project);
    const before = modeAsset(approved)!.contentChecksum;
    const mutated = {
      ...approved,
      assets: approved.assets.map((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID ? { ...asset, contentChecksum: "fnv1a-00000000" } : asset)
    };
    const after = deriveImplementationAssetRegistryState(project, mutated.assets).assets.find((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID)!;
    expect(after.contentChecksum).not.toBe(before);
    expect(after.assetStatus).toBe("Blocked");
  });

  it("keeps new and edit actions as non-executable action values only", () => {
    const asset = modeAsset(registryFor(createCanvasProject(
      [formModeTarget(), editModeTarget()],
      [formOperationTarget(), editOperationTarget()]
    )))!;
    expect(asset.generationInputs?.formModeTargets?.map((target) => target.action)).toEqual(["new", "edit"]);
    for (const token of FORBIDDEN_FORMULAS) {
      expect(asset.sourceContent).not.toContain(token);
      expect(JSON.stringify(asset.generationInputs)).not.toContain(token);
    }
  });

  it("validates intended future paths without writing fx files", () => {
    const input = modeAsset(registryFor(createCanvasProject()))!.generationInputs!.formModeTargets![0];
    expect(input.intendedPath).toBe("07_Development/PowerFx/screen-request/button-new-mode/OnSelect.form-mode.fx");
    expect(validateCanvasFormModeActionIntendedPaths([input])).toEqual([]);
    expect(validateCanvasFormModeActionIntendedPaths([{ ...input, intendedPath: "07_Development\\PowerFx\\screen-request\\button-new-mode\\OnSelect.form-mode.fx" }]).join(" ")).toContain("backslashes");
    expect(validateCanvasFormModeActionIntendedPaths([{ ...input, intendedPath: "C:/repo/07_Development/PowerFx/screen-request/button-new-mode/OnSelect.form-mode.fx" }]).join(" ")).toContain("absolute");
    expect(validateCanvasFormModeActionIntendedPaths([{ ...input, intendedPath: "07_Development/PowerFx/../button-new-mode/OnSelect.form-mode.fx" }]).join(" ")).toContain("parent traversal");
    expect(validateCanvasFormModeActionIntendedPaths([input, input]).join(" ")).toContain("Duplicate form-mode action intended path");
  });

  it("includes source, screen, form, trigger, and gate dependencies exactly once in deterministic order", () => {
    const dependencies = modeAsset(registryFor(createCanvasProject(
      [formModeTarget(), editModeTarget()],
      [formOperationTarget(), editOperationTarget()]
    )))!.dependencies;
    expect(dependencies.map((item) => item.id)).toEqual([...dependencies.map((item) => item.id)].sort());
    expect(dependencies.filter((item) => item.type === "asset" && item.targetAssetId === CANVAS_FORM_OPERATIONS_ASSET_ID)).toHaveLength(1);
    expect(dependencies.filter((item) => item.type === "screen")).toHaveLength(1);
    expect(dependencies.filter((item) => item.id.includes("control:form"))).toHaveLength(1);
    expect(dependencies.filter((item) => item.id.includes("control:trigger"))).toHaveLength(2);
    expect(dependencies.filter((item) => item.type === "gate")).toHaveLength(9);
    expect(new Set(dependencies.map((item) => item.id)).size).toBe(dependencies.length);
  });

  it("uses the canonical form-operation gate set and blocks malformed gate data in stored registries", () => {
    const asset = modeAsset(registryFor(createCanvasProject()))!;
    expect(asset.requiredGateIds).toEqual([
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
    const malformed = { ...asset, assetId: "asset-unrelated-malformed", requiredGateIds: ["unknownGate" as any], gateEvaluationSnapshot: [{ ...asset.gateEvaluationSnapshot[0], gateId: "unknownGate" as any, status: "unknownStatus" as any }] };
    expect(validateImplementationAssetRegistry({ ...registryFor(createCanvasProject()), assets: [malformed] }, createCanvasProject()).join(" ")).toContain("unknown");
  });

  it("returns no planning asset for blocked form-mode targets or not-applicable projects", () => {
    expect(modeAsset(registryFor(createCanvasProject([formModeTarget({ action: "edit", editRecordContextStatus: "confirmedExistingItemBinding" })])))).toBeUndefined();
    expect(modeAsset(registryFor(createCanvasProject([])))).toBeUndefined();
    const website = createProject({ intake: { appType: "businessWebsite" } as any });
    expect(buildCanvasFormModePlanningModel(website).eligibilityStatus).toBe("Not Applicable");
    expect(modeAsset(registryFor(website))).toBeUndefined();
  });

  it("blocks a stale stored form-mode planning asset after target removal", () => {
    const project = createCanvasProject();
    const approved = fullyApprovedRegistry(project);
    project.powerPlatform!.canvas!.formModeTargets = [];
    const stale = deriveImplementationAssetRegistryState(project, approved.assets).assets.find((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID)!;
    expect(stale.assetStatus).toBe("Blocked");
    expect(stale.blockingIssues.join(" ")).toContain("stale");
  });

  it.each([
    ["target removal", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formModeTargets = []; }],
    ["trigger-name change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "button-new-mode")!.approvedControlName = "btnNewModeChanged"; }],
    ["form-name change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "form-request")!.approvedControlName = "frmChanged"; }],
    ["action change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formModeTargets[0].action = "edit"; project.powerPlatform!.canvas!.formModeTargets[0].editRecordContextStatus = "confirmedExistingItemBinding"; }],
    ["sort-order change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formModeTargets[0].sortOrder = 99; }],
    ["path change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formModeTargets[0].triggerControlId = "button-edit-mode"; }]
  ])("invalidates approval after %s", (_label, mutate) => {
    const project = createCanvasProject();
    const approved = fullyApprovedRegistry(project);
    mutate(project);
    const asset = deriveImplementationAssetRegistryState(project, approved.assets).assets.find((item) => item.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID);
    expect(asset?.assetStatus).not.toBe("Ready for Export");
  });

  it("is checksum deterministic and timestamp-neutral", () => {
    const project = createCanvasProject();
    expect(modeAsset(buildImplementationAssetRegistry(project, "2026-07-18T00:00:00.000Z"))?.contentChecksum)
      .toBe(modeAsset(buildImplementationAssetRegistry(project, "2026-07-18T01:00:00.000Z"))?.contentChecksum);
    const asset = modeAsset(registryFor(project))!;
    expect(asset.contentChecksum).toBe(calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" }));
  });

  it("preserves approval only when checksum and source readiness remain current", () => {
    const project = createCanvasProject();
    const approved = fullyApprovedRegistry(project);
    expect(modeAsset(approved)?.assetStatus).toBe("Ready for Export");
    project.powerPlatform!.canvas!.formModeTargets[0].sortOrder = 99;
    const changed = deriveImplementationAssetRegistryState(project, approved.assets).assets.find((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID)!;
    expect(changed.approvalStatus).toBe("Review required");
    expect(changed.assetStatus).not.toBe("Ready for Export");
  });

  it("does not mutate project, registry, existing assets, or dependency inputs", () => {
    const project = createCanvasProject();
    const registry = fullyApprovedRegistry(project);
    const beforeProject = clone(project);
    const beforeRegistry = clone(registry);
    deriveImplementationAssetRegistryState(project, registry.assets);
    expect(project).toEqual(beforeProject);
    expect(registry).toEqual(beforeRegistry);
  });

  it("does not create formula fragments, fx files, UI/export integration, or later phase assets", () => {
    const registry = registryFor(createCanvasProject());
    const asset = modeAsset(registry)!;
    expect(asset.intendedPath.endsWith(".md")).toBe(true);
    expect(registry.assets.map((item) => item.assetId)).not.toContain("asset-canvas-powerfx-form-mode-generation");
    expect(registry.assets.some((item) => item.intendedPath.endsWith(".fx") && item.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID)).toBe(false);
    expect(registry.assets.some((item) => item.assetId.includes("ui") || item.assetId.includes("export"))).toBe(false);
  });

  it("blocks malformed unrelated registry assets safely", () => {
    const project = createCanvasProject();
    const registry = registryFor(project);
    const malformed = {
      ...modeAsset(registry)!,
      assetId: "asset-unrelated-malformed",
      platform: "Unknown Platform",
      assetCategory: "Unknown Category",
      assetType: "Unknown Type",
      assetStatus: "Unknown Status",
      applicabilityStatus: "unknownApplicability",
      approvalStatus: "Unknown Approval",
      dependencies: [{ ...modeAsset(registry)!.dependencies[0], type: "unknownDependency" }]
    } as unknown as ImplementationAsset;
    const issues = validateImplementationAssetRegistry({ ...registry, assets: [malformed] }, project);
    expect(issues.join(" ")).toContain("unknown platform");
    expect(issues.join(" ")).toContain("unknown dependency type");
  });

  it.each([
    ["null dependencies", { dependencies: null }, "dependencies must be an array"],
    ["primitive dependencies", { dependencies: "bad" }, "dependencies must be an array"],
    ["object dependencies", { dependencies: {} }, "dependencies must be an array"],
    ["null requiredGateIds", { requiredGateIds: null }, "requiredGateIds must be an array"],
    ["primitive requiredGateIds", { requiredGateIds: "bad" }, "requiredGateIds must be an array"],
    ["null gateEvaluationSnapshot", { gateEvaluationSnapshot: null }, "gateEvaluationSnapshot must be an array"],
    ["primitive gateEvaluationSnapshot", { gateEvaluationSnapshot: "bad" }, "gateEvaluationSnapshot must be an array"]
  ])("blocks malformed registry array shape for %s without throwing", (_label, overrides, expected) => {
    expect(() => withMalformedAsset(overrides)).not.toThrow();
    expect(withMalformedAsset(overrides)).toContain(expected);
  });

  it("blocks malformed dependency records without throwing before graph evaluation", () => {
    const issues = withMalformedAsset({ dependencies: [null, "bad", { id: 42, type: "bad", label: 12, required: "yes", resolved: "no", resolutionReason: 10, sourceSection: false, targetAssetId: 12, targetRecordId: 13, blockingIssue: 14, relationshipContext: "bad" }] });
    expect(issues).toContain("dependencies[0] must be a non-null object");
    expect(issues).toContain("dependencies[1] must be a non-null object");
    expect(issues).toContain("dependencies[2].id must be a string");
    expect(issues).toContain("unknown dependency type");
    expect(issues).toContain("relationshipContext must be a non-null object");
  });

  it("blocks malformed gate records without throwing before phase-gate evaluation", () => {
    const issues = withMalformedAsset({
      requiredGateIds: [null, "unknownGate"],
      gateEvaluationSnapshot: [null, "bad", { gateId: "unknownGate", status: "unknownStatus", label: 12, blockingReason: 13, sourceSection: false, passed: "yes" }]
    });
    expect(issues).toContain("requiredGateIds[0] must be a string");
    expect(issues).toContain("requiredGateIds[1] has unknown gate ID unknownGate");
    expect(issues).toContain("gateEvaluationSnapshot[0] must be a non-null object");
    expect(issues).toContain("gateEvaluationSnapshot[1] must be a non-null object");
    expect(issues).toContain("unknown gate ID unknownGate");
    expect(issues).toContain("unknown gate status unknownStatus");
    expect(issues).toContain("passed must be Boolean");
  });

  it.each([
    ["non-array formModeTargets", "bad", "generationInputs.formModeTargets must be an array"],
    ["null nested entry", [null], "generationInputs.formModeTargets[0] must be a non-null object"],
    ["primitive nested entry", ["bad"], "generationInputs.formModeTargets[0] must be a non-null object"],
    ["partial nested entry", [{ formModeTargetId: "mode" }], "generationInputs.formModeTargets[0].formOperationTargetId is missing"],
    ["delete action", [{ ...validModeInput(), action: "delete" }], "generationInputs.formModeTargets[0].action has unsupported action delete"],
    ["unsupported trigger", [{ ...validModeInput(), trigger: "manual" }], "generationInputs.formModeTargets[0].trigger has unsupported trigger manual"],
    ["unsupported edit context", [{ ...validModeInput(), editRecordContextStatus: "unknown" }], "generationInputs.formModeTargets[0].editRecordContextStatus has unsupported edit context unknown"],
    ["missing ID", [{ ...validModeInput(), formModeTargetId: "" }], "generationInputs.formModeTargets[0].formModeTargetId must be a non-empty string"],
    ["non-string approved name", [{ ...validModeInput(), triggerControlApprovedName: 42 }], "generationInputs.formModeTargets[0].triggerControlApprovedName must be a string"],
    ["non-Boolean required", [{ ...validModeInput(), required: "yes" }], "generationInputs.formModeTargets[0].required must be Boolean"],
    ["missing sortOrder", [{ ...validModeInput(), sortOrder: undefined }], "generationInputs.formModeTargets[0].sortOrder must be numeric and finite"],
    ["string sortOrder", [{ ...validModeInput(), sortOrder: "10" }], "generationInputs.formModeTargets[0].sortOrder must be numeric and finite"],
    ["infinite sortOrder", [{ ...validModeInput(), sortOrder: Infinity }], "generationInputs.formModeTargets[0].sortOrder must be numeric and finite"],
    ["non-string intendedPath", [{ ...validModeInput(), intendedPath: 42 }], "generationInputs.formModeTargets[0].intendedPath must be a string"],
    ["unsafe intended path", [{ ...validModeInput(), intendedPath: "../bad/OnSelect.form-mode.fx" }], "generationInputs.formModeTargets intendedPath"]
  ])("blocks malformed nested form-mode input: %s", (_label, formModeTargets, expected) => {
    const issues = withMalformedGenerationInputs(formModeTargets);
    expect(issues).toContain("generationInputs.formModeTargets");
    expect(issues).toContain(expected);
  });

  it("blocks duplicate nested form-mode intended paths semantically on unrelated assets", () => {
    const input = validModeInput();
    const issues = withMalformedGenerationInputs([{ ...input }, { ...input, formModeTargetId: "mode-copy" }]);
    expect(issues).toContain("generationInputs.formModeTargets");
    expect(issues).toContain("Duplicate form-mode action intended path");
  });

  it("writes action counts into deterministic planning content and binds them to checksum", () => {
    const one = modeAsset(registryFor(createCanvasProject()))!;
    const two = modeAsset(registryFor(createCanvasProject(
      [formModeTarget(), editModeTarget()],
      [formOperationTarget(), editOperationTarget()]
    )))!;
    expect(one.sourceContent).toContain("Form-mode action count: 1");
    expect(two.sourceContent).toContain("Form-mode action count: 2");
    expect(one.contentChecksum).not.toBe(two.contentChecksum);
    expect(modeAsset(buildImplementationAssetRegistry(createCanvasProject(), "2026-07-18T00:00:00.000Z"))?.contentChecksum)
      .toBe(modeAsset(buildImplementationAssetRegistry(createCanvasProject(), "2026-07-18T01:00:00.000Z"))?.contentChecksum);
  });

  it.each([
    ["null registry", null, "Registry envelope must be a non-null object"],
    ["primitive registry", "bad", "Registry envelope must be a non-null object"],
    ["array registry", [], "Registry envelope must be a non-null object"],
    ["missing assets", {}, "registry.assets is missing"],
    ["null assets", { assets: null }, "registry.assets must be an array"],
    ["primitive assets", { assets: "bad" }, "registry.assets must be an array"],
    ["object assets", { assets: {} }, "registry.assets must be an array"],
    ["null asset entry", { assets: [null] }, "registry.assets[0]"],
    ["primitive asset entry", { assets: ["bad"] }, "registry.assets[0]"],
    ["partial asset entry", { assets: [{ assetId: "partial" }] }, "registry.assets[0]"]
  ])("validateImplementationAssetRegistry handles malformed envelope: %s", (_label, registry, expected) => {
    expect(() => validateImplementationAssetRegistry(registry, createCanvasProject())).not.toThrow();
    expect(validateImplementationAssetRegistry(registry, createCanvasProject()).join(" ")).toContain(expected);
  });

  it.each([
    ["null dependencies", { dependencies: null }, "dependencies must be an array"],
    ["primitive dependencies", { dependencies: "bad" }, "dependencies must be an array"],
    ["object dependencies", { dependencies: {} }, "dependencies must be an array"],
    ["null dependency record", { dependencies: [null] }, "dependencies[0] must be a non-null object"],
    ["primitive dependency record", { dependencies: ["bad"] }, "dependencies[0] must be a non-null object"],
    ["partial dependency record", { dependencies: [{ id: 42 }] }, "dependencies[0].id must be a string"],
    ["unknown dependency type", { dependencies: [{ ...validModeAsset().dependencies[0], type: "unknownDependency" }] }, "unknown dependency type"],
    ["non-string target asset", { dependencies: [{ ...validModeAsset().dependencies[0], targetAssetId: 42 }] }, "targetAssetId must be a string"],
    ["malformed relationship context", { dependencies: [{ ...validModeAsset().dependencies[0], relationshipContext: "bad" }] }, "relationshipContext must be a non-null object"]
  ])("evaluateImplementationAssetGraph handles malformed dependencies: %s", (_label, overrides, expected) => {
    const asset = { ...validModeAsset(), ...overrides } as unknown as ImplementationAsset;
    expect(() => evaluateImplementationAssetGraph([asset])).not.toThrow();
    const graph = evaluateImplementationAssetGraph([asset]);
    expect(graph.issues.join(" ")).toContain(expected);
    expect(graph.generationOrder).not.toContain(asset.assetId);
  });

  it.each([
    ["missing assetId", { assetId: undefined }, "assetId must be a string"],
    ["non-string assetId", { assetId: 42 }, "assetId must be a string"],
    ["missing intendedPath", { intendedPath: undefined }, "intendedPath must be a string"],
    ["non-string intendedPath", { intendedPath: 42 }, "intendedPath must be a string"]
  ])("evaluateImplementationAssetGraph handles malformed graph identity: %s", (_label, overrides, expected) => {
    expect(() => evaluateImplementationAssetGraph([{ ...validModeAsset(), ...overrides }])).not.toThrow();
    const graph = evaluateImplementationAssetGraph([{ ...validModeAsset(), ...overrides }]);
    expect(graph.issues.join(" ")).toContain(expected);
    expect(graph.generationOrder).toEqual([]);
  });

  it("evaluateImplementationAssetGraph preserves valid duplicate and circular dependency behavior", () => {
    const base = validModeAsset();
    const first = {
      ...base,
      assetId: "asset-a",
      intendedPath: "07_Development/a.md",
      dependencies: [{ ...base.dependencies[0], id: "dep-a", type: "asset" as const, targetAssetId: "asset-b", targetRecordId: undefined }]
    };
    const second = {
      ...base,
      assetId: "asset-b",
      intendedPath: "07_Development/a.md",
      dependencies: [{ ...base.dependencies[0], id: "dep-b", type: "asset" as const, targetAssetId: "asset-a", targetRecordId: undefined }]
    };
    const graph = evaluateImplementationAssetGraph([first, second, { ...first, assetId: "asset-a-copy", dependencies: [first.dependencies[0], first.dependencies[0]] }]);
    expect(graph.duplicatePaths).toContain("07_Development/a.md");
    expect(graph.duplicateDependencyIssues.join(" ")).toContain("duplicate dependency ID");
    expect(graph.circularDependencyIssues.join(" ")).toContain("Circular dependency detected");
    expect(graph.generationOrder).toEqual([]);
  });

  it("evaluateImplementationAssetDependencies and state derivation handle malformed runtime assets directly", () => {
    const project = createCanvasProject();
    const malformed = [{ ...validModeAsset(), dependencies: null, approvalStatus: "Approved", assetStatus: "Ready for Export" }];
    expect(() => evaluateImplementationAssetDependencies(project, "bad")).not.toThrow();
    expect(() => evaluateImplementationAssetDependencies(project, malformed)).not.toThrow();
    const dependencyEvaluation = evaluateImplementationAssetDependencies(project, malformed);
    expect(dependencyEvaluation.assets[0].assetStatus).toBe("Blocked");
    expect(dependencyEvaluation.dependencyIssues.join(" ")).toContain("dependencies must be an array");
    expect(() => deriveImplementationAssetRegistryState(project, malformed)).not.toThrow();
    const state = deriveImplementationAssetRegistryState(project, malformed);
    expect(state.assets[0].assetStatus).toBe("Blocked");
    expect(state.summary.readyAssetCount).toBe(0);
    expect(state.graph.generationOrder).toEqual([]);
    expect(state.assets[0].approvalStatus).not.toBe("Approved");
  });
});
