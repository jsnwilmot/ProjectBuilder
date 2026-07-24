import {
  formatDate,
  listOrMissing,
  markdownList,
  markdownTable,
  missingMarker,
  safeText,
  sectionOrMissing
} from "../../lib/documentHelpers";
import { PROJECT_FOLDERS } from "../../data/folderStructure";
import { PACKAGE_USAGE_STEPS } from "../../data/packageGuidance";
import { getProjectTypeFields, getProjectTypeLabel, getProjectTypePreset } from "../../data/projectTypes";
import { getClientReviewReadiness, groupClientQuestions } from "../../lib/clientReview";
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
  calculateModelDrivenFormsAndViewsGate,
  calculateModelDrivenNavigationGate,
  calculateModelDrivenSecurityArchitectureGate,
  calculateModelDrivenSolutionArchitectureGate,
  calculateOtherConnectorSchemaGate,
  calculatePowerPlatformReadiness,
  calculateSecurityReviewGate,
  calculateSharePointSchemaGate,
  calculateTestingPreparationGate,
  expectedDocumentLocations,
  formatCanvasDataSourceType,
  formatPowerPlatformGateStatus,
  getSelectedCanvasDataSourceTypes,
  isCanvasProject,
  isModelDrivenProject,
  usesDataverse,
  usesOtherConnector,
  usesSharePoint
} from "../../lib/powerPlatform";
import {
  assertKnownPhaseGateId,
  evaluatePhaseGate,
  isPhaseGatePassing
} from "../../lib/phaseGates";
import { validateCanvasTargets } from "../../lib/canvasTargetValidation";
import {
  confirmedCanvasControls,
  effectiveCanvasExpectedRecordCounts,
  isCanvasFileNotApplicable,
  saveCancelCanvasAssets,
  selectedRecordStateAssets,
  stateVariableSummary,
  statusLabel
} from "../../lib/canvasTraceability";
import type { PhaseGateId } from "../../lib/phaseGates";
import type { PowerPlatformApplicabilityDecision, PowerPlatformConnector, ProjectRecord } from "../../types/project";

const join = (...parts: string[]) => parts.join("\n\n");

function header(project: ProjectRecord): string {
  const generationContext = (project as ProjectRecord & {
    generationContext?: { readiness?: { status: "Draft" | "Ready for Codex" }; documentStatuses?: Record<string, string> };
    currentDocumentName?: string;
  }).generationContext;
  const currentDocumentName = (project as ProjectRecord & { currentDocumentName?: string }).currentDocumentName;
  const base = [
    `**Project:** ${safeText(project.identity.projectName, "app name")}`,
    `**Client:** ${safeText(project.client.clientName, "client name")}`,
    `**Business or department:** ${safeText(project.client.businessName, "business or department")}`,
    `**Project type:** ${safeText(getProjectTypeLabel(project.intake.appType), "project type")}`,
    `**Target platform:** ${safeText(project.intake.targetPlatform, "target platform")}`,
    `**Status:** ${project.status}`
  ];

  if (!project.powerPlatform) return base.join("  \n");

  const common = project.powerPlatform.common;
  const canvas = project.powerPlatform.canvas;
  const modelDriven = project.powerPlatform.modelDriven;
  const selectedSources = getSelectedCanvasDataSourceTypes(project);
  const readiness = calculatePowerPlatformReadiness(project);
  const gateStatuses = readiness.gates.map((gate) => gate.status);
  const documentStatus = generationContext?.documentStatuses?.[currentDocumentName ?? ""]
    ?? (readiness.isReadyForCodex
    ? "Ready for Implementation"
    : gateStatuses.includes("missingInformation") || gateStatuses.includes("blocked") || gateStatuses.includes("notStarted")
      ? "Draft"
      : "Review Required");
  const schemaGate = isCanvasProject(project)
    ? calculateCanvasSchemaGate(project)
    : isModelDrivenProject(project)
      ? calculateModelDrivenDataverseSchemaGate(project)
      : "notApplicable";
  const securityGate = isModelDrivenProject(project)
    ? calculateModelDrivenSecurityArchitectureGate(project)
    : calculateSecurityReviewGate(project);

  const primaryDataSource = isModelDrivenProject(project)
    ? "Microsoft Dataverse"
    : canvas?.primaryDataSourceType && canvas.primaryDataSourceType !== "undecided" && canvas.primaryDataSourceType !== "multiple"
      ? formatCanvasDataSourceType(canvas.primaryDataSourceType)
      : canvas?.primaryDataSourceType === "multiple"
        ? "Multiple approved Canvas data sources"
        : missingMarker("primary data source");
  const secondarySources = isModelDrivenProject(project)
    ? (project.powerPlatform.common.connectors.length
        ? project.powerPlatform.common.connectors.map((connector) => connector.displayName || connector.dataSourceName || connector.dataSourceType).join(", ")
        : "None")
    : selectedSources
      .filter((source) => source !== canvas?.primaryDataSourceType)
      .map(formatCanvasDataSourceType)
      .join(", ") || "None";

  return [
    ...base,
    `**Generated date:** ${formatDate()}`,
    `**Last updated:** ${formatDate(project.updatedAt)}`,
    `**App subtype:** ${safeText(canvas?.subtype || modelDriven?.subtype || common.appSubtype, "Power Platform app subtype")}`,
    `**Package readiness:** ${generationContext?.readiness?.status ?? (readiness.isReadyForCodex ? "Ready for Codex" : "Draft")}`,
    `**Document status:** ${documentStatus}`,
    `**Applicable environment:** ${safeText(common.environment || common.developmentEnvironment || common.productionEnvironment, "Power Platform environment")}`,
    `**Primary data source:** ${primaryDataSource}`,
    `**Secondary data sources:** ${secondarySources}`,
    `**Connector gate:** ${formatPowerPlatformGateStatus(calculateConnectorSelectionGate(project))}`,
    `**Licensing gate:** ${formatPowerPlatformGateStatus(calculateLicensingGate(project))}`,
    `**Schema gate:** ${formatPowerPlatformGateStatus(schemaGate)}`,
    `**Security gate:** ${formatPowerPlatformGateStatus(securityGate)}`,
    `**Testing gate:** ${formatPowerPlatformGateStatus(calculateTestingPreparationGate(project))}`,
    `**ALM gate:** ${formatPowerPlatformGateStatus(calculateAlmGate(project))}`
  ].join("  \n");
}

function missingSummary(project: ProjectRecord): string {
  const count = getClientReviewReadiness(project).unresolvedItems.length;
  if (count === 0) return "No unresolved client review items are currently identified.";
  return `${count} client review item${count === 1 ? " is" : "s are"} unresolved and represented in this package.`;
}

function expectedDocuments(project: ProjectRecord) {
  return expectedDocumentLocations(project);
}

function generatedFilesList(project: ProjectRecord): string {
  return markdownList(expectedDocuments(project).map((document) => `${document.folder}/${document.fileName}`));
}

function generatedFileCount(project: ProjectRecord): number {
  return expectedDocuments(project).length;
}

function packageReadiness(project: ProjectRecord): string {
  const contextReadiness = (project as ProjectRecord & {
    generationContext?: { readiness?: { status: "Draft" | "Ready for Codex"; blockers?: string[] } };
  }).generationContext?.readiness;
  if (contextReadiness) {
    return contextReadiness.status === "Ready for Codex"
      ? "Ready for Codex — client review, applicable gates, and generated content checks are complete."
      : `Draft — ${contextReadiness.blockers?.length ?? 0} generated-content readiness blocker${(contextReadiness.blockers?.length ?? 0) === 1 ? "" : "s"} remain.`;
  }
  const readiness = getClientReviewReadiness(project);
  return readiness.isReady
    ? "Ready for Codex — all blocking client review and readiness checks are complete."
    : `Draft — ${readiness.blockerCount} readiness blocker${readiness.blockerCount === 1 ? "" : "s"} remain unresolved.`;
}

function reviewItemsByStatus(project: ProjectRecord, status: "Not applicable" | "Deferred"): string {
  const items = project.reviewItems.filter((item) => item.status === status);
  if (items.length === 0) return "- None.";
  return items.map((item) => {
    const reason = status === "Not applicable" ? item.notApplicableReason : item.deferredReason;
    const readinessNote = status === "Deferred" && (item.blocking || !item.allowDeferred)
      ? " This remains a readiness blocker."
      : "";
    return `- **${item.section} — ${item.label}:** ${reason || missingMarker(`${status.toLowerCase()} reason`)}${readinessNote}`;
  }).join("\n");
}

function outstandingReviewQuestions(project: ProjectRecord): string {
  const groups = groupClientQuestions(project.reviewItems);
  if (groups.length === 0) return "- None.";
  return groups.map(({ section, items }) => [
    `### ${section}`,
    ...items.map((item) => `- ${item.recommendedQuestion}`)
  ].join("\n")).join("\n\n");
}

function readinessChecklist(project: ProjectRecord): string {
  return getClientReviewReadiness(project).checklist
    .map((item) => `- [${item.passed ? "x" : " "}] ${item.label}${item.passed ? "" : ` — ${item.reason}`}`)
    .join("\n");
}

function readinessBlockers(project: ProjectRecord): string {
  const blockers = getClientReviewReadiness(project).blockers;
  return blockers.length > 0 ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- None.";
}

function reviewDecisionSummary(project: ProjectRecord): string {
  return join(
    `## Outstanding client questions\n\n${outstandingReviewQuestions(project)}`,
    `## Not applicable decisions\n\n${reviewItemsByStatus(project, "Not applicable")}`,
    `## Deferred decisions\n\n${reviewItemsByStatus(project, "Deferred")}`,
    `## Readiness checklist\n\n${readinessChecklist(project)}`,
    `## Current blockers\n\n${readinessBlockers(project)}`
  );
}

function projectTypeNotes(project: ProjectRecord): string {
  const preset = getProjectTypePreset(project.intake.appType);
  return preset
    ? markdownList([...preset.suggestedGeneratedDocumentNotes])
    : `- ${missingMarker("project type selection")}`;
}

function tailoredIntakeSummary(project: ProjectRecord): string {
  const fields = ["foundation", "users", "features", "data", "workflows", "security"]
    .flatMap((stageId) => getProjectTypeFields(
      project.intake.appType,
      project.intake.audienceVisibility,
      stageId
    ));
  if (fields.length === 0) return `- ${missingMarker("project-type-specific requirements")}`;
  return fields
    .map((field) => {
      const value = String(project.intake[field.name as keyof typeof project.intake] ?? "");
      const renderedValue = value.trim()
        ? safeText(value, field.label.toLowerCase())
        : field.required
          ? missingMarker(field.label.toLowerCase())
          : "Not specified / not required.";
      return `- **${field.label}:** ${renderedValue}`;
    })
    .join("\n");
}

function deploymentModel(project: ProjectRecord): string {
  return [
    project.intake.hostingStatus,
    project.intake.domainStatus,
    project.intake.targetPlatform
  ].map((item) => item.trim()).filter(Boolean).join("\n") || missingMarker("hosting and deployment model");
}

function folderStructure(): string {
  return [
    "```text",
    "/project-name/",
    ...PROJECT_FOLDERS.map((folder) => `  ${folder}/`),
    "```"
  ].join("\n");
}

const readme = (project: ProjectRecord) => join(
  `# ${safeText(project.identity.projectName, "app name")}`,
  header(project),
  sectionOrMissing("Project purpose", project.intake.appPurpose, "app purpose"),
  sectionOrMissing("Problem being solved", project.intake.problemStatement, "problem being solved"),
  `## Target users\n\n${listOrMissing(project.intake.targetUsers, "target users")}`,
  `## Generated package contents\n\n${generatedFilesList(project)}`,
  `## Folder structure\n\n${folderStructure()}`,
  "## How GPT Architect should use this package\n\n1. Validate scope boundaries and assumptions.\n2. Resolve every missing marker before approvals.\n3. Produce phased Codex prompts aligned with accepted requirements.",
  "## How Codex Developer should use this package\n\n1. Build only what is approved in these documents.\n2. Do not guess beyond accepted scope.\n3. Report missing decisions using exact missing-decision markers.",
  `## Package readiness\n\n${packageReadiness(project)}`,
  `## Missing information summary\n\n${missingSummary(project)}`,
  `## Next steps\n\n${markdownList([
    "Architect review and contradiction cleanup",
    "Resolve client questions and missing decisions",
    "Approve the first Codex implementation phase"
  ])}`
);

const projectScope = (project: ProjectRecord) => join(
  "# Project Scope",
  header(project),
  sectionOrMissing("Project purpose", project.intake.appPurpose, "app purpose"),
  `## In-scope features\n\n${listOrMissing(project.intake.requiredFeatures, "required features")}`,
  `## Out-of-scope items\n\n${listOrMissing(project.intake.outOfScope, "out-of-scope items")}`,
  `## Integrations\n\n${listOrMissing(project.intake.integrations, "integrations")}`,
  `## Reports\n\n${listOrMissing(project.intake.reportsDashboards, "reports or dashboards")}`,
  `## Target users\n\n${listOrMissing(project.intake.targetUsers, "target users")}`,
  `## User roles\n\n${listOrMissing(project.intake.userRoles, "user roles")}`,
  sectionOrMissing("Target platform", project.intake.targetPlatform, "target platform"),
  sectionOrMissing("Project type", getProjectTypeLabel(project.intake.appType), "project type"),
  `## Constraints\n\n${listOrMissing(project.intake.constraints, "constraints")}`,
  `## Risks\n\n${listOrMissing(project.intake.risks, "risks")}`,
  `## Assumptions\n\n${listOrMissing(project.intake.assumptions, "assumptions")}`,
  `## Success criteria\n\n${listOrMissing(project.intake.successCriteria, "success criteria")}`,
  "## Scope-change rules\n\n- Any new connector, data source, app type, deployment target, authentication model, paid service, or generated implementation asset requires Architect approval before Codex work begins.",
  `## Approval status\n\n${packageReadiness(project)}`,
  "## Approved boundaries\n\n- Keep local persistence, no backend, no authentication, no import, and no external AI calls unless explicitly approved.\n- Project Builder Ai prepares the client project package and does not build the final client app directly.",
  `## Missing scope decisions\n\n${missingSummary(project)}`,
  reviewDecisionSummary(project)
);

const clientRequirements = (project: ProjectRecord) => join(
  "# Client Requirements",
  header(project),
  sectionOrMissing("Client details", project.client.clientName, "client name"),
  sectionOrMissing("Business or department", project.client.businessName, "business or department"),
  sectionOrMissing("Problem statement", project.intake.problemStatement, "problem being solved"),
  `## User needs\n\n${listOrMissing(project.intake.targetUsers, "target users")}`,
  `## Required features\n\n${listOrMissing(project.intake.requiredFeatures, "required features")}`,
  `## Workflows\n\n${listOrMissing(project.intake.workflows, "workflows")}`,
  `## Screens\n\n${listOrMissing(project.intake.screens, "screens")}`,
  `## Data requirements\n\n${markdownList([
    safeText(project.intake.dataCollections, "tables, lists, or collections"),
    safeText(project.intake.fields, "fields"),
    safeText(project.intake.fieldTypes, "field types"),
    safeText(project.intake.requiredDataFields, "required data fields")
  ])}`,
  `## Security requirements\n\n${markdownList([
    safeText(project.intake.permissionRules || project.intake.permissions, "permission rules"),
    safeText(project.intake.sensitiveDataNotes, "sensitive data notes"),
    safeText(project.intake.dataProtectionExpectations, "data protection expectations")
  ])}`,
  `## Integrations\n\n${listOrMissing(project.intake.integrations, "integrations")}`,
  `## Reports or dashboards\n\n${listOrMissing(project.intake.reportsDashboards, "reports or dashboards")}`,
  `## Branding notes\n\n${listOrMissing(project.intake.brandingNotes, "branding notes")}`,
  `## Project-type-specific requirements\n\n${tailoredIntakeSummary(project)}`,
  `## Notifications\n\n${listOrMissing(project.intake.notifications, "notifications")}`,
  `## Automations\n\n${listOrMissing(project.intake.automations, "automations")}`,
  `## Constraints\n\n${listOrMissing(project.intake.constraints, "constraints")}`,
  `## Success criteria\n\n${listOrMissing(project.intake.successCriteria, "success criteria")}`,
  `## Outstanding questions\n\n${missingSummary(project)}`
);

const appBlueprint = (project: ProjectRecord) => join(
  "# App Blueprint",
  header(project),
  sectionOrMissing("Product summary", project.intake.appPurpose, "app purpose"),
  sectionOrMissing("Project type", getProjectTypeLabel(project.intake.appType), "project type"),
  sectionOrMissing("Target platform", project.intake.targetPlatform, "target platform"),
  `## Core modules\n\n${listOrMissing(project.intake.requiredFeatures, "required features")}`,
  `## Screen map summary\n\n${listOrMissing(project.intake.screens, "screens")}`,
  `## Workflow summary\n\n${listOrMissing(project.intake.workflows, "workflows")}`,
  `## Data model summary\n\n${markdownList([
    safeText(project.intake.dataEntities || project.intake.dataCollections, "data entities"),
    safeText(project.intake.fields, "fields"),
    safeText(project.intake.relationships, "relationships")
  ])}`,
  `## Security model summary\n\n${markdownList([
    safeText(project.intake.permissionRules || project.intake.permissions, "permission rules"),
    safeText(project.intake.sensitiveDataNotes, "sensitive data notes"),
    safeText(project.intake.risks, "risks")
  ])}`,
  `## Integration summary\n\n${listOrMissing(project.intake.integrations, "integrations")}`,
  `## Reporting summary\n\n${listOrMissing(project.intake.reportsDashboards, "reports or dashboards")}`,
  `## Project type guidance\n\n${projectTypeNotes(project)}`,
  `## Tailored intake summary\n\n${tailoredIntakeSummary(project)}`,
  "## Architecture boundaries\n\nThis blueprint supports websites, web apps, mobile apps, software tools, internal systems, portals, dashboards, games, and other digital products. It does not force a single app pattern.",
  `## Build assumptions\n\n${listOrMissing(project.intake.assumptions, "assumptions")}`,
  `## Future decisions\n\n${listOrMissing(deploymentModel(project), "hosting and deployment model")}`
);

const dataModel = (project: ProjectRecord) => join(
  "# Data Model",
  header(project),
  `## Data sources\n\n${listOrMissing(project.intake.dataSources, "data sources")}`,
  `## Tables, lists, or collections\n\n${listOrMissing(project.intake.dataCollections, "tables, lists, or collections")}`,
  `## Entities\n\n${listOrMissing(project.intake.dataEntities || project.intake.dataCollections, "data entities")}`,
  `## Fields\n\n${listOrMissing(project.intake.fields, "fields")}`,
  `## Field types\n\n${listOrMissing(project.intake.fieldTypes, "field types")}`,
  `## Required fields\n\n${listOrMissing(project.intake.requiredDataFields, "required data fields")}`,
  `## Relationships\n\n${listOrMissing(project.intake.relationships, "relationships")}`,
  `## Ownership\n\n${listOrMissing(project.intake.dataOwnership, "data ownership")}`,
  `## Retention notes\n\n${listOrMissing(project.intake.dataRetentionNotes, "data retention notes")}`,
  "## Validation notes\n\n- Enforce required fields before save.\n- Validate field types and allowed values.\n- Prevent invalid relationships and orphan records.",
  `## Missing data decisions\n\n${missingSummary(project)}`
);

const screenMap = (project: ProjectRecord) => join(
  "# Screen Map",
  header(project),
  `## Screens\n\n${listOrMissing(project.intake.screens, "screens")}`,
  `## Screen purpose\n\n${listOrMissing(project.intake.featureDescription, "feature description")}`,
  `## Primary users\n\n${listOrMissing(project.intake.targetUsers, "target users")}`,
  `## Key components\n\n${listOrMissing(project.intake.requiredFeatures, "required features")}`,
  `## Inputs\n\n${listOrMissing(project.intake.workflowInputs, "workflow inputs")}`,
  `## Outputs\n\n${listOrMissing(project.intake.workflowOutputs, "workflow outputs")}`,
  `## Navigation notes\n\n${listOrMissing(project.intake.workflows, "workflows")}`,
  `## Access notes\n\n${listOrMissing(project.intake.roleAccessNotes || project.intake.permissions, "role access notes")}`,
  `## Empty states\n\n${screenEmptyStates(project)}`,
  `## Validation states\n\n${listOrMissing(project.powerPlatform?.canvas?.validationRequirements || project.intake.acceptanceNotes, "validation-state behavior per screen")}`,
  `## Accessibility notes\n\n${listOrMissing(project.intake.accessibilityNotes, "accessibility notes")}`
);

