import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetStatus,
  IMPLEMENTATION_ASSET_GENERATION_VERSION,
  IMPLEMENTATION_ASSET_STATUSES,
  type ImplementationAssetApplicabilityStatus,
  type ImplementationAssetApprovalStatus,
  type ImplementationAssetCategory,
  type ImplementationAsset,
  type ImplementationAssetPlatform,
  type ImplementationAssetRegistry
} from "./implementationAssets";
import {
  CANVAS_FORM_OPERATIONS_ASSET_ID,
  CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY,
  CANVAS_FORM_OPERATIONS_OPERATION,
  CANVAS_FORM_OPERATIONS_PLAN_PATH,
  CANVAS_FORM_OPERATIONS_TARGET_DISPLAY_NAME,
  CANVAS_FORM_OPERATIONS_TARGET_ID,
  type CanvasFormOperationGenerationInput
} from "./formOperationPlanning";
import { PHASE_GATE_EVALUATORS } from "./phaseGates";
import { isCanvasProject } from "./powerPlatform";
import type { PowerPlatformDecisionStatus, PowerPlatformGateStatus, ProjectRecord } from "../types/project";

export const FORM_OPERATION_POWER_FX_GENERATION_VERSION = "phase-5b.3c";
export type FormOperationPowerFxGenerationStatus = "Generated" | "Blocked" | "Not Applicable";

export interface FormOperationPowerFxFragment {
  targetId: string;
  operation: "create" | "edit";
  screenId: string;
  formControlId: string;
  submitControlId: string;
  sourceConnectorId: string;
  sourceEntityId: string;
  requiredFieldIds: string[];
  formulaProperty: "OnSelect";
  intendedFragmentPath: string;
  formula: string;
  formulaChecksum: string;
  sourcePlanningAssetId: typeof CANVAS_FORM_OPERATIONS_ASSET_ID;
  approvedPlanningChecksum: string;
  generationVersion: typeof FORM_OPERATION_POWER_FX_GENERATION_VERSION;
}

export interface FormOperationPowerFxTraceability {
  projectId: string;
  approvedPlanningAssetId: typeof CANVAS_FORM_OPERATIONS_ASSET_ID;
  approvedPlanningChecksum: string;
  orderedTargetIds: string[];
  screenIds: string[];
  formControlIds: string[];
  submitControlIds: string[];
  connectorIds: string[];
  entityIds: string[];
  fieldIds: string[];
  intendedFragmentPaths: string[];
}

export interface FormOperationPowerFxGenerationResult {
  assetId: typeof CANVAS_FORM_OPERATIONS_ASSET_ID;
  projectId: string;
  targetId: typeof CANVAS_FORM_OPERATIONS_TARGET_ID;
  operation: typeof CANVAS_FORM_OPERATIONS_OPERATION;
  propertyName: typeof CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY;
  status: FormOperationPowerFxGenerationStatus;
  sourceChecksum: string;
  generatedChecksum: string;
  fragments: FormOperationPowerFxFragment[];
  warnings: string[];
  blockingIssues: string[];
  missingDecisions: string[];
  validationInstructions: string[];
  manualInstallationInstructions: string[];
  generationVersion: typeof FORM_OPERATION_POWER_FX_GENERATION_VERSION;
  traceability: FormOperationPowerFxTraceability;
}

interface FormOperationPowerFxGenerationContext {
  project: ProjectRecord;
  registry: unknown;
  assetId?: string;
}

const POWER_FX_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const IMPLEMENTATION_ASSET_STATUS_SET = new Set<string>(IMPLEMENTATION_ASSET_STATUSES);
const IMPLEMENTATION_ASSET_PLATFORMS = new Set<ImplementationAssetPlatform>(["Power Apps Canvas", "Power Apps model-driven", "Power Platform", "Not Applicable"]);
const IMPLEMENTATION_ASSET_CATEGORIES = new Set<ImplementationAssetCategory>(["Asset plan", "Power Fx", "Canvas YAML", "Model-driven specification", "Automation specification", "Configuration", "Installation", "Validation", "Codex prompt"]);
const IMPLEMENTATION_ASSET_TYPES = new Set(["powerFxPlan", "canvasYamlPlan", "modelDrivenSpecification", "automationSpecification", "installationGuide", "validationChecklist", "assetManifest"]);
const IMPLEMENTATION_APPLICABILITY_STATUSES = new Set<ImplementationAssetApplicabilityStatus>(["required", "notApplicable", "undecided"]);
const IMPLEMENTATION_APPROVAL_STATUSES = new Set<ImplementationAssetApprovalStatus>(["Not reviewed", "Review required", "Approved"]);
const IMPLEMENTATION_DEPENDENCY_TYPES = new Set(["asset", "connector", "entity", "field", "screen", "control", "component", "gate", "environmentVariable", "connectionReference"]);
const PHASE_GATE_IDS = new Set(Object.keys(PHASE_GATE_EVALUATORS));
const POWER_PLATFORM_GATE_STATUSES = new Set<PowerPlatformGateStatus>(["confirmed", "missingInformation", "notStarted", "blocked", "notApplicable", "reviewNeeded", "ready", "inProgress", "manualValidationRequired", "failed", "passed"]);
const POWER_PLATFORM_DECISION_STATUSES = new Set<PowerPlatformDecisionStatus>(["notStarted", "missingInformation", "reviewNeeded", "confirmed", "blocked", "notApplicable"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableSortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSortObject);
  if (!isObject(value)) return typeof value === "string" ? value.replace(/\r\n/g, "\n").replace(/\r/g, "\n") : value;
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = stableSortObject(value[key]);
      return result;
    }, {});
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableSortObject(value));
}

