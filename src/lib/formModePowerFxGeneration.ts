import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetGraph,
  validateImplementationAssetRegistry,
  type ImplementationAsset
} from "./implementationAssets";
import {
  buildCanvasFormModePlanningModel,
  canvasFormModeActionIntendedPath,
  CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
  CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY,
  CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION,
  CANVAS_FORM_MODE_ACTIONS_OPERATION,
  CANVAS_FORM_MODE_ACTIONS_PLAN_PATH,
  CANVAS_FORM_MODE_ACTIONS_TARGET_ID,
  type CanvasFormModeGenerationInput
} from "./formModePlanning";
import { isCanvasProject } from "./powerPlatform";
import type { ProjectRecord } from "../types/project";

export const FORM_MODE_POWER_FX_GENERATION_VERSION = "phase-5b.3f";
export type FormModePowerFxGenerationStatus = "Generated" | "Blocked" | "Not Applicable";

export interface FormModePowerFxFragment {
  formModeTargetId: string;
  formOperationTargetId: string;
  action: "new" | "edit";
  triggerControlId: string;
  triggerControlApprovedName: string;
  screenTargetId: string;
  formControlId: string;
  formControlApprovedName: string;
  intendedPath: string;
  formula: string;
  sourcePlanningAssetId: typeof CANVAS_FORM_MODE_ACTIONS_ASSET_ID;
  approvedPlanningChecksum: string;
  fragmentChecksum: string;
  generationVersion: typeof FORM_MODE_POWER_FX_GENERATION_VERSION;
}

export interface FormModePowerFxTraceability {
  projectId: string;
  sourcePlanningAssetId: typeof CANVAS_FORM_MODE_ACTIONS_ASSET_ID;
  approvedPlanningChecksum: string;
  formModeTargetIds: string[];
  formOperationTargetIds: string[];
  actions: Array<"new" | "edit">;
  screenTargetIds: string[];
  triggerControlIds: string[];
  formControlIds: string[];
  intendedPaths: string[];
  generationVersion: typeof FORM_MODE_POWER_FX_GENERATION_VERSION;
}

export interface FormModePowerFxGenerationResult {
  assetId: typeof CANVAS_FORM_MODE_ACTIONS_ASSET_ID;
  projectId: string;
  targetId: typeof CANVAS_FORM_MODE_ACTIONS_TARGET_ID;
  operation: typeof CANVAS_FORM_MODE_ACTIONS_OPERATION;
  propertyName: typeof CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY;
  status: FormModePowerFxGenerationStatus;
  sourceChecksum: string;
  generatedChecksum: string;
  fragments: FormModePowerFxFragment[];
  blockingIssues: string[];
  missingDecisions: string[];
  warnings: string[];
  validationInstructions: string[];
  manualInstallationInstructions: string[];
  generationVersion: typeof FORM_MODE_POWER_FX_GENERATION_VERSION;
  traceability: FormModePowerFxTraceability;
}

interface FormModePowerFxGenerationContext {
  project: ProjectRecord;
  registry: unknown;
}

const POWER_FX_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

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

function registryAssets(registry: unknown): unknown[] {
  return isObject(registry) && Array.isArray(registry.assets) ? registry.assets : [];
}

function isImplementationAsset(value: unknown): value is ImplementationAsset {
  return isObject(value) && typeof value.assetId === "string";
}

function formModeInputs(asset: ImplementationAsset | undefined): CanvasFormModeGenerationInput[] {
  const targets = asset?.generationInputs?.formModeTargets;
  return Array.isArray(targets) ? targets as CanvasFormModeGenerationInput[] : [];
}

function sourceChecksumIsValid(asset: ImplementationAsset): boolean {
  return asset.contentChecksum === calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });
}

