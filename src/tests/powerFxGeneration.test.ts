import { createProject } from "../lib/createProject";
import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  deriveImplementationAssetRegistryState,
  normalizeImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import {
  createApplicabilityDecision,
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultPowerPlatformData,
  createDefaultSharePointColumn,
  createDefaultSharePointList,
  normalizePowerPlatformData
} from "../lib/powerPlatform";
import {
  generatePowerFxForAsset,
  generatePowerFxForRegistry,
  POWER_FX_NAVIGATION_TRANSITIONS,
  type PowerFxNavigationTransition
} from "../lib/powerFxGeneration";

function createNavigationProject() {
  const project = createProject({
    identity: { id: "powerfx-nav", projectName: "Power Fx Navigation" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Navigate between confirmed request screens.",
      requiredFeatures: "Navigate from home to request details.",
      workflows: "Open request details.",
      outOfScope: "Deployment.",
      successCriteria: "Navigation works in Studio.",
      accessibilityNotes: "Keyboard and labels are required.",
      permissionRules: "Least privilege.",
      screens: "Home and details",
      acceptanceNotes: "Navigation is accepted.",
      targetUsers: "Requesters",
      userRoles: "Requester",
      dataSources: "SharePoint",
      dataEntities: "Requests",
      fields: "Title",
      dataCollections: "Requests"
    } as any
  });
  const pp = project.powerPlatform!;
  pp.common.tenant = "Tenant";
  pp.common.environment = "Development";
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
  pp.common.accessibilityTesting = "Accessibility tests.";
  pp.common.deploymentTesting = "Deployment test plan only.";
  pp.common.testingPlanConfirmationStatus = "confirmed";
  pp.common.deploymentResponsibility = "Deployment owner handles external deployment.";
  pp.common.deploymentOwner = "Deployment owner";
  pp.common.deploymentResponsibilityStatus = "confirmed";
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
      requiredConnectorPermissions: "Read list items.",
      permissionOwner: "SharePoint owner",
      permissionValidationMethod: "Owner confirmation.",
      permissionConfirmationStatus: "confirmed",
      delegationSupport: "Delegation supported.",
      limitations: "Avoid non-delegable expressions.",
      approvalConfirmationStatus: "confirmed"
    })
  ];
  pp.canvas!.primaryDataSourceType = "sharePointList";
  pp.canvas!.primaryConnectorId = "connector-sharepoint";
  pp.canvas!.sourcePurpose = "Store requests.";
  pp.canvas!.sourceOwnership = "Operations.";
  pp.canvas!.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
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
  pp.canvas!.appFormulasRequirements = "No app formulas in this phase.";
  pp.canvas!.startScreenRequirements = "Start on home.";
  pp.canvas!.onStartRequirements = "No OnStart in this phase.";
  pp.canvas!.namedFormulaRequirements = "No named formulas in this phase.";
  pp.canvas!.createBehavior = "Future phase.";
  pp.canvas!.readBehavior = "Future phase.";
  pp.canvas!.updateBehavior = "Future phase.";
  pp.canvas!.validationRequirements = "Future phase.";
  pp.canvas!.errorHandlingRequirements = "Future phase.";
  pp.canvas!.searchRequirements = "Future phase.";
  pp.canvas!.filteringRequirements = "Future phase.";
  pp.canvas!.sortingRequirements = "Future phase.";
  pp.canvas!.powerFxStatus = "confirmed";
  pp.canvas!.expectedRecordCounts = "1000";
  pp.canvas!.delegationRequirements = "No data operation is generated in Phase 5B.1.";
  pp.canvas!.delegationStatus = "confirmed";
  pp.canvas!.componentApplicabilityDecision = createApplicabilityDecision({
    status: "notApplicable",
    notApplicableReason: "No reusable components are required.",
    confirmationStatus: "confirmed"
  });
  pp.canvas!.screenTargets = [
    createDefaultCanvasScreenTarget({
      id: "screen-home",
      displayName: "Home",
      approvedScreenName: "scrHome",
      purpose: "Start screen.",
      dataSourceApplicabilityDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "Screen does not need direct binding.",
        confirmationStatus: "confirmed"
      }),
      yamlOutputDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "No YAML in Phase 5B.1.",
        confirmationStatus: "confirmed"
      }),
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultCanvasScreenTarget({
      id: "screen-details",
      displayName: "Details",
      approvedScreenName: "scrDetails",
      purpose: "Show request details.",
      dataSourceApplicabilityDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "Screen does not need direct binding.",
        confirmationStatus: "confirmed"
      }),
      yamlOutputDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "No YAML in Phase 5B.1.",
        confirmationStatus: "confirmed"
      }),
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  pp.canvas!.controlTargets = [
    createDefaultCanvasControlTarget({
      id: "control-open-details",
      screenId: "screen-home",
      approvedControlName: "btnOpenDetails",
      controlType: "Button",
      purpose: "Open details.",
      operation: "navigation",
      formulaProperties: "OnSelect",
      connectorId: "connector-sharepoint",
      entityId: "list-requests",
      requiredFieldIds: ["field-title"],
      dependencies: "Depends on confirmed navigation target.",
      dependencyApplicabilityDecision: createApplicabilityDecision({
        status: "required",
        details: "Use confirmed source and destination screens.",
        confirmationStatus: "confirmed"
      }),
      formulaOutputDecision: createApplicabilityDecision({
        status: "required",
        details: "Generate navigation formula plan.",
        confirmationStatus: "confirmed"
      }),
      yamlOutputDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "No YAML in Phase 5B.1.",
        confirmationStatus: "confirmed"
      }),
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  Object.assign(pp.canvas!.controlTargets[0], {
    navigationDestinationScreenId: "screen-details",
    navigationTransition: "None",
    navigationTransitionDefaultRule: ""
  });
  return project;
}

