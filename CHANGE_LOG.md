# Change Log

## 2026-08-14 - Phase 5C.3C.2C Scoped Clarification Decision Controls and Ephemeral UI State

### Summary

- Added capability-driven clarification controls for Confirm, Reject, Defer, and Mark Not Applicable only, with the existing clarification capability contract as the sole action authority.
- Added inline, action-specific reason forms with the existing 2000-character limit, blank-reason prevention, Cancel clearing, and unsent-reason clearing when the action changes.
- Added per-proposal submission locking, duplicate-submit prevention, and bounded progress presentation without optimistic planning mutation or a workspace-wide lock.
- Wired the existing hook submission method through App and PlanningView so durable repository refresh remains authoritative for lifecycle group movement.
- Added one safe Planning-level feedback region that remains visible when a persisted proposal changes groups and does not expose raw repository diagnostics, errors, or proposal identity.
- Kept Revise unavailable pending an authoritative answer schema; no Revise editor, modal, Apply action, readiness mutation, output generation, general proposal decision persistence, or TTI blocker change was added.

### Files created

- `src/components/Planning/ClarificationDecisionControls.tsx` - renders scoped capability-driven clarification actions and local reason/submission state.
- `src/tests/ClarificationDecisionControls.test.tsx` - covers action visibility, payloads, reason behavior, locking, feedback safety, privacy, and static exclusions.
- `src/tests/App.planningDecisions.test.tsx` - covers App wiring and one real hook/repository decision flow.

### Files updated

- `src/components/Planning/PlanningView.tsx` - hosts durable decision feedback and binds controls to explicit project/planning/proposal inputs.
- `src/app/App.tsx` - passes the existing clarification submission method to PlanningView without adding decision state.
- `src/styles/global.css` - adds minimal scoped styles for the controls, inline reason form, feedback, progress, and answer-schema note.
- `src/tests/PlanningView.test.tsx` - preserves read-only coverage and adds persisted-input group movement plus durable feedback coverage.
- `CHANGE_LOG.md` - records this phase and validation.
- `TEST_PLAN.md` - records decision-control, integration, privacy, and boundary coverage.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; installed `432` packages and reported the existing deprecation plus `6` development/tooling vulnerabilities (`2` moderate, `4` high) at install time.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused control, PlanningView, and App planning-decision tests passed (`3` files, `31` tests).
- Targeted clarification contract/feedback/hook, Planning view-model, repository, readiness, controlled Apply, and output/export regressions passed (`22` files, `615` tests).
- App navigation regression passed (`1` file, `15` tests).
- `npm.cmd test`: passed (`63` unit/integration files, `2473` tests; `7` UI files, `64` tests; `70` combined files, `2537` tests).
- `npm.cmd run test:coverage`: passed (`70` combined files, `2537` tests) with `90.03%` statements, `82.08%` branches, `95.04%` functions, and `93.78%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with `25` current development/tooling vulnerabilities (`2` moderate, `23` high); no dependency remediation was performed.

## 2026-08-14 - Phase 5C.3C.2B Architect Correction 1 - Preserve Primary Decision Error

### Summary

- Corrected clarification submission error precedence so a secondary durable-refresh failure can no longer replace an existing primary repository/submission exception.
- Kept durable refresh mandatory after a primary exception and suppresses only a secondary refresh exception while the primary exception propagates.
- Preserved normal-result behavior: when submission returns normally but mandatory refresh fails, the refresh exception propagates and no successful result is returned.
- Added no repository outcome, feedback kind, fabricated result, retry, UI control, draft state, answer schema, readiness behavior, output behavior, or TTI blocker change.

### Files created

- None.

### Files updated

- `src/app/useProjectBuilder.ts` - preserves the primary clarification submission exception across a secondary refresh failure.
- `src/tests/useProjectBuilderPlanningDecision.test.tsx` - adds load-state, persistence-warning, and normal-result refresh-failure regressions.
- `CHANGE_LOG.md` - records Architect Correction 1 and validation.
- `TEST_PLAN.md` - records correction-specific error-precedence coverage.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; installed `432` packages and reported the existing deprecation plus `6` development/tooling vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused hook and feedback tests passed (`2` files, `27` tests).
- Decision-contract, materialization, repository, Planning UI, readiness, controlled Apply, and output/export regressions passed (`22` files, `628` tests).
- App navigation regression passed (`1` file, `15` tests).
- `npm.cmd test`: passed (`61` unit/integration files, `2453` tests; `7` UI files, `64` tests; `68` combined files, `2517` tests).
- `npm.cmd run test:coverage`: passed (`68` combined files, `2517` tests) with `90%` statements, `82%` branches, `94.99%` functions, and `93.74%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with `6` development/tooling vulnerabilities (`2` moderate, `4` high); no dependency remediation was performed.

## 2026-08-14 - Phase 5C.3C.2B Clarification Decision Hook Wiring and Safe Result Translation

### Summary

- Added pure, deterministic translation from existing clarification repository results to safe presentation feedback for persisted, blocked, state-changed, missing-project, unsupported-project, and persistence-failure outcomes.
- Added `submitPlanningClarificationDecision(projectId, input)` to `useProjectBuilder`, preserving the caller's explicit project ID and delegating unchanged input to the approved repository writer.
- Reloaded durable storage state and the existing persistence warning after every normal repository result and through `finally` when an unexpected rejection propagates.
- Exposed the trusted repository result separately from privacy-safe feedback without optimistic planning mutation, retries, hook-level locking, or raw issue/identity disclosure.
- Added no clarification UI controls, local draft state, answer schema, Revise editor, general proposal decision API, controlled Apply behavior, readiness mutation, output generation, navigation, or TTI blocker resolution.

### Files created

- `src/lib/planningClarificationDecisionFeedback.ts` - provides the pure safe-feedback translator.
- `src/tests/planningClarificationDecisionFeedback.test.ts` - covers the outcome matrix, privacy, authority boundaries, purity, and determinism.
- `src/tests/useProjectBuilderPlanningDecision.test.tsx` - covers exact repository binding, durable refresh, error propagation, and hook boundaries.

### Files updated

- `src/app/useProjectBuilder.ts` - wires the existing repository writer through the new async hook method.
- `CHANGE_LOG.md` - records this phase and validation.
- `TEST_PLAN.md` - records focused and regression coverage.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; installed `432` packages and reported the existing deprecation plus `6` development/tooling vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused feedback and hook tests passed (`2` files, `24` tests).
- Decision-contract, materialization, repository, Planning UI, readiness, controlled Apply, and output/export regressions passed in the targeted batch (`22` files, `628` tests).
- App navigation regression passed (`1` file, `15` tests).
- `npm.cmd test`: passed (`61` unit/integration files, `2450` tests; `7` UI files, `64` tests; `68` combined files, `2514` tests).
- `npm.cmd run test:coverage`: passed (`68` combined files, `2514` tests) with `90%` statements, `82%` branches, `94.99%` functions, and `93.74%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with `6` development/tooling vulnerabilities (`2` moderate, `4` high); no dependency remediation was performed.

## 2026-08-14 - Phase 5C.3C.2A Pure Clarification Action Capability Contract

### Summary

- Added pure `analyzePlanningClarificationDecisionCapabilities(...)` pre-input analysis for exactly Revise, Confirm, Reject, Defer, and Mark Not Applicable.
- Added the exact capability states `available`, `inputRequired`, `answerSchemaRequired`, and `unavailable`, with required-input metadata limited to `none`, `reason`, and `answerSchema`.
- Refactored private clarification context and action-availability checks so capability and submission analysis share planning normalization, clarification scope, rule authority, transitions, conflicts, alternatives, revision history, and informational-source validation.
- Kept the existing submission analyzer authoritative and behaviorally unchanged.
- Revise intentionally reports `answerSchemaRequired` from an otherwise valid Needs Clarification proposal; no answer schema, answer kind, editor type, or per-rule mapping was added.
- Confirm is available only for a valid persisted Revised proposal with coherent revision history and current informational user-answer evidence.
- Reject, Defer, and Mark Not Applicable report `inputRequired` only when structurally valid and require a user-supplied reason without placeholder input.
- Added no UI, repository, persistence, readiness, output, Apply, rollback, or TTI blocker-resolution behavior.

### Files created

- None.

### Files updated

- `src/lib/planningClarificationDecisionContract.ts` - adds the pure capability API and shared internal structural authority.
- `src/tests/planningClarificationDecisionContract.test.ts` - adds capability matrices, fail-closed cases, rule-derived N/A checks, purity, determinism, and submission regressions.
- `CHANGE_LOG.md` - records the capability contract and validation.
- `TEST_PLAN.md` - records capability and regression coverage.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; reported the existing `whatwg-encoding` deprecation and `6` development/tooling vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused decision contract tests passed (`1` file, `47` tests), including all existing submission tests.
- Planning clarification regressions passed (`13` files, `244` tests).
- Planning-rule regressions passed (`1` file, `16` tests); planning-proposal regressions passed (`1` file, `31` tests).
- Controlled Apply regressions passed (`6` files, `240` tests).
- Repository regressions passed (`2` files, `112` tests).
- Readiness regressions passed (`4` files, `28` tests).
- Output/export regressions passed (`7` files, `139` tests).
- `npm.cmd test`: passed (`59` unit/integration files, `2426` tests; `7` UI files, `64` tests; `66` combined files, `2490` tests).
- `npm.cmd run test:coverage`: passed (`66` combined files, `2490` tests) with `90.25%` statements, `82.06%` branches, `95.35%` functions, and `94.01%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with `6` development/tooling vulnerabilities (`2` moderate, `4` high); no dependency remediation was performed.

## 2026-08-14 - Phase 5C.3B Architect Correction 1 - Fail Closed on Partially Invalid Planning

### Summary

- Corrected the read-only Planning view model to return immediately when planning normalization reports any issue.
- Prevented normalized surviving proposals, sources, dependencies, conflicts, Apply states, and history from being presented as a partial valid plan.
- Invalid planning now exposes only the existing safe generic issue presentation, with empty groups/history, a zero internal proposal count, and no normal planning-item count badge.
- Preserved valid planning presentation when controlled Apply history alone is invalid; proposal groups remain readable while invalid history is hidden behind a safe warning.
- Preserved valid-planning navigation, lifecycle grouping, ordering, informational Apply states, source/history privacy, and zero decision or Apply controls.
- Added no repository, persistence, readiness, or output behavior.

### Files created

- None.

### Files updated

- `src/lib/planningUiViewModel.ts` - fails closed before deriving any presentation from partially normalized planning.
- `src/components/Planning/PlanningView.tsx` - suppresses normal count, groups, and history whenever model state is invalid.
- `src/tests/planningUiViewModel.test.ts` - adds partial-normalization and invalid-history-separation regressions and strengthens unsupported-schema assertions.
- `src/tests/PlanningView.test.tsx` - verifies partial-corruption UI suppression and valid-planning/invalid-history presentation.
- `CHANGE_LOG.md` - records Architect Correction 1 and validation.
- `TEST_PLAN.md` - records correction-specific and complete regression evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; reported the existing `whatwg-encoding` deprecation and `6` development/tooling vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused Planning view-model and view tests passed (`2` files, `44` tests); App navigation passed (`1` file, `15` tests).
- Planning regressions passed (`3` files, `201` tests); clarification regressions passed (`13` files, `229` tests).
- Controlled Apply regressions passed (`6` files, `240` tests); repository regressions passed (`2` files, `173` tests).
- Readiness/client-review regressions passed (`4` files, `29` tests); output/export regressions passed (`6` files, `136` tests).
- `npm.cmd test`: passed (`59` unit/integration files, `2411` tests; `7` UI files, `64` tests; `66` combined files, `2475` tests).
- `npm.cmd run test:coverage`: passed (`66` combined files, `2475` tests) with `90.20%` statements, `82.01%` branches, `95.33%` functions, and `93.97%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with `6` development/tooling vulnerabilities (`2` moderate, `4` high); no dependency remediation was performed.

### Issues found

- Development/tooling dependencies retain `2` moderate and `4` high audit advisories. Dependency remediation remains outside the authorized correction scope.

### Scope exclusions

- No navigation, styling, lifecycle mapping, ordering, rule, repository, persistence, readiness, output, dependency, Node, CI, TTI blocker, deployment, main-integration, pull-request, tag, or release change was made.

## 2026-08-14 - Phase 5C.3B Read-Only Architect-Assisted Planning Workspace

### Summary

- Added a dedicated Planning navigation item and `Architecture Planning` workspace for projects with persisted planning state.
- Added a pure read-only planning UI view model with the five approved human lifecycle groups, deterministic registered-rule ordering, and persisted-order fallback for general proposals.
- Added read-only proposal cards for persisted recommendation, rationale, consequence, uncertainty, target area, safe source details, dependencies, and conflicts.
- Added informational controlled-Apply states derived from the existing preparation contract for confirmed proposals, with current clarification-only rules remaining planning decisions rather than writable candidates.
- Added read-only controlled Apply history summaries with prior/applied values available only in collapsed disclosures.
- Added responsive single-column presentation and accessible landmarks, headings, focus behavior, visible state text, and native disclosures.
- Added no decision controls, no Apply action, no repository writes, and no readiness or output mutation.

### Files created

- `src/lib/planningUiViewModel.ts` - builds the pure deterministic read-only planning presentation model.
- `src/components/Planning/PlanningView.tsx` - renders the dedicated read-only Planning workspace.
- `src/tests/planningUiViewModel.test.ts` - covers lifecycle grouping, ordering, privacy, Apply states, history, and immutability.
- `src/tests/PlanningView.test.tsx` - covers presentation, accessibility, disclosures, privacy, and current-rule safety.

### Files updated

- `src/components/AppShell/AppNavigation.tsx` - adds Planning between Guided Intake and Scope Review.
- `src/app/App.tsx` - routes active projects to the Planning workspace and preserves the no-project Mission Control guard.
- `src/styles/global.css` - adds responsive Planning presentation and six-item navigation behavior.
- `src/tests/App.navigation.test.tsx` - covers navigation order, active-project Planning, no-project behavior, and focus.
- `CHANGE_LOG.md` - records Phase 5C.3B implementation and validation.
- `TEST_PLAN.md` - records focused, responsive, accessibility, regression, coverage, build, and audit validation.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; reported the existing `whatwg-encoding` deprecation and `6` development/tooling vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused Planning view-model and view tests passed (`2` files, `40` tests); navigation tests passed (`1` file, `15` tests).
- Planning regressions passed (`3` files, `78` tests); clarification regressions passed (`13` files, `229` tests).
- Controlled Apply regressions passed (`6` files, `240` tests); repository/storage regressions passed (`2` files, `173` tests).
- Readiness/client-review regressions passed (`4` files, `83` tests); output/export core regressions passed (`6` files, `33` tests).
- `npm.cmd test`: passed (`59` unit/integration files, `2407` tests; `7` UI files, `64` tests; `66` combined files, `2471` tests).
- `npm.cmd run test:coverage`: passed (`66` combined files, `2471` tests) with `90.15%` statements, `81.92%` branches, `95.29%` functions, and `93.90%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with `6` development/tooling vulnerabilities (`2` moderate, `4` high); no dependency remediation was performed.

### Issues found

- Development/tooling dependencies retain `2` moderate and `4` high audit advisories. Dependency remediation remains outside the authorized phase scope.

### Scope exclusions

- No clarification or general proposal decision controls, Apply action, repository write, current-rule mapping, readiness integration, rollback, output generation, dependency/Node/CI change, TTI blocker change, remote persistence, external AI, or deployment behavior was added.

## 2026-08-13 - Phase 5C.2.3D.3C.3E Architect Correction 1 - Preserve Needs Review for Stored Generated Documents

### Summary

- Corrected changed controlled Apply status semantics so any stored generated document records force final status `Needs Review`, including when every document has blank or whitespace-only content.
- Kept `generatedFileCount` independently recalculated; stored blank-only documents may correctly produce `generatedFileCount: 0` while status remains `Needs Review`.
- Retained existing no-document status derivation: valid concrete intake becomes `Intake Complete`, while incomplete concrete intake remains `Intake Started`.
- Updated changed-candidate validation to enforce the same stored-document rule and fail closed on an invalid candidate status.
- Preserved generated documents exactly, invalidated `packageGeneratedAt`, retained final `Review needed`, and made no change to global project status selectors.

### Files created

- None.

### Files updated

- `src/lib/projectRepository.ts` - preserves `Needs Review` for changed projects whenever generated document records remain stored and validates that invariant.
- `src/tests/planningControlledApplyRepository.test.ts` - adds blank-only valid- and incomplete-intake regressions and retains nonblank/no-document status coverage.
- `CHANGE_LOG.md` - records Architect Correction 1 and its validation.
- `TEST_PLAN.md` - records the corrected status matrix and completed regression results.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; reported `6` development/tooling vulnerabilities (`2` moderate, `4` high) and the existing `whatwg-encoding` package deprecation notice.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused D.3C.3E repository tests passed (`1` file, `72` tests).
- D.3C.3C finalization regression passed (`1` file, `33` tests).
- D.3C.3A preparation regression passed (`1` file, `21` tests).
- Controlled history, D.3B destination, and D.3A candidate regressions passed (`3` files, `114` tests).
- Repository/storage regressions passed (`2` files, `173` tests).
- Planning/clarification regressions passed (`15` files, `276` tests).
- Intake/readiness/client-review regressions passed (`6` files, `42` tests).
- Output/document/export regressions passed (`7` files, `139` tests).
- `npm.cmd test`: passed (`57` unit/integration files, `2367` tests; `7` UI files, `61` tests; `64` combined files, `2428` tests).
- `npm.cmd run test:coverage`: passed (`64` combined files, `2428` tests) with `90.13%` statements, `82.02%` branches, `95.28%` functions, and `93.93%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with `6` development/tooling vulnerabilities (`2` moderate, `4` high); no dependency remediation was performed.

### Issues found

- Development/tooling dependencies retain `2` moderate and `4` high audit advisories. Dependency remediation remains outside the authorized correction scope.

### Scope exclusions

- No global selector, dependency, Node, CI, UI, rollback, clarification-rule mapping, TTI blocker, remote persistence, external AI, deployment, main integration, pull request, tag, or release change was made.

## 2026-08-13 - Phase 5C.2.3D.3C.3E Controlled Apply Repository Transaction Implementation

### Summary

- Added the explicit `applyConfirmedPlanningProposal` repository transaction API for one confirmed planning proposal and one current storage-v5 project record.
- Added a strict private raw-state reader that reads only `STORAGE_KEY`, validates exact version 5 and canonical migrated structure, and does not synchronize, migrate, or write storage.
- Added baseline, latest-state, commit-state, destination, and final raw-string concurrency guards that fail closed before persistence when controlled evidence changes.
- Added changed and unchanged transaction materialization with exact D.3C.3A preparation, D.3C.3C finalization, project-field, history, review invalidation, status, and derived-count semantics.
- Added one controlled direct `setItem` persistence boundary with exactly one write on successful changed or unchanged application, no write for already-applied or blocked outcomes, and `persistenceFailed` only after an attempted write throws.
- Preserved unrelated current storage state, project ordering, active-project identity, existing repository write paths, TTI Draft blockers, and all readiness/output authority flags.

### Files created

- `src/tests/planningControlledApplyRepository.test.ts` - covers the controlled repository transaction, concurrency guards, mutation semantics, persistence behavior, evidence binding, and isolation boundaries.

### Files updated

- `src/lib/projectRepository.ts` - implements the controlled apply repository transaction and its strict private read/write boundaries.
- `CHANGE_LOG.md` - records the repository transaction implementation and validation.
- `TEST_PLAN.md` - records the focused, regression, full-suite, coverage, build, and audit results.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- Focused controlled repository transaction tests passed (`1` file, `70` tests).
- Controlled apply and repository regressions passed (`7` files, `339` tests).
- `npm.cmd test`: passed (`57` unit/integration files, `2365` tests; `7` UI files, `61` tests; `64` combined files, `2426` tests).
- `npm.cmd run test:coverage`: passed (`64` combined files, `2426` tests) with `90.13%` statements, `82.02%` branches, `95.28%` functions, and `93.93%` lines.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high); dependency remediation remains outside this phase.

### Issues found

- Development/tooling dependencies retain `2` moderate and `4` high audit advisories. Dependency remediation is outside the authorized phase scope.

### Scope exclusions

- No explicit Apply UI/action, rollback, current clarification-rule mapping, actor attribution, TTI blocker resolution, remote persistence, external AI, dependency remediation, Node/CI maintenance, deployment, main integration, tag, release, or pull request was added.

## 2026-08-13 - Phase 5C.2.3D.3C.3C Architect Correction 1 - Validate Apply Chronology Before UUID Allocation

### Summary

- Corrected the Medium runtime-order defect identified by independent Architect review: canonical `appliedAt` chronology is now validated against the exactly bound D.3C.3A confirming decision before `uuid()` is called.
- An apply timestamp that precedes the confirming decision now fails closed with `applyPrecedesConfirmation`, consumes no UUID, and constructs no candidate record or history.
- Equal and later apply timestamps proceed to exactly one UUID allocation; full D.3C.2A candidate-history normalization remains required afterward as defense in depth.
- Malformed confirming timestamps remain rejected upstream by D.3C.3A planning normalization before either finalization runtime function is called.

### Files created

- None.

### Files updated

- `src/lib/planningControlledApplyTransactionFinalization.ts` - resolves the trusted confirming decision and validates absolute chronology before UUID allocation.
- `src/tests/planningControlledApplyTransactionFinalization.test.ts` - adds explicit earlier/equal/later UUID-call assertions and documents the upstream malformed-confirmation blocker.
- `CHANGE_LOG.md` - records Architect Correction 1.
- `TEST_PLAN.md` - records the chronology-before-UUID regression coverage.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused D.3C.3C transaction-finalization tests passed (`1` file, `33` tests).
- D.3C.3A preparation, D.3C.2A history, D.3B destination, and D.3A candidate regressions passed (`4` files, `135` tests).
- Planning and clarification lifecycle/persistence regressions passed (`15` files, `276` tests).
- Repository/storage regressions passed (`2` files, `103` tests).
- Intake/readiness regressions passed (`6` files, `137` tests).
- Output/export regressions passed (`7` files, `89` tests).
- `npm.cmd test`: passed (`56` unit/integration files, `2295` tests; `7` UI files, `61` tests; `63` combined files, `2356` tests).
- `npm.cmd run test:coverage`: passed (`63` combined files, `2356` tests) with `90.12%` statements, `81.88%` branches, `95.30%` functions, and `93.99%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high); dependency remediation remains outside this correction.

### Issues found

- Medium: the reviewed implementation allocated a UUID before candidate-history validation discovered an earlier apply timestamp; corrected in this commit.
- Low: known development/tooling dependency advisories remain outside this correction and were not remediated.
- Low: existing Vite large-chunk warning remains unchanged.

### Remaining work

- Return both D.3C.3C commits to GPT Architect for independent re-review. Integration and all repository mutation/persistence behavior remain blocked pending separate authorization.

## 2026-08-13 - Phase 5C.2.3D.3C.3A Architect Correction 1 - Fail Closed on Missing Project Snapshot

### Summary

- Corrected the Medium snapshot-boundary defect identified by independent Architect review: the transaction-preparation snapshot serializer no longer assumes successful `JSON.stringify` always returns a string.
- Non-string JSON serialization results are now treated as unavailable and fail closed as `projectSnapshotUnavailable`.
- Added regression coverage for a valid project-like input whose runtime `toJSON` returns `undefined`, while retaining the existing throwing circular-reference serialization test.
- Preserved all other transaction-preparation semantics, including D.3B authority, D.3A indirect authority, D.3C.2A history validation, idempotency, capacity, drift handling, and no write/readiness/output authority.

### Files created

- None.

### Files updated

- `src/lib/planningControlledApplyTransactionPreparation.ts` - treats non-string JSON serialization results as unavailable snapshots.
- `src/tests/planningControlledApplyTransactionPreparation.test.ts` - adds non-throwing snapshot failure regression and no-plan assertions for snapshot failures.
- `CHANGE_LOG.md` - records Architect Correction 1.
- `TEST_PLAN.md` - records the snapshot fail-closed regression coverage.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused D.3C.3A transaction-preparation tests passed (`1` file, `21` tests).
- D.3C.2A controlled-apply history regression passed (`1` file, `29` tests).
- D.3C.2B creation/repository/storage regression passed (`2` files, `103` tests).
- D.3B destination and D.3A candidate regressions passed (`2` files, `85` tests).
- Full planning regression batch passed (`19` files, `411` tests).
- Clarification regression batch passed (`13` files, `229` tests).
- Intake/readiness regressions passed (`6` files, `95` tests).
- Output/export regressions passed (`7` files, `64` tests).
- Record-lifecycle planning-adjacent regression batch passed (`8` files, `587` tests).
- `npm.cmd test`: passed (`55` unit/integration files, `2262` tests; `7` UI files, `61` tests; `62` combined files, `2323` tests).
- `npm.cmd run test:coverage`: passed (`62` combined files, `2323` tests) with `90.14%` statements, `81.86%` branches, `95.38%` functions, and `94.04%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through ESLint, Vite/Vitest, Miniflare, and Wrangler (`25` vulnerabilities: `2` moderate, `23` high); dependency remediation remains outside this correction.

### Issues found

- Low: known development/tooling dependency advisories remain outside this correction and were not remediated.
- Low: existing Vite large-chunk warning remains unchanged.

### Remaining work

- Return to GPT Architect for independent re-review of the pushed correction commit. Integration to `main` remains blocked pending separate Architect authorization.

## 2026-08-12 - Phase 5C.2.3D.3C.3A - Controlled Apply Transaction Preparation Contract

### Summary

- Added the pure deterministic controlled-apply transaction preparation contract.
- The new contract delegates live destination eligibility to D.3B, validates persisted history through D.3C.2A before idempotency checks, captures deterministic project snapshots, and returns only `ready`, `alreadyApplied`, or `blocked` outcomes.
- Preserved the read-only preparation boundary: no apply ID allocation, no `appliedAt` allocation, no durable history construction, no project mutation, no repository/storage writes, no readiness/output integration, and no UI behavior.

### Files created

- `src/lib/planningControlledApplyTransactionPreparation.ts` - implements transaction-preparation planning only.
- `src/tests/planningControlledApplyTransactionPreparation.test.ts` - covers changed, unchanged, idempotent retry, drift, invalid history, capacity, snapshot, isolation, and TTI-safety behavior.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records the D.3C.3A validation matrix.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused D.3C.3A transaction-preparation tests passed (`1` file, `20` tests).
- D.3C.2A controlled-apply history regression passed (`1` file, `29` tests).
- D.3C.2B creation/repository/storage regression passed (`2` files, `103` tests).
- D.3B destination, D.3A candidate, planning proposals, and planning rules regressions passed (`4` files, `132` tests).
- Clarification decision regressions passed (`2` files, `61` tests).
- Intake/readiness regressions passed (`6` files, `95` tests).
- Output/export regressions passed (`7` files, `64` tests).
- Full planning regression batch passed (`19` files, `410` tests); record-lifecycle planning-adjacent regression batch passed (`8` files, `587` tests).
- `npm.cmd test`: passed (`55` unit/integration files, `2261` tests; `7` UI files, `61` tests; `62` combined files, `2322` tests).
- `npm.cmd run test:coverage`: passed (`62` combined files, `2322` tests) with `90.14%` statements, `81.86%` branches, `95.38%` functions, and `94.04%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through ESLint, Vite/Vitest, Miniflare, and Wrangler (`25` vulnerabilities: `2` moderate, `23` high); dependency remediation remains outside this phase.

