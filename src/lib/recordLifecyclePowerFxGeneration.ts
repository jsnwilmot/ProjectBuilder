import {
  buildImplementationAssetRegistry,
  calculateImplementationAssetChecksum,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetStatus,
  type ImplementationAsset,
  type ImplementationAssetApprovalStatus,
  type ImplementationAssetStatus
} from "./implementationAssets";
import {
  buildCanvasRecordLifecyclePlanningModel,
  CANVAS_RECORD_LIFECYCLE_ASSET_ID,
  CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY,
  CANVAS_RECORD_LIFECYCLE_GENERATION_VERSION,
  CANVAS_RECORD_LIFECYCLE_OPERATION,
  CANVAS_RECORD_LIFECYCLE_PLAN_PATH,
  CANVAS_RECORD_LIFECYCLE_TARGET_ID,
  type CanvasRecordLifecycleActionPlan,
  type CanvasRecordLifecycleEntityType
} from "./recordLifecyclePlanning";
import { isCanvasProject } from "./powerPlatform";
import type {
  CanvasControlTarget,
  CanvasDataSourceType,
  CanvasRecordLifecycleAction,
  CanvasStateVariableTarget,
  ConnectorFieldSchema,
  DataverseColumnSchema,
  PowerPlatformConnector,
  ProjectRecord,
  SharePointColumnSchema
} from "../types/project";

export const RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION = "phase-5b.4c.1";
export const RECORD_LIFECYCLE_POWER_FX_ASSET_ID = "asset-canvas-record-lifecycle-powerfx-onselect";
export const RECORD_LIFECYCLE_POWER_FX_ASSET_PATH = "07_Development/PowerFx/record-lifecycle/OnSelect.archive-restore.review-required.fx";
export const PERMANENT_DELETE_BLOCKER = "Permanent-delete Power Fx generation is not approved for Phase 5B.4C.";

export type RecordLifecyclePowerFxGenerationStatus = "Generated" | "Blocked" | "Not Applicable";

export interface RecordLifecyclePowerFxFragment {
  fragmentId: string;
  planId: string;
  lifecycleTargetId: string;
  action: Exclude<CanvasRecordLifecycleAction, "delete">;
  triggerScreenId: string;
  triggerControlId: string;
  triggerControlImplementationName: string;
  formulaProperty: typeof CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY;
  connectorId: string;
  entityId: string;
  entityType: CanvasRecordLifecycleEntityType;
  backendType: CanvasDataSourceType;
  recordContextType: string;
  recordContextImplementationReference: string;
  savingStateVariableId: string;
  savingStateImplementationName: string;
  lifecycleStrategy: string;
  lifecycleFieldId: string;
  lifecycleFieldImplementationName: string;
  intendedFragmentPath: string;
  formula: string;
  sourcePlanningAssetId: typeof CANVAS_RECORD_LIFECYCLE_ASSET_ID;
  approvedPlanningChecksum: string;
  formulaChecksum: string;
  generationVersion: typeof RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION;
}

export interface RecordLifecycleGeneratedPowerFxAsset {
  assetId: typeof RECORD_LIFECYCLE_POWER_FX_ASSET_ID;
  projectId: string;
  intendedPath: typeof RECORD_LIFECYCLE_POWER_FX_ASSET_PATH;
  assetStatus: ImplementationAssetStatus;
  approvalStatus: ImplementationAssetApprovalStatus;
  sourcePlanningAssetId: typeof CANVAS_RECORD_LIFECYCLE_ASSET_ID;
  sourcePlanningChecksum: string;
  generationVersion: typeof RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION;
  sourceContent: string;
  contentChecksum: string;
  sourceRecordIds: string[];
  dependencyRecordIds: string[];
  validationRequirements: string[];
  knownLimitations: string[];
}

export interface RecordLifecyclePowerFxTraceability {
  projectId: string;
  sourcePlanningAssetId: typeof CANVAS_RECORD_LIFECYCLE_ASSET_ID;
  approvedPlanningChecksum: string;
  generatedAssetId: typeof RECORD_LIFECYCLE_POWER_FX_ASSET_ID;
  orderedPlanIds: string[];
  lifecycleTargetIds: string[];
  actionTypes: Array<Exclude<CanvasRecordLifecycleAction, "delete">>;
  screenIds: string[];
  triggerControlIds: string[];
  connectorIds: string[];
  entityIds: string[];
  fieldIds: string[];
  recordContextIds: string[];
  savingStateVariableIds: string[];
  intendedFragmentPaths: string[];
  generationVersion: typeof RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION;
}

export interface RecordLifecyclePowerFxGenerationResult {
  assetId: typeof RECORD_LIFECYCLE_POWER_FX_ASSET_ID;
  projectId: string;
  targetId: typeof CANVAS_RECORD_LIFECYCLE_TARGET_ID;
  operation: typeof CANVAS_RECORD_LIFECYCLE_OPERATION;
  propertyName: typeof CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY;
  status: RecordLifecyclePowerFxGenerationStatus;
  assetStatus: ImplementationAssetStatus;
  approvalStatus: ImplementationAssetApprovalStatus;
  sourcePlanningAssetId: typeof CANVAS_RECORD_LIFECYCLE_ASSET_ID;
  sourcePlanningChecksum: string;
  generatedChecksum: string;
  orderedFormulaFragments: RecordLifecyclePowerFxFragment[];
  generatedAsset: RecordLifecycleGeneratedPowerFxAsset | null;
  blockingIssues: string[];
  missingDecisions: string[];
  warnings: string[];
  validationInstructions: string[];
  manualInstallationInstructions: string[];
  knownLimitations: string[];
  generationVersion: typeof RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION;
  traceability: RecordLifecyclePowerFxTraceability;
}

