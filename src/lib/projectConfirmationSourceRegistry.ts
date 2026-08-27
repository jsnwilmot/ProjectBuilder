import { isProjectType } from "../data/projectTypes";
import type { ProjectType } from "../types/project";
import {
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
  PROJECT_CONFIRMATION_NORMALIZATION_VERSION,
  PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS,
  PROJECT_CONFIRMATION_VALUE_KIND,
  isProjectConfirmationSourceFieldId,
  type ProjectConfirmationSourceFieldId
} from "./projectConfirmationProvenance";

export const PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS = Object.freeze([
  "canvas.fullScreenYamlRequired",
  "canvas.controlLevelYamlRequired",
  "canvas.containerYamlRequired",
  "canvas.componentYamlRequired",
  "canvas.paYamlSourceRequired",
  "canvas.expectedInstallationMethod",
  "canvas.existingSourceAvailability"
] as const);

export type ProjectConfirmationSourceAccessorId =
  (typeof PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS)[number];

export interface ProjectConfirmationSourceRegistryEntry {
  readonly sourceFieldId: ProjectConfirmationSourceFieldId;
  readonly applicableProjectTypes: readonly ["powerAppsCanvas"];
  readonly accessorId: ProjectConfirmationSourceAccessorId;
  readonly valueKind: typeof PROJECT_CONFIRMATION_VALUE_KIND;
  readonly normalizationVersion: typeof PROJECT_CONFIRMATION_NORMALIZATION_VERSION;
  readonly serializationVersion: typeof PROJECT_CONFIRMATION_SERIALIZATION_VERSION;
  readonly fingerprintVersion: typeof PROJECT_CONFIRMATION_FINGERPRINT_VERSION;
}

export type ProjectConfirmationSourceRegistryResolution =
  | {
      readonly outcome: "supported";
      readonly contractVersion: typeof PROJECT_CONFIRMATION_CONTRACT_VERSION;
      readonly entries: readonly ProjectConfirmationSourceRegistryEntry[];
    }
  | {
      readonly outcome: "unsupportedContractVersion";
      readonly contractVersion: null;
      readonly entries: readonly [];
    };

export type ProjectConfirmationApplicableSourceResolution =
  | {
      readonly outcome: "resolved";
      readonly contractVersion: typeof PROJECT_CONFIRMATION_CONTRACT_VERSION;
      readonly projectType: ProjectType;
      readonly sourceFieldIds: readonly ProjectConfirmationSourceFieldId[];
    }
  | {
      readonly outcome: "unsupportedContractVersion" | "invalidProjectType";
      readonly contractVersion: null;
      readonly projectType: null;
      readonly sourceFieldIds: readonly [];
    };

export type ProjectConfirmationSourceApplicability =
  | "applicable"
  | "knownButNotApplicable"
  | "unknownSource"
  | "unsupportedContractVersion"
  | "invalidProjectType";

const accessorIds = PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS;
const registryEntries = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.map((sourceFieldId, index) => ({
  sourceFieldId,
  applicableProjectTypes: ["powerAppsCanvas"],
  accessorId: accessorIds[index],
  valueKind: PROJECT_CONFIRMATION_VALUE_KIND,
  normalizationVersion: PROJECT_CONFIRMATION_NORMALIZATION_VERSION,
  serializationVersion: PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
  fingerprintVersion: PROJECT_CONFIRMATION_FINGERPRINT_VERSION
})) as ProjectConfirmationSourceRegistryEntry[];

const PRODUCTION_REGISTRY = deepFreeze(registryEntries);

export function getProjectConfirmationSourceRegistry(
  contractVersion: unknown
): ProjectConfirmationSourceRegistryResolution {
  if (contractVersion !== PROJECT_CONFIRMATION_CONTRACT_VERSION) {
    return Object.freeze({
      outcome: "unsupportedContractVersion",
      contractVersion: null,
      entries: Object.freeze([] as const)
    });
  }
  return Object.freeze({
    outcome: "supported",
    contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    entries: PRODUCTION_REGISTRY
  });
}

export function getApplicableProjectConfirmationSourceFieldIds(
  contractVersion: unknown,
  projectType: unknown
): ProjectConfirmationApplicableSourceResolution {
  const registry = getProjectConfirmationSourceRegistry(contractVersion);
  if (registry.outcome !== "supported") {
    return Object.freeze({
      outcome: "unsupportedContractVersion",
      contractVersion: null,
      projectType: null,
      sourceFieldIds: Object.freeze([] as const)
    });
  }
  if (typeof projectType !== "string" || !isProjectType(projectType)) {
    return Object.freeze({
      outcome: "invalidProjectType",
      contractVersion: null,
      projectType: null,
      sourceFieldIds: Object.freeze([] as const)
    });
  }
  return Object.freeze({
    outcome: "resolved",
    contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    projectType,
    sourceFieldIds: Object.freeze(registry.entries
      .filter((entry) => entry.applicableProjectTypes.some((candidate) => candidate === projectType))
      .map((entry) => entry.sourceFieldId))
  });
}

export function classifyProjectConfirmationSourceApplicability(
  contractVersion: unknown,
  projectType: unknown,
  sourceFieldId: unknown
): ProjectConfirmationSourceApplicability {
  const registry = getProjectConfirmationSourceRegistry(contractVersion);
  if (registry.outcome !== "supported") return "unsupportedContractVersion";
  if (typeof projectType !== "string" || !isProjectType(projectType)) return "invalidProjectType";
  if (!isProjectConfirmationSourceFieldId(sourceFieldId)) return "unknownSource";
  return registry.entries.some((entry) =>
    entry.sourceFieldId === sourceFieldId &&
    entry.applicableProjectTypes.some((candidate) => candidate === projectType)
  ) ? "applicable" : "knownButNotApplicable";
}

function deepFreeze<T>(input: T): T {
  if (typeof input !== "object" || input === null || Object.isFrozen(input)) return input;
  Object.freeze(input);
  Object.values(input).forEach((value) => deepFreeze(value));
  return input;
}
