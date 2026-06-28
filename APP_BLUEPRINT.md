# App Blueprint

## Purpose

Provide a controlled path from rough project idea to structured, reviewable, ready-for-Codex package.

## Current modules

1. Mission Control Dashboard
2. Guided Intake Builder
3. Scope Review
4. Project Package Generator
5. Architect Instructions Generator
6. Codex Instructions Generator
7. Phased Codex Prompt Generator
8. Project Export
9. Project Status Tracking
10. Documentation Viewer

## Runtime boundaries

- React components own display and user interaction.
- `useProjectBuilder` coordinates the active record with the versioned project repository.
- `createProject.ts` creates complete records with safe defaults.
- `projectRepository.ts` owns multi-project CRUD and the single localStorage key.
- `storageVersion.ts` validates and migrates stored schema version 1.
- `projectSelectors.ts` derives dashboard values without mutating records.
- `exportIntegrity.ts` validates active-project generated documents, approved mappings, safe paths, duplicates, missing files, empty content, and warnings before archive creation.
- `exportManifest.ts` creates stable Markdown and JSON export diagnostics.
- `exportProjectPackage.ts` writes verified folders, core files, and manifests in deterministic order.
- Field definitions in `src/data/intakeSteps.ts` drive intake structure and progress.
- `validateIntake.ts` owns generation-blocking validation and completion metrics.
- `src/templates/documents/` owns document wording.
- `generateProjectPackage.ts` assembles the standard package.
- `exportProjectPackage.ts` creates and downloads the ZIP archive.
- `StorageState` stores multiple projects and one `activeProjectId` in browser local storage.

## Data and security

No authentication, backend database, analytics, billing, external AI, or remote project-data transfer is included. User text is rendered as normal React text or plain `<pre>` content. Export root names are normalized to safe lowercase ASCII file names.

## Responsive model

Desktop uses a fixed navigation rail and two-column command center. Tablet changes navigation to a horizontal product bar and stacks the readiness panel. Mobile stacks action summaries, intake fields, document navigation, and export content while keeping horizontal progress rails scrollable.
