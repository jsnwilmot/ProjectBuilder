import {
  validatePlanningClarificationAnswer,
  type PlanningClarificationAnswerSchema,
  type PlanningClarificationAnswerSchemaField,
  type PlanningClarificationAnswerSchemaIssue
} from "./planningClarificationAnswerSchema";
import type { PlanningProposalValue } from "./planningProposals";

export interface PlanningClarificationTextDraft {
  kind: "text";
  value: string;
}

export interface PlanningClarificationBooleanDraft {
  kind: "boolean";
  value: boolean | undefined;
}

export interface PlanningClarificationEnumDraft {
  kind: "enum";
  value: string | undefined;
}

export interface PlanningClarificationStringListDraftItem {
  draftId: string;
  value: string;
}

export interface PlanningClarificationStringListDraft {
  kind: "stringList";
  engaged: boolean;
  items: readonly PlanningClarificationStringListDraftItem[];
}

export interface PlanningClarificationStructuredRecordDraft {
  kind: "structuredRecord";
  fields: Readonly<Record<string, PlanningClarificationAnswerDraft>>;
}

export interface PlanningClarificationStructuredRecordListDraftRow {
  draftId: string;
  fields: Readonly<Record<string, PlanningClarificationAnswerDraft>>;
}

export interface PlanningClarificationStructuredRecordListDraft {
  kind: "structuredRecordList";
  engaged: boolean;
  rows: readonly PlanningClarificationStructuredRecordListDraftRow[];
}

export type PlanningClarificationAnswerDraft =
  | PlanningClarificationTextDraft
  | PlanningClarificationBooleanDraft
  | PlanningClarificationEnumDraft
  | PlanningClarificationStringListDraft
  | PlanningClarificationStructuredRecordDraft
  | PlanningClarificationStructuredRecordListDraft;

export type PlanningClarificationAnswerDraftIssueCode =
  | "answerRequired"
  | "blankListItem"
  | "blankStructuredRow"
  | "draftKindMismatch"
  | "undeclaredDraftField";

export interface PlanningClarificationAnswerDraftIssue {
  code: PlanningClarificationAnswerDraftIssueCode;
  path: readonly (string | number)[];
  message: string;
}

export type PlanningClarificationAnswerDraftConversionResult =
  | {
      outcome: "candidate";
      candidate: PlanningProposalValue;
      issues: readonly [];
    }
  | {
      outcome: "invalid";
      issues: readonly PlanningClarificationAnswerDraftIssue[];
    };

export type PlanningClarificationAnswerDraftValidationResult =
  | {
      outcome: "valid";
      answer: PlanningProposalValue;
      issues: readonly [];
    }
  | {
      outcome: "invalid";
      issues: readonly (PlanningClarificationAnswerDraftIssue | PlanningClarificationAnswerSchemaIssue)[];
    };

export interface PlanningClarificationAnswerIssuePresentation {
  code: string;
  associationPath: readonly (string | number)[];
  location: string;
  message: string;
}

const MAX_CONVERSION_ISSUES = 100;

export function createEmptyPlanningClarificationAnswerDraft(
  schema: PlanningClarificationAnswerSchema
): PlanningClarificationAnswerDraft {
  switch (schema.kind) {
    case "text":
      return { kind: "text", value: "" };
    case "boolean":
      return { kind: "boolean", value: undefined };
    case "enum":
      return { kind: "enum", value: undefined };
    case "stringList":
      return { kind: "stringList", engaged: false, items: [] };
    case "structuredRecord":
      return { kind: "structuredRecord", fields: createFieldDrafts(schema.fields) };
    case "structuredRecordList":
      return { kind: "structuredRecordList", engaged: false, rows: [] };
  }
}

export function createPlanningClarificationStringListDraftItem(
  draftId: string
): PlanningClarificationStringListDraftItem {
  return { draftId, value: "" };
}

export function createPlanningClarificationStructuredRecordListDraftRow(
  schema: Extract<PlanningClarificationAnswerSchema, { kind: "structuredRecordList" }>,
  draftId: string
): PlanningClarificationStructuredRecordListDraftRow {
  return { draftId, fields: createFieldDrafts(schema.fields) };
}

export function isPlanningClarificationAnswerDraftMeaningful(
  draft: PlanningClarificationAnswerDraft
): boolean {
  switch (draft.kind) {
    case "text":
      return draft.value.trim().length > 0;
    case "boolean":
      return draft.value !== undefined;
    case "enum":
      return draft.value !== undefined;
    case "stringList":
      return draft.engaged || draft.items.length > 0 || draft.items.some((item) => item.value.trim().length > 0);
    case "structuredRecord":
      return Object.values(draft.fields).some(isPlanningClarificationAnswerDraftMeaningful);
    case "structuredRecordList":
      return draft.engaged || draft.rows.length > 0 || draft.rows.some((row) => fieldsAreMeaningful(row.fields));
  }
}

