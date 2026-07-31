import {
  calculateStableImplementationChecksum,
  type ImplementationAsset,
  type ImplementationAssetDependency,
  type ImplementationAssetGateSnapshot,
  type ImplementationAssetRelationshipContext
} from "./implementationAssets";
import {
  CANVAS_RECORD_LIFECYCLE_ASSET_ID,
  CANVAS_RECORD_LIFECYCLE_GENERATION_VERSION
} from "./recordLifecyclePlanning";
import {
  PERMANENT_DELETE_BLOCKER,
  RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
  RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION
} from "./recordLifecyclePowerFxGeneration";

export const RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION = "phase-5b.4d.2.1";

export type RecordLifecycleFormulaReviewState = "Not Applicable" | "Blocked" | "Review Required";
export type RecordLifecycleFormulaReviewReferenceStatus = "Current" | "Stale" | "Invalid" | "Not Provided";

export interface RecordLifecycleFormulaReviewReference {
  assetId: string;
  reviewContractVersion: string;
  reviewContractChecksum: string;
}

export interface RecordLifecycleFormulaReviewContract {
  reviewContractVersion: typeof RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION;
  assetId: string;
  projectId: string;
  platform: ImplementationAsset["platform"];
  assetCategory: ImplementationAsset["assetCategory"];
  assetType: ImplementationAsset["assetType"];
  targetId: string;
  intendedPath: string;
  approvedPropertyName: string;
  required: boolean;
  contentChecksum: string;
  sourcePlanningAssetId: string;
  sourcePlanningAssetChecksum: string;
  planningGenerationVersion: string;
  generationVersion: string;
  sourceRecordIds: string[];
  connectorIds: string[];
  entityIds: string[];
  fieldIds: string[];
  requiredGateIds: string[];
  gateEvaluationSnapshot: CanonicalGateSnapshot[];
  dependencies: CanonicalDependency[];
  generationInputs: CanonicalGenerationInputs;
  manualInstallationRequirements: string[];
  validationRequirements: string[];
  knownLimitations: string[];
}

export interface RecordLifecycleFormulaReviewStateResult {
  reviewState: RecordLifecycleFormulaReviewState;
  assetId?: typeof RECORD_LIFECYCLE_POWER_FX_ASSET_ID;
  reviewContractVersion?: typeof RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION;
  reviewContractChecksum?: string;
  formulaContentChecksum?: string;
  sourcePlanningAssetId?: string;
  sourcePlanningAssetChecksum?: string;
  planningGenerationVersion?: string;
  formulaGenerationVersion?: string;
  blockingIssues: string[];
  reviewReferenceStatus: RecordLifecycleFormulaReviewReferenceStatus;
  reviewReferenceIssues: string[];
}

interface CanonicalRelationshipContext {
  connectorId?: string;
  entityId?: string;
  fieldId?: string;
  parentConnectorId?: string;
  parentEntityId?: string;
  targetType?: ImplementationAssetRelationshipContext["targetType"];
}

interface CanonicalDependency {
  id: string;
  type: ImplementationAssetDependency["type"];
  targetAssetId: string;
  targetRecordId: string;
  required: boolean;
  resolved: boolean;
  blockingIssue: string;
  relationshipContext: CanonicalRelationshipContext;
}

interface CanonicalGateSnapshot {
  gateId: string;
  status: ImplementationAssetGateSnapshot["status"];
  passed: boolean;
  blockingReason: string;
}

interface CanonicalGenerationInputs {
  operation: string;
  formulaProperty: string;
  sourceScreenId: string;
  sourceControlId: string;
  sourcePlanningAssetId: string;
  sourcePlanningAssetChecksum: string;
  planningGenerationVersion: string;
}

interface FormulaReviewInput {
  assets?: unknown;
  dependencyIssues?: unknown;
  graph?: { dependencyIssues?: unknown };
}

interface ReferenceEvaluationContext {
  assetId?: string;
  reviewContractVersion?: string;
  reviewContractChecksum?: string;
}

const REVIEW_REFERENCE_KEYS = ["assetId", "reviewContractVersion", "reviewContractChecksum"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").replace(/\r/g, "\n") : "";
}

function uniqueSorted(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.map(text).filter(Boolean))).sort();
}

function uniqueIssues(values: unknown[]): string[] {
  return Array.from(new Set(values.map(text).filter(Boolean))).sort();
}

function sortedText(values: unknown): string[] {
  return uniqueSorted(values);
}

function dependencySortKey(dependency: CanonicalDependency): string {
  return [
    dependency.id,
    dependency.type,
    dependency.targetAssetId,
    dependency.targetRecordId,
    dependency.required ? "1" : "0",
    dependency.resolved ? "1" : "0"
  ].join(":");
}

