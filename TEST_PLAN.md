# Test Plan

## 2026-07-24 Dependency audit remediation and test-count correction

- Clean detached worktree started at baseline commit `0ed5692ae7e8c05f94f4074cf66581f694fe8e1a`.
- Node `20.19.5` was used for application validation, tests, coverage, build, and audit.
- npm `10.9.4` was used.
- `npm.cmd ci` passed.
- `npm.cmd run lint` passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` passed.
- Unit/integration validation passed with `29` files and `1490` tests.
- UI validation passed with `7` files and `51` tests.
- Combined validation passed with `36` files and `1541` tests.
- Coverage passed at `90.46%` statements, `81.66%` branches, `94.89%` functions, and `95.43%` lines.
- `npm.cmd run build` passed.
- `npm.cmd audit --audit-level=high` and `npm.cmd audit --json` passed with zero vulnerabilities.
- Wrangler `4.114.0` passed under Node `22.21.0`.
- Wrangler correctly refused Node `20.19.5` because it requires Node `>=22`.
- Baseline Wrangler `4.107.0` already had the same Node requirement.
- `package.json` was unchanged.
- Exactly five files were modified: `package-lock.json`, `scripts/run-tests.mjs`, `scripts/run-tests-with-coverage.mjs`, `CHANGE_LOG.md`, and `TEST_PLAN.md`.
- No application source or tests changed.
- Phase 5B.4C remained excluded.
- No deployment occurred.

## 2026-07-24 Phase 5B.4B.5.1 traceability, completion, and real-intake correction

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run --config vitest.unit.config.ts src/tests/phase5b4b5Regression.test.ts src/tests/exportIntegrity.test.ts src/tests/powerPlatform.test.ts --reporter=dot`: superseded by focused and full runner validation below.
- `npx.cmd vitest run --config vitest.unit.config.ts src/tests/implementationAssets.test.ts --reporter=dot`: passed (`1` file, `99` tests).
- `npx.cmd vitest run src/tests/phase5b4b5Regression.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `10` tests).
- `npx.cmd vitest run src/tests/App.documentsExport.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `12` tests).
- `npx.cmd vitest run src/tests/powerPlatform.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `57` tests).
- `npx.cmd vitest run src/tests/exportProjectPackage.test.ts src/tests/projectSelectors.test.ts --pool=vmThreads --maxWorkers=1`: passed (`2` files, `16` tests).
- `npm.cmd run lint`: passed.
- `npm.cmd test`: passed (`29` unit/integration files, `1490` unit/integration tests, `7` UI files, `51` UI tests, `36` combined files, `1541` tests).
- `npm.cmd run test:coverage`: passed (`29` coverage files, `1490` tests, `7` App UI files, `51` tests, `36` combined files, `1541` tests); coverage was `90.4%` statements, `81.34%` branches, `94.93%` functions, and `95.45%` lines.
- Count correction: the earlier higher count came from a dirty working-tree validation. The isolated baseline commit established `29` files / `1490` tests as the authoritative unit/integration result; no application test was removed by this correction.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `git diff --check`: passed with line-ending warnings only.
- `npm.cmd audit --audit-level=high`: failed on existing high-severity transitive advisories with no npm fix available (`brace-expansion` via ESLint tooling and `sharp` via Wrangler/Miniflare).
- Structured-data regression coverage verifies confirmed Canvas list/library/resource expected-record counts take precedence over prose summaries and contradictory prose is surfaced as a review note.
- Canvas create/view-edit document coverage verifies save/cancel controls and selected-record state are derived from confirmed structured control/state-variable rows.
- File applicability coverage verifies attachments/files documents render explicit Not Applicable language when file support is confirmed not applicable and require confirmed upload/download controls when files are applicable.
- SharePoint schema coverage verifies site URL, title, owner, access status, list rows, column rows, library rows, and structured authoritative notes are required or rendered from stored intake.
- Readiness coverage verifies SharePoint schema, detailed testing preparation, delegation planning, ALM, control inventory, blank markdown sections, and orphan missing markers participate in generated-package/export readiness.
- UI coverage verifies document preview still displays sanitized markdown content while the missing-marker source trace panel can show duplicate marker text without breaking the document preview.
- Real TTI import and migration validation passed for `TTI Software Licence Tracker` (`90e589f4-3ead-4b3f-adff-477c9fe75394`).
- Mission Control duplication passed for `TTI Software Licence Tracker - Phase 5B.4B.5.1 QA` (`f4c8caf1-8aa2-4a71-97d8-f3384cc17d4b`).
- Original and duplicate persistence after reload passed.
- UI regeneration passed for the QA duplicate, producing `33` generated documents.
- Before-and-after diagnostics were recorded: answer completion `94%` to `94%`, readiness `Draft` to `Draft`, missing-marker occurrences `21` to `17`, export warnings `3` to `4`, readiness blockers `13` to `15`, remaining marker occurrences `17`, and unique marker labels `15`.
- Complete marker review documented all `17` remaining occurrences with `0` orphan markers, `0` targeted false markers, and `0` false blank-section warnings.
- Browser smoke QA at `1280 x 720` confirmed app load, Mission Control rendering, export route guarded state, export diagnostics, no horizontal overflow, and no console warnings or errors.
- Browser smoke QA at `390 x 844` confirmed mobile Mission Control rendering, visible navigation, no horizontal overflow, and no console warnings or errors.
- Final desktop QA at `1280 x 720` passed with trace-panel content and marker-source controls usable, no page-level horizontal overflow, no console errors or warnings, no React key warnings, and no accessibility warnings observed.
- Final mobile QA at `390 x 844` passed with trace-panel content and marker-source controls usable, no page-level horizontal overflow, no console errors or warnings, no React key warnings, and no accessibility warnings observed.
- Console inspection passed with no errors or warnings.
- Edit source routing and focus placement passed.
- Physical keyboard QA in normal Chrome passed: Enter activated Add state variable and added exactly one state row; Space activated Add state variable and added exactly one state row; visible focus passed; console errors or warnings were `None`.
- No keyboard workaround was required because the earlier Add state variable activation failure was limited to the browser-automation harness.

## 2026-07-20 Project Builder Ai brand rename and logo integration

- `git diff --check`: passed with line-ending warnings only.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd test`: passed (`28` unit/integration files, `1480` unit/integration tests, `7` UI files, `51` UI tests, `35` combined files, `1531` combined tests).
- `npm.cmd run test:coverage`: passed (`28` coverage files, `1480` coverage tests, `7` UI files, `51` UI tests, `35` combined files, `1531` combined tests); coverage was `90.43%` statements, `81.48%` branches, `95.06%` functions, and `95.45%` lines.
- `npm.cmd run build`: passed with the existing unchanged Vite large-chunk warning.
- `npm.cmd audit --audit-level=high`: passed with `0` vulnerabilities.
- Browser metadata coverage verifies the page title is `Project Builder Ai` and `index.html` contains the required favicon, Apple touch icon, and product-description references.
- Navigation coverage verifies the horizontal Project Builder Ai logo renders with useful alt text, the obsolete `</>` mark is absent, and the former visible product name is no longer displayed in navigation.
- Welcome coverage verifies the stacked Project Builder Ai logo renders, the welcome copy describes AI-assisted handoff output, the copy does not imply an embedded AI model, and the first-run Create New Project flow still opens Guided Intake.
- Storage compatibility coverage verifies `gpt-project-builder.storage.v2`, `gpt-project-builder.storage.v1`, and `gpt-project-builder:project:v1` remain unchanged and current saved records are not rewritten while loading.
- Generated-document coverage verifies current product references use Project Builder Ai while GPT Architect and Codex Developer workflow terms remain present.
- Build-output inspection confirmed logo files are emitted under `dist/branding/` and favicon/touch-icon files are emitted at the dist root.
- Desktop browser QA at `1280 x 720` confirmed the horizontal logo fits the sidebar at about `203 x 47` pixels, the stacked welcome logo renders at about `260 x 196` pixels, the title is correct, no page-level overflow exists, and no console warnings or errors were recorded.
- Mobile browser QA at `390 x 844` confirmed the horizontal logo fits the mobile header at about `190 x 44` pixels, the stacked welcome logo renders at about `250 x 189` pixels, Create New Project remains visible, navigation remains present, no page-level overflow exists, and no console warnings or errors were recorded.
- Saved-project compatibility was covered by automated repository tests. The local browser profile used for manual QA did not contain existing saved projects.

## 2026-07-20 Phase 5B.4B.4 Canvas envelope structural validation

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `154` tests).
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `156` tests).
- `npx.cmd vitest run src/tests/App.powerPlatformCanvas.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `9` tests).
- `npx.cmd vitest run --config vitest.unit.config.ts`: passed (`28` files, `1478` tests).
- `npm.cmd test`: passed (`28` unit/integration files, `1478` unit/integration tests, `7` UI files, `48` UI tests, `35` combined files, `1526` combined tests).
- `npm.cmd run test:coverage`: passed (`28` coverage files, `1478` coverage tests, `7` UI files, `48` UI tests, `35` combined files, `1526` combined tests); coverage was `90.43%` statements, `81.48%` branches, `95.06%` functions, and `95.45%` lines.
- `npm.cmd run build`: passed with the existing unchanged Vite large-chunk warning.
- `npm.cmd audit --audit-level=high`: passed with `0` vulnerabilities.
- Canvas-envelope coverage verifies partial Canvas envelopes block before lifecycle target validation when required collections are missing, null, primitive, or contain non-object records.
- Connector-envelope coverage verifies `powerPlatform.common.connectors` must be an array of objects before planning validation can run.
- Lifecycle-collection coverage verifies `recordLifecycleTargets` may be undefined, empty, or an array of objects; primitive, object, null-entry, and primitive-entry storage blocks.
- Valid empty-target coverage verifies structurally valid Canvas projects with empty or undefined lifecycle targets return Not Applicable with no blockers and no required lifecycle decisions.
- Regression coverage verifies valid Canvas lifecycle targets still produce Planned output and recognized non-Canvas project types still return Not Applicable.
- Mutation and determinism coverage verifies malformed Canvas envelopes do not mutate input and repeated malformed input returns identical blocked results.
- UI regression coverage remains intact for SharePoint Add List, SharePoint Add Column, and Canvas Subtype behavior; the UI source/test files were not modified by this correction.
- Normal runner summaries are now `28` unit/integration files and `1478` tests, plus `7` App UI files and `48` tests, for `35` files and `1526` tests total.
- Coverage runner summaries are now `28` coverage files and `1478` tests, plus `7` App UI files and `48` tests, for `35` files and `1526` tests total.

## 2026-07-20 Phase 5B.4B.3 runtime envelope discrimination correction

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `124` tests).
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `156` tests).
- `npx.cmd vitest run src/tests/App.powerPlatformCanvas.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `9` tests).
- `npx.cmd vitest run --config vitest.unit.config.ts`: passed (`28` files, `1448` tests).
- `npm.cmd test`: passed (`28` unit/integration files, `1448` unit/integration tests, `7` UI files, `48` UI tests, `35` combined files, `1496` combined tests).
- `npm.cmd run test:coverage`: passed (`28` coverage files, `1448` coverage tests, `7` UI files, `48` UI tests, `35` combined files, `1496` combined tests); coverage was `90.41%` statements, `81.44%` branches, `95.06%` functions, and `95.45%` lines.
- `npm.cmd run build`: passed with the existing unchanged Vite large-chunk warning.
- `npm.cmd audit --audit-level=high`: passed with `0` vulnerabilities.
- Internal-discrimination coverage verifies top-level `planningStatus`, `plans`, `targets`, `orderedTargets`, `blockingIssues`, `result`, and `kind` properties cannot replace trusted planning results.
- Extra-property coverage verifies valid Canvas planning output remains unchanged when unknown result-like project properties exist.
- Project-type coverage verifies blank, whitespace-only, unsupported, and formula-looking app types block without throwing, while every canonical recognized non-Canvas project type remains Not Applicable.
- Canvas app type coverage verifies `powerAppsCanvas` continues through lifecycle planning validation and remains Planned for valid target input.
- Identity coverage verifies missing, null, primitive, blank, whitespace-only, and non-string IDs and project names block without partial output.
- Mutation and determinism coverage verifies invalid app types and identity failures do not mutate input and repeated invalid input returns identical blocked results.
- UI regression coverage remains intact for SharePoint Add List, SharePoint Add Column, and Canvas Subtype behavior; the UI source/test files were not modified by this correction.
- Normal runner summaries are now `28` unit/integration files and `1448` tests, plus `7` App UI files and `48` tests, for `35` files and `1496` tests total.
- Coverage runner summaries are now `28` coverage files and `1448` tests, plus `7` App UI files and `48` tests, for `35` files and `1496` tests total.

