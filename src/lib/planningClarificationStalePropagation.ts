import type {
  PlanningClarificationProposalBlueprint,
  PlanningClarificationSourceBlueprint
} from "./planningClarificationBlueprints";
import type { PlanningClarificationFingerprintRecord } from "./planningClarificationFingerprints";
import {
  analyzePlanningClarificationLifecycleChanges,
  type PlanningClarificationLifecycleAnalysisIssue,
  type PlanningClarificationLifecycleAnalysisIssueCode,
  type PlanningClarificationLifecycleDisposition,
  type PlanningClarificationProposalLifecycleAnalysisRecord,
  type PlanningClarificationSourceLifecycleAnalysisRecord
} from "./planningClarificationLifecycleAnalysis";
import type {
  PlanningProposalRecord,
  PlanningSourceReference,
  PlanningStaleReason,
  ProjectPlanningState
} from "./planningProposals";

export interface PlanningClarificationStalePropagationInput {
  projectId: string;
  existingPlanning: ProjectPlanningState;
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
  fingerprints: readonly PlanningClarificationFingerprintRecord[];
}

export type PlanningClarificationStalePropagationOutcome =
  | "unchanged"
  | "staleTransitionsRequired"
  | "blocked";

export interface PlanningClarificationStalePropagationSourceRecord {
  semanticKey: string;
  persistedId?: string;
  baseDisposition: PlanningClarificationLifecycleDisposition;
  effectiveDisposition: PlanningClarificationLifecycleDisposition;
  staleReason?: PlanningStaleReason;
  changedFields?: readonly string[];
  sourceReconciliationDisposition?: PlanningClarificationSourceLifecycleAnalysisRecord["sourceReconciliationDisposition"];
}

export interface PlanningClarificationStalePropagationProposalRecord {
  semanticKey: string;
  persistedId?: string;
  baseDisposition: PlanningClarificationLifecycleDisposition;
  effectiveDisposition: PlanningClarificationLifecycleDisposition;
  staleReason?: PlanningStaleReason;
  changedFields?: readonly string[];
  propagatedFromSourceKeys?: readonly string[];
  propagatedFromSourceIds?: readonly string[];
  generatedFingerprint?: string;
  existingFingerprint?: string;
  proposalReconciliationDisposition?: PlanningClarificationProposalLifecycleAnalysisRecord["proposalReconciliationDisposition"];
}

export type PlanningClarificationStalePropagationIssueCode =
  | "invalidInput"
  | "lifecycleAnalysisFailed"
  | "unresolvedLifecycleChange"
  | "multipleLifecycleReasons"
  | "sourceDependencyUnresolved"
  | "ruleRolloverSourceUnresolved"
  | "unversionedRuleContentChange";

export interface PlanningClarificationStalePropagationIssue {
  code: PlanningClarificationStalePropagationIssueCode;
  message: string;
  sourceKey?: string;
  proposalKey?: string;
  persistedId?: string;
  field?: string;
  underlyingIssueCode?: PlanningClarificationLifecycleAnalysisIssueCode;
  sourceIssueCode?: string;
}

export interface PlanningClarificationStalePropagationResult {
  projectId: string;
  outcome: PlanningClarificationStalePropagationOutcome;
  sources: readonly PlanningClarificationStalePropagationSourceRecord[];
  proposals: readonly PlanningClarificationStalePropagationProposalRecord[];
  issues: readonly PlanningClarificationStalePropagationIssue[];
}

type MutableSourceRecord = PlanningClarificationStalePropagationSourceRecord;
type MutableProposalRecord = PlanningClarificationStalePropagationProposalRecord;

const DIRECT_PROPOSAL_REASONS = new Set<PlanningStaleReason>([
  "ruleChanged",
  "applicabilityChanged",
  "proposalRegenerated"
]);

const FAILURE_LIFECYCLE_CODES = new Set<PlanningClarificationLifecycleAnalysisIssueCode>([
  "invalidInput",
  "invalidProjectId",
  "invalidExistingPlanning",
  "sourceReconciliationFailed",
  "proposalReconciliationFailed"
]);

