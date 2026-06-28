# Test Plan

## Automated coverage

- Required intake fields pass and fail predictably.
- Optional omissions remain visible.
- Step completion is derived from answered fields.
- All 12 required folders and 16 required files are generated.
- Missing information markers appear in generated Markdown.
- Package generation throws a typed validation error when required information is absent.
- Unsafe project names normalize to predictable paths.
- ZIP archives contain the root document, manifest, standard folders, and phased prompts.
- Mission Control opens the selected intake step.
- Documentation Viewer renders generated content.

Run:

```powershell
npm.cmd test
npm.cmd run build
```

## Manual browser coverage

1. Open Mission Control and confirm all dashboard fields are visible.
2. Select each progress stage and confirm keyboard focus moves to the stage heading.
3. Clear a required field and confirm the inline error and blocked package state.
4. Enter text containing HTML and confirm it renders as text in the document preview.
5. Review each generated document and search for `[MISSING:`.
6. Download the ZIP and confirm the root name is sanitized.
7. Inspect the ZIP for all standard folders, 16 documents, and `project-manifest.json`.
8. Refresh and confirm intake persistence.
9. Verify keyboard navigation, focus indicators, and form labels.
10. Verify Mission Control, intake, documents, and export at desktop and mobile widths.

## Known testing boundary

End-to-end inspection of the downloaded ZIP in a real browser download directory remains a manual test because browsers isolate download paths.
