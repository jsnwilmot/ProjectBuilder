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
      targetUsers: "Residents\nProgram coordinators\nDepartment reviewers",
      userRoles: "Resident — browse programs and submit requests\nCoordinator — manage program details\nReviewer — assess and update requests",
      requiredFeatures: "Program directory\nService request intake\nRequest status tracking\nReviewer work queue",
      workflows: "Resident finds a program → submits a request → reviewer assesses it → resident receives a status update",
      screens: "Program directory\nProgram details\nService request form\nRequest status\nReviewer work queue",
      dataCollections: "Programs\nService requests\nRequest status history",
      fields: "Programs: name, description, eligibility, contact\nService requests: requester, program, details, status, submitted date",
      permissions: "Residents can create and view their requests.\nCoordinators can manage program content.\nReviewers can view and update assigned requests.",
      constraints: "No authentication, paid services, or external AI APIs in the initial scope.",
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
