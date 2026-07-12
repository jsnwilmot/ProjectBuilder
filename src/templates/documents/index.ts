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
import { GENERATED_FILES } from "../../data/generatedFiles";
import { PACKAGE_USAGE_STEPS } from "../../data/packageGuidance";
import { getProjectTypeFields, getProjectTypeLabel, getProjectTypePreset } from "../../data/projectTypes";
import { getClientReviewReadiness, groupClientQuestions } from "../../lib/clientReview";
import type { ProjectRecord } from "../../types/project";

const join = (...parts: string[]) => parts.join("\n\n");

function header(project: ProjectRecord): string {
  return [
    `**Project:** ${safeText(project.identity.projectName, "app name")}`,
    `**Client:** ${safeText(project.client.clientName, "client name")}`,
    `**Business or department:** ${safeText(project.client.businessName, "business or department")}`,
    `**Project type:** ${safeText(getProjectTypeLabel(project.intake.appType), "project type")}`,
    `**Target platform:** ${safeText(project.intake.targetPlatform, "target platform")}`,
    `**Status:** ${project.status}`
  ].join("  \n");
}

function missingSummary(project: ProjectRecord): string {
  const count = getClientReviewReadiness(project).unresolvedItems.length;
  if (count === 0) return "No unresolved client review items are currently identified.";
  return `${count} client review item${count === 1 ? " is" : "s are"} unresolved and represented in this package.`;
}

function generatedFilesList(): string {
  return markdownList([...GENERATED_FILES]);
}

function packageReadiness(project: ProjectRecord): string {
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
    .map((field) => `- **${field.label}:** ${safeText(String(project.intake[field.name as keyof typeof project.intake] ?? ""), field.label.toLowerCase())}`)
    .join("\n");
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
  `## Generated package contents\n\n${generatedFilesList()}`,
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
  `## Target users\n\n${listOrMissing(project.intake.targetUsers, "target users")}`,
  `## User roles\n\n${listOrMissing(project.intake.userRoles, "user roles")}`,
  sectionOrMissing("Target platform", project.intake.targetPlatform, "target platform"),
  sectionOrMissing("Project type", getProjectTypeLabel(project.intake.appType), "project type"),
  `## Constraints\n\n${listOrMissing(project.intake.constraints, "constraints")}`,
  `## Risks\n\n${listOrMissing(project.intake.risks, "risks")}`,
  `## Assumptions\n\n${listOrMissing(project.intake.assumptions, "assumptions")}`,
  `## Success criteria\n\n${listOrMissing(project.intake.successCriteria, "success criteria")}`,
  "## Approved boundaries\n\n- Keep local persistence, no backend, no authentication, no import, and no external AI calls unless explicitly approved.\n- GPT Project Builder prepares the client project package and does not build the final client app directly.",
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
  `## Export or deployment acceptance criteria\n\n- Generated package contains all ${GENERATED_FILES.length} required files.\n- ZIP structure matches approved folders.\n- Missing markers remain visible in exported markdown.`,
  `## Client review acceptance\n\n${readinessChecklist(project)}`,
  `## Readiness blockers\n\n${readinessBlockers(project)}`
);

