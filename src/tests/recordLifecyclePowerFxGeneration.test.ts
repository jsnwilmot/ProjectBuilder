import { describe, expect, it } from "vitest";
import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  normalizeImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import {
  buildCanvasRecordLifecyclePlanningModel,
  CANVAS_RECORD_LIFECYCLE_ASSET_ID,
  CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY,
  CANVAS_RECORD_LIFECYCLE_GENERATION_VERSION,
  CANVAS_RECORD_LIFECYCLE_OPERATION,
  CANVAS_RECORD_LIFECYCLE_PLAN_PATH,
  CANVAS_RECORD_LIFECYCLE_TARGET_ID
} from "../lib/recordLifecyclePlanning";
import {
  generateCanvasRecordLifecyclePowerFx,
  PERMANENT_DELETE_BLOCKER
} from "../lib/recordLifecyclePowerFxGeneration";
import { createProject } from "../lib/createProject";
import {
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import type { CanvasRecordLifecycleTarget, CanvasStateVariableTarget, ProjectRecord } from "../types/project";

const NOW = "2026-07-20T12:00:00.000Z";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function lifecycleTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return {
    id: overrides.id ?? "archive-request",
    action: overrides.action ?? "archive",
    trigger: overrides.trigger ?? "controlOnSelect",
    triggerControlId: overrides.triggerControlId ?? "button-archive",
    screenTargetId: overrides.screenTargetId ?? "screen-request",
    connectorId: overrides.connectorId ?? "connector-sharepoint",
    entityId: overrides.entityId ?? "list-requests",
    recordContextType: overrides.recordContextType ?? "selectedRecord",
    recordContextReferenceId: overrides.recordContextReferenceId ?? "gallery-requests",
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

function restoreTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "restore-request",
    action: "restore",
    triggerControlId: "button-restore",
    sortOrder: 20,
    ...overrides
  });
}

function deleteTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "delete-request",
    action: "delete",
    triggerControlId: "button-delete",
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