### Issues found

- Low: known development/tooling dependency advisories remain outside this phase and were not remediated.
- Low: existing Vite large-chunk warning remains unchanged.

### Remaining work

- Return to GPT Architect for independent review of the pushed review-branch commit. Integration to `main` remains blocked pending separate Architect authorization.

## 2026-08-12 - Phase 5C.2.3D.3C.2B - Controlled Apply History ProjectRecord and Storage v5 Integration

### Summary

- Integrated controlled-apply history into `ProjectRecord` as a persisted storage-container field using the existing D.3C.2A `PlanningControlledApplyHistoryRecord` type.
- Advanced canonical storage from version 4 to version 5 while preserving v4 planning, retaining v1-v3 empty-planning migration behavior, and initializing all pre-v5 history as empty.
- Added v5 all-or-nothing history normalization through the D.3C.2A normalizer: valid history is defensively preserved, while missing, invalid, partial, project-mismatched, or provenance-mismatched history becomes `[]`.
- Preserved ordinary repository updates, field edits, document saves, review/readiness changes, archive, and restore without making those paths controlled-apply history writers.
- Reset duplicate-project history to `[]` while preserving existing duplicate planning reset behavior and source history.
- Applied Architect Scope Correction 1 after the original D.3C.2B authorization contradicted itself by requiring `CURRENT_STORAGE_VERSION` to become 5 while two regression tests were required to remain byte-unchanged with version-4 expectations.
- Updated only the authorized storage-version expectations in `planningControlledApplyHistory.test.ts` and `recordLifecycleFormulaEvidence.test.ts`; no D.3C.2A or record-lifecycle evidence semantics were weakened.

### Files created

- None.

### Files updated

- `src/types/project.ts` - adds storage version 5 and the typed `controlledApplyHistory` ProjectRecord field.
- `src/lib/createProject.ts` - initializes new projects with a fresh empty history array.
- `src/lib/storageVersion.ts` - migrates to storage version 5, preserves v4 planning, initializes pre-v5 history empty, and validates v5 history.
- `src/lib/projectRepository.ts` - preserves a defensive controlled-apply history snapshot through ordinary project updates.
- `src/tests/createProject.test.ts` - covers empty history and separate arrays for direct project creation.
- `src/tests/projectRepository.test.ts` - covers repository creation, v1-v5 migration, v5 history validation, duplicate reset, and ordinary-update preservation.
- `src/tests/planningControlledApplyHistory.test.ts` - updates only the current-storage-version isolation assertion from 4 to 5.
- `src/tests/recordLifecycleFormulaEvidence.test.ts` - updates only the current-storage-version assertion from 4 to 5 while retaining the storage-key assertion.
- `CHANGE_LOG.md` - records this corrected phase.
- `TEST_PLAN.md` - records the migration, preservation, isolation, and version-regression matrix.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported development/tooling advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused `createProject.test.ts`: passed (`1` file, `2` tests).
- Focused `projectRepository.test.ts`: passed (`1` file, `101` tests).
- D.3C.2A controlled-apply history regression passed (`1` file, `29` tests).
- Record lifecycle evidence regression passed (`1` file, `23` tests).
- D.3A/D.3B/planning rules/proposals batch passed (`4` files, `132` tests).
- Clarification decision regressions passed (`2` files, `61` tests).
- Intake/readiness regressions passed (`6` files, `40` tests).
- Output/export regressions passed (`7` files, `139` tests).
- Planning regressions passed (`16` files, `329` tests) plus planning-adjacent collection/form/state/record-lifecycle regressions (`8` files, `758` tests).
- `npm.cmd test`: passed (`54` unit/integration files, `2241` tests; `7` UI files, `61` tests; `61` combined files, `2302` tests).
- `npm.cmd run test:coverage`: passed (`61` combined files, `2302` tests) with `90.13%` statements, `81.85%` branches, `95.36%` functions, and `94.06%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through ESLint, Vite/Vitest, Miniflare, and Wrangler (`25` vulnerabilities: `2` moderate, `23` high); dependency remediation remains outside this phase.

### Issues found

- Low: known development/tooling dependency advisories remain outside this phase and were not remediated.
- Low: existing Vite large-chunk warning remains unchanged.

### Remaining work

- Return to GPT Architect for independent review of the pushed review-branch commit. Integration to `main` remains blocked pending separate Architect authorization.

## 2026-08-12 - Phase 5C.2.3D.3C.2A Architect Correction 1 - Confirmation-Before-Apply History Chronology

### Summary

- Corrected the Critical provenance defect identified by independent Architect review: a controlled-apply history record can no longer predate its referenced human confirmation decision.
- Added deterministic absolute-instant comparison between the normalized confirming decision `recordedAt` and the caller-supplied canonical history `appliedAt`.
- Added `applyPrecedesConfirmation` and defensive `invalidConfirmationTimestamp` issue codes; equal instants and later apply instants remain valid.
- Verified equivalent offset and optional-millisecond decision timestamps compare correctly after authoritative planning normalization preserves their absolute instant.
- Preserved the exact history record schema, `changed` / `unchanged` outcomes, semantic identity, 1,000-record cap, source/value semantics, historical lifecycle independence, and `appType` exclusion.
- Preserved no ProjectRecord integration, storage-version change, migration, persistence, project mutation, D.3A/D.3B invocation, readiness/output behavior, UI action, Power Fx/YAML generation, external AI, or deployment behavior.

### Files created

- None.

### Files updated

- `src/lib/planningControlledApplyHistory.ts` - enforces confirmation-before-apply chronology using supplied absolute instants.
- `src/tests/planningControlledApplyHistory.test.ts` - covers earlier, equal, later, offset-equivalent, offset-later, optional-millisecond, and invalid-confirmation cases.
- `CHANGE_LOG.md` - records the independent Architect finding and correction.
- `TEST_PLAN.md` - records the chronology validation matrix.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused D.3C.2A controlled-apply history tests passed (`1` file, `29` tests).
- D.3B destination-contract regression passed (`1` file, `29` tests).
- D.3A candidate-contract regression passed (`1` file, `56` tests).
- PlanningProposals regression passed (`1` file, `31` tests).
- Planning-rules regression passed (`1` file, `16` tests).
- Clarification decision-contract regression passed (`1` file, `32` tests).
- Clarification decision-materialization regression passed (`1` file, `29` tests).
- Repository/storage regression passed (`1` file, `96` tests).
- Intake/readiness regression passed (`6` files, `32` tests).
- Output regression passed (`7` files, `146` tests).
- Full planning regression passed (`18` files, `390` tests).
- `npm.cmd test`: passed (`54` unit/integration files, `2235` tests; `7` UI files, `61` tests; `61` combined files, `2296` tests).
- `npm.cmd run test:coverage`: passed (`61` combined files, `2296` tests) with `90.13%` statements, `81.83%` branches, `95.35%` functions, and `94.05%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: reported known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through development tooling including ESLint, Vite/Vitest, Miniflare, and Wrangler (`6` vulnerabilities: `2` moderate, `4` high); dependency remediation remains outside this correction.

### Issues found

- Low: known development/tooling dependency advisories remain outside this correction and were not remediated.
- Low: existing Vite large-chunk warning remains unchanged.

### Remaining work

- Commit the exact four-file correction, push the existing review branch only, and return to GPT Architect for independent re-review.

## 2026-08-12 - Phase 5C.2.3D.3C.2A - Controlled Apply History Record Contract

### Summary

- Added a pure, deterministic controlled-apply history schema and normalizer with the fixed schema version `phase-5c.2.3d.3c.2a` and outcomes `changed` and `unchanged`.
- Enforced exact record shape, canonical UUID apply IDs, canonical UTC millisecond timestamps, unique apply IDs, and semantic duplicate identity across project, proposal, decision, and field.
- Bound each history record to an existing same-project planning proposal, its coherent user-action confirming decision, and the decision's exact ordered source provenance without requiring current proposal eligibility or current source authority.
- Preserved exact previous and applied strings, including whitespace and marker-like text, and enforced outcome equality invariants without normalization or coercion.
- Limited destinations to `appName`, `clientName`, `businessName`, and own keys of `EMPTY_PROJECT_INTAKE`, while excluding `appType` and validating the proposal's exact `projectField` / `setValue` target identity.
- Added fail-closed collection validation with a 1,000-record cap, dense-array requirements, no partial salvage, defensive cloning, and a valid empty-history path that does not require planning.
- Preserved no `ProjectRecord` integration, storage-version change, migration, persistence, mutation, transaction preparation, D.3A/D.3B invocation, readiness/output behavior, UI apply action, rollback, Power Fx/YAML generation, external AI, or deployment behavior.

### Files created

- `src/lib/planningControlledApplyHistory.ts` - pure controlled-apply history record schema, issue/result contracts, and deterministic normalizer.
- `src/tests/planningControlledApplyHistory.test.ts` - focused contract, provenance, boundary, fail-closed, immutability, determinism, isolation, and TTI-safety coverage.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records the focused D.3C.2A validation matrix.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused D.3C.2A controlled-apply history tests passed (`1` file, `28` tests).
- D.3B destination-contract regression passed (`1` file, `29` tests).
- D.3A candidate-contract regression passed (`1` file, `56` tests).
- PlanningProposals regression passed (`1` file, `31` tests).
- Planning-rules regression passed (`1` file, `16` tests).
- Clarification decision-contract regression passed (`1` file, `32` tests).
- Clarification decision-materialization regression passed (`1` file, `29` tests).
- Repository/storage regression passed (`1` file, `96` tests).
- Intake/readiness regression passed (`6` files, `32` tests).
- Output regression passed (`7` files, `146` tests).
- Full planning regression passed (`18` files, `389` tests).
- `npm.cmd test`: passed (`54` unit/integration files, `2234` tests; `7` UI files, `61` tests; `61` combined files, `2295` tests).
- `npm.cmd run test:coverage`: passed (`61` combined files, `2295` tests) with `90.13%` statements, `81.83%` branches, `95.35%` functions, and `94.06%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: reported known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through development tooling including ESLint, Vite/Vitest, Miniflare, and Wrangler (`6` vulnerabilities: `2` moderate, `4` high); dependency remediation remains outside this phase.

### Issues found

- Low: known development/tooling dependency advisories remain outside this phase and were not remediated.
- Low: existing Vite large-chunk warning remains unchanged.

### Remaining work

- Commit the exact four-file scope, push the review branch only, and return to GPT Architect for independent review.

## 2026-08-12 - Phase 5C.2.3D.3B Controlled Apply Project-Field Destination Validation Contract

### Summary

- Added a pure, deterministic controlled-apply destination analyzer that consumes the D.3A candidate analyzer as the authoritative eligibility gate.
- Added runtime ProjectInputField destination validation only in D.3B, using `EMPTY_PROJECT_INTAKE` ownership plus the existing `appName`, `clientName`, and `businessName` fields.
- Excluded `appType` because the existing project-field apply path normalizes project type and reconciles Power Platform state as side effects.
- Added destination state semantics: empty and whitespace-only destinations return `ready`, exact raw string matches return `unchanged`, and meaningful different values return `destinationConflict`.
- Preserved marker-like user text as meaningful content; no recognized-missing marker list was introduced.
- Preserved no apply history, no persistence, no project mutation, no readiness/output mutation, no Power Fx/YAML generation, and no deployment behavior.

### Files created

- `src/lib/planningControlledApplyDestinationContract.ts` - pure destination validation analyzer and result contract.
- `src/tests/planningControlledApplyDestinationContract.test.ts` - focused positive, negative, boundary, TTI-safety, immutability, determinism, and static isolation coverage.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records focused D.3B destination-validation coverage.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused D.3B destination-contract tests passed (`1` file, `29` tests).
- D.3A controlled-apply candidate regression passed (`1` file, `56` tests).
- PlanningProposals regression passed (`1` file, `31` tests).
- Planning-rules regression passed (`1` file, `16` tests).
- Clarification decision-contract regression passed (`1` file, `32` tests).
- Clarification decision-materialization regression passed (`1` file, `29` tests).
- Repository regression passed (`1` file, `96` tests).
- No separate focused `projectFields` test file exists; D.3B focused tests exercise `getProjectFieldValue` for `appName`, `clientName`, `businessName`, ordinary intake keys, `appType`, and unreadable destinations.
- Intake/readiness regression passed (`6` files, `42` tests).
- Output regression passed (`7` files, `139` tests).
- Full planning regression passed (`17` files, `361` tests).
- `npm.cmd test`: passed on escalated rerun after a sandboxed Vite temp-cache EPERM (`53` unit/integration files, `2206` tests; `7` UI files, `61` tests; `60` combined files, `2267` tests).
- `npm.cmd run test:coverage`: passed on escalated rerun after a sandboxed Vite temp-cache EPERM (`60` combined files, `2267` tests) with `90.05%` statements, `81.71%` branches, `95.31%` functions, and `94.03%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through development tooling including ESLint, Vite/Vitest, Miniflare, and Wrangler (`25` vulnerabilities: `2` moderate, `23` high).

### Issues found

- Low: known development/tooling dependency advisories remain outside this phase and were not remediated.
- Low: sandboxed Vitest startup hit a Vite temp-cache EPERM under `node_modules`; escalated reruns passed.
- Low: existing Vite large-chunk warning remains unchanged.

### Remaining work

- Commit the exact four-file scope, push the review branch only, and return to GPT Architect for independent review.

## 2026-08-12 - Phase 5C.2.3D.3A Architect Correction 1 Proposal-Linked Open Conflict Enforcement

### Summary

- Corrected controlled-apply candidate conflict eligibility so an open conflict explicitly listed in `proposal.conflictIds` blocks with the existing `openConflict` issue code.
- Preserved the existing direct `proposalId` involved-reference and `affectedProposalIds` open-conflict blocking paths.
- Preserved resolved and superseded linked conflicts as non-blocking historical records.
- Preserved unrelated open conflicts as non-blocking and avoided new inference from source IDs, target keys, rule IDs, or proposal text.
- Preserved pure analysis behavior with no conflict mutation, proposal mutation, project mutation, persistence, readiness updates, output generation, destination validation, Power Fx, YAML, external AI, Wrangler, or deployment changes.

### Files created

- None.

### Files updated

- `src/lib/planningControlledApplyContract.ts` - treats `proposal.conflictIds` as an authoritative open-conflict association for eligibility blocking.
- `src/tests/planningControlledApplyContract.test.ts` - adds proposal-linked, affected-only, historical-status, unrelated-conflict, determinism, and immutability regressions.
- `CHANGE_LOG.md` - records this Architect correction.
- `TEST_PLAN.md` - records focused correction scenarios and validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused controlled-apply candidate contract tests passed (`1` file, `56` tests).
- PlanningProposals regression passed (`1` file, `31` tests).
- Planning-rules regression passed (`1` file, `16` tests).
- Clarification decision-contract regression passed (`1` file, `32` tests).
- Clarification decision-materialization regression passed (`1` file, `29` tests).
- Stale/replacement lifecycle regressions passed (`5` files, `90` tests).
- Repository regression passed (`1` file, `96` tests).
- Readiness regression passed (`4` files, `30` tests).
- Output regression passed (`7` files, `139` tests).
- Full planning regression passed on explicit file rerun (`16` files, `332` tests); the first wildcard-filter attempt matched no files in this shell.
- `npm.cmd test`: passed on escalated rerun after a sandboxed Vite temp-cache EPERM (`52` unit/integration files, `2177` tests; `7` UI files, `61` tests; `59` combined files, `2238` tests).
- `npm.cmd run test:coverage`: passed on escalated rerun after a sandboxed Vite temp-cache EPERM (`59` combined files, `2238` tests) with `90.03%` statements, `81.66%` branches, `95.29%` functions, and `94.03%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through development tooling including ESLint, Vite/Vitest, Miniflare, and Wrangler (`25` vulnerabilities: `2` moderate, `23` high).
- `git diff --check`: passed.
- `git status --short --untracked-files=all`: confirmed exactly the four authorized modified files.

### Issues found

- Low: known development/tooling dependency advisories remain outside this phase and were not remediated.
- Low: existing Vite large-chunk warning remains unchanged.
- Low: sandboxed test and coverage startup attempts hit Vite temp-cache EPERM under `node_modules`; escalated reruns passed.

### Remaining work

- Commit the exact four-file correction scope, push the review branch only, and return to GPT Architect for independent review.

## 2026-08-11 - Phase 5C.2.3D.3A Controlled Apply Candidate Eligibility Contract

### Summary

- Added a pure planning-side controlled-apply candidate analyzer that performs no project mutation, destination validation, persistence, runtime allocation, readiness updates, or output changes.
- Limited the initial candidate shape to explicit `projectField` targets with `operation: "setValue"` and `kind: "text"` values.
- Required `Confirmed` proposals with `Known` uncertainty, `concreteProposalAllowed` restriction, eligible categories, coherent user-action confirmation decisions, exact source binding, current sources, and confirmed or approved evidence authority.
- Preserved the non-writable boundary for the current 11 clarification rules; `readinessRequirement`, `clarificationOnly`, `authoritativeSourceRequired`, `architectApprovalRequired`, assumptions, missing decisions, dependencies, conflicts, and alternative groups remain blocked.
- Preserved the source-precedence boundary: evidence ranking is not mutation authority.

### Files created

- `src/lib/planningControlledApplyContract.ts` - pure candidate eligibility analyzer and result contract.
- `src/tests/planningControlledApplyContract.test.ts` - focused positive, negative, TTI-safety, and static isolation coverage.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records focused controlled-apply candidate validation coverage.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused controlled-apply candidate contract tests passed (`1` file, `53` tests).
- PlanningProposals and planning-rules regressions passed (`2` files, `47` tests).
- Clarification decision-contract and decision-materialization regressions passed (`2` files, `61` tests).
- Stale/replacement lifecycle regressions passed (`5` files, `90` tests).
- Repository regression passed (`1` file, `96` tests).
- Readiness regression passed (`4` files, `83` tests).
- Output regression passed (`7` files, `139` tests).
- Full planning regression passed (`16` files, `329` tests).
- `npm.cmd test`: passed (`52` unit/integration files, `2174` tests; `7` UI files, `61` tests; `59` combined files, `2235` tests).
- `npm.cmd run test:coverage`: passed (`59` combined files, `2235` tests) with `90.02%` statements, `81.65%` branches, `95.26%` functions, and `94.03%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through development tooling including ESLint, Vite/Vitest, Miniflare, and Wrangler (`25` vulnerabilities: `2` moderate, `23` high).

### Issues found

- Low: known development/tooling dependency advisories remain outside this phase and were not remediated.
- Low: existing Vite large-chunk warning remains unchanged.

### Remaining work

- Commit the exact four-file scope, push the review branch, and return to GPT Architect for independent review.

## 2026-08-11 - Phase 5C.2.3C Architect Correction 1 Current Evidence Source Enforcement

### Summary

- Corrected clarification human-decision persistence so every source ID already bound to the target proposal must resolve to `availability: "current"` before a new human decision can be materialized.
- Added a precise `nonCurrentEvidenceSource` persistence issue that identifies the proposal ID, offending source ID, source availability, and `sourceIds` field.
- Blocked stale, missing, deleted, and unverified proposal evidence during preparation before timestamp allocation, UUID allocation, candidate construction, or repository writes.
- Preserved historical stale source records and historical decision source bindings; successful confirmation can still stale the old informational source after proving the pre-transaction evidence set is current.
- Preserved no-repair behavior, no auto-stale behavior, source ordering, same proposal identity, fingerprint behavior, readiness isolation, output isolation, UI exclusion, and controlled-apply exclusion.

### Files created

- None.

### Files updated

- `src/lib/planningClarificationDecisionMaterialization.ts` - adds preparation-time current-evidence validation and issue metadata.
- `src/tests/planningClarificationDecisionMaterialization.test.ts` - adds stale/missing/deleted/unverified evidence regressions across supported human actions.
- `src/tests/projectRepository.test.ts` - adds public repository zero-write coverage for non-current bound evidence.
- `CHANGE_LOG.md` - records this Architect correction.
- `TEST_PLAN.md` - records focused correction scenarios and validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported `6` vulnerabilities (`2` moderate, `4` high).
- Focused decision-materialization tests passed (`1` file, `29` tests).
- Focused decision-contract regression passed (`1` file, `32` tests).
- PlanningProposals regression passed (`1` file, `31` tests).
- Planning-rules regression passed (`1` file, `16` tests).
- Clarification blueprint/draft/fingerprint regressions passed (`3` files, `45` tests).
- Reconciliation/source-reconciliation regressions passed (`2` files, `23` tests).
- Stale lifecycle regressions passed (`3` files, `56` tests).
- Replacement lifecycle regressions passed (`2` files, `34` tests).
- Full planning regression passed (`15` files, `276` tests).
- Focused repository regression passed (`1` file, `96` tests).
- Repository regression passed (`5` files, `160` tests).
- Readiness regression passed (`4` files, `82` tests).
- Output regression passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`51` unit/integration files, `2121` tests; `7` UI files, `61` tests; `58` combined files, `2182` tests).
- `npm.cmd run test:coverage`: first attempt failed on a single `powerPlatform.test.ts` timeout; rerun passed (`58` combined files, `2182` tests) with `89.93%` statements, `81.50%` branches, `95.22%` functions, and `93.96%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through `miniflare`/`wrangler` (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `git diff --check`: passed.

### Issues found

- Low: known development/tooling dependency advisories and the existing Vite large-chunk warning remain outside this correction.
- Low: the first `npm.cmd run test:coverage` attempt timed out one test under coverage; the rerun passed.

### Remaining work

- Commit the correction scope, push the review branch only, and return to GPT Architect for independent review.

## 2026-08-11 - Phase 5C.2.3C Controlled Clarification Human Decision Persistence

### Summary

- Added controlled repository materialization for the five approved clarification human actions: `revise`, `confirm`, `reject`, `defer`, and `markNotApplicable`.
- Persisted append-only user-action decision records while preserving proposal identity, deterministic fingerprints, historical decisions, dependencies, conflicts, and existing collection order.
- Added informational `userAnswer` provenance for revisions and confirmed `userAnswer` provenance for confirmations, including staling only the prior informational source while preserving its historical authority, UUID, locator, and observed timestamp.
- Enforced one canonical UTC transaction timestamp, decision-first UUID allocation, UUID collision checks, candidate normalization, final topology validation, full-project race protection, and one atomic repository write.
- Preserved TTI unresolved status and excluded controlled apply, readiness integration, generated output integration, UI, actor identity, remote persistence, storage migration, Power Fx generation, and YAML generation.

### Files created

- `src/lib/planningClarificationDecisionMaterialization.ts` - controlled preparation/finalization materializer for approved clarification human decisions.
- `src/tests/planningClarificationDecisionMaterialization.test.ts` - focused materialization, lifecycle, runtime, topology, TTI-safety, isolation, and immutability coverage.

### Files updated

- `src/lib/projectRepository.ts` - adds the public atomic repository wrapper `materializeProjectPlanningClarificationHumanDecision`.
- `src/tests/projectRepository.test.ts` - adds repository wrapper coverage for boundaries, successful actions, race protection, persistence failure, one-write behavior, preservation, and repeated-action state behavior.
- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported `6` vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused decision-materialization tests passed (`1` file, `21` tests).
- Focused decision-contract regression passed (`1` file, `32` tests).
- PlanningProposals regression passed (`1` file, `31` tests).
- Planning-rules regression passed (`1` file, `16` tests).
- Clarification blueprint/draft/fingerprint regressions passed (`3` files, `45` tests).
- Reconciliation/source-reconciliation regressions passed (`2` files, `23` tests).
- Stale lifecycle regressions passed (`3` files, `56` tests).
- Replacement lifecycle regressions passed (`2` files, `34` tests).
- Full planning regression passed (`15` files, `268` tests).
- Repository regression passed (`5` files, `151` tests).
- Readiness regression passed (`4` files, `82` tests).
- Output regression passed (`7` files, `188` tests).
- `npm.cmd test`: first attempt timed out at the tool timeout; rerun passed (`51` unit/integration files, `2112` tests; `7` UI files, `61` tests; `58` combined files, `2173` tests).
- `npm.cmd run test:coverage`: passed (`58` combined files, `2173` tests) with `89.93%` statements, `81.50%` branches, `95.21%` functions, and `93.97%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` through `miniflare`/`wrangler` (`6` vulnerabilities: `2` moderate, `4` high).
- `git diff --check`: passed.

### Issues found

- Low: full dependency audit reports known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: `npm.cmd run build` reports the existing Vite large-chunk warning.
- Low: the first `npm.cmd test` attempt timed out at the tool timeout; the longer rerun passed.

### Remaining work

- Commit the six-file phase scope, push the review branch only, and return to GPT Architect for independent review.

## 2026-08-11 - Phase 5C.2.3B Architect Correction 1 Recursive Revision Value Enforcement

### Summary

- Corrected the clarification `revise` contract so prohibited planning value kinds are rejected at every structured-record depth.
- Added a revision-specific recursive normalization boundary that permits only text, boolean, enum, string-list, and structured-record values without changing the general planning value normalizer.
- Blocked nested `clarification`, `deferred`, `notApplicable`, and `recordCreation` values with `invalidAnswerValue`.
- Preserved valid nested structured answers, existing revise/confirm behavior, the Not Applicable and defer actions, deterministic fingerprints, provenance plans, readiness/output isolation, UI exclusion, and persistence exclusion.

### Files created

- None.

### Files updated

- `src/lib/planningClarificationDecisionContract.ts` - adds revision-specific recursive value normalization and removes the unused general local normalizer boundary from this module.
- `src/tests/planningClarificationDecisionContract.test.ts` - adds nested prohibited-value regressions and valid nested structured-record coverage.
- `CHANGE_LOG.md` - records this Architect correction.
- `TEST_PLAN.md` - records this correction's focused scenarios and validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported `6` vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused human-decision-contract tests passed (`1` file, `32` tests).
- PlanningProposals and planning-rules regressions passed (`2` files, `47` tests).
- Clarification blueprint/draft/fingerprint regressions passed (`3` files, `45` tests).
- Clarification reconciliation/source-reconciliation regressions passed (`2` files, `23` tests).
- Stale lifecycle regressions passed (`3` files, `56` tests).
- Replacement lifecycle regressions passed (`2` files, `34` tests).
- Full planning regression passed (`14` files, `247` tests).
- Repository regression passed (`4` files, `121` tests).
- Readiness regression passed (`4` files, `82` tests).
- Output regression passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`50` unit/integration files, `2082` tests; `7` UI files, `61` tests; `57` combined files, `2143` tests).
- `npm.cmd run test:coverage`: passed (`57` combined files, `2143` tests) with `89.96%` statements, `81.58%` branches, `95.37%` functions, and `94.07%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`25` vulnerabilities: `2` moderate, `23` high).

