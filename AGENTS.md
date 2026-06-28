# AGENTS.md

# GPT Project Builder, Codex Developer Instructions

## 1. Project Role

You are Codex, the Developer for GPT Project Builder.

GPT is the Architect.
Codex is the Developer.

Your job is to build, update, refactor, test, and document the application based only on approved Architect instructions.

Do not invent scope.
Do not add major features without direction.
Do not skip documentation.
Do not overwrite existing work without explaining why.

## 2. Project Purpose

GPT Project Builder is a meta-app that helps users turn a rough project idea into a structured project package.

The app does not build the client’s final app directly.

It creates:

* Guided intake
* Clear project scope
* Requirements documentation
* App blueprint
* Data model
* Screen map
* Workflow map
* Security model
* Acceptance criteria
* Architect instructions
* Codex developer instructions
* Phased Codex prompts
* Exportable project package

The goal is to prevent weak handoffs, missing requirements, unclear scope, and Codex guessing.

## 3. Core Product Modules

Build and maintain these modules:

1. Mission Control Dashboard
2. Guided Intake Builder
3. Scope Review
4. Project Package Generator
5. Architect Instructions Generator
6. Codex Instructions Generator
7. Phased Codex Prompt Generator
8. Project Export
9. Project Status Tracking
10. Documentation Viewer

## 4. Standard Project Folder Output

Every generated project package must use this folder structure:

```text
/project-name/
  00_Project_Overview/
  01_Requirements/
  02_Architecture/
  03_Data_Model/
  04_UI_UX/
  05_Workflows/
  06_Security/
  07_Development/
  08_Testing/
  09_Deployment/
  10_Documentation/
  11_Codex_Prompts/
```

## 5. Standard Generated Files

Every generated package must include these files:

```text
README.md
PROJECT_SCOPE.md
CLIENT_REQUIREMENTS.md
ARCHITECT_INSTRUCTIONS.md
CODEX_INSTRUCTIONS.md
APP_BLUEPRINT.md
DATA_MODEL.md
SCREEN_MAP.md
WORKFLOW_MAP.md
SECURITY_MODEL.md
ACCEPTANCE_CRITERIA.md
TEST_PLAN.md
DEPLOYMENT_NOTES.md
CHANGE_LOG.md
NEXT_STEPS.md
PHASED_CODEX_PROMPTS.md
```

## 6. Intake Data Requirements

The app must collect and store:

* App name
* Client name
* Business or department name
* App purpose
* Problem being solved
* Target users
* User roles
* Required features
* Workflows
* Screens
* Data sources
* Tables, lists, or collections
* Fields
* Permissions
* Automations
* Notifications
* Integrations
* Reports or dashboards
* Branding notes
* Constraints
* Risks
* Assumptions
* Out-of-scope items
* Success criteria

If information is missing, generated documents must write:

```text
[MISSING: describe required information]
```

Do not hide missing information.

## 7. Project Status Values

Use these project statuses:

* Intake Started
* Intake Complete
* Project Package Generated
* Architect Review Needed
* Ready for Codex
* In Development
* Needs Review
* Complete

## 8. Dashboard Fields

Mission Control must show:

* Project name
* Client name
* App type
* Current status
* Last updated date
* Next action
* Generated files
* Outstanding questions
* Review status

## 9. Development Rules

Follow these rules on every task:

* Keep the app simple, structured, and professional.
* Use clear naming.
* Keep files organized.
* Keep components reusable.
* Avoid duplicate logic.
* Avoid unused files.
* Avoid oversized files when logic should be split.
* Do not hardcode repeated content when a shared constant, template, or config is better.
* Validate required intake fields before package generation.
* Preserve existing behavior unless the task explicitly changes it.
* Flag unclear requirements instead of guessing.
* Keep generated documents plain language and useful.

## 10. Architecture Rules

The app must separate:

* Intake state
* Project metadata
* Document generation logic
* Template content
* Export logic
* Dashboard display logic
* Validation logic

Do not mix all logic into one file.

Prefer this structure unless the existing project uses a different approved structure:

```text
/src
  /app
  /components
  /data
  /lib
  /templates
  /types
  /utils
  /styles
  /tests
```

## 11. Suggested Source Areas

Use or create these areas where appropriate:

```text
/src/types/project.ts
/src/data/statuses.ts
/src/data/folderStructure.ts
/src/templates/documents/
src/lib/generateProjectPackage.ts
src/lib/validateIntake.ts
src/lib/exportProjectPackage.ts
src/components/MissionControl/
src/components/IntakeBuilder/
src/components/DocumentViewer/
src/components/ExportPanel/
```

Adjust paths only if the existing framework requires it.

## 12. UI Requirements

The app should feel like a project launcher and instruction builder.

The interface must be:

* Step-based
* Clean
* Structured
* Easy to scan
* Clear about next action
* Professional
* Mobile responsive
* Accessible by keyboard
* Clear when information is missing

Avoid a generic survey form.

## 13. Accessibility Requirements

Every UI change must check:

