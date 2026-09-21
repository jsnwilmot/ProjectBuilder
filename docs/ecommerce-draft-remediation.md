# Ecommerce Draft 1 generation remediation

## Pass 18 effective current state

Pass 18 starts from exact reviewed head `3929395ad296a9751fdb1795882f208af65ac934`. The tests-only baseline commit `7385390` records 12 expected failures and four passing controls across 16 tests. Baseline failures are the three distinct singleton conflicts, provider-conflict evidence selection, case-normalized provider agreement, strongest-gate conflict severity, tax/shipping/pickup/returns Not-applicable contradictions, cross-document N/A synchronization, and stale regeneration. Passing controls are normalized currency agreement, N/A without positive evidence, unrelated N/A isolation, and a new source blocker overriding an old ready package.

Singleton provider, currency and checkout choices are grouped by question-context semantics rather than decision IDs. One normalized value is effective even when repeated; distinct normalized values create deterministic `EC-SELECTION-CONFLICT-*` decisions and no selection. Conflict severity is the strongest contributing gate, original records remain untouched, and generated verification cannot choose a winner by register order.

Recognized requirement domains use the same normalized Decision Register outcomes for readiness and verification. An uncontested `Not applicable` outcome excludes its domain without inventing a dependency. Positive Answered or free-form evidence against that exclusion creates a deterministic `EC-EVIDENCE-CONFLICT-*` blocker, suppresses misleading positive verification and remains visible in Client Questions and package readiness. Unrelated questions do not suppress commerce evidence, and no test-generation code reparses the raw register.

During regeneration, Ecommerce website base templates receive the current source and generation context but an empty generation-scoped document collection. Persisted documents remain untouched on the saved project; they are simply not treated as evidence about the package currently being rendered. New blockers still come from current source state, while old missing markers and obsolete regeneration actions cannot survive into the new package.

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

### Pass 17 effective structured choices and provider negation

The normalized Ecommerce decision authority now identifies payment-provider, checkout-currency and checkout-mode selection questions from their question context rather than their IDs. An effective Answered record contributes a normalized selection only when its answer is semantically resolved, positively selected and supported by that selection category. Negative-only selection answers fail closed as `Needs answer`, so decision readiness and generated verification cannot disagree. Generated requirements consume these effective selections before narrative evidence and never parse the raw six-column register independently.

Explicit provider discovery validates the complete structurally bounded value before direct-negation handling. For a resolved phrase beginning with `not` or `no`, the prefix remains outside the provider candidate span and candidate-relative polarity classifies the underlying complete provider name as negative. `Not sure` and other placeholders are rejected before this normalization, while a later independent positive provider remains selectable. Multiword names such as `Stripe Connect` remain intact.

Tests-only commit `1d633bf` reproduced 20 failures and 10 passing controls (30 total) against exact reviewed head `edeaeec307080186d1e4d02305693643949f71a1`. Exact failures: provider-only, currency-only, checkout-only and combined Decision Register evidence; three arbitrary-ID/question-context cases; four structured-over-narrative precedence cases; synchronized `TEST_PLAN.md` and `ACCEPTANCE_CRITERIA.md`; negative-only structured answers `not Stripe` and `no Stripe Connect`; negative-only explicit `not Stripe`; and four negative-then-positive explicit provider forms covering colon/`is`, `not`/`no` and multiword providers. Run `npm run test:unit -- src/tests/ecommercePass17Remediation.test.ts` for focused verification.

### Pass 16 conservative attribution and provider-decision subjects

Attributed decision tails no longer treat `s`/`es` morphology as proof of a finite predicate. A business/action continuation requires a completed grammatical actor head followed by a predicate-sized token and complement. When a collective head such as a team, group, board, committee or staff occurs, its structural position governs the boundary. This keeps terminal actors such as `global business operations group` unresolved while preserving both base-form and inflected action prose such as `managers alert customers` and `managers alerts customers`, without a workflow-verb dictionary or actor identity allowlist.