const workflowMap = (project: ProjectRecord) => join(
  "# Workflow Map",
  header(project),
  `## Workflow name\n\n${listOrMissing(project.intake.workflowName || project.intake.workflows, "workflow name")}`,
  `## Trigger\n\n${listOrMissing(project.intake.workflowTrigger, "workflow trigger")}`,
  `## Steps\n\n${listOrMissing(project.intake.workflowSteps, "workflow steps")}`,
  `## Inputs\n\n${listOrMissing(project.intake.workflowInputs, "workflow inputs")}`,
  `## Outputs\n\n${listOrMissing(project.intake.workflowOutputs, "workflow outputs")}`,
  `## Roles involved\n\n${listOrMissing(project.intake.workflowRoles || project.intake.userRoles, "workflow roles")}`,
  `## Decision points\n\n${listOrMissing(project.intake.workflowDecisionPoints, "workflow decision points")}`,
  `## Notifications\n\n${listOrMissing(project.intake.notifications, "notifications")}`,
  `## Exceptions\n\n${listOrMissing(project.intake.workflowFailureHandling, "failure or exception handling")}`,
  `## Expected outcome\n\n${listOrMissing(project.intake.workflowOutcome, "expected workflow outcome")}`,
  `## Acceptance notes\n\n${listOrMissing(project.intake.acceptanceNotes, "acceptance notes")}`
);

const securityModel = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Security Model",
    header(project),
    `## User roles\n\n${listOrMissing(project.intake.userRoles, "user roles")}`,
    `## Permission rules\n\n${listOrMissing(project.intake.permissionRules || project.intake.permissions, "permission rules")}`,
    `## Authentication expectations\n\n${listOrMissing(project.intake.authenticationExpectation, "authentication expectation")}`,
    `## Authorization expectations\n\n${listOrMissing(project.intake.authorizationExpectation, "authorization expectation")}`,
    `## Sensitive data notes\n\n${listOrMissing(project.intake.sensitiveDataNotes, "sensitive data notes")}`,
    `## Data protection expectations\n\n${listOrMissing(project.intake.dataProtectionExpectations, "data protection expectations")}`,
    `## Audit and logging needs\n\n${listOrMissing(project.intake.auditLoggingNeeds, "audit or logging needs")}`,
    `## Compliance notes\n\n${listOrMissing(project.intake.complianceNotes, "compliance notes")}`,
    modelDriven ? `## Model-driven security architecture\n\n${markdownTable(["Area", "Decision"], [
      ["Security roles", powerPlatformValue(modelDriven.securityRoles, "security roles")],
      ["Business units", powerPlatformValue(modelDriven.businessUnits, "business units")],
      ["Owner teams", powerPlatformValue(modelDriven.ownerTeams, "owner teams")],
      ["Access teams", powerPlatformValue(modelDriven.accessTeams, "access teams")],
      ["Table privileges", powerPlatformValue(modelDriven.tablePrivileges, "table privileges")],
      ["Privilege depth", powerPlatformValue(modelDriven.privilegeDepth, "privilege depth")],
      ["Record ownership", powerPlatformValue(modelDriven.recordOwnership, "record ownership")],
      ["Sharing expectations", powerPlatformValue(modelDriven.sharingExpectations, "sharing expectations")],
      ["Sensitive fields", powerPlatformValue(modelDriven.sensitiveFields, "sensitive fields")],
      ["Field security profiles", powerPlatformValue(modelDriven.fieldSecurityProfiles, "field security profiles")],
      ["Application users", modelDriven.applicationUsersDecision.status === "notApplicable" ? safeText(modelDriven.applicationUsersDecision.notApplicableReason, "application users not-applicable reason") : powerPlatformValue(modelDriven.applicationUsers, "application users")],
      ["Service principals", modelDriven.servicePrincipalsDecision.status === "notApplicable" ? safeText(modelDriven.servicePrincipalsDecision.notApplicableReason, "service principals not-applicable reason") : powerPlatformValue(modelDriven.servicePrincipals, "service principals")],
      ["Validation rules", modelDriven.validationRulesDecision.status === "notApplicable" ? safeText(modelDriven.validationRulesDecision.notApplicableReason, "validation rules not-applicable reason") : powerPlatformValue(modelDriven.validationRules, "validation rules")],
      ["Duplicate prevention", modelDriven.duplicatePreventionDecision.status === "notApplicable" ? safeText(modelDriven.duplicatePreventionDecision.notApplicableReason, "duplicate prevention not-applicable reason") : powerPlatformValue(modelDriven.duplicatePrevention, "duplicate prevention")],
      ["Security architecture confirmation", decisionText(modelDriven.securityArchitectureStatus)]
    ])}` : "",
    modelDriven ? `## Model-driven security applicability\n\n${markdownTable(["Component", "Applicability", "Details", "Not-applicable reason", "Confirmation"], applicabilityRows([
      ["Team model", modelDriven.teamModelDecision],
      ["Hierarchy security", modelDriven.hierarchySecurityDecision],
      ["Field security", modelDriven.fieldSecurityDecision],
      ["Application users", modelDriven.applicationUsersDecision],
      ["Service principals", modelDriven.servicePrincipalsDecision]
    ]))}` : "",
    `## Risks\n\n${listOrMissing(project.intake.risks, "risks")}`,
    `## Assumptions\n\n${listOrMissing(project.intake.assumptions, "assumptions")}`,
    "## Blocked assumptions\n\n- Do not assume authentication, backend services, external AI calls, or import features without explicit approval.",
    `## Missing security decisions\n\n${missingSummary(project)}`
  );
};

const acceptanceCriteria = (project: ProjectRecord) => join(
  "# Acceptance Criteria",
  header(project),
  `## Measurable criteria\n\n${markdownTable(["ID", "Requirement", "Project type", "Verification method", "Expected result", "Status", "Evidence", "Owner", "Notes"], [
    ["AC-001", safeText(project.intake.successCriteria || project.intake.requiredFeatures, "success criteria"), getProjectTypeLabel(project.intake.appType), "Architect review and acceptance test", "Approved criteria are met", "Draft", "Not recorded", "Architect", "Project-level criteria"],
    ["AC-002", safeText(project.intake.workflowOutcome || project.intake.workflows, "workflow acceptance criteria"), getProjectTypeLabel(project.intake.appType), "Workflow walkthrough", "Core workflow completes as approved", "Draft", "Not recorded", "Codex / Architect", "Workflow criteria"],
    ["AC-003", safeText(project.intake.permissionRules || project.intake.permissions || project.powerPlatform?.common.authorizationRequirements, "permission rules"), getProjectTypeLabel(project.intake.appType), "Security review", "Least-privilege rules are documented and verified", "Draft", "Not recorded", "Architect", "Security criteria"],
    ["AC-004", safeText(project.intake.accessibilityNotes || project.powerPlatform?.common.accessibilityRequirements, "accessibility requirements"), getProjectTypeLabel(project.intake.appType), "Accessibility check", "Keyboard, labels, focus, and contrast requirements pass", "Draft", "Not recorded", "Codex", "Accessibility criteria"],
    ["AC-005", `Generated package contains ${generatedFileCount(project)} applicable documents`, getProjectTypeLabel(project.intake.appType), "Export validation", "Expected registry and folder map pass", "Draft", "Not recorded", "Codex", "Export criteria"]
  ])}`,
  "## Testing acceptance criteria\n\n- Unit tests cover validation and generation logic.\n- Integration tests cover active-project persistence and workflow behavior.\n- Manual checks cover accessibility and export reliability.",
  `## Export or deployment acceptance criteria\n\n- Generated package contains all ${generatedFileCount(project)} applicable required files for this project.\n- ZIP structure matches approved folders.\n- Draft exports retain missing markers as warnings.\n- Ready for Codex exports reject unresolved missing markers.`,
  `## Client review acceptance\n\n${readinessChecklist(project)}`,
  `## Readiness blockers\n\n${readinessBlockers(project)}`
);

const testPlan = (project: ProjectRecord) => join(
  "# Test Plan",
  header(project),
  "## Test scope\n\nValidation, generation, persistence, document preview, and export behavior for the active project.",
  `## Unit test targets\n\n${markdownList([
    "Validation rules by stage",
    "Document helper functions",
    "Project-specific file mapping and sanitization",
    "Power Platform readiness gates",
    "Export validation warnings and errors"
  ])}`,
  `## Integration test targets\n\n${markdownList([
    "Active project generation and persistence",
    "Intake edit behavior versus generated documents",
    "Document preview and export behavior",
    "Draft versus Ready package export integrity"
  ])}`,
  `## Power Platform test categories\n\n${markdownTable(["Category", "Requirement"], [
    ["Functional testing", powerPlatformValue(project.powerPlatform?.common.functionalTesting, "functional testing")],
    ["Connector testing", powerPlatformValue(project.powerPlatform?.common.connectorTesting, "connector testing")],
    ["Permission testing", powerPlatformValue(project.powerPlatform?.common.permissionTesting, "permission testing")],
    ["Security testing", powerPlatformValue(project.powerPlatform?.common.securityTesting, "security testing")],
    ["Accessibility testing", powerPlatformValue(project.powerPlatform?.common.accessibilityTesting, "accessibility testing")],
    ["Performance testing", powerPlatformValue(project.powerPlatform?.common.performanceTesting, "performance testing")],
    ["Volume testing", powerPlatformValue(project.powerPlatform?.common.volumeTesting, "volume testing")],
    ["Integration testing", powerPlatformValue(project.powerPlatform?.common.integrationTesting, "integration testing")],
    ["Regression testing", powerPlatformValue(project.powerPlatform?.common.regressionTesting, "regression testing")],
    ["User acceptance testing", powerPlatformValue(project.powerPlatform?.common.userAcceptanceTesting, "user acceptance testing")],
    ["Deployment testing", powerPlatformValue(project.powerPlatform?.common.deploymentTesting, "deployment testing")],
    ["Production smoke testing", powerPlatformValue(project.powerPlatform?.common.productionSmokeTesting, "production smoke testing")]
  ])}`,
  `## Manual test checklist\n\n${markdownList([
    `Generate package and verify all ${generatedFileCount(project)} applicable files exist`,
    "Confirm missing markers are visible in preview and ZIP",
    "Switch active project and verify preview/export use active project docs",
    "Edit intake after generation and verify docs persist until regenerate"
  ])}`,
  "## Accessibility checks\n\n- Keyboard navigation\n- Focus visibility\n- Semantic headings and labels\n- Color contrast",
  "## Security checks\n\n- Sanitized folder and file paths\n- No unsafe path traversal in export\n- Missing decisions explicitly marked",
  `## Data validation checks\n\n${listOrMissing(project.intake.requiredDataFields, "required data fields")}`,
  `## Workflow checks\n\n${listOrMissing(project.intake.workflowSteps, "workflow steps")}`,
  "## Export or deployment checks\n\n- ZIP includes approved folder structure\n- Manifest reflects generated docs\n- Export succeeds after generation",
  "## Regression checks\n\n- Intake navigation remains intact\n- Generated docs persist after refresh\n- Generated count remains accurate",
  "## Known gaps\n\n- No manual Power Platform environment checks are claimed until they are actually run."
);

const deploymentNotes = (project: ProjectRecord) => join(
  "# Deployment Notes",
  header(project),
  sectionOrMissing("Target platform", project.intake.targetPlatform, "target platform"),
  `## Environments\n\n${markdownTable(["Environment", "Decision"], [
    ["Development", powerPlatformValue(project.powerPlatform?.common.developmentEnvironment, "development environment")],
    ["Test", powerPlatformValue(project.powerPlatform?.common.testEnvironment, "test environment")],
    ["Production", powerPlatformValue(project.powerPlatform?.common.productionEnvironment, "production environment")],
    ["Current environment", powerPlatformValue(project.powerPlatform?.common.environment, "current environment")]
  ])}`,
  `## Solutions\n\n${markdownTable(["Item", "Decision"], [
    ["Solution name", powerPlatformValue(project.powerPlatform?.common.solutionName, "solution name")],
    ["Solution unique name", powerPlatformValue(project.powerPlatform?.common.solutionUniqueName, "solution unique name")],
    ["Publisher", powerPlatformValue(project.powerPlatform?.common.publisherName, "publisher")],
    ["Publisher prefix", powerPlatformValue(project.powerPlatform?.common.publisherPrefix, "publisher prefix")]
  ])}`,
  `## Connections and variables\n\n${markdownTable(["Item", "Decision"], [
    ["Connection references", powerPlatformValue(project.powerPlatform?.common.connectionReferences, "connection references")],
    ["Environment variables", powerPlatformValue(project.powerPlatform?.common.environmentVariables, "environment variables")]
  ])}`,
  `## Pipelines and responsibilities\n\n${markdownTable(["Item", "Decision"], [
    ["Source control", powerPlatformValue(project.powerPlatform?.common.sourceControlApproach, "source control approach")],
    ["Deployment method", powerPlatformValue(project.powerPlatform?.common.deploymentMethod, "deployment method")],
    ["Deployment responsibility", powerPlatformValue(project.powerPlatform?.common.deploymentResponsibility, "deployment responsibility")],
    ["Pipeline requirements", powerPlatformValue(project.powerPlatform?.common.pipelineRequirements, "pipeline requirements")],
    ["Release approval", powerPlatformValue(project.powerPlatform?.common.releaseApprovalResponsibility, "release approval responsibility")]
  ])}`,
  "## Build commands\n\n- npm.cmd test\n- npm.cmd run build\n- npm.cmd audit",
  `## Deployment steps\n\n${listOrMissing(project.powerPlatform?.common.deploymentStrategy || "", "deployment steps by environment")}`,
  "## Required secrets or configuration\n\n- Record names and owners only. Do not store secret values in this package.",
  `## Security notes\n\n${listOrMissing(project.intake.dataProtectionExpectations, "data protection expectations")}`,
  `## Rollback notes\n\n${listOrMissing(project.powerPlatform?.common.rollbackExpectations ?? "", "rollback process")}`,
  `## Smoke tests\n\n${listOrMissing(project.powerPlatform?.common.productionSmokeTesting ?? "", "production smoke testing")}`,
  `## Open deployment decisions\n\n${listOrMissing(project.powerPlatform?.common.outstandingLicensingDecisions || project.powerPlatform?.common.administrativeLimitations || "", "open deployment decisions or explicit none")}`
);

function powerPlatformArchitectGuidance(project: ProjectRecord): string {
  if (isCanvasProject(project)) {
    return join(
      "## Power Apps Canvas architecture rules\n\n- Stay connector-neutral until selected data sources, connector classification, licensing, and environment access are explicitly confirmed.\n- Do not assume Dataverse, premium connectors, custom connectors, gateway availability, or tenant permissions.\n- Treat SharePoint internal column names and Dataverse logical names as required implementation inputs, not derivable values.\n- Plan Power Fx behavior, delegation constraints, and Canvas YAML installation separately before implementation.\n- Do not create final Power Fx formulas, paste-ready YAML, or import instructions until the relevant gates are confirmed.",
      "## Canvas readiness gates\n\n" + powerPlatformGateSummary(project)
    );
  }

  if (isModelDrivenProject(project)) {
    return join(
      "## Model-driven architecture rules\n\n- Confirm Dataverse availability, model-driven licensing, environment access, maker permissions, import permissions, and deployment permissions before implementation.\n- Do not represent a model-driven app as a single Canvas YAML artifact.\n- Do not fabricate solution XML, publisher metadata, relationship schema names, forms, views, security roles, plug-ins, command bar rules, or ALM artifacts.\n- Use applicability decisions for optional components. Not-applicable items require a reason.\n- Treat manual solution import, validation, and deployment as human-controlled release actions unless explicitly approved later.",
      "## Model-driven readiness gates\n\n" + powerPlatformGateSummary(project)
    );
  }

  return "";
}

const architectInstructions = (project: ProjectRecord) => join(
  "# Architect Instructions",
  header(project),
  "## Architect role\n\nGPT Architect owns requirement review, scope control, missing-information resolution, and phase prompt approval. Codex is the Developer and must not invent scope.",
  sectionOrMissing("Project purpose", project.intake.appPurpose, "app purpose"),
  sectionOrMissing("Project type", getProjectTypeLabel(project.intake.appType), "project type"),
  sectionOrMissing("App subtype", project.powerPlatform?.canvas?.subtype || project.powerPlatform?.modelDriven?.subtype || project.powerPlatform?.common.appSubtype || "", "app subtype"),
  `## Current package readiness\n\n${packageReadiness(project)}`,
  `## Current blockers\n\n${readinessBlockers(project)}`,
  `## Approved scope\n\n${listOrMissing(project.intake.requiredFeatures, "approved scope")}`,
  `## Explicit out-of-scope items\n\n${listOrMissing(project.intake.outOfScope, "out-of-scope items")}`,
  sectionOrMissing("Target platform", project.intake.targetPlatform, "target platform"),
  `## Target users\n\n${listOrMissing(project.intake.targetUsers, "target users")}`,
  `## User roles\n\n${listOrMissing(project.intake.userRoles, "user roles")}`,
  `## Data sources\n\n${listOrMissing(project.intake.dataSources, "data sources")}`,
  `## Connector rules\n\n- Only approved connectors may be used.\n- Connector purpose, authentication, gateway, DLP impact, approval, and supported operations must be documented.\n- External connectors require explicit approval before implementation.`,
  "## Connector classification rules\n\n- Connector classification is never inferred from connector name.\n- Standard, premium, custom, and unknown classifications must be explicitly confirmed.\n- Premium connectors are not assumed.",
  "## Licensing rules\n\n- Licensing must be confirmed before Codex-ready implementation phases depend on Power Apps, Dataverse, premium connectors, model-driven apps, or custom connectors.",
  `## Environment rules\n\n${markdownTable(["Item", "Decision"], [
    ["Tenant", powerPlatformValue(project.powerPlatform?.common.tenant, "tenant")],
    ["Environment", powerPlatformValue(project.powerPlatform?.common.environment, "environment")],
    ["Environment access", decisionText(project.powerPlatform?.common.environmentAccessStatus)]
  ])}`,
  "## Schema rules\n\n- Schema must be confirmed before data-bound implementation.\n- Data source, ownership, record volume, relationships, and confirmation source must be documented.",
  "## SharePoint internal-name rules\n\n- Internal names cannot be derived from display names.\n- Renamed SharePoint fields must use the original internal name.",
  "## Dataverse logical-name rules\n\n- Logical names cannot be derived from display names.\n- Table, column, and relationship logical names require approved source confirmation.",
  "## Other-connector identifier rules\n\n- External connector resources and fields require stable identifiers, authentication notes, throttling notes, and confirmation source.",
  "## Architecture rules\n\n- Keep boundaries explicit between data, workflows, security, UI, and generation.\n- Avoid assumptions not present in intake or approved decisions.\n- Preserve deterministic output and missing-marker visibility.",
  "## Naming standards\n\nUse stable names from intake for projects, roles, features, screens, workflows, and entities.",
  "## Documentation standards\n\nEvery decision must be documented and contradictory statements must be resolved before handoff.",
  "## Accessibility expectations\n\nAccessibility requirements are mandatory and must be traceable to acceptance criteria.",
  "## Security expectations\n\nEnforce least privilege, sensitive-data handling notes, and explicit risk tracking.",
  "## Testing expectations\n\nDefine unit, integration, and manual verification requirements before Codex implementation starts.",
  "## ALM expectations\n\nEnvironment variables, connection references, source control, deployment responsibility, rollback, and release approvals must be documented before publication or deployment.",
  powerPlatformArchitectGuidance(project),
  "## Review process\n\n1. Resolve missing markers in Draft packages.\n2. Validate cross-document consistency.\n3. Confirm project-specific document counts and maps.\n4. Approve the next executable Codex phase only after blockers are resolved.",
  "## Allowed assumptions\n\n- Formatting or wording improvements that do not change scope.",
  "## Blocked assumptions\n\n- Backend, authentication, import, publication, deployment, external AI calls, paid services, Dataverse for Canvas, premium connectors, or architecture replacement without approval.",
  "## Missing-information behavior\n\nDraft packages may retain visible missing-information markers. Ready packages must resolve them before export can be valid.",
  "## Scope-change process\n\nAny scope change must be returned to GPT Architect for review before Codex implements it.",
  "## How Architect creates Codex prompts\n\nCreate phased, scoped prompts with objective, prerequisites, gate requirements, files, requirements, assets, validation, acceptance, and reporting.",
  "## How Architect reviews Codex output\n\nReview for scope compliance, requirement coverage, source evidence, security/accessibility impact, test evidence, and truthful manual-check reporting.",
  "## Review priority levels\n\n- Critical: corrupts data, bypasses gates, fabricates source, or deploys without approval.\n- High: incorrect documents, missing validation, broken export, or major accessibility/security issue.\n- Medium: incomplete docs, weak naming, unclear flow, or edge-case gaps.\n- Low: wording, formatting, or minor cleanup.",
  "## Completion rules\n\nThe Architect may approve the next phase only when blockers are resolved, generated documents match the applicable registry, and Codex output includes evidence for every claimed check."
);

