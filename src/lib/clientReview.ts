import { isBrandingRequired } from "../data/projectTypes";
import {
  CLIENT_REVIEW_SECTIONS,
  type ClientReviewReadiness,
  type ClientReviewSection,
  type ProjectInputField,
  type ProjectRecord,
  type ReadinessChecklistId,
  type ReadinessChecklistItem,
  type ReviewItem,
  type ReviewItemStatus
} from "../types/project";
import { validateIntake } from "./validateIntake";

const FIELD_SECTIONS: Partial<Record<ProjectInputField, ClientReviewSection>> = {
  appName: "Foundation",
  clientName: "Foundation",
  businessName: "Foundation",
  appType: "Foundation",
  appPurpose: "Foundation",
  problemStatement: "Foundation",
  targetPlatform: "Foundation",
  audienceVisibility: "Foundation",
  constraints: "Foundation",
  risks: "Foundation",
  assumptions: "Foundation",
  outOfScope: "Foundation",
  brandStatus: "Branding",
  logoStatus: "Branding",
  logoFiles: "Branding",
  primaryColors: "Branding",
  secondaryColors: "Branding",
  fontPreferences: "Branding",
  brandTone: "Branding",
  imageStyle: "Branding",
  iconStyle: "Branding",
  referenceSites: "Branding",
  brandRestrictions: "Branding",
  brandingNotes: "Branding",
  faviconNeeded: "Branding",
  openGraphImageNeeded: "Branding",
  socialAssetsNeeded: "Branding",
  accessibilityContrastNotes: "Branding",
  targetUsers: "Users",
  userRoles: "Users",
  roleDescriptions: "Users",
  rolePermissionsSummary: "Users",
  internalUsers: "Users",
  externalUsers: "Users",
  adminUsers: "Users",
  accessibilityNotes: "Users",
  requiredFeatures: "Features",
  featurePriority: "Features",
  featureDescription: "Features",
  featureOwner: "Features",
  screens: "Features",
  requiredDataFields: "Data",
  dataSources: "Data",
  dataEntities: "Data",
  dataCollections: "Data",
  fields: "Data",
  fieldTypes: "Data",
  relationships: "Data",
  dataOwnership: "Data",
  dataRetentionNotes: "Data",
  keyFields: "Data",
  integrations: "Data",
  reportsDashboards: "Data",
  workflows: "Workflows",
  workflowName: "Workflows",
  workflowTrigger: "Workflows",
  workflowSteps: "Workflows",
  workflowInputs: "Workflows",
  workflowOutputs: "Workflows",
  workflowRoles: "Workflows",
  workflowDecisionPoints: "Workflows",
  workflowFailureHandling: "Workflows",
  workflowOutcome: "Workflows",
  automations: "Workflows",
  notifications: "Workflows",
  permissionRules: "Security",
  permissions: "Security",
  roleAccessNotes: "Security",
  sensitiveDataNotes: "Security",
  authenticationExpectation: "Security",
  authorizationExpectation: "Security",
  auditLoggingNeeds: "Security",
  dataProtectionExpectations: "Security",
  complianceNotes: "Security",
  contentSource: "Content",
  approvedAssets: "Content",
  imagesAndContent: "Content",
  websiteServices: "Content",
  testimonials: "Content",
  websitePages: "Content",
  websiteForms: "Content",
  domainStatus: "Deployment",
  hostingStatus: "Deployment",
  gameStoreReleaseNeeds: "Deployment",
  appStoreRequirements: "Deployment",
  successCriteria: "Testing",
  acceptanceNotes: "Testing"
};

const QUESTION_OVERRIDES: Partial<Record<ProjectInputField, string>> = {
  appType: "Which project type best describes what is being built?",
  screens: "Which pages, screens, views, or panels are required for the first release?",
  brandStatus: "Is there an approved brand system, or should a new visual direction be defined?",
  primaryColors: "Which approved primary brand colours should the project use?",
  dataCollections: "Which tables, lists, or collections must the project store or manage?",
  workflows: "What are the main workflows from trigger through expected outcome?",
  permissionRules: "What can each user role view, create, edit, approve, or delete?",
  successCriteria: "What observable outcomes will prove the project is complete?"
};

