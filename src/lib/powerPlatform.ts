import {
  CANVAS_COMMON_DOCUMENT_LOCATIONS,
  CANVAS_DATAVERSE_DOCUMENT_LOCATIONS,
  CANVAS_OTHER_CONNECTOR_DOCUMENT_LOCATIONS,
  CANVAS_SHAREPOINT_DOCUMENT_LOCATIONS,
  CORE_DOCUMENT_LOCATIONS,
  MODEL_DRIVEN_DOCUMENT_LOCATIONS,
  type DocumentLocation
} from "../data/folderStructure";
import type {
  CanvasDataSourceType,
  ConnectorClassification,
  ConnectorOperation,
  PowerAppsCanvasSubtype,
  PowerAppsModelDrivenSubtype,
  PowerPlatformCommonData,
  PowerPlatformConnector,
  PowerPlatformCanvasData,
  PowerPlatformApplicabilityDecision,
  PowerPlatformDecisionStatus,
  PowerPlatformGateStatus,
  PowerPlatformModelDrivenData,
  PowerPlatformProjectData,
  ProjectRecord,
  ProjectType,
  SelectableCanvasDataSourceType
} from "../types/project";

type AnyPowerPlatformType = ProjectType | "";

function cloneDeep<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

const VALID_CONNECTOR_CLASSIFICATIONS: readonly ConnectorClassification[] = [
  "standard",
  "premium",
  "custom",
  "unknown",
  "notApplicable"
];

const VALID_CANVAS_DATA_SOURCE_TYPES: readonly CanvasDataSourceType[] = [
  "sharePointList",
  "sharePointLibrary",
  "microsoftList",
  "dataverse",
  "excel",
  "sqlServer",
  "microsoft365Connector",
  "customConnector",
  "externalApi",
  "otherConnector",
  "multiple",
  "undecided"
];

const SELECTABLE_CANVAS_DATA_SOURCE_TYPES: readonly SelectableCanvasDataSourceType[] = [
  "sharePointList",
  "sharePointLibrary",
  "microsoftList",
  "dataverse",
  "excel",
  "sqlServer",
  "microsoft365Connector",
  "customConnector",
  "externalApi",
  "otherConnector"
];

const VALID_DECISION_STATUSES: readonly PowerPlatformDecisionStatus[] = [
  "notStarted",
  "missingInformation",
  "reviewNeeded",
  "confirmed",
  "blocked",
  "notApplicable"
];

const LEGACY_POSITIVE_STATUSES = new Set(["confirmed", "approved", "available", "yes", "complete", "validated"]);

const VALID_GATE_STATUSES: readonly PowerPlatformGateStatus[] = [
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

const VALID_CONNECTOR_OPERATIONS: readonly ConnectorOperation[] = [
  "read",
  "create",
  "update",
  "delete",
  "archive",
  "restore",
  "upload",
  "download"
];

const VALID_CANVAS_SUBTYPES: readonly PowerAppsCanvasSubtype[] = [
  "blankResponsive",
  "tablet",
  "phone",
  "sharePointCustomized",
  "teamsEmbedded",
  "sharePointOnline",
  "microsoftLists",
  "dataverse",
  "otherConnector",
  "multipleDataSources",
  "customPage",
  "other"
];

const VALID_MODEL_DRIVEN_SUBTYPES: readonly PowerAppsModelDrivenSubtype[] = [
  "standardBusiness",
  "departmental",
  "caseManagement",
  "requestManagement",
  "assetInventory",
  "projectTracking",
  "complianceAudit",
  "customPages",
  "powerAutomate",
  "pcf",
  "pluginsCustomApis",
  "other"
];

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeStringValues<T extends object>(
  defaults: T,
  value: Record<string, unknown>
): Partial<T> {
  return Object.fromEntries(
    Object.entries(defaults).flatMap(([key, defaultValue]) =>
      typeof defaultValue === "string" ? [[key, asString(value[key])]] : []
    )
  ) as Partial<T>;
}

function toGateStatus(value: unknown): PowerPlatformGateStatus {
  return VALID_GATE_STATUSES.includes(value as PowerPlatformGateStatus)
    ? value as PowerPlatformGateStatus
    : "notStarted";
}

function toDecisionStatus(value: unknown, fallback: PowerPlatformDecisionStatus = "missingInformation"): PowerPlatformDecisionStatus {
  if (VALID_DECISION_STATUSES.includes(value as PowerPlatformDecisionStatus)) {
    return value as PowerPlatformDecisionStatus;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (LEGACY_POSITIVE_STATUSES.has(normalized)) return "confirmed";
    if (normalized === "not applicable" || normalized === "notapplicable") return "notApplicable";
    if (normalized === "blocked") return "blocked";
    if (normalized === "reviewneeded" || normalized === "needs review" || normalized === "pending") return "reviewNeeded";
    if (normalized === "notstarted" || normalized === "not started") return "notStarted";
  }
  return fallback;
}

function toConnectorApprovalConfirmationStatus(value: unknown, legacyNotes: unknown): PowerPlatformDecisionStatus {
  if (VALID_DECISION_STATUSES.includes(value as PowerPlatformDecisionStatus)) {
    return value as PowerPlatformDecisionStatus;
  }
  const normalizedNotes = typeof legacyNotes === "string" ? legacyNotes.trim().toLowerCase() : "";
  return normalizedNotes === "approved" || normalizedNotes === "confirmed" ? "confirmed" : "missingInformation";
}

function isSelectableCanvasDataSourceType(value: unknown): value is SelectableCanvasDataSourceType {
  return SELECTABLE_CANVAS_DATA_SOURCE_TYPES.includes(value as SelectableCanvasDataSourceType);
}

function normalizeSelectedDataSourceTypes(value: unknown): SelectableCanvasDataSourceType[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isSelectableCanvasDataSourceType))];
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultConnector(overrides: Partial<PowerPlatformConnector> = {}): PowerPlatformConnector {
  return {
    id: overrides.id ?? "",
    displayName: overrides.displayName ?? "",
    purpose: overrides.purpose ?? "",
    dataSourceName: overrides.dataSourceName ?? "",
    dataSourceType: overrides.dataSourceType ?? "",
    canvasRole: overrides.canvasRole ?? "",
    connectorClassification: VALID_CONNECTOR_CLASSIFICATIONS.includes(overrides.connectorClassification as ConnectorClassification)
      ? overrides.connectorClassification as ConnectorClassification
      : "unknown",
    classificationConfirmed: overrides.classificationConfirmed === true,
    classificationConfirmationStatus: toDecisionStatus(overrides.classificationConfirmationStatus, overrides.classificationConfirmed ? "confirmed" : "missingInformation"),
    licenceRequirement: overrides.licenceRequirement ?? "",
    licensingConfirmed: overrides.licensingConfirmed === true,
    licensingConfirmationStatus: toDecisionStatus(overrides.licensingConfirmationStatus, overrides.licensingConfirmed ? "confirmed" : "missingInformation"),
    authenticationMethod: overrides.authenticationMethod ?? "",
    gatewayRequirement: overrides.gatewayRequirement ?? "",
    environmentRequirement: overrides.environmentRequirement ?? "",
    dlpImpact: overrides.dlpImpact ?? "",
    delegationSupport: overrides.delegationSupport ?? "",
    expectedRecordVolume: overrides.expectedRecordVolume ?? "",
    supportedOperations: VALID_CONNECTOR_OPERATIONS.reduce((acc, operation) => {
      acc[operation] = overrides.supportedOperations?.[operation] === true;
      return acc;
    }, {} as Partial<Record<ConnectorOperation, boolean>>),
    offlineSupport: overrides.offlineSupport ?? "",
    securityNotes: overrides.securityNotes ?? "",
    limitations: overrides.limitations ?? "",
    approvalStatus: overrides.approvalStatus ?? "",
    approvalConfirmationStatus: toDecisionStatus(overrides.approvalConfirmationStatus)
  };
}

function createDefaultCommonData(): PowerPlatformCommonData {
  return {
    appSubtype: "",
    tenant: "",
    environment: "",
    environmentType: "",
    developmentEnvironment: "",
    testEnvironment: "",
    productionEnvironment: "",
    environmentAccessStatus: "missingInformation",
    securityReviewStatus: "missingInformation",
    testingPlanConfirmationStatus: "missingInformation",
    almConfirmationStatus: "missingInformation",
    environmentCreationResponsibility: "",
    managedEnvironmentRequirement: "",
    dlpPolicyRequirements: "",
    administrativeLimitations: "",
    businessOwner: "",
    appOwner: "",
    technicalOwner: "",
    supportOwner: "",
    expectedUserCount: "",
    existingLicences: "",
    currentPowerAppsLicences: "",
    currentPowerAutomateLicences: "",
    dataverseAvailability: "missingInformation",
    premiumConnectorAvailability: "missingInformation",
    customConnectorAvailability: "missingInformation",
    powerBiLicensing: "",
    pcfRequirements: "",
    licensingBudgetConstraints: "",
    licensingStatus: "",
    licensingAssumptions: "",
    outstandingLicensingDecisions: "",
    licensingConfirmationStatus: "missingInformation",
    solutionAware: "",
    solutionName: "",
    solutionUniqueName: "",
    publisherName: "",
    publisherPrefix: "",
    sourceControlApproach: "",
    gitIntegration: "",
    powerPlatformCliAvailability: "",
    almApproach: "",
    deploymentMethod: "",
    deploymentResponsibility: "",
    deploymentStrategy: "",
    environmentVariables: "",
    connectionReferences: "",
    pipelineRequirements: "",
    rollbackExpectations: "",
    releaseApprovalResponsibility: "",
    authenticationRequirements: "",
    authorizationRequirements: "",
    roleBasedInterfaceExpectations: "",
    accessibilityRequirements: "",
    complianceRequirements: "",
    dataClassification: "",
    dataRetentionRequirements: "",
    auditRequirements: "",
    recordAccessRules: "",
    loggingRequirements: "",
    privacyRequirements: "",
    keyboardNavigationRequirements: "",
    screenReaderRequirements: "",
    accessibleLabelRequirements: "",
    focusOrderRequirements: "",
    colourContrastRequirements: "",
    errorMessageRequirements: "",
    responsiveTextRequirements: "",
    mobileAccessibilityRequirements: "",
    knownAccommodations: "",
    functionalTesting: "",
    connectorTesting: "",
    permissionTesting: "",
    securityTesting: "",
    accessibilityTesting: "",
    performanceTesting: "",
    volumeTesting: "",
    integrationTesting: "",
    regressionTesting: "",
    userAcceptanceTesting: "",
    deploymentTesting: "",
    productionSmokeTesting: "",
    connectors: []
  };
}

export function createDefaultSharePointList(overrides: Partial<PowerPlatformCanvasData["sharePointListSchemas"][number]> = {}) {
  return {
    id: overrides.id ?? createId("sp-list"),
    displayName: overrides.displayName ?? "",
    purpose: overrides.purpose ?? "",
    expectedRecordCount: overrides.expectedRecordCount ?? "",
    attachmentsEnabled: overrides.attachmentsEnabled ?? "",
    versioningExpectation: overrides.versioningExpectation ?? "",
    permissionExpectation: overrides.permissionExpectation ?? "",
    recordStatusModel: overrides.recordStatusModel ?? "",
    archiveBehavior: overrides.archiveBehavior ?? "",
    restoreBehavior: overrides.restoreBehavior ?? "",
    confirmationStatus: toDecisionStatus(overrides.confirmationStatus),
    confirmationSource: overrides.confirmationSource ?? ""
  };
}

export function createDefaultSharePointColumn(overrides: Partial<PowerPlatformCanvasData["sharePointColumnSchemas"][number]> = {}) {
  return {
    id: overrides.id ?? createId("sp-column"),
    parentType: overrides.parentType ?? "",
    parentId: overrides.parentId ?? "",
    displayName: overrides.displayName ?? "",
    internalName: overrides.internalName ?? "",
    columnType: overrides.columnType ?? "",
    requiredStatus: overrides.requiredStatus ?? "",
    defaultValue: overrides.defaultValue ?? "",
    choiceValues: overrides.choiceValues ?? "",
    lookupList: overrides.lookupList ?? "",
    lookupColumn: overrides.lookupColumn ?? "",
    personFieldBehavior: overrides.personFieldBehavior ?? "",
    dateTimeBehavior: overrides.dateTimeBehavior ?? "",
    indexedStatus: overrides.indexedStatus ?? "",
    uniqueValueStatus: overrides.uniqueValueStatus ?? "",
    sensitiveDataStatus: overrides.sensitiveDataStatus ?? "",
    notes: overrides.notes ?? "",
    confirmationStatus: toDecisionStatus(overrides.confirmationStatus),
    confirmationSource: overrides.confirmationSource ?? ""
  };
}

export function createDefaultSharePointLibrary(overrides: Partial<PowerPlatformCanvasData["sharePointLibrarySchemas"][number]> = {}) {
  return {
    id: overrides.id ?? createId("sp-library"),
    displayName: overrides.displayName ?? "",
    purpose: overrides.purpose ?? "",
    folderStructure: overrides.folderStructure ?? "",
    contentTypes: overrides.contentTypes ?? "",
    fileTypes: overrides.fileTypes ?? "",
    fileSizeExpectations: overrides.fileSizeExpectations ?? "",
    uploadBehavior: overrides.uploadBehavior ?? "",
    downloadBehavior: overrides.downloadBehavior ?? "",
    versioning: overrides.versioning ?? "",
    permissions: overrides.permissions ?? "",
    retention: overrides.retention ?? "",
    metadataColumnIds: Array.isArray(overrides.metadataColumnIds) ? overrides.metadataColumnIds : [],
    confirmationStatus: toDecisionStatus(overrides.confirmationStatus),
    confirmationSource: overrides.confirmationSource ?? ""
  };
}

