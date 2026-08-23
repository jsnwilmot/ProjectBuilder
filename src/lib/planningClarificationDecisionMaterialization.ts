import {
  analyzePlanningClarificationHumanDecision,
  buildPlanningUserAnswerLocator,
  type PlanningClarificationDecisionContractIssueCode,
  type PlanningClarificationDecisionPlan,
  type PlanningClarificationHumanDecisionAction
} from "./planningClarificationDecisionContract";
import {
  PLANNING_RULE_SET_VERSION,
  normalizeProjectPlanningState,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningProposalValue,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "./planningProposals";

export interface PlanningClarificationDecisionRepositoryInput<
  TAction extends PlanningClarificationHumanDecisionAction = Exclude<
    PlanningClarificationHumanDecisionAction,
    "reopen"
  >
> {
  proposalId: string;
  action: TAction;
  value?: PlanningProposalValue;
  reason?: string;
}

export interface PlanningClarificationDecisionRepositoryRuntime {
  now?: () => string;
  uuid?: () => string;
}

export type PlanningClarificationDecisionRepositoryOutcome =
  | "persisted"
  | "blocked"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "persistenceFailed";

export type PlanningClarificationDecisionMaterializationIssueCode =
  | PlanningClarificationDecisionContractIssueCode
  | "invalidInput"
  | "invalidProjectId"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "invalidExistingPlanning"
  | "forbiddenRepositoryInput"
  | "uuidUnavailable"
  | "invalidGeneratedUuid"
  | "duplicateGeneratedUuid"
  | "invalidMaterializationTimestamp"
  | "candidatePlanningInvalid"
  | "candidateTopologyInvalid"
  | "nonCurrentEvidenceSource"
  | "projectChangedDuringDecisionMaterialization"
  | "persistenceFailed";

export interface PlanningClarificationDecisionMaterializationIssue {
  code: PlanningClarificationDecisionMaterializationIssueCode;
  message: string;
  proposalId?: string;
  sourceId?: string;
  decisionId?: string;
  field?: string;
  sourceAvailability?: PlanningSourceReference["availability"];
  sourceIssueCode?: string;
}

export interface PlanningClarificationDecisionRepositoryResult {
  outcome: PlanningClarificationDecisionRepositoryOutcome;
  projectId: string;
  proposalId?: string;
  action?: PlanningClarificationHumanDecisionAction;
  decisionId?: string;
  createdSourceId?: string;
  staleSourceId?: string;
  issues: readonly PlanningClarificationDecisionMaterializationIssue[];
}

export type PlanningClarificationDecisionMaterializationPreparation =
  | { kind: "blocked"; result: PlanningClarificationDecisionRepositoryResult }
  | {
      kind: "ready";
      projectId: string;
      existingPlanning: ProjectPlanningState;
      existingIds: ReadonlySet<string>;
      plan: PlanningClarificationDecisionPlan;
      proposal: PlanningProposalRecord;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const REPOSITORY_INPUT_KEYS = new Set(["proposalId", "action", "value", "reason"]);

export function preparePlanningClarificationDecisionMaterialization(
  projectId: string,
  existingPlanning: unknown,
  input: unknown
): PlanningClarificationDecisionMaterializationPreparation {
  if (!isValidProjectId(projectId)) {
    return blocked(projectId, [
      issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId")
    ]);
  }
  if (!isPlainObject(input)) {
    return blocked(projectId, [issue("invalidInput", "Clarification human decision materialization input must be an object.")]);
  }
  const forbiddenKey = Object.keys(input).find((key) => !REPOSITORY_INPUT_KEYS.has(key));
  if (forbiddenKey) {
    return blocked(projectId, [
      issue("forbiddenRepositoryInput", "Repository decision input cannot include runtime, actor, readiness, output, or persistence fields.", undefined, undefined, undefined, forbiddenKey)
    ]);
  }

  const normalized = normalizeProjectPlanningState(existingPlanning, projectId);
  if (normalized.issues.length > 0) {
    return blocked(projectId, normalized.issues.map((entry) =>
      issue("invalidExistingPlanning", "Existing planning normalization failed; decision materialization is closed.", entry.recordId, undefined, undefined, entry.field ?? entry.collection, entry.code)
    ));
  }

  const contract = analyzePlanningClarificationHumanDecision({
    projectId,
    planning: normalized.planning,
    proposalId: input.proposalId,
    action: input.action,
    value: input.value,
    reason: input.reason
  });
  if (contract.outcome === "blocked") {
    return blocked(projectId, contract.issues.map((entry) =>
      issue(entry.code, entry.message, entry.proposalId, undefined, undefined, entry.field, entry.underlyingIssueCode)
    ));
  }

  const proposal = normalized.planning.proposals.find((candidate) => candidate.proposalId === contract.plan.proposalId);
  if (!proposal) {
    return blocked(projectId, [
      issue("candidateTopologyInvalid", "Allowed contract plan could not be bound to one existing proposal.", contract.plan.proposalId, undefined, undefined, "proposalId")
    ]);
  }
  const evidenceIssue = validateCurrentEvidenceSources(normalized.planning, proposal);
  if (evidenceIssue) {
    return blocked(projectId, [evidenceIssue]);
  }

  return {
    kind: "ready",
    projectId,
    existingPlanning: normalized.planning,
    existingIds: collectExistingPlanningIds(normalized.planning),
    plan: contract.plan,
    proposal: cloneProposal(proposal)
  };
}

export function finalizePlanningClarificationDecisionMaterialization(
  preparation: Extract<PlanningClarificationDecisionMaterializationPreparation, { kind: "ready" }>,
  runtime: PlanningClarificationDecisionRepositoryRuntime = {}
): { result: PlanningClarificationDecisionRepositoryResult; planning?: ProjectPlanningState; materializedAt?: string } {
  const materializedAt = (runtime.now ?? defaultNow)();
  if (!isCanonicalUtcTimestamp(materializedAt)) {
    return {
      result: blockedResult(preparation.projectId, [
        issue("invalidMaterializationTimestamp", "Decision materialization timestamp must be canonical UTC with milliseconds.", preparation.plan.proposalId, undefined, undefined, "now")
      ])
    };
  }

  const generatedIds = new Set<string>();
  const decisionId = generateUuid(runtime);
  const decisionIssue = validateGeneratedUuid(decisionId, preparation.existingIds, generatedIds);
  if (decisionIssue) {
    return { result: blockedResult(preparation.projectId, [decisionIssue]) };
  }
  generatedIds.add(decisionId as string);

  const sourceAction = preparation.plan.userAnswerSourceAction;
  const needsSource = sourceAction !== "none";
  const sourceId = needsSource ? generateUuid(runtime) : null;
  if (needsSource) {
    const sourceIssue = validateGeneratedUuid(sourceId, preparation.existingIds, generatedIds);
    if (sourceIssue) {
      return { result: blockedResult(preparation.projectId, [sourceIssue]) };
    }
    generatedIds.add(sourceId as string);
  }

  const newDecisionId = decisionId as string;
  const newSourceId = sourceId as string | null;
  const sourceLocator = newSourceId
    ? buildPlanningUserAnswerLocator(preparation.plan.proposalId, newDecisionId)
    : null;
  if (newSourceId && !sourceLocator) {
    return {
      result: blockedResult(preparation.projectId, [
        issue("candidateTopologyInvalid", "User-answer source locator could not be built from canonical proposal and decision IDs.", preparation.plan.proposalId, newSourceId, newDecisionId, "locator")
      ])
    };
  }

  const priorHumanSourceId = sourceAction === "createConfirmedAndStalePriorInformational"
    ? findCurrentInformationalUserAnswerSourceId(preparation.existingPlanning, preparation.proposal)
    : sourceAction === "replaceCurrentHumanWithInformational"
      ? findCurrentReplaceableUserAnswerSourceId(preparation.existingPlanning, preparation.proposal)
      : null;
  if (
    (sourceAction === "createConfirmedAndStalePriorInformational" ||
      sourceAction === "replaceCurrentHumanWithInformational") &&
    !priorHumanSourceId
  ) {
    return {
      result: blockedResult(preparation.projectId, [
        issue("candidateTopologyInvalid", "Decision could not identify exactly one replaceable current human-answer source.", preparation.plan.proposalId, undefined, newDecisionId, "sourceIds")
      ])
    };
  }

  const resultingSourceIds = resultingProposalSourceIds(preparation.proposal.sourceIds, sourceAction, newSourceId, priorHumanSourceId);
  const updatedProposal = proposalRecord(preparation.proposal, preparation.plan, resultingSourceIds, newDecisionId, materializedAt);
  const newSource = newSourceId && sourceLocator
    ? userAnswerSourceRecord(
        newSourceId,
        sourceLocator,
        sourceAction === "createConfirmedAndStalePriorInformational" ? "confirmed" : "informational",
        materializedAt
      )
    : null;
  const newDecision = decisionRecord(preparation.plan, preparation.projectId, newDecisionId, materializedAt, resultingSourceIds);

  const candidatePlanning: ProjectPlanningState = {
    ...preparation.existingPlanning,
    sources: [
      ...preparation.existingPlanning.sources.map((source) =>
        source.sourceId === priorHumanSourceId ? { ...source, availability: "stale" as const } : { ...source }
      ),
      ...(newSource ? [newSource] : [])
    ],
    proposals: preparation.existingPlanning.proposals.map((proposal) =>
      proposal.proposalId === preparation.plan.proposalId ? updatedProposal : cloneProposal(proposal)
    ),
    decisions: [
      ...preparation.existingPlanning.decisions.map(cloneDecision),
      newDecision
    ],
    dependencies: preparation.existingPlanning.dependencies.map((dependency) => ({
      ...dependency,
      target: cloneValue(dependency.target)
    })),
    conflicts: preparation.existingPlanning.conflicts.map((conflict) => ({
      ...conflict,
      involvedReferences: conflict.involvedReferences.map(cloneValue),
      resolutionOptionProposalIds: conflict.resolutionOptionProposalIds ? [...conflict.resolutionOptionProposalIds] : undefined,
      affectedProposalIds: conflict.affectedProposalIds ? [...conflict.affectedProposalIds] : undefined
    }))
  };

  const topologyIssue = validateFinalTopology(
    candidatePlanning,
    preparation,
    newDecisionId,
    newSourceId,
    priorHumanSourceId
  );
  if (topologyIssue) {
    return { result: blockedResult(preparation.projectId, [topologyIssue]) };
  }

  const normalizedCandidate = normalizeProjectPlanningState(candidatePlanning, preparation.projectId);
  if (normalizedCandidate.issues.length > 0 || JSON.stringify(normalizedCandidate.planning) !== JSON.stringify(candidatePlanning)) {
    return {
      result: blockedResult(preparation.projectId, normalizedCandidate.issues.length > 0
        ? normalizedCandidate.issues.map((entry) =>
            issue("candidatePlanningInvalid", "Candidate planning normalization failed.", entry.recordId, undefined, undefined, entry.field ?? entry.collection, entry.code)
          )
        : [issue("candidatePlanningInvalid", "Candidate planning changed during normalization.", preparation.plan.proposalId, undefined, undefined, "planning")])
    };
  }

  return {
    planning: candidatePlanning,
    materializedAt,
    result: result("persisted", preparation.projectId, [], {
      proposalId: preparation.plan.proposalId,
      action: preparation.plan.action,
      decisionId: newDecisionId,
      createdSourceId: newSourceId ?? undefined,
      staleSourceId: priorHumanSourceId ?? undefined
    })
  };
}

export function blockedResult(
  projectId: string,
  issues: readonly PlanningClarificationDecisionMaterializationIssue[]
): PlanningClarificationDecisionRepositoryResult {
  return result("blocked", projectId, issues);
}

export function invalidProjectIdDecisionResult(projectId: string): PlanningClarificationDecisionRepositoryResult {
  return blockedResult(projectId, [
    issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId")
  ]);
}

export function projectNotFoundDecisionResult(projectId: string): PlanningClarificationDecisionRepositoryResult {
  return result("projectNotFound", projectId, [
    issue("projectNotFound", "Project was not found.", undefined, undefined, undefined, "projectId")
  ]);
}

export function unsupportedProjectTypeDecisionResult(projectId: string): PlanningClarificationDecisionRepositoryResult {
  return result("unsupportedProjectType", projectId, [
    issue("unsupportedProjectType", "Clarification human decision persistence currently supports only Power Apps Canvas projects.", undefined, undefined, undefined, "appType")
  ]);
}

export function persistenceFailedDecisionResult(projectId: string): PlanningClarificationDecisionRepositoryResult {
  return result("persistenceFailed", projectId, [
    issue("persistenceFailed", "Planning clarification human decision could not be written to storage.", undefined, undefined, undefined, "storage")
  ]);
}

export function projectChangedDuringDecisionMaterializationResult(projectId: string): PlanningClarificationDecisionRepositoryResult {
  return result("blocked", projectId, [
    issue("projectChangedDuringDecisionMaterialization", "Project changed during decision materialization; newer state was preserved.", undefined, undefined, undefined, "project")
  ]);
}

function resultingProposalSourceIds(
  currentSourceIds: readonly string[],
  sourceAction: PlanningDecisionRecordSourceAction,
  newSourceId: string | null,
  priorInformationalSourceId: string | null
): readonly string[] {
  if (sourceAction === "createInformational") {
    return [...currentSourceIds, newSourceId as string];
  }
  if (
    sourceAction === "createConfirmedAndStalePriorInformational" ||
    sourceAction === "replaceCurrentHumanWithInformational"
  ) {
    return currentSourceIds.map((sourceId) => sourceId === priorInformationalSourceId ? (newSourceId as string) : sourceId);
  }
  return [...currentSourceIds];
}

type PlanningDecisionRecordSourceAction = PlanningClarificationDecisionPlan["userAnswerSourceAction"];

function validateCurrentEvidenceSources(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningClarificationDecisionMaterializationIssue | null {
  for (const sourceId of proposal.sourceIds) {
    const matches = planning.sources.filter((source) => source.sourceId === sourceId);
    const source = matches[0];
    if (matches.length !== 1 || !source) {
      return issue("candidateTopologyInvalid", "Proposal evidence source could not be resolved exactly once.", proposal.proposalId, sourceId, undefined, "sourceIds");
    }
    if (source.availability !== "current") {
      return issue(
        "nonCurrentEvidenceSource",
        `Proposal evidence source ${source.sourceId} is ${source.availability}, not current.`,
        proposal.proposalId,
        source.sourceId,
        undefined,
        "sourceIds",
        undefined,
        source.availability
      );
    }
  }
  return null;
}

function proposalRecord(
  proposal: PlanningProposalRecord,
  plan: PlanningClarificationDecisionPlan,
  sourceIds: readonly string[],
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
    status: plan.resultingStatus,
    value: cloneValue(plan.nextValue),
    title: proposal.title,
    recommendation: proposal.recommendation,
    rationale: proposal.rationale,
    sourceIds: [...sourceIds],
    uncertainty: proposal.uncertainty,
    restriction: proposal.restriction,
    createdAt: proposal.createdAt,
    updatedAt: timestamp,
    consequence: proposal.consequence,
    alternativeGroupId: proposal.alternativeGroupId,
    recommendedAlternative: proposal.recommendedAlternative,
    supersededByProposalId: proposal.supersededByProposalId,
    staleReason: proposal.staleReason,
    staleAt: proposal.staleAt,
    conflictIds: proposal.conflictIds ? [...proposal.conflictIds] : undefined,
    readinessRequirementIds: proposal.readinessRequirementIds ? [...proposal.readinessRequirementIds] : undefined,
    lastDecisionId: decisionId,
    applicableProjectTypes: proposal.applicableProjectTypes ? [...proposal.applicableProjectTypes] : undefined,
    applicableDomains: proposal.applicableDomains ? [...proposal.applicableDomains] : undefined
  }) as PlanningProposalRecord;
}

function decisionRecord(
  plan: PlanningClarificationDecisionPlan,
  projectId: string,
  decisionId: string,
  recordedAt: string,
  sourceIds: readonly string[]
): PlanningDecisionRecord {
  return dropUndefined({
    decisionId,
    proposalId: plan.proposalId,
    projectId,
    action: plan.action,
    previousStatus: plan.previousStatus,
    resultingStatus: plan.resultingStatus,
    origin: "userAction" as const,
    recordedAt,
    value: plan.decisionValue ? cloneValue(plan.decisionValue) : undefined,
    reason: plan.decisionReason,
    sourceIds: [...sourceIds],
    ruleSetVersion: PLANNING_RULE_SET_VERSION
  }) as PlanningDecisionRecord;
}

function userAnswerSourceRecord(
  sourceId: string,
  locator: string,
  authority: Extract<PlanningSourceReference["authority"], "informational" | "confirmed">,
  observedAt: string
): PlanningSourceReference {
  return {
    sourceId,
    sourceType: "userAnswer",
    locator,
    label: "User answer",
    authority,
    availability: "current",
    observedAt
  };
}

function findCurrentInformationalUserAnswerSourceId(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): string | null {
  const sourceIds = new Set(proposal.sourceIds);
  const matches = planning.sources.filter((source) =>
    sourceIds.has(source.sourceId) &&
    source.sourceType === "userAnswer" &&
    source.authority === "informational" &&
    source.availability === "current"
  );
  return matches.length === 1 ? matches[0].sourceId : null;
}

function findCurrentReplaceableUserAnswerSourceId(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): string | null {
  const sourceIds = new Set(proposal.sourceIds);
  const matches = planning.sources.filter((source) =>
    sourceIds.has(source.sourceId) &&
    source.sourceType === "userAnswer" &&
    (source.authority === "informational" || source.authority === "confirmed") &&
    source.availability === "current"
  );
  return matches.length === 1 ? matches[0].sourceId : null;
}

function validateFinalTopology(
  planning: ProjectPlanningState,
  preparation: Extract<PlanningClarificationDecisionMaterializationPreparation, { kind: "ready" }>,
  decisionId: string,
  createdSourceId: string | null,
  staleSourceId: string | null
): PlanningClarificationDecisionMaterializationIssue | null {
  const proposals = planning.proposals.filter((proposal) => proposal.proposalId === preparation.plan.proposalId);
  const proposal = proposals[0];
  const decisions = planning.decisions.filter((decision) => decision.decisionId === decisionId);
  const decision = decisions[0];
  if (
    proposals.length !== 1 ||
    decisions.length !== 1 ||
    !proposal ||
    !decision ||
    proposal.proposalId !== preparation.proposal.proposalId ||
    proposal.createdAt !== preparation.proposal.createdAt ||
    proposal.status !== preparation.plan.resultingStatus ||
    proposal.lastDecisionId !== decisionId ||
    proposal.fingerprint !== preparation.proposal.fingerprint ||
    decision.proposalId !== proposal.proposalId ||
    decision.resultingStatus !== proposal.status ||
    !sameStringArray(decision.sourceIds ?? [], proposal.sourceIds)
  ) {
    return issue("candidateTopologyInvalid", "Final human decision topology is not coherent.", preparation.plan.proposalId, undefined, decisionId, "planning");
  }

  if (preparation.plan.action === "reopen") {
    if (
      createdSourceId !== null ||
      staleSourceId !== null ||
      !sameStringArray(proposal.sourceIds, preparation.proposal.sourceIds) ||
      !sameValue(proposal.value, preparation.proposal.value) ||
      JSON.stringify(planning.sources) !== JSON.stringify(preparation.existingPlanning.sources)
    ) {
      return issue("candidateTopologyInvalid", "Reopen must preserve proposal value and sources without source mutation.", preparation.plan.proposalId, undefined, decisionId, "sources");
    }
  }

  if (preparation.plan.action === "revise") {
    const source = createdSourceId ? planning.sources.find((entry) => entry.sourceId === createdSourceId) : undefined;
    if (
      !source ||
      source.sourceType !== "userAnswer" ||
      source.authority !== "informational" ||
      source.availability !== "current" ||
      source.locator !== buildPlanningUserAnswerLocator(preparation.plan.proposalId, decisionId) ||
      !proposal.sourceIds.includes(source.sourceId) ||
      !(decision.sourceIds ?? []).includes(source.sourceId)
    ) {
      return issue("candidateTopologyInvalid", "Revised proposal user-answer provenance is not coherent.", preparation.plan.proposalId, createdSourceId ?? undefined, decisionId, "sources");
    }

    if (preparation.plan.userAnswerSourceAction === "replaceCurrentHumanWithInformational") {
      const staleSource = staleSourceId ? planning.sources.find((entry) => entry.sourceId === staleSourceId) : undefined;
      const expectedSourceIds = resultingProposalSourceIds(
        preparation.proposal.sourceIds,
        preparation.plan.userAnswerSourceAction,
        createdSourceId,
        staleSourceId
      );
      if (
        !staleSource ||
        staleSource.sourceType !== "userAnswer" ||
        (staleSource.authority !== "informational" && staleSource.authority !== "confirmed") ||
        staleSource.availability !== "stale" ||
        proposal.sourceIds.includes(staleSource.sourceId) ||
        !sameStringArray(proposal.sourceIds, expectedSourceIds)
      ) {
        return issue("candidateTopologyInvalid", "Replacement revision did not preserve the prior human answer as stale history.", preparation.plan.proposalId, staleSourceId ?? undefined, decisionId, "sources");
      }
    } else if (staleSourceId !== null) {
      return issue("candidateTopologyInvalid", "First revision cannot stale an existing source.", preparation.plan.proposalId, staleSourceId, decisionId, "sources");
    }
  }

  if (preparation.plan.action === "confirm") {
    const staleSource = staleSourceId ? planning.sources.find((entry) => entry.sourceId === staleSourceId) : undefined;
    const confirmedSource = createdSourceId ? planning.sources.find((entry) => entry.sourceId === createdSourceId) : undefined;
    const reviseDecisions = staleSource
      ? preparation.existingPlanning.decisions.filter((entry) =>
          entry.proposalId === preparation.plan.proposalId &&
          buildPlanningUserAnswerLocator(preparation.plan.proposalId, entry.decisionId) === staleSource.locator
        )
      : [];
    const reviseDecision = reviseDecisions.length === 1 ? reviseDecisions[0] : undefined;
    if (
      !staleSource ||
      staleSource.sourceType !== "userAnswer" ||
      staleSource.authority !== "informational" ||
      staleSource.availability !== "stale" ||
      !confirmedSource ||
      confirmedSource.sourceType !== "userAnswer" ||
      confirmedSource.authority !== "confirmed" ||
      confirmedSource.availability !== "current" ||
      confirmedSource.locator !== buildPlanningUserAnswerLocator(preparation.plan.proposalId, decisionId) ||
      proposal.sourceIds.includes(staleSource.sourceId) ||
      !proposal.sourceIds.includes(confirmedSource.sourceId) ||
      !(decision.sourceIds ?? []).includes(confirmedSource.sourceId) ||
      reviseDecision?.action !== "revise" ||
      reviseDecision.origin !== "userAction" ||
      reviseDecision.resultingStatus !== "Revised" ||
      !reviseDecision.sourceIds?.includes(staleSource.sourceId)
    ) {
      return issue("candidateTopologyInvalid", "Confirmed proposal user-answer provenance is not coherent.", preparation.plan.proposalId, createdSourceId ?? undefined, decisionId, "sources");
    }
  }

  return null;
}

function sameValue(first: PlanningProposalValue, second: PlanningProposalValue): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
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

function generateUuid(runtime: PlanningClarificationDecisionRepositoryRuntime): string | null {
  const generator = runtime.uuid ?? globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  const generated = typeof generator === "function" ? generator() : null;
  return typeof generated === "string" ? generated : null;
}

function validateGeneratedUuid(
  input: string | null,
  existingIds: ReadonlySet<string>,
  generatedIds: ReadonlySet<string>
): PlanningClarificationDecisionMaterializationIssue | null {
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

function cloneProposal(proposal: PlanningProposalRecord): PlanningProposalRecord {
  return dropUndefined({
    ...proposal,
    target: { ...proposal.target },
    value: cloneValue(proposal.value),
    sourceIds: [...proposal.sourceIds],
    conflictIds: proposal.conflictIds ? [...proposal.conflictIds] : undefined,
    readinessRequirementIds: proposal.readinessRequirementIds ? [...proposal.readinessRequirementIds] : undefined,
    applicableProjectTypes: proposal.applicableProjectTypes ? [...proposal.applicableProjectTypes] : undefined,
    applicableDomains: proposal.applicableDomains ? [...proposal.applicableDomains] : undefined
  }) as PlanningProposalRecord;
}

function cloneDecision(decision: PlanningDecisionRecord): PlanningDecisionRecord {
  return dropUndefined({
    ...decision,
    value: decision.value ? cloneValue(decision.value) : undefined,
    sourceIds: decision.sourceIds ? [...decision.sourceIds] : undefined
  }) as PlanningDecisionRecord;
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function result(
  outcome: PlanningClarificationDecisionRepositoryOutcome,
  projectId: string,
  issues: readonly PlanningClarificationDecisionMaterializationIssue[],
  metadata: Partial<Omit<PlanningClarificationDecisionRepositoryResult, "outcome" | "projectId" | "issues">> = {}
): PlanningClarificationDecisionRepositoryResult {
  return dropUndefined({
    outcome,
    projectId,
    ...metadata,
    issues: issues.map((entry) => ({ ...entry }))
  }) as PlanningClarificationDecisionRepositoryResult;
}

function blocked(
  projectId: string,
  issues: readonly PlanningClarificationDecisionMaterializationIssue[]
): PlanningClarificationDecisionMaterializationPreparation {
  return { kind: "blocked", result: blockedResult(projectId, issues) };
}

function issue(
  code: PlanningClarificationDecisionMaterializationIssueCode,
  message: string,
  proposalId?: string,
  sourceId?: string,
  decisionId?: string,
  field?: string | number,
  sourceIssueCode?: string,
  sourceAvailability?: PlanningSourceReference["availability"]
): PlanningClarificationDecisionMaterializationIssue {
  return dropUndefined({
    code,
    message,
    proposalId,
    sourceId,
    decisionId,
    field: field === undefined ? undefined : String(field),
    sourceAvailability,
    sourceIssueCode
  });
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
