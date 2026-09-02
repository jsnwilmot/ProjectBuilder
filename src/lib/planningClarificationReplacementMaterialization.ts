import { isSha256Hex } from "../core/sha256Fingerprint";
import type {
  PlanningClarificationProposalBlueprint,
  PlanningClarificationSourceBlueprint
} from "./planningClarificationBlueprints";
import type { PlanningClarificationFingerprintRecord } from "./planningClarificationFingerprints";
import {
  analyzePlanningClarificationReplacements,
  type PlanningClarificationReplacementAnalysisIssue,
  type PlanningClarificationProposalReplacementAnalysis
} from "./planningClarificationReplacementAnalysis";
import {
  reconcilePlanningClarificationSources,
  type PlanningClarificationSourceReconciliationResult
} from "./planningClarificationSourceReconciliation";
import {
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION,
  isValidPlanningTransition,
  normalizeProjectPlanningState,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "./planningProposals";

export interface PlanningClarificationReplacementRepositoryInput {
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
  fingerprints: readonly PlanningClarificationFingerprintRecord[];
}

export interface PlanningClarificationReplacementRepositoryRuntime {
  now?: () => string;
  uuid?: () => string;
}

export type PlanningClarificationReplacementRepositoryOutcome =
  | "persisted"
  | "unchanged"
  | "blocked"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "persistenceFailed";

export interface PlanningClarificationReplacementMaterializedSource {
  semanticKey: string;
  persistedId: string;
}

export interface PlanningClarificationReplacementMaterializedProposal {
  semanticKey: string;
  persistedId: string;
  predecessorProposalId: string;
  supersedeDecisionId: string;
}

export type PlanningClarificationReplacementMaterializationIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "invalidExistingPlanning"
  | "replacementAnalysisBlocked"
  | "replacementBindingFailure"
  | "replacementProposalStatusInvalid"
  | "replacementSourceBindingFailure"
  | "predecessorStateMismatch"
  | "predecessorAlreadyLinked"
  | "invalidStatusTransition"
  | "uuidUnavailable"
  | "invalidGeneratedUuid"
  | "duplicateGeneratedUuid"
  | "invalidMaterializationTimestamp"
  | "candidatePlanningInvalid"
  | "candidateReplacementTopologyInvalid"
  | "projectChangedDuringReplacementMaterialization"
  | "persistenceFailed";

export interface PlanningClarificationReplacementMaterializationIssue {
  code: PlanningClarificationReplacementMaterializationIssueCode;
  message: string;
  sourceKey?: string;
  proposalKey?: string;
  persistedId?: string;
  field?: string;
  sourceIssueCode?: string;
}

export interface PlanningClarificationReplacementRepositoryResult {
  outcome: PlanningClarificationReplacementRepositoryOutcome;
  projectId: string;
  createdSources: readonly PlanningClarificationReplacementMaterializedSource[];
  createdProposals: readonly PlanningClarificationReplacementMaterializedProposal[];
  issues: readonly PlanningClarificationReplacementMaterializationIssue[];
}

interface ReplacementProposalPreparation {
  proposalKey: string;
  predecessorProposalId: string;
  generatedProposal: PlanningClarificationProposalBlueprint;
  generatedFingerprint: string;
  sourceIdsByKey: ReadonlyMap<string, string>;
}

export type PlanningClarificationReplacementMaterializationPreparation =
  | { kind: "blocked"; result: PlanningClarificationReplacementRepositoryResult }
  | { kind: "unchanged"; result: PlanningClarificationReplacementRepositoryResult }
  | {
      kind: "ready";
      projectId: string;
      existingPlanning: ProjectPlanningState;
      sources: readonly PlanningClarificationSourceBlueprint[];
      proposals: readonly PlanningClarificationProposalBlueprint[];
      fingerprints: readonly PlanningClarificationFingerprintRecord[];
      existingIds: ReadonlySet<string>;
      replacementSources: readonly PlanningClarificationSourceBlueprint[];
      replacements: readonly ReplacementProposalPreparation[];
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export async function preparePlanningClarificationReplacementMaterialization(
  projectId: string,
  existingPlanning: unknown,
  input: unknown
): Promise<PlanningClarificationReplacementMaterializationPreparation> {
  if (!isValidProjectId(projectId)) {
    return blocked(projectId, [
      issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId")
    ]);
  }
  if (!isPlainObject(input)) {
    return blocked(projectId, [issue("invalidInput", "Clarification replacement materialization input must be an object.")]);
  }
  const issues: PlanningClarificationReplacementMaterializationIssue[] = [];
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
        "Existing planning normalization failed; replacement materialization is closed.",
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
        "replacementSourceBindingFailure",
        "Source reconciliation blocked replacement materialization.",
        entry.sourceKey,
        undefined,
        entry.existingSourceId,
        entry.field,
        entry.sourceIssueCode ?? entry.code
      )
    ));
  }

  const replacementAnalysis = await analyzePlanningClarificationReplacements({
    projectId,
    existingPlanning: normalized.planning,
    sources,
    proposals,
    fingerprints
  });
  if (replacementAnalysis.outcome === "blocked") {
    return blocked(projectId, replacementAnalysis.issues.map(mapReplacementAnalysisIssue));
  }
  if (replacementAnalysis.outcome === "unchanged") {
    return unchanged(projectId);
  }

  const sourceBlueprints = sources as readonly PlanningClarificationSourceBlueprint[];
  const proposalBlueprints = proposals as readonly PlanningClarificationProposalBlueprint[];
  const fingerprintRecords = fingerprints as readonly PlanningClarificationFingerprintRecord[];
  const sourceBlueprintsByKey = uniqueByKey(sourceBlueprints, (source) => source.sourceKey);
  const proposalBlueprintsByKey = uniqueByKey(proposalBlueprints, (proposal) => proposal.proposalKey);
  const fingerprintsByKey = uniqueByKey(fingerprintRecords, (fingerprint) => fingerprint.proposalKey);
  const planningProposalsById = new Map(normalized.planning.proposals.map((proposal) => [proposal.proposalId, proposal]));
  const currentSourceReconciliationByKey = new Map(sourceReconciliation.current.map((entry) => [entry.sourceKey, entry]));
  const approvedReplacementSourceKeys = new Set(replacementAnalysis.sourceReplacements.map((entry) => entry.replacementSourceKey));

  collectDuplicateKeyIssues(sourceBlueprintsByKey.duplicates, "replacementSourceBindingFailure", "Generated source blueprint key is duplicated.", issues, "sourceKey");
  collectDuplicateKeyIssues(proposalBlueprintsByKey.duplicates, "replacementBindingFailure", "Generated proposal blueprint key is duplicated.", issues, "proposalKey");
  collectDuplicateKeyIssues(fingerprintsByKey.duplicates, "replacementBindingFailure", "Generated fingerprint proposal key is duplicated.", issues, "proposalKey");

  const replacementSources = [...approvedReplacementSourceKeys].sort().map((sourceKey) => sourceBlueprintsByKey.values.get(sourceKey));
  for (const sourceKey of approvedReplacementSourceKeys) {
    const blueprint = sourceBlueprintsByKey.values.get(sourceKey);
    const reconciliation = currentSourceReconciliationByKey.get(sourceKey);
    if (!blueprint || reconciliation?.disposition !== "newSource") {
      issues.push(issue("replacementSourceBindingFailure", "Replacement source must be an E-approved generated new source.", sourceKey, undefined, reconciliation?.existingSourceId, "sourceKey"));
    }
  }

  const replacements: ReplacementProposalPreparation[] = [];
  for (const replacement of replacementAnalysis.proposalReplacements) {
    const generatedProposal = proposalBlueprintsByKey.values.get(replacement.proposalKey);
    const fingerprint = fingerprintsByKey.values.get(replacement.proposalKey);
    const predecessor = planningProposalsById.get(replacement.staleProposalId);
    if (!generatedProposal || !fingerprint || fingerprint.fingerprint !== replacement.generatedFingerprint || !isSha256Hex(fingerprint.fingerprint)) {
      issues.push(issue("replacementBindingFailure", "Replacement proposal must bind exactly to one generated blueprint and fingerprint.", undefined, replacement.proposalKey, replacement.staleProposalId, "fingerprint"));
      continue;
    }
    if (generatedProposal.status !== "Needs Clarification") {
      issues.push(issue("replacementProposalStatusInvalid", "Replacement proposal must remain Needs Clarification.", undefined, replacement.proposalKey, replacement.staleProposalId, "status"));
      continue;
    }
    const predecessorIssue = validatePredecessor(replacement, predecessor, normalized.planning);
    if (predecessorIssue) {
      issues.push(predecessorIssue);
      continue;
    }
    const sourceBinding = bindProposalSources(generatedProposal, approvedReplacementSourceKeys, currentSourceReconciliationByKey);
    if (sourceBinding.issues.length > 0) {
      issues.push(...sourceBinding.issues);
      continue;
    }
    replacements.push({
      proposalKey: replacement.proposalKey,
      predecessorProposalId: replacement.staleProposalId,
      generatedProposal,
      generatedFingerprint: replacement.generatedFingerprint,
      sourceIdsByKey: sourceBinding.sourceIdsByKey
    });
  }

  if (issues.length > 0) {
    return blocked(projectId, dedupeIssues(issues).sort(sortIssues));
  }
  if (replacements.length === 0) {
    return unchanged(projectId);
  }

  return {
    kind: "ready",
    projectId,
    existingPlanning: normalized.planning,
    sources: sourceBlueprints,
    proposals: proposalBlueprints,
    fingerprints: fingerprintRecords,
    existingIds: collectExistingPlanningIds(normalized.planning),
    replacementSources: replacementSources.filter((source): source is PlanningClarificationSourceBlueprint => Boolean(source)),
    replacements: replacements.sort(sortReplacements)
  };
}

