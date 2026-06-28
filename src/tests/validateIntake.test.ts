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
    expect(result.sectionResults[0]).toMatchObject({
      stageId: "foundation",
      label: "Foundation",
      percentComplete: 100,
      isComplete: true
    });
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
        "successCriteria",
        "targetUsers",
        "userRoles",
        "rolePermissionsSummary",
        "requiredFeatures",
        "featureDescription",
        "acceptanceNotes",
        "workflows",
        "workflowTrigger",
        "workflowSteps",
        "workflowOutcome",
        "dataCollections",
        "fields",
        "keyFields",
        "sensitiveDataNotes",
        "risks"
      ])
    );
  });

  it("flags weak optional signals as warnings", () => {
    const project = createProject({
      identity: { id: "warnings" },
      intake: {
        appPurpose: "Purpose",
        problemStatement: "Problem",
        successCriteria: "Success",
        targetUsers: "Users",
        userRoles: "Roles",
        rolePermissionsSummary: "Permissions",
        requiredFeatures: "Feature - Description",
        featureDescription: "Feature details",
        acceptanceNotes: "Acceptance",
        dataCollections: "Entity",
        fields: "Entity.field",
        keyFields: "Entity.id",
        workflows: "Workflow",
        workflowTrigger: "Trigger",
        workflowSteps: "Steps",
        workflowOutcome: "Outcome",
        sensitiveDataNotes: "None",
        risks: "No known risks"
      },
      client: { clientName: "Client" }
    });

    const warnings = validateIntake(project).warnings.map((warning) => warning.message);
    expect(warnings).toEqual(expect.arrayContaining([
      "No constraints listed.",
      "No assumptions listed.",
      "No integrations listed.",
      "No reports listed.",
      "No branding notes listed.",
      "No accessibility notes listed."
    ]));
  });
});
