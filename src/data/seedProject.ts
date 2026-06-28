import { createProject } from "../lib/createProject";
import type { ProjectRecord, StorageState } from "../types/project";

export function createSeedProject(): ProjectRecord {
  return createProject({
    identity: {
      id: "community-services-portal",
      projectName: "Community Services Portal"
    },
    client: {
      clientName: "Jordan Lee",
      businessName: "Community Programs"
    },
    intake: {
      appType: "Responsive web application",
      appPurpose: "Give residents one place to discover local programs and submit service requests.",
      problemStatement: "Program information and service requests are spread across disconnected pages, email inboxes, and spreadsheets.",
      targetPlatform: "Desktop and mobile web browsers",
      targetUsers: "Residents\nProgram coordinators\nDepartment reviewers",
      userRoles: "Resident — browse programs and submit requests\nCoordinator — manage program details\nReviewer — assess and update requests",
      roleDescriptions: "Resident handles discovery and request submission.\nCoordinator manages service catalog quality.\nReviewer triages and resolves requests.",
      rolePermissionsSummary: "Residents can submit and track requests.\nCoordinators can update program records.\nReviewers can approve or reject requests.",
      internalUsers: "Program coordinators\nDepartment reviewers",
      externalUsers: "Residents",
      adminUsers: "Platform administrators",
      accessibilityNotes: "Support keyboard navigation and clear contrast for intake and status views.",
      requiredFeatures: "Program directory\nService request intake\nRequest status tracking\nReviewer work queue",
      featurePriority: "Must-have: Program directory, intake, status tracking\nShould-have: Reviewer queue metrics",
      featureDescription: "Program directory allows filtering by eligibility and location.\nIntake form captures request details and attachments.\nStatus tracking shows timeline and next action.",
      featureOwner: "Directory - Coordinator\nRequest intake - Resident\nReview queue - Reviewer",
      acceptanceNotes: "Each required feature must have at least one successful end-to-end path in testing.",
      workflows: "Resident finds a program → submits a request → reviewer assesses it → resident receives a status update",
      workflowName: "Service request workflow",
      workflowTrigger: "Resident submits service request",
      workflowSteps: "Capture request\nRoute to reviewer\nAssess eligibility\nUpdate status",
      workflowInputs: "Resident details\nRequested program\nSupporting notes",
      workflowOutputs: "Request record\nStatus update\nReviewer decision",
      workflowRoles: "Resident\nReviewer\nCoordinator",
      workflowDecisionPoints: "Eligibility complete?\nProgram capacity available?",
      workflowFailureHandling: "Invalid submissions are returned with correction guidance.",
      workflowOutcome: "Request is approved, denied, or returned for additional details.",
      screens: "Program directory\nProgram details\nService request form\nRequest status\nReviewer work queue",
      dataCollections: "Programs\nService requests\nRequest status history",
      dataEntities: "Programs\nService requests\nStatus history",
      fields: "Programs: name, description, eligibility, contact\nService requests: requester, program, details, status, submitted date",
      fieldTypes: "name:string\nstatus:enum\nsubmitted date:datetime",
      requiredDataFields: "Program.name\nService request.requester\nService request.status",
      relationships: "Program has many service requests\nService request has many status history records",
      dataOwnership: "Programs owned by coordinators\nRequests owned by reviewers",
      dataRetentionNotes: "Requests retained for 3 years for audit and service analysis.",
      keyFields: "Programs.id\nServiceRequests.id\nStatusHistory.id",
      permissions: "Residents can create and view their requests.\nCoordinators can manage program content.\nReviewers can view and update assigned requests.",
      permissionRules: "Residents: create/view own records\nReviewers: update assigned requests\nAdmins: full access",
      roleAccessNotes: "Coordinators cannot approve denials; reviewers cannot alter program master data.",
      sensitiveDataNotes: "Contact details and service details are sensitive and must be protected.",
      authenticationExpectation: "No authentication in MVP; add in later phase.",
      authorizationExpectation: "Role-based restrictions still defined for future implementation.",
      auditLoggingNeeds: "Log status changes, reviewer actions, and record updates.",
      dataProtectionExpectations: "Protect sensitive fields and prevent unauthorized exports.",
      complianceNotes: "Follow local records retention and privacy guidance.",
      risks: "Data quality drift in program details and delayed reviewer response times.",
      constraints: "No authentication, paid services, or external AI APIs in the initial scope.",
      automations: "Route requests to reviewer queue based on program category.",
      notifications: "Notify resident when request status changes.",
      integrations: "Optional city CRM export after approval.",
      reportsDashboards: "Weekly request volume and average resolution time dashboard.",
      brandingNotes: "Use existing department color palette and plain language voice.",
      outOfScope: "Payments\nNative mobile applications",
      successCriteria: "Residents can find a relevant program and submit a complete request without staff assistance.\nReviewers can identify the next required action for every request."
    },
    now: "2026-06-28T15:43:00.000Z"
  });
}

function createExampleProject(
  id: string,
  projectName: string,
  clientName: string,
  appPurpose: string,
  updatedAt: string
): ProjectRecord {
  const project = createProject({
    identity: { id, projectName },
    client: { clientName, businessName: "Example organization" },
    intake: {
      appType: "Responsive web application",
      appPurpose,
      problemStatement: "The current workflow relies on disconnected manual tracking.",
      targetUsers: "Staff coordinators",
      requiredFeatures: "Shared work queue\nStatus tracking",
      successCriteria: "Staff can complete the primary workflow from one system."
    },
    now: updatedAt
  });
  return { ...project, updatedAt };
}

/**
 * Demo records are created only for a brand-new empty browser store.
 * After the first save, every dashboard row is a normal persisted project.
 */
export function createDemoStorageState(): StorageState {
  const projects = [
    createSeedProject(),
    createExampleProject(
      "volunteer-management-example",
      "Volunteer Management App",
      "Example client",
      "Coordinate volunteer applications, assignments, and follow-up.",
      "2026-06-27T18:15:00.000Z"
    ),
    createExampleProject(
      "facilities-booking-example",
      "Facilities Booking System",
      "Example client",
      "Manage room availability and booking requests.",
      "2026-06-26T16:30:00.000Z"
    )
  ];
  return {
    version: 1,
    activeProjectId: projects[0].identity.id,
    projects
  };
}
