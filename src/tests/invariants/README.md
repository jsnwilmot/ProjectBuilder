# Phase 6D.2 test-only singleton foundation

Authorized baseline: `0495f52e20c8e962014b969ee435224fd6347f66`.

`PB-INV-SINGLETON-001` checks independently specified missing, resolved,
equivalent-duplicate and conflicting outcomes. `PB-INV-SINGLETON-002` checks that
a structured conflict cannot produce a downstream narrative winner. Definition
and observation versions are both `1.0.0`. A semantic change requires explicit
version review; IDs must not silently acquire a different meaning.

Applicability is bounded to the existing Ecommerce provider, checkout-currency
and checkout-mode APIs. Observations/results have `authority: "none"` and are
diagnostics only. `notApplicable` is distinct from `satisfied`. The contract
compares observations with authored expectations: it neither normalizes source
values nor resolves choices or grants readiness. The Ecommerce observer reads
existing APIs on isolated synthetic projects and does not use persistence.

The small table covers three subjects and four outcomes, plus reversed records.
It is not the Phase 6D.3 permanent corpus or a property/fuzz framework. Duplicate
equivalent values use distinct IDs; malformed/duplicate IDs, general English,
N/A, gate-strength policy, other domains and package-wide coherence are outside
this bounded contract. Historical suites remain intact.

## Known failing production behavior

`PB-DEFECT-6D2-001` is an active, ordinary failing test on the baseline:

```text
CHOICE-1 | launch | Answered | Which payment provider? | Approved fixture answer | Stripe
CHOICE-2 | launch | Answered | Which payment provider? | Approved fixture answer | Square
```

Narrative `acceptanceNotes`: `payments via Square`.

Expected: conflict `EC-SELECTION-CONFLICT-PAYMENT-PROVIDER`, no resolved provider,
a provider-resolution dependency, and no provider-specific checkout/webhook
instructions. Actual: the structured API reports the conflict and no selection,
but verification falls back to narrative Square and emits both selected-provider
instructions. The assertion reports `requiredVerification` and
`forbiddenVerification` violations with the full observed output.

Reproduce the failure (expected nonzero exit while the production defect exists):

```sh
npm run test:unit -- src/tests/systemSingletonKnownDefect.test.ts
```

Run the foundation separately:

```sh
npm run test:unit -- src/tests/systemSingletonContract.test.ts
```

The standard test/coverage commands discover the defect test and remain red. No
skip, expected-failure conversion, configuration exclusion or weakened oracle is
used. A green result should mean separately authorized production remediation
has satisfied the original assertion. GPT Architect owns triage; Ecommerce
production remediation requires separate authorization. Phase 6D.2 does not fix
production behavior or authorize Phase 6D.3.

## Change record

2026-10-16: Added two test-local contracts, authority-free observation/result
types, independent expectations, a bounded existing-API observer, foundation
tests and the permanent failing-defect reference. No production, repository,
Storage, migration, UI, dependency, CI, historical test or authority changes.
Verification:

- Foundation: 25 passed; combined foundation/defect run: 25 passed, one genuine
  known-defect failure.
- Focused existing Ecommerce, Canvas golden, Storage 7 and foundation run:
  852 passed across 27 files.
- Full unit/integration leg: 4,269 passed, one failure (`PB-DEFECT-6D2-001`),
  across 117 files. The standard runner exits nonzero before its UI legs.
- All seven existing UI legs were therefore run separately: 79 passed.
- Lint, TypeScript, production build and production dependency audit passed.
  The advisory all-dependency audit reported 34 existing development dependency
  vulnerabilities (one moderate, 33 high); no dependencies were changed.
- Coverage verification and final review evidence are recorded in the PR and
  completion report; no green full-suite or coverage claim is implied.
