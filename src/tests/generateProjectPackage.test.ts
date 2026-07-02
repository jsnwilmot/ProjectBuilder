import { DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../data/folderStructure";
import { GENERATED_FILES } from "../data/generatedFiles";
import { createSeedProject } from "../data/seedProject";
import { generateProjectPackage } from "../lib/generateProjectPackage";

describe("generateProjectPackage", () => {
  it("creates every required folder and document", () => {
    const result = generateProjectPackage(createSeedProject());
    expect(result.folders).toEqual(PROJECT_FOLDERS);
    expect(result.documents).toHaveLength(DOCUMENT_LOCATIONS.length);
    expect(result.documents.map((document) => document.fileName)).toEqual(
      DOCUMENT_LOCATIONS.map((document) => document.fileName)
    );
    expect(result.documents.map((document) => document.fileName)).toEqual(GENERATED_FILES);
  });

  it("keeps missing optional information explicit", () => {
    const result = generateProjectPackage(createSeedProject());
    const dataModel = result.documents.find((document) => document.fileName === "DATA_MODEL.md");
    expect(dataModel?.content).toContain("[MISSING: data sources]");
  });

  it("allows generation when required intake is incomplete and keeps missing markers", () => {
    const project = createSeedProject();
    const invalid = { ...project, intake: { ...project.intake, appPurpose: "" } };
    const result = generateProjectPackage(invalid);
    const readme = result.documents.find((document) => document.fileName === "README.md");
    expect(readme?.content).toContain("[MISSING: app purpose]");
  });

  it("maps files to approved folders", () => {
    const result = generateProjectPackage(createSeedProject());
    expect(result.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileName: "README.md", folder: "00_Project_Overview" }),
        expect.objectContaining({ fileName: "PROJECT_SCOPE.md", folder: "00_Project_Overview" }),
        expect.objectContaining({ fileName: "HANDOFF_CHECKLIST.md", folder: "00_Project_Overview" }),
        expect.objectContaining({ fileName: "CLIENT_REQUIREMENTS.md", folder: "01_Requirements" }),
        expect.objectContaining({ fileName: "CLIENT_QUESTIONS.md", folder: "01_Requirements" }),
        expect.objectContaining({ fileName: "BRAND_GUIDE.md", folder: "04_UI_UX" }),
        expect.objectContaining({ fileName: "ARCHITECT_INSTRUCTIONS.md", folder: "02_Architecture" }),
        expect.objectContaining({ fileName: "CODEX_INSTRUCTIONS.md", folder: "07_Development" }),
        expect.objectContaining({ fileName: "PHASED_CODEX_PROMPTS.md", folder: "11_Codex_Prompts" })
      ])
    );
  });

  it("generates non-empty content for every document", () => {
    const result = generateProjectPackage(createSeedProject());
    for (const document of result.documents) {
      expect(document.content.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes required instruction sections in architect and codex docs", () => {
    const result = generateProjectPackage(createSeedProject());
    const architect = result.documents.find((document) => document.fileName === "ARCHITECT_INSTRUCTIONS.md");
    const codex = result.documents.find((document) => document.fileName === "CODEX_INSTRUCTIONS.md");
    expect(architect?.content).toContain("## Review process");
    expect(architect?.content).toContain("## Blocked assumptions");
    expect(codex?.content).toContain("## Missing decision rule");
    expect(codex?.content).toContain("## Scope boundary rule");
  });

  it("includes phased prompts with required sections", () => {
    const result = generateProjectPackage(createSeedProject());
    const prompts = result.documents.find((document) => document.fileName === "PHASED_CODEX_PROMPTS.md");
    expect(prompts?.content).toContain("## Phase 1: Project setup");
    expect(prompts?.content).toContain("## Phase 8: Review, testing, and deployment");
    expect(prompts?.content).toContain("### Objective");
    expect(prompts?.content).toContain("### Files to create or update");
    expect(prompts?.content).toContain("### Acceptance criteria");
    expect(prompts?.content).toContain("### Testing instructions");
    expect(prompts?.content).toContain("### Reporting instructions");
  });

  it("generates the brand guide, client questions, and handoff checklist", () => {
    const result = generateProjectPackage(createSeedProject());
    const brandGuide = result.documents.find((document) => document.fileName === "BRAND_GUIDE.md");
    const questions = result.documents.find((document) => document.fileName === "CLIENT_QUESTIONS.md");
    const checklist = result.documents.find((document) => document.fileName === "HANDOFF_CHECKLIST.md");
    const nextSteps = result.documents.find((document) => document.fileName === "NEXT_STEPS.md");

    expect(brandGuide?.content).toContain("# Brand Guide");
    expect(brandGuide?.content).toContain("Established department brand");
    expect(questions?.content).toContain("# Client Questions");
    expect(checklist?.content).toContain("A Draft package may be reviewed and exported.");
    expect(nextSteps?.content).toContain("## Use This Project Package");
    expect(nextSteps?.content).toContain("Run Phase 1 only in Codex.");
  });
});
