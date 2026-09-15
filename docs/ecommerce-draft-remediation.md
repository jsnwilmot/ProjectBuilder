# Ecommerce Draft 1 generation remediation

Ecommerce projects use nineteen web-oriented documents with commerce-specific testing, deployment and architecture-aware phases. The saved client's business requirements are never rewritten to conceal an output defect. Existing business/static website and application/Power Platform template routes remain unchanged.

## Root causes and regression evidence

At baseline `c510062`, ecommerce fell through to the generic application template registry in `generateProjectPackage.ts`. Unconditional generic tests, deployment and phase strings in `templates/documents/index.ts` emitted builder self-tests and unrelated platform instructions. `clientReview.ts` derived questions from missing fields only; an OQ register inside a nonempty Assumptions field was treated as answered. Client checklist readiness also ignored content markers, and general document statuses could claim implementation readiness despite an unresolved architecture decision.

Commit `13112f8` records the seven failing Draft 1 regressions before production changes. The baseline unit/integration run had 3,499 passing existing tests and seven intended failures. An independent focused existing suite had 130 passing tests.

## Normalized records

`ecommerceDecisions.ts` is the shared source for questions, deferrals and architecture/launch boundaries. Existing line-based `OQ-nn: question` records in Assumptions migrate read-only to deferred questions. Explicit decision records override them by stable ID. Their format is:

```text
ID | architecture, launch or optional | Needs answer, Deferred, Answered or Not applicable | question | reason | approved answer
```

Answered requires an answer; Not applicable requires a reason. Malformed records block implementation. An ordinary review checkbox cannot erase an unresolved source decision. The generator shows current explicit statuses in legacy question prose without changing saved source requirements. Nonblocking optional deferrals remain visible. Architecture decisions block implementation; unresolved production decisions block launch while allowing architecture review. Production readiness is separate from approval to plan.

The register parser requires exactly six unescaped fields. Use `\|` for a literal pipe and `\\` for a literal backslash inside any field; all other escape sequences fail closed with a line-specific `EC-RECORD-n` blocker. For example, `/shop \| Brand \| Catalog` is parsed as the complete answer `/shop | Brand | Catalog`. Extra unescaped columns are never joined or truncated.

Every ecommerce marker is an ID with a corresponding visible decision/source field. No marker is silently stripped. Unresolved implementation configuration uses `EC-ARCHITECTURE`, `EC-DEPLOYMENT` and `EC-PHASES`; model, route and cart gaps use their own records. All generated files and the manifest use the same counts and final readiness. Manual review flags remain manual.

## Storefront and contract fields

Implementation-facing rendering consumes normalized values from the ecommerce decision engine. A rejected model, route mapping, cart scope, architecture or deployment contract displays its own `Unresolved: EC-*` decision; a nonblank rejected value never becomes an approved instruction. Valid independent fields remain visible when another field is unresolved. Raw intake stays editable and Client Questions retains the traceable decision.

Client Review distinguishes provenance from the resolution target. Legacy OQs retain Assumptions as their origin, including after an explicit record overrides their status, but their read-only cards instruct the user to add or update the matching OQ in Ecommerce Decision Register. Malformed register rows point to that register; dedicated and required-field cards point to their intake field. Optional metadata is derived during synchronization, so existing saved review records need no migration.

Test evidence uses one subject-relative classifier for both selected requirements and unresolved dependencies. Deferrals attached to a requirement (`VAT pending approval`, `pending approval for VAT`, `Shipping model unknown`) remain unresolved. Ordinary business states (`Charge VAT when an order is pending fulfillment`, `Refund pending payments after reconciliation`) preserve their recorded tests. Existing coordinated-negation and enumerated-option extraction use the same classifier.

Foundation collects merchant/storefront model, approved architecture and deployment contract. Features collects route/brand-theme/catalog context mapping, an explicit cart decision and approved phase contracts. Security exposes the editable decision register. These fields appear only for ecommerce. Existing projects default the new fields to blank and retain all existing fields and local storage data.

The Rose & Paw regression fixture selects a single merchant/shared platform with four branded contexts: `/digitaldesigns`, `/3ddesigns`, `/apps`, `/petapparel`. Its shared eligible-item cart is an explicit source requirement, not inferred from the storefront choice. Separate carts and unified storefronts remain supported choices. These defaults are not hard-coded into generic product intake.

