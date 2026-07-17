import { getProjectTypeLabel } from "../data/projectTypes";
import { activeCanvasEntityReferences, reconcileCanvasConnectorSelection } from "./canvasTargetValidation";
import {
  CANVAS_COLLECTION_INITIALIZATION_ASSET_ID,
  CANVAS_COLLECTION_INITIALIZATION_OPERATION,
  CANVAS_COLLECTION_INITIALIZATION_PATH,
  CANVAS_COLLECTION_INITIALIZATION_TARGET_ID,
  validateCanvasCollectionTargets
} from "./collectionInitialization";
import { evaluateGeneratedPackageReadiness } from "./generatedPackageReadiness";
import { evaluatePhaseGate, isPhaseGatePassing, type PhaseGateId, type PhaseGateResult } from "./phaseGates";
import {
  buildCanvasFormOperationPlanningModel,
  canvasFormOperationEntityType,
  CANVAS_FORM_OPERATIONS_ASSET_ID,
  CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY,
  CANVAS_FORM_OPERATIONS_OPERATION,
  CANVAS_FORM_OPERATIONS_PLAN_PATH,
  CANVAS_FORM_OPERATIONS_TARGET_DISPLAY_NAME,
  CANVAS_FORM_OPERATIONS_TARGET_ID,
  type CanvasFormOperationGenerationInput
} from "./formOperationPlanning";
import { isCanvasProject, isModelDrivenProject } from "./powerPlatform";
import {
  CANVAS_STATE_INITIALIZATION_ASSET_ID,
  CANVAS_STATE_INITIALIZATION_OPERATION,
  CANVAS_STATE_INITIALIZATION_PATH,
  CANVAS_STATE_INITIALIZATION_TARGET_ID,
  canvasStateVariableGenerationInputs,
  validateCanvasStateVariables
} from "./stateInitialization";
import type {
  CanvasComponentTarget,
  CanvasControlTarget,
  CanvasScreenTarget,
  CanvasStateInitialValue,
  DataverseColumnSchema,
  DataverseTableSchema,
  PowerPlatformGateStatus,
  ProjectRecord
} from "../types/project";

export const IMPLEMENTATION_ASSET_GENERATION_VERSION = "phase-5a.2";
export const IMPLEMENTATION_ASSET_MANIFEST_JSON_PATH = "07_Development/IMPLEMENTATION_ASSET_MANIFEST.json";
export const IMPLEMENTATION_ASSET_MANIFEST_MARKDOWN_PATH = "07_Development/IMPLEMENTATION_ASSET_MANIFEST.md";

export const IMPLEMENTATION_ASSET_STATUSES = [
  "Not Applicable",
  "Blocked",
  "Draft",
  "Review Required",
  "Ready for Export",
  "Exported"
] as const;

export type ImplementationAssetStatus = (typeof IMPLEMENTATION_ASSET_STATUSES)[number];
export type ImplementationAssetPlatform = "Power Apps Canvas" | "Power Apps model-driven" | "Power Platform" | "Not Applicable";
export type ImplementationAssetApplicabilityStatus = "required" | "notApplicable" | "undecided";
export type ImplementationAssetApprovalStatus = "Not reviewed" | "Review required" | "Approved";
export type ImplementationAssetPackageStatus = "Not Applicable" | "Draft" | "Review Required" | "Ready for Export";
export type EffectiveImplementationReadiness = ImplementationAssetPackageStatus;
export type ImplementationAssetCategory =
  | "Asset plan"
  | "Power Fx"
  | "Canvas YAML"
  | "Model-driven specification"
  | "Automation specification"
  | "Configuration"
  | "Installation"
  | "Validation"
  | "Codex prompt";

export type ImplementationAssetType =
  | "powerFxPlan"
  | "canvasYamlPlan"
  | "modelDrivenSpecification"
  | "automationSpecification"
  | "installationGuide"
  | "validationChecklist"
  | "assetManifest";

export interface ImplementationAssetRelationshipContext {
  connectorId?: string;
  entityId?: string;
  fieldId?: string;
  parentConnectorId?: string;
  parentEntityId?: string;
  targetType?: "canvasScreen" | "canvasControl" | "canvasComponent" | "sharePointList" | "sharePointLibrary" | "dataverseTable" | "connectorResource" | "modelDrivenTable" | "modelDrivenColumn";
}

export interface ImplementationAssetDependency {
  id: string;
  type: "asset" | "connector" | "entity" | "field" | "screen" | "control" | "component" | "gate" | "environmentVariable" | "connectionReference";
  label: string;
  targetAssetId?: string;
  targetRecordId?: string;
  required: boolean;
  resolved: boolean;
  resolutionReason: string;
  blockingIssue?: string;
  sourceSection: string;
  relationshipContext?: ImplementationAssetRelationshipContext;
}

export interface ImplementationAssetGateSnapshot {
  gateId: PhaseGateId;
  label: string;
  status: PowerPlatformGateStatus;
  blockingReason: string;
  sourceSection: string;
  passed: boolean;
}

export interface ImplementationAssetGenerationInputs {
  operation?: string;
  formulaProperty?: string;
  currentFormulaProperties?: string[];
  sourceScreenId?: string;
  sourceControlId?: string;
  destinationScreenId?: string;
  navigationTransition?: string;
  navigationTransitionDefaultRule?: string;
  destinationImplementationName?: string;
  stateVariables?: Array<{
    id: string;
    implementationName: string;
    purpose: string;
    initialValue: CanvasStateInitialValue;
    required: boolean;
    confirmationStatus: string;
    sortOrder: number;
  }>;
  collectionTargets?: Array<{
    id: string;
    implementationName: string;
    purpose: string;
    sourceConnectorId: string;
    sourceEntityId: string;
    sourceImplementationName: string;
    loadTrigger: string;
    loadMode: string;
    dataScope: string;
    required: boolean;
    confirmationStatus: string;
    sortOrder: number;
  }>;
  formOperationTargets?: CanvasFormOperationGenerationInput[];
}

export interface ImplementationAsset {
  assetId: string;
  projectId: string;
  platform: ImplementationAssetPlatform;
  assetCategory: ImplementationAssetCategory;
  assetType: ImplementationAssetType;
  targetId: string;
  targetDisplayName: string;
  intendedPath: string;
  sourceContent: string;
  assetStatus: ImplementationAssetStatus;
  applicabilityStatus: ImplementationAssetApplicabilityStatus;
  required: boolean;
  requiredGateIds: PhaseGateId[];
  gateEvaluationSnapshot: ImplementationAssetGateSnapshot[];
  sourceRecordIds: string[];
  connectorIds: string[];
  entityIds: string[];
  fieldIds: string[];
  dependencies: ImplementationAssetDependency[];
  generationInputs?: ImplementationAssetGenerationInputs;
  generationTimestamp: string;
  generationVersion: string;
  contentChecksum: string;
  manualInstallationRequirements: string[];
  validationRequirements: string[];
  knownLimitations: string[];
  blockingIssues: string[];
  approvalStatus: ImplementationAssetApprovalStatus;
  approvedPropertyName?: string;
}

export interface ImplementationAssetRegistrySummary {
  applicableAssetCount: number;
  readyAssetCount: number;
  reviewRequiredAssetCount: number;
  blockedAssetCount: number;
  draftAssetCount: number;
  notApplicableAssetCount: number;
  requiredAssetCount: number;
  optionalAssetCount: number;
  assetPackageStatus: ImplementationAssetPackageStatus;
  effectiveImplementationReadiness: EffectiveImplementationReadiness;
  nextBlockedAsset: string;
  nextRequiredAction: string;
}

export interface ImplementationAssetGraphEvaluation {
  issues: string[];
  dependencyIssues: string[];
  circularDependencyIssues: string[];
  duplicateAssetIds: string[];
  duplicatePaths: string[];
  duplicateDependencyIssues: string[];
  missingAssetDependencyIssues: string[];
  unresolvedRecordDependencyIssues: string[];
  selfDependencyIssues: string[];
  generationOrder: string[];
  installationOrder: string[];
}

export interface ImplementationAssetDependencyEvaluation {
  assets: ImplementationAsset[];
  dependencyIssues: string[];
}

export interface ImplementationAssetRegistryState {
  assets: ImplementationAsset[];
  graph: ImplementationAssetGraphEvaluation;
  summary: ImplementationAssetRegistrySummary;
  packageReadiness: "Draft" | "Ready for Codex";
  assetPackageStatus: ImplementationAssetPackageStatus;
  effectiveImplementationReadiness: EffectiveImplementationReadiness;
}

export interface ImplementationAssetRegistry {
  registryVersion: 1;
  projectId: string;
  projectName: string;
  projectType: string;
  generatedAt: string;
  generationVersion: string;
  packageReadiness: "Draft" | "Ready for Codex";
  assetPackageStatus: ImplementationAssetPackageStatus;
  effectiveImplementationReadiness: EffectiveImplementationReadiness;
  assets: ImplementationAsset[];
  dependencyIssues: string[];
  circularDependencyIssues: string[];
  generationOrder: string[];
  installationOrder: string[];
  summary: ImplementationAssetRegistrySummary;
}

export interface ImplementationAssetManifest {
  packageVersion: 1;
  projectId: string;
  projectName: string;
  projectType: string;
  projectPackageReadiness: "Draft" | "Ready for Codex";
  assetPackageStatus: ImplementationAssetPackageStatus;
  effectiveImplementationReadiness: EffectiveImplementationReadiness;
  assetCount: number;
  readyAssetCount: number;
  blockedAssetCount: number;
  reviewRequiredAssetCount: number;
  draftAssetCount: number;
  notApplicableAssetCount: number;
  requiredAssetCount: number;
  optionalAssetCount: number;
  dependencyIssues: string[];
  circularDependencyIssues: string[];
  generationOrder: string[];
  installationOrder: string[];
  assetPaths: string[];
  assets: Array<{
    assetId: string;
    assetCategory: ImplementationAssetCategory;
    assetType: ImplementationAssetType;
    status: ImplementationAssetStatus;
    approvalStatus: ImplementationAssetApprovalStatus;
    targetId: string;
    targetDisplayName: string;
    intendedPath: string;
    dependencies: ImplementationAssetDependency[];
    gateSnapshots: ImplementationAssetGateSnapshot[];
    checksum: string;
    manualInstallationRequirements: string[];
    validationRequirements: string[];
  }>;
  generationTimestamp: string;
  generatorVersion: string;
}

type AssetDraft = Omit<ImplementationAsset, "sourceContent" | "contentChecksum" | "assetStatus">;

const PLACEHOLDER_PROPERTY_PATTERN = /^(not applicable|none|n\/a|no formula|no formula required|not decided|unknown|pending|tbd|to be determined|missing|no approved property|placeholder)$/i;
const COMPATIBLE_GENERATION_VERSIONS = new Set([IMPLEMENTATION_ASSET_GENERATION_VERSION]);

