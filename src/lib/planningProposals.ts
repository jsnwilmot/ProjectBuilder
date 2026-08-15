import type { ProjectType } from "../types/project";

export const PLANNING_SCHEMA_VERSION = "phase-5c.1.1";
export const PLANNING_RULE_SET_ID = "project-builder-deterministic-planning";
export const PLANNING_RULE_SET_VERSION = "phase-5c.1.1";

export const PLANNING_CATEGORIES = [
  "userFact",
  "approvedConstraint",
  "architectProposal",
  "derivedDependency",
  "assumption",
  "missingDecision",
  "clarification"
] as const;
export type PlanningProposalCategory = (typeof PLANNING_CATEGORIES)[number];

export const PLANNING_STATUSES = [
  "Proposed",
  "Confirmed",
  "Revised",
  "Rejected",
  "Deferred",
  "Not Applicable",
  "Stale",
  "Superseded",
  "Blocked",
  "Needs Clarification"
] as const;
export type PlanningProposalStatus = (typeof PLANNING_STATUSES)[number];

export const PLANNING_UNCERTAINTY_STATES = [
  "Known",
  "Likely",
  "Uncertain",
  "Unknown"
] as const;
export type PlanningUncertainty = (typeof PLANNING_UNCERTAINTY_STATES)[number];

export const PLANNING_RESTRICTIONS = [
  "concreteProposalAllowed",
  "optionsOnly",
  "clarificationOnly",
  "authoritativeSourceRequired",
  "architectApprovalRequired",
  "neverAutoGenerate"
] as const;
export type PlanningRestriction = (typeof PLANNING_RESTRICTIONS)[number];

export const PLANNING_TARGET_KINDS = [
  "projectField",
  "repeatingRecord",
  "repeatingRecordField",
  "powerPlatformDecision",
  "readinessRequirement",
  "documentApplicability",
  "futureArchitectureRecord"
] as const;
export type PlanningTargetKind = (typeof PLANNING_TARGET_KINDS)[number];

export const PLANNING_TARGET_DOMAINS = [
  "foundation",
  "users",
  "features",
  "data",
  "workflows",
  "security",
  "content",
  "deployment",
  "testing",
  "powerPlatform",
  "readiness",
  "documents",
  "other"
] as const;
export type PlanningTargetDomain = (typeof PLANNING_TARGET_DOMAINS)[number];

export const PLANNING_TARGET_OPERATIONS = [
  "setValue",
  "createRecord",
  "setApplicability",
  "clarificationOnly"
] as const;
export type PlanningTargetOperation = (typeof PLANNING_TARGET_OPERATIONS)[number];

export interface PlanningTargetReference {
  kind: PlanningTargetKind;
  domain: PlanningTargetDomain;
  targetKey: string;
  entityId?: string;
  fieldKey?: string;
  operation?: PlanningTargetOperation;
}

export interface PlanningTextValue {
  kind: "text";
  value: string;
}

export interface PlanningBooleanValue {
  kind: "boolean";
  value: boolean;
}

export interface PlanningEnumValue {
  kind: "enum";
  value: string;
}

export interface PlanningStringListValue {
  kind: "stringList";
  value: readonly string[];
}

export interface PlanningStructuredRecordValue {
  kind: "structuredRecord";
  value: Record<string, PlanningProposalValue>;
}

export interface PlanningStructuredRecordListValue {
  kind: "structuredRecordList";
  value: readonly Record<string, PlanningProposalValue>[];
}

export interface PlanningRecordCreationValue {
  kind: "recordCreation";
  value: Record<string, PlanningProposalValue>;
}

export interface PlanningNotApplicableValue {
  kind: "notApplicable";
  reason: string;
}

export interface PlanningDeferredValue {
  kind: "deferred";
  reason: string;
}

export interface PlanningClarificationValue {
  kind: "clarification";
  question: string;
}

export type PlanningProposalValue =
  | PlanningTextValue
  | PlanningBooleanValue
  | PlanningEnumValue
  | PlanningStringListValue
  | PlanningStructuredRecordValue
  | PlanningStructuredRecordListValue
  | PlanningRecordCreationValue
  | PlanningNotApplicableValue
  | PlanningDeferredValue
  | PlanningClarificationValue;

export const PLANNING_SOURCE_TYPES = [
  "userAnswer",
  "confirmedIntake",
  "approvedDocument",
  "platformRule",
  "projectRule",
  "projectTypePreset",
  "readinessPrerequisite",
  "derivedDependency",
  "generalRecommendation"
] as const;
export type PlanningSourceType = (typeof PLANNING_SOURCE_TYPES)[number];

export const PLANNING_SOURCE_AVAILABILITY = [
  "current",
  "stale",
  "missing",
  "deleted",
  "unverified"
] as const;
export type PlanningSourceAvailability = (typeof PLANNING_SOURCE_AVAILABILITY)[number];

export const PLANNING_SOURCE_AUTHORITIES = [
  "confirmed",
  "approved",
  "informational"
] as const;
export type PlanningSourceAuthority = (typeof PLANNING_SOURCE_AUTHORITIES)[number];

export interface PlanningSourceReference {
  sourceId: string;
  sourceType: PlanningSourceType;
  locator: string;
  label: string;
  authority: PlanningSourceAuthority;
  availability: PlanningSourceAvailability;
  version?: string;
  observedAt?: string;
  excerpt?: string;
}

export const PLANNING_STALE_REASONS = [
  "sourceChanged",
  "targetChanged",
  "targetDeleted",
  "ruleChanged",
  "projectTypeChanged",
  "platformChanged",
  "applicabilityChanged",
  "proposalRegenerated",
  "approvedDocumentReplaced",
  "projectDuplicated",
  "importedSourceUnmatched",
  "conflictDetected"
] as const;
export type PlanningStaleReason = (typeof PLANNING_STALE_REASONS)[number];

export interface PlanningProposalRecord {
  proposalId: string;
  proposalSchemaVersion: typeof PLANNING_SCHEMA_VERSION;
  projectId: string;
  ruleSetId: typeof PLANNING_RULE_SET_ID;
  ruleSetVersion: typeof PLANNING_RULE_SET_VERSION;
  ruleId: string;
  ruleVersion: string;
  fingerprint: string;
  target: PlanningTargetReference;
  category: PlanningProposalCategory;
  status: PlanningProposalStatus;
  value: PlanningProposalValue;
  title: string;
  recommendation: string;
  rationale: string;
  sourceIds: readonly string[];
  uncertainty: PlanningUncertainty;
  restriction: PlanningRestriction;
  createdAt: string;
  updatedAt: string;
  consequence?: string;
  alternativeGroupId?: string;
  recommendedAlternative?: boolean;
  supersededByProposalId?: string;
  staleReason?: PlanningStaleReason;
  staleAt?: string;
  conflictIds?: readonly string[];
  readinessRequirementIds?: readonly string[];
  lastDecisionId?: string;
  applicableProjectTypes?: readonly ProjectType[];
  applicableDomains?: readonly PlanningTargetDomain[];
}

