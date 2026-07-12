import { DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../data/folderStructure";
import { GENERATED_FILES } from "../data/generatedFiles";
import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { deriveReviewItems } from "../lib/clientReview";

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
    expect(questions?.content).toContain("## Questions grouped for client review");
    expect(questions?.content).toContain("## Not applicable decisions");
    expect(questions?.content).toContain("## Deferred decisions");
    expect(checklist?.content).toContain("A Draft package may be reviewed and exported.");
    expect(checklist?.content).toContain("## Current blockers");
    expect(nextSteps?.content).toContain("## Use This Project Package");
    expect(nextSteps?.content).toContain("## Codex readiness checklist");
    expect(nextSteps?.content).toContain("Run Phase 1 only in Codex.");
  });

  it("writes deferred review decisions into client questions and next steps", () => {
    const project = createSeedProject();
    const deferred = deriveReviewItems(project).find((item) => item.allowDeferred)!;
    project.reviewItems = deriveReviewItems(project).map((item) => item.id === deferred.id
      ? {
          ...item,
          status: "Deferred",
          deferredReason: "Confirm during the client design review."
        }
      : item);

    const result = generateProjectPackage(project);
    const questions = result.documents.find((document) => document.fileName === "CLIENT_QUESTIONS.md");
    const nextSteps = result.documents.find((document) => document.fileName === "NEXT_STEPS.md");

    expect(questions?.content).toContain(deferred.recommendedQuestion);
    expect(questions?.content).toContain("Confirm during the client design review.");
    expect(nextSteps?.content).toContain("Confirm during the client design review.");
  });

  it("generates structured Power Platform schema documents without final implementation code", () => {
    const project = createProject({
      identity: { id: "power-docs", projectName: "Power Docs" },
      intake: { appType: "powerAppsCanvas" }
    });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.sourcePurpose = "Track requests";
    project.powerPlatform!.canvas!.sourceOwnership = "Operations";
    project.powerPlatform!.canvas!.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
    project.powerPlatform!.canvas!.sharePointListDefinitions = "Requests list";
    project.powerPlatform!.canvas!.sharePointColumnDefinitions = "Title / Title / Text";

    const result = generateProjectPackage(project);
    const connectorRegister = result.documents.find((document) => document.fileName === "CONNECTOR_REGISTER.md");
    const licensing = result.documents.find((document) => document.fileName === "LICENSING_ASSESSMENT.md");
    const dataSource = result.documents.find((document) => document.fileName === "DATA_SOURCE_SCHEMA.md");
    const sharePoint = result.documents.find((document) => document.fileName === "SHAREPOINT_SCHEMA.md");
    const internalNames = result.documents.find((document) => document.fileName === "INTERNAL_COLUMN_NAMES.md");

    expect(result.documents.map((document) => document.fileName)).toEqual(expect.arrayContaining([
      "CONNECTOR_REGISTER.md",
      "LICENSING_ASSESSMENT.md",
      "DATA_SOURCE_SCHEMA.md",
      "SHAREPOINT_SCHEMA.md",
      "INTERNAL_COLUMN_NAMES.md"
    ]));
    expect(connectorRegister?.content).toContain("## Connector selection gate");
    expect(licensing?.content).toContain("## Current licence information");
    expect(dataSource?.content).toContain("This document captures schema requirements only.");
    expect(sharePoint?.content).toContain("Display names are not enough");
    expect(internalNames?.content).toContain("Do not guess internal names");
    expect(result.documents.map((document) => document.content).join("\n")).not.toContain("Patch(");
  });
});
