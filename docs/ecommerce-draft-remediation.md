# Ecommerce Draft 1 generation remediation

Ecommerce projects use nineteen web-oriented documents with commerce-specific testing, deployment and architecture-aware phases. The saved client's business requirements are never rewritten to conceal an output defect. Existing business/static website and application/Power Platform template routes remain unchanged.

## Root causes and regression evidence

At baseline `c510062`, ecommerce fell through to the generic application template registry in `generateProjectPackage.ts`. Unconditional generic tests, deployment and phase strings in `templates/documents/index.ts` emitted builder self-tests and unrelated platform instructions. `clientReview.ts` derived questions from missing fields only; an OQ register inside a nonempty Assumptions field was treated as answered. Client checklist readiness also ignored content markers, and general document statuses could claim implementation readiness despite an unresolved architecture decision.

Commit `13112f8` records the seven failing Draft 1 regressions before production changes. The baseline unit/integration run had 3,499 passing existing tests and seven intended failures. An independent focused existing suite had 130 passing tests.

## Normalized records

`ecommerceDecisions.ts` is the shared source for questions, deferrals and architecture/launch boundaries. Existing line-based `OQ-nn: question` records in Assumptions migrate read-only to deferred questions. Explicit decision records override them by stable ID. Their format is:

```text
ID | architecture, launch or optional | Needs answer, Deferred, Answered or Not applicable | question | reason | approved answer
```

Answered requires an answer; Not applicable requires a reason. Malformed records block implementation. An ordinary review checkbox cannot erase an unresolved source decision. The generator shows current explicit statuses in legacy question prose without changing saved source requirements. Nonblocking optional deferrals remain visible. Architecture decisions block implementation; unresolved production decisions block launch while allowing architecture review. Production readiness is separate from approval to plan.

Every ecommerce marker is an ID with a corresponding visible decision/source field. No marker is silently stripped. Unresolved implementation configuration uses `EC-ARCHITECTURE`, `EC-DEPLOYMENT` and `EC-PHASES`; model, route and cart gaps use their own records. All generated files and the manifest use the same counts and final readiness. Manual review flags remain manual.

## Storefront and contract fields

Foundation collects merchant/storefront model, approved architecture and deployment contract. Features collects route/brand-theme/catalog context mapping, an explicit cart decision and approved phase contracts. Security exposes the editable decision register. These fields appear only for ecommerce. Existing projects default the new fields to blank and retain all existing fields and local storage data.

The Rose & Paw regression fixture selects a single merchant/shared platform with four branded contexts: `/digitaldesigns`, `/3ddesigns`, `/apps`, `/petapparel`. Its shared eligible-item cart is an explicit source requirement, not inferred from the storefront choice. Separate carts and unified storefronts remain supported choices. These defaults are not hard-coded into generic product intake.

Architecture contracts begin `Approved:` and require named runtime, backend, database, integrations and repository values. Deployment requires environments, source control, CI, build, deployment, DNS, secrets, migrations, integrations, observability, backup, restore, rollback, smoke and responsibilities. Values are separated by semicolons or newlines. Unknown/TBD/pending contracts do not unlock implementation. Phase JSON requires objective, prerequisites, files, contracts, security, accessibility, testCommands, acceptanceCriteria, evidence and stopConditions; each is an approved nonempty string. Actual technology, paths and commands are client/Architect decisions, never generated guesses.

## Verification and release

Run `npm test`, `npm run build`, `npm run lint`, `npm audit --omit=dev` and `git diff --check`. The full runner includes existing application, website, export and platform suites. New tests cover seven original defects, traceability, count consistency, resolution provenance, invalid records/contracts, cart separation, route propagation, storage compatibility and labelled controls with persistence across remount.

Final verification passed 3,597 tests across 102 files (3,518 unit/integration and 79 UI), lint, TypeScript/production build and a production dependency audit with zero vulnerabilities. The deterministic Rose & Paw artifact contains all 19 documents, all 20 OQ markers, four implementation blockers, 19 launch blockers, zero orphan markers and zero prohibited-content findings. It remains Draft because 23 source decisions are unresolved.

To regenerate the deterministic review artifact in PowerShell:

```powershell
$env:ECOMMERCE_REVIEW_OUTPUT='qa/ecommerce-after'
npm.cmd run test:unit -- src/tests/ecommerceReviewArtifact.test.ts
Remove-Item Env:ECOMMERCE_REVIEW_OUTPUT
```

The output is an Architect-review Draft, not an implementation or release approval. Review all documents and unresolved decisions. Merge/deployment still require the normal project approval process. After an approved production deployment, reload the same local Chrome project, confirm saved data, enter the new model/route/contract fields, and regenerate there. Do not clear browser storage or create a replacement project.
