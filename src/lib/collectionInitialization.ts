import { activeCanvasEntityReferences, reconcileCanvasConnectorSelection, type ActiveCanvasEntityReference } from "./canvasTargetValidation";
import type { CanvasCollectionTarget, PowerPlatformConnector, ProjectRecord } from "../types/project";

export const CANVAS_COLLECTION_INITIALIZATION_ASSET_ID = "asset-canvas-powerfx-app-onstart-collection-loading";
export const CANVAS_COLLECTION_INITIALIZATION_TARGET_ID = "app-onstart-collection-loading";
export const CANVAS_COLLECTION_INITIALIZATION_PATH = "07_Development/PowerFx/app/OnStart.collections.fx";
export const CANVAS_COLLECTION_INITIALIZATION_OPERATION = "appOnStartCollectionLoading";

export interface CanvasCollectionGenerationInput {
  id: string;
  implementationName: string;
  purpose: string;
  sourceConnectorId: string;
  sourceEntityId: string;
  sourceImplementationName: string;
  loadTrigger: CanvasCollectionTarget["loadTrigger"];
  loadMode: CanvasCollectionTarget["loadMode"];
  dataScope: CanvasCollectionTarget["dataScope"];
  required: boolean;
  confirmationStatus: CanvasCollectionTarget["confirmationStatus"];
  sortOrder: number;
}

export interface CanvasCollectionValidationResult {
  targets: CanvasCollectionTarget[];
  includedTargets: CanvasCollectionTarget[];
  generationInputs: CanvasCollectionGenerationInput[];
  blockingIssues: string[];
  missingDecisions: string[];
  sourceConnectorIds: string[];
  sourceEntityIds: string[];
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

function normalizeSortOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeConfirmationStatus(value: unknown): CanvasCollectionTarget["confirmationStatus"] {
  if (value === "confirmed" || value === "notApplicable" || value === "blocked" || value === "reviewNeeded" || value === "missingInformation" || value === "notStarted") {
    return value;
  }
  return "missingInformation";
}

function normalizeLoadTrigger(value: unknown): CanvasCollectionTarget["loadTrigger"] | undefined {
  return value === "appOnStart" ? value : undefined;
}

function normalizeLoadMode(value: unknown): CanvasCollectionTarget["loadMode"] | undefined {
  return value === "replace" ? value : undefined;
}

function normalizeDataScope(value: unknown): CanvasCollectionTarget["dataScope"] | undefined {
  if (value === "confirmedSmallBounded" || value === "unknown" || value === "largeOrUnbounded") return value;
  return undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export function normalizeCanvasCollectionTargets(input: unknown): CanvasCollectionTarget[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = asString(item.id).trim();
    const implementationName = asString(item.implementationName).trim();
    const sourceConnectorId = asString(item.sourceConnectorId).trim();
    const sourceEntityId = asString(item.sourceEntityId).trim();
    const loadTrigger = normalizeLoadTrigger(item.loadTrigger);
    const loadMode = normalizeLoadMode(item.loadMode);
    const dataScope = normalizeDataScope(item.dataScope);
    if (!id || !implementationName || !sourceConnectorId || !sourceEntityId || !loadTrigger || !loadMode || !dataScope) return [];
    return [{
      id,
      implementationName,
      purpose: normalizeLineEndings(asString(item.purpose).trim()),
      sourceConnectorId,
      sourceEntityId,
      loadTrigger,
      loadMode,
      dataScope,
      confirmationStatus: normalizeConfirmationStatus(item.confirmationStatus),
      required: item.required === true,
      sortOrder: normalizeSortOrder(item.sortOrder)
    }];
  });
}

export function orderCanvasCollectionTargets(targets: CanvasCollectionTarget[]): CanvasCollectionTarget[] {
  return [...targets].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function sourceEntityImplementationName(project: ProjectRecord, entity: ActiveCanvasEntityReference | undefined): string {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas || !entity) return "";
  if (entity.entityType === "sharePointList") {
    return canvas.sharePointListSchemas.find((item) => item.id === entity.entityId)?.displayName.trim() ?? "";
  }
  if (entity.entityType === "sharePointLibrary") {
    return canvas.sharePointLibrarySchemas.find((item) => item.id === entity.entityId)?.displayName.trim() ?? "";
  }
  if (entity.entityType === "dataverseTable") {
    return canvas.dataverseTableSchemas.find((item) => item.id === entity.entityId)?.logicalName.trim() ?? "";
  }
  return canvas.connectorResourceSchemas.find((item) => item.id === entity.entityId)?.resourceName.trim() ?? "";
}

function connectorIsConfirmed(connector: PowerPlatformConnector | undefined): boolean {
  return Boolean(connector
    && connector.approvalConfirmationStatus === "confirmed"
    && connector.classificationConfirmationStatus === "confirmed"
    && connector.licensingConfirmationStatus === "confirmed");
}

function generationInputFor(project: ProjectRecord, target: CanvasCollectionTarget, entity: ActiveCanvasEntityReference): CanvasCollectionGenerationInput {
  return {
    id: target.id,
    implementationName: target.implementationName,
    purpose: target.purpose,
    sourceConnectorId: target.sourceConnectorId,
    sourceEntityId: target.sourceEntityId,
    sourceImplementationName: sourceEntityImplementationName(project, entity),
    loadTrigger: target.loadTrigger,
    loadMode: target.loadMode,
    dataScope: target.dataScope,
    required: target.required,
    confirmationStatus: target.confirmationStatus,
    sortOrder: target.sortOrder
  };
}

