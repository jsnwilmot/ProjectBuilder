import { describe, expect, it } from "vitest";
import {
  calculateImplementationAssetChecksum,
  calculateStableImplementationChecksum,
  createCanonicalAssetPayload
} from "../lib/implementationAssets";
import {
  ASSET_CHECKSUM, ASSET_MUTATIONS, ASSET_PAYLOAD,
  checksumAssetFixture, STRUCTURED_CHECKSUM_CASES
} from "./checksumCompatibility/cases";
import { checksumFailures } from "./checksumCompatibility/assertions";

describe("approved checksum compatibility through unchanged public wrappers", () => {
  it.each(STRUCTURED_CHECKSUM_CASES)("$id retains its literal structured digest", (testCase) => {
    expect(checksumFailures({ id: testCase.id, checksum: testCase.checksum }, {
      checksum: calculateStableImplementationChecksum(testCase.input())
    })).toEqual([]);
  });

  it("P matches the complete independent payload and checksum without mutating the asset", () => {
    const asset = checksumAssetFixture();
    const before = structuredClone(asset);
    expect(checksumFailures({ id: "P", serialized: ASSET_PAYLOAD, checksum: ASSET_CHECKSUM }, {
      serialized: createCanonicalAssetPayload(asset), checksum: calculateImplementationAssetChecksum(asset)
    })).toEqual([]);
    expect(asset).toEqual(before);
    expect(asset.generationInputs).toBeUndefined();
    expect(asset.approvedPropertyName).toBeUndefined();
  });

  it.each(ASSET_MUTATIONS)("$id preserves the independent changed-field payload and digest", (mutation) => {
    const asset = { ...checksumAssetFixture(), ...mutation.change };
    expect(checksumFailures(mutation, {
      serialized: createCanonicalAssetPayload(asset), checksum: calculateImplementationAssetChecksum(asset)
    })).toEqual([]);
  });

  it.each([
    { generationTimestamp: "2099-01-01T00:00:00.000Z" },
    { assetStatus: "Ready for Export" as const },
    { approvalStatus: "Approved" as const },
    { contentChecksum: "arbitrary" },
    { generationTimestamp: "2099-01-01T00:00:00.000Z", assetStatus: "Ready for Export" as const, approvalStatus: "Approved" as const, contentChecksum: "arbitrary" }
  ])("P excludes metadata %j without granting any approval", (change) => {
    const asset = { ...checksumAssetFixture(), ...change };
    expect(createCanonicalAssetPayload(asset)).toBe(ASSET_PAYLOAD);
    expect(calculateImplementationAssetChecksum(asset)).toBe(ASSET_CHECKSUM);
    // These functions only calculate bytes. They do not normalize or approve records.
    expect(asset).toEqual({ ...checksumAssetFixture(), ...change });
  });

  it.each([undefined, () => 0, Symbol("root"), 1n])("retains exceptional public-wrapper input %s", (value) => {
    expect(() => calculateStableImplementationChecksum(value)).toThrow(TypeError);
  });
});
