import type { ImplementationAsset } from "../../lib/implementationAssets";

// Transcribed from the approved design, never generated from production results.
export interface StructuredChecksumCase {
  readonly id: string;
  readonly input: () => unknown;
  readonly serialized: string;
  readonly checksum: string;
}

export const STRUCTURED_CHECKSUM_CASES: readonly StructuredChecksumCase[] = [
  { id: "S01", input: () => ({ b: 2, a: 1 }), serialized: '{"a":1,"b":2}', checksum: "fnv1a-5314055b" },
  { id: "S02", input: () => ({ z: { b: 2, a: 1 }, a: [{ y: 2, x: 1 }, 3] }), serialized: '{"a":[{"x":1,"y":2},3],"z":{"a":1,"b":2}}', checksum: "fnv1a-12043505" },
  { id: "S03", input: () => [2, 1], serialized: "[2,1]", checksum: "fnv1a-40569d7e" },
  { id: "S04", input: () => [1, 2], serialized: "[1,2]", checksum: "fnv1a-7d8e8676" },
  { id: "S05", input: () => ({}), serialized: "{}", checksum: "fnv1a-5465b825" },
  { id: "S06", input: () => [], serialized: "[]", checksum: "fnv1a-741638a5" },
  { id: "S07", input: () => null, serialized: "null", checksum: "fnv1a-77074ba4" },
  { id: "S08", input: () => "", serialized: '""', checksum: "fnv1a-ffcaaa85" },
  { id: "S09", input: () => ({ text: "Café 東京 😀" }), serialized: '{"text":"Café 東京 😀"}', checksum: "fnv1a-3f2713f1" },
  { id: "S10", input: () => ({ text: "A\r\nB\rC\n" }), serialized: '{"text":"A\\nB\\nC\\n"}', checksum: "fnv1a-1d08c686" },
  { id: "S11", input: () => {
    const c = [undefined, undefined, () => 0, Symbol("s")];
    Reflect.deleteProperty(c, 1); // The approved input has an actual hole, not undefined.
    return { a: null, b: undefined, c };
  }, serialized: '{"a":null,"c":[null,null,null,null]}', checksum: "fnv1a-94b94654" },
  { id: "S12", input: () => ({ zero: -0, finite: 1.25, nan: NaN, positive: Infinity, negative: -Infinity }), serialized: '{"finite":1.25,"nan":null,"negative":null,"positive":null,"zero":0}', checksum: "fnv1a-9b1fddb6" },
  { id: "S13", input: () => ({ "10": "ten", "2": "two", "01": "leading", a: "A" }), serialized: '{"2":"two","10":"ten","01":"leading","a":"A"}', checksum: "fnv1a-fea0d276" },
  { id: "S14", input: () => ({ text: "é" }), serialized: '{"text":"é"}', checksum: "fnv1a-7b0263d7" },
  { id: "S15", input: () => ({ text: "e\u0301" }), serialized: '{"text":"e\u0301"}', checksum: "fnv1a-e12a07c0" },
  { id: "S16", input: () => [1e21, 1e-7, 1e-6], serialized: "[1e+21,1e-7,0.000001]", checksum: "fnv1a-a92096ee" },
  { id: "S17", input: () => ({ "a\rb": "x\ry" }), serialized: '{"a\\rb":"x\\ny"}', checksum: "fnv1a-6bcf5f1d" },
  { id: "S18", input: () => "\ud800", serialized: '"\\ud800"', checksum: "fnv1a-3ffd2a2c" },
  { id: "S19", input: () => ({ text: "  keep \t spaces  " }), serialized: '{"text":"  keep \\t spaces  "}', checksum: "fnv1a-39c0ce84" }
];

export const RAW_CHECKSUM_CASES = [
  { id: "R01", input: "", checksum: "fnv1a-811c9dc5" },
  { id: "R02", input: "a", checksum: "fnv1a-e40c292c" },
  { id: "R03", input: "foobar", checksum: "fnv1a-bf9cf968" },
  { id: "R04", input: "Café 東京", checksum: "fnv1a-acfad489" },
  { id: "R05", input: "😀", checksum: "fnv1a-cb31c4b8" },
  { id: "R06", input: "A\nB", checksum: "fnv1a-ac0ef4d0" },
  { id: "R07", input: "A\rB", checksum: "fnv1a-6e01c743" },
  { id: "R08", input: "A\r\nB", checksum: "fnv1a-5e7f7d9b" },
  { id: "R09", input: "68", checksum: "fnv1a-0de8d5a3" }
] as const;

