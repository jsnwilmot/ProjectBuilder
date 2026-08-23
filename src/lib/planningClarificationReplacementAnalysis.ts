import type {
  PlanningClarificationProposalBlueprint,
  PlanningClarificationSourceBlueprint
} from "./planningClarificationBlueprints";
import type { PlanningClarificationFingerprintRecord } from "./planningClarificationFingerprints";
import {
  reconcilePlanningClarifications,
  type PlanningClarificationCurrentReconciliation
} from "./planningClarificationReconciliation";
import {
  reconcilePlanningClarificationSources,
  type PlanningClarificationSourceCurrentReconciliation,
  type PlanningClarificationSourceReconciliationResult
} from "./planningClarificationSourceReconciliation";
import {
  normalizeProjectPlanningState,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type PlanningStaleReason,
  type ProjectPlanningState
} from "./planningProposals";

export interface PlanningClarificationReplacementAnalysisInput {
  projectId: string;
  existingPlanning: ProjectPlanningState;
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
  fingerprints: readonly PlanningClarificationFingerprintRecord[];
}

export type PlanningClarificationReplacementAnalysisOutcome =
  | "unchanged"
  | "replacementRequired"
  | "blocked";

export interface PlanningClarificationProposalReplacementAnalysis {
  proposalKey: string;
  staleProposalId: string;
  staleReason: Extract<PlanningStaleReason, "sourceChanged" | "ruleChanged" | "applicabilityChanged">;
  existingFingerprint: string;
  generatedFingerprint: string;
  replacementSourceKeys: readonly string[];
}

export interface PlanningClarificationSourceReplacementAnalysis {
  sourceKey: string;
  staleSourceId: string;
  replacementSourceKey: string;
  cause: Extract<PlanningStaleReason, "sourceChanged" | "ruleChanged">;
}

export type PlanningClarificationReplacementAnalysisIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "invalidExistingPlanning"
  | "sourceReconciliationFailed"
  | "proposalReconciliationFailed"
  | "invalidStaleHistory"
  | "unsupportedReplacementReason"
  | "staleProposalNoReplacement"
  | "staleProposalMatchesCurrentGeneration"
  | "replacementCauseMismatch"
  | "replacementSourceUnresolved"
  | "ruleRolloverUnresolved"
  | "staleTransitionRequiredFirst"
  | "unresolvedCurrentProposalLifecycle"
  | "unresolvedCurrentSourceLifecycle";

export interface PlanningClarificationReplacementAnalysisIssue {
  code: PlanningClarificationReplacementAnalysisIssueCode;
  message: string;
  sourceKey?: string;
  proposalKey?: string;
  persistedId?: string;
  field?: string;
  sourceIssueCode?: string;
}

export interface PlanningClarificationReplacementAnalysisResult {
  projectId: string;
  outcome: PlanningClarificationReplacementAnalysisOutcome;
  proposalReplacements: readonly PlanningClarificationProposalReplacementAnalysis[];
  sourceReplacements: readonly PlanningClarificationSourceReplacementAnalysis[];
  issues: readonly PlanningClarificationReplacementAnalysisIssue[];
}

type SupportedReplacementReason = PlanningClarificationProposalReplacementAnalysis["staleReason"];

const SUPPORTED_REPLACEMENT_REASONS = new Set<PlanningStaleReason>([
  "sourceChanged",
  "ruleChanged",
  "applicabilityChanged"
]);

