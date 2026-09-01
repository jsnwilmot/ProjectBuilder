// @ts-expect-error -- Vitest executes in Node while the app tsconfig excludes Node ambient types.
import { webcrypto } from "node:crypto";
// @ts-expect-error -- Golden architecture source scans run in Vitest's Node environment.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_PROJECT_TYPE_VALUES, PROJECT_TYPE_PRESETS, PROJECT_TYPE_VALUES } from "../data/projectTypes";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import {
  PLANNING_SOURCE_AUTHORITIES,
  PLANNING_SOURCE_TYPES,
  isPlanningStatusOutputEligible,
  isPlanningStatusReadinessEligible
} from "../lib/planningProposals";
import { analyzePlanningControlledApplyCandidate } from "../lib/planningControlledApplyContract";
import { derivePlanningCanonicalFactEvidenceCandidates } from "../lib/planningCanonicalFactEvidence";
import {
  getProductionPlanningReadinessMapping,
  getProductionPlanningReadinessMappings,
  validateProductionPlanningReadinessMappingRegistry
} from "../lib/planningReadinessMappingRegistry";
import { getActivePlanningRulesForProjectType, validatePlanningRuleRegistry } from "../lib/planningRules";
import {
  PROJECT_CONFIRMATION_ACTION_ORIGIN,
  PROJECT_CONFIRMATION_ASSURANCE_TYPE,
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
  PROJECT_CONFIRMATION_NORMALIZATION_VERSION,
  PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS,
  PROJECT_CONFIRMATION_VALUE_KIND
} from "../lib/projectConfirmationProvenance";
import { readProjectConfirmationSourceValue } from "../lib/projectConfirmationSourceAccessors";
import {
  PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS,
  getApplicableProjectConfirmationSourceFieldIds,
  getProjectConfirmationSourceRegistry
} from "../lib/projectConfirmationSourceRegistry";
import {
  analyzeProjectConfirmationRevisionReconciliation,
  materializeProjectConfirmationRevisionReconciliation
} from "../lib/projectConfirmationRevisionReconciliation";
import {
  PROJECT_CONFIRMATION_SEMANTIC_STATEMENT
} from "../lib/projectConfirmationTransaction";
import {
  STORAGE_KEY,
  archiveProject,
  confirmProjectFields,
  createProject,
  duplicateProject,
  loadStorageState,
  restoreProject,
  saveStorageState,
  updateProjectPowerPlatform
} from "../lib/projectRepository";
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import type { ProjectConfirmationSourceFieldId } from "../lib/projectConfirmationProvenance";
import type { ProjectRecord } from "../types/project";
import {
  GOLDEN_ACTION_A,
  GOLDEN_ACTION_B,
  GOLDEN_ACTION_C,
  GOLDEN_TIMESTAMP_A,
  GOLDEN_TIMESTAMP_B,
  GoldenControlledReadStorage,
  GoldenMemoryStorage,
  confirmationRuntime,
  createGoldenProject,
  goldenConfirmationRequestFor,
  goldenEvent,
  goldenEventsFor,
  goldenUuid,
  persistedGoldenProject,
  persistedGoldenState,
  rawGoldenProvenance,
  seedGoldenStorage7,
  sequenceRuntime
} from "./helpers/projectBuilderCoreExtractionGolden";

const EXPECTED_CANVAS_SOURCE_IDS = [
  "project-field.power-platform.canvas.full-screen-yaml-required",
  "project-field.power-platform.canvas.control-level-yaml-required",
  "project-field.power-platform.canvas.container-yaml-required",
  "project-field.power-platform.canvas.component-yaml-required",
  "project-field.power-platform.canvas.pa-yaml-source-required",
  "project-field.power-platform.canvas.expected-installation-method",
  "project-field.power-platform.canvas.existing-source-availability"
] as const;

