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
- All 16 required markdown files generate every time and are non-empty.
- Generated document names match the canonical generated-file list.
- Folder mapping is validated against approved package structure.
- ARCHITECT_INSTRUCTIONS.md includes review process and blocked assumptions.
- CODEX_INSTRUCTIONS.md includes missing decision and scope boundary rules.
- PHASED_CODEX_PROMPTS.md includes phased prompts with objective, files, constraints, acceptance criteria, testing, and reporting sections.
- ZIP export is blocked before explicit generation and never creates an empty package.
- Export integrity detects missing, extra, empty, duplicate, incorrectly mapped, and unsafe generated files.
- Missing markers are counted as export warnings without blocking an otherwise valid package.
- ZIP root names and every archive path are sanitized or rejected safely.
- Archive folders and core files use deterministic approved ordering.
- `EXPORT_MANIFEST.md` and `project-manifest.json` are included without changing the 16-core-file count.
- Manifest diagnostics include project identity, lifecycle status, exported date, warning/error counts, folder summary, and stable file list.
- Large project records export with safe normalized paths and preserved content.
- Multi-project export uses only the active project's persisted documents.
- Copy actions read only active-project Architect, Codex, and phased prompt documents.
- Document preview reads active-project generated documents.
- Dashboard selectors calculate readiness, outstanding questions, completion, next action, and display status without mutation.
- Active project summary selector returns status, generated file count, outstanding required count, review status, and deterministic next action details.
- Recent project summaries sort by last updated date with stable fallback behavior.
- Dashboard warning selector surfaces inconsistent persisted status/readiness combinations.
- Mission Control project switching updates active context and heading safely.
- Mission Control recent project buttons expose clear accessible labels for project selection.
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
6. Open Export before generation and confirm the status says it cannot export yet with a clear Generate action.
7. Generate the package and open Export.
8. Confirm Export reports ready or warnings present, 16 actual documents, 16 expected documents, no errors, and manifest included.
9. Download the ZIP and confirm the root name is sanitized.
10. Open the ZIP on Windows and confirm all 12 standard folders.
11. Confirm exactly 16 core Markdown files plus `00_Project_Overview/EXPORT_MANIFEST.md` and `project-manifest.json`.
12. Open `EXPORT_MANIFEST.md` and confirm project details, file list, warning/error counts, and folder summary.
13. Confirm `[MISSING: ...]` markers remain in core documents and appear as manifest warnings.
14. Use an unsafe project name and confirm the ZIP root remains safe.
15. Switch to another generated project, export again, and confirm only the active project's content is included.
16. Use each copy action and confirm it copies content from the active project's generated documents.
17. Refresh and confirm intake persistence.
18. Create a second project and confirm the first remains in Recent projects.
19. Switch projects and confirm each intake retains its own values.
20. Generate a package, refresh, and confirm the generated count and document preview remain.
21. Edit intake after generation and confirm previously generated documents remain saved.
22. Confirm Review opens stage 7 and Export navigation opens stage 8 of Guided Intake.
23. Verify New project remains reachable on mobile and there is no page-level horizontal overflow.
24. Verify keyboard navigation, focus indicators, form labels, and Export status announcements.
25. Verify Mission Control, intake, documents, and export at desktop and mobile widths.

## Known testing boundary

End-to-end inspection of the downloaded ZIP in a real browser download directory remains a manual test because browsers isolate download paths.
