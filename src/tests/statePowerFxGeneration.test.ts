import {
  calculateImplementationAssetChecksum,
  buildImplementationAssetRegistry,
  normalizeImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import { generatePowerFxForAsset } from "../lib/powerFxGeneration";
import { generateStatePowerFxForAsset, generateStatePowerFxForRegistry } from "../lib/statePowerFxGeneration";
import {
  CANVAS_STATE_INITIALIZATION_ASSET_ID,
  CANVAS_STATE_INITIALIZATION_OPERATION,
  CANVAS_STATE_INITIALIZATION_PATH
} from "../lib/stateInitialization";
import { createProject } from "../lib/createProject";
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
    identity: { id: "state-fx", projectName: "State Fx" },
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

function createNonCanvasProject(): ProjectRecord {
  return createProject({
    identity: { id: "website", projectName: "Website" },
    intake: { appType: "businessWebsite", appPurpose: "Website" } as any
  });
}

function stateAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  const asset = registry.assets.find((item) => item.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID);
  if (!asset) throw new Error("State asset missing");
  return asset;
}

function registryFor(project: ProjectRecord, generatedAt = "2026-07-16T12:00:00.000Z"): ImplementationAssetRegistry {
  return buildImplementationAssetRegistry(project, generatedAt);
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

function approvedRegistryFor(project: ProjectRecord): ImplementationAssetRegistry {
  return approveRegistry(registryFor(project), project);
}

function withValidChecksum(asset: ImplementationAsset): ImplementationAsset {
  const withoutChecksum = { ...asset, contentChecksum: "" };
  return { ...asset, contentChecksum: calculateImplementationAssetChecksum(withoutChecksum) };
}

function registryWithAsset(registry: ImplementationAssetRegistry, replacement: ImplementationAsset): ImplementationAssetRegistry {
  return {
    ...registry,
    assets: registry.assets.map((asset) => asset.assetId === replacement.assetId ? replacement : asset)
  };
}

function approvedMutatedAsset(registry: ImplementationAssetRegistry, mutate: (asset: ImplementationAsset) => ImplementationAsset): ImplementationAssetRegistry {
  const asset = mutate(structuredClone(stateAsset(registry)));
  const withChecksum = withValidChecksum({ ...asset, approvalStatus: "Approved" });
  return registryWithAsset(registry, withChecksum);
}

function validUnrelatedAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  return withValidChecksum({
    ...structuredClone(stateAsset(registry)),
    assetId: "asset-unrelated-runtime-safety",
    targetId: "unrelated-target",
    targetDisplayName: "Unrelated runtime safety asset",
    intendedPath: "07_Development/PowerFx/unrelated/RuntimeSafety.fx",
    generationInputs: undefined
  });
}

function validGenerationInputStateVariable(): NonNullable<NonNullable<ImplementationAsset["generationInputs"]>["stateVariables"]>[number] {
  return {
    id: "state-var-generation-input-safety",
    implementationName: "varGenerationInputSafety",
    purpose: "Verify structured generation-input runtime safety.",
    initialValue: { kind: "blank" },
    required: true,
    confirmationStatus: "confirmed",
    sortOrder: 10
  };
}

function registryWithUnrelatedAsset(project: ProjectRecord, asset: ImplementationAsset): ImplementationAssetRegistry {
  const registry = approvedRegistryFor(project);
  return { ...registry, assets: [...registry.assets, asset] };
}

function expectMalformedUnrelatedBlocks(
  mutate: (asset: ImplementationAsset) => ImplementationAsset,
  options: { beforeCanonical?: boolean } = {}
): void {
  const project = createStateProject();
  const registry = approvedRegistryFor(project);
  const malformed = mutate(validUnrelatedAsset(registry));
  const assets = options.beforeCanonical ? [malformed, ...registry.assets] : [...registry.assets, malformed];
  const result = generateStatePowerFxForAsset({ project, registry: { ...registry, assets } });

  expect(result.status).toBe("Blocked");
  expect(result.formula).toBe("");
  expect(result.generatedChecksum).toBe("");
}

function expectBlockedAfterRecalculatedMutation(
  project: ProjectRecord,
  mutate: (asset: ImplementationAsset) => ImplementationAsset
): void {
  const registry = approvedMutatedAsset(approvedRegistryFor(project), mutate);
  const result = generateStatePowerFxForAsset({ project, registry });

  expect(result.status).toBe("Blocked");
  expect(result.formula).toBe("");
}

function generatedFormulaForValue(initialValue: CanvasStateInitialValue): string {
  const project = createStateProject([stateVariable({ initialValue })]);
  return generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) }).formula;
}

function executableOperationCalls(formula: string): string[] {
  const withoutStrings = formula.replace(/"(?:""|[^"])*"/g, "\"\"");
  return [...withoutStrings.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\s*\(/g)].map((match) => match[1]);
}

