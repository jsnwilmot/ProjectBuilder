import type { ProjectRecord } from "../types/project";
import {
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS,
  isCanonicalProjectConfirmationUuid,
  normalizeProjectConfirmationSourceText,
  validateProjectConfirmationProvenance,
  type ProjectConfirmationProvenance,
  type ProjectConfirmationSourceFieldId
} from "./projectConfirmationProvenance";
import {
  getProjectConfirmationSourceRegistry,
  type ProjectConfirmationSourceRegistryEntry
} from "./projectConfirmationSourceRegistry";
import { readProjectConfirmationSourceValue } from "./projectConfirmationSourceAccessors";

export type ProjectConfirmationRevisionActionKind = "unchanged" | "rotate" | "remove" | "add";

export interface ProjectConfirmationRevisionAction {
  readonly sourceFieldId: ProjectConfirmationSourceFieldId;
  readonly kind: ProjectConfirmationRevisionActionKind;
}

export type ProjectConfirmationRevisionAnalysisResult =
  | {
      readonly outcome: "ready";
      readonly actions: readonly ProjectConfirmationRevisionAction[];
      readonly requiredUuidCount: number;
    }
  | { readonly outcome: "blocked"; readonly issueCode: "invalidCurrentProvenance" | "invalidSourceValue" };

export type ProjectConfirmationRevisionMaterializationResult =
  | { readonly outcome: "materialized"; readonly provenance: ProjectConfirmationProvenance }
  | { readonly outcome: "blocked"; readonly issueCode: "revisionAllocationMismatch" | "invalidRevisionAllocation" };

const registry = getProjectConfirmationSourceRegistry(PROJECT_CONFIRMATION_CONTRACT_VERSION);
if (registry.outcome !== "supported") {
  throw new Error("The fixed project confirmation source registry is unavailable.");
}
const registryEntries = registry.entries;

export function applicableProjectConfirmationSourceFieldIds(
  projectType: ProjectRecord["intake"]["appType"]
): readonly ProjectConfirmationSourceFieldId[] {
  return projectType === "powerAppsCanvas"
    ? PROJECT_CONFIRMATION_SOURCE_FIELD_IDS
    : Object.freeze([]);
}

export function createInitialProjectConfirmationProvenance(
  projectType: ProjectRecord["intake"]["appType"],
  revisionIds: readonly string[]
): ProjectConfirmationRevisionMaterializationResult {
  const applicableIds = applicableProjectConfirmationSourceFieldIds(projectType);
  if (revisionIds.length !== applicableIds.length) {
    return { outcome: "blocked", issueCode: "revisionAllocationMismatch" };
  }
  if (!validUniqueAllocations(revisionIds)) {
    return { outcome: "blocked", issueCode: "invalidRevisionAllocation" };
  }

  const fieldRevisions = Object.fromEntries(
    applicableIds.map((sourceFieldId, index) => [sourceFieldId, { revisionId: revisionIds[index] }])
  );
  return {
    outcome: "materialized",
    provenance: {
      contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
      fieldRevisions,
      confirmationEvents: []
    }
  };
}

export function analyzeProjectConfirmationRevisionReconciliation(
  current: ProjectRecord,
  candidate: ProjectRecord
): ProjectConfirmationRevisionAnalysisResult {
  const currentApplicable = applicableProjectConfirmationSourceFieldIds(current.intake.appType);
  const validation = validateProjectConfirmationProvenance(current.confirmationProvenance, {
    projectId: current.identity.id,
    applicableSourceFieldIds: currentApplicable
  });
  if (validation.outcome !== "valid") {
    return { outcome: "blocked", issueCode: "invalidCurrentProvenance" };
  }

  const before = new Set(currentApplicable);
  const after = new Set(applicableProjectConfirmationSourceFieldIds(candidate.intake.appType));
  const actions: ProjectConfirmationRevisionAction[] = [];

  for (const entry of registryEntries) {
    const wasApplicable = before.has(entry.sourceFieldId);
    const isApplicable = after.has(entry.sourceFieldId);
    if (wasApplicable && !isApplicable) {
      actions.push({ sourceFieldId: entry.sourceFieldId, kind: "remove" });
      continue;
    }
    if (!wasApplicable && isApplicable) {
      if (normalizedValue(candidate, entry) === null) {
        return { outcome: "blocked", issueCode: "invalidSourceValue" };
      }
      actions.push({ sourceFieldId: entry.sourceFieldId, kind: "add" });
      continue;
    }
    if (!wasApplicable) continue;

    const currentValue = normalizedValue(current, entry);
    const candidateValue = normalizedValue(candidate, entry);
    if (currentValue === null || candidateValue === null) {
      return { outcome: "blocked", issueCode: "invalidSourceValue" };
    }
    actions.push({
      sourceFieldId: entry.sourceFieldId,
      kind: currentValue === candidateValue ? "unchanged" : "rotate"
    });
  }

  return {
    outcome: "ready",
    actions: Object.freeze(actions),
    requiredUuidCount: actions.filter((action) => action.kind === "add" || action.kind === "rotate").length
  };
}

export function materializeProjectConfirmationRevisionReconciliation(
  current: ProjectConfirmationProvenance,
  analysis: Extract<ProjectConfirmationRevisionAnalysisResult, { outcome: "ready" }>,
  revisionIds: readonly string[]
): ProjectConfirmationRevisionMaterializationResult {
  if (revisionIds.length !== analysis.requiredUuidCount) {
    return { outcome: "blocked", issueCode: "revisionAllocationMismatch" };
  }
  if (!validUniqueAllocations(revisionIds)) {
    return { outcome: "blocked", issueCode: "invalidRevisionAllocation" };
  }

  const fieldRevisions = { ...current.fieldRevisions };
  let allocationIndex = 0;
  for (const action of analysis.actions) {
    if (action.kind === "remove") {
      delete fieldRevisions[action.sourceFieldId];
    } else if (action.kind === "add" || action.kind === "rotate") {
      fieldRevisions[action.sourceFieldId] = { revisionId: revisionIds[allocationIndex] };
      allocationIndex += 1;
    }
  }

  return {
    outcome: "materialized",
    provenance: {
      contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
      fieldRevisions,
      confirmationEvents: current.confirmationEvents
    }
  };
}

export function collectProjectConfirmationProvenanceIds(
  provenance: ProjectConfirmationProvenance | undefined
): ReadonlySet<string> {
  const values = new Set<string>();
  if (!provenance) return values;
  Object.values(provenance.fieldRevisions).forEach((revision) => {
    if (revision) values.add(revision.revisionId);
  });
  provenance.confirmationEvents.forEach((event) => {
    values.add(event.confirmationId);
    values.add(event.confirmationActionId);
    values.add(event.sourceFieldRevisionId);
  });
  return values;
}

function normalizedValue(project: ProjectRecord, entry: ProjectConfirmationSourceRegistryEntry): string | null {
  return normalizeProjectConfirmationSourceText(
    readProjectConfirmationSourceValue(project, entry.accessorId)
  );
}

function validUniqueAllocations(values: readonly string[]): boolean {
  return values.every(isCanonicalProjectConfirmationUuid) && new Set(values).size === values.length;
}