function fnv1a(content: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function sameStableValue(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function sortedStrings(values: string[]): string[] {
  return [...values].sort();
}

function sourceChecksumIsValid(asset: ImplementationAsset): boolean {
  return asset.contentChecksum === calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });
}

function canonicalCurrentFormOperationAsset(project: ProjectRecord): ImplementationAsset | undefined {
  return buildImplementationAssetRegistry(project, "2026-07-17T00:00:00.000Z").assets.find((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID);
}

function traceabilityFor(project: ProjectRecord, asset: ImplementationAsset | undefined, targets: CanvasFormOperationGenerationInput[]): FormOperationPowerFxTraceability {
  return {
    projectId: project.identity.id,
    approvedPlanningAssetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
    approvedPlanningChecksum: asset?.contentChecksum ?? "",
    orderedTargetIds: targets.map((target) => target.id),
    screenIds: targets.map((target) => target.screenId),
    formControlIds: targets.map((target) => target.formControlId),
    submitControlIds: targets.map((target) => target.submitControlId),
    connectorIds: targets.map((target) => target.sourceConnectorId),
    entityIds: targets.map((target) => target.sourceEntityId),
    fieldIds: unique(targets.flatMap((target) => target.requiredFieldIds)),
    intendedFragmentPaths: targets.map((target) => target.intendedFragmentPath)
  };
}

function safeFormOperationInputs(value: unknown): CanvasFormOperationGenerationInput[] {
  return Array.isArray(value) ? value as CanvasFormOperationGenerationInput[] : [];
}

function baseResult(input: {
  project: ProjectRecord;
  asset?: ImplementationAsset;
  status: FormOperationPowerFxGenerationStatus;
  fragments?: FormOperationPowerFxFragment[];
  generatedChecksum?: string;
  blockingIssues?: string[];
  missingDecisions?: string[];
  warnings?: string[];
  targets?: CanvasFormOperationGenerationInput[];
}): FormOperationPowerFxGenerationResult {
  const targets = input.targets ?? safeFormOperationInputs(input.asset?.generationInputs?.formOperationTargets);
  return {
    assetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
    projectId: input.project.identity.id,
    targetId: CANVAS_FORM_OPERATIONS_TARGET_ID,
    operation: CANVAS_FORM_OPERATIONS_OPERATION,
    propertyName: CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY,
    status: input.status,
    sourceChecksum: input.asset?.contentChecksum ?? "",
    generatedChecksum: input.generatedChecksum ?? "",
    fragments: input.fragments ?? [],
    warnings: input.warnings ?? [],
    blockingIssues: input.blockingIssues ?? [],
    missingDecisions: input.missingDecisions ?? [],
    validationInstructions: [
      "Validate each generated submit-button OnSelect fragment in Power Apps Studio before claiming implementation complete.",
      "Confirm this phase only submits the confirmed form control and does not initialize form mode, navigate, reset, notify, or handle success/failure behavior."
    ],
    manualInstallationInstructions: [
      "Open the confirmed Canvas app in Power Apps Studio.",
      "For each generated fragment, paste the formula into the confirmed submit control's OnSelect property.",
      "Do not claim publish, deployment, or production verification from these generated fragments alone."
    ],
    generationVersion: FORM_OPERATION_POWER_FX_GENERATION_VERSION,
    traceability: traceabilityFor(input.project, input.asset, targets)
  };
}

function blocked(input: Omit<Parameters<typeof baseResult>[0], "status" | "fragments" | "generatedChecksum"> & { status?: FormOperationPowerFxGenerationStatus }): FormOperationPowerFxGenerationResult {
  return baseResult({
    ...input,
    fragments: [],
    generatedChecksum: "",
    status: input.status ?? "Blocked"
  });
}

function isSafeAssetCandidate(value: unknown): value is ImplementationAsset {
  return isObject(value) && typeof value.assetId === "string" && value.assetId.trim().length > 0;
}

function stringArrayIssues(value: unknown, fieldName: string, context: string): string[] {
  if (!Array.isArray(value)) return [`${context} has malformed ${fieldName}.`];
  return value.every((item) => typeof item === "string") ? [] : [`${context} has non-string entries in ${fieldName}.`];
}

function objectArrayIssues(value: unknown, fieldName: string, context: string, validateItem: (item: Record<string, unknown>, index: number) => string[]): string[] {
  if (!Array.isArray(value)) return [`${context} has malformed ${fieldName}.`];
  return value.flatMap((item, index) => isObject(item) ? validateItem(item, index) : [`${context} has malformed ${fieldName} entry ${index + 1}.`]);
}

function relationshipContextIssues(value: unknown, prefix: string): string[] {
  if (!isObject(value)) return [`${prefix} has malformed relationshipContext.`];
  return ["connectorId", "entityId", "fieldId", "parentConnectorId", "parentEntityId", "targetType"].flatMap((fieldName) =>
    value[fieldName] !== undefined && typeof value[fieldName] !== "string" ? [`${prefix} has malformed relationshipContext.${fieldName}.`] : []
  );
}

function gateSnapshotIssues(gate: Record<string, unknown>, index: number, context: string): string[] {
  const prefix = `${context} gate snapshot ${index + 1}`;
  const issues: string[] = [];
  if (typeof gate.gateId !== "string") {
    issues.push(`${prefix} has malformed gateId.`);
  } else if (!PHASE_GATE_IDS.has(gate.gateId)) {
    issues.push(`${prefix} has unknown gateId ${gate.gateId}.`);
  }
  if (typeof gate.status !== "string") {
    issues.push(`${prefix} has malformed status.`);
  } else if (!POWER_PLATFORM_GATE_STATUSES.has(gate.status as PowerPlatformGateStatus)) {
    issues.push(`${prefix} has unknown status ${gate.status}.`);
  }
  ["label", "blockingReason", "sourceSection"].forEach((fieldName) => {
    if (typeof gate[fieldName] !== "string") issues.push(`${prefix} has malformed ${fieldName}.`);
  });
  if (typeof gate.passed !== "boolean") issues.push(`${prefix} has malformed passed flag.`);
  return issues;
}

function dependencyEntryIssues(dependency: Record<string, unknown>, index: number, context: string): string[] {
  const prefix = `${context} dependency ${index + 1}`;
  const issues: string[] = [];
  ["id", "label", "resolutionReason", "sourceSection"].forEach((fieldName) => {
    if (typeof dependency[fieldName] !== "string") issues.push(`${prefix} has malformed ${fieldName}.`);
  });
  if (typeof dependency.type !== "string") {
    issues.push(`${prefix} has malformed type.`);
  } else if (!IMPLEMENTATION_DEPENDENCY_TYPES.has(dependency.type)) {
    issues.push(`${prefix} has unknown dependency type ${dependency.type}.`);
  }
  if (dependency.targetAssetId !== undefined && typeof dependency.targetAssetId !== "string") issues.push(`${prefix} has malformed targetAssetId.`);
  if (dependency.targetRecordId !== undefined && typeof dependency.targetRecordId !== "string") issues.push(`${prefix} has malformed targetRecordId.`);
  if (dependency.relationshipContext !== undefined) issues.push(...relationshipContextIssues(dependency.relationshipContext, prefix));
  if (typeof dependency.required !== "boolean") issues.push(`${prefix} has malformed required flag.`);
  if (typeof dependency.resolved !== "boolean") issues.push(`${prefix} has malformed resolved flag.`);
  if (dependency.blockingIssue !== undefined && typeof dependency.blockingIssue !== "string") issues.push(`${prefix} has malformed blockingIssue.`);
  return issues;
}

function formOperationTargetInputIssues(item: unknown, index: number, context: string): string[] {
  if (!isObject(item)) return [`${context} has malformed form-operation target generation input entry ${index + 1}.`];
  const prefix = `${context} form-operation target generation input ${index + 1}`;
  const issues: string[] = [];
  [
    "id",
    "screenId",
    "screenImplementationName",
    "formControlId",
    "formControlImplementationName",
    "submitControlId",
    "submitControlImplementationName",
    "sourceConnectorId",
    "sourceEntityId",
    "sourceImplementationName",
    "intendedFragmentPath",
  ].forEach((fieldName) => {
    if (typeof item[fieldName] !== "string") issues.push(`${prefix} has malformed ${fieldName}.`);
  });
  if (typeof item.operation !== "string") {
    issues.push(`${prefix} has malformed operation.`);
  } else if (item.operation !== "create" && item.operation !== "edit") {
    issues.push(`${prefix} has unsupported operation ${item.operation}.`);
  }
  if (typeof item.submissionTrigger !== "string") {
    issues.push(`${prefix} has malformed submissionTrigger.`);
  } else if (item.submissionTrigger !== "controlOnSelect") {
    issues.push(`${prefix} has unsupported submissionTrigger ${item.submissionTrigger}.`);
  }
  if (typeof item.formulaProperty !== "string") {
    issues.push(`${prefix} has malformed formulaProperty.`);
  } else if (item.formulaProperty !== "OnSelect") {
    issues.push(`${prefix} has unsupported formulaProperty ${item.formulaProperty}.`);
  }
  if (typeof item.confirmationStatus !== "string") {
    issues.push(`${prefix} has malformed confirmationStatus.`);
  } else if (!POWER_PLATFORM_DECISION_STATUSES.has(item.confirmationStatus as PowerPlatformDecisionStatus)) {
    issues.push(`${prefix} has unsupported confirmationStatus ${item.confirmationStatus}.`);
  }
  issues.push(...stringArrayIssues(item.requiredFieldIds, "requiredFieldIds", prefix));
  if (typeof item.required !== "boolean") issues.push(`${prefix} has malformed required flag.`);
  if (typeof item.sortOrder !== "number" || !Number.isFinite(item.sortOrder)) issues.push(`${prefix} has malformed sortOrder.`);
  return issues;
}

function generationInputsIssues(value: unknown, context: string, requireFormTargets: boolean): string[] {
  if (value === undefined) return requireFormTargets ? [`${context} has malformed generation inputs.`] : [];
  if (!isObject(value)) return [`${context} has malformed generation inputs.`];
  const issues: string[] = [];
  ["operation", "formulaProperty"].forEach((fieldName) => {
    if (value[fieldName] !== undefined && typeof value[fieldName] !== "string") issues.push(`${context} has malformed generation input ${fieldName}.`);
  });
  if (value.formOperationTargets === undefined) {
    if (requireFormTargets) issues.push(`${context} has malformed form-operation target generation inputs.`);
    return issues;
  }
  if (!Array.isArray(value.formOperationTargets)) return [`${context} has malformed form-operation target generation inputs.`];
  return [...issues, ...value.formOperationTargets.flatMap((item, index) => formOperationTargetInputIssues(item, index, context))];
}

function assetRuntimeShapeIssues(asset: ImplementationAsset, context = `Asset ${asset.assetId || "[missing]"}`, requireFormTargets = false): string[] {
  const issues: string[] = [];
  if (typeof asset.assetId !== "string" || asset.assetId.trim().length === 0) issues.push(`${context} has a malformed asset ID.`);
  if (typeof asset.projectId !== "string") issues.push(`${context} has malformed projectId.`);
  if (typeof asset.platform !== "string") {
    issues.push(`${context} has malformed platform.`);
  } else if (!IMPLEMENTATION_ASSET_PLATFORMS.has(asset.platform as ImplementationAssetPlatform)) {
    issues.push(`${context} has unknown platform ${asset.platform}.`);
  }
  if (typeof asset.assetCategory !== "string") {
    issues.push(`${context} has malformed assetCategory.`);
  } else if (!IMPLEMENTATION_ASSET_CATEGORIES.has(asset.assetCategory as ImplementationAssetCategory)) {
    issues.push(`${context} has unknown assetCategory ${asset.assetCategory}.`);
  }
  if (typeof asset.assetType !== "string") {
    issues.push(`${context} has malformed assetType.`);
  } else if (!IMPLEMENTATION_ASSET_TYPES.has(asset.assetType)) {
    issues.push(`${context} has unknown assetType ${asset.assetType}.`);
  }
  if (typeof asset.targetId !== "string") issues.push(`${context} has malformed targetId.`);
  if (typeof asset.targetDisplayName !== "string") issues.push(`${context} has malformed targetDisplayName.`);
  if (typeof asset.intendedPath !== "string") issues.push(`${context} has malformed intendedPath.`);
  if (typeof asset.sourceContent !== "string") issues.push(`${context} has malformed sourceContent.`);
  if (typeof asset.assetStatus !== "string") {
    issues.push(`${context} has malformed assetStatus.`);
  } else if (!IMPLEMENTATION_ASSET_STATUS_SET.has(asset.assetStatus)) {
    issues.push(`${context} has unknown assetStatus ${asset.assetStatus}.`);
  }
  if (typeof asset.applicabilityStatus !== "string") {
    issues.push(`${context} has malformed applicabilityStatus.`);
  } else if (!IMPLEMENTATION_APPLICABILITY_STATUSES.has(asset.applicabilityStatus as ImplementationAssetApplicabilityStatus)) {
    issues.push(`${context} has unknown applicabilityStatus ${asset.applicabilityStatus}.`);
  }
  if (typeof asset.required !== "boolean") issues.push(`${context} has malformed required flag.`);
  if (typeof asset.generationTimestamp !== "string") issues.push(`${context} has malformed generationTimestamp.`);
  if (typeof asset.generationVersion !== "string") issues.push(`${context} has malformed generationVersion.`);
  if (typeof asset.contentChecksum !== "string") issues.push(`${context} has malformed contentChecksum.`);
  if (typeof asset.approvalStatus !== "string") {
    issues.push(`${context} has malformed approvalStatus.`);
  } else if (!IMPLEMENTATION_APPROVAL_STATUSES.has(asset.approvalStatus as ImplementationAssetApprovalStatus)) {
    issues.push(`${context} has unknown approvalStatus ${asset.approvalStatus}.`);
  }
  if (asset.approvedPropertyName !== undefined && typeof asset.approvedPropertyName !== "string") issues.push(`${context} has malformed approvedPropertyName.`);
  issues.push(...stringArrayIssues(asset.requiredGateIds, "requiredGateIds", context));
  if (Array.isArray(asset.requiredGateIds)) {
    issues.push(...asset.requiredGateIds.flatMap((gateId) => PHASE_GATE_IDS.has(gateId) ? [] : [`${context} has unknown required gate ID ${gateId}.`]));
  }
  issues.push(...objectArrayIssues(asset.gateEvaluationSnapshot, "gateEvaluationSnapshot", context, (gate, index) => gateSnapshotIssues(gate, index, context)));
  issues.push(...stringArrayIssues(asset.sourceRecordIds, "sourceRecordIds", context));
  issues.push(...stringArrayIssues(asset.connectorIds, "connectorIds", context));
  issues.push(...stringArrayIssues(asset.entityIds, "entityIds", context));
  issues.push(...stringArrayIssues(asset.fieldIds, "fieldIds", context));
  issues.push(...objectArrayIssues(asset.dependencies, "dependencies", context, (dependency, index) => dependencyEntryIssues(dependency, index, context)));
  issues.push(...stringArrayIssues(asset.manualInstallationRequirements, "manualInstallationRequirements", context));
  issues.push(...stringArrayIssues(asset.validationRequirements, "validationRequirements", context));
  issues.push(...stringArrayIssues(asset.knownLimitations, "knownLimitations", context));
  issues.push(...stringArrayIssues(asset.blockingIssues, "blockingIssues", context));
  issues.push(...generationInputsIssues(asset.generationInputs, context, requireFormTargets));
  return issues;
}

function registryEnvelopeIssues(registry: unknown, project: ProjectRecord): string[] {
  const issues: string[] = [];
  if (!isObject(registry)) return ["Implementation asset registry is malformed."];
  if (registry.projectId !== project.identity.id) issues.push(`Implementation asset registry belongs to project ${typeof registry.projectId === "string" ? registry.projectId : "[missing]"}, not current project ${project.identity.id}.`);
  if (registry.registryVersion !== 1) issues.push(`Implementation asset registry version ${String(registry.registryVersion || "[missing]")} is not supported.`);
  if (registry.generationVersion !== IMPLEMENTATION_ASSET_GENERATION_VERSION) issues.push(`Implementation asset registry generation version ${typeof registry.generationVersion === "string" ? registry.generationVersion : "[missing]"} is not compatible with ${IMPLEMENTATION_ASSET_GENERATION_VERSION}.`);
  if (!Array.isArray(registry.assets)) {
    issues.push("Implementation asset registry asset list is malformed.");
    return issues;
  }
  registry.assets.forEach((asset, index) => {
    if (!isSafeAssetCandidate(asset)) issues.push(`Implementation asset registry asset entry ${index + 1} is malformed or missing a valid asset ID.`);
  });
  if (issues.some((issue) => issue.includes("asset entry"))) return issues;
  const assets = registry.assets as ImplementationAsset[];
  assets.forEach((asset, index) => {
    issues.push(...assetRuntimeShapeIssues(asset, `Implementation asset registry asset entry ${index + 1} (${asset.assetId})`, asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID));
  });
  const assetIds = assets.map((asset) => asset.assetId).filter(Boolean);
  issues.push(...unique(assetIds.filter((id, index) => assetIds.indexOf(id) !== index)).map((id) => `Implementation asset registry has duplicate asset ID ${id}.`));
  return issues;
}

function currentFormOperationTargetStorage(project: ProjectRecord): {
  targets: unknown[];
  malformedIssues: string[];
  missing: boolean;
} {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas || !Object.prototype.hasOwnProperty.call(canvas, "formOperationTargets")) {
    return { targets: [], malformedIssues: [], missing: true };
  }
  const value = (canvas as unknown as Record<string, unknown>).formOperationTargets;
  if (value === undefined) return { targets: [], malformedIssues: [], missing: true };
  if (!Array.isArray(value)) {
    return {
      targets: [],
      malformedIssues: ["Current Canvas form-operation target storage is malformed; formOperationTargets must be an array when present."],
      missing: false
    };
  }
  return { targets: value, malformedIssues: [], missing: false };
}

