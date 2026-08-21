import {
  normalizePlanningProposalValue,
  type PlanningProposalValue
} from "./planningProposals";

export const PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION = "phase-5c.3c.3c";

export const PLANNING_CLARIFICATION_ANSWER_SCHEMA_KINDS = [
  "text",
  "boolean",
  "enum",
  "stringList",
  "structuredRecord",
  "structuredRecordList"
] as const;

export type PlanningClarificationAnswerSchemaKind =
  (typeof PLANNING_CLARIFICATION_ANSWER_SCHEMA_KINDS)[number];

export interface PlanningClarificationTextAnswerSchema {
  kind: "text";
  maxLength?: number;
}

export interface PlanningClarificationBooleanAnswerSchema {
  kind: "boolean";
}

export interface PlanningClarificationEnumAnswerSchema {
  kind: "enum";
  options: readonly string[];
}

export interface PlanningClarificationStringListAnswerSchema {
  kind: "stringList";
  minItems?: number;
  maxItems?: number;
  itemMaxLength?: number;
}

export interface PlanningClarificationAnswerSchemaField {
  key: string;
  label: string;
  required: boolean;
  schema: PlanningClarificationAnswerSchema;
}

export interface PlanningClarificationStructuredRecordAnswerSchema {
  kind: "structuredRecord";
  fields: readonly PlanningClarificationAnswerSchemaField[];
}

export interface PlanningClarificationStructuredRecordListAnswerSchema {
  kind: "structuredRecordList";
  fields: readonly PlanningClarificationAnswerSchemaField[];
  minItems?: number;
  maxItems?: number;
}

export type PlanningClarificationAnswerSchema =
  | PlanningClarificationTextAnswerSchema
  | PlanningClarificationBooleanAnswerSchema
  | PlanningClarificationEnumAnswerSchema
  | PlanningClarificationStringListAnswerSchema
  | PlanningClarificationStructuredRecordAnswerSchema
  | PlanningClarificationStructuredRecordListAnswerSchema;

export type PlanningClarificationAnswerSchemaIssueCode =
  | "invalidSchema"
  | "invalidAnswer"
  | "kindMismatch"
  | "missingRequiredField"
  | "unexpectedField"
  | "enumOptionInvalid"
  | "minItemsNotMet"
  | "maxItemsExceeded"
  | "textLimitExceeded"
  | "itemLimitExceeded"
  | "structuredDepthExceeded";

export type PlanningClarificationAnswerSchemaIssuePath = readonly (string | number)[];

export interface PlanningClarificationAnswerSchemaIssue {
  code: PlanningClarificationAnswerSchemaIssueCode;
  path: PlanningClarificationAnswerSchemaIssuePath;
  message: string;
}

export type PlanningClarificationAnswerSchemaNormalizationResult =
  | {
      outcome: "valid";
      schema: PlanningClarificationAnswerSchema;
      issues: readonly [];
    }
  | {
      outcome: "invalid";
      issues: readonly PlanningClarificationAnswerSchemaIssue[];
    };

export type PlanningClarificationAnswerValidationResult =
  | {
      outcome: "valid";
      answer: PlanningProposalValue;
      issues: readonly [];
    }
  | {
      outcome: "invalid";
      issues: readonly PlanningClarificationAnswerSchemaIssue[];
    };

const LIMITS = {
  text: 4000,
  shortText: 500,
  label: 240,
  listItems: 100,
  structuredFields: 50,
  structuredDepth: 4,
  issues: 100
} as const;

export function normalizePlanningClarificationAnswerSchema(
  input: unknown
): PlanningClarificationAnswerSchemaNormalizationResult {
  const issues: PlanningClarificationAnswerSchemaIssue[] = [];
  const schema = normalizeSchema(input, 0, [], issues);
  return schema && issues.length === 0
    ? { outcome: "valid", schema, issues: [] }
    : { outcome: "invalid", issues };
}

export function validatePlanningClarificationAnswer(
  schemaInput: unknown,
  answerInput: unknown
): PlanningClarificationAnswerValidationResult {
  const schemaResult = normalizePlanningClarificationAnswerSchema(schemaInput);
  if (schemaResult.outcome === "invalid") {
    return schemaResult;
  }

  const answer = normalizePlanningProposalValue(answerInput);
  if (!answer) {
    return {
      outcome: "invalid",
      issues: [issue("invalidAnswer", [], "Answer does not satisfy canonical Planning value requirements.")]
    };
  }

  const issues: PlanningClarificationAnswerSchemaIssue[] = [];
  validateAnswerValue(schemaResult.schema, answer, [], issues);
  return issues.length === 0
    ? { outcome: "valid", answer, issues: [] }
    : { outcome: "invalid", issues };
}

