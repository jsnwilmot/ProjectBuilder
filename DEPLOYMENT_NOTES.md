# Deployment Notes

## Deployment status

**Hosting target selected: Cloudflare Pages**

The MVP remains a static React/Vite application with browser `localStorage` persistence, ZIP export, and copyable handoff content. It does not require a backend, authentication, import, external AI calls, cloud synchronization, Workers APIs, or runtime environment variables.

Release owner: `[MISSING DECISION: Assign the production release owner.]`

## Verified build contract

- Node.js: `^20.19.0 || >=22.12.0`
- Verified locally with Node.js `22.21.0`
- Install: `npm ci`
- Test: `npm test`
- Production build: `npm run build`
- Build output directory: `dist`
- Local production preview: `npm run preview -- --host 127.0.0.1 --port 4173`
- Environment variables: none required for the MVP

The production build emits `dist/index.html` and content-hashed JavaScript and CSS under `dist/assets/`. The app has no server runtime or external service calls.

## Cloudflare Pages settings

| Setting | Value |
| --- | --- |
| Framework preset | Vite, or None if Vite is not available |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variables | None required for MVP |

These settings align with Cloudflare's current [Vite deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/) and [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).

## Cloudflare Pages deployment checklist

1. Push clean `main` branch to GitHub.
2. Open the Cloudflare dashboard.
3. Go to **Workers & Pages**.
4. Create a Pages project.
5. Connect the GitHub repository.
6. Set the framework preset to **Vite**, or **None** if Vite is not available.
7. Keep the root directory at the repository root.
8. Set the build command to `npm run build`.
9. Set the output directory to `dist`.
10. Add no environment variables.
11. Deploy.
12. Open the generated `pages.dev` URL.
13. Run the post-deployment smoke test.
14. Confirm HTTPS works.
15. Confirm refresh works.
16. Confirm `localStorage` project persistence works.
17. Confirm **Generate** creates 19 documents.
18. Confirm Export diagnostics show 19 of 19 and a Draft or Ready for Codex result.
19. Confirm ZIP download works.
20. Confirm copy actions work.
21. Add a custom domain later if approved.

## Routing and static-host compatibility

The application does not use URL-based client-side routes. Mission Control, Guided Intake, Documents, and Export are application state views served from `/`. A production-preview refresh at `/` returned the application successfully.

No SPA redirect file is required right now. Do not add a Cloudflare `_redirects` file unless URL routes are introduced or a deployed route refresh fails. If that occurs, the smallest compatible fix is a fallback rule that serves `/index.html` for application routes; verify static asset paths before implementing it.

The current root-relative `/assets/...` build output is compatible with a root deployment such as a `pages.dev` domain or approved custom domain.

## Persistence and backup limitation

Projects are stored only in `localStorage` for the current browser profile and origin. They do not synchronize across browsers, profiles, devices, or domains. Clearing site data removes projects. Moving from the preview origin to the production origin starts with separate storage.

Users should generate and download a ZIP before clearing browser data or moving critical work. ZIP import remains deferred, so an export is a handoff and backup artifact, not an in-app restore mechanism.

## Security recommendations

No secrets, credentials, environment variables, network APIs, raw HTML injection, or external service calls are required by the MVP. Keep all secrets out of client code and Cloudflare Pages build settings.

Recommended response headers for production:

- `Content-Security-Policy: default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data:; font-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security` after the production HTTPS/custom-domain behavior is confirmed

The initial CSP allows inline styles because readiness progress widths are rendered as inline style attributes. Test all generation, export, and copy actions before tightening it. These are deployment recommendations only; no provider-specific header configuration is included in this release.

## Cache recommendations

- Serve `index.html` with revalidation, such as `Cache-Control: no-cache`.
- Serve content-hashed files under `/assets/` with `Cache-Control: public, max-age=31536000, immutable`.
- Do not apply an immutable cache policy to `index.html`, because it references the current hashed assets.
- Confirm a fresh deployment and rollback both load matching HTML and asset versions.

## Rollback

1. Record the deployed Git commit and Cloudflare Pages deployment ID.
2. If the smoke test fails, stop release promotion and preserve the failing URL/evidence.
3. Use Cloudflare Pages deployment history to roll back to the last known-good production deployment, or redeploy the last known-good commit.
4. Re-run the post-deployment smoke test on the restored deployment.
5. Confirm existing `localStorage` projects still load. This release does not change the storage schema.
6. Record the incident, failed commit, rollback deployment, and follow-up owner.

Rollback restores application assets only. It cannot restore browser data that a user cleared.

## Post-deployment smoke test

1. Open the `pages.dev` URL and confirm HTTPS and the GPT Project Builder identity.
2. Refresh `/` and confirm the app renders without a 404 or blank screen.
3. Create a project and complete the minimum required intake fields.
4. Refresh and confirm the active project and intake values persist.
5. Create a second project, switch between projects, and confirm project isolation.
6. Confirm Scope Review separates required issues from optional warnings.
7. Generate and save the package; confirm 19 generated documents.
8. Open representative documents and confirm project data plus exact `[MISSING: ...]` markers.
9. Confirm Export diagnostics show 19 expected and 19 actual documents, valid mapping, package readiness, both manifests, and zero errors.
10. Download the ZIP and open it in Windows Explorer.
11. Confirm all 12 folders, 19 core documents, Markdown manifest, and JSON manifest.
12. Run all three copy actions and verify Architect, Codex, and phased prompt content.
13. Confirm browser console warnings/errors are absent.
14. Confirm the workflow at desktop and mobile widths.
