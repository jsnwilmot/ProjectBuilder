import { DOCUMENT_PURPOSES } from "../data/documentPurposes";
import {
  countDocumentMissingMarkers,
  countPackageMissingMarkers,
  getDocumentReviewItems,
  getDocumentReviewStatus
} from "../lib/documentReview";
import type { GeneratedDocument } from "../types/project";

describe("document review metadata", () => {
  const documents: GeneratedDocument[] = [
    {
      fileName: "PROJECT_SCOPE.md",
      folder: "00_Project_Overview",
      content: "# Scope\n\n[MISSING: approved boundary]\n\n[MISSING: success criteria]"
    },
    {
      fileName: "README.md",
      folder: "00_Project_Overview",
      content: "# Project package"
    },
    {
      fileName: "ARCHITECT_INSTRUCTIONS.md",
      folder: "02_Architecture",
      content: "# Architect Instructions"
    }
  ];

  it("counts missing markers per document and across the package", () => {
    expect(countDocumentMissingMarkers(documents[0].content)).toBe(2);
    expect(countDocumentMissingMarkers(documents[1].content)).toBe(0);
    expect(countPackageMissingMarkers(documents)).toBe(2);
  });

  it("assigns purpose labels and review statuses", () => {
    const reviewItems = getDocumentReviewItems(documents);

    expect(reviewItems[0]).toMatchObject({
      purpose: DOCUMENT_PURPOSES["PROJECT_SCOPE.md"],
      missingMarkerCount: 2,
      status: "Needs Info"
    });
    expect(getDocumentReviewStatus(documents[1])).toBe("Ready");
    expect(getDocumentReviewStatus(documents[2])).toBe("Review Recommended");
  });
});
