import type { ProjectRecord } from "../types/project";
import {
  PROJECT_CONFIRMATION_ACTION_ORIGIN,
  PROJECT_CONFIRMATION_ASSURANCE_TYPE,
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
  PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS,
  PROJECT_CONFIRMATION_VALUE_KIND,
  isCanonicalProjectConfirmationTimestamp,
  isCanonicalProjectConfirmationUuid,
  isProjectConfirmationSourceFieldId,
  isProjectConfirmationValueFingerprint,
  normalizeProjectConfirmationSourceText,
  validateProjectConfirmationProvenance,
  type ProjectConfirmationProvenance,
  type ProjectConfirmationSourceFieldId,
  type ProjectFieldConfirmationEvent
} from "./projectConfirmationProvenance";
import {
  allocateProjectConfirmationUuids,
  type ProjectConfirmationUuidRuntime
} from "./projectConfirmationRuntime";
import { readProjectConfirmationSourceValue } from "./projectConfirmationSourceAccessors";
import { getProjectConfirmationSourceRegistry } from "./projectConfirmationSourceRegistry";
import { computeProjectConfirmationValueFingerprint } from "./projectConfirmationValueFingerprint";

export const PROJECT_CONFIRMATION_SEMANTIC_STATEMENT =
  "The unauthenticated local operator explicitly confirms that the currently displayed normalized value of the identified registered project field is correct for this project at its current field revision." as const;

export const PROJECT_CONFIRMATION_TRANSACTION_ISSUE_CODES = Object.freeze([
  "invalidRequest",
  "invalidProjectId",
  "invalidActionId",
  "emptyBatch",
  "duplicateSourceField",
  "unsupportedProjectType",
  "unsupportedSourceField",
  "sourceNotApplicable",
  "sourceValueUnavailable",
  "invalidProvenance",
  "missingRevision",
  "revisionChanged",
  "valueChanged",
  "confirmationHeadChanged",
  "actionIdCollision",
  "actionReplayMismatch",
  "fingerprintUnavailable",
  "fingerprintInvalid",
  "uuidUnavailable",
  "uuidInvalid",
  "uuidCollision",
  "timestampUnavailable",
  "timestampInvalid",
  "finalValidationFailed"
] as const);

export type ProjectConfirmationTransactionIssueCode =
  (typeof PROJECT_CONFIRMATION_TRANSACTION_ISSUE_CODES)[number];

export interface ProjectConfirmationRequestField {
  readonly sourceFieldId: ProjectConfirmationSourceFieldId;
  readonly expectedRevisionId: string;
  readonly expectedValueFingerprint: string;
  readonly expectedConfirmationHeadId: string | null;
}

export interface ProjectConfirmationRequest {
  readonly projectId: string;
  readonly confirmationActionId: string;
  readonly fields: readonly [ProjectConfirmationRequestField, ...ProjectConfirmationRequestField[]];
}

export type ProjectConfirmationActionIdUsage =
  | { readonly kind: "unused" }
  | { readonly kind: "validAction"; readonly projectId: string }
  | { readonly kind: "validNonActionUuid" }
  | { readonly kind: "quarantinedUuid" }
  | { readonly kind: "ambiguous" };

export interface ProjectConfirmationActionIdContext {
  readonly confirmationActionId: string;
  readonly usage: ProjectConfirmationActionIdUsage;
}

export interface ProjectConfirmationAuthorityBoundary {
  readonly canonicalAuthority: false;
  readonly readinessAuthority: false;
  readonly projectionAuthority: false;
  readonly applyAuthority: false;
  readonly outputAuthority: false;
}

export interface ProjectConfirmationEventEvidence {
  readonly sourceFieldId: ProjectConfirmationSourceFieldId;
  readonly confirmationId: string;
  readonly sourceFieldRevisionId: string;
  readonly valueFingerprint: string;
  readonly expectedConfirmationHeadId: string | null;
}

export interface ProjectConfirmationActionEvidence extends ProjectConfirmationAuthorityBoundary {
  readonly projectId: string;
  readonly confirmationActionId: string;
  readonly confirmedAt: string;
  readonly fields: readonly ProjectConfirmationEventEvidence[];
}

export interface ProjectConfirmationCurrentEvidence extends ProjectConfirmationAuthorityBoundary {
  readonly projectId: string;
  readonly sourceFieldId: ProjectConfirmationSourceFieldId;
  readonly confirmationId: string;
  readonly sourceFieldRevisionId: string;
  readonly valueFingerprint: string;
  readonly confirmedAt: string;
}

