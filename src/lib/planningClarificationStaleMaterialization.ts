import type {
  PlanningClarificationProposalBlueprint,
  PlanningClarificationSourceBlueprint
} from "./planningClarificationBlueprints";
import type { PlanningClarificationFingerprintRecord } from "./planningClarificationFingerprints";
import {
  analyzePlanningClarificationStalePropagation,
  type PlanningClarificationStalePropagationIssue
} from "./planningClarificationStalePropagation";
import {
  PLANNING_RULE_SET_VERSION,
  isValidPlanningTransition,
  normalizeProjectPlanningState,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningStaleReason,
  type ProjectPlanningState
} from "./planningProposals";

export interface PlanningClarificationStaleRepositoryInput {
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
  fingerprints: readonly PlanningClarificationFingerprintRecord[];
}

export interface PlanningClarificationStaleRepositoryRuntime {
  now?: () => string;
  uuid?: () => string;
}

export type PlanningClarificationStaleRepositoryOutcome =
  | "persisted"
  | "unchanged"
  | "blocked"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "persistenceFailed";

export type PlanningClarificationStaleMaterializationIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "invalidExistingPlanning"
  | "stalePropagationBlocked"
  | "unsupportedStaleReason"
  | "sourceTransitionMissing"
  | "sourceTransitionStateMismatch"
  | "proposalTransitionMissing"
  | "proposalTransitionStateMismatch"
  | "invalidStatusTransition"
  | "invalidExistingStaleDecisionHistory"
  | "uuidUnavailable"
  | "invalidGeneratedUuid"
  | "duplicateGeneratedUuid"
  | "invalidMaterializationTimestamp"
  | "candidatePlanningInvalid"
  | "projectChangedDuringMaterialization"
  | "persistenceFailed";

export interface PlanningClarificationStaleMaterializationIssue {
  code: PlanningClarificationStaleMaterializationIssueCode;
  message: string;
  sourceKey?: string;
  proposalKey?: string;
  persistedId?: string;
  field?: string;
  sourceIssueCode?: string;
}

export interface PlanningClarificationStaleSourceTransition {
  semanticKey: string;
  persistedId: string;
  staleReason: Extract<PlanningStaleReason, "sourceChanged" | "ruleChanged">;
}

export interface PlanningClarificationStaleProposalTransition {
  semanticKey: string;
  persistedId: string;
  staleReason: Extract<PlanningStaleReason, "sourceChanged" | "ruleChanged" | "applicabilityChanged">;
  decisionId: string;
}

export interface PlanningClarificationStaleRepositoryResult {
  outcome: PlanningClarificationStaleRepositoryOutcome;
  projectId: string;
  transitionedSources: readonly PlanningClarificationStaleSourceTransition[];
  transitionedProposals: readonly PlanningClarificationStaleProposalTransition[];
  issues: readonly PlanningClarificationStaleMaterializationIssue[];
}

