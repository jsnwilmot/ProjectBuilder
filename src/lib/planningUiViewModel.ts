import {
  createEmptyProjectPlanningState,
  normalizeProjectPlanningState,
  type PlanningConflictRecord,
  type PlanningDependencyRecord,
  type PlanningProposalRecord,
  type PlanningProposalStatus,
  type PlanningSourceReference,
  type PlanningTargetReference,
  type PlanningUncertainty
} from "./planningProposals";
import { getPlanningRuleById } from "./planningRules";
import {
  preparePlanningControlledApplyTransaction,
  type PlanningControlledApplyTransactionPreparationIssue
} from "./planningControlledApplyTransactionPreparation";
import { normalizePlanningControlledApplyHistory } from "./planningControlledApplyHistory";
import type { ProjectInputField, ProjectRecord } from "../types/project";

export const PLANNING_UI_GROUPS = [
  { id: "recommendations", label: "Recommendations" },
  { id: "questions", label: "Questions to answer" },
  { id: "confirmed", label: "Confirmed decisions" },
  { id: "deferred", label: "Deferred or not needed" },
  { id: "attention", label: "Needs attention and closed items" }
] as const;

export type PlanningUiGroupId = (typeof PLANNING_UI_GROUPS)[number]["id"];

export interface PlanningUiIssue {
  code: "invalidPlanning" | "invalidHistory";
  message: string;
}

export interface PlanningUiSource {
  resolved: boolean;
  label: string;
  sourceType: string;
  authority: string;
  availability: string;
  excerpt?: string;
  version?: string;
  observedAt?: string;
}

export interface PlanningUiDependency {
  dependencyType: string;
  rationale: string;
  required: boolean;
  targetLabel: string;
}

export interface PlanningUiConflict {
  severity: string;
  status: string;
  explanation: string;
  affectedProposalTitles: readonly string[];
}

export type PlanningUiApplyState =
  | { state: "planningOnly"; label: "Planning decision only - no project field change available" }
  | {
      state: "ready";
      label: "Ready to apply";
      fieldLabel: string;
      currentValue: string;
      proposedValue: string;
      historyOutcome: "changed" | "unchanged";
    }
  | { state: "alreadyApplied"; label: "Already applied" }
  | { state: "blocked"; label: "Not currently available to apply"; details: readonly string[] };

export interface PlanningUiProposal {
  key: string;
  title: string;
  recommendation: string;
  rationale: string;
  consequence?: string;
  status: PlanningProposalStatus;
  statusLabel: string;
  uncertainty: PlanningUncertainty;
  targetArea: string;
  sources: readonly PlanningUiSource[];
  dependencies: readonly PlanningUiDependency[];
  conflicts: readonly PlanningUiConflict[];
  applyState?: PlanningUiApplyState;
}

export interface PlanningUiProposalGroup {
  id: PlanningUiGroupId;
  label: string;
  proposals: readonly PlanningUiProposal[];
}

export interface PlanningUiHistoryItem {
  key: string;
  appliedAt: string;
  fieldLabel: string;
  outcome: "Changed" | "Unchanged";
  proposalTitle?: string;
  previousValue: string;
  appliedValue: string;
}

export interface PlanningUiViewModel {
  state: "empty" | "ready" | "invalid";
  emptyMessage?: string;
  groups: readonly PlanningUiProposalGroup[];
  history: readonly PlanningUiHistoryItem[];
  issues: readonly PlanningUiIssue[];
  proposalCount: number;
}

const STATUS_GROUPS: Record<PlanningProposalStatus, PlanningUiGroupId> = {
  Proposed: "recommendations",
  "Needs Clarification": "questions",
  Revised: "questions",
  Confirmed: "confirmed",
  Deferred: "deferred",
  "Not Applicable": "deferred",
  Blocked: "attention",
  Stale: "attention",
  Rejected: "attention",
  Superseded: "attention"
};

const STATUS_LABELS: Record<PlanningProposalStatus, string> = {
  Proposed: "Recommendation",
  Confirmed: "Confirmed decision",
  Revised: "Answer provided - confirm required",
  Rejected: "Rejected",
  Deferred: "Deferred",
  "Not Applicable": "Not applicable",
  Stale: "Refresh required",
  Superseded: "Superseded",
  Blocked: "Blocked",
  "Needs Clarification": "Answer required"
};

