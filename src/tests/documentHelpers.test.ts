import {
  formatDate,
  listOrMissing,
  markdownList,
  markdownTable,
  missingMarker,
  normalizeFileName,
  safeText,
  sanitizeProjectFolderName,
  sectionOrMissing
} from "../lib/documentHelpers";

describe("documentHelpers", () => {
  it("uses the exact missing marker format", () => {
    expect(missingMarker("describe required information")).toBe("[MISSING: describe required information]");
  });

  it("returns safe text and list fallbacks", () => {
    expect(safeText("", "app purpose")).toBe("[MISSING: app purpose]");
    expect(listOrMissing("", "target users")).toBe("- [MISSING: target users]");
    expect(sectionOrMissing("Purpose", "", "app purpose")).toContain("[MISSING: app purpose]");
  });

  it("builds markdown list and table output", () => {
    expect(markdownList(["a", "b"])).toBe("- a\n- b");
    expect(markdownTable(["A", "B"], [["1", "2"]])).toContain("| A | B |");
  });

  it("sanitizes folder and file names for export safety", () => {
    expect(sanitizeProjectFolderName("../Unsafe Project")).toBe("unsafe-project");
    expect(normalizeFileName("../../my file.md")).toBe("my-file.md");
  });

  it("formats ISO date output", () => {
    expect(formatDate("2026-06-28T10:00:00.000Z")).toBe("2026-06-28");
  });
});
