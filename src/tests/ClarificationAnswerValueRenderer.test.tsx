// @ts-expect-error -- Vitest runs static source isolation assertions in Node; app TypeScript excludes Node ambient types.
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ClarificationAnswerValueRenderer
} from "../components/Planning/ClarificationAnswerValueRenderer";
import type { PlanningClarificationAnswerSchema } from "../lib/planningClarificationAnswerSchema";
import type { PlanningProposalValue } from "../lib/planningProposals";

const unavailableNotice =
  "This saved answer cannot be displayed because it no longer matches the approved answer structure.";

const nestedSchema: PlanningClarificationAnswerSchema = {
  kind: "structuredRecordList",
  minItems: 1,
  maxItems: 3,
  fields: [
    { key: "name", label: "Component name", required: true, schema: { kind: "text" } },
    { key: "notes", label: "Optional notes", required: false, schema: { kind: "text" } },
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

const nestedAnswer: PlanningProposalValue = {
  kind: "structuredRecordList",
  value: [
    {
      name: { kind: "text", value: "Component B" },
      usageTargets: {
        kind: "structuredRecordList",
        value: [
          { targetType: { kind: "enum", value: "control" }, targetId: { kind: "text", value: "Control 2" } },
          { targetType: { kind: "enum", value: "screen" }, targetId: { kind: "text", value: "Screen 1" } }
        ]
      }
    },
    {
      name: { kind: "text", value: "Component A" },
      usageTargets: {
        kind: "structuredRecordList",
        value: [
          { targetType: { kind: "enum", value: "screen" }, targetId: { kind: "text", value: "Screen 3" } }
        ]
      }
    }
  ]
};

function renderAnswer(schema: PlanningClarificationAnswerSchema, answer: PlanningProposalValue) {
  return render(
    <ClarificationAnswerValueRenderer
      answer={answer}
      label="Saved answer"
      schema={schema}
    />
  );
}

describe("ClarificationAnswerValueRenderer", () => {
  it("renders canonical multiline text as readable text with no editable control", () => {
    renderAnswer({ kind: "text", maxLength: 100 }, { kind: "text", value: "First line\nSecond line" });
    const value = document.querySelector(".planning-answer-renderer-text");
    expect(value).not.toBeNull();
    expect(value).toHaveTextContent("First line Second line");
    expect(value?.textContent).toBe("First line\nSecond line");
    expect(value).toHaveClass("planning-answer-renderer-text");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders canonical booleans as Yes and No text", () => {
    const { rerender } = render(
      <ClarificationAnswerValueRenderer answer={{ kind: "boolean", value: true }} schema={{ kind: "boolean" }} />
    );
    expect(screen.getByText("Yes")).toBeVisible();
    rerender(<ClarificationAnswerValueRenderer answer={{ kind: "boolean", value: false }} schema={{ kind: "boolean" }} />);
    expect(screen.getByText("No")).toBeVisible();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("humanizes enum display without changing schema option semantics", () => {
    renderAnswer(
      { kind: "enum", options: ["missingInformation", "review_needed"] },
      { kind: "enum", value: "review_needed" }
    );
    expect(screen.getByText("Review Needed")).toBeVisible();
    expect(screen.queryByText("review_needed")).not.toBeInTheDocument();
  });

  it("renders string-list values in canonical order as a semantic list", () => {
    renderAnswer(
      { kind: "stringList", minItems: 1, maxItems: 3 },
      { kind: "stringList", value: ["Second", "First", "Third"] }
    );
    const list = screen.getByRole("list");
    expect(withinListText(list)).toEqual(["Second", "First", "Third"]);
    expect(list.textContent).not.toContain("Second, First");
  });

  it("renders structured records in schema order using labels and omits absent optional fields", () => {
    const schema: PlanningClarificationAnswerSchema = {
      kind: "structuredRecord",
      fields: [
        { key: "second", label: "Second label", required: true, schema: { kind: "text" } },
        { key: "optional", label: "Optional label", required: false, schema: { kind: "text" } },
        { key: "first", label: "First label", required: true, schema: { kind: "boolean" } }
      ]
    };
    renderAnswer(schema, {
      kind: "structuredRecord",
      value: {
        first: { kind: "boolean", value: false },
        second: { kind: "text", value: "Displayed first" }
      }
    });
    const secondLabel = screen.getByText("Second label");
    const firstLabel = screen.getByText("First label");
    expect(secondLabel.compareDocumentPosition(firstLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText("Optional label")).not.toBeInTheDocument();
    expect(screen.queryByText("second")).not.toBeInTheDocument();
    expect(screen.getByText("No")).toBeVisible();
  });

  it("renders structured-list and nested-list rows in canonical order with local Item N labels", () => {
    renderAnswer(nestedSchema, nestedAnswer);
    const recordLists = screen.getAllByRole("list");
    expect(recordLists.length).toBeGreaterThanOrEqual(3);
    const componentNames = screen.getAllByText(/Component [AB]/).map((node) => node.textContent);
    expect(componentNames).toEqual(["Component B", "Component A"]);
    const targetIds = screen.getAllByText(/^(Control 2|Screen 1|Screen 3)$/).map((node) => node.textContent);
    expect(targetIds).toEqual(["Control 2", "Screen 1", "Screen 3"]);
    expect(screen.getAllByText("Item 1").length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText("Item 2").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Optional notes")).not.toBeInTheDocument();
  });

  it.each([
    ["kind mismatch", { kind: "boolean" }, { kind: "text", value: "SECRET KIND" }],
    [
      "missing required field",
      { kind: "structuredRecord", fields: [{ key: "required", label: "Required", required: true, schema: { kind: "text" } }] },
      { kind: "structuredRecord", value: {} }
    ],
    [
      "unexpected field",
      { kind: "structuredRecord", fields: [] },
      { kind: "structuredRecord", value: { secret: { kind: "text", value: "SECRET EXTRA" } } }
    ],
    ["invalid enum", { kind: "enum", options: ["approved"] }, { kind: "enum", value: "SECRET INVALID ENUM" }],
    [
      "invalid nested row",
      nestedSchema,
      {
        kind: "structuredRecordList",
        value: [{ name: { kind: "text", value: "SECRET ROW" }, usageTargets: { kind: "structuredRecordList", value: [{}] } }]
      }
    ]
  ] as const)("fails closed for %s without leaking answer fragments or validation paths", (_name, schema, answer) => {
    renderAnswer(
      schema as PlanningClarificationAnswerSchema,
      answer as PlanningProposalValue
    );
    expect(screen.getByRole("status")).toHaveTextContent(unavailableNotice);
    expect(document.body).not.toHaveTextContent(/SECRET|missingRequiredField|unexpectedField|enumOptionInvalid|targetId/i);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders benign HTML and Markdown-looking canonical text literally and rejects script content safely", () => {
    const literal = "<b>Visible HTML-looking text</b>\n**Markdown-looking text**";
    const { rerender } = render(
      <ClarificationAnswerValueRenderer answer={{ kind: "text", value: literal }} schema={{ kind: "text" }} />
    );
    const renderedText = document.querySelector(".planning-answer-renderer-text");
    expect(renderedText).not.toBeNull();
    expect(renderedText?.textContent).toBe(literal);
    expect(document.querySelector("b, strong, script")).toBeNull();

    rerender(
      <ClarificationAnswerValueRenderer
        answer={{ kind: "text", value: "<script>SECRET_SCRIPT()</script>" }}
        schema={{ kind: "text" }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(unavailableNotice);
    expect(document.body).not.toHaveTextContent("SECRET_SCRIPT");
    expect(document.querySelector("script")).toBeNull();
  });

  it("keeps visible values out of IDs, hidden fields, data attributes, logs, analytics, and network effects", () => {
    const secret = "VISIBLE-SAVED-ANSWER";
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    renderAnswer({ kind: "text" }, { kind: "text", value: secret });
    expect(screen.getByText(secret)).toBeVisible();
    expect(document.querySelector(`[id*="${secret}"]`)).toBeNull();
    expect(document.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
    for (const element of Array.from(document.querySelectorAll("*"))) {
      for (const attribute of Array.from(element.attributes)) {
        if (attribute.name.startsWith("data-")) expect(attribute.value).not.toContain(secret);
      }
    }
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("contains no raw rendering, editable controls, submission, persistence, or live consumer integration", () => {
    renderAnswer(nestedSchema, nestedAnswer);
    expect(document.querySelectorAll("input, textarea, select, button")).toHaveLength(0);
    expect(document.body.textContent).not.toContain(JSON.stringify(nestedAnswer));

    const source = readFileSync("src/components/Planning/ClarificationAnswerValueRenderer.tsx", "utf8");
    expect(source).toContain("validatePlanningClarificationAnswer");
    expect(source).not.toMatch(/dangerouslySetInnerHTML|JSON\.stringify|projectRepository|planningClarificationDecisionMaterialization|useProjectBuilder|readiness|controlledApply|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|analytics|console\.|action\s*:\s*["']revise["']|Confirm decision|Save Answer/i);

    const liveConsumers = [
      "src/components/Planning/ClarificationDecisionControls.tsx",
      "src/components/Planning/PlanningView.tsx",
      "src/app/useProjectBuilder.ts",
      "src/app/App.tsx"
    ];
    liveConsumers.forEach((path) => {
      expect(readFileSync(path, "utf8")).not.toContain("ClarificationAnswerValueRenderer");
    });
  });
});

function withinListText(list: HTMLElement): string[] {
  return Array.from(list.children).map((item) => item.textContent ?? "");
}
