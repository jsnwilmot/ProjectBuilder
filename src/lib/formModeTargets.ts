import type {
  CanvasControlTarget,
  CanvasEditRecordContextStatus,
  CanvasFormModeAction,
  CanvasFormModeTarget,
  CanvasFormModeTrigger,
  CanvasFormOperationTarget,
  PowerPlatformDecisionStatus,
  ProjectRecord
} from "../types/project";
import { validateCanvasFormOperationTargets } from "./formOperationTargets";

export type CanvasFormModeValidationStatus = "Valid" | "Blocked" | "Not Applicable";

export interface CanvasFormModeValidationResult {
  targets: CanvasFormModeTarget[];
  orderedTargets: CanvasFormModeTarget[];
  blockingIssues: string[];
  missingDecisions: string[];
  eligibilityStatus: CanvasFormModeValidationStatus;
}

const TARGET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const POWER_FX_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const VALID_DECISION_STATUSES: readonly PowerPlatformDecisionStatus[] = [
  "notStarted",
  "missingInformation",
  "reviewNeeded",
  "confirmed",
  "blocked",
  "notApplicable"
];
const VALID_EDIT_RECORD_CONTEXT_STATUSES: readonly CanvasEditRecordContextStatus[] = [
  "notRequired",
  "confirmedExistingItemBinding",
  "missingDecision"
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAction(value: unknown): CanvasFormModeAction {
  const normalized = asString(value);
  return normalized === "new" || normalized === "edit" ? normalized : "" as CanvasFormModeAction;
}

function normalizeTrigger(value: unknown): CanvasFormModeTrigger {
  return asString(value) === "controlOnSelect" ? "controlOnSelect" : "" as CanvasFormModeTrigger;
}

function normalizeEditRecordContextStatus(value: unknown): CanvasEditRecordContextStatus {
  return VALID_EDIT_RECORD_CONTEXT_STATUSES.includes(value as CanvasEditRecordContextStatus)
    ? value as CanvasEditRecordContextStatus
    : "" as CanvasEditRecordContextStatus;
}

function normalizeDecisionStatus(value: unknown): PowerPlatformDecisionStatus {
  return VALID_DECISION_STATUSES.includes(value as PowerPlatformDecisionStatus)
    ? value as PowerPlatformDecisionStatus
    : "missingInformation";
}

function normalizeSortOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalizeControlType(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function hasValidApprovedControlName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && POWER_FX_IDENTIFIER_PATTERN.test(value.trim());
}

function rawStringWasTrimmed(value: unknown): boolean {
  return typeof value === "string" && value !== value.trim();
}

function rawTargetHasMeaningfulFormModeProperties(item: Record<string, unknown>): boolean {
  return [
    "id",
    "formOperationTargetId",
    "action",
    "triggerControlId",
    "trigger",
    "editRecordContextStatus",
    "confirmationStatus",
    "required",
    "sortOrder"
  ].some((key) => key in item);
}

export function normalizeCanvasFormModeTargets(input: unknown): CanvasFormModeTarget[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    if (!isObject(item)) return [];
    if (!rawTargetHasMeaningfulFormModeProperties(item)) return [];
    return [{
      id: asString(item.id),
      formOperationTargetId: asString(item.formOperationTargetId),
      action: normalizeAction(item.action),
      triggerControlId: asString(item.triggerControlId),
      trigger: normalizeTrigger(item.trigger),
      editRecordContextStatus: normalizeEditRecordContextStatus(item.editRecordContextStatus),
      confirmationStatus: normalizeDecisionStatus(item.confirmationStatus),
      required: typeof item.required === "boolean" ? item.required : false,
      sortOrder: normalizeSortOrder(item.sortOrder)
    }];
  });
}

