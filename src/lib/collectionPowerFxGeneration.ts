import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetStatus,
  IMPLEMENTATION_ASSET_GENERATION_VERSION,
  IMPLEMENTATION_ASSET_STATUSES,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "./implementationAssets";
import { isCanvasProject } from "./powerPlatform";
import {
  CANVAS_COLLECTION_INITIALIZATION_ASSET_ID,
  CANVAS_COLLECTION_INITIALIZATION_OPERATION,
  CANVAS_COLLECTION_INITIALIZATION_PATH,
  CANVAS_COLLECTION_INITIALIZATION_TARGET_ID,
  validateCanvasCollectionTargets,
  type CanvasCollectionGenerationInput
} from "./collectionInitialization";
import type { ProjectRecord } from "../types/project";

export const COLLECTION_POWER_FX_GENERATION_VERSION = "phase-5b.2d";
export type CollectionPowerFxOperation = typeof CANVAS_COLLECTION_INITIALIZATION_OPERATION;
export type CollectionPowerFxGenerationStatus = "Not Applicable" | "Blocked" | "Generated";

export interface CollectionPowerFxTraceability {
  approvedPlanningAssetId: string;
  approvedPlanningChecksum: string;
  orderedCollectionTargetIds: string[];
  orderedCollectionImplementationNames: string[];
  orderedConnectorIds: string[];
  orderedEntityIds: string[];
  orderedSourceImplementationNames: string[];
  intendedFragmentPath: string;
}

export interface CollectionPowerFxGenerationResult {
  assetId: string;
  projectId: string;
  targetId: string;
  operation: CollectionPowerFxOperation;
  propertyName: "OnStart";
  intendedPath: string;
  formula: string;
  status: CollectionPowerFxGenerationStatus;
  sourceChecksum: string;
  generatedChecksum: string;
  orderedCollectionTargetIds: string[];
  orderedCollectionImplementationNames: string[];
  orderedSourceImplementationNames: string[];
  dependencies: string[];
  warnings: string[];
  blockingIssues: string[];
  missingDecisions: string[];
  validationInstructions: string[];
  manualInstallationInstructions: string[];
  generationVersion: string;
  traceability: CollectionPowerFxTraceability;
}

interface CollectionPowerFxGenerationContext {
  project: ProjectRecord;
  registry: unknown;
  assetId?: string;
}

const POWER_FX_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const IMPLEMENTATION_ASSET_STATUS_SET = new Set<string>(IMPLEMENTATION_ASSET_STATUSES);

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

function sortedStrings(values: string[]): string[] {
  return [...values].sort();
}

function sameStableValue(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function sourceChecksumIsValid(asset: ImplementationAsset): boolean {
  return asset.contentChecksum === calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });
}

function dependencyIds(asset: ImplementationAsset | undefined): string[] {
  return asset?.dependencies.map((dependency) => dependency.id).sort() ?? [];
}

function currentCollectionInputs(project: ProjectRecord): {
  targets: CanvasCollectionGenerationInput[];
  blockingIssues: string[];
  missingDecisions: string[];
} {
  const validation = validateCanvasCollectionTargets(project, project.powerPlatform?.canvas?.collectionTargets ?? []);
  return {
    targets: validation.generationInputs,
    blockingIssues: validation.blockingIssues,
    missingDecisions: validation.missingDecisions
  };
}

function canonicalCurrentCollectionAsset(project: ProjectRecord): ImplementationAsset | undefined {
  return buildImplementationAssetRegistry(project, "2026-07-16T00:00:00.000Z").assets.find((asset) => asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID);
}

function traceabilityFor(asset: ImplementationAsset | undefined, targets: CanvasCollectionGenerationInput[]): CollectionPowerFxTraceability {
  return {
    approvedPlanningAssetId: asset?.assetId ?? CANVAS_COLLECTION_INITIALIZATION_ASSET_ID,
    approvedPlanningChecksum: asset?.contentChecksum ?? "",
    orderedCollectionTargetIds: targets.map((target) => target.id),
    orderedCollectionImplementationNames: targets.map((target) => target.implementationName),
    orderedConnectorIds: targets.map((target) => target.sourceConnectorId),
    orderedEntityIds: targets.map((target) => target.sourceEntityId),
    orderedSourceImplementationNames: targets.map((target) => target.sourceImplementationName),
    intendedFragmentPath: asset?.intendedPath ?? CANVAS_COLLECTION_INITIALIZATION_PATH
  };
}

