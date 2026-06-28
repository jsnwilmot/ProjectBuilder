import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import {
  getGeneratedFileCount,
  getNextAction,
  getOutstandingQuestionCount,
  getProjectCompletionPercent,
  getProjectDisplayStatus,
  getReadinessSections
} from "../lib/projectSelectors";

describe("project selectors", () => {
  it("calculates dashboard values without mutating the project", () => {
    const project = createSeedProject();
    const before = JSON.stringify(project);
    expect(getOutstandingQuestionCount(project)).toBeGreaterThan(0);
    expect(getGeneratedFileCount(project)).toBe(0);
    expect(getReadinessSections(project)).toHaveLength(6);
    expect(getProjectCompletionPercent(project)).toBeGreaterThan(0);
    expect(getNextAction(project)).toBe("Generate project package");
    expect(getProjectDisplayStatus(project)).toBe("Intake Complete");
    expect(JSON.stringify(project)).toBe(before);
  });

  it("returns intake guidance for an empty project", () => {
    const project = createProject({ identity: { id: "empty" } });
    expect(getProjectDisplayStatus(project)).toBe("Intake Started");
    expect(getNextAction(project)).toBe("Complete the project foundation");
  });
});
