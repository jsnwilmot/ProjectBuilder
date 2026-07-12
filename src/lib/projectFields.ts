import type {
  ClientDetails,
  ProjectInputField,
  ProjectIntake,
  ProjectRecord,
  ProjectTemplateData
} from "../types/project";
import { normalizeProjectTypeValue } from "../data/projectTypes";
import { reconcilePowerPlatformForProjectType } from "./powerPlatform";

const clientFields = new Set<keyof ClientDetails>(["clientName", "businessName"]);

export function getProjectFieldValue(project: ProjectRecord, field: ProjectInputField): string {
  if (field === "appName") return project.identity.projectName;
  if (clientFields.has(field as keyof ClientDetails)) {
    return project.client[field as keyof ClientDetails];
  }
  return project.intake[field as keyof ProjectIntake];
}

export function applyProjectFieldChanges(
  project: ProjectRecord,
  changes: Partial<Record<ProjectInputField, string>>
): ProjectRecord {
  const identity = { ...project.identity };
  const client = { ...project.client };
  const intake = { ...project.intake };
  let powerPlatform = project.powerPlatform;

  for (const [field, value] of Object.entries(changes) as Array<[ProjectInputField, string]>) {
    if (field === "appName") identity.projectName = value;
    else if (clientFields.has(field as keyof ClientDetails)) client[field as keyof ClientDetails] = value;
    else if (field === "appType") {
      const previousProjectType = intake.appType;
      const nextProjectType = normalizeProjectTypeValue(value);
      intake.appType = nextProjectType;
      powerPlatform = reconcilePowerPlatformForProjectType(powerPlatform, previousProjectType, nextProjectType);
    }
    else (intake as unknown as Record<string, string>)[field] = value;
  }

  return { ...project, identity, client, intake, powerPlatform };
}

export function toProjectTemplateData(project: ProjectRecord): ProjectTemplateData {
  return {
    appName: project.identity.projectName,
    ...project.client,
    ...project.intake
  };
}
