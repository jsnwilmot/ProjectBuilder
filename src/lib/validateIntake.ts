import { INTAKE_STAGES, GENERATE_STAGE_INDEX } from "../data/intakeStages";
import {
  BRANDING_REQUIRED_FIELDS,
  PROJECT_MODULE_FIELDS,
  getProjectTypeFields,
  getProjectTypePreset,
  isBrandingRequired
} from "../data/projectTypes";
import type {
  IntakeValidationResult,
  ProjectInputField,
  ProjectRecord,
  ValidationSectionResult,
  ValidationIssue,
  ValidationWarning
} from "../types/project";
import { getProjectFieldValue } from "./projectFields";
import {
  calculateCanvasDataverseSchemaGate,
  calculateConnectorClassificationGate,
  calculateConnectorSelectionGate,
  calculateEnvironmentGate,
  calculateInternalNameGate,
  calculateLicensingGate,
  calculateLogicalNameGate,
  calculateAlmGate,
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
  calculateOtherConnectorSchemaGate,
  calculateSecurityReviewGate,
  calculateSharePointSchemaGate,
  calculateTestingPreparationGate,
  isCanvasProject,
  isModelDrivenProject,
  usesDataverse,
  usesOtherConnector,
  usesSharePoint
} from "./powerPlatform";
import type { PowerPlatformGateStatus } from "../types/project";

const fieldLabels = new Map(
  [
    ...INTAKE_STAGES.flatMap((stage) => stage.fields),
    ...Object.values(PROJECT_MODULE_FIELDS).flat()
  ].map((field) => [field.name, field.label] as const)
);