const SOURCE_TYPE_LABELS: Record<PlanningSourceReference["sourceType"], string> = {
  userAnswer: "User answer",
  confirmedIntake: "Confirmed intake",
  approvedDocument: "Approved document",
  platformRule: "Platform rule",
  projectRule: "Project rule",
  projectTypePreset: "Project type preset",
  readinessPrerequisite: "Readiness prerequisite",
  derivedDependency: "Derived dependency",
  generalRecommendation: "General recommendation"
};

const DEPENDENCY_TYPE_LABELS: Record<PlanningDependencyRecord["dependencyType"], string> = {
  requiresProposal: "Requires proposal",
  requiresTarget: "Requires target",
  requiresSource: "Requires source",
  requiresReadiness: "Requires readiness",
  requiresApplicability: "Requires applicability",
  conflictsWith: "Conflicts with",
  mutuallyExclusiveWith: "Mutually exclusive with"
};

export function buildPlanningUiViewModel(project: ProjectRecord): PlanningUiViewModel {
  const inputPlanning = project.planning ?? createEmptyProjectPlanningState();
  const normalized = normalizeProjectPlanningState(inputPlanning, project.identity.id);
  const issues: PlanningUiIssue[] = normalized.issues.length > 0
    ? [{
        code: "invalidPlanning",
        message: "Planning information is unavailable or incomplete because saved planning data could not be validated."
      }]
    : [];
  const planning = normalized.planning;
  const proposalsById = new Map(planning.proposals.map((proposal) => [proposal.proposalId, proposal]));
  const sourcesById = new Map(planning.sources.map((source) => [source.sourceId, source]));
  const conflictsById = new Map(planning.conflicts.map((conflict) => [conflict.conflictId, conflict]));
  const allowApplyAnalysis = normalized.issues.length === 0;

  const grouped = new Map<PlanningUiGroupId, Array<{ proposal: PlanningProposalRecord; index: number; priority?: number }>>();
  for (const [index, proposal] of planning.proposals.entries()) {
    const rule = getPlanningRuleById(proposal.ruleId);
    const groupId = STATUS_GROUPS[proposal.status];
    const entries = grouped.get(groupId) ?? [];
    entries.push({ proposal, index, priority: rule?.priority });
    grouped.set(groupId, entries);
  }

  const groups = PLANNING_UI_GROUPS.flatMap((definition) => {
    const entries = orderProposalEntries(grouped.get(definition.id) ?? []);
    if (entries.length === 0) return [];
    return [{
      id: definition.id,
      label: definition.label,
      proposals: entries.map(({ proposal }) => buildProposal(
        project,
        proposal,
        planning.dependencies,
        planning.conflicts,
        proposalsById,
        sourcesById,
        conflictsById,
        allowApplyAnalysis
      ))
    }];
  });

  const history = buildHistory(project, planning.proposals, issues, normalized.issues.length === 0);
  const proposalCount = planning.proposals.length;

  return {
    state: issues.some((entry) => entry.code === "invalidPlanning")
      ? "invalid"
      : proposalCount === 0
        ? "empty"
        : "ready",
    ...(proposalCount === 0 && issues.length === 0
      ? { emptyMessage: "No planning items are available for this project yet." }
      : {}),
    groups,
    history,
    issues,
    proposalCount
  };
}

// Unknown proposals remain fixed; only contiguous registered-rule runs are priority sorted.
function orderProposalEntries<T extends { index: number; priority?: number }>(entries: readonly T[]): T[] {
  const ordered = [...entries].sort((first, second) => first.index - second.index);
  let start = 0;
  while (start < ordered.length) {
    if (ordered[start].priority === undefined) {
      start += 1;
      continue;
    }
    let end = start + 1;
    while (end < ordered.length && ordered[end].priority !== undefined) end += 1;
    const run = ordered.slice(start, end).sort((first, second) =>
      (first.priority as number) - (second.priority as number) || first.index - second.index
    );
    ordered.splice(start, run.length, ...run);
    start = end;
  }
  return ordered;
}

