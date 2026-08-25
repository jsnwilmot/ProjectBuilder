import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import { validatePlanningClarificationAnswer } from "../lib/planningClarificationAnswerSchema";
import { getProductionPlanningClarificationAnswerSchemaRegistry } from "../lib/planningClarificationAnswerSchemaRegistry";
import {
  buildPlanningClarificationAnswerSchemaContext,
  PLANNING_CLARIFICATION_ANSWER_SCHEMA_RESOLVER_VERSION,
  resolveProductionPlanningClarificationAnswerSchema,
  type PlanningClarificationAnswerSchemaContext
} from "../lib/planningClarificationAnswerSchemaResolver";
import type { CanvasDataSourceType, ProjectRecord, SelectableCanvasDataSourceType } from "../types/project";

const backendRuleId = "pp.canvas.schema.confirmation";
const ruleVersion = "1.0.0";

function context(
  primaryDataSourceType: CanvasDataSourceType,
  selectedDataSourceTypes: readonly SelectableCanvasDataSourceType[]
): PlanningClarificationAnswerSchemaContext {
  return { projectType: "powerAppsCanvas", primaryDataSourceType, selectedDataSourceTypes };
}

function sharePointProject(): ProjectRecord {
  const project = createProject({
    identity: { id: "schema-resolver-project", projectName: "Inventory" },
    intake: { appType: "powerAppsCanvas" },
    now: "2026-08-24T13:00:00.000Z"
  });
  project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
  project.powerPlatform!.canvas!.selectedDataSourceTypes = [];
  return project;
}

function resolveBackend(answerSchemaContext: unknown) {
  return resolveProductionPlanningClarificationAnswerSchema(
    backendRuleId,
    ruleVersion,
    answerSchemaContext
  );
}