export function createDefaultDataverseTable(overrides: Partial<PowerPlatformCanvasData["dataverseTableSchemas"][number]> = {}) {
  return {
    id: overrides.id ?? createId("dv-table"),
    displayName: overrides.displayName ?? "",
    pluralDisplayName: overrides.pluralDisplayName ?? "",
    logicalName: overrides.logicalName ?? "",
    schemaName: overrides.schemaName ?? "",
    ownershipType: overrides.ownershipType ?? "",
    primaryNameColumn: overrides.primaryNameColumn ?? "",
    purpose: overrides.purpose ?? "",
    expectedRecordCount: overrides.expectedRecordCount ?? "",
    auditStatus: overrides.auditStatus ?? "",
    searchRequirement: overrides.searchRequirement ?? "",
    securityNotes: overrides.securityNotes ?? "",
    confirmationStatus: toDecisionStatus(overrides.confirmationStatus),
    confirmationSource: overrides.confirmationSource ?? ""
  };
}

export function createDefaultDataverseColumn(overrides: Partial<PowerPlatformCanvasData["dataverseColumnSchemas"][number]> = {}) {
  return {
    id: overrides.id ?? createId("dv-column"),
    tableId: overrides.tableId ?? "",
    displayName: overrides.displayName ?? "",
    logicalName: overrides.logicalName ?? "",
    schemaName: overrides.schemaName ?? "",
    dataType: overrides.dataType ?? "",
    requiredLevel: overrides.requiredLevel ?? "",
    defaultValue: overrides.defaultValue ?? "",
    choiceDefinition: overrides.choiceDefinition ?? "",
    lookupTarget: overrides.lookupTarget ?? "",
    calculatedColumnRequirement: overrides.calculatedColumnRequirement ?? "",
    formulaColumnRequirement: overrides.formulaColumnRequirement ?? "",
    rollupColumnRequirement: overrides.rollupColumnRequirement ?? "",
    auditStatus: overrides.auditStatus ?? "",
    sensitiveDataStatus: overrides.sensitiveDataStatus ?? "",
    confirmationStatus: toDecisionStatus(overrides.confirmationStatus),
    confirmationSource: overrides.confirmationSource ?? ""
  };
}

export function createDefaultDataverseRelationship(overrides: Partial<PowerPlatformCanvasData["dataverseRelationshipSchemas"][number]> = {}) {
  return {
    id: overrides.id ?? createId("dv-relationship"),
    relationshipType: overrides.relationshipType ?? "",
    parentTableId: overrides.parentTableId ?? "",
    childTableId: overrides.childTableId ?? "",
    parentTable: overrides.parentTable ?? "",
    childTable: overrides.childTable ?? "",
    relationshipSchemaName: overrides.relationshipSchemaName ?? "",
    requiredStatus: overrides.requiredStatus ?? "",
    referentialBehavior: overrides.referentialBehavior ?? "",
    cascadeBehavior: overrides.cascadeBehavior ?? "",
    navigationBehavior: overrides.navigationBehavior ?? "",
    confirmationStatus: toDecisionStatus(overrides.confirmationStatus),
    confirmationSource: overrides.confirmationSource ?? ""
  };
}

export function createDefaultConnectorResource(overrides: Partial<PowerPlatformCanvasData["connectorResourceSchemas"][number]> = {}) {
  return {
    id: overrides.id ?? createId("connector-resource"),
    connectorId: overrides.connectorId ?? "",
    resourceName: overrides.resourceName ?? "",
    resourceType: overrides.resourceType ?? "",
    purpose: overrides.purpose ?? "",
    keyOrIdentifier: overrides.keyOrIdentifier ?? "",
    authenticationRequirement: overrides.authenticationRequirement ?? "",
    queryLimitations: overrides.queryLimitations ?? "",
    pagination: overrides.pagination ?? "",
    throttling: overrides.throttling ?? "",
    gatewayRequirement: overrides.gatewayRequirement ?? "",
    confirmationStatus: toDecisionStatus(overrides.confirmationStatus),
    confirmationSource: overrides.confirmationSource ?? ""
  };
}

export function createDefaultConnectorField(overrides: Partial<PowerPlatformCanvasData["connectorFieldSchemas"][number]> = {}) {
  return {
    id: overrides.id ?? createId("connector-field"),
    connectorId: overrides.connectorId ?? "",
    resourceId: overrides.resourceId ?? "",
    displayName: overrides.displayName ?? "",
    fieldIdentifier: overrides.fieldIdentifier ?? "",
    fieldType: overrides.fieldType ?? "",
    requiredStatus: overrides.requiredStatus ?? "",
    keyStatus: overrides.keyStatus ?? "",
    relationship: overrides.relationship ?? "",
    readBehavior: overrides.readBehavior ?? "",
    createBehavior: overrides.createBehavior ?? "",
    updateBehavior: overrides.updateBehavior ?? "",
    deleteBehavior: overrides.deleteBehavior ?? "",
    confirmationStatus: toDecisionStatus(overrides.confirmationStatus),
    confirmationSource: overrides.confirmationSource ?? ""
  };
}

export function createApplicabilityDecision(overrides: Partial<PowerPlatformApplicabilityDecision> = {}): PowerPlatformApplicabilityDecision {
  return {
    status: overrides.status === "required" || overrides.status === "notApplicable" || overrides.status === "undecided"
      ? overrides.status
      : "undecided",
    details: overrides.details ?? "",
    notApplicableReason: overrides.notApplicableReason ?? "",
    confirmationStatus: toDecisionStatus(overrides.confirmationStatus)
  };
}

function createDefaultProgress() {
  return {
    connectorSelection: "notStarted" as const,
    connectorClassification: "notStarted" as const,
    licensing: "notStarted" as const,
    environment: "notStarted" as const,
    schema: "notStarted" as const,
    nameConfirmation: "notStarted" as const,
    securityReview: "notStarted" as const,
    testing: "notStarted" as const,
    manualImplementation: "notStarted" as const,
    deployment: "notStarted" as const,
    canvas: {
      sharePointSchema: "notStarted" as const,
      dataverseSchema: "notStarted" as const,
      connectorSchema: "notStarted" as const,
      internalNames: "notStarted" as const,
      logicalNames: "notStarted" as const,
      powerFx: "notStarted" as const,
      yaml: "notStarted" as const,
      delegation: "notStarted" as const,
      studioValidation: "notStarted" as const,
      publication: "notStarted" as const
    },
    modelDriven: {
      dataverseAvailability: "notStarted" as const,
      modelDrivenLicensing: "notStarted" as const,
      publisher: "notStarted" as const,
      dataverseSchema: "notStarted" as const,
      logicalNames: "notStarted" as const,
      solutionArchitecture: "notStarted" as const,
      solutionComponents: "notStarted" as const,
      securityRoles: "notStarted" as const,
      automation: "notStarted" as const,
      extensions: "notStarted" as const,
      sourceAvailability: "notStarted" as const,
      solutionValidation: "notStarted" as const,
      solutionImport: "notStarted" as const,
      publication: "notStarted" as const
    }
  };
}

function createDefaultCanvasData(): PowerPlatformCanvasData {
  return {
    subtype: "",
    responsiveMode: "",
    targetDevices: "",
    targetScreenSizes: "",
    orientation: "",
    supportedBrowsers: "",
    teamsEmbedding: "",
    controlGeneration: "",
    componentLibraryRequirement: "",
    customPageRequirement: "",
    mobileDeviceCapabilities: "",
    primaryDataSourceType: "undecided" as CanvasDataSourceType,
    selectedDataSourceTypes: [] as SelectableCanvasDataSourceType[],
    primaryConnectorId: "",
    secondaryConnectorIds: [] as string[],
    secondaryDataSourceDetails: "",
    sourcePurpose: "",
    sourceOwnership: "",
    readWriteResponsibilities: "",
    synchronizationExpectations: "",
    conflictHandling: "",
    sourceOfTruthDecision: "",
    sharePointSiteUrl: "",
    sharePointSiteTitle: "",
    sharePointSiteOwner: "",
    sharePointEnvironment: "",
    sharePointAccessStatus: "",
    sharePointListDefinitions: "",
    sharePointColumnDefinitions: "",
    sharePointLibraryDefinitions: "",
    sharePointListSchemas: [],
    sharePointColumnSchemas: [],
    sharePointLibrarySchemas: [],
    dataverseEnvironment: "",
    dataverseSolution: "",
    dataverseSolutionUniqueName: "",
    dataversePublisher: "",
    dataversePublisherPrefix: "",
    dataverseTableDefinitions: "",
    dataverseColumnDefinitions: "",
    dataverseRelationshipDefinitions: "",
    dataverseSchemaConfirmationStatus: "missingInformation",
    dataverseTableSchemas: [],
    dataverseColumnSchemas: [],
    dataverseRelationshipSchemas: [],
    otherConnectorSchemaDefinitions: "",
    otherConnectorFieldDefinitions: "",
    otherConnectorConfirmationSource: "",
    otherConnectorSchemaConfirmationStatus: "missingInformation",
    connectorResourceSchemas: [],
    connectorFieldSchemas: [],
    sharePointSites: "",
    sharePointLists: "",
    sharePointLibraries: "",
    dataverseTables: "",
    otherDataSources: "",
    expectedRecordCounts: "",
    offlineRequirements: "",
    synchronizationRequirements: "",
    attachmentRequirements: "",
    fileRequirements: "",
    screens: "",
    screenNames: "",
    screenPurposes: "",
    entryPoints: "",
    exitPoints: "",
    navigationStructure: "",
    canvasUserRoles: "",
    containers: "",
    components: "",
    galleries: "",
    forms: "",
    tables: "",
    dialogs: "",
    loadingStates: "",
    emptyStates: "",
    errorStates: "",
    responsiveRules: "",
    visibilityRules: "",
    displayModeRules: "",
    controls: "",
    appFormulasRequirements: "",
    startScreenRequirements: "",
    onStartRequirements: "",
    namedFormulaRequirements: "",
    globalVariableRequirements: "",
    contextVariableRequirements: "",
    collectionRequirements: "",
    createBehavior: "",
    readBehavior: "",
    updateBehavior: "",
    archiveBehavior: "",
    restoreBehavior: "",
    deleteRestrictions: "",
    validationRequirements: "",
    errorHandlingRequirements: "",
    notificationRequirements: "",
    searchRequirements: "",
    filteringRequirements: "",
    sortingRequirements: "",
    delegationRequirements: "",
    concurrentUpdateHandling: "",
    fullScreenYamlRequired: "",
    controlLevelYamlRequired: "",
    containerYamlRequired: "",
    componentYamlRequired: "",
    paYamlSourceRequired: "",
    expectedInstallationMethod: "",
    codeViewPasteMethod: "",
    existingSourceAvailability: "",
    existingAppDependencies: "",
    postPasteActions: "",
    validationResponsibility: "",
    namedFormulas: "",
    globalVariables: "",
    contextVariables: "",
    collections: "",
    schemaStatus: "missingInformation",
    internalNameStatus: "missingInformation",
    logicalNameStatus: "missingInformation",
    powerFxStatus: "notStarted",
    yamlStatus: "notStarted",
    delegationStatus: "notStarted",
    manualInstallationStatus: "",
    studioValidationStatus: "",
    publicationStatus: "",
    deploymentStatus: ""
  };
}

function createDefaultModelDrivenData(): PowerPlatformModelDrivenData {
  return {
    subtype: "",
    dataverseAvailability: "missingInformation",
    modelDrivenLicensingStatus: "missingInformation",
    environmentAccessStatus: "missingInformation",
    solutionPermissionStatus: "missingInformation",
    tableCreationPermissionStatus: "missingInformation",
    securityRoleConfigurationPermissionStatus: "missingInformation",
    importPermissionStatus: "missingInformation",
    deploymentPermissionStatus: "missingInformation",
    managedStrategy: "",
    existingSolution: "",
    existingDataverseTables: "",
    newDataverseTables: "",
    standardTablesReused: "",
    activityTableRequirements: "",
    virtualTableRequirements: "",
    duplicateDetection: "",
    dataMigration: "",
    solutionArchitecture: "",
    tables: "",
    columns: "",
    relationships: "",
    choices: "",
    tableDefinitions: "",
    columnDefinitions: "",
    relationshipDefinitions: "",
    forms: "",
    views: "",
    formDefinitions: "",
    viewDefinitions: "",
    charts: "",
    dashboards: "",
    appPages: "",
    chartsDecision: createApplicabilityDecision(),
    dashboardsDecision: createApplicabilityDecision(),
    appPagesDecision: createApplicabilityDecision(),
    formsAndViewsStatus: "missingInformation",
    navigation: "",
    navigationDefinitions: "",
    navigationStatus: "missingInformation",
    customPages: "",
    customPagesDecision: createApplicabilityDecision(),
    businessRules: "",
    businessRulesDecision: createApplicabilityDecision(),
    validationRulesDecision: createApplicabilityDecision(),
    duplicatePreventionDecision: createApplicabilityDecision(),
    businessProcessFlows: "",
    businessProcessFlowsDecision: createApplicabilityDecision(),
    automations: "",
    automationsDecision: createApplicabilityDecision(),
    businessLogicStatus: "missingInformation",
    securityRoles: "",
    teams: "",
    fieldSecurityProfiles: "",
    teamModelDecision: createApplicabilityDecision(),
    hierarchySecurityDecision: createApplicabilityDecision(),
    fieldSecurityDecision: createApplicabilityDecision(),
    applicationUsersDecision: createApplicabilityDecision(),
    servicePrincipalsDecision: createApplicabilityDecision(),
    environmentVariables: "",
    connectionReferences: "",
    clientSideJavaScript: "",
    clientSideJavaScriptDecision: createApplicabilityDecision(),
    webResources: "",
    webResourcesDecision: createApplicabilityDecision(),
    htmlWebResourcesDecision: createApplicabilityDecision(),
    imageWebResourcesDecision: createApplicabilityDecision(),
    plugins: "",
    pluginsDecision: createApplicabilityDecision(),
    customWorkflowActivitiesDecision: createApplicabilityDecision(),
    customApis: "",
    customApisDecision: createApplicabilityDecision(),
    pcfControls: "",
    pcfControlsDecision: createApplicabilityDecision(),
    commandBarRules: "",
    commandBarRulesDecision: createApplicabilityDecision(),
    azureIntegrationsDecision: createApplicabilityDecision(),
    extensionsStatus: "missingInformation",
    validationRules: "",
    duplicatePrevention: "",
    businessUnits: "",
    ownerTeams: "",
    accessTeams: "",
    tablePrivileges: "",
    privilegeDepth: "",
    hierarchySecurity: "",
    sharingExpectations: "",
    recordOwnership: "",
    sensitiveFields: "",
    applicationUsers: "",
    servicePrincipals: "",
    htmlWebResources: "",
    imageWebResources: "",
    customWorkflowActivities: "",
    azureIntegrations: "",
    externalServices: "",
    externalServicesDecision: createApplicabilityDecision(),
    schemaStatus: "missingInformation",
    logicalNameStatus: "missingInformation",
    solutionArchitectureStatus: "missingInformation",
    solutionSourceStatus: "",
    securityReviewStatus: "missingInformation",
    dataverseSchemaConfirmationStatus: "missingInformation",
    solutionArchitectureConfirmationStatus: "missingInformation",
    securityArchitectureStatus: "missingInformation",
    almReadinessStatus: "missingInformation",
    manualConfigurationStatus: "",
    testingStatus: "",
    importStatus: "",
    publicationStatus: "",
    deploymentStatus: "",
    dataverseTableSchemas: [],
    dataverseColumnSchemas: [],
    dataverseRelationshipSchemas: []
  };
}