function asRegistry(registry: unknown): ImplementationAssetRegistry {
  return registry as ImplementationAssetRegistry;
}

function unsupportedAssetBoundaryIssues(asset: ImplementationAsset): string[] {
  const issues: string[] = [];
  if (asset.assetId !== CANVAS_FORM_OPERATIONS_ASSET_ID) issues.push(`Asset ${asset.assetId} is not the Canvas form-operation planning asset.`);
  if (asset.platform !== "Power Apps Canvas") issues.push(`Asset platform ${asset.platform || "[missing]"} is not Power Apps Canvas.`);
  if (asset.assetCategory !== "Power Fx") issues.push(`Asset category ${asset.assetCategory || "[missing]"} is not Power Fx.`);
  if (asset.assetType !== "powerFxPlan") issues.push(`Asset type ${asset.assetType || "[missing]"} is not powerFxPlan.`);
  if (asset.targetId !== CANVAS_FORM_OPERATIONS_TARGET_ID) issues.push(`Asset target ID ${asset.targetId || "[missing]"} is not ${CANVAS_FORM_OPERATIONS_TARGET_ID}.`);
  if (asset.generationInputs?.operation !== CANVAS_FORM_OPERATIONS_OPERATION) issues.push(`Operation ${asset.generationInputs?.operation || "[missing]"} is not ${CANVAS_FORM_OPERATIONS_OPERATION}.`);
  if (asset.approvedPropertyName !== CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY) issues.push(`Approved property ${asset.approvedPropertyName || "[missing]"} is not ${CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY}.`);
  if (asset.intendedPath !== CANVAS_FORM_OPERATIONS_PLAN_PATH) issues.push(`Planning path ${asset.intendedPath || "[missing]"} is not ${CANVAS_FORM_OPERATIONS_PLAN_PATH}.`);
  return issues;
}

