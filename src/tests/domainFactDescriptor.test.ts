// @ts-expect-error -- Vitest source-isolation checks run in Node; the app tsconfig excludes Node ambient types.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DOMAIN_FACT_DESCRIPTOR_CONTRACT_VERSION,
  validateDomainFactDescriptor
} from "../core/domainFactDescriptor";
import {
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS
} from "../lib/projectConfirmationProvenance";
import {
  PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS,
  getProjectConfirmationSourceRegistry
} from "../lib/projectConfirmationSourceRegistry";

const REQUIRED_KEYS = [
  "descriptorContractVersion",
  "factId",
  "domainId",
  "applicableProjectTypes",
  "accessorId",
  "valueKind",
  "normalizationVersion",
  "serializationVersion",
  "fingerprintVersion"
] as const;

function validInput(): Record<string, unknown> {
  return {
    descriptorContractVersion: DOMAIN_FACT_DESCRIPTOR_CONTRACT_VERSION,
    factId: "project-field.example.requirement",
    domainId: "example.domain",
    applicableProjectTypes: ["exampleProject"],
    accessorId: "example.requirement",
    valueKind: "text",
    normalizationVersion: "example-normalization-v1",
    serializationVersion: "example-serialization-v1",
    fingerprintVersion: "sha256-v1"
  };
}

