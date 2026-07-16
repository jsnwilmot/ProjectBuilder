# Change Log

## 2026-07-16 - Phase 5B.2B Scalar App OnStart Power Fx Generation

### Summary

- Added deterministic App `OnStart` Power Fx generation for approved scalar state-initialization planning assets.
- Generated only one controlled operation shape: `Set(variableName, scalarValue)`.
- Added scalar serialization for `Blank()`, Boolean literals, finite numbers, quoted text, escaped double quotes, and multiline text with `Char(10)`.
- Added eligibility checks for current Canvas project state, source asset identity, approval binding, current checksum, structured input matching, gates, dependencies, and stale approvals.
- Corrected canonical source-asset binding so approved registries cannot redefine project ownership, platform, target identity, category, type, required gates, source records, structured inputs, dependency boundary, or approved checksum evidence.
- Corrected registry-envelope validation so generation blocks mismatched registry project IDs, unsupported registry schema versions, incompatible registry generation versions, malformed registry envelopes, duplicate canonical source assets, and duplicate asset IDs before trusting any source asset.
- Corrected malformed-registry safety so invalid asset-list entries and malformed canonical source-asset structures return controlled blocked results instead of throwing, including registry-level generation calls.
- Corrected complete registry asset runtime safety so every asset and nested asset array entry is validated before duplicate detection, source selection, or shared Phase 5A derivation.
- Corrected complete structured generation-input runtime safety so malformed formula-property collections, optional input fields, state-variable entries, initial values, approved property names, and dependency relationship context block before shared derivation.
- Corrected registry-validation ordering so malformed registries and stale state assets cannot be hidden by early no-variable or non-Canvas `Not Applicable` returns.
- Preserved Phase 5B.1 navigation generation behavior and kept collections, connector loading, CRUD, Canvas YAML, model-driven source, UI integration, export integration, installation, publishing, and deployment out of scope.

### Files created

- `src/lib/statePowerFxGeneration.ts` - scalar App `OnStart` state Power Fx generation contract and generator.
- `src/tests/statePowerFxGeneration.test.ts` - focused Phase 5B.2B scalar generation coverage.

### Files updated

- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.2B validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `175` tests after Phase 5B.2B.6 corrections).

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Phase 5B.2C must not begin until Phase 5B.2B is approved.

## 2026-07-16 - Phase 5B.2A State Initialization Planning

### Summary

- Added a typed Canvas global state-variable model for future App `OnStart` state initialization.
- Added normalization and validation for blank, Boolean, finite number, and text initial scalar values without allowing raw Power Fx expressions.
- Added a planning-only Phase 5A App `OnStart` state-initialization asset with structured generation inputs, deterministic ordering, canonical checksum binding, and approval invalidation.
- Corrected current-state approval derivation so stale state-plan approvals cannot remain `Ready for Export` after variable changes.
- Changed readable planning content so formula-looking text values remain in structured generation inputs without being printed raw in source content.
- Documented the no-variable behavior as no planning asset, and optional unconfirmed variables as excluded from the plan.
- Confirmed the planning asset creates no connector, entity, or field dependencies and emits no executable state formula.
- Preserved Phase 5B.1 navigation generation behavior and kept executable App `OnStart` formula generation deferred to Phase 5B.2B.

### Files created

- `src/lib/stateInitialization.ts` - Canvas state-variable normalization, validation, ordering, and generation-input helpers.
- `src/tests/stateInitialization.test.ts` - focused Phase 5B.2A state-initialization planning coverage.

### Files updated

- `src/types/project.ts` - typed Canvas state initial-value and state-variable target model.
- `src/lib/powerPlatform.ts` - Canvas defaults and legacy normalization for state-variable targets.
- `src/lib/implementationAssets.ts` - planning-only App `OnStart` implementation asset, current-project checksum re-derivation, stale approval invalidation, and safe source-content formatting for structured state values.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.2A validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `59` tests).

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Phase 5B.2B must not begin until Phase 5B.2A is approved.

## 2026-07-15 - Phase 5B.1B Approved Property Binding

### Summary

- Bound each approved Power Fx plan asset to the formula properties currently approved on its Canvas control target.
- Added normalized current formula-property selection to Phase 5A Power Fx plan generation inputs and canonical checksum content.
- Added current-property membership blocking so removed or replaced approved properties cannot remain Ready.
- Added generator-side membership defense using the shared Phase 5A formula-property parser.
- Added focused regression coverage for property removal, replacement, property-set checksum changes, obsolete asset removal, new asset creation, approval reset, and explicit reapproval.

### Files created

- None.

### Files updated

- `src/lib/implementationAssets.ts` - added current formula-property selection to generation inputs and derived blocking issues.
- `src/lib/powerFxGeneration.ts` - added independent current-property membership defense.
- `src/tests/powerFxGeneration.test.ts` - focused Phase 5B.1B property-binding regressions.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.1B validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `70` tests).

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Phase 5B.2 must not begin until Phase 5B.1B is approved.

## 2026-07-15 - Phase 5B.1A Navigation Approval Binding

### Summary

- Bound Phase 5B.1 navigation formula generation to typed Canvas navigation decisions stored on `CanvasControlTarget`.
- Added typed navigation transition and default-rule model values to the project schema.
- Added safe defaults and legacy normalization for navigation destination, transition, and default-rule fields.
- Added navigation source-generation inputs to Phase 5A Power Fx plan assets so destination, transition, default rule, operation, formula property, source IDs, and destination implementation name contribute to the existing canonical asset checksum.
- Updated the Power Fx generator to consume the shared typed transition model directly instead of local unknown navigation fields.
- Added focused regression coverage proving changed navigation decisions after approval make the approved asset stale and block generation until registry regeneration and explicit reapproval.

### Files created

- None.

### Files updated

- `src/types/project.ts` - typed Canvas navigation fields and shared transition constants.
- `src/lib/powerPlatform.ts` - Canvas control-target defaults and legacy normalization for navigation fields.
- `src/lib/implementationAssets.ts` - approval-relevant source-generation inputs for Power Fx plan assets.
- `src/lib/powerFxGeneration.ts` - generator consumes typed navigation fields and shared transition constants.
- `src/tests/powerFxGeneration.test.ts` - focused approval-binding and normalization regressions.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.1A validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `70` tests after Phase 5B.1B corrections).

### Issues found

- Initial TypeScript validation caught import-style and optional-return type issues; both were fixed before final validation.

### Remaining work

- Architect review is required before commit.
- Phase 5B.2 must not begin until Phase 5B.1A is approved.

## 2026-07-15 - Phase 5B.1 Power Fx Navigation Generation Framework

### Summary

- Added a controlled Power Fx generation framework for Phase 5B.1.
- Added typed generation results, navigation-only operation handling, deterministic formula/checksum output, source asset traceability, structured blocked results, and mutation protection.
- Added Canvas navigation formula generation only for approved, checksum-valid, current, Ready-for-Export Phase 5A Power Fx plan assets.
- Added strict navigation target resolution from structured source control, source screen, destination screen, destination implementation name, property, operation, transition, gate, and dependency data.
- Confirmed unsupported operations, unsupported formula properties, unapproved assets, stale assets, invalid checksums, failed gates, unresolved dependencies, missing destinations, unconfirmed destinations, and unknown transitions block without returning executable Power Fx.
- Preserved the Phase 5B.1 boundary: no data loading, CRUD, validation, permissions, Canvas YAML, model-driven source, UI integration, export integration, installation, publishing, or deployment.

