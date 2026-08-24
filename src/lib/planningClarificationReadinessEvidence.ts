import type { ProjectRecord, ProjectType } from "../types/project";
import {
  generatePlanningClarificationBlueprints,
  type PlanningClarificationProposalBlueprint
} from "./planningClarificationBlueprints";
import { selectPlanningClarificationAnswerReview } from "./planningClarificationAnswerEntryViewModel";
import { getProductionPlanningClarificationAnswerSchema } from "./planningClarificationAnswerSchemaRegistry";
import { buildPlanningUserAnswerLocator } from "./planningClarificationDecisionContract";
import { generatePlanningClarificationDrafts } from "./planningClarificationDrafts";
import { generatePlanningClarificationFingerprints } from "./planningClarificationFingerprints";
import {
  analyzePlanningClarificationLifecycleChanges,
  type PlanningClarificationProposalLifecycleAnalysisRecord
} from "./planningClarificationLifecycleAnalysis";
import {
  createEmptyProjectPlanningState,
  normalizeProjectPlanningState,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningSourceReference,
  type ProjectPlanningState
} from "./planningProposals";
import {
  getActivePlanningRulesForProjectType,
  validatePlanningRuleRegistry,
  type PlanningClarificationRule
} from "./planningRules";
import { evaluatePhaseGate, type PhaseGateId } from "./phaseGates";

export const PLANNING_CLARIFICATION_READINESS_EVIDENCE_VERSION =
  "phase-5c.3c.3j.2";

export type PlanningClarificationReadinessEvidenceReasonCode =
  | "unsupportedProjectType"
  | "invalidPlanning"
  | "generationFailed"
  | "lifecycleAnalysisFailed"
  | "clarificationNotCurrentlyRequired"
  | "currentProposalMissing"
  | "currentProposalNotCurrent"
  | "proposalNotConfirmed"
  | "historicalMetadataConflict"
  | "fingerprintMismatch"
  | "answerSchemaUnavailable"
  | "confirmedAnswerInvalid"
  | "confirmedSourceInvalid"
  | "confirmationDecisionInvalid"
  | "blockingConflict";

interface PlanningClarificationReadinessEvidenceAssessmentBase {
  projectId: string;
  ruleId: string;
  ruleVersion: string;
  gateId: PhaseGateId;
  architectApprovalRequired: boolean;
  readinessAuthorized: false;
  proposalId?: string;
}

export interface PlanningClarificationValidatedEvidenceCandidate
  extends PlanningClarificationReadinessEvidenceAssessmentBase {
  /**
   * A validated candidate is not ready, approved, mapped, writable, output
   * eligible, or Apply eligible. It only passed the internal Planning proof
   * required before later authorization layers may consider the evidence.
   */
  disposition: "validatedCandidate";
  proposalId: string;
  fingerprint: string;
  confirmationDecisionId: string;
  confirmedSourceId: string;
}

export interface PlanningClarificationNotEvidenceCandidate
  extends PlanningClarificationReadinessEvidenceAssessmentBase {
  disposition: "notCandidate";
  reason: PlanningClarificationReadinessEvidenceReasonCode;
}

export interface PlanningClarificationBlockedEvidenceCandidate
  extends PlanningClarificationReadinessEvidenceAssessmentBase {
  disposition: "blocked";
  reason: PlanningClarificationReadinessEvidenceReasonCode;
}

export type PlanningClarificationReadinessEvidenceAssessment =
  | PlanningClarificationValidatedEvidenceCandidate
  | PlanningClarificationNotEvidenceCandidate
  | PlanningClarificationBlockedEvidenceCandidate;

interface PlanningClarificationReadinessEvidenceResultBase {
  version: typeof PLANNING_CLARIFICATION_READINESS_EVIDENCE_VERSION;
  projectId: string;
  readinessAuthorized: false;
}

export interface PlanningClarificationReadinessEvidenceAnalyzedResult
  extends PlanningClarificationReadinessEvidenceResultBase {
  outcome: "analyzed";
  assessments: readonly PlanningClarificationReadinessEvidenceAssessment[];
  reasonCodes: readonly [];
}

export interface PlanningClarificationReadinessEvidenceUnsupportedResult
  extends PlanningClarificationReadinessEvidenceResultBase {
  outcome: "unsupportedProjectType";
  assessments: readonly [];
  reasonCodes: readonly ["unsupportedProjectType"];
}