export async function finalizePlanningClarificationReplacementMaterialization(
  preparation: Extract<PlanningClarificationReplacementMaterializationPreparation, { kind: "ready" }>,
  runtime: PlanningClarificationReplacementRepositoryRuntime = {}
): Promise<{ result: PlanningClarificationReplacementRepositoryResult; planning?: ProjectPlanningState; materializedAt?: string }> {
  const materializedAt = (runtime.now ?? defaultNow)();
  if (!isCanonicalUtcTimestamp(materializedAt)) {
    return {
      result: blockedResult(preparation.projectId, [
        issue("invalidMaterializationTimestamp", "Materialization timestamp must be canonical UTC with milliseconds.", undefined, undefined, undefined, "now")
      ])
    };
  }

  const generatedIds = new Set<string>();
  const createdSources: PlanningClarificationReplacementMaterializedSource[] = [];
  const createdSourceRecords: PlanningSourceReference[] = [];
  const createdSourceIdsByKey = new Map<string, string>();
  for (const source of [...preparation.replacementSources].sort(sortSources)) {
    const generated = generateUuid(runtime);
    const validationIssue = validateGeneratedUuid(generated, preparation.existingIds, generatedIds);
    if (validationIssue) {
      return { result: blockedResult(preparation.projectId, [validationIssue]) };
    }
    const generatedId = generated as string;
    generatedIds.add(generatedId);
    createdSourceIdsByKey.set(source.sourceKey, generatedId);
    createdSources.push({ semanticKey: source.sourceKey, persistedId: generatedId });
    createdSourceRecords.push(sourceRecord(source, generatedId, materializedAt));
  }

  const proposalIdsByKey = new Map<string, string>();
  for (const replacement of preparation.replacements) {
    const generated = generateUuid(runtime);
    const validationIssue = validateGeneratedUuid(generated, preparation.existingIds, generatedIds);
    if (validationIssue) {
      return { result: blockedResult(preparation.projectId, [validationIssue]) };
    }
    const generatedId = generated as string;
    generatedIds.add(generatedId);
    proposalIdsByKey.set(replacement.proposalKey, generatedId);
  }

  const decisionIdsByKey = new Map<string, string>();
  for (const replacement of preparation.replacements) {
    const generated = generateUuid(runtime);
    const validationIssue = validateGeneratedUuid(generated, preparation.existingIds, generatedIds);
    if (validationIssue) {
      return { result: blockedResult(preparation.projectId, [validationIssue]) };
    }
    const generatedId = generated as string;
    generatedIds.add(generatedId);
    decisionIdsByKey.set(replacement.proposalKey, generatedId);
  }

  const replacementsByPredecessorId = new Map(preparation.replacements.map((entry) => [entry.predecessorProposalId, entry]));
  const createdProposals: PlanningClarificationReplacementMaterializedProposal[] = [];
  const supersedeDecisions: PlanningDecisionRecord[] = [];
  const candidatePlanning: ProjectPlanningState = {
    ...preparation.existingPlanning,
    sources: [
      ...preparation.existingPlanning.sources.map(cloneSource),
      ...createdSourceRecords
    ],
    proposals: [
      ...preparation.existingPlanning.proposals.map((proposal) => {
        const replacement = replacementsByPredecessorId.get(proposal.proposalId);
        if (!replacement) {
          return cloneProposal(proposal);
        }
        const successorId = proposalIdsByKey.get(replacement.proposalKey)!;
        const decisionId = decisionIdsByKey.get(replacement.proposalKey)!;
        createdProposals.push({
          semanticKey: replacement.proposalKey,
          persistedId: successorId,
          predecessorProposalId: proposal.proposalId,
          supersedeDecisionId: decisionId
        });
        supersedeDecisions.push(supersedeDecision(proposal, decisionId, materializedAt));
        return supersededProposalRecord(proposal, successorId, decisionId, materializedAt);
      }),
      ...preparation.replacements.map((replacement) => {
        const sourceIds = replacement.generatedProposal.sourceKeys.map((sourceKey) =>
          createdSourceIdsByKey.get(sourceKey) ?? replacement.sourceIdsByKey.get(sourceKey)
        );
        return proposalRecord(
          replacement.generatedProposal,
          replacement.generatedFingerprint,
          sourceIds as string[],
          proposalIdsByKey.get(replacement.proposalKey)!,
          materializedAt
        );
      })
    ],
    decisions: [
      ...preparation.existingPlanning.decisions.map(cloneDecision),
      ...supersedeDecisions.sort((first, second) => {
        const firstKey = proposalKeyForDecision(preparation.replacements, first.proposalId);
        const secondKey = proposalKeyForDecision(preparation.replacements, second.proposalId);
        return firstKey.localeCompare(secondKey);
      })
    ],
    dependencies: preparation.existingPlanning.dependencies.map((dependency) => ({
      ...dependency,
      target: "target" in dependency && typeof dependency.target === "object" ? cloneValue(dependency.target) : dependency.target
    })),
    conflicts: preparation.existingPlanning.conflicts.map((conflict) => ({
      ...conflict,
      involvedReferences: conflict.involvedReferences.map(cloneValue),
      resolutionOptionProposalIds: conflict.resolutionOptionProposalIds ? [...conflict.resolutionOptionProposalIds] : undefined,
      affectedProposalIds: conflict.affectedProposalIds ? [...conflict.affectedProposalIds] : undefined
    }))
  };

  const topologyIssue = validateFinalTopology(candidatePlanning, createdProposals);
  if (topologyIssue) {
    return { result: blockedResult(preparation.projectId, [topologyIssue]) };
  }

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

  const postCandidate = await analyzePlanningClarificationReplacements({
    projectId: preparation.projectId,
    existingPlanning: candidatePlanning,
    sources: preparation.sources,
    proposals: preparation.proposals,
    fingerprints: preparation.fingerprints
  });
  if (postCandidate.outcome !== "unchanged" || postCandidate.issues.length > 0) {
    return {
      result: blockedResult(preparation.projectId, [
        issue("candidateReplacementTopologyInvalid", "Candidate replacement topology did not close replacement analysis.", undefined, undefined, undefined, "planning", postCandidate.issues[0]?.code)
      ])
    };
  }

  return {
    planning: candidatePlanning,
    materializedAt,
    result: result("persisted", preparation.projectId, createdSources, createdProposals.sort(sortMaterializedProposals), [])
  };
}