export interface ProjectConfirmationCurrentFieldState {
  readonly sourceFieldId: ProjectConfirmationSourceFieldId;
  readonly currentRevisionId: string;
  readonly currentValueFingerprint: string;
  readonly currentConfirmationHeadId: string | null;
  readonly currentConfirmationEvidence: ProjectConfirmationCurrentEvidence | null;
}

export type ProjectConfirmationCurrentFieldsResult =
  | {
      readonly outcome: "derived";
      readonly projectId: string;
      readonly provenance: ProjectConfirmationProvenance;
      readonly fields: readonly ProjectConfirmationCurrentFieldState[];
    }
  | ProjectConfirmationBlockedResult;

export interface ProjectConfirmationPreparedField {
  readonly sourceFieldId: ProjectConfirmationSourceFieldId;
  readonly sourceFieldRevisionId: string;
  readonly valueFingerprint: string;
  readonly supersedesConfirmationId: string | null;
}

export interface ProjectConfirmationPreparedNewAction {
  readonly outcome: "preparedNewAction";
  readonly projectId: string;
  readonly confirmationActionId: string;
  readonly fields: readonly ProjectConfirmationPreparedField[];
  readonly baseProvenance: ProjectConfirmationProvenance;
}

export interface ProjectConfirmationPreparedReplay {
  readonly outcome: "preparedReplay";
  readonly evidence: ProjectConfirmationActionEvidence;
}

export interface ProjectConfirmationBlockedResult {
  readonly outcome: "blocked";
  readonly issueCode: ProjectConfirmationTransactionIssueCode;
}

export type ProjectConfirmationPreparationResult =
  | ProjectConfirmationPreparedNewAction
  | ProjectConfirmationPreparedReplay
  | ProjectConfirmationBlockedResult;

export interface ProjectConfirmationFinalizedAction extends ProjectConfirmationAuthorityBoundary {
  readonly outcome: "finalizedNewAction";
  readonly projectId: string;
  readonly confirmationActionId: string;
  readonly confirmedAt: string;
  readonly fields: readonly ProjectConfirmationEventEvidence[];
  readonly newEvents: readonly ProjectFieldConfirmationEvent[];
  readonly candidateProvenance: ProjectConfirmationProvenance;
}

export type ProjectConfirmationFinalizationResult =
  | ProjectConfirmationFinalizedAction
  | ProjectConfirmationBlockedResult;

export type ProjectConfirmationActionInitiationResult =
  | { readonly outcome: "initiated"; readonly confirmationActionId: string }
  | ProjectConfirmationBlockedResult;

export interface ProjectConfirmationFinalizationRuntime extends ProjectConfirmationUuidRuntime {
  readonly now?: () => string;
}

const authorityBoundary: ProjectConfirmationAuthorityBoundary = Object.freeze({
  canonicalAuthority: false,
  readinessAuthority: false,
  projectionAuthority: false,
  applyAuthority: false,
  outputAuthority: false
});

const registry = getProjectConfirmationSourceRegistry(PROJECT_CONFIRMATION_CONTRACT_VERSION);
if (registry.outcome !== "supported") {
  throw new Error("The fixed project confirmation source registry is unavailable.");
}
const registryEntries = registry.entries;
const registryOrder = new Map(
  registryEntries.map((entry, index) => [entry.sourceFieldId, index] as const)
);

export function initiateProjectConfirmationAction(
  forbiddenUuids: ReadonlySet<string>,
  runtime: ProjectConfirmationUuidRuntime = {}
): ProjectConfirmationActionInitiationResult {
  const allocation = allocateProjectConfirmationUuids(1, runtime, forbiddenUuids);
  if (allocation.outcome === "blocked") return blocked(allocation.issueCode);
  return deepFreeze({ outcome: "initiated", confirmationActionId: allocation.values[0] });
}

