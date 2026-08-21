import {
  PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
  normalizePlanningClarificationAnswerSchema,
  type PlanningClarificationAnswerSchema,
  type PlanningClarificationAnswerSchemaField
} from "./planningClarificationAnswerSchema";

export interface PlanningClarificationAnswerSchemaRegistryEntry {
  ruleId: string;
  ruleVersion: string;
  schema: PlanningClarificationAnswerSchema;
}

export interface PlanningClarificationAnswerSchemaRegistry {
  contractVersion: typeof PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION;
  entries: readonly PlanningClarificationAnswerSchemaRegistryEntry[];
}

export type PlanningClarificationAnswerSchemaRegistryIssueCode =
  | "invalidRegistry"
  | "invalidEntry"
  | "invalidRuleId"
  | "invalidRuleVersion"
  | "invalidSchema"
  | "duplicateEntry";

export interface PlanningClarificationAnswerSchemaRegistryIssue {
  code: PlanningClarificationAnswerSchemaRegistryIssueCode;
  entryIndex?: number;
  field?: "contractVersion" | "entries" | "ruleId" | "ruleVersion" | "schema";
  message: string;
}

export type PlanningClarificationAnswerSchemaRegistryNormalizationResult =
  | {
      outcome: "valid";
      registry: PlanningClarificationAnswerSchemaRegistry;
      issues: readonly [];
    }
  | {
      outcome: "invalid";
      issues: readonly PlanningClarificationAnswerSchemaRegistryIssue[];
    };

const RULE_ID_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)*$/;
const RULE_VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const REGISTRY_ENTRY_LIMIT = 500;
const RULE_ID_LIMIT = 128;
const RULE_VERSION_LIMIT = 64;

const PRODUCTION_REGISTRY = deepFreeze({
  contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
  entries: []
} as const satisfies PlanningClarificationAnswerSchemaRegistry);

export function normalizePlanningClarificationAnswerSchemaRegistry(
  input: unknown
): PlanningClarificationAnswerSchemaRegistryNormalizationResult {
  if (!isPlainObject(input) || !hasOnlyKeys(input, ["contractVersion", "entries"])) {
    return invalidRegistry("Registry must be a canonical registry object.");
  }
  if (input.contractVersion !== PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION) {
    return {
      outcome: "invalid",
      issues: [issue("invalidRegistry", "Registry contract version is invalid.", undefined, "contractVersion")]
    };
  }
  if (!Array.isArray(input.entries) || input.entries.length > REGISTRY_ENTRY_LIMIT || hasSparseArrayEntry(input.entries)) {
    return {
      outcome: "invalid",
      issues: [issue("invalidRegistry", "Registry entries are invalid.", undefined, "entries")]
    };
  }

  const issues: PlanningClarificationAnswerSchemaRegistryIssue[] = [];
  const entries: PlanningClarificationAnswerSchemaRegistryEntry[] = [];
  const identities = new Set<string>();
  input.entries.forEach((entry, entryIndex) => {
    if (!isPlainObject(entry) || !hasOnlyKeys(entry, ["ruleId", "ruleVersion", "schema"])) {
      issues.push(issue("invalidEntry", "Registry entry is invalid.", entryIndex));
      return;
    }
    const ruleId = normalizeRuleIdentity(entry.ruleId, RULE_ID_LIMIT, RULE_ID_PATTERN);
    const ruleVersion = normalizeRuleIdentity(entry.ruleVersion, RULE_VERSION_LIMIT, RULE_VERSION_PATTERN);
    if (!ruleId) {
      issues.push(issue("invalidRuleId", "Registry rule ID is invalid.", entryIndex, "ruleId"));
    }
    if (!ruleVersion) {
      issues.push(issue("invalidRuleVersion", "Registry rule version is invalid.", entryIndex, "ruleVersion"));
    }
    const schemaResult = normalizePlanningClarificationAnswerSchema(entry.schema);
    if (schemaResult.outcome === "invalid") {
      issues.push(issue("invalidSchema", "Registry answer schema is invalid.", entryIndex, "schema"));
    }
    if (!ruleId || !ruleVersion || schemaResult.outcome === "invalid") {
      return;
    }
    const identity = `${ruleId}\u0000${ruleVersion}`;
    if (identities.has(identity)) {
      issues.push(issue("duplicateEntry", "Registry rule ID and version pair must be unique.", entryIndex));
      return;
    }
    identities.add(identity);
    entries.push({ ruleId, ruleVersion, schema: schemaResult.schema });
  });

  if (issues.length > 0) {
    return { outcome: "invalid", issues: issues.slice(0, 100) };
  }
  return {
    outcome: "valid",
    registry: deepFreeze({
      contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
      entries
    }),
    issues: []
  };
}

