# Project Builder Ai — Proof-of-Concept Readiness and Acceptance

**Status:** 2026-10-18 **PROPOSED acceptance plan — not yet approved**. Reference repository baseline: `b595e561f7236a76ea5c26921634957987cecbce`.

## PoC objective and product boundary

Demonstrate that a user can move from an idea to a complete or explicitly blocked, reviewable package containing project-specific requirements, architecture decisions, developer handoff and phased Codex instructions. **Project Builder Ai is a package and handoff generator, not an automatic application builder.** The PoC does not certify external client projects, authorize implementation, or grant production release approval.

The current MVP already implements intake, validation, Client Review, 19-document generation, readiness display, local persistence/lifecycle and ZIP export. Older Cloudflare production smoke and Windows ZIP results are historical; the **current merged SHA's deployment and PoC acceptance are unverified**.

## Proposed acceptance scenarios (owner / Architect must approve)

| ID | End-to-end demonstration | Expected evidence / rejection behavior |
| --- | --- | --- |
| **POC-01** | Complete representative project with explicitly supplied synthetic inputs and required reviews | Intake preserved; review/checklist and generated readiness consistent; 19 core documents, 12 folders and two diagnostic manifests; correct project-specific Architect/Codex handoff; export inspected |
| **POC-02** | Incomplete project / required decision unresolved | Exact missing information visible and traceable to source; Draft package may be generated/exported; no unsupported Ready-for-Codex or automatic approval |
| **POC-03** | Conflicting Ecommerce authoritative choices with legitimate narrative evidence | Original decisions visible; no unsupported operative provider/currency/checkout winner; architecture/launch blocking indicated in correct dimension |
| **POC-04** | Edit after saved generation, then explicit regeneration | Retained documents become stale without being silently rewritten or currently Ready; regeneration reflects changed inputs |
| **POC-05** | Project lifecycle / local persistence | Create, open, duplicate, archive, restore, reload, and confirmed delete preserve isolation and saved state |
| **POC-06** | Browser, accessibility and ZIP spot-check | Keyboard/focus and responsive basics verified; ZIP opens and manifest counts/paths match expected contract |

These are **candidate examples**, not newly approved user requirements. The PoC decision must specify which project types and scenarios are mandatory; do not assume all 16 selectable presets are acceptance-tested.

## Proposed evidence and release gates

1. **Scope approval:** Project owner and GPT Architect agree on the selected scenarios, representative input, pass/fail rubric, known limitations, and whether any open High findings must be fixed first.
2. **Exact-build verification:** Record source SHA, branch, CI run, production/preview deployment version and asset hashes. A prior deployed MVP is not proof of deployment of this SHA.
3. **Automated evidence:** Run the approved focused regressions plus full lint, typecheck, test/coverage and build on the exact release/PoC head; preserve 6D and Canvas/Storage golden suites.
4. **Manual evidence:** Run the recorded scenarios, inspect actual generated content (not only counts), save screenshots or a textual test record, and open ZIP in a compatible environment.
5. **Known findings:** Explicitly disposition `PB-OPEN-001` Preview blocker count and `PB-OPEN-002` decision-only `launchReady` before sign-off; either remediate under separate authorization or record a justified acceptance exception. Include local-only persistence and no import as documented limitations.
6. **Security/dependencies:** Record production audit, development advisory assessment and exceptions. Nonblocking CI audit treatment is not a blanket security sign-off.
7. **Sign-off:** Record operator, date, tested SHA, scenarios passed/failed, approved exceptions, Architect decision and accountable owner acceptance. Do not equate PoC approval with production release authorization.

## Decision record to complete before testing

- **PoC audience and purpose:** [UNCONFIRMED]
- **Mandatory project types / exact test inputs:** [UNCONFIRMED]
- **Mandatory scenarios / acceptance threshold:** [UNCONFIRMED]
- **Treatment of open High findings:** [UNCONFIRMED]
- **Required browsers and deployment target:** [UNCONFIRMED]
- **Owner / Architect sign-off and evidence location:** [UNCONFIRMED]

The **existing production release process** is documented separately in `RELEASE_OPERATIONS_CHECKLIST.md`; it requires owner approval and post-deployment smoke evidence. Do not merge PoC and production gates.

## Scope not automatically required for this PoC

Completing every unscoped future 6D.6–6D.8 test program, the entire Evidence/Confirmation Core, generic adapters/registries, ZIP import, cloud persistence, external AI, billing or additional project types **is not automatically a PoC prerequisite**. An Architect/owner decision must explicitly identify a necessary subset before implementation.

## Source links

See `docs/PROJECT_DELIVERY_ROADMAP.md` for current phase and findings, `docs/CORE_ARCHITECTURE_RECONCILIATION.md` for Core work, `APP_BLUEPRINT.md` for existing architecture, and `RELEASE_OPERATIONS_CHECKLIST.md` for release operations.
