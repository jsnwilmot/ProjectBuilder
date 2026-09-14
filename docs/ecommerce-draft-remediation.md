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

Foundation collects merchant/storefront model, approved architecture and deployment contract. Features collects route/brand-theme/catalog context mapping, an explicit cart decision and approved phase contracts. Security exposes the editable decision register. These fields appear only for ecommerce. Existing projects default the new fields to blank and retain all existing fields and local storage data.

The Rose & Paw regression fixture selects a single merchant/shared platform with four branded contexts: `/digitaldesigns`, `/3ddesigns`, `/apps`, `/petapparel`. Its shared eligible-item cart is an explicit source requirement, not inferred from the storefront choice. Separate carts and unified storefronts remain supported choices. These defaults are not hard-coded into generic product intake.

Architecture contracts begin `Approved:` and require named runtime, backend, database, integrations and repository values. Deployment requires environments, source control, CI, build, deployment, DNS, secrets, migrations, integrations, observability, backup, restore, rollback, smoke and responsibilities. Values are separated by semicolons or newlines. Unknown/TBD/pending contracts do not unlock implementation. Phase JSON requires objective, prerequisites, files, contracts, security, accessibility, testCommands, acceptanceCriteria, evidence and stopConditions; each is an approved nonempty string. Actual technology, paths and commands are client/Architect decisions, never generated guesses.

## Verification and release

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
