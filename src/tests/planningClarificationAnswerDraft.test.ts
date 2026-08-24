// @ts-expect-error -- Vitest runs static source isolation checks in Node; app TypeScript excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  arePlanningClarificationAnswerDraftsSemanticallyEqual,
  convertPlanningClarificationAnswerDraft,
  createEmptyPlanningClarificationAnswerDraft,
  createPlanningClarificationStringListDraftItem,
  createPlanningClarificationStructuredRecordListDraftRow,
  hydratePlanningClarificationAnswerDraft,
  isPlanningClarificationAnswerDraftMeaningful,
  projectPlanningClarificationAnswerIssues,
  validatePlanningClarificationAnswerDraft,
  type PlanningClarificationAnswerDraft,
  type PlanningClarificationStructuredRecordDraft,
  type PlanningClarificationStructuredRecordListDraft,
  type PlanningClarificationStructuredRecordListDraftRow
} from "../lib/planningClarificationAnswerDraft";
import {
  validatePlanningClarificationAnswer,
  type PlanningClarificationAnswerSchema
} from "../lib/planningClarificationAnswerSchema";

const sixSchemas: readonly PlanningClarificationAnswerSchema[] = [
  { kind: "text" },
  { kind: "boolean" },
  { kind: "enum", options: ["notStarted", "confirmed"] },
  { kind: "stringList", minItems: 0, maxItems: 3, itemMaxLength: 50 },
  {
    kind: "structuredRecord",
    fields: [{ key: "name", label: "Name", required: true, schema: { kind: "text" } }]
  },
  {
    kind: "structuredRecordList",
    minItems: 1,
    maxItems: 3,
    fields: [{ key: "name", label: "Name", required: true, schema: { kind: "text" } }]
  }
];

const nestedSchema: PlanningClarificationAnswerSchema = {
  kind: "structuredRecordList",
  minItems: 1,
  maxItems: 3,
  fields: [
    { key: "componentName", label: "Component name", required: true, schema: { kind: "text" } },
    {
      key: "usageTargets",
      label: "Usage locations",
      required: true,
      schema: {
        kind: "structuredRecordList",
        minItems: 1,
        maxItems: 3,
        fields: [
          { key: "targetType", label: "Target type", required: true, schema: { kind: "enum", options: ["screen", "control"] } },
          { key: "targetId", label: "Target ID", required: true, schema: { kind: "text" } }
        ]
      }
    }
  ]
};

function text(value: string): PlanningClarificationAnswerDraft {
  return { kind: "text", value };
}

