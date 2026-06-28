import { useEffect, useRef } from "react";
import { intakeSteps } from "../../data/intakeSteps";
import { GENERATE_STAGE_INDEX } from "../../data/intakeStages";
import { getProjectFieldValue } from "../../lib/projectFields";
import { getStepCompletion } from "../../lib/validateIntake";
import type {
  IntakeValidationResult,
  ProjectInputField,
  ProjectRecord,
  ValidationIssue
} from "../../types/project";
import { ArrowLeft, ArrowRight, Check, CircleAlert } from "../ui/Icons";

interface IntakeBuilderProps {
  project: ProjectRecord;
  currentStep: number;
  validationResult: IntakeValidationResult;
  validationIssues: ValidationIssue[];
  onStepChange: (step: number) => void;
  onUpdate: (changes: Partial<Record<ProjectInputField, string>>) => void;
  onGenerate: () => void;
  onOpenDocuments: () => void;
  onOpenExport: () => void;
}

export function IntakeBuilder({
  project,
  currentStep,
  validationResult,
  validationIssues,
  onStepChange,
  onUpdate,
  onGenerate,
  onOpenDocuments,
  onOpenExport
}: IntakeBuilderProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = intakeSteps[currentStep];
  const sectionResult = validationResult.sectionResults[currentStep];
  const missingForCurrentStep = sectionResult?.missingFields ?? [];
  const warningsForCurrentStep = sectionResult?.warnings ?? [];

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  const next = () => {
    if (currentStep < intakeSteps.length - 1) onStepChange(currentStep + 1);
    else onOpenDocuments();
  };

  const canJumpToStep = (index: number, completion: number) =>
    index <= currentStep + 1 || completion > 0 || index === GENERATE_STAGE_INDEX;

  const summaryItems: Array<{ label: string; value: string }> = [
    { label: "Project identity", value: `${project.identity.projectName || "[MISSING: app name]"} / ${project.client.clientName || "[MISSING: client name]"}` },
    { label: "Client details", value: project.client.businessName || "[MISSING: business or department]" },
    { label: "Purpose", value: project.intake.appPurpose || "[MISSING: app purpose]" },
    { label: "Users and roles", value: `${project.intake.targetUsers || "[MISSING: target users]"}\n${project.intake.userRoles || "[MISSING: user roles]"}` },
    { label: "Features", value: project.intake.requiredFeatures || "[MISSING: required features]" },
    { label: "Data model", value: project.intake.dataCollections || "[MISSING: tables, lists, or collections]" },
    { label: "Workflows", value: project.intake.workflows || "[MISSING: workflows]" },
    { label: "Security", value: project.intake.permissionRules || project.intake.roleAccessNotes || "[MISSING: permission rules or role access notes]" },
    { label: "Risks", value: project.intake.risks || "[MISSING: risks]" },
    { label: "Assumptions", value: project.intake.assumptions || "[MISSING: assumptions]" },
    { label: "Out-of-scope", value: project.intake.outOfScope || "[MISSING: out-of-scope items]" },
    { label: "Success criteria", value: project.intake.successCriteria || "[MISSING: success criteria]" }
  ];

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
            const disabled = !canJumpToStep(index, completion);
            return (
              <button
                key={item.id}
                className={`${index === currentStep ? "is-active" : ""} ${completion === 100 ? "is-complete" : ""}`}
                onClick={() => onStepChange(index)}
                disabled={disabled}
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

          {step.id === "review" ? (
            <div className="generate-stage">
              <div className={validationIssues.length ? "generate-status has-errors" : "generate-status is-ready"}>
                {validationIssues.length ? <CircleAlert size={28} aria-hidden="true" /> : <Check size={28} aria-hidden="true" />}
                <div>
                  <h3>{validationIssues.length ? "Review shows required information still missing" : "Review is ready for generation"}</h3>
                  <p>
                    {validationIssues.length
                      ? `${validationIssues.length} required item${validationIssues.length === 1 ? "" : "s"} still need attention.`
                      : "All required stage rules are satisfied."}
                  </p>
                </div>
              </div>
              <div className="scope-list">
                {summaryItems.map((item) => (
                  <article className="scope-row" key={item.label}>
                    <div className="scope-state complete"><Check size={17} aria-hidden="true" /></div>
                    <div className="scope-copy">
                      <div>
                        <h3>{item.label}</h3>
                        <p>{item.value}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {validationIssues.length ? (
                <ul className="issue-list">
                  {validationIssues.map((issue) => <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>)}
                </ul>
              ) : null}
              {validationResult.warnings.length ? (
                <ul className="issue-list">
                  {validationResult.warnings.map((warning) => <li key={`${warning.field}-${warning.message}`}>{warning.message}</li>)}
                </ul>
              ) : null}
            </div>
          ) : step.id === "generate" ? (
            <div className="generate-stage">
              <div className={validationIssues.length ? "generate-status has-errors" : "generate-status is-ready"}>
                {validationIssues.length ? <CircleAlert size={28} aria-hidden="true" /> : <Check size={28} aria-hidden="true" />}
                <div>
                  <h3>{validationIssues.length ? "Generation can proceed with missing markers" : "Ready to generate"}</h3>
                  <p>
                    Missing required: {validationIssues.length}. Warnings: {validationResult.warnings.length}.
                    Generation is allowed and missing information will be written as explicit markers.
                  </p>
                </div>
              </div>
              {missingForCurrentStep.length ? (
                <ul className="issue-list">
                  {missingForCurrentStep.map((field) => <li key={field}>{field}</li>)}
                </ul>
              ) : null}
              {warningsForCurrentStep.length ? (
                <ul className="issue-list">
                  {warningsForCurrentStep.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              ) : null}
              <div className="form-actions" style={{ marginTop: "18px", paddingInline: 0, borderTop: "0", background: "transparent" }}>
                <button className="button button-primary" onClick={onGenerate}>Generate and save package</button>
                <button className="button button-secondary" onClick={onOpenDocuments}>Open generated documents</button>
                <button className="button button-secondary" onClick={onOpenExport}>Open export</button>
              </div>
            </div>
          ) : step.fields.length > 0 ? (
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
            <div className="generate-stage" />
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
              {currentStep === intakeSteps.length - 1 ? "Open documents" : step.nextActionLabel || "Continue"}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