export function blockedResult(
  projectId: string,
  issues: readonly PlanningClarificationReplacementMaterializationIssue[]
): PlanningClarificationReplacementRepositoryResult {
  return result("blocked", projectId, [], [], issues);
}

export function invalidProjectIdReplacementResult(projectId: string): PlanningClarificationReplacementRepositoryResult {
  return blockedResult(projectId, [
    issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId")
  ]);
}

export function projectNotFoundReplacementResult(projectId: string): PlanningClarificationReplacementRepositoryResult {
  return result("projectNotFound", projectId, [], [], [
    issue("projectNotFound", "Project was not found.", undefined, undefined, projectId, "projectId")
  ]);
}

export function unsupportedProjectTypeReplacementResult(projectId: string): PlanningClarificationReplacementRepositoryResult {
  return result("unsupportedProjectType", projectId, [], [], [
    issue("unsupportedProjectType", "Clarification replacement materialization currently supports only Power Apps Canvas projects.", undefined, undefined, undefined, "appType")
  ]);
}

export function persistenceFailedReplacementResult(projectId: string): PlanningClarificationReplacementRepositoryResult {
  return result("persistenceFailed", projectId, [], [], [
    issue("persistenceFailed", "Planning replacement materialization could not be written to storage.", undefined, undefined, undefined, "storage")
  ]);
}

