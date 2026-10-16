import { describe, expect, it } from "vitest";
import { assertCorpusCase, oracleViolations } from "./defectCorpus/observe";
import { defectSeeds } from "./defectCorpus/seeds";
import { transformationCases } from "./defectCorpus/transformations";
import type { CorpusObservation } from "./defectCorpus/observe";
import type { Family } from "./defectCorpus/types";

// Literal sensitivity inputs, independent of both production output and the
// oracle's patterns/selected values. Other singleton dependencies remain valid.
const resolvedControls = [
  {
    seedIds: ["PB-CORPUS-EC-001"], choiceId: "paymentProvider", value: "Square", replacement: "Stripe",
    selected: "Test the recorded checkout flow using the recorded Square payment integration",
    replaced: "Test the recorded checkout flow using the recorded Stripe payment integration",
    dependency: "resolve the recorded payment provider",
    otherDependencies: ["resolve the recorded currency", "resolve the recorded checkout mode"]
  },
  {
    seedIds: ["PB-CORPUS-EC-002", "PB-CORPUS-EC-004"], choiceId: "currency", value: "USD", replacement: "CAD",
    selected: "Test the recorded checkout flow in USD", replaced: "Test the recorded checkout flow in CAD",
    dependency: "resolve the recorded currency",
    otherDependencies: ["resolve the recorded payment provider", "resolve the recorded checkout mode"]
  },
  {
    seedIds: ["PB-CORPUS-EC-003"], choiceId: "checkoutMode", value: "Guest checkout", replacement: "authenticated checkout",
    selected: "Test the recorded Guest checkout flow", replaced: "Test the recorded authenticated checkout flow",
    dependency: "resolve the recorded checkout mode",
    otherDependencies: ["resolve the recorded payment provider", "resolve the recorded currency"]
  }
] as const;
const resolvedFamilies: readonly Family[] = ["case-space", "equivalent", "permutation", "replacement", "unrelated"];
const resolvedOracleCases = resolvedControls.flatMap(control => control.seedIds.flatMap(seedId => {
  const seed = defectSeeds.find(candidate => candidate.id === seedId)!;
  return [
    { name: `${seedId} / original`, control, expected: seed.expected, replacement: false, duplicate: seedId === "PB-CORPUS-EC-004" },
    ...transformationCases.filter(test => test.seed === seed && resolvedFamilies.includes(test.operator.family)).map(test => ({
      name: test.name, control, expected: test.expected, replacement: test.operator.family === "replacement",
      duplicate: seedId === "PB-CORPUS-EC-004" || test.operator.family === "equivalent"
    }))
  ];
}));

describe("Permanent Ecommerce defect corpus v1.0.0", () => {
  it.each(defectSeeds)("$id: $originatingRegression.case", seed => assertCorpusCase(seed));

  it("retains distinct identities, reliable historical references and bounded coverage", () => {
    expect(new Set(defectSeeds.map(seed => seed.id)).size).toBe(12);
    expect(defectSeeds).toHaveLength(12);
    for (const seed of defectSeeds) {
      expect(seed.history.fixingCommit).toMatch(/^[0-9a-f]{40}$/);
      expect(seed.history.introducingCommit).toBeNull();
      expect(seed.originatingRegression.file).toMatch(/^src\/tests\/.+\.test\.ts$/);
      expect(seed.reproduction).toContain(seed.id);
      expect(seed.projectType).toBe("ecommerceSite");
      expect(new Set(transformationCases.filter(test => test.seed === seed).map(test => test.operator.family)))
        .toEqual(new Set(seed.propertyRefs));
    }
  });

  it("rejects a selected winner and provider-specific instruction for the historical conflict", () => {
    const seed = defectSeeds.find(candidate => candidate.id === "PB-DEFECT-6D2-001")!;
    const wrong: CorpusObservation = {
      authority: "none", version: "1.0.0",
      singleton: {
        authority: "none", observationVersion: "1.0.0", projectType: "ecommerceSite", choiceId: "paymentProvider",
        contributingRecordIds: ["CHOICE-1", "CHOICE-2"], selectedValue: "Square",
        conflictIds: ["EC-SELECTION-CONFLICT-PAYMENT-PROVIDER"],
        verificationStatements: ["Test the recorded checkout flow using the recorded Square payment integration"]
      },
      records: [{ id: "CHOICE-1", status: "Answered", answer: "Stripe" }, { id: "CHOICE-2", status: "Answered", answer: "Square" }]
    };
    const violations = oracleViolations(wrong, seed.expected).join("\n");
    expect(violations).toContain('"code":"selection"');
    expect(violations).toContain("Forbidden verification");
    expect(violations).toContain("Missing required verification");
  });
});

describe("Resolved singleton verification oracle sensitivity", () => {
  it.each(resolvedOracleCases)("$name rejects selected-plus-unresolved verification and permits other dependencies", test => {
    const value = test.replacement ? test.control.replacement : test.control.value;
    const recordIds = test.duplicate ? ["CHOICE-1", "CHOICE-2"] : ["CHOICE-1"];
    const valid: CorpusObservation = {
      authority: "none", version: "1.0.0",
      singleton: {
        authority: "none", observationVersion: "1.0.0", projectType: "ecommerceSite", choiceId: test.control.choiceId,
        contributingRecordIds: recordIds, selectedValue: value, conflictIds: [],
        verificationStatements: [test.replacement ? test.control.replaced : test.control.selected, ...test.control.otherDependencies]
      },
      records: recordIds.map(id => ({ id, status: "Answered", answer: value }))
    };
    // This must pass with both other-choice dependencies still present. The
    // negative control adds only the dependency contradicting this selection.
    expect(oracleViolations(valid, test.expected), test.name).toEqual([]);
    const contradictory: CorpusObservation = {
      ...valid,
      singleton: { ...valid.singleton, verificationStatements: [...valid.singleton.verificationStatements, test.control.dependency] }
    };
    expect(oracleViolations(contradictory, test.expected), test.name)
      .toEqual([`Forbidden verification: /${test.control.dependency}/iu`]);
  });

  it("covers all four resolved seeds and all 27 relevant derived expectations", () => {
    expect(resolvedOracleCases).toHaveLength(31);
    expect(resolvedOracleCases.filter(test => test.name.endsWith("/ original"))).toHaveLength(4);
    expect(Object.fromEntries(resolvedFamilies.map(family => [family, transformationCases.filter(test =>
      test.operator.family === family && resolvedControls.some(control => (control.seedIds as readonly string[]).includes(test.seed.id))
    ).length]))).toEqual({ "case-space": 16, equivalent: 3, permutation: 1, replacement: 3, unrelated: 4 });
  });
});
