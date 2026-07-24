import { INTAKE_STAGES } from "../data/intakeStages";
import type {
  CanvasControlTarget,
  CanvasStateVariableTarget,
  GeneratedDocument,
  PowerPlatformDecisionStatus,
  ProjectRecord
} from "../types/project";
import { validateCanvasStateVariables } from "./stateInitialization";

export interface EffectiveCanvasValue {
  value: string;
  source: string;
  contradictions: string[];
}

export interface MissingMarkerTrace {
  document: string;
  marker: string;
  stageId: string;
  stageLabel: string;
  subsection: string;
  fieldLabel: string;
  storedProperty: string;
  reasonRejected: string;
  requiredStatus?: string;
  orphan: boolean;
  occurrence: number;
}

type TraceSource = Omit<MissingMarkerTrace, "document" | "marker" | "orphan" | "occurrence">;
type DynamicMarkerRegistration = {
  pattern: RegExp;
  source: (marker: string, project: ProjectRecord) => TraceSource;
};

const exactMarkerSources: Record<string, (project: ProjectRecord) => TraceSource> = {
  "app name": source("foundation", "Project identity", "App name", "project.identity.projectName", "Visible Foundation field is blank."),
  "project name": source("foundation", "Project identity", "Project name", "project.identity.projectName", "Visible Foundation field is blank."),
  "client name": source("foundation", "Project identity", "Client name", "project.client.clientName", "Visible Foundation field is blank."),
  "business or department": source("foundation", "Project identity", "Business or department", "project.client.businessName", "Visible Foundation field is blank."),
  "project type": source("foundation", "Project foundation", "Project type", "project.intake.appType", "Visible Foundation field is blank."),
  "target platform": source("foundation", "Project foundation", "Target platform", "project.intake.targetPlatform", "Visible Foundation field is blank."),
  "app purpose": source("foundation", "Project foundation", "App purpose", "project.intake.appPurpose", "Visible Foundation field is blank."),
  "problem being solved": source("foundation", "Project foundation", "Problem being solved", "project.intake.problemStatement", "Visible Foundation field is blank."),
  "target users": source("users", "Users", "Target users", "project.intake.targetUsers", "Visible Users field is blank."),
  "user roles": source("users", "Users", "User roles", "project.intake.userRoles", "Visible Users field is blank."),
  "required features": source("features", "Features", "Required features", "project.intake.requiredFeatures", "Visible Features field is blank."),
  "feature description": source("features", "Features", "Feature description", "project.intake.featureDescription", "Visible Features field is blank."),
  "screens": source("features", "Features", "Screens", "project.intake.screens / powerPlatform.canvas.screenTargets", "No visible screen notes or structured screen targets are complete."),
  "workflows": source("workflows", "Workflows", "Workflows", "project.intake.workflows", "Visible Workflows field is blank."),
  "workflow name": source("workflows", "Workflows", "Workflow name", "project.intake.workflows", "Visible Workflows field is blank."),
  "workflow roles": source("workflows", "Workflows", "Workflow roles", "project.intake.workflowRoles", "Visible Workflows field is blank."),
  "workflow trigger": source("workflows", "Workflows", "Workflow trigger", "project.intake.workflowTriggers", "Visible Workflows field is blank."),
  "workflow inputs": source("workflows", "Workflows", "Workflow inputs", "project.intake.workflowInputs", "Visible Workflows field is blank."),
  "workflow outputs": source("workflows", "Workflows", "Workflow outputs", "project.intake.workflowOutputs", "Visible Workflows field is blank."),
  "workflow steps": source("workflows", "Workflows", "Workflow steps", "project.intake.workflowSteps", "Visible Workflows field is blank."),
  "workflow decision points": source("workflows", "Workflows", "Workflow decision points", "project.intake.workflowDecisionPoints", "Visible Workflows field is blank."),
  "failure or exception handling": source("workflows", "Workflows", "Failure or exception handling", "project.intake.failureHandling", "Visible Workflows field is blank."),
  "expected workflow outcome": source("workflows", "Workflows", "Expected workflow outcome", "project.intake.workflowOutcomes", "Visible Workflows field is blank."),
  "workflow acceptance criteria": source("workflows", "Workflows", "Workflow acceptance criteria", "project.intake.workflowAcceptanceCriteria", "Visible Workflows field is blank."),
  "success criteria": source("foundation", "Project foundation", "Success criteria", "project.intake.successCriteria", "Visible Foundation field is blank."),
  "data sources": source("data", "Data", "Data sources", "project.intake.dataSources / powerPlatform.canvas.primaryDataSourceType", "No visible data-source answer is complete."),
  "data entities": source("data", "Data", "Data entities", "project.intake.dataEntities", "Visible Data field is blank."),
  "tables, lists, or collections": source("data", "Data", "Tables, lists, or collections", "project.intake.dataCollections", "Visible Data field is blank."),
  "fields": source("data", "Data", "Fields", "project.intake.fields", "Visible Data field is blank."),
  "field types": source("data", "Data", "Field types", "project.intake.fieldTypes", "Visible Data field is blank."),
  "relationships": source("data", "Data", "Relationships", "project.intake.relationships", "Visible Data field is blank."),
  "data ownership": source("data", "Data governance", "Data ownership", "project.intake.dataOwnership", "Visible Data field is blank."),
  "data retention notes": source("data", "Data governance", "Data retention notes", "project.intake.dataRetentionNotes", "Visible Data field is blank."),
  "required data fields": source("data", "Data", "Required fields", "project.intake.requiredDataFields", "Visible Data field is blank."),
  "permission rules": source("security", "Security", "Permission rules", "project.intake.permissionRules", "Visible Security field is blank."),
  "role access notes": source("security", "Security", "Role access notes", "project.intake.roleAccessNotes", "Visible Security field is blank."),
  "sensitive data notes": source("security", "Security", "Sensitive data notes", "project.intake.sensitiveDataNotes", "Visible Security field is blank."),
  "authentication expectation": source("security", "Security", "Authentication expectation", "project.intake.authenticationRequirements", "Visible Security field is blank."),
  "authorization expectation": source("security", "Security", "Authorization expectation", "project.intake.authorizationRequirements", "Visible Security field is blank."),
  "data protection expectations": source("security", "Security", "Data protection expectations", "project.intake.dataProtectionNotes", "Visible Security field is blank."),
  "compliance notes": source("security", "Security", "Compliance notes", "project.intake.complianceNotes", "Visible Security field is blank."),
  "audit or logging needs": source("security", "Security", "Audit or logging needs", "project.intake.auditLoggingNeeds", "Visible Security field is blank."),
  "accessibility requirements": source("security", "Accessibility", "Accessibility requirements", "project.intake.accessibilityRequirements", "Visible Security field is blank."),
  "accessibility notes": source("security", "Accessibility", "Accessibility notes", "project.intake.accessibilityNotes", "Visible Security field is blank."),
  "accessibility contrast notes": source("security", "Accessibility", "Accessibility contrast notes", "project.intake.accessibilityContrastNotes", "Visible Security field is blank."),
  "constraints": source("foundation", "Project foundation", "Constraints", "project.intake.constraints", "Visible Foundation field is blank."),
  "risks": source("security", "Security", "Risks", "project.intake.risks", "Visible Security field is blank."),
  "assumptions": source("security", "Security", "Assumptions", "project.intake.assumptions", "Visible Security field is blank."),
  "out-of-scope items": source("foundation", "Project foundation", "Out-of-scope items", "project.intake.outOfScope", "Visible Foundation field is blank."),
  "out-of-scope work": source("foundation", "Project foundation", "Out-of-scope work", "project.intake.outOfScope", "Visible Foundation field is blank."),
  "approved scope": source("foundation", "Project foundation", "Approved scope", "project.intake.approvedScope", "Visible Foundation field is blank."),
  "acceptance notes": source("foundation", "Project foundation", "Acceptance notes", "project.intake.acceptanceNotes", "Visible Foundation field is blank."),
  "automations": source("workflows", "Automation", "Automations", "project.intake.automations", "Visible Workflows field is blank."),
  "notifications": source("workflows", "Automation", "Notifications", "project.intake.notifications", "Visible Workflows field is blank."),
  "integrations": source("workflows", "Integrations", "Integrations", "project.intake.integrations", "Visible Workflows field is blank."),
  "reports or dashboards": source("features", "Reports", "Reports or dashboards", "project.intake.reports", "Visible Features field is blank."),
  "branding notes": source("features", "Branding", "Branding notes", "project.intake.brandingNotes", "Visible Features field is blank."),
  "additional branding notes": source("features", "Branding", "Additional branding notes", "project.intake.additionalBrandingNotes", "Visible Features field is blank."),
  "branding requirement level": source("features", "Branding", "Branding requirement level", "project.intake.brandingRequirementLevel", "Visible Features field is blank."),
  "validation-state behavior per screen": source("features", "Screen behavior", "Validation-state behavior per screen", "powerPlatform.canvas.validationStates", "Visible screen behavior field is blank."),
  "orientation": source("features", "Canvas app settings", "Orientation", "powerPlatform.canvas.orientation", "Visible Canvas setting field is blank."),
  "responsive mode": source("features", "Canvas app settings", "Responsive mode", "powerPlatform.canvas.responsiveMode", "Visible Canvas setting field is blank."),
  "target devices": source("features", "Canvas app settings", "Target devices", "powerPlatform.canvas.targetDevices", "Visible Canvas setting field is blank."),
  "target screen sizes": source("features", "Canvas app settings", "Target screen sizes", "powerPlatform.canvas.targetScreenSizes", "Visible Canvas setting field is blank."),
  "create screens or forms": source("features", "Canvas implementation targets", "Create screens or forms", "powerPlatform.canvas.screenTargets / powerPlatform.canvas.controlTargets", "No confirmed create screen or form target is available."),
  "view/edit screens or forms": source("features", "Canvas implementation targets", "View/edit screens or forms", "powerPlatform.canvas.screenTargets / powerPlatform.canvas.controlTargets", "No confirmed view/edit screen or form target is available."),
  "roles": source("users", "Users", "Roles", "project.intake.userRoles / powerPlatform.common.roles", "Visible role field is blank."),
  "required fields": source("data", "Data", "Required fields", "project.intake.requiredDataFields / powerPlatform.canvas.*ColumnSchemas", "Visible required-field details are blank."),
  "expected record counts": source("data", "SharePoint schema", "Expected record count", "powerPlatform.canvas.sharePointListSchemas[].expectedRecordCount / powerPlatform.canvas.expectedRecordCounts", "No structured record count or general visible summary is complete."),
  "SharePoint library records": source("data", "Files and attachments", "SharePoint libraries", "powerPlatform.canvas.fileApplicabilityDecision / sharePointLibrarySchemas", "Files are required without a confirmed structured library, or applicability is undecided.", "Required unless files are confirmed Not Applicable."),
  "SharePoint site title": source("data", "SharePoint schema", "SharePoint site title", "powerPlatform.canvas.sharePointSiteTitle", "Visible SharePoint site title field is blank."),
  "SharePoint site owner": source("data", "SharePoint schema", "SharePoint site owner", "powerPlatform.canvas.sharePointSiteOwner", "Visible SharePoint site owner field is blank."),
  "SharePoint access status": source("data", "SharePoint schema", "SharePoint access status", "powerPlatform.canvas.sharePointAccessStatus", "Visible SharePoint access status field is blank."),
  "attachment controls": source("data", "Files and attachments", "Files and attachments applicability", "powerPlatform.canvas.fileApplicabilityDecision / controlTargets", "Attachment controls are required only when files are required and no structured control target is confirmed."),
  "controls": source("features", "Canvas implementation targets", "Structured control targets", "powerPlatform.canvas.controlTargets", "No confirmed structured control target is available."),
  "save/cancel controls": source("features", "Canvas implementation targets", "Structured Save and Cancel controls", "powerPlatform.canvas.controlTargets / formOperationTargets / formModeTargets", "No confirmed structured Save or Cancel target is available."),
  "selected-record state": source("features", "Canvas implementation targets", "Structured state variables", "powerPlatform.canvas.stateVariableTargets", "No confirmed structured selected-record state variable is available."),
  "security testing": source("security", "Testing", "Security testing", "powerPlatform.common.securityTesting", "Visible testing field is blank."),
  "volume testing": source("security", "Testing", "Volume testing", "powerPlatform.common.volumeTesting", "Visible testing field is blank."),
  "integration testing": source("security", "Testing", "Integration testing", "powerPlatform.common.integrationTesting", "Visible testing field is blank."),
  "regression testing": source("security", "Testing", "Regression testing", "powerPlatform.common.regressionTesting", "Visible testing field is blank."),
  "user acceptance testing": source("security", "Testing", "User acceptance testing", "powerPlatform.common.userAcceptanceTesting", "Visible testing field is blank."),
  "production smoke testing": source("security", "Testing", "Production smoke testing", "powerPlatform.common.productionSmokeTesting", "Visible testing field is blank."),
  "Git integration": source("workflows", "ALM", "Git integration", "powerPlatform.common.gitIntegration", "Visible ALM field is blank."),
  "Power Platform CLI availability": source("workflows", "ALM", "Power Platform CLI availability", "powerPlatform.common.powerPlatformCliAvailability", "Visible ALM field is blank."),
  "app subtype": source("foundation", "Project foundation", "App subtype", "project.intake.appSubtype", "Visible Foundation field is blank."),
  "Canvas subtype": source("foundation", "Project foundation", "Canvas subtype", "powerPlatform.canvas.canvasSubtype", "Visible Canvas subtype field is blank."),
  "Power Platform app subtype": source("foundation", "Project foundation", "Power Platform app subtype", "powerPlatform.canvas.canvasSubtype / powerPlatform.modelDriven.appSubtype", "Visible Power Platform subtype field is blank."),
  "Power Platform environment": source("foundation", "Environment", "Power Platform environment", "powerPlatform.common.environment", "Visible Power Platform environment field is blank."),
  "tenant": source("foundation", "Environment", "Tenant", "powerPlatform.common.tenant", "Visible Power Platform environment field is blank."),
  "environment": source("foundation", "Environment", "Environment", "powerPlatform.common.environment", "Visible Power Platform environment field is blank."),
  "current environment": source("foundation", "Environment", "Current environment", "powerPlatform.common.currentEnvironment", "Visible Power Platform environment field is blank."),
  "environment type": source("foundation", "Environment", "Environment type", "powerPlatform.common.environmentType", "Visible Power Platform environment field is blank."),
  "current Power Apps licences": source("foundation", "Licensing", "Current Power Apps licences", "powerPlatform.common.currentPowerAppsLicences", "Visible licensing field is blank."),
  "current Power Automate licences": source("foundation", "Licensing", "Current Power Automate licences", "powerPlatform.common.currentPowerAutomateLicences", "Visible licensing field is blank."),
  "business owner": source("foundation", "Ownership", "Business owner", "powerPlatform.common.businessOwner", "Visible ownership field is blank."),
  "technical owner": source("foundation", "Ownership", "Technical owner", "powerPlatform.common.technicalOwner", "Visible ownership field is blank."),
  "app owner": source("foundation", "Ownership", "App owner", "powerPlatform.common.appOwner", "Visible ownership field is blank."),
  "support owner": source("foundation", "Ownership", "Support owner", "powerPlatform.common.supportOwner", "Visible ownership field is blank."),
  "approver": source("foundation", "Approvals", "Approver", "powerPlatform.common.releaseApprover", "Visible approval field is blank."),
  "decision approver": source("foundation", "Approvals", "Decision approver", "powerPlatform.common.decisionApprover", "Visible approval field is blank."),
  "technical approver": source("foundation", "Approvals", "Technical approver", "powerPlatform.common.technicalApprover", "Visible approval field is blank."),
  "development environment": source("workflows", "Deployment", "Development environment", "powerPlatform.common.developmentEnvironment", "Visible deployment field is blank."),
  "test environment": source("workflows", "Deployment", "Test environment", "powerPlatform.common.testEnvironment", "Visible deployment field is blank."),
  "production environment": source("workflows", "Deployment", "Production environment", "powerPlatform.common.productionEnvironment", "Visible deployment field is blank."),
  "deployment method": source("workflows", "Deployment", "Deployment method", "powerPlatform.common.deploymentMethod", "Visible deployment field is blank."),
  "deployment responsibility": source("workflows", "Deployment", "Deployment responsibility", "powerPlatform.common.deploymentResponsibility", "Visible deployment field is blank."),
  "deployment strategy": source("workflows", "Deployment", "Deployment strategy", "powerPlatform.common.deploymentStrategy", "Visible deployment field is blank."),
  "deployment steps by environment": source("workflows", "Deployment", "Deployment steps by environment", "powerPlatform.common.deploymentStepsByEnvironment", "Visible deployment field is blank."),
  "pipeline requirements": source("workflows", "Deployment", "Pipeline requirements", "powerPlatform.common.pipelineRequirements", "Visible deployment field is blank."),
  "release approval responsibility": source("workflows", "Deployment", "Release approval responsibility", "powerPlatform.common.releaseApprovalResponsibility", "Visible deployment field is blank."),
  "rollback process": source("workflows", "Deployment", "Rollback process", "powerPlatform.common.rollbackProcess", "Visible deployment field is blank."),
  "rollback expectations": source("workflows", "Deployment", "Rollback expectations", "powerPlatform.common.rollbackProcess", "Visible deployment field is blank."),
  "source control approach": source("workflows", "ALM", "Source control approach", "powerPlatform.common.sourceControlApproach", "Visible ALM field is blank."),
  "accessibility testing": source("security", "Testing", "Accessibility testing", "powerPlatform.common.accessibilityTesting", "Visible testing field is blank."),
  "connector testing": source("security", "Testing", "Connector testing", "powerPlatform.common.connectorTesting", "Visible testing field is blank."),
  "deployment testing": source("security", "Testing", "Deployment testing", "powerPlatform.common.deploymentTesting", "Visible testing field is blank."),
  "functional testing": source("security", "Testing", "Functional testing", "powerPlatform.common.functionalTesting", "Visible testing field is blank."),
  "performance testing": source("security", "Testing", "Performance testing", "powerPlatform.common.performanceTesting", "Visible testing field is blank."),
  "permission testing": source("security", "Testing", "Permission testing", "powerPlatform.common.permissionTesting", "Visible testing field is blank.")
};

