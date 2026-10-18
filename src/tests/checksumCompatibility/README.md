# CORE-CHECKSUM compatibility evidence

Authorization: [Issue #14](https://github.com/jsnwilmot/ProjectBuilder/issues/14), baseline
`831b2b455d19c2f67d4296ef980887a4ad383be9`. The immutable specification is
[`CORE_CHECKSUM_COMPATIBILITY_DESIGN.md`](../../../docs/CORE_CHECKSUM_COMPATIBILITY_DESIGN.md).

- `cases.ts` transcribes S01–S19, R01–R09, full payload P, three changed-field
  payloads/digests and the synthetic asset input. Expectations are literal strings,
  never generated from production results. The only production import is an erased type.
- `assertions.ts` compares the bounded serialized/checksum fields and the explicitly
  authored Current/Stale review observations. Failures name the case and field.
- `sensitivity.ts` supplies 25 synthetic checksum/payload corruptions and four
  review-boundary corruptions. Wrong digests are literals; no production algorithm
  or approved expectation is changed. These controls test oracle rejection;
  existing review/evidence suites exercise the real Current/Stale/approval APIs.
- `../coreStableChecksum.test.ts` covers the new Core interface, all structured/raw
  literals, exceptions, broad object handling, getters, toJSON, numeric keys,
  prototype-key behavior, sparse arrays and frozen-input nonmutation.
- `../stableChecksumCompatibility.test.ts` observes unchanged public asset wrappers,
  all 19 structured digests, complete payload/mutations, separate and combined
  metadata exclusions, nonmutation and exceptional inputs.
- `../stableChecksumSensitivity.test.ts` accepts each correct literal observation
  and requires the exact rejection locations for all 29 corruptions. It grants
  no production review, readiness, approval, persistence or output authority.

## Tests-first evidence

Before production extraction, the wrapper and sensitivity suites passed 61 tests.
A temporary ordinary Vitest probe asserted `checksumFailures(expected, wrong)`
and `reviewBoundaryFailures(expected, wrong)` should equal `[]`: all 29 corruptions
failed, with the specific field paths recorded. That deliberate red probe was
removed before extraction. The permanent controls require those rejection paths;
there are no skipped, expected-failure or conditionally suppressed tests.

After extraction, 109 focused tests passed. The 33-file affected historical matrix
passed 1,856 tests. Full tests and coverage each passed 4,753 tests / 132 files;
coverage statements/branches/functions/lines are 89.66%/82.51%/93.77%/92.71%.
Lint, standalone TypeScript, build and whitespace checks passed. Exact feature SHA
and exact-head CI are recorded in the PR and completion report. Original historical regressions and the approved design remain
unchanged. Node 24.19.0 was used locally; CI retains its configured Node 20 runner.

Run the focused foundation:

```sh
npm run test:unit -- src/tests/coreStableChecksum.test.ts src/tests/stableChecksumCompatibility.test.ts src/tests/stableChecksumSensitivity.test.ts
```

This is a checksum-specific test oracle, not a generic invariant, serialization,
registry, lifecycle or authority framework. PR #13's development-audit exception
does not apply to this implementation.