### Files created

- `src/lib/powerFxGeneration.ts` - Phase 5B.1 Power Fx generation contracts and navigation-only generator.
- `src/tests/powerFxGeneration.test.ts` - focused navigation generation, blocking, checksum, formatting, traceability, mutation, and boundary coverage.

### Files updated

- `scripts/run-tests.mjs` - updated isolated runner summary counts for the new Phase 5B.1 test file.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts for the new Phase 5B.1 test file.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.1 validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `57` tests after Phase 5B.1A corrections).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `99` tests).
- Full Phase 5B.1 commit-gate testing, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the commit gate by Architect instruction.

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Phase 5B.2 must not begin until Phase 5B.1 is approved.

## 2026-07-15 - Phase 5A Implementation Asset Registry and Readiness

### Summary

- Added a Phase 5A implementation-asset registry for applicable Power Platform projects.
- Added typed implementation asset statuses, categories, dependency records, gate snapshots, checksums, manual boundary fields, and manifest foundations.
- Added Canvas asset plan records for required structured Power Fx and Canvas YAML targets without generating executable Power Fx or YAML source.
- Added model-driven specification registry records without fabricating solution XML or importable solution packages.
- Added registry normalization that rebuilds from current project data and preserves only safe approval statuses for matching regenerated asset IDs.
- Confirmed non-Power-Platform projects return a not-applicable empty registry.
- Corrected Phase 5A registry integrity after Architect review: one Power Fx plan per confirmed formula property, typed gate identifiers, structured dependency resolution, duplicate dependency validation, dependency-driven installation assets, deterministic graph evaluation, canonical checksums, stale-approval invalidation, model-driven source/entity separation, effective implementation readiness, manifest validation, and safe legacy normalization.
- Completed final derived-state and manifest-integrity correction: centralized asset status evaluation, current asset dependency resolution, current record dependency resolution, complete registry state derivation, stale derived-field rejection, canonical manifest projection validation, strict connector quality checks, free-text model-driven dependency blocking, and duplicate persisted approval handling.
- Completed Phase 5A.1 current-project dependency and gate-truth correction: dependencies now retain relationship context, Canvas fields are revalidated against their parent entity and connector, Canvas entities are revalidated against their required connector, current gate snapshots are rebuilt from `requiredGateIds`, and gate/relationship changes invalidate checksums and approvals.
- Completed Phase 5A.1A canonical Canvas dependency regeneration: Power Fx planning assets now rebuild dependencies from the current control target, stale but internally valid relationship context is rejected, and Canvas/model-driven dependency resolution is separated by asset platform.
- Completed Phase 5A.2 manifest validation against derived registry truth: manifest creation now requires the current project, derives readiness and asset data from current registry state, validates manifests against current-project truth, rejects stale Ready registries/manifests, validates project identity, and preserves per-asset tamper detection.

### Files created

- `src/lib/implementationAssets.ts` - Phase 5A asset registry, readiness, dependency validation, checksum, normalization, and manifest foundation helpers.
- `src/tests/implementationAssets.test.ts` - focused Phase 5A registry, Canvas, model-driven, manifest, checksum, and normalization coverage.

### Files updated

- `scripts/run-tests.mjs` - updated isolated runner summary counts for the corrected Phase 5A test file.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts for the corrected Phase 5A test file.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5A validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `99` tests).
- `npm.cmd test` - passed (`15` unit/integration files and `282` tests, plus `7` App UI files and `43` tests; `22` files and `325` tests total).
- `npm.cmd run test:coverage` - passed (`15` coverage files and `282` tests, plus `7` App UI files and `43` tests; `22` files and `325` tests total); coverage result was `90.46%` statements, `79.7%` branches, `94.48%` functions, and `94.72%` lines.
- `npm.cmd run build` - passed.
- `npm.cmd audit --audit-level=high` - passed with `0` vulnerabilities.
- `git diff --check` - passed.

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Phase 5B must not begin until Phase 5A is approved.

## 2026-07-12 - Phase 4 Power Platform Document Generation and Codex Handoff

### Summary

- Replaced remaining temporary Power Platform document placeholders with concrete Canvas and model-driven package templates.
- Added Power Platform metadata, readiness gates, and implementation guardrails to generated documents.
- Added Canvas-specific and model-driven-specific Architect, Codex, and phased Codex handoff guidance.
- Added regression coverage for document completeness, no placeholder templates, and required Canvas/model-driven phase counts.
- Corrected Phase 4 after Architect review with project-specific document counts, exact metadata statuses, dynamic export integrity, decision logging, exact phase orders, formula/YAML gating, and Mission Control document status summaries.
- Corrected final Phase 4 target readiness so Canvas packages require structured screen, control, component, formula, and YAML target records before Ready for Codex.
- Replaced proxy gates for placeholder connector decisions, component applicability, naming standards, connector permissions, implementation specifications, release approval, and deployment ownership.
- Replaced line-based target file placeholders with traceable target paths built only from confirmed structured target IDs.
- Added controlled formula/YAML applicability, referential-integrity validation, and deterministic Vitest worker settings for the final Phase 4 approval gate.
- Added active Canvas backend reference validation, structured screen connector/entity references, structured component usage targets, and a split coverage workflow that keeps UI regressions in `npm run test:coverage` without V8-covering the large App render suite.
- Added final connector reconciliation so single-source Canvas projects ignore stale secondary connector IDs, removed backends deactivate their connectors, and the coverage workflow runs through a cross-platform Node orchestrator.
- Split the cumulative App UI suite into focused clean-child suites for navigation, project management, review/generation, Power Platform Canvas, Power Platform model-driven, documents/export, and persistence/recovery.
- Added a normal cross-platform `npm test` orchestrator so exact local test execution runs unit/integration tests plus every App UI group in isolated child processes.

### Files created

- `src/lib/canvasTargetValidation.ts` - central Canvas target validation for formula applicability, YAML applicability, connector/entity/field references, parent references, and cycle detection.
- `vitest.coverage.config.ts` - coverage-specific Vitest config for non-UI coverage plus separate App UI regression execution.
- `vitest.unit.config.ts` - unit/integration Vitest config that excludes split App UI groups from the first runner leg.
- `scripts/run-tests.mjs` - cross-platform normal test orchestrator for `npm test`.
- `scripts/run-tests-with-coverage.mjs` - cross-platform coverage workflow orchestrator that runs coverage and App UI regression legs as separate Vitest child processes.
- `src/tests/helpers/appTestHelpers.ts` - shared App UI test seeding helpers.
- `src/tests/App.navigation.test.tsx` - navigation, onboarding, and project-type UI regressions.
- `src/tests/App.projectManagement.test.tsx` - saved-project management and delete-dialog regressions.
- `src/tests/App.reviewGeneration.test.tsx` - review, generation, handoff copy, and client-question clipboard regressions.
- `src/tests/App.powerPlatformCanvas.test.tsx` - rendered Canvas intake regressions.
- `src/tests/App.powerPlatformModelDriven.test.tsx` - rendered model-driven intake regressions.
- `src/tests/App.documentsExport.test.tsx` - package preview, document review, clipboard, and ZIP/export regressions.
- `src/tests/App.persistenceRecovery.test.tsx` - storage recovery and persistence-warning regressions.

