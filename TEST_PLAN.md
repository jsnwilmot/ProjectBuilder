# Test Plan

## Automated coverage

- Intake stage configuration is defined in one canonical source with 8 required stages.
- Required intake rules pass and fail predictably for Foundation, Users, Features, Data, Workflows, and Security stages.
- Validation returns `isValid`, `missingFields`, `warnings`, and `sectionResults` with `stageId`, `label`, `percentComplete`, `isComplete`, `missingFields`, and `warnings`.
- Optional omissions remain visible as warnings.
- Continue Intake selects the next incomplete stage.
- Stage switching does not lose entered intake values.
- New projects receive complete safe defaults, unique IDs, lifecycle status, and timestamps.
- Versioned storage state saves and loads multiple projects plus `activeProjectId`.
- Invalid localStorage JSON recovers to a safe empty version-1 state.
- Empty storage renders a useful no-project state and project-dependent navigation does not produce a blank page.
- Invalid `activeProjectId` recovers to the first valid persisted project.
- Legacy `Needs review` data migrates to the canonical `Review needed` review status.
- Project status and review status use separate canonical label sets.
- Selecting an active project persists correctly.
- Nested project updates preserve untouched intake fields.
- Intake updates preserve existing generated documents.
- Generated documents and actual generated-file counts persist.
- Generation can proceed with missing intake data and keeps explicit missing markers.
- All 16 required markdown files generate every time and are non-empty.
- Generated document names match the canonical generated-file list.
- Folder mapping is validated against approved package structure.
- ARCHITECT_INSTRUCTIONS.md includes review process and blocked assumptions.
- CODEX_INSTRUCTIONS.md includes missing decision and scope boundary rules.
- PHASED_CODEX_PROMPTS.md includes phased prompts with objective, files, constraints, acceptance criteria, testing, and reporting sections.
- ZIP export is blocked before explicit generation and never creates an empty package.
- Export integrity detects missing, extra, empty, duplicate, incorrectly mapped, and unsafe generated files.
- Missing markers are counted as export warnings without blocking an otherwise valid package.
- ZIP root names and every archive path are sanitized or rejected safely.
- Archive folders and core files use deterministic approved ordering.
- `EXPORT_MANIFEST.md` and `project-manifest.json` are included without changing the 16-core-file count.
- Manifest diagnostics include project identity, lifecycle status, exported date, warning/error counts, folder summary, and stable file list.
- Large project records export with safe normalized paths and preserved content.
- Multi-project export uses only the active project's persisted documents.
- Copy actions read only active-project Architect, Codex, and phased prompt documents.
- Clipboard permission failure uses the local selection fallback when the browser supports it.
- Document preview reads active-project generated documents.
- Document search exposes a clear zero-result state and restores the selected document after clearing.
- Dashboard selectors calculate readiness, outstanding questions, completion, next action, and display status without mutation.
- Active project summary selector returns status, generated file count, outstanding required count, review status, and deterministic next action details.
- Recent project summaries sort by last updated date with stable fallback behavior.
- Dashboard warning selector surfaces inconsistent persisted status/readiness combinations.
- Mission Control project switching updates active context and heading safely.
- Mission Control recent project buttons expose clear accessible labels for project selection.
- All 12 required folders and 16 required files are generated.
- Missing information markers appear in generated Markdown.
- Unsafe project names normalize to predictable paths.
- ZIP archives contain the root document, manifest, standard folders, and phased prompts.
- Mission Control opens the selected intake step.
- Review stage surfaces missing required information and warnings before generation.
- Generate stage shows readiness counts and saves documents to the active project.
- Documentation Viewer renders generated content.

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd audit
```

## Full regression checklist

1. Start with empty storage and create a project from the Mission Control empty state.
2. Complete the minimum required Foundation, Users, Features, Data, Workflows, and Security questions.
3. Refresh and confirm the active project and intake values persist.
4. Create a second project, switch projects, and confirm each project retains its own intake and generated documents.
5. Open Scope Review and confirm required questions and optional warnings are clearly separated.
6. Generate the project package and confirm all 16 generated documents are available.
7. Edit intake after generation and confirm the saved generated documents remain unchanged until Generate is run again.
8. Preview multiple documents, search for a missing file name, clear the search, and confirm plain-text rendering.
9. Confirm exact `[MISSING: ...]` markers remain visible in incomplete generated documents.
10. Open Export before generation and confirm a clear blocked state and Generate action.
11. Open Export after generation and confirm 16 expected documents, 16 actual documents, valid folder mapping, manifests, warnings, and zero errors.
12. Use all three copy actions and confirm each copies content from the active project only.
13. Switch projects and confirm Export and copy actions use the newly active project.
14. Load corrupt storage and an invalid active project id and confirm safe recovery without a crash or blank page.
15. Confirm no relevant browser console errors during the complete workflow.

## Accessibility checklist

1. Navigate the complete workflow using keyboard only.
2. Confirm the skip link moves focus to the main landmark.
3. Confirm focus indicators are visible on navigation, project rows, stage controls, fields, copy actions, and Export.
4. Confirm heading order remains logical on Mission Control, Guided Intake, Documents, and Export.
5. Confirm every form field has a label, helper text, and associated error message.
6. Confirm required fields expose `aria-invalid` and errors are announced.
7. Confirm active navigation, active project, active intake stage, and selected document expose programmatic state.
8. Confirm Export and generation statuses are announced without moving focus.
9. Confirm icon-only visuals are hidden from assistive technology or have an accessible name.
10. Confirm text and controls remain readable at browser zoom.

## Responsive checklist

Test at `390 x 844`, `768 x 1024`, and `1440 x 1000`.

1. Confirm no page-level horizontal overflow.
2. Confirm primary navigation remains usable and New project remains reachable.
3. Confirm the intake stage rail can be reached and scrolled where needed.
4. Confirm recent projects remain contained within their scroll region.
5. Confirm document search, document list, and preview remain readable.
6. Confirm Export diagnostics, warnings, errors, and folder tree remain readable.
7. Confirm buttons remain at least 44 pixels high at tablet and mobile widths.
8. Confirm no critical action is clipped, overlapped, or hidden.

## Manual Windows ZIP verification checklist

This checklist has not been completed by automated or in-app browser testing.

1. Download the ZIP.
2. Open it in Windows Explorer.
3. Confirm the root folder is sanitized.
4. Confirm all 12 approved folders are present.
5. Confirm exactly 16 core Markdown documents are present.
6. Confirm `00_Project_Overview/EXPORT_MANIFEST.md` is present.
7. Confirm `project-manifest.json` is present.
8. Open representative files and confirm they render correctly.
9. Confirm `[MISSING: ...]` markers are preserved.
10. Confirm no unsafe path names exist.
11. Confirm the active project's identity and intake data appear in the documents.

## Deployment readiness checklist

1. Run `npm.cmd test`, `npm.cmd run build`, `npm.cmd audit`, and `git diff --check`.
2. Confirm no lint script exists or run it if one is added.
3. Confirm the production host and release owner are approved.
4. Confirm HTTPS, SPA fallback routing, cache headers, and security headers for the selected host.
5. Confirm no secrets or environment-specific credentials are present in the client bundle.
6. Confirm backup/export guidance for local-only project data is documented.
7. Record production smoke-test, rollback, and incident ownership steps.

## Known testing boundary

The in-app browser can block file downloads and clipboard access. Automated ZIP and clipboard tests cover those code paths, but Windows Explorer inspection must remain manual until it is actually performed.
