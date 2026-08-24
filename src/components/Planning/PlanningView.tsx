import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buildPlanningUiViewModel,
  type PlanningUiApplyState,
  type PlanningUiConflict,
  type PlanningUiDependency,
  type PlanningUiHistoryItem,
  type PlanningUiProposal,
  type PlanningUiSource
} from "../../lib/planningUiViewModel";
import {
  planningClarificationAnswerSchemaUnavailableMessage,
  selectPlanningClarificationAnswerReview,
  selectPlanningClarificationDeferral
} from "../../lib/planningClarificationAnswerEntryViewModel";
import {
  buildPlanningClarificationAnswerSchemaContext,
  type PlanningClarificationAnswerSchemaContext
} from "../../lib/planningClarificationAnswerSchemaResolver";
import type { PlanningClarificationOrchestrationResult } from "../../lib/planningClarificationOrchestration";
import type { ProjectRecord } from "../../types/project";
import {
  ClarificationDecisionControls,
  type PlanningDecisionUiFeedback,
  type SubmitPlanningClarificationDecision
} from "./ClarificationDecisionControls";
import { ClarificationAnswerValueRenderer } from "./ClarificationAnswerValueRenderer";

interface PlanningViewProps {
  project: ProjectRecord;
  hasMeaningfulPlanningAnswerDrafts: boolean;
  onGenerateOrRefreshPlanning: (projectId: string) => Promise<PlanningClarificationOrchestrationResult>;
  onSubmitClarificationDecision: SubmitPlanningClarificationDecision;
  onAnswerDraftMeaningfulChange: (proposalId: string, meaningful: boolean) => void;
}

