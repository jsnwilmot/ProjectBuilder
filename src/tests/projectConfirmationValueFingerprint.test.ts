// @ts-expect-error -- Vitest executes in Node while the app tsconfig excludes Node ambient types.
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("project confirmation value fingerprint", () => {
  it("serializes the exact canonical text object deterministically", () => {
    expect(serializeProjectConfirmationTextValue("  Yes\r\nNO  ")).toBe(
      '{"version":"canonical-text-json-v1","kind":"text","value":"  Yes\\r\\nNO  "}'
    );
    expect(serializeProjectConfirmationTextValue("")).toBe(
      '{"version":"canonical-text-json-v1","kind":"text","value":""}'
    );
  });

  it("preserves case, whitespace, empty strings, and Unicode in deterministic SHA-256 values", async () => {
    const values = ["", " Value ", "value", "VALUE", "Café 東京"];
    const fingerprints = await Promise.all(values.map(computeProjectConfirmationValueFingerprint));
    expect(fingerprints.every((result) =>
      result.outcome === "fingerprinted" && /^[a-f0-9]{64}$/.test(result.fingerprint)
    )).toBe(true);
    expect(new Set(fingerprints.map((result) =>
      result.outcome === "fingerprinted" ? result.fingerprint : result.issueCode
    )).size).toBe(values.length);
    expect(await computeProjectConfirmationValueFingerprint("Café 東京")).toEqual(fingerprints[4]);
  });

  it("fails closed when Web Crypto hashing is unavailable or throws", async () => {
    vi.stubGlobal("crypto", undefined);
    await expect(computeProjectConfirmationValueFingerprint("value")).resolves.toEqual({
      outcome: "blocked",
      issueCode: "fingerprintUnavailable"
    });

    vi.stubGlobal("crypto", {
      subtle: { digest: vi.fn().mockRejectedValue(new Error("unavailable")) }
    });
    await expect(computeProjectConfirmationValueFingerprint("value")).resolves.toEqual({
      outcome: "blocked",
      issueCode: "fingerprintUnavailable"
    });
  });

  it("rejects a digest that does not produce the required 64 lowercase hexadecimal characters", async () => {
    vi.stubGlobal("crypto", {
      subtle: { digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2]).buffer) }
    });
    await expect(computeProjectConfirmationValueFingerprint("value")).resolves.toEqual({
      outcome: "blocked",
      issueCode: "fingerprintInvalid"
    });
  });
});
