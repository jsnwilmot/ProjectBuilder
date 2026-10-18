# Phase 6D.5: bounded Ecommerce package coherence

Authorized baseline: `d278b040477ddf5cc44c2169f50d5fa14db1dfe7`.
The Architect-approved nine-case design addendum is the specification. This is test-local characterization, not an application registry, resolver, readiness policy or source of approval.

## Files and oracle separation

- `fixtures.ts`: only approved source changes; reuses the unchanged 6D.4 `C` input and fictional identity through `observe.ts`.
- `expectations.ts`: separately transcribed literal state, decision, marker, inventory, folder, warning, checklist and identity expectations. No runtime production imports, selectors or fixture-derived outcomes.
- `projections.ts`: separately authored literal source/verification/configuration facts and document-specific boundaries. Full architecture, deployment and phase expectations are transcribed separately from their source input.
- `observe.ts`: the only new support module calling production APIs. Exactly seven isolated injected memory stores, one project each, fourteen generations; PC-002 → PC-008 → PC-009 is the sole linked sequence. Observation asserts no storage writes; the test spies prohibit browser Storage access. No ZIP operations.
- `contract.ts`: six pure assertions, version 1.0.0, `authority: "none"`. Missing/duplicated required sections or tables violate a supported contract. Unsupported cases, domains, versions and invariant checkpoints return `notApplicable` with zero comparisons and a reason, never satisfaction.
- `sensitivity.ts`: 47 separately specified corruptions in NEG-001–015, including per-artifact and shared-error controls. Each names the invariant and required violation location.
- `../systemPackageCoherence.test.ts`: nine checkpoint checks, contract/applicability and clock budgets, deterministic/nonmutating assertions, sensitivity controls and permitted-source positive controls.

The oracle does not call production templates, document registries, parsers, readiness calculations or manifest builders. Observed production fields never manufacture expected values. Deriving paths' file/folder components or formatting independently authored expected literals is only abbreviation. Retained-document equality in contract 006 characterizes preservation; purpose and current/historical readiness facts are additionally checked against independent literals.

## Exact inputs and operations

Base input is the unchanged `I` and complete `C` in `../lifecycle/fixtures.ts`, including the five-key architecture, fifteen-key deployment contract and ten-field executable phase. All configuration, assets, approvals, paths and commands are fictional test data. No Rose & Paw decisions or real approvals are copied or inferred.

| Case | Source change from C | End state |
| --- | --- | --- |
| PC-001 | None; no manual flags | Fresh saved Draft |
| PC-002 | None | Fresh saved Ready |
| PC-003 | `workflowSteps = "TBD"` | Fresh saved Draft |
| PC-004 | Append the three exact `LC-*-ALT` Answered rows in `fixtures.ts`; preserve existing Square/USD/guest narrative | Three authoritative singleton conflicts; Draft |
| PC-005 | Append exact `PC-OPTIONAL` optional Deferred wish-list row | Ready, optional item visible |
| PC-006 | Append exact `PC-TAX` launch Not applicable row with meaningful reason | Ready, no operative Tax row/dependency |
| PC-007 | PC-006 plus exactly ` Calculate Canadian tax.` appended to acceptanceNotes | Launch conflict, Draft |
| PC-008 | From PC-002, update appPurpose to the approved keyboard-first literal | Retain old Ready documents, current Draft |
| PC-009 | Regenerate/save PC-008 without reverting its edited purpose | New purpose, fresh Ready |

Clock literals remain 2026-10-17 as approved; the implementation date does not change fixture time. At 12:00 create; 12:01 apply C plus the exact case changes; 12:02 generate; 12:03 save. PC-001 ends here. In other independent cases, at 12:04/05/06 set scopeReviewed/acceptanceCriteriaReviewed/draftPackageReviewed true through existing APIs; at 12:07 regenerate/save. For the linked sequence only, at 12:08 edit purpose; at 12:10 regenerate/save. All timestamps have `:00.000Z`. Export observations independently use `2026-10-17T13:00:00.000Z`.

## Literal state matrix

U/A/L are unresolved, architecture-blocking and launch-blocking decision counts. They are distinct categories; architecture blockers also prevent decision-layer launchReady without becoming launch-gate records. PlanningReady is true in every case.