function buildProposal(
  project: ProjectRecord,
  proposal: PlanningProposalRecord,
  dependencies: readonly PlanningDependencyRecord[],
  conflicts: readonly PlanningConflictRecord[],
  proposalsById: ReadonlyMap<string, PlanningProposalRecord>,
  sourcesById: ReadonlyMap<string, PlanningSourceReference>,
  conflictsById: ReadonlyMap<string, PlanningConflictRecord>,
  allowApplyAnalysis: boolean
): PlanningUiProposal {
  return {
    key: proposal.proposalId,
    title: proposal.title,
    recommendation: proposal.recommendation,
    rationale: proposal.rationale,
    ...(proposal.consequence ? { consequence: proposal.consequence } : {}),
    status: proposal.status,
    statusLabel: STATUS_LABELS[proposal.status],
    uncertainty: proposal.uncertainty,
    targetArea: humanizeTarget(proposal.target),
    sources: proposal.sourceIds.map((sourceId) => buildSource(sourcesById.get(sourceId))),
    dependencies: dependencies
      .filter((dependency) => dependency.sourceProposalId === proposal.proposalId)
      .map((dependency) => buildDependency(dependency, proposalsById, sourcesById)),
    conflicts: conflictsForProposal(proposal, conflicts, conflictsById)
      .map((conflict) => buildConflict(conflict, proposalsById)),
    ...(proposal.status === "Confirmed"
      ? { applyState: buildApplyState(project, proposal, allowApplyAnalysis) }
      : {})
  };
}

function buildSource(source: PlanningSourceReference | undefined): PlanningUiSource {
  if (!source) {
    return {
      resolved: false,
      label: "Unavailable evidence",
      sourceType: "Unavailable",
      authority: "Unavailable",
      availability: "Missing"
    };
  }
  const unavailable = source.availability === "missing" || source.availability === "deleted";
  return {
    resolved: !unavailable,
    label: source.label,
    sourceType: SOURCE_TYPE_LABELS[source.sourceType],
    authority: humanizeToken(source.authority),
    availability: humanizeToken(source.availability),
    ...(!unavailable && source.excerpt ? { excerpt: source.excerpt } : {}),
    ...(!unavailable && source.version ? { version: source.version } : {}),
    ...(!unavailable && source.observedAt ? { observedAt: source.observedAt } : {})
  };
}

function buildDependency(
  dependency: PlanningDependencyRecord,
  proposalsById: ReadonlyMap<string, PlanningProposalRecord>,
  sourcesById: ReadonlyMap<string, PlanningSourceReference>
): PlanningUiDependency {
  return {
    dependencyType: DEPENDENCY_TYPE_LABELS[dependency.dependencyType],
    rationale: dependency.rationale,
    required: dependency.required,
    targetLabel: dependencyTargetLabel(dependency.target, proposalsById, sourcesById)
  };
}

function dependencyTargetLabel(
  target: PlanningDependencyRecord["target"],
  proposalsById: ReadonlyMap<string, PlanningProposalRecord>,
  sourcesById: ReadonlyMap<string, PlanningSourceReference>
): string {
  switch (target.kind) {
    case "proposalId":
      return proposalsById.get(target.proposalId)?.title ?? "Unavailable proposal reference";
    case "sourceId":
      return sourcesById.get(target.sourceId)?.label ?? "Unavailable source reference";
    case "readinessRequirementId":
      return humanizeToken(target.readinessRequirementId);
    case "targetReference":
      return humanizeTarget(target.target);
  }
}

function conflictsForProposal(
  proposal: PlanningProposalRecord,
  conflicts: readonly PlanningConflictRecord[],
  conflictsById: ReadonlyMap<string, PlanningConflictRecord>
): PlanningConflictRecord[] {
  const related = new Map<string, PlanningConflictRecord>();
  for (const conflictId of proposal.conflictIds ?? []) {
    const conflict = conflictsById.get(conflictId);
    if (conflict) related.set(conflict.conflictId, conflict);
  }
  for (const conflict of conflicts) {
    const involved = conflict.involvedReferences.some((reference) =>
      reference.kind === "proposalId" && reference.proposalId === proposal.proposalId
    );
    if (involved || (conflict.affectedProposalIds ?? []).includes(proposal.proposalId)) {
      related.set(conflict.conflictId, conflict);
    }
  }
  return [...related.values()];
}

