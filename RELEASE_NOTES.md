# GPT Project Builder MVP Release Candidate

Release date: 2026-06-28

## Deployment readiness status

**Cloudflare Workers Static Assets selected as the production host.**

The production target is the existing `projectbuilder` Worker at `https://projectbuilder.jsnwilmot.workers.dev/`. The repository now records the Worker configuration, exact build and deploy commands, rollback steps, and production smoke test in [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md).

## Included

- Static React/Vite application with no server runtime.
- First-run Mission Control welcome with clear product boundaries, an eight-step workflow, project creation, and a read-only example that never persists.
- Mission Control for active-project status, readiness, outstanding questions, generated-document progress, and next actions.
- Saved Project Management with separate active/archived lists, project counts, duplicate lineage, reversible archive/restore, and confirmation-gated permanent deletion.
- Versioned browser-local persistence for multiple projects and one active project.
- Eight-stage guided intake with required-field validation and optional warnings.
- Project-type use-case guidance and conditional intake questions shown immediately after type selection.
- Plain-language Draft, Ready for Codex, and Client Questions Pending guidance plus a pre-generation explanation of the GPT Architect/Codex handoff workflow.
- Client Review workflow with grouped missing-information decisions, copyable client questions, and a 12-item Ready for Codex checklist.
- Safe persistence and migration for `Answered`, `Not applicable`, and `Deferred` review decisions.
- Generation of 19 deterministic project handoff documents.
- Project Package Preview with all 19 documents, canonical folders, purpose labels, statuses, per-document marker counts, and Preview/Copy actions.
- Package-level Draft/Ready, missing-marker, blocker, checklist, and ZIP-readiness summary.
- Full plain-text Markdown review plus quick-copy actions for the five key handoff documents using the existing clipboard fallback.
- Verified ZIP export with 12 standard folders, Markdown and JSON manifests, deterministic ordering, and integrity diagnostics.
- Copy actions for Architect instructions, Codex instructions, and phased Codex prompts.
- Responsive and accessible application shell for desktop, tablet, and mobile.

## Release verification

- Saved Project Management verification passed `123` tests, coverage, lint, TypeScript/build, dependency audit with zero vulnerabilities, desktop/mobile browser QA, 19-document generation, Package Preview, and technical ZIP inspection.
- Automated suite: 14 files and 94 tests passed, including package preview metadata, marker totals, document and quick-copy behavior, first-run onboarding, client-review decisions, clipboard fallbacks, readiness gating, storage migration, ZIP integrity, and skip-link focus behavior.
- Production build completed successfully.
- Dependency audit reported zero vulnerabilities.
- Production-preview regression covered project creation, minimum intake, refresh persistence, project switching, generation, document search/preview, export diagnostics, and all three copy actions.
- Export diagnostics report 19 expected documents, 19 actual documents, valid folder mapping, review-aware Draft/Ready for Codex status, both manifests, and warning/error details.
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

- Custom domain, if approved after the `workers.dev` deployment passes smoke testing.
- A later product decision on whether ZIP import belongs in a future version.
- Any backend, authentication, collaboration, cloud persistence, or external AI capability requires separate architecture approval.

## Release blockers

- Complete the deployed-site ZIP download and Windows Explorer inspection.
- Run and record the post-deployment Cloudflare Workers smoke test.

## Recommended action

Build with `npm.cmd run build`, deploy the `dist` output to the existing `projectbuilder` Worker with `npm.cmd run deploy`, then execute the checklist in [DEPLOYMENT_NOTES.md](./DEPLOYMENT_NOTES.md).
