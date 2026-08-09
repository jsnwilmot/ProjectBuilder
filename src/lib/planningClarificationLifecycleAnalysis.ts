import type {
  PlanningClarificationProposalBlueprint,
  PlanningClarificationSourceBlueprint
} from "./planningClarificationBlueprints";
import type { PlanningClarificationFingerprintRecord } from "./planningClarificationFingerprints";
import {
  reconcilePlanningClarifications,
  type PlanningClarificationCurrentReconciliation,
  type PlanningClarificationCurrentDisposition,
  type PlanningClarificationReconciliationResult
} from "./planningClarificationReconciliation";
import {
  reconcilePlanningClarificationSources,
  type PlanningClarificationSourceCurrentDisposition,
  type PlanningClarificationSourceReconciliationResult
} from "./planningClarificationSourceReconciliation";
import {
  normalizeProjectPlanningState,
  PLANNING_SCHEMA_VERSION,
  type PlanningProposalRecord,
  type PlanningStaleReason,
  type PlanningSourceReference,
  type PlanningTargetReference,
  type ProjectPlanningState
} from "./planningProposals";

export interface PlanningClarificationLifecycleAnalysisInput {
  projectId: string;
  existingPlanning: ProjectPlanningState;
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
  fingerprints: readonly PlanningClarificationFingerprintRecord[];
}

export type PlanningClarificationLifecycleDisposition =
  | "unchanged"
  | "staleRequired"
  | "noLongerGenerated"
  | "historical"
  | "ambiguous";

export interface PlanningClarificationSourceLifecycleAnalysisRecord {
  semanticKey: string;
  persistedId?: string;
  disposition: PlanningClarificationLifecycleDisposition;
  staleReason?: PlanningStaleReason;
  changedFields?: readonly string[];
  sourceReconciliationDisposition?: PlanningClarificationSourceCurrentDisposition | "noLongerGenerated" | "nonCurrent";
}

export interface PlanningClarificationProposalLifecycleAnalysisRecord {
  semanticKey: string;
  persistedId?: string;
  disposition: PlanningClarificationLifecycleDisposition;
  staleReason?: PlanningStaleReason;
  changedFields?: readonly string[];
  generatedFingerprint?: string;
  existingFingerprint?: string;
  proposalReconciliationDisposition?: PlanningClarificationCurrentDisposition | "noLongerGenerated" | "historical";
}

export type PlanningClarificationLifecycleAnalysisIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "invalidExistingPlanning"
  | "sourceReconciliationFailed"
  | "proposalReconciliationFailed"
  | "sourceChangeAmbiguous"
  | "proposalChangeAmbiguous"
  | "unversionedRuleContentChange"
  | "multipleLifecycleReasons"
  | "lifecycleCauseUnresolved";

export interface PlanningClarificationLifecycleAnalysisIssue {
  code: PlanningClarificationLifecycleAnalysisIssueCode;
  message: string;
  sourceKey?: string;
  proposalKey?: string;
  persistedId?: string;
  field?: string;
  sourceIssueCode?: string;
}

export interface PlanningClarificationLifecycleAnalysisResult {
  projectId: string;
  sources: readonly PlanningClarificationSourceLifecycleAnalysisRecord[];
  proposals: readonly PlanningClarificationProposalLifecycleAnalysisRecord[];
  issues: readonly PlanningClarificationLifecycleAnalysisIssue[];
}

type NormalizedPlanning = ProjectPlanningState;

const SOURCE_CHANGE_FIELDS = [
  "sourceType",
  "locator",
  "label",
  "authority",
  "availability",
  "version",
  "excerpt"
] as const;

const PROPOSAL_CONTENT_FIELDS = [
  "value",
  "title",
  "recommendation",
  "rationale",
  "consequence",
  "uncertainty",
  "restriction",
  "readinessRequirementIds"
] as const;