## 2026-07-20 Phase 5B.4B.2 top-level runtime safety correction

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run --config vitest.unit.config.ts`: passed (`28` files, `1402` tests).
- `npm.cmd run lint`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `156` tests).
- `npx.cmd vitest run src/tests/App.powerPlatformCanvas.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `9` tests).
- Top-level project-envelope coverage verifies null, undefined, string, numeric, Boolean, array, empty object, missing intake, null intake, primitive intake, missing app type, non-string app type, malformed project identity, malformed Power Platform envelope, and malformed Canvas envelope inputs block without throwing.
- Controlled-result coverage verifies malformed project input returns Blocked, not Not Applicable; returns no partial plans, targets, or ordered targets; includes a deterministic blocking issue; and marks lifecycle planning as not required.
- Non-Canvas coverage verifies structurally valid non-Canvas projects remain Not Applicable with no blocking issues.
- Canvas regression coverage verifies valid Canvas projects still produce Planned lifecycle output.
- Mutation and determinism coverage verifies malformed inputs are not mutated and repeated malformed input produces identical results.
- Type cleanup coverage verifies lifecycle `entityType` uses the corrected Canvas record lifecycle entity category type while `backendType` continues using Canvas data-source types.
- Record-context source typing now uses a controlled source union while preserving existing runtime values.
- UI regression coverage remains intact for SharePoint Add List, SharePoint Add Column, and Canvas Subtype behavior.
- Normal runner summaries are now `28` unit/integration files and `1402` tests, plus `7` App UI files and `48` tests, for `35` files and `1450` tests total.
- Coverage runner summaries are now `28` coverage files and `1402` tests, plus `7` App UI files and `48` tests, for `35` files and `1450` tests total.
- `npm.cmd test`: passed (`28` unit/integration files, `1402` unit/integration tests, `7` UI files, `48` UI tests, `35` combined files, `1450` combined tests).
- `npm.cmd run test:coverage`: passed (`28` coverage files, `1402` coverage tests, `7` UI files, `48` UI tests, `35` combined files, `1450` combined tests); coverage was `90.35%` statements, `81.36%` branches, `95.06%` functions, and `95.43%` lines.
- `npm.cmd run build`: passed with the existing unchanged Vite large-chunk warning.
- `npm.cmd audit --audit-level=high`: passed with `0` vulnerabilities.
- Final review ZIP and extracted-package validation are recorded in the Phase 5B.4B.2 commit-gate report.

## 2026-07-20 Phase 5B.4B.1 lifecycle planning and intake UI corrections

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `60` tests).
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `156` tests).
- `npx.cmd vitest run src/tests/App.powerPlatformCanvas.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `9` tests).
- `npm.cmd test`: passed (`28` unit/integration files, `1384` unit/integration tests, `7` UI files, `48` UI tests, `35` combined files, `1432` combined tests).
- `git diff --check`: passed with line-ending warnings only.
- Planning correction coverage verifies archive and restore plans contain only `validateRecordContext`, `validateCurrentLifecycleState`, and `performConnectorMutation`; delete plans contain only `validateRecordContext` and `performConnectorMutation`.
- Optional-behaviour coverage verifies refresh, navigation, notification, and local-state behaviours are explicitly `notPlanned` and do not produce refresh, navigation, notification, or local-state action steps without approved input decisions.
- Canonical ownership coverage verifies lifecycle planning reuses active Canvas entity references, preserves connector reconciliation blockers, blocks target/canonical connector mismatches, blocks ambiguous compatible connectors, and produces no partial plans after ownership failures.
- Backend coverage verifies SharePoint list, SharePoint library, Microsoft Lists, Dataverse, and connector-resource plans preserve separate `entityType` and resolved connector `backendType` values.
- SharePoint List UI coverage verifies Add List appears once at the bottom, remains available for empty collections, Remove List remains at the top of each card, and list values persist after adding.
- SharePoint Column UI coverage verifies Add Column appears once at the bottom, remains available for empty collections, Remove Column remains at the top of each card, and column/internal-name values persist after adding.
- Canvas Subtype UI coverage verifies the field is enabled for Canvas apps, has a connected accessible label, supports every approved subtype option, updates canonical state, persists through section navigation and reload, renders existing saved values, preserves legacy blank editability, and remains hidden for unrelated project types.
- Accessibility coverage verifies moved Add List/Add Column actions remain buttons, remove buttons retain clear names, Canvas Subtype exposes a labelled combobox value, and automated focusability remains intact.
- Manual SharePoint Lists verification passed: Add List appeared once below the final list card, remained available when no list records existed, Remove List appeared at the top of every list card, multiple lists could be added without returning to the section heading, and existing list values persisted after adding and removing another list.
- Manual SharePoint Columns and Internal Names verification passed: Add Column appeared once below the final column card, remained available when no column records existed, Remove Column appeared at the top of every column card, multiple columns could be added without returning to the section heading, and existing display/internal-name values persisted after adding and removing another column.
- Manual Canvas Subtype verification passed: Canvas Subtype accepted mouse selection and native select keyboard interaction, selected values remained after section navigation and after saving/reopening the project, existing saved values displayed correctly, and the field remained unavailable for unrelated project types.
- Normal runner summaries are now `28` unit/integration files and `1384` tests, plus `7` App UI files and `48` tests, for `35` files and `1432` tests total.
- Coverage runner summaries are now `28` coverage files and `1384` tests, plus `7` App UI files and `48` tests, for `35` files and `1432` tests total.
- Coverage, build, audit, extracted-package validation, commit, and push remain deferred by Architect instruction for this correction.

## 2026-07-20 Phase 5B.4B Canvas record lifecycle action planning

- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `56` tests).
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `156` tests).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd test`: passed (`28` unit/integration files, `1380` unit/integration tests, `7` UI files, `43` UI tests, `35` combined files, `1423` combined tests).
- `git diff --check`: passed with line-ending warnings only.
- Planning-model coverage verifies typed records for stable plan ID, lifecycle target ID, action type, trigger screen/control/property, record context source, entity/backend/connector, lifecycle strategy, lifecycle field metadata, target and expected lifecycle values, connector operation, confirmation requirement, preconditions, ordered steps, outcomes, refresh/navigation/notification requirements, deterministic ordering key, controlled status, blockers, and notes.
- Archive planning coverage verifies status-field, active-flag, archived-flag, and soft-delete-flag plans; missing lifecycle fields; wrong field type; already-archived precondition modeling; missing update capability; and invalid record context blocking.
- Restore planning coverage verifies status-field, active-flag, archived-flag, and soft-delete-flag plans; archive/restore strategy consistency; record-archived precondition modeling; missing update capability; and invalid entity ownership blocking.
- Delete planning coverage verifies permanent-delete plans remain separate from archive/restore planning, require `archiveStrategy: notApplicable`, require explicit permanent-delete approval, require compatible delete capability, and do not silently downgrade to soft delete or reuse archive strategies.
- Connector ownership coverage verifies zero, one, and multiple compatible active connector outcomes; explicit connector-resource ownership; malformed connector-selection storage; and preserved reconciliation blockers.
- Runtime-safety coverage verifies malformed lifecycle collections, target records, IDs, action types, connector records, controls, fields, and current project shape block without throwing.
- Deterministic behavior coverage verifies stable ordering, array reorder stability, duplicate target/plan identity blocking, no partial plans on failure, repeated execution equality, and input mutation protection.
- Boundary coverage verifies no implementation asset, no Power Fx formula text, no `.fx` file, no Canvas YAML, no model-driven source, no connector/entity data-reading implementation, no UI/export integration, and no lifecycle formula generation.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `28` files and `1380` tests, plus `7` App UI files and `43` tests, for `35` files and `1423` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `28` files and `1380` tests, plus `7` App UI files and `43` tests, for `35` files and `1423` tests total.
- Coverage, build, audit, extracted-package validation, commit, and push remain deferred by Architect instruction for this phase.

## 2026-07-20 Phase 5B.4A.3 connector-selection shape and ownership safety

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `156` tests).
- Connector-selection coverage verifies malformed `secondaryConnectorIds`, `selectedDataSourceTypes`, `primaryConnectorId`, and `primaryDataSourceType` block without throwing before connector reconciliation can derive active ownership.
- Reconciliation coverage verifies valid connector-selection storage still calls the canonical reconciliation path and preserves reconciliation blockers in lifecycle validation results.
- Boundary coverage verifies malformed connector-selection evidence cannot become Not Applicable, cannot be interpreted as empty valid selection evidence, and cannot create a partial active connector set.
- Normal runner summaries have been updated for the expanded focused file: unit/integration execution is now `27` files and `1324` tests, plus `7` App UI files and `43` tests, for `34` files and `1367` tests total.
- Coverage runner summaries have been updated for the expanded focused file: coverage execution is now `27` files and `1324` tests, plus `7` App UI files and `43` tests, for `34` files and `1367` tests total.
- Full tests, coverage, build, audit, and extracted-package validation remain deferred to the Phase 5B.4A commit gate by Architect instruction.

## 2026-07-20 Phase 5B.4A.2 ownership record safety and canonical entity ownership

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `124` tests).
- Ownership record coverage verifies missing, undefined, null, numeric, object, blank, path-like, and formula-looking form-operation submit-control IDs and form-mode trigger-control IDs block instead of being discarded from reserved ownership sets.
- Entity ownership coverage verifies SharePoint list, SharePoint library, and Dataverse table schemas use canonical implicit ownership: zero compatible active connectors block, exactly one active compatible connector must match the lifecycle target connector, and multiple active compatible connectors block as ambiguous even when the target names one connector.
- Connector-resource coverage verifies explicit stored connector ownership is preserved and different, inactive, missing, or incompatible owners block.
- Boundary coverage verifies no implementation asset, lifecycle Power Fx, `.fx` file, Canvas YAML, model-driven source, UI/export integration, or Phase 5B.4B planning.
- Normal runner summaries have been updated for the expanded focused file: unit/integration execution is now `27` files and `1292` tests, plus `7` App UI files and `43` tests, for `34` files and `1335` tests total.
- Coverage runner summaries have been updated for the expanded focused file: coverage execution is now `27` files and `1292` tests, plus `7` App UI files and `43` tests, for `34` files and `1335` tests total.
- Full tests, coverage, build, audit, and extracted-package validation remain deferred to the Phase 5B.4A commit gate by Architect instruction.

