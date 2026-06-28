# Next Steps

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