| Case | Stored/display status | Stored review | Stamp minute | CR / checklist | U/A/L | Implementation/launch | Markers | Package |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PC-001 | Needs Review | Review needed | 03 | false, 9/12 | 0/0/0 | true/true | 0 | Draft |
| PC-002 | Ready for Codex | Approved | 07 | true, 12/12 | 0/0/0 | true/true | 0 | Ready for Codex |
| PC-003 | Needs Review | Review needed | 07 | false, 8/12 | 1/1/0 | false/false | 3 | Draft |
| PC-004 | Needs Review | Review needed | 07 | false, 9/12 | 3/2/1 | false/false | 3 | Draft |
| PC-005 | Ready for Codex | Approved | 07 | true, 12/12 | 1/0/0 | true/true | 0 | Ready for Codex |
| PC-006 | Ready for Codex | Approved | 07 | true, 12/12 | 0/0/0 | true/true | 0 | Ready for Codex |
| PC-007 | Needs Review | Review needed | 07 | false, 9/12 | 1/0/1 | true/false | 1 | Draft |
| PC-008 | Needs Review | Review needed | null | false, 11/12 | 0/0/0 | true/true | 0 | Draft |
| PC-009 | Ready for Codex | Approved | 10 | true, 12/12 | 0/0/0 | true/true | 0 | Ready for Codex |

All have nineteen nonblank core documents. PC-003 has `[MISSING: steps]` in Client Requirements and Workflow Map, plus `[MISSING: EC-FIELD-WORKFLOW-STEPS]` in Questions. PC-004 has exactly the three singleton conflict markers in Questions. PC-007 has one tax conflict marker in Questions. Orphans/prohibited content/missing documents/blank documents remain zero.

Calculated document status is separate from stored labels and package readiness. PC-003/004 have nineteen Draft documents. PC-007 has Questions and Deployment Draft, seven Review Required and ten Ready for Implementation. Other cases have seven Review Required and twelve Ready for Implementation. The seven filenames are independently listed in `expectations.ts`. No document becomes Not Applicable because tax is excluded.

Every case is structurally export-valid with no errors. Draft warnings are exactly the approved literal arrays: PC-001 has three readiness blockers; PC-003/004 have three marker occurrences and seven readiness blockers; PC-007 has one marker and five readiness blockers; PC-008 has one readiness blocker. Other cases have no warnings. These are existing export diagnostics, not a Preview blocker-count remediation.

## Inventory, manifests and projection limits

The nineteen literal paths and twelve folder/count pairs are independently enumerated in `expectations.ts`: counts 5,3,2,1,2,1,1,1,1,1,0,1. Eleven standard folders contain core documents; `10_Documentation` has zero. Additional diagnostics are `00_Project_Overview/EXPORT_MANIFEST.md` and `project-manifest.json`; they do not increase core counts.

Schema 3, fictional identity/client/type, root `lifecycle-test-store`, core counts 19, export time, stored statuses, marker/readiness/warning facts, folder counts and paths are pinned independently. JSON-only Ecommerce diagnostics retain all three decision counts, three flags and checklist counts. Markdown is checked only for existing shared summary, folders/files, diagnostics, warnings and errors; no new Ecommerce Markdown block is required.

Projection boundaries are literal section/table names in `contract.ts`:

- Questions: Decision records; Traceable unresolved requirements; Optional / deferred items. Validate source rows, effective decision IDs, gates/statuses, conflict contributors and visible source fields.
- Test Plan: commerce table before Recorded acceptance evidence. Acceptance: Commerce verification section. Each has its own literal required/forbidden facts, category and identifier inventory. Equal wrong output in both still fails independently.
- Acceptance/source evidence remains distinct from operative instructions. Conflict cases preserve legitimate Square/USD/guest mentions in ledger and attributed source evidence. No package-wide provider-name bans.
- Storefront/model/route/cart: only Scope, Requirements, Blueprint, Data, Screen, Workflow, Acceptance, Deployment and Phased Prompts have the complete existing storefront append.
- Complete architecture and deployment contracts: Deployment's Approved architecture and Web deployment contract sections. Blueprint, Architect and Codex instructions retain only their existing named source fields and role/scope boundaries.
- Phases: all ten authored fields when architecture permits them; PC-003/004 instead require the existing architecture-resolution phase and named prerequisite IDs.
- Fresh readiness: Normalized readiness in all nineteen; inherited identity/status headers in fourteen; twelve Handoff rows including actions; generation day in Change Log.
- Purpose: README Purpose; Scope/Requirements App purpose; Blueprint Purpose and boundaries/App purpose. PC-008 retains old text; PC-009 requires the edited text with no obsolete purpose.

