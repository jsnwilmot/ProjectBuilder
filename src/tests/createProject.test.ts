import { createProject } from "../lib/createProject";

describe("createProject", () => {
  it("creates a complete safe project record", () => {
    const project = createProject({ now: "2026-06-28T12:00:00.000Z" });
    expect(project.identity.id).toBeTruthy();
    expect(project.identity.projectName).toBe("");
    expect(project.status).toBe("Intake Started");
    expect(project.reviewStatus).toBe("Not reviewed");
    expect(project.generatedDocuments).toEqual([]);
    expect(project.generatedFileCount).toBe(0);
    expect(project.createdAt).toBe("2026-06-28T12:00:00.000Z");
    expect(project.updatedAt).toBe(project.createdAt);
    expect(project.intake).toMatchObject({
      appPurpose: "",
      workflows: "",
      permissions: "",
      successCriteria: ""
    });
  });
});