function normalizeSchema(
  input: unknown,
  structuredDepth: number,
  path: PlanningClarificationAnswerSchemaIssuePath,
  issues: PlanningClarificationAnswerSchemaIssue[]
): PlanningClarificationAnswerSchema | null {
  if (!isPlainObject(input) || typeof input.kind !== "string") {
    addIssue(issues, "invalidSchema", path, "Schema must be a supported semantic schema object.");
    return null;
  }

  switch (input.kind) {
    case "text": {
      if (!hasOnlyKeys(input, ["kind", "maxLength"])) {
        addIssue(issues, "invalidSchema", path, "Text schema contains unsupported metadata.");
        return null;
      }
      const maxLength = normalizeOptionalPositiveInteger(input.maxLength, LIMITS.text);
      if (maxLength === null) {
        addIssue(issues, "invalidSchema", [...path, "maxLength"], "Text limit is invalid.");
        return null;
      }
      return { kind: "text", maxLength: maxLength ?? LIMITS.text };
    }
    case "boolean":
      if (!hasOnlyKeys(input, ["kind"])) {
        addIssue(issues, "invalidSchema", path, "Boolean schema contains unsupported metadata.");
        return null;
      }
      return { kind: "boolean" };
    case "enum": {
      if (!hasOnlyKeys(input, ["kind", "options"])) {
        addIssue(issues, "invalidSchema", path, "Enum schema contains unsupported metadata.");
        return null;
      }
      const options = normalizeOptions(input.options, path, issues);
      return options ? { kind: "enum", options } : null;
    }
    case "stringList": {
      if (!hasOnlyKeys(input, ["kind", "minItems", "maxItems", "itemMaxLength"])) {
        addIssue(issues, "invalidSchema", path, "String-list schema contains unsupported metadata.");
        return null;
      }
      const bounds = normalizeListBounds(input, path, issues, true);
      return bounds
        ? {
            kind: "stringList",
            minItems: bounds.minItems,
            maxItems: bounds.maxItems,
            itemMaxLength: bounds.itemMaxLength
          }
        : null;
    }
    case "structuredRecord": {
      if (!hasOnlyKeys(input, ["kind", "fields"])) {
        addIssue(issues, "invalidSchema", path, "Structured-record schema contains unsupported metadata.");
        return null;
      }
      const nextDepth = structuredDepth + 1;
      if (nextDepth > LIMITS.structuredDepth) {
        addIssue(issues, "structuredDepthExceeded", path, "Structured schema depth exceeds the supported limit.");
        return null;
      }
      const fields = normalizeFields(input.fields, nextDepth, path, issues);
      return fields ? { kind: "structuredRecord", fields } : null;
    }
    case "structuredRecordList": {
      if (!hasOnlyKeys(input, ["kind", "fields", "minItems", "maxItems"])) {
        addIssue(issues, "invalidSchema", path, "Structured-record-list schema contains unsupported metadata.");
        return null;
      }
      const nextDepth = structuredDepth + 1;
      if (nextDepth > LIMITS.structuredDepth) {
        addIssue(issues, "structuredDepthExceeded", path, "Structured schema depth exceeds the supported limit.");
        return null;
      }
      const bounds = normalizeListBounds(input, path, issues, false);
      const fields = normalizeFields(input.fields, nextDepth, path, issues);
      return bounds && fields
        ? {
            kind: "structuredRecordList",
            fields,
            minItems: bounds.minItems,
            maxItems: bounds.maxItems
          }
        : null;
    }
    default:
      addIssue(issues, "invalidSchema", path, "Schema kind is unsupported.");
      return null;
  }
}

