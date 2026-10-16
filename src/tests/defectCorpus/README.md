# Phase 6D.3 — permanent defect corpus v1.0.0

Authorized baseline: `b78499a7e637e795af2ff34700ecd681069f30fb`.
PR #9's production remediation was merged at `7bafb2b4562b1b220b205e829eaa85ff9953812b`;
PR #8's test foundation was merged at the authorized baseline. Live remote main,
local main, branch cleanliness and the merged PR records were independently checked.
The initially stale local main was reported before being fast-forwarded. Implementation
is isolated on `codex/phase-6d3-defect-corpus`.

This is a synthetic, test-local corpus, not an invariant registry, parser, resolver,
readiness decision, or production authority. It uses the existing
[`createSingletonProject`](../invariants/ecommerceSingletonObservation.ts) builder
(which uses the historical Ecommerce fixture). No saved projects, network data,
persistence, generated-package writes or approval mutations are involved.

## Representative seeds and regression mappings

Exact inputs and separately authored oracles live in [seeds.ts](./seeds.ts).
Structured fixtures retain ID, answer, question and narrative; the serializer uses
the literal six-column `launch | Answered | … | Approved fixture answer` form.
The raw grammar seed retains the complete original escaped register line.
`sourceDomain`, project type, classifications, invariant/property references,
history, version and a reproduction command are typed in [types.ts](./types.ts).

| Identity | Preserved failure property | Origin | Reliably established fixing commit |
| --- | --- | --- | --- |
| PB-CORPUS-EC-001 | Structured-only Square drives verification | [Pass 17](../ecommercePass17Remediation.test.ts) | `3929395ad296a9751fdb1795882f208af65ac934` |
| PB-CORPUS-EC-002 | Lowercase structured currency yields USD | [Pass 17](../ecommercePass17Remediation.test.ts) | `3929395ad296a9751fdb1795882f208af65ac934` |
| PB-CORPUS-EC-003 | Structured-only guest checkout drives verification | [Pass 17](../ecommercePass17Remediation.test.ts) | `3929395ad296a9751fdb1795882f208af65ac934` |
| PB-CORPUS-EC-004 | usd/USD records agree | [Pass 18](../ecommercePass18Remediation.test.ts) | `29f7bb702f08f0c7b790ff9b8085d8b683d299ca` |
| PB-DEFECT-6D2-001 | Stripe/Square conflict cannot select narrative Square | [Original 6D.2 assertion](../systemSingletonKnownDefect.test.ts) | `fdb2a80b6b7e9bd9fb4cab906807c005f31f814f` |
| PB-CORPUS-EC-006 | Complete Not sure provider placeholder stays unresolved | [Pass 12](../ecommercePass12Remediation.test.ts) | `df19da035343ff8da2eb95b903b9b6d83620eb56` |
| PB-CORPUS-EC-007 | Pending currency context governs usd | [Pass 9](../ecommercePass9Remediation.test.ts) | `c3ee6d0bb05fb45bafe4d845a21fe528c7f839b7` |
| PB-CORPUS-EC-008 | Refund approval pending permits resolved Square fallback | [Pass 16](../ecommercePass16Remediation.test.ts) | `edeaeec307080186d1e4d02305693643949f71a1` |
| PB-CORPUS-EC-009 | Coordinated No CAD/USD/EUR remains negative | [Pass 6](../ecommercePass6Remediation.test.ts) | `b8119a40a6ed72efe82a38251dd58ccbe8a78c4b` |
| PB-CORPUS-EC-010 | Terminal actor phrase does not release pending USD | [Pass 16](../ecommercePass16Remediation.test.ts) | `edeaeec307080186d1e4d02305693643949f71a1` |
| PB-CORPUS-EC-011 | Structured USD or CAD remains Needs answer | [Pass 19](../ecommercePass19Remediation.test.ts) | `83488092d563581ae2521d7ed21fdba5893b97fa` |
| PB-CORPUS-EC-012 | Escaped pipes preserve the complete decoded answer | [Pass 6](../ecommercePass6Remediation.test.ts) | `b8119a40a6ed72efe82a38251dd58ccbe8a78c4b` |