export interface RecordLifecyclePowerFxGenerationContext {
  project: unknown;
  registry?: unknown;
}

type IdentifierResolution =
  | {
      status: "Resolved";
      formula: string;
      raw: string;
    }
  | {
      status: "Blocked";
      issues: string[];
    };

type RecordContextResolution =
  | {
      status: "Resolved";
      expression: string;
      implementationReference: string;
      recordContextId: string;
    }
  | {
      status: "Blocked";
      issues: string[];
    };

type SavingStateResolution =
  | {
      status: "Resolved";
      id: string;
      implementationName: string;
    }
  | {
      status: "Blocked";
      issues: string[];
    };

const SIMPLE_POWER_FX_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const QUOTABLE_POWER_FX_IDENTIFIER_PATTERN = /^[A-Za-z0-9_ -]+(?:'[A-Za-z0-9_ -]+)*$/;
const FORMULA_LOOKING_PATTERN = /\b(?:If|IfError|Patch|Remove|RemoveIf|UpdateIf|LookUp|Filter|Set|UpdateContext|Collect|Clear|ClearCollect|SubmitForm|ResetForm|NewForm|EditForm|Navigate|Notify|Refresh|Errors|FirstError)\s*\(/i;
const INJECTED_IDENTIFIER_DELIMITERS = [";", "{", "}", "[", "]", "\\"];
const SUPPORTED_PATCH_BACKENDS = new Set<CanvasDataSourceType>(["sharePointList", "sharePointLibrary", "microsoftList"]);
const TECHNICAL_ERROR_DETAIL_PATTERN = /FirstError|ErrorInfo|Errors\(|\.Message|\.Details|\.Kind|\.Observed|\.Source/i;

const VALIDATION_INSTRUCTIONS = [
  "Paste into the approved OnSelect property.",
  "Verify the control and screen targets.",
  "Verify the connector and entity.",
  "Verify lifecycle field internal name.",
  "Verify archive and restore values.",
  "Verify saving-state behaviour.",
  "Verify success notification.",
  "Verify error notification.",
  "Verify retry after failure.",
  "Verify duplicate activation is blocked.",
  "Verify no permanent deletion occurs."
];

const KNOWN_LIMITATIONS = [
  "No navigation generation.",
  "No refresh generation.",
  "No Canvas YAML generation.",
  "No permanent-delete generation.",
  "Formula requires manual Power Apps Studio validation.",
  "Non-SharePoint connectors remain blocked unless a later approved phase adds fully confirmed generic support."
];

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

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function safeProject(context: unknown): ProjectRecord | undefined {
  return isObject(context) && isObject(context.project) ? context.project as unknown as ProjectRecord : undefined;
}

function registryAssets(registry: unknown): unknown[] {
  return isObject(registry) && Array.isArray(registry.assets) ? registry.assets : [];
}

function isImplementationAsset(value: unknown): value is ImplementationAsset {
  return isObject(value) && typeof value.assetId === "string";
}

function checksumIsValid(asset: ImplementationAsset): boolean {
  return asset.contentChecksum === calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });
}

function quotePowerFxIdentifier(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function hasInjectedDelimiter(value: string): boolean {
  return INJECTED_IDENTIFIER_DELIMITERS.some((delimiter) => value.includes(delimiter))
    || value.includes("//")
    || value.includes("/*")
    || value.includes("*/")
    || value.includes("&&")
    || value.includes("||");
}

function powerFxIdentifier(label: string, value: string, allowQuoted: boolean): IdentifierResolution {
  const raw = value.trim();
  if (!raw) return { status: "Blocked", issues: [`${label} is missing.`] };
  if (hasControlCharacter(raw)) return { status: "Blocked", issues: [`${label} contains control characters.`] };
  if (FORMULA_LOOKING_PATTERN.test(raw)) return { status: "Blocked", issues: [`${label} contains formula-looking content and is rejected.`] };
  if (hasInjectedDelimiter(raw)) return { status: "Blocked", issues: [`${label} contains unsafe delimiter content and is rejected.`] };
  if (SIMPLE_POWER_FX_IDENTIFIER_PATTERN.test(raw)) return { status: "Resolved", formula: raw, raw };
  if (!allowQuoted) return { status: "Blocked", issues: [`${label} is not a safe Power Fx variable or control identifier.`] };
  if (!QUOTABLE_POWER_FX_IDENTIFIER_PATTERN.test(raw)) return { status: "Blocked", issues: [`${label} cannot be safely quoted as a Power Fx identifier.`] };
  return { status: "Resolved", formula: quotePowerFxIdentifier(raw), raw };
}

function powerFxString(value: string): string {
  return `"${value.replace(/"/g, "\"\"").replace(/\r\n/g, "\n").replace(/\r/g, "\n")}"`;
}

function powerFxLifecycleValue(plan: CanvasRecordLifecycleActionPlan, value: string): { status: "Resolved"; formula: string } | { status: "Blocked"; issues: string[] } {
  if (hasControlCharacter(value) || FORMULA_LOOKING_PATTERN.test(value) || hasInjectedDelimiter(value)) {
    return { status: "Blocked", issues: [`Lifecycle plan ${plan.planId} lifecycle value contains unsafe formula-looking or delimiter content.`] };
  }
  if (plan.lifecycleFieldType === "boolean") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "false") return { status: "Resolved", formula: normalized };
    return { status: "Blocked", issues: [`Lifecycle plan ${plan.planId} has unsupported Boolean lifecycle value ${value || "[missing]"}.`] };
  }
  if (plan.lifecycleFieldType === "status") {
    if (value.trim().length === 0) return { status: "Blocked", issues: [`Lifecycle plan ${plan.planId} has a missing status lifecycle value.`] };
    return { status: "Resolved", formula: powerFxString(value) };
  }
  return { status: "Blocked", issues: [`Lifecycle plan ${plan.planId} has unsupported lifecycle field type ${plan.lifecycleFieldType}.`] };
}