function canonicalRelationshipContext(input: unknown): CanonicalRelationshipContext {
  if (!isObject(input)) return {};
  const context: CanonicalRelationshipContext = {};
  const stringKeys = ["connectorId", "entityId", "fieldId", "parentConnectorId", "parentEntityId"] as const;
  for (const key of stringKeys) {
    const value = text(input[key]);
    if (value) context[key] = value;
  }
  const targetType = input.targetType;
  if (typeof targetType === "string") context.targetType = targetType as CanonicalRelationshipContext["targetType"];
  return context;
}

function canonicalDependency(input: ImplementationAssetDependency): CanonicalDependency {
  return {
    id: text(input.id),
    type: input.type,
    targetAssetId: text(input.targetAssetId),
    targetRecordId: text(input.targetRecordId),
    required: input.required === true,
    resolved: input.resolved === true,
    blockingIssue: text(input.blockingIssue),
    relationshipContext: canonicalRelationshipContext(input.relationshipContext)
  };
}

function canonicalDependencies(dependencies: unknown): CanonicalDependency[] {
  if (!Array.isArray(dependencies)) return [];
  return dependencies
    .filter(isObject)
    .map((item) => canonicalDependency(item as unknown as ImplementationAssetDependency))
    .sort((a, b) => dependencySortKey(a).localeCompare(dependencySortKey(b)));
}

function canonicalGateSnapshot(input: ImplementationAssetGateSnapshot): CanonicalGateSnapshot {
  return {
    gateId: text(input.gateId),
    status: input.status,
    passed: input.passed === true,
    blockingReason: text(input.blockingReason)
  };
}

function canonicalGateSnapshots(gates: unknown): CanonicalGateSnapshot[] {
  if (!Array.isArray(gates)) return [];
  return gates
    .filter(isObject)
    .map((item) => canonicalGateSnapshot(item as unknown as ImplementationAssetGateSnapshot))
    .sort((a, b) => a.gateId.localeCompare(b.gateId));
}

function canonicalGenerationInputs(input: unknown): CanonicalGenerationInputs {
  const source = isObject(input) ? input : {};
  return {
    operation: text(source.operation),
    formulaProperty: text(source.formulaProperty),
    sourceScreenId: text(source.sourceScreenId),
    sourceControlId: text(source.sourceControlId),
    sourcePlanningAssetId: text(source.sourcePlanningAssetId),
    sourcePlanningAssetChecksum: text(source.sourcePlanningAssetChecksum),
    planningGenerationVersion: text(source.planningGenerationVersion)
  };
}

function registryLike(input: unknown): FormulaReviewInput {
  return isObject(input) ? input : {};
}

function assetsFromInput(input: unknown): { assets: ImplementationAsset[]; issues: string[] } {
  const assets = registryLike(input).assets;
  if (!Array.isArray(assets)) return { assets: [], issues: ["Formula review state requires an implementation asset array."] };
  return { assets: assets.filter(isObject) as unknown as ImplementationAsset[], issues: [] };
}

function dependencyIssuesFromInput(input: unknown): string[] {
  const source = registryLike(input);
  return uniqueIssues([
    ...(Array.isArray(source.dependencyIssues) ? source.dependencyIssues : []),
    ...(isObject(source.graph) && Array.isArray(source.graph.dependencyIssues) ? source.graph.dependencyIssues : [])
  ]);
}