function powerPlatformCodexGuidance(project: ProjectRecord): string {
  if (isCanvasProject(project)) {
    return join(
      "## Power Apps Canvas implementation boundaries\n\n- Build only from confirmed schema, connector, licensing, Power Fx planning, YAML planning, delegation, security, testing, and ALM documents.\n- If a gate is missing, stop the affected implementation slice and report the exact missing decision.\n- Do not invent SharePoint internal names, Dataverse logical names, connector classifications, premium licence assumptions, or gateway requirements.\n- Do not produce final Power Fx formulas or paste-ready YAML from draft planning notes.",
      "## Canvas manual validation rule\n\nCanvas Studio paste/import, connector creation, environment publication, and production deployment remain manual unless a later approved phase explicitly authorizes them."
    );
  }

  if (isModelDrivenProject(project)) {
    return join(
      "## Model-driven implementation boundaries\n\n- Use Dataverse schema, solution architecture, solution component register, forms/views, navigation, business logic, security roles, extension register, connection register, environment variables, and ALM plan as requirement documents.\n- If Dataverse, licensing, publisher, schema, security, extension, testing, or ALM gates are incomplete, stop and report the exact blocker.\n- Do not fabricate model-driven source, solution XML, imported managed solutions, plug-ins, PCF controls, web resources, command bar rules, or security-role privilege matrices.",
      "## Model-driven manual validation rule\n\nSolution import, app publication, environment deployment, and production release remain manual release steps unless a later approved phase explicitly authorizes them."
    );
  }

  return "";
}

const codexInstructions = (project: ProjectRecord) => join(
  "# Codex Instructions",
  header(project),
  "## Developer role\n\nCodex is the Developer. Build only the approved phase from GPT Architect instructions and report blockers instead of guessing.",
  `## Approved scope\n\n${listOrMissing(project.intake.requiredFeatures, "approved scope")}`,
  `## Out-of-scope work\n\n${listOrMissing(project.intake.outOfScope, "out-of-scope work")}`,
  sectionOrMissing("Project type", getProjectTypeLabel(project.intake.appType), "project type"),
  sectionOrMissing("App subtype", project.powerPlatform?.canvas?.subtype || project.powerPlatform?.modelDriven?.subtype || project.powerPlatform?.common.appSubtype || "", "app subtype"),
  `## Current readiness\n\n${packageReadiness(project)}`,
  `## Current blockers\n\n${readinessBlockers(project)}`,
  "## Files Codex may create\n\nCreate only files named by the active approved phase, or project-specific implementation assets explicitly authorized by Architect.",
  "## Files Codex may update\n\nUpdate only files required by the approved phase. Documentation updates are allowed when behavior changes.",
  "## Protected files\n\n- Do not modify generated packages, unrelated untracked files, ZIP artifacts, build output, coverage output, secrets, or protected transfer files unless the Architect explicitly authorizes it.",
  `## Folder structure\n\n${folderStructure()}`,
  "## Naming standards\n\nUse approved display names, internal names, logical names, schema names, connector names, and file names exactly as documented.",
  "## Coding standards\n\n- Clear naming and modular boundaries\n- Reusable components\n- No dead code\n- Deterministic outputs",
  "## Power Fx standards\n\nFinal Power Fx may be produced only when connector, licensing, environment, schema, identifier, Power Fx planning, delegation, and security gates pass.",
  "## YAML standards\n\nPaste-ready Canvas YAML may be produced only when schema, identifiers, Power Fx planning, YAML planning, delegation, security, testing, and ALM gates pass.",
  "## Model-driven source standards\n\nProduce model-driven specifications by default. Modify source only when real solution source exists and validation evidence is available. Do not fabricate solution XML or importable packages.",
  "## Connector rules\n\nUse only approved connectors and document authentication, gateway, DLP, approval, supported operations, limitations, and owner responsibilities.",
  "## Licensing rules\n\nDo not assume premium, Dataverse, custom connector, Power Apps, Power Automate, or model-driven licensing.",
  "## Environment rules\n\nDo not assume tenant, environment, maker, import, deployment, or publication permissions.",
  "## Schema rules\n\nUse confirmed schema only. Do not create data-bound implementation from draft schema.",
  "## Internal and logical name rules\n\nDo not derive SharePoint internal names, Dataverse logical names, relationship schema names, or connector identifiers from labels.",
  "## Implementation phases\n\nExecute PHASED_CODEX_PROMPTS.md in order unless Architect explicitly reorders.",
  "## Security rules\n\nSanitize names, avoid raw HTML injection, keep secrets out of source, and enforce least privilege.",
  "## Accessibility rules\n\nSemantic headings, labels, keyboard support, focus visibility, contrast, and clear validation states are required.",
  "## Testing rules\n\nRun tests and build after each phase-relevant change set. Manual checks must be reported as run only when actually performed.",
  powerPlatformCodexGuidance(project),
  "## Documentation rules\n\nUpdate README, change log, next steps, test plan, and implementation log when behavior changes.",
  "## Manual implementation boundaries\n\nPower Apps Studio actions, solution import, publication, sharing, deployment, and production release remain manual unless explicitly authorized.",
  "## Missing decision rule\n\nReport missing decisions in plain language and stop affected implementation work until Architect resolves them.",
  "## Missing-decision behavior\n\nWhen information is missing, stop the affected work, describe the missing decision, and continue only with safe planning or documentation.",
  "## Scope boundary rule\n\nCodex must stay inside approved scope and return any scope change to GPT Architect before implementation.",
  "## Scope-change prohibition\n\nDo not implement outside approved scope. Do not add features, integrations, paid services, authentication, deployment, or source changes without approval.",
  "## Commit and push rules\n\nDo not commit or push unless the active prompt explicitly authorizes it after checks pass.",
  "## Completion rules\n\nComplete a phase only when scope is met, gates are satisfied or blockers are reported, tests are run, and manual claims are evidence-backed.",
  "## Expected response format\n\n- Summary\n- Phase\n- Status\n- Files created\n- Files updated\n- Files removed\n- Implementation assets produced\n- Power Fx produced\n- YAML produced\n- Model-driven specifications produced\n- Code extensions produced\n- Configuration steps\n- Manual actions\n- Connectors\n- Licensing\n- Environment requirements\n- Security concerns\n- Delegation warnings\n- Tests\n- Manual checks\n- Missing decisions\n- Issues\n- Gate statuses\n- Completion criteria\n- Recommended next phase"
);

interface PhasePromptDefinition {
  name: string;
  objective: string;
  assets: string[];
  filesToCreate: string[];
  filesToUpdate: string[];
  requirements: string[];
  gates: PhaseGateId[];
  kind?: "planning" | "configuration" | "powerFx" | "yaml" | "validation" | "manualInstallation" | "deployment" | "finalReview" | "modelSource";
  applicability?: PowerPlatformApplicabilityDecision;
  applicabilityGroup?: Array<{ label: string; decision: PowerPlatformApplicabilityDecision | undefined }>;
}

const genericPhaseDefinitions: readonly PhasePromptDefinition[] = [
  { name: "Project setup", objective: "Create baseline project structure and shared configuration.", assets: ["Project repository structure"], filesToCreate: ["Project files approved by Architect"], filesToUpdate: ["README and project configuration"], requirements: ["Follow approved scope documents."], gates: [] },
  { name: "Data model", objective: "Implement entities, fields, and validation constraints.", assets: ["Data model specifications"], filesToCreate: ["Data-model assets approved by Architect"], filesToUpdate: ["Validation and data files"], requirements: ["Use approved entities and relationships."], gates: [] },
  { name: "Intake or core workflow", objective: "Implement intake or core business workflow behavior.", assets: ["Workflow implementation"], filesToCreate: ["Workflow files approved by Architect"], filesToUpdate: ["Application logic"], requirements: ["Preserve approved workflow boundaries."], gates: [] },
  { name: "UI and screens", objective: "Build or harden user-facing screens and navigation.", assets: ["UI screens"], filesToCreate: ["Screen components"], filesToUpdate: ["Navigation and styles"], requirements: ["Follow screen map and accessibility requirements."], gates: [] },
  { name: "Business logic", objective: "Implement service logic, rules, and orchestration.", assets: ["Business logic modules"], filesToCreate: ["Business logic files"], filesToUpdate: ["Existing modules"], requirements: ["Do not add unapproved features."], gates: [] },
  { name: "Security and permissions", objective: "Apply permission and sensitive-data handling rules.", assets: ["Security rules"], filesToCreate: ["Security-related files"], filesToUpdate: ["Permission checks"], requirements: ["Follow least-privilege requirements."], gates: [] },
  { name: "Export, reports, or integrations", objective: "Implement export/report/integration behavior in scope.", assets: ["Approved integration assets"], filesToCreate: ["Integration files"], filesToUpdate: ["Export or integration modules"], requirements: ["Use only approved integrations."], gates: [] },
  { name: "Review, testing, and deployment", objective: "Finalize tests, review, and deployment readiness.", assets: ["Test and release evidence"], filesToCreate: ["Test files"], filesToUpdate: ["Docs and release notes"], requirements: ["Run approved validation checks."], gates: [] }
];

const _canvasPhaseNames = [
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
] as const;

const _modelDrivenPhaseNames = [
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
] as const;

