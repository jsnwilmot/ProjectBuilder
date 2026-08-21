// @ts-expect-error -- Vitest runs static source isolation checks in Node; app TypeScript excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PLANNING_CLARIFICATION_ANSWER_SCHEMA_KINDS,
  normalizePlanningClarificationAnswerSchema,
  validatePlanningClarificationAnswer,
  type PlanningClarificationAnswerSchema,
  type PlanningClarificationAnswerSchemaField
} from "../lib/planningClarificationAnswerSchema";

const textSchema = { kind: "text" } as const;

function field(
  key: string,
  schema: PlanningClarificationAnswerSchema = textSchema,
  required = true
): PlanningClarificationAnswerSchemaField {
  return { key, label: `${key} label`, required, schema };
}

function structuredSchemaAtDepth(depth: number): PlanningClarificationAnswerSchema {
  return {
    kind: "structuredRecord",
    fields: [field(depth === 1 ? "leaf" : "nested", depth === 1 ? textSchema : structuredSchemaAtDepth(depth - 1))]
  };
}

function structuredValueAtDepth(depth: number): unknown {
  return {
    kind: "structuredRecord",
    value: {
      [depth === 1 ? "leaf" : "nested"]:
        depth === 1 ? { kind: "text", value: "confirmed" } : structuredValueAtDepth(depth - 1)
    }
  };
}