function matchingFormulaAssets(assets: ImplementationAsset[]): ImplementationAsset[] {
  return assets.filter((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID);
}

function matchingPlanningAsset(assets: ImplementationAsset[]): ImplementationAsset | undefined {
  return assets.find((asset) => asset.assetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID);
}

function sourcePlanningDependency(asset: ImplementationAsset): ImplementationAssetDependency | undefined {
  return asset.dependencies.find((dependency) =>
    dependency.type === "asset"
    && dependency.targetAssetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID
  );
}

function relevantFormulaBlockers(input: unknown, assets: ImplementationAsset[]): string[] {
  const planningAsset = matchingPlanningAsset(assets);
  const issues = dependencyIssuesFromInput(input).filter((issue) =>
    issue.includes(RECORD_LIFECYCLE_POWER_FX_ASSET_ID)
    || issue.includes(CANVAS_RECORD_LIFECYCLE_ASSET_ID)
    || issue.includes("record lifecycle")
    || issue.includes("Record lifecycle")
    || issue.includes(PERMANENT_DELETE_BLOCKER)
  );
  if (planningAsset) issues.push(...planningAsset.blockingIssues);
  if (issues.some((issue) => issue.includes(PERMANENT_DELETE_BLOCKER))) issues.push(PERMANENT_DELETE_BLOCKER);
  if (issues.length === 0 && planningAsset) issues.push("Record lifecycle formula review requires a valid generated lifecycle formula asset.");
  return uniqueIssues(issues);
}

function contractChecksum(contract: RecordLifecycleFormulaReviewContract): string {
  return calculateStableImplementationChecksum(contract);
}

export function buildRecordLifecycleFormulaReviewContract(asset: ImplementationAsset): {
  contract: RecordLifecycleFormulaReviewContract;
  reviewContractChecksum: string;
} {
  const generationInputs = canonicalGenerationInputs(asset.generationInputs);
  const sourcePlanningAssetId = generationInputs.sourcePlanningAssetId;
  const sourcePlanningAssetChecksum = generationInputs.sourcePlanningAssetChecksum;
  const planningGenerationVersion = generationInputs.planningGenerationVersion;
  const contract: RecordLifecycleFormulaReviewContract = {
    reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
    assetId: text(asset.assetId),
    projectId: text(asset.projectId),
    platform: asset.platform,
    assetCategory: asset.assetCategory,
    assetType: asset.assetType,
    targetId: text(asset.targetId),
    intendedPath: text(asset.intendedPath),
    approvedPropertyName: text(asset.approvedPropertyName),
    required: asset.required === true,
    contentChecksum: text(asset.contentChecksum),
    sourcePlanningAssetId,
    sourcePlanningAssetChecksum,
    planningGenerationVersion,
    generationVersion: text(asset.generationVersion),
    sourceRecordIds: uniqueSorted(asset.sourceRecordIds),
    connectorIds: uniqueSorted(asset.connectorIds),
    entityIds: uniqueSorted(asset.entityIds),
    fieldIds: uniqueSorted(asset.fieldIds),
    requiredGateIds: uniqueSorted(asset.requiredGateIds),
    gateEvaluationSnapshot: canonicalGateSnapshots(asset.gateEvaluationSnapshot),
    dependencies: canonicalDependencies(asset.dependencies),
    generationInputs,
    manualInstallationRequirements: sortedText(asset.manualInstallationRequirements),
    validationRequirements: sortedText(asset.validationRequirements),
    knownLimitations: sortedText(asset.knownLimitations)
  };
  return { contract, reviewContractChecksum: contractChecksum(contract) };
}

function validateFormulaAsset(asset: ImplementationAsset): string[] {
  const dependency = sourcePlanningDependency(asset);
  return uniqueIssues([
    asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID ? "" : "Formula review asset ID is invalid.",
    asset.assetStatus === "Review Required" ? "" : "Formula review asset must remain Review Required.",
    asset.approvalStatus === "Review required" ? "" : "Formula review asset must remain approval Review required.",
    asset.generationVersion === RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION ? "" : "Formula generation version is not current.",
    dependency ? "" : "Formula review asset requires a source planning asset dependency.",
    dependency && dependency.resolved ? "" : "Formula review source planning dependency is unresolved.",
    asset.dependencies.some((item) => item.required && !item.resolved) ? "Formula review asset has unresolved required dependencies." : "",
    text(asset.contentChecksum) ? "" : "Formula content checksum is required.",
    text(asset.generationInputs?.sourcePlanningAssetId) === CANVAS_RECORD_LIFECYCLE_ASSET_ID ? "" : "Source planning asset ID is missing or invalid.",
    text(asset.generationInputs?.sourcePlanningAssetChecksum) ? "" : "Source planning asset checksum is required.",
    text(asset.generationInputs?.planningGenerationVersion) === CANVAS_RECORD_LIFECYCLE_GENERATION_VERSION ? "" : "Planning generation version is not current.",
    asset.sourceRecordIds.length > 0 ? "" : "Formula review source records are required."
  ]);
}

function formulaLikeSource(value: string): boolean {
  const pattern = /\b(?:Patch|IfError|Notify|Set|Remove|RemoveIf|Collect|ClearCollect|UpdateContext|SubmitForm|ResetForm|Navigate)\s*\(/;
  return pattern.test(value);
}

function unsafeReferenceText(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 || "<>{}[];`|".includes(character);
  });
}