export type PlanningClarificationStaleMaterializationPreparation =
  | { kind: "blocked"; result: PlanningClarificationStaleRepositoryResult }
  | { kind: "unchanged"; result: PlanningClarificationStaleRepositoryResult }
  | {
      kind: "ready";
      projectId: string;
      existingPlanning: ProjectPlanningState;
      existingIds: ReadonlySet<string>;
      sourceTransitions: readonly PlanningClarificationStaleSourceTransition[];
      proposalTransitions: readonly Omit<PlanningClarificationStaleProposalTransition, "decisionId">[];
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SOURCE_STALE_REASONS = new Set<PlanningStaleReason>(["sourceChanged", "ruleChanged"]);
const PROPOSAL_STALE_REASONS = new Set<PlanningStaleReason>([
  "sourceChanged",
  "ruleChanged",
  "applicabilityChanged"
]);

export async function preparePlanningClarificationStaleMaterialization(
  projectId: string,
  existingPlanning: unknown,
  input: unknown
): Promise<PlanningClarificationStaleMaterializationPreparation> {
  if (!isValidProjectId(projectId)) {
    return blocked(projectId, [
      issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId")
    ]);
  }
  if (!isPlainObject(input)) {
    return blocked(projectId, [issue("invalidInput", "Clarification stale materialization input must be an object.")]);
  }
  const issues: PlanningClarificationStaleMaterializationIssue[] = [];
  const sources = validateArray(input.sources, "sources", issues);
  const proposals = validateArray(input.proposals, "proposals", issues);
  const fingerprints = validateArray(input.fingerprints, "fingerprints", issues);
  if (!sources || !proposals || !fingerprints || issues.length > 0) {
    return blocked(projectId, issues);
  }

  const normalized = normalizeProjectPlanningState(existingPlanning, projectId);
  if (normalized.issues.length > 0) {
    return blocked(projectId, normalized.issues.map((entry) =>
      issue(
        "invalidExistingPlanning",
        "Existing planning normalization failed; stale materialization is closed.",
        undefined,
        undefined,
        entry.recordId,
        entry.field ?? entry.collection,
        entry.code
      )
    ));
  }

  const stalePropagation = await analyzePlanningClarificationStalePropagation({
    projectId,
    existingPlanning: normalized.planning,
    sources,
    proposals,
    fingerprints
  });
  if (stalePropagation.outcome === "blocked") {
    return blocked(projectId, stalePropagation.issues.map(mapPropagationIssue));
  }
  if (stalePropagation.outcome === "unchanged") {
    return unchanged(projectId);
  }

  const sourcesById = new Map(normalized.planning.sources.map((source) => [source.sourceId, source]));
  const proposalsById = new Map(normalized.planning.proposals.map((proposal) => [proposal.proposalId, proposal]));
  const sourceTransitions = new Map<string, PlanningClarificationStaleSourceTransition>();
  const proposalTransitions: Array<Omit<PlanningClarificationStaleProposalTransition, "decisionId">> = [];

  for (const source of stalePropagation.sources) {
    if (source.effectiveDisposition !== "staleRequired") {
      continue;
    }
    if (!source.persistedId) {
      issues.push(issue("sourceTransitionMissing", "Stale source transition was not bound to a persisted source ID.", source.semanticKey, undefined, undefined, "sourceId"));
      continue;
    }
    const sourceStaleReason = source.staleReason;
    if (!isSafeSourceStaleReason(sourceStaleReason)) {
      issues.push(issue("unsupportedStaleReason", "Source stale reason is not approved for this materialization phase.", source.semanticKey, undefined, source.persistedId, "staleReason"));
      continue;
    }
    const persisted = sourcesById.get(source.persistedId);
    if (!persisted) {
      issues.push(issue("sourceTransitionMissing", "Persisted source requested by stale propagation does not exist.", source.semanticKey, undefined, source.persistedId, "sourceId"));
      continue;
    }
    if (persisted.availability !== "current") {
      issues.push(issue("sourceTransitionStateMismatch", "Persisted source must be current before it can be marked stale.", source.semanticKey, undefined, persisted.sourceId, "availability"));
      continue;
    }
    const existing = sourceTransitions.get(persisted.sourceId);
    if (existing && existing.staleReason !== source.staleReason) {
      issues.push(issue("sourceTransitionStateMismatch", "Persisted source has conflicting stale transition reasons.", source.semanticKey, undefined, persisted.sourceId, "staleReason"));
      continue;
    }
    sourceTransitions.set(persisted.sourceId, {
      semanticKey: source.semanticKey,
      persistedId: persisted.sourceId,
      staleReason: sourceStaleReason
    });
  }

  for (const proposal of stalePropagation.proposals) {
    if (proposal.effectiveDisposition !== "staleRequired") {
      continue;
    }
    if (!proposal.persistedId) {
      issues.push(issue("proposalTransitionMissing", "Stale proposal transition was not bound to a persisted proposal ID.", undefined, proposal.semanticKey, undefined, "proposalId"));
      continue;
    }
    const proposalStaleReason = proposal.staleReason;
    if (!isSafeProposalStaleReason(proposalStaleReason)) {
      issues.push(issue("unsupportedStaleReason", "Proposal stale reason is not approved for this materialization phase.", undefined, proposal.semanticKey, proposal.persistedId, "staleReason"));
      continue;
    }
    const persisted = proposalsById.get(proposal.persistedId);
    if (!persisted) {
      issues.push(issue("proposalTransitionMissing", "Persisted proposal requested by stale propagation does not exist.", undefined, proposal.semanticKey, proposal.persistedId, "proposalId"));
      continue;
    }
    if (persisted.status === "Stale") {
      const idempotentIssue = validateExistingStaleHistory(persisted, normalized.planning);
      if (persisted.staleReason !== proposalStaleReason) {
        issues.push(issue("proposalTransitionStateMismatch", "Persisted proposal is already stale for a different reason.", undefined, proposal.semanticKey, persisted.proposalId, "staleReason"));
      } else if (idempotentIssue) {
        issues.push({ ...idempotentIssue, proposalKey: proposal.semanticKey, persistedId: persisted.proposalId });
      }
      continue;
    }
    if (!isValidPlanningTransition(persisted.status, "Stale")) {
      issues.push(issue("invalidStatusTransition", "Persisted proposal cannot transition to Stale from its current status.", undefined, proposal.semanticKey, persisted.proposalId, "status"));
      continue;
    }
    proposalTransitions.push({
      semanticKey: proposal.semanticKey,
      persistedId: persisted.proposalId,
      staleReason: proposalStaleReason
    });
  }

  if (issues.length > 0) {
    return blocked(projectId, dedupeIssues(issues).sort(sortIssues));
  }

  const sortedSourceTransitions = [...sourceTransitions.values()].sort(sortTransitions);
  const sortedProposalTransitions = proposalTransitions.sort(sortTransitions);
  if (sortedSourceTransitions.length === 0 && sortedProposalTransitions.length === 0) {
    return unchanged(projectId);
  }

  return {
    kind: "ready",
    projectId,
    existingPlanning: normalized.planning,
    existingIds: collectExistingPlanningIds(normalized.planning),
    sourceTransitions: sortedSourceTransitions,
    proposalTransitions: sortedProposalTransitions
  };
}

export function finalizePlanningClarificationStaleMaterialization(
  preparation: Extract<PlanningClarificationStaleMaterializationPreparation, { kind: "ready" }>,
  runtime: PlanningClarificationStaleRepositoryRuntime = {}
): { result: PlanningClarificationStaleRepositoryResult; planning?: ProjectPlanningState; materializedAt?: string } {
  if (preparation.sourceTransitions.length === 0 && preparation.proposalTransitions.length === 0) {
    return { result: result("unchanged", preparation.projectId, [], [], []) };
  }

  const materializedAt = (runtime.now ?? defaultNow)();
  if (!isCanonicalUtcTimestamp(materializedAt)) {
    return {
      result: blockedResult(preparation.projectId, [
        issue("invalidMaterializationTimestamp", "Materialization timestamp must be canonical UTC with milliseconds.", undefined, undefined, undefined, "now")
      ])
    };
  }

  const generatedIds = new Set<string>();
  const proposalTransitionIds = new Map<string, string>();
  for (const transition of preparation.proposalTransitions) {
    const generated = generateUuid(runtime);
    const validationIssue = validateGeneratedUuid(generated, preparation.existingIds, generatedIds);
    if (validationIssue) {
      return { result: blockedResult(preparation.projectId, [validationIssue]) };
    }
    generatedIds.add(generated as string);
    proposalTransitionIds.set(transition.persistedId, generated as string);
  }

  const sourceTransitionIds = new Set(preparation.sourceTransitions.map((transition) => transition.persistedId));
  const proposalTransitionsById = new Map(preparation.proposalTransitions.map((transition) => [transition.persistedId, transition]));
  const transitionedProposals: PlanningClarificationStaleProposalTransition[] = [];
  const candidatePlanning: ProjectPlanningState = {
    ...preparation.existingPlanning,
    sources: preparation.existingPlanning.sources.map((source) =>
      sourceTransitionIds.has(source.sourceId) ? { ...source, availability: "stale" as const } : { ...source }
    ),
    proposals: preparation.existingPlanning.proposals.map((proposal) => {
      const transition = proposalTransitionsById.get(proposal.proposalId);
      if (!transition) {
        return cloneProposal(proposal);
      }
      const decisionId = proposalTransitionIds.get(proposal.proposalId)!;
      transitionedProposals.push({ ...transition, decisionId });
      return staleProposalRecord(proposal, transition.staleReason, decisionId, materializedAt);
    }),
    decisions: [
      ...preparation.existingPlanning.decisions.map((decision) => ({ ...decision })),
      ...preparation.proposalTransitions.map((transition) => {
        const proposal = preparation.existingPlanning.proposals.find((candidate) => candidate.proposalId === transition.persistedId)!;
        return markStaleDecision(
          proposal,
          proposalTransitionIds.get(transition.persistedId)!,
          transition.staleReason,
          materializedAt
        );
      })
    ],
    dependencies: preparation.existingPlanning.dependencies.map((dependency) => ({ ...dependency, target: { ...dependency.target } })),
    conflicts: preparation.existingPlanning.conflicts.map((conflict) => ({
      ...conflict,
      involvedReferences: conflict.involvedReferences.map((reference) => ({ ...reference })),
      resolutionOptionProposalIds: conflict.resolutionOptionProposalIds ? [...conflict.resolutionOptionProposalIds] : undefined,
      affectedProposalIds: conflict.affectedProposalIds ? [...conflict.affectedProposalIds] : undefined
    }))
  };
  const normalizedCandidate = normalizeProjectPlanningState(candidatePlanning, preparation.projectId);
  if (normalizedCandidate.issues.length > 0 || JSON.stringify(normalizedCandidate.planning) !== JSON.stringify(candidatePlanning)) {
    return {
      result: blockedResult(preparation.projectId, normalizedCandidate.issues.length > 0
        ? normalizedCandidate.issues.map((entry) =>
            issue("candidatePlanningInvalid", "Candidate planning normalization failed.", undefined, undefined, entry.recordId, entry.field ?? entry.collection, entry.code)
          )
        : [issue("candidatePlanningInvalid", "Candidate planning changed during normalization.", undefined, undefined, undefined, "planning")])
    };
  }

  return {
    planning: candidatePlanning,
    materializedAt,
    result: result(
      "persisted",
      preparation.projectId,
      preparation.sourceTransitions,
      transitionedProposals.sort(sortTransitions),
      []
    )
  };
}

export function blockedResult(
  projectId: string,
  issues: readonly PlanningClarificationStaleMaterializationIssue[]
): PlanningClarificationStaleRepositoryResult {
  return result("blocked", projectId, [], [], issues);
}

export function invalidProjectIdStaleResult(projectId: string): PlanningClarificationStaleRepositoryResult {
  return blockedResult(projectId, [
    issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId")
  ]);
}

export function projectNotFoundStaleResult(projectId: string): PlanningClarificationStaleRepositoryResult {
  return result("projectNotFound", projectId, [], [], [
    issue("projectNotFound", "Project was not found.", undefined, undefined, projectId, "projectId")
  ]);
}

export function unsupportedProjectTypeStaleResult(projectId: string): PlanningClarificationStaleRepositoryResult {
  return result("unsupportedProjectType", projectId, [], [], [
    issue("unsupportedProjectType", "Clarification stale materialization currently supports only Power Apps Canvas projects.", undefined, undefined, undefined, "appType")
  ]);
}

export function persistenceFailedStaleResult(projectId: string): PlanningClarificationStaleRepositoryResult {
  return result("persistenceFailed", projectId, [], [], [
    issue("persistenceFailed", "Planning stale materialization could not be written to storage.", undefined, undefined, undefined, "storage")
  ]);
}

export function projectChangedDuringStaleMaterializationResult(projectId: string): PlanningClarificationStaleRepositoryResult {
  return result("blocked", projectId, [], [], [
    issue("projectChangedDuringMaterialization", "Project changed during stale materialization; newer state was preserved.", undefined, undefined, projectId, "project")
  ]);
}

function markStaleDecision(
  proposal: PlanningProposalRecord,
  decisionId: string,
  staleReason: Extract<PlanningStaleReason, "sourceChanged" | "ruleChanged" | "applicabilityChanged">,
  recordedAt: string
): PlanningDecisionRecord {
  return {
    decisionId,
    proposalId: proposal.proposalId,
    projectId: proposal.projectId,
    action: "markStale",
    previousStatus: proposal.status,
    resultingStatus: "Stale",
    origin: "deterministicRule",
    recordedAt,
    reason: staleReason,
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
}

function validateExistingStaleHistory(
  proposal: PlanningProposalRecord,
  planning: ProjectPlanningState
): PlanningClarificationStaleMaterializationIssue | null {
  if (!proposal.staleAt || !isCanonicalUtcTimestamp(proposal.staleAt) || !proposal.lastDecisionId) {
    return issue("invalidExistingStaleDecisionHistory", "Already-stale proposal lacks coherent deterministic stale metadata.", undefined, undefined, proposal.proposalId, "lastDecisionId");
  }
  const decisions = planning.decisions.filter((decision) => decision.decisionId === proposal.lastDecisionId);
  const decision = decisions[0];
  if (
    decisions.length !== 1 ||
    !decision ||
    decision.proposalId !== proposal.proposalId ||
    decision.action !== "markStale" ||
    decision.resultingStatus !== "Stale" ||
    decision.origin !== "deterministicRule" ||
    decision.reason !== proposal.staleReason ||
    decision.recordedAt !== proposal.staleAt
  ) {
    return issue("invalidExistingStaleDecisionHistory", "Already-stale proposal does not match one deterministic markStale decision.", undefined, undefined, proposal.proposalId, "lastDecisionId");
  }
  return null;
}

function cloneProposal(proposal: PlanningProposalRecord): PlanningProposalRecord {
  return {
    ...proposal,
    target: { ...proposal.target },
    value: cloneValue(proposal.value),
    sourceIds: [...proposal.sourceIds],
    conflictIds: proposal.conflictIds ? [...proposal.conflictIds] : undefined,
    readinessRequirementIds: proposal.readinessRequirementIds ? [...proposal.readinessRequirementIds] : undefined,
    applicableProjectTypes: proposal.applicableProjectTypes ? [...proposal.applicableProjectTypes] : undefined,
    applicableDomains: proposal.applicableDomains ? [...proposal.applicableDomains] : undefined
  };
}

function staleProposalRecord(
  proposal: PlanningProposalRecord,
  staleReason: Extract<PlanningStaleReason, "sourceChanged" | "ruleChanged" | "applicabilityChanged">,
  decisionId: string,
  timestamp: string
): PlanningProposalRecord {
  return dropUndefined({
    proposalId: proposal.proposalId,
    proposalSchemaVersion: proposal.proposalSchemaVersion,
    projectId: proposal.projectId,
    ruleSetId: proposal.ruleSetId,
    ruleSetVersion: proposal.ruleSetVersion,
    ruleId: proposal.ruleId,
    ruleVersion: proposal.ruleVersion,
    fingerprint: proposal.fingerprint,
    target: { ...proposal.target },
    category: proposal.category,
    status: "Stale" as const,
    value: cloneValue(proposal.value),
    title: proposal.title,
    recommendation: proposal.recommendation,
    rationale: proposal.rationale,
    sourceIds: [...proposal.sourceIds],
    uncertainty: proposal.uncertainty,
    restriction: proposal.restriction,
    createdAt: proposal.createdAt,
    updatedAt: timestamp,
    consequence: proposal.consequence,
    alternativeGroupId: proposal.alternativeGroupId,
    recommendedAlternative: proposal.recommendedAlternative,
    supersededByProposalId: proposal.supersededByProposalId,
    staleReason,
    staleAt: timestamp,
    conflictIds: proposal.conflictIds ? [...proposal.conflictIds] : undefined,
    readinessRequirementIds: proposal.readinessRequirementIds ? [...proposal.readinessRequirementIds] : undefined,
    lastDecisionId: decisionId,
    applicableProjectTypes: proposal.applicableProjectTypes ? [...proposal.applicableProjectTypes] : undefined,
    applicableDomains: proposal.applicableDomains ? [...proposal.applicableDomains] : undefined
  }) as PlanningProposalRecord;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectExistingPlanningIds(planning: ProjectPlanningState): Set<string> {
  return new Set([
    ...planning.sources.map((source) => source.sourceId),
    ...planning.proposals.map((proposal) => proposal.proposalId),
    ...planning.decisions.map((decision) => decision.decisionId),
    ...planning.dependencies.map((dependency) => dependency.dependencyId),
    ...planning.conflicts.map((conflict) => conflict.conflictId)
  ]);
}

function mapPropagationIssue(
  entry: PlanningClarificationStalePropagationIssue
): PlanningClarificationStaleMaterializationIssue {
  return issue(
    "stalePropagationBlocked",
    "Stale propagation blocked materialization.",
    entry.sourceKey,
    entry.proposalKey,
    entry.persistedId,
    entry.field,
    entry.underlyingIssueCode ?? entry.sourceIssueCode ?? entry.code
  );
}

function generateUuid(runtime: PlanningClarificationStaleRepositoryRuntime): string | null {
  const generator = runtime.uuid ?? globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  return typeof generator === "function" ? generator() : null;
}

function validateGeneratedUuid(
  input: string | null,
  existingIds: ReadonlySet<string>,
  generatedIds: ReadonlySet<string>
): PlanningClarificationStaleMaterializationIssue | null {
  if (input === null) {
    return issue("uuidUnavailable", "UUID generation is unavailable.", undefined, undefined, undefined, "uuid");
  }
  if (!UUID_PATTERN.test(input)) {
    return issue("invalidGeneratedUuid", "Generated planning UUID must be lowercase canonical UUID syntax.", undefined, undefined, input, "uuid");
  }
  if (existingIds.has(input) || generatedIds.has(input)) {
    return issue("duplicateGeneratedUuid", "Generated planning UUID must be unique within existing planning and the transaction.", undefined, undefined, input, "uuid");
  }
  return null;
}

function isSafeSourceStaleReason(
  reason: PlanningStaleReason | undefined
): reason is Extract<PlanningStaleReason, "sourceChanged" | "ruleChanged"> {
  return reason !== undefined && SOURCE_STALE_REASONS.has(reason);
}

function isSafeProposalStaleReason(
  reason: PlanningStaleReason | undefined
): reason is Extract<PlanningStaleReason, "sourceChanged" | "ruleChanged" | "applicabilityChanged"> {
  return reason !== undefined && PROPOSAL_STALE_REASONS.has(reason);
}

function defaultNow(): string {
  return new Date().toISOString();
}

function isCanonicalUtcTimestamp(input: string): boolean {
  if (!UTC_TIMESTAMP_PATTERN.test(input)) {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/.exec(input);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, millisecond] = match.map(Number);
  const time = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  if (!Number.isFinite(time)) return false;
  const date = new Date(time);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second &&
    date.getUTCMilliseconds() === millisecond &&
    date.toISOString() === input
  );
}

function validateArray(
  input: unknown,
  field: "sources" | "proposals" | "fingerprints",
  issues: PlanningClarificationStaleMaterializationIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue("invalidInput", `${field} must be an array.`, undefined, undefined, undefined, field));
    return null;
  }
  return input;
}