function savingState(overrides: Partial<CanvasStateVariableTarget> = {}): CanvasStateVariableTarget {
  return {
    id: overrides.id ?? "state-lifecycle-saving",
    implementationName: overrides.implementationName ?? "varLifecycleSaving",
    purpose: overrides.purpose ?? "Tracks whether a lifecycle mutation is running.",
    stateRole: overrides.stateRole ?? "savingState",
    initialValue: overrides.initialValue ?? { kind: "boolean", value: false },
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function createCanvasProject(targets: CanvasRecordLifecycleTarget[] = [lifecycleTarget()]): ProjectRecord {
  const project = createProject({
    identity: { id: "lifecycle-project", projectName: "Lifecycle Project" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Plan record lifecycle actions.",
      requiredFeatures: "Archive and restore records.",
      workflows: "Manage records.",
      permissionRules: "Users can update request records through approved app roles.",
      targetUsers: "Users",
      userRoles: "User"
    } as any
  });
  const pp = project.powerPlatform!;
  pp.common.authenticationRequirements = "Microsoft Entra ID authentication.";
  pp.common.authorizationRequirements = "Role-based access for request editors.";
  pp.common.recordAccessRules = "Users can access records assigned to their team.";
  pp.common.auditRequirements = "Audit lifecycle actions.";
  pp.common.privacyRequirements = "No sensitive data exposed beyond authorized roles.";
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
      approvalConfirmationStatus: "confirmed",
      connectionOwnershipStatus: "confirmed",
      requiredConnectorPermissions: "Read and update list items.",
      permissionOwner: "SharePoint owner",
      permissionValidationMethod: "Owner confirmation.",
      permissionConfirmationStatus: "confirmed",
      supportedOperations: { read: true, update: true, delete: true, archive: true, restore: true }
    })
  ];
  pp.common.environmentAccessStatus = "confirmed";
  pp.common.securityReviewStatus = "confirmed";
  pp.common.testingPlanConfirmationStatus = "confirmed";
  const canvas = pp.canvas!;
  canvas.primaryDataSourceType = "sharePointList";
  canvas.primaryConnectorId = "connector-sharepoint";
  canvas.selectedDataSourceTypes = ["sharePointList"];
  canvas.sourcePurpose = "Manage request records.";
  canvas.sourceOwnership = "Operations owner.";
  canvas.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
  canvas.sharePointSiteTitle = "Operations";
  canvas.sharePointSiteOwner = "Operations owner";
  canvas.sharePointAccessStatus = "confirmed";
  canvas.schemaStatus = "confirmed";
  canvas.internalNameStatus = "confirmed";
  canvas.screenNamingConvention = "scrName";
  canvas.controlNamingConvention = "prefixName";
  canvas.controlTypePrefixes = "btn for buttons, gal for galleries, frm for forms.";
  canvas.variableNamingConvention = "varName";
  canvas.collectionNamingConvention = "colName";
  canvas.componentNamingConvention = "cmpName";
  canvas.formulaFileNamingConvention = "property.fx";
  canvas.yamlFileNamingConvention = "target.yaml";
  canvas.namingStandardConfirmationStatus = "confirmed";
  canvas.screenTargets = [
    createDefaultCanvasScreenTarget({
      id: "screen-request",
      approvedScreenName: "scrRequest",
      purpose: "Request screen.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.controlTargets = [
    createDefaultCanvasControlTarget({ id: "button-archive", screenId: "screen-request", approvedControlName: "btnArchive", controlType: "button", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "button-restore", screenId: "screen-request", approvedControlName: "btnRestore", controlType: "button", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "button-delete", screenId: "screen-request", approvedControlName: "btnDelete", controlType: "button", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "gallery-requests", screenId: "screen-request", approvedControlName: "galRequests", controlType: "gallery", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "form-request", screenId: "screen-request", approvedControlName: "frmRequest", controlType: "edit form", confirmationStatus: "confirmed", confirmationSource: "Architect" })
  ];
  canvas.stateVariableTargets = [
    savingState(),
    {
      id: "state-selected-record",
      implementationName: "varSelectedRecord",
      purpose: "Selected record.",
      stateRole: "selectedRecord",
      initialValue: { kind: "blank" },
      confirmationStatus: "confirmed",
      required: true,
      sortOrder: 20
    }
  ];
  canvas.sharePointListSchemas = [
    createDefaultSharePointList({
      id: "list-requests",
      displayName: "Requests",
      purpose: "Track requests.",
      expectedRecordCount: "50",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.sharePointColumnSchemas = [
    createDefaultSharePointColumn({ id: "field-status", parentType: "list", parentId: "list-requests", displayName: "Status", internalName: "Status", columnType: "Single line of text", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultSharePointColumn({ id: "field-active", parentType: "list", parentId: "list-requests", displayName: "Active", internalName: "Active", columnType: "Yes/No", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultSharePointColumn({ id: "field-quoted", parentType: "list", parentId: "list-requests", displayName: "Quoted Name", internalName: "Needs-Quoting", columnType: "Single line of text", confirmationStatus: "confirmed", confirmationSource: "Architect" })
  ];
  canvas.recordLifecycleTargets = targets;
  return project;
}

function registryFor(project: ProjectRecord): ImplementationAssetRegistry {
  return buildImplementationAssetRegistry(project, NOW);
}

function approveRegistry(registry: ImplementationAssetRegistry, project: ProjectRecord): ImplementationAssetRegistry {
  return normalizeImplementationAssetRegistry({
    assets: registry.assets.map((asset) => ({
      assetId: asset.assetId,
      approvalStatus: "Approved",
      contentChecksum: asset.contentChecksum,
      generationVersion: asset.generationVersion
    }))
  }, project, NOW);
}

function approvedRegistryFor(project: ProjectRecord): ImplementationAssetRegistry {
  return approveRegistry(registryFor(project), project);
}

function lifecycleAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  const asset = registry.assets.find((item) => item.assetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID);
  if (!asset) throw new Error("Lifecycle planning asset missing");
  return asset;
}

function withValidChecksum(asset: ImplementationAsset): ImplementationAsset {
  return { ...asset, contentChecksum: calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" }) };
}

function withAssetMutation(project: ProjectRecord, mutate: (asset: ImplementationAsset) => ImplementationAsset): ImplementationAssetRegistry {
  const registry = approvedRegistryFor(project);
  const original = lifecycleAsset(registry);
  const replacement = mutate(clone(original));
  return {
    ...registry,
    assets: registry.assets.map((asset) => asset.assetId === original.assetId ? replacement : asset)
  };
}

function generate(project: ProjectRecord = createCanvasProject(), registry: ImplementationAssetRegistry = approvedRegistryFor(project)) {
  return generateCanvasRecordLifecyclePowerFx({ project, registry });
}

function expectGenerated(project?: ProjectRecord, registry?: ImplementationAssetRegistry) {
  const activeProject = project ?? createCanvasProject();
  const result = generate(activeProject, registry ?? approvedRegistryFor(activeProject));
  expect(result.blockingIssues).toEqual([]);
  expect(result.status).toBe("Generated");
  expect(result.orderedFormulaFragments.length).toBeGreaterThan(0);
  expect(result.generatedChecksum).toMatch(/^fnv1a-/);
  expect(result.generatedAsset?.assetStatus).toBe("Review Required");
  expect(result.generatedAsset?.approvalStatus).toBe("Review required");
  return result;
}

function expectBlocked(project: ProjectRecord, registry: unknown = approvedRegistryFor(project)) {
  const result = generateCanvasRecordLifecyclePowerFx({ project, registry });
  expect(result.status).toBe("Blocked");
  expect(result.orderedFormulaFragments).toEqual([]);
  expect(result.generatedAsset).toBeNull();
  expect(result.generatedChecksum).toBe("");
  expect(result.blockingIssues.length).toBeGreaterThan(0);
  return result.blockingIssues.join(" ");
}

function firstFormula(project?: ProjectRecord): string {
  return expectGenerated(project).orderedFormulaFragments[0].formula;
}

describe("Canvas record lifecycle Power Fx generation", () => {
  it("generates valid archive formula with guarded Patch", () => {
    const result = expectGenerated();
    const fragment = result.orderedFormulaFragments[0];

    expect(fragment.action).toBe("archive");
    expect(fragment.triggerControlImplementationName).toBe("btnArchive");
    expect(fragment.recordContextImplementationReference).toBe("galRequests");
    expect(fragment.lifecycleFieldImplementationName).toBe("Status");
    expect(fragment.formula).toContain("!IsBlank(galRequests.Selected)");
    expect(fragment.formula).toContain("galRequests.Selected.Status = \"Active\"");
    expect(fragment.formula).toContain("Patch(Requests, galRequests.Selected, { Status: \"Archived\" })");
  });

  it("generates valid restore formula with reversed lifecycle values", () => {
    const project = createCanvasProject([restoreTarget()]);
    const fragment = expectGenerated(project).orderedFormulaFragments[0];

    expect(fragment.action).toBe("restore");
    expect(fragment.formula).toContain("galRequests.Selected.Status = \"Archived\"");
    expect(fragment.formula).toContain("{ Status: \"Active\" }");
  });

  it("wraps every Patch in IfError", () => {
    const formula = firstFormula();
    expect((formula.match(/IfError\(/g) ?? [])).toHaveLength(1);
    expect(formula.indexOf("IfError(")).toBeLessThan(formula.indexOf("Patch("));
  });

  it("includes a saving-state guard", () => {
    expect(firstFormula()).toContain("!varLifecycleSaving");
  });

  it("sets saving state before mutation", () => {
    const formula = firstFormula();
    expect(formula.indexOf("Set(varLifecycleSaving, true)")).toBeLessThan(formula.indexOf("Patch("));
  });

  it("resets saving state on success", () => {
    const formula = firstFormula();
    expect(formula.indexOf("Set(varLifecycleSaving, false)", formula.indexOf("Patch("))).toBeGreaterThan(formula.indexOf("Patch("));
    expect(formula.indexOf("Record archived successfully.")).toBeGreaterThan(formula.lastIndexOf("Set(varLifecycleSaving, false)"));
  });

  it("resets saving state on failure", () => {
    const formula = firstFormula();
    const failureIndex = formula.indexOf("The record could not be archived. No changes were completed.");
    expect(formula.lastIndexOf("Set(varLifecycleSaving, false)", failureIndex)).toBeGreaterThan(formula.indexOf("Patch("));
  });

  it("uses approved archive success wording", () => {
    expect(firstFormula()).toContain("Record archived successfully.");
  });

  it("uses approved archive failure wording", () => {
    expect(firstFormula()).toContain("The record could not be archived. No changes were completed.");
  });

  it("uses approved restore success wording", () => {
    expect(firstFormula(createCanvasProject([restoreTarget()]))).toContain("Record restored successfully.");
  });

  it("uses approved restore failure wording", () => {
    expect(firstFormula(createCanvasProject([restoreTarget()]))).toContain("The record could not be restored. No changes were completed.");
  });

  it("does not expose raw technical error details", () => {
    expect(firstFormula()).not.toMatch(/FirstError|ErrorInfo|Errors\(|\.Message|\.Details|\.Kind|\.Observed|\.Source/);
  });

  it("blank record context cannot mutate", () => {
    const formula = firstFormula();
    expect(formula.indexOf("!IsBlank(galRequests.Selected)")).toBeLessThan(formula.indexOf("Patch("));
  });

  it("invalid current archive state cannot mutate", () => {
    const formula = firstFormula();
    expect(formula.indexOf("galRequests.Selected.Status = \"Active\"")).toBeLessThan(formula.indexOf("Patch("));
  });

  it("invalid current restore state cannot mutate", () => {
    const formula = firstFormula(createCanvasProject([restoreTarget()]));
    expect(formula.indexOf("galRequests.Selected.Status = \"Archived\"")).toBeLessThan(formula.indexOf("Patch("));
  });

  it("blocks duplicate activation while saving", () => {
    const formula = firstFormula();
    expect(formula.trimStart().startsWith("If(\n  !varLifecycleSaving")).toBe(true);
  });

  it("blocks generation when the saving-state variable is missing", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.stateVariableTargets = project.powerPlatform!.canvas!.stateVariableTargets.filter((variable) => variable.stateRole !== "savingState");

    expect(expectBlocked(project)).toContain("requires exactly one confirmed saving-state variable");
  });

  it("blocks duplicate applicable saving-state variables", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.stateVariableTargets.push(savingState({ id: "state-saving-two", implementationName: "varLifecycleSavingTwo", sortOrder: 30 }));

    expect(expectBlocked(project)).toContain("more than one applicable confirmed saving-state variable");
  });

  it("blocks non-Boolean saving-state initial value", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.stateVariableTargets[0].initialValue = { kind: "text", value: "false" };

    expect(expectBlocked(project)).toContain("initialValue must be Boolean false");
  });

  it("blocks unconfirmed saving-state variable", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.stateVariableTargets[0].confirmationStatus = "reviewNeeded";

    expect(expectBlocked(project)).toContain("not confirmed");
  });

  it("delete plan generates no formula", () => {
    const project = createCanvasProject([deleteTarget()]);
    const result = generate(project);

    expect(result.status).toBe("Blocked");
    expect(result.orderedFormulaFragments).toEqual([]);
  });

  it("delete plan returns the approved blocker", () => {
    expect(expectBlocked(createCanvasProject([deleteTarget()]))).toContain(PERMANENT_DELETE_BLOCKER);
  });

  it("mixed delete and archive input produces zero output", () => {
    const project = createCanvasProject([lifecycleTarget(), deleteTarget()]);
    const result = generate(project);

    expect(result.status).toBe("Blocked");
    expect(result.orderedFormulaFragments).toEqual([]);
    expect(result.blockingIssues).toContain(PERMANENT_DELETE_BLOCKER);
  });

  it("generated source contains no Remove", () => {
    expect(firstFormula()).not.toContain("Remove(");
  });

  it("generated source contains no RemoveIf", () => {
    expect(firstFormula()).not.toContain("RemoveIf(");
  });

  it("quotes confirmed hyphenated entity names safely", () => {
    const project = createCanvasProject();
    project.powerPlatform!.common.connectors[0].dataSourceName = "TTI-SoftwareUsers";

    expect(firstFormula(project)).toContain("Patch('TTI-SoftwareUsers'");
  });

  it("escapes embedded apostrophes in confirmed identifiers", () => {
    const project = createCanvasProject();
    project.powerPlatform!.common.connectors[0].dataSourceName = "Owner's Requests";

    expect(firstFormula(project)).toContain("Patch('Owner''s Requests'");
  });

  it("keeps simple identifiers unquoted", () => {
    const formula = firstFormula();

    expect(formula).toContain("Patch(Requests");
    expect(formula).toContain(".Status =");
    expect(formula).not.toContain("'Status'");
  });

  it("rejects formula-looking identifier input", () => {
    const project = createCanvasProject();
    project.powerPlatform!.common.connectors[0].dataSourceName = "Patch(Users";

    expect(expectBlocked(project)).toContain("formula-looking content");
  });

  it("blocks missing SharePoint internal name", () => {
    const project = createCanvasProject();
    const field = project.powerPlatform!.canvas!.sharePointColumnSchemas.find((column) => column.id === "field-status")!;
    field.internalName = "";

    expect(expectBlocked(project)).toContain("Ready for Export");
  });

  it("does not substitute display name when internal name is missing", () => {
    const project = createCanvasProject();
    const field = project.powerPlatform!.canvas!.sharePointColumnSchemas.find((column) => column.id === "field-status")!;
    field.internalName = "";
    field.displayName = "Display Only Status";
    const result = generate(project);

    expect(result.status).toBe("Blocked");
    expect(JSON.stringify(result)).not.toContain("Display Only Status");
  });

  it("blocks stale planning checksum", () => {
    const project = createCanvasProject();
    const registry = withAssetMutation(project, (asset) => ({ ...asset, contentChecksum: "bad-checksum" }));

    expect(expectBlocked(project, registry)).toContain("checksum");
  });

  it("blocks unapproved planning asset", () => {
    const project = createCanvasProject();
    const registry = withAssetMutation(project, (asset) => ({ ...asset, approvalStatus: "Review required" }));

    expect(expectBlocked(project, registry)).toContain("not approved");
  });

  it("blocks non-Ready-for-Export planning asset", () => {
    const project = createCanvasProject();
    const registry = withAssetMutation(project, (asset) => ({ ...asset, assetStatus: "Draft" }));

    expect(expectBlocked(project, registry)).toContain("Ready for Export");
  });

  it("blocks unresolved dependency", () => {
    const project = createCanvasProject();
    const registry = withAssetMutation(project, (asset) => withValidChecksum({
      ...asset,
      dependencies: asset.dependencies.map((dependency, index) => index === 0 ? { ...dependency, resolved: false, blockingIssue: "Dependency unresolved." } : dependency)
    }));

    expect(expectBlocked(project, registry)).toContain("dependencies");
  });

  it("blocks failed gate", () => {
    const project = createCanvasProject();
    const registry = withAssetMutation(project, (asset) => withValidChecksum({
      ...asset,
      gateEvaluationSnapshot: asset.gateEvaluationSnapshot.map((gate, index) => index === 0 ? { ...gate, status: "failed", passed: false, blockingReason: "Failed test gate." } : gate)
    }));

    expect(expectBlocked(project, registry)).toContain("gate snapshot");
  });

  it("blocks invalid source record", () => {
    const project = createCanvasProject();
    const registry = withAssetMutation(project, (asset) => withValidChecksum({
      ...asset,
      sourceRecordIds: []
    }));

    expect(expectBlocked(project, registry)).toContain("source record");
  });

  it("reordered equivalent structured input remains deterministic", () => {
    const base = createCanvasProject([restoreTarget({ sortOrder: 20 }), lifecycleTarget({ sortOrder: 10 })]);
    const reordered = createCanvasProject([lifecycleTarget({ sortOrder: 10 }), restoreTarget({ sortOrder: 20 })]);

    expect(generate(base).generatedChecksum).toBe(generate(reordered).generatedChecksum);
  });

  it("repeated generation is byte-for-byte equivalent", () => {
    const project = createCanvasProject([lifecycleTarget(), restoreTarget()]);
    const registry = approvedRegistryFor(project);

    expect(generate(project, registry)).toEqual(generate(project, registry));
  });

  it.each([
    ["null context", null],
    ["undefined context", undefined],
    ["primitive context", 42],
    ["array context", []],
    ["empty object", {}],
    ["malformed registry", { project: createCanvasProject(), registry: null }],
    ["primitive asset entry", { project: createCanvasProject(), registry: { assets: [42] } }]
  ])("fails safely for malformed runtime input: %s", (_label, context) => {
    let result: ReturnType<typeof generateCanvasRecordLifecyclePowerFx> | undefined;
    expect(() => {
      result = generateCanvasRecordLifecyclePowerFx(context);
    }).not.toThrow();
    expect(result!.status).toBe("Blocked");
    expect(result!.orderedFormulaFragments).toEqual([]);
  });

  it("contains no TTI-specific hard-coding in generated source unless supplied as confirmed fixture input", () => {
    expect(firstFormula()).not.toMatch(/SoftwareTitles|SoftwareLicences|SoftwareUsers|ORG-4878|ND-DN/);
  });

  it("TTI-like Draft project generates zero formulas", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.internalNameStatus = "missingInformation";
    project.powerPlatform!.canvas!.sharePointColumnSchemas.find((column) => column.id === "field-status")!.internalName = "";
    const result = generateCanvasRecordLifecyclePowerFx({ project, registry: registryFor(project) });
    const planningAsset = lifecycleAsset(registryFor(project));

    expect(result.status).toBe("Blocked");
    expect(result.orderedFormulaFragments).toEqual([]);
    expect(planningAsset.assetStatus).not.toBe("Ready for Export");
    expect(JSON.stringify(result)).not.toContain("SoftwareUsers");
  });

  it("generated asset remains Review Required", () => {
    expect(expectGenerated().generatedAsset?.assetStatus).toBe("Review Required");
  });

  it("generated asset is not automatically Approved or Ready for Export", () => {
    const result = expectGenerated();

    expect(result.generatedAsset?.approvalStatus).toBe("Review required");
    expect(result.generatedAsset?.assetStatus).not.toBe("Ready for Export");
  });

  it("planning asset contains no formula-looking text", () => {
    const asset = lifecycleAsset(registryFor(createCanvasProject()));

    expect(asset.sourceContent).not.toMatch(/\b(?:Patch|IfError|Notify|Set)\s*\(/);
  });

  it("generated formula asset has complete traceability", () => {
    const result = expectGenerated(createCanvasProject([lifecycleTarget(), restoreTarget()]));

    expect(result.generatedAsset?.sourcePlanningAssetId).toBe(CANVAS_RECORD_LIFECYCLE_ASSET_ID);
    expect(result.generatedAsset?.sourcePlanningChecksum).toBe(result.sourcePlanningChecksum);
    expect(result.traceability.lifecycleTargetIds).toEqual(["archive-request", "restore-request"]);
    expect(result.traceability.savingStateVariableIds).toEqual(["state-lifecycle-saving"]);
    expect(result.generatedAsset?.dependencyRecordIds).toEqual(expect.arrayContaining([
      "connector-sharepoint",
      "list-requests",
      "field-status",
      "button-archive",
      "button-restore",
      "state-lifecycle-saving"
    ]));
  });

  it("keeps existing archive and restore planning behaviour outside approved corrections", () => {
    const planning = buildCanvasRecordLifecyclePlanningModel(createCanvasProject([lifecycleTarget(), restoreTarget()]));

    expect(planning.planningStatus).toBe("Planned");
    expect(planning.plans.map((plan) => plan.actionType)).toEqual(["archive", "restore"]);
    expect(planning.plans.map((plan) => plan.triggerProperty)).toEqual([CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY, CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY]);
    expect(planning.plans.every((plan) => plan.savingStateVariableId === "state-lifecycle-saving")).toBe(true);
  });

  it("exposes the canonical lifecycle planning asset contract through the implementation registry", () => {
    const asset = lifecycleAsset(approvedRegistryFor(createCanvasProject()));

    expect(asset.blockingIssues).toEqual([]);
    expect(asset.assetId).toBe(CANVAS_RECORD_LIFECYCLE_ASSET_ID);
    expect(asset.targetId).toBe(CANVAS_RECORD_LIFECYCLE_TARGET_ID);
    expect(asset.generationInputs?.operation).toBe(CANVAS_RECORD_LIFECYCLE_OPERATION);
    expect(asset.generationInputs?.formulaProperty).toBe(CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY);
    expect(asset.generationInputs?.planningGenerationVersion).toBe(CANVAS_RECORD_LIFECYCLE_GENERATION_VERSION);
    expect(asset.intendedPath).toBe(CANVAS_RECORD_LIFECYCLE_PLAN_PATH);
    expect(asset.generationInputs?.recordLifecyclePlans).toHaveLength(1);
    expect(asset.dependencies.some((dependency) => dependency.type === "stateVariable")).toBe(true);
  });
});