function recordContextId(plan: CanvasRecordLifecycleActionPlan): string {
  if (plan.recordContextSource === "selectedRecordControl") return plan.selectedRecordControlId;
  if (plan.recordContextSource === "formItem") return plan.formId;
  if (plan.recordContextSource === "explicitRecordVariable") return plan.explicitRecordVariableId;
  return "";
}

function traceability(project: ProjectRecord | undefined, asset: ImplementationAsset | undefined, fragments: RecordLifecyclePowerFxFragment[], plans: CanvasRecordLifecycleActionPlan[]): RecordLifecyclePowerFxTraceability {
  return {
    projectId: project?.identity?.id ?? "",
    sourcePlanningAssetId: CANVAS_RECORD_LIFECYCLE_ASSET_ID,
    approvedPlanningChecksum: asset?.contentChecksum ?? "",
    generatedAssetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
    orderedPlanIds: plans.map((plan) => plan.planId),
    lifecycleTargetIds: plans.map((plan) => plan.lifecycleTargetId),
    actionTypes: fragments.map((fragment) => fragment.action),
    screenIds: stableUnique(plans.map((plan) => plan.triggerScreenId)),
    triggerControlIds: stableUnique(plans.map((plan) => plan.triggerControlId)),
    connectorIds: stableUnique(plans.map((plan) => plan.connectorId)),
    entityIds: stableUnique(plans.map((plan) => plan.entityId)),
    fieldIds: stableUnique(plans.map((plan) => plan.lifecycleFieldId)),
    recordContextIds: stableUnique(plans.map((plan) => recordContextId(plan))),
    savingStateVariableIds: stableUnique(plans.map((plan) => plan.savingStateVariableId)),
    intendedFragmentPaths: fragments.map((fragment) => fragment.intendedFragmentPath),
    generationVersion: RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION
  };
}

function baseResult(input: {
  project?: ProjectRecord;
  sourceAsset?: ImplementationAsset;
  status: RecordLifecyclePowerFxGenerationStatus;
  fragments?: RecordLifecyclePowerFxFragment[];
  generatedChecksum?: string;
  generatedAsset?: RecordLifecycleGeneratedPowerFxAsset | null;
  blockingIssues?: string[];
  missingDecisions?: string[];
  warnings?: string[];
  plans?: CanvasRecordLifecycleActionPlan[];
}): RecordLifecyclePowerFxGenerationResult {
  const fragments = input.fragments ?? [];
  const plans = input.plans ?? [];
  return {
    assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
    projectId: input.project?.identity?.id ?? "",
    targetId: CANVAS_RECORD_LIFECYCLE_TARGET_ID,
    operation: CANVAS_RECORD_LIFECYCLE_OPERATION,
    propertyName: CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY,
    status: input.status,
    assetStatus: input.status === "Generated" ? "Review Required" : input.status === "Not Applicable" ? "Not Applicable" : "Blocked",
    approvalStatus: "Review required",
    sourcePlanningAssetId: CANVAS_RECORD_LIFECYCLE_ASSET_ID,
    sourcePlanningChecksum: input.sourceAsset?.contentChecksum ?? "",
    generatedChecksum: input.generatedChecksum ?? "",
    orderedFormulaFragments: fragments,
    generatedAsset: input.generatedAsset ?? null,
    blockingIssues: input.blockingIssues ?? [],
    missingDecisions: input.missingDecisions ?? [],
    warnings: input.warnings ?? [],
    validationInstructions: VALIDATION_INSTRUCTIONS,
    manualInstallationInstructions: [
      "Open the confirmed Canvas app in Power Apps Studio.",
      "Paste each generated formula fragment into the approved trigger button OnSelect property.",
      "Do not create .fx files or claim publish, deployment, or production verification from these generated fragments alone."
    ],
    knownLimitations: KNOWN_LIMITATIONS,
    generationVersion: RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION,
    traceability: traceability(input.project, input.sourceAsset, fragments, plans)
  };
}

function blocked(input: Omit<Parameters<typeof baseResult>[0], "status" | "fragments" | "generatedChecksum" | "generatedAsset"> & { status?: RecordLifecyclePowerFxGenerationStatus }): RecordLifecyclePowerFxGenerationResult {
  return baseResult({
    ...input,
    status: input.status ?? "Blocked",
    fragments: [],
    generatedChecksum: "",
    generatedAsset: null,
    blockingIssues: unique(input.blockingIssues ?? ["Record lifecycle Power Fx generation is blocked."])
  });
}

function canonicalSourceAsset(project: ProjectRecord, registry: unknown): ImplementationAsset | undefined {
  const assets = registryAssets(registry).filter(isImplementationAsset);
  return deriveImplementationAssetRegistryState(project, assets).assets.find((asset) => asset.assetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID)
    ?? buildImplementationAssetRegistry(project, "2026-07-20T00:00:00.000Z").assets.find((asset) => asset.assetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID);
}