function baseResult(input: {
  project: ProjectRecord;
  asset?: ImplementationAsset;
  assetId: string;
  status: CollectionPowerFxGenerationStatus;
  formula?: string;
  generatedChecksum?: string;
  blockingIssues?: string[];
  missingDecisions?: string[];
  warnings?: string[];
  targets?: CanvasCollectionGenerationInput[];
}): CollectionPowerFxGenerationResult {
  const targets = input.targets ?? (input.asset?.generationInputs?.collectionTargets as CanvasCollectionGenerationInput[] | undefined) ?? [];
  const traceability = traceabilityFor(input.asset, targets);
  return {
    assetId: input.asset?.assetId ?? input.assetId,
    projectId: input.project.identity.id,
    targetId: input.asset?.targetId ?? CANVAS_COLLECTION_INITIALIZATION_TARGET_ID,
    operation: CANVAS_COLLECTION_INITIALIZATION_OPERATION,
    propertyName: "OnStart",
    intendedPath: input.asset?.intendedPath ?? CANVAS_COLLECTION_INITIALIZATION_PATH,
    formula: input.formula ?? "",
    status: input.status,
    sourceChecksum: input.asset?.contentChecksum ?? "",
    generatedChecksum: input.generatedChecksum ?? "",
    orderedCollectionTargetIds: traceability.orderedCollectionTargetIds,
    orderedCollectionImplementationNames: traceability.orderedCollectionImplementationNames,
    orderedSourceImplementationNames: traceability.orderedSourceImplementationNames,
    dependencies: dependencyIds(input.asset),
    warnings: input.warnings ?? [],
    blockingIssues: input.blockingIssues ?? [],
    missingDecisions: input.missingDecisions ?? [],
    validationInstructions: [
      "Validate the generated App OnStart collection-loading fragment in Power Apps Studio before claiming implementation complete.",
      "Confirm each collection loads only the approved small bounded source and does not require filtering, sorting, shaping, or pagination."
    ],
    manualInstallationInstructions: [
      "Open the confirmed Canvas app in Power Apps Studio.",
      "Keep this collection-loading fragment separate from scalar App OnStart fragments until a later approved integration phase.",
      "Do not claim publish, deployment, or production verification from this generated source alone."
    ],
    generationVersion: COLLECTION_POWER_FX_GENERATION_VERSION,
    traceability
  };
}