export async function analyzePlanningClarificationStalePropagation(
  input: unknown
): Promise<PlanningClarificationStalePropagationResult> {
  const lifecycle = await analyzePlanningClarificationLifecycleChanges(input);
  const failureIssues = lifecycle.issues.filter((entry) => FAILURE_LIFECYCLE_CODES.has(entry.code));
  if (failureIssues.length > 0) {
    const issues: PlanningClarificationStalePropagationIssue[] = [];
    mapLifecycleIssues(failureIssues, new Set(), issues);
    return {
      projectId: lifecycle.projectId,
      outcome: "blocked",
      sources: [],
      proposals: [],
      issues: dedupeIssues(issues).sort(sortIssues)
    };
  }

  const rawInput = isPlainObject(input) ? input : {};
  const existingPlanning = isPlanningStateLike(rawInput.existingPlanning)
    ? rawInput.existingPlanning
    : undefined;
  const generatedProposals = Array.isArray(rawInput.proposals)
    ? (rawInput.proposals as readonly PlanningClarificationProposalBlueprint[])
    : [];
  const existingSourcesById = new Map((existingPlanning?.sources ?? []).map((source) => [source.sourceId, source]));
  const existingProposalsById = new Map((existingPlanning?.proposals ?? []).map((proposal) => [proposal.proposalId, proposal]));
  const generatedProposalsByKey = new Map(generatedProposals.map((proposal) => [proposal.proposalKey, proposal]));

  const sources = lifecycle.sources.map(sourceRecord);
  const proposals = lifecycle.proposals.map(proposalRecord);
  const sourceRecordsByKey = new Map(sources.map((source) => [source.semanticKey, source]));
  const changedSourcesById = changedSourceRecordsById(sources);
  const resolvedLifecycleIssues = new Set<string>();
  const issues: PlanningClarificationStalePropagationIssue[] = [];

  applySourceDependencyPropagation(
    proposals,
    existingProposalsById,
    changedSourcesById,
    resolvedLifecycleIssues,
    issues
  );
  applyRuleRolloverSourcePropagation(
    proposals,
    sourceRecordsByKey,
    existingProposalsById,
    existingSourcesById,
    generatedProposalsByKey,
    resolvedLifecycleIssues,
    issues
  );
  mapLifecycleIssues(lifecycle.issues, resolvedLifecycleIssues, issues);
  collectEffectiveBlockingIssues(sources, proposals, issues);

  const uniqueIssues = dedupeIssues(issues).sort(sortIssues);
  const outcome = uniqueIssues.length > 0
    ? "blocked"
    : hasStaleTransition(sources, proposals)
      ? "staleTransitionsRequired"
      : "unchanged";

  return {
    projectId: lifecycle.projectId,
    outcome,
    sources: sources.sort(sortRecords),
    proposals: proposals.sort(sortRecords),
    issues: uniqueIssues
  };
}

function applySourceDependencyPropagation(
  proposals: MutableProposalRecord[],
  existingProposalsById: ReadonlyMap<string, PlanningProposalRecord>,
  changedSourcesById: ReadonlyMap<string, PlanningClarificationStalePropagationSourceRecord>,
  resolvedLifecycleIssues: Set<string>,
  issues: PlanningClarificationStalePropagationIssue[]
): void {
  for (const proposal of proposals) {
    if (!proposal.persistedId || proposal.baseDisposition === "historical") {
      continue;
    }
    const existing = existingProposalsById.get(proposal.persistedId);
    if (!existing) {
      continue;
    }
    const propagatedSources = existing.sourceIds
      .map((sourceId) => {
        const source = changedSourcesById.get(sourceId);
        return source ? { sourceId, sourceKey: source.semanticKey } : null;
      })
      .filter((entry): entry is { sourceId: string; sourceKey: string } => entry !== null)
      .sort((first, second) => first.sourceKey.localeCompare(second.sourceKey) || first.sourceId.localeCompare(second.sourceId));

    if (propagatedSources.length === 0) {
      continue;
    }

    proposal.propagatedFromSourceKeys = propagatedSources.map((source) => source.sourceKey);
    proposal.propagatedFromSourceIds = propagatedSources.map((source) => source.sourceId);

    if (proposal.baseDisposition === "unchanged") {
      proposal.effectiveDisposition = "staleRequired";
      proposal.staleReason = "sourceChanged";
      continue;
    }

    if (isResolvableFingerprintOnlyAmbiguity(proposal)) {
      proposal.effectiveDisposition = "staleRequired";
      proposal.staleReason = "sourceChanged";
      resolvedLifecycleIssues.add(issueKey("proposalChangeAmbiguous", undefined, proposal.semanticKey, proposal.persistedId));
      resolvedLifecycleIssues.add(issueKey("lifecycleCauseUnresolved", undefined, proposal.semanticKey, proposal.persistedId));
      continue;
    }

    if (proposal.baseDisposition === "staleRequired" && proposal.staleReason && DIRECT_PROPOSAL_REASONS.has(proposal.staleReason)) {
      proposal.effectiveDisposition = "ambiguous";
      proposal.staleReason = undefined;
      issues.push(issue(
        "multipleLifecycleReasons",
        "Changed source dependency and direct proposal lifecycle reason both apply; stale propagation is blocked.",
        undefined,
        proposal.semanticKey,
        proposal.persistedId,
        proposal.changedFields?.join(",")
      ));
    }
  }
}

