import { isCanonicalUuid } from "../core/canonicalUuid";
import { isSha256Hex } from "../core/sha256Fingerprint";

export const PROJECT_CONFIRMATION_CONTRACT_VERSION = "phase-5c.3c.3j.6b.3r" as const;
export const PROJECT_CONFIRMATION_VALUE_KIND = "text" as const;
export const PROJECT_CONFIRMATION_NORMALIZATION_VERSION = "normalized-project-string-v1" as const;
export const PROJECT_CONFIRMATION_SERIALIZATION_VERSION = "canonical-text-json-v1" as const;
export const PROJECT_CONFIRMATION_FINGERPRINT_VERSION = "sha256-v1" as const;
export const PROJECT_CONFIRMATION_ASSURANCE_TYPE = "unauthenticatedLocalOperator" as const;
export const PROJECT_CONFIRMATION_ACTION_ORIGIN = "localExplicitConfirmation" as const;

export const PROJECT_CONFIRMATION_SOURCE_FIELD_IDS = Object.freeze([
  "project-field.power-platform.canvas.full-screen-yaml-required",
  "project-field.power-platform.canvas.control-level-yaml-required",
  "project-field.power-platform.canvas.container-yaml-required",
  "project-field.power-platform.canvas.component-yaml-required",
  "project-field.power-platform.canvas.pa-yaml-source-required",
  "project-field.power-platform.canvas.expected-installation-method",
  "project-field.power-platform.canvas.existing-source-availability"
] as const);

export type ProjectConfirmationSourceFieldId =
  (typeof PROJECT_CONFIRMATION_SOURCE_FIELD_IDS)[number];

export interface ProjectConfirmationProvenance {
  readonly contractVersion: typeof PROJECT_CONFIRMATION_CONTRACT_VERSION;
  readonly fieldRevisions: Readonly<
    Partial<Record<ProjectConfirmationSourceFieldId, ProjectConfirmationFieldRevision>>
  >;
  readonly confirmationEvents: readonly ProjectFieldConfirmationEvent[];
}

export interface ProjectConfirmationFieldRevision {
  readonly revisionId: string;
}

export interface ProjectConfirmationActorAssurance {
  readonly contractVersion: typeof PROJECT_CONFIRMATION_CONTRACT_VERSION;
  readonly assuranceType: typeof PROJECT_CONFIRMATION_ASSURANCE_TYPE;
}

export interface ProjectFieldConfirmationEvent {
  readonly confirmationId: string;
  readonly confirmationContractVersion: typeof PROJECT_CONFIRMATION_CONTRACT_VERSION;
  readonly projectId: string;
  readonly sourceFieldId: ProjectConfirmationSourceFieldId;
  readonly sourceFieldRevisionId: string;
  readonly valueKind: typeof PROJECT_CONFIRMATION_VALUE_KIND;
  readonly serializationVersion: typeof PROJECT_CONFIRMATION_SERIALIZATION_VERSION;
  readonly fingerprintVersion: typeof PROJECT_CONFIRMATION_FINGERPRINT_VERSION;
  readonly valueFingerprint: string;
  readonly confirmationActionId: string;
  readonly actionOrigin: typeof PROJECT_CONFIRMATION_ACTION_ORIGIN;
  readonly confirmedAt: string;
  readonly actorAssurance: ProjectConfirmationActorAssurance;
  readonly supersedesConfirmationId?: string;
}

export const PROJECT_CONFIRMATION_PROVENANCE_ISSUE_CODES = Object.freeze([
  "missingProvenance",
  "unsupportedContractVersion",
  "applicableRevisionSetMismatch",
  "invalidRevision",
  "duplicateRevisionIdentity",
  "invalidEvent",
  "duplicateConfirmationId",
  "projectMismatch",
  "invalidFingerprint",
  "invalidAction",
  "invalidAssurance",
  "invalidSupersession",
  "unsupportedSourceField"
] as const);

export type ProjectConfirmationProvenanceIssueCode =
  (typeof PROJECT_CONFIRMATION_PROVENANCE_ISSUE_CODES)[number];

