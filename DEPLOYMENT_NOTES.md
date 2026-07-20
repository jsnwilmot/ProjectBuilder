# Deployment Notes

## Deployment status

**Approved hosting target: Cloudflare Workers Static Assets**

**Confirmed production mechanism: Cloudflare Workers Builds Git integration**

The production Worker is named `projectbuilder` and is available at:

https://projectbuilder.jsnwilmot.workers.dev/

The app remains a static React/Vite single-page application with browser `localStorage` persistence. It does not require Worker runtime code, authentication, external AI calls, cloud synchronization, or runtime environment variables.

Production deployments are created automatically when an approved commit is pushed to `main`. This was verified on July 4, 2026 by correlating three consecutive `main` commits with active Worker deployments created less than one minute later. A feature-branch push created a non-active Worker version instead of replacing production. The repository has no GitHub Actions deployment job.

The manual `npm.cmd run deploy` Wrangler command remains an emergency or operator-approved fallback. It is not the normal automatic production path.

Cloudflare CLI output does not expose the connected repository or production-branch settings. The release owner should verify those settings in **Cloudflare Dashboard → Workers & Pages → projectbuilder → Settings → Builds**. Active production history is under **Workers & Pages → projectbuilder → Deployments**.

## Verified deployment contract

| Setting | Value |
| --- | --- |
| Cloudflare product | Workers Static Assets |
| Worker name | `projectbuilder` |
| Node.js | `>=22.0.0` for Wrangler 4.107.0 |
| Install command | `npm.cmd ci` |
| Test command | `npm.cmd test` |
| Build command | `npm.cmd run build` |
| Build output | `dist` |
| Automatic deploy trigger | Approved push to `main` through Cloudflare Workers Builds |
| Manual fallback | `npm.cmd run deploy` |
| Production URL | `https://projectbuilder.jsnwilmot.workers.dev/` |
| Environment variables | None required |

`wrangler.jsonc` is the Worker packaging source of truth. It deploys `./dist` as static assets, uses the existing `projectbuilder` Worker, and applies `single-page-application` fallback handling. No Worker script is required.

## Deployment evidence

Before this release-operations documentation commit:

- Active Worker version: `49f02c14-8d57-49b6-8a17-242d4788e774`.
- Deployment timestamp: `2026-07-04T15:18:24.328Z`.
- Correlated `main` commit: `8b0a2c8`.
- Production JavaScript asset: `/assets/index-D0rAfovZ.js`.
- Production CSS asset: `/assets/index-DGk6c80k.css`.
- Verified local `main` assets: `/assets/index-D0rAfovZ.js` and `/assets/index-DGk6c80k.css`.

Final production verification confirmed that the deployed assets match the verified local `main` build. An older browser tab initially retained `/assets/index-D9KLrGTS.js`; the final fresh production read resolved to the current asset. Future production updates are not complete until the cache-bypassed production HTML references the same content-hashed files as the verified local build.

## Deployment checklist

1. Obtain approval from Jason Wilmot, Rose & Paw Digital Designs.
2. Confirm `main` is clean and matches `origin/main`.
3. Run `npm.cmd ci`.
4. Run `npm.cmd test`, `npm.cmd run test:coverage`, and `npm.cmd run lint`.
5. Run `npm.cmd run build`.
6. Run `npm.cmd audit`.
7. Run `git diff --check`.
8. Run `npm.cmd exec wrangler -- deploy --dry-run` to validate the Worker configuration and asset bundle.
9. Push the approved commit to `origin/main`.
10. Confirm Cloudflare Workers Builds creates a new active deployment.
11. Record the deployed Git commit, Worker version ID, deployment timestamp, and production asset hash.
12. Confirm the production asset hash matches the verified local build.
13. Open the production URL and run the post-deployment smoke test.

Use `npm.cmd run deploy` only when the automatic path is unavailable and the release owner explicitly approves the manual fallback.

## Routing and static assets

The production build emits `dist/index.html` and content-hashed JavaScript and CSS under `dist/assets/`.

Wrangler uses:

```json
{
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application"
  }
}
```

Unknown browser navigation paths fall back to `index.html`. Static asset requests continue to resolve from `dist`.

## Persistence and backup limitation

Projects are stored only in `localStorage` for the current browser profile and origin. They do not synchronize across browsers, profiles, devices, or domains. Clearing site data removes projects.

Users should generate and download a ZIP before clearing browser data. ZIP import remains deferred, so an export is a handoff and backup artifact, not an in-app restore mechanism.

## Security and cache recommendations

No secrets, credentials, environment variables, network APIs, or raw HTML injection are required by the MVP. Keep secrets out of client code and Wrangler configuration.

- Serve `index.html` with revalidation.
- Serve content-hashed files under `/assets/` with a long immutable cache policy.
- Do not apply an immutable cache policy to `index.html`.
- Confirm matching HTML and asset versions after deployments and rollbacks.

## Rollback

1. Record the failed Worker deployment and version ID.
2. Stop release promotion and preserve smoke-test evidence.
3. Use Cloudflare Worker version history or `wrangler rollback` to restore the last known-good version.
4. Re-run the production smoke test.
5. Confirm existing browser-local projects still load.

Rollback restores application assets only. It cannot restore browser data that a user cleared.

## Post-deployment smoke test

1. Open the production URL and confirm the Project Builder Ai identity.
2. Confirm the page renders without a blank screen, framework overlay, console errors, or horizontal overflow.
3. Create a project and confirm project type is required.
4. Confirm Business website, Game, Dashboard, API, and internal-tool questions change appropriately.
5. Confirm structured branding appears only where expected.
6. Generate a Draft package and confirm `[MISSING: ...]` markers remain visible.
7. Confirm Ready for Codex is blocked until required intake is complete.
8. Complete required intake and confirm Ready for Codex succeeds.
9. Confirm all 19 core documents, including `BRAND_GUIDE.md`, `CLIENT_QUESTIONS.md`, and `HANDOFF_CHECKLIST.md`.
10. Confirm `NEXT_STEPS.md` contains the Architect/Codex handoff workflow.
11. Download and inspect the ZIP.
12. Confirm desktop and `390 × 844` mobile layouts have no horizontal overflow.
13. Confirm keyboard navigation and visible focus states remain usable.

## Release ownership

Jason Wilmot, Rose & Paw Digital Designs

The assigned owner must:

- approve production promotion;
- confirm the expected Worker version and production asset are active;
- perform or assign the post-deployment smoke test;
- record the release evidence and any rollback;
- ensure every future release passes the checks in `RELEASE_OPERATIONS_CHECKLIST.md`.
