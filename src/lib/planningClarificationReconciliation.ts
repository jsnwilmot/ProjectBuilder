import { isSha256Hex } from "../core/sha256Fingerprint";
import type {
  PlanningClarificationProposalBlueprint,
  PlanningClarificationSourceBlueprint
} from "./planningClarificationBlueprints";
import {
  generatePlanningClarificationFingerprints,
  type PlanningClarificationFingerprintRecord
} from "./planningClarificationFingerprints";
import {
  normalizeProjectPlanningState,
  PLANNING_SCHEMA_VERSION,
  type PlanningProposalStatus,
  type PlanningTargetReference,
  type ProjectPlanningState
} from "./planningProposals";

export interface PlanningClarificationReconciliationInput {
  projectId: string;
  existingPlanning: ProjectPlanningState;
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
  fingerprints: readonly PlanningClarificationFingerprintRecord[];
}

export type PlanningClarificationCurrentDisposition =
  | "newProposal"
  | "exactMatch"
  | "changedProposal";

export interface PlanningClarificationCurrentReconciliation {
  proposalKey: string;
  disposition: PlanningClarificationCurrentDisposition;
  generatedFingerprint: string;
  fingerprintInput: string;
  existingProposalId?: string;
  existingFingerprint?: string;
  existingStatus?: PlanningProposalStatus;
}

export interface PlanningClarificationExistingOnlyReconciliation {
  proposalKey: string;
  disposition: "noLongerGenerated";
  existingProposalId: string;
  existingFingerprint: string;
  existingStatus: PlanningProposalStatus;
}

export interface PlanningClarificationHistoricalReconciliation {
  proposalKey: string;
  existingProposalId: string;
  existingFingerprint: string;
  existingStatus: "Rejected" | "Superseded";
}

export type PlanningClarificationReconciliationIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "invalidExistingPlanning"
  | "existingPlanningNormalizationIssue"
  | "invalidSources"
  | "invalidProposals"
  | "invalidFingerprints"
  | "generatedPlanningInvalid"
  | "duplicateFingerprintProposalKey"
  | "missingFingerprint"
  | "unexpectedFingerprint"
  | "fingerprintInputMismatch"
  | "fingerprintMismatch"
  | "ambiguousExistingProposalKey"
  | "ambiguousExistingFingerprint"
  | "existingProposalIdentityMismatch";

export interface PlanningClarificationReconciliationIssue {
  code: PlanningClarificationReconciliationIssueCode;
  message: string;
  proposalKey?: string;
  existingProposalId?: string;
  field?: string;
  sourceIssueCode?: string;
}

export interface PlanningClarificationReconciliationResult {
  current: readonly PlanningClarificationCurrentReconciliation[];
  existingOnly: readonly PlanningClarificationExistingOnlyReconciliation[];
  historical: readonly PlanningClarificationHistoricalReconciliation[];
  issues: readonly PlanningClarificationReconciliationIssue[];
}

type NormalizedProposal = ProjectPlanningState["proposals"][number];

const TERMINAL_STATUSES = ["Rejected", "Superseded"] as const satisfies readonly PlanningProposalStatus[];
const NON_TERMINAL_STATUSES = [
  "Proposed",
  "Confirmed",
  "Revised",
  "Deferred",
  "Not Applicable",
  "Stale",
  "Blocked",
  "Needs Clarification"
] as const satisfies readonly PlanningProposalStatus[];

