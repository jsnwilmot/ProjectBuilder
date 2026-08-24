import type {
  CanvasDataSourceType,
  ProjectRecord,
  ProjectType,
  SelectableCanvasDataSourceType
} from "../types/project";
import type { PlanningClarificationAnswerSchema } from "./planningClarificationAnswerSchema";
import { getProductionPlanningClarificationAnswerSchema } from "./planningClarificationAnswerSchemaRegistry";

export const PLANNING_CLARIFICATION_ANSWER_SCHEMA_RESOLVER_VERSION =
  "phase-5c.3c.3j.2a";

export interface PlanningClarificationAnswerSchemaContext {
  readonly projectType: ProjectType | "";
  readonly primaryDataSourceType?: CanvasDataSourceType;
  readonly selectedDataSourceTypes?: readonly SelectableCanvasDataSourceType[];
}

export type PlanningClarificationAnswerSchemaResolutionReason =
  | "schemaNotRegistered"
  | "invalidContext"
  | "backendSelectionRequired"
  | "mixedBackendUnsupported"
  | "backendTypeUnsupported"
  | "unsupportedBackendRuleVersion";

export type PlanningClarificationAnswerSchemaResolution =
  | {
      state: "available";
      schema: PlanningClarificationAnswerSchema;
      schemaSource: "staticRule";
    }
  | {
      state: "available";
      schema: PlanningClarificationAnswerSchema;
      schemaSource: "backendSpecific";
      backendKind: "sharePointList";
    }
  | {
      state: "unavailable";
      reason: PlanningClarificationAnswerSchemaResolutionReason;
    };

const BACKEND_RULE_ID = "pp.canvas.schema.confirmation";
const BACKEND_RULE_VERSION = "1.0.0";
const CANVAS_DATA_SOURCE_TYPES = new Set<CanvasDataSourceType>([
  "sharePointList",
  "sharePointLibrary",
  "microsoftList",
  "dataverse",
  "excel",
  "sqlServer",
  "microsoft365Connector",
  "customConnector",
  "externalApi",
  "otherConnector",
  "multiple",
  "undecided"
]);
const SELECTABLE_DATA_SOURCE_TYPES = new Set<SelectableCanvasDataSourceType>([
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
]);
const CONTEXT_KEYS = new Set([
  "projectType",
  "primaryDataSourceType",
  "selectedDataSourceTypes"
]);

const SHAREPOINT_LIST_ANSWER_SCHEMA = deepFreeze({
  kind: "structuredRecord",
  fields: [
    {
      key: "dataSources",
      label: "Data sources",
      required: true,
      schema: {
        kind: "structuredRecordList",
        minItems: 1,
        maxItems: 100,
        fields: [
          { key: "dataSourceName", label: "Data source name", required: true, schema: { kind: "text" } },
          { key: "purpose", label: "Purpose", required: true, schema: { kind: "text" } },
          { key: "expectedRecordVolume", label: "Expected record volume", required: true, schema: { kind: "text" } },
          { key: "ownership", label: "Ownership", required: true, schema: { kind: "text" } }
        ]
      }
    },
    {
      key: "relationships",
      label: "Relationships",
      required: true,
      schema: { kind: "text" }
    },
    {
      key: "confirmationSource",
      label: "Schema confirmation source",
      required: true,
      schema: { kind: "text" }
    }
  ]
} as const satisfies PlanningClarificationAnswerSchema);

export function buildPlanningClarificationAnswerSchemaContext(
  project: ProjectRecord
): PlanningClarificationAnswerSchemaContext {
  if (project.intake.appType !== "powerAppsCanvas") {
    return Object.freeze({ projectType: project.intake.appType });
  }

  const canvas = project.powerPlatform?.canvas;
  if (!canvas) {
    return Object.freeze({ projectType: project.intake.appType });
  }

  return Object.freeze({
    projectType: project.intake.appType,
    primaryDataSourceType: canvas.primaryDataSourceType,
    selectedDataSourceTypes: Object.freeze([...canvas.selectedDataSourceTypes])
  });
}

