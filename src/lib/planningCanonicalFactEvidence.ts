import type { ProjectRecord } from "../types/project";
import { isSha256Hex } from "../core/sha256Fingerprint";
import { validatePlanningClarificationAnswer } from "./planningClarificationAnswerSchema";
import {
  buildPlanningClarificationAnswerSchemaContext,
  resolveProductionPlanningClarificationAnswerSchema
} from "./planningClarificationAnswerSchemaResolver";
import { buildPlanningUserAnswerLocator } from "./planningClarificationDecisionContract";
import { computePlanningSha256Fingerprint } from "./planningClarificationFingerprints";
import {
  analyzePlanningClarificationReadinessEvidence,
  type PlanningClarificationReadinessEvidenceAssessment,
  type PlanningClarificationReadinessEvidenceReasonCode
} from "./planningClarificationReadinessEvidence";
import {
  createEmptyProjectPlanningState,
  normalizeProjectPlanningState,
  type PlanningProposalRecord,
  type ProjectPlanningState
} from "./planningProposals";
import type { PlanningCanonicalFactEvidenceBinding } from "./planningReadinessMappingContract";
import {
  getProductionPlanningReadinessMapping,
  getProductionPlanningReadinessMappings
} from "./planningReadinessMappingRegistry";
import { getPlanningRuleById } from "./planningRules";

export const PLANNING_CANONICAL_FACT_EVIDENCE_VERSION = "phase-5c.3c.3j.6a";
export const PLANNING_CANONICAL_FACT_SERIALIZATION_VERSION = "canonical-text-json-v1";
export const PLANNING_CANONICAL_FACT_FINGERPRINT_VERSION = "sha256-v1";

export type PlanningCanonicalFactEvidenceReasonCode =
  | "unsupportedProjectType"
  | "bindingNotRegistered"
  | "planningInvalid"
  | "ruleMismatch"
  | "ruleVersionMismatch"
  | "schemaInvalid"
  | "proposalNotCurrent"
  | "proposalFingerprintInvalid"
  | "proposalStale"
  | "proposalSuperseded"
  | "proposalNotApplicable"
  | "confirmationMissing"
  | "confirmedSourceMissing"
  | "sourceAuthorityInvalid"
  | "sourceUnavailable"
  | "sourceLineageInvalid"
  | "answerFieldMissing"
  | "answerFieldInvalid"
  | "fingerprintFailure"
  | "conflictBlocksEvidence";

export interface PlanningCanonicalFactEvidenceCandidate {
  projectId: string;
  mappingId: string;
  mappingVersion: "1.0.0";
  ruleId: string;
  ruleVersion: "1.0.0";
  proposalId: string;
  proposalFingerprint: string;
  decisionId: string;
  confirmedSourceId: string;
  answerFieldKey: string;
  canonicalDestinationPath: "powerPlatform.canvas.validationResponsibility";
  destinationShape: "projectGlobalScalar";
  extractionKind: "directStructuredRecordField";
  sourceType: "userAnswer";
  sourceAuthority: "confirmed";
  sourceAvailability: "current";
  canonicalSerializationVersion: typeof PLANNING_CANONICAL_FACT_SERIALIZATION_VERSION;
  fingerprintVersion: typeof PLANNING_CANONICAL_FACT_FINGERPRINT_VERSION;
  valueFingerprint: string;
  normalizedValue: string;
  readinessAuthorized: false;
  projectionAuthorized: false;
  applyAuthorized: false;
}

interface PlanningCanonicalFactEvidenceResultBase {
  version: typeof PLANNING_CANONICAL_FACT_EVIDENCE_VERSION;
  projectId: string;
  readinessAuthorized: false;
  projectionAuthorized: false;
  applyAuthorized: false;
}

export interface PlanningCanonicalFactEvidenceCandidateResult
  extends PlanningCanonicalFactEvidenceResultBase {
  outcome: "candidate";
  candidates: readonly [PlanningCanonicalFactEvidenceCandidate];
  reasonCodes: readonly [];
}

export interface PlanningCanonicalFactEvidenceNoCandidateResult
  extends PlanningCanonicalFactEvidenceResultBase {
  outcome: "noCandidate";
  candidates: readonly [];
  reasonCodes: readonly [PlanningCanonicalFactEvidenceReasonCode];
}

export type PlanningCanonicalFactEvidenceResult =
  | PlanningCanonicalFactEvidenceCandidateResult
  | PlanningCanonicalFactEvidenceNoCandidateResult;