const testPlan = (project: ProjectRecord) => join(
  "# Test Plan",
  header(project),
  "## Test scope\n\nValidation, generation, persistence, document preview, and export behavior for the active project.",
  "## Unit test targets\n\n- Validation rules by stage\n- Document helper functions\n- File mapping and sanitization",
  "## Integration test targets\n\n- Active project generation and persistence\n- Intake edit behavior versus generated documents\n- Document preview and export behavior",
  `## Manual test checklist\n\n${markdownList([
    `Generate package and verify all ${GENERATED_FILES.length} files exist`,
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
  sectionOrMissing("Project type", getProjectTypeLabel(project.intake.appType), "project type"),
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
  "## Draft and readiness rule\n\nDraft package generation is allowed with [MISSING: ...] markers. Do not mark the project Ready for Codex until required gaps, client review decisions, and every blocking readiness checklist item are complete.",
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
  `- Generated files: ${GENERATED_FILES.length}`,
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

function developmentTemplate(fileName: string, project: ProjectRecord): string {
  return join(
    `# ${fileName.replace(".md", "")}`,
    header(project),
    "[MISSING: document template implementation pending]"
  );
}

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
  "DATA_SOURCE_SCHEMA.md": (project) => developmentTemplate("DATA_SOURCE_SCHEMA.md", project),
  "POWER_FX_STANDARDS.md": (project) => developmentTemplate("POWER_FX_STANDARDS.md", project),
  "DELEGATION_REGISTER.md": (project) => developmentTemplate("DELEGATION_REGISTER.md", project),
  "CONTROL_INVENTORY.md": (project) => developmentTemplate("CONTROL_INVENTORY.md", project),
  "APP_CONFIGURATION.md": (project) => developmentTemplate("APP_CONFIGURATION.md", project),
  "YAML_MANIFEST.md": (project) => developmentTemplate("YAML_MANIFEST.md", project),
  "CONNECTOR_REGISTER.md": (project) => developmentTemplate("CONNECTOR_REGISTER.md", project),
  "LICENSING_ASSESSMENT.md": (project) => developmentTemplate("LICENSING_ASSESSMENT.md", project),
  "CONNECTION_REGISTER.md": (project) => developmentTemplate("CONNECTION_REGISTER.md", project),
  "IMPLEMENTATION_LOG.md": (project) => developmentTemplate("IMPLEMENTATION_LOG.md", project),
  "ALM_DEPLOYMENT_PLAN.md": (project) => developmentTemplate("ALM_DEPLOYMENT_PLAN.md", project),
  "SHAREPOINT_SCHEMA.md": (project) => developmentTemplate("SHAREPOINT_SCHEMA.md", project),
  "INTERNAL_COLUMN_NAMES.md": (project) => developmentTemplate("INTERNAL_COLUMN_NAMES.md", project),
  "DATAVERSE_SCHEMA.md": (project) => developmentTemplate("DATAVERSE_SCHEMA.md", project),
  "LOGICAL_NAMES.md": (project) => developmentTemplate("LOGICAL_NAMES.md", project),
  "CONNECTOR_SCHEMA.md": (project) => developmentTemplate("CONNECTOR_SCHEMA.md", project),
  "SOLUTION_ARCHITECTURE.md": (project) => developmentTemplate("SOLUTION_ARCHITECTURE.md", project),
  "SOLUTION_COMPONENT_REGISTER.md": (project) => developmentTemplate("SOLUTION_COMPONENT_REGISTER.md", project),
  "TABLE_RELATIONSHIPS.md": (project) => developmentTemplate("TABLE_RELATIONSHIPS.md", project),
  "FORMS_AND_VIEWS.md": (project) => developmentTemplate("FORMS_AND_VIEWS.md", project),
  "APP_NAVIGATION.md": (project) => developmentTemplate("APP_NAVIGATION.md", project),
  "BUSINESS_RULES.md": (project) => developmentTemplate("BUSINESS_RULES.md", project),
  "BUSINESS_PROCESS_FLOWS.md": (project) => developmentTemplate("BUSINESS_PROCESS_FLOWS.md", project),
  "AUTOMATION_REGISTER.md": (project) => developmentTemplate("AUTOMATION_REGISTER.md", project),
  "SECURITY_ROLES.md": (project) => developmentTemplate("SECURITY_ROLES.md", project),
  "CUSTOM_PAGES.md": (project) => developmentTemplate("CUSTOM_PAGES.md", project),
  "EXTENSION_REGISTER.md": (project) => developmentTemplate("EXTENSION_REGISTER.md", project),
  "ENVIRONMENT_VARIABLES.md": (project) => developmentTemplate("ENVIRONMENT_VARIABLES.md", project)
};

export const REQUIRED_DOCUMENT_TEMPLATE_KEYS = Object.keys(documentTemplates);

export function documentTemplatePreviewTable(project: ProjectRecord): string {
  return markdownTable(
    ["Document", "Status"],
    REQUIRED_DOCUMENT_TEMPLATE_KEYS.map((fileName) => [fileName, project.status])
  );
}