The historical defect keeps its original identity instead of receiving EC-005.
Introducing commits are unknown (`null`), not inferred from a fix. Fix references
identify the historical remediation commits; these are not claims about the first
appearance of each bug. Original Pass suites and the six 6D.2 foundation files
remain unchanged and retain broader cases (N/A reconciliation, malformed records,
generation, gates, source authority, etc.). No automatic historical case import.
Classifications exercised are generic/domain/parser. Lifecycle and package-coherence
remain typed categories without a harness or seeds in this phase.

## Independent expectations and observations

Literal selected values, finite acceptable display forms, exact contributing IDs,
conflict IDs, required dependencies, forbidden instructions and effective statuses
are authored in the fixtures/profiles. Transformation targets use those authored
values; they never call a production normalizer/resolver to determine an expectation.
Only [observe.ts](./observe.ts) imports runtime Ecommerce APIs. Production types in
the corpus are erased TypeScript imports. The existing 6D.2 defect oracle is reused
without altering its expected result.

`PB-INV-SINGLETON-001` checks effective records, selection and conflict identity.
`PB-INV-SINGLETON-002` additionally prevents conflict-driven verification winners.
The latter is applied whenever a target is conflicting. Record-level assertions
also preserve Needs answer and exact decoded raw answers. For narrative-only seeds,
the structured observation is intentionally missing; a separately authored output
oracle distinguishes permitted narrative fallback from unresolved evidence. An
unresolved complete choice has a visible Needs answer record, not an invented
authoritative selection. EC-012 has no applicable singleton invariant or transform.

Observations are tagged `authority: none`, versioned, and compare the complete
synthetic project and source before/after observation. They never confer authority,
set review approvals, calculate or alter readiness, generate/export a package, or
write storage. An oracle sensitivity control rejects the historical wrong selected
winner, missing dependency and provider-specific instruction.

## Architect review correction — resolved dependencies

The reviewed revision `e5502c86564853602492953301643001549b9d3c` could accept
both selected-value verification and a contradictory unresolved dependency for
the same structured choice. Resolved profiles now independently forbid
`resolve the recorded payment provider`, `resolve the recorded currency`, or
`resolve the recorded checkout mode`, respectively. EC-001/002/003 and the
equivalent-duplicate currency seed EC-004 use these expectations. Dependencies
for other choices remain permitted; unresolved/conflicting expectations are
unchanged.

Case-space, permutation and unrelated-clause cases retain their seed expectations.
Equivalent insertions explicitly reuse the resolved profile. Replacement targets
retain the resolved profile's dependency exclusion alongside the existing ban on
the previous selected value. Existing selection, status, conflict, required-output
and prior-value assertions remain intact, as do all original 6D.2 contracts.

Thirty-one sensitivity cases check four original resolved expectations plus all
27 relevant derived targets: 16 case-space, three equivalent insertions, one
permutation, three replacements and four unrelated clauses. Each starts with an
independently authored valid selection and both other-choice dependencies, then
adds only the contradictory same-choice dependency and requires exactly one
forbidden-verification violation. Coverage is eight provider cases, 15 currency
cases (including EC-004) and eight checkout cases. No sensitivity input is read
from production output or manufactured from the oracle's expected patterns.

