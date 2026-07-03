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
