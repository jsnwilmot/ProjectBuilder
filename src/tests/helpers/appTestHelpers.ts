import { DOCUMENT_LOCATIONS } from "../../data/folderStructure";
import { createSeedProject } from "../../data/seedProject";
import { createProject } from "../../lib/createProject";
import { saveStorageState } from "../../lib/projectRepository";
import type { ProjectRecord } from "../../types/project";
import { createGeneratedProject } from "./generatedProject";

export function seedApp(projects: ProjectRecord[] = [createSeedProject()], activeProjectId = projects[0]?.identity.id ?? null) {
  saveStorageState({ version: 1, activeProjectId, projects }, window.localStorage);
}

export function createReadyPreviewProject(): ProjectRecord {
  const project = createGeneratedProject(createProject({
    identity: { id: "ready-preview", projectName: "Ready Preview" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "webApplication",
      appPurpose: "Coordinate approved operations requests.",
      problemStatement: "Teams need one governed place to submit, review, and close requests.",
      targetPlatform: "Responsive web application",
      targetUsers: "Requesters\nReviewers\nAdministrators",
      userRoles: "Requester\nReviewer\nAdministrator",
      roleDescriptions: "Requesters submit requests; reviewers approve; administrators manage configuration.",
      rolePermissionsSummary: "Requesters create and view own requests; reviewers update assigned records; administrators manage all records.",
      internalUsers: "Operations staff",
      externalUsers: "None for first release",
      adminUsers: "Operations administrators",
      accessibilityNotes: "Keyboard navigation, visible focus, semantic headings, and sufficient contrast.",
      requiredFeatures: "Request intake\nReview queue\nStatus tracking\nAdmin configuration",
      featurePriority: "Request intake and review queue are launch-critical.",
      featureDescription: "A request workflow web app with role-aware screens.",
      featureOwner: "Operations owner",
      acceptanceNotes: "Users can submit, review, and close requests with correct permissions.",
      workflows: "Submit request\nReview request\nClose request",
      workflowName: "Operations request lifecycle",
      workflowTrigger: "Requester submits a request.",
      workflowSteps: "Submit\nValidate\nReview\nApprove or return\nClose",
      workflowInputs: "Request title\nRequest details\nRequester\nPriority",
      workflowOutputs: "Tracked request\nReview decision\nStatus history",
      workflowRoles: "Requester\nReviewer\nAdministrator",
      workflowDecisionPoints: "Reviewer approves, returns, or closes the request.",
      workflowFailureHandling: "Validation errors are shown inline and failed saves keep user-entered data.",
      workflowOutcome: "A request reaches an approved, returned, or closed state.",
      screens: "Home\nNew request\nReview queue\nRequest detail\nAdmin settings",
      dataSources: "Local application data store",
      dataEntities: "Request\nUser\nStatus history",
      dataCollections: "Requests\nUsers\nStatus history",
      fields: "Request title, request details, requester, priority, status, reviewer, decision notes",
      fieldTypes: "Title: text\nDetails: long text\nPriority: choice\nStatus: choice\nReviewer: user reference",
      requiredDataFields: "Title\nDetails\nPriority\nStatus",
      relationships: "Request has many status history entries; request belongs to requester.",
      dataOwnership: "Operations owns all records.",
      dataRetentionNotes: "Retain records according to approved internal policy.",
      keyFields: "Request ID\nStatus\nRequester",
      permissions: "Role-based access",
      permissionRules: "Requesters view own requests; reviewers view assigned requests; administrators view all records.",
      roleAccessNotes: "Role visibility controls navigation and actions.",
      sensitiveDataNotes: "No secrets or payment details are collected.",
      authenticationExpectation: "Approved organization sign-in.",
      authorizationExpectation: "Application roles enforce least privilege.",
      auditLoggingNeeds: "Track status, reviewer, and decision-note changes.",
      dataProtectionExpectations: "Do not expose personal data beyond role need.",
      complianceNotes: "Internal operational use only.",
      automations: "Notify reviewer when a request is submitted.",
      notifications: "Submission confirmation and reviewer assignment notification.",
      integrations: "Email notification service approved by Architect.",
      reportsDashboards: "Open requests by status and reviewer.",
      brandingNotes: "Use approved internal operations brand.",
      brandStatus: "Approved",
      logoStatus: "Approved",
      logoFiles: "Internal operations logo SVG",
      primaryColors: "#1f4f82",
      secondaryColors: "#f3f6fb",
      fontPreferences: "System UI font stack",
      brandTone: "Professional, plain-language, operational",
      imageStyle: "No decorative imagery required",
      iconStyle: "Simple line icons",
      referenceSites: "Existing internal operations portal",
      brandRestrictions: "Do not introduce unapproved colours or logos.",
      faviconNeeded: "Use approved operations favicon.",
      openGraphImageNeeded: "Not required for internal app.",
      socialAssetsNeeded: "Not required for internal app.",
      contentSource: "Operations owner-approved copy.",
      approvedAssets: "Logo SVG and favicon.",
      accessibilityContrastNotes: "Primary and secondary colours meet WCAG AA contrast.",
      constraints: "Keep scope to request intake, review, and status tracking.",
      risks: "Permission mistakes could expose requests to the wrong role.",
      assumptions: "Organization sign-in and email notification service are available.",
      outOfScope: "Public portal\nPayments\nExternal user accounts",
      successCriteria: "Requests can be submitted, reviewed, closed, and audited."
    }
  }));
  const generatedDocuments = DOCUMENT_LOCATIONS.map((location) => ({
    fileName: location.fileName,
    folder: location.folder,
    content: `# ${location.fileName.replace(".md", "").replace(/_/g, " ")}\n\n**Project:** Ready Preview\n\n**Package readiness:** Ready for Codex\n\nComplete approved content for ${location.fileName}.`
  }));
  return {
    ...project,
    generatedDocuments,
    generatedFileCount: generatedDocuments.length,
    status: "Ready for Codex"
  };
}