function blocked(input: Omit<Parameters<typeof baseResult>[0], "status"> & { status?: CollectionPowerFxGenerationStatus }): CollectionPowerFxGenerationResult {
  return baseResult({
    ...input,
    formula: "",
    generatedChecksum: "",
    status: input.status ?? "Blocked"
  });
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
  return ["connectorId", "entityId", "fieldId", "parentConnectorId", "parentEntityId", "targetType"].flatMap((fieldName) =>
    value[fieldName] !== undefined && typeof value[fieldName] !== "string" ? [`${prefix} has malformed relationshipContext.${fieldName}.`] : []
  );
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

function collectionTargetInputIssues(item: unknown, index: number, context: string): string[] {
  if (!isObject(item)) return [`${context} has malformed collection target generation input entry ${index + 1}.`];
  const issues: string[] = [];
  const prefix = `${context} collection target generation input ${index + 1}`;
  [
    "id",
    "implementationName",
    "purpose",
    "sourceConnectorId",
    "sourceEntityId",
    "sourceImplementationName",
    "loadTrigger",
    "loadMode",
    "dataScope",
    "confirmationStatus"
  ].forEach((fieldName) => {
    if (typeof item[fieldName] !== "string") issues.push(`${prefix} has malformed ${fieldName}.`);
  });
  if (typeof item.required !== "boolean") issues.push(`${prefix} has malformed required flag.`);
  if (typeof item.sortOrder !== "number" || !Number.isFinite(item.sortOrder)) issues.push(`${prefix} has malformed sortOrder.`);
  return issues;
}

function generationInputsIssues(value: unknown, context: string, requireCollectionTargets: boolean): string[] {
  if (value === undefined) return requireCollectionTargets ? [`${context} has malformed generation inputs.`] : [];
  if (!isObject(value)) return [`${context} has malformed generation inputs.`];
  const issues: string[] = [];
  ["operation", "formulaProperty"].forEach((fieldName) => {
    if (value[fieldName] !== undefined && typeof value[fieldName] !== "string") {
      issues.push(`${context} has malformed generation input ${fieldName}.`);
    }
  });
  if (value.collectionTargets === undefined) {
    if (requireCollectionTargets) issues.push(`${context} has malformed collection target generation inputs.`);
    return issues;
  }
  if (!Array.isArray(value.collectionTargets)) {
    issues.push(`${context} has malformed collection target generation inputs.`);
    return issues;
  }
  issues.push(...value.collectionTargets.flatMap((item, index) => collectionTargetInputIssues(item, index, context)));
  return issues;
}

function isSafeAssetCandidate(value: unknown): value is ImplementationAsset {
  return isObject(value) && typeof value.assetId === "string" && value.assetId.trim().length > 0;
}

function assetRuntimeShapeIssues(asset: ImplementationAsset, context = `Asset ${asset.assetId || "[missing]"}`, requireCollectionTargets = false): string[] {
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
  if (typeof asset.assetStatus !== "string" || !IMPLEMENTATION_ASSET_STATUS_SET.has(asset.assetStatus)) issues.push(`${context} has malformed assetStatus.`);
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
  issues.push(...generationInputsIssues(asset.generationInputs, context, requireCollectionTargets));
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
    issues.push(...assetRuntimeShapeIssues(asset, `Implementation asset registry asset entry ${index + 1} (${asset.assetId})`, asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID));
  });
  if (issues.some((issue) => issue.includes("Implementation asset registry asset entry"))) return issues;
  const assetIds = assets.map((asset) => asset.assetId).filter(Boolean);
  const duplicateAssetIds = unique(assetIds.filter((id, index) => assetIds.indexOf(id) !== index));
  issues.push(...duplicateAssetIds.map((id) => `Implementation asset registry has duplicate asset ID ${id}.`));
  return issues;
}

function asRegistry(registry: unknown): ImplementationAssetRegistry {
  return registry as ImplementationAssetRegistry;
}

