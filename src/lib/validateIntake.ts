import { intakeSteps } from "../data/intakeSteps";
import type { ProjectIntake, ProjectIntakeField, ValidationIssue } from "../types/project";

export const requiredIntakeFields = intakeSteps.flatMap((step) =>
  step.fields.filter((field) => field.required)
);

export function validateIntake(intake: ProjectIntake): ValidationIssue[] {
  return requiredIntakeFields.flatMap((field) =>
    intake[field.name].trim()
      ? []
      : [{
          field: field.name,
          label: field.label,
          message: `${field.label} is required before package generation.`
        }]
  );
}

export function getOutstandingFields(intake: ProjectIntake): ProjectIntakeField[] {
  return intakeSteps.flatMap((step) => step.fields.map((field) => field.name))
    .filter((field) => !intake[field].trim());
}

export function getStepCompletion(intake: ProjectIntake, stepIndex: number): number {
  const fields = intakeSteps[stepIndex]?.fields ?? [];
  if (fields.length === 0) return validateIntake(intake).length === 0 ? 100 : 0;
  const completed = fields.filter((field) => intake[field.name].trim()).length;
  return Math.round((completed / fields.length) * 100);
}

export function getFirstIncompleteStep(intake: ProjectIntake): number {
  const index = intakeSteps.findIndex((_, stepIndex) => getStepCompletion(intake, stepIndex) < 100);
  return index === -1 ? intakeSteps.length - 1 : index;
}
