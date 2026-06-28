import {
  formatDate,
  listOrMissing,
  markdownList,
  markdownTable,
  missingMarker,
  safeText,
  sectionOrMissing
} from "../../lib/documentHelpers";
import type { ProjectRecord } from "../../types/project";

const join = (...parts: string[]) => parts.join("\n\n");

function header(project: ProjectRecord): string {
  return [
    `**Project:** ${safeText(project.identity.projectName, "app name")}`,
    `**Client:** ${safeText(project.client.clientName, "client name")}`,
    `**Business or department:** ${safeText(project.client.businessName, "business or department")}`,
    `**App type:** ${safeText(project.intake.appType, "app type")}`,
    `**Target platform:** ${safeText(project.intake.targetPlatform, "target platform")}`,
    `**Status:** ${project.status}`
  ].join("  \n");
}

function missingSummary(project: ProjectRecord): string {
  const count = project.outstandingQuestions.length;
  if (count === 0) return "No missing markers are currently identified from intake fields.";
  return `${count} intake field${count === 1 ? " is" : "s are"} currently missing and marked explicitly in this package.`;
}

function generatedFilesList(): string {
  return markdownList([
    "README.md",
    "PROJECT_SCOPE.md",
    "CLIENT_REQUIREMENTS.md",
    "ARCHITECT_INSTRUCTIONS.md",
    "CODEX_INSTRUCTIONS.md",
    "APP_BLUEPRINT.md",
    "DATA_MODEL.md",
    "SCREEN_MAP.md",
    "WORKFLOW_MAP.md",
    "SECURITY_MODEL.md",
    "ACCEPTANCE_CRITERIA.md",
    "TEST_PLAN.md",
    "DEPLOYMENT_NOTES.md",
    "CHANGE_LOG.md",
    "NEXT_STEPS.md",
    "PHASED_CODEX_PROMPTS.md"
  ]);
}

function folderStructure(): string {
  return [
    "```text",
    "/project-name/",
    "  00_Project_Overview/",
    "  01_Requirements/",
    "  02_Architecture/",
    "  03_Data_Model/",
    "  04_UI_UX/",
    "  05_Workflows/",
    "  06_Security/",
    "  07_Development/",
    "  08_Testing/",
    "  09_Deployment/",
    "  10_Documentation/",
    "  11_Codex_Prompts/",
    "```"
  ].join("\n");
}