function sourcePreflightIssues(rawAssets: ImplementationAsset[], project: ProjectRecord, canonicalAsset: ImplementationAsset): string[] {
  if (rawAssets.length === 0) return [`Required source planning asset ${CANVAS_RECORD_LIFECYCLE_ASSET_ID} is missing.`];
  if (rawAssets.length > 1) return [`Implementation asset registry has ${rawAssets.length} record-lifecycle source assets; exactly one is required.`];
  const asset = rawAssets[0];
  const issues: string[] = [];
  if (asset.projectId !== project.identity.id) issues.push(`Asset ${asset.assetId} belongs to project ${asset.projectId || "[missing]"}, not current project ${project.identity.id}.`);
  if (asset.assetId !== CANVAS_RECORD_LIFECYCLE_ASSET_ID) issues.push(`Asset ID ${asset.assetId || "[missing]"} is not ${CANVAS_RECORD_LIFECYCLE_ASSET_ID}.`);
  if (asset.targetId !== CANVAS_RECORD_LIFECYCLE_TARGET_ID) issues.push(`Asset target ID ${asset.targetId || "[missing]"} is not ${CANVAS_RECORD_LIFECYCLE_TARGET_ID}.`);
  if (asset.generationInputs?.operation !== CANVAS_RECORD_LIFECYCLE_OPERATION) issues.push(`Asset operation ${asset.generationInputs?.operation || "[missing]"} is not ${CANVAS_RECORD_LIFECYCLE_OPERATION}.`);
  if (asset.approvedPropertyName !== CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY) issues.push(`Asset approved property ${asset.approvedPropertyName || "[missing]"} is not ${CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY}.`);
  if (asset.generationInputs?.formulaProperty !== CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY) issues.push(`Asset formula property ${asset.generationInputs?.formulaProperty || "[missing]"} is not ${CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY}.`);
  if (asset.platform !== "Power Apps Canvas") issues.push(`Asset platform ${asset.platform || "[missing]"} is not Power Apps Canvas.`);
  if (asset.assetCategory !== "Power Fx") issues.push(`Asset category ${asset.assetCategory || "[missing]"} is not Power Fx.`);
  if (asset.assetType !== "powerFxPlan") issues.push(`Asset type ${asset.assetType || "[missing]"} is not powerFxPlan.`);
  if (asset.intendedPath !== CANVAS_RECORD_LIFECYCLE_PLAN_PATH) issues.push(`Asset intended path ${asset.intendedPath || "[missing]"} is not ${CANVAS_RECORD_LIFECYCLE_PLAN_PATH}.`);
  if (asset.generationVersion !== CANVAS_RECORD_LIFECYCLE_GENERATION_VERSION) issues.push(`Asset generation version ${asset.generationVersion || "[missing]"} is not ${CANVAS_RECORD_LIFECYCLE_GENERATION_VERSION}.`);
  if (asset.generationInputs?.planningGenerationVersion !== CANVAS_RECORD_LIFECYCLE_GENERATION_VERSION) issues.push("Asset planning generation version is stale or malformed.");
  if (asset.assetStatus !== "Ready for Export") issues.push(`Asset ${CANVAS_RECORD_LIFECYCLE_ASSET_ID} stored source status is ${asset.assetStatus}; Ready for Export is required.`);
  if (evaluateImplementationAssetStatus(asset) !== "Ready for Export") issues.push(`Asset ${CANVAS_RECORD_LIFECYCLE_ASSET_ID} recalculated status is ${evaluateImplementationAssetStatus(asset)}; Ready for Export is required.`);
  if (asset.approvalStatus !== "Approved") issues.push(`Asset ${CANVAS_RECORD_LIFECYCLE_ASSET_ID} is not approved.`);
  if (!checksumIsValid(asset)) issues.push(`Asset ${CANVAS_RECORD_LIFECYCLE_ASSET_ID} source checksum is invalid.`);
  if (asset.contentChecksum !== canonicalAsset.contentChecksum) issues.push("Asset approved checksum does not match the current canonical record-lifecycle planning checksum.");
  if (stableStringify(asset.requiredGateIds) !== stableStringify(canonicalAsset.requiredGateIds)) issues.push("Asset required gates do not match the current canonical lifecycle gates.");
  if (stableStringify(asset.gateEvaluationSnapshot) !== stableStringify(canonicalAsset.gateEvaluationSnapshot)) issues.push("Asset gate snapshot does not match current canonical gate evaluation.");
  if (stableStringify(asset.dependencies) !== stableStringify(canonicalAsset.dependencies)) issues.push("Asset dependencies do not match current canonical lifecycle dependencies.");
  if (stableStringify(asset.sourceRecordIds) !== stableStringify(canonicalAsset.sourceRecordIds)) issues.push("Asset source record IDs do not match current canonical lifecycle targets.");
  if (stableStringify(asset.generationInputs?.recordLifecyclePlans ?? []) !== stableStringify(canonicalAsset.generationInputs?.recordLifecyclePlans ?? [])) issues.push("Asset structured lifecycle planning inputs do not match the current project.");
  return unique(issues);
}

