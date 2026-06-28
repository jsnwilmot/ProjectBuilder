# Test Plan

## Automated coverage

- Intake stage configuration is defined in one canonical source with 8 required stages.
- Required intake rules pass and fail predictably for Foundation, Users, Features, Data, Workflows, and Security stages.
- Validation returns `isValid`, `missingFields`, `warnings`, and `sectionResults` with `stageId`, `label`, `percentComplete`, `isComplete`, `missingFields`, and `warnings`.
- Optional omissions remain visible as warnings.
- Continue Intake selects the next incomplete stage.
- Stage switching does not lose entered intake values.
- New projects receive complete safe defaults, unique IDs, lifecycle status, and timestamps.
- Versioned storage state saves and loads multiple projects plus `activeProjectId`.
- Invalid localStorage JSON recovers to a safe empty version-1 state.
- Selecting an active project persists correctly.
- Nested project updates preserve untouched intake fields.
- Intake updates preserve existing generated documents.
- Generated documents and actual generated-file counts persist.
- Generation can proceed with missing intake data and keeps explicit missing markers.
- Dashboard selectors calculate readiness, outstanding questions, completion, next action, and display status without mutation.
- All 12 required folders and 16 required files are generated.
- Missing information markers appear in generated Markdown.
- Unsafe project names normalize to predictable paths.
- ZIP archives contain the root document, manifest, standard folders, and phased prompts.
- Mission Control opens the selected intake step.
- Review stage surfaces missing required information and warnings before generation.
- Generate stage shows readiness counts and saves documents to the active project.
- Documentation Viewer renders generated content.

Run:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd audit
```

## Manual browser coverage

1. Open Mission Control and confirm all dashboard fields are visible.
2. Select each progress stage and confirm keyboard focus moves to the stage heading.
3. Clear a required field and confirm the inline error and missing-information visibility in Review.
4. Enter text containing HTML and confirm it renders as text in the document preview.
5. Review each generated document and search for `[MISSING:`.
6. Download the ZIP and confirm the root name is sanitized.
7. Inspect the ZIP for all standard folders, 16 documents, and `project-manifest.json`.
8. Refresh and confirm intake persistence.
9. Create a second project and confirm the first remains in Recent projects.
10. Switch projects and confirm each intake retains its own values.
11. Generate a package, refresh, and confirm the generated count and document preview remain.
12. Edit intake after generation and confirm previously generated documents remain saved.
13. Confirm Review opens stage 7 and Export navigation opens stage 8 of Guided Intake.
14. Verify New project remains reachable on mobile and there is no page-level horizontal overflow.
12. Verify keyboard navigation, focus indicators, and form labels.
15. Verify Mission Control, intake, documents, and export at desktop and mobile widths.

## Known testing boundary

End-to-end inspection of the downloaded ZIP in a real browser download directory remains a manual test because browsers isolate download paths.
