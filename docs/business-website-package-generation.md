# Business Website package generation correction

## P1 follow-up: compound exclusion and replacement

Validation: 159 focused website tests passed. Both full runners passed 3,267 tests across 96 files, including all 78 UI tests. Coverage passed unchanged thresholds at 90.05% statements / 83.24% branches / 95.47% functions / 93.45% lines. Lint, TypeScript/build, production audit (zero vulnerabilities) and diff checks passed. The existing build-size warning remains; dependencies were not changed.

Merged main `f2c506e98a0835f5bad22a29e6d42f24d225d1f9` still excluded `No contact form is approved, implement an approved booking form`: the comma left the request inside a clause beginning with an exclusion, while positive requests were anchored to a separate clause. The new reproducer had 15 failing tests before the parser change.

The parser now recognizes a comma (optionally followed by and/except/instead), or an and/except/instead conjunction, as a boundary only when followed by a known imperative request verb. It does not split ordinary comma lists. Request matching stops at remaining commas so an unrelated request cannot borrow a capability noun from a later exclusion. The same bounded rule applies to all seven existing capability fields; the field-specific subject match and structured N/A/Deferred decisions still control selection. Answers remain verbatim, including the exclusion of the original form.

The 29 added cases cover all four reported examples, replacement output across all seven fields, negative-only prose, unrelated negative wording, comma lists, cross-field isolation, explicit negative requests, structured decisions, and Static Website export/contact deferral. Existing project-family and 19-document contract tests remain mandatory. This extends the existing bounded English grammar; it introduces no general NLP, schema or storage migration, dependency change or production modification.

## Follow-up: negative capability selection

Production review after the first fix found zero missing/content/export errors but incorrect optional work: DATA_MODEL declared application data requested, test/acceptance tables included analytics/data/access checks, and phases included services despite explicit exclusions. The source used `websiteSelected(field) => websiteRequirement(field).status === "answered"`. Dependency validation had a similar nonempty-answer shortcut. A populated answer can explicitly reject a capability.

`websiteCapabilitySelected(project, field)` now separates capability selection from requirement status. Its field argument is the closed `WebsiteCapabilityField` union from `websiteCapabilityIntent.ts`. It honors field visibility, structured N/A and Deferred decisions, existing whole-answer N/A values, and existing before-implementation deferral handling before applying a bounded field-specific exclusion grammar. An N/A decision without a reason still produces a missing requirement; it does not authorize a service.

| Field | Capability decision |
| --- | --- |
| websiteForms | Form processing |
| integrations | External systems/API integrations |
| websiteAnalytics | Analytics/tracking |
| dataCollections, dataEntities | Persistent application data |
| authenticationExpectation | Authentication/access controls |
| reportsDashboards | Reports/dashboards |
| dataSources | Descriptive content provenance only; never activates additional services |

All prior `websiteSelected` call sites activated optional work. They now use the typed selector. The services phase uses the same field registry; data/access dependencies also use the selector. Ordinary scope, branding, navigation, content and security answers continue to render through requirement states without capability classification.

### Negative prose and positive protection

Compatibility recognizes capability subjects in bounded exclusion clauses: for example, `No analytics are required`, `Do not add analytics`, `Authentication is outside scope`, or `Static content only; no database`. It also handles the existing analytics placeholder value `Not approved`. These answers are preserved verbatim and remain Answered, rather than being globally converted to N/A or erased.

The grammar does not search for arbitrary `no`, `none` or `not` substrings. Negation must refer to the field's capability. Historical absence (`No current database exists`) and constraints on another concern (`No errors in analytics`) do not exclude the capability. An independent explicit replacement request prevents an exclusion clause from suppressing newly requested work. Structured N/A/Deferred decisions still take precedence over positive prose. Tests protect replacement analytics, newly created databases, authenticated-only users and new report requests.

### Compatibility and limitations

- No persisted schema, storage version, migration, intake UX, review controls or saved answers changed. Existing generated documents still require explicit regeneration after an approved release. Positive capabilities still produce their dependent requirements, checks and services phase. Application and Power Platform template families remain untouched.
- This is bounded English legacy compatibility, not general language understanding. Unrecognized free-text descriptions retain existing selection behavior; structured N/A/Deferred controls remain the reliable way to settle ambiguous or contradictory intent. No customer name, provider name or cross-field prose inference determines selection.
- The generated-content counter checks markers, template/structural rules and existing typed diagnostics. Zero does not prove semantic consistency. Deterministic pre-generation applicability and regression tests provide the correction; no semantic contradiction scanner was added.
- `dataSources`, workflows, notifications, branding and ordinary page content remain descriptive in this change. Ordinary outbound navigation is already covered by the base website checks and does not require an integration-services phase when integrations are explicitly excluded.

### Baseline and manual evidence

Baseline main: `2b5231edd00bb7d7ba82fa30e8632c958bd9018f`. A clean checkout completed `npm ci`, `npm test` and `npm run test:coverage`: 3,080 unit/integration tests plus 78 UI tests, 3,158 total in 95 files. Coverage: 90.02% statements / 83.21% branches / 95.43% functions / 93.44% lines. Lint, app TypeScript, build and production audit passed. An initial install in an earlier checkout encountered a locked native build-tool file; verification moved to the clean checkout without terminating unrelated processes. The new reproducer failed 45 of 74 tests against unchanged main, then passed after correction; additional precedence/isolation tests were added.

Manual browser reproduction used only the new fictional static umbrella-site fixture and local generator modules. It generated 19 documents without mutating the input. DATA_MODEL states no persistent application model requested and retains the negative answers. TEST_PLAN and ACCEPTANCE_CRITERIA each contain the nine base website checks, without excluded capability rows. The seven normal website phases omit Requested website services. Deployment preserves the recorded static host, Git repository, main branch, example domain and Eleventy. Architect/Codex instructions remain website-specific. Contact appears in two before-implementation deferred fields; the three manual gates remain unapproved, with seven review diagnostics overall and zero unanswered intake fields. Missing/orphan markers, content blockers and export errors are zero. No production storage was accessed.

Final validation passed on the completed implementation: `npm test` and `npm run test:coverage` each ran 3,160 unit/integration tests in 89 files plus 78 UI tests in seven files, totaling 3,238 tests / 96 files. The added suite contains 80 tests; the focused website matrix passed all 130 tests. Coverage passed unchanged thresholds at 90.05% statements / 83.24% branches / 95.47% functions / 93.45% lines. Lint, app TypeScript, production build and diff whitespace checks passed. The production audit reported zero vulnerabilities. The report-only full audit retained seven development-tooling findings (five high, two moderate); dependencies were not changed. The build retains its existing large-chunk warning. No merge or deployment is part of this correction.

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