export function lookupPlanningClarificationAnswerSchema(
  registry: PlanningClarificationAnswerSchemaRegistry,
  ruleId: string,
  ruleVersion: string
): PlanningClarificationAnswerSchema | undefined {
  const entry = registry.entries.find(
    (candidate) => candidate.ruleId === ruleId && candidate.ruleVersion === ruleVersion
  );
  return entry ? cloneSchema(entry.schema) : undefined;
}

export function getProductionPlanningClarificationAnswerSchemaRegistry(): PlanningClarificationAnswerSchemaRegistry {
  return cloneRegistry(PRODUCTION_REGISTRY);
}

export function getProductionPlanningClarificationAnswerSchema(
  ruleId: string,
  ruleVersion: string
): PlanningClarificationAnswerSchema | undefined {
  return lookupPlanningClarificationAnswerSchema(PRODUCTION_REGISTRY, ruleId, ruleVersion);
}

function normalizeRuleIdentity(input: unknown, limit: number, pattern: RegExp): string | null {
  if (typeof input !== "string") return null;
  return input && input.length <= limit && pattern.test(input) ? input : null;
}

function cloneRegistry(registry: PlanningClarificationAnswerSchemaRegistry): PlanningClarificationAnswerSchemaRegistry {
  return {
    contractVersion: registry.contractVersion,
    entries: registry.entries.map((entry) => ({
      ruleId: entry.ruleId,
      ruleVersion: entry.ruleVersion,
      schema: cloneSchema(entry.schema)
    }))
  };
}

function cloneSchema(schema: PlanningClarificationAnswerSchema): PlanningClarificationAnswerSchema {
  switch (schema.kind) {
    case "text":
      return schema.maxLength === undefined ? { kind: "text" } : { kind: "text", maxLength: schema.maxLength };
    case "boolean":
      return { kind: "boolean" };
    case "enum":
      return { kind: "enum", options: [...schema.options] };
    case "stringList":
      return {
        kind: "stringList",
        ...(schema.minItems === undefined ? {} : { minItems: schema.minItems }),
        ...(schema.maxItems === undefined ? {} : { maxItems: schema.maxItems }),
        ...(schema.itemMaxLength === undefined ? {} : { itemMaxLength: schema.itemMaxLength })
      };
    case "structuredRecord":
      return { kind: "structuredRecord", fields: schema.fields.map(cloneField) };
    case "structuredRecordList":
      return {
        kind: "structuredRecordList",
        fields: schema.fields.map(cloneField),
        ...(schema.minItems === undefined ? {} : { minItems: schema.minItems }),
        ...(schema.maxItems === undefined ? {} : { maxItems: schema.maxItems })
      };
  }
}

function cloneField(field: PlanningClarificationAnswerSchemaField): PlanningClarificationAnswerSchemaField {
  return {
    key: field.key,
    label: field.label,
    required: field.required,
    schema: cloneSchema(field.schema)
  };
}

function invalidRegistry(message: string): PlanningClarificationAnswerSchemaRegistryNormalizationResult {
  return { outcome: "invalid", issues: [issue("invalidRegistry", message)] };
}

function issue(
  code: PlanningClarificationAnswerSchemaRegistryIssueCode,
  message: string,
  entryIndex?: number,
  field?: PlanningClarificationAnswerSchemaRegistryIssue["field"]
): PlanningClarificationAnswerSchemaRegistryIssue {
  return {
    code,
    message,
    ...(entryIndex === undefined ? {} : { entryIndex }),
    ...(field === undefined ? {} : { field })
  };
}

function hasOnlyKeys(input: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(input).every((key) => allowed.includes(key));
}

function hasSparseArrayEntry(input: readonly unknown[]): boolean {
  for (let index = 0; index < input.length; index += 1) {
    if (!(index in input)) return true;
  }
  return false;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze<T>(input: T): T {
  if (typeof input !== "object" || input === null || Object.isFrozen(input)) return input;
  Object.freeze(input);
  Object.values(input).forEach((value) => deepFreeze(value));
  return input;
}