Pending provider context is parsed in stages: extract the subject of the end-anchored `while ... is/remains pending` clause, identify whether the subject represents provider selection, then delegate the canonical state to the shared resolution classifier. Bare and provider-qualified decision subjects, established decision-actor forms, and straight/curly possessives remain unresolved. Workflow subjects such as refund, return, order and shipment approval remain positive provider context. Possessive workflow qualifiers (`customer's refund approval`) remain distinct from a possessive provider-decision actor (`customer's approval`).

Tests-only commit `6f07d78` reproduced 16 failures and 41 passing controls (57 total) against exact reviewed head `d90892e12266adc83f8abefaa8bad2f621aeb531`. Exact failures: `Pending USD approval by global business operations group`; `Pending USD approval by enterprise business operations group`; `Pending refund approval by managers alert customers`; `Pending refund approval by managers email customers`; `Pending refund approval by managers notify support`; `Pending shipping decision by logistics staff generate alerts`; `payments via Square while refund approval is pending`; `payments via Square while return approval is pending`; `payments via Square while order approval is pending`; `payments via Square while the client's approval is pending`; `payments via Square while the customer’s approval is pending`; `payments via Square while the owner's approval is pending`; `payments through Stripe Connect while the stakeholder's confirmation is pending`; `payments through Stripe Connect while the vendor’s confirmation remains pending`; `payments via Square while the security team's approval is pending`; `payments via Square while the project owner’s decision is pending`. Run `npm run test:unit -- src/tests/ecommercePass16Remediation.test.ts` for focused verification.

### Pass 15 structural predicate boundaries and decision-relative provider state

Attributed decision tails no longer maintain a list of workflow predicates. A continuing action is recognized structurally when an arbitrary-length attribution contains a nonterminal auxiliary or finite third-person predicate followed by its complement. Derivational plural noun morphology remains inside terminal actor noun phrases, preserving actors such as `business operations group`, `procurement steering committee` and `advanced systems board` without an actor allowlist or word-count cap.

Provider entity extraction remains separate from context polarity. A `while ... pending` context is canonicalized as unresolved only when its grammatical subject is headed by the closed decision-status category approval, confirmation, selection, decision, authorization or review. This keeps `Square while client approval is pending` unresolved but preserves Square when refunds, orders, shipments, transactions or payment captures are pending. `subject to` and `under review` conditions, sentence-case unresolved values, scope clauses and legacy false-provider protections remain unchanged.

Tests-only commit `76bbdb3` reproduced 11 failures and 38 passing controls (49 total) against exact reviewed head `ed42aecf286a54aaa97e05f8805ccde3fedd5de6`. Exact failures: six attributed action continuations (`alerts customers`, `emails customers`, `launches reconciliation`, `creates documentation`, `publishes receipts`, `escalates cases`) and five resolved providers followed by pending business objects (refunds, orders, shipments, transactions and payment captures). Run `npm run test:unit -- src/tests/ecommercePass15Remediation.test.ts` for focused verification.

### Pass 14 terminal actors and provider status conditions

Attributed decision tails no longer impose a lexical word limit on the actor. A structural helper accepts the complete terminal noun phrase after `by` or `from`, but rejects it when the remainder contains a finite predicate with a following complement. This preserves long actors such as `product steering committee` and `information security review board` while keeping `approval by managers triggers notifications` as business/action prose. No actor-name allowlist is used.

Explicit provider parsing finds the earliest boundary from small grammatical context classes instead of treating the whole relationship remainder as the provider. Auxiliary and pending states, `subject to` conditions, `under review`/`under consideration`, not-yet decisions, and `for`/`when`/`while` scopes remain in the source after the provider span. Candidate-relative status normalization delegates outstanding approval, review and condition meaning to the shared resolution classifier. Scope prose such as `for online orders` and `when processing refunds` remains positive, while `subject to client approval` and `while approval is pending` remain unresolved.