## 2026-07-19 Phase 5B.4A.1 delete strategy consistency and current-project shape safety

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `98` tests).
- Delete consistency coverage verifies all delete actions require `archiveStrategy: notApplicable`; soft-delete targets cannot carry `statusField`, `activeFlag`, `archivedFlag`, or `softDeleteFlag`; permanent-delete and missing-decision delete targets also block contradictory archive strategies.
- Current-project shape coverage verifies malformed `screenTargets`, `controlTargets`, `stateVariableTargets`, `formOperationTargets`, `formModeTargets`, `recordLifecycleTargets`, schema collections, field collections, and `powerPlatform.common.connectors` block safely without throwing.
- Ownership safety coverage verifies malformed form-operation and form-mode collections cannot become valid empty ownership sets, while genuine valid empty ownership arrays remain permitted.
- Boundary coverage verifies no implementation asset, lifecycle Power Fx, `.fx` file, Canvas YAML, model-driven source, UI/export integration, or Phase 5B.4B planning.
- Normal runner summaries have been updated for the expanded focused file: unit/integration execution is now `27` files and `1266` tests, plus `7` App UI files and `43` tests, for `34` files and `1309` tests total.
- Coverage runner summaries have been updated for the expanded focused file: coverage execution is now `27` files and `1266` tests, plus `7` App UI files and `43` tests, for `34` files and `1309` tests total.
- Full tests, coverage, build, audit, and extracted-package validation remain deferred to the Phase 5B.4A commit gate by Architect instruction.

## 2026-07-19 Phase 5B.4A Canvas record lifecycle action target model

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `67` tests).
- Lifecycle target coverage verifies typed archive, restore, and delete target normalization; canonical Canvas storage defaults; legacy missing storage; malformed raw input blocking; deterministic ordering; and mutation safety.
- Validation coverage verifies target ID safety, trigger button ownership, screen resolution, connector/entity resolution, record context references, archive/restore strategy compatibility, delete strategy safety, destructive-action evidence, archive/restore pair consistency, duplicate detection, and malformed input no-throw behavior.
- Boundary coverage verifies no implementation asset, no Power Fx generation, no `.fx` file, no record-selection expression, no connector/entity data reads, no Canvas YAML, no model-driven source, no UI/export integration, and no Phase 5B.4B planning.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `27` files and `1235` tests, plus `7` App UI files and `43` tests, for `34` files and `1278` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `27` files and `1235` tests, plus `7` App UI files and `43` tests, for `34` files and `1278` tests total.
- Full tests, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.4A commit gate by Architect instruction.

## 2026-07-19 Phase 5B.3F controlled Canvas form-mode Power Fx generation

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formModePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `53` tests).
- Generation-result coverage verifies `Generated`, `Blocked`, and `Not Applicable` results keep fragments/checksums present only when generation succeeds.
- Source-asset coverage verifies the canonical `asset-canvas-powerfx-form-mode-actions` planning asset is required, unique, current-project-bound, canonical-identity-bound, approved, Ready for Export, checksum-valid, dependency-current, gate-current, and structured-input-current.
- Formula coverage verifies `new` targets generate exactly `NewForm(validFormIdentifier)\n`, `edit` targets generate exactly `EditForm(validFormIdentifier)\n`, multiple targets remain separate ordered fragments, formulas contain no semicolon, comments, Markdown, prose, traceability, placeholders, or unsupported Power Fx tokens.
- Safety coverage verifies missing, stale, unsafe, malformed, wrong-screen, wrong-type, reused trigger, malformed registry, malformed graph, malformed dependency, and malformed state-derivation inputs block safely without throwing.
- Checksum coverage verifies deterministic fragment checksums and top-level checksums bind project ID, source planning checksum, target IDs, actions, screen, trigger, form, intended paths, formulas, and generation version while timestamps remain checksum-neutral.
- Boundary coverage verifies no formula execution, no `.fx` files, no Canvas YAML, no model-driven source, no connector/entity data reads, no UI/export integration, and no Phase 5B.4 behavior.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `26` files and `1168` tests, plus `7` App UI files and `43` tests, for `33` files and `1211` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `26` files and `1168` tests, plus `7` App UI files and `43` tests, for `33` files and `1211` tests total.
- Full tests, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3F commit gate by Architect instruction.

## 2026-07-19 Phase 5B.3E.2 safe exported registry and graph boundaries

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formModePlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `84` tests).
- `npx.cmd vitest run src/tests/formModeTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `67` tests).
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `85` tests).
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `63` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `55` tests).
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `97` tests).
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `175` tests).
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests).
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- `git diff --check`: passed with line-ending warnings only.
- Registry-envelope coverage verifies null, primitive, array, missing `registry.assets`, null `registry.assets`, primitive `registry.assets`, object `registry.assets`, null asset entries, primitive asset entries, and partial asset records return controlled issues identifying `registry.assets` without throwing.
- Exported graph coverage verifies malformed asset identities and malformed dependency arrays/records are converted into blocked semantic issues before sorting, indexing, dependency duplicate detection, cycle traversal, or generation-order calculation.
- Exported dependency/state coverage verifies malformed runtime asset arrays, malformed asset entries, malformed nested form-mode evidence, and stale approvals do not throw, cannot become Ready for Export, and preserve semantic blocking issues.
- Valid graph regression coverage verifies duplicate path/dependency detection, circular dependency detection, deterministic generation order, and existing registry regressions remain intact.
- Normal runner summaries have been updated for the expanded focused file: unit/integration execution is now `25` files and `1115` tests, plus `7` App UI files and `43` tests, for `32` files and `1158` tests total.
- Coverage runner summaries have been updated for the expanded focused file: coverage execution is now `25` files and `1115` tests, plus `7` App UI files and `43` tests, for `32` files and `1158` tests total.
- Full test orchestration, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the final Phase 5B.3E commit gate by Architect instruction.

## 2026-07-19 Phase 5B.3E.1 registry safety and nested input validation

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formModePlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests).
- Registry shape coverage verifies `dependencies`, `requiredGateIds`, `gateEvaluationSnapshot`, `sourceRecordIds`, `connectorIds`, `entityIds`, `fieldIds`, `blockingIssues`, `manualInstallationRequirements`, `validationRequirements`, and `knownLimitations` must be arrays before downstream evaluation.
- Dependency-record coverage verifies every dependency must be a non-null object with string IDs/labels/reasons/source sections, known dependency type, Boolean `required`/`resolved`, string optional target IDs/blocking issues, and object relationship context.
- Gate-record coverage verifies required gate IDs and gate snapshots must be arrays of known gate IDs/statuses with string labels/reasons/source sections and Boolean `passed`; unknown gate data blocks before evaluator calls.
- Nested form-mode input coverage verifies `generationInputs.formModeTargets` must be an array and each entry must include valid IDs, action, trigger, trigger/control/screen/form names, edit context, Boolean required flag, finite numeric sort order, and canonical safe intended path.
- Unrelated-asset coverage verifies malformed `formModeTargets` on non-canonical assets are identified semantically, including `action: delete`, unsupported trigger, unsupported edit context, missing IDs, non-string names, malformed sort orders, unsafe paths, duplicate paths, null/primitive/partial entries, and non-array target storage.
- Planning content coverage verifies dynamic `Project ID: <current project ID>`, `Project name: <current project name>`, and `Form-mode action count: <number>` appear in source content and remain checksum-bound while timestamp-neutral.
- Controlled failure coverage verifies malformed registry conditions return controlled issues, block acceptance, prevent stale approval, do not throw, do not become `Not Applicable`, do not reach malformed dependency/gate evaluation, and do not generate executable output.
- Normal runner summaries have been updated for the expanded focused file: unit/integration execution is now `25` files and `1090` tests, plus `7` App UI files and `43` tests, for `32` files and `1133` tests total.
- Coverage runner summaries have been updated for the expanded focused file: coverage execution is now `25` files and `1090` tests, plus `7` App UI files and `43` tests, for `32` files and `1133` tests total.
- Full test orchestration, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the final Phase 5B.3E commit gate by Architect instruction.

## 2026-07-18 Phase 5B.3E Canvas form-mode action planning

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formModePlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `33` tests).
- `npx.cmd vitest run src/tests/formModeTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `67` tests).
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `85` tests).
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `63` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `55` tests).
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `97` tests).
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `175` tests).
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests).
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- `git diff --check`: passed with line-ending warnings only.
- Planning asset coverage verifies valid single new-mode and edit-mode targets, multiple targets in one combined asset, unmerged structured entries, canonical target ordering, input-order determinism, explicit project identity (`project-unique-742` / `Unique Project 742`), exact asset ID, target ID, operation, approved property, planning path, and generation version.
- Source planning asset coverage verifies the canonical form-operation planning asset is required, must be approved, must be Ready for Export, must belong to the current project, must retain the canonical identity, and stale, missing, duplicate, malformed, unapproved, or non-ready source evidence blocks safely.
- Structured input coverage verifies each form-mode action preserves form-mode target ID, form-operation target ID, action, trigger, trigger control ID and approved name, screen ID and approved name, form-control ID and approved name, edit-record context status, required flag, sort order, and intended future path.
- Path coverage verifies repository-relative forward-slash paths, current screen/trigger IDs, `OnSelect.form-mode.fx` suffix, duplicate path blocking, parent traversal blocking, absolute path blocking, and backslash blocking without writing `.fx` files.
- Dependency and gate coverage verifies source-asset, screen, form-control, trigger-control, and gate dependencies are unique, deterministic, and use the same canonical nine-gate set as form-operation planning.
- Applicability coverage verifies blocked form-mode validation creates no new planning asset, not-applicable current targets create no asset when no stale asset exists, and stale stored planning assets block after target removal.
- Checksum and approval coverage verifies target removal, trigger rename, form rename, action changes, sort-order changes, path changes, source checksum changes, and stale approved checksums invalidate readiness while timestamps remain checksum-neutral.
- Registry and mutation coverage verifies malformed unrelated registry assets block safely, unknown gate IDs/statuses do not throw, project input and registry input are not mutated, and existing assets/dependencies remain immutable.
- Phase-boundary coverage verifies one combined non-executable planning asset only; no executable `NewForm`, `EditForm`, `ResetForm`, `ViewForm`, `SubmitForm`, `Patch`, `Navigate`, `Notify`, `Set`, `UpdateContext`, `ClearCollect`, `Collect`, or `Clear` formula; no formula fragment; no `.fx` file; no Canvas YAML; no model-driven source; no UI/export integration; no form-mode Power Fx generation; and no Phase 5B.4 behavior.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `25` files and `1064` tests, plus `7` App UI files and `43` tests, for `32` files and `1107` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `25` files and `1064` tests, plus `7` App UI files and `43` tests, for `32` files and `1107` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3E commit gate by Architect instruction.

## 2026-07-18 Phase 5B.3D.1 trigger ownership and malformed control safety

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formModeTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `67` tests).
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `85` tests).
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `63` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `55` tests).
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `97` tests).
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `175` tests).
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests).
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- `git diff --check`: passed.
- Submit-control ownership coverage verifies a form-mode trigger cannot reuse the referenced form-operation submit button or another current valid form-operation submit button, while distinct new-mode and edit-mode trigger buttons still pass.
- Trigger-control name coverage verifies missing, undefined, null, non-string, blank, punctuated, and formula-looking approved implementation names block safely without implicit RegExp coercion or repair.
- Trigger-control type coverage verifies missing, undefined, null, non-string, empty, and unsupported control types block without throwing.
- Current-control safety coverage verifies malformed current screen IDs and confirmation statuses return controlled blocked results and preserve existing same-screen, confirmed-control, button-type, and valid-name requirements.
- Raw-shape coverage verifies missing `required`, non-Boolean `required`, missing `sortOrder`, string `sortOrder`, null `sortOrder`, and infinite `sortOrder` block, while complete valid raw records remain valid.
- Regression coverage verifies existing action mapping, edit-context, duplicate detection, deterministic ordering, mutation safety, no implementation asset creation, no Power Fx formula generation, no `.fx` file creation, later form-mode planning/generation absence, and Phase 5B.4 absence remain intact.
- Normal runner summaries have been updated for the expanded focused file: unit/integration execution is now `24` files and `1031` tests, plus `7` App UI files and `43` tests, for `31` files and `1074` tests total.
- Coverage runner summaries have been updated for the expanded focused file: coverage execution is now `24` files and `1031` tests, plus `7` App UI files and `43` tests, for `31` files and `1074` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3D commit gate by Architect instruction.

