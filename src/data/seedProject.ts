import type { ProjectState } from "../types/project";

export const createSeedProject = (): ProjectState => ({
  intake: {
    appName: "Community Services Portal",
    clientName: "Jordan Lee",
    businessName: "Community Programs",
    appType: "Responsive web application",
    appPurpose: "Give residents one place to discover local programs and submit service requests.",
    problemStatement: "Program information and service requests are spread across disconnected pages, email inboxes, and spreadsheets.",
    targetUsers: "Residents\nProgram coordinators\nDepartment reviewers",
    userRoles: "",
    requiredFeatures: "Program directory\nService request intake\nRequest status tracking\nReviewer work queue",
    workflows: "",
    screens: "",
    dataSources: "",
    dataCollections: "",
    fields: "",
    permissions: "",
    automations: "",
    notifications: "",
    integrations: "",
    reportsDashboards: "",
    brandingNotes: "",
    constraints: "No authentication, paid services, or external AI APIs in the initial scope.",
    risks: "",
    assumptions: "",
    outOfScope: "Payments\nNative mobile applications",
    successCriteria: "Residents can find a relevant program and submit a complete request without staff assistance.\nReviewers can identify the next required action for every request."
  },
  metadata: {
    id: "community-services-portal",
    status: "Intake Started",
    lastUpdated: new Date().toISOString(),
    reviewStatus: "Not reviewed"
  }
});