export type ProjectConfirmationProvenanceReadResult =
  | {
      readonly outcome: "valid";
      readonly projectId: string;
      readonly rawProvenancePresent: true;
      readonly provenance: ProjectConfirmationProvenance;
      readonly issueCodes: readonly [];
      readonly provenanceWritesBlocked: false;
      readonly wholeProjectWriteDisposition: "allowed";
    }
  | {
      readonly outcome: "quarantined";
      readonly projectId: string;
      readonly rawProvenancePresent: boolean;
      readonly provenance: null;
      readonly issueCodes: readonly ProjectConfirmationProvenanceIssueCode[];
      readonly provenanceWritesBlocked: true;
      readonly wholeProjectWriteDisposition: "preserveRawProvenanceExactlyOrBlock";
    };

export interface ProjectConfirmationProvenanceValidationContext {
  readonly projectId: string;
  readonly applicableSourceFieldIds: readonly ProjectConfirmationSourceFieldId[];
}

const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const sourceFieldIdSet = new Set<string>(PROJECT_CONFIRMATION_SOURCE_FIELD_IDS);
const STATE_FIELDS = ["contractVersion", "fieldRevisions", "confirmationEvents"] as const;
const REVISION_FIELDS = ["revisionId"] as const;
const ASSURANCE_FIELDS = ["contractVersion", "assuranceType"] as const;
const EVENT_REQUIRED_FIELDS = [
  "confirmationId",
  "confirmationContractVersion",
  "projectId",
  "sourceFieldId",
  "sourceFieldRevisionId",
  "valueKind",
  "serializationVersion",
  "fingerprintVersion",
  "valueFingerprint",
  "confirmationActionId",
  "actionOrigin",
  "confirmedAt",
  "actorAssurance"
] as const;
const EVENT_FIELDS = [...EVENT_REQUIRED_FIELDS, "supersedesConfirmationId"] as const;

export function isCanonicalProjectConfirmationUuid(value: unknown): value is string {
  return isCanonicalUuid(value);
}

export function isProjectConfirmationValueFingerprint(value: unknown): value is string {
  return isSha256Hex(value);
}

export function isCanonicalProjectConfirmationTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !UTC_TIMESTAMP_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

export function normalizeProjectConfirmationSourceText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function isProjectConfirmationSourceFieldId(
  value: unknown
): value is ProjectConfirmationSourceFieldId {
  return typeof value === "string" && sourceFieldIdSet.has(value);
}

export function validateProjectConfirmationProvenance(
  input: unknown,
  context: ProjectConfirmationProvenanceValidationContext
): ProjectConfirmationProvenanceReadResult {
  const issueCodes = new Set<ProjectConfirmationProvenanceIssueCode>();
  const rawProvenancePresent = input !== undefined;

  if (!isPlainObject(input)) {
    issueCodes.add("missingProvenance");
    return quarantined(context.projectId, rawProvenancePresent, issueCodes);
  }
  if (input.contractVersion !== PROJECT_CONFIRMATION_CONTRACT_VERSION) {
    issueCodes.add("unsupportedContractVersion");
  }
  if (!hasExactKeys(input, STATE_FIELDS)) {
    issueCodes.add("invalidEvent");
  }

  const fieldRevisions = validateFieldRevisions(
    input.fieldRevisions,
    context.applicableSourceFieldIds,
    issueCodes
  );
  const confirmationEvents = validateConfirmationEvents(
    input.confirmationEvents,
    context.projectId,
    issueCodes
  );

  if (issueCodes.size > 0 || !fieldRevisions || !confirmationEvents) {
    return quarantined(context.projectId, rawProvenancePresent, issueCodes);
  }

  return {
    outcome: "valid",
    projectId: context.projectId,
    rawProvenancePresent: true,
    provenance: deepFreeze({
      contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
      fieldRevisions,
      confirmationEvents
    }),
    issueCodes: [],
    provenanceWritesBlocked: false,
    wholeProjectWriteDisposition: "allowed"
  };
}

