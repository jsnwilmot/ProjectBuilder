import { INTAKE_STAGES, GENERATE_STAGE_INDEX } from "../data/intakeStages";
import type {
  IntakeValidationResult,
  ProjectInputField,
  ProjectRecord,
  ValidationSectionResult,
  ValidationIssue,
  ValidationWarning
} from "../types/project";
import { getProjectFieldValue } from "./projectFields";

const fieldLabels = new Map(
  INTAKE_STAGES.flatMap((stage) => stage.fields.map((field) => [field.name, field.label] as const))
);

const globalWarningRules: Array<{ field: ProjectInputField; message: string }> = [
  { field: "constraints", message: "No constraints listed." },
  { field: "risks", message: "No risks listed." },
  { field: "assumptions", message: "No assumptions listed." },
  { field: "integrations", message: "No integrations listed." },
  { field: "reportsDashboards", message: "No reports listed." },
  { field: "brandingNotes", message: "No branding notes listed." },
  { field: "accessibilityNotes", message: "No accessibility notes listed." }
];

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ruleMissingFields(project: ProjectRecord, stageId: string): ValidationIssue[] {
  if (stageId === "users") {
    const issues: ValidationIssue[] = [];
    if (lines(project.intake.targetUsers).length === 0) {
      issues.push({ field: "targetUsers", label: "Target users", message: "At least one target user is required." });
    }
    if (lines(project.intake.userRoles).length === 0) {
      issues.push({ field: "userRoles", label: "User roles", message: "At least one user role is required." });
    }
    if (!project.intake.rolePermissionsSummary.trim() && !project.intake.roleAccessNotes.trim()) {
      issues.push({ field: "rolePermissionsSummary", label: "Role permissions summary", message: "Permission summary or role access notes are required." });
    }
    return issues;
  }

  if (stageId === "features") {
    const issues: ValidationIssue[] = [];
    if (lines(project.intake.requiredFeatures).length === 0) {
      issues.push({ field: "requiredFeatures", label: "Required features", message: "At least one required feature is required." });
    }
    if (!project.intake.acceptanceNotes.trim()) {
      issues.push({ field: "acceptanceNotes", label: "Acceptance notes", message: "Acceptance notes are required." });
    }
    return issues;
  }

  if (stageId === "data") {
    const issues: ValidationIssue[] = [];
    const entityLines = lines(project.intake.dataEntities || project.intake.dataCollections);
    if (entityLines.length === 0) {
      issues.push({ field: "dataCollections", label: "Tables, lists, or collections", message: "At least one data entity is required." });
    }
    if (lines(project.intake.fields).length === 0) {
      issues.push({ field: "fields", label: "Fields", message: "Each entity should include at least one field." });
    }
    if (!project.intake.keyFields.trim()) {
      issues.push({ field: "keyFields", label: "Key fields", message: "Key fields should be identified where known." });
    }
    return issues;
  }

  if (stageId === "workflows") {
    const issues: ValidationIssue[] = [];
    if (lines(project.intake.workflows).length === 0) {
      issues.push({ field: "workflows", label: "Workflows", message: "At least one workflow is required." });
    }
    if (!project.intake.workflowTrigger.trim()) {
      issues.push({ field: "workflowTrigger", label: "Trigger", message: "Each workflow must include a trigger." });
    }
    if (!project.intake.workflowSteps.trim()) {
      issues.push({ field: "workflowSteps", label: "Steps", message: "Each workflow must include steps." });
    }
    if (!project.intake.workflowOutcome.trim()) {
      issues.push({ field: "workflowOutcome", label: "Expected outcome", message: "Each workflow must include an expected outcome." });
    }
    return issues;
  }

  if (stageId === "security") {
    const issues: ValidationIssue[] = [];
    if (!project.intake.permissionRules.trim() && !project.intake.roleAccessNotes.trim()) {
      issues.push({ field: "permissionRules", label: "Permission rules", message: "Permission rules or role access notes are required." });
    }
    if (!project.intake.sensitiveDataNotes.trim()) {
      issues.push({ field: "sensitiveDataNotes", label: "Sensitive data notes", message: "Sensitive data handling notes are required." });
    }
    if (!project.intake.risks.trim()) {
      issues.push({ field: "risks", label: "Risks", message: "List security risks or explicitly state no known risks." });
    }
    return issues;
  }

  return [];
}

