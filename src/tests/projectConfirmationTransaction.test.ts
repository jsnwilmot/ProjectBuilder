// @ts-expect-error -- Vitest executes in Node while the app tsconfig excludes Node ambient types.
import { webcrypto } from "node:crypto";
// @ts-expect-error -- Vitest source-isolation checks run in Node; the app tsconfig excludes Node ambient types.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProject } from "../lib/createProject";
import {
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS,
  type ProjectConfirmationProvenance,
  type ProjectConfirmationSourceFieldId
} from "../lib/projectConfirmationProvenance";
import {
  collectProjectConfirmationProvenanceIds,
  createInitialProjectConfirmationProvenance
} from "../lib/projectConfirmationRevisionReconciliation";
import {
  PROJECT_CONFIRMATION_SEMANTIC_STATEMENT,
  deriveProjectConfirmationCurrentFields,
  finalizeProjectConfirmationTransaction,
  initiateProjectConfirmationAction,
  prepareProjectConfirmationTransaction,
  type ProjectConfirmationActionIdContext,
  type ProjectConfirmationPreparedNewAction,
  type ProjectConfirmationRequest
} from "../lib/projectConfirmationTransaction";
import type { ProjectRecord } from "../types/project";

const PROJECT_ID = "confirmation-transaction-project";
const ACTION_A = uuid(100);
const ACTION_B = uuid(101);
const TIMESTAMP_A = "2026-08-31T18:00:00.000Z";
const TIMESTAMP_B = "2026-08-31T18:01:00.000Z";
const CANVAS_KEYS = [
  "fullScreenYamlRequired",
  "controlLevelYamlRequired",
  "containerYamlRequired",
  "componentYamlRequired",
  "paYamlSourceRequired",
  "expectedInstallationMethod",
  "existingSourceAvailability"
] as const;

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function uuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function canvasProject(
  values: readonly string[] = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.map((_, index) => `Value ${index + 1}`),
  projectId = PROJECT_ID
): ProjectRecord {
  const project = createProject({
    identity: { id: projectId },
    intake: { appType: "powerAppsCanvas" },
    now: "2026-08-31T17:00:00.000Z"
  });
  const canvas = project.powerPlatform!.canvas! as unknown as Record<string, string>;
  CANVAS_KEYS.forEach((key, index) => { canvas[key] = values[index]; });
  const initial = createInitialProjectConfirmationProvenance(
    project.intake.appType,
    PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.map((_, index) => uuid(index + 1))
  );
  if (initial.outcome !== "materialized") throw new Error("Test provenance initialization failed.");
  return { ...project, confirmationProvenance: initial.provenance };
}

function unused(actionId: string): ProjectConfirmationActionIdContext {
  return { confirmationActionId: actionId, usage: { kind: "unused" } };
}

function existing(actionId: string, projectId = PROJECT_ID): ProjectConfirmationActionIdContext {
  return { confirmationActionId: actionId, usage: { kind: "validAction", projectId } };
}

async function requestFor(
  project: ProjectRecord,
  actionId = ACTION_A,
  sourceIds: readonly ProjectConfirmationSourceFieldId[] = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS
): Promise<ProjectConfirmationRequest> {
  const current = await deriveProjectConfirmationCurrentFields(project);
  if (current.outcome !== "derived") throw new Error(`Current fields blocked: ${current.issueCode}`);
  const selected = sourceIds.map((sourceId) => current.fields.find((field) => field.sourceFieldId === sourceId)!);
  return {
    projectId: project.identity.id,
    confirmationActionId: actionId,
    fields: selected.map((field) => ({
      sourceFieldId: field.sourceFieldId,
      expectedRevisionId: field.currentRevisionId,
      expectedValueFingerprint: field.currentValueFingerprint,
      expectedConfirmationHeadId: field.currentConfirmationHeadId
    })) as [ProjectConfirmationRequest["fields"][number], ...ProjectConfirmationRequest["fields"][number][]]
  };
}

async function prepareNew(
  project: ProjectRecord,
  request: ProjectConfirmationRequest
): Promise<ProjectConfirmationPreparedNewAction> {
  const prepared = await prepareProjectConfirmationTransaction(
    project,
    request,
    unused(request.confirmationActionId)
  );
  if (prepared.outcome !== "preparedNewAction") {
    throw new Error(`Preparation failed: ${prepared.outcome === "blocked" ? prepared.issueCode : prepared.outcome}`);
  }
  return prepared;
}