function validateFieldRevisions(
  input: unknown,
  applicableSourceFieldIds: readonly ProjectConfirmationSourceFieldId[],
  issues: Set<ProjectConfirmationProvenanceIssueCode>
): Readonly<Partial<Record<ProjectConfirmationSourceFieldId, ProjectConfirmationFieldRevision>>> | null {
  if (!isPlainObject(input)) {
    issues.add("applicableRevisionSetMismatch");
    return null;
  }

  const actualKeys = Object.keys(input);
  const expectedKeys = [...new Set(applicableSourceFieldIds)];
  if (
    expectedKeys.length !== applicableSourceFieldIds.length ||
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key) => !expectedKeys.includes(key as ProjectConfirmationSourceFieldId))
  ) {
    issues.add("applicableRevisionSetMismatch");
  }

  const revisions: Partial<Record<ProjectConfirmationSourceFieldId, ProjectConfirmationFieldRevision>> = {};
  const revisionIds = new Set<string>();
  for (const key of actualKeys) {
    if (!isProjectConfirmationSourceFieldId(key)) {
      issues.add("unsupportedSourceField");
      continue;
    }
    const candidate = input[key];
    if (!isPlainObject(candidate) || !hasExactKeys(candidate, REVISION_FIELDS)) {
      issues.add("invalidRevision");
      continue;
    }
    if (!isCanonicalProjectConfirmationUuid(candidate.revisionId)) {
      issues.add("invalidRevision");
      continue;
    }
    if (revisionIds.has(candidate.revisionId)) {
      issues.add("duplicateRevisionIdentity");
      continue;
    }
    revisionIds.add(candidate.revisionId);
    revisions[key] = { revisionId: candidate.revisionId };
  }
  return revisions;
}

function validateConfirmationEvents(
  input: unknown,
  projectId: string,
  issues: Set<ProjectConfirmationProvenanceIssueCode>
): readonly ProjectFieldConfirmationEvent[] | null {
  if (!Array.isArray(input) || hasSparseArrayEntry(input)) {
    issues.add("invalidEvent");
    return null;
  }

  const events: ProjectFieldConfirmationEvent[] = [];
  const confirmationIds = new Set<string>();
  for (const candidate of input) {
    const event = validateConfirmationEvent(candidate, projectId, issues);
    if (!event) continue;
    if (confirmationIds.has(event.confirmationId)) {
      issues.add("duplicateConfirmationId");
      continue;
    }
    confirmationIds.add(event.confirmationId);
    events.push(event);
  }

  validateActionGroups(events, issues);
  validateSupersession(events, issues);
  return events;
}

function validateConfirmationEvent(
  input: unknown,
  projectId: string,
  issues: Set<ProjectConfirmationProvenanceIssueCode>
): ProjectFieldConfirmationEvent | null {
  if (!isPlainObject(input) || !hasRequiredAndOptionalKeys(input, EVENT_REQUIRED_FIELDS, EVENT_FIELDS)) {
    issues.add("invalidEvent");
    return null;
  }
  if (
    !isCanonicalProjectConfirmationUuid(input.confirmationId) ||
    input.confirmationContractVersion !== PROJECT_CONFIRMATION_CONTRACT_VERSION ||
    !isCanonicalProjectConfirmationUuid(input.sourceFieldRevisionId) ||
    input.valueKind !== PROJECT_CONFIRMATION_VALUE_KIND ||
    input.serializationVersion !== PROJECT_CONFIRMATION_SERIALIZATION_VERSION ||
    input.fingerprintVersion !== PROJECT_CONFIRMATION_FINGERPRINT_VERSION ||
    input.actionOrigin !== PROJECT_CONFIRMATION_ACTION_ORIGIN ||
    !isCanonicalProjectConfirmationTimestamp(input.confirmedAt)
  ) {
    issues.add("invalidEvent");
    return null;
  }
  if (input.projectId !== projectId) {
    issues.add("projectMismatch");
    return null;
  }
  if (!isProjectConfirmationSourceFieldId(input.sourceFieldId)) {
    issues.add("unsupportedSourceField");
    return null;
  }
  if (!isProjectConfirmationValueFingerprint(input.valueFingerprint)) {
    issues.add("invalidFingerprint");
    return null;
  }
  if (!isCanonicalProjectConfirmationUuid(input.confirmationActionId)) {
    issues.add("invalidAction");
    return null;
  }
  const actorAssurance = validateActorAssurance(input.actorAssurance, issues);
  if (!actorAssurance) return null;

  const supersedesConfirmationId = input.supersedesConfirmationId;
  if (supersedesConfirmationId !== undefined && !isCanonicalProjectConfirmationUuid(supersedesConfirmationId)) {
    issues.add("invalidSupersession");
    return null;
  }

  return {
    confirmationId: input.confirmationId,
    confirmationContractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    projectId,
    sourceFieldId: input.sourceFieldId,
    sourceFieldRevisionId: input.sourceFieldRevisionId,
    valueKind: PROJECT_CONFIRMATION_VALUE_KIND,
    serializationVersion: PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
    fingerprintVersion: PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
    valueFingerprint: input.valueFingerprint,
    confirmationActionId: input.confirmationActionId,
    actionOrigin: PROJECT_CONFIRMATION_ACTION_ORIGIN,
    confirmedAt: input.confirmedAt,
    actorAssurance,
    ...(supersedesConfirmationId ? { supersedesConfirmationId } : {})
  };
}

