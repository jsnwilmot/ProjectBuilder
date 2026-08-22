import { useId, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  PlanningClarificationAnswerDraft,
  PlanningClarificationAnswerIssuePresentation
} from "../../lib/planningClarificationAnswerDraft";
import { createPlanningClarificationStringListDraftItem } from "../../lib/planningClarificationAnswerDraft";
import type { PlanningClarificationAnswerSchema } from "../../lib/planningClarificationAnswerSchema";
import {
  humanizePlanningClarificationEnumOption,
  planningClarificationItemLabel
} from "../../lib/planningClarificationAnswerEntryViewModel";

type PrimitiveKind = "text" | "boolean" | "enum" | "stringList";
type PrimitiveSchema<K extends PrimitiveKind = PrimitiveKind> = Extract<
  PlanningClarificationAnswerSchema,
  { kind: K }
>;
type PrimitiveDraft<K extends PrimitiveKind = PrimitiveKind> = Extract<
  PlanningClarificationAnswerDraft,
  { kind: K }
>;

interface SharedPrimitiveEditorProps {
  label: string;
  required: boolean;
  disabled?: boolean;
  issues?: readonly PlanningClarificationAnswerIssuePresentation[];
}

type PrimitiveEditorPropsFor<K extends PrimitiveKind> = SharedPrimitiveEditorProps & {
  schema: PrimitiveSchema<K>;
  draft: PrimitiveDraft<K>;
  onChange: (draft: PrimitiveDraft<K>) => void;
};

export type ClarificationAnswerPrimitiveEditorProps = {
  [K in PrimitiveKind]: PrimitiveEditorPropsFor<K>;
}[PrimitiveKind];

interface PrimitiveControlIds {
  controlId: string;
  descriptionId?: string;
}

export function ClarificationAnswerPrimitiveEditor(
  props: ClarificationAnswerPrimitiveEditorProps
) {
  const idPrefix = useId();
  const descriptionId = props.issues && props.issues.length > 0
    ? `${idPrefix}-issues`
    : undefined;

  if (props.schema.kind !== props.draft.kind) {
    return (
      <p className="planning-answer-primitive-issue" role="alert">
        This answer field is unavailable because its draft type does not match the approved schema.
      </p>
    );
  }

  const ids = { controlId: `${idPrefix}-control`, descriptionId };
  if (props.schema.kind === "text") {
    return <TextEditor {...props as PrimitiveEditorPropsFor<"text">} ids={ids} />;
  }
  if (props.schema.kind === "boolean") {
    return <BooleanEditor {...props as PrimitiveEditorPropsFor<"boolean">} ids={ids} />;
  }
  if (props.schema.kind === "enum") {
    return <EnumEditor {...props as PrimitiveEditorPropsFor<"enum">} ids={ids} />;
  }
  if (props.schema.kind === "stringList") {
    return <StringListEditor {...props as PrimitiveEditorPropsFor<"stringList">} ids={ids} />;
  }
  return (
    <p className="planning-answer-primitive-issue" role="alert">
      This answer field is unavailable because its schema kind is not supported by the primitive editor.
    </p>
  );
}

function TextEditor({
  schema,
  draft,
  label,
  required,
  disabled = false,
  issues,
  onChange,
  ids
}: PrimitiveEditorPropsFor<"text"> & { ids: PrimitiveControlIds }) {
  return (
    <div className="planning-answer-primitive planning-answer-primitive-text">
      <label className="planning-answer-primitive-label" htmlFor={ids.controlId}>
        {label}
        <RequiredIndicator required={required} />
      </label>
      <textarea
        id={ids.controlId}
        aria-describedby={ids.descriptionId}
        aria-invalid={issues && issues.length > 0 ? true : undefined}
        disabled={disabled}
        maxLength={schema.maxLength}
        required={required}
        value={draft.value}
        onChange={(event) => onChange({ kind: "text", value: event.target.value })}
      />
      {schema.maxLength !== undefined ? (
        <p className="planning-answer-primitive-count">
          {draft.value.length} / {schema.maxLength} characters
        </p>
      ) : null}
      <IssueList id={ids.descriptionId} issues={issues} />
    </div>
  );
}

function BooleanEditor({
  draft,
  label,
  required,
  disabled = false,
  issues,
  onChange,
  ids
}: PrimitiveEditorPropsFor<"boolean"> & { ids: PrimitiveControlIds }) {
  return (
    <fieldset
      className="planning-answer-primitive planning-answer-primitive-boolean"
      aria-describedby={ids.descriptionId}
      aria-invalid={issues && issues.length > 0 ? true : undefined}
      aria-required={required}
      disabled={disabled}
    >
      <legend className="planning-answer-primitive-label">
        {label}
        <RequiredIndicator required={required} />
      </legend>
      <div className="planning-answer-primitive-radio-group">
        <label htmlFor={`${ids.controlId}-yes`}>
          <input
            id={`${ids.controlId}-yes`}
            checked={draft.value === true}
            name={ids.controlId}
            required={required}
            type="radio"
            onChange={() => onChange({ kind: "boolean", value: true })}
          />
          Yes
        </label>
        <label htmlFor={`${ids.controlId}-no`}>
          <input
            id={`${ids.controlId}-no`}
            checked={draft.value === false}
            name={ids.controlId}
            required={required}
            type="radio"
            onChange={() => onChange({ kind: "boolean", value: false })}
          />
          No
        </label>
      </div>
      <IssueList id={ids.descriptionId} issues={issues} />
    </fieldset>
  );
}