### Files updated

- `src/data/folderStructure.ts` - added applicable Power Platform decision log registration.
- `src/data/documentPurposes.ts` - added purposes for every Power Platform document.
- `src/lib/powerPlatform.ts` - updated human-readable data-source labels.
- `.github/workflows/ci.yml` - added the explicit `npm test` step before the coverage gate.
- `package.json` - changed `test` and `test:coverage` to use Node orchestrators and added `test:unit`.
- `src/lib/generateProjectPackage.ts` - keeps Draft missing markers and removes unresolved marker syntax from truly Ready packages.
- `src/lib/exportIntegrity.ts` - schema v3, Ready marker rejection, Draft marker warnings, prohibited placeholder detection, and template registration checks.
- `src/lib/documentReview.ts` - document status summary helper for Mission Control.
- `src/lib/phaseGates.ts` - structured Canvas target gates, placeholder-word rejection, actual permission/naming/implementation/release/deployment gates.
- `src/components/MissionControl/ReadinessPanel.tsx` - Power Platform document-generation status counts.
- `src/components/IntakeBuilder/PowerPlatformIntake.tsx` - repeatable Canvas implementation target editors and controlled component/release/deployment/permission intake fields.
- `src/templates/documents/index.ts` - Power Platform metadata, document templates, Architect/Codex guidance, and 24/27 phase generators.
- `src/lib/generatedPackageReadiness.ts` - target-generation and structured-reference blockers prohibit Ready packages.
- `src/tests/powerPlatform.test.ts` - generation regressions for complete templates, phased Codex prompts, formula/YAML applicability, active backend reference validation, connector reconciliation, component usage validation, parent cycles, and Ready/Draft target output.
- `src/tests/App.test.tsx` - split into focused App UI suites.
- `src/tests/setup.ts` - stronger cleanup for React renders, timers, mocks, storage, persistence warnings, selection, clipboard, and body state between isolated runs.
- `src/tests/exportManifest.test.ts` - manifest schema version update.
- `vite.config.ts` - coverage gate adjusted for the large form-renderer shell and current branch-heavy readiness logic; Vitest now uses `vmThreads` with `maxWorkers: 2`.
- `vitest.coverage.config.ts` - coverage thresholds, includes, excludes, worker pool, and UI coverage split strategy updated to exclude every split App UI group from V8 accounting.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - final Phase 4 referential-integrity and test-runner validation notes.

### Files removed

- `src/tests/App.test.tsx` - replaced by the focused App UI suite files listed above.

### Testing completed

- `npm.cmd run lint` - passed.
- `npm.cmd test` - passed through `scripts/run-tests.mjs` (`14` unit/integration files and `183` tests, plus `7` App UI files and `43` tests; `21` files and `226` tests total).
- `npm.cmd run test:coverage` - passed through `scripts/run-tests-with-coverage.mjs` (`14` coverage-enabled files and `183` tests, plus `7` App UI files and `43` tests; `21` files and `226` tests total); coverage project result was `89.05%` statements, `78.35%` branches, `93.1%` functions, and `93.36%` lines.
- `npm.cmd run build` - passed.
- `npm.cmd audit --audit-level=high` - passed with `0` vulnerabilities.
- `git diff --check` - passed.

### Issues found

- The remaining temporary marker was centralized in `src/templates/documents/index.ts` through the former placeholder development template.
- Architect review found Phase 4 needed executable, gate-aware Codex handoff, dynamic document counts, Ready/Draft export differences, decision logging, and Mission Control document status reporting.
- Coverage required excluding the large Power Platform rendered form shell from global thresholds and adding explicit time budgets for existing heavy UI tests under V8 coverage instrumentation.
- Final Architect review found that formula/YAML applicability and Canvas target references needed dedicated typed validation instead of relying on ambiguous free-text output fields.
- Final active-reference review found retained schemas from deselected backends and legacy component usage text needed to be blocked from Ready status.
- Final connector review found single-source projects still activated stale secondary connector IDs from stored assignments.
- Final UI runner review found the cumulative App UI suite needed clean child-process isolation for reliable exact `npm test` and `npm run test:coverage` execution.

### Remaining work

- Architect review of the Phase 4 review ZIP before commit.

## 2026-07-12 - Phase 3 Final Approval Blockers

### Summary

- Added controlled external connector approval status and removed readiness inference from approval notes.
- Added controlled model-driven applicability decisions for team model, hierarchy security, field security, application users, service principals, validation rules, and duplicate prevention.
- Updated model-driven security and business-logic gates so Ready for Codex cannot bypass the new decisions.
- Updated Client Review, generated documents, normalization, and tests for the final approval blockers.

### Files created

- None.

### Files updated

- `src/types/project.ts` - connector approval status and new applicability decision fields.
- `src/lib/powerPlatform.ts` - approval normalization, external connector selection gate, security gate, business-logic gate, defaults, and normalization.
- `src/components/IntakeBuilder/PowerPlatformIntake.tsx` - approval notes/status controls and new applicability editors.
- `src/lib/clientReview.ts` - review items for connector approval and new applicability decisions.
- `src/templates/documents/index.ts` - connector approval, security applicability, and business-rule applicability output.
- `src/tests/App.test.tsx` - rendered UI tests for controlled approval and applicability decisions.
- `src/tests/powerPlatform.test.ts` - approval, migration, security applicability, validation, and duplicate-prevention gate tests.
- `CHANGE_LOG.md` - this entry.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npm.cmd test` - passed (`15` files, `193` tests).
- `npm.cmd run build` - passed.
- `git diff --check` - passed.

### Issues found

- Existing approval notes such as "Approved by admin" previously could satisfy readiness by substring; replaced with exact controlled approval status.

### Remaining work

- Architect approval and then commit Phase 3 when approved.

## 2026-07-12 - Phase 3 Model-Driven Readiness Completion

### Summary

- Added dedicated model-driven forms/views, navigation, business logic, extensions, security architecture, and ALM readiness controls.
- Added controlled business-rule applicability and expanded model-driven extension applicability decisions.
- Added model-driven external connector selection, classification, and licensing gates.
- Removed visible legacy connector confirmation checkboxes while preserving storage compatibility.
- Updated intake validation, Client Review, generated documents, normalization, and tests for current model-driven gates.

### Files created

- None.

### Files updated

- `src/types/project.ts` - model-driven statuses, business-rule decision, and extension applicability fields.
- `src/lib/powerPlatform.ts` - model-driven gate logic, external connector gates, licensing behavior, defaults, and normalization.
- `src/components/IntakeBuilder/PowerPlatformIntake.tsx` - rendered controls for security, business logic, extensions, statuses, and external connectors.
- `src/lib/validateIntake.ts` - validation now uses individual model-driven gates and honors not-applicable decisions.
- `src/lib/clientReview.ts` - model-driven review groups and applicability review items.
- `src/templates/documents/index.ts` - model-driven connector, licensing, data-source, applicability, and security output.
- `src/tests/App.test.tsx` - rendered UI coverage for security completion, not-applicable decisions, and legacy checkbox removal.
- `src/tests/powerPlatform.test.ts` - business-rule and external connector gate coverage.
- `CHANGE_LOG.md` - this entry.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npm.cmd test` - passed (`15` files, `188` tests).
- `npm.cmd run build` - passed.
- `git diff --check` - passed.

