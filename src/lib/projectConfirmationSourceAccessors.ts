import type { ProjectRecord } from "../types/project";
import type { ProjectConfirmationSourceAccessorId } from "./projectConfirmationSourceRegistry";

export function readProjectConfirmationSourceValue(
  project: ProjectRecord,
  accessorId: ProjectConfirmationSourceAccessorId
): string | null {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return null;

  switch (accessorId) {
    case "canvas.fullScreenYamlRequired":
      return canvas.fullScreenYamlRequired;
    case "canvas.controlLevelYamlRequired":
      return canvas.controlLevelYamlRequired;
    case "canvas.containerYamlRequired":
      return canvas.containerYamlRequired;
    case "canvas.componentYamlRequired":
      return canvas.componentYamlRequired;
    case "canvas.paYamlSourceRequired":
      return canvas.paYamlSourceRequired;
    case "canvas.expectedInstallationMethod":
      return canvas.expectedInstallationMethod;
    case "canvas.existingSourceAvailability":
      return canvas.existingSourceAvailability;
  }
}
