# Change Log

## 2026-06-28 — Phase 8: Testing and Deployment Readiness

### Summary

- Completed production-preview regression for project creation, minimum intake, refresh persistence, project switching, generation, document inspection/search, export diagnostics, and copy actions.
- Selected Cloudflare Pages as the approved MVP production host and documented the exact static Vite deployment settings.
- Verified a production-generated ZIP with Windows `Expand-Archive`, including all 12 folders, 16 core documents, both manifests, readable representative files, safe unique paths, active-project data, and missing markers.
- Added release, deployment, security-header, caching, rollback, and post-deployment smoke-test guidance without adding provider-specific configuration.
- Hardened skip-link behavior by making every main landmark programmatically focusable and explicitly focusing the active main landmark on activation.

### Files created

- `DEPLOYMENT_NOTES.md` — Cloudflare Pages settings, deployment checklist, static routing notes, persistence limitations, security/cache recommendations, rollback, and smoke testing.
- `RELEASE_NOTES.md` — MVP release scope, verification evidence, limitations, blockers, and recommended deployment action.

### Files updated

- `README.md`, `NEXT_STEPS.md`, `TEST_PLAN.md`, `CHANGE_LOG.md` — release readiness, Cloudflare Pages decision, verification evidence, and launch actions.
- `src/app/App.tsx` — explicit skip-link focus behavior.
- `src/components/MissionControl/MissionControl.tsx`, `src/components/IntakeBuilder/IntakeBuilder.tsx`, `src/components/DocumentViewer/DocumentViewer.tsx`, `src/components/ExportPanel/ExportPanel.tsx` — focusable main landmarks.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`11` files, `62` tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.
- No lint script exists in `package.json`.
- Production-preview regression passed at `390 x 844`, `768 x 1024`, and `1440 x 1000` with zero page-level horizontal overflow and zero browser warnings/errors.
- Windows technical ZIP extraction and content verification passed.

### Issues found

- Low: The skip link pointed at the correct landmark, but the main target was not programmatically focusable. Fixed across every rendered main view.

### Remaining work

- Assign the production release owner.
- Deploy the clean `main` branch to Cloudflare Pages and run the documented post-deployment smoke test.
- Complete the user-visible ZIP download and Windows Explorer inspection on the deployed site.
- Add a custom domain later if approved.
- Decide later whether package import belongs in a future version.

## 2026-06-28 — Phase 7: Review and Cleanup

### Summary

- Reviewed the complete local project workflow across Mission Control, intake, review, generation, documents, project switching, and export.
- Replaced automatic demo injection with an actionable empty state and guarded project-dependent navigation from blank screens.
- Standardized review statuses, migrated the legacy `Needs review` label, and kept review status separate from project status.
- Separated required questions from optional warnings and improved Review, Generate, Documents, and Export accessibility feedback.
- Consolidated canonical intake, status, folder, file, and path-sanitization sources without changing approved product behavior.

### Files created

- None.

### Files updated

- `src/app/App.tsx`, `src/app/useProjectBuilder.ts` — empty-state routing and removal of stale initialization/status logic.
- `src/types/project.ts`, `src/lib/storageVersion.ts`, `src/lib/projectRepository.ts`, `src/lib/projectSelectors.ts` — canonical status labels and legacy review-status migration.
- `src/components/MissionControl/MissionControl.tsx`, `src/components/IntakeBuilder/IntakeBuilder.tsx`, `src/components/DocumentViewer/DocumentViewer.tsx`, `src/components/ExportPanel/ExportPanel.tsx` — empty states, validation language, programmatic state, status announcements, and clear next actions.
- `src/lib/documentHelpers.ts`, `src/templates/documents/index.ts` — canonical path sanitization and generated file/folder list reuse.
- `src/styles/global.css` — visible document-search focus, mobile tap targets, review diagnostics, and empty-document styling.
- Repository, selector, helper, and application tests plus `README.md`, `APP_BLUEPRINT.md`, `NEXT_STEPS.md`, and `TEST_PLAN.md`.

### Files removed

- `src/components/ScopeReview/ScopeReview.tsx` — unreachable duplicate of the canonical Guided Intake Review stage.
- `src/data/intakeSteps.ts` — stale re-export replaced with direct use of `intakeStages.ts`.
- `src/data/statuses.ts` — unused duplicate project-status list.
- `src/lib/sanitizeProjectName.ts` — duplicate path helper consolidated into `documentHelpers.ts`.
- `src/tests/sanitizeProjectName.test.ts` — coverage consolidated into `documentHelpers.test.ts`.

### Testing completed

