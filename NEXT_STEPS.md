# Next Steps

## Phase 5C.3C.3J.6C.8 review boundary

1. Keep `review/phase-5c3c3j6c8-domain-fact-descriptor-foundation` for independent GPT Architect review.
2. Treat `DomainFactDescriptor` as authority-free, text-only code-owned metadata; it is not a source, value, event, canonical fact, approval, readiness result, or output contract.
3. Keep the validation-contract identifier deferred and preserve the existing Canvas registry and accessor runtime unchanged; Canvas compatibility exists only as a test projection.
4. Do not create a generic registry or domain adapter, extract Confirmation or Evidence contracts, modify Storage or `projectRepository`, add a second domain, or grant downstream authority without later Architect authorization.
5. TTI remains Draft with all 15 blockers; this generic contract resolves none of them.

## Phase 5C.3C.3J.6C.4 review boundary

1. Keep `review/phase-5c3c3j6c4-core-canonical-uuid` for independent GPT Architect review.
2. Treat `src/core/canonicalUuid.ts` as a narrow syntax predicate only; it does not authorize generic identity infrastructure.
3. Preserve UUID generation, allocation ordering, collision domains, forbidden UUID sets, retry behavior, timestamp validation, repository persistence, and subsystem issue codes inside their current subsystems.
4. Do not extract confirmation provenance, transaction contracts, repository behavior, registries, adapters, UI, `confirmedIntake` materialization, readiness authority, Controlled Apply authority, Storage schemas, migrations, or project-type behavior without a later approved phase.
5. TTI remains Draft with 15 blockers; this core primitive resolves none of those project-specific blockers.

## Phase 5C.3C.3J.6C.3 review boundary

1. Keep `review/phase-5c3c3j6c3-core-sha256-primitive` for independent GPT Architect review.
2. Treat `src/core/sha256Fingerprint.ts` as a narrow domain-neutral primitive only; it does not authorize broader Project Builder Core extraction.
3. Preserve the Planning compatibility wrapper and keep Confirmation value serialization in the Confirmation boundary.
4. Do not extract repository behavior, confirmation provenance, transaction contracts, source authority, registries, adapters, UI, `confirmedIntake` materialization, readiness authority, Controlled Apply behavior, Storage schemas, migrations, or project-type behavior without a later approved phase.
5. TTI remains Draft with 15 blockers; this core primitive resolves none of those project-specific blockers.

## Phase 5C.3C.3J.6C.2 review boundary

1. Keep `review/phase-5c3c3j6c2-canvas-golden-reference` for independent GPT Architect review.
2. Treat the Canvas golden-reference suite as the behavioral extraction safety contract before any Project Builder Core refactor.
3. Do not refactor or move Canvas-derived production architecture until GPT Architect approves the extraction phase.
4. Keep Storage 7 unchanged and keep confirmation UI, `confirmedIntake` materialization, second reference-domain implementation, and project-type expansion unauthorized.
5. TTI remains Draft with 15 blockers; the golden-reference tests resolve none of those project-specific blockers.
6. Do not treat future approved core directories, domain registries, domain adapters, or Canvas adapters as golden-reference failures when the exercised Canvas contracts remain equivalent.

## Storage 7 release boundary

1. Keep the corrected Phase 5C.3C.3J.6B.10 review branch until independent GPT Architect re-review.
2. Integrate Storage 7 and explicit confirmation persistence only as the complete atomic migration, provenance, reconciliation, central-writer, quarantine, confirmation-commit, replay, race-recovery, and full serializer-integrity unit.
3. Once Storage 7 is written in production, never redeploy a Storage-6-only build against `gpt-project-builder.storage.v2`.
4. Any rollback or emergency hotfix after production Storage 7 adoption must remain Storage-7-aware; backward writes are not supported.
5. Do not add confirmation UI, `confirmedIntake` sources, readiness/output authority, or resolve TTI blockers without a later explicit Architect phase.

## Use This Project Package

1. Review `PROJECT_SCOPE.md`.
2. Resolve all `[MISSING: ...]` markers.
3. Review `CLIENT_REQUIREMENTS.md` with the client.
4. Review `APP_BLUEPRINT.md` as the Architect.
5. Copy `ARCHITECT_INSTRUCTIONS.md` into the GPT Architect project or chat.
6. Copy `CODEX_INSTRUCTIONS.md` into Codex setup, `AGENTS.md`, or repository instructions.
7. Open `PHASED_CODEX_PROMPTS.md`.
8. Run Phase 1 only in Codex.
9. Paste Codex's completion report back into GPT Architect.
10. GPT reviews Codex output and writes the next phase prompt.

Draft generation and export are allowed with visible missing markers. Do not mark a project Ready for Codex until required missing fields reach zero.

## Release decisions and launch actions

**Hosting target selected: Cloudflare Workers Static Assets**

1. Obtain production release approval from Jason Wilmot, Rose & Paw Digital Designs.
2. Push only a fully verified, clean `main` branch to GitHub.
3. Allow the confirmed Cloudflare Workers Builds Git integration to deploy the approved `main` commit to the existing `projectbuilder` Worker.
4. Use `npm.cmd run deploy` only as an explicitly approved manual fallback.
5. Verify `https://projectbuilder.jsnwilmot.workers.dev/`; record the commit, Worker version, deployment timestamp, and production asset hash; and confirm the asset matches the verified local build.
6. Repeat the production smoke test and release-owner sign-off in `RELEASE_OPERATIONS_CHECKLIST.md`.
7. Retain the completed physical-keyboard and Windows Explorer ZIP evidence in the release report.
8. Confirm the documented rollback process using Cloudflare Worker version history.
9. Add a custom domain only after separate approval.
10. Decide later if project package import belongs in a future version.

## Deferred decisions

- Production release owner: Jason Wilmot, Rose & Paw Digital Designs.
- `[MISSING DECISION: Decide whether project package import belongs in a future version. Import remains explicitly excluded from the MVP.]`