export interface PlanningClarificationReadinessEvidenceBlockedResult
  extends PlanningClarificationReadinessEvidenceResultBase {
  outcome: "blocked";
  assessments: readonly [];
  reasonCodes: readonly PlanningClarificationReadinessEvidenceReasonCode[];
}

export type PlanningClarificationReadinessEvidenceResult =
  | PlanningClarificationReadinessEvidenceAnalyzedResult
  | PlanningClarificationReadinessEvidenceUnsupportedResult
  | PlanningClarificationReadinessEvidenceBlockedResult;

const CANVAS_PROJECT_TYPE = "powerAppsCanvas" satisfies ProjectType;

export async function analyzePlanningClarificationReadinessEvidence(
  project: ProjectRecord
): Promise<PlanningClarificationReadinessEvidenceResult> {
  const projectId = project.identity.id;
  if (project.intake.appType !== CANVAS_PROJECT_TYPE) {
    return unsupported(projectId);
  }

  const registry = validatePlanningRuleRegistry();
  if (!registry.valid) {
    return blockedResult(projectId, "generationFailed");
  }

  const normalized = normalizeProjectPlanningState(
    project.planning ?? createEmptyProjectPlanningState(),
    projectId
  );
  if (normalized.issues.length > 0) {
    return blockedResult(projectId, "invalidPlanning");
  }

  const rules = getActivePlanningRulesForProjectType(CANVAS_PROJECT_TYPE);
  let snapshot: {
    proposals: readonly PlanningClarificationProposalBlueprint[];
    sources: ReturnType<typeof generatePlanningClarificationBlueprints>["sources"];
    fingerprints: Awaited<ReturnType<typeof generatePlanningClarificationFingerprints>>["fingerprints"];
  };

  try {
    const gateIds = [...new Set(rules.map((rule) => rule.target.targetKey))];
    const gateResults = gateIds.map((gateId) => evaluatePhaseGate(project, gateId));
    const drafts = generatePlanningClarificationDrafts({
      projectId,
      projectType: CANVAS_PROJECT_TYPE,
      gateResults
    });
    if (drafts.issues.length > 0) {
      return blockedResult(projectId, "generationFailed");
    }

    const blueprints = generatePlanningClarificationBlueprints({
      projectId,
      drafts: drafts.drafts
    });
    if (blueprints.issues.length > 0) {
      return blockedResult(projectId, "generationFailed");
    }

    const fingerprints = await generatePlanningClarificationFingerprints({
      projectId,
      sources: blueprints.sources,
      proposals: blueprints.proposals
    });
    if (fingerprints.issues.length > 0) {
      return blockedResult(projectId, "generationFailed");
    }

    snapshot = {
      proposals: blueprints.proposals,
      sources: blueprints.sources,
      fingerprints: fingerprints.fingerprints
    };
  } catch {
    return blockedResult(projectId, "generationFailed");
  }

  let lifecycle: Awaited<ReturnType<typeof analyzePlanningClarificationLifecycleChanges>>;
  try {
    lifecycle = await analyzePlanningClarificationLifecycleChanges({
      projectId,
      existingPlanning: normalized.planning,
      sources: snapshot.sources,
      proposals: snapshot.proposals,
      fingerprints: snapshot.fingerprints
    });
  } catch {
    return blockedResult(projectId, "lifecycleAnalysisFailed");
  }
  if (lifecycle.issues.length > 0) {
    return blockedResult(projectId, "lifecycleAnalysisFailed");
  }

  return {
    version: PLANNING_CLARIFICATION_READINESS_EVIDENCE_VERSION,
    outcome: "analyzed",
    projectId,
    readinessAuthorized: false,
    assessments: rules.map((rule) => assessRule(
      projectId,
      rule,
      normalized.planning,
      snapshot.proposals,
      lifecycle.proposals
    )),
    reasonCodes: []
  };
}

