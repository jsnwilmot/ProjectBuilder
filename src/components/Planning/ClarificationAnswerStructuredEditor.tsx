import { useId, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createPlanningClarificationStructuredRecordListDraftRow,
  type PlanningClarificationAnswerDraft,
  type PlanningClarificationAnswerIssuePresentation,
  type PlanningClarificationStructuredRecordDraft,
  type PlanningClarificationStructuredRecordListDraft
} from "../../lib/planningClarificationAnswerDraft";
import type {
  PlanningClarificationAnswerSchema,
  PlanningClarificationStructuredRecordAnswerSchema,
  PlanningClarificationStructuredRecordListAnswerSchema
} from "../../lib/planningClarificationAnswerSchema";
import { planningClarificationItemLabel } from "../../lib/planningClarificationAnswerEntryViewModel";
import { ClarificationAnswerPrimitiveEditor } from "./ClarificationAnswerPrimitiveEditor";

type StructuredKind = "structuredRecord" | "structuredRecordList";
type StructuredSchema<K extends StructuredKind = StructuredKind> = Extract<
  PlanningClarificationAnswerSchema,
  { kind: K }
>;
type StructuredDraft<K extends StructuredKind = StructuredKind> = Extract<
  PlanningClarificationAnswerDraft,
  { kind: K }
>;

interface SharedStructuredEditorProps {
  label: string;
  required: boolean;
  disabled?: boolean;
  issues?: readonly PlanningClarificationAnswerIssuePresentation[];
}

type StructuredEditorPropsFor<K extends StructuredKind> = SharedStructuredEditorProps & {
  schema: StructuredSchema<K>;
  draft: StructuredDraft<K>;
  onChange: (draft: StructuredDraft<K>) => void;
};

export type ClarificationAnswerStructuredEditorProps = {
  [K in StructuredKind]: StructuredEditorPropsFor<K>;
}[StructuredKind];

interface StructuredNodeProps {
  schema: StructuredSchema;
  draft: StructuredDraft;
  label: string;
  required: boolean;
  disabled: boolean;
  issues: readonly PlanningClarificationAnswerIssuePresentation[];
  path: readonly (string | number)[];
  onChange: (draft: StructuredDraft) => void;
}

export function ClarificationAnswerStructuredEditor(
  props: ClarificationAnswerStructuredEditorProps
) {
  if (props.schema.kind === "structuredRecord") {
    if (props.draft.kind !== "structuredRecord") return <DraftMismatchNotice />;
    const onChange = props.onChange as (draft: PlanningClarificationStructuredRecordDraft) => void;
    return (
      <StructuredRecordEditor
        disabled={props.disabled ?? false}
        draft={props.draft}
        issues={props.issues ?? []}
        label={props.label}
        path={[]}
        required={props.required}
        schema={props.schema}
        onChange={onChange}
      />
    );
  }

  if (props.draft.kind !== "structuredRecordList") return <DraftMismatchNotice />;
  const onChange = props.onChange as (draft: PlanningClarificationStructuredRecordListDraft) => void;
  return (
    <StructuredRecordListEditor
      disabled={props.disabled ?? false}
      draft={props.draft}
      issues={props.issues ?? []}
      label={props.label}
      path={[]}
      required={props.required}
      schema={props.schema}
      onChange={onChange}
    />
  );
}

function StructuredDraftNode({
  schema,
  draft,
  label,
  required,
  disabled,
  issues,
  path,
  onChange
}: {
  schema: PlanningClarificationAnswerSchema;
  draft: PlanningClarificationAnswerDraft;
  label: string;
  required: boolean;
  disabled: boolean;
  issues: readonly PlanningClarificationAnswerIssuePresentation[];
  path: readonly (string | number)[];
  onChange: (draft: PlanningClarificationAnswerDraft) => void;
}) {
  const childIssues = issuesBelowPath(issues, path);

  if (schema.kind === "text" && draft.kind === "text") {
    return (
      <ClarificationAnswerPrimitiveEditor
        disabled={disabled}
        draft={draft}
        issues={childIssues}
        label={label}
        required={required}
        schema={schema}
        onChange={onChange}
      />
    );
  }
  if (schema.kind === "boolean" && draft.kind === "boolean") {
    return (
      <ClarificationAnswerPrimitiveEditor
        disabled={disabled}
        draft={draft}
        issues={childIssues}
        label={label}
        required={required}
        schema={schema}
        onChange={onChange}
      />
    );
  }
  if (schema.kind === "enum" && draft.kind === "enum") {
    return (
      <ClarificationAnswerPrimitiveEditor
        disabled={disabled}
        draft={draft}
        issues={childIssues}
        label={label}
        required={required}
        schema={schema}
        onChange={onChange}
      />
    );
  }
  if (schema.kind === "stringList" && draft.kind === "stringList") {
    return (
      <ClarificationAnswerPrimitiveEditor
        disabled={disabled}
        draft={draft}
        issues={childIssues}
        label={label}
        required={required}
        schema={schema}
        onChange={onChange}
      />
    );
  }
  if (schema.kind === "structuredRecord" && draft.kind === "structuredRecord") {
    return (
      <StructuredRecordEditor
        disabled={disabled}
        draft={draft}
        issues={childIssues}
        label={label}
        path={path}
        required={required}
        schema={schema}
        onChange={onChange}
      />
    );
  }
  if (schema.kind === "structuredRecordList" && draft.kind === "structuredRecordList") {
    return (
      <StructuredRecordListEditor
        disabled={disabled}
        draft={draft}
        issues={childIssues}
        label={label}
        path={path}
        required={required}
        schema={schema}
        onChange={onChange}
      />
    );
  }

  return <DraftMismatchNotice />;
}

