import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  analyzePlanningClarificationDecisionCapabilities,
  type PlanningClarificationHumanDecisionAction
} from "../../lib/planningClarificationDecisionContract";
import type { PlanningClarificationDecisionFeedback } from "../../lib/planningClarificationDecisionFeedback";
import type { PlanningClarificationDecisionRepositoryInput } from "../../lib/planningClarificationDecisionMaterialization";
import {
  createEmptyPlanningClarificationAnswerDraft,
  isPlanningClarificationAnswerDraftMeaningful,
  projectPlanningClarificationAnswerIssues,
  validatePlanningClarificationAnswerDraft,
  type PlanningClarificationAnswerDraft,
  type PlanningClarificationAnswerIssuePresentation
} from "../../lib/planningClarificationAnswerDraft";
import type { PlanningClarificationAnswerSchema } from "../../lib/planningClarificationAnswerSchema";
import { selectPlanningClarificationAnswerEntry } from "../../lib/planningClarificationAnswerEntryViewModel";
import type { ProjectPlanningState } from "../../lib/planningProposals";
import { ClarificationAnswerPrimitiveEditor } from "./ClarificationAnswerPrimitiveEditor";
import { ClarificationAnswerStructuredEditor } from "./ClarificationAnswerStructuredEditor";

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
  onAnswerDraftMeaningfulChange: (proposalId: string, meaningful: boolean) => void;
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
const ANSWER_STRUCTURE_UNAVAILABLE_MESSAGE =
  "Answer entry is unavailable because the required answer structure is not registered for this planning question.";
const ANSWER_STATE_CHANGED_MESSAGE =
  "Planning changed while this answer was being edited. The draft is preserved, but it cannot be submitted against the previous planning state.";

interface AnswerSession {
  proposalId: string;
  ruleId: string;
  ruleVersion: string;
  schema: PlanningClarificationAnswerSchema;
  draft: PlanningClarificationAnswerDraft;
}

