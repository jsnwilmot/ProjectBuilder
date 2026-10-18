# Core Checksum Compatibility — Approved Design Boundary

**Architecture review:** 2026-10-18. **Inspected baseline:** `b595e561f7236a76ea5c26921634957987cecbce`. **Status: design accepted; implementation NOT YET authorized**. This is a bounded compatibility specification, **not** a new runtime policy, canonical-JSON standard, or release approval.

## Purpose, evidence, and limitations

A read-only Codex design assessment identified **seven byte-equivalent implementations** of `stableSortObject(value: unknown): unknown`, `stableStringify(value: unknown): string`, and `fnv1a(content: string): string`. The GPT Architect independently inspected the seven exact source bodies, verified 18 structured serialization/hash and 9 raw-string hash expectations, and independently recalculated the canonical asset payload hash and three relevant mutations. No source files were changed and the design was not validated by an implementation test run.

**Approval boundary:** Accept the literal design and minimal reuse objective only. A separate, exact-baseline implementation phase, new tests, CI and merge decisions remain required. Work on the unmerged 6C.8 descriptor, Evidence/Confirmation Core, general registries, domain adapters and 6D.6 is excluded.

## Seven identical production helper locations

| Domain | Existing file | Helper entry lines (sort / stringify / raw hash) | Existing generation ID |
| --- | --- | --- | --- |
| Implementation assets | `src/lib/implementationAssets.ts` | 454 / 465 / 469 | `phase-5a.2` |
| Navigation | `src/lib/powerFxGeneration.ts` | 69 / 80 / 84 | `phase-5b.1` |
| Collection | `src/lib/collectionPowerFxGeneration.ts` | 74 / 85 / 89 | `phase-5b.2d` |
| State | `src/lib/statePowerFxGeneration.ts` | 67 / 78 / 82 | `phase-5b.2b` |
| Form mode | `src/lib/formModePowerFxGeneration.ts` | 87 / 98 / 102 | `phase-5b.3f` |
| Form operation | `src/lib/formOperationPowerFxGeneration.ts` | 104 / 115 / 119 | `phase-5b.3c` |
| Canvas record lifecycle | `src/lib/recordLifecyclePowerFxGeneration.ts` | 202 / 213 / 217 | `phase-5b.4c.1` |

The three helper bodies are identical across all seven files after whitespace normalization. This does not imply identical caller-constructed payloads or approval authority.

## Current exact mechanical behavior — preserve, do not broaden

- Arrays: recursively `map`, preserve index order; holes serialize as JSON `null`.
- Objects: read `Object.keys` (own enumerable string keys), default JavaScript `sort`, and rebuild into an ordinary object. Preserve JavaScript's subsequent integer-index property ordering.
- String **values**: normalize `\r\n` then `\r` to `\n`. Do not trim, case-fold or Unicode-normalize; do not normalize object keys.
- Compact native `JSON.stringify` follows the recursive transformation. The current algorithm is **not general canonical JSON** and includes its exact JavaScript edge cases.
- FNV-1a hash: initialize 2166136261, XOR each **UTF-16 code unit**, `Math.imul` by 16777619 modulo `2^32`, then format `fnv1a-` plus 8 lowercase hexadecimal digits.
- Raw `fnv1a` hashing performs **no** JSON serialization, newline conversion, encoding conversion or trimming.
- Native exception behavior and existing TypeScript signatures remain unchanged; no fallback/checksum policy is added.
- **Do not replace** this FNV-1a behavior with existing Core SHA-256, which hashes UTF-8 bytes.

## Independently authored literal structured vectors

The serialized text is the exact compact JSON result. Escapes within cells represent the characters of JavaScript string literals or their JSON serialization as applicable. Each digest is computed over the serialized text's UTF-16 code units.