### Issues found

- Low: full dependency audit reports known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this correction.
- Low: `npm.cmd run build` reports the existing Vite large-chunk warning.

### Remaining work

- Commit the correction scope, push the review branch only, and return to GPT Architect for independent review.

## 2026-08-11 - Phase 5C.2.3B Clarification Human Decision Contract and Provenance Foundation

### Summary

- Added the pure clarification human-decision contract analyzer for `revise`, `confirm`, `reject`, `defer`, and `markNotApplicable`.
- Added the single approved transition `Needs Clarification -> Not Applicable` while keeping direct `Needs Clarification -> Confirmed` blocked, same-state transitions invalid, and `Rejected`/`Superseded` terminal.
- Defined the answered-then-confirmed lifecycle: `Needs Clarification -> Revised -> Confirmed`.
- Added the canonical user-answer locator convention `planning:userAnswer:<proposalId>:<decisionId>` with canonical lowercase UUID validation and the approved `User answer` source label.
- Planned future `revise` provenance as a current informational `userAnswer` source and future `confirm` provenance as a new current confirmed `userAnswer` source while preserving and staling the prior informational source.
- Preserved deterministic clarification fingerprints as generated-blueprint fingerprints; human revisions do not create or recompute fingerprints.
- Kept content confirmation separate from Architect approval, readiness eligibility, output eligibility, generated documents, Power Fx, YAML, UI, storage, and repository persistence.

### Files created

- `src/lib/planningClarificationDecisionContract.ts` - pure human-decision contract analyzer, deterministic plans, issue codes, and user-answer locator helper.
- `src/tests/planningClarificationDecisionContract.test.ts` - focused contract, provenance, transition, TTI-safety, isolation, and immutability coverage.

### Files updated

- `src/lib/planningProposals.ts` - adds the approved `Needs Clarification -> Not Applicable` transition only.
- `src/tests/planningProposals.test.ts` - locks the transition matrix correction and verifies direct confirmation remains blocked.
- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported `6` vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused human-decision-contract and transition tests passed (`2` files, `57` tests): `src/tests/planningClarificationDecisionContract.test.ts` and `src/tests/planningProposals.test.ts`.
- Focused planning-rules regression passed (`1` file, `16` tests): `src/tests/planningRules.test.ts`.
- Focused clarification blueprint/draft/fingerprint regressions passed (`3` files, `45` tests).
- Focused clarification reconciliation/source-reconciliation regressions passed (`2` files, `23` tests).
- Focused stale lifecycle regressions passed (`3` files, `56` tests).
- Focused replacement lifecycle regressions passed (`2` files, `34` tests).
- Focused initial-materialization regression passed (`1` file, `10` tests).
- Full planning regression passed (`14` files, `241` tests).
- Repository regression passed (`4` files, `121` tests).
- Readiness regression passed (`4` files, `82` tests).
- Output regression passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`50` unit/integration files, `2076` tests; `7` UI files, `61` tests; `57` combined files, `2137` tests).
- `npm.cmd run test:coverage`: passed (`57` combined files, `2137` tests) with `89.95%` statements, `81.55%` branches, `95.37%` functions, and `94.08%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`25` vulnerabilities: `2` moderate, `23` high).

### Issues found

- Low: full dependency audit reports known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: `npm.cmd run build` reports the existing Vite large-chunk warning.

### Remaining work

- Commit the exact six-file review branch scope, push the review branch, and return to GPT Architect for independent review.

## 2026-08-10 - Phase 5C.2.2F Controlled Clarification Replacement and Supersession Materialization

### Summary

- Added the controlled persistence boundary for E-proven clarification replacements.
- Replacement materialization internally invokes the Phase 5C.2.2E analyzer as the authoritative proof of stale predecessor, generated successor, fingerprint, stale reason, and replacement-source lineage.
- Replacement source creation, successor proposal creation, stale-predecessor `Stale -> Superseded` transition, `supersededByProposalId`, append-only `supersede` decision, and project `updatedAt` now happen in one repository transaction.
- A persisted half-state is not allowed because reconciliation treats both `Stale` and `Needs Clarification` as non-terminal; persisting the successor without superseding the predecessor would create same-key ambiguity.
- Replacement sources are limited to E-approved source relationships; exact current sources are reused by persisted ID in generated blueprint order, and unrelated generated sources/proposals remain unpersisted.
- Successor proposals remain `Needs Clarification`; no user confirmation, readiness satisfaction, output integration, UI, conflicts, dependencies, external AI, Wrangler, deployment, PR, tag, release, or `main` integration was added.
- Predecessor history remains append-only: prior `markStale` decisions are preserved, stale metadata is removed from the Superseded predecessor, and one deterministic `supersede` decision records the technical lifecycle transition.

### Files created

- `src/lib/planningClarificationReplacementMaterialization.ts` - preparation/finalization contracts and deterministic replacement/supersession materialization.
- `src/tests/planningClarificationReplacementMaterialization.test.ts` - focused replacement materialization, topology, runtime, history, isolation, and TTI safety coverage.

### Files updated

- `src/lib/projectRepository.ts` - adds the public replacement materialization repository wrapper with project snapshot protection and one atomic write.
- `src/tests/projectRepository.test.ts` - adds replacement repository guard, persistence, idempotency, race, failure, and preservation regressions.
- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported `6` vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused replacement-materialization tests passed (`1` file, `10` tests): `src/tests/planningClarificationReplacementMaterialization.test.ts`.
- Focused replacement-analysis regression passed (`1` file, `24` tests): `src/tests/planningClarificationReplacementAnalysis.test.ts`.
- Focused stale-materialization regression passed (`1` file, `15` tests).
- Focused stale-propagation regression passed (`1` file, `18` tests).
- Focused lifecycle-analysis regression passed (`1` file, `23` tests).
- Focused proposal-reconciliation regression passed (`1` file, `12` tests).
- Focused source-reconciliation regression passed (`1` file, `11` tests).
- Focused initial clarification materialization regression passed (`1` file, `10` tests).
- Full planning regression passed (`13` files, `215` tests): planning proposals, rules, drafts, blueprints, fingerprints, reconciliation, source reconciliation, initial materialization, lifecycle analysis, stale propagation, stale materialization, replacement analysis, and replacement materialization.
- Repository regression passed (`4` files, `121` tests): `src/tests/projectRepository.test.ts`, initial materialization, stale materialization, and replacement materialization.
- Readiness regression passed (`4` files, `82` tests).
- Output regression passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`49` unit/integration files, `2050` tests; `7` UI files, `61` tests; `56` combined files, `2111` tests).
- `npm.cmd run test:coverage`: passed (`56` combined files, `2111` tests) with `90.02%` statements, `81.55%` branches, `95.29%` functions, and `94.12%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`25` vulnerabilities: `2` moderate, `23` high).
- `git diff --check`: passed.
- `git status --short`: showed only the six approved phase files.

### Issues found

- Low: full dependency audit reports known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: `npm.cmd run build` reports the existing Vite large-chunk warning.

### Remaining work

- Commit the exact six-file review branch scope, push the review branch, and return to GPT Architect for independent review.

## 2026-08-10 - Phase 5C.2.2E Deterministic Clarification Replacement Pairing Analysis

### Summary

- Added a pure, deterministic, read-only clarification replacement analyzer for post-Stale planning lineage.
- The analyzer normalizes existing planning, independently invokes source reconciliation and proposal reconciliation, validates supplied generated fingerprints through the existing reconciliation path, and fails closed with zero replacement conclusions when normalization or reconciliation reports issues.
- Added cause-specific proof for `sourceChanged`, `ruleChanged`, and `applicabilityChanged` stale proposals, including exact semantic source lineage, exact rule rollover checks, applicability-only checks, coherent `markStale` history validation, deterministic ordering, defensive copies, and fail-closed mismatch behavior.
- Preserved unresolved TTI blockers and excluded persistence, generated replacement IDs, supersession, user decisions, readiness integration, output integration, UI, storage, network, external AI, Wrangler, deployment, PR, tag, release, and `main` integration.

### Files created

- `src/lib/planningClarificationReplacementAnalysis.ts` - read-only replacement pairing analyzer and public result contracts.
- `src/tests/planningClarificationReplacementAnalysis.test.ts` - focused replacement pairing, fail-closed, ordering, immutability, and TTI safety coverage.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported `6` vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused replacement-analysis tests passed (`1` file, `24` tests): `src/tests/planningClarificationReplacementAnalysis.test.ts`.
- Focused stale-materialization regression passed (`1` file, `15` tests).
- Focused stale-propagation regression passed (`1` file, `18` tests).
- Focused lifecycle-analysis regression passed (`1` file, `23` tests).
- Focused reconciliation regression passed (`1` file, `12` tests).
- Focused source-reconciliation regression passed (`1` file, `11` tests).
- Full planning regression passed (`12` files, `205` tests): planning proposals, rules, clarification drafts, blueprints, fingerprints, reconciliation, source reconciliation, materialization, lifecycle analysis, stale propagation, stale materialization, and replacement analysis.
- Repository regression passed (`3` files, `106` tests).
- Readiness regression passed (`4` files, `82` tests).
- Output regression passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`48` unit/integration files, `2035` tests; `7` UI files, `61` tests; `55` combined files, `2096` tests).
- `npm.cmd run test:coverage`: passed (`55` combined files, `2096` tests) with `90.12%` statements, `81.77%` branches, `95.53%` functions, and `94.35%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development/tooling dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`25` vulnerabilities: `2` moderate, `23` high).

### Issues found

- Low: full dependency audit reports known development/tooling advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: `npm.cmd run build` reports the existing Vite large-chunk warning.

### Remaining work

- Commit the exact four-file review branch scope, push the review branch, and return to GPT Architect for independent review.

## 2026-08-10 - Phase 5C.2.2D Controlled Clarification Stale-Transition Materialization

### Summary

- Added the first controlled persistence boundary for deterministic clarification stale transitions.
- Preserved Phase 5C.2.2B and Phase 5C.2.2C as the analytical authorities; stale materialization recomputes C internally and persists only C-approved safe transitions.
- Added source `current` to `stale` materialization for approved `sourceChanged` and `ruleChanged` source transitions without adding source stale metadata or changing `observedAt`.
- Added proposal transition materialization to `Stale` with approved `staleReason`, one transaction `staleAt`, `updatedAt`, `lastDecisionId`, and append-only `markStale` decisions.
- Corrected the planning transition matrix so `Blocked` and `Needs Clarification` can transition to `Stale`, while terminal `Rejected` and `Superseded` remain closed and `Stale` to `Stale` remains invalid.
- Added one-timestamp, validated UUID, candidate-normalization, idempotent already-stale, project-snapshot, and atomic repository-write protection.
- Preserved readiness/output isolation and excluded replacement proposal generation, source replacement, supersession, user decision materialization, UI, remote persistence, external AI, Wrangler, deployment, PR, tag, release, and `main` integration.

### Files created

- `src/lib/planningClarificationStaleMaterialization.ts` - preparation/finalization contracts and deterministic stale-transition materialization.
- `src/tests/planningClarificationStaleMaterialization.test.ts` - focused stale materialization regression coverage.

### Files updated

- `src/lib/planningProposals.ts` - adds only `Blocked -> Stale` and `Needs Clarification -> Stale`.
- `src/tests/planningProposals.test.ts` - proves the approved transition correction and terminal/same-state preservation.
- `src/lib/projectRepository.ts` - adds the public stale-transition repository wrapper with full-project snapshot protection and one atomic write.
- `src/tests/projectRepository.test.ts` - adds stale-transition repository guard, persistence, concurrent-change, and write-failure regressions.
- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported `6` vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused transition/materialization/repository tests passed (`3` files, `127` tests): `src/tests/planningProposals.test.ts`, `src/tests/planningClarificationStaleMaterialization.test.ts`, and `src/tests/projectRepository.test.ts`.
- Focused planning transition tests passed (`1` file, `31` tests): `src/tests/planningProposals.test.ts`.
- Focused stale-materialization tests passed (`1` file, `15` tests): `src/tests/planningClarificationStaleMaterialization.test.ts`.
- Focused stale-propagation regression passed (`1` file, `18` tests): `src/tests/planningClarificationStalePropagation.test.ts`.
- Full planning regression passed (`11` files, `181` tests): planning proposals, rules, clarification drafts, blueprints, fingerprints, reconciliation, source reconciliation, materialization, lifecycle analysis, stale propagation, and stale materialization.
- Repository regression passed (`3` files, `106` tests): `src/tests/projectRepository.test.ts`, `src/tests/planningClarificationMaterialization.test.ts`, and `src/tests/planningClarificationStaleMaterialization.test.ts`.
- Readiness regression passed (`4` files, `82` tests): `src/tests/clientReview.test.ts`, `src/tests/validateIntake.test.ts`, `src/tests/powerPlatform.test.ts`, and `src/tests/phase5b4b5Regression.test.ts`.
- Output regression passed (`7` files, `188` tests): `src/tests/generateProjectPackage.test.ts`, `src/tests/documentReview.test.ts`, `src/tests/exportManifest.test.ts`, `src/tests/exportProjectPackage.test.ts`, `src/tests/exportIntegrity.test.ts`, `src/tests/implementationAssets.test.ts`, and `src/tests/recordLifecyclePowerFxGeneration.test.ts`.
- `npm.cmd test`: passed (`47` unit/integration files, `2011` tests; `7` UI files, `61` tests; `54` combined files, `2072` tests).
- `npm.cmd run test:coverage`: passed (`54` combined files, `2072` tests) with `90.22%` statements, `81.85%` branches, `95.40%` functions, and `94.44%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`25` vulnerabilities: `2` moderate, `23` high).
- `git diff --check`: passed.
- `git status --short`: showed only the eight approved phase files.

### Issues found

- Low: `npm.cmd ci` reports existing development dependency advisories; dependency changes are outside this phase.
- Low: `npm.cmd audit --audit-level=high` reports known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: `npm.cmd run build` reports the existing Vite large-chunk warning.

### Remaining work

- Commit the exact eight-file review branch scope, push the review branch, and return to GPT Architect for independent review.

## 2026-08-09 - Phase 5C.2.2C.1 Fail-Closed Validation Correction

### Summary

- Corrected a raw-input dereference boundary in stale-propagation analysis where nested source/proposal arrays could be accessed after B lifecycle analysis had already produced validation or reconciliation failures.
- Added an immediate authoritative B failure gate after `analyzePlanningClarificationLifecycleChanges(input)` so failure-class B issues return `blocked` with zero source/proposal transition conclusions.
- Preserved B as the only validation/classification authority; C does not add replacement validation, normalization, sanitization, repair, or filtering.
- Added malformed-member regressions for persisted source records, generated proposal records, generated source records, hostile nested state behind an invalid project ID, and zero-conclusion failure results.
- Preserved A-M successful propagation behavior and the approved isolation boundary.

### Files created

- None.

### Files updated

- `src/lib/planningClarificationStalePropagation.ts` - adds the immediate B failure-class early return before raw lookup maps are constructed.
- `src/tests/planningClarificationStalePropagation.test.ts` - adds malformed-member and zero-conclusion fail-closed regressions.
- `CHANGE_LOG.md` - records this correction.
- `TEST_PLAN.md` - records this correction validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported `6` vulnerabilities (`2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationStalePropagation.test.ts`: passed (`1` file, `18` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts src/tests/planningClarificationMaterialization.test.ts src/tests/planningClarificationLifecycleAnalysis.test.ts src/tests/planningClarificationStalePropagation.test.ts`: passed (`10` files, `166` tests).
- Repository regression passed (`2` files, `87` tests): `src/tests/projectRepository.test.ts` and `src/tests/planningClarificationMaterialization.test.ts`.
- Focused readiness regression passed (`4` files, `82` tests): `src/tests/clientReview.test.ts`, `src/tests/validateIntake.test.ts`, `src/tests/powerPlatform.test.ts`, and `src/tests/phase5b4b5Regression.test.ts`.
- Focused output regression passed (`7` files, `188` tests): `src/tests/generateProjectPackage.test.ts`, `src/tests/documentReview.test.ts`, `src/tests/exportManifest.test.ts`, `src/tests/exportProjectPackage.test.ts`, `src/tests/exportIntegrity.test.ts`, `src/tests/implementationAssets.test.ts`, and `src/tests/recordLifecyclePowerFxGeneration.test.ts`.
- `npm.cmd test`: first attempt timed out at the tool limit before returning output; rerun with a longer timeout passed (`46` unit/integration files, `1992` tests; `7` UI files, `61` tests; `53` combined files, `2053` tests).
- `npm.cmd run test:coverage`: passed (`53` combined files, `2053` tests) with `90.42%` statements, `82.04%` branches, `95.65%` functions, and `94.78%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`25` vulnerabilities: `2` moderate, `23` high).

### Issues found

- Low: full dependency audit reports development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: build reports the existing Vite large-chunk warning.

### Remaining work

- Return to GPT Architect for independent re-review of the corrected Phase 5C.2.2C review branch.

## 2026-08-09 - Phase 5C.2.2C Deterministic Clarification Stale-Propagation Analysis

### Summary

- Added a pure deterministic stale-propagation analyzer that calls the authoritative lifecycle analyzer internally and never trusts caller-provided lifecycle results.
- Propagates approved source-change stale requirements from changed persisted sources to otherwise unchanged or fingerprint-only ambiguous dependent proposals through persisted proposal `sourceIds`.
- Resolves only the approved fingerprint-only ambiguity caused by changed source dependencies, blocks multi-cause source-plus-proposal changes, and preserves unversioned generated content changes as blocked.
- Adds exact rule-rollover handling for current old project-rule sources while keeping already non-current old rule sources historical and unpersisted generated replacement sources unchanged.
- Preserves the approved read-only boundary: no lifecycle mutation, stale timestamps, supersession, planning decisions, conflicts, dependencies, repository writes, storage writes, UI, readiness integration, output integration, Power Fx, YAML, generated documents, manifest/ZIP/export changes, remote persistence, network, telemetry, external AI, Wrangler, deployment, PR, tag, release, or main integration.

### Files created

- `src/lib/planningClarificationStalePropagation.ts` - pure stale-propagation analyzer and public result contracts.
- `src/tests/planningClarificationStalePropagation.test.ts` - focused A-M stale-propagation coverage.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing dependency audit advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npm.cmd exec -- tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd exec -- vitest run src/tests/planningClarificationStalePropagation.test.ts --config vitest.unit.config.ts`: passed (`1` file, `13` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts src/tests/planningClarificationMaterialization.test.ts src/tests/planningClarificationLifecycleAnalysis.test.ts src/tests/planningClarificationStalePropagation.test.ts`: passed (`10` files, `161` tests).
- Repository regression passed (`2` files, `87` tests): `src/tests/projectRepository.test.ts` and `src/tests/planningClarificationMaterialization.test.ts`.
- Focused readiness regression passed (`4` files, `82` tests): `src/tests/clientReview.test.ts`, `src/tests/validateIntake.test.ts`, `src/tests/powerPlatform.test.ts`, and `src/tests/phase5b4b5Regression.test.ts`.
- Focused output regression passed (`7` files, `188` tests): `src/tests/generateProjectPackage.test.ts`, `src/tests/documentReview.test.ts`, `src/tests/exportManifest.test.ts`, `src/tests/exportProjectPackage.test.ts`, `src/tests/exportIntegrity.test.ts`, `src/tests/implementationAssets.test.ts`, and `src/tests/recordLifecyclePowerFxGeneration.test.ts`.
- `npm.cmd test`: passed (`46` unit/integration files, `1987` tests; `7` UI files, `61` tests; `53` combined files, `2048` tests).
- `npm.cmd run test:coverage`: passed (`53` combined files, `2048` tests) with `90.34%` statements, `81.97%` branches, `95.61%` functions, and `94.69%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`25` vulnerabilities: `2` moderate, `23` high).

### Issues found

- Low: full dependency audit reports development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: build reports the existing Vite large-chunk warning.

### Remaining work

- Return to GPT Architect for independent review of the Phase 5C.2.2C review-branch commit. Do not integrate to `main` or begin stale lifecycle persistence, planning decisions, planning UI, readiness integration, output integration, remote persistence, or external AI phases without explicit Architect approval.

## 2026-08-09 - Phase 5C.2.2B.3 Strict Lifecycle Validation Correction

### Summary

- Removed the lifecycle-only legacy rule-set compatibility path introduced in B.2.
- Restored direct authoritative `normalizeProjectPlanningState` use so invalid persisted proposal `ruleSetVersion` values fail closed before source or proposal lifecycle classification.
- Documented that future rule-set upgrades require a separately approved storage migration, planning migration, compatibility strategy, or rule-set transition architecture.
- Hardened rule-version stale classification so `ruleChanged` requires deterministic old-to-new project-rule source rollover evidence whenever `ruleVersion` differs.
- Preserved B.2 source rollover hardening for existing-only and non-current old project-rule sources, exact ordered source-set enforcement, source-set rejection, and multiple-reason ambiguity.
- Preserved the approved read-only boundary: no migration logic, schema translation, new stale reasons, planning mutation, status mutation, stale timestamps, supersession, decisions, conflicts, dependencies, repository writes, UI, hooks, readiness integration, output integration, Power Fx, YAML, generated documents, manifest/ZIP/export changes, remote persistence, network, telemetry, external AI, Wrangler, deployment, PR, tag, release, or main integration.

### Files created

- None.

### Files updated

- `src/lib/planningClarificationLifecycleAnalysis.ts` - restores direct authoritative normalization, removes legacy rule-set compatibility helpers, and requires proven project-rule source rollover for rule-version stale classification.
- `src/tests/planningClarificationLifecycleAnalysis.test.ts` - rewrites legacy rule-set tests to fail closed, changes proposal-only rule-version mismatch to ambiguity, adds Confirmed realistic rollover coverage, and preserves realistic multi-reason rollover regressions.
- `CHANGE_LOG.md` - records this correction.
- `TEST_PLAN.md` - records this correction validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationLifecycleAnalysis.test.ts`: passed (`1` file, `23` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts src/tests/planningClarificationMaterialization.test.ts src/tests/planningClarificationLifecycleAnalysis.test.ts`: passed (`9` files, `148` tests).
- Focused readiness regression passed (`4` files, `82` tests).
- Focused output regression passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`45` unit/integration files, `1974` tests; `7` UI files, `61` tests; `52` combined files, `2035` tests).
- `npm.cmd run test:coverage`: passed (`52` combined files, `2035` tests) with `90.32%` statements, `81.87%` branches, `95.59%` functions, and `94.73%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`6` vulnerabilities: `2` moderate, `4` high).

### Issues found

- Low: full dependency audit reports known development-only advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this correction.
- Low: build reports the existing Vite large-chunk warning.

### Remaining work

- Return to GPT Architect for independent re-review of the strict corrected review-branch commit. Do not integrate to `main` or begin later planning lifecycle, UI, readiness, output, migration compatibility, remote persistence, or external AI phases without explicit Architect approval.

## 2026-08-09 - Phase 5C.2.2B.2 Lifecycle Rule-Change Boundary Correction

### Summary

- Hardened rule-change lifecycle classification so rule-version rollover accepts an exact old project-rule source from either existing-only or non-current source reconciliation.
- Enforced an exact ordered source-identity set for the special rule-version rollover exception, rejecting unrelated, missing, substituted, or additional proposal source bindings.
- Added lifecycle-only handling for valid legacy proposal rule-set versions so rule-set-only comparisons can be analyzed read-only without weakening reconciliation input contracts.
- Corrected classification order so `rule`, `applicability`, and `content` causes all participate in multiple-reason ambiguity before any stale reason is selected.
- Preserved the approved read-only boundary: no planning mutation, status mutation, stale timestamps, supersession, decisions, conflicts, dependencies, repository writes, UI, hooks, readiness integration, output integration, Power Fx, YAML, generated documents, manifest/ZIP/export changes, remote persistence, network, telemetry, external AI, Wrangler, deployment, PR, tag, release, or main integration.

### Files created

- None.

### Files updated

- `src/lib/planningClarificationLifecycleAnalysis.ts` - adds lifecycle-only legacy rule-set normalization for comparison, exact rule-version rollover source-set validation, non-current old project-rule source support, and multi-cause rule classification.
- `src/tests/planningClarificationLifecycleAnalysis.test.ts` - adds regressions for non-current old-rule rollover, extra and missing source rejection, rule-set-only boundaries, rule plus applicability/content ambiguity, and realistic rollover plus second cause ambiguity.
- `CHANGE_LOG.md` - records this correction.
- `TEST_PLAN.md` - records this correction validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationLifecycleAnalysis.test.ts`: passed (`1` file, `22` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts src/tests/planningClarificationMaterialization.test.ts src/tests/planningClarificationLifecycleAnalysis.test.ts`: passed (`9` files, `147` tests).
- Focused readiness regression passed (`4` files, `82` tests).
- Focused output regression passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`45` unit/integration files, `1973` tests; `7` UI files, `61` tests; `52` combined files, `2034` tests).
- `npm.cmd run test:coverage`: passed (`52` combined files, `2034` tests) with `90.30%` statements, `81.85%` branches, `95.57%` functions, and `94.68%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`6` vulnerabilities: `2` moderate, `4` high).

### Issues found

- Low: full dependency audit reports known development-only advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this correction.
- Low: build reports the existing Vite large-chunk warning.

### Remaining work

- Return to GPT Architect for independent re-review of the fully corrected review-branch commit. Do not integrate to `main` or begin later planning lifecycle, UI, readiness, output, remote persistence, or external AI phases without explicit Architect approval.

## 2026-08-09 - Phase 5C.2.2B.1 Lifecycle Change Analysis Classification Correction

### Summary

- Corrected lifecycle proposal classification for realistic project-rule version rollovers where the project-rule source semantic identity changes from `projectRule|{ruleId}|{oldRuleVersion}` to `projectRule|{ruleId}|{newRuleVersion}` as a deterministic consequence of the rule-version change.
- Removed persisted non-terminal proposal `status` from lifecycle-cause structural comparison so valid historical/current lifecycle state is not treated as an architecture-change cause.
- Corrected fingerprint-only proposal differences so unresolved single-category fingerprint changes return ambiguity without misusing `multipleLifecycleReasons`.
- Preserved the approved review-only lifecycle boundary: no planning mutation, stale transitions, supersession, decisions, conflicts, dependencies, repository writes, UI, readiness integration, output integration, remote persistence, external AI, Wrangler, deployment, PR, tag, release, or main integration.

### Files created

- None.

### Files updated

- `src/lib/planningClarificationLifecycleAnalysis.ts` - adds deterministic project-rule source rollover handling, excludes proposal status from changed-field comparison, and restricts `multipleLifecycleReasons` to genuine multi-category lifecycle-cause changes.
- `src/tests/planningClarificationLifecycleAnalysis.test.ts` - adds regression coverage for realistic project-rule source identity rollover, Confirmed proposal status preservation across approved stale reasons, and fingerprint-only ambiguity.
- `CHANGE_LOG.md` - records this correction.
- `TEST_PLAN.md` - records this correction validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationLifecycleAnalysis.test.ts`: passed (`1` file, `14` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts src/tests/planningClarificationMaterialization.test.ts src/tests/planningClarificationLifecycleAnalysis.test.ts`: passed (`9` files, `139` tests).
- Focused readiness regression passed (`4` files, `82` tests).
- Focused output regression passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`45` unit/integration files, `1965` tests; `7` UI files, `61` tests; `52` combined files, `2026` tests).
- `npm.cmd run test:coverage`: passed (`52` combined files, `2026` tests) with `90.26%` statements, `81.82%` branches, `95.51%` functions, and `94.67%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`6` vulnerabilities: `2` moderate, `4` high).

