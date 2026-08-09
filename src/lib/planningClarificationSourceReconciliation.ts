import type {
  PlanningClarificationProposalBlueprint,
  PlanningClarificationSourceBlueprint
} from "./planningClarificationBlueprints";
import { generatePlanningClarificationFingerprints } from "./planningClarificationFingerprints";
import {
  normalizeProjectPlanningState,
  type PlanningSourceAvailability,
  type ProjectPlanningState
} from "./planningProposals";

export interface PlanningClarificationSourceReconciliationInput {
  projectId: string;
  existingPlanning: ProjectPlanningState;
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
}

export type PlanningClarificationSourceCurrentDisposition =
  | "newSource"
  | "exactMatch"
  | "changedSource";

export interface PlanningClarificationSourceCurrentReconciliation {
  sourceKey: string;
  disposition: PlanningClarificationSourceCurrentDisposition;
  sourceType: PlanningClarificationSourceBlueprint["sourceType"];
  locator: string;
  existingSourceId?: string;
  existingAvailability?: PlanningSourceAvailability;
}

export interface PlanningClarificationSourceExistingOnlyReconciliation {
  sourceKey: string;
  disposition: "noLongerGenerated";
  existingSourceId: string;
  existingAvailability: "current";
}

export interface PlanningClarificationSourceNonCurrentReconciliation {
  sourceKey: string;
  existingSourceId: string;
  existingAvailability: Exclude<PlanningSourceAvailability, "current">;
}

export type PlanningClarificationSourceReconciliationIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "invalidExistingPlanning"
  | "existingPlanningNormalizationIssue"
  | "invalidSources"
  | "invalidProposals"
  | "generatedPlanningInvalid"
  | "duplicateSourceBlueprintKey"
  | "missingSourceBlueprint"
  | "unexpectedSourceBlueprint"
  | "invalidSourceKeyBinding"
  | "unsupportedExistingClarificationSource"
  | "unrecognizedExistingSourceIdentity"
  | "ambiguousExistingSourceKey";

export interface PlanningClarificationSourceReconciliationIssue {
  code: PlanningClarificationSourceReconciliationIssueCode;
  message: string;
  sourceKey?: string;
  existingSourceId?: string;
  proposalId?: string;
  field?: string;
  sourceIssueCode?: string;
}

export interface PlanningClarificationSourceReconciliationResult {
  current: readonly PlanningClarificationSourceCurrentReconciliation[];
  existingOnly: readonly PlanningClarificationSourceExistingOnlyReconciliation[];
  nonCurrent: readonly PlanningClarificationSourceNonCurrentReconciliation[];
  issues: readonly PlanningClarificationSourceReconciliationIssue[];
}

type NormalizedSource = ProjectPlanningState["sources"][number];
type NormalizedProposal = ProjectPlanningState["proposals"][number];

interface RelevantExistingSource {
  source: NormalizedSource;
  sourceKey: string;
}

