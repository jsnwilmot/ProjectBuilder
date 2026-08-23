import { generatePlanningClarificationBlueprints } from "./planningClarificationBlueprints";
import { generatePlanningClarificationDrafts } from "./planningClarificationDrafts";
import { generatePlanningClarificationFingerprints } from "./planningClarificationFingerprints";
import { evaluatePhaseGate, type PhaseGateId } from "./phaseGates";
import {
  getProjectById,
  materializeProjectPlanningClarificationReplacements,
  materializeProjectPlanningClarifications,
  materializeProjectPlanningClarificationStaleTransitions,
  type StorageAdapter
} from "./projectRepository";
import { getActivePlanningRulesForProjectType } from "./planningRules";
import type { ProjectPlanningState } from "./planningProposals";

export type PlanningClarificationOrchestrationOutcome =
  | "generated"
  | "refreshed"
  | "unchanged"
  | "blocked"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "persistenceFailed";

export interface PlanningClarificationOrchestrationResult {
  outcome: PlanningClarificationOrchestrationOutcome;
  successful: boolean;
  message: string;
}

export interface PlanningClarificationOrchestrationOptions {
  storage?: StorageAdapter;
}

const GENERATED_MESSAGE = "Planning generated from the current project state.";
const REFRESHED_MESSAGE = "Planning refreshed from the current project state.";
const CURRENT_MESSAGE = "Planning is already current.";
const NO_QUESTIONS_MESSAGE = "No unresolved clarification questions were generated.";
const PROJECT_NOT_FOUND_MESSAGE = "The project is no longer available. Return to Mission Control and select it again.";
const UNSUPPORTED_MESSAGE = "Deterministic clarification planning is not available for this project type.";
const PERSISTENCE_FAILED_MESSAGE = "Planning could not be saved safely. Review the latest project state and try again.";

export async function runPlanningClarificationGeneration(
  projectId: string,
  options: PlanningClarificationOrchestrationOptions = {}
): Promise<PlanningClarificationOrchestrationResult> {
  let project;
  try {
    project = getProjectById(projectId, options.storage);
  } catch {
    return failure("persistenceFailed", PERSISTENCE_FAILED_MESSAGE);
  }

  if (!project) return failure("projectNotFound", PROJECT_NOT_FOUND_MESSAGE);
  if (project.intake.appType !== "powerAppsCanvas") {
    return failure("unsupportedProjectType", UNSUPPORTED_MESSAGE);
  }

  const hadPlanningLifecycle = hasMeaningfulPlanningLifecycle(project.planning);
  const blockedMessage = hadPlanningLifecycle
    ? "Planning could not be refreshed safely. Review the latest project information and try again."
    : "Planning could not be generated safely. Review the current project information and try again.";

  let snapshot;
  try {
    const activeRules = getActivePlanningRulesForProjectType(project.intake.appType);
    const gateIds = deduplicateGateIds(activeRules.map((rule) => rule.target.targetKey));
    const gateResults = gateIds.map((gateId) => evaluatePhaseGate(project, gateId));
    const drafts = generatePlanningClarificationDrafts({
      projectId: project.identity.id,
      projectType: project.intake.appType,
      gateResults
    });
    if (drafts.issues.length > 0) return failure("blocked", blockedMessage);

    const blueprints = generatePlanningClarificationBlueprints({
      projectId: project.identity.id,
      drafts: drafts.drafts
    });
    if (blueprints.issues.length > 0) return failure("blocked", blockedMessage);

    const fingerprints = await generatePlanningClarificationFingerprints({
      projectId: project.identity.id,
      sources: blueprints.sources,
      proposals: blueprints.proposals
    });
    if (fingerprints.issues.length > 0) return failure("blocked", blockedMessage);

    snapshot = {
      sources: blueprints.sources,
      proposals: blueprints.proposals,
      fingerprints: fingerprints.fingerprints
    };
  } catch {
    return failure("blocked", blockedMessage);
  }

  let wrote = false;
  try {
    const stale = await materializeProjectPlanningClarificationStaleTransitions(
      project.identity.id,
      snapshot,
      options.storage
    );
    if (!canContinue(stale.outcome)) return repositoryFailure(stale.outcome, blockedMessage);
    wrote ||= stale.outcome === "persisted";

    const replacements = await materializeProjectPlanningClarificationReplacements(
      project.identity.id,
      snapshot,
      options.storage
    );
    if (!canContinue(replacements.outcome)) return repositoryFailure(replacements.outcome, blockedMessage);
    wrote ||= replacements.outcome === "persisted";

    const ordinary = await materializeProjectPlanningClarifications(
      project.identity.id,
      snapshot,
      options.storage
    );
    if (!canContinue(ordinary.outcome)) return repositoryFailure(ordinary.outcome, blockedMessage);
    wrote ||= ordinary.outcome === "persisted";
  } catch {
    return failure("persistenceFailed", PERSISTENCE_FAILED_MESSAGE);
  }

  if (wrote) {
    return success(hadPlanningLifecycle ? "refreshed" : "generated", hadPlanningLifecycle
      ? REFRESHED_MESSAGE
      : GENERATED_MESSAGE);
  }
  return success("unchanged", snapshot.proposals.length === 0 ? NO_QUESTIONS_MESSAGE : CURRENT_MESSAGE);
}

function deduplicateGateIds(gateIds: readonly PhaseGateId[]): PhaseGateId[] {
  return [...new Set(gateIds)];
}

function hasMeaningfulPlanningLifecycle(planning: ProjectPlanningState | undefined): boolean {
  return Boolean(planning && (
    planning.sources.length > 0 ||
    planning.proposals.length > 0 ||
    planning.decisions.length > 0 ||
    planning.dependencies.length > 0 ||
    planning.conflicts.length > 0
  ));
}

function canContinue(outcome: string): outcome is "persisted" | "unchanged" {
  return outcome === "persisted" || outcome === "unchanged";
}

function repositoryFailure(outcome: string, blockedMessage: string): PlanningClarificationOrchestrationResult {
  if (outcome === "projectNotFound") return failure("projectNotFound", PROJECT_NOT_FOUND_MESSAGE);
  if (outcome === "unsupportedProjectType") return failure("unsupportedProjectType", UNSUPPORTED_MESSAGE);
  if (outcome === "persistenceFailed") return failure("persistenceFailed", PERSISTENCE_FAILED_MESSAGE);
  return failure("blocked", blockedMessage);
}

function success(
  outcome: Extract<PlanningClarificationOrchestrationOutcome, "generated" | "refreshed" | "unchanged">,
  message: string
): PlanningClarificationOrchestrationResult {
  return { outcome, successful: true, message };
}

function failure(
  outcome: Exclude<PlanningClarificationOrchestrationOutcome, "generated" | "refreshed" | "unchanged">,
  message: string
): PlanningClarificationOrchestrationResult {
  return { outcome, successful: false, message };
}