## 2026-07-18 Phase 5B.3D Canvas form-mode action target model

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formModeTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `39` tests).
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `85` tests).
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `63` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `55` tests).
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `97` tests).
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `175` tests).
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests).
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- `git diff --check`: passed.
- Form-mode model coverage verifies new Canvas project defaults, legacy missing storage normalization, empty storage `Not Applicable`, non-array storage blocking, primitive record blocking, partial record blocking, valid new-mode normalization, and valid edit-mode normalization.
- Raw-input coverage verifies unsupported actions, unsupported triggers, empty and unsafe target IDs, incomplete meaningful records, invalid record-context statuses, invalid confirmation statuses, invalid required values, and malformed meaningful data block safely instead of becoming `Not Applicable`.
- Binding coverage verifies form-mode targets reuse `validateCanvasFormOperationTargets(project)`, block missing or blocked form-operation targets, preserve existing Phase 5B.3A validation boundaries, and do not recreate or weaken form-operation validation.
- Action and context coverage verifies create operations map only to `new`, edit operations map only to `edit`, new actions require `notRequired`, edit actions require `confirmedExistingItemBinding`, and `missingDecision` blocks for edit targets.
- Trigger-control coverage verifies missing, cross-screen, unconfirmed, non-button, icon, and invalid implementation-name trigger controls block while confirmed button `OnSelect` targets pass.
- Duplicate coverage verifies duplicate target IDs, duplicate sort orders, reused trigger controls, reused form-operation targets, duplicate new-mode targets for one form, and duplicate edit-mode targets for one form block; one new and one edit action may share a form when they use distinct valid operation targets and buttons.
- Ordering coverage verifies form-mode targets order by `sortOrder` and stable target ID, independent of input array order.
- Mutation and boundary coverage verifies project input, form-mode target arrays, and existing form-operation targets are not mutated; no implementation asset, Power Fx formula, `.fx` file, UI/export integration, later form-mode planning/generation, Canvas YAML, model-driven source, or Phase 5B.4 behavior is added.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `24` files and `1003` tests, plus `7` App UI files and `43` tests, for `31` files and `1046` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `24` files and `1003` tests, plus `7` App UI files and `43` tests, for `31` files and `1046` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3D commit gate by Architect instruction.

## 2026-07-17 Phase 5B.3C.2 complete Power Platform gate-status contract

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `85` tests).
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `63` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `55` tests).
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `97` tests).
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `175` tests).
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests).
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- `git diff --check`: passed.
- Gate-status contract coverage verifies every valid `PowerPlatformGateStatus` value passes runtime registry-envelope validation on unrelated registry assets, including `inProgress` and `manualValidationRequired`.
- Unknown-status coverage verifies invalid gate statuses still block safely without throwing, without generated fragments, and without generated checksums.
- Regression coverage verifies an unchanged approved form-operation registry still generates the same controlled `SubmitForm(validFormIdentifier)` fragment and no additional Power Fx patterns are introduced.
- Boundary coverage verifies no formula execution, no `.fx` file writing, no Canvas YAML, no model-driven source, no UI/export integration, and no Phase 5B.3D/5B.4 behavior was added.
- Normal runner summaries have been updated for the expanded focused file: unit/integration execution is now `23` files and `964` tests, plus `7` App UI files and `43` tests, for `30` files and `1007` tests total.
- Coverage runner summaries have been updated for the expanded focused file: coverage execution is now `23` files and `964` tests, plus `7` App UI files and `43` tests, for `30` files and `1007` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3C commit gate by Architect instruction.

## 2026-07-17 Phase 5B.3C.1 complete registry validation and safe applicability

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `69` tests).
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `63` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `55` tests).
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `97` tests).
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `175` tests).
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests).
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- Complete registry validation coverage verifies malformed semantic values on unrelated assets block safely before applicability and current-state derivation, including unknown approval status, applicability status, platform, category, type, asset status, required gate ID, gate snapshot ID, gate snapshot status, dependency type, nested operation, nested submission trigger, nested formula property, and nested confirmation status.
- Safe applicability coverage verifies missing legacy `formOperationTargets` storage does not throw, missing and empty target storage return `Not Applicable` only without stale canonical source assets, stale source assets block when targets are missing or empty, and null/primitive/object current storage blocks with no fragments and no generated checksum.
- Ordering coverage verifies unknown gate IDs are rejected before downstream phase-gate evaluation, malformed unrelated assets cannot permit generation, malformed target storage cannot become `Not Applicable`, and controlled blocked results contain no fragments or generated checksum.
- Boundary coverage verifies existing `SubmitForm(validFormIdentifier)` generation remains intact, no additional Power Fx pattern is generated, no `.fx` file is written, and Phase 5B.3D/5B.4 remain absent.
- Normal runner summaries have been updated for the expanded focused file: unit/integration execution is now `23` files and `948` tests, plus `7` App UI files and `43` tests, for `30` files and `991` tests total.
- Coverage runner summaries have been updated for the expanded focused file: coverage execution is now `23` files and `948` tests, plus `7` App UI files and `43` tests, for `30` files and `991` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3C commit gate by Architect instruction.

## 2026-07-17 Phase 5B.3C controlled Canvas SubmitForm Power Fx generation

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `50` tests).
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `63` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `55` tests).
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `97` tests).
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `175` tests).
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests).
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- Generation coverage verifies approved create and edit targets generate one fragment each; multiple targets generate ordered fragments; create/edit traceability remains structured; both operations use the same fixed `SubmitForm(formControlImplementationName)` formula; formulas are exactly one statement with one trailing newline and no semicolon, Markdown, comments, placeholders, IDs, or prose.
- Source validation coverage verifies missing, duplicate, wrong-project, wrong-platform, wrong-category, wrong-type, wrong-target, wrong-operation, wrong-property, wrong-path, wrong-generation-version, removed/replaced gates, stale dependencies, stale structured inputs, missing approval, stale checksum, non-Ready stored status, malformed status, gate failure, current record changes, moved/wrong-type controls, invalid identifiers, duplicate paths, unsafe paths, malformed registries, and malformed nested generation inputs block safely.
- Checksum and traceability coverage verifies target order, form rename, operation, required-field changes, and path changes affect checksums while timestamps do not; generated output preserves structured project, planning asset, target, screen, form, submit, connector, entity, field, intended path, and approved planning checksum traceability outside executable formulas.
- Boundary coverage verifies no `NewForm`, `EditForm`, `Patch`, `Navigate`, `ResetForm`, `Notify`, connector/entity reads, raw formula input, `.fx` file writing, Canvas YAML, model-driven source, UI/export integration, Phase 5B.3D, or Phase 5B.4 behavior is added.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `23` files and `929` tests, plus `7` App UI files and `43` tests, for `30` files and `972` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `23` files and `929` tests, plus `7` App UI files and `43` tests, for `30` files and `972` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3C commit gate by Architect instruction.

## 2026-07-17 Phase 5B.3B.1 safe blocked content and relationship-aware dependencies

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `63` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed during correction validation.
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed during correction validation.
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed during correction validation.
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed during correction validation.
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed during correction validation.
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed during correction validation.
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed during correction validation.
- Safe-content coverage verifies valid unblocked plans may print simple implementation identifiers, blocked plans redact invalid form-control, submit-control, and entity names, whitespace and punctuation values are not printed, formula-looking values are not printed, exact invalid values remain structurally available, different hidden values still produce different checksums, and blocked readable content remains deterministic.
- Relationship-dependency coverage verifies valid screen/form/submit/entity/field dependencies resolve; moved forms, wrong form control types, invalid form names, moved submit controls, wrong submit control types, invalid submit names, and invalid screen names become unresolved and block the asset.
- Current-state coverage verifies generic dependency evaluation does not overwrite specialized unresolved form-operation dependencies; failed relationship dependencies appear in the dependency graph, exclude the asset from Ready counts, prevent Ready manifest status, and are not treated as installation-ready.
- Regression coverage verifies entity and field dependency protections, canonical identity, canonical gate contract, checksum and approval invalidation, mutation safety, no Power Fx generation, no `.fx` files, no UI/export integration, and Phase 5B.3C absence remain intact.
- Normal runner summaries have been updated for the expanded focused file: unit/integration execution is now `22` files and `879` tests, plus `7` App UI files and `43` tests, for `29` files and `922` tests total.
- Coverage runner summaries have been updated for the expanded focused file: coverage execution is now `22` files and `879` tests, plus `7` App UI files and `43` tests, for `29` files and `922` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3B commit gate by Architect instruction.

## 2026-07-17 Phase 5B.3B Canvas form-operation planning asset

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `44` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `55` tests).
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `97` tests).
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `175` tests).
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests).
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- Planning coverage verifies no targets create no form-operation planning asset; create, edit, and multiple targets create exactly one combined canonical asset; target ordering follows Phase 5B.3A; canonical ID, target ID, display name, platform, category, type, operation, approved property, and planning path match the Phase 5B.3B contract.
- Structured-input coverage verifies current screen, form-control, submit-control, entity implementation names, required field IDs, target required flags, confirmation statuses, sort orders, and deterministic future fragment paths are stored structurally.
- Dependency coverage verifies screen, editable form control, submit button control, connector, entity, and required-field dependencies are created with current-project context, while state, collection, navigation, environment, credential, installation, and external URL dependencies are not introduced.
- Gate coverage verifies the canonical nine-gate contract and blocks failing screen-target, control-target, connector-selection, schema, naming, connector-permissions, data-source-permissions, security, and accessibility gates.
- Checksum and approval coverage verifies target addition/removal/reordering, operation, screen, form control, submit control, connector, entity, required fields, implementation names, trigger, required flag, confirmation, and sort-order changes affect readiness, while timestamp changes do not.
- Current-project defence coverage verifies stored identity, gates, dependencies, and structured inputs are rebuilt from the current project and tampered stored values cannot remain Ready.
- Safe-content coverage verifies readable content omits raw target IDs, connector IDs, entity IDs, field IDs, raw blocker text, and formula-like tokens while preserving structural evidence.
- Boundary coverage verifies no executable SubmitForm, NewForm, EditForm, Patch, `.fx` file creation, connector/entity data read, field-value mapping, Canvas YAML, model-driven source, UI/export integration, publishing, deployment, or Phase 5B.3C behavior was added.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `22` files and `860` tests, plus `7` App UI files and `43` tests, for `29` files and `903` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `22` files and `860` tests, plus `7` App UI files and `43` tests, for `29` files and `903` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3B commit gate by Architect instruction.

