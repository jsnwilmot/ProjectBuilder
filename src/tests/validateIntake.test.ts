import { createSeedProject } from "../data/seedProject";
import { getOutstandingFields, getStepCompletion, validateIntake } from "../lib/validateIntake";

describe("validateIntake", () => {
  it("accepts the seeded required fields and reports optional gaps", () => {
    const { intake } = createSeedProject();
    expect(validateIntake(intake)).toEqual([]);
    expect(getOutstandingFields(intake).length).toBeGreaterThan(0);
    expect(getStepCompletion(intake, 0)).toBe(100);
  });

  it("reports each missing required field with a clear message", () => {
    const { intake } = createSeedProject();
    const issues = validateIntake({ ...intake, appName: "", successCriteria: "" });
    expect(issues.map((issue) => issue.field)).toEqual(["appName", "successCriteria"]);
    expect(issues[0].message).toMatch(/required before package generation/i);
  });
});