| ID | Literal input | Expected serialized JSON | Expected FNV-1a |
| --- | --- | --- | --- |
| S01 | `{b:2,a:1}` | `{"a":1,"b":2}` | `fnv1a-5314055b` |
| S02 | `{z:{b:2,a:1},a:[{y:2,x:1},3]}` | `{"a":[{"x":1,"y":2},3],"z":{"a":1,"b":2}}` | `fnv1a-12043505` |
| S03 | `[2,1]` | `[2,1]` | `fnv1a-40569d7e` |
| S04 | `[1,2]` | `[1,2]` | `fnv1a-7d8e8676` |
| S05 | `{}` | `{}` | `fnv1a-5465b825` |
| S06 | `[]` | `[]` | `fnv1a-741638a5` |
| S07 | `null` | `null` | `fnv1a-77074ba4` |
| S08 | `""` | `""` | `fnv1a-ffcaaa85` |
| S09 | `{text:"Café 東京 😀"}` | `{"text":"Café 東京 😀"}` | `fnv1a-3f2713f1` |
| S10 | `{text:"A\r\nB\rC\n"}` | `{"text":"A\nB\nC\n"}` | `fnv1a-1d08c686` |
| S11 | `{a:null,b:undefined,c:[undefined,,()=>0,Symbol("s")]}` | `{"a":null,"c":[null,null,null,null]}` | `fnv1a-94b94654` |
| S12 | `{zero:-0,finite:1.25,nan:NaN,positive:Infinity,negative:-Infinity}` | `{"finite":1.25,"nan":null,"negative":null,"positive":null,"zero":0}` | `fnv1a-9b1fddb6` |
| S13 | `{"10":"ten","2":"two","01":"leading",a:"A"}` | `{"2":"two","10":"ten","01":"leading","a":"A"}` | `fnv1a-fea0d276` |
| S14 | `{text:"é"}` | `{"text":"é"}` | `fnv1a-7b0263d7` |
| S15 | `{text:"e\u0301"}` | `{"text":"é"}` | `fnv1a-e12a07c0` |
| S16 | `[1e21,1e-7,1e-6]` | `[1e+21,1e-7,0.000001]` | `fnv1a-a92096ee` |
| S17 | `{"a\rb":"x\ry"}` | `{"a\rb":"x\ny"}` | `fnv1a-6bcf5f1d` |
| S18 | `"\ud800"` | `"\ud800"` | `fnv1a-3ffd2a2c` |
| S19 (Architect-added) | `{text:"  keep \t spaces  "}` | `{"text":"  keep \t spaces  "}` | `fnv1a-39c0ce84` |

S14 and S15 **must** differ. S19 pins whitespace preservation, identified as a missing explicit vector in the original design; its digest was independently computed during Architect review.

## Independently authored raw-string vectors

| ID | Raw input | Expected FNV-1a |
| --- | --- | --- |
| R01 | `""` | `fnv1a-811c9dc5` |
| R02 | `"a"` | `fnv1a-e40c292c` |
| R03 | `"foobar"` | `fnv1a-bf9cf968` |
| R04 | `"Café 東京"` | `fnv1a-acfad489` |
| R05 | `"😀"` | `fnv1a-cb31c4b8` |
| R06 | `"A\nB"` | `fnv1a-ac0ef4d0` |
| R07 | `"A\rB"` | `fnv1a-6e01c743` |
| R08 | `"A\r\nB"` | `fnv1a-5e7f7d9b` |
| R09 | `"68"` | `fnv1a-0de8d5a3` |

R06–R08 distinguish raw from normalized serialization. R09 detects incorrect zero-padding.

## Independent implementation-asset payload and mutation vectors

The below is the literal expected **serialized checksum payload P**, not a ready/approved project:

```json
{"applicabilityStatus":"required","approvedPropertyName":"","assetCategory":"Power Fx","assetId":"asset-fixture","assetType":"powerFxPlan","blockingIssues":[],"connectorIds":[],"dependencies":[],"entityIds":[],"fieldIds":[],"gateEvaluationSnapshot":[],"generationInputs":{},"generationVersion":"phase-5a.2","intendedPath":"07_Development/PowerFx/fixture.fx","knownLimitations":[],"manualInstallationRequirements":[],"platform":"Power Apps Canvas","projectId":"project-fixture","required":true,"requiredGateIds":[],"sourceContent":"A\nB","sourceRecordIds":["a","b"],"targetDisplayName":"Fixture","targetId":"control-fixture","validationRequirements":[]}
```

Input differs from P only as follows: source content uses `"A\r\nB"`; source record IDs are `["b","a","a"]`; `generationInputs` and `approvedPropertyName` are absent; and excluded metadata includes timestamp `"2026-10-18T00:00:00.000Z"`, status `"Review Required"`, approval `"Review required"` and an ignored prior content checksum.