function unsupportedAssetBoundaryIssues(asset: ImplementationAsset): string[] {
  const issues: string[] = [];
  if (asset.assetId !== CANVAS_COLLECTION_INITIALIZATION_ASSET_ID) issues.push(`Asset ${asset.assetId} is not the App OnStart collection-loading planning asset.`);
  if (asset.platform !== "Power Apps Canvas") issues.push(`Asset platform ${asset.platform || "[missing]"} is not Power Apps Canvas.`);
  if (asset.assetCategory !== "Power Fx") issues.push(`Asset category ${asset.assetCategory || "[missing]"} is not Power Fx.`);
  if (asset.assetType !== "powerFxPlan") issues.push(`Asset ${asset.assetId} is ${asset.assetType}, not a Power Fx plan asset.`);
  if (asset.targetId !== CANVAS_COLLECTION_INITIALIZATION_TARGET_ID) issues.push(`Asset target ID ${asset.targetId || "[missing]"} is not the canonical collection-loading target.`);
  if (asset.generationInputs?.operation !== CANVAS_COLLECTION_INITIALIZATION_OPERATION) issues.push(`Operation ${asset.generationInputs?.operation || "[missing]"} is not supported for collection-loading generation.`);
  if (asset.approvedPropertyName !== "OnStart" || asset.generationInputs?.formulaProperty !== "OnStart") issues.push(`Property ${asset.approvedPropertyName || asset.generationInputs?.formulaProperty || "[missing]"} is not supported for collection-loading generation.`);
  if (asset.intendedPath !== CANVAS_COLLECTION_INITIALIZATION_PATH) issues.push(`Asset path ${asset.intendedPath || "[missing]"} is not supported for collection-loading generation.`);
  if (!asset.required) issues.push(`Asset ${asset.assetId} is not marked required.`);
  if (asset.applicabilityStatus !== "required") issues.push(`Asset ${asset.assetId} applicability is ${asset.applicabilityStatus}, not required.`);
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
  if (rawAsset.targetDisplayName !== canonicalAsset.targetDisplayName) issues.push("Asset target display name does not match the canonical App OnStart collection-loading target.");
  if (rawAsset.intendedPath !== canonicalAsset.intendedPath) issues.push(`Asset intended path ${rawAsset.intendedPath || "[missing]"} does not match canonical path ${canonicalAsset.intendedPath}.`);
  if (rawAsset.approvedPropertyName !== canonicalAsset.approvedPropertyName) issues.push(`Approved property ${rawAsset.approvedPropertyName || "[missing]"} does not match canonical property ${canonicalAsset.approvedPropertyName}.`);
  if (rawAsset.generationInputs?.operation !== canonicalAsset.generationInputs?.operation) issues.push(`Operation ${rawAsset.generationInputs?.operation || "[missing]"} does not match canonical operation ${canonicalAsset.generationInputs?.operation}.`);
  if (rawAsset.generationInputs?.formulaProperty !== canonicalAsset.generationInputs?.formulaProperty) issues.push(`Formula property ${rawAsset.generationInputs?.formulaProperty || "[missing]"} does not match canonical property ${canonicalAsset.generationInputs?.formulaProperty}.`);
  if (rawAsset.required !== canonicalAsset.required) issues.push("Asset required flag does not match the canonical collection-loading contract.");
  if (rawAsset.applicabilityStatus !== canonicalAsset.applicabilityStatus) issues.push("Asset applicability does not match the canonical collection-loading contract.");
  if (!sameStableValue(sortedStrings(rawAsset.requiredGateIds), sortedStrings(canonicalAsset.requiredGateIds))) issues.push("Asset required gate IDs do not match the canonical collection-loading gate contract.");
  if (!sameStableValue(rawAsset.gateEvaluationSnapshot, canonicalAsset.gateEvaluationSnapshot)) issues.push("Asset gate snapshot does not match current canonical gate evaluation.");
  if (!sameStableValue(sortedStrings(rawAsset.sourceRecordIds), sortedStrings(canonicalAsset.sourceRecordIds))) issues.push("Asset source record IDs do not match current canonical collection records.");
  if (!sameStableValue(rawAsset.generationInputs?.collectionTargets ?? [], canonicalAsset.generationInputs?.collectionTargets ?? [])) issues.push("Asset structured collection target inputs do not match current canonical collection inputs.");
  if (!sameStableValue(sortedStrings(rawAsset.connectorIds), sortedStrings(canonicalAsset.connectorIds))) issues.push("Asset connector IDs do not match the canonical collection dependency boundary.");
  if (!sameStableValue(sortedStrings(rawAsset.entityIds), sortedStrings(canonicalAsset.entityIds))) issues.push("Asset entity IDs do not match the canonical collection dependency boundary.");
  if (!sameStableValue(sortedStrings(rawAsset.fieldIds), sortedStrings(canonicalAsset.fieldIds))) issues.push("Asset field IDs do not match the canonical collection dependency boundary.");
  if (!sameStableValue(rawAsset.dependencies, canonicalAsset.dependencies)) issues.push("Asset dependencies do not match the canonical collection dependency boundary.");
  if (rawAsset.generationVersion !== canonicalAsset.generationVersion) issues.push(`Asset generation version ${rawAsset.generationVersion || "[missing]"} is not compatible with canonical version ${canonicalAsset.generationVersion}.`);
  if (rawAsset.contentChecksum !== canonicalAsset.contentChecksum) issues.push("Asset approved checksum does not match the current canonical collection-loading checksum.");
  return issues;
}

function rawDependencyIssues(asset: ImplementationAsset): string[] {
  return asset.dependencies
    .filter((dependency) => dependency.required && !dependency.resolved)
    .map((dependency) => dependency.blockingIssue ?? `${dependency.label} is unresolved.`);
}