export function resolveProductionPlanningClarificationAnswerSchema(
  ruleId: string,
  ruleVersion: string,
  context?: unknown
): PlanningClarificationAnswerSchemaResolution {
  if (ruleId !== BACKEND_RULE_ID) {
    const schema = getProductionPlanningClarificationAnswerSchema(ruleId, ruleVersion);
    return schema
      ? { state: "available", schema, schemaSource: "staticRule" }
      : { state: "unavailable", reason: "schemaNotRegistered" };
  }

  if (ruleVersion !== BACKEND_RULE_VERSION) {
    return { state: "unavailable", reason: "unsupportedBackendRuleVersion" };
  }

  const normalized = normalizeBackendContext(context);
  if (normalized.state === "unavailable") return normalized;

  const { primaryDataSourceType, selectedDataSourceTypes } = normalized.context;
  if (primaryDataSourceType === "undecided" || selectedDataSourceTypes.length === 0) {
    return { state: "unavailable", reason: "backendSelectionRequired" };
  }
  if (selectedDataSourceTypes.length > 1 || primaryDataSourceType === "multiple") {
    return selectedDataSourceTypes.length > 1
      ? { state: "unavailable", reason: "mixedBackendUnsupported" }
      : { state: "unavailable", reason: "backendSelectionRequired" };
  }
  if (primaryDataSourceType !== selectedDataSourceTypes[0]) {
    return { state: "unavailable", reason: "backendSelectionRequired" };
  }
  if (primaryDataSourceType !== "sharePointList") {
    return { state: "unavailable", reason: "backendTypeUnsupported" };
  }

  return {
    state: "available",
    schema: cloneSchema(SHAREPOINT_LIST_ANSWER_SCHEMA),
    schemaSource: "backendSpecific",
    backendKind: "sharePointList"
  };
}

function normalizeBackendContext(context: unknown):
  | { state: "available"; context: Required<PlanningClarificationAnswerSchemaContext> }
  | { state: "unavailable"; reason: PlanningClarificationAnswerSchemaResolutionReason } {
  if (context === undefined) {
    return { state: "unavailable", reason: "backendSelectionRequired" };
  }
  if (!isPlainObject(context) || Object.keys(context).some((key) => !CONTEXT_KEYS.has(key))) {
    return { state: "unavailable", reason: "invalidContext" };
  }
  if (context.projectType !== "powerAppsCanvas") {
    return { state: "unavailable", reason: "invalidContext" };
  }
  if (context.primaryDataSourceType === undefined || context.selectedDataSourceTypes === undefined) {
    return { state: "unavailable", reason: "backendSelectionRequired" };
  }
  if (!isCanvasDataSourceType(context.primaryDataSourceType) || !Array.isArray(context.selectedDataSourceTypes)) {
    return { state: "unavailable", reason: "invalidContext" };
  }
  if (!context.selectedDataSourceTypes.every(isSelectableDataSourceType)) {
    return { state: "unavailable", reason: "invalidContext" };
  }
  if (new Set(context.selectedDataSourceTypes).size !== context.selectedDataSourceTypes.length) {
    return { state: "unavailable", reason: "invalidContext" };
  }

  return {
    state: "available",
    context: {
      projectType: context.projectType,
      primaryDataSourceType: context.primaryDataSourceType,
      selectedDataSourceTypes: [...context.selectedDataSourceTypes]
    }
  };
}

function isCanvasDataSourceType(value: unknown): value is CanvasDataSourceType {
  return typeof value === "string" && CANVAS_DATA_SOURCE_TYPES.has(value as CanvasDataSourceType);
}

function isSelectableDataSourceType(value: unknown): value is SelectableCanvasDataSourceType {
  return typeof value === "string" && SELECTABLE_DATA_SOURCE_TYPES.has(value as SelectableCanvasDataSourceType);
}

function cloneSchema(schema: PlanningClarificationAnswerSchema): PlanningClarificationAnswerSchema {
  return JSON.parse(JSON.stringify(schema)) as PlanningClarificationAnswerSchema;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}
