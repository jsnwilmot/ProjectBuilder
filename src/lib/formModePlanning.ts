import { orderCanvasFormModeTargets, validateCanvasFormModeTargets } from "./formModeTargets";
import type { CanvasFormModeTarget, CanvasFormOperationTarget, ProjectRecord } from "../types/project";

export const CANVAS_FORM_MODE_ACTIONS_ASSET_ID = "asset-canvas-powerfx-form-mode-actions";
export const CANVAS_FORM_MODE_ACTIONS_TARGET_ID = "canvas-form-mode-actions";
export const CANVAS_FORM_MODE_ACTIONS_OPERATION = "canvasFormModeActions";
export const CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY = "OnSelect";
export const CANVAS_FORM_MODE_ACTIONS_PLAN_PATH = "07_Development/PowerFx/forms/FORM_MODE_ACTIONS_PLAN.md";
export const CANVAS_FORM_MODE_ACTIONS_TARGET_DISPLAY_NAME = "Canvas form-mode action plan";
export const CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION = "canvas-form-mode-planning-v1";

export interface CanvasFormModeGenerationInput {
  formModeTargetId: string;
  formOperationTargetId: string;
  action: "new" | "edit";
  trigger: "controlOnSelect";
  triggerControlId: string;
  triggerControlApprovedName: string;
  screenTargetId: string;
  screenApprovedName: string;
  formControlId: string;
  formControlApprovedName: string;
  editRecordContextStatus: string;
  required: boolean;
  sortOrder: number;
  intendedPath: string;
}

export interface CanvasFormModePlanningModel {
  targets: CanvasFormModeTarget[];
  orderedTargets: CanvasFormModeTarget[];
  generationInputs: CanvasFormModeGenerationInput[];
  sourceRecordIds: string[];
  blockingIssues: string[];
  missingDecisions: string[];
  required: boolean;
  duplicatePathIssues: string[];
  eligibilityStatus: "Valid" | "Blocked" | "Not Applicable";
}

const FORM_MODE_PATH_PATTERN = /^07_Development\/PowerFx\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/OnSelect\.form-mode\.fx$/;

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function screenApprovedName(project: ProjectRecord, screenId: string): string {
  return project.powerPlatform?.canvas?.screenTargets.find((screen) => screen.id === screenId && screen.confirmationStatus === "confirmed")?.approvedScreenName.trim() ?? "";
}

function controlApprovedName(project: ProjectRecord, controlId: string): string {
  return project.powerPlatform?.canvas?.controlTargets.find((control) => control.id === controlId && control.confirmationStatus === "confirmed")?.approvedControlName.trim() ?? "";
}

function operationTarget(project: ProjectRecord, target: CanvasFormModeTarget): CanvasFormOperationTarget | undefined {
  return project.powerPlatform?.canvas?.formOperationTargets.find((candidate) => candidate.id === target.formOperationTargetId);
}

export function canvasFormModeActionIntendedPath(input: Pick<CanvasFormModeGenerationInput, "screenTargetId" | "triggerControlId">): string {
  return `07_Development/PowerFx/${input.screenTargetId}/${input.triggerControlId}/OnSelect.form-mode.fx`;
}

export function validateCanvasFormModeActionIntendedPaths(inputs: CanvasFormModeGenerationInput[]): string[] {
  const issues: string[] = [];
  const counts = new Map<string, number>();
  inputs.forEach((input) => {
    const path = input.intendedPath;
    counts.set(path, (counts.get(path) ?? 0) + 1);
    if (path.includes("\\")) issues.push(`Form-mode action intended path contains backslashes: ${path}.`);
    if (/^[A-Za-z]:\//.test(path) || path.startsWith("/") || path.startsWith("\\\\")) issues.push(`Form-mode action intended path is absolute: ${path}.`);
    if (path.split("/").includes("..")) issues.push(`Form-mode action intended path contains parent traversal: ${path}.`);
    if (!path.endsWith("OnSelect.form-mode.fx")) issues.push(`Form-mode action intended path must end in OnSelect.form-mode.fx: ${path}.`);
    if (!FORM_MODE_PATH_PATTERN.test(path)) issues.push(`Form-mode action intended path is not canonical: ${path}.`);
    if (path !== canvasFormModeActionIntendedPath(input)) issues.push(`Form-mode action intended path does not match current screen and trigger IDs: ${path}.`);
  });
  for (const [path, count] of counts) {
    if (count > 1) issues.push(`Duplicate form-mode action intended path: ${path}.`);
  }
  return unique(issues);
}

function generationInput(project: ProjectRecord, target: CanvasFormModeTarget): CanvasFormModeGenerationInput {
  const operation = operationTarget(project, target);
  const screenTargetId = operation?.screenId ?? "";
  const formControlId = operation?.formControlId ?? "";
  const input: CanvasFormModeGenerationInput = {
    formModeTargetId: target.id,
    formOperationTargetId: target.formOperationTargetId,
    action: target.action,
    trigger: target.trigger,
    triggerControlId: target.triggerControlId,
    triggerControlApprovedName: controlApprovedName(project, target.triggerControlId),
    screenTargetId,
    screenApprovedName: screenApprovedName(project, screenTargetId),
    formControlId,
    formControlApprovedName: controlApprovedName(project, formControlId),
    editRecordContextStatus: target.editRecordContextStatus,
    required: target.required,
    sortOrder: target.sortOrder,
    intendedPath: ""
  };
  return {
    ...input,
    intendedPath: canvasFormModeActionIntendedPath(input)
  };
}

export function buildCanvasFormModePlanningModel(project: ProjectRecord): CanvasFormModePlanningModel {
  const validation = validateCanvasFormModeTargets(project);
  if (validation.eligibilityStatus !== "Valid") {
    return {
      targets: validation.targets,
      orderedTargets: validation.orderedTargets,
      generationInputs: [],
      sourceRecordIds: [],
      blockingIssues: unique(validation.blockingIssues),
      missingDecisions: validation.missingDecisions,
      required: false,
      duplicatePathIssues: [],
      eligibilityStatus: validation.eligibilityStatus
    };
  }
  const orderedTargets = orderCanvasFormModeTargets(validation.orderedTargets);
  const generationInputs = orderedTargets.map((target) => generationInput(project, target));
  const pathIssues = validateCanvasFormModeActionIntendedPaths(generationInputs);
  return {
    targets: validation.targets,
    orderedTargets,
    generationInputs,
    sourceRecordIds: unique(orderedTargets.flatMap((target) => {
      const operation = operationTarget(project, target);
      return [
        target.id,
        target.formOperationTargetId,
        target.triggerControlId,
        operation?.screenId ?? "",
        operation?.formControlId ?? ""
      ];
    })),
    blockingIssues: pathIssues,
    missingDecisions: validation.missingDecisions,
    required: orderedTargets.some((target) => target.required),
    duplicatePathIssues: pathIssues.filter((issue) => issue.startsWith("Duplicate form-mode action intended path")),
    eligibilityStatus: pathIssues.length > 0 ? "Blocked" : "Valid"
  };
}