Object.assign(exactMarkerSources, {
  "project type selection": source("foundation", "Project foundation", "Project type", "project.intake.appType", "Project type is not selected."),
  "project-type-specific requirements": source("foundation", "Project foundation", "Project type", "project.intake.appType", "No project-type-specific intake fields are registered for the selected type."),
  "hosting and deployment model": source("foundation", "Deployment", "Hosting or deployment status", "project.intake.hostingStatus / project.intake.domainStatus / project.intake.targetPlatform", "Deployment model fields are blank."),
  "primary data source": source("data", "Data sources", "Primary data source", "powerPlatform.canvas.primaryDataSourceType", "Primary data source is undecided."),
  "selected Canvas backends": source("data", "Data sources", "Selected Canvas backends", "powerPlatform.canvas.selectedDataSourceTypes", "No selected Canvas backends are complete."),
  "source purpose": source("data", "Data sources", "Source purpose", "powerPlatform.canvas.sourcePurpose", "Visible source-purpose field is blank."),
  "source ownership": source("data", "Data sources", "Source ownership", "powerPlatform.canvas.sourceOwnership", "Visible source-ownership field is blank."),
  "source-of-truth decision": source("data", "Data sources", "Source-of-truth decision", "powerPlatform.canvas.sourceOfTruthDecision", "Visible source-of-truth field is blank."),
  "applicability decision": source("data", "Applicability decisions", "Applicability decision", "powerPlatform.canvas.*ApplicabilityDecision", "Visible applicability decision is missing or incomplete."),
  "file-enabled lists, libraries, or attachment requirements": source("data", "Files and attachments", "File-enabled lists, libraries, or attachment requirements", "powerPlatform.canvas.fileRequirements / powerPlatform.canvas.sharePointLibrarySchemas", "File applicability requires structured file or attachment details."),
  "upload/download requirements": source("data", "Files and attachments", "Upload/download requirements", "powerPlatform.canvas.fileUploadRequirements / powerPlatform.canvas.fileDownloadRequirements", "File applicability requires upload and download details."),
  "file metadata": source("data", "Files and attachments", "File metadata", "powerPlatform.canvas.fileMetadataRequirements", "File applicability requires metadata details."),
  "file permissions": source("security", "Files and attachments", "File permissions", "powerPlatform.canvas.filePermissionRequirements", "File applicability requires permission details."),
  "data-source type": source("data", "Connector assessment", "Data-source type", "powerPlatform.common.connectors[].dataSourceType", "Connector row is missing dataSourceType."),
  "data source type": source("data", "Connector assessment", "Data source type", "powerPlatform.common.connectors[].dataSourceType", "Connector row is missing dataSourceType."),
  "data source name": source("data", "Connector assessment", "Data source name", "powerPlatform.common.connectors[].dataSourceName", "Connector row is missing dataSourceName."),
  "data source": source("data", "Connector assessment", "Data source", "powerPlatform.common.connectors[].dataSourceName", "Connector row is missing data source details."),
  "connector name": source("data", "Connector assessment", "Connector name", "powerPlatform.common.connectors[].displayName", "Connector row is missing displayName."),
  "connector purpose": source("data", "Connector assessment", "Connector purpose", "powerPlatform.common.connectors[].purpose", "Connector row is missing purpose."),
  "purpose": source("features", "Structured row", "Purpose", "project.intake.requiredFeatures", "A generated row is missing purpose."),
  "classification confirmation": source("data", "Connector assessment", "Classification confirmation", "powerPlatform.common.connectors[].classificationConfirmationStatus", "Connector row is missing classification confirmation."),
  "licence requirement": source("foundation", "Licensing", "Licence requirement", "powerPlatform.common.connectors[].licenceRequirement", "Connector row is missing licence requirement."),
  "licensing confirmation": source("foundation", "Licensing", "Licensing confirmation", "powerPlatform.common.connectors[].licensingConfirmationStatus", "Connector row is missing licensing confirmation."),
  "licensing decision": source("foundation", "Licensing", "Licensing decision", "powerPlatform.common.licensingConfirmationStatus", "Licensing decision is missing."),
  "licensing budget constraints": source("foundation", "Licensing", "Licensing budget constraints", "project.intake.constraints", "Licensing constraints are missing."),
  "outstanding licensing decisions": source("foundation", "Licensing", "Outstanding licensing decisions", "powerPlatform.common.licensingConfirmationStatus", "Licensing review is incomplete."),
  "authentication method": source("security", "Connector security", "Authentication method", "powerPlatform.common.connectors[].authenticationMethod", "Connector row is missing authentication method."),
  "gateway requirement": source("workflows", "Connector setup", "Gateway requirement", "powerPlatform.common.connectors[].gatewayRequirement", "Connector row is missing gateway requirement."),
  "environment requirement": source("foundation", "Environment", "Environment requirement", "powerPlatform.common.connectors[].environmentRequirement", "Connector row is missing environment requirement."),
  "DLP impact": source("security", "Connector security", "DLP impact", "powerPlatform.common.connectors[].dlpImpact", "Connector row is missing DLP impact."),
  "connection owner": source("workflows", "Connections", "Connection owner", "powerPlatform.common.connectors[].connectionOwner", "Connector row is missing connection owner."),
  "connection owner role": source("workflows", "Connections", "Connection owner role", "powerPlatform.common.connectors[].connectionOwnerRole", "Connector row is missing connection owner role."),
  "connection ownership status": source("workflows", "Connections", "Connection ownership status", "powerPlatform.common.connectors[].connectionOwnershipStatus", "Connector row is missing connection ownership status."),
  "connection ownership notes": source("workflows", "Connections", "Connection ownership notes", "powerPlatform.common.connectors[].connectionOwnershipNotes", "Connector row is missing connection ownership notes."),
  "approval notes": source("workflows", "Connector approval", "Approval notes", "powerPlatform.common.connectors[].approvalStatus", "Connector row is missing approval notes."),
  "approval status": source("workflows", "Connector approval", "Approval status", "powerPlatform.common.connectors[].approvalStatus", "Connector row is missing approval status."),
  "approval confirmation status": source("workflows", "Connector approval", "Approval confirmation status", "powerPlatform.common.connectors[].approvalConfirmationStatus", "Connector row is missing approval confirmation status."),
  "confirmation status": source("review", "Structured confirmation", "Confirmation status", "powerPlatform.*.confirmationStatus", "A generated structured row is missing confirmation status."),
  "connector selection or explicit no-connector decision": source("data", "Connector assessment", "Connector selection", "powerPlatform.common.connectors", "Connector selection is missing."),
  "external connector": source("data", "Connector assessment", "External connector", "powerPlatform.common.connectors", "External connector row is missing."),
  "connection records": source("workflows", "Connections", "Connection records", "powerPlatform.common.connectors", "Connection records are missing."),
  "connection references": source("workflows", "ALM", "Connection references", "powerPlatform.common.connectionReferences", "Connection reference plan is missing."),
  "solution-aware decision": source("workflows", "ALM", "Solution-aware decision", "powerPlatform.common.solutionName", "Solution-aware ALM decision is missing."),
  "solution name": source("workflows", "ALM", "Solution name", "powerPlatform.common.solutionName", "Solution name is missing."),
  "solution unique name": source("workflows", "ALM", "Solution unique name", "powerPlatform.common.solutionUniqueName", "Solution unique name is missing."),
  "publisher": source("workflows", "ALM", "Publisher", "powerPlatform.common.publisherName", "Publisher is missing."),
  "publisher prefix": source("workflows", "ALM", "Publisher prefix", "powerPlatform.common.publisherPrefix", "Publisher prefix is missing."),
  "environment variables": source("workflows", "ALM", "Environment variables", "powerPlatform.common.environmentVariables", "Environment-variable plan is missing."),
  "list display name": source("data", "SharePoint schema", "List display name", "powerPlatform.canvas.sharePointListSchemas[].displayName", "SharePoint list row is missing displayName."),
  "library display name": source("data", "SharePoint schema", "Library display name", "powerPlatform.canvas.sharePointLibrarySchemas[].displayName", "SharePoint library row is missing displayName."),
  "parent ID": source("data", "Structured schema", "Parent ID", "powerPlatform.canvas.*Schemas[].parentId", "Structured row is missing parentId."),
  "parent type": source("data", "Structured schema", "Parent type", "powerPlatform.canvas.*Schemas[].parentType", "Structured row is missing parentType."),
  "parent list": source("data", "SharePoint schema", "Parent list", "powerPlatform.canvas.sharePointColumnSchemas[].parentId", "SharePoint column row references a missing list."),
  "parent library": source("data", "SharePoint schema", "Parent library", "powerPlatform.canvas.sharePointColumnSchemas[].parentId", "SharePoint column row references a missing library."),
  "parent stable ID": source("data", "Structured schema", "Parent stable ID", "powerPlatform.canvas.*Schemas[].parentId", "Structured row is missing parentId."),
  "owning table": source("data", "Dataverse schema", "Owning table", "powerPlatform.*.dataverseColumnSchemas[].tableId", "Dataverse column row references a missing table."),
  "table stable ID": source("data", "Dataverse schema", "Table stable ID", "powerPlatform.*.dataverseColumnSchemas[].tableId", "Dataverse column row is missing tableId."),
  "table ID": source("data", "Dataverse schema", "Table ID", "powerPlatform.*.dataverseColumnSchemas[].tableId", "Dataverse row is missing tableId."),
  "parent table ID": source("data", "Dataverse schema", "Parent table ID", "powerPlatform.*.dataverseRelationshipSchemas[].parentTableId", "Dataverse relationship row is missing parentTableId."),
  "child table ID": source("data", "Dataverse schema", "Child table ID", "powerPlatform.*.dataverseRelationshipSchemas[].childTableId", "Dataverse relationship row is missing childTableId."),
  "internal name": source("data", "SharePoint schema", "Internal name", "powerPlatform.canvas.sharePointColumnSchemas[].internalName", "SharePoint column row is missing internalName."),
  "column type": source("data", "SharePoint schema", "Column type", "powerPlatform.canvas.sharePointColumnSchemas[].columnType", "SharePoint column row is missing columnType."),
  "choice values": source("data", "SharePoint schema", "Choice values", "powerPlatform.canvas.sharePointColumnSchemas[].choiceValues", "SharePoint column row is missing choice values or explicit not-applicable details."),
  "lookup target or not applicable": source("data", "SharePoint schema", "Lookup target", "powerPlatform.canvas.sharePointColumnSchemas[].lookupList / powerPlatform.canvas.sharePointColumnSchemas[].lookupColumn", "SharePoint column row is missing lookup target or explicit not-applicable details."),
  "person behavior": source("data", "SharePoint schema", "Person field behavior", "powerPlatform.canvas.sharePointColumnSchemas[].personFieldBehavior", "SharePoint column row is missing person-field behavior."),
  "date behavior": source("data", "SharePoint schema", "Date behavior", "powerPlatform.canvas.sharePointColumnSchemas[].dateTimeBehavior", "SharePoint column row is missing date behavior."),
  "versioning expectation": source("data", "SharePoint schema", "Versioning expectation", "powerPlatform.canvas.sharePointListSchemas[].versioning", "SharePoint row is missing versioning expectation."),
  "permission expectation": source("security", "SharePoint permissions", "Permission expectation", "powerPlatform.canvas.sharePointListSchemas[].permissions", "SharePoint row is missing permission expectation."),
  "table display name": source("data", "Dataverse schema", "Table display name", "powerPlatform.*.dataverseTableSchemas[].displayName", "Dataverse table row is missing displayName."),
  "logical name": source("data", "Dataverse schema", "Logical name", "powerPlatform.*.dataverseTableSchemas[].logicalName", "Dataverse row is missing logicalName."),
  "column logical name": source("data", "Dataverse schema", "Column logical name", "powerPlatform.*.dataverseColumnSchemas[].logicalName", "Dataverse column row is missing logicalName."),
  "resource name": source("data", "Connector schema", "Resource name", "powerPlatform.canvas.connectorResourceSchemas[].resourceName", "Connector resource row is missing resourceName."),
  "resource ID": source("data", "Connector schema", "Resource ID", "powerPlatform.canvas.connectorFieldSchemas[].resourceId", "Connector field row is missing resourceId."),
  "field identifier": source("data", "Connector schema", "Field identifier", "powerPlatform.canvas.connectorFieldSchemas[].fieldIdentifier", "Connector field row is missing fieldIdentifier."),
  "read behavior": source("data", "Connector schema", "Read behavior", "powerPlatform.canvas.connectorFieldSchemas[].readBehavior", "Connector field row is missing read behavior."),
  "create behavior": source("features", "Implementation behavior", "Create behavior", "powerPlatform.canvas.createBehavior", "Create behavior is missing."),
  "update behavior": source("features", "Implementation behavior", "Update behavior", "powerPlatform.canvas.updateBehavior", "Update behavior is missing."),
  "delete behavior": source("features", "Implementation behavior", "Delete behavior", "powerPlatform.canvas.deleteRestrictions", "Delete behavior is missing."),
  "archive behavior": source("features", "Implementation behavior", "Archive behavior", "powerPlatform.canvas.archiveBehavior", "Archive behavior is missing."),
  "restore behavior": source("features", "Implementation behavior", "Restore behavior", "powerPlatform.canvas.restoreBehavior", "Restore behavior is missing."),
  "validation requirements": source("features", "Implementation behavior", "Validation requirements", "powerPlatform.canvas.validationRequirements", "Validation requirements are missing."),
  "error handling requirements": source("features", "Implementation behavior", "Error handling requirements", "powerPlatform.canvas.errorHandlingRequirements", "Error handling requirements are missing."),
  "notification requirements": source("workflows", "Notifications", "Notification requirements", "powerPlatform.canvas.notificationRequirements", "Notification requirements are missing."),
  "control operation": source("features", "Canvas implementation targets", "Control operation", "powerPlatform.canvas.controlTargets[].operation", "Control row is missing a controlled operation."),
  "approved control name": source("features", "Canvas implementation targets", "Approved control name", "powerPlatform.canvas.controlTargets[].approvedControlName", "Control row is missing approvedControlName."),
  "control type": source("features", "Canvas implementation targets", "Control type", "powerPlatform.canvas.controlTargets[].controlType", "Control row is missing controlType."),
  "parent screen": source("features", "Canvas implementation targets", "Parent screen", "powerPlatform.canvas.controlTargets[].screenId", "Control row is missing screenId."),
  "operation": source("features", "Canvas implementation targets", "Operation", "powerPlatform.canvas.controlTargets[].operation", "Control row is missing operation."),
  "accessibility requirement": source("users", "Accessibility", "Accessibility requirement", "project.intake.accessibilityNotes / powerPlatform.common.accessibilityRequirements", "Accessibility requirement is missing."),
  "display-mode requirement": source("features", "Canvas implementation targets", "Display-mode requirement", "powerPlatform.canvas.controlTargets[].displayModeRequirement", "Control row is missing display-mode requirement."),
  "loading states": source("features", "Canvas states", "Loading states", "powerPlatform.canvas.loadingStates", "Loading-state requirements are missing."),
  "empty states": source("features", "Canvas states", "Empty states", "powerPlatform.canvas.emptyStates", "Empty-state requirements are missing."),
  "error states": source("features", "Canvas states", "Error states", "powerPlatform.canvas.errorStates", "Error-state requirements are missing."),
  "responsive rules": source("features", "Canvas layout", "Responsive rules", "powerPlatform.canvas.responsiveRules", "Responsive rules are missing."),
  "visibility rules": source("security", "Canvas visibility", "Visibility rules", "powerPlatform.canvas.visibilityRules", "Visibility rules are missing."),
  "display mode rules": source("features", "Canvas controls", "Display mode rules", "powerPlatform.canvas.displayModeRules", "Display mode rules are missing."),
  "Canvas screens": source("features", "Canvas screens", "Screens", "project.intake.screens / powerPlatform.canvas.screenTargets", "Canvas screen inventory is missing."),
  "YAML screen targets": source("features", "Canvas YAML", "YAML screen targets", "powerPlatform.canvas.screenTargets", "YAML screen targets are missing."),
  "YAML requirements": source("features", "Canvas YAML", "YAML requirements", "powerPlatform.canvas.fullScreenYamlRequired", "YAML requirements are missing."),
  "full-screen YAML decision": source("features", "Canvas YAML", "Full-screen YAML decision", "powerPlatform.canvas.fullScreenYamlRequired", "Full-screen YAML decision is missing."),
  "control-level YAML decision": source("features", "Canvas YAML", "Control-level YAML decision", "powerPlatform.canvas.controlLevelYamlRequired", "Control-level YAML decision is missing."),
  "container YAML decision": source("features", "Canvas YAML", "Container YAML decision", "powerPlatform.canvas.containerYamlRequired", "Container YAML decision is missing."),
  "component YAML decision": source("features", "Canvas YAML", "Component YAML decision", "powerPlatform.canvas.componentYamlRequired", "Component YAML decision is missing."),
  ".pa.yaml source decision": source("features", "Canvas YAML", ".pa.yaml source decision", "powerPlatform.canvas.paYamlSourceRequired", ".pa.yaml source decision is missing."),
  "expected installation method": source("workflows", "Canvas YAML", "Expected installation method", "powerPlatform.canvas.expectedInstallationMethod", "Expected installation method is missing."),
  "code-view paste method": source("workflows", "Canvas YAML", "Code-view paste method", "powerPlatform.canvas.codeViewPasteMethod", "Code-view paste method is missing."),
  "existing source availability": source("workflows", "Canvas YAML", "Existing source availability", "powerPlatform.canvas.existingSourceAvailability", "Existing source availability is missing."),
  "existing app dependencies": source("workflows", "Canvas YAML", "Existing app dependencies", "powerPlatform.canvas.existingAppDependencies", "Existing app dependencies are missing."),
  "post-paste actions": source("workflows", "Canvas YAML", "Post-paste actions", "powerPlatform.canvas.postPasteActions", "Post-paste actions are missing."),
  "validation responsibility": source("workflows", "Canvas YAML", "Validation responsibility", "powerPlatform.canvas.validationResponsibility", "Validation responsibility is missing."),
  "named formula requirements": source("features", "Canvas formulas", "Named formula requirements", "powerPlatform.canvas.namedFormulaRequirements", "Named formula requirements are missing."),
  "global variable requirements": source("features", "Canvas state", "Global variable requirements", "powerPlatform.canvas.globalVariableRequirements", "Global variable requirements are missing."),
  "context variable requirements": source("features", "Canvas state", "Context variable requirements", "powerPlatform.canvas.contextVariableRequirements", "Context variable requirements are missing."),
  "collection requirements": source("features", "Canvas collections", "Collection requirements", "powerPlatform.canvas.collectionRequirements", "Collection requirements are missing."),
  "search requirements": source("features", "Search", "Search requirements", "powerPlatform.canvas.searchRequirements", "Search requirements are missing."),
  "filtering requirements": source("features", "Filtering", "Filtering requirements", "powerPlatform.canvas.filteringRequirements", "Filtering requirements are missing."),
  "sorting requirements": source("features", "Sorting", "Sorting requirements", "powerPlatform.canvas.sortingRequirements", "Sorting requirements are missing."),
  "concurrent update handling": source("features", "Implementation behavior", "Concurrent update handling", "powerPlatform.canvas.concurrentUpdateHandling", "Concurrent update handling is missing."),
  "delegation requirements": source("data", "Delegation", "Delegation requirements", "powerPlatform.canvas.delegationRequirements", "Delegation requirements are missing."),
  "offline requirements": source("workflows", "Offline behavior", "Offline requirements", "powerPlatform.canvas.offlineRequirements", "Offline requirements are missing."),
  "synchronization requirements": source("workflows", "Synchronization", "Synchronization requirements", "powerPlatform.canvas.synchronizationRequirements", "Synchronization requirements are missing."),
  "connector delegation assessment": source("data", "Delegation", "Connector delegation assessment", "powerPlatform.common.connectors", "Connector delegation assessment is missing."),
  "connector limitations": source("data", "Delegation", "Connector limitations", "powerPlatform.common.connectors[].limitations", "Connector limitations are missing."),
  "expected record volume": source("data", "Delegation", "Expected record volume", "powerPlatform.common.connectors[].expectedRecordVolume", "Connector expected record volume is missing.")
});

