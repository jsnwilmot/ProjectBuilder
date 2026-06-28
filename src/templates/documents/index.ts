import type { ProjectIntake } from "../../types/project";
import { generatedNotice, list, missing, projectHeader, section, value } from "./common";

const join = (...parts: string[]) => parts.join("\n\n");

const readme = (i: ProjectIntake) => join(
  `# ${value(i.appName, "app name")}`,
  generatedNotice,
  projectHeader(i),
  section("Purpose", value(i.appPurpose, "app purpose")),
  section("Problem", value(i.problemStatement, "problem being solved")),
  section("Package contents", "This package contains the requirements, architecture, data, UI, workflows, security, development, testing, deployment, documentation, and phased Codex prompts needed for a controlled handoff."),
  section("Start here", "1. Resolve every `[MISSING: ...]` marker.\n2. Complete Architect review.\n3. Approve scope before setting the project to Ready for Codex.")
);

const projectScope = (i: ProjectIntake) => join(
  "# Project Scope", generatedNotice, projectHeader(i),
  section("Purpose", value(i.appPurpose, "app purpose")),
  section("Problem statement", value(i.problemStatement, "problem being solved")),
  section("Required features", list(i.requiredFeatures, "required features")),
  section("In scope", list(i.requiredFeatures, "in-scope capabilities")),
  section("Out of scope", list(i.outOfScope, "out-of-scope items")),
  section("Constraints", list(i.constraints, "constraints")),
  section("Assumptions", list(i.assumptions, "assumptions")),
  section("Success criteria", list(i.successCriteria, "success criteria"))
);

const clientRequirements = (i: ProjectIntake) => join(
  "# Client Requirements", generatedNotice, projectHeader(i),
  section("Target users", list(i.targetUsers, "target users")),
  section("User roles", list(i.userRoles, "user roles")),
  section("Required features", list(i.requiredFeatures, "required features")),
  section("Workflows", list(i.workflows, "workflows")),
  section("Screens", list(i.screens, "screens")),
  section("Permissions", list(i.permissions, "permissions")),
  section("Automations", list(i.automations, "automations")),
  section("Notifications", list(i.notifications, "notifications")),
  section("Reports and dashboards", list(i.reportsDashboards, "reports or dashboards")),
  section("Branding", value(i.brandingNotes, "branding notes"))
);

const architectInstructions = (i: ProjectIntake) => join(
  "# Architect Instructions", generatedNotice, projectHeader(i),
  section("Architect role", "GPT is the Architect. Define and approve structure, boundaries, decisions, and handoff instructions. Do not implement the client application."),
  section("Mission", value(i.appPurpose, "app purpose")),
  section("Required architecture inputs", [
    `- Users and roles: ${value(i.userRoles, "user roles")}`,
    `- Data sources: ${value(i.dataSources, "data sources")}`,
    `- Collections: ${value(i.dataCollections, "tables, lists, or collections")}`,
    `- Integrations: ${value(i.integrations, "integrations")}`,
    `- Constraints: ${value(i.constraints, "constraints")}`
  ].join("\n")),
  section("Review duties", "1. Resolve missing decisions.\n2. Confirm system boundaries and data ownership.\n3. Review security and permissions.\n4. Approve acceptance criteria.\n5. Mark the package Ready for Codex only after contradictions are removed.")
);

const appBlueprint = (i: ProjectIntake) => join(
  "# App Blueprint", generatedNotice, projectHeader(i),
  section("Product outcome", value(i.appPurpose, "app purpose")),
  section("Experience model", `The product serves:\n${list(i.targetUsers, "target users")}`),
  section("Core capabilities", list(i.requiredFeatures, "required features")),
  section("Primary screens", list(i.screens, "screens")),
  section("Core workflows", list(i.workflows, "workflows")),
  section("Information model", `${list(i.dataCollections, "tables, lists, or collections")}\n\nKey fields:\n${list(i.fields, "fields")}`),
  section("External boundaries", list(i.integrations, "integrations"))
);

