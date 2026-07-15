import { DOCUMENT_PURPOSES } from "../data/documentPurposes";
import { expectedDocumentLocations } from "./powerPlatform";
import { evaluatePhaseGate, isPhaseGatePassing } from "./phaseGates";
import type { PhaseGateId } from "./phaseGates";
import type { GeneratedDocument, ProjectRecord } from "../types/project";

export type GeneratedDocumentStatus = "Draft" | "Review Required" | "Ready for Implementation" | "Not Applicable";
export type DocumentReviewStatus = GeneratedDocumentStatus;

export interface DocumentReviewItem extends GeneratedDocument {
  purpose: string;
  missingMarkerCount: number;
  status: DocumentReviewStatus;
}

const missingMarkerPrefixPattern = /\[MISSING:/g;
const reviewRequiredFiles = new Set([
  "PROJECT_SCOPE.md",
  "CLIENT_REQUIREMENTS.md",
  "ARCHITECT_INSTRUCTIONS.md",
  "APP_BLUEPRINT.md",
  "ACCEPTANCE_CRITERIA.md",
  "CODEX_INSTRUCTIONS.md",
  "PHASED_CODEX_PROMPTS.md"
]);

export interface DocumentStatusDefinition {
  fileName: string;
  applicable: (project: ProjectRecord) => boolean;
  gates: PhaseGateId[];
}

const alwaysApplicable = () => true;

export const DOCUMENT_STATUS_DEFINITIONS: DocumentStatusDefinition[] = [
  { fileName: "README.md", applicable: alwaysApplicable, gates: ["scope"] },
  { fileName: "PROJECT_SCOPE.md", applicable: alwaysApplicable, gates: ["scope"] },
  { fileName: "CLIENT_REQUIREMENTS.md", applicable: alwaysApplicable, gates: ["scope"] },
  { fileName: "ARCHITECT_INSTRUCTIONS.md", applicable: alwaysApplicable, gates: ["scope", "acceptanceCriteria"] },
  { fileName: "CODEX_INSTRUCTIONS.md", applicable: alwaysApplicable, gates: ["scope", "acceptanceCriteria"] },
  { fileName: "APP_BLUEPRINT.md", applicable: alwaysApplicable, gates: ["scope", "screenMap"] },
  { fileName: "DATA_MODEL.md", applicable: alwaysApplicable, gates: ["schema"] },
  { fileName: "SCREEN_MAP.md", applicable: alwaysApplicable, gates: ["screenMap"] },
  { fileName: "WORKFLOW_MAP.md", applicable: alwaysApplicable, gates: ["scope"] },
  { fileName: "SECURITY_MODEL.md", applicable: alwaysApplicable, gates: ["security"] },
  { fileName: "ACCEPTANCE_CRITERIA.md", applicable: alwaysApplicable, gates: ["acceptanceCriteria"] },
  { fileName: "TEST_PLAN.md", applicable: alwaysApplicable, gates: ["testing", "acceptanceCriteria"] },
  { fileName: "DEPLOYMENT_NOTES.md", applicable: alwaysApplicable, gates: ["environment", "releaseApproval", "deploymentResponsibility"] },
  { fileName: "CHANGE_LOG.md", applicable: alwaysApplicable, gates: [] },
  { fileName: "NEXT_STEPS.md", applicable: alwaysApplicable, gates: ["scope"] },
  { fileName: "HANDOFF_CHECKLIST.md", applicable: alwaysApplicable, gates: ["scope", "acceptanceCriteria"] },
  { fileName: "CLIENT_QUESTIONS.md", applicable: alwaysApplicable, gates: [] },
  { fileName: "BRAND_GUIDE.md", applicable: alwaysApplicable, gates: [] },
  { fileName: "PHASED_CODEX_PROMPTS.md", applicable: alwaysApplicable, gates: ["scope", "acceptanceCriteria"] },
  { fileName: "DECISION_LOG.md", applicable: (project) => Boolean(project.powerPlatform), gates: ["projectType"] },
  { fileName: "DATA_SOURCE_SCHEMA.md", applicable: (project) => project.intake.appType === "powerAppsCanvas", gates: ["schema"] },
  { fileName: "POWER_FX_STANDARDS.md", applicable: (project) => project.intake.appType === "powerAppsCanvas", gates: ["powerFx", "schema", "delegation"] },
  { fileName: "DELEGATION_REGISTER.md", applicable: (project) => project.intake.appType === "powerAppsCanvas", gates: ["delegation", "recordVolumes", "connectorDelegation"] },
  { fileName: "CONTROL_INVENTORY.md", applicable: (project) => project.intake.appType === "powerAppsCanvas", gates: ["screenMap", "controlInventory", "accessibility"] },
  { fileName: "APP_CONFIGURATION.md", applicable: (project) => project.intake.appType === "powerAppsCanvas", gates: ["appConfiguration", "targetDevices", "screenSizePlanning"] },
  { fileName: "YAML_MANIFEST.md", applicable: (project) => project.intake.appType === "powerAppsCanvas", gates: ["yaml", "powerFx", "schema", "delegation", "security", "testing", "alm"] },
  { fileName: "SHAREPOINT_SCHEMA.md", applicable: (project) => project.powerPlatform?.canvas?.primaryDataSourceType === "sharePointList" || project.powerPlatform?.canvas?.selectedDataSourceTypes.includes("sharePointList") === true, gates: ["sharePointSchema", "internalNames"] },
  { fileName: "INTERNAL_COLUMN_NAMES.md", applicable: (project) => project.powerPlatform?.canvas?.primaryDataSourceType === "sharePointList" || project.powerPlatform?.canvas?.selectedDataSourceTypes.includes("sharePointList") === true, gates: ["internalNames"] },
  { fileName: "CONNECTOR_SCHEMA.md", applicable: (project) => project.powerPlatform?.canvas?.primaryDataSourceType === "otherConnector" || project.powerPlatform?.canvas?.selectedDataSourceTypes.includes("otherConnector") === true, gates: ["connectorSchema", "connectorIdentifiers"] },
  { fileName: "DATAVERSE_SCHEMA.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven" || project.powerPlatform?.canvas?.primaryDataSourceType === "dataverse" || project.powerPlatform?.canvas?.selectedDataSourceTypes.includes("dataverse") === true, gates: ["dataverseSchema", "logicalNames"] },
  { fileName: "LOGICAL_NAMES.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven" || project.powerPlatform?.canvas?.primaryDataSourceType === "dataverse" || project.powerPlatform?.canvas?.selectedDataSourceTypes.includes("dataverse") === true, gates: ["logicalNames"] },
  { fileName: "SOLUTION_ARCHITECTURE.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["solutionArchitecture"] },
  { fileName: "SOLUTION_COMPONENT_REGISTER.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["solutionArchitecture", "formsAndViews", "navigation"] },
  { fileName: "TABLE_RELATIONSHIPS.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["dataverseSchema", "logicalNames"] },
  { fileName: "FORMS_AND_VIEWS.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["formsAndViews", "schema", "logicalNames"] },
  { fileName: "APP_NAVIGATION.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["navigation", "appPages", "formsAndViews"] },
  { fileName: "BUSINESS_RULES.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["businessRules", "businessLogic", "schema", "logicalNames"] },
  { fileName: "BUSINESS_PROCESS_FLOWS.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["businessProcessFlows", "businessLogic", "securityArchitecture"] },
  { fileName: "AUTOMATION_REGISTER.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["automations", "businessLogic", "securityArchitecture"] },
  { fileName: "SECURITY_ROLES.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["securityArchitecture", "securityRolePermission"] },
  { fileName: "CUSTOM_PAGES.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["customPages", "canvasCustomPageRequirements"] },
  { fileName: "EXTENSION_REGISTER.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["extensions"] },
  { fileName: "CONNECTOR_REGISTER.md", applicable: (project) => Boolean(project.powerPlatform), gates: ["connectorSelection", "connectorClassification", "licensing"] },
  { fileName: "LICENSING_ASSESSMENT.md", applicable: (project) => Boolean(project.powerPlatform), gates: ["licensing"] },
  { fileName: "CONNECTION_REGISTER.md", applicable: (project) => Boolean(project.powerPlatform), gates: ["connectionReferences", "connectionOwnership"] },
  { fileName: "ENVIRONMENT_VARIABLES.md", applicable: (project) => project.intake.appType === "powerAppsModelDriven", gates: ["environmentVariables", "alm"] },
  { fileName: "IMPLEMENTATION_LOG.md", applicable: (project) => Boolean(project.powerPlatform), gates: [] },
  { fileName: "ALM_DEPLOYMENT_PLAN.md", applicable: (project) => Boolean(project.powerPlatform), gates: ["environment", "alm", "releaseApproval", "deploymentResponsibility"] }
];

const documentDefinitionByFile = new Map(DOCUMENT_STATUS_DEFINITIONS.map((definition) => [definition.fileName, definition]));

function usesPowerPlatformDocumentGates(project: ProjectRecord): boolean {
  return project.intake.appType === "powerAppsCanvas" || project.intake.appType === "powerAppsModelDriven";
}

export function countDocumentMissingMarkers(content: string): number {
  return content.match(missingMarkerPrefixPattern)?.length ?? 0;
}

export function getDocumentReviewStatus(
  document: Pick<GeneratedDocument, "fileName" | "content">,
  project?: ProjectRecord
): DocumentReviewStatus {
  if (countDocumentMissingMarkers(document.content) > 0) return "Draft";
  if (project && usesPowerPlatformDocumentGates(project)) {
    const definition = documentDefinitionByFile.get(document.fileName);
    if (definition && !definition.applicable(project)) return "Not Applicable";
    const gateResults = (definition?.gates ?? []).map((gateId) => evaluatePhaseGate(project, gateId));
    if (gateResults.some((result) => ["notStarted", "missingInformation", "blocked", "failed"].includes(result.status))) return "Draft";
    if (gateResults.some((result) => ["reviewNeeded", "manualValidationRequired", "inProgress"].includes(result.status))) return "Review Required";
    if (gateResults.every(isPhaseGatePassing)) return "Ready for Implementation";
  }
  const metadataStatus = document.content.match(/\*\*Document status:\*\*\s*(Draft|Review Required|Ready for Implementation|Not Applicable)/)?.[1] as GeneratedDocumentStatus | undefined;
  if (metadataStatus) return metadataStatus;
  if (reviewRequiredFiles.has(document.fileName)) return "Review Required";
  return "Ready for Implementation";
}

export function getDocumentReviewItems(documents: GeneratedDocument[], project?: ProjectRecord): DocumentReviewItem[] {
  return documents.map((document) => ({
    ...document,
    purpose: DOCUMENT_PURPOSES[document.fileName] ?? "Generated project documentation for review.",
    missingMarkerCount: countDocumentMissingMarkers(document.content),
    status: getDocumentReviewStatus(document, project)
  }));
}

export function countPackageMissingMarkers(documents: GeneratedDocument[]): number {
  return documents.reduce(
    (total, document) => total + countDocumentMissingMarkers(document.content),
    0
  );
}

export interface DocumentStatusSummary {
  applicableDocumentCount: number;
  generatedDocumentCount: number;
  readyDocuments: number;
  reviewRequiredDocuments: number;
  draftDocuments: number;
  blockedByMissingInformation: number;
  notApplicableDocuments: number;
  architectInstructionsStatus: DocumentReviewStatus | "Not generated";
  codexInstructionsStatus: DocumentReviewStatus | "Not generated";
  codexPhasesStatus: DocumentReviewStatus | "Not generated";
}

function statusForFile(project: ProjectRecord, fileName: string): DocumentReviewStatus | "Not generated" {
  const document = project.generatedDocuments.find((candidate) => candidate.fileName === fileName);
  return document ? getDocumentReviewStatus(document, project) : "Not generated";
}

export function getDocumentStatusSummary(project: ProjectRecord): DocumentStatusSummary {
  const applicableDocumentCount = expectedDocumentLocations(project).length;
  const generatedItems = getDocumentReviewItems(project.generatedDocuments, project);
  return {
    applicableDocumentCount,
    generatedDocumentCount: project.generatedDocuments.length,
    readyDocuments: generatedItems.filter((item) => item.status === "Ready for Implementation").length,
    reviewRequiredDocuments: generatedItems.filter((item) => item.status === "Review Required").length,
    draftDocuments: generatedItems.filter((item) => item.status === "Draft").length,
    notApplicableDocuments: generatedItems.filter((item) => item.status === "Not Applicable").length,
    blockedByMissingInformation: generatedItems.filter((item) => item.missingMarkerCount > 0).length,
    architectInstructionsStatus: statusForFile(project, "ARCHITECT_INSTRUCTIONS.md"),
    codexInstructionsStatus: statusForFile(project, "CODEX_INSTRUCTIONS.md"),
    codexPhasesStatus: statusForFile(project, "PHASED_CODEX_PROMPTS.md")
  };
}
