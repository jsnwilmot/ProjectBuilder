import type {
  CanvasArchiveStrategy,
  CanvasDeleteStrategy,
  CanvasRecordContextType,
  CanvasRecordLifecycleAction,
  CanvasRecordLifecycleTarget,
  CanvasRecordLifecycleTrigger,
  CanvasStateVariableTarget,
  ConnectorFieldSchema,
  DataverseColumnSchema,
  PowerPlatformConnector,
  PowerPlatformDecisionStatus,
  ProjectRecord,
  SharePointColumnSchema
} from "../types/project";
import { connectorSupportsCanvasEntity, reconcileCanvasConnectorSelection } from "./canvasTargetValidation";

export type CanvasRecordLifecycleValidationStatus = "Valid" | "Blocked" | "Not Applicable";

export interface CanvasRecordLifecycleValidationResult {
  normalizedTargets: CanvasRecordLifecycleTarget[];
  orderedTargets: CanvasRecordLifecycleTarget[];
  blockingIssues: string[];
  missingDecisions: string[];
  eligibilityStatus: CanvasRecordLifecycleValidationStatus;
}

type EntityKind = "sharePointList" | "sharePointLibrary" | "dataverseTable" | "connectorResource";

interface EntityReference {
  entityId: string;
  connectorId: string;
  entityType: EntityKind;
  confirmationStatus: PowerPlatformDecisionStatus;
  permanentDeleteSupported: boolean;
}

interface FieldReference {
  fieldId: string;
  parentEntityId: string;
  confirmationStatus: PowerPlatformDecisionStatus;
  fieldKind: "status" | "boolean" | "other";
}

type CanvasArrayProperty =
  | "screenTargets"
  | "controlTargets"
  | "stateVariableTargets"
  | "formOperationTargets"
  | "formModeTargets"
  | "recordLifecycleTargets"
  | "sharePointListSchemas"
  | "sharePointLibrarySchemas"
  | "sharePointColumnSchemas"
  | "dataverseTableSchemas"
  | "dataverseColumnSchemas"
  | "connectorResourceSchemas"
  | "connectorFieldSchemas";

const SELECTABLE_CANVAS_DATA_SOURCE_TYPES = [
  "sharePointList",
  "sharePointLibrary",
  "microsoftList",
  "dataverse",
  "excel",
  "sqlServer",
  "microsoft365Connector",
  "customConnector",
  "externalApi",
  "otherConnector"
] as const;

const VALID_CANVAS_PRIMARY_DATA_SOURCE_TYPES = [
  ...SELECTABLE_CANVAS_DATA_SOURCE_TYPES,
  "multiple",
  "undecided"
] as const;