function hasText(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasMeaningfulText(value: string | undefined | null): boolean {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  return !/^(not applicable|none|n\/a|not decided|unknown|pending|tbd|to be determined|missing|placeholder)$/i.test(value.trim());
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isApprovalStatus(value: unknown): value is ImplementationAssetApprovalStatus {
  return value === "Not reviewed" || value === "Review required" || value === "Approved";
}

function safeSegment(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || fallback;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function uniqueInInputOrder(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function parseFormulaProperties(value: string): string[] {
  const seen = new Set<string>();
  const properties: string[] = [];
  for (const raw of value.split(/[\r\n,;]+/)) {
    const property = raw.trim();
    if (!property || PLACEHOLDER_PROPERTY_PATTERN.test(property)) continue;
    if (seen.has(property)) continue;
    seen.add(property);
    properties.push(property);
  }
  return properties;
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

function sortedDependencies(dependencies: ImplementationAssetDependency[]): ImplementationAssetDependency[] {
  return [...dependencies].sort((a, b) =>
    `${a.id}:${a.type}:${a.targetAssetId ?? ""}:${a.targetRecordId ?? ""}`.localeCompare(`${b.id}:${b.type}:${b.targetAssetId ?? ""}:${b.targetRecordId ?? ""}`)
  );
}

function sortedGateSnapshots(gates: ImplementationAssetGateSnapshot[]): ImplementationAssetGateSnapshot[] {
  return [...gates].sort((a, b) => a.gateId.localeCompare(b.gateId));
}

export function createCanonicalAssetPayload(asset: ImplementationAsset): string {
  return stableStringify({
    assetId: asset.assetId,
    projectId: asset.projectId,
    platform: asset.platform,
    assetCategory: asset.assetCategory,
    assetType: asset.assetType,
    targetId: asset.targetId,
    targetDisplayName: asset.targetDisplayName,
    intendedPath: asset.intendedPath,
    sourceContent: asset.sourceContent,
    applicabilityStatus: asset.applicabilityStatus,
    required: asset.required,
    requiredGateIds: [...asset.requiredGateIds].sort(),
    gateEvaluationSnapshot: sortedGateSnapshots(asset.gateEvaluationSnapshot).map((gate) => ({
      gateId: gate.gateId,
      status: gate.status,
      blockingReason: gate.blockingReason,
      sourceSection: gate.sourceSection
    })),
    sourceRecordIds: unique(asset.sourceRecordIds),
    connectorIds: unique(asset.connectorIds),
    entityIds: unique(asset.entityIds),
    fieldIds: unique(asset.fieldIds),
    dependencies: sortedDependencies(asset.dependencies).map((dependencyItem) => ({
      id: dependencyItem.id,
      type: dependencyItem.type,
      targetAssetId: dependencyItem.targetAssetId ?? "",
      targetRecordId: dependencyItem.targetRecordId ?? "",
      relationshipContext: stableSortObject(dependencyItem.relationshipContext ?? {}),
      required: dependencyItem.required,
      resolved: dependencyItem.resolved,
      resolutionReason: dependencyItem.resolutionReason,
      blockingIssue: dependencyItem.blockingIssue ?? "",
      sourceSection: dependencyItem.sourceSection
    })),
    generationInputs: stableSortObject(asset.generationInputs ?? {}),
    manualInstallationRequirements: asset.manualInstallationRequirements.map((item) => item.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
    validationRequirements: asset.validationRequirements.map((item) => item.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
    knownLimitations: asset.knownLimitations.map((item) => item.replace(/\r\n/g, "\n").replace(/\r/g, "\n")),
    blockingIssues: unique(asset.blockingIssues),
    generationVersion: asset.generationVersion,
    approvedPropertyName: asset.approvedPropertyName ?? ""
  });
}

export function calculateImplementationAssetChecksum(asset: ImplementationAsset): string {
  return fnv1a(createCanonicalAssetPayload(asset));
}

function snapshotGate(project: ProjectRecord, gateId: PhaseGateId): ImplementationAssetGateSnapshot {
  const gate = evaluatePhaseGate(project, gateId);
  return {
    gateId: gate.id,
    label: gate.label,
    status: gate.status,
    blockingReason: gate.blockingReason,
    sourceSection: gate.sourceSection,
    passed: isPhaseGatePassing(gate)
  };
}

function snapshotGates(project: ProjectRecord, gateIds: PhaseGateId[]): ImplementationAssetGateSnapshot[] {
  return gateIds.map((gateId) => snapshotGate(project, gateId));
}

function blockingGateIssues(gates: ImplementationAssetGateSnapshot[]): string[] {
  return gates
    .filter((gate) => !gate.passed)
    .map((gate) => `${gate.label}: ${gate.blockingReason}`);
}

function dependency(input: {
  id: string;
  type: ImplementationAssetDependency["type"];
  label: string;
  targetRecordId?: string;
  targetAssetId?: string;
  relationshipContext?: ImplementationAssetRelationshipContext;
  resolved: boolean;
  resolutionReason: string;
  blockingIssue: string;
  sourceSection: string;
}): ImplementationAssetDependency {
  return {
    id: input.id,
    type: input.type,
    label: input.label,
    targetRecordId: input.targetRecordId,
    targetAssetId: input.targetAssetId,
    required: true,
    resolved: input.resolved,
    resolutionReason: input.resolutionReason,
    blockingIssue: input.resolved ? undefined : input.blockingIssue,
    sourceSection: input.sourceSection,
    relationshipContext: input.relationshipContext
  };
}

function assetDependency(asset: ImplementationAsset): ImplementationAssetDependency {
  const ready = evaluateImplementationAssetStatus(asset) === "Ready for Export" && asset.contentChecksum === calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });
  return dependency({
    id: `asset:${asset.assetId}`,
    type: "asset",
    label: asset.targetDisplayName,
    targetAssetId: asset.assetId,
    resolved: ready,
    resolutionReason: ready ? `Required asset is approved, checksum-valid, and ready for export (${asset.contentChecksum}).` : `Required asset recalculated status is ${evaluateImplementationAssetStatus(asset)}.`,
    blockingIssue: `Required asset ${asset.assetId} is ${evaluateImplementationAssetStatus(asset)}.`,
    sourceSection: "Installation"
  });
}

const FORMULA_LIKE_TOKEN_PATTERN = /\b(SubmitForm|NewForm|EditForm|ResetForm|ViewForm|Patch|Defaults|Set|UpdateContext|Navigate|Notify|IfError|Errors|Refresh|Remove|RemoveIf|ClearCollect|Collect|Clear)\s*\(/;
const SIMPLE_POWER_FX_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function isSafeReadableIdentifier(value: string): boolean {
  return SIMPLE_POWER_FX_IDENTIFIER_PATTERN.test(value) && !FORMULA_LIKE_TOKEN_PATTERN.test(value);
}

function safeReadableIdentifier(value: string, fallback: string): string {
  return isSafeReadableIdentifier(value) ? value : fallback;
}

function sourceContentFor(asset: Pick<ImplementationAsset, "assetId" | "assetCategory" | "assetType" | "targetDisplayName" | "approvedPropertyName" | "blockingIssues" | "generationInputs">): string {
  const stateVariableLines = (asset.generationInputs?.stateVariables ?? []).map((variable, index) =>
    `- State variable ${index + 1}: ${variable.id} / ${variable.implementationName} / ${variable.initialValue.kind} value stored structurally / required ${variable.required} / ${variable.confirmationStatus} / sort ${variable.sortOrder}`
  );
  const isCollectionPlan = asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID;
  const isFormOperationPlan = asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID;
  const collectionTargetLines = (asset.generationInputs?.collectionTargets ?? []).map((target, index) =>
    isCollectionPlan
      ? `- Collection target ${index + 1}: collection and source identifiers stored structurally / ${target.loadTrigger} / ${target.loadMode} / ${target.dataScope} / required ${target.required} / confirmation stored structurally / sort ${target.sortOrder}`
      : `- Collection target ${index + 1}: collection name ${target.implementationName} / source identifiers stored structurally / ${target.loadTrigger} / ${target.loadMode} / ${target.dataScope} / required ${target.required} / ${target.confirmationStatus} / sort ${target.sortOrder}`
  );
  const formOperationTargetLines = (asset.generationInputs?.formOperationTargets ?? []).map((target, index) => {
    if (isFormOperationPlan && asset.blockingIssues.length > 0) {
      return `- Form operation target ${index + 1}: ${target.operation} / implementation identifiers stored structurally / ${target.formulaProperty} / required ${target.required} / confirmation ${target.confirmationStatus} / sort ${target.sortOrder}`;
    }
    return `- Form operation target ${index + 1}: ${target.operation} / form ${safeReadableIdentifier(target.formControlImplementationName, "form identifier stored structurally")} / submit button ${safeReadableIdentifier(target.submitControlImplementationName, "submit-button identifier stored structurally")} / entity ${safeReadableIdentifier(target.sourceImplementationName, "entity identifier stored structurally")} / ${target.formulaProperty} / required ${target.required} / confirmation ${target.confirmationStatus} / sort ${target.sortOrder}`;
  });
  const blockingIssueLines = isCollectionPlan || isFormOperationPlan
    ? (asset.blockingIssues.length > 0
        ? [`- ${asset.blockingIssues.length} ${isFormOperationPlan ? "form-operation planning" : "collection planning"} issues are stored structurally. Review the asset blockingIssues field.`]
        : ["- None."])
    : (asset.blockingIssues.length > 0 ? asset.blockingIssues.map((issue) => `- ${issue}`) : ["- None."]);
  const generationInputs = asset.generationInputs
    ? [
        "",
        "Approved source-generation inputs:",
        asset.generationInputs.operation ? `- Operation: ${asset.generationInputs.operation}` : "",
        asset.generationInputs.formulaProperty ? `- Formula property: ${asset.generationInputs.formulaProperty}` : "",
        asset.generationInputs.currentFormulaProperties ? `- Current control formula properties: ${asset.generationInputs.currentFormulaProperties.join(", ") || "None"}` : "",
        asset.generationInputs.sourceScreenId ? `- Source screen ID: ${asset.generationInputs.sourceScreenId}` : "",
        asset.generationInputs.sourceControlId ? `- Source control ID: ${asset.generationInputs.sourceControlId}` : "",
        asset.generationInputs.destinationScreenId ? `- Destination screen ID: ${asset.generationInputs.destinationScreenId}` : "",
        asset.generationInputs.navigationTransition ? `- Navigation transition: ${asset.generationInputs.navigationTransition}` : "",
        asset.generationInputs.navigationTransitionDefaultRule ? `- Navigation transition default rule: ${asset.generationInputs.navigationTransitionDefaultRule}` : "",
        asset.generationInputs.destinationImplementationName ? `- Destination implementation name: ${asset.generationInputs.destinationImplementationName}` : "",
        asset.generationInputs.stateVariables ? "- State initialization plan: formula generation is deferred to Phase 5B.2B." : "",
        asset.generationInputs.collectionTargets ? "- Collection loading plan: executable collection generation is deferred to Phase 5B.2D." : "",
        asset.generationInputs.formOperationTargets ? "- Form operation plan: executable form-submission generation is deferred to Phase 5B.3C." : "",
        ...stateVariableLines,
        ...collectionTargetLines,
        ...formOperationTargetLines
      ].filter((line) => line !== "")
    : [];
  return [
    `# ${asset.targetDisplayName}`,
    "",
    `Asset ID: ${asset.assetId}`,
    `Asset category: ${asset.assetCategory}`,
    `Asset type: ${asset.assetType}`,
    asset.approvedPropertyName ? `Approved formula property: ${asset.approvedPropertyName}` : "",
    "",
    "Phase 5A registry output only. This record evaluates readiness, dependencies, manifest metadata, and manual boundaries.",
    "Implementation source generation is intentionally deferred to the approved Phase 5B-5E stages.",
    ...generationInputs,
    "",
    "Installation status: Not installed.",
    "Studio testing status: Not tested in Power Apps Studio.",
    "Publishing status: Not published.",
    "Deployment status: Not deployed.",
    "",
    "Blocking issues:",
    blockingIssueLines.join("\n")
  ].filter((line) => line !== "").join("\n");
}

function canvasNavigationGenerationInputs(project: ProjectRecord, target: CanvasControlTarget, property: string): ImplementationAssetGenerationInputs {
  const destination = project.powerPlatform?.canvas?.screenTargets.find((screen) => screen.id === target.navigationDestinationScreenId);
  return {
    operation: target.operation.trim(),
    formulaProperty: property,
    currentFormulaProperties: parseFormulaProperties(target.formulaProperties),
    sourceScreenId: target.screenId,
    sourceControlId: target.id,
    destinationScreenId: target.navigationDestinationScreenId,
    navigationTransition: target.navigationTransition,
    navigationTransitionDefaultRule: target.navigationTransitionDefaultRule,
    destinationImplementationName: destination?.confirmationStatus === "confirmed" ? destination.approvedScreenName.trim() : ""
  };
}

export function evaluateImplementationAssetStatus(asset: ImplementationAsset): ImplementationAssetStatus {
  if (asset.applicabilityStatus === "notApplicable") return "Not Applicable";
  if (asset.applicabilityStatus === "undecided") return "Draft";
  if (asset.blockingIssues.length > 0) return "Blocked";
  if (asset.gateEvaluationSnapshot.some((gate) => !gate.passed)) return "Blocked";
  if (asset.dependencies.some((item) => item.required && !item.resolved)) return "Blocked";
  if (asset.approvalStatus !== "Approved") return "Review Required";
  return "Ready for Export";
}

function finalizeAsset(input: Omit<AssetDraft, "blockingIssues"> & { blockingIssues?: string[] }): ImplementationAsset {
  const draft = {
    ...input,
    blockingIssues: unique(input.blockingIssues ?? [])
  };
  const sourceContent = sourceContentFor(draft);
  const withoutChecksum: ImplementationAsset = {
    ...draft,
    sourceContent,
    assetStatus: "Draft",
    contentChecksum: ""
  };
  const withStatus = {
    ...withoutChecksum,
    assetStatus: evaluateImplementationAssetStatus(withoutChecksum),
  };
  return {
    ...withStatus,
    contentChecksum: calculateImplementationAssetChecksum(withStatus)
  };
}

function confirmedCanvasScreen(project: ProjectRecord, screenId: string): CanvasScreenTarget | undefined {
  return project.powerPlatform?.canvas?.screenTargets.find((screen) => screen.id === screenId && screen.confirmationStatus === "confirmed");
}

function confirmedCanvasControl(project: ProjectRecord, controlId: string): CanvasControlTarget | undefined {
  return project.powerPlatform?.canvas?.controlTargets.find((control) => control.id === controlId && control.confirmationStatus === "confirmed");
}

function normalizeCanvasControlType(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isConfirmedEditableFormControlForInput(control: CanvasControlTarget | undefined, input: CanvasFormOperationGenerationInput): boolean {
  return Boolean(
    control
    && control.screenId === input.screenId
    && control.approvedControlName.trim() === input.formControlImplementationName
    && isSafeReadableIdentifier(control.approvedControlName.trim())
    && ["form", "editform", "edit form"].includes(normalizeCanvasControlType(control.controlType))
  );
}

function isConfirmedSubmitButtonControlForInput(control: CanvasControlTarget | undefined, input: CanvasFormOperationGenerationInput): boolean {
  return Boolean(
    control
    && control.screenId === input.screenId
    && control.approvedControlName.trim() === input.submitControlImplementationName
    && isSafeReadableIdentifier(control.approvedControlName.trim())
    && normalizeCanvasControlType(control.controlType) === "button"
  );
}

function confirmedCanvasComponent(project: ProjectRecord, componentId: string): CanvasComponentTarget | undefined {
  return project.powerPlatform?.canvas?.componentTargets.find((component) => component.id === componentId && component.confirmationStatus === "confirmed");
}

function canvasFieldBelongsToEntity(project: ProjectRecord, connectorId: string, entityId: string, fieldId: string): boolean {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return false;
  const entity = activeCanvasEntityReferences(project).get(entityId);
  if (!entity) return false;
  if (entity.connectorId !== connectorId) return false;
  if (entity.entityType === "sharePointList" || entity.entityType === "sharePointLibrary") {
    return canvas.sharePointColumnSchemas.some((field) => field.id === fieldId && field.parentId === entityId && field.confirmationStatus === "confirmed");
  }
  if (entity.entityType === "dataverseTable") {
    return canvas.dataverseColumnSchemas.some((field) => field.id === fieldId && field.tableId === entityId && field.confirmationStatus === "confirmed");
  }
  return canvas.connectorFieldSchemas.some((field) =>
    field.id === fieldId
    && field.connectorId === connectorId
    && field.resourceId === entityId
    && field.confirmationStatus === "confirmed"
  );
}

function canvasEntityMatchesContext(project: ProjectRecord, recordId: string, context?: ImplementationAssetRelationshipContext): boolean {
  const entity = activeCanvasEntityReferences(project).get(recordId);
  if (!entity) return false;
  if (context?.connectorId && entity.connectorId !== context.connectorId) return false;
  if (context?.parentConnectorId && entity.connectorId !== context.parentConnectorId) return false;
  if (context?.entityId && entity.entityId !== context.entityId) return false;
  if (context?.targetType && ["sharePointList", "sharePointLibrary", "dataverseTable", "connectorResource"].includes(context.targetType) && entity.entityType !== context.targetType) return false;
  return true;
}

function canvasFieldMatchesContext(project: ProjectRecord, fieldId: string, context?: ImplementationAssetRelationshipContext): boolean {
  if (!context?.parentConnectorId || !context.parentEntityId) return false;
  const entity = activeCanvasEntityReferences(project).get(context.parentEntityId);
  if (!entity || entity.connectorId !== context.parentConnectorId) return false;
  if (context.targetType && ["sharePointList", "sharePointLibrary", "dataverseTable", "connectorResource"].includes(context.targetType) && entity.entityType !== context.targetType) return false;
  if (context.fieldId && context.fieldId !== fieldId) return false;
  return canvasFieldBelongsToEntity(project, context.parentConnectorId, context.parentEntityId, fieldId);
}

function connectorQualityIssues(project: ProjectRecord, connectorId: string, sourceSection: string): string[] {
  const connector = project.powerPlatform?.common.connectors.find((item) => item.id === connectorId);
  const issues: string[] = [];
  if (!hasMeaningfulText(connectorId)) return [`${sourceSection}: connector ID is missing.`];
  if (!connector) return [`${sourceSection}: connector ${connectorId} is missing.`];
  if (!hasMeaningfulText(connector.id)) issues.push(`${sourceSection}: connector ${connectorId} has no valid connector ID.`);
  if (isCanvasProject(project)) {
    const activeConnectorIds = new Set(reconcileCanvasConnectorSelection(project).activeConnectorIds);
    if (!activeConnectorIds.has(connectorId)) issues.push(`${sourceSection}: connector ${connectorId} is inactive for the current Canvas backend selection.`);
    if (connector.canvasRole !== "primary" && connector.canvasRole !== "secondary") issues.push(`${sourceSection}: connector ${connectorId} has no required Canvas role.`);
  }
  if (connector.connectorClassification === "unknown" || connector.classificationConfirmationStatus !== "confirmed") issues.push(`${sourceSection}: connector ${connectorId} classification is unconfirmed.`);
  if (!hasMeaningfulText(connector.licenceRequirement) || connector.licensingConfirmationStatus !== "confirmed") issues.push(`${sourceSection}: connector ${connectorId} licensing is unconfirmed.`);
  if (connector.approvalConfirmationStatus !== "confirmed") issues.push(`${sourceSection}: connector ${connectorId} approval is unconfirmed.`);
  if (!hasMeaningfulText(connector.authenticationMethod)) issues.push(`${sourceSection}: connector ${connectorId} authentication is missing.`);
  if (!hasMeaningfulText(connector.connectionOwner) || !hasMeaningfulText(connector.connectionOwnerRole) || connector.connectionOwnershipStatus !== "confirmed") issues.push(`${sourceSection}: connector ${connectorId} ownership is unconfirmed.`);
  if (connector.permissionConfirmationStatus && connector.permissionConfirmationStatus !== "confirmed") issues.push(`${sourceSection}: connector ${connectorId} permission requirements are unconfirmed.`);
  if (hasMeaningfulText(connector.requiredConnectorPermissions) && (!hasMeaningfulText(connector.permissionOwner) || !hasMeaningfulText(connector.permissionValidationMethod))) issues.push(`${sourceSection}: connector ${connectorId} permission owner or validation method is missing.`);
  return issues;
}

function connectorDependency(project: ProjectRecord, connectorId: string, sourceSection: string): ImplementationAssetDependency {
  const issues = connectorQualityIssues(project, connectorId, sourceSection);
  return dependency({
    id: `connector:${connectorId || "missing"}`,
    type: "connector",
    label: `Approved connector ${connectorId || "[missing]"}`,
    targetRecordId: connectorId,
    relationshipContext: { connectorId },
    resolved: issues.length === 0,
    resolutionReason: issues.length === 0 ? "Connector exists, applies to the asset, and all required connector quality confirmations are complete." : issues.join(" "),
    blockingIssue: issues[0] ?? `Connector ${connectorId || "[missing]"} is unresolved.`,
    sourceSection
  });
}

function connectorEntityFieldDependencies(project: ProjectRecord, target: CanvasControlTarget): {
  dependencies: ImplementationAssetDependency[];
  connectorIds: string[];
  entityIds: string[];
  fieldIds: string[];
} {
  const activeEntities = activeCanvasEntityReferences(project);
  const entity = activeEntities.get(target.entityId);
  const screen = confirmedCanvasScreen(project, target.screenId);
  const control = confirmedCanvasControl(project, target.id);
  const entityResolved = hasText(target.entityId) && Boolean(entity) && entity?.connectorId === target.connectorId;
  const dependencies = [
    dependency({
      id: `screen:${target.screenId || "missing"}`,
      type: "screen",
      label: "Confirmed screen target",
      targetRecordId: target.screenId,
      resolved: Boolean(screen),
      resolutionReason: screen ? "Screen target exists and is confirmed." : "Screen target is missing, unknown, or unconfirmed.",
      blockingIssue: `Screen target ${target.screenId || "[missing]"} is missing, unknown, or unconfirmed.`,
      sourceSection: "Canvas implementation targets"
    }),
    dependency({
      id: `control:${target.id || "missing"}`,
      type: "control",
      label: "Confirmed control target",
      targetRecordId: target.id,
      resolved: Boolean(control),
      resolutionReason: control ? "Control target exists and is confirmed." : "Control target is missing, unknown, or unconfirmed.",
      blockingIssue: `Control target ${target.id || "[missing]"} is missing, unknown, or unconfirmed.`,
      sourceSection: "Canvas implementation targets"
    }),
    connectorDependency(project, target.connectorId, "Power Platform connectors"),
    dependency({
      id: `entity:${target.entityId || "missing"}`,
      type: "entity",
      label: "Active entity reference",
      targetRecordId: target.entityId,
      relationshipContext: {
        connectorId: target.connectorId,
        entityId: target.entityId,
        parentConnectorId: target.connectorId,
        targetType: entity?.entityType
      },
      resolved: entityResolved,
      resolutionReason: entityResolved ? "Entity exists, is confirmed, and belongs to the selected connector." : "Entity is missing, inactive, unconfirmed, or does not belong to the selected connector.",
      blockingIssue: `Entity ${target.entityId || "[missing]"} is missing, inactive, unconfirmed, or does not belong to connector ${target.connectorId || "[missing]"}.`,
      sourceSection: "Data model"
    }),
    ...target.requiredFieldIds.map((fieldId) => dependency({
      id: `field:${fieldId || "missing"}`,
      type: "field" as const,
      label: `Confirmed field ${fieldId || "[missing]"}`,
      targetRecordId: fieldId,
      relationshipContext: {
        connectorId: target.connectorId,
        entityId: target.entityId,
        fieldId,
        parentConnectorId: target.connectorId,
        parentEntityId: target.entityId,
        targetType: entity?.entityType
      },
      resolved: canvasFieldBelongsToEntity(project, target.connectorId, target.entityId, fieldId),
      resolutionReason: canvasFieldBelongsToEntity(project, target.connectorId, target.entityId, fieldId)
        ? "Field exists, is confirmed, and belongs to the selected entity."
        : "Field is missing, unconfirmed, or does not belong to the selected entity.",
      blockingIssue: `Field ${fieldId || "[missing]"} is missing, unconfirmed, or does not belong to entity ${target.entityId || "[missing]"}.`,
      sourceSection: "Data model"
    }))
  ];
  return {
    dependencies,
    connectorIds: unique([target.connectorId]),
    entityIds: unique([target.entityId]),
    fieldIds: unique(target.requiredFieldIds)
  };
}

function canvasPowerFxAssets(project: ProjectRecord, target: CanvasControlTarget, now: string): ImplementationAsset[] {
  const properties = parseFormulaProperties(target.formulaProperties);
  if (target.formulaOutputDecision.status !== "required" || properties.length === 0) return [];
  const gateIds: PhaseGateId[] = ["formulaTargets", "connectorSelection", "schema", "namingStandards", "delegation", "security", "accessibility"];
  const gateEvaluationSnapshot = snapshotGates(project, gateIds);
  const gateIssues = blockingGateIssues(gateEvaluationSnapshot);
  const dependencyInfo = connectorEntityFieldDependencies(project, target);
  const dependencyIssues = dependencyInfo.dependencies.flatMap((item) => item.resolved ? [] : [item.blockingIssue ?? `${item.label} is unresolved.`]);
  const displayName = target.approvedControlName || target.id;
  return properties.map((property) => {
    const propertySegment = safeSegment(property, "formula");
    return finalizeAsset({
      assetId: `asset-canvas-powerfx-${safeSegment(target.id, "control")}-${propertySegment}`,
      projectId: project.identity.id,
      platform: "Power Apps Canvas",
      assetCategory: "Power Fx",
      assetType: "powerFxPlan",
      targetId: target.id,
      targetDisplayName: `${displayName}.${property}`,
      intendedPath: `07_Development/PowerFx/${safeSegment(target.screenId, "screen")}/${safeSegment(target.id, "control")}/${propertySegment}.fx`,
      applicabilityStatus: "required",
      required: true,
      requiredGateIds: gateIds,
      gateEvaluationSnapshot,
      sourceRecordIds: unique([target.id, target.screenId]),
      connectorIds: dependencyInfo.connectorIds,
      entityIds: dependencyInfo.entityIds,
      fieldIds: dependencyInfo.fieldIds,
      dependencies: dependencyInfo.dependencies,
      generationInputs: canvasNavigationGenerationInputs(project, target, property),
      generationTimestamp: now,
      generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
      manualInstallationRequirements: [
        "Manual Power Apps Studio update required.",
        "Do not claim installation until an implementer applies this asset in the real app."
      ],
      validationRequirements: [
        "Validate formula behavior in Power Apps Studio.",
        "Validate connector permissions, delegation behavior, error handling, and accessibility impact."
      ],
      knownLimitations: ["Phase 5A does not generate executable Power Fx source."],
      blockingIssues: [...gateIssues, ...dependencyIssues],
      approvalStatus: "Review required",
      approvedPropertyName: property
    });
  });
}

function canvasStateInitializationAsset(project: ProjectRecord, now: string): ImplementationAsset[] {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas || canvas.stateVariableTargets.length === 0) return [];
  const validation = validateCanvasStateVariables(canvas.stateVariableTargets);
  if (validation.includedVariables.length === 0 && validation.blockingIssues.length === 0) return [];
  const gateIds: PhaseGateId[] = ["namingStandards"];
  const gateEvaluationSnapshot = snapshotGates(project, gateIds);
  const gateIssues = blockingGateIssues(gateEvaluationSnapshot);
  const stateVariables = canvasStateVariableGenerationInputs(validation.includedVariables);
  return [finalizeAsset({
    assetId: CANVAS_STATE_INITIALIZATION_ASSET_ID,
    projectId: project.identity.id,
    platform: "Power Apps Canvas",
    assetCategory: "Power Fx",
    assetType: "powerFxPlan",
    targetId: CANVAS_STATE_INITIALIZATION_TARGET_ID,
    targetDisplayName: "App OnStart state initialization plan",
    intendedPath: CANVAS_STATE_INITIALIZATION_PATH,
    applicabilityStatus: "required",
    required: true,
    requiredGateIds: gateIds,
    gateEvaluationSnapshot,
    sourceRecordIds: validation.variables.map((variable) => variable.id),
    connectorIds: [],
    entityIds: [],
    fieldIds: [],
    dependencies: [],
    generationInputs: {
      operation: CANVAS_STATE_INITIALIZATION_OPERATION,
      formulaProperty: "OnStart",
      stateVariables
    },
    generationTimestamp: now,
    generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
    manualInstallationRequirements: [
      "Manual Power Apps Studio App OnStart update required in a later approved phase.",
      "Do not claim installation until an implementer applies future generated source in the real app."
    ],
    validationRequirements: [
      "Validate future App OnStart state initialization in Power Apps Studio.",
      "Confirm variable names and scalar initial values before executable formula generation."
    ],
    knownLimitations: [
      "Phase 5B.2A creates a planning asset only.",
      "Executable App OnStart formula generation is deferred to Phase 5B.2B."
    ],
    blockingIssues: [...gateIssues, ...validation.blockingIssues],
    approvalStatus: "Review required",
    approvedPropertyName: "OnStart"
  })];
}

function canvasCollectionInitializationAsset(project: ProjectRecord, now: string): ImplementationAsset[] {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas || canvas.collectionTargets.length === 0) return [];
  const validation = validateCanvasCollectionTargets(project, canvas.collectionTargets);
  if (validation.includedTargets.length === 0 && validation.blockingIssues.length === 0) return [];
  const gateIds: PhaseGateId[] = ["connectorSelection", "schema", "namingStandards", "delegation"];
  const gateEvaluationSnapshot = snapshotGates(project, gateIds);
  const gateIssues = blockingGateIssues(gateEvaluationSnapshot);
  const dependencies = [
    ...validation.sourceConnectorIds.map((connectorId) => connectorDependency(project, connectorId, "Canvas collection loading")),
    ...validation.sourceEntityIds.map((entityId) => {
      const entity = activeCanvasEntityReferences(project).get(entityId);
      return dependency({
        id: `entity:${entityId || "missing"}`,
        type: "entity",
        label: `Confirmed collection source entity ${entityId || "[missing]"}`,
        targetRecordId: entityId,
        relationshipContext: {
          connectorId: entity?.connectorId,
          entityId,
          targetType: entity?.entityType
        },
        resolved: Boolean(entity),
        resolutionReason: entity ? "Collection source entity exists, is confirmed, and belongs to the selected connector." : "Collection source entity is missing, unconfirmed, inactive, or belongs to another connector.",
        blockingIssue: `Collection source entity ${entityId || "[missing]"} is missing, unconfirmed, inactive, or belongs to another connector.`,
        sourceSection: "Canvas collection loading"
      });
    })
  ];
  const dependencyIssues = dependencies.flatMap((item) => item.resolved ? [] : [item.blockingIssue ?? `${item.label} is unresolved.`]);
  return [finalizeAsset({
    assetId: CANVAS_COLLECTION_INITIALIZATION_ASSET_ID,
    projectId: project.identity.id,
    platform: "Power Apps Canvas",
    assetCategory: "Power Fx",
    assetType: "powerFxPlan",
    targetId: CANVAS_COLLECTION_INITIALIZATION_TARGET_ID,
    targetDisplayName: "App OnStart collection loading plan",
    intendedPath: CANVAS_COLLECTION_INITIALIZATION_PATH,
    applicabilityStatus: "required",
    required: true,
    requiredGateIds: gateIds,
    gateEvaluationSnapshot,
    sourceRecordIds: validation.targets.map((target) => target.id),
    connectorIds: validation.sourceConnectorIds,
    entityIds: validation.sourceEntityIds,
    fieldIds: [],
    dependencies,
    generationInputs: {
      operation: CANVAS_COLLECTION_INITIALIZATION_OPERATION,
      formulaProperty: "OnStart",
      collectionTargets: validation.generationInputs
    },
    generationTimestamp: now,
    generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
    manualInstallationRequirements: [
      "Manual Power Apps Studio App OnStart collection-loading update required in a later approved phase.",
      "Do not claim installation until an implementer applies future generated source in the real app."
    ],
    validationRequirements: [
      "Validate future App OnStart collection loading in Power Apps Studio.",
      "Confirm each collection source is small, bounded, and safe to load as a complete replacement."
    ],
    knownLimitations: [
      "Phase 5B.2C creates a planning asset only.",
      "Executable collection-loading formula generation is deferred to Phase 5B.2D.",
      ...validation.missingDecisions
    ],
    blockingIssues: [...gateIssues, ...validation.blockingIssues, ...dependencyIssues],
    approvalStatus: "Review required",
    approvedPropertyName: "OnStart"
  })];
}

const CANVAS_FORM_OPERATION_GATE_IDS: PhaseGateId[] = [
  "screenTargets",
  "controlTargets",
  "connectorSelection",
  "schema",
  "namingStandards",
  "connectorPermissions",
  "dataSourcePermissions",
  "security",
  "accessibility"
];

function formOperationDependencies(project: ProjectRecord, inputs: CanvasFormOperationGenerationInput[]): ImplementationAssetDependency[] {
  return inputs.flatMap((input) => {
    const screen = confirmedCanvasScreen(project, input.screenId);
    const formControl = confirmedCanvasControl(project, input.formControlId);
    const submitControl = confirmedCanvasControl(project, input.submitControlId);
    const entityType = canvasFormOperationEntityType(project, input.sourceEntityId);
    const screenResolved = Boolean(
      screen
      && screen.id === input.screenId
      && screen.approvedScreenName.trim() === input.screenImplementationName
      && isSafeReadableIdentifier(screen.approvedScreenName.trim())
    );
    const formControlResolved = isConfirmedEditableFormControlForInput(formControl, input);
    const submitControlResolved = isConfirmedSubmitButtonControlForInput(submitControl, input);
    const entityContext = {
      connectorId: input.sourceConnectorId,
      entityId: input.sourceEntityId,
      parentConnectorId: input.sourceConnectorId,
      targetType: entityType
    };
    const entityResolved = Boolean(
      entityType
      && isSafeReadableIdentifier(input.sourceImplementationName)
      && canvasEntityMatchesContext(project, input.sourceEntityId, entityContext)
    );
    return [
      dependency({
        id: `form-operation:${input.id}:screen:${input.screenId || "missing"}`,
        type: "screen",
        label: "Confirmed form-operation screen",
        targetRecordId: input.screenId,
        relationshipContext: { targetType: "canvasScreen" },
        resolved: screenResolved,
        resolutionReason: screenResolved ? "Screen exists, is confirmed, has the expected current implementation name, and uses a valid simple identifier." : "Screen is missing, unconfirmed, renamed, or has an invalid implementation name.",
        blockingIssue: `Form-operation screen ${input.screenId || "[missing]"} is missing, unconfirmed, renamed, or has an invalid implementation name.`,
        sourceSection: "Canvas form operations"
      }),
      dependency({
        id: `form-operation:${input.id}:control:form:${input.formControlId || "missing"}`,
        type: "control",
        label: "Confirmed editable form control",
        targetRecordId: input.formControlId,
        relationshipContext: {
          targetType: "canvasControl",
          parentEntityId: input.screenId
        },
        resolved: formControlResolved,
        resolutionReason: formControlResolved ? "Editable form control exists, is confirmed, remains on the expected screen, has the expected current implementation name, and uses an accepted editable form type." : "Editable form control is missing, unconfirmed, moved, renamed, has an invalid implementation name, or is not an editable form control.",
        blockingIssue: `Form control ${input.formControlId || "[missing]"} is missing, unconfirmed, moved, renamed, invalid, or no longer an editable form control.`,
        sourceSection: "Canvas form operations"
      }),
      dependency({
        id: `form-operation:${input.id}:control:submit:${input.submitControlId || "missing"}`,
        type: "control",
        label: "Confirmed submit button control",
        targetRecordId: input.submitControlId,
        relationshipContext: {
          targetType: "canvasControl",
          parentEntityId: input.screenId
        },
        resolved: submitControlResolved,
        resolutionReason: submitControlResolved ? "Submit button exists, is confirmed, remains on the expected screen, has the expected current implementation name, and uses the button control type." : "Submit button is missing, unconfirmed, moved, renamed, has an invalid implementation name, or is not a button.",
        blockingIssue: `Submit control ${input.submitControlId || "[missing]"} is missing, unconfirmed, moved, renamed, invalid, or no longer a button.`,
        sourceSection: "Canvas form operations"
      }),
      { ...connectorDependency(project, input.sourceConnectorId, "Canvas form operations"), id: `form-operation:${input.id}:connector:${input.sourceConnectorId || "missing"}` },
      dependency({
        id: `form-operation:${input.id}:entity:${input.sourceEntityId || "missing"}`,
        type: "entity",
        label: "Confirmed form-operation entity",
        targetRecordId: input.sourceEntityId,
        relationshipContext: entityContext,
        resolved: entityResolved,
        resolutionReason: entityResolved ? "Entity exists, is active, confirmed, belongs to the expected connector, and uses a valid simple implementation identifier." : "Entity is missing, inactive, unconfirmed, belongs to another connector, or has an invalid implementation identifier.",
        blockingIssue: `Form-operation entity ${input.sourceEntityId || "[missing]"} is missing, inactive, unconfirmed, belongs to another connector, or has an invalid implementation identifier.`,
        sourceSection: "Canvas form operations"
      }),
      ...input.requiredFieldIds.map((fieldId) => dependency({
        id: `form-operation:${input.id}:field:${fieldId || "missing"}`,
        type: "field" as const,
        label: `Confirmed form-operation required field ${fieldId || "[missing]"}`,
        targetRecordId: fieldId,
        relationshipContext: {
          connectorId: input.sourceConnectorId,
          entityId: input.sourceEntityId,
          fieldId,
          parentConnectorId: input.sourceConnectorId,
          parentEntityId: input.sourceEntityId,
          targetType: entityType
        },
        resolved: canvasFieldMatchesContext(project, fieldId, {
          connectorId: input.sourceConnectorId,
          entityId: input.sourceEntityId,
          fieldId,
          parentConnectorId: input.sourceConnectorId,
          parentEntityId: input.sourceEntityId,
          targetType: entityType
        }),
        resolutionReason: canvasFieldMatchesContext(project, fieldId, {
          connectorId: input.sourceConnectorId,
          entityId: input.sourceEntityId,
          fieldId,
          parentConnectorId: input.sourceConnectorId,
          parentEntityId: input.sourceEntityId,
          targetType: entityType
        }) ? "Required field exists, is confirmed, and belongs to the selected entity." : "Required field is missing, unconfirmed, stale, or belongs to another entity.",
        blockingIssue: `Required field ${fieldId || "[missing]"} is missing, unconfirmed, stale, or belongs to entity ${input.sourceEntityId || "[missing]"}.`,
        sourceSection: "Canvas form operations"
      }))
    ];
  });
}

function canvasFormOperationPlanningAsset(project: ProjectRecord, now: string): ImplementationAsset[] {
  const model = buildCanvasFormOperationPlanningModel(project);
  if (!model) return [];
  const gateEvaluationSnapshot = snapshotGates(project, CANVAS_FORM_OPERATION_GATE_IDS);
  const gateIssues = blockingGateIssues(gateEvaluationSnapshot);
  const dependencies = formOperationDependencies(project, model.generationInputs);
  const dependencyIssues = dependencies.flatMap((item) => item.resolved ? [] : [item.blockingIssue ?? `${item.label} is unresolved.`]);
  return [finalizeAsset({
    assetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
    projectId: project.identity.id,
    platform: "Power Apps Canvas",
    assetCategory: "Power Fx",
    assetType: "powerFxPlan",
    targetId: CANVAS_FORM_OPERATIONS_TARGET_ID,
    targetDisplayName: CANVAS_FORM_OPERATIONS_TARGET_DISPLAY_NAME,
    intendedPath: CANVAS_FORM_OPERATIONS_PLAN_PATH,
    applicabilityStatus: "required",
    required: model.required,
    requiredGateIds: CANVAS_FORM_OPERATION_GATE_IDS,
    gateEvaluationSnapshot,
    sourceRecordIds: model.sourceRecordIds,
    connectorIds: model.connectorIds,
    entityIds: model.entityIds,
    fieldIds: model.fieldIds,
    dependencies,
    generationInputs: {
      operation: CANVAS_FORM_OPERATIONS_OPERATION,
      formulaProperty: CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY,
      formOperationTargets: model.generationInputs
    },
    generationTimestamp: now,
    generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
    manualInstallationRequirements: [
      "Manual Power Apps Studio submit-button OnSelect update required in a later approved phase.",
      "Do not claim installation until an implementer applies future generated source in the real app."
    ],
    validationRequirements: [
      "Validate future form submission behavior in Power Apps Studio.",
      "Confirm form mode initiation, selected record behavior, success behavior, failure behavior, reset behavior, and notifications before executable formula generation."
    ],
    knownLimitations: [
      "Phase 5B.3B creates a planning asset only.",
      "Executable form-submission formula generation is deferred to Phase 5B.3C.",
      "Record selection, navigation, NewForm/EditForm initiation, success, failure, reset, notification, and custom field mapping behavior are not modeled in this phase.",
      ...model.missingDecisions
    ],
    blockingIssues: [...gateIssues, ...model.blockingIssues, ...dependencyIssues],
    approvalStatus: "Review required",
    approvedPropertyName: CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY
  })];
}

function yamlAssetPath(targetKind: "screen" | "control" | "component", targetId: string, outputType: string): string {
  const extension = outputType.toLowerCase().includes("pa.yaml") ? "pa.yaml" : "yaml";
  return `07_Development/Canvas_YAML/${targetKind}-${safeSegment(targetId, targetKind)}.${extension}`;
}

function yamlParentDependency(project: ProjectRecord, target: CanvasScreenTarget | CanvasControlTarget | CanvasComponentTarget): ImplementationAssetDependency {
  const parentType = target.yamlParentType;
  if (parentType === "app" || parentType === "none") {
    return dependency({
      id: `parent:${parentType}`,
      type: "screen",
      label: "YAML parent",
      resolved: true,
      resolutionReason: `Parent type ${parentType} does not require a structured parent record.`,
      blockingIssue: "YAML parent is unresolved.",
      sourceSection: "Canvas YAML"
    });
  }
  const parentId = target.yamlParentId;
  const resolved = parentType === "screen"
    ? Boolean(confirmedCanvasScreen(project, parentId))
    : parentType === "control"
      ? Boolean(confirmedCanvasControl(project, parentId))
      : parentType === "component"
        ? Boolean(confirmedCanvasComponent(project, parentId))
        : false;
  return dependency({
    id: `parent:${parentType || "missing"}:${parentId || "missing"}`,
    type: parentType === "control" ? "control" : parentType === "component" ? "component" : "screen",
    label: "Confirmed YAML parent",
    targetRecordId: parentId,
    resolved,
    resolutionReason: resolved ? "YAML parent exists and is confirmed." : "YAML parent is missing, unknown, unconfirmed, or the parent type does not match.",
    blockingIssue: `YAML parent ${parentType || "[missing]"}/${parentId || "[missing]"} is missing, unknown, unconfirmed, or mismatched.`,
    sourceSection: "Canvas YAML"
  });
}

function componentUsageDependencies(project: ProjectRecord, component: CanvasComponentTarget): ImplementationAssetDependency[] {
  return component.usageTargets.map((usage) => {
    const resolved = usage.confirmationStatus === "confirmed" && (
      usage.targetType === "screen"
        ? Boolean(confirmedCanvasScreen(project, usage.targetId))
        : Boolean(confirmedCanvasControl(project, usage.targetId))
    );
    return dependency({
      id: `component-usage:${usage.id || "missing"}`,
      type: usage.targetType === "control" ? "control" : "screen",
      label: `Component usage ${usage.id || "[missing]"}`,
      targetRecordId: usage.targetId,
      resolved,
      resolutionReason: resolved ? "Component usage target exists and is confirmed." : "Component usage target is missing, unconfirmed, or invalid.",
      blockingIssue: `Component usage target ${usage.id || "[missing]"} is missing, unconfirmed, or invalid.`,
      sourceSection: "Canvas components"
    });
  });
}

function canvasYamlAsset(
  project: ProjectRecord,
  target: CanvasScreenTarget | CanvasControlTarget | CanvasComponentTarget,
  targetKind: "screen" | "control" | "component",
  now: string,
  formulaAssets: ImplementationAsset[] = []
): ImplementationAsset {
  const gateIds: PhaseGateId[] = ["yamlTargets", "namingStandards", "accessibility"];
  const gateEvaluationSnapshot = snapshotGates(project, gateIds);
  const targetDependency = dependency({
    id: `${targetKind}:${target.id || "missing"}`,
    type: targetKind,
    label: `Confirmed ${targetKind} target`,
    targetRecordId: target.id,
    resolved: target.confirmationStatus === "confirmed",
    resolutionReason: target.confirmationStatus === "confirmed" ? "YAML target exists and is confirmed." : "YAML target is unconfirmed.",
    blockingIssue: `YAML target ${target.id || "[missing]"} is unconfirmed.`,
    sourceSection: "Canvas YAML"
  });
  const formulaDependencies = formulaAssets.map((asset) => dependency({
    id: `asset:${asset.assetId}`,
    type: "asset",
    label: `Formula plan ${asset.approvedPropertyName ?? asset.assetId}`,
    targetAssetId: asset.assetId,
    resolved: false,
    resolutionReason: `Formula asset readiness must be recalculated from current asset state (${asset.contentChecksum}).`,
    blockingIssue: `Formula asset ${asset.assetId} is not ready for export.`,
    sourceSection: "Canvas YAML"
  }));
  const usageDependencies = targetKind === "component" ? componentUsageDependencies(project, target as CanvasComponentTarget) : [];
  const dependencies = [targetDependency, yamlParentDependency(project, target), ...formulaDependencies, ...usageDependencies];
  const dependencyIssues = dependencies.flatMap((item) => item.resolved ? [] : [item.blockingIssue ?? `${item.label} is unresolved.`]);
  const gateIssues = blockingGateIssues(gateEvaluationSnapshot);
  const displayName = "approvedScreenName" in target
    ? target.approvedScreenName || target.displayName || target.id
    : "approvedControlName" in target
      ? target.approvedControlName || target.id
      : target.approvedComponentName || target.id;
  return finalizeAsset({
    assetId: `asset-canvas-yaml-${targetKind}-${safeSegment(target.id, targetKind)}`,
    projectId: project.identity.id,
    platform: "Power Apps Canvas",
    assetCategory: "Canvas YAML",
    assetType: "canvasYamlPlan",
    targetId: target.id,
    targetDisplayName: displayName,
    intendedPath: yamlAssetPath(targetKind, target.id, target.yamlOutputType),
    applicabilityStatus: target.yamlOutputDecision.status,
    required: target.yamlOutputDecision.status === "required",
    requiredGateIds: gateIds,
    gateEvaluationSnapshot,
    sourceRecordIds: uniqueInInputOrder([target.id, target.yamlParentId]),
    connectorIds: [],
    entityIds: [],
    fieldIds: [],
    dependencies,
    generationTimestamp: now,
    generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
    manualInstallationRequirements: [
      target.yamlInstallationLocation || "Manual Canvas YAML placement must be confirmed before implementation.",
      "Do not claim import or installation until the YAML is applied in the real app."
    ],
    validationRequirements: [
      target.yamlValidationResponsibility || "A named reviewer must validate YAML placement and behavior."
    ],
    knownLimitations: ["Phase 5A does not generate Canvas YAML source."],
    blockingIssues: [...gateIssues, ...dependencyIssues],
    approvalStatus: "Review required"
  });
}

function modelTables(project: ProjectRecord): DataverseTableSchema[] {
  return project.powerPlatform?.modelDriven?.dataverseTableSchemas ?? [];
}

function modelColumns(project: ProjectRecord): DataverseColumnSchema[] {
  return project.powerPlatform?.modelDriven?.dataverseColumnSchemas ?? [];
}

function tableDependency(project: ProjectRecord, tableId: string, sourceSection = "Dataverse schema"): ImplementationAssetDependency {
  const table = modelTables(project).find((candidate) => candidate.id === tableId && candidate.confirmationStatus === "confirmed");
  return dependency({
    id: `entity:${tableId || "missing"}`,
    type: "entity",
    label: `Dataverse table ${tableId || "[missing]"}`,
    targetRecordId: tableId,
    resolved: Boolean(table),
    resolutionReason: table ? "Dataverse table exists and is confirmed." : "Dataverse table is missing or unconfirmed.",
    blockingIssue: `Dataverse table ${tableId || "[missing]"} is missing or unconfirmed.`,
    sourceSection
  });
}

function idsReferencedInText(text: string, ids: string[]): string[] {
  const normalized = ` ${text} `;
  return ids.filter((id) => hasMeaningfulText(id) && new RegExp(`(^|[^a-zA-Z0-9_-])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-zA-Z0-9_-]|$)`).test(normalized));
}

function structuredReferenceDependency(sourceSection: string): ImplementationAssetDependency {
  return dependency({
    id: `structured-reference:${safeSegment(sourceSection, "section")}`,
    type: "entity",
    label: `${sourceSection} structured references`,
    targetRecordId: "",
    resolved: false,
    resolutionReason: "Structured table, column, connector, role, or page references are missing.",
    blockingIssue: `${sourceSection} uses free-text requirements without structured implementation references.`,
    sourceSection
  });
}

function modelReferencesForText(project: ProjectRecord, text: string, sourceSection: string): {
  tableIds: string[];
  fieldIds: string[];
  dependencies: ImplementationAssetDependency[];
} {
  const tableIds = idsReferencedInText(text, modelTables(project).map((table) => table.id));
  const fieldIds = idsReferencedInText(text, modelColumns(project).map((column) => column.id));
  const fieldTableIds = modelColumns(project).filter((column) => fieldIds.includes(column.id)).map((column) => column.tableId);
  const referencedTableIds = unique([...tableIds, ...fieldTableIds]);
  if (referencedTableIds.length === 0 && fieldIds.length === 0) {
    return { tableIds: [], fieldIds: [], dependencies: [structuredReferenceDependency(sourceSection)] };
  }
  return {
    tableIds: referencedTableIds,
    fieldIds,
    dependencies: [
      ...referencedTableIds.map((tableId) => tableDependency(project, tableId, sourceSection)),
      ...modelColumns(project)
        .filter((column) => fieldIds.includes(column.id))
        .map((column) => dependency({
          id: `field:${column.id}`,
          type: "field",
          label: `Dataverse column ${column.displayName || column.logicalName || column.id}`,
          targetRecordId: column.id,
          resolved: column.confirmationStatus === "confirmed",
          resolutionReason: column.confirmationStatus === "confirmed" ? "Dataverse column exists and is confirmed." : "Dataverse column is unconfirmed.",
          blockingIssue: `Dataverse column ${column.id} is unconfirmed.`,
          sourceSection
        }))
    ]
  };
}

function modelDrivenSpecAsset(input: {
  project: ProjectRecord;
  targetId: string;
  targetDisplayName: string;
  assetTypeLabel: string;
  gateIds: PhaseGateId[];
  now: string;
  sourceRecordIds?: string[];
  entityIds?: string[];
  fieldIds?: string[];
  connectorIds?: string[];
  dependencies?: ImplementationAssetDependency[];
  category?: ImplementationAssetCategory;
  type?: ImplementationAssetType;
}): ImplementationAsset {
  const gateEvaluationSnapshot = snapshotGates(input.project, input.gateIds);
  const gateIssues = blockingGateIssues(gateEvaluationSnapshot);
  const dependencyIssues = (input.dependencies ?? []).flatMap((item) => item.resolved ? [] : [item.blockingIssue ?? `${item.label} is unresolved.`]);
  const targetSegment = safeSegment(input.targetId, "model-driven-target");
  return finalizeAsset({
    assetId: `asset-model-driven-${safeSegment(input.assetTypeLabel, "spec")}-${targetSegment}`,
    projectId: input.project.identity.id,
    platform: "Power Apps model-driven",
    assetCategory: input.category ?? "Model-driven specification",
    assetType: input.type ?? "modelDrivenSpecification",
    targetId: input.targetId,
    targetDisplayName: input.targetDisplayName,
    intendedPath: `07_Development/Model_Driven/${safeSegment(input.assetTypeLabel, "specification")}/${targetSegment}.md`,
    applicabilityStatus: "required",
    required: true,
    requiredGateIds: input.gateIds,
    gateEvaluationSnapshot,
    sourceRecordIds: unique(input.sourceRecordIds ?? [input.targetId]),
    connectorIds: unique(input.connectorIds ?? []),
    entityIds: unique(input.entityIds ?? []),
    fieldIds: unique(input.fieldIds ?? []),
    dependencies: input.dependencies ?? [],
    generationTimestamp: input.now,
    generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
    manualInstallationRequirements: [
      "Manual model-driven configuration required.",
      "Do not fabricate solution XML or claim import/publish completion."
    ],
    validationRequirements: [
      "Validate against the real Dataverse solution and Solution Checker or approved equivalent evidence."
    ],
    knownLimitations: ["Phase 5A generates specification registry records only."],
    blockingIssues: [...gateIssues, ...dependencyIssues],
    approvalStatus: "Review required"
  });
}

function canvasAssets(project: ProjectRecord, now: string): ImplementationAsset[] {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return [];
  const stateAssets = canvasStateInitializationAsset(project, now);
  const collectionAssets = canvasCollectionInitializationAsset(project, now);
  const formOperationAssets = canvasFormOperationPlanningAsset(project, now);
  const formulaAssets = canvas.controlTargets.flatMap((target) => canvasPowerFxAssets(project, target, now));
  const formulaAssetsByControlId = formulaAssets.reduce((map, asset) => {
    const existing = map.get(asset.targetId) ?? [];
    map.set(asset.targetId, [...existing, asset]);
    return map;
  }, new Map<string, ImplementationAsset[]>());
  const yamlScreenAssets = canvas.screenTargets
    .filter((target) => target.yamlOutputDecision.status === "required")
    .map((target) => canvasYamlAsset(project, target, "screen", now));
  const yamlControlAssets = canvas.controlTargets
    .filter((target) => target.yamlOutputDecision.status === "required")
    .map((target) => canvasYamlAsset(project, target, "control", now, formulaAssetsByControlId.get(target.id) ?? []));
  const yamlComponentAssets = canvas.componentTargets
    .filter((target) => target.yamlOutputDecision.status === "required")
    .map((target) => canvasYamlAsset(project, target, "component", now));
  return [
    ...stateAssets,
    ...collectionAssets,
    ...formOperationAssets,
    ...formulaAssets,
    ...yamlScreenAssets,
    ...yamlControlAssets,
    ...yamlComponentAssets
  ];
}

function modelDrivenAssets(project: ProjectRecord, now: string): ImplementationAsset[] {
  const modelDriven = project.powerPlatform?.modelDriven;
  if (!modelDriven) return [];
  const assets: ImplementationAsset[] = [];
  for (const table of modelDriven.dataverseTableSchemas) {
    assets.push(modelDrivenSpecAsset({
      project,
      targetId: table.id,
      targetDisplayName: table.displayName || table.logicalName || table.id,
      assetTypeLabel: "dataverse-table",
      gateIds: ["dataverseSchema", "logicalNames"],
      now,
      sourceRecordIds: [table.id],
      entityIds: [table.id],
      dependencies: [tableDependency(project, table.id)]
    }));
  }
  if (hasText(modelDriven.forms) || hasText(modelDriven.formDefinitions) || hasText(modelDriven.views) || hasText(modelDriven.viewDefinitions)) {
    const references = modelReferencesForText(project, [modelDriven.formDefinitions, modelDriven.viewDefinitions].join("\n"), "Forms and views");
    assets.push(modelDrivenSpecAsset({
      project,
      targetId: "forms-and-views",
      targetDisplayName: "Forms and views",
      assetTypeLabel: "forms-and-views",
      gateIds: ["formsAndViews", "dataverseSchema", "logicalNames"],
      now,
      sourceRecordIds: ["forms-and-views"],
      entityIds: references.tableIds,
      fieldIds: references.fieldIds,
      dependencies: references.dependencies
    }));
  }
  if (hasText(modelDriven.navigation) || hasText(modelDriven.navigationDefinitions)) {
    const references = modelReferencesForText(project, modelDriven.navigationDefinitions, "Navigation");
    assets.push(modelDrivenSpecAsset({
      project,
      targetId: "navigation",
      targetDisplayName: "App navigation",
      assetTypeLabel: "navigation",
      gateIds: ["navigation"],
      now,
      sourceRecordIds: ["navigation"],
      entityIds: references.tableIds,
      fieldIds: references.fieldIds,
      dependencies: references.dependencies
    }));
  }
  if (hasText(modelDriven.securityRoles) || hasText(modelDriven.teams) || hasText(modelDriven.fieldSecurityProfiles)) {
    const references = modelReferencesForText(project, [modelDriven.securityRoles, modelDriven.teams, modelDriven.fieldSecurityProfiles].join("\n"), "Security");
    assets.push(modelDrivenSpecAsset({
      project,
      targetId: "security",
      targetDisplayName: "Security roles and teams",
      assetTypeLabel: "security",
      gateIds: ["securityArchitecture"],
      now,
      sourceRecordIds: unique(["security", modelDriven.securityRoles ? "security-roles" : "", modelDriven.teams ? "teams" : "", modelDriven.fieldSecurityProfiles ? "field-security" : ""]),
      entityIds: references.tableIds,
      fieldIds: references.fieldIds,
      dependencies: references.dependencies
    }));
  }
  if (modelDriven.automationsDecision.status === "required") {
    const connectorIds = idsReferencedInText(modelDriven.automations, project.powerPlatform?.common.connectors.map((connector) => connector.id).filter(Boolean) ?? []);
    const references = modelReferencesForText(project, modelDriven.automations, "Automations");
    const dependencies = [
      ...connectorIds.map((connectorId) => connectorDependency(project, connectorId, "Automations")),
      ...references.dependencies,
      dependency({
        id: "connection-reference:strategy",
        type: "connectionReference",
        label: "Connection reference strategy",
        targetRecordId: "connectionReferences",
        resolved: hasMeaningfulText(project.powerPlatform?.common.connectionReferences),
        resolutionReason: hasMeaningfulText(project.powerPlatform?.common.connectionReferences) ? "Connection-reference strategy is documented." : "Connection-reference strategy is missing.",
        blockingIssue: "Connection-reference strategy is missing.",
        sourceSection: "Automations"
      }),
      dependency({
        id: "environment-variable:strategy",
        type: "environmentVariable",
        label: "Environment-variable strategy",
        targetRecordId: "environmentVariables",
        resolved: hasMeaningfulText(project.powerPlatform?.common.environmentVariables),
        resolutionReason: hasMeaningfulText(project.powerPlatform?.common.environmentVariables) ? "Environment-variable strategy is documented." : "Environment-variable strategy is missing.",
        blockingIssue: "Environment-variable strategy is missing.",
        sourceSection: "Automations"
      })
    ];
    assets.push(modelDrivenSpecAsset({
      project,
      targetId: "automations",
      targetDisplayName: "Automation specifications",
      assetTypeLabel: "automations",
      gateIds: ["automations", "connectionReferences", "environmentVariables"],
      now,
      category: "Automation specification",
      type: "automationSpecification",
      sourceRecordIds: ["automations"],
      connectorIds,
      entityIds: references.tableIds,
      fieldIds: references.fieldIds,
      dependencies
    }));
  }
  return assets;
}

function installationAsset(project: ProjectRecord, platform: ImplementationAssetPlatform, now: string, requiredAssets: ImplementationAsset[]): ImplementationAsset {
  const gateIds: PhaseGateId[] = ["environment", "connectionOwnership", "testing", "deploymentResponsibility"];
  const gateEvaluationSnapshot = snapshotGates(project, gateIds);
  const gateIssues = blockingGateIssues(gateEvaluationSnapshot);
  const dependencies = requiredAssets.map(assetDependency);
  const dependencyIssues = dependencies.flatMap((item) => item.resolved ? [] : [item.blockingIssue ?? `${item.label} is unresolved.`]);
  return finalizeAsset({
    assetId: `asset-installation-${safeSegment(project.identity.id, "project")}`,
    projectId: project.identity.id,
    platform,
    assetCategory: "Installation",
    assetType: "installationGuide",
    targetId: project.identity.id,
    targetDisplayName: `${project.identity.projectName || "Project"} installation boundary`,
    intendedPath: "07_Development/Installation/POWER_PLATFORM_INSTALLATION_GUIDE.md",
    applicabilityStatus: "required",
    required: true,
    requiredGateIds: gateIds,
    gateEvaluationSnapshot,
    sourceRecordIds: [project.identity.id],
    connectorIds: project.powerPlatform?.common.connectors.map((connector) => connector.id).filter(Boolean) ?? [],
    entityIds: [],
    fieldIds: [],
    dependencies,
    generationTimestamp: now,
    generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
    manualInstallationRequirements: [
      "Installation is manual and external to GPT Project Builder.",
      "Power Apps Studio, Dataverse, SharePoint, and Power Automate changes require an authorized human implementer."
    ],
    validationRequirements: [
      "Collect external evidence for installed, tested, published, deployed, and production-verified states."
    ],
    knownLimitations: ["Generated assets are developer inputs, not implementation evidence."],
    blockingIssues: [...gateIssues, ...dependencyIssues],
    approvalStatus: "Review required"
  });
}

function platformForProject(project: ProjectRecord): ImplementationAssetPlatform {
  if (isCanvasProject(project)) return "Power Apps Canvas";
  if (isModelDrivenProject(project)) return "Power Apps model-driven";
  return "Not Applicable";
}

function baseAssets(project: ProjectRecord, generatedAt: string): ImplementationAsset[] {
  if (isCanvasProject(project)) return canvasAssets(project, generatedAt);
  if (isModelDrivenProject(project)) return modelDrivenAssets(project, generatedAt);
  return [];
}

function withInstallationAsset(project: ProjectRecord, generatedAt: string, assets: ImplementationAsset[]): ImplementationAsset[] {
  if (!isCanvasProject(project) && !isModelDrivenProject(project)) return assets;
  const requiredAssets = assets.filter((asset) => asset.required);
  return [...assets, installationAsset(project, platformForProject(project), generatedAt, requiredAssets)];
}

function countDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value).sort();
}

function isAssetChecksumValid(asset: ImplementationAsset): boolean {
  return asset.contentChecksum === calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });
}

function resolvedRecordDependency(project: ProjectRecord, asset: ImplementationAsset, item: ImplementationAssetDependency): ImplementationAssetDependency {
  if (item.type === "asset") return item;
  if (
    asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID
    && item.id.startsWith("form-operation:")
  ) {
    return item;
  }
  if (item.type === "screen") {
    const resolved = item.targetRecordId === undefined || item.id === "parent:app" || item.id === "parent:none"
      ? true
      : Boolean(confirmedCanvasScreen(project, item.targetRecordId));
    return { ...item, resolved, resolutionReason: resolved ? "Screen reference is currently valid." : "Screen reference is missing or unconfirmed.", blockingIssue: resolved ? undefined : `Screen reference ${item.targetRecordId || "[missing]"} is missing or unconfirmed.` };
  }
  if (item.type === "control") {
    const resolved = Boolean(item.targetRecordId && confirmedCanvasControl(project, item.targetRecordId));
    return { ...item, resolved, resolutionReason: resolved ? "Control reference is currently valid." : "Control reference is missing or unconfirmed.", blockingIssue: resolved ? undefined : `Control reference ${item.targetRecordId || "[missing]"} is missing or unconfirmed.` };
  }
  if (item.type === "component") {
    const resolved = Boolean(item.targetRecordId && confirmedCanvasComponent(project, item.targetRecordId));
    return { ...item, resolved, resolutionReason: resolved ? "Component reference is currently valid." : "Component reference is missing or unconfirmed.", blockingIssue: resolved ? undefined : `Component reference ${item.targetRecordId || "[missing]"} is missing or unconfirmed.` };
  }
  if (item.type === "connector") {
    const resolved = connectorDependency(project, item.targetRecordId ?? "", item.sourceSection);
    return { ...resolved, id: item.id, label: item.label, relationshipContext: item.relationshipContext };
  }
  if (item.type === "entity") {
    const recordId = item.targetRecordId ?? "";
    const canvasEntity = asset.platform === "Power Apps Canvas" ? canvasEntityMatchesContext(project, recordId, item.relationshipContext) : false;
    const modelTable = modelTables(project).find((table) => table.id === recordId && table.confirmationStatus === "confirmed");
    const structuredMissing = item.id.startsWith("structured-reference:");
    const resolved = !structuredMissing && (asset.platform === "Power Apps Canvas" ? canvasEntity : asset.platform === "Power Apps model-driven" ? Boolean(modelTable) : false);
    return { ...item, resolved, resolutionReason: resolved ? "Entity/table reference is currently valid for its required connector context." : "Entity/table structured reference is missing, inactive, unconfirmed, or belongs to another connector.", blockingIssue: resolved ? undefined : item.blockingIssue ?? `Entity/table reference ${recordId || "[missing]"} is missing, inactive, unconfirmed, or belongs to another connector.` };
  }
  if (item.type === "field") {
    const recordId = item.targetRecordId ?? "";
    const canvas = project.powerPlatform?.canvas;
    const canvasField = asset.platform === "Power Apps Canvas" && Boolean(canvas && item.relationshipContext
      ? canvasFieldMatchesContext(project, recordId, item.relationshipContext)
      : canvas && (
      canvas.sharePointColumnSchemas.some((field) => field.id === recordId && field.confirmationStatus === "confirmed")
      || canvas.dataverseColumnSchemas.some((field) => field.id === recordId && field.confirmationStatus === "confirmed")
      || canvas.connectorFieldSchemas.some((field) => field.id === recordId && field.confirmationStatus === "confirmed")
    ));
    const modelField = modelColumns(project).some((column) => column.id === recordId && column.confirmationStatus === "confirmed");
    const resolved = asset.platform === "Power Apps Canvas" ? canvasField : asset.platform === "Power Apps model-driven" ? modelField : false;
    return { ...item, resolved, resolutionReason: resolved ? "Field/column reference is currently valid for its required parent entity and connector." : "Field/column reference is missing, unconfirmed, or belongs to another parent entity.", blockingIssue: resolved ? undefined : `Field/column reference ${recordId || "[missing]"} is missing, unconfirmed, or belongs to another parent entity.` };
  }
  if (item.type === "environmentVariable") {
    const resolved = hasMeaningfulText(project.powerPlatform?.common.environmentVariables ?? project.powerPlatform?.modelDriven?.environmentVariables);
    return { ...item, resolved, resolutionReason: resolved ? "Environment-variable strategy is documented." : "Environment-variable strategy is missing.", blockingIssue: resolved ? undefined : "Environment-variable strategy is missing." };
  }
  if (item.type === "connectionReference") {
    const resolved = hasMeaningfulText(project.powerPlatform?.common.connectionReferences ?? project.powerPlatform?.modelDriven?.connectionReferences);
    return { ...item, resolved, resolutionReason: resolved ? "Connection-reference strategy is documented." : "Connection-reference strategy is missing.", blockingIssue: resolved ? undefined : "Connection-reference strategy is missing." };
  }
  return item;
}

function resolvedAssetDependency(item: ImplementationAssetDependency, currentAsset: ImplementationAsset, assetById: Map<string, ImplementationAsset>): ImplementationAssetDependency {
  if (item.type !== "asset") return item;
  const targetId = item.targetAssetId ?? "";
  const target = assetById.get(targetId);
  if (!target) {
    return { ...item, resolved: false, resolutionReason: "Target asset is missing.", blockingIssue: `Dependency asset ${targetId || "[missing]"} is missing.` };
  }
  if (target.assetId === currentAsset.assetId) {
    return { ...item, resolved: false, resolutionReason: "Self-dependency is invalid.", blockingIssue: "Self-dependency is not allowed." };
  }
  if (target.applicabilityStatus === "notApplicable") {
    return { ...item, resolved: false, resolutionReason: "Target asset is not applicable.", blockingIssue: `Dependency asset ${targetId} is not applicable.` };
  }
  if (!isAssetChecksumValid(target)) {
    return { ...item, resolved: false, resolutionReason: "Target asset checksum is invalid.", blockingIssue: `Dependency asset ${targetId} has an invalid checksum.` };
  }
  const targetStatus = evaluateImplementationAssetStatus(target);
  const resolved = targetStatus === "Ready for Export";
  return {
    ...item,
    resolved,
    resolutionReason: resolved ? `Target asset is Ready for Export with checksum ${target.contentChecksum}.` : `Target asset recalculated status is ${targetStatus}.`,
    blockingIssue: resolved ? undefined : `Dependency asset ${targetId} is ${targetStatus}.`
  };
}

function currentCanvasPowerFxAsset(project: ProjectRecord, asset: ImplementationAsset): ImplementationAsset {
  if (asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID) return currentCanvasStateInitializationAsset(project, asset);
  if (asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID) return currentCanvasCollectionInitializationAsset(project, asset);
  if (asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID) return currentCanvasFormOperationPlanningAsset(project, asset);
  if (asset.platform !== "Power Apps Canvas" || asset.assetType !== "powerFxPlan") return asset;
  const target = project.powerPlatform?.canvas?.controlTargets.find((control) => control.id === asset.targetId);
  if (!target) return asset;
  const dependencyInfo = connectorEntityFieldDependencies(project, target);
  return {
    ...asset,
    sourceRecordIds: unique([target.id, target.screenId]),
    connectorIds: dependencyInfo.connectorIds,
    entityIds: dependencyInfo.entityIds,
    fieldIds: dependencyInfo.fieldIds,
    dependencies: dependencyInfo.dependencies,
    generationInputs: canvasNavigationGenerationInputs(project, target, asset.approvedPropertyName ?? "")
  };
}

function currentCanvasFormOperationPlanningAsset(project: ProjectRecord, asset: ImplementationAsset): ImplementationAsset {
  const model = buildCanvasFormOperationPlanningModel(project);
  const gateIds = CANVAS_FORM_OPERATION_GATE_IDS;
  if (!model) {
    return {
      ...asset,
      assetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
      projectId: project.identity.id,
      platform: "Power Apps Canvas",
      assetCategory: "Power Fx",
      assetType: "powerFxPlan",
      targetId: CANVAS_FORM_OPERATIONS_TARGET_ID,
      targetDisplayName: CANVAS_FORM_OPERATIONS_TARGET_DISPLAY_NAME,
      intendedPath: CANVAS_FORM_OPERATIONS_PLAN_PATH,
      applicabilityStatus: "notApplicable",
      required: false,
      requiredGateIds: gateIds,
      sourceRecordIds: [],
      connectorIds: [],
      entityIds: [],
      fieldIds: [],
      dependencies: [],
      generationInputs: {
        operation: CANVAS_FORM_OPERATIONS_OPERATION,
        formulaProperty: CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY,
        formOperationTargets: []
      },
      generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
      approvedPropertyName: CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY
    };
  }
  return {
    ...asset,
    assetId: CANVAS_FORM_OPERATIONS_ASSET_ID,
    projectId: project.identity.id,
    platform: "Power Apps Canvas",
    assetCategory: "Power Fx",
    assetType: "powerFxPlan",
    targetId: CANVAS_FORM_OPERATIONS_TARGET_ID,
    targetDisplayName: CANVAS_FORM_OPERATIONS_TARGET_DISPLAY_NAME,
    intendedPath: CANVAS_FORM_OPERATIONS_PLAN_PATH,
    applicabilityStatus: "required",
    required: model.required,
    requiredGateIds: gateIds,
    sourceRecordIds: model.sourceRecordIds,
    connectorIds: model.connectorIds,
    entityIds: model.entityIds,
    fieldIds: model.fieldIds,
    dependencies: formOperationDependencies(project, model.generationInputs),
    generationInputs: {
      operation: CANVAS_FORM_OPERATIONS_OPERATION,
      formulaProperty: CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY,
      formOperationTargets: model.generationInputs
    },
    generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
    approvedPropertyName: CANVAS_FORM_OPERATIONS_FORMULA_PROPERTY
  };
}

function currentCanvasStateInitializationAsset(project: ProjectRecord, asset: ImplementationAsset): ImplementationAsset {
  const variables = project.powerPlatform?.canvas?.stateVariableTargets ?? [];
  const validation = validateCanvasStateVariables(variables);
  return {
    ...asset,
    sourceRecordIds: validation.variables.map((variable) => variable.id),
    connectorIds: [],
    entityIds: [],
    fieldIds: [],
    dependencies: [],
    generationInputs: {
      operation: CANVAS_STATE_INITIALIZATION_OPERATION,
      formulaProperty: "OnStart",
      stateVariables: canvasStateVariableGenerationInputs(validation.includedVariables)
    }
  };
}

function currentCanvasCollectionInitializationAsset(project: ProjectRecord, asset: ImplementationAsset): ImplementationAsset {
  const targets = project.powerPlatform?.canvas?.collectionTargets ?? [];
  const validation = validateCanvasCollectionTargets(project, targets);
  const gateIds: PhaseGateId[] = ["connectorSelection", "schema", "namingStandards", "delegation"];
  const dependencies = [
    ...validation.sourceConnectorIds.map((connectorId) => connectorDependency(project, connectorId, "Canvas collection loading")),
    ...validation.sourceEntityIds.map((entityId) => {
      const entity = activeCanvasEntityReferences(project).get(entityId);
      return dependency({
        id: `entity:${entityId || "missing"}`,
        type: "entity",
        label: `Confirmed collection source entity ${entityId || "[missing]"}`,
        targetRecordId: entityId,
        relationshipContext: {
          connectorId: entity?.connectorId,
          entityId,
          targetType: entity?.entityType
        },
        resolved: Boolean(entity),
        resolutionReason: entity ? "Collection source entity exists, is confirmed, and belongs to the selected connector." : "Collection source entity is missing, unconfirmed, inactive, or belongs to another connector.",
        blockingIssue: `Collection source entity ${entityId || "[missing]"} is missing, unconfirmed, inactive, or belongs to another connector.`,
        sourceSection: "Canvas collection loading"
      });
    })
  ];
  return {
    ...asset,
    assetId: CANVAS_COLLECTION_INITIALIZATION_ASSET_ID,
    projectId: project.identity.id,
    platform: "Power Apps Canvas",
    assetCategory: "Power Fx",
    assetType: "powerFxPlan",
    targetId: CANVAS_COLLECTION_INITIALIZATION_TARGET_ID,
    targetDisplayName: "App OnStart collection loading plan",
    intendedPath: CANVAS_COLLECTION_INITIALIZATION_PATH,
    applicabilityStatus: "required",
    required: true,
    requiredGateIds: gateIds,
    sourceRecordIds: validation.targets.map((target) => target.id),
    connectorIds: validation.sourceConnectorIds,
    entityIds: validation.sourceEntityIds,
    fieldIds: [],
    dependencies,
    generationInputs: {
      operation: CANVAS_COLLECTION_INITIALIZATION_OPERATION,
      formulaProperty: "OnStart",
      collectionTargets: validation.generationInputs
    },
    generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
    approvedPropertyName: "OnStart"
  };
}

function storedCanonicalContractMatches(asset: ImplementationAsset, canonicalAsset: ImplementationAsset): boolean {
  return asset.assetId === canonicalAsset.assetId
    && asset.projectId === canonicalAsset.projectId
    && asset.platform === canonicalAsset.platform
    && asset.assetCategory === canonicalAsset.assetCategory
    && asset.assetType === canonicalAsset.assetType
    && asset.targetId === canonicalAsset.targetId
    && asset.targetDisplayName === canonicalAsset.targetDisplayName
    && asset.intendedPath === canonicalAsset.intendedPath
    && asset.applicabilityStatus === canonicalAsset.applicabilityStatus
    && asset.required === canonicalAsset.required
    && asset.approvedPropertyName === canonicalAsset.approvedPropertyName
    && stableStringify([...asset.requiredGateIds].sort()) === stableStringify([...canonicalAsset.requiredGateIds].sort())
    && stableStringify(asset.generationInputs ?? {}) === stableStringify(canonicalAsset.generationInputs ?? {})
    && stableStringify(asset.dependencies) === stableStringify(canonicalAsset.dependencies);
}

function formulaPropertyMembershipIssues(asset: ImplementationAsset): string[] {
  if (asset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID || asset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID || asset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID) return [];
  if (asset.platform !== "Power Apps Canvas" || asset.assetType !== "powerFxPlan") return [];
  const approvedProperty = asset.approvedPropertyName ?? "";
  const currentProperties = asset.generationInputs?.currentFormulaProperties ?? [];
  if (!approvedProperty || currentProperties.includes(approvedProperty)) return [];
  return [`Approved formula property ${approvedProperty} is no longer present on current control ${asset.targetId || "[missing]"}.`];
}

function deriveAssetFromCurrentState(project: ProjectRecord, asset: ImplementationAsset, assetById: Map<string, ImplementationAsset>): ImplementationAsset {
  const approvedChecksum = asset.approvalStatus === "Approved" ? asset.contentChecksum : "";
  const canonicalAsset = currentCanvasPowerFxAsset(project, asset);
  const dependencies = canonicalAsset.dependencies.map((item) => resolvedAssetDependency(resolvedRecordDependency(project, canonicalAsset, item), canonicalAsset, assetById));
  const gateEvaluationSnapshot = snapshotGates(project, canonicalAsset.requiredGateIds);
  const blockingIssues = unique([
    ...blockingGateIssues(gateEvaluationSnapshot),
    ...(canonicalAsset.assetId === CANVAS_STATE_INITIALIZATION_ASSET_ID ? validateCanvasStateVariables(project.powerPlatform?.canvas?.stateVariableTargets ?? []).blockingIssues : []),
    ...(canonicalAsset.assetId === CANVAS_COLLECTION_INITIALIZATION_ASSET_ID ? validateCanvasCollectionTargets(project, project.powerPlatform?.canvas?.collectionTargets ?? []).blockingIssues : []),
    ...(canonicalAsset.assetId === CANVAS_FORM_OPERATIONS_ASSET_ID ? buildCanvasFormOperationPlanningModel(project)?.blockingIssues ?? [] : []),
    ...formulaPropertyMembershipIssues(canonicalAsset),
    ...dependencies.flatMap((item) => item.required && !item.resolved ? [item.blockingIssue ?? `${item.label} is unresolved.`] : [])
  ]);
  const sourceContent = sourceContentFor({ ...canonicalAsset, blockingIssues });
  const withoutChecksum: ImplementationAsset = {
    ...canonicalAsset,
    gateEvaluationSnapshot,
    dependencies,
    blockingIssues,
    sourceContent,
    assetStatus: "Draft",
    contentChecksum: ""
  };
  const withStatus = {
    ...withoutChecksum,
    assetStatus: evaluateImplementationAssetStatus(withoutChecksum)
  };
  const withChecksum = {
    ...withStatus,
    contentChecksum: calculateImplementationAssetChecksum(withStatus)
  };
  if (asset.assetId !== CANVAS_STATE_INITIALIZATION_ASSET_ID && asset.assetId !== CANVAS_COLLECTION_INITIALIZATION_ASSET_ID && asset.assetId !== CANVAS_FORM_OPERATIONS_ASSET_ID) return withChecksum;
  const approvalStillValid = asset.approvalStatus === "Approved"
    && asset.assetId === withChecksum.assetId
    && storedCanonicalContractMatches(asset, withChecksum)
    && approvedChecksum === withChecksum.contentChecksum
    && COMPATIBLE_GENERATION_VERSIONS.has(asset.generationVersion)
    && withChecksum.applicabilityStatus === "required"
    && withChecksum.blockingIssues.length === 0
    && evaluateImplementationAssetStatus(withChecksum) !== "Blocked";
  return approvalStillValid
    ? withChecksum
    : {
        ...withChecksum,
        approvalStatus: "Review required",
        assetStatus: evaluateImplementationAssetStatus({ ...withChecksum, approvalStatus: "Review required" })
      };
}

export function evaluateImplementationAssetDependencies(project: ProjectRecord, assets: ImplementationAsset[]): ImplementationAssetDependencyEvaluation {
  let derived: ImplementationAsset[] = assets.map((asset) => ({ ...asset, assetStatus: asset.assetStatus === "Exported" ? "Review Required" as const : asset.assetStatus }));
  for (let index = 0; index < Math.max(2, assets.length + 1); index += 1) {
    const byId = new Map(derived.map((asset) => [asset.assetId, asset]));
    const next = derived.map((asset) => deriveAssetFromCurrentState(project, asset, byId));
    if (stableStringify(next.map((asset) => ({
      id: asset.assetId,
      status: asset.assetStatus,
      checksum: asset.contentChecksum,
      dependencies: asset.dependencies.map((item) => [item.id, item.resolved, item.blockingIssue ?? ""])
    }))) === stableStringify(derived.map((asset) => ({
      id: asset.assetId,
      status: asset.assetStatus,
      checksum: asset.contentChecksum,
      dependencies: asset.dependencies.map((item) => [item.id, item.resolved, item.blockingIssue ?? ""])
    })))) {
      derived = next;
      break;
    }
    derived = next;
  }
  return {
    assets: derived,
    dependencyIssues: unique(derived.flatMap((asset) => asset.dependencies.flatMap((item) => item.required && !item.resolved ? [`${asset.assetId}: ${item.blockingIssue ?? `${item.label} is unresolved.`}`] : [])))
  };
}

export function evaluateImplementationAssetGraph(assets: ImplementationAsset[]): ImplementationAssetGraphEvaluation {
  const sortedAssets = [...assets].sort((a, b) => a.assetId.localeCompare(b.assetId));
  const assetIds = sortedAssets.map((asset) => asset.assetId);
  const duplicateAssetIds = countDuplicates(assetIds);
  const duplicatePaths = countDuplicates(sortedAssets.map((asset) => asset.intendedPath));
  const assetById = new Map(sortedAssets.map((asset) => [asset.assetId, asset]));
  const duplicateDependencyIssues: string[] = [];
  const missingAssetDependencyIssues: string[] = [];
  const unresolvedRecordDependencyIssues: string[] = [];
  const selfDependencyIssues: string[] = [];

  for (const asset of sortedAssets) {
    const dependencyIds = asset.dependencies.map((item) => item.id);
    duplicateDependencyIssues.push(...countDuplicates(dependencyIds).map((id) => `${asset.assetId}: duplicate dependency ID ${id}.`));
    const targetAssetIds = asset.dependencies.flatMap((item) => item.type === "asset" && item.targetAssetId ? [item.targetAssetId] : []);
    duplicateDependencyIssues.push(...countDuplicates(targetAssetIds).map((id) => `${asset.assetId}: duplicate target asset dependency ${id}.`));
    const targetRecords = asset.dependencies.flatMap((item) => item.type !== "asset" && item.targetRecordId ? [`${item.type}:${item.targetRecordId}`] : []);
    duplicateDependencyIssues.push(...countDuplicates(targetRecords).map((id) => `${asset.assetId}: duplicate target record dependency ${id}.`));
    for (const item of asset.dependencies) {
      if (item.type === "asset" && item.targetAssetId === asset.assetId) {
        selfDependencyIssues.push(`${asset.assetId}: self-dependency is not allowed.`);
      }
      if (item.type === "asset" && item.targetAssetId && !assetById.has(item.targetAssetId)) {
        missingAssetDependencyIssues.push(`${asset.assetId}: dependency asset ${item.targetAssetId} is missing.`);
      }
      if (item.type !== "asset" && item.required && !item.resolved) {
        unresolvedRecordDependencyIssues.push(`${asset.assetId}: ${item.blockingIssue ?? `${item.label} is unresolved.`}`);
      }
    }
  }

  const circularDependencyIssues: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycleMembers = new Set<string>();
  function visitForCycle(assetId: string, trail: string[]): void {
    if (visiting.has(assetId)) {
      const cycle = [...trail.slice(trail.indexOf(assetId)), assetId];
      cycle.forEach((id) => cycleMembers.add(id));
      circularDependencyIssues.push(`Circular dependency detected: ${cycle.join(" -> ")}.`);
      return;
    }
    if (visited.has(assetId)) return;
    const asset = assetById.get(assetId);
    if (!asset) return;
    visiting.add(assetId);
    for (const item of [...asset.dependencies].sort((a, b) => (a.targetAssetId ?? "").localeCompare(b.targetAssetId ?? ""))) {
      if (item.type === "asset" && item.targetAssetId && assetById.has(item.targetAssetId)) {
        visitForCycle(item.targetAssetId, [...trail, assetId]);
      }
    }
    visiting.delete(assetId);
    visited.add(assetId);
  }
  sortedAssets.forEach((asset) => visitForCycle(asset.assetId, []));

  const order: string[] = [];
  const orderedVisited = new Set<string>();
  function orderVisit(asset: ImplementationAsset): void {
    if (orderedVisited.has(asset.assetId) || cycleMembers.has(asset.assetId)) return;
    orderedVisited.add(asset.assetId);
    const dependencies = asset.dependencies
      .filter((item) => item.type === "asset" && item.targetAssetId && assetById.has(item.targetAssetId))
      .sort((a, b) => (a.targetAssetId ?? "").localeCompare(b.targetAssetId ?? ""));
    for (const item of dependencies) {
      const dependencyAsset = assetById.get(item.targetAssetId!);
      if (dependencyAsset) orderVisit(dependencyAsset);
    }
    order.push(asset.assetId);
  }
  sortedAssets.forEach(orderVisit);
  const completeOrder = circularDependencyIssues.length === 0 ? order : [];

  const dependencyIssues = unique([
    ...duplicateAssetIds.map((id) => `Duplicate asset ID: ${id}.`),
    ...duplicatePaths.map((path) => `Duplicate implementation asset path: ${path}.`),
    ...duplicateDependencyIssues,
    ...missingAssetDependencyIssues,
    ...unresolvedRecordDependencyIssues,
    ...selfDependencyIssues
  ]);
  return {
    issues: unique([...dependencyIssues, ...circularDependencyIssues]),
    dependencyIssues,
    circularDependencyIssues: unique(circularDependencyIssues),
    duplicateAssetIds,
    duplicatePaths,
    duplicateDependencyIssues: unique(duplicateDependencyIssues),
    missingAssetDependencyIssues: unique(missingAssetDependencyIssues),
    unresolvedRecordDependencyIssues: unique(unresolvedRecordDependencyIssues),
    selfDependencyIssues: unique(selfDependencyIssues),
    generationOrder: completeOrder,
    installationOrder: completeOrder
  };
}

function summarizeRegistry(assets: ImplementationAsset[], graph: ImplementationAssetGraphEvaluation, packageReadiness: "Draft" | "Ready for Codex"): ImplementationAssetRegistrySummary {
  const blockedAssets = assets.filter((asset) => asset.assetStatus === "Blocked");
  const reviewRequiredAssets = assets.filter((asset) => asset.assetStatus === "Review Required");
  const readyAssets = assets.filter((asset) => asset.assetStatus === "Ready for Export" || asset.assetStatus === "Exported");
  const draftAssets = assets.filter((asset) => asset.assetStatus === "Draft");
  const notApplicableAssets = assets.filter((asset) => asset.assetStatus === "Not Applicable");
  const requiredAssets = assets.filter((asset) => asset.required);
  const hasStructuralIssues = graph.issues.length > 0;
  const assetPackageStatus: ImplementationAssetPackageStatus = assets.length === 0
    ? "Not Applicable"
    : blockedAssets.length > 0 || draftAssets.length > 0 || hasStructuralIssues
      ? "Draft"
      : reviewRequiredAssets.length > 0
        ? "Review Required"
        : "Ready for Export";
  const effectiveImplementationReadiness: EffectiveImplementationReadiness = packageReadiness !== "Ready for Codex" && assetPackageStatus === "Ready for Export"
    ? "Draft"
    : assetPackageStatus;
  const nextBlockedAsset = blockedAssets[0] ?? draftAssets[0] ?? reviewRequiredAssets[0];
  return {
    applicableAssetCount: assets.filter((asset) => asset.assetStatus !== "Not Applicable").length,
    readyAssetCount: readyAssets.length,
    reviewRequiredAssetCount: reviewRequiredAssets.length,
    blockedAssetCount: blockedAssets.length,
    draftAssetCount: draftAssets.length,
    notApplicableAssetCount: notApplicableAssets.length,
    requiredAssetCount: requiredAssets.length,
    optionalAssetCount: assets.filter((asset) => !asset.required).length,
    assetPackageStatus,
    effectiveImplementationReadiness,
    nextBlockedAsset: nextBlockedAsset?.targetDisplayName ?? "",
    nextRequiredAction: nextBlockedAsset?.blockingIssues[0] ?? (reviewRequiredAssets[0] ? `Review ${reviewRequiredAssets[0].targetDisplayName}.` : "No implementation asset action required.")
  };
}

export function deriveImplementationAssetRegistryState(project: ProjectRecord, assets: ImplementationAsset[]): ImplementationAssetRegistryState {
  const packageReadiness = evaluateGeneratedPackageReadiness(project).status;
  const dependencyEvaluation = evaluateImplementationAssetDependencies(project, assets);
  const graph = evaluateImplementationAssetGraph(dependencyEvaluation.assets);
  const summary = summarizeRegistry(dependencyEvaluation.assets, graph, packageReadiness);
  return {
    assets: dependencyEvaluation.assets,
    graph,
    summary,
    packageReadiness,
    assetPackageStatus: summary.assetPackageStatus,
    effectiveImplementationReadiness: summary.effectiveImplementationReadiness
  };
}

function finalizeRegistry(project: ProjectRecord, generatedAt: string, assets: ImplementationAsset[]): ImplementationAssetRegistry {
  const state = deriveImplementationAssetRegistryState(project, assets);
  return {
    registryVersion: 1,
    projectId: project.identity.id,
    projectName: project.identity.projectName.trim() || "Untitled project",
    projectType: getProjectTypeLabel(project.intake.appType).trim() || "Unknown project type",
    generatedAt,
    generationVersion: IMPLEMENTATION_ASSET_GENERATION_VERSION,
    packageReadiness: state.packageReadiness,
    assetPackageStatus: state.assetPackageStatus,
    effectiveImplementationReadiness: state.effectiveImplementationReadiness,
    assets: state.assets,
    dependencyIssues: state.graph.dependencyIssues,
    circularDependencyIssues: state.graph.circularDependencyIssues,
    generationOrder: state.graph.generationOrder,
    installationOrder: state.graph.installationOrder,
    summary: state.summary
  };
}

type StoredApproval = { approvalStatus: ImplementationAssetApprovalStatus; checksum: string; generationVersion: string };

function applyStoredApprovalCandidates(assets: ImplementationAsset[], storedApprovals: Map<string, StoredApproval>): ImplementationAsset[] {
  return assets.map((asset) => {
    const stored = storedApprovals.get(asset.assetId);
    return {
      ...asset,
      approvalStatus: stored?.approvalStatus === "Approved" && COMPATIBLE_GENERATION_VERSIONS.has(stored.generationVersion) ? "Approved" as const : "Review required" as const
    };
  });
}

function applyStoredApprovals(
  assets: ImplementationAsset[],
  storedApprovals: Map<string, StoredApproval>
): ImplementationAsset[] {
  return assets.map((asset) => {
    const stored = storedApprovals.get(asset.assetId);
    const canPreserve = stored?.approvalStatus === "Approved"
      && stored.checksum === asset.contentChecksum
      && COMPATIBLE_GENERATION_VERSIONS.has(stored.generationVersion)
      && asset.applicabilityStatus === "required"
      && asset.blockingIssues.length === 0
      && evaluateImplementationAssetStatus(asset) !== "Blocked";
    return {
      ...asset,
      approvalStatus: canPreserve ? "Approved" as const : "Review required" as const,
      assetStatus: canPreserve ? asset.assetStatus : evaluateImplementationAssetStatus({ ...asset, approvalStatus: "Review required" })
    };
  });
}

function buildFreshAssets(project: ProjectRecord, generatedAt: string, storedApprovals = new Map<string, StoredApproval>()): ImplementationAsset[] {
  const firstPass = baseAssets(project, generatedAt);
  const secondPass = withInstallationAsset(project, generatedAt, firstPass);
  const candidates = applyStoredApprovalCandidates(secondPass, storedApprovals);
  const derivedWithCandidates = deriveImplementationAssetRegistryState(project, candidates).assets;
  const approvalChecked = applyStoredApprovals(derivedWithCandidates, storedApprovals);
  return deriveImplementationAssetRegistryState(project, approvalChecked).assets;
}

export function buildImplementationAssetRegistry(project: ProjectRecord, generatedAt = new Date().toISOString()): ImplementationAssetRegistry {
  return finalizeRegistry(project, generatedAt, buildFreshAssets(project, generatedAt));
}

export function normalizeImplementationAssetRegistry(
  input: unknown,
  project: ProjectRecord,
  generatedAt = new Date().toISOString()
): ImplementationAssetRegistry {
  const groupedApprovals = new Map<string, StoredApproval[]>();
  if (isObject(input) && Array.isArray(input.assets)) {
    for (const candidate of input.assets) {
      if (!isObject(candidate)) continue;
      const assetId = typeof candidate.assetId === "string" ? candidate.assetId : "";
      const checksum = typeof candidate.contentChecksum === "string" ? candidate.contentChecksum : "";
      const generationVersion = typeof candidate.generationVersion === "string" ? candidate.generationVersion : "";
      const approvalStatus = isApprovalStatus(candidate.approvalStatus) ? candidate.approvalStatus : "Review required";
      if (!assetId) continue;
      groupedApprovals.set(assetId, [...(groupedApprovals.get(assetId) ?? []), { approvalStatus, checksum, generationVersion }]);
    }
  }
  const storedApprovals = new Map<string, StoredApproval>();
  for (const [assetId, records] of groupedApprovals) {
    const canonicalRecords = records.map((record) => stableStringify(record));
    if (new Set(canonicalRecords).size === 1) storedApprovals.set(assetId, records[0]);
  }
  return finalizeRegistry(project, generatedAt, buildFreshAssets(project, generatedAt, storedApprovals));
}

function canonicalProjectName(project: ProjectRecord): string {
  return project.identity.projectName.trim() || "Untitled project";
}

function canonicalProjectType(project: ProjectRecord): string {
  return getProjectTypeLabel(project.intake.appType).trim() || "Unknown project type";
}

function createManifestFromDerivedRegistryProjection(registry: ImplementationAssetRegistry, project: ProjectRecord): ImplementationAssetManifest {
  const state = deriveImplementationAssetRegistryState(project, registry.assets);
  return {
    packageVersion: 1,
    projectId: project.identity.id,
    projectName: canonicalProjectName(project),
    projectType: canonicalProjectType(project),
    projectPackageReadiness: state.packageReadiness,
    assetPackageStatus: state.assetPackageStatus,
    effectiveImplementationReadiness: state.effectiveImplementationReadiness,
    assetCount: state.assets.length,
    readyAssetCount: state.summary.readyAssetCount,
    blockedAssetCount: state.summary.blockedAssetCount,
    reviewRequiredAssetCount: state.summary.reviewRequiredAssetCount,
    draftAssetCount: state.summary.draftAssetCount,
    notApplicableAssetCount: state.summary.notApplicableAssetCount,
    requiredAssetCount: state.summary.requiredAssetCount,
    optionalAssetCount: state.summary.optionalAssetCount,
    dependencyIssues: state.graph.dependencyIssues,
    circularDependencyIssues: state.graph.circularDependencyIssues,
    generationOrder: state.graph.generationOrder,
    installationOrder: state.graph.installationOrder,
    assetPaths: state.assets.map((asset) => asset.intendedPath),
    assets: state.assets.map((asset) => ({
      assetId: asset.assetId,
      assetCategory: asset.assetCategory,
      assetType: asset.assetType,
      status: asset.assetStatus,
      approvalStatus: asset.approvalStatus,
      targetId: asset.targetId,
      targetDisplayName: asset.targetDisplayName,
      intendedPath: asset.intendedPath,
      dependencies: asset.dependencies,
      gateSnapshots: asset.gateEvaluationSnapshot,
      checksum: asset.contentChecksum,
      manualInstallationRequirements: asset.manualInstallationRequirements,
      validationRequirements: asset.validationRequirements
    })),
    generationTimestamp: registry.generatedAt,
    generatorVersion: registry.generationVersion
  };
}

export function createImplementationAssetManifest(registry: ImplementationAssetRegistry, project: ProjectRecord): ImplementationAssetManifest {
  return createManifestFromDerivedRegistryProjection(registry, project);
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function renderImplementationAssetManifestMarkdown(manifest: ImplementationAssetManifest): string {
  const rows = manifest.assets.map((asset) =>
    `| ${markdownCell(asset.assetId)} | ${markdownCell(asset.assetCategory)} | ${markdownCell(asset.status)} | ${markdownCell(asset.targetDisplayName)} | ${markdownCell(asset.intendedPath)} | ${markdownCell(asset.checksum)} |`
  ).join("\n");
  return `# Implementation Asset Manifest

## Summary

| Field | Value |
| --- | --- |
| Package version | ${manifest.packageVersion} |
| Project id | ${markdownCell(manifest.projectId)} |
| Project name | ${markdownCell(manifest.projectName)} |
| Project type | ${markdownCell(manifest.projectType)} |
| Project package readiness | ${manifest.projectPackageReadiness} |
| Asset package status | ${manifest.assetPackageStatus} |
| Effective implementation readiness | ${manifest.effectiveImplementationReadiness} |
| Asset count | ${manifest.assetCount} |
| Ready assets | ${manifest.readyAssetCount} |
| Review-required assets | ${manifest.reviewRequiredAssetCount} |
| Blocked assets | ${manifest.blockedAssetCount} |
| Draft assets | ${manifest.draftAssetCount} |
| Not applicable assets | ${manifest.notApplicableAssetCount} |
| Required assets | ${manifest.requiredAssetCount} |
| Optional assets | ${manifest.optionalAssetCount} |
| Generated at | ${markdownCell(manifest.generationTimestamp)} |
| Generator version | ${markdownCell(manifest.generatorVersion)} |

## Assets

| Asset ID | Category | Status | Target | Intended path | Checksum |
| --- | --- | --- | --- | --- | --- |
${rows || "| None | Not Applicable | Not Applicable | None | None | None |"}

## Manual boundary

- These assets are generated developer inputs only.
- GPT Project Builder has not installed, imported, tested in Studio, published, deployed, or production-verified any Power Platform solution.
`;
}

function registryStateFromStoredAssets(registry: ImplementationAssetRegistry, project?: ProjectRecord): ImplementationAssetRegistryState {
  if (project) return deriveImplementationAssetRegistryState(project, registry.assets);
  const assets = registry.assets.map((asset) => {
    const withoutChecksum = { ...asset, assetStatus: "Draft" as const, contentChecksum: "" };
    const withStatus = { ...withoutChecksum, assetStatus: evaluateImplementationAssetStatus(withoutChecksum) };
    return { ...withStatus, contentChecksum: calculateImplementationAssetChecksum(withStatus) };
  });
  const graph = evaluateImplementationAssetGraph(assets);
  const packageReadiness = registry.packageReadiness;
  const summary = summarizeRegistry(assets, graph, packageReadiness);
  return {
    assets,
    graph,
    summary,
    packageReadiness,
    assetPackageStatus: summary.assetPackageStatus,
    effectiveImplementationReadiness: summary.effectiveImplementationReadiness
  };
}

export function validateImplementationAssetRegistry(registry: ImplementationAssetRegistry, project?: ProjectRecord): string[] {
  const state = registryStateFromStoredAssets(registry, project);
  const issues: string[] = [...state.graph.issues];
  if (registry.registryVersion !== 1) issues.push("Registry version does not match expected version.");
  if (registry.generationVersion !== IMPLEMENTATION_ASSET_GENERATION_VERSION) issues.push("Registry generation version does not match implementation asset generator.");
  if (project && registry.projectId !== project.identity.id) issues.push("Registry project ID does not match project.");
  if (project && registry.projectName !== canonicalProjectName(project)) issues.push("Registry project name does not match project.");
  if (project && registry.projectType !== canonicalProjectType(project)) issues.push("Registry project type does not match project.");
  if (registry.packageReadiness !== state.packageReadiness) issues.push("Registry package readiness is stale.");
  if (registry.assetPackageStatus !== state.assetPackageStatus) issues.push("Registry asset package status is stale.");
  if (registry.effectiveImplementationReadiness !== state.effectiveImplementationReadiness) issues.push("Registry effective implementation readiness is stale.");
  if (stableStringify(registry.dependencyIssues) !== stableStringify(state.graph.dependencyIssues)) issues.push("Registry dependency issue list is stale.");
  if (stableStringify(registry.circularDependencyIssues) !== stableStringify(state.graph.circularDependencyIssues)) issues.push("Registry circular dependency issue list is stale.");
  if (stableStringify(registry.generationOrder) !== stableStringify(state.graph.generationOrder)) issues.push("Registry generation order is stale.");
  if (stableStringify(registry.installationOrder) !== stableStringify(state.graph.installationOrder)) issues.push("Registry installation order is stale.");
  const summaryFields: Array<keyof ImplementationAssetRegistrySummary> = [
    "applicableAssetCount",
    "readyAssetCount",
    "reviewRequiredAssetCount",
    "blockedAssetCount",
    "draftAssetCount",
    "notApplicableAssetCount",
    "requiredAssetCount",
    "optionalAssetCount",
    "assetPackageStatus",
    "effectiveImplementationReadiness",
    "nextBlockedAsset",
    "nextRequiredAction"
  ];
  for (const field of summaryFields) {
    if (registry.summary[field] !== state.summary[field]) issues.push(`Registry summary ${String(field)} is stale.`);
  }
  const expectedById = new Map(state.assets.map((asset) => [asset.assetId, asset]));
  for (const asset of registry.assets) {
    const expected = expectedById.get(asset.assetId);
    if (!expected) continue;
    if (asset.assetStatus !== expected.assetStatus) issues.push(`Asset status for ${asset.assetId} is stale.`);
    if (stableStringify(asset.gateEvaluationSnapshot) !== stableStringify(expected.gateEvaluationSnapshot)) issues.push(`Gate snapshot for ${asset.assetId} is stale.`);
    if (stableStringify(asset.dependencies) !== stableStringify(expected.dependencies)) issues.push(`Dependency resolution for ${asset.assetId} is stale.`);
    if (asset.approvalStatus === "Approved" && (expected.assetStatus !== "Ready for Export" || asset.contentChecksum !== expected.contentChecksum)) issues.push(`Approval for ${asset.assetId} is stale.`);
    if (asset.contentChecksum !== expected.contentChecksum) issues.push(`Checksum mismatch for ${asset.assetId}.`);
    if (asset.generationVersion !== IMPLEMENTATION_ASSET_GENERATION_VERSION) issues.push(`Generation version for ${asset.assetId} is stale.`);
    if (asset.assetStatus === "Exported") issues.push(`Asset ${asset.assetId} uses exported status, which Phase 5A must not preserve.`);
  }
  return unique(issues);
}

export function validateImplementationAssetManifest(
  manifest: ImplementationAssetManifest,
  registry: ImplementationAssetRegistry,
  project: ProjectRecord
): string[] {
  const registryIssues = validateImplementationAssetRegistry(registry, project).map((issue) => `Registry integrity: ${issue}`);
  const issues: string[] = [...registryIssues];
  const expectedManifest = createManifestFromDerivedRegistryProjection(registry, project);
  if (manifest.projectId !== project.identity.id) issues.push("Manifest project ID does not match project.");
  if (manifest.projectName !== canonicalProjectName(project)) issues.push("Manifest project name does not match project.");
  if (manifest.projectType !== canonicalProjectType(project)) issues.push("Manifest project type does not match project.");
  const comparableFields: Array<keyof ImplementationAssetManifest> = [
    "packageVersion", "projectId", "projectName", "projectType", "projectPackageReadiness", "assetPackageStatus",
    "effectiveImplementationReadiness", "assetCount", "readyAssetCount", "blockedAssetCount", "reviewRequiredAssetCount",
    "draftAssetCount", "notApplicableAssetCount", "requiredAssetCount", "optionalAssetCount", "generationTimestamp", "generatorVersion"
  ];
  for (const field of comparableFields) if (manifest[field] !== expectedManifest[field]) issues.push(`Manifest ${String(field)} does not match registry.`);
  if (stableStringify(manifest.assetPaths) !== stableStringify(expectedManifest.assetPaths)) issues.push("Manifest asset paths do not match registry.");
  if (stableStringify(manifest.dependencyIssues) !== stableStringify(expectedManifest.dependencyIssues)) issues.push("Manifest dependency issues do not match registry projection.");
  if (stableStringify(manifest.circularDependencyIssues) !== stableStringify(expectedManifest.circularDependencyIssues)) issues.push("Manifest circular dependency issues do not match registry projection.");
  if (stableStringify(manifest.generationOrder) !== stableStringify(expectedManifest.generationOrder)) issues.push("Manifest generation order does not match registry projection.");
  if (stableStringify(manifest.installationOrder) !== stableStringify(expectedManifest.installationOrder)) issues.push("Manifest installation order does not match registry projection.");
  for (const duplicateId of countDuplicates(manifest.assets.map((asset) => asset.assetId))) issues.push(`Duplicate manifest asset ID: ${duplicateId}.`);
  for (const duplicatePath of countDuplicates(manifest.assets.map((asset) => asset.intendedPath))) issues.push(`Duplicate manifest path: ${duplicatePath}.`);
  const manifestAssets = new Map(manifest.assets.map((asset) => [asset.assetId, asset]));
  const expectedAssets = new Map(expectedManifest.assets.map((asset) => [asset.assetId, asset]));
  for (const expectedAsset of expectedManifest.assets) {
    const manifestAsset = manifestAssets.get(expectedAsset.assetId);
    if (!manifestAsset) {
      issues.push(`Manifest is missing asset ${expectedAsset.assetId}.`);
      continue;
    }
    if (stableStringify(manifestAsset) !== stableStringify(expectedAsset)) issues.push(`Manifest asset ${expectedAsset.assetId} does not match registry projection.`);
  }
  for (const manifestAsset of manifest.assets) {
    if (!expectedAssets.has(manifestAsset.assetId)) issues.push(`Manifest has extra asset ${manifestAsset.assetId}.`);
  }
  if (manifest.assets.length !== expectedManifest.assets.length) issues.push("Manifest asset list count does not match registry.");
  return unique(issues);
}

export function gateResultsForAsset(asset: ImplementationAsset): PhaseGateResult[] {
  return asset.gateEvaluationSnapshot.map((gate) => ({
    id: gate.gateId,
    label: gate.label,
    status: gate.status,
    blockingReason: gate.blockingReason,
    sourceSection: gate.sourceSection
  }));
}
