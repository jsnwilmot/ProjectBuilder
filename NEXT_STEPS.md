# Next Steps — Current Project Delivery Gates

**Updated:** 2026-10-18. **Implementation baseline:** `831b2b455d19c2f67d4296ef980887a4ad383be9` (PR #13 merged). This routing summary does not grant additional scope. See [Project Delivery Roadmap](docs/PROJECT_DELIVERY_ROADMAP.md) and the separate [Issue #14 authorization](https://github.com/jsnwilmot/ProjectBuilder/issues/14).

## Immediate project position

- **Ecommerce 6D.2–6D.5:** merged and complete as scoped. Latest: [PR #12](https://github.com/jsnwilmot/ProjectBuilder/pull/12), exact-head [CI #137](https://github.com/jsnwilmot/ProjectBuilder/actions/runs/39133429107), merge `b595e561f7236a76ea5c26921634957987cecbce`.
- **Ecommerce 6D.6–6D.8:** planned labels only; **no design/implementation/merge/deployment authorization**. Each requires an independent read-only assessment and Architect gate.
- **Project Builder Core:** 6C.2/3/4/6 are merged. The **read-only Core reconciliation is complete**; it identified seven repeated checksum-mechanics helper sets and a new Medium/P2 getter-validation defect in unmerged 6C.8/6C.8R. **Descriptor integration is deferred** until there is a justified consumer and separately authorized correction. [Core findings and phased backlog](docs/CORE_ARCHITECTURE_RECONCILIATION.md).
- **Proof of Concept:** functional MVP exists; [candidate PoC acceptance plan](docs/POC_READINESS_AND_ACCEPTANCE.md) is **not yet approved**. Neither older MVP release evidence nor green CI alone proves that the latest build is deployed or PoC-accepted.
- **Open High findings:** Preview blocker double counting (`PB-OPEN-001`) and Ecommerce decision-layer `launchReady` semantics (`PB-OPEN-002`) require read-only triage and separate Architect decision before remediation. Development audit maintenance is tracked in [issue #7](https://github.com/jsnwilmot/ProjectBuilder/issues/7).
- **Business Website correction:** PR #4 **already merged**. The old instruction to review the historical `fix/compound-capability-replacement` branch is superseded. Previously generated client packages still require explicit regeneration and client review.

## Exact next Architect/Codex sequence

1. **Current state:** Issue #14 authorizes only CORE-CHECKSUM implementation from exact main `831b2b4`. It is implemented on `codex/core-checksum-extraction`, **unmerged** and awaiting independent review; no other implementation is authorized.
2. **Current Core gate:** review the extracted three helpers, seven consumers, 109 new focused tests and complete validation/CI evidence. The [Checksum Compatibility Design](docs/CORE_CHECKSUM_COMPATIBILITY_DESIGN.md) is preserved unchanged. All payloads, public wrappers, versions, approval and authority behavior must remain equivalent. Descriptor integration remains deferred.
3. **Separate quality workstream:** scope 6D.6 determinism/source isolation in a read-only design assessment **only after explicit Architect authorization**; do not import assumptions from the Core work.
4. **Defect follow-up:** obtain exact reproductions and a disposition for `PB-OPEN-001`/`PB-OPEN-002`; remediation is not approved by their inclusion in this document.
5. **PoC:** approve or revise the candidate acceptance scenarios, identify required current-build evidence and open-finding treatment, then perform a controlled verification and record owner sign-off.
6. **For any implementation:** approved baseline and limits → Codex separate feature branch/unmerged PR → independent tests and exact-head CI → GPT Architect review → explicit merge authorization → merge verification. Deployment remains a **separate** release-owner gate.
7. **After each integration:** update `docs/PROJECT_DELIVERY_ROADMAP.md`, this page and `CHANGE_LOG.md` with verified PR, exact SHA, CI evidence, remaining findings and next permitted action; never rewrite older release evidence as if current.

## Use a generated Project Builder package

1. Review `PROJECT_SCOPE.md`; resolve required `[MISSING: ...]` items with the accountable client.
2. Review `CLIENT_REQUIREMENTS.md`, `APP_BLUEPRINT.md` and the decision register against actual source inputs.
3. Review `ARCHITECT_INSTRUCTIONS.md` with GPT Architect. Copy `CODEX_INSTRUCTIONS.md` to Codex only for an approved implementation.
4. Inspect `PHASED_CODEX_PROMPTS.md`; run **only the authorized next phase**. Return Codex's completion report and evidence for independent review.
5. Treat Draft export, Client Review checks, decision-layer flags, and Ready for Codex as **distinct** dimensions. A generated package is not an approval of the resulting client application.

## Release and storage boundaries

- Production promotion requires the **release owner's explicit authorization**, a clean verified `main`, current artifact/asset correlation, and smoke evidence under [Release Operations Checklist](RELEASE_OPERATIONS_CHECKLIST.md). Do not assume a documentation-only PR authorizes deployment.
- The production target described in existing deployment notes is Cloudflare Workers Static Assets. The active production asset for this baseline has **not** been verified by this documentation task.
- **Storage 7 is canonical.** Never roll back to a Storage-6-only writer against browser data that may contain Storage 7. Preserve migration and provenance boundaries.
- Projects are browser-local; ZIP import, cloud sync, authentication and external AI are outside the current MVP without new decisions. Clearing browser storage can lose projects.

## Historical references and precedence

The previous `NEXT_STEPS.md` mixed historical review-branch handoffs with current actions (including now-merged Core/Website work). Historic exact-SHA evidence remains in `CHANGE_LOG.md`, `TEST_PLAN.md`, GitHub PRs, and dated reports. This summary **does not override** newer explicit approved architecture or a Codex phase contract. If evidence conflicts, verify and report it before implementation.

**Next authorized action:** independent GPT Architect review of the unmerged CORE-CHECKSUM PR and exact-head test/CI evidence. Current audits retain zero production vulnerabilities and 13 development findings (four moderate, nine high); PR #13's one-time advisory exception has expired for this work. Separate merge and release-owner advisory disposition are required. No deployment, 6C.8 integration, broader Core work or 6D.6 implementation is authorized.
