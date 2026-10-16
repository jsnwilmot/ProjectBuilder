import { describe, expect, it } from "vitest";
import { assertCorpusCase } from "./defectCorpus/observe";
import { defectSeeds } from "./defectCorpus/seeds";
import { operators, transform, transformationCases } from "./defectCorpus/transformations";

describe("Bounded Ecommerce metamorphic properties v1.0.0", () => {
  it.each(transformationCases)("$name", test => assertCorpusCase(test.seed, test));

  it("exercises all eight declared families within the fixed 74-case budget", () => {
    const counts = Object.fromEntries(operators.map(operator => [operator.family, transformationCases.filter(test => test.operator === operator).length]));
    expect(counts).toEqual({ "case-space": 44, permutation: 1, equivalent: 3, conflict: 3, negation: 3, uncertainty: 6, replacement: 3, unrelated: 11 });
    expect(transformationCases).toHaveLength(74);
    expect(new Set(transformationCases.map(test => test.name)).size).toBe(74);
    for (const operator of operators) {
      expect(operator.version).toBe("1.0.0");
      expect(operator.preconditions.length).toBeGreaterThan(0);
      expect(operator.exceptions.length).toBeGreaterThan(0);
    }
  });

  it.each(["CHOICE-1", "CHOICE-0", "bad id", "EC-SELECTION-CONFLICT-CURRENCY"])("rejects reused, invalid or reserved insertion ID %s", recordId => {
    expect(() => transform(defectSeeds[0], "equivalent", { recordId, answer: "square" })).toThrow("Transformation not applicable");
  });

  it("rejects unsupported normalization and unlisted English fixtures", () => {
    expect(() => transform(defectSeeds[0], "case-space", { case: "unicode", padding: "internal" })).toThrow("Transformation not applicable");
    expect(() => transform({ ...defectSeeds[0], source: { ...defectSeeds[0].source, narrative: "Arbitrary English" } }, "case-space", { case: "upper", padding: "spaces" })).toThrow("Transformation not applicable");
    expect(() => transform(defectSeeds[11], "case-space", { case: "upper", padding: "spaces" })).toThrow("Transformation not applicable");
    expect(() => transform(defectSeeds[7], "negation", { prefix: "not " })).toThrow("Transformation not applicable");
  });
});