export function PlanningView({
  project,
  hasMeaningfulPlanningAnswerDrafts,
  onGenerateOrRefreshPlanning,
  onSubmitClarificationDecision,
  onAnswerDraftMeaningfulChange
}: PlanningViewProps) {
  const mainRef = useRef<HTMLElement>(null);
  const decisionFeedbackRef = useRef<HTMLDivElement>(null);
  const planningOperationFeedbackRef = useRef<HTMLDivElement>(null);
  const operationPendingRef = useRef(false);
  const [decisionFeedback, setDecisionFeedback] = useState<PlanningDecisionUiFeedback | null>(null);
  const [planningOperationFeedback, setPlanningOperationFeedback] = useState<PlanningClarificationOrchestrationResult | null>(null);
  const [planningOperationPending, setPlanningOperationPending] = useState(false);
  const model = useMemo(() => buildPlanningUiViewModel(project), [project]);
  const answerSchemaContext = useMemo(
    () => buildPlanningClarificationAnswerSchemaContext(project),
    [project]
  );

  useEffect(() => {
    mainRef.current?.focus();
  }, []);

  useEffect(() => {
    if (decisionFeedback?.successful) {
      decisionFeedbackRef.current?.focus();
    }
  }, [decisionFeedback]);

  useEffect(() => {
    if (planningOperationFeedback) planningOperationFeedbackRef.current?.focus();
  }, [planningOperationFeedback]);

  const supportedProject = project.intake.appType === "powerAppsCanvas";
  const runPlanningOperation = async () => {
    if (operationPendingRef.current || !supportedProject || model.state === "invalid") return;
    if (model.state === "ready" && hasMeaningfulPlanningAnswerDrafts) return;
    operationPendingRef.current = true;
    setPlanningOperationPending(true);
    setPlanningOperationFeedback(null);
    try {
      setPlanningOperationFeedback(await onGenerateOrRefreshPlanning(project.identity.id));
    } catch {
      setPlanningOperationFeedback({
        outcome: "persistenceFailed",
        successful: false,
        message: "Planning could not be saved safely. Review the latest project state and try again."
      });
    } finally {
      operationPendingRef.current = false;
      setPlanningOperationPending(false);
    }
  };

  return (
    <main className="page planning-page" id="main-content" tabIndex={-1} ref={mainRef}>
      <div className="page-heading planning-page-heading">
        <div>
          <h1>Architecture Planning</h1>
          <p>Review persisted planning recommendations, questions, evidence, conflicts, and application history.</p>
        </div>
        {model.state !== "invalid" ? (
          <div className="planning-heading-actions">
            <span className="planning-item-count">
              {model.proposalCount} planning item{model.proposalCount === 1 ? "" : "s"}
            </span>
            {supportedProject && model.state === "ready" ? (
              <button
                aria-busy={planningOperationPending}
                aria-describedby={hasMeaningfulPlanningAnswerDrafts ? "planning-refresh-disabled-reason" : undefined}
                className="button button-secondary"
                disabled={planningOperationPending || hasMeaningfulPlanningAnswerDrafts}
                type="button"
                onClick={() => void runPlanningOperation()}
              >
                Refresh planning
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {supportedProject && model.state === "ready" && hasMeaningfulPlanningAnswerDrafts ? (
        <p className="planning-refresh-disabled-reason" id="planning-refresh-disabled-reason">
          Finish or discard unsaved planning answers before refreshing planning.
        </p>
      ) : null}

      {planningOperationPending ? (
        <p className="planning-operation-progress" role="status" aria-live="polite" aria-atomic="true">
          {model.state === "empty" ? "Generating planning..." : "Refreshing planning..."}
        </p>
      ) : null}

      {planningOperationFeedback ? (
        <div
          className={`planning-operation-feedback ${planningOperationFeedback.successful ? "is-success" : "is-unsuccessful"}`}
          ref={planningOperationFeedbackRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={-1}
        >
          {planningOperationFeedback.message}
        </div>
      ) : null}

      {model.issues.length > 0 ? (
        <div className="planning-issue" role="alert">
          <strong>Some planning information cannot be displayed safely.</strong>
          {model.issues.map((issue) => <p key={issue.code}>{issue.message}</p>)}
        </div>
      ) : null}

      {decisionFeedback ? (
        <div
          className={`planning-decision-feedback ${decisionFeedback.successful ? "is-success" : "is-unsuccessful"}`}
          ref={decisionFeedbackRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={-1}
        >
          {decisionFeedback.message}
        </div>
      ) : null}

      {model.state === "empty" ? (
        <section className="planning-empty" aria-labelledby="planning-empty-title">
          {supportedProject ? (
            <>
              <h2 id="planning-empty-title">Planning has not been generated yet</h2>
              <p>Generate deterministic architecture clarification questions from the project's current intake and readiness state.</p>
              <button
                aria-busy={planningOperationPending}
                className="button button-primary"
                disabled={planningOperationPending}
                type="button"
                onClick={() => void runPlanningOperation()}
              >
                Generate planning
              </button>
            </>
          ) : (
            <>
              <h2 id="planning-empty-title">Planning is not available for this project type</h2>
              <p>Deterministic clarification planning is currently available only for supported Canvas projects.</p>
            </>
          )}
        </section>
      ) : null}

      {model.state !== "invalid" && model.groups.length > 0 ? (
        <div className="planning-groups">
          {model.groups.map((group) => (
            <section className="planning-group" aria-labelledby={`planning-group-${group.id}`} key={group.id}>
              <div className="planning-group-heading">
                <h2 id={`planning-group-${group.id}`}>{group.label}</h2>
                <span>{group.proposals.length}</span>
              </div>
              <div className="planning-proposal-list">
                {group.proposals.map((proposal) => (
                  <PlanningProposalCard
                    project={project}
                    answerSchemaContext={answerSchemaContext}
                    proposal={proposal}
                    onSubmitClarificationDecision={onSubmitClarificationDecision}
                    onDecisionFeedback={setDecisionFeedback}
                    onAnswerDraftMeaningfulChange={onAnswerDraftMeaningfulChange}
                    key={proposal.key}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {model.state !== "invalid" && model.history.length > 0 ? <PlanningHistory history={model.history} /> : null}
    </main>
  );
}

function PlanningProposalCard({
  project,
  answerSchemaContext,
  proposal,
  onSubmitClarificationDecision,
  onDecisionFeedback,
  onAnswerDraftMeaningfulChange
}: {
  project: ProjectRecord;
  answerSchemaContext: PlanningClarificationAnswerSchemaContext;
  proposal: PlanningUiProposal;
  onSubmitClarificationDecision: SubmitPlanningClarificationDecision;
  onDecisionFeedback: (feedback: PlanningDecisionUiFeedback | null) => void;
  onAnswerDraftMeaningfulChange: (proposalId: string, meaningful: boolean) => void;
}) {
  const answerReviewHeadingId = useId();
  const answerReview = project.planning
    ? selectPlanningClarificationAnswerReview({
        projectId: project.identity.id,
        planning: project.planning,
        proposalId: proposal.key,
        answerSchemaContext
      })
    : { state: "unavailable" as const };
  const deferral = project.planning
    ? selectPlanningClarificationDeferral({
        projectId: project.identity.id,
        planning: project.planning,
        proposalId: proposal.key
      })
    : { state: "unavailable" as const };

  return (
    <article className={`planning-proposal status-${proposal.status.toLowerCase().replace(/\s+/g, "-")}`}>
      <header className="planning-proposal-header">
        <div>
          <span className="planning-target">{proposal.targetArea}</span>
          <h3>{proposal.title}</h3>
        </div>
        <div className="planning-proposal-badges">
          <span className="planning-status">{proposal.statusLabel}</span>
          <span className={`planning-uncertainty uncertainty-${proposal.uncertainty.toLowerCase()}`}>
            Uncertainty: {proposal.uncertainty}
          </span>
        </div>
      </header>

      <p className="planning-recommendation">{proposal.recommendation}</p>

      <section className="planning-rationale" aria-label="Planning rationale">
        <h4>Why this is recommended</h4>
        <dl>
          <div><dt>Recommendation</dt><dd>{proposal.recommendation}</dd></div>
          <div><dt>Rationale</dt><dd>{proposal.rationale}</dd></div>
          {proposal.consequence ? <div><dt>Potential consequence</dt><dd>{proposal.consequence}</dd></div> : null}
        </dl>
      </section>

      <PlanningSources sources={proposal.sources} />

      {proposal.dependencies.length > 0 || proposal.conflicts.length > 0 ? (
        <details className="planning-disclosure planning-relationship-disclosure">
          <summary>Dependency and conflict details</summary>
          <div className="planning-disclosure-content">
            {proposal.dependencies.length > 0 ? <PlanningDependencies dependencies={proposal.dependencies} /> : null}
            {proposal.conflicts.length > 0 ? <PlanningConflicts conflicts={proposal.conflicts} /> : null}
          </div>
        </details>
      ) : null}

      {proposal.applyState ? <PlanningApplyState applyState={proposal.applyState} /> : null}

      {deferral.state === "available" ? (
        <section className="planning-deferral-reason" aria-label="Deferral reason">
          <h4>Deferral reason</h4>
          <p>{deferral.reason}</p>
        </section>
      ) : null}

      {answerReview.state === "available" ? (
        <section className="planning-answer-review" aria-labelledby={answerReviewHeadingId}>
          <h4 id={answerReviewHeadingId}>
            {answerReview.status === "Revised"
              ? "Answer for review"
              : answerReview.status === "Confirmed" ? "Confirmed answer" : "Saved answer"}
          </h4>
          <ClarificationAnswerValueRenderer
            answer={answerReview.answer}
            schema={answerReview.schema}
          />
        </section>
      ) : null}

      {answerReview.state === "schemaUnavailable" ? (
        <p className="planning-answer-review-unavailable" role="status">
          {planningClarificationAnswerSchemaUnavailableMessage(answerReview.reason)}
        </p>
      ) : null}

      {project.planning ? (
        <ClarificationDecisionControls
          projectId={project.identity.id}
          planning={project.planning}
          answerSchemaContext={answerSchemaContext}
          proposalId={proposal.key}
          proposalTitle={proposal.title}
          onSubmitClarificationDecision={onSubmitClarificationDecision}
          onFeedback={onDecisionFeedback}
          onAnswerDraftMeaningfulChange={onAnswerDraftMeaningfulChange}
        />
      ) : null}
    </article>
  );
}

function PlanningSources({ sources }: { sources: readonly PlanningUiSource[] }) {
  return (
    <section className="planning-sources" aria-label="Supporting sources">
      <h4>Sources</h4>
      {sources.length > 0 ? (
        <ul>
          {sources.map((source, index) => {
            const hasDetails = Boolean(source.excerpt || source.version || source.observedAt);
            return (
              <li className={source.resolved ? "" : "is-unavailable"} key={`${source.label}-${index}`}>
                <div className="planning-source-summary">
                  <strong>{source.label}</strong>
                  <span>{source.sourceType}</span>
                  <span>Authority: {source.authority}</span>
                  <span>Availability: {source.availability}</span>
                </div>
                {hasDetails ? (
                  <details className="planning-disclosure planning-source-disclosure">
                    <summary>Source details</summary>
                    <dl className="planning-source-details">
                      {source.version ? <div><dt>Version</dt><dd>{source.version}</dd></div> : null}
                      {source.observedAt ? <div><dt>Observed</dt><dd>{source.observedAt}</dd></div> : null}
                      {source.excerpt ? <div><dt>Excerpt</dt><dd>{source.excerpt}</dd></div> : null}
                    </dl>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : <p>No persisted source references are available.</p>}
    </section>
  );
}

function PlanningDependencies({ dependencies }: { dependencies: readonly PlanningUiDependency[] }) {
  return (
    <section>
      <h4>Dependencies</h4>
      <ul className="planning-relationship-list">
        {dependencies.map((dependency, index) => (
          <li key={`${dependency.dependencyType}-${dependency.targetLabel}-${index}`}>
            <strong>{dependency.dependencyType}</strong>
            <span>{dependency.required ? "Required" : "Informational"}</span>
            <p>{dependency.targetLabel}</p>
            <p>{dependency.rationale}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlanningConflicts({ conflicts }: { conflicts: readonly PlanningUiConflict[] }) {
  return (
    <section>
      <h4>Conflicts</h4>
      <ul className="planning-relationship-list">
        {conflicts.map((conflict, index) => (
          <li key={`${conflict.severity}-${conflict.status}-${index}`}>
            <strong>Severity: {conflict.severity}</strong>
            <span>Status: {conflict.status}</span>
            <p>{conflict.explanation}</p>
            {conflict.affectedProposalTitles.length > 0 ? (
              <p>Affected planning items: {conflict.affectedProposalTitles.join(", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlanningApplyState({ applyState }: { applyState: PlanningUiApplyState }) {
  return (
    <section className={`planning-apply-state apply-${applyState.state}`} aria-label="Read-only Apply state">
      <h4>Apply state</h4>
      <strong>{applyState.label}</strong>
      {applyState.state === "ready" ? (
        <dl className="planning-value-comparison">
          <div><dt>Target field</dt><dd>{applyState.fieldLabel}</dd></div>
          <div><dt>Current value</dt><dd>{applyState.currentValue || "Empty"}</dd></div>
          <div><dt>Proposed value</dt><dd>{applyState.proposedValue}</dd></div>
          <div><dt>Expected result</dt><dd>{applyState.historyOutcome === "changed" ? "Changed" : "Unchanged"}</dd></div>
        </dl>
      ) : null}
      {applyState.state === "blocked" && applyState.details.length > 0 ? (
        <details className="planning-disclosure">
          <summary>Availability details</summary>
          <ul>{applyState.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
        </details>
      ) : null}
    </section>
  );
}

function PlanningHistory({ history }: { history: readonly PlanningUiHistoryItem[] }) {
  return (
    <section className="planning-history" aria-labelledby="planning-history-heading">
      <div className="planning-group-heading">
        <h2 id="planning-history-heading">Applied history</h2>
        <span>{history.length}</span>
      </div>
      <ol>
        {history.map((item) => (
          <li key={item.key}>
            <article className="planning-history-item">
              <div className="planning-history-summary">
                <div>
                  <strong>{item.proposalTitle ?? item.fieldLabel}</strong>
                  <span>{item.appliedAt}</span>
                </div>
                <div>
                  <span>{item.fieldLabel}</span>
                  <strong>{item.outcome}</strong>
                </div>
              </div>
              <details className="planning-disclosure planning-history-disclosure">
                <summary>Show previous and applied values</summary>
                <dl className="planning-history-values">
                  <div><dt>Previous value</dt><dd>{item.previousValue || "Empty"}</dd></div>
                  <div><dt>Applied value</dt><dd>{item.appliedValue || "Empty"}</dd></div>
                </dl>
              </details>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