function lines(value: string | undefined, fallback: string): string[] {
  const values = (value ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return values.length ? values : [missingMarker(fallback)];
}

function structuredCanvasAssets(project: ProjectRecord): string[] {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return [];
  return [
    ...canvas.sharePointListSchemas.map((list) => `SharePoint list ${list.id} — ${list.displayName || missingMarker("list display name")}`),
    ...canvas.sharePointLibrarySchemas.map((library) => `SharePoint library ${library.id} — ${library.displayName || missingMarker("library display name")}`),
    ...canvas.sharePointColumnSchemas.map((column) => `SharePoint column ${column.id} parent ${column.parentId || missingMarker("parent ID")} internal ${column.internalName || missingMarker("internal name")} type ${column.columnType || missingMarker("column type")}`),
    ...canvas.dataverseTableSchemas.map((table) => `Canvas Dataverse table ${table.id} — ${table.displayName || missingMarker("table display name")} logical ${table.logicalName || missingMarker("logical name")}`),
    ...canvas.dataverseColumnSchemas.map((column) => `Canvas Dataverse column ${column.id} table ${column.tableId || missingMarker("table ID")} logical ${column.logicalName || missingMarker("column logical name")}`),
    ...canvas.dataverseRelationshipSchemas.map((relationship) => `Canvas Dataverse relationship ${relationship.id} parent ${relationship.parentTableId || missingMarker("parent table ID")} child ${relationship.childTableId || missingMarker("child table ID")}`),
    ...canvas.connectorResourceSchemas.map((resource) => `Connector resource ${resource.id} connector ${resource.connectorId || missingMarker("connector ID")} resource ${resource.resourceName || missingMarker("resource name")}`),
    ...canvas.connectorFieldSchemas.map((field) => `Connector field ${field.id} resource ${field.resourceId || missingMarker("resource ID")} identifier ${field.fieldIdentifier || missingMarker("field identifier")} operations read=${field.readBehavior || missingMarker("read behavior")} create=${field.createBehavior || missingMarker("create behavior")} update=${field.updateBehavior || missingMarker("update behavior")} delete=${field.deleteBehavior || missingMarker("delete behavior")}`),
    ...confirmedCanvasControls(project).map((control) => `Canvas control ${control.id} - ${control.approvedControlName} (${control.controlType}) on ${control.screenId}; operation ${control.operation || missingMarker("control operation")}`),
    ...selectedRecordStateAssets(project).map((variable) => `State variable ${stateVariableSummary(variable)}`)
  ];
}

function structuredModelAssets(project: ProjectRecord): string[] {
  const md = project.powerPlatform?.modelDriven;
  if (!md) return [];
  return [
    ...md.dataverseTableSchemas.map((table) => `Model-driven table ${table.id} — ${table.displayName || missingMarker("table display name")} logical ${table.logicalName || missingMarker("logical name")}`),
    ...md.dataverseColumnSchemas.map((column) => `Model-driven column ${column.id} table ${column.tableId || missingMarker("table ID")} logical ${column.logicalName || missingMarker("column logical name")}`),
    ...md.dataverseRelationshipSchemas.map((relationship) => `Model-driven relationship ${relationship.id} parent ${relationship.parentTableId || missingMarker("parent table ID")} child ${relationship.childTableId || missingMarker("child table ID")}`),
    ...lines(md.formDefinitions || md.forms, "form definitions").map((item) => `Fallback note: ${item}`),
    ...lines(md.viewDefinitions || md.views, "view definitions").map((item) => `Fallback note: ${item}`),
    ...lines(md.navigationDefinitions || md.navigation, "navigation definitions").map((item) => `Fallback note: ${item}`)
  ];
}

function safeTargetSegment(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "missing-target-id";
}

function formulaProperties(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function confirmedFormulaTargetFiles(project: ProjectRecord, operations?: string[]): string[] {
  const allowedOperations = operations ? new Set(operations.map((operation) => operation.toLowerCase())) : null;
  const validation = validateCanvasTargets(project);
  const files = validation.formulaTargets
    .filter((target) =>
      !allowedOperations || allowedOperations.has(target.operation.trim().toLowerCase())
    )
    .flatMap((target) => formulaProperties(target.formulaProperties).map((property) =>
      `07_Development/PowerFx/${safeTargetSegment(target.screenId)}/${safeTargetSegment(target.id)}/${safeTargetSegment(property)}.fx`
    ));
  return files.length > 0
    ? files
    : ["Target-file generation blocked: missing structured formula target records. Required target data includes stable screen ID, control ID, control type, formula property, operation, data source, entity, required fields, dependencies, and confirmation source."];
}

function confirmedYamlTargetFiles(project: ProjectRecord): string[] {
  const validation = validateCanvasTargets(project);
  const screenFiles = validation.yamlScreenTargets
    .map((target) => `04_UI_UX/YAML/${safeTargetSegment(target.id)}.screen.pa.yaml`);
  const controlFiles = validation.yamlControlTargets
    .map((target) => `04_UI_UX/YAML/${safeTargetSegment(target.screenId)}/${safeTargetSegment(target.id)}.control.pa.yaml`);
  const componentFiles = validation.yamlComponentTargets
    .map((target) => `04_UI_UX/YAML/components/${safeTargetSegment(target.id)}.component.pa.yaml`);
  const files = [...screenFiles, ...controlFiles, ...componentFiles];
  return files.length > 0
    ? files
    : ["Target-file generation blocked: missing structured YAML target records. Required target data includes stable target ID, output type, parent relationship, intended installation location, validation responsibility, and confirmation source."];
}

function canvasAssetsForPhase(project: ProjectRecord, phaseName: typeof _canvasPhaseNames[number]): string[] {
  const canvas = project.powerPlatform?.canvas;
  const structured = structuredCanvasAssets(project);
  const sources = [
    ...(structured.length > 0 ? structured : []),
    ...(usesSharePoint(project) && structured.length === 0 ? lines(canvas?.sharePointLists || canvas?.sharePointListDefinitions, "SharePoint lists").map((item) => `Fallback note: ${item}`) : []),
    ...(usesDataverse(project) && structured.length === 0 ? lines(canvas?.dataverseTables || canvas?.dataverseTableDefinitions, "Dataverse tables").map((item) => `Fallback note: ${item}`) : []),
    ...(usesOtherConnector(project) && structured.length === 0 ? lines(canvas?.otherDataSources || canvas?.otherConnectorSchemaDefinitions, "other connector data sources").map((item) => `Fallback note: ${item}`) : [])
  ];
  switch (phaseName) {
    case "Create operations":
      return [
        ...lines(canvas?.forms || canvas?.screenNames || project.intake.screens, "create screens or forms"),
        ...(saveCancelCanvasAssets(project).length ? saveCancelCanvasAssets(project) : lines("", "save/cancel controls")),
        ...sources,
        ...lines(project.intake.requiredDataFields || project.intake.fields, "required fields"),
        ...lines(canvas?.validationRequirements, "validation rules")
      ];
    case "View and edit operations":
      return [
        ...lines(canvas?.forms || canvas?.screenNames || project.intake.screens, "view/edit screens or forms"),
        ...sources,
        ...(selectedRecordStateAssets(project).length ? selectedRecordStateAssets(project).map(stateVariableSummary) : lines("", "selected-record state")),
        ...lines(canvas?.updateBehavior || canvas?.readBehavior, "update and view behavior"),
        ...lines(canvas?.concurrentUpdateHandling, "concurrency rules")
      ];
    case "Attachments and files":
      if (isCanvasFileNotApplicable(project)) {
        return [`Not applicable: ${canvas?.fileApplicabilityDecision.notApplicableReason}`];
      }
      return [
        ...lines(canvas?.sharePointLibraries || canvas?.sharePointLibraryDefinitions || canvas?.attachmentRequirements || canvas?.fileRequirements, "file-enabled lists, libraries, or attachment requirements"),
        ...(confirmedCanvasControls(project).some((control) => /attach|file|upload|download/i.test(`${control.approvedControlName} ${control.purpose} ${control.operation}`))
          ? confirmedCanvasControls(project)
              .filter((control) => /attach|file|upload|download/i.test(`${control.approvedControlName} ${control.purpose} ${control.operation}`))
              .map((control) => `${control.id}: ${control.approvedControlName} (${control.controlType})`)
          : lines("", "attachment controls")),
        ...lines(project.intake.fields, "file metadata"),
        ...lines(canvas?.fileRequirements || canvas?.attachmentRequirements, "upload/download requirements"),
        ...lines(project.intake.permissionRules || project.intake.permissions, "file permissions")
      ];
    case "Permissions and role-based interface":
      return [
        ...lines(project.intake.userRoles, "roles"),
        ...lines(project.intake.permissionRules || project.intake.permissions, "permission rules"),
        ...lines(canvas?.visibilityRules || canvas?.displayModeRules, "role-based interface targets")
      ];
    case "Canvas YAML generation":
      return [
        ...lines(canvas?.screenNames || canvas?.screens || project.intake.screens, "YAML screen targets"),
        ...sources,
        ...lines(canvas?.fullScreenYamlRequired || canvas?.controlLevelYamlRequired || canvas?.containerYamlRequired || canvas?.componentYamlRequired, "YAML requirements")
      ];
    default:
      return [
        ...lines(canvas?.screenNames || canvas?.screens || project.intake.screens, "Canvas screens"),
        ...sources
      ];
  }
}

function canvasPhase(
  project: ProjectRecord,
  name: typeof _canvasPhaseNames[number],
  gates: PhaseGateId[],
  kind: PhasePromptDefinition["kind"],
  requirements: string[],
  filesToCreate: string[]
): PhasePromptDefinition {
  return {
    name,
    objective: `Execute ${name} for ${safeText(project.identity.projectName, "project name")} using the approved Canvas intake and generated package.`,
    assets: canvasAssetsForPhase(project, name).map((asset) => `Project asset: ${asset}`),
    filesToCreate,
    filesToUpdate: ["POWER_FX_STANDARDS.md", "CONTROL_INVENTORY.md", "IMPLEMENTATION_LOG.md"],
    requirements,
    gates,
    kind
  };
}

export function canvasPhaseDefinitions(project: ProjectRecord): PhasePromptDefinition[] {
  return [
    canvasPhase(project, "Project setup and requirements confirmation", ["scope", "projectType", "currentBlockers"], "planning", ["Confirm approved scope, project type, blockers, and package map before implementation."], ["00_Project_Overview/phase-01-requirements-confirmation.md"]),
    canvasPhase(project, "Connector and licensing confirmation", ["connectorSelection", "connectorClassification", "licensing"], "configuration", ["Confirm every connector, connector class, license impact, and approval source."], ["01_Requirements/connector-licensing-confirmation.md"]),
    canvasPhase(project, "Environment confirmation", ["environment", "licensing"], "configuration", ["Confirm tenant, environment, maker access, DLP, and environment-specific constraints."], ["02_Architecture/environment-confirmation.md"]),
    canvasPhase(project, "Data-source selection", ["connectorSelection", "primaryConnectorAssignment", "secondaryConnectorAssignments"], "configuration", ["Confirm primary connector and every secondary connector for mixed-source projects."], ["03_Data_Model/data-source-selection.md"]),
    canvasPhase(project, "Data-source schema confirmation", ["connectorSelection", "sharePointSchema", "dataverseSchema", "connectorSchema"], "configuration", ["Confirm every applicable backend schema before data-bound implementation."], ["03_Data_Model/data-source-schema-confirmation.md"]),
    canvasPhase(project, "Internal, logical, or field identifier confirmation", ["internalNames", "logicalNames", "connectorIdentifiers"], "configuration", ["Confirm every applicable SharePoint internal name, Dataverse logical name, and external field identifier."], ["03_Data_Model/identifier-confirmation.md"]),
    canvasPhase(project, "Architecture and naming standards", ["schema", "internalNames", "logicalNames", "connectorIdentifiers", "namingStandards", "security"], "planning", ["Define naming standards from confirmed identifiers and security planning."], ["02_Architecture/canvas-architecture-naming.md"]),
    canvasPhase(project, "App configuration and theme", ["environment", "appConfiguration", "accessibility"], "configuration", ["Configure app-level settings, theme requirements, owners, and accessibility requirements."], ["02_Architecture/app-configuration-theme.md"]),
    canvasPhase(project, "Responsive foundation", ["appConfiguration", "targetDevices", "screenSizePlanning", "accessibility"], "configuration", ["Implement responsive foundation based on target devices and screen-size planning."], ["04_UI_UX/responsive-foundation.md"]),
    canvasPhase(project, "Screens, containers, and navigation", ["screenMap", "screenTargets", "controlTargets", "appConfiguration", "schema", "internalNames", "logicalNames", "connectorIdentifiers", "security"], "configuration", ["Build approved screens, containers, navigation, and visibility rules only."], ["04_UI_UX/screens-navigation.md"]),
    canvasPhase(project, "Reusable components", ["componentRequirements", "componentTargets", "namingStandards", "accessibility", "security"], "configuration", ["Create reusable components only where approved by the component inventory."], ["04_UI_UX/reusable-components.md"]),
    canvasPhase(project, "Data loading and state management", ["connectorSelection", "connectorClassification", "licensing", "environment", "schema", "internalNames", "logicalNames", "connectorIdentifiers", "screenTargets", "controlTargets", "formulaTargets", "powerFx", "delegation", "security"], "powerFx", ["Produce Power Fx only after the complete formula gate set passes."], confirmedFormulaTargetFiles(project, ["read", "load"])),
    canvasPhase(project, "Create operations", ["connectorSelection", "connectorClassification", "licensing", "environment", "schema", "internalNames", "logicalNames", "connectorIdentifiers", "screenTargets", "controlTargets", "formulaTargets", "powerFx", "delegation", "security"], "powerFx", ["Create operation assets must reference actual screens, forms, controls, connectors, tables, lists, and collections."], confirmedFormulaTargetFiles(project, ["create"])),
    canvasPhase(project, "View and edit operations", ["connectorSelection", "connectorClassification", "licensing", "environment", "schema", "internalNames", "logicalNames", "connectorIdentifiers", "screenTargets", "controlTargets", "formulaTargets", "powerFx", "delegation", "security"], "powerFx", ["View/edit assets must target approved view and edit screens, forms, and data sources."], confirmedFormulaTargetFiles(project, ["read", "update", "edit"])),
    canvasPhase(project, "Archive and restore operations", ["connectorSelection", "connectorClassification", "licensing", "environment", "schema", "internalNames", "logicalNames", "connectorIdentifiers", "screenTargets", "controlTargets", "formulaTargets", "powerFx", "delegation", "security"], "powerFx", ["Archive and restore must use approved status fields and archive model."], confirmedFormulaTargetFiles(project, ["archive", "restore"])),
    canvasPhase(project, "Search, filter, sort, and delegation", ["connectorSelection", "connectorClassification", "licensing", "environment", "schema", "internalNames", "logicalNames", "connectorIdentifiers", "screenTargets", "controlTargets", "formulaTargets", "powerFx", "delegation", "security", "recordVolumes", "connectorDelegation"], "powerFx", ["Search, filter, and sort must respect expected record volumes and connector-specific delegation support."], confirmedFormulaTargetFiles(project, ["search", "filter", "sort", "read"])),
    { ...canvasPhase(project, "Attachments and files", ["connectorSelection", "connectorClassification", "licensing", "schema", "internalNames", "logicalNames", "connectorIdentifiers", "screenTargets", "controlTargets", "formulaTargets", "powerFx", "security", "fileRequirements"], "powerFx", ["When files are not applicable, record the approved reason and do not generate file implementation assets."], confirmedFormulaTargetFiles(project, ["upload", "download", "file"])), applicability: project.powerPlatform?.canvas?.fileApplicabilityDecision },
    canvasPhase(project, "Permissions and role-based interface", ["security", "connectorPermissions", "dataSourcePermissions", "roleVisibility"], "configuration", ["Implement role-based visibility only from approved role and permission rules."], ["06_Security/role-interface-configuration.md"]),
    canvasPhase(project, "Accessibility", ["accessibility", "accessibilityTesting", "screenMap", "controlInventory"], "validation", ["Validate labels, focus order, keyboard behavior, errors, contrast, and responsive text."], ["08_Testing/accessibility-checklist.md"]),
    canvasPhase(project, "Canvas YAML generation", ["connectorSelection", "connectorClassification", "licensing", "environment", "schema", "internalNames", "logicalNames", "connectorIdentifiers", "screenTargets", "controlTargets", "componentTargets", "formulaTargets", "yamlTargets", "powerFx", "yaml", "delegation", "security", "testing", "alm"], "yaml", ["Generate paste-ready YAML only when every YAML gate passes; otherwise generate planning only."], confirmedYamlTargetFiles(project)),
    canvasPhase(project, "Connector setup and manual installation", ["connectorSelection", "connectorClassification", "licensing", "environment", "connectionOwnership", "gateway", "dlp", "alm"], "manualInstallation", ["Record manual connector setup, gateway, DLP, ownership, and installation steps."], ["07_Development/manual-connector-installation.md"]),
    canvasPhase(project, "Testing and acceptance", ["testing", "security", "implementationSpecifications", "acceptanceCriteria"], "validation", ["Run only available automated/manual checks and report not-run checks truthfully."], ["08_Testing/canvas-acceptance-results.md"]),
    canvasPhase(project, "Publishing and deployment", ["environment", "licensing", "security", "testing", "alm", "releaseApproval", "deploymentResponsibility"], "deployment", ["Publishing and deployment remain manual unless explicitly authorized."], ["09_Deployment/canvas-publishing-deployment.md"]),
    canvasPhase(project, "Final review and cleanup", ["allPowerPlatformGates"], "finalReview", ["Confirm all applicable gates, documents, exports, and handoff instructions before approval."], ["00_Project_Overview/final-review-cleanup.md"])
  ];
}

function modelAssetsForPhase(project: ProjectRecord, phaseName: typeof _modelDrivenPhaseNames[number]): string[] {
  const md = project.powerPlatform?.modelDriven;
  const structured = structuredModelAssets(project);
  switch (phaseName) {
    case "Forms":
      return [
        ...structured,
        ...lines(md?.tableDefinitions || md?.tables, "Dataverse tables"),
        ...lines(md?.formDefinitions || md?.forms, "forms"),
        ...lines(md?.columnDefinitions || md?.columns, "form columns"),
        ...lines(md?.securityRoles, "form security")
      ];
    case "Views":
      return [
        ...structured,
        ...lines(md?.tableDefinitions || md?.tables, "Dataverse tables"),
        ...lines(md?.viewDefinitions || md?.views, "views"),
        ...lines(md?.columnDefinitions || md?.columns, "view columns"),
        ...lines(md?.charts || md?.dashboards || "Editable-grid decision must be confirmed in forms/views notes.", "view options")
      ];
    case "Business rules":
      return [
        ...structured,
        ...lines(md?.businessRules, "business-rule requirements"),
        ...lines(md?.tableDefinitions || md?.tables, "tables"),
        ...lines(md?.columnDefinitions || md?.columns, "columns"),
        ...lines(md?.validationRules, "validation requirements")
      ];
    case "Command bar and client scripting":
      return [
        ...lines(md?.commandBarRules || md?.commandBarRulesDecision.notApplicableReason, "command-bar rules"),
        ...lines(md?.clientSideJavaScript || md?.clientSideJavaScriptDecision.notApplicableReason, "client scripting")
      ];
    case "PCF, plug-ins, custom APIs, and web resources":
      return [
        ...lines(md?.pcfControls || md?.pcfControlsDecision.notApplicableReason, "PCF controls"),
        ...lines(md?.plugins || md?.pluginsDecision.notApplicableReason, "plug-ins"),
        ...lines(md?.customApis || md?.customApisDecision.notApplicableReason, "custom APIs"),
        ...lines(md?.webResources || md?.webResourcesDecision.notApplicableReason, "web resources"),
        ...lines(md?.externalServices || md?.externalServicesDecision.notApplicableReason, "external services")
      ];
    default:
      return [
        ...structured,
        ...(structured.length === 0 ? lines(md?.tableDefinitions || md?.tables, "Dataverse tables").map((item) => `Fallback note: ${item}`) : []),
        ...(structured.length === 0 ? lines(md?.columnDefinitions || md?.columns, "Dataverse columns").map((item) => `Fallback note: ${item}`) : []),
        ...(structured.length === 0 ? lines(md?.relationshipDefinitions || md?.relationships, "Dataverse relationships").map((item) => `Fallback note: ${item}`) : []),
        ...(structured.length === 0 ? lines(md?.navigationDefinitions || md?.navigation, "navigation").map((item) => `Fallback note: ${item}`) : [])
      ];
  }
}

function modelPhase(
  project: ProjectRecord,
  name: typeof _modelDrivenPhaseNames[number],
  gates: PhaseGateId[],
  kind: PhasePromptDefinition["kind"],
  requirements: string[],
  filesToCreate: string[],
  applicability?: PowerPlatformApplicabilityDecision
): PhasePromptDefinition {
  return {
    name,
    objective: `Execute ${name} for ${safeText(project.identity.projectName, "project name")} using confirmed model-driven requirements.`,
    assets: modelAssetsForPhase(project, name).map((asset) => `Project asset: ${asset}`),
    filesToCreate,
    filesToUpdate: ["SOLUTION_COMPONENT_REGISTER.md", "IMPLEMENTATION_LOG.md", "ALM_DEPLOYMENT_PLAN.md"],
    requirements: [
      "Dataverse is required for model-driven apps.",
      "Use real solution metadata and confirmed logical names.",
      "Do not generate fabricated model-driven source; produce specifications unless real source is available.",
      "Do not represent the app as a single Canvas YAML artifact.",
      "Do not fabricate solution XML, importable packages, or source files.",
      ...requirements
    ],
    gates,
    kind,
    applicability
  };
}

export function modelDrivenPhaseDefinitions(project: ProjectRecord): PhasePromptDefinition[] {
  const md = project.powerPlatform?.modelDriven;
  return [
    modelPhase(project, "Project setup and requirements confirmation", ["scope", "projectType", "currentBlockers"], "planning", ["Confirm approved scope and current blockers."], ["00_Project_Overview/model-phase-01-requirements.md"]),
    modelPhase(project, "Dataverse and licensing confirmation", ["eligibility", "dataverseAvailability", "modelDrivenLicensing", "externalConnectorLicensing"], "configuration", ["Confirm Dataverse and model-driven licensing."], ["00_Project_Overview/dataverse-licensing-confirmation.md"]),
    modelPhase(project, "Environment, solution, and publisher confirmation", ["eligibility", "environment", "licensing", "solutionPermission", "publisherPrefix"], "configuration", ["Confirm environment, solution, publisher, prefix, and permissions."], ["02_Architecture/environment-solution-publisher.md"]),
    modelPhase(project, "Dataverse table inventory", ["eligibility", "environment", "licensing", "schema", "logicalNames", "tableCreationPermission"], "configuration", ["Confirm table inventory and creation permissions."], ["03_Data_Model/table-inventory.md"]),
    modelPhase(project, "Column and choice confirmation", ["eligibility", "environment", "licensing", "schema", "logicalNames", "tableCreationPermission"], "configuration", ["Confirm columns, choices, data types, and required levels."], ["03_Data_Model/column-choice-confirmation.md"]),
    modelPhase(project, "Relationship confirmation", ["eligibility", "environment", "licensing", "schema", "logicalNames", "tableCreationPermission"], "configuration", ["Confirm relationship schema names and cascade behavior."], ["03_Data_Model/relationship-confirmation.md"]),
    modelPhase(project, "Dataverse schema approval", ["eligibility", "environment", "licensing", "schema", "logicalNames", "tableCreationPermission"], "configuration", ["Approve Dataverse schema before implementation."], ["03_Data_Model/dataverse-schema-approval.md"]),
    modelPhase(project, "External connector and integration review", ["externalConnectorSelection", "externalConnectorClassification", "externalConnectorLicensing", "authentication", "approval"], "configuration", ["Return Not Applicable when no external connectors are approved or required."], ["01_Requirements/external-connector-review.md"]),
    modelPhase(project, "Security architecture", ["securityArchitecture", "eligibility", "environment", "schema", "securityRolePermission"], "configuration", ["Confirm security roles, teams, privileges, and field security."], ["06_Security/security-architecture.md"]),
    modelPhase(project, "Solution architecture", ["eligibility", "environment", "licensing", "schema", "logicalNames", "formsAndViews", "navigation", "securityArchitecture", "businessLogic", "extensions", "alm", "solutionArchitecture"], "configuration", ["Confirm the whole solution architecture before source or import work."], ["02_Architecture/solution-architecture-specification.md"]),
    modelPhase(project, "Forms", ["formsAndViews", "schema", "logicalNames", "securityArchitecture"], "configuration", ["Confirm forms and form security behavior."], ["04_UI_UX/forms-specification.md"]),
    modelPhase(project, "Views", ["formsAndViews", "schema", "logicalNames", "securityArchitecture"], "configuration", ["Confirm views, filters, columns, and role expectations."], ["04_UI_UX/views-specification.md"]),
    modelPhase(project, "App pages and navigation", ["navigation", "appPages", "formsAndViews", "securityArchitecture"], "configuration", ["Confirm app pages and navigation placement."], ["04_UI_UX/app-pages-navigation.md"], md?.appPagesDecision),
    modelPhase(project, "Business rules", ["businessRules", "businessLogic", "schema", "logicalNames"], "configuration", ["Confirm business-rule applicability and requirements."], ["05_Workflows/business-rules-specification.md"], md?.businessRulesDecision),
    modelPhase(project, "Business process flows", ["businessProcessFlows", "businessLogic", "securityArchitecture"], "configuration", ["Confirm BPF applicability, stages, tables, roles, and activation boundaries."], ["05_Workflows/business-process-flows-specification.md"], md?.businessProcessFlowsDecision),
    modelPhase(project, "Automations", ["automations", "businessLogic", "connectorClassification", "externalConnectorLicensing", "securityArchitecture"], "configuration", ["Confirm automation applicability and connector/security impacts."], ["05_Workflows/automation-specification.md"], md?.automationsDecision),
    { ...modelPhase(project, "Charts and dashboards", ["chartsAndDashboards", "formsAndViews", "securityArchitecture"], "configuration", ["Aggregate chart and dashboard applicability decisions."], ["04_UI_UX/charts-dashboards-specification.md"]), applicabilityGroup: [{ label: "Charts", decision: md?.chartsDecision }, { label: "Dashboards", decision: md?.dashboardsDecision }] },
    modelPhase(project, "Custom pages", ["customPages", "extensions", "securityArchitecture", "licensing", "canvasCustomPageRequirements"], "configuration", ["Confirm custom page applicability and Canvas requirements."], ["04_UI_UX/custom-pages-specification.md"], md?.customPagesDecision),
    { ...modelPhase(project, "Command bar and client scripting", ["commandBar", "clientScripting", "extensions", "securityArchitecture", "alm"], "modelSource", ["Aggregate command bar and client-side JavaScript decisions."], ["07_Development/command-bar-client-scripting-specification.md"]), applicabilityGroup: [{ label: "Command bar", decision: md?.commandBarRulesDecision }, { label: "Client-side JavaScript", decision: md?.clientSideJavaScriptDecision }] },
    { ...modelPhase(project, "PCF, plug-ins, custom APIs, and web resources", ["pcf", "plugins", "customApis", "webResources", "htmlWebResources", "imageWebResources", "customWorkflowActivities", "azureIntegrations", "externalServices", "extensions", "sourceAvailability", "securityArchitecture", "alm"], "modelSource", ["Aggregate every extension decision and do not fabricate source."], ["07_Development/extensions-source-specification.md"]), applicabilityGroup: [
      { label: "PCF controls", decision: md?.pcfControlsDecision },
      { label: "Plug-ins", decision: md?.pluginsDecision },
      { label: "Custom APIs", decision: md?.customApisDecision },
      { label: "Web resources", decision: md?.webResourcesDecision },
      { label: "HTML web resources", decision: md?.htmlWebResourcesDecision },
      { label: "Image web resources", decision: md?.imageWebResourcesDecision },
      { label: "Custom workflow activities", decision: md?.customWorkflowActivitiesDecision },
      { label: "Azure integrations", decision: md?.azureIntegrationsDecision },
      { label: "External services", decision: md?.externalServicesDecision }
    ] },
    modelPhase(project, "Environment variables and connection references", ["environment", "alm", "connectionReferences", "environmentVariables"], "configuration", ["Confirm variables and connection references without recording secrets."], ["07_Development/environment-variables-connections.md"]),
    modelPhase(project, "Data migration", ["schema", "logicalNames", "securityArchitecture", "dataMigration", "alm"], "configuration", ["Confirm migration requirements and data ownership."], ["03_Data_Model/data-migration-specification.md"]),
    modelPhase(project, "Source control and ALM", ["alm", "sourceAvailability", "environmentStrategy"], "configuration", ["Confirm source availability and ALM strategy."], ["09_Deployment/source-control-alm.md"]),
    modelPhase(project, "Solution validation", ["solutionArchitecture", "schema", "logicalNames", "formsAndViews", "navigation", "securityArchitecture", "businessLogic", "extensions", "testing"], "validation", ["Run solution validation only with available environment/source evidence."], ["08_Testing/solution-validation.md"]),
    modelPhase(project, "Import, publication, and deployment", ["eligibility", "licensing", "environment", "importPermission", "deploymentPermission", "sourceAvailability", "alm", "testing", "releaseApproval"], "deployment", ["Do not claim import, publication, or deployment without evidence."], ["09_Deployment/import-publication-deployment.md"]),
    modelPhase(project, "Testing and acceptance", ["testing", "securityArchitecture", "solutionArchitecture", "schema", "formsAndViews", "navigation", "businessLogic", "extensions", "acceptanceCriteria"], "validation", ["Verify testing and acceptance criteria."], ["08_Testing/model-driven-acceptance.md"]),
    modelPhase(project, "Final review and cleanup", ["allPowerPlatformGates"], "finalReview", ["Confirm all applicable gates and package readiness."], ["00_Project_Overview/model-final-review-cleanup.md"])
  ];
}

export function phaseDefinitionsFor(project: ProjectRecord): PhasePromptDefinition[] {
  if (isCanvasProject(project)) return canvasPhaseDefinitions(project);
  if (isModelDrivenProject(project)) return modelDrivenPhaseDefinitions(project);
  return [...genericPhaseDefinitions];
}

function phaseGateTable(project: ProjectRecord, phase: PhasePromptDefinition): string {
  if (phase.gates.length === 0) return "- No blocking Power Platform gates for this phase.";
  return markdownTable(["Required gate", "Current status", "Blocking reason", "Editable intake section", "Generated implementation assets allowed"], phase.gates.map((gateId) => {
    assertKnownPhaseGateId(gateId);
    const result = evaluatePhaseGate(project, gateId);
    const status = formatPowerPlatformGateStatus(result.status);
    const blocked = !isPhaseGatePassing(result);
    return [
      result.label,
      status,
      blocked ? result.blockingReason : "None",
      result.sourceSection,
      blocked ? "No" : "Yes"
    ];
  }));
}

function phaseAssetsAllowed(project: ProjectRecord, phase: PhasePromptDefinition): boolean {
  if (!["Applicable", "No Applicability Gate"].includes(evaluatePhaseApplicability(phase).status)) return false;
  return phase.gates.every((gateId) => {
    assertKnownPhaseGateId(gateId);
    return isPhaseGatePassing(evaluatePhaseGate(project, gateId));
  });
}

type EvaluatedPhaseApplicabilityStatus = "Applicable" | "Not Applicable" | "Blocked by Undecided Applicability" | "Review Required" | "No Applicability Gate";

interface EvaluatedPhaseApplicability {
  status: EvaluatedPhaseApplicabilityStatus;
  details: string;
  reason: string;
}

function evaluateSingleApplicability(decision: PowerPlatformApplicabilityDecision | undefined): EvaluatedPhaseApplicability {
  if (!decision) return { status: "No Applicability Gate", details: "No explicit applicability decision is required for this phase.", reason: "" };
  if (decision.status === "undecided") return { status: "Blocked by Undecided Applicability", details: missingMarker("applicability decision"), reason: "" };
  if (decision.status === "notApplicable") {
    if (decision.confirmationStatus === "confirmed" && decision.notApplicableReason.trim()) {
      return { status: "Not Applicable", details: "", reason: decision.notApplicableReason };
    }
    return { status: "Review Required", details: "", reason: safeText(decision.notApplicableReason, "confirmed not-applicable reason") };
  }
  if (decision.details.trim() && decision.confirmationStatus === "confirmed") {
    return { status: "Applicable", details: decision.details, reason: "" };
  }
  return { status: "Review Required", details: safeText(decision.details, "confirmed applicability details"), reason: "" };
}

function evaluateGroupedApplicability(decisions: Array<{ label: string; decision: PowerPlatformApplicabilityDecision | undefined }>): EvaluatedPhaseApplicability {
  if (decisions.length === 0) return { status: "No Applicability Gate", details: "No combined applicability decisions for this phase.", reason: "" };
  const rows = decisions.map(({ label, decision }) => {
    const status = decision?.status ?? "undecided";
    const detail = status === "required"
      ? safeText(decision?.details ?? "", `${label} details`)
      : status === "notApplicable"
        ? safeText(decision?.notApplicableReason ?? "", `${label} not-applicable reason`)
        : missingMarker(`${label} applicability decision`);
    const confirmed = decision?.confirmationStatus === "confirmed" ? "Confirmed" : "Not confirmed";
    const blocking = status === "undecided"
      || (status === "required" && (!decision?.details || decision.confirmationStatus !== "confirmed"))
      || (status === "notApplicable" && (!decision?.notApplicableReason || decision.confirmationStatus !== "confirmed"));
    return [label, status, detail, confirmed, blocking ? "Blocked" : "Clear"];
  });
  const required = rows.filter((row) => row[1] === "required").map((row) => row[0]);
  const notApplicable = rows.filter((row) => row[1] === "notApplicable").map((row) => `${row[0]} — ${row[2]}`);
  const undecided = rows.filter((row) => row[1] === "undecided").map((row) => row[0]);
  const unconfirmed = rows.filter((row) => row[3] !== "Confirmed").map((row) => row[0]);
  const overall = undecided.length || unconfirmed.length || rows.some((row) => row[4] === "Blocked")
    ? "Blocked by Undecided Applicability"
    : required.length
      ? "Applicable"
      : "Not Applicable";
  const details = join(
    `Overall status: ${overall}`,
    `Required components: ${required.length ? required.join(", ") : "None"}`,
    `Not-applicable components: ${notApplicable.length ? notApplicable.join("; ") : "None"}`,
    `Undecided components: ${undecided.length ? undecided.join(", ") : "None"}`,
    `Unconfirmed components: ${unconfirmed.length ? unconfirmed.join(", ") : "None"}`,
    markdownTable(["Component", "Decision", "Details or reason", "Confirmation", "Blocking"], rows)
  );
  return {
    status: overall as EvaluatedPhaseApplicabilityStatus,
    details,
    reason: notApplicable.join("; ")
  };
}

function evaluatePhaseApplicability(phase: PhasePromptDefinition): EvaluatedPhaseApplicability {
  if (phase.applicabilityGroup) return evaluateGroupedApplicability(phase.applicabilityGroup);
  return evaluateSingleApplicability(phase.applicability);
}

function phaseApplicability(phase: PhasePromptDefinition): string {
  const evaluated = evaluatePhaseApplicability(phase);
  if (phase.applicabilityGroup) return evaluated.details;
  if (evaluated.status === "Not Applicable") return `Not Applicable. Reason: ${safeText(evaluated.reason, "not-applicable reason")}`;
  if (evaluated.status === "Applicable") return `Applicable. Details: ${safeText(evaluated.details, "applicability details")}`;
  return `${evaluated.status}. ${evaluated.details || evaluated.reason}`;
}

function phaseFilesToCreate(project: ProjectRecord, phase: PhasePromptDefinition): string[] {
  void project;
  const applicability = evaluatePhaseApplicability(phase);
  if (applicability.status === "Not Applicable") {
    return [`No implementation file targets authorized. Approved Not Applicable reason: ${safeText(applicability.reason, "not-applicable reason")}`];
  }
  if (applicability.status === "Blocked by Undecided Applicability" || applicability.status === "Review Required") {
    return [`Implementation file-target generation blocked by applicability: ${applicability.status}.`];
  }
  return phase.filesToCreate;
}

function phaseImplementationPolicy(project: ProjectRecord, phase: PhasePromptDefinition): string {
  const applicability = evaluatePhaseApplicability(phase);
  if (applicability.status === "Not Applicable") {
    return `Applicability status: Not Applicable. No implementation assets authorized. Approved reason: ${safeText(applicability.reason, "not-applicable reason")}`;
  }
  if (applicability.status === "Blocked by Undecided Applicability" || applicability.status === "Review Required") {
    return `Applicability status: ${applicability.status}. Generated implementation assets are blocked until applicability details and confirmation are complete.`;
  }
  const allowed = phaseAssetsAllowed(project, phase);
  if (phase.kind === "powerFx") {
    return allowed
      ? "Formula generation status: Allowed. Complete Power Fx may be produced for this phase using confirmed schema and identifiers."
      : "Formula generation status: Blocked. Generate requirements and planning only until the listed gates are confirmed.";
  }
  if (phase.kind === "yaml") {
    return allowed
      ? "YAML generation status: Allowed. Paste-ready Canvas YAML may be produced only for the approved scope and must still be manually validated in Power Apps Studio."
      : "YAML generation status: Blocked. Do not generate paste-ready YAML until the listed gates are confirmed.";
  }
  if (phase.kind === "modelSource") {
    return "Model-driven source status: Specifications only unless real solution source files are available and validated. Solution XML or importable packages must not be fabricated.";
  }
  return allowed
    ? "Generated implementation assets are allowed for this phase within approved scope."
    : "Generated implementation assets are blocked until the listed gates are confirmed.";
}

const phasedPrompts = (project: ProjectRecord) => {
  const phases = phaseDefinitionsFor(project);
  return join(
    "# Phased Codex Prompts",
    header(project),
    ...phases.map((phase, index) => join(
      `## Phase ${index + 1}: ${phase.name}`,
      `### Phase number\n${index + 1}`,
      `### Phase name\n${phase.name}`,
      `### Objective\n${phase.objective}`,
      `### Prerequisites\n${powerPlatformGateSummary(project)}`,
      `### Gate requirements\n${phaseGateTable(project, phase)}`,
      `### Files to create\n${markdownList(phaseFilesToCreate(project, phase))}`,
      `### Files to update\n${markdownList(phase.filesToUpdate)}`,
      `### Files to create or update\n${markdownList([...phaseFilesToCreate(project, phase), ...phase.filesToUpdate])}`,
      `### Exact requirements\n${markdownList(phase.requirements)}`,
      `### Generated implementation assets\n${phaseImplementationPolicy(project, phase)}\n${markdownList(phase.assets)}`,
      "### Configuration steps\n- Record environment-specific setup steps.\n- Keep secrets out of source and generated documents.\n- Mark manual Power Platform actions as manual actions.",
      "### Manual actions\n- Power Apps Studio, solution import, publication, sharing, and production deployment remain manual unless a later approved task explicitly authorizes automation.",
      "### Validation checks\n- Verify applicable gates.\n- Verify generated content against approved documents.\n- Record manual checks that were not run as not run.",
      `### Acceptance criteria\n${listOrMissing(project.intake.successCriteria, "success criteria")}`,
      "### Completion criteria\n- Phase work matches approved scope.\n- Gate blockers are resolved or reported.\n- Implementation log is updated with actual work only.",
      "### Testing instructions\n- Add or update tests for changed behavior.\n- Run required automated checks for the repository.\n- Run applicable manual Power Platform checks only when the environment is available.",
      "### Reporting instructions\n- Summary\n- Phase\n- Status\n- Files created\n- Files updated\n- Files removed\n- Implementation assets produced\n- Power Fx produced\n- YAML produced\n- Model-driven specifications produced\n- Code extensions produced\n- Configuration steps\n- Manual actions\n- Connectors\n- Licensing\n- Environment requirements\n- Security concerns\n- Delegation warnings\n- Tests\n- Manual checks run\n- Missing decisions\n- Issues\n- Gate statuses\n- Readiness gate status\n- Completion criteria\n- Recommended next phase",
      "### Blocked assumptions\n- Do not assume unapproved connectors, licensing, schema identifiers, solution source, publication, import, deployment, or client approval.",
      `### Missing decisions\n${readinessBlockers(project)}`,
      `### Applicability\n${phaseApplicability(phase)}`,
      `### Recommended next phase\n${index + 1 < phases.length ? `Phase ${index + 2}: ${phases[index + 1].name}` : "Architect final review and approval."}`
    ))
  );
};

const changeLog = (project: ProjectRecord) => join(
  "# Change Log",
  header(project),
  `## ${formatDate()}`,
  "### Initial package generation entry",
  `- Generated date: ${formatDate()}`,
  `- Project status: ${project.status}`,
  `- Generated files: ${generatedFileCount(project)}`,
  `- Missing information count: ${project.outstandingQuestions.length}`,
  `- Known gaps: ${missingSummary(project)}`,
  "- Next review action: Architect resolves missing decisions and confirms phased implementation order."
);

const nextSteps = (project: ProjectRecord) => join(
  "# Next Steps",
  header(project),
  `## Package readiness\n\n${packageReadiness(project)}`,
  "## Use This Project Package",
  PACKAGE_USAGE_STEPS.map((step, index) => `${index + 1}. ${step}`).join("\n"),
  "## Immediate next action\n\nReview PROJECT_SCOPE.md and resolve every required missing marker before marking the project Ready for Codex.",
  "## Architect review tasks\n\n- Validate scope and boundaries\n- Resolve contradictions\n- Approve phased prompts",
  `## Client questions to resolve\n\n${outstandingReviewQuestions(project)}`,
  `## Not applicable decisions\n\n${reviewItemsByStatus(project, "Not applicable")}`,
  `## Deferred decisions\n\n${reviewItemsByStatus(project, "Deferred")}`,
  `## Codex readiness checklist\n\n${readinessChecklist(project)}`,
  "## Recommended first Codex phase\n\nPhase 1: Project setup",
  `## Blockers\n\n${readinessBlockers(project)}`,
  "## Non-blocking improvements\n\n- Improve optional reporting and branding detail coverage after core scope approval."
);

const brandGuide = (project: ProjectRecord) => join(
  "# Brand Guide",
  header(project),
  `## Brand requirement\n\n${getProjectTypePreset(project.intake.appType)?.brandingRequirementLevel ?? missingMarker("branding requirement level")}`,
  sectionOrMissing("Brand status", project.intake.brandStatus, "brand status"),
  sectionOrMissing("Logo status", project.intake.logoStatus, "logo status"),
  `## Logo files\n\n${listOrMissing(project.intake.logoFiles, "logo files")}`,
  `## Primary colours\n\n${listOrMissing(project.intake.primaryColors, "primary colours")}`,
  `## Secondary colours\n\n${listOrMissing(project.intake.secondaryColors, "secondary colours")}`,
  sectionOrMissing("Font preferences", project.intake.fontPreferences, "font preferences"),
  sectionOrMissing("Brand tone", project.intake.brandTone, "brand tone"),
  sectionOrMissing("Image style", project.intake.imageStyle, "image style"),
  sectionOrMissing("Icon style", project.intake.iconStyle, "icon style"),
  `## Reference sites\n\n${listOrMissing(project.intake.referenceSites, "reference sites")}`,
  `## Brand restrictions\n\n${listOrMissing(project.intake.brandRestrictions, "brand restrictions")}`,
  `## Required supporting assets\n\n${markdownList([
    safeText(project.intake.faviconNeeded, "favicon decision"),
    safeText(project.intake.openGraphImageNeeded, "Open Graph image decision"),
    safeText(project.intake.socialAssetsNeeded, "social asset decision")
  ])}`,
  sectionOrMissing("Content source", project.intake.contentSource, "content source"),
  `## Approved assets\n\n${listOrMissing(project.intake.approvedAssets, "approved assets")}`,
  `## Accessibility and contrast\n\n${listOrMissing(
    project.intake.accessibilityContrastNotes || project.intake.accessibilityNotes,
    "accessibility contrast notes"
  )}`,
  `## Additional notes\n\n${listOrMissing(project.intake.brandingNotes, "additional branding notes")}`
);

const clientQuestions = (project: ProjectRecord) => {
  return join(
    "# Client Questions",
    header(project),
    `## Package readiness\n\n${packageReadiness(project)}`,
    `## Questions grouped for client review\n\n${outstandingReviewQuestions(project)}`,
    `## Not applicable decisions\n\n${reviewItemsByStatus(project, "Not applicable")}`,
    `## Deferred decisions\n\n${reviewItemsByStatus(project, "Deferred")}`,
    `## Readiness blockers\n\n${readinessBlockers(project)}`,
    "## Review instruction\n\nRecord approved answers in the guided intake. Mark an item not applicable only with a reason. Deferred blocking items keep the package in Draft. Regenerate the package after review."
  );
};

const handoffChecklist = (project: ProjectRecord) => join(
  "# Handoff Checklist",
  header(project),
  `## Package readiness\n\n${packageReadiness(project)}`,
  `## Required handoff checks\n\n${readinessChecklist(project)}`,
  `## Outstanding client questions\n\n${outstandingReviewQuestions(project)}`,
  `## Not applicable decisions\n\n${reviewItemsByStatus(project, "Not applicable")}`,
  `## Deferred decisions\n\n${reviewItemsByStatus(project, "Deferred")}`,
  `## Current blockers\n\n${readinessBlockers(project)}`,
  "## Operating loop",
  PACKAGE_USAGE_STEPS.map((step, index) => `${index + 1}. ${step}`).join("\n"),
  "## Approval rule\n\nA Draft package may be reviewed and exported. Ready for Codex requires all blocking client review items and readiness checks to pass."
);

function powerPlatformValue(value: string | undefined, label: string): string {
  return safeText(value ?? "", label);
}

function connectorRows(connectors: PowerPlatformConnector[]): string[][] {
  if (connectors.length === 0) {
    return [[
      missingMarker("connector name"),
      missingMarker("purpose"),
      missingMarker("data source name"),
      missingMarker("data-source type"),
      "unknown",
      missingMarker("classification confirmation"),
      missingMarker("licence requirement"),
      missingMarker("licensing confirmation"),
      missingMarker("authentication method"),
      missingMarker("gateway requirement"),
      missingMarker("environment requirement"),
      missingMarker("DLP impact"),
      missingMarker("connection owner"),
      missingMarker("connection owner role"),
      missingMarker("connection ownership status"),
      missingMarker("connection ownership notes"),
      missingMarker("approval notes"),
      missingMarker("approval confirmation status")
    ]];
  }
  return connectors.map((connector) => [
    safeText(connector.displayName, "connector name"),
    safeText(connector.purpose, "connector purpose"),
    safeText(connector.dataSourceName, "data source name"),
    safeText(connector.dataSourceType, "data-source type"),
    connector.connectorClassification,
    decisionText(connector.classificationConfirmationStatus),
    safeText(connector.licenceRequirement, "licence requirement"),
    decisionText(connector.licensingConfirmationStatus),
    safeText(connector.authenticationMethod, "authentication method"),
    safeText(connector.gatewayRequirement, "gateway requirement"),
    safeText(connector.environmentRequirement, "environment requirement"),
    safeText(connector.dlpImpact, "DLP impact"),
    safeText(connector.connectionOwner, "connection owner"),
    safeText(connector.connectionOwnerRole, "connection owner role"),
    decisionText(connector.connectionOwnershipStatus),
    safeText(connector.connectionOwnershipNotes, "connection ownership notes"),
    safeText(connector.approvalStatus, "approval notes"),
    decisionText(connector.approvalConfirmationStatus)
  ]);
}

function applicabilityRows(entries: Array<[string, PowerPlatformApplicabilityDecision | undefined]>): string[][] {
  return entries.map(([label, decision]) => [
    label,
    decision?.status ?? missingMarker(`${label} applicability`),
    decision?.status === "notApplicable"
      ? safeText(decision.notApplicableReason, `${label} not-applicable reason`)
      : safeText(decision?.details ?? "", `${label} details`),
    decision?.status === "required"
      ? "Not applicable."
      : safeText(decision?.notApplicableReason ?? "", `${label} not-applicable reason`),
    decisionText(decision?.confirmationStatus)
  ]);
}

function applicableRequirementOrMissing(value: string | undefined, label: string, decision: PowerPlatformApplicabilityDecision | undefined): string {
  if (decision?.status === "notApplicable" && decision.confirmationStatus === "confirmed") {
    return `- ${safeText(decision.notApplicableReason || decision.details, `${label} not-applicable reason`)}`;
  }
  return listOrMissing(value ?? "", label);
}

function screenEmptyStates(project: ProjectRecord): string {
  if (isCanvasProject(project)) return listOrMissing(project.powerPlatform?.canvas?.emptyStates, "empty-state behavior per screen");
  if (isModelDrivenProject(project)) return "- Not applicable for model-driven apps; Dataverse views use platform empty-state behavior unless custom pages are approved.";
  return listOrMissing("", "empty-state behavior per screen");
}

function powerPlatformGateSummary(project: ProjectRecord): string {
  const summary = calculatePowerPlatformReadiness(project);
  if (summary.projectType === "none") return "- Not a Power Platform project.";
  return summary.gates
    .map((gate) => `- **${gate.label}:** ${formatPowerPlatformGateStatus(gate.status)} — ${gate.description}`)
    .join("\n");
}

function decisionText(value: string | undefined): string {
  return value ? formatPowerPlatformGateStatus(value as never) : missingMarker("confirmation status");
}

function tableOrMissing(headers: string[], rows: string[][], missing: string): string {
  return rows.length > 0 ? markdownTable(headers, rows) : `- ${missingMarker(missing)}`;
}

function noExternalConnectors(project: ProjectRecord): boolean {
  return isModelDrivenProject(project)
    && (project.powerPlatform?.common.connectors ?? []).length === 0;
}

function connectorTable(project: ProjectRecord): string {
  const connectors = project.powerPlatform?.common.connectors ?? [];
  if (connectors.length === 0 && noExternalConnectors(project)) return "- No external connectors approved or required.";
  const rows = connectorRows(connectors);
  return tableOrMissing([
    "Connector",
    "Purpose",
    "Data source",
    "Data-source type",
    "Classification",
    "Classification confirmation",
    "Licence requirement",
    "Licensing confirmation",
    "Authentication",
    "Gateway",
    "Environment",
    "DLP impact",
    "Connection owner",
    "Owner role",
    "Ownership status",
    "Ownership notes",
    "Approval notes",
    "Approval confirmation status"
  ], rows, "connector selection or explicit no-connector decision");
}

const connectorRegister = (project: ProjectRecord) => {
  const connectors = project.powerPlatform?.common.connectors ?? [];
  return join(
    "# Connector Register",
    header(project),
    "## Readiness gates",
    powerPlatformGateSummary(project),
    `## Connector selection gate\n\n${calculateConnectorSelectionGate(project)}`,
    `## Connector classification gate\n\n${calculateConnectorClassificationGate(project)}`,
    `## Connectors\n\n${connectorTable(project)}`,
    "## Connector assumptions\n\n- Standard, premium, custom, and external connector choices must be confirmed by the client or tenant admin.\n- Premium or Dataverse licensing must not be assumed.\n- Do not create final Power Fx, YAML, or connector implementation code from this register alone.",
    `## Missing connector decisions\n\n${connectors.length === 0 ? noExternalConnectors(project) ? "- No external connectors approved or required." : `- ${missingMarker("connector selection or explicit no-connector decision")}` : "- None beyond rows marked missing."}`
  );
};

const licensingAssessment = (project: ProjectRecord) => {
  const common = project.powerPlatform?.common;
  const modelDriven = project.powerPlatform?.modelDriven;
  const connectors = project.powerPlatform?.common.connectors ?? [];
  return join(
    "# Licensing Assessment",
    header(project),
    `## Licensing readiness gate\n\n${calculateLicensingGate(project)}`,
    `## Environment readiness gate\n\n${calculateEnvironmentGate(project)}`,
    `## Current licence information\n\n${markdownTable([
      "Item",
      "Decision"
    ], [
      ["Current Power Apps licences", powerPlatformValue(common?.currentPowerAppsLicences || common?.existingLicences, "current Power Apps licences")],
      ["Current Power Automate licences", powerPlatformValue(common?.currentPowerAutomateLicences, "current Power Automate licences")],
      ["Dataverse availability", powerPlatformValue(common?.dataverseAvailability, "Dataverse availability")],
      ["Model-driven licensing status", modelDriven ? powerPlatformValue(modelDriven.modelDrivenLicensingStatus, "model-driven licensing status") : "Not applicable."],
      ["Premium connector availability", powerPlatformValue(common?.premiumConnectorAvailability, "premium connector availability")],
      ["Custom connector availability", powerPlatformValue(common?.customConnectorAvailability, "custom connector availability")],
      ["Licensing confirmation status", powerPlatformValue(common?.licensingConfirmationStatus || common?.licensingStatus, "licensing confirmation status")],
      ["Budget constraints", powerPlatformValue(common?.licensingBudgetConstraints, "licensing budget constraints")]
    ])}`,
    `## External connector licensing\n\n${noExternalConnectors(project) ? "- No external connector licensing required." : markdownTable([
      "Connector",
      "Classification",
      "Licence requirement",
      "Licensing confirmation",
      "Approval notes",
      "Approval confirmation status"
    ], connectors.length ? connectors.map((connector) => [
      safeText(connector.displayName, "connector name"),
      connector.connectorClassification,
      safeText(connector.licenceRequirement, "licence requirement"),
      decisionText(connector.licensingConfirmationStatus),
      safeText(connector.approvalStatus, "approval notes"),
      decisionText(connector.approvalConfirmationStatus)
    ]) : [[missingMarker("external connector"), "unknown", missingMarker("licence requirement"), missingMarker("licensing confirmation"), missingMarker("approval notes"), missingMarker("approval confirmation status")]])}`,
    "## Release rule\n\nThis assessment is not a licence purchase recommendation. It records what must be confirmed before Codex-ready prompts can assume a platform capability.",
    `## Outstanding licensing decisions\n\n${listOrMissing(common?.outstandingLicensingDecisions ?? "", "outstanding licensing decisions")}`
  );
};

const dataSourceSchema = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  const modelDriven = project.powerPlatform?.modelDriven;
  const selectedSources = getSelectedCanvasDataSourceTypes(project);
  const recordCounts = effectiveCanvasExpectedRecordCounts(project);
  return join(
    "# Data Source Schema",
    header(project),
    "## Gate summary",
    powerPlatformGateSummary(project),
    `## Primary source\n\n${markdownTable(["Field", "Value"], [
      ["Primary Canvas data source", canvas?.primaryDataSourceType ?? (modelDriven ? "Dataverse" : missingMarker("data source type"))],
      ["Selected Canvas backends", selectedSources.length ? selectedSources.map(formatCanvasDataSourceType).join(", ") : missingMarker("selected Canvas backends")],
      ["Source purpose", powerPlatformValue(canvas?.sourcePurpose, "source purpose")],
      ["Source ownership", powerPlatformValue(canvas?.sourceOwnership, "source ownership")],
      ["Source of truth", powerPlatformValue(canvas?.sourceOfTruthDecision, "source-of-truth decision")],
      ["Expected record counts", powerPlatformValue(recordCounts.value, "expected record counts")]
    ])}`,
    recordCounts.contradictions.length > 0 ? `## Record-count review notes\n\n${markdownList(recordCounts.contradictions)}` : "",
    "## Backend-specific schema files",
    markdownList([
      usesSharePoint(project) ? "SHAREPOINT_SCHEMA.md and INTERNAL_COLUMN_NAMES.md are required." : "SharePoint schema not selected.",
      usesDataverse(project) ? "DATAVERSE_SCHEMA.md and LOGICAL_NAMES.md are required." : "Dataverse schema not selected.",
      usesOtherConnector(project) ? "CONNECTOR_SCHEMA.md is required." : "Other connector schema not selected."
    ]),
    modelDriven ? `## Model-driven planning statuses\n\n${markdownTable(["Area", "Status"], [
      ["Forms and views", decisionText(modelDriven.formsAndViewsStatus)],
      ["Navigation", decisionText(modelDriven.navigationStatus)],
      ["Security architecture", decisionText(modelDriven.securityArchitectureStatus)],
      ["Business logic", decisionText(modelDriven.businessLogicStatus)],
      ["Extensions", decisionText(modelDriven.extensionsStatus)],
      ["ALM", decisionText(modelDriven.almReadinessStatus)]
    ])}` : "",
    modelDriven ? `## Model-driven applicability decisions\n\n${markdownTable(["Component", "Applicability", "Details", "Not-applicable reason", "Confirmation"], applicabilityRows([
      ["Business rules", modelDriven.businessRulesDecision],
      ["Business process flows", modelDriven.businessProcessFlowsDecision],
      ["Automations", modelDriven.automationsDecision],
      ["Validation rules", modelDriven.validationRulesDecision],
      ["Duplicate prevention", modelDriven.duplicatePreventionDecision],
      ["Command bar", modelDriven.commandBarRulesDecision],
      ["Client-side JavaScript", modelDriven.clientSideJavaScriptDecision],
      ["Web resources", modelDriven.webResourcesDecision],
      ["HTML web resources", modelDriven.htmlWebResourcesDecision],
      ["Image web resources", modelDriven.imageWebResourcesDecision],
      ["PCF controls", modelDriven.pcfControlsDecision],
      ["Plug-ins", modelDriven.pluginsDecision],
      ["Custom workflow activities", modelDriven.customWorkflowActivitiesDecision],
      ["Custom APIs", modelDriven.customApisDecision],
      ["Azure integrations", modelDriven.azureIntegrationsDecision],
      ["External services", modelDriven.externalServicesDecision]
    ]))}` : "",
    "## Implementation boundary\n\nThis document captures schema requirements only. It does not contain final formulas, YAML, app source, or executable implementation code."
  );
};

const businessRulesDocument = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Business Rules",
    header(project),
    `## Business rules\n\n${listOrMissing(modelDriven?.businessRules ?? "", "business rules")}`,
    modelDriven ? `## Business logic applicability\n\n${markdownTable(["Component", "Applicability", "Details", "Not-applicable reason", "Confirmation"], applicabilityRows([
      ["Business rules", modelDriven.businessRulesDecision],
      ["Business process flows", modelDriven.businessProcessFlowsDecision],
      ["Automations", modelDriven.automationsDecision],
      ["Validation rules", modelDriven.validationRulesDecision],
      ["Duplicate prevention", modelDriven.duplicatePreventionDecision]
    ]))}` : "",
    "## Implementation boundary\n\nThis document records requirements and readiness only. It does not generate model-driven source, plug-ins, JavaScript, Power Fx, YAML, or deployment automation."
  );
};