Tests-only commit `4adc827` reproduced ten failures and 24 passing controls (34 total) against exact reviewed head `a1ce9bb9828f59b68db451d5f7307ad753fcd31d`. Exact failures: five long terminal actors (`product steering committee`, the same actor with `the`, `information security review board`, `senior project management team`, `ecommerce governance working group`) and five provider conditions (`subject to client approval`, `subject to security approval`, `under review`, `not yet approved`, `while approval is pending`). Run `npm run test:unit -- src/tests/ecommercePass14Remediation.test.ts` for focused verification.

### Pass 13 bounded provider entities and decision attribution

Explicit provider parsing now separates relationship syntax, a bounded provider entity and its untouched trailing context. Auxiliary/status continuations such as `is pending approval` and direct pending/awaiting decision phrases start after the provider span, allowing the existing candidate-relative classifier to keep the provider unresolved. Scope continuations such as `for online orders`, `when processing refunds` and `while handling payment events` also remain outside the entity but do not make an otherwise resolved provider negative. Complete unresolved values such as `Not sure`, `Unknown` and `TBD` still reach the shared resolution classifier, and no vendor allowlist was added.

Candidate decision attribution remains end-anchored and now accepts a terminal actor noun phrase of one or two lexical words after optional `the`. That preserves `approval by the finance team` and similar attributed decisions while preventing a later predicate in `approval by managers triggers notifications` from being consumed as actor text. No actor or business-action vocabulary list is used.

Tests-only commit `07b7190` reproduced 12 failures and 24 passing controls (36 total) against exact reviewed head `df19da035343ff8da2eb95b903b9b6d83620eb56`. The failures were the four trailing-status provider cases (`payments via Square is pending approval`, `payments through Stripe Connect is awaiting approval`, `payment provider: Square pending approval`, `payment provider is Stripe Connect awaiting confirmation`), three trailing-scope cases (`payments via Square for online orders`, `payments through Stripe Connect for guest checkout`, `webhooks from Square for payment events`) and five attribution/action cases (`Pending refund approval by managers triggers notifications`, `creates a task`, `requires logging`; `Pending inventory confirmation by operators starts reconciliation`; `Pending shipping decision by staff generates an alert`). Run `npm run test:unit -- src/tests/ecommercePass13Remediation.test.ts` for focused verification.

### Pass 12 complete provider values and attributed decision tails

Explicit provider relationships extract their complete semicolon/newline/sentence/comma-bounded value before the shared resolution classifier runs. This preserves the discovery, semantic validation, contextual polarity and evidence-selection stages while leaving legacy shorthand strict. Candidate decision tails permit an end-anchored `by` or `from` attribution with a bounded actor phrase; no actor or business-object noun whitelist was added.

Tests-only commit `2bbdaf6` initially showed ten failures and 28 controls; one was an unrelated Shipping-control assertion and was preserved then corrected separately in `9e6bdea`. The corrected exact-head baseline is nine expected failures and 29 passing controls. Exact failures: `payment provider: Not sure`; `payment provider: Not sure; payments via Square`; `Pending USD approval by client`; `Pending USD approval by the client`; `Awaiting USD confirmation from owner`; `Pending inventory approval by stakeholder`; `Awaiting shipping decision from the owner`; `Pending guest checkout selection by client`; and `Pending USD approval by client, but CAD approved`.

### Pass 11 candidate decision tails and provider values

Candidate context now recognizes only the narrow singular decision/status nouns approval, confirmation, selection and decision, with constrained modifiers and deployment-stage targets. A pending or awaiting prefix plus that candidate-bound tail delegates to the existing shared resolution authority. A continuing phrase such as `approval requests require review` remains business prose, so no business-object noun whitelist returns.

Provider discovery remains separate from semantic validation and contextual polarity. Every captured provider value, including explicit provider/via/integration forms, must be resolved according to `classifyResolutionValue`; no second placeholder vocabulary was added. An unresolved first candidate is discarded without blocking a later independent resolved provider.