function StructuredRecordEditor({
  schema,
  draft,
  label,
  required,
  disabled,
  issues,
  path,
  onChange
}: Omit<StructuredNodeProps, "schema" | "draft" | "onChange"> & {
  schema: PlanningClarificationStructuredRecordAnswerSchema;
  draft: PlanningClarificationStructuredRecordDraft;
  onChange: (draft: PlanningClarificationStructuredRecordDraft) => void;
}) {
  const issueIdPrefix = useId();
  const directIssues = issuesAtPath(issues, path);
  const issueId = directIssues.length > 0 ? `${issueIdPrefix}-issues` : undefined;

  const updateField = (fieldKey: string, fieldDraft: PlanningClarificationAnswerDraft) => {
    onChange({
      kind: "structuredRecord",
      fields: { ...draft.fields, [fieldKey]: fieldDraft }
    });
  };

  return (
    <fieldset
      className="planning-answer-structured planning-answer-structured-record"
      aria-describedby={issueId}
      aria-required={required}
      disabled={disabled}
    >
      <legend className="planning-answer-structured-legend">
        {label}
        <RequiredIndicator required={required} />
      </legend>
      <div className="planning-answer-structured-fields">
        {schema.fields.map((field) => {
          const fieldDraft = draft.fields[field.key];
          return (
            <div className="planning-answer-structured-field" key={field.key}>
              {fieldDraft ? (
                <StructuredDraftNode
                  disabled={disabled}
                  draft={fieldDraft}
                  issues={issues}
                  label={field.label}
                  path={[...path, field.key]}
                  required={field.required}
                  schema={field.schema}
                  onChange={(nextDraft) => updateField(field.key, nextDraft)}
                />
              ) : (
                <MissingFieldNotice label={field.label} required={field.required} />
              )}
            </div>
          );
        })}
      </div>
      <IssueList id={issueId} issues={directIssues} />
    </fieldset>
  );
}

