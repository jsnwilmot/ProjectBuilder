import { createProject } from "../lib/createProject";
import {
  buildImplementationAssetRegistry,
  createImplementationAssetManifest,
  deriveImplementationAssetRegistryState,
  normalizeImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import {
  createDefaultPowerPlatformData,
  normalizePowerPlatformData
} from "../lib/powerPlatform";
import {
  CANVAS_STATE_INITIALIZATION_ASSET_ID,
  canvasStateVariableGenerationInputs,
  normalizeCanvasStateVariableTargets,
  orderCanvasStateVariables,
  validateCanvasStateVariables
} from "../lib/stateInitialization";
import { generatePowerFxForAsset } from "../lib/powerFxGeneration";
import type { CanvasStateInitialValue, CanvasStateVariableTarget, ProjectRecord } from "../types/project";

function stateVariable(overrides: Partial<CanvasStateVariableTarget> = {}): CanvasStateVariableTarget {
  return {
    id: overrides.id ?? "state-var-selected-record",
    implementationName: overrides.implementationName ?? "varSelectedRecordId",
    purpose: overrides.purpose ?? "Track the selected record ID.",
    initialValue: overrides.initialValue ?? { kind: "blank" },
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function createStateProject(variables: CanvasStateVariableTarget[] = [stateVariable()]): ProjectRecord {
  const project = createProject({
    identity: { id: "state-init", projectName: "State Init" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Initialize scalar app state.",
      requiredFeatures: "Track local state.",
      workflows: "Open app.",
      outOfScope: "Deployment.",
      successCriteria: "State plan is approved.",
      accessibilityNotes: "Accessible behavior is required.",
      permissionRules: "Least privilege.",
      screens: "Home",
      acceptanceNotes: "State variables are reviewed.",
      targetUsers: "Users",
      userRoles: "User"
    } as any
  });
  const canvas = project.powerPlatform!.canvas!;
  canvas.screenNamingConvention = "scrName";
  canvas.controlNamingConvention = "prefixName";
  canvas.controlTypePrefixes = "btn for buttons";
  canvas.variableNamingConvention = "varName";
  canvas.collectionNamingConvention = "colName";
  canvas.componentNamingConvention = "cmpName";
  canvas.formulaFileNamingConvention = "property.fx";
  canvas.yamlFileNamingConvention = "target.yaml";
  canvas.namingStandardConfirmationStatus = "confirmed";
  canvas.stateVariableTargets = variables;
  return project;
}

function stateAsset(registry: ImplementationAssetRegistry): ImplementationAsset | undefined {
  return registry.assets.find((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID);
}

function registryFor(project: ProjectRecord): ImplementationAssetRegistry {
  return buildImplementationAssetRegistry(project, "2026-07-16T12:00:00.000Z");
}

function approveRegistry(registry: ImplementationAssetRegistry, project: ProjectRecord): ImplementationAssetRegistry {
  return normalizeImplementationAssetRegistry({
    assets: registry.assets.map((asset) => ({
      assetId: asset.assetId,
      approvalStatus: "Approved",
      contentChecksum: asset.contentChecksum,
      generationVersion: asset.generationVersion
    }))
  }, project, "2026-07-16T12:00:00.000Z");
}

function checksumFor(variables: CanvasStateVariableTarget[]): string {
  return stateAsset(registryFor(createStateProject(variables)))!.contentChecksum;
}

function installAsset(registry: ImplementationAssetRegistry): ImplementationAsset | undefined {
  return registry.assets.find((asset) => asset.assetType === "installationGuide");
}

function changedInitialValueProject(value = "Changed"): { project: ProjectRecord; approved: ImplementationAssetRegistry } {
  const project = createStateProject();
  const approved = approveRegistry(registryFor(project), project);
  project.powerPlatform!.canvas!.stateVariableTargets[0].initialValue = { kind: "text", value };
  return { project, approved };
}

describe("state initialization planning", () => {
  it("defaults new Canvas projects to an empty state-variable list", () => {
    expect(createDefaultPowerPlatformData("powerAppsCanvas")!.canvas!.stateVariableTargets).toEqual([]);
  });

  it("normalizes legacy projects missing the state-variable list safely", () => {
    const data = createDefaultPowerPlatformData("powerAppsCanvas")!;
    const normalized = normalizePowerPlatformData(({ ...data, canvas: { ...data.canvas! } }), "powerAppsCanvas")!;

    expect(normalized.canvas!.stateVariableTargets).toEqual([]);
  });

  it("does not throw on malformed state-variable input", () => {
    expect(() => normalizeCanvasStateVariableTargets([null, "bad", { id: "x", initialValue: { kind: "formula", value: "Set(x,true)" } }])).not.toThrow();
  });

  it("normalizes a valid blank initial value", () => {
    expect(normalizeCanvasStateVariableTargets([{ id: "blank", implementationName: "varBlank", initialValue: { kind: "blank" } }])[0].initialValue).toEqual({ kind: "blank" });
  });

  it("normalizes a valid Boolean initial value", () => {
    expect(normalizeCanvasStateVariableTargets([{ id: "bool", implementationName: "varBool", initialValue: { kind: "boolean", value: true } }])[0].initialValue).toEqual({ kind: "boolean", value: true });
  });

  it("normalizes a valid finite number initial value", () => {
    expect(normalizeCanvasStateVariableTargets([{ id: "num", implementationName: "varNum", initialValue: { kind: "number", value: 42 } }])[0].initialValue).toEqual({ kind: "number", value: 42 });
  });

  it("normalizes a valid text initial value", () => {
    expect(normalizeCanvasStateVariableTargets([{ id: "text", implementationName: "varText", initialValue: { kind: "text", value: "Line 1\r\nLine 2" } }])[0].initialValue).toEqual({ kind: "text", value: "Line 1\nLine 2" });
  });

  it("removes unknown value kinds", () => {
    expect(normalizeCanvasStateVariableTargets([{ id: "bad", implementationName: "varBad", initialValue: { kind: "formula", value: "Set(x,true)" } }])).toEqual([]);
  });

  it("rejects NaN number values", () => {
    expect(normalizeCanvasStateVariableTargets([{ id: "nan", implementationName: "varNan", initialValue: { kind: "number", value: Number.NaN } }])).toEqual([]);
  });

  it("rejects infinite number values", () => {
    expect(normalizeCanvasStateVariableTargets([{ id: "inf", implementationName: "varInf", initialValue: { kind: "number", value: Infinity } }])).toEqual([]);
  });

  it("blocks invalid implementation names", () => {
    expect(stateAsset(registryFor(createStateProject([stateVariable({ implementationName: "bad name" })])))?.blockingIssues).toContain("State variable state-var-selected-record implementation name bad name is not a simple Power Fx identifier.");
  });

  it("blocks duplicate IDs", () => {
    expect(stateAsset(registryFor(createStateProject([stateVariable({ id: "dup", implementationName: "varOne" }), stateVariable({ id: "dup", implementationName: "varTwo" })])))?.blockingIssues).toContain("Duplicate state variable target ID: dup.");
  });

  it("blocks duplicate names", () => {
    expect(stateAsset(registryFor(createStateProject([stateVariable({ id: "one", implementationName: "varDup" }), stateVariable({ id: "two", implementationName: "varDup" })])))?.blockingIssues).toContain("Duplicate state variable implementation name: varDup.");
  });

  it("blocks case-insensitive duplicate names", () => {
    expect(stateAsset(registryFor(createStateProject([stateVariable({ id: "one", implementationName: "varDup" }), stateVariable({ id: "two", implementationName: "VARDUP" })])))?.blockingIssues).toContain("Duplicate state variable implementation name: VARDUP.");
  });

  it("uses deterministic ordering by sort order and stable ID", () => {
    const ordered = orderCanvasStateVariables([
      stateVariable({ id: "b", implementationName: "varB", sortOrder: 2 }),
      stateVariable({ id: "a", implementationName: "varA", sortOrder: 2 }),
      stateVariable({ id: "c", implementationName: "varC", sortOrder: 1 })
    ]);

    expect(ordered.map((variable) => variable.id)).toEqual(["c", "a", "b"]);
  });

  it("uses absent asset as the documented Not Applicable behavior when there are no variables", () => {
    expect(stateAsset(registryFor(createStateProject([])))).toBeUndefined();
  });

  it("creates one App OnStart planning asset for one confirmed variable", () => {
    expect(stateAsset(registryFor(createStateProject([stateVariable()])))?.intendedPath).toBe("07_Development/PowerFx/app/OnStart.fx");
  });

  it("creates one combined planning asset for multiple variables", () => {
    const registry = registryFor(createStateProject([
      stateVariable({ id: "one", implementationName: "varOne" }),
      stateVariable({ id: "two", implementationName: "varTwo", initialValue: { kind: "boolean", value: false } })
    ]));

    expect(registry.assets.filter((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID)).toHaveLength(1);
    expect(stateAsset(registry)?.generationInputs?.stateVariables).toHaveLength(2);
  });

  it("stores structured variable inputs in the planning asset", () => {
    expect(stateAsset(registryFor(createStateProject([stateVariable({ initialValue: { kind: "text", value: "Ready" } })])))?.generationInputs?.stateVariables?.[0]).toMatchObject({
      id: "state-var-selected-record",
      implementationName: "varSelectedRecordId",
      initialValue: { kind: "text", value: "Ready" },
      required: true,
      confirmationStatus: "confirmed",
      sortOrder: 10
    });
  });

  it("contains no executable Set statement", () => {
    expect(stateAsset(registryFor(createStateProject()))?.sourceContent).not.toMatch(/\bSet\s*\(/);
  });

  it("contains no ClearCollect statement", () => {
    expect(stateAsset(registryFor(createStateProject()))?.sourceContent).not.toMatch(/\bClearCollect\s*\(/);
  });

  it("blocks required unconfirmed variables", () => {
    expect(stateAsset(registryFor(createStateProject([stateVariable({ confirmationStatus: "reviewNeeded", required: true })])))?.blockingIssues).toContain("Required state variable state-var-selected-record is not confirmed.");
  });

  it("excludes optional unconfirmed variables as the documented rule", () => {
    const registry = registryFor(createStateProject([stateVariable({ confirmationStatus: "reviewNeeded", required: false })]));

    expect(stateAsset(registry)).toBeUndefined();
  });

  it("starts the planning asset as Review Required", () => {
    expect(stateAsset(registryFor(createStateProject()))?.assetStatus).toBe("Review Required");
  });

  it("allows explicit approval to produce Ready for Export", () => {
    const project = createStateProject();
    const registry = approveRegistry(registryFor(project), project);

    expect(stateAsset(registry)?.assetStatus).toBe("Ready for Export");
  });

  it("changes checksum when a variable is added", () => {
    expect(checksumFor([stateVariable(), stateVariable({ id: "second", implementationName: "varSecond", sortOrder: 20 })])).not.toBe(checksumFor([stateVariable()]));
  });

  it("changes checksum when a variable is removed", () => {
    expect(checksumFor([stateVariable()])).not.toBe(checksumFor([stateVariable(), stateVariable({ id: "second", implementationName: "varSecond", sortOrder: 20 })]));
  });

  it("changes checksum when a variable is renamed", () => {
    expect(checksumFor([stateVariable({ implementationName: "varOther" })])).not.toBe(checksumFor([stateVariable()]));
  });

  it("changes checksum when value kind changes", () => {
    expect(checksumFor([stateVariable({ initialValue: { kind: "boolean", value: true } })])).not.toBe(checksumFor([stateVariable()]));
  });

  it("changes checksum when initial value changes", () => {
    expect(checksumFor([stateVariable({ initialValue: { kind: "text", value: "A" } })])).not.toBe(checksumFor([stateVariable({ initialValue: { kind: "text", value: "B" } })]));
  });

  it("changes checksum when required flag changes", () => {
    expect(checksumFor([stateVariable({ required: false })])).not.toBe(checksumFor([stateVariable({ required: true })]));
  });

  it("changes checksum when confirmation status changes", () => {
    expect(stateAsset(registryFor(createStateProject([stateVariable({ confirmationStatus: "confirmed" })])))?.contentChecksum).not.toBe(stateAsset(registryFor(createStateProject([stateVariable({ confirmationStatus: "reviewNeeded" })])))?.contentChecksum);
  });

  it("changes checksum when sort order changes", () => {
    expect(checksumFor([stateVariable({ sortOrder: 1 })])).not.toBe(checksumFor([stateVariable({ sortOrder: 2 })]));
  });

  it("does not change checksum when only timestamp changes", () => {
    const project = createStateProject();
    expect(stateAsset(buildImplementationAssetRegistry(project, "2026-07-16T12:00:00.000Z"))?.contentChecksum).toBe(stateAsset(buildImplementationAssetRegistry(project, "2099-01-01T00:00:00.000Z"))?.contentChecksum);
  });

  it("resets approval when checksum changes", () => {
    const project = createStateProject();
    const approved = approveRegistry(registryFor(project), project);
    project.powerPlatform!.canvas!.stateVariableTargets[0].initialValue = { kind: "text", value: "Changed" };

    expect(stateAsset(normalizeImplementationAssetRegistry(approved, project, "2026-07-16T12:00:00.000Z"))?.approvalStatus).toBe("Review required");
  });

  it("creates no connector dependency", () => {
    expect(stateAsset(registryFor(createStateProject()))?.dependencies.some((dependency) => dependency.type === "connector")).toBe(false);
  });

  it("creates no entity dependency", () => {
    expect(stateAsset(registryFor(createStateProject()))?.dependencies.some((dependency) => dependency.type === "entity")).toBe(false);
  });

  it("creates no field dependency", () => {
    expect(stateAsset(registryFor(createStateProject()))?.dependencies.some((dependency) => dependency.type === "field")).toBe(false);
  });

  it("is rejected by the current navigation generator", () => {
    const project = createStateProject();
    const registry = approveRegistry(registryFor(project), project);
    const result = generatePowerFxForAsset({ project, registry, assetId: CANVAS_STATE_INITIALIZATION_ASSET_ID });

    expect(result.status).toBe("Blocked");
    expect(result.formula).toBe("");
  });

  it("does not emit executable state formulas", () => {
    const project = createStateProject();
    const registry = approveRegistry(registryFor(project), project);
    const result = generatePowerFxForAsset({ project, registry, assetId: CANVAS_STATE_INITIALIZATION_ASSET_ID });

    expect(result.formula).not.toMatch(/\b(Set|Collect|ClearCollect|UpdateContext)\s*\(/);
  });

  it("does not mutate project or registry inputs", () => {
    const project = createStateProject();
    const registry = registryFor(project);
    const projectBefore = JSON.stringify(project);
    const registryBefore = JSON.stringify(registry);

    validateCanvasStateVariables(project.powerPlatform!.canvas!.stateVariableTargets);
    canvasStateVariableGenerationInputs(project.powerPlatform!.canvas!.stateVariableTargets);
    generatePowerFxForAsset({ project, registry, assetId: CANVAS_STATE_INITIALIZATION_ASSET_ID });

    expect(JSON.stringify(project)).toBe(projectBefore);
    expect(JSON.stringify(registry)).toBe(registryBefore);
  });

  it("preserves distinct property names in scalar inputs without converting text to formulas", () => {
    const value: CanvasStateInitialValue = { kind: "text", value: "Set(varUnsafe,true)" };

    expect(normalizeCanvasStateVariableTargets([{ id: "text", implementationName: "varText", initialValue: value }])[0].initialValue).toEqual(value);
  });

  it("keeps an unchanged approved state plan Ready for Export", () => {
    const project = createStateProject();
    const approved = approveRegistry(registryFor(project), project);
    const state = deriveImplementationAssetRegistryState(project, approved.assets);

    expect(state.assets.find((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID)?.assetStatus).toBe("Ready for Export");
  });

  it("changes an approved state plan to Review required when the initial value changes", () => {
    const project = createStateProject();
    const approved = approveRegistry(registryFor(project), project);
    project.powerPlatform!.canvas!.stateVariableTargets[0].initialValue = { kind: "text", value: "Changed" };
    const state = deriveImplementationAssetRegistryState(project, approved.assets);
    const asset = state.assets.find((item) => item.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID);

    expect(asset?.approvalStatus).toBe("Review required");
    expect(asset?.assetStatus).not.toBe("Ready for Export");
  });

  it("changes an approved state plan to non-Ready when the variable name changes", () => {
    const project = createStateProject();
    const approved = approveRegistry(registryFor(project), project);
    project.powerPlatform!.canvas!.stateVariableTargets[0].implementationName = "varChanged";

    expect(deriveImplementationAssetRegistryState(project, approved.assets).assets.find((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID)?.assetStatus).not.toBe("Ready for Export");
  });

  it("changes an approved state plan to non-Ready when a variable is added", () => {
    const project = createStateProject();
    const approved = approveRegistry(registryFor(project), project);
    project.powerPlatform!.canvas!.stateVariableTargets.push(stateVariable({ id: "second", implementationName: "varSecond", sortOrder: 20 }));

    expect(deriveImplementationAssetRegistryState(project, approved.assets).assets.find((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID)?.assetStatus).not.toBe("Ready for Export");
  });

  it("changes an approved state plan to non-Ready when a variable is removed", () => {
    const project = createStateProject([
      stateVariable({ id: "first", implementationName: "varFirst", sortOrder: 10 }),
      stateVariable({ id: "second", implementationName: "varSecond", sortOrder: 20 })
    ]);
    const approved = approveRegistry(registryFor(project), project);
    project.powerPlatform!.canvas!.stateVariableTargets = [stateVariable({ id: "first", implementationName: "varFirst", sortOrder: 10 })];

    expect(deriveImplementationAssetRegistryState(project, approved.assets).assets.find((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID)?.assetStatus).not.toBe("Ready for Export");
  });

  it("does not count a stale state plan as Ready in the current summary", () => {
    const { project, approved } = changedInitialValueProject();
    const state = deriveImplementationAssetRegistryState(project, approved.assets);

    expect(state.summary.readyAssetCount).toBeLessThan(approved.summary.readyAssetCount);
  });

  it("does not overstate asset package status when a state plan is stale", () => {
    const { project, approved } = changedInitialValueProject();
    const state = deriveImplementationAssetRegistryState(project, approved.assets);

    expect(state.assetPackageStatus).not.toBe("Ready for Export");
    expect(state.effectiveImplementationReadiness).not.toBe("Ready for Export");
  });

  it("does not show a stale state plan as Ready in the manifest", () => {
    const { project, approved } = changedInitialValueProject();
    const manifest = createImplementationAssetManifest(approved, project);

    expect(manifest.assets.find((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID)?.status).not.toBe("Ready for Export");
    expect(manifest.readyAssetCount).toBeLessThan(approved.summary.readyAssetCount);
  });

  it("does not treat stale state plan as a ready installation dependency", () => {
    const { project, approved } = changedInitialValueProject();
    const state = deriveImplementationAssetRegistryState(project, approved.assets);
    const install = installAsset({ ...approved, assets: state.assets });

    expect(install?.dependencies.find((dependency) => dependency.targetAssetId === CANVAS_STATE_INITIALIZATION_ASSET_ID)?.resolved).toBe(false);
    expect(install?.assetStatus).not.toBe("Ready for Export");
  });

  it("normalization still preserves approval for an unchanged checksum", () => {
    const project = createStateProject();
    const approved = approveRegistry(registryFor(project), project);

    expect(stateAsset(normalizeImplementationAssetRegistry(approved, project, "2026-07-16T12:00:00.000Z"))?.assetStatus).toBe("Ready for Export");
  });

  it("normalization still resets approval for a changed checksum", () => {
    const project = createStateProject();
    const approved = approveRegistry(registryFor(project), project);
    project.powerPlatform!.canvas!.stateVariableTargets[0].initialValue = { kind: "text", value: "Changed" };

    expect(stateAsset(normalizeImplementationAssetRegistry(approved, project, "2026-07-16T12:00:00.000Z"))?.assetStatus).not.toBe("Ready for Export");
  });

  it("keeps text containing Set as structured generation input", () => {
    const asset = stateAsset(registryFor(createStateProject([stateVariable({ initialValue: { kind: "text", value: "Set(varA,true)" } })])))!;

    expect(asset.generationInputs?.stateVariables?.[0].initialValue).toEqual({ kind: "text", value: "Set(varA,true)" });
  });

  it("does not print raw Set text values in planning source content", () => {
    const asset = stateAsset(registryFor(createStateProject([stateVariable({ initialValue: { kind: "text", value: "Set(varA,true)" } })])))!;

    expect(asset.sourceContent).not.toContain("Set(");
  });

  it("does not print raw ClearCollect text values in planning source content", () => {
    const asset = stateAsset(registryFor(createStateProject([stateVariable({ initialValue: { kind: "text", value: "ClearCollect(colA,[])" } })])))!;

    expect(asset.sourceContent).not.toContain("ClearCollect(");
  });

  it("does not print raw Patch text values in planning source content", () => {
    const asset = stateAsset(registryFor(createStateProject([stateVariable({ initialValue: { kind: "text", value: "Patch(Accounts,{})" } })])))!;

    expect(asset.sourceContent).not.toContain("Patch(");
  });

  it("gives different checksums to different formula-looking text literals", () => {
    expect(checksumFor([stateVariable({ initialValue: { kind: "text", value: "Set(varA,true)" } })])).not.toBe(checksumFor([stateVariable({ initialValue: { kind: "text", value: "Set(varB,true)" } })]));
  });

  it("keeps safe source-content output deterministic", () => {
    const first = stateAsset(registryFor(createStateProject([stateVariable({ initialValue: { kind: "text", value: "Set(varA,true)" } })])))?.sourceContent;
    const second = stateAsset(buildImplementationAssetRegistry(createStateProject([stateVariable({ initialValue: { kind: "text", value: "Set(varA,true)" } })]), "2099-01-01T00:00:00.000Z"))?.sourceContent;

    expect(first).toBe(second);
  });
});