function sectionFor(field: ProjectInputField): ClientReviewSection {
  if (FIELD_SECTIONS[field]) return FIELD_SECTIONS[field]!;
  if (field.startsWith("dashboard")) return "Data";
  if (field.startsWith("api")) return field === "apiAuthentication" ? "Security" : "Data";
  if (field.startsWith("automation") || field === "approvalSteps" || field === "retryLogic") return "Workflows";
  if (field.startsWith("game")) return "Features";
  if (field.startsWith("website")) return "Content";
  if (field.startsWith("mobile") || field === "offlineSupport" || field === "pushNotifications") return "Features";
  if (field.startsWith("m365") || field.startsWith("power") || field === "sharePointLists" || field === "dataverseUse") return "Data";
  return "Foundation";
}

function questionFor(field: ProjectInputField, label: string): string {
  return QUESTION_OVERRIDES[field] ?? `What should be confirmed for ${label.toLowerCase()}?`;
}

function itemId(section: ClientReviewSection, field: ProjectInputField): string {
  return `review-${section.toLowerCase().replace(/\s+/g, "-")}-${field}`;
}

function makeItem(
  field: ProjectInputField,
  label: string,
  reason: string,
  source: ReviewItem["source"],
  now: string
): ReviewItem {
  const section = sectionFor(field);
  const blocking = source !== "warning";
  return {
    id: itemId(section, field),
    section,
    fieldKey: field,
    label,
    reason,
    recommendedQuestion: questionFor(field, label),
    status: "Needs answer",
    notApplicableReason: "",
    deferredReason: "",
    blocking,
    allowDeferred: source === "warning",
    source,
    updatedAt: now
  };
}

function screensAreRelevant(project: ProjectRecord): boolean {
  return project.intake.appType !== "apiBackend"
    && project.intake.appType !== "automationWorkflow";
}

export function deriveReviewItems(project: ProjectRecord, now = new Date().toISOString()): ReviewItem[] {
  const validation = validateIntake(project);
  const derived = new Map<string, ReviewItem>();

  validation.missingFields.forEach((issue) => {
    const item = makeItem(issue.field, issue.label, issue.message, "missing", now);
    derived.set(item.id, item);
  });
  validation.warnings.forEach((warning) => {
    const item = makeItem(warning.field, warning.label, warning.message, "warning", now);
    if (!derived.has(item.id)) derived.set(item.id, item);
  });
  if (screensAreRelevant(project) && !project.intake.screens.trim()) {
    const item = makeItem(
      "screens",
      "Screens or pages",
      "Confirm the pages, screens, views, or panels needed for the first release.",
      "weak",
      now
    );
    derived.set(item.id, item);
  }

  const previous = new Map((project.reviewItems ?? []).map((item) => [item.id, item]));
  const reconciled = [...derived.values()].map((item) => {
    const stored = previous.get(item.id);
    return stored
      ? {
          ...item,
          status: stored.status,
          notApplicableReason: stored.notApplicableReason,
          deferredReason: stored.deferredReason,
          updatedAt: stored.updatedAt
        }
      : item;
  });

  for (const stored of previous.values()) {
    if (derived.has(stored.id)) continue;
    reconciled.push({
      ...stored,
      status: stored.status === "Needs answer" ? "Answered" : stored.status,
      updatedAt: stored.status === "Needs answer" ? now : stored.updatedAt
    });
  }

  return reconciled.sort((a, b) => {
    const sectionDifference = CLIENT_REVIEW_SECTIONS.indexOf(a.section) - CLIENT_REVIEW_SECTIONS.indexOf(b.section);
    return sectionDifference || a.label.localeCompare(b.label);
  });
}

export function reviewItemBlocksReadiness(item: ReviewItem): boolean {
  if (item.status === "Answered") return false;
  if (item.status === "Not applicable") return !item.notApplicableReason.trim();
  if (item.status === "Deferred") {
    return !item.deferredReason.trim() || item.blocking || !item.allowDeferred;
  }
  return true;
}

export function getReviewBlockers(project: ProjectRecord): ReviewItem[] {
  return deriveReviewItems(project).filter(reviewItemBlocksReadiness);
}

function sectionIsResolved(project: ProjectRecord, section: ClientReviewSection): boolean {
  return !deriveReviewItems(project).some((item) => item.section === section && reviewItemBlocksReadiness(item));
}

function stageIsComplete(project: ProjectRecord, stageId: string): boolean {
  return validateIntake(project).sectionResults.find((section) => section.stageId === stageId)?.isComplete ?? false;
}

function manualConfirmation(
  project: ProjectRecord,
  id: ReadinessChecklistId,
  label: string,
  reason: string
) {
  return {
    id,
    label,
    passed: Boolean(project.readinessConfirmations?.[id]),
    manual: true,
    reason
  } as const;
}