## 2026-07-17 Phase 5B.3A.2 canonical entity-connector compatibility

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts src/tests/collectionInitialization.test.ts src/tests/statePowerFxGeneration.test.ts src/tests/stateInitialization.test.ts src/tests/powerFxGeneration.test.ts src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`6` files, `555` tests).
- Canonical compatibility coverage verifies the form-operation validator now reuses the exported Canvas entity compatibility helper instead of maintaining a duplicate local compatibility matrix.
- Connector-resource coverage verifies active confirmed `externalApi`, `customConnector`, `otherConnector`, `microsoft365Connector`, `sqlServer`, and `excel` owners can validate when explicit ownership, confirmation, and create/update support are valid.
- SQL Server and Excel coverage verifies inactive owners block; create targets block without create support; edit targets block without update support; and explicit owner mismatch blocks even when the target connector is active.
- SharePoint coverage verifies list and library schemas follow the canonical SharePoint-family connector compatibility contract.
- Dataverse coverage verifies Dataverse table schemas still require an active Dataverse connector.
- Regression coverage verifies ambiguous implicit ownership remains blocked, connector array order cannot decide ownership, no active compatible connector still blocks, inactive-secondary and stale-primary protections remain intact, field-schema completeness and malformed-input protections remain intact, mutation safety remains intact, no implementation assets or Power Fx are generated, and Phase 5B.3B functionality remains absent.
- Normal runner summaries have been updated for the corrected focused file: unit/integration execution is now `21` files and `816` tests, plus `7` App UI files and `43` tests, for `28` files and `859` tests total.
- Coverage runner summaries have been updated for the corrected focused file: coverage execution is now `21` files and `816` tests, plus `7` App UI files and `43` tests, for `28` files and `859` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3A commit gate by Architect instruction.

## 2026-07-17 Phase 5B.3A.1 active connector and field-schema completeness

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `62` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts src/tests/collectionInitialization.test.ts src/tests/statePowerFxGeneration.test.ts src/tests/stateInitialization.test.ts src/tests/powerFxGeneration.test.ts src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`6` files, `555` tests).
- Connector reconciliation coverage verifies valid active primary connectors remain valid; inactive stored secondary connectors in single-backend mode block; connectors outside selected backend types block; stale or mismatched primary connector selections block; and reconciliation blockers are surfaced as controlled form-operation validation issues.
- Entity ownership coverage verifies explicit connector-resource owners are honored only when active; zero active compatible connectors block entity validation; exactly one compatible active connector permits implicit SharePoint/Dataverse ownership; multiple active compatible connectors block as ambiguous; and connector array order cannot change ownership.
- Field-schema completeness coverage verifies confirmed required fields must be listed, confirmed optional-only schemas permit empty required-field lists, unconfirmed fields block completeness, blank or unknown required-status values block, recognized required values are enforced, recognized optional values are accepted, mixed required/optional schemas validate correctly, and empty schemas block because no confirmed zero-field decision exists in the current model.
- Raw-input coverage verifies malformed non-array target input, primitive target records, partial records, operation-only records, invalid `requiredFieldIds` shapes, and empty required-field entries block safely instead of returning `Not Applicable`.
- Applicability coverage verifies genuinely empty target arrays and missing legacy `formOperationTargets` remain `Not Applicable`.
- Regression coverage verifies existing valid create/edit targets, duplicate rules, deterministic ordering, mutation safety, no implementation assets, no Power Fx generation, collection generation, collection planning, scalar generation, state planning, navigation generation, Phase 5A registry behavior, and Phase 5B.3B absence remain intact.
- Normal runner summaries have been updated for the corrected focused file: unit/integration execution is now `21` files and `800` tests, plus `7` App UI files and `43` tests, for `28` files and `843` tests total.
- Coverage runner summaries have been updated for the corrected focused file: coverage execution is now `21` files and `800` tests, plus `7` App UI files and `43` tests, for `28` files and `843` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3A commit gate by Architect instruction.

## 2026-07-16 Phase 5B.3A Canvas create/edit form-operation target model

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `39` tests).
- Default and legacy coverage verifies new Canvas projects default to an empty `formOperationTargets` list, legacy projects missing the field normalize safely, malformed records do not throw, valid create/edit records normalize, and unsupported operations or submission triggers block validation.
- Target ID coverage verifies unsafe target IDs, duplicate target IDs, duplicate sort orders, repeated submit controls, duplicate create targets on the same form, and duplicate edit targets on the same form block readiness.
- Deterministic ordering coverage verifies targets are ordered by `sortOrder` and stable ID tie-breaker, independent of input order.
- Screen validation verifies missing, unknown, unconfirmed, and unsafe screen references block form-operation readiness.
- Form-control validation verifies missing, unknown, unconfirmed, wrong-screen, wrong-control-type, and unsafe form-control references block readiness.
- Submit-control validation verifies missing, unknown, unconfirmed, wrong-screen, wrong-control-type, and unsafe submit-control references block readiness.
- Connector validation verifies missing, unknown, unselected, unconfirmed, and operation-incompatible connectors block readiness before generation.
- Entity validation verifies missing, unknown, mismatched, unconfirmed, and unsafe source entity implementation names block readiness.
- Required-field validation verifies duplicate field IDs, unsafe field IDs, unknown or stale field IDs, fields belonging to another entity, unconfirmed fields, and omitted required schema fields block readiness while optional empty field lists remain valid when no required fields exist.
- Operation coverage verifies create and edit operations can share the same form only when they use distinct submit controls.
- Applicability coverage verifies non-Canvas projects return `Not Applicable` and no targets return `Not Applicable`.
- Mutation coverage verifies validation and normalization do not mutate project or target inputs.
- Phase-boundary coverage verifies no implementation assets, Power Fx formula output, connector reads, field mapping, Canvas YAML, model-driven source, UI integration, export integration, or Phase 5B.3B behavior was introduced.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `21` files and `777` tests, plus `7` App UI files and `43` tests, for `28` files and `820` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `21` files and `777` tests, plus `7` App UI files and `43` tests, for `28` files and `820` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3A commit gate by Architect instruction.

## 2026-07-16 Phase 5B.2D basic Canvas collection-loading Power Fx generation

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `55` tests after Phase 5B.2D.1 correction).
- Generation coverage verifies approved current Phase 5B.2C planning assets generate only `ClearCollect(collectionName, sourceName)` statements with one statement per line, semicolons only between statements, no final semicolon, exactly one trailing newline, no Markdown, no comments/prose, no placeholders, and deterministic canonical ordering.
- Registry and source-binding coverage verifies malformed registries, malformed unrelated assets, malformed nested collection inputs, duplicate asset IDs, missing or duplicate source assets, wrong project/platform/category/type/target/operation/property/path/version/required/applicability values, altered gates, altered dependencies, altered structured generation inputs, missing approvals, stale checksums, and non-Ready source assets block without throwing or generating formula output.
- Stored-status coverage verifies raw stored source assets must be exactly `Ready for Export`; `Blocked`, `Draft`, `Review Required`, `Not Applicable`, `Exported`, unknown source statuses, and malformed unrelated asset statuses block even when approval and checksum evidence otherwise remain valid.
- Current-project defence coverage verifies connector, entity, source implementation name, collection implementation name, data scope, confirmation, and gate changes block generation until the current collection-loading plan is regenerated and explicitly reapproved.
- Safety coverage verifies invalid or formula-looking collection/source identifiers block; raw purpose text is not accepted as formula input; no connector data is read; no `Collect`, standalone `Clear`, CRUD, filtering, sorting, shaping, pagination, Canvas YAML, model-driven source, UI/export integration, installation, publishing, deployment, or Phase 5B.3 functionality is generated.
- Checksum and traceability coverage verifies formula checksums bind to project ID, approved planning asset/checksum, operation, property, intended path, ordered target IDs, collection names, connector IDs, entity IDs, source names, formula, and generation version; generation timestamps do not affect generated checksums; and traceability remains structured outside the generated formula.
- Mutation coverage verifies project, registry, source asset, collection target, connector, and entity inputs are not mutated.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `20` files and `738` tests, plus `7` App UI files and `43` tests, for `27` files and `781` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `20` files and `738` tests, plus `7` App UI files and `43` tests, for `27` files and `781` tests total.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.2D commit gate by Architect instruction.

## 2026-07-16 Phase 5B.2C collection loading target model

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `97` tests after Phase 5B.2C.2 corrections).
- Target-model coverage verifies new Canvas projects default to an empty `collectionTargets` list, legacy projects missing the field normalize safely, malformed records do not throw, valid records normalize, invalid names block, duplicate IDs/names/case-insensitive names/sort orders block, and ordering uses `sortOrder` then stable ID.
- Planning-asset coverage verifies no collection targets produce no asset, one or more valid targets produce one combined App `OnStart` collection-loading plan, structured inputs include confirmed source connector/entity information, and source content contains no executable `ClearCollect(`, `Collect(`, or `Clear(` statements.
- Source validation coverage verifies missing/unknown connector and entity IDs, connector/entity mismatch, unconfirmed connectors/entities, missing source implementation names, unknown data scope, and large or unbounded data scope block planning.
- Applicability coverage verifies confirmed small bounded sources permit Review Required, required unconfirmed collections block, and optional unconfirmed collections are excluded until confirmed.
- Dependency coverage verifies connector and entity dependencies are created while field, relationship, credential, environment, screen, control, scalar state, and artificial dependencies are not introduced.
- Checksum and approval coverage verifies collection addition, removal, rename, connector/entity/source-name changes, data-scope changes, confirmation changes, sort-order changes, timestamp stability, approval invalidation, stale plan exclusion from Ready counts, stale manifest status, and stale installation readiness behavior.
- Boundary coverage verifies collection assets are rejected by scalar state and navigation generators, no executable collection formula is generated, no connector/entity data is read, no filters/sorts/field shaping/relationships are added, no Canvas YAML or model-driven source is generated, no UI/export integration is added, and Phase 5B.2D functionality is absent.
- Phase 5B.2C.1 correction coverage verifies canonical identity, required gates, current gate snapshots, and connector/entity dependencies are rebuilt during derivation; stale gate contracts and altered stored identity invalidate approval; current failing gates cannot be bypassed; formula-looking collection IDs, connector IDs, entity IDs, and purpose text remain structured but are not printed raw; and hidden structured values still affect checksums.
- Phase 5B.2C.2 correction coverage verifies blocked collection planning source content prints only deterministic issue counts and structured-field review guidance; raw target IDs, connector IDs, entity IDs, implementation names, source names, confirmation text, formula-like tokens, duplicate identifiers, and optional missing-decision text remain structured without being printed raw; and hidden structured blocking details still affect checksums.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.2C commit gate by Architect instruction.
- Normal runner summaries have been updated for the new focused file: unit/integration execution is now `19` files and `683` tests, plus `7` App UI files and `43` tests, for `26` files and `726` tests total.
- Coverage runner summaries have been updated for the new focused file: coverage execution is now `19` files and `683` tests, plus `7` App UI files and `43` tests, for `26` files and `726` tests total.

