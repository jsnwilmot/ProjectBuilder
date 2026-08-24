import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  analyzePlanningClarificationDecisionCapabilities,
  type PlanningClarificationHumanDecisionAction
} from "../../lib/planningClarificationDecisionContract";
import type { PlanningClarificationDecisionFeedback } from "../../lib/planningClarificationDecisionFeedback";
import type { PlanningClarificationDecisionRepositoryInput } from "../../lib/planningClarificationDecisionMaterialization";
import {
  arePlanningClarificationAnswerDraftsSemanticallyEqual,
  createEmptyPlanningClarificationAnswerDraft,
  hydratePlanningClarificationAnswerDraft,
  isPlanningClarificationAnswerDraftMeaningful,
  projectPlanningClarificationAnswerIssues,
  validatePlanningClarificationAnswerDraft,
  type PlanningClarificationAnswerDraft,
  type PlanningClarificationAnswerIssuePresentation
} from "../../lib/planningClarificationAnswerDraft";
import type { PlanningClarificationAnswerSchema } from "../../lib/planningClarificationAnswerSchema";
import {
  selectPlanningClarificationAnswerEntry,
  selectPlanningClarificationAnswerReview
} from "../../lib/planningClarificationAnswerEntryViewModel";
import type { ProjectPlanningState } from "../../lib/planningProposals";
import { ClarificationAnswerPrimitiveEditor } from "./ClarificationAnswerPrimitiveEditor";
import { ClarificationAnswerStructuredEditor } from "./ClarificationAnswerStructuredEditor";

export interface PlanningDecisionUiFeedback {
  successful: boolean;
  message: string;
}