const TARGET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const POWER_FX_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
// eslint-disable-next-line no-control-regex -- intentional check for unsafe path/reference characters
const UNSAFE_REFERENCE_PATTERN = /[\u0000-\u001F()[\];,\\/]|(?:\b(?:Patch|Remove|RemoveIf|UpdateIf|Filter|LookUp|RemoveIf|UpdateContext)\s*\()|(?:Gallery\.Selected|Form\.Item)/i;
const VALID_ACTIONS: readonly CanvasRecordLifecycleAction[] = ["archive", "restore", "delete"];
const VALID_TRIGGERS: readonly CanvasRecordLifecycleTrigger[] = ["controlOnSelect"];
const VALID_RECORD_CONTEXT_TYPES: readonly CanvasRecordContextType[] = ["selectedRecord", "formItem", "explicitRecordVariable", "missingDecision"];
const VALID_ARCHIVE_STRATEGIES: readonly CanvasArchiveStrategy[] = ["statusField", "activeFlag", "archivedFlag", "softDeleteFlag", "notApplicable"];
const VALID_DELETE_STRATEGIES: readonly CanvasDeleteStrategy[] = ["softDeleteOnly", "permanentDeleteApproved", "missingDecision"];
const VALID_DECISION_STATUSES: readonly PowerPlatformDecisionStatus[] = [
  "notStarted",
  "missingInformation",
  "reviewNeeded",
  "confirmed",
  "blocked",
  "notApplicable"
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAction(value: unknown): CanvasRecordLifecycleAction {
  const normalized = asString(value);
  return VALID_ACTIONS.includes(normalized as CanvasRecordLifecycleAction) ? normalized as CanvasRecordLifecycleAction : "" as CanvasRecordLifecycleAction;
}

function normalizeTrigger(value: unknown): CanvasRecordLifecycleTrigger {
  const normalized = asString(value);
  return VALID_TRIGGERS.includes(normalized as CanvasRecordLifecycleTrigger) ? normalized as CanvasRecordLifecycleTrigger : "" as CanvasRecordLifecycleTrigger;
}

function normalizeRecordContextType(value: unknown): CanvasRecordContextType {
  const normalized = asString(value);
  return VALID_RECORD_CONTEXT_TYPES.includes(normalized as CanvasRecordContextType) ? normalized as CanvasRecordContextType : "" as CanvasRecordContextType;
}

function normalizeArchiveStrategy(value: unknown): CanvasArchiveStrategy {
  const normalized = asString(value);
  return VALID_ARCHIVE_STRATEGIES.includes(normalized as CanvasArchiveStrategy) ? normalized as CanvasArchiveStrategy : "" as CanvasArchiveStrategy;
}

function normalizeDeleteStrategy(value: unknown): CanvasDeleteStrategy {
  const normalized = asString(value);
  return VALID_DELETE_STRATEGIES.includes(normalized as CanvasDeleteStrategy) ? normalized as CanvasDeleteStrategy : "" as CanvasDeleteStrategy;
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
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

function hasValidApprovedName(value: unknown): value is string {
  return typeof value === "string" && POWER_FX_IDENTIFIER_PATTERN.test(value.trim());
}

function isSafeReferenceId(value: string): boolean {
  return Boolean(value) && TARGET_ID_PATTERN.test(value) && !UNSAFE_REFERENCE_PATTERN.test(value);
}

function rawTargetHasMeaningfulLifecycleProperties(item: Record<string, unknown>): boolean {
  return [
    "id",
    "action",
    "trigger",
    "triggerControlId",
    "screenTargetId",
    "connectorId",
    "entityId",
    "recordContextType",
    "recordContextReferenceId",
    "archiveStrategy",
    "lifecycleFieldId",
    "archiveValue",
    "restoreValue",
    "deleteStrategy",
    "confirmationStatus",
    "destructiveActionConfirmed",
    "required",
    "sortOrder"
  ].some((key) => key in item);
}

export function normalizeCanvasRecordLifecycleTargets(input: unknown): CanvasRecordLifecycleTarget[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    if (!isObject(item)) return [];
    if (!rawTargetHasMeaningfulLifecycleProperties(item)) return [];
    return [{
      id: asString(item.id),
      action: normalizeAction(item.action),
      trigger: normalizeTrigger(item.trigger),
      triggerControlId: asString(item.triggerControlId),
      screenTargetId: asString(item.screenTargetId),
      connectorId: asString(item.connectorId),
      entityId: asString(item.entityId),
      recordContextType: normalizeRecordContextType(item.recordContextType),
      recordContextReferenceId: asString(item.recordContextReferenceId),
      archiveStrategy: normalizeArchiveStrategy(item.archiveStrategy),
      lifecycleFieldId: asString(item.lifecycleFieldId),
      archiveValue: asString(item.archiveValue),
      restoreValue: asString(item.restoreValue),
      deleteStrategy: normalizeDeleteStrategy(item.deleteStrategy),
      confirmationStatus: normalizeDecisionStatus(item.confirmationStatus),
      destructiveActionConfirmed: typeof item.destructiveActionConfirmed === "boolean" ? item.destructiveActionConfirmed : false,
      required: typeof item.required === "boolean" ? item.required : false,
      sortOrder: normalizeSortOrder(item.sortOrder)
    }];
  });
}

export function orderCanvasRecordLifecycleTargets(targets: CanvasRecordLifecycleTarget[]): CanvasRecordLifecycleTarget[] {
  return [...targets].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function isCanvasProject(project: ProjectRecord): boolean {
  return project.intake.appType === "powerAppsCanvas";
}

function rawMalformedInputIssues(input: unknown): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return ["Canvas record lifecycle target data must be an array when provided."];
  const issues: string[] = [];
  input.forEach((item, index) => {
    if (!isObject(item)) {
      issues.push(`Canvas record lifecycle target record ${index + 1} is malformed and must be an object.`);
      return;
    }
    if (!rawTargetHasMeaningfulLifecycleProperties(item)) {
      issues.push(`Canvas record lifecycle target record ${index + 1} does not contain recognizable lifecycle data.`);
      return;
    }
    const requiredFields = ["id", "action", "trigger", "triggerControlId", "screenTargetId", "connectorId", "entityId", "recordContextType", "recordContextReferenceId", "archiveStrategy", "deleteStrategy", "confirmationStatus"];
    const missingFields = requiredFields.filter((field) => !asString(item[field]));
    if (missingFields.length > 0) issues.push(`Canvas record lifecycle target record ${index + 1} is incomplete: ${missingFields.join(", ")}.`);
    if (!("destructiveActionConfirmed" in item)) issues.push(`Canvas record lifecycle target record ${index + 1} is incomplete: destructiveActionConfirmed.`);
    if (!("required" in item)) issues.push(`Canvas record lifecycle target record ${index + 1} is incomplete: required.`);
    if (!("sortOrder" in item)) issues.push(`Canvas record lifecycle target record ${index + 1} is incomplete: sortOrder.`);
    if (item.action !== undefined && !VALID_ACTIONS.includes(asString(item.action) as CanvasRecordLifecycleAction)) issues.push(`Canvas record lifecycle target record ${index + 1} has an unsupported action.`);
    if (item.trigger !== undefined && !VALID_TRIGGERS.includes(asString(item.trigger) as CanvasRecordLifecycleTrigger)) issues.push(`Canvas record lifecycle target record ${index + 1} has an unsupported trigger.`);
    if (item.recordContextType !== undefined && !VALID_RECORD_CONTEXT_TYPES.includes(asString(item.recordContextType) as CanvasRecordContextType)) issues.push(`Canvas record lifecycle target record ${index + 1} has an unsupported record context type.`);
    if (item.archiveStrategy !== undefined && !VALID_ARCHIVE_STRATEGIES.includes(asString(item.archiveStrategy) as CanvasArchiveStrategy)) issues.push(`Canvas record lifecycle target record ${index + 1} has an unsupported archive strategy.`);
    if (item.deleteStrategy !== undefined && !VALID_DELETE_STRATEGIES.includes(asString(item.deleteStrategy) as CanvasDeleteStrategy)) issues.push(`Canvas record lifecycle target record ${index + 1} has an unsupported delete strategy.`);
    if (item.confirmationStatus !== undefined && !VALID_DECISION_STATUSES.includes(item.confirmationStatus as PowerPlatformDecisionStatus)) issues.push(`Canvas record lifecycle target record ${index + 1} has an unsupported confirmation status.`);
    if ("destructiveActionConfirmed" in item && typeof item.destructiveActionConfirmed !== "boolean") issues.push(`Canvas record lifecycle target record ${index + 1} destructiveActionConfirmed must be Boolean.`);
    if ("required" in item && typeof item.required !== "boolean") issues.push(`Canvas record lifecycle target record ${index + 1} required must be Boolean.`);
    if ("sortOrder" in item && (typeof item.sortOrder !== "number" || !Number.isFinite(item.sortOrder))) issues.push(`Canvas record lifecycle target record ${index + 1} sortOrder must be a finite number.`);
    ["id", "triggerControlId", "screenTargetId", "connectorId", "entityId", "recordContextReferenceId", "lifecycleFieldId"].forEach((field) => {
      const value = asString(item[field]);
      if (value && UNSAFE_REFERENCE_PATTERN.test(value)) issues.push(`Canvas record lifecycle target record ${index + 1} ${field} contains unsafe or formula-looking content.`);
    });
  });
  return issues;
}

function lifecycleValidationNeedsCurrentCollections(input: unknown, normalizedTargets: CanvasRecordLifecycleTarget[]): boolean {
  return normalizedTargets.length > 0 || !(input === undefined || (Array.isArray(input) && input.length === 0));
}

function canvasArrayIssues(canvas: Record<string, unknown>, property: CanvasArrayProperty, allowUndefined = false): string[] {
  const value = canvas[property];
  if (value === undefined && allowUndefined) return [];
  if (!Array.isArray(value)) return [`powerPlatform.canvas.${property} must be an array`];
  return value.flatMap((item, index) => isObject(item) ? [] : [`powerPlatform.canvas.${property} record ${index + 1} must be an object`]);
}

function connectorArrayIssues(common: Record<string, unknown> | undefined): string[] {
  if (!common || !Array.isArray(common.connectors)) return ["powerPlatform.common.connectors must be an array"];
  return common.connectors.flatMap((item, index) => isObject(item) ? [] : [`powerPlatform.common.connectors record ${index + 1} must be an object`]);
}

function objectArray<T extends Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter(isObject) as T[] : [];
}