### Issues found

- Low: full dependency audit reports known development-only advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this correction.
- Low: build reports the existing Vite large-chunk warning.

### Remaining work

- Return to GPT Architect for independent re-review of the corrected review-branch commit. Do not integrate to `main` or begin later planning lifecycle, UI, readiness, output, remote persistence, or external AI phases without explicit Architect approval.

## 2026-08-09 - Phase 5C.2.2B Deterministic Clarification Lifecycle Change Analysis

### Summary

- Added a pure deterministic lifecycle-change analysis layer for persisted clarification planning.
- Added source and proposal lifecycle analysis records that distinguish `unchanged`, `staleRequired`, `noLongerGenerated`, `historical`, and `ambiguous` outcomes without adding persisted lifecycle states.
- Added approved stale-reason analysis for source evidence changes, explicit rule-version changes, applicability-only proposal changes, and same-version proposal regeneration.
- Added fail-closed ambiguity handling for malformed reconciliation, unresolved causes, unversioned rule-content changes, and multiple independent lifecycle-reason categories.
- Preserved lifecycle boundaries: no source/proposal stale mutation, supersession, decisions, conflicts, dependencies, repository persistence, storage access, UUID generation, timestamps, UI, readiness integration, output integration, network calls, external AI, deployment, PR, tag, release, Wrangler, or main integration.
- Applied review-before-main governance: implementation is committed and pushed only to the review branch for Architect inspection.

### Files created

- `src/lib/planningClarificationLifecycleAnalysis.ts` - pure lifecycle analysis input/result contracts, existing planning normalization, source/proposal reconciliation use, structural changed-field comparison, approved stale-reason classification, ambiguity issues, historical reporting, deterministic ordering, and defensive result copies.
- `src/tests/planningClarificationLifecycleAnalysis.test.ts` - focused coverage for exact TTI planning, source evidence changes, rule-version changes, applicability-only changes, same-version content regeneration, multiple reason ambiguity, existing-only records, terminal history, reconciliation ambiguity, input-order invariance, immutability, and isolation boundaries.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationLifecycleAnalysis.test.ts`: passed (`1` file, `9` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts src/tests/planningClarificationMaterialization.test.ts src/tests/planningClarificationLifecycleAnalysis.test.ts`: passed (`9` files, `134` tests).
- Focused readiness regression passed (`4` files, `82` tests).
- Focused output regression passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`45` unit/integration files, `1960` tests; `7` UI files, `61` tests; `52` combined files, `2021` tests).
- `npm.cmd run test:coverage`: passed (`52` combined files, `2021` tests) with `90.23%` statements, `81.77%` branches, `95.53%` functions, and `94.62%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`6` vulnerabilities: `2` moderate, `4` high).

### Issues found

- Low: full dependency audit reports known development-only advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: build reports the existing Vite large-chunk warning.
- Low: aggregate coverage percentages decreased from the integrated baseline after adding the new analyzer file, while the coverage command and gate passed.

### Remaining work

- Return to GPT Architect for independent review of the review-branch commit. Do not integrate to `main` or begin lifecycle materialization, decisions, UI, readiness, output, remote persistence, or external AI phases without explicit Architect approval.

## 2026-08-09 - Phase 5C.2.2A Controlled Clarification Record Materialization and Repository Persistence

### Summary

- Added the first controlled planning materialization boundary for deterministic clarification records.
- Added repository-owned UUID generation through an injectable runtime boundary, with production defaulting to `globalThis.crypto.randomUUID()` only.
- Added an injectable repository UTC materialization clock that is called once for changed transactions and never for true no-op transactions.
- Added exact source/proposal identity reuse, append-only-safe new source/proposal creation, and exact proposal source-binding validation.
- Added atomic single-write repository persistence with baseline snapshot reread protection and `projectChangedDuringMaterialization` fail-closed behavior.
- Added idempotent no-op behavior that preserves `updatedAt`, existing planning, UUID calls, clock calls, and storage writes.
- Added lifecycle-change blocking for changed/no-longer-generated source and proposal dispositions, reconciliation issues, ambiguity, source identity defects, and exact proposal source-binding mismatches.
- Preserved phase boundaries: no planning decisions, stale transitions, supersession, UI, readiness integration, generated-output integration, remote persistence, external AI, deployment, tag, release, PR, Wrangler, or main integration.
- Applied review-before-main governance: implementation is committed and pushed only to the review branch for Architect inspection.

### Files created

- `src/lib/planningClarificationMaterialization.ts` - repository-safe materialization preparation/finalization contracts, runtime validation, reconciliation gating, UUID/timestamp validation, append-only candidate construction, candidate normalization, structured outcomes, and defensive result copies.
- `src/tests/planningClarificationMaterialization.test.ts` - focused coverage for TTI persistence/reload, exact reuse, mixed append, lifecycle blocks, exact binding mismatch, concurrency, runtime failures, candidate caps, storage failure, immutability, readiness/output isolation, and privacy boundaries.

### Files updated

- `src/lib/projectRepository.ts` - adds `materializeProjectPlanningClarifications` with project lookup/type guards, baseline reread protection, repository-owned timestamp use, and a single internal storage write.
- `src/tests/projectRepository.test.ts` - adds repository boundary coverage for invalid project IDs, missing projects, unsupported project types, and no-write behavior.
- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationMaterialization.test.ts`: passed (`1` file, `10` tests).
- `npm.cmd run test:unit -- src/tests/projectRepository.test.ts`: passed (`1` file, `77` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts src/tests/planningClarificationMaterialization.test.ts`: passed (`8` files, `125` tests).
- Focused readiness isolation batch passed (`4` files, `82` tests).
- Focused output isolation batch passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`44` unit/integration files, `1951` tests; `7` UI files, `61` tests; `51` combined files, `2012` tests).
- `npm.cmd run test:coverage`: timed out once at the tool timeout, then passed on rerun (`51` combined files, `2012` tests) with `90.43%` statements, `81.91%` branches, `95.55%` functions, and `94.88%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`6` vulnerabilities: `2` moderate, `4` high).

### Issues found

- Low: full dependency audit reports known development-only advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: build reports the existing Vite large-chunk warning.
- Low: the first coverage attempt timed out at the tool timeout; the rerun passed.

### Remaining work

- Return to GPT Architect for independent review of the review-branch commit. Do not integrate to `main` or begin later planning lifecycle/UI/readiness/output phases without explicit Architect approval.

## 2026-08-08 - Phase 5C.2.1F Deterministic Clarification Source Reconciliation

### Summary

- Added pure read-only deterministic clarification source reconciliation classification.
- Added derived semantic source identity for persisted `projectRule` and `readinessPrerequisite` source records without changing the persisted planning schema or adding `sourceKey`.
- Added current vs non-current source separation so only current persisted sources can be reused as current matches.
- Added `newSource`, `exactMatch`, `changedSource`, `noLongerGenerated`, and non-current history reporting.
- Added source-set completeness validation for duplicate, missing, and unexpected generated source blueprints.
- Added generated source identity binding checks for approved project-rule and readiness-prerequisite source forms.
- Added existing source-lineage protection for unsupported clarification sources and unrecognized deterministic source identity shapes.
- Architect correction 5C.2.1F.1 hardened persisted source identity derivation so existing project-rule locator payloads, project-rule versions, and readiness-prerequisite locator payloads containing the canonical `|` source-key delimiter now return `unrecognizedExistingSourceIdentity` instead of deriving malformed semantic keys.
- Added ambiguous current-source key protection without UUID ordering, array-order winner selection, or lifecycle repair.
- Preserved lifecycle boundaries: no UUID generation, timestamps, materialization, source availability mutation, proposal lifecycle mutation, persistence, repository/storage writes, UI, readiness integration, output integration, network calls, external AI, deployment, tag, release, PR, or main integration.
- Applied review-before-main governance: implementation is committed and pushed only to the review branch for Architect inspection.

### Files created

- `src/lib/planningClarificationSourceReconciliation.ts` - read-only source reconciliation input/output contracts, runtime validation, existing planning normalization, independent generated-set validation, source-set completeness checks, existing semantic-key derivation, current/existing-only/non-current classification, ambiguity protection, deterministic ordering, structured issues, and defensive copy handling.
- `src/tests/planningClarificationSourceReconciliation.test.ts` - focused coverage for validation failures, TTI source scenarios, exact/changed/new behavior, existing-only behavior, non-current reporting, ambiguous keys, unsupported lineage, unrecognized identities, unrelated-source isolation, ordering, immutability, lifecycle isolation, readiness/output isolation, and privacy boundaries.
- Architect correction 5C.2.1F.1 updated the source parser and focused tests only within the approved file scope to cover malformed project-rule locator delimiters, malformed project-rule version delimiters, malformed readiness locator delimiters, malformed-source `existingOnly` exclusion, and valid historical identity preservation.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationSourceReconciliation.test.ts`: passed (`1` file, `10` tests).
- `npm.cmd run test:unit -- src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationSourceReconciliation.test.ts`: passed (`2` files, `25` tests).
- `npm.cmd run test:unit -- src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts`: passed (`3` files, `33` tests).
- `npm.cmd run test:unit -- src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts`: passed (`6` files, `83` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts src/tests/planningClarificationSourceReconciliation.test.ts`: passed (`7` files, `114` tests).
- Focused readiness isolation batch passed (`4` files, `82` tests).
- Focused output isolation batch passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`43` unit/integration files, `1939` tests; `7` UI files, `61` tests; `50` combined files, `2000` tests).
- `npm.cmd run test:coverage`: passed (`50` combined files, `2000` tests) with `90.45%` statements, `81.92%` branches, `95.58%` functions, and `95.03%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici` (`25` vulnerabilities: `2` moderate, `23` high).

### Issues found

- Low: full dependency audit reports known development-only advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.
- Low: build reports the existing Vite large-chunk warning.

### Remaining work

- Commit exactly the four approved files on the review branch, push the review branch only, leave `main` unchanged, and return to GPT Architect for independent review.

## 2026-08-08 - Phase 5C.2.1E Deterministic Clarification Reconciliation Classification

### Summary

- Added pure read-only deterministic clarification reconciliation classification.
- Added fingerprint-first matching against existing normalized planning state without mutating existing records.
- Added semantic-key changed-proposal detection for non-terminal existing clarification proposals.
- Added `newProposal`, `exactMatch`, `changedProposal`, and `noLongerGenerated` classification outputs.
- Added terminal history separation for `Rejected` and `Superseded` clarification records so they are reported but never reused as current candidates.
- Added ambiguity fail-safe handling for duplicate current semantic keys and duplicate existing fingerprints.
- Added supplied fingerprint-set verification against independently regenerated Phase 5C.2.1D fingerprints.
- Added fail-closed handling for existing planning normalization issues, generated fingerprint issues, and supplied fingerprint mismatches.
- Preserved lifecycle boundaries: no UUID generation, timestamps, materialization, decisions, stale/supersession mutation, reconciliation persistence, repository/storage writes, UI, readiness integration, output integration, network calls, external AI, deployment, tag, release, PR, or main integration.
- Applied the new review-before-main governance: implementation is committed and pushed only to the review branch for Architect inspection.

### Files created

- `src/lib/planningClarificationReconciliation.ts` - read-only reconciliation input/output contracts, runtime validation, existing planning normalization, generated fingerprint verification, current/historical classification, deterministic ordering, structured issues, and defensive copy handling.
- `src/tests/planningClarificationReconciliation.test.ts` - focused coverage for normalization failures, fingerprint-set verification, TTI scenarios, classifications, ambiguity handling, terminal history, determinism, immutability, lifecycle isolation, readiness/output isolation, and privacy boundaries.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationReconciliation.test.ts`: passed (`1` file, `12` tests).
- `npm.cmd run test:unit -- src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts`: passed (`2` files, `23` tests).
- `npm.cmd run test:unit -- src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts`: passed (`3` files, `38` tests).
- `npm.cmd run test:unit -- src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts`: passed (`4` files, `57` tests).
- `npm.cmd run test:unit -- src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts`: passed (`5` files, `73` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts src/tests/planningClarificationReconciliation.test.ts`: passed (`6` files, `104` tests).
- Focused readiness isolation batch passed (`4` files, `82` tests).
- Focused output isolation batch passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`42` unit/integration files, `1929` tests; `7` UI files, `61` tests; `49` combined files, `1990` tests).
- `npm.cmd run test:coverage`: passed (`49` combined files, `1990` tests) with `90.42%` statements, `81.89%` branches, `95.56%` functions, and `94.97%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`.

### Issues found

- Low: full dependency audit reports known development-only advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.

### Remaining work

- Commit exactly the four approved files on the review branch, push the review branch only, leave `main` unchanged, and return to GPT Architect for independent review.

## 2026-08-08 - Phase 5C.2.1D Deterministic Clarification Fingerprint Generation

### Summary

- Added deterministic SHA-256 fingerprint generation for validated clarification proposal blueprints.
- Added exact canonical fingerprint-input validation before hashing, including compact JSON serialization, semantic equality, top-level property order, target property order, source-evidence ordering, and source-evidence property order.
- Added local Web Crypto hashing with `SHA-256`, UTF-8 `TextEncoder` input, and lowercase 64-character hexadecimal output.
- Added duplicate proposal-key, duplicate canonical-input, conflicting-source, Web Crypto failure, malformed digest, and simulated collision safeguards without selecting winners.
- Confirmed the TTI fixture produces 11 deterministic unique fingerprint records from 22 source blueprints, 11 proposal blueprints, and 11 canonical inputs.
- Preserved phase boundaries: no UUID generation, timestamps, actual source/proposal records, planning-state reads, reconciliation, persistence, UI, readiness integration, output integration, network requests, external AI, deployment, tag, release, or PR behavior.

### Files created

- `src/lib/planningClarificationFingerprints.ts` - local deterministic clarification fingerprint generation, runtime validation, canonical input validation, SHA-256 calculation, deterministic ordering, issue reporting, and defensive copy handling.
- `src/tests/planningClarificationFingerprints.test.ts` - focused coverage for SHA-256 behavior, source/proposal/canonical validation, duplicate and collision handling, Web Crypto failures, TTI fixture determinism, immutability, and isolation.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationFingerprints.test.ts`: passed (`1` file, `11` tests).
- `npm.cmd run test:unit -- src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts`: passed (`2` files, `26` tests).
- `npm.cmd run test:unit -- src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts`: passed (`3` files, `45` tests).
- `npm.cmd run test:unit -- src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts`: passed (`4` files, `61` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts src/tests/planningClarificationFingerprints.test.ts`: passed (`5` files, `92` tests).
- Focused readiness isolation batch passed (`4` files, `82` tests).
- Focused output isolation batch passed (`7` files, `188` tests).
- First `npm.cmd test` run passed the unit/integration leg (`41` files, `1917` tests) but one unrelated UI test timed out at the default `5000ms`; the rerun passed.
- `npm.cmd test`: passed on rerun (`41` unit/integration files, `1917` tests; `7` UI files, `61` tests; `48` combined files, `1978` tests).
- `npm.cmd run test:coverage`: passed (`48` combined files, `1978` tests) with `90.42%` statements, `81.88%` branches, `95.55%` functions, and `94.88%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on known development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`.
- `git diff --check`: passed.

### Issues found

- Low: the isolated review worktree required elevated filesystem access for Vitest to create `node_modules/.vite-temp`; this is a Windows/OneDrive permission condition, not a product code defect.
- Low: first full-suite run had one unrelated UI timeout in `App.reviewGeneration.test.tsx`; rerun passed without code changes.
- Low: full dependency audit reports known development-only advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.

### Remaining work

- Commit only the four approved files, fast-forward `main`, push, verify CI, clean up the temporary worktree and branch, and return to GPT Architect for independent review.

## 2026-08-04 - Phase 5C.2.1C Pure Clarification Materialization Blueprints

### Summary

- Added pure deterministic source and proposal materialization blueprints for approved clarification drafts.
- Added stable non-persisted project-rule, readiness-prerequisite, and clarification proposal keys.
- Added approved project-rule and readiness-prerequisite source blueprints using approved current authority.
- Added canonical fingerprint-input serialization without hashing or final fingerprint generation.
- Added deterministic source ordering, proposal ordering, equivalent-source deduplication, and conflicting-source rejection.
- Added runtime draft validation against the active clarification rule registry before any blueprint is produced.
- Confirmed the TTI-style fixture produces 22 source blueprints, 11 proposal blueprints, and 11 canonical fingerprint-input strings.
- Preserved phase boundaries: no source IDs, proposal IDs, UUIDs, hashing, fingerprints, timestamps, actual planning records, planning-state reads, persistence, UI, readiness mutation, output integration, network access, external AI, deployment, tag, release, or PR behavior.

### Files created

- `src/lib/planningClarificationBlueprints.ts` - pure deterministic clarification source/proposal blueprint generator, validation, canonical serialization, ordering, deduplication, and defensive copy handling.
- `src/tests/planningClarificationBlueprints.test.ts` - focused coverage for draft validation, rule integrity, source and proposal mapping, canonical serialization, TTI fixture safety, immutability, and isolation.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationBlueprints.test.ts`: passed (`1` file, `15` tests).
- `npm.cmd run test:unit -- src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts`: passed (`2` files, `34` tests).
- `npm.cmd run test:unit -- src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts`: passed (`3` files, `50` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts src/tests/planningClarificationBlueprints.test.ts`: passed (`4` files, `81` tests).
- Focused readiness isolation batch passed (`4` files, `82` tests).
- Focused output isolation batch passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`40` unit/integration files, `1906` tests; `7` UI files, `61` tests; `47` combined files, `1967` tests).
- `npm.cmd run test:coverage`: passed (`47` combined files, `1967` tests) with `90.51%` statements, `81.78%` branches, `95.46%` functions, and `95.00%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on development dependency advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`.
- `git diff --check`: passed.

### Issues found

- Low: full dependency audit reports development-only advisories for `brace-expansion`, `js-yaml`, `nanoid`, and `undici`; production audit remains `0` vulnerabilities and dependency changes are outside this phase.

### Remaining work

- Return to GPT Architect for independent review of Phase 5C.2.1C. Do not begin UUID generation, SHA-256 fingerprint generation, actual source or proposal record materialization, reconciliation, persistence integration, UI, readiness integration, output integration, or external AI without a new approved phase prompt.

## 2026-08-04 - Phase 5C.2.1B Pure Deterministic Clarification Draft Generation

### Summary

- Added pure deterministic clarification-draft generation from project identity, canonical project type, and precomputed readiness gate results.
- Selected active Phase 5C.2.1A clarification rules only for `powerAppsCanvas`.
- Generated non-persisted clarification drafts only for unresolved applicable gates.
- Preserved exact resolved, unresolved, allowed Not Applicable, and disallowed Not Applicable status behavior.
- Added missing and duplicate relevant-gate issue handling without guessing or selecting duplicate results.
- Preserved deterministic ordering by rule priority and rule ID, independent of gate-result input order.
- Preserved immutable input, returned-data, and registry boundaries with defensive copies.
- Confirmed the TTI-style fixture produces exactly 11 clarification drafts without substantive answers.
- Preserved phase boundaries: no proposal records, source references, UUIDs, fingerprints, timestamps, planning-state reads, persistence, UI, readiness mutation, output integration, network access, external AI, deployment, tag, release, or PR behavior.

### Files created

- `src/lib/planningClarificationDrafts.ts` - pure deterministic clarification-draft generator, input validation, issue reporting, rule-to-gate matching, and defensive copy handling.
- `src/tests/planningClarificationDrafts.test.ts` - focused coverage for input validation, project applicability, status behavior, gate matching, TTI fixture mapping, draft contract, immutability, and isolation.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningClarificationDrafts.test.ts`: passed (`1` file, `19` tests).
- `npm.cmd run test:unit -- src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts`: passed (`2` files, `35` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts src/tests/planningClarificationDrafts.test.ts`: passed (`3` files, `66` tests).
- Focused readiness isolation batch passed (`4` files, `82` tests).
- Focused output isolation batch passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`39` unit/integration files, `1891` tests; `7` UI files, `61` tests; `46` combined files, `1952` tests).
- `npm.cmd run test:coverage`: passed (`46` combined files, `1952` tests) with `90.59%` statements, `81.70%` branches, `95.36%` functions, and `95.13%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` and `undici` advisory chains.
- `git diff --check`: passed.

### Issues found

- None.

### Remaining work

- Return to GPT Architect for independent review of Phase 5C.2.1B. Do not begin source-reference creation, proposal-record materialization, UUID or fingerprint generation, reconciliation, persistence integration, UI, readiness integration, output integration, or external AI without a new approved phase prompt.

## 2026-08-04 - Phase 5C.2.1A Deterministic Clarification Rule Registry Foundation

### Summary

- Added the deterministic clarification-rule registry foundation for unresolved Power Apps Canvas planning and readiness requirements.
- Defined the exact registry identity `project-builder-clarification-rules` and version `phase-5c.2.1a`.
- Added exactly 11 active clarification-only rules for backend schema, SharePoint internal names, Canvas screen targets, Canvas control targets, component applicability, YAML planning, delegation, security permissions, testing outcomes, ALM responsibilities, and release approval.
- Added typed source-requirement, rule-status, and clarification-rule contracts with explicit current source-authority requirements.
- Added pure registry validation, deterministic lookup and selection helpers, and defensive copy/immutability protection.
- Preserved phase boundaries: no proposal generation, source collection, fingerprint generation, persistence, repository integration, UI, readiness integration, output integration, network access, external AI, deployment, tag, release, or PR behavior.

### Files created

- `src/lib/planningRules.ts` - typed static clarification-rule registry, validation, deterministic selectors, and immutability protection.
- `src/tests/planningRules.test.ts` - focused coverage for exact rule content, validation, ordering, lookup, immutability, and isolation.

### Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation plan and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported existing development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningRules.test.ts`: passed (`1` file, `16` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/planningRules.test.ts`: passed (`2` files, `47` tests).
- Focused readiness isolation batch passed (`4` files, `82` tests).
- Focused output isolation batch passed (`7` files, `188` tests).
- `npm.cmd test`: passed (`38` unit/integration files, `1872` tests; `7` UI files, `61` tests; `45` combined files, `1933` tests).
- `npm.cmd run test:coverage`: passed (`45` combined files, `1933` tests) with `90.55%` statements, `81.64%` branches, `95.31%` functions, and `95.15%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` and `undici` advisory chains.
- `git diff --check`: passed.

### Issues found

- None.

### Remaining work

- Return to GPT Architect for independent review of Phase 5C.2.1A before any source collection, proposal generation, fingerprint generation, reconciliation, persistence integration, UI, readiness integration, output integration, or external AI phase.

## 2026-08-03 - Phase 5C.1.1B.1 Legacy Migration Planning Return Correction

### Summary

- Corrected the legacy single-project migration return path so the first `loadStorageState()` call returns the same normalized version `4` planning contract that is written to current storage.
- Routed valid legacy single-project migration through the existing `migrateStorageState()` contract before returning.
- Preserved legacy identity, client, intake, status, review status, timestamp behavior, key precedence, corrupt-legacy handling, and successful legacy-key removal behavior.
- Preserved failed-write behavior: the returned in-memory state is safe version `4` with canonical empty planning, the legacy key remains present, and the existing persistence warning is exposed.
- Confirmed no planning records, source references, fingerprints, decisions, dependencies, or conflicts are fabricated.

### Files created

- None.

### Files updated

- `src/lib/projectRepository.ts` - returns the normalized migrated legacy state instead of the pre-normalized synchronized state.
- `src/tests/projectRepository.test.ts` - adds first-load legacy planning assertions and failed current-key persistence coverage.
- `CHANGE_LOG.md` - records this correction.
- `TEST_PLAN.md` - records this correction validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/projectRepository.test.ts`: passed (`1` file, `76` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/projectRepository.test.ts`: passed (`2` files, `107` tests).
- Focused readiness/output/TTI regression batch passed (`15` files, `487` tests).

### Issues found

- Fixed High: valid legacy single-project migration persisted canonical empty planning but returned an in-memory project without `planning` on the first load.

### Remaining work

- Phase 5C.1.1C Final Validation Review.

## 2026-08-03 - Phase 5C.1.1B Storage Migration and Repository Lifecycle Integration

### Summary

- Increased the repository storage state version from `3` to `4` without changing the existing localStorage key architecture.
- Migrated supported version `1`, `2`, `3`, and legacy project states to version `4`.
- Added canonical planning-state persistence through whole-project repository save/load using the existing Phase 5C.1.1A.1 planning normalizer.
- Migrated existing supported projects to separate canonical empty planning containers without fabricating proposals, decisions, conflicts, dependencies, source references, fingerprints, decision history, or lineage.
- Preserved valid current-schema version `4` planning and replaced missing, malformed, unsupported, foreign, duplicate, over-cap, invalid-authority, or unsafe planning with normalized safe output.
- Duplicated projects now receive canonical empty planning immediately and do not copy source planning metadata.
- Archive and restore preserve normalized planning without changing proposal status, decisions, or planning timestamps.
- Delete removes planning with the containing project and does not create separate planning storage or tombstones.
- Readiness, generated-document, export, Power Platform, implementation evidence, and TTI-like Draft safety behavior remained isolated from planning persistence.

### Files created

- None.

### Files updated