export function orderCanvasFormModeTargets(targets: CanvasFormModeTarget[]): CanvasFormModeTarget[] {
  return [...targets].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function isCanvasProject(project: ProjectRecord): boolean {
  return project.intake.appType === "powerAppsCanvas";
}

function rawMalformedInputIssues(input: unknown): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return ["Canvas form-mode target data must be an array when provided."];
  const issues: string[] = [];
  input.forEach((item, index) => {
    if (!isObject(item)) {
      issues.push(`Canvas form-mode target record ${index + 1} is malformed and must be an object.`);
      return;
    }
    if (!rawTargetHasMeaningfulFormModeProperties(item)) {
      issues.push(`Canvas form-mode target record ${index + 1} does not contain recognizable form-mode data.`);
      return;
    }
    const requiredFields = ["id", "formOperationTargetId", "action", "triggerControlId", "trigger", "editRecordContextStatus", "confirmationStatus"];
    const missingFields = requiredFields.filter((field) => !asString(item[field]));
    if (missingFields.length > 0) {
      issues.push(`Canvas form-mode target record ${index + 1} is incomplete: ${missingFields.join(", ")}.`);
    }
    if (!("required" in item)) issues.push(`Canvas form-mode target record ${index + 1} is incomplete: required.`);
    if (!("sortOrder" in item)) issues.push(`Canvas form-mode target record ${index + 1} is incomplete: sortOrder.`);
    ["id", "formOperationTargetId", "triggerControlId"].forEach((field) => {
      if (rawStringWasTrimmed(item[field])) issues.push(`Canvas form-mode target record ${index + 1} ${field} contains surrounding whitespace.`);
    });
    if (item.action !== undefined && !["new", "edit"].includes(asString(item.action))) issues.push(`Canvas form-mode target record ${index + 1} has an unsupported action.`);
    if (item.trigger !== undefined && asString(item.trigger) !== "controlOnSelect") issues.push(`Canvas form-mode target record ${index + 1} has an unsupported trigger.`);
    if (item.editRecordContextStatus !== undefined && !VALID_EDIT_RECORD_CONTEXT_STATUSES.includes(item.editRecordContextStatus as CanvasEditRecordContextStatus)) {
      issues.push(`Canvas form-mode target record ${index + 1} has an unsupported edit-record context status.`);
    }
    if (item.confirmationStatus !== undefined && !VALID_DECISION_STATUSES.includes(item.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`Canvas form-mode target record ${index + 1} has an unsupported confirmation status.`);
    }
    if ("required" in item && typeof item.required !== "boolean") issues.push(`Canvas form-mode target record ${index + 1} required must be Boolean.`);
    if ("sortOrder" in item && (typeof item.sortOrder !== "number" || !Number.isFinite(item.sortOrder))) {
      issues.push(`Canvas form-mode target record ${index + 1} sortOrder must be a finite number.`);
    }
  });
  return issues;
}

function addTargetIdIssues(target: CanvasFormModeTarget, issues: string[]): void {
  if (!target.id) {
    issues.push("Form-mode target ID is missing.");
    return;
  }
  if (!TARGET_ID_PATTERN.test(target.id)) issues.push(`Form-mode target ${target.id} ID is not a safe stable identifier.`);
}

function triggerControlIssues(
  target: CanvasFormModeTarget,
  operationTarget: CanvasFormOperationTarget | undefined,
  control: CanvasControlTarget | undefined,
  reservedSubmitControlIds: Set<string>,
  issues: string[]
): void {
  if (reservedSubmitControlIds.has(target.triggerControlId)) {
    issues.push(`Form-mode target ${target.id || "[missing]"} trigger control ${target.triggerControlId} already owns a form-submission OnSelect responsibility.`);
  }
  if (!control) {
    issues.push(`Form-mode target ${target.id || "[missing]"} references missing trigger control ${target.triggerControlId || "[missing]"}.`);
    return;
  }
  if (typeof control.screenId !== "string" || control.screenId.trim().length === 0) {
    issues.push(`Form-mode target ${target.id} trigger control ${target.triggerControlId} has a malformed screen reference.`);
  } else if (operationTarget && control.screenId !== operationTarget.screenId) {
    issues.push(`Form-mode target ${target.id} trigger control ${target.triggerControlId} is not on screen ${operationTarget.screenId}.`);
  }
  if (control.confirmationStatus !== "confirmed") issues.push(`Form-mode target ${target.id} references unconfirmed trigger control ${target.triggerControlId}.`);
  if (normalizeControlType(control.controlType) !== "button") issues.push(`Form-mode target ${target.id} trigger control ${target.triggerControlId} is not a confirmed button.`);
  if (!hasValidApprovedControlName(control.approvedControlName)) {
    issues.push(`Form-mode target ${target.id} trigger control ${target.triggerControlId} has an invalid approved control name.`);
  }
}