Architecture contracts begin `Approved:` and require named runtime, backend, database, integrations and repository values. Deployment requires environments, source control, CI, build, deployment, DNS, secrets, migrations, integrations, observability, backup, restore, rollback, smoke and responsibilities. Values are separated by semicolons or newlines. Unknown/TBD/pending contracts do not unlock implementation. Phase JSON requires objective, prerequisites, files, contracts, security, accessibility, testCommands, acceptanceCriteria, evidence and stopConditions; each is an approved nonempty string. Actual technology, paths and commands are client/Architect decisions, never generated guesses.

## Verification and release

### Pass 9 governing option context

All option families share subject-relative prefix/postfix evidence classification. A narrow selection-subject grammar (currency, provider, checkout mode, shipping model, tax jurisdiction, return policy, authentication and related decision nouns) attaches unresolved values to their candidate without treating unrelated pending orders/payments, unknown transactions or customer uncertainty as a selection state. The existing resolution classifier remains the authority for uncertainty phrases. Direct speculation (`maybe`, `possibly`, `probably`, `likely`, `may be`, `being considered`) cannot authorize a mentioned option. Explicit negatives retain precedence, and existing semicolon/newline/sentence/contrast boundaries allow a later approved choice; commas do not break coordinated negation. A candidate-local subsequent `now approved`/selected confirmation can supersede tentative wording without borrowing another candidate's approval. Supported provider syntax and currency normalization remain unchanged.

Tests-only commit `a6c78ec` reproduced 48 failures with 44 passing controls (92 total) on reviewed production head `9d23070f08aa923b85aeabbd7f3986cc17e13df0`. Run `npm run test:unit -- src/tests/ecommercePass9Remediation.test.ts` for focused verification. The exact baseline failed cases were:

- does not authorize undecided currency: not sure which currency, maybe usd
- does not authorize undecided currency: currency pending approval: usd
- does not authorize undecided currency: not sure whether currency should be usd
- does not authorize undecided currency: not sure whether to use usd
- does not authorize undecided currency: unsure if usd should be used
- does not authorize undecided currency: currency pending approval, likely usd
- does not authorize undecided currency: currency undecided: cad
- does not authorize undecided currency: currency undecided, likely cad
- does not authorize undecided currency: currency still unknown, maybe eur
- does not authorize undecided currency: currency not confirmed: gbp
- does not authorize undecided currency: awaiting currency decision: usd
- does not authorize undecided currency: awaiting currency decision: eur
- does not authorize undecided currency: awaiting approval of currency, usd
- does not authorize undecided currency: currency to be determined, possibly cad
- does not authorize undecided currency: payment currency TBD: eur
- does not authorize undecided currency: payment currency TBD: gbp
- does not authorize undecided currency: payment currency still unknown: gbp
- does not authorize undecided currency: usd maybe, still awaiting approval
- does not authorize undecided currency: usd is being considered but not approved
- does not authorize undecided currency: maybe usd
- does not authorize undecided currency: possibly usd
- does not authorize undecided currency: probably usd
- does not authorize undecided currency: likely usd
- does not authorize undecided currency: Currency may be USD; final decision pending.
- does not authorize undecided currency: not certain whether to use usd
- does not authorize undecided currency: don't know which currency, usd
- does not authorize undecided currency: currency pending approval: usd, cad, or eur
- does not authorize undecided currency: USD approved, pending approval
- preserves selected currency and ordinary business states: Unknown USD transactions are sent to manual review.
- respects later approval and segment boundaries: currency pending approval: USD, but CAD is approved => CAD
- respects later approval and segment boundaries: We considered USD, but CAD is approved. => CAD
- respects later approval and segment boundaries: Currency pending approval: USD, but CAD has since been approved. => CAD
- respects later approval and segment boundaries: currency pending approval: usd; cad accepted => CAD
- preserves negative precedence and coordinated groups: do not support usd; maybe cad
- keeps generated test-plan and acceptance currency dependencies synchronized
- does not authorize undecided supported provider syntax: not sure which payment provider, maybe Stripe Connect payments
- does not authorize undecided supported provider syntax: payment provider pending approval: Square payments
- does not authorize undecided supported provider syntax: awaiting payment provider decision: payments via Stripe Connect
- does not authorize undecided supported provider syntax: payment provider still unknown: webhooks from Square
- does not authorize undecided checkout: not sure which checkout mode, maybe guest checkout
- does not authorize undecided checkout: checkout mode pending approval: guest checkout
- does not authorize undecided checkout: unsure whether to use authenticated checkout
- does not authorize uncertain MFA: not sure whether to require Admin MFA
- does not authorize uncertain MFA: authentication pending approval: Admin MFA
- does not authorize uncertain MFA: maybe Admin MFA
- uses shared unresolved detection for generic evidence: tax jurisdiction pending approval: VAT
- uses shared unresolved detection for generic evidence: shipping model still unknown: shipping
- uses shared unresolved detection for generic evidence: return policy pending approval: refunds