const sharePointSchema = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  const listNames = new Map((canvas?.sharePointListSchemas ?? []).map((list) => [list.id, list.displayName || list.id]));
  const libraryNames = new Map((canvas?.sharePointLibrarySchemas ?? []).map((library) => [library.id, library.displayName || library.id]));
  const listRows = canvas?.sharePointListSchemas.map((list) => [
    list.id,
    safeText(list.displayName, "list display name"),
    safeText(list.purpose, "list purpose"),
    safeText(list.expectedRecordCount, "expected record count"),
    safeText(list.attachmentsEnabled, "attachments enabled"),
    safeText(list.versioningExpectation, "versioning expectation"),
    safeText(list.permissionExpectation, "permission expectation"),
    decisionText(list.confirmationStatus),
    safeText(list.confirmationSource, "confirmation source")
  ]) ?? [];
  const libraryRows = canvas?.sharePointLibrarySchemas.map((library) => [
    library.id,
    safeText(library.displayName, "library display name"),
    safeText(library.purpose, "library purpose"),
    safeText(library.folderStructure, "folder structure"),
    safeText(library.contentTypes, "content types"),
    safeText(library.fileTypes, "file types"),
    safeText(library.fileSizeExpectations, "file-size expectations"),
    safeText(library.uploadBehavior, "upload behavior"),
    safeText(library.downloadBehavior, "download behavior"),
    safeText(library.versioning, "versioning"),
    safeText(library.permissions, "permissions"),
    safeText(library.retention, "retention"),
    decisionText(library.confirmationStatus),
    safeText(library.confirmationSource, "confirmation source")
  ]) ?? [];
  const librarySection = isCanvasFileNotApplicable(project)
    ? `Not applicable: ${canvas?.fileApplicabilityDecision.notApplicableReason}`
    : tableOrMissing(["ID", "Display name", "Purpose", "Folders", "Content types", "File types", "File size", "Upload", "Download", "Versioning", "Permissions", "Retention", "Status", "Source"], libraryRows, "SharePoint library records");
  const legacyNotes = canvas?.sharePointListDefinitions || canvas?.sharePointLists || canvas?.sharePointLibraryDefinitions || canvas?.sharePointLibraries || "";
  const columnRows = canvas?.sharePointColumnSchemas.map((column) => [
    column.parentType || missingMarker("parent type"),
    column.parentType === "library"
      ? libraryNames.get(column.parentId) ?? missingMarker("parent library")
      : listNames.get(column.parentId) ?? missingMarker("parent list"),
    column.parentId || missingMarker("parent stable ID"),
    safeText(column.displayName, "column display name"),
    safeText(column.internalName, "internal name"),
    safeText(column.columnType, "column type"),
    safeText(column.requiredStatus, "required status"),
    safeText(column.choiceValues, "choice values"),
    [column.lookupList, column.lookupColumn].filter(Boolean).join(" / ") || missingMarker("lookup target or not applicable"),
    safeText(column.personFieldBehavior, "person behavior"),
    safeText(column.dateTimeBehavior, "date behavior"),
    safeText(column.indexedStatus, "indexed status"),
    safeText(column.uniqueValueStatus, "unique-value status"),
    safeText(column.sensitiveDataStatus, "sensitive-data status"),
    decisionText(column.confirmationStatus),
    safeText(column.confirmationSource, "confirmation source")
  ]) ?? [];
  return join(
    "# SharePoint Schema",
    header(project),
    `## SharePoint schema gate\n\n${calculateSharePointSchemaGate(project)}`,
    `## Site and ownership\n\n${markdownTable(["Item", "Value"], [
      ["Site URL", powerPlatformValue(canvas?.sharePointSiteUrl || canvas?.sharePointSites, "SharePoint site URL")],
      ["Site title", powerPlatformValue(canvas?.sharePointSiteTitle, "SharePoint site title")],
      ["Site owner", powerPlatformValue(canvas?.sharePointSiteOwner, "SharePoint site owner")],
      ["Access status", powerPlatformValue(canvas?.sharePointAccessStatus, "SharePoint access status")]
    ])}`,
    `## Lists\n\n${tableOrMissing(["ID", "Display name", "Purpose", "Expected records", "Attachments", "Versioning", "Permissions", "Status", "Source"], listRows, "SharePoint list records")}`,
    `## Libraries\n\n${librarySection}`,
    `## Columns grouped by parent\n\n${tableOrMissing(["Parent type", "Parent", "Parent ID", "Display name", "Internal name", "Type", "Required", "Choices", "Lookup target", "Person", "Date", "Indexed", "Unique", "Sensitive", "Status", "Source"], columnRows, "SharePoint column records")}`,
    `## Legacy notes\n\n${legacyNotes.trim() ? listOrMissing(legacyNotes, "legacy SharePoint notes") : "No legacy notes recorded; structured schema is authoritative."}`,
    "## Guardrail\n\nDisplay names are not enough for implementation. Confirmed internal column names are required before Codex-ready prompts can rely on this schema."
  );
};