function canonicalSourceContractIssues(rawAsset: ImplementationAsset, canonicalAsset: ImplementationAsset, project: ProjectRecord): string[] {
  const issues: string[] = [];
  if (rawAsset.projectId !== project.identity.id) issues.push(`Asset ${rawAsset.assetId} belongs to project ${rawAsset.projectId || "[missing]"}, not current project ${project.identity.id}.`);
  if (rawAsset.assetId !== canonicalAsset.assetId) issues.push(`Asset ID ${rawAsset.assetId} does not match canonical asset ID ${canonicalAsset.assetId}.`);
  if (rawAsset.platform !== canonicalAsset.platform) issues.push(`Asset platform ${rawAsset.platform} does not match canonical platform ${canonicalAsset.platform}.`);
  if (rawAsset.assetCategory !== canonicalAsset.assetCategory) issues.push(`Asset category ${rawAsset.assetCategory} does not match canonical category ${canonicalAsset.assetCategory}.`);
  if (rawAsset.assetType !== canonicalAsset.assetType) issues.push(`Asset type ${rawAsset.assetType} does not match canonical type ${canonicalAsset.assetType}.`);
  if (rawAsset.targetId !== canonicalAsset.targetId) issues.push(`Asset target ID ${rawAsset.targetId || "[missing]"} does not match canonical target ID ${canonicalAsset.targetId}.`);
  if (rawAsset.targetDisplayName !== canonicalAsset.targetDisplayName) issues.push(`Asset target display name does not match ${CANVAS_FORM_OPERATIONS_TARGET_DISPLAY_NAME}.`);
  if (rawAsset.intendedPath !== canonicalAsset.intendedPath) issues.push(`Asset intended path ${rawAsset.intendedPath || "[missing]"} does not match canonical path ${canonicalAsset.intendedPath}.`);
  if (rawAsset.approvedPropertyName !== canonicalAsset.approvedPropertyName) issues.push(`Approved property ${rawAsset.approvedPropertyName || "[missing]"} does not match canonical property ${canonicalAsset.approvedPropertyName}.`);
  if (rawAsset.generationInputs?.operation !== canonicalAsset.generationInputs?.operation) issues.push(`Operation ${rawAsset.generationInputs?.operation || "[missing]"} does not match canonical operation ${canonicalAsset.generationInputs?.operation}.`);
  if (rawAsset.generationInputs?.formulaProperty !== canonicalAsset.generationInputs?.formulaProperty) issues.push(`Formula property ${rawAsset.generationInputs?.formulaProperty || "[missing]"} does not match canonical property ${canonicalAsset.generationInputs?.formulaProperty}.`);
  if (rawAsset.required !== canonicalAsset.required) issues.push("Asset required flag does not match the canonical form-operation contract.");
  if (rawAsset.applicabilityStatus !== canonicalAsset.applicabilityStatus) issues.push("Asset applicability does not match the canonical form-operation contract.");
  if (!sameStableValue(sortedStrings(rawAsset.requiredGateIds), sortedStrings(canonicalAsset.requiredGateIds))) issues.push("Asset required gate IDs do not match the canonical form-operation gate contract.");
  if (!sameStableValue(rawAsset.gateEvaluationSnapshot, canonicalAsset.gateEvaluationSnapshot)) issues.push("Asset gate snapshot does not match current canonical gate evaluation.");
  if (!sameStableValue(sortedStrings(rawAsset.sourceRecordIds), sortedStrings(canonicalAsset.sourceRecordIds))) issues.push("Asset source record IDs do not match current canonical form-operation records.");
  if (!sameStableValue(rawAsset.generationInputs?.formOperationTargets ?? [], canonicalAsset.generationInputs?.formOperationTargets ?? [])) issues.push("Asset structured form-operation target inputs do not match current canonical form-operation inputs.");
  if (!sameStableValue(sortedStrings(rawAsset.connectorIds), sortedStrings(canonicalAsset.connectorIds))) issues.push("Asset connector IDs do not match the canonical form-operation dependency boundary.");
  if (!sameStableValue(sortedStrings(rawAsset.entityIds), sortedStrings(canonicalAsset.entityIds))) issues.push("Asset entity IDs do not match the canonical form-operation dependency boundary.");
  if (!sameStableValue(sortedStrings(rawAsset.fieldIds), sortedStrings(canonicalAsset.fieldIds))) issues.push("Asset field IDs do not match the canonical form-operation dependency boundary.");
  if (!sameStableValue(rawAsset.dependencies, canonicalAsset.dependencies)) issues.push("Asset dependencies do not match the canonical form-operation dependency boundary.");
  if (rawAsset.generationVersion !== canonicalAsset.generationVersion) issues.push(`Asset generation version ${rawAsset.generationVersion || "[missing]"} is not compatible with canonical version ${canonicalAsset.generationVersion}.`);
  if (rawAsset.contentChecksum !== canonicalAsset.contentChecksum) issues.push("Asset approved checksum does not match the current canonical form-operation checksum.");
  return issues;
}

