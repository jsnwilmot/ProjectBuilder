import type {
  PlanningClarificationProposalBlueprint,
  PlanningClarificationSourceBlueprint
} from "./planningClarificationBlueprints";
import {
  PLANNING_RULE_SET_ID,
  PLANNING_RULE_SET_VERSION,
  PLANNING_SCHEMA_VERSION
} from "./planningProposals";
import { computeSha256Hex } from "../core/sha256Fingerprint";
import { getPlanningRuleById } from "./planningRules";

export interface PlanningClarificationFingerprintGenerationInput {
  projectId: string;
  sources: readonly PlanningClarificationSourceBlueprint[];
  proposals: readonly PlanningClarificationProposalBlueprint[];
}

export interface PlanningClarificationFingerprintRecord {
  proposalKey: string;
  fingerprintInput: string;
  fingerprint: string;
}

export type PlanningClarificationFingerprintGenerationIssueCode =
  | "invalidInput"
  | "invalidProjectId"
  | "invalidSources"
  | "invalidSource"
  | "conflictingSource"
  | "invalidProposals"
  | "invalidProposal"
  | "projectIdMismatch"
  | "unknownRule"
  | "ruleMismatch"
  | "duplicateProposalKey"
  | "invalidFingerprintInput"
  | "oversizedFingerprintInput"
  | "duplicateFingerprintInput"
  | "hashUnavailable"
  | "hashFailure"
  | "invalidFingerprint"
  | "fingerprintCollision";

export interface PlanningClarificationFingerprintGenerationIssue {
  code: PlanningClarificationFingerprintGenerationIssueCode;
  message: string;
  proposalKey?: string;
  ruleId?: string;
  sourceKey?: string;
  field?: string;
}

export interface PlanningClarificationFingerprintGenerationResult {
  fingerprints: readonly PlanningClarificationFingerprintRecord[];
  issues: readonly PlanningClarificationFingerprintGenerationIssue[];
}

const RECOMMENDATION = "Answer the clarification question and provide the applicable confirmation source.";
const CANVAS_PROJECT_TYPE = "powerAppsCanvas";
const MAX_FINGERPRINT_INPUT_LENGTH = 20_000;
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/;
const TOP_LEVEL_KEYS = [
  "schemaVersion",
  "ruleSetId",
  "ruleSetVersion",
  "projectId",
  "ruleId",
  "ruleVersion",
  "target",
  "category",
  "status",
  "value",
  "title",
  "recommendation",
  "rationale",
  "consequence",
  "sourceEvidence",
  "uncertainty",
  "restriction",
  "readinessRequirementIds",
  "applicableProjectTypes",
  "applicableDomains"
] as const;
const TARGET_KEYS = ["kind", "domain", "targetKey", "entityId", "fieldKey", "operation"] as const;
const SOURCE_EVIDENCE_KEYS = [
  "sourceKey",
  "sourceType",
  "locator",
  "label",
  "authority",
  "availability",
  "version",
  "excerpt"
] as const;
const PERSISTED_IDENTITY_FIELDS = [
  "proposalId",
  "sourceId",
  "sourceIds",
  "createdAt",
  "updatedAt",
  "observedAt",
  "decisionId",
  "lastDecisionId",
  "dependencyId",
  "conflictId"
] as const;

export async function computePlanningSha256Fingerprint(canonicalInput: string): Promise<string> {
  return computeSha256Hex(canonicalInput);
}