const dataverseSchema = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  const modelDriven = project.powerPlatform?.modelDriven;
  const common = project.powerPlatform?.common;
  const gate = project.intake.appType === "powerAppsModelDriven"
    ? calculateModelDrivenDataverseSchemaGate(project)
    : calculateCanvasDataverseSchemaGate(project);
  const tables = canvas?.dataverseTableSchemas ?? modelDriven?.dataverseTableSchemas ?? [];
  const tableNames = new Map(tables.map((table) => [table.id, table.displayName || table.logicalName || table.id]));
  const tableRows = tables.map((table) => [
    table.id,
    safeText(table.displayName, "table display name"),
    safeText(table.pluralDisplayName, "plural display name"),
    safeText(table.logicalName, "table logical name"),
    safeText(table.schemaName, "table schema name"),
    safeText(table.ownershipType, "ownership type"),
    safeText(table.primaryNameColumn, "primary name column"),
    safeText(table.purpose, "table purpose"),
    safeText(table.expectedRecordCount, "expected record count"),
    safeText(table.auditStatus, "audit status"),
    safeText(table.searchRequirement, "search requirement"),
    decisionText(table.confirmationStatus)
  ]);
  const columnRows = (canvas?.dataverseColumnSchemas ?? modelDriven?.dataverseColumnSchemas ?? []).map((column) => [
    tableNames.get(column.tableId) ?? missingMarker("owning table"),
    column.tableId || missingMarker("table stable ID"),
    safeText(column.displayName, "column display name"),
    safeText(column.logicalName, "column logical name"),
    safeText(column.schemaName, "column schema name"),
    safeText(column.dataType, "data type"),
    safeText(column.requiredLevel, "required level"),
    safeText(column.choiceDefinition, "choice definition"),
    safeText(column.lookupTarget, "lookup target"),
    decisionText(column.confirmationStatus)
  ]);
  const relationshipRows = (canvas?.dataverseRelationshipSchemas ?? modelDriven?.dataverseRelationshipSchemas ?? []).map((relationship) => [
    safeText(relationship.relationshipType, "relationship type"),
    safeText(relationship.relationshipSchemaName, "relationship schema name"),
    tableNames.get(relationship.parentTableId) ?? safeText(relationship.parentTable, "parent table"),
    relationship.parentTableId || missingMarker("parent table ID"),
    tableNames.get(relationship.childTableId) ?? safeText(relationship.childTable, "child table"),
    relationship.childTableId || missingMarker("child table ID"),
    safeText(relationship.referentialBehavior, "referential behavior"),
    safeText(relationship.cascadeBehavior, "cascade behavior"),
    decisionText(relationship.confirmationStatus)
  ]);
  return join(
    "# Dataverse Schema",
    header(project),
    `## Dataverse schema gate\n\n${gate}`,
    `## Environment and solution\n\n${markdownTable(["Item", "Value"], [
      ["Dataverse availability", powerPlatformValue(common?.dataverseAvailability || modelDriven?.dataverseAvailability, "Dataverse availability")],
      ["Environment", powerPlatformValue(canvas?.dataverseEnvironment || common?.environment, "Dataverse environment")],
      ["Solution", powerPlatformValue(canvas?.dataverseSolution || common?.solutionName || modelDriven?.existingSolution, "Dataverse solution")],
      ["Solution unique name", powerPlatformValue(canvas?.dataverseSolutionUniqueName || common?.solutionUniqueName, "solution unique name")],
      ["Publisher", powerPlatformValue(canvas?.dataversePublisher || common?.publisherName, "publisher")],
      ["Publisher prefix", powerPlatformValue(canvas?.dataversePublisherPrefix || common?.publisherPrefix, "publisher prefix")]
    ])}`,
    `## Tables\n\n${tableOrMissing(["ID", "Display name", "Plural", "Logical name", "Schema name", "Ownership", "Primary name", "Purpose", "Expected records", "Audit", "Search", "Status"], tableRows, "Dataverse table records")}`,
    `## Columns grouped by table\n\n${tableOrMissing(["Owning table", "Table ID", "Display name", "Logical name", "Schema name", "Type", "Required", "Choices", "Lookup target", "Status"], columnRows, "Dataverse column records")}`,
    `## Relationships\n\n${tableOrMissing(["Type", "Schema name", "Parent", "Parent ID", "Child", "Child ID", "Referential", "Cascade", "Status"], relationshipRows, "Dataverse relationship records")}`,
    `## Legacy notes\n\n${listOrMissing(canvas?.dataverseTableDefinitions || modelDriven?.tableDefinitions || modelDriven?.tables || "", "legacy Dataverse schema notes")}`,
    "## Guardrail\n\nThis is a schema handoff. Do not infer Dataverse availability, licences, publisher prefix, or logical names."
  );
};

const connectorSchema = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  const connectorNames = new Map((project.powerPlatform?.common.connectors ?? []).map((connector) => [connector.id, connector.displayName || connector.dataSourceName || connector.id]));
  const resourceNames = new Map((canvas?.connectorResourceSchemas ?? []).map((resource) => [resource.id, resource.resourceName || resource.id]));
  const resources = canvas?.connectorResourceSchemas.map((resource) => [
    connectorNames.get(resource.connectorId) ?? missingMarker("connector assessment"),
    resource.connectorId || missingMarker("connector ID"),
    safeText(resource.resourceName, "resource name"),
    safeText(resource.resourceType, "resource type"),
    safeText(resource.purpose, "resource purpose"),
    safeText(resource.keyOrIdentifier, "key or identifier"),
    safeText(resource.authenticationRequirement, "authentication requirement"),
    safeText(resource.queryLimitations, "query limitations"),
    safeText(resource.pagination, "pagination"),
    safeText(resource.throttling, "throttling"),
    safeText(resource.gatewayRequirement, "gateway requirement"),
    decisionText(resource.confirmationStatus)
  ]) ?? [];
  const fields = canvas?.connectorFieldSchemas.map((field) => [
    connectorNames.get(field.connectorId) ?? missingMarker("connector assessment"),
    resourceNames.get(field.resourceId) ?? missingMarker("resource"),
    safeText(field.displayName, "field display name"),
    safeText(field.fieldIdentifier, "field identifier"),
    safeText(field.fieldType, "field type"),
    safeText(field.requiredStatus, "required status"),
    safeText(field.keyStatus, "key status"),
    safeText(field.relationship, "relationship"),
    safeText(field.readBehavior, "read behavior"),
    safeText(field.createBehavior, "create behavior"),
    safeText(field.updateBehavior, "update behavior"),
    safeText(field.deleteBehavior, "delete behavior"),
    decisionText(field.confirmationStatus)
  ]) ?? [];
  return join(
    "# Connector Schema",
    header(project),
    `## Connector schema gate\n\n${calculateOtherConnectorSchemaGate(project)}`,
    `## Resources by connector\n\n${tableOrMissing(["Connector", "Connector ID", "Resource", "Type", "Purpose", "Identifier", "Authentication", "Query limits", "Pagination", "Throttling", "Gateway", "Status"], resources, "connector resource records")}`,
    `## Fields by resource\n\n${tableOrMissing(["Connector", "Resource", "Display name", "Identifier", "Type", "Required", "Key", "Relationship", "Read", "Create", "Update", "Delete", "Status"], fields, "connector field records")}`,
    `## Legacy notes\n\n${listOrMissing(canvas?.otherDataSources || canvas?.otherConnectorSchemaDefinitions || canvas?.otherConnectorFieldDefinitions || "", "legacy connector schema notes")}`,
    sectionOrMissing("Confirmation source", canvas?.otherConnectorConfirmationSource ?? "", "connector schema confirmation source"),
    "## Guardrail\n\nDo not generate connector code from this document. Confirm endpoint, authentication, DLP, field names, throttling, and licensing first."
  );
};

const internalColumnNames = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  const listNames = new Map((canvas?.sharePointListSchemas ?? []).map((list) => [list.id, list.displayName || list.id]));
  const libraryNames = new Map((canvas?.sharePointLibrarySchemas ?? []).map((library) => [library.id, library.displayName || library.id]));
  const columnSchemas = canvas?.sharePointColumnSchemas ?? [];
  const rows = columnSchemas.map((column) => [
    column.parentType || missingMarker("parent type"),
    column.parentType === "library"
      ? libraryNames.get(column.parentId) ?? missingMarker("parent library")
      : listNames.get(column.parentId) ?? missingMarker("parent list"),
    column.parentId || missingMarker("parent stable ID"),
    safeText(column.displayName, "display name"),
    safeText(column.internalName, `SharePoint internal column name for ${column.displayName || "column"}`),
    safeText(column.columnType, "column type"),
    decisionText(column.confirmationStatus),
    safeText(column.confirmationSource, "confirmation source")
  ]) ?? [];
  const legacyNotes = columnSchemas.length > 0
    ? "No legacy notes recorded; structured internal-name records are authoritative."
    : listOrMissing(canvas?.sharePointColumnDefinitions ?? "", "legacy SharePoint internal-name notes");
  return join(
    "# Internal Column Names",
    header(project),
    `## Internal name gate\n\n${calculateInternalNameGate(project)}`,
    `## Confirmed internal names\n\n${tableOrMissing(["Parent type", "Parent", "Parent ID", "Display name", "Internal name", "Type", "Status", "Source"], rows, "SharePoint internal column name records")}`,
    `## Legacy notes\n\n${legacyNotes}`,
    sectionOrMissing("Confirmation status", canvas?.internalNameStatus ?? "", "internal column name confirmation status"),
    "## Required format\n\nEach SharePoint field should include display name, internal name, type, required state, choices or lookup target, default value, and usage notes.",
    "## Guardrail\n\nIf a column was renamed in SharePoint, use the original internal name. Do not guess internal names from display labels."
  );
};

