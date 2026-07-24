import {
  CANVAS_COLLECTION_INITIALIZATION_ASSET_ID,
  CANVAS_COLLECTION_INITIALIZATION_OPERATION,
  CANVAS_COLLECTION_INITIALIZATION_PATH,
  CANVAS_COLLECTION_INITIALIZATION_TARGET_ID,
  normalizeCanvasCollectionTargets,
  orderCanvasCollectionTargets,
  validateCanvasCollectionTargets
} from "../lib/collectionInitialization";
import { createProject } from "../lib/createProject";
import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  createImplementationAssetManifest,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetDependencies,
  evaluateImplementationAssetStatus,
  normalizeImplementationAssetRegistry,
  validateImplementationAssetManifest,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import { generatePowerFxForAsset } from "../lib/powerFxGeneration";
import {
  createDefaultConnector,
  createDefaultConnectorField,
  createDefaultConnectorResource,
  createDefaultDataverseColumn,
  createDefaultDataverseTable,
  createDefaultSharePointColumn,
  createDefaultSharePointList,
  normalizePowerPlatformData
} from "../lib/powerPlatform";
import { generateStatePowerFxForAsset } from "../lib/statePowerFxGeneration";
import type { CanvasCollectionTarget, ProjectRecord } from "../types/project";

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

function collectionAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  const asset = registry.assets.find((item) => item.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID);
  if (!asset) throw new Error("Collection asset missing");
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

function registryWithCollectionAsset(registry: ImplementationAssetRegistry, replacement: ImplementationAsset): ImplementationAssetRegistry {
  return {
    ...registry,
    assets: registry.assets.map((asset) => asset.assetId === replacement.assetId ? replacement : asset)
  };
}

function approvedMutatedCollectionRegistry(
  project: ProjectRecord,
  mutate: (asset: ImplementationAsset) => ImplementationAsset,
  recalculateChecksum = false
): ImplementationAssetRegistry {
  const registry = approvedRegistryFor(project);
  const mutated = mutate(structuredClone(collectionAsset(registry)));
  return registryWithCollectionAsset(registry, recalculateChecksum ? withValidChecksum(mutated) : mutated);
}

function derivedCollectionAsset(project: ProjectRecord, registry = approvedRegistryFor(project)): ImplementationAsset {
  const asset = deriveImplementationAssetRegistryState(project, registry.assets).assets.find((item) => item.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID);
  if (!asset) throw new Error("Derived collection asset missing");
  return asset;
}

function checksumFor(project: ProjectRecord, generatedAt = "2026-07-16T12:00:00.000Z"): string {
  return collectionAsset(registryFor(project, generatedAt)).contentChecksum;
}

function derivedFromMutatedCollection(
  project: ProjectRecord,
  mutate: (asset: ImplementationAsset) => ImplementationAsset,
  recalculateChecksum = false
): ImplementationAsset {
  return derivedCollectionAsset(project, approvedMutatedCollectionRegistry(project, mutate, recalculateChecksum));
}

