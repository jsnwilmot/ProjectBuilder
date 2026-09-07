import { INTAKE_STAGES } from "../data/intakeStages";
import { BRANDING_REQUIRED_FIELDS, getProjectTypeFields } from "../data/projectTypes";
import type { ProjectInputField, ProjectRecord } from "../types/project";

/** Template families are independent of optional capabilities selected in intake. */
export function projectCapabilities(project: ProjectRecord) {
  return {
    documentFamily: project.intake.appType === "businessWebsite" || project.intake.appType === "staticWebsite"
      ? "website" as const : "application" as const,
    powerPlatform: project.intake.appType === "powerAppsCanvas" || project.intake.appType === "powerAppsModelDriven"
  };
}

function buildVisibleIntakeFields(project: ProjectRecord) {
  return INTAKE_STAGES.flatMap((stage) => {
    const fields = [...stage.fields, ...getProjectTypeFields(project.intake.appType, project.intake.audienceVisibility, stage.id)];
    return fields.map((field) => ({ ...field, stageId: stage.id, stageLabel: stage.label }));
  }).filter((field, index, fields) => fields.findIndex((other) => other.name === field.name) === index);
}

// Metadata depends only on type and audience; answers/review decisions are never cached.
const fieldMetadata = new WeakMap<ProjectRecord, { type: string; audience: string; fields: ReturnType<typeof buildVisibleIntakeFields> }>();
export function visibleIntakeFields(project: ProjectRecord) {
  const cached = fieldMetadata.get(project);
  if (cached?.type === project.intake.appType && cached.audience === project.intake.audienceVisibility) return cached.fields;
  const fields = buildVisibleIntakeFields(project);
  fieldMetadata.set(project, { type: project.intake.appType, audience: project.intake.audienceVisibility, fields });
  return fields;
}

// Application structures are opt-in for websites. A page or navigation journey does
// not imply application records, role permissions, or a transaction workflow.
const WEBSITE_OPTIONAL_FIELDS = new Set<ProjectInputField>([
  "userRoles", "rolePermissionsSummary", "dataCollections", "fields", "keyFields",
  "workflows", "workflowTrigger", "workflowSteps", "workflowOutcome", "permissionRules"
]);

export function websiteRequiredFields(): Set<ProjectInputField> {
  return new Set([
    ...INTAKE_STAGES.flatMap((stage) => stage.requiredFields).filter((field) => !WEBSITE_OPTIONAL_FIELDS.has(field)),
    ...BRANDING_REQUIRED_FIELDS,
    "websitePages", "seoKeywords", "contentSource"
  ]);
}