export const PLANNING_DECISION_ACTIONS = [
  "confirm",
  "revise",
  "reject",
  "defer",
  "markNotApplicable",
  "markStale",
  "supersede",
  "block",
  "requestClarification",
  "reopen",
  "resolveConflict"
] as const;
export type PlanningDecisionAction = (typeof PLANNING_DECISION_ACTIONS)[number];

export const PLANNING_DECISION_ORIGINS = [
  "userAction",
  "deterministicRule",
  "migration"
] as const;
export type PlanningDecisionOrigin = (typeof PLANNING_DECISION_ORIGINS)[number];

export interface PlanningDecisionRecord {
  decisionId: string;
  proposalId: string;
  projectId: string;
  action: PlanningDecisionAction;
  previousStatus: PlanningProposalStatus;
  resultingStatus: PlanningProposalStatus;
  origin: PlanningDecisionOrigin;
  recordedAt: string;
  value?: PlanningProposalValue;
  reason?: string;
  sourceIds?: readonly string[];
  supersedesDecisionId?: string;
  ruleSetVersion?: string;
}

export const PLANNING_DEPENDENCY_TYPES = [
  "requiresProposal",
  "requiresTarget",
  "requiresSource",
  "requiresReadiness",
  "requiresApplicability",
  "conflictsWith",
  "mutuallyExclusiveWith"
] as const;
export type PlanningDependencyType = (typeof PLANNING_DEPENDENCY_TYPES)[number];

export type PlanningDependencyTarget =
  | { kind: "proposalId"; proposalId: string }
  | { kind: "targetReference"; target: PlanningTargetReference }
  | { kind: "sourceId"; sourceId: string }
  | { kind: "readinessRequirementId"; readinessRequirementId: string };

export interface PlanningDependencyRecord {
  dependencyId: string;
  sourceProposalId: string;
  dependencyType: PlanningDependencyType;
  target: PlanningDependencyTarget;
  required: boolean;
  rationale: string;
}

export const PLANNING_CONFLICT_TYPES = [
  "sourceMismatch",
  "proposalVsIntake",
  "proposalVsApprovedDocument",
  "confirmedDecisionMismatch",
  "projectTypePlatformMismatch",
  "featureScopeConflict",
  "connectorLicensingConflict",
  "deploymentAccessConflict",
  "workflowDataConflict",
  "securityRoleConflict",
  "documentIntakeConflict",
  "other"
] as const;
export type PlanningConflictType = (typeof PLANNING_CONFLICT_TYPES)[number];

export const PLANNING_CONFLICT_SEVERITIES = [
  "informational",
  "warning",
  "blocking"
] as const;
export type PlanningConflictSeverity = (typeof PLANNING_CONFLICT_SEVERITIES)[number];

export const PLANNING_CONFLICT_STATUSES = [
  "open",
  "resolved",
  "superseded"
] as const;
export type PlanningConflictStatus = (typeof PLANNING_CONFLICT_STATUSES)[number];

export type PlanningInvolvedReference =
  | { kind: "proposalId"; proposalId: string }
  | { kind: "sourceId"; sourceId: string }
  | { kind: "decisionId"; decisionId: string }
  | { kind: "targetReference"; target: PlanningTargetReference };

export interface PlanningConflictRecord {
  conflictId: string;
  projectId: string;
  conflictType: PlanningConflictType;
  severity: PlanningConflictSeverity;
  status: PlanningConflictStatus;
  involvedReferences: readonly PlanningInvolvedReference[];
  explanation: string;
  blocking: boolean;
  createdAt: string;
  resolutionOptionProposalIds?: readonly string[];
  resolvedAt?: string;
  resolutionDecisionId?: string;
  affectedProposalIds?: readonly string[];
}

export interface ProjectPlanningState {
  schemaVersion: typeof PLANNING_SCHEMA_VERSION;
  ruleSetId: typeof PLANNING_RULE_SET_ID;
  ruleSetVersion: typeof PLANNING_RULE_SET_VERSION;
  sources: readonly PlanningSourceReference[];
  proposals: readonly PlanningProposalRecord[];
  decisions: readonly PlanningDecisionRecord[];
  dependencies: readonly PlanningDependencyRecord[];
  conflicts: readonly PlanningConflictRecord[];
}

export type PlanningIssueCode =
  | "nonObjectInput"
  | "unsupportedSchema"
  | "invalidCollection"
  | "collectionCapExceeded"
  | "sparseCollection"
  | "duplicateId"
  | "invalidRecord"
  | "invalidCrossReference"
  | "dependencyCycle"
  | "alternativeGroupTooLarge"
  | "multipleRecommendedAlternatives";

export interface PlanningNormalizationIssue {
  code: PlanningIssueCode;
  collection?: keyof Pick<ProjectPlanningState, "sources" | "proposals" | "decisions" | "dependencies" | "conflicts">;
  recordId?: string;
  field?: string;
  message: string;
}