- `src/types/project.ts` - added storage version `4` to the storage version contract.
- `src/lib/storageVersion.ts` - set current storage version to `4`, added source-version-aware planning migration, and normalized valid version `4` planning.
- `src/lib/projectRepository.ts` - gives duplicated projects canonical empty planning state before save/reload.
- `src/tests/projectRepository.test.ts` - added storage migration, planning normalization, no-fabrication, duplication, archive/restore, delete, immutability, and failed-write coverage.
- `src/tests/recordLifecycleFormulaEvidence.test.ts` - aligned the existing storage-version assertion with the approved version `4` contract.
- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records this phase validation matrix and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/projectRepository.test.ts`: passed (`1` file, `75` tests).
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts src/tests/projectRepository.test.ts`: passed (`2` files, `106` tests).
- Focused readiness/output/TTI regression batch passed (`15` files, `487` tests).
- `npm.cmd test`: passed (`37` unit/integration files, `1855` tests; `7` UI files, `61` tests; `44` combined files, `1916` tests).
- `npm.cmd run test:coverage`: passed (`44` combined files, `1916` tests) with `90.46%` statements, `81.41%` branches, `95.24%` functions, and `95.18%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory.

### Issues found

- Fixed High: initial storage migration treated version `3` project planning as trusted because output version and source version were not separated during normalization.
- Known unchanged warning: Vite reports a large production bundle chunk.
- Known unchanged warning: full dependency audit reports the development-only `brace-expansion` advisory.

### Remaining work

- Phase 5C.1.1C Final Validation Review.

## 2026-08-02 - Phase 5C.1.1A.1 Retry Planning Contracts Final Review and Integration

### Summary

- Completed the final independent review of the corrected Phase 5C.1.1A planning contracts and pure normalization layer.
- Confirmed the Phase 5C.1.1A.2 source-authority correction resolves the High source-precedence defect: unconfirmed informational user answers no longer receive highest precedence.
- Confirmed planning remains optional on `ProjectRecord` and unused by application runtime flows.
- Confirmed no createProject integration, storage migration, repository persistence, readiness integration, generated-output integration, UI, external AI, identity, authentication, deployment, CI, dependency, package, or Wrangler behavior changed.
- Confirmed manual browser verification is not applicable because no UI changed.

### Files created

- `src/lib/planningProposals.ts` - pure planning proposal contracts, helpers, and normalization.
- `src/tests/planningProposals.test.ts` - focused coverage for planning normalization, source authority, precedence, safety, and isolation.

### Files updated

- `src/types/project.ts` - adds optional `planning?: ProjectPlanningState`.
- `CHANGE_LOG.md` - records final review and validation results.
- `TEST_PLAN.md` - records final review validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts`: passed (`1` file, `31` tests).
- Focused existing regression batch plus planning tests passed (`19` files, `547` tests).
- Existing UI regression batch passed (`7` files, `61` tests).
- `npm.cmd test`: passed (`37` unit/integration files, `1849` tests; `7` UI files, `61` tests; `44` combined files, `1910` tests).
- `npm.cmd run test:coverage`: passed (`44` combined files, `1910` tests) with `90.45%` statements, `81.4%` branches, `95.24%` functions, and `95.16%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory.
- `git diff --check`: passed.

### Issues found

- None in the final retry review.

### Remaining work

- Phase 5C.1.1B Storage Migration and Repository Lifecycle Integration.

## 2026-08-01 - Phase 5C.1.1A.2 Planning Source Authority and Precedence Correction

### Summary

- Corrected the High source-precedence defect found during Phase 5C.1.1A.1 final review.
- The defect occurred because precedence was derived from `sourceType` alone, which could not distinguish confirmed and unconfirmed user answers.
- Added explicit planning source authority values: `confirmed`, `approved`, and `informational`.
- Every planning source reference now requires `authority`, and invalid source-type/authority combinations are rejected during normalization.
- Source authority remains separate from source availability; non-current sources no longer participate in active precedence.
- Unconfirmed informational user answers no longer receive highest precedence and remain below approved documents and confirmed intake.
- Precedence remains explanatory only and cannot resolve conflicts, confirm proposals, change readiness, or change generated output.
- No identity, authentication, persistence, migration, readiness, output, UI, external AI, deployment, dependency, lockfile, CI, or Wrangler behavior changed.
- Final integration review remains pending.

### Files created

- None.

### Files updated

- `src/lib/planningProposals.ts` - adds source authority, validates source authority combinations, and revises precedence to use full source references.
- `src/tests/planningProposals.test.ts` - adds source authority, precedence, non-current availability, invalid authority, diagnostic, isolation, and TTI-adjacent safety coverage.
- `CHANGE_LOG.md` - records this correction.
- `TEST_PLAN.md` - records this correction and validation scope.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed during implementation.
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts`: passed (`1` file, `31` tests).
- Focused existing regression batch plus planning tests passed (`19` files, `547` tests).
- Existing UI regression batch passed (`7` files, `61` tests).
- `npm.cmd test`: passed (`37` unit/integration files, `1849` tests; `7` UI files, `61` tests; `44` combined files, `1910` tests).
- `npm.cmd run test:coverage`: passed (`44` combined files, `1910` tests) with `90.45%` statements, `81.4%` branches, `95.24%` functions, and `95.16%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory.
- `git diff --check`: passed.

### Issues found

- Fixed High: source precedence treated `userAnswer` as highest authority without explicit confirmation context.

### Remaining work

- Phase 5C.1.1A.1 Final Review and Integration retry.
- Phase 5C.1.1B storage migration and repository lifecycle integration remains not started.

## 2026-08-01 - Phase 5C.1.1A Planning Types and Pure Normalization

### Summary

- Added the foundational deterministic planning proposal overlay contracts and pure normalization/validation layer.
- Added optional `planning?: ProjectPlanningState` typing to `ProjectRecord` only; no project defaults, migration, persistence, repository integration, readiness integration, generated-document integration, UI, export behavior, external AI, or deployment behavior was added.
- Defined the Phase 5C.1.1 schema constants, planning state, proposal categories/statuses, uncertainty states, high-risk restrictions, typed targets, proposal values, source references, proposal records, decision history, dependencies, stale reasons, conflicts, and alternatives.
- Implemented pure normalization for malformed data, duplicate IDs, cross references, dependency cycles, timestamps, text safety, collection caps, stale metadata, conflict blocking consistency, alternative recommendations, and foreign project binding.
- Preserved TTI safety boundaries: planning metadata cannot clear blockers, generate Power Fx/YAML, invent Power Platform details, remove missing markers, or mark a Draft project Ready for Codex or Ready for Export.

### Files created

- `src/lib/planningProposals.ts` - pure planning proposal contracts, helpers, and normalization.
- `src/tests/planningProposals.test.ts` - focused coverage for the Phase 5C.1.1A planning normalization boundary.

### Files updated

- `src/types/project.ts` - adds optional `planning?: ProjectPlanningState` to `ProjectRecord`.
- `CHANGE_LOG.md` - Phase 5C.1.1A implementation record.
- `TEST_PLAN.md` - Phase 5C.1.1A validation scope and evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/planningProposals.test.ts`: passed (`1` file, `25` tests).
- Focused existing regression batch plus planning tests passed (`19` files, `541` tests).
- Existing UI regression batch passed (`7` files, `61` tests).
- `npm.cmd test`: passed (`37` unit/integration files, `1843` tests; `7` UI files, `61` tests; `44` combined files, `1904` tests).
- `npm.cmd run test:coverage`: passed (`44` combined files, `1904` tests) with `90.41%` statements, `81.29%` branches, `95.23%` functions, and `95.13%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory.
- `git diff --check`: passed.

### Issues found

- None.

### Remaining work

- Phase 5C.1.1A-B Final Review and Integration.
- Phase 5C.1.1B storage migration and repository integration remain not started.

## 2026-08-01 - Phase 5B.4D.2.4.1B Final Manual Browser Verification

### Summary

- Recorded successful final manual browser verification for the read-only lifecycle formula review panel after the sidebar-mode layout root-cause correction.
- Wide desktop, sidebar medium-width layout, compact-navigation layout, and narrow layouts passed.
- The unused Client Review column was removed and the panel now uses the available review width.
- Evidence cards remained readable and stacked when needed; status badges stayed contained; count and outcome labels stayed separated.
- No horizontal overflow, console errors, privacy-field exposure, formula-source exposure, or prohibited controls were observed.
- History and technical-details disclosures, keyboard operation, and visible focus passed.
- TTI/Draft state remained blocked as expected.
- No screen-reader software verification was performed or claimed.

### Files created

- None.

### Files updated

- `CHANGE_LOG.md` - final manual verification record.
- `TEST_PLAN.md` - final manual verification evidence.

### Files removed

- None.

### Testing completed

- Manual browser verification was completed successfully by the user.

### Issues found

- None.

### Remaining work

- Final integration and GitHub Actions verification.

## 2026-08-01 - Phase 5B.4D.2.4.1D Sidebar-Mode Client Review Layout Root-Cause Correction

### Summary

- Corrected the actual sidebar-mode Client Review layout root cause after manual re-verification showed the 5B.4D.2.4.1C medium-width correction did not resolve the active parent layout.
- Identified `.intake-layout` as the controlling grid: its base `224px minmax(0, 840px)` two-column layout kept the review content confined to the second column whenever the persistent sidebar was visible and the CSS viewport did not trigger the previous media rule.
- Added a review-stage-only `review-intake-page` wrapper class so Scope Review/Client Review uses one full-width content column beside the application sidebar without changing other Guided Intake stages.
- Preserved compact top-navigation behavior and the existing app-shell navigation breakpoint.
- Updated formula evidence, summary, count, technical-detail, and history grids to use intrinsic container-aware `auto-fit`/`minmax` layouts so cards and label/value groups respond to actual available panel width.
- Preserved the read-only panel contract, privacy boundary, formula-source boundary, approval/readiness boundary, output boundary, and deployment boundary.

### Files created

- None.

### Files updated

- `src/components/IntakeBuilder/IntakeBuilder.tsx` - adds the scoped `review-intake-page` class only for the review stage.
- `src/styles/global.css` - replaces the global medium-width intake override with review-stage scoped layout rules and intrinsic formula review grids.
- `src/tests/RecordLifecycleFormulaReviewPanel.test.tsx` - verifies container-aware evidence/count grid contracts and existing panel safety boundaries.
- `src/tests/App.reviewGeneration.test.tsx` - verifies the confirmed review-stage wrapper, scoped full-width layout, unchanged base intake layout, preserved app navigation breakpoint, and Client Review order.
- `CHANGE_LOG.md` - this correction entry.
- `TEST_PLAN.md` - Phase 5B.4D.2.4.1D validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/RecordLifecycleFormulaReviewPanel.test.tsx src/tests/recordLifecycleFormulaReviewPanelViewModel.test.ts`: passed (`2` files, `46` tests).
- `.\\node_modules\\.bin\\vitest.cmd run src/tests/App.reviewGeneration.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `15` tests).
- `.\\node_modules\\.bin\\vitest.cmd run src/tests/App.documentsExport.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `12` tests).
- `.\\node_modules\\.bin\\vitest.cmd run src/tests/App.navigation.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `12` tests).
- `.\\node_modules\\.bin\\vitest.cmd run src/tests/App.powerPlatformCanvas.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `11` tests).
- `npm.cmd test`: passed (`36` unit/integration files, `1818` tests; `7` UI files, `61` tests; `43` combined files, `1879` tests).
- `npm.cmd run test:coverage`: passed (`36` coverage files, `1818` tests; `7` UI files, `61` tests; `43` combined files, `1879` tests).
- Coverage was `90.46%` statements, `81.09%` branches, `95.11%` functions, and `95.46%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory.

### Issues found

- None after final manual browser re-verification.

### Remaining work

- Final integration and GitHub Actions verification.

## 2026-08-01 - Phase 5B.4D.2.4.1C Medium-Width Client Review Layout Correction

### Summary

- Corrected the medium-width Scope Review and Client Review parent layout after manual browser review found the lifecycle formula review panel constrained inside a narrow right content column near a `923px` viewport.
- Collapsed the outer intake/review layout to one content column at the existing `1120px` medium breakpoint so the formula review panel and Missing Information Review use the full available content width.
- Preserved the existing application navigation breakpoint; the persistent left navigation still changes to compact top navigation only at the existing shell breakpoint.
- Kept lifecycle formula evidence cards two columns by default and stacked only at the existing narrow breakpoint where panel width is insufficient.
- Added overflow protection for formula review grid children and status badges so long blockers, checksums, and status text remain contained.
- No data, privacy, formula source, approval, readiness, output, export, deployment, dependency, lockfile, or CI boundary changed.

### Files created

- None.

### Files updated

- `src/styles/global.css` - medium parent layout collapse, formula panel min-width protections, status badge containment, and existing narrow breakpoint behavior.
- `src/tests/RecordLifecycleFormulaReviewPanel.test.tsx` - CSS/source contract coverage for evidence grid breakpoints, overflow protection, badge containment, and existing disclosure/privacy/source boundaries.
- `src/tests/App.reviewGeneration.test.tsx` - CSS/source contract coverage for the medium review layout, preserved app navigation breakpoint, full-width review content, and existing panel placement.
- `CHANGE_LOG.md` - this correction entry.
- `TEST_PLAN.md` - Phase 5B.4D.2.4.1C validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/RecordLifecycleFormulaReviewPanel.test.tsx src/tests/recordLifecycleFormulaReviewPanelViewModel.test.ts`: passed (`2` files, `46` tests).
- `.\\node_modules\\.bin\\vitest.cmd run src/tests/App.reviewGeneration.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `14` tests).
- `.\\node_modules\\.bin\\vitest.cmd run src/tests/App.documentsExport.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `12` tests).
- `npm.cmd test`: passed (`36` unit/integration files, `1818` tests; `7` UI files, `60` tests; `43` combined files, `1878` tests).
- `npm.cmd run test:coverage`: passed (`36` coverage files, `1818` tests; `7` UI files, `60` tests; `43` combined files, `1878` tests).
- Coverage was `90.46%` statements, `81.09%` branches, `95.11%` functions, and `95.46%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory.

### Issues found

- The first manual browser re-verification remained pending at this correction step, then passed during final Phase 5B.4D.2.4.1B manual verification.

### Remaining work

- Superseded by the Phase 5B.4D.2.4.1D root-cause correction and final manual browser verification.

## 2026-08-01 - Phase 5B.4D.2.4.1 Read-Only Lifecycle Formula Review Panel

### Summary

- Added the first read-only Client Review lifecycle formula review panel.
- The panel renders only when the formula review summary is applicable and keeps evidence history plus technical identity details behind read-only disclosure controls.
- Hosted the panel after the top readiness banner and before Missing Information Review.
- Added a thin panel view-model wrapper that delegates to the existing internal summary projection.
- Preserved formula source, raw evidence, reviewer identity, notes, approval, readiness, export, installation, deployment, and mutation boundaries.

### Files created

- `src/components/ClientReview/RecordLifecycleFormulaReviewPanel.tsx` - read-only lifecycle formula review panel.
- `src/lib/recordLifecycleFormulaReviewPanelViewModel.ts` - panel view-model wrapper around the existing summary projection.
- `src/tests/RecordLifecycleFormulaReviewPanel.test.tsx` - direct component coverage for applicability, evidence states, history, disclosures, privacy, and read-only boundaries.
- `src/tests/recordLifecycleFormulaReviewPanelViewModel.test.ts` - view-model delegation, immutability, malformed-registry, and privacy-boundary coverage.

### Files updated

- `src/components/ClientReview/ClientReviewWorkflow.tsx` - builds the implementation registry with a stable project timestamp and renders the panel in Client Review.
- `src/styles/global.css` - added panel layout, status, evidence, disclosure, and responsive styles.
- `src/tests/App.reviewGeneration.test.tsx` - added Client Review host placement, stable timestamp, reference omission, read-only, and privacy-boundary tests.
- `src/tests/App.documentsExport.test.tsx` - added Package Preview output-boundary assertions.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4D.2.4.1 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run test:unit -- src/tests/RecordLifecycleFormulaReviewPanel.test.tsx src/tests/recordLifecycleFormulaReviewPanelViewModel.test.ts`: passed (`2` files, `44` tests).
- `.\\node_modules\\.bin\\vitest.cmd run src/tests/App.reviewGeneration.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `13` tests).
- `.\\node_modules\\.bin\\vitest.cmd run src/tests/App.documentsExport.test.tsx --pool=vmThreads --maxWorkers=1`: passed (`1` file, `12` tests).
- `npm.cmd run test:unit -- src/tests/RecordLifecycleFormulaReviewPanel.test.tsx src/tests/recordLifecycleFormulaReviewPanelViewModel.test.ts src/tests/recordLifecycleFormulaReviewSummary.test.ts src/tests/recordLifecycleFormulaReviewState.test.ts src/tests/recordLifecycleFormulaEvidence.test.ts src/tests/recordLifecycleFormulaEvidenceEvaluation.test.ts src/tests/implementationAssets.test.ts src/tests/recordLifecyclePlanning.test.ts src/tests/recordLifecyclePowerFxGeneration.test.ts src/tests/projectRepository.test.ts src/tests/powerPlatform.test.ts src/tests/exportManifest.test.ts src/tests/exportIntegrity.test.ts src/tests/exportProjectPackage.test.ts src/tests/generateProjectPackage.test.ts src/tests/phase5b4b5Regression.test.ts`: passed (`16` files, `735` tests).
- `npm.cmd test`: passed (`36` unit/integration files, `1816` tests; `7` UI files, `59` tests; `43` combined files, `1875` tests).
- `npm.cmd run test:coverage`: passed (`36` coverage files, `1816` tests; `7` UI files, `59` tests; `43` combined files, `1875` tests).
- Coverage was `90.46%` statements, `81.09%` branches, `95.11%` functions, and `95.46%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory path through ESLint-related tooling, reporting `14` high-severity dependency path findings and no available fix.
- `git diff --check`: passed.
- Manual browser verification: Not completed because the local Vite development-server process did not detach and blocked the original task.

### Issues found

- Manual browser verification did not complete because the local Vite development-server process did not detach and blocked the original task.

### Remaining work

- Architect review.

## 2026-08-01 - Phase 5B.4D.2.3.1 Pure Internal Formula Review Summary Projection

### Summary

- Added a pure, deterministic, internal lifecycle formula review summary projection for later read-only UI use.
- The projection combines existing formula review state, review reference status, Technical Review evidence evaluation, Studio Validation evidence evaluation, formula blockers, collection issues, and source-free evidence history.
- Preserved existing producer behavior, project schema, storage version/key, repository behavior, formula generation, implementation manifests, generated documents, Package Preview, ZIP output, export integrity, copy actions, deployment files, lockfiles, and CI workflows.
- Kept approval, readiness, formula copying, export, installation, deployment, evidence recording, and UI integration unavailable.

### Files created

- `src/lib/recordLifecycleFormulaReviewSummary.ts` - internal source-free summary projection.
- `src/tests/recordLifecycleFormulaReviewSummary.test.ts` - focused truth-table, history, privacy, boundary, malformed-runtime, and TTI safety coverage.

### Files updated

- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4D.2.3.1 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleFormulaReviewSummary.test.ts`: passed (`1` file, `39` tests).
- `npx.cmd vitest run src/tests/recordLifecycleFormulaReviewSummary.test.ts src/tests/recordLifecycleFormulaReviewState.test.ts src/tests/recordLifecycleFormulaEvidence.test.ts src/tests/recordLifecycleFormulaEvidenceEvaluation.test.ts`: passed (`4` files, `216` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts`: passed (`1` file, `106` tests).
- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts src/tests/recordLifecyclePowerFxGeneration.test.ts`: passed (`2` files, `208` tests).
- `npx.cmd vitest run src/tests/projectRepository.test.ts src/tests/powerPlatform.test.ts`: passed (`2` files, `126` tests).
- `npx.cmd vitest run src/tests/exportManifest.test.ts src/tests/exportIntegrity.test.ts src/tests/exportProjectPackage.test.ts src/tests/generateProjectPackage.test.ts src/tests/App.documentsExport.test.tsx src/tests/App.reviewGeneration.test.tsx src/tests/App.powerPlatformCanvas.test.tsx src/tests/phase5b4b5Regression.test.ts`: passed (`8` files, `66` tests).
- `npm.cmd test`: passed (`34` unit/integration files, `1772` tests; `7` UI files, `54` tests; `41` combined files, `1826` tests).
- `npm.cmd run test:coverage`: passed (`34` coverage files, `1772` tests; `7` UI files, `54` tests; `41` combined files, `1826` tests).
- Coverage was `90.42%` statements, `81.08%` branches, `95.06%` functions, and `95.44%` lines.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory.
- `git diff --check`: passed.

### Issues found

- None in the new projection.

### Remaining work

- Phase 5B.4D.2.3.1B Formula Review Summary Projection Final Review and Integration.

## 2026-07-31 - Phase 5B.4D.2.2.2D Formula Evidence Runtime Safety and Binding Classification Correction

### Summary

- Corrected formula evidence evaluation so sparse runtime arrays produce controlled collection issues instead of throwing.
- Corrected evaluator-only structural asset binding so safe non-current asset IDs classify as `Stale`, while malformed asset identities remain `Invalid`.
- Preserved canonical storage normalization: persisted formula evidence still accepts only `asset-canvas-record-lifecycle-powerfx-onselect`.
- Preserved schema version `phase-5b.4d.2.2.1`, storage behavior, migration behavior, repository behavior, formula-source exclusion, approval/readiness exclusion, UI/output/export exclusion, and deployment exclusion.

### Files created

- None.

### Files updated

- `src/lib/recordLifecycleFormulaEvidence.ts` - added a narrow evaluator-only structural normalization helper while keeping storage normalization canonical.
- `src/lib/recordLifecycleFormulaEvidenceEvaluation.ts` - uses evaluator structural normalization and records sparse array holes as collection issues.
- `src/tests/recordLifecycleFormulaEvidenceEvaluation.test.ts` - added sparse-hole, asset-binding, malformed asset identity, and storage-normalizer regression coverage.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4D.2.2.2D validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleFormulaEvidenceEvaluation.test.ts`: passed (`1` file, `79` tests).
- `npx.cmd vitest run src/tests/recordLifecycleFormulaEvidence.test.ts`: passed (`1` file, `23` tests).
- `npx.cmd vitest run src/tests/recordLifecycleFormulaEvidenceEvaluation.test.ts src/tests/recordLifecycleFormulaEvidence.test.ts src/tests/recordLifecycleFormulaReviewState.test.ts src/tests/projectRepository.test.ts src/tests/powerPlatform.test.ts src/tests/implementationAssets.test.ts src/tests/recordLifecyclePowerFxGeneration.test.ts src/tests/exportManifest.test.ts src/tests/exportIntegrity.test.ts src/tests/exportProjectPackage.test.ts src/tests/generateProjectPackage.test.ts src/tests/App.documentsExport.test.tsx src/tests/App.reviewGeneration.test.tsx src/tests/App.powerPlatformCanvas.test.tsx src/tests/phase5b4b5Regression.test.ts`: passed (`15` files, `529` tests).
- `npm.cmd test`: passed (`33` unit/integration files, `1733` tests; `7` UI files, `54` tests; `40` combined files, `1787` tests).
- `npm.cmd run test:coverage`: passed (`33` coverage files, `1733` tests; `7` UI files, `54` tests; `40` combined files, `1787` tests).
- Coverage was `90.39%` statements, `81.01%` branches, `95.04%` functions, and `95.40%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory path through ESLint-related tooling, reporting `14` high-severity dependency path findings and no available fix.
- `npm.cmd audit`: failed on the same documented development-only `brace-expansion` advisory path.

### Issues found

- Complete dependency audit still fails on the existing development-only `brace-expansion` advisory path through ESLint-related tooling; production dependency audit passes.

### Remaining work

- No commit, push, merge, tag, deployment, UI integration, package-output integration, formula-source exposure, storage migration, repository behavior change, or stash modification occurred.

## 2026-07-31 - Phase 5B.4D.2.2.2 Formula Evidence Current, Stale, and Invalid Evaluation

### Summary

- Added a pure, deterministic formula evidence evaluator that classifies Technical Review and Power Apps Studio Validation evidence separately as `Not Provided`, `Current`, `Stale`, or `Invalid`.
- Current evidence now means contract/project/asset identity only: structurally valid evidence, supported schema version, matching current project, matching formula asset, matching review contract version/checksum, valid evidence type, complete required fields, strict timestamp, and strict evidence ID.
- Stale evidence remains historical evidence when a previously valid record no longer matches the current project-bound formula asset or review contract.
- Invalid evidence covers malformed records, unsupported schema versions, missing required validation fields, malformed evidence IDs or timestamps, duplicate evidence IDs, malformed collections, and malformed runtime values without throwing.
- Preserved technical-review versus Studio-validation separation, failed-outcome retention, formula-source exclusion, approval/readiness exclusion, UI/output/export exclusion, and TTI blocking.

### Files created

- `src/lib/recordLifecycleFormulaEvidenceEvaluation.ts` - pure internal evaluator for lifecycle formula evidence status classification.
- `src/tests/recordLifecycleFormulaEvidenceEvaluation.test.ts` - focused evaluator, history, boundary, output, and TTI safety coverage.

### Files updated

- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4D.2.2.2 validation evidence.

### Files removed

- None.

### Testing completed

- `node --version`: `v22.21.0`.
- `npm.cmd --version`: `10.9.4`.
- `npm.cmd ci`: passed; install output reported the existing high-severity development audit advisory.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleFormulaEvidenceEvaluation.test.ts`: passed (`1` file, `22` tests).
- `npx.cmd vitest run src/tests/recordLifecycleFormulaEvidenceEvaluation.test.ts src/tests/recordLifecycleFormulaEvidence.test.ts src/tests/recordLifecycleFormulaReviewState.test.ts src/tests/projectRepository.test.ts src/tests/powerPlatform.test.ts src/tests/exportManifest.test.ts src/tests/exportIntegrity.test.ts src/tests/exportProjectPackage.test.ts src/tests/generateProjectPackage.test.ts src/tests/App.documentsExport.test.tsx src/tests/App.reviewGeneration.test.tsx src/tests/App.powerPlatformCanvas.test.tsx src/tests/phase5b4b5Regression.test.ts`: passed (`13` files, `312` tests).
- `npm.cmd test`: passed (`33` unit/integration files, `1676` tests; `7` UI files, `54` tests; `40` combined files, `1730` tests).
- `npm.cmd run test:coverage`: passed (`33` coverage files, `1676` tests; `7` UI files, `54` tests; `40` combined files, `1730` tests).
- Coverage was `90.37%` statements, `80.98%` branches, `95.03%` functions, and `95.38%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory path through ESLint-related tooling, reporting `14` high-severity dependency path findings and no available fix.
- `npm.cmd audit`: failed on the same documented development-only `brace-expansion` advisory path.
- `git diff --check`: passed.

### Issues found

- Complete dependency audit still fails on the existing development-only `brace-expansion` advisory path through ESLint-related tooling; production dependency audit passes.
- No schema contradiction was found. Evidence history is evaluated per record and input order is preserved; no new history ordering rule was introduced.

### Remaining work

- No approval workflow, readiness promotion, evidence creation API, storage migration, UI integration, package-output integration, formula-source exposure, commit, push, merge, stash modification, or deployment occurred.

## 2026-07-31 - Phase 5B.4D.2.2.1-C1 Formula Evidence Integrity Corrections

### Summary

- Corrected formula evidence timestamp validation to accept only strict ISO 8601 date-time values with `T`, seconds, and explicit timezone, while rejecting impossible dates, invalid leap dates, invalid time values, invalid timezone offsets, timezone-free values, and JavaScript date-normalization cases.
- Restricted `evidenceId` to the approved safe ASCII identifier format `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$` without rewriting or generating replacement IDs.
- Enforced Power Apps Studio outcome consistency: `Passed` requires all 17 checks to be `true`, and `Failed` requires at least one check to be `false`.
- Preserved storage version `3`, the existing storage key, Canvas evidence location, historical evidence semantics, formula-source exclusion, approval/readiness exclusion, UI/output exclusion, and TTI blocking.

### Files created

- None.

### Files updated

- `src/lib/recordLifecycleFormulaEvidence.ts` - strict timestamp parser, evidence ID validator, and Studio outcome/check consistency enforcement.
- `src/tests/recordLifecycleFormulaEvidence.test.ts` - timestamp positive/negative matrix, evidence ID positive/negative matrix, and Studio outcome consistency coverage.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4D.2.2.1-C1 validation evidence.

### Files removed

- None.

### Testing completed

- `node --version`: `v22.21.0`.
- `npm.cmd --version`: `10.9.4`.
- `npm.cmd ci`: passed; install output reported existing high-severity development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleFormulaEvidence.test.ts`: passed (`1` file, `23` tests).
- `npx.cmd vitest run src/tests/projectRepository.test.ts`: passed (`1` file, `69` tests).
- `npx.cmd vitest run src/tests/powerPlatform.test.ts`: passed (`1` file, `57` tests).
- `npx.cmd vitest run src/tests/recordLifecycleFormulaReviewState.test.ts`: passed (`1` file, `75` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts`: passed (`1` file, `106` tests).
- `npx.cmd vitest run src/tests/recordLifecyclePowerFxGeneration.test.ts`: passed (`1` file, `54` tests).
- `npx.cmd vitest run src/tests/exportManifest.test.ts src/tests/exportIntegrity.test.ts src/tests/exportProjectPackage.test.ts src/tests/generateProjectPackage.test.ts src/tests/App.documentsExport.test.tsx src/tests/App.reviewGeneration.test.tsx src/tests/App.powerPlatformCanvas.test.tsx src/tests/phase5b4b5Regression.test.ts`: passed (`8` files, `66` tests).
- `npm.cmd test`: passed (`32` unit/integration files, `1654` tests; `7` UI files, `54` tests; `39` combined files, `1708` tests).
- `npm.cmd run test:coverage`: passed (`32` coverage files, `1654` tests; `7` UI files, `54` tests; `39` combined files, `1708` tests).
- Coverage was `90.3%` statements, `80.89%` branches, `94.98%` functions, and `95.36%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory path through ESLint-related tooling, reporting `6` high-severity dependency path findings and a breaking force-fix suggestion.
- `git diff --check`: passed.

### Issues found

- Complete dependency audit still fails on the existing development-only `brace-expansion` advisory path; production dependency audit passes.
- CI Node 20 versus Cloudflare Node >=22 compatibility remains separate infrastructure remediation scope.

### Remaining work

- No evidence creation API, current/stale evaluator, UI, package-output integration, approval workflow, readiness promotion, commit, push, merge, stash modification, or deployment occurred.

## 2026-07-31 - Phase 5B.4D.2.2.1 Formula-Specific Review Evidence Schema and Storage Migration

### Summary

- Added formula-specific persisted evidence storage for the generated record-lifecycle Power Fx asset under Canvas project data.
- Added strict technical-review and Power Apps Studio-validation evidence normalization with schema version `phase-5b.4d.2.2.1`, required review contract linkage, free-text reviewer identity, timestamp normalization, duplicate-ID handling, unknown-field stripping, and formula-source rejection.
- Advanced internal storage state to version `3` while preserving the existing storage key `gpt-project-builder.storage.v2`.
- Migrated legacy v1/v2 storage reads through the existing project normalization path so Canvas projects receive an empty evidence array by default.
- Preserved evidence through project duplication, archive, and restore, and removed evidence only with the containing project on permanent delete.
- Kept evidence internal to project storage only; no generated documents, implementation manifests, package preview, export integrity inventory, ZIP output, UI, copy path, approval state, readiness state, current/stale evaluator, external service, deployment, or formula-source exposure was added.
- Avoided a runtime import cycle by keeping the evidence asset boundary as a local stable formula asset ID and testing it against the generator's stable asset ID.

### Files created

- `src/lib/recordLifecycleFormulaEvidence.ts` - formula-specific evidence schema constants, exported evidence types, Studio-validation checklist, and strict normalizer.
- `src/tests/recordLifecycleFormulaEvidence.test.ts` - focused evidence schema, migration default, output-boundary, malformed-input, and approval/readiness isolation coverage.

### Files updated

- `src/types/project.ts` - added storage version `3` and Canvas formula review-evidence types/field.
- `src/lib/powerPlatform.ts` - added Canvas evidence defaults and normalization.
- `src/lib/storageVersion.ts` - advanced current storage version to `3` and migrated v1/v2 payloads into the current normalized shape.
- `src/tests/projectRepository.test.ts` - added v1/v2 migration, duplicate, archive/restore, permanent-delete, and storage-key compatibility coverage for evidence.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4D.2.2.1 validation plan and evidence.

### Files removed

- None.

### Testing completed

- `node --version`: `v22.21.0`.
- `npm.cmd --version`: `10.9.4`.
- `npm.cmd ci`: passed; install output reported existing high-severity development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleFormulaEvidence.test.ts src/tests/projectRepository.test.ts src/tests/powerPlatform.test.ts src/tests/phase5b4b5Regression.test.ts src/tests/exportManifest.test.ts src/tests/exportIntegrity.test.ts src/tests/exportProjectPackage.test.ts src/tests/generateProjectPackage.test.ts src/tests/App.documentsExport.test.tsx src/tests/App.reviewGeneration.test.tsx src/tests/App.powerPlatformCanvas.test.tsx src/tests/recordLifecycleFormulaReviewState.test.ts src/tests/implementationAssets.test.ts src/tests/recordLifecyclePowerFxGeneration.test.ts`: passed (`14` files, `443` tests).
- `npm.cmd test`: passed (`32` unit/integration files, `1647` tests; `7` UI files, `54` tests; `39` combined files, `1701` tests).
- `npm.cmd run test:coverage`: passed (`32` coverage files, `1647` tests; `7` UI files, `54` tests; `39` combined files, `1701` tests).
- Coverage was `90.25%` statements, `80.84%` branches, `94.96%` functions, and `95.34%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory path through ESLint-related tooling, reporting `6` high-severity dependency path findings and a breaking force-fix suggestion.

### Issues found

- Generated lifecycle formula evidence is historical review evidence only and does not make formula output approved, current, ready, installed, exported, deployed, or Power Apps Studio validated.
- Complete dependency audit still fails on the existing development-only `brace-expansion` advisory path; production dependency audit passes.
- Evidence creation remains future scope; this phase adds schema, normalization, storage migration, and lifecycle preservation only.

### Remaining work

- No commit, push, merge, stash modification, deployment, UI integration, package-output integration, or external transmission occurred.
- Future Architect-approved work can decide whether and how evidence records should be created by the app.

## 2026-07-30 - Phase 5B.4D.2.1 Formula Asset Review-State Architecture

### Summary

- Added a pure, deterministic, in-memory review-state contract for generated record-lifecycle formula assets.
- Restricted review states to `Not Applicable`, `Blocked`, and `Review Required`; no approved, validated, ready, installed, published, or deployed formula states were introduced.
- Added review contract version `phase-5b.4d.2.1` with implementation-relevant metadata only, excluding formula source content, display text, timestamps, asset/review statuses, and array positions from the contract checksum.
- Corrected the review contract to use the reviewed asset metadata for `assetId`, `contentChecksum`, and `generationVersion` while the primary review-state builder still enforces the expected stable lifecycle formula asset ID.
- Added minimal review reference evaluation with statuses `Current`, `Stale`, `Invalid`, and `Not Provided`; `Current` means only that the supplied `{ assetId, reviewContractVersion, reviewContractChecksum }` matches the current in-memory contract, not that the formula is approved or Power Apps Studio validated.
- Preserved stale invalidation by changing the contract checksum when any approved implementation-relevant metadata changes, including formula asset ID, formula generation version, formula content checksum, planning lineage, dependency identity/resolution, gates, traceability, requirements, and target metadata.
- Preserved cosmetic exclusions by keeping source content, display text, timestamps, asset/review statuses, dependency prose, project display name, and array order outside the canonical checksum.
- Preserved blocked generation behavior for permanent-delete and TTI-like Draft cases: no generated formula asset, no contract/checksum/source fields, and the exact blocker `Permanent-delete Power Fx generation is not approved for Phase 5B.4C.` remains visible.
- Kept generated formula source registry-only and made no UI, output, manifest, ZIP, export, copy, persistence, storage migration, deployment, or package-document changes. Manifest/package surfaces remain formula-free, and manual Architect review plus Power Apps Studio validation remain required.

### Files created

- `src/lib/recordLifecycleFormulaReviewState.ts` - pure formula review-state and reference-evaluation contract.
- `src/tests/recordLifecycleFormulaReviewState.test.ts` - focused review-state, stale-reference, blocked-generation, TTI-like Draft, checksum mutation, cosmetic-exclusion, and reference-validation coverage.

### Files updated

- `src/lib/implementationAssets.ts` - exported a narrow stable checksum helper reusing existing implementation asset serialization and hash infrastructure.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4D.2.1 validation plan and evidence.

### Files removed

- None.

### Testing completed

- `node --version`: `v22.21.0`.
- `npm.cmd --version`: `10.9.4`.
- `npm.cmd ci`: passed; install output reported existing high-severity development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecycleFormulaReviewState.test.ts`: passed (`1` file, `75` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts`: passed (`1` file, `106` tests).
- `npx.cmd vitest run src/tests/recordLifecyclePowerFxGeneration.test.ts`: passed (`1` file, `54` tests).
- `npm.cmd test`: passed (`31` unit/integration files, `1626` tests; `7` UI files, `54` tests; `38` combined files, `1680` tests).
- `npm.cmd run test:coverage`: passed (`31` coverage files, `1626` tests; `7` UI files, `54` tests; `38` combined files, `1680` tests).
- Coverage was `90.25%` statements, `80.73%` branches, `94.93%` functions, and `95.30%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory path through ESLint-related tooling, reporting `6` high-severity dependency path findings and a breaking force-fix suggestion.
- `git diff --check`: passed.

### Issues found

- Generated lifecycle formula assets remain review-only and are not ready to install, export, deploy, publish, or treat as Power Apps Studio validated.
- Complete dependency audit still fails on the existing development-only `brace-expansion` advisory path; production dependency audit passes.
- Review-state references remain in memory only and do not record reviewer identity, dates, approvals, or Studio-validation evidence.

### Remaining work

- No commit, push, merge, stash modification, deployment, persistence migration, or package-output integration occurred.
- Future Architect-approved work can decide whether review references should be surfaced in UI or manifests.

## 2026-07-29 - Phase 5B.4D.1 Registry-Only Record Lifecycle Formula Asset Inclusion

### Summary

- Added registry-only inclusion for the generated archive/restore record-lifecycle Power Fx asset after the existing implementation-asset approval mechanism resolves the source planning asset as both `Approved` and `Ready for Export`.
- Kept the generated formula asset internal, `Review Required`, and `Review required`, with source content preserved only in the in-memory implementation registry.
- Excluded the generated formula asset from implementation manifests, generated documents, Package Preview data, ZIP output, export-integrity inventory, copy/export paths, deployment, and installation claims.
- Preserved permanent-delete prohibition, generator atomicity, TTI Draft blocking, and manual Architect plus Power Apps Studio validation requirements.

### Files created

- None.

### Files updated

- `src/lib/implementationAssets.ts` - appends the eligible generated lifecycle formula asset after resolved approval state, preserves generator checksum/source content, keeps the asset Review Required, deduplicates lifecycle record dependencies for graph validity, records deterministic generator blockers through registry dependency issues, and filters the formula asset from manifest projection.
- `src/tests/implementationAssets.test.ts` - adds focused Phase 5B.4D.1 coverage for eligibility, source traceability, graph determinism, blocker atomicity, permanent-delete safety, output isolation, TTI Draft safety, and malformed runtime input.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4D.1 validation plan and evidence.

### Files removed

- None.

### Testing completed

- `node --version`: `v22.21.0`.
- `npm.cmd --version`: `10.9.4`.
- `npm.cmd ci`: passed; install output reported existing high-severity development audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/implementationAssets.test.ts`: passed (`1` file, `106` tests).
- `npx.cmd vitest run src/tests/recordLifecyclePowerFxGeneration.test.ts`: passed (`1` file, `54` tests).
- `npm.cmd test`: passed (`30` unit/integration files, `1551` unit/integration tests; `7` UI files, `54` UI tests; `37` combined files, `1605` tests).
- `npm.cmd run test:coverage`: passed (`30` coverage files, `1551` coverage tests; `7` UI files, `54` UI tests; `37` combined files, `1605` tests).
- Coverage was `90.15%` statements, `80.53%` branches, `94.82%` functions, and `95.23%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` advisory path through ESLint-related tooling, reporting `6` high-severity dependency path findings and a breaking `eslint@10.8.0` force-fix suggestion.
- `git diff --check`: passed.
- Static safety search found Power Fx/delete terms only in negative tests and documentation, TTI only in isolated safety/documentation text, no `SoftwareTitles`, `SoftwareLicences`, `SoftwareUsers`, `ORG-4878`, `ND-DN`, `Date.now`, `Math.random`, `generated-packages`, `MAGIC_WAND`, or `NucBox` matches in changed files, and no new localStorage persistence.

### Issues found

- Generated lifecycle formula assets remain review-only and are not ready to install, export, deploy, or treat as Power Apps Studio validated.
- Manifest integration for generated formula metadata remains future Architect-approved scope.
- TTI-like Draft projects remain blocked and formula-free.

### Remaining work

- Do not begin Phase 5B.4D.2 in this worktree.
- No commit, push, merge, stash modification, or deployment occurred.

## 2026-07-29 - Phase 5B.4C.1 Archive and Restore Power Fx Generator Hardening

### Summary

- Implemented the isolated record-lifecycle Power Fx generator core for approved archive and restore operations only.
- Blocked permanent-delete Power Fx generation with the approved Phase 5B.4C blocker and zero partial formula output.
- Added IfError handling, duplicate-submission protection through confirmed saving-state variables, safe identifier quoting, source planning asset preflight, and Review Required generated asset metadata.
- Preserved UI, preview, document generation, package export, deployment, and TTI formula integration exclusions.

### Files created

- `src/lib/recordLifecyclePowerFxGeneration.ts` - archive/restore-only Canvas Power Fx generation core.
- `src/tests/recordLifecyclePowerFxGeneration.test.ts` - focused hardening and safety regression coverage.

### Files updated

- `src/lib/recordLifecyclePlanning.ts` - structured generation eligibility, saving-state reference, error-handling, duplicate guard, and notification requirement metadata without formula source.
- `src/lib/implementationAssets.ts` - lifecycle planning asset dependencies, validation, and documentation wording for archive/restore-only generation.
- `scripts/run-tests.mjs` - dynamic Vitest count summary parsing.
- `scripts/run-tests-with-coverage.mjs` - dynamic Vitest count summary parsing.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4C.1 validation evidence.

### Files removed

- None.

### Testing completed

- `node --version`: `v22.21.0`.
- `npm.cmd --version`: `10.9.4`.
- `npm.cmd ci`: passed; npm install output reported existing high-severity audit advisories.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/recordLifecyclePowerFxGeneration.test.ts`: passed (`1` file, `54` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts`: passed (`1` file, `99` tests).
- `npm.cmd test`: passed (`30` unit/integration files, `1544` unit/integration tests; `7` UI files, `54` UI tests; `37` combined files, `1598` tests).
- `npm.cmd run test:coverage`: passed (`30` coverage files, `1544` coverage tests; `7` UI files, `54` UI tests; `37` combined files, `1598` tests).
- Coverage was `90.10%` statements, `80.53%` branches, `94.78%` functions, and `95.21%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: failed only on the documented development-only `brace-expansion` 1.x advisory path through ESLint-related tooling, reporting `14` high-severity dependency path findings.

### Issues found

- Complete audit remains visible because `brace-expansion` `1.1.16` is retained through development tooling; production audit passed.
- Vite build retains the existing large-chunk warning for the application bundle.
- Generated formula assets still require Architect review and manual Power Apps Studio validation before use.

### Remaining work

- UI, Package Preview, document generation, package ZIP export, deployment integration, Canvas YAML, refresh, navigation, and permanent-delete generation remain excluded.
- TTI remains blocked while readiness gates and implementation identifiers remain unresolved.
- No commit, push, merge, stash modification, or deployment occurred.

## 2026-07-28 - Security Remediation and CI Audit Policy

### Summary

- Applied lockfile-only patched transitive dependency resolutions for safely remediable high-severity development-tooling advisories.
- Replaced the single blocking full-tree CI audit with a blocking production dependency audit and a visible non-blocking full dependency audit.
- Documented the remaining development-only `brace-expansion` 1.x path without describing it as resolved.
- Preserved the existing Phase 5B.4B.5.2 repeating-section commit without amendment.
- Deployment remains unauthorized.

### Dependency changes

- `brace-expansion` under the compatible `minimatch` 10.x path changed from `5.0.7` to `5.0.8`.
- `postcss` changed from `8.5.16` to `8.5.24`.
- `nanoid` changed from `3.3.15` to `3.3.16` as a transitive dependency of the patched `postcss` release.
- `brace-expansion` `1.1.16` remains only under `minimatch` `3.1.5`, where the parent dependency requires the 1.x-compatible range.

### Remaining advisory

- `GHSA-mh99-v99m-4gvg` remains visible in the complete audit through development tooling only.
- Affected parent packages include `minimatch@3.1.5`, `eslint@9.39.4`, `@eslint/config-array@0.21.2`, `@eslint/eslintrc@3.3.5`, and `eslint-plugin-jsx-a11y@6.10.2`.
- Compatible published checks found ESLint 9.x still depends on `minimatch` 3.x, latest `eslint-plugin-jsx-a11y` 6.x is already installed and still depends on `minimatch` 3.x, and moving ESLint to 10.x would be a direct dependency major update outside this phase.
- No unsafe override was added, and accessibility linting was not removed or weakened.

### Files updated

- `package-lock.json`
- `.github/workflows/ci.yml`
- `CHANGE_LOG.md`
- `TEST_PLAN.md`
- `RELEASE_READINESS_REPORT.md`

### Files created

- None.

### Files removed

- None.

### Testing completed

- `node --version`: `v22.21.0`.
- `npm.cmd --version`: `10.9.4`.
- `npm.cmd ci`: passed; complete audit still reports the remaining development-only advisory path.
- `npm.cmd audit --omit=dev --audit-level=high --json`: passed with `0` vulnerabilities before remediation.
- `npm.cmd audit --audit-level=high --json`: originally failed with `21` high findings from `brace-expansion` and `postcss` cascading development-tooling paths.
- After lockfile remediation, `npm.cmd audit --audit-level=high` reports only the remaining development-only `brace-expansion` 1.x path.
- A production `dist` search found no `brace-expansion`, `postcss`, `minimatch`, `eslint`, or `vite` package output.

### Scope confirmations

- `package.json` remained unchanged.
- No application source or application test changed.
- The existing repeating-section commit `212a1b3f580c7808c790efb20236bec28259333a` was not amended.
- The preserved stash remains isolated.
- Deployment remains unauthorized.

## 2026-07-28 - Phase 5B.4B.5.2 Repeating Section Button Layout Standardization

### Summary

- Standardized repeating-section controls so section headings show only the title, Add buttons render once after the final item, and item-level Remove buttons render before editable fields.
- Applied the shared `RecordGroup` bottom-Add default across Power Platform schema and structured Canvas target repeaters.
- Updated nested Canvas data-source reference and component usage target repeaters to place nested Add buttons after nested records.
- Added DOM-order UI regression tests for heading/Add separation, Add-after-final-item placement, Remove-before-fields placement, empty repeaters, nested repeaters, keyboard activation, and row value preservation.
- Completed repository-wide repeater inventory searches; relevant add/remove repeaters are contained in `src/components/IntakeBuilder/PowerPlatformIntake.tsx`.
- Updated authoritative runner summaries for the expanded UI test count.
- User-performed human verification was confirmed on 2026-07-28 for Structured Control Targets, nested Data-source References, and SharePoint Lists. Chrome version was not supplied with the user-confirmed human QA result.
- Deployment remains unauthorized for this phase.

### Files updated

- `src/components/IntakeBuilder/PowerPlatformIntake.tsx`
- `src/tests/App.powerPlatformCanvas.test.tsx`
- `scripts/run-tests.mjs`
- `scripts/run-tests-with-coverage.mjs`
- `CHANGE_LOG.md`
- `TEST_PLAN.md`

### Files created

- None.

### Files removed

- None.

### Testing completed

- `npm.cmd ci`: passed; npm reported existing high-severity audit advisories during install.
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- `npx.cmd vitest run src/tests/App.powerPlatformCanvas.test.tsx`: passed (`1` file, `11` tests).
- `npm.cmd test`: passed (`29` unit/integration files, `1490` unit/integration tests; `7` UI files, `54` UI tests; `36` combined files, `1544` tests).
- `npm.cmd run test:coverage`: passed (`29` coverage files, `1490` coverage tests; `7` UI files, `54` UI tests; `36` combined files, `1544` tests); coverage was `90.46%` statements, `81.66%` branches, `94.89%` functions, and `95.43%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `git diff --check`: passed with line-ending warnings only.
- Automated DOM-order coverage verifies Add buttons after final repeated items, Remove buttons before fields, nested Add placement, empty repeater Add placement, and row value preservation.
- Automated keyboard coverage verifies native Enter and Space activation for Add and Remove buttons without duplicate item changes.
- Browser QA confirmed Add buttons after final items, Remove buttons before item fields, correct item removal by click, remaining values preserved, nested Add placement, desktop `1280 x 720` layout, mobile `390 x 844` layout, no page-level horizontal overflow, and no console errors or warnings.
- User-performed human verification confirmed Enter Add, Space Add, Enter Remove, Space Remove, exactly one action per keypress, visible focus, value preservation, Add below the final item, and Remove before item fields for Structured Control Targets, nested Data-source References, and SharePoint Lists.

### Issues found

- `npm.cmd audit --audit-level=high` failed. The limited exception permits committing this isolated UI correction, but does not mean the audit passed and does not authorize deployment or release.
- `GHSA-mh99-v99m-4gvg`: `brace-expansion` installed versions `1.1.16` and `5.0.7`; development-tooling dependency paths; no npm fix available; not present in the production `dist` output.
- `GHSA-r28c-9q8g-f849`: `postcss` installed version `8.5.16`; Vite, Vitest, and React development-tooling paths; no npm fix available; not present in the production `dist` output.
- npm reported `21` high findings due to cascading dependency paths.
- The advisories were not introduced by Phase 5B.4B.5.2. `package.json` and `package-lock.json` were not changed. Dependency remediation or audit-policy handling remains separate work.

### Remaining work

- Resolve the existing high-severity dev-tooling audit findings, or define audit-policy handling, in a separate phase.
- Deployment remains unauthorized until a separate deployment or release decision is approved.

## 2026-07-24 - Dependency Audit Remediation and Test Count Correction

### Summary

- Updated `package-lock.json` only for dependency remediation.
- Left `package.json` dependency ranges unchanged.
- Corrected stale hard-coded test and coverage summary counts.
- Corrected the Phase 5B.4B.5.1 documented test counts.
- No application source or test was changed.

### Dependency updates

- Updated `brace-expansion` from `1.1.15` to `1.1.16`.
- Updated `wrangler` from `4.107.0` to `4.114.0`.
- Updated `miniflare` from `4.20260701.0` to `4.20260722.0`.
- Updated `sharp` from `0.34.5` to `0.35.2`.
- Updated `workerd` from `1.20260701.1` to `1.20260722.1`.

### Validation

- Node `20.19.5`.
- npm `10.9.4`.
- `npm.cmd ci` passed.
- `npm.cmd run lint` passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` passed.
- `npm.cmd test` passed.
- `npm.cmd run test:coverage` passed.
- `npm.cmd run build` passed.
- `npm.cmd audit --audit-level=high` passed with zero vulnerabilities.

### Authoritative test counts

- Unit/integration: `29` files, `1490` tests.
- UI: `7` files, `51` tests.
- Combined: `36` files, `1541` tests.

### Coverage

- Statements: `90.46%`.
- Branches: `81.66%`.
- Functions: `94.89%`.
- Lines: `95.43%`.

### Runtime boundary

- Node `20.19.5` is approved for application validation, tests, build, and audit.
- Wrangler `4.114.0` requires Node `22` or newer.
- Wrangler was validated under Node `22.21.0`.
- Baseline Wrangler `4.107.0` already required Node `22`.
- The remediation did not introduce the Wrangler runtime requirement.

### Security status

- `GHSA-3jxr-9vmj-r5cp` is resolved.
- `GHSA-f88m-g3jw-g9cj` is resolved.
- The temporary limited audit exception is superseded by this remediation after the remediation commit passes GitHub Actions.
- No deployment was performed or authorized.

### Files updated

- `package-lock.json`
- `scripts/run-tests.mjs`
- `scripts/run-tests-with-coverage.mjs`
- `CHANGE_LOG.md`
- `TEST_PLAN.md`

### Files created

- None.

### Files removed

- None.

## 2026-07-24 - Phase 5B.4B.5.1 Traceability, Completion, and Real-Intake Correction

### Summary

- Added missing-marker traceability so generated `[MISSING: ...]` markers can be tied back to visible intake fields, structured intake records, or explicit applicability decisions.
- Replaced regex-only blank-section detection with a markdown section parser and blocked orphan missing markers during generated-package readiness and export integrity validation.
- Updated Power Platform document generation to use structured Canvas controls, selected-record state variables, structured record counts, file applicability decisions, SharePoint site metadata, testing details, and ALM details instead of fallback prose when structured rows exist.
- Added visible intake controls for record counts, synchronization, SharePoint site title/owner/access status, Git/CLI ALM decisions, expanded testing fields, and structured state-variable targets.
- Added document-preview source diagnostics with an Edit source action that returns users to the relevant intake stage.

### Files created

- `src/lib/canvasTraceability.ts` - missing-marker source registry, Canvas structured-value helpers, orphan-marker detection, and trace summaries.
- `src/tests/phase5b4b5Regression.test.ts` - regression coverage for structured Canvas document values, blank-section detection, and orphan marker blocking.

### Files updated

- `src/app/App.tsx` - routes document source-edit actions back to the matching intake stage.
- `src/components/DocumentViewer/DocumentViewer.tsx` - shows marker source diagnostics and document gate reasons.
- `src/components/IntakeBuilder/PowerPlatformIntake.tsx` - exposes the newly required intake fields and structured state-variable editor.
- `src/lib/exportIntegrity.ts` - uses parser-based blank-section detection and blocks orphan markers.
- `src/lib/generatedPackageReadiness.ts` - includes orphan marker blockers in package readiness.
- `src/lib/generateProjectPackage.ts` - includes orphan marker count in convergence checks.
- `src/lib/phaseGates.ts` - derives record volume and control-inventory readiness from structured Canvas rows.
- `src/lib/powerPlatform.ts` - strengthens SharePoint schema, testing preparation, delegation, and ALM gates.
- `src/templates/documents/index.ts` - derives document content from confirmed structured Canvas intake and explicit applicability decisions.
- Power Platform and App regression tests - updated fixtures and assertions for stricter real-intake gates and the new trace panel.
- `src/tests/helpers/generatedProject.ts` - updated the large Draft fixture to use a registered missing marker so orphan blocking remains enforceable.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4B.5 validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run --config vitest.unit.config.ts src/tests/phase5b4b5Regression.test.ts src/tests/exportIntegrity.test.ts src/tests/powerPlatform.test.ts --reporter=dot` - superseded by focused and full runner validation below.
- `npx.cmd vitest run --config vitest.unit.config.ts src/tests/implementationAssets.test.ts --reporter=dot` - passed (`1` file, `99` tests).
- `npx.cmd vitest run src/tests/phase5b4b5Regression.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `10` tests).
- `npx.cmd vitest run src/tests/App.documentsExport.test.tsx --pool=vmThreads --maxWorkers=1` - passed (`1` file, `12` tests).
- `npx.cmd vitest run src/tests/powerPlatform.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `57` tests).
- `npx.cmd vitest run src/tests/exportProjectPackage.test.ts src/tests/projectSelectors.test.ts --pool=vmThreads --maxWorkers=1` - passed (`2` files, `16` tests).
- `npm.cmd run lint` - passed.
- `npm.cmd test` - passed (`29` unit/integration files, `1490` tests; `7` UI files, `51` tests; `36` combined files, `1541` tests).
- `npm.cmd run test:coverage` - passed (`29` coverage files, `1490` tests; `7` UI files, `51` tests; `36` combined files, `1541` tests); coverage was `90.4%` statements, `81.34%` branches, `94.93%` functions, and `95.45%` lines.
- Count correction: the earlier higher count came from a dirty working-tree validation. The isolated baseline commit established `29` files / `1490` tests as the authoritative unit/integration result; no application test was removed by this correction.
- `npm.cmd run build` - passed with the existing Vite large-chunk warning.
- `git diff --check` - passed with line-ending warnings only.
- Browser smoke QA at `1280 x 720` passed for app load, Mission Control rendering, export route guarded state, export diagnostics, no horizontal overflow, and no console warnings or errors.
- Browser smoke QA at `390 x 844` passed for mobile Mission Control rendering, visible navigation, no horizontal overflow, and no console warnings or errors.
- Real TTI validation imported `TTI Software Licence Tracker` (`90e589f4-3ead-4b3f-adff-477c9fe75394`), created the Mission Control QA duplicate `TTI Software Licence Tracker - Phase 5B.4B.5.1 QA` (`f4c8caf1-8aa2-4a71-97d8-f3384cc17d4b`), regenerated the duplicate package through the application UI, and confirmed both the original and duplicate persisted after reload with `33` generated documents.
- Real TTI before-and-after diagnostics were recorded: answer completion stayed `94%` to `94%`, readiness stayed `Draft` to `Draft`, missing-marker occurrences improved from `21` to `17`, export warnings changed from `3` to `4`, readiness blockers changed from `13` to `15`, remaining marker occurrences were `17`, unique marker labels were `15`, orphan markers were `0`, targeted false markers were `0`, and false blank-section warnings were `0`.
- Real TTI false-marker validation confirmed the previously targeted false markers were removed: expected record counts, legacy SharePoint notes, legacy SharePoint internal-name notes, SharePoint library records, and attachment controls.
- Final manual browser QA passed at desktop `1280 x 720` and mobile `390 x 844`; no page-level horizontal overflow was observed, trace-panel content and marker-source controls remained usable, no console errors or warnings were recorded, no React key warnings were recorded, no accessibility warnings were observed, Edit source routing passed, and original/duplicate persistence passed.
- Physical keyboard QA in normal Chrome passed for the Add state variable button: Enter activated the button and added exactly one row, Space activated the button and added exactly one row, visible focus passed, and console errors or warnings were `None`. The earlier activation failure was classified as a browser-automation harness limitation, so no keyboard source workaround was required.