function assessRule(
  projectId: string,
  rule: PlanningClarificationRule,
  planning: ProjectPlanningState,
  generatedProposals: readonly PlanningClarificationProposalBlueprint[],
  lifecycleRecords: readonly PlanningClarificationProposalLifecycleAnalysisRecord[]
): PlanningClarificationReadinessEvidenceAssessment {
  const base = assessmentBase(projectId, rule);
  const generatedMatches = generatedProposals.filter((proposal) => proposal.ruleId === rule.ruleId);
  if (generatedMatches.length === 0) {
    return notCandidate(base, "clarificationNotCurrentlyRequired");
  }
  if (generatedMatches.length !== 1) {
    return blockedAssessment(base, "currentProposalNotCurrent");
  }

  const generated = generatedMatches[0];
  const lifecycleMatches = lifecycleRecords.filter((record) => record.semanticKey === generated.proposalKey);
  if (lifecycleMatches.length !== 1) {
    return blockedAssessment(base, "currentProposalNotCurrent");
  }

  const lifecycle = lifecycleMatches[0];
  if (lifecycle.disposition !== "unchanged") {
    return lifecycle.disposition === "ambiguous"
      ? blockedAssessment(withProposalId(base, lifecycle.persistedId), "currentProposalNotCurrent")
      : notCandidate(withProposalId(base, lifecycle.persistedId), "currentProposalNotCurrent");
  }
  if (!lifecycle.persistedId) {
    return notCandidate(base, "currentProposalMissing");
  }

  const boundBase = withProposalId(base, lifecycle.persistedId);
  const proposalMatches = planning.proposals.filter(
    (proposal) => proposal.proposalId === lifecycle.persistedId
  );
  if (proposalMatches.length !== 1) {
    return blockedAssessment(boundBase, "currentProposalNotCurrent");
  }

  const proposal = proposalMatches[0];
  if (proposal.status !== "Confirmed") {
    return notCandidate(boundBase, "proposalNotConfirmed");
  }
  if (proposal.staleReason || proposal.staleAt || proposal.supersededByProposalId) {
    return blockedAssessment(boundBase, "historicalMetadataConflict");
  }
  if (!proposalMatchesActiveRule(proposal, rule, projectId)) {
    return blockedAssessment(boundBase, "currentProposalNotCurrent");
  }
  if (
    !lifecycle.existingFingerprint ||
    !lifecycle.generatedFingerprint ||
    proposal.fingerprint !== lifecycle.existingFingerprint ||
    proposal.fingerprint !== lifecycle.generatedFingerprint
  ) {
    return blockedAssessment(boundBase, "fingerprintMismatch");
  }

  const answerReview = selectPlanningClarificationAnswerReview({
    projectId,
    planning,
    proposalId: proposal.proposalId
  });
  if (answerReview.state !== "available" || answerReview.status !== "Confirmed") {
    const schema = getProductionPlanningClarificationAnswerSchema(
      proposal.ruleId,
      proposal.ruleVersion
    );
    return blockedAssessment(
      boundBase,
      answerReview.state === "schemaUnavailable" || !schema
        ? "answerSchemaUnavailable"
        : "confirmedAnswerInvalid"
    );
  }

  const confirmedSource = selectConfirmedSource(planning, proposal);
  if (!confirmedSource) {
    return blockedAssessment(boundBase, "confirmedSourceInvalid");
  }
  const confirmationDecision = selectConfirmationDecision(planning, proposal);
  if (!confirmationDecision) {
    return blockedAssessment(boundBase, "confirmationDecisionInvalid");
  }
  if (
    buildPlanningUserAnswerLocator(proposal.proposalId, confirmationDecision.decisionId) !==
    confirmedSource.locator
  ) {
    return blockedAssessment(boundBase, "confirmedSourceInvalid");
  }
  if (hasOpenBlockingConflict(planning.conflicts, proposal.proposalId)) {
    return blockedAssessment(boundBase, "blockingConflict");
  }

  return {
    ...boundBase,
    disposition: "validatedCandidate",
    proposalId: proposal.proposalId,
    fingerprint: proposal.fingerprint,
    confirmationDecisionId: confirmationDecision.decisionId,
    confirmedSourceId: confirmedSource.sourceId
  };
}

function proposalMatchesActiveRule(
  proposal: PlanningProposalRecord,
  rule: PlanningClarificationRule,
  projectId: string
): boolean {
  return proposal.projectId === projectId &&
    proposal.ruleId === rule.ruleId &&
    proposal.ruleVersion === rule.ruleVersion &&
    proposal.category === rule.category &&
    proposal.restriction === rule.restriction &&
    proposal.target.kind === "readinessRequirement" &&
    proposal.target.domain === rule.target.domain &&
    proposal.target.targetKey === rule.target.targetKey &&
    proposal.target.operation === "clarificationOnly" &&
    proposal.target.entityId === rule.target.entityId &&
    proposal.target.fieldKey === rule.target.fieldKey &&
    sameStrings(proposal.readinessRequirementIds, [rule.target.targetKey]) &&
    sameStrings(proposal.applicableProjectTypes, rule.applicableProjectTypes) &&
    sameStrings(proposal.applicableDomains, [rule.target.domain]);
}

