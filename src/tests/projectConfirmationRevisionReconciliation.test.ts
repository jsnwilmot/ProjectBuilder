import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import {
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS
} from "../lib/projectConfirmationProvenance";
import {
  analyzeProjectConfirmationRevisionReconciliation,
  createInitialProjectConfirmationProvenance,
  materializeProjectConfirmationRevisionReconciliation
} from "../lib/projectConfirmationRevisionReconciliation";
import { allocateProjectConfirmationUuids } from "../lib/projectConfirmationRuntime";
import { readProjectConfirmationSourceValue } from "../lib/projectConfirmationSourceAccessors";
import type { ProjectRecord } from "../types/project";

function uuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function canvasProject(values: readonly string[] = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.map(() => "A")): ProjectRecord {
  const project = createProject({ intake: { appType: "powerAppsCanvas" } });
  const canvas = project.powerPlatform!.canvas!;
  [
    "fullScreenYamlRequired",
    "controlLevelYamlRequired",
    "containerYamlRequired",
    "componentYamlRequired",
    "paYamlSourceRequired",
    "expectedInstallationMethod",
    "existingSourceAvailability"
  ].forEach((field, index) => {
    (canvas as unknown as Record<string, unknown>)[field] = values[index];
  });
  const provenance = createInitialProjectConfirmationProvenance(
    project.intake.appType,
    PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.map((_, index) => uuid(index + 1))
  );
  if (provenance.outcome !== "materialized") throw new Error("Test provenance failed.");
  return { ...project, confirmationProvenance: provenance.provenance };
}

