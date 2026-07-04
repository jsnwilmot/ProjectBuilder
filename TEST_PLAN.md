# Test Plan

## 2026-07-04 final MVP release-readiness evidence

- `npm.cmd test`: passed (`14` files, `129` tests).
- `npm.cmd run test:coverage`: passed with thresholds; overall coverage is `93.87%` statements, `85.58%` branches, `95.29%` functions, and `95.51%` lines.
- `src/lib/projectRepository.ts`: `98.49%` statements, `100%` branches, `97.95%` functions, and `98.23%` lines.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including TypeScript checking.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- CI coverage gate now runs `npm run test:coverage` with Vitest thresholds enforced in `vite.config.ts`.
- Export download tests no longer emit jsdom navigation warnings after download behavior hardening.
- Production QA completed the create, save, reopen, duplicate, archive, restore, cancel-delete, confirm-delete, generation, document review, and ZIP export journey.
- Production generated `19/19` project-specific core documents with `55` exact `[MISSING: ...]` markers reported consistently in Package Preview and Export diagnostics.
- Direct Windows ZIP inspection passed with `12` folders, `19` core documents, both valid manifests, and no missing, duplicate, empty, unsafe, unreadable, filler, or stale-project files.
- The delete confirmation now traps focus between its actions, closes with Escape, restores focus after cancellation, and keeps Cancel as the initial focus target.
- Desktop and `390 x 844` production checks passed with no console warnings/errors or page-level horizontal overflow.
- Physical-keyboard tab-order verification passed in production Chrome across Mission Control, intake, generation, documents, saved-project actions, dialogs, and export.
- Visual Windows Explorer inspection passed for the production ZIP: 12 approved folders, both manifests, readable/safe names, and a Markdown file opened normally.
- Firefox production verification remains uncompleted because Firefox is not installed on the verification workstation.

## Automated coverage

