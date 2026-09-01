# Next Steps

## Storage 7 release boundary

1. Keep Phase 5C.3C.3J.6B.10 on its review branch until independent GPT Architect approval.
2. Integrate Storage 7 and explicit confirmation persistence only as the complete atomic migration, provenance, reconciliation, central-writer, quarantine, confirmation-commit, replay, and race-recovery unit.
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
