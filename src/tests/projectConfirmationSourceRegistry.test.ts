// @ts-expect-error -- Vitest source-isolation checks run in Node; the app tsconfig excludes Node ambient types.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_PROJECT_TYPE_VALUES } from "../data/projectTypes";
import {
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
  PROJECT_CONFIRMATION_NORMALIZATION_VERSION,
  PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS,
  PROJECT_CONFIRMATION_VALUE_KIND
} from "../lib/projectConfirmationProvenance";
import {
  PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS,
  classifyProjectConfirmationSourceApplicability,
  getApplicableProjectConfirmationSourceFieldIds,
  getProjectConfirmationSourceRegistry
} from "../lib/projectConfirmationSourceRegistry";

const EXPECTED_SOURCE_IDS = [
  "project-field.power-platform.canvas.full-screen-yaml-required",
  "project-field.power-platform.canvas.control-level-yaml-required",
  "project-field.power-platform.canvas.container-yaml-required",
  "project-field.power-platform.canvas.component-yaml-required",
  "project-field.power-platform.canvas.pa-yaml-source-required",
  "project-field.power-platform.canvas.expected-installation-method",
  "project-field.power-platform.canvas.existing-source-availability"
] as const;

const EXPECTED_ACCESSOR_IDS = [
  "canvas.fullScreenYamlRequired",
  "canvas.controlLevelYamlRequired",
  "canvas.containerYamlRequired",
  "canvas.componentYamlRequired",
  "canvas.paYamlSourceRequired",
  "canvas.expectedInstallationMethod",
  "canvas.existingSourceAvailability"
] as const;

