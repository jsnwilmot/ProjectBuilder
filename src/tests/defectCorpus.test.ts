import { describe, expect, it } from "vitest";
import { assertCorpusCase, oracleViolations } from "./defectCorpus/observe";
import { defectSeeds } from "./defectCorpus/seeds";
import { transformationCases } from "./defectCorpus/transformations";
import type { CorpusObservation } from "./defectCorpus/observe";

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