function StructuredRecordListEditor({
  schema,
  draft,
  label,
  required,
  disabled,
  issues,
  path,
  onChange
}: Omit<StructuredNodeProps, "schema" | "draft" | "onChange"> & {
  schema: PlanningClarificationStructuredRecordListAnswerSchema;
  draft: PlanningClarificationStructuredRecordListDraft;
  onChange: (draft: PlanningClarificationStructuredRecordListDraft) => void;
}) {
  const idPrefix = useId();
  const draftIdPrefix = useId();
  const draftIdCounter = useRef(0);
  const directIssues = issuesAtPath(issues, path);
  const issueId = directIssues.length > 0 ? `${idPrefix}-issues` : undefined;
  const atMaximum = schema.maxItems !== undefined && draft.rows.length >= schema.maxItems;

  const addRow = () => {
    if (disabled || atMaximum) return;
    draftIdCounter.current += 1;
    onChange({
      kind: "structuredRecordList",
      engaged: true,
      rows: [
        ...draft.rows,
        createPlanningClarificationStructuredRecordListDraftRow(
          schema,
          `${draftIdPrefix}-row-${draftIdCounter.current}`
        )
      ]
    });
  };

  const removeRow = (rowIndex: number) => {
    if (disabled) return;
    onChange({
      kind: "structuredRecordList",
      engaged: true,
      rows: draft.rows.filter((_, index) => index !== rowIndex)
    });
  };

  const updateRowField = (
    rowIndex: number,
    fieldKey: string,
    fieldDraft: PlanningClarificationAnswerDraft
  ) => {
    onChange({
      kind: "structuredRecordList",
      engaged: true,
      rows: draft.rows.map((row, index) => index === rowIndex
        ? { ...row, fields: { ...row.fields, [fieldKey]: fieldDraft } }
        : row)
    });
  };

  return (
    <fieldset
      className="planning-answer-structured planning-answer-structured-list"
      aria-describedby={issueId}
      aria-required={required}
      disabled={disabled}
    >
      <legend className="planning-answer-structured-legend">
        {label}
        <RequiredIndicator required={required} />
      </legend>
      <div className="planning-answer-structured-rows">
        {draft.rows.map((row, rowIndex) => {
          const itemLabel = planningClarificationItemLabel(rowIndex);
          const rowPath = [...path, rowIndex];
          const rowIssues = issuesAtPath(issues, rowPath);
          const rowLabelId = `${idPrefix}-row-${rowIndex + 1}-label`;
          const rowIssueId = rowIssues.length > 0 ? `${idPrefix}-row-${rowIndex + 1}-issues` : undefined;
          return (
            <article
              className="planning-answer-structured-row"
              aria-describedby={rowIssueId}
              aria-labelledby={rowLabelId}
              key={row.draftId}
            >
              <div className="planning-answer-structured-row-header">
                <span className="planning-answer-structured-row-title" id={rowLabelId}>
                  {itemLabel}
                </span>
                <button
                  className="button button-secondary planning-answer-structured-remove"
                  aria-label={`Remove ${itemLabel} from ${label}`}
                  disabled={disabled}
                  title={`Remove ${itemLabel}`}
                  type="button"
                  onClick={() => removeRow(rowIndex)}
                >
                  <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
                  <span>Remove</span>
                </button>
              </div>
              <IssueList id={rowIssueId} issues={rowIssues} />
              <div className="planning-answer-structured-fields">
                {schema.fields.map((field) => {
                  const fieldDraft = row.fields[field.key];
                  return (
                    <div className="planning-answer-structured-field" key={field.key}>
                      {fieldDraft ? (
                        <StructuredDraftNode
                          disabled={disabled}
                          draft={fieldDraft}
                          issues={issues}
                          label={field.label}
                          path={[...rowPath, field.key]}
                          required={field.required}
                          schema={field.schema}
                          onChange={(nextDraft) => updateRowField(rowIndex, field.key, nextDraft)}
                        />
                      ) : (
                        <MissingFieldNotice label={field.label} required={field.required} />
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
      <button
        className="button button-secondary planning-answer-structured-add"
        aria-label={`Add item to ${label}`}
        disabled={disabled || atMaximum}
        type="button"
        onClick={addRow}
      >
        <Plus aria-hidden="true" size={16} strokeWidth={2} />
        <span>Add item</span>
      </button>
      <IssueList id={issueId} issues={directIssues} />
    </fieldset>
  );
}

function RequiredIndicator({ required }: { required: boolean }) {
  return required ? <span className="planning-answer-structured-required">Required</span> : null;
}

function MissingFieldNotice({ label, required }: { label: string; required: boolean }) {
  return (
    <div className="planning-answer-structured-mismatch" role="alert">
      <p className="planning-answer-structured-mismatch-label">
        {label}
        <RequiredIndicator required={required} />
      </p>
      <p>This answer field is unavailable because its draft is missing.</p>
    </div>
  );
}

function DraftMismatchNotice() {
  return (
    <p className="planning-answer-structured-mismatch" role="alert">
      This answer section is unavailable because its draft type does not match the approved schema.
    </p>
  );
}

function IssueList({
  id,
  issues
}: {
  id?: string;
  issues: readonly PlanningClarificationAnswerIssuePresentation[];
}) {
  if (!id || issues.length === 0) return null;
  return (
    <ul className="planning-answer-structured-issues" id={id}>
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${associationPathKey(issue.associationPath)}-${index}`}>
          <span className="sr-only">{issue.location}: </span>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

function issuesAtPath(
  issues: readonly PlanningClarificationAnswerIssuePresentation[],
  path: readonly (string | number)[]
): readonly PlanningClarificationAnswerIssuePresentation[] {
  return issues.filter((issue) => pathsEqual(issue.associationPath, path));
}

function issuesBelowPath(
  issues: readonly PlanningClarificationAnswerIssuePresentation[],
  path: readonly (string | number)[]
): readonly PlanningClarificationAnswerIssuePresentation[] {
  return issues.filter((issue) => pathIsPrefix(path, issue.associationPath));
}

function pathsEqual(
  first: readonly (string | number)[],
  second: readonly (string | number)[]
): boolean {
  return first.length === second.length && pathIsPrefix(first, second);
}

function pathIsPrefix(
  prefix: readonly (string | number)[],
  path: readonly (string | number)[]
): boolean {
  return prefix.length <= path.length && prefix.every((segment, index) => segment === path[index]);
}

function associationPathKey(path: readonly (string | number)[]): string {
  return path.map((segment) => typeof segment === "number" ? `index-${segment}` : `field-${segment}`).join("-");
}