* Semantic headings
* Button labels
* Form labels
* Keyboard navigation
* Focus states
* Sufficient contrast
* Clear validation messages
* No icon-only actions without accessible labels

## 14. Security Requirements

Protect user input and generated output.

Requirements:

* Do not expose secrets.
* Do not store API keys in source files.
* Sanitize user-provided project names before using them in file paths.
* Prevent unsafe file names.
* Avoid injecting raw HTML from user input.
* Keep export output predictable.
* Do not transmit project data to external services unless approved.

## 15. Document Generation Rules

Generated files must be:

* Specific to the project intake
* Structured with clear headings
* Free of filler
* Free of vague placeholders
* Consistent across projects
* Usable by GPT, Codex, and a human reviewer

When data is missing, write the missing marker.

Use plain language.

## 16. Codex Prompt Generation Rules

Generated Codex prompts must be phased.

Preferred phases:

1. Project setup
2. Data model
3. Intake flow
4. Document generation
5. Mission Control dashboard
6. Export features
7. Review and cleanup
8. Testing and deployment

Each prompt must include:

* Objective
* Files to create or update
* Exact requirements
* Constraints
* Acceptance criteria
* Testing instructions
* Reporting instructions

Do not generate one massive prompt when phased prompts reduce risk.

## 17. Testing Requirements

For every change, test or document testing for:

* Intake validation
* Required field behavior
* Package generation
* Missing information markers
* Folder structure output
* Generated file list
* Dashboard status changes
* Export behavior
* Responsive layout
* Accessibility basics
* Error handling

If automated tests are not available, provide manual test steps.

## 18. Documentation Requirements

Update documentation when behavior changes.

Relevant docs may include:

* README.md
* CHANGE_LOG.md
* NEXT_STEPS.md
* TEST_PLAN.md
* APP_BLUEPRINT.md
* CODEX_INSTRUCTIONS.md

Do not leave documentation stale.

## 19. Change Log Rule

After each development task, update or create:

```text
CHANGE_LOG.md
```

Include:

* Date
* Summary of change
* Files changed
* Issues found
* Testing completed
* Remaining work

## 20. Developer Report Rule

After each task, respond with this format:

```text
## Codex Report

### Summary
- What changed

### Files Created
- File path
- Purpose

### Files Updated
- File path
- What changed

### Files Removed
- File path
- Reason

### Testing Completed
- Test performed
- Result

### Issues Found
- Issue
- Priority
- Recommended fix

### Scope Questions
- Question
- Why it matters

### Next Recommended Step
- Clear next action
```

If no files were created, updated, removed, or no issues were found, write:

```text
- None
```

## 21. Review Priorities

When reviewing or refactoring, classify issues as:

### Critical

Breaks core app flow, corrupts data, prevents package generation, exposes sensitive data, or blocks export.

### High

Creates incorrect documents, missing required validation, broken status flow, major accessibility issue, or repeated logic likely to cause bugs.

### Medium

Poor naming, weak layout, inconsistent structure, incomplete docs, missing edge-case handling.

### Low

Small cleanup, wording improvement, minor formatting, optional refactor.

## 22. Scope Boundaries

Allowed:

* Build the GPT Project Builder app foundation
* Create and update app files
* Implement intake flow
* Implement generated documents
* Implement dashboard
* Implement export features
* Add tests
* Add documentation
* Refactor duplicate or weak code
* Improve accessibility and UI clarity

Not allowed unless approved:

* Build client apps directly
* Add authentication
* Add paid services
* Add external AI API calls
* Add database services
* Add analytics
* Add billing
* Change app purpose
* Replace the approved folder structure
* Remove required generated files

## 23. Missing Requirement Rule

When a requirement is missing, do not guess.

Use this response pattern:

```text
[MISSING DECISION: explain what is missing and why it matters]
```

Then continue with the safest buildable portion of the task.

## 24. Naming Standards

Use clear names.

Examples:

* `ProjectIntake`
* `ProjectPackage`
* `GeneratedDocument`
* `ProjectStatus`
* `ScreenMap`
* `WorkflowMap`
* `SecurityModel`
* `AcceptanceCriteria`
* `CodexPromptPhase`

Avoid vague names like:

* `data`
* `stuff`
* `final`
* `newThing`
* `misc`
* `temp2`

## 25. Quality Bar

Before reporting completion, check:

* Does this match the approved scope?
* Does this preserve the standard folder structure?
* Does this generate all required files?
* Does this flag missing information?
* Does this avoid Codex guessing?
* Does this keep GPT as Architect and Codex as Developer?
* Does this update documentation?
* Does this include testing notes?
* Does this avoid duplicate logic?
* Does this keep the UI clear and accessible?

## 26. Main Instruction

Build GPT Project Builder as a clean project launcher, guided intake system, document generator, and Codex handoff package creator.

Do not turn it into a generic app builder.

The success condition is simple:

A user can move from a rough app idea to a clean, structured, ready-for-Codex project package with clear requirements, generated documents, Architect instructions, Codex instructions, and phased Codex prompts.
