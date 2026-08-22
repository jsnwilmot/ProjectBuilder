// @ts-expect-error -- Vitest runs static source isolation checks in Node; app TypeScript excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
  normalizePlanningClarificationAnswerSchema,
  validatePlanningClarificationAnswer,
  type PlanningClarificationAnswerSchema,
  type PlanningClarificationAnswerSchemaField
} from "../lib/planningClarificationAnswerSchema";
import {
  getProductionPlanningClarificationAnswerSchema,
  getProductionPlanningClarificationAnswerSchemaRegistry,
  lookupPlanningClarificationAnswerSchema,
  normalizePlanningClarificationAnswerSchemaRegistry,
  type PlanningClarificationAnswerSchemaRegistry
} from "../lib/planningClarificationAnswerSchemaRegistry";

const RULE_VERSION = "1.0.0";
const STATUS_OPTIONS = ["notStarted", "missingInformation", "reviewNeeded", "confirmed", "blocked"] as const;
const BOUND_RULE_IDS = [
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
] as const;

const textField = (key: string, label: string): PlanningClarificationAnswerSchemaField => ({
  key,
  label,
  required: true,
  schema: { kind: "text" }
});

const EXPECTED_SCHEMAS: Record<(typeof BOUND_RULE_IDS)[number], PlanningClarificationAnswerSchema> = {
  "pp.sharepoint.internalnames.confirmation": {
    kind: "structuredRecordList",
    minItems: 1,
    maxItems: 100,
    fields: [
      { key: "parentType", label: "Parent type", required: true, schema: { kind: "enum", options: ["list", "library"] } },
      textField("parentId", "Parent ID"),
      textField("displayName", "Display name"),
      textField("internalName", "Internal name"),
      textField("confirmationSource", "Confirmation source")
    ]
  },
  "pp.canvas.screentargets.confirmation": {
    kind: "structuredRecordList",
    minItems: 1,
    maxItems: 100,
    fields: [
      textField("id", "Screen ID"),
      textField("approvedScreenName", "Approved screen name"),
      textField("purpose", "Purpose"),
      { key: "confirmationStatus", label: "Confirmation status", required: true, schema: { kind: "enum", options: STATUS_OPTIONS } },
      textField("confirmationSource", "Confirmation source")
    ]
  },
  "pp.canvas.controltargets.confirmation": {
    kind: "structuredRecordList",
    minItems: 1,
    maxItems: 100,
    fields: [
      textField("id", "Control ID"),
      textField("screenId", "Parent screen ID"),
      textField("approvedControlName", "Approved control name"),
      textField("controlType", "Control type"),
      textField("purpose", "Purpose"),
      textField("formulaProperties", "Formula properties"),
      textField("confirmationSource", "Confirmation source")
    ]
  },
  "pp.canvas.components.confirmation": {
    kind: "structuredRecordList",
    minItems: 1,
    maxItems: 100,
    fields: [
      textField("approvedComponentName", "Approved component name"),
      textField("purpose", "Purpose"),
      textField("inputs", "Inputs"),
      textField("outputs", "Outputs"),
      {
        key: "usageTargets",
        label: "Usage locations",
        required: true,
        schema: {
          kind: "structuredRecordList",
          minItems: 1,
          maxItems: 100,
          fields: [
            { key: "targetType", label: "Target type", required: true, schema: { kind: "enum", options: ["screen", "control"] } },
            textField("targetId", "Target ID")
          ]
        }
      },
      textField("confirmationSource", "Confirmation source")
    ]
  },
  "pp.canvas.yamlplanning.confirmation": {
    kind: "structuredRecord",
    fields: [
      textField("installationResponsibility", "Installation responsibility"),
      textField("validationResponsibility", "Validation responsibility"),
      textField("yamlInstallationLocation", "Application location"),
      textField("yamlParentRelationship", "Parent relationship")
    ]
  },
  "pp.canvas.delegation.confirmation": {
    kind: "structuredRecord",
    fields: [
      textField("expectedRecordCounts", "Expected record volumes"),
      textField("searchRequirements", "Search patterns"),
      textField("filteringRequirements", "Filter operations"),
      textField("sortingRequirements", "Sort operations"),
      {
        key: "connectorLimitations",
        label: "Connector limitations",
        required: true,
        schema: {
          kind: "structuredRecordList",
          minItems: 1,
          maxItems: 100,
          fields: [textField("connectorId", "Connector ID"), textField("limitations", "Limitations")]
        }
      },
      textField("delegationRequirements", "Mitigation requirements")
    ]
  },
  "pp.security.permissions.confirmation": {
    kind: "structuredRecordList",
    minItems: 1,
    maxItems: 100,
    fields: [
      textField("userRole", "User role"),
      textField("viewPermission", "View permission"),
      textField("createPermission", "Create permission"),
      textField("editPermission", "Edit permission"),
      textField("archivePermission", "Archive permission"),
      textField("restorePermission", "Restore permission"),
      textField("approvePermission", "Approve permission"),
      textField("administerPermission", "Administer permission"),
      textField("confirmationSource", "Authoritative permission source")
    ]
  },
  "pp.testing.outcomes.confirmation": {
    kind: "structuredRecordList",
    minItems: 1,
    maxItems: 100,
    fields: [
      textField("observableOutcome", "Observable outcome"),
      textField("testPerformer", "Test performer"),
      textField("approvedEnvironment", "Approved environment")
    ]
  },
  "pp.alm.rollback.confirmation": {
    kind: "structuredRecord",
    fields: [
      textField("sourceControlOwner", "Source-control owner"),
      textField("solutionPackagingOwner", "Solution-packaging owner"),
      textField("connectionReferencesOwner", "Connection-references owner"),
      textField("environmentVariablesOwner", "Environment-variables owner"),
      textField("deploymentOwner", "Deployment owner"),
      textField("rollbackOwner", "Rollback owner"),
      textField("recoveryOwner", "Recovery owner")
    ]
  },
  "pp.release.approval.confirmation": {
    kind: "structuredRecord",
    fields: [
      textField("releaseApprovalResponsibility", "Release approval responsibility"),
      textField("releaseApprover", "Authorized release approver"),
      {
        key: "requiredEvidence",
        label: "Required review evidence",
        required: true,
        schema: { kind: "stringList", minItems: 1, maxItems: 100, itemMaxLength: 500 }
      },
      { key: "releaseApprovalStatus", label: "Approval status", required: true, schema: { kind: "enum", options: STATUS_OPTIONS } }
    ]
  }
};