function sectionWarnings(project: ProjectRecord, stageId: string): string[] {
  if (stageId === "foundation") {
    return project.intake.constraints.trim() ? [] : ["No constraints listed."];
  }
  if (stageId === "users") {
    return project.intake.accessibilityNotes.trim() ? [] : ["No accessibility notes listed."];
  }
  if (stageId === "features") {
    const warnings: string[] = [];
    if (!project.intake.reportsDashboards.trim()) warnings.push("No reports listed.");
    if (!project.intake.brandingNotes.trim()) warnings.push("No branding notes listed.");
    return warnings;
  }
  if (stageId === "data") {
    return project.intake.integrations.trim() ? [] : ["No integrations listed."];
  }
  if (stageId === "security") {
    const warnings: string[] = [];
    if (!project.intake.assumptions.trim()) warnings.push("No assumptions listed.");
    if (!project.intake.risks.trim()) warnings.push("No risks listed.");
    return warnings;
  }
  return [];
}

function sectionResult(project: ProjectRecord, stageIndex: number): ValidationSectionResult {
  const stage = INTAKE_STAGES[stageIndex];
  const requiredMissing = stage.requiredFields.filter((field) => !getProjectFieldValue(project, field).trim());
  const ruleIssues = ruleMissingFields(project, stage.id);
  const trackedFields = [...new Set([...stage.requiredFields, ...stage.optionalFields])];
  const completed = trackedFields.filter((field) => getProjectFieldValue(project, field).trim()).length;
  const percentComplete = trackedFields.length === 0
    ? (requiredMissing.length === 0 && ruleIssues.length === 0 ? 100 : 0)
    : Math.round((completed / trackedFields.length) * 100);

  return {
    stageId: stage.id,
    label: stage.label,
    percentComplete,
    isComplete: requiredMissing.length === 0 && ruleIssues.length === 0,
    missingFields: [...new Set([...requiredMissing, ...ruleIssues.map((issue) => issue.field)])],
    warnings: sectionWarnings(project, stage.id)
  };
}

export function validateIntake(project: ProjectRecord): IntakeValidationResult {
  const missingFieldsFromStages: ValidationIssue[] = INTAKE_STAGES.flatMap((stage) => {
    const fieldIssues = stage.requiredFields.flatMap((field) => {
      const value = getProjectFieldValue(project, field).trim();
      if (value) return [];
      const label = fieldLabels.get(field) ?? field;
      return [{ field, label, message: `${label} is required for stage completion.` }];
    });
    return [...fieldIssues, ...ruleMissingFields(project, stage.id)];
  });

  const deduplicatedMissingFields: ValidationIssue[] = [];
  const seenMissing = new Set<string>();
  for (const issue of missingFieldsFromStages) {
    const key = `${issue.field}:${issue.message}`;
    if (seenMissing.has(key)) continue;
    seenMissing.add(key);
    deduplicatedMissingFields.push(issue);
  }

  const warnings: ValidationWarning[] = globalWarningRules.flatMap(({ field, message }) => {
    if (getProjectFieldValue(project, field).trim()) return [];
    const label = fieldLabels.get(field) ?? field;
    return [{ field, label, message }];
  });

  const sectionResults = INTAKE_STAGES.map((_, index) => sectionResult(project, index));

  return {
    isValid: deduplicatedMissingFields.length === 0,
    missingFields: deduplicatedMissingFields,
    warnings,
    sectionResults
  };
}

export function getOutstandingFields(project: ProjectRecord): ProjectInputField[] {
  return INTAKE_STAGES
    .flatMap((step) => step.fields.map((field) => field.name))
    .filter((field) => !getProjectFieldValue(project, field).trim());
}

export function getStepCompletion(project: ProjectRecord, stepIndex: number): number {
  const section = validateIntake(project).sectionResults[stepIndex];
  if (!section) return 0;
  return section.percentComplete;
}

export function getFirstIncompleteStep(project: ProjectRecord): number {
  const results = validateIntake(project).sectionResults;
  const index = results.findIndex((section) => !section.isComplete && section.stageId !== "generate");
  return index === -1 ? GENERATE_STAGE_INDEX : index;
}
