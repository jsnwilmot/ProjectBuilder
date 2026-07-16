import {
  calculateImplementationAssetChecksum,
  deriveImplementationAssetRegistryState,
  evaluateImplementationAssetStatus,
  parseFormulaProperties,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "./implementationAssets";
import { isCanvasProject } from "./powerPlatform";
import {
  CANVAS_NAVIGATION_TRANSITIONS,
  type CanvasControlTarget,
  type CanvasNavigationTransition,
  type CanvasScreenTarget,
  type ProjectRecord
} from "../types/project";

export const POWER_FX_GENERATION_VERSION = "phase-5b.1";
export const POWER_FX_NAVIGATION_TRANSITIONS = CANVAS_NAVIGATION_TRANSITIONS;
export type PowerFxNavigationTransition = Exclude<CanvasNavigationTransition, "">;
export type PowerFxOperation = "navigation" | (string & {});
export type PowerFxGenerationStatus = "Not Applicable" | "Blocked" | "Review Required" | "Generated";

export interface PowerFxGenerationResult {
  assetId: string;
  projectId: string;
  targetId: string;
  screenId: string;
  controlId: string;
  destinationScreenId: string;
  propertyName: string;
  operation: PowerFxOperation;
  intendedPath: string;
  formula: string;
  status: PowerFxGenerationStatus;
  sourceChecksum: string;
  generatedChecksum: string;
  dependencies: string[];
  warnings: string[];
  blockingIssues: string[];
  missingDecisions: string[];
  validationInstructions: string[];
  manualInstallationInstructions: string[];
  generationVersion: string;
}

interface PowerFxGenerationContext {
  project: ProjectRecord;
  registry: ImplementationAssetRegistry;
  assetId: string;
  generatedAt?: string;
}

const SUPPORTED_NAVIGATION_PROPERTIES = new Set(["OnSelect", "OnSuccess"]);

const TRANSITION_MAP: Record<PowerFxNavigationTransition, string> = {
  None: "ScreenTransition.None",
  Cover: "ScreenTransition.Cover",
  CoverRight: "ScreenTransition.CoverRight",
  Fade: "ScreenTransition.Fade",
  UnCover: "ScreenTransition.UnCover",
  UnCoverRight: "ScreenTransition.UnCoverRight"
};

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

function isSupportedTransition(value: string): value is PowerFxNavigationTransition {
  return (CANVAS_NAVIGATION_TRANSITIONS as readonly string[]).includes(value);
}

function powerFxIdentifier(implementationName: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(implementationName)) return implementationName;
  return `'${implementationName.replace(/'/g, "''")}'`;
}

function dependencyIds(asset: ImplementationAsset | undefined): string[] {
  return asset?.dependencies.map((dependency) => dependency.id).sort() ?? [];
}

function baseResult(input: {
  project: ProjectRecord;
  asset?: ImplementationAsset;
  assetId: string;
  control?: CanvasControlTarget;
  screen?: CanvasScreenTarget;
  destinationScreenId?: string;
  operation?: PowerFxOperation;
  propertyName?: string;
  status: PowerFxGenerationStatus;
  blockingIssues?: string[];
  missingDecisions?: string[];
  warnings?: string[];
  formula?: string;
  generatedChecksum?: string;
}): PowerFxGenerationResult {
  return {
    assetId: input.asset?.assetId ?? input.assetId,
    projectId: input.project.identity.id,
    targetId: input.asset?.targetId ?? input.control?.id ?? "",
    screenId: input.screen?.id ?? input.control?.screenId ?? "",
    controlId: input.control?.id ?? input.asset?.targetId ?? "",
    destinationScreenId: input.destinationScreenId ?? "",
    propertyName: input.propertyName ?? input.asset?.approvedPropertyName ?? "",
    operation: input.operation ?? "",
    intendedPath: input.asset?.intendedPath ?? "",
    formula: input.formula ?? "",
    status: input.status,
    sourceChecksum: input.asset?.contentChecksum ?? "",
    generatedChecksum: input.generatedChecksum ?? "",
    dependencies: dependencyIds(input.asset),
    warnings: input.warnings ?? [],
    blockingIssues: input.blockingIssues ?? [],
    missingDecisions: input.missingDecisions ?? [],
    validationInstructions: [
      "Validate the generated formula in Power Apps Studio before claiming implementation complete.",
      "Confirm navigation behavior from the source control to the destination screen."
    ],
    manualInstallationInstructions: [
      "Open the confirmed Canvas app in Power Apps Studio.",
      "Paste the formula into the confirmed control property.",
      "Do not claim publish, deployment, or production verification from this generated source alone."
    ],
    generationVersion: POWER_FX_GENERATION_VERSION
  };
}

function blocked(input: Omit<Parameters<typeof baseResult>[0], "status"> & { status?: PowerFxGenerationStatus }): PowerFxGenerationResult {
  return baseResult({
    ...input,
    formula: "",
    generatedChecksum: "",
    status: input.status ?? "Blocked"
  });
}