const EXPECTED_CANVAS_ACCESSOR_IDS = [
  "canvas.fullScreenYamlRequired",
  "canvas.controlLevelYamlRequired",
  "canvas.containerYamlRequired",
  "canvas.componentYamlRequired",
  "canvas.paYamlSourceRequired",
  "canvas.expectedInstallationMethod",
  "canvas.existingSourceAvailability"
] as const;

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Project Builder Core extraction Canvas golden reference", () => {
  it("freezes the extraction baseline project-type inventory without authorizing expansion", () => {
    expect(ALL_PROJECT_TYPE_VALUES).toHaveLength(17);
    expect(PROJECT_TYPE_VALUES).toHaveLength(16);
    expect(PROJECT_TYPE_PRESETS.filter((preset) => preset.isLegacy || preset.selectable === false)
      .map((preset) => preset.value)).toEqual(["microsoft365"]);
    expect(PROJECT_TYPE_VALUES).not.toContain("microsoft365");
    expect(PROJECT_TYPE_VALUES).toContain("powerAppsCanvas");
    expect(PROJECT_TYPE_VALUES).toContain("webApplication");
    expect(getActivePlanningRulesForProjectType("powerAppsCanvas")).toHaveLength(11);
    expect(getActivePlanningRulesForProjectType("webApplication")).toHaveLength(0);
  });

  it("freezes Canvas confirmation registry identities, accessors, text-only values, and zero non-Canvas applicability", () => {
    const registry = getProjectConfirmationSourceRegistry(PROJECT_CONFIRMATION_CONTRACT_VERSION);
    expect(registry.outcome).toBe("supported");
    if (registry.outcome !== "supported") return;

    expect(PROJECT_CONFIRMATION_SOURCE_FIELD_IDS).toEqual(EXPECTED_CANVAS_SOURCE_IDS);
    expect(PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS).toEqual(EXPECTED_CANVAS_ACCESSOR_IDS);
    expect(registry.entries).toHaveLength(7);
    expect(registry.entries.map((entry) => entry.sourceFieldId)).toEqual(EXPECTED_CANVAS_SOURCE_IDS);
    expect(registry.entries.map((entry) => entry.accessorId)).toEqual(EXPECTED_CANVAS_ACCESSOR_IDS);
    expect(registry.entries.every((entry) => entry.applicableProjectTypes.join() === "powerAppsCanvas")).toBe(true);
    expect(registry.entries.every((entry) => entry.valueKind === "text")).toBe(true);
    expect(PROJECT_CONFIRMATION_VALUE_KIND).toBe("text");
    expect(PROJECT_CONFIRMATION_NORMALIZATION_VERSION).toBe("normalized-project-string-v1");
    expect(PROJECT_CONFIRMATION_SERIALIZATION_VERSION).toBe("canonical-text-json-v1");
    expect(PROJECT_CONFIRMATION_FINGERPRINT_VERSION).toBe("sha256-v1");
    expect(PROJECT_CONFIRMATION_CONTRACT_VERSION).toBe("phase-5c.3c.3j.6b.3r");
    expect(PLANNING_SOURCE_AUTHORITIES).toEqual(["confirmed", "approved", "informational"]);
    expect(PLANNING_SOURCE_TYPES).toContain("confirmedIntake");

    for (const projectType of ALL_PROJECT_TYPE_VALUES) {
      const applicability = getApplicableProjectConfirmationSourceFieldIds(PROJECT_CONFIRMATION_CONTRACT_VERSION, projectType);
      expect(applicability.outcome).toBe("resolved");
      expect(applicability.sourceFieldIds).toEqual(projectType === "powerAppsCanvas" ? EXPECTED_CANVAS_SOURCE_IDS : []);
    }

    const canvasProject = createGoldenProject("powerAppsCanvas", "accessor-canvas");
    const webProject = createGoldenProject("webApplication", "accessor-web");
    PROJECT_CONFIRMATION_SOURCE_ACCESSOR_IDS.forEach((accessorId, index) => {
      expect(readProjectConfirmationSourceValue(canvasProject, accessorId)).toBe(`Canvas value ${index + 1}`);
      expect(readProjectConfirmationSourceValue(webProject, accessorId)).toBeNull();
    });
  });

  it("freezes initial revision sets and Canvas/non-Canvas reconciliation semantics", () => {
    const canvas = createGoldenProject("powerAppsCanvas", "revision-canvas", 10);
    const initialRevisionIds = Object.values(canvas.confirmationProvenance!.fieldRevisions).map((revision) => revision!.revisionId);
    expect(initialRevisionIds).toHaveLength(7);
    expect(canvas.confirmationProvenance!.confirmationEvents).toEqual([]);
    expect(createGoldenProject("webApplication", "revision-web").confirmationProvenance!.fieldRevisions).toEqual({});

    const historicalEvent = goldenEvent(canvas);
    const withHistory: ProjectRecord = {
      ...canvas,
      confirmationProvenance: {
        ...canvas.confirmationProvenance!,
        confirmationEvents: [historicalEvent]
      }
    };
    const awayCandidate: ProjectRecord = {
      ...withHistory,
      intake: { ...withHistory.intake, appType: "webApplication" }
    };
    const away = analyzeProjectConfirmationRevisionReconciliation(withHistory, awayCandidate);
    expect(away).toMatchObject({ outcome: "ready", requiredUuidCount: 0 });
    if (away.outcome !== "ready") return;
    expect(away.actions).toHaveLength(7);
    expect(away.actions.every((action) => action.kind === "remove")).toBe(true);
    const removed = materializeProjectConfirmationRevisionReconciliation(withHistory.confirmationProvenance!, away, []);
    expect(removed.outcome).toBe("materialized");
    if (removed.outcome !== "materialized") return;
    expect(removed.provenance.fieldRevisions).toEqual({});
    expect(removed.provenance.confirmationEvents).toEqual([historicalEvent]);

    const nonCanvasCurrent: ProjectRecord = {
      ...awayCandidate,
      confirmationProvenance: removed.provenance
    };
    const returnCandidate: ProjectRecord = {
      ...nonCanvasCurrent,
      intake: { ...nonCanvasCurrent.intake, appType: "powerAppsCanvas" }
    };
    const returned = analyzeProjectConfirmationRevisionReconciliation(nonCanvasCurrent, returnCandidate);
    expect(returned).toMatchObject({ outcome: "ready", requiredUuidCount: 7 });
    if (returned.outcome !== "ready") return;
    expect(returned.actions.every((action) => action.kind === "add")).toBe(true);
    const fresh = materializeProjectConfirmationRevisionReconciliation(
      removed.provenance,
      returned,
      PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.map((_, index) => goldenUuid(100 + index))
    );
    expect(fresh.outcome).toBe("materialized");
    if (fresh.outcome !== "materialized") return;
    const freshIds = Object.values(fresh.provenance.fieldRevisions).map((revision) => revision!.revisionId);
    expect(freshIds).toHaveLength(7);
    expect(freshIds.some((id) => initialRevisionIds.includes(id))).toBe(false);
    expect(fresh.provenance.confirmationEvents).toEqual([historicalEvent]);
  });

  it("freezes semantic revision rotation while confirmation persistence leaves revisions unchanged", async () => {
    const storage = new GoldenMemoryStorage();
    const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage, sequenceRuntime(1));
    const sourceId = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
    const initialRevision = project.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId;

    const changed = updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!,
      canvas: { ...current!.canvas!, fullScreenYamlRequired: "B" }
    }), storage, sequenceRuntime(20))!;
    const changedRevision = changed.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId;
    expect(changedRevision).not.toBe(initialRevision);
    expect(Object.entries(changed.confirmationProvenance!.fieldRevisions).filter(
      ([id, revision]) => revision!.revisionId !== project.confirmationProvenance!.fieldRevisions[id as ProjectConfirmationSourceFieldId]!.revisionId
    )).toHaveLength(1);

    const unchanged = updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!,
      canvas: { ...current!.canvas!, fullScreenYamlRequired: "B" }
    }), storage, { uuid: () => { throw new Error("unchanged registered value must not allocate"); } })!;
    expect(unchanged.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId).toBe(changedRevision);

    const backToA = updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!,
      canvas: { ...current!.canvas!, fullScreenYamlRequired: "" }
    }), storage, sequenceRuntime(30))!;
    expect(new Set([
      initialRevision,
      changedRevision,
      backToA.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId
    ])).toHaveProperty("size", 3);

    const beforeConfirmationRevisions = backToA.confirmationProvenance!.fieldRevisions;
    const request = await goldenConfirmationRequestFor(backToA, GOLDEN_ACTION_A, [sourceId]);
    const result = await confirmProjectFields(request, storage, confirmationRuntime(200, GOLDEN_TIMESTAMP_A));
    expect(result.outcome).toBe("persistedNewAction");
    expect(persistedGoldenProject(storage, project.identity.id).confirmationProvenance!.fieldRevisions)
      .toEqual(beforeConfirmationRevisions);
  });

  it("freezes first-confirmation and seven-field batch persistence deltas", async () => {
    const oneFieldStorage = new GoldenMemoryStorage();
    const oneFieldProject = createProject({ intake: { appType: "powerAppsCanvas" } }, oneFieldStorage, sequenceRuntime(1));
    const before = structuredClone(persistedGoldenProject(oneFieldStorage, oneFieldProject.identity.id));
    const sourceId = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
    const request = await goldenConfirmationRequestFor(before, GOLDEN_ACTION_A, [sourceId]);
    const first = await confirmProjectFields(request, oneFieldStorage, confirmationRuntime(210, GOLDEN_TIMESTAMP_A));

    expect(first.outcome).toBe("persistedNewAction");
    if (first.outcome !== "persistedNewAction") return;
    expect(first.evidence).toMatchObject({
      projectId: oneFieldProject.identity.id,
      confirmationActionId: GOLDEN_ACTION_A,
      confirmedAt: GOLDEN_TIMESTAMP_A,
      canonicalAuthority: false,
      readinessAuthority: false,
      projectionAuthority: false,
      applyAuthority: false,
      outputAuthority: false
    });
    expect(first.evidence.fields).toHaveLength(1);
    const after = persistedGoldenProject(oneFieldStorage, oneFieldProject.identity.id);
    expect(after.confirmationProvenance!.confirmationEvents).toHaveLength(1);
    expect(after.confirmationProvenance!.confirmationEvents[0]).toMatchObject({
      sourceFieldId: sourceId,
      sourceFieldRevisionId: request.fields[0].expectedRevisionId,
      valueFingerprint: request.fields[0].expectedValueFingerprint,
      confirmationActionId: GOLDEN_ACTION_A,
      confirmedAt: GOLDEN_TIMESTAMP_A
    });
    expect(after.confirmationProvenance!.confirmationEvents[0]).not.toHaveProperty("supersedesConfirmationId");
    expect(after.confirmationProvenance!.fieldRevisions).toEqual(before.confirmationProvenance!.fieldRevisions);
    const { confirmationProvenance: _afterProvenance, planning: afterPlanning, ...afterOrdinary } = after;
    const { confirmationProvenance: _beforeProvenance, planning: _beforePlanning, ...beforeOrdinary } = before;
    expect(afterOrdinary).toEqual(beforeOrdinary);
    expect(afterPlanning?.sources ?? []).toEqual([]);
    expect(afterPlanning?.proposals ?? []).toEqual([]);
    expect(afterPlanning?.decisions ?? []).toEqual([]);

    const batchStorage = new GoldenControlledReadStorage();
    const batchProject = createProject({ intake: { appType: "powerAppsCanvas" } }, batchStorage, sequenceRuntime(50));
    batchStorage.resetObservations();
    const batchRequest = await goldenConfirmationRequestFor(
      persistedGoldenProject(batchStorage, batchProject.identity.id),
      GOLDEN_ACTION_B,
      [...PROJECT_CONFIRMATION_SOURCE_FIELD_IDS].reverse()
    );
    const runtime = confirmationRuntime(310, GOLDEN_TIMESTAMP_B);
    const batch = await confirmProjectFields(batchRequest, batchStorage, runtime);
    expect(batch.outcome).toBe("persistedNewAction");
    expect(runtime.uuidCalls()).toBe(7);
    expect(runtime.timestampCalls()).toBe(1);
    expect(batchStorage.writtenKeys).toEqual([STORAGE_KEY]);
    const events = goldenEventsFor(batchStorage, batchProject.identity.id);
    expect(events).toHaveLength(7);
    expect(events.map((event) => event.sourceFieldId)).toEqual(PROJECT_CONFIRMATION_SOURCE_FIELD_IDS);
    expect(new Set(events.map((event) => event.confirmationActionId))).toEqual(new Set([GOLDEN_ACTION_B]));
    expect(new Set(events.map((event) => event.confirmedAt))).toEqual(new Set([GOLDEN_TIMESTAMP_B]));
  });

  it("freezes reconfirmation, linear supersession, exact replay, stale head, and action-reuse safety", async () => {
    const storage = new GoldenControlledReadStorage();
    const project = createProject({ intake: { appType: "powerAppsCanvas" } }, storage, sequenceRuntime(1));
    const sourceId = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
    const firstRequest = await goldenConfirmationRequestFor(persistedGoldenProject(storage, project.identity.id), GOLDEN_ACTION_A, [sourceId]);
    const first = await confirmProjectFields(firstRequest, storage, confirmationRuntime(220, GOLDEN_TIMESTAMP_A));
    expect(first.outcome).toBe("persistedNewAction");
    if (first.outcome !== "persistedNewAction") return;

    const sameRevisionRequest = await goldenConfirmationRequestFor(
      persistedGoldenProject(storage, project.identity.id),
      GOLDEN_ACTION_B,
      [sourceId]
    );
    const sameRevision = await confirmProjectFields(sameRevisionRequest, storage, confirmationRuntime(230, GOLDEN_TIMESTAMP_B));
    expect(sameRevision.outcome).toBe("persistedNewAction");
    if (sameRevision.outcome !== "persistedNewAction") return;
    expect(goldenEventsFor(storage, project.identity.id)[1].supersedesConfirmationId)
      .toBe(first.evidence.fields[0].confirmationId);

    const changed = updateProjectPowerPlatform(project.identity.id, (current) => ({
      ...current!,
      canvas: { ...current!.canvas!, fullScreenYamlRequired: "Changed for golden reconfirmation" }
    }), storage, sequenceRuntime(240))!;
    const changedRequest = await goldenConfirmationRequestFor(changed, GOLDEN_ACTION_C, [sourceId]);
    const changedRevision = await confirmProjectFields(changedRequest, storage, confirmationRuntime(250, GOLDEN_TIMESTAMP_B));
    expect(changedRevision.outcome).toBe("persistedNewAction");
    expect(goldenEventsFor(storage, project.identity.id).map((event) => event.supersedesConfirmationId ?? null))
      .toEqual([null, first.evidence.fields[0].confirmationId, sameRevision.evidence.fields[0].confirmationId]);
    expect(goldenEventsFor(storage, project.identity.id).map((event) => event.confirmationId)).toHaveLength(3);

    storage.resetObservations();
    const replay = await confirmProjectFields(firstRequest, storage, {
      uuid: () => { throw new Error("exact replay must not allocate"); },
      now: () => { throw new Error("exact replay must not timestamp"); }
    });
    expect(replay.outcome).toBe("blocked");
    expect(storage.writtenKeys).toEqual([]);

    const replayStorage = new GoldenControlledReadStorage();
    const replayProject = createProject({ intake: { appType: "powerAppsCanvas" } }, replayStorage, sequenceRuntime(500));
    const replayRequest = await goldenConfirmationRequestFor(persistedGoldenProject(replayStorage, replayProject.identity.id), GOLDEN_ACTION_A);
    const replayFirst = await confirmProjectFields(replayRequest, replayStorage, confirmationRuntime(520, GOLDEN_TIMESTAMP_A));
    expect(replayFirst.outcome).toBe("persistedNewAction");
    const replayRawBefore = replayStorage.getItem(STORAGE_KEY);
    replayStorage.resetObservations();
    const exactReplay = await confirmProjectFields(replayRequest, replayStorage, {
      uuid: () => { throw new Error("exact replay must not allocate"); },
      now: () => { throw new Error("exact replay must not timestamp"); }
    });
    expect(exactReplay.outcome).toBe("replayedExistingAction");
    expect(replayStorage.getItem(STORAGE_KEY)).toBe(replayRawBefore);
    expect(replayStorage.writtenKeys).toEqual([]);
    if (exactReplay.outcome === "replayedExistingAction" && replayFirst.outcome === "persistedNewAction") {
      expect(exactReplay.evidence).toEqual(replayFirst.evidence);
    }

    const mismatchRequest = {
      ...replayRequest,
      fields: [
        { ...replayRequest.fields[0], expectedValueFingerprint: "b".repeat(64) }
      ] as typeof replayRequest.fields
    };
    await expect(confirmProjectFields(mismatchRequest, replayStorage, confirmationRuntime(540, GOLDEN_TIMESTAMP_A)))
      .resolves.toMatchObject({ outcome: "blocked", issues: [{ code: "actionReplayMismatch" }] });
    const staleHeadRequest = await goldenConfirmationRequestFor(
      persistedGoldenProject(replayStorage, replayProject.identity.id),
      GOLDEN_ACTION_B,
      [PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0]]
    );
    await expect(confirmProjectFields({
      ...staleHeadRequest,
      fields: [{ ...staleHeadRequest.fields[0], expectedConfirmationHeadId: goldenUuid(999) }]
    }, replayStorage, confirmationRuntime(550, GOLDEN_TIMESTAMP_A)))
      .resolves.toMatchObject({ outcome: "blocked", issues: [{ code: "confirmationHeadChanged" }] });
  });

  it("freezes repository race, archived, quarantine, serializer, duplication, and archive/restore boundaries", async () => {
    const base = createGoldenProject("powerAppsCanvas", "race-source", 1);
    const request = await goldenConfirmationRequestFor(base, GOLDEN_ACTION_A);
    const winnerStorage = new GoldenMemoryStorage();
    seedGoldenStorage7(winnerStorage, [structuredClone(base)]);
    const winner = await confirmProjectFields(request, winnerStorage, confirmationRuntime(600, GOLDEN_TIMESTAMP_A));
    expect(winner.outcome).toBe("persistedNewAction");

    const raceStorage = new GoldenControlledReadStorage();
    seedGoldenStorage7(raceStorage, [structuredClone(base)]);
    raceStorage.resetObservations();
    raceStorage.onRead = (key, count, storage) => {
      if (key === STORAGE_KEY && count === 2) storage.replaceValue(STORAGE_KEY, winnerStorage.getItem(STORAGE_KEY)!);
    };
    const race = await confirmProjectFields(request, raceStorage, confirmationRuntime(620, GOLDEN_TIMESTAMP_B));
    expect(race.outcome).toBe("replayedExistingAction");
    expect(raceStorage.writtenKeys).toEqual([]);
    expect(goldenEventsFor(raceStorage, base.identity.id)).toHaveLength(7);

    const rawStorage = new GoldenControlledReadStorage();
    const rawOther = createGoldenProject("webApplication", "raw-other", 50);
    seedGoldenStorage7(rawStorage, [structuredClone(base), rawOther], base.identity.id);
    rawStorage.resetObservations();
    rawStorage.onRead = (key, count, storage) => {
      if (key !== STORAGE_KEY || count !== 2) return;
      const parsed = JSON.parse(storage.rawValue(STORAGE_KEY)!) as ReturnType<typeof persistedGoldenState>;
      storage.replaceValue(STORAGE_KEY, JSON.stringify({ ...parsed, activeProjectId: rawOther.identity.id }));
    };
    await expect(confirmProjectFields(request, rawStorage, confirmationRuntime(640, GOLDEN_TIMESTAMP_A)))
      .resolves.toMatchObject({ outcome: "blocked", issues: [{ code: "storageChangedBeforeWrite" }] });
    expect(rawStorage.writtenKeys).toEqual([]);
    expect(goldenEventsFor(rawStorage, base.identity.id)).toHaveLength(0);

    const archivedStorage = new GoldenControlledReadStorage();
    const archivedProject = createProject({ intake: { appType: "powerAppsCanvas" } }, archivedStorage, sequenceRuntime(700));
    const archivedRequest = await goldenConfirmationRequestFor(persistedGoldenProject(archivedStorage, archivedProject.identity.id), GOLDEN_ACTION_A);
    await confirmProjectFields(archivedRequest, archivedStorage, confirmationRuntime(720, GOLDEN_TIMESTAMP_A));
    archiveProject(archivedProject.identity.id, archivedStorage, GOLDEN_TIMESTAMP_B);
    archivedStorage.resetObservations();
    await expect(confirmProjectFields(archivedRequest, archivedStorage, {
      uuid: () => { throw new Error("archived replay must not allocate"); },
      now: () => { throw new Error("archived replay must not timestamp"); }
    })).resolves.toMatchObject({ outcome: "replayedExistingAction" });
    const freshArchivedRequest = await goldenConfirmationRequestFor(
      persistedGoldenProject(archivedStorage, archivedProject.identity.id),
      GOLDEN_ACTION_B
    );
    await expect(confirmProjectFields(freshArchivedRequest, archivedStorage, confirmationRuntime(740, GOLDEN_TIMESTAMP_A)))
      .resolves.toMatchObject({ outcome: "blocked", issues: [{ code: "projectArchived" }] });

    const quarantineStorage = new GoldenMemoryStorage();
    const healthy = createGoldenProject("powerAppsCanvas", "quarantine-healthy", 800);
    const quarantined = createGoldenProject("powerAppsCanvas", "quarantine-raw", 820);
    const malformed = { contractVersion: "bad", nested: { preserved: [null, goldenUuid(840)] } };
    seedGoldenStorage7(quarantineStorage, [
      healthy,
      { ...quarantined, confirmationProvenance: malformed as unknown as ProjectRecord["confirmationProvenance"] }
    ], healthy.identity.id);
    expect(loadStorageState(quarantineStorage).projects.find((project) => project.identity.id === quarantined.identity.id)?.confirmationProvenance)
      .toBeUndefined();
    await expect(confirmProjectFields(await goldenConfirmationRequestFor(healthy, GOLDEN_ACTION_C), quarantineStorage, confirmationRuntime(860)))
      .resolves.toMatchObject({ outcome: "persistedNewAction" });
    expect(rawGoldenProvenance(quarantineStorage, quarantined.identity.id)).toEqual(malformed);

    const duplicateStorage = new GoldenMemoryStorage();
    const source = createProject({ intake: { appType: "powerAppsCanvas" } }, duplicateStorage, sequenceRuntime(900));
    const confirmedRequest = await goldenConfirmationRequestFor(persistedGoldenProject(duplicateStorage, source.identity.id), GOLDEN_ACTION_A);
    await confirmProjectFields(confirmedRequest, duplicateStorage, confirmationRuntime(920, GOLDEN_TIMESTAMP_A));
    const sourceProvenance = persistedGoldenProject(duplicateStorage, source.identity.id).confirmationProvenance!;
    const duplicate = duplicateProject(source.identity.id, duplicateStorage, GOLDEN_TIMESTAMP_B, sequenceRuntime(940))!;
    expect(Object.values(duplicate.confirmationProvenance!.fieldRevisions).map((revision) => revision!.revisionId))
      .not.toEqual(Object.values(sourceProvenance.fieldRevisions).map((revision) => revision!.revisionId));
    expect(duplicate.confirmationProvenance!.confirmationEvents).toEqual([]);

    const beforeArchiveRestore = structuredClone(persistedGoldenProject(duplicateStorage, source.identity.id).confirmationProvenance);
    archiveProject(source.identity.id, duplicateStorage, GOLDEN_TIMESTAMP_B);
    restoreProject(source.identity.id, duplicateStorage, GOLDEN_TIMESTAMP_A);
    expect(persistedGoldenProject(duplicateStorage, source.identity.id).confirmationProvenance)
      .toEqual(beforeArchiveRestore);
  });

  it("freezes Planning, readiness, canonical evidence, Controlled Apply, and generated-output zero-authority boundaries", async () => {
    expect(validatePlanningRuleRegistry().valid).toBe(true);
    expect(validateProductionPlanningReadinessMappingRegistry().outcome).toBe("valid");
    const mappings = getProductionPlanningReadinessMappings();
    expect(mappings.flatMap((mapping) => mapping.canonicalFactEvidenceBindings)).toHaveLength(1);
    expect(mappings.filter((mapping) => mapping.classification === "exactFromAnswer")).toHaveLength(0);
    expect(mappings.filter((mapping) => mapping.classification === "exactByCanonicalMerge")).toHaveLength(0);
    expect(mappings.filter((mapping) => mapping.classification === "partialProjection")).toHaveLength(8);
    expect(mappings.filter((mapping) => mapping.classification === "unsupportedProjection")).toHaveLength(3);
    expect(mappings.every((mapping) => mapping.projectorId === null)).toBe(true);
    expect(mappings.every((mapping) => !mapping.projectionAuthorized)).toBe(true);
    expect(mappings.every((mapping) => !mapping.readinessAuthorized)).toBe(true);
    expect(mappings.every((mapping) => !mapping.applyAuthorized)).toBe(true);

    const yamlMapping = getProductionPlanningReadinessMapping("pp.canvas.yamlplanning.confirmation")!;
    expect(yamlMapping.classification).toBe("partialProjection");
    expect(yamlMapping.canonicalFactEvidenceBindings).toHaveLength(1);
    expect(yamlMapping.canonicalFactEvidenceBindings[0].canonicalDestinationPath)
      .toBe("powerPlatform.canvas.validationResponsibility");
    const yamlStatusDestination = "powerPlatform.canvas.yamlStatus" as string;
    expect(yamlMapping.canonicalFactEvidenceBindings.some((binding) =>
      binding.canonicalDestinationPath === yamlStatusDestination
    )).toBe(false);

    const confirmed = createProject({ intake: { appType: "powerAppsCanvas" } }, new GoldenMemoryStorage(), sequenceRuntime(1));
    await expect(derivePlanningCanonicalFactEvidenceCandidates(confirmed)).resolves.toMatchObject({
      outcome: "noCandidate",
      readinessAuthorized: false,
      projectionAuthorized: false,
      applyAuthorized: false,
      candidates: []
    });
    expect(isPlanningStatusReadinessEligible("Confirmed")).toBe(false);
    expect(isPlanningStatusOutputEligible("Confirmed")).toBe(false);
    expect(analyzePlanningControlledApplyCandidate(null)).toMatchObject({
      outcome: "blocked",
      issues: [{ code: "invalidInput" }]
    });

    const storage = new GoldenMemoryStorage();
    const project = createProject({
      identity: { id: "generated-output", projectName: "Generated Output" },
      intake: { appType: "powerAppsCanvas", appPurpose: "Prove output exclusion." }
    }, storage, sequenceRuntime(20));
    const beforePackage = generateProjectPackage(persistedGoldenProject(storage, project.identity.id));
    const request = await goldenConfirmationRequestFor(persistedGoldenProject(storage, project.identity.id), GOLDEN_ACTION_A);
    const confirmedResult = await confirmProjectFields(request, storage, confirmationRuntime(40, GOLDEN_TIMESTAMP_A));
    expect(confirmedResult.outcome).toBe("persistedNewAction");
    const afterPackage = generateProjectPackage(persistedGoldenProject(storage, project.identity.id));
    const combinedAfterContent = afterPackage.documents.map((document) => document.content).join("\n");
    const afterProject = persistedGoldenProject(storage, project.identity.id);
    const ids = [
      GOLDEN_ACTION_A,
      ...afterProject.confirmationProvenance!.confirmationEvents.map((event) => event.confirmationId)
    ];
    for (const id of ids) expect(combinedAfterContent).not.toContain(id);
    expect(afterPackage.documents.map((document) => document.fileName)).toEqual(
      beforePackage.documents.map((document) => document.fileName)
    );
  });

  it("freezes Storage 7 identity and deterministic persisted-state structural deltas", async () => {
    expect(CURRENT_STORAGE_VERSION).toBe(7);
    expect(STORAGE_KEY).toBe("gpt-project-builder.storage.v2");

    const storage = new GoldenMemoryStorage();
    const project = createGoldenProject("powerAppsCanvas", "golden-storage-state", 100);
    seedGoldenStorage7(storage, [project]);
    const emptyState = persistedGoldenState(storage);
    expect(emptyState).toMatchObject({
      version: 7,
      activeProjectId: project.identity.id,
      projects: [expect.objectContaining({ identity: { id: project.identity.id, projectName: project.identity.projectName } })]
    });
    expect(Object.keys(emptyState.projects[0].confirmationProvenance!.fieldRevisions)).toHaveLength(7);
    expect(emptyState.projects[0].confirmationProvenance!.confirmationEvents).toEqual([]);

    const before = JSON.parse(storage.getItem(STORAGE_KEY)!) as ReturnType<typeof persistedGoldenState>;
    const request = await goldenConfirmationRequestFor(project, GOLDEN_ACTION_A, [PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0]]);
    await expect(confirmProjectFields(request, storage, confirmationRuntime(120, GOLDEN_TIMESTAMP_A)))
      .resolves.toMatchObject({ outcome: "persistedNewAction" });
    const after = JSON.parse(storage.getItem(STORAGE_KEY)!) as ReturnType<typeof persistedGoldenState>;
    expect(after.version).toBe(before.version);
    expect(after.activeProjectId).toBe(before.activeProjectId);
    expect(after.projects.map((candidate) => candidate.identity.id)).toEqual(before.projects.map((candidate) => candidate.identity.id));
    expect(after.projects[0].confirmationProvenance!.fieldRevisions)
      .toEqual(before.projects[0].confirmationProvenance!.fieldRevisions);
    expect(after.projects[0].confirmationProvenance!.confirmationEvents).toHaveLength(1);
    const { confirmationEvents: _afterEvents, ...afterWithoutEvents } = after.projects[0].confirmationProvenance!;
    const { confirmationEvents: _beforeEvents, ...beforeWithoutEvents } = before.projects[0].confirmationProvenance!;
    expect(afterWithoutEvents).toEqual(beforeWithoutEvents);

    const replayBefore = storage.getItem(STORAGE_KEY);
    await expect(confirmProjectFields(request, storage, {
      uuid: () => { throw new Error("golden replay must not allocate"); },
      now: () => { throw new Error("golden replay must not timestamp"); }
    })).resolves.toMatchObject({ outcome: "replayedExistingAction" });
    expect(storage.getItem(STORAGE_KEY)).toBe(replayBefore);

    const state = loadStorageState(storage);
    saveStorageState(state, storage);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(state);
  });

  it("documents source-level architectural zeros for UI, generic core, second domain, and materialization boundaries", () => {
    const productionFiles = listProductionFiles("src");
    const appAndComponentSource = productionFiles
      .filter((file) => file.startsWith("src/app/") || file.startsWith("src/components/"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(appAndComponentSource).not.toContain("confirmProjectFields");

    expect(productionFiles.some((file) => /src\/(?:core|lib\/core)\//.test(file))).toBe(false);
    expect(productionFiles.some((file) => /domain(?:Registry|Adapter)|Domain(?:Registry|Adapter)/.test(file))).toBe(false);
    expect(productionFiles.some((file) => /webApplication.*confirmation|confirmation.*webApplication/i.test(readFileSync(file, "utf8"))))
      .toBe(false);

    const materializerSources = productionFiles
      .filter((file) => !file.endsWith("planningProposals.ts") && !file.endsWith("planningRules.ts") && !file.endsWith("planningUiViewModel.ts"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    expect(materializerSources).not.toContain("sourceType: \"confirmedIntake\"");
    expect(materializerSources).not.toContain("sourceType: 'confirmedIntake'");

    const transactionSource = readFileSync("src/lib/projectConfirmationTransaction.ts", "utf8");
    expect(transactionSource).not.toMatch(/readinessAuthorized:\s*true/);
    expect(transactionSource).not.toMatch(/projectionAuthorized:\s*true/);
    expect(transactionSource).not.toMatch(/applyAuthority:\s*true/);
    expect(transactionSource).not.toMatch(/outputAuthority:\s*true/);
    expect(PROJECT_CONFIRMATION_SEMANTIC_STATEMENT).toContain("unauthenticated local operator explicitly confirms");
    expect(PROJECT_CONFIRMATION_ASSURANCE_TYPE).toBe("unauthenticatedLocalOperator");
    expect(PROJECT_CONFIRMATION_ACTION_ORIGIN).toBe("localExplicitConfirmation");
  });
});

function listProductionFiles(root: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = `${root}/${entry}`;
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (path === "src/tests") continue;
      results.push(...listProductionFiles(path));
    } else if (/\.(ts|tsx)$/.test(path)) {
      results.push(path);
    }
  }
  return results;
}