describe("project confirmation revision reconciliation", () => {
  it("uses the fixed contract and exact Canvas/non-Canvas applicable sets", () => {
    const canvas = createInitialProjectConfirmationProvenance(
      "powerAppsCanvas",
      PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.map((_, index) => uuid(index + 1))
    );
    const nonCanvas = createInitialProjectConfirmationProvenance("webApplication", []);

    expect(canvas).toMatchObject({ outcome: "materialized" });
    expect(canvas.outcome === "materialized" && canvas.provenance.contractVersion).toBe(
      PROJECT_CONFIRMATION_CONTRACT_VERSION
    );
    expect(canvas.outcome === "materialized" && Object.keys(canvas.provenance.fieldRevisions)).toHaveLength(7);
    expect(nonCanvas).toMatchObject({
      outcome: "materialized",
      provenance: { fieldRevisions: {}, confirmationEvents: [] }
    });
  });

  it("implements all seven accessors as exact stored-string reads", () => {
    const project = canvasProject(["a", "b", "c", "d", "e", "f", "g"]);
    expect([
      readProjectConfirmationSourceValue(project, "canvas.fullScreenYamlRequired"),
      readProjectConfirmationSourceValue(project, "canvas.controlLevelYamlRequired"),
      readProjectConfirmationSourceValue(project, "canvas.containerYamlRequired"),
      readProjectConfirmationSourceValue(project, "canvas.componentYamlRequired"),
      readProjectConfirmationSourceValue(project, "canvas.paYamlSourceRequired"),
      readProjectConfirmationSourceValue(project, "canvas.expectedInstallationMethod"),
      readProjectConfirmationSourceValue(project, "canvas.existingSourceAvailability")
    ]).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
  });

  it("allocates strict canonical transaction-unique UUIDs with no fallback", () => {
    let next = 1;
    expect(allocateProjectConfirmationUuids(2, { uuid: () => uuid(next++) })).toEqual({
      outcome: "allocated",
      values: [uuid(1), uuid(2)]
    });
    expect(allocateProjectConfirmationUuids(1, { uuid: () => "project-123" })).toEqual({
      outcome: "blocked",
      issueCode: "uuidInvalid"
    });
    expect(allocateProjectConfirmationUuids(2, { uuid: () => uuid(1) })).toEqual({
      outcome: "blocked",
      issueCode: "uuidCollision"
    });
    expect(allocateProjectConfirmationUuids(1, { uuid: () => { throw new Error("missing"); } })).toEqual({
      outcome: "blocked",
      issueCode: "uuidUnavailable"
    });
  });

  it("reports seven unchanged actions without requesting UUIDs", () => {
    const current = canvasProject();
    const analysis = analyzeProjectConfirmationRevisionReconciliation(current, structuredClone(current));
    expect(analysis).toMatchObject({ outcome: "ready", requiredUuidCount: 0 });
    expect(analysis.outcome === "ready" && analysis.actions.map((action) => action.kind)).toEqual(
      Array(7).fill("unchanged")
    );
  });

  it("rotates only changed values and proves A to B to A receives R1, R2, R3", () => {
    const first = canvasProject();
    const sourceId = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0];
    const secondCandidate = structuredClone(first);
    secondCandidate.powerPlatform!.canvas!.fullScreenYamlRequired = "B";
    const firstAnalysis = analyzeProjectConfirmationRevisionReconciliation(first, secondCandidate);
    expect(firstAnalysis).toMatchObject({ outcome: "ready", requiredUuidCount: 1 });
    if (firstAnalysis.outcome !== "ready") return;
    const secondProvenance = materializeProjectConfirmationRevisionReconciliation(
      first.confirmationProvenance!,
      firstAnalysis,
      [uuid(8)]
    );
    if (secondProvenance.outcome !== "materialized") throw new Error("Second revision failed.");
    const second = { ...secondCandidate, confirmationProvenance: secondProvenance.provenance };

    const thirdCandidate = structuredClone(second);
    thirdCandidate.powerPlatform!.canvas!.fullScreenYamlRequired = "A";
    const secondAnalysis = analyzeProjectConfirmationRevisionReconciliation(second, thirdCandidate);
    if (secondAnalysis.outcome !== "ready") throw new Error("Third analysis failed.");
    const thirdProvenance = materializeProjectConfirmationRevisionReconciliation(
      second.confirmationProvenance!,
      secondAnalysis,
      [uuid(9)]
    );
    if (thirdProvenance.outcome !== "materialized") throw new Error("Third revision failed.");

    expect([
      first.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId,
      second.confirmationProvenance!.fieldRevisions[sourceId]!.revisionId,
      thirdProvenance.provenance.fieldRevisions[sourceId]!.revisionId
    ]).toEqual([uuid(1), uuid(8), uuid(9)]);
  });

  it("removes Canvas applicability and creates entirely fresh revisions on return", () => {
    const canvas = canvasProject();
    const away = structuredClone(canvas);
    away.intake.appType = "webApplication";
    away.powerPlatform = undefined;
    const awayAnalysis = analyzeProjectConfirmationRevisionReconciliation(canvas, away);
    if (awayAnalysis.outcome !== "ready") throw new Error("Away analysis failed.");
    const removed = materializeProjectConfirmationRevisionReconciliation(
      canvas.confirmationProvenance!,
      awayAnalysis,
      []
    );
    if (removed.outcome !== "materialized") throw new Error("Away materialization failed.");
    expect(Object.keys(removed.provenance.fieldRevisions)).toHaveLength(0);

    const nonCanvas = { ...away, confirmationProvenance: removed.provenance };
    const returned = canvasProject();
    returned.identity.id = nonCanvas.identity.id;
    returned.confirmationProvenance = removed.provenance;
    const returnAnalysis = analyzeProjectConfirmationRevisionReconciliation(nonCanvas, returned);
    if (returnAnalysis.outcome !== "ready") throw new Error("Return analysis failed.");
    expect(returnAnalysis.requiredUuidCount).toBe(7);
    const freshIds = PROJECT_CONFIRMATION_SOURCE_FIELD_IDS.map((_, index) => uuid(index + 20));
    const restored = materializeProjectConfirmationRevisionReconciliation(
      removed.provenance,
      returnAnalysis,
      freshIds
    );
    expect(restored.outcome === "materialized" &&
      Object.values(restored.provenance.fieldRevisions).map((entry) => entry!.revisionId)).toEqual(freshIds);
  });
});
