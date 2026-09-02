import { isSha256Hex } from "../core/sha256Fingerprint";
import type {
  PlanningClarificationProposalBlueprint,
  PlanningClarificationSourceBlueprint
} from "./planningClarificationBlueprints";
import type { PlanningClarificationFingerprintRecord } from "./planningClarificationFingerprints";
import {
  reconcilePlanningClarifications,
  type PlanningClarificationReconciliationResult
} from "./planningClarificationReconciliation";
import {
  reconcilePlanningClarificationSources,
  type PlanningClarificationSourceReconciliationResult
} from "./planningClarificationSourceReconciliation";
import {
  normalizeProjectPlanningState,
  PLANNING_SCHEMA_VERSION,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "./planningProposals";

export interface PlanningClarificationRepositoryInput {
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
  fingerprints: readonly PlanningClarificationFingerprintRecord[];
}

export interface PlanningClarificationRepositoryRuntime {
  now?: () => string;
  uuid?: () => string;
}

export type PlanningClarificationRepositoryOutcome =
  | "persisted"
  | "unchanged"
  | "blocked"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "persistenceFailed";

export interface PlanningClarificationMaterializedIdentity {
  semanticKey: string;
  persistedId: string;
}

export type PlanningClarificationMaterializationIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "invalidExistingPlanning"
  | "sourceReconciliationFailed"
  | "proposalReconciliationFailed"
  | "lifecycleMutationRequired"
  | "existingProposalSourceBindingMismatch"
  | "uuidUnavailable"
  | "invalidGeneratedUuid"
  | "duplicateGeneratedUuid"
  | "invalidMaterializationTimestamp"
  | "materializationBindingFailure"
  | "candidatePlanningInvalid"
  | "projectChangedDuringMaterialization"
  | "persistenceFailed";

export interface PlanningClarificationMaterializationIssue {
  code: PlanningClarificationMaterializationIssueCode;
  message: string;
  sourceKey?: string;
  proposalKey?: string;
  persistedId?: string;
  field?: string;
  sourceIssueCode?: string;
}

export interface PlanningClarificationRepositoryResult {
  outcome: PlanningClarificationRepositoryOutcome;
  projectId: string;
  createdSources: readonly PlanningClarificationMaterializedIdentity[];
  reusedSources: readonly PlanningClarificationMaterializedIdentity[];
  createdProposals: readonly PlanningClarificationMaterializedIdentity[];
  reusedProposals: readonly PlanningClarificationMaterializedIdentity[];
  issues: readonly PlanningClarificationMaterializationIssue[];
}

export type PlanningClarificationMaterializationPreparation =
  | { kind: "blocked"; result: PlanningClarificationRepositoryResult }
  | { kind: "unchanged"; result: PlanningClarificationRepositoryResult }
  | {
      kind: "ready";
      projectId: string;
      existingPlanning: ProjectPlanningState;
      sources: readonly PlanningClarificationSourceBlueprint[];
      proposals: readonly PlanningClarificationProposalBlueprint[];
      fingerprintsByProposalKey: ReadonlyMap<string, PlanningClarificationFingerprintRecord>;
      sourceIdsByKey: ReadonlyMap<string, string>;
      existingIds: ReadonlySet<string>;
      newSources: readonly PlanningClarificationSourceBlueprint[];
      newProposals: readonly PlanningClarificationProposalBlueprint[];
      reusedSources: readonly PlanningClarificationMaterializedIdentity[];
      reusedProposals: readonly PlanningClarificationMaterializedIdentity[];
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export async function preparePlanningClarificationMaterialization(
  projectId: string,
  existingPlanning: unknown,
  input: unknown
): Promise<PlanningClarificationMaterializationPreparation> {
  const issues: PlanningClarificationMaterializationIssue[] = [];
  if (!isValidProjectId(projectId)) {
    return blocked(projectId, [issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId")]);
  }
  if (!isPlainObject(input)) {
    return blocked(projectId, [issue("invalidInput", "Clarification materialization input must be an object.")]);
  }
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
        "Existing planning normalization failed; materialization is closed.",
        undefined,
        undefined,
        entry.recordId,
        entry.field ?? entry.collection,
        entry.code
      )
    ));
  }

  const sourceReconciliation = await reconcilePlanningClarificationSources({
    projectId,
    existingPlanning: normalized.planning,
    sources,
    proposals
  });
  if (sourceReconciliation.issues.length > 0) {
    return blocked(projectId, sourceReconciliation.issues.map((entry) =>
      issue(
        "sourceReconciliationFailed",
        "Source reconciliation produced an issue; materialization is closed.",
        entry.sourceKey,
        undefined,
        entry.existingSourceId,
        entry.field,
        entry.code
      )
    ));
  }

  const proposalReconciliation = await reconcilePlanningClarifications({
    projectId,
    existingPlanning: normalized.planning,
    sources,
    proposals,
    fingerprints
  });
  if (proposalReconciliation.issues.length > 0) {
    return blocked(projectId, proposalReconciliation.issues.map((entry) =>
      issue(
        "proposalReconciliationFailed",
        "Proposal reconciliation produced an issue; materialization is closed.",
        undefined,
        entry.proposalKey,
        entry.existingProposalId,
        entry.field,
        entry.code
      )
    ));
  }

  const lifecycleIssues = lifecycleMutationIssues(sourceReconciliation, proposalReconciliation);
  if (lifecycleIssues.length > 0) {
    return blocked(projectId, lifecycleIssues);
  }

  const sourceIdsByKeyResult = buildSourceIdMap(projectId, sourceReconciliation, normalized.planning);
  if (sourceIdsByKeyResult.issues.length > 0) {
    return blocked(projectId, sourceIdsByKeyResult.issues);
  }

  const fingerprintBinding = buildFingerprintMap(fingerprints);
  if (fingerprintBinding.issues.length > 0) {
    return blocked(projectId, fingerprintBinding.issues);
  }

  const proposalBindingIssues = validateExactProposalSourceBindings(
    proposalReconciliation,
    proposals as readonly PlanningClarificationProposalBlueprint[],
    normalized.planning,
    sourceIdsByKeyResult.sourceIdsByKey
  );
  if (proposalBindingIssues.length > 0) {
    return blocked(projectId, proposalBindingIssues);
  }

  const newSources = (sources as readonly PlanningClarificationSourceBlueprint[])
    .filter((source) => sourceReconciliation.current.some((entry) => entry.sourceKey === source.sourceKey && entry.disposition === "newSource"))
    .sort((first, second) => first.sourceKey.localeCompare(second.sourceKey));
  const newProposalKeys = new Set(proposalReconciliation.current.filter((entry) => entry.disposition === "newProposal").map((entry) => entry.proposalKey));
  const proposalsByKey = new Map((proposals as readonly PlanningClarificationProposalBlueprint[]).map((proposal) => [proposal.proposalKey, proposal]));
  const newProposals = proposalReconciliation.current
    .filter((entry) => newProposalKeys.has(entry.proposalKey))
    .map((entry) => proposalsByKey.get(entry.proposalKey))
    .filter((proposal): proposal is PlanningClarificationProposalBlueprint => Boolean(proposal));

  if (newSources.length === 0 && newProposals.length === 0) {
    return {
      kind: "unchanged",
      result: result(
        "unchanged",
        projectId,
        [],
        sourceReconciliation.current.map((entry) => ({ semanticKey: entry.sourceKey, persistedId: entry.existingSourceId ?? "" })),
        [],
        proposalReconciliation.current.map((entry) => ({ semanticKey: entry.proposalKey, persistedId: entry.existingProposalId ?? "" })),
        []
      )
    };
  }

  return {
    kind: "ready",
    projectId,
    existingPlanning: normalized.planning,
    sources: sources as readonly PlanningClarificationSourceBlueprint[],
    proposals: proposals as readonly PlanningClarificationProposalBlueprint[],
    fingerprintsByProposalKey: fingerprintBinding.fingerprintsByProposalKey,
    sourceIdsByKey: sourceIdsByKeyResult.sourceIdsByKey,
    existingIds: collectExistingPlanningIds(normalized.planning),
    newSources,
    newProposals,
    reusedSources: sourceReconciliation.current
      .filter((entry) => entry.disposition === "exactMatch")
      .map((entry) => ({ semanticKey: entry.sourceKey, persistedId: entry.existingSourceId ?? "" })),
    reusedProposals: proposalReconciliation.current
      .filter((entry) => entry.disposition === "exactMatch")
      .map((entry) => ({ semanticKey: entry.proposalKey, persistedId: entry.existingProposalId ?? "" }))
  };
}

