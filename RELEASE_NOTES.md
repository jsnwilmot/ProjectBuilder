# GPT Project Builder MVP Release Candidate

Release date: 2026-06-28

## Deployment readiness status

**Cloudflare Pages selected as MVP production host.**

The release candidate is ready for a controlled Cloudflare Pages deployment after assignment of a release owner. Exact build settings, security and cache recommendations, rollback steps, and the production smoke test are recorded in [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md).

## Included

- Static React/Vite application with no server runtime.
- Mission Control for active-project status, readiness, outstanding questions, generated-document progress, and next actions.
- Versioned browser-local persistence for multiple projects and one active project.
- Eight-stage guided intake with required-field validation and optional warnings.
- Generation of 19 deterministic project handoff documents.
- Plain-text document search and preview.
- Verified ZIP export with 12 standard folders, Markdown and JSON manifests, deterministic ordering, and integrity diagnostics.
- Copy actions for Architect instructions, Codex instructions, and phased Codex prompts.
- Responsive and accessible application shell for desktop, tablet, and mobile.

## Release verification

- Automated suite: 11 files and 62 tests passed, including skip-link focus behavior.
- Production build completed successfully.
- Dependency audit reported zero vulnerabilities.
- Production-preview regression covered project creation, minimum intake, refresh persistence, project switching, generation, document search/preview, export diagnostics, and all three copy actions.
- Export diagnostics report 19 expected documents, 19 actual documents, valid folder mapping, Draft/Ready for Codex status, both manifests, and warning/error details.
- Windows technical archive verification passed for the 19-document package: all 12 folders, 19 core Markdown documents, both manifests, clean unique paths, readable content, and no missing or duplicate files.
- Responsive checks passed at `390 x 844`, `768 x 1024`, and `1440 x 1000` without page-level horizontal overflow.

## Known limitations

- Projects remain in `localStorage` for one browser profile and origin.
- Clearing browser site data removes projects.
- Data does not synchronize across browsers, profiles, devices, preview URLs, or production domains.
- ZIP import is not included.
- A ZIP export cannot currently be restored inside the app.
- No backend, authentication, external AI calls, cloud synchronization, Workers APIs, or analytics are included.
- The in-app browser cannot complete the user-visible ZIP download and Windows Explorer workflow; the release owner must perform that smoke-test step on the deployed site.
- Firefox-specific verification has not been completed.

## Deferred

- Custom domain, if approved after the `pages.dev` deployment passes smoke testing.
- A later product decision on whether ZIP import belongs in a future version.
- Any backend, authentication, collaboration, cloud persistence, or external AI capability requires separate architecture approval.

## Release blockers

- `[MISSING DECISION: Assign the production release owner.]`
- Complete the deployed-site ZIP download and Windows Explorer inspection.
- Run and record the post-deployment Cloudflare Pages smoke test.

## Recommended action

Deploy the clean `main` branch to Cloudflare Pages using `npm run build` and `dist`, then execute the checklist in [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md).
