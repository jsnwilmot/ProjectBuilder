// @ts-expect-error -- Vitest runs this static source isolation assertion in Node; the app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCanonicalUuid } from "../core/canonicalUuid";
import { isCanonicalProjectConfirmationUuid } from "../lib/projectConfirmationProvenance";

const acceptedCanonicalUuids = [
  "10000000-0000-1000-8000-000000000001",
  "20000000-0000-2000-9000-000000000002",
  "30000000-0000-3000-a000-000000000003",
  "40000000-0000-4000-b000-000000000004",
  "50000000-0000-5000-8000-000000000005",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb",
  "cccccccc-cccc-4ccc-accc-cccccccccccc",
  "dddddddd-dddd-4ddd-bddd-dddddddddddd"
] as const;

const rejectedCanonicalUuidCandidates = [
  undefined,
  null,
  123,
  "",
  "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA",
  " aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa ",
  "aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaaaaaa",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa0",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa00",
  "aaaaaaaa-aaaa-0aaa-8aaa-aaaaaaaaaaaa",
  "aaaaaaaa-aaaa-6aaa-8aaa-aaaaaaaaaaaa",
  "aaaaaaaa-aaaa-4aaa-7aaa-aaaaaaaaaaaa",
  "aaaaaaaa-aaaa-4aaa-caaa-aaaaaaaaaaaa",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaz"
] as const;

describe("canonical UUID core primitive", () => {
  it("accepts only lowercase canonical UUID syntax with approved versions and variants", () => {
    for (const value of acceptedCanonicalUuids) {
      expect(isCanonicalUuid(value)).toBe(true);
      expect(value).toBe(value.toLowerCase());
    }
  });

  it("rejects non-strings, normalization candidates, unsupported nibbles, length drift, and non-hex characters", () => {
    for (const value of rejectedCanonicalUuidCandidates) {
      expect(isCanonicalUuid(value)).toBe(false);
    }
  });

  it("keeps the Confirmation UUID wrapper equivalent to the core primitive", () => {
    const fixtureMatrix = [
      ...acceptedCanonicalUuids,
      ...rejectedCanonicalUuidCandidates
    ];

    for (const value of fixtureMatrix) {
      expect(isCanonicalProjectConfirmationUuid(value)).toBe(isCanonicalUuid(value));
    }
  });

  it("keeps UUID syntax validation isolated from concrete project domains and subsystems", () => {
    const coreSource = readFileSync("src/core/canonicalUuid.ts", "utf8");
    expect(coreSource).not.toMatch(/^import/m);
    expect(coreSource).not.toMatch(/planning|confirmation|controlledApply|canvas|powerPlatform|repository|storage|authority/i);

    const confirmationSource = readFileSync("src/lib/projectConfirmationProvenance.ts", "utf8");
    expect(confirmationSource).not.toMatch(/const UUID_PATTERN/);
    expect(confirmationSource).toMatch(/isCanonicalProjectConfirmationUuid\(value: unknown\): value is string/);
    expect(confirmationSource).toMatch(/return isCanonicalUuid\(value\);/);

    const historySource = readFileSync("src/lib/planningControlledApplyHistory.ts", "utf8");
    expect(historySource).not.toMatch(/UUID_PATTERN/);
    expect(historySource).toMatch(/invalidApplyId/);

    const finalizationSource = readFileSync("src/lib/planningControlledApplyTransactionFinalization.ts", "utf8");
    expect(finalizationSource).not.toMatch(/UUID_PATTERN/);
    expect(finalizationSource).toMatch(/invalidUuid/);
    expect(finalizationSource).toMatch(/duplicateUuid/);
  });
});