export async function generatePlanningClarificationFingerprints(
  input: unknown
): Promise<PlanningClarificationFingerprintGenerationResult> {
  const issues: PlanningClarificationFingerprintGenerationIssue[] = [];
  if (!isPlainObject(input)) {
    return result([], [issue("invalidInput", "Clarification fingerprint input must be an object.")]);
  }

  const projectId = validateProjectId(input.projectId, issues);
  const rawSources = validateArray(input.sources, "sources", "invalidSources", issues);
  const rawProposals = validateArray(input.proposals, "proposals", "invalidProposals", issues);
  if (!projectId || !rawSources || !rawProposals) {
    return result([], issues);
  }

  const sourceState = validateSources(rawSources, issues);
  const duplicateProposalKeys = collectDuplicateProposalKeys(rawProposals);
  const duplicateFingerprintInputKeys = collectRawDuplicateFingerprintInputs(rawProposals, issues);
  const proposalCandidates: PlanningClarificationProposalBlueprint[] = [];

  for (const rawProposal of rawProposals) {
    const proposal = validateProposal(
      rawProposal,
      projectId,
      sourceState.sourcesByKey,
      sourceState.conflictingSourceKeys,
      duplicateProposalKeys,
      issues
    );
    if (proposal) {
      if (duplicateFingerprintInputKeys.has(proposal.proposalKey)) {
        continue;
      }
      proposalCandidates.push(proposal);
    }
  }

  const sortedProposals = sortProposals(proposalCandidates);
  const duplicateInputKeys = collectDuplicateFingerprintInputs(sortedProposals, issues);
  const calculated: Array<PlanningClarificationFingerprintRecord & { validInput: string }> = [];

  for (const proposal of sortedProposals) {
    if (duplicateInputKeys.has(proposal.proposalKey)) {
      continue;
    }
    try {
      const fingerprint = await computePlanningSha256Fingerprint(proposal.fingerprintInput);
      if (!FINGERPRINT_PATTERN.test(fingerprint)) {
        issues.push(issue("invalidFingerprint", "Calculated fingerprint must be 64 lowercase hexadecimal characters.", proposal.proposalKey, proposal.ruleId, undefined, "fingerprint"));
        continue;
      }
      calculated.push({
        proposalKey: proposal.proposalKey,
        fingerprintInput: proposal.fingerprintInput,
        fingerprint,
        validInput: proposal.fingerprintInput
      });
    } catch {
      issues.push(cryptoAvailable()
        ? issue("hashFailure", "SHA-256 digest failed for the proposal fingerprint input.", proposal.proposalKey, proposal.ruleId, undefined, "fingerprintInput")
        : issue("hashUnavailable", "Web Crypto SHA-256 is unavailable.", proposal.proposalKey, proposal.ruleId, undefined, "crypto"));
    }
  }

  return result(resolveFingerprintCollisions(calculated, issues), issues);
}

function validateProjectId(
  input: unknown,
  issues: PlanningClarificationFingerprintGenerationIssue[]
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
  issues: PlanningClarificationFingerprintGenerationIssue[]
): readonly unknown[] | null {
  if (!Array.isArray(input)) {
    issues.push(issue(code, `${field} must be an array.`, undefined, undefined, undefined, field));
    return null;
  }
  return input;
}

function validateSources(
  sources: readonly unknown[],
  issues: PlanningClarificationFingerprintGenerationIssue[]
): {
  sourcesByKey: Map<string, PlanningClarificationSourceBlueprint>;
  conflictingSourceKeys: Set<string>;
} {
  const sourcesByKey = new Map<string, PlanningClarificationSourceBlueprint>();
  const semanticByKey = new Map<string, string>();
  const conflictingSourceKeys = new Set<string>();

  for (const rawSource of sources) {
    const source = validateSource(rawSource, issues);
    if (!source) {
      continue;
    }
    const semantic = sourceSemantic(source);
    const previous = semanticByKey.get(source.sourceKey);
    if (previous === undefined) {
      semanticByKey.set(source.sourceKey, semantic);
      sourcesByKey.set(source.sourceKey, cloneSource(source));
    } else if (previous !== semantic) {
      issues.push(issue("conflictingSource", "Duplicate source key has conflicting semantic content.", undefined, undefined, source.sourceKey, "sourceKey"));
      conflictingSourceKeys.add(source.sourceKey);
      sourcesByKey.delete(source.sourceKey);
    }
  }

  return { sourcesByKey, conflictingSourceKeys };
}

