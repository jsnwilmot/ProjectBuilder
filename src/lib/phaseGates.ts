import type {
  PowerPlatformApplicabilityDecision,
  PowerPlatformGateStatus,
  ProjectRecord
} from "../types/project";
import {
  calculateAlmGate,
  calculateCanvasDataverseSchemaGate,
  calculateCanvasDelegationPlanningGate,
  calculateCanvasPowerFxPlanningGate,
  calculateCanvasSchemaGate,
  calculateCanvasYamlPlanningGate,
  calculateConnectorClassificationGate,
  calculateConnectorSelectionGate,
  calculateEnvironmentGate,
  calculateInternalNameGate,
  calculateLicensingGate,
  calculateLogicalNameGate,
  calculateModelDrivenBusinessLogicGate,
  calculateModelDrivenDataverseSchemaGate,
  calculateModelDrivenEligibilityGate,
  calculateModelDrivenExtensionsGate,
  calculateModelDrivenExternalConnectorClassificationGate,
  calculateModelDrivenExternalConnectorLicensingGate,
  calculateModelDrivenExternalConnectorSelectionGate,
  calculateModelDrivenFormsAndViewsGate,
  calculateModelDrivenNavigationGate,
  calculateModelDrivenSecurityArchitectureGate,
  calculateModelDrivenSolutionArchitectureGate,
  calculateOtherConnectorSchemaGate,
  calculatePowerPlatformReadiness,
  calculateSecurityReviewGate,
  calculateSharePointSchemaGate,
  calculateTestingPreparationGate,
  getSelectedCanvasDataSourceTypes,
  isCanvasProject,
  isModelDrivenProject
} from "./powerPlatform";
import { reconcileCanvasConnectorSelection, validateCanvasTargets } from "./canvasTargetValidation";
import { confirmedCanvasControls, effectiveCanvasExpectedRecordCounts } from "./canvasTraceability";

export type PhaseGateId =
  | "scope"
  | "projectType"
  | "currentBlockers"
  | "connectorSelection"
  | "primaryConnectorAssignment"
  | "secondaryConnectorAssignments"
  | "connectorClassification"
  | "licensing"
  | "environment"
  | "sharePointSchema"
  | "dataverseSchema"
  | "connectorSchema"
  | "schema"
  | "internalNames"
  | "logicalNames"
  | "connectorIdentifiers"
  | "appConfiguration"
  | "targetDevices"
  | "screenSizePlanning"
  | "screenMap"
  | "screenTargets"
  | "controlTargets"
  | "componentTargets"
  | "formulaTargets"
  | "yamlTargets"
  | "componentRequirements"
  | "namingStandards"
  | "powerFx"
  | "yaml"
  | "delegation"
  | "recordVolumes"
  | "connectorDelegation"
  | "fileRequirements"
  | "connectorPermissions"
  | "dataSourcePermissions"
  | "roleVisibility"
  | "security"
  | "accessibility"
  | "accessibilityTesting"
  | "controlInventory"
  | "connectionOwnership"
  | "gateway"
  | "dlp"
  | "testing"
  | "implementationSpecifications"
  | "acceptanceCriteria"
  | "alm"
  | "releaseApproval"
  | "deploymentResponsibility"
  | "allPowerPlatformGates"
  | "eligibility"
  | "dataverseAvailability"
  | "modelDrivenLicensing"
  | "solutionPermission"
  | "tableCreationPermission"
  | "securityRolePermission"
  | "importPermission"
  | "deploymentPermission"
  | "publisherPrefix"
  | "externalConnectorSelection"
  | "externalConnectorClassification"
  | "externalConnectorLicensing"
  | "authentication"
  | "approval"
  | "securityArchitecture"
  | "solutionArchitecture"
  | "formsAndViews"
  | "navigation"
  | "appPages"
  | "businessLogic"
  | "businessRules"
  | "businessProcessFlows"
  | "automations"
  | "chartsAndDashboards"
  | "customPages"
  | "canvasCustomPageRequirements"
  | "commandBar"
  | "clientScripting"
  | "extensions"
  | "pcf"
  | "plugins"
  | "customApis"
  | "webResources"
  | "htmlWebResources"
  | "imageWebResources"
  | "customWorkflowActivities"
  | "azureIntegrations"
  | "externalServices"
  | "connectionReferences"
  | "environmentVariables"
  | "dataMigration"
  | "environmentStrategy"
  | "sourceAvailability";

export interface PhaseGateResult {
  id: PhaseGateId;
  label: string;
  status: PowerPlatformGateStatus;
  blockingReason: string;
  sourceSection: string;
}