export async function reconcilePlanningClarifications(
  input: unknown
): Promise<PlanningClarificationReconciliationResult> {
  const issues: PlanningClarificationReconciliationIssue[] = [];
  if (!isPlainObject(input)) {
    return result([], [], [], [issue("invalidInput", "Clarification reconciliation input must be an object.")]);
  }

  const projectId = validateProjectId(input.projectId, issues);
  const sources = validateArray(input.sources, "sources", "invalidSources", issues);
  const proposals = validateArray(input.proposals, "proposals", "invalidProposals", issues);
  const suppliedFingerprints = validateArray(input.fingerprints, "fingerprints", "invalidFingerprints", issues);
  if (!projectId || !sources || !proposals || !suppliedFingerprints) {
    return result([], [], [], issues);
  }
  if (!isPlainObject(input.existingPlanning)) {
    issues.push(issue("invalidExistingPlanning", "Existing planning state must be an object.", undefined, undefined, "existingPlanning"));
    return result([], [], [], issues);
  }

  const normalized = normalizeProjectPlanningState(input.existingPlanning, projectId);
  if (normalized.issues.length > 0) {
    return result([], [], [], [
      ...issues,
      ...normalized.issues.map((entry) =>
        issue(
          "existingPlanningNormalizationIssue",
          "Existing planning normalization failed; reconciliation is closed.",
          undefined,
          entry.recordId,
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
          "Generated clarification fingerprints are invalid; reconciliation is closed.",
          entry.proposalKey,
          undefined,
          entry.field,
          entry.code
        )
      )
    ]);
  }

  const fingerprintIssues = validateSuppliedFingerprints(suppliedFingerprints, generated.fingerprints);
  if (fingerprintIssues.length > 0) {
    return result([], [], [], [...issues, ...fingerprintIssues]);
  }

  const generatedByKey = new Map(generated.fingerprints.map((record) => [record.proposalKey, record]));
  const proposalBlueprints = proposals as readonly PlanningClarificationProposalBlueprint[];
  const proposalsByKey = new Map(proposalBlueprints.map((proposal) => [proposal.proposalKey, proposal]));
  const existing = collectExistingClarifications(normalized.planning.proposals);
  const current: PlanningClarificationCurrentReconciliation[] = [];
  const suppressedGeneratedKeys = new Set<string>();

  for (const [proposalKey, candidates] of existing.nonTerminalByKey) {
    if (candidates.length > 1) {
      issues.push(issue("ambiguousExistingProposalKey", "More than one non-terminal existing clarification proposal shares the same semantic key.", proposalKey));
      suppressedGeneratedKeys.add(proposalKey);
    }
  }

  for (const generatedRecord of generated.fingerprints) {
    const candidatesWithFingerprint = existing.nonTerminal.filter(
      (proposal) => proposal.fingerprint === generatedRecord.fingerprint
    );
    if (candidatesWithFingerprint.length > 1) {
      issues.push(issue("ambiguousExistingFingerprint", "More than one non-terminal existing clarification proposal shares the generated fingerprint.", generatedRecord.proposalKey, candidatesWithFingerprint[0].proposalId, "fingerprint"));
      suppressedGeneratedKeys.add(generatedRecord.proposalKey);
    }
  }

  for (const generatedRecord of generated.fingerprints) {
    if (suppressedGeneratedKeys.has(generatedRecord.proposalKey)) {
      continue;
    }
    const candidates = existing.nonTerminalByKey.get(generatedRecord.proposalKey) ?? [];
    if (candidates.length === 0) {
      current.push({
        proposalKey: generatedRecord.proposalKey,
        disposition: "newProposal",
        generatedFingerprint: generatedRecord.fingerprint,
        fingerprintInput: generatedRecord.fingerprintInput
      });
      continue;
    }

    const candidate = candidates[0];
    if (candidate.fingerprint === generatedRecord.fingerprint) {
      const generatedProposal = proposalsByKey.get(generatedRecord.proposalKey);
      const mismatchField = generatedProposal
        ? findExistingIdentityMismatch(candidate, generatedProposal)
        : "proposalKey";
      if (mismatchField) {
        issues.push(issue("existingProposalIdentityMismatch", "Existing proposal stable identity metadata conflicts with the generated proposal despite matching fingerprint.", generatedRecord.proposalKey, candidate.proposalId, mismatchField));
        continue;
      }
      current.push({
        proposalKey: generatedRecord.proposalKey,
        disposition: "exactMatch",
        generatedFingerprint: generatedRecord.fingerprint,
        fingerprintInput: generatedRecord.fingerprintInput,
        existingProposalId: candidate.proposalId,
        existingFingerprint: candidate.fingerprint,
        existingStatus: candidate.status
      });
      continue;
    }

    current.push({
      proposalKey: generatedRecord.proposalKey,
      disposition: "changedProposal",
      generatedFingerprint: generatedRecord.fingerprint,
      fingerprintInput: generatedRecord.fingerprintInput,
      existingProposalId: candidate.proposalId,
      existingFingerprint: candidate.fingerprint,
      existingStatus: candidate.status
    });
  }

  const existingOnly = existing.nonTerminal
    .filter((proposal) => !generatedByKey.has(proposal.proposalKey))
    .map((proposal) => ({
      proposalKey: proposal.proposalKey,
      disposition: "noLongerGenerated" as const,
      existingProposalId: proposal.proposalId,
      existingFingerprint: proposal.fingerprint,
      existingStatus: proposal.status
    }))
    .sort(sortExistingOnly);

  const historical = existing.historical
    .map((proposal) => ({
      proposalKey: proposal.proposalKey,
      existingProposalId: proposal.proposalId,
      existingFingerprint: proposal.fingerprint,
      existingStatus: proposal.status
    }))
    .sort(sortHistorical);

  return result(current, existingOnly, historical, issues);
}