function EnumEditor({
  schema,
  draft,
  label,
  required,
  disabled = false,
  issues,
  onChange,
  ids
}: PrimitiveEditorPropsFor<"enum"> & { ids: PrimitiveControlIds }) {
  return (
    <div className="planning-answer-primitive planning-answer-primitive-enum">
      <label className="planning-answer-primitive-label" htmlFor={ids.controlId}>
        {label}
        <RequiredIndicator required={required} />
      </label>
      <select
        id={ids.controlId}
        aria-describedby={ids.descriptionId}
        aria-invalid={issues && issues.length > 0 ? true : undefined}
        disabled={disabled}
        required={required}
        value={draft.value ?? ""}
        onChange={(event) => onChange({ kind: "enum", value: event.target.value })}
      >
        <option disabled value="">Select an option</option>
        {schema.options.map((option) => (
          <option key={option} value={option}>
            {humanizePlanningClarificationEnumOption(option)}
          </option>
        ))}
      </select>
      <IssueList id={ids.descriptionId} issues={issues} />
    </div>
  );
}

function StringListEditor({
  schema,
  draft,
  label,
  required,
  disabled = false,
  issues,
  onChange,
  ids
}: PrimitiveEditorPropsFor<"stringList"> & { ids: PrimitiveControlIds }) {
  const draftIdPrefix = useId();
  const draftIdCounter = useRef(0);
  const atMaximum = schema.maxItems !== undefined && draft.items.length >= schema.maxItems;

  const updateItem = (index: number, value: string) => {
    onChange({
      kind: "stringList",
      engaged: true,
      items: draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, value } : item)
    });
  };

  const removeItem = (index: number) => {
    onChange({
      kind: "stringList",
      engaged: true,
      items: draft.items.filter((_, itemIndex) => itemIndex !== index)
    });
  };

  const addItem = () => {
    if (atMaximum) return;
    draftIdCounter.current += 1;
    onChange({
      kind: "stringList",
      engaged: true,
      items: [
        ...draft.items,
        createPlanningClarificationStringListDraftItem(
          `${draftIdPrefix}-item-${draftIdCounter.current}`
        )
      ]
    });
  };

  return (
    <fieldset
      className="planning-answer-primitive planning-answer-primitive-string-list"
      aria-describedby={ids.descriptionId}
      aria-invalid={issues && issues.length > 0 ? true : undefined}
      aria-required={required}
      disabled={disabled}
    >
      <legend className="planning-answer-primitive-label">
        {label}
        <RequiredIndicator required={required} />
      </legend>
      <div className="planning-answer-primitive-list">
        {draft.items.map((item, index) => {
          const itemLabel = planningClarificationItemLabel(index);
          const inputId = `${ids.controlId}-item-${index + 1}`;
          return (
            <article className="planning-answer-primitive-list-item" key={item.draftId}>
              <div className="planning-answer-primitive-list-item-header">
                <h3>{itemLabel}</h3>
                <button
                  className="button button-secondary planning-answer-primitive-remove"
                  aria-label={`Remove ${itemLabel}`}
                  disabled={disabled}
                  title={`Remove ${itemLabel}`}
                  type="button"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
                  <span>Remove</span>
                </button>
              </div>
              <label className="planning-answer-primitive-item-label" htmlFor={inputId}>
                {itemLabel} value
              </label>
              <input
                id={inputId}
                disabled={disabled}
                maxLength={schema.itemMaxLength}
                type="text"
                value={item.value}
                onChange={(event) => updateItem(index, event.target.value)}
              />
            </article>
          );
        })}
      </div>
      <button
        className="button button-secondary planning-answer-primitive-add"
        disabled={disabled || atMaximum}
        type="button"
        onClick={addItem}
      >
        <Plus aria-hidden="true" size={16} strokeWidth={2} />
        <span>Add item</span>
      </button>
      <IssueList id={ids.descriptionId} issues={issues} />
    </fieldset>
  );
}

function RequiredIndicator({ required }: { required: boolean }) {
  return required ? <span className="planning-answer-primitive-required">Required</span> : null;
}

function IssueList({
  id,
  issues
}: {
  id?: string;
  issues?: readonly PlanningClarificationAnswerIssuePresentation[];
}) {
  if (!id || !issues || issues.length === 0) return null;
  return (
    <ul className="planning-answer-primitive-issues" id={id}>
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${index}`}>
          <span className="sr-only">{issue.location}: </span>
          {issue.message}
        </li>
      ))}
    </ul>
  );
}