export function finalizePlanningClarificationMaterialization(
  preparation: Extract<PlanningClarificationMaterializationPreparation, { kind: "ready" }>,
  runtime: PlanningClarificationRepositoryRuntime = {}
): { result: PlanningClarificationRepositoryResult; planning?: ProjectPlanningState; materializedAt?: string } {
  const materializedAt = (runtime.now ?? defaultNow)();
  if (!isCanonicalUtcTimestamp(materializedAt)) {
    return {
      result: blockedResult(preparation.projectId, [
        issue("invalidMaterializationTimestamp", "Materialization timestamp must be canonical UTC with milliseconds.", undefined, undefined, undefined, "now")
      ])
    };
  }

  const generatedIds = new Set<string>();
  const sourceIdsByKey = new Map(preparation.sourceIdsByKey);
  const createdSources: PlanningClarificationMaterializedIdentity[] = [];
  const createdSourceRecords: PlanningSourceReference[] = [];
  for (const source of preparation.newSources) {
    const generated = generateUuid(runtime);
    const validationIssue = validateGeneratedUuid(generated, preparation.existingIds, generatedIds);
    if (validationIssue) {
      return { result: blockedResult(preparation.projectId, [validationIssue]) };
    }
    const generatedId = generated as string;
    generatedIds.add(generatedId);
    sourceIdsByKey.set(source.sourceKey, generatedId);
    createdSources.push({ semanticKey: source.sourceKey, persistedId: generatedId });
    createdSourceRecords.push(sourceRecord(source, generatedId, materializedAt));
  }

  const createdProposals: PlanningClarificationMaterializedIdentity[] = [];
  const createdProposalRecords: PlanningProposalRecord[] = [];
  for (const proposal of preparation.newProposals) {
    const fingerprint = preparation.fingerprintsByProposalKey.get(proposal.proposalKey);
    if (!fingerprint || !isSha256Hex(fingerprint.fingerprint)) {
      return {
        result: blockedResult(preparation.projectId, [
          issue("materializationBindingFailure", "A new proposal could not be bound to one validated fingerprint.", undefined, proposal.proposalKey, undefined, "fingerprint")
        ])
      };
    }
    const sourceIds = proposal.sourceKeys.map((sourceKey) => sourceIdsByKey.get(sourceKey));
    if (!sourceIds.every(Boolean)) {
      return {
        result: blockedResult(preparation.projectId, [
          issue("materializationBindingFailure", "A new proposal could not be bound to materialized source IDs.", undefined, proposal.proposalKey, undefined, "sourceIds")
        ])
      };
    }
    const generated = generateUuid(runtime);
    const validationIssue = validateGeneratedUuid(generated, preparation.existingIds, generatedIds);
    if (validationIssue) {
      return { result: blockedResult(preparation.projectId, [validationIssue]) };
    }
    const generatedId = generated as string;
    generatedIds.add(generatedId);
    createdProposals.push({ semanticKey: proposal.proposalKey, persistedId: generatedId });
    createdProposalRecords.push(proposalRecord(proposal, fingerprint.fingerprint, sourceIds as string[], generatedId, materializedAt));
  }

  const candidatePlanning: ProjectPlanningState = {
    ...preparation.existingPlanning,
    sources: [...preparation.existingPlanning.sources, ...createdSourceRecords],
    proposals: [...preparation.existingPlanning.proposals, ...createdProposalRecords]
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
      createdSources,
      preparation.reusedSources,
      createdProposals,
      preparation.reusedProposals,
      []
    )
  };
}