const globalWarningRules: Array<{ field: ProjectInputField; message: string }> = [
  { field: "constraints", message: "No constraints listed." },
  { field: "risks", message: "No risks listed." },
  { field: "assumptions", message: "No assumptions listed." },
  { field: "integrations", message: "No integrations listed." },
  { field: "reportsDashboards", message: "No reports listed." },
  { field: "accessibilityNotes", message: "No accessibility notes listed." }
];

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ruleMissingFields(project: ProjectRecord, stageId: string): ValidationIssue[] {
  const projectType = project.intake.appType;
  const preset = getProjectTypePreset(projectType);
  const missing = (field: ProjectInputField, message: string): ValidationIssue => ({
    field,
    label: fieldLabels.get(field) ?? field,
    message
  });
  const isWebsite = preset?.requiredIntakeModules.includes("website") ?? false;
  const isGame = preset?.requiredIntakeModules.includes("game") ?? false;
  const isDashboard = preset?.requiredIntakeModules.includes("dashboard") ?? false;
  const isAutomation = preset?.requiredIntakeModules.includes("automation") ?? false;
  const isApi = preset?.requiredIntakeModules.includes("api") ?? false;
  const isPowerPlatform = isCanvasProject(project) || isModelDrivenProject(project);

  const gateIsResolved = (gate: PowerPlatformGateStatus): boolean => gate === "confirmed" || gate === "notApplicable";
  const gateIssue = (field: ProjectInputField, label: string, message: string, gateIsReady: boolean): ValidationIssue[] =>
    gateIsReady ? [] : [{ field, label, message }];

  if (stageId === "foundation") {
    const issues: ValidationIssue[] = [];
    if (projectType && !preset) {
      issues.push(missing("appType", "Choose a supported project type from the available presets."));
    }
    if (
      preset?.brandingRequirementLevel === "conditional"
      && !project.intake.audienceVisibility.trim()
    ) {
      issues.push(missing(
        "audienceVisibility",
        "Audience visibility is required to determine whether structured branding is required."
      ));
    }
    if (isWebsite && !project.intake.domainStatus.trim() && !project.intake.hostingStatus.trim()) {
      issues.push(missing(
        "domainStatus",
        "Website projects require a domain or hosting decision, including \"Unknown yet\"."
      ));
    }
    if (isGame && !project.intake.gameGenre.trim()) {
      issues.push(missing("gameGenre", "Game genre is required for game projects."));
    }
    if (isGame && !project.intake.gameTargetDevices.trim() && !project.intake.targetPlatform.trim()) {
      issues.push(missing("gameTargetDevices", "Target devices or target platform are required for game projects."));
    }
    if (isPowerPlatform) {
      issues.push(
        ...gateIssue(
          "m365Environment",
          "Power Platform environment",
          "Power Platform projects require tenant, environment, and access status before readiness can pass.",
          calculateEnvironmentGate(project) === "confirmed"
        ),
        ...gateIssue(
          "m365Connectors",
          "Power Platform licensing",
          "Confirm Power Apps licensing, Dataverse availability where applicable, and connector licensing before Codex readiness.",
          calculateLicensingGate(project) === "confirmed"
        )
      );
    }
    return issues;
  }

  if (stageId === "users") {
    const issues: ValidationIssue[] = [];
    if (lines(project.intake.targetUsers).length === 0) {
      issues.push({ field: "targetUsers", label: "Target users", message: "At least one target user is required." });
    }
    if (lines(project.intake.userRoles).length === 0) {
      issues.push({ field: "userRoles", label: "User roles", message: "At least one user role is required." });
    }
    if (!project.intake.rolePermissionsSummary.trim() && !project.intake.roleAccessNotes.trim()) {
      issues.push({ field: "rolePermissionsSummary", label: "Role permissions summary", message: "Permission summary or role access notes are required." });
    }
    if (isDashboard && !project.intake.dashboardAudience.trim()) {
      issues.push(missing("dashboardAudience", "Dashboard audience is required for dashboard projects."));
    }
    if (isApi && !project.intake.apiConsumers.trim()) {
      issues.push(missing("apiConsumers", "API consumers are required for API or backend projects."));
    }
    return issues;
  }

  if (stageId === "features") {
    const issues: ValidationIssue[] = [];
    if (lines(project.intake.requiredFeatures).length === 0) {
      issues.push({ field: "requiredFeatures", label: "Required features", message: "At least one required feature is required." });
    }
    if (!project.intake.acceptanceNotes.trim()) {
      issues.push({ field: "acceptanceNotes", label: "Acceptance notes", message: "Acceptance notes are required." });
    }
    if (isBrandingRequired(projectType, project.intake.audienceVisibility)) {
      for (const field of BRANDING_REQUIRED_FIELDS) {
        if (!getProjectFieldValue(project, field).trim()) {
          issues.push(missing(field, `${fieldLabels.get(field) ?? field} is required for this project's branding handoff.`));
        }
      }
    }
    if (isWebsite && !project.intake.websitePages.trim()) {
      issues.push(missing("websitePages", "Website pages are required for website projects."));
    }
    if (isWebsite && !project.intake.seoKeywords.trim()) {
      issues.push(missing("seoKeywords", "SEO notes or keywords are required for website projects."));
    }
    if (isWebsite && !project.intake.contentSource.trim()) {
      issues.push(missing("contentSource", "Content source is required for website projects."));
    }
    if (isGame && !project.intake.gameControls.trim()) {
      issues.push(missing("gameControls", "Controls are required for game projects."));
    }
    if (isGame && !project.intake.gameArtStyle.trim()) {
      issues.push(missing("gameArtStyle", "Art style is required for game projects."));
    }
    if (isDashboard && !project.intake.dashboardKpis.trim()) {
      issues.push(missing("dashboardKpis", "KPIs are required for dashboard projects."));
    }
    if (isApi && !project.intake.apiEndpoints.trim()) {
      issues.push(missing("apiEndpoints", "Endpoints are required for API or backend projects."));
    }
    return issues;
  }

  if (stageId === "data") {
    const issues: ValidationIssue[] = [];
    const entityLines = lines(project.intake.dataEntities || project.intake.dataCollections);
    if (entityLines.length === 0) {
      issues.push({ field: "dataCollections", label: "Tables, lists, or collections", message: "At least one data entity is required." });
    }
    if (lines(project.intake.fields).length === 0) {
      issues.push({ field: "fields", label: "Fields", message: "Each entity should include at least one field." });
    }
    if (!project.intake.keyFields.trim()) {
      issues.push({ field: "keyFields", label: "Key fields", message: "Key fields should be identified where known." });
    }
    if (isDashboard && !project.intake.dashboardDataSources.trim() && !project.intake.dataSources.trim()) {
      issues.push(missing("dashboardDataSources", "A data source is required for dashboard projects."));
    }
    if (isDashboard && !project.intake.dashboardRefreshFrequency.trim()) {
      issues.push(missing("dashboardRefreshFrequency", "Refresh frequency is required for dashboard projects."));
    }
    if (isAutomation && (!project.intake.sourceSystem.trim() || !project.intake.targetSystem.trim())) {
      issues.push(missing("sourceSystem", "Source and target systems are required for automation projects."));
    }
    if (isApi && !project.intake.dataContracts.trim()) {
      issues.push(missing("dataContracts", "Data contracts are required for API or backend projects."));
    }
    if (isCanvasProject(project)) {
      issues.push(
        ...gateIssue(
          "dataSources",
          "Canvas primary data source",
          "Confirm the primary Canvas data source. The default remains undecided until selected.",
          calculateConnectorSelectionGate(project) === "confirmed"
        ),
        ...gateIssue(
          "m365Connectors",
          "Connector classification",
          "Classify each connector as standard, premium, custom, or not applicable and confirm classification.",
          calculateConnectorClassificationGate(project) === "confirmed"
        )
      );
      if (usesSharePoint(project)) {
        issues.push(
          ...gateIssue(
            "sharePointLists",
            "SharePoint schema",
            "SharePoint or Microsoft Lists projects require site/list/library schema before Ready for Codex.",
            calculateSharePointSchemaGate(project) === "confirmed"
          ),
          ...gateIssue(
            "keyFields",
            "SharePoint internal column names",
            "SharePoint schema must include confirmed internal column names, not display names only.",
            calculateInternalNameGate(project) === "confirmed"
          )
        );
      }
      if (usesDataverse(project)) {
        issues.push(
          ...gateIssue(
            "dataverseUse",
            "Canvas Dataverse schema",
            "Canvas Dataverse projects require environment, solution/table schema, and confirmed logical names.",
            calculateCanvasDataverseSchemaGate(project) === "confirmed"
          ),
          ...gateIssue(
            "fields",
            "Dataverse logical names",
            "Dataverse fields must include confirmed logical names before Codex-ready prompts are prepared.",
            calculateLogicalNameGate(project) === "confirmed"
          )
        );
      }
      if (usesOtherConnector(project)) {
        issues.push(
          ...gateIssue(
            "m365Connectors",
            "Other connector schema",
            "Custom, external, or other connectors require schema, fields, and confirmation source.",
            calculateOtherConnectorSchemaGate(project) === "confirmed"
          )
        );
      }
    }
    if (isModelDrivenProject(project)) {
      issues.push(
        ...gateIssue(
          "dataverseUse",
          "Model-driven eligibility",
          "Model-driven apps require confirmed Dataverse, licensing, environment access, and solution/table permissions.",
          calculateModelDrivenEligibilityGate(project) === "confirmed"
        ),
        ...gateIssue(
          "fields",
          "Model-driven Dataverse schema",
          "Model-driven apps require confirmed solution, publisher, table, column, relationship, and security-role schema.",
          calculateModelDrivenDataverseSchemaGate(project) === "confirmed"
        ),
        ...gateIssue(
          "keyFields",
          "Dataverse logical names",
          "Model-driven table and column logical names must be confirmed before Codex-ready prompts are prepared.",
          calculateLogicalNameGate(project) === "confirmed"
        ),
        ...gateIssue(
          "m365Connectors",
          "External connector selection",
          "External model-driven connectors are optional, but each connector requires purpose, source, authentication, gateway, DLP, and approval details when present.",
          gateIsResolved(calculateModelDrivenExternalConnectorSelectionGate(project))
        ),
        ...gateIssue(
          "m365Connectors",
          "External connector classification",
          "External model-driven connector classification must be explicitly confirmed when connectors exist.",
          gateIsResolved(calculateModelDrivenExternalConnectorClassificationGate(project))
        ),
        ...gateIssue(
          "m365Connectors",
          "External connector licensing",
          "External model-driven connector licensing must be explicitly confirmed when connectors exist.",
          gateIsResolved(calculateModelDrivenExternalConnectorLicensingGate(project))
        )
      );
    }
    return issues;
  }

  if (stageId === "workflows") {
    const issues: ValidationIssue[] = [];
    if (lines(project.intake.workflows).length === 0) {
      issues.push({ field: "workflows", label: "Workflows", message: "At least one workflow is required." });
    }
    if (!project.intake.workflowTrigger.trim()) {
      issues.push({ field: "workflowTrigger", label: "Trigger", message: "Each workflow must include a trigger." });
    }
    if (!project.intake.workflowSteps.trim()) {
      issues.push({ field: "workflowSteps", label: "Steps", message: "Each workflow must include steps." });
    }
    if (!project.intake.workflowOutcome.trim()) {
      issues.push({ field: "workflowOutcome", label: "Expected outcome", message: "Each workflow must include an expected outcome." });
    }
    if (isGame && !project.intake.gameplayLoop.trim()) {
      issues.push(missing("gameplayLoop", "Gameplay loop is required for game projects."));
    }
    if (isAutomation && !project.intake.automationTrigger.trim()) {
      issues.push(missing("automationTrigger", "Automation trigger is required for automation projects."));
    }
    if (isAutomation && !project.intake.automationSteps.trim()) {
      issues.push(missing("automationSteps", "Ordered automation steps are required for automation projects."));
    }
    if (isAutomation && !project.intake.automationErrorHandling.trim()) {
      issues.push(missing("automationErrorHandling", "Failure handling is required for automation projects."));
    }
    if (isAutomation && !project.intake.notificationRules.trim()) {
      issues.push(missing("notificationRules", "Notification rules are required for automation projects."));
    }
    if (isModelDrivenProject(project)) {
      issues.push(
        ...gateIssue(
          "workflows",
          "Model-driven forms and views",
          "Model-driven forms, views, charts, dashboards, app pages, and custom pages require confirmed requirements or applicability decisions.",
          calculateModelDrivenFormsAndViewsGate(project) === "confirmed"
        ),
        ...gateIssue(
          "workflows",
          "Model-driven navigation",
          "Model-driven navigation requirements must be confirmed.",
          calculateModelDrivenNavigationGate(project) === "confirmed"
        ),
        ...gateIssue(
          "workflows",
          "Model-driven business logic",
          "Business rules, business process flows, and automations require confirmed requirements or valid not-applicable decisions.",
          calculateModelDrivenBusinessLogicGate(project) === "confirmed"
        ),
        ...gateIssue(
          "workflows",
          "Model-driven extensions",
          "Model-driven extension categories require confirmed applicability decisions.",
          calculateModelDrivenExtensionsGate(project) === "confirmed"
        ),
        ...gateIssue(
          "workflows",
          "Model-driven ALM",
          "Model-driven ALM requires source control, deployment, rollback, release approval, and model-driven ALM readiness confirmation.",
          calculateAlmGate(project) === "confirmed"
        )
      );
    }
    return issues;
  }

  if (stageId === "security") {
    const issues: ValidationIssue[] = [];
    if (!project.intake.permissionRules.trim() && !project.intake.roleAccessNotes.trim()) {
      issues.push({ field: "permissionRules", label: "Permission rules", message: "Permission rules or role access notes are required." });
    }
    if (!project.intake.sensitiveDataNotes.trim()) {
      issues.push({ field: "sensitiveDataNotes", label: "Sensitive data notes", message: "Sensitive data handling notes are required." });
    }
    if (!project.intake.risks.trim()) {
      issues.push({ field: "risks", label: "Risks", message: "List security risks or explicitly state no known risks." });
    }
    if (isApi && !project.intake.apiAuthentication.trim() && !project.intake.authenticationExpectation.trim()) {
      issues.push(missing("apiAuthentication", "Authentication expectation is required for API or backend projects."));
    }
    if (isPowerPlatform) {
      issues.push(
        ...gateIssue(
          "permissionRules",
          "Power Platform security review",
          "Power Platform projects require authentication, authorization, record access, audit, and privacy decisions.",
          calculateSecurityReviewGate(project) === "confirmed"
        ),
        ...gateIssue(
          "successCriteria",
          "Power Platform testing preparation",
          "Power Platform projects require functional, connector, permission, accessibility, and deployment testing expectations.",
          calculateTestingPreparationGate(project) === "confirmed"
        )
      );
    }
    if (isModelDrivenProject(project)) {
      issues.push(
        ...gateIssue(
          "permissionRules",
          "Model-driven security architecture",
          "Model-driven security requires roles, business units, teams, privileges, ownership, sharing, and field security decisions.",
          calculateModelDrivenSecurityArchitectureGate(project) === "confirmed"
        )
      );
    }
    return issues;
  }

  return [];
}

