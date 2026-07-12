import type {
  ClientDetails,
  GeneratedDocument,
  ProjectIdentity,
  ProjectIntake,
  ProjectRecord,
  ProjectStatus,
  ReadinessConfirmations,
  ReviewItem,
  ReviewStatus,
  PowerPlatformProjectData
} from "../types/project";
import { deriveReviewItems } from "./clientReview";
import { getOutstandingFields } from "./validateIntake";
import { getReadinessSections } from "./projectSelectors";
import { createDefaultPowerPlatformData } from "./powerPlatform";
import { normalizeProjectTypeValue } from "../data/projectTypes";

export interface CreateProjectOptions {
  identity?: Partial<ProjectIdentity>;
  client?: Partial<ClientDetails>;
  intake?: Partial<ProjectIntake>;
  generatedDocuments?: GeneratedDocument[];
  reviewItems?: ReviewItem[];
  readinessConfirmations?: ReadinessConfirmations;
  packageGeneratedAt?: string | null;
  status?: ProjectStatus;
  reviewStatus?: ReviewStatus;
  archivedAt?: string | null;
  sourceProjectId?: string | null;
  duplicatedAt?: string | null;
  powerPlatform?: PowerPlatformProjectData;
  now?: string;
}

export const EMPTY_PROJECT_INTAKE: ProjectIntake = {
  appType: "",
  appPurpose: "",
  problemStatement: "",
  targetPlatform: "",
  audienceVisibility: "",
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
  brandStatus: "",
  logoStatus: "",
  logoFiles: "",
  primaryColors: "",
  secondaryColors: "",
  fontPreferences: "",
  brandTone: "",
  imageStyle: "",
  iconStyle: "",
  referenceSites: "",
  brandRestrictions: "",
  faviconNeeded: "",
  openGraphImageNeeded: "",
  socialAssetsNeeded: "",
  contentSource: "",
  approvedAssets: "",
  accessibilityContrastNotes: "",
  websitePages: "",
  websiteServices: "",
  websiteContactMethod: "",
  domainStatus: "",
  hostingStatus: "",
  seoKeywords: "",
  serviceArea: "",
  googleBusinessProfile: "",
  testimonials: "",
  websiteForms: "",
  websiteAnalytics: "",
  legalPages: "",
  imagesAndContent: "",
  gameGenre: "",
  gameTargetDevices: "",
  gameEngine: "",
  gameplayLoop: "",
  gameControls: "",
  gameLevels: "",
  gameScoring: "",
  gameCharacters: "",
  gameArtStyle: "",
  gameAudio: "",
  gameMonetization: "",
  gameStoreReleaseNeeds: "",
  mobilePlatforms: "",
  offlineSupport: "",
  pushNotifications: "",
  devicePermissions: "",
  accountSystem: "",
  appStoreRequirements: "",
  dataSync: "",
  privacyRequirements: "",
  dashboardDataSources: "",
  dashboardKpis: "",
  dashboardRefreshFrequency: "",
  dashboardFilters: "",
  drillThrough: "",
  dashboardPermissions: "",
  dashboardExportNeeds: "",
  dashboardAudience: "",
  sharePointLists: "",
  dataverseUse: "",
  powerAutomateFlows: "",
  powerBiReports: "",
  m365Connectors: "",
  m365Environment: "",
  dlpRestrictions: "",
  m365Permissions: "",
  automationTrigger: "",
  automationSteps: "",
  sourceSystem: "",
  targetSystem: "",
  approvalSteps: "",
  automationErrorHandling: "",
  retryLogic: "",
  automationLogs: "",
  notificationRules: "",
  apiEndpoints: "",
  dataContracts: "",
  apiAuthentication: "",
  apiConsumers: "",
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
  const normalizedAppType = normalizeProjectTypeValue(options.intake?.appType ?? "");
  const intake = {
    ...EMPTY_PROJECT_INTAKE,
    ...options.intake,
    appType: normalizedAppType
  };
  const project: ProjectRecord = {
    identity: {
      id: options.identity?.id ?? createUniqueId(),
      projectName: options.identity?.projectName ?? ""
    },
    client: {
      clientName: options.client?.clientName ?? "",
      businessName: options.client?.businessName ?? ""
    },
    intake,
    generatedDocuments: [...(options.generatedDocuments ?? [])],
    generatedFileCount: options.generatedDocuments?.length ?? 0,
    outstandingQuestions: [],
    readinessSections: [],
    reviewItems: [...(options.reviewItems ?? [])],
    readinessConfirmations: { ...(options.readinessConfirmations ?? {}) },
    packageGeneratedAt: options.packageGeneratedAt ?? null,
    status: options.status ?? "Intake Started",
    reviewStatus: options.reviewStatus ?? "Not reviewed",
    archivedAt: options.archivedAt ?? null,
    sourceProjectId: options.sourceProjectId ?? null,
    duplicatedAt: options.duplicatedAt ?? null,
    powerPlatform: options.powerPlatform ?? createDefaultPowerPlatformData(normalizedAppType),
    createdAt: now,
    updatedAt: now
  };

  project.outstandingQuestions = getOutstandingFields(project);
  project.readinessSections = getReadinessSections(project);
  project.reviewItems = deriveReviewItems(project, now);
  return project;
}
