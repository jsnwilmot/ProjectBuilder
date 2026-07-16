import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetStatus,
  IMPLEMENTATION_ASSET_GENERATION_VERSION,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "./implementationAssets";
import { isCanvasProject } from "./powerPlatform";
import {
  CANVAS_STATE_INITIALIZATION_ASSET_ID,
  CANVAS_STATE_INITIALIZATION_OPERATION,
  CANVAS_STATE_INITIALIZATION_PATH,
  CANVAS_STATE_INITIALIZATION_TARGET_ID,
  canvasStateVariableGenerationInputs,
  validateCanvasStateVariables,
  type CanvasStateVariableGenerationInput
} from "./stateInitialization";
import type { CanvasStateInitialValue, ProjectRecord } from "../types/project";

export const STATE_POWER_FX_GENERATION_VERSION = "phase-5b.2b";
export type StatePowerFxOperation = typeof CANVAS_STATE_INITIALIZATION_OPERATION;
export type StatePowerFxGenerationStatus = "Not Applicable" | "Blocked" | "Review Required" | "Generated";

export interface StatePowerFxGenerationTraceability {
  orderedVariableIds: string[];
  orderedImplementationNames: string[];
}

export interface StatePowerFxGenerationResult {
  assetId: string;
  projectId: string;
  appTargetId: string;
  operation: StatePowerFxOperation;
  propertyName: "OnStart";
  intendedPath: string;
  formula: string;
  status: StatePowerFxGenerationStatus;
  sourceChecksum: string;
  generatedChecksum: string;
  dependencies: string[];
  warnings: string[];
  blockingIssues: string[];
  missingDecisions: string[];
  validationInstructions: string[];
  manualInstallationInstructions: string[];
  generationVersion: string;
  traceability: StatePowerFxGenerationTraceability;
}

interface StatePowerFxGenerationContext {
  project: ProjectRecord;
  registry: ImplementationAssetRegistry;
  assetId?: string;
}

interface SerializedScalar {
  expression?: string;
  issue?: string;
}

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

function sourceChecksumIsValid(asset: ImplementationAsset): boolean {
  return asset.contentChecksum === calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });
}

function dependencyIds(asset: ImplementationAsset | undefined): string[] {
  return asset?.dependencies.map((dependency) => dependency.id).sort() ?? [];
}

function currentStateInputs(project: ProjectRecord): {
  variables: CanvasStateVariableGenerationInput[];
  blockingIssues: string[];
} {
  const validation = validateCanvasStateVariables(project.powerPlatform?.canvas?.stateVariableTargets ?? []);
  return {
    variables: canvasStateVariableGenerationInputs(validation.includedVariables),
    blockingIssues: validation.blockingIssues
  };
}