export function blockedResult(
  projectId: string,
  issues: readonly PlanningClarificationMaterializationIssue[]
): PlanningClarificationRepositoryResult {
  return result("blocked", projectId, [], [], [], [], issues);
}

export function invalidProjectIdResult(projectId: string): PlanningClarificationRepositoryResult {
  return blockedResult(projectId, [
    issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId")
  ]);
}

export function projectNotFoundResult(projectId: string): PlanningClarificationRepositoryResult {
  return result("projectNotFound", projectId, [], [], [], [], [
    issue("projectNotFound", "Project was not found.", undefined, undefined, projectId, "projectId")
  ]);
}

export function unsupportedProjectTypeResult(projectId: string): PlanningClarificationRepositoryResult {
  return result("unsupportedProjectType", projectId, [], [], [], [], [
    issue("unsupportedProjectType", "Clarification materialization currently supports only Power Apps Canvas projects.", undefined, undefined, undefined, "appType")
  ]);
}

export function persistenceFailedResult(projectId: string): PlanningClarificationRepositoryResult {
  return result("persistenceFailed", projectId, [], [], [], [], [
    issue("persistenceFailed", "Planning materialization could not be written to storage.", undefined, undefined, undefined, "storage")
  ]);
}

export function projectChangedDuringMaterializationResult(projectId: string): PlanningClarificationRepositoryResult {
  return result("blocked", projectId, [], [], [], [], [
    issue("projectChangedDuringMaterialization", "Project changed during clarification materialization; newer state was preserved.", undefined, undefined, projectId, "project")
  ]);
}

