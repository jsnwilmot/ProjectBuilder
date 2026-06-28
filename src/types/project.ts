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

export const REVIEW_STATUSES = [
  "Not reviewed",
  "Review needed",
  "In review",
  "Approved",
  "Changes requested"
] as const;
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
  targetPlatform: string;
  targetUsers: string;
  userRoles: string;
  roleDescriptions: string;
  rolePermissionsSummary: string;
  internalUsers: string;
  externalUsers: string;
  adminUsers: string;
  accessibilityNotes: string;
  requiredFeatures: string;
  featurePriority: string;
  featureDescription: string;
  featureOwner: string;
  acceptanceNotes: string;
  workflows: string;
  workflowName: string;
  workflowTrigger: string;
  workflowSteps: string;
  workflowInputs: string;
  workflowOutputs: string;
  workflowRoles: string;
  workflowDecisionPoints: string;
  workflowFailureHandling: string;
  workflowOutcome: string;
  screens: string;
  dataSources: string;
  dataEntities: string;
  dataCollections: string;
  fields: string;
  fieldTypes: string;
  requiredDataFields: string;
  relationships: string;
  dataOwnership: string;
  dataRetentionNotes: string;
  keyFields: string;
  permissions: string;
  permissionRules: string;
  roleAccessNotes: string;
  sensitiveDataNotes: string;
  authenticationExpectation: string;
  authorizationExpectation: string;
  auditLoggingNeeds: string;
  dataProtectionExpectations: string;
  complianceNotes: string;
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
  missingCount?: number;
  warningCount?: number;
}

export interface ProjectStageProgress {
  stageId: string;
  label: string;
  percentComplete: number;
  isComplete: boolean;
  missingCount: number;
  warningCount: number;
}

export interface DashboardNextAction {
  label: string;
  description: string;
  targetView: "dashboard" | "intake" | "scope" | "documents" | "export";
  targetStage?: number;
}

export interface DashboardWarning {
  level: "warning" | "error";
  message: string;
}

export interface ProjectSummary {
  id: string;
  projectName: string;
  status: ProjectStatus;
  reviewStatus: ReviewStatus;
  clientName: string;
  appType: string;
  lastUpdatedLabel: string;
  generatedFileCount: number;
  outstandingQuestionCount: number;
  completionPercent: number;
  nextAction: DashboardNextAction;
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
  stageId: string;
  label: string;
  percentComplete: number;
  isComplete: boolean;
  missingFields: ProjectInputField[];
  warnings: string[];
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

export interface IntakeStageDefinition {
  id: string;
  label: string;
  title: string;
  description: string;
  requiredFields: ProjectInputField[];
  optionalFields: ProjectInputField[];
  completionRules: string[];
  nextActionLabel: string;
  fields: IntakeFieldDefinition[];
}

export interface ProjectTemplateData extends ProjectIntake, ClientDetails {
  appName: string;
}