Passing controls cover 16 selected-currency/business-state cases, one already-unresolved currency postfix, nine established contrast/boundary or subsequent-approval cases, five negative-polarity cases, four supported-provider cases, two checkout cases, one approved MFA case and six unrelated-business-state generic-evidence cases. Generated test-plan and acceptance criteria are checked together for unresolved currency dependencies. No saved Chrome project is regenerated by these deterministic fixture tests.

### Pass 8 decision-source and currency safeguards

Duplicate OQ identifiers within legacy Assumptions preserve the first imported record and generate an architecture-blocking `EC-LEGACY-OQ-n` for every later occurrence, where `n` is its actual source line (including blank/non-OQ lines). The reason identifies the duplicate OQ and source line. These synthetic IDs are reserved in the explicit register. A valid explicit matching OQ still overrides the imported compatibility question but cannot erase a duplicate-source blocker. Resolve duplicate-source cards in Assumptions; explicit-register duplicate handling remains unchanged.

The shared resolution classifier recognizes full-value `not sure`, `unsure`, `uncertain`, `not certain`, `not known`, `don't know` and `do not know`, including `yet` and established after/until/pending/awaiting deferral suffixes. It does not reject explanatory business prose containing those terms. Answered decisions, not-applicable reasons, required intake validation and generated missing markers continue to share this classifier.

Supported currency codes match case-insensitively with unchanged candidate-relative polarity and coordinated negation. Only the selected positive currency value is uppercased for generated requirements; intake and evidence source text are not rewritten. Provider matching and the supported currency list remain unchanged.

Tests-only commit `b3673c5` ran on reviewed production head `4aa36272f7`: 25 expected failures and 15 passing controls (40 total). Exact failing cases: three duplicate sequences (architecture/architecture, architecture/launch, launch/architecture), duplicate source plus explicit override, synthetic legacy blocker overwrite; eleven uncertainty values (`not sure`, `Not Sure.`, `unsure`, `uncertain`, `not certain`, `not known`, `don't know`, `do not know`, `not sure yet`, `unsure pending client confirmation`, `not certain until discovery`); nine currency inputs (`checkout in usd`, `cad`, `Cad`, `usd accepted`, `eUr accepted`, `do not support usd; cad only`, `no usd; gbp accepted`, `cad, usd, and eur are not supported; gBp accepted`, `no cad, usd, or eur support, but gBp is accepted`). Controls cover single/distinct OQs, intended override, explicit duplicate rejection, five business-prose values, uppercase currency, negative-only and unresolved currency evidence. Run `npm run test:unit -- src/tests/ecommercePass8Remediation.test.ts` for focused verification.

Run `npm test`, `npm run build`, `npm run lint`, `npm audit --omit=dev` and `git diff --check`. The full runner includes existing application, website, export and platform suites. New tests cover seven original defects, traceability, count consistency, resolution provenance, invalid records/contracts, cart separation, route propagation, storage compatibility and labelled controls with persistence across remount.

Final verification passed 3,597 tests across 102 files (3,518 unit/integration and 79 UI), lint, TypeScript/production build and a production dependency audit with zero vulnerabilities. The deterministic Rose & Paw artifact contains all 19 documents, all 20 OQ markers, four implementation blockers, 19 launch blockers, zero orphan markers and zero prohibited-content findings. It remains Draft because 23 source decisions are unresolved.

PR #6 follow-up remediation adds regression coverage for placeholder-only decisions, parsed contract key/value validation, separate implementation/launch document statuses and dedicated ecommerce field test selection. The corrected full runner passes 3,603 tests across 103 files (3,524 unit/integration and 79 UI). A decision resolves only when its answer or not-applicable reason is meaningful after whitespace and punctuation normalization. Contracts reject malformed or duplicate entries and require a meaningful value for every required key. Implementation documents may advance after implementation blockers clear, while package and deployment readiness stay Draft until launch blockers clear.

