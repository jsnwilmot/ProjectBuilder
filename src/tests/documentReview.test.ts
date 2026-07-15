import { DOCUMENT_PURPOSES } from "../data/documentPurposes";
import { createProject } from "../lib/createProject";
import { createDefaultSharePointColumn, createDefaultSharePointList } from "../lib/powerPlatform";
import {
  countDocumentMissingMarkers,
  countPackageMissingMarkers,
  getDocumentReviewItems,
  getDocumentReviewStatus,
  getDocumentStatusSummary
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
      status: "Draft"
    });
    expect(getDocumentReviewStatus(documents[1])).toBe("Ready for Implementation");
    expect(getDocumentReviewStatus(documents[2])).toBe("Review Required");
  });

  it("evaluates mixed document-specific statuses from each document dependency set", () => {
    const project = createProject({ intake: { appType: "powerAppsCanvas" } });
    Object.assign(project.intake, {
      appPurpose: "Track requests.",
      requiredFeatures: "Submit request",
      workflows: "Submit",
      outOfScope: "Payments",
      successCriteria: "Request saved.",
      screens: "Request Form",
      permissionRules: "Staff only",
      acceptanceNotes: "Schema and security reviewed."
    });
    Object.assign(project.powerPlatform!.common, {
      authenticationRequirements: "Organization sign-in",
      authorizationRequirements: "Role-based access",
      recordAccessRules: "Staff only",
      auditRequirements: "Audit changes",
      privacyRequirements: "No secrets",
      securityReviewStatus: "confirmed",
      testingPlanConfirmationStatus: "missingInformation",
      almConfirmationStatus: "missingInformation",
      releaseApprovalResponsibility: "",
      deploymentResponsibility: ""
    });
    Object.assign(project.powerPlatform!.canvas!, {
      primaryDataSourceType: "sharePointList",
      sharePointSiteUrl: "https://contoso.sharepoint.com/sites/ops",
      sharePointLists: "Requests",
      sharePointListDefinitions: "Requests list",
      sharePointColumnDefinitions: "Title / Title",
      schemaStatus: "confirmed",
      internalNameStatus: "confirmed"
    });
    project.powerPlatform!.canvas!.sharePointListSchemas = [
      createDefaultSharePointList({
        id: "requests",
        displayName: "Requests",
        purpose: "Track requests",
        expectedRecordCount: "500",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];
    project.powerPlatform!.canvas!.sharePointColumnSchemas = [
      createDefaultSharePointColumn({
        id: "title",
        parentType: "list",
        parentId: "requests",
        displayName: "Title",
        internalName: "Title",
        columnType: "Text",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];
    project.generatedDocuments = [
      { fileName: "SHAREPOINT_SCHEMA.md", folder: "03_Data_Model", content: "# SharePoint Schema\n\nComplete." },
      { fileName: "SECURITY_MODEL.md", folder: "06_Security", content: "# Security Model\n\nComplete." },
      { fileName: "TEST_PLAN.md", folder: "08_Testing", content: "# Test Plan\n\nComplete." },
      { fileName: "ALM_DEPLOYMENT_PLAN.md", folder: "09_Deployment", content: "# ALM Deployment Plan\n\nComplete." }
    ];

    const summary = getDocumentStatusSummary(project);

    expect(summary.readyDocuments).toBeGreaterThanOrEqual(2);
    expect(getDocumentReviewStatus(project.generatedDocuments[0], project)).toBe("Ready for Implementation");
    expect(getDocumentReviewStatus(project.generatedDocuments[1], project)).toBe("Ready for Implementation");
    expect(["Draft", "Review Required"]).toContain(getDocumentReviewStatus(project.generatedDocuments[2], project));
    expect(["Draft", "Review Required"]).toContain(getDocumentReviewStatus(project.generatedDocuments[3], project));
  });
});