function syntheticRegistry(): unknown {
  return {
    contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
    entries: [
      { ruleId: "synthetic.answer.text", ruleVersion: RULE_VERSION, schema: { kind: "text", maxLength: 100 } },
      { ruleId: "synthetic.answer.boolean", ruleVersion: RULE_VERSION, schema: { kind: "boolean" } },
      { ruleId: "synthetic.answer.enum", ruleVersion: RULE_VERSION, schema: { kind: "enum", options: ["Alpha", "Beta"] } },
      { ruleId: "synthetic.answer.list", ruleVersion: RULE_VERSION, schema: { kind: "stringList", minItems: 1 } },
      {
        ruleId: "synthetic.answer.record",
        ruleVersion: RULE_VERSION,
        schema: { kind: "structuredRecord", fields: [textField("name", "Name")] }
      },
      {
        ruleId: "synthetic.answer.rows",
        ruleVersion: RULE_VERSION,
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

function schemaFor(ruleId: (typeof BOUND_RULE_IDS)[number]): PlanningClarificationAnswerSchema {
  const schema = getProductionPlanningClarificationAnswerSchema(ruleId, RULE_VERSION);
  if (!schema) throw new Error(`Missing production schema for ${ruleId}.`);
  return schema;
}

const text = (value: string): unknown => ({ kind: "text", value });
const enumValue = (value: string): unknown => ({ kind: "enum", value });
const stringList = (value: string[]): unknown => ({ kind: "stringList", value });
const record = (value: Record<string, unknown>): unknown => ({ kind: "structuredRecord", value });
const rows = (value: Record<string, unknown>[]): unknown => ({ kind: "structuredRecordList", value });

function validate(ruleId: (typeof BOUND_RULE_IDS)[number], answer: unknown) {
  return validatePlanningClarificationAnswer(schemaFor(ruleId), answer);
}

function without(source: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([candidate]) => candidate !== key));
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

  it("uses exact rule identity without fallback and rejects duplicates", () => {
    const registry = validRegistry();
    expect(lookupPlanningClarificationAnswerSchema(registry, "synthetic.answer.enum", RULE_VERSION))
      .toEqual({ kind: "enum", options: ["Alpha", "Beta"] });
    expect(lookupPlanningClarificationAnswerSchema(registry, "synthetic.answer.enum", "1.0.1")).toBeUndefined();
    expect(lookupPlanningClarificationAnswerSchema(registry, "synthetic.answer.unknown", RULE_VERSION)).toBeUndefined();
    expect(normalizePlanningClarificationAnswerSchemaRegistry({
      contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
      entries: [
        { ruleId: "synthetic.answer.duplicate", ruleVersion: RULE_VERSION, schema: { kind: "text" } },
        { ruleId: "synthetic.answer.duplicate", ruleVersion: RULE_VERSION, schema: { kind: "boolean" } }
      ]
    })).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "duplicateEntry" })] });
  });

  it("fails closed for malformed registries and entries", () => {
    const sparseEntries = [{ ruleId: "synthetic.answer.first", ruleVersion: RULE_VERSION, schema: { kind: "text" } }];
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
        entries: [{ ruleId: "Invalid Rule", ruleVersion: RULE_VERSION, schema: { kind: "text" } }]
      },
      {
        contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
        entries: [{ ruleId: "synthetic.answer.version", ruleVersion: "latest", schema: { kind: "text" } }]
      },
      {
        contractVersion: PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION,
        entries: [{ ruleId: "synthetic.answer.schema", ruleVersion: RULE_VERSION, schema: { kind: "recordCreation" } }]
      }
    ];
    invalidRegistries.forEach((registry) => expect(normalizePlanningClarificationAnswerSchemaRegistry(registry).outcome).toBe("invalid"));
  });

  it("contains exactly the ten approved production bindings in priority order", () => {
    const registry = getProductionPlanningClarificationAnswerSchemaRegistry();
    expect(registry.contractVersion).toBe(PLANNING_CLARIFICATION_ANSWER_SCHEMA_VERSION);
    expect(registry.entries).toHaveLength(10);
    expect(registry.entries.map(({ ruleId, ruleVersion }) => `${ruleId}@${ruleVersion}`)).toEqual(
      BOUND_RULE_IDS.map((ruleId) => `${ruleId}@${RULE_VERSION}`)
    );
    expect(new Set(registry.entries.map(({ ruleId, ruleVersion }) => `${ruleId}\u0000${ruleVersion}`)).size).toBe(10);
  });

  it("matches every approved schema contract exactly", () => {
    BOUND_RULE_IDS.forEach((ruleId) => expect(schemaFor(ruleId), ruleId).toEqual(EXPECTED_SCHEMAS[ruleId]));
  });

  it("normalizes the production registry and every production schema", () => {
    const registry = getProductionPlanningClarificationAnswerSchemaRegistry();
    expect(normalizePlanningClarificationAnswerSchemaRegistry(registry)).toMatchObject({
      outcome: "valid",
      registry: { entries: expect.arrayContaining(registry.entries.map(({ ruleId }) => expect.objectContaining({ ruleId }))) },
      issues: []
    });
    registry.entries.forEach(({ schema }) => expect(normalizePlanningClarificationAnswerSchema(schema).outcome).toBe("valid"));
  });

  it("keeps the generic backend absent and fails closed on all version mismatches", () => {
    expect(getProductionPlanningClarificationAnswerSchema("pp.canvas.schema.confirmation", RULE_VERSION)).toBeUndefined();
    expect(getProductionPlanningClarificationAnswerSchema("pp.canvas.schema.confirmation", "9.9.9")).toBeUndefined();
    BOUND_RULE_IDS.forEach((ruleId) => {
      expect(getProductionPlanningClarificationAnswerSchema(ruleId, "1.0.1"), ruleId).toBeUndefined();
      expect(getProductionPlanningClarificationAnswerSchema(ruleId, "0.0.0"), ruleId).toBeUndefined();
    });
  });

  it("validates internal names and rejects invalid, missing, and unexpected fields", () => {
    const row = {
      parentType: enumValue("list"),
      parentId: text("list-licences"),
      displayName: text("Licence Owner"),
      internalName: text("LicenceOwner"),
      confirmationSource: text("Approved SharePoint schema")
    };
    expect(validate("pp.sharepoint.internalnames.confirmation", rows([row]))).toMatchObject({
      outcome: "valid",
      answer: { value: [{ internalName: { value: "LicenceOwner" } }] }
    });
    expect(validate("pp.sharepoint.internalnames.confirmation", rows([{ ...row, parentType: enumValue("site") }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "enumOptionInvalid" })] });
    for (const key of ["parentId", "internalName"]) {
      expect(validate("pp.sharepoint.internalnames.confirmation", rows([without(row, key)]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
    }
    expect(validate("pp.sharepoint.internalnames.confirmation", rows([{ ...row, columnType: text("Text") }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "unexpectedField" })] });
  });

  it("validates five screen statuses and rejects N/A, incomplete, or expanded rows", () => {
    const row = {
      id: text("screen-home"),
      approvedScreenName: text("scrHome"),
      purpose: text("Shows licence status"),
      confirmationStatus: enumValue("confirmed"),
      confirmationSource: text("Architect instructions")
    };
    STATUS_OPTIONS.forEach((status) => {
      expect(validate("pp.canvas.screentargets.confirmation", rows([{ ...row, confirmationStatus: enumValue(status) }])).outcome, status).toBe("valid");
    });
    expect(validate("pp.canvas.screentargets.confirmation", rows([{ ...row, confirmationStatus: enumValue("notApplicable") }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "enumOptionInvalid" })] });
    for (const key of ["id", "confirmationSource"]) {
      expect(validate("pp.canvas.screentargets.confirmation", rows([without(row, key)]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
    }
    expect(validate("pp.canvas.screentargets.confirmation", rows([{ ...row, yamlOutputType: text("screen") }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "unexpectedField" })] });
  });

  it("validates controls and rejects missing or implementation-only fields", () => {
    const row = {
      id: text("control-save"),
      screenId: text("screen-edit"),
      approvedControlName: text("btnSave"),
      controlType: text("Button"),
      purpose: text("Saves the record"),
      formulaProperties: text("OnSelect"),
      confirmationSource: text("Approved target inventory")
    };
    expect(validate("pp.canvas.controltargets.confirmation", rows([row])).outcome).toBe("valid");
    for (const key of ["screenId", "approvedControlName", "formulaProperties"]) {
      expect(validate("pp.canvas.controltargets.confirmation", rows([without(row, key)]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
    }
    expect(validate("pp.canvas.controltargets.confirmation", rows([{ ...row, controlType: text("x".repeat(4001)) }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "invalidAnswer" })] });
    expect(validate("pp.canvas.controltargets.confirmation", rows([{ ...row, operation: text("update") }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "unexpectedField" })] });
  });

  it("validates component usage and rejects invalid, absent, lifecycle, or YAML data", () => {
    const component = (targetType: string) => ({
      approvedComponentName: text("cmpHeader"),
      purpose: text("Shared heading"),
      inputs: text("Title"),
      outputs: text("None"),
      usageTargets: rows([{ targetType: enumValue(targetType), targetId: text("screen-home") }]),
      confirmationSource: text("Approved component plan")
    });
    for (const targetType of ["screen", "control"]) {
      expect(validate("pp.canvas.components.confirmation", rows([component(targetType)])).outcome, targetType).toBe("valid");
    }
    expect(validate("pp.canvas.components.confirmation", rows([component("app")]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "enumOptionInvalid" })] });
    expect(validate("pp.canvas.components.confirmation", rows([{ ...component("screen"), usageTargets: rows([]) }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "minItemsNotMet" })] });
    expect(validate("pp.canvas.components.confirmation", { kind: "enum", value: "notApplicable" })).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "kindMismatch" })] });
    expect(validate("pp.canvas.components.confirmation", rows([{ ...component("screen"), yamlOutputType: text("component") }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "unexpectedField" })] });
  });

  it("requires all YAML fields and rejects parentType/parentId substitutes", () => {
    const answer = {
      installationResponsibility: text("Power Platform Administrator"),
      validationResponsibility: text("Solution owner"),
      yamlInstallationLocation: text("Approved screen target"),
      yamlParentRelationship: text("Installed under the approved screen parent")
    };
    expect(validate("pp.canvas.yamlplanning.confirmation", record(answer)).outcome).toBe("valid");
    for (const key of Object.keys(answer)) {
      expect(validate("pp.canvas.yamlplanning.confirmation", record(without(answer, key)))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
    }
    expect(validate("pp.canvas.yamlplanning.confirmation", record({
      ...without(answer, "yamlParentRelationship"),
      yamlParentType: text("screen"),
      yamlParentId: text("screen-home")
    }))).toMatchObject({ outcome: "invalid", issues: expect.arrayContaining([expect.objectContaining({ code: "unexpectedField" }), expect.objectContaining({ code: "missingRequiredField" })]) });
  });

  it("validates delegation and rejects missing or expanded connector data", () => {
    const answer = {
      expectedRecordCounts: text("Up to 5000 records"),
      searchRequirements: text("Prefix search on approved fields"),
      filteringRequirements: text("Filter active records"),
      sortingRequirements: text("Sort by expiry date"),
      connectorLimitations: rows([{ connectorId: text("sharepoint"), limitations: text("Confirm delegable operations") }]),
      delegationRequirements: text("Use approved delegable patterns")
    };
    expect(validate("pp.canvas.delegation.confirmation", record(answer)).outcome).toBe("valid");
    for (const key of ["expectedRecordCounts", "searchRequirements", "filteringRequirements", "sortingRequirements", "delegationRequirements"]) {
      expect(validate("pp.canvas.delegation.confirmation", record(without(answer, key)))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
    }
    expect(validate("pp.canvas.delegation.confirmation", record({ ...answer, connectorLimitations: rows([]) }))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "minItemsNotMet" })] });
    const connector = { connectorId: text("sharepoint"), limitations: text("limits") };
    for (const key of ["connectorId", "limitations"]) {
      expect(validate("pp.canvas.delegation.confirmation", record({ ...answer, connectorLimitations: rows([without(connector, key)]) }))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
    }
    expect(validate("pp.canvas.delegation.confirmation", record({ ...answer, connectorLimitations: rows([{ ...connector, connectorClassification: text("standard") }]) }))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "unexpectedField" })] });
  });

  it("accepts scoped security text, rejects booleans, and requires authority", () => {
    const permissions = ["viewPermission", "createPermission", "editPermission", "archivePermission", "restorePermission", "approvePermission", "administerPermission"] as const;
    const row: Record<string, unknown> = {
      userRole: text("Licence Editor"),
      confirmationSource: text("Approved permission matrix")
    };
    permissions.forEach((key) => { row[key] = text(`Allowed for assigned records subject to ${key} scope`); });
    expect(validate("pp.security.permissions.confirmation", rows([row])).outcome).toBe("valid");
    permissions.forEach((key) => {
      expect(validate("pp.security.permissions.confirmation", rows([{ ...row, [key]: { kind: "boolean", value: true } }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "kindMismatch" })] });
    });
    expect(validate("pp.security.permissions.confirmation", rows([without(row, "confirmationSource")]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
  });

  it("validates testing plans and rejects execution results", () => {
    const row = {
      observableOutcome: text("Archived records no longer appear in active results"),
      testPerformer: text("Business reviewer"),
      approvedEnvironment: text("Approved test environment")
    };
    expect(validate("pp.testing.outcomes.confirmation", rows([row])).outcome).toBe("valid");
    for (const key of Object.keys(row)) {
      expect(validate("pp.testing.outcomes.confirmation", rows([without(row, key)]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
    }
    expect(validate("pp.testing.outcomes.confirmation", rows([{ ...row, actualResult: text("Passed") }]))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "unexpectedField" })] });
  });

  it("requires all ALM owners and rejects implementation procedures", () => {
    const answer = {
      sourceControlOwner: text("Technical owner"),
      solutionPackagingOwner: text("Power Platform Administrator"),
      connectionReferencesOwner: text("Environment owner"),
      environmentVariablesOwner: text("Environment owner"),
      deploymentOwner: text("Release manager"),
      rollbackOwner: text("Release manager"),
      recoveryOwner: text("Support owner")
    };
    expect(validate("pp.alm.rollback.confirmation", record(answer)).outcome).toBe("valid");
    for (const key of Object.keys(answer)) {
      expect(validate("pp.alm.rollback.confirmation", record(without(answer, key)))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
    }
    expect(validate("pp.alm.rollback.confirmation", record({ ...answer, deploymentMethod: text("Pipeline") }))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "unexpectedField" })] });
  });

  it("validates release statuses and rejects incomplete, empty, N/A, or execution data", () => {
    const answer = {
      releaseApprovalResponsibility: text("Review evidence and authorize release"),
      releaseApprover: text("Named release manager"),
      requiredEvidence: stringList(["Test results"]),
      releaseApprovalStatus: enumValue("confirmed")
    };
    STATUS_OPTIONS.forEach((status) => {
      expect(validate("pp.release.approval.confirmation", record({ ...answer, releaseApprovalStatus: enumValue(status) })).outcome, status).toBe("valid");
    });
    for (const key of ["releaseApprovalResponsibility", "releaseApprover"]) {
      expect(validate("pp.release.approval.confirmation", record(without(answer, key)))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "missingRequiredField" })] });
    }
    expect(validate("pp.release.approval.confirmation", record({ ...answer, requiredEvidence: stringList([]) }))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "minItemsNotMet" })] });
    expect(validate("pp.release.approval.confirmation", record({ ...answer, releaseApprovalStatus: enumValue("notApplicable") }))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "enumOptionInvalid" })] });
    expect(validate("pp.release.approval.confirmation", record({ ...answer, executedAt: text("2026-08-21") }))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "unexpectedField" })] });
  });

  it("preserves list and aggregate fail-closed bounds", () => {
    const row = {
      observableOutcome: text("Outcome"),
      testPerformer: text("Tester"),
      approvedEnvironment: text("Test")
    };
    expect(validate("pp.testing.outcomes.confirmation", rows(Array.from({ length: 20 }, () => row))).outcome).toBe("valid");
    expect(validate("pp.testing.outcomes.confirmation", rows(Array.from({ length: 101 }, () => row)))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "invalidAnswer" })] });
    const releaseAnswer = {
      releaseApprovalResponsibility: text("Approve release"),
      releaseApprover: text("Release owner"),
      releaseApprovalStatus: enumValue("confirmed")
    };
    expect(validate("pp.release.approval.confirmation", record({
      ...releaseAnswer,
      requiredEvidence: stringList(Array.from({ length: 100 }, () => "x"))
    })).outcome).toBe("valid");
    expect(validate("pp.release.approval.confirmation", record({
      ...releaseAnswer,
      requiredEvidence: stringList(Array.from({ length: 101 }, () => "x"))
    }))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "invalidAnswer" })] });
    const oversized = Object.fromEntries([
      "sourceControlOwner",
      "solutionPackagingOwner",
      "connectionReferencesOwner",
      "environmentVariablesOwner",
      "deploymentOwner",
      "rollbackOwner",
      "recoveryOwner"
    ].map((key) => [key, text("x".repeat(2000))]));
    expect(validate("pp.alm.rollback.confirmation", record(oversized))).toMatchObject({ outcome: "invalid", issues: [expect.objectContaining({ code: "invalidAnswer" })] });
  });

  it("prevents returned production references from mutating canonical schemas", () => {
    const registry = getProductionPlanningClarificationAnswerSchemaRegistry();
    (registry.entries as unknown[]).push({});
    const schema = schemaFor("pp.canvas.screentargets.confirmation");
    if (schema.kind !== "structuredRecordList") throw new Error("Expected screen record list.");
    (schema.fields as PlanningClarificationAnswerSchemaField[]).push(textField("mutated", "Mutated"));
    const status = schema.fields.find((field) => field.key === "confirmationStatus")?.schema;
    if (status?.kind === "enum") (status.options as string[]).push("notApplicable");
    expect(getProductionPlanningClarificationAnswerSchemaRegistry().entries).toHaveLength(10);
    expect(schemaFor("pp.canvas.screentargets.confirmation")).toEqual(EXPECTED_SCHEMAS["pp.canvas.screentargets.confirmation"]);
  });

  it("keeps the registry module statically isolated from prohibited behavior", () => {
    const source = readFileSync("src/lib/planningClarificationAnswerSchemaRegistry.ts", "utf8");
    expect(source).not.toMatch(/from\s+["']\.\/projectRepository|from\s+["']\.\/storageVersion/);
    expect(source).not.toMatch(/controlledApply|readiness|generateProjectPackage|exportProjectPackage|React|localStorage|sessionStorage/i);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|randomUUID|Date\.now|new Date|crypto/i);
    expect(source).not.toMatch(/pp\.canvas\.schema\.confirmation/);
  });
});