The next PR #6 review pass separates general decision answers from implementation-gating configuration. Structured storefront, cart, route, architecture, deployment and phase values reject unresolved tokens anywhere in the value. Storefront and cart controls persist canonical choices, and route records require exactly `route | brand/theme | catalog` with a safe unique route and meaningful context values. Duplicate explicit IDs preserve the first explicit row and create a traceable `EC-RECORD-n` blocker at the stricter affected gate.

Required ecommerce fields now use the same project-level requiredness contract in intake validation, Client Review and the reused website document helpers. A blank required source creates a source-specific ecommerce decision plus markers in Client Questions and the relevant generated document; marker traceability points back to the visible intake field. Ecommerce decision cards carry typed source-resolution metadata and cannot be changed from Client Review, while ordinary saved review cards retain their existing controls. Complete verification for this pass covers 3,615 tests across 105 files (3,536 unit/integration and 79 UI).

The fourth PR #6 review pass makes optional ecommerce decisions visible without turning them into readiness defects. The normalized decision state now exposes blocking and optional unresolved groups. Client Questions emits `[MISSING:]` only for architecture and launch decisions and renders optional items as traceable `[OPTIONAL:]` records that readiness scanners ignore. Source-controlled optional gate cards also remain nonblocking when their status is `Needs answer`. Root `/` is accepted as a canonical safe storefront route while duplicate, malformed and placeholder route records continue to fail closed.

Ecommerce test and acceptance generation now comes from a shared source-evidence builder. Storefront, cart, checkout integrity, accessibility, security, performance, recovery and smoke checks use provider- and locale-neutral invariants. Checkout mode, currency, payment provider, tax, shipping, pickup, inventory, digital delivery, quotes/uploads, order access, returns and role details appear only when the saved intake records them. Unresolved configuration produces explicit test dependencies instead of assumed values. The Rose & Paw fixture explicitly records its guest checkout, CAD, Square, Canadian tax, live-carrier shipping, pickup, 30-day return and administrator-MFA requirements; an independent authenticated USD/Stripe/United States fixture proves those defaults do not leak to other stores.

The fifth PR #6 review pass applies the established placeholder-only vocabulary to every field returned by the ecommerce required-field contract. Intake validation, section completion, Client Review reconciliation, ecommerce decisions and reused document rendering now agree that blank, TBD, unknown, pending, unconfirmed and equivalent standalone answers remain unresolved. Meaningful prose remains valid even when a business rule contains a word such as `pending`. Optional fields do not gain implementation blockers from this required-field rule.

Commerce option extraction now evaluates each matched checkout mode, currency, payment provider and MFA option in its own source clause. Explicit exclusions before or after the matched option are skipped, and matching continues to the next positive recorded choice. Negative-only and unresolved statements retain neutral scope dependencies; they never authorize a replacement choice. The same candidate-specific polarity check is also used for conditional commerce evidence such as tax, shipping, pickup and webhooks.

The sixth PR #6 review pass classifies general decision values as resolved, unresolved or empty. Explicit deferral phrases such as `pending client approval`, `TBD after discovery` and `awaiting architecture decision` remain unresolved, while business rules about pending payments, unknown users or deferred jobs remain meaningful. The classifier is shared by answered decisions, not-applicable reasons and required ecommerce source fields; structured architecture, deployment, route, cart and phase configuration retains its stricter validation.

Option evidence now retains the source field, source text, semantic clause and positive, negative or unresolved polarity. Commas remain inside coordinated groups, while sentence boundaries, semicolons and explicit contrast transitions separate clauses. This prevents later members of `No CAD, USD, or EUR support` from becoming positive choices and still allows `GBP` after `;` or `but`. Provider extraction preserves unambiguous multi-word names in both forward and reverse forms, including `Stripe Connect payments`, `payments via Stripe Connect` and `webhooks from Stripe Connect`, without including leading action words.

To regenerate the deterministic review artifact in PowerShell:

```powershell
$env:ECOMMERCE_REVIEW_OUTPUT='qa/ecommerce-after'
npm.cmd run test:unit -- src/tests/ecommerceReviewArtifact.test.ts
Remove-Item Env:ECOMMERCE_REVIEW_OUTPUT
```

The output is an Architect-review Draft, not an implementation or release approval. Review all documents and unresolved decisions. Merge/deployment still require the normal project approval process. After an approved production deployment, reload the same local Chrome project, confirm saved data, enter the new model/route/contract fields, and regenerate there. Do not clear browser storage or create a replacement project.
