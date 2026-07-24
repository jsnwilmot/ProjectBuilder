import { describe, expect, it } from "vitest";
import {
  COLLECTION_POWER_FX_GENERATION_VERSION,
  generateCollectionPowerFxForAsset,
  generateCollectionPowerFxForRegistry,
  type CollectionPowerFxGenerationResult
} from "../lib/collectionPowerFxGeneration";
import {
  CANVAS_COLLECTION_INITIALIZATION_ASSET_ID,
  CANVAS_COLLECTION_INITIALIZATION_OPERATION,
  CANVAS_COLLECTION_INITIALIZATION_PATH,
  CANVAS_COLLECTION_INITIALIZATION_TARGET_ID
} from "../lib/collectionInitialization";
import { createProject } from "../lib/createProject";
import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  normalizeImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import { generatePowerFxForAsset } from "../lib/powerFxGeneration";
import {
  createDefaultConnector,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import { generateStatePowerFxForAsset } from "../lib/statePowerFxGeneration";
import type { CanvasCollectionTarget, ProjectRecord } from "../types/project";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectionTarget(overrides: Partial<CanvasCollectionTarget> = {}): CanvasCollectionTarget {
  return {
    id: overrides.id ?? "collection-requests",
    implementationName: overrides.implementationName ?? "colRequests",
    purpose: overrides.purpose ?? "Load confirmed request records.",
    sourceConnectorId: overrides.sourceConnectorId ?? "connector-sharepoint",
    sourceEntityId: overrides.sourceEntityId ?? "list-requests",
    loadTrigger: overrides.loadTrigger ?? "appOnStart",
    loadMode: overrides.loadMode ?? "replace",
    dataScope: overrides.dataScope ?? "confirmedSmallBounded",
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function confirmedConnector(overrides: Partial<ReturnType<typeof createDefaultConnector>> = {}) {
  return createDefaultConnector({
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
    requiredConnectorPermissions: "Read list items.",
    permissionOwner: "SharePoint owner",
    permissionValidationMethod: "Owner confirmation.",
    permissionConfirmationStatus: "confirmed",
    delegationSupport: "Delegation supported for bounded loads.",
    limitations: "Only small bounded loading is approved.",
    approvalConfirmationStatus: "confirmed",
    ...overrides
  });
}

function createCanvasProject(collections: CanvasCollectionTarget[] = [collectionTarget()]): ProjectRecord {
  const project = createProject({
    identity: { id: "collection-project", projectName: "Collection Project" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Plan collection loading.",
      requiredFeatures: "Load small bounded data.",
      workflows: "Open app.",
      outOfScope: "Live deployment.",
      successCriteria: "Collections are reviewed.",
      accessibilityNotes: "Accessible behavior required.",
      permissionRules: "Least privilege.",
      screens: "Home",
      acceptanceNotes: "Plan is approved.",
      targetUsers: "Users",
      userRoles: "User"
    } as any
  });
  const pp = project.powerPlatform!;
  pp.common.environmentAccessStatus = "confirmed";
  pp.common.securityReviewStatus = "confirmed";
  pp.common.testingPlanConfirmationStatus = "confirmed";
  pp.common.connectors = [confirmedConnector()];
  const canvas = pp.canvas!;
  canvas.primaryDataSourceType = "sharePointList";
  canvas.primaryConnectorId = "connector-sharepoint";
  canvas.sourcePurpose = "Load request records.";
  canvas.sourceOwnership = "Operations owner.";
  canvas.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
  canvas.sharePointSiteTitle = "Operations";
  canvas.sharePointSiteOwner = "Operations owner";
  canvas.sharePointAccessStatus = "confirmed";
  canvas.sharePointListSchemas = [
    createDefaultSharePointList({
      id: "list-requests",
      displayName: "Requests",
      purpose: "Store request records.",
      expectedRecordCount: "50",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointList({
      id: "list-contacts",
      displayName: "Contacts",
      purpose: "Store contact records.",
      expectedRecordCount: "25",
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
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointColumn({
      id: "field-contact-title",
      parentType: "list",
      parentId: "list-contacts",
      displayName: "Title",
      internalName: "Title",
      columnType: "Single line of text",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.screenNamingConvention = "scrName";
  canvas.controlNamingConvention = "prefixName";
  canvas.controlTypePrefixes = "btn for buttons";
  canvas.variableNamingConvention = "varName";
  canvas.collectionNamingConvention = "colName";
  canvas.componentNamingConvention = "cmpName";
  canvas.formulaFileNamingConvention = "property.fx";
  canvas.yamlFileNamingConvention = "target.yaml";
  canvas.namingStandardConfirmationStatus = "confirmed";
  canvas.expectedRecordCounts = "50 confirmed records.";
  canvas.searchRequirements = "No automatic search is generated.";
  canvas.filteringRequirements = "No automatic filtering is generated.";
  canvas.sortingRequirements = "No automatic sorting is generated.";
  canvas.delegationRequirements = "Collection loading is limited to confirmed small bounded data.";
  canvas.delegationStatus = "confirmed";
  canvas.collectionTargets = collections;
  return project;
}

function createNonCanvasProject(): ProjectRecord {
  return createProject({
    identity: { id: "web-project", projectName: "Website" },
    client: { clientName: "Client", businessName: "Business" },
    intake: {
      appType: "businessWebsite",
      appPurpose: "Website.",
      requiredFeatures: "Pages.",
      workflows: "Browse.",
      targetUsers: "Visitors",
      userRoles: "Visitor"
    } as any
  });
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

function approvedRegistryFor(project: ProjectRecord, generatedAt = "2026-07-16T12:00:00.000Z"): ImplementationAssetRegistry {
  return approveRegistry(registryFor(project, generatedAt), project);
}

function collectionAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  const asset = registry.assets.find((item) => item.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID);
  if (!asset) throw new Error("Collection asset missing");
  return asset;
}

function withValidChecksum(asset: ImplementationAsset): ImplementationAsset {
  const withoutChecksum = { ...asset, contentChecksum: "" };
  return { ...asset, contentChecksum: calculateImplementationAssetChecksum(withoutChecksum) };
}

function replaceAsset(registry: ImplementationAssetRegistry, replacement: ImplementationAsset): ImplementationAssetRegistry {
  return {
    ...registry,
    assets: registry.assets.map((asset) => asset.assetId === replacement.assetId ? replacement : asset)
  };
}

function approvedResult(project = createCanvasProject()): CollectionPowerFxGenerationResult {
  return generateCollectionPowerFxForAsset({ project, registry: approvedRegistryFor(project) });
}

function blockedAfterAssetMutation(mutator: (asset: ImplementationAsset) => ImplementationAsset, project = createCanvasProject()): CollectionPowerFxGenerationResult {
  const registry = approvedRegistryFor(project);
  const mutated = withValidChecksum(mutator(clone(collectionAsset(registry))));
  return generateCollectionPowerFxForAsset({ project, registry: replaceAsset(registry, mutated) });
}

function expectBlocked(result: CollectionPowerFxGenerationResult): void {
  expect(result.status).toBe("Blocked");
  expect(result.formula).toBe("");
  expect(result.generatedChecksum).toBe("");
  expect(result.blockingIssues.length).toBeGreaterThan(0);
}

describe("collection Power Fx generation", () => {
  it("generates one controlled ClearCollect statement for a valid approved single target", () => {
    const result = approvedResult();
    expect(result.status).toBe("Generated");
    expect(result.formula).toBe("ClearCollect(colRequests, Requests)\n");
    expect(result.assetId).toBe(CANVAS_COLLECTION_INITIALIZATION_ASSET_ID);
    expect(result.projectId).toBe("collection-project");
    expect(result.targetId).toBe(CANVAS_COLLECTION_INITIALIZATION_TARGET_ID);
    expect(result.operation).toBe(CANVAS_COLLECTION_INITIALIZATION_OPERATION);
    expect(result.propertyName).toBe("OnStart");
    expect(result.intendedPath).toBe(CANVAS_COLLECTION_INITIALIZATION_PATH);
    expect(result.generationVersion).toBe(COLLECTION_POWER_FX_GENERATION_VERSION);
  });

  it("still generates when the unchanged approved stored source asset is Ready for Export", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    expect(collectionAsset(registry).assetStatus).toBe("Ready for Export");
    expect(generateCollectionPowerFxForAsset({ project, registry }).status).toBe("Generated");
  });

  it("generates multiple targets as one statement per line in canonical order", () => {
    const project = createCanvasProject([
      collectionTarget({ id: "collection-contacts", implementationName: "colContacts", sourceEntityId: "list-contacts", sortOrder: 20 }),
      collectionTarget({ id: "collection-requests", implementationName: "colRequests", sourceEntityId: "list-requests", sortOrder: 10 })
    ]);
    expect(approvedResult(project).formula).toBe("ClearCollect(colRequests, Requests);\nClearCollect(colContacts, Contacts)\n");
  });

  it("uses stable ID ordering when sort order ties are impossible in approved plans", () => {
    const project = createCanvasProject([
      collectionTarget({ id: "b-target", implementationName: "colB", sourceEntityId: "list-contacts", sortOrder: 20 }),
      collectionTarget({ id: "a-target", implementationName: "colA", sourceEntityId: "list-requests", sortOrder: 10 })
    ]);
    expect(approvedResult(project).orderedCollectionTargetIds).toEqual(["a-target", "b-target"]);
  });

  it("uses current collection and source implementation names", () => {
    const project = createCanvasProject([collectionTarget({ implementationName: "colCurrent" })]);
    project.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "CurrentRequests";
    expect(approvedResult(project).formula).toBe("ClearCollect(colCurrent, CurrentRequests)\n");
  });

  it("uses semicolons only between statements and not after the final statement", () => {
    const project = createCanvasProject([
      collectionTarget({ id: "one", implementationName: "colOne", sourceEntityId: "list-requests", sortOrder: 10 }),
      collectionTarget({ id: "two", implementationName: "colTwo", sourceEntityId: "list-contacts", sortOrder: 20 })
    ]);
    const formula = approvedResult(project).formula;
    expect(formula).toBe("ClearCollect(colOne, Requests);\nClearCollect(colTwo, Contacts)\n");
    expect(formula.trimEnd().endsWith(";")).toBe(false);
  });

  it("ends generated formula with exactly one trailing newline", () => {
    expect(approvedResult().formula).toMatch(/[^\n]\n$/);
    expect(approvedResult().formula).not.toMatch(/\n\n$/);
  });

  it("emits no Markdown, comments, prose, or placeholders", () => {
    const formula = approvedResult().formula;
    expect(formula).not.toContain("```");
    expect(formula).not.toContain("//");
    expect(formula).not.toContain("/*");
    expect(formula).not.toContain("#");
    expect(formula).not.toContain("[MISSING:");
    expect(formula).not.toContain("TODO");
  });

  it("returns no registry result when no collection targets and no stale source asset exist", () => {
    const project = createCanvasProject([]);
    expect(generateCollectionPowerFxForRegistry(project, approvedRegistryFor(project))).toEqual([]);
  });

  it("returns Not Applicable for a valid registry, Canvas project, no collection targets, and no stale asset", () => {
    const project = createCanvasProject([]);
    const result = generateCollectionPowerFxForAsset({ project, registry: approvedRegistryFor(project) });
    expect(result.status).toBe("Not Applicable");
  });

  it("blocks removed targets when a stale source asset remains", () => {
    const originalProject = createCanvasProject();
    const registry = approvedRegistryFor(originalProject);
    const currentProject = createCanvasProject([]);
    expectBlocked(generateCollectionPowerFxForAsset({ project: currentProject, registry }));
  });

  it("blocks missing and duplicate source assets", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    expectBlocked(generateCollectionPowerFxForAsset({ project, registry: { ...registry, assets: registry.assets.filter((asset) => asset.assetId !== CANVAS_COLLECTION_INITIALIZATION_ASSET_ID) } }));
    expectBlocked(generateCollectionPowerFxForAsset({ project, registry: { ...registry, assets: [...registry.assets, clone(collectionAsset(registry))] } }));
  });

  it.each([
    ["wrong project ID", (asset: ImplementationAsset) => ({ ...asset, projectId: "other-project" })],
    ["wrong platform", (asset: ImplementationAsset) => ({ ...asset, platform: "Power Platform" as const })],
    ["wrong category", (asset: ImplementationAsset) => ({ ...asset, assetCategory: "Asset plan" as const })],
    ["wrong asset type", (asset: ImplementationAsset) => ({ ...asset, assetType: "installationGuide" as const })],
    ["wrong target ID", (asset: ImplementationAsset) => ({ ...asset, targetId: "other-target" })],
    ["wrong operation", (asset: ImplementationAsset) => ({ ...asset, generationInputs: { ...asset.generationInputs, operation: "otherOperation" } })],
    ["wrong formula property", (asset: ImplementationAsset) => ({ ...asset, approvedPropertyName: "OnSelect", generationInputs: { ...asset.generationInputs, formulaProperty: "OnSelect" } })],
    ["wrong intended path", (asset: ImplementationAsset) => ({ ...asset, intendedPath: "07_Development/PowerFx/app/Other.fx" })],
    ["wrong generation version", (asset: ImplementationAsset) => ({ ...asset, generationVersion: "old-version" })],
    ["wrong required flag", (asset: ImplementationAsset) => ({ ...asset, required: false })],
    ["wrong applicability", (asset: ImplementationAsset) => ({ ...asset, applicabilityStatus: "undecided" as const })]
  ])("blocks %s", (_label, mutator) => {
    expectBlocked(blockedAfterAssetMutation(mutator));
  });

  it("blocks removed and replaced required gates", () => {
    expectBlocked(blockedAfterAssetMutation((asset) => ({ ...asset, requiredGateIds: asset.requiredGateIds.slice(1) })));
    expectBlocked(blockedAfterAssetMutation((asset) => ({ ...asset, requiredGateIds: ["schema", "namingStandards", "delegation", "environment"] as any })));
  });

  it("blocks stale dependencies and stale generation inputs", () => {
    expectBlocked(blockedAfterAssetMutation((asset) => ({ ...asset, dependencies: asset.dependencies.slice(1) })));
    expectBlocked(blockedAfterAssetMutation((asset) => ({
      ...asset,
      generationInputs: {
        ...asset.generationInputs,
        collectionTargets: asset.generationInputs!.collectionTargets!.map((target) => ({ ...target, implementationName: "colStale" }))
      }
    })));
  });

  it.each([
    ["Review Required", (asset: ImplementationAsset) => ({ ...asset, approvalStatus: "Review required" as const })],
    ["Blocked", (asset: ImplementationAsset) => ({ ...asset, blockingIssues: ["Manual blocker."] })],
    ["missing approval", (asset: ImplementationAsset) => ({ ...asset, approvalStatus: "Not reviewed" as const })],
    ["stale approved checksum", (asset: ImplementationAsset) => ({ ...asset, contentChecksum: "fnv1a-stale" })]
  ])("blocks %s source assets", (_label, mutator) => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    const mutated = mutator(clone(collectionAsset(registry)));
    expectBlocked(generateCollectionPowerFxForAsset({ project, registry: replaceAsset(registry, mutated) }));
  });

  it.each(["Blocked", "Draft", "Review Required", "Not Applicable", "Exported"] as const)("blocks stored %s source asset status even with valid approval and checksum", (assetStatus) => {
    const result = blockedAfterAssetMutation((asset) => ({ ...asset, assetStatus }));
    expect(result.status).toBe("Blocked");
    expect(result.formula).toBe("");
    expect(result.generatedChecksum).toBe("");
    expect(result.blockingIssues.join(" ")).toContain(`stored source status is ${assetStatus}`);
    expect(result.blockingIssues.join(" ")).toContain("Ready for Export is required");
  });

  it("blocks an unknown stored source asset status safely", () => {
    const result = blockedAfterAssetMutation((asset) => ({ ...asset, assetStatus: "Unknown" as any }));
    expect(result.status).toBe("Blocked");
    expect(result.formula).toBe("");
    expect(result.generatedChecksum).toBe("");
    expect(result.blockingIssues.join(" ")).toContain("malformed assetStatus");
  });

  it("blocks malformed unrelated asset status during complete registry validation", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    const unrelated = {
      ...clone(collectionAsset(registry)),
      assetId: "unrelated-malformed-status",
      assetStatus: "Unknown" as any
    };
    const result = generateCollectionPowerFxForAsset({ project, registry: { ...registry, assets: [...registry.assets, unrelated] } });
    expect(result.status).toBe("Blocked");
    expect(result.formula).toBe("");
    expect(result.generatedChecksum).toBe("");
    expect(result.blockingIssues.join(" ")).toContain("unrelated-malformed-status");
    expect(result.blockingIssues.join(" ")).toContain("malformed assetStatus");
  });

  it("blocks current project connector, entity, source name, collection name, data scope, confirmation, and gate changes", () => {
    const registry = approvedRegistryFor(createCanvasProject());
    const connectorChanged = createCanvasProject();
    connectorChanged.powerPlatform!.common.connectors[0].id = "connector-other";
    expectBlocked(generateCollectionPowerFxForAsset({ project: connectorChanged, registry }));
    const entityChanged = createCanvasProject();
    entityChanged.powerPlatform!.canvas!.sharePointListSchemas[0].id = "list-other";
    expectBlocked(generateCollectionPowerFxForAsset({ project: entityChanged, registry }));
    const sourceNameChanged = createCanvasProject();
    sourceNameChanged.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "ChangedRequests";
    expectBlocked(generateCollectionPowerFxForAsset({ project: sourceNameChanged, registry }));
    const collectionNameChanged = createCanvasProject();
    collectionNameChanged.powerPlatform!.canvas!.collectionTargets[0].implementationName = "colChanged";
    expectBlocked(generateCollectionPowerFxForAsset({ project: collectionNameChanged, registry }));
    const dataScopeChanged = createCanvasProject();
    dataScopeChanged.powerPlatform!.canvas!.collectionTargets[0].dataScope = "unknown";
    expectBlocked(generateCollectionPowerFxForAsset({ project: dataScopeChanged, registry }));
    const confirmationChanged = createCanvasProject();
    confirmationChanged.powerPlatform!.canvas!.collectionTargets[0].confirmationStatus = "reviewNeeded";
    expectBlocked(generateCollectionPowerFxForAsset({ project: confirmationChanged, registry }));
    const gateFailed = createCanvasProject();
    gateFailed.powerPlatform!.canvas!.delegationStatus = "blocked";
    expectBlocked(generateCollectionPowerFxForAsset({ project: gateFailed, registry }));
  });

  it.each([
    ["invalid collection identifier", createCanvasProject([collectionTarget({ implementationName: "col Requests" })])],
    ["invalid source identifier", (() => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "Request List";
      return project;
    })()],
    ["formula-looking collection name", createCanvasProject([collectionTarget({ implementationName: "Filter(Requests)" })])],
    ["formula-looking source name", (() => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "LookUp(Requests)";
      return project;
    })()]
  ])("blocks %s", (_label, project) => {
    expectBlocked(generateCollectionPowerFxForAsset({ project, registry: approvedRegistryFor(project) }));
  });

  it("does not accept raw formula input from structured purpose text", () => {
    const project = createCanvasProject([collectionTarget({ purpose: "Filter(Requests, true)" })]);
    const result = approvedResult(project);
    expect(result.status).toBe("Generated");
    expect(result.formula).not.toContain("Filter(");
  });

  it("changes formula checksum when order, collection name, or source name changes", () => {
    const first = approvedResult(createCanvasProject([
      collectionTarget({ id: "one", implementationName: "colOne", sourceEntityId: "list-requests", sortOrder: 10 }),
      collectionTarget({ id: "two", implementationName: "colTwo", sourceEntityId: "list-contacts", sortOrder: 20 })
    ]));
    const reordered = approvedResult(createCanvasProject([
      collectionTarget({ id: "one", implementationName: "colOne", sourceEntityId: "list-requests", sortOrder: 20 }),
      collectionTarget({ id: "two", implementationName: "colTwo", sourceEntityId: "list-contacts", sortOrder: 10 })
    ]));
    const renamedCollection = approvedResult(createCanvasProject([collectionTarget({ implementationName: "colRenamed" })]));
    const sourceRenamedProject = createCanvasProject();
    sourceRenamedProject.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "RenamedRequests";
    const sourceRenamed = approvedResult(sourceRenamedProject);
    expect(new Set([first.generatedChecksum, reordered.generatedChecksum, renamedCollection.generatedChecksum, sourceRenamed.generatedChecksum]).size).toBe(4);
  });

  it("does not change formula checksum for generation timestamps", () => {
    const project = createCanvasProject();
    const first = generateCollectionPowerFxForAsset({ project, registry: approvedRegistryFor(project, "2026-07-16T01:00:00.000Z") });
    const second = generateCollectionPowerFxForAsset({ project, registry: approvedRegistryFor(project, "2026-07-16T02:00:00.000Z") });
    expect(first.generatedChecksum).toBe(second.generatedChecksum);
  });

  it("keeps traceability to targets, connectors, entities, source names, and approved planning checksum", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    const source = collectionAsset(registry);
    const result = generateCollectionPowerFxForAsset({ project, registry });
    expect(result.traceability.approvedPlanningAssetId).toBe(CANVAS_COLLECTION_INITIALIZATION_ASSET_ID);
    expect(result.traceability.approvedPlanningChecksum).toBe(source.contentChecksum);
    expect(result.traceability.orderedCollectionTargetIds).toEqual(["collection-requests"]);
    expect(result.traceability.orderedConnectorIds).toEqual(["connector-sharepoint"]);
    expect(result.traceability.orderedEntityIds).toEqual(["list-requests"]);
    expect(result.traceability.orderedCollectionImplementationNames).toEqual(["colRequests"]);
    expect(result.traceability.orderedSourceImplementationNames).toEqual(["Requests"]);
  });

  it.each([
    ["null registry", null],
    ["primitive registry", 42],
    ["missing assets array", { registryVersion: 1, projectId: "collection-project", generationVersion: "phase-5a.2" }],
    ["malformed unrelated registry asset", (() => {
      const project = createCanvasProject();
      const registry = approvedRegistryFor(project);
      return { ...registry, assets: [...registry.assets, { assetId: "bad-asset" }] };
    })()],
    ["malformed nested generation inputs", (() => {
      const project = createCanvasProject();
      const registry = approvedRegistryFor(project);
      return replaceAsset(registry, {
        ...collectionAsset(registry),
        generationInputs: { ...collectionAsset(registry).generationInputs, collectionTargets: [null] as any }
      });
    })()],
    ["duplicate registry asset IDs", (() => {
      const project = createCanvasProject();
      const registry = approvedRegistryFor(project);
      const unrelated = { ...clone(collectionAsset(registry)), assetId: "duplicate-id" };
      return { ...registry, assets: [...registry.assets, unrelated, clone(unrelated)] };
    })()]
  ])("blocks safely for %s", (_label, registry) => {
    expectBlocked(generateCollectionPowerFxForAsset({ project: createCanvasProject(), registry }));
  });

  it("does not mutate project input, registry input, source asset, collection targets, connectors, or entities", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    const projectBefore = clone(project);
    const registryBefore = clone(registry);
    const sourceBefore = clone(collectionAsset(registry));
    const targetBefore = clone(project.powerPlatform!.canvas!.collectionTargets);
    const connectorBefore = clone(project.powerPlatform!.common.connectors);
    const entityBefore = clone(project.powerPlatform!.canvas!.sharePointListSchemas);
    expect(approvedResult(project).status).toBe("Generated");
    expect(project).toEqual(projectBefore);
    expect(registry).toEqual(registryBefore);
    expect(collectionAsset(registry)).toEqual(sourceBefore);
    expect(project.powerPlatform!.canvas!.collectionTargets).toEqual(targetBefore);
    expect(project.powerPlatform!.common.connectors).toEqual(connectorBefore);
    expect(project.powerPlatform!.canvas!.sharePointListSchemas).toEqual(entityBefore);
  });

  it("keeps collection planning assets rejected by scalar and navigation generation", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    expect(generateStatePowerFxForAsset({ project, registry, assetId: CANVAS_COLLECTION_INITIALIZATION_ASSET_ID }).status).not.toBe("Generated");
    expect(generatePowerFxForAsset({ project, registry, assetId: CANVAS_COLLECTION_INITIALIZATION_ASSET_ID }).status).not.toBe("Generated");
  });

  it("does not generate prohibited phase-boundary formulas or combine scalar fragments", () => {
    const result = approvedResult();
    expect(result.formula).toContain("ClearCollect(");
    expect(result.formula).not.toMatch(/^Collect\(/m);
    expect(result.formula).not.toMatch(/^Clear\(/m);
    expect(result.formula).not.toContain("Patch(");
    expect(result.formula).not.toContain("Remove(");
    expect(result.formula).not.toContain("RemoveIf(");
    expect(result.formula).not.toContain("SubmitForm(");
    expect(result.formula).not.toContain("UpdateContext(");
    expect(result.formula).not.toContain("Set(");
    expect(result.formula).not.toContain("Navigate(");
    expect(result.formula).not.toContain("Filter(");
    expect(result.formula).not.toContain("Search(");
    expect(result.formula).not.toContain("Sort(");
    expect(result.formula).not.toContain("SortByColumns(");
    expect(result.formula).not.toContain("LookUp(");
    expect(result.formula).not.toContain("ShowColumns(");
    expect(result.formula).not.toContain("DropColumns(");
    expect(result.formula).not.toContain("AddColumns(");
    expect(result.formula).not.toContain("RenameColumns(");
    expect(result.formula).not.toContain("ForAll(");
    expect(result.formula).not.toContain("Concurrent(");
    expect(result.formula).not.toContain("YAML");
  });

  it("blocks non-Canvas projects instead of hiding them as not applicable", () => {
    expectBlocked(generateCollectionPowerFxForAsset({ project: createNonCanvasProject(), registry: { registryVersion: 1, projectId: "web-project", generationVersion: "phase-5a.2", assets: [] } }));
  });
});
