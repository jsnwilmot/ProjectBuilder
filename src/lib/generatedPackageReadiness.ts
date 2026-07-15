import { getClientReviewReadiness } from "./clientReview";
import { countDocumentMissingMarkers } from "./documentReview";
import { expectedDocumentLocations, calculatePowerPlatformReadiness } from "./powerPlatform";
import { validateCanvasTargets } from "./canvasTargetValidation";
import type { GeneratedDocument, ProjectRecord } from "../types/project";

export interface GeneratedPackageReadiness {
  status: "Draft" | "Ready for Codex";
  clientReviewReady: boolean;
  powerPlatformReady: boolean;
  missingMarkerCount: number;
  prohibitedContentCount: number;
  missingDocumentCount: number;
  blankDocumentCount: number;
  duplicateExpectedPathCount: number;
  missingTemplateCount: number;
  blockers: string[];
}

export const PROHIBITED_GENERATED_CONTENT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /document template implementation pending/i, label: "temporary template marker" },
  { pattern: /phase-specific files to create or update/i, label: "generic phase file placeholder" },
  { pattern: /generic placeholder/i, label: "generic placeholder" },
  { pattern: /TODO template/i, label: "TODO template marker" },
  { pattern: /implementation pending/i, label: "implementation pending marker" },
  { pattern: /Target-file generation blocked:/i, label: "target-generation blocker" },
  { pattern: /Resolved\s+for\s+Ready\s+package:/i, label: "synthetic Ready replacement" },
  { pattern: /Resolved:\s+internal\s+name/i, label: "synthetic internal-name replacement" },
  { pattern: /Confirmed\s+by\s+package\s+readiness:/i, label: "synthetic readiness replacement" }
];

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function countProhibitedContent(documents: GeneratedDocument[]): number {
  return documents.reduce((count, document) =>
    count + PROHIBITED_GENERATED_CONTENT_PATTERNS.filter(({ pattern }) => pattern.test(document.content)).length, 0);
}

export function evaluateGeneratedPackageReadiness(
  project: ProjectRecord,
  documents: GeneratedDocument[] = project.generatedDocuments,
  missingTemplateFiles: string[] = []
): GeneratedPackageReadiness {
  const expected = expectedDocumentLocations(project);
  const expectedPaths = expected.map((location) => `${location.folder}/${location.fileName}`);
  const duplicateExpectedPathCount = expectedPaths.length - new Set(expectedPaths).size;
  const actualNames = new Set(documents.map((document) => document.fileName));
  const missingDocumentCount = expected.filter((location) => !actualNames.has(location.fileName)).length;
  const blankDocumentCount = documents.filter((document) => document.content.trim().length === 0).length;
  const missingMarkerCount = documents.reduce((total, document) => total + countDocumentMissingMarkers(document.content), 0);
  const prohibitedContentCount = countProhibitedContent(documents);
  const clientReview = getClientReviewReadiness(project);
  const powerPlatform = calculatePowerPlatformReadiness(project);
  const canvasTargets = validateCanvasTargets(project);

  const blockers = [
    ...clientReview.blockers,
    ...(!clientReview.isReady ? ["Client Review readiness is not complete."] : []),
    ...(!powerPlatform.isReadyForCodex ? [powerPlatform.nextBlockingAction || "Power Platform readiness gates are not complete."] : []),
    ...canvasTargets.blockers,
    ...(missingDocumentCount > 0 ? [`${missingDocumentCount} applicable document(s) are missing.`] : []),
    ...(blankDocumentCount > 0 ? [`${blankDocumentCount} generated document(s) are blank.`] : []),
    ...(missingMarkerCount > 0 ? [`${missingMarkerCount} unresolved missing-information marker(s) remain in generated content.`] : []),
    ...(prohibitedContentCount > 0 ? [`${prohibitedContentCount} prohibited generated-content marker(s) remain.`] : []),
    ...(duplicateExpectedPathCount > 0 ? [`${duplicateExpectedPathCount} duplicate expected document path(s) are registered.`] : []),
    ...(missingTemplateFiles.length > 0 ? [`${missingTemplateFiles.length} applicable document template(s) are missing.`] : [])
  ];

  return {
    status: blockers.length === 0 ? "Ready for Codex" : "Draft",
    clientReviewReady: clientReview.isReady,
    powerPlatformReady: powerPlatform.isReadyForCodex,
    missingMarkerCount,
    prohibitedContentCount,
    missingDocumentCount,
    blankDocumentCount,
    duplicateExpectedPathCount,
    missingTemplateCount: missingTemplateFiles.length,
    blockers: unique(blockers)
  };
}