export async function reconcilePlanningClarificationSources(
  input: unknown
): Promise<PlanningClarificationSourceReconciliationResult> {
  const issues: PlanningClarificationSourceReconciliationIssue[] = [];
  if (!isPlainObject(input)) {
    return result([], [], [], [issue("invalidInput", "Clarification source reconciliation input must be an object.")]);
  }

  const projectId = validateProjectId(input.projectId, issues);
  const sources = validateArray(input.sources, "sources", "invalidSources", issues);
  const proposals = validateArray(input.proposals, "proposals", "invalidProposals", issues);
  if (!projectId || !sources || !proposals) {
    return result([], [], [], issues);
  }
  if (!isPlainObject(input.existingPlanning)) {
    issues.push(issue("invalidExistingPlanning", "Existing planning state must be an object.", undefined, undefined, undefined, "existingPlanning"));
    return result([], [], [], issues);
  }

  const normalized = normalizeProjectPlanningState(input.existingPlanning, projectId);
  if (normalized.issues.length > 0) {
    return result([], [], [], [
      ...issues,
      ...normalized.issues.map((entry) =>
        issue(
          "existingPlanningNormalizationIssue",
          "Existing planning normalization failed; source reconciliation is closed.",
          undefined,
          entry.recordId,
          undefined,
          entry.field ?? entry.collection,
          entry.code
        )
      )
    ]);
  }

  const generated = await generatePlanningClarificationFingerprints({ projectId, sources, proposals });
  if (generated.issues.length > 0) {
    return result([], [], [], [
      ...issues,
      ...generated.issues.map((entry) =>
        issue(
          "generatedPlanningInvalid",
          "Generated clarification source/proposal set is invalid; source reconciliation is closed.",
          entry.sourceKey,
          undefined,
          undefined,
          entry.field,
          entry.code
        )
      )
    ]);
  }

  const sourceBlueprints = sources as readonly PlanningClarificationSourceBlueprint[];
  const proposalBlueprints = proposals as readonly PlanningClarificationProposalBlueprint[];
  const generatedSetIssues = validateGeneratedSourceSet(sourceBlueprints, proposalBlueprints);
  if (generatedSetIssues.length > 0) {
    return result([], [], [], [...issues, ...generatedSetIssues]);
  }

  const generatedSourcesByKey = new Map(sourceBlueprints.map((source) => [source.sourceKey, source]));
  const generatedSourceKeys = new Set(generatedSourcesByKey.keys());
  const existing = collectRelevantExistingSources(
    normalized.planning.sources,
    normalized.planning.proposals,
    generatedSourceKeys,
    issues
  );

  const currentByKey = groupCurrentSources(existing.current);
  const ambiguousKeys = new Set<string>();
  for (const [sourceKey, candidates] of currentByKey) {
    if (candidates.length > 1) {
      ambiguousKeys.add(sourceKey);
      issues.push(issue("ambiguousExistingSourceKey", "More than one current existing clarification source shares the same semantic key.", sourceKey));
    }
  }

  const current: PlanningClarificationSourceCurrentReconciliation[] = [];
  for (const source of sourceBlueprints) {
    if (ambiguousKeys.has(source.sourceKey)) {
      continue;
    }
    const candidates = currentByKey.get(source.sourceKey) ?? [];
    if (candidates.length === 0) {
      current.push({
        sourceKey: source.sourceKey,
        disposition: "newSource",
        sourceType: source.sourceType,
        locator: source.locator
      });
      continue;
    }

    const existingSource = candidates[0].source;
    current.push({
      sourceKey: source.sourceKey,
      disposition: sourceSemanticsMatch(existingSource, source) ? "exactMatch" : "changedSource",
      sourceType: source.sourceType,
      locator: source.locator,
      existingSourceId: existingSource.sourceId,
      existingAvailability: existingSource.availability
    });
  }

  const existingOnly = existing.current
    .filter((entry) => !generatedSourcesByKey.has(entry.sourceKey) && !ambiguousKeys.has(entry.sourceKey))
    .map((entry) => ({
      sourceKey: entry.sourceKey,
      disposition: "noLongerGenerated" as const,
      existingSourceId: entry.source.sourceId,
      existingAvailability: entry.source.availability as "current"
    }))
    .sort(sortExistingOnly);

  const nonCurrent = existing.nonCurrent
    .map((entry) => ({
      sourceKey: entry.sourceKey,
      existingSourceId: entry.source.sourceId,
      existingAvailability: entry.source.availability as Exclude<PlanningSourceAvailability, "current">
    }))
    .sort(sortNonCurrent);

  return result(current.sort(sortCurrent), existingOnly, nonCurrent, issues);
}

function validateProjectId(
  input: unknown,
  issues: PlanningClarificationSourceReconciliationIssue[]
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
  field: "sources" | "proposals",
  code: "invalidSources" | "invalidProposals",
  issues: PlanningClarificationSourceReconciliationIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue(code, `${field} must be an array.`, undefined, undefined, undefined, field));
    return null;
  }
  return input;
}