export function projectChangedDuringReplacementMaterializationResult(projectId: string): PlanningClarificationReplacementRepositoryResult {
  return result("blocked", projectId, [], [], [
    issue("projectChangedDuringReplacementMaterialization", "Project changed during replacement materialization; newer state was preserved.", undefined, undefined, projectId, "project")
  ]);
}

function validatePredecessor(
  replacement: PlanningClarificationProposalReplacementAnalysis,
  predecessor: PlanningProposalRecord | undefined,
  planning: ProjectPlanningState
): PlanningClarificationReplacementMaterializationIssue | null {
  if (
    !predecessor ||
    predecessor.category !== "clarification" ||
    predecessor.target.kind !== "readinessRequirement" ||
    predecessor.target.operation !== "clarificationOnly" ||
    predecessor.status !== "Stale" ||
    proposalKeyForExisting(predecessor) !== replacement.proposalKey ||
    predecessor.fingerprint !== replacement.existingFingerprint ||
    predecessor.staleReason !== replacement.staleReason
  ) {
    return issue("predecessorStateMismatch", "Replacement predecessor must be the exact E-proven stale clarification proposal.", undefined, replacement.proposalKey, replacement.staleProposalId, "status");
  }
  if (predecessor.supersededByProposalId) {
    return issue("predecessorAlreadyLinked", "Stale predecessor is already linked to a successor.", undefined, replacement.proposalKey, predecessor.proposalId, "supersededByProposalId");
  }
  if (!isValidPlanningTransition("Stale", "Superseded")) {
    return issue("invalidStatusTransition", "Stale predecessor cannot transition to Superseded.", undefined, replacement.proposalKey, predecessor.proposalId, "status");
  }
  const staleDecision = planning.decisions.find((decision) => decision.decisionId === predecessor.lastDecisionId);
  if (
    !predecessor.staleAt ||
    !predecessor.lastDecisionId ||
    !staleDecision ||
    staleDecision.proposalId !== predecessor.proposalId ||
    staleDecision.action !== "markStale" ||
    staleDecision.resultingStatus !== "Stale" ||
    staleDecision.origin !== "deterministicRule" ||
    staleDecision.reason !== predecessor.staleReason ||
    staleDecision.recordedAt !== predecessor.staleAt
  ) {
    return issue("predecessorStateMismatch", "Stale predecessor must retain coherent markStale history.", undefined, replacement.proposalKey, predecessor.proposalId, "lastDecisionId");
  }
  return null;
}

