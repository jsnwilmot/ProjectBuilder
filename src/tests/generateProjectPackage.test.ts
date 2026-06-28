import { DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../data/folderStructure";
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
  });

  it("keeps missing optional information explicit", () => {
    const result = generateProjectPackage(createSeedProject());
    const dataModel = result.documents.find((document) => document.fileName === "DATA_MODEL.md");
    expect(dataModel?.content).toContain("[MISSING: data sources]");
    expect(dataModel?.content).toContain("[MISSING: data retention requirements]");
  });

  it("allows generation when required intake is incomplete and keeps missing markers", () => {
    const project = createSeedProject();
    const invalid = { ...project, intake: { ...project.intake, appPurpose: "" } };
    const result = generateProjectPackage(invalid);
    const readme = result.documents.find((document) => document.fileName === "README.md");
    expect(readme?.content).toContain("[MISSING: app purpose]");
  });
});