function rawDependencyIssues(asset: ImplementationAsset): string[] {
  return asset.dependencies
    .filter((dependency) => dependency.required && !dependency.resolved)
    .map((dependency) => dependency.blockingIssue ?? `${dependency.label} is unresolved.`);
}

function fragmentPathIssues(path: string, targetId: string): string[] {
  const issues: string[] = [];
  if (!path.endsWith("/OnSelect.form-operation.fx")) issues.push(`Form-operation target ${targetId} intended fragment path must end with /OnSelect.form-operation.fx.`);
  if (path.includes("\\")) issues.push(`Form-operation target ${targetId} intended fragment path contains a backslash.`);
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path)) issues.push(`Form-operation target ${targetId} intended fragment path is absolute.`);
  if (path.split("/").includes("..")) issues.push(`Form-operation target ${targetId} intended fragment path contains parent traversal.`);
  if (path.trim() !== path || path.length === 0) issues.push(`Form-operation target ${targetId} intended fragment path is unsafe.`);
  return issues;
}

function fragmentChecksumFor(input: {
  projectId: string;
  approvedPlanningChecksum: string;
  target: CanvasFormOperationGenerationInput;
  formula: string;
}): string {
  return fnv1a(stableStringify({
    generationVersion: FORM_OPERATION_POWER_FX_GENERATION_VERSION,
    projectId: input.projectId,
    sourcePlanningAssetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
    approvedPlanningChecksum: input.approvedPlanningChecksum,
    targetId: input.target.id,
    operation: input.target.operation,
    screenId: input.target.screenId,
    formControlId: input.target.formControlId,
    currentFormImplementationName: input.target.formControlImplementationName,
    submitControlId: input.target.submitControlId,
    connectorId: input.target.sourceConnectorId,
    entityId: input.target.sourceEntityId,
    requiredFieldIds: input.target.requiredFieldIds,
    formulaProperty: input.target.formulaProperty,
    intendedPath: input.target.intendedFragmentPath,
    formula: input.formula
  }));
}