function validateSource(
  input: unknown,
  issues: PlanningClarificationFingerprintGenerationIssue[]
): PlanningClarificationSourceBlueprint | null {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidSource", "Source blueprint must be an object.", undefined, undefined, undefined, "sources"));
    return null;
  }
  const sourceKey = typeof input.sourceKey === "string" ? input.sourceKey : undefined;
  if (
    (input.sourceType !== "projectRule" && input.sourceType !== "readinessPrerequisite") ||
    input.authority !== "approved" ||
    input.availability !== "current" ||
    !isBoundedSingleLine(input.sourceKey, 300) ||
    !isBoundedSingleLine(input.locator, 500) ||
    !isBoundedPlainText(input.label, 500) ||
    (input.version !== undefined && !isBoundedSingleLine(input.version, 128)) ||
    (input.excerpt !== undefined && !isBoundedPlainText(input.excerpt, 500))
  ) {
    issues.push(issue("invalidSource", "Source blueprint must match the approved bounded current source contract.", undefined, undefined, sourceKey, "source"));
    return null;
  }
  return {
    sourceKey: input.sourceKey,
    sourceType: input.sourceType,
    locator: input.locator,
    label: input.label,
    authority: input.authority,
    availability: input.availability,
    ...(input.version === undefined ? {} : { version: input.version }),
    ...(input.excerpt === undefined ? {} : { excerpt: input.excerpt })
  };
}

function validateProposal(
  input: unknown,
  projectId: string,
  sourcesByKey: ReadonlyMap<string, PlanningClarificationSourceBlueprint>,
  conflictingSourceKeys: ReadonlySet<string>,
  duplicateProposalKeys: ReadonlySet<string>,
  issues: PlanningClarificationFingerprintGenerationIssue[]
): PlanningClarificationProposalBlueprint | null {
  if (!isPlainObject(input)) {
    issues.push(issue("invalidProposal", "Proposal blueprint must be an object.", undefined, undefined, undefined, "proposals"));
    return null;
  }

  const proposalKey = typeof input.proposalKey === "string" ? input.proposalKey : undefined;
  const ruleId = typeof input.ruleId === "string" ? input.ruleId : undefined;
  if (input.projectId !== projectId) {
    issues.push(issue("projectIdMismatch", "Proposal project ID must exactly match the generation input project ID.", proposalKey, ruleId, undefined, "projectId"));
    return null;
  }
  if (proposalKey && duplicateProposalKeys.has(proposalKey)) {
    issues.push(issue("duplicateProposalKey", "Proposal key must be unique.", proposalKey, ruleId, undefined, "proposalKey"));
    return null;
  }
  if (!isBoundedSingleLine(proposalKey, 300)) {
    issues.push(issue("invalidProposal", "Proposal key must be a valid bounded single-line key.", proposalKey, ruleId, undefined, "proposalKey"));
    return null;
  }

  for (const field of PERSISTED_IDENTITY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      issues.push(issue("invalidProposal", "Persisted identity metadata is not accepted by the fingerprint generator.", proposalKey, ruleId, undefined, field));
      return null;
    }
  }

  if (!ruleId) {
    issues.push(issue("unknownRule", "Proposal must reference an active clarification rule.", proposalKey, undefined, undefined, "ruleId"));
    return null;
  }
  const rule = getPlanningRuleById(ruleId);
  if (!rule || rule.status !== "active") {
    issues.push(issue("unknownRule", "Proposal must reference an active clarification rule.", proposalKey, ruleId, undefined, "ruleId"));
    return null;
  }

  const targetKey = isPlainObject(input.target) && typeof input.target.targetKey === "string" ? input.target.targetKey : "";
  const expectedProposalKey = `clarification|${rule.ruleId}|${rule.target.targetKey}`;
  const expectedProjectRuleSourceKey = `projectRule|${rule.ruleId}|${rule.ruleVersion}`;
  const expectedReadinessSourceKey = `readinessPrerequisite|${rule.target.targetKey}`;
  const expectedSourceKeys = [expectedProjectRuleSourceKey, expectedReadinessSourceKey];

  const mismatchField = findProposalMismatch(input, rule, projectId, expectedProposalKey, expectedSourceKeys);
  if (mismatchField) {
    issues.push(issue(mismatchField === "ruleId" ? "unknownRule" : "ruleMismatch", "Proposal blueprint must exactly match the active clarification rule and Phase 5C.2.1C contract.", proposalKey, ruleId, undefined, mismatchField));
    return null;
  }

  if (targetKey !== rule.target.targetKey) {
    issues.push(issue("ruleMismatch", "Proposal target gate must match the active clarification rule.", proposalKey, ruleId, undefined, "target"));
    return null;
  }

  if (conflictingSourceKeys.has(expectedProjectRuleSourceKey) || conflictingSourceKeys.has(expectedReadinessSourceKey)) {
    issues.push(issue("conflictingSource", "Proposal references a conflicting source blueprint key.", proposalKey, ruleId, conflictingSourceKeys.has(expectedProjectRuleSourceKey) ? expectedProjectRuleSourceKey : expectedReadinessSourceKey, "sourceKeys"));
    return null;
  }

  const sourceBlueprints = expectedSourceKeys.map((sourceKey) => sourcesByKey.get(sourceKey));
  if (!sourceBlueprints.every(Boolean)) {
    issues.push(issue("invalidProposal", "Proposal source keys must reference supplied valid source blueprints.", proposalKey, ruleId, undefined, "sourceKeys"));
    return null;
  }

  const fingerprintInput = input.fingerprintInput;
  if (typeof fingerprintInput !== "string" || fingerprintInput.length === 0) {
    issues.push(issue("invalidFingerprintInput", "Canonical fingerprint input must be a non-empty string.", proposalKey, ruleId, undefined, "fingerprintInput"));
    return null;
  }
  if (fingerprintInput.length > MAX_FINGERPRINT_INPUT_LENGTH) {
    issues.push(issue("oversizedFingerprintInput", "Canonical fingerprint input exceeds the approved maximum size.", proposalKey, ruleId, undefined, "fingerprintInput"));
    return null;
  }

  const proposal = input as unknown as PlanningClarificationProposalBlueprint;
  if (!validateCanonicalFingerprintInput(proposal, sourceBlueprints as PlanningClarificationSourceBlueprint[], issues)) {
    return null;
  }
  return cloneProposal(proposal);
}

