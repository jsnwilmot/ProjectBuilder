# GPT Project Builder

GPT Project Builder turns a rough app idea into a structured project package for Architect review and phased Codex development. It is a project launcher and handoff generator, not a generic app builder.

## Included workflows

- Mission Control with project status, readiness, outstanding questions, generated-file progress, review status, and next action.
- Eight-stage guided intake covering foundation, users, features, data, workflows, security, review, and generation.
- Required-field validation before package generation.
- Scope review with explicit unanswered-field counts.
- Plain-text viewer for all generated Markdown documents.
- Local ZIP export with the standard 12-folder structure, 16 required documents, and a JSON manifest.
- Versioned browser-local persistence for multiple projects and one active project.
- Persisted intake changes, generated documents, lifecycle status, readiness, and timestamps.
- Project data is stored only in the current browser. No backend or external service is used.

## MVP persistence

The MVP uses one localStorage key: `gpt-project-builder.storage.v1`. Its versioned schema stores `activeProjectId` and a collection of complete project records. Creating a project adds a new record without replacing existing projects, and selecting a recent project changes the active record.

If stored JSON is missing, malformed, or incompatible, the repository returns a safe empty version-1 state instead of crashing. On a brand-new browser store, the app writes clearly identified demo projects once so Mission Control has useful starting data.

Because there is no backend or authentication in this phase, projects are available only in the browser profile where they were created. Clearing browser storage removes them.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite.

## Verify

```powershell
npm.cmd test
npm.cmd run build
npm.cmd audit
```

## Architecture

```text
src/
  app/          Application composition and project state
  components/   Mission Control, intake, review, viewer, export, and shell UI
  data/         Intake stages, statuses, folder definitions, and seed project
  lib/          Project factory, repository, versioning, selectors, validation, generation, and export
  templates/    Generated document content
  tests/        Automated functional tests
  types/        Project domain types
  styles/       Shared visual system and responsive behavior
```

See [APP_BLUEPRINT.md](./APP_BLUEPRINT.md), [TEST_PLAN.md](./TEST_PLAN.md), and [NEXT_STEPS.md](./NEXT_STEPS.md) for implementation details and remaining decisions.