type PhaseGateEvaluator = (project: ProjectRecord) => PhaseGateResult;

const confirmedStatuses = new Set<PowerPlatformGateStatus>(["confirmed", "ready", "passed", "notApplicable"]);
const blockingStatuses = new Set<PowerPlatformGateStatus>(["notStarted", "missingInformation", "blocked", "failed"]);

function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulText(value: string | undefined | null): boolean {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  const normalized = value.trim().toLowerCase();
  return !/^(not decided|unknown|pending|tbd|to be determined|n\/a pending|none yet|needs review|unconfirmed|missing|no decision yet|no confirmation|no approved approach)$/i.test(normalized);
}

function statusFromText(values: Array<string | undefined | null>, missingStatus: PowerPlatformGateStatus = "missingInformation"): PowerPlatformGateStatus {
  return values.every(hasMeaningfulText) ? "confirmed" : missingStatus;
}

function statusFromDecision(value: string | undefined | null): PowerPlatformGateStatus {
  if (value === "confirmed" || value === "ready" || value === "passed" || value === "notApplicable") return value;
  if (value === "reviewNeeded" || value === "manualValidationRequired" || value === "inProgress") return value;
  if (value === "blocked" || value === "failed" || value === "notStarted") return value;
  return hasText(value) ? "reviewNeeded" : "missingInformation";
}

function result(
  id: PhaseGateId,
  label: string,
  status: PowerPlatformGateStatus,
  blockingReason: string,
  sourceSection: string
): PhaseGateResult {
  return { id, label, status, blockingReason, sourceSection };
}

function gate(
  id: PhaseGateId,
  label: string,
  sourceSection: string,
  evaluator: (project: ProjectRecord) => PowerPlatformGateStatus,
  blockingReason: string
): PhaseGateEvaluator {
  return (project) => result(id, label, evaluator(project), blockingReason, sourceSection);
}

function decisionGate(decision: PowerPlatformApplicabilityDecision | undefined): PowerPlatformGateStatus {
  if (!decision || decision.status === "undecided") return "missingInformation";
  if (decision.status === "notApplicable") {
    return hasText(decision.notApplicableReason) && decision.confirmationStatus === "confirmed" ? "notApplicable" : "missingInformation";
  }
  if (decision.status === "required") {
    if (!hasText(decision.details)) return "missingInformation";
    return decision.confirmationStatus === "confirmed" ? "confirmed" : "reviewNeeded";
  }
  return "missingInformation";
}

function fileApplicabilityGate(project: ProjectRecord): PowerPlatformGateStatus {
  const canvas = project.powerPlatform?.canvas;
  if (!isCanvasProject(project) || !canvas) return "notApplicable";
  const decision = canvas.fileApplicabilityDecision;
  if (!decision || decision.status === "undecided") return "missingInformation";
  if (decision.status === "notApplicable") {
    return hasMeaningfulText(decision.notApplicableReason) && decision.confirmationStatus === "confirmed" ? "notApplicable" : "missingInformation";
  }
  if (decision.status !== "required") return "missingInformation";
  const requiredFields = [
    decision.details,
    canvas.fileRequirements,
    canvas.attachmentRequirements,
    canvas.fileUploadRequirements,
    canvas.fileDownloadRequirements,
    canvas.fileMetadataRequirements,
    canvas.fileSizeRequirements,
    canvas.filePermissionRequirements,
    canvas.fileValidationRequirements
  ];
  if (!requiredFields.every(hasMeaningfulText)) return "missingInformation";
  const hasStructuredFileStore = canvas.sharePointLibrarySchemas.some((library) => library.confirmationStatus === "confirmed")
    || canvas.connectorResourceSchemas.some((resource) => resource.confirmationStatus === "confirmed")
    || canvas.connectorFieldSchemas.some((field) => field.confirmationStatus === "confirmed");
  if (!hasStructuredFileStore) return "missingInformation";
  return decision.confirmationStatus === "confirmed" ? "confirmed" : "reviewNeeded";
}

function aggregateDecisionGate(decisions: Array<PowerPlatformApplicabilityDecision | undefined>): PowerPlatformGateStatus {
  const statuses = decisions.map(decisionGate);
  if (statuses.some((status) => blockingStatuses.has(status))) return "missingInformation";
  if (statuses.some((status) => status === "reviewNeeded" || status === "manualValidationRequired" || status === "inProgress")) return "reviewNeeded";
  return statuses.some((status) => status === "confirmed") ? "confirmed" : "notApplicable";
}

