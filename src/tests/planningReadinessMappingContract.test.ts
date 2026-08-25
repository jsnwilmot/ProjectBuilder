import { describe, expect, it } from "vitest";
import {
  PLANNING_READINESS_MAPPING_CLASSIFICATIONS,
  PLANNING_READINESS_MAPPING_CONTRACT_VERSION,
  PLANNING_READINESS_MAPPING_MISSING_FACT_CODES,
  PLANNING_READINESS_MAPPING_REGISTRY_ID,
  PLANNING_READINESS_MAPPING_REGISTRY_VERSION,
  PLANNING_READINESS_MAPPING_STALE_INVALIDATION_REASONS,
  PLANNING_READINESS_MAPPING_VERSION,
  validatePlanningReadinessMappingDefinition,
  validatePlanningReadinessMappingRegistry,
  type PlanningReadinessMappingDefinition,
  type PlanningReadinessMappingRegistry,
  type PlanningReadinessMappingValidationIssueCode
} from "../lib/planningReadinessMappingContract";
import { getProductionPlanningReadinessMappingRegistry } from "../lib/planningReadinessMappingRegistry";

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function definitionIssueCodes(input: unknown): PlanningReadinessMappingValidationIssueCode[] {
  const result = validatePlanningReadinessMappingDefinition(input);
  return result.outcome === "invalid" ? result.issues.map((issue) => issue.code) : [];
}

function registryIssueCodes(input: unknown): PlanningReadinessMappingValidationIssueCode[] {
  const result = validatePlanningReadinessMappingRegistry(input);
  return result.outcome === "invalid" ? result.issues.map((issue) => issue.code) : [];
}

function firstDefinition(): PlanningReadinessMappingDefinition {
  return clone(getProductionPlanningReadinessMappingRegistry().definitions[0]);
}

function registry(): PlanningReadinessMappingRegistry {
  return clone(getProductionPlanningReadinessMappingRegistry());
}