function normalizeFields(
  input: unknown,
  structuredDepth: number,
  path: PlanningClarificationAnswerSchemaIssuePath,
  issues: PlanningClarificationAnswerSchemaIssue[]
): readonly PlanningClarificationAnswerSchemaField[] | null {
  if (!Array.isArray(input) || input.length > LIMITS.structuredFields || hasSparseArrayEntry(input)) {
    addIssue(issues, "invalidSchema", [...path, "fields"], "Structured fields are invalid.");
    return null;
  }

  const fields: PlanningClarificationAnswerSchemaField[] = [];
  const keys = new Set<string>();
  let valid = true;
  input.forEach((rawField, index) => {
    const fieldPath = [...path, "fields", index];
    if (!isPlainObject(rawField) || !hasOnlyKeys(rawField, ["key", "label", "required", "schema"])) {
      addIssue(issues, "invalidSchema", fieldPath, "Structured field is invalid.");
      valid = false;
      return;
    }
    const key = normalizeSchemaText(rawField.key, LIMITS.shortText, false);
    const label = normalizeSchemaText(rawField.label, LIMITS.label, true);
    if (!key || key === "__proto__" || key === "constructor" || key === "prototype") {
      addIssue(issues, "invalidSchema", [...fieldPath, "key"], "Structured field key is invalid.");
      valid = false;
    }
    if (!label) {
      addIssue(issues, "invalidSchema", [...fieldPath, "label"], "Structured field label is invalid.");
      valid = false;
    }
    if (typeof rawField.required !== "boolean") {
      addIssue(issues, "invalidSchema", [...fieldPath, "required"], "Structured field required flag is invalid.");
      valid = false;
    }
    if (key && keys.has(key)) {
      addIssue(issues, "invalidSchema", [...fieldPath, "key"], "Structured field keys must be unique.");
      valid = false;
    } else if (key) {
      keys.add(key);
    }
    const schema = normalizeSchema(rawField.schema, structuredDepth, key ? [...path, key] : fieldPath, issues);
    if (!schema) {
      valid = false;
    }
    if (key && label && typeof rawField.required === "boolean" && schema) {
      fields.push({ key, label, required: rawField.required, schema });
    }
  });
  return valid ? fields : null;
}

function normalizeOptions(
  input: unknown,
  path: PlanningClarificationAnswerSchemaIssuePath,
  issues: PlanningClarificationAnswerSchemaIssue[]
): readonly string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > LIMITS.listItems || hasSparseArrayEntry(input)) {
    addIssue(issues, "invalidSchema", [...path, "options"], "Enum options are invalid.");
    return null;
  }
  const options = input.map((entry) => normalizeSchemaText(entry, LIMITS.shortText, true));
  if (options.some((entry) => !entry)) {
    addIssue(issues, "invalidSchema", [...path, "options"], "Enum option is invalid.");
    return null;
  }
  const normalized = options as string[];
  if (new Set(normalized).size !== normalized.length) {
    addIssue(issues, "invalidSchema", [...path, "options"], "Enum options must be unique.");
    return null;
  }
  return normalized;
}

function normalizeListBounds(
  input: Record<string, unknown>,
  path: PlanningClarificationAnswerSchemaIssuePath,
  issues: PlanningClarificationAnswerSchemaIssue[],
  includeItemLimit: boolean
): { minItems: number; maxItems: number; itemMaxLength?: number } | null {
  const minItems = normalizeOptionalNonNegativeInteger(input.minItems, LIMITS.listItems);
  const maxItems = normalizeOptionalNonNegativeInteger(input.maxItems, LIMITS.listItems);
  const itemMaxLength = includeItemLimit
    ? normalizeOptionalPositiveInteger(input.itemMaxLength, LIMITS.shortText)
    : undefined;
  const normalizedMin = minItems ?? 0;
  const normalizedMax = maxItems ?? LIMITS.listItems;
  if (
    minItems === null ||
    maxItems === null ||
    itemMaxLength === null ||
    normalizedMin > normalizedMax
  ) {
    addIssue(issues, "invalidSchema", path, "List bounds are invalid.");
    return null;
  }
  return {
    minItems: normalizedMin,
    maxItems: normalizedMax,
    ...(includeItemLimit ? { itemMaxLength: itemMaxLength ?? LIMITS.shortText } : {})
  };
}

function validateAnswerValue(
  schema: PlanningClarificationAnswerSchema,
  answer: PlanningProposalValue,
  path: PlanningClarificationAnswerSchemaIssuePath,
  issues: PlanningClarificationAnswerSchemaIssue[]
): void {
  if (answer.kind !== schema.kind) {
    addIssue(issues, "kindMismatch", path, "Answer kind does not match the semantic schema.");
    return;
  }
  switch (schema.kind) {
    case "text":
      if (answer.kind === "text" && answer.value.length > (schema.maxLength ?? LIMITS.text)) {
        addIssue(issues, "textLimitExceeded", path, "Text answer exceeds the schema limit.");
      }
      return;
    case "boolean":
      return;
    case "enum":
      if (answer.kind === "enum" && !schema.options.includes(answer.value)) {
        addIssue(issues, "enumOptionInvalid", path, "Enum answer is not a registered option.");
      }
      return;
    case "stringList":
      if (answer.kind === "stringList") {
        validateItemCount(answer.value.length, schema.minItems ?? 0, schema.maxItems ?? LIMITS.listItems, path, issues);
        answer.value.forEach((entry, index) => {
          if (entry.length > (schema.itemMaxLength ?? LIMITS.shortText)) {
            addIssue(issues, "itemLimitExceeded", [...path, index], "List item exceeds the schema limit.");
          }
        });
      }
      return;
    case "structuredRecord":
      if (answer.kind === "structuredRecord") {
        validateRecordFields(schema.fields, answer.value, path, issues);
      }
      return;
    case "structuredRecordList":
      if (answer.kind === "structuredRecordList") {
        validateItemCount(answer.value.length, schema.minItems ?? 0, schema.maxItems ?? LIMITS.listItems, path, issues);
        answer.value.forEach((row, index) => validateRecordFields(schema.fields, row, [...path, index], issues));
      }
      return;
  }
}

