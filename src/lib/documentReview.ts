import { DOCUMENT_PURPOSES } from "../data/documentPurposes";
import type { GeneratedDocument } from "../types/project";

export type DocumentReviewStatus = "Ready" | "Needs Info" | "Review Recommended";

export interface DocumentReviewItem extends GeneratedDocument {
  purpose: string;
  missingMarkerCount: number;
  status: DocumentReviewStatus;
}

const missingMarkerPrefixPattern = /\[MISSING:/g;
const reviewRecommendedFiles = new Set([
  "PROJECT_SCOPE.md",
  "CLIENT_REQUIREMENTS.md",
  "ARCHITECT_INSTRUCTIONS.md",
  "APP_BLUEPRINT.md",
  "ACCEPTANCE_CRITERIA.md",
  "CODEX_INSTRUCTIONS.md",
  "PHASED_CODEX_PROMPTS.md"
]);

export function countDocumentMissingMarkers(content: string): number {
  return content.match(missingMarkerPrefixPattern)?.length ?? 0;
}

export function getDocumentReviewStatus(
  document: Pick<GeneratedDocument, "fileName" | "content">
): DocumentReviewStatus {
  if (countDocumentMissingMarkers(document.content) > 0) return "Needs Info";
  if (reviewRecommendedFiles.has(document.fileName)) return "Review Recommended";
  return "Ready";
}

export function getDocumentReviewItems(documents: GeneratedDocument[]): DocumentReviewItem[] {
  return documents.map((document) => ({
    ...document,
    purpose: DOCUMENT_PURPOSES[document.fileName] ?? "Generated project documentation for review.",
    missingMarkerCount: countDocumentMissingMarkers(document.content),
    status: getDocumentReviewStatus(document)
  }));
}

export function countPackageMissingMarkers(documents: GeneratedDocument[]): number {
  return documents.reduce(
    (total, document) => total + countDocumentMissingMarkers(document.content),
    0
  );
}
