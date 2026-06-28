export const PROJECT_STATUSES = [
  "Intake Started",
  "Intake Complete",
  "Project Package Generated",
  "Architect Review Needed",
  "Ready for Codex",
  "In Development",
  "Needs Review",
  "Complete"
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectIntake {
  appName: string;
  clientName: string;
  businessName: string;
  appType: string;
  appPurpose: string;
  problemStatement: string;
  targetUsers: string;
  userRoles: string;
  requiredFeatures: string;
  workflows: string;
  screens: string;
  dataSources: string;
  dataCollections: string;
  fields: string;
  permissions: string;
  automations: string;
  notifications: string;
  integrations: string;
  reportsDashboards: string;
  brandingNotes: string;
  constraints: string;
  risks: string;
  assumptions: string;
  outOfScope: string;
  successCriteria: string;
}

export type ProjectIntakeField = keyof ProjectIntake;

export interface ProjectMetadata {
  id: string;
  status: ProjectStatus;
  lastUpdated: string;
  reviewStatus: string;
}

export interface ProjectState {
  intake: ProjectIntake;
  metadata: ProjectMetadata;
}

export interface GeneratedDocument {
  fileName: string;
  folder: string;
  content: string;
}

export interface ProjectPackage {
  projectName: string;
  rootFolder: string;
  folders: readonly string[];
  documents: GeneratedDocument[];
}

export interface ValidationIssue {
  field: ProjectIntakeField;
  label: string;
  message: string;
}

export interface IntakeFieldDefinition {
  name: ProjectIntakeField;
  label: string;
  description: string;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
}

export interface IntakeStep {
  id: string;
  label: string;
  title: string;
  description: string;
  fields: IntakeFieldDefinition[];
}