function canonicalCurrentFormModeAsset(project: ProjectRecord, assets: unknown[]): ImplementationAsset | undefined {
  return deriveImplementationAssetRegistryState(project, assets).assets.find((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID)
    ?? buildImplementationAssetRegistry(project, "2026-07-19T00:00:00.000Z").assets.find((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID);
}

function traceabilityFor(project: ProjectRecord, asset: ImplementationAsset | undefined, inputs: CanvasFormModeGenerationInput[]): FormModePowerFxTraceability {
  return {
    projectId: project.identity.id,
    sourcePlanningAssetId: CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
    approvedPlanningChecksum: asset?.contentChecksum ?? "",
    formModeTargetIds: inputs.map((input) => input.formModeTargetId),
    formOperationTargetIds: inputs.map((input) => input.formOperationTargetId),
    actions: inputs.flatMap((input) => input.action === "new" || input.action === "edit" ? [input.action] : []),
    screenTargetIds: inputs.map((input) => input.screenTargetId),
    triggerControlIds: inputs.map((input) => input.triggerControlId),
    formControlIds: inputs.map((input) => input.formControlId),
    intendedPaths: inputs.map((input) => input.intendedPath),
    generationVersion: FORM_MODE_POWER_FX_GENERATION_VERSION
  };
}

function baseResult(input: {
  project: ProjectRecord;
  asset?: ImplementationAsset;
  status: FormModePowerFxGenerationStatus;
  fragments?: FormModePowerFxFragment[];
  generatedChecksum?: string;
  blockingIssues?: string[];
  missingDecisions?: string[];
  warnings?: string[];
  inputs?: CanvasFormModeGenerationInput[];
}): FormModePowerFxGenerationResult {
  const inputs = input.inputs ?? formModeInputs(input.asset);
  return {
    assetId: CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
    projectId: input.project.identity.id,
    targetId: CANVAS_FORM_MODE_ACTIONS_TARGET_ID,
    operation: CANVAS_FORM_MODE_ACTIONS_OPERATION,
    propertyName: CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY,
    status: input.status,
    sourceChecksum: input.asset?.contentChecksum ?? "",
    generatedChecksum: input.generatedChecksum ?? "",
    fragments: input.fragments ?? [],
    blockingIssues: input.blockingIssues ?? [],
    missingDecisions: input.missingDecisions ?? [],
    warnings: input.warnings ?? [],
    validationInstructions: [
      "Validate each generated button OnSelect fragment in Power Apps Studio before claiming implementation complete.",
      "Confirm this phase only switches the confirmed form control into new or edit mode and does not submit, reset, navigate, notify, patch, or bind records."
    ],
    manualInstallationInstructions: [
      "Open the confirmed Canvas app in Power Apps Studio.",
      "For each generated fragment, paste the formula into the confirmed trigger button's OnSelect property.",
      "Do not create .fx files or claim publish, deployment, or production verification from these generated fragments alone."
    ],
    generationVersion: FORM_MODE_POWER_FX_GENERATION_VERSION,
    traceability: traceabilityFor(input.project, input.asset, inputs)
  };
}

function blocked(input: Omit<Parameters<typeof baseResult>[0], "status" | "fragments" | "generatedChecksum"> & { status?: FormModePowerFxGenerationStatus }): FormModePowerFxGenerationResult {
  return baseResult({
    ...input,
    fragments: [],
    generatedChecksum: "",
    status: input.status ?? "Blocked"
  });
}

function currentTargetStorageIssues(project: ProjectRecord): string[] {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas || !Object.prototype.hasOwnProperty.call(canvas, "formModeTargets")) return [];
  return Array.isArray((canvas as unknown as Record<string, unknown>).formModeTargets)
    ? []
    : ["Current Canvas form-mode target storage is malformed; formModeTargets must be an array when present."];
}

function canonicalSourceContractIssues(rawAsset: ImplementationAsset, canonicalAsset: ImplementationAsset, project: ProjectRecord): string[] {
  const issues: string[] = [];
  if (rawAsset.projectId !== project.identity.id) issues.push(`Asset ${rawAsset.assetId} belongs to project ${rawAsset.projectId || "[missing]"}, not current project ${project.identity.id}.`);
  if (rawAsset.assetId !== CANVAS_FORM_MODE_ACTIONS_ASSET_ID) issues.push(`Asset ID ${rawAsset.assetId || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID}.`);
  if (rawAsset.platform !== "Power Apps Canvas") issues.push(`Asset platform ${rawAsset.platform || "[missing]"} is not Power Apps Canvas.`);
  if (rawAsset.assetCategory !== "Power Fx") issues.push(`Asset category ${rawAsset.assetCategory || "[missing]"} is not Power Fx.`);
  if (rawAsset.assetType !== "powerFxPlan") issues.push(`Asset type ${rawAsset.assetType || "[missing]"} is not powerFxPlan.`);
  if (rawAsset.targetId !== CANVAS_FORM_MODE_ACTIONS_TARGET_ID) issues.push(`Asset target ID ${rawAsset.targetId || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_TARGET_ID}.`);
  if (rawAsset.generationInputs?.operation !== CANVAS_FORM_MODE_ACTIONS_OPERATION) issues.push(`Operation ${rawAsset.generationInputs?.operation || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_OPERATION}.`);
  if (rawAsset.approvedPropertyName !== CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY) issues.push(`Approved property ${rawAsset.approvedPropertyName || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY}.`);
  if (rawAsset.generationInputs?.formulaProperty !== CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY) issues.push(`Formula property ${rawAsset.generationInputs?.formulaProperty || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY}.`);
  if (rawAsset.intendedPath !== CANVAS_FORM_MODE_ACTIONS_PLAN_PATH) issues.push(`Planning path ${rawAsset.intendedPath || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_PLAN_PATH}.`);
  if (rawAsset.generationVersion !== CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION) issues.push(`Asset generation version ${rawAsset.generationVersion || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION}.`);
  if (rawAsset.required !== canonicalAsset.required) issues.push("Asset required flag does not match the current canonical form-mode plan.");
  if (rawAsset.applicabilityStatus !== canonicalAsset.applicabilityStatus) issues.push("Asset applicability does not match the current canonical form-mode plan.");
  if (rawAsset.contentChecksum !== canonicalAsset.contentChecksum) issues.push("Asset approved checksum does not match the current canonical form-mode checksum.");
  if (stableStringify(rawAsset.requiredGateIds) !== stableStringify(canonicalAsset.requiredGateIds)) issues.push("Asset required gate IDs do not match the canonical form-mode gate contract.");
  if (stableStringify(rawAsset.gateEvaluationSnapshot) !== stableStringify(canonicalAsset.gateEvaluationSnapshot)) issues.push("Asset gate snapshot does not match current canonical gate evaluation.");
  if (stableStringify(rawAsset.dependencies) !== stableStringify(canonicalAsset.dependencies)) issues.push("Asset dependencies do not match the canonical form-mode dependency boundary.");
  if (stableStringify(rawAsset.sourceRecordIds) !== stableStringify(canonicalAsset.sourceRecordIds)) issues.push("Asset source record IDs do not match current canonical form-mode records.");
  if (stableStringify(rawAsset.generationInputs?.formModeTargets ?? []) !== stableStringify(canonicalAsset.generationInputs?.formModeTargets ?? [])) issues.push("Asset structured form-mode target inputs do not match the current project.");
  if (rawAsset.generationInputs?.sourcePlanningAssetId !== canonicalAsset.generationInputs?.sourcePlanningAssetId) issues.push("Asset source planning asset ID does not match the current canonical source plan.");
  if (rawAsset.generationInputs?.sourcePlanningAssetChecksum !== canonicalAsset.generationInputs?.sourcePlanningAssetChecksum) issues.push("Asset source planning checksum does not match the current canonical source plan.");
  if (rawAsset.generationInputs?.planningGenerationVersion !== CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION) issues.push("Asset planning generation version is stale or malformed.");
  return unique(issues);
}

function sourcePreflightIssues(sourceAssets: ImplementationAsset[], project: ProjectRecord): string[] {
  if (sourceAssets.length === 0) return [`Phase 5B.3E form-mode planning asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} does not exist.`];
  if (sourceAssets.length > 1) return [`Implementation asset registry has ${sourceAssets.length} canonical form-mode source assets; exactly one is required.`];
  const asset = sourceAssets[0];
  const issues: string[] = [];
  if (asset.projectId !== project.identity.id) issues.push(`Asset ${asset.assetId} belongs to project ${asset.projectId || "[missing]"}, not current project ${project.identity.id}.`);
  if (asset.targetId !== CANVAS_FORM_MODE_ACTIONS_TARGET_ID) issues.push(`Asset target ID ${asset.targetId || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_TARGET_ID}.`);
  if (asset.generationInputs?.operation !== CANVAS_FORM_MODE_ACTIONS_OPERATION) issues.push(`Operation ${asset.generationInputs?.operation || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_OPERATION}.`);
  if (asset.approvedPropertyName !== CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY) issues.push(`Approved property ${asset.approvedPropertyName || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_FORMULA_PROPERTY}.`);
  if (asset.intendedPath !== CANVAS_FORM_MODE_ACTIONS_PLAN_PATH) issues.push(`Planning path ${asset.intendedPath || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_PLAN_PATH}.`);
  if (asset.generationVersion !== CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION) issues.push(`Asset generation version ${asset.generationVersion || "[missing]"} is not ${CANVAS_FORM_MODE_ACTIONS_GENERATION_VERSION}.`);
  if (asset.assetStatus !== "Ready for Export") issues.push(`Asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} stored source status is ${asset.assetStatus}; Ready for Export is required before form-mode Power Fx generation.`);
  if (asset.approvalStatus !== "Approved") issues.push(`Asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} is not approved.`);
  if (typeof asset.contentChecksum !== "string" || !sourceChecksumIsValid(asset)) issues.push(`Asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} source checksum is invalid.`);
  return unique(issues);
}

function unresolvedDependencyIssues(asset: ImplementationAsset): string[] {
  return asset.dependencies
    .filter((dependency) => dependency.required && !dependency.resolved)
    .map((dependency) => dependency.blockingIssue ?? `${dependency.label} is unresolved.`);
}

function gateBlockingIssues(asset: ImplementationAsset): string[] {
  return asset.gateEvaluationSnapshot
    .filter((gate) => !gate.passed)
    .map((gate) => `${gate.label}: ${gate.blockingReason}`);
}

function validateAction(input: CanvasFormModeGenerationInput): string[] {
  if (input.action === "new" || input.action === "edit") return [];
  return [`Form-mode target ${input.formModeTargetId || "[missing]"} action ${String(input.action || "[missing]")} is not supported.`];
}

function validateFormIdentifier(input: CanvasFormModeGenerationInput, project: ProjectRecord): string[] {
  const issues: string[] = [];
  const formControl = project.powerPlatform?.canvas?.controlTargets.find((control) => control.id === input.formControlId);
  if (!formControl) issues.push(`Form-mode target ${input.formModeTargetId} form control ${input.formControlId || "[missing]"} is missing.`);
  if (formControl && formControl.screenId !== input.screenTargetId) issues.push(`Form-mode target ${input.formModeTargetId} form control ${input.formControlId} moved off screen ${input.screenTargetId}.`);
  if (formControl && formControl.confirmationStatus !== "confirmed") issues.push(`Form-mode target ${input.formModeTargetId} form control ${input.formControlId} is not confirmed.`);
  if (formControl && formControl.controlType !== "edit form") issues.push(`Form-mode target ${input.formModeTargetId} form control ${input.formControlId} is not an edit form.`);
  if (formControl && formControl.approvedControlName !== input.formControlApprovedName) issues.push(`Form-mode target ${input.formModeTargetId} form control name is stale.`);
  if (typeof input.formControlApprovedName !== "string" || !POWER_FX_IDENTIFIER_PATTERN.test(input.formControlApprovedName)) {
    issues.push(`Form-mode target ${input.formModeTargetId || "[missing]"} form implementation name is not a simple Power Fx identifier.`);
  }
  return issues;
}

function validateTrigger(input: CanvasFormModeGenerationInput, project: ProjectRecord): string[] {
  const issues: string[] = [];
  const trigger = project.powerPlatform?.canvas?.controlTargets.find((control) => control.id === input.triggerControlId);
  const submitControlIds = new Set((project.powerPlatform?.canvas?.formOperationTargets ?? []).map((target) => target.submitControlId));
  if (!trigger) issues.push(`Form-mode target ${input.formModeTargetId} trigger control ${input.triggerControlId || "[missing]"} is missing.`);
  if (trigger && trigger.screenId !== input.screenTargetId) issues.push(`Form-mode target ${input.formModeTargetId} trigger control ${input.triggerControlId} moved off screen ${input.screenTargetId}.`);
  if (trigger && trigger.confirmationStatus !== "confirmed") issues.push(`Form-mode target ${input.formModeTargetId} trigger control ${input.triggerControlId} is not confirmed.`);
  if (trigger && trigger.controlType !== "button") issues.push(`Form-mode target ${input.formModeTargetId} trigger control ${input.triggerControlId} is not a button.`);
  if (trigger && trigger.approvedControlName !== input.triggerControlApprovedName) issues.push(`Form-mode target ${input.formModeTargetId} trigger control name is stale.`);
  if (typeof input.triggerControlApprovedName !== "string" || !POWER_FX_IDENTIFIER_PATTERN.test(input.triggerControlApprovedName)) {
    issues.push(`Form-mode target ${input.formModeTargetId || "[missing]"} trigger control name is not a simple Power Fx identifier.`);
  }
  if (submitControlIds.has(input.triggerControlId)) issues.push(`Form-mode target ${input.formModeTargetId} trigger control ${input.triggerControlId} overlaps with a form-operation submit control.`);
  return issues;
}

function pathIssues(inputs: CanvasFormModeGenerationInput[]): string[] {
  const counts = new Map<string, number>();
  const issues: string[] = [];
  for (const input of inputs) {
    counts.set(input.intendedPath, (counts.get(input.intendedPath) ?? 0) + 1);
    if (input.intendedPath.includes("\\")) issues.push(`Form-mode target ${input.formModeTargetId} intended path contains a backslash.`);
    if (input.intendedPath.startsWith("/") || /^[A-Za-z]:/.test(input.intendedPath)) issues.push(`Form-mode target ${input.formModeTargetId} intended path is absolute.`);
    if (input.intendedPath.split("/").includes("..")) issues.push(`Form-mode target ${input.formModeTargetId} intended path contains parent traversal.`);
    if (!input.intendedPath.endsWith("/OnSelect.form-mode.fx")) issues.push(`Form-mode target ${input.formModeTargetId} intended path must end with /OnSelect.form-mode.fx.`);
    if (input.intendedPath !== canvasFormModeActionIntendedPath(input)) issues.push(`Form-mode target ${input.formModeTargetId} intended path does not match current screen and trigger IDs.`);
  }
  for (const [path, count] of counts) {
    if (count > 1) issues.push(`Duplicate form-mode intended path: ${path}.`);
  }
  return unique(issues);
}

function fragmentChecksumFor(input: {
  projectId: string;
  approvedPlanningChecksum: string;
  target: CanvasFormModeGenerationInput;
  formula: string;
}): string {
  return fnv1a(stableStringify({
    generationVersion: FORM_MODE_POWER_FX_GENERATION_VERSION,
    projectId: input.projectId,
    sourcePlanningAssetId: CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
    approvedPlanningChecksum: input.approvedPlanningChecksum,
    formModeTargetId: input.target.formModeTargetId,
    formOperationTargetId: input.target.formOperationTargetId,
    action: input.target.action,
    screenTargetId: input.target.screenTargetId,
    triggerControlId: input.target.triggerControlId,
    triggerControlApprovedName: input.target.triggerControlApprovedName,
    formControlId: input.target.formControlId,
    currentFormApprovedName: input.target.formControlApprovedName,
    intendedPath: input.target.intendedPath,
    formula: input.formula
  }));
}

function generatedChecksumFor(input: {
  projectId: string;
  sourceChecksum: string;
  fragments: FormModePowerFxFragment[];
}): string {
  return fnv1a(stableStringify({
    generationVersion: FORM_MODE_POWER_FX_GENERATION_VERSION,
    projectId: input.projectId,
    sourcePlanningAssetId: CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
    sourceChecksum: input.sourceChecksum,
    orderedFragmentChecksums: input.fragments.map((fragment) => fragment.fragmentChecksum),
    orderedFormModeTargetIds: input.fragments.map((fragment) => fragment.formModeTargetId),
    orderedIntendedPaths: input.fragments.map((fragment) => fragment.intendedPath)
  }));
}

function fragmentsForInputs(project: ProjectRecord, sourceChecksum: string, inputs: CanvasFormModeGenerationInput[]): { fragments: FormModePowerFxFragment[]; issues: string[] } {
  const issues = unique([
    ...inputs.flatMap(validateAction),
    ...inputs.flatMap((input) => validateFormIdentifier(input, project)),
    ...inputs.flatMap((input) => validateTrigger(input, project)),
    ...pathIssues(inputs)
  ]);
  const fragments = inputs.map((input) => {
    const formula = `${input.action === "new" ? "NewForm" : "EditForm"}(${input.formControlApprovedName})\n`;
    return {
      formModeTargetId: input.formModeTargetId,
      formOperationTargetId: input.formOperationTargetId,
      action: input.action,
      triggerControlId: input.triggerControlId,
      triggerControlApprovedName: input.triggerControlApprovedName,
      screenTargetId: input.screenTargetId,
      formControlId: input.formControlId,
      formControlApprovedName: input.formControlApprovedName,
      intendedPath: input.intendedPath,
      formula,
      sourcePlanningAssetId: CANVAS_FORM_MODE_ACTIONS_ASSET_ID,
      approvedPlanningChecksum: sourceChecksum,
      fragmentChecksum: fragmentChecksumFor({
        projectId: project.identity.id,
        approvedPlanningChecksum: sourceChecksum,
        target: input,
        formula
      }),
      generationVersion: FORM_MODE_POWER_FX_GENERATION_VERSION
    };
  }) satisfies FormModePowerFxFragment[];
  return { fragments: issues.length === 0 ? fragments : [], issues };
}

export function generateFormModePowerFxForAsset({ project, registry }: FormModePowerFxGenerationContext): FormModePowerFxGenerationResult {
  const assets = registryAssets(registry).filter(isImplementationAsset);
  const sourceAssets = assets.filter((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID);
  const sourceIssues = sourcePreflightIssues(sourceAssets, project);
  const registryIssues = validateImplementationAssetRegistry(registry, project);
  evaluateImplementationAssetGraph(registryAssets(registry));
  if (registryIssues.length > 0) {
    return blocked({
      project,
      asset: sourceAssets.length === 1 ? sourceAssets[0] : undefined,
      blockingIssues: unique([...sourceIssues, ...registryIssues]),
      missingDecisions: ["Regenerate the implementation asset registry for the current project before generating form-mode Power Fx."]
    });
  }

  const storageIssues = currentTargetStorageIssues(project);
  if (storageIssues.length > 0) {
    return blocked({
      project,
      blockingIssues: storageIssues,
      missingDecisions: ["Repair or regenerate the current Canvas form-mode target storage before generating form-mode Power Fx."]
    });
  }

  const currentModel = buildCanvasFormModePlanningModel(project);

  if (!isCanvasProject(project)) {
    return sourceAssets.length === 0
      ? blocked({ project, status: "Not Applicable" })
      : blocked({ project, blockingIssues: [`Stored form-mode planning asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} is stale because the current project is not a Canvas app.`] });
  }

  if (currentModel.eligibilityStatus === "Not Applicable") {
    return sourceAssets.length === 0
      ? blocked({ project, status: "Not Applicable" })
      : blocked({
        project,
        blockingIssues: [`Stored form-mode planning asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} is stale because current form-mode targets are Not Applicable.`],
        missingDecisions: ["Regenerate the implementation asset registry so stale form-mode planning assets are removed."]
      });
  }

  if (currentModel.eligibilityStatus === "Blocked") {
    return blocked({
      project,
      blockingIssues: currentModel.blockingIssues,
      missingDecisions: currentModel.missingDecisions
    });
  }

  if (sourceAssets.length === 0) {
    return blocked({
      project,
      blockingIssues: [`Phase 5B.3E form-mode planning asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} does not exist.`],
      missingDecisions: ["Regenerate and approve the current Canvas form-mode planning asset."]
    });
  }
  if (sourceAssets.length > 1) {
    return blocked({
      project,
      blockingIssues: [`Implementation asset registry has ${sourceAssets.length} canonical form-mode source assets; exactly one is required.`],
      missingDecisions: ["Regenerate the implementation asset registry before generating form-mode Power Fx."]
    });
  }

  const rawAsset = sourceAssets[0];
  const canonicalAsset = canonicalCurrentFormModeAsset(project, assets);
  if (!canonicalAsset) {
    return blocked({
      project,
      asset: rawAsset,
      blockingIssues: ["Current project does not have a canonical Canvas form-mode planning asset."],
      missingDecisions: ["Regenerate the current Canvas form-mode planning asset."]
    });
  }

  if (rawAsset.assetStatus !== "Ready for Export") {
    return blocked({
      project,
      asset: rawAsset,
      blockingIssues: [`Asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} stored source status is ${rawAsset.assetStatus}; Ready for Export is required before form-mode Power Fx generation.`]
    });
  }
  if (rawAsset.approvalStatus !== "Approved") return blocked({ project, asset: rawAsset, blockingIssues: [`Asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} is not approved.`] });
  if (!sourceChecksumIsValid(rawAsset)) return blocked({ project, asset: rawAsset, blockingIssues: [`Asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} source checksum is invalid.`] });

  const contractIssues = canonicalSourceContractIssues(rawAsset, canonicalAsset, project);
  if (contractIssues.length > 0) {
    return blocked({
      project,
      asset: rawAsset,
      blockingIssues: contractIssues,
      missingDecisions: ["Regenerate and explicitly reapprove the current Canvas form-mode planning asset."]
    });
  }

  const derivedAsset = deriveImplementationAssetRegistryState(project, assets).assets.find((asset) => asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID) ?? rawAsset;
  if (derivedAsset.contentChecksum !== rawAsset.contentChecksum || derivedAsset.assetStatus !== "Ready for Export") {
    return blocked({
      project,
      asset: rawAsset,
      blockingIssues: [`Asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} approval is stale against current project state.`],
      missingDecisions: ["Regenerate the form-mode planning asset and explicitly approve the current checksum."]
    });
  }
  const dependencyIssues = unresolvedDependencyIssues(rawAsset);
  if (dependencyIssues.length > 0) return blocked({ project, asset: rawAsset, blockingIssues: dependencyIssues });
  const gateIssues = gateBlockingIssues(rawAsset);
  if (gateIssues.length > 0) return blocked({ project, asset: rawAsset, blockingIssues: gateIssues });

  const currentInputs = canonicalAsset.generationInputs?.formModeTargets ?? [];
  const rawInputs = rawAsset.generationInputs?.formModeTargets ?? [];
  if (stableStringify(rawInputs) !== stableStringify(currentInputs)) {
    return blocked({
      project,
      asset: rawAsset,
      blockingIssues: [`Asset ${CANVAS_FORM_MODE_ACTIONS_ASSET_ID} structured form-mode target inputs do not match the current project.`],
      missingDecisions: ["Regenerate and explicitly reapprove the current Canvas form-mode planning asset."]
    });
  }

  const fragmentResult = fragmentsForInputs(project, rawAsset.contentChecksum, currentInputs);
  if (fragmentResult.issues.length > 0) return blocked({ project, asset: rawAsset, inputs: currentInputs, blockingIssues: fragmentResult.issues });
  return baseResult({
    project,
    asset: rawAsset,
    inputs: currentInputs,
    fragments: fragmentResult.fragments,
    generatedChecksum: generatedChecksumFor({
      projectId: project.identity.id,
      sourceChecksum: rawAsset.contentChecksum,
      fragments: fragmentResult.fragments
    }),
    status: "Generated"
  });
}

export function generateFormModePowerFxForRegistry(project: ProjectRecord, registry: unknown): FormModePowerFxGenerationResult[] {
  const result = generateFormModePowerFxForAsset({ project, registry });
  const assets = registryAssets(registry);
  return result.status === "Not Applicable" && !assets.some((asset) => isImplementationAsset(asset) && asset.assetId === CANVAS_FORM_MODE_ACTIONS_ASSET_ID)
    ? []
    : [result];
}
