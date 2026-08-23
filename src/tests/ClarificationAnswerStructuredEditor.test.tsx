// @ts-expect-error -- Vitest runs static source isolation assertions in Node; app TypeScript excludes Node ambient types.
import { readFileSync } from "node:fs";
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ClarificationAnswerStructuredEditor
} from "../components/Planning/ClarificationAnswerStructuredEditor";
import {
  createEmptyPlanningClarificationAnswerDraft,
  type PlanningClarificationStructuredRecordDraft,
  type PlanningClarificationStructuredRecordListDraft
} from "../lib/planningClarificationAnswerDraft";
import type {
  PlanningClarificationStructuredRecordAnswerSchema,
  PlanningClarificationStructuredRecordListAnswerSchema
} from "../lib/planningClarificationAnswerSchema";

const recordSchema: PlanningClarificationStructuredRecordAnswerSchema = {
  kind: "structuredRecord",
  fields: [
    { key: "name", label: "Display name", required: true, schema: { kind: "text", maxLength: 80 } },
    { key: "approved", label: "Approved", required: false, schema: { kind: "boolean" } },
    {
      key: "details",
      label: "Details",
      required: false,
      schema: {
        kind: "structuredRecord",
        fields: [
          {
            key: "status",
            label: "Review status",
            required: true,
            schema: { kind: "enum", options: ["reviewNeeded", "confirmed"] }
          }
        ]
      }
    }
  ]
};

const usageTargetsSchema: PlanningClarificationStructuredRecordListAnswerSchema = {
  kind: "structuredRecordList",
  minItems: 1,
  maxItems: 3,
  fields: [
    { key: "targetType", label: "Target type", required: true, schema: { kind: "enum", options: ["screen", "control"] } },
    { key: "targetId", label: "Target ID", required: true, schema: { kind: "text" } }
  ]
};

const componentsSchema: PlanningClarificationStructuredRecordListAnswerSchema = {
  kind: "structuredRecordList",
  minItems: 1,
  maxItems: 2,
  fields: [
    { key: "name", label: "Component name", required: true, schema: { kind: "text" } },
    { key: "usageTargets", label: "Usage locations", required: true, schema: usageTargetsSchema }
  ]
};

function emptyRecordDraft(): PlanningClarificationStructuredRecordDraft {
  return createEmptyPlanningClarificationAnswerDraft(recordSchema) as PlanningClarificationStructuredRecordDraft;
}

function recordListDraft(
  rows: PlanningClarificationStructuredRecordListDraft["rows"] = [],
  engaged = false
): PlanningClarificationStructuredRecordListDraft {
  return { kind: "structuredRecordList", engaged, rows };
}

function componentRow(
  draftId: string,
  name: string,
  targets: readonly { draftId: string; type: string; id: string }[]
) {
  return {
    draftId,
    fields: {
      name: { kind: "text" as const, value: name },
      usageTargets: {
        kind: "structuredRecordList" as const,
        engaged: targets.length > 0,
        rows: targets.map((target) => ({
          draftId: target.draftId,
          fields: {
            targetType: { kind: "enum" as const, value: target.type },
            targetId: { kind: "text" as const, value: target.id }
          }
        }))
      }
    }
  };
}

