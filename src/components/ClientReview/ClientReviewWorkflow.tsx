import { useMemo, useState } from "react";
import {
  formatClientQuestions,
  getClientReviewReadiness,
  groupClientQuestions
} from "../../lib/clientReview";
import {
  REVIEW_ITEM_STATUSES,
  type ReadinessChecklistId,
  type ReviewItem,
  type ProjectRecord
} from "../../types/project";
import { Check, CircleAlert } from "../ui/Icons";

interface ClientReviewWorkflowProps {
  project: ProjectRecord;
  onUpdateReviewItem: (
    reviewItemId: string,
    changes: Partial<Pick<ReviewItem, "status" | "notApplicableReason" | "deferredReason">>
  ) => void;
  onToggleReadiness: (checklistId: ReadinessChecklistId, checked: boolean) => void;
}

export function ClientReviewWorkflow({
  project,
  onUpdateReviewItem,
  onToggleReadiness
}: ClientReviewWorkflowProps) {
  const [copyStatus, setCopyStatus] = useState("");
  const readiness = useMemo(() => getClientReviewReadiness(project), [project]);
  const questionGroups = useMemo(() => groupClientQuestions(project.reviewItems), [project.reviewItems]);

  const copyQuestions = async () => {
    const text = formatClientQuestions(project.reviewItems);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Client questions copied.");
    } catch {
      setCopyStatus("Copy failed. Select the questions below and copy them manually.");
    }
  };

  return (
    <div className="client-review-workflow">
      <div
        className={readiness.isReady ? "review-banner is-ready" : "review-banner has-errors"}
        role="status"
        aria-live="polite"
      >
        {readiness.isReady ? <Check size={28} aria-hidden="true" /> : <CircleAlert size={28} aria-hidden="true" />}
        <div>
          <h2>{readiness.isReady ? "Ready for Codex" : "Draft package"}</h2>
          <p>
            {readiness.isReady
              ? "The client review and every blocking readiness check are complete."
              : `${readiness.blockerCount} readiness blocker${readiness.blockerCount === 1 ? "" : "s"} remain. Draft generation and export are still allowed.`}
          </p>
        </div>
      </div>

      <section className="client-review-section" aria-labelledby="missing-review-heading">
        <div className="client-review-heading">
          <div>
            <span>Client review</span>
            <h3 id="missing-review-heading">Missing Information Review</h3>
            <p>Resolve each gap, record why it does not apply, or explicitly defer eligible non-blocking detail.</p>
          </div>
          <strong>{readiness.unresolvedItems.length} unresolved</strong>
        </div>

        {project.reviewItems.length > 0 ? (
          <div className="review-item-list">
            {project.reviewItems.map((item) => (
              <article className={`review-item-card status-${item.status.toLowerCase().replace(/\s+/g, "-")}`} key={item.id}>
                <div className="review-item-title">
                  <div>
                    <span>{item.section}</span>
                    <h4>{item.label}</h4>
                  </div>
                  <span className="review-source">{item.source === "weak" ? "Needs confirmation" : item.source}</span>
                </div>
                <dl className="review-item-details">
                  <div>
                    <dt>Why this matters</dt>
                    <dd>{item.reason}</dd>
                  </div>
                  <div>
                    <dt>Recommended client question</dt>
                    <dd>{item.recommendedQuestion}</dd>
                  </div>
                  <div>
                    <dt>Action</dt>
                    <dd>{item.blocking ? "Resolve before Ready for Codex." : "Confirm now or defer with a reason."}</dd>
                  </div>
                </dl>
                <div className="review-item-controls">
                  <div className="form-field compact-field">
                    <label htmlFor={`review-status-${item.id}`}>Status</label>
                    <select
                      id={`review-status-${item.id}`}
                      value={item.status}
                      onChange={(event) => onUpdateReviewItem(item.id, { status: event.target.value as ReviewItem["status"] })}
                    >
                      {REVIEW_ITEM_STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </div>
                  {item.status === "Not applicable" ? (
                    <div className="form-field compact-field review-reason-field">
                      <label htmlFor={`review-na-${item.id}`}>Why this is not applicable <span className="required-label">Required</span></label>
                      <input
                        id={`review-na-${item.id}`}
                        value={item.notApplicableReason}
                        onChange={(event) => onUpdateReviewItem(item.id, { notApplicableReason: event.target.value })}
                        placeholder="Short reason"
                        aria-invalid={!item.notApplicableReason.trim()}
                      />
                    </div>
                  ) : null}
                  {item.status === "Deferred" ? (
                    <div className="form-field compact-field review-reason-field">
                      <label htmlFor={`review-deferred-${item.id}`}>Deferral reason <span className="required-label">Required</span></label>
                      <input
                        id={`review-deferred-${item.id}`}
                        value={item.deferredReason}
                        onChange={(event) => onUpdateReviewItem(item.id, { deferredReason: event.target.value })}
                        placeholder="Why and when this will be resolved"
                        aria-invalid={!item.deferredReason.trim() || item.blocking || !item.allowDeferred}
                      />
                      {item.blocking || !item.allowDeferred ? <p>Deferral is recorded, but this item still blocks readiness.</p> : null}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-review-state">No missing or weak information was identified.</p>
        )}
      </section>

      <section className="client-review-section" aria-labelledby="client-questions-heading">
        <div className="client-review-heading">
          <div>
            <span>Meeting aid</span>
            <h3 id="client-questions-heading">Client Questions Review</h3>
            <p>Grouped plain-language questions for client review. This same structure is written to CLIENT_QUESTIONS.md.</p>
          </div>
          <button className="button button-secondary" type="button" onClick={copyQuestions}>Copy all questions</button>
        </div>
        <p className="copy-status" role="status" aria-live="polite">{copyStatus}</p>
        {questionGroups.length > 0 ? (
          <div className="question-groups">
            {questionGroups.map((group) => (
              <article key={group.section}>
                <h4>{group.section}</h4>
                <ul>
                  {group.items.map((item) => <li key={item.id}>{item.recommendedQuestion}</li>)}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-review-state">No unresolved client questions.</p>
        )}
      </section>

      <section className="client-review-section" aria-labelledby="readiness-checklist-heading">
        <div className="client-review-heading">
          <div>
            <span>Final gate</span>
            <h3 id="readiness-checklist-heading">Ready for Codex checklist</h3>
            <p>Automatic checks update from intake and review decisions. Review confirmations are checked manually.</p>
          </div>
          <strong>{readiness.checklist.filter((item) => item.passed).length}/{readiness.checklist.length} complete</strong>
        </div>
        <ul className="readiness-checklist">
          {readiness.checklist.map((item) => (
            <li className={item.passed ? "is-complete" : ""} key={item.id}>
              {item.manual ? (
                <label>
                  <input
                    type="checkbox"
                    checked={item.passed}
                    onChange={(event) => onToggleReadiness(item.id, event.target.checked)}
                  />
                  <span>{item.label}</span>
                </label>
              ) : (
                <div>
                  {item.passed ? <Check size={18} aria-hidden="true" /> : <CircleAlert size={18} aria-hidden="true" />}
                  <span>{item.label}</span>
                </div>
              )}
              {!item.passed ? <p>{item.reason}</p> : null}
            </li>
          ))}
        </ul>
        {!readiness.isReady ? (
          <div className="readiness-blockers">
            <h4>Current blockers</h4>
            <ul>{readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