function resolveRecordContext(project: ProjectRecord, plan: CanvasRecordLifecycleActionPlan): RecordContextResolution {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) return { status: "Blocked", issues: ["Canvas envelope is missing."] };
  if (plan.recordContextSource === "selectedRecordControl") {
    const control = canvas.controlTargets.find((candidate) => candidate.id === plan.selectedRecordControlId);
    const name = powerFxIdentifier(`Lifecycle plan ${plan.planId} selected-record control implementation name`, control?.approvedControlName ?? "", false);
    const issues = [
      ...(control && control.screenId === plan.triggerScreenId ? [] : [`Lifecycle plan ${plan.planId} selected-record control is missing or on the wrong screen.`]),
      ...(control?.confirmationStatus === "confirmed" ? [] : [`Lifecycle plan ${plan.planId} selected-record control is not confirmed.`]),
      ...(name.status === "Blocked" ? name.issues : [])
    ];
    return issues.length === 0 && name.status === "Resolved"
      ? { status: "Resolved", expression: `${name.formula}.Selected`, implementationReference: name.raw, recordContextId: plan.selectedRecordControlId }
      : { status: "Blocked", issues };
  }
  if (plan.recordContextSource === "formItem") {
    const control = canvas.controlTargets.find((candidate) => candidate.id === plan.formId);
    const name = powerFxIdentifier(`Lifecycle plan ${plan.planId} form implementation name`, control?.approvedControlName ?? "", false);
    const issues = [
      ...(control && control.screenId === plan.triggerScreenId ? [] : [`Lifecycle plan ${plan.planId} form item control is missing or on the wrong screen.`]),
      ...(control?.confirmationStatus === "confirmed" ? [] : [`Lifecycle plan ${plan.planId} form item control is not confirmed.`]),
      ...(["form", "editform", "edit form"].includes((control?.controlType ?? "").trim().toLowerCase()) ? [] : [`Lifecycle plan ${plan.planId} form item context does not reference a form control.`]),
      ...(name.status === "Blocked" ? name.issues : [])
    ];
    return issues.length === 0 && name.status === "Resolved"
      ? { status: "Resolved", expression: `${name.formula}.Item`, implementationReference: name.raw, recordContextId: plan.formId }
      : { status: "Blocked", issues };
  }
  if (plan.recordContextSource === "explicitRecordVariable") {
    const variable = canvas.stateVariableTargets.find((candidate) => candidate.id === plan.explicitRecordVariableId) as CanvasStateVariableTarget | undefined;
    const name = powerFxIdentifier(`Lifecycle plan ${plan.planId} explicit record variable implementation name`, variable?.implementationName ?? "", false);
    const issues = [
      ...(variable ? [] : [`Lifecycle plan ${plan.planId} explicit record variable is missing.`]),
      ...(variable?.confirmationStatus === "confirmed" ? [] : [`Lifecycle plan ${plan.planId} explicit record variable is not confirmed.`]),
      ...(name.status === "Blocked" ? name.issues : [])
    ];
    return issues.length === 0 && name.status === "Resolved"
      ? { status: "Resolved", expression: name.formula, implementationReference: name.raw, recordContextId: plan.explicitRecordVariableId }
      : { status: "Blocked", issues };
  }
  return { status: "Blocked", issues: [`Lifecycle plan ${plan.planId} has unsupported record-context source ${plan.recordContextSource}.`] };
}

function resolveSavingState(project: ProjectRecord, plan: CanvasRecordLifecycleActionPlan): SavingStateResolution {
  const canvas = project.powerPlatform?.canvas;
  const variables = canvas?.stateVariableTargets.filter((variable) => variable.stateRole === "savingState") ?? [];
  const plannedVariable = variables.find((variable) => variable.id === plan.savingStateVariableId);
  const name = powerFxIdentifier(`Lifecycle plan ${plan.planId} saving-state variable implementation name`, plannedVariable?.implementationName ?? plan.savingStateImplementationName, false);
  const validVariables = variables.filter((variable) =>
    variable.confirmationStatus === "confirmed"
    && variable.initialValue.kind === "boolean"
    && variable.initialValue.value === false
    && powerFxIdentifier("saving-state variable", variable.implementationName, false).status === "Resolved"
  );
  const issues = [
    ...(variables.length === 0 ? [`Lifecycle plan ${plan.planId} requires a confirmed saving-state variable.`] : []),
    ...(validVariables.length > 1 ? [`Lifecycle plan ${plan.planId} has multiple applicable saving-state variables and cannot resolve one deterministically.`] : []),
    ...(plannedVariable ? [] : [`Lifecycle plan ${plan.planId} saving-state variable ${plan.savingStateVariableId || "[missing]"} is missing.`]),
    ...(plannedVariable?.confirmationStatus === "confirmed" ? [] : [`Lifecycle plan ${plan.planId} saving-state variable is not confirmed.`]),
    ...(plannedVariable?.initialValue.kind === "boolean" && plannedVariable.initialValue.value === false ? [] : [`Lifecycle plan ${plan.planId} saving-state variable initialValue must be Boolean false.`]),
    ...(name.status === "Blocked" ? name.issues : [])
  ];
  if (issues.length > 0 || name.status === "Blocked" || !plannedVariable) return { status: "Blocked", issues };
  return { status: "Resolved", id: plannedVariable.id, implementationName: name.raw };
}

function connectorFor(project: ProjectRecord, plan: CanvasRecordLifecycleActionPlan): PowerPlatformConnector | undefined {
  return project.powerPlatform?.common.connectors.find((connector) => connector.id === plan.connectorId);
}

function dataSourceName(project: ProjectRecord, plan: CanvasRecordLifecycleActionPlan): IdentifierResolution {
  const connector = connectorFor(project, plan);
  const name = powerFxIdentifier(`Lifecycle plan ${plan.planId} data-source implementation name`, connector?.dataSourceName ?? "", true);
  const issues = [
    ...(connector ? [] : [`Lifecycle plan ${plan.planId} connector ${plan.connectorId || "[missing]"} is missing.`]),
    ...(connector?.supportedOperations.update ? [] : [`Lifecycle plan ${plan.planId} connector does not currently support update.`]),
    ...(connector?.dataSourceType === "sharePointList" || connector?.dataSourceType === "sharePointLibrary" || connector?.dataSourceType === "microsoftList" ? [] : [`Lifecycle plan ${plan.planId} backend ${connector?.dataSourceType || "[missing]"} is not approved for Phase 5B.4C archive or restore Power Fx generation.`]),
    ...(name.status === "Blocked" ? name.issues : [])
  ];
  return issues.length === 0 && name.status === "Resolved" ? name : { status: "Blocked", issues };
}

function fieldFor(project: ProjectRecord, plan: CanvasRecordLifecycleActionPlan): SharePointColumnSchema | DataverseColumnSchema | ConnectorFieldSchema | undefined {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas || !plan.lifecycleFieldId) return undefined;
  if (plan.entityType === "sharePointList" || plan.entityType === "sharePointLibrary") {
    return canvas.sharePointColumnSchemas.find((field) => field.id === plan.lifecycleFieldId && field.parentId === plan.entityId && field.confirmationStatus === "confirmed");
  }
  if (plan.entityType === "dataverseTable") {
    return canvas.dataverseColumnSchemas.find((field) => field.id === plan.lifecycleFieldId && field.tableId === plan.entityId && field.confirmationStatus === "confirmed");
  }
  return canvas.connectorFieldSchemas.find((field) =>
    field.id === plan.lifecycleFieldId
    && field.resourceId === plan.entityId
    && field.connectorId === plan.connectorId
    && field.confirmationStatus === "confirmed"
  );
}

