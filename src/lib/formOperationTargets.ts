import type {
  CanvasControlTarget,
  CanvasFormOperation,
  CanvasFormOperationTarget,
  CanvasFormSubmissionTrigger,
  CanvasScreenTarget,
  ConnectorFieldSchema,
  DataverseColumnSchema,
  PowerPlatformConnector,
  PowerPlatformDecisionStatus,
  ProjectRecord,
  SharePointColumnSchema
} from "../types/project";
import { connectorSupportsCanvasEntity, reconcileCanvasConnectorSelection } from "./canvasTargetValidation";

export type CanvasFormOperationValidationStatus = "Valid" | "Blocked" | "Not Applicable";

export interface CanvasFormOperationValidationResult {
  targets: CanvasFormOperationTarget[];
  orderedTargets: CanvasFormOperationTarget[];
  blockingIssues: string[];
  missingDecisions: string[];
  eligibilityStatus: CanvasFormOperationValidationStatus;
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOperation(value: unknown): CanvasFormOperation {
  const normalized = asString(value);
  return normalized === "create" || normalized === "edit" ? normalized : "" as CanvasFormOperation;
}

function normalizeSubmissionTrigger(value: unknown): CanvasFormSubmissionTrigger {
  return asString(value) === "controlOnSelect" ? "controlOnSelect" : "" as CanvasFormSubmissionTrigger;
}

function normalizeDecisionStatus(value: unknown): PowerPlatformDecisionStatus {
  return VALID_DECISION_STATUSES.includes(value as PowerPlatformDecisionStatus)
    ? value as PowerPlatformDecisionStatus
    : "missingInformation";
}

function normalizeRequiredFieldIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

function normalizeSortOrder(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export function normalizeCanvasFormOperationTargets(input: unknown): CanvasFormOperationTarget[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((item) => {
    if (!isObject(item)) return [];
    const id = asString(item.id);
    const screenId = asString(item.screenId);
    const formControlId = asString(item.formControlId);
    const submitControlId = asString(item.submitControlId);
    const sourceConnectorId = asString(item.sourceConnectorId);
    const sourceEntityId = asString(item.sourceEntityId);
    const hasAnyRequiredReference = Boolean(id || screenId || formControlId || submitControlId || sourceConnectorId || sourceEntityId);
    if (!hasAnyRequiredReference) return [];
    return [{
      id,
      operation: normalizeOperation(item.operation),
      screenId,
      formControlId,
      submitControlId,
      sourceConnectorId,
      sourceEntityId,
      requiredFieldIds: normalizeRequiredFieldIds(item.requiredFieldIds),
      submissionTrigger: normalizeSubmissionTrigger(item.submissionTrigger),
      confirmationStatus: normalizeDecisionStatus(item.confirmationStatus),
      required: item.required === true,
      sortOrder: normalizeSortOrder(item.sortOrder)
    }];
  });
}

export function orderCanvasFormOperationTargets(targets: CanvasFormOperationTarget[]): CanvasFormOperationTarget[] {
  return [...targets].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function isCanvasProject(project: ProjectRecord): boolean {
  return project.intake.appType === "powerAppsCanvas";
}

function connectorIsConfirmed(connector: PowerPlatformConnector | undefined): boolean {
  return Boolean(connector
    && connector.classificationConfirmationStatus === "confirmed"
    && connector.licensingConfirmationStatus === "confirmed"
    && connector.approvalConfirmationStatus === "confirmed"
    && connector.connectionOwnershipStatus === "confirmed");
}

interface EntityReference {
  entityId: string;
  entityType: "sharePointList" | "sharePointLibrary" | "dataverseTable" | "connectorResource";
  connectorId: string;
  implementationName: string;
  confirmationStatus: PowerPlatformDecisionStatus;
}

type EntityOwnershipStatus = "resolved" | "inactive" | "ambiguous" | "missing";

interface EntityOwnershipResolution {
  status: EntityOwnershipStatus;
  entity?: EntityReference;
}

function activeConnectorIds(project: ProjectRecord): Set<string> {
  return new Set(reconcileCanvasConnectorSelection(project).activeConnectorIds);
}

function activeCompatibleConnectors(project: ProjectRecord, entityType: EntityReference["entityType"]): PowerPlatformConnector[] {
  const activeIds = activeConnectorIds(project);
  return (project.powerPlatform?.common.connectors ?? []).filter((connector) =>
    activeIds.has(connector.id) && connectorSupportsCanvasEntity(connector.dataSourceType, entityType)
  );
}

function resolveImplicitEntityOwnership(
  project: ProjectRecord,
  entity: Omit<EntityReference, "connectorId">,
  issues: string[],
  missingDecisions: string[],
  targetId: string
): EntityOwnershipResolution {
  const compatibleConnectors = activeCompatibleConnectors(project, entity.entityType);
  if (compatibleConnectors.length === 0) {
    issues.push(`Form operation target ${targetId || "[missing]"} references inactive entity ${entity.entityId}; no active compatible connector is selected.`);
    missingDecisions.push(`Confirm active connector ownership for entity ${entity.entityId}.`);
    return { status: "inactive" };
  }
  if (compatibleConnectors.length > 1) {
    issues.push(`Form operation target ${targetId || "[missing]"} entity ${entity.entityId} has ambiguous connector ownership across active compatible connectors.`);
    missingDecisions.push(`Confirm the connector owner for entity ${entity.entityId}.`);
    return { status: "ambiguous" };
  }
  return { status: "resolved", entity: { ...entity, connectorId: compatibleConnectors[0].id } };
}

function resolveEntityReference(
  project: ProjectRecord,
  target: CanvasFormOperationTarget,
  issues: string[],
  missingDecisions: string[]
): EntityOwnershipResolution {
  const canvas = project.powerPlatform?.canvas;
  const connectors = project.powerPlatform?.common.connectors ?? [];
  const activeIds = activeConnectorIds(project);
  if (!canvas) return { status: "missing" };

  const sharePointList = canvas.sharePointListSchemas.find((entity) => entity.id === target.sourceEntityId);
  if (sharePointList) {
    return resolveImplicitEntityOwnership(project, {
      entityId: sharePointList.id,
      entityType: "sharePointList",
      implementationName: sharePointList.displayName.trim(),
      confirmationStatus: sharePointList.confirmationStatus
    }, issues, missingDecisions, target.id);
  }

  const sharePointLibrary = canvas.sharePointLibrarySchemas.find((entity) => entity.id === target.sourceEntityId);
  if (sharePointLibrary) {
    return resolveImplicitEntityOwnership(project, {
      entityId: sharePointLibrary.id,
      entityType: "sharePointLibrary",
      implementationName: sharePointLibrary.displayName.trim(),
      confirmationStatus: sharePointLibrary.confirmationStatus
    }, issues, missingDecisions, target.id);
  }

  const dataverseTable = canvas.dataverseTableSchemas.find((entity) => entity.id === target.sourceEntityId);
  if (dataverseTable) {
    return resolveImplicitEntityOwnership(project, {
      entityId: dataverseTable.id,
      entityType: "dataverseTable",
      implementationName: dataverseTable.logicalName.trim(),
      confirmationStatus: dataverseTable.confirmationStatus
    }, issues, missingDecisions, target.id);
  }

  const connectorResource = canvas.connectorResourceSchemas.find((entity) => entity.id === target.sourceEntityId);
  if (connectorResource) {
    const connector = connectors.find((candidate) =>
      candidate.id === connectorResource.connectorId
      && activeIds.has(candidate.id)
      && connectorSupportsCanvasEntity(candidate.dataSourceType, "connectorResource")
    );
    if (!connector) {
      issues.push(`Form operation target ${target.id || "[missing]"} references inactive connector-resource entity ${connectorResource.id}.`);
      missingDecisions.push(`Confirm active connector ownership for connector resource ${connectorResource.id}.`);
      return { status: "inactive" };
    }
    return { status: "resolved", entity: {
      entityId: connectorResource.id,
      entityType: "connectorResource",
      connectorId: connector.id,
      implementationName: connectorResource.resourceName.trim(),
      confirmationStatus: connectorResource.confirmationStatus
    } };
  }

  return { status: "missing" };
}

type FieldReference =
  | (SharePointColumnSchema & { ownerId: string; kind: "sharePointColumn" })
  | (DataverseColumnSchema & { ownerId: string; kind: "dataverseColumn" })
  | (ConnectorFieldSchema & { ownerId: string; kind: "connectorField" });

function fieldReferencesForEntity(project: ProjectRecord, entity: EntityReference | undefined, connectorId: string): FieldReference[] {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas || !entity) return [];
  if (entity.entityType === "sharePointList" || entity.entityType === "sharePointLibrary") {
    return canvas.sharePointColumnSchemas
      .filter((field) => field.parentId === entity.entityId)
      .map((field) => ({ ...field, ownerId: field.parentId, kind: "sharePointColumn" as const }));
  }
  if (entity.entityType === "dataverseTable") {
    return canvas.dataverseColumnSchemas
      .filter((field) => field.tableId === entity.entityId)
      .map((field) => ({ ...field, ownerId: field.tableId, kind: "dataverseColumn" as const }));
  }
  return canvas.connectorFieldSchemas
    .filter((field) => field.connectorId === connectorId && field.resourceId === entity.entityId)
    .map((field) => ({ ...field, ownerId: field.resourceId, kind: "connectorField" as const }));
}

function fieldId(field: FieldReference): string {
  return field.id;
}

function fieldRequiredStatus(field: FieldReference): string {
  if (field.kind === "dataverseColumn") return field.requiredLevel;
  return field.requiredStatus;
}

function fieldConfirmationStatus(field: FieldReference): PowerPlatformDecisionStatus {
  return field.confirmationStatus;
}

type RequiredStatusClassification = "required" | "optional";

function normalizeRequiredStatusValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function classifyRequiredStatus(field: FieldReference): RequiredStatusClassification | undefined {
  const normalized = normalizeRequiredStatusValue(fieldRequiredStatus(field));
  if (["required", "mandatory", "yes", "true", "business required", "system required"].includes(normalized)) return "required";
  if (["optional", "not required", "no", "false"].includes(normalized)) return "optional";
  return undefined;
}

function allFieldReferences(project: ProjectRecord): FieldReference[] {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return [];
  return [
    ...canvas.sharePointColumnSchemas.map((field) => ({ ...field, ownerId: field.parentId, kind: "sharePointColumn" as const })),
    ...canvas.dataverseColumnSchemas.map((field) => ({ ...field, ownerId: field.tableId, kind: "dataverseColumn" as const })),
    ...canvas.connectorFieldSchemas.map((field) => ({ ...field, ownerId: field.resourceId, kind: "connectorField" as const }))
  ];
}

function normalizeControlType(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isEditableFormControl(control: CanvasControlTarget): boolean {
  return ["form", "editform", "edit form"].includes(normalizeControlType(control.controlType));
}

function addTargetIdIssues(target: CanvasFormOperationTarget, issues: string[]): void {
  if (!target.id) {
    issues.push("Form operation target ID is missing.");
    return;
  }
  if (!TARGET_ID_PATTERN.test(target.id)) {
    issues.push(`Form operation target ${target.id} ID is not a safe stable identifier.`);
  }
}

function validateScreen(project: ProjectRecord, target: CanvasFormOperationTarget, issues: string[]): CanvasScreenTarget | undefined {
  const screen = project.powerPlatform?.canvas?.screenTargets.find((item) => item.id === target.screenId);
  if (!screen) {
    issues.push(`Form operation target ${target.id || "[missing]"} references missing screen ${target.screenId || "[missing]"}.`);
    return undefined;
  }
  if (screen.confirmationStatus !== "confirmed") issues.push(`Form operation target ${target.id} references unconfirmed screen ${target.screenId}.`);
  if (!POWER_FX_IDENTIFIER_PATTERN.test(screen.approvedScreenName)) issues.push(`Form operation target ${target.id} screen ${target.screenId} has an invalid approved screen name.`);
  return screen;
}

function validateFormControl(project: ProjectRecord, target: CanvasFormOperationTarget, issues: string[]): CanvasControlTarget | undefined {
  const control = project.powerPlatform?.canvas?.controlTargets.find((item) => item.id === target.formControlId);
  if (!control) {
    issues.push(`Form operation target ${target.id || "[missing]"} references missing form control ${target.formControlId || "[missing]"}.`);
    return undefined;
  }
  if (control.screenId !== target.screenId) issues.push(`Form operation target ${target.id} form control ${target.formControlId} is not on screen ${target.screenId}.`);
  if (control.confirmationStatus !== "confirmed") issues.push(`Form operation target ${target.id} references unconfirmed form control ${target.formControlId}.`);
  if (!isEditableFormControl(control)) issues.push(`Form operation target ${target.id} form control ${target.formControlId} is not an editable Canvas form.`);
  if (!POWER_FX_IDENTIFIER_PATTERN.test(control.approvedControlName)) issues.push(`Form operation target ${target.id} form control ${target.formControlId} has an invalid approved control name.`);
  return control;
}

function validateSubmitControl(project: ProjectRecord, target: CanvasFormOperationTarget, issues: string[]): CanvasControlTarget | undefined {
  const control = project.powerPlatform?.canvas?.controlTargets.find((item) => item.id === target.submitControlId);
  if (!control) {
    issues.push(`Form operation target ${target.id || "[missing]"} references missing submit control ${target.submitControlId || "[missing]"}.`);
    return undefined;
  }
  if (control.screenId !== target.screenId) issues.push(`Form operation target ${target.id} submit control ${target.submitControlId} is not on screen ${target.screenId}.`);
  if (control.confirmationStatus !== "confirmed") issues.push(`Form operation target ${target.id} references unconfirmed submit control ${target.submitControlId}.`);
  if (normalizeControlType(control.controlType) !== "button") issues.push(`Form operation target ${target.id} submit control ${target.submitControlId} is not a confirmed button.`);
  if (!POWER_FX_IDENTIFIER_PATTERN.test(control.approvedControlName)) issues.push(`Form operation target ${target.id} submit control ${target.submitControlId} has an invalid approved control name.`);
  return control;
}

function validateConnector(project: ProjectRecord, target: CanvasFormOperationTarget, issues: string[]): PowerPlatformConnector | undefined {
  const connector = project.powerPlatform?.common.connectors.find((item) => item.id === target.sourceConnectorId);
  if (!connector || !activeConnectorIds(project).has(target.sourceConnectorId)) {
    issues.push(`Form operation target ${target.id || "[missing]"} references missing or inactive connector ${target.sourceConnectorId || "[missing]"}.`);
    return undefined;
  }
  if (!connectorIsConfirmed(connector)) issues.push(`Form operation target ${target.id} connector ${target.sourceConnectorId} is not fully confirmed.`);
  const requiredOperation = target.operation === "create" ? "create" : target.operation === "edit" ? "update" : "";
  if (!requiredOperation || connector.supportedOperations[requiredOperation] !== true) {
    issues.push(`Form operation target ${target.id} connector ${target.sourceConnectorId} does not support ${target.operation || "[missing]"} operations.`);
  }
  return connector;
}

function validateEntity(project: ProjectRecord, target: CanvasFormOperationTarget, connector: PowerPlatformConnector | undefined, issues: string[], missingDecisions: string[]): EntityReference | undefined {
  const resolution = resolveEntityReference(project, target, issues, missingDecisions);
  const entity = resolution.entity;
  if (!entity && resolution.status === "missing") {
    issues.push(`Form operation target ${target.id || "[missing]"} references missing or inactive entity ${target.sourceEntityId || "[missing]"}.`);
    return undefined;
  }
  if (!entity) return undefined;
  if (entity.connectorId !== target.sourceConnectorId) issues.push(`Form operation target ${target.id} entity ${target.sourceEntityId} does not belong to connector ${target.sourceConnectorId}.`);
  if (connector && !connectorSupportsCanvasEntity(connector.dataSourceType, entity.entityType)) issues.push(`Form operation target ${target.id} connector ${target.sourceConnectorId} does not support entity ${target.sourceEntityId}.`);
  if (entity.confirmationStatus !== "confirmed") issues.push(`Form operation target ${target.id} entity ${target.sourceEntityId} is not confirmed.`);
  if (!POWER_FX_IDENTIFIER_PATTERN.test(entity.implementationName)) issues.push(`Form operation target ${target.id} entity ${target.sourceEntityId} has an invalid implementation name.`);
  return entity;
}

function fieldLooksUnsafe(fieldIdValue: string): boolean {
  return !TARGET_ID_PATTERN.test(fieldIdValue);
}

function hasConfirmedZeroFieldDecision(_project: ProjectRecord, _entity: EntityReference | undefined): boolean {
  return false;
}

function validateRequiredFields(project: ProjectRecord, target: CanvasFormOperationTarget, entity: EntityReference | undefined, issues: string[], missingDecisions: string[]): void {
  const fields = fieldReferencesForEntity(project, entity, target.sourceConnectorId);
  const fieldById = new Map(fields.map((field) => [fieldId(field), field]));
  const allFieldsById = new Map(allFieldReferences(project).map((field) => [fieldId(field), field]));
  const duplicateFieldIds = unique(target.requiredFieldIds.filter((fieldIdValue, index) => target.requiredFieldIds.indexOf(fieldIdValue) !== index));
  duplicateFieldIds.forEach((fieldIdValue) => issues.push(`Form operation target ${target.id} has duplicate required field ID ${fieldIdValue}.`));
  target.requiredFieldIds.forEach((fieldIdValue) => {
    if (fieldLooksUnsafe(fieldIdValue)) issues.push(`Form operation target ${target.id} required field ID ${fieldIdValue || "[missing]"} is unsafe.`);
    const field = fieldById.get(fieldIdValue);
    if (!field) {
      const otherField = allFieldsById.get(fieldIdValue);
      if (otherField) issues.push(`Form operation target ${target.id} required field ${fieldIdValue} belongs to another entity.`);
      else issues.push(`Form operation target ${target.id} references unknown or stale required field ${fieldIdValue || "[missing]"}.`);
      return;
    }
    if (field.ownerId !== target.sourceEntityId) issues.push(`Form operation target ${target.id} required field ${fieldIdValue} belongs to another entity.`);
    if (fieldConfirmationStatus(field) !== "confirmed") issues.push(`Form operation target ${target.id} required field ${fieldIdValue} is not confirmed.`);
  });
  if (fields.length === 0) {
    if (hasConfirmedZeroFieldDecision(project, entity)) return;
    issues.push(`Form operation target ${target.id} cannot determine required fields for entity ${target.sourceEntityId}.`);
    missingDecisions.push(`Confirm field schema for entity ${target.sourceEntityId} before modeling form operation ${target.id}.`);
    return;
  }
  const requiredSchemaFields: FieldReference[] = [];
  for (const field of fields) {
    if (fieldConfirmationStatus(field) !== "confirmed") {
      issues.push(`Form operation target ${target.id} field ${fieldId(field)} is not confirmed, so required-field completeness cannot be established.`);
      missingDecisions.push(`Confirm field schema status for field ${fieldId(field)} on entity ${target.sourceEntityId}.`);
      continue;
    }
    const classification = classifyRequiredStatus(field);
    if (!classification) {
      issues.push(`Form operation target ${target.id} field ${fieldId(field)} has unknown required-status classification.`);
      missingDecisions.push(`Confirm whether field ${fieldId(field)} on entity ${target.sourceEntityId} is required or optional.`);
      continue;
    }
    if (classification === "required") requiredSchemaFields.push(field);
  }
  if (requiredSchemaFields.length === 0 && target.requiredFieldIds.length === 0) return;
  const referenced = new Set(target.requiredFieldIds);
  requiredSchemaFields.forEach((field) => {
    if (!referenced.has(fieldId(field))) {
      issues.push(`Form operation target ${target.id} is missing required field reference ${fieldId(field)}.`);
    }
  });
}

function rawTargetHasMeaningfulFormOperationProperties(item: Record<string, unknown>): boolean {
  return [
    "id",
    "operation",
    "screenId",
    "formControlId",
    "submitControlId",
    "sourceConnectorId",
    "sourceEntityId",
    "requiredFieldIds",
    "submissionTrigger",
    "confirmationStatus",
    "required",
    "sortOrder"
  ].some((key) => key in item);
}

function rawMalformedInputIssues(input: unknown): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return ["Canvas form operation target data must be an array when provided."];
  const issues: string[] = [];
  input.forEach((item, index) => {
    if (!isObject(item)) {
      issues.push(`Canvas form operation target record ${index + 1} is malformed and must be an object.`);
      return;
    }
    if (!rawTargetHasMeaningfulFormOperationProperties(item)) {
      issues.push(`Canvas form operation target record ${index + 1} does not contain recognizable form-operation data.`);
      return;
    }
    const requiredTextFields = ["id", "operation", "screenId", "formControlId", "submitControlId", "sourceConnectorId", "sourceEntityId", "submissionTrigger", "confirmationStatus"];
    const missingFields = requiredTextFields.filter((field) => !asString(item[field]));
    if (missingFields.length > 0) {
      issues.push(`Canvas form operation target record ${index + 1} is incomplete: ${missingFields.join(", ")}.`);
    }
    if (!Array.isArray(item.requiredFieldIds)) {
      issues.push(`Canvas form operation target record ${index + 1} requiredFieldIds must be an array.`);
    } else if (item.requiredFieldIds.some((fieldIdValue) => typeof fieldIdValue !== "string" || fieldIdValue.trim().length === 0)) {
      issues.push(`Canvas form operation target record ${index + 1} has an empty or malformed required-field entry.`);
    }
  });
  return issues;
}

function addDuplicateIssues(targets: CanvasFormOperationTarget[], issues: string[]): void {
  const ids = new Map<string, number>();
  const sortOrders = new Map<number, string[]>();
  const submitControls = new Map<string, string[]>();
  const createForms = new Map<string, string[]>();
  const editForms = new Map<string, string[]>();
  targets.forEach((target) => {
    ids.set(target.id, (ids.get(target.id) ?? 0) + 1);
    sortOrders.set(target.sortOrder, [...(sortOrders.get(target.sortOrder) ?? []), target.id]);
    submitControls.set(target.submitControlId, [...(submitControls.get(target.submitControlId) ?? []), target.id]);
    if (target.operation === "create") createForms.set(target.formControlId, [...(createForms.get(target.formControlId) ?? []), target.id]);
    if (target.operation === "edit") editForms.set(target.formControlId, [...(editForms.get(target.formControlId) ?? []), target.id]);
  });
  for (const [id, count] of ids) if (id && count > 1) issues.push(`Duplicate form operation target ID: ${id}.`);
  for (const [sortOrder, targetIds] of sortOrders) if (targetIds.length > 1) issues.push(`Duplicate form operation target sort order ${sortOrder}: ${targetIds.sort().join(", ")}.`);
  for (const [submitControlId, targetIds] of submitControls) if (submitControlId && targetIds.length > 1) issues.push(`Submit control ${submitControlId} is used by multiple form operation targets: ${targetIds.sort().join(", ")}.`);
  for (const [formControlId, targetIds] of createForms) if (formControlId && targetIds.length > 1) issues.push(`Form control ${formControlId} has duplicate create form operation targets: ${targetIds.sort().join(", ")}.`);
  for (const [formControlId, targetIds] of editForms) if (formControlId && targetIds.length > 1) issues.push(`Form control ${formControlId} has duplicate edit form operation targets: ${targetIds.sort().join(", ")}.`);
}

export function validateCanvasFormOperationTargets(project: ProjectRecord, input: unknown = project.powerPlatform?.canvas?.formOperationTargets): CanvasFormOperationValidationResult {
  if (!isCanvasProject(project)) {
    return {
      targets: [],
      orderedTargets: [],
      blockingIssues: [],
      missingDecisions: [],
      eligibilityStatus: "Not Applicable"
    };
  }
  const targets = normalizeCanvasFormOperationTargets(input);
  const orderedTargets = orderCanvasFormOperationTargets(targets);
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
  reconcileCanvasConnectorSelection(project).blockers.forEach((issue) => blockingIssues.push(`Canvas connector selection: ${issue}`));
  if (targets.length === 0) {
    return {
      targets,
      orderedTargets,
      blockingIssues: unique(blockingIssues),
      missingDecisions: unique(missingDecisions),
      eligibilityStatus: "Blocked"
    };
  }
  addDuplicateIssues(orderedTargets, blockingIssues);
  orderedTargets.forEach((target) => {
    addTargetIdIssues(target, blockingIssues);
    if (target.operation !== "create" && target.operation !== "edit") blockingIssues.push(`Form operation target ${target.id || "[missing]"} has an unsupported operation.`);
    if (target.submissionTrigger !== "controlOnSelect") blockingIssues.push(`Form operation target ${target.id || "[missing]"} has an unsupported submission trigger.`);
    if (target.confirmationStatus !== "confirmed") blockingIssues.push(`Form operation target ${target.id || "[missing]"} is not confirmed.`);
    const screen = validateScreen(project, target, blockingIssues);
    const formControl = validateFormControl(project, target, blockingIssues);
    const submitControl = validateSubmitControl(project, target, blockingIssues);
    const connector = validateConnector(project, target, blockingIssues);
    const entity = validateEntity(project, target, connector, blockingIssues, missingDecisions);
    validateRequiredFields(project, target, entity, blockingIssues, missingDecisions);
    if (screen && formControl && submitControl && formControl.screenId === submitControl.screenId && formControl.screenId !== screen.id) {
      blockingIssues.push(`Form operation target ${target.id} controls do not belong to the referenced screen ${screen.id}.`);
    }
  });

  return {
    targets,
    orderedTargets,
    blockingIssues: unique(blockingIssues),
    missingDecisions: unique(missingDecisions),
    eligibilityStatus: blockingIssues.length > 0 ? "Blocked" : "Valid"
  };
}