describe("state Power Fx generation", () => {
  it("generates from an approved current state plan", () => {
    const project = createStateProject();
    const result = generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) });

    expect(result.status).toBe("Generated");
    expect(result.formula).toBe("Set(varSelectedRecordId, Blank())\n");
  });

  it("still generates from a canonical current-project registry", () => {
    const project = createStateProject();

    expect(generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) }).status).toBe("Generated");
  });

  it("blocks when only the registry project ID changes", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), projectId: "other-project" };
    const result = generateStatePowerFxForAsset({ project, registry });

    expect(result.status).toBe("Blocked");
    expect(result.formula).toBe("");
    expect(result.generatedChecksum).toBe("");
    expect(result.blockingIssues[0]).toContain("other-project");
    expect(result.blockingIssues[0]).toContain("state-fx");
  });

  it("blocks a registry from another project even when it contains a copied current-project asset", () => {
    const project = createStateProject();
    const otherProject = createStateProject();
    otherProject.identity.id = "other-project";
    const registry = {
      ...approvedRegistryFor(otherProject),
      assets: [stateAsset(approvedRegistryFor(project))]
    };

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks safely when registry project ID is missing", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), projectId: undefined } as unknown as ImplementationAssetRegistry;

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks unsupported registry schema versions", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), registryVersion: 2 } as unknown as ImplementationAssetRegistry;

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks missing or malformed registry schema versions safely", () => {
    const project = createStateProject();
    const missing = { ...approvedRegistryFor(project), registryVersion: undefined } as unknown as ImplementationAssetRegistry;
    const malformed = { ...approvedRegistryFor(project), registryVersion: "1" } as unknown as ImplementationAssetRegistry;

    expect(generateStatePowerFxForAsset({ project, registry: missing }).status).toBe("Blocked");
    expect(generateStatePowerFxForAsset({ project, registry: malformed }).status).toBe("Blocked");
  });

  it("blocks incompatible registry generation versions", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), generationVersion: "legacy" };

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks safely when registry generation version is missing", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), generationVersion: undefined } as unknown as ImplementationAssetRegistry;

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks null asset-list entries without throwing", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), assets: [null, ...approvedRegistryFor(project).assets] } as unknown as ImplementationAssetRegistry;

    expect(() => generateStatePowerFxForAsset({ project, registry })).not.toThrow();
    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks undefined asset-list entries without throwing", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), assets: [undefined, ...approvedRegistryFor(project).assets] } as unknown as ImplementationAssetRegistry;

    expect(() => generateStatePowerFxForAsset({ project, registry })).not.toThrow();
    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks string asset-list entries without throwing", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), assets: ["bad", ...approvedRegistryFor(project).assets] } as unknown as ImplementationAssetRegistry;

    expect(() => generateStatePowerFxForAsset({ project, registry })).not.toThrow();
    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks array asset-list entries without throwing", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), assets: [[], ...approvedRegistryFor(project).assets] } as unknown as ImplementationAssetRegistry;

    expect(() => generateStatePowerFxForAsset({ project, registry })).not.toThrow();
    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks object asset-list entries missing asset ID without throwing", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), assets: [{}, ...approvedRegistryFor(project).assets] } as unknown as ImplementationAssetRegistry;

    expect(() => generateStatePowerFxForAsset({ project, registry })).not.toThrow();
    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks non-string asset IDs without throwing", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), assets: [{ assetId: 123 }, ...approvedRegistryFor(project).assets] } as unknown as ImplementationAssetRegistry;

    expect(() => generateStatePowerFxForAsset({ project, registry })).not.toThrow();
    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks malformed canonical required gate IDs safely", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);

    expect(generateStatePowerFxForAsset({ project, registry: registryWithAsset(registry, { ...stateAsset(registry), requiredGateIds: undefined as any }) }).status).toBe("Blocked");
  });

  it("blocks malformed canonical gate snapshots safely", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);

    expect(generateStatePowerFxForAsset({ project, registry: registryWithAsset(registry, { ...stateAsset(registry), gateEvaluationSnapshot: undefined as any }) }).status).toBe("Blocked");
  });

  it("blocks malformed canonical dependencies safely", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);

    expect(generateStatePowerFxForAsset({ project, registry: registryWithAsset(registry, { ...stateAsset(registry), dependencies: undefined as any }) }).status).toBe("Blocked");
  });

  it("blocks malformed canonical generation inputs safely", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, generationInputs: undefined }));
  });

  it("blocks malformed canonical state-variable inputs safely", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, generationInputs: { ...asset.generationInputs, stateVariables: undefined } }));
  });

  it("returns no formula for malformed asset-list results", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), assets: [null, ...approvedRegistryFor(project).assets] } as unknown as ImplementationAssetRegistry;

    expect(generateStatePowerFxForAsset({ project, registry }).formula).toBe("");
  });

  it("returns no generated checksum for malformed asset-list results", () => {
    const project = createStateProject();
    const registry = { ...approvedRegistryFor(project), assets: [null, ...approvedRegistryFor(project).assets] } as unknown as ImplementationAssetRegistry;

    expect(generateStatePowerFxForAsset({ project, registry }).generatedChecksum).toBe("");
  });

  it("handles registry-level generation with a missing asset list without throwing", () => {
    const project = createStateProject();
    const results = generateStatePowerFxForRegistry(project, { ...approvedRegistryFor(project), assets: undefined } as unknown as ImplementationAssetRegistry);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("Blocked");
  });

  it("handles registry-level generation with a null asset entry without throwing", () => {
    const project = createStateProject();
    const results = generateStatePowerFxForRegistry(project, { ...approvedRegistryFor(project), assets: [null, ...approvedRegistryFor(project).assets] } as unknown as ImplementationAssetRegistry);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("Blocked");
  });

  it("blocks an unrelated asset containing only a valid asset ID without throwing", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const malformed = { assetId: "asset-unrelated-runtime-safety" } as ImplementationAsset;
    const result = generateStatePowerFxForAsset({ project, registry: { ...registry, assets: [...registry.assets, malformed] } });

    expect(result.status).toBe("Blocked");
    expect(result.formula).toBe("");
  });

  it("blocks the same malformed unrelated asset through registry-level generation", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const malformed = { assetId: "asset-unrelated-runtime-safety" } as ImplementationAsset;
    const results = generateStatePowerFxForRegistry(project, { ...registry, assets: [...registry.assets, malformed] });

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("Blocked");
  });

  it("blocks malformed unrelated assets before the canonical asset", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, dependencies: undefined as any }), { beforeCanonical: true });
  });

  it("blocks malformed unrelated assets after the canonical asset", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, dependencies: undefined as any }));
  });

  it("blocks unrelated assets missing dependencies safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, dependencies: undefined as any }));
  });

  it("blocks unrelated assets with null dependency entries safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, dependencies: [null] as any }));
  });

  it("blocks unrelated assets with primitive dependency entries safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, dependencies: ["bad"] as any }));
  });

  it("blocks unrelated assets with malformed gate snapshot entries safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, gateEvaluationSnapshot: [null] as any }));
  });

  it("blocks unrelated assets with non-string required gate IDs safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, requiredGateIds: [123] as any }));
  });

  it("blocks unrelated assets with malformed source-record IDs safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, sourceRecordIds: [123] as any }));
  });

  it("blocks unrelated assets with malformed connector IDs safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, connectorIds: [123] as any }));
  });

  it("blocks unrelated assets with malformed entity IDs safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, entityIds: [123] as any }));
  });

  it("blocks unrelated assets with malformed field IDs safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, fieldIds: [123] as any }));
  });

  it("blocks unrelated assets with malformed manual-installation requirements safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, manualInstallationRequirements: [123] as any }));
  });

  it("blocks unrelated assets with malformed validation requirements safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, validationRequirements: [123] as any }));
  });

  it("blocks unrelated assets with malformed known limitations safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, knownLimitations: [123] as any }));
  });

  it("blocks unrelated assets with malformed blocking issues safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, blockingIssues: [123] as any }));
  });

  it("blocks malformed unrelated optional assets", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, required: false, dependencies: [null] as any }));
  });

  it("blocks malformed unrelated not-applicable assets", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, applicabilityStatus: "notApplicable", dependencies: [null] as any }));
  });

  it("returns no formula for all malformed unrelated asset results", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const result = generateStatePowerFxForAsset({ project, registry: registryWithUnrelatedAsset(project, { ...validUnrelatedAsset(registry), dependencies: [null] as any }) });

    expect(result.formula).toBe("");
  });

  it("returns no generated checksum for all malformed unrelated asset results", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const result = generateStatePowerFxForAsset({ project, registry: registryWithUnrelatedAsset(project, { ...validUnrelatedAsset(registry), dependencies: [null] as any }) });

    expect(result.generatedChecksum).toBe("");
  });

  it("blocks unrelated assets with object current formula properties without throwing", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { currentFormulaProperties: {} as any } }));
  });

  it("blocks unrelated assets with numeric current formula properties safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { currentFormulaProperties: 1 as any } }));
  });

  it("blocks unrelated assets with string current formula properties safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { currentFormulaProperties: "OnSelect" as any } }));
  });

  it("blocks unrelated assets with null current formula property entries safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { currentFormulaProperties: [null] as any } }));
  });

  it("blocks unrelated assets with mixed current formula property entries safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { currentFormulaProperties: ["OnSelect", 1] as any } }));
  });

  it("accepts unrelated assets with valid current formula property arrays", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const unrelated = {
      ...validUnrelatedAsset(registry),
      generationInputs: { currentFormulaProperties: ["OnSelect", "OnSuccess"] }
    };

    expect(generateStatePowerFxForAsset({ project, registry: registryWithUnrelatedAsset(project, unrelated) }).status).toBe("Generated");
  });

  it("blocks malformed generation input source screen IDs safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { sourceScreenId: {} as any } }));
  });

  it("blocks malformed generation input source control IDs safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { sourceControlId: {} as any } }));
  });

  it("blocks malformed generation input destination screen IDs safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { destinationScreenId: {} as any } }));
  });

  it("blocks malformed generation input navigation transitions safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { navigationTransition: {} as any } }));
  });

  it("blocks malformed generation input destination implementation names safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { destinationImplementationName: {} as any } }));
  });

  it("blocks malformed approved property names safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, approvedPropertyName: {} as any }));
  });

  it("blocks null structured state-variable generation input entries safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { stateVariables: [null] as any } }));
  });

  it("blocks structured state-variable generation inputs with malformed IDs safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { stateVariables: [{ ...validGenerationInputStateVariable(), id: 123 as any }] } }));
  });

  it("blocks structured state-variable generation inputs with malformed implementation names safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { stateVariables: [{ ...validGenerationInputStateVariable(), implementationName: {} as any }] } }));
  });

  it("blocks structured state-variable generation inputs with non-finite sort order safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { stateVariables: [{ ...validGenerationInputStateVariable(), sortOrder: Infinity }] } }));
  });

  it("blocks structured state-variable generation inputs with array initial values safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { stateVariables: [{ ...validGenerationInputStateVariable(), initialValue: [] as any }] } }));
  });

  it("blocks structured state-variable generation inputs with unknown initial-value kinds safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { stateVariables: [{ ...validGenerationInputStateVariable(), initialValue: { kind: "record" } as any }] } }));
  });

  it("blocks Boolean initial values with non-Boolean values safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { stateVariables: [{ ...validGenerationInputStateVariable(), initialValue: { kind: "boolean", value: "true" } as any }] } }));
  });

  it("blocks number initial values with non-finite values safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { stateVariables: [{ ...validGenerationInputStateVariable(), initialValue: { kind: "number", value: Infinity } }] } }));
  });

  it("blocks text initial values with non-string values safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({ ...asset, generationInputs: { stateVariables: [{ ...validGenerationInputStateVariable(), initialValue: { kind: "text", value: 123 } as any }] } }));
  });

  it("blocks dependencies with array relationship context safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({
      ...asset,
      dependencies: [{
        id: "dependency-with-array-relationship-context",
        type: "field",
        label: "Relationship context dependency",
        targetRecordId: "field-one",
        required: true,
        resolved: true,
        resolutionReason: "Test dependency is resolved.",
        sourceSection: "Test",
        relationshipContext: [] as any
      }]
    }));
  });

  it("blocks dependencies with malformed relationship-context fields safely", () => {
    expectMalformedUnrelatedBlocks((asset) => ({
      ...asset,
      dependencies: [{
        id: "dependency-with-malformed-relationship-context",
        type: "field",
        label: "Relationship context dependency",
        targetRecordId: "field-one",
        required: true,
        resolved: true,
        resolutionReason: "Test dependency is resolved.",
        sourceSection: "Test",
        relationshipContext: { connectorId: {}, entityId: 123, fieldId: [], parentConnectorId: false, parentEntityId: null, targetType: ["canvasControl"] } as any
      }]
    }));
  });

  it("blocks malformed generation inputs through registry-level generation", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const results = generateStatePowerFxForRegistry(project, registryWithUnrelatedAsset(project, {
      ...validUnrelatedAsset(registry),
      generationInputs: { currentFormulaProperties: [null] as any }
    }));

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("Blocked");
  });

  it("returns no formula for malformed generation-input results", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const result = generateStatePowerFxForAsset({ project, registry: registryWithUnrelatedAsset(project, { ...validUnrelatedAsset(registry), generationInputs: { currentFormulaProperties: [null] as any } }) });

    expect(result.formula).toBe("");
  });

  it("returns no generated checksum for malformed generation-input results", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const result = generateStatePowerFxForAsset({ project, registry: registryWithUnrelatedAsset(project, { ...validUnrelatedAsset(registry), generationInputs: { currentFormulaProperties: [null] as any } }) });

    expect(result.generatedChecksum).toBe("");
  });

  it("blocks two identical canonical state assets", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);

    expect(generateStatePowerFxForAsset({ project, registry: { ...registry, assets: [...registry.assets, structuredClone(stateAsset(registry))] } }).status).toBe("Blocked");
  });

  it("blocks one canonical source asset plus one modified duplicate with the same ID", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const duplicate = { ...structuredClone(stateAsset(registry)), targetDisplayName: "Modified duplicate" };

    expect(generateStatePowerFxForAsset({ project, registry: { ...registry, assets: [...registry.assets, duplicate] } }).status).toBe("Blocked");
  });

  it("blocks duplicate source assets regardless of which appears first", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const canonical = stateAsset(registry);
    const modified = { ...structuredClone(canonical), targetDisplayName: "Modified duplicate" };

    expect(generateStatePowerFxForAsset({ project, registry: { ...registry, assets: [modified, ...registry.assets] } }).status).toBe("Blocked");
  });

  it("blocks duplicate unrelated assets through registry graph integrity", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const unrelated = registry.assets.find((asset) => asset.assetId !== CANVAS_STATE_INITIALIZATION_ASSET_ID)!;

    expect(generateStatePowerFxForAsset({ project, registry: { ...registry, assets: [...registry.assets, structuredClone(unrelated)] } }).status).toBe("Blocked");
  });

  it("returns no formula for malformed registries", () => {
    const project = createStateProject();
    const result = generateStatePowerFxForAsset({ project, registry: {} as ImplementationAssetRegistry });

    expect(result.status).toBe("Blocked");
    expect(result.formula).toBe("");
  });

  it("returns no generated checksum for malformed registries", () => {
    const project = createStateProject();
    const result = generateStatePowerFxForAsset({ project, registry: { projectId: project.identity.id } as ImplementationAssetRegistry });

    expect(result.status).toBe("Blocked");
    expect(result.generatedChecksum).toBe("");
  });

  it("blocks a registry approved for another project with identical state variables", () => {
    const project = createStateProject();
    const otherProject = createStateProject();
    otherProject.identity.id = "other-project";
    const result = generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(otherProject) });

    expect(result.status).toBe("Blocked");
    expect(result.blockingIssues[0]).toContain("not current project state-fx");
  });

  it("blocks an altered project ID even after approval checksum recalculation", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, projectId: "other-project" }));
  });

  it("blocks an altered platform even after approval checksum recalculation", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, platform: "Power Apps model-driven" }));
  });

  it("blocks an altered asset category even after approval checksum recalculation", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, assetCategory: "Canvas YAML" }));
  });

  it("blocks an altered asset type even after approval checksum recalculation", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, assetType: "canvasYamlPlan" }));
  });

  it("blocks an altered App target ID even after approval checksum recalculation", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, targetId: "other-app-target" }));
  });

  it("blocks altered target display identity even after approval checksum recalculation", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, targetDisplayName: "Other App OnStart" }));
  });

  it("returns Not Applicable for non-Canvas projects", () => {
    const project = createNonCanvasProject();
    expect(generateStatePowerFxForAsset({ project, registry: registryFor(project) }).status).toBe("Not Applicable");
  });

  it("blocks malformed registries for non-Canvas projects without throwing", () => {
    const project = createNonCanvasProject();
    const registry = { ...registryFor(project), assets: null } as unknown as ImplementationAssetRegistry;

    expect(() => generateStatePowerFxForAsset({ project, registry })).not.toThrow();
    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
    expect(generateStatePowerFxForRegistry(project, registry)[0].status).toBe("Blocked");
  });

  it("blocks when the state planning asset is missing", () => {
    const project = createStateProject();
    const emptyRegistry = registryFor(createStateProject([]));
    expect(generateStatePowerFxForAsset({ project, registry: emptyRegistry }).status).toBe("Blocked");
  });

  it("returns Not Applicable when no state variables exist", () => {
    const project = createStateProject([]);
    const result = generateStatePowerFxForAsset({ project, registry: registryFor(project) });

    expect(result.status).toBe("Not Applicable");
    expect(result.formula).toBe("");
  });

  it("returns no registry-level generation result when no state variables exist after registry regeneration", () => {
    const project = createStateProject([]);

    expect(generateStatePowerFxForRegistry(project, registryFor(project))).toEqual([]);
  });

  it("blocks malformed registries when no state variables exist", () => {
    const project = createStateProject([]);
    const registry = { ...registryFor(project), assets: null } as unknown as ImplementationAssetRegistry;
    const result = generateStatePowerFxForAsset({ project, registry });

    expect(result.status).toBe("Blocked");
    expect(result.formula).toBe("");
    expect(result.generatedChecksum).toBe("");
  });

  it("blocks null asset entries when no state variables exist", () => {
    const project = createStateProject([]);
    const registry = { ...registryFor(project), assets: [null] } as unknown as ImplementationAssetRegistry;

    expect(() => generateStatePowerFxForAsset({ project, registry })).not.toThrow();
    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks incomplete asset entries when no state variables exist", () => {
    const project = createStateProject([]);
    const registry = { ...registryFor(project), assets: [{ assetId: "incomplete" }] } as unknown as ImplementationAssetRegistry;

    expect(() => generateStatePowerFxForAsset({ project, registry })).not.toThrow();
    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("returns one blocked registry-level result for malformed no-variable registries", () => {
    const project = createStateProject([]);
    const registry = { ...registryFor(project), assets: ["invalid"] } as unknown as ImplementationAssetRegistry;
    const results = generateStatePowerFxForRegistry(project, registry);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("Blocked");
  });

  it("blocks stale state assets after the final approved variable is removed", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets = [];
    const result = generateStatePowerFxForAsset({ project, registry });

    expect(result.status).toBe("Blocked");
    expect(result.blockingIssues[0]).toContain("stale");
  });

  it("returns no formula after the final approved variable is removed from an old registry", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets = [];

    expect(generateStatePowerFxForAsset({ project, registry }).formula).toBe("");
  });

  it("returns no generated checksum after the final approved variable is removed from an old registry", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets = [];

    expect(generateStatePowerFxForAsset({ project, registry }).generatedChecksum).toBe("");
  });

  it("removes the canonical state asset after regeneration when all variables are removed", () => {
    const project = createStateProject();
    project.powerPlatform!.canvas!.stateVariableTargets = [];

    expect(registryFor(project).assets.some((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID)).toBe(false);
  });

  it("returns Not Applicable after regeneration when all variables are removed", () => {
    const project = createStateProject();
    project.powerPlatform!.canvas!.stateVariableTargets = [];

    expect(generateStatePowerFxForAsset({ project, registry: registryFor(project) }).status).toBe("Not Applicable");
  });

  it("returns no registry-level results after regeneration when all variables are removed", () => {
    const project = createStateProject();
    project.powerPlatform!.canvas!.stateVariableTargets = [];

    expect(generateStatePowerFxForRegistry(project, registryFor(project))).toEqual([]);
  });

  it("blocks duplicate canonical assets when no current variables exist", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets = [];

    expect(generateStatePowerFxForAsset({ project, registry: { ...registry, assets: [...registry.assets, structuredClone(stateAsset(registry))] } }).status).toBe("Blocked");
  });

  it("blocks Draft assets", () => {
    const project = createStateProject();
    const registry = approvedMutatedAsset(approvedRegistryFor(project), (asset) => ({ ...asset, applicabilityStatus: "undecided" }));

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks Review Required assets", () => {
    const project = createStateProject();
    expect(generateStatePowerFxForAsset({ project, registry: registryFor(project) }).status).toBe("Review Required");
  });

  it("blocks blocked assets", () => {
    const project = createStateProject([stateVariable({ implementationName: "bad name" })]);
    expect(generateStatePowerFxForAsset({ project, registry: registryFor(project) }).status).toBe("Blocked");
  });

  it("blocks unapproved assets", () => {
    const project = createStateProject();
    const registry = registryWithAsset(approvedRegistryFor(project), { ...stateAsset(approvedRegistryFor(project)), approvalStatus: "Not reviewed" });

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Review Required");
  });

  it("blocks invalid source checksums", () => {
    const project = createStateProject();
    const registry = registryWithAsset(approvedRegistryFor(project), { ...stateAsset(approvedRegistryFor(project)), contentChecksum: "bad" });

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks stale approvals", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets[0].initialValue = { kind: "text", value: "Changed" };

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks failed readiness gates", () => {
    const project = createStateProject();
    project.powerPlatform!.canvas!.namingStandardConfirmationStatus = "reviewNeeded";

    expect(generateStatePowerFxForAsset({ project, registry: registryFor(project) }).status).toBe("Blocked");
  });

  it("blocks unresolved dependencies", () => {
    const project = createStateProject();
    const registry = approvedMutatedAsset(approvedRegistryFor(project), (asset) => ({
      ...asset,
      dependencies: [{
        id: "asset:missing",
        type: "asset",
        label: "Missing dependency",
        targetAssetId: "missing",
        required: true,
        resolved: false,
        resolutionReason: "Missing.",
        blockingIssue: "Required dependency is missing.",
        sourceSection: "Test"
      }]
    }));

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks unsupported asset operations", () => {
    const project = createStateProject();
    const registry = approvedMutatedAsset(approvedRegistryFor(project), (asset) => ({ ...asset, generationInputs: { ...asset.generationInputs, operation: "navigation" } }));

    expect(generateStatePowerFxForAsset({ project, registry }).blockingIssues[0]).toContain("Operation navigation is not supported");
  });

  it("blocks unsupported properties", () => {
    const project = createStateProject();
    const registry = approvedMutatedAsset(approvedRegistryFor(project), (asset) => ({ ...asset, approvedPropertyName: "OnVisible", generationInputs: { ...asset.generationInputs, formulaProperty: "OnVisible" } }));

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks unsupported asset paths", () => {
    const project = createStateProject();
    const registry = approvedMutatedAsset(approvedRegistryFor(project), (asset) => ({ ...asset, intendedPath: "bad.fx" }));

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks removing the canonical naming gate", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, requiredGateIds: [] }));
  });

  it("blocks replacing the canonical naming gate", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, requiredGateIds: ["schema" as any] }));
  });

  it("blocks empty required gate IDs", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, requiredGateIds: [] }));
  });

  it("does not let empty stored gate snapshots bypass current gate evaluation", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, gateEvaluationSnapshot: [] }));
  });

  it("blocks a non-passing current naming gate even when the supplied asset contains no gates", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.namingStandardConfirmationStatus = "reviewNeeded";
    const altered = approvedMutatedAsset(registry, (asset) => ({ ...asset, requiredGateIds: [], gateEvaluationSnapshot: [] }));

    expect(generateStatePowerFxForAsset({ project, registry: altered }).status).toBe("Blocked");
  });

  it("blocks altered source record IDs", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, sourceRecordIds: ["other-record"] }));
  });

  it("blocks altered structured state inputs", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({
      ...asset,
      generationInputs: {
        ...asset.generationInputs,
        stateVariables: asset.generationInputs!.stateVariables!.map((variable) => ({ ...variable, implementationName: "varOther" }))
      }
    }));
  });

  it("blocks altered connector IDs", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, connectorIds: ["connector"] }));
  });

  it("blocks altered entity IDs", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, entityIds: ["entity"] }));
  });

  it("blocks altered field IDs", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, fieldIds: ["field"] }));
  });

  it("blocks added relationship dependencies", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({
      ...asset,
      dependencies: [{
        id: "relationship:one",
        type: "relationship",
        label: "Relationship",
        targetRecordId: "relationship-one",
        required: true,
        resolved: true,
        resolutionReason: "Tampered.",
        sourceSection: "Test"
      } as any]
    }));
  });

  it("blocks incompatible generation versions", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, generationVersion: "legacy" }));
  });

  it("does not let manually setting stored status to Ready bypass canonical evaluation", () => {
    const project = createStateProject();
    const registry = registryWithAsset(registryFor(project), { ...stateAsset(registryFor(project)), assetStatus: "Ready for Export" });

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Review Required");
  });

  it("does not trust a noncanonical asset with a manually recalculated checksum", () => {
    const project = createStateProject();

    expectBlockedAfterRecalculatedMutation(project, (asset) => ({ ...asset, targetDisplayName: "Recalculated tampered target" }));
  });

  it("generates Blank for a blank variable", () => {
    expect(generatedFormulaForValue({ kind: "blank" })).toBe("Set(varSelectedRecordId, Blank())\n");
  });

  it("generates lowercase true", () => {
    expect(generatedFormulaForValue({ kind: "boolean", value: true })).toBe("Set(varSelectedRecordId, true)\n");
  });

  it("generates lowercase false", () => {
    expect(generatedFormulaForValue({ kind: "boolean", value: false })).toBe("Set(varSelectedRecordId, false)\n");
  });

  it("generates positive numbers deterministically", () => {
    expect(generatedFormulaForValue({ kind: "number", value: 42 })).toBe("Set(varSelectedRecordId, 42)\n");
  });

  it("generates negative numbers deterministically", () => {
    expect(generatedFormulaForValue({ kind: "number", value: -42 })).toBe("Set(varSelectedRecordId, -42)\n");
  });

  it("generates decimals deterministically", () => {
    expect(generatedFormulaForValue({ kind: "number", value: 1.25 })).toBe("Set(varSelectedRecordId, 1.25)\n");
  });

  it("normalizes negative zero to 0", () => {
    expect(generatedFormulaForValue({ kind: "number", value: -0 })).toBe("Set(varSelectedRecordId, 0)\n");
  });

  it("blocks non-finite numbers", () => {
    const project = createStateProject([stateVariable({ initialValue: { kind: "number", value: Infinity } })]);
    const registry = approvedRegistryFor(project);

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("quotes simple text", () => {
    expect(generatedFormulaForValue({ kind: "text", value: "New project" })).toBe("Set(varSelectedRecordId, \"New project\")\n");
  });

  it("escapes double quotes by doubling them", () => {
    expect(generatedFormulaForValue({ kind: "text", value: "Line \"two\"" })).toBe("Set(varSelectedRecordId, \"Line \"\"two\"\"\")\n");
  });

  it("keeps formula-looking text quoted", () => {
    expect(generatedFormulaForValue({ kind: "text", value: "Set(varAdmin, true)" })).toBe("Set(varSelectedRecordId, \"Set(varAdmin, true)\")\n");
  });

  it("uses Char(10) for multiline text", () => {
    expect(generatedFormulaForValue({ kind: "text", value: "Line one\nLine \"two\"" })).toBe("Set(varSelectedRecordId, \"Line one\" & Char(10) & \"Line \"\"two\"\"\")\n");
  });

  it("generates an empty string literal for empty text", () => {
    expect(generatedFormulaForValue({ kind: "text", value: "" })).toBe("Set(varSelectedRecordId, \"\")\n");
  });

  it("generates one combined formula for multiple variables", () => {
    const project = createStateProject([
      stateVariable({ id: "ready", implementationName: "varReady", initialValue: { kind: "boolean", value: false }, sortOrder: 10 }),
      stateVariable({ id: "count", implementationName: "varCount", initialValue: { kind: "number", value: 0 }, sortOrder: 20 })
    ]);

    expect(generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) }).formula).toBe("Set(varReady, false);\nSet(varCount, 0)\n");
  });

  it("orders variables by sort order then stable ID", () => {
    const project = createStateProject([
      stateVariable({ id: "b", implementationName: "varB", initialValue: { kind: "text", value: "B" }, sortOrder: 20 }),
      stateVariable({ id: "a", implementationName: "varA", initialValue: { kind: "text", value: "A" }, sortOrder: 20 }),
      stateVariable({ id: "c", implementationName: "varC", initialValue: { kind: "text", value: "C" }, sortOrder: 10 })
    ]);

    expect(generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) }).traceability.orderedVariableIds).toEqual(["c", "a", "b"]);
  });

  it("does not let input array ordering affect output", () => {
    const variables = [
      stateVariable({ id: "first", implementationName: "varFirst", initialValue: { kind: "text", value: "1" }, sortOrder: 10 }),
      stateVariable({ id: "second", implementationName: "varSecond", initialValue: { kind: "text", value: "2" }, sortOrder: 20 })
    ];
    const forward = createStateProject(variables);
    const reverse = createStateProject([...variables].reverse());

    expect(generateStatePowerFxForAsset({ project: forward, registry: approvedRegistryFor(forward) }).formula).toBe(generateStatePowerFxForAsset({ project: reverse, registry: approvedRegistryFor(reverse) }).formula);
  });

  it("uses semicolons only between statements", () => {
    const project = createStateProject([
      stateVariable({ id: "one", implementationName: "varOne", sortOrder: 10 }),
      stateVariable({ id: "two", implementationName: "varTwo", sortOrder: 20 })
    ]);

    expect(generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) }).formula).toBe("Set(varOne, Blank());\nSet(varTwo, Blank())\n");
  });

  it("does not add a semicolon to the final statement", () => {
    const formula = generatedFormulaForValue({ kind: "blank" });
    expect(formula.trimEnd().endsWith(";")).toBe(false);
  });

  it("ends formulas with exactly one newline", () => {
    expect(generatedFormulaForValue({ kind: "blank" })).toMatch(/[^\n]\n$/);
  });

  it("does not include Markdown fences", () => {
    expect(generatedFormulaForValue({ kind: "blank" })).not.toContain("```");
  });

  it("does not include comments or placeholders", () => {
    expect(generatedFormulaForValue({ kind: "blank" })).not.toMatch(/\/\/|\/\*|TODO|MISSING|\[|\]/);
  });

  it("changes generated checksum when formula output changes", () => {
    const a = createStateProject([stateVariable({ initialValue: { kind: "text", value: "A" } })]);
    const b = createStateProject([stateVariable({ initialValue: { kind: "text", value: "B" } })]);

    expect(generateStatePowerFxForAsset({ project: a, registry: approvedRegistryFor(a) }).generatedChecksum).not.toBe(generateStatePowerFxForAsset({ project: b, registry: approvedRegistryFor(b) }).generatedChecksum);
  });

  it("changes generated checksum when source checksum changes", () => {
    const a = createStateProject([stateVariable({ purpose: "A", initialValue: { kind: "blank" } })]);
    const b = createStateProject([stateVariable({ purpose: "B", initialValue: { kind: "blank" } })]);

    expect(generateStatePowerFxForAsset({ project: a, registry: approvedRegistryFor(a) }).formula).toBe(generateStatePowerFxForAsset({ project: b, registry: approvedRegistryFor(b) }).formula);
    expect(generateStatePowerFxForAsset({ project: a, registry: approvedRegistryFor(a) }).generatedChecksum).not.toBe(generateStatePowerFxForAsset({ project: b, registry: approvedRegistryFor(b) }).generatedChecksum);
  });

  it("changes generated checksum when variable order changes", () => {
    const a = createStateProject([
      stateVariable({ id: "one", implementationName: "varOne", sortOrder: 10 }),
      stateVariable({ id: "two", implementationName: "varTwo", sortOrder: 20 })
    ]);
    const b = createStateProject([
      stateVariable({ id: "one", implementationName: "varOne", sortOrder: 20 }),
      stateVariable({ id: "two", implementationName: "varTwo", sortOrder: 10 })
    ]);

    expect(generateStatePowerFxForAsset({ project: a, registry: approvedRegistryFor(a) }).generatedChecksum).not.toBe(generateStatePowerFxForAsset({ project: b, registry: approvedRegistryFor(b) }).generatedChecksum);
  });

  it("changes generated checksum when variable names change", () => {
    const a = createStateProject([stateVariable({ implementationName: "varOne" })]);
    const b = createStateProject([stateVariable({ implementationName: "varTwo" })]);

    expect(generateStatePowerFxForAsset({ project: a, registry: approvedRegistryFor(a) }).generatedChecksum).not.toBe(generateStatePowerFxForAsset({ project: b, registry: approvedRegistryFor(b) }).generatedChecksum);
  });

  it("changes generated checksum when initial-value kind changes", () => {
    const a = createStateProject([stateVariable({ initialValue: { kind: "blank" } })]);
    const b = createStateProject([stateVariable({ initialValue: { kind: "text", value: "" } })]);

    expect(generateStatePowerFxForAsset({ project: a, registry: approvedRegistryFor(a) }).generatedChecksum).not.toBe(generateStatePowerFxForAsset({ project: b, registry: approvedRegistryFor(b) }).generatedChecksum);
  });

  it("does not change generated checksum by timestamp", () => {
    const project = createStateProject();
    const first = approveRegistry(registryFor(project, "2026-07-16T12:00:00.000Z"), project);
    const second = approveRegistry(registryFor(project, "2099-01-01T00:00:00.000Z"), project);

    expect(generateStatePowerFxForAsset({ project, registry: first }).generatedChecksum).toBe(generateStatePowerFxForAsset({ project, registry: second }).generatedChecksum);
  });

  it("blocks changed variable values after approval", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets[0].initialValue = { kind: "text", value: "Changed" };

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks changed variable names after approval", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets[0].implementationName = "varChanged";

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks added variables after approval", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets.push(stateVariable({ id: "added", implementationName: "varAdded", sortOrder: 20 }));

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks removed variables after approval", () => {
    const project = createStateProject([
      stateVariable({ id: "one", implementationName: "varOne", sortOrder: 10 }),
      stateVariable({ id: "two", implementationName: "varTwo", sortOrder: 20 })
    ]);
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets = [stateVariable({ id: "one", implementationName: "varOne", sortOrder: 10 })];

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("blocks changed sort order after approval", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets[0].sortOrder = 20;

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("shows registry regeneration resets approval", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.stateVariableTargets[0].initialValue = { kind: "text", value: "Changed" };

    expect(stateAsset(normalizeImplementationAssetRegistry(registry, project)).approvalStatus).toBe("Review required");
  });

  it("permits updated generation after explicit reapproval", () => {
    const project = createStateProject();
    project.powerPlatform!.canvas!.stateVariableTargets[0].initialValue = { kind: "text", value: "Changed" };

    expect(generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) }).status).toBe("Generated");
  });

  it("does not let manually altered registry inputs bypass current project comparison", () => {
    const project = createStateProject();
    const registry = approvedMutatedAsset(approvedRegistryFor(project), (asset) => ({
      ...asset,
      generationInputs: {
        ...asset.generationInputs,
        stateVariables: asset.generationInputs!.stateVariables!.map((variable) => ({ ...variable, initialValue: { kind: "text", value: "Tampered" } }))
      }
    }));

    expect(generateStatePowerFxForAsset({ project, registry }).status).toBe("Blocked");
  });

  it("does not mutate project input", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const before = JSON.stringify(project);
    generateStatePowerFxForAsset({ project, registry });

    expect(JSON.stringify(project)).toBe(before);
  });

  it("does not mutate registry input", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const before = JSON.stringify(registry);
    generateStatePowerFxForAsset({ project, registry });

    expect(JSON.stringify(registry)).toBe(before);
  });

  it("does not mutate asset input", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const before = JSON.stringify(stateAsset(registry));
    generateStatePowerFxForAsset({ project, registry });

    expect(JSON.stringify(stateAsset(registry))).toBe(before);
  });

  it("does not mutate generation inputs", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);
    const before = JSON.stringify(stateAsset(registry).generationInputs);
    generateStatePowerFxForAsset({ project, registry });

    expect(JSON.stringify(stateAsset(registry).generationInputs)).toBe(before);
  });

  it("generates executable operations containing only Set", () => {
    const formula = generatedFormulaForValue({ kind: "text", value: "Patch(Accounts,{})" });

    expect(executableOperationCalls(formula)).toEqual(["Set"]);
  });

  it("does not execute Patch when Patch appears inside quoted text", () => {
    const formula = generatedFormulaForValue({ kind: "text", value: "Patch(Accounts,{})" });

    expect(executableOperationCalls(formula)).not.toContain("Patch");
  });

  it("does not execute ClearCollect when ClearCollect appears inside quoted text", () => {
    const formula = generatedFormulaForValue({ kind: "text", value: "ClearCollect(colA,[])" });

    expect(executableOperationCalls(formula)).not.toContain("ClearCollect");
  });

  it("does not introduce connector, entity, field, or relationship dependencies", () => {
    const project = createStateProject();
    const result = generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) });

    expect(result.dependencies).toEqual([]);
  });

  it("keeps navigation generation unchanged", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);

    expect(generatePowerFxForAsset({ project, registry, assetId: CANVAS_STATE_INITIALIZATION_ASSET_ID }).status).toBe("Blocked");
  });

  it("does not generate state formulas from navigation assets", () => {
    const project = createStateProject();
    const registry = approvedMutatedAsset(approvedRegistryFor(project), (asset) => ({
      ...asset,
      assetId: "asset-canvas-powerfx-control-submit-onselect",
      generationInputs: { ...asset.generationInputs, operation: "navigation" }
    }));

    expect(generateStatePowerFxForAsset({ project, registry, assetId: "asset-canvas-powerfx-control-submit-onselect" }).status).toBe("Blocked");
  });

  it("keeps state assets unsupported by the navigation generator", () => {
    const project = createStateProject();
    const registry = approvedRegistryFor(project);

    expect(generatePowerFxForAsset({ project, registry, assetId: CANVAS_STATE_INITIALIZATION_ASSET_ID }).formula).toBe("");
  });

  it("retains source traceability", () => {
    const project = createStateProject();
    const result = generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) });

    expect(result).toMatchObject({
      assetId: CANVAS_STATE_INITIALIZATION_ASSET_ID,
      projectId: "state-fx",
      appTargetId: "app-onstart-state-initialization",
      operation: CANVAS_STATE_INITIALIZATION_OPERATION,
      propertyName: "OnStart",
      intendedPath: CANVAS_STATE_INITIALIZATION_PATH,
      generationVersion: "phase-5b.2b"
    });
    expect(result.sourceChecksum).toBeTruthy();
    expect(result.generatedChecksum).toBeTruthy();
  });

  it("returns canonical App target ID for successful generation", () => {
    const project = createStateProject();

    expect(generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) }).appTargetId).toBe("app-onstart-state-initialization");
  });

  it("returns current project ID for successful generation", () => {
    const project = createStateProject();

    expect(generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) }).projectId).toBe(project.identity.id);
  });

  it("uses the canonical source checksum for successful generation", () => {
    const project = createStateProject();
    const result = generateStatePowerFxForAsset({ project, registry: approvedRegistryFor(project) });

    expect(result.sourceChecksum).toBe(stateAsset(registryFor(project)).contentChecksum);
  });
});
