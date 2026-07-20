import { activeCanvasEntityReferences, type ActiveCanvasEntityReference } from "./canvasTargetValidation";
import { orderCanvasRecordLifecycleTargets, validateCanvasRecordLifecycleTargets } from "./recordLifecycleTargets";
import { isProjectType } from "../data/projectTypes";
import type {
  CanvasArchiveStrategy,
  CanvasDataSourceType,
  CanvasRecordContextType,
  CanvasRecordLifecycleAction,
  CanvasRecordLifecycleTarget,
  ConnectorFieldSchema,
  DataverseColumnSchema,
  PowerPlatformConnector,
  ProjectRecord,
  SharePointColumnSchema
} from "../types/project";

export type CanvasRecordLifecyclePlanningStatus = "Planned" | "Blocked" | "Not Applicable";

export type CanvasRecordLifecycleEntityType =
  | "sharePointList"
  | "sharePointLibrary"
  | "dataverseTable"
  | "connectorResource";

export type CanvasRecordLifecycleFieldType = "status" | "boolean" | "notApplicable";

export type CanvasRecordLifecycleConnectorOperationType = "updateRecord" | "deleteRecord";

export type CanvasRecordLifecycleConnectorCapability = "update" | "delete";

export type CanvasRecordLifecycleOptionalBehaviour = "notPlanned";

export type CanvasRecordLifecycleRecordContextSource =
  | "selectedRecordControl"
  | "formItem"
  | "explicitRecordVariable"
  | "missingDecision";

export type CanvasRecordLifecyclePreconditionType =
  | "currentRecordExists"
  | "recordContextMatchesEntity"
  | "lifecycleFieldExists"
  | "currentRecordNotArchived"
  | "currentRecordArchived"
  | "permanentDeleteApproved"
  | "connectorSupportsOperation";

export interface CanvasRecordLifecyclePrecondition {
  id: string;
  type: CanvasRecordLifecyclePreconditionType;
  description: string;
  required: boolean;
}

export type CanvasRecordLifecycleActionStepType =
  | "validateRecordContext"
  | "validateCurrentLifecycleState"
  | "performConnectorMutation";

export interface CanvasRecordLifecycleActionStep {
  order: number;
  type: CanvasRecordLifecycleActionStepType;
  description: string;
  required: boolean;
}

export interface CanvasRecordLifecycleActionPlan {
  planId: string;
  lifecycleTargetId: string;
  actionType: CanvasRecordLifecycleAction;
  triggerScreenId: string;
  triggerControlId: string;
  triggerProperty: "OnSelect";
  recordContextSource: CanvasRecordLifecycleRecordContextSource;
  recordContextType: CanvasRecordContextType;
  selectedRecordControlId: string;
  formId: string;
  explicitRecordVariableId: string;
  entityId: string;
  entityType: CanvasRecordLifecycleEntityType;
  connectorId: string;
  backendType: CanvasDataSourceType;
  lifecycleStrategy: CanvasArchiveStrategy | "permanentDelete";
  lifecycleFieldId: string;
  lifecycleFieldType: CanvasRecordLifecycleFieldType;
  targetLifecycleValue: string;
  expectedCurrentLifecycleValue: string;
  connectorOperationType: CanvasRecordLifecycleConnectorOperationType;
  connectorOperationCapability: CanvasRecordLifecycleConnectorCapability;
  confirmationRequired: boolean;
  permanentDeleteApprovalReference: string;
  preconditions: CanvasRecordLifecyclePrecondition[];
  orderedActionSteps: CanvasRecordLifecycleActionStep[];
  successOutcome: string;
  failureOutcome: string;
  refreshRequirement: CanvasRecordLifecycleOptionalBehaviour;
  navigationRequirement: CanvasRecordLifecycleOptionalBehaviour;
  notificationRequirement: CanvasRecordLifecycleOptionalBehaviour;
  deterministicOrderingKey: string;
  planningStatus: "Planned";
  blockers: string[];
  notes: string[];
}

