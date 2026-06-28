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
- `useProjectBuilder` owns the active local project state and status changes.
- Field definitions in `src/data/intakeSteps.ts` drive intake structure and progress.
- `validateIntake.ts` owns generation-blocking validation and completion metrics.
- `src/templates/documents/` owns document wording.
- `generateProjectPackage.ts` assembles the standard package.
- `exportProjectPackage.ts` creates and downloads the ZIP archive.
- `projectStorage.ts` stores one versioned project in browser local storage.

## Data and security

No authentication, database, analytics, billing, external AI, or remote project-data transfer is included. User text is rendered as normal React text or plain `<pre>` content. Export root names are normalized to safe lowercase ASCII file names.

## Responsive model

Desktop uses a fixed navigation rail and two-column command center. Tablet changes navigation to a horizontal product bar and stacks the readiness panel. Mobile stacks action summaries, intake fields, document navigation, and export content while keeping horizontal progress rails scrollable.
