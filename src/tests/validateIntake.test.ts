import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import { getOutstandingFields, getStepCompletion, validateIntake } from "../lib/validateIntake";

describe("validateIntake", () => {
  it("returns a structured valid result and optional warnings", () => {
    const project = createSeedProject();
    const result = validateIntake(project);
    expect(result.isValid).toBe(true);
    expect(result.missingFields).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.sectionResults).toHaveLength(8);
    expect(getOutstandingFields(project).length).toBeGreaterThan(0);
    expect(getStepCompletion(project, 0)).toBe(100);
  });

  it("reports all required categories for an empty project", () => {
    const result = validateIntake(createProject({ identity: { id: "empty-project" } }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        "appName",
        "clientName",
        "appPurpose",
        "problemStatement",
        "targetUsers",
        "userRoles",
        "requiredFeatures",
        "workflows",
        "screens",
        "dataCollections",
        "fields",
        "permissions",
        "successCriteria"
      ])
    );
  });
});
