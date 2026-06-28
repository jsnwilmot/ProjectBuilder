import type { IntakeStep } from "../types/project";

export const intakeSteps: IntakeStep[] = [
  {
    id: "foundation",
    label: "Foundation",
    title: "Set the project foundation",
    description: "Name the project and define the outcome before designing the solution.",
    fields: [
      { name: "appName", label: "App name", description: "A clear working name for the project.", placeholder: "Community Services Portal", required: true },
      { name: "clientName", label: "Client name", description: "The person accountable for the project.", placeholder: "Client or sponsor name", required: true },
      { name: "businessName", label: "Business or department", description: "The organization this project serves.", placeholder: "Community Programs" },
      { name: "appType", label: "App type", description: "The broad product category.", placeholder: "Internal web application" },
      { name: "appPurpose", label: "App purpose", description: "What this app must help people accomplish.", placeholder: "Describe the intended outcome", multiline: true, required: true },
      { name: "problemStatement", label: "Problem being solved", description: "Describe the current problem in plain language.", placeholder: "What is difficult, slow, or unreliable today?", multiline: true, required: true }
    ]
  },
  {
    id: "users",
    label: "Users",
    title: "Define users and roles",
    description: "Clarify who uses the system and what each role is permitted to do.",
    fields: [
      { name: "targetUsers", label: "Target users", description: "List the people who need the app.", placeholder: "One user group per line", multiline: true, required: true },
      { name: "userRoles", label: "User roles", description: "List roles and their main responsibilities.", placeholder: "Role — responsibilities", multiline: true, required: true },
      { name: "permissions", label: "Permissions", description: "State who can view, create, edit, approve, or delete.", placeholder: "Role — allowed actions", multiline: true, required: true }
    ]
  },
  {
    id: "features",
    label: "Features",
    title: "Shape the product experience",
    description: "Capture the capabilities, screens, reporting, and visual direction.",
    fields: [
      { name: "requiredFeatures", label: "Required features", description: "List only capabilities needed for the approved outcome.", placeholder: "One required feature per line", multiline: true, required: true },
      { name: "screens", label: "Screens", description: "List the expected pages, views, or panels.", placeholder: "Screen — purpose", multiline: true, required: true },
      { name: "reportsDashboards", label: "Reports or dashboards", description: "Describe decisions the reporting must support.", placeholder: "Report — audience — decision", multiline: true },
      { name: "brandingNotes", label: "Branding notes", description: "Record visual, voice, and accessibility requirements.", placeholder: "Colors, tone, existing brand guidance", multiline: true }
    ]
  },
  {
    id: "data",
    label: "Data",
    title: "Describe the information model",
    description: "Identify where information comes from and how it must be structured.",
    fields: [
      { name: "dataSources", label: "Data sources", description: "List approved sources of project data.", placeholder: "Source — owner — format", multiline: true },
      { name: "dataCollections", label: "Tables, lists, or collections", description: "Name the records the app must store or manage.", placeholder: "Collection — purpose", multiline: true, required: true },
      { name: "fields", label: "Fields", description: "List important fields for each collection.", placeholder: "Collection.field — type — rules", multiline: true, required: true },
      { name: "integrations", label: "Integrations", description: "List approved systems that exchange data with this app.", placeholder: "System — data exchanged — direction", multiline: true }
    ]
  },
  {
    id: "workflows",
    label: "Workflows",
    title: "Map the work",
    description: "Describe the steps, handoffs, automations, and notifications.",
    fields: [
      { name: "workflows", label: "Workflows", description: "List each workflow from trigger to outcome.", placeholder: "Trigger → steps → outcome", multiline: true, required: true },
      { name: "automations", label: "Automations", description: "List approved actions that happen without manual input.", placeholder: "Trigger — automated action", multiline: true },
      { name: "notifications", label: "Notifications", description: "State who is notified, when, and by which approved channel.", placeholder: "Trigger — recipient — message — channel", multiline: true }
    ]
  },
  {
    id: "security",
    label: "Security",
    title: "Set boundaries and safeguards",
    description: "Make risks, constraints, assumptions, and exclusions explicit.",
    fields: [
      { name: "constraints", label: "Constraints", description: "Record technical, policy, budget, or timeline limits.", placeholder: "Constraint — impact", multiline: true },
      { name: "risks", label: "Risks", description: "List realistic risks and possible mitigations.", placeholder: "Risk — impact — mitigation", multiline: true },
      { name: "assumptions", label: "Assumptions", description: "Record beliefs that require validation.", placeholder: "Assumption — validation owner", multiline: true },
      { name: "outOfScope", label: "Out-of-scope items", description: "State what this project will not deliver.", placeholder: "Excluded item — reason", multiline: true }
    ]
  },
  {
    id: "review",
    label: "Review",
    title: "Define success",
    description: "Write observable outcomes that a reviewer can verify.",
    fields: [
      { name: "successCriteria", label: "Success criteria", description: "List measurable or observable completion conditions.", placeholder: "Given / when / then, or a measurable result", multiline: true, required: true }
    ]
  },
  {
    id: "generate",
    label: "Generate",
    title: "Generate the handoff package",
    description: "Review missing information before creating the structured package.",
    fields: []
  }
];