function findProposalMismatch(
  input: Record<string, unknown>,
  rule: NonNullable<ReturnType<typeof getPlanningRuleById>>,
  projectId: string,
  expectedProposalKey: string,
  expectedSourceKeys: readonly string[]
): string | null {
  if (input.proposalKey !== expectedProposalKey) return "proposalKey";
  if (input.ruleSetId !== PLANNING_RULE_SET_ID) return "ruleSetId";
  if (input.ruleSetVersion !== PLANNING_RULE_SET_VERSION) return "ruleSetVersion";
  if (input.ruleId !== rule.ruleId) return "ruleId";
  if (input.ruleVersion !== rule.ruleVersion) return "ruleVersion";
  if (!sameTarget(input.target, rule.target)) return "target";
  if (input.category !== "clarification") return "category";
  if (input.status !== "Needs Clarification") return "status";
  if (!isPlainObject(input.value) || input.value.kind !== "clarification" || input.value.question !== rule.question) return "value";
  if (input.title !== rule.title) return "title";
  if (input.recommendation !== RECOMMENDATION) return "recommendation";
  if (input.rationale !== rule.rationale) return "rationale";
  if (input.uncertainty !== rule.uncertainty) return "uncertainty";
  if (input.restriction !== rule.restriction) return "restriction";
  if (input.consequence !== rule.consequence) return "consequence";
  if (!sameStringArray(input.sourceKeys, expectedSourceKeys)) return "sourceKeys";
  if (!sameStringArray(input.readinessRequirementIds, [rule.target.targetKey])) return "readinessRequirementIds";
  if (!sameStringArray(input.applicableProjectTypes, [CANVAS_PROJECT_TYPE])) return "applicableProjectTypes";
  if (!sameStringArray(input.applicableDomains, [rule.target.domain])) return "applicableDomains";
  if (input.projectId !== projectId) return "projectId";
  return null;
}

