import { createProject } from "../lib/createProject";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { findBlankMarkdownSections, validateExportPackage } from "../lib/exportIntegrity";
import {
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultPowerPlatformData,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import {
  effectiveCanvasExpectedRecordCounts,
  orphanMissingMarkers,
  saveCancelCanvasAssets,
  selectedRecordStateAssets,
  traceMissingMarkers
} from "../lib/canvasTraceability";
import { getProjectCompletionPercent } from "../lib/projectSelectors";
import { validateIntake } from "../lib/validateIntake";
import type { ProjectRecord } from "../types/project";

function ttiStyleCanvasProject(): ProjectRecord {
  const project = createProject({
    identity: { id: "tti-style-regression", projectName: "Canvas Tracker Regression" },
    client: { clientName: "Operations Sponsor", businessName: "IT" },
    intake: {
      appType: "powerAppsCanvas",
      audienceVisibility: "Internal users",
      appPurpose: "Track software licence records.",
      problemStatement: "Licence records need a controlled intake and review process.",
      targetPlatform: "Power Apps Canvas tablet app",
      constraints: "Use standard Microsoft 365 connectors only.",
      m365Environment: "Tenant / Development / Test / Production.",
      outOfScope: "Public portal\nBilling",
      targetUsers: "Software administrators",
      userRoles: "Admin\nReviewer",
      roleDescriptions: "Admin maintains all lists; Reviewer validates records.",
      rolePermissionsSummary: "Admin manages records; Reviewer reads records.",
      internalUsers: "IT administrators",
      externalUsers: "None",
      adminUsers: "Software administrators",
      accessibilityNotes: "Keyboard focus and labels must be visible.",
      dashboardAudience: "IT managers.",
      requiredFeatures: "Create, edit, view, and archive licence records.",
      featurePriority: "Record maintenance is required for launch.",
      featureDescription: "Users maintain licence tracker records.",
      featureOwner: "IT owner",
      acceptanceNotes: "Records can be created, updated, viewed, and archived.",
      automations: "No automations approved.",
      reportsDashboards: "Renewal summary by status.",
      powerBiReports: "No Power BI reports approved.",
      dashboardKpis: "Renewals due.",
      dashboardFilters: "Status\nOwner",
      drillThrough: "Summary to licence record.",
      dashboardExportNeeds: "CSV not required.",
      screens: "Main tracker screen",
      brandingNotes: "Use internal IT styling.",
      brandStatus: "Existing internal IT brand.",
      logoStatus: "No logo required for this internal app.",
      logoFiles: "Not applicable.",
      primaryColors: "IT blue #1f4f82.",
      secondaryColors: "Neutral grey.",
      fontPreferences: "Default Power Apps fonts.",
      brandTone: "Professional and concise.",
      imageStyle: "No imagery required.",
      iconStyle: "Simple line icons.",
      referenceSites: "Existing IT portal.",
      brandRestrictions: "Do not use public marketing imagery.",
      faviconNeeded: "Not applicable.",
      openGraphImageNeeded: "Not applicable.",
      socialAssetsNeeded: "Not applicable.",
      contentSource: "IT owner-approved copy.",
      approvedAssets: "No external assets required.",
      accessibilityContrastNotes: "Use high-contrast controls.",
      workflows: "Licence record maintenance",
      workflowName: "Licence maintenance",
      workflowTrigger: "User opens the tracker.",
      workflowSteps: "Select record\nEdit form\nSave or cancel",
      workflowInputs: "Licence record fields.",
      workflowOutputs: "Updated licence record.",
      workflowRoles: "Admin\nReviewer",
      workflowDecisionPoints: "Reviewer confirms changes.",
      notifications: "No notifications approved.",
      workflowFailureHandling: "Show validation error and retain input.",
      workflowOutcome: "Confirmed licence record state.",
      powerAutomateFlows: "No Power Automate flows approved.",
      automationTrigger: "No automation trigger approved.",
      automationSteps: "No automation steps approved.",
      approvalSteps: "Reviewer confirms manually.",
      automationErrorHandling: "Manual process owner resolves exceptions.",
      retryLogic: "Not applicable.",
      notificationRules: "No notification rules approved.",
      dataSources: "SharePoint Online",
      dataEntities: "Software\nLicences\nRenewals",
      dataCollections: "Software\nLicences\nRenewals",
      sharePointLists: "Software\nLicences\nRenewals",
      dataverseUse: "Not applicable.",
      fields: "Title\nVendor\nRenewalDate",
      fieldTypes: "Title: text\nVendor: text\nRenewalDate: date",
      keyFields: "Title",
      requiredDataFields: "Title\nVendor",
      relationships: "Software has many licences.",
      dataOwnership: "IT owns SharePoint lists.",
      dataRetentionNotes: "Retain according to IT policy.",
      integrations: "SharePoint Online",
      m365Connectors: "SharePoint Online standard connector.",
      dashboardDataSources: "SharePoint Online.",
      dashboardRefreshFrequency: "On app refresh.",
      sourceSystem: "SharePoint Online.",
      targetSystem: "SharePoint Online.",
      permissionRules: "Admin can edit; Reviewer can read.",
      roleAccessNotes: "Reviewer cannot edit records.",
      permissions: "Role-based SharePoint access.",
      sensitiveDataNotes: "No secret values are stored.",
      authenticationExpectation: "Microsoft 365 sign-in.",
      authorizationExpectation: "SharePoint permissions.",
      auditLoggingNeeds: "SharePoint version history.",
      dataProtectionExpectations: "No secrets or payment details.",
      complianceNotes: "Internal IT use only.",
      dlpRestrictions: "Standard connector policy only.",
      m365Permissions: "SharePoint groups by role.",
      dashboardPermissions: "IT managers can view summaries.",
      automationLogs: "No automation logs required.",
      risks: "SharePoint threshold risk.",
      assumptions: "SharePoint site access is available.",
      successCriteria: "Package identifies structured records without hidden-field markers."
    }
  });
  const powerPlatform = createDefaultPowerPlatformData("powerAppsCanvas")!;
  powerPlatform.common.businessOwner = "Business owner";
  powerPlatform.common.appOwner = "App owner";
  powerPlatform.common.technicalOwner = "Technical owner";
  powerPlatform.common.supportOwner = "Support owner";
  powerPlatform.common.expectedUserCount = "25 users";
  powerPlatform.common.tenant = "Tenant";
  powerPlatform.common.environment = "Development";
  powerPlatform.common.environmentType = "Developer";
  powerPlatform.common.developmentEnvironment = "Development";
  powerPlatform.common.testEnvironment = "Test";
  powerPlatform.common.productionEnvironment = "Production";
  powerPlatform.common.environmentAccessStatus = "confirmed";
  powerPlatform.common.currentPowerAppsLicences = "Standard connectors approved.";
  powerPlatform.common.currentPowerAutomateLicences = "Not required for this package.";
  powerPlatform.common.dataverseAvailability = "notApplicable";
  powerPlatform.common.premiumConnectorAvailability = "notApplicable";
  powerPlatform.common.customConnectorAvailability = "notApplicable";
  powerPlatform.common.licensingConfirmationStatus = "confirmed";
  powerPlatform.common.authenticationRequirements = "Microsoft 365 sign-in.";
  powerPlatform.common.authorizationRequirements = "SharePoint permissions by role.";
  powerPlatform.common.recordAccessRules = "Admin edit, Reviewer read.";
  powerPlatform.common.auditRequirements = "SharePoint version history.";
  powerPlatform.common.privacyRequirements = "No secrets in app data.";
  powerPlatform.common.securityReviewStatus = "confirmed";
  powerPlatform.common.functionalTesting = "Validate create, edit, view, and archive.";
  powerPlatform.common.connectorTesting = "Validate SharePoint connector reads and writes.";
  powerPlatform.common.permissionTesting = "Validate Admin and Reviewer access.";
  powerPlatform.common.securityTesting = "Validate least-privilege access.";
  powerPlatform.common.accessibilityTesting = "Validate keyboard focus and labels.";
  powerPlatform.common.performanceTesting = "Validate list load time.";
  powerPlatform.common.volumeTesting = "Validate expected SharePoint list volumes.";
  powerPlatform.common.integrationTesting = "Validate Canvas to SharePoint integration.";
  powerPlatform.common.regressionTesting = "Validate existing records remain readable.";
  powerPlatform.common.userAcceptanceTesting = "Business owner validates tracker workflow.";
  powerPlatform.common.deploymentTesting = "Validate package import plan.";
  powerPlatform.common.productionSmokeTesting = "Open app, load lists, and validate role access after release.";
  powerPlatform.common.testingPlanConfirmationStatus = "confirmed";
  powerPlatform.common.sourceControlApproach = "Manual package review only.";
  powerPlatform.common.gitIntegration = "Not applicable because no repository integration is approved for this package.";
  powerPlatform.common.powerPlatformCliAvailability = "Not applicable because CLI automation is not approved for this package.";
  powerPlatform.common.deploymentMethod = "Manual managed release.";
  powerPlatform.common.deploymentOwner = "Release owner";
  powerPlatform.common.deploymentResponsibility = "Release owner imports and publishes.";
  powerPlatform.common.deploymentResponsibilityStatus = "confirmed";
  powerPlatform.common.deploymentStrategy = "Development, test, production.";
  powerPlatform.common.connectionReferences = "SharePoint connection reference only.";
  powerPlatform.common.environmentVariables = "No secret environment variables.";
  powerPlatform.common.pipelineRequirements = "No automated pipeline approved.";
  powerPlatform.common.rollbackExpectations = "Restore previous published version.";
  powerPlatform.common.releaseApprover = "Business owner";
  powerPlatform.common.releaseApprovalResponsibility = "Business owner approves release.";
  powerPlatform.common.releaseApprovalStatus = "confirmed";
  powerPlatform.common.almConfirmationStatus = "confirmed";
  powerPlatform.common.connectors = [
    createDefaultConnector({
      id: "connector-sharepoint",
      displayName: "SharePoint Online",
      purpose: "Store and retrieve licence tracker records.",
      dataSourceName: "SharePoint Online",
      dataSourceType: "sharePointList",
      canvasRole: "primary",
      connectorClassification: "standard",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      licenceRequirement: "Standard Microsoft 365 connector.",
      authenticationMethod: "Microsoft 365 user connection.",
      gatewayRequirement: "Not required for SharePoint Online.",
      environmentRequirement: "Development, test, production.",
      dlpImpact: "Standard connector allowed.",
      delegationSupport: "SharePoint delegable filters confirmed for indexed fields.",
      expectedRecordVolume: "Software: 100; Licences: 500; Renewals: 200.",
      limitations: "Avoid non-delegable search over unindexed fields.",
      requiredConnectorPermissions: "SharePoint list read/write for Admin.",
      permissionOwner: "Site owner",
      permissionValidationMethod: "Role test accounts.",
      permissionConfirmationStatus: "confirmed",
      connectionOwner: "App owner",
      connectionOwnerRole: "Power Platform maker",
      connectionOwnershipStatus: "confirmed",
      connectionOwnershipNotes: "App owner owns the maker connection.",
      approvalStatus: "Approved by Architect.",
      approvalConfirmationStatus: "confirmed"
    })
  ];
  const canvas = powerPlatform.canvas!;
  canvas.subtype = "tablet";
  canvas.primaryDataSourceType = "sharePointList";
  canvas.primaryConnectorId = "connector-sharepoint";
  canvas.sourcePurpose = "Store licence tracker data.";
  canvas.sourceOwnership = "IT owns SharePoint lists.";
  canvas.sourceOfTruthDecision = "SharePoint is authoritative.";
  canvas.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/licences";
  canvas.sharePointSiteTitle = "Licence Tracker";
  canvas.sharePointSiteOwner = "Site owner";
  canvas.sharePointAccessStatus = "Confirmed maker access.";
  canvas.synchronizationRequirements = "Online-only; refresh after save.";
  canvas.fileApplicabilityDecision = {
    status: "notApplicable",
    details: "",
    notApplicableReason: "Licence tracker does not upload files or use list attachments.",
    confirmationStatus: "confirmed"
  };
  canvas.componentApplicabilityDecision = {
    status: "notApplicable",
    details: "",
    notApplicableReason: "No reusable Canvas components are required.",
    confirmationStatus: "confirmed"
  };
  canvas.sharePointListSchemas = [
    createDefaultSharePointList({ id: "list-software", displayName: "Software", purpose: "Software catalogue.", expectedRecordCount: "100", attachmentsEnabled: "No", confirmationStatus: "confirmed", confirmationSource: "Architect-approved intake" }),
    createDefaultSharePointList({ id: "list-licences", displayName: "Licences", purpose: "Licence assignments.", expectedRecordCount: "500", attachmentsEnabled: "No", confirmationStatus: "confirmed", confirmationSource: "Architect-approved intake" }),
    createDefaultSharePointList({ id: "list-renewals", displayName: "Renewals", purpose: "Renewal schedule.", expectedRecordCount: "200", attachmentsEnabled: "No", confirmationStatus: "confirmed", confirmationSource: "Architect-approved intake" })
  ];
  canvas.sharePointColumnSchemas = canvas.sharePointListSchemas.flatMap((list) => [
    createDefaultSharePointColumn({ id: `${list.id}-title`, parentType: "list", parentId: list.id, displayName: "Title", internalName: "Title", columnType: "Text", requiredStatus: "Required", indexedStatus: "Indexed", uniqueValueStatus: "No", sensitiveDataStatus: "No", confirmationStatus: "confirmed", confirmationSource: "Architect-approved intake" })
  ]);
  canvas.screenTargets = [
    createDefaultCanvasScreenTarget({ id: "screen-main", displayName: "Main", approvedScreenName: "scrMain", purpose: "Browse and edit licence records.", screenType: "Tablet", confirmationStatus: "confirmed", confirmationSource: "Architect-approved intake" })
  ];
  canvas.controlTargets = [
    createDefaultCanvasControlTarget({ id: "control-save", screenId: "screen-main", approvedControlName: "btnSave", controlType: "Button", purpose: "Save the current form.", operation: "save", formulaProperties: "OnSelect", connectorId: "connector-sharepoint", entityId: "list-licences", accessibleLabelRequirement: "Save licence", displayModeRequirement: "Enabled when form is valid.", confirmationStatus: "confirmed", confirmationSource: "Architect-approved intake" }),
    createDefaultCanvasControlTarget({ id: "control-cancel", screenId: "screen-main", approvedControlName: "btnCancel", controlType: "Button", purpose: "Cancel edits.", operation: "cancel", formulaProperties: "OnSelect", accessibleLabelRequirement: "Cancel edits", displayModeRequirement: "Enabled while editing.", confirmationStatus: "confirmed", confirmationSource: "Architect-approved intake" })
  ];
  canvas.stateVariableTargets = [{
    id: "state-selected-record",
    implementationName: "varSelectedRecord",
    purpose: "Tracks the selected licence record.",
    stateRole: "selectedRecord",
    initialValue: { kind: "blank" },
    confirmationStatus: "confirmed",
    required: true,
    sortOrder: 1
  }];
  canvas.responsiveMode = "Fixed tablet.";
  canvas.targetDevices = "Tablet and desktop browser.";
  canvas.targetScreenSizes = "Tablet layout.";
  canvas.orientation = "Landscape.";
  canvas.controlGeneration = "Modern controls where available.";
  canvas.screenNamingConvention = "scrName";
  canvas.controlNamingConvention = "prefixPurpose";
  canvas.controlTypePrefixes = "btn, gal, frm, lbl";
  canvas.variableNamingConvention = "varName";
  canvas.collectionNamingConvention = "colName";
  canvas.componentNamingConvention = "cmpName";
  canvas.formulaFileNamingConvention = "screen/control/property.fx";
  canvas.yamlFileNamingConvention = "screen.control.pa.yaml";
  canvas.namingStandardConfirmationStatus = "confirmed";
  canvas.searchRequirements = "Search by title.";
  canvas.filteringRequirements = "Filter active records.";
  canvas.sortingRequirements = "Sort by renewal date.";
  canvas.delegationRequirements = "Use indexed SharePoint columns.";
  canvas.delegationStatus = "confirmed";
  project.powerPlatform = powerPlatform;
  return project;
}

describe("Phase 5B.4B.5 Canvas regression", () => {
  it("treats unknown markers as orphans without keyword heuristics", () => {
    const project = ttiStyleCanvasProject();
    const traces = traceMissingMarkers(project, [
      { fileName: "README.md", folder: "00_Project_Overview", content: "[MISSING: arbitrary unregistered answer]\n[MISSING: routine business detail]" }
    ]);
    expect(traces).toHaveLength(2);
    expect(traces.every((trace) => trace.orphan)).toBe(true);
    expect(traces.map((trace) => trace.stageId)).toEqual(["review", "review"]);
  });

  it("keeps exact and approved dynamic markers traceable without inheritance", () => {
    const project = ttiStyleCanvasProject();
    const traces = traceMissingMarkers(project, [
      {
        fileName: "README.md",
        folder: "00_Project_Overview",
        content: [
          "[MISSING: app name]",
          "[MISSING: SharePoint internal column name for Title]",
          "[MISSING: Software confirmation source]",
          "[MISSING: app names]"
        ].join("\n")
      }
    ]);
    expect(traces[0]).toMatchObject({ marker: "app name", orphan: false, stageId: "foundation", storedProperty: "project.identity.projectName" });
    expect(traces[1]).toMatchObject({ orphan: false, storedProperty: "powerPlatform.canvas.sharePointColumnSchemas[].internalName" });
    expect(traces[2]).toMatchObject({ orphan: false, storedProperty: "powerPlatform.*.confirmationSource" });
    expect(traces[3]).toMatchObject({ marker: "app names", orphan: true, storedProperty: "unregistered" });
  });

  it("derives record counts, save/cancel controls, and selected-record state from structured rows", () => {
    const project = ttiStyleCanvasProject();
    expect(effectiveCanvasExpectedRecordCounts(project).value).toContain("Software: 100");
    expect(saveCancelCanvasAssets(project).join("\n")).toContain("btnSave");
    expect(saveCancelCanvasAssets(project).join("\n")).toContain("btnCancel");
    expect(selectedRecordStateAssets(project)).toHaveLength(1);
  });

  it("uses controlled selected-record roles instead of variable-name wording", () => {
    const project = ttiStyleCanvasProject();
    project.powerPlatform!.canvas!.stateVariableTargets = [
      {
        id: "state-assignment",
        implementationName: "varSelectedAssignment",
        purpose: "Current assignment.",
        stateRole: "selectedRecord",
        initialValue: { kind: "blank" },
        confirmationStatus: "confirmed",
        required: true,
        sortOrder: 1
      },
      {
        id: "state-title",
        implementationName: "varSelectedSoftwareTitle",
        purpose: "Selected title text, not the selected record.",
        stateRole: "other",
        initialValue: { kind: "blank" },
        confirmationStatus: "confirmed",
        required: true,
        sortOrder: 2
      },
      {
        id: "state-licence",
        implementationName: "varSelectedSoftwareLicence",
        purpose: "Current licence.",
        stateRole: "selectedRecord",
        initialValue: { kind: "blank" },
        confirmationStatus: "confirmed",
        required: true,
        sortOrder: 3
      }
    ];
    expect(selectedRecordStateAssets(project).map((variable) => variable.implementationName)).toEqual([
      "varSelectedAssignment",
      "varSelectedSoftwareLicence"
    ]);
  });

  it("uses controlled save and cancel operations instead of names or purpose text", () => {
    const project = ttiStyleCanvasProject();
    const canvas = project.powerPlatform!.canvas!;
    canvas.controlTargets[0].approvedControlName = "btnCommit";
    canvas.controlTargets[0].purpose = "Persist the form without using the classification word.";
    canvas.controlTargets[0].operation = "save";
    canvas.controlTargets[1].approvedControlName = "btnAbort";
    canvas.controlTargets[1].purpose = "Leave edit mode without using the classification word.";
    canvas.controlTargets[1].operation = "cancel";
    expect(saveCancelCanvasAssets(project).join("\n")).toContain("btnCommit");
    expect(saveCancelCanvasAssets(project).join("\n")).toContain("btnAbort");
    canvas.controlTargets[0].operation = "other";
    expect(saveCancelCanvasAssets(project)).toEqual([]);
  });

  it("does not emit the known false markers for the TTI-style Canvas fixture", () => {
    const project = ttiStyleCanvasProject();
    const generated = generateProjectPackage(project);
    const content = generated.documents.map((document) => `# ${document.fileName}\n${document.content}`).join("\n\n");
    expect(content).not.toContain("[MISSING: expected record counts]");
    expect(content).not.toContain("[MISSING: legacy SharePoint notes]");
    expect(content).not.toContain("[MISSING: legacy SharePoint internal-name notes]");
    expect(content).not.toContain("[MISSING: SharePoint library records]");
    expect(content).not.toContain("[MISSING: controls]");
    expect(content).not.toContain("[MISSING: save/cancel controls]");
    expect(content).not.toContain("[MISSING: selected-record state]");
    expect(content).not.toContain("[MISSING: attachment controls]");
    expect(content).not.toContain("[MISSING: security testing]");
    expect(content).not.toContain("[MISSING: volume testing]");
    expect(content).not.toContain("[MISSING: integration testing]");
    expect(content).not.toContain("[MISSING: regression testing]");
    expect(content).not.toContain("[MISSING: user acceptance testing]");
    expect(content).not.toContain("[MISSING: production smoke testing]");
    expect(content).not.toContain("[MISSING: Git integration]");
    expect(content).not.toContain("[MISSING: Power Platform CLI availability]");
    expect(orphanMissingMarkers({ ...project, generatedDocuments: generated.documents })).toEqual([]);
  });

  it("separates answer completion from readiness confirmation", () => {
    const project = ttiStyleCanvasProject();
    expect(getProjectCompletionPercent(project)).toBe(100);
    project.powerPlatform!.common.testingPlanConfirmationStatus = "reviewNeeded";
    expect(getProjectCompletionPercent(project)).toBe(100);
    project.powerPlatform!.common.regressionTesting = "";
    expect(getProjectCompletionPercent(project)).toBeLessThan(100);
    project.powerPlatform!.common.regressionTesting = "Regression test plan restored.";
    project.powerPlatform!.common.gitIntegration = "";
    expect(getProjectCompletionPercent(project)).toBeLessThan(100);
    project.powerPlatform!.common.gitIntegration = "Not applicable because no repository integration is approved for this package.";
    project.powerPlatform!.canvas!.sharePointSiteTitle = "";
    expect(validateIntake(project).sectionResults.find((section) => section.stageId === "data")?.percentComplete).toBeLessThan(100);
    project.powerPlatform!.canvas!.sharePointSiteTitle = "Licence Tracker";
    project.powerPlatform!.canvas!.fileApplicabilityDecision = {
      status: "notApplicable",
      details: "",
      notApplicableReason: "Files are out of scope.",
      confirmationStatus: "confirmed"
    };
    project.powerPlatform!.canvas!.fileRequirements = "";
    expect(getProjectCompletionPercent(project)).toBe(100);
  });

  it("removes a generated marker after the completed field is regenerated", () => {
    const project = ttiStyleCanvasProject();
    project.powerPlatform!.common.productionSmokeTesting = "";
    const before = generateProjectPackage(project).documents.map((document) => document.content).join("\n");
    expect(before).toContain("[MISSING: production smoke testing]");
    project.powerPlatform!.common.productionSmokeTesting = "Open app, load lists, and validate role access after release.";
    const after = generateProjectPackage(project).documents.map((document) => document.content).join("\n");
    expect(after).not.toContain("[MISSING: production smoke testing]");
  });

  it("detects blank Markdown sections across the parser matrix", () => {
    expect(findBlankMarkdownSections("# Doc\n\n## H2 only nested\n\n### Empty nested\n")).toEqual(["H2 only nested"]);
    expect(findBlankMarkdownSections("# Doc\r\n\r\n## H3 content\r\n\r\n### Detail\r\nActual content\r\n")).toEqual([]);
    expect(findBlankMarkdownSections("# Doc\n\n## Empty fence\n\n```\n\n```\n")).toEqual(["Empty fence"]);
    expect(findBlankMarkdownSections("# Doc\n\n## Populated fence\n\n```\nvalue\n```\n")).toEqual([]);
    expect(findBlankMarkdownSections("# Doc\n\n## Empty table\n\n| A | B |\n| - | - |\n")).toEqual(["Empty table"]);
    expect(findBlankMarkdownSections("# Doc\n\n## Table data\n\n| A | B |\n| - | - |\n| One | Two |\n")).toEqual([]);
    expect(findBlankMarkdownSections("# Doc\n\n## Missing marker\n\n[MISSING: client answer]\n")).toEqual([]);
    expect(findBlankMarkdownSections("# Doc\n\n## None statement\n\nNone.\n")).toEqual([]);
    expect(findBlankMarkdownSections("# Doc\n\n## Not applicable statement\n\nNot applicable.\n")).toEqual([]);
    expect(findBlankMarkdownSections("# Doc\n\n## Empty list markers\n\n-\n*\n1.\n")).toEqual(["Empty list markers"]);
    expect(findBlankMarkdownSections("# Doc\n\n## Final blank\n\n<!-- no content -->\n")).toEqual(["Final blank"]);
  });

  it("surfaces orphan markers as export integrity defects", () => {
    const project = ttiStyleCanvasProject();
    const generated = generateProjectPackage(project);
    project.generatedDocuments = generated.documents.map((document, index) => index === 0
      ? { ...document, content: `${document.content}\n\n## Defect\n\n[MISSING: invisible hidden field]` }
      : document);
    const result = validateExportPackage(project);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("orphan missing-information marker"))).toBe(true);
  });
});