function lifecycleMutationIssues(
  sourceReconciliation: PlanningClarificationSourceReconciliationResult,
  proposalReconciliation: PlanningClarificationReconciliationResult
): PlanningClarificationMaterializationIssue[] {
  return [
    ...sourceReconciliation.current.flatMap((entry) => entry.disposition === "changedSource"
      ? [issue("lifecycleMutationRequired", "Changed sources require a later lifecycle phase.", entry.sourceKey)]
      : []),
    ...sourceReconciliation.existingOnly.map((entry) =>
      issue("lifecycleMutationRequired", "Existing-only sources require a later lifecycle phase.", entry.sourceKey, undefined, entry.existingSourceId)
    ),
    ...proposalReconciliation.current.flatMap((entry) => entry.disposition === "changedProposal"
      ? [issue("lifecycleMutationRequired", "Changed proposals require a later lifecycle phase.", undefined, entry.proposalKey, entry.existingProposalId)]
      : []),
    ...proposalReconciliation.existingOnly.map((entry) =>
      issue("lifecycleMutationRequired", "Existing-only proposals require a later lifecycle phase.", undefined, entry.proposalKey, entry.existingProposalId)
    )
  ];
}

function buildSourceIdMap(
  projectId: string,
  sourceReconciliation: PlanningClarificationSourceReconciliationResult,
  existingPlanning: ProjectPlanningState
): { sourceIdsByKey: Map<string, string>; issues: PlanningClarificationMaterializationIssue[] } {
  const sourceIdsByKey = new Map<string, string>();
  const existingSourceIds = new Set(existingPlanning.sources.map((source) => source.sourceId));
  const issues: PlanningClarificationMaterializationIssue[] = [];
  for (const entry of sourceReconciliation.current) {
    if (entry.disposition === "exactMatch") {
      if (!entry.existingSourceId || !existingSourceIds.has(entry.existingSourceId)) {
        issues.push(issue("materializationBindingFailure", "Exact source reconciliation could not be bound to an existing source UUID.", entry.sourceKey, undefined, entry.existingSourceId, "sourceId"));
        continue;
      }
      sourceIdsByKey.set(entry.sourceKey, entry.existingSourceId);
    }
  }
  if (!isValidProjectId(projectId)) {
    issues.push(issue("invalidProjectId", "Project ID is invalid.", undefined, undefined, undefined, "projectId"));
  }
  return { sourceIdsByKey, issues };
}

