export const PROJECT_STATUSES = [
  "Intake Started",
  "Intake Complete",
  "Project Package Generated",
  "Architect Review Needed",
  "Ready for Codex",
  "In Development",
  "Needs Review",
  "Complete"
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const REVIEW_STATUSES = [
  "Not reviewed",
  "Review needed",
  "In review",
  "Approved",
  "Changes requested"
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type StorageVersion = 1 | 2;

export const REVIEW_ITEM_STATUSES = [
  "Needs answer",
  "Answered",
  "Not applicable",
  "Deferred"
] as const;
export type ReviewItemStatus = (typeof REVIEW_ITEM_STATUSES)[number];

export const CLIENT_REVIEW_SECTIONS = [
  "Foundation",
  "Branding",
  "Users",
  "Features",
  "Data",
  "Workflows",
  "Security",
  "Content",
  "Deployment",
  "Testing",
  "Connector selection",
  "Connector classification",
  "Licensing",
  "Environment",
  "Data-source schema",
  "Connector schema",
  "Internal or logical names",
  "Screen structure",
  "Power Fx planning",
  "YAML planning",
  "Delegation planning",
  "Dataverse eligibility",
  "Dataverse schema",
  "Solution architecture",
  "Forms and views",
  "Navigation",
  "Security roles",
  "Business logic",
  "Business rules",
  "Business process flows",
  "Automations",
  "Extensions",
  "External connector selection",
  "External connector classification",
  "External connector licensing",
  "ALM"
] as const;
export type ClientReviewSection = (typeof CLIENT_REVIEW_SECTIONS)[number];

export const READINESS_CHECKLIST_IDS = [
  "projectTypeConfirmed",
  "scopeReviewed",
  "requiredGapsResolved",
  "brandingConfirmed",
  "screensConfirmed",
  "dataModelConfirmed",
  "workflowsConfirmed",
  "securityConfirmed",
  "acceptanceCriteriaReviewed",
  "clientQuestionsResolved",
  "draftPackageReviewed",
  "codexInstructionsReady",
  "powerPlatformGatesConfirmed"
] as const;
export type ReadinessChecklistId = (typeof READINESS_CHECKLIST_IDS)[number];
export type ReadinessConfirmations = Partial<Record<ReadinessChecklistId, boolean>>;

export type ProjectType =
  | "staticWebsite"
  | "businessWebsite"
  | "webApplication"
  | "mobileApp"
  | "androidApp"
  | "iosApp"
  | "game"
  | "dashboardReporting"
  | "microsoft365"
  | "powerAppsCanvas"
  | "powerAppsModelDriven"
  | "automationWorkflow"
  | "apiBackend"
  | "ecommerceSite"
  | "aiAssistantChatbot"
  | "desktopSoftware"
  | "otherDigitalProject";

export type PowerAppsCanvasSubtype =
  | "blankResponsive"
  | "tablet"
  | "phone"
  | "sharePointCustomized"
  | "teamsEmbedded"
  | "sharePointOnline"
  | "microsoftLists"
  | "dataverse"
  | "otherConnector"
  | "multipleDataSources"
  | "customPage"
  | "other";

export type PowerAppsModelDrivenSubtype =
  | "standardBusiness"
  | "departmental"
  | "caseManagement"
  | "requestManagement"
  | "assetInventory"
  | "projectTracking"
  | "complianceAudit"
  | "customPages"
  | "powerAutomate"
  | "pcf"
  | "pluginsCustomApis"
  | "other";

export type ConnectorClassification =
  | "standard"
  | "premium"
  | "custom"
  | "unknown"
  | "notApplicable";

export type ConnectorOperation =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "restore"
  | "upload"
  | "download";

export type CanvasDataSourceType =
  | "sharePointList"
  | "sharePointLibrary"
  | "microsoftList"
  | "dataverse"
  | "excel"
  | "sqlServer"
  | "microsoft365Connector"
  | "customConnector"
  | "externalApi"
  | "otherConnector"
  | "multiple"
  | "undecided";

export type PowerPlatformGateStatus =
  | "notStarted"
  | "missingInformation"
  | "blocked"
  | "reviewNeeded"
  | "confirmed"
  | "ready"
  | "inProgress"
  | "manualValidationRequired"
  | "passed"
  | "failed"
  | "notApplicable";

export type PowerPlatformDecisionStatus =
  | "notStarted"
  | "missingInformation"
  | "reviewNeeded"
  | "confirmed"
  | "blocked"
  | "notApplicable";

export type PowerPlatformStatusValue = PowerPlatformDecisionStatus | (string & {});

export type CanvasConnectorRole = "primary" | "secondary" | "";

export type SelectableCanvasDataSourceType = Exclude<CanvasDataSourceType, "multiple" | "undecided">;

export interface PowerPlatformConnector {
  id: string;
  displayName: string;
  purpose: string;
  dataSourceName: string;
  dataSourceType: string;
  canvasRole?: CanvasConnectorRole;
  connectorClassification: ConnectorClassification;
  classificationConfirmed: boolean;
  classificationConfirmationStatus?: PowerPlatformStatusValue;
  licenceRequirement: string;
  licensingConfirmed: boolean;
  licensingConfirmationStatus?: PowerPlatformStatusValue;
  authenticationMethod: string;
  gatewayRequirement: string;
  environmentRequirement: string;
  dlpImpact: string;
  delegationSupport: string;
  expectedRecordVolume: string;
  supportedOperations: Partial<Record<ConnectorOperation, boolean>>;
  offlineSupport: string;
  securityNotes: string;
  limitations: string;
  approvalStatus: string;
  approvalConfirmationStatus?: PowerPlatformStatusValue;
}

export interface SharePointListSchema {
  id: string;
  displayName: string;
  purpose: string;
  expectedRecordCount: string;
  attachmentsEnabled: string;
  versioningExpectation: string;
  permissionExpectation: string;
  recordStatusModel: string;
  archiveBehavior: string;
  restoreBehavior: string;
  confirmationStatus: PowerPlatformDecisionStatus;
  confirmationSource: string;
}

export interface SharePointColumnSchema {
  id: string;
  parentType: "list" | "library" | "";
  parentId: string;
  displayName: string;
  internalName: string;
  columnType: string;
  requiredStatus: string;
  defaultValue: string;
  choiceValues: string;
  lookupList: string;
  lookupColumn: string;
  personFieldBehavior: string;
  dateTimeBehavior: string;
  indexedStatus: string;
  uniqueValueStatus: string;
  sensitiveDataStatus: string;
  notes: string;
  confirmationStatus: PowerPlatformDecisionStatus;
  confirmationSource: string;
}

export interface SharePointLibrarySchema {
  id: string;
  displayName: string;
  purpose: string;
  folderStructure: string;
  contentTypes: string;
  fileTypes: string;
  fileSizeExpectations: string;
  uploadBehavior: string;
  downloadBehavior: string;
  versioning: string;
  permissions: string;
  retention: string;
  metadataColumnIds: string[];
  confirmationStatus: PowerPlatformDecisionStatus;
  confirmationSource: string;
}

export interface DataverseTableSchema {
  id: string;
  displayName: string;
  pluralDisplayName: string;
  logicalName: string;
  schemaName: string;
  ownershipType: string;
  primaryNameColumn: string;
  purpose: string;
  expectedRecordCount: string;
  auditStatus: string;
  searchRequirement: string;
  securityNotes: string;
  confirmationStatus: PowerPlatformDecisionStatus;
  confirmationSource: string;
}

export interface DataverseColumnSchema {
  id: string;
  tableId: string;
  displayName: string;
  logicalName: string;
  schemaName: string;
  dataType: string;
  requiredLevel: string;
  defaultValue: string;
  choiceDefinition: string;
  lookupTarget: string;
  calculatedColumnRequirement: string;
  formulaColumnRequirement: string;
  rollupColumnRequirement: string;
  auditStatus: string;
  sensitiveDataStatus: string;
  confirmationStatus: PowerPlatformDecisionStatus;
  confirmationSource: string;
}

export interface DataverseRelationshipSchema {
  id: string;
  relationshipType: string;
  parentTableId: string;
  childTableId: string;
  parentTable: string;
  childTable: string;
  relationshipSchemaName: string;
  requiredStatus: string;
  referentialBehavior: string;
  cascadeBehavior: string;
  navigationBehavior: string;
  confirmationStatus: PowerPlatformDecisionStatus;
  confirmationSource: string;
}

export interface ConnectorResourceSchema {
  id: string;
  connectorId: string;
  resourceName: string;
  resourceType: string;
  purpose: string;
  keyOrIdentifier: string;
  authenticationRequirement: string;
  queryLimitations: string;
  pagination: string;
  throttling: string;
  gatewayRequirement: string;
  confirmationStatus: PowerPlatformDecisionStatus;
  confirmationSource: string;
}

export interface ConnectorFieldSchema {
  id: string;
  connectorId: string;
  resourceId: string;
  displayName: string;
  fieldIdentifier: string;
  fieldType: string;
  requiredStatus: string;
  keyStatus: string;
  relationship: string;
  readBehavior: string;
  createBehavior: string;
  updateBehavior: string;
  deleteBehavior: string;
  confirmationStatus: PowerPlatformDecisionStatus;
  confirmationSource: string;
}

export type PowerPlatformApplicabilityStatus = "required" | "notApplicable" | "undecided";

export interface PowerPlatformApplicabilityDecision {
  status: PowerPlatformApplicabilityStatus;
  details: string;
  notApplicableReason: string;
  confirmationStatus: PowerPlatformDecisionStatus;
}

export interface PowerPlatformCommonData {
  appSubtype: PowerAppsCanvasSubtype | PowerAppsModelDrivenSubtype | "";
  tenant: string;
  environment: string;
  environmentType: string;
  developmentEnvironment: string;
  testEnvironment: string;
  productionEnvironment: string;
  environmentAccessStatus: PowerPlatformStatusValue;
  securityReviewStatus: PowerPlatformStatusValue;
  testingPlanConfirmationStatus: PowerPlatformStatusValue;
  almConfirmationStatus: PowerPlatformStatusValue;
  environmentCreationResponsibility: string;
  managedEnvironmentRequirement: string;
  dlpPolicyRequirements: string;
  administrativeLimitations: string;
  businessOwner: string;
  appOwner: string;
  technicalOwner: string;
  supportOwner: string;
  expectedUserCount: string;
  existingLicences: string;
  currentPowerAppsLicences: string;
  currentPowerAutomateLicences: string;
  dataverseAvailability: PowerPlatformStatusValue;
  premiumConnectorAvailability: PowerPlatformStatusValue;
  customConnectorAvailability: PowerPlatformStatusValue;
  powerBiLicensing: string;
  pcfRequirements: string;
  licensingBudgetConstraints: string;
  licensingStatus: string;
  licensingAssumptions: string;
  outstandingLicensingDecisions: string;
  licensingConfirmationStatus: PowerPlatformStatusValue;
  solutionAware: string;
  solutionName: string;
  solutionUniqueName: string;
  publisherName: string;
  publisherPrefix: string;
  sourceControlApproach: string;
  gitIntegration: string;
  powerPlatformCliAvailability: string;
  almApproach: string;
  deploymentMethod: string;
  deploymentResponsibility: string;
  deploymentStrategy: string;
  environmentVariables: string;
  connectionReferences: string;
  pipelineRequirements: string;
  rollbackExpectations: string;
  releaseApprovalResponsibility: string;
  authenticationRequirements: string;
  authorizationRequirements: string;
  roleBasedInterfaceExpectations: string;
  accessibilityRequirements: string;
  complianceRequirements: string;
  dataClassification: string;
  dataRetentionRequirements: string;
  auditRequirements: string;
  recordAccessRules: string;
  loggingRequirements: string;
  privacyRequirements: string;
  keyboardNavigationRequirements: string;
  screenReaderRequirements: string;
  accessibleLabelRequirements: string;
  focusOrderRequirements: string;
  colourContrastRequirements: string;
  errorMessageRequirements: string;
  responsiveTextRequirements: string;
  mobileAccessibilityRequirements: string;
  knownAccommodations: string;
  functionalTesting: string;
  connectorTesting: string;
  permissionTesting: string;
  securityTesting: string;
  accessibilityTesting: string;
  performanceTesting: string;
  volumeTesting: string;
  integrationTesting: string;
  regressionTesting: string;
  userAcceptanceTesting: string;
  deploymentTesting: string;
  productionSmokeTesting: string;
  connectors: PowerPlatformConnector[];
}

export interface PowerPlatformCanvasData {
  subtype: PowerAppsCanvasSubtype | "";
  responsiveMode: string;
  targetDevices: string;
  targetScreenSizes: string;
  orientation: string;
  supportedBrowsers: string;
  teamsEmbedding: string;
  controlGeneration: string;
  componentLibraryRequirement: string;
  customPageRequirement: string;
  mobileDeviceCapabilities: string;
  primaryDataSourceType: CanvasDataSourceType;
  selectedDataSourceTypes: SelectableCanvasDataSourceType[];
  primaryConnectorId: string;
  secondaryConnectorIds: string[];
  secondaryDataSourceDetails: string;
  sourcePurpose: string;
  sourceOwnership: string;
  readWriteResponsibilities: string;
  synchronizationExpectations: string;
  conflictHandling: string;
  sourceOfTruthDecision: string;
  sharePointSiteUrl: string;
  sharePointSiteTitle: string;
  sharePointSiteOwner: string;
  sharePointEnvironment: string;
  sharePointAccessStatus: string;
  sharePointListDefinitions: string;
  sharePointColumnDefinitions: string;
  sharePointLibraryDefinitions: string;
  sharePointListSchemas: SharePointListSchema[];
  sharePointColumnSchemas: SharePointColumnSchema[];
  sharePointLibrarySchemas: SharePointLibrarySchema[];
  dataverseEnvironment: string;
  dataverseSolution: string;
  dataverseSolutionUniqueName: string;
  dataversePublisher: string;
  dataversePublisherPrefix: string;
  dataverseTableDefinitions: string;
  dataverseColumnDefinitions: string;
  dataverseRelationshipDefinitions: string;
  dataverseSchemaConfirmationStatus: PowerPlatformStatusValue;
  dataverseTableSchemas: DataverseTableSchema[];
  dataverseColumnSchemas: DataverseColumnSchema[];
  dataverseRelationshipSchemas: DataverseRelationshipSchema[];
  otherConnectorSchemaDefinitions: string;
  otherConnectorFieldDefinitions: string;
  otherConnectorConfirmationSource: string;
  otherConnectorSchemaConfirmationStatus: PowerPlatformStatusValue;
  connectorResourceSchemas: ConnectorResourceSchema[];
  connectorFieldSchemas: ConnectorFieldSchema[];
  sharePointSites: string;
  sharePointLists: string;
  sharePointLibraries: string;
  dataverseTables: string;
  otherDataSources: string;
  expectedRecordCounts: string;
  offlineRequirements: string;
  synchronizationRequirements: string;
  attachmentRequirements: string;
  fileRequirements: string;
  screens: string;
  screenNames: string;
  screenPurposes: string;
  entryPoints: string;
  exitPoints: string;
  navigationStructure: string;
  canvasUserRoles: string;
  containers: string;
  components: string;
  galleries: string;
  forms: string;
  tables: string;
  dialogs: string;
  loadingStates: string;
  emptyStates: string;
  errorStates: string;
  responsiveRules: string;
  visibilityRules: string;
  displayModeRules: string;
  controls: string;
  appFormulasRequirements: string;
  startScreenRequirements: string;
  onStartRequirements: string;
  namedFormulaRequirements: string;
  globalVariableRequirements: string;
  contextVariableRequirements: string;
  collectionRequirements: string;
  createBehavior: string;
  readBehavior: string;
  updateBehavior: string;
  archiveBehavior: string;
  restoreBehavior: string;
  deleteRestrictions: string;
  validationRequirements: string;
  errorHandlingRequirements: string;
  notificationRequirements: string;
  searchRequirements: string;
  filteringRequirements: string;
  sortingRequirements: string;
  delegationRequirements: string;
  concurrentUpdateHandling: string;
  fullScreenYamlRequired: string;
  controlLevelYamlRequired: string;
  containerYamlRequired: string;
  componentYamlRequired: string;
  paYamlSourceRequired: string;
  expectedInstallationMethod: string;
  codeViewPasteMethod: string;
  existingSourceAvailability: string;
  existingAppDependencies: string;
  postPasteActions: string;
  validationResponsibility: string;
  namedFormulas: string;
  globalVariables: string;
  contextVariables: string;
  collections: string;
  schemaStatus: PowerPlatformStatusValue;
  internalNameStatus: PowerPlatformStatusValue;
  logicalNameStatus: PowerPlatformStatusValue;
  powerFxStatus: PowerPlatformStatusValue;
  yamlStatus: PowerPlatformStatusValue;
  delegationStatus: PowerPlatformStatusValue;
  manualInstallationStatus: string;
  studioValidationStatus: string;
  publicationStatus: string;
  deploymentStatus: string;
}

export interface PowerPlatformModelDrivenData {
  subtype: PowerAppsModelDrivenSubtype | "";
  dataverseAvailability: PowerPlatformStatusValue;
  modelDrivenLicensingStatus: PowerPlatformStatusValue;
  environmentAccessStatus: PowerPlatformStatusValue;
  solutionPermissionStatus: PowerPlatformStatusValue;
  tableCreationPermissionStatus: PowerPlatformStatusValue;
  securityRoleConfigurationPermissionStatus: PowerPlatformStatusValue;
  importPermissionStatus: PowerPlatformStatusValue;
  deploymentPermissionStatus: PowerPlatformStatusValue;
  managedStrategy: string;
  existingSolution: string;
  existingDataverseTables: string;
  newDataverseTables: string;
  standardTablesReused: string;
  activityTableRequirements: string;
  virtualTableRequirements: string;
  duplicateDetection: string;
  dataMigration: string;
  solutionArchitecture: string;
  tables: string;
  columns: string;
  relationships: string;
  choices: string;
  tableDefinitions: string;
  columnDefinitions: string;
  relationshipDefinitions: string;
  forms: string;
  views: string;
  formDefinitions: string;
  viewDefinitions: string;
  charts: string;
  dashboards: string;
  appPages: string;
  chartsDecision: PowerPlatformApplicabilityDecision;
  dashboardsDecision: PowerPlatformApplicabilityDecision;
  appPagesDecision: PowerPlatformApplicabilityDecision;
  formsAndViewsStatus: PowerPlatformStatusValue;
  navigation: string;
  navigationDefinitions: string;
  navigationStatus: PowerPlatformStatusValue;
  customPages: string;
  customPagesDecision: PowerPlatformApplicabilityDecision;
  businessRules: string;
  businessRulesDecision: PowerPlatformApplicabilityDecision;
  validationRulesDecision: PowerPlatformApplicabilityDecision;
  duplicatePreventionDecision: PowerPlatformApplicabilityDecision;
  businessProcessFlows: string;
  businessProcessFlowsDecision: PowerPlatformApplicabilityDecision;
  automations: string;
  automationsDecision: PowerPlatformApplicabilityDecision;
  businessLogicStatus: PowerPlatformStatusValue;
  securityRoles: string;
  teams: string;
  fieldSecurityProfiles: string;
  teamModelDecision: PowerPlatformApplicabilityDecision;
  hierarchySecurityDecision: PowerPlatformApplicabilityDecision;
  fieldSecurityDecision: PowerPlatformApplicabilityDecision;
  applicationUsersDecision: PowerPlatformApplicabilityDecision;
  servicePrincipalsDecision: PowerPlatformApplicabilityDecision;
  environmentVariables: string;
  connectionReferences: string;
  clientSideJavaScript: string;
  clientSideJavaScriptDecision: PowerPlatformApplicabilityDecision;
  webResources: string;
  webResourcesDecision: PowerPlatformApplicabilityDecision;
  htmlWebResourcesDecision: PowerPlatformApplicabilityDecision;
  imageWebResourcesDecision: PowerPlatformApplicabilityDecision;
  plugins: string;
  pluginsDecision: PowerPlatformApplicabilityDecision;
  customWorkflowActivitiesDecision: PowerPlatformApplicabilityDecision;
  customApis: string;
  customApisDecision: PowerPlatformApplicabilityDecision;
  pcfControls: string;
  pcfControlsDecision: PowerPlatformApplicabilityDecision;
  commandBarRules: string;
  commandBarRulesDecision: PowerPlatformApplicabilityDecision;
  azureIntegrationsDecision: PowerPlatformApplicabilityDecision;
  extensionsStatus: PowerPlatformStatusValue;
  validationRules: string;
  duplicatePrevention: string;
  businessUnits: string;
  ownerTeams: string;
  accessTeams: string;
  tablePrivileges: string;
  privilegeDepth: string;
  hierarchySecurity: string;
  sharingExpectations: string;
  recordOwnership: string;
  sensitiveFields: string;
  applicationUsers: string;
  servicePrincipals: string;
  htmlWebResources: string;
  imageWebResources: string;
  customWorkflowActivities: string;
  azureIntegrations: string;
  externalServices: string;
  externalServicesDecision: PowerPlatformApplicabilityDecision;
  schemaStatus: PowerPlatformStatusValue;
  logicalNameStatus: PowerPlatformStatusValue;
  solutionArchitectureStatus: PowerPlatformStatusValue;
  solutionSourceStatus: string;
  securityReviewStatus: PowerPlatformStatusValue;
  dataverseSchemaConfirmationStatus: PowerPlatformStatusValue;
  solutionArchitectureConfirmationStatus: PowerPlatformStatusValue;
  securityArchitectureStatus: PowerPlatformStatusValue;
  almReadinessStatus: PowerPlatformStatusValue;
  manualConfigurationStatus: string;
  testingStatus: string;
  importStatus: string;
  publicationStatus: string;
  deploymentStatus: string;
  dataverseTableSchemas: DataverseTableSchema[];
  dataverseColumnSchemas: DataverseColumnSchema[];
  dataverseRelationshipSchemas: DataverseRelationshipSchema[];
}

export interface PowerPlatformProgress {
  connectorSelection: PowerPlatformGateStatus;
  connectorClassification: PowerPlatformGateStatus;
  licensing: PowerPlatformGateStatus;
  environment: PowerPlatformGateStatus;
  schema: PowerPlatformGateStatus;
  nameConfirmation: PowerPlatformGateStatus;
  securityReview: PowerPlatformGateStatus;
  testing: PowerPlatformGateStatus;
  manualImplementation: PowerPlatformGateStatus;
  deployment: PowerPlatformGateStatus;
  canvas: {
    sharePointSchema: PowerPlatformGateStatus;
    dataverseSchema: PowerPlatformGateStatus;
    connectorSchema: PowerPlatformGateStatus;
    internalNames: PowerPlatformGateStatus;
    logicalNames: PowerPlatformGateStatus;
    powerFx: PowerPlatformGateStatus;
    yaml: PowerPlatformGateStatus;
    delegation: PowerPlatformGateStatus;
    studioValidation: PowerPlatformGateStatus;
    publication: PowerPlatformGateStatus;
  };
  modelDriven: {
    dataverseAvailability: PowerPlatformGateStatus;
    modelDrivenLicensing: PowerPlatformGateStatus;
    publisher: PowerPlatformGateStatus;
    dataverseSchema: PowerPlatformGateStatus;
    logicalNames: PowerPlatformGateStatus;
    solutionArchitecture: PowerPlatformGateStatus;
    solutionComponents: PowerPlatformGateStatus;
    securityRoles: PowerPlatformGateStatus;
    automation: PowerPlatformGateStatus;
    extensions: PowerPlatformGateStatus;
    sourceAvailability: PowerPlatformGateStatus;
    solutionValidation: PowerPlatformGateStatus;
    solutionImport: PowerPlatformGateStatus;
    publication: PowerPlatformGateStatus;
  };
}

export interface PowerPlatformProjectData {
  common: PowerPlatformCommonData;
  canvas?: PowerPlatformCanvasData;
  modelDriven?: PowerPlatformModelDrivenData;
  progress: PowerPlatformProgress;
}

export type BrandingRequirementLevel = "required" | "optional" | "conditional";

export type IntakeModuleId =
  | "foundation"
  | "users"
  | "features"
  | "data"
  | "workflows"
  | "security"
  | "branding"
  | "website"
  | "game"
  | "mobile"
  | "dashboard"
  | "microsoft365"
  | "automation"
  | "api";

export interface ProjectTypePreset {
  value: ProjectType;
  label: string;
  selectable?: boolean;
  isLegacy?: boolean;
  description: string;
  helperText: string;
  recommendedTargetPlatforms: readonly string[];
  requiredIntakeModules: readonly IntakeModuleId[];
  optionalIntakeModules: readonly IntakeModuleId[];
  brandingRequirementLevel: BrandingRequirementLevel;
  suggestedGeneratedDocumentNotes: readonly string[];
}

export interface ProjectIdentity {
  id: string;
  projectName: string;
}

export interface ClientDetails {
  clientName: string;
  businessName: string;
}

export interface ProjectIntake {
  appType: ProjectType | "";
  appPurpose: string;
  problemStatement: string;
  targetPlatform: string;
  audienceVisibility: string;
  targetUsers: string;
  userRoles: string;
  roleDescriptions: string;
  rolePermissionsSummary: string;
  internalUsers: string;
  externalUsers: string;
  adminUsers: string;
  accessibilityNotes: string;
  requiredFeatures: string;
  featurePriority: string;
  featureDescription: string;
  featureOwner: string;
  acceptanceNotes: string;
  workflows: string;
  workflowName: string;
  workflowTrigger: string;
  workflowSteps: string;
  workflowInputs: string;
  workflowOutputs: string;
  workflowRoles: string;
  workflowDecisionPoints: string;
  workflowFailureHandling: string;
  workflowOutcome: string;
  screens: string;
  dataSources: string;
  dataEntities: string;
  dataCollections: string;
  fields: string;
  fieldTypes: string;
  requiredDataFields: string;
  relationships: string;
  dataOwnership: string;
  dataRetentionNotes: string;
  keyFields: string;
  permissions: string;
  permissionRules: string;
  roleAccessNotes: string;
  sensitiveDataNotes: string;
  authenticationExpectation: string;
  authorizationExpectation: string;
  auditLoggingNeeds: string;
  dataProtectionExpectations: string;
  complianceNotes: string;
  automations: string;
  notifications: string;
  integrations: string;
  reportsDashboards: string;
  brandingNotes: string;
  brandStatus: string;
  logoStatus: string;
  logoFiles: string;
  primaryColors: string;
  secondaryColors: string;
  fontPreferences: string;
  brandTone: string;
  imageStyle: string;
  iconStyle: string;
  referenceSites: string;
  brandRestrictions: string;
  faviconNeeded: string;
  openGraphImageNeeded: string;
  socialAssetsNeeded: string;
  contentSource: string;
  approvedAssets: string;
  accessibilityContrastNotes: string;
  websitePages: string;
  websiteServices: string;
  websiteContactMethod: string;
  domainStatus: string;
  hostingStatus: string;
  seoKeywords: string;
  serviceArea: string;
  googleBusinessProfile: string;
  testimonials: string;
  websiteForms: string;
  websiteAnalytics: string;
  legalPages: string;
  imagesAndContent: string;
  gameGenre: string;
  gameTargetDevices: string;
  gameEngine: string;
  gameplayLoop: string;
  gameControls: string;
  gameLevels: string;
  gameScoring: string;
  gameCharacters: string;
  gameArtStyle: string;
  gameAudio: string;
  gameMonetization: string;
  gameStoreReleaseNeeds: string;
  mobilePlatforms: string;
  offlineSupport: string;
  pushNotifications: string;
  devicePermissions: string;
  accountSystem: string;
  appStoreRequirements: string;
  dataSync: string;
  privacyRequirements: string;
  dashboardDataSources: string;
  dashboardKpis: string;
  dashboardRefreshFrequency: string;
  dashboardFilters: string;
  drillThrough: string;
  dashboardPermissions: string;
  dashboardExportNeeds: string;
  dashboardAudience: string;
  sharePointLists: string;
  dataverseUse: string;
  powerAutomateFlows: string;
  powerBiReports: string;
  m365Connectors: string;
  m365Environment: string;
  dlpRestrictions: string;
  m365Permissions: string;
  automationTrigger: string;
  automationSteps: string;
  sourceSystem: string;
  targetSystem: string;
  approvalSteps: string;
  automationErrorHandling: string;
  retryLogic: string;
  automationLogs: string;
  notificationRules: string;
  apiEndpoints: string;
  dataContracts: string;
  apiAuthentication: string;
  apiConsumers: string;
  constraints: string;
  risks: string;
  assumptions: string;
  outOfScope: string;
  successCriteria: string;
}

export type ProjectInputField = keyof ProjectIntake | keyof ClientDetails | "appName";

export interface GeneratedDocument {
  fileName: string;
  folder: string;
  content: string;
}

export interface ReviewItem {
  id: string;
  section: ClientReviewSection;
  fieldKey: ProjectInputField;
  label: string;
  reason: string;
  recommendedQuestion: string;
  status: ReviewItemStatus;
  notApplicableReason: string;
  deferredReason: string;
  blocking: boolean;
  allowDeferred: boolean;
  source: "missing" | "warning" | "weak" | "gate";
  gateId?: string;
  updatedAt: string;
}

export interface ReadinessChecklistItem {
  id: ReadinessChecklistId;
  label: string;
  passed: boolean;
  manual: boolean;
  reason: string;
}

export interface ClientReviewReadiness {
  isReady: boolean;
  blockerCount: number;
  blockers: string[];
  checklist: ReadinessChecklistItem[];
  unresolvedItems: ReviewItem[];
}

export interface ReadinessSection {
  id: string;
  label: string;
  percent: number;
  state: "Not started" | "In progress" | "Complete";
  missingCount?: number;
  warningCount?: number;
}

export interface ProjectStageProgress {
  stageId: string;
  label: string;
  percentComplete: number;
  isComplete: boolean;
  missingCount: number;
  warningCount: number;
}

export interface DashboardNextAction {
  label: string;
  description: string;
  targetView: "dashboard" | "intake" | "scope" | "documents" | "export";
  targetStage?: number;
}

export interface DashboardWarning {
  level: "warning" | "error";
  message: string;
}

export interface ProjectSummary {
  id: string;
  projectName: string;
  archivedAt: string | null;
  status: ProjectStatus;
  reviewStatus: ReviewStatus;
  clientName: string;
  appType: string;
  lastUpdatedLabel: string;
  generatedFileCount: number;
  outstandingQuestionCount: number;
  completionPercent: number;
  nextAction: DashboardNextAction;
}

export interface ProjectRecord {
  identity: ProjectIdentity;
  client: ClientDetails;
  intake: ProjectIntake;
  generatedDocuments: GeneratedDocument[];
  generatedFileCount: number;
  outstandingQuestions: ProjectInputField[];
  readinessSections: ReadinessSection[];
  reviewItems: ReviewItem[];
  readinessConfirmations: ReadinessConfirmations;
  packageGeneratedAt: string | null;
  status: ProjectStatus;
  reviewStatus: ReviewStatus;
  archivedAt: string | null;
  sourceProjectId: string | null;
  duplicatedAt: string | null;
  powerPlatform?: PowerPlatformProjectData;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectManagementCounts {
  active: number;
  archived: number;
  readyForCodex: number;
  draft: number;
  withBlockers: number;
}

export interface ProjectPackage {
  projectId: string;
  projectName: string;
  rootFolder: string;
  folders: readonly string[];
  documents: GeneratedDocument[];
}

export interface StorageState {
  version: StorageVersion;
  activeProjectId: string | null;
  projects: ProjectRecord[];
}

export interface ValidationIssue {
  field: ProjectInputField;
  label: string;
  message: string;
}

export interface ValidationWarning {
  field: ProjectInputField;
  label: string;
  message: string;
}

export interface ValidationSectionResult {
  stageId: string;
  label: string;
  percentComplete: number;
  isComplete: boolean;
  missingFields: ProjectInputField[];
  warnings: string[];
}

export interface IntakeValidationResult {
  isValid: boolean;
  missingFields: ValidationIssue[];
  warnings: ValidationWarning[];
  sectionResults: ValidationSectionResult[];
}

export interface IntakeFieldDefinition {
  name: ProjectInputField;
  label: string;
  description: string;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
  inputType?: "text" | "select";
  options?: readonly string[];
}

export interface IntakeStep {
  id: string;
  label: string;
  title: string;
  description: string;
  fields: IntakeFieldDefinition[];
}

export interface IntakeStageDefinition {
  id: string;
  label: string;
  title: string;
  description: string;
  requiredFields: ProjectInputField[];
  optionalFields: ProjectInputField[];
  completionRules: string[];
  nextActionLabel: string;
  fields: IntakeFieldDefinition[];
}

export interface ProjectTemplateData extends ProjectIntake, ClientDetails {
  appName: string;
}