export async function deriveProjectConfirmationCurrentFields(
  project: ProjectRecord
): Promise<ProjectConfirmationCurrentFieldsResult> {
  if (project.intake.appType !== "powerAppsCanvas") return blocked("unsupportedProjectType");
  const validation = validateProjectConfirmationProvenance(project.confirmationProvenance, {
    projectId: project.identity.id,
    applicableSourceFieldIds: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS
  });
  if (validation.outcome !== "valid") return blocked("invalidProvenance");

  const heads = new Map<ProjectConfirmationSourceFieldId, ProjectFieldConfirmationEvent>();
  validation.provenance.confirmationEvents.forEach((event) => heads.set(event.sourceFieldId, event));
  const fields: ProjectConfirmationCurrentFieldState[] = [];

  for (const entry of registryEntries) {
    const revision = validation.provenance.fieldRevisions[entry.sourceFieldId];
    if (!revision) return blocked("missingRevision");
    const normalizedValue = normalizeProjectConfirmationSourceText(
      readProjectConfirmationSourceValue(project, entry.accessorId)
    );
    if (normalizedValue === null) return blocked("sourceValueUnavailable");
    const fingerprint = await computeProjectConfirmationValueFingerprint(normalizedValue);
    if (fingerprint.outcome === "blocked") return blocked(fingerprint.issueCode);

    const head = heads.get(entry.sourceFieldId);
    const currentEvidence = head &&
      head.sourceFieldRevisionId === revision.revisionId &&
      head.valueFingerprint === fingerprint.fingerprint
      ? deepFreeze({
          ...authorityBoundary,
          projectId: project.identity.id,
          sourceFieldId: entry.sourceFieldId,
          confirmationId: head.confirmationId,
          sourceFieldRevisionId: head.sourceFieldRevisionId,
          valueFingerprint: head.valueFingerprint,
          confirmedAt: head.confirmedAt
        })
      : null;
    fields.push({
      sourceFieldId: entry.sourceFieldId,
      currentRevisionId: revision.revisionId,
      currentValueFingerprint: fingerprint.fingerprint,
      currentConfirmationHeadId: head?.confirmationId ?? null,
      currentConfirmationEvidence: currentEvidence
    });
  }

  return deepFreeze({
    outcome: "derived",
    projectId: project.identity.id,
    provenance: validation.provenance,
    fields
  });
}

export async function prepareProjectConfirmationTransaction(
  project: ProjectRecord,
  input: unknown,
  actionContext: ProjectConfirmationActionIdContext
): Promise<ProjectConfirmationPreparationResult> {
  const parsed = parseRequest(input);
  if (parsed.outcome === "blocked") return parsed;
  const request = parsed.request;
  if (request.projectId !== project.identity.id) return blocked("invalidProjectId");
  if (
    actionContext.confirmationActionId !== request.confirmationActionId ||
    !isActionIdUsage(actionContext.usage)
  ) return blocked("invalidRequest");

  const current = await deriveProjectConfirmationCurrentFields(project);
  if (current.outcome === "blocked") return current;
  const actionEvents = current.provenance.confirmationEvents.filter(
    (event) => event.confirmationActionId === request.confirmationActionId
  );

  if (actionContext.usage.kind === "validAction") {
    if (actionContext.usage.projectId !== request.projectId) return blocked("actionIdCollision");
    if (actionEvents.length === 0) return blocked("invalidProvenance");
    return prepareReplay(request, actionEvents, current.fields);
  }
  if (actionContext.usage.kind !== "unused" || actionEvents.length > 0) {
    return blocked("actionIdCollision");
  }

  const currentById = new Map(current.fields.map((field) => [field.sourceFieldId, field] as const));
  const fields: ProjectConfirmationPreparedField[] = [];
  for (const requested of request.fields) {
    const state = currentById.get(requested.sourceFieldId);
    if (!state) return blocked("sourceNotApplicable");
    if (requested.expectedRevisionId !== state.currentRevisionId) return blocked("revisionChanged");
    if (requested.expectedValueFingerprint !== state.currentValueFingerprint) return blocked("valueChanged");
    if (requested.expectedConfirmationHeadId !== state.currentConfirmationHeadId) {
      return blocked("confirmationHeadChanged");
    }
    fields.push({
      sourceFieldId: requested.sourceFieldId,
      sourceFieldRevisionId: state.currentRevisionId,
      valueFingerprint: state.currentValueFingerprint,
      supersedesConfirmationId: state.currentConfirmationHeadId
    });
  }

  return deepFreeze({
    outcome: "preparedNewAction",
    projectId: request.projectId,
    confirmationActionId: request.confirmationActionId,
    fields,
    baseProvenance: current.provenance
  });
}