function buildFingerprintMap(
  fingerprints: readonly unknown[]
): { fingerprintsByProposalKey: Map<string, PlanningClarificationFingerprintRecord>; issues: PlanningClarificationMaterializationIssue[] } {
  const byKey = new Map<string, PlanningClarificationFingerprintRecord>();
  const counts = new Map<string, number>();
  for (const fingerprint of fingerprints) {
    if (!isPlainObject(fingerprint) || typeof fingerprint.proposalKey !== "string") {
      return { fingerprintsByProposalKey: byKey, issues: [issue("materializationBindingFailure", "Fingerprint records must be objects with proposal keys.", undefined, undefined, undefined, "fingerprints")] };
    }
    counts.set(fingerprint.proposalKey, (counts.get(fingerprint.proposalKey) ?? 0) + 1);
    if (typeof fingerprint.fingerprintInput === "string" && isSha256Hex(fingerprint.fingerprint)) {
      byKey.set(fingerprint.proposalKey, {
        proposalKey: fingerprint.proposalKey,
        fingerprintInput: fingerprint.fingerprintInput,
        fingerprint: fingerprint.fingerprint
      });
    }
  }
  const duplicate = [...counts].find(([, count]) => count > 1);
  return duplicate
    ? { fingerprintsByProposalKey: byKey, issues: [issue("materializationBindingFailure", "Fingerprint proposal key binding is ambiguous.", undefined, duplicate[0], undefined, "fingerprints")] }
    : { fingerprintsByProposalKey: byKey, issues: [] };
}