function generatedChecksumFor(input: {
  projectId: string;
  sourceChecksum: string;
  fragments: FormOperationPowerFxFragment[];
}): string {
  return fnv1a(stableStringify({
    generationVersion: FORM_OPERATION_POWER_FX_GENERATION_VERSION,
    projectId: input.projectId,
    sourcePlanningAssetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
    sourceChecksum: input.sourceChecksum,
    orderedTargetIds: input.fragments.map((fragment) => fragment.targetId),
    orderedFragmentChecksums: input.fragments.map((fragment) => fragment.formulaChecksum)
  }));
}

function fragmentsForTargets(project: ProjectRecord, sourceChecksum: string, targets: CanvasFormOperationGenerationInput[]): { fragments: FormOperationPowerFxFragment[]; issues: string[] } {
  const issues: string[] = [];
  const pathCounts = new Map<string, number>();
  targets.forEach((target) => pathCounts.set(target.intendedFragmentPath, (pathCounts.get(target.intendedFragmentPath) ?? 0) + 1));
  const fragments = targets.map((target) => {
    if (target.operation !== "create" && target.operation !== "edit") issues.push(`Form-operation target ${target.id} operation ${target.operation} is not supported.`);
    if (target.formulaProperty !== "OnSelect") issues.push(`Form-operation target ${target.id} formula property ${target.formulaProperty} is not supported.`);
    if (target.submissionTrigger !== "controlOnSelect") issues.push(`Form-operation target ${target.id} submission trigger ${target.submissionTrigger} is not supported.`);
    if (!POWER_FX_IDENTIFIER_PATTERN.test(target.formControlImplementationName)) issues.push(`Form-operation target ${target.id} form implementation name is not a simple Power Fx identifier.`);
    if ((pathCounts.get(target.intendedFragmentPath) ?? 0) > 1) issues.push(`Duplicate form-operation intended fragment path: ${target.intendedFragmentPath}.`);
    issues.push(...fragmentPathIssues(target.intendedFragmentPath, target.id));
    const formula = `SubmitForm(${target.formControlImplementationName})\n`;
    return {
      targetId: target.id,
      operation: target.operation,
      screenId: target.screenId,
      formControlId: target.formControlId,
      submitControlId: target.submitControlId,
      sourceConnectorId: target.sourceConnectorId,
      sourceEntityId: target.sourceEntityId,
      requiredFieldIds: [...target.requiredFieldIds],
      formulaProperty: target.formulaProperty,
      intendedFragmentPath: target.intendedFragmentPath,
      formula,
      formulaChecksum: fragmentChecksumFor({
        projectId: project.identity.id,
        approvedPlanningChecksum: sourceChecksum,
        target,
        formula
      }),
      sourcePlanningAssetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
      approvedPlanningChecksum: sourceChecksum,
      generationVersion: FORM_OPERATION_POWER_FX_GENERATION_VERSION
    };
  }) satisfies FormOperationPowerFxFragment[];
  return {
    fragments: issues.length > 0 ? [] : fragments,
    issues: unique(issues)
  };
}