function connectorSelectionIssues(canvas: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (typeof canvas.primaryDataSourceType !== "string" || !VALID_CANVAS_PRIMARY_DATA_SOURCE_TYPES.includes(canvas.primaryDataSourceType.trim() as (typeof VALID_CANVAS_PRIMARY_DATA_SOURCE_TYPES)[number]) || UNSAFE_REFERENCE_PATTERN.test(canvas.primaryDataSourceType.trim())) {
    issues.push("powerPlatform.canvas.primaryDataSourceType is unsupported");
  }

  if (typeof canvas.primaryConnectorId !== "string" || !isSafeReferenceId(canvas.primaryConnectorId.trim())) {
    issues.push("powerPlatform.canvas.primaryConnectorId must be a safe string ID");
  }

  if (!Array.isArray(canvas.secondaryConnectorIds)) {
    issues.push("powerPlatform.canvas.secondaryConnectorIds must be an array");
  } else {
    canvas.secondaryConnectorIds.forEach((item, index) => {
      if (typeof item !== "string" || !isSafeReferenceId(item.trim())) {
        issues.push(`powerPlatform.canvas.secondaryConnectorIds record ${index + 1} must be a safe string ID`);
      }
    });
  }

  if (!Array.isArray(canvas.selectedDataSourceTypes)) {
    issues.push("powerPlatform.canvas.selectedDataSourceTypes must be an array");
  } else {
    const seen = new Set<string>();
    canvas.selectedDataSourceTypes.forEach((item, index) => {
      if (typeof item !== "string" || item.trim().length === 0) {
        issues.push(`powerPlatform.canvas.selectedDataSourceTypes record ${index + 1} must be a supported string value`);
        return;
      }
      const normalized = item.trim();
      if (!SELECTABLE_CANVAS_DATA_SOURCE_TYPES.includes(normalized as (typeof SELECTABLE_CANVAS_DATA_SOURCE_TYPES)[number])) {
        issues.push(`powerPlatform.canvas.selectedDataSourceTypes record ${index + 1} is unsupported`);
        return;
      }
      if (seen.has(normalized)) issues.push(`powerPlatform.canvas.selectedDataSourceTypes record ${index + 1} is duplicated`);
      seen.add(normalized);
    });
    if (canvas.primaryDataSourceType === "multiple" && seen.size < 2) {
      issues.push("Canvas multiple-source mode requires at least two selected backend types.");
    }
  }
  return issues;
}