Before the correction, all 31 negative controls exposed the gap by receiving no
violation. After the correction, the full focused corpus/property run passes
126 tests without skips: the original 94 plus 31 sensitivities and one coverage
budget control. The original 12 seeds and 74 transformation inputs are unchanged.
Current full repository validation and remote CI status are recorded in
[PR #10](https://github.com/jsnwilmot/ProjectBuilder/pull/10).

## Bounded transformation contracts

[transformations.ts](./transformations.ts) declares version, applicability,
preconditions, expected relation and exceptions for every operator. The table is
the complete initial budget: one family per seed, no compositions or randomness.

| Property (all v1.0.0) | Cases | Seeds | Relation and boundary |
| --- | ---: | --- | --- |
| PB-PROP-CASE-001 | 44 | All except EC-012 | Upper/lower ASCII case × outer spaces/tabs preserve authored semantics; answers/narrative only, no Unicode/internal grammar changes |
| PB-PROP-ORDER-001 | 1 | EC-004 | Reverse two equivalent records retaining distinct IDs; USD agreement persists |
| PB-PROP-DUPLICATE-001 | 3 | EC-001/002/003 | Add authored equivalent under unused CHOICE-2; retain selection and both contributors |
| PB-PROP-CONFLICT-001 | 3 | EC-001/002/003 | Add authored distinct value; expose exact conflict, select no winner and require resolution |
| PB-PROP-NEGATION-001 | 3 | EC-001/002/003 | Prefix complete structured answer with not; Needs answer and no selection-specific output |
| PB-PROP-UNCERTAINTY-001 | 6 | EC-001/002/003 | Pending approval suffix or Maybe prefix; remain unresolved |
| PB-PROP-REPLACEMENT-001 | 3 | EC-001/002/003 | Replace with Stripe/CAD/authenticated checkout; only the replacement drives verification |
| PB-PROP-UNRELATED-001 | 11 | All except EC-012 | Append the exact closed stock/orders-pending clause; preserve singleton semantics |

All transformations require registered seed identity and an enumerated parameter
set. Insertions require distinct valid IDs; negative precondition controls reject
reused, invalid and reserved IDs, unsupported normalization, unlisted English,
raw grammar normalization and narrative negation outside the supported template.
These controls are not claims about production invalid-ID behavior. No arbitrary
English semantics, provider aliases, display-byte equality or whole-document
equality is promised. Business-state pending is intentionally distinct from pending
selection approval.

## Reproduction and diagnostics

```sh
npm run test:unit -- src/tests/defectCorpus.test.ts src/tests/ecommerceMetamorphicProperties.test.ts
npm run test:unit -- src/tests/defectCorpus.test.ts -t PB-DEFECT-6D2-001
npm run test:unit -- src/tests/ecommerceMetamorphicProperties.test.ts -t PB-PROP-CONFLICT-001
npm run test:unit -- src/tests/systemSingletonKnownDefect.test.ts
```

Every semantic failure includes property/version (identity replay is
`PB-PROP-SEED-001` v1.0.0), full original seed, exact transformed project/register
and narrative, operator contract/parameters, expected relation/oracle, observed
result, and the actual `git rev-parse HEAD` SHA. Regex expectations are serialized
as readable patterns. Runtime exceptions retain the same diagnostic context and
fail normally. There are no skips, expected failures or automatic defect fixes.

Initial baseline compatibility run: 899 tests / 29 files, 23.06s wall time (38.78s
aggregate test time). New standalone run: 94 tests / 2 files, 1.27s wall time
(0.498s aggregate test time). The 94 comprise 12 seed replays, 74 transformations,
two corpus/oracle controls and six operator-budget/precondition controls. Vitest
wall time includes worker startup and varies; these measurements are a bounded
cost estimate, not a performance guarantee.

Initial implementation validation at reviewed revision `e5502c8`
(unchanged repository commands; review-correction results are recorded above and
in PR #10):

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `tsc --noEmit -p tsconfig.app.json` | Pass |
| `npm test` | 4,489 tests / 127 files pass, 155.31s |
| `npm run test:coverage` | 4,489 tests / 127 files pass, 198.51s |
| Coverage statements / branches / functions / lines | 89.30% / 82.36% / 93.50% / 92.43%; existing thresholds pass |
| `npm run build` | Pass |
| `npm audit --omit=dev --audit-level=high` | Pass, 0 vulnerabilities |
| Existing non-blocking `npm audit --audit-level=high` | 34 development advisories (1 moderate, 33 high), exit 1; no dependency changes |

No new failing production observation was found. The initial harness counted
unrelated missing intake compatibility records as register records; observation
now uses the API's existing field identity to select all register records,
including diagnostics. This was a harness correction, with no weakened semantic
expectation. All six 6D.2 file hashes match baseline; every other existing tracked
file except the required changelog is unchanged. Existing dependency advisories
belong to separately authorized dependency maintenance; the open Preview and
launchReady findings remain with Architect triage.

## Deliberately unimplemented

No new production functionality, domains, dependencies, CI changes, registry,
parser extraction, lifecycle state machine, package-coherence infrastructure,
broader generation determinism, Core extraction, fuzzing, shrinking, deployment
or persistence. Fuzz exploration remains deferred to 6D.7. Remaining historical
cases stay in their original regression suites. No combinations beyond the 74
enumerated transformations. The separate Preview blocker-count and decision-only
launchReady findings remain open for Architect triage and separate authorization.