function connectors(project: ProjectRecord) {
  return project.powerPlatform?.common.connectors ?? [];
}

function selectedConnectorIds(project: ProjectRecord): string[] {
  return reconcileCanvasConnectorSelection(project).activeConnectorIds;
}

function selectedConnectors(project: ProjectRecord) {
  const ids = new Set(selectedConnectorIds(project));
  const all = connectors(project);
  return ids.size > 0 ? all.filter((connector) => ids.has(connector.id)) : all;
}

function everySelectedConnector(project: ProjectRecord, fields: string[]): PowerPlatformGateStatus {
  const selected = selectedConnectors(project);
  if (selected.length === 0) return "notApplicable";
  return selected.every((connector) => fields.every((field) => hasMeaningfulText(String((connector as unknown as Record<string, unknown>)[field] ?? ""))))
    ? "confirmed"
    : "missingInformation";
}

function canvasScreenTargetGate(project: ProjectRecord): PowerPlatformGateStatus {
  return validateCanvasTargets(project).screenStatus;
}

function canvasControlTargetGate(project: ProjectRecord): PowerPlatformGateStatus {
  return validateCanvasTargets(project).controlStatus;
}

function canvasComponentTargetGate(project: ProjectRecord): PowerPlatformGateStatus {
  return validateCanvasTargets(project).componentStatus;
}

function canvasFormulaTargetGate(project: ProjectRecord): PowerPlatformGateStatus {
  return validateCanvasTargets(project).formulaStatus;
}

function canvasYamlTargetGate(project: ProjectRecord): PowerPlatformGateStatus {
  return validateCanvasTargets(project).yamlStatus;
}

function sourceAvailability(project: ProjectRecord): PowerPlatformGateStatus {
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!isModelDrivenProject(project) || !modelDriven) return "notApplicable";
  const status = modelDriven.sourceAvailabilityStatus;
  if (status === "notStarted" || !status) return "missingInformation";
  if (status === "missingInformation") return "missingInformation";
  if (status === "reviewNeeded") return "reviewNeeded";
  if (status === "blocked") return "blocked";
  if (status === "notApplicable") return "notApplicable";
  if (status === "confirmed") {
    return [
      modelDriven.sourceLocation,
      modelDriven.sourceType,
      modelDriven.sourceValidationEvidence,
      modelDriven.solutionVersion,
      modelDriven.lastUnpackedDate
    ].every(hasMeaningfulText) && modelDriven.sourceValidationStatus === "confirmed"
      ? "confirmed"
      : "missingInformation";
  }
  return hasMeaningfulText(String(status)) ? "reviewNeeded" : "missingInformation";
}

function currentBlockersGate(project: ProjectRecord): PowerPlatformGateStatus {
  return PHASE_GATE_EVALUATORS.scope(project).status === "confirmed" && PHASE_GATE_EVALUATORS.projectType(project).status === "confirmed"
    ? "confirmed"
    : "missingInformation";
}

