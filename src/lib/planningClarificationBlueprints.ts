import type { PlanningClarificationDraft } from "./planningClarificationDrafts";
import type { PhaseGateId } from "./phaseGates";
import {
  getPlanningRuleById,
  type PlanningClarificationRule
} from "./planningRules";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  type PlanningClarificationValue,
  type PlanningProposalCategory,
  type PlanningProposalStatus,
  type PlanningRestriction,
  type PlanningSourceAuthority,
  type PlanningSourceAvailability,
  type PlanningSourceType,
  type PlanningTargetDomain,
  type PlanningTargetReference,
  type PlanningUncertainty
} from "./planningProposals";
import type { PowerPlatformGateStatus, ProjectType } from "../types/project";

export interface PlanningClarificationBlueprintGenerationInput {
  projectId: string;
  drafts: readonly PlanningClarificationDraft[];
}

export type PlanningClarificationSourceBlueprintType = Extract<
  PlanningSourceType,
  "projectRule" | "readinessPrerequisite"
>;

export interface PlanningClarificationSourceBlueprint {
  sourceKey: string;
  sourceType: PlanningClarificationSourceBlueprintType;
  locator: string;
  label: string;
  authority: Extract<PlanningSourceAuthority, "approved">;
  availability: Extract<PlanningSourceAvailability, "current">;
  version?: string;
  excerpt?: string;
}

export interface PlanningClarificationProposalBlueprint {
  proposalKey: string;
  projectId: string;
  ruleSetId: typeof PLANNING_RULE_SET_ID;
  ruleSetVersion: typeof PLANNING_RULE_SET_VERSION;
  ruleId: string;
  ruleVersion: string;
  target: PlanningTargetReference & {
    targetKey: PhaseGateId;
    kind: "readinessRequirement";
    operation: "clarificationOnly";
  };
  category: Extract<PlanningProposalCategory, "clarification">;
  status: Extract<PlanningProposalStatus, "Needs Clarification">;
  value: PlanningClarificationValue;
  title: string;
  recommendation: string;
  rationale: string;
  sourceKeys: readonly string[];
  uncertainty: PlanningUncertainty;
  restriction: PlanningRestriction;
  consequence: string;
  readinessRequirementIds: readonly PhaseGateId[];
  applicableProjectTypes: readonly Extract<ProjectType, "powerAppsCanvas">[];
  applicableDomains: readonly PlanningTargetDomain[];
  fingerprintInput: string;
}

export interface PlanningClarificationFingerprintInput {
  schemaVersion: typeof PLANNING_SCHEMA_VERSION;
  ruleSetId: typeof PLANNING_RULE_SET_ID;
  ruleSetVersion: typeof PLANNING_RULE_SET_VERSION;
  projectId: string;
  ruleId: string;
  ruleVersion: string;
  target: {
    kind: "readinessRequirement";
    domain: PlanningTargetDomain;
    targetKey: PhaseGateId;
    entityId: string | null;
    fieldKey: string | null;
    operation: "clarificationOnly";
  };
  category: Extract<PlanningProposalCategory, "clarification">;
  status: Extract<PlanningProposalStatus, "Needs Clarification">;
  value: PlanningClarificationValue;
  title: string;
  recommendation: string;
  rationale: string;
  consequence: string;
  sourceEvidence: readonly PlanningClarificationFingerprintSourceEvidence[];
  uncertainty: PlanningUncertainty;
  restriction: PlanningRestriction;
  readinessRequirementIds: readonly PhaseGateId[];
  applicableProjectTypes: readonly Extract<ProjectType, "powerAppsCanvas">[];
  applicableDomains: readonly PlanningTargetDomain[];
}

export interface PlanningClarificationFingerprintSourceEvidence {
  sourceKey: string;
  sourceType: PlanningClarificationSourceBlueprintType;
  locator: string;
  label: string;
  authority: Extract<PlanningSourceAuthority, "approved">;
  availability: Extract<PlanningSourceAvailability, "current">;
  version: string | null;
  excerpt: string | null;
}

export type PlanningClarificationBlueprintGenerationIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "invalidDrafts"
  | "invalidDraft"
  | "projectIdMismatch"
  | "unknownRule"
  | "ruleMismatch"
  | "invalidDraftKey"
  | "duplicateDraftKey"
  | "ineligibleGateStatus"
  | "invalidSourceBlueprint"
  | "conflictingSourceBlueprint"
  | "duplicateProposalKey"
  | "invalidFingerprintInput";

export interface PlanningClarificationBlueprintGenerationIssue {
  code: PlanningClarificationBlueprintGenerationIssueCode;
  message: string;
  draftKey?: string;
  ruleId?: string;
  sourceKey?: string;
  proposalKey?: string;
  field?: string;
}

export interface PlanningClarificationBlueprintGenerationResult {
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
  issues: readonly PlanningClarificationBlueprintGenerationIssue[];
}

const CANVAS_PROJECT_TYPE = "powerAppsCanvas" satisfies ProjectType;
const PROPOSAL_STATUS = "Needs Clarification" satisfies PlanningProposalStatus;
const RECOMMENDATION = "Answer the clarification question and provide the applicable confirmation source.";
const APPROVED_AUTHORITY = "approved" satisfies PlanningSourceAuthority;
const CURRENT_AVAILABILITY = "current" satisfies PlanningSourceAvailability;

const ELIGIBLE_UNRESOLVED_STATUSES = [
  "notStarted",
  "missingInformation",
  "reviewNeeded",
  "manualValidationRequired",
  "inProgress",
  "blocked",
  "failed"
] as const satisfies readonly PowerPlatformGateStatus[];

export function generatePlanningClarificationBlueprints(input: unknown): PlanningClarificationBlueprintGenerationResult {
  const issues: PlanningClarificationBlueprintGenerationIssue[] = [];
  if (!isPlainObject(input)) {
    return result([], [], [issue("invalidInput", "Clarification blueprint input must be an object.")]);
  }

  const projectId = validateProjectId(input.projectId, issues);
  const drafts = validateDraftArray(input.drafts, issues);
  if (!projectId || !drafts) {
    return result([], [], issues);
  }

  const duplicateDraftKeys = collectDuplicateDraftKeys(drafts);
  const duplicateProposalKeys = collectDuplicateProposalKeys(drafts);
  reportRawSourceConflicts(drafts, issues);
  const validDrafts: PlanningClarificationDraft[] = [];

  for (const rawDraft of drafts) {
    const draft = validateDraft(rawDraft, projectId, duplicateDraftKeys, duplicateProposalKeys, issues);
    if (draft) {
      validDrafts.push(draft);
    }
  }

  const sourceCandidates = validDrafts.flatMap(createSourceBlueprints);
  const sourceState = deduplicateSources(sourceCandidates, issues);
  const proposalCandidates: PlanningClarificationProposalBlueprint[] = [];

  for (const draft of sortDrafts(validDrafts)) {
    const proposalKey = proposalKeyForDraft(draft);
    if (duplicateProposalKeys.has(proposalKey)) {
      continue;
    }

    const projectRuleSourceKey = projectRuleSourceKeyForDraft(draft);
    const readinessSourceKey = readinessSourceKeyForDraft(draft);
    if (sourceState.conflictingSourceKeys.has(projectRuleSourceKey) || sourceState.conflictingSourceKeys.has(readinessSourceKey)) {
      continue;
    }

    const projectRuleSource = sourceState.sourcesByKey.get(projectRuleSourceKey);
    const readinessSource = sourceState.sourcesByKey.get(readinessSourceKey);
    if (!projectRuleSource || !readinessSource) {
      continue;
    }

    const proposal = createProposalBlueprint(draft, [projectRuleSource, readinessSource]);
    if (!proposal.fingerprintInput) {
      issues.push(issue("invalidFingerprintInput", "Canonical fingerprint input must be a non-empty string.", draft.draftKey, draft.ruleId, undefined, proposal.proposalKey, "fingerprintInput"));
      continue;
    }
    proposalCandidates.push(proposal);
  }

  return result(
    [...sourceState.sourcesByKey.values()].sort((first, second) => first.sourceKey.localeCompare(second.sourceKey)),
    sortProposals(proposalCandidates),
    issues
  );
}