export const ASSET_PAYLOAD = '{"applicabilityStatus":"required","approvedPropertyName":"","assetCategory":"Power Fx","assetId":"asset-fixture","assetType":"powerFxPlan","blockingIssues":[],"connectorIds":[],"dependencies":[],"entityIds":[],"fieldIds":[],"gateEvaluationSnapshot":[],"generationInputs":{},"generationVersion":"phase-5a.2","intendedPath":"07_Development/PowerFx/fixture.fx","knownLimitations":[],"manualInstallationRequirements":[],"platform":"Power Apps Canvas","projectId":"project-fixture","required":true,"requiredGateIds":[],"sourceContent":"A\\nB","sourceRecordIds":["a","b"],"targetDisplayName":"Fixture","targetId":"control-fixture","validationRequirements":[]}';
export const ASSET_CHECKSUM = "fnv1a-174894e2";

// No project factory, registry defaults, generation, or real approval is involved.
export function checksumAssetFixture(): ImplementationAsset {
  return {
    assetId: "asset-fixture", projectId: "project-fixture", platform: "Power Apps Canvas",
    assetCategory: "Power Fx", assetType: "powerFxPlan", targetId: "control-fixture",
    targetDisplayName: "Fixture", intendedPath: "07_Development/PowerFx/fixture.fx",
    sourceContent: "A\r\nB", assetStatus: "Review Required", applicabilityStatus: "required",
    required: true, requiredGateIds: [], gateEvaluationSnapshot: [], sourceRecordIds: ["b", "a", "a"],
    connectorIds: [], entityIds: [], fieldIds: [], dependencies: [],
    generationTimestamp: "2026-10-18T00:00:00.000Z", generationVersion: "phase-5a.2",
    contentChecksum: "ignored", manualInstallationRequirements: [], validationRequirements: [],
    knownLimitations: [], blockingIssues: [], approvalStatus: "Review required"
  };
}

export const ASSET_MUTATIONS = [
  { id: "P-identity", change: { assetId: "asset-other" }, serialized: "{\"applicabilityStatus\":\"required\",\"approvedPropertyName\":\"\",\"assetCategory\":\"Power Fx\",\"assetId\":\"asset-other\",\"assetType\":\"powerFxPlan\",\"blockingIssues\":[],\"connectorIds\":[],\"dependencies\":[],\"entityIds\":[],\"fieldIds\":[],\"gateEvaluationSnapshot\":[],\"generationInputs\":{},\"generationVersion\":\"phase-5a.2\",\"intendedPath\":\"07_Development/PowerFx/fixture.fx\",\"knownLimitations\":[],\"manualInstallationRequirements\":[],\"platform\":\"Power Apps Canvas\",\"projectId\":\"project-fixture\",\"required\":true,\"requiredGateIds\":[],\"sourceContent\":\"A\\nB\",\"sourceRecordIds\":[\"a\",\"b\"],\"targetDisplayName\":\"Fixture\",\"targetId\":\"control-fixture\",\"validationRequirements\":[]}", checksum: "fnv1a-ac01bd67" },
  { id: "P-version", change: { generationVersion: "phase-5a.1" }, serialized: "{\"applicabilityStatus\":\"required\",\"approvedPropertyName\":\"\",\"assetCategory\":\"Power Fx\",\"assetId\":\"asset-fixture\",\"assetType\":\"powerFxPlan\",\"blockingIssues\":[],\"connectorIds\":[],\"dependencies\":[],\"entityIds\":[],\"fieldIds\":[],\"gateEvaluationSnapshot\":[],\"generationInputs\":{},\"generationVersion\":\"phase-5a.1\",\"intendedPath\":\"07_Development/PowerFx/fixture.fx\",\"knownLimitations\":[],\"manualInstallationRequirements\":[],\"platform\":\"Power Apps Canvas\",\"projectId\":\"project-fixture\",\"required\":true,\"requiredGateIds\":[],\"sourceContent\":\"A\\nB\",\"sourceRecordIds\":[\"a\",\"b\"],\"targetDisplayName\":\"Fixture\",\"targetId\":\"control-fixture\",\"validationRequirements\":[]}", checksum: "fnv1a-c88033c1" },
  { id: "P-source", change: { sourceContent: "A\nC" }, serialized: "{\"applicabilityStatus\":\"required\",\"approvedPropertyName\":\"\",\"assetCategory\":\"Power Fx\",\"assetId\":\"asset-fixture\",\"assetType\":\"powerFxPlan\",\"blockingIssues\":[],\"connectorIds\":[],\"dependencies\":[],\"entityIds\":[],\"fieldIds\":[],\"gateEvaluationSnapshot\":[],\"generationInputs\":{},\"generationVersion\":\"phase-5a.2\",\"intendedPath\":\"07_Development/PowerFx/fixture.fx\",\"knownLimitations\":[],\"manualInstallationRequirements\":[],\"platform\":\"Power Apps Canvas\",\"projectId\":\"project-fixture\",\"required\":true,\"requiredGateIds\":[],\"sourceContent\":\"A\\nC\",\"sourceRecordIds\":[\"a\",\"b\"],\"targetDisplayName\":\"Fixture\",\"targetId\":\"control-fixture\",\"validationRequirements\":[]}", checksum: "fnv1a-8fa5278b" }
] as const;
