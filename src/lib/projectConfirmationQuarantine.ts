import type { ProjectConfirmationProvenanceIssueCode } from "./projectConfirmationProvenance";
import { isCanonicalProjectConfirmationUuid } from "./projectConfirmationProvenance";

export type ParsedJsonValue =
  | null
  | boolean
  | number
  | string
  | ParsedJsonValue[]
  | { [key: string]: ParsedJsonValue };

export interface ProjectConfirmationQuarantineSidecar {
  readonly projectId: string;
  readonly rawProvenancePropertyPresent: boolean;
  readonly rawProvenance?: ParsedJsonValue;
  readonly issueCodes: readonly ProjectConfirmationProvenanceIssueCode[];
  readonly provenanceWritesBlocked: true;
  readonly wholeProjectWriteDisposition: "preserveRawProvenanceExactlyOrBlock";
}

export function cloneParsedJsonValue(value: unknown): ParsedJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as ParsedJsonValue;
}

export function parsedJsonStructurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => parsedJsonStructurallyEqual(value, right[index]));
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && parsedJsonStructurallyEqual(left[key], right[key]));
}

export function collectCanonicalUuidsFromParsedJson(value: ParsedJsonValue | undefined): ReadonlySet<string> {
  const values = new Set<string>();
  const visit = (candidate: ParsedJsonValue | undefined): void => {
    if (typeof candidate === "string") {
      if (isCanonicalProjectConfirmationUuid(candidate)) values.add(candidate);
      return;
    }
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (isRecord(candidate)) Object.values(candidate).forEach(visit);
  };
  visit(value);
  return values;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
