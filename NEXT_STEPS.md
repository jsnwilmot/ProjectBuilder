# Next Steps

## Product decisions required

- `[MISSING DECISION: Define whether the app must manage multiple persisted projects or only one active local project. This affects storage and dashboard behavior.]`
- `[MISSING DECISION: Define the approved production hosting environment. This affects deployment configuration and security headers.]`
- `[MISSING DECISION: Decide whether project import is required. Current scope exports packages but does not re-import them.]`

## Recommended sequence

1. Complete Architect review of the generated wording and required-field policy.
2. Decide the multi-project persistence model.
3. Add end-to-end download/archive inspection after the storage decision.
4. Add production deployment configuration after hosting is approved.
5. Run a user test with one real project intake and revise labels based on observed ambiguity.