function validateGeneratedSourceSet(
  sources: readonly PlanningClarificationSourceBlueprint[],
  proposals: readonly PlanningClarificationProposalBlueprint[]
): PlanningClarificationSourceReconciliationIssue[] {
  const issues: PlanningClarificationSourceReconciliationIssue[] = [];
  const sourceCounts = new Map<string, number>();
  const expectedKeys = new Set<string>();

  for (const source of sources) {
    sourceCounts.set(source.sourceKey, (sourceCounts.get(source.sourceKey) ?? 0) + 1);
    const bindingField = invalidGeneratedSourceBindingField(source);
    if (bindingField) {
      issues.push(issue("invalidSourceKeyBinding", "Generated source blueprint does not match an approved deterministic source identity.", source.sourceKey, undefined, undefined, bindingField));
    }
  }
  for (const proposal of proposals) {
    for (const sourceKey of proposal.sourceKeys) {
      expectedKeys.add(sourceKey);
    }
  }
  for (const [sourceKey, count] of sourceCounts) {
    if (count > 1) {
      issues.push(issue("duplicateSourceBlueprintKey", "Generated source blueprints must contain exactly one canonical blueprint per source key.", sourceKey, undefined, undefined, "sourceKey"));
    }
  }
  for (const sourceKey of expectedKeys) {
    if (!sourceCounts.has(sourceKey)) {
      issues.push(issue("missingSourceBlueprint", "Generated source blueprints are missing a source key required by the generated proposals.", sourceKey, undefined, undefined, "sources"));
    }
  }
  for (const sourceKey of sourceCounts.keys()) {
    if (!expectedKeys.has(sourceKey)) {
      issues.push(issue("unexpectedSourceBlueprint", "Generated source blueprints include a source key not required by any generated proposal.", sourceKey, undefined, undefined, "sources"));
    }
  }
  return issues;
}

function invalidGeneratedSourceBindingField(source: PlanningClarificationSourceBlueprint): string | null {
  const parts = source.sourceKey.split("|");
  if (source.sourceType === "projectRule") {
    if (parts.length !== 3 || parts[0] !== "projectRule") return "sourceKey";
    if (source.locator !== `planning-rule:${parts[1]}`) return "locator";
    if (source.version !== parts[2]) return "version";
    if (source.authority !== "approved") return "authority";
    if (source.availability !== "current") return "availability";
    if (source.excerpt !== undefined) return "excerpt";
    return null;
  }
  if (source.sourceType === "readinessPrerequisite") {
    if (parts.length !== 2 || parts[0] !== "readinessPrerequisite") return "sourceKey";
    if (source.locator !== `phase-gate:${parts[1]}`) return "locator";
    if (source.version !== undefined) return "version";
    if (source.authority !== "approved") return "authority";
    if (source.availability !== "current") return "availability";
    return null;
  }
  return "sourceType";
}

function collectRelevantExistingSources(
  sources: readonly NormalizedSource[],
  proposals: readonly NormalizedProposal[],
  generatedSourceKeys: ReadonlySet<string>,
  issues: PlanningClarificationSourceReconciliationIssue[]
): { current: RelevantExistingSource[]; nonCurrent: RelevantExistingSource[] } {
  const inScopeReferences = collectInScopeClarificationSourceReferences(proposals);
  const current: RelevantExistingSource[] = [];
  const nonCurrent: RelevantExistingSource[] = [];

  for (const source of sources) {
    const derived = deriveExistingSourceKey(source);
    const referencedByProposalId = inScopeReferences.get(source.sourceId);
    const relevant = referencedByProposalId !== undefined || (derived.kind === "derived" && generatedSourceKeys.has(derived.sourceKey));
    if (!relevant) {
      continue;
    }

    if (derived.kind === "unsupported") {
      issues.push(issue("unsupportedExistingClarificationSource", "Existing in-scope clarification source cannot represent the deterministic clarification source contract.", undefined, source.sourceId, referencedByProposalId, "sourceType"));
      continue;
    }
    if (derived.kind === "unrecognized") {
      issues.push(issue("unrecognizedExistingSourceIdentity", "Existing deterministic clarification source has an unrecognized semantic identity shape.", undefined, source.sourceId, referencedByProposalId, derived.field));
      continue;
    }

    const entry = { source, sourceKey: derived.sourceKey };
    if (source.availability === "current") {
      current.push(entry);
    } else {
      nonCurrent.push(entry);
    }
  }

  return { current, nonCurrent };
}

