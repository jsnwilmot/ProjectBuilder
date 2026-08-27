import { isCanonicalProjectConfirmationUuid } from "./projectConfirmationProvenance";

export type ProjectConfirmationUuidIssueCode =
  | "uuidUnavailable"
  | "uuidInvalid"
  | "uuidCollision";

export interface ProjectConfirmationUuidRuntime {
  readonly uuid?: () => string;
}

export type ProjectConfirmationUuidAllocationResult =
  | { readonly outcome: "allocated"; readonly values: readonly string[] }
  | { readonly outcome: "blocked"; readonly issueCode: ProjectConfirmationUuidIssueCode };

function productionUuid(): (() => string) | null {
  const crypto = globalThis.crypto;
  return typeof crypto?.randomUUID === "function"
    ? () => crypto.randomUUID()
    : null;
}

export function allocateProjectConfirmationUuids(
  count: number,
  runtime: ProjectConfirmationUuidRuntime = {},
  forbiddenValues: ReadonlySet<string> = new Set()
): ProjectConfirmationUuidAllocationResult {
  if (!Number.isSafeInteger(count) || count < 0) {
    return { outcome: "blocked", issueCode: "uuidInvalid" };
  }
  if (count === 0) return { outcome: "allocated", values: Object.freeze([]) };

  const uuid = runtime.uuid ?? productionUuid();
  if (!uuid) return { outcome: "blocked", issueCode: "uuidUnavailable" };

  const allocated = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    let value: string;
    try {
      value = uuid();
    } catch {
      return { outcome: "blocked", issueCode: "uuidUnavailable" };
    }
    if (!isCanonicalProjectConfirmationUuid(value)) {
      return { outcome: "blocked", issueCode: "uuidInvalid" };
    }
    if (allocated.has(value) || forbiddenValues.has(value)) {
      return { outcome: "blocked", issueCode: "uuidCollision" };
    }
    allocated.add(value);
  }

  return { outcome: "allocated", values: Object.freeze([...allocated]) };
}