function currentRecordIssues(project: ProjectRecord): string[] {
  const canvas = project.powerPlatform?.canvas as unknown as Record<string, unknown> | undefined;
  const common = project.powerPlatform?.common as unknown as Record<string, unknown> | undefined;
  if (!canvas) return ["powerPlatform.canvas must be present for Canvas lifecycle validation"];
  const issues: string[] = [
    ...connectorSelectionIssues(canvas),
    ...connectorArrayIssues(common),
    ...canvasArrayIssues(canvas, "screenTargets"),
    ...canvasArrayIssues(canvas, "controlTargets"),
    ...canvasArrayIssues(canvas, "stateVariableTargets"),
    ...canvasArrayIssues(canvas, "formOperationTargets"),
    ...canvasArrayIssues(canvas, "formModeTargets"),
    ...canvasArrayIssues(canvas, "recordLifecycleTargets", true),
    ...canvasArrayIssues(canvas, "sharePointListSchemas"),
    ...canvasArrayIssues(canvas, "sharePointLibrarySchemas"),
    ...canvasArrayIssues(canvas, "sharePointColumnSchemas"),
    ...canvasArrayIssues(canvas, "dataverseTableSchemas"),
    ...canvasArrayIssues(canvas, "dataverseColumnSchemas"),
    ...canvasArrayIssues(canvas, "connectorResourceSchemas"),
    ...canvasArrayIssues(canvas, "connectorFieldSchemas")
  ];

  objectArray(canvas.screenTargets).forEach((screen, index) => {
    if (!asString(screen.id) || !VALID_DECISION_STATUSES.includes(screen.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.screenTargets record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.controlTargets).forEach((control, index) => {
    if (!asString(control.id) || !asString(control.screenId) || !asString(control.controlType) || !VALID_DECISION_STATUSES.includes(control.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.controlTargets record ${index + 1} is malformed`);
    }
  });
  objectArray(common?.connectors).forEach((connector, index) => {
    if (!asString(connector.id) || !asString(connector.dataSourceType) || !isObject(connector.supportedOperations)) {
      issues.push(`powerPlatform.common.connectors record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.stateVariableTargets).forEach((variable, index) => {
    if (!asString(variable.id) || !("implementationName" in variable) || !VALID_DECISION_STATUSES.includes(variable.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.stateVariableTargets record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.formOperationTargets).forEach((target, index) => {
    if (!asString(target.id)
      || typeof target.submitControlId !== "string"
      || !isSafeReferenceId(target.submitControlId.trim())) {
      issues.push(`powerPlatform.canvas.formOperationTargets record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.formModeTargets).forEach((target, index) => {
    if (!asString(target.id)
      || typeof target.triggerControlId !== "string"
      || !isSafeReferenceId(target.triggerControlId.trim())) {
      issues.push(`powerPlatform.canvas.formModeTargets record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.sharePointListSchemas).forEach((entity, index) => {
    if (!asString(entity.id) || !VALID_DECISION_STATUSES.includes(entity.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.sharePointListSchemas record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.sharePointLibrarySchemas).forEach((entity, index) => {
    if (!asString(entity.id) || !VALID_DECISION_STATUSES.includes(entity.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.sharePointLibrarySchemas record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.dataverseTableSchemas).forEach((entity, index) => {
    if (!asString(entity.id) || !VALID_DECISION_STATUSES.includes(entity.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.dataverseTableSchemas record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.connectorResourceSchemas).forEach((entity, index) => {
    if (!asString(entity.id) || !asString(entity.connectorId) || !VALID_DECISION_STATUSES.includes(entity.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.connectorResourceSchemas record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.sharePointColumnSchemas).forEach((field, index) => {
    if (!asString(field.id) || !asString(field.parentId) || !asString(field.columnType) || !VALID_DECISION_STATUSES.includes(field.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.sharePointColumnSchemas record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.dataverseColumnSchemas).forEach((field, index) => {
    if (!asString(field.id) || !asString(field.tableId) || !asString(field.dataType) || !VALID_DECISION_STATUSES.includes(field.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.dataverseColumnSchemas record ${index + 1} is malformed`);
    }
  });
  objectArray(canvas.connectorFieldSchemas).forEach((field, index) => {
    if (!asString(field.id) || !asString(field.connectorId) || !asString(field.resourceId) || !asString(field.fieldType) || !VALID_DECISION_STATUSES.includes(field.confirmationStatus as PowerPlatformDecisionStatus)) {
      issues.push(`powerPlatform.canvas.connectorFieldSchemas record ${index + 1} is malformed`);
    }
  });
  if (issues.length === 0) {
    issues.push(...reconcileCanvasConnectorSelection(project).blockers);
  }
  return unique(issues);
}

function connectorIsConfirmed(connector: PowerPlatformConnector | undefined): boolean {
  return Boolean(connector
    && connector.classificationConfirmationStatus === "confirmed"
    && connector.licensingConfirmationStatus === "confirmed"
    && connector.approvalConfirmationStatus === "confirmed"
    && connector.connectionOwnershipStatus === "confirmed");
}

function activeConnectorIds(project: ProjectRecord): Set<string> {
  return new Set(reconcileCanvasConnectorSelection(project).activeConnectorIds);
}

function activeCompatibleConnectors(project: ProjectRecord, entityType: EntityKind): PowerPlatformConnector[] {
  const activeIds = activeConnectorIds(project);
  return (project.powerPlatform?.common.connectors ?? []).filter((connector) =>
    activeIds.has(connector.id) && connectorSupportsCanvasEntity(connector.dataSourceType, entityType)
  );
}

function resolveImplicitEntityOwnership(
  project: ProjectRecord,
  target: CanvasRecordLifecycleTarget,
  entity: { entityId: string; entityType: Exclude<EntityKind, "connectorResource">; confirmationStatus: PowerPlatformDecisionStatus },
  issues: string[],
  missingDecisions: string[]
): EntityReference | undefined {
  const compatibleConnectors = activeCompatibleConnectors(project, entity.entityType);
  if (compatibleConnectors.length === 0) {
    issues.push(`Lifecycle target ${target.id || "[missing]"} references inactive or unresolved entity ${entity.entityId}; no active compatible connector is selected.`);
    missingDecisions.push(`Confirm active connector ownership for lifecycle entity ${entity.entityId}.`);
    return undefined;
  }
  if (compatibleConnectors.length > 1) {
    issues.push(`Lifecycle target ${target.id || "[missing]"} entity ${entity.entityId} has ambiguous connector ownership across active compatible connectors.`);
    missingDecisions.push(`Confirm the canonical connector owner for lifecycle entity ${entity.entityId}.`);
    return undefined;
  }
  const owner = compatibleConnectors[0];
  if (target.connectorId !== owner.id) {
    issues.push(`Lifecycle target ${target.id || "[missing]"} connector ${target.connectorId || "[missing]"} does not match canonical owner ${owner.id} for entity ${entity.entityId}.`);
    return undefined;
  }
  return {
    entityId: entity.entityId,
    connectorId: owner.id,
    entityType: entity.entityType,
    confirmationStatus: entity.confirmationStatus,
    permanentDeleteSupported: owner.supportedOperations.delete === true
  };
}

function resolveEntity(
  project: ProjectRecord,
  target: CanvasRecordLifecycleTarget,
  issues: string[],
  missingDecisions: string[]
): EntityReference | undefined {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return undefined;
  const activeIds = activeConnectorIds(project);
  const spList = canvas.sharePointListSchemas.find((entity) => entity.id === target.entityId);
  if (spList) {
    return resolveImplicitEntityOwnership(project, target, {
      entityId: spList.id,
      entityType: "sharePointList",
      confirmationStatus: spList.confirmationStatus
    }, issues, missingDecisions);
  }
  const spLibrary = canvas.sharePointLibrarySchemas.find((entity) => entity.id === target.entityId);
  if (spLibrary) {
    return resolveImplicitEntityOwnership(project, target, {
      entityId: spLibrary.id,
      entityType: "sharePointLibrary",
      confirmationStatus: spLibrary.confirmationStatus
    }, issues, missingDecisions);
  }
  const dvTable = canvas.dataverseTableSchemas.find((entity) => entity.id === target.entityId);
  if (dvTable) {
    return resolveImplicitEntityOwnership(project, target, {
      entityId: dvTable.id,
      entityType: "dataverseTable",
      confirmationStatus: dvTable.confirmationStatus
    }, issues, missingDecisions);
  }
  const resource = canvas.connectorResourceSchemas.find((entity) => entity.id === target.entityId);
  if (resource) {
    const connector = (project.powerPlatform?.common.connectors ?? []).find((candidate) =>
      candidate.id === target.connectorId
      && candidate.id === resource.connectorId
      && activeIds.has(candidate.id)
      && connectorSupportsCanvasEntity(candidate.dataSourceType, "connectorResource")
    );
    if (target.connectorId !== resource.connectorId) {
      issues.push(`Lifecycle target ${target.id || "[missing]"} connector ${target.connectorId || "[missing]"} does not match connector-resource owner ${resource.connectorId || "[missing]"}.`);
      return undefined;
    }
    if (!connector) {
      issues.push(`Lifecycle target ${target.id || "[missing]"} references inactive, missing, or incompatible connector-resource owner ${resource.connectorId || "[missing]"}.`);
      missingDecisions.push(`Confirm active connector-resource ownership for lifecycle entity ${resource.id}.`);
      return undefined;
    }
    return {
      entityId: resource.id,
      connectorId: connector.id,
      entityType: "connectorResource",
      confirmationStatus: resource.confirmationStatus,
      permanentDeleteSupported: connector.supportedOperations.delete === true
    };
  }
  return undefined;
}

function fieldKindFromType(fieldType: string): FieldReference["fieldKind"] {
  const normalized = fieldType.trim().toLowerCase();
  if (/(boolean|yes\/no|two options|checkbox|toggle)/.test(normalized)) return "boolean";
  if (/(choice|option|status|enum|text|string|single line)/.test(normalized)) return "status";
  return "other";
}

function resolveField(project: ProjectRecord, entity: EntityReference | undefined, fieldId: string): FieldReference | undefined {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas || !entity || !fieldId) return undefined;
  if (entity.entityType === "sharePointList" || entity.entityType === "sharePointLibrary") {
    const column = canvas.sharePointColumnSchemas.find((candidate) =>
      candidate.id === fieldId
      && candidate.parentId === entity.entityId
      && (entity.entityType === "sharePointList" ? candidate.parentType === "list" : candidate.parentType === "library")
    ) as SharePointColumnSchema | undefined;
    return column ? {
      fieldId: column.id,
      parentEntityId: column.parentId,
      confirmationStatus: column.confirmationStatus,
      fieldKind: fieldKindFromType(column.columnType)
    } : undefined;
  }
  if (entity.entityType === "dataverseTable") {
    const column = canvas.dataverseColumnSchemas.find((candidate) => candidate.id === fieldId && candidate.tableId === entity.entityId) as DataverseColumnSchema | undefined;
    return column ? {
      fieldId: column.id,
      parentEntityId: column.tableId,
      confirmationStatus: column.confirmationStatus,
      fieldKind: fieldKindFromType(column.dataType)
    } : undefined;
  }
  const field = canvas.connectorFieldSchemas.find((candidate) =>
    candidate.id === fieldId
    && candidate.connectorId === entity.connectorId
    && candidate.resourceId === entity.entityId
  ) as ConnectorFieldSchema | undefined;
  return field ? {
    fieldId: field.id,
    parentEntityId: field.resourceId,
    confirmationStatus: field.confirmationStatus,
    fieldKind: fieldKindFromType(field.fieldType)
  } : undefined;
}

function isComplementaryBooleanPair(archiveValue: string, restoreValue: string, archiveExpected: string, restoreExpected: string): boolean {
  return archiveValue.trim().toLowerCase() === archiveExpected && restoreValue.trim().toLowerCase() === restoreExpected;
}

function validateFieldStrategy(target: CanvasRecordLifecycleTarget, field: FieldReference | undefined, issues: string[], missingDecisions: string[]): void {
  if (!field) {
    issues.push(`Lifecycle target ${target.id || "[missing]"} references missing lifecycle field ${target.lifecycleFieldId || "[missing]"}.`);
    missingDecisions.push(`Confirm lifecycle field for target ${target.id || "[missing]"}.`);
    return;
  }
  if (field.confirmationStatus !== "confirmed") issues.push(`Lifecycle target ${target.id} references unconfirmed lifecycle field ${target.lifecycleFieldId}.`);
  if (target.archiveStrategy === "statusField") {
    if (field.fieldKind !== "status") issues.push(`Lifecycle target ${target.id} statusField strategy requires a text, choice, option-set, enum, or equivalent status field.`);
    if (!target.archiveValue) {
      issues.push(`Lifecycle target ${target.id} statusField strategy requires a non-empty archive value.`);
      missingDecisions.push(`Confirm archive value for lifecycle target ${target.id}.`);
    }
    if (!target.restoreValue) {
      issues.push(`Lifecycle target ${target.id} statusField strategy requires a non-empty restore value.`);
      missingDecisions.push(`Confirm restore value for lifecycle target ${target.id}.`);
    }
    if (target.archiveValue && target.restoreValue && target.archiveValue === target.restoreValue) issues.push(`Lifecycle target ${target.id} archive and restore values must differ.`);
    return;
  }
  if (field.fieldKind !== "boolean") issues.push(`Lifecycle target ${target.id} ${target.archiveStrategy} strategy requires a Boolean-compatible field.`);
  if (target.archiveStrategy === "activeFlag" && !isComplementaryBooleanPair(target.archiveValue, target.restoreValue, "false", "true")) {
    issues.push(`Lifecycle target ${target.id} activeFlag strategy requires archiveValue false and restoreValue true.`);
  }
  if ((target.archiveStrategy === "archivedFlag" || target.archiveStrategy === "softDeleteFlag") && !isComplementaryBooleanPair(target.archiveValue, target.restoreValue, "true", "false")) {
    issues.push(`Lifecycle target ${target.id} ${target.archiveStrategy} strategy requires archiveValue true and restoreValue false.`);
  }
}

function validateRecordContext(
  project: ProjectRecord,
  target: CanvasRecordLifecycleTarget,
  triggerScreenId: string,
  issues: string[],
  missingDecisions: string[]
): void {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return;
  if (!isSafeReferenceId(target.recordContextReferenceId) && target.recordContextType !== "missingDecision") {
    issues.push(`Lifecycle target ${target.id || "[missing]"} record context reference is missing or unsafe.`);
    return;
  }
  if (target.recordContextType === "missingDecision") {
    if (target.required) {
      issues.push(`Lifecycle target ${target.id || "[missing]"} requires a record-context decision.`);
      missingDecisions.push(`Confirm record context for lifecycle target ${target.id || "[missing]"}.`);
    }
    return;
  }
  const control = canvas.controlTargets.find((candidate) => candidate.id === target.recordContextReferenceId);
  if (target.recordContextType === "selectedRecord") {
    if (!control) {
      issues.push(`Lifecycle target ${target.id} selectedRecord context references missing control ${target.recordContextReferenceId}.`);
      return;
    }
    if (control.screenId !== triggerScreenId) issues.push(`Lifecycle target ${target.id} selectedRecord context must be on the same screen.`);
    if (control.confirmationStatus !== "confirmed") issues.push(`Lifecycle target ${target.id} selectedRecord context control is unconfirmed.`);
    if (!["gallery", "data table", "datatable", "data-table"].includes(normalizeControlType(control.controlType))) {
      issues.push(`Lifecycle target ${target.id} selectedRecord context requires a confirmed gallery or data-table control.`);
    }
    return;
  }
  if (target.recordContextType === "formItem") {
    if (!control) {
      issues.push(`Lifecycle target ${target.id} formItem context references missing control ${target.recordContextReferenceId}.`);
      return;
    }
    if (control.screenId !== triggerScreenId) issues.push(`Lifecycle target ${target.id} formItem context must be on the same screen.`);
    if (control.confirmationStatus !== "confirmed") issues.push(`Lifecycle target ${target.id} formItem context control is unconfirmed.`);
    if (!["form", "edit form", "display form"].includes(normalizeControlType(control.controlType))) {
      issues.push(`Lifecycle target ${target.id} formItem context requires a confirmed form control.`);
    }
    return;
  }
  const variable = canvas.stateVariableTargets.find((candidate) => candidate.id === target.recordContextReferenceId) as CanvasStateVariableTarget | undefined;
  if (!variable) {
    issues.push(`Lifecycle target ${target.id} explicitRecordVariable context references missing state variable ${target.recordContextReferenceId}.`);
    return;
  }
  if (variable.confirmationStatus !== "confirmed") issues.push(`Lifecycle target ${target.id} explicitRecordVariable context references an unconfirmed state variable.`);
  if (!hasValidApprovedName(variable.implementationName)) issues.push(`Lifecycle target ${target.id} explicitRecordVariable context references a malformed state variable name.`);
}

function validateTarget(
  project: ProjectRecord,
  target: CanvasRecordLifecycleTarget,
  triggerControlUseCounts: Map<string, number>,
  reservedSubmitControlIds: Set<string>,
  reservedFormModeControlIds: Set<string>,
  issues: string[],
  missingDecisions: string[]
): void {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return;
  if (!target.id) issues.push("Lifecycle target ID is missing.");
  else if (!TARGET_ID_PATTERN.test(target.id) || UNSAFE_REFERENCE_PATTERN.test(target.id)) issues.push(`Lifecycle target ${target.id} ID is not a safe stable identifier.`);
  if (!target.action) issues.push(`Lifecycle target ${target.id || "[missing]"} has an unsupported action.`);
  if (target.trigger !== "controlOnSelect") issues.push(`Lifecycle target ${target.id || "[missing]"} has an unsupported trigger.`);
  if (!target.required) missingDecisions.push(`Confirm whether lifecycle target ${target.id || "[missing]"} is required.`);
  if (target.confirmationStatus !== "confirmed") {
    issues.push(`Lifecycle target ${target.id || "[missing]"} requires confirmed status.`);
    missingDecisions.push(`Confirm lifecycle target ${target.id || "[missing]"}.`);
  }

  const screen = canvas.screenTargets.find((candidate) => candidate.id === target.screenTargetId);
  if (!screen) issues.push(`Lifecycle target ${target.id || "[missing]"} references missing screen ${target.screenTargetId || "[missing]"}.`);
  else if (screen.confirmationStatus !== "confirmed") issues.push(`Lifecycle target ${target.id} references unconfirmed screen ${target.screenTargetId}.`);

  if (reservedSubmitControlIds.has(target.triggerControlId)) issues.push(`Lifecycle target ${target.id || "[missing]"} trigger control ${target.triggerControlId} already owns a form-submission OnSelect responsibility.`);
  if (reservedFormModeControlIds.has(target.triggerControlId)) issues.push(`Lifecycle target ${target.id || "[missing]"} trigger control ${target.triggerControlId} already owns a form-mode OnSelect responsibility.`);
  if ((triggerControlUseCounts.get(target.triggerControlId) ?? 0) > 1) issues.push(`Lifecycle trigger control ${target.triggerControlId || "[missing]"} is reused by multiple lifecycle targets.`);
  const triggerControl = canvas.controlTargets.find((candidate) => candidate.id === target.triggerControlId);
  if (!triggerControl) {
    issues.push(`Lifecycle target ${target.id || "[missing]"} references missing trigger control ${target.triggerControlId || "[missing]"}.`);
  } else {
    if (triggerControl.screenId !== target.screenTargetId) issues.push(`Lifecycle target ${target.id} trigger control ${target.triggerControlId} is not on screen ${target.screenTargetId}.`);
    if (triggerControl.confirmationStatus !== "confirmed") issues.push(`Lifecycle target ${target.id} references unconfirmed trigger control ${target.triggerControlId}.`);
    if (normalizeControlType(triggerControl.controlType) !== "button") issues.push(`Lifecycle target ${target.id} trigger control ${target.triggerControlId} is not a confirmed button.`);
    if (!hasValidApprovedName(triggerControl.approvedControlName)) issues.push(`Lifecycle target ${target.id} trigger control ${target.triggerControlId} has an invalid approved implementation name.`);
  }

  const connector = project.powerPlatform?.common.connectors.find((candidate) => candidate.id === target.connectorId);
  if (!connector) issues.push(`Lifecycle target ${target.id || "[missing]"} references missing connector ${target.connectorId || "[missing]"}.`);
  else if (!connectorIsConfirmed(connector)) issues.push(`Lifecycle target ${target.id} references unconfirmed connector ${target.connectorId}.`);
  const entity = resolveEntity(project, target, issues, missingDecisions);
  if (!entity) issues.push(`Lifecycle target ${target.id || "[missing]"} references missing or unsupported entity ${target.entityId || "[missing]"} for connector ${target.connectorId || "[missing]"}.`);
  else if (entity.confirmationStatus !== "confirmed") issues.push(`Lifecycle target ${target.id} references unconfirmed entity ${target.entityId}.`);

  validateRecordContext(project, target, target.screenTargetId, issues, missingDecisions);

  const field = resolveField(project, entity, target.lifecycleFieldId);
  if (target.action === "archive" || target.action === "restore") {
    if (target.deleteStrategy !== "missingDecision") issues.push(`Lifecycle target ${target.id} archive/restore actions must not carry a delete strategy.`);
    if (target.archiveStrategy === "notApplicable" || !target.archiveStrategy) issues.push(`Lifecycle target ${target.id} archive/restore action requires an applicable archive strategy.`);
    else validateFieldStrategy(target, field, issues, missingDecisions);
  }
  if (target.action === "delete") {
    if (target.archiveStrategy !== "notApplicable") {
      issues.push(`Lifecycle target ${target.id} delete action requires archiveStrategy notApplicable.`);
    }
    if (target.deleteStrategy === "missingDecision" || !target.deleteStrategy) {
      issues.push(`Lifecycle target ${target.id} delete action requires an approved delete strategy.`);
      missingDecisions.push(`Confirm delete strategy for lifecycle target ${target.id}.`);
    }
    if (target.deleteStrategy === "softDeleteOnly") {
      if (!field) {
        issues.push(`Lifecycle target ${target.id} soft delete requires an explicit lifecycle field.`);
        missingDecisions.push(`Confirm soft-delete lifecycle field for target ${target.id}.`);
      } else {
        if (field.confirmationStatus !== "confirmed") issues.push(`Lifecycle target ${target.id} soft delete references an unconfirmed lifecycle field.`);
        if (field.fieldKind !== "boolean") issues.push(`Lifecycle target ${target.id} soft delete requires a Boolean-compatible lifecycle field.`);
      }
      if (!["true", "false"].includes(target.archiveValue.toLowerCase())) issues.push(`Lifecycle target ${target.id} soft delete requires an approved Boolean delete-active value.`);
      if (target.restoreValue) issues.push(`Lifecycle target ${target.id} soft delete must not define a restore value.`);
    }
    if (target.deleteStrategy === "permanentDeleteApproved") {
      if (target.lifecycleFieldId || target.archiveValue || target.restoreValue) issues.push(`Lifecycle target ${target.id} permanent delete must not define lifecycle field values.`);
      if (target.destructiveActionConfirmed !== true) issues.push(`Lifecycle target ${target.id} permanent delete requires destructiveActionConfirmed true.`);
      if (target.confirmationStatus !== "confirmed") issues.push(`Lifecycle target ${target.id} permanent delete requires confirmed status.`);
      if (!entity?.permanentDeleteSupported) issues.push(`Lifecycle target ${target.id} permanent delete is not explicitly permitted by the current connector/entity model.`);
    }
  }
}

function addDuplicateIssues(targets: CanvasRecordLifecycleTarget[], issues: string[]): void {
  const ids = new Map<string, number>();
  const sortOrders = new Map<number, string[]>();
  const triggers = new Map<string, string[]>();
  const actionContext = new Map<string, string[]>();
  const fieldActions = new Map<string, string[]>();
  const strategiesByEntity = new Map<string, Set<string>>();
  targets.forEach((target) => {
    ids.set(target.id, (ids.get(target.id) ?? 0) + 1);
    sortOrders.set(target.sortOrder, [...(sortOrders.get(target.sortOrder) ?? []), target.id]);
    triggers.set(target.triggerControlId, [...(triggers.get(target.triggerControlId) ?? []), target.id]);
    const contextKey = `${target.action}|${target.connectorId}|${target.entityId}|${target.recordContextType}|${target.recordContextReferenceId}`;
    actionContext.set(contextKey, [...(actionContext.get(contextKey) ?? []), target.id]);
    if (target.lifecycleFieldId) {
      const fieldKey = `${target.action}|${target.connectorId}|${target.entityId}|${target.lifecycleFieldId}`;
      fieldActions.set(fieldKey, [...(fieldActions.get(fieldKey) ?? []), target.id]);
    }
    if ((target.action === "archive" || target.action === "restore") && target.archiveStrategy && target.archiveStrategy !== "notApplicable") {
      const entityKey = `${target.connectorId}|${target.entityId}`;
      strategiesByEntity.set(entityKey, new Set([...(strategiesByEntity.get(entityKey) ?? []), target.archiveStrategy]));
    }
  });
  for (const [id, count] of ids) if (id && count > 1) issues.push(`Duplicate lifecycle target ID: ${id}.`);
  for (const [sortOrder, targetIds] of sortOrders) if (targetIds.length > 1) issues.push(`Duplicate lifecycle target sort order ${sortOrder}: ${targetIds.sort().join(", ")}.`);
  for (const [triggerControlId, targetIds] of triggers) if (triggerControlId && targetIds.length > 1) issues.push(`Lifecycle trigger control ${triggerControlId} is used by multiple lifecycle targets: ${targetIds.sort().join(", ")}.`);
  for (const [key, targetIds] of actionContext) if (targetIds.length > 1) issues.push(`Duplicate lifecycle ${key.split("|")[0]} targets for the same connector/entity/context: ${targetIds.sort().join(", ")}.`);
  for (const [key, targetIds] of fieldActions) if (targetIds.length > 1) issues.push(`Duplicate lifecycle field/action combination ${key}: ${targetIds.sort().join(", ")}.`);
  for (const [entityKey, strategies] of strategiesByEntity) if (strategies.size > 1) issues.push(`Conflicting archive strategies for connector/entity ${entityKey}.`);
}

function addArchiveRestorePairIssues(targets: CanvasRecordLifecycleTarget[], issues: string[]): void {
  const archives = targets.filter((target) => target.action === "archive");
  const restores = targets.filter((target) => target.action === "restore");
  archives.forEach((archive) => {
    restores
      .filter((restore) => restore.connectorId === archive.connectorId && restore.entityId === archive.entityId)
      .forEach((restore) => {
        if (archive.archiveStrategy !== restore.archiveStrategy) issues.push(`Archive and restore lifecycle targets for ${archive.connectorId}/${archive.entityId} must use the same archive strategy.`);
        if (archive.lifecycleFieldId !== restore.lifecycleFieldId) issues.push(`Archive and restore lifecycle targets for ${archive.connectorId}/${archive.entityId} must use the same lifecycle field.`);
        if (archive.archiveValue !== restore.archiveValue || archive.restoreValue !== restore.restoreValue) issues.push(`Archive and restore lifecycle targets for ${archive.connectorId}/${archive.entityId} must use complementary values.`);
        if (archive.triggerControlId === restore.triggerControlId) issues.push(`Archive and restore lifecycle targets for ${archive.connectorId}/${archive.entityId} must use distinct trigger controls.`);
        if (archive.recordContextType !== restore.recordContextType && (archive.confirmationStatus !== "confirmed" || restore.confirmationStatus !== "confirmed")) {
          issues.push(`Archive and restore lifecycle targets for ${archive.connectorId}/${archive.entityId} need explicit confirmation when record-context types differ.`);
        }
      });
  });
}

export function validateCanvasRecordLifecycleTargets(
  project: ProjectRecord,
  input: unknown = project.powerPlatform?.canvas?.recordLifecycleTargets
): CanvasRecordLifecycleValidationResult {
  if (!isCanvasProject(project)) {
    return { normalizedTargets: [], orderedTargets: [], blockingIssues: [], missingDecisions: [], eligibilityStatus: "Not Applicable" };
  }
  const normalizedTargets = normalizeCanvasRecordLifecycleTargets(input);
  const orderedTargets = orderCanvasRecordLifecycleTargets(normalizedTargets);
  const rawIssues = rawMalformedInputIssues(input);
  if ((input === undefined || (Array.isArray(input) && input.length === 0)) && normalizedTargets.length === 0) {
    return { normalizedTargets, orderedTargets, blockingIssues: [], missingDecisions: [], eligibilityStatus: "Not Applicable" };
  }
  const blockingIssues: string[] = [...rawIssues];
  const missingDecisions: string[] = [];
  let currentShapeIssues: string[] = [];
  if (lifecycleValidationNeedsCurrentCollections(input, normalizedTargets)) {
    currentShapeIssues = currentRecordIssues(project);
    blockingIssues.push(...currentShapeIssues);
  }
  if (normalizedTargets.length === 0) {
    return {
      normalizedTargets,
      orderedTargets,
      blockingIssues: unique(blockingIssues.length > 0 ? blockingIssues : ["Canvas record lifecycle target data does not contain any valid target records."]),
      missingDecisions,
      eligibilityStatus: "Blocked"
    };
  }
  if (currentShapeIssues.length > 0) {
    return {
      normalizedTargets,
      orderedTargets,
      blockingIssues: unique(blockingIssues),
      missingDecisions,
      eligibilityStatus: "Blocked"
    };
  }

  const canvas = project.powerPlatform?.canvas;
  const triggerCounts = new Map<string, number>();
  orderedTargets.forEach((target) => triggerCounts.set(target.triggerControlId, (triggerCounts.get(target.triggerControlId) ?? 0) + 1));
  const reservedSubmitControlIds = new Set((canvas?.formOperationTargets ?? []).map((target) => target.submitControlId).filter(Boolean));
  const reservedFormModeControlIds = new Set((canvas?.formModeTargets ?? []).map((target) => target.triggerControlId).filter(Boolean));
  orderedTargets.forEach((target) => validateTarget(project, target, triggerCounts, reservedSubmitControlIds, reservedFormModeControlIds, blockingIssues, missingDecisions));
  addDuplicateIssues(orderedTargets, blockingIssues);
  addArchiveRestorePairIssues(orderedTargets, blockingIssues);

  return {
    normalizedTargets,
    orderedTargets,
    blockingIssues: unique(blockingIssues),
    missingDecisions: unique(missingDecisions),
    eligibilityStatus: blockingIssues.length > 0 ? "Blocked" : "Valid"
  };
}