export const PHASE_GATE_EVALUATORS = {
  scope: gate("scope", "Scope review", "Scope Review", (project) => statusFromText([
    project.intake.appPurpose,
    project.intake.requiredFeatures,
    project.intake.workflows,
    project.intake.outOfScope,
    project.intake.successCriteria
  ]), "Complete purpose, features, workflows, out-of-scope decisions, and success criteria."),
  projectType: gate("projectType", "Project type", "Foundation", (project) => hasText(project.intake.appType) ? "confirmed" : "missingInformation", "Select a project type."),
  currentBlockers: gate("currentBlockers", "Current blockers", "Client Review", currentBlockersGate, "Record project type and initial scope so current readiness blockers can be identified automatically."),
  connectorSelection: gate("connectorSelection", "Connector selection", "Power Platform connectors", calculateConnectorSelectionGate, "Confirm connector selection."),
  primaryConnectorAssignment: gate("primaryConnectorAssignment", "Primary connector assignment", "Power Platform connectors", calculateConnectorSelectionGate, "Assign the primary connector."),
  secondaryConnectorAssignments: gate("secondaryConnectorAssignments", "Secondary connector assignments", "Power Platform connectors", calculateConnectorSelectionGate, "Confirm secondary connector assignments for mixed-source projects."),
  connectorClassification: gate("connectorClassification", "Connector classification", "Power Platform connectors", calculateConnectorClassificationGate, "Confirm connector classifications."),
  licensing: gate("licensing", "Licensing", "Licensing", calculateLicensingGate, "Confirm licensing and premium/custom connector impacts."),
  environment: gate("environment", "Environment", "Environment", calculateEnvironmentGate, "Confirm environment access and names."),
  sharePointSchema: gate("sharePointSchema", "SharePoint schema", "Data model", calculateSharePointSchemaGate, "Confirm SharePoint lists, columns, and internal names."),
  dataverseSchema: gate("dataverseSchema", "Dataverse schema", "Data model", (project) => isModelDrivenProject(project) ? calculateModelDrivenDataverseSchemaGate(project) : calculateCanvasDataverseSchemaGate(project), "Confirm Dataverse tables, columns, relationships, and logical names."),
  connectorSchema: gate("connectorSchema", "Connector schema", "Data model", calculateOtherConnectorSchemaGate, "Confirm external connector resources and fields."),
  schema: gate("schema", "Applicable schema", "Data model", (project) => isModelDrivenProject(project) ? calculateModelDrivenDataverseSchemaGate(project) : calculateCanvasSchemaGate(project), "Confirm every applicable schema."),
  internalNames: gate("internalNames", "SharePoint internal names", "Data model", calculateInternalNameGate, "Confirm SharePoint internal names."),
  logicalNames: gate("logicalNames", "Dataverse logical names", "Data model", calculateLogicalNameGate, "Confirm Dataverse logical names."),
  connectorIdentifiers: gate("connectorIdentifiers", "Connector field identifiers", "Data model", calculateOtherConnectorSchemaGate, "Confirm external connector field identifiers."),
  appConfiguration: gate("appConfiguration", "Canvas app configuration", "Canvas configuration", (project) => {
    const canvas = project.powerPlatform?.canvas;
    return isCanvasProject(project) && canvas ? statusFromText([canvas.responsiveMode, canvas.orientation, canvas.targetDevices, canvas.targetScreenSizes, canvas.controlGeneration]) : "notApplicable";
  }, "Confirm layout, orientation, target devices, screen sizes, and control approach."),
  targetDevices: gate("targetDevices", "Target devices", "Canvas configuration", (project) => isCanvasProject(project) ? statusFromText([project.powerPlatform?.canvas?.targetDevices]) : "notApplicable", "Confirm at least one target device."),
  screenSizePlanning: gate("screenSizePlanning", "Screen-size planning", "Canvas configuration", (project) => {
    const canvas = project.powerPlatform?.canvas;
    return isCanvasProject(project) && canvas ? statusFromText([canvas.responsiveMode, canvas.targetScreenSizes || canvas.responsiveRules]) : "notApplicable";
  }, "Confirm responsive or fixed-layout decisions and dimensions or breakpoints."),
  screenMap: gate("screenMap", "Screen map", "Canvas screens", (project) => isCanvasProject(project) ? statusFromText([project.powerPlatform?.canvas?.screenNames || project.powerPlatform?.canvas?.screens || project.intake.screens]) : statusFromText([project.intake.screens]), "Confirm actual screen records or screen-planning records."),
  screenTargets: gate("screenTargets", "Structured screen targets", "Canvas implementation targets", canvasScreenTargetGate, "Confirm structured Canvas screen targets with stable IDs, approved screen names, purposes, confirmation status, and confirmation source."),
  controlTargets: gate("controlTargets", "Structured control targets", "Canvas implementation targets", canvasControlTargetGate, "Confirm structured Canvas control targets with valid screen references, approved names, control types, formula properties, data-source relationships where applicable, confirmation status, and confirmation source."),
  componentTargets: gate("componentTargets", "Structured component targets", "Canvas implementation targets", canvasComponentTargetGate, "Confirm structured component targets, or a controlled not-applicable component decision with reason and confirmation."),
  formulaTargets: gate("formulaTargets", "Power Fx target files", "Canvas implementation targets", canvasFormulaTargetGate, "Confirm formula-producing controls with stable screen/control IDs, formula properties, operations, dependencies, data-source references, and required fields."),
  yamlTargets: gate("yamlTargets", "Canvas YAML target files", "Canvas implementation targets", canvasYamlTargetGate, "Confirm screen, control, and applicable component YAML output type, parent relationship, installation location, and validation responsibility."),
  componentRequirements: gate("componentRequirements", "Component requirements", "Canvas components", (project) => {
    if (!isCanvasProject(project)) return "notApplicable";
    return canvasComponentTargetGate(project);
  }, "Confirm component-library and reusable-component decisions."),
  namingStandards: gate("namingStandards", "Naming standards", "Canvas configuration", (project) => {
    const canvas = project.powerPlatform?.canvas;
    if (!isCanvasProject(project) || !canvas) return "notApplicable";
    const fields = [
      canvas.screenNamingConvention,
      canvas.controlNamingConvention,
      canvas.controlTypePrefixes,
      canvas.variableNamingConvention,
      canvas.collectionNamingConvention,
      canvas.componentNamingConvention,
      canvas.formulaFileNamingConvention,
      canvas.yamlFileNamingConvention
    ];
    if (!fields.every(hasMeaningfulText)) return "missingInformation";
    return canvas.namingStandardConfirmationStatus === "confirmed" ? "confirmed" : "reviewNeeded";
  }, "Confirm naming standards for screens, controls, variables, collections, components, and files."),
  powerFx: gate("powerFx", "Power Fx planning", "Canvas formulas", calculateCanvasPowerFxPlanningGate, "Confirm Power Fx formula planning."),
  yaml: gate("yaml", "Canvas YAML planning", "Canvas YAML", calculateCanvasYamlPlanningGate, "Confirm Canvas YAML planning."),
  delegation: gate("delegation", "Delegation planning", "Canvas delegation", calculateCanvasDelegationPlanningGate, "Confirm delegation requirements and mitigations."),
  recordVolumes: gate("recordVolumes", "Record volumes", "Data model", (project) => {
    if (!isCanvasProject(project)) return "notApplicable";
    const canvas = project.powerPlatform?.canvas;
    if (!canvas) return "missingInformation";
    const selectedTypes = getSelectedCanvasDataSourceTypes(project);
    if (selectedTypes.includes("sharePointList") && canvas.sharePointListSchemas.some((item) => !hasText(item.expectedRecordCount))) return "missingInformation";
    if (selectedTypes.includes("dataverse") && canvas.dataverseTableSchemas.some((item) => !hasText(item.expectedRecordCount))) return "missingInformation";
    if (selectedTypes.includes("otherConnector") && canvas.connectorResourceSchemas.some((item) => !hasText(item.queryLimitations) || !hasText(item.pagination) || !hasText(item.throttling))) return "missingInformation";
    return hasText(effectiveCanvasExpectedRecordCounts(project).value) || canvas.sharePointListSchemas.length + canvas.dataverseTableSchemas.length + canvas.connectorResourceSchemas.length > 0 ? "confirmed" : "missingInformation";
  }, "Confirm expected record volumes for every selected backend."),
  connectorDelegation: gate("connectorDelegation", "Connector delegation support", "Canvas delegation", (project) => everySelectedConnector(project, ["delegationSupport", "limitations"]), "Confirm delegation support and mitigation for every selected connector."),
  fileRequirements: gate("fileRequirements", "File and attachment requirements", "Canvas files", (project) => {
    return fileApplicabilityGate(project);
  }, "Confirm file requirements or a confirmed not-applicable reason."),
  connectorPermissions: gate("connectorPermissions", "Connector permissions", "Security", (project) => {
    const selected = selectedConnectors(project);
    if (selected.length === 0) return "notApplicable";
    return selected.every((connector) =>
      hasMeaningfulText(connector.requiredConnectorPermissions)
      && hasMeaningfulText(connector.permissionOwner)
      && hasMeaningfulText(connector.permissionValidationMethod)
      && connector.permissionConfirmationStatus === "confirmed"
    ) ? "confirmed" : "missingInformation";
  }, "Confirm required connector permissions, owner, validation method, and controlled permission confirmation."),
  dataSourcePermissions: gate("dataSourcePermissions", "Data-source permissions", "Security", (project) => statusFromText([project.intake.permissionRules || project.intake.permissions || project.powerPlatform?.common.recordAccessRules]), "Confirm data-source permissions."),
  roleVisibility: gate("roleVisibility", "Role visibility", "Security", (project) => {
    const canvas = project.powerPlatform?.canvas;
    return isCanvasProject(project) ? statusFromText([canvas?.visibilityRules || project.intake.roleAccessNotes || project.intake.permissionRules]) : statusFromText([project.intake.roleAccessNotes || project.intake.permissionRules]);
  }, "Confirm role visibility requirements."),
  security: gate("security", "Security review", "Security", calculateSecurityReviewGate, "Confirm security planning."),
  accessibility: gate("accessibility", "Accessibility requirements", "Accessibility", (project) => statusFromText([project.intake.accessibilityNotes || project.powerPlatform?.common.accessibilityRequirements]), "Confirm accessibility requirements."),
  accessibilityTesting: gate("accessibilityTesting", "Accessibility testing", "Testing", (project) => statusFromText([project.powerPlatform?.common.accessibilityTesting || project.intake.accessibilityNotes]), "Prepare accessibility testing."),
  controlInventory: gate("controlInventory", "Control inventory", "Canvas controls", (project) => {
    if (!isCanvasProject(project)) return "notApplicable";
    return confirmedCanvasControls(project).length > 0 ? "confirmed" : statusFromText([project.powerPlatform?.canvas?.controls]);
  }, "Confirm screen and control inventory."),
  connectionOwnership: gate("connectionOwnership", "Connection ownership", "Connections", (project) => {
    const selected = selectedConnectors(project);
    if (selected.length === 0) return "notApplicable";
    return selected.every((connector) =>
      hasMeaningfulText(connector.connectionOwner)
      && hasMeaningfulText(connector.connectionOwnerRole)
      && connector.connectionOwnershipStatus === "confirmed"
    ) ? "confirmed" : "missingInformation";
  }, "Confirm a named owner, owner role, and controlled ownership status for every connection."),
  gateway: gate("gateway", "Gateway decisions", "Connections", (project) => everySelectedConnector(project, ["gatewayRequirement"]), "Confirm gateway requirement for every applicable connector."),
  dlp: gate("dlp", "DLP decisions", "Connections", (project) => everySelectedConnector(project, ["dlpImpact"]), "Confirm DLP impact for every applicable connector."),
  testing: gate("testing", "Testing preparation", "Testing", calculateTestingPreparationGate, "Confirm testing plan."),
  implementationSpecifications: gate("implementationSpecifications", "Implementation specifications", "Development", (project) => {
    if (!isCanvasProject(project)) return statusFromText([project.intake.requiredFeatures, project.intake.screens, project.intake.workflows, project.intake.acceptanceNotes]);
    const canvas = project.powerPlatform?.canvas;
    if (!canvas) return "missingInformation";
    const structuralGates: PowerPlatformGateStatus[] = [
      canvasScreenTargetGate(project),
      canvasControlTargetGate(project),
      canvasFormulaTargetGate(project)
    ];
    if (canvas.yamlStatus === "confirmed") structuralGates.push(canvasYamlTargetGate(project));
    if (structuralGates.some((status) => status === "missingInformation" || status === "blocked" || status === "failed" || status === "notStarted")) return "missingInformation";
    if (structuralGates.some((status) => status === "reviewNeeded" || status === "manualValidationRequired" || status === "inProgress")) return "reviewNeeded";
    return statusFromText([
      canvas.createBehavior,
      canvas.readBehavior,
      canvas.updateBehavior,
      canvas.archiveBehavior,
      canvas.restoreBehavior,
      canvas.searchRequirements,
      canvas.filteringRequirements,
      canvas.sortingRequirements,
      project.intake.acceptanceNotes
    ]);
  }, "Generate phase-relevant implementation specifications from structured targets, operations, data-source relationships, formula targets, and applicable YAML targets."),
  acceptanceCriteria: gate("acceptanceCriteria", "Acceptance criteria", "Acceptance Criteria", (project) => statusFromText([project.intake.successCriteria || project.intake.acceptanceNotes]), "Confirm measurable acceptance criteria."),
  alm: gate("alm", "ALM", "Deployment", calculateAlmGate, "Confirm ALM strategy."),
  releaseApproval: gate("releaseApproval", "Release approval", "Deployment", (project) => {
    const common = project.powerPlatform?.common;
    if (!common) return "notApplicable";
    if (!hasMeaningfulText(common.releaseApprover) || !hasMeaningfulText(common.releaseApprovalResponsibility)) return "missingInformation";
    return common.releaseApprovalStatus === "confirmed" ? "confirmed" : "reviewNeeded";
  }, "Confirm named release approver or role, approval responsibility, and controlled release-approval status."),
  deploymentResponsibility: gate("deploymentResponsibility", "Deployment responsibility", "Deployment", (project) => {
    const common = project.powerPlatform?.common;
    if (!common) return "notApplicable";
    if (!hasMeaningfulText(common.deploymentOwner) || !hasMeaningfulText(common.deploymentResponsibility)) return "missingInformation";
    return common.deploymentResponsibilityStatus === "confirmed" ? "confirmed" : "reviewNeeded";
  }, "Confirm named deployment owner or team, deployment responsibility, and controlled deployment-responsibility status."),
  allPowerPlatformGates: gate("allPowerPlatformGates", "All Power Platform gates", "Readiness", (project) => calculatePowerPlatformReadiness(project).isReadyForCodex ? "confirmed" : "missingInformation", "Resolve every applicable Power Platform gate."),
  eligibility: gate("eligibility", "Model-driven eligibility", "Model-driven foundation", calculateModelDrivenEligibilityGate, "Confirm model-driven eligibility."),
  dataverseAvailability: gate("dataverseAvailability", "Dataverse availability", "Model-driven foundation", (project) => statusFromDecision(project.powerPlatform?.modelDriven?.dataverseAvailability), "Confirm Dataverse availability."),
  modelDrivenLicensing: gate("modelDrivenLicensing", "Model-driven licensing", "Licensing", (project) => statusFromDecision(project.powerPlatform?.modelDriven?.modelDrivenLicensingStatus), "Confirm model-driven licensing."),
  solutionPermission: gate("solutionPermission", "Solution permission", "Model-driven solution", (project) => statusFromDecision(project.powerPlatform?.modelDriven?.solutionPermissionStatus), "Confirm solution customization permission."),
  tableCreationPermission: gate("tableCreationPermission", "Table creation permission", "Model-driven schema", (project) => statusFromDecision(project.powerPlatform?.modelDriven?.tableCreationPermissionStatus), "Confirm table creation permission."),
  securityRolePermission: gate("securityRolePermission", "Security-role permission", "Security", (project) => statusFromDecision(project.powerPlatform?.modelDriven?.securityRoleConfigurationPermissionStatus), "Confirm security-role configuration permission."),
  importPermission: gate("importPermission", "Import permission", "Deployment", (project) => statusFromDecision(project.powerPlatform?.modelDriven?.importPermissionStatus), "Confirm import permission."),
  deploymentPermission: gate("deploymentPermission", "Deployment permission", "Deployment", (project) => statusFromDecision(project.powerPlatform?.modelDriven?.deploymentPermissionStatus), "Confirm deployment permission."),
  publisherPrefix: gate("publisherPrefix", "Publisher and prefix", "Model-driven solution", (project) => statusFromText([project.powerPlatform?.common.publisherName, project.powerPlatform?.common.publisherPrefix]), "Confirm publisher and prefix."),
  externalConnectorSelection: gate("externalConnectorSelection", "External connector selection", "Connectors", calculateModelDrivenExternalConnectorSelectionGate, "Confirm external connector selection or no-connector decision."),
  externalConnectorClassification: gate("externalConnectorClassification", "External connector classification", "Connectors", calculateModelDrivenExternalConnectorClassificationGate, "Confirm external connector classification."),
  externalConnectorLicensing: gate("externalConnectorLicensing", "External connector licensing", "Licensing", calculateModelDrivenExternalConnectorLicensingGate, "Confirm external connector licensing."),
  authentication: gate("authentication", "Connector authentication", "Connectors", (project) => connectors(project).length === 0 ? "notApplicable" : everySelectedConnector(project, ["authenticationMethod"]), "Confirm authentication for every external connector."),
  approval: gate("approval", "Connector approval", "Connectors", (project) => connectors(project).length === 0 ? "notApplicable" : connectors(project).every((connector) => connector.approvalConfirmationStatus === "confirmed") ? "confirmed" : "missingInformation", "Confirm controlled connector approval."),
  securityArchitecture: gate("securityArchitecture", "Security architecture", "Security", calculateModelDrivenSecurityArchitectureGate, "Confirm security architecture."),
  solutionArchitecture: gate("solutionArchitecture", "Solution architecture", "Architecture", calculateModelDrivenSolutionArchitectureGate, "Confirm solution architecture."),
  formsAndViews: gate("formsAndViews", "Forms and views", "Model-driven UI", calculateModelDrivenFormsAndViewsGate, "Confirm forms and views."),
  navigation: gate("navigation", "Navigation", "Model-driven UI", calculateModelDrivenNavigationGate, "Confirm navigation."),
  appPages: gate("appPages", "App pages", "Model-driven UI", (project) => decisionGate(project.powerPlatform?.modelDriven?.appPagesDecision), "Confirm app-page applicability and details."),
  businessLogic: gate("businessLogic", "Business logic", "Model-driven logic", calculateModelDrivenBusinessLogicGate, "Confirm business logic."),
  businessRules: gate("businessRules", "Business rules", "Model-driven logic", (project) => decisionGate(project.powerPlatform?.modelDriven?.businessRulesDecision), "Confirm business-rule applicability."),
  businessProcessFlows: gate("businessProcessFlows", "Business process flows", "Model-driven logic", (project) => decisionGate(project.powerPlatform?.modelDriven?.businessProcessFlowsDecision), "Confirm BPF applicability."),
  automations: gate("automations", "Automations", "Model-driven logic", (project) => decisionGate(project.powerPlatform?.modelDriven?.automationsDecision), "Confirm automation applicability."),
  chartsAndDashboards: gate("chartsAndDashboards", "Charts and dashboards", "Model-driven UI", (project) => aggregateDecisionGate([project.powerPlatform?.modelDriven?.chartsDecision, project.powerPlatform?.modelDriven?.dashboardsDecision]), "Confirm chart and dashboard decisions."),
  customPages: gate("customPages", "Custom pages", "Model-driven UI", (project) => decisionGate(project.powerPlatform?.modelDriven?.customPagesDecision), "Confirm custom-page applicability."),
  canvasCustomPageRequirements: gate("canvasCustomPageRequirements", "Canvas custom-page requirements", "Model-driven UI", (project) => {
    const decision = project.powerPlatform?.modelDriven?.customPagesDecision;
    return decision?.status === "required" ? decisionGate(decision) : "notApplicable";
  }, "Confirm Canvas requirements for custom pages."),
  commandBar: gate("commandBar", "Command bar", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.commandBarRulesDecision), "Confirm command-bar applicability."),
  clientScripting: gate("clientScripting", "Client scripting", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.clientSideJavaScriptDecision), "Confirm client scripting applicability."),
  extensions: gate("extensions", "Extensions", "Model-driven extensions", calculateModelDrivenExtensionsGate, "Confirm extensions."),
  pcf: gate("pcf", "PCF controls", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.pcfControlsDecision), "Confirm PCF applicability."),
  plugins: gate("plugins", "Plug-ins", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.pluginsDecision), "Confirm plug-in applicability."),
  customApis: gate("customApis", "Custom APIs", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.customApisDecision), "Confirm custom API applicability."),
  webResources: gate("webResources", "Web resources", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.webResourcesDecision), "Confirm web-resource applicability."),
  htmlWebResources: gate("htmlWebResources", "HTML web resources", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.htmlWebResourcesDecision), "Confirm HTML web-resource applicability."),
  imageWebResources: gate("imageWebResources", "Image web resources", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.imageWebResourcesDecision), "Confirm image web-resource applicability."),
  customWorkflowActivities: gate("customWorkflowActivities", "Custom workflow activities", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.customWorkflowActivitiesDecision), "Confirm custom workflow activity applicability."),
  azureIntegrations: gate("azureIntegrations", "Azure integrations", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.azureIntegrationsDecision), "Confirm Azure integration applicability."),
  externalServices: gate("externalServices", "External services", "Model-driven extensions", (project) => decisionGate(project.powerPlatform?.modelDriven?.externalServicesDecision), "Confirm external service applicability."),
  connectionReferences: gate("connectionReferences", "Connection references", "ALM", (project) => statusFromText([project.powerPlatform?.common.connectionReferences]), "Confirm connection-reference strategy."),
  environmentVariables: gate("environmentVariables", "Environment variables", "ALM", (project) => statusFromText([project.powerPlatform?.common.environmentVariables]), "Confirm environment-variable strategy."),
  dataMigration: gate("dataMigration", "Data migration", "Data migration", (project) => statusFromText([project.powerPlatform?.modelDriven?.dataMigration]), "Confirm data-migration decision."),
  environmentStrategy: gate("environmentStrategy", "Environment strategy", "Deployment", (project) => statusFromText([
    project.powerPlatform?.common.developmentEnvironment,
    project.powerPlatform?.common.testEnvironment,
    project.powerPlatform?.common.productionEnvironment
  ]), "Confirm development, test, and production environments."),
  sourceAvailability: gate("sourceAvailability", "Source availability", "Source control and ALM", sourceAvailability, "Confirm source availability, location, type, validation evidence, solution version, and last unpacked date where source-dependent work is requested.")
} satisfies Record<PhaseGateId, PhaseGateEvaluator>;

export function evaluatePhaseGate(project: ProjectRecord, gateId: PhaseGateId): PhaseGateResult {
  return PHASE_GATE_EVALUATORS[gateId](project);
}

export function isPhaseGatePassing(result: PhaseGateResult): boolean {
  return confirmedStatuses.has(result.status);
}

export function assertKnownPhaseGateId(gateId: string): asserts gateId is PhaseGateId {
  if (!(gateId in PHASE_GATE_EVALUATORS)) {
    throw new Error(`Unknown phase gate ID: ${gateId}`);
  }
}
