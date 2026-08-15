import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  analyzePlanningClarificationDecisionCapabilities,
  type PlanningClarificationHumanDecisionAction
} from "../../lib/planningClarificationDecisionContract";
import type { PlanningClarificationDecisionFeedback } from "../../lib/planningClarificationDecisionFeedback";
import type { PlanningClarificationDecisionRepositoryInput } from "../../lib/planningClarificationDecisionMaterialization";
import type { ProjectPlanningState } from "../../lib/planningProposals";

export interface PlanningDecisionUiFeedback {
  successful: boolean;
  message: string;
}

export type SubmitPlanningClarificationDecision = (
  projectId: string,
  input: PlanningClarificationDecisionRepositoryInput
) => Promise<{ feedback: PlanningClarificationDecisionFeedback }>;

interface ClarificationDecisionControlsProps {
  projectId: string;
  planning: ProjectPlanningState;
  proposalId: string;
  proposalTitle: string;
  onSubmitClarificationDecision: SubmitPlanningClarificationDecision;
  onFeedback: (feedback: PlanningDecisionUiFeedback | null) => void;
}

type ReasonAction = Extract<
  PlanningClarificationHumanDecisionAction,
  "reject" | "defer" | "markNotApplicable"
>;

const REASON_ACTIONS: readonly {
  action: ReasonAction;
  buttonLabel: string;
  inputLabel: string;
  submitLabel: string;
  buttonClassName: string;
}[] = [
  {
    action: "defer",
    buttonLabel: "Defer",
    inputLabel: "Deferral reason",
    submitLabel: "Defer decision",
    buttonClassName: "button-secondary"
  },
  {
    action: "markNotApplicable",
    buttonLabel: "Not applicable",
    inputLabel: "Not applicable reason",
    submitLabel: "Mark not applicable",
    buttonClassName: "button-secondary"
  },
  {
    action: "reject",
    buttonLabel: "Reject",
    inputLabel: "Rejection reason",
    submitLabel: "Reject decision",
    buttonClassName: "button-danger"
  }
];

const UNEXPECTED_ERROR_MESSAGE =
  "The planning decision could not be completed. Review the latest saved state before trying again.";

export function ClarificationDecisionControls({
  projectId,
  planning,
  proposalId,
  proposalTitle,
  onSubmitClarificationDecision,
  onFeedback
}: ClarificationDecisionControlsProps) {
  const [activeReasonAction, setActiveReasonAction] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reasonInputId = useId();
  const reasonFormId = useId();
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  const reasonButtonRefs = useRef<Partial<Record<ReasonAction, HTMLButtonElement | null>>>({});
  const returnFocusActionRef = useRef<ReasonAction | null>(null);
  const submissionPendingRef = useRef(false);
  const capabilities = useMemo(
    () => analyzePlanningClarificationDecisionCapabilities({ projectId, planning, proposalId }).capabilities,
    [planning, projectId, proposalId]
  );
  const confirmAvailable = capabilities.some(
    (entry) => entry.action === "confirm" && entry.state === "available" && entry.requiredInput === "none"
  );
  const availableReasonActions = REASON_ACTIONS.filter(({ action }) => capabilities.some(
    (entry) => entry.action === action && entry.state === "inputRequired" && entry.requiredInput === "reason"
  ));
  const answerSchemaRequired = capabilities.some(
    (entry) => entry.action === "revise" && entry.state === "answerSchemaRequired" &&
      entry.requiredInput === "answerSchema"
  );
  const activeReasonConfig = availableReasonActions.find(({ action }) => action === activeReasonAction);

  useEffect(() => {
    if (activeReasonAction) {
      reasonInputRef.current?.focus();
      return;
    }

    const actionToFocus = returnFocusActionRef.current;
    if (actionToFocus) {
      returnFocusActionRef.current = null;
      reasonButtonRefs.current[actionToFocus]?.focus();
    }
  }, [activeReasonAction]);

  if (!confirmAvailable && availableReasonActions.length === 0 && !answerSchemaRequired) {
    return null;
  }

  const submitDecision = async (input: PlanningClarificationDecisionRepositoryInput) => {
    if (submissionPendingRef.current) return;

    submissionPendingRef.current = true;
    setSubmitting(true);
    onFeedback(null);
    try {
      const result = await onSubmitClarificationDecision(projectId, input);
      onFeedback(result.feedback);
      if (result.feedback.successful) {
        setActiveReasonAction(null);
        setReason("");
      }
    } catch {
      onFeedback({ successful: false, message: UNEXPECTED_ERROR_MESSAGE });
    } finally {
      submissionPendingRef.current = false;
      setSubmitting(false);
    }
  };

  const selectReasonAction = (action: ReasonAction) => {
    if (submissionPendingRef.current) return;
    setActiveReasonAction(action);
    setReason("");
  };

  const cancelReasonAction = () => {
    returnFocusActionRef.current = activeReasonAction;
    setActiveReasonAction(null);
    setReason("");
  };

  return (
    <section
      className="planning-decision-controls"
      aria-label={`Clarification decision actions for ${proposalTitle}`}
      aria-busy={submitting}
    >
      {answerSchemaRequired ? (
        <p className="planning-decision-answer-note">
          An answer is required before this planning question can be confirmed. Answer entry is not available yet.
        </p>
      ) : null}

      {confirmAvailable || availableReasonActions.length > 0 ? (
        <div className="planning-decision-actions">
          {confirmAvailable ? (
            <button
              className="button button-primary"
              disabled={submitting}
              type="button"
              onClick={() => {
                setActiveReasonAction(null);
                setReason("");
                void submitDecision({ proposalId, action: "confirm" });
              }}
            >
              Confirm decision
            </button>
          ) : null}
          {availableReasonActions.map((actionConfig) => (
            <button
              className={`button ${actionConfig.buttonClassName}`}
              aria-controls={activeReasonAction === actionConfig.action ? reasonFormId : undefined}
              aria-expanded={activeReasonAction === actionConfig.action}
              disabled={submitting}
              type="button"
              key={actionConfig.action}
              ref={(element) => {
                reasonButtonRefs.current[actionConfig.action] = element;
              }}
              onClick={() => selectReasonAction(actionConfig.action)}
            >
              {actionConfig.buttonLabel}
            </button>
          ))}
        </div>
      ) : null}

      {activeReasonConfig ? (
        <form
          id={reasonFormId}
          className="planning-decision-reason-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim().length === 0) return;
            void submitDecision({ proposalId, action: activeReasonConfig.action, reason });
          }}
        >
          <label htmlFor={reasonInputId}>{activeReasonConfig.inputLabel}</label>
          <textarea
            id={reasonInputId}
            ref={reasonInputRef}
            disabled={submitting}
            maxLength={2000}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="planning-decision-form-actions">
            <button
              className={`button ${activeReasonConfig.buttonClassName}`}
              disabled={submitting || reason.trim().length === 0}
              type="submit"
            >
              {activeReasonConfig.submitLabel}
            </button>
            <button
              className="button button-text"
              disabled={submitting}
              type="button"
              onClick={cancelReasonAction}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {submitting ? (
        <p className="planning-decision-progress" role="status" aria-live="polite" aria-atomic="true">
          Saving decision...
        </p>
      ) : null}
    </section>
  );
}