function textFieldIsSupported(field: SharePointColumnSchema | DataverseColumnSchema | ConnectorFieldSchema): boolean {
  const typeValue = "columnType" in field ? field.columnType : "dataType" in field ? field.dataType : field.fieldType;
  return /\b(text|string|single line|multiple lines)\b/i.test(typeValue) && !/\b(choice|option|lookup|person|user|record|table|polymorphic)\b/i.test(typeValue);
}

function booleanFieldIsSupported(field: SharePointColumnSchema | DataverseColumnSchema | ConnectorFieldSchema): boolean {
  const typeValue = "columnType" in field ? field.columnType : "dataType" in field ? field.dataType : field.fieldType;
  return /\b(boolean|yes\/no|true\/false|two options)\b/i.test(typeValue);
}

function resolveField(project: ProjectRecord, plan: CanvasRecordLifecycleActionPlan): IdentifierResolution {
  const field = fieldFor(project, plan);
  if (!field) return { status: "Blocked", issues: [`Lifecycle plan ${plan.planId} lifecycle field ${plan.lifecycleFieldId || "[missing]"} is missing, unconfirmed, or belongs to another entity.`] };
  const rawIdentifier = "internalName" in field ? field.internalName.trim() : "logicalName" in field ? field.logicalName.trim() : field.fieldIdentifier.trim();
  const fieldName = powerFxIdentifier(`Lifecycle plan ${plan.planId} lifecycle field implementation name`, rawIdentifier, true);
  const issues = [
    ...(fieldName.status === "Blocked" ? fieldName.issues : []),
    ...(plan.entityType === "sharePointList" || plan.entityType === "sharePointLibrary" ? [] : [`Lifecycle plan ${plan.planId} uses a non-SharePoint lifecycle field; generation is blocked in Phase 5B.4C.1.`]),
    ...(plan.lifecycleFieldType === "status" && !textFieldIsSupported(field) ? [`Lifecycle plan ${plan.planId} status generation requires a confirmed plain text-compatible field; complex choice, option-set, lookup, person, and record fields are blocked.`] : []),
    ...(plan.lifecycleFieldType === "boolean" && !booleanFieldIsSupported(field) ? [`Lifecycle plan ${plan.planId} Boolean generation requires a confirmed Boolean-compatible field.`] : [])
  ];
  return issues.length === 0 && fieldName.status === "Resolved" ? fieldName : { status: "Blocked", issues };
}

function pathFor(plan: CanvasRecordLifecycleActionPlan): string {
  return `07_Development/PowerFx/${plan.triggerScreenId}/${plan.triggerControlId}/OnSelect.record-lifecycle.fx`;
}

function successMessage(action: Exclude<CanvasRecordLifecycleAction, "delete">): string {
  return action === "archive" ? "Record archived successfully." : "Record restored successfully.";
}

function failureMessage(action: Exclude<CanvasRecordLifecycleAction, "delete">): string {
  return action === "archive"
    ? "The record could not be archived. No changes were completed."
    : "The record could not be restored. No changes were completed.";
}

function planShapeIssues(plans: CanvasRecordLifecycleActionPlan[]): string[] {
  const planIds = new Map<string, number>();
  const targetIds = new Map<string, number>();
  const issues: string[] = [];
  plans.forEach((plan) => {
    planIds.set(plan.planId, (planIds.get(plan.planId) ?? 0) + 1);
    targetIds.set(plan.lifecycleTargetId, (targetIds.get(plan.lifecycleTargetId) ?? 0) + 1);
    if (plan.planningStatus !== "Planned") issues.push(`Lifecycle plan ${plan.planId || "[missing]"} is not Planned.`);
    if (plan.blockers.length > 0) issues.push(`Lifecycle plan ${plan.planId} has blockers.`);
    if (plan.triggerProperty !== CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY) issues.push(`Lifecycle plan ${plan.planId} property is not OnSelect.`);
    if (plan.refreshRequirement !== "notPlanned" || plan.navigationRequirement !== "notPlanned") {
      issues.push(`Lifecycle plan ${plan.planId} contains refresh or navigation behaviour that is outside Phase 5B.4C.1.`);
    }
    if (plan.actionType === "delete") issues.push(PERMANENT_DELETE_BLOCKER);
    if ((plan.actionType === "archive" || plan.actionType === "restore")
      && (
        plan.generatedOperationEligibility !== "archiveRestoreSupported"
        || plan.errorHandlingRequirement !== "ifError"
        || plan.duplicateSubmissionGuardRequirement !== "savingState"
        || plan.standardNotificationRequirement !== "archiveRestoreResultNotification"
      )) {
      issues.push(`Lifecycle plan ${plan.planId} does not contain the approved archive/restore generation requirements.`);
    }
  });
  issues.push(...[...planIds.entries()].filter(([, count]) => count > 1).map(([id]) => `Duplicate lifecycle plan ID: ${id}.`));
  issues.push(...[...targetIds.entries()].filter(([, count]) => count > 1).map(([id]) => `Duplicate lifecycle target ID: ${id}.`));
  return unique(issues);
}

