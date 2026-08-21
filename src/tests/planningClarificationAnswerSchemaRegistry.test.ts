// @ts-expect-error -- Vitest runs static source isolation checks in Node; app TypeScript excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION } from "../lib/planningClarificationAnswerSchema";
import {
  getProductionPlanningClarificationAnswerSchema,
  getProductionPlanningClarificationAnswerSchemaRegistry,
  lookupPlanningClarificationAnswerSchema,
  normalizePlanningClarificationAnswerSchemaRegistry,
  type PlanningClarificationAnswerSchemaRegistry
} from "../lib/planningClarificationAnswerSchemaRegistry";

function syntheticRegistry(): unknown {
  return {
    contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
    entries: [
      { ruleId: "synthetic.answer.text", ruleVersion: "1.0.0", schema: { kind: "text", maxLength: 100 } },
      { ruleId: "synthetic.answer.boolean", ruleVersion: "1.0.0", schema: { kind: "boolean" } },
      { ruleId: "synthetic.answer.enum", ruleVersion: "1.0.0", schema: { kind: "enum", options: ["Alpha", "Beta"] } },
      { ruleId: "synthetic.answer.list", ruleVersion: "1.0.0", schema: { kind: "stringList", minItems: 1 } },
      {
        ruleId: "synthetic.answer.record",
        ruleVersion: "1.0.0",
        schema: {
          kind: "structuredRecord",
          fields: [{ key: "name", label: "Name", required: true, schema: { kind: "text" } }]
        }
      },
      {
        ruleId: "synthetic.answer.rows",
        ruleVersion: "1.0.0",
        schema: {
          kind: "structuredRecordList",
          fields: [{ key: "enabled", label: "Enabled", required: true, schema: { kind: "boolean" } }]
        }
      }
    ]
  };
}

function validRegistry(): PlanningClarificationAnswerSchemaRegistry {
  const result = normalizePlanningClarificationAnswerSchemaRegistry(syntheticRegistry());
  if (result.outcome !== "valid") throw new Error("Synthetic registry must be valid.");
  return result.registry;
}

