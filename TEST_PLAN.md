# Test Plan

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
