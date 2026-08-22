// @ts-expect-error -- Vitest runs static source isolation assertions in Node; app TypeScript excludes Node ambient types.
import { readFileSync } from "node:fs";
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ClarificationAnswerPrimitiveEditor
} from "../components/Planning/ClarificationAnswerPrimitiveEditor";
import type {
  PlanningClarificationStringListDraft
} from "../lib/planningClarificationAnswerDraft";
import type {
  PlanningClarificationStringListAnswerSchema
} from "../lib/planningClarificationAnswerSchema";

const stringListSchema: PlanningClarificationStringListAnswerSchema = {
  kind: "stringList",
  minItems: 1,
  maxItems: 3,
  itemMaxLength: 20
};

function StringListHarness({
  initialDraft,
  schema = stringListSchema,
  disabled = false
}: {
  initialDraft: PlanningClarificationStringListDraft;
  schema?: PlanningClarificationStringListAnswerSchema;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(initialDraft);
  return (
    <ClarificationAnswerPrimitiveEditor
      disabled={disabled}
      draft={draft}
      label="Approved values"
      required
      schema={schema}
      onChange={setDraft}
    />
  );
}

describe("ClarificationAnswerPrimitiveEditor", () => {
  it("renders every text answer as a controlled textarea with exact multiline draft text", () => {
    const onChange = vi.fn();
    const draftText = "  first line\nsecond line  ";
    render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "text", value: draftText }}
        label="Implementation notes"
        required
        schema={{ kind: "text", maxLength: 80 }}
        onChange={onChange}
      />
    );

    const textarea = screen.getByRole("textbox", { name: /Implementation notes Required/i });
    expect(textarea).toBeInstanceOf(HTMLTextAreaElement);
    expect(textarea).toHaveValue(draftText);
    expect(textarea).toHaveAttribute("maxlength", "80");
    expect(textarea).toBeRequired();
    expect(screen.getByText(`${draftText.length} / 80 characters`)).toBeVisible();
    expect(screen.getByText("Required")).toBeVisible();
  });

  it("preserves spaces, newlines, and line endings in text onChange without semantic conversion", () => {
    const onChange = vi.fn();
    render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "text", value: "" }}
        label="Answer"
        required={false}
        schema={{ kind: "text" }}
        onChange={onChange}
      />
    );
    const value = "  alpha\nbeta  ";
    fireEvent.change(screen.getByRole("textbox", { name: "Answer" }), { target: { value } });
    expect(onChange).toHaveBeenCalledWith({ kind: "text", value });
  });

  it("disables text editing and renders no submission controls", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ClarificationAnswerPrimitiveEditor
        disabled
        draft={{ kind: "text", value: "Readable answer" }}
        label="Answer"
        required={false}
        schema={{ kind: "text" }}
        onChange={onChange}
      />
    );
    const textarea = screen.getByRole("textbox", { name: "Answer" });
    expect(textarea).toBeDisabled();
    await user.type(textarea, " changed");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /save|submit|revise|confirm|cancel/i })).not.toBeInTheDocument();
  });

  it("uses a fieldset and legend for explicit unanswered Yes and No boolean radios", () => {
    render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "boolean", value: undefined }}
        label="Approved"
        required
        schema={{ kind: "boolean" }}
        onChange={vi.fn()}
      />
    );
    const group = screen.getByRole("group", { name: /Approved Required/i });
    const yes = within(group).getByRole("radio", { name: "Yes" });
    const no = within(group).getByRole("radio", { name: "No" });
    expect(group.tagName).toBe("FIELDSET");
    expect(yes).not.toBeChecked();
    expect(no).not.toBeChecked();
    expect(yes).toBeRequired();
    expect(no).toBeRequired();
  });

  it("preserves explicit false and emits exact true and false boolean drafts", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "boolean", value: false }}
        label="Approved"
        required={false}
        schema={{ kind: "boolean" }}
        onChange={onChange}
      />
    );
    expect(screen.getByRole("radio", { name: "No" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Yes" })).not.toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Yes" }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: "boolean", value: true });

    rerender(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "boolean", value: true }}
        label="Approved"
        required={false}
        schema={{ kind: "boolean" }}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole("radio", { name: "No" }));
    expect(onChange).toHaveBeenLastCalledWith({ kind: "boolean", value: false });
  });

  it("disables both boolean choices without changing the draft", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ClarificationAnswerPrimitiveEditor
        disabled
        draft={{ kind: "boolean", value: false }}
        label="Approved"
        required
        schema={{ kind: "boolean" }}
        onChange={onChange}
      />
    );
    expect(screen.getByRole("radio", { name: "Yes" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "No" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Yes" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders an unanswered enum placeholder without selecting the first canonical option", () => {
    render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "enum", value: undefined }}
        label="Review state"
        required
        schema={{ kind: "enum", options: ["missingInformation", "review_needed", "confirmed"] }}
        onChange={vi.fn()}
      />
    );
    const select = screen.getByRole("combobox", { name: /Review state Required/i });
    expect(select).toHaveValue("");
    expect(within(select).getByRole("option", { name: "Select an option" })).toBeDisabled();
  });

  it("preserves exact enum order and canonical values while humanizing display labels", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "enum", value: undefined }}
        label="Review state"
        required={false}
        schema={{ kind: "enum", options: ["reviewNeeded", "missing_information", "already-confirmed"] }}
        onChange={onChange}
      />
    );
    const select = screen.getByRole("combobox", { name: "Review state" });
    const options = within(select).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Select an option",
      "Review Needed",
      "Missing Information",
      "Already Confirmed"
    ]);
    expect(options.map((option) => option.getAttribute("value"))).toEqual([
      "",
      "reviewNeeded",
      "missing_information",
      "already-confirmed"
    ]);
    await user.selectOptions(select, "missing_information");
    expect(onChange).toHaveBeenCalledWith({ kind: "enum", value: "missing_information" });
  });

  it("disables enum interaction and does not invent schema options", () => {
    render(
      <ClarificationAnswerPrimitiveEditor
        disabled
        draft={{ kind: "enum", value: "confirmed" }}
        label="Review state"
        required={false}
        schema={{ kind: "enum", options: ["confirmed"] }}
        onChange={vi.fn()}
      />
    );
    const select = screen.getByRole("combobox", { name: "Review state" });
    expect(select).toBeDisabled();
    expect(within(select).getAllByRole("option")).toHaveLength(2);
  });

  it("renders an untouched string list with zero rows and Add at the bottom despite minItems", () => {
    render(
      <StringListHarness initialDraft={{ kind: "stringList", engaged: false, items: [] }} />
    );
    const group = screen.getByRole("group", { name: /Approved values Required/i });
    expect(within(group).queryAllByRole("textbox")).toHaveLength(0);
    expect(within(group).getByRole("button", { name: "Add item" })).toBeEnabled();
  });

  it("adds one blank item at the bottom, engages the list, and creates a mount-local ephemeral ID", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "stringList", engaged: false, items: [] }}
        label="Approved values"
        required
        schema={stringListSchema}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0][0] as PlanningClarificationStringListDraft;
    expect(emitted).toMatchObject({ kind: "stringList", engaged: true, items: [{ value: "" }] });
    expect(emitted.items[0].draftId).toMatch(/-item-1$/);
  });

  it("uses Item N labels, single-line inputs, item limits, and associated Remove before content", () => {
    render(
      <StringListHarness
        initialDraft={{
          kind: "stringList",
          engaged: true,
          items: [
            { draftId: "draft-a", value: "first" },
            { draftId: "draft-b", value: "second" }
          ]
        }}
      />
    );
    const rows = screen.getAllByRole("article");
    expect(screen.getByRole("heading", { name: "Item 1" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Item 2" })).toBeVisible();
    const firstRemove = within(rows[0]).getByRole("button", { name: "Remove Item 1" });
    const firstInput = within(rows[0]).getByRole("textbox", { name: "Item 1 value" });
    expect(firstInput).toHaveAttribute("type", "text");
    expect(firstInput).toHaveAttribute("maxlength", "20");
    expect(firstRemove.compareDocumentPosition(firstInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const add = screen.getByRole("button", { name: "Add item" });
    expect(rows[1].compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("preserves item order and does not split delimiters while editing", async () => {
    const user = userEvent.setup();
    render(
      <StringListHarness
        initialDraft={{
          kind: "stringList",
          engaged: true,
          items: [
            { draftId: "draft-b", value: "second" },
            { draftId: "draft-a", value: "first" }
          ]
        }}
      />
    );
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.map((input) => (input as HTMLInputElement).value)).toEqual(["second", "first"]);
    await user.clear(inputs[0]);
    await user.type(inputs[0], "alpha,beta");
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("alpha,beta");
  });

  it("removes exactly one selected item while preserving remaining order and engagement", async () => {
    const user = userEvent.setup();
    render(
      <StringListHarness
        initialDraft={{
          kind: "stringList",
          engaged: false,
          items: [
            { draftId: "one", value: "one" },
            { draftId: "two", value: "two" },
            { draftId: "three", value: "three" }
          ]
        }}
      />
    );
    await user.click(screen.getByRole("button", { name: "Remove Item 2" }));
    expect(screen.getAllByRole("textbox").map((input) => (input as HTMLInputElement).value)).toEqual(["one", "three"]);
    expect(screen.getByRole("heading", { name: "Item 2" })).toBeVisible();
  });

  it("keeps the list engaged after removing the final item", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "stringList", engaged: false, items: [{ draftId: "only", value: "value" }] }}
        label="Approved values"
        required
        schema={stringListSchema}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole("button", { name: "Remove Item 1" }));
    expect(onChange).toHaveBeenCalledWith({ kind: "stringList", engaged: true, items: [] });
  });

  it("keeps blank draft items visible and disables Add at maxItems", () => {
    render(
      <StringListHarness
        schema={{ ...stringListSchema, maxItems: 1 }}
        initialDraft={{ kind: "stringList", engaged: true, items: [{ draftId: "blank", value: "" }] }}
      />
    );
    expect(screen.getByRole("textbox", { name: "Item 1 value" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Add item" })).toBeDisabled();
  });

  it("disables string-list inputs and every Add and Remove action", () => {
    render(
      <StringListHarness
        disabled
        initialDraft={{ kind: "stringList", engaged: true, items: [{ draftId: "one", value: "visible" }] }}
      />
    );
    expect(screen.getByRole("textbox", { name: "Item 1 value" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove Item 1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add item" })).toBeDisabled();
  });

  it("fails closed for unsupported schemas and mismatched primitive drafts", () => {
    const unsupportedProps = {
      schema: { kind: "structuredRecord", fields: [] },
      draft: { kind: "structuredRecord", fields: {} },
      label: "Unsupported",
      required: false,
      onChange: vi.fn()
    } as unknown as Parameters<typeof ClarificationAnswerPrimitiveEditor>[0];
    const { rerender } = render(<ClarificationAnswerPrimitiveEditor {...unsupportedProps} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/unavailable/i);

    const mismatchProps = {
      schema: { kind: "text" },
      draft: { kind: "boolean", value: undefined },
      label: "Mismatch",
      required: false,
      onChange: vi.fn()
    } as unknown as Parameters<typeof ClarificationAnswerPrimitiveEditor>[0];
    rerender(<ClarificationAnswerPrimitiveEditor {...mismatchProps} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/does not match/i);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("displays only supplied safe projected issues through associated generic text", () => {
    render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "text", value: "visible answer" }}
        issues={[{
          code: "textLimitExceeded",
          associationPath: [],
          location: "Answer",
          message: "Answer exceeds the approved text limit."
        }]}
        label="Answer"
        required
        schema={{ kind: "text", maxLength: 10 }}
        onChange={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox", { name: /Answer Required/i });
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Answer exceeds the approved text limit.")).toBeVisible();
  });

  it("keeps answer values out of DOM IDs and adds no hidden serialization", () => {
    const secret = "SECRET-ANSWER-VALUE";
    render(
      <ClarificationAnswerPrimitiveEditor
        draft={{ kind: "text", value: secret }}
        label="Answer"
        required={false}
        schema={{ kind: "text" }}
        onChange={vi.fn()}
      />
    );
    const textarea = screen.getByRole("textbox", { name: "Answer" });
    expect(textarea.id).not.toContain(secret);
    expect(document.querySelectorAll('input[type="hidden"], script')).toHaveLength(0);
  });

  it("has no persistence, registry, network, runtime clock, analytics, validation, or Revise submission path", () => {
    const source = readFileSync("src/components/Planning/ClarificationAnswerPrimitiveEditor.tsx", "utf8");
    expect(source).not.toMatch(/projectRepository|planningClarificationDecisionMaterialization|planningClarificationAnswerSchemaRegistry|selectPlanningClarificationAnswerEntry|useProjectBuilder|readiness|controlledApply|generation|exportProjectPackage|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|Math\.random|randomUUID|Date\.now|new Date|analytics|console\.|convertPlanningClarificationAnswerDraft|validatePlanningClarificationAnswerDraft|validatePlanningClarificationAnswer/i);
    expect(source).not.toMatch(/action\s*:\s*["']revise["']/i);
  });

  it("has no production consumer in the authorized Planning integration surfaces", () => {
    const productionConsumers = [
      "src/components/Planning/ClarificationDecisionControls.tsx",
      "src/components/Planning/PlanningView.tsx",
      "src/app/useProjectBuilder.ts",
      "src/app/App.tsx"
    ];
    productionConsumers.forEach((path) => {
      expect(readFileSync(path, "utf8")).not.toContain("ClarificationAnswerPrimitiveEditor");
    });
  });
});