export function generateFormOperationPowerFxForAsset({
  project,
  registry,
  assetId = CANVAS_FORM_OPERATIONS_ASSET_ID
}: FormOperationPowerFxGenerationContext): FormOperationPowerFxGenerationResult {
  const envelopeIssues = registryEnvelopeIssues(registry, project);
  if (envelopeIssues.length > 0) {
    return blocked({
      project,
      blockingIssues: envelopeIssues,
      missingDecisions: ["Regenerate the implementation asset registry for the current project before generating form-operation Power Fx."]
    });
  }

  const typedRegistry = asRegistry(registry);
  const canonicalSourceCount = typedRegistry.assets.filter((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID).length;
  const currentTargetStorage = currentFormOperationTargetStorage(project);
  if (currentTargetStorage.malformedIssues.length > 0) {
    return blocked({
      project,
      blockingIssues: currentTargetStorage.malformedIssues,
      missingDecisions: ["Repair or regenerate the current Canvas form-operation target storage before generating SubmitForm Power Fx."]
    });
  }

  if (!isCanvasProject(project)) {
    return blocked({
      project,
      blockingIssues: ["Form-operation Power Fx generation is only supported for Canvas Power Apps projects in Phase 5B.3C."],
      status: "Not Applicable"
    });
  }

  const currentTargetCount = currentTargetStorage.targets.length;
  if (currentTargetCount === 0) {
    if (canonicalSourceCount === 0) {
      return blocked({
        project,
        status: "Not Applicable",
        blockingIssues: ["No Canvas form-operation targets are applicable for SubmitForm Power Fx generation."]
      });
    }
    return blocked({
      project,
      blockingIssues: [
        canonicalSourceCount === 1
          ? `Stored form-operation planning asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} is stale because all form-operation targets were removed.`
          : `Implementation asset registry has ${canonicalSourceCount} stale or ambiguous canonical form-operation source assets after all targets were removed.`
      ],
      missingDecisions: ["Regenerate the implementation asset registry so stale form-operation planning assets are removed."]
    });
  }

  if (assetId !== CANVAS_FORM_OPERATIONS_ASSET_ID) {
    return blocked({
      project,
      blockingIssues: [`Asset ${assetId} is not the approved Phase 5B.3B form-operation planning asset.`]
    });
  }

  if (canonicalSourceCount === 0) {
    return blocked({
      project,
      blockingIssues: [`Phase 5B.3B form-operation planning asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} does not exist.`],
      missingDecisions: ["Regenerate and approve the current Canvas form-operation planning asset."]
    });
  }
  if (canonicalSourceCount > 1) {
    return blocked({
      project,
      blockingIssues: [`Implementation asset registry has ${canonicalSourceCount} canonical form-operation source assets; exactly one is required.`],
      missingDecisions: ["Regenerate the implementation asset registry before generating form-operation Power Fx."]
    });
  }

  const rawAsset = typedRegistry.assets.find((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID);
  if (!rawAsset) {
    return blocked({
      project,
      blockingIssues: [`Phase 5B.3B form-operation planning asset ${assetId} does not exist.`],
      missingDecisions: ["Regenerate and approve the current Canvas form-operation planning asset."]
    });
  }

  const rawShapeIssues = assetRuntimeShapeIssues(rawAsset, `Asset ${rawAsset.assetId}`, true);
  if (rawShapeIssues.length > 0) return blocked({ project, asset: rawAsset, blockingIssues: rawShapeIssues });

  const canonicalAsset = canonicalCurrentFormOperationAsset(project);
  if (!canonicalAsset) {
    return blocked({
      project,
      asset: rawAsset,
      blockingIssues: ["Current project does not have a canonical Canvas form-operation planning asset."],
      missingDecisions: ["Regenerate the current Canvas form-operation planning asset."]
    });
  }

  const canonicalShapeIssues = assetRuntimeShapeIssues(canonicalAsset, `Asset ${canonicalAsset.assetId}`, true);
  if (canonicalShapeIssues.length > 0) return blocked({ project, blockingIssues: canonicalShapeIssues });

  const boundaryIssues = unsupportedAssetBoundaryIssues(rawAsset);
  if (boundaryIssues.length > 0) return blocked({ project, asset: rawAsset, blockingIssues: boundaryIssues });

  if (rawAsset.assetStatus !== "Ready for Export") {
    return blocked({
      project,
      asset: rawAsset,
      blockingIssues: [`Asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} stored source status is ${rawAsset.assetStatus}; Ready for Export is required before SubmitForm Power Fx generation.`],
      missingDecisions: ["Regenerate or restore the form-operation planning asset through the approved review process before generating Power Fx."]
    });
  }

  if (!sourceChecksumIsValid(rawAsset)) return blocked({ project, asset: rawAsset, blockingIssues: [`Asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} source checksum is invalid.`] });

  const canonicalIssues = canonicalSourceContractIssues(rawAsset, canonicalAsset, project);
  if (canonicalIssues.length > 0) {
    return blocked({
      project,
      asset: canonicalAsset,
      blockingIssues: canonicalIssues,
      missingDecisions: ["Regenerate and explicitly reapprove the canonical current Canvas form-operation planning asset."]
    });
  }

  const rawDependencyBlockingIssues = rawDependencyIssues(rawAsset);
  if (rawDependencyBlockingIssues.length > 0) return blocked({ project, asset: rawAsset, blockingIssues: rawDependencyBlockingIssues });

  const currentTargets = canonicalAsset.generationInputs?.formOperationTargets ?? [];
  const rawTargets = rawAsset.generationInputs?.formOperationTargets ?? [];
  if (stableStringify(rawTargets) !== stableStringify(currentTargets)) {
    return blocked({
      project,
      asset: rawAsset,
      blockingIssues: [`Asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} structured form-operation target inputs do not match the current project.`],
      missingDecisions: ["Regenerate and explicitly reapprove the current Canvas form-operation planning asset."]
    });
  }

  const derivedAsset = deriveImplementationAssetRegistryState(project, typedRegistry.assets).assets.find((asset) => asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID) ?? rawAsset;
  const approvedCanonicalAsset = { ...canonicalAsset, approvalStatus: rawAsset.approvalStatus };
  const common = { project, asset: approvedCanonicalAsset, targets: currentTargets };
  if (!derivedAsset.required || derivedAsset.applicabilityStatus !== "required") return blocked({ ...common, blockingIssues: [`Asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} is Draft because applicability is not confirmed as required.`] });
  if (rawAsset.contentChecksum !== derivedAsset.contentChecksum || rawAsset.contentChecksum !== canonicalAsset.contentChecksum) {
    return blocked({
      ...common,
      blockingIssues: [`Asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} approval is stale against current project state.`],
      missingDecisions: ["Regenerate the form-operation planning asset and explicitly approve the current checksum."]
    });
  }
  if (canonicalAsset.blockingIssues.length > 0) return blocked({ ...common, blockingIssues: canonicalAsset.blockingIssues });
  if (currentTargets.length === 0) return blocked({ ...common, blockingIssues: ["Current form-operation targets do not include any target eligible for SubmitForm generation."] });
  const recalculatedStatus = evaluateImplementationAssetStatus(approvedCanonicalAsset);
  if (recalculatedStatus === "Blocked" || recalculatedStatus === "Draft" || recalculatedStatus === "Not Applicable") return blocked({ ...common, blockingIssues: [`Asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} recalculated status is ${recalculatedStatus}.`, ...derivedAsset.blockingIssues] });
  if (canonicalAsset.gateEvaluationSnapshot.some((gate) => !gate.passed)) {
    return blocked({ ...common, blockingIssues: canonicalAsset.gateEvaluationSnapshot.filter((gate) => !gate.passed).map((gate) => `${gate.label}: ${gate.blockingReason}`) });
  }
  if (canonicalAsset.dependencies.some((dependency) => dependency.required && !dependency.resolved)) {
    return blocked({ ...common, blockingIssues: canonicalAsset.dependencies.filter((dependency) => dependency.required && !dependency.resolved).map((dependency) => dependency.blockingIssue ?? `${dependency.label} is unresolved.`) });
  }
  if (rawAsset.approvalStatus !== "Approved") return blocked({ ...common, blockingIssues: [`Asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} is not approved.`] });
  if (recalculatedStatus !== "Ready for Export") return blocked({ ...common, blockingIssues: [`Asset ${CANVAS_FORM_OPERATIONS_ASSET_ID} recalculated status is ${recalculatedStatus}.`, ...derivedAsset.blockingIssues] });

  const fragmentResult = fragmentsForTargets(project, canonicalAsset.contentChecksum, currentTargets);
  if (fragmentResult.issues.length > 0) return blocked({ ...common, blockingIssues: fragmentResult.issues });
  return baseResult({
    ...common,
    fragments: fragmentResult.fragments,
    generatedChecksum: generatedChecksumFor({
      projectId: project.identity.id,
      sourceChecksum: canonicalAsset.contentChecksum,
      fragments: fragmentResult.fragments
    }),
    status: "Generated"
  });
}

export function generateFormOperationPowerFxForRegistry(project: ProjectRecord, registry: unknown): FormOperationPowerFxGenerationResult[] {
  const result = generateFormOperationPowerFxForAsset({ project, registry });
  const hasValidAssetList = isObject(registry) && Array.isArray(registry.assets);
  const assets = hasValidAssetList ? registry.assets as unknown[] : [];
  return result.status === "Not Applicable" && hasValidAssetList && !assets.some((asset) => isSafeAssetCandidate(asset) && asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID)
    ? []
    : [result];
}