function StructuredRecordHarness({
  initialDraft = emptyRecordDraft(),
  disabled = false
}: {
  initialDraft?: PlanningClarificationStructuredRecordDraft;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(initialDraft);
  return (
    <ClarificationAnswerStructuredEditor
      disabled={disabled}
      draft={draft}
      label="Configuration"
      required
      schema={recordSchema}
      onChange={setDraft}
    />
  );
}

function StructuredListHarness({
  initialDraft = recordListDraft(),
  disabled = false
}: {
  initialDraft?: PlanningClarificationStructuredRecordListDraft;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(initialDraft);
  return (
    <ClarificationAnswerStructuredEditor
      disabled={disabled}
      draft={draft}
      label="Components"
      required
      schema={componentsSchema}
      onChange={setDraft}
    />
  );
}

describe("ClarificationAnswerStructuredEditor", () => {
  it("renders record fields in schema order with schema labels and required metadata", () => {
    render(<StructuredRecordHarness />);
    const displayName = screen.getByText("Display name", { selector: "label" });
    const approved = screen.getByText("Approved", { selector: "legend" });
    const details = screen.getByText("Details", { selector: "legend" });
    expect(displayName.compareDocumentPosition(approved) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(approved.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /Display name Required/i })).toBeRequired();
    expect(screen.getByRole("group", { name: "Approved" })).toHaveAttribute("aria-required", "false");
    expect(screen.getByRole("combobox", { name: /Review status Required/i })).toBeRequired();
  });

  it("delegates primitive fields and recursively renders structured-record children", () => {
    render(<StructuredRecordHarness />);
    expect(screen.getByRole("textbox", { name: /Display name Required/i })).toBeInstanceOf(HTMLTextAreaElement);
    expect(screen.getByRole("radio", { name: "Yes" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: /Review status Required/i })).toBeVisible();
    expect(screen.getAllByRole("group")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /add|remove/i })).not.toBeInTheDocument();
  });

  it("updates one child immutably while preserving siblings and ignores undeclared draft fields", () => {
    const initialDraft: PlanningClarificationStructuredRecordDraft = {
      kind: "structuredRecord",
      fields: {
        ...emptyRecordDraft().fields,
        name: { kind: "text", value: "Original" },
        approved: { kind: "boolean", value: false },
        forgedSecret: { kind: "text", value: "SECRET FORGED FIELD" }
      }
    };
    render(<StructuredRecordHarness initialDraft={initialDraft} />);
    fireEvent.change(screen.getByRole("textbox", { name: /Display name Required/i }), {
      target: { value: "Updated" }
    });
    expect(screen.getByRole("textbox", { name: /Display name Required/i })).toHaveValue("Updated");
    expect(screen.getByRole("radio", { name: "No" })).toBeChecked();
    expect(screen.queryByText("SECRET FORGED FIELD")).not.toBeInTheDocument();
  });

  it("keeps an untouched minItems list at zero rows and adds one schema-defined empty row after all rows", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ClarificationAnswerStructuredEditor
        draft={recordListDraft()}
        label="Components"
        required
        schema={componentsSchema}
        onChange={onChange}
      />
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    const add = screen.getByRole("button", { name: "Add item to Components" });
    await user.click(add);
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as PlanningClarificationStructuredRecordListDraft;
    expect(emitted).toMatchObject({
      kind: "structuredRecordList",
      engaged: true,
      rows: [{ fields: { name: { kind: "text", value: "" }, usageTargets: { kind: "structuredRecordList", engaged: false, rows: [] } } }]
    });
    expect(emitted.rows[0].draftId).toMatch(/-row-1$/);

    rerender(
      <ClarificationAnswerStructuredEditor
        draft={emitted}
        label="Components"
        required
        schema={componentsSchema}
        onChange={onChange}
      />
    );
    const row = screen.getByRole("article");
    expect(row.compareDocumentPosition(screen.getByRole("button", { name: "Add item to Components" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /Component name Required/i })).toHaveValue("");
  });

  it("places row-specific Remove before fields, removes exactly one row, and preserves order", async () => {
    const user = userEvent.setup();
    render(
      <StructuredListHarness initialDraft={recordListDraft([
        componentRow("first", "First component", []),
        componentRow("second", "Second component", [])
      ], true)} />
    );
    const rows = screen.getAllByRole("article");
    const removeSecond = screen.getByRole("button", { name: "Remove Item 2 from Components" });
    const secondName = within(rows[1]).getByRole("textbox", { name: /Component name Required/i });
    expect(removeSecond.compareDocumentPosition(secondName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(removeSecond);
    expect(screen.getAllByRole("textbox", { name: /Component name Required/i })).toHaveLength(1);
    expect(screen.getByRole("textbox", { name: /Component name Required/i })).toHaveValue("First component");
    expect(screen.getByText("Item 1", { selector: ".planning-answer-structured-row-title" })).toBeVisible();
  });

  it("leaves the list engaged after final removal and disables Add at maxItems", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const fullDraft = recordListDraft([
      componentRow("first", "First", []),
      componentRow("second", "Second", [])
    ], false);
    const { rerender } = render(
      <ClarificationAnswerStructuredEditor
        draft={fullDraft}
        label="Components"
        required
        schema={componentsSchema}
        onChange={onChange}
      />
    );
    expect(screen.getByRole("button", { name: "Add item to Components" })).toBeDisabled();
    rerender(
      <ClarificationAnswerStructuredEditor
        draft={recordListDraft([componentRow("only", "Only", [])], false)}
        label="Components"
        required
        schema={componentsSchema}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole("button", { name: "Remove Item 1 from Components" }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: "structuredRecordList", engaged: true, rows: [] });
  });

  it("supports nested usageTargets Add and Remove without altering parent or sibling branches", async () => {
    const user = userEvent.setup();
    render(
      <StructuredListHarness initialDraft={recordListDraft([
        componentRow("parent-a", "Component A", [
          { draftId: "target-a", type: "screen", id: "Screen A" },
          { draftId: "target-b", type: "control", id: "Control B" }
        ]),
        componentRow("parent-b", "Component B", [
          { draftId: "target-c", type: "screen", id: "Screen C" }
        ])
      ], true)} />
    );

    const targetInputs = screen.getAllByRole("textbox", { name: /Target ID Required/i });
    await user.clear(targetInputs[1]);
    await user.type(targetInputs[1], "Control B updated");
    expect(screen.getAllByRole("textbox", { name: /Target ID Required/i }).map((input) => (input as HTMLTextAreaElement).value)).toEqual([
      "Screen A",
      "Control B updated",
      "Screen C"
    ]);
    expect(screen.getAllByRole("textbox", { name: /Component name Required/i }).map((input) => (input as HTMLTextAreaElement).value)).toEqual([
      "Component A",
      "Component B"
    ]);

    const nestedAdds = screen.getAllByRole("button", { name: "Add item to Usage locations" });
    await user.click(nestedAdds[0]);
    expect(screen.getAllByRole("textbox", { name: /Target ID Required/i })).toHaveLength(4);
    await user.click(screen.getAllByRole("button", { name: "Remove Item 1 from Usage locations" })[0]);
    expect(screen.getAllByRole("textbox", { name: /Target ID Required/i }).map((input) => (input as HTMLTextAreaElement).value)).toEqual([
      "Control B updated",
      "",
      "Screen C"
    ]);
  });

  it("propagates disabled state through all primitive and nested repeater controls", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ClarificationAnswerStructuredEditor
        disabled
        draft={recordListDraft([
          componentRow("parent", "Readable", [{ draftId: "target", type: "screen", id: "Screen A" }])
        ], true)}
        label="Components"
        required
        schema={componentsSchema}
        onChange={onChange}
      />
    );
    for (const control of screen.getAllByRole("textbox")) expect(control).toBeDisabled();
    for (const control of screen.getAllByRole("combobox")) expect(control).toBeDisabled();
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Add item to Components" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("associates projected field, row, and nested issues without showing them on siblings", () => {
    render(
      <ClarificationAnswerStructuredEditor
        draft={recordListDraft([
          componentRow("parent", "Component", [{ draftId: "target", type: "screen", id: "" }])
        ], true)}
        issues={[
          { code: "blankStructuredRow", associationPath: [0], location: "Item 1", message: "Complete this component row." },
          { code: "answerRequired", associationPath: [0, "name"], location: "Item 1 > Component name", message: "Name issue." },
          { code: "answerRequired", associationPath: [0, "usageTargets", 0, "targetId"], location: "Item 1 > Usage locations > Item 1 > Target ID", message: "Target issue." }
        ]}
        label="Components"
        required
        schema={componentsSchema}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("Complete this component row.")).toBeVisible();
    expect(screen.getByRole("textbox", { name: /Component name Required/i })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox", { name: /Target ID Required/i })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("combobox", { name: /Target type Required/i })).not.toHaveAttribute("aria-invalid");
  });

  it("fails closed for a mismatched root draft", () => {
    const props = {
      schema: componentsSchema,
      draft: { kind: "structuredRecord", fields: {} },
      label: "Components",
      required: true,
      onChange: vi.fn()
    } as unknown as Parameters<typeof ClarificationAnswerStructuredEditor>[0];
    render(<ClarificationAnswerStructuredEditor {...props} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/does not match/i);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("is isolated from validation, persistence, submission, network, clocks, and live Planning consumers", () => {
    const source = readFileSync("src/components/Planning/ClarificationAnswerStructuredEditor.tsx", "utf8");
    expect(source).toContain("ClarificationAnswerPrimitiveEditor");
    expect(source).toContain("createPlanningClarificationStructuredRecordListDraftRow");
    expect(source).toContain("planningClarificationItemLabel");
    expect(source).not.toMatch(/projectRepository|planningClarificationDecisionMaterialization|planningClarificationAnswerSchemaRegistry|selectPlanningClarificationAnswerEntry|useProjectBuilder|readiness|controlledApply|generation|exportProjectPackage|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|Math\.random|randomUUID|Date\.now|new Date|analytics|console\.|convertPlanningClarificationAnswerDraft|validatePlanningClarificationAnswerDraft|validatePlanningClarificationAnswer/i);
    expect(source).not.toMatch(/action\s*:\s*["']revise["']|Save Answer|Submit Answer/i);

    const liveConsumers = [
      "src/components/Planning/ClarificationDecisionControls.tsx",
      "src/components/Planning/PlanningView.tsx",
      "src/app/useProjectBuilder.ts",
      "src/app/App.tsx"
    ];
    liveConsumers.forEach((path) => {
      const liveSource = readFileSync(path, "utf8");
      expect(liveSource).not.toContain("ClarificationAnswerStructuredEditor");
      expect(liveSource).not.toContain("ClarificationAnswerPrimitiveEditor");
    });
  });

  it("keeps structured controls width-safe at all approved breakpoints with 44px mobile actions", () => {
    const styles = readFileSync("src/styles/global.css", "utf8");
    expect(styles).toMatch(/\.planning-answer-structured\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*720px;/s);
    expect(styles).toMatch(/\.planning-answer-renderer\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*720px;/s);
    expect(styles).toMatch(/@media \(max-width: 860px\)[\s\S]*?\.planning-answer-structured-remove,[\s\S]*?\.planning-answer-structured-add\s*\{\s*min-height:\s*44px;/);
    expect(styles).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.planning-answer-structured-row-header/);
    expect(styles).toMatch(/@media \(max-width: 480px\)[\s\S]*?\.planning-answer-structured-add/);
  });
});
