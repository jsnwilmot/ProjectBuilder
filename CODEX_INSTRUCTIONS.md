# Codex Instructions

GPT is the Architect. Codex is the Developer.

Implement only approved project scope. Keep intake state, project metadata, validation, templates, generation, export, and display logic separate. Preserve the standard package folder structure and all 16 required generated files.

Before completing a change:

1. Keep missing information explicit with `[MISSING: ...]` in generated documents.
2. Prevent package generation when required intake fields are empty.
3. Sanitize project names before using them in file paths.
4. Render user text without raw HTML injection.
5. Check semantic headings, labels, keyboard access, focus, contrast, validation, and mobile layout.
6. Run `npm.cmd test`, `npm.cmd run build`, and a browser smoke test.
7. Update `CHANGE_LOG.md`, testing notes, and any behavior documentation affected by the change.

Do not add authentication, a database, analytics, billing, paid services, or external AI APIs without Architect approval.