function bindProposalSources(
  proposal: PlanningClarificationProposalBlueprint,
  replacementSourceKeys: ReadonlySet<string>,
  currentSourceReconciliationByKey: ReadonlyMap<string, PlanningClarificationSourceReconciliationResult["current"][number]>
): { sourceIdsByKey: ReadonlyMap<string, string>; issues: readonly PlanningClarificationReplacementMaterializationIssue[] } {
  const sourceIdsByKey = new Map<string, string>();
  const issues: PlanningClarificationReplacementMaterializationIssue[] = [];
  for (const sourceKey of proposal.sourceKeys) {
    if (replacementSourceKeys.has(sourceKey)) {
      continue;
    }
    const reconciliation = currentSourceReconciliationByKey.get(sourceKey);
    if (reconciliation?.disposition !== "exactMatch" || !reconciliation.existingSourceId) {
      issues.push(issue("replacementSourceBindingFailure", "Non-replacement proposal source must reuse one exact current source.", sourceKey, proposal.proposalKey, reconciliation?.existingSourceId, "sourceIds"));
      continue;
    }
    sourceIdsByKey.set(sourceKey, reconciliation.existingSourceId);
  }
  return { sourceIdsByKey, issues };
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
    status: "Needs Clarification",
    value: cloneValue(proposal.value),
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

function supersededProposalRecord(
  proposal: PlanningProposalRecord,
  supersededByProposalId: string,
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
    status: "Superseded" as const,
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
    supersededByProposalId,
    conflictIds: proposal.conflictIds ? [...proposal.conflictIds] : undefined,
    readinessRequirementIds: proposal.readinessRequirementIds ? [...proposal.readinessRequirementIds] : undefined,
    lastDecisionId: decisionId,
    applicableProjectTypes: proposal.applicableProjectTypes ? [...proposal.applicableProjectTypes] : undefined,
    applicableDomains: proposal.applicableDomains ? [...proposal.applicableDomains] : undefined
  }) as PlanningProposalRecord;
}