export function convertPlanningClarificationAnswerDraft(
  schema: PlanningClarificationAnswerSchema,
  draft: PlanningClarificationAnswerDraft
): PlanningClarificationAnswerDraftConversionResult {
  const issues: PlanningClarificationAnswerDraftIssue[] = [];
  const converted = convertNode(schema, draft, [], true, issues);

  if (issues.length > 0 || converted.state !== "value") {
    if (issues.length === 0) {
      addIssue(issues, "answerRequired", [], "An answer is required before it can be validated.");
    }
    return { outcome: "invalid", issues };
  }

  return { outcome: "candidate", candidate: converted.value, issues: [] };
}

export function validatePlanningClarificationAnswerDraft(
  schema: PlanningClarificationAnswerSchema,
  draft: PlanningClarificationAnswerDraft
): PlanningClarificationAnswerDraftValidationResult {
  const conversion = convertPlanningClarificationAnswerDraft(schema, draft);
  if (conversion.outcome === "invalid") return conversion;

  const validation = validatePlanningClarificationAnswer(schema, conversion.candidate);
  return validation.outcome === "valid"
    ? { outcome: "valid", answer: validation.answer, issues: [] }
    : { outcome: "invalid", issues: validation.issues };
}

export function projectPlanningClarificationAnswerIssues(
  schema: PlanningClarificationAnswerSchema,
  issues: readonly (PlanningClarificationAnswerDraftIssue | PlanningClarificationAnswerSchemaIssue)[]
): readonly PlanningClarificationAnswerIssuePresentation[] {
  return issues.map((entry) => {
    const projected = projectPath(schema, entry.path);
    return {
      code: entry.code,
      associationPath: projected.associationPath,
      location: projected.labels.length > 0 ? projected.labels.join(" > ") : "Answer",
      message: entry.message
    };
  });
}

type NodeConversion =
  | { state: "missing" }
  | { state: "invalid" }
  | { state: "value"; value: PlanningProposalValue };

function convertNode(
  schema: PlanningClarificationAnswerSchema,
  draft: PlanningClarificationAnswerDraft,
  path: readonly (string | number)[],
  root: boolean,
  issues: PlanningClarificationAnswerDraftIssue[]
): NodeConversion {
  if (schema.kind !== draft.kind) {
    addIssue(issues, "draftKindMismatch", path, "Answer draft type does not match the approved schema.");
    return { state: "invalid" };
  }

  switch (schema.kind) {
    case "text":
      if (draft.kind !== "text") return { state: "invalid" };
      return draft.value.trim().length > 0
        ? { state: "value", value: { kind: "text", value: draft.value } }
        : missingOrRequired(root, path, issues);
    case "boolean":
      if (draft.kind !== "boolean") return { state: "invalid" };
      return draft.value === undefined
        ? missingOrRequired(root, path, issues)
        : { state: "value", value: { kind: "boolean", value: draft.value } };
    case "enum":
      if (draft.kind !== "enum") return { state: "invalid" };
      return draft.value === undefined || draft.value.length === 0
        ? missingOrRequired(root, path, issues)
        : { state: "value", value: { kind: "enum", value: draft.value } };
    case "stringList":
      if (draft.kind !== "stringList") return { state: "invalid" };
      if (!draft.engaged && draft.items.length === 0) return missingOrRequired(root, path, issues);
      draft.items.forEach((item, index) => {
        if (item.value.trim().length === 0) {
          addIssue(issues, "blankListItem", [...path, index], "Complete or remove this blank item.");
        }
      });
      return issues.length > 0
        ? { state: "invalid" }
        : { state: "value", value: { kind: "stringList", value: draft.items.map((item) => item.value) } };
    case "structuredRecord": {
      if (draft.kind !== "structuredRecord") return { state: "invalid" };
      if (!root && !isPlanningClarificationAnswerDraftMeaningful(draft)) return { state: "missing" };
      if (hasUndeclaredField(schema.fields, draft.fields)) {
        addIssue(issues, "undeclaredDraftField", path, "Answer draft contains a field outside the approved schema.");
        return { state: "invalid" };
      }
      const value = convertFields(schema.fields, draft.fields, path, issues);
      return issues.length > 0
        ? { state: "invalid" }
        : { state: "value", value: { kind: "structuredRecord", value } };
    }
    case "structuredRecordList": {
      if (draft.kind !== "structuredRecordList") return { state: "invalid" };
      if (!draft.engaged && draft.rows.length === 0) return missingOrRequired(root, path, issues);
      const rows: Record<string, PlanningProposalValue>[] = [];
      draft.rows.forEach((row, index) => {
        const rowPath = [...path, index];
        if (!fieldsAreMeaningful(row.fields)) {
          addIssue(issues, "blankStructuredRow", rowPath, "Complete or remove this blank item.");
          return;
        }
        if (hasUndeclaredField(schema.fields, row.fields)) {
          addIssue(issues, "undeclaredDraftField", rowPath, "Answer draft contains a field outside the approved schema.");
          return;
        }
        rows.push(convertFields(schema.fields, row.fields, rowPath, issues));
      });
      return issues.length > 0
        ? { state: "invalid" }
        : { state: "value", value: { kind: "structuredRecordList", value: rows } };
    }
  }
}