const logicalNames = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  const modelDriven = project.powerPlatform?.modelDriven;
  const tables = canvas?.dataverseTableSchemas ?? modelDriven?.dataverseTableSchemas ?? [];
  const tableNames = new Map(tables.map((table) => [table.id, table.displayName || table.logicalName || table.id]));
  const tableRows = tables.map((table) => [
    table.id,
    safeText(table.displayName, "table display name"),
    safeText(table.logicalName, "table logical name"),
    safeText(table.schemaName, "table schema name"),
    decisionText(table.confirmationStatus)
  ]);
  const columnRows = (canvas?.dataverseColumnSchemas ?? modelDriven?.dataverseColumnSchemas ?? []).map((column) => [
    tableNames.get(column.tableId) ?? missingMarker("owning table"),
    column.tableId || missingMarker("table stable ID"),
    safeText(column.displayName, "column display name"),
    safeText(column.logicalName, "column logical name"),
    safeText(column.schemaName, "column schema name"),
    decisionText(column.confirmationStatus)
  ]);
  return join(
    "# Logical Names",
    header(project),
    `## Logical name gate\n\n${calculateLogicalNameGate(project)}`,
    `## Table logical names\n\n${tableOrMissing(["Table ID", "Display name", "Logical name", "Schema name", "Status"], tableRows, "Dataverse table logical-name records")}`,
    `## Column logical names\n\n${tableOrMissing(["Owning table", "Table ID", "Display name", "Logical name", "Schema name", "Status"], columnRows, "Dataverse column logical-name records")}`,
    `## Legacy notes\n\n${listOrMissing(canvas?.dataverseTableDefinitions || modelDriven?.tableDefinitions || modelDriven?.tables || "", "legacy logical-name notes")}`,
    sectionOrMissing("Confirmation status", canvas?.logicalNameStatus || modelDriven?.logicalNameStatus || "", "logical name confirmation status"),
    "## Required format\n\nInclude display name, logical name, schema name when known, type, required state, choices or lookup target, and usage notes.",
    "## Guardrail\n\nDo not infer logical names from display names. Confirm names from Dataverse table designer, solution export, or approved schema source."
  );
};

const powerFxStandards = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  return join(
    "# Power Fx Standards",
    header(project),
    `## Power Fx planning gate\n\n${calculateCanvasPowerFxPlanningGate(project)}`,
    `## Formula requirement areas\n\n${markdownTable(["Area", "Requirement"], [
      ["App formulas", powerPlatformValue(canvas?.appFormulasRequirements, "app formula requirements")],
      ["StartScreen", powerPlatformValue(canvas?.startScreenRequirements, "StartScreen requirements")],
      ["OnStart", powerPlatformValue(canvas?.onStartRequirements, "OnStart requirements")],
      ["Named formulas", powerPlatformValue(canvas?.namedFormulaRequirements, "named formula requirements")],
      ["Global variables", powerPlatformValue(canvas?.globalVariableRequirements, "global variable requirements")],
      ["Context variables", powerPlatformValue(canvas?.contextVariableRequirements, "context variable requirements")],
      ["Collections", powerPlatformValue(canvas?.collectionRequirements, "collection requirements")]
    ])}`,
    `## CRUD and validation behavior\n\n${markdownTable(["Behavior", "Requirement"], [
      ["Create", powerPlatformValue(canvas?.createBehavior, "create behavior")],
      ["Read", powerPlatformValue(canvas?.readBehavior, "read behavior")],
      ["Update", powerPlatformValue(canvas?.updateBehavior, "update behavior")],
      ["Archive", powerPlatformValue(canvas?.archiveBehavior, "archive behavior")],
      ["Restore", powerPlatformValue(canvas?.restoreBehavior, "restore behavior")],
      ["Delete restrictions", powerPlatformValue(canvas?.deleteRestrictions, "delete restrictions")],
      ["Validation", powerPlatformValue(canvas?.validationRequirements, "validation requirements")],
      ["Error handling", powerPlatformValue(canvas?.errorHandlingRequirements, "error handling requirements")],
      ["Notifications", powerPlatformValue(canvas?.notificationRequirements, "notification requirements")]
    ])}`,
    `## Search, filter, and sort planning\n\n${markdownTable(["Area", "Requirement"], [
      ["Search", powerPlatformValue(canvas?.searchRequirements, "search requirements")],
      ["Filtering", powerPlatformValue(canvas?.filteringRequirements, "filtering requirements")],
      ["Sorting", powerPlatformValue(canvas?.sortingRequirements, "sorting requirements")],
      ["Concurrent updates", powerPlatformValue(canvas?.concurrentUpdateHandling, "concurrent update handling")]
    ])}`,
    "## Implementation boundary\n\nThis document is a planning standard. It must not contain final Power Fx formulas. Codex may propose implementation steps only after schema, naming, connector, licensing, delegation, and security gates are complete."
  );
};

const delegationRegister = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  const connectors = project.powerPlatform?.common.connectors ?? [];
  const recordCounts = effectiveCanvasExpectedRecordCounts(project);
  return join(
    "# Delegation Register",
    header(project),
    `## Delegation planning gate\n\n${calculateCanvasDelegationPlanningGate(project)}`,
    `## Delegation-sensitive requirements\n\n${markdownTable(["Area", "Decision"], [
      ["Expected record counts", powerPlatformValue(recordCounts.value, "expected record counts")],
      ["Search", powerPlatformValue(canvas?.searchRequirements, "search requirements")],
      ["Filtering", powerPlatformValue(canvas?.filteringRequirements, "filtering requirements")],
      ["Sorting", powerPlatformValue(canvas?.sortingRequirements, "sorting requirements")],
      ["Delegation requirements", powerPlatformValue(canvas?.delegationRequirements, "delegation requirements")],
      ["Offline requirements", powerPlatformValue(canvas?.offlineRequirements, "offline requirements")],
      ["Synchronization", powerPlatformValue(canvas?.synchronizationRequirements, "synchronization requirements")]
    ])}`,
    recordCounts.contradictions.length > 0 ? `## Record-count review notes\n\n${markdownList(recordCounts.contradictions)}` : "",
    `## Connector delegation support\n\n${tableOrMissing(["Connector", "Data source", "Delegation support", "Expected volume", "Limitations"], connectors.map((connector) => [
      safeText(connector.displayName, "connector name"),
      safeText(connector.dataSourceType, "data-source type"),
      safeText(connector.delegationSupport, "delegation support"),
      safeText(connector.expectedRecordVolume, "expected record volume"),
      safeText(connector.limitations, "connector limitations")
    ]), "connector delegation assessment")}`,
    "## Guardrail\n\nIf delegation is uncertain, Codex must not implement search, filter, or sort behavior as production-ready. Record the missing connector or schema decision instead."
  );
};

const controlInventory = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  const controls = confirmedCanvasControls(project);
  const controlRows = controls.map((control) => [
    control.id,
    safeText(control.approvedControlName, "approved control name"),
    safeText(control.controlType, "control type"),
    safeText(control.screenId, "parent screen"),
    control.parentControlId || "None",
    safeText(control.purpose, "purpose"),
    safeText(control.operation, "operation"),
    statusLabel(control.formulaOutputDecision.status),
    control.dataSourceId || control.entityId || control.connectorId || "None",
    safeText(control.accessibleLabelRequirement, "accessibility requirement"),
    safeText(control.displayModeRequirement, "display-mode requirement"),
    decisionText(control.confirmationStatus),
    safeText(control.confirmationSource, "confirmation source")
  ]);
  return join(
    "# Control Inventory",
    header(project),
    `## Screens\n\n${listOrMissing(canvas?.screenNames || canvas?.screens || project.intake.screens, "Canvas screens")}`,
    `## Controls and layout\n\n${markdownTable(["Area", "Requirement"], [
      ["Containers", powerPlatformValue(canvas?.containers, "containers")],
      ["Components", powerPlatformValue(canvas?.components, "components")],
      ["Galleries", powerPlatformValue(canvas?.galleries, "galleries")],
      ["Forms", powerPlatformValue(canvas?.forms, "forms")],
      ["Tables", powerPlatformValue(canvas?.tables, "tables")],
      ["Dialogs", powerPlatformValue(canvas?.dialogs, "dialogs")],
      ["Controls", controls.length ? `${controls.length} structured control target(s) confirmed.` : powerPlatformValue(canvas?.controls, "controls")]
    ])}`,
    `## Structured controls\n\n${tableOrMissing(["Stable ID", "Approved name", "Type", "Parent screen", "Parent control", "Purpose", "Operation", "Formula applicability", "Data source relationship", "Accessibility", "Display mode", "Status", "Source"], controlRows, "controls")}`,
    controls.length === 0 && canvas?.controls.trim() ? `## Legacy control notes\n\n${listOrMissing(canvas.controls, "controls")}` : "",
    `## UI states and rules\n\n${markdownTable(["Area", "Requirement"], [
      ["Loading states", powerPlatformValue(canvas?.loadingStates, "loading states")],
      ["Empty states", powerPlatformValue(canvas?.emptyStates, "empty states")],
      ["Error states", powerPlatformValue(canvas?.errorStates, "error states")],
      ["Responsive rules", powerPlatformValue(canvas?.responsiveRules, "responsive rules")],
      ["Visibility rules", powerPlatformValue(canvas?.visibilityRules, "visibility rules")],
      ["Display-mode rules", powerPlatformValue(canvas?.displayModeRules, "display mode rules")]
    ])}`,
    "## Guardrail\n\nThis inventory is not paste-ready Canvas YAML. It identifies controls and behavior that must be manually implemented or separately generated only after the YAML planning gate is confirmed."
  );
};

const appConfiguration = (project: ProjectRecord) => {
  const common = project.powerPlatform?.common;
  const canvas = project.powerPlatform?.canvas;
  return join(
    "# App Configuration",
    header(project),
    `## Environment configuration\n\n${markdownTable(["Item", "Decision"], [
      ["Tenant", powerPlatformValue(common?.tenant, "tenant")],
      ["Environment", powerPlatformValue(common?.environment, "environment")],
      ["Environment type", powerPlatformValue(common?.environmentType, "environment type")],
      ["Development environment", powerPlatformValue(common?.developmentEnvironment, "development environment")],
      ["Test environment", powerPlatformValue(common?.testEnvironment, "test environment")],
      ["Production environment", powerPlatformValue(common?.productionEnvironment, "production environment")],
      ["Environment access status", decisionText(common?.environmentAccessStatus)]
    ])}`,
    `## Canvas app settings\n\n${markdownTable(["Item", "Decision"], [
      ["Subtype", powerPlatformValue(canvas?.subtype, "Canvas subtype")],
      ["Responsive mode", powerPlatformValue(canvas?.responsiveMode, "responsive mode")],
      ["Target devices", powerPlatformValue(canvas?.targetDevices, "target devices")],
      ["Target screen sizes", powerPlatformValue(canvas?.targetScreenSizes, "target screen sizes")],
      ["Orientation", powerPlatformValue(canvas?.orientation, "orientation")],
      ["Supported browsers", powerPlatformValue(canvas?.supportedBrowsers, "supported browsers")],
      ["Teams embedding", powerPlatformValue(canvas?.teamsEmbedding, "Teams embedding")],
      ["Component library", powerPlatformValue(canvas?.componentLibraryRequirement, "component library requirement")]
    ])}`,
    `## Ownership\n\n${markdownTable(["Role", "Owner"], [
      ["Business owner", powerPlatformValue(common?.businessOwner, "business owner")],
      ["App owner", powerPlatformValue(common?.appOwner, "app owner")],
      ["Technical owner", powerPlatformValue(common?.technicalOwner, "technical owner")],
      ["Support owner", powerPlatformValue(common?.supportOwner, "support owner")]
    ])}`,
    "## Guardrail\n\nConfiguration values must be environment-specific. Do not hardcode tenant, connection, or secret values in implementation prompts."
  );
};

const yamlManifest = (project: ProjectRecord) => {
  const canvas = project.powerPlatform?.canvas;
  return join(
    "# YAML Manifest",
    header(project),
    `## YAML planning gate\n\n${calculateCanvasYamlPlanningGate(project)}`,
    `## YAML and installation decisions\n\n${markdownTable(["Area", "Decision"], [
      ["Full-screen YAML required", powerPlatformValue(canvas?.fullScreenYamlRequired, "full-screen YAML decision")],
      ["Control-level YAML required", powerPlatformValue(canvas?.controlLevelYamlRequired, "control-level YAML decision")],
      ["Container YAML required", powerPlatformValue(canvas?.containerYamlRequired, "container YAML decision")],
      ["Component YAML required", powerPlatformValue(canvas?.componentYamlRequired, "component YAML decision")],
      [".pa.yaml source required", powerPlatformValue(canvas?.paYamlSourceRequired, ".pa.yaml source decision")],
      ["Expected installation method", powerPlatformValue(canvas?.expectedInstallationMethod, "expected installation method")],
      ["Code-view paste method", powerPlatformValue(canvas?.codeViewPasteMethod, "code-view paste method")],
      ["Existing source availability", powerPlatformValue(canvas?.existingSourceAvailability, "existing source availability")],
      ["Existing app dependencies", powerPlatformValue(canvas?.existingAppDependencies, "existing app dependencies")],
      ["Post-paste actions", powerPlatformValue(canvas?.postPasteActions, "post-paste actions")],
      ["Validation responsibility", powerPlatformValue(canvas?.validationResponsibility, "validation responsibility")]
    ])}`,
    "## Implementation boundary\n\nThis manifest intentionally avoids paste-ready YAML. It records whether YAML generation is allowed later, what source is available, and who must validate it in Power Apps Studio."
  );
};

const connectionRegister = (project: ProjectRecord) => {
  const common = project.powerPlatform?.common;
  const connectors = project.powerPlatform?.common.connectors ?? [];
  return join(
    "# Connection Register",
    header(project),
    `## Connection reference plan\n\n${listOrMissing(common?.connectionReferences ?? "", "connection references")}`,
    `## Connections by connector\n\n${connectors.length === 0 ? "- No external connection references required." : tableOrMissing(["Connector", "Data source", "Authentication", "Gateway", "Environment", "DLP", "Connection owner", "Owner role", "Ownership status", "Ownership notes", "Approval", "Confirmation"], connectors.map((connector) => [
      safeText(connector.displayName, "connector name"),
      safeText(connector.dataSourceName || connector.dataSourceType, "data source"),
      safeText(connector.authenticationMethod, "authentication method"),
      safeText(connector.gatewayRequirement, "gateway requirement"),
      safeText(connector.environmentRequirement, "environment requirement"),
      safeText(connector.dlpImpact, "DLP impact"),
      safeText(connector.connectionOwner, "connection owner"),
      safeText(connector.connectionOwnerRole, "connection owner role"),
      decisionText(connector.connectionOwnershipStatus),
      safeText(connector.connectionOwnershipNotes, "connection ownership notes"),
      safeText(connector.approvalStatus, "approval status"),
      decisionText(connector.approvalConfirmationStatus)
    ]), "connection records")}`,
    "## Guardrail\n\nDo not store passwords, client secrets, personal access tokens, or production connection credentials in generated documents."
  );
};

const implementationLog = (project: ProjectRecord) => join(
  "# Implementation Log",
  header(project),
  `## Current readiness gates\n\n${powerPlatformGateSummary(project)}`,
  "## Implemented items\n\n- Not started.",
  "## Manual actions completed\n\n- No manual actions recorded.",
  "## Deferred items\n\n- No deferred implementation items recorded.",
  "## Decisions changed after package generation\n\n- No scope changes recorded.",
  "## Validation evidence\n\n- No validation evidence recorded.",
  "## Guardrail\n\nThis log must describe real work performed. Do not pre-fill implementation, import, validation, or deployment claims."
);

const almDeploymentPlan = (project: ProjectRecord) => {
  const common = project.powerPlatform?.common;
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# ALM Deployment Plan",
    header(project),
    `## ALM gate\n\n${calculateAlmGate(project)}`,
    `## ALM decisions\n\n${markdownTable(["Area", "Decision"], [
      ["Solution-aware", powerPlatformValue(common?.solutionAware, "solution-aware decision")],
      ["Solution name", powerPlatformValue(common?.solutionName, "solution name")],
      ["Solution unique name", powerPlatformValue(common?.solutionUniqueName, "solution unique name")],
      ["Publisher", powerPlatformValue(common?.publisherName, "publisher")],
      ["Publisher prefix", powerPlatformValue(common?.publisherPrefix, "publisher prefix")],
      ["Source control", powerPlatformValue(common?.sourceControlApproach, "source control approach")],
      ["Git integration", powerPlatformValue(common?.gitIntegration, "Git integration")],
      ["Power Platform CLI availability", powerPlatformValue(common?.powerPlatformCliAvailability, "Power Platform CLI availability")],
      ["Deployment method", powerPlatformValue(common?.deploymentMethod, "deployment method")],
      ["Deployment responsibility", powerPlatformValue(common?.deploymentResponsibility, "deployment responsibility")],
      ["Deployment strategy", powerPlatformValue(common?.deploymentStrategy, "deployment strategy")],
      ["Pipeline requirements", powerPlatformValue(common?.pipelineRequirements, "pipeline requirements")],
      ["Rollback expectations", powerPlatformValue(common?.rollbackExpectations, "rollback expectations")],
      ["Release approval", powerPlatformValue(common?.releaseApprovalResponsibility, "release approval responsibility")],
      ["Model-driven ALM readiness", modelDriven ? decisionText(modelDriven.almReadinessStatus) : "Not applicable."]
    ])}`,
    `## Environment variables and connection references\n\n${markdownTable(["Item", "Decision"], [
      ["Environment variables", powerPlatformValue(common?.environmentVariables, "environment variables")],
      ["Connection references", powerPlatformValue(common?.connectionReferences, "connection references")]
    ])}`,
    "## Guardrail\n\nThis plan does not deploy, import, publish, or share an app. It defines approval-controlled manual or future automated release steps."
  );
};

const solutionArchitecture = (project: ProjectRecord) => {
  const common = project.powerPlatform?.common;
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Solution Architecture",
    header(project),
    `## Eligibility gate\n\n${calculateModelDrivenEligibilityGate(project)}`,
    `## Solution architecture gate\n\n${calculateModelDrivenSolutionArchitectureGate(project)}`,
    `## Solution identity\n\n${markdownTable(["Item", "Decision"], [
      ["Solution name", powerPlatformValue(common?.solutionName || modelDriven?.existingSolution, "solution name")],
      ["Solution unique name", powerPlatformValue(common?.solutionUniqueName, "solution unique name")],
      ["Publisher", powerPlatformValue(common?.publisherName, "publisher")],
      ["Publisher prefix", powerPlatformValue(common?.publisherPrefix, "publisher prefix")],
      ["Managed strategy", powerPlatformValue(modelDriven?.managedStrategy, "managed strategy")],
      ["Existing solution", powerPlatformValue(modelDriven?.existingSolution, "existing solution")]
    ])}`,
    `## Architecture notes\n\n${listOrMissing(modelDriven?.solutionArchitecture ?? "", "solution architecture")}`,
    `## Data composition\n\n${markdownTable(["Area", "Decision"], [
      ["Existing Dataverse tables", powerPlatformValue(modelDriven?.existingDataverseTables, "existing Dataverse tables")],
      ["New Dataverse tables", powerPlatformValue(modelDriven?.newDataverseTables, "new Dataverse tables")],
      ["Standard tables reused", powerPlatformValue(modelDriven?.standardTablesReused, "standard tables reused")],
      ["Activity table requirements", powerPlatformValue(modelDriven?.activityTableRequirements, "activity table requirements")],
      ["Virtual table requirements", powerPlatformValue(modelDriven?.virtualTableRequirements, "virtual table requirements")],
      ["Data migration", powerPlatformValue(modelDriven?.dataMigration, "data migration")],
      ["Duplicate detection", powerPlatformValue(modelDriven?.duplicateDetection, "duplicate detection")]
    ])}`,
    "## Guardrail\n\nDo not fabricate solution source files or importable solution packages from this architecture."
  );
};