function supersedeDecision(
  proposal: PlanningProposalRecord,
  decisionId: string,
  recordedAt: string
): PlanningDecisionRecord {
  return {
    decisionId,
    proposalId: proposal.proposalId,
    projectId: proposal.projectId,
    action: "supersede",
    previousStatus: "Stale",
    resultingStatus: "Superseded",
    origin: "deterministicRule",
    recordedAt,
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  };
}

function validateFinalTopology(
  planning: ProjectPlanningState,
  created: readonly PlanningClarificationReplacementMaterializedProposal[]
): PlanningClarificationReplacementMaterializationIssue | null {
  for (const entry of created) {
    const predecessor = planning.proposals.find((proposal) => proposal.proposalId === entry.predecessorProposalId);
    const successor = planning.proposals.find((proposal) => proposal.proposalId === entry.persistedId);
    const decision = planning.decisions.find((candidate) => candidate.decisionId === entry.supersedeDecisionId);
    if (
      !predecessor ||
      predecessor.status !== "Superseded" ||
      predecessor.supersededByProposalId !== entry.persistedId ||
      predecessor.lastDecisionId !== entry.supersedeDecisionId ||
      predecessor.staleReason !== undefined ||
      predecessor.staleAt !== undefined ||
      !successor ||
      successor.status !== "Needs Clarification" ||
      proposalKeyForExisting(successor) !== entry.semanticKey ||
      !decision ||
      decision.proposalId !== entry.predecessorProposalId ||
      decision.action !== "supersede" ||
      decision.resultingStatus !== "Superseded"
    ) {
      return issue("candidateReplacementTopologyInvalid", "Final replacement topology is not coherent.", undefined, entry.semanticKey, entry.predecessorProposalId, "planning");
    }
  }
  return null;
}

function mapReplacementAnalysisIssue(
  entry: PlanningClarificationReplacementAnalysisIssue
): PlanningClarificationReplacementMaterializationIssue {
  return issue(
    "replacementAnalysisBlocked",
    "Replacement analysis blocked materialization.",
    entry.sourceKey,
    entry.proposalKey,
    entry.persistedId,
    entry.field,
    entry.sourceIssueCode ?? entry.code
  );
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

function generateUuid(runtime: PlanningClarificationReplacementRepositoryRuntime): string | null {
  const generator = runtime.uuid ?? globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  return typeof generator === "function" ? generator() : null;
}

function validateGeneratedUuid(
  input: string | null,
  existingIds: ReadonlySet<string>,
  generatedIds: ReadonlySet<string>
): PlanningClarificationReplacementMaterializationIssue | null {
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
  issues: PlanningClarificationReplacementMaterializationIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue("invalidInput", `${field} must be an array.`, undefined, undefined, undefined, field));
    return null;
  }
  return input;
}