Tests-only commit `d3e3be4` reproduced 17 failures and 27 passing controls (44 total) against unchanged reviewed production head `d205df68e28835e2c6edbf20def3d6672960baff`. Run `npm run test:unit -- src/tests/ecommercePass11Remediation.test.ts`. Exact baseline failures were:

- Pending USD approval
- Pending USD final approval
- Awaiting USD confirmation
- Pending inventory approval
- Pending inventory confirmation
- Awaiting inventory approval
- Pending guest checkout selection
- Pending shipping decision
- Pending inventory approval for launch
- payment provider: Pending
- payment provider is Unknown
- payments via TBD
- payment provider: Unconfirmed
- payment provider: Pending Approval
- payment provider: Not Sure
- payment provider: Pending; payments via Square
- generated TEST_PLAN.md and ACCEPTANCE_CRITERIA.md for Pending USD approval plus payment provider: Unknown

### Pass 10 outstanding approvals, business grammar and provider identity

Tests-only commit `625b6e7` reproduces 72 failures with 68 passing controls (140 total) against unchanged reviewed production head `6ae326d538edf2da1232dbaef140e066ac4e3c89`. Exact failed cases are recorded below; passing cases cover existing decision states, final approvals, business prose and multiword provider syntax.

Candidate discovery, polarity classification and positive evidence selection remain distinct. The shared candidate-relative classifier canonicalizes outstanding approval grammar to the existing resolution authority, including final approval, not-yet/has-not-been approval and unapproved states. Genuine later approvals retain contrast boundaries and explicit-negative precedence. Bare uncertainty prefixes bind only to a completed candidate/qualified requirement phrase, not a continuing business-object noun phrase or action; no business-object noun whitelist remains.

Provider discovery prioritizes explicit payment-provider/integration, via/through/from and use-for relationships. The legacy title-case `Name payments/webhooks` shorthand is restricted to declaration/command subjects and established approval/integration continuations, rejecting currency codes and state/channel/geographic descriptors. Unknown vendors can use explicit relationship syntax without a vendor allowlist. Complete names and original source spans are preserved; extraction never grants approval. Currency recognition shares a single supported-code definition but is independent of provider discovery.

Run `npm run test:unit -- src/tests/ecommercePass10Remediation.test.ts`. Full repository validation, exact-head CI, automatic non-production branch preview and a fresh review precede Architect assessment. Only the existing automatic PR preview is authorized; no manual deployment command, production deployment, configuration change, merge, saved Chrome regeneration, Draft 2 export or target implementation is permitted. Issue #7 remains separate all-dependency maintenance.

Local validation passes 140/140 focused, 355/355 combined Pass 1–10 and 459/459 Ecommerce/Client Review/package/export/readiness tests across 22 files. The full runner's first attempt had three existing website capability 5-second timeouts and 3,865 passing unit/integration tests; the three cases passed in isolation, and the unchanged full retry passed 3,947 tests across 112 files (3,868 unit/integration and 79 UI). No runner/coverage/CI setting was changed. TypeScript, build, lint, production audit (zero vulnerabilities) and whitespace checks pass; coverage and exact-head remote gates remain required before final approval.

Baseline failures:

- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD not yet approved
- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD not yet confirmed
- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD not yet selected
- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD not yet accepted
- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD awaiting final approval
- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD pending final approval
- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD remains unapproved
- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD has not been approved yet
- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD has not yet been confirmed
- Ecommerce Pass 10 outstanding candidate approval keeps currency unresolved: USD has not yet been approved
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout not yet approved
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout not yet confirmed
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout not yet selected
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout not yet accepted
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout awaiting final approval
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout pending final approval
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout remains unapproved
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout has not been approved yet
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout has not yet been confirmed
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with checkout: guest checkout has not yet been approved
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments not yet approved
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments not yet confirmed
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments not yet selected
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments not yet accepted
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments awaiting final approval
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments pending final approval
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments remains unapproved
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments has not been approved yet
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments has not yet been confirmed
- Ecommerce Pass 10 outstanding candidate approval shares outstanding state with provider: Square payments has not yet been approved
- Ecommerce Pass 10 outstanding candidate approval selects genuinely later resolution: USD not yet approved, but CAD approved
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: Pending inventory refunds require review
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: Pending inventory transfers remain visible
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: pending inventory reconciliation runs nightly
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: deferred inventory updates retry automatically
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: unknown tax transactions enter review
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: pending refund requests require admin approval
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: pending refund requests require review
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: Pending inventory settlements complete overnight
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: Unknown shipping exceptions enter review
- Ecommerce Pass 10 candidate-relative business grammar preserves business noun phrase without noun whitelist: Deferred refund batches resume tomorrow
- Ecommerce Pass 10 explicit provider discovery does not invent provider: Pending USD payments remain visible to admins
- Ecommerce Pass 10 explicit provider discovery does not invent provider: Failed CAD payments retry automatically
- Ecommerce Pass 10 explicit provider discovery does not invent provider: Failed CAD payments are retried
- Ecommerce Pass 10 explicit provider discovery does not invent provider: USD payments are accepted
- Ecommerce Pass 10 explicit provider discovery does not invent provider: Canadian payments are supported
- Ecommerce Pass 10 explicit provider discovery does not invent provider: Online payments are required
- Ecommerce Pass 10 explicit provider discovery does not invent provider: Guest payments are allowed
- Ecommerce Pass 10 explicit provider discovery does not invent provider: Pending payments require review
- Ecommerce Pass 10 explicit provider discovery does not invent provider: Successful payments trigger fulfillment
- Ecommerce Pass 10 explicit provider discovery does not invent provider: Failed payments trigger notifications
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: CAD
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: USD
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: EUR
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: GBP
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: AUD
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: NZD
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: JPY
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: CNY
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: INR
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: CHF
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: SEK
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: NOK
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: DKK
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: MXN
- Ecommerce Pass 10 explicit provider discovery never interprets currency as provider: BRL
- Ecommerce Pass 10 explicit provider discovery preserves named relationship and complete name: payment provider: Square
- Ecommerce Pass 10 explicit provider discovery preserves named relationship and complete name: payment provider is Stripe Connect
- Ecommerce Pass 10 explicit provider discovery preserves named relationship and complete name: use Square for payments
- Ecommerce Pass 10 explicit provider discovery preserves named relationship and complete name: USD payments through Square
- Ecommerce Pass 10 explicit provider discovery separates ordinary currency evidence from provider identity without mutating intake
- Ecommerce Pass 10 explicit provider discovery keeps generated acceptance and test-plan evidence synchronized


### Pass 19 complete authoritative values and multi-clause exclusions

Structured Decision Register singleton choices resolve only when the complete answer expresses one settled result. Currency and checkout answers use exact normalized matching; provider answers remain open to arbitrary brand names but reject negative-only, speculative, conditional, pending and alternative-choice structures. Partial text can no longer authorize the first matching currency or checkout token.

Not-applicable evidence reconciliation evaluates every matching domain mention using the shared candidate-relative polarity rules. Negative exceptions remain negative, but they cannot suppress later positive requirements in the same source fragment. The shared resolution authority also recognizes narrow `not yet` decision/configuration phrases while preserving ordinary business workflow states.

Tests-only commit `cc0118a` reproduced 37 failures with 18 passing controls on exact reviewed head `29f7bb702f08f0c7b790ff9b8085d8b683d299ca`. Run `npm run test:unit -- src/tests/ecommercePass19Remediation.test.ts` for focused verification. Full repository CI, coverage, audit, automatic preview verification and the fresh review are performed by ChatGPT Architect after the Pass 19 push.

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
