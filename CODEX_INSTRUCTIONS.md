# Codex Instructions

GPT is the Architect. Codex is the Developer.

Implement only approved project scope. Keep intake state, project metadata, project type presets, validation, templates, generation, export, and display logic separate. Preserve the standard package folder structure and all 19 required generated files.

Before completing a change:

1. Keep missing information explicit with `[MISSING: ...]` in generated documents.
2. Allow Draft package generation with explicit `[MISSING: ...]` markers, but do not mark a project Ready for Codex while client review items or blocking checklist checks remain unresolved.
3. Sanitize project names before using them in file paths.
4. Render user text without raw HTML injection.
5. Check semantic headings, labels, keyboard access, focus, contrast, validation, and mobile layout.
6. Keep project-type questions and branding requirements config-driven and show only relevant modules.
7. Preserve review decisions, require a reason for `Not applicable`, and keep blocking deferred items in Draft.
8. Regenerate the package after intake or review changes before treating Codex instructions as current.
9. Run `npm.cmd test`, `npm.cmd run build`, and a browser smoke test.
10. Update `CHANGE_LOG.md`, testing notes, and any behavior documentation affected by the change.

Do not add authentication, a database, analytics, billing, paid services, or external AI APIs without Architect approval.

## Storage 7 invariants

- Preserve `gpt-project-builder.storage.v2`; canonical persisted projects require valid Storage 7 confirmation provenance.
- Keep UUID allocation, source-revision reconciliation, migration, quarantine preservation, and all final writes inside the repository boundary.
- Persist explicit confirmation events only through `confirmProjectFields` and the private confirmation commit path; replay must be exact and must not allocate UUIDs, timestamps, or writes.
- Any injectable serialization path must parse back to the complete expected Storage 7 data model after quarantine reinsertion; partial project-only or provenance-only equality is insufficient.
- Never repair malformed provenance during normalization or grant it confirmation, Planning, readiness, projection, Apply, YAML, package, or output authority.
- Keep the confirmation source registry closed to the approved seven Canvas strings until the Architect approves a later phase.
- After Storage 7 production adoption, do not deploy a Storage-6-only rollback or hotfix against the production key; rollback code must remain Storage-7-aware.

## Core extraction golden guardrail

- The Canvas golden-reference suite in `src/tests/projectBuilderCoreExtractionGolden.test.ts` freezes the current extraction safety contract. Core extraction is not yet implemented.
- Future extraction must preserve equivalent Canvas behavior across the seven-field confirmation registry, text-only confirmation contract, Storage 7 persistence/replay/race/quarantine semantics, Planning zero-authority boundaries, generated-output exclusion, and lifecycle behavior.
- Do not add generic core production modules, domain registries, domain adapters, second-domain confirmation behavior, confirmation UI, `confirmedIntake` source materialization, canonical-fact bindings, readiness/projection/Apply/output authority, Storage 8, migrations, or project-type expansion without explicit GPT Architect approval.
