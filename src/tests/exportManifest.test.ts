import { createExportManifest, renderExportManifestMarkdown } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { createGeneratedProject } from "./helpers/generatedProject";

describe("export manifest", () => {
  it("creates a stable diagnostic object and Markdown file", () => {
    const project = createGeneratedProject();
    const integrity = validateExportPackage(project, "2026-06-28T18:00:00.000Z");
    const manifest = createExportManifest(project, integrity);
    const markdown = renderExportManifestMarkdown(manifest);

    expect(manifest.packageSchemaVersion).toBe(1);
    expect(manifest.activeProjectId).toBe(project.identity.id);
    expect(manifest.generatedDocumentCount).toBe(16);
    expect(manifest.expectedDocumentCount).toBe(16);
    expect(manifest.files).toHaveLength(16);
    expect(manifest.files[0]).toEqual({
      fileName: "README.md",
      folder: "00_Project_Overview",
      path: "00_Project_Overview/README.md"
    });
    expect(markdown).toContain("# Export Manifest");
    expect(markdown).toContain("| Exported date | 2026-06-28T18:00:00.000Z |");
    expect(markdown).toContain("00_Project_Overview/EXPORT_MANIFEST.md");
  });
});
