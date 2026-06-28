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

export const REVIEW_STATUSES = ["Not reviewed", "Needs review", "Approved"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type StorageVersion = 1;

export interface ProjectIdentity {
  id: string;
  projectName: string;
}

export interface ClientDetails {
  clientName: string;
  businessName: string;
}

export interface ProjectIntake {
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

export type ProjectInputField = keyof ProjectIntake | keyof ClientDetails | "appName";

export interface GeneratedDocument {
  fileName: string;
  folder: string;
  content: string;
}

export interface ReadinessSection {
  id: string;
  label: string;
  percent: number;
  state: "Not started" | "In progress" | "Complete";
}

export interface ProjectRecord {
  identity: ProjectIdentity;
  client: ClientDetails;
  intake: ProjectIntake;
  generatedDocuments: GeneratedDocument[];
  generatedFileCount: number;
  outstandingQuestions: ProjectInputField[];
  readinessSections: ReadinessSection[];
  status: ProjectStatus;
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPackage {
  projectId: string;
  projectName: string;
  rootFolder: string;
  folders: readonly string[];
  documents: GeneratedDocument[];
}

export interface StorageState {
  version: StorageVersion;
  activeProjectId: string | null;
  projects: ProjectRecord[];
}

export interface ValidationIssue {
  field: ProjectInputField;
  label: string;
  message: string;
}

export interface ValidationWarning {
  field: ProjectInputField;
  label: string;
  message: string;
}

export interface ValidationSectionResult {
  id: string;
  label: string;
  isComplete: boolean;
  completedFields: number;
  totalFields: number;
  missingFields: ProjectInputField[];
}

export interface IntakeValidationResult {
  isValid: boolean;
  missingFields: ValidationIssue[];
  warnings: ValidationWarning[];
  sectionResults: ValidationSectionResult[];
}

export interface IntakeFieldDefinition {
  name: ProjectInputField;
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

export interface ProjectTemplateData extends ProjectIntake, ClientDetails {
  appName: string;
}