function validateCanonicalFingerprintInput(
  proposal: PlanningClarificationProposalBlueprint,
  sourceBlueprints: readonly PlanningClarificationSourceBlueprint[],
  issues: PlanningClarificationFingerprintGenerationIssue[]
): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(proposal.fingerprintInput);
  } catch {
    issues.push(issue("invalidFingerprintInput", "Canonical fingerprint input must be valid JSON.", proposal.proposalKey, proposal.ruleId, undefined, "fingerprintInput"));
    return false;
  }
  if (!isPlainObject(parsed) || JSON.stringify(parsed) !== proposal.fingerprintInput) {
    issues.push(issue("invalidFingerprintInput", "Canonical fingerprint input must be compact JSON with exact serialization.", proposal.proposalKey, proposal.ruleId, undefined, "fingerprintInput"));
    return false;
  }
  if (!sameStringArray(Object.keys(parsed), TOP_LEVEL_KEYS)) {
    issues.push(issue("invalidFingerprintInput", "Canonical fingerprint input top-level property order is invalid.", proposal.proposalKey, proposal.ruleId, undefined, "fingerprintInput"));
    return false;
  }

  if (
    parsed.schemaVersion !== PLANNING_SCHEMA_VERSION ||
    parsed.ruleSetId !== proposal.ruleSetId ||
    parsed.ruleSetVersion !== proposal.ruleSetVersion ||
    parsed.projectId !== proposal.projectId ||
    parsed.ruleId !== proposal.ruleId ||
    parsed.ruleVersion !== proposal.ruleVersion ||
    parsed.category !== proposal.category ||
    parsed.status !== proposal.status ||
    !samePlainValue(parsed.value, proposal.value) ||
    parsed.title !== proposal.title ||
    parsed.recommendation !== proposal.recommendation ||
    parsed.rationale !== proposal.rationale ||
    parsed.consequence !== proposal.consequence ||
    parsed.uncertainty !== proposal.uncertainty ||
    parsed.restriction !== proposal.restriction ||
    !sameStringArray(parsed.readinessRequirementIds, proposal.readinessRequirementIds) ||
    !sameStringArray(parsed.applicableProjectTypes, proposal.applicableProjectTypes) ||
    !sameStringArray(parsed.applicableDomains, proposal.applicableDomains)
  ) {
    issues.push(issue("invalidFingerprintInput", "Canonical fingerprint input semantics must exactly match the proposal blueprint.", proposal.proposalKey, proposal.ruleId, undefined, "fingerprintInput"));
    return false;
  }

  if (!isPlainObject(parsed.target) || !sameStringArray(Object.keys(parsed.target), TARGET_KEYS)) {
    issues.push(issue("invalidFingerprintInput", "Canonical fingerprint input target property order is invalid.", proposal.proposalKey, proposal.ruleId, undefined, "target"));
    return false;
  }
  if (
    parsed.target.kind !== proposal.target.kind ||
    parsed.target.domain !== proposal.target.domain ||
    parsed.target.targetKey !== proposal.target.targetKey ||
    parsed.target.entityId !== (proposal.target.entityId ?? null) ||
    parsed.target.fieldKey !== (proposal.target.fieldKey ?? null) ||
    parsed.target.operation !== proposal.target.operation
  ) {
    issues.push(issue("invalidFingerprintInput", "Canonical fingerprint input target must exactly match the proposal blueprint.", proposal.proposalKey, proposal.ruleId, undefined, "target"));
    return false;
  }

  return validateSourceEvidence(proposal, parsed.sourceEvidence, sourceBlueprints, issues);
}

function validateSourceEvidence(
  proposal: PlanningClarificationProposalBlueprint,
  input: unknown,
  sourceBlueprints: readonly PlanningClarificationSourceBlueprint[],
  issues: PlanningClarificationFingerprintGenerationIssue[]
): boolean {
  if (!Array.isArray(input) || input.length !== sourceBlueprints.length) {
    issues.push(issue("invalidFingerprintInput", "Canonical source evidence must contain exactly the proposal sources.", proposal.proposalKey, proposal.ruleId, undefined, "sourceEvidence"));
    return false;
  }
  const sortedSources = [...sourceBlueprints].sort((first, second) => first.sourceKey.localeCompare(second.sourceKey));
  for (const [index, source] of sortedSources.entries()) {
    const evidence = input[index];
    if (!isPlainObject(evidence) || !sameStringArray(Object.keys(evidence), SOURCE_EVIDENCE_KEYS)) {
      issues.push(issue("invalidFingerprintInput", "Canonical source evidence property order is invalid.", proposal.proposalKey, proposal.ruleId, source.sourceKey, "sourceEvidence"));
      return false;
    }
    if (
      evidence.sourceKey !== source.sourceKey ||
      evidence.sourceType !== source.sourceType ||
      evidence.locator !== source.locator ||
      evidence.label !== source.label ||
      evidence.authority !== source.authority ||
      evidence.availability !== source.availability ||
      evidence.version !== (source.version ?? null) ||
      evidence.excerpt !== (source.excerpt ?? null)
    ) {
      issues.push(issue("invalidFingerprintInput", "Canonical source evidence must exactly match supplied source blueprints.", proposal.proposalKey, proposal.ruleId, source.sourceKey, "sourceEvidence"));
      return false;
    }
  }
  return true;
}