export interface ProjectPlanningNormalizationResult {
  planning: ProjectPlanningState;
  issues: PlanningNormalizationIssue[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/;
const ISO_WITH_TIMEZONE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

const LIMITS = {
  recordId: 128,
  projectId: 200,
  ruleId: 128,
  targetPart: 200,
  title: 240,
  shortText: 500,
  excerpt: 500,
  longText: 2000,
  textValue: 4000,
  listItems: 100,
  listItem: 500,
  structuredKeys: 50,
  structuredDepth: 4,
  structuredSize: 12000,
  sources: 1000,
  proposals: 500,
  decisions: 2000,
  dependencies: 2000,
  conflicts: 500,
  idsPerProposal: 20,
  involvedReferences: 20,
  resolutionOptions: 20,
  alternativesPerGroup: 20
} as const;

const VALID_TRANSITIONS: Record<PlanningProposalStatus, readonly PlanningProposalStatus[]> = {
  Proposed: [
    "Confirmed",
    "Revised",
    "Rejected",
    "Deferred",
    "Not Applicable",
    "Stale",
    "Superseded",
    "Blocked",
    "Needs Clarification"
  ],
  Confirmed: ["Revised", "Stale", "Superseded"],
  Revised: [
    "Confirmed",
    "Rejected",
    "Deferred",
    "Stale",
    "Superseded",
    "Blocked",
    "Needs Clarification"
  ],
  Rejected: [],
  Deferred: ["Proposed", "Revised", "Rejected", "Stale", "Superseded", "Needs Clarification"],
  "Not Applicable": ["Stale", "Superseded"],
  Stale: [
    "Proposed",
    "Revised",
    "Confirmed",
    "Rejected",
    "Deferred",
    "Superseded",
    "Blocked",
    "Needs Clarification"
  ],
  Superseded: [],
  Blocked: ["Proposed", "Revised", "Rejected", "Deferred", "Stale", "Superseded", "Needs Clarification"],
  "Needs Clarification": ["Proposed", "Revised", "Rejected", "Deferred", "Not Applicable", "Stale", "Blocked", "Superseded"]
};

export function createEmptyProjectPlanningState(): ProjectPlanningState {
  return {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    sources: [],
    proposals: [],
    decisions: [],
    dependencies: [],
    conflicts: []
  };
}

export function getPlanningSourcePrecedence(source: PlanningSourceReference): number | null {
  if (source.availability !== "current") {
    return null;
  }
  if (source.sourceType === "userAnswer" && source.authority === "confirmed") return 1;
  if (source.sourceType === "approvedDocument" && source.authority === "approved") return 2;
  if (source.sourceType === "confirmedIntake" && source.authority === "confirmed") return 3;
  if (
    (source.sourceType === "platformRule" ||
      source.sourceType === "projectRule" ||
      source.sourceType === "readinessPrerequisite") &&
    source.authority === "approved"
  ) {
    return 4;
  }
  if (source.sourceType === "projectTypePreset" && source.authority === "approved") return 5;
  if (source.sourceType === "userAnswer" && source.authority === "informational") return 6;
  if (source.sourceType === "derivedDependency" && source.authority === "informational") return 7;
  if (source.sourceType === "generalRecommendation" && source.authority === "informational") return 8;
  return null;
}

export function isValidPlanningTransition(
  previousStatus: PlanningProposalStatus,
  resultingStatus: PlanningProposalStatus
): boolean {
  return previousStatus !== resultingStatus && VALID_TRANSITIONS[previousStatus].includes(resultingStatus);
}

export function isPlanningStatusReadinessEligible(_status?: PlanningProposalStatus): false {
  return false;
}

export function isPlanningStatusOutputEligible(_status?: PlanningProposalStatus): false {
  return false;
}

export function normalizeProjectPlanningState(
  input: unknown,
  expectedProjectId: string
): ProjectPlanningNormalizationResult {
  const issues: PlanningNormalizationIssue[] = [];
  const empty = createEmptyProjectPlanningState();
  const projectId = normalizeSingleLine(expectedProjectId, LIMITS.projectId);

  if (!isPlainObject(input)) {
    issues.push(issue("nonObjectInput", "Planning input must be an object."));
    return { planning: empty, issues };
  }

  if (input.schemaVersion !== PLANNING_SCHEMA_VERSION) {
    issues.push(issue("unsupportedSchema", "Unsupported planning schema version."));
    return { planning: empty, issues };
  }

  if (input.ruleSetId !== PLANNING_RULE_SET_ID || input.ruleSetVersion !== PLANNING_RULE_SET_VERSION) {
    issues.push(issue("invalidRecord", "Planning rule-set identifiers are invalid."));
    return { planning: empty, issues };
  }

  const sources = normalizeCollection(
    input.sources,
    "sources",
    LIMITS.sources,
    (record) => normalizeSource(record, issues)
  );
  const sourcesDeduped = removeDuplicates(sources.records, "sources", (record) => record.sourceId, issues);

  const proposals = normalizeCollection(
    input.proposals,
    "proposals",
    LIMITS.proposals,
    (record) => normalizeProposal(record, projectId, issues)
  );
  let proposalsDeduped = removeDuplicates(proposals.records, "proposals", (record) => record.proposalId, issues);

  const decisions = normalizeCollection(
    input.decisions,
    "decisions",
    LIMITS.decisions,
    (record) => normalizeDecision(record, projectId, issues)
  );
  let decisionsDeduped = removeDuplicates(decisions.records, "decisions", (record) => record.decisionId, issues);

  const dependencies = normalizeCollection(
    input.dependencies,
    "dependencies",
    LIMITS.dependencies,
    (record) => normalizeDependency(record, issues)
  );
  let dependenciesDeduped = removeDuplicates(
    dependencies.records,
    "dependencies",
    (record) => record.dependencyId,
    issues
  );

  const conflicts = normalizeCollection(
    input.conflicts,
    "conflicts",
    LIMITS.conflicts,
    (record) => normalizeConflict(record, projectId, issues)
  );
  let conflictsDeduped = removeDuplicates(conflicts.records, "conflicts", (record) => record.conflictId, issues);

  issues.push(...sources.issues, ...proposals.issues, ...decisions.issues, ...dependencies.issues, ...conflicts.issues);

  const sourceIds = new Set(sourcesDeduped.map((source) => source.sourceId));
  proposalsDeduped = proposalsDeduped.filter((proposal) => {
    if (proposal.sourceIds.some((sourceId) => !sourceIds.has(sourceId))) {
      issues.push(crossRefIssue("proposals", proposal.proposalId, "sourceIds", "Proposal references missing source IDs."));
      return false;
    }
    return true;
  });

  const proposalIds = new Set(proposalsDeduped.map((proposal) => proposal.proposalId));
  decisionsDeduped = decisionsDeduped.filter((decision) => {
    if (!proposalIds.has(decision.proposalId)) {
      issues.push(crossRefIssue("decisions", decision.decisionId, "proposalId", "Decision references a missing proposal."));
      return false;
    }
    return true;
  });

  const decisionIds = new Set(decisionsDeduped.map((decision) => decision.decisionId));
  proposalsDeduped = proposalsDeduped.filter((proposal) => {
    if (!proposal.lastDecisionId) {
      return true;
    }
    const decision = decisionsDeduped.find((candidate) => candidate.decisionId === proposal.lastDecisionId);
    if (!decision || decision.proposalId !== proposal.proposalId || decision.resultingStatus !== proposal.status) {
      issues.push(
        crossRefIssue("proposals", proposal.proposalId, "lastDecisionId", "Proposal has an invalid last decision.")
      );
      return false;
    }
    return true;
  });

  const filteredProposalIds = new Set(proposalsDeduped.map((proposal) => proposal.proposalId));
  decisionsDeduped = decisionsDeduped.filter((decision) => filteredProposalIds.has(decision.proposalId));

  dependenciesDeduped = dependenciesDeduped.filter((dependency) => {
    if (!filteredProposalIds.has(dependency.sourceProposalId)) {
      issues.push(
        crossRefIssue("dependencies", dependency.dependencyId, "sourceProposalId", "Dependency source proposal is missing.")
      );
      return false;
    }
    if (!isValidDependencyTargetReference(dependency.target, filteredProposalIds, sourceIds)) {
      issues.push(crossRefIssue("dependencies", dependency.dependencyId, "target", "Dependency target is invalid."));
      return false;
    }
    return true;
  });

  const cycleIds = findDependencyCycles(dependenciesDeduped);
  if (cycleIds.size > 0) {
    dependenciesDeduped = dependenciesDeduped.filter((dependency) => {
      if (cycleIds.has(dependency.dependencyId)) {
        issues.push(issue("dependencyCycle", "Dependency participates in a cycle.", "dependencies", dependency.dependencyId));
        return false;
      }
      return true;
    });
  }

  conflictsDeduped = conflictsDeduped.filter((conflict) => {
    const involvedReferences = conflict.involvedReferences.filter((reference) =>
      isValidInvolvedReference(reference, filteredProposalIds, sourceIds, decisionIds)
    );
    if (involvedReferences.length === 0) {
      issues.push(crossRefIssue("conflicts", conflict.conflictId, "involvedReferences", "Conflict has no valid involved references."));
      return false;
    }
    conflict.involvedReferences = involvedReferences;

    if (conflict.resolutionDecisionId && !decisionIds.has(conflict.resolutionDecisionId)) {
      issues.push(
        crossRefIssue("conflicts", conflict.conflictId, "resolutionDecisionId", "Conflict references a missing decision.")
      );
      return false;
    }

    conflict.resolutionOptionProposalIds = filterKnownIds(
      conflict.resolutionOptionProposalIds,
      filteredProposalIds,
      "conflicts",
      conflict.conflictId,
      "resolutionOptionProposalIds",
      issues
    );
    conflict.affectedProposalIds = filterKnownIds(
      conflict.affectedProposalIds,
      filteredProposalIds,
      "conflicts",
      conflict.conflictId,
      "affectedProposalIds",
      issues
    );
    return true;
  });

  const conflictIds = new Set(conflictsDeduped.map((conflict) => conflict.conflictId));
  proposalsDeduped = proposalsDeduped.filter((proposal) => {
    if (proposal.conflictIds?.some((conflictId) => !conflictIds.has(conflictId))) {
      issues.push(crossRefIssue("proposals", proposal.proposalId, "conflictIds", "Proposal references a missing conflict."));
      return false;
    }
    return true;
  });

  proposalsDeduped = normalizeAlternativeGroups(proposalsDeduped, issues);

  return {
    planning: {
      schemaVersion: PLANNING_SCHEMA_VERSION,
      ruleSetId: PLANNING_RULE_SET_ID,
      ruleSetVersion: PLANNING_RULE_SET_VERSION,
      sources: sourcesDeduped,
      proposals: proposalsDeduped,
      decisions: decisionsDeduped,
      dependencies: dependenciesDeduped,
      conflicts: conflictsDeduped
    },
    issues
  };
}

function normalizeCollection<T>(
  input: unknown,
  collection: NonNullable<PlanningNormalizationIssue["collection"]>,
  cap: number,
  normalizeRecord: (record: unknown) => T | null
): { records: T[]; issues: PlanningNormalizationIssue[] } {
  const issues: PlanningNormalizationIssue[] = [];

  if (!Array.isArray(input)) {
    issues.push(issue("invalidCollection", `${collection} must be an array.`, collection));
    return { records: [], issues };
  }

  if (input.length > cap) {
    issues.push(issue("collectionCapExceeded", `${collection} exceeds the approved collection cap.`, collection));
    return { records: [], issues };
  }

  const hasSparseEntry = hasSparseArrayEntry(input);
  if (hasSparseEntry) {
    issues.push(issue("sparseCollection", `${collection} cannot contain sparse entries.`, collection));
    return { records: [], issues };
  }

  return {
    records: input.map(normalizeRecord).filter((record): record is T => record !== null),
    issues
  };
}

function normalizeSource(input: unknown, issues: PlanningNormalizationIssue[]): PlanningSourceReference | null {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidRecord", "Source must be an object.", "sources"));
    return null;
  }
  const sourceId = normalizeUuid(input.sourceId);
  const sourceType = enumValue(input.sourceType, PLANNING_SOURCE_TYPES);
  const locator = normalizeSingleLine(input.locator, LIMITS.targetPart);
  const label = normalizeSingleLine(input.label, LIMITS.title);
  const authority = enumValue(input.authority, PLANNING_SOURCE_AUTHORITIES);
  const availability = enumValue(input.availability, PLANNING_SOURCE_AVAILABILITY);

  if (!sourceId || !sourceType || !locator || !label || !authority || !availability) {
    issues.push(issue("invalidRecord", "Source is missing required valid fields.", "sources", sourceId ?? undefined));
    return null;
  }
  if (!isValidSourceAuthority(sourceType, authority)) {
    issues.push(issue("invalidRecord", "Source authority is invalid for source type.", "sources", sourceId));
    return null;
  }

  const version = optionalSingleLine(input.version, LIMITS.shortText);
  const observedAt = optionalTimestamp(input.observedAt);
  const excerpt = optionalMultiline(input.excerpt, LIMITS.excerpt);
  if (version === null || observedAt === null || excerpt === null) {
    issues.push(issue("invalidRecord", "Source contains invalid optional metadata.", "sources", sourceId));
    return null;
  }

  return dropUndefined({
    sourceId,
    sourceType,
    locator,
    label,
    authority,
    availability,
    version,
    observedAt,
    excerpt
  });
}

function isValidSourceAuthority(sourceType: PlanningSourceType, authority: PlanningSourceAuthority): boolean {
  if (sourceType === "userAnswer") {
    return authority === "confirmed" || authority === "informational";
  }
  if (sourceType === "confirmedIntake") {
    return authority === "confirmed";
  }
  if (
    sourceType === "approvedDocument" ||
    sourceType === "platformRule" ||
    sourceType === "projectRule" ||
    sourceType === "projectTypePreset" ||
    sourceType === "readinessPrerequisite"
  ) {
    return authority === "approved";
  }
  return authority === "informational";
}

function normalizeProposal(
  input: unknown,
  expectedProjectId: string | null,
  issues: PlanningNormalizationIssue[]
): PlanningProposalRecord | null {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidRecord", "Proposal must be an object.", "proposals"));
    return null;
  }