describe("planning clarification answer schema registry", () => {
  it("normalizes synthetic entries for all six semantic kinds", () => {
    const result = normalizePlanningClarificationAnswerSchemaRegistry(syntheticRegistry());
    expect(result).toMatchObject({
      outcome: "valid",
      registry: {
        contractVersion: "phase-5c.3c.3c",
        entries: [
          { ruleId: "synthetic.answer.text", schema: { kind: "text" } },
          { ruleId: "synthetic.answer.boolean", schema: { kind: "boolean" } },
          { ruleId: "synthetic.answer.enum", schema: { kind: "enum" } },
          { ruleId: "synthetic.answer.list", schema: { kind: "stringList" } },
          { ruleId: "synthetic.answer.record", schema: { kind: "structuredRecord" } },
          { ruleId: "synthetic.answer.rows", schema: { kind: "structuredRecordList" } }
        ]
      },
      issues: []
    });
  });

  it("uses the exact rule ID and version pair without fallback", () => {
    const registry = validRegistry();
    expect(lookupPlanningClarificationAnswerSchema(registry, "synthetic.answer.enum", "1.0.0"))
      .toEqual({ kind: "enum", options: ["Alpha", "Beta"] });
    expect(lookupPlanningClarificationAnswerSchema(registry, "synthetic.answer.enum", "1.0.1")).toBeUndefined();
    expect(lookupPlanningClarificationAnswerSchema(registry, "synthetic.answer.unknown", "1.0.0")).toBeUndefined();
    expect(lookupPlanningClarificationAnswerSchema(registry, "Synthetic answer enum", "1.0.0")).toBeUndefined();
  });

  it("rejects duplicate rule ID and version pairs without last-write-wins", () => {
    const result = normalizePlanningClarificationAnswerSchemaRegistry({
      contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
      entries: [
        { ruleId: "synthetic.answer.duplicate", ruleVersion: "1.0.0", schema: { kind: "text" } },
        { ruleId: "synthetic.answer.duplicate", ruleVersion: "1.0.0", schema: { kind: "boolean" } }
      ]
    });
    expect(result).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "duplicateEntry" })] });
  });

  it("allows one rule ID to carry distinct explicit versions", () => {
    const result = normalizePlanningClarificationAnswerSchemaRegistry({
      contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
      entries: [
        { ruleId: "synthetic.answer.versioned", ruleVersion: "1.0.0", schema: { kind: "text" } },
        { ruleId: "synthetic.answer.versioned", ruleVersion: "2.0.0", schema: { kind: "boolean" } }
      ]
    });
    expect(result).toMatchObject({ outcome: "valid", registry: { entries: [{ ruleVersion: "1.0.0" }, { ruleVersion: "2.0.0" }] } });
  });

  it("fails closed for malformed containers, entries, identities, versions, and schemas", () => {
    const sparseEntries = [{ ruleId: "synthetic.answer.first", ruleVersion: "1.0.0", schema: { kind: "text" } }];
    sparseEntries.length = 2;
    const invalidRegistries: unknown[] = [
      null,
      [],
      { contractVersion: "wrong", entries: [] },
      { contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION, entries: "invalid" },
      { contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION, entries: sparseEntries },
      { contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION, entries: [null] },
      {
        contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
        entries: [{ ruleId: "Invalid Rule", ruleVersion: "1.0.0", schema: { kind: "text" } }]
      },
      {
        contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
        entries: [{ ruleId: " synthetic.answer.spaced", ruleVersion: "1.0.0", schema: { kind: "text" } }]
      },
      {
        contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
        entries: [{ ruleId: "synthetic.answer.version", ruleVersion: "latest", schema: { kind: "text" } }]
      },
      {
        contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
        entries: [{ ruleId: "synthetic.answer.schema", ruleVersion: "1.0.0", schema: { kind: "recordCreation" } }]
      }
    ];
    invalidRegistries.forEach((registry) => {
      expect(normalizePlanningClarificationAnswerSchemaRegistry(registry).outcome).toBe("invalid");
    });
  });

  it("prevents returned references from mutating canonical registered schemas", () => {
    const registry = validRegistry();
    const first = lookupPlanningClarificationAnswerSchema(registry, "synthetic.answer.enum", "1.0.0");
    expect(first?.kind).toBe("enum");
    if (first?.kind === "enum") {
      (first.options as string[]).push("Mutated");
    }
    expect(lookupPlanningClarificationAnswerSchema(registry, "synthetic.answer.enum", "1.0.0"))
      .toEqual({ kind: "enum", options: ["Alpha", "Beta"] });
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.entries[0].schema)).toBe(true);
  });

  it("keeps the production registry empty and returns defensive registry copies", () => {
    const first = getProductionPlanningClarificationAnswerSchemaRegistry();
    expect(first.contractVersion).toBe(PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION);
    expect(first.entries).toEqual([]);
    (first.entries as unknown[]).push({});
    expect(getProductionPlanningClarificationAnswerSchemaRegistry().entries).toEqual([]);
    expect(getProductionPlanningClarificationAnswerSchema("synthetic.answer.text", "1.0.0")).toBeUndefined();
  });

  it("contains no production bindings for the current clarification rules", () => {
    const source = readFileSync("src/lib/planningClarificationAnswerSchemaRegistry.ts", "utf8");
    const currentRuleIds = [
      "pp.canvas.schema.confirmation",
      "pp.sharepoint.internalnames.confirmation",
      "pp.canvas.screentargets.confirmation",
      "pp.canvas.controltargets.confirmation",
      "pp.canvas.components.confirmation",
      "pp.canvas.yamlplanning.confirmation",
      "pp.canvas.delegation.confirmation",
      "pp.security.permissions.confirmation",
      "pp.testing.outcomes.confirmation",
      "pp.alm.rollback.confirmation",
      "pp.release.approval.confirmation"
    ];
    currentRuleIds.forEach((ruleId) => expect(source).not.toContain(ruleId));
    expect(source).toMatch(/entries:\s*\[\]/);
  });

  it("keeps the registry module statically isolated from prohibited behavior", () => {
    const source = readFileSync("src/lib/planningClarificationAnswerSchemaRegistry.ts", "utf8");
    expect(source).not.toMatch(/from\s+["']\.\/projectRepository|from\s+["']\.\/storageVersion/);
    expect(source).not.toMatch(/controlledApply|readiness|generateProjectPackage|exportProjectPackage|React|localStorage|sessionStorage/i);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|randomUUID|Date\.now|new Date|crypto/i);
  });
});
