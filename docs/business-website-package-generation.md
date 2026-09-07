# Business Website package generation correction

## Scope and verified root cause

Business Website and Static Website now use a website document family. Other application types retain their existing templates and validation, including legitimate Canvas and model-driven requirements. The standard website package still contains all 19 documents in the existing folders.

Before this correction, `generateProjectPackage` selected the same shared template registry for every type. `DEPLOYMENT_NOTES` read `powerPlatform.common` environment, solution, publisher, connection and ALM values even for a website. `TEST_PLAN` and `ACCEPTANCE_CRITERIA` included the package builder's own persistence/generation/export behavior. Architect, Codex and phase prompts included unrelated platform instructions. Raw `safeText`/`listOrMissing` calls interpreted every empty string as missing, ignoring review N/A decisions and optionality. Core validation also required application records, roles and transaction workflows for websites. Marker provenance unconditionally pointed deployment markers to hidden platform fields.

A generic website fixture reproduced the deployment defect and 109 unnecessary markers before implementation (two failing reproducer tests). Historical marker counts were supporting evidence, not a target count to suppress.

## Applicability and requirement states

`projectCapabilities.ts` selects the template family and exposes the actual visible field metadata. `websiteRequirements.ts` interprets field requirements once through typed states used by website validation, generation, review projection, summary UI and marker navigation.

| State | Result |
| --- | --- |
| Required and unanswered | Missing marker, intake gap and readiness blocker; visible field remains editable. |
| Required and answered | Recorded value is used. A stale `Answered` review cannot clear a newly empty required answer. |
| Optional and unanswered | No missing marker or automatic blocker. No new scope is inferred. |
| Explicit Not Applicable | A saved review decision needs its existing reason. Explicit whole-answer values such as `Not Applicable`, `N/A` and `None` are also recognized. A requirement merely containing one of those words is retained. |
| Deferred | The existing review status, reason and blocking/allowDeferred controls are preserved. Allowed future deferrals remain future actions. Required or before-implementation decisions block implementation readiness without becoming accidental missing markers. |
| Inapplicable field | No requirement or platform instruction is generated for hidden project-type fields. |

Application data and access capabilities are opt-in: recorded data entities/collections require real field and key definitions; recorded authentication requires access definitions. A deferred capability decision does not invent dependent schema requirements. Website pages/sections replace the mandatory application-screen question. Core identity, purpose, features, acceptance, website content/SEO, required branding and site-security answers remain required.

The existing review model is reused. No storage version, schema, migration, backend, dependency or production configuration is changed. Generation does not rewrite intake or review records. Existing saved documents remain historical until the owner explicitly regenerates them.

## Deployment and client documents

The existing website schema records provider, source control, repository, branch and generator choices together in `hostingStatus`, with `domainStatus`, `targetPlatform` and `constraints` supplying related decisions. Deployment notes preserve these answers verbatim. The generator does not split free text into invented structured answers or prescribe build commands absent from repository evidence.

All website documents use recorded pages, content, branding, navigation, security and deployment decisions. Forms, integrations, analytics, application data and reports add implementation/testing work only when requested. Website tests and acceptance criteria concern the client's visitor experience. Architect/Codex instructions and phases follow website setup, brand/layout, navigation/content, requested services, responsive accessibility, SEO/performance/security, testing and release readiness.

## Deferred contact and marker navigation

For compatibility with the supplied intake, an explicit `TBD`/deferral clause with a `before implementation` deadline is projected as a deferred review action. For example, the supplied contact sentence remains visible in Client Questions, scope, handoff, next steps and developer instructions. It blocks Ready for Codex while preserving a complete draft intake. Other lifecycle decisions should use the existing structured Deferred review control; arbitrary prose is not treated as a replacement for required-field validation.

New website markers resolve to visible field metadata and focus the exact input. Historical platform/derived markers explain regeneration or an applicability review and offer no misleading Edit source action. Unregistered markers still count as orphan blockers; marker counting and export-integrity rules are retained.

Mission Control separates website deferred actions from unanswered intake questions. A complete draft with pending reviews or deferrals no longer claims that required intake is missing; its implementation readiness blockers remain intact.

The evaluator exposes non-client generation/platform/target blockers separately while retaining its existing aggregate blockers and readiness status. Website previews use that category for generated-content diagnostics instead of counting Client Review blockers a second time. Counter changes do not bypass readiness or export checks.