function convertFields(
  schemaFields: readonly PlanningClarificationAnswerSchemaField[],
  draftFields: Readonly<Record<string, PlanningClarificationAnswerDraft>>,
  path: readonly (string | number)[],
  issues: PlanningClarificationAnswerDraftIssue[]
): Record<string, PlanningProposalValue> {
  const value: Record<string, PlanningProposalValue> = {};
  for (const field of schemaFields) {
    const fieldDraft = draftFields[field.key];
    if (!fieldDraft) continue;
    const converted = convertNode(field.schema, fieldDraft, [...path, field.key], false, issues);
    if (converted.state === "value") value[field.key] = converted.value;
  }
  return value;
}

function createFieldDrafts(
  fields: readonly PlanningClarificationAnswerSchemaField[]
): Readonly<Record<string, PlanningClarificationAnswerDraft>> {
  return Object.fromEntries(fields.map((field) => [
    field.key,
    createEmptyPlanningClarificationAnswerDraft(field.schema)
  ]));
}

function fieldsAreMeaningful(
  fields: Readonly<Record<string, PlanningClarificationAnswerDraft>>
): boolean {
  return Object.values(fields).some(isPlanningClarificationAnswerDraftMeaningful);
}

function hasUndeclaredField(
  schemaFields: readonly PlanningClarificationAnswerSchemaField[],
  draftFields: Readonly<Record<string, PlanningClarificationAnswerDraft>>
): boolean {
  const allowed = new Set(schemaFields.map((field) => field.key));
  return Object.keys(draftFields).some((key) => !allowed.has(key));
}

function missingOrRequired(
  root: boolean,
  path: readonly (string | number)[],
  issues: PlanningClarificationAnswerDraftIssue[]
): NodeConversion {
  if (root) addIssue(issues, "answerRequired", path, "An answer is required before it can be validated.");
  return { state: "missing" };
}

function addIssue(
  issues: PlanningClarificationAnswerDraftIssue[],
  code: PlanningClarificationAnswerDraftIssueCode,
  path: readonly (string | number)[],
  message: string
): void {
  if (issues.length < MAX_CONVERSION_ISSUES) {
    issues.push({ code, path: path.slice(0, 50), message });
  }
}

type PathCursor =
  | { kind: "schema"; schema: PlanningClarificationAnswerSchema }
  | { kind: "fields"; fields: readonly PlanningClarificationAnswerSchemaField[] }
  | { kind: "terminal" };

function projectPath(
  schema: PlanningClarificationAnswerSchema,
  path: readonly (string | number)[]
): { associationPath: readonly (string | number)[]; labels: readonly string[] } {
  const associationPath: (string | number)[] = [];
  const labels: string[] = [];
  let cursor: PathCursor = { kind: "schema", schema };

  for (const segment of path) {
    if (typeof segment === "number") {
      if (segment < 0 || !Number.isInteger(segment) || cursor.kind !== "schema") break;
      if (cursor.schema.kind === "structuredRecordList") {
        associationPath.push(segment);
        labels.push(itemLabel(segment));
        cursor = { kind: "fields", fields: cursor.schema.fields };
        continue;
      }
      if (cursor.schema.kind === "stringList") {
        associationPath.push(segment);
        labels.push(itemLabel(segment));
        cursor = { kind: "terminal" };
        continue;
      }
      break;
    }

    const fields: readonly PlanningClarificationAnswerSchemaField[] | undefined = cursor.kind === "fields"
      ? cursor.fields
      : cursor.kind === "schema" && cursor.schema.kind === "structuredRecord"
        ? cursor.schema.fields
        : undefined;
    const field: PlanningClarificationAnswerSchemaField | undefined = fields?.find(
      (entry: PlanningClarificationAnswerSchemaField) => entry.key === segment
    );
    if (!field) break;
    associationPath.push(segment);
    labels.push(field.label);
    cursor = { kind: "schema", schema: field.schema };
  }

  return { associationPath, labels };
}

function itemLabel(zeroBasedIndex: number): string {
  return `Item ${zeroBasedIndex + 1}`;
}
