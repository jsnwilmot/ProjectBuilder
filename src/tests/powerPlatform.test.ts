import { CORE_DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { DOCUMENT_PURPOSES } from "../data/documentPurposes";
import { createProject } from "../lib/createProject";
import { deriveReviewItems, getClientReviewReadiness } from "../lib/clientReview";
import { getDocumentStatusSummary } from "../lib/documentReview";
import { validateExportPackage } from "../lib/exportIntegrity";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { activeCanvasEntityReferences, reconcileCanvasConnectorSelection, validateCanvasTargets } from "../lib/canvasTargetValidation";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import {
  calculateCanvasDataverseSchemaGate,
  calculateConnectorClassificationGate,
  calculateConnectorSelectionGate,
  calculateAlmGate,
  calculateCanvasDelegationPlanningGate,
  calculateInternalNameGate,
  calculateLicensingGate,
  calculateLogicalNameGate,
  calculateCanvasPowerFxPlanningGate,
  calculateCanvasYamlPlanningGate,
  calculateModelDrivenBusinessLogicGate,
  calculateModelDrivenExtensionsGate,
  calculateModelDrivenFormsAndViewsGate,
  calculateModelDrivenDataverseSchemaGate,
  calculateModelDrivenEligibilityGate,
  calculateModelDrivenExternalConnectorClassificationGate,
  calculateModelDrivenExternalConnectorLicensingGate,
  calculateModelDrivenExternalConnectorSelectionGate,
  calculateModelDrivenNavigationGate,
  calculateModelDrivenSecurityArchitectureGate,
  calculateOtherConnectorSchemaGate,
  calculatePowerPlatformReadiness,
  calculateSharePointSchemaGate,
  createDefaultConnectorField,
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultConnectorResource,
  createDefaultDataverseColumn,
  createDefaultDataverseRelationship,
  createDefaultDataverseTable,
  createDefaultSharePointColumn,
  createDefaultSharePointLibrary,
  createDefaultSharePointList,
  expectedDocumentLocations,
  expectedPowerPlatformDocuments,
  getSelectedCanvasDataSourceTypes,
  isCanvasProject,
  isLegacyMicrosoftProject,
  isModelDrivenProject,
  normalizePowerPlatformData,
  requiresDataverseLicensing,
  requiresInternalColumnNames,
  requiresLogicalNames,
  reconcileCanvasConnectorRoles,
  usesDataverse,
  usesMultipleDataSources,
  usesOtherConnector,
  usesSharePoint
} from "../lib/powerPlatform";
import {
  PHASE_GATE_EVALUATORS,
  assertKnownPhaseGateId,
  evaluatePhaseGate,
  isPhaseGatePassing
} from "../lib/phaseGates";
import { canvasPhaseDefinitions, modelDrivenPhaseDefinitions } from "../templates/documents";

function generatedDocument(project: ReturnType<typeof createProject>, fileName: string): string {
  const document = generateProjectPackage(project).documents.find((candidate) => candidate.fileName === fileName);
  if (!document) throw new Error(`Expected generated document ${fileName}.`);
  return document.content;
}

function markReady(project: ReturnType<typeof createProject>) {
  project.readinessConfirmations = {
    ...project.readinessConfirmations,
    scopeReviewed: true,
    acceptanceCriteriaReviewed: true,
    draftPackageReviewed: true
  };
  project.packageGeneratedAt = "2026-07-12T12:00:00.000Z";
  project.reviewItems = deriveReviewItems(project).map((item) => ({ ...item, status: "Answered" }));
  return project;
}

function createReadyCanvasProject() {
  const project = createProject({
    identity: { id: "ready-canvas", projectName: "Ready Canvas" },
    client: { clientName: "Client", businessName: "Business" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Track approved service requests.",
      problemStatement: "Teams need a controlled request app.",
      targetPlatform: "Power Apps Canvas",
      targetUsers: "Requesters\nReviewers",
      userRoles: "Requester\nReviewer",
      requiredFeatures: "Create request\nReview request\nArchive request",
      featureDescription: "Canvas request tracking.",
      workflows: "Submit and review requests.",
      workflowTrigger: "Requester submits a request.",
      workflowSteps: "Create\nReview\nArchive",
      workflowOutcome: "Request is tracked.",
      screens: "Home\nRequest form\nReview queue",
      dataCollections: "Requests",
      fields: "Title, Status, Owner",
      keyFields: "Title, Status",
      integrations: "SharePoint",
      reportsDashboards: "Status summary",
      dataSources: "SharePoint Online list",
      dataEntities: "Request",
      relationships: "Requests may link to supporting documents by request title.",
      dataOwnership: "Operations owns request data.",
      dataRetentionNotes: "Retain active and archived requests according to internal policy.",
      fieldTypes: "Title: text\nStatus: choice\nOwner: person",
      requiredDataFields: "Title\nStatus",
      workflowInputs: "Request title and status.",
      workflowOutputs: "Submitted or reviewed request record.",
      workflowRoles: "Requester submits; reviewer reviews.",
      workflowDecisionPoints: "Reviewer approves archive or sends back.",
      workflowFailureHandling: "Show validation or connector error and keep unsaved changes visible.",
      automations: "No Power Automate flows in first release.",
      notifications: "In-app success and error notifications only.",
      permissionRules: "Requesters create; reviewers update.",
      roleAccessNotes: "Requester can create and read own requests; reviewer can update queue items.",
      sensitiveDataNotes: "No sensitive personal data.",
      dataProtectionExpectations: "No secrets, no sensitive personal data, and least-privilege access.",
      authenticationExpectation: "Microsoft Entra ID through Power Apps.",
      authorizationExpectation: "SharePoint permissions plus app role checks.",
      auditLoggingNeeds: "Track status changes and reviewer actions.",
      complianceNotes: "Internal operational use only.",
      hostingStatus: "Power Apps environment with manual publish.",
      domainStatus: "Not applicable for Canvas app.",
      brandStatus: "Not applicable for internal Canvas app.",
      logoStatus: "No logo required.",
      logoFiles: "Not applicable.",
      primaryColors: "Use standard accessible theme.",
      secondaryColors: "Use standard accessible theme.",
      fontPreferences: "Use platform default fonts.",
      brandTone: "Professional and concise.",
      imageStyle: "No imagery required.",
      iconStyle: "Use standard Power Apps icons.",
      referenceSites: "Not applicable.",
      brandRestrictions: "Keep accessible contrast.",
      faviconNeeded: "Not applicable.",
      openGraphImageNeeded: "Not applicable.",
      socialAssetsNeeded: "Not applicable.",
      contentSource: "Architect-approved intake.",
      approvedAssets: "No external assets required.",
      accessibilityContrastNotes: "Meet WCAG AA contrast.",
      brandingNotes: "Use approved internal operations styling.",
      outOfScope: "Online payments\nPublic website",
      accessibilityNotes: "Keyboard and labels required.",
      acceptanceNotes: "Create, edit, archive, and export checks pass.",
      constraints: "Use standard connectors.",
      risks: "SharePoint permissions must be confirmed.",
      assumptions: "Tenant access is available.",
      successCriteria: "Approved users can manage requests."
    }
  });
  const pp = project.powerPlatform!;
  pp.common.tenant = "Contoso";
  pp.common.environment = "Development";
  pp.common.environmentType = "Developer";
  pp.common.developmentEnvironment = "Development";
  pp.common.testEnvironment = "Test";
  pp.common.productionEnvironment = "Production";
  pp.common.environmentAccessStatus = "confirmed";
  pp.common.businessOwner = "Business Owner";
  pp.common.appOwner = "App Owner";
  pp.common.technicalOwner = "Technical Owner";
  pp.common.supportOwner = "Support Owner";
  pp.common.dataverseAvailability = "notApplicable";
  pp.common.premiumConnectorAvailability = "notApplicable";
  pp.common.customConnectorAvailability = "notApplicable";
  pp.common.licensingConfirmationStatus = "confirmed";
  pp.common.securityReviewStatus = "confirmed";
  pp.common.testingPlanConfirmationStatus = "confirmed";
  pp.common.almConfirmationStatus = "confirmed";
  pp.common.environmentCreationResponsibility = "Tenant admin";
  pp.common.managedEnvironmentRequirement = "Not required";
  pp.common.dlpPolicyRequirements = "Use existing business connector policy.";
  pp.common.administrativeLimitations = "No admin-only actions in app runtime.";
  pp.common.expectedUserCount = "50";
  pp.common.existingLicences = "Microsoft 365 seeded Power Apps use rights.";
  pp.common.currentPowerAppsLicences = "Microsoft 365 seeded Power Apps use rights.";
  pp.common.currentPowerAutomateLicences = "Microsoft 365 seeded Power Automate use rights.";
  pp.common.powerBiLicensing = "Not applicable.";
  pp.common.pcfRequirements = "No PCF controls required.";
  pp.common.licensingBudgetConstraints = "Use standard connectors only.";
  pp.common.licensingStatus = "Confirmed standard connector scope.";
  pp.common.licensingAssumptions = "No premium connectors or Dataverse for Canvas.";
  pp.common.outstandingLicensingDecisions = "None.";
  pp.common.solutionAware = "No; Canvas app can be manually exported if required.";
  pp.common.solutionName = "ReadyCanvas";
  pp.common.solutionUniqueName = "ready_canvas";
  pp.common.publisherName = "Contoso";
  pp.common.publisherPrefix = "ct";
  pp.common.authenticationRequirements = "Microsoft Entra ID.";
  pp.common.authorizationRequirements = "Role-based controls.";
  pp.common.roleBasedInterfaceExpectations = "Requester and reviewer views.";
  pp.common.accessibilityRequirements = "Keyboard navigation, labels, and visible focus.";
  pp.common.complianceRequirements = "Internal business use only.";
  pp.common.dataClassification = "Internal.";
  pp.common.dataRetentionRequirements = "Retain active and archived requests per policy.";
  pp.common.recordAccessRules = "SharePoint permissions and app role checks.";
  pp.common.auditRequirements = "Track request status changes.";
  pp.common.loggingRequirements = "Record request status history.";
  pp.common.privacyRequirements = "No secrets in app.";
  pp.common.keyboardNavigationRequirements = "All controls reachable by keyboard.";
  pp.common.screenReaderRequirements = "All controls have accessible labels.";
  pp.common.accessibleLabelRequirements = "Labels match control purpose.";
  pp.common.focusOrderRequirements = "Follow visual order.";
  pp.common.colourContrastRequirements = "Meet WCAG AA.";
  pp.common.errorMessageRequirements = "Plain-language errors.";
  pp.common.responsiveTextRequirements = "Text wraps on phone layouts.";
  pp.common.mobileAccessibilityRequirements = "Touch targets meet minimum size.";
  pp.common.knownAccommodations = "None.";
  pp.common.functionalTesting = "Create, edit, archive, restore.";
  pp.common.connectorTesting = "SharePoint CRUD.";
  pp.common.permissionTesting = "Requester/reviewer checks.";
  pp.common.securityTesting = "Least privilege.";
  pp.common.accessibilityTesting = "Keyboard and labels.";
  pp.common.performanceTesting = "List volume smoke test.";
  pp.common.volumeTesting = "5,000 records.";
  pp.common.integrationTesting = "SharePoint connector.";
  pp.common.regressionTesting = "Existing requests unaffected.";
  pp.common.userAcceptanceTesting = "Business owner approval.";
  pp.common.deploymentTesting = "Test environment publish.";
  pp.common.productionSmokeTesting = "Production load and connector smoke.";
  pp.common.sourceControlApproach = "Repository documentation.";
  pp.common.gitIntegration = "Not required.";
  pp.common.powerPlatformCliAvailability = "Not required.";
  pp.common.almApproach = "Manual export and publish.";
  pp.common.deploymentMethod = "Manual Power Apps publish.";
  pp.common.deploymentOwner = "Technical Owner";
  pp.common.deploymentResponsibility = "Technical Owner";
  pp.common.deploymentResponsibilityStatus = "confirmed";
  pp.common.deploymentStrategy = "Dev to test to production.";
  pp.common.connectionReferences = "SharePoint connection owned by service account.";
  pp.common.environmentVariables = "SiteUrl per environment.";
  pp.common.pipelineRequirements = "Manual approval.";
  pp.common.rollbackExpectations = "Restore previous app version.";
  pp.common.releaseApprover = "Business Owner";
  pp.common.releaseApprovalResponsibility = "Business Owner";
  pp.common.releaseApprovalStatus = "confirmed";
  pp.common.connectors = [
    createDefaultConnector({
      id: "sp",
      displayName: "SharePoint",
      purpose: "Store requests",
      dataSourceName: "Requests",
      dataSourceType: "sharePointList",
      canvasRole: "primary",
      connectorClassification: "standard",
      classificationConfirmationStatus: "confirmed",
      licenceRequirement: "Included with standard licence",
      licensingConfirmationStatus: "confirmed",
      authenticationMethod: "Microsoft Entra ID",
      gatewayRequirement: "No gateway",
      environmentRequirement: "Development/test/production",
      dlpImpact: "Business connector group",
      delegationSupport: "Delegable indexed columns",
      expectedRecordVolume: "5000",
      limitations: "SharePoint delegation limits require indexed columns.",
      connectionOwner: "Service Account Owner",
      connectionOwnerRole: "Maintains SharePoint connection references",
      connectionOwnershipStatus: "confirmed",
      connectionOwnershipNotes: "Owned by operations service account.",
      requiredConnectorPermissions: "SharePoint list read, create, update, archive status updates, and document library upload/download permissions.",
      permissionOwner: "Operations Owner",
      permissionValidationMethod: "Validate Requester and Reviewer roles against the Requests list and Supporting Documents library.",
      permissionConfirmationStatus: "confirmed",
      approvalStatus: "Approved",
      approvalConfirmationStatus: "confirmed"
    })
  ];
  const canvas = pp.canvas!;
  canvas.subtype = "blankResponsive";
  canvas.responsiveMode = "Responsive containers.";
  canvas.targetDevices = "Desktop, tablet, and phone.";
  canvas.targetScreenSizes = "390px phone through desktop.";
  canvas.orientation = "Portrait-first with responsive desktop layout.";
  canvas.supportedBrowsers = "Current Edge and Chrome.";
  canvas.teamsEmbedding = "Not required.";
  canvas.componentLibraryRequirement = "No component library required.";
  canvas.componentApplicabilityDecision = {
    status: "notApplicable",
    details: "",
    notApplicableReason: "No reusable Canvas components are required for the first release.",
    confirmationStatus: "confirmed"
  };
  canvas.customPageRequirement = "Not applicable.";
  canvas.mobileDeviceCapabilities = "No device-specific capabilities required.";
  canvas.primaryDataSourceType = "sharePointList";
  canvas.selectedDataSourceTypes = ["sharePointList"];
  canvas.primaryConnectorId = "sp";
  canvas.sourcePurpose = "Track requests";
  canvas.sourceOwnership = "Operations";
  canvas.readWriteResponsibilities = "Canvas app reads and writes approved request records.";
  canvas.synchronizationExpectations = "Online-only SharePoint sync.";
  canvas.conflictHandling = "Last writer wins with validation warning.";
  canvas.sourceOfTruthDecision = "SharePoint list is source of truth.";
  canvas.expectedRecordCounts = "5000";
  canvas.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
  canvas.sharePointSiteTitle = "Operations";
  canvas.sharePointSiteOwner = "Operations Owner";
  canvas.sharePointEnvironment = "Development, test, and production sites.";
  canvas.sharePointAccessStatus = "confirmed";
  canvas.sharePointListDefinitions = "Requests list with Title, Status, and Owner columns.";
  canvas.sharePointColumnDefinitions = "Title, Status, and Owner internal names confirmed.";
  canvas.sharePointLibraryDefinitions = "Supporting Documents library for approved attachments.";
  canvas.sharePointListSchemas = [createDefaultSharePointList({
    id: "requests",
    displayName: "Requests",
    purpose: "Track requests",
    expectedRecordCount: "5000",
    attachmentsEnabled: "Disabled; files use Supporting Documents library.",
    versioningExpectation: "Major versioning enabled.",
    permissionExpectation: "Inherited site permissions plus app role checks.",
    recordStatusModel: "Draft, Submitted, Reviewed, Archived.",
    archiveBehavior: "Set status to Archived.",
    restoreBehavior: "Set status back to Reviewed.",
    confirmationStatus: "confirmed",
    confirmationSource: "Architect"
  })];
  canvas.sharePointColumnSchemas = [
    createDefaultSharePointColumn({
      id: "title",
      parentType: "list",
      parentId: "requests",
      displayName: "Title",
      internalName: "Title",
      columnType: "Text",
      requiredStatus: "Required",
      defaultValue: "None",
      choiceValues: "Not applicable",
      lookupList: "Not applicable",
      lookupColumn: "Not applicable",
      personFieldBehavior: "Not applicable",
      dateTimeBehavior: "Not applicable",
      indexedStatus: "Indexed",
      uniqueValueStatus: "Not unique",
      sensitiveDataStatus: "Not sensitive",
      notes: "Primary request title.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointColumn({
      id: "status",
      parentType: "list",
      parentId: "requests",
      displayName: "Status",
      internalName: "Status",
      columnType: "Choice",
      requiredStatus: "Required",
      defaultValue: "Draft",
      choiceValues: "Draft; Submitted; Reviewed; Archived",
      lookupList: "Not applicable",
      lookupColumn: "Not applicable",
      personFieldBehavior: "Not applicable",
      dateTimeBehavior: "Not applicable",
      indexedStatus: "Indexed",
      uniqueValueStatus: "Not unique",
      sensitiveDataStatus: "Not sensitive",
      notes: "Workflow status.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointColumn({
      id: "document-title",
      parentType: "library",
      parentId: "supporting-documents",
      displayName: "Request Title",
      internalName: "RequestTitle",
      columnType: "Text",
      requiredStatus: "Required",
      defaultValue: "None",
      choiceValues: "Not applicable",
      lookupList: "Not applicable",
      lookupColumn: "Not applicable",
      personFieldBehavior: "Not applicable",
      dateTimeBehavior: "Not applicable",
      indexedStatus: "Indexed",
      uniqueValueStatus: "Not unique",
      sensitiveDataStatus: "Not sensitive",
      notes: "Links supporting files to request title.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.sharePointLibrarySchemas = [createDefaultSharePointLibrary({
    id: "supporting-documents",
    displayName: "Supporting Documents",
    purpose: "Store approved request attachments when needed.",
    folderStructure: "Folder per request ID.",
    contentTypes: "Document",
    fileTypes: "PDF, DOCX, PNG, JPG",
    fileSizeExpectations: "Up to 10 MB per file.",
    uploadBehavior: "Reviewer uploads only.",
    downloadBehavior: "Requester and reviewer download.",
    versioning: "Major versioning enabled.",
    permissions: "Inherited site permissions.",
    retention: "Same as request retention.",
    metadataColumnIds: ["title", "status"],
    confirmationStatus: "confirmed",
    confirmationSource: "Architect"
  })];
  canvas.schemaStatus = "confirmed";
  canvas.internalNameStatus = "confirmed";
  canvas.offlineRequirements = "Online-only.";
  canvas.synchronizationRequirements = "SharePoint connector online sync.";
  canvas.fileApplicabilityDecision = {
    status: "required",
    details: "Supporting documents are stored in a confirmed SharePoint document library.",
    notApplicableReason: "",
    confirmationStatus: "confirmed"
  };
  canvas.attachmentRequirements = "Use Supporting Documents library.";
  canvas.fileRequirements = "PDF and image support only.";
  canvas.fileUploadRequirements = "Reviewer uploads supporting PDF or image files to the Supporting Documents library.";
  canvas.fileDownloadRequirements = "Requester and reviewer can download approved files from the library.";
  canvas.fileMetadataRequirements = "Request title and status metadata link files to the request.";
  canvas.fileSizeRequirements = "Maximum 10 MB per file.";
  canvas.filePermissionRequirements = "Requester and reviewer permissions follow SharePoint and app roles.";
  canvas.fileValidationRequirements = "Validate approved file types, size limit, and required metadata before upload.";
  canvas.screens = "Home, Request form, Review queue.";
  canvas.screenNames = "Home; RequestForm; ReviewQueue.";
  canvas.screenPurposes = "Home routes users; RequestForm captures requests; ReviewQueue supports reviewers.";
  canvas.entryPoints = "Home screen.";
  canvas.exitPoints = "Save, cancel, archive.";
  canvas.navigationStructure = "Home to form or queue by role.";
  canvas.canvasUserRoles = "Requester; Reviewer.";
  canvas.containers = "Responsive vertical and horizontal containers.";
  canvas.components = "No shared component library.";
  canvas.galleries = "Review queue gallery.";
  canvas.forms = "Request edit form.";
  canvas.tables = "Requests list.";
  canvas.dialogs = "Archive confirmation dialog.";
  canvas.loadingStates = "Spinner during SharePoint operations.";
  canvas.emptyStates = "No requests message.";
  canvas.errorStates = "Friendly connector error panel.";
  canvas.responsiveRules = "Containers wrap at phone width.";
  canvas.visibilityRules = "Role-based reviewer controls.";
  canvas.displayModeRules = "Disable save until required fields are valid.";
  canvas.controls = "Text input, dropdown, gallery, edit form, buttons.";
  canvas.screenTargets = [
    {
      id: "screen-home",
      displayName: "Home",
      approvedScreenName: "scrHome",
      purpose: "Route requesters and reviewers to the right flow.",
      screenType: "landing",
      entryPoints: "App StartScreen",
      exitPoints: "scrRequestForm; scrReviewQueue",
      dataSourceIds: ["requests"],
      yamlOutputType: "screen",
      yamlParentId: "app-root",
      yamlInstallationLocation: "Power Apps Studio screen tree",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    },
    {
      id: "screen-request-form",
      displayName: "Request form",
      approvedScreenName: "scrRequestForm",
      purpose: "Capture and submit request details.",
      screenType: "form",
      entryPoints: "scrHome",
      exitPoints: "scrHome",
      dataSourceIds: ["requests"],
      yamlOutputType: "screen",
      yamlParentId: "app-root",
      yamlInstallationLocation: "Power Apps Studio screen tree",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    },
    {
      id: "screen-review-queue",
      displayName: "Review queue",
      approvedScreenName: "scrReviewQueue",
      purpose: "Let reviewers search, update, archive, restore, and attach supporting documents.",
      screenType: "queue",
      entryPoints: "scrHome",
      exitPoints: "scrHome",
      dataSourceIds: ["requests", "supporting-documents"],
      yamlOutputType: "screen",
      yamlParentId: "app-root",
      yamlInstallationLocation: "Power Apps Studio screen tree",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }
  ].map((target) => createDefaultCanvasScreenTarget(({
    ...target,
    ...target,
    dataSourceApplicabilityDecision: {
      status: "required",
      details: "Screen uses confirmed structured request data entities.",
      notApplicableReason: "",
      confirmationStatus: "confirmed"
    },
    dataSourceEntityIds: target.dataSourceIds,
    dataSourceReferences: target.dataSourceIds.map((entityId) => ({ connectorId: "sp", entityId })),
    yamlOutputDecision: {
      status: "required",
      details: "Screen YAML target is required for handoff planning.",
      notApplicableReason: "",
      confirmationStatus: "confirmed"
    },
    yamlParentType: "app"
  }) as Partial<ReturnType<typeof createDefaultCanvasScreenTarget>>));
  canvas.controlTargets = [
    {
      id: "control-load-requests",
      screenId: "screen-home",
      parentControlId: "",
      approvedControlName: "galRecentRequests",
      controlType: "Gallery",
      purpose: "Load recent request records.",
      operation: "read",
      formulaProperties: "Items",
      dataSourceId: "sp",
      dataSourceEntityId: "requests",
      requiredFieldIds: ["title", "status"],
      dependencies: "Requests list",
      visibilityRequirement: "Visible to all authenticated users.",
      displayModeRequirement: "View only.",
      accessibleLabelRequirement: "Recent requests",
      yamlOutputType: "control",
      yamlParentId: "screen-home",
      yamlInstallationLocation: "Inside scrHome",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    },
    {
      id: "control-create-request",
      screenId: "screen-request-form",
      parentControlId: "",
      approvedControlName: "btnSubmitRequest",
      controlType: "Button",
      purpose: "Create a request record.",
      operation: "create",
      formulaProperties: "OnSelect",
      dataSourceId: "sp",
      dataSourceEntityId: "requests",
      requiredFieldIds: ["title", "status"],
      dependencies: "Requests list; required field validation",
      visibilityRequirement: "Visible to requesters.",
      displayModeRequirement: "Disabled until required fields are valid.",
      accessibleLabelRequirement: "Submit request",
      yamlOutputType: "control",
      yamlParentId: "screen-request-form",
      yamlInstallationLocation: "Inside scrRequestForm",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    },
    {
      id: "control-edit-request",
      screenId: "screen-review-queue",
      parentControlId: "",
      approvedControlName: "frmReviewRequest",
      controlType: "Edit form",
      purpose: "Update reviewed request records.",
      operation: "update",
      formulaProperties: "OnSuccess",
      dataSourceId: "sp",
      dataSourceEntityId: "requests",
      requiredFieldIds: ["title", "status"],
      dependencies: "Requests list; selected gallery item",
      visibilityRequirement: "Visible to reviewers.",
      displayModeRequirement: "Edit for reviewers.",
      accessibleLabelRequirement: "Review request form",
      yamlOutputType: "control",
      yamlParentId: "screen-review-queue",
      yamlInstallationLocation: "Inside scrReviewQueue",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    },
    {
      id: "control-archive-request",
      screenId: "screen-review-queue",
      parentControlId: "",
      approvedControlName: "btnArchiveRequest",
      controlType: "Button",
      purpose: "Archive reviewed request records.",
      operation: "archive",
      formulaProperties: "OnSelect",
      dataSourceId: "sp",
      dataSourceEntityId: "requests",
      requiredFieldIds: ["status"],
      dependencies: "Requests list; selected request status",
      visibilityRequirement: "Visible to reviewers.",
      displayModeRequirement: "Enabled when selected record is not archived.",
      accessibleLabelRequirement: "Archive request",
      yamlOutputType: "control",
      yamlParentId: "screen-review-queue",
      yamlInstallationLocation: "Inside scrReviewQueue",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    },
    {
      id: "control-restore-request",
      screenId: "screen-review-queue",
      parentControlId: "",
      approvedControlName: "btnRestoreRequest",
      controlType: "Button",
      purpose: "Restore archived request records.",
      operation: "restore",
      formulaProperties: "OnSelect",
      dataSourceId: "sp",
      dataSourceEntityId: "requests",
      requiredFieldIds: ["status"],
      dependencies: "Requests list; selected request status",
      visibilityRequirement: "Visible to reviewers.",
      displayModeRequirement: "Enabled when selected record is archived.",
      accessibleLabelRequirement: "Restore request",
      yamlOutputType: "control",
      yamlParentId: "screen-review-queue",
      yamlInstallationLocation: "Inside scrReviewQueue",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    },
    {
      id: "control-search-requests",
      screenId: "screen-review-queue",
      parentControlId: "",
      approvedControlName: "txtRequestSearch",
      controlType: "Text input",
      purpose: "Search requests by title.",
      operation: "search",
      formulaProperties: "Default; OnChange",
      dataSourceId: "sp",
      dataSourceEntityId: "requests",
      requiredFieldIds: ["title"],
      dependencies: "Requests list; review queue gallery",
      visibilityRequirement: "Visible to reviewers.",
      displayModeRequirement: "Edit.",
      accessibleLabelRequirement: "Search requests",
      yamlOutputType: "control",
      yamlParentId: "screen-review-queue",
      yamlInstallationLocation: "Inside scrReviewQueue",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    },
    {
      id: "control-file-upload",
      screenId: "screen-review-queue",
      parentControlId: "",
      approvedControlName: "attSupportingDocuments",
      controlType: "Attachments",
      purpose: "Upload and download supporting documents.",
      operation: "upload",
      formulaProperties: "OnAddFile; OnRemoveFile",
      dataSourceId: "sp",
      dataSourceEntityId: "supporting-documents",
      requiredFieldIds: ["document-title"],
      dependencies: "Supporting Documents library; selected request",
      visibilityRequirement: "Visible to reviewers.",
      displayModeRequirement: "Edit for reviewers.",
      accessibleLabelRequirement: "Supporting documents",
      yamlOutputType: "control",
      yamlParentId: "screen-review-queue",
      yamlInstallationLocation: "Inside scrReviewQueue",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }
  ].map((target) => createDefaultCanvasControlTarget(({
    ...target,
    ...target,
    formulaOutputDecision: {
      status: "required",
      details: "Control has required formula output target.",
      notApplicableReason: "",
      confirmationStatus: "confirmed"
    },
    connectorId: target.dataSourceId,
    entityId: target.dataSourceEntityId,
    dependencyApplicabilityDecision: {
      status: "required",
      details: "Control formula dependencies are recorded.",
      notApplicableReason: "",
      confirmationStatus: "confirmed"
    },
    yamlOutputDecision: {
      status: "required",
      details: "Control YAML target is required for handoff planning.",
      notApplicableReason: "",
      confirmationStatus: "confirmed"
    },
    yamlParentType: "screen"
  }) as Partial<ReturnType<typeof createDefaultCanvasControlTarget>>));
  canvas.componentTargets = [];
  canvas.screenNamingConvention = "Screens use scr + PascalCase approved names, such as scrHome.";
  canvas.controlNamingConvention = "Controls use type prefix plus PascalCase purpose, such as btnSubmitRequest.";
  canvas.controlTypePrefixes = "gal for galleries; frm for forms; btn for buttons; txt for text inputs; att for attachment controls.";
  canvas.variableNamingConvention = "Global variables use varPrefix and context variables use locPrefix.";
  canvas.collectionNamingConvention = "Collections use colPrefix.";
  canvas.componentNamingConvention = "Components use cmpPrefix if components are later approved.";
  canvas.formulaFileNamingConvention = "Formula files use 07_Development/PowerFx/<screen-id>/<control-id>/<property>.fx.";
  canvas.yamlFileNamingConvention = "YAML files use 04_UI_UX/YAML/<screen-id>.screen.pa.yaml and child target paths.";
  canvas.namingStandardConfirmationStatus = "confirmed";
  canvas.appFormulasRequirements = "Reusable calculations.";
  canvas.startScreenRequirements = "Route by role.";
  canvas.onStartRequirements = "Load app settings.";
  canvas.namedFormulaRequirements = "Use named formulas for constants.";
  canvas.globalVariableRequirements = "Avoid global variables except current user role.";
  canvas.contextVariableRequirements = "Use screen context for temporary dialog state.";
  canvas.collectionRequirements = "Use collections only for local lookup caches.";
  canvas.createBehavior = "Create requests.";
  canvas.readBehavior = "Read requests.";
  canvas.updateBehavior = "Update requests.";
  canvas.archiveBehavior = "Archive requests.";
  canvas.restoreBehavior = "Restore requests.";
  canvas.deleteRestrictions = "No hard delete in first release.";
  canvas.validationRequirements = "Required title and status.";
  canvas.errorHandlingRequirements = "Show friendly errors.";
  canvas.notificationRequirements = "Notify success and validation failures.";
  canvas.searchRequirements = "Search title.";
  canvas.filteringRequirements = "Filter by status.";
  canvas.sortingRequirements = "Sort by created date.";
  canvas.delegationRequirements = "Use delegable indexed fields.";
  canvas.concurrentUpdateHandling = "Warn user and refresh record.";
  canvas.powerFxStatus = "confirmed";
  canvas.fullScreenYamlRequired = "Allowed after validation.";
  canvas.controlLevelYamlRequired = "Allowed after validation.";
  canvas.containerYamlRequired = "Allowed after validation.";
  canvas.componentYamlRequired = "Allowed after validation.";
  canvas.paYamlSourceRequired = "Not required.";
  canvas.expectedInstallationMethod = "Manual Studio validation.";
  canvas.codeViewPasteMethod = "Not approved for this release.";
  canvas.existingSourceAvailability = "No existing source.";
  canvas.existingAppDependencies = "None.";
  canvas.postPasteActions = "Validate manually in Power Apps Studio if YAML is later approved.";
  canvas.validationResponsibility = "Technical Owner";
  canvas.namedFormulas = "AppConstants and CurrentUserRole.";
  canvas.globalVariables = "varCurrentUserRole only.";
  canvas.contextVariables = "locShowArchiveDialog.";
  canvas.collections = "colStatusChoices.";
  canvas.yamlStatus = "confirmed";
  canvas.delegationStatus = "confirmed";
  canvas.manualInstallationStatus = "Not started.";
  canvas.studioValidationStatus = "Planned.";
  canvas.publicationStatus = "Not started.";
  canvas.deploymentStatus = "Not started.";
  return markReady(project);
}

function createReadyModelDrivenProject() {
  const project = createProject({
    identity: { id: "ready-model", projectName: "Ready Model" },
    client: { clientName: "Client", businessName: "Business" },
    intake: {
      appType: "powerAppsModelDriven",
      appPurpose: "Manage approved records.",
      problemStatement: "Teams need a governed model-driven app.",
      targetPlatform: "Power Apps model-driven app",
      targetUsers: "Managers\nStaff",
      userRoles: "Manager\nStaff",
      requiredFeatures: "Manage records\nReview records",
      featureDescription: "Model-driven record management.",
      workflows: "Create and review records.",
      workflowTrigger: "Record is created.",
      workflowSteps: "Create\nReview\nClose",
      workflowInputs: "Request name\nRequest status\nAssigned owner",
      workflowOutputs: "Tracked request record\nReview status",
      workflowDecisionPoints: "Manager approves or returns the request.",
      workflowFailureHandling: "Validation errors keep the record on the form with platform messages.",
      workflowOutcome: "Record lifecycle is tracked.",
      screens: "Main app\nRecord form",
      dataCollections: "Requests",
      fields: "Name, Status",
      fieldTypes: "Name: text\nStatus: choice",
      requiredDataFields: "Name\nStatus",
      keyFields: "Name",
      dataSources: "Dataverse",
      dataEntities: "Request",
      relationships: "Account to Request lookup.",
      dataOwnership: "Operations owns Request records.",
      dataRetentionNotes: "Retain active and closed records per internal policy.",
      integrations: "Dataverse",
      reportsDashboards: "Active records view",
      automations: "No Power Automate flows in first release.",
      notifications: "Platform form validation only.",
      permissionRules: "Managers own; staff read.",
      sensitiveDataNotes: "Business data only.",
      dataProtectionExpectations: "Use Dataverse security roles and no secrets in generated documents.",
      roleAccessNotes: "Managers create/update; staff read assigned records.",
      authenticationExpectation: "Microsoft Entra ID.",
      authorizationExpectation: "Dataverse security roles.",
      auditLoggingNeeds: "Audit status changes.",
      complianceNotes: "Internal business process only.",
      outOfScope: "No custom plug-ins\nNo PCF controls\nNo external connector integration",
      brandingNotes: "Use standard model-driven app styling.",
      brandStatus: "Standard platform branding approved.",
      logoStatus: "No custom logo required.",
      logoFiles: "Not applicable for first release.",
      primaryColors: "Use standard model-driven theme.",
      secondaryColors: "Use standard model-driven theme.",
      fontPreferences: "Use standard model-driven fonts.",
      brandTone: "Professional internal operations tone.",
      imageStyle: "No custom imagery required.",
      iconStyle: "Standard platform icons.",
      referenceSites: "Existing internal model-driven apps.",
      brandRestrictions: "Do not add custom branding without approval.",
      faviconNeeded: "Not applicable for model-driven app.",
      openGraphImageNeeded: "Not applicable for model-driven app.",
      socialAssetsNeeded: "Not applicable for model-driven app.",
      contentSource: "Business owner-approved operations copy.",
      approvedAssets: "No custom assets required.",
      hostingStatus: "Power Platform environment with managed solution deployment.",
      domainStatus: "Not applicable for model-driven app.",
      accessibilityNotes: "Standard platform accessibility.",
      acceptanceNotes: "Forms, views, roles, and import checks pass.",
      constraints: "Use Dataverse.",
      risks: "Privileges must be confirmed.",
      assumptions: "Environment exists.",
      successCriteria: "Users can manage records."
    }
  });
  const pp = project.powerPlatform!;
  Object.assign(pp.common, {
    tenant: "Contoso",
    environment: "Development",
    environmentType: "Sandbox",
    developmentEnvironment: "Development",
    testEnvironment: "Test",
    productionEnvironment: "Production",
    environmentAccessStatus: "confirmed",
    businessOwner: "Business Owner",
    appOwner: "App Owner",
    technicalOwner: "Technical Owner",
    supportOwner: "Support Owner",
    dataverseAvailability: "confirmed",
    licensingConfirmationStatus: "confirmed",
    securityReviewStatus: "confirmed",
    testingPlanConfirmationStatus: "confirmed",
    almConfirmationStatus: "confirmed",
    solutionName: "ReadyModel",
    solutionUniqueName: "ready_model",
    publisherName: "Contoso",
    publisherPrefix: "ct",
    authenticationRequirements: "Microsoft Entra ID.",
    authorizationRequirements: "Security roles.",
    recordAccessRules: "Owner/team access.",
    auditRequirements: "Audit status changes.",
    privacyRequirements: "No secrets.",
    functionalTesting: "Forms and views.",
    connectorTesting: "Dataverse.",
    permissionTesting: "Role tests.",
    securityTesting: "Least privilege.",
    performanceTesting: "Model-driven form and view load checks.",
    volumeTesting: "Validate expected 5000 request records.",
    integrationTesting: "Dataverse table, form, view, and security checks.",
    regressionTesting: "Confirm create, review, and close flow remains intact.",
    userAcceptanceTesting: "Business owner validates request lifecycle.",
    productionSmokeTesting: "Open app, view records, create test record, and verify security role access.",
    accessibilityTesting: "Keyboard.",
    deploymentTesting: "Import validation.",
    sourceControlApproach: "Solution export tracked.",
    deploymentMethod: "Managed solution import.",
    deploymentOwner: "Technical Owner",
    deploymentResponsibility: "Technical Owner",
    deploymentResponsibilityStatus: "confirmed",
    deploymentStrategy: "Dev/test/prod.",
    connectionReferences: "None required.",
    environmentVariables: "None required.",
    pipelineRequirements: "Manual approval.",
    rollbackExpectations: "Restore prior managed solution.",
    releaseApprover: "Business Owner",
    releaseApprovalResponsibility: "Business Owner",
    releaseApprovalStatus: "confirmed",
    appSubtype: "requestManagement",
    solutionAware: "Yes; model-driven app is solution-aware.",
    gitIntegration: "Not required.",
    powerPlatformCliAvailability: "Not required for this package.",
    currentPowerAppsLicences: "Power Apps per-app or per-user licensing confirmed.",
    currentPowerAutomateLicences: "No Power Automate premium flows required.",
    premiumConnectorAvailability: "notApplicable",
    customConnectorAvailability: "notApplicable",
    licensingBudgetConstraints: "Use approved model-driven licensing only.",
    outstandingLicensingDecisions: "None."
  });
  const model = pp.modelDriven!;
  Object.assign(model, {
    subtype: "requestManagement",
    dataverseAvailability: "confirmed",
    modelDrivenLicensingStatus: "confirmed",
    environmentAccessStatus: "confirmed",
    solutionPermissionStatus: "confirmed",
    tableCreationPermissionStatus: "confirmed",
    securityRoleConfigurationPermissionStatus: "confirmed",
    importPermissionStatus: "confirmed",
    deploymentPermissionStatus: "confirmed",
    existingSolution: "ReadyModel",
    managedStrategy: "Managed solution for test and production.",
    existingDataverseTables: "Account",
    newDataverseTables: "Request",
    standardTablesReused: "Account",
    activityTableRequirements: "No custom activity tables required.",
    virtualTableRequirements: "No virtual tables required.",
    dataMigration: "No initial migration required.",
    duplicateDetection: "No duplicate detection required for first release.",
    solutionArchitecture: "Single model-driven app for requests.",
    tables: "Requests",
    columns: "Name, Status",
    relationships: "Account to Request",
    choices: "Status: New, In Review, Closed",
    tableDefinitions: "Request / ct_request",
    columnDefinitions: "Name / ct_name",
    relationshipDefinitions: "Account lookup",
    forms: "Main form",
    views: "Active records",
    formDefinitions: "Request main form",
    viewDefinitions: "Active requests view",
    navigationDefinitions: "Service area > Requests",
    navigationStatus: "confirmed",
    securityRoles: "Request Manager",
    businessUnits: "Operations",
    teams: "Request Owners; Request Access",
    ownerTeams: "Request Owners",
    accessTeams: "Request Access",
    tablePrivileges: "Create/read/update",
    privilegeDepth: "Business unit",
    recordOwnership: "Team owned",
    sharingExpectations: "No manual sharing",
    fieldSecurityProfiles: "None required",
    sensitiveFields: "None.",
    applicationUsers: "No application users required.",
    servicePrincipals: "No service principals required.",
    businessRules: "Status required.",
    businessProcessFlows: "No BPF required.",
    automations: "No automation required.",
    validationRules: "Status must be selected before save.",
    duplicatePrevention: "No duplicate prevention required.",
    formsAndViewsStatus: "confirmed",
    securityArchitectureStatus: "confirmed",
    businessLogicStatus: "confirmed",
    extensionsStatus: "confirmed",
    schemaStatus: "confirmed",
    logicalNameStatus: "confirmed",
    dataverseSchemaConfirmationStatus: "confirmed",
    solutionArchitectureConfirmationStatus: "confirmed",
    sourceAvailabilityStatus: "notApplicable",
    sourceNotes: "Specification-only package; no model-driven source files are required for the approved phases.",
    almReadinessStatus: "confirmed"
  });
  model.dataverseTableSchemas = [
    createDefaultDataverseTable({ id: "account", displayName: "Account", pluralDisplayName: "Accounts", logicalName: "account", schemaName: "Account", ownershipType: "User/team", primaryNameColumn: "name", purpose: "Reused standard account table", expectedRecordCount: "Existing records", auditStatus: "Existing platform audit settings", searchRequirement: "Existing account search", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultDataverseTable({ id: "request", displayName: "Request", pluralDisplayName: "Requests", logicalName: "ct_request", schemaName: "ct_Request", ownershipType: "User/team", primaryNameColumn: "ct_name", purpose: "Track requests", expectedRecordCount: "5000", auditStatus: "Enabled for status changes", searchRequirement: "Search by name and status", confirmationStatus: "confirmed", confirmationSource: "Architect" })
  ];
  model.dataverseColumnSchemas = [createDefaultDataverseColumn({ tableId: "request", displayName: "Name", logicalName: "ct_name", schemaName: "ct_Name", dataType: "Text", requiredLevel: "Business required", choiceDefinition: "Not applicable", lookupTarget: "Not applicable", confirmationStatus: "confirmed", confirmationSource: "Architect" }), createDefaultDataverseColumn({ tableId: "request", displayName: "Status", logicalName: "ct_status", schemaName: "ct_Status", dataType: "Choice", requiredLevel: "Business required", choiceDefinition: "New; In Review; Closed", lookupTarget: "Not applicable", confirmationStatus: "confirmed", confirmationSource: "Architect" })];
  model.dataverseRelationshipSchemas = [{ id: "account-request", relationshipType: "Many-to-one", parentTableId: "account", childTableId: "request", parentTable: "Account", childTable: "Request", relationshipSchemaName: "ct_account_Request", requiredStatus: "Optional", referentialBehavior: "Referential", cascadeBehavior: "No cascade delete", navigationBehavior: "ct_Account", confirmationStatus: "confirmed", confirmationSource: "Architect" }];
  const required = (details: string) => ({ status: "required" as const, details, notApplicableReason: "", confirmationStatus: "confirmed" as const });
  const notApplicable = (reason: string) => ({ status: "notApplicable" as const, details: "", notApplicableReason: reason, confirmationStatus: "confirmed" as const });
  model.chartsDecision = notApplicable("No charts required.");
  model.dashboardsDecision = notApplicable("No dashboards required.");
  model.appPagesDecision = notApplicable("No app pages required.");
  model.customPagesDecision = notApplicable("No custom pages required.");
  model.businessRulesDecision = required("Status is required.");
  model.businessProcessFlowsDecision = notApplicable("No BPF required.");
  model.automationsDecision = notApplicable("No automation required.");
  model.validationRulesDecision = required("Status validation.");
  model.duplicatePreventionDecision = notApplicable("No duplicate prevention required.");
  model.teamModelDecision = required("Owner team and access team.");
  model.hierarchySecurityDecision = notApplicable("No hierarchy security.");
  model.fieldSecurityDecision = notApplicable("No field security.");
  model.applicationUsersDecision = notApplicable("No application users.");
  model.servicePrincipalsDecision = notApplicable("No service principals.");
  model.commandBarRulesDecision = notApplicable("No command bar changes.");
  model.clientSideJavaScriptDecision = notApplicable("No JavaScript.");
  model.webResourcesDecision = notApplicable("No web resources.");
  model.htmlWebResourcesDecision = notApplicable("No HTML web resources.");
  model.imageWebResourcesDecision = notApplicable("No image web resources.");
  model.pluginsDecision = notApplicable("No plug-ins.");
  model.customWorkflowActivitiesDecision = notApplicable("No custom workflow activities.");
  model.customApisDecision = notApplicable("No custom APIs.");
  model.pcfControlsDecision = notApplicable("No PCF controls.");
  model.azureIntegrationsDecision = notApplicable("No Azure integrations.");
  model.externalServicesDecision = notApplicable("No external services.");
  return markReady(project);
}

describe("power platform foundation", () => {
  it("creates connector-neutral canvas defaults", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });

    expect(isCanvasProject(project)).toBe(true);
    expect(project.powerPlatform?.canvas?.primaryDataSourceType).toBe("undecided");
    expect(project.powerPlatform?.common.connectors).toEqual([]);
    expect(usesDataverse(project)).toBe(false);
    expect(requiresDataverseLicensing(project)).toBe(false);
  });

  it("creates model-driven defaults without confirmed dataverse or licensing", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });

    expect(isModelDrivenProject(project)).toBe(true);
    expect(project.powerPlatform?.modelDriven?.dataverseAvailability).toBe("missingInformation");
    expect(project.powerPlatform?.modelDriven?.modelDrivenLicensingStatus).toBe("missingInformation");
    expect(requiresDataverseLicensing(project)).toBe(true);
    expect(requiresLogicalNames(project)).toBe(true);
  });

  it("keeps legacy microsoft project type loadable", () => {
    const project = createProject({ intake: { appType: "microsoft365" } });
    expect(isLegacyMicrosoftProject(project)).toBe(true);
  });

  it("retains core docs for non-power-platform projects", () => {
    const project = createProject({ intake: { appType: "webApplication" } });
    const docs = expectedDocumentLocations(project);
    expect(docs).toEqual(CORE_DOCUMENT_LOCATIONS);
  });

  it("selects sharepoint documents for sharepoint-only canvas projects", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.secondaryConnectorIds = [];

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);

    expect(usesSharePoint(project)).toBe(true);
    expect(requiresInternalColumnNames(project)).toBe(true);
    expect(fileNames).toContain("SHAREPOINT_SCHEMA.md");
    expect(fileNames).toContain("INTERNAL_COLUMN_NAMES.md");
    expect(fileNames).not.toContain("DATAVERSE_SCHEMA.md");
    expect(fileNames).not.toContain("LOGICAL_NAMES.md");
  });

  it("selects dataverse documents for dataverse-only canvas projects", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);

    expect(usesDataverse(project)).toBe(true);
    expect(fileNames).toContain("DATAVERSE_SCHEMA.md");
    expect(fileNames).toContain("LOGICAL_NAMES.md");
    expect(fileNames).not.toContain("SHAREPOINT_SCHEMA.md");
    expect(fileNames).not.toContain("INTERNAL_COLUMN_NAMES.md");
  });

  it("selects both backend document groups for mixed canvas projects", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.common.connectors = [{
      id: "dv",
      displayName: "Dataverse",
      purpose: "data",
      dataSourceName: "Dataverse",
      dataSourceType: "dataverse",
      connectorClassification: "unknown",
      classificationConfirmed: false,
      licenceRequirement: "",
      licensingConfirmed: false,
      authenticationMethod: "",
      gatewayRequirement: "",
      environmentRequirement: "",
      dlpImpact: "",
      delegationSupport: "",
      expectedRecordVolume: "",
      supportedOperations: {},
      offlineSupport: "",
      securityNotes: "",
      limitations: "",
      approvalStatus: ""
    }];
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "dataverse"];
    project.powerPlatform!.canvas!.primaryConnectorId = "sp";
    project.powerPlatform!.canvas!.secondaryConnectorIds = ["dv"];
    project.powerPlatform!.common.connectors.unshift(createDefaultConnector({
      id: "sp",
      displayName: "SharePoint",
      dataSourceType: "sharePointList",
      canvasRole: "primary"
    }));

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);

    expect(usesMultipleDataSources(project)).toBe(true);
    expect(fileNames).toContain("SHAREPOINT_SCHEMA.md");
    expect(fileNames).toContain("INTERNAL_COLUMN_NAMES.md");
    expect(fileNames).toContain("DATAVERSE_SCHEMA.md");
    expect(fileNames).toContain("LOGICAL_NAMES.md");
  });

  it("selects connector schema for other-connector canvas projects", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "otherConnector";

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);
    expect(usesOtherConnector(project)).toBe(true);
    expect(fileNames).toContain("CONNECTOR_SCHEMA.md");
  });

  it("selects model-driven dataverse and model-driven document groups", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);

    expect(fileNames).toEqual(expect.arrayContaining([
      "DATAVERSE_SCHEMA.md",
      "LOGICAL_NAMES.md",
      "SOLUTION_ARCHITECTURE.md",
      "SECURITY_ROLES.md"
    ]));
  });

  it("keeps canvas readiness blocked until the backend and schema are explicit", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });

    expect(calculateConnectorSelectionGate(project)).toBe("missingInformation");
    expect(calculatePowerPlatformReadiness(project).isReadyForCodex).toBe(false);

    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.sourcePurpose = "Track requests";
    project.powerPlatform!.canvas!.sourceOwnership = "Operations";
    project.powerPlatform!.canvas!.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
    project.powerPlatform!.canvas!.sharePointListDefinitions = "Requests list";
    project.powerPlatform!.canvas!.sharePointColumnDefinitions = "Title / Title / Single line text";
    project.powerPlatform!.canvas!.expectedRecordCounts = "500 active records";
    project.powerPlatform!.canvas!.schemaStatus = "confirmed";
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({
        id: "sp",
        displayName: "SharePoint",
        purpose: "Primary backend",
        dataSourceName: "Requests",
        dataSourceType: "sharePointList",
        canvasRole: "primary",
        connectorClassification: "standard",
        classificationConfirmationStatus: "confirmed",
        licenceRequirement: "Included",
        licensingConfirmationStatus: "confirmed"
      })
    ];

    expect(calculateConnectorSelectionGate(project)).toBe("confirmed");
    expect(calculateSharePointSchemaGate(project)).toBe("reviewNeeded");
    expect(calculateInternalNameGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.canvas!.internalNameStatus = "confirmed";
    expect(calculateInternalNameGate(project)).toBe("confirmed");
    expect(calculateSharePointSchemaGate(project)).toBe("confirmed");
  });

  it("requires explicit connector classification and licensing for custom Canvas connectors", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "customConnector";
    project.powerPlatform!.canvas!.sourcePurpose = "Read external tickets";
    project.powerPlatform!.canvas!.sourceOwnership = "IT";
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({ id: "tickets", displayName: "Tickets API", dataSourceType: "customConnector", canvasRole: "primary", connectorClassification: "unknown" })
    ];

    expect(calculateConnectorClassificationGate(project)).toBe("missingInformation");
    expect(calculateLicensingGate(project)).toBe("missingInformation");

    project.powerPlatform!.common.connectors[0].connectorClassification = "custom";
    project.powerPlatform!.common.connectors[0].classificationConfirmationStatus = "confirmed";
    project.powerPlatform!.common.connectors[0].licenceRequirement = "Premium connector licence confirmed";
    project.powerPlatform!.common.connectors[0].licensingConfirmationStatus = "confirmed";
    project.powerPlatform!.canvas!.otherDataSources = "Tickets API";
    project.powerPlatform!.canvas!.otherConnectorSchemaDefinitions = "GET /tickets";
    project.powerPlatform!.canvas!.otherConnectorFieldDefinitions = "id, title, status";
    project.powerPlatform!.canvas!.otherConnectorConfirmationSource = "API documentation";
    project.powerPlatform!.canvas!.schemaStatus = "confirmed";

    expect(calculateConnectorClassificationGate(project)).toBe("confirmed");
    expect(calculateLicensingGate(project)).toBe("confirmed");
    expect(calculateOtherConnectorSchemaGate(project)).toBe("confirmed");
  });

  it("requires Dataverse logical names for Canvas and model-driven projects", () => {
    const canvasProject = createProject({ intake: { appType: "powerAppsCanvas" } });
    canvasProject.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    canvasProject.powerPlatform!.canvas!.dataverseEnvironment = "Production";
    canvasProject.powerPlatform!.canvas!.dataverseSolution = "ServiceApp";
    canvasProject.powerPlatform!.canvas!.dataversePublisherPrefix = "svc";
    canvasProject.powerPlatform!.canvas!.dataverseTableDefinitions = "Request / svc_request";
    canvasProject.powerPlatform!.canvas!.dataverseColumnDefinitions = "Name / svc_name";
    canvasProject.powerPlatform!.canvas!.dataverseSchemaConfirmationStatus = "confirmed";

    expect(calculateLogicalNameGate(canvasProject)).toBe("reviewNeeded");
    canvasProject.powerPlatform!.canvas!.logicalNameStatus = "confirmed";
    expect(calculateLogicalNameGate(canvasProject)).toBe("confirmed");
    expect(calculateCanvasDataverseSchemaGate(canvasProject)).toBe("confirmed");

    const modelProject = createProject({ intake: { appType: "powerAppsModelDriven" } });
    modelProject.powerPlatform!.common.dataverseAvailability = "confirmed";
    modelProject.powerPlatform!.common.licensingConfirmationStatus = "confirmed";
    modelProject.powerPlatform!.common.environmentAccessStatus = "confirmed";
    modelProject.powerPlatform!.common.solutionName = "ServiceApp";
    modelProject.powerPlatform!.common.publisherName = "Contoso";
    modelProject.powerPlatform!.common.publisherPrefix = "svc";
    modelProject.powerPlatform!.modelDriven!.solutionPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.tableCreationPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.securityRoleConfigurationPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.importPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.deploymentPermissionStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.modelDrivenLicensingStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.tableDefinitions = "Request / svc_request";
    modelProject.powerPlatform!.modelDriven!.columnDefinitions = "Name / svc_name";
    modelProject.powerPlatform!.modelDriven!.relationshipDefinitions = "Account lookup";
    modelProject.powerPlatform!.modelDriven!.securityRoles = "Service Manager";
    modelProject.powerPlatform!.modelDriven!.schemaStatus = "confirmed";
    modelProject.powerPlatform!.modelDriven!.logicalNameStatus = "confirmed";

    expect(calculateModelDrivenEligibilityGate(modelProject)).toBe("confirmed");
    expect(calculateModelDrivenDataverseSchemaGate(modelProject)).toBe("confirmed");
    expect(calculateLogicalNameGate(modelProject)).toBe("confirmed");
  });

  it("never returns duplicate expected document paths", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    const docs = expectedDocumentLocations(project);
    const keys = docs.map((doc) => `${doc.folder}/${doc.fileName}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.some((path) => path.includes("-"))).toBe(false);
  });

  it("uses exact controlled status values so negative wording never confirms connector gates", () => {
    const negativeStatuses = ["Not confirmed", "Not approved", "Not available", "No", "Pending", "Needs review"];

    for (const status of negativeStatuses) {
      const project = createProject({ intake: { appType: "powerAppsCanvas" } });
      project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
      project.powerPlatform!.canvas!.sourcePurpose = "Track requests";
      project.powerPlatform!.canvas!.sourceOwnership = "Operations";
      project.powerPlatform!.common.connectors = [
        createDefaultConnector({
          id: "sp",
          dataSourceType: "sharePointList",
          canvasRole: "primary",
          connectorClassification: "standard",
          classificationConfirmationStatus: status,
          licenceRequirement: "Included",
          licensingConfirmationStatus: status
        })
      ];

      expect(calculateConnectorClassificationGate(project)).not.toBe("confirmed");
      expect(calculateLicensingGate(project)).not.toBe("confirmed");
    }

    const confirmed = createProject({ intake: { appType: "powerAppsCanvas" } });
    confirmed.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    confirmed.powerPlatform!.canvas!.sourcePurpose = "Track requests";
    confirmed.powerPlatform!.canvas!.sourceOwnership = "Operations";
    confirmed.powerPlatform!.common.connectors = [
      createDefaultConnector({
        id: "sp",
        dataSourceType: "sharePointList",
        canvasRole: "primary",
        connectorClassification: "standard",
        classificationConfirmationStatus: "confirmed",
        licenceRequirement: "Included",
        licensingConfirmationStatus: "confirmed"
      })
    ];

    expect(calculateConnectorClassificationGate(confirmed)).toBe("confirmed");
    expect(calculateLicensingGate(confirmed)).toBe("confirmed");
  });

  it("keeps Canvas packages Draft until structured implementation targets are confirmed", () => {
    const draftProject = createReadyCanvasProject();
    draftProject.powerPlatform!.canvas!.screenTargets = [];
    draftProject.powerPlatform!.canvas!.controlTargets = [];
    draftProject.powerPlatform!.canvas!.componentTargets = [];

    const draftPackage = generateProjectPackage(draftProject);
    const draftReadiness = evaluateGeneratedPackageReadiness(draftProject, draftPackage.documents);
    const draftPrompts = draftPackage.documents.find((document) => document.fileName === "PHASED_CODEX_PROMPTS.md")!.content;

    expect(draftReadiness.status).toBe("Draft");
    expect(draftReadiness.prohibitedContentCount).toBeGreaterThan(0);
    expect(draftPrompts).toContain("Target-file generation blocked:");
    expect(evaluatePhaseGate(draftProject, "formulaTargets").status).not.toBe("confirmed");
    expect(evaluatePhaseGate(draftProject, "yamlTargets").status).not.toBe("confirmed");

    const readyProject = createReadyCanvasProject();
    const readyPackage = generateProjectPackage(readyProject);
    const readyReadiness = evaluateGeneratedPackageReadiness(readyProject, readyPackage.documents);
    const readyPrompts = readyPackage.documents.find((document) => document.fileName === "PHASED_CODEX_PROMPTS.md")!.content;

    expect(readyReadiness.status).toBe("Ready for Codex");
    expect(readyPrompts).not.toContain("Target-file generation blocked");
    expect(readyPrompts).toContain("screen-request-form");
    expect(readyPrompts).toContain("control-create-request");
    expect(readyPrompts).toContain("07_Development/PowerFx/screen-request-form/control-create-request/OnSelect.fx");
    expect(readyPrompts).toContain("04_UI_UX/YAML/screen-home.screen.pa.yaml");
    expect(evaluatePhaseGate(readyProject, "screenTargets").status).toBe("confirmed");
    expect(evaluatePhaseGate(readyProject, "controlTargets").status).toBe("confirmed");
    expect(evaluatePhaseGate(readyProject, "componentTargets").status).toBe("notApplicable");
    expect(evaluatePhaseGate(readyProject, "formulaTargets").status).toBe("confirmed");
    expect(evaluatePhaseGate(readyProject, "yamlTargets").status).toBe("confirmed");
  });

  it("rejects placeholder wording and proxy data for Phase 4 Canvas gates", () => {
    const project = createReadyCanvasProject();
    const connector = project.powerPlatform!.common.connectors[0];

    connector.gatewayRequirement = "Unknown";
    expect(isPhaseGatePassing(evaluatePhaseGate(project, "gateway"))).toBe(false);
    connector.gatewayRequirement = "No gateway";

    connector.dlpImpact = "Pending";
    expect(isPhaseGatePassing(evaluatePhaseGate(project, "dlp"))).toBe(false);
    connector.dlpImpact = "Business connector group";

    connector.authenticationMethod = "Not decided";
    expect(isPhaseGatePassing(evaluatePhaseGate(project, "authentication"))).toBe(false);
    connector.authenticationMethod = "Microsoft Entra ID";

    connector.securityNotes = "Production permissions approved";
    connector.requiredConnectorPermissions = "";
    connector.permissionOwner = "";
    connector.permissionValidationMethod = "";
    connector.permissionConfirmationStatus = "missingInformation";
    expect(isPhaseGatePassing(evaluatePhaseGate(project, "connectorPermissions"))).toBe(false);
    connector.requiredConnectorPermissions = "SharePoint read, create, update, and library file permissions.";
    connector.permissionOwner = "Operations Owner";
    connector.permissionValidationMethod = "Role test in development environment.";
    connector.permissionConfirmationStatus = "confirmed";

    project.powerPlatform!.canvas!.componentApplicabilityDecision = {
      status: "notApplicable",
      details: "",
      notApplicableReason: "No decision yet",
      confirmationStatus: "confirmed"
    };
    expect(evaluatePhaseGate(project, "componentRequirements").status).toBe("missingInformation");
    project.powerPlatform!.canvas!.componentApplicabilityDecision = {
      status: "notApplicable",
      details: "",
      notApplicableReason: "No reusable Canvas components are required for the first release.",
      confirmationStatus: "confirmed"
    };

    project.powerPlatform!.canvas!.screenNamingConvention = "";
    project.powerPlatform!.canvas!.controlNamingConvention = "";
    project.powerPlatform!.canvas!.screens = "Home\nRequest form";
    project.powerPlatform!.canvas!.controls = "Button\nGallery";
    expect(isPhaseGatePassing(evaluatePhaseGate(project, "namingStandards"))).toBe(false);
    project.powerPlatform!.canvas!.screenNamingConvention = "Screens use scr + PascalCase.";
    project.powerPlatform!.canvas!.controlNamingConvention = "Controls use prefix + PascalCase.";

    const genericProject = createProject({
      intake: {
        appType: "powerAppsCanvas",
        requiredFeatures: "Create request",
        screens: "Home",
        workflows: "Submit request",
        acceptanceNotes: "Request can be submitted."
      }
    });
    genericProject.powerPlatform!.canvas!.createBehavior = "Create request";
    genericProject.powerPlatform!.canvas!.readBehavior = "Read request";
    genericProject.powerPlatform!.canvas!.updateBehavior = "Update request";
    genericProject.powerPlatform!.canvas!.archiveBehavior = "Archive request";
    genericProject.powerPlatform!.canvas!.restoreBehavior = "Restore request";
    genericProject.powerPlatform!.canvas!.searchRequirements = "Search request";
    genericProject.powerPlatform!.canvas!.filteringRequirements = "Filter requests";
    genericProject.powerPlatform!.canvas!.sortingRequirements = "Sort requests";
    expect(isPhaseGatePassing(evaluatePhaseGate(genericProject, "implementationSpecifications"))).toBe(false);

    project.powerPlatform!.common.releaseApprover = "Business Owner";
    project.powerPlatform!.common.releaseApprovalResponsibility = "Business owner signs off.";
    project.powerPlatform!.common.releaseApprovalStatus = "reviewNeeded";
    expect(isPhaseGatePassing(evaluatePhaseGate(project, "releaseApproval"))).toBe(false);
    project.powerPlatform!.common.releaseApprovalStatus = "confirmed";

    project.powerPlatform!.common.deploymentOwner = "Technical Owner";
    project.powerPlatform!.common.deploymentResponsibility = "Technical owner publishes.";
    project.powerPlatform!.common.deploymentResponsibilityStatus = "reviewNeeded";
    expect(isPhaseGatePassing(evaluatePhaseGate(project, "deploymentResponsibility"))).toBe(false);
  });

  it("controls formula applicability without fake formula properties", () => {
    const project = createReadyCanvasProject();
    const label = createDefaultCanvasControlTarget({
      id: "control-static-label",
      screenId: "screen-home",
      approvedControlName: "lblWelcome",
      controlType: "Label",
      purpose: "Show static welcome text.",
      formulaOutputDecision: {
        status: "notApplicable",
        details: "",
        notApplicableReason: "Static label has no formula output target.",
        confirmationStatus: "confirmed"
      },
      yamlOutputDecision: {
        status: "notApplicable",
        details: "",
        notApplicableReason: "Static label YAML is not generated in this phase.",
        confirmationStatus: "confirmed"
      },
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    });
    project.powerPlatform!.canvas!.controlTargets.push(label);

    let validation = validateCanvasTargets(project);
    expect(validation.controlStatus).toBe("confirmed");
    expect(validation.formulaTargets.some((target) => target.id === "control-static-label")).toBe(false);
    expect(generatedDocument(project, "PHASED_CODEX_PROMPTS.md")).not.toContain("control-static-label/Not-applicable.fx");

    const required = project.powerPlatform!.canvas!.controlTargets.find((target) => target.id === "control-create-request")!;
    required.formulaOutputDecision = {
      status: "required",
      details: "Formula output required.",
      notApplicableReason: "",
      confirmationStatus: "confirmed"
    };
    required.formulaProperties = "";
    validation = validateCanvasTargets(project);
    expect(validation.formulaStatus).toBe("missingInformation");

    required.formulaProperties = "Not applicable";
    validation = validateCanvasTargets(project);
    expect(validation.formulaStatus).toBe("missingInformation");

    required.formulaProperties = "OnSelect";
    validation = validateCanvasTargets(project);
    expect(validation.formulaStatus).toBe("confirmed");
  });

  it("controls YAML applicability and suppresses not-applicable YAML paths", () => {
    const project = createReadyCanvasProject();
    const screen = project.powerPlatform!.canvas!.screenTargets[0];
    screen.yamlOutputDecision = {
      status: "undecided",
      details: "",
      notApplicableReason: "",
      confirmationStatus: "missingInformation"
    };
    expect(validateCanvasTargets(project).yamlStatus).toBe("missingInformation");

    screen.yamlOutputDecision = {
      status: "required",
      details: "Screen YAML required.",
      notApplicableReason: "",
      confirmationStatus: "confirmed"
    };
    screen.yamlParentType = "screen";
    expect(validateCanvasTargets(project).yamlStatus).toBe("blocked");

    screen.yamlParentType = "app";
    screen.yamlOutputType = "Not applicable";
    expect(validateCanvasTargets(project).yamlStatus).toBe("missingInformation");

    screen.yamlOutputType = "screen";
    screen.yamlOutputDecision = {
      status: "notApplicable",
      details: "",
      notApplicableReason: "Home screen YAML target is not generated for this test.",
      confirmationStatus: "confirmed"
    };
    const prompts = generatedDocument(project, "PHASED_CODEX_PROMPTS.md");
    expect(prompts).not.toContain("screen-home.screen.pa.yaml");
    expect(prompts).not.toContain("Not-applicable.pa.yaml");
  });

  it("blocks invalid Canvas target references and parent cycles before Ready", () => {
    const project = createReadyCanvasProject();
    const control = project.powerPlatform!.canvas!.controlTargets.find((target) => target.id === "control-create-request")!;

    control.connectorId = "unknown-connector";
    expect(validateCanvasTargets(project).formulaStatus).toBe("blocked");
    control.connectorId = "sp";

    control.entityId = "unknown-entity";
    expect(validateCanvasTargets(project).formulaStatus).toBe("missingInformation");
    control.entityId = "requests";

    control.requiredFieldIds = ["document-title"];
    expect(validateCanvasTargets(project).formulaStatus).toBe("missingInformation");
    control.requiredFieldIds = ["title", "status"];

    const resourceProject = createReadyCanvasProject();
    resourceProject.powerPlatform!.canvas!.connectorResourceSchemas = [
      createDefaultConnectorResource({
        id: "external-resource",
        connectorId: "other",
        resourceName: "External Resource",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];
    const resourceControl = resourceProject.powerPlatform!.canvas!.controlTargets[0];
    resourceControl.connectorId = "sp";
    resourceControl.entityId = "external-resource";
    expect(validateCanvasTargets(resourceProject).formulaStatus).not.toBe("confirmed");

    const parentProject = createReadyCanvasProject();
    const child = parentProject.powerPlatform!.canvas!.controlTargets.find((target) => target.id === "control-create-request")!;
    child.parentControlId = "missing-parent";
    expect(validateCanvasTargets(parentProject).controlStatus).toBe("missingInformation");

    child.parentControlId = "control-load-requests";
    expect(validateCanvasTargets(parentProject).controlStatus).toBe("blocked");

    const cycleProject = createReadyCanvasProject();
    const archive = cycleProject.powerPlatform!.canvas!.controlTargets.find((target) => target.id === "control-archive-request")!;
    const restore = cycleProject.powerPlatform!.canvas!.controlTargets.find((target) => target.id === "control-restore-request")!;
    archive.parentControlId = "control-restore-request";
    restore.parentControlId = "control-archive-request";
    expect(validateCanvasTargets(cycleProject).controlStatus).toBe("blocked");
  });

  it("keeps packages Draft for invalid references and Ready after correction", () => {
    const project = createReadyCanvasProject();
    const control = project.powerPlatform!.canvas!.controlTargets.find((target) => target.id === "control-create-request")!;
    control.entityId = "unknown-entity";

    let generated = generateProjectPackage(project);
    expect(evaluateGeneratedPackageReadiness(project, generated.documents).status).toBe("Draft");

    control.entityId = "requests";
    generated = generateProjectPackage(project);
    const readiness = evaluateGeneratedPackageReadiness(project, generated.documents);
    const prompts = generated.documents.find((document) => document.fileName === "PHASED_CODEX_PROMPTS.md")!.content;
    expect(readiness.status).toBe("Ready for Codex");
    expect(prompts).toContain("07_Development/PowerFx/screen-request-form/control-create-request/OnSelect.fx");
    expect(prompts).toContain("04_UI_UX/YAML/screen-request-form/control-create-request.control.pa.yaml");
    expect(prompts).not.toContain("Not-applicable.fx");
    expect(prompts).not.toContain("Not-applicable.pa.yaml");
  });

  it("uses exact mixed Canvas source selections for helpers, gates, and documents", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "dataverse"];
    project.powerPlatform!.canvas!.sourcePurpose = "Track service requests";
    project.powerPlatform!.canvas!.sourceOwnership = "Operations";
    project.powerPlatform!.common.dataverseAvailability = "confirmed";
    project.powerPlatform!.common.licensingConfirmationStatus = "confirmed";
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({
        id: "sp",
        dataSourceType: "sharePointList",
        canvasRole: "primary",
        connectorClassification: "standard",
        classificationConfirmationStatus: "confirmed",
        licenceRequirement: "Included",
        licensingConfirmationStatus: "confirmed"
      }),
      createDefaultConnector({
        id: "dv",
        dataSourceType: "dataverse",
        canvasRole: "secondary",
        connectorClassification: "premium",
        classificationConfirmationStatus: "confirmed",
        licenceRequirement: "Per-app licence",
        licensingConfirmationStatus: "confirmed"
      })
    ];

    expect(getSelectedCanvasDataSourceTypes(project)).toEqual(["sharePointList", "dataverse"]);
    expect(usesMultipleDataSources(project)).toBe(true);
    expect(usesSharePoint(project)).toBe(true);
    expect(usesDataverse(project)).toBe(true);
    expect(usesOtherConnector(project)).toBe(false);
    expect(calculateConnectorSelectionGate(project)).toBe("confirmed");
    expect(calculateConnectorClassificationGate(project)).toBe("confirmed");
    expect(calculateLicensingGate(project)).toBe("confirmed");

    const fileNames = expectedPowerPlatformDocuments(project).map((doc) => doc.fileName);
    expect(fileNames).toEqual(expect.arrayContaining(["SHAREPOINT_SCHEMA.md", "DATAVERSE_SCHEMA.md"]));
    expect(fileNames).not.toContain("CONNECTOR_SCHEMA.md");
  });

  it("blocks selected Canvas backends with no connector assessment and does not infer connector classification", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.sourcePurpose = "Track requests";
    project.powerPlatform!.canvas!.sourceOwnership = "Operations";

    expect(calculateConnectorSelectionGate(project)).toBe("missingInformation");
    expect(calculateConnectorClassificationGate(project)).toBe("missingInformation");
    expect(calculateLicensingGate(project)).toBe("missingInformation");

    project.powerPlatform!.common.connectors = [
      createDefaultConnector({
        dataSourceType: "sharePointList",
        licenceRequirement: "Included",
        licensingConfirmationStatus: "confirmed"
      })
    ];

    expect(calculateConnectorClassificationGate(project)).toBe("missingInformation");
    expect(project.powerPlatform!.common.connectors[0].connectorClassification).toBe("unknown");
  });

  it("inspects every structured SharePoint column and never derives internal names", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
    project.powerPlatform!.canvas!.sharePointListSchemas = [
      createDefaultSharePointList({ id: "requests", displayName: "Requests", purpose: "Track requests", expectedRecordCount: "500", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.sharePointLibrarySchemas = [
      createDefaultSharePointLibrary({ id: "docs", displayName: "Documents", purpose: "Store uploads", fileTypes: "PDF", metadataColumnIds: ["Title"], confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.sharePointColumnSchemas = [
      createDefaultSharePointColumn({ id: "good", parentType: "list", parentId: "requests", displayName: "Title", internalName: "Title", columnType: "Text", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
      createDefaultSharePointColumn({ id: "library-meta", parentType: "library", parentId: "docs", displayName: "File Status", internalName: "FileStatus", columnType: "Choice", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
      createDefaultSharePointColumn({ id: "missing", parentType: "list", parentId: "requests", displayName: "Customer Name", internalName: "", columnType: "Text", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];

    expect(calculateInternalNameGate(project)).toBe("missingInformation");
    expect(project.powerPlatform!.canvas!.sharePointColumnSchemas[2].internalName).toBe("");

    project.powerPlatform!.canvas!.sharePointColumnSchemas[2].internalName = "CustomerName";
    project.powerPlatform!.canvas!.sharePointColumnSchemas[2].confirmationStatus = "reviewNeeded";
    expect(calculateInternalNameGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.canvas!.sharePointColumnSchemas = project.powerPlatform!.canvas!.sharePointColumnSchemas.filter((column) => column.id !== "missing");
    expect(calculateInternalNameGate(project)).toBe("confirmed");
    expect(calculateSharePointSchemaGate(project)).toBe("confirmed");
  });

  it("inspects structured Dataverse table, column, and relationship logical names without deriving them", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    project.powerPlatform!.canvas!.dataverseEnvironment = "Production";
    project.powerPlatform!.canvas!.dataverseSolution = "ServiceApp";
    project.powerPlatform!.canvas!.dataversePublisherPrefix = "svc";
    project.powerPlatform!.canvas!.dataverseSchemaConfirmationStatus = "confirmed";
    project.powerPlatform!.canvas!.dataverseTableSchemas = [
      createDefaultDataverseTable({ id: "request", displayName: "Request", logicalName: "svc_request", schemaName: "svc_Request", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.dataverseColumnSchemas = [
      createDefaultDataverseColumn({ tableId: "request", displayName: "Name", logicalName: "", schemaName: "svc_Name", dataType: "Text", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.dataverseRelationshipSchemas = [
      createDefaultDataverseRelationship({ relationshipType: "Lookup", parentTableId: "request", childTableId: "request", parentTable: "Account", childTable: "Request", relationshipSchemaName: "", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];

    expect(calculateLogicalNameGate(project)).toBe("missingInformation");
    expect(project.powerPlatform!.canvas!.dataverseColumnSchemas[0].logicalName).toBe("");

    project.powerPlatform!.canvas!.dataverseColumnSchemas[0].logicalName = "svc_name";
    project.powerPlatform!.canvas!.dataverseTableSchemas.push(createDefaultDataverseTable({ id: "account", displayName: "Account", logicalName: "account", schemaName: "Account", confirmationStatus: "confirmed", confirmationSource: "Architect" }));
    project.powerPlatform!.canvas!.dataverseRelationshipSchemas[0].parentTableId = "account";
    project.powerPlatform!.canvas!.dataverseRelationshipSchemas[0].relationshipSchemaName = "svc_account_request";
    project.powerPlatform!.canvas!.dataverseRelationshipSchemas[0].confirmationStatus = "reviewNeeded";
    expect(calculateLogicalNameGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.canvas!.dataverseRelationshipSchemas[0].confirmationStatus = "confirmed";
    expect(calculateLogicalNameGate(project)).toBe("confirmed");
    expect(calculateCanvasDataverseSchemaGate(project)).toBe("confirmed");
  });

  it("inspects structured other-connector resources and fields", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.primaryDataSourceType = "externalApi";
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({ id: "api", displayName: "Tickets API", dataSourceType: "externalApi", canvasRole: "primary" })
    ];
    project.powerPlatform!.canvas!.connectorResourceSchemas = [
      createDefaultConnectorResource({ id: "tickets-resource", connectorId: "api", resourceName: "Tickets", keyOrIdentifier: "", authenticationRequirement: "API key", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];
    project.powerPlatform!.canvas!.connectorFieldSchemas = [
      createDefaultConnectorField({ connectorId: "api", resourceId: "tickets-resource", displayName: "Ticket ID", fieldIdentifier: "", fieldType: "Text", confirmationStatus: "confirmed", confirmationSource: "Architect" })
    ];

    expect(calculateOtherConnectorSchemaGate(project)).toBe("missingInformation");

    project.powerPlatform!.canvas!.connectorResourceSchemas[0].keyOrIdentifier = "id";
    project.powerPlatform!.canvas!.connectorFieldSchemas[0].fieldIdentifier = "ticketId";
    project.powerPlatform!.canvas!.connectorFieldSchemas[0].confirmationStatus = "reviewNeeded";
    expect(calculateOtherConnectorSchemaGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.canvas!.connectorFieldSchemas[0].confirmationStatus = "confirmed";
    project.powerPlatform!.canvas!.otherConnectorSchemaConfirmationStatus = "confirmed";
    expect(calculateOtherConnectorSchemaGate(project)).toBe("confirmed");
  });

  it("repairs connector roles deterministically and requires exactly one primary", () => {
    const connectors = [
      createDefaultConnector({ id: "old-primary", dataSourceType: "sharePointList", canvasRole: "primary" }),
      createDefaultConnector({ id: "new-primary", dataSourceType: "dataverse", canvasRole: "primary" }),
      createDefaultConnector({ id: "secondary", dataSourceType: "dataverse", canvasRole: "secondary" })
    ];

    const ambiguous = reconcileCanvasConnectorRoles(connectors, "", ["secondary"]);
    expect(ambiguous.primaryConnectorId).toBe("");
    expect(ambiguous.connectors.filter((connector) => connector.canvasRole === "primary")).toHaveLength(0);

    const explicit = reconcileCanvasConnectorRoles(connectors, "new-primary", ["new-primary", "secondary"]);
    expect(explicit.primaryConnectorId).toBe("new-primary");
    expect(explicit.secondaryConnectorIds).toEqual(["secondary"]);
    expect(explicit.connectors.find((connector) => connector.id === "new-primary")?.canvasRole).toBe("primary");
    expect(explicit.connectors.find((connector) => connector.id === "old-primary")?.canvasRole).toBe("");
  });

  it("requires Canvas Power Fx, YAML, delegation, and ALM planning before readiness", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    project.powerPlatform!.canvas!.appFormulasRequirements = "Use formulas for reusable calculations";
    project.powerPlatform!.canvas!.startScreenRequirements = "Route by role";
    project.powerPlatform!.canvas!.onStartRequirements = "Load reference data";
    project.powerPlatform!.canvas!.namedFormulaRequirements = "Named formulas required";
    project.powerPlatform!.canvas!.createBehavior = "Create requests";
    project.powerPlatform!.canvas!.readBehavior = "Read requests";
    project.powerPlatform!.canvas!.updateBehavior = "Update requests";
    project.powerPlatform!.canvas!.validationRequirements = "Validate required fields";
    project.powerPlatform!.canvas!.errorHandlingRequirements = "Show errors";
    project.powerPlatform!.canvas!.searchRequirements = "Search by name";
    project.powerPlatform!.canvas!.filteringRequirements = "Filter by status";
    project.powerPlatform!.canvas!.sortingRequirements = "Sort by created date";
    expect(calculateCanvasPowerFxPlanningGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.canvas!.powerFxStatus = "confirmed";
    expect(calculateCanvasPowerFxPlanningGate(project)).toBe("confirmed");

    project.powerPlatform!.canvas!.fullScreenYamlRequired = "Full-screen YAML not required";
    project.powerPlatform!.canvas!.controlLevelYamlRequired = "Control YAML not required";
    project.powerPlatform!.canvas!.containerYamlRequired = "Container YAML not required";
    project.powerPlatform!.canvas!.componentYamlRequired = "Component YAML not required";
    project.powerPlatform!.canvas!.paYamlSourceRequired = ".pa.yaml unavailable";
    project.powerPlatform!.canvas!.expectedInstallationMethod = "Manual Studio build";
    project.powerPlatform!.canvas!.existingSourceAvailability = "No existing source";
    project.powerPlatform!.canvas!.validationResponsibility = "Developer";
    project.powerPlatform!.canvas!.yamlStatus = "confirmed";
    expect(calculateCanvasYamlPlanningGate(project)).toBe("confirmed");

    project.powerPlatform!.canvas!.expectedRecordCounts = "5000";
    project.powerPlatform!.canvas!.delegationRequirements = "Use delegable filters";
    project.powerPlatform!.canvas!.delegationStatus = "confirmed";
    project.powerPlatform!.common.connectors = [createDefaultConnector({ id: "sp", delegationSupport: "Delegable for indexed columns" })];
    expect(calculateCanvasDelegationPlanningGate(project)).toBe("confirmed");

    project.powerPlatform!.common.sourceControlApproach = "Repository notes";
    project.powerPlatform!.common.deploymentMethod = "Managed deployment";
    project.powerPlatform!.common.deploymentResponsibility = "Technical owner";
    project.powerPlatform!.common.deploymentStrategy = "Dev/test/prod";
    project.powerPlatform!.common.connectionReferences = "Connection references documented";
    project.powerPlatform!.common.environmentVariables = "Environment variables documented";
    project.powerPlatform!.common.pipelineRequirements = "Manual approval pipeline";
    project.powerPlatform!.common.rollbackExpectations = "Rollback to previous version";
    project.powerPlatform!.common.releaseApprovalResponsibility = "App owner";
    expect(calculateAlmGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.common.almConfirmationStatus = "confirmed";
    expect(calculateAlmGate(project)).toBe("confirmed");
  });

  it("requires model-driven applicability decisions for optional architecture groups", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    project.powerPlatform!.modelDriven!.formDefinitions = "Main form";
    project.powerPlatform!.modelDriven!.viewDefinitions = "Active records view";
    project.powerPlatform!.modelDriven!.formsAndViewsStatus = "confirmed";
    expect(calculateModelDrivenFormsAndViewsGate(project)).toBe("missingInformation");

    project.powerPlatform!.modelDriven!.chartsDecision = { status: "notApplicable", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.dashboardsDecision = { status: "notApplicable", details: "", notApplicableReason: "No dashboard", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.appPagesDecision = { status: "notApplicable", details: "", notApplicableReason: "No app page", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.customPagesDecision = { status: "required", details: "Custom intake page", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenFormsAndViewsGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.chartsDecision.notApplicableReason = "No charts";
    expect(calculateModelDrivenFormsAndViewsGate(project)).toBe("confirmed");

    project.powerPlatform!.modelDriven!.navigationDefinitions = "Area > group > table";
    expect(calculateModelDrivenNavigationGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.modelDriven!.navigationStatus = "confirmed";
    expect(calculateModelDrivenNavigationGate(project)).toBe("confirmed");

    project.powerPlatform!.modelDriven!.securityRoles = "Manager";
    project.powerPlatform!.modelDriven!.businessUnits = "Operations";
    project.powerPlatform!.modelDriven!.ownerTeams = "Owner team";
    project.powerPlatform!.modelDriven!.accessTeams = "Access team";
    project.powerPlatform!.modelDriven!.tablePrivileges = "Create/read/update";
    project.powerPlatform!.modelDriven!.privilegeDepth = "BU-level";
    project.powerPlatform!.modelDriven!.recordOwnership = "Team owned";
    project.powerPlatform!.modelDriven!.sharingExpectations = "No manual sharing";
    project.powerPlatform!.modelDriven!.fieldSecurityProfiles = "Sensitive fields protected";
    project.powerPlatform!.modelDriven!.securityArchitectureStatus = "confirmed";
    project.powerPlatform!.modelDriven!.teamModelDecision = { status: "required", details: "Owner and access teams", notApplicableReason: "", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.hierarchySecurityDecision = { status: "notApplicable", details: "", notApplicableReason: "No hierarchy security", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.fieldSecurityDecision = { status: "required", details: "Sensitive fields protected", notApplicableReason: "", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.applicationUsersDecision = { status: "notApplicable", details: "", notApplicableReason: "No app users", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.servicePrincipalsDecision = { status: "notApplicable", details: "", notApplicableReason: "No service principals", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("confirmed");

    project.powerPlatform!.modelDriven!.businessProcessFlowsDecision = { status: "notApplicable", details: "", notApplicableReason: "No BPF", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.automationsDecision = { status: "notApplicable", details: "", notApplicableReason: "No automation", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.businessRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No business rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.validationRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No validation rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.duplicatePreventionDecision = { status: "notApplicable", details: "", notApplicableReason: "No duplicate prevention", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.modelDriven!.businessLogicStatus = "confirmed";
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");

    project.powerPlatform!.modelDriven!.commandBarRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No command changes", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.clientSideJavaScriptDecision = { status: "notApplicable", details: "", notApplicableReason: "No JavaScript", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.webResourcesDecision = { status: "notApplicable", details: "", notApplicableReason: "No web resources", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.htmlWebResourcesDecision = { status: "notApplicable", details: "", notApplicableReason: "No HTML resources", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.imageWebResourcesDecision = { status: "notApplicable", details: "", notApplicableReason: "No image resources", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.pluginsDecision = { status: "notApplicable", details: "", notApplicableReason: "No plug-ins", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.customWorkflowActivitiesDecision = { status: "notApplicable", details: "", notApplicableReason: "No custom workflow activities", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.customApisDecision = { status: "notApplicable", details: "", notApplicableReason: "No APIs", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.pcfControlsDecision = { status: "notApplicable", details: "", notApplicableReason: "No PCF", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.azureIntegrationsDecision = { status: "notApplicable", details: "", notApplicableReason: "No Azure integrations", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.externalServicesDecision = { status: "notApplicable", details: "", notApplicableReason: "No external services", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenExtensionsGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.modelDriven!.extensionsStatus = "confirmed";
    expect(calculateModelDrivenExtensionsGate(project)).toBe("confirmed");

    project.powerPlatform!.common.sourceControlApproach = "Repository notes";
    project.powerPlatform!.common.deploymentMethod = "Managed deployment";
    project.powerPlatform!.common.deploymentResponsibility = "Technical owner";
    project.powerPlatform!.common.deploymentStrategy = "Dev/test/prod";
    project.powerPlatform!.common.connectionReferences = "Connection references documented";
    project.powerPlatform!.common.environmentVariables = "Environment variables documented";
    project.powerPlatform!.common.pipelineRequirements = "Manual approval pipeline";
    project.powerPlatform!.common.rollbackExpectations = "Rollback to previous version";
    project.powerPlatform!.common.releaseApprovalResponsibility = "App owner";
    project.powerPlatform!.common.almConfirmationStatus = "confirmed";
    expect(calculateAlmGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.almReadinessStatus = "confirmed";
    expect(calculateAlmGate(project)).toBe("confirmed");
  });

  it("requires controlled business-rule applicability decisions", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    project.powerPlatform!.modelDriven!.businessLogicStatus = "confirmed";
    project.powerPlatform!.modelDriven!.businessProcessFlowsDecision = { status: "notApplicable", details: "", notApplicableReason: "No BPF", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.automationsDecision = { status: "notApplicable", details: "", notApplicableReason: "No automation", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.validationRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No validation rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.duplicatePreventionDecision = { status: "notApplicable", details: "", notApplicableReason: "No duplicate prevention", confirmationStatus: "confirmed" };

    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.businessRulesDecision = { status: "required", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.businessRulesDecision.details = "Status cannot move to Closed without a resolution.";
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");
    project.powerPlatform!.modelDriven!.businessRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.businessRulesDecision.notApplicableReason = "No table-level business rules.";
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");
  });

  it("requires full external connector selection, classification, and licensing for model-driven projects", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("notApplicable");
    expect(calculateModelDrivenExternalConnectorClassificationGate(project)).toBe("notApplicable");
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("notApplicable");

    project.powerPlatform!.common.connectors = [createDefaultConnector({
      id: "premium-api",
      displayName: "Premium Service API",
      dataSourceName: "Premium Service",
      dataSourceType: "externalApi",
      connectorClassification: "premium"
    })];
    expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("missingInformation");

    Object.assign(project.powerPlatform!.common.connectors[0], {
      purpose: "Read service account status.",
      authenticationMethod: "OAuth",
      gatewayRequirement: "No gateway",
      environmentRequirement: "Production environment variable",
      dlpImpact: "Requires Business DLP group",
      approvalStatus: "Approved by admin"
    });
    expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.common.connectors[0].approvalConfirmationStatus = "confirmed";
    expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("confirmed");
    expect(calculateModelDrivenExternalConnectorClassificationGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.common.connectors[0].classificationConfirmationStatus = "confirmed";
    expect(calculateModelDrivenExternalConnectorClassificationGate(project)).toBe("confirmed");
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("reviewNeeded");

    project.powerPlatform!.common.dataverseAvailability = "confirmed";
    project.powerPlatform!.common.licensingConfirmationStatus = "confirmed";
    project.powerPlatform!.modelDriven!.modelDrivenLicensingStatus = "confirmed";
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("missingInformation");
    project.powerPlatform!.common.connectors[0].licenceRequirement = "Premium connector licence required; not assumed.";
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.common.connectors[0].licensingConfirmationStatus = "confirmed";
    expect(calculateModelDrivenExternalConnectorLicensingGate(project)).toBe("confirmed");
    expect(calculateLicensingGate(project)).toBe("confirmed");
  });

  it("does not infer connector approval from approval notes", () => {
    const negativeNotes = [
      "Not approved",
      "Approval not confirmed",
      "Pending approval",
      "Not approved by administration",
      "Approval denied"
    ];
    for (const note of negativeNotes) {
      const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
      project.powerPlatform!.common.connectors = [createDefaultConnector({
        displayName: "External API",
        purpose: "Read records",
        dataSourceName: "External",
        dataSourceType: "externalApi",
        authenticationMethod: "OAuth",
        gatewayRequirement: "No gateway",
        environmentRequirement: "Production variable",
        dlpImpact: "Business DLP",
        approvalStatus: note,
        approvalConfirmationStatus: "reviewNeeded"
      })];
      expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("reviewNeeded");
      project.powerPlatform!.common.connectors[0].approvalConfirmationStatus = "confirmed";
      expect(calculateModelDrivenExternalConnectorSelectionGate(project)).toBe("confirmed");
    }
  });

  it("normalizes connector approval notes only for exact legacy approvals", () => {
    const approved = normalizePowerPlatformData({
      common: { connectors: [{ id: "approved", approvalStatus: "approved" }] },
      modelDriven: {}
    }, "powerAppsModelDriven")!;
    expect(approved.common.connectors[0].approvalStatus).toBe("approved");
    expect(approved.common.connectors[0].approvalConfirmationStatus).toBe("confirmed");

    const sentence = normalizePowerPlatformData({
      common: { connectors: [{ id: "sentence", approvalStatus: "Approved by admin" }] },
      modelDriven: {}
    }, "powerAppsModelDriven")!;
    expect(sentence.common.connectors[0].approvalStatus).toBe("Approved by admin");
    expect(sentence.common.connectors[0].approvalConfirmationStatus).toBe("missingInformation");

    const negative = normalizePowerPlatformData({
      common: { connectors: [{ id: "negative", approvalStatus: "Not approved" }] },
      modelDriven: { businessRules: "Keep existing text" }
    }, "powerAppsModelDriven")!;
    expect(negative.common.connectors[0].approvalConfirmationStatus).toBe("missingInformation");
    expect(negative.modelDriven!.businessRules).toBe("Keep existing text");
    expect(negative.modelDriven!.teamModelDecision.status).toBe("undecided");
    expect(negative.modelDriven!.validationRulesDecision.status).toBe("undecided");
  });

  it("requires controlled security applicability decisions", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    project.powerPlatform!.modelDriven!.securityRoles = "Manager";
    project.powerPlatform!.modelDriven!.businessUnits = "Operations";
    project.powerPlatform!.modelDriven!.tablePrivileges = "Read/write";
    project.powerPlatform!.modelDriven!.privilegeDepth = "BU";
    project.powerPlatform!.modelDriven!.recordOwnership = "Team";
    project.powerPlatform!.modelDriven!.sharingExpectations = "No sharing";
    project.powerPlatform!.modelDriven!.securityArchitectureStatus = "confirmed";

    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.teamModelDecision = { status: "required", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.teamModelDecision.details = "Owner team and access team";
    project.powerPlatform!.modelDriven!.hierarchySecurityDecision = { status: "notApplicable", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.hierarchySecurityDecision.notApplicableReason = "No hierarchy security";
    project.powerPlatform!.modelDriven!.fieldSecurityDecision = { status: "required", details: "Protect SIN field", notApplicableReason: "", confirmationStatus: "reviewNeeded" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("reviewNeeded");
    project.powerPlatform!.modelDriven!.fieldSecurityDecision.confirmationStatus = "confirmed";
    project.powerPlatform!.modelDriven!.applicationUsersDecision = { status: "notApplicable", details: "", notApplicableReason: "No application users", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.servicePrincipalsDecision = { status: "notApplicable", details: "", notApplicableReason: "No service principals", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenSecurityArchitectureGate(project)).toBe("confirmed");
  });

  it("requires validation and duplicate-prevention applicability in business logic readiness", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    project.powerPlatform!.modelDriven!.businessLogicStatus = "confirmed";
    project.powerPlatform!.modelDriven!.businessRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No business rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.businessProcessFlowsDecision = { status: "notApplicable", details: "", notApplicableReason: "No BPF", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.automationsDecision = { status: "notApplicable", details: "", notApplicableReason: "No automations", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.validationRulesDecision = { status: "required", details: "", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("missingInformation");
    project.powerPlatform!.modelDriven!.validationRulesDecision.details = "Require status reason.";
    project.powerPlatform!.modelDriven!.duplicatePreventionDecision = { status: "required", details: "Duplicate detection on account number.", notApplicableReason: "", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");
    project.powerPlatform!.modelDriven!.validationRulesDecision = { status: "notApplicable", details: "", notApplicableReason: "No validation rules", confirmationStatus: "confirmed" };
    project.powerPlatform!.modelDriven!.duplicatePreventionDecision = { status: "notApplicable", details: "", notApplicableReason: "No duplicate prevention", confirmationStatus: "confirmed" };
    expect(calculateModelDrivenBusinessLogicGate(project)).toBe("confirmed");
  });

  it("generates concrete Canvas Power Platform documents without placeholder templates", () => {
    const project = createProject({
      identity: { projectName: "Canvas Operations App" },
      intake: {
        appType: "powerAppsCanvas",
        appPurpose: "Track operations requests",
        targetPlatform: "Power Apps Canvas"
      }
    });
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "dataverse", "externalApi"];
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({ id: "sp", displayName: "SharePoint", dataSourceType: "sharePointList", canvasRole: "primary" }),
      createDefaultConnector({ id: "dv", displayName: "Dataverse", dataSourceType: "dataverse", canvasRole: "secondary" }),
      createDefaultConnector({ id: "api", displayName: "Service API", dataSourceType: "externalApi", canvasRole: "secondary" })
    ];

    const generated = generateProjectPackage(project);
    const placeholderDocs = generated.documents.filter((document) => document.content.includes("document template implementation pending"));

    expect(placeholderDocs).toEqual([]);
    expect(generated.documents.map((document) => document.fileName)).toEqual(expect.arrayContaining([
      "POWER_FX_STANDARDS.md",
      "DELEGATION_REGISTER.md",
      "CONTROL_INVENTORY.md",
      "APP_CONFIGURATION.md",
      "YAML_MANIFEST.md",
      "CONNECTION_REGISTER.md",
      "IMPLEMENTATION_LOG.md",
      "ALM_DEPLOYMENT_PLAN.md",
      "SHAREPOINT_SCHEMA.md",
      "DATAVERSE_SCHEMA.md",
      "CONNECTOR_SCHEMA.md"
    ]));
    expect(generatedDocument(project, "POWER_FX_STANDARDS.md")).toContain("This document is a planning standard");
    expect(generatedDocument(project, "YAML_MANIFEST.md")).toContain("intentionally avoids paste-ready YAML");
    expect(generatedDocument(project, "APP_CONFIGURATION.md")).toContain("**Package readiness:** Draft");
    expect(generatedDocument(project, "APP_CONFIGURATION.md")).toContain("**Document status:** Draft");
  });

  it("generates concrete model-driven documents without fabricated source claims", () => {
    const project = createProject({
      identity: { projectName: "Model Operations App" },
      intake: {
        appType: "powerAppsModelDriven",
        appPurpose: "Manage operations records",
        targetPlatform: "Power Apps model-driven app"
      }
    });
    project.powerPlatform!.common.solutionName = "Operations";
    project.powerPlatform!.common.publisherName = "Contoso";
    project.powerPlatform!.common.publisherPrefix = "ops";
    project.powerPlatform!.modelDriven!.tables = "Requests";
    project.powerPlatform!.modelDriven!.columns = "Name, Status";
    project.powerPlatform!.modelDriven!.relationships = "Account to Request";

    const generated = generateProjectPackage(project);
    const placeholderDocs = generated.documents.filter((document) => document.content.includes("document template implementation pending"));

    expect(placeholderDocs).toEqual([]);
    expect(generated.documents.map((document) => document.fileName)).toEqual(expect.arrayContaining([
      "SOLUTION_ARCHITECTURE.md",
      "SOLUTION_COMPONENT_REGISTER.md",
      "TABLE_RELATIONSHIPS.md",
      "FORMS_AND_VIEWS.md",
      "APP_NAVIGATION.md",
      "BUSINESS_PROCESS_FLOWS.md",
      "AUTOMATION_REGISTER.md",
      "SECURITY_ROLES.md",
      "CUSTOM_PAGES.md",
      "EXTENSION_REGISTER.md",
      "ENVIRONMENT_VARIABLES.md"
    ]));
    expect(generatedDocument(project, "SOLUTION_ARCHITECTURE.md")).toContain("Do not fabricate solution source files");
    expect(generatedDocument(project, "EXTENSION_REGISTER.md")).toContain("Do not generate JavaScript, plug-in code, PCF source");
  });

  it("generates 24 Canvas Codex phases with readiness and reporting sections", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    const prompts = generatedDocument(project, "PHASED_CODEX_PROMPTS.md");
    const phaseCount = prompts.match(/^## Phase /gm)?.length ?? 0;

    expect(phaseCount).toBe(24);
    expect(prompts).toContain("Formula generation status: Blocked.");
    expect(prompts).toContain("YAML generation status: Blocked.");
    expect(prompts).toContain("### Reporting instructions");
    expect(prompts).toContain("Readiness gate status");
  });

  it("generates 27 model-driven Codex phases with model-driven guardrails", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    const prompts = generatedDocument(project, "PHASED_CODEX_PROMPTS.md");
    const phaseCount = prompts.match(/^## Phase /gm)?.length ?? 0;

    expect(phaseCount).toBe(27);
    expect(prompts).toContain("Do not generate fabricated model-driven source");
    expect(prompts).toContain("Do not represent the app as a single Canvas YAML artifact.");
    expect(prompts).toContain("Manual checks run");
    expect(prompts).toContain("Missing decisions");
  });

  it("registers templates and purposes for every applicable Power Platform document including the decision log", () => {
    for (const project of [
      createProject({ intake: { appType: "powerAppsCanvas" } }),
      createProject({ intake: { appType: "powerAppsModelDriven" } })
    ]) {
      const generated = generateProjectPackage(project);
      const expected = expectedDocumentLocations(project);
      expect(expected.map((document) => document.fileName)).toContain("DECISION_LOG.md");
      expect(generated.documents).toHaveLength(expected.length);
      for (const location of expected) {
        expect(generated.documents.some((document) => document.fileName === location.fileName)).toBe(true);
        expect(DOCUMENT_PURPOSES[location.fileName]).toBeTruthy();
      }
      const paths = expected.map((location) => `${location.folder}/${location.fileName}`);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it("uses exact approved Canvas phase names and required phase sections", () => {
    const prompts = generatedDocument(createProject({ intake: { appType: "powerAppsCanvas" } }), "PHASED_CODEX_PROMPTS.md");
    const names = [...prompts.matchAll(/^## Phase \d+: (.+)$/gm)].map((match) => match[1]);
    expect(names).toEqual([
      "Project setup and requirements confirmation",
      "Connector and licensing confirmation",
      "Environment confirmation",
      "Data-source selection",
      "Data-source schema confirmation",
      "Internal, logical, or field identifier confirmation",
      "Architecture and naming standards",
      "App configuration and theme",
      "Responsive foundation",
      "Screens, containers, and navigation",
      "Reusable components",
      "Data loading and state management",
      "Create operations",
      "View and edit operations",
      "Archive and restore operations",
      "Search, filter, sort, and delegation",
      "Attachments and files",
      "Permissions and role-based interface",
      "Accessibility",
      "Canvas YAML generation",
      "Connector setup and manual installation",
      "Testing and acceptance",
      "Publishing and deployment",
      "Final review and cleanup"
    ]);
    for (const section of ["Phase number", "Phase name", "Objective", "Prerequisites", "Gate requirements", "Files to create", "Files to update", "Exact requirements", "Generated implementation assets", "Configuration steps", "Manual actions", "Validation checks", "Acceptance criteria", "Completion criteria", "Testing instructions", "Reporting instructions", "Blocked assumptions", "Missing decisions", "Recommended next phase"]) {
      expect(prompts).toContain(`### ${section}`);
    }
    expect(prompts).not.toContain("phase-specific files to create or update");
    expect(prompts).not.toContain("document template implementation pending");
  });

  it("uses exact approved model-driven phase names and reflects not-applicable reasons", () => {
    const project = createProject({ intake: { appType: "powerAppsModelDriven" } });
    project.powerPlatform!.modelDriven!.businessProcessFlowsDecision = { status: "notApplicable", details: "", notApplicableReason: "No BPF in first release.", confirmationStatus: "confirmed" };
    const prompts = generatedDocument(project, "PHASED_CODEX_PROMPTS.md");
    const names = [...prompts.matchAll(/^## Phase \d+: (.+)$/gm)].map((match) => match[1]);
    expect(names).toEqual([
      "Project setup and requirements confirmation",
      "Dataverse and licensing confirmation",
      "Environment, solution, and publisher confirmation",
      "Dataverse table inventory",
      "Column and choice confirmation",
      "Relationship confirmation",
      "Dataverse schema approval",
      "External connector and integration review",
      "Security architecture",
      "Solution architecture",
      "Forms",
      "Views",
      "App pages and navigation",
      "Business rules",
      "Business process flows",
      "Automations",
      "Charts and dashboards",
      "Custom pages",
      "Command bar and client scripting",
      "PCF, plug-ins, custom APIs, and web resources",
      "Environment variables and connection references",
      "Data migration",
      "Source control and ALM",
      "Solution validation",
      "Import, publication, and deployment",
      "Testing and acceptance",
      "Final review and cleanup"
    ]);
    expect(prompts).toContain("Not Applicable. Reason: No BPF in first release.");
    expect(prompts).toContain("Do not fabricate solution XML, importable packages, or source files.");
  });

  it("allows formula and YAML generation only when Canvas gates pass", () => {
    const draft = generatedDocument(createProject({ intake: { appType: "powerAppsCanvas" } }), "PHASED_CODEX_PROMPTS.md");
    expect(draft).toContain("Formula generation status: Blocked.");
    expect(draft).toContain("YAML generation status: Blocked.");

    const ready = createReadyCanvasProject();
    expect(getClientReviewReadiness(ready).isReady).toBe(true);
    const prompts = generatedDocument(ready, "PHASED_CODEX_PROMPTS.md");
    expect(prompts).toContain("Formula generation status: Allowed.");
    expect(prompts).toContain("YAML generation status: Allowed.");
  });

  it("allows Draft exports with warnings and downgrades injected missing markers from Ready", () => {
    const draft = createProject({ intake: { appType: "powerAppsCanvas" } });
    const draftPackage = generateProjectPackage(draft);
    const draftProject = { ...draft, generatedDocuments: draftPackage.documents, generatedFileCount: draftPackage.documents.length };
    const draftIntegrity = validateExportPackage(draftProject);
    expect(draftIntegrity.isValid).toBe(true);
    expect(draftIntegrity.manifestSummary.readiness).toBe("Draft");
    expect(draftIntegrity.warnings.some((warning) => warning.includes("missing-information marker"))).toBe(true);

    const ready = createReadyCanvasProject();
    const readyPackage = generateProjectPackage(ready);
    const readyProject = { ...ready, generatedDocuments: readyPackage.documents, generatedFileCount: readyPackage.documents.length };
    expect(validateExportPackage(readyProject).isValid).toBe(true);
    readyProject.generatedDocuments = [
      ...readyProject.generatedDocuments.slice(0, 1).map((document) => ({ ...document, content: `${document.content}\n[MISSING: injected blocker]` })),
      ...readyProject.generatedDocuments.slice(1)
    ];
    const downgraded = validateExportPackage(readyProject);
    expect(downgraded.isValid).toBe(true);
    expect(downgraded.manifestSummary.readiness).toBe("Draft");
    expect(downgraded.warnings.join("\n")).toContain("missing-information marker");
  });

  it("produces Ready Canvas and model-driven packages without unresolved missing markers", () => {
    for (const project of [createReadyCanvasProject(), createReadyModelDrivenProject()]) {
      expect(getClientReviewReadiness(project).isReady).toBe(true);
      const generated = generateProjectPackage(project);
      const content = generated.documents.map((document) => document.content).join("\n");
      expect(content).not.toContain("[MISSING:");
      expect(content).not.toContain("phase-specific files to create or update");
      expect(content).not.toContain("document template implementation pending");
      const readyProject = { ...project, generatedDocuments: generated.documents, generatedFileCount: generated.documents.length };
      const integrity = validateExportPackage(readyProject);
      expect(integrity.isValid).toBe(true);
      expect(integrity.manifestSummary.readiness).toBe("Ready for Codex");
    }
  });

  it("keeps final rendered metadata, generated readiness, and export manifest readiness converged", () => {
    const project = createReadyCanvasProject();
    const generated = generateProjectPackage(project);
    const readyProject = { ...project, generatedDocuments: generated.documents, generatedFileCount: generated.documents.length };
    const readiness = evaluateGeneratedPackageReadiness(readyProject);
    const integrity = validateExportPackage(readyProject);
    const readme = generated.documents.find((document) => document.fileName === "README.md")!.content;

    expect(readiness.status).toBe(integrity.manifestSummary.readiness);
    expect(readme).toContain(`**Package readiness:** ${integrity.manifestSummary.readiness}`);
    expect(readme).toContain("**Document status:** Ready for Implementation");
    expect(readiness.blockers).toEqual([]);
  });

  it("summarizes Mission Control document status counts for Power Platform projects", () => {
    const projects = [
      createReadyCanvasProject(),
      (() => {
        const project = createReadyCanvasProject();
        project.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
        return project;
      })(),
      (() => {
        const project = createReadyCanvasProject();
        project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
        project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "dataverse"];
        return project;
      })(),
      createReadyModelDrivenProject()
    ];
    for (const source of projects) {
      const generated = generateProjectPackage(source);
      const project = { ...source, generatedDocuments: generated.documents, generatedFileCount: generated.documents.length };
      const summary = getDocumentStatusSummary(project);
      expect(summary.applicableDocumentCount).toBe(expectedDocumentLocations(project).length);
      expect(summary.generatedDocumentCount).toBe(generated.documents.length);
      expect(summary.architectInstructionsStatus).not.toBe("Not generated");
      expect(summary.codexInstructionsStatus).not.toBe("Not generated");
      expect(summary.codexPhasesStatus).not.toBe("Not generated");
    }
  });

  it("maps every explicit Canvas and model-driven phase gate to a human-readable evaluator", () => {
    const canvasProject = createProject({ intake: { appType: "powerAppsCanvas" } });
    const modelProject = createProject({ intake: { appType: "powerAppsModelDriven" } });
    const phases = [...canvasPhaseDefinitions(canvasProject), ...modelDrivenPhaseDefinitions(modelProject)];
    const everyGateId = new Set(phases.flatMap((phase) => phase.gates));

    for (const gateId of everyGateId) {
      expect(PHASE_GATE_EVALUATORS[gateId]).toBeDefined();
      const project = gateId === "eligibility" || gateId === "solutionArchitecture" ? modelProject : canvasProject;
      const result = evaluatePhaseGate(project, gateId);
      expect(result.label).not.toBe(gateId);
      expect(result.label.trim()).not.toBe("");
      expect(result.sourceSection.trim()).not.toBe("");
    }

    expect(() => assertKnownPhaseGateId("unknownGate")).toThrow("Unknown phase gate ID");
  });

  it("keeps screen data-source readiness limited to active selected Canvas backends", () => {
    const project = createReadyCanvasProject();
    const canvas = project.powerPlatform!.canvas!;
    project.powerPlatform!.common.connectors.push(createDefaultConnector({
      id: "dv",
      displayName: "Dataverse",
      dataSourceType: "dataverse",
      canvasRole: "secondary",
      connectorClassification: "standard",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      approvalStatus: "Approved"
    }));
    canvas.dataverseTableSchemas = [createDefaultDataverseTable({
      id: "accounts",
      displayName: "Accounts",
      logicalName: "account",
      schemaName: "Account",
      ownershipType: "User/team",
      primaryNameColumn: "name",
      purpose: "Retained Dataverse table.",
      expectedRecordCount: "500",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })];

    expect(activeCanvasEntityReferences(project).has("accounts")).toBe(false);
    canvas.screenTargets[0].dataSourceReferences = [{ connectorId: "dv", entityId: "accounts" }];
    expect(validateCanvasTargets(project).screenStatus).not.toBe("confirmed");
    expect(evaluateGeneratedPackageReadiness(project).status).toBe("Draft");

    const dataverseOnly = createReadyCanvasProject();
    dataverseOnly.powerPlatform!.common.connectors = [
      createDefaultConnector({
        id: "dv",
        displayName: "Dataverse",
        dataSourceType: "dataverse",
        canvasRole: "primary",
        connectorClassification: "standard",
        classificationConfirmationStatus: "confirmed",
        licensingConfirmationStatus: "confirmed",
        permissionConfirmationStatus: "confirmed",
        approvalConfirmationStatus: "confirmed",
        approvalStatus: "Approved"
      })
    ];
    dataverseOnly.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    dataverseOnly.powerPlatform!.canvas!.selectedDataSourceTypes = ["dataverse"];
    dataverseOnly.powerPlatform!.canvas!.primaryConnectorId = "dv";
    dataverseOnly.powerPlatform!.canvas!.screenTargets[0].dataSourceReferences = [{ connectorId: "sp", entityId: "requests" }];
    expect(activeCanvasEntityReferences(dataverseOnly).has("requests")).toBe(false);
    expect(validateCanvasTargets(dataverseOnly).screenStatus).not.toBe("confirmed");

    const mixed = createReadyCanvasProject();
    mixed.powerPlatform!.common.connectors.push(createDefaultConnector({
      id: "dv",
      displayName: "Dataverse",
      dataSourceType: "dataverse",
      canvasRole: "secondary",
      connectorClassification: "standard",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      approvalStatus: "Approved"
    }));
    mixed.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    mixed.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "dataverse"];
    mixed.powerPlatform!.canvas!.secondaryConnectorIds = ["dv"];
    mixed.powerPlatform!.canvas!.dataverseTableSchemas = [createDefaultDataverseTable({
      id: "accounts",
      displayName: "Accounts",
      logicalName: "account",
      schemaName: "Account",
      ownershipType: "User/team",
      primaryNameColumn: "name",
      purpose: "Active Dataverse table.",
      expectedRecordCount: "500",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })];
    mixed.powerPlatform!.canvas!.screenTargets[0].dataSourceReferences = [
      { connectorId: "sp", entityId: "requests" },
      { connectorId: "dv", entityId: "accounts" }
    ];
    expect(validateCanvasTargets(mixed).screenStatus).toBe("confirmed");

    mixed.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList"];
    expect(validateCanvasTargets(mixed).screenStatus).not.toBe("confirmed");
  });

  it("reconciles multiple-to-single Canvas connector transitions and stale secondary IDs", () => {
    const project = createReadyCanvasProject();
    const canvas = project.powerPlatform!.canvas!;
    project.powerPlatform!.common.connectors.push(createDefaultConnector({
      id: "dv",
      displayName: "Dataverse",
      dataSourceType: "dataverse",
      canvasRole: "secondary",
      connectorClassification: "standard",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      approvalStatus: "Approved"
    }));
    canvas.primaryDataSourceType = "multiple";
    canvas.selectedDataSourceTypes = ["sharePointList", "dataverse"];
    canvas.primaryConnectorId = "sp";
    canvas.secondaryConnectorIds = ["dv"];
    canvas.dataverseTableSchemas = [createDefaultDataverseTable({
      id: "accounts",
      displayName: "Accounts",
      logicalName: "account",
      schemaName: "Account",
      ownershipType: "User/team",
      primaryNameColumn: "name",
      purpose: "Active Dataverse table.",
      expectedRecordCount: "500",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })];
    canvas.screenTargets[0].dataSourceReferences = [{ connectorId: "dv", entityId: "accounts" }];

    expect(reconcileCanvasConnectorSelection(project).activeConnectorIds).toEqual(["sp", "dv"]);
    expect(activeCanvasEntityReferences(project).has("accounts")).toBe(true);

    canvas.primaryDataSourceType = "sharePointList";
    canvas.selectedDataSourceTypes = ["sharePointList"];
    canvas.secondaryConnectorIds = ["dv"];

    let selection = reconcileCanvasConnectorSelection(project);
    expect(selection.activeConnectorIds).toEqual(["sp"]);
    expect(selection.activeSecondaryConnectorIds).toEqual([]);
    expect(selection.inactiveStoredConnectorIds).toContain("dv");
    expect(activeCanvasEntityReferences(project).has("accounts")).toBe(false);
    expect(validateCanvasTargets(project).screenStatus).not.toBe("confirmed");
    expect(evaluateGeneratedPackageReadiness(project).status).toBe("Draft");
    const readyProject = { ...project, generatedDocuments: generateProjectPackage(project).documents };
    expect(validateExportPackage(readyProject).manifestSummary.readiness).toBe("Draft");

    canvas.primaryDataSourceType = "dataverse";
    canvas.primaryConnectorId = "dv";
    canvas.selectedDataSourceTypes = ["dataverse"];
    canvas.secondaryConnectorIds = ["sp"];
    canvas.screenTargets[0].dataSourceReferences = [{ connectorId: "sp", entityId: "requests" }];

    selection = reconcileCanvasConnectorSelection(project);
    expect(selection.activeConnectorIds).toEqual(["dv"]);
    expect(selection.inactiveStoredConnectorIds).toContain("sp");
    expect(activeCanvasEntityReferences(project).has("requests")).toBe(false);
    expect(validateCanvasTargets(project).screenStatus).not.toBe("confirmed");

    canvas.primaryDataSourceType = "multiple";
    canvas.primaryConnectorId = "sp";
    canvas.selectedDataSourceTypes = ["sharePointList"];
    canvas.secondaryConnectorIds = ["dv"];
    canvas.screenTargets[0].dataSourceReferences = [{ connectorId: "dv", entityId: "accounts" }];

    selection = reconcileCanvasConnectorSelection(project);
    expect(selection.activeConnectorIds).toEqual(["sp"]);
    expect(selection.inactiveStoredConnectorIds).toContain("dv");
    expect(activeCanvasEntityReferences(project).has("accounts")).toBe(false);
    expect(validateCanvasTargets(project).screenStatus).not.toBe("confirmed");

    canvas.selectedDataSourceTypes = ["sharePointList", "dataverse"];
    selection = reconcileCanvasConnectorSelection(project);
    expect(selection.activeConnectorIds).toEqual(["sp", "dv"]);
    expect(activeCanvasEntityReferences(project).has("accounts")).toBe(true);
    expect(validateCanvasTargets(project).screenStatus).toBe("confirmed");

    canvas.primaryDataSourceType = "sharePointList";
    canvas.primaryConnectorId = "sp";
    canvas.selectedDataSourceTypes = ["sharePointList"];
    canvas.secondaryConnectorIds = ["dv"];
    canvas.screenTargets[0].dataSourceReferences = [{ connectorId: "sp", entityId: "requests" }];
    selection = reconcileCanvasConnectorSelection(project);
    expect(selection.activeConnectorIds).toEqual(["sp"]);
    expect(selection.activeSecondaryConnectorIds).toEqual([]);
    expect(selection.inactiveStoredConnectorIds).toContain("dv");
    expect(validateCanvasTargets(project).screenStatus).toBe("confirmed");
  });

  it("blocks inactive external connector resources and allows assigned active resources", () => {
    const project = createReadyCanvasProject();
    const canvas = project.powerPlatform!.canvas!;
    project.powerPlatform!.common.connectors.push(
      createDefaultConnector({
        id: "api",
        displayName: "External API",
        dataSourceType: "externalApi",
        canvasRole: "secondary",
        connectorClassification: "custom",
        classificationConfirmationStatus: "confirmed",
        licensingConfirmationStatus: "confirmed",
        permissionConfirmationStatus: "confirmed",
        approvalConfirmationStatus: "confirmed",
        approvalStatus: "Approved"
      }),
      createDefaultConnector({
        id: "other-api",
        displayName: "Other API",
        dataSourceType: "externalApi",
        canvasRole: "",
        connectorClassification: "custom",
        classificationConfirmationStatus: "confirmed",
        licensingConfirmationStatus: "confirmed",
        permissionConfirmationStatus: "confirmed",
        approvalConfirmationStatus: "confirmed",
        approvalStatus: "Approved"
      })
    );
    canvas.connectorResourceSchemas = [
      createDefaultConnectorResource({
        id: "orders",
        connectorId: "api",
        resourceName: "Orders",
        resourceType: "REST resource",
        purpose: "Order lookup.",
        keyOrIdentifier: "orderId",
        authenticationRequirement: "API key",
        queryLimitations: "Use filtered queries.",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      }),
      createDefaultConnectorResource({
        id: "other-orders",
        connectorId: "other-api",
        resourceName: "Other orders",
        resourceType: "REST resource",
        purpose: "Wrong connector.",
        keyOrIdentifier: "orderId",
        authenticationRequirement: "API key",
        queryLimitations: "Use filtered queries.",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];

    canvas.primaryDataSourceType = "sharePointList";
    canvas.selectedDataSourceTypes = ["sharePointList"];
    canvas.screenTargets[0].dataSourceReferences = [{ connectorId: "api", entityId: "orders" }];
    expect(validateCanvasTargets(project).screenStatus).not.toBe("confirmed");

    canvas.primaryDataSourceType = "multiple";
    canvas.selectedDataSourceTypes = ["sharePointList", "externalApi"];
    canvas.secondaryConnectorIds = ["api"];
    canvas.screenTargets[0].dataSourceReferences = [{ connectorId: "api", entityId: "other-orders" }];
    expect(validateCanvasTargets(project).screenStatus).not.toBe("confirmed");

    canvas.screenTargets[0].dataSourceReferences = [{ connectorId: "api", entityId: "orders" }];
    expect(validateCanvasTargets(project).screenStatus).toBe("confirmed");
  });

  it("requires structured component usage targets for component and YAML readiness", () => {
    const project = createReadyCanvasProject();
    const canvas = project.powerPlatform!.canvas!;
    canvas.componentApplicabilityDecision = {
      status: "required",
      details: "Reusable header component is required.",
      notApplicableReason: "",
      confirmationStatus: "confirmed"
    };
    canvas.componentTargets = [{
      id: "component-header",
      approvedComponentName: "cmpHeader",
      purpose: "Reusable page header.",
      inputs: "Title text",
      outputs: "None",
      parentOrUsageLocations: "missing-screen-id",
      usageTargets: [],
      yamlOutputDecision: {
        status: "required",
        details: "Component YAML target required.",
        notApplicableReason: "",
        confirmationStatus: "confirmed"
      },
      yamlOutputType: "component",
      yamlParentType: "component",
      yamlParentId: "component-root",
      yamlInstallationLocation: "Component library",
      yamlValidationResponsibility: "Technical Owner",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }];

    expect(validateCanvasTargets(project).componentStatus).not.toBe("confirmed");
    expect(validateCanvasTargets(project).yamlStatus).not.toBe("confirmed");

    canvas.componentTargets[0].usageTargets = [{
      id: "usage-unknown",
      targetType: "screen",
      targetId: "missing-screen-id",
      purpose: "Header on missing screen.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }];
    expect(validateCanvasTargets(project).componentStatus).not.toBe("confirmed");

    canvas.componentTargets[0].usageTargets = [{
      id: "usage-unconfirmed",
      targetType: "screen",
      targetId: "screen-home",
      purpose: "Header on home.",
      confirmationStatus: "reviewNeeded",
      confirmationSource: "Architect"
    }];
    expect(validateCanvasTargets(project).componentStatus).not.toBe("confirmed");

    canvas.componentTargets[0].usageTargets = [
      {
        id: "usage-home-a",
        targetType: "screen",
        targetId: "screen-home",
        purpose: "Header on home.",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      },
      {
        id: "usage-home-b",
        targetType: "screen",
        targetId: "screen-home",
        purpose: "Duplicate header on home.",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      }
    ];
    expect(validateCanvasTargets(project).componentStatus).not.toBe("confirmed");

    canvas.componentTargets[0].usageTargets = [{
      id: "usage-control",
      targetType: "control",
      targetId: "control-load-requests",
      purpose: "Header near recent request gallery.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }];
    expect(validateCanvasTargets(project).componentStatus).toBe("confirmed");
    expect(validateCanvasTargets(project).yamlStatus).toBe("confirmed");

    const prompts = generatedDocument(project, "PHASED_CODEX_PROMPTS.md");
    expect(prompts).toContain("component-header.component.pa.yaml");

    canvas.componentTargets[0].yamlOutputDecision = {
      status: "notApplicable",
      details: "",
      notApplicableReason: "Component will be configured manually.",
      confirmationStatus: "confirmed"
    };
    expect(generatedDocument(project, "PHASED_CODEX_PROMPTS.md")).not.toContain("component-header.component.pa.yaml");
  });

  it("lets model-driven source availability reach Confirmed only from a controlled status", () => {
    const project = createReadyModelDrivenProject();
    Object.assign(project.powerPlatform!.modelDriven!, {
      sourceAvailabilityStatus: "confirmed",
      sourceLocation: "https://dev.azure.com/contoso/ready-model",
      sourceType: "Unpacked unmanaged solution",
      sourceValidationStatus: "confirmed",
      sourceValidationEvidence: "Solution unpacked and compared by Technical Owner.",
      solutionVersion: "1.0.0.0",
      lastUnpackedDate: "2026-07-12"
    });
    expect(evaluatePhaseGate(project, "sourceAvailability").status).toBe("confirmed");

    project.powerPlatform!.modelDriven!.sourceAvailabilityStatus = "solution.zip exists";
    expect(evaluatePhaseGate(project, "sourceAvailability").status).toBe("reviewNeeded");
  });

  it("blocks Canvas file phase when applicability is undecided and suppresses assets when files are not applicable", () => {
    const undecided = createReadyCanvasProject();
    undecided.powerPlatform!.canvas!.fileApplicabilityDecision = { status: "undecided", details: "", notApplicableReason: "", confirmationStatus: "notStarted" };
    expect(evaluatePhaseGate(undecided, "fileRequirements").status).toBe("missingInformation");

    const notApplicable = createReadyCanvasProject();
    notApplicable.powerPlatform!.canvas!.fileApplicabilityDecision = {
      status: "notApplicable",
      details: "",
      notApplicableReason: "No file storage in first release.",
      confirmationStatus: "confirmed"
    };
    const prompts = generatedDocument(notApplicable, "PHASED_CODEX_PROMPTS.md");
    expect(evaluatePhaseGate(notApplicable, "fileRequirements").status).toBe("notApplicable");
    expect(prompts).toContain("No implementation assets authorized. Approved reason: No file storage in first release.");
    expect(prompts).toContain("No implementation file targets authorized. Approved Not Applicable reason: No file storage in first release.");
    expect(prompts).not.toContain("attachments-files.fx");
  });

  it("does not let connector approval notes satisfy connection ownership", () => {
    const project = createReadyCanvasProject();
    project.powerPlatform!.common.connectors[0].connectionOwner = "";
    project.powerPlatform!.common.connectors[0].connectionOwnerRole = "";
    project.powerPlatform!.common.connectors[0].connectionOwnershipStatus = "reviewNeeded";
    project.powerPlatform!.common.connectors[0].approvalStatus = "Approved by admin";
    project.powerPlatform!.common.connectors[0].approvalConfirmationStatus = "confirmed";

    expect(evaluatePhaseGate(project, "connectionOwnership").status).toBe("missingInformation");
    expect(calculatePowerPlatformReadiness(project).nextBlockingAction).toBe("Confirm connection ownership.");
  });

  it("keeps Phase 1 available while later implementation gates remain unresolved", () => {
    const project = createReadyCanvasProject();
    project.powerPlatform!.canvas!.powerFxStatus = "missingInformation";
    project.powerPlatform!.canvas!.yamlStatus = "missingInformation";

    const prompts = generatedDocument(project, "PHASED_CODEX_PROMPTS.md");
    expect(evaluatePhaseGate(project, "currentBlockers").status).toBe("confirmed");
    expect(prompts).toContain("## Phase 1: Project setup and requirements confirmation");
    expect(prompts).toContain("Confirm Power Fx planning.");
    expect(prompts).toContain("Formula generation status: Blocked.");
  });

  it("blocks representative phase implementation assets with directly relevant missing gates", () => {
    const canvas = createReadyCanvasProject();
    canvas.powerPlatform!.canvas!.targetDevices = "";
    expect(isPhaseGatePassing(evaluatePhaseGate(canvas, "targetDevices"))).toBe(false);
    expect(generatedDocument(canvas, "PHASED_CODEX_PROMPTS.md")).toContain("Responsive foundation");
    expect(generatedDocument(canvas, "PHASED_CODEX_PROMPTS.md")).toContain("Generated implementation assets are blocked");

    const noScreens = createReadyCanvasProject();
    noScreens.powerPlatform!.canvas!.screenNames = "";
    noScreens.powerPlatform!.canvas!.screens = "";
    noScreens.intake.screens = "";
    expect(isPhaseGatePassing(evaluatePhaseGate(noScreens, "screenMap"))).toBe(false);

    const noReleaseApproval = createReadyCanvasProject();
    noReleaseApproval.powerPlatform!.common.releaseApprovalResponsibility = "";
    expect(isPhaseGatePassing(evaluatePhaseGate(noReleaseApproval, "releaseApproval"))).toBe(false);
  });

  it("blocks representative model-driven phases with directly relevant missing gates", () => {
    const noPublisher = createReadyModelDrivenProject();
    noPublisher.powerPlatform!.common.publisherPrefix = "";
    expect(isPhaseGatePassing(evaluatePhaseGate(noPublisher, "publisherPrefix"))).toBe(false);

    const noNavigation = createReadyModelDrivenProject();
    noNavigation.powerPlatform!.modelDriven!.navigationStatus = "missingInformation";
    expect(isPhaseGatePassing(evaluatePhaseGate(noNavigation, "navigation"))).toBe(false);

    const undecidedCharts = createReadyModelDrivenProject();
    undecidedCharts.powerPlatform!.modelDriven!.chartsDecision = { status: "undecided", details: "", notApplicableReason: "", confirmationStatus: "notStarted" };
    expect(isPhaseGatePassing(evaluatePhaseGate(undecidedCharts, "chartsAndDashboards"))).toBe(false);

    const noImportPermission = createReadyModelDrivenProject();
    noImportPermission.powerPlatform!.modelDriven!.importPermissionStatus = "missingInformation";
    expect(isPhaseGatePassing(evaluatePhaseGate(noImportPermission, "importPermission"))).toBe(false);
  });
});