function sourceChecksumIsValid(asset: ImplementationAsset): boolean {
  return asset.contentChecksum === calculateImplementationAssetChecksum({ ...asset, contentChecksum: "" });
}

function confirmedScreen(project: ProjectRecord, screenId: string): CanvasScreenTarget | undefined {
  return project.powerPlatform?.canvas?.screenTargets.find((screen) => screen.id === screenId && screen.confirmationStatus === "confirmed");
}

function confirmedControl(project: ProjectRecord, controlId: string): CanvasControlTarget | undefined {
  return project.powerPlatform?.canvas?.controlTargets.find((control) => control.id === controlId && control.confirmationStatus === "confirmed");
}

function currentControlHasProperty(control: CanvasControlTarget | undefined, propertyName: string): boolean {
  return Boolean(control && propertyName && parseFormulaProperties(control.formulaProperties).includes(propertyName));
}

function resolveTransition(control: CanvasControlTarget): { transition?: PowerFxNavigationTransition; issue?: string; missingDecision?: string } {
  const rawTransition = control.navigationTransition;
  if (rawTransition) {
    if (isSupportedTransition(rawTransition)) return { transition: rawTransition };
    return { issue: `Navigation transition ${rawTransition} is not supported.` };
  }
  const defaultRule = control.navigationTransitionDefaultRule;
  if (defaultRule === "defaultToNoneWhenBlank") return { transition: "None" };
  return {
    issue: "Navigation transition is missing.",
    missingDecision: "Confirm a navigation transition or explicitly approve the defaultToNoneWhenBlank rule."
  };
}

function resolveDestination(project: ProjectRecord, control: CanvasControlTarget): { destination?: CanvasScreenTarget; destinationScreenId: string; issues: string[]; missingDecisions: string[] } {
  const destinationScreenId = control.navigationDestinationScreenId.trim();
  if (!destinationScreenId) {
    return {
      destinationScreenId,
      issues: ["Navigation destination screen ID is missing."],
      missingDecisions: ["Confirm the structured navigationDestinationScreenId for this control."]
    };
  }
  const destination = project.powerPlatform?.canvas?.screenTargets.find((screen) => screen.id === destinationScreenId);
  if (!destination) {
    return {
      destinationScreenId,
      issues: [`Navigation destination screen ${destinationScreenId} does not exist.`],
      missingDecisions: [`Add or correct the structured destination screen ${destinationScreenId}.`]
    };
  }
  if (destination.confirmationStatus !== "confirmed") {
    return {
      destinationScreenId,
      issues: [`Navigation destination screen ${destinationScreenId} is not confirmed.`],
      missingDecisions: [`Confirm destination screen ${destinationScreenId}.`]
    };
  }
  if (!destination.approvedScreenName.trim()) {
    return {
      destinationScreenId,
      issues: [`Navigation destination screen ${destinationScreenId} is missing a confirmed Power Apps implementation name.`],
      missingDecisions: [`Confirm approvedScreenName for destination screen ${destinationScreenId}.`]
    };
  }
  return { destination, destinationScreenId, issues: [], missingDecisions: [] };
}

function generatedChecksumFor(input: {
  projectId: string;
  assetId: string;
  sourceChecksum: string;
  screenId: string;
  controlId: string;
  propertyName: string;
  operation: PowerFxOperation;
  destinationScreenId: string;
  destinationImplementationName: string;
  transition: PowerFxNavigationTransition;
  formula: string;
}): string {
  return fnv1a(stableStringify({
    generationVersion: POWER_FX_GENERATION_VERSION,
    ...input
  }));
}

