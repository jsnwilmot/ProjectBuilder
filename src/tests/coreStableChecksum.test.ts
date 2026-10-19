// @ts-expect-error -- Source-isolation checks run in Node; app types exclude Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fnv1a, stableSortObject, stableStringify } from "../core/stableChecksum";
import { RAW_CHECKSUM_CASES, STRUCTURED_CHECKSUM_CASES } from "./checksumCompatibility/cases";
import { checksumFailures } from "./checksumCompatibility/assertions";

describe("Core checksum approved literal compatibility", () => {
  it.each(STRUCTURED_CHECKSUM_CASES)("$id preserves exact serialized bytes and digest", (testCase) => {
    const serialized = stableStringify(testCase.input());
    expect(checksumFailures(testCase, { serialized, checksum: fnv1a(serialized) })).toEqual([]);
  });

  it.each(RAW_CHECKSUM_CASES)("$id hashes raw UTF-16 code units without normalization", (testCase) => {
    expect(checksumFailures(testCase, { checksum: fnv1a(testCase.input) })).toEqual([]);
  });
});

describe("Core checksum legacy exceptions and transformation boundaries", () => {
  it.each([undefined, () => 0, Symbol("root")])("retains undefined serialization and hashing failure for %s", (input) => {
    expect(stableStringify(input)).toBeUndefined();
    expect(() => fnv1a(stableStringify(input))).toThrow(TypeError);
  });

  it.each([1n, { value: 1n }, [1n]])("propagates native BigInt errors for %s", (input) => {
    expect(() => stableStringify(input)).toThrow(TypeError);
  });

  it("preserves cyclic-object and cyclic-array recursion failure without pinning messages or depth", () => {
    const object: Record<string, unknown> = {};
    object.self = object;
    const array: unknown[] = [];
    array.push(array);
    expect(() => stableStringify(object)).toThrow(RangeError);
    expect(() => stableStringify(array)).toThrow(RangeError);
  });

  it.each([null, undefined])("does not coerce raw hashing input %s", (input) => {
    expect(() => fnv1a(input as unknown as string)).toThrow(TypeError);
  });

  it("turns a Date without enumerable keys into an empty object", () => {
    const date = new Date("2026-10-18T00:00:00.000Z");
    expect(stableSortObject(date)).toEqual({});
    expect(stableStringify(date)).toBe("{}");
    expect(date.toISOString()).toBe("2026-10-18T00:00:00.000Z");
  });

  it("retains the broad object predicate for custom and null prototypes", () => {
    const custom = Object.create({ inherited: "excluded" }) as Record<string, unknown>;
    custom.z = "A\rB";
    custom.a = 1;
    const nullPrototype = Object.create(null) as Record<string, unknown>;
    nullPrototype.z = "A\rB";
    nullPrototype.a = 1;
    expect(stableStringify(custom)).toBe('{"a":1,"z":"A\\nB"}');
    expect(stableStringify(nullPrototype)).toBe('{"a":1,"z":"A\\nB"}');
    expect(Object.getPrototypeOf(stableSortObject(nullPrototype))).toBe(Object.prototype);
  });

  it("reads getters once in sorted-key order", () => {
    const reads: string[] = [];
    const value = {
      get z() { reads.push("z"); return "Z\rZ"; },
      get a() { reads.push("a"); return "A\rA"; }
    };
    expect(stableStringify(value)).toBe('{"a":"A\\nA","z":"Z\\nZ"}');
    expect(reads).toEqual(["a", "z"]);
  });

  it("propagates the original getter error", () => {
    const failure = new Error("fixture getter");
    const value = { get a(): never { throw failure; } };
    expect(() => stableStringify(value)).toThrow(failure);
  });

  it("retains own toJSON execution on the transformed copy", () => {
    const value = { text: "A\rB", toJSON() { return this.text; } };
    expect(stableStringify(value)).toBe('"A\\nB"');
    expect(value.text).toBe("A\rB");
  });

  it("propagates the original toJSON error", () => {
    const failure = new Error("fixture toJSON");
    const value = { toJSON(): never { throw failure; } };
    expect(() => stableStringify(value)).toThrow(failure);
  });

  it("preserves loss of an own __proto__ key without mutating the input or global prototype", () => {
    const value = JSON.parse('{"__proto__":{"x":1},"a":2}');
    expect(stableStringify(value)).toBe('{"a":2}');
    expect(Object.hasOwn(value, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(Object.hasOwn(Object.prototype, "x")).toBe(false);
  });

  it("omits symbol and non-enumerable keys", () => {
    const value = { a: 1, [Symbol("excluded")]: 2 };
    Object.defineProperty(value, "hidden", { value: 3, enumerable: false });
    expect(stableStringify(value)).toBe('{"a":1}');
  });

  it("preserves sparse indexes and omits named array properties", () => {
    const value: unknown[] & { extra?: string } = new Array<unknown>(2);
    value[1] = "A\rB";
    value.extra = "excluded";
    const result = stableSortObject(value) as unknown[];
    expect(result).not.toBe(value);
    expect(Object.hasOwn(result, 0)).toBe(false);
    expect(Object.hasOwn(result, "extra")).toBe(false);
    expect(stableStringify(value)).toBe('[null,"A\\nB"]');
    expect(Object.hasOwn(value, 0)).toBe(false);
    expect(value[1]).toBe("A\rB");
    expect(value.extra).toBe("excluded");
  });

  it("copies and sorts frozen nested objects without changing arrays, source order, or source text", () => {
    const value = Object.freeze({ z: Object.freeze({ text: "A\rB" }), a: Object.freeze([2, 1]) });
    const before = structuredClone(value);
    const result = stableSortObject(value) as { a: number[]; z: { text: string } };
    expect(Object.keys(result)).toEqual(["a", "z"]);
    expect(result).toEqual({ a: [2, 1], z: { text: "A\nB" } });
    expect(result).not.toBe(value);
    expect(result.a).not.toBe(value.a);
    expect(result.z).not.toBe(value.z);
    expect(stableStringify(value)).toBe('{"a":[2,1],"z":{"text":"A\\nB"}}');
    expect(value).toEqual(before);
    expect(Object.keys(value)).toEqual(["z", "a"]);
  });

  it("keeps Core isolated with exactly the three approved exports", () => {
    const source = readFileSync("src/core/stableChecksum.ts", "utf8");
    expect(source).not.toMatch(/^import\b/m);
    expect([...source.matchAll(/^export function (\w+)/gm)].map((match) => match[1]))
      .toEqual(["stableSortObject", "stableStringify", "fnv1a"]);
  });
});