- Intake stage configuration is defined in one canonical source with 8 required stages.
- Project type is a required Foundation choice backed by 15 typed, config-driven presets.
- Website, game, mobile, dashboard, Microsoft 365, automation, and API questions are shown only for relevant presets.
- Branding validation changes by project type and audience visibility; internal web applications do not require full branding.
- Website, game, dashboard, API, and automation presets enforce their required project-specific fields.
- Required intake rules pass and fail predictably for Foundation, Users, Features, Data, Workflows, and Security stages.
- Validation returns `isValid`, `missingFields`, `warnings`, and `sectionResults` with `stageId`, `label`, `percentComplete`, `isComplete`, `missingFields`, and `warnings`.
- Optional omissions remain visible as warnings.
- Missing required and weak information derives persisted review items grouped by the required client-review sections.
- `Answered` clears a review blocker; `Not applicable` requires a reason; blocking `Deferred` items remain blockers; explicitly allowed non-blocking deferrals clear.
- Client questions are grouped in a stable section order and copied as plain text.
- Ready for Codex requires every blocking review item and all 12 readiness checklist checks to pass.
- Intake, review-decision, and manual readiness changes mark the generated package stale until regeneration.
- Older version-1 stored projects receive safe review defaults without losing intake or generated documents.
- Continue Intake selects the next incomplete stage.
- Stage switching does not lose entered intake values.
- New projects receive complete safe defaults, unique IDs, lifecycle status, and timestamps.
- Versioned storage state saves and loads multiple projects plus `activeProjectId`.
- Existing version-1 projects without archive or duplication metadata load as active projects with safe null defaults.
- Duplicate creates a new id, adds `Copy` to the project name, records source lineage, preserves copied intake, and clears generated output.
- Archive hides a project from the active list without deleting its intake, review, readiness, or generated-document data.
- Restore returns archived data to the active list and updates only archive/timestamp metadata.
- Active and archived delete actions require a confirmation dialog; Cancel preserves the record and Permanently Delete removes it.
- Mission Control summary counts exclude archived records from active, Draft, Ready for Codex, and blocker totals.
- Invalid localStorage JSON recovers to a safe empty version-1 state.
- Empty storage renders the first-run welcome, product boundaries, eight-step workflow, and project-dependent navigation without producing a blank page.
- The primary onboarding action opens Foundation intake.
- The read-only business website example opens and closes without creating, replacing, or persisting a project.
- Existing projects bypass the first-run welcome.
- Selected project types show config-driven use-case helper copy alongside the existing conditional questions.
- Mission Control explains Draft, Ready for Codex, and Client Questions Pending when those states apply.
- The Generate stage shows the post-generation review and GPT Architect/Codex handoff workflow before generation.
- Invalid `activeProjectId` recovers to the first valid persisted project.
- Legacy `Needs review` data migrates to the canonical `Review needed` review status.
- Project status and review status use separate canonical label sets.
- Selecting an active project persists correctly.
- Nested project updates preserve untouched intake fields.
- Intake updates preserve existing generated documents.
- Generated documents and actual generated-file counts persist.
- Generation can proceed with missing intake data and keeps explicit missing markers.
- All 19 required markdown files generate every time and are non-empty.
- `BRAND_GUIDE.md`, `CLIENT_QUESTIONS.md`, and `HANDOFF_CHECKLIST.md` generate in their approved folders.
- Generated document names match the canonical generated-file list.
- Folder mapping is validated against approved package structure.
- ARCHITECT_INSTRUCTIONS.md includes review process and blocked assumptions.
- CODEX_INSTRUCTIONS.md includes missing decision and scope boundary rules.
- PHASED_CODEX_PROMPTS.md includes phased prompts with objective, files, constraints, acceptance criteria, testing, and reporting sections.
- ZIP export is blocked before explicit generation and never creates an empty package.
- Export integrity detects missing, extra, empty, duplicate, incorrectly mapped, and unsafe generated files.
- Missing markers are counted as export warnings without blocking an otherwise valid package.
- ZIP root names and every archive path are sanitized or rejected safely.
- Archive folders and core files use deterministic approved ordering.
- `EXPORT_MANIFEST.md` and `project-manifest.json` are included without changing the 19-core-file count.
- Export diagnostics identify packages as Draft or Ready for Codex while allowing valid Draft exports.
- Manifest diagnostics include project identity, lifecycle status, exported date, warning/error counts, folder summary, and stable file list.
- Large project records export with safe normalized paths and preserved content.
- Multi-project export uses only the active project's persisted documents.
- Copy actions read only active-project Architect, Codex, and phased prompt documents.
- Clipboard permission failure uses the local selection fallback when the browser supports it.
- Client Questions copy uses the same local selection fallback when direct clipboard access is denied.
- Browsers without native or legacy copy-command access leave fallback text visibly selected with a Ctrl+C instruction.
- Project Package Preview renders all 19 generated documents with canonical folder mapping, purpose labels, review status, and per-document missing-marker count.
- Package summary reports Draft/Ready status, 19-document completeness, total marker count, review blockers, checklist completion, and ZIP availability.
- Document preview opens selected full Markdown content, preserves plain-text spacing, exposes metadata, and returns to the document list.
- Document and quick-copy actions use the shared clipboard utility and selection fallback.
- Document search covers file name, folder, and purpose, exposes a clear zero-result state, and restores the document list after clearing.
- Dashboard selectors calculate readiness, outstanding questions, completion, next action, and display status without mutation.
- Active project summary selector returns status, generated file count, outstanding required count, review status, and deterministic next action details.
- Recent project summaries sort by last updated date with stable fallback behavior.
- Dashboard warning selector surfaces inconsistent persisted status/readiness combinations.
- Mission Control project switching updates active context and heading safely.
- Mission Control project rows expose clear Open, Duplicate, Archive/Restore, and Delete labels.
- All 12 required folders and 19 required files are generated.
- Missing information markers appear in generated Markdown.
- Unsafe project names normalize to predictable paths.
- ZIP archives contain the root document, manifest, standard folders, and phased prompts.
- Mission Control opens the selected intake step.
- Review stage surfaces the Missing Information Review, grouped Client Questions Review, and Ready for Codex checklist before generation.
- Generate stage shows readiness counts and saves documents to the active project.
- Documentation Viewer renders generated content.

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd audit
```

## 2026-07-03 saved project management evidence

- `npm.cmd test`: passed (`14` files, `123` tests).
- `npm.cmd run test:coverage`: passed; overall branch coverage is `84.03%`.
- `src/lib/projectRepository.ts`: `100%` statements, branches, and functions.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed, including TypeScript checking.
- `git diff --check`: passed.
- In-app browser QA passed at desktop and `390 × 844` mobile widths with no console errors or page-level horizontal overflow.
- Duplicate, archive, archived view, restore, confirmation focus, Cancel, permanent delete, count updates, persistence reload, 19-document generation, Package Preview, and ZIP export passed.
- Technical ZIP inspection passed with `12` folders, `19` core documents, both manifests, and no missing, duplicate, or empty files.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- Physical-keyboard tab order and Windows Explorer ZIP inspection remain manual release checks.

## 2026-07-03 project package preview evidence

- `npm.cmd test`: passed (`14` files, `94` tests).
- `npm.cmd test -- src/tests/documentReview.test.ts src/tests/exportProjectPackage.test.ts src/tests/clientReview.test.ts`: passed (`3` files, `12` focused regression tests).
- `npm.cmd run build`: passed.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- `git diff --check`: passed.
- Automated coverage includes the 19-document list, canonical folders, purpose metadata, per-document and package marker totals, Draft warning, Ready-for-Codex blocker summary, preview content, back navigation, document copy, quick copy, and clipboard fallback.
- Existing onboarding, project persistence, Client Review, 19-document generation, export integrity, and ZIP tests remain in the full suite.
- In-app browser QA passed at `1280 x 720` desktop and `390 x 844` mobile with no console warnings/errors, framework overlay, or page-level horizontal overflow.
- Ready and Draft package summaries, all 19 review rows, five quick-copy actions, purpose/folder/status metadata, preview open/close, full Markdown content, clipboard selection fallback, and responsive layout passed.
- Browser export reported `19/19`, valid folder mapping, zero export errors, and `Package downloaded successfully.`
- Physical-keyboard tab order and Windows Explorer ZIP inspection remain manual release checks. Automated focus styles, accessible labels, and keyboard-reachable controls passed.

## 2026-07-03 onboarding and first-run UX evidence

- `npm.cmd test`: passed (`13` files, `89` tests).
- `npm.cmd test -- src/tests/exportProjectPackage.test.ts src/tests/generateProjectPackage.test.ts src/tests/clientReview.test.ts`: passed (`3` files, `19` focused regression tests).
- `npm.cmd run build`: passed.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- `git diff --check`: passed.
- First-run UI coverage verifies welcome content, workflow guidance, primary creation, read-only example behavior, non-persistence, existing-project bypass, project-type helper copy, status explanations, and post-generation guidance.
- Existing client review, 19-document generation, and ZIP export tests remain in the full regression suite.
- In-app browser QA passed at `1346 x 1270` desktop and `390 x 844` mobile with no console warnings/errors and no page-level horizontal overflow.
- Welcome rendering, example open/close, new project creation, existing-project reload/bypass, Business website helper copy and fields, generation guidance, Client Review access, 19-document generation, and export diagnostics passed.
- Browser export reported `19/19`, valid folder mapping, zero export errors, and `Package downloaded successfully.`; focused automated ZIP inspection remains the archive-content authority.
- Physical-keyboard tab order and Windows Explorer ZIP inspection remain manual release checks. Automated skip-link focus, form labeling, reachable controls, and `:focus-visible` coverage passed; the in-app browser did not expose a reliable physical-keyboard simulation.

## 2026-07-03 client review evidence

- `npm.cmd test`: passed (`13` files, `86` tests).
- `npm.cmd test -- src/tests/exportProjectPackage.test.ts`: passed (`5` ZIP tests).
- `npm.cmd run build`: passed.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- `git diff --check`: passed.
- Desktop browser QA passed for review rendering, decision persistence, grouped question copy, Draft blocking, `12/12` Ready for Codex completion after regeneration, responsive layout, and zero console warnings/errors.
- `390 × 844` browser QA passed with no page-level horizontal overflow and no console warnings/errors.
- Browser ZIP generation reported `19/19`, valid folder mapping, Ready for Codex, zero export errors, and a successful download.
- Automated ZIP inspection confirmed deterministic paths, 12 approved folders, 19 core documents, both manifests, readable client-review documents, and no stale 16-document paths.
- Synthetic Tab input did not advance focus in the in-app browser. Automated skip-link, label, keyboard-focusability, and `:focus-visible` checks passed; physical-keyboard tab order remains a manual release check.

## 2026-07-02 change evidence

- `npm.cmd test`: passed (`12` files, `75` tests).
- `npm.cmd run build`: passed.
- `npm.cmd audit`: passed with `0` vulnerabilities.
- `git diff --check`: passed.
- In-app browser QA passed at the default desktop viewport and `390 x 844`.
- Website and Game presets displayed only their relevant Foundation questions.
- Draft generation produced all 19 documents, including the three new files.
- Export showed `19/19`, `Draft`, and **Use This Project Package** with the Phase 1 instruction.
- Browser console warnings/errors: none.
- Mobile page-level horizontal overflow: none.
- All persisted packages previously showing `16 of 19` were regenerated and now show `19 of 19`.
- Required conditional fields were rendered and checked for Business website, Web application, Android app, Game, Dashboard, Power Apps/Microsoft 365, API/backend, and Automation/workflow presets.
- A complete internal web-application QA project reached `Ready for Codex`; an incomplete project remained `Draft` while retaining generation/export access.
- Windows `Expand-Archive` inspection passed for `19-document-ready-qa.zip`.

## Phase 8 release evidence

- Production-preview workflow passed for a newly created `Phase 8 Release Candidate QA` project.
- Minimum required intake completed with zero unresolved required questions and six visible optional warnings.
- Refresh persistence and switching between the seeded project and release-candidate project passed.
- Generation produced all 19 documents.
- Representative Architect, Codex, and phased prompt documents contained the active project identity and explicit missing markers.
- Document search hid all documents for a no-match query and restored the document set after clearing.
- Export diagnostics reported 19 expected documents, 19 actual documents, valid folder mapping, both manifests, package readiness, and zero errors.
- Architect, Codex, and phased prompt copy actions returned 2,089, 1,831, and 5,853 characters respectively from the active project.
- Browser console verification reported zero warnings or errors.
- Responsive checks at `390 x 844`, `768 x 1024`, and `1440 x 1000` reported no page-level horizontal overflow.
- Every rendered button and form control in the checked views had an accessible name; main and navigation landmarks were present; visible `:focus-visible` styling was detected.
- The skip-link target was hardened to be programmatically focusable and explicitly receive focus on activation.
- Current in-app testing used the available Chromium-based browser surface. Firefox-specific verification remains uncompleted.

## Full regression checklist

1. Start with empty storage and create a project from the Mission Control empty state.
2. Complete the minimum required Foundation, Users, Features, Data, Workflows, and Security questions.
3. Refresh and confirm the active project and intake values persist.
4. Create a second project, switch projects, and confirm each project retains its own intake and generated documents.
5. Open Scope Review and confirm required questions and optional warnings are clearly separated.
6. Generate the project package and confirm all 19 generated documents are available.
7. Edit intake after generation and confirm the saved generated documents remain unchanged until Generate is run again.
8. Preview multiple documents, search for a missing file name, clear the search, and confirm plain-text rendering.
9. Confirm exact `[MISSING: ...]` markers remain visible in incomplete generated documents.
10. Open Export before generation and confirm a clear blocked state and Generate action.
11. Open Export after generation and confirm 19 expected documents, 19 actual documents, valid folder mapping, Draft/Ready for Codex status, manifests, warnings, and zero errors.
12. Use all three copy actions and confirm each copies content from the active project only.
13. Switch projects and confirm Export and copy actions use the newly active project.
14. Load corrupt storage and an invalid active project id and confirm safe recovery without a crash or blank page.
15. Confirm no relevant browser console errors during the complete workflow.

## Accessibility checklist

1. Navigate the complete workflow using keyboard only.
2. Confirm the skip link moves focus to the main landmark.
3. Confirm focus indicators are visible on navigation, project rows, stage controls, fields, copy actions, and Export.
4. Confirm heading order remains logical on Mission Control, Guided Intake, Documents, and Export.
5. Confirm every form field has a label, helper text, and associated error message.
6. Confirm required fields expose `aria-invalid` and errors are announced.
7. Confirm active navigation, active project, active intake stage, and selected document expose programmatic state.
8. Confirm Export and generation statuses are announced without moving focus.
9. Confirm icon-only visuals are hidden from assistive technology or have an accessible name.
10. Confirm text and controls remain readable at browser zoom.

## Responsive checklist

Test at `390 x 844`, `768 x 1024`, and `1440 x 1000`.

1. Confirm no page-level horizontal overflow.
2. Confirm primary navigation remains usable and New project remains reachable.
3. Confirm the intake stage rail can be reached and scrolled where needed.
4. Confirm recent projects remain contained within their scroll region.
5. Confirm document search, document list, and preview remain readable.
6. Confirm Export diagnostics, warnings, errors, and folder tree remain readable.
7. Confirm buttons remain at least 44 pixels high at tablet and mobile widths.
8. Confirm no critical action is clipped, overlapped, or hidden.

## Manual Windows ZIP verification checklist

The technical archive portion passed on Windows using the exact production package generator followed by Windows `Expand-Archive` into a fresh temporary directory.

Technical results:

- Sanitized root folder: passed.
- All 12 approved folders: passed.
- Exactly 19 core Markdown documents: passed.
- Missing, duplicate, empty, unsafe, or unreadable core files: none.
- Stale 16-document references in the generated package: none.
- `00_Project_Overview/EXPORT_MANIFEST.md`: passed.
- `project-manifest.json`: passed.
- Representative README, scope, Architect, Codex, and phased prompt documents were readable: passed.
- Exact `[MISSING: ...]` markers: passed.
- Duplicate or unsafe paths: none.
- Active-project identity and intake data: passed.

Release-owner result:

1. Downloaded the ZIP from the deployed Cloudflare Worker site.
2. Opened it in Windows Explorer.
3. Confirmed the 12 approved folders and root `project-manifest.json`.
4. Confirmed `00_Project_Overview/EXPORT_MANIFEST.md`.
5. Confirmed readable folder/file names with no unsafe or unexpected names.
6. Opened `00_Project_Overview/README.md` normally in VS Code from the archive.

## Deployment readiness checklist

1. Run `npm.cmd test`, `npm.cmd run test:coverage`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd audit`, and `git diff --check`.
2. Confirm TypeScript checking passes through the production build.
3. Confirm the Cloudflare Workers Static Assets deployment and `[MISSING: production release owner]` are approved.
4. Confirm HTTPS, root refresh behavior, cache headers, and security headers on the production Worker.
5. Confirm no secrets or environment-specific credentials are present in the client bundle.
6. Confirm backup/export guidance for local-only project data is documented.
7. Record production smoke-test, rollback, and incident ownership steps.

## Known testing boundary

The production ZIP download passed direct archive inspection and a visual Windows Explorer check. Physical Chrome keyboard navigation passed, including focus order, visible focus, Shift+Tab, skip-link activation, dialog containment, Escape, and focus restoration. Firefox remains unverified because it is not installed on the verification workstation.