export function finalizeProjectConfirmationTransaction(
  prepared: ProjectConfirmationPreparedNewAction,
  forbiddenUuids: ReadonlySet<string>,
  runtime: ProjectConfirmationFinalizationRuntime = {}
): ProjectConfirmationFinalizationResult {
  if (prepared.outcome !== "preparedNewAction" || prepared.fields.length === 0) {
    return blocked("finalValidationFailed");
  }
  if (!isCanonicalProjectConfirmationUuid(prepared.confirmationActionId)) {
    return blocked("invalidActionId");
  }
  if (forbiddenUuids.has(prepared.confirmationActionId)) {
    return blocked("actionIdCollision");
  }

  let confirmedAt: string;
  try {
    confirmedAt = runtime.now ? runtime.now() : new Date().toISOString();
  } catch {
    return blocked("timestampUnavailable");
  }
  if (!isCanonicalProjectConfirmationTimestamp(confirmedAt)) return blocked("timestampInvalid");

  const collisionDomain = new Set(forbiddenUuids);
  collisionDomain.add(prepared.confirmationActionId);
  const allocation = allocateProjectConfirmationUuids(
    prepared.fields.length,
    runtime,
    collisionDomain
  );
  if (allocation.outcome === "blocked") return blocked(allocation.issueCode);

  const newEvents = prepared.fields.map((field, index): ProjectFieldConfirmationEvent => ({
    confirmationId: allocation.values[index],
    confirmationContractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    projectId: prepared.projectId,
    sourceFieldId: field.sourceFieldId,
    sourceFieldRevisionId: field.sourceFieldRevisionId,
    valueKind: PROJECT_CONFIRMATION_VALUE_KIND,
    serializationVersion: PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
    fingerprintVersion: PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
    valueFingerprint: field.valueFingerprint,
    confirmationActionId: prepared.confirmationActionId,
    actionOrigin: PROJECT_CONFIRMATION_ACTION_ORIGIN,
    confirmedAt,
    actorAssurance: {
      contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
      assuranceType: PROJECT_CONFIRMATION_ASSURANCE_TYPE
    },
    ...(field.supersedesConfirmationId
      ? { supersedesConfirmationId: field.supersedesConfirmationId }
      : {})
  }));
  const candidate = {
    contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    fieldRevisions: prepared.baseProvenance.fieldRevisions,
    confirmationEvents: [...prepared.baseProvenance.confirmationEvents, ...newEvents]
  };
  const validation = validateProjectConfirmationProvenance(candidate, {
    projectId: prepared.projectId,
    applicableSourceFieldIds: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS
  });
  if (validation.outcome !== "valid") return blocked("finalValidationFailed");

  const fields = newEvents.map((event): ProjectConfirmationEventEvidence => ({
    sourceFieldId: event.sourceFieldId,
    confirmationId: event.confirmationId,
    sourceFieldRevisionId: event.sourceFieldRevisionId,
    valueFingerprint: event.valueFingerprint,
    expectedConfirmationHeadId: event.supersedesConfirmationId ?? null
  }));
  return deepFreeze({
    outcome: "finalizedNewAction",
    ...authorityBoundary,
    projectId: prepared.projectId,
    confirmationActionId: prepared.confirmationActionId,
    confirmedAt,
    fields,
    newEvents,
    candidateProvenance: validation.provenance
  });
}

function prepareReplay(
  request: ProjectConfirmationRequest,
  events: readonly ProjectFieldConfirmationEvent[],
  currentFields: readonly ProjectConfirmationCurrentFieldState[]
): ProjectConfirmationPreparedReplay | ProjectConfirmationBlockedResult {
  const orderedEvents = [...events].sort(compareSourceOrder);
  if (orderedEvents.length !== request.fields.length) return blocked("actionReplayMismatch");
  const currentById = new Map(currentFields.map((field) => [field.sourceFieldId, field] as const));

  for (let index = 0; index < request.fields.length; index += 1) {
    const requested = request.fields[index];
    const event = orderedEvents[index];
    if (
      event.sourceFieldId !== requested.sourceFieldId ||
      event.sourceFieldRevisionId !== requested.expectedRevisionId ||
      event.valueFingerprint !== requested.expectedValueFingerprint ||
      (event.supersedesConfirmationId ?? null) !== requested.expectedConfirmationHeadId
    ) return blocked("actionReplayMismatch");
    const current = currentById.get(event.sourceFieldId);
    if (
      !current ||
      current.currentRevisionId !== event.sourceFieldRevisionId ||
      current.currentValueFingerprint !== event.valueFingerprint
    ) return blocked("actionReplayMismatch");
  }

  const first = orderedEvents[0];
  return deepFreeze({
    outcome: "preparedReplay",
    evidence: {
      ...authorityBoundary,
      projectId: request.projectId,
      confirmationActionId: request.confirmationActionId,
      confirmedAt: first.confirmedAt,
      fields: orderedEvents.map((event) => ({
        sourceFieldId: event.sourceFieldId,
        confirmationId: event.confirmationId,
        sourceFieldRevisionId: event.sourceFieldRevisionId,
        valueFingerprint: event.valueFingerprint,
        expectedConfirmationHeadId: event.supersedesConfirmationId ?? null
      }))
    }
  });
}

