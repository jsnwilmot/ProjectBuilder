// @ts-expect-error -- Vitest runs Web Crypto setup in Node; the app tsconfig intentionally excludes Node ambient types.
import { webcrypto } from "node:crypto";
// @ts-expect-error -- Vitest runs this static source isolation assertion in Node; the app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeSha256Hex, isSha256Hex } from "../core/sha256Fingerprint";
import { computePlanningSha256Fingerprint } from "../lib/planningClarificationFingerprints";
import {
  computeProjectConfirmationValueFingerprint,
  serializeProjectConfirmationTextValue
} from "../lib/projectConfirmationValueFingerprint";

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("domain-neutral SHA-256 fingerprint primitive", () => {
  it("recognizes only already-canonical lowercase SHA-256 hexadecimal syntax", () => {
    const mixedLowercaseHex = "0123456789abcdef".repeat(4);
    expect(isSha256Hex("a".repeat(64))).toBe(true);
    expect(isSha256Hex("0".repeat(64))).toBe(true);
    expect(isSha256Hex(mixedLowercaseHex)).toBe(true);

    for (const value of [
      undefined,
      null,
      64,
      "",
      "A".repeat(64),
      `${"a".repeat(63)}F`,
      ` ${"a".repeat(64)}`,
      `${"a".repeat(64)} `,
      `\n${"a".repeat(64)}\n`,
      `${"a".repeat(32)}\n${"a".repeat(32)}`,
      "a".repeat(63),
      "a".repeat(65),
      "g".repeat(64),
      `${"a".repeat(63)}g`
    ]) {
      expect(isSha256Hex(value)).toBe(false);
    }

    const candidate: unknown = mixedLowercaseHex;
    if (!isSha256Hex(candidate)) throw new Error("Expected a canonical SHA-256 value.");
    expect(candidate.length).toBe(64);
  });

  it("computes exact lowercase hexadecimal SHA-256 digests for UTF-8 strings", async () => {
    await expect(computeSha256Hex("")).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    await expect(computeSha256Hex("abc")).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    await expect(computeSha256Hex("Café 東京")).resolves.toBe(
      "98918795ddeb9b385b06581860b14842c325401f9abc0103af06223425e3a74a"
    );

    const utf8 = await computeSha256Hex("Café 東京");
    expect(utf8).toMatch(/^[0-9a-f]{64}$/);
    expect(utf8).toBe(utf8.toLowerCase());
  });

  it("keeps the Planning wrapper byte-equivalent to the core primitive", async () => {
    const inputs = [
      "",
      "abc",
      "Café 東京",
      "{\"projectId\":\"tti-software-licence-tracker\",\"ruleId\":\"pp.canvas.schema.confirmation\"}"
    ];

    for (const input of inputs) {
      await expect(computePlanningSha256Fingerprint(input)).resolves.toBe(await computeSha256Hex(input));
    }
  });

  it("keeps confirmation serialization and fingerprints byte-equivalent to the core primitive", async () => {
    const serializedEmpty = serializeProjectConfirmationTextValue("");
    expect(serializedEmpty).toBe('{"version":"canonical-text-json-v1","kind":"text","value":""}');
    await expect(computeSha256Hex(serializedEmpty)).resolves.toBe(
      "795e7f04509dd3e39f342a9551946b27f02dbd17c39fd4ac84c4f35f3ce559f5"
    );
    await expect(computeProjectConfirmationValueFingerprint("")).resolves.toEqual({
      outcome: "fingerprinted",
      fingerprint: "795e7f04509dd3e39f342a9551946b27f02dbd17c39fd4ac84c4f35f3ce559f5"
    });

    const serializedUtf8 = serializeProjectConfirmationTextValue("Café 東京");
    await expect(computeSha256Hex(serializedUtf8)).resolves.toBe(
      "0840d879add0a4208c4b9ebdf536720273d9ed598bd8aff2e28a4c413b016720"
    );
    await expect(computeProjectConfirmationValueFingerprint("Café 東京")).resolves.toEqual({
      outcome: "fingerprinted",
      fingerprint: "0840d879add0a4208c4b9ebdf536720273d9ed598bd8aff2e28a4c413b016720"
    });
  });

  it("keeps the core primitive isolated from concrete project domains and subsystems", () => {
    const source = readFileSync("src/core/sha256Fingerprint.ts", "utf8");
    expect(source).not.toMatch(/planning|confirmation|canvas|powerPlatform|projectRepository/i);
    expect(source).toContain("TextEncoder");
    expect(source).toContain("SHA-256");
  });
});
