# Major Dependency Upgrade Plan

## Scope

This plan covers major-version audit and rollout for:

- React / React DOM (18 -> 19)
- TypeScript (5.6 -> 6.x)
- jsdom (25 -> 29)

Vite has already been patched separately to 8.1.3 on this audit branch.

## Upgrade Principles

- Upgrade one dependency track at a time.
- Keep each track in its own branch and PR.
- Require full gate pass for each track: lint, tests, coverage, build, audit.
- Avoid combining major upgrades into one release.
- Prefer pinning and controlled bumping over broad package refreshes.

## Baseline Gates

Run before and after each track:

1. npm.cmd run lint
2. npm.cmd test
3. npm.cmd run test:coverage
4. npm.cmd run build
5. npm.cmd audit

Capture summary deltas for failures, warnings, and bundle output.

## Track A: React 19 Upgrade

### Target packages

- react
- react-dom
- @types/react
- @types/react-dom

### Execution steps

1. Create branch: chore/dependency-audit-react-19
2. Bump runtime and type packages to React 19-compatible versions.
3. Run full baseline gates.
4. Fix breaking changes in rendering and strict-mode behavior.
5. Re-run gates and record deltas.

### Key risk areas

- React testing library assumptions around render timing.
- Type-level changes in JSX/React namespace typing.
- Any deprecated APIs in app-shell and component hooks.

### Exit criteria

- Zero lint errors.
- All tests passing with no new flakiness.
- Coverage thresholds still passing.
- Build output generated successfully.

## Track B: TypeScript 6 Upgrade

### Target packages

- typescript
- typescript-eslint family as needed for compatibility

### Execution steps

1. Create branch: chore/dependency-audit-typescript-6
2. Upgrade TypeScript and aligned lint tooling versions.
3. Run full baseline gates.
4. Address compiler and type-narrowing regressions.
5. Re-run gates and record deltas.

### Key risk areas

- Stricter inference and control-flow checks.
- Narrowing changes in project model and selector utilities.
- ESLint parser/plugin version compatibility.

### Exit criteria

- Typecheck and build pass cleanly.
- No disabled rules added to bypass legitimate issues.
- No relaxation of existing coverage thresholds.

## Track C: jsdom 29 Upgrade

### Target packages

- jsdom
- transitive test-environment compatibility through Vitest

### Execution steps

1. Create branch: chore/dependency-audit-jsdom-29
2. Upgrade jsdom.
3. Run test and coverage gates first.
4. Fix environment/test API behavior changes.
5. Run full baseline gates and record deltas.

### Key risk areas

- Clipboard and selection fallback behavior in tests.
- Anchor/download and navigation semantics.
- Focus-management and dialog interaction tests.

### Exit criteria

- No environment-specific warnings treated as ignored noise.
- Existing deterministic tests remain deterministic.
- No increase in flaky retries or intermittent failures.

## Release Strategy

- Merge one track at a time.
- Deploy to production only after each track independently passes all gates.
- If a track introduces high churn, split into preparation commit + upgrade commit.

## Rollback Strategy

- Revert the track branch merge commit.
- Re-run baseline gates to confirm restoration.
- Keep failed track isolated for follow-up fixes.

## Reporting Template Per Track

- Summary of package versions changed
- Gate results (lint/test/coverage/build/audit)
- Breaking changes encountered
- Fixes applied
- Residual risks
- Recommendation: merge now / hold