const dataModel = (i: ProjectIntake) => join(
  "# Data Model", generatedNotice, projectHeader(i),
  section("Data sources", list(i.dataSources, "data sources")),
  section("Tables, lists, or collections", list(i.dataCollections, "tables, lists, or collections")),
  section("Fields", list(i.fields, "fields")),
  section("Permissions", list(i.permissions, "permissions")),
  section("Data rules", `- Validate required values before writes.\n- Apply least-privilege access.\n- Use stable identifiers.\n- Do not store secrets in source.\n- Retention requirement: ${missing("data retention requirements")}`)
);

const screenMap = (i: ProjectIntake) => join(
  "# Screen Map", generatedNotice, projectHeader(i),
  section("Screens", list(i.screens, "screens")),
  section("Role access", list(i.permissions, "screen-level role access")),
  section("Navigation rules", "- Keep the next action clear.\n- Preserve keyboard navigation and visible focus.\n- Show validation near the affected field.\n- Do not expose actions a role cannot perform."),
  section("Responsive and accessibility notes", `${value(i.brandingNotes, "branding and UI notes")}\n\nAll screens require semantic headings, labels, sufficient contrast, and mobile-responsive layouts.`)
);

const workflowMap = (i: ProjectIntake) => join(
  "# Workflow Map", generatedNotice, projectHeader(i),
  section("Primary workflows", list(i.workflows, "workflows")),
  section("Automations", list(i.automations, "automations")),
  section("Notifications", list(i.notifications, "notifications")),
  section("Failure handling", "- Preserve user input after recoverable errors.\n- Show a plain-language error and recovery action.\n- Prevent duplicate submission.\n- Record unresolved exception paths as missing decisions.")
);

const securityModel = (i: ProjectIntake) => join(
  "# Security Model", generatedNotice, projectHeader(i),
  section("Permissions", list(i.permissions, "permissions")),
  section("Data boundaries", `Sources and integrations:\n${list(i.dataSources, "data sources")}\n${list(i.integrations, "integrations")}`),
  section("Required controls", "- Sanitize user-provided file and project names.\n- Escape user content; never inject raw HTML.\n- Keep secrets out of source and exports.\n- Use least privilege.\n- Keep export output deterministic.\n- Do not transmit project data without approval."),
  section("Risks", list(i.risks, "security and delivery risks")),
  section("Open security decisions", `- ${missing("authentication requirements, if authentication is approved")}\n- ${missing("data retention and deletion requirements")}\n- ${missing("audit logging requirements")}`)
);

const codexInstructions = (i: ProjectIntake) => join(
  "# Codex Instructions", generatedNotice, projectHeader(i),
  section("Developer role", "Codex is the Developer. Implement only Architect-approved scope. Flag missing decisions instead of guessing."),
  section("Objective", value(i.appPurpose, "app purpose")),
  section("Required capabilities", list(i.requiredFeatures, "required features")),
  section("Constraints", list(i.constraints, "constraints")),
  section("Engineering rules", "- Separate state, metadata, generation, templates, export, display, and validation.\n- Preserve existing behavior unless the task changes it.\n- Use clear names and reusable components.\n- Sanitize unsafe file names.\n- Keep UI semantic, responsive, keyboard accessible, and clear about missing information.\n- Update tests and documentation with behavior changes."),
  section("Reporting", "After each task, report summary, files created/updated/removed, testing, issues by priority, scope questions, and the next recommended step.")
);

const acceptanceCriteria = (i: ProjectIntake) => join(
  "# Acceptance Criteria", generatedNotice, projectHeader(i),
  section("Project-specific criteria", list(i.successCriteria, "success criteria")),
  section("Functional criteria", "- Required workflows complete without hidden steps.\n- Required fields prevent invalid submission.\n- Permissions match approved roles.\n- Missing information is visible, not silently assumed.\n- Error states provide a recovery action."),
  section("Quality criteria", "- Responsive layouts work at mobile and desktop sizes.\n- Keyboard access and focus states are present.\n- User input is not rendered as raw HTML.\n- Automated tests cover validation and core workflow behavior.")
);