function validateProjectId(
  input: unknown,
  issues: PlanningClarificationBlueprintGenerationIssue[]
): string | null {
  if (
    typeof input !== "string" ||
    input.trim().length === 0 ||
    input.length > 200 ||
    /[\r\n]/.test(input)
  ) {
    issues.push(issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, undefined, "projectId"));
    return null;
  }
  return input;
}

function validateDraftArray(
  input: unknown,
  issues: PlanningClarificationBlueprintGenerationIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue("invalidDrafts", "Drafts must be an array.", undefined, undefined, undefined, undefined, "drafts"));
    return null;
  }
  return input;
}

function validateDraft(
  input: unknown,
  projectId: string,
  duplicateDraftKeys: ReadonlySet<string>,
  duplicateProposalKeys: ReadonlySet<string>,
  issues: PlanningClarificationBlueprintGenerationIssue[]
): PlanningClarificationDraft | null {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidDraft", "Draft must be an object.", undefined, undefined, undefined, undefined, "drafts"));
    return null;
  }

  const draftKey = typeof input.draftKey === "string" ? input.draftKey : undefined;
  const ruleId = typeof input.ruleId === "string" ? input.ruleId : undefined;
  const rule = ruleId ? getPlanningRuleById(ruleId) : undefined;

  if (input.projectId !== projectId) {
    issues.push(issue("projectIdMismatch", "Draft project ID must exactly match the generation input project ID.", draftKey, ruleId, undefined, undefined, "projectId"));
    return null;
  }

  if (!ruleId || !rule) {
    issues.push(issue("unknownRule", "Draft must reference an active clarification rule.", draftKey, ruleId, undefined, undefined, "ruleId"));
    return null;
  }

  if (!rule.applicableProjectTypes.includes(CANVAS_PROJECT_TYPE)) {
    issues.push(issue("ruleMismatch", "Draft rule must apply to the canonical Power Apps Canvas project type.", draftKey, ruleId, undefined, undefined, "applicableProjectTypes"));
    return null;
  }

  const targetKey = readTargetKey(input.target);
  const expectedDraftKey = `${ruleId}|${targetKey ?? ""}`;
  const proposalKey = proposalKeyFromUnknown(input);
  if (draftKey !== expectedDraftKey || draftKey !== `${rule.ruleId}|${rule.target.targetKey}`) {
    issues.push(issue("invalidDraftKey", "Draft key must exactly match rule ID and target gate.", draftKey, ruleId, undefined, undefined, "draftKey"));
    return null;
  }

  if (duplicateDraftKeys.has(draftKey)) {
    issues.push(issue("duplicateDraftKey", "Draft key must be unique.", draftKey, ruleId, undefined, undefined, "draftKey"));
    if (proposalKey && duplicateProposalKeys.has(proposalKey)) {
      issues.push(issue("duplicateProposalKey", "Proposal key must be unique.", draftKey, ruleId, undefined, proposalKey, "proposalKey"));
    }
    return null;
  }

  if (proposalKey && duplicateProposalKeys.has(proposalKey)) {
    issues.push(issue("duplicateProposalKey", "Proposal key must be unique.", draftKey, ruleId, undefined, proposalKey, "proposalKey"));
    return null;
  }

  const mismatchField = findRuleMismatch(input, rule);
  if (mismatchField) {
    issues.push(issue("ruleMismatch", "Draft fields must exactly match the registered rule.", draftKey, ruleId, undefined, undefined, mismatchField));
    return null;
  }

  const gateStatus = input.gateStatus;
  if (!isEligibleGateStatus(gateStatus, rule)) {
    issues.push(issue("ineligibleGateStatus", "Draft gate status is not eligible for materialization blueprints.", draftKey, ruleId, undefined, undefined, "gateStatus"));
    return null;
  }

  if (!isBoundedPlainText(input.gateBlockingReason, 500) || !isBoundedPlainText(input.gateSourceSection, 500)) {
    issues.push(issue("invalidSourceBlueprint", "Gate source section and blocking reason must be bounded plain text.", draftKey, ruleId, undefined, undefined, "sourceText"));
    return null;
  }

  return cloneDraft(input as unknown as PlanningClarificationDraft);
}