export type SubmitPlanningClarificationDecision = (
  projectId: string,
  input: PlanningClarificationDecisionRepositoryInput<PlanningClarificationHumanDecisionAction>
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
const PARTIAL_EDIT_FAILURE_MESSAGE =
  "The item was reopened, but the updated answer was not saved. Your draft is preserved.";
const DEFERRED_HISTORY_UNAVAILABLE_MESSAGE =
  "This deferred item cannot be resumed because its saved decision history could not be validated.";

type AnswerSessionMode = "first" | "edit" | "change";

interface AnswerSession {
  mode: AnswerSessionMode;
  proposalId: string;
  ruleId: string;
  ruleVersion: string;
  schema: PlanningClarificationAnswerSchema;
  draft: PlanningClarificationAnswerDraft;
  initialDraft?: PlanningClarificationAnswerDraft;
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
  const [partialEditFailure, setPartialEditFailure] = useState(false);
  const reasonInputId = useId();
  const reasonFormId = useId();
  const answerFormId = useId();
  const answerHeadingId = useId();
  const answerErrorSummaryId = useId();
  const answerStaleStatusId = useId();
  const partialEditFailureId = useId();
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  const answerHeadingRef = useRef<HTMLHeadingElement>(null);
  const answerEditorRegionRef = useRef<HTMLDivElement>(null);
  const answerErrorSummaryRef = useRef<HTMLDivElement>(null);
  const answerStaleStatusRef = useRef<HTMLParagraphElement>(null);
  const partialEditFailureRef = useRef<HTMLParagraphElement>(null);
  const answerButtonRef = useRef<HTMLButtonElement>(null);
  const reasonButtonRefs = useRef<Partial<Record<ReasonAction, HTMLButtonElement | null>>>({});
  const returnFocusActionRef = useRef<ReasonAction | null>(null);
  const focusInitialAnswerControlRef = useRef(false);
  const returnFocusToAnswerRef = useRef(false);
  const previousAnswerSessionIsCurrentRef = useRef(true);
  const submissionPendingRef = useRef(false);
  const editReopenCompletedRef = useRef(false);
  const dirtyCallbackRef = useRef(onAnswerDraftMeaningfulChange);
  const capabilities = useMemo(
    () => analyzePlanningClarificationDecisionCapabilities({ projectId, planning, proposalId }).capabilities,
    [planning, projectId, proposalId]
  );
  const answerEntrySelection = useMemo(
    () => selectPlanningClarificationAnswerEntry({ projectId, planning, proposalId }),
    [planning, projectId, proposalId]
  );
  const savedAnswerSelection = useMemo(
    () => selectPlanningClarificationAnswerReview({ projectId, planning, proposalId }),
    [planning, projectId, proposalId]
  );
  const confirmAvailable = capabilities.some(
    (entry) => entry.action === "confirm" && entry.state === "available" && entry.requiredInput === "none"
  );
  const availableReasonActions = REASON_ACTIONS.filter(({ action }) => capabilities.some(
    (entry) => entry.action === action && entry.state === "inputRequired" && entry.requiredInput === "reason"
  ));
  const resumeAvailable = capabilities.some(
    (entry) => entry.action === "reopen" && entry.state === "available" && entry.requiredInput === "none"
  ) && planning.proposals.some((proposal) => proposal.proposalId === proposalId && proposal.status === "Deferred");
  const deferredProposal = planning.proposals.some(
    (proposal) => proposal.proposalId === proposalId && proposal.status === "Deferred"
  );
  const activeReasonConfig = availableReasonActions.find(({ action }) => action === activeReasonAction);
  const currentAnswerIdentityMatches = answerSession !== null && (
    answerSession.mode === "first"
      ? answerEntrySelection.state === "eligible" &&
        answerEntrySelection.proposalId === answerSession.proposalId &&
        answerEntrySelection.ruleId === answerSession.ruleId &&
        answerEntrySelection.ruleVersion === answerSession.ruleVersion
      : savedAnswerSelection.state === "available" &&
        savedAnswerSelection.proposalId === answerSession.proposalId &&
        savedAnswerSelection.ruleId === answerSession.ruleId &&
        savedAnswerSelection.ruleVersion === answerSession.ruleVersion &&
        (answerSession.mode === "change"
          ? savedAnswerSelection.status === "Confirmed"
          : savedAnswerSelection.status === "Revised" || savedAnswerSelection.status === "Needs Clarification")
  );
  const answerSessionIsCurrent = answerSession !== null && currentAnswerIdentityMatches;
  const answerDraftMeaningful = answerSession !== null && (
    answerSession.mode === "first"
      ? isPlanningClarificationAnswerDraftMeaningful(answerSession.draft)
      : Boolean(answerSession.initialDraft) &&
        !arePlanningClarificationAnswerDraftsSemanticallyEqual(answerSession.draft, answerSession.initialDraft!)
  );
  const answerStartMode: AnswerSessionMode | null = savedAnswerSelection.state === "available"
    ? savedAnswerSelection.status === "Confirmed" ? "change" : savedAnswerSelection.status === "Deferred" ? null : "edit"
    : answerEntrySelection.state === "eligible" ? "first" : null;
  const answerStartLabel = answerStartMode === "edit"
    ? "Edit answer"
    : answerStartMode === "change" ? "Change answer" : "Answer question";

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
    if (focusInitialAnswerControlRef.current && answerSession) {
      focusInitialAnswerControlRef.current = false;
      const firstEnabledControl = answerEditorRegionRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])"
      );
      (firstEnabledControl ?? answerHeadingRef.current)?.focus();
    }
    if (returnFocusToAnswerRef.current && !answerSession && (
      answerEntrySelection.state === "eligible" || savedAnswerSelection.state === "available"
    )) {
      returnFocusToAnswerRef.current = false;
      answerButtonRef.current?.focus();
    }
  }, [answerEntrySelection.state, answerSession, savedAnswerSelection.state]);

  useEffect(() => {
    if (answerSession && previousAnswerSessionIsCurrentRef.current && !answerSessionIsCurrent) {
      answerStaleStatusRef.current?.focus();
    }
    previousAnswerSessionIsCurrentRef.current = answerSession ? answerSessionIsCurrent : true;
  }, [answerSession, answerSessionIsCurrent]);

  useEffect(() => {
    if (answerIssues.length > 0) answerErrorSummaryRef.current?.focus();
  }, [answerIssues]);

  useEffect(() => {
    if (partialEditFailure) partialEditFailureRef.current?.focus();
  }, [partialEditFailure]);

  if (
    !confirmAvailable &&
    availableReasonActions.length === 0 &&
    answerEntrySelection.state === "unavailable" &&
    savedAnswerSelection.state === "unavailable" &&
    !resumeAvailable &&
    !deferredProposal &&
    !answerSession
  ) {
    return null;
  }

  const submitDecision = async (
    input: PlanningClarificationDecisionRepositoryInput<PlanningClarificationHumanDecisionAction>,
    kind: "answer" | "decision" = "decision",
    feedbackMode: "all" | "failures" | "none" = "all"
  ): Promise<PlanningClarificationDecisionFeedback | undefined> => {
    if (submissionPendingRef.current) return undefined;

    submissionPendingRef.current = true;
    setSubmitting(true);
    setSubmissionKind(kind);
    onFeedback(null);
    try {
      const result = await onSubmitClarificationDecision(projectId, input);
      if (feedbackMode === "all" || (feedbackMode === "failures" && !result.feedback.successful)) {
        onFeedback(result.feedback);
      }
      if (result.feedback.successful) {
        setActiveReasonAction(null);
        setReason("");
      }
      return result.feedback;
    } catch {
      if (feedbackMode !== "none") {
        onFeedback({ successful: false, message: UNEXPECTED_ERROR_MESSAGE });
      }
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
    if (submissionPendingRef.current || !answerStartMode) return;
    let schema: PlanningClarificationAnswerSchema;
    let draft: PlanningClarificationAnswerDraft;
    let initialDraft: PlanningClarificationAnswerDraft | undefined;
    let ruleId: string;
    let ruleVersion: string;

    if (answerStartMode === "first") {
      if (answerEntrySelection.state !== "eligible") return;
      schema = answerEntrySelection.schema;
      draft = createEmptyPlanningClarificationAnswerDraft(schema);
      ruleId = answerEntrySelection.ruleId;
      ruleVersion = answerEntrySelection.ruleVersion;
    } else {
      if (savedAnswerSelection.state !== "available") return;
      const hydration = hydratePlanningClarificationAnswerDraft(
        savedAnswerSelection.schema,
        savedAnswerSelection.answer,
        answerFormId
      );
      if (hydration.outcome !== "hydrated") return;
      schema = savedAnswerSelection.schema;
      draft = hydration.draft;
      initialDraft = hydration.draft;
      ruleId = savedAnswerSelection.ruleId;
      ruleVersion = savedAnswerSelection.ruleVersion;
    }
    setActiveReasonAction(null);
    setReason("");
    setAnswerIssues([]);
    setPartialEditFailure(false);
    editReopenCompletedRef.current = answerStartMode === "edit" &&
      savedAnswerSelection.state === "available" &&
      savedAnswerSelection.status === "Needs Clarification";
    focusInitialAnswerControlRef.current = true;
    setAnswerSession({
      mode: answerStartMode,
      proposalId,
      ruleId,
      ruleVersion,
      schema,
      draft,
      initialDraft
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
    setPartialEditFailure(false);
    editReopenCompletedRef.current = false;
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
    if (answerSession.mode !== "first" && !answerDraftMeaningful) return;
    const validation = validatePlanningClarificationAnswerDraft(answerSession.schema, answerSession.draft);
    if (validation.outcome === "invalid") {
      setAnswerIssues(projectPlanningClarificationAnswerIssues(answerSession.schema, validation.issues));
      return;
    }

    setAnswerIssues([]);
    if (answerSession.mode === "edit" && !editReopenCompletedRef.current) {
      const reopenFeedback = await submitDecision({
        proposalId: answerSession.proposalId,
        action: "reopen"
      }, "answer", "failures");
      if (!reopenFeedback?.successful) return;
      editReopenCompletedRef.current = true;
    }

    const suppressRevisionFailure = answerSession.mode === "edit" && editReopenCompletedRef.current;
    const feedback = await submitDecision({
      proposalId: answerSession.proposalId,
      action: "revise",
      value: validation.answer
    }, "answer", suppressRevisionFailure ? "none" : "all");
    if (feedback?.successful) {
      if (suppressRevisionFailure) onFeedback(feedback);
      closeAnswerSession();
    } else if (suppressRevisionFailure) {
      onFeedback(null);
      setPartialEditFailure(true);
    }
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

      {!answerSession && deferredProposal && !resumeAvailable ? (
        <p className="planning-decision-answer-note">
          {DEFERRED_HISTORY_UNAVAILABLE_MESSAGE}
        </p>
      ) : null}

      {!answerSession && answerStartMode ? (
        <div className="planning-decision-answer-start">
          <button
            className="button button-primary"
            disabled={submitting}
            ref={answerButtonRef}
            type="button"
            onClick={startAnswer}
          >
            {answerStartLabel}
          </button>
        </div>
      ) : null}


      {!answerSession && resumeAvailable ? (
        <div className="planning-decision-answer-start">
          <button
            className="button button-primary"
            disabled={submitting}
            type="button"
            onClick={() => void submitDecision({ proposalId, action: "reopen" })}
          >
            Resume decision
          </button>
        </div>
      ) : null}

      {answerSession ? (
        <form
          aria-busy={submitting}
          aria-describedby={[
            !answerSessionIsCurrent ? answerStaleStatusId : null,
            partialEditFailure ? partialEditFailureId : null,
            answerIssues.length > 0 ? answerErrorSummaryId : null
          ].filter(Boolean).join(" ") || undefined}
          aria-labelledby={answerHeadingId}
          className="planning-decision-answer-form"
          id={answerFormId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void saveAnswer();
          }}
        >
          <h4 id={answerHeadingId} ref={answerHeadingRef} tabIndex={-1}>
            {answerSession.mode === "edit"
              ? "Edit answer"
              : answerSession.mode === "change" ? "Change answer" : "Answer question"}
          </h4>
          {!answerSessionIsCurrent ? (
            <p
              aria-live="polite"
              className="planning-decision-answer-stale"
              id={answerStaleStatusId}
              ref={answerStaleStatusRef}
              role="status"
              tabIndex={-1}
            >
              {ANSWER_STATE_CHANGED_MESSAGE}
            </p>
          ) : null}
          {partialEditFailure ? (
            <p
              aria-live="polite"
              className="planning-decision-answer-partial"
              id={partialEditFailureId}
              ref={partialEditFailureRef}
              role="status"
              tabIndex={-1}
            >
              {PARTIAL_EDIT_FAILURE_MESSAGE}
            </p>
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
          <div className="planning-decision-answer-editor" ref={answerEditorRegionRef}>
            <AnswerEditor
              disabled={submitting || !answerSessionIsCurrent}
              draft={answerSession.draft}
              issues={answerIssues}
              schema={answerSession.schema}
              onChange={updateAnswerDraft}
            />
          </div>
          <div className="planning-decision-form-actions">
            <button
              className="button button-primary"
              disabled={submitting || !answerSessionIsCurrent ||
                (answerSession.mode !== "first" && !answerDraftMeaningful)}
              type="submit"
            >
              {answerSession.mode === "edit"
                ? "Save updated answer for review"
                : answerSession.mode === "change" ? "Save changed answer for review" : "Save answer for review"}
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

      {!answerSession && (confirmAvailable || availableReasonActions.length > 0) ? (
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