function savingStatePreflightIssues(project: ProjectRecord, plans: CanvasRecordLifecycleActionPlan[]): string[] {
  const needsGeneratedMutation = plans.some((plan) => plan.actionType === "archive" || plan.actionType === "restore");
  if (!needsGeneratedMutation) return [];
  const variables = project.powerPlatform?.canvas?.stateVariableTargets.filter((variable) => variable.stateRole === "savingState") ?? [];
  if (variables.length === 0) {
    return ["Record lifecycle archive or restore generation requires exactly one confirmed saving-state variable with Boolean false initialValue."];
  }
  const validVariables = variables.filter((variable) =>
    variable.confirmationStatus === "confirmed"
    && variable.initialValue.kind === "boolean"
    && variable.initialValue.value === false
    && powerFxIdentifier("saving-state variable", variable.implementationName, false).status === "Resolved"
  );
  if (validVariables.length > 1) {
    return ["Record lifecycle archive or restore generation found more than one applicable confirmed saving-state variable and cannot resolve one deterministically."];
  }
  return unique(variables.flatMap((variable) => {
    const issues: string[] = [];
    if (variable.confirmationStatus !== "confirmed") issues.push(`Saving-state variable ${variable.id} is not confirmed.`);
    if (variable.initialValue.kind !== "boolean" || variable.initialValue.value !== false) issues.push(`Saving-state variable ${variable.id} initialValue must be Boolean false.`);
    const name = powerFxIdentifier(`Saving-state variable ${variable.id} implementation name`, variable.implementationName, false);
    if (name.status === "Blocked") issues.push(...name.issues);
    return issues;
  }));
}

function formulaFor(project: ProjectRecord, plan: CanvasRecordLifecycleActionPlan): { status: "Generated"; fragment: RecordLifecyclePowerFxFragment } | { status: "Blocked"; issues: string[] } {
  if (plan.actionType === "delete") return { status: "Blocked", issues: [PERMANENT_DELETE_BLOCKER] };
  const trigger = project.powerPlatform?.canvas?.controlTargets.find((control) => control.id === plan.triggerControlId) as CanvasControlTarget | undefined;
  const triggerName = powerFxIdentifier(`Lifecycle plan ${plan.planId} trigger control implementation name`, trigger?.approvedControlName ?? "", false);
  const recordContext = resolveRecordContext(project, plan);
  const savingState = resolveSavingState(project, plan);
  const dataSource = dataSourceName(project, plan);
  const field = resolveField(project, plan);
  const expected = powerFxLifecycleValue(plan, plan.expectedCurrentLifecycleValue);
  const target = powerFxLifecycleValue(plan, plan.targetLifecycleValue);
  const backendIssues = SUPPORTED_PATCH_BACKENDS.has(plan.backendType)
    ? []
    : [`Lifecycle plan ${plan.planId} backend ${plan.backendType} does not have an approved SharePoint Patch syntax contract.`];
  const operationIssues = plan.connectorOperationCapability === "update" && plan.connectorOperationType === "updateRecord"
    ? []
    : [`Lifecycle plan ${plan.planId} update operation contract is not current.`];
  const issues = [
    ...(trigger ? [] : [`Lifecycle plan ${plan.planId} trigger control ${plan.triggerControlId || "[missing]"} is missing.`]),
    ...(trigger?.confirmationStatus === "confirmed" ? [] : [`Lifecycle plan ${plan.planId} trigger control is not confirmed.`]),
    ...(triggerName.status === "Blocked" ? triggerName.issues : []),
    ...(recordContext.status === "Blocked" ? recordContext.issues : []),
    ...(savingState.status === "Blocked" ? savingState.issues : []),
    ...(dataSource.status === "Blocked" ? dataSource.issues : []),
    ...(field.status === "Blocked" ? field.issues : []),
    ...(expected.status === "Blocked" ? expected.issues : []),
    ...(target.status === "Blocked" ? target.issues : []),
    ...backendIssues,
    ...operationIssues
  ];
  if (
    issues.length > 0
    || triggerName.status === "Blocked"
    || recordContext.status === "Blocked"
    || savingState.status === "Blocked"
    || dataSource.status === "Blocked"
    || field.status === "Blocked"
    || expected.status === "Blocked"
    || target.status === "Blocked"
  ) {
    return { status: "Blocked", issues };
  }

  const formula = [
    "If(",
    `  !${savingState.implementationName},`,
    "  If(",
    `    !IsBlank(${recordContext.expression}),`,
    "    If(",
    `      ${recordContext.expression}.${field.formula} = ${expected.formula},`,
    `      Set(${savingState.implementationName}, true);`,
    "      IfError(",
    `        Patch(${dataSource.formula}, ${recordContext.expression}, { ${field.formula}: ${target.formula} }),`,
    `        Set(${savingState.implementationName}, false);`,
    `        Notify(${powerFxString(failureMessage(plan.actionType))}, NotificationType.Error),`,
    `        Set(${savingState.implementationName}, false);`,
    `        Notify(${powerFxString(successMessage(plan.actionType))}, NotificationType.Success)`,
    "      )",
    "    )",
    "  )",
    ")",
    ""
  ].join("\n");

  if (TECHNICAL_ERROR_DETAIL_PATTERN.test(formula)) {
    return { status: "Blocked", issues: [`Lifecycle plan ${plan.planId} generated formula would expose technical error details.`] };
  }
  const intendedFragmentPath = pathFor(plan);
  const formulaChecksum = fnv1a(formula);
  return {
    status: "Generated",
    fragment: {
      fragmentId: `record-lifecycle-fragment-${plan.lifecycleTargetId}`,
      planId: plan.planId,
      lifecycleTargetId: plan.lifecycleTargetId,
      action: plan.actionType,
      triggerScreenId: plan.triggerScreenId,
      triggerControlId: plan.triggerControlId,
      triggerControlImplementationName: triggerName.raw,
      formulaProperty: CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY,
      connectorId: plan.connectorId,
      entityId: plan.entityId,
      entityType: plan.entityType,
      backendType: plan.backendType,
      recordContextType: plan.recordContextType,
      recordContextImplementationReference: recordContext.implementationReference,
      savingStateVariableId: savingState.id,
      savingStateImplementationName: savingState.implementationName,
      lifecycleStrategy: plan.lifecycleStrategy,
      lifecycleFieldId: plan.lifecycleFieldId,
      lifecycleFieldImplementationName: field.raw,
      intendedFragmentPath,
      formula,
      sourcePlanningAssetId: CANVAS_RECORD_LIFECYCLE_ASSET_ID,
      approvedPlanningChecksum: "",
      formulaChecksum,
      generationVersion: RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION
    }
  };
}