const YAML_RULE_ID = "pp.canvas.yamlplanning.confirmation";
const YAML_RULE_VERSION = "1.0.0";
export async function derivePlanningCanonicalFactEvidenceCandidates(
  project: ProjectRecord
): Promise<PlanningCanonicalFactEvidenceResult> {
  const projectId = project.identity.id;
  if (project.intake.appType !== "powerAppsCanvas") {
    return noCandidate(projectId, "unsupportedProjectType");
  }

  const mapping = getProductionPlanningReadinessMapping(YAML_RULE_ID);
  const binding = selectApprovedBinding(mapping?.canonicalFactEvidenceBindings);
  if (!mapping || !binding) {
    return noCandidate(projectId, "bindingNotRegistered");
  }
  if (hasDestinationBindingConflict(binding)) {
    return noCandidate(projectId, "conflictBlocksEvidence");
  }

  const rule = getPlanningRuleById(binding.ruleId);
  if (!rule) return noCandidate(projectId, "ruleMismatch");
  if (rule.ruleVersion !== binding.ruleVersion) {
    return noCandidate(projectId, "ruleVersionMismatch");
  }

  const normalized = normalizeProjectPlanningState(
    project.planning ?? createEmptyProjectPlanningState(),
    projectId
  );
  if (normalized.issues.length > 0) {
    return noCandidate(projectId, "planningInvalid");
  }

  const readiness = await analyzePlanningClarificationReadinessEvidence(project);
  if (readiness.outcome !== "analyzed") {
    return noCandidate(
      projectId,
      readiness.outcome === "unsupportedProjectType" ? "unsupportedProjectType" : "planningInvalid"
    );
  }

  const assessment = readiness.assessments.find((entry) => entry.ruleId === binding.ruleId);
  if (!assessment || assessment.disposition !== "validatedCandidate") {
    return noCandidate(
      projectId,
      classifyReadinessFailure(normalized.planning, assessment, binding)
    );
  }

  const proposal = normalized.planning.proposals.find(
    (entry) => entry.proposalId === assessment.proposalId
  );
  if (!proposal) return noCandidate(projectId, "proposalNotCurrent");
  if (proposal.ruleId !== binding.ruleId) return noCandidate(projectId, "ruleMismatch");
  if (proposal.ruleVersion !== binding.ruleVersion) return noCandidate(projectId, "ruleVersionMismatch");

  const source = normalized.planning.sources.find(
    (entry) => entry.sourceId === assessment.confirmedSourceId
  );
  if (!source) return noCandidate(projectId, "confirmedSourceMissing");
  if (source.sourceType !== binding.requiredSourceType || source.authority !== binding.requiredSourceAuthority) {
    return noCandidate(projectId, "sourceAuthorityInvalid");
  }
  if (source.availability !== binding.requiredSourceAvailability) {
    return noCandidate(projectId, "sourceUnavailable");
  }

  const decision = normalized.planning.decisions.find(
    (entry) => entry.decisionId === assessment.confirmationDecisionId
  );
  if (!decision) return noCandidate(projectId, "confirmationMissing");
  if (
    proposal.lastDecisionId !== decision.decisionId ||
    !proposal.sourceIds.includes(source.sourceId) ||
    !decision.sourceIds?.includes(source.sourceId) ||
    source.locator !== buildPlanningUserAnswerLocator(proposal.proposalId, decision.decisionId)
  ) {
    return noCandidate(projectId, "sourceLineageInvalid");
  }

  const schemaResolution = resolveProductionPlanningClarificationAnswerSchema(
    binding.ruleId,
    binding.ruleVersion,
    buildPlanningClarificationAnswerSchemaContext(project)
  );
  if (schemaResolution.state !== "available" || schemaResolution.schema.kind !== "structuredRecord") {
    return noCandidate(projectId, "schemaInvalid");
  }
  const schemaField = schemaResolution.schema.fields.find(
    (field) => field.key === binding.answerFieldKey
  );
  if (!schemaField || schemaField.schema.kind !== binding.scalarKind) {
    return noCandidate(projectId, "answerFieldInvalid");
  }

  const validation = validatePlanningClarificationAnswer(schemaResolution.schema, proposal.value);
  if (validation.outcome !== "valid" || validation.answer.kind !== "structuredRecord") {
    return noCandidate(
      projectId,
      classifyAnswerFailure(proposal, binding.answerFieldKey)
    );
  }
  const fieldValue = validation.answer.value[binding.answerFieldKey];
  if (!fieldValue) return noCandidate(projectId, "answerFieldMissing");
  if (fieldValue.kind !== "text") return noCandidate(projectId, "answerFieldInvalid");

  const canonicalValue = serializePlanningCanonicalFactTextValue(fieldValue.value);
  let valueFingerprint: string;
  try {
    valueFingerprint = await computePlanningSha256Fingerprint(canonicalValue);
  } catch {
    return noCandidate(projectId, "fingerprintFailure");
  }
  if (!isSha256Hex(valueFingerprint)) {
    return noCandidate(projectId, "fingerprintFailure");
  }

  return candidateResult(projectId, {
    projectId,
    mappingId: binding.mappingId,
    mappingVersion: binding.mappingVersion,
    ruleId: binding.ruleId,
    ruleVersion: binding.ruleVersion,
    proposalId: proposal.proposalId,
    proposalFingerprint: assessment.fingerprint,
    decisionId: decision.decisionId,
    confirmedSourceId: source.sourceId,
    answerFieldKey: binding.answerFieldKey,
    canonicalDestinationPath: binding.canonicalDestinationPath,
    destinationShape: binding.destinationShape,
    extractionKind: binding.extractionKind,
    sourceType: source.sourceType,
    sourceAuthority: source.authority,
    sourceAvailability: source.availability,
    canonicalSerializationVersion: PLANNING_CANONICAL_FACT_SERIALIZATION_VERSION,
    fingerprintVersion: PLANNING_CANONICAL_FACT_FINGERPRINT_VERSION,
    valueFingerprint,
    normalizedValue: fieldValue.value,
    readinessAuthorized: false,
    projectionAuthorized: false,
    applyAuthorized: false
  });
}