describe("planning clarification answer schema resolver", () => {
  it("retains the resolver version and all ten exact static bindings", () => {
    expect(PLANNING_CLARIFICATION_ANSWER_SCHEMA_RESOLVER_VERSION).toBe("phase-5c.3c.3j.2a.1");
    const registry = getProductionPlanningClarificationAnswerSchemaRegistry();
    expect(registry.entries).toHaveLength(10);
    for (const entry of registry.entries) {
      expect(resolveProductionPlanningClarificationAnswerSchema(
        entry.ruleId,
        entry.ruleVersion
      )).toEqual({ state: "available", schema: entry.schema, schemaSource: "staticRule" });
    }
    expect(resolveProductionPlanningClarificationAnswerSchema(
      registry.entries[0].ruleId,
      "9.9.9"
    )).toEqual({ state: "unavailable", reason: "schemaNotRegistered" });
  });

  it("builds only immutable canonical backend discriminators", () => {
    const project = sharePointProject();
    project.intake.dataSources = "SharePoint Online Projects";
    project.powerPlatform!.canvas!.subtype = "sharePointOnline";
    const built = buildPlanningClarificationAnswerSchemaContext(project);

    expect(built).toEqual(context("sharePointList", []));
    expect(Object.keys(built).sort()).toEqual([
      "primaryDataSourceType",
      "projectType",
      "selectedDataSourceTypes"
    ]);
    expect(Object.isFrozen(built)).toBe(true);
    expect(Object.isFrozen(built.selectedDataSourceTypes)).toBe(true);
    expect(project.powerPlatform!.canvas!.selectedDataSourceTypes).toEqual([]);
    expect(JSON.stringify(built)).not.toContain("Projects");
  });

  it("resolves exactly one SharePoint List backend contract", () => {
    const resolution = resolveBackend(context("sharePointList", []));
    expect(resolution).toMatchObject({
      state: "available",
      schemaSource: "backendSpecific",
      backendKind: "sharePointList"
    });
    if (resolution.state !== "available") return;
    expect(resolution.schema.kind).toBe("structuredRecord");
    if (resolution.schema.kind !== "structuredRecord") return;
    expect(resolution.schema.fields.map((field) => field.key)).toEqual([
      "dataSources",
      "relationships",
      "confirmationSource"
    ]);
    const dataSources = resolution.schema.fields[0];
    expect(dataSources).toMatchObject({ key: "dataSources", label: "Data sources", required: true });
    expect(dataSources.schema).toMatchObject({ kind: "structuredRecordList", minItems: 1, maxItems: 100 });
    if (dataSources.schema.kind !== "structuredRecordList") return;
    expect(dataSources.schema.fields.map((field) => [field.key, field.required, field.schema.kind])).toEqual([
      ["dataSourceName", true, "text"],
      ["purpose", true, "text"],
      ["expectedRecordVolume", true, "text"],
      ["ownership", true, "text"]
    ]);
    expect(JSON.stringify(resolution.schema)).not.toMatch(/internalName|columnInternalName|columnType|choiceValues|lookupTarget|indexing|uniqueValues|defaultValue/);
  });

  it("preserves the redundant consistent SharePoint List compatibility state", () => {
    expect(resolveBackend(context("sharePointList", ["sharePointList"]))).toMatchObject({
      state: "available",
      schemaSource: "backendSpecific",
      backendKind: "sharePointList"
    });
  });

  it("validates complete SharePoint evidence and rejects every missing required field", () => {
    const resolution = resolveBackend(context("sharePointList", []));
    if (resolution.state !== "available") throw new Error("Expected SharePoint schema.");
    const answer = {
      kind: "structuredRecord",
      value: {
        dataSources: {
          kind: "structuredRecordList",
          value: [{
            dataSourceName: { kind: "text", value: "Projects" },
            purpose: { kind: "text", value: "Track project delivery" },
            expectedRecordVolume: { kind: "text", value: "Up to 10,000 records" },
            ownership: { kind: "text", value: "Operations" }
          }]
        },
        relationships: { kind: "text", value: "Projects link to assignments by project ID." },
        confirmationSource: { kind: "text", value: "Approved solution design" }
      }
    } as const;
    expect(validatePlanningClarificationAnswer(resolution.schema, answer).outcome).toBe("valid");

    for (const field of [
      "dataSources",
      "relationships",
      "confirmationSource"
    ] as const) {
      const invalid = structuredClone(answer) as typeof answer;
      delete (invalid.value as Partial<typeof invalid.value>)[field];
      expect(validatePlanningClarificationAnswer(resolution.schema, invalid).outcome).toBe("invalid");
    }
    for (const field of [
      "dataSourceName",
      "purpose",
      "expectedRecordVolume",
      "ownership"
    ] as const) {
      const invalid = structuredClone(answer) as typeof answer;
      delete (invalid.value.dataSources.value[0] as Partial<
        typeof invalid.value.dataSources.value[0]
      >)[field];
      expect(validatePlanningClarificationAnswer(resolution.schema, invalid).outcome).toBe("invalid");
    }
  });

  it.each([
    "sharePointLibrary",
    "microsoftList",
    "dataverse",
    "excel",
    "sqlServer",
    "microsoft365Connector",
    "customConnector",
    "externalApi",
    "otherConnector"
  ] as const)("fails closed for unsupported single backend %s", (backend) => {
    expect(resolveBackend(context(backend, []))).toEqual({
      state: "unavailable",
      reason: "backendTypeUnsupported"
    });
  });

  it("distinguishes undecided and mixed backend selection", () => {
    expect(resolveBackend(context("undecided", []))).toEqual({
      state: "unavailable",
      reason: "backendSelectionRequired"
    });
    expect(resolveBackend(context("sharePointList", ["sharePointList", "dataverse"]))).toEqual({
      state: "unavailable",
      reason: "mixedBackendUnsupported"
    });
    expect(resolveBackend(context("sharePointList", ["sharePointList", "externalApi"]))).toEqual({
      state: "unavailable",
      reason: "mixedBackendUnsupported"
    });
    expect(resolveBackend(context("multiple", ["sharePointList", "dataverse"]))).toEqual({
      state: "unavailable",
      reason: "mixedBackendUnsupported"
    });
  });

  it("fails contradictory selected data closed for a concrete single primary", () => {
    expect(resolveBackend(context("sharePointList", ["dataverse"]))).toEqual({
      state: "unavailable",
      reason: "backendSelectionRequired"
    });
    expect(resolveBackend(context("sharePointList", ["sharePointList", "dataverse"]))).toEqual({
      state: "unavailable",
      reason: "mixedBackendUnsupported"
    });
  });

  it("does not infer SharePoint from intake text or Canvas subtype", () => {
    const project = sharePointProject();
    project.intake.dataSources = "SharePoint Online Projects";
    project.powerPlatform!.canvas!.subtype = "sharePointOnline";
    project.powerPlatform!.canvas!.primaryDataSourceType = "undecided";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = [];
    expect(resolveBackend(buildPlanningClarificationAnswerSchemaContext(project))).toEqual({
      state: "unavailable",
      reason: "backendSelectionRequired"
    });
  });

  it.each([
    undefined,
    null,
    {},
    { projectType: "webApplication", primaryDataSourceType: "sharePointList", selectedDataSourceTypes: ["sharePointList"] },
    { projectType: "powerAppsCanvas", primaryDataSourceType: "unknown", selectedDataSourceTypes: ["sharePointList"] },
    { projectType: "powerAppsCanvas", primaryDataSourceType: "sharePointList", selectedDataSourceTypes: ["unknown"] },
    { projectType: "powerAppsCanvas", primaryDataSourceType: "sharePointList", selectedDataSourceTypes: ["sharePointList", "sharePointList"] },
    { projectType: "powerAppsCanvas", primaryDataSourceType: "sharePointList", selectedDataSourceTypes: ["dataverse"] },
    { projectType: "powerAppsCanvas", primaryDataSourceType: "sharePointList", selectedDataSourceTypes: ["sharePointList"], extra: true }
  ])("fails closed for missing, malformed, duplicate, or incoherent context %#", (candidate) => {
    const result = resolveBackend(candidate);
    expect(result.state).toBe("unavailable");
    if (result.state !== "unavailable") return;
    expect(["backendSelectionRequired", "invalidContext"]).toContain(result.reason);
  });

  it("rejects unsupported backend rule versions without fallback", () => {
    expect(resolveProductionPlanningClarificationAnswerSchema(
      backendRuleId,
      "2.0.0",
      context("sharePointList", [])
    )).toEqual({ state: "unavailable", reason: "unsupportedBackendRuleVersion" });
  });
});