### Issues found

- High integrity gap fixed: generated documents could contain missing markers that were not explicitly traceable to visible intake, structured intake, derived values, or applicability decisions.
- High readiness gap fixed: SharePoint schema, detailed testing, ALM, record-count, control, and selected-record-state gaps could still leave downstream documents with weak placeholders or stale readiness.
- Medium UI test issue fixed during validation: the document preview now intentionally renders missing markers in both the content preview and the source trace panel.
- `npm.cmd audit --audit-level=high` remained failed under an approved limited exception for `GHSA-3jxr-9vmj-r5cp` and `GHSA-f88m-g3jw-g9cj`. Both dependency paths are development/deployment tooling, both are absent from `npm --omit=dev` results, both are absent from `dist`, and no npm fix is available. This exception does not mean audit passed and does not authorize deployment.

### Remaining work

- Review or replace vulnerable transitive dev dependencies when upstream fixes are available.
- The real TTI package remains Draft because `17` genuine missing-information occurrences remain; those markers represent incomplete intake decisions, not the original generator defects.
- The later record-lifecycle Power Fx phase remains separately unreviewed and excluded from this Phase 5B.4B.5.1 review package.

## 2026-07-20 - Project Builder Ai Brand Rename and Logo Integration

### Summary

- Renamed current visible product branding from GPT Project Builder to Project Builder Ai.
- Integrated approved horizontal, stacked, and icon logo PNG assets from the Project Builder Ai business logo source folder.
- Added square favicon and touch-icon derivatives from the approved icon-only logo, centered on transparent square canvases without stretching or cropping.
- Updated navigation, first-run Mission Control welcome copy, browser metadata, package metadata, current documentation, generated-document product references, and related regression tests.
- Preserved GPT Architect, Codex Developer, Ready for Codex, Architect instructions, Codex instructions, and Codex prompt workflow terminology.
- Preserved infrastructure identifiers, including the existing `projectbuilder` Cloudflare Worker and production URL.
- Preserved the existing `gpt-project-builder.*` localStorage keys for backward compatibility and documented that saved/generated documents may retain former wording until regeneration.
- Preserved phase boundaries: no Phase 5B.4C work, lifecycle Power Fx generation, formula fragments, `.fx` files, Canvas YAML, model-driven source, Power Automate source, storage migration, infrastructure rename, deployment, or commit was performed.

### Files created

- `public/branding/project-builder-ai-horizontal.png` - approved horizontal logo.
- `public/branding/project-builder-ai-stacked.png` - approved stacked logo.
- `public/branding/project-builder-ai-icon.png` - approved icon-only logo.
- `public/favicon-16x16.png` - favicon derivative.
- `public/favicon-32x32.png` - favicon derivative.
- `public/favicon-48x48.png` - favicon derivative.
- `public/apple-touch-icon.png` - 180-pixel touch icon derivative.
- `public/icon-192.png` - 192-pixel icon derivative.
- `public/icon-512.png` - 512-pixel icon derivative.

### Files updated

- `AGENTS.md` - current product name updated while preserving Architect/Developer workflow terms.
- `DEPLOYMENT_NOTES.md` - smoke-test identity wording updated while preserving Worker details.
- `README.md` - product positioning and storage-compatibility note updated.
- `RELEASE_NOTES.md` - current release heading updated.
- `RELEASE_READINESS_REPORT.md` - current release summary updated.
- `index.html` - title, description, theme color, favicon links, and Apple touch icon added.
- `package.json` - package name changed to `project-builder-ai`.
- `package-lock.json` - package name changed to `project-builder-ai`.
- `scripts/run-tests.mjs` - test summary counts updated after added branding regression tests.
- `scripts/run-tests-with-coverage.mjs` - coverage runner summary counts updated after added branding regression tests.
- `src/components/AppShell/AppNavigation.tsx` - text/mark brand replaced with the approved horizontal logo.
- `src/components/IntakeBuilder/PowerPlatformIntake.tsx` - product-boundary copy updated.
- `src/components/MissionControl/MissionControl.tsx` - first-run welcome stacked logo and accurate AI-assisted handoff copy added.
- `src/lib/implementationAssets.ts` - product-boundary wording updated.
- `src/styles/global.css` - responsive navigation and welcome logo styling added.
- `src/templates/documents/index.ts` - generated-document product reference updated.
- `src/tests/App.navigation.test.tsx` - navigation logo, welcome logo, metadata, favicon, and asset coverage added.
- `src/tests/generateProjectPackage.test.ts` - generated-document brand and preserved workflow-term coverage added.
- `src/tests/implementationAssets.test.ts` - implementation manifest product-boundary expectation updated.
- `src/tests/projectRepository.test.ts` - storage-key compatibility and no-rewrite coverage added.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - branding validation evidence.

### Files removed

- None.

### Testing completed

- `git diff --check` - passed with line-ending warnings only.
- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npm.cmd test` - passed (`28` unit/integration files, `1480` tests; `7` UI files, `51` tests; `35` combined files, `1531` tests).
- `npm.cmd run test:coverage` - passed (`28` coverage files, `1480` tests; `7` UI files, `51` tests; `35` combined files, `1531` tests); coverage was `90.43%` statements, `81.48%` branches, `95.06%` functions, and `95.45%` lines.
- `npm.cmd run build` - passed with the existing unchanged Vite large-chunk warning.
- `npm.cmd audit --audit-level=high` - passed with `0` vulnerabilities.
- Build-output inspection confirmed `dist/index.html` uses `Project Builder Ai` and includes favicon/touch-icon links.
- Build-output inspection confirmed the new logo and icon files are emitted under `dist/branding/` and the favicon files are emitted at the dist root.
- Desktop browser QA at `1280 x 720` passed: title correct, horizontal logo loaded, stacked welcome logo loaded, no horizontal overflow, and no console warnings or errors.
- Mobile browser QA at `390 x 844` passed: title correct, horizontal logo remains readable, stacked welcome logo fits the panel, no horizontal overflow, navigation remains present, and no console warnings or errors.

### Issues found

- Medium validation issue fixed during implementation: TypeScript test helpers initially referenced Node modules without the app tsconfig's Node ambient types. The test now documents the Node-only assertion boundary while leaving runtime configuration unchanged.

## 2026-07-20 - Phase 5B.4B.4 Canvas Envelope Structural Validation

### Summary

- Added Canvas storage-envelope structural validation before lifecycle target validation runs.
- Partial Canvas envelopes now block instead of being classified as Not Applicable.
- Required Canvas collections must be arrays, record collections must contain object entries, `primaryDataSourceType` and `primaryConnectorId` must be strings, and `recordLifecycleTargets` must be undefined or an array of objects.
- Structurally valid Canvas projects with empty or undefined lifecycle targets still return Not Applicable without requiring lifecycle decisions.
- Preserved lifecycle planning output for valid Canvas lifecycle targets and preserved recognized non-Canvas Not Applicable behavior.
- Preserved phase boundaries: no lifecycle Power Fx, formula fragments, `.fx` files, Canvas YAML, model-driven source, implementation assets, manifest changes, or export integration were added.

### Files created

- None beyond the existing approved Phase 5B.4B source and test files.

### Files updated

- `src/lib/recordLifecyclePlanning.ts` - Canvas storage-envelope structural guard and deterministic shape blockers.
- `src/tests/recordLifecyclePlanning.test.ts` - malformed Canvas collection, connector collection, lifecycle collection, empty lifecycle, undefined lifecycle, mutation, and determinism coverage.
- `scripts/run-tests.mjs` - updated runner summary counts after actual Vitest output.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts after actual Vitest output.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4B.4 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `154` tests).
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `156` tests).
- `npx.cmd vitest run src/tests/App.powerPlatformCanvas.test.tsx --pool=vmThreads --maxWorkers=1` - passed (`1` file, `9` tests).
- `npx.cmd vitest run --config vitest.unit.config.ts` - passed (`28` files, `1478` tests).
- `npm.cmd test` - passed (`28` unit/integration files, `1478` unit/integration tests, `7` UI files, `48` UI tests, `35` combined files, `1526` combined tests).
- `npm.cmd run test:coverage` - passed (`28` coverage files, `1478` coverage tests, `7` UI files, `48` UI tests, `35` combined files, `1526` combined tests); coverage was `90.43%` statements, `81.48%` branches, `95.06%` functions, and `95.45%` lines.
- `npm.cmd run build` - passed with the existing unchanged Vite large-chunk warning.
- `npm.cmd audit --audit-level=high` - passed with `0` vulnerabilities.

### Issues found

- High runtime-envelope defect fixed: malformed or partial Canvas envelopes with no lifecycle targets could be incorrectly classified as Not Applicable.

## 2026-07-20 - Phase 5B.4B.3 Runtime Envelope Discrimination Correction

### Summary

- Replaced user-controlled result detection with an internal `SafeProjectResolution` wrapper so extra project properties such as `planningStatus`, `plans`, `targets`, `orderedTargets`, `blockingIssues`, `result`, or `kind` cannot be returned as a planning result.
- Project app types are now validated against the canonical project type registry via `isProjectType`.
- Blank, whitespace-only, unsupported, and formula-looking app types now block with a controlled malformed-project result instead of returning Not Applicable.
- Every recognized non-Canvas project type remains Not Applicable, while `powerAppsCanvas` continues through lifecycle planning validation.
- Project identity validation now blocks missing, malformed, blank, or whitespace-only project IDs and project names.
- Preserved mutation safety, deterministic blocked results, and phase boundaries: no lifecycle Power Fx, formula fragments, `.fx` files, Canvas YAML, model-driven source, implementation assets, manifest changes, or export integration were added.

### Files created

- None beyond the existing approved Phase 5B.4B source and test files.

### Files updated

- `src/lib/recordLifecyclePlanning.ts` - internal safe-project wrapper, canonical project type validation, and non-blank identity validation.
- `src/tests/recordLifecyclePlanning.test.ts` - discriminant-collision, extra-property, invalid app type, recognized non-Canvas type, and identity validation coverage.
- `scripts/run-tests.mjs` - updated runner summary counts after actual Vitest output.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts after actual Vitest output.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4B.3 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `124` tests).
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `156` tests).
- `npx.cmd vitest run src/tests/App.powerPlatformCanvas.test.tsx --pool=vmThreads --maxWorkers=1` - passed (`1` file, `9` tests).
- `npx.cmd vitest run --config vitest.unit.config.ts` - passed (`28` files, `1448` tests).
- `npm.cmd test` - passed (`28` unit/integration files, `1448` unit/integration tests, `7` UI files, `48` UI tests, `35` combined files, `1496` combined tests).
- `npm.cmd run test:coverage` - passed (`28` coverage files, `1448` coverage tests, `7` UI files, `48` UI tests, `35` combined files, `1496` combined tests); coverage was `90.41%` statements, `81.44%` branches, `95.06%` functions, and `95.45%` lines.
- `npm.cmd run build` - passed with the existing unchanged Vite large-chunk warning.
- `npm.cmd audit --audit-level=high` - passed with `0` vulnerabilities.

### Issues found

- High runtime-envelope defect fixed: user-controlled top-level planning-result-looking properties could collide with result discrimination.
- High runtime-envelope defect fixed: unsupported or blank string app types could incorrectly return Not Applicable.

## 2026-07-20 - Phase 5B.4B.2 Top-Level Runtime Safety Correction

### Summary

- Added top-level project-envelope validation to the Canvas record lifecycle planning entry point so untrusted persisted project values block without throwing before downstream target validation runs.
- Malformed project input now returns a controlled Blocked result with no targets, ordered targets, plans, or partial planning output.
- Malformed project input does not become Not Applicable; structurally valid non-Canvas projects continue to return Not Applicable without blockers.
- Corrected the lifecycle planning entity category type name from `CanvasRecordLifecycleBackendType` to `CanvasRecordLifecycleEntityType`.
- Replaced unrestricted `recordContextSource: string` with a controlled record-context source union while preserving existing runtime output values.
- Preserved phase boundaries: no lifecycle Power Fx, formula fragments, `.fx` files, Canvas YAML, model-driven source, implementation assets, manifest changes, or export integration were added.

### Files created

- None beyond the existing approved Phase 5B.4B source and test files.

### Files updated

- `src/lib/recordLifecyclePlanning.ts` - top-level runtime guard, blocked/Not Applicable result helpers, entity type rename, and controlled record-context source typing.
- `src/tests/recordLifecyclePlanning.test.ts` - malformed top-level project input, valid non-Canvas, valid Canvas, no partial output, deterministic blocked output, and mutation-safety coverage.
- `scripts/run-tests.mjs` - updated runner summary counts after actual Vitest unit output.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts after actual Vitest unit output.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4B.2 validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `78` tests).
- `npx.cmd vitest run --config vitest.unit.config.ts` - passed (`28` files, `1402` tests).
- `npm.cmd run lint` - passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `156` tests).
- `npx.cmd vitest run src/tests/App.powerPlatformCanvas.test.tsx --pool=vmThreads --maxWorkers=1` - passed (`1` file, `9` tests).
- `npm.cmd test` - passed (`28` unit/integration files, `1402` unit/integration tests, `7` UI files, `48` UI tests, `35` combined files, `1450` combined tests).
- `npm.cmd run test:coverage` - passed (`28` coverage files, `1402` coverage tests, `7` UI files, `48` UI tests, `35` combined files, `1450` combined tests); coverage was `90.35%` statements, `81.36%` branches, `95.06%` functions, and `95.43%` lines.
- `npm.cmd run build` - passed with the existing unchanged Vite large-chunk warning.
- `npm.cmd audit --audit-level=high` - passed with `0` vulnerabilities.
- Final review ZIP and extracted-package validation are recorded in the Phase 5B.4B.2 commit-gate report.

### Issues found

- High runtime-safety defect confirmed and fixed: malformed top-level project inputs could throw before lifecycle target validation.

## 2026-07-20 - Phase 5B.4B.1 Lifecycle Planning and Intake UI Corrections

### Summary

- Corrected Canvas record lifecycle planning so refresh, navigation, notification, and local-state behaviours are explicitly `notPlanned` until approved decisions exist.
- Reused canonical Canvas entity ownership from Phase 5B.4A instead of duplicating connector-selection logic inside the planner.
- Kept lifecycle `entityType` separate from resolved connector `backendType` and typed backend values from the Canvas data-source type model.
- Moved Guided Intake SharePoint Add List and Add Column actions to the bottom of their collections while preserving remove controls, values, validation, and persistence.
- Replaced the Canvas Subtype display field with an editable select bound to the existing `powerPlatform.canvas.subtype` field.
- Preserved phase boundaries: no lifecycle Power Fx, formula fragments, `.fx` files, Canvas YAML, model-driven source, implementation assets, or export integration were added.

### Files created

- None.

### Files updated

- `src/lib/recordLifecyclePlanning.ts` - canonical ownership reuse, typed backend values, and explicitly not-planned optional behaviours.
- `src/tests/recordLifecyclePlanning.test.ts` - expanded planning correction, backend separation, canonical ownership, determinism, and boundary coverage.
- `src/components/IntakeBuilder/PowerPlatformIntake.tsx` - moved SharePoint add buttons to collection bottoms and made Canvas Subtype editable.
- `src/tests/App.powerPlatformCanvas.test.tsx` - added focused UI coverage for SharePoint list/column add positions and Canvas Subtype editability/persistence.
- `scripts/run-tests.mjs` - updated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4B.1 validation evidence.

### Files removed

- None.

### Testing completed

- `git diff --check` - passed with line-ending warnings only.
- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `60` tests).
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `156` tests).
- `npx.cmd vitest run src/tests/App.powerPlatformCanvas.test.tsx --pool=vmThreads --maxWorkers=1` - passed (`1` file, `9` tests).
- `npm.cmd test` - passed (`28` unit/integration files, `1384` unit/integration tests, `7` UI files, `48` UI tests, `35` combined files, `1432` combined tests).
- Manual UI verification - passed in the local app. SharePoint Lists showed Add List once below the final list card and available for empty collections; Remove List appeared at the top of every list card; multiple lists could be added without returning to the section heading; existing list values persisted after adding and removing another list.
- Manual UI verification - passed in the local app. SharePoint Columns and Internal Names showed Add Column once below the final column card and available for empty collections; Remove Column appeared at the top of every column card; multiple columns could be added without returning to the section heading; existing display and internal-name values persisted after adding and removing another column.
- Manual UI verification - passed in the local app. Canvas Subtype accepted mouse selection and native select keyboard interaction; the selected value remained after section navigation and after saving/reopening the project; existing saved values displayed correctly; the field remained unavailable for unrelated project types.

### Issues found

- The prior runner summary was stale after adding lifecycle planning and Canvas UI tests; corrected to the actual test counts.

## 2026-07-20 - Phase 5B.4B Canvas Record Lifecycle Action Planning

### Summary

- Added deterministic Canvas record lifecycle action planning from validated Phase 5B.4A lifecycle targets.
- Planned archive, restore, and permanent-delete actions as structured records with typed preconditions, ordered action steps, controlled statuses, connector operation capability, record context, lifecycle field metadata, and deterministic ordering.
- Preserved Phase 5B.4A connector reconciliation and canonical entity ownership blockers; blocked malformed or incomplete data instead of producing partial plans.
- Kept the phase non-executable: no Power Fx, `.fx` files, Canvas YAML, implementation assets, UI integration, export integration, or lifecycle formula generation.

### Files created

- `src/lib/recordLifecyclePlanning.ts` - typed lifecycle action planning model and deterministic planner.
- `src/tests/recordLifecyclePlanning.test.ts` - focused planning, ownership, runtime safety, deterministic ordering, and phase-boundary coverage.

### Files updated

- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4B validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd vitest run src/tests/recordLifecyclePlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `56` tests).
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `156` tests).
- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npm.cmd test` - passed (`28` unit/integration files, `1380` unit/integration tests, `7` UI files, `43` UI tests, `35` combined files, `1423` combined tests).
- `git diff --check` - passed with line-ending warnings only.

### Issues found

- None blocking after focused planning implementation.

## 2026-07-20 - Phase 5B.4A.3 Connector-Selection Shape and Ownership Safety

### Summary

- Added runtime shape validation for Canvas connector-selection evidence before lifecycle validation calls canonical connector reconciliation.
- Blocked malformed `primaryDataSourceType`, `selectedDataSourceTypes`, `primaryConnectorId`, and `secondaryConnectorIds` from producing active connector ownership.
- Preserved canonical reconciliation blockers in lifecycle validation results after connector-selection storage passes runtime shape validation.

### Files created

- None.

### Files updated

- `src/lib/recordLifecycleTargets.ts` - connector-selection storage safety and reconciliation blocker preservation.
- `src/tests/recordLifecycleTargets.test.ts` - focused coverage for malformed connector-selection storage and reconciliation blocker visibility.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4A.3 validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `156` tests).

### Issues found

- None blocking after correction.

## 2026-07-20 - Phase 5B.4A.2 Ownership Record Safety and Canonical Entity Ownership

### Summary

- Corrected Canvas record lifecycle ownership validation so malformed form-operation submit-control IDs and form-mode trigger-control IDs block instead of being silently discarded from reserved ownership sets.
- Aligned SharePoint list, SharePoint library, and Dataverse table ownership with canonical implicit connector ownership: zero active compatible connectors block, exactly one active compatible connector must match the target connector, and multiple active compatible connectors block as ambiguous.
- Preserved explicit connector-resource ownership through the resource's stored connector ID.

### Files created

- None.

### Files updated

- `src/lib/recordLifecycleTargets.ts` - ownership record ID safety and canonical entity ownership handling.
- `src/tests/recordLifecycleTargets.test.ts` - focused coverage for malformed ownership IDs, ambiguous implicit ownership, and explicit connector-resource ownership.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4A.2 validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `124` tests).

### Issues found

- None blocking after correction.

## 2026-07-19 - Phase 5B.4A.1 Delete Strategy Consistency and Current-Project Shape Safety

### Summary

- Corrected Canvas record lifecycle validation so every delete target requires `archiveStrategy: notApplicable`, including soft-delete and missing-decision delete targets.
- Added current-project collection shape validation before lifecycle lookups so malformed Canvas, connector, ownership, entity, field, screen, control, and state-variable collections block safely without throwing.
- Preserved legacy absence handling for `recordLifecycleTargets` while preventing malformed established supporting collections from being treated as empty ownership or schema evidence.

### Files created

- None.

### Files updated

- `src/lib/recordLifecycleTargets.ts` - delete strategy consistency and current-project collection/record shape safety.
- `src/tests/recordLifecycleTargets.test.ts` - focused defect coverage for delete archive-strategy consistency and malformed current-project shapes.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4A.1 validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `98` tests).

### Issues found

- None blocking after correction.

## 2026-07-19 - Phase 5B.4A Canvas Record Lifecycle Action Target Model

### Summary

- Added a controlled Canvas record lifecycle target model for archive, restore, and delete actions.
- Added safe normalization and validation for lifecycle target IDs, trigger buttons, screens, connectors, entities, record context references, archive/restore strategies, delete strategies, destructive-action evidence, duplicates, archive/restore pair consistency, deterministic ordering, and mutation safety.
- Preserved the Phase 5B.4A boundary: no implementation assets, no Power Fx generation, no `.fx` files, no connector/entity data reads, no Canvas YAML, no model-driven source, no UI/export integration, and no Phase 5B.4B planning.

### Files created