function collectInScopeClarificationSourceReferences(
  proposals: readonly NormalizedProposal[]
): Map<string, string> {
  const references = new Map<string, string>();
  for (const proposal of proposals) {
    if (!isClarificationScope(proposal)) {
      continue;
    }
    for (const sourceId of proposal.sourceIds) {
      if (!references.has(sourceId)) {
        references.set(sourceId, proposal.proposalId);
      }
    }
  }
  return references;
}

function isClarificationScope(proposal: NormalizedProposal): boolean {
  return (
    proposal.category === "clarification" &&
    proposal.target.kind === "readinessRequirement" &&
    proposal.target.operation === "clarificationOnly"
  );
}

function deriveExistingSourceKey(source: NormalizedSource):
  | { kind: "derived"; sourceKey: string }
  | { kind: "unsupported" }
  | { kind: "unrecognized"; field: string } {
  if (source.sourceType === "projectRule") {
    const ruleId = parseLocator(source.locator, "planning-rule:");
    if (!ruleId) return { kind: "unrecognized", field: "locator" };
    if (!source.version) return { kind: "unrecognized", field: "version" };
    return { kind: "derived", sourceKey: `projectRule|${ruleId}|${source.version}` };
  }
  if (source.sourceType === "readinessPrerequisite") {
    const targetKey = parseLocator(source.locator, "phase-gate:");
    if (!targetKey) return { kind: "unrecognized", field: "locator" };
    return { kind: "derived", sourceKey: `readinessPrerequisite|${targetKey}` };
  }
  return { kind: "unsupported" };
}

function parseLocator(locator: string, prefix: string): string | null {
  if (!locator.startsWith(prefix)) {
    return null;
  }
  const value = locator.slice(prefix.length);
  return value.length > 0 ? value : null;
}

function groupCurrentSources(
  sources: readonly RelevantExistingSource[]
): Map<string, RelevantExistingSource[]> {
  const byKey = new Map<string, RelevantExistingSource[]>();
  for (const source of sources) {
    byKey.set(source.sourceKey, [...(byKey.get(source.sourceKey) ?? []), source]);
  }
  return byKey;
}

function sourceSemanticsMatch(
  existing: NormalizedSource,
  generated: PlanningClarificationSourceBlueprint
): boolean {
  return (
    existing.sourceType === generated.sourceType &&
    existing.locator === generated.locator &&
    existing.label === generated.label &&
    existing.authority === generated.authority &&
    existing.availability === generated.availability &&
    existing.version === generated.version &&
    existing.excerpt === generated.excerpt
  );
}

function sortCurrent(
  first: PlanningClarificationSourceCurrentReconciliation,
  second: PlanningClarificationSourceCurrentReconciliation
): number {
  return first.sourceKey.localeCompare(second.sourceKey);
}

function sortExistingOnly(
  first: PlanningClarificationSourceExistingOnlyReconciliation,
  second: PlanningClarificationSourceExistingOnlyReconciliation
): number {
  return first.sourceKey.localeCompare(second.sourceKey) ||
    first.existingSourceId.localeCompare(second.existingSourceId);
}

function sortNonCurrent(
  first: PlanningClarificationSourceNonCurrentReconciliation,
  second: PlanningClarificationSourceNonCurrentReconciliation
): number {
  return first.sourceKey.localeCompare(second.sourceKey) ||
    first.existingSourceId.localeCompare(second.existingSourceId);
}

function result(
  current: readonly PlanningClarificationSourceCurrentReconciliation[],
  existingOnly: readonly PlanningClarificationSourceExistingOnlyReconciliation[],
  nonCurrent: readonly PlanningClarificationSourceNonCurrentReconciliation[],
  issues: readonly PlanningClarificationSourceReconciliationIssue[]
): PlanningClarificationSourceReconciliationResult {
  return {
    current: current.map((entry) => ({ ...entry })),
    existingOnly: existingOnly.map((entry) => ({ ...entry })),
    nonCurrent: nonCurrent.map((entry) => ({ ...entry })),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningClarificationSourceReconciliationIssueCode,
  message: string,
  sourceKey?: string,
  existingSourceId?: string,
  proposalId?: string,
  field?: string,
  sourceIssueCode?: string
): PlanningClarificationSourceReconciliationIssue {
  return dropUndefined({ code, message, sourceKey, existingSourceId, proposalId, field, sourceIssueCode });
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