function addDuplicateIssues(targets: CanvasFormModeTarget[], operationTargetsById: Map<string, CanvasFormOperationTarget>, issues: string[]): void {
  const ids = new Map<string, number>();
  const sortOrders = new Map<number, string[]>();
  const triggerControls = new Map<string, string[]>();
  const formOperations = new Map<string, string[]>();
  const newForms = new Map<string, string[]>();
  const editForms = new Map<string, string[]>();
  targets.forEach((target) => {
    ids.set(target.id, (ids.get(target.id) ?? 0) + 1);
    sortOrders.set(target.sortOrder, [...(sortOrders.get(target.sortOrder) ?? []), target.id]);
    triggerControls.set(target.triggerControlId, [...(triggerControls.get(target.triggerControlId) ?? []), target.id]);
    formOperations.set(target.formOperationTargetId, [...(formOperations.get(target.formOperationTargetId) ?? []), target.id]);
    const operationTarget = operationTargetsById.get(target.formOperationTargetId);
    if (!operationTarget) return;
    if (target.action === "new") newForms.set(operationTarget.formControlId, [...(newForms.get(operationTarget.formControlId) ?? []), target.id]);
    if (target.action === "edit") editForms.set(operationTarget.formControlId, [...(editForms.get(operationTarget.formControlId) ?? []), target.id]);
  });
  for (const [id, count] of ids) if (id && count > 1) issues.push(`Duplicate form-mode target ID: ${id}.`);
  for (const [sortOrder, targetIds] of sortOrders) if (targetIds.length > 1) issues.push(`Duplicate form-mode target sort order ${sortOrder}: ${targetIds.sort().join(", ")}.`);
  for (const [triggerControlId, targetIds] of triggerControls) if (triggerControlId && targetIds.length > 1) issues.push(`Trigger control ${triggerControlId} is used by multiple form-mode targets: ${targetIds.sort().join(", ")}.`);
  for (const [formOperationTargetId, targetIds] of formOperations) if (formOperationTargetId && targetIds.length > 1) issues.push(`Form operation target ${formOperationTargetId} is referenced by multiple form-mode targets: ${targetIds.sort().join(", ")}.`);
  for (const [formControlId, targetIds] of newForms) if (formControlId && targetIds.length > 1) issues.push(`Form control ${formControlId} has duplicate new-mode targets: ${targetIds.sort().join(", ")}.`);
  for (const [formControlId, targetIds] of editForms) if (formControlId && targetIds.length > 1) issues.push(`Form control ${formControlId} has duplicate edit-mode targets: ${targetIds.sort().join(", ")}.`);
}

