import type {
  PlanningClarificationDecisionRepositoryResult
} from "./planningClarificationDecisionMaterialization";

export type PlanningClarificationDecisionFeedbackKind =
  | "persisted"
  | "blocked"
  | "stateChanged"
  | "projectNotFound"
  | "unsupportedProjectType"
  | "persistenceFailed";

export interface PlanningClarificationDecisionFeedback {
  kind: PlanningClarificationDecisionFeedbackKind;
  successful: boolean;
  message: string;
}

const PERSISTED_MESSAGES: Record<
  NonNullable<PlanningClarificationDecisionRepositoryResult["action"]>,
  string
> = {
  revise: "Planning answer saved for review.",
  confirm: "Planning decision confirmed.",
  reject: "Planning item rejected.",
  defer: "Planning item deferred.",
  markNotApplicable: "Planning item marked not applicable."
};

export function buildPlanningClarificationDecisionFeedback(
  result: PlanningClarificationDecisionRepositoryResult
): PlanningClarificationDecisionFeedback {
  switch (result.outcome) {
    case "persisted":
      return {
        kind: "persisted",
        successful: true,
        message: result.action ? PERSISTED_MESSAGES[result.action] : "Planning decision saved."
      };
    case "blocked":
      return result.issues.some((entry) => entry.code === "projectChangedDuringDecisionMaterialization")
        ? {
            kind: "stateChanged",
            successful: false,
            message: "This project changed before the decision could be saved. Review the latest planning state before trying again."
          }
        : {
            kind: "blocked",
            successful: false,
            message: "This planning decision could not be saved. Review the latest planning state and required information."
          };
    case "projectNotFound":
      return {
        kind: "projectNotFound",
        successful: false,
        message: "This project is no longer available."
      };
    case "unsupportedProjectType":
      return {
        kind: "unsupportedProjectType",
        successful: false,
        message: "Planning clarification decisions are not available for this project type."
      };
    case "persistenceFailed":
      return {
        kind: "persistenceFailed",
        successful: false,
        message: "The planning decision could not be saved. Check the current saved state before trying again."
      };
  }
}