export function generatePowerFxForAsset({
  project,
  registry,
  assetId
}: PowerFxGenerationContext): PowerFxGenerationResult {
  const rawAsset = registry.assets.find((asset) => asset.assetId === assetId);
  if (!isCanvasProject(project)) {
    return blocked({
      project,
      asset: rawAsset,
      assetId,
      blockingIssues: ["Power Fx generation is only applicable to Canvas Power Apps projects in Phase 5B.1."],
      status: "Not Applicable"
    });
  }
  if (!rawAsset) {
    return blocked({
      project,
      assetId,
      blockingIssues: [`Phase 5A implementation asset ${assetId} does not exist.`],
      missingDecisions: [`Regenerate or select a valid Phase 5A implementation asset for ${assetId}.`]
    });
  }

  const derivedAsset = deriveImplementationAssetRegistryState(project, registry.assets).assets.find((asset) => asset.assetId === assetId) ?? rawAsset;
  const control = confirmedControl(project, derivedAsset.targetId);
  const screen = control ? confirmedScreen(project, control.screenId) : undefined;
  const propertyName = derivedAsset.approvedPropertyName ?? "";
  const operation = control?.operation.trim() ?? "";
  const common = { project, asset: derivedAsset, assetId, control, screen, propertyName, operation };

  if (derivedAsset.assetType !== "powerFxPlan") {
    return blocked({ ...common, blockingIssues: [`Asset ${assetId} is ${derivedAsset.assetType}, not a Power Fx plan asset.`] });
  }
  if (derivedAsset.applicabilityStatus === "notApplicable") {
    return blocked({ ...common, blockingIssues: [`Asset ${assetId} is not applicable.`], status: "Not Applicable" });
  }
  if (derivedAsset.applicabilityStatus !== "required") {
    return blocked({ ...common, blockingIssues: [`Asset ${assetId} is Draft because applicability is not confirmed as required.`] });
  }
  if (!sourceChecksumIsValid(rawAsset)) {
    return blocked({ ...common, blockingIssues: [`Asset ${assetId} source checksum is invalid.`] });
  }
  if (!currentControlHasProperty(control, propertyName)) {
    return blocked({
      ...common,
      blockingIssues: [`Approved formula property ${propertyName || "[missing]"} is no longer present on current control ${derivedAsset.targetId || "[missing]"}.`],
      missingDecisions: [`Restore ${propertyName || "the approved property"} on the current control or regenerate and approve the current Power Fx plan asset.`]
    });
  }
  if (rawAsset.contentChecksum !== derivedAsset.contentChecksum) {
    return blocked({ ...common, blockingIssues: [`Asset ${assetId} is stale against current project state.`] });
  }
  if (derivedAsset.approvalStatus !== "Approved") {
    return blocked({ ...common, blockingIssues: [`Asset ${assetId} is not approved.`], status: "Review Required" });
  }
  const recalculatedStatus = evaluateImplementationAssetStatus(derivedAsset);
  if (recalculatedStatus !== "Ready for Export") {
    return blocked({ ...common, blockingIssues: [`Asset ${assetId} recalculated status is ${recalculatedStatus}.`, ...derivedAsset.blockingIssues] });
  }
  if (derivedAsset.gateEvaluationSnapshot.some((gate) => !gate.passed)) {
    return blocked({ ...common, blockingIssues: derivedAsset.gateEvaluationSnapshot.filter((gate) => !gate.passed).map((gate) => `${gate.label}: ${gate.blockingReason}`) });
  }
  if (derivedAsset.dependencies.some((dependency) => dependency.required && !dependency.resolved)) {
    return blocked({ ...common, blockingIssues: derivedAsset.dependencies.filter((dependency) => dependency.required && !dependency.resolved).map((dependency) => dependency.blockingIssue ?? `${dependency.label} is unresolved.`) });
  }
  if (!screen) {
    return blocked({ ...common, blockingIssues: [`Source screen ${control?.screenId || "[missing]"} is missing or unconfirmed.`], missingDecisions: ["Confirm the source screen target before generating navigation Power Fx."] });
  }
  if (!control) {
    return blocked({ ...common, blockingIssues: [`Source control ${derivedAsset.targetId || "[missing]"} is missing or unconfirmed.`], missingDecisions: ["Confirm the source control target before generating navigation Power Fx."] });
  }
  if (operation !== "navigation") {
    return blocked({ ...common, blockingIssues: [`Operation ${operation || "[missing]"} is not supported in Phase 5B.1.`] });
  }
  if (!SUPPORTED_NAVIGATION_PROPERTIES.has(propertyName)) {
    return blocked({ ...common, blockingIssues: [`Formula property ${propertyName || "[missing]"} is not supported for Phase 5B.1 navigation generation.`] });
  }

  const destinationResolution = resolveDestination(project, control);
  if (destinationResolution.issues.length > 0 || !destinationResolution.destination) {
    return blocked({
      ...common,
      destinationScreenId: destinationResolution.destinationScreenId,
      blockingIssues: destinationResolution.issues,
      missingDecisions: destinationResolution.missingDecisions
    });
  }

  const transitionResolution = resolveTransition(control);
  if (!transitionResolution.transition) {
    return blocked({
      ...common,
      destinationScreenId: destinationResolution.destinationScreenId,
      blockingIssues: [transitionResolution.issue ?? "Navigation transition is unresolved."],
      missingDecisions: transitionResolution.missingDecision ? [transitionResolution.missingDecision] : []
    });
  }

  const formula = `Navigate(${powerFxIdentifier(destinationResolution.destination.approvedScreenName.trim())}, ${TRANSITION_MAP[transitionResolution.transition]})\n`;
  const generatedChecksum = generatedChecksumFor({
    projectId: project.identity.id,
    assetId: derivedAsset.assetId,
    sourceChecksum: derivedAsset.contentChecksum,
    screenId: screen.id,
    controlId: control.id,
    propertyName,
    operation,
    destinationScreenId: destinationResolution.destinationScreenId,
    destinationImplementationName: destinationResolution.destination.approvedScreenName.trim(),
    transition: transitionResolution.transition,
    formula
  });

  return baseResult({
    ...common,
    destinationScreenId: destinationResolution.destinationScreenId,
    formula,
    generatedChecksum,
    status: "Generated"
  });
}

export function generatePowerFxForRegistry(project: ProjectRecord, registry: ImplementationAssetRegistry): PowerFxGenerationResult[] {
  return registry.assets
    .filter((asset) => asset.assetType === "powerFxPlan")
    .map((asset) => generatePowerFxForAsset({ project, registry, assetId: asset.assetId }));
}