function validateProjectId(
  input: unknown,
  issues: PlanningClarificationReconciliationIssue[]
): string | null {
  if (
    typeof input !== "string" ||
    input.trim().length === 0 ||
    input.length > 200 ||
    /[\r\n]/.test(input)
  ) {
    issues.push(issue("invalidProjectId", "Project ID must be a non-empty single-line string no longer than 200 characters.", undefined, undefined, "projectId"));
    return null;
  }
  return input;
}

function validateArray(
  input: unknown,
  field: "sources" | "proposals" | "fingerprints",
  code: "invalidSources" | "invalidProposals" | "invalidFingerprints",
  issues: PlanningClarificationReconciliationIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue(code, `${field} must be an array.`, undefined, undefined, field));
    return null;
  }
  return input;
}

function validateSuppliedFingerprints(
  supplied: readonly unknown[],
  expected: readonly PlanningClarificationFingerprintRecord[]
): PlanningClarificationReconciliationIssue[] {
  const issues: PlanningClarificationReconciliationIssue[] = [];
  const suppliedByKey = new Map<string, PlanningClarificationFingerprintRecord>();
  const counts = new Map<string, number>();
  const expectedByKey = new Map(expected.map((record) => [record.proposalKey, record]));

  for (const rawRecord of supplied) {
    if (!isPlainObject(rawRecord)) {
      issues.push(issue("invalidFingerprints", "Fingerprint record must be an object.", undefined, undefined, "fingerprints"));
      continue;
    }
    const proposalKey = typeof rawRecord.proposalKey === "string" ? rawRecord.proposalKey : undefined;
    if (
      typeof rawRecord.proposalKey !== "string" ||
      typeof rawRecord.fingerprintInput !== "string" ||
      !isSha256Hex(rawRecord.fingerprint)
    ) {
      issues.push(issue("invalidFingerprints", "Fingerprint record must contain proposalKey, fingerprintInput, and a valid lowercase SHA-256 fingerprint.", proposalKey, undefined, "fingerprints"));
      continue;
    }
    counts.set(rawRecord.proposalKey, (counts.get(rawRecord.proposalKey) ?? 0) + 1);
    suppliedByKey.set(rawRecord.proposalKey, {
      proposalKey: rawRecord.proposalKey,
      fingerprintInput: rawRecord.fingerprintInput,
      fingerprint: rawRecord.fingerprint
    });
  }

  for (const [proposalKey, count] of counts) {
    if (count > 1) {
      issues.push(issue("duplicateFingerprintProposalKey", "Supplied fingerprint proposal keys must be unique.", proposalKey, undefined, "proposalKey"));
    }
  }
  if (issues.length > 0) {
    return issues;
  }

  for (const expectedRecord of expected) {
    const suppliedRecord = suppliedByKey.get(expectedRecord.proposalKey);
    if (!suppliedRecord) {
      issues.push(issue("missingFingerprint", "Supplied fingerprints are missing an expected generated proposal key.", expectedRecord.proposalKey, undefined, "fingerprints"));
      continue;
    }
    if (suppliedRecord.fingerprintInput !== expectedRecord.fingerprintInput) {
      issues.push(issue("fingerprintInputMismatch", "Supplied fingerprint input differs from independently generated fingerprint input.", expectedRecord.proposalKey, undefined, "fingerprintInput"));
    }
    if (suppliedRecord.fingerprint !== expectedRecord.fingerprint) {
      issues.push(issue("fingerprintMismatch", "Supplied fingerprint differs from independently generated fingerprint.", expectedRecord.proposalKey, undefined, "fingerprint"));
    }
  }

  for (const suppliedKey of suppliedByKey.keys()) {
    if (!expectedByKey.has(suppliedKey)) {
      issues.push(issue("unexpectedFingerprint", "Supplied fingerprints include an unexpected proposal key.", suppliedKey, undefined, "fingerprints"));
    }
  }
  return issues;
}