  const proposalId = normalizeUuid(input.proposalId);
  const projectId = normalizeProjectId(input.projectId);
  const ruleId = normalizeSingleLine(input.ruleId, LIMITS.ruleId);
  const ruleVersion = normalizeSingleLine(input.ruleVersion, LIMITS.ruleId);
  const fingerprint = normalizeFingerprint(input.fingerprint);
  const target = normalizeTargetReference(input.target);
  const category = enumValue(input.category, PLANNING_CATEGORIES);
  const status = enumValue(input.status, PLANNING_STATUSES);
  const value = normalizeProposalValue(input.value, 0);
  const title = normalizeSingleLine(input.title, LIMITS.title);
  const recommendation = normalizeMultiline(input.recommendation, LIMITS.longText);
  const rationale = normalizeMultiline(input.rationale, LIMITS.longText);
  const sourceIds = normalizeUuidList(input.sourceIds, LIMITS.idsPerProposal);
  const uncertainty = enumValue(input.uncertainty, PLANNING_UNCERTAINTY_STATES);
  const restriction = enumValue(input.restriction, PLANNING_RESTRICTIONS);
  const createdAt = normalizeTimestamp(input.createdAt);
  const updatedAt = normalizeTimestamp(input.updatedAt);

  if (
    !proposalId ||
    !projectId ||
    !expectedProjectId ||
    projectId !== expectedProjectId ||
    input.proposalSchemaVersion !== PLANNING_SCHEMA_VERSION ||
    input.ruleSetId !== PLANNING_RULE_SET_ID ||
    input.ruleSetVersion !== PLANNING_RULE_SET_VERSION ||
    !ruleId ||
    !ruleVersion ||
    !fingerprint ||
    !target ||
    !category ||
    !status ||
    !value ||
    !title ||
    !recommendation ||
    !rationale ||
    !sourceIds ||
    sourceIds.length === 0 ||
    !uncertainty ||
    !restriction ||
    !createdAt ||
    !updatedAt
  ) {
    issues.push(issue("invalidRecord", "Proposal is missing required valid fields.", "proposals", proposalId ?? undefined));
    return null;
  }

