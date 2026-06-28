import type {
  ClientDetails,
  GeneratedDocument,
  ProjectIdentity,
  ProjectIntake,
  ProjectRecord,
  ProjectStatus,
  ReviewStatus
} from "../types/project";
import { getOutstandingFields } from "./validateIntake";
import { getReadinessSections } from "./projectSelectors";

export interface CreateProjectOptions {
  identity?: Partial<ProjectIdentity>;
  client?: Partial<ClientDetails>;
  intake?: Partial<ProjectIntake>;
  generatedDocuments?: GeneratedDocument[];
  status?: ProjectStatus;
  reviewStatus?: ReviewStatus;
  now?: string;
}

export const EMPTY_PROJECT_INTAKE: ProjectIntake = {
  appType: "",
  appPurpose: "",
  problemStatement: "",
  targetPlatform: "",
  targetUsers: "",
  userRoles: "",
  roleDescriptions: "",
  rolePermissionsSummary: "",
  internalUsers: "",
  externalUsers: "",
  adminUsers: "",
  accessibilityNotes: "",
  requiredFeatures: "",
  featurePriority: "",
  featureDescription: "",
  featureOwner: "",
  acceptanceNotes: "",
  workflows: "",
  workflowName: "",
  workflowTrigger: "",
  workflowSteps: "",
  workflowInputs: "",
  workflowOutputs: "",
  workflowRoles: "",
  workflowDecisionPoints: "",
  workflowFailureHandling: "",
  workflowOutcome: "",
  screens: "",
  dataSources: "",
  dataEntities: "",
  dataCollections: "",
  fields: "",
  fieldTypes: "",
  requiredDataFields: "",
  relationships: "",
  dataOwnership: "",
  dataRetentionNotes: "",
  keyFields: "",
  permissions: "",
  permissionRules: "",
  roleAccessNotes: "",
  sensitiveDataNotes: "",
  authenticationExpectation: "",
  authorizationExpectation: "",
  auditLoggingNeeds: "",
  dataProtectionExpectations: "",
  complianceNotes: "",
  automations: "",
  notifications: "",
  integrations: "",
  reportsDashboards: "",
  brandingNotes: "",
  constraints: "",
  risks: "",
  assumptions: "",
  outOfScope: "",
  successCriteria: ""
};

function createUniqueId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createProject(options: CreateProjectOptions = {}): ProjectRecord {
  const now = options.now ?? new Date().toISOString();
  const project: ProjectRecord = {
    identity: {
      id: options.identity?.id ?? createUniqueId(),
      projectName: options.identity?.projectName ?? ""
    },
    client: {
      clientName: options.client?.clientName ?? "",
      businessName: options.client?.businessName ?? ""
    },
    intake: { ...EMPTY_PROJECT_INTAKE, ...options.intake },
    generatedDocuments: [...(options.generatedDocuments ?? [])],
    generatedFileCount: options.generatedDocuments?.length ?? 0,
    outstandingQuestions: [],
    readinessSections: [],
    status: options.status ?? "Intake Started",
    reviewStatus: options.reviewStatus ?? "Not reviewed",
    createdAt: now,
    updatedAt: now
  };

  project.outstandingQuestions = getOutstandingFields(project);
  project.readinessSections = getReadinessSections(project);
  return project;
}
