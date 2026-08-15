import JSZip from "jszip";
import { createProject } from "../lib/createProject";
import { createImplementationAssetManifest, buildImplementationAssetRegistry } from "../lib/implementationAssets";
import {
  RECORD_LIFECYCLE_FORMULA_EVIDENCE_ASSET_ID,
  RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
  RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS,
  normalizeRecordLifecycleFormulaReviewEvidence,
  type RecordLifecycleFormulaReviewEvidenceRecord,
  type RecordLifecycleFormulaStudioValidationChecks
} from "../lib/recordLifecycleFormulaEvidence";
import { buildRecordLifecycleFormulaReviewState } from "../lib/recordLifecycleFormulaReviewState";
import { RECORD_LIFECYCLE_POWER_FX_ASSET_ID } from "../lib/recordLifecyclePowerFxGeneration";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { createExportManifest } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { createProjectArchive } from "../lib/exportProjectPackage";
import { normalizePowerPlatformData } from "../lib/powerPlatform";
import { STORAGE_KEY } from "../lib/projectRepository";
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import type { ProjectRecord } from "../types/project";

const BASE_REFERENCE = {
  projectId: "project-alpha",
  assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
  reviewContractVersion: "phase-5b.4d.2.1",
  reviewContractChecksum: "fnv1a-12345678"
};

function studioChecks(overrides: Partial<RecordLifecycleFormulaStudioValidationChecks> = {}): RecordLifecycleFormulaStudioValidationChecks {
  return Object.fromEntries(
    RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS.map((check) => [check, overrides[check] ?? true])
  ) as RecordLifecycleFormulaStudioValidationChecks;
}

function technicalRecord(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    evidenceId: "tech-001",
    evidenceSchemaVersion: RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
    evidenceType: "Technical Review",
    ...BASE_REFERENCE,
    reviewerDisplayName: "Jordan Reviewer",
    reviewerRole: "Technical reviewer",
    recordedAt: "2026-07-31T12:34:56-06:00",
    outcome: "Accepted",
    notes: "Reviewed against the stored contract metadata.",
    ...overrides
  };
}

function studioRecord(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    evidenceId: "studio-001",
    evidenceSchemaVersion: RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
    evidenceType: "Power Apps Studio Validation",
    ...BASE_REFERENCE,
    reviewerDisplayName: "Riley Validator",
    reviewerRole: "Studio validator",
    recordedAt: "2026-07-31T13:34:56-06:00",
    outcome: "Passed",
    validationEnvironment: "Power Apps test environment",
    checks: studioChecks(),
    ...overrides
  };
}

function canvasProjectWithEvidence(evidence: RecordLifecycleFormulaReviewEvidenceRecord[]): ProjectRecord {
  const project = createProject({
    identity: { id: "project-alpha", projectName: "Canvas Evidence" },
    intake: { appType: "powerAppsCanvas" }
  });
  project.powerPlatform!.canvas!.recordLifecycleFormulaReviewEvidence = evidence;
  return project;
}

async function zipContentText(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(blob);
  const textFiles = await Promise.all(
    Object.values(zip.files)
      .filter((file) => !file.dir)
      .map((file) => file.async("string"))
  );
  return textFiles.join("\n");
}