function applyRuleRolloverSourcePropagation(
  proposals: readonly MutableProposalRecord[],
  sourceRecordsByKey: ReadonlyMap<string, MutableSourceRecord>,
  existingProposalsById: ReadonlyMap<string, PlanningProposalRecord>,
  existingSourcesById: ReadonlyMap<string, PlanningSourceReference>,
  generatedProposalsByKey: ReadonlyMap<string, PlanningClarificationProposalBlueprint>,
  resolvedLifecycleIssues: Set<string>,
  issues: PlanningClarificationStalePropagationIssue[]
): void {
  for (const proposal of proposals) {
    if (proposal.baseDisposition !== "staleRequired" || proposal.staleReason !== "ruleChanged" || !proposal.persistedId) {
      continue;
    }

    const existingProposal = existingProposalsById.get(proposal.persistedId);
    const generatedProposal = generatedProposalsByKey.get(proposal.semanticKey);
    if (!existingProposal || !generatedProposal || existingProposal.ruleId !== generatedProposal.ruleId) {
      issues.push(ruleRolloverIssue(proposal));
      continue;
    }

    const oldProjectRuleSourceKey = `projectRule|${existingProposal.ruleId}|${existingProposal.ruleVersion}`;
    const newProjectRuleSourceKey = `projectRule|${generatedProposal.ruleId}|${generatedProposal.ruleVersion}`;
    if (existingProposal.ruleVersion === generatedProposal.ruleVersion) {
      issues.push(ruleRolloverIssue(proposal, oldProjectRuleSourceKey));
      continue;
    }

    const oldSourceRecord = sourceRecordsByKey.get(oldProjectRuleSourceKey);
    const newSourceRecord = sourceRecordsByKey.get(newProjectRuleSourceKey);
    const oldSource = oldSourceRecord?.persistedId ? existingSourcesById.get(oldSourceRecord.persistedId) : undefined;
    if (
      oldSourceRecord?.baseDisposition === "noLongerGenerated" &&
      oldSource?.availability === "current"
    ) {
      oldSourceRecord.effectiveDisposition = "staleRequired";
      oldSourceRecord.staleReason = "ruleChanged";
      resolvedLifecycleIssues.add(issueKey("lifecycleCauseUnresolved", oldProjectRuleSourceKey, undefined, oldSourceRecord.persistedId));
    } else if (oldSourceRecord?.baseDisposition !== "historical") {
      issues.push(ruleRolloverIssue(proposal, oldProjectRuleSourceKey, oldSourceRecord?.persistedId));
    }

    if (
      !newSourceRecord ||
      newSourceRecord.baseDisposition !== "unchanged" ||
      newSourceRecord.persistedId !== undefined ||
      newSourceRecord.sourceReconciliationDisposition !== "newSource"
    ) {
      issues.push(ruleRolloverIssue(proposal, newProjectRuleSourceKey, newSourceRecord?.persistedId));
    }
  }
}