describe("planning clarification answer draft", () => {
  it("initializes exactly six empty draft kinds without fabricating rows or semantic answers", () => {
    expect(sixSchemas.map(createEmptyPlanningClarificationAnswerDraft)).toEqual([
      { kind: "text", value: "" },
      { kind: "boolean", value: undefined },
      { kind: "enum", value: undefined },
      { kind: "stringList", engaged: false, items: [] },
      { kind: "structuredRecord", fields: { name: { kind: "text", value: "" } } },
      { kind: "structuredRecordList", engaged: false, rows: [] }
    ]);
    expect(convertPlanningClarificationAnswerDraft(sixSchemas[0], createEmptyPlanningClarificationAnswerDraft(sixSchemas[0])))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "answerRequired" }] });
  });

  it("keeps blank and multiline text draftable and canonicalizes only through validation", () => {
    const schema = { kind: "text" } as const;
    const draft = { kind: "text", value: "  first\r\nsecond  " } as const;
    expect(createEmptyPlanningClarificationAnswerDraft(schema)).toEqual({ kind: "text", value: "" });
    expect(draft.value).toBe("  first\r\nsecond  ");
    expect(convertPlanningClarificationAnswerDraft(schema, draft)).toMatchObject({
      outcome: "candidate",
      candidate: { kind: "text", value: "  first\r\nsecond  " }
    });
    expect(validatePlanningClarificationAnswerDraft(schema, draft)).toMatchObject({
      outcome: "valid",
      answer: { kind: "text", value: "first\nsecond" }
    });
    const secret = "SECRET SECURITY ANSWER";
    const invalid = convertPlanningClarificationAnswerDraft(
      { kind: "boolean" },
      { kind: "text", value: secret }
    );
    expect(JSON.stringify(invalid)).not.toContain(secret);
  });

  it("distinguishes unanswered boolean from explicit false and unanswered enum from a canonical selection", () => {
    expect(isPlanningClarificationAnswerDraftMeaningful({ kind: "boolean", value: undefined })).toBe(false);
    expect(isPlanningClarificationAnswerDraftMeaningful({ kind: "boolean", value: false })).toBe(true);
    expect(convertPlanningClarificationAnswerDraft({ kind: "boolean" }, { kind: "boolean", value: false }))
      .toMatchObject({ outcome: "candidate", candidate: { kind: "boolean", value: false } });
    expect(convertPlanningClarificationAnswerDraft({ kind: "enum", options: ["reviewNeeded"] }, { kind: "enum", value: undefined }))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "answerRequired" }] });
    expect(validatePlanningClarificationAnswerDraft(
      { kind: "enum", options: ["reviewNeeded"] },
      { kind: "enum", value: "reviewNeeded" }
    )).toMatchObject({ outcome: "valid", answer: { kind: "enum", value: "reviewNeeded" } });
  });

  it("distinguishes untouched and engaged empty string lists while leaving minItems to the validator", () => {
    const schema = { kind: "stringList", minItems: 1, maxItems: 3, itemMaxLength: 50 } as const;
    expect(convertPlanningClarificationAnswerDraft(schema, { kind: "stringList", engaged: false, items: [] }))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "answerRequired" }] });
    const engaged = { kind: "stringList", engaged: true, items: [] } as const;
    expect(convertPlanningClarificationAnswerDraft(schema, engaged)).toMatchObject({
      outcome: "candidate",
      candidate: { kind: "stringList", value: [] }
    });
    expect(validatePlanningClarificationAnswerDraft(schema, engaged))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "minItemsNotMet" }] });
  });

  it("preserves string-list order, strips ephemeral IDs, and rejects rather than drops blank items", () => {
    const schema = { kind: "stringList", minItems: 1, maxItems: 3, itemMaxLength: 50 } as const;
    const draft = {
      kind: "stringList",
      engaged: true,
      items: [
        { ...createPlanningClarificationStringListDraftItem("draft-b"), value: "second" },
        { ...createPlanningClarificationStringListDraftItem("draft-a"), value: "first" }
      ]
    } as const;
    const converted = convertPlanningClarificationAnswerDraft(schema, draft);
    expect(converted).toMatchObject({ outcome: "candidate", candidate: { value: ["second", "first"] } });
    expect(JSON.stringify(converted)).not.toContain("draft-");

    const invalid = convertPlanningClarificationAnswerDraft(schema, {
      ...draft,
      items: [...draft.items, { draftId: "blank-secret-id", value: "" }]
    });
    expect(invalid).toMatchObject({ outcome: "invalid", issues: [{ code: "blankListItem", path: [2] }] });
    expect(JSON.stringify(invalid)).not.toContain("blank-secret-id");
  });

  it("preserves schema field order, omits optional blanks, and leaves required detection to the validator", () => {
    const schema: PlanningClarificationAnswerSchema = {
      kind: "structuredRecord",
      fields: [
        { key: "second", label: "Second", required: true, schema: { kind: "text" } },
        { key: "first", label: "First", required: false, schema: { kind: "text" } }
      ]
    };
    const empty = createEmptyPlanningClarificationAnswerDraft(schema);
    const conversion = convertPlanningClarificationAnswerDraft(schema, empty);
    expect(conversion).toMatchObject({ outcome: "candidate", candidate: { kind: "structuredRecord", value: {} } });
    if (conversion.outcome !== "candidate") return;
    expect(Object.keys(conversion.candidate.kind === "structuredRecord" ? conversion.candidate.value : {})).toEqual([]);
    expect(validatePlanningClarificationAnswer(schema, conversion.candidate))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "missingRequiredField", path: ["second"] }] });

    const filled: PlanningClarificationStructuredRecordDraft = {
      kind: "structuredRecord",
      fields: { second: text("value"), first: text("optional") }
    };
    const filledConversion = convertPlanningClarificationAnswerDraft(schema, filled);
    expect(filledConversion.outcome).toBe("candidate");
    if (filledConversion.outcome === "candidate" && filledConversion.candidate.kind === "structuredRecord") {
      expect(Object.keys(filledConversion.candidate.value)).toEqual(["second", "first"]);
    }
  });

  it("creates only schema fields and fails closed without exposing a forged unknown draft field", () => {
    const schema = sixSchemas[4];
    const initialized = createEmptyPlanningClarificationAnswerDraft(schema);
    expect(initialized.kind === "structuredRecord" ? Object.keys(initialized.fields) : []).toEqual(["name"]);
    const forged: PlanningClarificationStructuredRecordDraft = {
      kind: "structuredRecord",
      fields: { name: text("Approved"), "SECRET-UNKNOWN-KEY": text("SECRET VALUE") }
    };
    const result = convertPlanningClarificationAnswerDraft(schema, forged);
    expect(result).toMatchObject({ outcome: "invalid", issues: [{ code: "undeclaredDraftField", path: [] }] });
    expect(JSON.stringify(result)).not.toMatch(/SECRET/);
  });

  it("starts structured lists with zero rows regardless of minItems and treats an added blank row as meaningful but invalid", () => {
    const schema = sixSchemas[5];
    if (schema.kind !== "structuredRecordList") throw new Error("Expected structured list schema");
    const empty = createEmptyPlanningClarificationAnswerDraft(schema);
    expect(empty).toEqual({ kind: "structuredRecordList", engaged: false, rows: [] });
    const blankRow = createPlanningClarificationStructuredRecordListDraftRow(schema, "row-secret-id");
    const draft: PlanningClarificationStructuredRecordListDraft = {
      kind: "structuredRecordList",
      engaged: true,
      rows: [blankRow]
    };
    expect(isPlanningClarificationAnswerDraftMeaningful(draft)).toBe(true);
    const converted = convertPlanningClarificationAnswerDraft(schema, draft);
    expect(converted).toMatchObject({ outcome: "invalid", issues: [{ code: "blankStructuredRow", path: [0] }] });
    expect(JSON.stringify(converted)).not.toContain("row-secret-id");
  });

  it("converts approved nested lists in user order, strips every draft ID, and validates the canonical answer", () => {
    if (nestedSchema.kind !== "structuredRecordList") throw new Error("Expected nested list schema");
    const usageSchema = nestedSchema.fields[1].schema;
    if (usageSchema.kind !== "structuredRecordList") throw new Error("Expected nested usage list schema");
    const nestedRows: PlanningClarificationStructuredRecordListDraftRow[] = [
      {
        ...createPlanningClarificationStructuredRecordListDraftRow(usageSchema, "nested-2"),
        fields: { targetType: { kind: "enum", value: "control" }, targetId: text("control-b") }
      },
      {
        ...createPlanningClarificationStructuredRecordListDraftRow(usageSchema, "nested-1"),
        fields: { targetType: { kind: "enum", value: "screen" }, targetId: text("screen-a") }
      }
    ];
    const rootRow: PlanningClarificationStructuredRecordListDraftRow = {
      ...createPlanningClarificationStructuredRecordListDraftRow(nestedSchema, "root-1"),
      fields: {
        componentName: text("Component"),
        usageTargets: { kind: "structuredRecordList", engaged: true, rows: nestedRows }
      }
    };
    const draft: PlanningClarificationStructuredRecordListDraft = {
      kind: "structuredRecordList",
      engaged: true,
      rows: [rootRow]
    };
    const result = validatePlanningClarificationAnswerDraft(nestedSchema, draft);
    expect(result).toMatchObject({
      outcome: "valid",
      answer: {
        kind: "structuredRecordList",
        value: [{
          componentName: { value: "Component" },
          usageTargets: { value: [
            { targetType: { value: "control" }, targetId: { value: "control-b" } },
            { targetType: { value: "screen" }, targetId: { value: "screen-a" } }
          ] }
        }]
      }
    });
    expect(JSON.stringify(result)).not.toMatch(/root-1|nested-1|nested-2/);
  });

  it("fails closed for a blank nested row", () => {
    if (nestedSchema.kind !== "structuredRecordList") throw new Error("Expected nested list schema");
    const usageSchema = nestedSchema.fields[1].schema;
    if (usageSchema.kind !== "structuredRecordList") throw new Error("Expected nested usage list schema");
    const draft: PlanningClarificationStructuredRecordListDraft = {
      kind: "structuredRecordList",
      engaged: true,
      rows: [{
        draftId: "root",
        fields: {
          componentName: text("Component"),
          usageTargets: {
            kind: "structuredRecordList",
            engaged: true,
            rows: [createPlanningClarificationStructuredRecordListDraftRow(usageSchema, "blank-nested")]
          }
        }
      }]
    };
    expect(convertPlanningClarificationAnswerDraft(nestedSchema, draft))
      .toMatchObject({ outcome: "invalid", issues: [{ code: "blankStructuredRow", path: [0, "usageTargets", 0] }] });
  });

  it("detects untouched and meaningful states including explicit false, engagement, rows, and nested input", () => {
    expect(isPlanningClarificationAnswerDraftMeaningful({ kind: "text", value: "" })).toBe(false);
    expect(isPlanningClarificationAnswerDraftMeaningful({ kind: "text", value: "answer" })).toBe(true);
    expect(isPlanningClarificationAnswerDraftMeaningful({ kind: "boolean", value: true })).toBe(true);
    expect(isPlanningClarificationAnswerDraftMeaningful({ kind: "boolean", value: false })).toBe(true);
    expect(isPlanningClarificationAnswerDraftMeaningful({ kind: "enum", value: "confirmed" })).toBe(true);
    expect(isPlanningClarificationAnswerDraftMeaningful({ kind: "stringList", engaged: true, items: [] })).toBe(true);
    expect(isPlanningClarificationAnswerDraftMeaningful({ kind: "structuredRecordList", engaged: false, rows: [{ draftId: "row", fields: {} }] })).toBe(true);
    expect(isPlanningClarificationAnswerDraftMeaningful({
      kind: "structuredRecord",
      fields: { nested: { kind: "structuredRecord", fields: { value: text("answer") } } }
    })).toBe(true);
  });

  it("hydrates all six canonical kinds without mutating the saved answer", () => {
    const answers = [
      { kind: "text", value: "Saved text" },
      { kind: "boolean", value: false },
      { kind: "enum", value: "confirmed" },
      { kind: "stringList", value: [] },
      { kind: "structuredRecord", value: { name: { kind: "text", value: "Saved name" } } },
      { kind: "structuredRecordList", value: [{ name: { kind: "text", value: "Saved row" } }] }
    ] as const;
    const before = JSON.stringify(answers);
    const hydrated = sixSchemas.map((schema, index) =>
      hydratePlanningClarificationAnswerDraft(schema, answers[index], "local-session")
    );

    expect(hydrated).toMatchObject([
      { outcome: "hydrated", draft: { kind: "text", value: "Saved text" } },
      { outcome: "hydrated", draft: { kind: "boolean", value: false } },
      { outcome: "hydrated", draft: { kind: "enum", value: "confirmed" } },
      { outcome: "hydrated", draft: { kind: "stringList", engaged: true, items: [] } },
      { outcome: "hydrated", draft: { kind: "structuredRecord", fields: { name: { value: "Saved name" } } } },
      { outcome: "hydrated", draft: { kind: "structuredRecordList", engaged: true, rows: [{ fields: { name: { value: "Saved row" } } }] } }
    ]);
    expect(JSON.stringify(answers)).toBe(before);
  });

  it("hydrates nested rows with deterministic local IDs and recursively empty optional fields", () => {
    const schema: PlanningClarificationAnswerSchema = {
      kind: "structuredRecordList",
      minItems: 0,
      fields: [
        { key: "name", label: "Name", required: true, schema: { kind: "text" } },
        { key: "notes", label: "Notes", required: false, schema: { kind: "stringList", minItems: 0 } }
      ]
    };
    const answer = {
      kind: "structuredRecordList" as const,
      value: [{ name: { kind: "text" as const, value: "One" } }]
    };
    const first = hydratePlanningClarificationAnswerDraft(schema, answer, "edit");
    const second = hydratePlanningClarificationAnswerDraft(schema, answer, "edit");
    expect(first).toEqual(second);
    expect(first).toMatchObject({
      outcome: "hydrated",
      draft: {
        engaged: true,
        rows: [{
          draftId: "edit-root-row-0",
          fields: { notes: { kind: "stringList", engaged: false, items: [] } }
        }]
      }
    });
  });

  it("fails hydration closed and compares draft meaning while ignoring only local IDs", () => {
    expect(hydratePlanningClarificationAnswerDraft(
      { kind: "boolean" },
      { kind: "text", value: "SECRET INVALID" },
      "edit"
    )).toEqual({ outcome: "invalid" });

    const left: PlanningClarificationAnswerDraft = {
      kind: "stringList", engaged: true, items: [{ draftId: "a", value: "one" }, { draftId: "b", value: "two" }]
    };
    const sameMeaning: PlanningClarificationAnswerDraft = {
      kind: "stringList", engaged: true, items: [{ draftId: "x", value: "one" }, { draftId: "y", value: "two" }]
    };
    expect(arePlanningClarificationAnswerDraftsSemanticallyEqual(left, sameMeaning)).toBe(true);
    expect(arePlanningClarificationAnswerDraftsSemanticallyEqual(left, { ...sameMeaning, engaged: false })).toBe(false);
    expect(arePlanningClarificationAnswerDraftsSemanticallyEqual(left, {
      ...sameMeaning,
      items: [...sameMeaning.items].reverse()
    })).toBe(false);
    expect(arePlanningClarificationAnswerDraftsSemanticallyEqual(left, {
      ...sameMeaning,
      items: sameMeaning.items.slice(0, 1)
    })).toBe(false);
  });

  it("projects deterministic safe labels for nested issues without echoing answers or unknown fields", () => {
    const issues = [
      { code: "missingRequiredField" as const, path: [0, "usageTargets", 1, "targetId"], message: "Required answer field is missing." },
      { code: "unexpectedField" as const, path: [0, "SECRET-UNKNOWN-KEY"], message: "Answer contains an undeclared field." }
    ];
    const projected = projectPlanningClarificationAnswerIssues(nestedSchema, issues);
    expect(projected).toEqual([
      {
        code: "missingRequiredField",
        associationPath: [0, "usageTargets", 1, "targetId"],
        location: "Item 1 > Usage locations > Item 2 > Target ID",
        message: "Required answer field is missing."
      },
      {
        code: "unexpectedField",
        associationPath: [0],
        location: "Item 1",
        message: "Answer contains an undeclared field."
      }
    ]);
    expect(JSON.stringify(projected)).not.toMatch(/SECRET/);
  });

  it("does not expose security answer contents in semantic validation or projected issues", () => {
    const schema: PlanningClarificationAnswerSchema = {
      kind: "structuredRecord",
      fields: [{ key: "permission", label: "Permission description", required: true, schema: { kind: "text", maxLength: 5 } }]
    };
    const secret = "SECRET PERMISSION CONTENT";
    const validation = validatePlanningClarificationAnswer(schema, {
      kind: "structuredRecord",
      value: { permission: { kind: "text", value: secret } }
    });
    expect(validation.outcome).toBe("invalid");
    if (validation.outcome !== "invalid") return;
    const projected = projectPlanningClarificationAnswerIssues(schema, validation.issues);
    expect(JSON.stringify({ validation, projected })).not.toContain(secret);
  });

  it("has no React, registry, browser, persistence, runtime identity, readiness, Apply, or generation dependency", () => {
    const source = readFileSync("src/lib/planningClarificationAnswerDraft.ts", "utf8");
    expect(source).not.toMatch(/from ["']react|react-dom|AnswerEntryViewModel|AnswerSchemaRegistry|projectRepository|storageVersion|readiness|controlledApply|generateProjectPackage|exportProjectPackage|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|Math\.random|randomUUID|Date\.now|new Date|analytics/i);
  });
});