export function serializePlanningCanonicalFactTextValue(value: string): string {
  return JSON.stringify({
    version: PLANNING_CANONICAL_FACT_SERIALIZATION_VERSION,
    kind: "text",
    value
  });
}

function selectApprovedBinding(
  bindings: readonly PlanningCanonicalFactEvidenceBinding[] | undefined
): PlanningCanonicalFactEvidenceBinding | null {
  if (!bindings || bindings.length !== 1) return null;
  const binding = bindings[0];
  return binding.mappingId === "planning-map.pp.canvas.yamlplanning.confirmation" &&
    binding.mappingVersion === "1.0.0" &&
    binding.ruleId === YAML_RULE_ID &&
    binding.ruleVersion === YAML_RULE_VERSION &&
    binding.answerFieldKey === "validationResponsibility" &&
    binding.canonicalDestinationPath === "powerPlatform.canvas.validationResponsibility" &&
    binding.destinationShape === "projectGlobalScalar" &&
    binding.requiredSourceType === "userAnswer" &&
    binding.requiredSourceAuthority === "confirmed" &&
    binding.requiredSourceAvailability === "current" &&
    binding.extractionKind === "directStructuredRecordField" &&
    binding.scalarKind === "text"
    ? binding
    : null;
}

function hasDestinationBindingConflict(binding: PlanningCanonicalFactEvidenceBinding): boolean {
  const matches = getProductionPlanningReadinessMappings().flatMap(
    (mapping) => mapping.canonicalFactEvidenceBindings
  ).filter((candidate) => candidate.canonicalDestinationPath === binding.canonicalDestinationPath);
  return matches.length !== 1;
}

function classifyReadinessFailure(
  planning: ProjectPlanningState,
  assessment: PlanningClarificationReadinessEvidenceAssessment | undefined,
  binding: PlanningCanonicalFactEvidenceBinding
): PlanningCanonicalFactEvidenceReasonCode {
  const proposal = assessment?.proposalId
    ? planning.proposals.find((entry) => entry.proposalId === assessment.proposalId)
    : findRelevantProposal(planning, binding);
  if (!proposal) {
    const wrongRule = planning.proposals.find((entry) =>
      entry.target.kind === "readinessRequirement" && entry.target.targetKey === "yaml"
    );
    if (wrongRule?.ruleId !== binding.ruleId) return "ruleMismatch";
    return "proposalNotCurrent";
  }
  if (proposal.ruleId !== binding.ruleId) return "ruleMismatch";
  if (proposal.ruleVersion !== binding.ruleVersion) return "ruleVersionMismatch";
  if (proposal.status === "Stale" || proposal.staleReason || proposal.staleAt) return "proposalStale";
  if (proposal.status === "Superseded" || proposal.supersededByProposalId) return "proposalSuperseded";
  if (proposal.status === "Not Applicable") return "proposalNotApplicable";

  if (assessment?.disposition === "blocked" || assessment?.disposition === "notCandidate") {
    if (assessment.reason === "blockingConflict") return "conflictBlocksEvidence";
    if (assessment.reason === "fingerprintMismatch") return "proposalFingerprintInvalid";
    if (assessment.reason === "confirmedAnswerInvalid" || assessment.reason === "answerSchemaUnavailable") {
      return classifyAnswerFailure(proposal, binding.answerFieldKey);
    }
    if (assessment.reason === "confirmedSourceInvalid") {
      return classifySourceFailure(planning, proposal);
    }
    if (assessment.reason === "confirmationDecisionInvalid") return "confirmationMissing";
    if (assessment.reason === "proposalNotConfirmed") return "confirmationMissing";
  }
  return mapReadinessReason(assessment && assessment.disposition !== "validatedCandidate" ? assessment.reason : undefined);
}

