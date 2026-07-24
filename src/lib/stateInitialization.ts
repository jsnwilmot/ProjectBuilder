import type { CanvasStateInitialValue, CanvasStateRole, CanvasStateVariableTarget } from "../types/project";

export const CANVAS_STATE_INITIALIZATION_ASSET_ID = "asset-canvas-powerfx-app-onstart-state-initialization";
export const CANVAS_STATE_INITIALIZATION_TARGET_ID = "app-onstart-state-initialization";
export const CANVAS_STATE_INITIALIZATION_PATH = "07_Development/PowerFx/app/OnStart.fx";
export const CANVAS_STATE_INITIALIZATION_OPERATION = "appOnStartStateInitialization";

export interface CanvasStateVariableGenerationInput {
  id: string;
  implementationName: string;
  purpose: string;
  stateRole: CanvasStateRole | "";
  initialValue: CanvasStateInitialValue;
  required: boolean;
  confirmationStatus: CanvasStateVariableTarget["confirmationStatus"];
  sortOrder: number;
}

export interface CanvasStateVariableValidationResult {
  variables: CanvasStateVariableTarget[];
  includedVariables: CanvasStateVariableTarget[];
  blockingIssues: string[];
}

const POWER_FX_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function normalizeInitialValue(value: unknown): CanvasStateInitialValue | undefined {
  if (!isObject(value)) return undefined;
  if (value.kind === "blank") return { kind: "blank" };
  if (value.kind === "boolean" && typeof value.value === "boolean") return { kind: "boolean", value: value.value };
  if (value.kind === "number" && typeof value.value === "number" && Number.isFinite(value.value)) return { kind: "number", value: value.value };
  if (value.kind === "text" && typeof value.value === "string") return { kind: "text", value: normalizeLineEndings(value.value) };
  return undefined;
}

function normalizeSortOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeConfirmationStatus(value: unknown): CanvasStateVariableTarget["confirmationStatus"] {
  if (value === "confirmed" || value === "notApplicable" || value === "blocked" || value === "reviewNeeded" || value === "missingInformation" || value === "notStarted") {
    return value;
  }
  return "missingInformation";
}

function normalizeStateRole(value: unknown): CanvasStateRole | "" {
  if (
    value === "selectedRecord"
    || value === "formMode"
    || value === "savingState"
    || value === "unsavedChanges"
    || value === "filterState"
    || value === "navigationState"
    || value === "other"
  ) {
    return value;
  }
  return "";
}

export function normalizeCanvasStateVariableTargets(input: unknown): CanvasStateVariableTarget[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = asString(item.id).trim();
    const implementationName = asString(item.implementationName).trim();
    const initialValue = normalizeInitialValue(item.initialValue);
    if (!id || !initialValue) return [];
    return [{
      id,
      implementationName,
      purpose: normalizeLineEndings(asString(item.purpose).trim()),
      stateRole: normalizeStateRole(item.stateRole),
      initialValue,
      confirmationStatus: normalizeConfirmationStatus(item.confirmationStatus),
      required: item.required === true,
      sortOrder: normalizeSortOrder(item.sortOrder)
    }];
  });
}

export function orderCanvasStateVariables(variables: CanvasStateVariableTarget[]): CanvasStateVariableTarget[] {
  return [...variables].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

export function canvasStateVariableGenerationInputs(variables: CanvasStateVariableTarget[]): CanvasStateVariableGenerationInput[] {
  return orderCanvasStateVariables(variables).map((variable) => ({
    id: variable.id,
    implementationName: variable.implementationName,
    purpose: variable.purpose,
    stateRole: variable.stateRole ?? "",
    initialValue: variable.initialValue,
    required: variable.required,
    confirmationStatus: variable.confirmationStatus,
    sortOrder: variable.sortOrder
  }));
}

export function validateCanvasStateVariables(variables: CanvasStateVariableTarget[]): CanvasStateVariableValidationResult {
  const ordered = orderCanvasStateVariables(variables);
  const blockingIssues: string[] = [];
  const ids = new Map<string, number>();
  const names = new Map<string, string>();
  const sortOrders = new Map<number, string[]>();

  for (const variable of ordered) {
    ids.set(variable.id, (ids.get(variable.id) ?? 0) + 1);
    if (!variable.implementationName) {
      blockingIssues.push(`State variable ${variable.id} is missing an implementation name.`);
    } else if (!POWER_FX_IDENTIFIER_PATTERN.test(variable.implementationName)) {
      blockingIssues.push(`State variable ${variable.id} implementation name ${variable.implementationName} is not a simple Power Fx identifier.`);
    }
    const normalizedName = variable.implementationName.toLowerCase();
    if (normalizedName) {
      if (names.has(normalizedName)) blockingIssues.push(`Duplicate state variable implementation name: ${variable.implementationName}.`);
      names.set(normalizedName, variable.implementationName);
    }
    sortOrders.set(variable.sortOrder, [...(sortOrders.get(variable.sortOrder) ?? []), variable.id]);
    if (variable.required && variable.confirmationStatus !== "confirmed") {
      blockingIssues.push(`Required state variable ${variable.id} is not confirmed.`);
    }
  }

  for (const [id, count] of ids) if (count > 1) blockingIssues.push(`Duplicate state variable target ID: ${id}.`);
  for (const [sortOrder, idsForOrder] of sortOrders) {
    if (idsForOrder.length > 1) blockingIssues.push(`Duplicate state variable sort order ${sortOrder}: ${idsForOrder.sort().join(", ")}.`);
  }

  return {
    variables: ordered,
    includedVariables: ordered.filter((variable) => variable.confirmationStatus === "confirmed"),
    blockingIssues: [...new Set(blockingIssues)].sort()
  };
}