function findRuleMismatch(input: Record<string, unknown>, rule: PlanningClarificationRule): string | null {
  if (input.ruleVersion !== rule.ruleVersion) return "ruleVersion";
  if (!sameTarget(input.target, rule.target)) return "target";
  if (input.category !== rule.category) return "category";
  if (input.restriction !== rule.restriction) return "restriction";
  if (input.uncertainty !== rule.uncertainty) return "uncertainty";
  if (!isPlainObject(input.value) || input.value.kind !== "clarification" || input.value.question !== rule.question) return "value";
  if (input.title !== rule.title) return "title";
  if (input.question !== rule.question) return "question";
  if (input.rationale !== rule.rationale) return "rationale";
  if (input.consequence !== rule.consequence) return "consequence";
  if (input.priority !== rule.priority) return "priority";
  if (!sameSourceRequirements(input.acceptableSources, rule.acceptableSources)) return "acceptableSources";
  if (input.notApplicableAllowed !== rule.notApplicableAllowed) return "notApplicableAllowed";
  if (input.deferralAllowed !== rule.deferralAllowed) return "deferralAllowed";
  if (input.architectApprovalRequired !== rule.architectApprovalRequired) return "architectApprovalRequired";
  return null;
}

function createSourceBlueprints(draft: PlanningClarificationDraft): PlanningClarificationSourceBlueprint[] {
  return [
    {
      sourceKey: projectRuleSourceKeyForDraft(draft),
      sourceType: "projectRule",
      locator: `planning-rule:${draft.ruleId}`,
      label: draft.title,
      authority: APPROVED_AUTHORITY,
      availability: CURRENT_AVAILABILITY,
      version: draft.ruleVersion
    },
    {
      sourceKey: readinessSourceKeyForDraft(draft),
      sourceType: "readinessPrerequisite",
      locator: `phase-gate:${draft.target.targetKey}`,
      label: draft.gateSourceSection,
      authority: APPROVED_AUTHORITY,
      availability: CURRENT_AVAILABILITY,
      excerpt: draft.gateBlockingReason
    }
  ];
}

function deduplicateSources(
  sources: readonly PlanningClarificationSourceBlueprint[],
  issues: PlanningClarificationBlueprintGenerationIssue[]
): {
  sourcesByKey: Map<string, PlanningClarificationSourceBlueprint>;
  conflictingSourceKeys: Set<string>;
} {
  const sourcesByKey = new Map<string, PlanningClarificationSourceBlueprint>();
  const semanticByKey = new Map<string, string>();
  const conflictingSourceKeys = new Set<string>();

  for (const source of sources) {
    if (!isValidSourceBlueprint(source)) {
      issues.push(issue("invalidSourceBlueprint", "Source blueprint text or authority is invalid.", undefined, undefined, source.sourceKey, undefined, "source"));
      conflictingSourceKeys.add(source.sourceKey);
      sourcesByKey.delete(source.sourceKey);
      continue;
    }

    const semantic = sourceSemantic(source);
    const previous = semanticByKey.get(source.sourceKey);
    if (previous === undefined) {
      semanticByKey.set(source.sourceKey, semantic);
      sourcesByKey.set(source.sourceKey, cloneSource(source));
      continue;
    }
    if (previous !== semantic) {
      issues.push(issue("conflictingSourceBlueprint", "Duplicate source blueprint key has conflicting semantic content.", undefined, undefined, source.sourceKey, undefined, "sourceKey"));
      conflictingSourceKeys.add(source.sourceKey);
      sourcesByKey.delete(source.sourceKey);
    }
  }

  return { sourcesByKey, conflictingSourceKeys };
}

