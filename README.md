# GPT Project Builder

GPT Project Builder turns a rough app idea into a structured project package for Architect review and phased Codex development. It is a project launcher and handoff generator, not a generic app builder.

## Included workflows

- First-run Mission Control welcome with a plain-language product boundary, primary project-creation action, read-only example workflow, and compact eight-step path from idea to GPT Architect review.
- The read-only example demonstrates a local business website handoff without creating or overwriting a saved project.
- Mission Control with project status, readiness, outstanding questions, generated-document progress, review status, and next action.
- Saved Project Management with explicit Open, Duplicate, Archive, Restore, and confirmed Delete actions for browser-local projects.
- Active and archived projects are separated, with compact counts for active, archived, Ready for Codex, Draft, and blocked projects.
- Duplicate creates a new `Copy` record with lineage metadata and stale generated output; archive retains all project data and can be reversed.
- Hardened Mission Control selectors for active-project summaries, recent project summaries, deterministic next actions, status normalization, and dashboard warnings.
- Active project and recent project rows now render from persisted state with clear active-project indication and safe fallbacks.
- Readiness sections now include derived missing/warning counts from validation stage results.
- Eight-stage guided intake with a single stage configuration source covering foundation, users, features, data, workflows, security, review, and generation.
- Required project type selection with 15 typed presets that define recommended platforms, relevant intake modules, branding level, generated-document guidance, and visible use-case helper copy.
- Conditional website, game, mobile, dashboard, Microsoft 365, automation, and API questions shown only for relevant project types.
- Structured branding intake with public/internal visibility rules; branding is required for public and brand-dependent products and optional for internal tools.
- Section-based validation that returns `isValid`, missing fields, warnings, and per-stage completion results.
- Client Review workflow between generation and Ready for Codex, with persisted missing-information decisions, grouped client questions, and a blocking readiness checklist.
- Missing and weak items record section, field label, reason, recommended client question, action, and one of `Needs answer`, `Answered`, `Not applicable`, or `Deferred`.
- Consistent project and review status labels with migration of the legacy `Needs review` review label.
- Actionable empty-state and corrupt-storage recovery without silently creating demo projects.
- Generate stage readiness summary that allows generation with explicit `[MISSING: ...]` markers.
- Hardened document templates for all 19 required markdown files with project-specific output and cross-document consistency.
- Generated `BRAND_GUIDE.md`, `CLIENT_QUESTIONS.md`, and `HANDOFF_CHECKLIST.md` files.
- Approved folder mapping for all generated files with safe path handling for package generation and ZIP export.
- Shared document generation helpers for missing markers, safe text/list handling, markdown formatting, and file/folder sanitization.
- Project Package Preview with a 19-document review list, folder and purpose labels, per-document statuses, missing-marker counts, and Preview/Copy actions.
- Full plain-text Markdown preview with preserved heading and list spacing, document metadata, and back/close navigation.
- Package summary showing Draft/Ready status, document count, total missing markers, readiness blockers, checklist progress, and ZIP availability.
- Quick-copy actions for Architect instructions, Codex instructions, phased prompts, client questions, and next steps using the shared clipboard fallback.
- Verified ZIP export with the standard 12-folder structure, 19 required documents, `EXPORT_MANIFEST.md`, and a JSON diagnostic manifest.
- Export diagnostics distinguish Draft packages from Ready for Codex packages. Draft generation/export remains allowed; Ready for Codex requires all blocking review items and checklist checks to pass.
- Mission Control explains Draft, Ready for Codex, and Client Questions Pending in plain language when those states apply.
- The Generate stage explains the exact post-generation review and GPT Architect/Codex handoff workflow before a package is created.
- A **Use This Project Package** panel and generated `NEXT_STEPS.md` explain the Architect/Codex review loop after generation.
- Export integrity diagnostics for missing, extra, empty, duplicate, incorrectly mapped, or unsafe document paths.
- Deterministic core file and folder ordering, safe ZIP root normalization, and active-project-only export.
- Copy actions for generated Architect instructions, Codex instructions, and phased Codex prompts.
- Versioned browser-local persistence for multiple projects and one active project.
- Persisted intake changes, generated documents, client review decisions, readiness confirmations, lifecycle status, and timestamps without clearing generated documents on intake edits.
- Generated documents are replaced only when **Generate and save package** is explicitly run.
- Project data is stored only in the current browser. No backend or external service is used.