function mapLifecycleIssues(
  lifecycleIssues: readonly PlanningClarificationLifecycleAnalysisIssue[],
  resolvedLifecycleIssues: ReadonlySet<string>,
  issues: PlanningClarificationStalePropagationIssue[]
): void {
  for (const lifecycleIssue of lifecycleIssues) {
    if (resolvedLifecycleIssues.has(issueKey(
      lifecycleIssue.code,
      lifecycleIssue.sourceKey,
      lifecycleIssue.proposalKey,
      lifecycleIssue.persistedId
    ))) {
      continue;
    }
    if (lifecycleIssue.code === "unversionedRuleContentChange") {
      issues.push(issue(
        "unversionedRuleContentChange",
        "Unversioned generated clarification content changed; stale propagation is blocked.",
        lifecycleIssue.sourceKey,
        lifecycleIssue.proposalKey,
        lifecycleIssue.persistedId,
        lifecycleIssue.field,
        lifecycleIssue.code,
        lifecycleIssue.sourceIssueCode
      ));
      continue;
    }
    if (lifecycleIssue.code === "multipleLifecycleReasons") {
      issues.push(issue(
        "multipleLifecycleReasons",
        "Lifecycle analysis found multiple independent proposal reasons; stale propagation is blocked.",
        lifecycleIssue.sourceKey,
        lifecycleIssue.proposalKey,
        lifecycleIssue.persistedId,
        lifecycleIssue.field,
        lifecycleIssue.code,
        lifecycleIssue.sourceIssueCode
      ));
      continue;
    }
    issues.push(issue(
      FAILURE_LIFECYCLE_CODES.has(lifecycleIssue.code) ? "lifecycleAnalysisFailed" : "unresolvedLifecycleChange",
      FAILURE_LIFECYCLE_CODES.has(lifecycleIssue.code)
        ? "Lifecycle analysis failed; stale propagation conclusions are closed."
        : "Lifecycle analysis reported an unresolved change; stale propagation is blocked.",
      lifecycleIssue.sourceKey,
      lifecycleIssue.proposalKey,
      lifecycleIssue.persistedId,
      lifecycleIssue.field,
      lifecycleIssue.code,
      lifecycleIssue.sourceIssueCode
    ));
  }
}

function collectEffectiveBlockingIssues(
  sources: readonly MutableSourceRecord[],
  proposals: readonly MutableProposalRecord[],
  issues: PlanningClarificationStalePropagationIssue[]
): void {
  for (const source of sources) {
    if (source.effectiveDisposition === "ambiguous" || source.effectiveDisposition === "noLongerGenerated") {
      issues.push(issue(
        source.effectiveDisposition === "ambiguous" ? "unresolvedLifecycleChange" : "sourceDependencyUnresolved",
        source.effectiveDisposition === "ambiguous"
          ? "Source lifecycle remains ambiguous; stale propagation is blocked."
          : "Existing-only source has no approved deterministic stale propagation reason.",
        source.semanticKey,
        undefined,
        source.persistedId,
        source.changedFields?.join(",")
      ));
    }
  }
  for (const proposal of proposals) {
    if (proposal.effectiveDisposition === "ambiguous" || proposal.effectiveDisposition === "noLongerGenerated") {
      issues.push(issue(
        "unresolvedLifecycleChange",
        proposal.effectiveDisposition === "ambiguous"
          ? "Proposal lifecycle remains ambiguous; stale propagation is blocked."
          : "Existing-only proposal has no approved deterministic stale propagation reason.",
        undefined,
        proposal.semanticKey,
        proposal.persistedId,
        proposal.changedFields?.join(",")
      ));
    }
    if (proposal.baseDisposition === "staleRequired" && proposal.staleReason === "proposalRegenerated") {
      issues.push(issue(
        "unversionedRuleContentChange",
        "Proposal regenerated without versioned rule evidence; stale propagation is blocked.",
        undefined,
        proposal.semanticKey,
        proposal.persistedId,
        proposal.changedFields?.join(",")
      ));
    }
  }
}

function changedSourceRecordsById(
  sources: readonly PlanningClarificationStalePropagationSourceRecord[]
): Map<string, PlanningClarificationStalePropagationSourceRecord> {
  const changed = new Map<string, PlanningClarificationStalePropagationSourceRecord>();
  for (const source of sources) {
    if (
      source.baseDisposition === "staleRequired" &&
      source.staleReason === "sourceChanged" &&
      source.persistedId
    ) {
      changed.set(source.persistedId, source);
    }
  }
  return changed;
}

function isResolvableFingerprintOnlyAmbiguity(proposal: PlanningClarificationStalePropagationProposalRecord): boolean {
  return (
    proposal.baseDisposition === "ambiguous" &&
    proposal.changedFields?.length === 1 &&
    proposal.changedFields[0] === "fingerprint"
  );
}

