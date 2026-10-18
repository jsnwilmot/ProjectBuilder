# Project Builder Core — Reconciliation and Phased Architecture Backlog

**Status:** 2026-10-18 read-only architecture tracking. **Baseline:** `b595e561f7236a76ea5c26921634957987cecbce`. **No new Core implementation approved.**

## Original objective

Extract **proven reusable mechanisms**, not all project-type behavior, so Project Builder can support more project domains without multiplying duplicate code. Preserve independent domain business rules, evidence ownership, authorization and readiness policies. Shared code does not automatically reduce the browser bundle; measure source duplication and bundle effects separately.

## Verified completion map

| Historical increment | Integrated result | Limits |
| --- | --- | --- |
| `5C.3C.3J.6C.2` | Canvas golden-reference safety suite in `src/tests/projectBuilderCoreExtractionGolden.test.ts` | Regression guard, not a reusable runtime |
| `5C.3C.3J.6C.3` | Domain-neutral `computeSha256Hex` in `src/core/sha256Fingerprint.ts` | Planning wrapper and Confirmation serialization remain domain-owned |
| `5C.3C.3J.6C.4` | Domain-neutral `isCanonicalUuid` in `src/core/canonicalUuid.ts` | UUID allocation, collision, persistence, and issue codes remain subsystem-owned |
| `5C.3C.3J.6C.6` | `isSha256Hex` predicate in the existing SHA-256 module | No universal evidence or confirmation semantics |
| `5C.3C.3J.6C.8` + `6C.8R` | Proposed `DomainFactDescriptor` and test suite on **unmerged branch** | Pure, immutable text-only metadata, authority-free; **not currently in main** |

Current `src/core/` on `main` contains **two** files: `canonicalUuid.ts` and `sha256Fingerprint.ts`. The broader Core extraction has **not** been implemented, as `APP_BLUEPRINT.md` expressly states.

## Unmerged branch and reconciliation gate

Branch: `review/phase-5c3c3j6c8-domain-fact-descriptor-foundation`.

As of this snapshot it has **2 commits unique to the branch and is 70 commits behind `main`**. Files proposed there include `src/core/domainFactDescriptor.ts`, `src/tests/domainFactDescriptor.test.ts`, and older documentation changes. Its 6C.8R correction rejects sparse or inherited project-type array entries.

**Do not merge, rebase, or cherry-pick simply because historical tests passed.** First compare the contract to current source registries, Storage 7 invariants, Canvas golden suite, and the completed Ecommerce/Website behavior. Old branch documentation must not overwrite newer main documentation. Obtain independent Architect review and exact-head testing on an approved integration candidate before merging.

## Candidate future increments — NOT approved phase numbers

| Candidate gate | Bounded question / deliverable | Gate before implementation |
| --- | --- | --- |
| **CORE-REC** Read-only source inventory | Which primitives, wrappers, contracts, test guards and duplicated responsibilities exist today? | Verify current baseline and read-only findings; no commits/PR needed for assessment |
| **CORE-DESC** Domain descriptor integration decision | Does the closed text-only 6C.8 contract remain correct and compatible after 70 new main commits? | Explicit Architect contract approval and separate integration plan |
| **CORE-REUSE** Reuse/complexity evidence | Where are concrete duplicated logic, unwanted dependencies, module size, or maintainability hazards? What must remain domain-owned? | Exact call-site map, example cases and preservation strategy; no generic extraction by intuition |
| **CORE-DESIGN** Shared mechanism proposals | Are Evidence Core, Confirmation Core, domain registries/adapters, or narrower utilities justified? | Individually approved specification, explicit authority/persistence boundaries and independent tests |
| **CORE-IMPL** Incremental extraction | One approved mechanism and its existing consumers at a time | Exact baseline, golden/Storage/regression matrix, unmerged PR, Architect review |

These labels are **tracking labels**, not new authorized implementation phases.

## Mandatory architectural safeguards

- Retain Storage 7 and its versioned persistence, migration, quarantine and provenance contracts. No Storage 8 or schema migration without explicit approval.
- Confirmation commits, the seven existing Canvas source identities, reconciliation, UUID allocation/collisions, and source authority remain owned by the present domain/repository boundaries.
- Keep Planning and Controlled Apply validation, history, decision, readiness, and write authority in their approved subsystems.
- Keep Ecommerce and Website requirements, decisions, and output semantics in their own approved project-type rules.
- Golden-reference, 6D.2 singleton, 6D.3 corpus, 6D.4 lifecycle, 6D.5 package-coherence and historical generation/export regressions must remain green.
- No universal permissions, automatic confirmation, client approval, readiness, canonicalization or output authority may emerge from a metadata contract.
- No second-domain wiring, `confirmedIntake` materialization, generic registry or adapter, UI, migration, external integration or deployment is authorized by read-only discovery.
- Historical Core review notes recorded TTI as Draft with 15 project-specific blockers. Those are not presumed resolved by the shared SHA/UUID primitives or by any future authority-free descriptor; TTI's approved project-specific Architect source controls its readiness and scope.

## Deliverable for next Codex task (not yet dispatched)

The GPT Architect's **read-only Core architecture reconciliation** should return: current exact SHA; history and branches; consumer/dependency map; measurable duplication vs merely similar logic; review of 6C.8/6C.8R relative to `main`; candidate minimal increments; regression/authority risks; and readiness gates. Report discrepancies/unknowns explicitly. Do **not** write files, implement, create a branch/PR, or merge.

**Next decision:** GPT Architect reviews the assessment and decides whether to authorize a *specific* bounded design or implementation increment. The proof-of-concept gate is tracked separately; all Core candidates are not presumed PoC blockers.