function buildGeneratedAsset(project: ProjectRecord, sourceAsset: ImplementationAsset, fragments: RecordLifecyclePowerFxFragment[], generatedChecksum: string): RecordLifecycleGeneratedPowerFxAsset {
  const sourceContent = fragments.map((fragment) =>
    [
      `// ${fragment.action} / ${fragment.triggerScreenId} / ${fragment.triggerControlId} / ${CANVAS_RECORD_LIFECYCLE_FORMULA_PROPERTY}`,
      fragment.formula
    ].join("\n")
  ).join("\n");
  return {
    assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
    projectId: project.identity.id,
    intendedPath: RECORD_LIFECYCLE_POWER_FX_ASSET_PATH,
    assetStatus: "Review Required",
    approvalStatus: "Review required",
    sourcePlanningAssetId: CANVAS_RECORD_LIFECYCLE_ASSET_ID,
    sourcePlanningChecksum: sourceAsset.contentChecksum,
    generationVersion: RECORD_LIFECYCLE_POWER_FX_GENERATION_VERSION,
    sourceContent,
    contentChecksum: generatedChecksum,
    sourceRecordIds: sourceAsset.sourceRecordIds,
    dependencyRecordIds: stableUnique([
      ...fragments.flatMap((fragment) => [
        fragment.connectorId,
        fragment.entityId,
        fragment.lifecycleFieldId,
        fragment.triggerScreenId,
        fragment.triggerControlId,
        fragment.savingStateVariableId
      ])
    ]),
    validationRequirements: VALIDATION_INSTRUCTIONS,
    knownLimitations: KNOWN_LIMITATIONS
  };
}

export function generateCanvasRecordLifecyclePowerFx(context: unknown): RecordLifecyclePowerFxGenerationResult {
  const project = safeProject(context);
  if (!project) return blocked({ blockingIssues: ["Record lifecycle Power Fx generation requires a valid context with a project record."] });
  const planning = buildCanvasRecordLifecyclePlanningModel(project);
  if (planning.planningStatus === "Blocked") return blocked({ project, blockingIssues: planning.blockingIssues, missingDecisions: planning.missingDecisions, plans: [] });
  if (planning.planningStatus === "Not Applicable") return baseResult({ project, status: "Not Applicable", plans: [] });
  if (!isCanvasProject(project)) return baseResult({ project, status: "Not Applicable", plans: [] });
  if (planning.plans.length === 0) return baseResult({ project, status: "Not Applicable", plans: [] });

  const contextObject = context as RecordLifecyclePowerFxGenerationContext;
  const registry = contextObject.registry;
  if (!isObject(registry) || !Array.isArray(registry.assets)) {
    return blocked({ project, blockingIssues: ["Implementation asset registry is missing or malformed."], plans: planning.plans });
  }

  const sourceAssets = registry.assets.filter(isImplementationAsset).filter((asset) => asset.assetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID);
  const currentAsset = canonicalSourceAsset(project, registry);
  if (!currentAsset) return blocked({ project, blockingIssues: [`Current canonical source asset ${CANVAS_RECORD_LIFECYCLE_ASSET_ID} is not available.`], plans: planning.plans });
  const preflightIssues = sourcePreflightIssues(sourceAssets, project, currentAsset);
  const shapeIssues = [...planShapeIssues(planning.plans), ...savingStatePreflightIssues(project, planning.plans)];
  if (preflightIssues.length > 0 || shapeIssues.length > 0) {
    return blocked({ project, sourceAsset: sourceAssets[0], blockingIssues: [...preflightIssues, ...shapeIssues], missingDecisions: planning.missingDecisions, plans: planning.plans });
  }

  const generated: RecordLifecyclePowerFxFragment[] = [];
  const formulaIssues: string[] = [];
  for (const plan of planning.plans) {
    const result = formulaFor(project, plan);
    if (result.status === "Blocked") {
      formulaIssues.push(...result.issues);
    } else {
      generated.push({
        ...result.fragment,
        approvedPlanningChecksum: currentAsset.contentChecksum
      });
    }
  }
  if (formulaIssues.length > 0) {
    return blocked({ project, sourceAsset: currentAsset, blockingIssues: formulaIssues, missingDecisions: planning.missingDecisions, plans: planning.plans });
  }

  const generatedChecksum = fnv1a(stableStringify({
    generatedAssetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
    generatedAssetPath: RECORD_LIFECYCLE_POWER_FX_ASSET_PATH,
    sourcePlanningChecksum: currentAsset.contentChecksum,
    fragments: generated.map((fragment) => ({
      id: fragment.fragmentId,
      path: fragment.intendedFragmentPath,
      checksum: fragment.formulaChecksum,
      formula: fragment.formula
    }))
  }));
  const generatedAsset = buildGeneratedAsset(project, currentAsset, generated, generatedChecksum);
  return baseResult({
    project,
    sourceAsset: currentAsset,
    status: "Generated",
    fragments: generated,
    generatedChecksum,
    generatedAsset,
    missingDecisions: planning.missingDecisions,
    warnings: [
      "Generated formula fragments are developer inputs only and are not installed, published, deployed, or validated in Power Apps Studio by Project Builder Ai."
    ],
    plans: planning.plans
  });
}