function canonicalCurrentStateAsset(project: ProjectRecord): ImplementationAsset | undefined {
  return buildImplementationAssetRegistry(project, "2026-07-16T00:00:00.000Z").assets.find((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID);
}

function sortedStrings(values: string[]): string[] {
  return [...values].sort();
}

function sameStableValue(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function baseResult(input: {
  project: ProjectRecord;
  asset?: ImplementationAsset;
  assetId: string;
  status: StatePowerFxGenerationStatus;
  formula?: string;
  generatedChecksum?: string;
  blockingIssues?: string[];
  missingDecisions?: string[];
  warnings?: string[];
  variables?: CanvasStateVariableGenerationInput[];
}): StatePowerFxGenerationResult {
  const variables = input.variables ?? input.asset?.generationInputs?.stateVariables ?? [];
  return {
    assetId: input.asset?.assetId ?? input.assetId,
    projectId: input.project.identity.id,
    appTargetId: input.asset?.targetId ?? CANVAS_STATE_INITIALIZATION_TARGET_ID,
    operation: CANVAS_STATE_INITIALIZATION_OPERATION,
    propertyName: "OnStart",
    intendedPath: input.asset?.intendedPath ?? CANVAS_STATE_INITIALIZATION_PATH,
    formula: input.formula ?? "",
    status: input.status,
    sourceChecksum: input.asset?.contentChecksum ?? "",
    generatedChecksum: input.generatedChecksum ?? "",
    dependencies: dependencyIds(input.asset),
    warnings: input.warnings ?? [],
    blockingIssues: input.blockingIssues ?? [],
    missingDecisions: input.missingDecisions ?? [],
    validationInstructions: [
      "Validate the generated App OnStart formula in Power Apps Studio before claiming implementation complete.",
      "Confirm each scalar state variable initializes to the expected value when the app starts."
    ],
    manualInstallationInstructions: [
      "Open the confirmed Canvas app in Power Apps Studio.",
      "Paste the generated formula into the App OnStart property only.",
      "Do not claim publish, deployment, or production verification from this generated source alone."
    ],
    generationVersion: STATE_POWER_FX_GENERATION_VERSION,
    traceability: {
      orderedVariableIds: variables.map((variable) => variable.id),
      orderedImplementationNames: variables.map((variable) => variable.implementationName)
    }
  };
}

function blocked(input: Omit<Parameters<typeof baseResult>[0], "status"> & { status?: StatePowerFxGenerationStatus }): StatePowerFxGenerationResult {
  return baseResult({
    ...input,
    formula: "",
    generatedChecksum: "",
    status: input.status ?? "Blocked"
  });
}

function serializeNumber(value: number, variableId: string): SerializedScalar {
  if (!Number.isFinite(value)) return { issue: `State variable ${variableId} number initial value is not finite.` };
  if (Object.is(value, -0)) return { expression: "0" };
  return { expression: String(value) };
}

function quoteTextLine(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function serializeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(quoteTextLine).join(" & Char(10) & ");
}

function serializeScalarValue(value: CanvasStateInitialValue, variableId: string): SerializedScalar {
  if (value.kind === "blank") return { expression: "Blank()" };
  if (value.kind === "boolean") return { expression: value.value ? "true" : "false" };
  if (value.kind === "number") return serializeNumber(value.value, variableId);
  if (value.kind === "text") return { expression: serializeText(value.value) };
  return { issue: `State variable ${variableId} initial value kind is not supported.` };
}

function formulaForVariables(variables: CanvasStateVariableGenerationInput[]): { formula: string; issues: string[] } {
  const issues: string[] = [];
  const statements = variables.map((variable) => {
    const serialized = serializeScalarValue(variable.initialValue, variable.id);
    if (!serialized.expression) {
      issues.push(serialized.issue ?? `State variable ${variable.id} initial value is unsupported.`);
      return "";
    }
    return `Set(${variable.implementationName}, ${serialized.expression})`;
  });
  return {
    formula: issues.length > 0 ? "" : `${statements.join(";\n")}\n`,
    issues
  };
}

function generatedChecksumFor(input: {
  sourceChecksum: string;
  formula: string;
  operation: StatePowerFxOperation;
  propertyName: "OnStart";
  intendedPath: string;
  orderedVariableIds: string[];
  orderedImplementationNames: string[];
}): string {
  return fnv1a(stableStringify({
    generationVersion: STATE_POWER_FX_GENERATION_VERSION,
    ...input
  }));
}

function unsupportedAssetBoundaryIssues(asset: ImplementationAsset): string[] {
  const issues: string[] = [];
  if (asset.assetId !== CANVAS_STATE_INITIALIZATION_ASSET_ID) issues.push(`Asset ${asset.assetId} is not the App OnStart state-initialization planning asset.`);
  if (asset.generationInputs?.operation !== CANVAS_STATE_INITIALIZATION_OPERATION) issues.push(`Operation ${asset.generationInputs?.operation || "[missing]"} is not supported for state initialization generation.`);
  if (asset.approvedPropertyName !== "OnStart" || asset.generationInputs?.formulaProperty !== "OnStart") issues.push(`Property ${asset.approvedPropertyName || asset.generationInputs?.formulaProperty || "[missing]"} is not supported for state initialization generation.`);
  if (asset.intendedPath !== CANVAS_STATE_INITIALIZATION_PATH) issues.push(`Asset path ${asset.intendedPath || "[missing]"} is not supported for state initialization generation.`);
  if (asset.assetType !== "powerFxPlan") issues.push(`Asset ${asset.assetId} is ${asset.assetType}, not a Power Fx plan asset.`);
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
  if (rawAsset.targetDisplayName !== canonicalAsset.targetDisplayName) issues.push("Asset target display name does not match the canonical App OnStart state-initialization target.");
  if (rawAsset.intendedPath !== canonicalAsset.intendedPath) issues.push(`Asset intended path ${rawAsset.intendedPath || "[missing]"} does not match canonical path ${canonicalAsset.intendedPath}.`);
  if (rawAsset.approvedPropertyName !== canonicalAsset.approvedPropertyName) issues.push(`Approved property ${rawAsset.approvedPropertyName || "[missing]"} does not match canonical property ${canonicalAsset.approvedPropertyName}.`);
  if (rawAsset.generationInputs?.operation !== canonicalAsset.generationInputs?.operation) issues.push(`Operation ${rawAsset.generationInputs?.operation || "[missing]"} does not match canonical operation ${canonicalAsset.generationInputs?.operation}.`);
  if (rawAsset.generationInputs?.formulaProperty !== canonicalAsset.generationInputs?.formulaProperty) issues.push(`Formula property ${rawAsset.generationInputs?.formulaProperty || "[missing]"} does not match canonical property ${canonicalAsset.generationInputs?.formulaProperty}.`);
  if (!sameStableValue(sortedStrings(rawAsset.requiredGateIds), sortedStrings(canonicalAsset.requiredGateIds))) issues.push("Asset required gate IDs do not match the canonical state-initialization gate contract.");
  if (!sameStableValue(rawAsset.gateEvaluationSnapshot, canonicalAsset.gateEvaluationSnapshot)) issues.push("Asset gate snapshot does not match current canonical gate evaluation.");
  if (!sameStableValue(sortedStrings(rawAsset.sourceRecordIds), sortedStrings(canonicalAsset.sourceRecordIds))) issues.push("Asset source record IDs do not match current canonical state-variable records.");
  if (!sameStableValue(rawAsset.generationInputs?.stateVariables ?? [], canonicalAsset.generationInputs?.stateVariables ?? [])) issues.push("Asset structured state-variable inputs do not match current canonical state-variable inputs.");
  if (!sameStableValue(sortedStrings(rawAsset.connectorIds), sortedStrings(canonicalAsset.connectorIds))) issues.push("Asset connector IDs do not match the canonical scalar state dependency boundary.");
  if (!sameStableValue(sortedStrings(rawAsset.entityIds), sortedStrings(canonicalAsset.entityIds))) issues.push("Asset entity IDs do not match the canonical scalar state dependency boundary.");
  if (!sameStableValue(sortedStrings(rawAsset.fieldIds), sortedStrings(canonicalAsset.fieldIds))) issues.push("Asset field IDs do not match the canonical scalar state dependency boundary.");
  if (!sameStableValue(rawAsset.dependencies, canonicalAsset.dependencies)) issues.push("Asset dependencies do not match the canonical scalar state dependency boundary.");
  if (rawAsset.generationVersion !== canonicalAsset.generationVersion) issues.push(`Asset generation version ${rawAsset.generationVersion || "[missing]"} is not compatible with canonical version ${canonicalAsset.generationVersion}.`);
  if (rawAsset.contentChecksum !== canonicalAsset.contentChecksum) issues.push("Asset approved checksum does not match the current canonical state-initialization checksum.");
  return issues;
}

function rawDependencyIssues(asset: ImplementationAsset): string[] {
  return asset.dependencies
    .filter((dependency) => dependency.required && !dependency.resolved)
    .map((dependency) => dependency.blockingIssue ?? `${dependency.label} is unresolved.`);
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
  return value.flatMap((item, index) => {
    if (!isObject(item)) return [`${context} has malformed ${fieldName} entry ${index + 1}.`];
    return validateItem(item, index);
  });
}

function gateSnapshotIssues(gate: Record<string, unknown>, index: number, context: string): string[] {
  const issues: string[] = [];
  const prefix = `${context} gate snapshot ${index + 1}`;
  if (typeof gate.gateId !== "string") issues.push(`${prefix} has malformed gateId.`);
  if (typeof gate.label !== "string") issues.push(`${prefix} has malformed label.`);
  if (typeof gate.status !== "string") issues.push(`${prefix} has malformed status.`);
  if (typeof gate.blockingReason !== "string") issues.push(`${prefix} has malformed blockingReason.`);
  if (typeof gate.sourceSection !== "string") issues.push(`${prefix} has malformed sourceSection.`);
  if (typeof gate.passed !== "boolean") issues.push(`${prefix} has malformed passed flag.`);
  return issues;
}

function relationshipContextIssues(value: unknown, prefix: string): string[] {
  if (!isObject(value)) return [`${prefix} has malformed relationshipContext.`];
  const issues: string[] = [];
  const stringFields = ["connectorId", "entityId", "fieldId", "parentConnectorId", "parentEntityId", "targetType"];
  stringFields.forEach((fieldName) => {
    if (value[fieldName] !== undefined && typeof value[fieldName] !== "string") {
      issues.push(`${prefix} has malformed relationshipContext.${fieldName}.`);
    }
  });
  return issues;
}

function dependencyEntryIssues(dependency: Record<string, unknown>, index: number, context: string): string[] {
  const issues: string[] = [];
  const prefix = `${context} dependency ${index + 1}`;
  if (typeof dependency.id !== "string") issues.push(`${prefix} has malformed id.`);
  if (typeof dependency.type !== "string") issues.push(`${prefix} has malformed type.`);
  if (typeof dependency.label !== "string") issues.push(`${prefix} has malformed label.`);
  if (dependency.targetAssetId !== undefined && typeof dependency.targetAssetId !== "string") issues.push(`${prefix} has malformed targetAssetId.`);
  if (dependency.targetRecordId !== undefined && typeof dependency.targetRecordId !== "string") issues.push(`${prefix} has malformed targetRecordId.`);
  if (dependency.relationshipContext !== undefined) issues.push(...relationshipContextIssues(dependency.relationshipContext, prefix));
  if (typeof dependency.required !== "boolean") issues.push(`${prefix} has malformed required flag.`);
  if (typeof dependency.resolved !== "boolean") issues.push(`${prefix} has malformed resolved flag.`);
  if (typeof dependency.resolutionReason !== "string") issues.push(`${prefix} has malformed resolutionReason.`);
  if (dependency.blockingIssue !== undefined && typeof dependency.blockingIssue !== "string") issues.push(`${prefix} has malformed blockingIssue.`);
  if (typeof dependency.sourceSection !== "string") issues.push(`${prefix} has malformed sourceSection.`);
  return issues;
}

function initialValueIssues(value: unknown, context: string): string[] {
  if (!isObject(value)) return [`${context} has malformed initialValue.`];
  if (value.kind === "blank") return [];
  if (value.kind === "boolean") {
    return typeof value.value === "boolean" ? [] : [`${context} has malformed Boolean initialValue value.`];
  }
  if (value.kind === "number") {
    return typeof value.value === "number" && Number.isFinite(value.value) ? [] : [`${context} has malformed number initialValue value.`];
  }
  if (value.kind === "text") {
    return typeof value.value === "string" ? [] : [`${context} has malformed text initialValue value.`];
  }
  return [`${context} has unsupported initialValue kind.`];
}

function stateVariableInputIssues(item: unknown, index: number, context: string): string[] {
  if (!isObject(item)) return [`${context} has malformed state-variable generation input entry ${index + 1}.`];
  const issues: string[] = [];
  const prefix = `${context} state-variable generation input ${index + 1}`;
  if (typeof item.id !== "string") issues.push(`${prefix} has malformed id.`);
  if (typeof item.implementationName !== "string") issues.push(`${prefix} has malformed implementationName.`);
  if (typeof item.purpose !== "string") issues.push(`${prefix} has malformed purpose.`);
  if (typeof item.required !== "boolean") issues.push(`${prefix} has malformed required flag.`);
  if (typeof item.confirmationStatus !== "string") issues.push(`${prefix} has malformed confirmationStatus.`);
  if (typeof item.sortOrder !== "number" || !Number.isFinite(item.sortOrder)) issues.push(`${prefix} has malformed sortOrder.`);
  issues.push(...initialValueIssues(item.initialValue, prefix));
  return issues;
}

function generationInputsIssues(value: unknown, context: string, requireStateVariables: boolean): string[] {
  if (value === undefined) return requireStateVariables ? [`${context} has malformed generation inputs.`] : [];
  if (!isObject(value)) return [`${context} has malformed generation inputs.`];
  const issues: string[] = [];
  const optionalStringFields = [
    "operation",
    "formulaProperty",
    "sourceScreenId",
    "sourceControlId",
    "destinationScreenId",
    "navigationTransition",
    "navigationTransitionDefaultRule",
    "destinationImplementationName"
  ];
  optionalStringFields.forEach((fieldName) => {
    if (value[fieldName] !== undefined && typeof value[fieldName] !== "string") {
      issues.push(`${context} has malformed generation input ${fieldName}.`);
    }
  });
  if (value.currentFormulaProperties !== undefined) {
    issues.push(...stringArrayIssues(value.currentFormulaProperties, "generation input currentFormulaProperties", context));
  }
  if (value.stateVariables === undefined) {
    if (requireStateVariables) issues.push(`${context} has malformed state-variable generation inputs.`);
    return issues;
  }
  if (!Array.isArray(value.stateVariables)) {
    issues.push(`${context} has malformed state-variable generation inputs.`);
    return issues;
  }
  issues.push(...value.stateVariables.flatMap((item, index) => stateVariableInputIssues(item, index, context)));
  return issues;
}

function assetRuntimeShapeIssues(asset: ImplementationAsset, context = `Asset ${asset.assetId || "[missing]"}`, requireStateVariables = false): string[] {
  const issues: string[] = [];
  if (typeof asset.assetId !== "string" || asset.assetId.trim().length === 0) issues.push(`${context} has a malformed asset ID.`);
  if (typeof asset.projectId !== "string") issues.push(`${context} has malformed projectId.`);
  if (typeof asset.platform !== "string") issues.push(`${context} has malformed platform.`);
  if (typeof asset.assetCategory !== "string") issues.push(`${context} has malformed assetCategory.`);
  if (typeof asset.assetType !== "string") issues.push(`${context} has malformed assetType.`);
  if (typeof asset.targetId !== "string") issues.push(`${context} has malformed targetId.`);
  if (typeof asset.targetDisplayName !== "string") issues.push(`${context} has malformed targetDisplayName.`);
  if (typeof asset.intendedPath !== "string") issues.push(`${context} has malformed intendedPath.`);
  if (typeof asset.sourceContent !== "string") issues.push(`${context} has malformed sourceContent.`);
  if (typeof asset.assetStatus !== "string") issues.push(`${context} has malformed assetStatus.`);
  if (typeof asset.applicabilityStatus !== "string") issues.push(`${context} has malformed applicabilityStatus.`);
  if (typeof asset.required !== "boolean") issues.push(`${context} has malformed required flag.`);
  if (typeof asset.generationTimestamp !== "string") issues.push(`${context} has malformed generationTimestamp.`);
  if (typeof asset.generationVersion !== "string") issues.push(`${context} has malformed generationVersion.`);
  if (typeof asset.contentChecksum !== "string") issues.push(`${context} has malformed contentChecksum.`);
  if (typeof asset.approvalStatus !== "string") issues.push(`${context} has malformed approvalStatus.`);
  if (asset.approvedPropertyName !== undefined && typeof asset.approvedPropertyName !== "string") issues.push(`${context} has malformed approvedPropertyName.`);
  issues.push(...stringArrayIssues(asset.requiredGateIds, "requiredGateIds", context));
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
  issues.push(...generationInputsIssues(asset.generationInputs, context, requireStateVariables));
  return issues;
}

function registryEnvelopeIssues(registry: ImplementationAssetRegistry, project: ProjectRecord): string[] {
  const issues: string[] = [];
  if (!isObject(registry)) return ["Implementation asset registry is malformed."];
  if (registry.projectId !== project.identity.id) issues.push(`Implementation asset registry belongs to project ${registry.projectId || "[missing]"}, not current project ${project.identity.id}.`);
  if (registry.registryVersion !== 1) issues.push(`Implementation asset registry version ${String(registry.registryVersion || "[missing]")} is not supported.`);
  if (registry.generationVersion !== IMPLEMENTATION_ASSET_GENERATION_VERSION) issues.push(`Implementation asset registry generation version ${registry.generationVersion || "[missing]"} is not compatible with ${IMPLEMENTATION_ASSET_GENERATION_VERSION}.`);
  if (!Array.isArray(registry.assets)) {
    issues.push("Implementation asset registry asset list is malformed.");
    return issues;
  }
  registry.assets.forEach((asset, index) => {
    if (!isSafeAssetCandidate(asset)) issues.push(`Implementation asset registry asset entry ${index + 1} is malformed or missing a valid asset ID.`);
  });
  if (issues.some((issue) => issue.includes("asset entry"))) return issues;
  registry.assets.forEach((asset, index) => {
    issues.push(...assetRuntimeShapeIssues(asset, `Implementation asset registry asset entry ${index + 1} (${asset.assetId})`));
  });
  if (issues.some((issue) => issue.includes("Implementation asset registry asset entry"))) return issues;
  const assetIds = registry.assets.map((asset) => asset.assetId).filter(Boolean);
  const duplicateAssetIds = [...new Set(assetIds.filter((id, index) => assetIds.indexOf(id) !== index))].sort();
  issues.push(...duplicateAssetIds.map((id) => `Implementation asset registry has duplicate asset ID ${id}.`));
  return issues;
}

export function generateStatePowerFxForAsset({
  project,
  registry,
  assetId = CANVAS_STATE_INITIALIZATION_ASSET_ID
}: StatePowerFxGenerationContext): StatePowerFxGenerationResult {
  const currentInputs = currentStateInputs(project);
  const envelopeIssues = registryEnvelopeIssues(registry, project);
  if (envelopeIssues.length > 0) {
    return blocked({
      project,
      assetId,
      blockingIssues: envelopeIssues,
      missingDecisions: ["Regenerate the implementation asset registry for the current project before generating App OnStart Power Fx."],
      variables: currentInputs.variables
    });
  }
  const canonicalSourceCount = registry.assets.filter((asset) => asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID).length;

  if (!isCanvasProject(project)) {
    return blocked({
      project,
      assetId,
      status: "Not Applicable",
      blockingIssues: ["State App OnStart Power Fx generation is only applicable to Canvas Power Apps projects in Phase 5B.2B."]
    });
  }

  const hasApplicableStateVariables = currentInputs.variables.length > 0 || currentInputs.blockingIssues.length > 0;
  if (!hasApplicableStateVariables) {
    if (canonicalSourceCount === 0) {
      return blocked({
        project,
        assetId,
        status: "Not Applicable",
        blockingIssues: ["No confirmed scalar state variables are applicable for App OnStart generation."]
      });
    }
    return blocked({
      project,
      assetId,
      blockingIssues: [
        canonicalSourceCount === 1
          ? `Stored state-initialization asset ${CANVAS_STATE_INITIALIZATION_ASSET_ID} is stale because all applicable scalar state variables were removed.`
          : `Implementation asset registry has ${canonicalSourceCount} stale or ambiguous canonical state-initialization source assets after all applicable scalar state variables were removed.`
      ],
      missingDecisions: ["Regenerate the implementation asset registry so the stale App OnStart state-initialization asset is removed."],
      variables: currentInputs.variables
    });
  }
  if (canonicalSourceCount === 0) {
    return blocked({
      project,
      assetId,
      blockingIssues: [`Phase 5B.2A state-initialization planning asset ${CANVAS_STATE_INITIALIZATION_ASSET_ID} does not exist.`],
      missingDecisions: ["Regenerate and approve the current App OnStart state-initialization planning asset."],
      variables: currentInputs.variables
    });
  }
  if (canonicalSourceCount > 1) {
    return blocked({
      project,
      assetId,
      blockingIssues: [`Implementation asset registry has ${canonicalSourceCount} canonical state-initialization source assets; exactly one is required.`],
      missingDecisions: ["Regenerate the implementation asset registry before generating App OnStart Power Fx."],
      variables: currentInputs.variables
    });
  }

  const rawAsset = registry.assets.find((asset) => asset.assetId === assetId);
  if (!rawAsset) {
    return blocked({
      project,
      assetId,
      blockingIssues: [`Phase 5B.2A state-initialization planning asset ${assetId} does not exist.`],
      missingDecisions: ["Regenerate and approve the current App OnStart state-initialization planning asset."]
    });
  }
  const rawAssetShapeIssues = assetRuntimeShapeIssues(rawAsset, `Asset ${rawAsset.assetId}`, true);
  if (rawAssetShapeIssues.length > 0) {
    return blocked({
      project,
      assetId,
      blockingIssues: rawAssetShapeIssues,
      missingDecisions: ["Regenerate the implementation asset registry before generating App OnStart Power Fx."],
      variables: currentInputs.variables
    });
  }
  const canonicalAsset = canonicalCurrentStateAsset(project);
  if (!canonicalAsset) {
    return blocked({
      project,
      asset: rawAsset,
      assetId,
      blockingIssues: ["Current project does not have a canonical App OnStart state-initialization planning asset."],
      missingDecisions: ["Regenerate the current App OnStart state-initialization planning asset."]
    });
  }
  const canonicalAssetShapeIssues = assetRuntimeShapeIssues(canonicalAsset, `Asset ${canonicalAsset.assetId}`, true);
  if (canonicalAssetShapeIssues.length > 0) {
    return blocked({
      project,
      assetId,
      blockingIssues: canonicalAssetShapeIssues,
      missingDecisions: ["Regenerate the current App OnStart state-initialization planning asset."]
    });
  }

  const boundaryIssues = unsupportedAssetBoundaryIssues(rawAsset);
  if (boundaryIssues.length > 0) return blocked({ project, asset: rawAsset, assetId, blockingIssues: boundaryIssues, variables: currentInputs.variables });
  if (rawAsset.projectId !== project.identity.id) {
    return blocked({
      project,
      asset: rawAsset,
      assetId,
      blockingIssues: [`Asset ${assetId} belongs to project ${rawAsset.projectId || "[missing]"}, not current project ${project.identity.id}.`],
      missingDecisions: ["Regenerate and approve the state-initialization planning asset for the current project."],
      variables: currentInputs.variables
    });
  }
  if (!sourceChecksumIsValid(rawAsset)) return blocked({ project, asset: rawAsset, assetId, blockingIssues: [`Asset ${assetId} source checksum is invalid.`], variables: currentInputs.variables });

  const canonicalIssues = canonicalSourceContractIssues(rawAsset, canonicalAsset, project);
  if (canonicalIssues.length > 0) {
    return blocked({
      project,
      asset: canonicalAsset,
      assetId,
      blockingIssues: canonicalIssues,
      missingDecisions: ["Regenerate and explicitly reapprove the canonical current App OnStart state-initialization planning asset."],
      variables: currentInputs.variables
    });
  }

  const rawDependencyBlockingIssues = rawDependencyIssues(rawAsset);
  if (rawDependencyBlockingIssues.length > 0) return blocked({ project, asset: rawAsset, assetId, blockingIssues: rawDependencyBlockingIssues, variables: currentInputs.variables });

  const rawStructuredInputs = rawAsset.generationInputs?.stateVariables ?? [];
  if (stableStringify(rawStructuredInputs) !== stableStringify(currentInputs.variables)) {
    return blocked({
      project,
      asset: rawAsset,
      assetId,
      blockingIssues: [`Asset ${assetId} structured state-variable inputs do not match the current project.`],
      missingDecisions: ["Regenerate and explicitly reapprove the current App OnStart state-initialization planning asset."],
      variables: currentInputs.variables
    });
  }

  const derivedAsset = deriveImplementationAssetRegistryState(project, registry.assets).assets.find((asset) => asset.assetId === assetId) ?? rawAsset;
  const approvedCanonicalAsset = { ...canonicalAsset, approvalStatus: rawAsset.approvalStatus };
  const common = { project, asset: approvedCanonicalAsset, assetId, variables: currentInputs.variables };
  if (derivedAsset.applicabilityStatus === "notApplicable") return blocked({ ...common, status: "Not Applicable", blockingIssues: [`Asset ${assetId} is not applicable.`] });
  if (!derivedAsset.required || derivedAsset.applicabilityStatus !== "required") return blocked({ ...common, blockingIssues: [`Asset ${assetId} is Draft because applicability is not confirmed as required.`] });
  if (rawAsset.contentChecksum !== derivedAsset.contentChecksum || rawAsset.contentChecksum !== canonicalAsset.contentChecksum) {
    return blocked({
      ...common,
      blockingIssues: [`Asset ${assetId} approval is stale against current project state.`],
      missingDecisions: ["Regenerate the state-initialization planning asset and explicitly approve the current checksum."]
    });
  }
  if (currentInputs.blockingIssues.length > 0) return blocked({ ...common, blockingIssues: currentInputs.blockingIssues });
  const recalculatedStatus = evaluateImplementationAssetStatus(approvedCanonicalAsset);
  if (recalculatedStatus === "Blocked" || recalculatedStatus === "Draft" || recalculatedStatus === "Not Applicable") return blocked({ ...common, blockingIssues: [`Asset ${assetId} recalculated status is ${recalculatedStatus}.`, ...derivedAsset.blockingIssues] });
  if (canonicalAsset.gateEvaluationSnapshot.some((gate) => !gate.passed)) {
    return blocked({ ...common, blockingIssues: canonicalAsset.gateEvaluationSnapshot.filter((gate) => !gate.passed).map((gate) => `${gate.label}: ${gate.blockingReason}`) });
  }
  if (canonicalAsset.dependencies.some((dependency) => dependency.required && !dependency.resolved)) {
    return blocked({ ...common, blockingIssues: canonicalAsset.dependencies.filter((dependency) => dependency.required && !dependency.resolved).map((dependency) => dependency.blockingIssue ?? `${dependency.label} is unresolved.`) });
  }
  if (rawAsset.approvalStatus !== "Approved") return blocked({ ...common, status: "Review Required", blockingIssues: [`Asset ${assetId} is not approved.`] });
  if (recalculatedStatus !== "Ready for Export") return blocked({ ...common, status: "Review Required", blockingIssues: [`Asset ${assetId} recalculated status is ${recalculatedStatus}.`, ...derivedAsset.blockingIssues] });

  const formulaResult = formulaForVariables(currentInputs.variables);
  if (formulaResult.issues.length > 0) return blocked({ ...common, blockingIssues: formulaResult.issues });
  const traceability = {
    orderedVariableIds: currentInputs.variables.map((variable) => variable.id),
    orderedImplementationNames: currentInputs.variables.map((variable) => variable.implementationName)
  };
  const generatedChecksum = generatedChecksumFor({
    sourceChecksum: canonicalAsset.contentChecksum,
    formula: formulaResult.formula,
    operation: CANVAS_STATE_INITIALIZATION_OPERATION,
    propertyName: "OnStart",
    intendedPath: CANVAS_STATE_INITIALIZATION_PATH,
    ...traceability
  });

  return baseResult({
    ...common,
    formula: formulaResult.formula,
    generatedChecksum,
    status: "Generated"
  });
}

export function generateStatePowerFxForRegistry(project: ProjectRecord, registry: ImplementationAssetRegistry): StatePowerFxGenerationResult[] {
  const result = generateStatePowerFxForAsset({ project, registry });
  const hasValidAssetList = isObject(registry) && Array.isArray(registry.assets);
  return result.status === "Not Applicable" && hasValidAssetList && !registry.assets.some((asset) => isSafeAssetCandidate(asset) && asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID)
    ? []
    : [result];
}
