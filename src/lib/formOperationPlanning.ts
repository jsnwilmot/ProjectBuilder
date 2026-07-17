import { orderCanvasFormOperationTargets, validateCanvasFormOperationTargets } from "./formOperationTargets";
import type { CanvasFormOperationTarget, ProjectRecord } from "../types/project";

export const CANVAS_FORM_OPERATIONS_ASSET_ID = "asset-canvas-powerfx-form-operations";
export const CANVAS_FORM_OPERATIONS_TARGET_ID = "canvas-form-operations";
export const CANVAS_FORM_OPERATIONS_OPERATION = "canvasFormOperations";
export const CANVAS_FORM_OPERATIONS_PLAN_PATH = "07_Development/PowerFx/forms/FORM_OPERATIONS_PLAN.md";
export const CANVAS_FORM_OPERATIONS_TARGET_DISPLAY_NAME = "Canvas create and edit form operation plan";
export const CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY = "OnSelect";

export interface CanvasFormOperationGenerationInput {
  id: string;
  operation: "create" | "edit";
  screenId: string;
  screenImplementationName: string;
  formControlId: string;
  formControlImplementationName: string;
  submitControlId: string;
  submitControlImplementationName: string;
  sourceConnectorId: string;
  sourceEntityId: string;
  sourceImplementationName: string;
  requiredFieldIds: string[];
  submissionTrigger: "controlOnSelect";
  formulaProperty: "OnSelect";
  intendedFragmentPath: string;
  required: boolean;
  confirmationStatus: string;
  sortOrder: number;
}

export interface CanvasFormOperationPlanningModel {
  targets: CanvasFormOperationTarget[];
  orderedTargets: CanvasFormOperationTarget[];
  generationInputs: CanvasFormOperationGenerationInput[];
  sourceRecordIds: string[];
  connectorIds: string[];
  entityIds: string[];
  fieldIds: string[];
  blockingIssues: string[];
  missingDecisions: string[];
  required: boolean;
  duplicatePathIssues: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function safePathSegment(value: string, fallback: string): string {
  const safe = value
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return safe || fallback;
}

export function canvasFormOperationFragmentPath(target: Pick<CanvasFormOperationTarget, "screenId" | "submitControlId">): string {
  return `07_Development/PowerFx/${safePathSegment(target.screenId, "screen")}/${safePathSegment(target.submitControlId, "submit-control")}/OnSelect.form-operation.fx`;
}

function screenImplementationName(project: ProjectRecord, screenId: string): string {
  return project.powerPlatform?.canvas?.screenTargets.find((screen) => screen.id === screenId && screen.confirmationStatus === "confirmed")?.approvedScreenName.trim() ?? "";
}

function controlImplementationName(project: ProjectRecord, controlId: string): string {
  return project.powerPlatform?.canvas?.controlTargets.find((control) => control.id === controlId && control.confirmationStatus === "confirmed")?.approvedControlName.trim() ?? "";
}

export function canvasFormOperationEntityType(project: ProjectRecord, entityId: string): "sharePointList" | "sharePointLibrary" | "dataverseTable" | "connectorResource" | undefined {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return undefined;
  if (canvas.sharePointListSchemas.some((entity) => entity.id === entityId)) return "sharePointList";
  if (canvas.sharePointLibrarySchemas.some((entity) => entity.id === entityId)) return "sharePointLibrary";
  if (canvas.dataverseTableSchemas.some((entity) => entity.id === entityId)) return "dataverseTable";
  if (canvas.connectorResourceSchemas.some((entity) => entity.id === entityId)) return "connectorResource";
  return undefined;
}

function entityImplementationName(project: ProjectRecord, entityId: string): string {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return "";
  return canvas.sharePointListSchemas.find((entity) => entity.id === entityId && entity.confirmationStatus === "confirmed")?.displayName.trim()
    ?? canvas.sharePointLibrarySchemas.find((entity) => entity.id === entityId && entity.confirmationStatus === "confirmed")?.displayName.trim()
    ?? canvas.dataverseTableSchemas.find((entity) => entity.id === entityId && entity.confirmationStatus === "confirmed")?.logicalName.trim()
    ?? canvas.connectorResourceSchemas.find((entity) => entity.id === entityId && entity.confirmationStatus === "confirmed")?.resourceName.trim()
    ?? "";
}

function generationInput(project: ProjectRecord, target: CanvasFormOperationTarget): CanvasFormOperationGenerationInput {
  return {
    id: target.id,
    operation: target.operation,
    screenId: target.screenId,
    screenImplementationName: screenImplementationName(project, target.screenId),
    formControlId: target.formControlId,
    formControlImplementationName: controlImplementationName(project, target.formControlId),
    submitControlId: target.submitControlId,
    submitControlImplementationName: controlImplementationName(project, target.submitControlId),
    sourceConnectorId: target.sourceConnectorId,
    sourceEntityId: target.sourceEntityId,
    sourceImplementationName: entityImplementationName(project, target.sourceEntityId),
    requiredFieldIds: [...target.requiredFieldIds],
    submissionTrigger: target.submissionTrigger,
    formulaProperty: CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY,
    intendedFragmentPath: canvasFormOperationFragmentPath(target),
    required: target.required,
    confirmationStatus: target.confirmationStatus,
    sortOrder: target.sortOrder
  };
}

function duplicateFragmentPathIssues(inputs: CanvasFormOperationGenerationInput[]): string[] {
  const counts = new Map<string, number>();
  inputs.forEach((input) => counts.set(input.intendedFragmentPath, (counts.get(input.intendedFragmentPath) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([path]) => `Duplicate form-operation intended fragment path: ${path}.`)
    .sort();
}

export function buildCanvasFormOperationPlanningModel(project: ProjectRecord): CanvasFormOperationPlanningModel | undefined {
  const validation = validateCanvasFormOperationTargets(project);
  if (validation.eligibilityStatus === "Not Applicable") return undefined;
  const orderedTargets = orderCanvasFormOperationTargets(validation.orderedTargets);
  const generationInputs = orderedTargets.map((target) => generationInput(project, target));
  const duplicatePathIssues = duplicateFragmentPathIssues(generationInputs);
  return {
    targets: validation.targets,
    orderedTargets,
    generationInputs,
    sourceRecordIds: unique(orderedTargets.flatMap((target) => [target.id, target.screenId, target.formControlId, target.submitControlId])),
    connectorIds: unique(orderedTargets.map((target) => target.sourceConnectorId)),
    entityIds: unique(orderedTargets.map((target) => target.sourceEntityId)),
    fieldIds: unique(orderedTargets.flatMap((target) => target.requiredFieldIds)),
    blockingIssues: unique([...validation.blockingIssues, ...duplicatePathIssues]),
    missingDecisions: validation.missingDecisions,
    required: orderedTargets.some((target) => target.required),
    duplicatePathIssues
  };
}