function blocked(
  projectId: string,
  issues: readonly PlanningClarificationStaleMaterializationIssue[]
): PlanningClarificationStaleMaterializationPreparation {
  return { kind: "blocked", result: blockedResult(projectId, issues) };
}

function unchanged(projectId: string): PlanningClarificationStaleMaterializationPreparation {
  return { kind: "unchanged", result: result("unchanged", projectId, [], [], []) };
}

function result(
  outcome: PlanningClarificationStaleRepositoryOutcome,
  projectId: string,
  transitionedSources: readonly PlanningClarificationStaleSourceTransition[],
  transitionedProposals: readonly PlanningClarificationStaleProposalTransition[],
  issues: readonly PlanningClarificationStaleMaterializationIssue[]
): PlanningClarificationStaleRepositoryResult {
  return {
    outcome,
    projectId,
    transitionedSources: transitionedSources.map((entry) => ({ ...entry })),
    transitionedProposals: transitionedProposals.map((entry) => ({ ...entry })),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningClarificationStaleMaterializationIssueCode,
  message: string,
  sourceKey?: string,
  proposalKey?: string,
  persistedId?: string,
  field?: string | number,
  sourceIssueCode?: string
): PlanningClarificationStaleMaterializationIssue {
  return dropUndefined({
    code,
    message,
    sourceKey,
    proposalKey,
    persistedId,
    field: field === undefined ? undefined : String(field),
    sourceIssueCode
  });
}

function dedupeIssues(
  issues: readonly PlanningClarificationStaleMaterializationIssue[]
): PlanningClarificationStaleMaterializationIssue[] {
  const unique = new Map<string, PlanningClarificationStaleMaterializationIssue>();
  for (const entry of issues) {
    unique.set([
      entry.code,
      entry.sourceKey ?? "",
      entry.proposalKey ?? "",
      entry.persistedId ?? "",
      entry.field ?? "",
      entry.sourceIssueCode ?? ""
    ].join("\u001f"), entry);
  }
  return [...unique.values()];
}

function sortIssues(
  first: PlanningClarificationStaleMaterializationIssue,
  second: PlanningClarificationStaleMaterializationIssue
): number {
  return first.code.localeCompare(second.code) ||
    (first.sourceKey ?? "").localeCompare(second.sourceKey ?? "") ||
    (first.proposalKey ?? "").localeCompare(second.proposalKey ?? "") ||
    (first.persistedId ?? "").localeCompare(second.persistedId ?? "") ||
    (first.field ?? "").localeCompare(second.field ?? "");
}

function sortTransitions<T extends { semanticKey: string; persistedId: string }>(first: T, second: T): number {
  return first.semanticKey.localeCompare(second.semanticKey) ||
    first.persistedId.localeCompare(second.persistedId);
}

function isValidProjectId(input: unknown): input is string {
  return typeof input === "string" && input.trim().length > 0 && input.length <= 200 && !/[\r\n]/.test(input);
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function dropUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