| Literal mutation | Expected digest |
| --- | --- |
| Baseline input yields P | `fnv1a-174894e2` |
| Change asset ID to `asset-other` | `fnv1a-ac01bd67` |
| Change generation version to `phase-5a.1` | `fnv1a-c88033c1` |
| Change source content to `"A\nC"` | `fnv1a-8fa5278b` |
| Alter only excluded timestamp, status, approval or prior checksum | Unchanged payload P and `fnv1a-174894e2` |

Protect the **full literal serialized payload**, not only the digest. The Architect independently checked these digests using a separately implemented UTF-16 arithmetic calculation.

## Existing edge and failure observations to retain

- Top-level undefined/function/symbol serializes to JavaScript `undefined` even though the current signature is typed `string`; feeding that into hashing throws `TypeError`. Do not silently change signatures or runtime behavior in a compatibility extraction.
- `BigInt` serialization throws `TypeError`; a cyclic object may throw `RangeError` in the inspected runtime (do not pin engine-specific messages or recursion budgets).
- Raw hashing of null/undefined throws `TypeError`.
- `Date` without enumerable own keys serializes as `{}`. Frozen plain objects serialize without input mutation.
- Own enumerable getters are invoked during traversal and may throw; existing `toJSON` functions may execute during native JSON serialization.
- `JSON.parse('{"__proto__":{"x":1},"a":2}')` currently loses the `__proto__` property when rebuilt into `{}`. Do not fix this incidentally in a compatibility-only phase.
- Symbol and non-enumerable keys are omitted. Extra named array properties are omitted. Preserve existing runtime behavior even when surprising; any hardening is separate work.

## Proposed implementation surface — pending separate authorization

Single new module: `src/core/stableChecksum.ts`, exporting exactly the three existing helpers: `stableSortObject`, `stableStringify` and `fnv1a`. No imports from domain, Planning, Confirmation, persistence, templates, evidence, readiness, review, export or authority code.

For each of the seven modules: import these exact helpers, remove only duplicated helper bodies, retain any independently needed `isObject` predicate, and do **not** modify payload-building expressions or hash call sites. Keep all pre-existing public wrappers, generation version IDs, checksum/prefix contracts, registry/manifest constructors, and review/approval/staleness checks unchanged.

No generic serializer, domain payload consolidation, SHA-256 replacement, migration, Storage changes, dependency/CI changes, extra module decomposition, new domain registration, or Core authority expansion.

## Future implementation / review gates

1. Independently authored test-local literals for **S01–S19**, **R01–R09**, full asset payload P and all asset mutations, plus current exception/nonmutation behaviors. Do not generate the expected strings or digests from production results.
2. Targeted sensitivity regressions: corrupt initial FNV parameters/prefix/padding; UTF-8 instead of UTF-16; order/integer key/array drift; CR handling and raw newline drift; Unicode/whitespace normalization; payload inclusion/exclusion; stale approval and formula-review authority mistakes. Explicitly assert expected mismatch locations.
3. Retain all existing Canvas golden, Storage 7, repository, Planning, Confirmation, Controlled Apply, legacy generation, Website, Ecommerce 6D.2–6D.5, formula evidence/review, export and package regressions. No weakening existing tests.
4. Run focused and full tests/coverage, lint, TypeScript, production build, production audit and unchanged advisory reporting on the exact implementation head. Document any tool/runtime differences (the read-only design used Node 24; existing CI runs Node 20).
5. Return proposed PR unmerged with exact baseline, final SHA, changed files, literal-test/sensitivity evidence, all CI results, unchanged persisted/approval checksums and any deviations requiring Architect decisions. Deployment and merge require separate approval.

**Open findings remain separate:** `PB-CORE-001` in the unmerged 6C.8R branch, the Preview blocker-count High, Ecommerce `launchReady` High, the dependency audit/release gate discrepancy, and pending Proof-of-Concept approval.

## Decision

**Design accepted for compatibility planning only. Production extraction not yet authorized.** The next bounded implementation phase may be considered after the documentation coordination PR (#13) is integrated through its applicable owner/release gates, with a fresh exact-main baseline and separate GPT Architect authorization.