## MVP persistence

The MVP uses one localStorage key: `gpt-project-builder.storage.v1`. Its versioned schema stores `activeProjectId` and a collection of complete project records. Creating or duplicating a project adds a new record without replacing existing projects. Archived records retain their data, are excluded from the default active list, and can be restored.

Duplicate records receive a new id, current timestamps, `sourceProjectId` and `duplicatedAt` lineage, an `Intake Started` lifecycle state, and no generated documents. Review decisions are reconciled against the copied intake, and the copied package must be regenerated before Ready for Codex. Delete always requires a second confirmation and permanently removes only the selected local record.

If stored JSON is missing, malformed, or incompatible, the repository returns a safe empty version-1 state instead of crashing. A new or recovered store opens the first-run welcome and does not create demo projects automatically. Opening the example workflow is read-only and does not write to storage.

Because there is no backend or authentication in this phase, projects are available only in the browser profile where they were created. Clearing browser storage removes them.

Existing stored free-text app types that do not match a supported preset are cleared during normalization so the user can make an explicit valid selection. Packages generated before the 19-document format remain stored, but they must be regenerated to add the three new required files before Export integrity will pass.

Older stored projects are normalized with safe defaults for the client review workflow. Review decisions are stored in the existing version-1 record. Intake or review changes mark the generated package stale; regenerate after the final review before Ready for Codex can pass.

## Export packages

Export uses the active project's persisted generated documents. Run **Generate and save package** before opening Export; Export never creates an empty or implicit package.

A valid ZIP contains:

- The approved 12-folder structure.
- Exactly 19 core Markdown documents.
- `00_Project_Overview/EXPORT_MANIFEST.md` with project identity, status, file diagnostics, warning/error counts, folder summary, and stable file list.
- `project-manifest.json` with the same machine-readable diagnostics.

The two manifests are diagnostic files and are not counted among the 19 core documents. Explicit `[MISSING: ...]` markers remain in generated documents and are reported as warnings rather than blocking export. A package with unresolved client review or checklist blockers is labeled **Draft**. It becomes **Ready for Codex** only when every blocking review item is answered or marked not applicable with a reason, all blocking checklist checks pass, and the final package is regenerated. Unsafe project names are converted to a safe ZIP root; unsafe, duplicate, unexpected, incorrectly mapped, or empty generated files block export with a clear error.

Open **Documents** after generation to review the Project Package Preview before export. Documents with missing markers are labeled **Needs Info**; key handoff documents without missing markers are labeled **Review Recommended**; other complete documents are labeled **Ready**. Draft packages may retain missing markers, but required missing information must be resolved before Ready for Codex.

## Current limitations

- No backend, authentication, cloud synchronization, analytics, or external AI calls.
- Projects remain only in the current browser profile and are removed when browser storage is cleared.
- Project package import is deferred.
- Production hosting uses Cloudflare Workers Static Assets through the existing `projectbuilder` Worker.
- Windows technical ZIP extraction passed, but user-visible download and Windows Explorer inspection remain manual release checks.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite.

## Production deployment

**Hosting target: Cloudflare Workers Static Assets**

The MVP deploys as a static Vite build to the existing `projectbuilder` Worker:

- Build command: `npm.cmd run build`
- Build output directory: `dist`
- Deploy command: `npm.cmd run deploy`
- Production URL: `https://projectbuilder.jsnwilmot.workers.dev/`
- Environment variables: none required

`wrangler.jsonc` deploys `dist` as static assets with single-page-application fallback handling. No Worker runtime code is required. See [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md) for the deployment checklist, rollback procedure, and post-deployment smoke test.

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
  data/         Canonical intake stages, project type presets, package guidance, generated files, and folder mapping
  lib/          Project factory, repository, versioning, selectors, validation, generation, and export
  templates/    Generated document content
  tests/        Automated functional tests
  types/        Project domain types
  styles/       Shared visual system and responsive behavior
```

See [APP_BLUEPRINT.md](./APP_BLUEPRINT.md), [TEST_PLAN.md](./TEST_PLAN.md), [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md), [RELEASE_NOTES.md](./RELEASE_NOTES.md), and [NEXT_STEPS.md](./NEXT_STEPS.md) for implementation details and release actions.