  const staleReason = optionalEnum(input.staleReason, PLANNING_STALE_REASONS);
  const staleAt = optionalTimestamp(input.staleAt);
  if (status === "Stale" && (!staleReason || !staleAt)) {
    issues.push(issue("invalidRecord", "Stale proposal requires staleReason and staleAt.", "proposals", proposalId));
    return null;
  }
  if (status !== "Stale" && (input.staleReason !== undefined || input.staleAt !== undefined)) {
    issues.push(issue("invalidRecord", "Non-stale proposal cannot carry stale metadata.", "proposals", proposalId));
    return null;
  }

  const consequence = optionalMultiline(input.consequence, LIMITS.longText);
  const alternativeGroupId = optionalUuid(input.alternativeGroupId);
  const recommendedAlternative = optionalBoolean(input.recommendedAlternative);
  const supersededByProposalId = optionalUuid(input.supersededByProposalId);
  const conflictIds = optionalUuidList(input.conflictIds, LIMITS.idsPerProposal);
  const readinessRequirementIds = optionalStringList(input.readinessRequirementIds, LIMITS.idsPerProposal, LIMITS.targetPart);
  const lastDecisionId = optionalUuid(input.lastDecisionId);
  const applicableProjectTypes = optionalEnumList(input.applicableProjectTypes, []);
  const applicableDomains = optionalEnumList(input.applicableDomains, PLANNING_TARGET_DOMAINS, LIMITS.idsPerProposal);

  if (
    consequence === null ||
    alternativeGroupId === null ||
    recommendedAlternative === null ||
    supersededByProposalId === null ||
    staleReason === null ||
    staleAt === null ||
    conflictIds === null ||
    readinessRequirementIds === null ||
    lastDecisionId === null ||
    applicableProjectTypes === null ||
    applicableDomains === null
  ) {
    issues.push(issue("invalidRecord", "Proposal contains invalid optional metadata.", "proposals", proposalId));
    return null;
  }

  return dropUndefined({
    proposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId,
    ruleVersion,
    fingerprint,
    target,
    category,
    status,
    value,
    title,
    recommendation,
    rationale,
    sourceIds,
    uncertainty,
    restriction,
    createdAt,
    updatedAt,
    consequence,
    alternativeGroupId,
    recommendedAlternative,
    supersededByProposalId,
    staleReason,
    staleAt,
    conflictIds,
    readinessRequirementIds,
    lastDecisionId,
    applicableProjectTypes,
    applicableDomains
  }) as PlanningProposalRecord;
}

function normalizeDecision(
  input: unknown,
  expectedProjectId: string | null,
  issues: PlanningNormalizationIssue[]
): PlanningDecisionRecord | null {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidRecord", "Decision must be an object.", "decisions"));
    return null;
  }
  const decisionId = normalizeUuid(input.decisionId);
  const proposalId = normalizeUuid(input.proposalId);
  const projectId = normalizeProjectId(input.projectId);
  const action = enumValue(input.action, PLANNING_DECISION_ACTIONS);
  const previousStatus = enumValue(input.previousStatus, PLANNING_STATUSES);
  const resultingStatus = enumValue(input.resultingStatus, PLANNING_STATUSES);
  const origin = enumValue(input.origin, PLANNING_DECISION_ORIGINS);
  const recordedAt = normalizeTimestamp(input.recordedAt);
  if (
    !decisionId ||
    !proposalId ||
    !projectId ||
    !expectedProjectId ||
    projectId !== expectedProjectId ||
    !action ||
    !previousStatus ||
    !resultingStatus ||
    !origin ||
    !recordedAt ||
    !isValidPlanningTransition(previousStatus, resultingStatus)
  ) {
    issues.push(issue("invalidRecord", "Decision is missing required valid fields.", "decisions", decisionId ?? undefined));
    return null;
  }
  const value = input.value === undefined ? undefined : normalizeProposalValue(input.value, 0);
  const reason = optionalMultiline(input.reason, LIMITS.longText);
  const sourceIds = optionalUuidList(input.sourceIds, LIMITS.idsPerProposal);
  const supersedesDecisionId = optionalUuid(input.supersedesDecisionId);
  const ruleSetVersion = optionalSingleLine(input.ruleSetVersion, LIMITS.ruleId);
  if (
    value === null ||
    reason === null ||
    sourceIds === null ||
    supersedesDecisionId === null ||
    ruleSetVersion === null
  ) {
    issues.push(issue("invalidRecord", "Decision contains invalid optional metadata.", "decisions", decisionId));
    return null;
  }
  return dropUndefined({
    decisionId,
    proposalId,
    projectId,
    action,
    previousStatus,
    resultingStatus,
    origin,
    recordedAt,
    value,
    reason,
    sourceIds,
    supersedesDecisionId,
    ruleSetVersion
  });
}

function normalizeDependency(
  input: unknown,
  issues: PlanningNormalizationIssue[]
): PlanningDependencyRecord | null {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidRecord", "Dependency must be an object.", "dependencies"));
    return null;
  }
  const dependencyId = normalizeUuid(input.dependencyId);
  const sourceProposalId = normalizeUuid(input.sourceProposalId);
  const dependencyType = enumValue(input.dependencyType, PLANNING_DEPENDENCY_TYPES);
  const target = normalizeDependencyTarget(input.target);
  const required = typeof input.required === "boolean" ? input.required : null;
  const rationale = normalizeMultiline(input.rationale, LIMITS.longText);
  if (!dependencyId || !sourceProposalId || !dependencyType || !target || required === null || !rationale) {
    issues.push(
      issue("invalidRecord", "Dependency is missing required valid fields.", "dependencies", dependencyId ?? undefined)
    );
    return null;
  }
  return {
    dependencyId,
    sourceProposalId,
    dependencyType,
    target,
    required,
    rationale
  };
}