## 2026-07-16 Phase 5B.2B scalar App OnStart Power Fx generation

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `175` tests after Phase 5B.2B.6 corrections).
- Eligibility coverage verifies approved current state plans generate, non-Canvas projects return `Not Applicable`, missing planning assets block, no variables return `Not Applicable`, and Draft, Review Required, Blocked, unapproved, invalid-checksum, stale, failed-gate, unresolved-dependency, unsupported-operation, unsupported-property, and unsupported-path assets do not generate executable formulas.
- Phase 5B.2B.1 canonical-binding coverage verifies registries from another project block, altered project IDs/platforms/categories/types/target IDs/display names/operations/properties/paths block after checksum recalculation, required gates cannot be removed/replaced/emptied, stored gate snapshots cannot bypass current gate evaluation, current failing gates still block, altered source records/structured inputs/dependency-boundary IDs/dependencies block, incompatible generation versions block, stored Ready status does not bypass approval, manually recalculated noncanonical checksums are rejected, and successful traceability uses canonical current values.
- Phase 5B.2B.2 registry-envelope coverage verifies mismatched registry project IDs block, registries from another project containing copied current assets block, missing project IDs block safely, unsupported/missing/malformed registry schema versions block, incompatible/missing registry generation versions block, duplicate canonical source assets block regardless of order, duplicate unrelated asset IDs block through graph integrity, and malformed registries return no formula or generated checksum.
- Phase 5B.2B.3 malformed-registry coverage verifies null, undefined, string, array, missing-ID, and non-string-ID asset-list entries block without throwing; malformed required gates, gate snapshots, dependencies, generation inputs, and state-variable inputs block safely; malformed asset-list results return no formula or generated checksum; and registry-level generation returns one blocked result for missing asset lists or null asset entries.
- Phase 5B.2B.4 complete runtime-safety coverage verifies unrelated assets with only asset IDs, missing dependencies, null/primitive dependency entries, malformed gate snapshots, non-string required gates, malformed source/connector/entity/field ID arrays, malformed manual-installation/validation/limitation/blocking arrays, optional malformed assets, and non-applicable malformed assets all block the whole registry without partial generation.
- Phase 5B.2B.5 complete generation-input runtime-safety coverage verifies malformed current formula properties, optional source/destination/navigation fields, approved property names, state-variable entries, initial-value kinds and values, and dependency relationship context all block safely before shared derivation or formula generation.
- Phase 5B.2B.6 no-variable ordering coverage verifies malformed registries still block when no state variables exist, stale state assets block after all variables are removed, regenerated no-variable registries return `Not Applicable`, registry-level generation returns an empty array only for valid regenerated no-variable registries, duplicate stale canonical assets block, and malformed non-Canvas registries return controlled blocked results.
- Scalar serialization coverage verifies `Blank()`, lowercase Boolean literals, deterministic finite numbers, `-0` normalization to `0`, non-finite number blocking, quoted text, doubled double quotes, quoted formula-looking text, multiline `Char(10)` concatenation, and empty text literals.
- Formatting coverage verifies one `Set()` statement per variable, semicolons only between statements, no final semicolon, exactly one trailing newline, no Markdown fences, and no comments/placeholders.
- Determinism coverage verifies sort-order/stable-ID ordering, input array order independence, timestamp-insensitive generated checksums, and checksum changes for formula output, source checksum, variable order, variable names, and initial-value kind.
- Approval-binding coverage verifies changed values, names, added variables, removed variables, and changed sort orders block generation until registry regeneration and explicit reapproval.
- Current-project defence coverage verifies manually altered structured generation inputs cannot bypass current project comparison.
- Mutation coverage verifies project, registry, asset, and generation-input objects are not mutated.
- Security-boundary coverage verifies executable operation calls contain only `Set`, while quoted `Patch(` and `ClearCollect(` text does not execute those operations.
- Dependency-boundary coverage verifies scalar state generation introduces no connector, entity, field, or relationship dependencies.
- Regression coverage verifies Phase 5B.1 navigation generation remains unchanged, navigation assets are unsupported by the state generator, and state assets remain unsupported by the navigation generator.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.2B commit gate by Architect instruction.
- Normal runner summaries have been updated for the corrected focused file: unit/integration execution is now `18` files and `586` tests, plus `7` App UI files and `43` tests, for `25` files and `629` tests total.
- Coverage runner summaries have been updated for the corrected focused file: coverage execution is now `18` files and `586` tests, plus `7` App UI files and `43` tests, for `25` files and `629` tests total.

## 2026-07-16 Phase 5B.2A state-initialization model and asset planning

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `59` tests after Phase 5B.2A.1 corrections).
- Phase 5B.2A coverage verifies new Canvas projects default to an empty `stateVariableTargets` list and legacy projects missing the field normalize safely.
- Normalization coverage verifies malformed records do not throw, valid blank/Boolean/finite-number/text values normalize, unknown value kinds are removed, and `NaN`/infinite numbers are rejected.
- Validation coverage verifies invalid implementation names, duplicate IDs, duplicate names, case-insensitive duplicate names, and duplicate sort orders block the planning asset.
- Ordering coverage verifies deterministic state-variable order by `sortOrder` and stable ID tie-breaker.
- Planning-asset coverage verifies no variables produce no planning asset, confirmed variables produce one combined App `OnStart` planning asset, structured variable inputs are stored, and source content contains no executable `Set` or `ClearCollect` statements.
- Readiness coverage verifies required unconfirmed variables block readiness, optional unconfirmed variables are excluded, planning assets begin as `Review Required`, and explicit approval permits `Ready for Export`.
- Phase 5B.2A.1 approval coverage verifies unchanged approvals remain valid, changed initial values reset approval to `Review required`, changed names/additions/removals are non-Ready, stale state plans are excluded from ready counts, manifests do not overstate readiness, and installation dependencies do not treat stale state plans as Ready.
- Phase 5B.2A.1 safe-content coverage verifies formula-looking text values such as `Set(`, `ClearCollect(`, and `Patch(` remain intact in structured `generationInputs` without being printed raw in planning source content.
- Checksum coverage verifies variable addition, removal, rename, value-kind change, initial-value change, required-flag change, confirmation change, sort-order change, and timestamp stability.
- Formula-looking text checksum coverage verifies distinct text literals still produce distinct checksums while safe source-content output remains deterministic.
- Dependency coverage verifies scalar state initialization creates no connector, entity, or field dependencies.
- Regression coverage verifies the Phase 5B.1 navigation generator rejects state-initialization assets and emits no executable state formulas.
- Mutation coverage verifies project and registry inputs are not mutated.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.2A commit gate by Architect instruction.
- Normal runner summaries have been updated for the corrected focused file: unit/integration execution is now `17` files and `411` tests, plus `7` App UI files and `43` tests, for `24` files and `454` tests total.
- Coverage runner summaries have been updated for the corrected focused file: coverage execution is now `17` files and `411` tests, plus `7` App UI files and `43` tests, for `24` files and `454` tests total.

## 2026-07-15 Phase 5B.1B approved property binding

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests).
- Phase 5B.1B coverage verifies an approved property still present on the current control can generate after explicit approval.
- Property-removal coverage verifies removing the approved property after approval blocks generation and returns no executable formula.
- Property-replacement coverage verifies replacing `OnSelect` with `OnSuccess` blocks the old `OnSelect` asset.
- Canonical property-set coverage deliberately invalidates an old asset when `OnSuccess` is added while retaining `OnSelect`, because the full normalized property set is approval-bound.
- Checksum coverage verifies current normalized formula properties contribute to the Phase 5A asset checksum, and removal/replacement changes the derived checksum.
- Approval coverage verifies normalization resets approval after a property-set change.
- Registry regeneration coverage verifies obsolete property assets are removed, newly applicable property assets are created, and new assets begin as `Review required`.
- Reapproval coverage verifies explicit approval permits the new supported navigation property.
- Generator-defence coverage verifies a manually constructed registry cannot bypass current-property membership.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.1 commit gate by Architect instruction.
- Normal runner summaries have been updated for the corrected focused file: unit/integration execution is now `16` files and `352` tests, plus `7` App UI files and `43` tests, for `23` files and `395` tests total.
- Coverage runner summaries have been updated for the corrected focused file: coverage execution is now `16` files and `352` tests, plus `7` App UI files and `43` tests, for `23` files and `395` tests total.

## 2026-07-15 Phase 5B.1A navigation approval binding

- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `70` tests after Phase 5B.1B corrections).
- Phase 5B.1A coverage verifies default Canvas controls include typed navigation fields.
- Legacy normalization coverage verifies missing navigation fields and malformed transition/default-rule values reset safely.
- Phase 5A checksum coverage verifies destination ID, transition, transition default rule, and destination implementation name contribute to Power Fx plan checksums.
- Stale approval coverage verifies changed destination, changed transition, changed default rule, and changed destination implementation name block generation from the old approved asset.
- Reapproval coverage verifies registry regeneration resets approval, explicit approval of the new checksum allows generation, generated formulas reflect the newly approved destination, and generated checksums reflect the newly approved transition.
- Shared transition model coverage verifies the generator uses the project model transition list and existing transition mapping behavior continues to pass.
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.1 commit gate by Architect instruction.
- Normal runner summaries have been updated for the corrected focused file: unit/integration execution is now `16` files and `352` tests, plus `7` App UI files and `43` tests, for `23` files and `395` tests total.
- Coverage runner summaries have been updated for the corrected focused file: coverage execution is now `16` files and `352` tests, plus `7` App UI files and `43` tests, for `23` files and `395` tests total.

## 2026-07-15 Phase 5B.1 Power Fx navigation generation framework

- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `57` tests after Phase 5B.1A corrections).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- Full `npm.cmd test`, `npm.cmd run test:coverage`, build, audit, Linux validation, and extracted-package validation are deferred to the Phase 5B.1 commit gate by Architect instruction.
- Normal runner summaries have been updated for the corrected focused file: unit/integration execution is now `16` files and `339` tests, plus `7` App UI files and `43` tests, for `23` files and `382` tests total.
- Coverage runner summaries have been updated for the corrected focused file: coverage execution is now `16` files and `339` tests, plus `7` App UI files and `43` tests, for `23` files and `382` tests total.
- Power Fx generation coverage verifies approved Ready navigation assets generate executable Power Fx using the confirmed destination implementation name.
- Transition coverage verifies `None`, `Cover`, `CoverRight`, `Fade`, `UnCover`, and `UnCoverRight` map to valid `ScreenTransition` values.
- Determinism coverage verifies identical structured inputs produce identical formulas/checksums and destination, transition, implementation-name, and source-checksum changes alter checksums.
- Formatting coverage verifies generated formulas end with exactly one newline and contain no Markdown fences or unresolved placeholders.
- Blocking coverage verifies missing destination IDs, missing/unconfirmed destinations, missing destination implementation names, unknown transitions, unsupported properties, unsupported operations, Draft assets, Review Required assets, Blocked assets, unapproved assets, invalid source checksums, failed gates, unresolved dependencies, and non-Canvas projects do not produce executable formulas.
- Mutation coverage verifies generation does not mutate the project, registry, or source asset.
- Boundary coverage verifies generated formulas contain no data-access functions, CRUD functions, Canvas YAML, model-driven source, validation formulas, permission formulas, UI integration, export integration, installation, publishing, deployment, or Phase 5B.2 behavior.

## 2026-07-15 Phase 5A implementation asset registry and readiness