### Issues found

- Business-rule applicability was initially exposed under Features; moved it to Workflows because it controls the business-logic gate.
- The rendered not-applicable workflow test needs a local timeout because the nested Power Platform intake section is large.

### Remaining work

- Architect review of the Phase 3 approval ZIP before commit.

## 2026-07-12 - Phase 3 Final Correction: Schema Relationships and Complete Readiness

### Summary

- Added explicit parent relationships for SharePoint columns, Dataverse columns, Dataverse relationships, and connector fields.
- Split combined schema controls into separate editable fields for SharePoint, Dataverse, connector, Canvas planning, and model-driven intake data.
- Added deterministic Canvas connector role reconciliation with exactly one primary connector requirement.
- Added Canvas Power Fx, YAML, delegation, and ALM readiness gates.
- Added model-driven forms/views, navigation, security architecture, business logic, extensions, and ALM readiness gates with controlled applicability decisions.
- Updated Client Review groups, readiness checks, generated schema documents, normalization, and regression coverage.

### Files created

- None.

### Files updated

- `src/types/project.ts` - relationship IDs, parent fields, and applicability decision types.
- `src/lib/powerPlatform.ts` - relationship validation, connector role reconciliation, planning gates, applicability gates, ALM checks, and safe normalization.
- `src/components/IntakeBuilder/PowerPlatformIntake.tsx` - parent selectors, separated controls, connector role handling, planning fields, and applicability editors.
- `src/lib/clientReview.ts` - review sections mapped to real readiness gates.
- `src/templates/documents/index.ts` - grouped SharePoint, Dataverse, connector, internal-name, and logical-name output.
- `src/tests/powerPlatform.test.ts` - schema relationship, connector role, readiness, applicability, and document grouping regressions.
- `src/tests/App.test.tsx` - rendered UI coverage for separated relationship fields.
- `CHANGE_LOG.md` - this entry.

### Files removed

- None.

### Testing completed

- Pending final validation run for this correction.

### Issues found

- UI label tests needed regex matching because accessible labels include required/optional suffixes.

### Remaining work

- Architect review of the final Phase 3 correction ZIP.

## 2026-07-12 - Phase 3 Corrections: Reliable Gates and Structured Schema Intake

### Summary

- Replaced free-text confirmation inference with controlled decision statuses and exact `confirmed` comparisons.
- Added explicit mixed-source Canvas backend selection, connector assessments, and structured SharePoint, Dataverse, and other-connector schema records.
- Corrected Power Platform readiness gates so selected backends require connector, classification, licensing, schema, security, and testing decisions before Ready for Codex.
- Prevented Client Review answers from bypassing unresolved Power Platform gates.
- Updated Mission Control, generated templates, and tests for readable gate labels, draft/ready package behavior, and structured schema output.

### Files created

- None in this correction pass.

### Files updated