function sourceRecord(
  record: PlanningClarificationSourceLifecycleAnalysisRecord
): MutableSourceRecord {
  return dropUndefined({
    semanticKey: record.semanticKey,
    persistedId: record.persistedId,
    baseDisposition: record.disposition,
    effectiveDisposition: record.disposition,
    staleReason: record.staleReason,
    changedFields: record.changedFields ? [...record.changedFields] : undefined,
    sourceReconciliationDisposition: record.sourceReconciliationDisposition
  });
}

function proposalRecord(
  record: PlanningClarificationProposalLifecycleAnalysisRecord
): MutableProposalRecord {
  return dropUndefined({
    semanticKey: record.semanticKey,
    persistedId: record.persistedId,
    baseDisposition: record.disposition,
    effectiveDisposition: record.disposition,
    staleReason: record.staleReason,
    changedFields: record.changedFields ? [...record.changedFields] : undefined,
    generatedFingerprint: record.generatedFingerprint,
    existingFingerprint: record.existingFingerprint,
    proposalReconciliationDisposition: record.proposalReconciliationDisposition
  });
}

function ruleRolloverIssue(
  proposal: PlanningClarificationStalePropagationProposalRecord,
  sourceKey?: string,
  persistedId?: string
): PlanningClarificationStalePropagationIssue {
  return issue(
    "ruleRolloverSourceUnresolved",
    "Rule-change proposal could not be bound to an exact deterministic old/new project-rule source rollover.",
    sourceKey,
    proposal.semanticKey,
    persistedId ?? proposal.persistedId,
    proposal.changedFields?.join(",")
  );
}

function hasStaleTransition(
  sources: readonly PlanningClarificationStalePropagationSourceRecord[],
  proposals: readonly PlanningClarificationStalePropagationProposalRecord[]
): boolean {
  return sources.some((source) => source.effectiveDisposition === "staleRequired") ||
    proposals.some((proposal) => proposal.effectiveDisposition === "staleRequired");
}

function issue(
  code: PlanningClarificationStalePropagationIssueCode,
  message: string,
  sourceKey?: string,
  proposalKey?: string,
  persistedId?: string,
  field?: string,
  underlyingIssueCode?: PlanningClarificationLifecycleAnalysisIssueCode,
  sourceIssueCode?: string
): PlanningClarificationStalePropagationIssue {
  return dropUndefined({ code, message, sourceKey, proposalKey, persistedId, field, underlyingIssueCode, sourceIssueCode });
}

function issueKey(
  code: PlanningClarificationLifecycleAnalysisIssueCode,
  sourceKey?: string,
  proposalKey?: string,
  persistedId?: string
): string {
  return [code, sourceKey ?? "", proposalKey ?? "", persistedId ?? ""].join("\u001f");
}

function dedupeIssues(
  issues: readonly PlanningClarificationStalePropagationIssue[]
): PlanningClarificationStalePropagationIssue[] {
  const unique = new Map<string, PlanningClarificationStalePropagationIssue>();
  for (const entry of issues) {
    unique.set([
      entry.code,
      entry.sourceKey ?? "",
      entry.proposalKey ?? "",
      entry.persistedId ?? "",
      entry.field ?? "",
      entry.underlyingIssueCode ?? "",
      entry.sourceIssueCode ?? ""
    ].join("\u001f"), entry);
  }
  return [...unique.values()];
}

function sortIssues(
  first: PlanningClarificationStalePropagationIssue,
  second: PlanningClarificationStalePropagationIssue
): number {
  return first.code.localeCompare(second.code) ||
    (first.sourceKey ?? "").localeCompare(second.sourceKey ?? "") ||
    (first.proposalKey ?? "").localeCompare(second.proposalKey ?? "") ||
    (first.persistedId ?? "").localeCompare(second.persistedId ?? "") ||
    (first.field ?? "").localeCompare(second.field ?? "");
}

function sortRecords<T extends { semanticKey: string; persistedId?: string }>(first: T, second: T): number {
  return first.semanticKey.localeCompare(second.semanticKey) ||
    (first.persistedId ?? "").localeCompare(second.persistedId ?? "");
}

function isPlanningStateLike(input: unknown): input is ProjectPlanningState {
  return isPlainObject(input) &&
    Array.isArray(input.sources) &&
    Array.isArray(input.proposals);
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