function createProposalBlueprint(
  draft: PlanningClarificationDraft,
  sourceBlueprints: readonly PlanningClarificationSourceBlueprint[]
): PlanningClarificationProposalBlueprint {
  const sourceKeys = [
    projectRuleSourceKeyForDraft(draft),
    readinessSourceKeyForDraft(draft)
  ];
  const base = {
    proposalKey: proposalKeyForDraft(draft),
    projectId: draft.projectId,
    ruleSetId: PLANNING_RULE_SET_ID,
    ruleSetVersion: PLANNING_RULE_SET_VERSION,
    ruleId: draft.ruleId,
    ruleVersion: draft.ruleVersion,
    target: cloneTarget(draft.target),
    category: "clarification",
    status: PROPOSAL_STATUS,
    value: { ...draft.value },
    title: draft.title,
    recommendation: RECOMMENDATION,
    rationale: draft.rationale,
    sourceKeys,
    uncertainty: draft.uncertainty,
    restriction: draft.restriction,
    consequence: draft.consequence,
    readinessRequirementIds: [draft.target.targetKey],
    applicableProjectTypes: [CANVAS_PROJECT_TYPE],
    applicableDomains: [draft.target.domain]
  } satisfies Omit<PlanningClarificationProposalBlueprint, "fingerprintInput">;

  return {
    ...base,
    fingerprintInput: createFingerprintInput(base, sourceBlueprints)
  };
}

function createFingerprintInput(
  proposal: Omit<PlanningClarificationProposalBlueprint, "fingerprintInput">,
  sourceBlueprints: readonly PlanningClarificationSourceBlueprint[]
): string {
  const canonical: PlanningClarificationFingerprintInput = {
    schemaVersion: PLANNING_SCHEMA_VERSION,
    ruleSetId: proposal.ruleSetId,
    ruleSetVersion: proposal.ruleSetVersion,
    projectId: proposal.projectId,
    ruleId: proposal.ruleId,
    ruleVersion: proposal.ruleVersion,
    target: {
      kind: proposal.target.kind,
      domain: proposal.target.domain,
      targetKey: proposal.target.targetKey,
      entityId: proposal.target.entityId ?? null,
      fieldKey: proposal.target.fieldKey ?? null,
      operation: proposal.target.operation
    },
    category: proposal.category,
    status: proposal.status,
    value: proposal.value,
    title: proposal.title,
    recommendation: proposal.recommendation,
    rationale: proposal.rationale,
    consequence: proposal.consequence,
    sourceEvidence: [...sourceBlueprints]
      .sort((first, second) => first.sourceKey.localeCompare(second.sourceKey))
      .map(canonicalSourceEvidence),
    uncertainty: proposal.uncertainty,
    restriction: proposal.restriction,
    readinessRequirementIds: [...proposal.readinessRequirementIds],
    applicableProjectTypes: [...proposal.applicableProjectTypes],
    applicableDomains: [...proposal.applicableDomains]
  };

  return JSON.stringify(canonical);
}

function canonicalSourceEvidence(source: PlanningClarificationSourceBlueprint): PlanningClarificationFingerprintSourceEvidence {
  return {
    sourceKey: source.sourceKey,
    sourceType: source.sourceType,
    locator: source.locator,
    label: source.label,
    authority: source.authority,
    availability: source.availability,
    version: source.version ?? null,
    excerpt: source.excerpt ?? null
  };
}

function collectDuplicateDraftKeys(drafts: readonly unknown[]): Set<string> {
  const counts = new Map<string, number>();
  for (const draft of drafts) {
    if (isPlainObject(draft) && typeof draft.draftKey === "string") {
      counts.set(draft.draftKey, (counts.get(draft.draftKey) ?? 0) + 1);
    }
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([draftKey]) => draftKey));
}

