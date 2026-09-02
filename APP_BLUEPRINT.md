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

### Core SHA-256 primitive

- `src/core/sha256Fingerprint.ts` is the first domain-neutral Project Builder Core primitive.
- It owns only conversion from JavaScript strings to UTF-8 bytes, `globalThis.crypto.subtle.digest("SHA-256", ...)`, and lowercase two-character-per-byte hexadecimal formatting.
- Planning keeps its public fingerprint helper as a compatibility wrapper around the core primitive. Confirmation value fingerprinting depends directly on the core primitive while keeping confirmation text serialization in the Confirmation boundary.
- The primitive imports no Planning, Confirmation, Canvas, Power Platform, repository, registry, adapter, persistence, authority, canonical-fact, readiness, projection, Apply, YAML, package, or generated-output modules.
- The primitive grants no canonical, Planning, confirmation, readiness, projection, Apply, YAML, package, or output authority.

### Core canonical UUID primitive

- `src/core/canonicalUuid.ts` is the second narrow domain-neutral Project Builder Core primitive.
- It owns only current-contract canonical lowercase UUID syntax recognition: version nibbles 1 through 5 and variant nibbles 8, 9, a, or b.
- It performs no UUID generation, normalization, trimming, uppercase acceptance, collision handling, forbidden-set construction, persistence, allocation, or retry behavior.
- Confirmation keeps `isCanonicalProjectConfirmationUuid(...)` as the public compatibility wrapper. Controlled Apply history and finalization consume the core predicate while keeping their issue codes, allocation ordering, and collision authority subsystem-owned.
- Timestamp validation remains unextracted. The primitive grants no canonical-fact, confirmation, Planning, readiness, projection, Apply, YAML, package, or output authority.

### Storage 7 confirmation provenance

- Storage Version 7 is the canonical repository format and retains the `gpt-project-builder.storage.v2` key.
- Every canonical Storage 7 project has valid `confirmationProvenance`; Storage 1-6 records migrate atomically before writes are enabled.
- Repository transactions alone allocate strict `globalThis.crypto.randomUUID()` provenance IDs and reconcile the seven registered Canvas source revisions.
- Malformed provenance is non-authoritative and held only in bounded, non-persisted quarantine metadata. Unrelated writes must preserve its parsed JSON structure exactly or fail closed.
- Explicit confirmation events are persisted only by the repository-owned `confirmProjectFields` transaction, using append-only validation, exact replay, guarded race recovery, and full Storage 7 serializer round-trip structural identity after quarantine reinsertion.
- Confirmation evidence grants no Planning, readiness, projection, Apply, YAML, package, or output authority.

### Canvas golden reference

- `src/tests/projectBuilderCoreExtractionGolden.test.ts` establishes the current Power Apps Canvas golden reference for future Project Builder Core extraction.
- Broad Project Builder Core extraction is not yet implemented; the suite protects equivalent Canvas behavior before additional production modules are moved or generalized.
- The golden reference freezes semantic behavior, persisted data compatibility, authority boundaries, Canvas source identities, confirmation semantics, replay/idempotency, revision semantics, Storage 7 behavior, quarantine, generated-output exclusion, and downstream zero-authority boundaries. It does not freeze the absence of future approved core directories, domain registries, domain adapters, or Canvas adapters as file topology.
- Project-type expansion, second-domain confirmation behavior, generic domain registries, confirmation UI, `confirmedIntake` materialization, new canonical-fact bindings, readiness authority, Controlled Apply expansion, Storage schema changes, and migrations remain unauthorized.

- React components own display and user interaction.
- `useProjectBuilder` coordinates the active record with the versioned project repository.
- `createProject.ts` creates complete records with safe defaults.
- `projectRepository.ts` owns multi-project CRUD and the single localStorage key.
- `storageVersion.ts` validates Storage 7 and normalizes supported Storage 1-6 inputs for atomic repository migration.
- `projectSelectors.ts` derives dashboard values without mutating records.
- `exportIntegrity.ts` validates active-project generated documents, approved mappings, safe paths, duplicates, missing files, empty content, and warnings before archive creation.
- `exportManifest.ts` creates stable Markdown and JSON export diagnostics.
- `exportProjectPackage.ts` writes verified folders, core files, and manifests in deterministic order.
- `src/data/intakeStages.ts` is the single source for intake fields, stages, and progress metadata.
- `src/data/projectTypes.ts` defines the 17 typed project presets, including 16 selectable presets and one legacy nonselectable preset, with recommended platforms, conditional modules, structured branding questions, and project-specific fields.
- `src/data/packageGuidance.ts` is the shared source for the post-generation Architect/Codex workflow used by the UI and generated documents.
- `src/types/project.ts` is the single source for project and review status values.
- `src/data/generatedFiles.ts` derives the generated-file list from the canonical folder mapping.
- `validateIntake.ts` owns shared and project-type-specific required-question validation, optional warnings, branding rules, and completion metrics.
- `src/templates/documents/` owns document wording.
- `generateProjectPackage.ts` assembles the standard package.
- `exportProjectPackage.ts` creates and downloads the ZIP archive.
- `StorageState` stores multiple projects and one `activeProjectId` in browser local storage.
- Stored free-text project types that do not match a supported preset migrate to an empty choice so the user must select a valid type.
- Empty or invalid storage opens an actionable empty state; the runtime does not inject demo projects.

## Package readiness

- Draft package generation and export are allowed with explicit `[MISSING: ...]` markers.
- Export diagnostics label the package Draft or Ready for Codex.
- Ready for Codex requires zero required missing fields across shared and project-type-specific validation.
- Generated output contains 19 core Markdown documents, including `BRAND_GUIDE.md`, `CLIENT_QUESTIONS.md`, and `HANDOFF_CHECKLIST.md`.

## Data and security

No authentication, backend database, analytics, billing, external AI, or remote project-data transfer is included. User text is rendered as normal React text or plain `<pre>` content. Export root names are normalized to safe lowercase ASCII file names.

## Responsive model

Desktop uses a fixed navigation rail and two-column command center. Tablet changes navigation to a horizontal product bar and stacks the readiness panel. Mobile stacks action summaries, intake fields, document navigation, and export content while keeping horizontal progress rails scrollable.