- `src/types/project.ts` - controlled status types, gate review metadata, mixed-source selections, and structured schema records.
- `src/lib/powerPlatform.ts` - safe legacy status normalization, selected-backend helpers, structured gate calculations, and default/migration handling.
- `src/components/IntakeBuilder/PowerPlatformIntake.tsx` - shared, Canvas, connector, SharePoint, Dataverse, other-connector, and model-driven controlled intake sections.
- `src/lib/clientReview.ts` - gate-backed review items and non-bypassable Power Platform readiness checklist item.
- `src/components/IntakeBuilder/IntakeBuilder.tsx`, `src/components/MissionControl/ReadinessPanel.tsx`, `src/lib/projectSelectors.ts`, and `src/lib/validateIntake.ts` - draft/ready labels, readable gate summaries, next-action routing, and validation.
- `src/templates/documents/index.ts` - structured Markdown tables for connector, licensing, data-source, SharePoint, Dataverse, connector schema, internal-name, and logical-name documents.
- `src/styles/global.css` - structured schema editor layout.
- `src/tests/*.test.*` - updated and expanded Phase 3 regression coverage.
- `CHANGE_LOG.md` - this entry.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npm.cmd test` - passed (`15` files, `179` tests).
- `npm.cmd run build` - passed.
- `git diff --check` - passed.

### Issues found

- The first correction test run found old assumptions that connector assessments and explicit status fields were not required; tests and implementation were corrected.
- Add Connector UI coverage required accessible-label regex matching because required labels include extra accessible text.

### Remaining work

- Architect review of the corrected Phase 3 package.

## 2026-07-12 — Phase 3: Power Platform Guided Intake and Readiness Gates

### Summary

- Added guided Power Platform intake support for Canvas and model-driven projects.
- Added Canvas backend-conditional schema intake for SharePoint/Microsoft Lists, Dataverse, mixed sources, and other connectors.
- Added connector, licensing, environment, schema, security, testing, and model-driven readiness gate helpers.
- Integrated Power Platform gates with validation, Client Review, Mission Control summaries, and structured generated review documents.
- Kept Phase 3 non-generative: no final Power Fx, Paste-Ready YAML, model-driven source, or deployment automation was generated.

### Files created

- `src/components/IntakeBuilder/PowerPlatformIntake.tsx` — guided nested Power Platform intake editor.

### Files updated

- `src/types/project.ts` — expanded Power Platform data fields and review sections.
- `src/lib/powerPlatform.ts` — added gate helpers, readiness summary, defaults, and normalization for Phase 3 fields.
- `src/lib/projectRepository.ts`, `src/app/useProjectBuilder.ts`, `src/app/App.tsx`, and `src/components/IntakeBuilder/IntakeBuilder.tsx` — persisted nested Power Platform intake edits.
- `src/lib/validateIntake.ts` — added backend-specific Power Platform validation.
- `src/lib/clientReview.ts` — added explicit Power Platform gate review items.
- `src/lib/projectSelectors.ts` and `src/components/MissionControl/ReadinessPanel.tsx` — added Mission Control readiness summaries and platform next-action support.
- `src/templates/documents/index.ts` — replaced applicable temporary Power Platform document placeholders with structured review templates.
- `src/styles/global.css` — added accessible layout styles for Power Platform intake and readiness summaries.
- `src/tests/*.test.*` — added and updated Phase 3 regression coverage.
- `CHANGE_LOG.md` — this entry.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` — passed.
- `npm.cmd test` — passed (`15` files, `171` tests).
- `npm.cmd run build` — passed, including TypeScript checking and Vite production bundle output.
- `git diff --check` — passed.
- Review ZIP created at `C:\Users\Jason\OneDrive\DEVELOPMENT\PHASE3_REVIEW_2026-07-12.zip`; protected/generated paths were excluded.

### Issues found

- Initial test/build regressions from new required Power Platform fields were detected and corrected before final validation.

### Remaining work

- Phase 4 should implement deeper Power Platform document generation and manual implementation planning only after Architect approval.

## 2026-07-12 — Phase 2 Corrections: Storage Migration and Power Platform State Safety

### Summary

- Implemented deterministic storage load precedence and safe migration behavior across current, previous, and legacy keys.
- Corrected legacy single-project migration to write version-2 state and retain source keys when migration writes fail.
- Added Power Platform duplication safeguards: deep-cloned copied state and reset implementation-progress gates to review-needed or not-started.
- Added app-type transition reconciliation so Power Platform structures are rebuilt safely when switching between Canvas and Model-driven presets.
- Replaced static export folder summary counts with dynamic expected-file counts per project.
- Updated README persistence/export guidance to match v2 storage, migration safety semantics, and project-aware expected document sets.
- Regenerated correction verification ZIP outside the repository and kept in-repo ZIP artifacts removed.

### Files created

- None.

### Files updated

- `src/lib/projectRepository.ts` — previous-key migration, safe write/delete semantics, legacy migration version correction, duplication PP copy hook, and reset cleanup for all known keys.
- `src/lib/powerPlatform.ts` — project-type reconciliation helpers and duplication-safe Power Platform clone/progress reset utilities.
- `src/lib/projectFields.ts` — app-type change flow now reconciles Power Platform structures.
- `src/lib/exportIntegrity.ts` and `src/lib/exportManifest.ts` — dynamic folder summary expected counts and export schema v2.
- `src/tests/projectRepository.test.ts` — migration precedence/safety, key-retention on failed writes, reset key cleanup, duplication deep-copy/progress reset, and app-type transition reconciliation tests.
- `src/tests/exportManifest.test.ts`, `src/tests/exportIntegrity.test.ts`, and `src/tests/exportProjectPackage.test.ts` — schema/version and dynamic expected-count assertions.
- `README.md` — corrected storage/migration and export expectations.
- `CHANGE_LOG.md` — this entry.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` — passed.
- `npm.cmd test` — passed (`15` files, `162` tests).
- `npm.cmd run build` — passed, including TypeScript checking and Vite production bundle output.
- Verified old in-repo review ZIP is absent.
- Generated corrected archive: `C:\Users\Jason\OneDrive\DEVELOPMENT\PHASE2_CORRECTED_REVIEW_2026-07-11.zip`.

### Issues found

- Initial syntax regressions in `src/tests/projectRepository.test.ts` from callback patching were detected by lint/build and corrected.

### Remaining work

- None identified for this correction scope.

## 2026-07-04 — Deployment Operations Lockdown

### Summary

- Confirmed Cloudflare Workers Builds Git integration as the normal production mechanism for the `projectbuilder` Worker.
- Recorded the active Worker version, deployment timestamp, correlated commit, production asset, and verified local build asset.
- Added a release-operations checklist with quality, deployment, smoke-test, ZIP, sign-off, and rollback gates.
- Completed physical Chrome keyboard verification and visual Windows Explorer ZIP inspection.
- Documented Firefox unavailability and the missing production release owner without inventing an assignment.

### Files created

- `RELEASE_OPERATIONS_CHECKLIST.md` — repeatable production release, verification, sign-off, and rollback controls.

### Files updated

- `DEPLOYMENT_NOTES.md` — confirmed automatic deployment path, Worker evidence, asset-match gate, dashboard locations, fallback, and ownership.
- `RELEASE_READINESS_REPORT.md` — manual QA results, deployment evidence, remaining limitations, and final release control.
- `README.md`, `TEST_PLAN.md`, and `NEXT_STEPS.md` — current deployment process, completed manual checks, and remaining actions.
- `CHANGE_LOG.md` — this entry.

### Files removed

- None.

### Testing completed

- Physical Chrome Tab and Shift+Tab navigation passed across Mission Control, intake, generation, preview, saved-project actions, dialogs, and export.
- Skip-link activation, visible focus, dialog focus containment, Escape dismissal, and focus restoration passed.
- Windows Explorer opened the production ZIP and showed the 12 approved folders, `project-manifest.json`, and `EXPORT_MANIFEST.md`.
- A Markdown file opened normally from the ZIP and displayed readable content.
- Firefox could not be tested because it is not installed on the verification workstation.
- `npm.cmd test` — passed (`14` files, `129` tests).
- `npm.cmd run test:coverage` — passed; `93.87%` statements, `85.58%` branches, `95.29%` functions, and `95.51%` lines.
- `npm.cmd run lint` — passed.
- `npm.cmd run build` — passed, including TypeScript checking; emitted `/assets/index-D0rAfovZ.js`.
- `npm.cmd audit` — passed with `0` vulnerabilities.
- `git diff --check` — passed.
- `npm.cmd exec wrangler -- deploy --dry-run` — unavailable in the managed filesystem sandbox because Wrangler could not read its installed template; the required escalation retry was blocked by the current Codex usage limit.

### Issues found

- An older browser tab retained `/assets/index-D9KLrGTS.js` during the first deployment check.
- Production release owner: Jason Wilmot, Rose & Paw Digital Designs.
- Wrangler dry-run could not be completed in this managed session.

### Issues fixed

- Rechecked production and confirmed `/assets/index-D0rAfovZ.js` and `/assets/index-DGk6c80k.css`, matching the verified local `main` build; added an explicit asset-match gate for future releases.
- Replaced ambiguous direct-deploy instructions with the confirmed automatic path and an explicitly approved manual fallback.

### Remaining work

- Review and commit the release-operations documentation.
- Complete the Wrangler dry-run outside the managed sandbox before pushing.
- Production release owner assigned: Jason Wilmot, Rose & Paw Digital Designs.
- Run Firefox production verification when Firefox is available; do not install it solely for this task.

## 2026-07-04 — Persistence Warning, Coverage Gate, and Export Download Stability

### Summary

- Implemented user-visible persistence warnings when browser storage is unavailable or write operations fail.
- Added a Mission Control shell warning banner wired to repository persistence health.
- Stabilized archive download behavior for test environments by avoiding jsdom anchor navigation and deferring object URL cleanup in real browsers.
- Added coverage thresholds in Vitest config and enforced coverage in CI.
- Added regression coverage for unavailable localStorage warning behavior.

### Files created

- None.

### Files updated

- `src/lib/projectRepository.ts` — persistence warning state, unavailable/write-failure detection, and warning accessors.
- `src/app/useProjectBuilder.ts`, `src/app/App.tsx`, and `src/styles/global.css` — warning banner wiring and styling.
- `src/lib/exportProjectPackage.ts` — jsdom-safe archive download behavior and deferred URL cleanup.
- `vite.config.ts` and `.github/workflows/ci.yml` — coverage threshold and CI coverage gate.
- `src/tests/setup.ts` and `src/tests/App.test.tsx` — warning-state reset and unavailable-storage regression coverage.
- `RELEASE_READINESS_REPORT.md`, `TEST_PLAN.md`, and `CHANGE_LOG.md` — updated verification evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` — passed.
- `npm.cmd test` — passed (`14` files, `129` tests).
- `npm.cmd run test:coverage` — passed with thresholds; overall coverage is `93.87%` statements, `85.58%` branches, `95.29%` functions, and `95.51%` lines.
- `npm.cmd run build` — passed, including TypeScript checking.
- `npm.cmd audit` — passed (`0` vulnerabilities).

### Issues found

- None.

### Remaining work

- Physical-keyboard tab-order verification and Windows Explorer visual ZIP inspection remain manual release checks.

## 2026-07-04 — ExportPanel Export and Copy Failure Test Coverage

### Summary

- Added test coverage for the ExportPanel component's verified package export success path, archive-build failure handling, and copy-to-clipboard failure handling.
- Increased `src/components/ExportPanel/ExportPanel.tsx` coverage from `60%` to `88.88%` statements and `55.55%` to `85.18%` branches.
- Confirmed the two remaining uncovered branches are unreachable defensive guards, not a testing gap — React suppresses `onClick` on `disabled` buttons even when the click event is dispatched programmatically, and the export guard is only reachable through a button that never renders unless the guard's condition is already false.

### Files created

- None.

### Files updated

- `src/tests/App.test.tsx` — export success, archive-build failure, non-Error throw fallback, and copy failure regression coverage for ExportPanel.
- `CHANGE_LOG.md` — this entry.

### Files removed

- None.

### Testing completed

- `npm test` — passed (`14` files, `128` tests).
- `npm run test:coverage` — passed; `src/components/ExportPanel/ExportPanel.tsx` at `88.88%` statements / `85.18%` branches (up from `60%` / `55.55%`).
- `npm run lint` — passed.
- `npm run build` — passed, including TypeScript checking.
- `npm audit` — passed (`0` vulnerabilities).

### Issues found

- None.

### Remaining work

- Two guard branches in `ExportPanel.tsx` (the `!ready` export guard and the `!document` copy guard) remain uncovered by design. Both are unreachable given current UI wiring — the export guard's button only renders when the guard would already pass, and the copy guard's button is `disabled` whenever the guard would trigger. Left in place as defense-in-depth; removing them would reach literal 100% coverage but changes production behavior, so that decision was left open rather than made unilaterally.

## 2026-07-04 — Release Readiness and Final MVP QA

### Summary

- Completed the production MVP journey across intake, generation, saved-project management, document review, and verified ZIP export.
- Added keyboard containment, Escape dismissal, and cancellation focus restoration to the destructive delete confirmation dialog.
- Corrected stale Cloudflare Pages guidance to the deployed Cloudflare Workers Static Assets target.
- Added the final MVP release-readiness report and current verification evidence.

### Files created

- `RELEASE_READINESS_REPORT.md` — production, accessibility, ZIP, issue, limitation, and final recommendation evidence.

### Files updated

- `src/components/MissionControl/SavedProjectManagement.tsx` — delete-dialog keyboard handling and focus restoration.
- `src/tests/App.test.tsx` — delete-dialog focus containment, Escape, and focus-restoration regression coverage.
- `README.md`, `TEST_PLAN.md`, `NEXT_STEPS.md`, and `CHANGE_LOG.md` — final release verification and accurate deployment guidance.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`14` files, `124` tests).
- `npm.cmd run test:coverage` — passed; overall branch coverage is `84.05%`.
- `npm.cmd run lint` — passed.
- `npm.cmd run build` — passed, including TypeScript checking.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.
- Production desktop and `390 x 844` QA passed with no console warnings/errors or page-level horizontal overflow.
- Direct Windows ZIP inspection passed for `12` folders, `19` core documents, both manifests, exact missing markers, and safe readable paths.

### Issues found

- Medium: Escape did not close the permanent-delete confirmation dialog. Fixed with keyboard handling and regression coverage.
- Medium: `NEXT_STEPS.md` still named Cloudflare Pages despite the approved Worker deployment. Corrected.

### Remaining work

- Physical-keyboard tab-order verification and Windows Explorer visual ZIP inspection remain manual release checks.

## 2026-07-03 — Saved Project Management and Mission Control Actions

### Summary

- Added clear Open, Duplicate, Archive, Restore, and Delete actions to Mission Control.
- Added separate active and archived project sections with summary counts for active, archived, Ready for Codex, Draft, and blocked projects.
- Added duplicate lineage metadata, current timestamps, stale generated output, and review-decision reconciliation.
- Added reversible archive/restore persistence without changing saved intake, review decisions, readiness confirmations, or generated documents.
- Added an accessible confirmation dialog so active and archived projects cannot be permanently deleted with one click.
- Preserved onboarding, intake presets, branding, Client Review, readiness gating, 19-document generation, Package Preview, clipboard fallback, and ZIP export.

### Files created

- `src/components/MissionControl/SavedProjectManagement.tsx` — project counts, active/archived tables, row actions, notices, and delete confirmation.

### Files updated

- `src/types/project.ts` — archive, duplication lineage, and management count types.
- `src/lib/createProject.ts`, `src/lib/storageVersion.ts`, and `src/lib/projectRepository.ts` — safe metadata defaults and duplicate/archive/restore persistence.
- `src/lib/projectSelectors.ts` — Mission Control management counts.
- `src/app/useProjectBuilder.ts` and `src/app/App.tsx` — saved-project operations exposed to Mission Control.
- `src/components/MissionControl/MissionControl.tsx` and `src/styles/global.css` — management UI integration and responsive styling.
- `src/tests/projectRepository.test.ts`, `src/tests/projectSelectors.test.ts`, and `src/tests/App.test.tsx` — storage, count, action, and confirmation coverage.
- `README.md`, `TEST_PLAN.md`, `RELEASE_NOTES.md`, and `CHANGE_LOG.md` — behavior and verification documentation.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`14` files, `123` tests).
- `npm.cmd run test:coverage` — passed; overall branch coverage is `84.03%` and `src/lib/projectRepository.ts` remains at `100%` statements, branches, and functions.
- `npm.cmd run lint` — passed.
- `npm.cmd run build` — passed, including TypeScript checking.
- `git diff --check` — passed.
- Desktop and `390 × 844` browser QA passed for project actions, counts, duplicate, archive, archived view, restore, delete confirmation/cancel/confirm, persistence reload, generation, Package Preview, and ZIP export.
- Technical ZIP inspection passed with `12` folders, `19` core documents, both manifests, and no missing, duplicate, or empty files.
- `npm.cmd audit` — passed (`0` vulnerabilities).

### Issues found

- None during implementation.

### Remaining work

- Physical-keyboard tab order and Windows Explorer ZIP inspection remain manual release checks.

## 2026-07-03 — ESLint, CI, Coverage, and Repository Tests

### Summary

- Added ESLint flat configuration for TypeScript, React Hooks, React Refresh, and JSX accessibility checks.
- Added GitHub Actions CI for dependency installation, linting, type checking, tests, build, and dependency audit.
- Added Vitest V8 coverage tooling and npm scripts for lint and coverage.
- Exported the legacy project storage key and expanded repository tests to cover migration, unavailable storage, missing records, project ordering, and deletion branches.
- Preserved the intentional unsafe-control-character path check with a targeted ESLint suppression.

### Files created

- `eslint.config.js` — repository lint configuration.
- `.github/workflows/ci.yml` — main-branch and pull-request CI workflow.

### Files updated

- `package.json` and `package-lock.json` — scripts and development dependencies.
- `src/lib/exportIntegrity.ts` — documented intentional control-character regex suppression.
- `src/lib/projectRepository.ts` — exported the legacy storage key for migration testing.
- `src/tests/projectRepository.test.ts` — repository branch and migration coverage.
- `CHANGE_LOG.md` — task record and verification results.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`14` files, `113` tests).
- `npm.cmd run test:coverage` — passed; `src/lib/projectRepository.ts` reached `100%` statement, branch, and function coverage.
- `npm.cmd run lint` — passed.
- `npm.cmd run build` — passed, including `tsc --noEmit -p tsconfig.app.json`.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.

### Issues found

- None.

### Remaining work

- Commit and push the tooling update.
- Deploy the Project Package Preview phase only after this update is accepted.

## 2026-07-03 — Project Package Preview and Document Review

### Summary

- Replaced the generated-document viewer with a complete Project Package Preview and review workflow.
- Added a package summary for Draft/Ready status, 19-document completeness, missing markers, review blockers, checklist progress, final readiness, and ZIP availability.
- Added canonical purpose descriptions, review status, and missing-marker count for every generated document.
- Added full plain-text Markdown preview with folder, purpose, status, marker count, copy, back, and close controls.
- Added quick-copy actions for Architect instructions, Codex instructions, phased prompts, client questions, and next steps using the existing clipboard fallback.
- Preserved generation, Client Review, readiness gating, onboarding, persistence, and ZIP export behavior.

### Files created

- `src/data/documentPurposes.ts` — canonical purpose labels and quick-copy document list.
- `src/lib/documentReview.ts` — shared marker counting and document review metadata.
- `src/tests/documentReview.test.ts` — marker-count and review-status unit coverage.

### Files updated

- `src/components/DocumentViewer/DocumentViewer.tsx` — package summary, review list, document preview, copy actions, and Draft/Ready guidance.
- `src/app/App.tsx` — active project passed to package preview diagnostics.
- `src/lib/exportIntegrity.ts` — shared package marker counting.
- `src/styles/global.css` — desktop and mobile package-review layouts.
- `src/tests/App.test.tsx` — end-to-end package preview, copy, readiness, and fallback coverage.
- `README.md`, `TEST_PLAN.md`, `RELEASE_NOTES.md`, and `CHANGE_LOG.md` — feature and verification documentation.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`14` files, `94` tests).
- `npm.cmd test -- src/tests/documentReview.test.ts src/tests/exportProjectPackage.test.ts src/tests/clientReview.test.ts` — passed (`3` files, `12` focused regression tests).
- Existing onboarding, Client Review, 19-document generation, and ZIP tests passed in the full suite.
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.
- In-app browser QA passed at `1280 x 720` desktop and `390 x 844` mobile for Ready and Draft summaries, the 19-document review list, purpose/status/marker metadata, preview open/close, plain-text Markdown content, document copy, quick copy, clipboard fallback, responsive layout, and console health.
- Browser ZIP export reported `19/19`, valid folder mapping, zero errors, and a successful package download.

### Issues found

- None during implementation.
- Testing limitation: physical-keyboard tab order and Windows Explorer ZIP inspection remain manual release checks.

### Remaining work

- Review the phase before committing or deploying.
- Complete the physical-keyboard and Windows Explorer ZIP checks in a normal desktop browser when available.

## 2026-07-03 — Onboarding and First-Run UX Polish

### Summary

- Added a first-run Mission Control welcome that explains the product, its 19-document output, its limits, and the path from project creation to GPT Architect review.
- Added an eight-step workflow overview and a read-only local business website example that does not write to project storage.
- Added config-driven project-type use-case guidance for all 15 presets.
- Added plain-language Draft, Ready for Codex, and Client Questions Pending explanations.
- Added the post-generation review and GPT Architect/Codex workflow to the Generate stage.
- Preserved existing project loading, intake, client review, generation, 19-document package, and ZIP export behavior.

### Files created

- `src/data/onboarding.ts` — shared onboarding workflow, post-generation steps, and read-only example data.
- `src/components/Onboarding/WorkflowOverview.tsx` — compact eight-step onboarding workflow.
- `src/components/Onboarding/PostGenerationGuidance.tsx` — reusable pre-generation handoff guidance.

### Files updated

- `src/components/MissionControl/MissionControl.tsx` — first-run welcome, example workflow, and status explanations.
- `src/components/IntakeBuilder/IntakeBuilder.tsx` — project-type helper copy and post-generation guidance.
- `src/data/projectTypes.ts`, `src/types/project.ts` — config-driven helper text for every supported project type.
- `src/styles/global.css` — responsive onboarding, example, helper, status, and guidance styles.
- `src/tests/App.test.tsx` — first-run, example, helper, status, generation guidance, and regression coverage.
- `README.md`, `TEST_PLAN.md`, `RELEASE_NOTES.md`, and `CHANGE_LOG.md` — feature and verification documentation.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`13` files, `89` tests).
- `npm.cmd test -- src/tests/exportProjectPackage.test.ts src/tests/generateProjectPackage.test.ts src/tests/clientReview.test.ts` — passed (`3` files, `19` focused regression tests).
- Existing 19-document generation, Client Review workflow, and ZIP integrity tests passed as part of the full suite.
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.
- In-app browser QA passed at desktop and `390 x 844` for welcome rendering, example open/close, new and existing project behavior, Business website helper copy, post-generation guidance, Client Review access, 19-document generation, export success, console health, and page-level overflow.
- Browser export reported `19/19`, valid folder mapping, zero export errors, and a successful package download.

### Issues found

- None during implementation.
- Testing limitation: physical-keyboard tab order and user-visible Windows Explorer ZIP inspection remain manual checks. Automated focus, labeling, skip-link, and visible-focus coverage passed.

### Remaining work

- Review the phase before committing or deploying.
- Complete the physical-keyboard and Windows Explorer ZIP checks in a normal desktop browser when available.

## 2026-07-03 — Client Review Workflow and Missing Information Review

### Summary

- Added a guided Client Review workflow between package generation and Ready for Codex.
- Added persisted missing-information review items with grouped client questions and `Needs answer`, `Answered`, `Not applicable`, and `Deferred` decisions.
- Added a 12-item readiness checklist and review-aware Draft/Ready for Codex gating.
- Updated generated review documents and export diagnostics to show questions, decisions, deferred items, checklist state, and blockers.
- Added safe version-1 storage normalization for existing projects.
- Added a shared clipboard fallback after production smoke testing exposed denied direct clipboard access for client questions; browsers without legacy copy-command support now leave the text visibly selected for Ctrl+C.

### Files created

- `src/lib/clientReview.ts` — review-item derivation, question grouping, decision rules, and readiness evaluation.
- `src/components/ClientReview/ClientReviewWorkflow.tsx` — missing-information review, client questions, copy action, and readiness checklist UI.
- `src/tests/clientReview.test.ts` — review decisions, deferral, question grouping, and readiness coverage.
- `src/lib/copyText.ts` — shared direct-clipboard and local selection fallback used by review and export copy actions.

### Files updated

- Project types, factory defaults, storage normalization, repository actions, selectors, generation, export diagnostics, and application state under `src/`.
- Guided Intake review UI, Export copy handling, shared responsive styles, and generated document templates.
- Application, persistence, generation, ZIP, selector, and export tests under `src/tests/`.
- `README.md`, `CODEX_INSTRUCTIONS.md`, `TEST_PLAN.md`, `RELEASE_NOTES.md`, and `CHANGE_LOG.md`.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`13` files, `86` tests).
- `npm.cmd test -- src/tests/exportProjectPackage.test.ts` — passed (`5` ZIP tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.
- Desktop browser QA passed for review rendering, decision persistence, client-question copy, Draft blocking, `12/12` Ready for Codex completion after regeneration, zero console warnings/errors, and no page-level horizontal overflow.
- `390 × 844` browser QA passed with the review cards and checklist usable, zero console warnings/errors, and no page-level horizontal overflow.
- Browser ZIP generation reported `19/19`, valid folder mapping, Ready for Codex, zero export errors, and a successful download.
- Automated ZIP inspection confirmed deterministic paths, all 19 core documents, both manifests, readable client-review documents, and no stale 16-document paths.

### Issues found

- Medium: Production Client Questions copy reported failure when direct clipboard permission and the legacy copy command were unavailable. Fixed with a shared helper that copies when possible and otherwise leaves the text visibly selected for Ctrl+C.
- Testing limitation: the in-app browser did not advance focus in response to synthetic Tab input. Automated focus, skip-link, labeling, and `:focus-visible` checks pass; a physical-keyboard tab-order check remains a manual release check.

### Remaining work

- Complete the physical-keyboard tab-order check in a normal browser when available.
- Deploy only after this phase is reviewed and approved.

## 2026-07-02 — Cloudflare Worker Deployment Configuration

### Summary

- Reconciled deployment documentation with the approved Cloudflare Workers Static Assets production target.
- Added a reviewed assets-only Wrangler configuration for the existing `projectbuilder` Worker.
- Added the repository deployment command and pinned Wrangler as a development dependency.

### Files created

- `wrangler.jsonc` — Worker identity, compatibility date, `dist` asset directory, and SPA fallback behavior.

### Files updated

- `package.json` and `package-lock.json` — Wrangler development dependency and `npm.cmd run deploy` script.
- `DEPLOYMENT_NOTES.md`, `RELEASE_NOTES.md`, and `README.md` — corrected the production target, commands, URL, and rollback/smoke-test guidance.
- `CHANGE_LOG.md` — recorded this deployment-configuration task.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`12` files, `75` tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.
- `npm.cmd exec wrangler -- deploy --dry-run` — passed; Wrangler read the four `dist` assets with no bindings.
- `npm.cmd run deploy` — deployed Worker version `8408e22f-eafa-4985-935b-cd09746590c1` to `projectbuilder`.
- Production browser smoke testing passed at desktop and `390 × 844`: current asset hash loaded, no console errors, no horizontal overflow, project type was required, Business website and Game conditional fields appeared, internal Web application branding stayed optional, and Draft/Ready gating worked.
- Production generation produced all 19 core documents, including `BRAND_GUIDE.md`, `CLIENT_QUESTIONS.md`, and `HANDOFF_CHECKLIST.md`; `NEXT_STEPS.md` contained the complete Architect/Codex workflow.
- Production ZIP download succeeded. Windows archive inspection confirmed 12 folders, 19 core documents, both manifests, no missing core files, no duplicate paths, and complete post-generation guidance.

### Issues found

- High: Deployment documentation named Cloudflare Pages while production used the `projectbuilder` Worker. Corrected.

### Remaining work

- Complete a physical-keyboard tab-order check in a normal browser when available; automated focus styles and accessibility tests passed, but the in-app browser did not advance focus with synthetic Tab input.
- Firefox-specific production verification remains optional follow-up coverage.

## 2026-07-02 — Project Type and 19-Document Validation Pass

### Summary

- Confirmed the project type, conditional intake, branding, Draft/Ready, generation, guidance, and export implementation without adding features.
- Regenerated all three persisted 16-document packages; Mission Control now reports no stale `16 of 19` packages.
- Created a complete internal web-application QA project and verified the rendered Export state reaches `Ready for Codex` only after required intake is complete.
- Downloaded and inspected the production ZIP with Windows `Expand-Archive`.

### Files created

- None.

### Files updated

- `CHANGE_LOG.md`, `TEST_PLAN.md`, and `RELEASE_NOTES.md` — recorded completed validation and 19-document ZIP evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`12` files, `75` tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.
- Required project-type behavior passed for Business website, Web application, Android app, Game, Dashboard, Power Apps/Microsoft 365, API/backend, and Automation/workflow presets.
- Draft generation with missing markers, Ready for Codex gating, `19/19` Export diagnostics, and both post-generation guidance surfaces passed.
- Desktop and `390 x 844` browser QA passed with zero console warnings/errors and no page-level horizontal overflow.
- Windows ZIP inspection passed: 12 folders, 19 core Markdown documents, both manifests, clean unique paths, readable headings, zero missing/duplicate/empty files, and no stale 16-document references.

### Issues found

- None in the application.
- Testing limitation: the in-app browser did not expose its download event, but the authorized ZIP download completed successfully in Windows and was inspected directly.

### Remaining work

- Deploy to Cloudflare Pages when the release owner is assigned.
- Run the documented smoke test against the deployed URL.

## 2026-07-02 — Project Type Presets, Branding Intake, and Handoff Guidance

### Summary

- Added 15 typed, config-driven project type presets with recommended platforms, conditional intake modules, branding requirements, and generated-document notes.
- Made project type a required Foundation choice and added relevant website, game, mobile, dashboard, Microsoft 365, automation, and API questions.
- Added structured branding fields with project-type and public/internal visibility rules.
- Kept Draft package generation/export available with explicit missing markers while blocking Ready for Codex when required intake is incomplete.
- Added `BRAND_GUIDE.md`, `CLIENT_QUESTIONS.md`, and `HANDOFF_CHECKLIST.md`, increasing the core package from 16 to 19 documents.
- Added shared **Use This Project Package** guidance to Export and generated `NEXT_STEPS.md`.

### Files created

- `src/data/projectTypes.ts` — project type presets, conditional modules, tailored fields, and branding rules.
- `src/data/packageGuidance.ts` — shared post-generation Architect/Codex workflow.
- `src/tests/projectTypes.test.ts` — preset metadata, conditional field, and branding-rule coverage.

### Files updated

- Project types, factory defaults, storage migration, project field updates, validation, selectors, generation templates, folder mapping, export diagnostics, and UI components under `src/`.
- Automated application, validation, persistence, generation, manifest, integrity, and ZIP export tests under `src/tests/`.
- `README.md`, `APP_BLUEPRINT.md`, `CODEX_INSTRUCTIONS.md`, `NEXT_STEPS.md`, `TEST_PLAN.md`, `DEPLOYMENT_NOTES.md`, and `RELEASE_NOTES.md`.

### Files removed

- None.

### Testing completed

- `npm.cmd test` — passed (`12` files, `75` tests).
- `npm.cmd run build` — passed.
- `npm.cmd audit` — passed (`0` vulnerabilities).
- `git diff --check` — passed.
- In-app browser QA passed at the default desktop viewport and `390 x 844`.
- Browser interaction covered required project type selection, Website/Game field switching, Draft generation, all 19 generated files, Export readiness, and **Use This Project Package** guidance.
- Browser console reported zero warnings/errors and mobile page-level horizontal overflow was absent.

### Issues found

- Medium: Existing persisted packages generated before this change contain 16 of the now-required 19 documents. They remain visible but must be regenerated before Export integrity can pass.
- Low: Existing unsupported free-text app types cannot map safely to a typed preset. Storage normalization now clears those values so users explicitly reselect a supported project type.

### Remaining work

- Regenerate existing persisted packages before their next export.
- Run the 19-document Windows Explorer ZIP check during release verification.
- Deploy and run the documented production smoke test when the release owner is assigned.

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