function parseRequest(
  input: unknown
): { readonly outcome: "parsed"; readonly request: ProjectConfirmationRequest } | ProjectConfirmationBlockedResult {
  if (!isPlainObject(input) || !hasExactKeys(input, ["projectId", "confirmationActionId", "fields"])) {
    return blocked("invalidRequest");
  }
  if (typeof input.projectId !== "string" || input.projectId.length === 0) return blocked("invalidProjectId");
  if (!isCanonicalProjectConfirmationUuid(input.confirmationActionId)) return blocked("invalidActionId");
  if (!Array.isArray(input.fields) || hasSparseArrayEntry(input.fields)) return blocked("invalidRequest");
  if (input.fields.length === 0) return blocked("emptyBatch");

  const fields: ProjectConfirmationRequestField[] = [];
  const sourceIds = new Set<ProjectConfirmationSourceFieldId>();
  for (const inputField of input.fields) {
    if (!isPlainObject(inputField) || !hasExactKeys(inputField, [
      "sourceFieldId",
      "expectedRevisionId",
      "expectedValueFingerprint",
      "expectedConfirmationHeadId"
    ])) return blocked("invalidRequest");
    if (!isProjectConfirmationSourceFieldId(inputField.sourceFieldId)) return blocked("unsupportedSourceField");
    if (sourceIds.has(inputField.sourceFieldId)) return blocked("duplicateSourceField");
    if (!isCanonicalProjectConfirmationUuid(inputField.expectedRevisionId)) return blocked("invalidRequest");
    if (!isProjectConfirmationValueFingerprint(inputField.expectedValueFingerprint)) {
      return blocked("fingerprintInvalid");
    }
    if (
      inputField.expectedConfirmationHeadId !== null &&
      !isCanonicalProjectConfirmationUuid(inputField.expectedConfirmationHeadId)
    ) return blocked("invalidRequest");
    sourceIds.add(inputField.sourceFieldId);
    fields.push({
      sourceFieldId: inputField.sourceFieldId,
      expectedRevisionId: inputField.expectedRevisionId,
      expectedValueFingerprint: inputField.expectedValueFingerprint,
      expectedConfirmationHeadId: inputField.expectedConfirmationHeadId
    });
  }
  fields.sort(compareSourceOrder);
  return deepFreeze({
    outcome: "parsed",
    request: {
      projectId: input.projectId,
      confirmationActionId: input.confirmationActionId,
      fields: fields as [ProjectConfirmationRequestField, ...ProjectConfirmationRequestField[]]
    }
  });
}

function compareSourceOrder(
  left: { readonly sourceFieldId: ProjectConfirmationSourceFieldId },
  right: { readonly sourceFieldId: ProjectConfirmationSourceFieldId }
): number {
  return registryOrder.get(left.sourceFieldId)! - registryOrder.get(right.sourceFieldId)!;
}

function isActionIdUsage(value: unknown): value is ProjectConfirmationActionIdUsage {
  if (!isPlainObject(value) || typeof value.kind !== "string") return false;
  if (value.kind === "validAction") {
    return hasExactKeys(value, ["kind", "projectId"]) &&
      typeof value.projectId === "string" && value.projectId.length > 0;
  }
  return ["unused", "validNonActionUuid", "quarantinedUuid", "ambiguous"].includes(value.kind) &&
    hasExactKeys(value, ["kind"]);
}

function blocked(issueCode: ProjectConfirmationTransactionIssueCode): ProjectConfirmationBlockedResult {
  return Object.freeze({ outcome: "blocked", issueCode });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(input: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(input);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function hasSparseArrayEntry(input: readonly unknown[]): boolean {
  for (let index = 0; index < input.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(input, index)) return true;
  }
  return false;
}

function deepFreeze<T>(input: T): T {
  if (typeof input !== "object" || input === null || Object.isFrozen(input)) return input;
  Object.freeze(input);
  Object.values(input).forEach((value) => deepFreeze(value));
  return input;
}
