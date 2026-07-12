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
import { calculatePowerPlatformReadiness, formatPowerPlatformGateStatus } from "./powerPlatform";

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

function makeSectionItem(
  section: ClientReviewSection,
  field: ProjectInputField,
  label: string,
  reason: string,
  source: ReviewItem["source"],
  now: string
): ReviewItem {
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

function powerPlatformReviewSection(gateId: string): ClientReviewSection {
  const sections: Record<string, ClientReviewSection> = {
    connectorSelection: "Connector selection",
    connectorClassification: "Connector classification",
    licensing: "Licensing",
    environment: "Environment",
    schema: "Data-source schema",
    internalNames: "Internal or logical names",
    logicalNames: "Internal or logical names",
    powerFxPlanning: "Power Fx planning",
    yamlPlanning: "YAML planning",
    delegationPlanning: "Delegation planning",
    alm: "ALM",
    eligibility: "Dataverse eligibility",
    formsAndViews: "Forms and views",
    navigation: "Navigation",
    securityArchitecture: "Security roles",
    businessLogic: "Business logic",
    extensions: "Extensions",
    externalConnectorSelection: "External connector selection",
    externalConnectorClassification: "External connector classification",
    externalConnectorLicensing: "External connector licensing",
    architecture: "Solution architecture",
    connectors: "Connector classification",
    security: "Security",
    testing: "Testing"
  };
  return sections[gateId] ?? "Data-source schema";
}

function powerPlatformReviewField(gateId: string): ProjectInputField {
  if (gateId === "connectorSelection") return "dataSources";
  if (gateId === "connectorClassification" || gateId === "connectors" || gateId === "externalConnectorSelection" || gateId === "externalConnectorClassification" || gateId === "externalConnectorLicensing") return "m365Connectors";
  if (gateId === "licensing" || gateId === "eligibility") return "dataverseUse";
  if (gateId === "environment") return "m365Environment";
  if (gateId === "schema") return "fields";
  if (gateId === "internalNames" || gateId === "logicalNames") return "keyFields";
  if (gateId === "powerFxPlanning" || gateId === "yamlPlanning" || gateId === "delegationPlanning" || gateId === "businessLogic" || gateId === "alm") return "workflows";
  if (gateId === "formsAndViews" || gateId === "navigation" || gateId === "architecture") return "screens";
  if (gateId === "security" || gateId === "securityArchitecture") return "permissionRules";
  if (gateId === "extensions") return "integrations";
  if (gateId === "testing") return "successCriteria";
  return "appType";
}

function applicabilityDecisionIsComplete(decision: { status: string; details: string; notApplicableReason: string; confirmationStatus: string }): boolean {
  if (decision.status === "undecided") return false;
  if (decision.status === "required" && !decision.details.trim()) return false;
  if (decision.status === "notApplicable" && !decision.notApplicableReason.trim()) return false;
  return decision.confirmationStatus === "confirmed";
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

  const powerPlatformReadiness = calculatePowerPlatformReadiness(project);
  for (const gate of powerPlatformReadiness.gates) {
    if (gate.status === "confirmed" || gate.status === "notApplicable") continue;
    const section = powerPlatformReviewSection(gate.id);
    const field = powerPlatformReviewField(gate.id);
    const item = makeSectionItem(
      section,
      field,
      gate.label,
      `${gate.description} Current gate status: ${formatPowerPlatformGateStatus(gate.status)}.`,
      "gate",
      now
    );
    item.gateId = gate.id;
    if (!derived.has(item.id)) derived.set(item.id, item);
  }

  if (project.intake.appType === "powerAppsModelDriven" && project.powerPlatform?.modelDriven) {
    const hasUnconfirmedConnectorApproval = project.powerPlatform.common.connectors.some((connector) =>
      connector.approvalConfirmationStatus !== "confirmed"
    );
    if (hasUnconfirmedConnectorApproval) {
      const item = makeSectionItem(
        "External connector selection",
        "m365Connectors",
        "Confirm external connector approval.",
        "External connector approval must use the controlled approval confirmation status. Approval notes do not satisfy readiness.",
        "gate",
        now
      );
      item.gateId = "connectorApproval";
      if (!derived.has(item.id)) derived.set(item.id, item);
    }
    const decisions = [
      { section: "Business rules" as const, label: "Confirm business-rule applicability.", gateId: "businessRules", decision: project.powerPlatform.modelDriven.businessRulesDecision },
      { section: "Business process flows" as const, label: "Confirm business-process-flow applicability.", gateId: "businessProcessFlows", decision: project.powerPlatform.modelDriven.businessProcessFlowsDecision },
      { section: "Automations" as const, label: "Confirm automation applicability.", gateId: "automations", decision: project.powerPlatform.modelDriven.automationsDecision },
      { section: "Business logic" as const, label: "Confirm validation rules applicability.", gateId: "validationRules", decision: project.powerPlatform.modelDriven.validationRulesDecision },
      { section: "Business logic" as const, label: "Confirm duplicate prevention applicability.", gateId: "duplicatePrevention", decision: project.powerPlatform.modelDriven.duplicatePreventionDecision },
      { section: "Security roles" as const, label: "Confirm team model applicability.", gateId: "teamModel", decision: project.powerPlatform.modelDriven.teamModelDecision },
      { section: "Security roles" as const, label: "Confirm hierarchy security applicability.", gateId: "hierarchySecurity", decision: project.powerPlatform.modelDriven.hierarchySecurityDecision },
      { section: "Security roles" as const, label: "Confirm field security applicability.", gateId: "fieldSecurity", decision: project.powerPlatform.modelDriven.fieldSecurityDecision },
      { section: "Security roles" as const, label: "Confirm application users applicability.", gateId: "applicationUsers", decision: project.powerPlatform.modelDriven.applicationUsersDecision },
      { section: "Security roles" as const, label: "Confirm service principals applicability.", gateId: "servicePrincipals", decision: project.powerPlatform.modelDriven.servicePrincipalsDecision }
    ];
    for (const decision of decisions) {
      if (applicabilityDecisionIsComplete(decision.decision)) continue;
      const item = makeSectionItem(
        decision.section,
        "workflows",
        decision.label,
        "This model-driven applicability decision must be required with details or not applicable with a reason, then confirmed.",
        "gate",
        now
      );
      item.gateId = decision.gateId;
      if (!derived.has(item.id)) derived.set(item.id, item);
    }
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
  const powerPlatformReadiness = calculatePowerPlatformReadiness(project);
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
      id: "powerPlatformGatesConfirmed",
      label: "Power Platform gates confirmed",
      passed: powerPlatformReadiness.isReadyForCodex,
      manual: false,
      reason: powerPlatformReadiness.nextBlockingAction || "Resolve applicable Power Platform readiness gates."
    },
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