PC-008 legitimately retains Ready/12-of-12 document text and the old purpose. Only current CR, package and newly constructed manifest remain Draft/11-of-12. A valid export does not assert approval or regenerate content. No hash, revision fingerprint, automatic freshness rule or generic mutation policy is added.

## Contracts and sensitivity coverage

| Contract | Cases | Main controls |
| --- | --- | --- |
| PB-INV-PACKAGE-001 inventory/manifests | PC-001–009 | NEG-001/002 and shared manifest error in NEG-012 |
| PB-INV-PACKAGE-002 decision traceability | PC-001–009 | NEG-003/008/009/010 |
| PB-INV-PACKAGE-003 commerce verification | PC-001–009 | NEG-004/005/006/007/009/015 |
| PB-INV-PACKAGE-004 configuration projections | PC-001–009 | NEG-011 |
| PB-INV-PACKAGE-005 fresh readiness/handoff | PC-001–007, PC-009 | NEG-012 |
| PB-INV-PACKAGE-006 named stale/regeneration sequence | PC-002/008/009 | NEG-013/014 |

There are 47 applicable contract applications. NEG-005 checks both artifact violation locations for the same wrong CAD result. NEG-006 covers all three choices in each artifact. NEG-007 covers all three conflicting choices in each artifact. NEG-014 covers all four purpose projections. NEG-015 distinguishes unsupported applicability from absent/duplicated required sections/tables. All corruptions are copies, never saved to production or injected fixture storage.

## Historical compatibility and exclusions

Preserve unchanged: `systemSingletonContract`, original `systemSingletonKnownDefect`, `defectCorpus`, `ecommerceMetamorphicProperties`, `systemLifecycleContract`; Ecommerce decision consistency, singleton fallback, Pass 4/5/9/18/19 and validation-boundary regressions; generation, Client Review, document review, readiness, export integrity and manifest suites; `projectBuilderCoreExtractionGolden` and `projectRepositoryStorage7`.

Historical correlated-selector expectations remain historical coverage, not this oracle's inputs. The approved synthetic compositions are bounded examples, not new business or transition policy. Preview blocker counting and Ecommerce decision-layer launchReady High findings remain open; observations pin existing distinct semantics without resolving either finding.

Excluded: ZIP/archive tests, other domains, arbitrary/malformed source exploration, generic parsers or package frameworks, migration/concurrency policy, Canvas record lifecycle, Planning/Controlled Apply/provenance, UI, production remediation, deployment and Phase 6D.6.

## Reproduction and required validation

Focused: `npx vitest run --config vitest.unit.config.ts src/tests/systemPackageCoherence.test.ts`.

Compatibility: relevant Ecommerce/generation/Client Review/document/readiness/export/manifest tests; all 6D.2/6D.3/6D.4 suites; Canvas golden and Storage 7. Full checks: `npm run lint`, `npx tsc --noEmit -p tsconfig.app.json`, `npm test`, `npm run test:coverage`, `npm run build`, `npm audit --omit=dev --audit-level=high`, and the existing advisory `npm audit --audit-level=high`. No dependencies, coverage gates, CI configuration or historical tests are changed.

Local results: 61 focused tests; 47 corruption controls across all fifteen families; 1,128 compatibility tests / 37 files; full tests and coverage each 4,628 tests / 129 files. Coverage statements/branches/functions/lines: 89.68%/82.54%/93.77%/92.71%. Lint, TypeScript, build and production audit pass (zero production vulnerabilities); the unchanged advisory development audit reports 34 vulnerabilities (one moderate, 33 high). No approved expectation exposed an unexpected production difference. Final SHA and exact-head CI are recorded in the PR completion report. Merge requires independent GPT Architect approval.