function buildConflict(
  conflict: PlanningConflictRecord,
  proposalsById: ReadonlyMap<string, PlanningProposalRecord>
): PlanningUiConflict {
  const proposalIds = [
    ...conflict.involvedReferences.flatMap((reference) => reference.kind === "proposalId" ? [reference.proposalId] : []),
    ...(conflict.affectedProposalIds ?? [])
  ];
  const affectedProposalTitles = [...new Set(proposalIds.flatMap((proposalId) => {
    const title = proposalsById.get(proposalId)?.title;
    return title ? [title] : [];
  }))];
  return {
    severity: humanizeToken(conflict.severity),
    status: humanizeToken(conflict.status),
    explanation: conflict.explanation,
    affectedProposalTitles
  };
}

function buildApplyState(
  project: ProjectRecord,
  proposal: PlanningProposalRecord,
  allowAnalysis: boolean
): PlanningUiApplyState {
  if (proposal.target.kind === "readinessRequirement" && proposal.target.operation === "clarificationOnly") {
    return {
      state: "planningOnly",
      label: "Planning decision only - no project field change available"
    };
  }
  if (!allowAnalysis) {
    return {
      state: "blocked",
      label: "Not currently available to apply",
      details: ["Saved planning information must be validated before Apply availability can be assessed."]
    };
  }
  const preparation = preparePlanningControlledApplyTransaction({ project, proposalId: proposal.proposalId });
  if (preparation.outcome === "alreadyApplied") {
    return { state: "alreadyApplied", label: "Already applied" };
  }
  if (preparation.outcome === "blocked") {
    return {
      state: "blocked",
      label: "Not currently available to apply",
      details: humanizePreparationIssues(preparation.issues)
    };
  }
  return {
    state: "ready",
    label: "Ready to apply",
    fieldLabel: humanizeField(preparation.plan.fieldKey),
    currentValue: preparation.plan.expectedCurrentValue,
    proposedValue: preparation.plan.desiredValue,
    historyOutcome: preparation.plan.historyOutcome
  };
}

function humanizePreparationIssues(
  issues: readonly PlanningControlledApplyTransactionPreparationIssue[]
): readonly string[] {
  const messages = issues.map((entry) => entry.message.trim()).filter(Boolean);
  return messages.length > 0 ? messages : ["The current proposal is not eligible for controlled Apply."];
}

function buildHistory(
  project: ProjectRecord,
  proposals: readonly PlanningProposalRecord[],
  issues: PlanningUiIssue[],
  planningValid: boolean
): PlanningUiHistoryItem[] {
  if (!planningValid || project.controlledApplyHistory.length === 0) return [];
  const normalized = normalizePlanningControlledApplyHistory({
    projectId: project.identity.id,
    planning: project.planning,
    history: project.controlledApplyHistory
  });
  if (normalized.outcome === "invalid") {
    issues.push({
      code: "invalidHistory",
      message: "Applied history is unavailable because saved history could not be validated."
    });
    return [];
  }
  const proposalsById = new Map(proposals.map((proposal) => [proposal.proposalId, proposal]));
  return normalized.history.map((record) => ({
    key: record.applyId,
    appliedAt: record.appliedAt,
    fieldLabel: humanizeField(record.fieldKey),
    outcome: record.outcome === "changed" ? "Changed" : "Unchanged",
    ...(proposalsById.get(record.proposalId)?.title
      ? { proposalTitle: proposalsById.get(record.proposalId)?.title }
      : {}),
    previousValue: record.previousValue,
    appliedValue: record.appliedValue
  }));
}

function humanizeTarget(target: PlanningTargetReference): string {
  const domain = target.domain === "powerPlatform" ? "Power Platform" : humanizeToken(target.domain);
  const targetName = humanizeToken(target.fieldKey ?? target.targetKey);
  return targetName.toLowerCase() === domain.toLowerCase() ? domain : `${domain} - ${targetName}`;
}

function humanizeField(field: ProjectInputField): string {
  return humanizeToken(field === "appName" ? "app name" : field);
}

function humanizeToken(value: string): string {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase() : "Unavailable";
}