function readReference(reference: unknown): { reference?: RecordLifecycleFormulaReviewReference; issues: string[] } {
  if (!isObject(reference)) return { issues: ["Formula review reference must be an object."] };
  const unexpectedKeys = Object.keys(reference).filter((key) => !REVIEW_REFERENCE_KEYS.includes(key as typeof REVIEW_REFERENCE_KEYS[number]));
  const assetId = text(reference.assetId);
  const reviewContractVersion = text(reference.reviewContractVersion);
  const reviewContractChecksum = text(reference.reviewContractChecksum);
  const issues = uniqueIssues([
    ...unexpectedKeys.map((key) => `Formula review reference contains unexpected field ${key}.`),
    typeof reference.assetId === "string" ? "" : "Formula review reference assetId must be a scalar string.",
    typeof reference.reviewContractVersion === "string" ? "" : "Formula review reference contract version must be a scalar string.",
    typeof reference.reviewContractChecksum === "string" ? "" : "Formula review reference checksum must be a scalar string.",
    assetId ? "" : "Formula review reference assetId is required.",
    reviewContractVersion ? "" : "Formula review reference contract version is required.",
    reviewContractChecksum ? "" : "Formula review reference checksum is required.",
    assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID ? "" : "Formula review reference assetId is invalid.",
    unsafeReferenceText(assetId) || unsafeReferenceText(reviewContractVersion) || unsafeReferenceText(reviewContractChecksum)
      ? "Formula review reference contains unsafe characters."
      : "",
    formulaLikeSource(assetId) || formulaLikeSource(reviewContractVersion) || formulaLikeSource(reviewContractChecksum)
      ? "Formula review reference must not contain formula source."
      : ""
  ]);
  if (issues.length > 0) return { issues };
  return { reference: { assetId, reviewContractVersion, reviewContractChecksum }, issues: [] };
}

function evaluateReference(
  reference: unknown,
  context: ReferenceEvaluationContext
): { status: RecordLifecycleFormulaReviewReferenceStatus; issues: string[] } {
  if (reference === undefined || reference === null) return { status: "Not Provided", issues: [] };
  const parsed = readReference(reference);
  if (!parsed.reference) return { status: "Invalid", issues: parsed.issues };
  if (!context.assetId || !context.reviewContractVersion || !context.reviewContractChecksum) {
    return { status: "Stale", issues: ["No current formula review contract is available."] };
  }
  const issues = uniqueIssues([
    parsed.reference.assetId === context.assetId ? "" : "Formula review reference asset ID does not match the current formula asset.",
    parsed.reference.reviewContractVersion === context.reviewContractVersion ? "" : "Formula review reference contract version is stale.",
    parsed.reference.reviewContractChecksum === context.reviewContractChecksum ? "" : "Formula review reference checksum is stale."
  ]);
  return issues.length > 0 ? { status: "Stale", issues } : { status: "Current", issues: [] };
}

export function buildRecordLifecycleFormulaReviewState(
  input: unknown,
  reviewReference?: unknown
): RecordLifecycleFormulaReviewStateResult {
  const parsed = assetsFromInput(input);
  const formulaAssets = matchingFormulaAssets(parsed.assets);
  const baseIssues = [...parsed.issues];

  if (formulaAssets.length > 1) {
    const reference = evaluateReference(reviewReference, {});
    return {
      reviewState: "Blocked",
      blockingIssues: uniqueIssues([...baseIssues, "Formula review found duplicate generated lifecycle formula assets."]),
      reviewReferenceStatus: reference.status,
      reviewReferenceIssues: reference.issues
    };
  }

  if (formulaAssets.length === 0) {
    const blockers = relevantFormulaBlockers(input, parsed.assets);
    const reviewState = blockers.length > 0 || baseIssues.length > 0 ? "Blocked" : "Not Applicable";
    const reference = evaluateReference(reviewReference, {});
    return {
      reviewState,
      blockingIssues: uniqueIssues([...baseIssues, ...blockers]),
      reviewReferenceStatus: reference.status,
      reviewReferenceIssues: reference.issues
    };
  }

  const asset = formulaAssets[0];
  const validationIssues = validateFormulaAsset(asset);
  const { contract, reviewContractChecksum } = buildRecordLifecycleFormulaReviewContract(asset);
  const referenceContext = validationIssues.length === 0
    ? {
      assetId: asset.assetId,
      reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
      reviewContractChecksum
    }
    : {};
  const reference = evaluateReference(reviewReference, referenceContext);
  if (validationIssues.length > 0 || baseIssues.length > 0) {
    return {
      reviewState: "Blocked",
      assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
      formulaContentChecksum: contract.contentChecksum,
      sourcePlanningAssetId: contract.sourcePlanningAssetId,
      sourcePlanningAssetChecksum: contract.sourcePlanningAssetChecksum,
      planningGenerationVersion: contract.planningGenerationVersion,
      formulaGenerationVersion: contract.generationVersion,
      blockingIssues: uniqueIssues([...baseIssues, ...validationIssues]),
      reviewReferenceStatus: reference.status,
      reviewReferenceIssues: reference.issues
    };
  }

  return {
    reviewState: "Review Required",
    assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
    reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
    reviewContractChecksum,
    formulaContentChecksum: contract.contentChecksum,
    sourcePlanningAssetId: contract.sourcePlanningAssetId,
    sourcePlanningAssetChecksum: contract.sourcePlanningAssetChecksum,
    planningGenerationVersion: contract.planningGenerationVersion,
    formulaGenerationVersion: contract.generationVersion,
    blockingIssues: [],
    reviewReferenceStatus: reference.status,
    reviewReferenceIssues: reference.issues
  };
}