describe("Planning readiness mapping contract", () => {
  it("locks the contract identities and bounded enumerations", () => {
    expect(PLANNING_READINESS_MAPPING_CONTRACT_VERSION).toBe("phase-5c.3c.3j.4");
    expect(PLANNING_READINESS_MAPPING_REGISTRY_ID).toBe("project-builder-planning-readiness-mappings");
    expect(PLANNING_READINESS_MAPPING_REGISTRY_VERSION).toBe("phase-5c.3c.3j.4");
    expect(PLANNING_READINESS_MAPPING_VERSION).toBe("1.0.0");
    expect(PLANNING_READINESS_MAPPING_CLASSIFICATIONS).toEqual([
      "exactFromAnswer",
      "exactByCanonicalMerge",
      "partialProjection",
      "unsupportedProjection"
    ]);
    expect(PLANNING_READINESS_MAPPING_STALE_INVALIDATION_REASONS).toHaveLength(9);
    expect(new Set(PLANNING_READINESS_MAPPING_MISSING_FACT_CODES).size).toBe(
      PLANNING_READINESS_MAPPING_MISSING_FACT_CODES.length
    );
  });

  it("normalizes valid metadata into a deeply frozen definition", () => {
    const result = validatePlanningReadinessMappingDefinition(firstDefinition());
    expect(result.outcome).toBe("valid");
    if (result.outcome !== "valid") return;
    expect(Object.isFrozen(result.definition)).toBe(true);
    expect(Object.isFrozen(result.definition.canonicalDestinationPaths)).toBe(true);
    expect(Object.isFrozen(result.definition.canonicalValidatorDependencyPaths)).toBe(true);
  });

  it.each([
    [null, "invalidInput"],
    [{}, "invalidMappingId"],
    [{ ...firstDefinition(), unexpected: true }, "invalidInput"],
    [{ ...firstDefinition(), mappingId: "planning map" }, "invalidMappingId"],
    [{ ...firstDefinition(), mappingVersion: "2.0.0" }, "invalidMappingVersion"],
    [{ ...firstDefinition(), ruleId: "pp.unknown.confirmation" }, "unknownRule"],
    [{ ...firstDefinition(), ruleVersion: "2.0.0" }, "ruleVersionMismatch"],
    [{ ...firstDefinition(), gateId: "security" }, "gateMismatch"],
    [{ ...firstDefinition(), classification: "exactFromAnswer" }, "classificationMismatch"],
    [{ ...firstDefinition(), answerSchemaContractVersion: "old" }, "invalidAnswerSchema"],
    [{ ...firstDefinition(), validatorId: "inventedValidator" }, "invalidValidator"],
    [{ ...firstDefinition(), missingFactCodes: ["inventedMissingFact"] }, "invalidMissingFactCode"],
    [{ ...firstDefinition(), rawAnswer: "SECRET-RAW-ANSWER" }, "invalidInput"]
  ])("fails closed for malformed definition metadata", (input, issueCode) => {
    expect(definitionIssueCodes(input)).toContain(issueCode);
  });

  it.each([
    ["architectApprovalRequired", false, "invalidApprovalPolicy"],
    ["projectionAuthorized", true, "authorityViolation"],
    ["readinessAuthorized", true, "authorityViolation"],
    ["applyAuthorized", true, "authorityViolation"],
    ["notApplicableProjectionAuthorized", true, "authorityViolation"],
    ["projectorId", "projector", "authorityViolation"]
  ])("rejects authority expansion through %s", (field, value, issueCode) => {
    expect(definitionIssueCodes({ ...firstDefinition(), [field]: value })).toContain(issueCode);
  });

  it.each([
    ["canonicalDestinationPaths", [], "invalidCanonicalPath"],
    ["canonicalDestinationPaths", ["powerPlatform.canvas.*"], "invalidCanonicalPath"],
    ["canonicalDestinationPaths", ["powerPlatform.canvas.sharePointListSchemas[]"], "invalidCanonicalPath"],
    ["canonicalDestinationPaths", ["project.powerPlatform.canvas.sharePointListSchemas"], "invalidCanonicalPath"],
    ["canonicalDestinationPaths", ["powerPlatform.canvas.sharePointListSchemas", "powerPlatform.canvas.sharePointListSchemas"], "duplicatePath"],
    ["canonicalMergePaths", ["powerPlatform.canvas.*"], "invalidCanonicalPath"],
    ["canonicalValidatorDependencyPaths", ["powerPlatform.canvas.sharePointSites[]"], "invalidCanonicalPath"],
    ["canonicalValidatorDependencyPaths", ["powerPlatform.canvas.sharePointSites", "powerPlatform.canvas.sharePointSites"], "duplicatePath"]
  ])("rejects unsafe exact-path metadata in %s", (field, value, issueCode) => {
    expect(definitionIssueCodes({ ...firstDefinition(), [field]: value })).toContain(issueCode);
  });

  it("requires destination, merge, and validator dependency categories to be disjoint", () => {
    const source = firstDefinition();
    expect(definitionIssueCodes({
      ...source,
      canonicalMergePaths: [source.canonicalDestinationPaths[0]]
    })).toContain("pathCategoryCollision");
    expect(definitionIssueCodes({
      ...source,
      canonicalValidatorDependencyPaths: [source.canonicalDestinationPaths[0]]
    })).toContain("pathCategoryCollision");
    expect(definitionIssueCodes({
      ...source,
      canonicalValidatorDependencyPaths: [source.canonicalMergePaths[0]]
    })).toContain("pathCategoryCollision");
  });

  it("requires the backend rule to use only the exact canonical backend context", () => {
    const source = firstDefinition();
    expect(definitionIssueCodes({ ...source, answerSchemaSource: "staticRule", backendContext: undefined })).toContain(
      "invalidAnswerSchema"
    );
    expect(definitionIssueCodes({
      ...source,
      backendContext: { ...source.backendContext, selectedDataSourceTypes: ["sharePointList"] }
    })).toContain("invalidBackendContext");
    expect(definitionIssueCodes({
      ...source,
      backendContext: { ...source.backendContext, backendKind: "sharePointLibrary" }
    })).toContain("invalidBackendContext");
  });

  it("rejects backend context on static-rule definitions", () => {
    const source = clone(getProductionPlanningReadinessMappingRegistry().definitions[1]);
    expect(definitionIssueCodes({
      ...source,
      backendContext: {
        projectType: "powerAppsCanvas",
        backendKind: "sharePointList",
        schemaResolverVersion: "phase-5c.3c.3j.2a.1"
      }
    })).toContain("invalidBackendContext");
  });

  it("validates the exact fail-closed registry policies", () => {
    const source = registry();
    const result = validatePlanningReadinessMappingRegistry(source);
    expect(result.outcome).toBe("valid");
    if (result.outcome !== "valid") return;
    expect(result.registry.policies).toEqual({
      existingValueConflictPolicy: {
        same: "unchanged",
        empty: "projectionCandidate",
        partial: "blocked",
        different: "blocked",
        invalid: "blocked"
      },
      canonicalMergePolicy: "explicitAllowlistOnly",
      notApplicableProjectionAuthorized: false,
      staleInvalidationReasons: PLANNING_READINESS_MAPPING_STALE_INVALIDATION_REASONS,
      legacy: "failClosed",
      duplicate: "noAuthorityTransfer",
      archiveRestore: "fullRevalidationRequired",
      privacy: "metadataOnly"
    });
  });

  it("rejects policy drift, duplicate identities, and incomplete rule coverage", () => {
    const policyDrift = registry();
    policyDrift.policies.existingValueConflictPolicy.different = "unchanged" as "blocked";
    expect(registryIssueCodes(policyDrift)).toContain("invalidPolicy");

    const duplicateId = registry();
    duplicateId.definitions = duplicateId.definitions.map((entry, index) => index === 1
      ? { ...entry, mappingId: duplicateId.definitions[0].mappingId }
      : entry);
    expect(registryIssueCodes(duplicateId)).toContain("duplicateMappingId");

    const missingRule = registry();
    missingRule.definitions = missingRule.definitions.slice(0, -1);
    expect(registryIssueCodes(missingRule)).toEqual(expect.arrayContaining(["invalidRegistry"]));
  });

  it("rejects duplicate rule contexts even when mapping IDs differ", () => {
    const source = registry();
    source.definitions = source.definitions.map((entry, index) => index === 1
      ? {
          ...source.definitions[0],
          mappingId: "planning-map.pp.canvas.schema.confirmation.sharepoint-list-copy"
        }
      : entry);
    expect(registryIssueCodes(source)).toEqual(
      expect.arrayContaining(["duplicateRuleContext", "incompleteRuleCoverage"])
    );
  });
});