function normalizeConflict(input: unknown, expectedProjectId: string | null, issues: PlanningNormalizationIssue[]): PlanningConflictRecord | null {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidRecord", "Conflict must be an object.", "conflicts"));
    return null;
  }
  const conflictId = normalizeUuid(input.conflictId);
  const projectId = normalizeProjectId(input.projectId);
  const conflictType = enumValue(input.conflictType, PLANNING_CONFLICT_TYPES);
  const severity = enumValue(input.severity, PLANNING_CONFLICT_SEVERITIES);
  const status = enumValue(input.status, PLANNING_CONFLICT_STATUSES);
  const involvedReferences = normalizeInvolvedReferences(input.involvedReferences);
  const explanation = normalizeMultiline(input.explanation, LIMITS.longText);
  const blocking = typeof input.blocking === "boolean" ? input.blocking : null;
  const createdAt = normalizeTimestamp(input.createdAt);
  if (
    !conflictId ||
    !projectId ||
    !expectedProjectId ||
    projectId !== expectedProjectId ||
    !conflictType ||
    !severity ||
    !status ||
    !involvedReferences ||
    involvedReferences.length === 0 ||
    !explanation ||
    blocking === null ||
    !createdAt ||
    (severity === "blocking" && blocking !== true) ||
    (severity === "informational" && blocking !== false)
  ) {
    issues.push(issue("invalidRecord", "Conflict is missing required valid fields.", "conflicts", conflictId ?? undefined));
    return null;
  }

  const resolutionOptionProposalIds = optionalUuidList(input.resolutionOptionProposalIds, LIMITS.resolutionOptions);
  const resolvedAt = optionalTimestamp(input.resolvedAt);
  const resolutionDecisionId = optionalUuid(input.resolutionDecisionId);
  const affectedProposalIds = optionalUuidList(input.affectedProposalIds, LIMITS.resolutionOptions);
  if (
    resolutionOptionProposalIds === null ||
    resolvedAt === null ||
    resolutionDecisionId === null ||
    affectedProposalIds === null
  ) {
    issues.push(issue("invalidRecord", "Conflict contains invalid optional metadata.", "conflicts", conflictId));
    return null;
  }

  return dropUndefined({
    conflictId,
    projectId,
    conflictType,
    severity,
    status,
    involvedReferences,
    explanation,
    blocking,
    createdAt,
    resolutionOptionProposalIds,
    resolvedAt,
    resolutionDecisionId,
    affectedProposalIds
  });
}

function normalizeTargetReference(input: unknown): PlanningTargetReference | null {
  if (!isPlainObject(input)) {
    return null;
  }
  const kind = enumValue(input.kind, PLANNING_TARGET_KINDS);
  const domain = enumValue(input.domain, PLANNING_TARGET_DOMAINS);
  const targetKey = normalizeSingleLine(input.targetKey, LIMITS.targetPart);
  const entityId = optionalSingleLine(input.entityId, LIMITS.targetPart);
  const fieldKey = optionalSingleLine(input.fieldKey, LIMITS.targetPart);
  const operation = optionalEnum(input.operation, PLANNING_TARGET_OPERATIONS);
  if (!kind || !domain || !targetKey || entityId === null || fieldKey === null || operation === null) {
    return null;
  }
  if (containsArrayPosition(targetKey) || containsArrayPosition(entityId) || containsArrayPosition(fieldKey)) {
    return null;
  }
  return dropUndefined({ kind, domain, targetKey, entityId, fieldKey, operation });
}

function normalizeProposalValue(input: unknown, structuredDepth: number): PlanningProposalValue | null {
  if (!isPlainObject(input)) {
    return null;
  }
  switch (input.kind) {
    case "text": {
      const value = normalizeMultiline(input.value, LIMITS.textValue);
      return value ? { kind: "text", value } : null;
    }
    case "boolean":
      return typeof input.value === "boolean" ? { kind: "boolean", value: input.value } : null;
    case "enum": {
      const value = normalizeSingleLine(input.value, LIMITS.shortText);
      return value ? { kind: "enum", value } : null;
    }
    case "stringList": {
      const value = normalizeStringList(input.value, LIMITS.listItems, LIMITS.listItem);
      return value ? { kind: "stringList", value } : null;
    }
    case "structuredRecord":
    case "recordCreation": {
      const nextDepth = structuredDepth + 1;
      if (nextDepth > LIMITS.structuredDepth) {
        return null;
      }
      const value = normalizeStructuredRecord(input.value, nextDepth);
      if (!value || JSON.stringify(value).length > LIMITS.structuredSize) {
        return null;
      }
      return { kind: input.kind, value } as PlanningStructuredRecordValue | PlanningRecordCreationValue;
    }
    case "structuredRecordList": {
      const nextDepth = structuredDepth + 1;
      if (nextDepth > LIMITS.structuredDepth) {
        return null;
      }
      const value = normalizeStructuredRecordList(input.value, nextDepth);
      if (!value || JSON.stringify(value).length > LIMITS.structuredSize) {
        return null;
      }
      return { kind: "structuredRecordList", value };
    }
    case "notApplicable": {
      const reason = normalizeMultiline(input.reason, LIMITS.longText);
      return reason ? { kind: "notApplicable", reason } : null;
    }
    case "deferred": {
      const reason = normalizeMultiline(input.reason, LIMITS.longText);
      return reason ? { kind: "deferred", reason } : null;
    }
    case "clarification": {
      const question = normalizeMultiline(input.question, LIMITS.longText);
      return question ? { kind: "clarification", question } : null;
    }
    default:
      return null;
  }
}

function normalizeStructuredRecord(input: unknown, structuredDepth: number): Record<string, PlanningProposalValue> | null {
  if (!isPlainObject(input)) {
    return null;
  }
  const entries = Object.entries(input);
  if (entries.length > LIMITS.structuredKeys) {
    return null;
  }
  const normalized: Record<string, PlanningProposalValue> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = normalizeSingleLine(rawKey, LIMITS.shortText);
    const value = normalizeProposalValue(rawValue, structuredDepth);
    if (!key || !value || key === "__proto__" || key === "constructor" || key === "prototype") {
      return null;
    }
    normalized[key] = value;
  }
  return normalized;
}

function normalizeStructuredRecordList(
  input: unknown,
  structuredDepth: number
): readonly Record<string, PlanningProposalValue>[] | null {
  if (!Array.isArray(input) || input.length > LIMITS.listItems || hasSparseArrayEntry(input)) {
    return null;
  }
  const normalized = input.map((row) => normalizeStructuredRecord(row, structuredDepth));
  return normalized.every((row): row is Record<string, PlanningProposalValue> => row !== null)
    ? normalized
    : null;
}

