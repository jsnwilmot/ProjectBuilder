import type { ReactNode } from "react";
import {
  validatePlanningClarificationAnswer,
  type PlanningClarificationAnswerSchema,
  type PlanningClarificationAnswerSchemaField
} from "../../lib/planningClarificationAnswerSchema";
import {
  humanizePlanningClarificationEnumOption,
  planningClarificationItemLabel
} from "../../lib/planningClarificationAnswerEntryViewModel";
import type { PlanningProposalValue } from "../../lib/planningProposals";

export interface ClarificationAnswerValueRendererProps {
  schema: PlanningClarificationAnswerSchema;
  answer: PlanningProposalValue;
  label?: string;
}

const UNAVAILABLE_NOTICE =
  "This saved answer cannot be displayed because it no longer matches the approved answer structure.";

export function ClarificationAnswerValueRenderer({
  schema,
  answer,
  label
}: ClarificationAnswerValueRendererProps) {
  const validation = validatePlanningClarificationAnswer(schema, answer);
  if (validation.outcome !== "valid") {
    return (
      <p className="planning-answer-renderer-unavailable" role="status">
        {UNAVAILABLE_NOTICE}
      </p>
    );
  }

  return (
    <section
      className="planning-answer-renderer"
      aria-label={label}
    >
      {label ? <p className="planning-answer-renderer-label">{label}</p> : null}
      <CanonicalAnswerNode answer={validation.answer} schema={schema} />
    </section>
  );
}

function CanonicalAnswerNode({
  schema,
  answer
}: {
  schema: PlanningClarificationAnswerSchema;
  answer: PlanningProposalValue;
}): ReactNode {
  switch (schema.kind) {
    case "text":
      return answer.kind === "text"
        ? <p className="planning-answer-renderer-text">{answer.value}</p>
        : null;
    case "boolean":
      return answer.kind === "boolean"
        ? <p className="planning-answer-renderer-value">{answer.value ? "Yes" : "No"}</p>
        : null;
    case "enum":
      return answer.kind === "enum"
        ? (
          <p className="planning-answer-renderer-value">
            {humanizePlanningClarificationEnumOption(answer.value)}
          </p>
        )
        : null;
    case "stringList":
      return answer.kind === "stringList"
        ? (
          <ul className="planning-answer-renderer-list">
            {answer.value.map((entry, index) => <li key={index}>{entry}</li>)}
          </ul>
        )
        : null;
    case "structuredRecord":
      return answer.kind === "structuredRecord"
        ? <CanonicalRecordFields fields={schema.fields} value={answer.value} />
        : null;
    case "structuredRecordList":
      return answer.kind === "structuredRecordList"
        ? (
          <CanonicalRecordList
            fields={schema.fields}
            value={answer.value}
          />
        )
        : null;
  }
}

function CanonicalRecordFields({
  fields,
  value
}: {
  fields: readonly PlanningClarificationAnswerSchemaField[];
  value: Record<string, PlanningProposalValue>;
}) {
  return (
    <dl className="planning-answer-renderer-fields">
      {fields.map((field) => {
        const fieldValue = value[field.key];
        if (fieldValue === undefined) return null;
        return (
          <div className="planning-answer-renderer-field" key={field.key}>
            <dt>{field.label}</dt>
            <dd>
              <CanonicalAnswerNode answer={fieldValue} schema={field.schema} />
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function CanonicalRecordList({
  fields,
  value
}: {
  fields: readonly PlanningClarificationAnswerSchemaField[];
  value: readonly Record<string, PlanningProposalValue>[];
}) {
  return (
    <ol className="planning-answer-renderer-record-list">
      {value.map((row, index) => (
        <li className="planning-answer-renderer-record" key={index}>
          <p className="planning-answer-renderer-item-label">
            {planningClarificationItemLabel(index)}
          </p>
          <CanonicalRecordFields fields={fields} value={row} />
        </li>
      ))}
    </ol>
  );
}