function findRelevantProposal(
  planning: ProjectPlanningState,
  binding: PlanningCanonicalFactEvidenceBinding
): PlanningProposalRecord | undefined {
  return planning.proposals.find((entry) => entry.ruleId === binding.ruleId) ??
    planning.proposals.find((entry) =>
      entry.target.kind === "readinessRequirement" && entry.target.targetKey === "yaml"
    );
}

function classifySourceFailure(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningCanonicalFactEvidenceReasonCode {
  const attached = proposal.sourceIds.flatMap((sourceId) =>
    planning.sources.filter((source) => source.sourceId === sourceId)
  );
  const userAnswers = attached.filter((source) => source.sourceType === "userAnswer");
  if (userAnswers.length === 0) return "confirmedSourceMissing";
  const confirmed = userAnswers.filter((source) => source.authority === "confirmed");
  if (confirmed.length === 0) return "sourceAuthorityInvalid";
  const current = confirmed.filter((source) => source.availability === "current");
  if (current.length === 0) return "sourceUnavailable";
  if (current.length !== 1 || !proposal.lastDecisionId) return "sourceLineageInvalid";
  const decision = planning.decisions.find((entry) => entry.decisionId === proposal.lastDecisionId);
  if (!decision) return "confirmationMissing";
  return current[0].locator === buildPlanningUserAnswerLocator(proposal.proposalId, decision.decisionId)
    ? "confirmedSourceMissing"
    : "sourceLineageInvalid";
}

function classifyAnswerFailure(
  proposal: PlanningProposalRecord,
  fieldKey: string
): PlanningCanonicalFactEvidenceReasonCode {
  if (proposal.value.kind !== "structuredRecord") return "schemaInvalid";
  const value = proposal.value.value[fieldKey];
  if (!value) return "answerFieldMissing";
  return value.kind === "text" ? "schemaInvalid" : "answerFieldInvalid";
}

function mapReadinessReason(
  reason: PlanningClarificationReadinessEvidenceReasonCode | undefined
): PlanningCanonicalFactEvidenceReasonCode {
  switch (reason) {
    case "unsupportedProjectType": return "unsupportedProjectType";
    case "blockingConflict": return "conflictBlocksEvidence";
    case "fingerprintMismatch": return "proposalFingerprintInvalid";
    case "confirmedAnswerInvalid":
    case "answerSchemaUnavailable": return "schemaInvalid";
    case "confirmedSourceInvalid": return "confirmedSourceMissing";
    case "confirmationDecisionInvalid":
    case "proposalNotConfirmed": return "confirmationMissing";
    default: return "proposalNotCurrent";
  }
}

function candidateResult(
  projectId: string,
  candidate: PlanningCanonicalFactEvidenceCandidate
): PlanningCanonicalFactEvidenceCandidateResult {
  return {
    version: PLANNING_CANONICAL_FACT_EVIDENCE_VERSION,
    outcome: "candidate",
    projectId,
    readinessAuthorized: false,
    projectionAuthorized: false,
    applyAuthorized: false,
    candidates: [candidate],
    reasonCodes: []
  };
}

function noCandidate(
  projectId: string,
  reason: PlanningCanonicalFactEvidenceReasonCode
): PlanningCanonicalFactEvidenceNoCandidateResult {
  return {
    version: PLANNING_CANONICAL_FACT_EVIDENCE_VERSION,
    outcome: "noCandidate",
    projectId,
    readinessAuthorized: false,
    projectionAuthorized: false,
    applyAuthorized: false,
    candidates: [],
    reasonCodes: [reason]
  };
}