const solutionComponentRegister = (project: ProjectRecord) => {
  const common = project.powerPlatform?.common;
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Solution Component Register",
    header(project),
    `## Component readiness\n\n${powerPlatformGateSummary(project)}`,
    `## Core components\n\n${markdownTable(["Component group", "Details"], [
      ["Tables", powerPlatformValue(modelDriven?.tables || modelDriven?.tableDefinitions, "tables")],
      ["Columns", powerPlatformValue(modelDriven?.columns || modelDriven?.columnDefinitions, "columns")],
      ["Relationships", powerPlatformValue(modelDriven?.relationships || modelDriven?.relationshipDefinitions, "relationships")],
      ["Choices", powerPlatformValue(modelDriven?.choices, "choices")],
      ["Forms", powerPlatformValue(modelDriven?.forms || modelDriven?.formDefinitions, "forms")],
      ["Views", powerPlatformValue(modelDriven?.views || modelDriven?.viewDefinitions, "views")],
      ["Business rules", powerPlatformValue(modelDriven?.businessRules, "business rules")],
      ["Business process flows", powerPlatformValue(modelDriven?.businessProcessFlows, "business process flows")],
      ["Automations", powerPlatformValue(modelDriven?.automations, "automations")],
      ["Security roles", powerPlatformValue(modelDriven?.securityRoles, "security roles")],
      ["Environment variables", powerPlatformValue(common?.environmentVariables, "environment variables")],
      ["Connection references", powerPlatformValue(common?.connectionReferences, "connection references")]
    ])}`,
    "## Guardrail\n\nThis register is descriptive. It does not claim components exist in Dataverse until manually configured or verified."
  );
};

const tableRelationships = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  const tables = modelDriven?.dataverseTableSchemas ?? [];
  const tableNames = new Map(tables.map((table) => [table.id, table.displayName || table.logicalName || table.id]));
  const rows = (modelDriven?.dataverseRelationshipSchemas ?? []).map((relationship) => [
    safeText(relationship.relationshipType, "relationship type"),
    safeText(relationship.relationshipSchemaName, "relationship schema name"),
    tableNames.get(relationship.parentTableId) ?? safeText(relationship.parentTable, "parent table"),
    tableNames.get(relationship.childTableId) ?? safeText(relationship.childTable, "child table"),
    safeText(relationship.requiredStatus, "required status"),
    safeText(relationship.referentialBehavior, "referential behavior"),
    safeText(relationship.cascadeBehavior, "cascade behavior"),
    safeText(relationship.navigationBehavior, "navigation behavior"),
    decisionText(relationship.confirmationStatus)
  ]);
  return join(
    "# Table Relationships",
    header(project),
    `## Dataverse schema gate\n\n${calculateModelDrivenDataverseSchemaGate(project)}`,
    `## Structured relationships\n\n${tableOrMissing(["Type", "Schema name", "Parent", "Child", "Required", "Referential", "Cascade", "Navigation", "Status"], rows, "relationship records")}`,
    `## Relationship notes\n\n${listOrMissing(modelDriven?.relationshipDefinitions || modelDriven?.relationships || "", "relationship notes")}`,
    "## Guardrail\n\nRelationship schema names and cascade rules must be confirmed from approved Dataverse design. Do not derive them from display names."
  );
};

const formsAndViews = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Forms and Views",
    header(project),
    `## Forms and views gate\n\n${calculateModelDrivenFormsAndViewsGate(project)}`,
    `## Forms and views\n\n${markdownTable(["Area", "Decision"], [
      ["Forms", powerPlatformValue(modelDriven?.forms || modelDriven?.formDefinitions, "forms")],
      ["Views", powerPlatformValue(modelDriven?.views || modelDriven?.viewDefinitions, "views")],
      ["Charts", modelDriven?.chartsDecision.status === "notApplicable" ? safeText(modelDriven.chartsDecision.notApplicableReason, "charts not-applicable reason") : powerPlatformValue(modelDriven?.charts, "charts")],
      ["Dashboards", modelDriven?.dashboardsDecision.status === "notApplicable" ? safeText(modelDriven.dashboardsDecision.notApplicableReason, "dashboards not-applicable reason") : powerPlatformValue(modelDriven?.dashboards, "dashboards")],
      ["App pages", modelDriven?.appPagesDecision.status === "notApplicable" ? safeText(modelDriven.appPagesDecision.notApplicableReason, "app pages not-applicable reason") : powerPlatformValue(modelDriven?.appPages, "app pages")]
    ])}`,
    modelDriven ? `## Optional UI component applicability\n\n${markdownTable(["Component", "Applicability", "Details", "Not-applicable reason", "Confirmation"], applicabilityRows([
      ["Charts", modelDriven.chartsDecision],
      ["Dashboards", modelDriven.dashboardsDecision],
      ["App pages", modelDriven.appPagesDecision],
      ["Custom pages", modelDriven.customPagesDecision]
    ]))}` : "",
    "## Guardrail\n\nThis document specifies required forms, views, charts, dashboards, and app pages. It does not generate form XML or solution source."
  );
};

const appNavigation = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# App Navigation",
    header(project),
    `## Navigation gate\n\n${calculateModelDrivenNavigationGate(project)}`,
    `## Navigation definitions\n\n${listOrMissing(modelDriven?.navigationDefinitions || modelDriven?.navigation, "navigation definitions")}`,
    `## App page notes\n\n${applicableRequirementOrMissing(modelDriven?.appPages, "app pages", modelDriven?.appPagesDecision)}`,
    "## Required navigation detail\n\n- App area names\n- Group names\n- Subarea/table placement\n- Role visibility expectations\n- Launch target and default area\n- Not-applicable decisions for unused areas",
    "## Guardrail\n\nDo not fabricate a sitemap or app module source. Confirm navigation in the maker portal or approved solution design before implementation."
  );
};

const businessProcessFlows = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Business Process Flows",
    header(project),
    `## Business logic gate\n\n${calculateModelDrivenBusinessLogicGate(project)}`,
    `## Business process flow requirements\n\n${applicableRequirementOrMissing(modelDriven?.businessProcessFlows, "business process flows", modelDriven?.businessProcessFlowsDecision)}`,
    modelDriven ? `## BPF applicability\n\n${markdownTable(["Component", "Applicability", "Details", "Not-applicable reason", "Confirmation"], applicabilityRows([
      ["Business process flows", modelDriven.businessProcessFlowsDecision]
    ]))}` : "",
    "## Guardrail\n\nDo not create or activate BPFs from this document. It records stage, table, role, and validation requirements for later approved implementation."
  );
};

const automationRegister = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Automation Register",
    header(project),
    `## Business logic gate\n\n${calculateModelDrivenBusinessLogicGate(project)}`,
    `## Automation requirements\n\n${applicableRequirementOrMissing(modelDriven?.automations, "automations", modelDriven?.automationsDecision)}`,
    modelDriven ? `## Automation applicability\n\n${markdownTable(["Component", "Applicability", "Details", "Not-applicable reason", "Confirmation"], applicabilityRows([
      ["Automations", modelDriven.automationsDecision],
      ["Custom workflow activities", modelDriven.customWorkflowActivitiesDecision],
      ["Plug-ins", modelDriven.pluginsDecision],
      ["Custom APIs", modelDriven.customApisDecision]
    ]))}` : "",
    "## Guardrail\n\nDo not create Power Automate flows, plug-ins, custom workflow activities, or custom APIs unless a later phase explicitly approves implementation."
  );
};

const securityRoles = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Security Roles",
    header(project),
    `## Security architecture gate\n\n${calculateModelDrivenSecurityArchitectureGate(project)}`,
    `## Role and privilege design\n\n${markdownTable(["Area", "Decision"], [
      ["Security roles", powerPlatformValue(modelDriven?.securityRoles, "security roles")],
      ["Business units", powerPlatformValue(modelDriven?.businessUnits, "business units")],
      ["Teams", powerPlatformValue(modelDriven?.teams, "teams")],
      ["Owner teams", powerPlatformValue(modelDriven?.ownerTeams, "owner teams")],
      ["Access teams", powerPlatformValue(modelDriven?.accessTeams, "access teams")],
      ["Table privileges", powerPlatformValue(modelDriven?.tablePrivileges, "table privileges")],
      ["Privilege depth", powerPlatformValue(modelDriven?.privilegeDepth, "privilege depth")],
      ["Record ownership", powerPlatformValue(modelDriven?.recordOwnership, "record ownership")],
      ["Sharing expectations", powerPlatformValue(modelDriven?.sharingExpectations, "sharing expectations")],
      ["Field security profiles", powerPlatformValue(modelDriven?.fieldSecurityProfiles, "field security profiles")],
      ["Sensitive fields", powerPlatformValue(modelDriven?.sensitiveFields, "sensitive fields")]
    ])}`,
    modelDriven ? `## Security applicability\n\n${markdownTable(["Component", "Applicability", "Details", "Not-applicable reason", "Confirmation"], applicabilityRows([
      ["Team model", modelDriven.teamModelDecision],
      ["Hierarchy security", modelDriven.hierarchySecurityDecision],
      ["Field security", modelDriven.fieldSecurityDecision],
      ["Application users", modelDriven.applicationUsersDecision],
      ["Service principals", modelDriven.servicePrincipalsDecision]
    ]))}` : "",
    "## Guardrail\n\nThis is not a complete privilege matrix. Do not fabricate table-level create/read/write/delete depth values beyond approved role requirements."
  );
};

const customPages = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Custom Pages",
    header(project),
    `## Forms and views gate\n\n${calculateModelDrivenFormsAndViewsGate(project)}`,
    `## Custom page requirements\n\n${modelDriven?.customPagesDecision.status === "notApplicable" ? `- ${modelDriven.customPagesDecision.notApplicableReason}` : listOrMissing(modelDriven?.customPages ?? "", "custom pages")}`,
    modelDriven ? `## Custom page applicability\n\n${markdownTable(["Component", "Applicability", "Details", "Not-applicable reason", "Confirmation"], applicabilityRows([
      ["Custom pages", modelDriven.customPagesDecision]
    ]))}` : "",
    "## Guardrail\n\nCustom pages are Canvas-based components inside model-driven apps. Do not generate paste-ready Canvas YAML or final Power Fx from this document."
  );
};

const extensionRegister = (project: ProjectRecord) => {
  const modelDriven = project.powerPlatform?.modelDriven;
  return join(
    "# Extension Register",
    header(project),
    `## Extensions gate\n\n${calculateModelDrivenExtensionsGate(project)}`,
    `## Extension details\n\n${markdownTable(["Extension", "Details"], [
      ["Command bar rules", modelDriven?.commandBarRulesDecision.status === "notApplicable" ? modelDriven.commandBarRulesDecision.notApplicableReason : powerPlatformValue(modelDriven?.commandBarRules, "command bar rules")],
      ["Client-side JavaScript", modelDriven?.clientSideJavaScriptDecision.status === "notApplicable" ? modelDriven.clientSideJavaScriptDecision.notApplicableReason : powerPlatformValue(modelDriven?.clientSideJavaScript, "client-side JavaScript")],
      ["Web resources", modelDriven?.webResourcesDecision.status === "notApplicable" ? modelDriven.webResourcesDecision.notApplicableReason : powerPlatformValue(modelDriven?.webResources, "web resources")],
      ["HTML web resources", modelDriven?.htmlWebResourcesDecision.status === "notApplicable" ? modelDriven.htmlWebResourcesDecision.notApplicableReason : powerPlatformValue(modelDriven?.htmlWebResources, "HTML web resources")],
      ["Image web resources", modelDriven?.imageWebResourcesDecision.status === "notApplicable" ? modelDriven.imageWebResourcesDecision.notApplicableReason : powerPlatformValue(modelDriven?.imageWebResources, "image web resources")],
      ["Plug-ins", modelDriven?.pluginsDecision.status === "notApplicable" ? modelDriven.pluginsDecision.notApplicableReason : powerPlatformValue(modelDriven?.plugins, "plug-ins")],
      ["Custom workflow activities", modelDriven?.customWorkflowActivitiesDecision.status === "notApplicable" ? modelDriven.customWorkflowActivitiesDecision.notApplicableReason : powerPlatformValue(modelDriven?.customWorkflowActivities, "custom workflow activities")],
      ["Custom APIs", modelDriven?.customApisDecision.status === "notApplicable" ? modelDriven.customApisDecision.notApplicableReason : powerPlatformValue(modelDriven?.customApis, "custom APIs")],
      ["PCF controls", modelDriven?.pcfControlsDecision.status === "notApplicable" ? modelDriven.pcfControlsDecision.notApplicableReason : powerPlatformValue(modelDriven?.pcfControls, "PCF controls")],
      ["Azure integrations", modelDriven?.azureIntegrationsDecision.status === "notApplicable" ? modelDriven.azureIntegrationsDecision.notApplicableReason : powerPlatformValue(modelDriven?.azureIntegrations, "Azure integrations")],
      ["External services", modelDriven?.externalServicesDecision.status === "notApplicable" ? modelDriven.externalServicesDecision.notApplicableReason : powerPlatformValue(modelDriven?.externalServices, "external services")]
    ])}`,
    modelDriven ? `## Extension applicability\n\n${markdownTable(["Component", "Applicability", "Details", "Not-applicable reason", "Confirmation"], applicabilityRows([
      ["Command bar", modelDriven.commandBarRulesDecision],
      ["Client-side JavaScript", modelDriven.clientSideJavaScriptDecision],
      ["Web resources", modelDriven.webResourcesDecision],
      ["HTML web resources", modelDriven.htmlWebResourcesDecision],
      ["Image web resources", modelDriven.imageWebResourcesDecision],
      ["PCF controls", modelDriven.pcfControlsDecision],
      ["Plug-ins", modelDriven.pluginsDecision],
      ["Custom workflow activities", modelDriven.customWorkflowActivitiesDecision],
      ["Custom APIs", modelDriven.customApisDecision],
      ["Azure integrations", modelDriven.azureIntegrationsDecision],
      ["External services", modelDriven.externalServicesDecision]
    ]))}` : "",
    "## Guardrail\n\nDo not generate JavaScript, plug-in code, PCF source, custom API code, or Azure integration assets without a later approved implementation phase."
  );
};

const environmentVariables = (project: ProjectRecord) => {
  const common = project.powerPlatform?.common;
  return join(
    "# Environment Variables",
    header(project),
    `## Environment-variable plan\n\n${listOrMissing(common?.environmentVariables ?? "", "environment variables")}`,
    `## Related deployment decisions\n\n${markdownTable(["Area", "Decision"], [
      ["Connection references", powerPlatformValue(common?.connectionReferences, "connection references")],
      ["Development environment", powerPlatformValue(common?.developmentEnvironment, "development environment")],
      ["Test environment", powerPlatformValue(common?.testEnvironment, "test environment")],
      ["Production environment", powerPlatformValue(common?.productionEnvironment, "production environment")],
      ["Deployment responsibility", powerPlatformValue(common?.deploymentResponsibility, "deployment responsibility")]
    ])}`,
    "## Secret handling rule\n\nRecord variable names, purpose, owner, default strategy, and environment scope. Do not record secret values in this package."
  );
};

const decisionLog = (project: ProjectRecord) => {
  const common = project.powerPlatform?.common;
  const canvas = project.powerPlatform?.canvas;
  const modelDriven = project.powerPlatform?.modelDriven;
  const rows = [
    ["DEC-001", formatDate(), "Project type", getProjectTypeLabel(project.intake.appType), "Draft", "Selected in guided intake", "Different project type", "Determines applicable document registry", safeText(project.client.clientName, "approver"), "Architect review"],
    ["DEC-002", formatDate(), "Primary data source", isModelDrivenProject(project) ? "Microsoft Dataverse" : canvas?.primaryDataSourceType && canvas.primaryDataSourceType !== "undecided" ? (canvas.primaryDataSourceType === "multiple" ? "Multiple Canvas data sources" : formatCanvasDataSourceType(canvas.primaryDataSourceType)) : missingMarker("primary data source"), calculateConnectorSelectionGate(project), "Required for schema and implementation phases", "Different backend", "Controls schema docs and formula/YAML eligibility", safeText(common?.businessOwner || common?.appOwner, "decision approver"), "Before implementation"],
    ["DEC-003", formatDate(), "Licensing", common?.licensingConfirmationStatus ? decisionText(common.licensingConfirmationStatus) : missingMarker("licensing decision"), calculateLicensingGate(project), "Licensing cannot be inferred", "Use only standard connectors or defer premium work", "Controls Ready for Codex and implementation scope", safeText(common?.businessOwner || common?.appOwner, "decision approver"), "Before build"],
    ["DEC-004", formatDate(), "Environment", safeText(common?.environment || common?.developmentEnvironment, "environment"), calculateEnvironmentGate(project), "Environment access is required for implementation claims", "Use planning-only package", "Controls manual validation and release planning", safeText(common?.technicalOwner, "technical approver"), "Before validation"],
    ["DEC-005", formatDate(), "Model-driven source", modelDriven ? safeText(modelDriven.sourceAvailabilityStatus || "Specifications only unless real source exists", "source availability status") : "Not Applicable", modelDriven ? calculateModelDrivenSolutionArchitectureGate(project) : "Not Applicable", "Source cannot be fabricated", modelDriven?.sourceAvailabilityStatus === "notApplicable" ? "Source not required for specification-only phases." : modelDriven ? `Location: ${safeText(modelDriven.sourceLocation, "source location")}; validation: ${safeText(modelDriven.sourceValidationEvidence, "source validation evidence")}` : "Not applicable to this project type.", "Controls whether source changes may be generated", safeText(common?.technicalOwner, "technical approver"), "Before source edits"]
  ];
  return join(
    "# Decision Log",
    header(project),
    `## Decisions\n\n${markdownTable(["Decision ID", "Date", "Topic", "Decision", "Status", "Reason", "Alternatives", "Impact", "Approved by", "Review date"], rows)}`,
    "## Decision rule\n\nEvery changed connector, licence, environment, schema, source, security, testing, ALM, or deployment decision must be recorded before implementation depends on it."
  );
};

export const documentTemplates: Record<string, (project: ProjectRecord) => string> = {
  "README.md": readme,
  "PROJECT_SCOPE.md": projectScope,
  "CLIENT_REQUIREMENTS.md": clientRequirements,
  "ARCHITECT_INSTRUCTIONS.md": architectInstructions,
  "CODEX_INSTRUCTIONS.md": codexInstructions,
  "APP_BLUEPRINT.md": appBlueprint,
  "DATA_MODEL.md": dataModel,
  "SCREEN_MAP.md": screenMap,
  "WORKFLOW_MAP.md": workflowMap,
  "SECURITY_MODEL.md": securityModel,
  "ACCEPTANCE_CRITERIA.md": acceptanceCriteria,
  "TEST_PLAN.md": testPlan,
  "DEPLOYMENT_NOTES.md": deploymentNotes,
  "CHANGE_LOG.md": changeLog,
  "NEXT_STEPS.md": nextSteps,
  "HANDOFF_CHECKLIST.md": handoffChecklist,
  "CLIENT_QUESTIONS.md": clientQuestions,
  "BRAND_GUIDE.md": brandGuide,
  "PHASED_CODEX_PROMPTS.md": phasedPrompts,
  "DECISION_LOG.md": decisionLog,
  "DATA_SOURCE_SCHEMA.md": dataSourceSchema,
  "POWER_FX_STANDARDS.md": powerFxStandards,
  "DELEGATION_REGISTER.md": delegationRegister,
  "CONTROL_INVENTORY.md": controlInventory,
  "APP_CONFIGURATION.md": appConfiguration,
  "YAML_MANIFEST.md": yamlManifest,
  "CONNECTOR_REGISTER.md": connectorRegister,
  "LICENSING_ASSESSMENT.md": licensingAssessment,
  "CONNECTION_REGISTER.md": connectionRegister,
  "IMPLEMENTATION_LOG.md": implementationLog,
  "ALM_DEPLOYMENT_PLAN.md": almDeploymentPlan,
  "SHAREPOINT_SCHEMA.md": sharePointSchema,
  "INTERNAL_COLUMN_NAMES.md": internalColumnNames,
  "DATAVERSE_SCHEMA.md": dataverseSchema,
  "LOGICAL_NAMES.md": logicalNames,
  "CONNECTOR_SCHEMA.md": connectorSchema,
  "SOLUTION_ARCHITECTURE.md": solutionArchitecture,
  "SOLUTION_COMPONENT_REGISTER.md": solutionComponentRegister,
  "TABLE_RELATIONSHIPS.md": tableRelationships,
  "FORMS_AND_VIEWS.md": formsAndViews,
  "APP_NAVIGATION.md": appNavigation,
  "BUSINESS_RULES.md": businessRulesDocument,
  "BUSINESS_PROCESS_FLOWS.md": businessProcessFlows,
  "AUTOMATION_REGISTER.md": automationRegister,
  "SECURITY_ROLES.md": securityRoles,
  "CUSTOM_PAGES.md": customPages,
  "EXTENSION_REGISTER.md": extensionRegister,
  "ENVIRONMENT_VARIABLES.md": environmentVariables
};

export const REQUIRED_DOCUMENT_TEMPLATE_KEYS = Object.keys(documentTemplates);

export function documentTemplatePreviewTable(project: ProjectRecord): string {
  return markdownTable(
    ["Document", "Status"],
    REQUIRED_DOCUMENT_TEMPLATE_KEYS.map((fileName) => [fileName, project.status])
  );
}