function formulaForTargets(targets: CanvasCollectionGenerationInput[]): { formula: string; issues: string[] } {
  const issues: string[] = [];
  const statements = targets.map((target) => {
    if (!POWER_FX_IDENTIFIER_PATTERN.test(target.implementationName)) {
      issues.push(`Collection target ${target.id} implementation name is not a simple Power Fx identifier.`);
    }
    if (!POWER_FX_IDENTIFIER_PATTERN.test(target.sourceImplementationName)) {
      issues.push(`Collection target ${target.id} source implementation name is not a simple Power Fx identifier.`);
    }
    if (target.loadTrigger !== "appOnStart") issues.push(`Collection target ${target.id} trigger ${target.loadTrigger} is not supported.`);
    if (target.loadMode !== "replace") issues.push(`Collection target ${target.id} load mode ${target.loadMode} is not supported.`);
    if (target.dataScope !== "confirmedSmallBounded") issues.push(`Collection target ${target.id} data scope ${target.dataScope} is not supported.`);
    return `ClearCollect(${target.implementationName}, ${target.sourceImplementationName})`;
  });
  return {
    formula: issues.length > 0 ? "" : `${statements.join(";\n")}\n`,
    issues: unique(issues)
  };
}

function generatedChecksumFor(input: {
  projectId: string;
  sourceChecksum: string;
  formula: string;
  operation: CollectionPowerFxOperation;
  propertyName: "OnStart";
  intendedPath: string;
  orderedCollectionTargetIds: string[];
  orderedCollectionImplementationNames: string[];
  orderedConnectorIds: string[];
  orderedEntityIds: string[];
  orderedSourceImplementationNames: string[];
}): string {
  return fnv1a(stableStringify({
    generationVersion: COLLECTION_POWER_FX_GENERATION_VERSION,
    approvedPlanningAssetId: CANVAS_COLLECTION_INITIALIZATION_ASSET_ID,
    ...input
  }));
}