Object.assign(exactMarkerSources, {
  "empty-state behavior per screen": source("features", "Screen behavior", "Empty-state behavior", "powerPlatform.canvas.emptyStates", "Empty-state behavior is missing."),
  "brand status": source("features", "Branding", "Brand status", "project.intake.brandStatus", "Brand status is missing."),
  "logo status": source("features", "Branding", "Logo status", "project.intake.logoStatus", "Logo status is missing."),
  "logo files": source("features", "Branding", "Logo files", "project.intake.logoFiles", "Logo file decision is missing."),
  "primary colours": source("features", "Branding", "Primary colours", "project.intake.primaryColors", "Primary colour guidance is missing."),
  "secondary colours": source("features", "Branding", "Secondary colours", "project.intake.secondaryColors", "Secondary colour guidance is missing."),
  "font preferences": source("features", "Branding", "Font preferences", "project.intake.fontPreferences", "Font preference guidance is missing."),
  "brand tone": source("features", "Branding", "Brand tone", "project.intake.brandTone", "Brand tone is missing."),
  "image style": source("features", "Branding", "Image style", "project.intake.imageStyle", "Image style is missing."),
  "icon style": source("features", "Branding", "Icon style", "project.intake.iconStyle", "Icon style is missing."),
  "reference sites": source("features", "Branding", "Reference sites", "project.intake.referenceSites", "Reference sites are missing."),
  "brand restrictions": source("features", "Branding", "Brand restrictions", "project.intake.brandRestrictions", "Brand restrictions are missing."),
  "favicon decision": source("features", "Branding", "Favicon needed", "project.intake.faviconNeeded", "Favicon decision is missing."),
  "Open Graph image decision": source("features", "Branding", "Open Graph image needed", "project.intake.openGraphImageNeeded", "Open Graph image decision is missing."),
  "social asset decision": source("features", "Branding", "Social assets needed", "project.intake.socialAssetsNeeded", "Social asset decision is missing."),
  "content source": source("features", "Branding", "Content source", "project.intake.contentSource", "Content source is missing."),
  "approved assets": source("features", "Branding", "Approved assets", "project.intake.approvedAssets", "Approved asset list is missing."),
  "open deployment decisions or explicit none": source("workflows", "Deployment", "Open deployment decisions", "project.intake.constraints / powerPlatform.common.deploymentStrategy", "Open deployment decisions are missing."),
  "validation rules": source("features", "Implementation behavior", "Validation rules", "powerPlatform.canvas.validationRequirements", "Validation rules are missing."),
  "update and view behavior": source("features", "Implementation behavior", "Update and view behavior", "powerPlatform.canvas.updateBehavior / powerPlatform.canvas.readBehavior", "Update and view behavior is missing."),
  "concurrency rules": source("features", "Implementation behavior", "Concurrency rules", "powerPlatform.canvas.concurrentUpdateHandling", "Concurrency rules are missing."),
  "role-based interface targets": source("security", "Role visibility", "Role-based interface targets", "project.intake.roleAccessNotes / powerPlatform.canvas.visibilityRules", "Role-based interface targets are missing."),
  "app formula requirements": source("features", "Canvas formulas", "App formula requirements", "powerPlatform.canvas.appFormulaRequirements", "App formula requirements are missing."),
  "StartScreen requirements": source("features", "Canvas formulas", "StartScreen requirements", "powerPlatform.canvas.startScreenRequirements", "StartScreen requirements are missing."),
  "OnStart requirements": source("features", "Canvas formulas", "OnStart requirements", "powerPlatform.canvas.onStartRequirements", "OnStart requirements are missing."),
  "delete restrictions": source("features", "Implementation behavior", "Delete restrictions", "powerPlatform.canvas.deleteRestrictions", "Delete restrictions are missing."),
  "containers": source("features", "Canvas controls", "Containers", "powerPlatform.canvas.containers", "Container inventory is missing."),
  "components": source("features", "Canvas controls", "Components", "powerPlatform.canvas.components", "Component inventory is missing."),
  "galleries": source("features", "Canvas controls", "Galleries", "powerPlatform.canvas.galleries", "Gallery inventory is missing."),
  "forms": source("features", "Canvas controls", "Forms", "powerPlatform.canvas.forms", "Form inventory is missing."),
  "tables": source("features", "Canvas controls", "Tables", "powerPlatform.canvas.tables", "Table control inventory is missing."),
  "dialogs": source("features", "Canvas controls", "Dialogs", "powerPlatform.canvas.dialogs", "Dialog inventory is missing."),
  "supported browsers": source("foundation", "Canvas app settings", "Supported browsers", "powerPlatform.canvas.supportedBrowsers", "Supported browsers are missing."),
  "Teams embedding": source("foundation", "Canvas app settings", "Teams embedding", "powerPlatform.canvas.teamsEmbedding", "Teams embedding decision is missing."),
  "component library requirement": source("features", "Canvas components", "Component library requirement", "powerPlatform.canvas.componentLibraryRequirement", "Component library requirement is missing.")
});