export function validateCanvasFormModeTargets(project: ProjectRecord, input: unknown = project.powerPlatform?.canvas?.formModeTargets): CanvasFormModeValidationResult {
  if (!isCanvasProject(project)) {
    return {
      targets: [],
      orderedTargets: [],
      blockingIssues: [],
      missingDecisions: [],
      eligibilityStatus: "Not Applicable"
    };
  }
  const targets = normalizeCanvasFormModeTargets(input);
  const orderedTargets = orderCanvasFormModeTargets(targets);
  const rawIssues = rawMalformedInputIssues(input);
  if ((input === undefined || (Array.isArray(input) && input.length === 0)) && targets.length === 0) {
    return {
      targets,
      orderedTargets,
      blockingIssues: [],
      missingDecisions: [],
      eligibilityStatus: "Not Applicable"
    };
  }

  const blockingIssues: string[] = [...rawIssues];
  const missingDecisions: string[] = [];
  if (targets.length === 0) {
    return {
      targets,
      orderedTargets,
      blockingIssues: unique(blockingIssues.length > 0 ? blockingIssues : ["Canvas form-mode target data does not contain any valid target records."]),
      missingDecisions,
      eligibilityStatus: "Blocked"
    };
  }

  const operationValidation = validateCanvasFormOperationTargets(project);
  if (operationValidation.eligibilityStatus !== "Valid") {
    blockingIssues.push("Canvas form-operation targets must be valid before form-mode actions can be modeled.");
    blockingIssues.push(...operationValidation.blockingIssues);
    missingDecisions.push(...operationValidation.missingDecisions);
  }
  const operationTargetsById = new Map(operationValidation.orderedTargets.map((target) => [target.id, target]));
  const reservedSubmitControlIds = new Set(operationValidation.orderedTargets.map((target) => target.submitControlId).filter(Boolean));
  const controlsById = new Map((project.powerPlatform?.canvas?.controlTargets ?? []).map((control) => [control.id, control]));

  addDuplicateIssues(orderedTargets, operationTargetsById, blockingIssues);
  orderedTargets.forEach((target) => {
    addTargetIdIssues(target, blockingIssues);
    if (!target.formOperationTargetId) blockingIssues.push(`Form-mode target ${target.id || "[missing]"} is missing a form-operation target reference.`);
    if (!target.triggerControlId) blockingIssues.push(`Form-mode target ${target.id || "[missing]"} is missing a trigger control reference.`);
    if (target.action !== "new" && target.action !== "edit") blockingIssues.push(`Form-mode target ${target.id || "[missing]"} has an unsupported action.`);
    if (target.trigger !== "controlOnSelect") blockingIssues.push(`Form-mode target ${target.id || "[missing]"} has an unsupported trigger.`);
    if (target.confirmationStatus !== "confirmed") {
      blockingIssues.push(`Form-mode target ${target.id || "[missing]"} is not confirmed.`);
      missingDecisions.push(`Confirm form-mode target ${target.id || "[missing]"} before planning form-mode actions.`);
    }
    const operationTarget = operationTargetsById.get(target.formOperationTargetId);
    if (!operationTarget) {
      blockingIssues.push(`Form-mode target ${target.id || "[missing]"} references missing or invalid form-operation target ${target.formOperationTargetId || "[missing]"}.`);
    } else {
      if (operationTarget.operation === "create" && target.action !== "new") {
        blockingIssues.push(`Form-mode target ${target.id} must use new mode for create form operation ${operationTarget.id}.`);
      }
      if (operationTarget.operation === "edit" && target.action !== "edit") {
        blockingIssues.push(`Form-mode target ${target.id} must use edit mode for edit form operation ${operationTarget.id}.`);
      }
      if (target.action === "new" && target.editRecordContextStatus !== "notRequired") {
        blockingIssues.push(`Form-mode target ${target.id} new action must use notRequired edit-record context.`);
      }
      if (target.action === "edit" && target.editRecordContextStatus !== "confirmedExistingItemBinding") {
        blockingIssues.push(`Form-mode target ${target.id} edit action requires a confirmed existing form Item binding.`);
        missingDecisions.push(`Confirm existing Item or record-context binding for edit form-mode target ${target.id}.`);
      }
    }
    if (!VALID_EDIT_RECORD_CONTEXT_STATUSES.includes(target.editRecordContextStatus)) {
      blockingIssues.push(`Form-mode target ${target.id || "[missing]"} has an unsupported edit-record context status.`);
    }
    triggerControlIssues(target, operationTarget, controlsById.get(target.triggerControlId), reservedSubmitControlIds, blockingIssues);
  });

  return {
    targets,
    orderedTargets,
    blockingIssues: unique(blockingIssues),
    missingDecisions: unique(missingDecisions),
    eligibilityStatus: blockingIssues.length > 0 ? "Blocked" : "Valid"
  };
}