export function isCanvasProject(project: Pick<ProjectRecord, "intake">): boolean {
  return project.intake.appType === "powerAppsCanvas";
}

export function isModelDrivenProject(project: Pick<ProjectRecord, "intake">): boolean {
  return project.intake.appType === "powerAppsModelDriven";
}

export function isLegacyMicrosoftProject(project: Pick<ProjectRecord, "intake">): boolean {
  return project.intake.appType === "microsoft365";
}

function toCanvasDataSourceType(value: unknown): CanvasDataSourceType {
  return VALID_CANVAS_DATA_SOURCE_TYPES.includes(value as CanvasDataSourceType)
    ? value as CanvasDataSourceType
    : "undecided";
}

function isPowerPlatformType(projectType: AnyPowerPlatformType): projectType is "powerAppsCanvas" | "powerAppsModelDriven" | "microsoft365" {
  return projectType === "powerAppsCanvas" || projectType === "powerAppsModelDriven" || projectType === "microsoft365";
}

function hasAnyValue(values: Array<unknown>): boolean {
  return values.some((value) => typeof value === "string" ? value.trim().length > 0 : Boolean(value));
}

function resetPowerPlatformProgressForDuplicate(data: PowerPlatformProjectData): PowerPlatformProjectData {
  const cloned = cloneDeep(data);
  const hasConnectors = cloned.common.connectors.length > 0;
  const hasLicensingInfo = hasAnyValue([
    cloned.common.existingLicences,
    cloned.common.licensingStatus,
    cloned.common.licensingAssumptions,
    cloned.common.outstandingLicensingDecisions,
    cloned.common.expectedUserCount
  ]);
  const hasEnvironmentInfo = hasAnyValue([
    cloned.common.tenant,
    cloned.common.environment,
    cloned.common.environmentType,
    cloned.common.developmentEnvironment,
    cloned.common.testEnvironment,
    cloned.common.productionEnvironment
  ]);
  const hasSchemaInfo = hasAnyValue([
    cloned.canvas?.sharePointLists,
    cloned.canvas?.sharePointLibraries,
    cloned.canvas?.dataverseTables,
    cloned.canvas?.otherDataSources,
    cloned.modelDriven?.tables,
    cloned.modelDriven?.columns,
    cloned.modelDriven?.relationships,
    cloned.modelDriven?.choices
  ]);
  const hasNameInfo = hasAnyValue([
    cloned.common.solutionName,
    cloned.common.solutionUniqueName,
    cloned.common.publisherName,
    cloned.common.publisherPrefix,
    cloned.canvas?.internalNameStatus,
    cloned.canvas?.logicalNameStatus,
    cloned.modelDriven?.logicalNameStatus
  ]);

  cloned.progress.connectorSelection = hasConnectors ? "reviewNeeded" : "notStarted";
  cloned.progress.connectorClassification = hasConnectors ? "reviewNeeded" : "notStarted";
  cloned.progress.licensing = hasLicensingInfo ? "reviewNeeded" : "notStarted";
  cloned.progress.environment = hasEnvironmentInfo ? "reviewNeeded" : "notStarted";
  cloned.progress.schema = hasSchemaInfo ? "reviewNeeded" : "notStarted";
  cloned.progress.nameConfirmation = hasNameInfo ? "reviewNeeded" : "notStarted";
  cloned.progress.securityReview = "notStarted";
  cloned.progress.testing = "notStarted";
  cloned.progress.manualImplementation = "notStarted";
  cloned.progress.deployment = "notStarted";

  cloned.progress.canvas.sharePointSchema = hasAnyValue([cloned.canvas?.sharePointLists, cloned.canvas?.sharePointLibraries])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.canvas.dataverseSchema = hasAnyValue([cloned.canvas?.dataverseTables])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.canvas.connectorSchema = hasAnyValue([cloned.canvas?.otherDataSources])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.canvas.internalNames = hasAnyValue([cloned.canvas?.internalNameStatus])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.canvas.logicalNames = hasAnyValue([cloned.canvas?.logicalNameStatus])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.canvas.powerFx = "notStarted";
  cloned.progress.canvas.yaml = "notStarted";
  cloned.progress.canvas.delegation = "notStarted";
  cloned.progress.canvas.studioValidation = "notStarted";
  cloned.progress.canvas.publication = "notStarted";

  cloned.progress.modelDriven.dataverseAvailability = hasAnyValue([cloned.modelDriven?.dataverseAvailability])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.modelDrivenLicensing = hasAnyValue([cloned.modelDriven?.modelDrivenLicensingStatus])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.publisher = hasAnyValue([cloned.common.publisherName, cloned.common.publisherPrefix])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.dataverseSchema = hasAnyValue([cloned.modelDriven?.tables, cloned.modelDriven?.columns, cloned.modelDriven?.relationships])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.logicalNames = hasAnyValue([cloned.modelDriven?.logicalNameStatus])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.solutionArchitecture = hasAnyValue([cloned.modelDriven?.solutionArchitecture])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.securityRoles = hasAnyValue([cloned.modelDriven?.securityRoles])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.automation = hasAnyValue([cloned.modelDriven?.automations])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.extensions = hasAnyValue([cloned.modelDriven?.plugins, cloned.modelDriven?.customApis, cloned.modelDriven?.pcfControls, cloned.modelDriven?.webResources])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.sourceAvailability = hasAnyValue([cloned.modelDriven?.solutionSourceStatus])
    ? "reviewNeeded"
    : "notStarted";
  cloned.progress.modelDriven.solutionComponents = "notStarted";
  cloned.progress.modelDriven.solutionValidation = "notStarted";
  cloned.progress.modelDriven.solutionImport = "notStarted";
  cloned.progress.modelDriven.publication = "notStarted";

  if (cloned.canvas) {
    cloned.canvas.powerFxStatus = "notStarted";
    cloned.canvas.yamlStatus = "notStarted";
    cloned.canvas.delegationStatus = "notStarted";
    cloned.canvas.manualInstallationStatus = "";
    cloned.canvas.studioValidationStatus = "";
    cloned.canvas.publicationStatus = "";
    cloned.canvas.deploymentStatus = "";
  }
  if (cloned.modelDriven) {
    cloned.modelDriven.manualConfigurationStatus = "";
    cloned.modelDriven.testingStatus = "";
    cloned.modelDriven.importStatus = "";
    cloned.modelDriven.publicationStatus = "";
    cloned.modelDriven.deploymentStatus = "";
    cloned.modelDriven.solutionSourceStatus = "";
  }

  return cloned;
}

function mergeCommonData(
  current: PowerPlatformProjectData | undefined,
  projectType: AnyPowerPlatformType
): PowerPlatformProjectData["common"] {
  const defaults = createDefaultPowerPlatformData(projectType);
  if (!defaults) return createDefaultPowerPlatformData("microsoft365")!.common;
  return {
    ...defaults.common,
    ...(current?.common ? cloneDeep(current.common) : {})
  };
}

export function reconcilePowerPlatformForProjectType(
  currentPowerPlatform: PowerPlatformProjectData | undefined,
  previousProjectType: AnyPowerPlatformType,
  nextProjectType: AnyPowerPlatformType
): PowerPlatformProjectData | undefined {
  if (!isPowerPlatformType(nextProjectType)) return undefined;
  if (nextProjectType === previousProjectType) {
    return normalizePowerPlatformData(currentPowerPlatform, nextProjectType);
  }

  const base = createDefaultPowerPlatformData(nextProjectType);
  if (!base) return undefined;

  base.common = mergeCommonData(currentPowerPlatform, nextProjectType);

  if (nextProjectType === "powerAppsCanvas") {
    base.canvas = {
      ...base.canvas!,
      primaryDataSourceType: "undecided"
    };
    base.modelDriven = undefined;
  } else if (nextProjectType === "powerAppsModelDriven") {
    base.modelDriven = {
      ...base.modelDriven!,
      dataverseAvailability: "missingInformation",
      modelDrivenLicensingStatus: "missingInformation"
    };
    base.canvas = undefined;
  } else {
    base.canvas = undefined;
    base.modelDriven = undefined;
  }

  return normalizePowerPlatformData(base, nextProjectType);
}

export function duplicatePowerPlatformForProject(
  sourcePowerPlatform: PowerPlatformProjectData | undefined,
  projectType: AnyPowerPlatformType
): PowerPlatformProjectData | undefined {
  const normalized = normalizePowerPlatformData(sourcePowerPlatform, projectType);
  if (!normalized) return undefined;
  return resetPowerPlatformProgressForDuplicate(normalized);
}

export function getSelectedCanvasDataSourceTypes(project: ProjectRecord): SelectableCanvasDataSourceType[] {
  const selected = new Set<SelectableCanvasDataSourceType>();
  const canvas = project.powerPlatform?.canvas;
  const connectors = project.powerPlatform?.common.connectors ?? [];
  if (!canvas) return [];

  if (canvas.primaryDataSourceType === "multiple") {
    for (const sourceType of canvas.selectedDataSourceTypes) selected.add(sourceType);
  } else if (isSelectableCanvasDataSourceType(canvas.primaryDataSourceType)) {
    selected.add(canvas.primaryDataSourceType);
  }

  for (const connectorId of canvas.secondaryConnectorIds) {
    const connector = connectors.find((candidate) => candidate.id === connectorId);
    if (!connector) continue;
    if (isSelectableCanvasDataSourceType(connector.dataSourceType)) selected.add(connector.dataSourceType);
  }

  return [...selected];
}

export function formatPowerPlatformGateStatus(status: PowerPlatformGateStatus | PowerPlatformDecisionStatus): string {
  const labels: Record<string, string> = {
    notStarted: "Not started",
    missingInformation: "Missing information",
    blocked: "Blocked",
    reviewNeeded: "Review needed",
    confirmed: "Confirmed",
    ready: "Ready",
    inProgress: "In progress",
    manualValidationRequired: "Manual validation required",
    passed: "Passed",
    failed: "Failed",
    notApplicable: "Not applicable"
  };
  return labels[status] ?? status;
}

export function formatCanvasDataSourceType(sourceType: SelectableCanvasDataSourceType): string {
  const labels: Record<SelectableCanvasDataSourceType, string> = {
    sharePointList: "SharePoint list",
    sharePointLibrary: "SharePoint document library",
    microsoftList: "Microsoft List",
    dataverse: "Dataverse",
    excel: "Excel",
    sqlServer: "SQL Server",
    microsoft365Connector: "Microsoft 365 connector",
    customConnector: "Custom connector",
    externalApi: "External API",
    otherConnector: "Other connector"
  };
  return labels[sourceType];
}

function selectedCanvasDataSourceTypes(project: ProjectRecord): Set<SelectableCanvasDataSourceType> {
  return new Set(getSelectedCanvasDataSourceTypes(project));
}

export function usesSharePoint(project: ProjectRecord): boolean {
  const selected = selectedCanvasDataSourceTypes(project);
  return selected.has("sharePointList") || selected.has("sharePointLibrary") || selected.has("microsoftList");
}

export function usesDataverse(project: ProjectRecord): boolean {
  if (isModelDrivenProject(project)) return true;
  return selectedCanvasDataSourceTypes(project).has("dataverse");
}

export function usesOtherConnector(project: ProjectRecord): boolean {
  const selected = selectedCanvasDataSourceTypes(project);
  return selected.has("excel")
    || selected.has("sqlServer")
    || selected.has("microsoft365Connector")
    || selected.has("otherConnector")
    || selected.has("customConnector")
    || selected.has("externalApi");
}

export function usesMultipleDataSources(project: ProjectRecord): boolean {
  const selected = selectedCanvasDataSourceTypes(project);
  return project.powerPlatform?.canvas?.primaryDataSourceType === "multiple" || selected.size > 1;
}

export function requiresInternalColumnNames(project: ProjectRecord): boolean {
  return usesSharePoint(project);
}

export function requiresLogicalNames(project: ProjectRecord): boolean {
  return usesDataverse(project);
}

export function requiresDataverseLicensing(project: ProjectRecord): boolean {
  return isModelDrivenProject(project) || usesDataverse(project);
}

export function expectedPowerPlatformDocuments(project: ProjectRecord): DocumentLocation[] {
  if (isCanvasProject(project)) {
    const documents: DocumentLocation[] = [...CANVAS_COMMON_DOCUMENT_LOCATIONS];
    if (usesSharePoint(project)) documents.push(...CANVAS_SHAREPOINT_DOCUMENT_LOCATIONS);
    if (usesDataverse(project)) documents.push(...CANVAS_DATAVERSE_DOCUMENT_LOCATIONS);
    if (usesOtherConnector(project)) documents.push(...CANVAS_OTHER_CONNECTOR_DOCUMENT_LOCATIONS);
    return documents;
  }
  if (isModelDrivenProject(project)) {
    return [...MODEL_DRIVEN_DOCUMENT_LOCATIONS];
  }
  return [];
}