export interface CanvasRecordLifecyclePlanningResult {
  targets: CanvasRecordLifecycleTarget[];
  orderedTargets: CanvasRecordLifecycleTarget[];
  plans: CanvasRecordLifecycleActionPlan[];
  blockingIssues: string[];
  missingDecisions: string[];
  required: boolean;
  duplicatePlanIssues: string[];
  planningStatus: CanvasRecordLifecyclePlanningStatus;
}

interface FieldReference {
  fieldId: string;
  fieldType: CanvasRecordLifecycleFieldType;
}

type SafeProjectResolution =
  | {
      kind: "project";
      project: ProjectRecord;
    }
  | {
      kind: "result";
      result: CanvasRecordLifecyclePlanningResult;
    };

const FORMULA_TEXT_PATTERN = /\b(?:Patch|Remove|RemoveIf|UpdateIf|SubmitForm|ResetForm|Navigate|Notify|Refresh|Set|UpdateContext|LookUp|Filter)\s*\(|(?:Gallery\.Selected|Form\.Item)/i;
const INVALID_PROJECT_BLOCKER = "Canvas record lifecycle planning requires a valid project record.";
const CANVAS_ARRAY_FIELDS = [
  "screenTargets",
  "controlTargets",
  "stateVariableTargets",
  "formOperationTargets",
  "formModeTargets",
  "sharePointListSchemas",
  "sharePointLibrarySchemas",
  "sharePointColumnSchemas",
  "dataverseTableSchemas",
  "dataverseColumnSchemas",
  "connectorResourceSchemas",
  "connectorFieldSchemas",
  "selectedDataSourceTypes",
  "secondaryConnectorIds"
] as const;
const CANVAS_RECORD_COLLECTION_FIELDS = [
  "screenTargets",
  "controlTargets",
  "stateVariableTargets",
  "formOperationTargets",
  "formModeTargets",
  "sharePointListSchemas",
  "sharePointLibrarySchemas",
  "sharePointColumnSchemas",
  "dataverseTableSchemas",
  "dataverseColumnSchemas",
  "connectorResourceSchemas",
  "connectorFieldSchemas"
] as const;

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function isRuntimeObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasNonBlankText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function canvasStorageEnvelopeIssues(common: Record<string, unknown>, canvas: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (!Array.isArray(common.connectors)) {
    issues.push("powerPlatform.common.connectors must be an array.");
  } else if (!common.connectors.every(isRuntimeObject)) {
    issues.push("powerPlatform.common.connectors entry must be an object.");
  }
  for (const field of CANVAS_ARRAY_FIELDS) {
    if (!Array.isArray(canvas[field])) issues.push(`powerPlatform.canvas.${field} must be an array.`);
  }
  for (const field of CANVAS_RECORD_COLLECTION_FIELDS) {
    if (Array.isArray(canvas[field]) && !canvas[field].every(isRuntimeObject)) {
      issues.push(`powerPlatform.canvas.${field} entry must be an object.`);
    }
  }
  if (typeof canvas.primaryDataSourceType !== "string") issues.push("powerPlatform.canvas.primaryDataSourceType must be a string.");
  if (typeof canvas.primaryConnectorId !== "string") issues.push("powerPlatform.canvas.primaryConnectorId must be a string.");
  if (canvas.recordLifecycleTargets !== undefined) {
    if (!Array.isArray(canvas.recordLifecycleTargets)) {
      issues.push("powerPlatform.canvas.recordLifecycleTargets must be an array.");
    } else if (!canvas.recordLifecycleTargets.every(isRuntimeObject)) {
      issues.push("powerPlatform.canvas.recordLifecycleTargets entry must be an object.");
    }
  }
  return issues;
}

function blockedProjectResult(blockingIssues: string[] = [INVALID_PROJECT_BLOCKER]): CanvasRecordLifecyclePlanningResult {
  return {
    targets: [],
    orderedTargets: [],
    plans: [],
    blockingIssues: unique(blockingIssues),
    missingDecisions: [],
    required: false,
    duplicatePlanIssues: [],
    planningStatus: "Blocked"
  };
}

function notApplicableProjectResult(): CanvasRecordLifecyclePlanningResult {
  return {
    targets: [],
    orderedTargets: [],
    plans: [],
    blockingIssues: [],
    missingDecisions: [],
    required: false,
    duplicatePlanIssues: [],
    planningStatus: "Not Applicable"
  };
}

function safeProjectForLifecyclePlanning(project: unknown): SafeProjectResolution {
  if (!isRuntimeObject(project)) return { kind: "result", result: blockedProjectResult() };

  const identity = project.identity;
  if (!isRuntimeObject(identity)
    || !hasNonBlankText(identity.id)
    || !hasNonBlankText(identity.projectName)) {
    return { kind: "result", result: blockedProjectResult() };
  }

  const intake = project.intake;
  if (!isRuntimeObject(intake) || !hasNonBlankText(intake.appType) || !isProjectType(intake.appType)) {
    return { kind: "result", result: blockedProjectResult() };
  }

  if (intake.appType !== "powerAppsCanvas") return { kind: "result", result: notApplicableProjectResult() };

  const powerPlatform = project.powerPlatform;
  if (!isRuntimeObject(powerPlatform)) return { kind: "result", result: blockedProjectResult() };

  const common = powerPlatform.common;
  const canvas = powerPlatform.canvas;
  if (!isRuntimeObject(common) || !isRuntimeObject(canvas)) {
    return { kind: "result", result: blockedProjectResult() };
  }
  const canvasEnvelopeIssues = canvasStorageEnvelopeIssues(common, canvas);
  if (canvasEnvelopeIssues.length > 0) {
    return { kind: "result", result: blockedProjectResult([INVALID_PROJECT_BLOCKER, ...canvasEnvelopeIssues]) };
  }

  return { kind: "project", project: project as unknown as ProjectRecord };
}

function isConnectorConfirmed(connector: PowerPlatformConnector | undefined): boolean {
  return Boolean(connector)
    && connector?.classificationConfirmationStatus === "confirmed"
    && connector.licensingConfirmationStatus === "confirmed"
    && connector.approvalConfirmationStatus === "confirmed";
}

function fieldTypeFromValue(value: string): CanvasRecordLifecycleFieldType {
  const normalized = value.trim().toLowerCase();
  if (/(choice|option|status|text|string|enum)/.test(normalized)) return "status";
  if (/(boolean|yes\/no|two options|true\/false)/.test(normalized)) return "boolean";
  return "notApplicable";
}

function entityReference(project: ProjectRecord, target: CanvasRecordLifecycleTarget): ActiveCanvasEntityReference | undefined {
  const entity = activeCanvasEntityReferences(project).get(target.entityId);
  if (!entity || entity.connectorId !== target.connectorId) return undefined;
  return entity;
}

function fieldReference(project: ProjectRecord, entity: ActiveCanvasEntityReference | undefined, fieldId: string): FieldReference | undefined {
  if (!entity || !fieldId) return undefined;
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return undefined;
  if (entity.entityType === "sharePointList" || entity.entityType === "sharePointLibrary") {
    const field = canvas.sharePointColumnSchemas.find((candidate) =>
      candidate.id === fieldId
      && candidate.parentId === entity.entityId
      && candidate.confirmationStatus === "confirmed"
    ) as SharePointColumnSchema | undefined;
    return field ? { fieldId: field.id, fieldType: fieldTypeFromValue(field.columnType) } : undefined;
  }
  if (entity.entityType === "dataverseTable") {
    const field = canvas.dataverseColumnSchemas.find((candidate) =>
      candidate.id === fieldId
      && candidate.tableId === entity.entityId
      && candidate.confirmationStatus === "confirmed"
    ) as DataverseColumnSchema | undefined;
    return field ? { fieldId: field.id, fieldType: fieldTypeFromValue(field.dataType) } : undefined;
  }
  const field = canvas.connectorFieldSchemas.find((candidate) =>
    candidate.id === fieldId
    && candidate.resourceId === entity.entityId
    && candidate.connectorId === entity.connectorId
    && candidate.confirmationStatus === "confirmed"
  ) as ConnectorFieldSchema | undefined;
  return field ? { fieldId: field.id, fieldType: fieldTypeFromValue(field.fieldType) } : undefined;
}

function recordContextSource(target: CanvasRecordLifecycleTarget): Pick<CanvasRecordLifecycleActionPlan, "recordContextSource" | "selectedRecordControlId" | "formId" | "explicitRecordVariableId"> {
  if (target.recordContextType === "selectedRecord") {
    return {
      recordContextSource: "selectedRecordControl",
      selectedRecordControlId: target.recordContextReferenceId,
      formId: "",
      explicitRecordVariableId: ""
    };
  }
  if (target.recordContextType === "formItem") {
    return {
      recordContextSource: "formItem",
      selectedRecordControlId: "",
      formId: target.recordContextReferenceId,
      explicitRecordVariableId: ""
    };
  }
  if (target.recordContextType === "explicitRecordVariable") {
    return {
      recordContextSource: "explicitRecordVariable",
      selectedRecordControlId: "",
      formId: "",
      explicitRecordVariableId: target.recordContextReferenceId
    };
  }
  return {
    recordContextSource: "missingDecision",
    selectedRecordControlId: "",
    formId: "",
    explicitRecordVariableId: ""
  };
}

function expectedCurrentValue(target: CanvasRecordLifecycleTarget): string {
  if (target.action === "archive") return target.restoreValue;
  if (target.action === "restore") return target.archiveValue;
  return "";
}

function targetLifecycleValue(target: CanvasRecordLifecycleTarget): string {
  if (target.action === "restore") return target.restoreValue;
  if (target.action === "archive") return target.archiveValue;
  return "";
}

function lifecycleStrategy(target: CanvasRecordLifecycleTarget): CanvasRecordLifecycleActionPlan["lifecycleStrategy"] {
  return target.action === "delete" ? "permanentDelete" : target.archiveStrategy;
}

function operationCapability(target: CanvasRecordLifecycleTarget): CanvasRecordLifecycleConnectorCapability {
  return target.action === "delete" ? "delete" : "update";
}

function operationType(target: CanvasRecordLifecycleTarget): CanvasRecordLifecycleConnectorOperationType {
  return target.action === "delete" ? "deleteRecord" : "updateRecord";
}

function actionSpecificBlockers(project: ProjectRecord, target: CanvasRecordLifecycleTarget, entity: ActiveCanvasEntityReference | undefined, field: FieldReference | undefined): string[] {
  const connector = project.powerPlatform?.common.connectors.find((candidate) => candidate.id === target.connectorId);
  const blockers: string[] = [];
  if (!entity) blockers.push(`Lifecycle plan ${target.id} cannot resolve confirmed entity ownership.`);
  if (!connector || !isConnectorConfirmed(connector)) blockers.push(`Lifecycle plan ${target.id} cannot resolve a confirmed connector.`);
  if (target.action === "archive" || target.action === "restore") {
    if (!connector?.supportedOperations.update) blockers.push(`Lifecycle plan ${target.id} requires connector update capability.`);
    if (!field) blockers.push(`Lifecycle plan ${target.id} requires a confirmed lifecycle field.`);
    if (target.archiveStrategy === "statusField" && field?.fieldType !== "status") blockers.push(`Lifecycle plan ${target.id} status strategy requires a status field.`);
    if (["activeFlag", "archivedFlag", "softDeleteFlag"].includes(target.archiveStrategy) && field?.fieldType !== "boolean") blockers.push(`Lifecycle plan ${target.id} Boolean lifecycle strategy requires a Boolean field.`);
    if (!target.archiveValue || !target.restoreValue) blockers.push(`Lifecycle plan ${target.id} requires archive and restore values.`);
  }
  if (target.action === "delete") {
    if (target.archiveStrategy !== "notApplicable") blockers.push(`Lifecycle plan ${target.id} delete must keep archiveStrategy notApplicable.`);
    if (target.deleteStrategy !== "permanentDeleteApproved") blockers.push(`Lifecycle plan ${target.id} delete planning requires explicit permanent-delete approval.`);
    if (target.destructiveActionConfirmed !== true) blockers.push(`Lifecycle plan ${target.id} permanent delete must be explicitly confirmed.`);
    if (!connector?.supportedOperations.delete) blockers.push(`Lifecycle plan ${target.id} requires connector delete capability.`);
    if (target.lifecycleFieldId || target.archiveValue || target.restoreValue) blockers.push(`Lifecycle plan ${target.id} permanent delete must not reuse lifecycle field values.`);
  }
  return blockers;
}

function preconditionsFor(target: CanvasRecordLifecycleTarget, field: FieldReference | undefined): CanvasRecordLifecyclePrecondition[] {
  const preconditions: CanvasRecordLifecyclePrecondition[] = [
    {
      id: `${target.id}-record-exists`,
      type: "currentRecordExists",
      description: "Current record exists before the lifecycle action runs.",
      required: true
    },
    {
      id: `${target.id}-context-entity`,
      type: "recordContextMatchesEntity",
      description: "Record context resolves to the approved entity and connector.",
      required: true
    },
    {
      id: `${target.id}-connector-operation`,
      type: "connectorSupportsOperation",
      description: `Connector supports the required ${operationCapability(target)} operation.`,
      required: true
    }
  ];
  if (target.action === "archive" || target.action === "restore") {
    preconditions.push({
      id: `${target.id}-field-exists`,
      type: "lifecycleFieldExists",
      description: `Lifecycle field ${field?.fieldId ?? target.lifecycleFieldId} exists and belongs to the approved entity.`,
      required: true
    });
    preconditions.push({
      id: `${target.id}-current-state`,
      type: target.action === "archive" ? "currentRecordNotArchived" : "currentRecordArchived",
      description: target.action === "archive"
        ? "Current record is not already archived."
        : "Current record is archived before restore.",
      required: true
    });
  }
  if (target.action === "delete") {
    preconditions.push({
      id: `${target.id}-delete-approved`,
      type: "permanentDeleteApproved",
      description: "Permanent delete is explicitly approved.",
      required: true
    });
  }
  return preconditions;
}

function stepsFor(target: CanvasRecordLifecycleTarget): CanvasRecordLifecycleActionStep[] {
  const steps: CanvasRecordLifecycleActionStep[] = [
    {
      order: 1,
      type: "validateRecordContext",
      description: "Validate that the approved record context can supply the current record.",
      required: true
    }
  ];
  if (target.action === "archive" || target.action === "restore") {
    steps.push({
      order: 2,
      type: "validateCurrentLifecycleState",
      description: "Validate the current lifecycle state before mutation.",
      required: true
    });
  }
  steps.push({
    order: steps.length + 1,
    type: "performConnectorMutation",
    description: target.action === "delete"
      ? "Perform the approved connector permanent-delete operation."
      : "Perform the approved connector update operation for the lifecycle transition.",
    required: true
  });
  return steps;
}

function planFor(project: ProjectRecord, target: CanvasRecordLifecycleTarget): CanvasRecordLifecycleActionPlan | string[] {
  const entity = entityReference(project, target);
  const field = fieldReference(project, entity, target.lifecycleFieldId);
  const blockers = actionSpecificBlockers(project, target, entity, field);
  if (blockers.length > 0 || !entity) return blockers.length > 0 ? blockers : [`Lifecycle plan ${target.id} is missing entity ownership.`];
  const context = recordContextSource(target);
  const capability = operationCapability(target);
  return {
    planId: `record-lifecycle-plan-${target.id}`,
    lifecycleTargetId: target.id,
    actionType: target.action,
    triggerScreenId: target.screenTargetId,
    triggerControlId: target.triggerControlId,
    triggerProperty: "OnSelect",
    ...context,
    recordContextType: target.recordContextType,
    entityId: target.entityId,
    entityType: entity.entityType,
    connectorId: target.connectorId,
    backendType: entity.backendType,
    lifecycleStrategy: lifecycleStrategy(target),
    lifecycleFieldId: target.action === "delete" ? "" : target.lifecycleFieldId,
    lifecycleFieldType: target.action === "delete" ? "notApplicable" : field?.fieldType ?? "notApplicable",
    targetLifecycleValue: targetLifecycleValue(target),
    expectedCurrentLifecycleValue: expectedCurrentValue(target),
    connectorOperationType: operationType(target),
    connectorOperationCapability: capability,
    confirmationRequired: true,
    permanentDeleteApprovalReference: target.action === "delete" ? target.id : "",
    preconditions: preconditionsFor(target, field),
    orderedActionSteps: stepsFor(target),
    successOutcome: `${target.action} action completes against the approved record.`,
    failureOutcome: `${target.action} action fails safely without changing unrelated records.`,
    refreshRequirement: "notPlanned",
    navigationRequirement: "notPlanned",
    notificationRequirement: "notPlanned",
    deterministicOrderingKey: `${target.sortOrder.toString().padStart(6, "0")}|${target.action}|${target.id}`,
    planningStatus: "Planned",
    blockers: [],
    notes: [
      "Planning record only.",
      "Refresh, navigation, notification, and local-state behaviour are not planned until approved input decisions exist.",
      "No generated implementation content is produced."
    ]
  };
}

function duplicatePlanIssues(plans: CanvasRecordLifecycleActionPlan[]): string[] {
  const planIds = new Map<string, number>();
  const targetIds = new Map<string, number>();
  plans.forEach((plan) => {
    planIds.set(plan.planId, (planIds.get(plan.planId) ?? 0) + 1);
    targetIds.set(plan.lifecycleTargetId, (targetIds.get(plan.lifecycleTargetId) ?? 0) + 1);
  });
  return unique([
    ...[...planIds.entries()].filter(([, count]) => count > 1).map(([id]) => `Duplicate lifecycle plan ID: ${id}.`),
    ...[...targetIds.entries()].filter(([, count]) => count > 1).map(([id]) => `Duplicate lifecycle target plan identity: ${id}.`)
  ]);
}

function planShapeIssues(plans: CanvasRecordLifecycleActionPlan[]): string[] {
  const issues: string[] = [];
  plans.forEach((plan) => {
    if (!Array.isArray(plan.preconditions)) issues.push(`Lifecycle plan ${plan.planId} preconditions must be an array.`);
    if (!Array.isArray(plan.orderedActionSteps)) issues.push(`Lifecycle plan ${plan.planId} orderedActionSteps must be an array.`);
    if (JSON.stringify(plan).match(FORMULA_TEXT_PATTERN)) issues.push(`Lifecycle plan ${plan.planId} contains formula-looking text.`);
  });
  return unique(issues);
}

export function buildCanvasRecordLifecyclePlanningModel(project: unknown): CanvasRecordLifecyclePlanningResult {
  const resolution = safeProjectForLifecyclePlanning(project);
  if (resolution.kind === "result") return resolution.result;
  const safeProject = resolution.project;

  const validation = validateCanvasRecordLifecycleTargets(safeProject);
  if (validation.eligibilityStatus !== "Valid") {
    return {
      targets: validation.normalizedTargets,
      orderedTargets: validation.orderedTargets,
      plans: [],
      blockingIssues: unique(validation.blockingIssues),
      missingDecisions: validation.missingDecisions,
      required: false,
      duplicatePlanIssues: [],
      planningStatus: validation.eligibilityStatus === "Not Applicable" ? "Not Applicable" : "Blocked"
    };
  }

  const orderedTargets = orderCanvasRecordLifecycleTargets(validation.orderedTargets);
  const plans: CanvasRecordLifecycleActionPlan[] = [];
  const planningBlockers: string[] = [];
  orderedTargets.forEach((target) => {
    const planOrBlockers = planFor(safeProject, target);
    if (Array.isArray(planOrBlockers)) {
      planningBlockers.push(...planOrBlockers);
    } else {
      plans.push(planOrBlockers);
    }
  });
  const duplicateIssues = duplicatePlanIssues(plans);
  const shapeIssues = planShapeIssues(plans);
  const blockingIssues = unique([...planningBlockers, ...duplicateIssues, ...shapeIssues]);
  return {
    targets: validation.normalizedTargets,
    orderedTargets,
    plans: blockingIssues.length > 0 ? [] : plans.sort((a, b) => a.deterministicOrderingKey.localeCompare(b.deterministicOrderingKey)),
    blockingIssues,
    missingDecisions: validation.missingDecisions,
    required: orderedTargets.some((target) => target.required),
    duplicatePlanIssues: duplicateIssues,
    planningStatus: blockingIssues.length > 0 ? "Blocked" : "Planned"
  };
}