function source(
  stageId: string,
  subsection: string,
  fieldLabel: string,
  storedProperty: string,
  reasonRejected: string,
  requiredStatus?: string
): (project: ProjectRecord) => TraceSource {
  const stageLabel = INTAKE_STAGES.find((stage) => stage.id === stageId)?.label ?? "Guided Intake";
  return (project) => ({
    stageId,
    stageLabel,
    subsection,
    fieldLabel,
    storedProperty,
    reasonRejected: reasonForSource(project, storedProperty, reasonRejected),
    requiredStatus
  });
}

function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeMarker(marker: string): string {
  return marker.trim().replace(/\s+/g, " ");
}

function sourceValue(project: ProjectRecord, storedProperty: string): unknown {
  const firstProperty = storedProperty.split(/\s*\/\s*/)[0];
  const normalizedPath = firstProperty.replace(/\[\]/g, "");
  if (!normalizedPath || normalizedPath === "unregistered") return undefined;
  let value: unknown = project;
  for (const segment of normalizedPath.split(".")) {
    if (!segment || segment === "*") return undefined;
    if (typeof value !== "object" || value === null) return undefined;
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
}

function reasonForSource(project: ProjectRecord, storedProperty: string, fallback: string): string {
  const value = sourceValue(project, storedProperty);
  if (typeof value === "string" && value.trim().length === 0) return `${fallback} Current stored value is blank.`;
  if (typeof value === "string") return `${fallback} Current stored value is present but the related structured gate is not complete.`;
  if (Array.isArray(value) && value.length === 0) return `${fallback} Current structured collection has no rows.`;
  if (Array.isArray(value)) return `${fallback} Current structured collection has ${value.length} row(s), with one or more incomplete required properties.`;
  return fallback;
}

const dynamicMarkerSources: DynamicMarkerRegistration[] = [
  {
    pattern: /^.+ confirmation source$/,
    source: (marker, project) => source(
      "data",
      "Structured confirmation",
      "Confirmation source",
      "powerPlatform.*.confirmationSource",
      `Structured row "${marker}" is missing a required confirmation source.`
    )(project)
  },
  {
    pattern: /^.+ confirmation status$/,
    source: (marker, project) => source(
      "data",
      "Structured confirmation",
      "Confirmation status",
      "powerPlatform.*.confirmationStatus",
      `Structured row "${marker}" is missing a required confirmation status.`
    )(project)
  },
  {
    pattern: /^SharePoint internal column name for .+$/,
    source: (marker, project) => source(
      "data",
      "SharePoint schema",
      "Internal name",
      "powerPlatform.canvas.sharePointColumnSchemas[].internalName",
      `SharePoint column row "${marker}" is missing the required internalName property.`
    )(project)
  },
  {
    pattern: /^.+ logical name$/,
    source: (marker, project) => source(
      "data",
      "Dataverse schema",
      "Logical name",
      "powerPlatform.*.dataverse*Schemas[].logicalName",
      `Dataverse row "${marker}" is missing a required logical-name property.`
    )(project)
  },
  {
    pattern: /^.+ not-applicable reason$/,
    source: (marker, project) => source(
      "data",
      "Applicability decisions",
      "Not-applicable reason",
      "powerPlatform.*ApplicabilityDecision.notApplicableReason",
      `Applicability decision "${marker}" is Not Applicable without a recorded reason.`
    )(project)
  }
];

function orphanSource(): TraceSource {
  return {
    stageId: "review",
    stageLabel: "Review",
    subsection: "Generated marker",
    fieldLabel: "Unregistered marker",
    storedProperty: "unregistered",
    reasonRejected: "No explicit traceability registration exists for this marker.",
    requiredStatus: "Register this marker source or remove the generated marker."
  };
}

function markerSource(project: ProjectRecord, marker: string): TraceSource {
  const normalized = normalizeMarker(marker);
  const exactSource = exactMarkerSources[normalized];
  if (exactSource) return exactSource(project);
  const dynamicSource = dynamicMarkerSources.find((registration) => registration.pattern.test(normalized));
  return dynamicSource ? dynamicSource.source(normalized, project) : orphanSource();
}

export function isCanvasFileNotApplicable(project: ProjectRecord): boolean {
  const decision = project.powerPlatform?.canvas?.fileApplicabilityDecision;
  return decision?.status === "notApplicable"
    && decision.confirmationStatus === "confirmed"
    && hasText(decision.notApplicableReason);
}

export function effectiveCanvasExpectedRecordCounts(project: ProjectRecord): EffectiveCanvasValue {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return { value: "", source: "none", contradictions: [] };
  const structuredRows = [
    ...canvas.sharePointListSchemas.map((list) => ({
      label: list.displayName || list.id,
      count: list.expectedRecordCount,
      status: list.confirmationStatus,
      source: list.confirmationSource
    })),
    ...canvas.dataverseTableSchemas.map((table) => ({
      label: table.displayName || table.logicalName || table.id,
      count: table.expectedRecordCount,
      status: table.confirmationStatus,
      source: table.confirmationSource
    }))
  ].filter((row) => hasText(row.count));
  const general = canvas.expectedRecordCounts.trim();
  if (structuredRows.length === 0) {
    return { value: general, source: general ? "general-summary" : "missing", contradictions: [] };
  }
  const structuredSummary = structuredRows
    .map((row) => `${row.label}: ${row.count} (status: ${row.status}; source: ${row.source || "missing confirmation source"})`)
    .join("\n");
  const contradictions = general && !structuredRows.every((row) => general.includes(row.count.trim()))
    ? ["General expected-record-count summary differs from one or more structured entity counts; structured rows take precedence."]
    : [];
  return { value: structuredSummary, source: "structured-entities", contradictions };
}

export function confirmedCanvasControls(project: ProjectRecord): CanvasControlTarget[] {
  return (project.powerPlatform?.canvas?.controlTargets ?? [])
    .filter((control) =>
      control.confirmationStatus === "confirmed"
      && hasText(control.id)
      && hasText(control.approvedControlName)
      && hasText(control.controlType)
      && hasText(control.screenId)
    );
}

export function saveCancelCanvasAssets(project: ProjectRecord): string[] {
  const controls = confirmedCanvasControls(project);
  const formSubmitIds = new Set((project.powerPlatform?.canvas?.formOperationTargets ?? [])
    .filter((target) => target.confirmationStatus === "confirmed")
    .map((target) => target.submitControlId));
  const saveControls = controls.filter((control) => {
    const operation = control.operation.trim().toLowerCase();
    return formSubmitIds.has(control.id) || operation === "save" || operation === "submit";
  });
  const cancelControls = controls.filter((control) => {
    const operation = control.operation.trim().toLowerCase();
    return operation === "cancel";
  });
  if (saveControls.length === 0 || cancelControls.length === 0) return [];
  return [...saveControls, ...cancelControls]
    .map((control) => `${control.id}: ${control.approvedControlName} (${control.controlType}) on ${control.screenId}; operation: ${control.operation || "not specified"}; source: ${control.confirmationSource || "missing confirmation source"}`);
}

export function selectedRecordStateAssets(project: ProjectRecord): CanvasStateVariableTarget[] {
  const validation = validateCanvasStateVariables(project.powerPlatform?.canvas?.stateVariableTargets ?? []);
  return validation.includedVariables.filter((variable) => variable.stateRole === "selectedRecord");
}

export function stateVariableSummary(variable: CanvasStateVariableTarget): string {
  return `${variable.id}: ${variable.implementationName}; role: ${variable.stateRole || "missing role"}; purpose: ${variable.purpose || "missing purpose"}; initial value: ${variable.initialValue.kind}; required: ${variable.required ? "yes" : "no"}; status: ${variable.confirmationStatus}; order: ${variable.sortOrder}`;
}

export function extractMissingMarkers(content: string): string[] {
  return [...content.matchAll(/\[MISSING:\s*([^\]]+)]/g)].map((match) => normalizeMarker(match[1]));
}