function collectDuplicateProposalKeys(drafts: readonly unknown[]): Set<string> {
  const counts = new Map<string, number>();
  for (const draft of drafts) {
    const proposalKey = proposalKeyFromUnknown(draft);
    if (proposalKey) {
      counts.set(proposalKey, (counts.get(proposalKey) ?? 0) + 1);
    }
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([proposalKey]) => proposalKey));
}

function reportRawSourceConflicts(
  drafts: readonly unknown[],
  issues: PlanningClarificationBlueprintGenerationIssue[]
): void {
  const semanticByKey = new Map<string, string>();
  const reported = new Set<string>();
  for (const draft of drafts) {
    for (const source of rawSourceBlueprintsFromDraft(draft)) {
      const previous = semanticByKey.get(source.sourceKey);
      const semantic = sourceSemantic(source);
      if (previous === undefined) {
        semanticByKey.set(source.sourceKey, semantic);
      } else if (previous !== semantic && !reported.has(source.sourceKey)) {
        reported.add(source.sourceKey);
        issues.push(issue("conflictingSourceBlueprint", "Duplicate source blueprint key has conflicting semantic content.", undefined, undefined, source.sourceKey, undefined, "sourceKey"));
      }
    }
  }
}

function rawSourceBlueprintsFromDraft(input: unknown): PlanningClarificationSourceBlueprint[] {
  if (
    !isPlainObject(input) ||
    typeof input.ruleId !== "string" ||
    typeof input.ruleVersion !== "string" ||
    typeof input.title !== "string" ||
    typeof input.gateSourceSection !== "string" ||
    typeof input.gateBlockingReason !== "string" ||
    !isPlainObject(input.target) ||
    typeof input.target.targetKey !== "string"
  ) {
    return [];
  }
  const draft = input as unknown as PlanningClarificationDraft;
  return createSourceBlueprints(draft);
}

function proposalKeyFromUnknown(input: unknown): string | null {
  if (!isPlainObject(input) || typeof input.ruleId !== "string" || !isPlainObject(input.target) || typeof input.target.targetKey !== "string") {
    return null;
  }
  return `clarification|${input.ruleId}|${input.target.targetKey}`;
}

function projectRuleSourceKeyForDraft(draft: PlanningClarificationDraft): string {
  return `projectRule|${draft.ruleId}|${draft.ruleVersion}`;
}

function readinessSourceKeyForDraft(draft: PlanningClarificationDraft): string {
  return `readinessPrerequisite|${draft.target.targetKey}`;
}

function proposalKeyForDraft(draft: PlanningClarificationDraft): string {
  return `clarification|${draft.ruleId}|${draft.target.targetKey}`;
}

function isEligibleGateStatus(input: unknown, rule: PlanningClarificationRule): input is PowerPlatformGateStatus {
  if (typeof input !== "string") return false;
  if ((ELIGIBLE_UNRESOLVED_STATUSES as readonly string[]).includes(input)) return true;
  return input === "notApplicable" && !rule.notApplicableAllowed;
}

function isValidSourceBlueprint(source: PlanningClarificationSourceBlueprint): boolean {
  if (source.sourceType !== "projectRule" && source.sourceType !== "readinessPrerequisite") return false;
  if (source.authority !== APPROVED_AUTHORITY || source.availability !== CURRENT_AVAILABILITY) return false;
  if (!isBoundedSingleLine(source.sourceKey, 300) || !isBoundedSingleLine(source.locator, 500)) return false;
  if (!isBoundedPlainText(source.label, 500)) return false;
  if (source.version !== undefined && !isBoundedSingleLine(source.version, 128)) return false;
  if (source.excerpt !== undefined && !isBoundedPlainText(source.excerpt, 500)) return false;
  return true;
}