describe("planning clarification answer schema", () => {
  it("supports exactly the six approved semantic kinds and excludes lifecycle values", () => {
    expect(PLANNING_CLARIFICATION_ANSWER_SCHEMA_KINDS).toEqual([
      "text",
      "boolean",
      "enum",
      "stringList",
      "structuredRecord",
      "structuredRecordList"
    ]);
    for (const kind of ["recordCreation", "notApplicable", "deferred", "clarification"]) {
      expect(normalizePlanningClarificationAnswerSchema({ kind }).outcome).toBe("invalid");
    }
  });

  it("normalizes text defaults and returns canonical Planning text", () => {
    expect(normalizePlanningClarificationAnswerSchema(textSchema)).toEqual({
      outcome: "valid",
      schema: { kind: "text", maxLength: 4000 },
      issues: []
    });
    expect(validatePlanningClarificationAnswer(textSchema, { kind: "text", value: "  first\r\nsecond  " })).toEqual({
      outcome: "valid",
      answer: { kind: "text", value: "first\nsecond" },
      issues: []
    });
    expect(validatePlanningClarificationAnswer({ kind: "text", maxLength: 5 }, { kind: "text", value: "123456" }))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "textLimitExceeded", path: [] }] });
  });

  it("validates boolean answers without coercion", () => {
    expect(validatePlanningClarificationAnswer({ kind: "boolean" }, { kind: "boolean", value: false })).toMatchObject({
      outcome: "valid",
      answer: { kind: "boolean", value: false }
    });
    expect(validatePlanningClarificationAnswer({ kind: "boolean" }, { kind: "text", value: "false" }))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "kindMismatch" }] });
  });

  it("preserves explicit enum option order and requires an exact option", () => {
    const schema = { kind: "enum", options: ["First", "Second"] } as const;
    expect(normalizePlanningClarificationAnswerSchema(schema)).toMatchObject({
      outcome: "valid",
      schema: { options: ["First", "Second"] }
    });
    expect(validatePlanningClarificationAnswer(schema, { kind: "enum", value: "Second" }).outcome).toBe("valid");
    expect(validatePlanningClarificationAnswer(schema, { kind: "enum", value: "second" }))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "enumOptionInvalid" }] });
  });

  it("rejects empty, duplicate, sparse, unsafe, and over-cap enum options", () => {
    const sparse = ["one"];
    sparse.length = 2;
    for (const options of [
      [],
      ["same", " same "],
      sparse,
      ["<b>unsafe</b>"],
      Array.from({ length: 101 }, (_, index) => `option-${index}`)
    ]) {
      expect(normalizePlanningClarificationAnswerSchema({ kind: "enum", options }).outcome).toBe("invalid");
    }
  });

  it("normalizes string-list defaults and enforces item counts, item lengths, and order", () => {
    const schema = { kind: "stringList", minItems: 1, maxItems: 2, itemMaxLength: 5 } as const;
    expect(normalizePlanningClarificationAnswerSchema({ kind: "stringList" })).toMatchObject({
      outcome: "valid",
      schema: { minItems: 0, maxItems: 100, itemMaxLength: 500 }
    });
    expect(validatePlanningClarificationAnswer(schema, { kind: "stringList", value: [" two ", "one"] })).toMatchObject({
      outcome: "valid",
      answer: { value: ["two", "one"] }
    });
    expect(validatePlanningClarificationAnswer(schema, { kind: "stringList", value: [] }))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "minItemsNotMet" }] });
    expect(validatePlanningClarificationAnswer(schema, { kind: "stringList", value: ["one", "two", "three"] }))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "maxItemsExceeded" }] });
    expect(validatePlanningClarificationAnswer(schema, { kind: "stringList", value: ["123456"] }))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "itemLimitExceeded", path: [0] }] });
  });

  it("rejects invalid list-bound schemas", () => {
    for (const schema of [
      { kind: "stringList", minItems: -1 },
      { kind: "stringList", minItems: 3, maxItems: 2 },
      { kind: "stringList", maxItems: 101 },
      { kind: "stringList", itemMaxLength: 0 },
      { kind: "stringList", itemMaxLength: 501 },
      { kind: "structuredRecordList", fields: [], minItems: 2, maxItems: 1 }
    ]) {
      expect(normalizePlanningClarificationAnswerSchema(schema).outcome).toBe("invalid");
    }
  });

  it("enforces structured required, optional, unknown, and nested field semantics", () => {
    const schema = {
      kind: "structuredRecord",
      fields: [
        field("name"),
        field("enabled", { kind: "boolean" }, false),
        field("details", { kind: "structuredRecord", fields: [field("note")] })
      ]
    } as const satisfies PlanningClarificationAnswerSchema;
    const valid = validatePlanningClarificationAnswer(schema, {
      kind: "structuredRecord",
      value: {
        name: { kind: "text", value: "  Confirmed  " },
        details: { kind: "structuredRecord", value: { note: { kind: "text", value: "Nested" } } }
      }
    });
    expect(valid).toMatchObject({
      outcome: "valid",
      answer: { value: { name: { value: "Confirmed" }, details: { value: { note: { value: "Nested" } } } } }
    });
    expect(validatePlanningClarificationAnswer(schema, {
      kind: "structuredRecord",
      value: { details: { kind: "structuredRecord", value: { note: { kind: "text", value: "Nested" } } } }
    })).toMatchObject({ outcome: "invalid", issues: [{ code: "missingRequiredField", path: ["name"] }] });
    expect(validatePlanningClarificationAnswer(schema, {
      kind: "structuredRecord",
      value: {
        name: { kind: "text", value: "Known" },
        details: { kind: "structuredRecord", value: { note: { kind: "text", value: "Nested" } } },
        extra: { kind: "text", value: "Not declared" }
      }
    })).toMatchObject({ outcome: "invalid", issues: [{ code: "unexpectedField", path: [] }] });
  });

  it("validates structured record-list rows against one field set while preserving row order", () => {
    const schema = {
      kind: "structuredRecordList",
      minItems: 1,
      maxItems: 2,
      fields: [field("order", { kind: "enum", options: ["first", "second"] }), field("note", textSchema, false)]
    } as const satisfies PlanningClarificationAnswerSchema;
    const result = validatePlanningClarificationAnswer(schema, {
      kind: "structuredRecordList",
      value: [
        { order: { kind: "enum", value: "second" } },
        { order: { kind: "enum", value: "first" }, note: { kind: "text", value: "  note  " } }
      ]
    });
    expect(result).toMatchObject({
      outcome: "valid",
      answer: { value: [{ order: { value: "second" } }, { order: { value: "first" }, note: { value: "note" } }] }
    });
    expect(validatePlanningClarificationAnswer(schema, {
      kind: "structuredRecordList",
      value: [{ note: { kind: "text", value: "missing order" } }]
    })).toMatchObject({ outcome: "invalid", issues: [{ code: "missingRequiredField", path: [0, "order"] }] });
  });

  it("accepts structured depths one through four and rejects depth five", () => {
    for (const depth of [1, 2, 3, 4]) {
      expect(normalizePlanningClarificationAnswerSchema(structuredSchemaAtDepth(depth)).outcome, `schema ${depth}`).toBe("valid");
      expect(validatePlanningClarificationAnswer(structuredSchemaAtDepth(depth), structuredValueAtDepth(depth)).outcome, `answer ${depth}`).toBe("valid");
    }
    expect(normalizePlanningClarificationAnswerSchema(structuredSchemaAtDepth(5)))
      .toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "structuredDepthExceeded" })] });
  });

  it("rejects duplicate, dangerous, invalid, excess, and malformed structured fields", () => {
    const dangerousKeys = ["__proto__", "constructor", "prototype"];
    const malformed: unknown[] = [
      { kind: "structuredRecord", fields: [field("same"), field(" same ")] },
      ...dangerousKeys.map((key) => ({ kind: "structuredRecord", fields: [field(key)] })),
      { kind: "structuredRecord", fields: [{ ...field("safe"), label: "<b>Label</b>" }] },
      { kind: "structuredRecord", fields: [{ ...field("safe"), label: "Screens:" }] },
      { kind: "structuredRecord", fields: [{ ...field("safe"), required: "yes" }] },
      { kind: "structuredRecord", fields: Array.from({ length: 51 }, (_, index) => field(`field${index}`)) },
      { kind: "structuredRecord", fields: [], widget: "form" }
    ];
    const sparse = [field("first")];
    sparse.length = 2;
    malformed.push({ kind: "structuredRecord", fields: sparse });
    malformed.forEach((schema) => expect(normalizePlanningClarificationAnswerSchema(schema).outcome).toBe("invalid"));
  });

  it("fails closed through canonical Planning safety for unsafe, dangerous, sparse, and oversized answers", () => {
    const recordListSchema = { kind: "structuredRecordList", fields: [] } as const;
    const sparseRows: Record<string, unknown>[] = [{}];
    sparseRows.length = 2;
    const oversizedRows = Array.from({ length: 4 }, (_, index) => ({
      [`field${index}`]: { kind: "text", value: "x".repeat(3500) }
    }));
    for (const answer of [
      { kind: "text", value: "<script>alert(1)</script>" },
      { kind: "structuredRecord", value: { constructor: { kind: "text", value: "unsafe" } } },
      { kind: "structuredRecordList", value: sparseRows },
      { kind: "structuredRecordList", value: oversizedRows }
    ]) {
      const schema = answer.kind === "text" ? textSchema : recordListSchema;
      expect(validatePlanningClarificationAnswer(schema, answer))
        .toMatchObject({ outcome: "invalid", issues: [{ code: "invalidAnswer" }] });
    }
  });

  it("returns bounded private issues without echoing supplied values", () => {
    const secret = "SECRET-ENUM-ANSWER-4481";
    const result = validatePlanningClarificationAnswer(
      { kind: "enum", options: ["Allowed"] },
      { kind: "enum", value: secret }
    );
    const serialized = JSON.stringify(result);
    expect(result).toMatchObject({ outcome: "invalid", issues: [{ code: "enumOptionInvalid" }] });
    expect(serialized).not.toContain(secret);
    expect(serialized.length).toBeLessThan(2000);

    const secretField = "SECRET-FIELD-9912";
    const unknownFieldResult = validatePlanningClarificationAnswer(
      { kind: "structuredRecord", fields: [] },
      { kind: "structuredRecord", value: { [secretField]: { kind: "text", value: "private" } } }
    );
    expect(unknownFieldResult).toMatchObject({ outcome: "invalid", issues: [{ code: "unexpectedField", path: [] }] });
    expect(JSON.stringify(unknownFieldResult)).not.toContain(secretField);
  });

  it("does not mutate schema or answer inputs", () => {
    const schema = { kind: "text", maxLength: 20 } as const;
    const answer = { kind: "text", value: "  unchanged input  " };
    const schemaBefore = JSON.stringify(schema);
    const answerBefore = JSON.stringify(answer);
    validatePlanningClarificationAnswer(schema, answer);
    expect(JSON.stringify(schema)).toBe(schemaBefore);
    expect(JSON.stringify(answer)).toBe(answerBefore);
  });

  it("keeps the schema and validator module statically isolated", () => {
    const source = readFileSync("src/lib/planningClarificationAnswerSchema.ts", "utf8");
    expect(source).toMatch(/normalizePlanningProposalValue/);
    expect(source).not.toMatch(/from\s+["']\.\/projectRepository|from\s+["']\.\/storageVersion/);
    expect(source).not.toMatch(/controlledApply|readiness|generateProjectPackage|exportProjectPackage|React|localStorage|sessionStorage/i);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|randomUUID|Date\.now|new Date|crypto/i);
  });
});