function collectDuplicateProposalKeys(proposals: readonly unknown[]): Set<string> {
  const counts = new Map<string, number>();
  for (const proposal of proposals) {
    if (isPlainObject(proposal) && typeof proposal.proposalKey === "string") {
      counts.set(proposal.proposalKey, (counts.get(proposal.proposalKey) ?? 0) + 1);
    }
  }
  return new Set([...counts].filter(([, count]) => count > 1).map(([proposalKey]) => proposalKey));
}

function collectDuplicateFingerprintInputs(
  proposals: readonly PlanningClarificationProposalBlueprint[],
  issues: PlanningClarificationFingerprintGenerationIssue[]
): Set<string> {
  const byInput = new Map<string, PlanningClarificationProposalBlueprint[]>();
  for (const proposal of proposals) {
    byInput.set(proposal.fingerprintInput, [...(byInput.get(proposal.fingerprintInput) ?? []), proposal]);
  }
  const duplicatedKeys = new Set<string>();
  for (const group of byInput.values()) {
    const uniqueKeys = new Set(group.map((proposal) => proposal.proposalKey));
    if (uniqueKeys.size > 1) {
      for (const proposal of group) {
        duplicatedKeys.add(proposal.proposalKey);
        issues.push(issue("duplicateFingerprintInput", "Different proposal keys must not share the same canonical fingerprint input.", proposal.proposalKey, proposal.ruleId, undefined, "fingerprintInput"));
      }
    }
  }
  return duplicatedKeys;
}

function collectRawDuplicateFingerprintInputs(
  proposals: readonly unknown[],
  issues: PlanningClarificationFingerprintGenerationIssue[]
): Set<string> {
  const byInput = new Map<string, Array<{ proposalKey: string; ruleId?: string }>>();
  for (const proposal of proposals) {
    if (
      isPlainObject(proposal) &&
      typeof proposal.proposalKey === "string" &&
      typeof proposal.fingerprintInput === "string"
    ) {
      byInput.set(proposal.fingerprintInput, [
        ...(byInput.get(proposal.fingerprintInput) ?? []),
        {
          proposalKey: proposal.proposalKey,
          ...(typeof proposal.ruleId === "string" ? { ruleId: proposal.ruleId } : {})
        }
      ]);
    }
  }
  const duplicatedKeys = new Set<string>();
  for (const group of byInput.values()) {
    const uniqueKeys = new Set(group.map((entry) => entry.proposalKey));
    if (uniqueKeys.size > 1) {
      for (const entry of group) {
        duplicatedKeys.add(entry.proposalKey);
        issues.push(issue("duplicateFingerprintInput", "Different proposal keys must not share the same canonical fingerprint input.", entry.proposalKey, entry.ruleId, undefined, "fingerprintInput"));
      }
    }
  }
  return duplicatedKeys;
}

function resolveFingerprintCollisions(
  calculated: ReadonlyArray<PlanningClarificationFingerprintRecord & { validInput: string }>,
  issues: PlanningClarificationFingerprintGenerationIssue[]
): PlanningClarificationFingerprintRecord[] {
  const byFingerprint = new Map<string, Array<PlanningClarificationFingerprintRecord & { validInput: string }>>();
  for (const record of calculated) {
    byFingerprint.set(record.fingerprint, [...(byFingerprint.get(record.fingerprint) ?? []), record]);
  }
  const collidedKeys = new Set<string>();
  for (const group of byFingerprint.values()) {
    const uniqueInputs = new Set(group.map((record) => record.validInput));
    if (uniqueInputs.size > 1) {
      for (const record of group) {
        collidedKeys.add(record.proposalKey);
        issues.push(issue("fingerprintCollision", "Different canonical inputs produced the same SHA-256 fingerprint.", record.proposalKey, undefined, undefined, "fingerprint"));
      }
    }
  }
  return calculated
    .filter((record) => !collidedKeys.has(record.proposalKey))
    .map(({ proposalKey, fingerprintInput, fingerprint }) => ({ proposalKey, fingerprintInput, fingerprint }));
}