function normalizeDependencyTarget(input: unknown): PlanningDependencyTarget | null {
  if (!isPlainObject(input)) {
    return null;
  }
  switch (input.kind) {
    case "proposalId": {
      const proposalId = normalizeUuid(input.proposalId);
      return proposalId ? { kind: "proposalId", proposalId } : null;
    }
    case "targetReference": {
      const target = normalizeTargetReference(input.target);
      return target ? { kind: "targetReference", target } : null;
    }
    case "sourceId": {
      const sourceId = normalizeUuid(input.sourceId);
      return sourceId ? { kind: "sourceId", sourceId } : null;
    }
    case "readinessRequirementId": {
      const readinessRequirementId = normalizeSingleLine(input.readinessRequirementId, LIMITS.targetPart);
      return readinessRequirementId ? { kind: "readinessRequirementId", readinessRequirementId } : null;
    }
    default:
      return null;
  }
}

function normalizeInvolvedReferences(input: unknown): PlanningInvolvedReference[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > LIMITS.involvedReferences) {
    return null;
  }
  const references: PlanningInvolvedReference[] = [];
  for (const reference of input) {
    if (!isPlainObject(reference)) {
      return null;
    }
    if (reference.kind === "proposalId") {
      const proposalId = normalizeUuid(reference.proposalId);
      if (!proposalId) return null;
      references.push({ kind: "proposalId", proposalId });
    } else if (reference.kind === "sourceId") {
      const sourceId = normalizeUuid(reference.sourceId);
      if (!sourceId) return null;
      references.push({ kind: "sourceId", sourceId });
    } else if (reference.kind === "decisionId") {
      const decisionId = normalizeUuid(reference.decisionId);
      if (!decisionId) return null;
      references.push({ kind: "decisionId", decisionId });
    } else if (reference.kind === "targetReference") {
      const target = normalizeTargetReference(reference.target);
      if (!target) return null;
      references.push({ kind: "targetReference", target });
    } else {
      return null;
    }
  }
  return references;
}

function normalizeAlternativeGroups(
  proposals: PlanningProposalRecord[],
  issues: PlanningNormalizationIssue[]
): PlanningProposalRecord[] {
  const byGroup = new Map<string, PlanningProposalRecord[]>();
  for (const proposal of proposals) {
    if (!proposal.alternativeGroupId) {
      continue;
    }
    byGroup.set(proposal.alternativeGroupId, [...(byGroup.get(proposal.alternativeGroupId) ?? []), proposal]);
  }
  const oversizeProposalIds = new Set<string>();
  const clearRecommendationProposalIds = new Set<string>();
  for (const [groupId, members] of byGroup) {
    if (members.length > LIMITS.alternativesPerGroup) {
      issues.push(issue("alternativeGroupTooLarge", "Alternative group exceeds the approved cap.", "proposals", groupId));
      members.forEach((proposal) => oversizeProposalIds.add(proposal.proposalId));
      continue;
    }
    const recommended = members.filter((proposal) => proposal.recommendedAlternative === true);
    if (recommended.length > 1) {
      issues.push(
        issue("multipleRecommendedAlternatives", "Alternative group has multiple recommendations.", "proposals", groupId)
      );
      recommended.forEach((proposal) => clearRecommendationProposalIds.add(proposal.proposalId));
    }
  }
  return proposals
    .filter((proposal) => !oversizeProposalIds.has(proposal.proposalId))
    .map((proposal) =>
      clearRecommendationProposalIds.has(proposal.proposalId)
        ? dropUndefined({ ...proposal, recommendedAlternative: undefined })
        : proposal
    );
}