describe("record lifecycle formula evidence", () => {
  it("defaults new Canvas projects to empty evidence and keeps non-Canvas projects without Canvas data", () => {
    const canvas = createProject({ intake: { appType: "powerAppsCanvas" } });
    const website = createProject({ intake: { appType: "businessWebsite" } });
    expect(CURRENT_STORAGE_VERSION).toBe(6);
    expect(STORAGE_KEY).toBe("gpt-project-builder.storage.v2");
    expect(RECORD_LIFECYCLE_FORMULA_EVIDENCE_ASSET_ID).toBe(RECORD_LIFECYCLE_POWER_FX_ASSET_ID);
    expect(canvas.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual([]);
    expect(website.powerPlatform?.canvas).toBeUndefined();
  });

  it("normalizes valid technical review outcomes", () => {
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord()])[0]).toMatchObject({
      evidenceType: "Technical Review",
      outcome: "Accepted",
      recordedAt: "2026-07-31T18:34:56.000Z"
    });
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ evidenceId: "tech-rejected", outcome: "Rejected", rejectionReason: "Contract target is wrong." })])[0]).toMatchObject({
      evidenceType: "Technical Review",
      outcome: "Rejected",
      rejectionReason: "Contract target is wrong."
    });
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ evidenceId: "tech-regen", outcome: "Regeneration Required", regenerationReason: "Regenerate after intake correction." })])[0]).toMatchObject({
      evidenceType: "Technical Review",
      outcome: "Regeneration Required",
      regenerationReason: "Regenerate after intake correction."
    });
  });

  it("accepts only strict ISO timestamps with timezone and normalizes them to UTC", () => {
    const accepted = [
      ["zulu", "2026-07-31T12:34:56Z", "2026-07-31T12:34:56.000Z"],
      ["positive-offset", "2026-07-31T12:34:56+02:30", "2026-07-31T10:04:56.000Z"],
      ["negative-offset", "2026-07-31T12:34:56-06:00", "2026-07-31T18:34:56.000Z"],
      ["leap-day", "2024-02-29T12:34:56Z", "2024-02-29T12:34:56.000Z"],
      ["fractional", "2026-07-31T12:34:56.789Z", "2026-07-31T12:34:56.789Z"]
    ] as const;

    for (const [evidenceId, recordedAt, expectedUtc] of accepted) {
      expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ evidenceId, recordedAt })])[0]).toMatchObject({
        evidenceId,
        recordedAt: expectedUtc
      });
    }
  });

  it("rejects non-strict, impossible, and timezone-free timestamps", () => {
    for (const recordedAt of [
      "2026-02-31T12:00:00Z",
      "2025-02-29T12:00:00Z",
      "2026-13-01T12:00:00Z",
      "2026-00-01T12:00:00Z",
      "2026-07-00T12:00:00Z",
      "2026-07-31 12:00:00Z",
      "2026-07-31T12:00:00",
      "2026-07-31T24:00:00Z",
      "2026-07-31T12:60:00Z",
      "2026-07-31T12:00:60Z",
      "2026-07-31T12:00:00+24:00",
      "2026-07-31T12:00:00+01:60",
      "",
      123
    ]) {
      expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ recordedAt })])).toEqual([]);
    }
  });

  it("accepts only approved safe evidence identifiers", () => {
    const maximumLengthId = `A${".".repeat(127)}`;
    const accepted = [
      "Evidence123",
      "evidence-123",
      "evidence_123",
      "evidence.123",
      maximumLengthId
    ];

    for (const evidenceId of accepted) {
      expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ evidenceId })])[0]?.evidenceId).toBe(evidenceId);
    }
  });

  it("rejects unsafe evidence identifiers without replacement", () => {
    for (const evidenceId of [
      "-leading-hyphen",
      ".leading-period",
      "with space",
      "with/slash",
      "with\\backslash",
      "with:colon",
      "with;semicolon",
      "\"quoted\"",
      "<angle>",
      "[square]",
      "with(parentheses)",
      "with\nnewline",
      `bad${String.fromCharCode(7)}`,
      `A${"a".repeat(128)}`,
      "Patch("
    ]) {
      expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ evidenceId })])).toEqual([]);
    }
  });

  it("normalizes valid Studio validation outcomes and required checks", () => {
    expect(normalizeRecordLifecycleFormulaReviewEvidence([studioRecord()])[0]).toMatchObject({
      evidenceType: "Power Apps Studio Validation",
      outcome: "Passed",
      validationEnvironment: "Power Apps test environment",
      checks: studioChecks()
    });
    expect(normalizeRecordLifecycleFormulaReviewEvidence([studioRecord({ evidenceId: "studio-failed", outcome: "Failed", checks: studioChecks({ failurePathPassed: false }) })])[0]).toMatchObject({
      evidenceType: "Power Apps Studio Validation",
      outcome: "Failed",
      checks: studioChecks({ failurePathPassed: false })
    });
  });

  it("requires Passed Studio evidence to have all checks true", () => {
    expect(normalizeRecordLifecycleFormulaReviewEvidence([studioRecord({ outcome: "Passed", checks: studioChecks() })])).toHaveLength(1);

    for (const check of RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS) {
      expect(normalizeRecordLifecycleFormulaReviewEvidence([
        studioRecord({ evidenceId: `passed-false-${check}`, outcome: "Passed", checks: studioChecks({ [check]: false }) })
      ])).toEqual([]);
    }
  });

  it("requires Failed Studio evidence to include at least one false check", () => {
    expect(normalizeRecordLifecycleFormulaReviewEvidence([
      studioRecord({ evidenceId: "failed-one", outcome: "Failed", checks: studioChecks({ failurePathPassed: false }) })
    ])).toHaveLength(1);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([
      studioRecord({
        evidenceId: "failed-many",
        outcome: "Failed",
        checks: studioChecks({ failurePathPassed: false, retryAfterFailurePassed: false })
      })
    ])).toHaveLength(1);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([
      studioRecord({ evidenceId: "failed-all-true", outcome: "Failed", checks: studioChecks() })
    ])).toEqual([]);
  });

  it("keeps Studio outcome consistency isolated from project and formula states", () => {
    const project = canvasProjectWithEvidence(normalizeRecordLifecycleFormulaReviewEvidence([
      studioRecord({ outcome: "Passed", checks: studioChecks() }),
      studioRecord({ evidenceId: "failed-one", outcome: "Failed", checks: studioChecks({ failurePathPassed: false }) })
    ]));
    const registry = buildImplementationAssetRegistry(project);
    const formulaAsset = registry.assets.find((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID);

    expect(project.status).toBe("Intake Started");
    expect(project.reviewStatus).toBe("Not reviewed");
    expect(formulaAsset?.approvalStatus).not.toBe("Approved");
    expect(formulaAsset?.assetStatus).not.toBe("Ready for Export");
  });

  it("rejects missing required technical review fields", () => {
    for (const field of ["reviewerDisplayName", "reviewerRole", "recordedAt", "projectId", "assetId", "reviewContractVersion", "reviewContractChecksum"]) {
      const record = technicalRecord();
      delete record[field];
      expect(normalizeRecordLifecycleFormulaReviewEvidence([record])).toEqual([]);
    }
  });

  it("rejects missing or malformed Studio validation fields", () => {
    expect(normalizeRecordLifecycleFormulaReviewEvidence([studioRecord({ validationEnvironment: "" })])).toEqual([]);
    for (const check of RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS) {
      const checks = { ...studioChecks() };
      delete (checks as Partial<RecordLifecycleFormulaStudioValidationChecks>)[check];
      expect(normalizeRecordLifecycleFormulaReviewEvidence([studioRecord({ evidenceId: `missing-${check}`, checks })])).toEqual([]);
      expect(normalizeRecordLifecycleFormulaReviewEvidence([studioRecord({ evidenceId: `bad-${check}`, checks: { ...studioChecks(), [check]: "yes" } })])).toEqual([]);
    }
  });

  it("defaults missing and non-array evidence collections to empty arrays", () => {
    expect(normalizeRecordLifecycleFormulaReviewEvidence(undefined)).toEqual([]);
    expect(normalizeRecordLifecycleFormulaReviewEvidence({})).toEqual([]);
  });

  it("removes invalid records individually while preserving valid ordering", () => {
    const first = technicalRecord({ evidenceId: "first" });
    const second = studioRecord({ evidenceId: "second" });
    const normalized = normalizeRecordLifecycleFormulaReviewEvidence([
      { evidenceId: "bad" },
      first,
      studioRecord({ evidenceId: "" }),
      second
    ]);
    expect(normalized.map((record) => record.evidenceId)).toEqual(["first", "second"]);
  });

  it("strips unknown, approval, status, source, and current-state properties", () => {
    const [record] = normalizeRecordLifecycleFormulaReviewEvidence([
      technicalRecord({
        unknown: "remove me",
        sourceContent: "not retained",
        approvalStatus: "Approved",
        assetStatus: "Ready for Export",
        isCurrent: true,
        isStale: false
      })
    ]);
    expect(record).toBeDefined();
    expect(JSON.stringify(record)).not.toContain("unknown");
    expect(JSON.stringify(record)).not.toContain("sourceContent");
    expect(JSON.stringify(record)).not.toContain("approvalStatus");
    expect(JSON.stringify(record)).not.toContain("assetStatus");
    expect(JSON.stringify(record)).not.toContain("isCurrent");
    expect(JSON.stringify(record)).not.toContain("isStale");
  });

  it("keeps the first valid duplicate evidence ID", () => {
    const normalized = normalizeRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "same", outcome: "Accepted" }),
      technicalRecord({ evidenceId: "same", outcome: "Rejected" })
    ]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({ evidenceId: "same", outcome: "Accepted" });
  });

  it("is deterministic and idempotent", () => {
    const once = normalizeRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "one" }),
      studioRecord({ evidenceId: "two", recordedAt: "2026-07-31T20:00:00+00:00" })
    ]);
    expect(normalizeRecordLifecycleFormulaReviewEvidence(once)).toEqual(once);
  });

  it("rejects unsafe text, bad timestamps, oversized values, and formula-looking notes", () => {
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ evidenceId: "" })])).toEqual([]);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ recordedAt: "2026-07-31T12:00:00" })])).toEqual([]);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ recordedAt: "not a date" })])).toEqual([]);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ reviewerDisplayName: "x".repeat(121) })])).toEqual([]);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ notes: "x".repeat(2001) })])).toEqual([]);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ notes: "Do not store Patch(" })])).toEqual([]);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ rejectionReason: "Do not store IfError(" })])).toEqual([]);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ regenerationReason: "Do not store RemoveIf(" })])).toEqual([]);
  });

  it("does not retain formula source fields or authenticated identity fields", () => {
    const [record] = normalizeRecordLifecycleFormulaReviewEvidence([
      studioRecord({
        email: "reviewer@example.com",
        userId: "aad-user",
        authenticationClaims: "claim",
        externalReference: "ticket-1",
        attachment: "file"
      })
    ]);
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("aad-user");
    expect(serialized).not.toContain("authenticationClaims");
    expect(serialized).not.toContain("externalReference");
    expect(serialized).not.toContain("attachment");
  });

  it("does not imply formula approval or project readiness", () => {
    const evidence = normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord(), studioRecord()]);
    const project = canvasProjectWithEvidence(evidence);
    const serialized = JSON.stringify(evidence);
    expect(serialized).not.toContain("Approved");
    expect(serialized).not.toContain("Ready for Export");
    expect(project.status).toBe("Intake Started");
    expect(project.reviewStatus).toBe("Not reviewed");
  });

  it("does not change the existing review-state evaluator when evidence exists elsewhere", () => {
    const registry = buildImplementationAssetRegistry(canvasProjectWithEvidence(normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord()])));
    const withoutEvidence = buildRecordLifecycleFormulaReviewState(registry);
    const withEvidence = buildRecordLifecycleFormulaReviewState(registry, undefined);
    expect(withEvidence).toEqual(withoutEvidence);
  });

  it("keeps formula evidence out of manifest, generated documents, ZIP output, and export integrity inventory", async () => {
    const evidence = normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord({ evidenceId: "internal-evidence" })]);
    const project = canvasProjectWithEvidence(evidence);
    const registry = buildImplementationAssetRegistry(project);
    const implementationManifest = createImplementationAssetManifest(registry, project);
    const generated = generateProjectPackage(project);
    const exportProject = { ...project, generatedDocuments: generated.documents, packageGeneratedAt: "2026-07-31T12:00:00.000Z" };
    const integrity = validateExportPackage(exportProject, "2026-07-31T12:00:00.000Z");
    const exportManifest = createExportManifest(exportProject, integrity);
    const zipText = await zipContentText(await createProjectArchive(exportProject, { exportedAt: "2026-07-31T12:00:00.000Z" }));
    expect(JSON.stringify(implementationManifest)).not.toContain("internal-evidence");
    expect(generated.documents.map((document) => document.content).join("\n")).not.toContain("internal-evidence");
    expect(JSON.stringify(exportManifest)).not.toContain("internal-evidence");
    expect(JSON.stringify(integrity)).not.toContain("internal-evidence");
    expect(zipText).not.toContain("internal-evidence");
  });

  it("does not create evidence for TTI-like Draft migration input", () => {
    const project = createProject({
      identity: { id: "tti-like-draft", projectName: "Draft Tracker" },
      intake: { appType: "powerAppsCanvas", appPurpose: "Draft tracker" }
    });
    project.status = "Intake Started";
    project.reviewStatus = "Review needed";
    project.powerPlatform = normalizePowerPlatformData({
      canvas: {
        recordLifecycleTargets: [],
        recordLifecycleFormulaReviewEvidence: undefined
      }
    }, "powerAppsCanvas");
    expect(project.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual([]);
    expect(project.status).toBe("Intake Started");
    expect(project.reviewStatus).toBe("Review needed");
  });
});
