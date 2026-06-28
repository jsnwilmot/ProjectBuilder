import { createSeedProject } from "../../data/seedProject";
import { createProject } from "../../lib/createProject";
import { generateProjectPackage } from "../../lib/generateProjectPackage";
import type { ProjectRecord } from "../../types/project";

export function createGeneratedProject(project = createSeedProject()): ProjectRecord {
  const generated = generateProjectPackage(project);
  return {
    ...project,
    generatedDocuments: generated.documents,
    generatedFileCount: generated.documents.length,
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
      appType: "Responsive operations platform",
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
      assumptions: "[MISSING: final regional policy approval]"
    }
  });
  return createGeneratedProject(project);
}