const readme = (project: ProjectRecord) => join(
  `# ${safeText(project.identity.projectName, "app name")}`,
  header(project),
  sectionOrMissing("Project purpose", project.intake.appPurpose, "app purpose"),
  sectionOrMissing("Problem being solved", project.intake.problemStatement, "problem being solved"),
  `## Target users\n\n${listOrMissing(project.intake.targetUsers, "target users")}`,
  `## Generated package contents\n\n${generatedFilesList()}`,
  `## Folder structure\n\n${folderStructure()}`,
  "## How GPT Architect should use this package\n\n1. Validate scope boundaries and assumptions.\n2. Resolve every missing marker before approvals.\n3. Produce phased Codex prompts aligned with accepted requirements.",
  "## How Codex Developer should use this package\n\n1. Build only what is approved in these documents.\n2. Do not guess beyond accepted scope.\n3. Report missing decisions using exact missing-decision markers.",
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
  `## Target users\n\n${listOrMissing(project.intake.targetUsers, "target users")}`,
  `## User roles\n\n${listOrMissing(project.intake.userRoles, "user roles")}`,
  sectionOrMissing("Target platform", project.intake.targetPlatform, "target platform"),
  sectionOrMissing("App type", project.intake.appType, "app type"),
  `## Constraints\n\n${listOrMissing(project.intake.constraints, "constraints")}`,
  `## Risks\n\n${listOrMissing(project.intake.risks, "risks")}`,
  `## Assumptions\n\n${listOrMissing(project.intake.assumptions, "assumptions")}`,
  `## Success criteria\n\n${listOrMissing(project.intake.successCriteria, "success criteria")}`,
  "## Approved boundaries\n\n- Keep local persistence, no backend, no authentication, no import, and no external AI calls unless explicitly approved.\n- GPT Project Builder prepares the client project package and does not build the final client app directly.",
  `## Missing scope decisions\n\n${missingSummary(project)}`
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
  sectionOrMissing("App type", project.intake.appType, "app type"),
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
  "## Architecture boundaries\n\nThis blueprint supports websites, web apps, mobile apps, software tools, internal systems, portals, dashboards, games, and other digital products. It does not force a single app pattern.",
  `## Build assumptions\n\n${listOrMissing(project.intake.assumptions, "assumptions")}`,
  `## Future decisions\n\n- ${missingMarker("hosting and deployment model")}`
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
  `## Empty states\n\n- ${missingMarker("empty-state behavior per screen")}`,
  `## Validation states\n\n- ${missingMarker("validation-state behavior per screen")}`,
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

const securityModel = (project: ProjectRecord) => join(
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
  `## Risks\n\n${listOrMissing(project.intake.risks, "risks")}`,
  `## Assumptions\n\n${listOrMissing(project.intake.assumptions, "assumptions")}`,
  "## Blocked assumptions\n\n- Do not assume authentication, backend services, external AI calls, or import features without explicit approval.",
  `## Missing security decisions\n\n${missingSummary(project)}`
);

const acceptanceCriteria = (project: ProjectRecord) => join(
  "# Acceptance Criteria",
  header(project),
  `## Project-level acceptance criteria\n\n${listOrMissing(project.intake.successCriteria, "success criteria")}`,
  `## Feature-level acceptance criteria\n\n${listOrMissing(project.intake.acceptanceNotes || project.intake.requiredFeatures, "feature acceptance criteria")}`,
  `## Workflow acceptance criteria\n\n${listOrMissing(project.intake.workflowOutcome || project.intake.workflows, "workflow acceptance criteria")}`,
  `## Data acceptance criteria\n\n${markdownList([
    safeText(project.intake.requiredDataFields, "required data fields"),
    safeText(project.intake.keyFields, "key fields"),
    safeText(project.intake.fieldTypes, "field types")
  ])}`,
  `## Security acceptance criteria\n\n${markdownList([
    safeText(project.intake.permissionRules || project.intake.permissions, "permission rules"),
    safeText(project.intake.sensitiveDataNotes, "sensitive data notes"),
    safeText(project.intake.dataProtectionExpectations, "data protection expectations")
  ])}`,
  `## Accessibility acceptance criteria\n\n${listOrMissing(project.intake.accessibilityNotes, "accessibility notes")}`,
  "## Testing acceptance criteria\n\n- Unit tests cover validation and generation logic.\n- Integration tests cover active-project persistence and workflow behavior.\n- Manual checks cover accessibility and export reliability.",
  "## Export or deployment acceptance criteria\n\n- Generated package contains all 16 required files.\n- ZIP structure matches approved folders.\n- Missing markers remain visible in exported markdown."
);

const testPlan = (project: ProjectRecord) => join(
  "# Test Plan",
  header(project),
  "## Test scope\n\nValidation, generation, persistence, document preview, and export behavior for the active project.",
  "## Unit test targets\n\n- Validation rules by stage\n- Document helper functions\n- File mapping and sanitization",
  "## Integration test targets\n\n- Active project generation and persistence\n- Intake edit behavior versus generated documents\n- Document preview and export behavior",
  `## Manual test checklist\n\n${markdownList([
    "Generate package and verify all 16 files exist",
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
  "## Known gaps\n\n- [MISSING: deployment environment details]\n- [MISSING: production secrets and configuration decisions]"
);

const deploymentNotes = (project: ProjectRecord) => join(
  "# Deployment Notes",
  header(project),
  sectionOrMissing("Target platform", project.intake.targetPlatform, "target platform"),
  `## Environment assumptions\n\n${listOrMissing(project.intake.assumptions, "environment assumptions")}`,
  "## Build commands\n\n- npm.cmd test\n- npm.cmd run build\n- npm.cmd audit",
  `## Deployment steps\n\n- ${missingMarker("deployment steps by environment")}`,
  `## Required secrets or configuration\n\n- ${missingMarker("required secrets and environment variables")}`,
  `## Security notes\n\n${listOrMissing(project.intake.dataProtectionExpectations, "data protection expectations")}`,
  "## Rollback notes\n\n- [MISSING: rollback process]\n- [MISSING: incident communication owner]",
  "## Open deployment decisions\n\n- [MISSING: approved hosting environment]\n- [MISSING: release approval workflow]"
);

const architectInstructions = (project: ProjectRecord) => join(
  "# Architect Instructions",
  header(project),
  sectionOrMissing("Project purpose", project.intake.appPurpose, "app purpose"),
  sectionOrMissing("App type", project.intake.appType, "app type"),
  sectionOrMissing("Target platform", project.intake.targetPlatform, "target platform"),
  `## User roles\n\n${listOrMissing(project.intake.userRoles, "user roles")}`,
  `## Data sources\n\n${listOrMissing(project.intake.dataSources, "data sources")}`,
  "## Architecture rules\n\n- Keep boundaries explicit between data, workflows, security, UI, and generation.\n- Avoid assumptions not present in intake or approved decisions.\n- Preserve deterministic output and missing-marker visibility.",
  "## Naming standards\n\nUse stable names from intake for projects, roles, features, screens, workflows, and entities.",
  "## Documentation standards\n\nEvery decision must be documented and contradictory statements must be resolved before handoff.",
  "## Accessibility expectations\n\nAccessibility requirements are mandatory and must be traceable to acceptance criteria.",
  "## Security expectations\n\nEnforce least privilege, sensitive-data handling notes, and explicit risk tracking.",
  "## Testing expectations\n\nDefine unit, integration, and manual verification requirements before Codex implementation starts.",
  "## Review process\n\n1. Resolve missing markers.\n2. Validate cross-document consistency.\n3. Approve phased implementation order.\n4. Mark package ready for Codex.",
  "## Allowed assumptions\n\n- Formatting or wording improvements that do not change scope.",
  "## Blocked assumptions\n\n- Backend, authentication, import, external AI calls, or architecture replacement without approval.",
  "## How GPT creates Codex prompts\n\nCreate phased, scoped prompts with objective, files, constraints, acceptance criteria, testing, and reporting.",
  "## How GPT reviews Codex output\n\nReview for scope compliance, requirement coverage, security/accessibility impact, and test evidence."
);

const codexInstructions = (project: ProjectRecord) => join(
  "# Codex Instructions",
  header(project),
  "## What to build\n\nBuild the approved client project package implementation defined by these generated documents.",
  "## Files to create\n\nCreate files required by the active phase prompt and no extra major features.",
  "## Files to update\n\nUpdate only files required by approved scope changes.",
  "## Coding standards\n\n- Clear naming and modular boundaries\n- Reusable components\n- No dead code\n- Deterministic outputs",
  `## Folder structure expectations\n\n${folderStructure()}`,
  "## Implementation phases\n\nExecute PHASED_CODEX_PROMPTS.md in order unless Architect explicitly reorders.",
  "## Testing requirements\n\nRun tests and build after each phase-relevant change set.",
  "## Accessibility requirements\n\nSemantic headings, labels, keyboard support, contrast, and clear validation states are required.",
  "## Security requirements\n\nSanitize names, avoid raw HTML injection, and keep secrets out of source.",
  "## Documentation requirements\n\nUpdate README, change log, next steps, and test plan when behavior changes.",
  "## Expected response format after each task\n\nSummary, files created/updated/removed, tests, issues, scope questions, and next step.",
  "## Missing decision rule\n\nUse: [MISSING DECISION: explain what is missing and why it matters].",
  "## Scope boundary rule\n\nDo not implement outside approved scope. Do not guess unapproved architecture or features."
);

const phasedPrompts = (project: ProjectRecord) => {
  const phases = [
    ["Project setup", "Create baseline project structure and shared configuration."],
    ["Data model", "Implement entities, fields, and validation constraints."],
    ["Intake or core workflow", "Implement intake or core business workflow behavior."],
    ["UI and screens", "Build or harden user-facing screens and navigation."],
    ["Business logic", "Implement service logic, rules, and orchestration."],
    ["Security and permissions", "Apply permission and sensitive-data handling rules."],
    ["Export, reports, or integrations", "Implement export/report/integration behavior in scope."],
    ["Review, testing, and deployment", "Finalize tests, review, and deployment readiness."]
  ] as const;

  return join(
    "# Phased Codex Prompts",
    header(project),
    ...phases.map(([name, objective], index) => join(
      `## Phase ${index + 1}: ${name}`,
      `### Objective\n${objective}`,
      "### Files to create or update\n- [MISSING: phase-specific files to create or update]",
      "### Exact requirements\n- Follow approved scope documents\n- Keep missing markers visible\n- Preserve active-project behavior",
      `### Constraints\n${listOrMissing(project.intake.constraints, "constraints")}`,
      `### Acceptance criteria\n${listOrMissing(project.intake.successCriteria, "success criteria")}`,
      "### Testing instructions\n- Add or update tests for changed behavior\n- Run npm.cmd test and npm.cmd run build",
      "### Reporting instructions\n- Report summary, changed files, testing, issues, scope questions, and next step"
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
  "- Generated files: 16",
  `- Missing information count: ${project.outstandingQuestions.length}`,
  `- Known gaps: ${missingSummary(project)}`,
  "- Next review action: Architect resolves missing decisions and confirms phased implementation order."
);

const nextSteps = (project: ProjectRecord) => join(
  "# Next Steps",
  header(project),
  "## Immediate next action\n\nArchitect reviews this package and resolves missing decisions.",
  "## Architect review tasks\n\n- Validate scope and boundaries\n- Resolve contradictions\n- Approve phased prompts",
  `## Client questions to resolve\n\n${missingSummary(project)}`,
  "## Codex readiness checklist\n\n- Scope approved\n- Missing decisions resolved or explicitly deferred\n- Acceptance criteria testable\n- Security and accessibility expectations documented",
  "## Recommended first Codex phase\n\nPhase 1: Project setup",
  "## Blockers\n\n- [MISSING: unresolved blockers]",
  "## Non-blocking improvements\n\n- Improve optional reporting and branding detail coverage after core scope approval."
);

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
  "PHASED_CODEX_PROMPTS.md": phasedPrompts
};

export const REQUIRED_DOCUMENT_TEMPLATE_KEYS = Object.keys(documentTemplates);

export function documentTemplatePreviewTable(project: ProjectRecord): string {
  return markdownTable(
    ["Document", "Status"],
    REQUIRED_DOCUMENT_TEMPLATE_KEYS.map((fileName) => [fileName, project.status])
  );
}