function approvedRegistry(project = createNavigationProject()): ImplementationAssetRegistry {
  const registry = buildImplementationAssetRegistry(project, "2026-07-15T12:00:00.000Z");
  return normalizeImplementationAssetRegistry({
    assets: registry.assets.map((asset) => ({
      assetId: asset.assetId,
      approvalStatus: "Approved",
      contentChecksum: asset.contentChecksum,
      generationVersion: asset.generationVersion
    }))
  }, project, "2026-07-15T12:00:00.000Z");
}

function navAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  return registry.assets.find((asset) => asset.assetType === "powerFxPlan" && asset.approvedPropertyName === "OnSelect")!;
}

function propertyAsset(registry: ImplementationAssetRegistry, propertyName: string): ImplementationAsset | undefined {
  return registry.assets.find((asset) => asset.assetType === "powerFxPlan" && asset.approvedPropertyName === propertyName);
}

function navChecksum(project = createNavigationProject()): string {
  return navAsset(buildImplementationAssetRegistry(project, "2026-07-15T12:00:00.000Z")).contentChecksum;
}

function generate(project = createNavigationProject(), registry = approvedRegistry(project)) {
  return generatePowerFxForAsset({ project, registry, assetId: navAsset(registry).assetId });
}

function withChecksum(asset: ImplementationAsset): ImplementationAsset {
  return { ...asset, contentChecksum: calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" }) };
}

function replaceNavAsset(registry: ImplementationAssetRegistry, replacement: ImplementationAsset): ImplementationAssetRegistry {
  return {
    ...registry,
    assets: registry.assets.map((asset) => asset.assetId === replacement.assetId ? replacement : asset)
  };
}

describe("Power Fx generation Phase 5B.1 navigation", () => {
  it("has navigation fields on a default Canvas control target", () => {
    expect(createDefaultCanvasControlTarget()).toMatchObject({
      navigationDestinationScreenId: "",
      navigationTransition: "",
      navigationTransitionDefaultRule: ""
    });
  });

  it("normalizes legacy controls missing navigation fields safely", () => {
    const data = createDefaultPowerPlatformData("powerAppsCanvas")!;
    data.canvas!.controlTargets = [{ id: "legacy-control", screenId: "screen-home" } as any];

    const normalized = normalizePowerPlatformData(data, "powerAppsCanvas")!;

    expect(normalized.canvas!.controlTargets[0]).toMatchObject({
      navigationDestinationScreenId: "",
      navigationTransition: "",
      navigationTransitionDefaultRule: ""
    });
  });

  it("normalizes unknown navigation transitions safely and does not generate", () => {
    const data = createDefaultPowerPlatformData("powerAppsCanvas")!;
    data.canvas!.controlTargets = [{
      id: "legacy-control",
      screenId: "screen-home",
      navigationDestinationScreenId: "screen-details",
      navigationTransition: "Spin",
      navigationTransitionDefaultRule: "bad-default"
    } as any];
    const normalized = normalizePowerPlatformData(data, "powerAppsCanvas")!;

    expect(normalized.canvas!.controlTargets[0].navigationTransition).toBe("");
    expect(normalized.canvas!.controlTargets[0].navigationTransitionDefaultRule).toBe("");

    const project = createNavigationProject();
    Object.assign(project.powerPlatform!.canvas!.controlTargets[0], {
      navigationTransition: "",
      navigationTransitionDefaultRule: ""
    });
    expect(generate(project).status).toBe("Blocked");
  });

  it("includes destination ID in the Phase 5A asset checksum", () => {
    const first = navChecksum();
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.screenTargets.push(createDefaultCanvasScreenTarget({
      id: "screen-summary",
      approvedScreenName: "scrSummary",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }));
    project.powerPlatform!.canvas!.controlTargets[0].navigationDestinationScreenId = "screen-summary";

    expect(navChecksum(project)).not.toBe(first);
  });

  it("includes transition in the Phase 5A asset checksum", () => {
    const first = navChecksum();
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].navigationTransition = "Fade";

    expect(navChecksum(project)).not.toBe(first);
  });

  it("includes transition default rule in the Phase 5A asset checksum", () => {
    const firstProject = createNavigationProject();
    firstProject.powerPlatform!.canvas!.controlTargets[0].navigationTransition = "";
    const secondProject = createNavigationProject();
    secondProject.powerPlatform!.canvas!.controlTargets[0].navigationTransition = "";
    secondProject.powerPlatform!.canvas!.controlTargets[0].navigationTransitionDefaultRule = "defaultToNoneWhenBlank";

    expect(navChecksum(secondProject)).not.toBe(navChecksum(firstProject));
  });

  it("includes destination implementation name in the Phase 5A asset checksum", () => {
    const first = navChecksum();
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.screenTargets[1].approvedScreenName = "scrRequestDetails";

    expect(navChecksum(project)).not.toBe(first);
  });

  it("generates Power Fx for an approved Ready navigation asset", () => {
    expect(generate().status).toBe("Generated");
  });

  it("generates when the approved property is still present on the current control", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSelect\nOnSuccess";

    expect(generate(project, registry).status).toBe("Blocked");
    expect(generate(project, approvedRegistry(project)).status).toBe("Generated");
  });

  it("uses the confirmed destination implementation name", () => {
    expect(generate().formula).toBe("Navigate(scrDetails, ScreenTransition.None)\n");
  });

  it("maps None transition to ScreenTransition.None", () => {
    expect(generate().formula).toContain("ScreenTransition.None");
  });

  it.each(POWER_FX_NAVIGATION_TRANSITIONS)("maps %s transition correctly", (transition) => {
    const project = createNavigationProject();
    Object.assign(project.powerPlatform!.canvas!.controlTargets[0], { navigationTransition: transition });

    expect(generate(project).formula).toBe(`Navigate(scrDetails, ScreenTransition.${transition})\n`);
  });

  it("produces identical formula and checksum for identical structured input", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);

    expect(generate(project, registry)).toEqual(generate(project, registry));
  });

  it("changes formula and checksum when the destination changes", () => {
    const first = generate();
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.screenTargets.push(createDefaultCanvasScreenTarget({
      id: "screen-summary",
      displayName: "Summary",
      approvedScreenName: "scrSummary",
      purpose: "Show summary.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }));
    Object.assign(project.powerPlatform!.canvas!.controlTargets[0], { navigationDestinationScreenId: "screen-summary" });
    const second = generate(project);

    expect(second.formula).not.toBe(first.formula);
    expect(second.generatedChecksum).not.toBe(first.generatedChecksum);
  });

  it("changes formula and checksum when the transition changes", () => {
    const first = generate();
    const project = createNavigationProject();
    Object.assign(project.powerPlatform!.canvas!.controlTargets[0], { navigationTransition: "Fade" });
    const second = generate(project);

    expect(second.formula).not.toBe(first.formula);
    expect(second.generatedChecksum).not.toBe(first.generatedChecksum);
  });

  it("changes formula and checksum when the implementation name changes", () => {
    const first = generate();
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.screenTargets[1].approvedScreenName = "scrRequestDetails";
    const second = generate(project);

    expect(second.formula).not.toBe(first.formula);
    expect(second.generatedChecksum).not.toBe(first.generatedChecksum);
  });

  it("does not change checksum when only the generation timestamp changes", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    const first = generatePowerFxForAsset({ project, registry, assetId: navAsset(registry).assetId, generatedAt: "2026-07-15T12:00:00.000Z" });
    const second = generatePowerFxForAsset({ project, registry, assetId: navAsset(registry).assetId, generatedAt: "2099-01-01T00:00:00.000Z" });

    expect(second.generatedChecksum).toBe(first.generatedChecksum);
  });

  it("ends generated output with exactly one newline", () => {
    expect(generate().formula).toMatch(/[^\n]\n$/);
    expect(generate().formula).not.toMatch(/\n\n$/);
  });

  it("contains no Markdown fence", () => {
    expect(generate().formula).not.toContain("```");
  });

  it("contains no unresolved placeholder", () => {
    expect(generate().formula).not.toMatch(/\[MISSING:|TODO|placeholder/i);
  });

  it("blocks when destination ID is missing", () => {
    const project = createNavigationProject();
    Object.assign(project.powerPlatform!.canvas!.controlTargets[0], { navigationDestinationScreenId: "" });

    expect(generate(project).blockingIssues).toContain("Navigation destination screen ID is missing.");
  });

  it("blocks generation when destination changes after approval", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.screenTargets.push(createDefaultCanvasScreenTarget({
      id: "screen-summary",
      approvedScreenName: "scrSummary",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }));
    project.powerPlatform!.canvas!.controlTargets[0].navigationDestinationScreenId = "screen-summary";

    expect(generate(project, registry).blockingIssues).toContain(`Asset ${navAsset(registry).assetId} is stale against current project state.`);
  });

  it("blocks generation when the approved property is removed after approval", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "";

    expect(generate(project, registry).blockingIssues).toContain("Approved formula property OnSelect is no longer present on current control control-open-details.");
    expect(generate(project, registry).formula).toBe("");
  });

  it("blocks the old OnSelect asset when OnSelect is replaced with OnSuccess", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSuccess";

    expect(generate(project, registry).blockingIssues).toContain("Approved formula property OnSelect is no longer present on current control control-open-details.");
  });

  it("invalidates the OnSelect asset when OnSuccess is added because the canonical property set is approval-bound", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSelect\nOnSuccess";

    expect(generate(project, registry).blockingIssues).toContain(`Asset ${navAsset(registry).assetId} is stale against current project state.`);
  });

  it("includes the current normalized formula property set in the Phase 5A asset checksum", () => {
    const first = navChecksum();
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = " OnSelect ; OnSuccess ; OnSelect ";

    expect(navChecksum(project)).not.toBe(first);
  });

  it("changes the derived checksum when the approved property is removed", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    const original = navAsset(registry).contentChecksum;
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "";
    const derived = deriveImplementationAssetRegistryState(project, registry.assets).assets.find((asset) => asset.assetId === navAsset(registry).assetId)!;

    expect(derived.contentChecksum).not.toBe(original);
    expect(derived.blockingIssues).toContain("Approved formula property OnSelect is no longer present on current control control-open-details.");
  });

  it("changes the derived checksum when the approved property is replaced", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    const original = navAsset(registry).contentChecksum;
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSuccess";
    const derived = deriveImplementationAssetRegistryState(project, registry.assets).assets.find((asset) => asset.assetId === navAsset(registry).assetId)!;

    expect(derived.contentChecksum).not.toBe(original);
  });

  it("resets approval when the current property set changes while retaining the approved property", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSelect\nOnSuccess";
    const normalized = normalizeImplementationAssetRegistry(registry, project, "2026-07-15T12:00:00.000Z");

    expect(navAsset(normalized).approvalStatus).toBe("Review required");
  });

  it("removes the obsolete property asset when rebuilding after replacement", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSuccess";

    expect(propertyAsset(buildImplementationAssetRegistry(project), "OnSelect")).toBeUndefined();
  });

  it("creates the newly applicable property asset when rebuilding after replacement", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSuccess";

    expect(propertyAsset(buildImplementationAssetRegistry(project), "OnSuccess")).toBeDefined();
  });

  it("starts the newly applicable property asset as Review required", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSuccess";

    expect(propertyAsset(buildImplementationAssetRegistry(project), "OnSuccess")?.approvalStatus).toBe("Review required");
  });

  it("permits the new supported navigation property after explicit approval", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSuccess";
    const registry = approvedRegistry(project);
    const asset = propertyAsset(registry, "OnSuccess")!;

    const result = generatePowerFxForAsset({ project, registry, assetId: asset.assetId });

    expect(result.status).toBe("Generated");
    expect(result.propertyName).toBe("OnSuccess");
  });

  it("does not let a manually constructed registry bypass current-property membership", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "OnSuccess";
    const derived = deriveImplementationAssetRegistryState(project, registry.assets).assets.find((asset) => asset.assetId === navAsset(registry).assetId)!;
    const forged = replaceNavAsset(registry, { ...derived, approvalStatus: "Approved" });

    expect(generate(project, forged).blockingIssues).toContain("Approved formula property OnSelect is no longer present on current control control-open-details.");
  });

  it("blocks generation when transition changes after approval", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].navigationTransition = "Fade";

    expect(generate(project, registry).blockingIssues).toContain(`Asset ${navAsset(registry).assetId} is stale against current project state.`);
  });

  it("blocks generation when the default rule changes after approval", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].navigationTransition = "";
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].navigationTransitionDefaultRule = "defaultToNoneWhenBlank";

    expect(generate(project, registry).blockingIssues).toContain(`Asset ${navAsset(registry).assetId} is stale against current project state.`);
  });

  it("blocks generation when destination implementation name changes after approval", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.screenTargets[1].approvedScreenName = "scrRequestDetails";

    expect(generate(project, registry).blockingIssues).toContain(`Asset ${navAsset(registry).assetId} is stale against current project state.`);
  });

  it("blocks when destination screen is missing", () => {
    const project = createNavigationProject();
    Object.assign(project.powerPlatform!.canvas!.controlTargets[0], { navigationDestinationScreenId: "screen-missing" });

    expect(generate(project).blockingIssues).toContain("Navigation destination screen screen-missing does not exist.");
  });

  it("blocks when destination screen is unconfirmed", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.screenTargets[1].confirmationStatus = "reviewNeeded";

    expect(generate(project).blockingIssues).toContain("Navigation destination screen screen-details is not confirmed.");
  });

  it("blocks when destination implementation name is missing", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.screenTargets[1].approvedScreenName = "";

    expect(generate(project).blockingIssues).toContain("Navigation destination screen screen-details is missing a confirmed Power Apps implementation name.");
  });

  it("blocks unknown transitions", () => {
    const project = createNavigationProject();
    Object.assign(project.powerPlatform!.canvas!.controlTargets[0], { navigationTransition: "Spin" });

    expect(generate(project).blockingIssues).toContain("Navigation transition Spin is not supported.");
  });

  it("blocks unsupported formula properties", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].formulaProperties = "DisplayMode";
    const registry = approvedRegistry(project);

    expect(generatePowerFxForRegistry(project, registry)[0].blockingIssues[0]).toContain("DisplayMode");
  });

  it("blocks unsupported operations", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].operation = "create";

    expect(generate(project).blockingIssues).toContain("Operation create is not supported in Phase 5B.1.");
  });

  it("blocks Draft assets", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    const draft = withChecksum({ ...navAsset(registry), applicabilityStatus: "undecided" });

    expect(generate(project, replaceNavAsset(registry, draft)).status).toBe("Blocked");
  });

  it("blocks Review Required assets", () => {
    const project = createNavigationProject();
    const registry = buildImplementationAssetRegistry(project, "2026-07-15T12:00:00.000Z");

    expect(generatePowerFxForAsset({ project, registry, assetId: navAsset(registry).assetId }).status).toBe("Review Required");
  });

  it("blocks assets with recalculated Blocked status", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.controlTargets[0].confirmationStatus = "blocked";

    expect(generate(project, registry).status).toBe("Blocked");
  });

  it("blocks unapproved assets", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    const unapproved = withChecksum({ ...navAsset(registry), approvalStatus: "Review required" });

    expect(generate(project, replaceNavAsset(registry, unapproved)).status).toBe("Review Required");
  });

  it("blocks invalid source checksums", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    const invalid = { ...navAsset(registry), contentChecksum: "invalid" };

    expect(generate(project, replaceNavAsset(registry, invalid)).blockingIssues).toContain(`Asset ${invalid.assetId} source checksum is invalid.`);
  });

  it("blocks failed gates", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.intake.accessibilityNotes = "";

    expect(generate(project, registry).blockingIssues[0]).toContain("stale against current project state");
  });

  it("blocks unresolved dependencies", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.sharePointColumnSchemas[0].parentId = "other-list";

    expect(generate(project, registry).blockingIssues[0]).toContain("stale against current project state");
  });

  it("returns Not Applicable for non-Canvas projects", () => {
    const project = createProject({ identity: { id: "site", projectName: "Site" }, intake: { appType: "businessWebsite", appPurpose: "Website." } });
    const registry = approvedRegistry(createNavigationProject());

    expect(generatePowerFxForAsset({ project, registry, assetId: navAsset(registry).assetId }).status).toBe("Not Applicable");
  });

  it("resets approval when regenerating the registry after a destination change", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    project.powerPlatform!.canvas!.screenTargets.push(createDefaultCanvasScreenTarget({
      id: "screen-summary",
      approvedScreenName: "scrSummary",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }));
    project.powerPlatform!.canvas!.controlTargets[0].navigationDestinationScreenId = "screen-summary";

    const normalized = normalizeImplementationAssetRegistry(registry, project, "2026-07-15T12:00:00.000Z");

    expect(navAsset(normalized).approvalStatus).toBe("Review required");
  });

  it("generates after explicit approval of the changed checksum", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.screenTargets.push(createDefaultCanvasScreenTarget({
      id: "screen-summary",
      approvedScreenName: "scrSummary",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }));
    project.powerPlatform!.canvas!.controlTargets[0].navigationDestinationScreenId = "screen-summary";
    const fresh = buildImplementationAssetRegistry(project, "2026-07-15T12:00:00.000Z");
    const approved = normalizeImplementationAssetRegistry({
      assets: fresh.assets.map((asset) => ({
        assetId: asset.assetId,
        approvalStatus: "Approved",
        contentChecksum: asset.contentChecksum,
        generationVersion: asset.generationVersion
      }))
    }, project, "2026-07-15T12:00:00.000Z");

    expect(generate(project, approved).status).toBe("Generated");
  });

  it("uses the newly approved destination in regenerated output", () => {
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.screenTargets.push(createDefaultCanvasScreenTarget({
      id: "screen-summary",
      approvedScreenName: "scrSummary",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }));
    project.powerPlatform!.canvas!.controlTargets[0].navigationDestinationScreenId = "screen-summary";
    const approved = approvedRegistry(project);

    expect(generate(project, approved).formula).toBe("Navigate(scrSummary, ScreenTransition.None)\n");
  });

  it("uses the newly approved transition in regenerated checksum", () => {
    const base = generate();
    const project = createNavigationProject();
    project.powerPlatform!.canvas!.controlTargets[0].navigationTransition = "Cover";
    const approved = approvedRegistry(project);
    const changed = generate(project, approved);

    expect(changed.formula).toContain("ScreenTransition.Cover");
    expect(changed.generatedChecksum).not.toBe(base.generatedChecksum);
  });

  it("does not mutate the project", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    const before = JSON.stringify(project);

    generate(project, registry);

    expect(JSON.stringify(project)).toBe(before);
  });

  it("does not mutate the registry", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    const before = JSON.stringify(registry);

    generate(project, registry);

    expect(JSON.stringify(registry)).toBe(before);
  });

  it("does not mutate the asset", () => {
    const project = createNavigationProject();
    const registry = approvedRegistry(project);
    const asset = navAsset(registry);
    const before = JSON.stringify(asset);

    generate(project, registry);

    expect(JSON.stringify(asset)).toBe(before);
  });

  it("emits no data-access function", () => {
    expect(generate().formula).not.toMatch(/\b(Filter|Search|Sort|SortByColumns|LookUp|ClearCollect|Collect|Concurrent)\s*\(/);
  });

  it("emits no CRUD function", () => {
    expect(generate().formula).not.toMatch(/\b(Patch|SubmitForm|Remove|RemoveIf)\s*\(/);
  });

  it("emits no Canvas YAML", () => {
    expect(generate().formula).not.toMatch(/<CanvasApp|\.pa\.yaml|controls:/i);
  });

  it("emits no model-driven source", () => {
    expect(generate().formula).not.toMatch(/<ImportExportXml|solution\.xml|customizations\.xml/i);
  });

  it("supports only navigation formulas in Phase 5B.1", () => {
    const result = generate();

    expect(result.operation).toBe("navigation");
    expect(result.formula).toMatch(/^Navigate\(/);
  });

  it("uses an approved default rule only when transition is blank", () => {
    const project = createNavigationProject();
    Object.assign(project.powerPlatform!.canvas!.controlTargets[0], {
      navigationTransition: "",
      navigationTransitionDefaultRule: "defaultToNoneWhenBlank"
    });

    expect(generate(project).formula).toBe("Navigate(scrDetails, ScreenTransition.None)\n");
  });

  it("keeps transition support limited to the approved list", () => {
    expect(POWER_FX_NAVIGATION_TRANSITIONS).toEqual([
      "None",
      "Cover",
      "CoverRight",
      "Fade",
      "UnCover",
      "UnCoverRight"
    ] satisfies PowerFxNavigationTransition[]);
  });
});