function removeDuplicates<T>(
  records: T[],
  collection: NonNullable<PlanningNormalizationIssue["collection"]>,
  getId: (record: T) => string,
  issues: PlanningNormalizationIssue[]
): T[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const id = getId(record);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const duplicates = new Set([...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
  for (const duplicatedId of duplicates) {
    issues.push(issue("duplicateId", "Duplicate ID removed from collection.", collection, duplicatedId));
  }
  return records.filter((record) => !duplicates.has(getId(record)));
}

function findDependencyCycles(dependencies: PlanningDependencyRecord[]): Set<string> {
  const edges = new Map<string, { to: string; dependencyId: string }[]>();
  for (const dependency of dependencies) {
    if (dependency.target.kind !== "proposalId") {
      continue;
    }
    edges.set(dependency.sourceProposalId, [
      ...(edges.get(dependency.sourceProposalId) ?? []),
      { to: dependency.target.proposalId, dependencyId: dependency.dependencyId }
    ]);
  }

  const cycleIds = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(proposalId: string, path: string[], edgePath: string[]) {
    if (visiting.has(proposalId)) {
      const start = path.indexOf(proposalId);
      edgePath.slice(Math.max(0, start)).forEach((dependencyId) => cycleIds.add(dependencyId));
      return;
    }
    if (visited.has(proposalId) || path.length > 100) {
      return;
    }
    visiting.add(proposalId);
    const nextEdges = edges.get(proposalId) ?? [];
    for (const edge of nextEdges) {
      visit(edge.to, [...path, proposalId], [...edgePath, edge.dependencyId]);
    }
    visiting.delete(proposalId);
    visited.add(proposalId);
  }

  for (const proposalId of edges.keys()) {
    visit(proposalId, [], []);
  }
  return cycleIds;
}

function isValidDependencyTargetReference(
  target: PlanningDependencyTarget,
  proposalIds: Set<string>,
  sourceIds: Set<string>
): boolean {
  if (target.kind === "proposalId") {
    return proposalIds.has(target.proposalId);
  }
  if (target.kind === "sourceId") {
    return sourceIds.has(target.sourceId);
  }
  return true;
}

function isValidInvolvedReference(
  reference: PlanningInvolvedReference,
  proposalIds: Set<string>,
  sourceIds: Set<string>,
  decisionIds: Set<string>
): boolean {
  if (reference.kind === "proposalId") return proposalIds.has(reference.proposalId);
  if (reference.kind === "sourceId") return sourceIds.has(reference.sourceId);
  if (reference.kind === "decisionId") return decisionIds.has(reference.decisionId);
  return true;
}

function filterKnownIds(
  ids: readonly string[] | undefined,
  knownIds: Set<string>,
  collection: NonNullable<PlanningNormalizationIssue["collection"]>,
  recordId: string,
  field: string,
  issues: PlanningNormalizationIssue[]
): readonly string[] | undefined {
  if (!ids) return undefined;
  const filtered = ids.filter((id) => knownIds.has(id));
  if (filtered.length !== ids.length) {
    issues.push(crossRefIssue(collection, recordId, field, "Unknown references were removed."));
  }
  return filtered;
}

function normalizeUuid(input: unknown): string | null {
  const value = normalizeSingleLine(input, LIMITS.recordId)?.toLowerCase();
  return value && UUID_PATTERN.test(value) ? value : null;
}

function optionalUuid(input: unknown): string | undefined | null {
  return input === undefined ? undefined : normalizeUuid(input);
}

function normalizeFingerprint(input: unknown): string | null {
  const value = normalizeSingleLine(input, 64)?.toLowerCase();
  return value && FINGERPRINT_PATTERN.test(value) ? value : null;
}

function normalizeProjectId(input: unknown): string | null {
  return normalizeSingleLine(input, LIMITS.projectId);
}

function normalizeUuidList(input: unknown, cap: number): readonly string[] | null {
  if (!Array.isArray(input) || input.length > cap || hasSparseArrayEntry(input)) {
    return null;
  }
  const normalized = input.map(normalizeUuid);
  return normalized.every(Boolean) ? (normalized as string[]) : null;
}

function optionalUuidList(input: unknown, cap: number): readonly string[] | undefined | null {
  return input === undefined ? undefined : normalizeUuidList(input, cap);
}

function normalizeStringList(input: unknown, cap: number, itemLimit: number): readonly string[] | null {
  if (!Array.isArray(input) || input.length > cap || hasSparseArrayEntry(input)) {
    return null;
  }
  const normalized = input.map((item) => normalizeSingleLine(item, itemLimit));
  return normalized.every(Boolean) ? (normalized as string[]) : null;
}

function optionalStringList(input: unknown, cap: number, itemLimit: number): readonly string[] | undefined | null {
  return input === undefined ? undefined : normalizeStringList(input, cap, itemLimit);
}

function optionalEnumList<T extends string>(
  input: unknown,
  allowedValues: readonly T[],
  cap = 100
): readonly T[] | undefined | null {
  if (input === undefined) return undefined;
  if (!Array.isArray(input) || input.length > cap || hasSparseArrayEntry(input)) return null;
  if (allowedValues.length === 0) {
    return input.every((item) => typeof item === "string") ? (input as T[]) : null;
  }
  const normalized = input.map((item) => enumValue(item, allowedValues));
  return normalized.every(Boolean) ? (normalized as T[]) : null;
}

function enumValue<T extends string>(input: unknown, allowedValues: readonly T[]): T | null {
  return typeof input === "string" && (allowedValues as readonly string[]).includes(input) ? (input as T) : null;
}

function optionalEnum<T extends string>(input: unknown, allowedValues: readonly T[]): T | undefined | null {
  return input === undefined ? undefined : enumValue(input, allowedValues);
}

function normalizeTimestamp(input: unknown): string | null {
  if (typeof input !== "string" || !ISO_WITH_TIMEZONE_PATTERN.test(input)) {
    return null;
  }
  const date = new Date(input);
  if (!Number.isFinite(date.getTime()) || !hasValidIsoDateParts(input)) {
    return null;
  }
  if (!isValidTimezoneOffset(input)) {
    return null;
  }
  return date.toISOString();
}

function optionalTimestamp(input: unknown): string | undefined | null {
  return input === undefined ? undefined : normalizeTimestamp(input);
}

function isValidTimezoneOffset(value: string): boolean {
  const match = value.match(/([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    return value.endsWith("Z");
  }
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  return hours <= 23 && minutes <= 59;
}

function hasValidIsoDateParts(value: string): boolean {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(?:Z|[+-]\d{2}:\d{2})$/
  );
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, millisecondText = "000"] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const millisecond = Number(millisecondText);
  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  return (
    localDate.getUTCFullYear() === year &&
    localDate.getUTCMonth() === month - 1 &&
    localDate.getUTCDate() === day &&
    localDate.getUTCHours() === hour &&
    localDate.getUTCMinutes() === minute &&
    localDate.getUTCSeconds() === second &&
    localDate.getUTCMilliseconds() === millisecond
  );
}

function normalizeSingleLine(input: unknown, limit: number): string | null {
  if (typeof input !== "string") return null;
  const normalized = normalizeLineEndings(input).trim();
  if (!normalized || normalized.length > limit || /[\r\n]/.test(normalized) || hasDisallowedControls(normalized)) {
    return null;
  }
  return isSafeText(normalized) ? normalized : null;
}

function optionalSingleLine(input: unknown, limit: number): string | undefined | null {
  return input === undefined ? undefined : normalizeSingleLine(input, limit);
}

function normalizeMultiline(input: unknown, limit: number): string | null {
  if (typeof input !== "string") return null;
  const normalized = normalizeLineEndings(input).trim();
  if (!normalized || normalized.length > limit || hasDisallowedControls(normalized)) {
    return null;
  }
  return isSafeText(normalized) ? normalized : null;
}

function optionalMultiline(input: unknown, limit: number): string | undefined | null {
  return input === undefined ? undefined : normalizeMultiline(input, limit);
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function hasDisallowedControls(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

function isSafeText(value: string): boolean {
  const lower = value.toLowerCase();
  if (/<\s*script\b/.test(lower) || /javascript\s*:/.test(lower) || /\son[a-z]+\s*=/.test(lower)) {
    return false;
  }
  if (/^\s*(function\s+\w*|\(?\s*[\w,\s]*\)?\s*=>|class\s+\w+|import\s+.+\s+from\s+|export\s+)/m.test(value)) {
    return false;
  }
  if (/^\s*(set|collect|patch|submitform|navigate|remove|updatecontext)\s*\(/im.test(value)) {
    return false;
  }
  if (/^\s*(screens?|controls?|properties?|items?|onselect):\s*$/im.test(value)) {
    return false;
  }
  if (/^\s*[\w.-]+\s*:\s*[\w[{]/m.test(value) && /(?:\n\s+[\w.-]+\s*:|\n\s*-\s+)/.test(value)) {
    return false;
  }
  return true;
}

function containsArrayPosition(value: string | undefined): boolean {
  return Boolean(value && (/\[\d+\]/.test(value) || /(?:^|[./])\d+(?:[./]|$)/.test(value)));
}

function hasSparseArrayEntry(input: readonly unknown[]): boolean {
  for (let index = 0; index < input.length; index += 1) {
    if (!(index in input)) {
      return true;
    }
  }
  return false;
}

function optionalBoolean(input: unknown): boolean | undefined | null {
  return input === undefined ? undefined : typeof input === "boolean" ? input : null;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function issue(
  code: PlanningIssueCode,
  message: string,
  collection?: PlanningNormalizationIssue["collection"],
  recordId?: string,
  field?: string
): PlanningNormalizationIssue {
  return dropUndefined({ code, collection, recordId, field, message });
}

function crossRefIssue(
  collection: NonNullable<PlanningNormalizationIssue["collection"]>,
  recordId: string,
  field: string,
  message: string
): PlanningNormalizationIssue {
  return issue("invalidCrossReference", message, collection, recordId, field);
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