export function getClientReviewReadiness(project: ProjectRecord): ClientReviewReadiness {
  const unresolvedItems = getReviewBlockers(project);
  const brandingRequired = isBrandingRequired(project.intake.appType, project.intake.audienceVisibility);
  const checklist: ReadinessChecklistItem[] = [
    {
      id: "projectTypeConfirmed",
      label: "Project type confirmed",
      passed: Boolean(project.intake.appType),
      manual: false,
      reason: "Select the project type in Foundation."
    },
    manualConfirmation(project, "scopeReviewed", "Scope reviewed", "Confirm the project scope has been reviewed."),
    {
      id: "requiredGapsResolved",
      label: "Required gaps resolved",
      passed: unresolvedItems.length === 0,
      manual: false,
      reason: "Resolve each blocking missing-information review item."
    },
    {
      id: "brandingConfirmed",
      label: "Branding confirmed if required",
      passed: !brandingRequired || sectionIsResolved(project, "Branding"),
      manual: false,
      reason: "Resolve required branding questions."
    },
    {
      id: "screensConfirmed",
      label: "Screens or pages confirmed",
      passed: !screensAreRelevant(project) || Boolean(project.intake.screens.trim()) || sectionIsResolved(project, "Features"),
      manual: false,
      reason: "Confirm the first-release pages, screens, views, or panels."
    },
    {
      id: "dataModelConfirmed",
      label: "Data model confirmed",
      passed: stageIsComplete(project, "data") || sectionIsResolved(project, "Data"),
      manual: false,
      reason: "Complete and resolve the data model review."
    },
    {
      id: "workflowsConfirmed",
      label: "Workflows confirmed",
      passed: stageIsComplete(project, "workflows") || sectionIsResolved(project, "Workflows"),
      manual: false,
      reason: "Complete and resolve the workflow review."
    },
    {
      id: "securityConfirmed",
      label: "Security expectations confirmed",
      passed: stageIsComplete(project, "security") || sectionIsResolved(project, "Security"),
      manual: false,
      reason: "Complete and resolve the security review."
    },
    manualConfirmation(
      project,
      "acceptanceCriteriaReviewed",
      "Acceptance criteria reviewed",
      "Confirm the acceptance criteria are testable and approved."
    ),
    {
      id: "clientQuestionsResolved",
      label: "Client questions resolved or not applicable",
      passed: unresolvedItems.length === 0,
      manual: false,
      reason: "Resolve client questions, or mark them not applicable with a reason."
    },
    manualConfirmation(
      project,
      "draftPackageReviewed",
      "Draft package reviewed",
      "Generate and review a Draft package before final readiness."
    ),
    {
      id: "codexInstructionsReady",
      label: "Codex instructions ready",
      passed: Boolean(project.packageGeneratedAt),
      manual: false,
      reason: "Regenerate the package after the final review decisions."
    }
  ];
  const checklistBlockers = checklist.filter((item) => !item.passed);
  const blockers = [...new Set([
    ...unresolvedItems.map((item) => `${item.section}: ${item.label}`),
    ...checklistBlockers.map((item) => item.reason)
  ])];

  return {
    isReady: checklistBlockers.length === 0,
    blockerCount: blockers.length,
    blockers,
    checklist,
    unresolvedItems
  };
}

export function groupClientQuestions(reviewItems: ReviewItem[]): Array<{
  section: ClientReviewSection;
  items: ReviewItem[];
}> {
  return CLIENT_REVIEW_SECTIONS.map((section) => ({
    section,
    items: reviewItems.filter((item) =>
      item.section === section && (item.status === "Needs answer" || item.status === "Deferred")
    )
  })).filter((group) => group.items.length > 0);
}

export function formatClientQuestions(reviewItems: ReviewItem[]): string {
  const groups = groupClientQuestions(reviewItems);
  if (groups.length === 0) return "No unresolved client questions.";
  return groups.map(({ section, items }) => [
    section,
    ...items.map((item) => `- ${item.recommendedQuestion}`)
  ].join("\n")).join("\n\n");
}

export function updateReviewItemDecision(
  item: ReviewItem,
  changes: Partial<Pick<ReviewItem, "status" | "notApplicableReason" | "deferredReason">>,
  now = new Date().toISOString()
): ReviewItem {
  const status: ReviewItemStatus = changes.status ?? item.status;
  return {
    ...item,
    ...changes,
    status,
    notApplicableReason: status === "Not applicable"
      ? changes.notApplicableReason ?? item.notApplicableReason
      : "",
    deferredReason: status === "Deferred"
      ? changes.deferredReason ?? item.deferredReason
      : "",
    updatedAt: now
  };
}
