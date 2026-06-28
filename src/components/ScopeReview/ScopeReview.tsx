import { intakeSteps } from "../../data/intakeSteps";
import { getProjectFieldValue } from "../../lib/projectFields";
import { getStepCompletion } from "../../lib/validateIntake";
import type { ProjectRecord, ValidationIssue } from "../../types/project";
import { ArrowRight, Check, CircleAlert } from "../ui/Icons";

interface ScopeReviewProps {
  project: ProjectRecord;
  issues: ValidationIssue[];
  outstandingCount: number;
  onEditStep: (step: number) => void;
  onViewDocuments: () => void;
}

export function ScopeReview({
  project,
  issues,
  outstandingCount,
  onEditStep,
  onViewDocuments
}: ScopeReviewProps) {
  return (
    <main className="page" id="main-content">
      <div className="page-heading">
        <div>
          <h1>Scope Review</h1>
          <p>Check completeness and resolve contradictions before Architect review.</p>
        </div>
        <button className="button button-primary" onClick={onViewDocuments} disabled={issues.length > 0}>
          Preview package
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>

      <section className={`review-banner ${issues.length ? "has-errors" : "is-ready"}`}>
        {issues.length ? <CircleAlert size={26} aria-hidden="true" /> : <Check size={26} aria-hidden="true" />}
        <div>
          <h2>{issues.length ? `${issues.length} required decision${issues.length === 1 ? "" : "s"} blocked` : "Required intake is complete"}</h2>
          <p>
            {outstandingCount} optional question{outstandingCount === 1 ? "" : "s"} will appear as explicit `[MISSING: ...]` markers in generated documents.
          </p>
        </div>
      </section>

      <section className="scope-summary" aria-labelledby="scope-summary-title">
        <div className="section-heading">
          <div>
          <h2 id="scope-summary-title">{project.identity.projectName || "Untitled project"}</h2>
          <p>{project.intake.appPurpose || "[MISSING: app purpose]"}</p>
          </div>
        </div>
        <div className="scope-list">
          {intakeSteps.slice(0, -1).map((step, stepIndex) => {
            const completion = getStepCompletion(project, stepIndex);
            const missingFields = step.fields.filter((field) => !getProjectFieldValue(project, field.name).trim());
            return (
              <article key={step.id} className="scope-row">
                <div className={`scope-state ${completion === 100 ? "complete" : ""}`}>
                  {completion === 100 ? <Check size={17} aria-hidden="true" /> : stepIndex + 1}
                </div>
                <div className="scope-copy">
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                  <div className="scope-missing">
                    <strong>{completion}% complete</strong>
                    <span>{missingFields.length ? `${missingFields.length} unanswered` : "No missing fields"}</span>
                  </div>
                </div>
                <button className="button button-text" onClick={() => onEditStep(stepIndex)}>
                  {completion === 100 ? "Review" : "Complete"}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