function selectConfirmedSource(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningSourceReference | null {
  const attached = proposal.sourceIds.flatMap((sourceId) =>
    planning.sources.filter((source) => source.sourceId === sourceId)
  );
  if (attached.length !== proposal.sourceIds.length) return null;

  const matches = attached.filter((source) =>
    source.sourceType === "userAnswer" &&
    source.authority === "confirmed" &&
    source.availability === "current" &&
    source.label === "User answer"
  );
  return matches.length === 1 ? matches[0] : null;
}

function selectConfirmationDecision(
  planning: ProjectPlanningState,
  proposal: PlanningProposalRecord
): PlanningDecisionRecord | null {
  if (!proposal.lastDecisionId) return null;
  const proposalDecisions = planning.decisions.filter(
    (decision) => decision.proposalId === proposal.proposalId
  );
  const matches = proposalDecisions.filter(
    (decision) => decision.decisionId === proposal.lastDecisionId
  );
  const decision = matches.length === 1 ? matches[0] : undefined;
  if (
    !decision ||
    proposalDecisions.at(-1)?.decisionId !== decision.decisionId ||
    decision.action !== "confirm" ||
    decision.previousStatus !== "Revised" ||
    decision.resultingStatus !== "Confirmed" ||
    decision.origin !== "userAction" ||
    decision.value !== undefined ||
    decision.reason !== undefined ||
    !sameStrings(decision.sourceIds, proposal.sourceIds)
  ) {
    return null;
  }
  return decision;
}

function hasOpenBlockingConflict(
  conflicts: readonly PlanningConflictRecord[],
  proposalId: string
): boolean {
  return conflicts.some((conflict) =>
    conflict.status === "open" &&
    conflict.blocking === true &&
    (
      conflict.involvedReferences.some(
        (reference) => reference.kind === "proposalId" && reference.proposalId === proposalId
      ) ||
      conflict.affectedProposalIds?.includes(proposalId) === true ||
      conflict.resolutionOptionProposalIds?.includes(proposalId) === true
    )
  );
}

function assessmentBase(
  projectId: string,
  rule: PlanningClarificationRule
): PlanningClarificationReadinessEvidenceAssessmentBase {
  return {
    projectId,
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    gateId: rule.target.targetKey,
    architectApprovalRequired: rule.architectApprovalRequired,
    readinessAuthorized: false
  };
}

function withProposalId<T extends PlanningClarificationReadinessEvidenceAssessmentBase>(
  base: T,
  proposalId: string | undefined
): T {
  return proposalId ? { ...base, proposalId } : base;
}

function notCandidate(
  base: PlanningClarificationReadinessEvidenceAssessmentBase,
  reason: PlanningClarificationReadinessEvidenceReasonCode
): PlanningClarificationNotEvidenceCandidate {
  return { ...base, disposition: "notCandidate", reason };
}

function blockedAssessment(
  base: PlanningClarificationReadinessEvidenceAssessmentBase,
  reason: PlanningClarificationReadinessEvidenceReasonCode
): PlanningClarificationBlockedEvidenceCandidate {
  return { ...base, disposition: "blocked", reason };
}

function unsupported(projectId: string): PlanningClarificationReadinessEvidenceUnsupportedResult {
  return {
    version: PLANNING_CLARIFICATION_READINESS_EVIDENCE_VERSION,
    outcome: "unsupportedProjectType",
    projectId,
    readinessAuthorized: false,
    assessments: [],
    reasonCodes: ["unsupportedProjectType"]
  };
}

function blockedResult(
  projectId: string,
  reason: PlanningClarificationReadinessEvidenceReasonCode
): PlanningClarificationReadinessEvidenceBlockedResult {
  return {
    version: PLANNING_CLARIFICATION_READINESS_EVIDENCE_VERSION,
    outcome: "blocked",
    projectId,
    readinessAuthorized: false,
    assessments: [],
    reasonCodes: [reason]
  };
}

function sameStrings(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined
): boolean {
  if (!left || !right || left.length !== right.length) return false;
  return left.every((entry, index) => entry === right[index]);
}
