import { createSeedProject } from "../../data/seedProject";
import { createProject } from "../../lib/createProject";
import { generateProjectPackage } from "../../lib/generateProjectPackage";
import { deriveReviewItems } from "../../lib/clientReview";
import type { ProjectRecord } from "../../types/project";

export function createGeneratedProject(project = createSeedProject()): ProjectRecord {
  const reviewedProject: ProjectRecord = {
    ...project,
    reviewItems: deriveReviewItems(project).map((item) => ({
      ...item,
      status: "Answered"
    })),
    readinessConfirmations: {
      ...project.readinessConfirmations,
      scopeReviewed: true,
      acceptanceCriteriaReviewed: true,
      draftPackageReviewed: true
    }
  };
  const generated = generateProjectPackage(reviewedProject);
  return {
    ...reviewedProject,
    generatedDocuments: generated.documents,
    generatedFileCount: generated.documents.length,
    packageGeneratedAt: "2026-06-28T18:00:00.000Z",
    status: "Project Package Generated"
  };
}

export function createDraftGeneratedProject(project: ProjectRecord): ProjectRecord {
  const generated = generateProjectPackage(project);
  return {
    ...project,
    generatedDocuments: generated.documents,
    generatedFileCount: generated.documents.length,
    packageGeneratedAt: "2026-06-28T18:00:00.000Z",
    status: "Project Package Generated"
  };
}

export function createLargeGeneratedProject(): ProjectRecord {
  const repeated = (label: string, count: number) =>
    Array.from({ length: count }, (_, index) => `${label} ${index + 1} — detail / ${index + 1}`).join("\n");
  const project = createProject({
    identity: {
      id: "large-export-project",
      projectName: "  ../Regional Services: Planning & Delivery — 2026/27  "
    },
    client: {
      clientName: "Regional Programs",
      businessName: "Service Design & Operations"
    },
    intake: {
      appType: "webApplication",
      appPurpose: "Coordinate a large regional service program safely.",
      problemStatement: "Teams need one deterministic package for complex delivery planning.",
      targetPlatform: "Desktop and mobile web",
      targetUsers: repeated("User group", 30),
      userRoles: repeated("Role", 24),
      requiredFeatures: repeated("Feature", 80),
      featureDescription: repeated("Feature description", 80),
      workflows: repeated("Workflow", 60),
      workflowSteps: repeated("Workflow step", 120),
      screens: repeated("Screen", 70),
      dataEntities: repeated("Entity", 75),
      dataCollections: repeated("Collection", 75),
      fields: repeated("Field", 250),
      permissions: repeated("Permission rule", 60),
      successCriteria: repeated("Success criterion", 40),
      assumptions: "[MISSING: assumptions]"
    }
  });
  return createGeneratedProject(project);
}
