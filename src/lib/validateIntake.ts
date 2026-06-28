import { intakeSteps } from "../data/intakeSteps";
import type {
  IntakeValidationResult,
  ProjectInputField,
  ProjectRecord,
  ValidationIssue,
  ValidationWarning
} from "../types/project";
import { getProjectFieldValue } from "./projectFields";

const requiredFields = intakeSteps.flatMap((step) =>
  step.fields
    .filter((field) => field.required)
    .map((field) => ({ field: field.name, label: field.label }))
);

const warningFields: Array<{ field: ProjectInputField; label: string }> = [
  { field: "dataSources", label: "Data sources" },
  { field: "integrations", label: "Integrations" },
  { field: "automations", label: "Automations" },
  { field: "notifications", label: "Notifications" },
  { field: "risks", label: "Risks" },
  { field: "assumptions", label: "Assumptions" }
];

export function validateIntake(project: ProjectRecord): IntakeValidationResult {
  const missingFields: ValidationIssue[] = requiredFields.flatMap(({ field, label }) =>
    getProjectFieldValue(project, field).trim()
      ? []
      : [{ field, label, message: `${label} is required for a complete project package.` }]
  );

  const warnings: ValidationWarning[] = warningFields.flatMap(({ field, label }) =>
    getProjectFieldValue(project, field).trim()
      ? []
      : [{ field, label, message: `${label} has not been provided and will be marked as missing.` }]
  );

  const sectionResults = intakeSteps.map((step) => {
    const missing = step.fields
      .map((field) => field.name)
      .filter((field) => !getProjectFieldValue(project, field).trim());
    return {
      id: step.id,
      label: step.label,
      isComplete: missing.length === 0,
      completedFields: step.fields.length - missing.length,
      totalFields: step.fields.length,
      missingFields: missing
    };
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
    sectionResults
  };
}

export function getOutstandingFields(project: ProjectRecord): ProjectInputField[] {
  return intakeSteps
    .flatMap((step) => step.fields.map((field) => field.name))
    .filter((field) => !getProjectFieldValue(project, field).trim());
}

export function getStepCompletion(project: ProjectRecord, stepIndex: number): number {
  const section = validateIntake(project).sectionResults[stepIndex];
  if (!section) return 0;
  if (section.totalFields === 0) return validateIntake(project).isValid ? 100 : 0;
  return Math.round((section.completedFields / section.totalFields) * 100);
}

export function getFirstIncompleteStep(project: ProjectRecord): number {
  const index = intakeSteps.findIndex((_, stepIndex) => getStepCompletion(project, stepIndex) < 100);
  return index === -1 ? intakeSteps.length - 1 : index;
}