describe("project confirmation source registry", () => {
  it("contains exactly the seven approved immutable source and accessor identities", () => {
    const resolution = getProjectConfirmationSourceRegistry(PROJECT_CONFIRMATION_CONTRACT_VERSION);
    expect(resolution.outcome).toBe("supported");
    if (resolution.outcome !== "supported") return;
    expect(resolution.entries).toHaveLength(7);
    expect(resolution.entries.map((entry) => entry.sourceFieldId)).toEqual(EXPECTED_SOURCE_IDS);
    expect(resolution.entries.map((entry) => entry.accessorId)).toEqual(EXPECTED_ACCESSOR_IDS);
    expect(PROJECT_CONFIRMATION_SOURCE_FIELD_IDS).toEqual(EXPECTED_SOURCE_IDS);
    expect(PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS).toEqual(EXPECTED_ACCESSOR_IDS);
    expect(Object.isFrozen(resolution)).toBe(true);
    expect(Object.isFrozen(resolution.entries)).toBe(true);
    expect(resolution.entries.every((entry) => Object.isFrozen(entry))).toBe(true);
    expect(resolution.entries.every((entry) => Object.isFrozen(entry.applicableProjectTypes))).toBe(true);
  });

  it("locks exact scalar metadata on every registry entry", () => {
    const resolution = getProjectConfirmationSourceRegistry(PROJECT_CONFIRMATION_CONTRACT_VERSION);
    expect(resolution.outcome).toBe("supported");
    if (resolution.outcome !== "supported") return;
    for (const entry of resolution.entries) {
      expect(entry.applicableProjectTypes).toEqual(["powerAppsCanvas"]);
      expect(entry.valueKind).toBe(PROJECT_CONFIRMATION_VALUE_KIND);
      expect(entry.normalizationVersion).toBe(PROJECT_CONFIRMATION_NORMALIZATION_VERSION);
      expect(entry.serializationVersion).toBe(PROJECT_CONFIRMATION_SERIALIZATION_VERSION);
      expect(entry.fingerprintVersion).toBe(PROJECT_CONFIRMATION_FINGERPRINT_VERSION);
      expect(Object.keys(entry).sort()).toEqual([
        "accessorId",
        "applicableProjectTypes",
        "fingerprintVersion",
        "normalizationVersion",
        "serializationVersion",
        "sourceFieldId",
        "valueKind"
      ]);
    }
  });

  it("returns seven applicable sources only for powerAppsCanvas", () => {
    expect(ALL_PROJECT_TYPE_VALUES).toHaveLength(17);
    for (const projectType of ALL_PROJECT_TYPE_VALUES) {
      const result = getApplicableProjectConfirmationSourceFieldIds(
        PROJECT_CONFIRMATION_CONTRACT_VERSION,
        projectType
      );
      expect(result.outcome).toBe("resolved");
      expect(result.sourceFieldIds).toEqual(
        projectType === "powerAppsCanvas" ? EXPECTED_SOURCE_IDS : []
      );
      expect(Object.isFrozen(result.sourceFieldIds)).toBe(true);
    }
  });

  it("fails safely for unknown project types", () => {
    expect(getApplicableProjectConfirmationSourceFieldIds(
      PROJECT_CONFIRMATION_CONTRACT_VERSION,
      "futureProjectType"
    )).toEqual({
      outcome: "invalidProjectType",
      contractVersion: null,
      projectType: null,
      sourceFieldIds: []
    });
  });

  it("fails closed for unknown contract versions without returning the current registry", () => {
    const registry = getProjectConfirmationSourceRegistry("phase-future");
    expect(registry).toEqual({
      outcome: "unsupportedContractVersion",
      contractVersion: null,
      entries: []
    });
    expect(getApplicableProjectConfirmationSourceFieldIds(
      "phase-future",
      "powerAppsCanvas"
    )).toEqual({
      outcome: "unsupportedContractVersion",
      contractVersion: null,
      projectType: null,
      sourceFieldIds: []
    });
    expect(registry).not.toHaveProperty("registryVersion");
  });

  it("distinguishes known historical non-applicability from unknown sources", () => {
    const sourceId = EXPECTED_SOURCE_IDS[0];
    expect(classifyProjectConfirmationSourceApplicability(
      PROJECT_CONFIRMATION_CONTRACT_VERSION,
      "powerAppsCanvas",
      sourceId
    )).toBe("applicable");
    expect(classifyProjectConfirmationSourceApplicability(
      PROJECT_CONFIRMATION_CONTRACT_VERSION,
      "webApplication",
      sourceId
    )).toBe("knownButNotApplicable");
    expect(classifyProjectConfirmationSourceApplicability(
      PROJECT_CONFIRMATION_CONTRACT_VERSION,
      "webApplication",
      "project-field.unknown"
    )).toBe("unknownSource");
  });

  it("excludes yamlStatus, validationResponsibility, callbacks, and executable traversal", () => {
    const registry = getProjectConfirmationSourceRegistry(PROJECT_CONFIRMATION_CONTRACT_VERSION);
    expect(registry.outcome).toBe("supported");
    const serialized = JSON.stringify(registry);
    expect(serialized).not.toContain("yamlStatus");
    expect(serialized).not.toContain("validationResponsibility");
    expect(serialized).not.toContain("callback");
    expect(serialized).not.toContain("projector");
    expect(serialized).not.toContain("authority");
    if (registry.outcome !== "supported") return;
    expect(registry.entries.some((entry) =>
      Object.values(entry).some((value) => typeof value === "function")
    )).toBe(false);
  });

  it("limits production consumers to the approved Storage 7 persistence boundary", () => {
    const excluded = new Set([
      "projectConfirmationProvenance.ts",
      "projectConfirmationSourceRegistry.ts"
    ]);
    const consumers = readdirSync("src/lib")
      .filter((fileName: string) => fileName.endsWith(".ts") && !excluded.has(fileName))
      .filter((fileName: string) => {
        const source = readFileSync(`src/lib/${fileName}`, "utf8");
        return source.includes("projectConfirmationProvenance") ||
          source.includes("projectConfirmationSourceRegistry");
      });
    expect(consumers.sort()).toEqual([
      "createProject.ts",
      "projectConfirmationQuarantine.ts",
      "projectConfirmationRevisionReconciliation.ts",
      "projectConfirmationRuntime.ts",
      "projectConfirmationSourceAccessors.ts",
      "projectConfirmationTransaction.ts",
      "projectConfirmationValueFingerprint.ts",
      "projectRepository.ts",
      "storageVersion.ts"
    ]);

    const projectTypes = readFileSync("src/types/project.ts", "utf8");
    const storage = readFileSync("src/lib/storageVersion.ts", "utf8");
    const repository = readFileSync("src/lib/projectRepository.ts", "utf8");
    expect(projectTypes).toContain("confirmationProvenance");
    expect(storage).toContain("confirmationProvenance");
    expect(repository).toContain("confirmationProvenance");
    expect(consumers.some((fileName: string) => /planning|readiness|mapping/i.test(fileName))).toBe(false);
  });
});