describe("authority-free domain fact descriptor contract", () => {
  it("validates the exact text descriptor shape and returns an immutable copy", () => {
    const input = validInput();
    const projectTypes = input.applicableProjectTypes as string[];
    const validated = validateDomainFactDescriptor(input);

    expect(validated).toEqual(input);
    expect(validated).not.toBe(input);
    expect(validated?.applicableProjectTypes).not.toBe(projectTypes);
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(validated?.applicableProjectTypes)).toBe(true);
    expect(Object.keys(validated ?? {})).toEqual(REQUIRED_KEYS);

    projectTypes.push("laterMutation");
    input.factId = "mutated";
    expect(validated?.factId).toBe("project-field.example.requirement");
    expect(validated?.applicableProjectTypes).toEqual(["exampleProject"]);
  });

  it("fails closed for non-object, non-plain, and empty inputs", () => {
    for (const input of [null, undefined, [], "descriptor", 8, {}, new Date()]) {
      expect(validateDomainFactDescriptor(input)).toBeNull();
    }

    const inherited = Object.create(validInput());
    expect(validateDomainFactDescriptor(inherited)).toBeNull();

    const getterInput = validInput();
    Object.defineProperty(getterInput, "factId", { enumerable: true, get: () => "project-field.getter" });
    expect(validateDomainFactDescriptor(getterInput)).toBeNull();
  });

  it("rejects every missing required property and every unknown property", () => {
    for (const key of REQUIRED_KEYS) {
      const input = validInput();
      delete input[key];
      expect(validateDomainFactDescriptor(input)).toBeNull();
    }

    for (const key of [
      "futureMetadata",
      "validationContract",
      "currentValue",
      "valueFingerprint",
      "revisionId",
      "confirmationId",
      "supersedesConfirmationId",
      "canonicalDestinationPath"
    ]) {
      expect(validateDomainFactDescriptor({ ...validInput(), [key]: "unexpected" })).toBeNull();
    }

    const symbolKey = Symbol("unexpected");
    expect(validateDomainFactDescriptor({ ...validInput(), [symbolKey]: true })).toBeNull();
  });

  it("rejects invalid fact, domain, accessor, and representation metadata", () => {
    for (const key of [
      "factId",
      "domainId",
      "accessorId",
      "normalizationVersion",
      "serializationVersion",
      "fingerprintVersion"
    ]) {
      expect(validateDomainFactDescriptor({ ...validInput(), [key]: "" })).toBeNull();
      expect(validateDomainFactDescriptor({ ...validInput(), [key]: 1 })).toBeNull();
    }

    expect(validateDomainFactDescriptor({
      ...validInput(),
      descriptorContractVersion: "phase-future"
    })).toBeNull();
  });

  it("requires a non-empty duplicate-free list of non-empty project-type strings", () => {
    for (const applicableProjectTypes of [
      undefined,
      "exampleProject",
      [],
      [""],
      ["exampleProject", ""],
      ["exampleProject", 1],
      ["exampleProject", "exampleProject"]
    ]) {
      expect(validateDomainFactDescriptor({ ...validInput(), applicableProjectTypes })).toBeNull();
    }
  });

  it("rejects sparse project-type arrays, explicit undefined, and inherited indexes", () => {
    const oneElementHole = new Array<string>(1);
    const trailingHole = ["powerAppsCanvas"];
    trailingHole.length = 2;
    const leadingHole = new Array<string>(2);
    leadingHole[1] = "powerAppsCanvas";
    const middleHole = ["powerAppsCanvas", "placeholder", "webApplication"];
    Reflect.deleteProperty(middleHole, 1);
    const inheritedIndex = new Array<string>(1);
    const localArrayPrototype = Object.create(Array.prototype) as string[];
    Object.defineProperty(localArrayPrototype, 0, { value: "powerAppsCanvas" });
    Object.setPrototypeOf(inheritedIndex, localArrayPrototype);

    for (const applicableProjectTypes of [
      oneElementHole,
      trailingHole,
      leadingHole,
      middleHole,
      ["powerAppsCanvas", undefined],
      inheritedIndex
    ]) {
      expect(validateDomainFactDescriptor({ ...validInput(), applicableProjectTypes })).toBeNull();
    }
  });

  it("preserves valid dense project-type arrays and exact duplicate rejection", () => {
    expect(validateDomainFactDescriptor({
      ...validInput(),
      applicableProjectTypes: ["powerAppsCanvas"]
    })?.applicableProjectTypes).toEqual(["powerAppsCanvas"]);
    expect(validateDomainFactDescriptor({
      ...validInput(),
      applicableProjectTypes: ["powerAppsCanvas", "webApplication"]
    })?.applicableProjectTypes).toEqual(["powerAppsCanvas", "webApplication"]);
    expect(validateDomainFactDescriptor({
      ...validInput(),
      applicableProjectTypes: ["powerAppsCanvas", "powerAppsCanvas"]
    })).toBeNull();
  });

  it("accepts only the text value kind", () => {
    for (const valueKind of [
      undefined,
      "",
      "boolean",
      "enum",
      "stringList",
      "structuredRecord",
      "structuredRecordList",
      "recordCreation",
      "notApplicable",
      "deferred",
      "clarification"
    ]) {
      expect(validateDomainFactDescriptor({ ...validInput(), valueKind })).toBeNull();
    }
    expect(validateDomainFactDescriptor(validInput())?.valueKind).toBe("text");
  });

  it("rejects representative authority injection through exact-key validation", () => {
    const authorityValues: Record<string, unknown> = {
      sourceAuthority: "confirmed",
      canonicalAuthority: true,
      readinessAuthorized: true,
      projectionAuthorized: true,
      applyAuthorized: true,
      outputAuthorized: true
    };
    for (const [key, value] of Object.entries(authorityValues)) {
      expect(validateDomainFactDescriptor({ ...validInput(), [key]: value })).toBeNull();
    }
  });

  it("rejects executable or structured accessor values and callback properties", () => {
    for (const accessorId of [() => "value", { path: "example.requirement" }, ["example", "requirement"]]) {
      expect(validateDomainFactDescriptor({ ...validInput(), accessorId })).toBeNull();
    }
    expect(validateDomainFactDescriptor({ ...validInput(), callback: () => "value" })).toBeNull();
    expect(validateDomainFactDescriptor({ ...validInput(), accessor: () => "value" })).toBeNull();
  });

  it("validates test-only projections of all seven existing Canvas registry entries", () => {
    const registry = getProjectConfirmationSourceRegistry(PROJECT_CONFIRMATION_CONTRACT_VERSION);
    expect(registry.outcome).toBe("supported");
    if (registry.outcome !== "supported") return;

    const registrySnapshot = JSON.stringify(registry);
    const projected = registry.entries.map((entry) => validateDomainFactDescriptor({
      descriptorContractVersion: DOMAIN_FACT_DESCRIPTOR_CONTRACT_VERSION,
      factId: entry.sourceFieldId,
      domainId: "powerPlatform.canvas",
      applicableProjectTypes: entry.applicableProjectTypes,
      accessorId: entry.accessorId,
      valueKind: entry.valueKind,
      normalizationVersion: entry.normalizationVersion,
      serializationVersion: entry.serializationVersion,
      fingerprintVersion: entry.fingerprintVersion
    }));

    expect(projected).toHaveLength(7);
    expect(projected.every((entry) => entry !== null)).toBe(true);
    expect(projected.map((entry) => entry?.factId)).toEqual(PROJECT_CONFIRMATION_SOURCE_FIELD_IDS);
    expect(projected.map((entry) => entry?.accessorId)).toEqual(PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS);
    expect(JSON.stringify(registry)).toBe(registrySnapshot);
    expect(registry.entries.every((entry) => Object.keys(entry).length === 7)).toBe(true);
  });

  it("keeps the Core contract isolated and descriptors outside persisted project state", () => {
    const coreSource = readFileSync("src/core/domainFactDescriptor.ts", "utf8");
    expect(coreSource).not.toMatch(/^import/m);
    expect(coreSource).not.toMatch(/canvas|powerPlatform|planning|confirmation|projectRepository|readiness|controlledApply|generation/i);

    for (const path of [
      "src/types/project.ts",
      "src/lib/storageVersion.ts",
      "src/lib/projectRepository.ts",
      "src/lib/projectConfirmationProvenance.ts",
      "src/lib/planningProposals.ts"
    ]) {
      expect(readFileSync(path, "utf8")).not.toContain("DomainFactDescriptor");
    }
  });
});