export function traceMissingMarkers(project: ProjectRecord, documents: GeneratedDocument[] = project.generatedDocuments): MissingMarkerTrace[] {
  return documents.flatMap((document) =>
    extractMissingMarkers(document.content).map((marker, occurrence) => {
      const sourceDetails = markerSource(project, marker);
      const orphan = sourceDetails.storedProperty === "unregistered";
      return {
        document: document.fileName,
        marker,
        occurrence,
        ...sourceDetails,
        orphan
      };
    })
  );
}

export function orphanMissingMarkers(project: ProjectRecord, documents: GeneratedDocument[] = project.generatedDocuments): MissingMarkerTrace[] {
  return traceMissingMarkers(project, documents).filter((trace) => trace.orphan);
}

export function traceabilitySummary(project: ProjectRecord, documents: GeneratedDocument[] = project.generatedDocuments): string {
  const traces = traceMissingMarkers(project, documents);
  const orphanCount = traces.filter((trace) => trace.orphan).length;
  const markerCount = documents.reduce((total, document) => total + extractMissingMarkers(document.content).length, 0);
  return `${markerCount} marker(s), ${traces.length - orphanCount} traceable, ${orphanCount} orphan.`;
}

export function statusLabel(status: PowerPlatformDecisionStatus | string | undefined): string {
  if (!status) return "Missing information";
  return status.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