function sourceSemantic(source: PlanningClarificationSourceBlueprint): string {
  return JSON.stringify({
    sourceKey: source.sourceKey,
    sourceType: source.sourceType,
    locator: source.locator,
    label: source.label,
    authority: source.authority,
    availability: source.availability,
    version: source.version ?? null,
    excerpt: source.excerpt ?? null
  });
}

function sameTarget(input: unknown, target: PlanningClarificationDraft["target"]): boolean {
  if (!isPlainObject(input)) return false;
  return (
    input.kind === target.kind &&
    input.domain === target.domain &&
    input.targetKey === target.targetKey &&
    input.entityId === target.entityId &&
    input.fieldKey === target.fieldKey &&
    input.operation === target.operation
  );
}

function sameSourceRequirements(input: unknown, expected: PlanningClarificationDraft["acceptableSources"]): boolean {
  if (!Array.isArray(input) || input.length !== expected.length) return false;
  return input.every((source, index) => (
    isPlainObject(source) &&
    source.sourceType === expected[index].sourceType &&
    source.authority === expected[index].authority &&
    source.availability === expected[index].availability
  ));
}

function readTargetKey(input: unknown): string | null {
  return isPlainObject(input) && typeof input.targetKey === "string" ? input.targetKey : null;
}

function sortDrafts(drafts: readonly PlanningClarificationDraft[]): PlanningClarificationDraft[] {
  return [...drafts].sort((first, second) => first.priority - second.priority || first.ruleId.localeCompare(second.ruleId));
}

function sortProposals(proposals: readonly PlanningClarificationProposalBlueprint[]): PlanningClarificationProposalBlueprint[] {
  return [...proposals].sort((first, second) => {
    const firstRule = getPlanningRuleById(first.ruleId);
    const secondRule = getPlanningRuleById(second.ruleId);
    return (firstRule?.priority ?? 0) - (secondRule?.priority ?? 0) || first.ruleId.localeCompare(second.ruleId);
  });
}

function cloneDraft(draft: PlanningClarificationDraft): PlanningClarificationDraft {
  return {
    ...draft,
    target: cloneTarget(draft.target),
    value: { ...draft.value },
    acceptableSources: draft.acceptableSources.map((source) => ({ ...source }))
  };
}

function cloneSource(source: PlanningClarificationSourceBlueprint): PlanningClarificationSourceBlueprint {
  return { ...source };
}

function cloneProposal(proposal: PlanningClarificationProposalBlueprint): PlanningClarificationProposalBlueprint {
  return {
    ...proposal,
    target: cloneTarget(proposal.target),
    value: { ...proposal.value },
    sourceKeys: [...proposal.sourceKeys],
    readinessRequirementIds: [...proposal.readinessRequirementIds],
    applicableProjectTypes: [...proposal.applicableProjectTypes],
    applicableDomains: [...proposal.applicableDomains]
  };
}

function cloneTarget(
  target: PlanningClarificationDraft["target"]
): PlanningClarificationDraft["target"] {
  return { ...target };
}

function result(
  sources: readonly PlanningClarificationSourceBlueprint[],
  proposals: readonly PlanningClarificationProposalBlueprint[],
  issues: readonly PlanningClarificationBlueprintGenerationIssue[]
): PlanningClarificationBlueprintGenerationResult {
  return {
    sources: sources.map(cloneSource),
    proposals: proposals.map(cloneProposal),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningClarificationBlueprintGenerationIssueCode,
  message: string,
  draftKey?: string,
  ruleId?: string,
  sourceKey?: string,
  proposalKey?: string,
  field?: string
): PlanningClarificationBlueprintGenerationIssue {
  return dropUndefined({ code, message, draftKey, ruleId, sourceKey, proposalKey, field });
}

function isBoundedSingleLine(input: unknown, limit: number): input is string {
  return typeof input === "string" && input.length > 0 && input.length <= limit && !/[\r\n]/.test(input) && isSafeText(input);
}

function isBoundedPlainText(input: unknown, limit: number): input is string {
  return typeof input === "string" && input.trim().length > 0 && input.length <= limit && isSafeText(input);
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
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

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