function collectExistingClarifications(proposals: readonly NormalizedProposal[]): {
  nonTerminal: Array<NormalizedProposal & { proposalKey: string }>;
  nonTerminalByKey: Map<string, Array<NormalizedProposal & { proposalKey: string }>>;
  historical: Array<NormalizedProposal & { proposalKey: string; status: "Rejected" | "Superseded" }>;
} {
  const nonTerminal: Array<NormalizedProposal & { proposalKey: string }> = [];
  const nonTerminalByKey = new Map<string, Array<NormalizedProposal & { proposalKey: string }>>();
  const historical: Array<NormalizedProposal & { proposalKey: string; status: "Rejected" | "Superseded" }> = [];

  for (const proposal of proposals) {
    if (!isClarificationScope(proposal)) {
      continue;
    }
    const proposalKey = proposalKeyForExisting(proposal);
    if (isTerminalStatus(proposal.status)) {
      historical.push({ ...proposal, proposalKey, status: proposal.status });
      continue;
    }
    if ((NON_TERMINAL_STATUSES as readonly string[]).includes(proposal.status)) {
      const entry = { ...proposal, proposalKey };
      nonTerminal.push(entry);
      nonTerminalByKey.set(proposalKey, [...(nonTerminalByKey.get(proposalKey) ?? []), entry]);
    }
  }

  return { nonTerminal, nonTerminalByKey, historical };
}

function isClarificationScope(proposal: NormalizedProposal): boolean {
  return (
    proposal.category === "clarification" &&
    proposal.target.kind === "readinessRequirement" &&
    proposal.target.operation === "clarificationOnly"
  );
}

function proposalKeyForExisting(proposal: NormalizedProposal): string {
  return `clarification|${proposal.ruleId}|${proposal.target.targetKey}`;
}

function isTerminalStatus(status: PlanningProposalStatus): status is "Rejected" | "Superseded" {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

function findExistingIdentityMismatch(
  existing: NormalizedProposal,
  generated: PlanningClarificationProposalBlueprint
): string | null {
  if (existing.proposalSchemaVersion !== PLANNING_SCHEMA_VERSION) return "proposalSchemaVersion";
  if (existing.projectId !== generated.projectId) return "projectId";
  if (existing.ruleSetId !== generated.ruleSetId) return "ruleSetId";
  if (existing.ruleSetVersion !== generated.ruleSetVersion) return "ruleSetVersion";
  if (existing.ruleId !== generated.ruleId) return "ruleId";
  if (existing.ruleVersion !== generated.ruleVersion) return "ruleVersion";
  if (!sameTarget(existing.target, generated.target)) return "target";
  if (existing.category !== generated.category) return "category";
  if (existing.title !== generated.title) return "title";
  if (existing.recommendation !== generated.recommendation) return "recommendation";
  if (existing.rationale !== generated.rationale) return "rationale";
  if (existing.uncertainty !== generated.uncertainty) return "uncertainty";
  if (existing.restriction !== generated.restriction) return "restriction";
  if ((existing.consequence ?? "") !== generated.consequence) return "consequence";
  if (!sameStringArray(existing.readinessRequirementIds, generated.readinessRequirementIds)) return "readinessRequirementIds";
  if (!sameStringArray(existing.applicableProjectTypes, generated.applicableProjectTypes)) return "applicableProjectTypes";
  if (!sameStringArray(existing.applicableDomains, generated.applicableDomains)) return "applicableDomains";
  return null;
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

function sortExistingOnly(
  first: PlanningClarificationExistingOnlyReconciliation,
  second: PlanningClarificationExistingOnlyReconciliation
): number {
  return first.proposalKey.localeCompare(second.proposalKey) ||
    first.existingProposalId.localeCompare(second.existingProposalId);
}

function sortHistorical(
  first: PlanningClarificationHistoricalReconciliation,
  second: PlanningClarificationHistoricalReconciliation
): number {
  return first.proposalKey.localeCompare(second.proposalKey) ||
    first.existingProposalId.localeCompare(second.existingProposalId);
}

function result(
  current: readonly PlanningClarificationCurrentReconciliation[],
  existingOnly: readonly PlanningClarificationExistingOnlyReconciliation[],
  historical: readonly PlanningClarificationHistoricalReconciliation[],
  issues: readonly PlanningClarificationReconciliationIssue[]
): PlanningClarificationReconciliationResult {
  return {
    current: current.map((entry) => ({ ...entry })),
    existingOnly: existingOnly.map((entry) => ({ ...entry })),
    historical: historical.map((entry) => ({ ...entry })),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningClarificationReconciliationIssueCode,
  message: string,
  proposalKey?: string,
  existingProposalId?: string,
  field?: string,
  sourceIssueCode?: string
): PlanningClarificationReconciliationIssue {
  return dropUndefined({ code, message, proposalKey, existingProposalId, field, sourceIssueCode });
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
