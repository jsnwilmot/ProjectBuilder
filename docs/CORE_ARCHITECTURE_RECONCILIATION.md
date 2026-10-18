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

**2026-10-18 assessment finding — `PB-CORE-001`, Medium/P2 (unmerged code only):** The 6C.8R array validator checks own numeric indices and reads each value, but later reads them again during `new Set(value)` duplicate checking and during copying. A getter-backed applicability entry can return an initial valid string then `undefined`; the function still returns a frozen descriptor containing the invalid value. The reported probe showed three getter reads; the Architect independently reproduced this mechanism against the branch helper. **Integration is blocked** pending a separately authorized fix and tests for getter-backed/time-varying array entries. No current production consumer exists. **Architect disposition:** defer descriptor integration until a demonstrated consumer justifies it; do not widen the nine-field, text-only, zero-authority descriptor scope.

## Candidate future increments — NOT approved phase numbers

| Candidate gate | Bounded question / deliverable | Gate before implementation |
| --- | --- | --- |
| **CORE-REC** Read-only source inventory | **Completed** on `b595e561f7236a76ea5c26921634957987cecbce`; recorded verified primitives, candidates, cycles and unmerged branch hazard | Accepted for planning; no runtime changes or authority granted |
| **CORE-DESC** Domain descriptor integration decision | Does the closed text-only 6C.8 contract remain correct and compatible after 70 new main commits? | Explicit Architect contract approval and separate integration plan |
| **CORE-CHECKSUM** Read-only extraction design | Define exact compatibility vectors, source consumers and proposed minimal boundary for seven stable serialization / FNV-1a helper copies | **Assessment authorized only**; no implementation before independent literal checksum oracle and Architect scope gate |
| **CORE-REUSE** Reuse/complexity evidence | Where are concrete duplicated logic, unwanted dependencies, module size, or maintainability hazards? What must remain domain-owned? | Initial inspection found repeated helpers and cycles; any further extraction needs a per-call-site matrix |
| **CORE-DESIGN** Shared mechanism proposals | Are Evidence Core, Confirmation Core, domain registries/adapters, or narrower utilities justified? | Individually approved specification, explicit authority/persistence boundaries and independent tests |
| **CORE-IMPL** Incremental extraction | One approved mechanism and its existing consumers at a time | Exact baseline, golden/Storage/regression matrix, unmerged PR, Architect review |

These labels are **tracking labels**, not new authorized implementation phases.

## Assessment findings: duplication and coupling (2026-10-18)

The completed read-only Codex review (main SHA `b595e561f7236a76ea5c26921634957987cecbce`, unmerged descriptor head `e8af49b4cfca940c692a73188a7c9066155485e5`) identified **seven copies each** of `stableSortObject`, `stableStringify` and `fnv1a`, across implementation-asset, navigation, collection, state, form-mode, form-operation, and record-lifecycle generation. Some differ only in formatting. This is the strongest immediate evidence for a *pure helper* reuse decision. Exact current checksum bytes, object key ordering, array order, Unicode, CR/LF normalization, failure behavior, version strings, and all existing payload producers must be independently characterized **before** extraction. This is a design recommendation, not an approved production refactor.

Other candidates, not authorized: duplicate canonical text representation in Confirmation and Planning canonical-fact evidence; subsets of plain-object recognition helpers (other similarly named validators have different acceptance); recursive freeze utilities (some ordering differs); four equivalent Planning UTC timestamp validators (Confirmation and Controlled Apply differ); and structurally similar repository materialization shells (failure order, allocation and persistence differ). Do not abstract across these distinctions without evidence.

Large production modules reported by static source inspection: `implementationAssets.ts` ~3,604 lines, `powerPlatform.ts` ~2,773, `projectRepository.ts` ~2,492, `templates/documents/index.ts` ~2,389, `PowerPlatformIntake.tsx` ~1,675 and `planningProposals.ts` ~1,628. Observed import cycles: `powerPlatform` → `canvasTraceability` → Ecommerce/Website requirements → `projectFields` → `powerPlatform`; and `implementationAssets` ↔ `recordLifecyclePowerFxGeneration`. These are future characterization candidates, **not** permission for a broad module rewrite. Neither code size nor reuse establishes a browser bundle-size saving; a controlled measurement would be needed.

The Codex assessment was **read-only**; it did not run fresh full tests, coverage, build or CI. These observations must be independently verified against an exact future baseline before integration.

## Mandatory architectural safeguards

- Retain Storage 7 and its versioned persistence, migration, quarantine and provenance contracts. No Storage 8 or schema migration without explicit approval.
- Confirmation commits, the seven existing Canvas source identities, reconciliation, UUID allocation/collisions, and source authority remain owned by the present domain/repository boundaries.
- Keep Planning and Controlled Apply validation, history, decision, readiness, and write authority in their approved subsystems.
- Keep Ecommerce and Website requirements, decisions, and output semantics in their own approved project-type rules.
- Golden-reference, 6D.2 singleton, 6D.3 corpus, 6D.4 lifecycle, 6D.5 package-coherence and historical generation/export regressions must remain green.
- No universal permissions, automatic confirmation, client approval, readiness, canonicalization or output authority may emerge from a metadata contract.
- No second-domain wiring, `confirmedIntake` materialization, generic registry or adapter, UI, migration, external integration or deployment is authorized by read-only discovery.
- Historical Core review notes recorded TTI as Draft with 15 project-specific blockers. Those are not presumed resolved by the shared SHA/UUID primitives or by any future authority-free descriptor; TTI's approved project-specific Architect source controls its readiness and scope.

## Next Codex task — authorized READ-ONLY design only

**CORE-REC is completed** and accepted as architecture *assessment*, not as production implementation approval. Prepare a bounded **CORE-CHECKSUM compatibility design addendum**, covering exactly the seven reported current helper locations. For each call site, identify the exact source-defined payload, normalization, serialization, checksum format/version, stored/compared consumers and failure/rollback behavior. Independently author synthetic golden checksum vectors with explicit literal inputs and outputs; characterize Unicode, CR/LF, key order, array order, empty/nested inputs and current edge behavior. Show which helpers are truly byte-equivalent and which require caller-specific wrappers. Provide test-first sensitivity cases detecting an unintended checksum change, exact regression suites, and the smallest potential extraction diff. Do **not** create, modify, commit or PR code in this assessment. Explicitly block execution if a payload contract cannot be established; report it for Architect decision.

Do not modify the 6C.8 branch, begin 6D.6, write a shared checksum helper, refactor large modules, or add Evidence/Confirmation Core, registries or adapters. Descriptor integration is **deferred** pending a justified consumer and `PB-CORE-001` correction. PoC gates remain separately proposed in `docs/POC_READINESS_AND_ACCEPTANCE.md`.

**Next decision:** GPT Architect reviews the literal checksum oracle matrix before any implementation permission. A general Core rewrite is not authorized.
