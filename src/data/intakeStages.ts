import type { IntakeStageDefinition } from "../types/project";

export const INTAKE_STAGES: IntakeStageDefinition[] = [
  {
    id: "foundation",
    label: "Foundation",
    title: "Set the project foundation",
    description: "Define project identity, purpose, success outcomes, and known constraints.",
    requiredFields: ["appName", "clientName", "appPurpose", "problemStatement", "successCriteria"],
    optionalFields: ["businessName", "appType", "targetPlatform", "constraints", "outOfScope"],
    completionRules: [
      "App name, client name, app purpose, problem statement, and success criteria must be provided."
    ],
    nextActionLabel: "Continue to users",
    fields: [
      { name: "appName", label: "App name", description: "A clear working name for the project.", placeholder: "Community Services Portal", required: true },
      { name: "clientName", label: "Client name", description: "The person accountable for the project.", placeholder: "Client or sponsor name", required: true },
      { name: "businessName", label: "Business or department", description: "The organization this project serves.", placeholder: "Community Programs" },
      { name: "appType", label: "App type", description: "The broad product category.", placeholder: "Internal web application" },
      { name: "targetPlatform", label: "Target platform", description: "Where this product is expected to run.", placeholder: "Web browser, tablet kiosk, mobile web" },
      { name: "appPurpose", label: "App purpose", description: "What this app must help people accomplish.", placeholder: "Describe the intended outcome", multiline: true, required: true },
      { name: "problemStatement", label: "Problem being solved", description: "Describe the current problem in plain language.", placeholder: "What is difficult, slow, or unreliable today?", multiline: true, required: true },
      { name: "constraints", label: "Constraints", description: "Record technical, policy, budget, or timeline limits.", placeholder: "Constraint - impact", multiline: true },
      { name: "outOfScope", label: "Out-of-scope items", description: "State what this project will not deliver.", placeholder: "Excluded item - reason", multiline: true },
      { name: "successCriteria", label: "Success criteria", description: "List measurable or observable completion conditions.", placeholder: "Given/When/Then or measurable outcomes", multiline: true, required: true }
    ]
  },
  {
    id: "users",
    label: "Users",
    title: "Define users and roles",
    description: "Capture target users, role definitions, access expectations, and accessibility considerations.",
    requiredFields: ["targetUsers", "userRoles", "rolePermissionsSummary"],
    optionalFields: ["roleDescriptions", "internalUsers", "externalUsers", "adminUsers", "accessibilityNotes"],
    completionRules: [
      "At least one target user and one user role must be listed.",
      "Permissions summary or role access notes must be provided."
    ],
    nextActionLabel: "Continue to features",
    fields: [
      { name: "targetUsers", label: "Target users", description: "List the people who need the app.", placeholder: "One user group per line", multiline: true, required: true },
      { name: "userRoles", label: "User roles", description: "List roles and their main responsibilities.", placeholder: "Role - responsibilities", multiline: true, required: true },
      { name: "roleDescriptions", label: "Role descriptions", description: "Describe role-specific expectations and constraints.", placeholder: "Role - detailed responsibilities", multiline: true },
      { name: "rolePermissionsSummary", label: "Role permissions summary", description: "Summarize what each role can do.", placeholder: "Role - view/create/edit/approve/delete", multiline: true, required: true },
      { name: "internalUsers", label: "Internal users", description: "List internal teams or departments using the app.", placeholder: "Internal audience by team", multiline: true },
      { name: "externalUsers", label: "External users", description: "List external customers, partners, or citizens.", placeholder: "External audience by type", multiline: true },
      { name: "adminUsers", label: "Admin users", description: "List who manages administration and configuration.", placeholder: "Admin role owners", multiline: true },
      { name: "accessibilityNotes", label: "Accessibility considerations", description: "Record accessibility requirements and accommodations.", placeholder: "WCAG expectations, assistive technology needs", multiline: true }
    ]
  },
  {
    id: "features",
    label: "Features",
    title: "Shape the product experience",
    description: "Capture required features, priorities, ownership, and acceptance notes.",
    requiredFields: ["requiredFeatures", "featureDescription", "acceptanceNotes"],
    optionalFields: ["featurePriority", "featureOwner", "automations", "reportsDashboards", "screens", "brandingNotes"],
    completionRules: [
      "At least one required feature must be listed.",
      "Each required feature should include a name and description.",
      "Acceptance notes must exist."
    ],
    nextActionLabel: "Continue to data",
    fields: [
      { name: "requiredFeatures", label: "Required features", description: "List approved capabilities for the initial scope.", placeholder: "Feature name - summary", multiline: true, required: true },
      { name: "featurePriority", label: "Feature priority", description: "Capture priority tiers or release order.", placeholder: "Must-have / Should-have / Could-have", multiline: true },
      { name: "featureDescription", label: "Feature description", description: "Describe behavior expected for each feature.", placeholder: "Feature - expected behavior", multiline: true, required: true },
      { name: "featureOwner", label: "Feature owner or user role", description: "Identify who owns or approves each feature.", placeholder: "Feature - role owner", multiline: true },
      { name: "acceptanceNotes", label: "Acceptance notes", description: "Define how feature success is verified.", placeholder: "Feature - acceptance notes", multiline: true, required: true },
      { name: "automations", label: "Automations", description: "List approved actions that happen without manual input.", placeholder: "Trigger - automated action", multiline: true },
      { name: "reportsDashboards", label: "Reports or dashboards", description: "Describe reporting requirements.", placeholder: "Report - audience - decision", multiline: true },
      { name: "screens", label: "Screens", description: "List expected pages, views, or panels.", placeholder: "Screen - purpose", multiline: true },
      { name: "brandingNotes", label: "Branding notes", description: "Record visual and voice requirements.", placeholder: "Brand guidance and content tone", multiline: true }
    ]
  },
  {
    id: "data",
    label: "Data",
    title: "Describe the information model",
    description: "Define entities, fields, relationships, ownership, retention, and integrations.",
    requiredFields: ["dataCollections", "fields", "keyFields"],
    optionalFields: ["dataSources", "dataEntities", "fieldTypes", "requiredDataFields", "relationships", "dataOwnership", "dataRetentionNotes", "integrations"],
    completionRules: [
      "At least one data entity must be listed.",
      "Each entity should include at least one field.",
      "Key fields should be identified where known."
    ],
    nextActionLabel: "Continue to workflows",
    fields: [
      { name: "dataSources", label: "Data sources", description: "List approved sources of project data.", placeholder: "Source - owner - format", multiline: true },
      { name: "dataEntities", label: "Data entities", description: "List key entities for the project.", placeholder: "Entity - purpose", multiline: true },
      { name: "dataCollections", label: "Tables, lists, or collections", description: "Name records the app must store or manage.", placeholder: "Collection - purpose", multiline: true, required: true },
      { name: "fields", label: "Fields", description: "List important fields for each collection.", placeholder: "Collection.field - rule", multiline: true, required: true },
      { name: "fieldTypes", label: "Field types", description: "Capture expected data types and constraints.", placeholder: "Field - type - validation", multiline: true },
      { name: "requiredDataFields", label: "Required fields", description: "List fields that must be present for valid records.", placeholder: "Entity - required fields", multiline: true },
      { name: "relationships", label: "Relationships", description: "Describe how entities relate.", placeholder: "Entity A -> Entity B (one-to-many)", multiline: true },
      { name: "dataOwnership", label: "Data ownership", description: "Identify data stewards and ownership boundaries.", placeholder: "Entity - owner", multiline: true },
      { name: "dataRetentionNotes", label: "Data retention notes", description: "Capture retention and archival expectations.", placeholder: "Entity - retention policy", multiline: true },
      { name: "keyFields", label: "Key fields", description: "Identify key fields for lookups and uniqueness.", placeholder: "Entity - key fields", multiline: true, required: true },
      { name: "integrations", label: "Integrations", description: "List approved systems exchanging data with this app.", placeholder: "System - data exchanged", multiline: true }
    ]
  },
  {
    id: "workflows",
    label: "Workflows",
    title: "Map the work",
    description: "Define trigger, steps, inputs, outputs, decision points, and exception handling.",
    requiredFields: ["workflows", "workflowTrigger", "workflowSteps", "workflowOutcome"],
    optionalFields: ["workflowName", "workflowInputs", "workflowOutputs", "workflowRoles", "workflowDecisionPoints", "notifications", "workflowFailureHandling"],
    completionRules: [
      "At least one workflow must be defined.",
      "Each workflow must include a trigger, steps, and expected outcome."
    ],
    nextActionLabel: "Continue to security",
    fields: [
      { name: "workflows", label: "Workflows", description: "List each workflow from trigger to outcome.", placeholder: "Trigger -> steps -> outcome", multiline: true, required: true },
      { name: "workflowName", label: "Workflow name", description: "Name each workflow clearly.", placeholder: "Workflow name per line", multiline: true },
      { name: "workflowTrigger", label: "Trigger", description: "Describe what starts each workflow.", placeholder: "Event or condition that starts the flow", multiline: true, required: true },
      { name: "workflowSteps", label: "Steps", description: "Describe key steps in order.", placeholder: "1. Step one\n2. Step two", multiline: true, required: true },
      { name: "workflowInputs", label: "Inputs", description: "List required workflow inputs.", placeholder: "Input data per workflow", multiline: true },
      { name: "workflowOutputs", label: "Outputs", description: "List expected workflow outputs.", placeholder: "Output/result per workflow", multiline: true },
      { name: "workflowRoles", label: "User roles involved", description: "Identify which roles participate in each workflow.", placeholder: "Workflow - involved roles", multiline: true },
      { name: "workflowDecisionPoints", label: "Decision points", description: "Describe decision branches or approvals.", placeholder: "Decision - criteria - path", multiline: true },
      { name: "notifications", label: "Notifications", description: "State who is notified and when.", placeholder: "Trigger - recipient - channel", multiline: true },
      { name: "workflowFailureHandling", label: "Failure or exception handling", description: "Describe what happens when workflow steps fail.", placeholder: "Failure case - handling strategy", multiline: true },
      { name: "workflowOutcome", label: "Expected outcome", description: "Describe expected workflow completion state.", placeholder: "Outcome for each workflow", multiline: true, required: true }
    ]
  },
  {
    id: "security",
    label: "Security",
    title: "Set boundaries and safeguards",
    description: "Capture permission rules, sensitive data expectations, and risk posture.",
    requiredFields: ["sensitiveDataNotes", "risks"],
    optionalFields: ["permissionRules", "roleAccessNotes", "permissions", "authenticationExpectation", "authorizationExpectation", "auditLoggingNeeds", "dataProtectionExpectations", "complianceNotes", "assumptions"],
    completionRules: [
      "Permission rules or role access notes must be provided.",
      "Sensitive data handling answer must be provided.",
      "Security risks must be listed or explicitly marked as no known risks."
    ],
    nextActionLabel: "Continue to review",
    fields: [
      { name: "permissionRules", label: "Permission rules", description: "Define permission model expectations.", placeholder: "Role - allowed actions", multiline: true },
      { name: "roleAccessNotes", label: "Role-based access notes", description: "Capture access boundaries and exceptions.", placeholder: "Role - access notes", multiline: true },
      { name: "permissions", label: "Permission summary", description: "Summarize baseline access policies.", placeholder: "Summary of permission boundaries", multiline: true },
      { name: "sensitiveDataNotes", label: "Sensitive data notes", description: "Identify sensitive data and handling expectations.", placeholder: "Sensitive fields and protections", multiline: true, required: true },
      { name: "authenticationExpectation", label: "Authentication expectation", description: "Describe authentication expectation for this phase.", placeholder: "Authentication approach or explicit none", multiline: true },
      { name: "authorizationExpectation", label: "Authorization expectation", description: "Describe authorization model expectations.", placeholder: "Authorization model", multiline: true },
      { name: "auditLoggingNeeds", label: "Audit or logging needs", description: "Capture required auditability and logging.", placeholder: "Events to log and retention", multiline: true },
      { name: "dataProtectionExpectations", label: "Data protection expectations", description: "Describe protection requirements for data at rest/in transit.", placeholder: "Encryption, masking, data handling", multiline: true },
      { name: "complianceNotes", label: "Compliance notes", description: "List compliance requirements and standards.", placeholder: "Compliance requirement - impact", multiline: true },
      { name: "risks", label: "Risks", description: "List realistic risks and possible mitigations.", placeholder: "Risk - impact - mitigation", multiline: true, required: true },
      { name: "assumptions", label: "Assumptions", description: "Record beliefs that require validation.", placeholder: "Assumption - validation owner", multiline: true }
    ]
  },
  {
    id: "review",
    label: "Review",
    title: "Review project readiness",
    description: "Review captured information, missing requirements, and warnings before generation.",
    requiredFields: [],
    optionalFields: [],
    completionRules: [
      "Review summarizes project identity, scope, and missing required information before generation."
    ],
    nextActionLabel: "Continue to generate",
    fields: []
  },
  {
    id: "generate",
    label: "Generate",
    title: "Generate the handoff package",
    description: "Review readiness, then generate and save the project package to the active project.",
    requiredFields: [],
    optionalFields: [],
    completionRules: [
      "Generation can run with missing fields; missing values are marked in generated documents."
    ],
    nextActionLabel: "Generate package",
    fields: []
  }
];

export const REVIEW_STAGE_ID = "review";
export const GENERATE_STAGE_ID = "generate";

export const REVIEW_STAGE_INDEX = INTAKE_STAGES.findIndex((stage) => stage.id === REVIEW_STAGE_ID);
export const GENERATE_STAGE_INDEX = INTAKE_STAGES.findIndex((stage) => stage.id === GENERATE_STAGE_ID);
