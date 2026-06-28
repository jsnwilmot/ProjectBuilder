import {
  GENERATE_STAGE_INDEX,
  INTAKE_STAGES,
  REVIEW_STAGE_INDEX
} from "../data/intakeStages";

describe("intake stage configuration", () => {
  it("defines the required 8 intake stages in order", () => {
    expect(INTAKE_STAGES.map((stage) => stage.label)).toEqual([
      "Foundation",
      "Users",
      "Features",
      "Data",
      "Workflows",
      "Security",
      "Review",
      "Generate"
    ]);
  });

  it("provides completion metadata from one source of truth", () => {
    for (const stage of INTAKE_STAGES) {
      expect(stage.id).toBeTruthy();
      expect(stage.description).toBeTruthy();
      expect(Array.isArray(stage.requiredFields)).toBe(true);
      expect(Array.isArray(stage.optionalFields)).toBe(true);
      expect(Array.isArray(stage.completionRules)).toBe(true);
      expect(stage.nextActionLabel).toBeTruthy();
    }
    expect(REVIEW_STAGE_INDEX).toBe(6);
    expect(GENERATE_STAGE_INDEX).toBe(7);
  });
});
