# Next Steps

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

**Hosting target selected: Cloudflare Pages**

1. Assign the production release owner.
2. Push a clean `main` branch to GitHub.
3. Deploy to Cloudflare Pages with `npm run build`, output directory `dist`, repository root, and no environment variables.
4. Run and record the post-deployment smoke test in `DEPLOYMENT_NOTES.md`.
5. Download the production ZIP and complete the Windows Explorer inspection.
6. Confirm the documented rollback process using Cloudflare Pages deployment history.
7. Add a custom domain if approved after the `pages.dev` deployment passes.
8. Decide later if project package import belongs in a future version.

## Deferred decisions

- `[MISSING DECISION: Assign the production release owner.]`
- `[MISSING DECISION: Decide whether project package import belongs in a future version. Import remains explicitly excluded from the MVP.]`