function sectionWarnings(project: ProjectRecord, stageId: string): string[] {
  if (stageId === "foundation") {
    return project.intake.constraints.trim() ? [] : ["No constraints listed."];
  }
  if (stageId === "users") {
    return project.intake.accessibilityNotes.trim() ? [] : ["No accessibility notes listed."];
  }
  if (stageId === "features") {
    const warnings: string[] = [];
    if (!project.intake.reportsDashboards.trim()) warnings.push("No reports listed.");
    const preset = getProjectTypePreset(project.intake.appType);
    if (
      preset
      && preset.brandingRequirementLevel !== "required"
      && !project.intake.brandStatus.trim()
      && !project.intake.brandingNotes.trim()
    ) {
      warnings.push("No branding information listed.");
    }
    return warnings;
  }
  if (stageId === "data") {
    return project.intake.integrations.trim() ? [] : ["No integrations listed."];
  }
  if (stageId === "security") {
    const warnings: string[] = [];
    if (!project.intake.assumptions.trim()) warnings.push("No assumptions listed.");
    if (!project.intake.risks.trim()) warnings.push("No risks listed.");
    return warnings;
  }
  return [];
}

function sectionResult(project: ProjectRecord, stageIndex: number): ValidationSectionResult {
  const stage = INTAKE_STAGES[stageIndex];
  const requiredMissing = stage.requiredFields.filter((field) => !getProjectFieldValue(project, field).trim());
  const ruleIssues = ruleMissingFields(project, stage.id);
  const projectTypeFields = getProjectTypeFields(
    project.intake.appType,
    project.intake.audienceVisibility,
    stage.id
  ).map((field) => field.name);
  const trackedFields = [...new Set([...stage.requiredFields, ...stage.optionalFields, ...projectTypeFields])];
  const completed = trackedFields.filter((field) => getProjectFieldValue(project, field).trim()).length;
  const percentComplete = trackedFields.length === 0
    ? (requiredMissing.length === 0 && ruleIssues.length === 0 ? 100 : 0)
    : Math.round((completed / trackedFields.length) * 100);

  return {
    stageId: stage.id,
    label: stage.label,
    percentComplete,
    isComplete: requiredMissing.length === 0 && ruleIssues.length === 0,
    missingFields: [...new Set([...requiredMissing, ...ruleIssues.map((issue) => issue.field)])],
    warnings: sectionWarnings(project, stage.id)
  };
}

