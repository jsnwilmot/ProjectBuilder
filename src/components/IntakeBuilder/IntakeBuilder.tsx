import { useEffect, useRef } from "react";
import { GENERATE_STAGE_INDEX, INTAKE_STAGES } from "../../data/intakeStages";
import {
  getProjectTypeFields,
  getProjectTypeLabel,
  getProjectTypePreset,
  isBrandingRequired
} from "../../data/projectTypes";
import { getProjectFieldValue } from "../../lib/projectFields";
import { getClientReviewReadiness } from "../../lib/clientReview";
import { getStepCompletion } from "../../lib/validateIntake";
import type {
  IntakeFieldDefinition,
  IntakeValidationResult,
  ProjectInputField,
  ProjectRecord,
  ReadinessChecklistId,
  ReviewItem,
  ValidationIssue
} from "../../types/project";
import { ArrowLeft, ArrowRight, Check, CircleAlert } from "../ui/Icons";
import { ClientReviewWorkflow } from "../ClientReview/ClientReviewWorkflow";
import { PostGenerationGuidance } from "../Onboarding/PostGenerationGuidance";

interface IntakeBuilderProps {
  project: ProjectRecord;
  currentStep: number;
  validationResult: IntakeValidationResult;
  validationIssues: ValidationIssue[];
  onStepChange: (step: number) => void;
  onUpdate: (changes: Partial<Record<ProjectInputField, string>>) => void;
  onUpdateReviewItem: (
    reviewItemId: string,
    changes: Partial<Pick<ReviewItem, "status" | "notApplicableReason" | "deferredReason">>
  ) => void;
  onToggleReadiness: (checklistId: ReadinessChecklistId, checked: boolean) => void;
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
  onUpdateReviewItem,
  onToggleReadiness,
  onGenerate,
  onOpenDocuments,
  onOpenExport
}: IntakeBuilderProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = INTAKE_STAGES[currentStep];
  const sectionResult = validationResult.sectionResults[currentStep];
  const missingForCurrentStep = sectionResult?.missingFields ?? [];
  const warningsForCurrentStep = sectionResult?.warnings ?? [];
  const preset = getProjectTypePreset(project.intake.appType);
  const clientReviewReadiness = getClientReviewReadiness(project);
  const projectTypeFields = getProjectTypeFields(
    project.intake.appType,
    project.intake.audienceVisibility,
    step.id
  );
  const coreFields = step.fields.map((field) => (
    field.name === "audienceVisibility" && preset?.brandingRequirementLevel === "conditional"
      ? { ...field, required: true }
      : field
  ));

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  const next = () => {
    if (currentStep < INTAKE_STAGES.length - 1) onStepChange(currentStep + 1);
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
    <main className="page intake-page" id="main-content" tabIndex={-1}>
      <div className="page-heading compact">
        <div>
          <h1>Guided Intake</h1>
          <p>Build the project package in focused stages. Missing information stays visible.</p>
        </div>
        <span className="step-counter">Step {currentStep + 1} of {INTAKE_STAGES.length}</span>
      </div>

      <div className="intake-layout">
        <aside className="intake-step-list" aria-label="Intake stages">
          {INTAKE_STAGES.map((item, index) => {
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

          {preset && step.id !== "review" && step.id !== "generate" ? (
            <div className="preset-summary" role="status">
              <div>
                <strong>{preset.label} preset</strong>
                <p>{preset.description}</p>
                <p className="preset-helper">{preset.helperText}</p>
              </div>
              <dl>
                <div>
                  <dt>Recommended platforms</dt>
                  <dd>{preset.recommendedTargetPlatforms.join(", ")}</dd>
                </div>
                <div>
                  <dt>Branding</dt>
                  <dd>
                    {isBrandingRequired(project.intake.appType, project.intake.audienceVisibility)
                      ? "Required"
                      : preset.brandingRequirementLevel === "conditional"
                        ? "Depends on audience visibility"
                        : "Optional"}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {step.id === "review" ? (
            <div className="generate-stage">
              <div className={validationIssues.length ? "generate-status has-errors" : "generate-status is-ready"} role="status" aria-live="polite">
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
                    <div className={`scope-state ${item.value.includes("[MISSING:") ? "" : "complete"}`}>
                      {item.value.includes("[MISSING:")
                        ? <CircleAlert size={17} aria-hidden="true" />
                        : <Check size={17} aria-hidden="true" />}
                    </div>
                    <div className="scope-copy">
                      <div>
                        <h3>{item.label}</h3>
                        <p>{item.value}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <ClientReviewWorkflow
                project={project}
                onUpdateReviewItem={onUpdateReviewItem}
                onToggleReadiness={onToggleReadiness}
              />
            </div>
          ) : step.id === "generate" ? (
            <div className="generate-stage">
              <div className={clientReviewReadiness.isReady ? "generate-status is-ready" : "generate-status has-errors"} role="status" aria-live="polite">
                {clientReviewReadiness.isReady ? <Check size={28} aria-hidden="true" /> : <CircleAlert size={28} aria-hidden="true" />}
                <div>
                  <h3>{clientReviewReadiness.isReady ? "Ready for Codex" : "Draft generation can proceed"}</h3>
                  <p>
                    Readiness blockers: {clientReviewReadiness.blockerCount}. Required intake gaps: {validationIssues.length}.
                    Generation is allowed; unresolved information is written as exact `[MISSING: ...]` markers.
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
              <PostGenerationGuidance />
              <div className="form-actions" style={{ marginTop: "18px", paddingInline: 0, borderTop: "0", background: "transparent" }}>
                <button className="button button-primary" onClick={onGenerate}>Generate and save package</button>
                <button className="button button-secondary" onClick={onOpenDocuments}>Open generated documents</button>
                <button className="button button-secondary" onClick={onOpenExport}>Open export</button>
              </div>
            </div>
          ) : step.fields.length > 0 ? (
            <>
              <ProjectFieldList
                fields={coreFields}
                project={project}
                validationIssues={validationIssues}
                onUpdate={onUpdate}
              />
              {projectTypeFields.length > 0 ? (
                <section className="tailored-intake" aria-labelledby={`tailored-${step.id}`}>
                  <div className="tailored-intake-heading">
                    <span>Project-specific</span>
                    <h3 id={`tailored-${step.id}`}>{preset?.label} questions</h3>
                    <p>Only questions relevant to the selected project type are shown.</p>
                  </div>
                  <ProjectFieldList
                    fields={projectTypeFields}
                    project={project}
                    validationIssues={validationIssues}
                    onUpdate={onUpdate}
                  />
                </section>
              ) : null}
            </>
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
              {currentStep === INTAKE_STAGES.length - 1 ? "Open documents" : step.nextActionLabel || "Continue"}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProjectFieldList({
  fields,
  project,
  validationIssues,
  onUpdate
}: {
  fields: IntakeFieldDefinition[];
  project: ProjectRecord;
  validationIssues: ValidationIssue[];
  onUpdate: (changes: Partial<Record<ProjectInputField, string>>) => void;
}) {
  return (
    <div className="field-stack">
      {fields.map((field) => {
        const issue = validationIssues.find((item) => item.field === field.name);
        const inputId = `field-${field.name}`;
        const descriptionId = `${inputId}-description`;
        const errorId = `${inputId}-error`;
        const describedBy = `${descriptionId}${issue ? ` ${errorId}` : ""}`;
        const onChange = (
          event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
        ) => onUpdate({ [field.name]: event.target.value });

        return (
          <div className="form-field" key={field.name}>
            <label htmlFor={inputId}>
              {field.label}
              {field.required ? <span className="required-label">Required</span> : <span>Optional</span>}
            </label>
            <p id={descriptionId}>{field.description}</p>
            {field.inputType === "select" ? (
              <select
                id={inputId}
                name={field.name}
                value={getProjectFieldValue(project, field.name)}
                onChange={onChange}
                aria-describedby={describedBy}
                aria-invalid={Boolean(issue)}
                required={field.required}
              >
                <option value="">{field.placeholder}</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {field.name === "appType" ? getProjectTypeLabel(option) : option}
                  </option>
                ))}
              </select>
            ) : field.multiline ? (
              <textarea
                id={inputId}
                name={field.name}
                value={getProjectFieldValue(project, field.name)}
                placeholder={field.placeholder}
                onChange={onChange}
                aria-describedby={describedBy}
                aria-invalid={Boolean(issue)}
                required={field.required}
                rows={5}
              />
            ) : (
              <input
                id={inputId}
                name={field.name}
                value={getProjectFieldValue(project, field.name)}
                placeholder={field.placeholder}
                onChange={onChange}
                aria-describedby={describedBy}
                aria-invalid={Boolean(issue)}
                required={field.required}
                type="text"
              />
            )}
            {issue ? (
              <div className="field-error" id={errorId} role="alert">
                <CircleAlert size={15} aria-hidden="true" />
                {issue.message}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
