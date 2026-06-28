import { useEffect, useRef } from "react";
import { intakeSteps } from "../../data/intakeSteps";
import { getProjectFieldValue } from "../../lib/projectFields";
import { getStepCompletion } from "../../lib/validateIntake";
import type { ProjectInputField, ProjectRecord, ValidationIssue } from "../../types/project";
import { ArrowLeft, ArrowRight, Check, CircleAlert } from "../ui/Icons";

interface IntakeBuilderProps {
  project: ProjectRecord;
  currentStep: number;
  validationIssues: ValidationIssue[];
  onStepChange: (step: number) => void;
  onUpdate: (changes: Partial<Record<ProjectInputField, string>>) => void;
  onReview: () => void;
}

export function IntakeBuilder({
  project,
  currentStep,
  validationIssues,
  onStepChange,
  onUpdate,
  onReview
}: IntakeBuilderProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = intakeSteps[currentStep];

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  const next = () => {
    if (currentStep < intakeSteps.length - 1) onStepChange(currentStep + 1);
    else onReview();
  };

  return (
    <main className="page intake-page" id="main-content">
      <div className="page-heading compact">
        <div>
          <h1>Guided Intake</h1>
          <p>Build the project package in focused stages. Missing information stays visible.</p>
        </div>
        <span className="step-counter">Step {currentStep + 1} of {intakeSteps.length}</span>
      </div>

      <div className="intake-layout">
        <aside className="intake-step-list" aria-label="Intake stages">
          {intakeSteps.map((item, index) => {
            const completion = getStepCompletion(project, index);
            return (
              <button
                key={item.id}
                className={`${index === currentStep ? "is-active" : ""} ${completion === 100 ? "is-complete" : ""}`}
                onClick={() => onStepChange(index)}
                aria-current={index === currentStep ? "step" : undefined}
              >
                <span>{completion === 100 ? <Check size={16} aria-hidden="true" /> : index + 1}</span>
                <em>{item.label}</em>
                <small>{completion}%</small>
              </button>
            );
          })}
        </aside>

        <section className="intake-form-panel" aria-labelledby="intake-step-title">
          <div className="intake-form-heading">
            <span>{String(currentStep + 1).padStart(2, "0")}</span>
            <div>
              <h2 id="intake-step-title" ref={headingRef} tabIndex={-1}>{step.title}</h2>
              <p>{step.description}</p>
            </div>
          </div>

          {step.fields.length > 0 ? (
            <div className="field-stack">
              {step.fields.map((field) => {
                const issue = validationIssues.find((item) => item.field === field.name);
                const inputId = `field-${field.name}`;
                const descriptionId = `${inputId}-description`;
                const errorId = `${inputId}-error`;
                const shared = {
                  id: inputId,
                  name: field.name,
                  value: getProjectFieldValue(project, field.name),
                  placeholder: field.placeholder,
                  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    onUpdate({ [field.name]: event.target.value }),
                  "aria-describedby": `${descriptionId}${issue ? ` ${errorId}` : ""}`,
                  "aria-invalid": Boolean(issue)
                };
                return (
                  <div className="form-field" key={field.name}>
                    <label htmlFor={inputId}>
                      {field.label}
                      {field.required ? <span className="required-label">Required</span> : <span>Optional</span>}
                    </label>
                    <p id={descriptionId}>{field.description}</p>
                    {field.multiline
                      ? <textarea {...shared} rows={5} />
                      : <input {...shared} type="text" />}
                    {issue ? <div className="field-error" id={errorId}><CircleAlert size={15} />{issue.message}</div> : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="generate-stage">
              <div className={validationIssues.length ? "generate-status has-errors" : "generate-status is-ready"}>
                {validationIssues.length ? <CircleAlert size={28} aria-hidden="true" /> : <Check size={28} aria-hidden="true" />}
                <div>
                  <h3>{validationIssues.length ? "Required information is still missing" : "Required intake is ready"}</h3>
                  <p>
                    {validationIssues.length
                      ? `${validationIssues.length} required field${validationIssues.length === 1 ? "" : "s"} must be completed before generation.`
                      : "Review the scope and explicit missing markers before exporting the package."}
                  </p>
                </div>
              </div>
              {validationIssues.length ? (
                <ul className="issue-list">
                  {validationIssues.map((issue) => <li key={issue.field}>{issue.message}</li>)}
                </ul>
              ) : null}
            </div>
          )}

          <div className="form-actions">
            <button
              className="button button-secondary"
              onClick={() => onStepChange(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Previous
            </button>
            <span>Changes save automatically in this browser.</span>
            <button className="button button-primary" onClick={next}>
              {currentStep === intakeSteps.length - 1 ? "Review scope" : "Continue"}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