- `npm.cmd run lint`: passed.
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1`: passed (`1` file, `99` tests).
- `npm.cmd test`: passed through `scripts/run-tests.mjs`; the unit/integration leg runs `15` files and `282` tests, then `7` App UI groups run in clean child processes for `43` tests. Total normal execution is `22` files and `325` tests.
- `npm.cmd run test:coverage`: passed through `scripts/run-tests-with-coverage.mjs`; the coverage leg runs `15` files and `282` tests, then `7` App UI groups run in clean child processes for `43` tests. Total coverage workflow execution is `22` files and `325` tests.
- Coverage project result is `90.46%` statements, `79.7%` branches, `94.48%` functions, and `94.72%` lines.
- `npm.cmd run build`: passed, including TypeScript checking.
- `npm.cmd audit --audit-level=high`: passed with `0` vulnerabilities.
- `git diff --check`: passed.
- Phase 5A coverage verifies non-Power-Platform projects produce a not-applicable empty registry.
- Asset registry coverage verifies one Power Fx plan asset per formula property, unique asset IDs, unique paths, typed gate snapshots, structured dependencies, checksums, target references, and manifest paths.
- Formula-property coverage verifies newline, comma, semicolon, duplicate, blank, placeholder, and path-collision behavior.
- Dependency coverage verifies valid structured dependencies resolve and invalid screen, connector, entity, field, missing asset, duplicate dependency, self-dependency, and circular dependencies block readiness.
- Graph coverage verifies dependency-driven installation assets and deterministic dependency-before-dependant ordering.
- Checksum coverage verifies deterministic canonical payloads across timestamps and changed paths, dependencies, gate snapshots, connector/entity/field IDs, installation requirements, validation requirements, and source content.
- Approval coverage verifies unchanged checksum/version approvals can be preserved and changed metadata, dependencies, gates, stale versions, missing checksums, and malformed approval states reset to Review required.
- Model-driven coverage verifies source records, entity IDs, field IDs, and connector IDs remain semantically distinct, and no solution XML or importable source is fabricated.
- Manifest coverage verifies counts, paths, checksums, project package readiness, asset package readiness, effective implementation readiness, dependency issues, circular dependency issues, generation order, installation order, and tamper rejection.
- Final Phase 5A correction coverage verifies centralized asset status derivation, current asset dependency recalculation, current record dependency recalculation, YAML formula readiness, installation dependency readiness, unapproved connector blocking, free-text model-driven structured-reference blocking, duplicate persisted approval reset, stale registry summary/order rejection, and canonical manifest projection tamper rejection.
- Phase 5A.1 focused coverage verifies dependency relationship context, field-to-entity validation, entity-to-connector validation, multiple active connector relationship isolation, current gate snapshot rebuilding, gate-derived checksum invalidation, gate-derived approval reset, relationship checksum invalidation, and relationship-derived approval reset.
- Phase 5A.1A focused coverage verifies canonical Canvas Power Fx dependency regeneration from the current control target, stale relationship context rejection even with recomputed checksums, Canvas dependency isolation from model-driven records, and model-driven dependency isolation from Canvas records.
- Phase 5A.2 focused coverage verifies current-project-aware manifest creation, canonical derived registry projection, stale registry rejection, stale Ready manifest rejection, current gate and relationship invalidation, project identity validation, existing per-asset tamper rejection, and manifest creation mutation safety.
- Normalization coverage verifies null, non-object, missing asset arrays, malformed records, unknown statuses, legacy checksums, legacy generation versions, and duplicate persisted asset records rebuild safely from current project data.
- Phase 5A intentionally does not generate executable Power Fx, Canvas YAML, model-driven source patches, exports, live environment changes, installation, publishing, deployment, or Studio validation claims.
- Phase 5B remains blocked until Architect review approves Phase 5A.

## 2026-07-12 Phase 4 final UI test isolation and Linux runner approval

- `npm.cmd run lint`: passed.
- `npm.cmd test`: passed through `scripts/run-tests.mjs`; the unit/integration leg runs `14` files and `183` tests, then `7` App UI groups run in clean child processes for `43` tests. Total normal execution is `21` files and `226` tests.
- `npm.cmd run test:coverage`: passed with thresholds through `scripts/run-tests-with-coverage.mjs`; the coverage leg runs `14` non-App files and `183` tests, then `7` App UI groups run in clean child processes for `43` tests. Total coverage workflow execution is `21` files and `226` tests.
- Coverage project result is `89.05%` statements, `78.35%` branches, `93.1%` functions, and `93.36%` lines.
- `npm.cmd run build`: passed, including TypeScript checking.
- `git diff --check`: passed.
- `npm audit --audit-level=high`: passed with `0` vulnerabilities.
- Vitest is configured with `pool: "vmThreads"` and `maxWorkers: 2`; `npm test` uses a cross-platform Node orchestrator with `shell: false` to run `vitest.unit.config.ts` for non-App tests followed by clean-child App UI group runs.
- `npm run test:coverage` uses a cross-platform Node orchestrator with `shell: false` to run `vitest.coverage.config.ts` for coverage-safe non-App tests followed by the same clean-child App UI group runs.
- V8 coverage excludes all split App UI group files while preserving their execution as release-gate regressions.
- The former cumulative `src/tests/App.test.tsx` has been split into navigation, project management, review/generation, Power Platform Canvas, Power Platform model-driven, documents/export, and persistence/recovery groups.
- `src/tests/setup.ts` cleanup clears React renders, timers, mocks, storage, persistence warnings, selection, clipboard, and document body state between runs.
- Linux validation remains outstanding in the local workstation because WSL is not usable and Docker is unavailable; CI must confirm the exact Linux `npm run test:coverage` exit.
- Canvas readiness coverage now verifies structured screen targets, control targets, component applicability, formula targets, YAML targets, exact target IDs in PHASED_CODEX_PROMPTS.md, and Draft blocking when targets are missing.
- Formula applicability coverage verifies required formulas need real properties/references, confirmed not-applicable formula controls do not emit `.fx` targets, and free-text values such as `Not applicable` cannot substitute for the controlled decision.
- YAML applicability coverage verifies undecided YAML blocks, required YAML needs valid parent/install/validation details, confirmed not-applicable YAML records do not emit `.pa.yaml` targets, and free-text values such as `Not applicable` cannot substitute for the controlled decision.
- Referential-integrity coverage verifies invalid connector IDs, entity IDs, field IDs, screen IDs, parent-control IDs, cross-screen parents, parent cycles, and YAML parents block readiness.
- Active-backend coverage verifies a SharePoint-only Canvas project cannot use a retained Dataverse table, a Dataverse-only project cannot use a retained SharePoint list, a deselected backend invalidates old screen references, and unselected external connector resources block readiness.
- Connector-reconciliation coverage verifies single-source projects ignore stored secondary connector IDs, stale Dataverse connectors are inactive in SharePoint-only mode, stale SharePoint connectors are inactive in Dataverse-only mode, removing a backend from Multiple deactivates its connector, and re-adding the backend reactivates valid references.
- Component-usage coverage verifies legacy usage text does not pass, unknown/unconfirmed/duplicate usage targets block readiness, valid screen/control usage targets pass, and not-applicable component YAML emits no YAML path.
- Gate quality coverage verifies placeholder wording does not pass gateway, DLP, authentication, connector permissions, component applicability, naming standards, implementation specifications, release approval, or deployment ownership.
- Coverage excludes the large Power Platform rendered form shell from threshold accounting while retaining rendered UI tests for key intake flows and unit tests for gate logic.

## 2026-07-04 final MVP release-readiness evidence

- `npm.cmd test`: passed (`14` files, `129` tests).
- `npm.cmd run test:coverage`: passed with thresholds; overall coverage is `93.87%` statements, `85.58%` branches, `95.29%` functions, and `95.51%` lines.
- `src/lib/projectRepository.ts`: `98.49%` statements, `100%` branches, `97.95%` functions, and `98.23%` lines.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including TypeScript checking.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- CI coverage gate now runs `npm run test:coverage` with Vitest thresholds enforced in `vite.config.ts`.
- Export download tests no longer emit jsdom navigation warnings after download behavior hardening.
- Production QA completed the create, save, reopen, duplicate, archive, restore, cancel-delete, confirm-delete, generation, document review, and ZIP export journey.
- Production generated `19/19` project-specific core documents with `55` exact `[MISSING: ...]` markers reported consistently in Package Preview and Export diagnostics.
- Direct Windows ZIP inspection passed with `12` folders, `19` core documents, both valid manifests, and no missing, duplicate, empty, unsafe, unreadable, filler, or stale-project files.
- The delete confirmation now traps focus between its actions, closes with Escape, restores focus after cancellation, and keeps Cancel as the initial focus target.
- Desktop and `390 x 844` production checks passed with no console warnings/errors or page-level horizontal overflow.
- Physical-keyboard tab-order verification passed in production Chrome across Mission Control, intake, generation, documents, saved-project actions, dialogs, and export.
- Visual Windows Explorer inspection passed for the production ZIP: 12 approved folders, both manifests, readable/safe names, and a Markdown file opened normally.
- Firefox production verification remains uncompleted because Firefox is not installed on the verification workstation.

## Automated coverage

- Intake stage configuration is defined in one canonical source with 8 required stages.
- Project type is a required Foundation choice backed by 15 typed, config-driven presets.
- Website, game, mobile, dashboard, Microsoft 365, automation, and API questions are shown only for relevant presets.
- Branding validation changes by project type and audience visibility; internal web applications do not require full branding.
- Website, game, dashboard, API, and automation presets enforce their required project-specific fields.
- Required intake rules pass and fail predictably for Foundation, Users, Features, Data, Workflows, and Security stages.
- Validation returns `isValid`, `missingFields`, `warnings`, and `sectionResults` with `stageId`, `label`, `percentComplete`, `isComplete`, `missingFields`, and `warnings`.
- Optional omissions remain visible as warnings.
- Missing required and weak information derives persisted review items grouped by the required client-review sections.
- `Answered` clears a review blocker; `Not applicable` requires a reason; blocking `Deferred` items remain blockers; explicitly allowed non-blocking deferrals clear.
- Client questions are grouped in a stable section order and copied as plain text.
- Ready for Codex requires every blocking review item and all 12 readiness checklist checks to pass.
- Intake, review-decision, and manual readiness changes mark the generated package stale until regeneration.
- Older version-1 stored projects receive safe review defaults without losing intake or generated documents.
- Continue Intake selects the next incomplete stage.
- Stage switching does not lose entered intake values.
- New projects receive complete safe defaults, unique IDs, lifecycle status, and timestamps.
- Versioned storage state saves and loads multiple projects plus `activeProjectId`.
- Existing version-1 projects without archive or duplication metadata load as active projects with safe null defaults.
- Duplicate creates a new id, adds `Copy` to the project name, records source lineage, preserves copied intake, and clears generated output.
- Archive hides a project from the active list without deleting its intake, review, readiness, or generated-document data.
- Restore returns archived data to the active list and updates only archive/timestamp metadata.
- Active and archived delete actions require a confirmation dialog; Cancel preserves the record and Permanently Delete removes it.
- Mission Control summary counts exclude archived records from active, Draft, Ready for Codex, and blocker totals.
- Invalid localStorage JSON recovers to a safe empty version-1 state.
- Empty storage renders the first-run welcome, product boundaries, eight-step workflow, and project-dependent navigation without producing a blank page.
- The primary onboarding action opens Foundation intake.
- The read-only business website example opens and closes without creating, replacing, or persisting a project.
- Existing projects bypass the first-run welcome.
- Selected project types show config-driven use-case helper copy alongside the existing conditional questions.
- Mission Control explains Draft, Ready for Codex, and Client Questions Pending when those states apply.
- The Generate stage shows the post-generation review and GPT Architect/Codex handoff workflow before generation.
- Invalid `activeProjectId` recovers to the first valid persisted project.
- Legacy `Needs review` data migrates to the canonical `Review needed` review status.
- Project status and review status use separate canonical label sets.
- Selecting an active project persists correctly.
- Nested project updates preserve untouched intake fields.
- Intake updates preserve existing generated documents.
- Generated documents and actual generated-file counts persist.
- Generation can proceed with missing intake data and keeps explicit missing markers.
- All 19 required markdown files generate every time and are non-empty.
- `BRAND_GUIDE.md`, `CLIENT_QUESTIONS.md`, and `HANDOFF_CHECKLIST.md` generate in their approved folders.
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
- `EXPORT_MANIFEST.md` and `project-manifest.json` are included without changing the 19-core-file count.
- Export diagnostics identify packages as Draft or Ready for Codex while allowing valid Draft exports.
- Manifest diagnostics include project identity, lifecycle status, exported date, warning/error counts, folder summary, and stable file list.
- Large project records export with safe normalized paths and preserved content.
- Multi-project export uses only the active project's persisted documents.
- Copy actions read only active-project Architect, Codex, and phased prompt documents.
- Clipboard permission failure uses the local selection fallback when the browser supports it.
- Client Questions copy uses the same local selection fallback when direct clipboard access is denied.
- Browsers without native or legacy copy-command access leave fallback text visibly selected with a Ctrl+C instruction.
- Project Package Preview renders all 19 generated documents with canonical folder mapping, purpose labels, review status, and per-document missing-marker count.
- Package summary reports Draft/Ready status, 19-document completeness, total marker count, review blockers, checklist completion, and ZIP availability.
- Document preview opens selected full Markdown content, preserves plain-text spacing, exposes metadata, and returns to the document list.
- Document and quick-copy actions use the shared clipboard utility and selection fallback.
- Document search covers file name, folder, and purpose, exposes a clear zero-result state, and restores the document list after clearing.
- Dashboard selectors calculate readiness, outstanding questions, completion, next action, and display status without mutation.
- Active project summary selector returns status, generated file count, outstanding required count, review status, and deterministic next action details.
- Recent project summaries sort by last updated date with stable fallback behavior.
- Dashboard warning selector surfaces inconsistent persisted status/readiness combinations.
- Mission Control project switching updates active context and heading safely.
- Mission Control project rows expose clear Open, Duplicate, Archive/Restore, and Delete labels.
- All 12 required folders and 19 required files are generated.
- Missing information markers appear in generated Markdown.
- Unsafe project names normalize to predictable paths.
- ZIP archives contain the root document, manifest, standard folders, and phased prompts.
- Mission Control opens the selected intake step.
- Review stage surfaces the Missing Information Review, grouped Client Questions Review, and Ready for Codex checklist before generation.
- Generate stage shows readiness counts and saves documents to the active project.
- Documentation Viewer renders generated content.

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd audit
```

