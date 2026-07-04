# Release Operations Checklist

## Release owner

`[MISSING: production release owner]`

The release owner approves production promotion, confirms deployment success, performs or assigns the production smoke test, records evidence, and initiates rollback when a release gate fails.

## Pre-release

- [ ] Release owner approval is recorded.
- [ ] The approved change is within scope and documentation is current.
- [ ] `main` is clean and matches `origin/main`.
- [ ] The intended release commit is the current `main` HEAD.
- [ ] No secrets, credentials, generated archives, coverage output, or unrelated files are staged.

## Quality gates

- [ ] `npm.cmd ci`
- [ ] `npm.cmd test`
- [ ] `npm.cmd run test:coverage`
- [ ] `npm.cmd run lint`
- [ ] `npm.cmd run build` (includes TypeScript checking)
- [ ] `npm.cmd audit`
- [ ] `git diff --check`
- [ ] `npm.cmd exec wrangler -- deploy --dry-run`

Stop the release if any gate fails.

## Deployment

- [ ] Push the approved commit to `origin/main`.
- [ ] Confirm Cloudflare Workers Builds creates a new active deployment for `projectbuilder`.
- [ ] Record the Git commit.
- [ ] Record the Worker version and deployment timestamp.
- [ ] Record the production JavaScript asset hash.
- [ ] Confirm the cache-bypassed production HTML references the same asset as the verified local build.

Normal production path: Cloudflare Workers Builds Git integration from `main`.

Manual fallback: `npm.cmd run deploy`, only with explicit release-owner approval.

Cloudflare checks:

- Build configuration: **Workers & Pages → projectbuilder → Settings → Builds**
- Active deployment and rollback history: **Workers & Pages → projectbuilder → Deployments**

## Production smoke test

- [ ] `https://projectbuilder.jsnwilmot.workers.dev/` loads.
- [ ] No application console errors occur.
- [ ] Desktop has no page-level horizontal overflow.
- [ ] `390 × 844` has no page-level horizontal overflow.
- [ ] Mission Control and saved projects load.
- [ ] Create, duplicate, archive, restore, and confirmed delete work.
- [ ] Intake conditions, generation, document preview, and readiness gating work.
- [ ] The package contains all 19 core documents.
- [ ] ZIP export succeeds.

## Manual browser and accessibility checks

- [ ] Tab and Shift+Tab order are logical.
- [ ] Focus remains visible.
- [ ] Skip link works.
- [ ] Dialog focus is contained and Escape closes where expected.
- [ ] Focus returns to the trigger after closing a dialog.
- [ ] Firefox smoke test passes when Firefox is available.

## Windows ZIP inspection

- [ ] ZIP opens in Windows Explorer.
- [ ] Root folder and all 12 approved folders are readable.
- [ ] Exactly 19 core Markdown documents are present.
- [ ] `00_Project_Overview/EXPORT_MANIFEST.md` is present.
- [ ] `project-manifest.json` is present.
- [ ] Files open normally.
- [ ] No strange encoding, unsafe, duplicate, or unexpected file names appear.

## Sign-off

- Release owner: `[MISSING: production release owner]`
- Commit:
- Worker version:
- Deployment timestamp:
- Production asset:
- Smoke-test operator:
- Result:
- Rollback required: Yes / No

## Rollback

If production verification fails:

1. Stop release promotion and preserve the failed version and evidence.
2. Use Cloudflare Worker deployment history or `wrangler rollback` to restore the last known-good version.
3. Confirm the previous production asset is active.
4. Repeat the production smoke test.
5. Document the incident and corrective action before another release.