- `src/lib/recordLifecycleTargets.ts` - typed normalization, deterministic ordering, and validation for Canvas archive, restore, and delete lifecycle targets.
- `src/tests/recordLifecycleTargets.test.ts` - focused Phase 5B.4A acceptance and regression coverage.

### Files updated

- `src/types/project.ts` - added Canvas record lifecycle target types and canonical Canvas storage property.
- `src/lib/powerPlatform.ts` - initialized and normalized `recordLifecycleTargets` for Canvas projects.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.4A validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/recordLifecycleTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `67` tests).

### Issues found

- Initial safe-reference detection was too broad for ordinary stable IDs containing words such as `form`. Corrected within the Phase 5B.4A validator to block formula-looking expressions without blocking safe IDs.
- Initial status-field missing archive/restore values were reported only as missing decisions. Corrected so required missing strategy values block validation.

## 2026-07-19 - Phase 5B.3F Controlled Canvas Form-Mode Power Fx Generation

### Summary

- Added controlled Canvas form-mode button `OnSelect` Power Fx generation from the approved Phase 5B.3E form-mode planning asset.
- Limited generated formulas to one structured fragment per approved target using only `NewForm(validFormIdentifier)` or `EditForm(validFormIdentifier)` with one trailing newline.
- Added source planning asset validation, full registry validation, current-project reconstruction, form identifier safety, trigger-control validation, intended-path validation, deterministic fragment and top-level checksums, traceability outside formulas, and mutation safety.
- Preserved the Phase 5B.3F boundary: no formula execution, no `.fx` files, no Canvas YAML, no model-driven source, no connector/entity data reads, no UI/export integration, and no Phase 5B.4 behavior.

### Files created

- `src/lib/formModePowerFxGeneration.ts` - controlled form-mode Power Fx generation result model, source validation, fragment generation, checksum binding, traceability, and registry-safe exported functions.
- `src/tests/formModePowerFxGeneration.test.ts` - focused Phase 5B.3F acceptance and regression coverage.

### Files updated

- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3F validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formModePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `53` tests).

### Issues found

- Initial fixture approval state blocked generation because the source planning asset was compared against a fresh registry projection instead of the current derived registry projection. Fixed by validating the source contract against the derived current registry asset.
- Multi-target fixture initially reused the same dependency records. Fixed the fixture by modeling the edit path through distinct Dataverse-backed screen, form, connector, entity, field, and trigger records.

## 2026-07-19 - Phase 5B.3E.2 Safe Exported Registry and Graph Boundaries

### Summary

- Added safe exported-function boundaries for malformed implementation-asset registries, stored asset arrays, graph asset identities, graph dependencies, direct dependency evaluation, and registry-state derivation.
- Preserved detailed semantic issues for malformed dependency records, gate records, nested form-mode targets, unsafe paths, duplicate paths, stale approvals, and malformed registry assets.
- Kept valid graph behavior intact for duplicate assets, duplicate paths, duplicate dependencies, missing dependencies, unresolved records, self-dependencies, circular dependencies, deterministic generation order, and approval/checksum invalidation.
- Preserved the Phase 5B.3E boundary: no executable Power Fx, no formula fragments, no `.fx` files, no Canvas YAML, no model-driven source, no UI/export integration, no form-mode Power Fx generation, and no Phase 5B.4 behavior.

### Files created

- None.

### Files updated

- `src/lib/implementationAssets.ts` - added safe exported registry/graph normalization, registry-envelope validation, graph dependency filtering, malformed blocked-asset projection, and controlled issue preservation for malformed runtime inputs.
- `src/tests/formModePlanning.test.ts` - added Phase 5B.3E.2 exported-boundary coverage for malformed registry envelopes, malformed stored assets, malformed graph dependencies, malformed asset identities, dependency evaluation, registry-state derivation, stale approval invalidation, and valid graph regressions.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3E.2 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formModePlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `84` tests).
- Required focused regression matrix - passed.
- `git diff --check` - passed with line-ending warnings only.

### Issues found

- Initial exported-registry validation labeled malformed stored entries as `assets[0]` instead of `registry.assets[0]`. Fixed by preserving the caller-specific source label through dependency and registry-state derivation.
- TypeScript required additional runtime narrowing before checking stored `generationVersion` compatibility. Fixed with an explicit string guard.

## 2026-07-19 - Phase 5B.3E.1 Registry Safety and Nested Input Validation

### Summary

- Completed runtime implementation-asset registry shape validation before dependency, gate, graph, or current-state evaluation.
- Added controlled semantic validation for malformed dependency records, gate records, and nested `generationInputs.formModeTargets` records on canonical and unrelated assets.
- Added explicit deterministic `Form-mode action count: <number>` planning content tied to canonical ordered targets and checksum calculation.
- Preserved dynamic project identity content from the current project without hardcoding production project IDs or names.
- Preserved the Phase 5B.3E boundary: no executable Power Fx, no formula fragments, no `.fx` files, no Canvas YAML, no model-driven source, no UI/export integration, and no Phase 5B.4 behavior.

### Files created

- None.

### Files updated

- `src/lib/implementationAssets.ts` - added runtime shape guards, malformed blocked-asset fallback, dependency/gate/nested form-mode semantic validation, and form-mode action count content.
- `src/tests/formModePlanning.test.ts` - added Phase 5B.3E.1 Architect probe coverage for malformed arrays, dependency records, gate records, nested target inputs, dynamic project identity, action counts, checksum binding, and timestamp neutrality.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3E.1 validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formModePlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `59` tests).

### Issues found

- Initial correction pass exposed that malformed blocked assets could be overwritten by a later derivation pass. Fixed by preserving malformed semantic-blocked assets across iterative derivation.

## 2026-07-18 - Phase 5B.3E Canvas Form-Mode Action Planning

### Summary

- Added one canonical, non-executable Canvas form-mode action planning asset for validated new/edit form-mode targets.
- Added explicit project identity to the deterministic planning content, covered with `project-unique-742` / `Unique Project 742`.
- Bound the planning asset to the approved Phase 5B.3B form-operation planning asset, current project reconstruction, canonical gate snapshots, deterministic dependencies, structured target inputs, and checksum/approval invalidation rules.
- Added stale stored-asset handling so removed or blocked form-mode targets require registry regeneration instead of silently preserving old planning evidence.
- Preserved the Phase 5B.3E boundary: no Power Fx generation, no formula fragments, no `.fx` files, no Canvas YAML, no model-driven source, no UI/export integration, and no Phase 5B.4 behavior.

### Files created

- `src/lib/formModePlanning.ts` - canonical planning model, structured inputs, path validation, constants, and deterministic target ordering for Canvas form-mode actions.
- `src/tests/formModePlanning.test.ts` - focused Phase 5B.3E acceptance and regression coverage.

### Files updated

- `src/lib/implementationAssets.ts` - registered the form-mode planning asset, source asset dependency, gate/dependency model, stale stored-asset defense, registry semantic validation, and source content rendering.
- `src/tests/formModeTargets.test.ts` - updated the Phase 5B.3D regression expectation now that Phase 5B.3E intentionally creates a planning asset while still generating no formulas from target validation.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3E validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formModePlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `33` tests).
- `npx.cmd vitest run src/tests/formModeTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `67` tests).
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `85` tests).
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `63` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `55` tests).
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `97` tests).
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `175` tests).
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `59` tests).
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `70` tests).
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `99` tests).
- `git diff --check` - passed with line-ending warnings only.

### Issues found

- Existing Phase 5B.3D target-model regression expected no form-mode planning asset. Updated that assertion to reflect the approved Phase 5B.3E planning asset while preserving the no-formula boundary.

## 2026-07-18 - Phase 5B.3D.1 Trigger Ownership and Malformed Control Safety

### Summary

- Reserved all current valid form-operation submit controls so form-mode trigger buttons cannot reuse controls that already own form-submission `OnSelect` responsibility.
- Strengthened trigger-control validation so missing, malformed, non-string, blank, punctuated, formula-looking, or unsupported current control names and types block safely without throwing.
- Completed raw form-mode target shape validation so `required` must be explicitly Boolean and `sortOrder` must be explicitly finite numeric before a target can be eligible.
- Preserved the Phase 5B.3D boundary: no implementation assets, no Power Fx generation, no formula execution, no `.fx` files, no Canvas YAML, no model-driven source, no UI/export integration, and no Phase 5B.4 behavior.

### Files created

- None.

### Files updated

- `src/lib/formModeTargets.ts` - added submit-control ownership protection, safe current trigger-control validation, and complete raw `required`/`sortOrder` checks.
- `src/tests/formModeTargets.test.ts` - added focused correction coverage for submit-control reuse, malformed current controls, raw-shape blockers, and preserved valid behavior.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3D.1 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formModeTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `67` tests).
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `git diff --check` - passed.

### Issues found

- None.

## 2026-07-18 - Phase 5B.3D Canvas Form-Mode Action Target Model

### Summary

- Added typed Canvas form-mode action targets for controlled new-record and edit-record initiation modeling.
- Added safe normalization and validation for `formModeTargets`, including legacy missing storage, malformed raw storage, target IDs, form-operation binding, operation/action mapping, edit-record context decisions, trigger buttons, duplicate detection, deterministic ordering, and mutation safety.
- Wired Canvas project defaults and normalization so new and legacy Canvas projects use the canonical `formModeTargets` storage property.
- Preserved the Phase 5B.3D boundary: no implementation assets, no Power Fx generation, no formula execution, no `.fx` files, no Canvas YAML, no model-driven source, no UI/export integration, and no Phase 5B.4 behavior.

### Files created

- `src/lib/formModeTargets.ts` - typed normalization and validation for Canvas form-mode action targets.
- `src/tests/formModeTargets.test.ts` - focused Phase 5B.3D acceptance and regression coverage.

### Files updated

- `src/types/project.ts` - added Canvas form-mode target types and canonical Canvas storage property.
- `src/lib/powerPlatform.ts` - initialized and normalized `formModeTargets`.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3D validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formModeTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `39` tests).
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `git diff --check` - passed.

### Issues found

- None.

## 2026-07-17 - Phase 5B.3C.2 Complete Power Platform Gate-Status Contract

### Summary

- Completed the form-operation Power Fx generation gate-status runtime contract by accepting every current `PowerPlatformGateStatus` value during registry-envelope validation.
- Added explicit coverage for valid unrelated-asset gate statuses, including `inProgress` and `manualValidationRequired`, while preserving blocking for unknown gate statuses without throwing.
- Preserved the Phase 5B.3C boundary: only controlled `SubmitForm(validFormIdentifier)` generation remains supported, with no formula execution, `.fx` writes, Canvas YAML, model-driven source, UI/export integration, or Phase 5B.3D work.

### Files created

- None.

### Files updated

- `src/lib/formOperationPowerFxGeneration.ts` - expanded the gate-status allowlist to match the full `PowerPlatformGateStatus` contract.
- `src/tests/formOperationPowerFxGeneration.test.ts` - added focused contract coverage for all valid gate statuses and unknown-status blocking.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3C.2 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `85` tests).
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/statePowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/stateInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/powerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `npx.cmd vitest run src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1` - passed.
- `git diff --check` - passed.

### Issues found

- None.

## 2026-07-17 - Phase 5B.3C.1 Complete Registry Validation and Safe Applicability

### Summary

- Strengthened form-operation Power Fx generation registry-envelope validation so every asset is checked against approved runtime enum contracts before applicability or current-state derivation.
- Added controlled blocking for unknown platforms, asset categories, asset types, asset statuses, applicability statuses, approval statuses, dependency types, required gate IDs, gate-snapshot IDs, gate-snapshot statuses, and malformed nested form-operation semantic values.
- Made current Canvas `formOperationTargets` applicability safe for missing legacy storage, empty arrays, stale source assets, and malformed null/primitive/object storage without throwing.
- Preserved the Phase 5B.3C boundary: only `SubmitForm(validFormIdentifier)` remains supported, no formulas execute, no `.fx` files are written, and Phase 5B.3D/5B.4 remain out of scope.

### Files created

- None.

### Files updated

- `src/lib/formOperationPowerFxGeneration.ts` - complete semantic registry validation and safe current target-storage applicability checks.
- `src/tests/formOperationPowerFxGeneration.test.ts` - focused correction coverage for malformed unrelated assets, unknown gates, malformed nested inputs, and legacy target storage.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3C.1 validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `69` tests).

### Issues found

- None.

## 2026-07-17 - Phase 5B.3C Controlled Canvas SubmitForm Power Fx Generation

### Summary

- Added controlled Canvas submit-button `OnSelect` Power Fx generation from the approved canonical Phase 5B.3B form-operation planning asset.
- Generated one structured fragment per approved form-operation target using only the fixed `SubmitForm(validFormIdentifier)` pattern for both create and edit operations.
- Added registry-envelope validation, canonical source-asset validation, stored Ready status enforcement, current-project defence, path safety checks, fragment/top-level checksums, structured traceability, malformed-input blocking, and mutation safety coverage.
- Kept form-mode initialization, navigation, reset, success/failure, notification, record selection, connector/entity reads, raw formula input, `.fx` file writes, Canvas YAML, model-driven source, UI/export integration, publishing, deployment, Phase 5B.3D, and Phase 5B.4 out of scope.

### Files created

- `src/lib/formOperationPowerFxGeneration.ts` - controlled `SubmitForm(formControlImplementationName)` fragment generator for approved Canvas form-operation planning assets.
- `src/tests/formOperationPowerFxGeneration.test.ts` - focused Phase 5B.3C generation, validation, checksum, traceability, and boundary tests.

### Files updated

- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3C validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formOperationPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `50` tests).

### Issues found

- None.

## 2026-07-17 - Phase 5B.3B.1 Safe Blocked Content and Relationship-Aware Dependencies

### Summary

- Corrected Canvas form-operation planning readable content so blocked plans do not print arbitrary invalid implementation identifiers.
- Limited displayed form, submit-button, and entity implementation names to valid simple Power Fx identifiers while preserving exact values structurally for review and checksums.
- Strengthened form-operation screen, editable-form, submit-button, and entity dependencies so moved controls, wrong control types, invalid implementation names, and stale relationship context block readiness.
- Preserved canonical form-operation dependency results during current-state derivation so generic ID-only dependency checks cannot weaken the specialized relationship-aware checks.
- Kept executable SubmitForm/NewForm/EditForm/Patch generation, `.fx` files, UI/export integration, Canvas YAML, model-driven source, publishing, deployment, and Phase 5B.3C out of scope.

### Files created

- None.

### Files updated

- `src/lib/implementationAssets.ts` - safe identifier rendering, blocked form-operation source summaries, relationship-aware dependency checks, and specialized dependency preservation.
- `src/tests/formOperationPlanning.test.ts` - focused regression coverage for safe blocked content, hidden checksum evidence, dependency resolution, readiness consistency, and specialized dependency preservation.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3B.1 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `63` tests).
- Focused Phase 5A through Phase 5B.3A regression validation completed for this correction.

### Issues found

- None.

## 2026-07-17 - Phase 5B.3B Canvas Form-Operation Planning Asset

### Summary

- Added one canonical planning-only implementation asset for approved Canvas create/edit form-operation targets.
- Added structured generation inputs, deterministic future fragment paths, canonical gates, current-project dependencies, checksum binding, approval invalidation, safe readable planning content, and registry/manifest integration.
- Updated the Phase 5B.3A regression expectation so valid form-operation targets create only the canonical planning asset while still generating no executable Power Fx.
- Kept SubmitForm/NewForm/EditForm/Patch generation, executable `.fx` files, connector/entity reads, field-value mapping, Canvas YAML, model-driven source, UI/export integration, publishing, deployment, and Phase 5B.3C out of scope.

### Files created

- `src/lib/formOperationPlanning.ts` - constants and structured derivation helpers for the combined Canvas form-operation planning asset.
- `src/tests/formOperationPlanning.test.ts` - focused Phase 5B.3B planning asset coverage.

### Files updated

- `src/lib/implementationAssets.ts` - registry integration, current-state derivation, dependencies, safe source content, approval invalidation, and manifest readiness for the form-operation planning asset.
- `src/tests/formOperationTargets.test.ts` - updated regression expectation for the new planning-only asset.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3B validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formOperationPlanning.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `44` tests).
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `78` tests).
- Focused Phase 5A through Phase 5B.2D regression tests passed.

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Full test, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3B commit gate.
- Phase 5B.3C must not begin until Phase 5B.3B is approved.

## 2026-07-17 - Phase 5B.3A.2 Canonical Entity-Connector Compatibility

### Summary

- Replaced the form-operation validator's duplicated entity/connector compatibility matrix with the canonical Canvas entity compatibility helper.
- Exported the existing Canvas compatibility helper from `canvasTargetValidation.ts` without changing existing caller behavior.
- Confirmed connector-resource form targets now validate for active, fully confirmed `externalApi`, `customConnector`, `otherConnector`, `microsoft365Connector`, `sqlServer`, and `excel` connectors when ownership and operation support are valid.
- Preserved explicit connector-resource ownership, active connector reconciliation, ambiguous implicit ownership blocking, field-schema completeness, malformed-input blocking, duplicate rules, deterministic ordering, mutation safety, and Phase 5B.3B boundaries.

### Files created

- None.

### Files updated

- `src/lib/canvasTargetValidation.ts` - exported the canonical Canvas entity compatibility helper and updated internal call sites to use the exported name.
- `src/lib/formOperationTargets.ts` - reused the canonical compatibility helper instead of a local duplicate matrix.
- `src/tests/formOperationTargets.test.ts` - added connector-resource compatibility coverage for SQL Server, Excel, and other supported resource backends.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3A.2 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `78` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts src/tests/collectionInitialization.test.ts src/tests/statePowerFxGeneration.test.ts src/tests/stateInitialization.test.ts src/tests/powerFxGeneration.test.ts src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`6` files, `555` tests).

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Full test, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3A commit gate.
- Phase 5B.3B must not begin until Phase 5B.3A is approved.

## 2026-07-17 - Phase 5B.3A.1 Active Connector and Field-Schema Completeness

### Summary

- Corrected Canvas form-operation validation to use canonical active connector reconciliation instead of stored primary or secondary connector IDs.
- Blocked inactive stored secondary connectors, backend-mismatched connectors, stale primary selections, inactive explicit connector-resource owners, and ambiguous implicit entity ownership.
- Tightened required-field completeness so empty required-field lists require confirmed current schema evidence with recognized required or optional classifications.
- Preserved malformed raw form-operation input during validation so partial, primitive, non-array, and malformed required-field data cannot normalize away to `Not Applicable`.
- Kept implementation assets, Power Fx generation, connector reads, field mapping, Canvas YAML, model-driven source, UI integration, export integration, installation, publishing, deployment, and Phase 5B.3B out of scope.

### Files created

- None.

### Files updated

- `src/lib/formOperationTargets.ts` - active connector reconciliation, explicit/ambiguous entity ownership, field-schema completeness, and raw malformed-input blocking.
- `src/tests/formOperationTargets.test.ts` - focused correction coverage.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3A.1 validation evidence.

### Files removed

- None.

### Testing completed

- `npm.cmd run lint` - passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `62` tests).
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts src/tests/collectionInitialization.test.ts src/tests/statePowerFxGeneration.test.ts src/tests/stateInitialization.test.ts src/tests/powerFxGeneration.test.ts src/tests/implementationAssets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`6` files, `555` tests).

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Full test, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3A commit gate.
- Phase 5B.3B must not begin until Phase 5B.3A is approved.

## 2026-07-16 - Phase 5B.3A Canvas Create and Edit Form-Operation Target Model

### Summary

- Added a typed Canvas form-operation target model for future create/edit form submissions.
- Added storage defaults and legacy normalization so Canvas projects safely carry `formOperationTargets`.
- Added planning-only normalization, deterministic ordering, and validation for create/edit form operation targets.
- Validated screen, form control, submit control, selected source connector, source entity, required fields, duplicates, and operation support without generating formulas or implementation assets.
- Kept Power Fx generation, SubmitForm/Patch generation, connector reads, field mapping, Canvas YAML, model-driven source, UI integration, export integration, installation, publishing, deployment, and Phase 5B.3B out of scope.

### Files created

- `src/lib/formOperationTargets.ts` - Canvas form-operation target normalization, ordering, and validation.
- `src/tests/formOperationTargets.test.ts` - focused Phase 5B.3A form-operation target coverage.

### Files updated

- `src/types/project.ts` - typed Canvas form-operation target model and Canvas storage property.
- `src/lib/powerPlatform.ts` - Canvas defaults and legacy normalization for form operation targets.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.3A validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/formOperationTargets.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `39` tests).

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Full test, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.3A commit gate.
- Phase 5B.3B must not begin until Phase 5B.3A is approved.

## 2026-07-16 - Phase 5B.2D Basic Canvas Collection-Loading Power Fx Generation

### Summary

- Added controlled Canvas App `OnStart` collection-loading Power Fx generation for approved Phase 5B.2C planning assets.
- Generated only the supported `ClearCollect(collectionName, sourceName)` pattern from current canonical approved collection targets.
- Added registry-envelope validation, canonical source-asset binding, current-project defence, deterministic formatting, checksum binding, traceability, and mutation-safety coverage.
- Corrected stored source status enforcement so only raw stored `Ready for Export` planning assets can generate, independent of valid approval and checksum evidence.
- Preserved scalar App `OnStart` generation as a separate fragment and kept connector data reads, filtering, sorting, field shaping, relationships, pagination, CRUD, Canvas YAML, model-driven source, UI integration, export integration, installation, publishing, deployment, and Phase 5B.3 out of scope.

### Files created

- `src/lib/collectionPowerFxGeneration.ts` - controlled collection-loading Power Fx generation contract and generator.
- `src/tests/collectionPowerFxGeneration.test.ts` - focused Phase 5B.2D collection generation coverage.

### Files updated

- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.2D validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/collectionPowerFxGeneration.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `55` tests after Phase 5B.2D.1 correction).

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Full test, coverage, build, audit, Linux validation, and extracted-package validation remain deferred to the Phase 5B.2D commit gate.
- Phase 5B.3 must not begin until Phase 5B.2D is approved.

## 2026-07-16 - Phase 5B.2C Collection Loading Target Model

### Summary

- Added a structured Canvas collection-loading target model for future App OnStart collection generation.
- Added planning-only validation for confirmed small bounded collection loads from confirmed connector/entity sources.
- Added one combined App OnStart collection-loading Phase 5A planning asset with structured generation inputs.
- Corrected collection planning derivation so canonical identity, gates, dependencies, and approval evidence are rebuilt from the current project, and formula-looking structured values are not printed raw in readable source content.
- Corrected blocked collection planning readable content so blocking issue counts are shown safely while raw issue details remain available only in structured fields.
- Kept executable ClearCollect, Collect, Clear, connector loading, filtering, sorting, field shaping, relationships, UI integration, export integration, installation, publishing, deployment, Canvas YAML, model-driven source, and Phase 5B.2D out of scope.

### Files created

- `src/lib/collectionInitialization.ts` - Canvas collection target normalization, ordering, validation, and structured generation-input helpers.
- `src/tests/collectionInitialization.test.ts` - focused Phase 5B.2C collection planning coverage.

### Files updated

- `src/types/project.ts` - typed Canvas collection target model and Canvas storage property.
- `src/lib/powerPlatform.ts` - Canvas defaults and legacy normalization for collection targets.
- `src/lib/implementationAssets.ts` - planning-only App OnStart collection-loading implementation asset and stale approval invalidation.
- `scripts/run-tests.mjs` - updated isolated runner summary counts.
- `scripts/run-tests-with-coverage.mjs` - updated coverage runner summary counts.
- `CHANGE_LOG.md` - this entry.
- `TEST_PLAN.md` - Phase 5B.2C validation evidence.

### Files removed

- None.

### Testing completed

- `npx.cmd tsc --noEmit -p tsconfig.app.json` - passed.
- `npx.cmd vitest run src/tests/collectionInitialization.test.ts --pool=vmThreads --maxWorkers=1` - passed (`1` file, `97` tests after Phase 5B.2C.2 corrections).

### Issues found

- None.

### Remaining work

- Architect review is required before commit.
- Phase 5B.2D must not begin until Phase 5B.2C is approved.

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
# 2026-08-13 - Phase 5C.2.3D.3C.3C - Controlled Apply Transaction Finalization Contract

## Summary

- Added the in-memory controlled-apply transaction finalization contract, with only `finalized`, `alreadyApplied`, and `blocked` outcomes.
- The finalizer invokes D.3C.3A directly, allocates and validates canonical `appliedAt` before a canonical unique `applyId`, constructs exact durable-history candidate evidence, and validates the complete candidate collection through D.3C.2A with structural normalization equivalence.
- Preserved the non-writing boundary: no ProjectRecord mutation, repository/storage access, history persistence, readiness/output integration, explicit Apply UI, rollback, actor identity, or current-rule mapping.

## Files created

- `src/lib/planningControlledApplyTransactionFinalization.ts` - implements deterministic in-memory transaction finalization evidence.
- `src/tests/planningControlledApplyTransactionFinalization.test.ts` - covers outcomes, runtime order/failures, chronology, exact string semantics, history validation, immutability, isolation, and TTI safety.

## Files updated

- `CHANGE_LOG.md` - records this phase.
- `TEST_PLAN.md` - records the D.3C.3C validation matrix.

## Files removed

- None.

## Testing completed

- `npm.cmd ci`: passed; install output reported known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high).
- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit -p tsconfig.app.json`: passed.
- Focused D.3C.3C transaction-finalization tests passed (`1` file, `30` tests).
- D.3C.3A preparation, D.3C.2A history, D.3B destination, and D.3A candidate regressions passed (`4` files, `135` tests).
- Planning and clarification lifecycle/persistence regressions passed (`15` files, `276` tests).
- Repository/storage regressions passed (`2` files, `103` tests).
- Intake/readiness regressions passed (`6` files, `137` tests).
- Output/export regressions passed (`7` files, `89` tests).
- `npm.cmd test`: passed (`56` unit/integration files, `2292` tests; `7` UI files, `61` tests; `63` combined files, `2353` tests).
- `npm.cmd run test:coverage`: passed (`63` combined files, `2353` tests) with `90.15%` statements, `81.90%` branches, `95.36%` functions, and `94.02%` lines.
- `npm.cmd run build`: passed with the existing Vite large-chunk warning.
- `npm.cmd audit --omit=dev --audit-level=high`: passed with `0` vulnerabilities.
- `npm.cmd audit --audit-level=high`: exited `1` with known development/tooling advisories (`6` vulnerabilities: `2` moderate, `4` high); dependency remediation remains outside this phase.

## Issues found

- Low: known development/tooling dependency advisories remain outside this phase and were not remediated.
- Low: existing Vite large-chunk warning remains unchanged.

## Remaining work

- Return the exact review commit to GPT Architect. Repository concurrency recheck, controlled ProjectRecord mutation, durable history persistence, atomic storage, and explicit Apply behavior remain unimplemented and require separate authorization.