function validateExactProposalSourceBindings(
  proposalReconciliation: PlanningClarificationReconciliationResult,
  proposals: readonly PlanningClarificationProposalBlueprint[],
  existingPlanning: ProjectPlanningState,
  sourceIdsByKey: ReadonlyMap<string, string>
): PlanningClarificationMaterializationIssue[] {
  const proposalsByKey = new Map(proposals.map((proposal) => [proposal.proposalKey, proposal]));
  const existingById = new Map(existingPlanning.proposals.map((proposal) => [proposal.proposalId, proposal]));
  const existingSourcesById = new Map(existingPlanning.sources.map((source) => [source.sourceId, source]));
  const issues: PlanningClarificationMaterializationIssue[] = [];
  for (const entry of proposalReconciliation.current) {
    if (entry.disposition !== "exactMatch") {
      continue;
    }
    const existing = entry.existingProposalId ? existingById.get(entry.existingProposalId) : undefined;
    const proposal = proposalsByKey.get(entry.proposalKey);
    if (!existing || !proposal) {
      issues.push(issue("materializationBindingFailure", "Exact proposal reconciliation could not be bound to existing and generated proposal records.", undefined, entry.proposalKey, entry.existingProposalId, "proposalId"));
      continue;
    }
    const expected = proposal.sourceKeys.map((sourceKey) => sourceIdsByKey.get(sourceKey));
    const existingDeterministicSourceIds = existing.sourceIds.filter((sourceId) =>
      existingSourcesById.get(sourceId)?.sourceType !== "userAnswer"
    );
    if (!expected.every(Boolean) || !sameStringArray(existingDeterministicSourceIds, expected as string[])) {
      issues.push(issue("existingProposalSourceBindingMismatch", "Existing exact proposal source IDs do not match the current exact source identities.", undefined, entry.proposalKey, existing.proposalId, "sourceIds"));
    }
  }
  return issues;
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

function sourceRecord(
  source: PlanningClarificationSourceBlueprint,
  sourceId: string,
  observedAt: string
): PlanningSourceReference {
  return dropUndefined({
    sourceId,
    sourceType: source.sourceType,
    locator: source.locator,
    label: source.label,
    authority: source.authority,
    availability: "current" as const,
    version: source.version,
    observedAt,
    excerpt: source.excerpt
  });
}

function proposalRecord(
  proposal: PlanningClarificationProposalBlueprint,
  fingerprint: string,
  sourceIds: readonly string[],
  proposalId: string,
  timestamp: string
): PlanningProposalRecord {
  return {
    proposalId,
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId: proposal.projectId,
    ruleSetId: proposal.ruleSetId,
    ruleSetVersion: proposal.ruleSetVersion,
    ruleId: proposal.ruleId,
    ruleVersion: proposal.ruleVersion,
    fingerprint,
    target: { ...proposal.target },
    category: proposal.category,
    status: proposal.status,
    value: { ...proposal.value },
    title: proposal.title,
    recommendation: proposal.recommendation,
    rationale: proposal.rationale,
    sourceIds: [...sourceIds],
    uncertainty: proposal.uncertainty,
    restriction: proposal.restriction,
    createdAt: timestamp,
    updatedAt: timestamp,
    consequence: proposal.consequence,
    readinessRequirementIds: [...proposal.readinessRequirementIds],
    applicableProjectTypes: [...proposal.applicableProjectTypes],
    applicableDomains: [...proposal.applicableDomains]
  };
}

function generateUuid(runtime: PlanningClarificationRepositoryRuntime): string | null {
  const generator = runtime.uuid ?? globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  return typeof generator === "function" ? generator() : null;
}

function validateGeneratedUuid(
  input: string | null,
  existingIds: ReadonlySet<string>,
  generatedIds: ReadonlySet<string>
): PlanningClarificationMaterializationIssue | null {
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
  issues: PlanningClarificationMaterializationIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue("invalidInput", `${field} must be an array.`, undefined, undefined, undefined, field));
    return null;
  }
  return input;
}

function blocked(
  projectId: string,
  issues: readonly PlanningClarificationMaterializationIssue[]
): PlanningClarificationMaterializationPreparation {
  return { kind: "blocked", result: blockedResult(projectId, issues) };
}

function result(
  outcome: PlanningClarificationRepositoryOutcome,
  projectId: string,
  createdSources: readonly PlanningClarificationMaterializedIdentity[],
  reusedSources: readonly PlanningClarificationMaterializedIdentity[],
  createdProposals: readonly PlanningClarificationMaterializedIdentity[],
  reusedProposals: readonly PlanningClarificationMaterializedIdentity[],
  issues: readonly PlanningClarificationMaterializationIssue[]
): PlanningClarificationRepositoryResult {
  return {
    outcome,
    projectId,
    createdSources: createdSources.map((entry) => ({ ...entry })),
    reusedSources: reusedSources.map((entry) => ({ ...entry })),
    createdProposals: createdProposals.map((entry) => ({ ...entry })),
    reusedProposals: reusedProposals.map((entry) => ({ ...entry })),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningClarificationMaterializationIssueCode,
  message: string,
  sourceKey?: string,
  proposalKey?: string,
  persistedId?: string,
  field?: string,
  sourceIssueCode?: string
): PlanningClarificationMaterializationIssue {
  return dropUndefined({ code, message, sourceKey, proposalKey, persistedId, field, sourceIssueCode });
}

function sameStringArray(first: readonly string[], second: readonly string[]): boolean {
  return first.length === second.length && first.every((entry, index) => entry === second[index]);
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