export function validateCanvasCollectionTargets(project: ProjectRecord, targets: CanvasCollectionTarget[]): CanvasCollectionValidationResult {
  const ordered = orderCanvasCollectionTargets(targets);
  const blockingIssues: string[] = [];
  const missingDecisions: string[] = [];
  const includedTargets: CanvasCollectionTarget[] = [];
  const generationInputs: CanvasCollectionGenerationInput[] = [];
  const ids = new Map<string, number>();
  const names = new Map<string, string>();
  const sortOrders = new Map<number, string[]>();
  const connectors = project.powerPlatform?.common.connectors ?? [];
  const activeConnectorIds = new Set(reconcileCanvasConnectorSelection(project).activeConnectorIds);
  const entities = activeCanvasEntityReferences(project);

  for (const target of ordered) {
    ids.set(target.id, (ids.get(target.id) ?? 0) + 1);
    sortOrders.set(target.sortOrder, [...(sortOrders.get(target.sortOrder) ?? []), target.id]);
    if (!target.implementationName) {
      blockingIssues.push(`Collection target ${target.id} is missing an implementation name.`);
    } else if (!POWER_FX_IDENTIFIER_PATTERN.test(target.implementationName)) {
      blockingIssues.push(`Collection target ${target.id} implementation name ${target.implementationName} is not a simple Power Fx identifier.`);
    }
    const normalizedName = target.implementationName.toLowerCase();
    if (normalizedName) {
      if (names.has(normalizedName)) blockingIssues.push(`Duplicate collection implementation name: ${target.implementationName}.`);
      names.set(normalizedName, target.implementationName);
    }
    if (!target.sourceConnectorId) blockingIssues.push(`Collection target ${target.id} is missing a source connector ID.`);
    if (!target.sourceEntityId) blockingIssues.push(`Collection target ${target.id} is missing a source entity ID.`);
    const connector = connectors.find((item) => item.id === target.sourceConnectorId);
    const entity = entities.get(target.sourceEntityId);
    if (target.sourceConnectorId && (!connector || !activeConnectorIds.has(target.sourceConnectorId))) {
      blockingIssues.push(`Collection target ${target.id} references unknown or inactive connector ${target.sourceConnectorId}.`);
    } else if (connector && !connectorIsConfirmed(connector)) {
      blockingIssues.push(`Collection target ${target.id} connector ${target.sourceConnectorId} is not fully confirmed.`);
    }
    if (target.sourceEntityId && !entity) {
      blockingIssues.push(`Collection target ${target.id} references unknown or unconfirmed entity ${target.sourceEntityId}.`);
    }
    if (entity && entity.connectorId !== target.sourceConnectorId) {
      blockingIssues.push(`Collection target ${target.id} entity ${target.sourceEntityId} belongs to connector ${entity.connectorId}, not ${target.sourceConnectorId}.`);
    }
    const sourceImplementationName = sourceEntityImplementationName(project, entity);
    if (entity && !sourceImplementationName) {
      blockingIssues.push(`Collection target ${target.id} source entity ${target.sourceEntityId} is missing a confirmed implementation name.`);
    } else if (entity && !POWER_FX_IDENTIFIER_PATTERN.test(sourceImplementationName)) {
      blockingIssues.push(`Collection target ${target.id} source entity implementation name ${sourceImplementationName} is not a simple Power Fx identifier.`);
    }
    if (target.dataScope === "unknown") blockingIssues.push(`Collection target ${target.id} has unknown data scope and needs a data-volume decision.`);
    if (target.dataScope === "largeOrUnbounded") blockingIssues.push(`Collection target ${target.id} is large or unbounded and is blocked from automatic collection generation.`);
    if (target.required && target.confirmationStatus !== "confirmed") {
      blockingIssues.push(`Required collection target ${target.id} is not confirmed.`);
    }
    if (!target.required && target.confirmationStatus !== "confirmed") {
      missingDecisions.push(`Optional collection target ${target.id} is excluded until it is confirmed.`);
      continue;
    }
    if (target.confirmationStatus === "confirmed" && entity) {
      includedTargets.push(target);
      generationInputs.push(generationInputFor(project, target, entity));
    }
  }

  for (const [id, count] of ids) if (count > 1) blockingIssues.push(`Duplicate collection target ID: ${id}.`);
  for (const [sortOrder, idsForOrder] of sortOrders) {
    if (idsForOrder.length > 1) blockingIssues.push(`Duplicate collection target sort order ${sortOrder}: ${idsForOrder.sort().join(", ")}.`);
  }

  return {
    targets: ordered,
    includedTargets,
    generationInputs,
    blockingIssues: unique(blockingIssues),
    missingDecisions: unique(missingDecisions),
    sourceConnectorIds: unique(generationInputs.map((input) => input.sourceConnectorId)),
    sourceEntityIds: unique(generationInputs.map((input) => input.sourceEntityId))
  };
}