function validateRecordFields(
  fields: readonly PlanningClarificationAnswerSchemaField[],
  answer: Record<string, PlanningProposalValue>,
  path: PlanningClarificationAnswerSchemaIssuePath,
  issues: PlanningClarificationAnswerSchemaIssue[]
): void {
  const fieldsByKey = new Map(fields.map((field) => [field.key, field]));
  for (const key of Object.keys(answer)) {
    if (!fieldsByKey.has(key)) {
      addIssue(issues, "unexpectedField", path, "Answer contains an undeclared field.");
    }
  }
  for (const field of fields) {
    const value = answer[field.key];
    if (value === undefined) {
      if (field.required) {
        addIssue(issues, "missingRequiredField", [...path, field.key], "Required answer field is missing.");
      }
      continue;
    }
    validateAnswerValue(field.schema, value, [...path, field.key], issues);
  }
}

function validateItemCount(
  count: number,
  minItems: number,
  maxItems: number,
  path: PlanningClarificationAnswerSchemaIssuePath,
  issues: PlanningClarificationAnswerSchemaIssue[]
): void {
  if (count < minItems) {
    addIssue(issues, "minItemsNotMet", path, "Answer contains fewer items than required.");
  }
  if (count > maxItems) {
    addIssue(issues, "maxItemsExceeded", path, "Answer contains more items than allowed.");
  }
}

function normalizeSchemaText(input: unknown, limit: number, rejectHtml: boolean): string | null {
  if (typeof input !== "string") return null;
  const value = input.replace(/\r\n?/g, "\n").trim();
  if (!value || value.length > limit || /[\r\n]/.test(value) || hasDisallowedControls(value)) return null;
  if (rejectHtml && /[<>]/.test(value)) return null;
  return isSafeText(value) ? value : null;
}

function isSafeText(value: string): boolean {
  const lower = value.toLowerCase();
  if (/<\s*script\b/.test(lower) || /javascript\s*:/.test(lower) || /\son[a-z]+\s*=/.test(lower)) return false;
  if (/^\s*(function\s+\w*|\(?\s*[\w,\s]*\)?\s*=>|class\s+\w+|import\s+.+\s+from\s+|export\s+)/m.test(value)) return false;
  if (/^\s*(set|collect|patch|submitform|navigate|remove|updatecontext)\s*\(/im.test(value)) return false;
  if (/^\s*(screens?|controls?|properties?|items?|onselect):\s*$/im.test(value)) return false;
  if (/^\s*[\w.-]+\s*:\s*[\w[{]/m.test(value) && /(?:\n\s+[\w.-]+\s*:|\n\s*-\s+)/.test(value)) return false;
  return true;
}

function hasDisallowedControls(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if ((code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
}

function normalizeOptionalPositiveInteger(input: unknown, maximum: number): number | undefined | null {
  if (input === undefined) return undefined;
  return Number.isInteger(input) && typeof input === "number" && input > 0 && input <= maximum ? input : null;
}

function normalizeOptionalNonNegativeInteger(input: unknown, maximum: number): number | undefined | null {
  if (input === undefined) return undefined;
  return Number.isInteger(input) && typeof input === "number" && input >= 0 && input <= maximum ? input : null;
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

function addIssue(
  issues: PlanningClarificationAnswerSchemaIssue[],
  code: PlanningClarificationAnswerSchemaIssueCode,
  path: PlanningClarificationAnswerSchemaIssuePath,
  message: string
): void {
  if (issues.length < LIMITS.issues) {
    issues.push(issue(code, path.slice(0, LIMITS.structuredFields), message));
  }
}

function issue(
  code: PlanningClarificationAnswerSchemaIssueCode,
  path: PlanningClarificationAnswerSchemaIssuePath,
  message: string
): PlanningClarificationAnswerSchemaIssue {
  return { code, path, message };
}
