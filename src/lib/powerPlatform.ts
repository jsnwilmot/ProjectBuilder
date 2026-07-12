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
  PowerPlatformGateStatus,
  PowerPlatformModelDrivenData,
  PowerPlatformProjectData,
  ProjectRecord,
  ProjectType
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

function toGateStatus(value: unknown): PowerPlatformGateStatus {
  return VALID_GATE_STATUSES.includes(value as PowerPlatformGateStatus)
    ? value as PowerPlatformGateStatus
    : "notStarted";
}

export function createDefaultConnector(overrides: Partial<PowerPlatformConnector> = {}): PowerPlatformConnector {
  return {
    id: overrides.id ?? "",
    displayName: overrides.displayName ?? "",
    purpose: overrides.purpose ?? "",
    dataSourceName: overrides.dataSourceName ?? "",
    dataSourceType: overrides.dataSourceType ?? "",
    connectorClassification: VALID_CONNECTOR_CLASSIFICATIONS.includes(overrides.connectorClassification as ConnectorClassification)
      ? overrides.connectorClassification as ConnectorClassification
      : "unknown",
    classificationConfirmed: overrides.classificationConfirmed === true,
    licenceRequirement: overrides.licenceRequirement ?? "",
    licensingConfirmed: overrides.licensingConfirmed === true,
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
    approvalStatus: overrides.approvalStatus ?? ""
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
    businessOwner: "",
    appOwner: "",
    technicalOwner: "",
    supportOwner: "",
    expectedUserCount: "",
    existingLicences: "",
    licensingStatus: "",
    licensingAssumptions: "",
    outstandingLicensingDecisions: "",
    solutionAware: "",
    solutionName: "",
    solutionUniqueName: "",
    publisherName: "",
    publisherPrefix: "",
    sourceControlApproach: "",
    almApproach: "",
    deploymentMethod: "",
    authenticationRequirements: "",
    authorizationRequirements: "",
    accessibilityRequirements: "",
    complianceRequirements: "",
    dataClassification: "",
    dataRetentionRequirements: "",
    auditRequirements: "",
    connectors: []
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
    controlGeneration: "",
    primaryDataSourceType: "undecided" as CanvasDataSourceType,
    primaryConnectorId: "",
    secondaryConnectorIds: [] as string[],
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
    containers: "",
    components: "",
    controls: "",
    namedFormulas: "",
    globalVariables: "",
    contextVariables: "",
    collections: "",
    schemaStatus: "",
    internalNameStatus: "",
    logicalNameStatus: "",
    powerFxStatus: "",
    yamlStatus: "",
    delegationStatus: "",
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
    environmentAccessStatus: "",
    solutionPermissionStatus: "",
    tableCreationPermissionStatus: "",
    importPermissionStatus: "",
    deploymentPermissionStatus: "",
    solutionArchitecture: "",
    tables: "",
    columns: "",
    relationships: "",
    choices: "",
    forms: "",
    views: "",
    charts: "",
    dashboards: "",
    appPages: "",
    navigation: "",
    customPages: "",
    businessRules: "",
    businessProcessFlows: "",
    automations: "",
    securityRoles: "",
    teams: "",
    fieldSecurityProfiles: "",
    environmentVariables: "",
    connectionReferences: "",
    webResources: "",
    plugins: "",
    customApis: "",
    pcfControls: "",
    schemaStatus: "",
    logicalNameStatus: "",
    solutionArchitectureStatus: "",
    solutionSourceStatus: "",
    securityReviewStatus: "",
    almReadinessStatus: "",
    manualConfigurationStatus: "",
    testingStatus: "",
    importStatus: "",
    publicationStatus: "",
    deploymentStatus: ""
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
    cloned.canvas.powerFxStatus = "";
    cloned.canvas.yamlStatus = "";
    cloned.canvas.delegationStatus = "";
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

function selectedCanvasDataSourceTypes(project: ProjectRecord): Set<CanvasDataSourceType> {
  const selected = new Set<CanvasDataSourceType>();
  const canvas = project.powerPlatform?.canvas;
  const connectors = project.powerPlatform?.common.connectors ?? [];
  if (!canvas) return selected;

  selected.add(toCanvasDataSourceType(canvas.primaryDataSourceType));

  for (const connectorId of canvas.secondaryConnectorIds) {
    const connector = connectors.find((candidate) => candidate.id === connectorId);
    if (!connector) continue;
    selected.add(toCanvasDataSourceType(connector.dataSourceType));
  }

  return selected;
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
  return selected.has("otherConnector") || selected.has("customConnector") || selected.has("externalApi");
}

export function usesMultipleDataSources(project: ProjectRecord): boolean {
  const selected = selectedCanvasDataSourceTypes(project);
  return selected.has("multiple") || selected.size > 1;
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
        connectorClassification: VALID_CONNECTOR_CLASSIFICATIONS.includes(candidate.connectorClassification as ConnectorClassification)
          ? candidate.connectorClassification as ConnectorClassification
          : "unknown",
        classificationConfirmed: candidate.classificationConfirmed === true,
        licenceRequirement: asString(candidate.licenceRequirement),
        licensingConfirmed: candidate.licensingConfirmed === true,
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
        approvalStatus: asString(candidate.approvalStatus)
      } : {}))
    : [];

  const progress = isObject(value.progress) ? value.progress : {};
  const canvasProgress = isObject(progress.canvas) ? progress.canvas : {};
  const modelDrivenProgress = isObject(progress.modelDriven) ? progress.modelDriven : {};

  const normalized: PowerPlatformProjectData = {
    common: {
      ...defaults.common,
      appSubtype: asString(common.appSubtype) as PowerPlatformCommonData["appSubtype"],
      tenant: asString(common.tenant),
      environment: asString(common.environment),
      environmentType: asString(common.environmentType),
      developmentEnvironment: asString(common.developmentEnvironment),
      testEnvironment: asString(common.testEnvironment),
      productionEnvironment: asString(common.productionEnvironment),
      businessOwner: asString(common.businessOwner),
      appOwner: asString(common.appOwner),
      technicalOwner: asString(common.technicalOwner),
      supportOwner: asString(common.supportOwner),
      expectedUserCount: asString(common.expectedUserCount),
      existingLicences: asString(common.existingLicences),
      licensingStatus: asString(common.licensingStatus),
      licensingAssumptions: asString(common.licensingAssumptions),
      outstandingLicensingDecisions: asString(common.outstandingLicensingDecisions),
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
      subtype: VALID_CANVAS_SUBTYPES.includes(canvas.subtype as PowerAppsCanvasSubtype)
        ? canvas.subtype as PowerAppsCanvasSubtype
        : "",
      responsiveMode: asString(canvas.responsiveMode),
      targetDevices: asString(canvas.targetDevices),
      targetScreenSizes: asString(canvas.targetScreenSizes),
      orientation: asString(canvas.orientation),
      controlGeneration: asString(canvas.controlGeneration),
      primaryDataSourceType: toCanvasDataSourceType(canvas.primaryDataSourceType),
      primaryConnectorId: asString(canvas.primaryConnectorId),
      secondaryConnectorIds: Array.isArray(canvas.secondaryConnectorIds)
        ? canvas.secondaryConnectorIds.map((item) => asString(item)).filter(Boolean)
        : [],
      sharePointSites: asString(canvas.sharePointSites),
      sharePointLists: asString(canvas.sharePointLists),
      sharePointLibraries: asString(canvas.sharePointLibraries),
      dataverseTables: asString(canvas.dataverseTables),
      otherDataSources: asString(canvas.otherDataSources),
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
      schemaStatus: asString(canvas.schemaStatus),
      internalNameStatus: asString(canvas.internalNameStatus),
      logicalNameStatus: asString(canvas.logicalNameStatus),
      powerFxStatus: asString(canvas.powerFxStatus),
      yamlStatus: asString(canvas.yamlStatus),
      delegationStatus: asString(canvas.delegationStatus),
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
      subtype: VALID_MODEL_DRIVEN_SUBTYPES.includes(modelDriven.subtype as PowerAppsModelDrivenSubtype)
        ? modelDriven.subtype as PowerAppsModelDrivenSubtype
        : "",
      dataverseAvailability: asString(modelDriven.dataverseAvailability) || "missingInformation",
      modelDrivenLicensingStatus: asString(modelDriven.modelDrivenLicensingStatus) || "missingInformation",
      environmentAccessStatus: asString(modelDriven.environmentAccessStatus),
      solutionPermissionStatus: asString(modelDriven.solutionPermissionStatus),
      tableCreationPermissionStatus: asString(modelDriven.tableCreationPermissionStatus),
      importPermissionStatus: asString(modelDriven.importPermissionStatus),
      deploymentPermissionStatus: asString(modelDriven.deploymentPermissionStatus),
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
      navigation: asString(modelDriven.navigation),
      customPages: asString(modelDriven.customPages),
      businessRules: asString(modelDriven.businessRules),
      businessProcessFlows: asString(modelDriven.businessProcessFlows),
      automations: asString(modelDriven.automations),
      securityRoles: asString(modelDriven.securityRoles),
      teams: asString(modelDriven.teams),
      fieldSecurityProfiles: asString(modelDriven.fieldSecurityProfiles),
      environmentVariables: asString(modelDriven.environmentVariables),
      connectionReferences: asString(modelDriven.connectionReferences),
      webResources: asString(modelDriven.webResources),
      plugins: asString(modelDriven.plugins),
      customApis: asString(modelDriven.customApis),
      pcfControls: asString(modelDriven.pcfControls),
      schemaStatus: asString(modelDriven.schemaStatus),
      logicalNameStatus: asString(modelDriven.logicalNameStatus),
      solutionArchitectureStatus: asString(modelDriven.solutionArchitectureStatus),
      solutionSourceStatus: asString(modelDriven.solutionSourceStatus),
      securityReviewStatus: asString(modelDriven.securityReviewStatus),
      almReadinessStatus: asString(modelDriven.almReadinessStatus),
      manualConfigurationStatus: asString(modelDriven.manualConfigurationStatus),
      testingStatus: asString(modelDriven.testingStatus),
      importStatus: asString(modelDriven.importStatus),
      publicationStatus: asString(modelDriven.publicationStatus),
      deploymentStatus: asString(modelDriven.deploymentStatus)
    };
  }

  return normalized;
}