## 2026-07-03 saved project management evidence

- `npm.cmd test`: passed (`14` files, `123` tests).
- `npm.cmd run test:coverage`: passed; overall branch coverage is `84.03%`.
- `src/lib/projectRepository.ts`: `100%` statements, branches, and functions.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including TypeScript checking.
- `git diff --check`: passed.
- In-app browser QA passed at desktop and `390 × 844` mobile widths with no console errors or page-level horizontal overflow.
- Duplicate, archive, archived view, restore, confirmation focus, Cancel, permanent delete, count updates, persistence reload, 19-document generation, Package Preview, and ZIP export passed.
- Technical ZIP inspection passed with `12` folders, `19` core documents, both manifests, and no missing, duplicate, or empty files.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- Physical-keyboard tab order and Windows Explorer ZIP inspection remain manual release checks.

## 2026-07-03 project package preview evidence

- `npm.cmd test`: passed (`14` files, `94` tests).
- `npm.cmd test -- src/tests/documentReview.test.ts src/tests/exportProjectPackage.test.ts src/tests/clientReview.test.ts`: passed (`3` files, `12` focused regression tests).
- `npm.cmd run build`: passed.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- `git diff --check`: passed.
- Automated coverage includes the 19-document list, canonical folders, purpose metadata, per-document and package marker totals, Draft warning, Ready-for-Codex blocker summary, preview content, back navigation, document copy, quick copy, and clipboard fallback.
- Existing onboarding, project persistence, Client Review, 19-document generation, export integrity, and ZIP tests remain in the full suite.
- In-app browser QA passed at `1280 x 720` desktop and `390 x 844` mobile with no console warnings/errors, framework overlay, or page-level horizontal overflow.
- Ready and Draft package summaries, all 19 review rows, five quick-copy actions, purpose/folder/status metadata, preview open/close, full Markdown content, clipboard selection fallback, and responsive layout passed.
- Browser export reported `19/19`, valid folder mapping, zero export errors, and `Package downloaded successfully.`
- Physical-keyboard tab order and Windows Explorer ZIP inspection remain manual release checks. Automated focus styles, accessible labels, and keyboard-reachable controls passed.

## 2026-07-03 onboarding and first-run UX evidence

- `npm.cmd test`: passed (`13` files, `89` tests).
- `npm.cmd test -- src/tests/exportProjectPackage.test.ts src/tests/generateProjectPackage.test.ts src/tests/clientReview.test.ts`: passed (`3` files, `19` focused regression tests).
- `npm.cmd run build`: passed.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- `git diff --check`: passed.
- First-run UI coverage verifies welcome content, workflow guidance, primary creation, read-only example behavior, non-persistence, existing-project bypass, project-type helper copy, status explanations, and post-generation guidance.
- Existing client review, 19-document generation, and ZIP export tests remain in the full regression suite.
- In-app browser QA passed at `1346 x 1270` desktop and `390 x 844` mobile with no console warnings/errors and no page-level horizontal overflow.
- Welcome rendering, example open/close, new project creation, existing-project reload/bypass, Business website helper copy and fields, generation guidance, Client Review access, 19-document generation, and export diagnostics passed.
- Browser export reported `19/19`, valid folder mapping, zero export errors, and `Package downloaded successfully.`; focused automated ZIP inspection remains the archive-content authority.
- Physical-keyboard tab order and Windows Explorer ZIP inspection remain manual release checks. Automated skip-link focus, form labeling, reachable controls, and `:focus-visible` coverage passed; the in-app browser did not expose a reliable physical-keyboard simulation.

## 2026-07-03 client review evidence

- `npm.cmd test`: passed (`13` files, `86` tests).
- `npm.cmd test -- src/tests/exportProjectPackage.test.ts`: passed (`5` ZIP tests).
- `npm.cmd run build`: passed.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- `git diff --check`: passed.
- Desktop browser QA passed for review rendering, decision persistence, grouped question copy, Draft blocking, `12/12` Ready for Codex completion after regeneration, responsive layout, and zero console warnings/errors.
- `390 × 844` browser QA passed with no page-level horizontal overflow and no console warnings/errors.
- Browser ZIP generation reported `19/19`, valid folder mapping, Ready for Codex, zero export errors, and a successful download.
- Automated ZIP inspection confirmed deterministic paths, 12 approved folders, 19 core documents, both manifests, readable client-review documents, and no stale 16-document paths.
- Synthetic Tab input did not advance focus in the in-app browser. Automated skip-link, label, keyboard-focusability, and `:focus-visible` checks passed; physical-keyboard tab order remains a manual release check.

## 2026-07-02 change evidence

- `npm.cmd test`: passed (`12` files, `75` tests).
- `npm.cmd run build`: passed.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- `git diff --check`: passed.
- In-app browser QA passed at the default desktop viewport and `390 x 844`.
- Website and Game presets displayed only their relevant Foundation questions.
- Draft generation produced all 19 documents, including the three new files.
- Export showed `19/19`, `Draft`, and **Use This Project Package** with the Phase 1 instruction.
- Browser console warnings/errors: none.
- Mobile page-level horizontal overflow: none.
- All persisted packages previously showing `16 of 19` were regenerated and now show `19 of 19`.
- Required conditional fields were rendered and checked for Business website, Web application, Android app, Game, Dashboard, Power Apps/Microsoft 365, API/backend, and Automation/workflow presets.
- A complete internal web-application QA project reached `Ready for Codex`; an incomplete project remained `Draft` while retaining generation/export access.
- Windows `Expand-Archive` inspection passed for `19-document-ready-qa.zip`.

## Phase 8 release evidence

- Production-preview workflow passed for a newly created `Phase 8 Release Candidate QA` project.
- Minimum required intake completed with zero unresolved required questions and six visible optional warnings.
- Refresh persistence and switching between the seeded project and release-candidate project passed.
- Generation produced all 19 documents.
- Representative Architect, Codex, and phased prompt documents contained the active project identity and explicit missing markers.
- Document search hid all documents for a no-match query and restored the document set after clearing.
- Export diagnostics reported 19 expected documents, 19 actual documents, valid folder mapping, both manifests, package readiness, and zero errors.
- Architect, Codex, and phased prompt copy actions returned 2,089, 1,831, and 5,853 characters respectively from the active project.
- Browser console verification reported zero warnings or errors.
- Responsive checks at `390 x 844`, `768 x 1024`, and `1440 x 1000` reported no page-level horizontal overflow.
- Every rendered button and form control in the checked views had an accessible name; main and navigation landmarks were present; visible `:focus-visible` styling was detected.
- The skip-link target was hardened to be programmatically focusable and explicitly receive focus on activation.
- Current in-app testing used the available Chromium-based browser surface. Firefox-specific verification remains uncompleted.

## Full regression checklist

1. Start with empty storage and create a project from the Mission Control empty state.
2. Complete the minimum required Foundation, Users, Features, Data, Workflows, and Security questions.
3. Refresh and confirm the active project and intake values persist.
4. Create a second project, switch projects, and confirm each project retains its own intake and generated documents.
5. Open Scope Review and confirm required questions and optional warnings are clearly separated.
6. Generate the project package and confirm all 19 generated documents are available.
7. Edit intake after generation and confirm the saved generated documents remain unchanged until Generate is run again.
8. Preview multiple documents, search for a missing file name, clear the search, and confirm plain-text rendering.
9. Confirm exact `[MISSING: ...]` markers remain visible in incomplete generated documents.
10. Open Export before generation and confirm a clear blocked state and Generate action.
11. Open Export after generation and confirm 19 expected documents, 19 actual documents, valid folder mapping, Draft/Ready for Codex status, manifests, warnings, and zero errors.
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

The technical archive portion passed on Windows using the exact production package generator followed by Windows `Expand-Archive` into a fresh temporary directory.

Technical results:

- Sanitized root folder: passed.
- All 12 approved folders: passed.
- Exactly 19 core Markdown documents: passed.
- Missing, duplicate, empty, unsafe, or unreadable core files: none.
- Stale 16-document references in the generated package: none.
- `00_Project_Overview/EXPORT_MANIFEST.md`: passed.
- `project-manifest.json`: passed.
- Representative README, scope, Architect, Codex, and phased prompt documents were readable: passed.
- Exact `[MISSING: ...]` markers: passed.
- Duplicate or unsafe paths: none.
- Active-project identity and intake data: passed.

Release-owner result:

1. Downloaded the ZIP from the deployed Cloudflare Worker site.
2. Opened it in Windows Explorer.
3. Confirmed the 12 approved folders and root `project-manifest.json`.
4. Confirmed `00_Project_Overview/EXPORT_MANIFEST.md`.
5. Confirmed readable folder/file names with no unsafe or unexpected names.
6. Opened `00_Project_Overview/README.md` normally in VS Code from the archive.

## Deployment readiness checklist

1. Run `npm.cmd test`, `npm.cmd run test:coverage`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd audit`, and `git diff --check`.
2. Confirm TypeScript checking passes through the production build.
3. Confirm the Cloudflare Workers Static Assets deployment is approved by Jason Wilmot, Rose & Paw Digital Designs.
4. Confirm HTTPS, root refresh behavior, cache headers, and security headers on the production Worker.
5. Confirm no secrets or environment-specific credentials are present in the client bundle.
6. Confirm backup/export guidance for local-only project data is documented.
7. Record production smoke-test, rollback, and incident ownership steps.

## Known testing boundary

The production ZIP download passed direct archive inspection and a visual Windows Explorer check. Physical Chrome keyboard navigation passed, including focus order, visible focus, Shift+Tab, skip-link activation, dialog containment, Escape, and focus restoration. Firefox remains unverified because it is not installed on the verification workstation.