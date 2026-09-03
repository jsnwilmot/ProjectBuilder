export const DOMAIN_FACT_DESCRIPTOR_CONTRACT_VERSION = "phase-5c.3c.3j.6c.8" as const;

const DESCRIPTOR_KEYS = [
  "descriptorContractVersion",
  "factId",
  "domainId",
  "applicableProjectTypes",
  "accessorId",
  "valueKind",
  "normalizationVersion",
  "serializationVersion",
  "fingerprintVersion"
] as const;

export interface DomainFactDescriptor {
  readonly descriptorContractVersion: typeof DOMAIN_FACT_DESCRIPTOR_CONTRACT_VERSION;
  readonly factId: string;
  readonly domainId: string;
  readonly applicableProjectTypes: readonly string[];
  readonly accessorId: string;
  readonly valueKind: "text";
  readonly normalizationVersion: string;
  readonly serializationVersion: string;
  readonly fingerprintVersion: string;
}

export function validateDomainFactDescriptor(input: unknown): DomainFactDescriptor | null {
  if (!isStrictObject(input) || !hasExactDataProperties(input)) return null;
  if (
    !isNonEmptyString(input.factId) ||
    !isNonEmptyString(input.domainId) ||
    !isProjectTypeList(input.applicableProjectTypes) ||
    !isNonEmptyString(input.accessorId) ||
    input.valueKind !== "text" ||
    !isNonEmptyString(input.normalizationVersion) ||
    !isNonEmptyString(input.serializationVersion) ||
    !isNonEmptyString(input.fingerprintVersion) ||
    input.descriptorContractVersion !== DOMAIN_FACT_DESCRIPTOR_CONTRACT_VERSION
  ) {
    return null;
  }

  return Object.freeze({
    descriptorContractVersion: DOMAIN_FACT_DESCRIPTOR_CONTRACT_VERSION,
    factId: input.factId,
    domainId: input.domainId,
    applicableProjectTypes: Object.freeze([...input.applicableProjectTypes]),
    accessorId: input.accessorId,
    valueKind: "text",
    normalizationVersion: input.normalizationVersion,
    serializationVersion: input.serializationVersion,
    fingerprintVersion: input.fingerprintVersion
  });
}

function isStrictObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactDataProperties(input: Record<string, unknown>): boolean {
  const keys = Reflect.ownKeys(input);
  if (
    keys.length !== DESCRIPTOR_KEYS.length ||
    keys.some((key) => typeof key !== "string" || !DESCRIPTOR_KEYS.includes(key as typeof DESCRIPTOR_KEYS[number]))
  ) {
    return false;
  }
  return DESCRIPTOR_KEYS.every((key) => {
    const property = Object.getOwnPropertyDescriptor(input, key);
    return property !== undefined && Object.prototype.hasOwnProperty.call(property, "value");
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isProjectTypeList(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (
      !Object.prototype.hasOwnProperty.call(value, index) ||
      !isNonEmptyString(value[index])
    ) {
      return false;
    }
  }
  return new Set(value).size === value.length;
}