export function ClarificationDecisionControls({
  projectId,
  planning,
  proposalId,
  proposalTitle,
  onSubmitClarificationDecision,
  onFeedback,
  onAnswerDraftMeaningfulChange
}: ClarificationDecisionControlsProps) {
  const [activeReasonAction, setActiveReasonAction] = useState<ReasonAction | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionKind, setSubmissionKind] = useState<"answer" | "decision" | null>(null);
  const [answerSession, setAnswerSession] = useState<AnswerSession | null>(null);
  const [answerIssues, setAnswerIssues] = useState<readonly PlanningClarificationAnswerIssuePresentation[]>([]);
  const reasonInputId = useId();
  const reasonFormId = useId();
  const answerFormId = useId();
  const answerHeadingId = useId();
  const answerErrorSummaryId = useId();
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  const answerHeadingRef = useRef<HTMLHeadingElement>(null);
  const answerErrorSummaryRef = useRef<HTMLDivElement>(null);
  const answerButtonRef = useRef<HTMLButtonElement>(null);
  const reasonButtonRefs = useRef<Partial<Record<ReasonAction, HTMLButtonElement | null>>>({});
  const returnFocusActionRef = useRef<ReasonAction | null>(null);
  const focusAnswerHeadingRef = useRef(false);
  const returnFocusToAnswerRef = useRef(false);
  const submissionPendingRef = useRef(false);
  const dirtyCallbackRef = useRef(onAnswerDraftMeaningfulChange);
  const capabilities = useMemo(
    () => analyzePlanningClarificationDecisionCapabilities({ projectId, planning, proposalId }).capabilities,
    [planning, projectId, proposalId]
  );
  const answerEntrySelection = useMemo(
    () => selectPlanningClarificationAnswerEntry({ projectId, planning, proposalId }),
    [planning, projectId, proposalId]
  );
  const confirmAvailable = capabilities.some(
    (entry) => entry.action === "confirm" && entry.state === "available" && entry.requiredInput === "none"
  );
  const availableReasonActions = REASON_ACTIONS.filter(({ action }) => capabilities.some(
    (entry) => entry.action === action && entry.state === "inputRequired" && entry.requiredInput === "reason"
  ));
  const activeReasonConfig = availableReasonActions.find(({ action }) => action === activeReasonAction);
  const answerSessionIsCurrent = answerSession !== null && answerEntrySelection.state === "eligible" &&
    answerEntrySelection.proposalId === answerSession.proposalId &&
    answerEntrySelection.ruleId === answerSession.ruleId &&
    answerEntrySelection.ruleVersion === answerSession.ruleVersion;
  const answerDraftMeaningful = answerSession !== null &&
    isPlanningClarificationAnswerDraftMeaningful(answerSession.draft);

  useEffect(() => {
    dirtyCallbackRef.current = onAnswerDraftMeaningfulChange;
  }, [onAnswerDraftMeaningfulChange]);

  useEffect(() => {
    dirtyCallbackRef.current(proposalId, answerDraftMeaningful);
  }, [answerDraftMeaningful, proposalId]);

  useEffect(() => () => {
    dirtyCallbackRef.current(proposalId, false);
  }, [proposalId]);

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

  useEffect(() => {
    if (focusAnswerHeadingRef.current && answerSession) {
      focusAnswerHeadingRef.current = false;
      answerHeadingRef.current?.focus();
    }
    if (returnFocusToAnswerRef.current && !answerSession && answerEntrySelection.state === "eligible") {
      returnFocusToAnswerRef.current = false;
      answerButtonRef.current?.focus();
    }
  }, [answerEntrySelection.state, answerSession]);

  useEffect(() => {
    if (answerIssues.length > 0) answerErrorSummaryRef.current?.focus();
  }, [answerIssues]);

  if (
    !confirmAvailable &&
    availableReasonActions.length === 0 &&
    answerEntrySelection.state === "unavailable" &&
    !answerSession
  ) {
    return null;
  }

  const submitDecision = async (
    input: PlanningClarificationDecisionRepositoryInput,
    kind: "answer" | "decision" = "decision"
  ): Promise<PlanningClarificationDecisionFeedback | undefined> => {
    if (submissionPendingRef.current) return undefined;

    submissionPendingRef.current = true;
    setSubmitting(true);
    setSubmissionKind(kind);
    onFeedback(null);
    try {
      const result = await onSubmitClarificationDecision(projectId, input);
      onFeedback(result.feedback);
      if (result.feedback.successful) {
        setActiveReasonAction(null);
        setReason("");
      }
      return result.feedback;
    } catch {
      onFeedback({ successful: false, message: UNEXPECTED_ERROR_MESSAGE });
      return undefined;
    } finally {
      submissionPendingRef.current = false;
      setSubmitting(false);
      setSubmissionKind(null);
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

  const startAnswer = () => {
    if (submissionPendingRef.current || answerEntrySelection.state !== "eligible") return;
    setActiveReasonAction(null);
    setReason("");
    setAnswerIssues([]);
    focusAnswerHeadingRef.current = true;
    setAnswerSession({
      proposalId: answerEntrySelection.proposalId,
      ruleId: answerEntrySelection.ruleId,
      ruleVersion: answerEntrySelection.ruleVersion,
      schema: answerEntrySelection.schema,
      draft: createEmptyPlanningClarificationAnswerDraft(answerEntrySelection.schema)
    });
  };

  const updateAnswerDraft = (draft: PlanningClarificationAnswerDraft) => {
    if (!answerSessionIsCurrent || submitting) return;
    setAnswerIssues([]);
    setAnswerSession((current) => current ? { ...current, draft } : current);
  };

  const closeAnswerSession = () => {
    setAnswerIssues([]);
    setAnswerSession(null);
    onAnswerDraftMeaningfulChange(proposalId, false);
  };

  const cancelAnswer = () => {
    if (submissionPendingRef.current || !answerSession) return;
    if (answerDraftMeaningful && !window.confirm(
      "Discard answer and stop editing? Select Cancel to keep editing."
    )) return;
    returnFocusToAnswerRef.current = true;
    closeAnswerSession();
  };

  const saveAnswer = async () => {
    if (submissionPendingRef.current || !answerSession || !answerSessionIsCurrent) return;
    const validation = validatePlanningClarificationAnswerDraft(answerSession.schema, answerSession.draft);
    if (validation.outcome === "invalid") {
      setAnswerIssues(projectPlanningClarificationAnswerIssues(answerSession.schema, validation.issues));
      return;
    }

    setAnswerIssues([]);
    const feedback = await submitDecision({
      proposalId: answerSession.proposalId,
      action: "revise",
      value: validation.answer
    }, "answer");
    if (feedback?.successful) closeAnswerSession();
  };

  return (
    <section
      className="planning-decision-controls"
      aria-label={`Clarification decision actions for ${proposalTitle}`}
      aria-busy={submitting}
    >
      {!answerSession && answerEntrySelection.state === "schemaUnavailable" ? (
        <p className="planning-decision-answer-note">
          {ANSWER_STRUCTURE_UNAVAILABLE_MESSAGE}
        </p>
      ) : null}

      {!answerSession && answerEntrySelection.state === "eligible" ? (
        <div className="planning-decision-answer-start">
          <button
            className="button button-primary"
            disabled={submitting}
            ref={answerButtonRef}
            type="button"
            onClick={startAnswer}
          >
            Answer question
          </button>
        </div>
      ) : null}

      {answerSession ? (
        <form
          aria-busy={submitting}
          aria-describedby={answerIssues.length > 0 ? answerErrorSummaryId : undefined}
          aria-labelledby={answerHeadingId}
          className="planning-decision-answer-form"
          id={answerFormId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void saveAnswer();
          }}
        >
          <h4 id={answerHeadingId} ref={answerHeadingRef} tabIndex={-1}>Answer question</h4>
          {!answerSessionIsCurrent ? (
            <p className="planning-decision-answer-stale" role="status">{ANSWER_STATE_CHANGED_MESSAGE}</p>
          ) : null}
          {answerIssues.length > 0 ? (
            <div
              className="planning-decision-answer-errors"
              id={answerErrorSummaryId}
              ref={answerErrorSummaryRef}
              role="alert"
              tabIndex={-1}
            >
              <strong>Review the answer fields below.</strong>
              <ul>
                {answerIssues.map((issue, index) => (
                  <li key={`${issue.code}-${index}`}>{issue.location}: {issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <AnswerEditor
            disabled={submitting || !answerSessionIsCurrent}
            draft={answerSession.draft}
            issues={answerIssues}
            schema={answerSession.schema}
            onChange={updateAnswerDraft}
          />
          <div className="planning-decision-form-actions">
            <button
              className="button button-primary"
              disabled={submitting || !answerSessionIsCurrent}
              type="submit"
            >
              Save answer for review
            </button>
            <button
              className="button button-text"
              disabled={submitting}
              type="button"
              onClick={cancelAnswer}
            >
              Cancel
            </button>
          </div>
        </form>
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
          {submissionKind === "answer" ? "Saving answer..." : "Saving decision..."}
        </p>
      ) : null}
    </section>
  );
}

function AnswerEditor({
  schema,
  draft,
  disabled,
  issues,
  onChange
}: {
  schema: PlanningClarificationAnswerSchema;
  draft: PlanningClarificationAnswerDraft;
  disabled: boolean;
  issues: readonly PlanningClarificationAnswerIssuePresentation[];
  onChange: (draft: PlanningClarificationAnswerDraft) => void;
}) {
  if (schema.kind === "text" && draft.kind === "text") {
    return <ClarificationAnswerPrimitiveEditor schema={schema} draft={draft} label="Answer" required disabled={disabled} issues={issues} onChange={onChange} />;
  }
  if (schema.kind === "boolean" && draft.kind === "boolean") {
    return <ClarificationAnswerPrimitiveEditor schema={schema} draft={draft} label="Answer" required disabled={disabled} issues={issues} onChange={onChange} />;
  }
  if (schema.kind === "enum" && draft.kind === "enum") {
    return <ClarificationAnswerPrimitiveEditor schema={schema} draft={draft} label="Answer" required disabled={disabled} issues={issues} onChange={onChange} />;
  }
  if (schema.kind === "stringList" && draft.kind === "stringList") {
    return <ClarificationAnswerPrimitiveEditor schema={schema} draft={draft} label="Answer" required disabled={disabled} issues={issues} onChange={onChange} />;
  }
  if (schema.kind === "structuredRecord" && draft.kind === "structuredRecord") {
    return <ClarificationAnswerStructuredEditor schema={schema} draft={draft} label="Answer" required disabled={disabled} issues={issues} onChange={onChange} />;
  }
  if (schema.kind === "structuredRecordList" && draft.kind === "structuredRecordList") {
    return <ClarificationAnswerStructuredEditor schema={schema} draft={draft} label="Answer" required disabled={disabled} issues={issues} onChange={onChange} />;
  }
  return <p className="planning-decision-answer-stale">This answer editor is unavailable.</p>;
}