export function generateCollectionPowerFxForAsset({
  project,
  registry,
  assetId = CANVAS_COLLECTION_INITIALIZATION_ASSET_ID
}: CollectionPowerFxGenerationContext): CollectionPowerFxGenerationResult {
  const currentInputs = currentCollectionInputs(project);
  const envelopeIssues = registryEnvelopeIssues(registry, project);
  if (envelopeIssues.length > 0) {
    return blocked({
      project,
      assetId,
      blockingIssues: envelopeIssues,
      missingDecisions: ["Regenerate the implementation asset registry for the current project before generating collection-loading Power Fx."],
      targets: currentInputs.targets
    });
  }

  const typedRegistry = asRegistry(registry);
  const canonicalSourceCount = typedRegistry.assets.filter((asset) => asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID).length;

  if (!isCanvasProject(project)) {
    return blocked({
      project,
      assetId,
      blockingIssues: ["Collection-loading Power Fx generation is only supported for Canvas Power Apps projects in Phase 5B.2D."],
      targets: currentInputs.targets
    });
  }

  const currentTargetCount = project.powerPlatform?.canvas?.collectionTargets.length ?? 0;
  if (currentTargetCount === 0) {
    if (canonicalSourceCount === 0) {
      return blocked({
        project,
        assetId,
        status: "Not Applicable",
        blockingIssues: ["No Canvas collection targets are applicable for collection-loading Power Fx generation."]
      });
    }
    return blocked({
      project,
      assetId,
      blockingIssues: [
        canonicalSourceCount === 1
          ? `Stored collection-loading asset ${CANVAS_COLLECTION_INITIALIZATION_ASSET_ID} is stale because all collection targets were removed.`
          : `Implementation asset registry has ${canonicalSourceCount} stale or ambiguous canonical collection-loading source assets after all collection targets were removed.`
      ],
      missingDecisions: ["Regenerate the implementation asset registry so stale collection-loading assets are removed."]
    });
  }

  if (assetId !== CANVAS_COLLECTION_INITIALIZATION_ASSET_ID) {
    return blocked({
      project,
      assetId,
      blockingIssues: [`Asset ${assetId} is not the approved Phase 5B.2C collection-loading planning asset.`],
      targets: currentInputs.targets
    });
  }

  if (canonicalSourceCount === 0) {
    return blocked({
      project,
      assetId,
      blockingIssues: [`Phase 5B.2C collection-loading planning asset ${CANVAS_COLLECTION_INITIALIZATION_ASSET_ID} does not exist.`],
      missingDecisions: ["Regenerate and approve the current App OnStart collection-loading planning asset."],
      targets: currentInputs.targets
    });
  }
  if (canonicalSourceCount > 1) {
    return blocked({
      project,
      assetId,
      blockingIssues: [`Implementation asset registry has ${canonicalSourceCount} canonical collection-loading source assets; exactly one is required.`],
      missingDecisions: ["Regenerate the implementation asset registry before generating collection-loading Power Fx."],
      targets: currentInputs.targets
    });
  }

  const rawAsset = typedRegistry.assets.find((asset) => asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID);
  if (!rawAsset) {
    return blocked({
      project,
      assetId,
      blockingIssues: [`Phase 5B.2C collection-loading planning asset ${assetId} does not exist.`],
      missingDecisions: ["Regenerate and approve the current App OnStart collection-loading planning asset."],
      targets: currentInputs.targets
    });
  }

  const rawAssetShapeIssues = assetRuntimeShapeIssues(rawAsset, `Asset ${rawAsset.assetId}`, true);
  if (rawAssetShapeIssues.length > 0) {
    return blocked({
      project,
      assetId,
      blockingIssues: rawAssetShapeIssues,
      missingDecisions: ["Regenerate the implementation asset registry before generating collection-loading Power Fx."],
      targets: currentInputs.targets
    });
  }

  const canonicalAsset = canonicalCurrentCollectionAsset(project);
  if (!canonicalAsset) {
    return blocked({
      project,
      asset: rawAsset,
      assetId,
      blockingIssues: ["Current project does not have a canonical App OnStart collection-loading planning asset."],
      missingDecisions: ["Regenerate the current App OnStart collection-loading planning asset."],
      targets: currentInputs.targets
    });
  }
  const canonicalAssetShapeIssues = assetRuntimeShapeIssues(canonicalAsset, `Asset ${canonicalAsset.assetId}`, true);
  if (canonicalAssetShapeIssues.length > 0) {
    return blocked({
      project,
      assetId,
      blockingIssues: canonicalAssetShapeIssues,
      missingDecisions: ["Regenerate the current App OnStart collection-loading planning asset."],
      targets: currentInputs.targets
    });
  }

  const boundaryIssues = unsupportedAssetBoundaryIssues(rawAsset);
  if (boundaryIssues.length > 0) return blocked({ project, asset: rawAsset, assetId, blockingIssues: boundaryIssues, targets: currentInputs.targets });
  if (rawAsset.assetStatus !== "Ready for Export") {
    return blocked({
      project,
      asset: rawAsset,
      assetId,
      blockingIssues: [`Asset ${assetId} stored source status is ${rawAsset.assetStatus}; Ready for Export is required before collection-loading Power Fx generation.`],
      missingDecisions: ["Regenerate or restore the collection-loading planning asset through the approved review process before generating Power Fx."],
      targets: currentInputs.targets
    });
  }
  if (!sourceChecksumIsValid(rawAsset)) return blocked({ project, asset: rawAsset, assetId, blockingIssues: [`Asset ${assetId} source checksum is invalid.`], targets: currentInputs.targets });

  const canonicalIssues = canonicalSourceContractIssues(rawAsset, canonicalAsset, project);
  if (canonicalIssues.length > 0) {
    return blocked({
      project,
      asset: canonicalAsset,
      assetId,
      blockingIssues: canonicalIssues,
      missingDecisions: ["Regenerate and explicitly reapprove the canonical current App OnStart collection-loading planning asset."],
      targets: currentInputs.targets
    });
  }

  const rawDependencyBlockingIssues = rawDependencyIssues(rawAsset);
  if (rawDependencyBlockingIssues.length > 0) return blocked({ project, asset: rawAsset, assetId, blockingIssues: rawDependencyBlockingIssues, targets: currentInputs.targets });

  const rawStructuredInputs = rawAsset.generationInputs?.collectionTargets ?? [];
  if (stableStringify(rawStructuredInputs) !== stableStringify(currentInputs.targets)) {
    return blocked({
      project,
      asset: rawAsset,
      assetId,
      blockingIssues: [`Asset ${assetId} structured collection target inputs do not match the current project.`],
      missingDecisions: ["Regenerate and explicitly reapprove the current App OnStart collection-loading planning asset."],
      targets: currentInputs.targets
    });
  }

  const derivedAsset = deriveImplementationAssetRegistryState(project, typedRegistry.assets).assets.find((asset) => asset.assetId === assetId) ?? rawAsset;
  const approvedCanonicalAsset = { ...canonicalAsset, approvalStatus: rawAsset.approvalStatus };
  const common = { project, asset: approvedCanonicalAsset, assetId, targets: currentInputs.targets };
  if (!derivedAsset.required || derivedAsset.applicabilityStatus !== "required") return blocked({ ...common, blockingIssues: [`Asset ${assetId} is Draft because applicability is not confirmed as required.`] });
  if (rawAsset.contentChecksum !== derivedAsset.contentChecksum || rawAsset.contentChecksum !== canonicalAsset.contentChecksum) {
    return blocked({
      ...common,
      blockingIssues: [`Asset ${assetId} approval is stale against current project state.`],
      missingDecisions: ["Regenerate the collection-loading planning asset and explicitly approve the current checksum."]
    });
  }
  if (currentInputs.blockingIssues.length > 0) return blocked({ ...common, blockingIssues: currentInputs.blockingIssues, missingDecisions: currentInputs.missingDecisions });
  if (currentInputs.targets.length === 0) {
    return blocked({
      ...common,
      blockingIssues: ["Current collection targets do not include any confirmed small bounded source eligible for generation."],
      missingDecisions: currentInputs.missingDecisions
    });
  }
  const recalculatedStatus = evaluateImplementationAssetStatus(approvedCanonicalAsset);
  if (recalculatedStatus === "Blocked" || recalculatedStatus === "Draft" || recalculatedStatus === "Not Applicable") return blocked({ ...common, blockingIssues: [`Asset ${assetId} recalculated status is ${recalculatedStatus}.`, ...derivedAsset.blockingIssues] });
  if (canonicalAsset.gateEvaluationSnapshot.some((gate) => !gate.passed)) {
    return blocked({ ...common, blockingIssues: canonicalAsset.gateEvaluationSnapshot.filter((gate) => !gate.passed).map((gate) => `${gate.label}: ${gate.blockingReason}`) });
  }
  if (canonicalAsset.dependencies.some((dependency) => dependency.required && !dependency.resolved)) {
    return blocked({ ...common, blockingIssues: canonicalAsset.dependencies.filter((dependency) => dependency.required && !dependency.resolved).map((dependency) => dependency.blockingIssue ?? `${dependency.label} is unresolved.`) });
  }
  if (rawAsset.approvalStatus !== "Approved") return blocked({ ...common, blockingIssues: [`Asset ${assetId} is not approved.`] });
  if (recalculatedStatus !== "Ready for Export") return blocked({ ...common, blockingIssues: [`Asset ${assetId} recalculated status is ${recalculatedStatus}.`, ...derivedAsset.blockingIssues] });

  const formulaResult = formulaForTargets(currentInputs.targets);
  if (formulaResult.issues.length > 0) return blocked({ ...common, blockingIssues: formulaResult.issues });
  const traceability = traceabilityFor(canonicalAsset, currentInputs.targets);
  const generatedChecksum = generatedChecksumFor({
    projectId: project.identity.id,
    sourceChecksum: canonicalAsset.contentChecksum,
    formula: formulaResult.formula,
    operation: CANVAS_COLLECTION_INITIALIZATION_OPERATION,
    propertyName: "OnStart",
    intendedPath: CANVAS_COLLECTION_INITIALIZATION_PATH,
    orderedCollectionTargetIds: traceability.orderedCollectionTargetIds,
    orderedCollectionImplementationNames: traceability.orderedCollectionImplementationNames,
    orderedConnectorIds: traceability.orderedConnectorIds,
    orderedEntityIds: traceability.orderedEntityIds,
    orderedSourceImplementationNames: traceability.orderedSourceImplementationNames
  });

  return baseResult({
    ...common,
    formula: formulaResult.formula,
    generatedChecksum,
    status: "Generated"
  });
}

export function generateCollectionPowerFxForRegistry(project: ProjectRecord, registry: unknown): CollectionPowerFxGenerationResult[] {
  const result = generateCollectionPowerFxForAsset({ project, registry });
  const hasValidAssetList = isObject(registry) && Array.isArray(registry.assets);
  const assets = hasValidAssetList ? registry.assets as unknown[] : [];
  return result.status === "Not Applicable" && hasValidAssetList && !assets.some((asset) => isSafeAssetCandidate(asset) && asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID)
    ? []
    : [result];
}
