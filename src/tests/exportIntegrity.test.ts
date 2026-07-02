import { DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import { validateExportPackage } from "../lib/exportIntegrity";
import { createGeneratedProject } from "./helpers/generatedProject";

describe("validateExportPackage", () => {
  it("accepts a complete generated package and reports missing markers as warnings", () => {
    const result = validateExportPackage(
      createGeneratedProject(),
      "2026-06-28T18:00:00.000Z"
    );
    expect(result.isValid).toBe(true);
    expect(result.fileCount).toBe(DOCUMENT_LOCATIONS.length);
    expect(result.expectedFileCount).toBe(DOCUMENT_LOCATIONS.length);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes("missing-information marker"))).toBe(true);
    expect(result.folderMapStatus).toBe("valid");
    expect(result.manifestSummary.readiness).toBe("Ready for Codex");
  });

  it("blocks export before generation", () => {
    const result = validateExportPackage(createSeedProject());
    expect(result.isValid).toBe(false);
    expect(result.fileCount).toBe(0);
    expect(result.errors).toContain("Generate the project package before exporting.");
    expect(result.missingFiles).toHaveLength(DOCUMENT_LOCATIONS.length);
    expect(result.manifestSummary.readiness).toBe("Ready for Codex");
  });

  it("allows a generated draft export and reports Draft readiness", () => {
    const project = createGeneratedProject(createProject({
      identity: { id: "draft", projectName: "Draft Project" }
    }));

    const result = validateExportPackage(project);

    expect(result.isValid).toBe(true);
    expect(result.manifestSummary.readiness).toBe("Draft");
    expect(result.warnings).toContain(
      "Package readiness is Draft because required intake information is still missing."
    );
  });

  it("detects missing and extra core files", () => {
    const project = createGeneratedProject();
    project.generatedDocuments = project.generatedDocuments.slice(1);
    project.generatedDocuments.push({
      fileName: "UNAPPROVED.md",
      folder: "00_Project_Overview",
      content: "# Extra"
    });
    const result = validateExportPackage(project);
    expect(result.isValid).toBe(false);
    expect(result.missingFiles).toContain(DOCUMENT_LOCATIONS[0].fileName);
    expect(result.extraFiles).toContain("UNAPPROVED.md");
  });

  it("detects unsafe paths, duplicate paths, incorrect folder maps, and empty content", () => {
    const project = createGeneratedProject();
    const duplicate = { ...project.generatedDocuments[0] };
    project.generatedDocuments.push(duplicate);
    project.generatedDocuments[1] = {
      ...project.generatedDocuments[1],
      folder: "../02_Architecture"
    };
    project.generatedDocuments[2] = {
      ...project.generatedDocuments[2],
      content: "   "
    };
    const result = validateExportPackage(project);
    expect(result.isValid).toBe(false);
    expect(result.unsafePaths.length).toBeGreaterThan(0);
    expect(result.duplicatePaths).toContain(
      `${duplicate.folder}/${duplicate.fileName}`
    );
    expect(result.folderMapStatus).toBe("invalid");
    expect(result.errors.some((error) => error.includes("empty generated content"))).toBe(true);
  });

  it("sanitizes unsafe or empty project names to a safe ZIP fallback", () => {
    const project = createGeneratedProject();
    project.identity.projectName = " ../Client Project\\2026 ";
    const result = validateExportPackage(project);
    expect(result.manifestSummary.rootFolder).toBe("client-project-2026");
    expect(result.manifestSummary.rootFolder).not.toMatch(/[\\/.]/);
    expect(result.warnings.some((warning) => warning.includes("sanitized"))).toBe(true);

    project.identity.projectName = " .. ";
    expect(validateExportPackage(project).manifestSummary.rootFolder).toBe("untitled-project");
  });
});
