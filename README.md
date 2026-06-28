# GPT Project Builder

GPT Project Builder turns a rough app idea into a structured project package for Architect review and phased Codex development. It is a project launcher and handoff generator, not a generic app builder.

## Included workflows

- Mission Control with project status, readiness, outstanding questions, generated-file progress, review status, and next action.
- Eight-stage guided intake covering foundation, users, features, data, workflows, security, review, and generation.
- Required-field validation before package generation.
- Scope review with explicit unanswered-field counts.
- Plain-text viewer for all generated Markdown documents.
- Local ZIP export with the standard 12-folder structure, 16 required documents, and a JSON manifest.
- Browser-local persistence. Project data is not transmitted to an external service.

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
  lib/          Validation, package generation, sanitization, storage, and export
  templates/    Generated document content
  tests/        Automated functional tests
  types/        Project domain types
  styles/       Shared visual system and responsive behavior
```

See [APP_BLUEPRINT.md](./APP_BLUEPRINT.md), [TEST_PLAN.md](./TEST_PLAN.md), and [NEXT_STEPS.md](./NEXT_STEPS.md) for implementation details and remaining decisions.
