import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import {
  FORM_OPERATION_POWER_FX_GENERATION_VERSION,
  generateFormOperationPowerFxForAsset,
  generateFormOperationPowerFxForRegistry,
  type FormOperationPowerFxGenerationResult
} from "../lib/formOperationPowerFxGeneration";
import {
  CANVAS_FORM_OPERATIONS_ASSET_ID,
  CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY,
  CANVAS_FORM_OPERATIONS_OPERATION,
  CANVAS_FORM_OPERATIONS_TARGET_ID
} from "../lib/formOperationPlanning";
import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  normalizeImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import {
  createApplicabilityDecision,
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import { generateCollectionPowerFxForAsset } from "../lib/collectionPowerFxGeneration";
import { generatePowerFxForAsset } from "../lib/powerFxGeneration";
import { generateStatePowerFxForAsset } from "../lib/statePowerFxGeneration";
import type { CanvasFormOperationTarget, PowerPlatformGateStatus, ProjectRecord } from "../types/project";

const NOW = "2026-07-17T12:00:00.000Z";
const VALID_POWER_PLATFORM_GATE_STATUSES: readonly PowerPlatformGateStatus[] = [
  "notStarted",
  "missingInformation",
  "blocked",
  "reviewNeeded",
  "confirmed",
  "ready",
  "inProgress",
  "manualValidationRequired",
  "passed",
  "failed",
  "notApplicable"
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

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
    identity: { id: "form-submit-generation", projectName: "Form Submit Generation" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Generate submit form fragments.",
      requiredFeatures: "Create and edit records.",
      workflows: "Submit request form.",
      outOfScope: "Deployment.",
      successCriteria: "Fragments are reviewed.",
      accessibilityNotes: "Keyboard and labels are required.",
      permissionRules: "Least privilege list permissions.",
      screens: "Request form.",
      acceptanceNotes: "SubmitForm fragment is planned.",
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

function registryFor(project: ProjectRecord, generatedAt = NOW): ImplementationAssetRegistry {
  return buildImplementationAssetRegistry(project, generatedAt);
}

function approveRegistry(registry: ImplementationAssetRegistry, project: ProjectRecord, generatedAt = NOW): ImplementationAssetRegistry {
  return normalizeImplementationAssetRegistry({
    assets: registry.assets.map((asset) => ({
      assetId: asset.assetId,
      approvalStatus: "Approved",
      contentChecksum: asset.contentChecksum,
      generationVersion: asset.generationVersion
    }))
  }, project, generatedAt);
}

function approvedRegistryFor(project: ProjectRecord, generatedAt = NOW): ImplementationAssetRegistry {
  return approveRegistry(registryFor(project, generatedAt), project, generatedAt);
}

function formAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  const asset = registry.assets.find((item) => item.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID);
  if (!asset) throw new Error("Form-operation planning asset missing");
  return asset;
}

function withValidChecksum(asset: ImplementationAsset): ImplementationAsset {
  return { ...asset, contentChecksum: calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" }) };
}

function replaceAsset(registry: ImplementationAssetRegistry, replacement: ImplementationAsset): ImplementationAssetRegistry {
  return {
    ...registry,
    assets: registry.assets.map((asset) => asset.assetId === replacement.assetId ? replacement : asset)
  };
}

function validUnrelatedAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  return withValidChecksum({
    ...clone(formAsset(registry)),
    assetId: "asset-unrelated-form-submit-generation",
    targetId: "unrelated-target",
    targetDisplayName: "Unrelated form submit generation asset",
    intendedPath: "07_Development/PowerFx/unrelated/UNRELATED.md"
  });
}

function registryWithUnrelatedAsset(project: ProjectRecord, mutate: (asset: ImplementationAsset) => ImplementationAsset): ImplementationAssetRegistry {
  const registry = approvedRegistryFor(project);
  return { ...registry, assets: [...registry.assets, withValidChecksum(mutate(validUnrelatedAsset(registry)))] };
}

function generated(project = createFormProject()): FormOperationPowerFxGenerationResult {
  return generateFormOperationPowerFxForAsset({ project, registry: approvedRegistryFor(project) });
}

function blockedAfterAssetMutation(mutator: (asset: ImplementationAsset) => ImplementationAsset, project = createFormProject()): FormOperationPowerFxGenerationResult {
  const registry = approvedRegistryFor(project);
  const mutated = withValidChecksum(mutator(clone(formAsset(registry))));
  return generateFormOperationPowerFxForAsset({ project, registry: replaceAsset(registry, mutated) });
}

function expectBlocked(result: FormOperationPowerFxGenerationResult): void {
  expect(result.status).toBe("Blocked");
  expect(result.fragments).toEqual([]);
  expect(result.generatedChecksum).toBe("");
  expect(result.blockingIssues.length).toBeGreaterThan(0);
}

function expectNoForbiddenFormula(formula: string): void {
  [
    "NewForm(",
    "EditForm(",
    "ResetForm(",
    "ViewForm(",
    "Patch(",
    "Defaults(",
    "Navigate(",
    "Notify(",
    "IfError(",
    "Errors(",
    "Refresh(",
    "Set(",
    "UpdateContext(",
    "Remove(",
    "RemoveIf(",
    "ClearCollect(",
    "Collect(",
    "Clear(",
    "Filter(",
    "Search(",
    "Sort(",
    "LookUp("
  ].forEach((token) => expect(formula).not.toContain(token));
}

describe("form-operation SubmitForm Power Fx generation", () => {
  it.each([
    ["create", target(), "btnSubmitCreate"],
    ["edit", target({ id: "form-op-edit-request", operation: "edit", submitControlId: "button-submit-edit" }), "btnSubmitEdit"]
  ] as const)("generates one controlled fragment for one approved %s target", (_label, formTarget, submitName) => {
    const result = generated(createFormProject([formTarget]));
    expect(result.status).toBe("Generated");
    expect(result.fragments).toHaveLength(1);
    expect(result.fragments[0]).toMatchObject({
      targetId: formTarget.id,
      operation: formTarget.operation,
      screenId: "screen-request",
      formControlId: "form-request",
      submitControlId: formTarget.submitControlId,
      sourceConnectorId: "connector-sharepoint",
      sourceEntityId: "list-requests",
      requiredFieldIds: ["field-title"],
      formulaProperty: "OnSelect",
      formula: "SubmitForm(frmRequest)\n",
      sourcePlanningAssetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
      generationVersion: FORM_OPERATION_POWER_FX_GENERATION_VERSION
    });
    expect(result.fragments[0].intendedFragmentPath).toBe(`07_Development/PowerFx/screen-request/${formTarget.submitControlId}/OnSelect.form-operation.fx`);
    expect(result.fragments[0].formula).not.toContain(submitName);
  });

  it("generates one ordered fragment per target and preserves create/edit traceability", () => {
    const project = createFormProject([
      target({ id: "z-edit", operation: "edit", submitControlId: "button-submit-edit", sortOrder: 20 }),
      target({ id: "a-create", operation: "create", submitControlId: "button-submit-create", sortOrder: 10 })
    ]);
    const result = generated(project);
    expect(result.status).toBe("Generated");
    expect(result.fragments.map((fragment) => fragment.targetId)).toEqual(["a-create", "z-edit"]);
    expect(result.fragments.map((fragment) => fragment.operation)).toEqual(["create", "edit"]);
    expect(result.fragments.map((fragment) => fragment.formula)).toEqual(["SubmitForm(frmRequest)\n", "SubmitForm(frmRequest)\n"]);
    expect(result.traceability.orderedTargetIds).toEqual(["a-create", "z-edit"]);
  });

  it("uses the canonical source planning asset metadata", () => {
    const result = generated();
    expect(result.assetId).toBe(CANVAS_FORM_OPERATIONS_ASSET_ID);
    expect(result.targetId).toBe(CANVAS_FORM_OPERATIONS_TARGET_ID);
    expect(result.operation).toBe(CANVAS_FORM_OPERATIONS_OPERATION);
    expect(result.propertyName).toBe(CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY);
    expect(result.sourceChecksum).toBe(result.fragments[0].approvedPlanningChecksum);
  });

  it("formats the formula as exactly one SubmitForm statement", () => {
    const formula = generated().fragments[0].formula;
    expect(formula).toBe("SubmitForm(frmRequest)\n");
    expect(formula.endsWith("\n")).toBe(true);
    expect(formula.endsWith("\n\n")).toBe(false);
    expect(formula).not.toContain(";");
    expect(formula).not.toContain("```");
    expect(formula).not.toContain("#");
    expect(formula).not.toContain("//");
    expect(formula).not.toContain("[MISSING");
    expect(formula).not.toContain("form-op-create-request");
    expect(formula).not.toContain("connector-sharepoint");
    expect(formula).not.toContain("list-requests");
    expectNoForbiddenFormula(formula);
  });

  it("returns Not Applicable when there are no targets and no stale source asset", () => {
    const project = createFormProject([]);
    const result = generateFormOperationPowerFxForAsset({ project, registry: registryFor(project) });
    expect(result.status).toBe("Not Applicable");
    expect(generateFormOperationPowerFxForRegistry(project, registryFor(project))).toEqual([]);
  });

  it("handles missing legacy formOperationTargets without throwing", () => {
    const project = createFormProject([]);
    delete (project.powerPlatform!.canvas as any).formOperationTargets;
    const result = generateFormOperationPowerFxForAsset({ project, registry: registryFor(project) });
    expect(result.status).toBe("Not Applicable");
    expect(result.fragments).toEqual([]);
    expect(result.generatedChecksum).toBe("");
  });

  it("blocks missing legacy or empty targets when a stale source asset remains", () => {
    const missingProject = createFormProject();
    const missingStaleRegistry = approvedRegistryFor(missingProject);
    delete (missingProject.powerPlatform!.canvas as any).formOperationTargets;
    expectBlocked(generateFormOperationPowerFxForAsset({ project: missingProject, registry: missingStaleRegistry }));

    const emptyProject = createFormProject();
    const emptyStaleRegistry = approvedRegistryFor(emptyProject);
    emptyProject.powerPlatform!.canvas!.formOperationTargets = [];
    expectBlocked(generateFormOperationPowerFxForAsset({ project: emptyProject, registry: emptyStaleRegistry }));
  });

  it.each([
    ["null", null],
    ["primitive", 42],
    ["object", { id: "legacy-target" }]
  ])("blocks malformed %s current target storage safely", (_label, value) => {
    const project = createFormProject([]);
    const registry = registryFor(project);
    (project.powerPlatform!.canvas as any).formOperationTargets = value;
    const result = generateFormOperationPowerFxForAsset({ project, registry });
    expectBlocked(result);
    expect(result.blockingIssues.join(" ")).toContain("formOperationTargets must be an array");
  });

  it("blocks when targets were removed but a stale source asset remains", () => {
    const project = createFormProject();
    const staleRegistry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.formOperationTargets = [];
    expectBlocked(generateFormOperationPowerFxForAsset({ project, registry: staleRegistry }));
  });

  it("blocks missing or duplicate source assets", () => {
    const project = createFormProject();
    const registry = approvedRegistryFor(project);
    expectBlocked(generateFormOperationPowerFxForAsset({ project, registry: { ...registry, assets: registry.assets.filter((asset) => asset.assetId !== CANVAS_FORM_OPERATIONS_ASSET_ID) } }));
    expectBlocked(generateFormOperationPowerFxForAsset({ project, registry: { ...registry, assets: [...registry.assets, formAsset(registry)] } }));
  });

  it.each([
    ["wrong project ID", (asset: ImplementationAsset) => ({ ...asset, projectId: "other-project" })],
    ["wrong platform", (asset: ImplementationAsset) => ({ ...asset, platform: "Power Apps model-driven" as const })],
    ["wrong category", (asset: ImplementationAsset) => ({ ...asset, assetCategory: "Canvas YAML" as const })],
    ["wrong asset type", (asset: ImplementationAsset) => ({ ...asset, assetType: "canvasYamlPlan" as const })],
    ["wrong target ID", (asset: ImplementationAsset) => ({ ...asset, targetId: "other-target" })],
    ["wrong operation", (asset: ImplementationAsset) => ({ ...asset, generationInputs: { ...asset.generationInputs, operation: "otherOperation" } })],
    ["wrong approved property", (asset: ImplementationAsset) => ({ ...asset, approvedPropertyName: "OnSuccess" })],
    ["wrong planning path", (asset: ImplementationAsset) => ({ ...asset, intendedPath: "07_Development/PowerFx/forms/OTHER.md" })],
    ["wrong generation version", (asset: ImplementationAsset) => ({ ...asset, generationVersion: "old-version" })],
    ["removed required gates", (asset: ImplementationAsset) => ({ ...asset, requiredGateIds: [] })],
    ["replaced required gates", (asset: ImplementationAsset) => ({ ...asset, requiredGateIds: ["schema" as any] })],
    ["stale dependencies", (asset: ImplementationAsset) => ({ ...asset, dependencies: [] })],
    ["stale structured inputs", (asset: ImplementationAsset) => ({ ...asset, generationInputs: { ...asset.generationInputs, formOperationTargets: [] } })]
  ])("blocks when source planning asset has %s", (_label, mutate) => {
    expectBlocked(blockedAfterAssetMutation(mutate));
  });

  it.each([
    "Blocked",
    "Draft",
    "Review Required",
    "Not Applicable",
    "Exported"
  ] as const)("blocks stored %s source status independently", (assetStatus) => {
    expectBlocked(blockedAfterAssetMutation((asset) => ({ ...asset, assetStatus })));
  });

  it("blocks missing approval, stale approval checksum, and malformed status", () => {
    expectBlocked(blockedAfterAssetMutation((asset) => ({ ...asset, approvalStatus: "Review required" })));
    expectBlocked(generateFormOperationPowerFxForAsset({
      project: createFormProject(),
      registry: replaceAsset(approvedRegistryFor(createFormProject()), { ...formAsset(approvedRegistryFor(createFormProject())), contentChecksum: "stale" })
    }));
    expectBlocked(blockedAfterAssetMutation((asset) => ({ ...asset, assetStatus: "Unknown" as any })));
  });

  it.each([
    ["current gate failure", (project: ProjectRecord) => { project.powerPlatform!.canvas!.screenTargets[0].confirmationStatus = "reviewNeeded"; }],
    ["screen implementation change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.screenTargets[0].approvedScreenName = "scrChanged"; }],
    ["form-control change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].formControlId = "missing-form"; }],
    ["submit-control change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].submitControlId = "button-submit-edit"; }],
    ["connector change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].sourceConnectorId = "missing-connector"; }],
    ["entity change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].sourceEntityId = "missing-entity"; }],
    ["field change", (project: ProjectRecord) => { project.powerPlatform!.canvas!.formOperationTargets[0].requiredFieldIds = ["field-title", "field-optional"]; }],
    ["form moved", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].screenId = "other-screen"; }],
    ["form display type", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].controlType = "display form"; }],
    ["submit icon type", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[1].controlType = "icon"; }],
    ["invalid form identifier", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "frm Request"; }],
    ["formula-looking form identifier", (project: ProjectRecord) => { project.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "SubmitForm(frmRequest)"; }]
  ])("blocks after approval when %s makes the current project stale", (_label, mutate) => {
    const project = createFormProject();
    const registry = approvedRegistryFor(project);
    mutate(project);
    expectBlocked(generateFormOperationPowerFxForAsset({ project, registry }));
  });

  it.each([
    ["duplicate fragment paths", (asset: ImplementationAsset) => ({
      ...asset,
      generationInputs: {
        ...asset.generationInputs,
        formOperationTargets: [
          ...asset.generationInputs!.formOperationTargets!,
          { ...asset.generationInputs!.formOperationTargets![0], id: "duplicate-target" }
        ]
      }
    })],
    ["unsafe fragment path", (asset: ImplementationAsset) => ({
      ...asset,
      generationInputs: {
        ...asset.generationInputs,
        formOperationTargets: asset.generationInputs!.formOperationTargets!.map((input) => ({ ...input, intendedFragmentPath: "unsafe.fx" }))
      }
    })],
    ["parent traversal path", (asset: ImplementationAsset) => ({
      ...asset,
      generationInputs: {
        ...asset.generationInputs,
        formOperationTargets: asset.generationInputs!.formOperationTargets!.map((input) => ({ ...input, intendedFragmentPath: "07_Development/PowerFx/../OnSelect.form-operation.fx" }))
      }
    })],
    ["backslash path", (asset: ImplementationAsset) => ({
      ...asset,
      generationInputs: {
        ...asset.generationInputs,
        formOperationTargets: asset.generationInputs!.formOperationTargets!.map((input) => ({ ...input, intendedFragmentPath: "07_Development\\PowerFx\\screen\\button\\OnSelect.form-operation.fx" }))
      }
    })],
    ["absolute path", (asset: ImplementationAsset) => ({
      ...asset,
      generationInputs: {
        ...asset.generationInputs,
        formOperationTargets: asset.generationInputs!.formOperationTargets!.map((input) => ({ ...input, intendedFragmentPath: "C:/temp/OnSelect.form-operation.fx" }))
      }
    })]
  ])("blocks %s in structured paths", (_label, mutate) => {
    expectBlocked(blockedAfterAssetMutation(mutate));
  });

  it("binds checksums to target order, form names, paths, operations, and required fields while ignoring timestamps", () => {
    const ordered = generated(createFormProject([
      target({ id: "a-create", submitControlId: "button-submit-create", sortOrder: 10 }),
      target({ id: "z-edit", operation: "edit", submitControlId: "button-submit-edit", sortOrder: 20 })
    ]));
    const reordered = generated(createFormProject([
      target({ id: "a-create", submitControlId: "button-submit-create", sortOrder: 30 }),
      target({ id: "z-edit", operation: "edit", submitControlId: "button-submit-edit", sortOrder: 20 })
    ]));
    expect(ordered.generatedChecksum).not.toBe(reordered.generatedChecksum);

    const renamed = createFormProject();
    renamed.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "frmRenamed";
    expect(generated().fragments[0].formulaChecksum).not.toBe(generated(renamed).fragments[0].formulaChecksum);

    const edit = generated(createFormProject([target({ operation: "edit", submitControlId: "button-submit-edit" })]));
    expect(generated().fragments[0].formulaChecksum).not.toBe(edit.fragments[0].formulaChecksum);

    const extraField = generated(createFormProject([target({ requiredFieldIds: ["field-title", "field-optional"] })]));
    expect(generated().fragments[0].formulaChecksum).not.toBe(extraField.fragments[0].formulaChecksum);

    const pathChanged = blockedAfterAssetMutation((asset) => ({
      ...asset,
      generationInputs: {
        ...asset.generationInputs,
        formOperationTargets: asset.generationInputs!.formOperationTargets!.map((input) => ({ ...input, intendedFragmentPath: "07_Development/PowerFx/screen-request/button-submit-create/Changed.form-operation.fx" }))
      }
    }));
    expectBlocked(pathChanged);

    const project = createFormProject();
    expect(generateFormOperationPowerFxForAsset({ project, registry: approvedRegistryFor(project, "2026-07-17T00:00:00.000Z") }).generatedChecksum)
      .toBe(generateFormOperationPowerFxForAsset({ project, registry: approvedRegistryFor(project, "2026-07-17T01:00:00.000Z") }).generatedChecksum);
  });

  it("preserves full structured traceability outside executable formulas", () => {
    const result = generated();
    expect(result.traceability).toMatchObject({
      projectId: "form-submit-generation",
      approvedPlanningAssetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
      orderedTargetIds: ["form-op-create-request"],
      screenIds: ["screen-request"],
      formControlIds: ["form-request"],
      submitControlIds: ["button-submit-create"],
      connectorIds: ["connector-sharepoint"],
      entityIds: ["list-requests"],
      fieldIds: ["field-title"]
    });
    expect(result.traceability.approvedPlanningChecksum).toBe(result.sourceChecksum);
    expect(result.fragments[0].formula).not.toContain("screen-request");
    expect(result.fragments[0].formula).not.toContain("button-submit-create");
    expect(result.fragments[0].formula).not.toContain("field-title");
  });

  it("continues to generate from the unchanged approved registry", () => {
    const result = generated();
    expect(result.status).toBe("Generated");
    expect(result.fragments).toHaveLength(1);
    expect(result.fragments[0].formula).toBe("SubmitForm(frmRequest)\n");
    expect(result.generatedChecksum).not.toBe("");
  });

  it("blocks malformed registries safely before applicability", () => {
    const project = createFormProject([]);
    expectBlocked(generateFormOperationPowerFxForAsset({ project, registry: null }));
    expectBlocked(generateFormOperationPowerFxForAsset({ project, registry: 42 }));
    expectBlocked(generateFormOperationPowerFxForAsset({ project, registry: { projectId: project.identity.id } }));
    expectBlocked(generateFormOperationPowerFxForAsset({ project, registry: { ...registryFor(project), assets: [42] } }));
    expectBlocked(generateFormOperationPowerFxForAsset({ project, registry: { ...registryFor(project), assets: [{ ...formAsset(registryFor(createFormProject())), generationInputs: { formOperationTargets: [42] } }] } }));
  });

  it.each([
    ["approval status", (asset: ImplementationAsset) => ({ ...asset, approvalStatus: "Unknown" as any })],
    ["applicability status", (asset: ImplementationAsset) => ({ ...asset, applicabilityStatus: "unknown" as any })],
    ["platform", (asset: ImplementationAsset) => ({ ...asset, platform: "Unknown platform" as any })],
    ["asset category", (asset: ImplementationAsset) => ({ ...asset, assetCategory: "Unknown category" as any })],
    ["asset type", (asset: ImplementationAsset) => ({ ...asset, assetType: "unknownType" as any })],
    ["asset status", (asset: ImplementationAsset) => ({ ...asset, assetStatus: "Unknown" as any })],
    ["required gate ID", (asset: ImplementationAsset) => ({ ...asset, requiredGateIds: ["unknownGate" as any] })],
    ["gate snapshot ID", (asset: ImplementationAsset) => ({ ...asset, gateEvaluationSnapshot: [{ ...asset.gateEvaluationSnapshot[0], gateId: "unknownGate" as any }] })],
    ["gate snapshot status", (asset: ImplementationAsset) => ({ ...asset, gateEvaluationSnapshot: [{ ...asset.gateEvaluationSnapshot[0], status: "unknownStatus" as any }] })],
    ["dependency type", (asset: ImplementationAsset) => ({ ...asset, dependencies: [{ ...asset.dependencies[0], type: "unknownDependency" as any }] })],
    ["nested operation", (asset: ImplementationAsset) => ({ ...asset, generationInputs: { ...asset.generationInputs, formOperationTargets: asset.generationInputs!.formOperationTargets!.map((input) => ({ ...input, operation: "delete" as any })) } })],
    ["nested submission trigger", (asset: ImplementationAsset) => ({ ...asset, generationInputs: { ...asset.generationInputs, formOperationTargets: asset.generationInputs!.formOperationTargets!.map((input) => ({ ...input, submissionTrigger: "manual" as any })) } })],
    ["nested formula property", (asset: ImplementationAsset) => ({ ...asset, generationInputs: { ...asset.generationInputs, formOperationTargets: asset.generationInputs!.formOperationTargets!.map((input) => ({ ...input, formulaProperty: "OnSuccess" as any })) } })],
    ["nested confirmation status", (asset: ImplementationAsset) => ({ ...asset, generationInputs: { ...asset.generationInputs, formOperationTargets: asset.generationInputs!.formOperationTargets!.map((input) => ({ ...input, confirmationStatus: "unknown" })) } })]
  ])("blocks unknown or malformed semantic %s on unrelated registry assets", (_label, mutate) => {
    const project = createFormProject([]);
    const result = generateFormOperationPowerFxForAsset({ project, registry: registryWithUnrelatedAsset(createFormProject(), mutate) });
    expectBlocked(result);
  });

  it.each(VALID_POWER_PLATFORM_GATE_STATUSES)("accepts valid Power Platform gate status %s on unrelated registry assets", (status) => {
    const project = createFormProject();
    const result = generateFormOperationPowerFxForAsset({
      project,
      registry: registryWithUnrelatedAsset(project, (asset) => ({
        ...asset,
        gateEvaluationSnapshot: [{ ...asset.gateEvaluationSnapshot[0], status, passed: false }]
      }))
    });

    expect(result.status).toBe("Generated");
    expect(result.fragments).toHaveLength(1);
    expect(result.blockingIssues).toEqual([]);
  });

  it.each(["unknownStatus", "pending", "validating", "manuallyApproved"] as const)("blocks unknown gate status %s without throwing", (status) => {
    const project = createFormProject();
    const result = generateFormOperationPowerFxForAsset({
      project,
      registry: registryWithUnrelatedAsset(project, (asset) => ({
        ...asset,
        gateEvaluationSnapshot: [{ ...asset.gateEvaluationSnapshot[0], status: status as any }]
      }))
    });

    expectBlocked(result);
    expect(result.blockingIssues.join(" ")).toContain(`unknown status ${status}`);
  });

  it("does not mutate project, registry, assets, or nested target arrays", () => {
    const project = createFormProject();
    const registry = approvedRegistryFor(project);
    const beforeProject = clone(project);
    const beforeRegistry = clone(registry);
    generateFormOperationPowerFxForAsset({ project, registry });
    expect(project).toEqual(beforeProject);
    expect(registry).toEqual(beforeRegistry);
  });

  it("does not write .fx files or introduce unrelated phase behavior", () => {
    const result = generated();
    expect(result.fragments[0].intendedFragmentPath.endsWith(".fx")).toBe(true);
    expect(result.fragments[0].formula).toBe("SubmitForm(frmRequest)\n");
    expectNoForbiddenFormula(result.fragments[0].formula);
    expect(JSON.stringify(result)).not.toContain("Phase 5B.3D");
    expect(JSON.stringify(result)).not.toContain("Phase 5B.4");
  });

  it("keeps earlier generation modules outside the form-operation generation boundary", () => {
    const project = createFormProject();
    const registry = approvedRegistryFor(project);
    expect(generatePowerFxForAsset({ project, registry, assetId: CANVAS_FORM_OPERATIONS_ASSET_ID }).status).toBe("Blocked");
    expect(generateCollectionPowerFxForAsset({ project, registry }).status).not.toBe("Generated");
    expect(generateStatePowerFxForAsset({ project, registry }).status).not.toBe("Generated");
  });
});