- `npm.cmd test` — passed (`11` files, `61` tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.
- In-app browser QA covered the end-to-end active-project workflow and the required mobile, tablet, and desktop viewport checks.

### Issues found

- High: Empty or corrupt storage silently created demo projects and project-dependent navigation could produce a blank screen. Fixed.
- High: Review status persisted as `Needs review` while UI copy used `Review needed`. Fixed with migration.
- Medium: Review summaries visually marked missing sections complete and mixed required questions with optional warnings. Fixed.
- Medium: A zero-result document search hid the list but retained the stale selected preview. Fixed with a clear searchable empty state.
- Medium: Duplicate status, intake, scope-review, generated-file, folder, and sanitization logic increased drift risk. Consolidated.
- Low: Document search lacked a visible focus treatment, some mobile controls were below the preferred tap height, and mobile navigation could hide Export behind horizontal scrolling. Fixed.

### Remaining work

- Phase 8: Testing and Deployment Readiness.
- Manual Windows ZIP opening and inspection remains incomplete.
- Production hosting remains an Architect decision.

## 2026-06-28 — Phase 6: Export Features Hardening

### Summary

- Added strict active-project export integrity validation for all 16 core generated documents.
- Added deterministic folder/file ordering, unsafe path rejection, duplicate detection, empty-content detection, and safe ZIP root normalization.
- Added `00_Project_Overview/EXPORT_MANIFEST.md` and expanded `project-manifest.json` diagnostics without changing the 16-core-file count.
- Blocked export before explicit package generation; export no longer auto-generates transient documents.
- Added compact Export status, warning/error diagnostics, last-attempt feedback, package tree details, and scoped copy actions.

### Files created

- `src/lib/exportIntegrity.ts` — export validation, missing-marker diagnostics, stable document ordering, and path checks.
- `src/lib/exportManifest.ts` — diagnostic manifest object and Markdown rendering.
- `src/tests/exportIntegrity.test.ts` — integrity gate coverage.
- `src/tests/exportManifest.test.ts` — manifest object and Markdown coverage.
- `src/tests/helpers/generatedProject.ts` — generated and large-project export fixtures.

### Files updated

- `src/lib/exportProjectPackage.ts` — deterministic verified archive construction and safe failure behavior.
- `src/app/useProjectBuilder.ts` — explicit generation/export separation.
- `src/app/App.tsx` — active project passed to Export and Generate-stage recovery routing.
- `src/components/ExportPanel/ExportPanel.tsx` — status, diagnostics, manifest visibility, and copy actions.
- `src/components/ui/Icons.tsx`, `src/styles/global.css` — scoped export UI support.
- Export and application tests plus `README.md`, `NEXT_STEPS.md`, and `TEST_PLAN.md`.

### Testing completed

- `npm.cmd test` — passed (`12` files, `60` tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- In-app browser verification covered blocked-before-generation and ready-with-warnings export states at desktop and mobile widths.

### Issues found

- Phase 5 export could use transient auto-generated documents before generation and silently rewrite unsafe paths. Both behaviors are removed.

### Remaining work

- Phase 7: Review and Cleanup.
- Manual Windows ZIP opening remains a release checklist item.

## 2026-06-28 — Phase 5: Mission Control Dashboard Hardening

### Summary

- Hardened Mission Control to derive active-project and recent-project dashboard data from pure selectors tied to persisted state.
- Added selector coverage for active project summary, recent project summaries, review status normalization, stage progress, dashboard warnings, next action details, and fallback-safe last updated labels.
- Improved dashboard reliability for project switching and active project rendering with null/empty safeguards.
- Added readiness section metadata with derived missing and warning counts.
- Preserved approved scope: no backend/auth/import/external AI and no major UI redesign.

### Files created

- None.

### Files updated

- `src/lib/projectSelectors.ts` — expanded dashboard selector surface and status/readiness/next-action hardening.
- `src/types/project.ts` — added dashboard summary/next-action/warning/stage progress types.
- `src/components/MissionControl/MissionControl.tsx` — switched to selector-driven rendering, warnings, active marker, and empty-state handling.
- `src/components/MissionControl/ReadinessPanel.tsx` — added missing/warning counts from readiness selector output.
- `src/app/useProjectBuilder.ts` — hardened active-project null safety and demo-seed flag handling.
- `src/app/App.tsx` — added mission control next-action routing and guarded project-dependent views.
- `src/lib/createProject.ts` — preserved blank persisted name with safe UI fallback behavior.
- `src/tests/projectSelectors.test.ts` — new selector coverage for active summary, sorting, warnings, stage progress, and next action targets.
- `src/tests/projectRepository.test.ts` — invalid activeProjectId recovery coverage.
- `src/tests/App.test.tsx` — updated accessibility-driven selection and active-project preview expectations.
- `src/tests/createProject.test.ts` — aligned safe-default naming expectation.
- `README.md`, `NEXT_STEPS.md`, `TEST_PLAN.md` — updated Phase 5 behavior and test coverage documentation.

### Testing completed

- `npm.cmd test` — passed (`10` files, `49` tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).

### Issues found

- None.

### Remaining work

- Phase 6: Export Features Hardening.
- Production hosting remains an Architect decision.

## 2026-06-28 — Phase 4: Document Generation Hardening

### Summary

- Hardened document generation across all 16 required markdown files using project-specific templates aligned to the expanded intake schema.
- Standardized folder mapping to approved package structure with `README.md`, `PROJECT_SCOPE.md`, `NEXT_STEPS.md`, and `CHANGE_LOG.md` under `00_Project_Overview`.
- Added shared document helpers for safe text handling, exact missing marker output, markdown lists/tables, date formatting, file normalization, and project folder sanitization.
- Hardened generation and export path safety so unsafe file name/path input cannot create unsafe ZIP paths.
- Preserved Phase 3 behavior: intake edits do not overwrite persisted generated documents until Generate is clicked again.

### Files created

- `src/lib/documentHelpers.ts` — shared markdown and safety helper functions for document generation.
- `src/data/generatedFiles.ts` — canonical generated file name list for validation tests.
- `src/tests/documentHelpers.test.ts` — helper behavior and safety tests.

### Files updated

- `src/templates/documents/index.ts` — complete template hardening rewrite for all required generated docs.
- `src/data/folderStructure.ts` — approved folder mapping updates.
- `src/lib/generateProjectPackage.ts` — project-driven template rendering and filename/folder safety hardening.
- `src/lib/exportProjectPackage.ts` — safe ZIP path normalization.
- `src/components/DocumentViewer/DocumentViewer.tsx` — preview empty-state message aligned with generation behavior.
- `src/components/ExportPanel/ExportPanel.tsx` — package tree aligned to folder-mapped README location.
- `src/tests/generateProjectPackage.test.ts` — expanded document quality and section coverage assertions.
- `src/tests/exportProjectPackage.test.ts` — updated mapping assertions and unsafe path coverage.
- `src/tests/projectRepository.test.ts` — regeneration replacement behavior coverage.
- `src/tests/App.test.tsx` — generated document count and active-project preview coverage.
- `README.md`, `NEXT_STEPS.md`, `TEST_PLAN.md` — Phase 4 behavior and test coverage documentation updates.

### Testing completed

- `npm.cmd test` — passed (`10` files, `44` tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).

### Issues found

- None.

### Remaining work

- Phase 5: Mission Control Dashboard Hardening.
- Production hosting remains an Architect decision.

## 2026-06-28 — Phase 3: Intake Flow Hardening

### Summary

- Introduced a single source of truth for intake stages in `src/data/intakeStages.ts` with required fields, optional fields, completion rules, and next-action labels.
- Hardened intake validation by section and returned full section results (`stageId`, `label`, `percentComplete`, `isComplete`, `missingFields`, `warnings`).
- Expanded `ProjectIntake` to capture Phase 3 requirements for foundation, users, features, data, workflows, and security details.
- Moved review and generate behavior into the guided intake flow so Review opens stage 7 and Generate opens stage 8.
- Updated persistence behavior so intake edits update only the active project and no longer clear generated documents.
- Allowed package generation when required fields are missing while preserving explicit missing markers in generated output.
- Added test coverage for intake stage config, section validation rules, continue-intake routing, stage switching data persistence, and generated-document retention after intake edits.

### Files created

- `src/data/intakeStages.ts` — canonical intake stage configuration with 8 stages and completion metadata.
- `src/tests/intakeStages.test.ts` — validation of stage order and stage metadata contract.

### Files updated

- `src/types/project.ts` — expanded intake schema and updated validation section result contract.
- `src/lib/createProject.ts` — updated empty intake defaults for new fields.
- `src/data/seedProject.ts` — seeded sample project with new intake fields.
- `src/data/intakeSteps.ts` — re-export from canonical `intakeStages` source.
- `src/lib/validateIntake.ts` — section-based validation, warnings, and next-incomplete logic.
- `src/lib/projectSelectors.ts` — adapted completion and next-action logic to new validation output.
- `src/lib/projectRepository.ts` — retained generated documents on intake edits and safer status update behavior.
- `src/lib/generateProjectPackage.ts` — removed generation blocking by required-field validation.
- `src/app/useProjectBuilder.ts` — always prepares package output from current intake.
- `src/app/App.tsx` — navigation mapping for Review/Generate stage entry points and intake stage actions.
- `src/components/IntakeBuilder/IntakeBuilder.tsx` — stage-aware navigation, Review summary panel, and Generate readiness panel with generation action.
- `src/tests/validateIntake.test.ts` — updated validation expectations and warning assertions.
- `src/tests/projectRepository.test.ts` — added generated-document retention and project isolation tests.
- `src/tests/generateProjectPackage.test.ts` — verifies generation with missing markers when required fields are incomplete.
- `src/tests/App.test.tsx` — added Continue Intake behavior, review/generate stage checks, and stage-switch persistence tests.
- `README.md`, `TEST_PLAN.md`, `NEXT_STEPS.md` — updated documentation for Phase 3 behavior.

### Testing completed

- `npm.cmd test` — passed (`9` files, `32` tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).

### Issues found

- None.

### Remaining work

- Phase 4: Document Generation Hardening.
- Production hosting remains an Architect decision.

## 2026-06-28 — Phase 2: Data Model and Persistence Hardening

### Summary

- Replaced single-project state with a normalized, versioned multi-project model.
- Added one persisted `activeProjectId`, repository CRUD, safe storage recovery, and a Phase 1 legacy-data migration.
- Connected Mission Control, intake updates, generated documents, status, readiness, timestamps, and export to the active persisted project.
- Removed hardcoded recent-project rows; demo records are seeded only for a brand-new empty store.

### Files created

- `src/lib/createProject.ts` — complete project factory and safe intake defaults.
- `src/lib/projectRepository.ts` — versioned multi-project localStorage repository.
- `src/lib/storageVersion.ts` — schema version and migration validation.
- `src/lib/projectSelectors.ts` — pure dashboard and readiness selectors.
- `src/lib/projectFields.ts` — normalized field access and updates.
- Persistence, factory, and selector test files under `src/tests/`.

### Files updated

- Project types, active-project hook, validation, generation, dashboard, intake, scope review, document templates, tests, and project documentation.

### Testing completed

- Automated Phase 2 model, repository, selector, generation, export, and UI tests.
- Production TypeScript/Vite build.
- Dependency audit.
- Built-in browser smoke testing for project creation, project switching, persistence, and responsive layout.

### Issues found

- The Phase 1 schema used a different single-project localStorage key. A one-time migration now moves valid legacy data into the version-1 multi-project store and removes the old key.

### Remaining work

- Phase 3: Intake Flow Hardening.
- Production hosting remains an Architect decision.

## 2026-06-28

### Summary

- Built the initial GPT Project Builder application foundation.
- Added Mission Control, eight-stage guided intake, scope review, documentation viewer, project generation, status tracking, and ZIP export.
- Added explicit missing-information markers and required-field blocking.
- Corrected developer instructions that had been placed in `.gitattributes` by moving them to `AGENTS.md`.

### Files changed

- Added React/Vite project configuration and source structure.
- Added typed project data, statuses, intake steps, folder definitions, and seed data.
- Added validation, sanitization, local storage, package generation, document templates, and ZIP export.
- Added responsive, keyboard-accessible application components and shared styles.
- Hid native scrollbars on horizontal mobile rails while preserving scrolling.
- Added automated tests and project documentation.

### Issues found

- The initial repository stored the developer instructions in `.gitattributes`, causing Git parse errors. Corrected.
- The initial dependency set included vulnerable older Vite/Vitest transitive packages. Updated to patched releases; audit now reports zero findings.
- Production hosting and multi-project persistence are not approved decisions.

### Testing completed

- `npm.cmd test`: 5 test files and 12 tests passed, including in-memory ZIP inspection.
- `npm.cmd run build`: production TypeScript/Vite build passed.
- `npm.cmd audit`: zero vulnerabilities after toolchain updates.
- Built-in browser at 1440×1000 and 390×844: page identity, meaningful render, console health, responsive overflow, intake-stage navigation, and document preview passed.
- Direct concept/render inspection: dashboard hierarchy, copy, palette, progress rail, table anatomy, readiness panel, and mobile collapse matched the approved direction.

### Remaining work

- Optional: inspect a downloaded ZIP in the operating-system download directory; archive contents are already verified in memory because the built-in browser runtime does not expose download artifacts.
- Resolve the product and deployment decisions in `NEXT_STEPS.md`.