export function validateIntake(project: ProjectRecord): IntakeValidationResult {
  const missingFieldsFromStages: ValidationIssue[] = INTAKE_STAGES.flatMap((stage) => {
    const fieldIssues = stage.requiredFields.flatMap((field) => {
      const value = getProjectFieldValue(project, field).trim();
      if (value) return [];
      const label = fieldLabels.get(field) ?? field;
      return [{ field, label, message: `${label} is required for stage completion.` }];
    });
    return [...fieldIssues, ...ruleMissingFields(project, stage.id)];
  });

  const deduplicatedMissingFields: ValidationIssue[] = [];
  const seenMissing = new Set<string>();
  for (const issue of missingFieldsFromStages) {
    const key = `${issue.field}:${issue.message}`;
    if (seenMissing.has(key)) continue;
    seenMissing.add(key);
    deduplicatedMissingFields.push(issue);
  }

  const warnings: ValidationWarning[] = globalWarningRules.flatMap(({ field, message }) => {
    if (getProjectFieldValue(project, field).trim()) return [];
    const label = fieldLabels.get(field) ?? field;
    return [{ field, label, message }];
  });

  const sectionResults = INTAKE_STAGES.map((_, index) => sectionResult(project, index));

  return {
    isValid: deduplicatedMissingFields.length === 0,
    missingFields: deduplicatedMissingFields,
    warnings,
    sectionResults
  };
}

export function getOutstandingFields(project: ProjectRecord): ProjectInputField[] {
  return INTAKE_STAGES
    .flatMap((step) => [
      ...step.fields.map((field) => field.name),
      ...getProjectTypeFields(
        project.intake.appType,
        project.intake.audienceVisibility,
        step.id
      ).map((field) => field.name)
    ])
    .filter((field, index, fields) => fields.indexOf(field) === index)
    .filter((field) => !getProjectFieldValue(project, field).trim());
}

export function getStepCompletion(project: ProjectRecord, stepIndex: number): number {
  const section = validateIntake(project).sectionResults[stepIndex];
  if (!section) return 0;
  return section.percentComplete;
}

export function getFirstIncompleteStep(project: ProjectRecord): number {
  const results = validateIntake(project).sectionResults;
  const index = results.findIndex((section) => !section.isComplete && section.stageId !== "generate");
  return index === -1 ? GENERATE_STAGE_INDEX : index;
}