function sortProposals(proposals: readonly PlanningClarificationProposalBlueprint[]): PlanningClarificationProposalBlueprint[] {
  return [...proposals].sort((first, second) => {
    const firstRule = getPlanningRuleById(first.ruleId);
    const secondRule = getPlanningRuleById(second.ruleId);
    return (firstRule?.priority ?? 0) - (secondRule?.priority ?? 0) || first.ruleId.localeCompare(second.ruleId);
  });
}

function sameTarget(input: unknown, target: NonNullable<ReturnType<typeof getPlanningRuleById>>["target"]): boolean {
  if (!isPlainObject(input)) return false;
  return (
    input.kind === target.kind &&
    input.domain === target.domain &&
    input.targetKey === target.targetKey &&
    input.entityId === target.entityId &&
    input.fieldKey === target.fieldKey &&
    input.operation === target.operation
  );
}

function sameStringArray(input: unknown, expected: readonly string[]): boolean {
  return Array.isArray(input) && input.length === expected.length && input.every((entry, index) => entry === expected[index]);
}

function samePlainValue(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function sourceSemantic(source: PlanningClarificationSourceBlueprint): string {
  return JSON.stringify({
    sourceKey: source.sourceKey,
    sourceType: source.sourceType,
    locator: source.locator,
    label: source.label,
    authority: source.authority,
    availability: source.availability,
    version: source.version ?? null,
    excerpt: source.excerpt ?? null
  });
}

function cloneSource(source: PlanningClarificationSourceBlueprint): PlanningClarificationSourceBlueprint {
  return { ...source };
}

function cloneProposal(proposal: PlanningClarificationProposalBlueprint): PlanningClarificationProposalBlueprint {
  return {
    ...proposal,
    target: { ...proposal.target },
    value: { ...proposal.value },
    sourceKeys: [...proposal.sourceKeys],
    readinessRequirementIds: [...proposal.readinessRequirementIds],
    applicableProjectTypes: [...proposal.applicableProjectTypes],
    applicableDomains: [...proposal.applicableDomains]
  };
}

function result(
  fingerprints: readonly PlanningClarificationFingerprintRecord[],
  issues: readonly PlanningClarificationFingerprintGenerationIssue[]
): PlanningClarificationFingerprintGenerationResult {
  return {
    fingerprints: fingerprints.map((record) => ({ ...record })),
    issues: issues.map((entry) => ({ ...entry }))
  };
}

function issue(
  code: PlanningClarificationFingerprintGenerationIssueCode,
  message: string,
  proposalKey?: string,
  ruleId?: string,
  sourceKey?: string,
  field?: string
): PlanningClarificationFingerprintGenerationIssue {
  return dropUndefined({ code, message, proposalKey, ruleId, sourceKey, field });
}

function cryptoAvailable(): boolean {
  return Boolean(globalThis.crypto?.subtle?.digest);
}

function isBoundedSingleLine(input: unknown, limit: number): input is string {
  return typeof input === "string" && input.length > 0 && input.length <= limit && !/[\r\n]/.test(input) && isSafeText(input);
}

function isBoundedPlainText(input: unknown, limit: number): input is string {
  return typeof input === "string" && input.trim().length > 0 && input.length <= limit && isSafeText(input);
}

function isSafeText(value: string): boolean {
  const lower = value.toLowerCase();
  if (/<\s*script\b/.test(lower) || /javascript\s*:/.test(lower) || /\son[a-z]+\s*=/.test(lower)) {
    return false;
  }
  if (/^\s*(function\s+\w*|\(?\s*[\w,\s]*\)?\s*=>|class\s+\w+|import\s+.+\s+from\s+|export\s+)/m.test(value)) {
    return false;
  }
  if (/^\s*(set|collect|patch|submitform|navigate|remove|updatecontext)\s*\(/im.test(value)) {
    return false;
  }
  if (/^\s*(screens?|controls?|properties?|items?|onselect):\s*$/im.test(value)) {
    return false;
  }
  if (/^\s*[\w.-]+\s*:\s*[\w[{]/m.test(value) && /(?:\n\s+[\w.-]+\s*:|\n\s*-\s+)/.test(value)) {
    return false;
  }
  return true;
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