function uniqueByKey<T>(
  entries: readonly T[],
  getKey: (entry: T) => string
): { values: Map<string, T>; duplicates: readonly string[] } {
  const values = new Map<string, T>();
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = getKey(entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!values.has(key)) {
      values.set(key, entry);
    }
  }
  return {
    values,
    duplicates: [...counts].filter(([, count]) => count > 1).map(([key]) => key).sort()
  };
}

function collectDuplicateKeyIssues(
  duplicates: readonly string[],
  code: PlanningClarificationReplacementMaterializationIssueCode,
  message: string,
  issues: PlanningClarificationReplacementMaterializationIssue[],
  field: string
): void {
  for (const key of duplicates) {
    issues.push(issue(code, message, field === "sourceKey" ? key : undefined, field === "proposalKey" ? key : undefined, undefined, field));
  }
}

function cloneSource(source: PlanningSourceReference): PlanningSourceReference {
  return { ...source };
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

function cloneDecision(decision: PlanningDecisionRecord): PlanningDecisionRecord {
  return {
    ...decision,
    value: decision.value ? cloneValue(decision.value) : undefined,
    sourceIds: decision.sourceIds ? [...decision.sourceIds] : undefined
  };
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function proposalKeyForExisting(proposal: PlanningProposalRecord): string {
  return `clarification|${proposal.ruleId}|${proposal.target.targetKey}`;
}

function proposalKeyForDecision(
  replacements: readonly ReplacementProposalPreparation[],
  proposalId: string
): string {
  return replacements.find((entry) => entry.predecessorProposalId === proposalId)?.proposalKey ?? "";
}

function blocked(
  projectId: string,
  issues: readonly PlanningClarificationReplacementMaterializationIssue[]
): PlanningClarificationReplacementMaterializationPreparation {
  return { kind: "blocked", result: blockedResult(projectId, issues) };
}

function unchanged(projectId: string): PlanningClarificationReplacementMaterializationPreparation {
  return { kind: "unchanged", result: result("unchanged", projectId, [], [], []) };
}

function result(
  outcome: PlanningClarificationReplacementRepositoryOutcome,
  projectId: string,
  createdSources: readonly PlanningClarificationReplacementMaterializedSource[],
  createdProposals: readonly PlanningClarificationReplacementMaterializedProposal[],
  issues: readonly PlanningClarificationReplacementMaterializationIssue[]
): PlanningClarificationReplacementRepositoryResult {
  return {
    outcome,
    projectId,
    createdSources: createdSources.map((entry) => ({ ...entry })),
    createdProposals: createdProposals.map((entry) => ({ ...entry })),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningClarificationReplacementMaterializationIssueCode,
  message: string,
  sourceKey?: string,
  proposalKey?: string,
  persistedId?: string,
  field?: string | number,
  sourceIssueCode?: string
): PlanningClarificationReplacementMaterializationIssue {
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
  issues: readonly PlanningClarificationReplacementMaterializationIssue[]
): PlanningClarificationReplacementMaterializationIssue[] {
  const unique = new Map<string, PlanningClarificationReplacementMaterializationIssue>();
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
  first: PlanningClarificationReplacementMaterializationIssue,
  second: PlanningClarificationReplacementMaterializationIssue
): number {
  return first.code.localeCompare(second.code) ||
    (first.sourceKey ?? "").localeCompare(second.sourceKey ?? "") ||
    (first.proposalKey ?? "").localeCompare(second.proposalKey ?? "") ||
    (first.persistedId ?? "").localeCompare(second.persistedId ?? "") ||
    (first.field ?? "").localeCompare(second.field ?? "");
}

function sortSources(first: PlanningClarificationSourceBlueprint, second: PlanningClarificationSourceBlueprint): number {
  return first.sourceKey.localeCompare(second.sourceKey);
}

function sortReplacements(first: ReplacementProposalPreparation, second: ReplacementProposalPreparation): number {
  return first.proposalKey.localeCompare(second.proposalKey) ||
    first.predecessorProposalId.localeCompare(second.predecessorProposalId);
}

function sortMaterializedProposals(
  first: PlanningClarificationReplacementMaterializedProposal,
  second: PlanningClarificationReplacementMaterializedProposal
): number {
  return first.semanticKey.localeCompare(second.semanticKey) ||
    first.predecessorProposalId.localeCompare(second.predecessorProposalId);
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