function validateActorAssurance(
  input: unknown,
  issues: Set<ProjectConfirmationProvenanceIssueCode>
): ProjectConfirmationActorAssurance | null {
  if (
    !isPlainObject(input) ||
    !hasExactKeys(input, ASSURANCE_FIELDS) ||
    input.contractVersion !== PROJECT_CONFIRMATION_CONTRACT_VERSION ||
    input.assuranceType !== PROJECT_CONFIRMATION_ASSURANCE_TYPE
  ) {
    issues.add("invalidAssurance");
    return null;
  }
  return {
    contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    assuranceType: PROJECT_CONFIRMATION_ASSURANCE_TYPE
  };
}

function validateActionGroups(
  events: readonly ProjectFieldConfirmationEvent[],
  issues: Set<ProjectConfirmationProvenanceIssueCode>
): void {
  const groups = new Map<string, ProjectFieldConfirmationEvent[]>();
  events.forEach((event) => groups.set(
    event.confirmationActionId,
    [...(groups.get(event.confirmationActionId) ?? []), event]
  ));

  for (const group of groups.values()) {
    const first = group[0];
    const sourceIds = new Set(group.map((event) => event.sourceFieldId));
    if (
      sourceIds.size !== group.length ||
      group.some((event) =>
        event.projectId !== first.projectId ||
        event.confirmedAt !== first.confirmedAt ||
        event.actionOrigin !== first.actionOrigin ||
        event.confirmationContractVersion !== first.confirmationContractVersion ||
        event.actorAssurance.contractVersion !== first.actorAssurance.contractVersion ||
        event.actorAssurance.assuranceType !== first.actorAssurance.assuranceType
      )
    ) {
      issues.add("invalidAction");
    }
  }
}

function validateSupersession(
  events: readonly ProjectFieldConfirmationEvent[],
  issues: Set<ProjectConfirmationProvenanceIssueCode>
): void {
  const lineageHeads = new Map<ProjectConfirmationSourceFieldId, ProjectFieldConfirmationEvent>();
  for (const event of events) {
    const currentHead = lineageHeads.get(event.sourceFieldId);
    if (!currentHead) {
      if (event.supersedesConfirmationId) issues.add("invalidSupersession");
      else lineageHeads.set(event.sourceFieldId, event);
      continue;
    }

    if (
      event.supersedesConfirmationId !== currentHead.confirmationId ||
      event.confirmationActionId === currentHead.confirmationActionId
    ) {
      issues.add("invalidSupersession");
      continue;
    }
    lineageHeads.set(event.sourceFieldId, event);
  }
}

function quarantined(
  projectId: string,
  rawProvenancePresent: boolean,
  issueCodes: ReadonlySet<ProjectConfirmationProvenanceIssueCode>
): ProjectConfirmationProvenanceReadResult {
  return {
    outcome: "quarantined",
    projectId,
    rawProvenancePresent,
    provenance: null,
    issueCodes: Object.freeze([...issueCodes]),
    provenanceWritesBlocked: true,
    wholeProjectWriteDisposition: "preserveRawProvenanceExactlyOrBlock"
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(input: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(input);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function hasRequiredAndOptionalKeys(
  input: Record<string, unknown>,
  required: readonly string[],
  allowed: readonly string[]
): boolean {
  const keys = Object.keys(input);
  return required.every((key) => Object.prototype.hasOwnProperty.call(input, key)) &&
    keys.every((key) => allowed.includes(key));
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
