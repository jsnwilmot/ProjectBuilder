import { createExportManifest } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { getClientReviewReadiness } from "../lib/clientReview";
import type { ProjectRecord } from "../types/project";
import { createNegativeCapabilityWebsite, withWebsiteReviews } from "./helpers/businessWebsite";

const generatedAt = "2026-09-08T13:21:00.000Z";

function withGeneratedDocuments(project: ProjectRecord): ProjectRecord {
  const generated = generateProjectPackage(project);
  return {
    ...project,
    generatedDocuments: generated.documents,
    generatedFileCount: generated.documents.length,
    packageGeneratedAt: generatedAt
  };
}

function readyWebsite(): ProjectRecord {
  return withGeneratedDocuments(withWebsiteReviews());
}

function roseLikeDraft(): ProjectRecord {
  const project = createNegativeCapabilityWebsite();
  project.intake.assumptions = "Confirmed static Version 1 direction. Contact details remain TBD by the Project Owner before implementation.";
  project.intake.workflowDecisionPoints = "Visitors choose a division. Contact details remain TBD by the Project Owner before implementation.";
  project.intake.websiteForms = "Contact section planned. Contact method and business contact details TBD by Project Owner before implementation.";
  project.intake.websiteContactMethod = "Primary action: explore divisions. Contact method and actual contact data remain owner decisions; do not fabricate.";
  return withGeneratedDocuments(project);
}

function withManualBlockers(count: 0 | 1 | 3): ProjectRecord {
  const project = readyWebsite();
  project.readinessConfirmations = {
    scopeReviewed: count === 0,
    acceptanceCriteriaReviewed: count < 3,
    draftPackageReviewed: count < 3
  };
  return project;
}

describe("readiness blocker count consistency", () => {
  it("keeps the Rose-like Client Review, generated readiness, Export, and manifest counts at eight", () => {
    const project = roseLikeDraft();
    const clientReview = getClientReviewReadiness(project);
    const generatedReadiness = evaluateGeneratedPackageReadiness(project);
    const integrity = validateExportPackage(project, generatedAt);
    const manifest = createExportManifest(project, integrity);

    expect(clientReview.blockers).toEqual([
      "Foundation: Assumptions",
      "Workflows: Decision points",
      "Content: Website forms",
      "Confirm the project scope has been reviewed.",
      "Resolve each blocking missing-information review item.",
      "Confirm the acceptance criteria are testable and approved.",
      "Resolve client questions, or mark them not applicable with a reason.",
      "Generate and review a Draft package before final readiness."
    ]);
    expect(clientReview.blockerCount).toBe(8);
    expect(generatedReadiness.contentBlockers).toEqual([]);
    expect(generatedReadiness.blockers).toEqual(clientReview.blockers);
    expect(generatedReadiness.status).toBe("Draft");
    expect(integrity.warnings).toContain("Package readiness is Draft because 8 readiness blocker(s) remain.");
    expect(manifest.exportWarnings).toContain("Package readiness is Draft because 8 readiness blocker(s) remain.");
  });

  it("keeps one actionable Client Review blocker without adding an umbrella blocker", () => {
    const project = withManualBlockers(1);
    const clientReview = getClientReviewReadiness(project);
    const generatedReadiness = evaluateGeneratedPackageReadiness(project);

    expect(clientReview.blockerCount).toBe(1);
    expect(generatedReadiness.blockers).toEqual(clientReview.blockers);
    expect(generatedReadiness.status).toBe("Draft");
  });

  it("uses the actionable Rose-like blocker count in the Export warning", () => {
    const integrity = validateExportPackage(roseLikeDraft(), generatedAt);

    expect(integrity.warnings).toContain("Package readiness is Draft because 8 readiness blocker(s) remain.");
    expect(integrity.warnings).not.toContain("Package readiness is Draft because 9 readiness blocker(s) remain.");
  });

  it("passes the corrected Export warning through to the manifest", () => {
    const project = roseLikeDraft();
    const manifest = createExportManifest(project, validateExportPackage(project, generatedAt));

    expect(manifest.exportWarnings).toContain("Package readiness is Draft because 8 readiness blocker(s) remain.");
    expect(manifest.exportWarnings).not.toContain("Package readiness is Draft because 9 readiness blocker(s) remain.");
  });

  it("is Ready for Codex only when Client Review is ready and content has no blockers", () => {
    const project = withManualBlockers(0);
    const generatedReadiness = evaluateGeneratedPackageReadiness(project);

    expect(getClientReviewReadiness(project).isReady).toBe(true);
    expect(generatedReadiness.blockers).toEqual([]);
    expect(generatedReadiness.status).toBe("Ready for Codex");
  });

  it("stays Draft with one content blocker and no Client Review blockers", () => {
    const project = withManualBlockers(0);
    const generatedReadiness = evaluateGeneratedPackageReadiness(project, project.generatedDocuments, ["MISSING_TEMPLATE.md"]);

    expect(getClientReviewReadiness(project).blockers).toEqual([]);
    expect(generatedReadiness.contentBlockers).toEqual(["1 applicable document template(s) are missing."]);
    expect(generatedReadiness.blockers).toEqual(generatedReadiness.contentBlockers);
    expect(generatedReadiness.status).toBe("Draft");
  });

  it("uses the unique actionable union for three Client Review and two content blockers", () => {
    const project = withManualBlockers(3);
    const documents = project.generatedDocuments.slice(0, -1);
    const clientReview = getClientReviewReadiness(project);
    const generatedReadiness = evaluateGeneratedPackageReadiness(project, documents, ["MISSING_TEMPLATE.md"]);

    expect(clientReview.blockerCount).toBe(3);
    expect(generatedReadiness.contentBlockers).toHaveLength(2);
    expect(generatedReadiness.blockers).toEqual([...clientReview.blockers, ...generatedReadiness.contentBlockers]);
    expect(generatedReadiness.blockers).toHaveLength(5);
    expect(new Set(generatedReadiness.blockers).size).toBe(5);
    expect(generatedReadiness.blockers).not.toContain("Client Review readiness is not complete.");
    expect(generatedReadiness.status).toBe("Draft");
  });
});