export async function analyzePlanningClarificationLifecycleChanges(
  input: unknown
): Promise<PlanningClarificationLifecycleAnalysisResult> {
  if (!isPlainObject(input)) {
    return result("", [], [], [issue("invalidInput", "Clarification lifecycle analysis input must be an object.")]);
  }

  const issues: PlanningClarificationLifecycleAnalysisIssue[] = [];
  const projectId = validateProjectId(input.projectId, issues);
  const existingPlanning = isPlainObject(input.existingPlanning) ? input.existingPlanning : null;
  const sources = validateArray(input.sources, "sources", issues);
  const proposals = validateArray(input.proposals, "proposals", issues);
  const fingerprints = validateArray(input.fingerprints, "fingerprints", issues);
  if (!existingPlanning) {
    issues.push(issue("invalidExistingPlanning", "Existing planning state must be an object.", undefined, undefined, undefined, "existingPlanning"));
  }
  if (!projectId || !existingPlanning || !sources || !proposals || !fingerprints) {
    return result(projectId ?? "", [], [], issues);
  }

  const normalized = normalizeProjectPlanningState(existingPlanning, projectId);
  if (normalized.issues.length > 0) {
    return result(projectId, [], [], normalized.issues.map((entry) =>
      issue(
        "invalidExistingPlanning",
        "Existing planning normalization failed; lifecycle analysis is closed.",
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
    ...mapSourceReconciliationIssues(sourceReconciliation),
    ...mapProposalReconciliationIssues(proposalReconciliation)
  ];
  if (reconciliationIssues.length > 0) {
    return result(projectId, [], [], reconciliationIssues);
  }

  const sourceAnalysis = analyzeSources(
    normalized.planning,
    sources as readonly PlanningClarificationSourceBlueprint[],
    sourceReconciliation
  );
  const proposalAnalysis = analyzeProposals(
    normalized.planning,
    proposals as readonly PlanningClarificationProposalBlueprint[],
    sourceReconciliation,
    proposalReconciliation
  );
  return result(projectId, sourceAnalysis.records, proposalAnalysis.records, [
    ...sourceAnalysis.issues,
    ...proposalAnalysis.issues
  ]);
}

function analyzeSources(
  planning: NormalizedPlanning,
  sources: readonly PlanningClarificationSourceBlueprint[],
  sourceReconciliation: PlanningClarificationSourceReconciliationResult
): { records: PlanningClarificationSourceLifecycleAnalysisRecord[]; issues: PlanningClarificationLifecycleAnalysisIssue[] } {
  const generatedByKey = new Map(sources.map((source) => [source.sourceKey, source]));
  const existingById = new Map(planning.sources.map((source) => [source.sourceId, source]));
  const records: PlanningClarificationSourceLifecycleAnalysisRecord[] = [];
  const issues: PlanningClarificationLifecycleAnalysisIssue[] = [];

  for (const entry of sourceReconciliation.current) {
    if (entry.disposition === "newSource") {
      records.push({
        semanticKey: entry.sourceKey,
        disposition: "unchanged",
        sourceReconciliationDisposition: entry.disposition
      });
      continue;
    }
    if (entry.disposition === "exactMatch") {
      records.push({
        semanticKey: entry.sourceKey,
        persistedId: entry.existingSourceId,
        disposition: "unchanged",
        sourceReconciliationDisposition: entry.disposition
      });
      continue;
    }

    const generated = generatedByKey.get(entry.sourceKey);
    const existing = entry.existingSourceId ? existingById.get(entry.existingSourceId) : undefined;
    if (!generated || !existing) {
      issues.push(issue("sourceChangeAmbiguous", "Changed source could not be bound for structural analysis.", entry.sourceKey, undefined, entry.existingSourceId));
      records.push({
        semanticKey: entry.sourceKey,
        persistedId: entry.existingSourceId,
        disposition: "ambiguous",
        sourceReconciliationDisposition: entry.disposition
      });
      continue;
    }
    const changedFields = compareSourceFields(existing, generated);
    const identityChanged = changedFields.some((field) => field === "sourceType" || field === "locator");
    if (identityChanged) {
      issues.push(issue("sourceChangeAmbiguous", "Changed source identity fields make lifecycle cause ambiguous.", entry.sourceKey, undefined, entry.existingSourceId, changedFields.join(",")));
    }
    records.push({
      semanticKey: entry.sourceKey,
      persistedId: entry.existingSourceId,
      disposition: identityChanged ? "ambiguous" : "staleRequired",
      staleReason: identityChanged ? undefined : "sourceChanged",
      changedFields,
      sourceReconciliationDisposition: entry.disposition
    });
  }

  for (const entry of sourceReconciliation.existingOnly) {
    issues.push(issue("lifecycleCauseUnresolved", "Existing-only source has no approved deterministic stale reason in this phase.", entry.sourceKey, undefined, entry.existingSourceId));
    records.push({
      semanticKey: entry.sourceKey,
      persistedId: entry.existingSourceId,
      disposition: "noLongerGenerated",
      sourceReconciliationDisposition: entry.disposition
    });
  }

  for (const entry of sourceReconciliation.nonCurrent) {
    records.push({
      semanticKey: entry.sourceKey,
      persistedId: entry.existingSourceId,
      disposition: "historical",
      sourceReconciliationDisposition: "nonCurrent"
    });
  }

  return { records: records.sort(sortAnalysisRecords), issues };
}

function analyzeProposals(
  planning: NormalizedPlanning,
  proposals: readonly PlanningClarificationProposalBlueprint[],
  sourceReconciliation: PlanningClarificationSourceReconciliationResult,
  proposalReconciliation: PlanningClarificationReconciliationResult
): { records: PlanningClarificationProposalLifecycleAnalysisRecord[]; issues: PlanningClarificationLifecycleAnalysisIssue[] } {
  const generatedByKey = new Map(proposals.map((proposal) => [proposal.proposalKey, proposal]));
  const existingById = new Map(planning.proposals.map((proposal) => [proposal.proposalId, proposal]));
  const sourceIdsByKey = sourceIdsBySemanticKey(sourceReconciliation);
  const records: PlanningClarificationProposalLifecycleAnalysisRecord[] = [];
  const issues: PlanningClarificationLifecycleAnalysisIssue[] = [];

  for (const entry of proposalReconciliation.current) {
    if (entry.disposition === "newProposal") {
      records.push({
        semanticKey: entry.proposalKey,
        disposition: "unchanged",
        generatedFingerprint: entry.generatedFingerprint,
        proposalReconciliationDisposition: entry.disposition
      });
      continue;
    }
    if (entry.disposition === "exactMatch") {
      records.push({
        semanticKey: entry.proposalKey,
        persistedId: entry.existingProposalId,
        disposition: "unchanged",
        generatedFingerprint: entry.generatedFingerprint,
        existingFingerprint: entry.existingFingerprint,
        proposalReconciliationDisposition: entry.disposition
      });
      continue;
    }

    const generated = generatedByKey.get(entry.proposalKey);
    const existing = entry.existingProposalId ? existingById.get(entry.existingProposalId) : undefined;
    if (!generated || !existing) {
      issues.push(issue("proposalChangeAmbiguous", "Changed proposal could not be bound for structural analysis.", undefined, entry.proposalKey, entry.existingProposalId));
      records.push({
        semanticKey: entry.proposalKey,
        persistedId: entry.existingProposalId,
        disposition: "ambiguous",
        generatedFingerprint: entry.generatedFingerprint,
        existingFingerprint: entry.existingFingerprint,
        proposalReconciliationDisposition: entry.disposition
      });
      continue;
    }
    const classified = classifyChangedProposal(existing, generated, entry, sourceIdsByKey);
    records.push(classified.record);
    issues.push(...classified.issues);
  }

  for (const entry of proposalReconciliation.existingOnly) {
    issues.push(issue("lifecycleCauseUnresolved", "Existing-only proposal has no approved deterministic stale reason in this phase.", undefined, entry.proposalKey, entry.existingProposalId));
    records.push({
      semanticKey: entry.proposalKey,
      persistedId: entry.existingProposalId,
      disposition: "noLongerGenerated",
      existingFingerprint: entry.existingFingerprint,
      proposalReconciliationDisposition: entry.disposition
    });
  }

  for (const entry of proposalReconciliation.historical) {
    records.push({
      semanticKey: entry.proposalKey,
      persistedId: entry.existingProposalId,
      disposition: "historical",
      existingFingerprint: entry.existingFingerprint,
      proposalReconciliationDisposition: "historical"
    });
  }

  return { records: records.sort(sortAnalysisRecords), issues };
}

function classifyChangedProposal(
  existing: PlanningProposalRecord,
  generated: PlanningClarificationProposalBlueprint,
  reconciliation: PlanningClarificationCurrentReconciliation,
  sourceIdsByKey: ReadonlyMap<string, string>
): { record: PlanningClarificationProposalLifecycleAnalysisRecord; issues: PlanningClarificationLifecycleAnalysisIssue[] } {
  const changedFields = compareProposalFields(existing, generated, sourceIdsByKey);
  const categories = changedCategories(changedFields);
  const issues: PlanningClarificationLifecycleAnalysisIssue[] = [];
  const base = {
    semanticKey: reconciliation.proposalKey,
    persistedId: reconciliation.existingProposalId,
    changedFields,
    generatedFingerprint: reconciliation.generatedFingerprint,
    existingFingerprint: reconciliation.existingFingerprint,
    proposalReconciliationDisposition: reconciliation.disposition
  };

  if (categories.has("identity") || categories.has("target") || categories.has("source") || categories.size === 0) {
    issues.push(issue("proposalChangeAmbiguous", "Changed proposal contains unsupported identity, target, source, or fingerprint-only differences.", undefined, reconciliation.proposalKey, reconciliation.existingProposalId, changedFields.join(",")));
    issues.push(issue("lifecycleCauseUnresolved", "Changed proposal has no approved deterministic stale reason in this phase.", undefined, reconciliation.proposalKey, reconciliation.existingProposalId));
    return { record: { ...base, disposition: "ambiguous" }, issues };
  }
  if (categories.has("rule")) {
    return { record: { ...base, disposition: "staleRequired", staleReason: "ruleChanged" }, issues };
  }
  if (categories.size === 1 && categories.has("applicability")) {
    return { record: { ...base, disposition: "staleRequired", staleReason: "applicabilityChanged" }, issues };
  }
  if (categories.size === 1 && categories.has("content")) {
    issues.push(issue("unversionedRuleContentChange", "Generated clarification content changed without a rule-version change.", undefined, reconciliation.proposalKey, reconciliation.existingProposalId, changedFields.join(",")));
    return { record: { ...base, disposition: "staleRequired", staleReason: "proposalRegenerated" }, issues };
  }
  issues.push(issue("multipleLifecycleReasons", "Changed proposal crosses multiple independent lifecycle reason categories.", undefined, reconciliation.proposalKey, reconciliation.existingProposalId, changedFields.join(",")));
  return { record: { ...base, disposition: "ambiguous" }, issues };
}

function mapSourceReconciliationIssues(
  sourceReconciliation: PlanningClarificationSourceReconciliationResult
): PlanningClarificationLifecycleAnalysisIssue[] {
  return sourceReconciliation.issues.map((entry) => {
    const ambiguous = entry.code === "ambiguousExistingSourceKey" ||
      entry.code === "unrecognizedExistingSourceIdentity" ||
      entry.code === "unsupportedExistingClarificationSource";
    return issue(
      ambiguous ? "sourceChangeAmbiguous" : "sourceReconciliationFailed",
      "Source reconciliation produced an issue; lifecycle analysis is closed.",
      entry.sourceKey,
      undefined,
      entry.existingSourceId,
      entry.field,
      entry.code
    );
  });
}

function mapProposalReconciliationIssues(
  proposalReconciliation: PlanningClarificationReconciliationResult
): PlanningClarificationLifecycleAnalysisIssue[] {
  return proposalReconciliation.issues.map((entry) => {
    const ambiguous = entry.code === "ambiguousExistingProposalKey" ||
      entry.code === "ambiguousExistingFingerprint";
    return issue(
      ambiguous ? "proposalChangeAmbiguous" : "proposalReconciliationFailed",
      "Proposal reconciliation produced an issue; lifecycle analysis is closed.",
      undefined,
      entry.proposalKey,
      entry.existingProposalId,
      entry.field,
      entry.code
    );
  });
}

function compareSourceFields(
  existing: PlanningSourceReference,
  generated: PlanningClarificationSourceBlueprint
): string[] {
  return SOURCE_CHANGE_FIELDS.filter((field) => existing[field] !== generated[field]);
}

function compareProposalFields(
  existing: PlanningProposalRecord,
  generated: PlanningClarificationProposalBlueprint,
  sourceIdsByKey: ReadonlyMap<string, string>
): string[] {
  const fields: string[] = [];
  if (existing.proposalSchemaVersion !== PLANNING_SCHEMA_VERSION) fields.push("proposalSchemaVersion");
  if (existing.projectId !== generated.projectId) fields.push("projectId");
  if (existing.ruleSetId !== generated.ruleSetId) fields.push("ruleSetId");
  if (existing.ruleSetVersion !== generated.ruleSetVersion) fields.push("ruleSetVersion");
  if (existing.ruleId !== generated.ruleId) fields.push("ruleId");
  if (existing.ruleVersion !== generated.ruleVersion) fields.push("ruleVersion");
  if (!sameTarget(existing.target, generated.target)) fields.push("target");
  if (existing.category !== generated.category) fields.push("category");
  if (existing.status !== generated.status) fields.push("status");
  for (const field of PROPOSAL_CONTENT_FIELDS) {
    if (!sameJson(existing[field], generated[field])) {
      fields.push(field);
    }
  }
  const expectedSourceIds = generated.sourceKeys.map((sourceKey) => sourceIdsByKey.get(sourceKey));
  if (!expectedSourceIds.every(Boolean) || !sameStringArray(existing.sourceIds, expectedSourceIds as string[])) {
    fields.push("sourceIds");
  }
  if (!sameStringArray(existing.applicableProjectTypes, generated.applicableProjectTypes)) {
    fields.push("applicableProjectTypes");
  }
  if (!sameStringArray(existing.applicableDomains, generated.applicableDomains)) {
    fields.push("applicableDomains");
  }
  if (fields.length === 0 && existing.fingerprint !== undefined) {
    fields.push("fingerprint");
  }
  return fields.sort();
}

function changedCategories(changedFields: readonly string[]): Set<"identity" | "rule" | "target" | "source" | "applicability" | "content" | "fingerprint"> {
  const categories = new Set<"identity" | "rule" | "target" | "source" | "applicability" | "content" | "fingerprint">();
  for (const field of changedFields) {
    if (field === "ruleVersion" || field === "ruleSetVersion") {
      categories.add("rule");
    } else if (field === "target") {
      categories.add("target");
    } else if (field === "sourceIds") {
      categories.add("source");
    } else if (field === "applicableProjectTypes" || field === "applicableDomains") {
      categories.add("applicability");
    } else if ((PROPOSAL_CONTENT_FIELDS as readonly string[]).includes(field)) {
      categories.add("content");
    } else if (field === "fingerprint") {
      categories.add("fingerprint");
    } else {
      categories.add("identity");
    }
  }
  return categories;
}

function sourceIdsBySemanticKey(
  sourceReconciliation: PlanningClarificationSourceReconciliationResult
): Map<string, string> {
  const ids = new Map<string, string>();
  for (const entry of sourceReconciliation.current) {
    if ((entry.disposition === "exactMatch" || entry.disposition === "changedSource") && entry.existingSourceId) {
      ids.set(entry.sourceKey, entry.existingSourceId);
    }
  }
  return ids;
}

function validateProjectId(
  input: unknown,
  issues: PlanningClarificationLifecycleAnalysisIssue[]
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
  issues: PlanningClarificationLifecycleAnalysisIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue("invalidInput", `${field} must be an array.`, undefined, undefined, undefined, field));
    return null;
  }
  return input;
}

function sameTarget(existing: PlanningTargetReference, generated: PlanningTargetReference): boolean {
  return (
    existing.kind === generated.kind &&
    existing.domain === generated.domain &&
    existing.targetKey === generated.targetKey &&
    existing.entityId === generated.entityId &&
    existing.fieldKey === generated.fieldKey &&
    existing.operation === generated.operation
  );
}

function sameStringArray(input: readonly string[] | undefined, expected: readonly string[]): boolean {
  return Array.isArray(input) && input.length === expected.length && input.every((entry, index) => entry === expected[index]);
}

function sameJson(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function sortAnalysisRecords<T extends { semanticKey: string; persistedId?: string }>(first: T, second: T): number {
  return first.semanticKey.localeCompare(second.semanticKey) ||
    (first.persistedId ?? "").localeCompare(second.persistedId ?? "");
}

function result(
  projectId: string,
  sources: readonly PlanningClarificationSourceLifecycleAnalysisRecord[],
  proposals: readonly PlanningClarificationProposalLifecycleAnalysisRecord[],
  issues: readonly PlanningClarificationLifecycleAnalysisIssue[]
): PlanningClarificationLifecycleAnalysisResult {
  return {
    projectId,
    sources: sources.map(cloneSourceRecord),
    proposals: proposals.map(cloneProposalRecord),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function cloneSourceRecord(
  record: PlanningClarificationSourceLifecycleAnalysisRecord
): PlanningClarificationSourceLifecycleAnalysisRecord {
  return {
    ...record,
    changedFields: record.changedFields ? [...record.changedFields] : undefined
  };
}

function cloneProposalRecord(
  record: PlanningClarificationProposalLifecycleAnalysisRecord
): PlanningClarificationProposalLifecycleAnalysisRecord {
  return {
    ...record,
    changedFields: record.changedFields ? [...record.changedFields] : undefined
  };
}

function issue(
  code: PlanningClarificationLifecycleAnalysisIssueCode,
  message: string,
  sourceKey?: string,
  proposalKey?: string,
  persistedId?: string,
  field?: string,
  sourceIssueCode?: string
): PlanningClarificationLifecycleAnalysisIssue {
  return dropUndefined({ code, message, sourceKey, proposalKey, persistedId, field, sourceIssueCode });
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
