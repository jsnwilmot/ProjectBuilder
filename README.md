# GPT Project Builder

GPT Project Builder turns a rough app idea into a structured project package for Architect review and phased Codex development. It is a project launcher and handoff generator, not a generic app builder.

## Included workflows

- Mission Control with project status, readiness, outstanding questions, generated-document progress, review status, and next action.
- Hardened Mission Control selectors for active-project summaries, recent project summaries, deterministic next actions, status normalization, and dashboard warnings.
- Active project and recent project rows now render from persisted state with clear active-project indication and safe fallbacks.
- Readiness sections now include derived missing/warning counts from validation stage results.
- Eight-stage guided intake with a single stage configuration source covering foundation, users, features, data, workflows, security, review, and generation.
- Required project type selection with 15 typed presets that define recommended platforms, relevant intake modules, branding level, and generated-document guidance.
- Conditional website, game, mobile, dashboard, Microsoft 365, automation, and API questions shown only for relevant project types.
- Structured branding intake with public/internal visibility rules; branding is required for public and brand-dependent products and optional for internal tools.
- Section-based validation that returns `isValid`, missing fields, warnings, and per-stage completion results.
- Review stage summary with explicit missing required information and warning visibility.
- Consistent project and review status labels with migration of the legacy `Needs review` review label.
- Actionable empty-state and corrupt-storage recovery without silently creating demo projects.
- Generate stage readiness summary that allows generation with explicit `[MISSING: ...]` markers.
- Hardened document templates for all 19 required markdown files with project-specific output and cross-document consistency.
- Generated `BRAND_GUIDE.md`, `CLIENT_QUESTIONS.md`, and `HANDOFF_CHECKLIST.md` files.
- Approved folder mapping for all generated files with safe path handling for package generation and ZIP export.
- Shared document generation helpers for missing markers, safe text/list handling, markdown formatting, and file/folder sanitization.
- Plain-text viewer for all generated Markdown documents.
- Verified ZIP export with the standard 12-folder structure, 19 required documents, `EXPORT_MANIFEST.md`, and a JSON diagnostic manifest.
- Export diagnostics distinguish Draft packages from Ready for Codex packages. Draft generation/export remains allowed; Ready for Codex requires zero required missing fields.
- A **Use This Project Package** panel and generated `NEXT_STEPS.md` explain the Architect/Codex review loop after generation.
- Export integrity diagnostics for missing, extra, empty, duplicate, incorrectly mapped, or unsafe document paths.
- Deterministic core file and folder ordering, safe ZIP root normalization, and active-project-only export.
- Copy actions for generated Architect instructions, Codex instructions, and phased Codex prompts.
- Versioned browser-local persistence for multiple projects and one active project.
- Persisted intake changes, generated documents, lifecycle status, readiness, and timestamps without clearing generated documents on intake edits.
- Generated documents are replaced only when **Generate and save package** is explicitly run.
- Project data is stored only in the current browser. No backend or external service is used.

## MVP persistence

The MVP uses one localStorage key: `gpt-project-builder.storage.v1`. Its versioned schema stores `activeProjectId` and a collection of complete project records. Creating a project adds a new record without replacing existing projects, and selecting a recent project changes the active record.

If stored JSON is missing, malformed, or incompatible, the repository returns a safe empty version-1 state instead of crashing. A new or recovered store opens an actionable empty state and does not create demo projects automatically.

Because there is no backend or authentication in this phase, projects are available only in the browser profile where they were created. Clearing browser storage removes them.

Existing stored free-text app types that do not match a supported preset are cleared during normalization so the user can make an explicit valid selection. Packages generated before the 19-document format remain stored, but they must be regenerated to add the three new required files before Export integrity will pass.

## Export packages

Export uses the active project's persisted generated documents. Run **Generate and save package** before opening Export; Export never creates an empty or implicit package.

A valid ZIP contains:

- The approved 12-folder structure.
- Exactly 19 core Markdown documents.
- `00_Project_Overview/EXPORT_MANIFEST.md` with project identity, status, file diagnostics, warning/error counts, folder summary, and stable file list.
- `project-manifest.json` with the same machine-readable diagnostics.

The two manifests are diagnostic files and are not counted among the 19 core documents. Explicit `[MISSING: ...]` markers remain in generated documents and are reported as warnings rather than blocking export. A package with unresolved required intake is labeled **Draft**. It becomes **Ready for Codex** only when validation reports zero required missing fields. Unsafe project names are converted to a safe ZIP root; unsafe, duplicate, unexpected, incorrectly mapped, or empty generated files block export with a clear error.

## Current limitations

- No backend, authentication, cloud synchronization, analytics, or external AI calls.
- Projects remain only in the current browser profile and are removed when browser storage is cleared.
- Project package import is deferred.
- Production hosting is Cloudflare Pages; production deployment and smoke testing remain release-owner actions.
- Windows technical ZIP extraction passed, but user-visible download and Windows Explorer inspection remain manual release checks.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local URL printed by Vite.

## Production deployment

**Hosting target selected: Cloudflare Pages**

The MVP deploys as a static Vite build:

- Framework preset: Vite, or None if Vite is not available
- Root directory: repository root
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: none required

The app has no URL-based client-side routes, so no SPA redirect file is required. See [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md) for the Cloudflare Pages checklist, security and cache recommendations, rollback procedure, and post-deployment smoke test.

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