describe("Canvas collection initialization planning", () => {
  it("defaults new Canvas projects to an empty collection list", () => {
    expect(createCanvasProject([]).powerPlatform!.canvas!.collectionTargets).toEqual([]);
  });

  it("normalizes legacy Canvas projects missing the collection list safely", () => {
    const project = createCanvasProject();
    const legacy = { ...project.powerPlatform!, canvas: { ...project.powerPlatform!.canvas!, collectionTargets: undefined } };

    expect(normalizePowerPlatformData(legacy, "powerAppsCanvas")!.canvas!.collectionTargets).toEqual([]);
  });

  it("ignores malformed collection records without throwing", () => {
    expect(() => normalizeCanvasCollectionTargets([null, "bad", { id: "incomplete" }])).not.toThrow();
    expect(normalizeCanvasCollectionTargets([null, "bad", { id: "incomplete" }])).toEqual([]);
  });

  it("normalizes valid collection records", () => {
    const normalized = normalizeCanvasCollectionTargets([{ ...collectionTarget(), id: "  collection-requests  ", implementationName: " colRequests " }]);

    expect(normalized[0]).toMatchObject({ id: "collection-requests", implementationName: "colRequests" });
  });

  it("blocks invalid collection names", () => {
    const project = createCanvasProject([collectionTarget({ implementationName: "col Requests" })]);

    expect(validateCanvasCollectionTargets(project, project.powerPlatform!.canvas!.collectionTargets).blockingIssues[0]).toContain("simple Power Fx identifier");
  });

  it("blocks duplicate IDs", () => {
    const project = createCanvasProject([collectionTarget({ id: "dup", sortOrder: 10 }), collectionTarget({ id: "dup", implementationName: "colOther", sortOrder: 20 })]);

    expect(validateCanvasCollectionTargets(project, project.powerPlatform!.canvas!.collectionTargets).blockingIssues).toContain("Duplicate collection target ID: dup.");
  });

  it("blocks duplicate names", () => {
    const project = createCanvasProject([collectionTarget({ id: "one", implementationName: "colSame", sortOrder: 10 }), collectionTarget({ id: "two", implementationName: "colSame", sortOrder: 20 })]);

    expect(validateCanvasCollectionTargets(project, project.powerPlatform!.canvas!.collectionTargets).blockingIssues).toContain("Duplicate collection implementation name: colSame.");
  });

  it("blocks case-insensitive duplicate names", () => {
    const project = createCanvasProject([collectionTarget({ id: "one", implementationName: "colSame", sortOrder: 10 }), collectionTarget({ id: "two", implementationName: "COLSAME", sortOrder: 20 })]);

    expect(validateCanvasCollectionTargets(project, project.powerPlatform!.canvas!.collectionTargets).blockingIssues).toContain("Duplicate collection implementation name: COLSAME.");
  });

  it("blocks duplicate sort orders", () => {
    const project = createCanvasProject([collectionTarget({ id: "one", implementationName: "colOne", sortOrder: 10 }), collectionTarget({ id: "two", implementationName: "colTwo", sortOrder: 10 })]);

    expect(validateCanvasCollectionTargets(project, project.powerPlatform!.canvas!.collectionTargets).blockingIssues).toContain("Duplicate collection target sort order 10: one, two.");
  });

  it("orders collections by sort order then stable ID", () => {
    const ordered = orderCanvasCollectionTargets([
      collectionTarget({ id: "b", implementationName: "colB", sortOrder: 20 }),
      collectionTarget({ id: "a", implementationName: "colA", sortOrder: 20 }),
      collectionTarget({ id: "c", implementationName: "colC", sortOrder: 10 })
    ]);

    expect(ordered.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("creates no asset when there are no collection targets", () => {
    expect(registryFor(createCanvasProject([])).assets.some((asset) => asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID)).toBe(false);
  });

  it("creates one planning asset for one valid target", () => {
    const asset = collectionAsset(registryFor(createCanvasProject()));

    expect(asset).toMatchObject({
      assetId: CANVAS_COLLECTION_INITIALIZATION_ASSET_ID,
      targetId: CANVAS_COLLECTION_INITIALIZATION_TARGET_ID,
      intendedPath: CANVAS_COLLECTION_INITIALIZATION_PATH,
      approvedPropertyName: "OnStart"
    });
  });

  it("creates one combined planning asset for multiple valid targets", () => {
    const project = createCanvasProject([
      collectionTarget({ id: "one", implementationName: "colOne", sortOrder: 10 }),
      collectionTarget({ id: "two", implementationName: "colTwo", sortOrder: 20 })
    ]);

    expect(registryFor(project).assets.filter((asset) => asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID)).toHaveLength(1);
    expect(collectionAsset(registryFor(project)).generationInputs!.collectionTargets).toHaveLength(2);
  });

  it("includes structured collection inputs", () => {
    const input = collectionAsset(registryFor(createCanvasProject())).generationInputs!.collectionTargets![0];

    expect(input).toMatchObject({
      id: "collection-requests",
      implementationName: "colRequests",
      sourceConnectorId: "connector-sharepoint",
      sourceEntityId: "list-requests",
      sourceImplementationName: "Requests",
      loadTrigger: "appOnStart",
      loadMode: "replace",
      dataScope: "confirmedSmallBounded"
    });
  });

  it("planning content contains no executable ClearCollect call", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).sourceContent).not.toContain("ClearCollect(");
  });

  it("planning content contains no executable Collect call", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).sourceContent).not.toContain("Collect(");
  });

  it("planning content contains no executable Clear call", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).sourceContent).not.toContain("Clear(");
  });

  it("blocks missing connector IDs", () => {
    const project = createCanvasProject([collectionTarget({ sourceConnectorId: "" })]);

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("blocks missing entity IDs", () => {
    const project = createCanvasProject([collectionTarget({ sourceEntityId: "" })]);

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("blocks unknown connectors", () => {
    const project = createCanvasProject([collectionTarget({ sourceConnectorId: "missing-connector" })]);

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("blocks unknown entities", () => {
    const project = createCanvasProject([collectionTarget({ sourceEntityId: "missing-entity" })]);

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("blocks entity and connector mismatches", () => {
    const project = createCanvasProject([collectionTarget({ sourceConnectorId: "connector-dataverse" })]);
    project.powerPlatform!.common.connectors.push(confirmedConnector({ id: "connector-dataverse", dataSourceName: "Dataverse", dataSourceType: "dataverse", canvasRole: "secondary" }));
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "dataverse"];
    project.powerPlatform!.canvas!.secondaryConnectorIds = ["connector-dataverse"];

    expect(collectionAsset(registryFor(project)).blockingIssues.some((issue) => issue.includes("belongs to connector"))).toBe(true);
  });

  it("blocks unconfirmed connectors", () => {
    const project = createCanvasProject();
    project.powerPlatform!.common.connectors[0].approvalConfirmationStatus = "missingInformation";

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("blocks unconfirmed entities", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.sharePointListSchemas[0].confirmationStatus = "reviewNeeded";

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("blocks missing source implementation names", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "";

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("blocks unknown data scope", () => {
    const project = createCanvasProject([collectionTarget({ dataScope: "unknown" })]);

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("blocks large or unbounded data scope", () => {
    const project = createCanvasProject([collectionTarget({ dataScope: "largeOrUnbounded" })]);

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("permits confirmed small bounded scope for review", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).assetStatus).toBe("Review Required");
  });

  it("blocks required unconfirmed collections", () => {
    const project = createCanvasProject([collectionTarget({ confirmationStatus: "reviewNeeded" })]);

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Blocked");
  });

  it("excludes optional unconfirmed collections from applicable inputs", () => {
    const project = createCanvasProject([collectionTarget({ required: false, confirmationStatus: "reviewNeeded" })]);

    expect(registryFor(project).assets.some((asset) => asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID)).toBe(false);
  });

  it("creates connector dependency", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).dependencies.some((item) => item.type === "connector")).toBe(true);
  });

  it("creates entity dependency", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).dependencies.some((item) => item.type === "entity")).toBe(true);
  });

  it("creates no field dependency", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).dependencies.some((item) => item.type === "field")).toBe(false);
  });

  it("creates no relationship dependency", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).dependencies.some((item) => item.id.includes("relationship"))).toBe(false);
  });

  it("creates no credential or environment dependency", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).dependencies.some((item) => item.type === "environmentVariable" || item.type === "connectionReference")).toBe(false);
  });

  it("begins as Review Required", () => {
    expect(collectionAsset(registryFor(createCanvasProject())).assetStatus).toBe("Review Required");
  });

  it("explicit approval permits Ready for Export", () => {
    const project = createCanvasProject();

    expect(collectionAsset(approvedRegistryFor(project)).assetStatus).toBe("Ready for Export");
  });

  it("keeps unchanged approved collection plans Ready for Export after current-state derivation", () => {
    const project = createCanvasProject();

    expect(derivedCollectionAsset(project).assetStatus).toBe("Ready for Export");
  });

  it("restores the canonical four required gates during current-state derivation", () => {
    const project = createCanvasProject();
    const derived = derivedFromMutatedCollection(project, (asset) => ({ ...asset, requiredGateIds: [] }));

    expect(derived.requiredGateIds).toEqual(["connectorSelection", "schema", "namingStandards", "delegation"]);
  });

  it("removing stored required gates invalidates approval", () => {
    const project = createCanvasProject();
    const derived = derivedFromMutatedCollection(project, (asset) => ({ ...asset, requiredGateIds: [] }));

    expect(derived.approvalStatus).toBe("Review required");
  });

  it("replacing stored required gates invalidates approval", () => {
    const project = createCanvasProject();
    const derived = derivedFromMutatedCollection(project, (asset) => ({ ...asset, requiredGateIds: ["security"] as any }));

    expect(derived.approvalStatus).toBe("Review required");
  });

  it("empty stored gate snapshots do not bypass current gate evaluation", () => {
    const project = createCanvasProject();
    const derived = derivedFromMutatedCollection(project, (asset) => ({ ...asset, gateEvaluationSnapshot: [] }));

    expect(derived.gateEvaluationSnapshot).toHaveLength(4);
  });

  it("blocks failing current naming gates even when stored gates are empty", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.namingStandardConfirmationStatus = "missingInformation";
    const derived = derivedFromMutatedCollection(project, (asset) => ({ ...asset, requiredGateIds: [], gateEvaluationSnapshot: [] }));

    expect(derived.assetStatus).toBe("Blocked");
    expect(derived.approvalStatus).toBe("Review required");
  });

  it("blocks failing current connector-selection gates", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.sourcePurpose = "";

    expect(derivedCollectionAsset(project).assetStatus).toBe("Blocked");
  });

  it("blocks failing current schema gates", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.sharePointSiteUrl = "";

    expect(derivedCollectionAsset(project).assetStatus).toBe("Blocked");
  });

  it("blocks failing current delegation gates", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.delegationRequirements = "";

    expect(derivedCollectionAsset(project).assetStatus).toBe("Blocked");
  });

  it("excludes stale gate contracts from Ready counts", () => {
    const project = createCanvasProject();
    const registry = approvedMutatedCollectionRegistry(project, (asset) => ({ ...asset, requiredGateIds: [] }));
    const state = deriveImplementationAssetRegistryState(project, registry.assets);

    expect(state.summary.readyAssetCount).toBe(0);
  });

  it("does not show stale gate contracts as Ready in manifests", () => {
    const project = createCanvasProject();
    const registry = approvedMutatedCollectionRegistry(project, (asset) => ({ ...asset, requiredGateIds: [] }));
    const manifest = createImplementationAssetManifest(registry, project);
    const manifestAsset = manifest.assets.find((asset) => asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID);

    expect(manifestAsset?.status).not.toBe("Ready for Export");
  });

  it("does not treat stale gate contracts as Ready installation dependencies", () => {
    const project = createCanvasProject();
    const derived = derivedFromMutatedCollection(project, (asset) => ({ ...asset, requiredGateIds: [] }));

    expect(evaluateImplementationAssetStatus(derived)).not.toBe("Ready for Export");
  });

  it("altering stored platform invalidates approval", () => {
    const project = createCanvasProject();

    expect(derivedFromMutatedCollection(project, (asset) => ({ ...asset, platform: "Power Platform" }), true).approvalStatus).toBe("Review required");
  });

  it("altering stored asset category invalidates approval", () => {
    const project = createCanvasProject();

    expect(derivedFromMutatedCollection(project, (asset) => ({ ...asset, assetCategory: "Asset plan" }), true).approvalStatus).toBe("Review required");
  });

  it("altering stored asset type invalidates approval", () => {
    const project = createCanvasProject();

    expect(derivedFromMutatedCollection(project, (asset) => ({ ...asset, assetType: "validationChecklist" }), true).approvalStatus).toBe("Review required");
  });

  it("altering stored target ID invalidates approval", () => {
    const project = createCanvasProject();

    expect(derivedFromMutatedCollection(project, (asset) => ({ ...asset, targetId: "other-target" }), true).approvalStatus).toBe("Review required");
  });

  it("altering stored target display name invalidates approval", () => {
    const project = createCanvasProject();

    expect(derivedFromMutatedCollection(project, (asset) => ({ ...asset, targetDisplayName: "Other display" }), true).approvalStatus).toBe("Review required");
  });

  it("altering stored intended path invalidates approval", () => {
    const project = createCanvasProject();

    expect(derivedFromMutatedCollection(project, (asset) => ({ ...asset, intendedPath: "07_Development/PowerFx/other.fx" }), true).approvalStatus).toBe("Review required");
  });

  it("altering stored approved property invalidates approval", () => {
    const project = createCanvasProject();

    expect(derivedFromMutatedCollection(project, (asset) => ({ ...asset, approvedPropertyName: "OnVisible" }), true).approvalStatus).toBe("Review required");
  });

  it("rebuilds current connector and entity dependencies canonically", () => {
    const project = createCanvasProject();
    const derived = derivedFromMutatedCollection(project, (asset) => ({
      ...asset,
      dependencies: [{
        id: "field:stale",
        type: "field",
        label: "Stale field",
        targetRecordId: "field-stale",
        required: true,
        resolved: true,
        resolutionReason: "Stale.",
        sourceSection: "Stale"
      } as any]
    }), true);

    expect(derived.dependencies.map((dependency) => dependency.type).sort()).toEqual(["connector", "entity"]);
  });

  it("collection addition changes checksum", () => {
    expect(checksumFor(createCanvasProject())).not.toBe(checksumFor(createCanvasProject([collectionTarget(), collectionTarget({ id: "two", implementationName: "colTwo", sortOrder: 20 })])));
  });

  it("collection removal changes checksum", () => {
    expect(checksumFor(createCanvasProject([collectionTarget(), collectionTarget({ id: "two", implementationName: "colTwo", sortOrder: 20 })]))).not.toBe(checksumFor(createCanvasProject()));
  });

  it("collection rename changes checksum", () => {
    expect(checksumFor(createCanvasProject())).not.toBe(checksumFor(createCanvasProject([collectionTarget({ implementationName: "colRenamed" })])));
  });

  it("connector change changes checksum", () => {
    expect(checksumFor(createCanvasProject())).not.toBe(checksumFor(createCanvasProject([collectionTarget({ sourceConnectorId: "other" })])));
  });

  it("entity change changes checksum", () => {
    expect(checksumFor(createCanvasProject())).not.toBe(checksumFor(createCanvasProject([collectionTarget({ sourceEntityId: "other" })])));
  });

  it("source implementation-name change changes checksum", () => {
    const a = createCanvasProject();
    const b = createCanvasProject();
    b.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "RequestsRenamed";

    expect(checksumFor(a)).not.toBe(checksumFor(b));
  });

  it("data-scope change changes checksum", () => {
    expect(checksumFor(createCanvasProject())).not.toBe(checksumFor(createCanvasProject([collectionTarget({ dataScope: "unknown" })])));
  });

  it("confirmation change changes checksum", () => {
    expect(checksumFor(createCanvasProject())).not.toBe(checksumFor(createCanvasProject([collectionTarget({ confirmationStatus: "reviewNeeded" })])));
  });

  it("sort-order change changes checksum", () => {
    expect(checksumFor(createCanvasProject())).not.toBe(checksumFor(createCanvasProject([collectionTarget({ sortOrder: 20 })])));
  });

  it("timestamp does not alter checksum", () => {
    const project = createCanvasProject();

    expect(checksumFor(project, "2026-07-16T12:00:00.000Z")).toBe(checksumFor(project, "2099-01-01T00:00:00.000Z"));
  });

  it("changed checksum resets approval", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.collectionTargets[0].implementationName = "colChanged";

    expect(derivedCollectionAsset(project, registry).approvalStatus).toBe("Review required");
  });

  it("stale collection plan is excluded from Ready counts", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.collectionTargets[0].implementationName = "colChanged";
    const state = deriveImplementationAssetRegistryState(project, registry.assets);

    expect(state.summary.readyAssetCount).toBe(0);
  });

  it("stale collection plan is not Ready in manifests", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.collectionTargets[0].implementationName = "colChanged";
    const staleRegistry = { ...registry, assets: deriveImplementationAssetRegistryState(project, registry.assets).assets };
    const manifest = createImplementationAssetManifest(staleRegistry, project);
    const manifestAsset = manifest.assets.find((asset) => asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID);

    expect(validateImplementationAssetManifest(manifest, staleRegistry, project)).toContain("Registry integrity: Registry summary readyAssetCount is stale.");
    expect(manifestAsset?.status).not.toBe("Ready for Export");
  });

  it("installation dependency does not treat stale collection plan as Ready", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);
    project.powerPlatform!.canvas!.collectionTargets[0].implementationName = "colChanged";
    evaluateImplementationAssetDependencies(project, registry.assets);

    expect(evaluateImplementationAssetStatus(derivedCollectionAsset(project, registry))).toBe("Review Required");
  });

  it("collection asset is rejected by scalar state generator", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);

    expect(generateStatePowerFxForAsset({ project, registry, assetId: CANVAS_COLLECTION_INITIALIZATION_ASSET_ID }).status).not.toBe("Generated");
  });

  it("collection asset is rejected by navigation generator", () => {
    const project = createCanvasProject();
    const registry = approvedRegistryFor(project);

    expect(generatePowerFxForAsset({ project, registry, assetId: CANVAS_COLLECTION_INITIALIZATION_ASSET_ID }).status).toBe("Blocked");
  });

  it("does not mutate project or registry inputs", () => {
    const project = createCanvasProject();
    const registry = registryFor(project);
    const projectBefore = JSON.stringify(project);
    const registryBefore = JSON.stringify(registry);

    deriveImplementationAssetRegistryState(project, registry.assets);

    expect(JSON.stringify(project)).toBe(projectBefore);
    expect(JSON.stringify(registry)).toBe(registryBefore);
  });

  it("generates no executable collection formula", () => {
    const asset = collectionAsset(registryFor(createCanvasProject()));

    expect(JSON.stringify(asset)).not.toContain("ClearCollect(");
  });

  it("keeps Phase 5B.2D functionality absent", () => {
    expect(CANVAS_COLLECTION_INITIALIZATION_OPERATION).toBe("appOnStartCollectionLoading");
    expect(collectionAsset(registryFor(createCanvasProject())).knownLimitations.join(" ")).toContain("Phase 5B.2D");
  });

  it("uses the canonical collection operation and OnStart property", () => {
    const asset = collectionAsset(registryFor(createCanvasProject()));

    expect(asset.generationInputs).toMatchObject({
      operation: CANVAS_COLLECTION_INITIALIZATION_OPERATION,
      formulaProperty: "OnStart"
    });
  });

  it("does not include fields or relationships in structured inputs", () => {
    const input = collectionAsset(registryFor(createCanvasProject())).generationInputs!.collectionTargets![0];

    expect(Object.keys(input)).not.toContain("fieldIds");
    expect(Object.keys(input)).not.toContain("relationshipIds");
  });

  it("keeps raw formula-looking collection target IDs intact in structured inputs", () => {
    const project = createCanvasProject([collectionTarget({ id: "ClearCollect(collection)" })]);
    const input = collectionAsset(registryFor(project)).generationInputs!.collectionTargets![0];

    expect(input.id).toBe("ClearCollect(collection)");
  });

  it("valid collection plans produce deterministic safe readable content", () => {
    const first = collectionAsset(registryFor(createCanvasProject())).sourceContent;
    const second = collectionAsset(registryFor(createCanvasProject())).sourceContent;

    expect(first).toBe(second);
    expect(first).toContain("collection and source identifiers stored structurally");
  });

  it("blocked collection plans report blocking issue count", () => {
    const project = createCanvasProject([collectionTarget({ sourceConnectorId: "Collect(connector)" })]);
    const content = collectionAsset(registryFor(project)).sourceContent;

    expect(content).toContain("collection planning issues are stored structurally");
    expect(content).toMatch(/- \d+ collection planning issues are stored structurally\./);
  });

  it("blocked collection plans direct reviewers to structured blocking issues", () => {
    const project = createCanvasProject([collectionTarget({ sourceConnectorId: "Collect(connector)" })]);

    expect(collectionAsset(registryFor(project)).sourceContent).toContain("Review the asset blockingIssues field.");
  });

  it("raw blocking issue details remain intact structurally", () => {
    const project = createCanvasProject([collectionTarget({ sourceConnectorId: "Collect(connector)" })]);

    expect(collectionAsset(registryFor(project)).blockingIssues.some((issue) => issue.includes("Collect(connector)"))).toBe(true);
  });

  it("does not print raw ClearCollect from collection target IDs in source content", () => {
    const project = createCanvasProject([collectionTarget({ id: "ClearCollect(collection)" })]);

    expect(collectionAsset(registryFor(project)).sourceContent).not.toContain("ClearCollect(");
  });

  it("does not print raw Collect from connector IDs in source content", () => {
    const project = createCanvasProject([collectionTarget({ sourceConnectorId: "Collect(connector)" })]);
    project.powerPlatform!.common.connectors[0].id = "Collect(connector)";
    project.powerPlatform!.canvas!.primaryConnectorId = "Collect(connector)";

    expect(collectionAsset(registryFor(project)).generationInputs!.collectionTargets![0].sourceConnectorId).toBe("Collect(connector)");
    expect(collectionAsset(registryFor(project)).sourceContent).not.toContain("Collect(");
  });

  it("does not print raw Patch from entity IDs in source content", () => {
    const project = createCanvasProject([collectionTarget({ sourceEntityId: "Patch(entity)" })]);
    project.powerPlatform!.canvas!.sharePointListSchemas[0].id = "Patch(entity)";
    project.powerPlatform!.canvas!.sharePointColumnSchemas[0].parentId = "Patch(entity)";

    expect(collectionAsset(registryFor(project)).generationInputs!.collectionTargets![0].sourceEntityId).toBe("Patch(entity)");
    expect(collectionAsset(registryFor(project)).sourceContent).not.toContain("Patch(");
  });

  it("does not print raw Set from purpose text in source content", () => {
    const project = createCanvasProject([collectionTarget({ purpose: "Set(varInjected,true)" })]);

    expect(collectionAsset(registryFor(project)).generationInputs!.collectionTargets![0].purpose).toBe("Set(varInjected,true)");
    expect(collectionAsset(registryFor(project)).sourceContent).not.toContain("Set(");
  });

  it("does not print raw formula-looking invalid source implementation names", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "Navigate(scrInjected)";

    expect(collectionAsset(registryFor(project)).blockingIssues.some((issue) => issue.includes("Navigate(scrInjected)"))).toBe(true);
    expect(collectionAsset(registryFor(project)).sourceContent).not.toContain("Navigate(");
  });

  it("does not print raw duplicate target IDs", () => {
    const project = createCanvasProject([
      collectionTarget({ id: "ClearCollect(dup)", implementationName: "colOne", sortOrder: 10 }),
      collectionTarget({ id: "ClearCollect(dup)", implementationName: "colTwo", sortOrder: 20 })
    ]);

    expect(collectionAsset(registryFor(project)).blockingIssues.some((issue) => issue.includes("ClearCollect(dup)"))).toBe(true);
    expect(collectionAsset(registryFor(project)).sourceContent).not.toContain("ClearCollect(");
  });

  it("does not print raw duplicate collection names", () => {
    const project = createCanvasProject([
      collectionTarget({ id: "one", implementationName: "CollectName", sortOrder: 10 }),
      collectionTarget({ id: "two", implementationName: "CollectName", sortOrder: 20 })
    ]);

    expect(collectionAsset(registryFor(project)).blockingIssues.some((issue) => issue.includes("CollectName"))).toBe(true);
    expect(collectionAsset(registryFor(project)).sourceContent).not.toContain("CollectName");
  });

  it("does not print raw optional-target missing-decision text with arbitrary identifiers", () => {
    const project = createCanvasProject([
      collectionTarget({ id: "confirmed", implementationName: "colConfirmed", sortOrder: 10 }),
      collectionTarget({ id: "Set(optionalTarget)", implementationName: "colOptional", required: false, confirmationStatus: "reviewNeeded", sortOrder: 20 })
    ]);

    expect(collectionAsset(registryFor(project)).knownLimitations.some((item) => item.includes("Set(optionalTarget)"))).toBe(true);
    expect(collectionAsset(registryFor(project)).sourceContent).not.toContain("Set(");
  });

  it("different hidden target IDs produce different checksums", () => {
    expect(checksumFor(createCanvasProject([collectionTarget({ id: "hidden-one" })]))).not.toBe(checksumFor(createCanvasProject([collectionTarget({ id: "hidden-two" })])));
  });

  it("different hidden connector IDs produce different checksums", () => {
    const one = createCanvasProject([collectionTarget({ sourceConnectorId: "connector-one" })]);
    one.powerPlatform!.common.connectors[0].id = "connector-one";
    one.powerPlatform!.canvas!.primaryConnectorId = "connector-one";
    const two = createCanvasProject([collectionTarget({ sourceConnectorId: "connector-two" })]);
    two.powerPlatform!.common.connectors[0].id = "connector-two";
    two.powerPlatform!.canvas!.primaryConnectorId = "connector-two";

    expect(checksumFor(one)).not.toBe(checksumFor(two));
  });

  it("different hidden blocking details produce different checksums", () => {
    expect(checksumFor(createCanvasProject([collectionTarget({ sourceEntityId: "Patch(one)" })]))).not.toBe(checksumFor(createCanvasProject([collectionTarget({ sourceEntityId: "Patch(two)" })])));
  });

  it("safe source-content formatting is deterministic", () => {
    const project = createCanvasProject([collectionTarget({ id: "ClearCollect(collection)", purpose: "Set(varInjected,true)" })]);

    expect(collectionAsset(registryFor(project)).sourceContent).toBe(collectionAsset(registryFor(project)).sourceContent);
  });

  it("supports Dataverse confirmed table sources without reading data", () => {
    const project = createCanvasProject([collectionTarget({ sourceConnectorId: "connector-dataverse", sourceEntityId: "table-accounts" })]);
    project.powerPlatform!.common.connectors = [confirmedConnector({ id: "connector-dataverse", dataSourceName: "Dataverse", dataSourceType: "dataverse" })];
    project.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    project.powerPlatform!.canvas!.primaryConnectorId = "connector-dataverse";
    project.powerPlatform!.canvas!.dataverseEnvironment = "Dev";
    project.powerPlatform!.canvas!.dataverseSolution = "Solution";
    project.powerPlatform!.canvas!.dataversePublisherPrefix = "crb";
    project.powerPlatform!.canvas!.dataverseSchemaConfirmationStatus = "confirmed";
    project.powerPlatform!.canvas!.sharePointListSchemas = [];
    project.powerPlatform!.canvas!.sharePointColumnSchemas = [];
    project.powerPlatform!.canvas!.dataverseTableSchemas = [
      createDefaultDataverseTable({
        id: "table-accounts",
        displayName: "Accounts",
        logicalName: "Accounts",
        schemaName: "crb_Account",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];
    project.powerPlatform!.canvas!.dataverseColumnSchemas = [
      createDefaultDataverseColumn({
        id: "column-name",
        tableId: "table-accounts",
        displayName: "Name",
        logicalName: "crb_name",
        schemaName: "crb_Name",
        dataType: "Text",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];

    expect(collectionAsset(registryFor(project)).assetStatus).toBe("Review Required");
  });

  it("supports custom connector resources without storing raw URLs", () => {
    const project = createCanvasProject([collectionTarget({ sourceConnectorId: "connector-api", sourceEntityId: "resource-orders" })]);
    project.powerPlatform!.common.connectors = [confirmedConnector({ id: "connector-api", dataSourceName: "API", dataSourceType: "customConnector" })];
    project.powerPlatform!.canvas!.primaryDataSourceType = "customConnector";
    project.powerPlatform!.canvas!.primaryConnectorId = "connector-api";
    project.powerPlatform!.canvas!.sharePointListSchemas = [];
    project.powerPlatform!.canvas!.sharePointColumnSchemas = [];
    project.powerPlatform!.canvas!.otherConnectorSchemaConfirmationStatus = "confirmed";
    project.powerPlatform!.canvas!.connectorResourceSchemas = [
      createDefaultConnectorResource({
        id: "resource-orders",
        connectorId: "connector-api",
        resourceName: "Orders",
        resourceType: "endpoint",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];
    project.powerPlatform!.canvas!.connectorFieldSchemas = [
      createDefaultConnectorField({
        id: "resource-field-id",
        connectorId: "connector-api",
        resourceId: "resource-orders",
        displayName: "Order ID",
        fieldIdentifier: "OrderId",
        fieldType: "Text",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];

    expect(collectionAsset(registryFor(project)).sourceContent).not.toMatch(/https?:\/\//);
  });
});