export async function analyzePlanningClarificationReplacements(
  input: unknown
): Promise<PlanningClarificationReplacementAnalysisResult> {
  if (!isPlainObject(input)) {
    return result("", "blocked", [], [], [
      issue("invalidInput", "Clarification replacement analysis input must be an object.")
    ]);
  }

  const inputIssues: PlanningClarificationReplacementAnalysisIssue[] = [];
  const projectId = validateProjectId(input.projectId, inputIssues);
  const existingPlanning = isPlainObject(input.existingPlanning) ? input.existingPlanning : null;
  const sources = validateArray(input.sources, "sources", inputIssues);
  const proposals = validateArray(input.proposals, "proposals", inputIssues);
  const fingerprints = validateArray(input.fingerprints, "fingerprints", inputIssues);
  if (!existingPlanning) {
    inputIssues.push(issue("invalidExistingPlanning", "Existing planning state must be an object.", undefined, undefined, undefined, "existingPlanning"));
  }
  if (!projectId || !existingPlanning || !sources || !proposals || !fingerprints || inputIssues.length > 0) {
    return result(projectId ?? "", "blocked", [], [], inputIssues);
  }

  const normalized = normalizeProjectPlanningState(existingPlanning, projectId);
  if (normalized.issues.length > 0) {
    return result(projectId, "blocked", [], [], normalized.issues.map((entry) =>
      issue(
        "invalidExistingPlanning",
        "Existing planning normalization failed; replacement analysis is closed.",
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
  const proposalReconciliation = await reconcilePlanningClarifications({
    projectId,
    existingPlanning: normalized.planning,
    sources,
    proposals,
    fingerprints
  });

  const reconciliationIssues = [
    ...sourceReconciliation.issues.map((entry) =>
      issue(
        "sourceReconciliationFailed",
        "Source reconciliation produced an issue; replacement analysis is closed.",
        entry.sourceKey,
        undefined,
        entry.existingSourceId,
        entry.field,
        entry.sourceIssueCode ?? entry.code
      )
    ),
    ...proposalReconciliation.issues.map((entry) =>
      issue(
        "proposalReconciliationFailed",
        "Proposal reconciliation produced an issue; replacement analysis is closed.",
        undefined,
        entry.proposalKey,
        entry.existingProposalId,
        entry.field,
        entry.sourceIssueCode ?? entry.code
      )
    )
  ];
  if (reconciliationIssues.length > 0) {
    return result(projectId, "blocked", [], [], reconciliationIssues);
  }

  const planning = normalized.planning;
  const sourcesById = new Map(planning.sources.map((source) => [source.sourceId, source]));
  const generatedProposalsByKey = new Map((proposals as readonly PlanningClarificationProposalBlueprint[]).map((proposal) => [proposal.proposalKey, proposal]));
  const currentReconciliationByKey = new Map(proposalReconciliation.current.map((entry) => [entry.proposalKey, entry]));
  const currentSourcesByKey = new Map(sourceReconciliation.current.map((entry) => [entry.sourceKey, entry]));
  const nonCurrentSourceIds = new Set(sourceReconciliation.nonCurrent.map((entry) => entry.existingSourceId));
  const issues: PlanningClarificationReplacementAnalysisIssue[] = [];
  const proposalReplacements: PlanningClarificationProposalReplacementAnalysis[] = [];
  const sourceReplacementPairs = new Map<string, PlanningClarificationSourceReplacementAnalysis>();
  const eligibleStaleProposalIds = new Set<string>();

  collectCurrentLifecycleBlockers(sourceReconciliation, proposalReconciliation.current, proposalReconciliation.existingOnly, issues);
  if (issues.length > 0) {
    return result(projectId, "blocked", [], [], dedupeIssues(issues).sort(sortIssues));
  }

  for (const proposal of planning.proposals) {
    if (!isClarificationScope(proposal)) {
      continue;
    }
    if (proposal.status !== "Stale") {
      continue;
    }
    eligibleStaleProposalIds.add(proposal.proposalId);
    const proposalKey = proposalKeyForExisting(proposal);
    const staleHistoryIssue = validateStaleHistory(proposal, planning);
    if (staleHistoryIssue) {
      issues.push({ ...staleHistoryIssue, proposalKey, persistedId: proposal.proposalId });
      continue;
    }
    if (!isSupportedReplacementReason(proposal.staleReason)) {
      issues.push(issue("unsupportedReplacementReason", "Stale reason is not approved for replacement analysis.", undefined, proposalKey, proposal.proposalId, "staleReason"));
      continue;
    }
    const staleReason = proposal.staleReason;

    const reconciliation = currentReconciliationByKey.get(proposalKey);
    if (!reconciliation) {
      issues.push(issue("staleProposalNoReplacement", "Stale proposal has no generated replacement candidate.", undefined, proposalKey, proposal.proposalId));
      continue;
    }
    if (reconciliation.existingProposalId !== proposal.proposalId) {
      issues.push(issue("staleProposalNoReplacement", "Generated replacement candidate is not bound to the stale predecessor.", undefined, proposalKey, proposal.proposalId, "existingProposalId"));
      continue;
    }
    if (reconciliation.disposition === "exactMatch") {
      issues.push(issue("staleProposalMatchesCurrentGeneration", "Stale proposal exactly matches current generation and cannot be paired as a replacement.", undefined, proposalKey, proposal.proposalId, "fingerprint"));
      continue;
    }
    if (reconciliation.disposition !== "changedProposal") {
      issues.push(issue("staleProposalNoReplacement", "Stale proposal is not paired to a changed generated candidate.", undefined, proposalKey, proposal.proposalId));
      continue;
    }

    const generatedProposal = generatedProposalsByKey.get(proposalKey);
    if (!generatedProposal) {
      issues.push(issue("staleProposalNoReplacement", "Generated proposal blueprint is missing for the stale predecessor.", undefined, proposalKey, proposal.proposalId));
      continue;
    }
    const proof = proveReplacement(
      proposal,
      staleReason,
      generatedProposal,
      reconciliation,
      sourcesById,
      currentSourcesByKey,
      nonCurrentSourceIds
    );
    if (proof.issues.length > 0) {
      issues.push(...proof.issues);
      continue;
    }

    proposalReplacements.push({
      proposalKey,
      staleProposalId: proposal.proposalId,
      staleReason,
      existingFingerprint: proposal.fingerprint,
      generatedFingerprint: reconciliation.generatedFingerprint,
      replacementSourceKeys: [...proof.replacementSourceKeys]
    });
    for (const sourceReplacement of proof.sourceReplacements) {
      sourceReplacementPairs.set(`${sourceReplacement.staleSourceId}\u001f${sourceReplacement.replacementSourceKey}`, sourceReplacement);
    }
  }

  for (const existingOnly of proposalReconciliation.existingOnly) {
    if (eligibleStaleProposalIds.has(existingOnly.existingProposalId)) {
      issues.push(issue("staleProposalNoReplacement", "Stale proposal no longer appears in generated clarification proposals.", undefined, existingOnly.proposalKey, existingOnly.existingProposalId));
    }
  }

  const uniqueIssues = dedupeIssues(issues).sort(sortIssues);
  if (uniqueIssues.length > 0) {
    return result(projectId, "blocked", [], [], uniqueIssues);
  }

  const sortedProposalReplacements = proposalReplacements.sort(sortProposalReplacements);
  const sortedSourceReplacements = [...sourceReplacementPairs.values()].sort(sortSourceReplacements);
  return result(
    projectId,
    sortedProposalReplacements.length > 0 ? "replacementRequired" : "unchanged",
    sortedProposalReplacements,
    sortedSourceReplacements,
    []
  );
}

function collectCurrentLifecycleBlockers(
  sourceReconciliation: PlanningClarificationSourceReconciliationResult,
  currentProposals: readonly PlanningClarificationCurrentReconciliation[],
  existingOnlyProposals: readonly { proposalKey: string; existingProposalId: string; existingStatus: string }[],
  issues: PlanningClarificationReplacementAnalysisIssue[]
): void {
  for (const source of sourceReconciliation.current) {
    if (source.disposition === "changedSource" && source.existingAvailability === "current") {
      issues.push(issue("staleTransitionRequiredFirst", "Current changed source must be marked stale before replacement pairing.", source.sourceKey, undefined, source.existingSourceId, "availability"));
    }
  }
  for (const source of sourceReconciliation.existingOnly) {
    issues.push(issue("unresolvedCurrentSourceLifecycle", "Current existing-only source has no approved replacement lineage in this phase.", source.sourceKey, undefined, source.existingSourceId, "availability"));
  }
  for (const proposal of currentProposals) {
    if (proposal.disposition === "changedProposal" && proposal.existingProposalId && proposal.existingStatus !== "Stale") {
      issues.push(issue("staleTransitionRequiredFirst", "Changed non-Stale proposal must be marked stale before replacement pairing.", undefined, proposal.proposalKey, proposal.existingProposalId, "status"));
    }
  }
  for (const proposal of existingOnlyProposals) {
    if (proposal.existingStatus !== "Stale") {
      issues.push(issue("unresolvedCurrentProposalLifecycle", "Current existing-only proposal has no approved replacement lineage in this phase.", undefined, proposal.proposalKey, proposal.existingProposalId, "status"));
    }
  }
}

function proveReplacement(
  existing: PlanningProposalRecord,
  staleReason: SupportedReplacementReason,
  generated: PlanningClarificationProposalBlueprint,
  reconciliation: PlanningClarificationCurrentReconciliation,
  sourcesById: ReadonlyMap<string, PlanningSourceReference>,
  currentSourcesByKey: ReadonlyMap<string, PlanningClarificationSourceCurrentReconciliation>,
  nonCurrentSourceIds: ReadonlySet<string>
): {
  replacementSourceKeys: readonly string[];
  sourceReplacements: readonly PlanningClarificationSourceReplacementAnalysis[];
  issues: readonly PlanningClarificationReplacementAnalysisIssue[];
} {
  if (existing.fingerprint === reconciliation.generatedFingerprint) {
    return proofBlocked(issue("staleProposalMatchesCurrentGeneration", "Stale proposal fingerprint matches current generation.", undefined, generated.proposalKey, existing.proposalId, "fingerprint"));
  }
  switch (staleReason) {
    case "sourceChanged":
      return proveSourceChangedReplacement(existing, generated, sourcesById, currentSourcesByKey, nonCurrentSourceIds, reconciliation.generatedFingerprint);
    case "ruleChanged":
      return proveRuleChangedReplacement(existing, generated, sourcesById, currentSourcesByKey, nonCurrentSourceIds, reconciliation.generatedFingerprint);
    case "applicabilityChanged":
      return proveApplicabilityChangedReplacement(existing, generated, sourcesById, currentSourcesByKey, reconciliation.generatedFingerprint);
  }
}

function proveSourceChangedReplacement(
  existing: PlanningProposalRecord,
  generated: PlanningClarificationProposalBlueprint,
  sourcesById: ReadonlyMap<string, PlanningSourceReference>,
  currentSourcesByKey: ReadonlyMap<string, PlanningClarificationSourceCurrentReconciliation>,
  nonCurrentSourceIds: ReadonlySet<string>,
  generatedFingerprint: string
) {
  const compareValue = !hasHumanAnswerProvenance(existing, sourcesById);
  const baseIssues = stableIdentityFieldsMatch(existing, generated, ["projectId", "ruleSetId", "ruleSetVersion", "ruleId", "ruleVersion", "target", "category"])
    .concat(stableContentFieldsMatch(existing, generated, true, compareValue));
  if (baseIssues.length > 0) {
    return proofBlocked(...baseIssues.map((field) => issue("replacementCauseMismatch", "sourceChanged replacement changed fields outside source evidence.", undefined, generated.proposalKey, existing.proposalId, field)));
  }

  const existingSourceKeys = orderedSourceKeys(existing, sourcesById);
  if (!existingSourceKeys || !sameStringArray(existingSourceKeys.keys, generated.sourceKeys)) {
    return proofBlocked(issue("replacementSourceUnresolved", "sourceChanged replacement requires exact semantic source identity order.", undefined, generated.proposalKey, existing.proposalId, "sourceIds"));
  }

  const sourceReplacements: PlanningClarificationSourceReplacementAnalysis[] = [];
  for (const sourceEntry of existingSourceKeys.entries) {
    const source = sourceEntry.source;
    const currentSource = currentSourcesByKey.get(sourceEntry.sourceKey);
    if (source.availability === "stale") {
      if (!nonCurrentSourceIds.has(source.sourceId) || currentSource?.disposition !== "newSource") {
        return proofBlocked(issue("replacementSourceUnresolved", "Stale sourceChanged source is not paired to a generated same-key source.", sourceEntry.sourceKey, generated.proposalKey, source.sourceId));
      }
      sourceReplacements.push({
        sourceKey: sourceEntry.sourceKey,
        staleSourceId: source.sourceId,
        replacementSourceKey: sourceEntry.sourceKey,
        cause: "sourceChanged"
      });
      continue;
    }
    if (source.availability !== "current" || currentSource?.disposition !== "exactMatch" || currentSource.existingSourceId !== source.sourceId) {
      return proofBlocked(issue("replacementSourceUnresolved", "Non-stale sourceChanged dependency is not an exact current equivalent.", sourceEntry.sourceKey, generated.proposalKey, source.sourceId));
    }
  }
  if (sourceReplacements.length === 0 || existing.fingerprint === generatedFingerprint) {
    return proofBlocked(issue("replacementCauseMismatch", "sourceChanged replacement requires changed source evidence and a changed fingerprint.", undefined, generated.proposalKey, existing.proposalId, "fingerprint"));
  }
  return proofResult(sourceReplacements.map((entry) => entry.replacementSourceKey), sourceReplacements);
}

function proveRuleChangedReplacement(
  existing: PlanningProposalRecord,
  generated: PlanningClarificationProposalBlueprint,
  sourcesById: ReadonlyMap<string, PlanningSourceReference>,
  currentSourcesByKey: ReadonlyMap<string, PlanningClarificationSourceCurrentReconciliation>,
  nonCurrentSourceIds: ReadonlySet<string>,
  generatedFingerprint: string
) {
  const compareValue = !hasHumanAnswerProvenance(existing, sourcesById);
  const baseIssues = stableIdentityFieldsMatch(existing, generated, ["projectId", "ruleSetId", "ruleId", "target", "category"])
    .concat(stableContentFieldsMatch(existing, generated, true, compareValue));
  if (baseIssues.length > 0 || existing.ruleVersion === generated.ruleVersion || existing.fingerprint === generatedFingerprint) {
    return proofBlocked(issue("ruleRolloverUnresolved", "ruleChanged replacement requires exact rule-version rollover and otherwise stable fields.", undefined, generated.proposalKey, existing.proposalId, baseIssues[0] ?? "ruleVersion"));
  }

  const existingSourceKeys = orderedSourceKeys(existing, sourcesById);
  const oldProjectRuleKey = `projectRule|${existing.ruleId}|${existing.ruleVersion}`;
  const newProjectRuleKey = `projectRule|${generated.ruleId}|${generated.ruleVersion}`;
  const expectedExistingKeys = generated.sourceKeys.map((sourceKey) => sourceKey === newProjectRuleKey ? oldProjectRuleKey : sourceKey);
  if (!existingSourceKeys || !sameStringArray(existingSourceKeys.keys, expectedExistingKeys)) {
    return proofBlocked(issue("ruleRolloverUnresolved", "ruleChanged replacement requires exact old/new project-rule source topology.", undefined, generated.proposalKey, existing.proposalId, "sourceIds"));
  }
  const oldSourceEntry = existingSourceKeys.entries.find((entry) => entry.sourceKey === oldProjectRuleKey);
  const newSource = currentSourcesByKey.get(newProjectRuleKey);
  if (!oldSourceEntry || !nonCurrentSourceIds.has(oldSourceEntry.source.sourceId) || newSource?.disposition !== "newSource") {
    return proofBlocked(issue("ruleRolloverUnresolved", "ruleChanged replacement requires non-current old project-rule source and generated new project-rule source.", oldProjectRuleKey, generated.proposalKey, oldSourceEntry?.source.sourceId));
  }
  for (const sourceEntry of existingSourceKeys.entries) {
    if (sourceEntry.sourceKey === oldProjectRuleKey) {
      continue;
    }
    const currentSource = currentSourcesByKey.get(sourceEntry.sourceKey);
    if (sourceEntry.source.availability !== "current" || currentSource?.disposition !== "exactMatch" || currentSource.existingSourceId !== sourceEntry.source.sourceId) {
      return proofBlocked(issue("ruleRolloverUnresolved", "ruleChanged replacement requires exact retained readiness source identity.", sourceEntry.sourceKey, generated.proposalKey, sourceEntry.source.sourceId));
    }
  }
  return proofResult([newProjectRuleKey], [{
    sourceKey: oldProjectRuleKey,
    staleSourceId: oldSourceEntry.source.sourceId,
    replacementSourceKey: newProjectRuleKey,
    cause: "ruleChanged"
  }]);
}

function proveApplicabilityChangedReplacement(
  existing: PlanningProposalRecord,
  generated: PlanningClarificationProposalBlueprint,
  sourcesById: ReadonlyMap<string, PlanningSourceReference>,
  currentSourcesByKey: ReadonlyMap<string, PlanningClarificationSourceCurrentReconciliation>,
  generatedFingerprint: string
) {
  const compareValue = !hasHumanAnswerProvenance(existing, sourcesById);
  const baseIssues = stableIdentityFieldsMatch(existing, generated, ["projectId", "ruleSetId", "ruleSetVersion", "ruleId", "ruleVersion", "target", "category"])
    .concat(stableContentFieldsMatch(existing, generated, false, compareValue));
  const applicabilityChanged = !sameStringArray(existing.applicableProjectTypes, generated.applicableProjectTypes) ||
    !sameStringArray(existing.applicableDomains, generated.applicableDomains);
  if (baseIssues.length > 0 || !applicabilityChanged || existing.fingerprint === generatedFingerprint) {
    return proofBlocked(issue("replacementCauseMismatch", "applicabilityChanged replacement requires applicability-only proposal change.", undefined, generated.proposalKey, existing.proposalId, baseIssues[0] ?? "applicability"));
  }
  const existingSourceKeys = orderedSourceKeys(existing, sourcesById);
  if (!existingSourceKeys || !sameStringArray(existingSourceKeys.keys, generated.sourceKeys)) {
    return proofBlocked(issue("replacementCauseMismatch", "applicabilityChanged replacement cannot change source topology.", undefined, generated.proposalKey, existing.proposalId, "sourceIds"));
  }
  for (const sourceEntry of existingSourceKeys.entries) {
    const currentSource = currentSourcesByKey.get(sourceEntry.sourceKey);
    if (sourceEntry.source.availability !== "current" || currentSource?.disposition !== "exactMatch" || currentSource.existingSourceId !== sourceEntry.source.sourceId) {
      return proofBlocked(issue("replacementCauseMismatch", "applicabilityChanged replacement requires all sources to remain exact current matches.", sourceEntry.sourceKey, generated.proposalKey, sourceEntry.source.sourceId));
    }
  }
  return proofResult([], []);
}

function stableIdentityFieldsMatch(
  existing: PlanningProposalRecord,
  generated: PlanningClarificationProposalBlueprint,
  fields: readonly string[]
): string[] {
  const changed: string[] = [];
  for (const field of fields) {
    switch (field) {
      case "projectId":
        if (existing.projectId !== generated.projectId) changed.push(field);
        break;
      case "ruleSetId":
        if (existing.ruleSetId !== generated.ruleSetId) changed.push(field);
        break;
      case "ruleSetVersion":
        if (existing.ruleSetVersion !== generated.ruleSetVersion) changed.push(field);
        break;
      case "ruleId":
        if (existing.ruleId !== generated.ruleId) changed.push(field);
        break;
      case "ruleVersion":
        if (existing.ruleVersion !== generated.ruleVersion) changed.push(field);
        break;
      case "target":
        if (!sameJson(existing.target, generated.target)) changed.push(field);
        break;
      case "category":
        if (existing.category !== generated.category) changed.push(field);
        break;
    }
  }
  return changed;
}

function stableContentFieldsMatch(
  existing: PlanningProposalRecord,
  generated: PlanningClarificationProposalBlueprint,
  includeApplicability: boolean,
  compareValue: boolean
): string[] {
  const changed: string[] = [];
  const fields = [
    "value",
    "title",
    "recommendation",
    "rationale",
    "consequence",
    "uncertainty",
    "restriction",
    "readinessRequirementIds",
    ...(includeApplicability ? ["applicableProjectTypes", "applicableDomains"] : [])
  ] as const;
  for (const field of fields) {
    switch (field) {
      case "value":
        if (compareValue && !sameJson(existing.value, generated.value)) changed.push(field);
        break;
      case "title":
        if (existing.title !== generated.title) changed.push(field);
        break;
      case "recommendation":
        if (existing.recommendation !== generated.recommendation) changed.push(field);
        break;
      case "rationale":
        if (existing.rationale !== generated.rationale) changed.push(field);
        break;
      case "consequence":
        if ((existing.consequence ?? "") !== generated.consequence) changed.push(field);
        break;
      case "uncertainty":
        if (existing.uncertainty !== generated.uncertainty) changed.push(field);
        break;
      case "restriction":
        if (existing.restriction !== generated.restriction) changed.push(field);
        break;
      case "readinessRequirementIds":
        if (!sameStringArray(existing.readinessRequirementIds, generated.readinessRequirementIds)) changed.push(field);
        break;
      case "applicableProjectTypes":
        if (!sameStringArray(existing.applicableProjectTypes, generated.applicableProjectTypes)) changed.push(field);
        break;
      case "applicableDomains":
        if (!sameStringArray(existing.applicableDomains, generated.applicableDomains)) changed.push(field);
        break;
    }
  }
  return changed;
}

function hasHumanAnswerProvenance(
  proposal: PlanningProposalRecord,
  sourcesById: ReadonlyMap<string, PlanningSourceReference>
): boolean {
  return proposal.sourceIds.some((sourceId) => sourcesById.get(sourceId)?.sourceType === "userAnswer");
}

function orderedSourceKeys(
  proposal: PlanningProposalRecord,
  sourcesById: ReadonlyMap<string, PlanningSourceReference>
): { keys: readonly string[]; entries: readonly { sourceKey: string; source: PlanningSourceReference }[] } | null {
  const entries: Array<{ sourceKey: string; source: PlanningSourceReference }> = [];
  for (const sourceId of proposal.sourceIds) {
    const source = sourcesById.get(sourceId);
    if (!source) {
      return null;
    }
    if (source.sourceType === "userAnswer") {
      continue;
    }
    const sourceKey = deriveExistingSourceKey(source);
    if (!sourceKey) {
      return null;
    }
    entries.push({ sourceKey, source });
  }
  return {
    keys: entries.map((entry) => entry.sourceKey),
    entries
  };
}

function deriveExistingSourceKey(source: PlanningSourceReference): string | null {
  if (source.sourceType === "projectRule") {
    const ruleId = parseLocator(source.locator, "planning-rule:");
    return ruleId && source.version && isCanonicalSourceKeySegment(source.version)
      ? `projectRule|${ruleId}|${source.version}`
      : null;
  }
  if (source.sourceType === "readinessPrerequisite") {
    const targetKey = parseLocator(source.locator, "phase-gate:");
    return targetKey ? `readinessPrerequisite|${targetKey}` : null;
  }
  return null;
}

function parseLocator(locator: string, prefix: string): string | null {
  if (!locator.startsWith(prefix)) return null;
  const value = locator.slice(prefix.length);
  return isCanonicalSourceKeySegment(value) ? value : null;
}

function isCanonicalSourceKeySegment(input: string | undefined): input is string {
  return typeof input === "string" && input.length > 0 && !input.includes("|");
}

function validateStaleHistory(
  proposal: PlanningProposalRecord,
  planning: ProjectPlanningState
): PlanningClarificationReplacementAnalysisIssue | null {
  if (!proposal.staleReason || !proposal.staleAt || !proposal.lastDecisionId) {
    return issue("invalidStaleHistory", "Stale proposal lacks required deterministic stale metadata.", undefined, undefined, proposal.proposalId, "lastDecisionId");
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
    return issue("invalidStaleHistory", "Stale proposal does not resolve to exactly one matching deterministic markStale decision.", undefined, undefined, proposal.proposalId, "lastDecisionId");
  }
  return null;
}

function isSupportedReplacementReason(
  reason: PlanningStaleReason | undefined
): reason is SupportedReplacementReason {
  return reason !== undefined && SUPPORTED_REPLACEMENT_REASONS.has(reason);
}

function isClarificationScope(proposal: PlanningProposalRecord): boolean {
  return (
    proposal.category === "clarification" &&
    proposal.target.kind === "readinessRequirement" &&
    proposal.target.operation === "clarificationOnly"
  );
}

function proposalKeyForExisting(proposal: PlanningProposalRecord): string {
  return `clarification|${proposal.ruleId}|${proposal.target.targetKey}`;
}

function validateProjectId(
  input: unknown,
  issues: PlanningClarificationReplacementAnalysisIssue[]
): string | null {
  if (
    typeof input !== "string" ||
    input.trim().length === 0 ||
    input.length > 200 ||
    /[\r\n]/.test(input)
  ) {
    issues.push(issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, undefined, "projectId"));
    return null;
  }
  return input;
}

function validateArray(
  input: unknown,
  field: "sources" | "proposals" | "fingerprints",
  issues: PlanningClarificationReplacementAnalysisIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue("invalidInput", `${field} must be an array.`, undefined, undefined, undefined, field));
    return null;
  }
  return input;
}

function proofBlocked(...issues: PlanningClarificationReplacementAnalysisIssue[]) {
  return { replacementSourceKeys: [], sourceReplacements: [], issues };
}

function proofResult(
  replacementSourceKeys: readonly string[],
  sourceReplacements: readonly PlanningClarificationSourceReplacementAnalysis[]
) {
  return {
    replacementSourceKeys: [...replacementSourceKeys],
    sourceReplacements: sourceReplacements.map((entry) => ({ ...entry })),
    issues: []
  };
}

function result(
  projectId: string,
  outcome: PlanningClarificationReplacementAnalysisOutcome,
  proposalReplacements: readonly PlanningClarificationProposalReplacementAnalysis[],
  sourceReplacements: readonly PlanningClarificationSourceReplacementAnalysis[],
  issues: readonly PlanningClarificationReplacementAnalysisIssue[]
): PlanningClarificationReplacementAnalysisResult {
  return {
    projectId,
    outcome,
    proposalReplacements: proposalReplacements.map((entry) => ({
      ...entry,
      replacementSourceKeys: [...entry.replacementSourceKeys]
    })),
    sourceReplacements: sourceReplacements.map((entry) => ({ ...entry })),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningClarificationReplacementAnalysisIssueCode,
  message: string,
  sourceKey?: string,
  proposalKey?: string,
  persistedId?: string,
  field?: string | number,
  sourceIssueCode?: string
): PlanningClarificationReplacementAnalysisIssue {
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
  issues: readonly PlanningClarificationReplacementAnalysisIssue[]
): PlanningClarificationReplacementAnalysisIssue[] {
  const unique = new Map<string, PlanningClarificationReplacementAnalysisIssue>();
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
  first: PlanningClarificationReplacementAnalysisIssue,
  second: PlanningClarificationReplacementAnalysisIssue
): number {
  return first.code.localeCompare(second.code) ||
    (first.sourceKey ?? "").localeCompare(second.sourceKey ?? "") ||
    (first.proposalKey ?? "").localeCompare(second.proposalKey ?? "") ||
    (first.persistedId ?? "").localeCompare(second.persistedId ?? "") ||
    (first.field ?? "").localeCompare(second.field ?? "");
}

function sortProposalReplacements(
  first: PlanningClarificationProposalReplacementAnalysis,
  second: PlanningClarificationProposalReplacementAnalysis
): number {
  return first.proposalKey.localeCompare(second.proposalKey) ||
    first.staleProposalId.localeCompare(second.staleProposalId);
}

function sortSourceReplacements(
  first: PlanningClarificationSourceReplacementAnalysis,
  second: PlanningClarificationSourceReplacementAnalysis
): number {
  return first.replacementSourceKey.localeCompare(second.replacementSourceKey) ||
    first.staleSourceId.localeCompare(second.staleSourceId);
}

function sameStringArray(input: readonly string[] | undefined, expected: readonly string[]): boolean {
  return Array.isArray(input) && input.length === expected.length && input.every((entry, index) => entry === expected[index]);
}

function sameJson(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
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