## Validation evidence

Baseline at `3171ca89893e78cf2da3dd41e79b97df2aed8dc3`: `npm ci`; 87 unit/integration files with 3,030 tests plus 7 UI files with 75 tests, totaling 94 files and 3,105 passing tests. ESLint, application TypeScript checking and the production Vite build passed. The pre-existing large-chunk warning remained.

Final full validation passed through `npm run test:coverage`: 88 unit/integration coverage files with 3,080 tests and all 7 UI files with 78 tests, totaling **95 files / 3,158 passing tests**. This adds 50 package regressions and 3 UI regressions. Coverage: 90.02% statements, 83.21% branches, 95.43% functions and 93.44% lines; thresholds passed. Final ESLint, application TypeScript checking and Vite production build passed (151 modules; existing large-chunk warning). The production-only dependency audit again reported zero vulnerabilities. `git diff --check` passed. No dependency or lockfile changes were made.

Regression coverage includes generic and synthetic umbrella-site fixtures, alternate hosting/source-control/repository/generator answers, N/A states and reasons, optional fields, selected services/data/access, sections, client tests and acceptance, website instruction/phase content, both forms of deferral, real missing requirements, stale review/marker state, storage compatibility, every other selectable project type, visible-input navigation and ZIP paths/manifests/tamper detection. The committed umbrella-site fixture uses an example identity, reserved example domain and neutral asset labels; client-identifying intake is retained only in local verification evidence.

## Manual local regression

All 19 documents from a local static umbrella-site reproduction were expanded and read in a browser. The fixture was then opened in the actual local Project Builder application and its Mission Control, package counters and deployment preview were inspected. No production project was changed. Client-identifying input and detailed case evidence remain local; the public regression fixture uses synthetic values.

| Check | Observed result |
| --- | --- |
| Standard package | 19/19 documents, non-empty and correctly mapped. |
| Missing markers / orphan markers | 0 / 0. |
| Website generated-content / export-integrity diagnostics | 0 / 0. |
| Readiness | Draft, not Ready for Codex; 6 Client Review diagnostics and 8/13 checklist checks complete. |
| Manual reviews | Scope, acceptance criteria and draft-package review remain unconfirmed. |
| Contact | Explicitly Deferred before implementation, with original owner sentence retained; 0 unanswered intake questions in Mission Control. |
| Deployment | Cloudflare Pages, GitHub, the supplied repository and URL, main, the supplied domain and Eleventy retained. |
| Scope / requirements / blueprint | Reports are Not Applicable; no stale report markers or invented local-persistence scope. |
| Data / screen / workflow / security / branding | No invented tables, roles, empty-state or notification requirements; recorded sections, journeys and all six authoritative assets retained. |
| Tests / acceptance | Website visitor experience, recorded features and owner success criteria; no package-builder persistence, generation or export acceptance tests. |
| Architect / Codex / phases | Website setup, branding, navigation, content, responsive accessibility, SEO/performance/security and release readiness; no platform boilerplate. |

The 6 Client Review diagnostics represent three manual gates, the contact decision, and the two checklist dependencies on resolving that decision. They are not six missing intake answers. The aggregate evaluator retains its additional overall Client Review status message; the website preview no longer counts that group again as a generated-content defect.

## Known limitations and tooling findings

- Manual verification used a local reproduction, not a byte-for-byte production storage export. Automated tests use synthetic client details with the same capability, deployment and review-state coverage. Production intake, approvals and client repositories remain outside this change.
- Hosting/source-control/repository answers retain their existing combined text field. No architecture decisions or new services are inferred from provider names or project names.
- Existing ambiguous free-text deadlines need owner review; only an explicit before-implementation TBD/deferral clause gets the compatibility projection. Existing structured review decisions remain the normal mechanism.
- The pre-existing development-tooling audit still reports 30 vulnerable dependency entries: 28 high and 2 moderate. These totals were already recorded in the repository's change log. The production-only audit (`npm audit --omit=dev --json`) reported zero. These are dependency-entry counts, not 30 distinct advisories. The owner explicitly authorized continuing generation work and documenting the tooling findings; dependency remediation is separate work.
- The existing Vite large-chunk warning remains. Publishing and merging require subsequent owner/Architect review.
