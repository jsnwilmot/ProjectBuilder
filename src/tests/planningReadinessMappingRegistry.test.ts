// @ts-expect-error -- Vitest runs source-isolation checks in Node; the app tsconfig excludes Node ambient types.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import { getProductionPlanningClarificationAnswerSchema } from "../lib/planningClarificationAnswerSchemaRegistry";
import { resolveProductionPlanningClarificationAnswerSchema } from "../lib/planningClarificationAnswerSchemaResolver";
import { analyzePlanningControlledApplyCandidate } from "../lib/planningControlledApplyContract";
import { isPlanningStatusOutputEligible, isPlanningStatusReadinessEligible } from "../lib/planningProposals";
import { PLANNING_READINESS_MAPPING_CANONICAL_PATHS } from "../lib/planningReadinessMappingContract";
import {
  calculateInternalNameGate,
  calculateSharePointSchemaGate,
  createDefaultSharePointColumn,
  createDefaultSharePointLibrary,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import {
  getProductionPlanningReadinessMapping,
  getProductionPlanningReadinessMappingRegistry,
  getProductionPlanningReadinessMappings,
  validateProductionPlanningReadinessMappingRegistry
} from "../lib/planningReadinessMappingRegistry";
import { getActivePlanningRulesForProjectType } from "../lib/planningRules";

const EXPECTED_MAPPING_IDS = [
  "planning-map.pp.canvas.schema.confirmation.sharepoint-list",
  "planning-map.pp.sharepoint.internalnames.confirmation",
  "planning-map.pp.canvas.screentargets.confirmation",
  "planning-map.pp.canvas.controltargets.confirmation",
  "planning-map.pp.canvas.components.confirmation",
  "planning-map.pp.canvas.yamlplanning.confirmation",
  "planning-map.pp.canvas.delegation.confirmation",
  "planning-map.pp.security.permissions.confirmation",
  "planning-map.pp.testing.outcomes.confirmation",
  "planning-map.pp.alm.rollback.confirmation",
  "planning-map.pp.release.approval.confirmation"
] as const;

const BACKEND_DESTINATIONS = [
  "powerPlatform.canvas.sharePointSiteUrl",
  "powerPlatform.canvas.sharePointSiteTitle",
  "powerPlatform.canvas.sharePointSiteOwner",
  "powerPlatform.canvas.sharePointAccessStatus",
  "powerPlatform.canvas.sharePointListSchemas",
  "powerPlatform.canvas.sharePointColumnSchemas"
] as const;

const BACKEND_MERGES = [
  "powerPlatform.canvas.primaryDataSourceType",
  "powerPlatform.canvas.selectedDataSourceTypes"
] as const;

const BACKEND_DEPENDENCIES = [
  "powerPlatform.canvas.sharePointSites",
  "powerPlatform.canvas.sharePointLibrarySchemas"
] as const;

const NEVER_BACKEND_DESTINATIONS = [
  "powerPlatform.canvas.sharePointEnvironment",
  "powerPlatform.canvas.schemaStatus",
  "powerPlatform.canvas.sharePointLibrarySchemas",
  "powerPlatform.canvas.sharePointSites"
] as const;

describe("production Planning readiness mapping registry", () => {
  it("is valid, immutable, and complete for all eleven active Canvas rules", () => {
    const registry = getProductionPlanningReadinessMappingRegistry();
    const validation = validateProductionPlanningReadinessMappingRegistry();
    expect(validation.outcome).toBe("valid");
    expect(registry.registryId).toBe("project-builder-planning-readiness-mappings");
    expect(registry.registryVersion).toBe("phase-5c.3c.3j.4");
    expect(registry.contractVersion).toBe("phase-5c.3c.3j.4");
    expect(registry.definitions.map((entry) => entry.mappingId)).toEqual(EXPECTED_MAPPING_IDS);
    expect(new Set(registry.definitions.map((entry) => entry.mappingId)).size).toBe(11);
    expect(registry.definitions.map((entry) => entry.ruleId)).toEqual(
      getActivePlanningRulesForProjectType("powerAppsCanvas").map((rule) => rule.ruleId)
    );
    expect(Object.isFrozen(registry)).toBe(true);
    expect(Object.isFrozen(registry.policies)).toBe(true);
    expect(Object.isFrozen(registry.definitions)).toBe(true);
    expect(registry.definitions.every((entry) => Object.isFrozen(entry))).toBe(true);
    expect(getProductionPlanningReadinessMappings()).toBe(registry.definitions);
  });

  it("locks classification totals and zero mapping authority", () => {
    const definitions = getProductionPlanningReadinessMappings();
    const totals = Object.fromEntries(
      ["exactFromAnswer", "exactByCanonicalMerge", "partialProjection", "unsupportedProjection"]
        .map((classification) => [classification, definitions.filter((entry) => entry.classification === classification).length])
    );
    expect(totals).toEqual({
      exactFromAnswer: 0,
      exactByCanonicalMerge: 0,
      partialProjection: 8,
      unsupportedProjection: 3
    });
    for (const entry of definitions) {
      expect(entry.mappingVersion).toBe("1.0.0");
      expect(entry.architectApprovalRequired).toBe(true);
      expect(entry.projectionAuthorized).toBe(false);
      expect(entry.readinessAuthorized).toBe(false);
      expect(entry.applyAuthorized).toBe(false);
      expect(entry.projectorId).toBeNull();
      expect(entry.notApplicableProjectionAuthorized).toBe(false);
    }
  });

  it("records the corrected SharePoint List destinations, merges, and validator dependencies", () => {
    const mapping = getProductionPlanningReadinessMapping("pp.canvas.schema.confirmation");
    expect(mapping).toBeDefined();
    expect(mapping?.answerSchemaSource).toBe("backendSpecific");
    expect(mapping?.backendContext).toEqual({
      projectType: "powerAppsCanvas",
      backendKind: "sharePointList",
      schemaResolverVersion: "phase-5c.3c.3j.2a.1"
    });
    expect(mapping?.canonicalDestinationPaths).toEqual(BACKEND_DESTINATIONS);
    expect(mapping?.canonicalMergePaths).toEqual(BACKEND_MERGES);
    expect(mapping?.canonicalValidatorDependencyPaths).toEqual(BACKEND_DEPENDENCIES);
    expect(mapping?.canonicalDestinationPaths).not.toEqual(expect.arrayContaining([...NEVER_BACKEND_DESTINATIONS]));
    expect(mapping?.missingFactCodes).toEqual(expect.arrayContaining([
      "siteIdentityMissing",
      "siteOwnerMissing",
      "siteAccessStatusMissing",
      "listIdentityMissing",
      "columnSchemaMissing",
      "columnIdentityMissing",
      "columnTypeMissing",
      "parentBindingMissing",
      "controlledStatusMissing",
      "internalNameConfirmationMissing"
    ]));
  });

  it("records only the structured SharePoint column destination for internal-name evidence", () => {
    const mapping = getProductionPlanningReadinessMapping("pp.sharepoint.internalnames.confirmation");
    expect(mapping?.canonicalDestinationPaths).toEqual([
      "powerPlatform.canvas.sharePointColumnSchemas"
    ]);
    expect(mapping?.canonicalDestinationPaths).not.toContain("powerPlatform.canvas.internalNameStatus");
    expect(mapping?.canonicalMergePaths).toEqual([
      "powerPlatform.canvas.sharePointListSchemas",
      "powerPlatform.canvas.sharePointLibrarySchemas"
    ]);
    expect(mapping?.canonicalValidatorDependencyPaths).toEqual([
      "powerPlatform.canvas.primaryDataSourceType",
      "powerPlatform.canvas.selectedDataSourceTypes"
    ]);
    expect(mapping?.missingFactCodes).toEqual(expect.arrayContaining([
      "columnIdentityMissing",
      "columnTypeMissing",
      "parentBindingMissing",
      "controlledStatusMissing",
      "internalNameConfirmationMissing"
    ]));
  });

  it("keeps every definition path category exact, unique, and disjoint", () => {
    const registryPaths = new Set<string>();
    for (const entry of getProductionPlanningReadinessMappings()) {
      const destinations = new Set(entry.canonicalDestinationPaths);
      const merges = new Set(entry.canonicalMergePaths);
      const dependencies = new Set(entry.canonicalValidatorDependencyPaths);
      expect(destinations.size).toBe(entry.canonicalDestinationPaths.length);
      expect(merges.size).toBe(entry.canonicalMergePaths.length);
      expect(dependencies.size).toBe(entry.canonicalValidatorDependencyPaths.length);
      expect([...destinations].some((path) => merges.has(path) || dependencies.has(path))).toBe(false);
      expect([...merges].some((path) => dependencies.has(path))).toBe(false);
      expect([...destinations, ...merges, ...dependencies].every((path) =>
        /^powerPlatform\.(canvas|common)\.[A-Za-z][A-Za-z0-9]*$/.test(path)
      )).toBe(true);
      expect([...destinations, ...merges, ...dependencies].every((path) =>
        PLANNING_READINESS_MAPPING_CANONICAL_PATHS.includes(path)
      )).toBe(true);
      [...destinations, ...merges, ...dependencies].forEach((path) => registryPaths.add(path));
    }
    expect([...registryPaths].sort()).toEqual([...PLANNING_READINESS_MAPPING_CANONICAL_PATHS].sort());
  });

  it("records only validator-proven dependencies on the other ten mappings", () => {
    const dependencyPaths = Object.fromEntries(
      getProductionPlanningReadinessMappings().slice(1).map((entry) => [entry.ruleId, entry.canonicalValidatorDependencyPaths])
    );
    expect(dependencyPaths).toEqual({
      "pp.sharepoint.internalnames.confirmation": [
        "powerPlatform.canvas.primaryDataSourceType",
        "powerPlatform.canvas.selectedDataSourceTypes"
      ],
      "pp.canvas.screentargets.confirmation": [
        "powerPlatform.canvas.primaryDataSourceType",
        "powerPlatform.canvas.selectedDataSourceTypes",
        "powerPlatform.canvas.primaryConnectorId",
        "powerPlatform.canvas.secondaryConnectorIds"
      ],
      "pp.canvas.controltargets.confirmation": [
        "powerPlatform.canvas.primaryDataSourceType",
        "powerPlatform.canvas.selectedDataSourceTypes",
        "powerPlatform.canvas.primaryConnectorId",
        "powerPlatform.canvas.secondaryConnectorIds"
      ],
      "pp.canvas.components.confirmation": [],
      "pp.canvas.yamlplanning.confirmation": [],
      "pp.canvas.delegation.confirmation": [
        "powerPlatform.canvas.sharePointListSchemas",
        "powerPlatform.canvas.dataverseTableSchemas"
      ],
      "pp.security.permissions.confirmation": [],
      "pp.testing.outcomes.confirmation": [],
      "pp.alm.rollback.confirmation": [],
      "pp.release.approval.confirmation": []
    });
  });

  it("binds ten static schemas and one canonical SharePoint List backend schema", () => {
    const definitions = getProductionPlanningReadinessMappings();
    const staticMappings = definitions.filter((entry) => entry.answerSchemaSource === "staticRule");
    expect(staticMappings).toHaveLength(10);
    expect(definitions.filter((entry) => entry.answerSchemaSource === "backendSpecific")).toHaveLength(1);
    for (const entry of staticMappings) {
      expect(getProductionPlanningClarificationAnswerSchema(entry.ruleId, entry.ruleVersion)).toBeDefined();
    }
    expect(resolveProductionPlanningClarificationAnswerSchema(
      "pp.canvas.schema.confirmation",
      "1.0.0",
      {
        projectType: "powerAppsCanvas",
        primaryDataSourceType: "sharePointList",
        selectedDataSourceTypes: []
      }
    )).toMatchObject({
      state: "available",
      schemaSource: "backendSpecific",
      backendKind: "sharePointList"
    });
  });

  it("matches the current structured SharePoint validator boundary", () => {
    const project = createProject({
      identity: { id: "mapping-validator-project", projectName: "Mapping validator project" },
      intake: { appType: "powerAppsCanvas" },
      now: "2026-08-25T12:00:00.000Z"
    });
    const canvas = project.powerPlatform!.canvas!;
    canvas.primaryDataSourceType = "sharePointList";
    canvas.selectedDataSourceTypes = [];
    canvas.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/operations";
    canvas.sharePointSiteTitle = "Operations";
    canvas.sharePointSiteOwner = "Operations Owner";
    canvas.sharePointAccessStatus = "confirmed";
    canvas.sharePointEnvironment = "";
    canvas.schemaStatus = "missingInformation";
    canvas.internalNameStatus = "missingInformation";
    canvas.sharePointListSchemas = [createDefaultSharePointList({
      id: "requests",
      displayName: "Requests",
      purpose: "Track requests",
      expectedRecordCount: "500",
      confirmationStatus: "confirmed",
      confirmationSource: "Authoritative schema"
    })];
    canvas.sharePointColumnSchemas = [createDefaultSharePointColumn({
      id: "request-title",
      parentType: "list",
      parentId: "requests",
      displayName: "Title",
      internalName: "Title",
      columnType: "Single line of text",
      confirmationStatus: "confirmed",
      confirmationSource: "Authoritative schema"
    })];

    expect(calculateInternalNameGate(project)).toBe("confirmed");
    expect(calculateSharePointSchemaGate(project)).toBe("confirmed");

    canvas.sharePointLibrarySchemas = [createDefaultSharePointLibrary({
      id: "documents",
      displayName: "Documents",
      purpose: "Store request documents",
      confirmationStatus: "confirmed",
      confirmationSource: "Authoritative schema"
    })];
    expect(calculateSharePointSchemaGate(project)).toBe("missingInformation");

    canvas.sharePointColumnSchemas.push(createDefaultSharePointColumn({
      id: "document-title",
      parentType: "library",
      parentId: "documents",
      displayName: "Title",
      internalName: "Title",
      columnType: "Single line of text",
      confirmationStatus: "confirmed",
      confirmationSource: "Authoritative schema"
    }));
    expect(calculateSharePointSchemaGate(project)).toBe("confirmed");
  });

  it("does not grant readiness, output, or controlled Apply eligibility", () => {
    expect(isPlanningStatusReadinessEligible("Confirmed")).toBe(false);
    expect(isPlanningStatusReadinessEligible("Not Applicable")).toBe(false);
    expect(isPlanningStatusOutputEligible("Confirmed")).toBe(false);
    expect(isPlanningStatusOutputEligible("Not Applicable")).toBe(false);
    expect(analyzePlanningControlledApplyCandidate(null)).toMatchObject({
      outcome: "blocked",
      issues: [{ code: "invalidInput" }]
    });
    expect(getActivePlanningRulesForProjectType("powerAppsCanvas").every((rule) =>
      rule.target.kind === "readinessRequirement" && rule.target.operation === "clarificationOnly"
    )).toBe(true);
    const controlledApplySource = readFileSync("src/lib/planningControlledApplyContract.ts", "utf8");
    expect(controlledApplySource).toContain('proposal.target.kind !== "projectField"');
    expect(controlledApplySource).toContain('proposal.target.operation !== "setValue"');
    expect(controlledApplySource).toContain('proposal.value.kind !== "text"');
  });

  it("has only the approved evidence evaluator consumer and no executable projector references", () => {
    const sourceFiles = readdirSync("src/lib").filter((name: string) => name.endsWith(".ts"));
    const consumers = sourceFiles
      .filter((name: string) => ![
        "planningReadinessMappingContract.ts",
        "planningReadinessMappingRegistry.ts"
      ].includes(name))
      .filter((name: string) => readFileSync(`src/lib/${name}`, "utf8").includes("planningReadinessMapping"));
    expect(consumers).toEqual(["planningCanonicalFactEvidence.ts"]);

    const registrySource = readFileSync("src/lib/planningReadinessMappingRegistry.ts", "utf8");
    expect(registrySource).not.toMatch(/projectorId:\s*["']/);
    expect(registrySource).not.toMatch(/projectionAuthorized:\s*true/);
    expect(registrySource).not.toMatch(/readinessAuthorized:\s*true/);
    expect(registrySource).not.toMatch(/applyAuthorized:\s*true/);
  });

  it("contains metadata only and does not capture project, answer, or TTI source content", () => {
    const serialized = JSON.stringify(getProductionPlanningReadinessMappingRegistry());
    expect(serialized).not.toContain("SECRET-ANSWER-5C3C3J4");
    expect(serialized).not.toContain("TTI Software Licence Tracker");
    expect(serialized).not.toContain("TTI-SoftwareTitles");
    expect(serialized).not.toContain("TTI-SoftwareLicences");
    expect(serialized).not.toContain("TTI-SoftwareUsers");
    expect(serialized).not.toContain("tti.sharepoint.com");
    expect(serialized).not.toContain("Jason");
    expect(serialized).not.toMatch(/confirmationSource\s*:/);
    expect(serialized).not.toMatch(/answerValue\s*:/);
    expect(serialized).not.toMatch(/decisionReason\s*:/);
    expect(serialized).not.toMatch(/sourceLocator\s*:/);
  });
});