function finalize(
  prepared: ProjectConfirmationPreparedNewAction,
  startId: number,
  timestamp: string
) {
  let next = startId;
  return finalizeProjectConfirmationTransaction(
    prepared,
    collectProjectConfirmationProvenanceIds(prepared.baseProvenance),
    { uuid: () => uuid(next++), now: () => timestamp }
  );
}

function withProvenance(project: ProjectRecord, provenance: ProjectConfirmationProvenance): ProjectRecord {
  return { ...project, confirmationProvenance: provenance };
}

describe("project confirmation transaction foundation", () => {
  it("locks the exact semantic statement and zero-authority boundary", () => {
    expect(PROJECT_CONFIRMATION_SEMANTIC_STATEMENT).toBe(
      "The unauthenticated local operator explicitly confirms that the currently displayed normalized value of the identified registered project field is correct for this project at its current field revision."
    );
  });

  it("allocates exactly one strict action UUID with no fallback or retry", () => {
    const calls = vi.fn(() => ACTION_A);
    expect(initiateProjectConfirmationAction(new Set(), { uuid: calls })).toEqual({
      outcome: "initiated",
      confirmationActionId: ACTION_A
    });
    expect(calls).toHaveBeenCalledTimes(1);

    for (const [runtime, forbidden, issueCode] of [
      [{ uuid: () => ACTION_A }, new Set([ACTION_A]), "uuidCollision"],
      [{ uuid: () => "project-id" }, new Set<string>(), "uuidInvalid"],
      [{ uuid: () => { throw new Error("missing"); } }, new Set<string>(), "uuidUnavailable"]
    ] as const) {
      expect(initiateProjectConfirmationAction(forbidden, runtime)).toEqual({ outcome: "blocked", issueCode });
    }

    vi.stubGlobal("crypto", undefined);
    expect(initiateProjectConfirmationAction(new Set())).toEqual({
      outcome: "blocked",
      issueCode: "uuidUnavailable"
    });
  });

  it("derives all seven current revision, fingerprint, and null-head tokens", async () => {
    const project = canvasProject(["  A  ", "B", "", "d", "é", "F", "g"]);
    const result = await deriveProjectConfirmationCurrentFields(project);
    expect(result.outcome).toBe("derived");
    if (result.outcome !== "derived") return;
    expect(result.fields.map((field) => field.sourceFieldId)).toEqual(PROJECT_CONFIRMATION_SOURCE_FIELD_IDS);
    expect(result.fields.map((field) => field.currentRevisionId)).toEqual(
      PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.map((_, index) => uuid(index + 1))
    );
    expect(result.fields.every((field) => /^[a-f0-9]{64}$/.test(field.currentValueFingerprint))).toBe(true);
    expect(result.fields.every((field) => field.currentConfirmationHeadId === null)).toBe(true);
    expect(result.fields.every((field) => field.currentConfirmationEvidence === null)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.fields)).toBe(true);
  });

  it("fails closed for non-Canvas, invalid provenance, and unavailable source values", async () => {
    const nonCanvas = createProject({ identity: { id: "web" }, intake: { appType: "webApplication" } });
    expect(await deriveProjectConfirmationCurrentFields(nonCanvas)).toEqual({
      outcome: "blocked",
      issueCode: "unsupportedProjectType"
    });
    const missing = canvasProject();
    delete missing.confirmationProvenance;
    expect(await deriveProjectConfirmationCurrentFields(missing)).toEqual({
      outcome: "blocked",
      issueCode: "invalidProvenance"
    });
    const unavailable = canvasProject();
    (unavailable.powerPlatform!.canvas as unknown as Record<string, unknown>).fullScreenYamlRequired = null;
    expect(await deriveProjectConfirmationCurrentFields(unavailable)).toEqual({
      outcome: "blocked",
      issueCode: "sourceValueUnavailable"
    });
  });

  it("prepares a first confirmation without allocation, timestamp, mutation, or caller-order authority", async () => {
    const project = canvasProject();
    const before = structuredClone(project);
    const request = await requestFor(project, ACTION_A, [...PROJECT_CONFIRMATION_SOURCE_FIELD_IDS].reverse());
    const prepared = await prepareNew(project, request);
    expect(prepared.fields.map((field) => field.sourceFieldId)).toEqual(PROJECT_CONFIRMATION_SOURCE_FIELD_IDS);
    expect(prepared.fields.every((field) => field.supersedesConfirmationId === null)).toBe(true);
    expect(prepared).not.toHaveProperty("confirmedAt");
    expect(prepared).not.toHaveProperty("confirmationIds");
    expect(project).toEqual(before);
    expect(Object.isFrozen(prepared)).toBe(true);
  });

  it("rejects malformed, empty, duplicate, unsupported, and stale new-action requests", async () => {
    const project = canvasProject();
    const request = await requestFor(project);
    const prepare = (candidate: unknown) => prepareProjectConfirmationTransaction(project, candidate, unused(ACTION_A));
    await expect(prepare({ ...request, fields: [] })).resolves.toEqual({ outcome: "blocked", issueCode: "emptyBatch" });
    await expect(prepare({ ...request, fields: [request.fields[0], request.fields[0]] })).resolves.toEqual({
      outcome: "blocked", issueCode: "duplicateSourceField"
    });
    await expect(prepare({ ...request, confirmationActionId: "bad" })).resolves.toEqual({
      outcome: "blocked", issueCode: "invalidActionId"
    });
    await expect(prepare({ ...request, projectId: "another-project" })).resolves.toEqual({
      outcome: "blocked", issueCode: "invalidProjectId"
    });
    await expect(prepare({ ...request, fields: [{ ...request.fields[0], expectedValueFingerprint: "bad" }] })).resolves.toEqual({
      outcome: "blocked", issueCode: "fingerprintInvalid"
    });
    await expect(prepare({ ...request, fields: [{ ...request.fields[0], expectedConfirmationHeadId: "bad" }] })).resolves.toEqual({
      outcome: "blocked", issueCode: "invalidRequest"
    });
    await expect(prepare({ ...request, fields: [{ ...request.fields[0], sourceFieldId: "unknown" }] })).resolves.toEqual({
      outcome: "blocked", issueCode: "unsupportedSourceField"
    });
    await expect(prepare({ ...request, fields: [{ ...request.fields[0], expectedRevisionId: uuid(90) }] })).resolves.toEqual({
      outcome: "blocked", issueCode: "revisionChanged"
    });
    await expect(prepare({ ...request, fields: [{ ...request.fields[0], expectedValueFingerprint: "a".repeat(64) }] })).resolves.toEqual({
      outcome: "blocked", issueCode: "valueChanged"
    });
    await expect(prepare({ ...request, fields: [{ ...request.fields[0], expectedConfirmationHeadId: uuid(91) }] })).resolves.toEqual({
      outcome: "blocked", issueCode: "confirmationHeadChanged"
    });
  });

  it("finalizes a seven-field first action with N IDs, one timestamp, registry order, and valid immutable evidence", async () => {
    const project = canvasProject();
    const prepared = await prepareNew(project, await requestFor(project));
    let next = 200;
    const uuidRuntime = vi.fn(() => uuid(next++));
    const now = vi.fn(() => TIMESTAMP_A);
    const result = finalizeProjectConfirmationTransaction(
      prepared,
      collectProjectConfirmationProvenanceIds(prepared.baseProvenance),
      { uuid: uuidRuntime, now }
    );
    expect(result.outcome).toBe("finalizedNewAction");
    if (result.outcome !== "finalizedNewAction") return;
    expect(uuidRuntime).toHaveBeenCalledTimes(7);
    expect(now).toHaveBeenCalledTimes(1);
    expect(result.newEvents.map((event) => event.sourceFieldId)).toEqual(PROJECT_CONFIRMATION_SOURCE_FIELD_IDS);
    expect(result.newEvents.every((event) => !Object.hasOwn(event, "supersedesConfirmationId"))).toBe(true);
    expect(new Set(result.newEvents.map((event) => event.confirmedAt))).toEqual(new Set([TIMESTAMP_A]));
    expect(new Set(result.newEvents.map((event) => event.confirmationActionId))).toEqual(new Set([ACTION_A]));
    expect(result.candidateProvenance.confirmationEvents).toHaveLength(7);
    expect(result).toMatchObject({
      canonicalAuthority: false,
      readinessAuthority: false,
      projectionAuthority: false,
      applyAuthority: false,
      outputAuthority: false
    });
    expect(Object.isFrozen(result.candidateProvenance)).toBe(true);
  });

  it("replays an exact root action before comparing the now-advanced current head", async () => {
    const project = canvasProject();
    const request = await requestFor(project, ACTION_A, [PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0]]);
    const finalized = finalize(await prepareNew(project, request), 200, TIMESTAMP_A);
    if (finalized.outcome !== "finalizedNewAction") throw new Error("Finalization failed.");
    const persisted = withProvenance(project, finalized.candidateProvenance);

    const replay = await prepareProjectConfirmationTransaction(persisted, request, existing(ACTION_A));
    expect(replay.outcome).toBe("preparedReplay");
    if (replay.outcome !== "preparedReplay") return;
    expect(replay.evidence.confirmedAt).toBe(TIMESTAMP_A);
    expect(replay.evidence.fields).toEqual(finalized.fields);
    expect(replay.evidence.fields[0].expectedConfirmationHeadId).toBeNull();
    expect(replay.evidence).toMatchObject({ canonicalAuthority: false, readinessAuthority: false });
  });

  it("supports same-revision reconfirmation and reconstructs the non-root pre-action head", async () => {
    const project = canvasProject();
    const source = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
    const requestA = await requestFor(project, ACTION_A, [source]);
    const first = finalize(await prepareNew(project, requestA), 200, TIMESTAMP_A);
    if (first.outcome !== "finalizedNewAction") throw new Error("First finalization failed.");
    const afterFirst = withProvenance(project, first.candidateProvenance);
    const requestB = await requestFor(afterFirst, ACTION_B, [source]);
    expect(requestB.fields[0].expectedConfirmationHeadId).toBe(first.fields[0].confirmationId);
    const second = finalize(await prepareNew(afterFirst, requestB), 210, TIMESTAMP_B);
    if (second.outcome !== "finalizedNewAction") throw new Error("Second finalization failed.");
    expect(second.newEvents[0].supersedesConfirmationId).toBe(first.fields[0].confirmationId);
    const afterSecond = withProvenance(afterFirst, second.candidateProvenance);

    const replayB = await prepareProjectConfirmationTransaction(afterSecond, requestB, existing(ACTION_B));
    expect(replayB).toMatchObject({
      outcome: "preparedReplay",
      evidence: { fields: [{ expectedConfirmationHeadId: first.fields[0].confirmationId }] }
    });
    const historicalReplayA = await prepareProjectConfirmationTransaction(afterSecond, requestA, existing(ACTION_A));
    expect(historicalReplayA.outcome).toBe("preparedReplay");
  });

  it("supports changed-revision reconfirmation while retaining the prior lineage head", async () => {
    const project = canvasProject();
    const source = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
    const firstRequest = await requestFor(project, ACTION_A, [source]);
    const first = finalize(await prepareNew(project, firstRequest), 200, TIMESTAMP_A);
    if (first.outcome !== "finalizedNewAction") throw new Error("First finalization failed.");
    const changed = structuredClone(withProvenance(project, first.candidateProvenance));
    changed.powerPlatform!.canvas!.fullScreenYamlRequired = "Changed value";
    changed.confirmationProvenance = {
      ...changed.confirmationProvenance!,
      fieldRevisions: {
        ...changed.confirmationProvenance!.fieldRevisions,
        [source]: { revisionId: uuid(80) }
      }
    };
    const changedRequest = await requestFor(changed, ACTION_B, [source]);
    expect(changedRequest.fields[0]).toMatchObject({
      expectedRevisionId: uuid(80),
      expectedConfirmationHeadId: first.fields[0].confirmationId
    });
    const prepared = await prepareNew(changed, changedRequest);
    const second = finalize(prepared, 210, TIMESTAMP_B);
    expect(second).toMatchObject({
      outcome: "finalizedNewAction",
      newEvents: [{ sourceFieldRevisionId: uuid(80), supersedesConfirmationId: first.fields[0].confirmationId }]
    });
  });

  it("performs exact registry-ordered multi-field replay without allocation", async () => {
    const project = canvasProject();
    const request = await requestFor(project, ACTION_A, [
      PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[4],
      PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[1]
    ]);
    const finalized = finalize(await prepareNew(project, request), 200, TIMESTAMP_A);
    if (finalized.outcome !== "finalizedNewAction") throw new Error("Finalization failed.");
    const persisted = withProvenance(project, finalized.candidateProvenance);
    const replay = await prepareProjectConfirmationTransaction(
      persisted,
      { ...request, fields: [...request.fields].reverse() },
      existing(ACTION_A)
    );
    expect(replay.outcome).toBe("preparedReplay");
    if (replay.outcome !== "preparedReplay") return;
    expect(replay.evidence.fields.map((field) => field.sourceFieldId)).toEqual([
      PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[1],
      PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[4]
    ]);
  });

  it("blocks replay mismatches for changed revision, value, batch, or expected pre-action head", async () => {
    const project = canvasProject();
    const source = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
    const request = await requestFor(project, ACTION_A, [source]);
    const finalized = finalize(await prepareNew(project, request), 200, TIMESTAMP_A);
    if (finalized.outcome !== "finalizedNewAction") throw new Error("Finalization failed.");
    const persisted = withProvenance(project, finalized.candidateProvenance);

    const mismatches = [
      { ...request, fields: [{ ...request.fields[0], expectedRevisionId: uuid(90) }] },
      { ...request, fields: [{ ...request.fields[0], expectedValueFingerprint: "b".repeat(64) }] },
      { ...request, fields: [...request.fields, (await requestFor(project, ACTION_A, [PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[1]])).fields[0]] },
      { ...request, fields: [{ ...request.fields[0], expectedConfirmationHeadId: uuid(91) }] }
    ];
    for (const mismatch of mismatches) {
      await expect(prepareProjectConfirmationTransaction(persisted, mismatch, existing(ACTION_A))).resolves.toEqual({
        outcome: "blocked",
        issueCode: "actionReplayMismatch"
      });
    }

    const changed = structuredClone(persisted);
    changed.powerPlatform!.canvas!.fullScreenYamlRequired = "new";
    changed.confirmationProvenance = {
      ...changed.confirmationProvenance!,
      fieldRevisions: {
        ...changed.confirmationProvenance!.fieldRevisions,
        [source]: { revisionId: uuid(92) }
      }
    };
    await expect(prepareProjectConfirmationTransaction(changed, request, existing(ACTION_A))).resolves.toEqual({
      outcome: "blocked",
      issueCode: "actionReplayMismatch"
    });

    const changedValueOnly = structuredClone(persisted);
    changedValueOnly.powerPlatform!.canvas!.fullScreenYamlRequired = "new value with retained revision";
    await expect(prepareProjectConfirmationTransaction(changedValueOnly, request, existing(ACTION_A))).resolves.toEqual({
      outcome: "blocked",
      issueCode: "actionReplayMismatch"
    });
  });

  it("blocks cross-project, quarantine, non-action, ambiguous, and stale-context action IDs", async () => {
    const project = canvasProject();
    const request = await requestFor(project);
    for (const context of [
      existing(ACTION_A, "another-project"),
      { confirmationActionId: ACTION_A, usage: { kind: "quarantinedUuid" } },
      { confirmationActionId: ACTION_A, usage: { kind: "validNonActionUuid" } },
      { confirmationActionId: ACTION_A, usage: { kind: "ambiguous" } }
    ] as ProjectConfirmationActionIdContext[]) {
      await expect(prepareProjectConfirmationTransaction(project, request, context)).resolves.toEqual({
        outcome: "blocked",
        issueCode: "actionIdCollision"
      });
    }

    const finalized = finalize(await prepareNew(project, request), 200, TIMESTAMP_A);
    if (finalized.outcome !== "finalizedNewAction") throw new Error("Finalization failed.");
    await expect(prepareProjectConfirmationTransaction(
      withProvenance(project, finalized.candidateProvenance),
      request,
      unused(ACTION_A)
    )).resolves.toEqual({ outcome: "blocked", issueCode: "actionIdCollision" });
  });

  it("exposes current evidence only when the lineage head matches current revision and value", async () => {
    const project = canvasProject();
    const request = await requestFor(project, ACTION_A, [PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0]]);
    const finalized = finalize(await prepareNew(project, request), 200, TIMESTAMP_A);
    if (finalized.outcome !== "finalizedNewAction") throw new Error("Finalization failed.");
    const result = await deriveProjectConfirmationCurrentFields(withProvenance(project, finalized.candidateProvenance));
    if (result.outcome !== "derived") throw new Error("Derivation failed.");
    expect(result.fields[0].currentConfirmationEvidence).toMatchObject({
      confirmationId: finalized.fields[0].confirmationId,
      canonicalAuthority: false,
      readinessAuthority: false,
      projectionAuthority: false,
      applyAuthority: false,
      outputAuthority: false
    });
    expect(result.fields.slice(1).every((field) => field.currentConfirmationEvidence === null)).toBe(true);
  });

  it("fails finalization closed for timestamp and UUID failures without partial success", async () => {
    const prepared = await prepareNew(canvasProject(), await requestFor(canvasProject(), ACTION_A, [PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0]]));
    expect(finalizeProjectConfirmationTransaction(prepared, new Set(), {
      now: () => { throw new Error("clock"); }, uuid: () => uuid(200)
    })).toEqual({ outcome: "blocked", issueCode: "timestampUnavailable" });
    expect(finalizeProjectConfirmationTransaction(prepared, new Set(), {
      now: () => "not-a-time", uuid: () => uuid(200)
    })).toEqual({ outcome: "blocked", issueCode: "timestampInvalid" });
    expect(finalizeProjectConfirmationTransaction(prepared, new Set(), {
      now: () => TIMESTAMP_A, uuid: () => "bad"
    })).toEqual({ outcome: "blocked", issueCode: "uuidInvalid" });
    expect(finalizeProjectConfirmationTransaction(prepared, new Set([uuid(200)]), {
      now: () => TIMESTAMP_A, uuid: () => uuid(200)
    })).toEqual({ outcome: "blocked", issueCode: "uuidCollision" });
    expect(finalizeProjectConfirmationTransaction(prepared, new Set(), {
      now: () => TIMESTAMP_A, uuid: () => ACTION_A
    })).toEqual({ outcome: "blocked", issueCode: "uuidCollision" });
    expect(finalizeProjectConfirmationTransaction(prepared, new Set(), {
      now: () => TIMESTAMP_A, uuid: () => { throw new Error("missing"); }
    })).toEqual({ outcome: "blocked", issueCode: "uuidUnavailable" });

    const invalidBase = {
      ...prepared,
      baseProvenance: {
        ...prepared.baseProvenance,
        confirmationEvents: [{ invalid: true }]
      } as unknown as ProjectConfirmationProvenance
    };
    expect(finalizeProjectConfirmationTransaction(invalidBase, new Set(), {
      now: () => TIMESTAMP_A, uuid: () => uuid(200)
    })).toEqual({ outcome: "blocked", issueCode: "finalValidationFailed" });
  });

  it("preserves project values, revisions, and history through preparation and finalization", async () => {
    const project = canvasProject();
    const before = structuredClone(project);
    const request = await requestFor(project, ACTION_A, [PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0]]);
    const prepared = await prepareNew(project, request);
    const finalized = finalize(prepared, 200, TIMESTAMP_A);
    expect(project).toEqual(before);
    expect(prepared.baseProvenance).toEqual(before.confirmationProvenance);
    expect(finalized.outcome).toBe("finalizedNewAction");
    if (finalized.outcome !== "finalizedNewAction") return;
    expect(finalized.candidateProvenance.fieldRevisions).toEqual(before.confirmationProvenance!.fieldRevisions);
    expect(finalized.candidateProvenance.confirmationEvents.slice(0, before.confirmationProvenance!.confirmationEvents.length))
      .toEqual(before.confirmationProvenance!.confirmationEvents);
    expect(project.planning).toEqual(before.planning);
  });

  it("has no persistence, UI, Planning materialization, or downstream authority dependency", () => {
    const transactionSource = readFileSync("src/lib/projectConfirmationTransaction.ts", "utf8");
    const fingerprintSource = readFileSync("src/lib/projectConfirmationValueFingerprint.ts", "utf8");
    const combined = `${transactionSource}\n${fingerprintSource}`;
    for (const forbidden of [
      "projectRepository",
      "localStorage",
      "sessionStorage",
      "confirmedIntake",
      "planningReadinessMappingRegistry",
      "exactByCanonicalMerge",
      "yamlStatus",
      "App.tsx",
      "useProjectBuilder",
      "fetch("
    ]) expect(combined).not.toContain(forbidden);
    expect(transactionSource).not.toContain("setItem(");
    expect(transactionSource).not.toContain("createPlanning");
  });
});