const testPlan = (i: ProjectIntake) => join(
  "# Test Plan", generatedNotice, projectHeader(i),
  section("Functional coverage", "1. Required field validation.\n2. Role and permission behavior.\n3. Each primary workflow.\n4. Automation and notification triggers.\n5. Reporting output.\n6. Error handling and retry behavior."),
  section("Project workflows", list(i.workflows, "workflows to test")),
  section("Acceptance coverage", list(i.successCriteria, "acceptance criteria")),
  section("Non-functional coverage", "- Mobile and desktop responsive layout.\n- Keyboard navigation and focus order.\n- Color contrast and form labels.\n- Unsafe file-name sanitization.\n- Predictable export contents.")
);

const deploymentNotes = (i: ProjectIntake) => join(
  "# Deployment Notes", generatedNotice, projectHeader(i),
  section("Target environment", missing("hosting and deployment environment")),
  section("Configuration", "- Store secrets outside source control.\n- Document environment-specific values.\n- Keep build and release commands reproducible."),
  section("Pre-release checklist", "- All acceptance criteria pass.\n- Security review is complete.\n- Accessibility basics are verified.\n- Rollback steps are documented.\n- Package owner approves release."),
  section("Constraints", list(i.constraints, "deployment constraints"))
);

const changeLog = (i: ProjectIntake) => join(
  "# Change Log", generatedNotice, projectHeader(i),
  "## Unreleased\n\n- Initial project package generated from guided intake.\n- Missing decisions remain explicitly marked for review."
);

const nextSteps = (i: ProjectIntake) => join(
  "# Next Steps", generatedNotice, projectHeader(i),
  "1. Search the package for `[MISSING:` markers.\n2. Resolve missing user roles, data, workflows, permissions, and deployment decisions.\n3. Ask GPT Architect to reconcile requirements and approve the blueprint.\n4. Update acceptance criteria after review.\n5. Set status to Ready for Codex.\n6. Execute the phased Codex prompts in order."
);

const phases = [
  ["Project setup", "Create the approved application structure and shared foundations.", "project configuration, source folders, shared types and constants"],
  ["Data model", "Implement the approved information model and validation boundaries.", "data types, schemas, validation, fixtures and tests"],
  ["Intake flow", "Build the required guided input and state behavior.", "intake components, state, field definitions and validation UI"],
  ["Document generation", "Generate all required project documents with explicit missing markers.", "document templates, generation orchestration and tests"],
  ["Mission Control dashboard", "Show project status, readiness, next action, files, and outstanding questions.", "dashboard components, status helpers and responsive styles"],
  ["Export features", "Export the predictable standard folder structure without unsafe file names.", "export logic, archive creation and export tests"],
  ["Review and cleanup", "Reconcile behavior, accessibility, naming, and documentation.", "affected components, styles, docs and tests"],
  ["Testing and deployment", "Complete release verification and deployment documentation.", "test suites, test plan, deployment notes and release checklist"]
] as const;

const phasedPrompts = (i: ProjectIntake) => join(
  "# Phased Codex Prompts", generatedNotice, projectHeader(i),
  ...phases.map(([name, objective, files], index) => `## Phase ${index + 1}: ${name}

### Objective
${objective}

### Files to create or update
${files}

### Exact requirements
- Follow the approved scope in PROJECT_SCOPE.md.
- Use the project-specific requirements in CLIENT_REQUIREMENTS.md.
- Preserve all standard package folders and files.
- Surface unresolved decisions as \`[MISSING DECISION: explanation]\`.

### Constraints
${list(i.constraints, "constraints")}

### Acceptance criteria
${list(i.successCriteria, "success criteria")}

### Testing instructions
- Add or update automated tests for changed behavior.
- Verify validation, error handling, responsive behavior, and accessibility basics.

### Reporting instructions
- Report changed files, tests run and results, issues by priority, scope questions, and the next step.`)
);

export const documentTemplates: Record<string, (intake: ProjectIntake) => string> = {
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
