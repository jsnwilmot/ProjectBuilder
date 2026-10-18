# Project Builder Ai — Delivery Roadmap and Decision Register

**Status snapshot:** 2026-10-18. **Verified repository baseline:** `b595e561f7236a76ea5c26921634957987cecbce` (merged PR #12). **Document owner:** GPT Architect; Codex is the Developer.

> This document coordinates existing decisions, completed evidence, open findings, and the next review gates. It does **not** approve new functionality, change the application's authority model, or supersede an explicitly approved phase specification. Verify GitHub state before acting; this is a dated snapshot.

## How to read this roadmap

- **Merged:** Verified in `main`; no further implementation is implied.
- **Implemented / unmerged:** Exists on a branch, but has no integration approval based solely on its existence.
- **Review / discovery authorized:** Read-only assessment only; no code, repository, schema, or production changes.
- **Proposed / not authorized:** Planning candidate requiring a separate GPT Architect decision and scoped readiness gate.
- **Open finding:** Must be reproduced, bounded, and dispositioned; a documented finding is not permission to remediate it.
- **PoC candidate gate:** Suggested evidence for a Proof of Concept, not yet an approved acceptance decision.

**Authority and handoff:** The accountable project/client owner makes business and release decisions; GPT Architect reviews scope, evidence, readiness, and Codex output; Codex implements *only* an explicitly authorized bounded phase. Each implementation PR requires independent exact-head testing and separate Architect merge authorization. No silent implementation, dependency, CI, Storage, permission, readiness, approval, deployment, or schema expansion.

## Current authoritative progress

| Workstream | Milestone | Current state | Evidence / next gate |
| --- | --- | --- | --- |
| Ecommerce quality 6D | 6D.2 singleton invariants | **Merged** | PR #8 and production correction PR #9; do not reopen absent a new defect |
| Ecommerce quality 6D | 6D.3 defect corpus / bounded transformations | **Merged** | PR #10 |
| Ecommerce quality 6D | 6D.4 lifecycle foundation | **Merged** | PR #11, merge `d278b040477ddf5cc44c2169f50d5fa14db1dfe7` |
| Ecommerce quality 6D | 6D.5 package coherence | **Merged** | PR #12, merge `b595e561f7236a76ea5c26921634957987cecbce`; exact-head CI #137 passed before merge |
| Ecommerce quality 6D | 6D.6 determinism / source isolation | **Proposed, not authorized** | Establish read-only scope, baseline and independently authored contracts before implementation |
| Ecommerce quality 6D | 6D.7 reproducible fuzzing | **Proposed, not authorized** | Define bounded seeds, reproducibility, safety constraints and acceptance criteria before implementation |
| Ecommerce quality 6D | 6D.8 feedback integration | **Proposed, not authorized** | Define how review evidence becomes a permanent regression without creating product authority |
| Reusable Project Builder Core | 6C.2 Canvas golden baseline | **Merged** | `src/tests/projectBuilderCoreExtractionGolden.test.ts` |
| Reusable Project Builder Core | 6C.3 SHA-256 Core | **Merged** | `src/core/sha256Fingerprint.ts` |
| Reusable Project Builder Core | 6C.4 canonical UUID Core | **Merged** | `src/core/canonicalUuid.ts` |
| Reusable Project Builder Core | 6C.6 SHA-256 hex predicate | **Merged** | `src/core/sha256Fingerprint.ts` |
| Reusable Project Builder Core | 6C.8 / 6C.8R domain fact descriptor | **Unmerged; integration blocked by Medium/P2 validation gap** | `review/phase-5c3c3j6c8-domain-fact-descriptor-foundation`; variable getter-backed applicability can return invalid metadata; no runtime consumers. Defer integration unless justified by a separately approved consumer and correction. |
| Reusable Project Builder Core | CORE-REC read-only architecture reconciliation | **Completed; accepted as design evidence only** | Codex report on main `b595e561f7236a76ea5c26921634957987cecbce`; no code/CI run in that assessment. See Core reconciliation record. |
| Reusable Project Builder Core | CORE-CHECKSUM bounded extraction design | **Completed; design accepted, no implementation** | [Checksum Compatibility Design](CORE_CHECKSUM_COMPATIBILITY_DESIGN.md) pins 7 locations, 19 structured / 9 raw literal cases and asset checksum invariants. Integration awaits docs PR #13 owner/release gate and new exact-baseline authorization. |
| Reusable Project Builder Core | Evidence/Confirmation Core, registries, adapters, broader extraction | **Not implemented / not authorized** | See `docs/CORE_ARCHITECTURE_RECONCILIATION.md`; do not infer phase numbering |
| Functional Proof of Concept | End-to-end demonstration, current-build verification and acceptance | **Not yet approved / signed off** | Proposed evidence in `docs/POC_READINESS_AND_ACCEPTANCE.md` |
| Production release | Promotion of a newly approved `main` build | **Not authorized by this roadmap** | Separate owner decision; follow `RELEASE_OPERATIONS_CHECKLIST.md` |

The deployed MVP described in older release reports is historical evidence, **not proof that today's `main` is running in production or that October findings are closed**.

## Open findings and follow-up register

| ID | Finding | State / evidence | Required next action | Implementation gate |
| --- | --- | --- | --- | --- |
| `PB-OPEN-001` | Preview readiness blocker-count double counting | **Open High finding** from prior 6D assessment; reported Preview count 53 versus a 26 + 1 = 27 breakdown. Not newly reproduced on this snapshot. | Read-only reproducer and exact source/count mapping; Architect disposition. | No remediation without a separate scoped authorization and tests. |
| `PB-OPEN-002` | Ecommerce `launchReady` can be confused with full package/release readiness | **Open High semantic finding**; current `launchReady` is decision-layer readiness only. | Read-only UI/consumer and label impact analysis; distinguish release, package, Client Review, and decision states. | No renaming, calculation, or authority change without separate authorization. |
| `PB-OPEN-003` | Development-only dependency advisories | **Open maintenance issue #7**; latest 6D.5 CI #137 reported 13 all-dependency findings and zero production vulnerabilities. Older local reports counted 34; environment/lockfile differences must be reconciled. | Assess exact advisories against current lockfile and approved security policy. | CI advisory handling is currently non-blocking; no dependency or policy change is authorized here. |
| `PB-OPEN-004` | Browser-local data / no package import | **Known MVP limitation, not an implementation defect**: no in-app ZIP restoration or cross-device sync. | Explicitly disclose in PoC; determine future scope only if the owner requests it. | Import, backend, accounts, and synchronization remain excluded without new architecture approval. |
| `PB-OPEN-005` | Firefox-specific production smoke evidence | **Historical evidence gap** in release report; exact current-build status unverified. | Run on an available Firefox environment when included in approved acceptance scope, or record a signed exception. | No claim of cross-browser completion absent evidence. |
| `PB-OPEN-006` | Release audit gate vs CI advisory handling | **Unresolved documentation/policy discrepancy**: `RELEASE_OPERATIONS_CHECKLIST.md` treats `npm.cmd audit` as a required pass/fail release gate, while GitHub CI currently records the all-dependency audit as non-blocking. | Ask release owner to decide the approved release treatment for development-only advisories; preserve actual CI audit evidence. | Do not silently rewrite the release gate or mark it passed because the CI job is green. |
| `PB-CORE-001` | 6C.8R descriptor array accessor is read repeatedly, permitting a mutated getter to yield invalid copied applicability | **Medium/P2, open on unmerged branch only; not a main-branch production defect**. Codex supplied a reproducer; GPT Architect independently reproduced the helper behavior. | If descriptor integration is later justified, correct and test fail-closed capture/validation semantics, preserve closed nine-field contract, reconcile branch with current main. | No 6C.8 integration, rebase, or remediation authorized by this report. |

**Separate downstream project note:** Historical Core-phase review instructions reported the TTI Software Licence Tracker example as Draft with 15 blockers. This is **not newly verified** by the 2026-10-18 Project Builder snapshot, and no Core extraction or 6D regression closes those TTI project-specific decisions. Treat its separately approved Architect Instructions as the authority for that project; do not infer its implementation readiness from Project Builder progress.

**Resolved historical item:** Business Website compound capability handling in PR #4 is **merged** (merge `11057eaf60b4e39cacbc334248ca29ee77801401`). The old `NEXT_STEPS.md` instruction to wait for the `fix/compound-capability-replacement` branch was obsolete: that branch is already an ancestor of current `main`. This does not automatically approve or regenerate any affected client's saved package.

## Next phase gates (no implicit implementation approval)

**Gate 0 — Maintain the verified baseline.** The latest integration is PR #12 on `main`. Any next Codex assignment must inspect the then-current remote SHA, identify new changes and confirm there is no competing incompatible work.

**Gate 1 — Separate read-only work.** Codex has **completed** both CORE-REC and the bounded CORE-CHECKSUM compatibility design against `b595e561f7236a76ea5c26921634957987cecbce`; Architect independently verified the design's vectors and restricted interface. The design and expectations are preserved in `docs/CORE_CHECKSUM_COMPATIBILITY_DESIGN.md`. **No Core production extraction or 6C.8 descriptor integration is approved.** Next gate: integrate documentation PR #13 after exact-head CI/independent review and explicit owner-release merge authorization; only then consider a fresh-baseline checksum implementation instruction. The 6D.6 workstream is distinct and not implicitly authorized.

**Gate 2 — Review documented open High findings.** Reproduce `PB-OPEN-001` and `PB-OPEN-002`; record impact, proposed scope, compatibility constraints, and Architect remediation disposition. Do not silently claim either resolved.

**Gate 3 — Decide what PoC actually requires.** A proposed, unapproved PoC checklist exists in `docs/POC_READINESS_AND_ACCEPTANCE.md`. Architect and release/business owner must decide mandatory cases, allowed limitations, and sign-off criteria. Completion of every speculative Core or 6D phase is **not automatically** a PoC prerequisite.

**Gate 4 — Authorize one bounded implementation at a time.** Before any 6D.6, Core extraction, or defect fix: provide exact fixture/input/output authority, out-of-scope list, expected regressions, source changes, test method, and stop conditions. Implement in an unmerged PR; independent review precedes merge. Keep deployment a separate owner gate. The Core checksum design may be assessed read-only now; **no implementation** follows without an explicit Architect design-gate disposition.

## Handoff / update procedure

At **every** Architect review, Codex handoff, or merge:
1. Record the exact tested feature SHA, base SHA, CI run, changed files, PR decision, and merge SHA where applicable.
2. Update this table and the finding register only for verified changes. Label unknowns explicitly.
3. Distinguish **code merged**, **deployed**, **tested in a browser**, **PoC accepted**, and **business-approved**; none implies the others.
4. Record one explicit next authorized action and one list of deferred/not-authorized actions.
5. Do not modify historical release evidence to make it appear current. Older `NEXT_STEPS`, `RELEASE_READINESS_REPORT`, and dated task reports are snapshots; consult this dated coordination record and the newest approved phase decision for current work.

## Sources / traceability

- PRs #8–#12 (6D.2–6D.5), especially [PR #12](https://github.com/jsnwilmot/ProjectBuilder/pull/12) and [CI #137](https://github.com/jsnwilmot/ProjectBuilder/actions/runs/39133429107).
- [PR #4](https://github.com/jsnwilmot/ProjectBuilder/pull/4) (Business Website historical correction).
- [Issue #7](https://github.com/jsnwilmot/ProjectBuilder/issues/7) (dependency advisory maintenance).
- `APP_BLUEPRINT.md`, `CODEX_INSTRUCTIONS.md`, `RELEASE_OPERATIONS_CHECKLIST.md`, `docs/ecommerce-draft-remediation.md`, `docs/business-website-package-generation.md`.
- Companion records: `docs/CORE_ARCHITECTURE_RECONCILIATION.md` and `docs/POC_READINESS_AND_ACCEPTANCE.md`.
