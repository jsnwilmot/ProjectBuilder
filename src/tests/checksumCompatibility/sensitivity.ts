import { ASSET_CHECKSUM, ASSET_MUTATIONS, ASSET_PAYLOAD, RAW_CHECKSUM_CASES, STRUCTURED_CHECKSUM_CASES } from "./cases";
import { CURRENT_REVIEW_EXPECTATION, STALE_REVIEW_EXPECTATION, type ChecksumExpectation } from "./assertions";

interface ChecksumCorruption {
  readonly id: string;
  readonly label: string;
  readonly expected: ChecksumExpectation;
  readonly wrong: { readonly serialized?: string; readonly checksum: string };
  readonly failures: readonly string[];
}

function structured(id: string): ChecksumExpectation {
  const found = STRUCTURED_CHECKSUM_CASES.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown literal checksum case ${id}`);
  return found;
}

function raw(id: string): ChecksumExpectation {
  const found = RAW_CHECKSUM_CASES.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown literal raw checksum case ${id}`);
  return found;
}

const payload = { id: "P", serialized: ASSET_PAYLOAD, checksum: ASSET_CHECKSUM };

// Synthetic wrong results only. No production algorithm, fixture, or oracle is mutated.
// Wrong digests were independently calculated during implementation design verification.
export const CHECKSUM_CORRUPTIONS: readonly ChecksumCorruption[] = [
  { id: "NEG-01", label: "wrong offset basis", expected: raw("R01"), wrong: { checksum: "fnv1a-00000000" }, failures: ["R01.checksum"] },
  { id: "NEG-02", label: "wrong multiplier", expected: raw("R02"), wrong: { checksum: "fnv1a-e1d2ede4" }, failures: ["R02.checksum"] },
  { id: "NEG-03", label: "signed hexadecimal", expected: raw("R01"), wrong: { checksum: "fnv1a--7ee3623b" }, failures: ["R01.checksum"] },
  { id: "NEG-04", label: "changed prefix", expected: raw("R02"), wrong: { checksum: "hash-e40c292c" }, failures: ["R02.checksum"] },
  { id: "NEG-05", label: "uppercase hexadecimal", expected: raw("R02"), wrong: { checksum: "fnv1a-E40C292C" }, failures: ["R02.checksum"] },
  { id: "NEG-06", label: "missing zero padding", expected: raw("R09"), wrong: { checksum: "fnv1a-de8d5a3" }, failures: ["R09.checksum"] },
  { id: "NEG-07", label: "UTF-8 instead of UTF-16", expected: raw("R05"), wrong: { checksum: "fnv1a-33a29608" }, failures: ["R05.checksum"] },
  { id: "NEG-08", label: "code points instead of code units", expected: raw("R05"), wrong: { checksum: "fnv1a-0650a71f" }, failures: ["R05.checksum"] },
  { id: "NEG-09", label: "insertion-ordered objects", expected: structured("S01"), wrong: { serialized: '{"b":2,"a":1}', checksum: "fnv1a-07cc4fef" }, failures: ["S01.serialized", "S01.checksum"] },
  { id: "NEG-10", label: "unsorted nested objects", expected: structured("S02"), wrong: { serialized: '{"a":[{"y":2,"x":1},3],"z":{"b":2,"a":1}}', checksum: "fnv1a-5e366d09" }, failures: ["S02.serialized", "S02.checksum"] },
  { id: "NEG-11", label: "lexical JSON integer-key order", expected: structured("S13"), wrong: { serialized: '{"01":"leading","10":"ten","2":"two","a":"A"}', checksum: "fnv1a-2d40d3b8" }, failures: ["S13.serialized", "S13.checksum"] },
  { id: "NEG-12", label: "sorted arrays", expected: structured("S03"), wrong: { serialized: "[1,2]", checksum: "fnv1a-7d8e8676" }, failures: ["S03.serialized", "S03.checksum"] },
  { id: "NEG-13", label: "unconverted CR values", expected: structured("S10"), wrong: { serialized: '{"text":"A\\r\\nB\\rC\\n"}', checksum: "fnv1a-fbdab170" }, failures: ["S10.serialized", "S10.checksum"] },
  { id: "NEG-14", label: "normalized property names", expected: structured("S17"), wrong: { serialized: '{"a\\nb":"x\\ny"}', checksum: "fnv1a-6f014f51" }, failures: ["S17.serialized", "S17.checksum"] },
  { id: "NEG-15", label: "normalized raw formula newlines", expected: raw("R08"), wrong: { checksum: "fnv1a-ac0ef4d0" }, failures: ["R08.checksum"] },
  { id: "NEG-16", label: "JSON-quoted raw formula", expected: raw("R02"), wrong: { checksum: "fnv1a-61a1cfea" }, failures: ["R02.checksum"] },
  { id: "NEG-17", label: "Unicode NFC normalization", expected: structured("S15"), wrong: { serialized: '{"text":"é"}', checksum: "fnv1a-7b0263d7" }, failures: ["S15.serialized", "S15.checksum"] },
  { id: "NEG-18", label: "trimmed string values", expected: structured("S19"), wrong: { serialized: '{"text":"keep \\t spaces"}', checksum: "fnv1a-75b3aa24" }, failures: ["S19.serialized", "S19.checksum"] },
  { id: "NEG-19", label: "undefined object values retained as null", expected: structured("S11"), wrong: { serialized: '{"a":null,"b":null,"c":[null,null,null,null]}', checksum: "fnv1a-5b313f8b" }, failures: ["S11.serialized", "S11.checksum"] },
  { id: "NEG-20", label: "non-native negative zero representation", expected: structured("S12"), wrong: { serialized: '{"finite":1.25,"nan":null,"negative":null,"positive":null,"zero":-0}', checksum: "fnv1a-72e2839f" }, failures: ["S12.serialized", "S12.checksum"] },
  { id: "NEG-21", label: "cross-asset identity substitution", expected: payload, wrong: ASSET_MUTATIONS[0], failures: ["P.serialized", "P.checksum"] },
  { id: "NEG-22", label: "timestamp included in asset payload", expected: payload, wrong: { serialized: ASSET_PAYLOAD.slice(0, -1) + ',"generationTimestamp":"2026-10-18T00:00:00.000Z"}', checksum: "fnv1a-9c7967f2" }, failures: ["P.serialized", "P.checksum"] },
  { id: "NEG-23", label: "generation version excluded from asset payload", expected: ASSET_MUTATIONS[1], wrong: payload, failures: ["P-version.serialized", "P-version.checksum"] },
  { id: "NEG-24", label: "source content excluded from asset payload", expected: ASSET_MUTATIONS[2], wrong: payload, failures: ["P-source.serialized", "P-source.checksum"] },
  { id: "NEG-25", label: "wrong payload accepted because digest alone agrees", expected: payload, wrong: { serialized: "{}", checksum: ASSET_CHECKSUM }, failures: ["P.serialized"] }
];

export const REVIEW_CORRUPTIONS = [
  { id: "NEG-26", label: "Current reference promotes review state", expected: CURRENT_REVIEW_EXPECTATION, wrong: { ...CURRENT_REVIEW_EXPECTATION, reviewState: "Ready for Export" }, failures: ["review.reviewState"] },
  { id: "NEG-27", label: "Current reference promotes approval", expected: CURRENT_REVIEW_EXPECTATION, wrong: { ...CURRENT_REVIEW_EXPECTATION, approvalStatus: "Approved" }, failures: ["review.approvalStatus"] },
  { id: "NEG-28", label: "Current reference promotes asset status", expected: CURRENT_REVIEW_EXPECTATION, wrong: { ...CURRENT_REVIEW_EXPECTATION, assetStatus: "Ready for Export" }, failures: ["review.assetStatus"] },
  { id: "NEG-29", label: "stale reference reported Current", expected: STALE_REVIEW_EXPECTATION, wrong: CURRENT_REVIEW_EXPECTATION, failures: ["review.reviewReferenceStatus"] }
] as const;