export function expectedDocumentLocations(project: ProjectRecord): DocumentLocation[] {
  const locations = [...CORE_DOCUMENT_LOCATIONS, ...expectedPowerPlatformDocuments(project)];
  const seen = new Set<string>();
  return locations.filter((location) => {
    const key = `${location.folder}/${location.fileName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function decisionIsConfirmed(value: unknown): boolean {
  return toDecisionStatus(value, "missingInformation") === "confirmed";
}

function isConfirmed(value: unknown): boolean {
  return decisionIsConfirmed(value);
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function hasMissingMarker(value: string | undefined): boolean {
  return /\[MISSING:/i.test(value ?? "");
}

function gateFromRequiredValues(values: string[], confirmation: unknown): PowerPlatformGateStatus {
  if (values.some((value) => !hasText(value) || hasMissingMarker(value))) return "missingInformation";
  return isConfirmed(confirmation) ? "confirmed" : "reviewNeeded";
}

function sourceAssessmentsFor(project: ProjectRecord, sourceType: SelectableCanvasDataSourceType): PowerPlatformConnector[] {
  return (project.powerPlatform?.common.connectors ?? []).filter((connector) => connector.dataSourceType === sourceType);
}

function allSelectedSourcesHaveAssessments(project: ProjectRecord): boolean {
  const selected = getSelectedCanvasDataSourceTypes(project);
  return selected.length > 0 && selected.every((sourceType) => sourceAssessmentsFor(project, sourceType).length > 0);
}

export function reconcileCanvasConnectorRoles(
  connectors: PowerPlatformConnector[],
  primaryConnectorId: string,
  secondaryConnectorIds: string[]
): { connectors: PowerPlatformConnector[]; primaryConnectorId: string; secondaryConnectorIds: string[] } {
  const connectorIds = new Set(connectors.map((connector) => connector.id).filter(Boolean));
  const explicitPrimary = connectorIds.has(primaryConnectorId) ? primaryConnectorId : "";
  const rolePrimaries = connectors
    .filter((connector) => connector.canvasRole === "primary" && connectorIds.has(connector.id))
    .map((connector) => connector.id);
  const primary = explicitPrimary || (rolePrimaries.length === 1 ? rolePrimaries[0] : "");
  const secondary = [
    ...secondaryConnectorIds.filter((id) => connectorIds.has(id) && id !== primary),
    ...connectors.filter((connector) => connector.canvasRole === "secondary" && connector.id !== primary).map((connector) => connector.id)
  ].filter((id, index, ids) => id && ids.indexOf(id) === index);

  return {
    connectors: connectors.map((connector) => ({
      ...connector,
      canvasRole: connector.id === primary ? "primary" : secondary.includes(connector.id) ? "secondary" : ""
    })),
    primaryConnectorId: primary,
    secondaryConnectorIds: secondary
  };
}

function assignedCanvasAssessments(project: ProjectRecord): PowerPlatformConnector[] {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return [];
  return (project.powerPlatform?.common.connectors ?? []).filter((connector) =>
    connector.id === canvas.primaryConnectorId
    || canvas.secondaryConnectorIds.includes(connector.id)
    || connector.canvasRole === "primary"
    || connector.canvasRole === "secondary"
  );
}

function canvasConnectorRolesAreValid(project: ProjectRecord): boolean {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return false;
  const connectors = project.powerPlatform?.common.connectors ?? [];
  const reconciled = reconcileCanvasConnectorRoles(connectors, canvas.primaryConnectorId, canvas.secondaryConnectorIds);
  if (!reconciled.primaryConnectorId) return false;
  if (reconciled.connectors.filter((connector) => connector.canvasRole === "primary").length !== 1) return false;
  const assignedSourceTypes = new Set(
    reconciled.connectors
      .filter((connector) => connector.canvasRole === "primary" || connector.canvasRole === "secondary")
      .map((connector) => connector.dataSourceType)
      .filter(isSelectableCanvasDataSourceType)
  );
  return getSelectedCanvasDataSourceTypes(project).every((sourceType) => assignedSourceTypes.has(sourceType));
}

function modelDrivenExternalConnectors(project: ProjectRecord): PowerPlatformConnector[] {
  if (!isModelDrivenProject(project)) return [];
  return project.powerPlatform?.common.connectors ?? [];
}

function calculateBaseModelDrivenLicensingGate(project: ProjectRecord): PowerPlatformGateStatus {
  const common = project.powerPlatform?.common;
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!common || !modelDriven) return "missingInformation";
  if (!isConfirmed(common.dataverseAvailability) || !isConfirmed(common.licensingConfirmationStatus) || !isConfirmed(modelDriven.modelDrivenLicensingStatus)) {
    return hasText(common.dataverseAvailability) || hasText(common.licensingConfirmationStatus) || hasText(modelDriven.modelDrivenLicensingStatus)
      ? "reviewNeeded"
      : "missingInformation";
  }
  return "confirmed";
}

export function calculateModelDrivenExternalConnectorSelectionGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const connectors = modelDrivenExternalConnectors(project);
  if (connectors.length === 0) return "notApplicable";
  if (connectors.some((connector) =>
    !hasText(connector.displayName)
    || !hasText(connector.purpose)
    || !hasText(connector.dataSourceName)
    || !hasText(connector.dataSourceType)
    || !hasText(connector.authenticationMethod)
    || !hasText(connector.gatewayRequirement)
    || !hasText(connector.environmentRequirement)
    || !hasText(connector.dlpImpact)
    || !hasText(connector.approvalConfirmationStatus)
  )) return "missingInformation";
  if (connectors.some((connector) => connector.approvalConfirmationStatus !== "confirmed")) return "reviewNeeded";
  return "confirmed";
}

export function calculateModelDrivenExternalConnectorClassificationGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const connectors = modelDrivenExternalConnectors(project);
  if (connectors.length === 0) return "notApplicable";
  const selection = calculateModelDrivenExternalConnectorSelectionGate(project);
  if (selection === "missingInformation") return "missingInformation";
  if (connectors.some((connector) => connector.connectorClassification === "unknown")) return "missingInformation";
  if (connectors.some((connector) => connector.classificationConfirmationStatus !== "confirmed")) return "reviewNeeded";
  return selection === "confirmed" ? "confirmed" : "reviewNeeded";
}

export function calculateModelDrivenExternalConnectorLicensingGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const connectors = modelDrivenExternalConnectors(project);
  if (connectors.length === 0) return "notApplicable";
  const baseLicensing = calculateBaseModelDrivenLicensingGate(project);
  if (baseLicensing !== "confirmed") return baseLicensing;
  if (connectors.some((connector) => !hasText(connector.licenceRequirement))) return "missingInformation";
  if (connectors.some((connector) => connector.licensingConfirmationStatus !== "confirmed")) return "reviewNeeded";
  return "confirmed";
}

export function calculateConnectorSelectionGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (isCanvasProject(project)) {
    const canvas = project.powerPlatform?.canvas;
    if (!canvas || canvas.primaryDataSourceType === "undecided") return "missingInformation";
    if (canvas.primaryDataSourceType === "multiple" && getSelectedCanvasDataSourceTypes(project).length < 2) return "missingInformation";
    if (!hasText(canvas.sourcePurpose) || !hasText(canvas.sourceOwnership)) return "reviewNeeded";
    if (!allSelectedSourcesHaveAssessments(project)) return "missingInformation";
    if (!canvasConnectorRolesAreValid(project)) return "reviewNeeded";
    return "confirmed";
  }

  if (isModelDrivenProject(project)) {
    return calculateModelDrivenExternalConnectorSelectionGate(project);
  }

  return "notApplicable";
}

export function calculateConnectorClassificationGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (isModelDrivenProject(project)) return calculateModelDrivenExternalConnectorClassificationGate(project);
  const connectors = isCanvasProject(project)
    ? assignedCanvasAssessments(project).filter((connector) => getSelectedCanvasDataSourceTypes(project).includes(connector.dataSourceType as SelectableCanvasDataSourceType))
    : project.powerPlatform?.common.connectors ?? [];
  if (connectors.length === 0) return isModelDrivenProject(project) ? "notApplicable" : "missingInformation";
  if (connectors.some((connector) => connector.connectorClassification === "unknown")) return "missingInformation";
  if (connectors.some((connector) => connector.classificationConfirmationStatus !== "confirmed")) return "reviewNeeded";
  return "confirmed";
}

export function calculateLicensingGate(project: ProjectRecord): PowerPlatformGateStatus {
  const common = project.powerPlatform?.common;
  if (!common) return "notApplicable";

  if (isModelDrivenProject(project)) {
    const baseLicensing = calculateBaseModelDrivenLicensingGate(project);
    if (baseLicensing !== "confirmed") return baseLicensing;
    const connectorLicensing = calculateModelDrivenExternalConnectorLicensingGate(project);
    return connectorLicensing === "notApplicable" ? "confirmed" : connectorLicensing;
  }

  const connectors = assignedCanvasAssessments(project).filter((connector) => getSelectedCanvasDataSourceTypes(project).includes(connector.dataSourceType as SelectableCanvasDataSourceType));
  if (connectors.length === 0) return "missingInformation";
  if (connectors.some((connector) => !hasText(connector.licenceRequirement))) return "missingInformation";
  if (connectors.some((connector) => connector.licensingConfirmationStatus !== "confirmed")) return "reviewNeeded";
  if (requiresDataverseLicensing(project) && !isConfirmed(common.dataverseAvailability)) return "missingInformation";
  if (requiresDataverseLicensing(project) && !isConfirmed(common.licensingConfirmationStatus)) return "reviewNeeded";
  return "confirmed";
}

export function calculateEnvironmentGate(project: ProjectRecord): PowerPlatformGateStatus {
  const common = project.powerPlatform?.common;
  if (!common) return "notApplicable";
  if (!hasText(common.tenant) || !hasText(common.environment) || !hasText(common.environmentAccessStatus)) {
    return "missingInformation";
  }
  return isConfirmed(common.environmentAccessStatus) ? "confirmed" : "reviewNeeded";
}

export function calculateInternalNameGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!usesSharePoint(project)) return "notApplicable";
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return "missingInformation";
  const columns = canvas.sharePointColumnSchemas;
  const listIds = new Set(canvas.sharePointListSchemas.map((list) => list.id));
  const libraryIds = new Set(canvas.sharePointLibrarySchemas.map((library) => library.id));
  if (columns.length === 0) {
    if (!hasText(canvas.sharePointColumnDefinitions) || hasMissingMarker(canvas.sharePointColumnDefinitions)) return "missingInformation";
    return isConfirmed(canvas.internalNameStatus) ? "confirmed" : "reviewNeeded";
  }
  if (columns.some((column) => !hasText(column.displayName) || !hasText(column.internalName) || !hasText(column.columnType))) return "missingInformation";
  if (columns.some((column) => !column.parentType || !column.parentId)) return "missingInformation";
  if (columns.some((column) => column.parentType === "list" && !listIds.has(column.parentId))) return "missingInformation";
  if (columns.some((column) => column.parentType === "library" && !libraryIds.has(column.parentId))) return "missingInformation";
  if (columns.some((column) => !hasText(column.confirmationSource))) return "missingInformation";
  if (columns.some((column) => column.confirmationStatus !== "confirmed")) return "reviewNeeded";
  return "confirmed";
}

export function calculateLogicalNameGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!requiresLogicalNames(project)) return "notApplicable";
  const canvas = project.powerPlatform?.canvas;
  const modelDriven = project.powerPlatform?.modelDriven;
  if (isCanvasProject(project)) {
    if (!canvas) return "missingInformation";
    const hasStructured = canvas.dataverseTableSchemas.length > 0 || canvas.dataverseColumnSchemas.length > 0 || canvas.dataverseRelationshipSchemas.length > 0;
    if (hasStructured) {
      if (canvas.dataverseTableSchemas.length === 0 || canvas.dataverseColumnSchemas.length === 0) return "missingInformation";
      const tableIds = new Set(canvas.dataverseTableSchemas.map((table) => table.id));
      if (canvas.dataverseTableSchemas.some((table) => !hasText(table.displayName) || !hasText(table.logicalName) || !hasText(table.schemaName))) return "missingInformation";
      if (canvas.dataverseColumnSchemas.some((column) => !hasText(column.tableId) || !tableIds.has(column.tableId) || !hasText(column.displayName) || !hasText(column.logicalName) || !hasText(column.schemaName) || !hasText(column.dataType))) return "missingInformation";
      if (canvas.dataverseRelationshipSchemas.some((relationship) => !hasText(relationship.relationshipType) || !hasText(relationship.parentTableId) || !hasText(relationship.childTableId) || !tableIds.has(relationship.parentTableId) || !tableIds.has(relationship.childTableId) || relationship.parentTableId === relationship.childTableId || !hasText(relationship.relationshipSchemaName))) return "missingInformation";
      if ([...canvas.dataverseTableSchemas, ...canvas.dataverseColumnSchemas, ...canvas.dataverseRelationshipSchemas].some((row) => !hasText(row.confirmationSource))) return "missingInformation";
      if ([...canvas.dataverseTableSchemas, ...canvas.dataverseColumnSchemas, ...canvas.dataverseRelationshipSchemas].some((row) => row.confirmationStatus !== "confirmed")) return "reviewNeeded";
      return "confirmed";
    }
    if (!hasText(canvas.dataverseTableDefinitions) || !hasText(canvas.dataverseColumnDefinitions)) return "missingInformation";
    return isConfirmed(canvas.logicalNameStatus) ? "confirmed" : "reviewNeeded";
  }
  if (isModelDrivenProject(project)) {
    if (!modelDriven) return "missingInformation";
    const hasStructured = modelDriven.dataverseTableSchemas.length > 0 || modelDriven.dataverseColumnSchemas.length > 0 || modelDriven.dataverseRelationshipSchemas.length > 0;
    if (hasStructured) {
      if (modelDriven.dataverseTableSchemas.length === 0 || modelDriven.dataverseColumnSchemas.length === 0) return "missingInformation";
      const tableIds = new Set(modelDriven.dataverseTableSchemas.map((table) => table.id));
      if (modelDriven.dataverseTableSchemas.some((table) => !hasText(table.displayName) || !hasText(table.logicalName) || !hasText(table.schemaName) || !hasText(table.ownershipType) || !hasText(table.primaryNameColumn))) return "missingInformation";
      if (modelDriven.dataverseColumnSchemas.some((column) => !hasText(column.tableId) || !tableIds.has(column.tableId) || !hasText(column.displayName) || !hasText(column.logicalName) || !hasText(column.schemaName) || !hasText(column.dataType))) return "missingInformation";
      if (modelDriven.dataverseRelationshipSchemas.some((relationship) => !hasText(relationship.relationshipType) || !hasText(relationship.parentTableId) || !hasText(relationship.childTableId) || !tableIds.has(relationship.parentTableId) || !tableIds.has(relationship.childTableId) || relationship.parentTableId === relationship.childTableId || !hasText(relationship.relationshipSchemaName))) return "missingInformation";
      if ([...modelDriven.dataverseTableSchemas, ...modelDriven.dataverseColumnSchemas, ...modelDriven.dataverseRelationshipSchemas].some((row) => !hasText(row.confirmationSource))) return "missingInformation";
      if ([...modelDriven.dataverseTableSchemas, ...modelDriven.dataverseColumnSchemas, ...modelDriven.dataverseRelationshipSchemas].some((row) => row.confirmationStatus !== "confirmed")) return "reviewNeeded";
      return "confirmed";
    }
    if (!hasText(modelDriven.tableDefinitions || modelDriven.tables) || !hasText(modelDriven.columnDefinitions || modelDriven.columns)) return "missingInformation";
    return isConfirmed(modelDriven.logicalNameStatus) ? "confirmed" : "reviewNeeded";
  }
  return "notApplicable";
}

export function calculateSharePointSchemaGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!usesSharePoint(project)) return "notApplicable";
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return "missingInformation";
  const internalNames = calculateInternalNameGate(project);
  if (internalNames === "missingInformation") return "missingInformation";
  if (internalNames === "reviewNeeded") return "reviewNeeded";
  const hasStructured = canvas.sharePointListSchemas.length > 0 || canvas.sharePointLibrarySchemas.length > 0 || canvas.sharePointColumnSchemas.length > 0;
  if (hasStructured) {
    if (!hasText(canvas.sharePointSiteUrl || canvas.sharePointSites)) return "missingInformation";
    if (canvas.sharePointListSchemas.length === 0 && canvas.sharePointLibrarySchemas.length === 0) return "missingInformation";
    const listIds = new Set(canvas.sharePointListSchemas.map((list) => list.id));
    const libraryIds = new Set(canvas.sharePointLibrarySchemas.map((library) => library.id));
    if (canvas.sharePointListSchemas.some((list) => !hasText(list.displayName) || !hasText(list.purpose) || !hasText(list.expectedRecordCount))) return "missingInformation";
    if (canvas.sharePointLibrarySchemas.some((library) => !hasText(library.displayName) || !hasText(library.purpose))) return "missingInformation";
    if ([...canvas.sharePointListSchemas, ...canvas.sharePointLibrarySchemas].some((row) => !hasText(row.confirmationSource))) return "missingInformation";
    if (canvas.sharePointColumnSchemas.some((column) => !column.parentType || !column.parentId)) return "missingInformation";
    if (canvas.sharePointColumnSchemas.some((column) => column.parentType === "list" && !listIds.has(column.parentId))) return "missingInformation";
    if (canvas.sharePointColumnSchemas.some((column) => column.parentType === "library" && !libraryIds.has(column.parentId))) return "missingInformation";
    if (canvas.sharePointListSchemas.some((list) => !canvas.sharePointColumnSchemas.some((column) => column.parentType === "list" && column.parentId === list.id))) return "missingInformation";
    if (canvas.sharePointLibrarySchemas.some((library) => !canvas.sharePointColumnSchemas.some((column) => column.parentType === "library" && column.parentId === library.id))) return "missingInformation";
    if ([...canvas.sharePointListSchemas, ...canvas.sharePointLibrarySchemas, ...canvas.sharePointColumnSchemas].some((row) => row.confirmationStatus !== "confirmed")) return "reviewNeeded";
    return "confirmed";
  }
  return gateFromRequiredValues([
    canvas.sharePointSiteUrl || canvas.sharePointSites,
    canvas.sharePointListDefinitions || canvas.sharePointLists || canvas.sharePointLibraryDefinitions || canvas.sharePointLibraries,
    canvas.sharePointColumnDefinitions,
    canvas.expectedRecordCounts
  ], canvas.schemaStatus);
}

export function calculateCanvasDataverseSchemaGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isCanvasProject(project) || !usesDataverse(project)) return "notApplicable";
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return "missingInformation";
  const logicalNames = calculateLogicalNameGate(project);
  if (logicalNames === "missingInformation") return "missingInformation";
  if (logicalNames === "reviewNeeded") return "reviewNeeded";
  const hasStructured = canvas.dataverseTableSchemas.length > 0 || canvas.dataverseColumnSchemas.length > 0 || canvas.dataverseRelationshipSchemas.length > 0;
  if (hasStructured) {
    if (!hasText(canvas.dataverseEnvironment) || !hasText(canvas.dataverseSolution) || !hasText(canvas.dataversePublisherPrefix)) return "missingInformation";
    return canvas.dataverseSchemaConfirmationStatus === "confirmed" ? "confirmed" : "reviewNeeded";
  }
  return gateFromRequiredValues([
    canvas.dataverseEnvironment,
    canvas.dataverseSolution || canvas.dataverseTables,
    canvas.dataversePublisherPrefix,
    canvas.dataverseTableDefinitions || canvas.dataverseTables,
    canvas.dataverseColumnDefinitions
  ], canvas.dataverseSchemaConfirmationStatus || canvas.schemaStatus);
}

export function calculateOtherConnectorSchemaGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isCanvasProject(project) || !usesOtherConnector(project)) return "notApplicable";
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return "missingInformation";
  const hasStructured = canvas.connectorResourceSchemas.length > 0 || canvas.connectorFieldSchemas.length > 0;
  if (hasStructured) {
    const connectorIds = new Set((project.powerPlatform?.common.connectors ?? []).map((connector) => connector.id));
    if (canvas.connectorResourceSchemas.length === 0 || canvas.connectorFieldSchemas.length === 0) return "missingInformation";
    const resourceIdsByConnector = new Map(canvas.connectorResourceSchemas.map((resource) => [resource.id, resource.connectorId]));
    if (canvas.connectorResourceSchemas.some((resource) => !hasText(resource.connectorId) || !connectorIds.has(resource.connectorId) || !hasText(resource.resourceName) || !hasText(resource.keyOrIdentifier) || !hasText(resource.authenticationRequirement))) return "missingInformation";
    if (canvas.connectorFieldSchemas.some((field) => !hasText(field.connectorId) || !connectorIds.has(field.connectorId) || !hasText(field.resourceId) || resourceIdsByConnector.get(field.resourceId) !== field.connectorId || !hasText(field.fieldIdentifier) || !hasText(field.fieldType))) return "missingInformation";
    if ([...canvas.connectorResourceSchemas, ...canvas.connectorFieldSchemas].some((row) => !hasText(row.confirmationSource))) return "missingInformation";
    if ([...canvas.connectorResourceSchemas, ...canvas.connectorFieldSchemas].some((row) => row.confirmationStatus !== "confirmed")) return "reviewNeeded";
    return canvas.otherConnectorSchemaConfirmationStatus === "confirmed" ? "confirmed" : "reviewNeeded";
  }
  return gateFromRequiredValues([
    canvas.otherDataSources || canvas.otherConnectorSchemaDefinitions,
    canvas.otherConnectorFieldDefinitions,
    canvas.otherConnectorConfirmationSource
  ], canvas.schemaStatus);
}

export function calculateCanvasSchemaGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isCanvasProject(project)) return "notApplicable";
  const gates = [
    calculateSharePointSchemaGate(project),
    calculateCanvasDataverseSchemaGate(project),
    calculateOtherConnectorSchemaGate(project)
  ].filter((gate) => gate !== "notApplicable");
  if (gates.length === 0) return "missingInformation";
  if (gates.includes("missingInformation")) return "missingInformation";
  if (gates.includes("blocked")) return "blocked";
  if (gates.includes("reviewNeeded")) return "reviewNeeded";
  return "confirmed";
}

export function calculateModelDrivenEligibilityGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const common = project.powerPlatform?.common;
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!common || !modelDriven) return "missingInformation";
  const required = [
    common.dataverseAvailability || modelDriven.dataverseAvailability,
    common.licensingConfirmationStatus || modelDriven.modelDrivenLicensingStatus,
    common.environmentAccessStatus || modelDriven.environmentAccessStatus,
    modelDriven.solutionPermissionStatus,
    modelDriven.tableCreationPermissionStatus,
    modelDriven.securityRoleConfigurationPermissionStatus,
    modelDriven.importPermissionStatus,
    modelDriven.deploymentPermissionStatus
  ];
  if (required.some((value) => !hasText(value))) return "missingInformation";
  return required.every(isConfirmed) ? "confirmed" : "reviewNeeded";
}

export function calculateModelDrivenDataverseSchemaGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const common = project.powerPlatform?.common;
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!common || !modelDriven) return "missingInformation";
  const logicalNames = calculateLogicalNameGate(project);
  if (logicalNames === "missingInformation") return "missingInformation";
  if (logicalNames === "reviewNeeded") return "reviewNeeded";
  if (modelDriven.dataverseTableSchemas.length > 0 || modelDriven.dataverseColumnSchemas.length > 0 || modelDriven.dataverseRelationshipSchemas.length > 0) {
    if (!hasText(common.solutionName || modelDriven.existingSolution) || !hasText(common.publisherName) || !hasText(common.publisherPrefix) || !hasText(modelDriven.securityRoles)) return "missingInformation";
    return modelDriven.dataverseSchemaConfirmationStatus === "confirmed" || modelDriven.schemaStatus === "confirmed" ? "confirmed" : "reviewNeeded";
  }
  return gateFromRequiredValues([
    common.solutionName || modelDriven.solutionArchitecture,
    common.publisherName,
    common.publisherPrefix,
    modelDriven.tableDefinitions || modelDriven.tables,
    modelDriven.columnDefinitions || modelDriven.columns,
    modelDriven.relationshipDefinitions || modelDriven.relationships,
    modelDriven.securityRoles
  ], modelDriven.schemaStatus);
}

export function calculateModelDrivenSolutionArchitectureGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const common = project.powerPlatform?.common;
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!common || !modelDriven) return "missingInformation";
  return gateFromRequiredValues([
    modelDriven.formDefinitions || modelDriven.forms,
    modelDriven.viewDefinitions || modelDriven.views,
    modelDriven.navigationDefinitions || modelDriven.navigation,
    modelDriven.securityRoles,
    modelDriven.businessRules,
    modelDriven.businessProcessFlows,
    modelDriven.automations,
    common.environmentVariables,
    common.connectionReferences,
    common.almApproach
  ], modelDriven.solutionArchitectureConfirmationStatus || modelDriven.solutionArchitectureStatus);
}

export function calculateSecurityReviewGate(project: ProjectRecord): PowerPlatformGateStatus {
  const common = project.powerPlatform?.common;
  if (!common) return "notApplicable";
  return gateFromRequiredValues([
    common.authenticationRequirements,
    common.authorizationRequirements,
    common.recordAccessRules,
    common.auditRequirements,
    common.privacyRequirements
  ], common.securityReviewStatus);
}

export function calculateTestingPreparationGate(project: ProjectRecord): PowerPlatformGateStatus {
  const common = project.powerPlatform?.common;
  if (!common) return "notApplicable";
  const hasTestPlan = [
    common.functionalTesting,
    common.connectorTesting,
    common.permissionTesting,
    common.accessibilityTesting,
    common.deploymentTesting
  ].some(hasText);
  if (!hasTestPlan) return "missingInformation";
  return isConfirmed(common.testingPlanConfirmationStatus)
    ? "confirmed"
    : "reviewNeeded";
}

export function calculateCanvasPowerFxPlanningGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isCanvasProject(project)) return "notApplicable";
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return "missingInformation";
  return gateFromRequiredValues([
    canvas.appFormulasRequirements,
    canvas.startScreenRequirements,
    canvas.onStartRequirements,
    canvas.namedFormulaRequirements,
    canvas.createBehavior,
    canvas.readBehavior,
    canvas.updateBehavior,
    canvas.validationRequirements,
    canvas.errorHandlingRequirements,
    canvas.searchRequirements,
    canvas.filteringRequirements,
    canvas.sortingRequirements
  ], canvas.powerFxStatus);
}

export function calculateCanvasYamlPlanningGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isCanvasProject(project)) return "notApplicable";
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return "missingInformation";
  return gateFromRequiredValues([
    canvas.fullScreenYamlRequired,
    canvas.controlLevelYamlRequired,
    canvas.containerYamlRequired,
    canvas.componentYamlRequired,
    canvas.paYamlSourceRequired,
    canvas.expectedInstallationMethod,
    canvas.existingSourceAvailability,
    canvas.validationResponsibility
  ], canvas.yamlStatus);
}

export function calculateCanvasDelegationPlanningGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isCanvasProject(project)) return "notApplicable";
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return "missingInformation";
  const connectorDelegation = (project.powerPlatform?.common.connectors ?? []).some((connector) => hasText(connector.delegationSupport));
  if (!connectorDelegation) return "missingInformation";
  return gateFromRequiredValues([
    canvas.expectedRecordCounts,
    canvas.searchRequirements,
    canvas.filteringRequirements,
    canvas.sortingRequirements,
    canvas.delegationRequirements
  ], canvas.delegationStatus);
}

export function calculateAlmGate(project: ProjectRecord): PowerPlatformGateStatus {
  const common = project.powerPlatform?.common;
  if (!common) return "notApplicable";
  const commonGate = gateFromRequiredValues([
    common.sourceControlApproach,
    common.deploymentMethod,
    common.deploymentResponsibility,
    common.deploymentStrategy,
    common.connectionReferences,
    common.environmentVariables,
    common.pipelineRequirements,
    common.rollbackExpectations,
    common.releaseApprovalResponsibility
  ], common.almConfirmationStatus);
  if (!isModelDrivenProject(project)) return commonGate;
  const modelDrivenStatus = project.powerPlatform?.modelDriven?.almReadinessStatus ?? "missingInformation";
  if (commonGate !== "confirmed") return commonGate;
  if (modelDrivenStatus === "confirmed") return "confirmed";
  return modelDrivenStatus === "missingInformation" ? "missingInformation" : "reviewNeeded";
}

function applicabilityGate(decisions: PowerPlatformApplicabilityDecision[]): PowerPlatformGateStatus {
  for (const decision of decisions) {
    if (decision.status === "undecided") return "missingInformation";
    if (decision.status === "required" && !hasText(decision.details)) return "missingInformation";
    if (decision.status === "notApplicable" && !hasText(decision.notApplicableReason)) return "missingInformation";
    if (decision.confirmationStatus !== "confirmed") return "reviewNeeded";
  }
  return "confirmed";
}

export function calculateModelDrivenFormsAndViewsGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!modelDriven) return "missingInformation";
  const base = gateFromRequiredValues([modelDriven.formDefinitions || modelDriven.forms, modelDriven.viewDefinitions || modelDriven.views], modelDriven.formsAndViewsStatus);
  if (base !== "confirmed") return base;
  return applicabilityGate([modelDriven.chartsDecision, modelDriven.dashboardsDecision, modelDriven.appPagesDecision, modelDriven.customPagesDecision]);
}

export function calculateModelDrivenNavigationGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!modelDriven) return "missingInformation";
  return gateFromRequiredValues([modelDriven.navigationDefinitions || modelDriven.navigation], modelDriven.navigationStatus);
}

export function calculateModelDrivenSecurityArchitectureGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!modelDriven) return "missingInformation";
  const base = gateFromRequiredValues([
    modelDriven.securityRoles,
    modelDriven.businessUnits,
    modelDriven.tablePrivileges,
    modelDriven.privilegeDepth,
    modelDriven.recordOwnership,
    modelDriven.sharingExpectations
  ], modelDriven.securityArchitectureStatus);
  if (base !== "confirmed") return base;
  return applicabilityGate([
    modelDriven.teamModelDecision,
    modelDriven.hierarchySecurityDecision,
    modelDriven.fieldSecurityDecision,
    modelDriven.applicationUsersDecision,
    modelDriven.servicePrincipalsDecision
  ]);
}

export function calculateModelDrivenBusinessLogicGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!modelDriven) return "missingInformation";
  const base = gateFromRequiredValues([], modelDriven.businessLogicStatus);
  if (base !== "confirmed") return base;
  return applicabilityGate([
    modelDriven.businessRulesDecision,
    modelDriven.businessProcessFlowsDecision,
    modelDriven.automationsDecision,
    modelDriven.validationRulesDecision,
    modelDriven.duplicatePreventionDecision
  ]);
}

export function calculateModelDrivenExtensionsGate(project: ProjectRecord): PowerPlatformGateStatus {
  if (!isModelDrivenProject(project)) return "notApplicable";
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!modelDriven) return "missingInformation";
  const base = gateFromRequiredValues([], modelDriven.extensionsStatus);
  if (base !== "confirmed") return base;
  return applicabilityGate([
    modelDriven.commandBarRulesDecision,
    modelDriven.clientSideJavaScriptDecision,
    modelDriven.webResourcesDecision,
    modelDriven.htmlWebResourcesDecision,
    modelDriven.imageWebResourcesDecision,
    modelDriven.pcfControlsDecision,
    modelDriven.pluginsDecision,
    modelDriven.customWorkflowActivitiesDecision,
    modelDriven.customApisDecision,
    modelDriven.azureIntegrationsDecision,
    modelDriven.externalServicesDecision
  ]);
}

export interface PowerPlatformReadinessSummary {
  projectType: "canvas" | "modelDriven" | "legacy" | "none";
  gates: Array<{ id: string; label: string; status: PowerPlatformGateStatus; description: string }>;
  nextBlockingAction: string;
  isReadyForCodex: boolean;
}

function nextActionForGate(label: string, status: PowerPlatformGateStatus): string | null {
  if (status === "confirmed" || status === "ready" || status === "passed" || status === "notApplicable") return null;
  return label;
}

export function calculatePowerPlatformReadiness(project: ProjectRecord): PowerPlatformReadinessSummary {
  if (!project.powerPlatform) {
    return { projectType: "none", gates: [], nextBlockingAction: "", isReadyForCodex: true };
  }
  const projectType = isCanvasProject(project)
    ? "canvas"
    : isModelDrivenProject(project)
      ? "modelDriven"
      : isLegacyMicrosoftProject(project)
        ? "legacy"
        : "none";

  const gates: PowerPlatformReadinessSummary["gates"] = projectType === "canvas"
    ? [
        { id: "connectorSelection", label: "Select the primary Canvas data source.", status: calculateConnectorSelectionGate(project), description: "Primary data source and purpose must be explicit." },
        { id: "connectorClassification", label: "Confirm connector classification and licensing.", status: calculateConnectorClassificationGate(project), description: "Connector classification is never inferred." },
        { id: "licensing", label: "Confirm licensing requirements for selected connectors.", status: calculateLicensingGate(project), description: "Premium and Dataverse licensing require explicit confirmation." },
        { id: "environment", label: "Confirm environment access.", status: calculateEnvironmentGate(project), description: "Environment access is not confirmed by default." },
        { id: "schema", label: "Complete and confirm backend schema.", status: calculateCanvasSchemaGate(project), description: "Schema requirements depend on selected backend." },
        { id: "internalNames", label: "Document and confirm SharePoint internal column names.", status: calculateInternalNameGate(project), description: "Internal names are never derived from display names." },
        { id: "logicalNames", label: "Document and confirm Dataverse logical names.", status: calculateLogicalNameGate(project), description: "Logical names are never guessed." },
        { id: "powerFxPlanning", label: "Confirm Power Fx planning.", status: calculateCanvasPowerFxPlanningGate(project), description: "Power Fx requirements are planned only; no final formulas are generated." },
        { id: "yamlPlanning", label: "Confirm YAML installation and validation planning.", status: calculateCanvasYamlPlanningGate(project), description: "Canvas YAML handling must be planned without generating paste-ready YAML." },
        { id: "delegationPlanning", label: "Document delegation mitigation.", status: calculateCanvasDelegationPlanningGate(project), description: "Search, filter, sort, volume, and connector delegation behavior must be planned." },
        { id: "security", label: "Confirm Power Platform security review.", status: calculateSecurityReviewGate(project), description: "Access and privacy decisions must be recorded." },
        { id: "testing", label: "Prepare Power Platform testing plan.", status: calculateTestingPreparationGate(project), description: "Connector, permission, accessibility, and deployment tests must be planned." },
        { id: "alm", label: "Confirm ALM and rollback responsibilities.", status: calculateAlmGate(project), description: "Source control, deployment, connection references, rollback, and release approval must be recorded." }
      ]
    : projectType === "modelDriven"
      ? [
          { id: "eligibility", label: "Confirm Dataverse and model-driven eligibility.", status: calculateModelDrivenEligibilityGate(project), description: "Dataverse, licensing, and permissions require explicit confirmation." },
          { id: "licensing", label: "Confirm Dataverse and model-driven licensing.", status: calculateLicensingGate(project), description: "Licensing cannot be inferred from solution details." },
          { id: "environment", label: "Confirm environment access.", status: calculateEnvironmentGate(project), description: "Environment access is not confirmed by default." },
          { id: "schema", label: "Confirm model-driven Dataverse schema.", status: calculateModelDrivenDataverseSchemaGate(project), description: "Tables, columns, relationships, and ownership must be explicit." },
          { id: "logicalNames", label: "Confirm Dataverse logical names.", status: calculateLogicalNameGate(project), description: "Logical names are never guessed." },
          { id: "formsAndViews", label: "Confirm model-driven forms and views.", status: calculateModelDrivenFormsAndViewsGate(project), description: "Forms, views, charts, dashboards, app pages, and custom pages need applicability decisions." },
          { id: "navigation", label: "Confirm model-driven navigation.", status: calculateModelDrivenNavigationGate(project), description: "App areas, groups, subareas, and table placement must be planned." },
          { id: "securityArchitecture", label: "Confirm model-driven security architecture.", status: calculateModelDrivenSecurityArchitectureGate(project), description: "Roles, business units, teams, privileges, and ownership must be explicit." },
          { id: "businessLogic", label: "Confirm model-driven business logic.", status: calculateModelDrivenBusinessLogicGate(project), description: "Business rules, business process flows, and automation applicability must be decided." },
          { id: "extensions", label: "Confirm model-driven extensions.", status: calculateModelDrivenExtensionsGate(project), description: "Command bar, web resources, plug-ins, APIs, PCF, and external services need applicability decisions." },
          { id: "externalConnectorSelection", label: "Confirm external connector selection.", status: calculateModelDrivenExternalConnectorSelectionGate(project), description: "External connectors are optional, but complete assessment details are required when they exist." },
          { id: "externalConnectorClassification", label: "Confirm external connector classification.", status: calculateModelDrivenExternalConnectorClassificationGate(project), description: "External connector classification must be explicitly confirmed." },
          { id: "externalConnectorLicensing", label: "Confirm external connector licensing.", status: calculateModelDrivenExternalConnectorLicensingGate(project), description: "External connector licensing must be explicitly confirmed when connectors exist." },
          { id: "alm", label: "Confirm model-driven ALM.", status: calculateAlmGate(project), description: "Source control, deployment, connection references, rollback, and release approval must be recorded." },
          { id: "testing", label: "Prepare model-driven testing plan.", status: calculateTestingPreparationGate(project), description: "Permission, security, integration, and deployment tests must be planned." }
        ]
      : [];

  const blocker = gates.find((gate) => nextActionForGate(gate.label, gate.status));
  return {
    projectType,
    gates,
    nextBlockingAction: blocker?.label ?? "Power Platform readiness gates are confirmed.",
    isReadyForCodex: gates.every((gate) => !nextActionForGate(gate.label, gate.status))
  };
}

export function createDefaultPowerPlatformData(projectType: ProjectType | ""): PowerPlatformProjectData | undefined {
  if (projectType !== "powerAppsCanvas" && projectType !== "powerAppsModelDriven" && projectType !== "microsoft365") {
    return undefined;
  }
  return {
    common: createDefaultCommonData(),
    canvas: projectType === "powerAppsCanvas" ? createDefaultCanvasData() : undefined,
    modelDriven: projectType === "powerAppsModelDriven" ? createDefaultModelDrivenData() : undefined,
    progress: createDefaultProgress()
  };
}

export function normalizePowerPlatformData(
  value: unknown,
  projectType: ProjectType | ""
): PowerPlatformProjectData | undefined {
  const defaults = createDefaultPowerPlatformData(projectType);
  if (!defaults) return undefined;
  if (!isObject(value)) return defaults;

  const common = isObject(value.common) ? value.common : {};
  const connectors = Array.isArray(common.connectors)
    ? common.connectors.map((candidate) => createDefaultConnector(isObject(candidate) ? {
        id: asString(candidate.id),
        displayName: asString(candidate.displayName),
        purpose: asString(candidate.purpose),
        dataSourceName: asString(candidate.dataSourceName),
        dataSourceType: asString(candidate.dataSourceType),
        canvasRole: candidate.canvasRole === "primary" || candidate.canvasRole === "secondary" ? candidate.canvasRole : "",
        connectorClassification: VALID_CONNECTOR_CLASSIFICATIONS.includes(candidate.connectorClassification as ConnectorClassification)
          ? candidate.connectorClassification as ConnectorClassification
          : "unknown",
        classificationConfirmed: candidate.classificationConfirmed === true,
        classificationConfirmationStatus: toDecisionStatus(candidate.classificationConfirmationStatus, candidate.classificationConfirmed === true ? "confirmed" : "missingInformation"),
        licenceRequirement: asString(candidate.licenceRequirement),
        licensingConfirmed: candidate.licensingConfirmed === true,
        licensingConfirmationStatus: toDecisionStatus(candidate.licensingConfirmationStatus, candidate.licensingConfirmed === true ? "confirmed" : "missingInformation"),
        authenticationMethod: asString(candidate.authenticationMethod),
        gatewayRequirement: asString(candidate.gatewayRequirement),
        environmentRequirement: asString(candidate.environmentRequirement),
        dlpImpact: asString(candidate.dlpImpact),
        delegationSupport: asString(candidate.delegationSupport),
        expectedRecordVolume: asString(candidate.expectedRecordVolume),
        supportedOperations: isObject(candidate.supportedOperations)
          ? VALID_CONNECTOR_OPERATIONS.reduce((acc, operation) => {
              const normalizedOperations = candidate.supportedOperations as Record<string, unknown>;
              acc[operation] = normalizedOperations[operation] === true;
              return acc;
            }, {} as Partial<Record<ConnectorOperation, boolean>>)
          : undefined,
        offlineSupport: asString(candidate.offlineSupport),
        securityNotes: asString(candidate.securityNotes),
        limitations: asString(candidate.limitations),
        approvalStatus: asString(candidate.approvalStatus),
        approvalConfirmationStatus: toConnectorApprovalConfirmationStatus(candidate.approvalConfirmationStatus, candidate.approvalStatus)
      } : {}))
    : [];

  const progress = isObject(value.progress) ? value.progress : {};
  const canvasProgress = isObject(progress.canvas) ? progress.canvas : {};
  const modelDrivenProgress = isObject(progress.modelDriven) ? progress.modelDriven : {};

  const normalized: PowerPlatformProjectData = {
    common: {
      ...defaults.common,
      ...normalizeStringValues(defaults.common, common),
      appSubtype: asString(common.appSubtype) as PowerPlatformCommonData["appSubtype"],
      tenant: asString(common.tenant),
      environment: asString(common.environment),
      environmentType: asString(common.environmentType),
      developmentEnvironment: asString(common.developmentEnvironment),
      testEnvironment: asString(common.testEnvironment),
      productionEnvironment: asString(common.productionEnvironment),
      environmentAccessStatus: toDecisionStatus(common.environmentAccessStatus),
      securityReviewStatus: toDecisionStatus(common.securityReviewStatus ?? progress.securityReview),
      testingPlanConfirmationStatus: toDecisionStatus(common.testingPlanConfirmationStatus ?? progress.testing),
      almConfirmationStatus: toDecisionStatus(common.almConfirmationStatus),
      businessOwner: asString(common.businessOwner),
      appOwner: asString(common.appOwner),
      technicalOwner: asString(common.technicalOwner),
      supportOwner: asString(common.supportOwner),
      expectedUserCount: asString(common.expectedUserCount),
      existingLicences: asString(common.existingLicences),
      licensingStatus: asString(common.licensingStatus),
      licensingAssumptions: asString(common.licensingAssumptions),
      outstandingLicensingDecisions: asString(common.outstandingLicensingDecisions),
      licensingConfirmationStatus: toDecisionStatus(common.licensingConfirmationStatus),
      solutionAware: asString(common.solutionAware),
      solutionName: asString(common.solutionName),
      solutionUniqueName: asString(common.solutionUniqueName),
      publisherName: asString(common.publisherName),
      publisherPrefix: asString(common.publisherPrefix),
      sourceControlApproach: asString(common.sourceControlApproach),
      almApproach: asString(common.almApproach),
      deploymentMethod: asString(common.deploymentMethod),
      authenticationRequirements: asString(common.authenticationRequirements),
      authorizationRequirements: asString(common.authorizationRequirements),
      accessibilityRequirements: asString(common.accessibilityRequirements),
      complianceRequirements: asString(common.complianceRequirements),
      dataClassification: asString(common.dataClassification),
      dataRetentionRequirements: asString(common.dataRetentionRequirements),
      auditRequirements: asString(common.auditRequirements),
      connectors
    },
    progress: {
      ...defaults.progress,
      connectorSelection: toGateStatus(progress.connectorSelection),
      connectorClassification: toGateStatus(progress.connectorClassification),
      licensing: toGateStatus(progress.licensing),
      environment: toGateStatus(progress.environment),
      schema: toGateStatus(progress.schema),
      nameConfirmation: toGateStatus(progress.nameConfirmation),
      securityReview: toGateStatus(progress.securityReview),
      testing: toGateStatus(progress.testing),
      manualImplementation: toGateStatus(progress.manualImplementation),
      deployment: toGateStatus(progress.deployment),
      canvas: {
        ...defaults.progress.canvas,
        sharePointSchema: toGateStatus(canvasProgress.sharePointSchema),
        dataverseSchema: toGateStatus(canvasProgress.dataverseSchema),
        connectorSchema: toGateStatus(canvasProgress.connectorSchema),
        internalNames: toGateStatus(canvasProgress.internalNames),
        logicalNames: toGateStatus(canvasProgress.logicalNames),
        powerFx: toGateStatus(canvasProgress.powerFx),
        yaml: toGateStatus(canvasProgress.yaml),
        delegation: toGateStatus(canvasProgress.delegation),
        studioValidation: toGateStatus(canvasProgress.studioValidation),
        publication: toGateStatus(canvasProgress.publication)
      },
      modelDriven: {
        ...defaults.progress.modelDriven,
        dataverseAvailability: toGateStatus(modelDrivenProgress.dataverseAvailability),
        modelDrivenLicensing: toGateStatus(modelDrivenProgress.modelDrivenLicensing),
        publisher: toGateStatus(modelDrivenProgress.publisher),
        dataverseSchema: toGateStatus(modelDrivenProgress.dataverseSchema),
        logicalNames: toGateStatus(modelDrivenProgress.logicalNames),
        solutionArchitecture: toGateStatus(modelDrivenProgress.solutionArchitecture),
        solutionComponents: toGateStatus(modelDrivenProgress.solutionComponents),
        securityRoles: toGateStatus(modelDrivenProgress.securityRoles),
        automation: toGateStatus(modelDrivenProgress.automation),
        extensions: toGateStatus(modelDrivenProgress.extensions),
        sourceAvailability: toGateStatus(modelDrivenProgress.sourceAvailability),
        solutionValidation: toGateStatus(modelDrivenProgress.solutionValidation),
        solutionImport: toGateStatus(modelDrivenProgress.solutionImport),
        publication: toGateStatus(modelDrivenProgress.publication)
      }
    }
  };

  if (projectType === "powerAppsCanvas") {
    const canvas = isObject(value.canvas) ? value.canvas : {};
    normalized.canvas = {
      ...defaults.canvas!,
      ...normalizeStringValues(defaults.canvas!, canvas),
      subtype: VALID_CANVAS_SUBTYPES.includes(canvas.subtype as PowerAppsCanvasSubtype)
        ? canvas.subtype as PowerAppsCanvasSubtype
        : "",
      responsiveMode: asString(canvas.responsiveMode),
      targetDevices: asString(canvas.targetDevices),
      targetScreenSizes: asString(canvas.targetScreenSizes),
      orientation: asString(canvas.orientation),
      controlGeneration: asString(canvas.controlGeneration),
      primaryDataSourceType: toCanvasDataSourceType(canvas.primaryDataSourceType),
      selectedDataSourceTypes: normalizeSelectedDataSourceTypes(canvas.selectedDataSourceTypes),
      primaryConnectorId: asString(canvas.primaryConnectorId),
      secondaryConnectorIds: Array.isArray(canvas.secondaryConnectorIds)
        ? canvas.secondaryConnectorIds.map((item) => asString(item)).filter(Boolean)
        : [],
      sharePointSites: asString(canvas.sharePointSites),
      sharePointLists: asString(canvas.sharePointLists),
      sharePointLibraries: asString(canvas.sharePointLibraries),
      sharePointListSchemas: Array.isArray(canvas.sharePointListSchemas)
        ? canvas.sharePointListSchemas.map((item) => createDefaultSharePointList(isObject(item) ? {
            id: asString(item.id),
            displayName: asString(item.displayName),
            purpose: asString(item.purpose),
            expectedRecordCount: asString(item.expectedRecordCount),
            attachmentsEnabled: asString(item.attachmentsEnabled),
            versioningExpectation: asString(item.versioningExpectation),
            permissionExpectation: asString(item.permissionExpectation),
            recordStatusModel: asString(item.recordStatusModel),
            archiveBehavior: asString(item.archiveBehavior),
            restoreBehavior: asString(item.restoreBehavior),
            confirmationStatus: toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      sharePointColumnSchemas: Array.isArray(canvas.sharePointColumnSchemas)
        ? canvas.sharePointColumnSchemas.map((item) => createDefaultSharePointColumn(isObject(item) ? {
            id: asString(item.id),
            parentType: item.parentType === "list" || item.parentType === "library" ? item.parentType : "",
            parentId: asString(item.parentId),
            displayName: asString(item.displayName),
            internalName: asString(item.internalName),
            columnType: asString(item.columnType),
            requiredStatus: asString(item.requiredStatus),
            defaultValue: asString(item.defaultValue),
            choiceValues: asString(item.choiceValues),
            lookupList: asString(item.lookupList),
            lookupColumn: asString(item.lookupColumn),
            personFieldBehavior: asString(item.personFieldBehavior),
            dateTimeBehavior: asString(item.dateTimeBehavior),
            indexedStatus: asString(item.indexedStatus),
            uniqueValueStatus: asString(item.uniqueValueStatus),
            sensitiveDataStatus: asString(item.sensitiveDataStatus),
            notes: asString(item.notes),
            confirmationStatus: !asString(item.parentId) ? "reviewNeeded" : toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      sharePointLibrarySchemas: Array.isArray(canvas.sharePointLibrarySchemas)
        ? canvas.sharePointLibrarySchemas.map((item) => createDefaultSharePointLibrary(isObject(item) ? {
            id: asString(item.id),
            displayName: asString(item.displayName),
            purpose: asString(item.purpose),
            folderStructure: asString(item.folderStructure),
            contentTypes: asString(item.contentTypes),
            fileTypes: asString(item.fileTypes),
            fileSizeExpectations: asString(item.fileSizeExpectations),
            uploadBehavior: asString(item.uploadBehavior),
            downloadBehavior: asString(item.downloadBehavior),
            versioning: asString(item.versioning),
            permissions: asString(item.permissions),
            retention: asString(item.retention),
            metadataColumnIds: Array.isArray(item.metadataColumnIds) ? item.metadataColumnIds.map(asString).filter(Boolean) : [],
            confirmationStatus: toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      dataverseTables: asString(canvas.dataverseTables),
      dataverseTableSchemas: Array.isArray(canvas.dataverseTableSchemas)
        ? canvas.dataverseTableSchemas.map((item) => createDefaultDataverseTable(isObject(item) ? {
            id: asString(item.id),
            displayName: asString(item.displayName),
            pluralDisplayName: asString(item.pluralDisplayName),
            logicalName: asString(item.logicalName),
            schemaName: asString(item.schemaName),
            ownershipType: asString(item.ownershipType),
            primaryNameColumn: asString(item.primaryNameColumn),
            purpose: asString(item.purpose),
            expectedRecordCount: asString(item.expectedRecordCount),
            auditStatus: asString(item.auditStatus),
            searchRequirement: asString(item.searchRequirement),
            securityNotes: asString(item.securityNotes),
            confirmationStatus: toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      dataverseColumnSchemas: Array.isArray(canvas.dataverseColumnSchemas)
        ? canvas.dataverseColumnSchemas.map((item) => createDefaultDataverseColumn(isObject(item) ? {
            id: asString(item.id),
            tableId: asString(item.tableId),
            displayName: asString(item.displayName),
            logicalName: asString(item.logicalName),
            schemaName: asString(item.schemaName),
            dataType: asString(item.dataType),
            requiredLevel: asString(item.requiredLevel),
            defaultValue: asString(item.defaultValue),
            choiceDefinition: asString(item.choiceDefinition),
            lookupTarget: asString(item.lookupTarget),
            calculatedColumnRequirement: asString(item.calculatedColumnRequirement),
            formulaColumnRequirement: asString(item.formulaColumnRequirement),
            rollupColumnRequirement: asString(item.rollupColumnRequirement),
            auditStatus: asString(item.auditStatus),
            sensitiveDataStatus: asString(item.sensitiveDataStatus),
            confirmationStatus: !asString(item.tableId) ? "reviewNeeded" : toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      dataverseRelationshipSchemas: Array.isArray(canvas.dataverseRelationshipSchemas)
        ? canvas.dataverseRelationshipSchemas.map((item) => createDefaultDataverseRelationship(isObject(item) ? {
            id: asString(item.id),
            relationshipType: asString(item.relationshipType),
            parentTableId: asString(item.parentTableId),
            childTableId: asString(item.childTableId),
            parentTable: asString(item.parentTable),
            childTable: asString(item.childTable),
            relationshipSchemaName: asString(item.relationshipSchemaName),
            requiredStatus: asString(item.requiredStatus),
            referentialBehavior: asString(item.referentialBehavior),
            cascadeBehavior: asString(item.cascadeBehavior),
            navigationBehavior: asString(item.navigationBehavior),
            confirmationStatus: !asString(item.parentTableId) || !asString(item.childTableId) ? "reviewNeeded" : toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      otherDataSources: asString(canvas.otherDataSources),
      connectorResourceSchemas: Array.isArray(canvas.connectorResourceSchemas)
        ? canvas.connectorResourceSchemas.map((item) => createDefaultConnectorResource(isObject(item) ? {
            id: asString(item.id),
            connectorId: asString(item.connectorId),
            resourceName: asString(item.resourceName),
            resourceType: asString(item.resourceType),
            purpose: asString(item.purpose),
            keyOrIdentifier: asString(item.keyOrIdentifier),
            authenticationRequirement: asString(item.authenticationRequirement),
            queryLimitations: asString(item.queryLimitations),
            pagination: asString(item.pagination),
            throttling: asString(item.throttling),
            gatewayRequirement: asString(item.gatewayRequirement),
            confirmationStatus: toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      connectorFieldSchemas: Array.isArray(canvas.connectorFieldSchemas)
        ? canvas.connectorFieldSchemas.map((item) => createDefaultConnectorField(isObject(item) ? {
            id: asString(item.id),
            connectorId: asString(item.connectorId),
            resourceId: asString(item.resourceId),
            displayName: asString(item.displayName),
            fieldIdentifier: asString(item.fieldIdentifier),
            fieldType: asString(item.fieldType),
            requiredStatus: asString(item.requiredStatus),
            keyStatus: asString(item.keyStatus),
            relationship: asString(item.relationship),
            readBehavior: asString(item.readBehavior),
            createBehavior: asString(item.createBehavior),
            updateBehavior: asString(item.updateBehavior),
            deleteBehavior: asString(item.deleteBehavior),
            confirmationStatus: toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      expectedRecordCounts: asString(canvas.expectedRecordCounts),
      offlineRequirements: asString(canvas.offlineRequirements),
      synchronizationRequirements: asString(canvas.synchronizationRequirements),
      attachmentRequirements: asString(canvas.attachmentRequirements),
      fileRequirements: asString(canvas.fileRequirements),
      screens: asString(canvas.screens),
      containers: asString(canvas.containers),
      components: asString(canvas.components),
      controls: asString(canvas.controls),
      namedFormulas: asString(canvas.namedFormulas),
      globalVariables: asString(canvas.globalVariables),
      contextVariables: asString(canvas.contextVariables),
      collections: asString(canvas.collections),
      schemaStatus: toDecisionStatus(canvas.schemaStatus),
      dataverseSchemaConfirmationStatus: toDecisionStatus(canvas.dataverseSchemaConfirmationStatus),
      otherConnectorSchemaConfirmationStatus: toDecisionStatus(canvas.otherConnectorSchemaConfirmationStatus),
      internalNameStatus: toDecisionStatus(canvas.internalNameStatus),
      logicalNameStatus: toDecisionStatus(canvas.logicalNameStatus),
      powerFxStatus: toDecisionStatus(canvas.powerFxStatus),
      yamlStatus: toDecisionStatus(canvas.yamlStatus),
      delegationStatus: toDecisionStatus(canvas.delegationStatus),
      manualInstallationStatus: asString(canvas.manualInstallationStatus),
      studioValidationStatus: asString(canvas.studioValidationStatus),
      publicationStatus: asString(canvas.publicationStatus),
      deploymentStatus: asString(canvas.deploymentStatus)
    };
  }

  if (projectType === "powerAppsModelDriven") {
    const modelDriven = isObject(value.modelDriven) ? value.modelDriven : {};
    normalized.modelDriven = {
      ...defaults.modelDriven!,
      ...normalizeStringValues(defaults.modelDriven!, modelDriven),
      subtype: VALID_MODEL_DRIVEN_SUBTYPES.includes(modelDriven.subtype as PowerAppsModelDrivenSubtype)
        ? modelDriven.subtype as PowerAppsModelDrivenSubtype
        : "",
      dataverseAvailability: toDecisionStatus(modelDriven.dataverseAvailability),
      modelDrivenLicensingStatus: toDecisionStatus(modelDriven.modelDrivenLicensingStatus),
      environmentAccessStatus: toDecisionStatus(modelDriven.environmentAccessStatus),
      solutionPermissionStatus: toDecisionStatus(modelDriven.solutionPermissionStatus),
      tableCreationPermissionStatus: toDecisionStatus(modelDriven.tableCreationPermissionStatus),
      securityRoleConfigurationPermissionStatus: toDecisionStatus(modelDriven.securityRoleConfigurationPermissionStatus),
      importPermissionStatus: toDecisionStatus(modelDriven.importPermissionStatus),
      deploymentPermissionStatus: toDecisionStatus(modelDriven.deploymentPermissionStatus),
      solutionArchitecture: asString(modelDriven.solutionArchitecture),
      tables: asString(modelDriven.tables),
      columns: asString(modelDriven.columns),
      relationships: asString(modelDriven.relationships),
      choices: asString(modelDriven.choices),
      forms: asString(modelDriven.forms),
      views: asString(modelDriven.views),
      charts: asString(modelDriven.charts),
      dashboards: asString(modelDriven.dashboards),
      appPages: asString(modelDriven.appPages),
      chartsDecision: createApplicabilityDecision(isObject(modelDriven.chartsDecision) ? modelDriven.chartsDecision : {}),
      dashboardsDecision: createApplicabilityDecision(isObject(modelDriven.dashboardsDecision) ? modelDriven.dashboardsDecision : {}),
      appPagesDecision: createApplicabilityDecision(isObject(modelDriven.appPagesDecision) ? modelDriven.appPagesDecision : {}),
      formsAndViewsStatus: toDecisionStatus(modelDriven.formsAndViewsStatus),
      navigation: asString(modelDriven.navigation),
      navigationDefinitions: asString(modelDriven.navigationDefinitions),
      navigationStatus: toDecisionStatus(modelDriven.navigationStatus),
      customPages: asString(modelDriven.customPages),
      customPagesDecision: createApplicabilityDecision(isObject(modelDriven.customPagesDecision) ? modelDriven.customPagesDecision : {}),
      businessRules: asString(modelDriven.businessRules),
      businessRulesDecision: createApplicabilityDecision(isObject(modelDriven.businessRulesDecision) ? modelDriven.businessRulesDecision : {}),
      validationRulesDecision: createApplicabilityDecision(isObject(modelDriven.validationRulesDecision) ? modelDriven.validationRulesDecision : {}),
      duplicatePreventionDecision: createApplicabilityDecision(isObject(modelDriven.duplicatePreventionDecision) ? modelDriven.duplicatePreventionDecision : {}),
      businessProcessFlows: asString(modelDriven.businessProcessFlows),
      businessProcessFlowsDecision: createApplicabilityDecision(isObject(modelDriven.businessProcessFlowsDecision) ? modelDriven.businessProcessFlowsDecision : {}),
      automations: asString(modelDriven.automations),
      automationsDecision: createApplicabilityDecision(isObject(modelDriven.automationsDecision) ? modelDriven.automationsDecision : {}),
      businessLogicStatus: toDecisionStatus(modelDriven.businessLogicStatus),
      securityRoles: asString(modelDriven.securityRoles),
      teams: asString(modelDriven.teams),
      fieldSecurityProfiles: asString(modelDriven.fieldSecurityProfiles),
      teamModelDecision: createApplicabilityDecision(isObject(modelDriven.teamModelDecision) ? modelDriven.teamModelDecision : {}),
      hierarchySecurityDecision: createApplicabilityDecision(isObject(modelDriven.hierarchySecurityDecision) ? modelDriven.hierarchySecurityDecision : {}),
      fieldSecurityDecision: createApplicabilityDecision(isObject(modelDriven.fieldSecurityDecision) ? modelDriven.fieldSecurityDecision : {}),
      applicationUsersDecision: createApplicabilityDecision(isObject(modelDriven.applicationUsersDecision) ? modelDriven.applicationUsersDecision : {}),
      servicePrincipalsDecision: createApplicabilityDecision(isObject(modelDriven.servicePrincipalsDecision) ? modelDriven.servicePrincipalsDecision : {}),
      environmentVariables: asString(modelDriven.environmentVariables),
      connectionReferences: asString(modelDriven.connectionReferences),
      clientSideJavaScript: asString(modelDriven.clientSideJavaScript),
      clientSideJavaScriptDecision: createApplicabilityDecision(isObject(modelDriven.clientSideJavaScriptDecision) ? modelDriven.clientSideJavaScriptDecision : {}),
      webResources: asString(modelDriven.webResources),
      webResourcesDecision: createApplicabilityDecision(isObject(modelDriven.webResourcesDecision) ? modelDriven.webResourcesDecision : {}),
      htmlWebResourcesDecision: createApplicabilityDecision(isObject(modelDriven.htmlWebResourcesDecision) ? modelDriven.htmlWebResourcesDecision : {}),
      imageWebResourcesDecision: createApplicabilityDecision(isObject(modelDriven.imageWebResourcesDecision) ? modelDriven.imageWebResourcesDecision : {}),
      plugins: asString(modelDriven.plugins),
      pluginsDecision: createApplicabilityDecision(isObject(modelDriven.pluginsDecision) ? modelDriven.pluginsDecision : {}),
      customWorkflowActivitiesDecision: createApplicabilityDecision(isObject(modelDriven.customWorkflowActivitiesDecision) ? modelDriven.customWorkflowActivitiesDecision : {}),
      customApis: asString(modelDriven.customApis),
      customApisDecision: createApplicabilityDecision(isObject(modelDriven.customApisDecision) ? modelDriven.customApisDecision : {}),
      pcfControls: asString(modelDriven.pcfControls),
      pcfControlsDecision: createApplicabilityDecision(isObject(modelDriven.pcfControlsDecision) ? modelDriven.pcfControlsDecision : {}),
      commandBarRulesDecision: createApplicabilityDecision(isObject(modelDriven.commandBarRulesDecision) ? modelDriven.commandBarRulesDecision : {}),
      azureIntegrationsDecision: createApplicabilityDecision(isObject(modelDriven.azureIntegrationsDecision) ? modelDriven.azureIntegrationsDecision : {}),
      externalServicesDecision: createApplicabilityDecision(isObject(modelDriven.externalServicesDecision) ? modelDriven.externalServicesDecision : {}),
      extensionsStatus: toDecisionStatus(modelDriven.extensionsStatus),
      schemaStatus: toDecisionStatus(modelDriven.schemaStatus),
      logicalNameStatus: toDecisionStatus(modelDriven.logicalNameStatus),
      solutionArchitectureStatus: toDecisionStatus(modelDriven.solutionArchitectureStatus),
      solutionSourceStatus: asString(modelDriven.solutionSourceStatus),
      securityReviewStatus: toDecisionStatus(modelDriven.securityReviewStatus),
      dataverseSchemaConfirmationStatus: toDecisionStatus(modelDriven.dataverseSchemaConfirmationStatus ?? modelDriven.schemaStatus),
      solutionArchitectureConfirmationStatus: toDecisionStatus(modelDriven.solutionArchitectureConfirmationStatus ?? modelDriven.solutionArchitectureStatus),
      securityArchitectureStatus: toDecisionStatus(modelDriven.securityArchitectureStatus ?? modelDriven.securityReviewStatus),
      almReadinessStatus: toDecisionStatus(modelDriven.almReadinessStatus),
      manualConfigurationStatus: asString(modelDriven.manualConfigurationStatus),
      testingStatus: asString(modelDriven.testingStatus),
      importStatus: asString(modelDriven.importStatus),
      publicationStatus: asString(modelDriven.publicationStatus),
      deploymentStatus: asString(modelDriven.deploymentStatus),
      dataverseTableSchemas: Array.isArray(modelDriven.dataverseTableSchemas)
        ? modelDriven.dataverseTableSchemas.map((item) => createDefaultDataverseTable(isObject(item) ? {
            id: asString(item.id),
            displayName: asString(item.displayName),
            pluralDisplayName: asString(item.pluralDisplayName),
            logicalName: asString(item.logicalName),
            schemaName: asString(item.schemaName),
            ownershipType: asString(item.ownershipType),
            primaryNameColumn: asString(item.primaryNameColumn),
            purpose: asString(item.purpose),
            expectedRecordCount: asString(item.expectedRecordCount),
            auditStatus: asString(item.auditStatus),
            searchRequirement: asString(item.searchRequirement),
            securityNotes: asString(item.securityNotes),
            confirmationStatus: toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      dataverseColumnSchemas: Array.isArray(modelDriven.dataverseColumnSchemas)
        ? modelDriven.dataverseColumnSchemas.map((item) => createDefaultDataverseColumn(isObject(item) ? {
            id: asString(item.id),
            tableId: asString(item.tableId),
            displayName: asString(item.displayName),
            logicalName: asString(item.logicalName),
            schemaName: asString(item.schemaName),
            dataType: asString(item.dataType),
            requiredLevel: asString(item.requiredLevel),
            defaultValue: asString(item.defaultValue),
            choiceDefinition: asString(item.choiceDefinition),
            lookupTarget: asString(item.lookupTarget),
            calculatedColumnRequirement: asString(item.calculatedColumnRequirement),
            formulaColumnRequirement: asString(item.formulaColumnRequirement),
            rollupColumnRequirement: asString(item.rollupColumnRequirement),
            auditStatus: asString(item.auditStatus),
            sensitiveDataStatus: asString(item.sensitiveDataStatus),
            confirmationStatus: !asString(item.tableId) ? "reviewNeeded" : toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : [],
      dataverseRelationshipSchemas: Array.isArray(modelDriven.dataverseRelationshipSchemas)
        ? modelDriven.dataverseRelationshipSchemas.map((item) => createDefaultDataverseRelationship(isObject(item) ? {
            id: asString(item.id),
            relationshipType: asString(item.relationshipType),
            parentTableId: asString(item.parentTableId),
            childTableId: asString(item.childTableId),
            parentTable: asString(item.parentTable),
            childTable: asString(item.childTable),
            relationshipSchemaName: asString(item.relationshipSchemaName),
            requiredStatus: asString(item.requiredStatus),
            referentialBehavior: asString(item.referentialBehavior),
            cascadeBehavior: asString(item.cascadeBehavior),
            navigationBehavior: asString(item.navigationBehavior),
            confirmationStatus: !asString(item.parentTableId) || !asString(item.childTableId) ? "reviewNeeded" : toDecisionStatus(item.confirmationStatus),
            confirmationSource: asString(item.confirmationSource)
          } : {}))
        : []
    };
  }

  const connectorIds = new Set(normalized.common.connectors.map((connector) => connector.id).filter(Boolean));
  normalized.common.connectors = normalized.common.connectors.map((connector) => ({
    ...connector,
    canvasRole: connector.canvasRole === "primary" || connector.canvasRole === "secondary" ? connector.canvasRole : "",
    classificationConfirmed: connector.classificationConfirmationStatus === "confirmed",
    licensingConfirmed: connector.licensingConfirmationStatus === "confirmed"
  }));
  if (normalized.canvas) {
    const roleState = reconcileCanvasConnectorRoles(normalized.common.connectors, normalized.canvas.primaryConnectorId, normalized.canvas.secondaryConnectorIds);
    normalized.common.connectors = roleState.connectors;
    normalized.canvas.primaryConnectorId = roleState.primaryConnectorId;
    normalized.canvas.secondaryConnectorIds = roleState.secondaryConnectorIds;

    const listIds = new Set(normalized.canvas.sharePointListSchemas.map((list) => list.id));
    const libraryIds = new Set(normalized.canvas.sharePointLibrarySchemas.map((library) => library.id));
    normalized.canvas.sharePointColumnSchemas = normalized.canvas.sharePointColumnSchemas.map((column) => {
      const validParent = column.parentType === "list"
        ? listIds.has(column.parentId)
        : column.parentType === "library"
          ? libraryIds.has(column.parentId)
          : false;
      return validParent ? column : { ...column, confirmationStatus: "reviewNeeded" };
    });

    const dataverseTableIds = new Set(normalized.canvas.dataverseTableSchemas.map((table) => table.id));
    normalized.canvas.dataverseColumnSchemas = normalized.canvas.dataverseColumnSchemas.map((column) =>
      dataverseTableIds.has(column.tableId) ? column : { ...column, confirmationStatus: "reviewNeeded" }
    );
    normalized.canvas.dataverseRelationshipSchemas = normalized.canvas.dataverseRelationshipSchemas.map((relationship) =>
      dataverseTableIds.has(relationship.parentTableId) && dataverseTableIds.has(relationship.childTableId)
        ? relationship
        : { ...relationship, confirmationStatus: "reviewNeeded" }
    );

    const resourceConnectorById = new Map(normalized.canvas.connectorResourceSchemas.map((resource) => [resource.id, resource.connectorId]));
    normalized.canvas.connectorResourceSchemas = normalized.canvas.connectorResourceSchemas.map((resource) =>
      connectorIds.has(resource.connectorId) ? resource : { ...resource, confirmationStatus: "reviewNeeded" }
    );
    normalized.canvas.connectorFieldSchemas = normalized.canvas.connectorFieldSchemas.map((field) =>
      connectorIds.has(field.connectorId) && resourceConnectorById.get(field.resourceId) === field.connectorId
        ? field
        : { ...field, confirmationStatus: "reviewNeeded" }
    );
  }

  if (normalized.modelDriven) {
    const dataverseTableIds = new Set(normalized.modelDriven.dataverseTableSchemas.map((table) => table.id));
    normalized.modelDriven.dataverseColumnSchemas = normalized.modelDriven.dataverseColumnSchemas.map((column) =>
      dataverseTableIds.has(column.tableId) ? column : { ...column, confirmationStatus: "reviewNeeded" }
    );
    normalized.modelDriven.dataverseRelationshipSchemas = normalized.modelDriven.dataverseRelationshipSchemas.map((relationship) =>
      dataverseTableIds.has(relationship.parentTableId) && dataverseTableIds.has(relationship.childTableId)
        ? relationship
        : { ...relationship, confirmationStatus: "reviewNeeded" }
    );
  }

  return normalized;
}
