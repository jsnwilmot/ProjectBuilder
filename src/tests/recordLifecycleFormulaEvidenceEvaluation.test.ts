import JSZip from "jszip";
import { createProject } from "../lib/createProject";
import { buildImplementationAssetRegistry, createImplementationAssetManifest } from "../lib/implementationAssets";
import {
  evaluateRecordLifecycleFormulaReviewEvidence,
  type RecordLifecycleFormulaEvidenceEvaluationContext
} from "../lib/recordLifecycleFormulaEvidenceEvaluation";
import {
  RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
  RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS,
  normalizeRecordLifecycleFormulaReviewEvidence,
  type RecordLifecycleFormulaStudioValidationChecks
} from "../lib/recordLifecycleFormulaEvidence";
import {
  buildRecordLifecycleFormulaReviewState,
  RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION
} from "../lib/recordLifecycleFormulaReviewState";
import {
  PERMANENT_DELETE_BLOCKER,
  RECORD_LIFECYCLE_POWER_FX_ASSET_ID
} from "../lib/recordLifecyclePowerFxGeneration";
import { createExportManifest } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { createProjectArchive } from "../lib/exportProjectPackage";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { normalizePowerPlatformData } from "../lib/powerPlatform";
import type {
  ProjectRecord,
  RecordLifecycleFormulaReviewEvidenceRecord
} from "../types/project";

const CURRENT_CONTEXT: RecordLifecycleFormulaEvidenceEvaluationContext = {
  projectId: "project-alpha",
  assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
  reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
  reviewContractChecksum: "fnv1a-current1"
};

const NOW = "2026-07-31T12:00:00.000Z";

type EvidenceTypeResult = ReturnType<typeof evaluateRecordLifecycleFormulaReviewEvidence>["technicalReview"];

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function recordIds(records: Array<{ evidenceId?: string }>): string[] {
  return records.map((record) => record.evidenceId ?? "[missing]");
}

function sortedRecordIds(records: Array<{ evidenceId?: string }>): string[] {
  return recordIds(records).sort();
}

function expectTypeResult(
  result: EvidenceTypeResult,
  expected: {
    status: EvidenceTypeResult["status"];
    current: number;
    stale: number;
    invalid: number;
  }
) {
  expect(result.status).toBe(expected.status);
  expect(result.currentRecords).toHaveLength(expected.current);
  expect(result.staleRecords).toHaveLength(expected.stale);
  expect(result.invalidRecords).toHaveLength(expected.invalid);
}

function semanticSummary(result: ReturnType<typeof evaluateRecordLifecycleFormulaReviewEvidence>) {
  return {
    technicalReview: {
      status: result.technicalReview.status,
      current: sortedRecordIds(result.technicalReview.currentRecords),
      stale: sortedRecordIds(result.technicalReview.staleRecords),
      invalid: sortedRecordIds(result.technicalReview.invalidRecords)
    },
    studioValidation: {
      status: result.studioValidation.status,
      current: sortedRecordIds(result.studioValidation.currentRecords),
      stale: sortedRecordIds(result.studioValidation.staleRecords),
      invalid: sortedRecordIds(result.studioValidation.invalidRecords)
    },
    collectionIssues: [...result.collectionIssues].sort()
  };
}

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
    projectId: CURRENT_CONTEXT.projectId,
    assetId: CURRENT_CONTEXT.assetId,
    reviewContractVersion: CURRENT_CONTEXT.reviewContractVersion,
    reviewContractChecksum: CURRENT_CONTEXT.reviewContractChecksum,
    reviewerDisplayName: "Jordan Reviewer",
    reviewerRole: "Technical reviewer",
    recordedAt: "2026-07-31T12:34:56-06:00",
    outcome: "Accepted",
    notes: "Reviewed against contract metadata.",
    ...overrides
  };
}

function studioRecord(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    evidenceId: "studio-001",
    evidenceSchemaVersion: RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
    evidenceType: "Power Apps Studio Validation",
    projectId: CURRENT_CONTEXT.projectId,
    assetId: CURRENT_CONTEXT.assetId,
    reviewContractVersion: CURRENT_CONTEXT.reviewContractVersion,
    reviewContractChecksum: CURRENT_CONTEXT.reviewContractChecksum,
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

const staleEvidenceCases: Array<[string, Record<string, unknown>, string, RecordLifecycleFormulaEvidenceEvaluationContext?]> = [
  ["project ID mismatch", technicalRecord({ projectId: "project-other" }), "Formula evidence project ID does not match the current project."],
  ["asset ID mismatch", technicalRecord(), "Formula evidence asset ID does not match the current formula asset.", { ...CURRENT_CONTEXT, assetId: "asset-other" }],
  ["review contract version mismatch", technicalRecord({ reviewContractVersion: "phase-5b.4d.2.0" }), "Formula evidence review contract version is stale."],
  ["review contract checksum mismatch", technicalRecord({ reviewContractChecksum: "fnv1a-stale00" }), "Formula evidence review contract checksum is stale."]
];

describe("record lifecycle formula evidence evaluation", () => {
  it("returns Not Provided for absent evidence without passing review or validation", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence(undefined, CURRENT_CONTEXT);

    expect(result.technicalReview.status).toBe("Not Provided");
    expect(result.studioValidation.status).toBe("Not Provided");
    expect(result.records).toEqual([]);
  });

  it("classifies valid current technical-review evidence independently", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([technicalRecord()], CURRENT_CONTEXT);

    expect(result.technicalReview.status).toBe("Current");
    expect(result.technicalReview.currentRecords).toHaveLength(1);
    expect(result.technicalReview.currentRecords[0]).toMatchObject({
      evidenceId: "tech-001",
      outcome: "Accepted",
      status: "Current"
    });
    expect(result.studioValidation.status).toBe("Not Provided");
  });

  it("classifies valid current Studio-validation evidence independently", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([studioRecord()], CURRENT_CONTEXT);

    expect(result.studioValidation.status).toBe("Current");
    expect(result.studioValidation.currentRecords).toHaveLength(1);
    expect(result.studioValidation.currentRecords[0]).toMatchObject({
      evidenceId: "studio-001",
      outcome: "Passed",
      status: "Current"
    });
    expect(result.technicalReview.status).toBe("Not Provided");
  });

  it("keeps both evidence types current without either type implying the other", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([technicalRecord(), studioRecord()], CURRENT_CONTEXT);

    expect(result.technicalReview.status).toBe("Current");
    expect(result.studioValidation.status).toBe("Current");
    expect(result.technicalReview.records.map((record) => record.evidenceType)).toEqual(["Technical Review"]);
    expect(result.studioValidation.records.map((record) => record.evidenceType)).toEqual(["Power Apps Studio Validation"]);
  });

  it.each([
    {
      name: "Technical Review Current and Studio Validation Stale",
      records: [
        technicalRecord({ evidenceId: "tech-current" }),
        studioRecord({ evidenceId: "studio-stale", reviewContractChecksum: "fnv1a-stale00" })
      ],
      technical: { status: "Current", current: 1, stale: 0, invalid: 0 },
      studio: { status: "Stale", current: 0, stale: 1, invalid: 0 }
    },
    {
      name: "Technical Review Stale and Studio Validation Current",
      records: [
        technicalRecord({ evidenceId: "tech-stale", reviewContractVersion: "phase-5b.4d.2.0" }),
        studioRecord({ evidenceId: "studio-current" })
      ],
      technical: { status: "Stale", current: 0, stale: 1, invalid: 0 },
      studio: { status: "Current", current: 1, stale: 0, invalid: 0 }
    },
    {
      name: "Technical Review Invalid and Studio Validation Current",
      records: [
        technicalRecord({ evidenceId: "invalid technical id" }),
        studioRecord({ evidenceId: "studio-current" })
      ],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Current", current: 1, stale: 0, invalid: 0 }
    },
    {
      name: "Technical Review Current and Studio Validation Invalid",
      records: [
        technicalRecord({ evidenceId: "tech-current" }),
        studioRecord({ evidenceId: "invalid studio id" })
      ],
      technical: { status: "Current", current: 1, stale: 0, invalid: 0 },
      studio: { status: "Invalid", current: 0, stale: 0, invalid: 1 }
    },
    {
      name: "Technical Review Stale and Studio Validation Stale",
      records: [
        technicalRecord({ evidenceId: "tech-stale", projectId: "project-other" }),
        studioRecord({ evidenceId: "studio-stale", assetId: "asset-other" })
      ],
      technical: { status: "Stale", current: 0, stale: 1, invalid: 0 },
      studio: { status: "Stale", current: 0, stale: 1, invalid: 0 }
    },
    {
      name: "Technical Review Invalid and Studio Validation Invalid",
      records: [
        technicalRecord({ evidenceId: "invalid technical id" }),
        studioRecord({ evidenceId: "invalid studio id" })
      ],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Invalid", current: 0, stale: 0, invalid: 1 }
    }
  ] as const)("$name", ({ records, technical, studio }) => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence(records, CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, technical);
    expectTypeResult(result.studioValidation, studio);
    if (technical.status === "Current") expect(result.technicalReview.currentRecords[0].evidenceType).toBe("Technical Review");
    if (studio.status === "Current") expect(result.studioValidation.currentRecords[0].evidenceType).toBe("Power Apps Studio Validation");
  });

  it("preserves passing and failing outcomes as distinct current evidence states", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "tech-rejected", outcome: "Rejected", rejectionReason: "Contract issue." }),
      studioRecord({ evidenceId: "studio-failed", outcome: "Failed", checks: studioChecks({ failurePathPassed: false }) })
    ], CURRENT_CONTEXT);

    expect(result.technicalReview.status).toBe("Current");
    expect(result.technicalReview.currentRecords[0].outcome).toBe("Rejected");
    expect(result.studioValidation.status).toBe("Current");
    expect(result.studioValidation.currentRecords[0].outcome).toBe("Failed");
    expect(result.technicalReview.invalidRecords).toEqual([]);
    expect(result.studioValidation.invalidRecords).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("Approved");
    expect(JSON.stringify(result)).not.toContain("Ready for Export");
  });

  it("keeps evidence outcome separate from the other evidence type classification", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "tech-rejected-current", outcome: "Rejected", rejectionReason: "Rejected but structurally current." }),
      studioRecord({
        evidenceId: "studio-failed-stale",
        outcome: "Failed",
        checks: studioChecks({ failurePathPassed: false }),
        reviewContractChecksum: "fnv1a-stale00"
      })
    ], CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Current", current: 1, stale: 0, invalid: 0 });
    expectTypeResult(result.studioValidation, { status: "Stale", current: 0, stale: 1, invalid: 0 });
    expect(result.technicalReview.currentRecords[0].outcome).toBe("Rejected");
    expect(result.studioValidation.staleRecords[0].outcome).toBe("Failed");
  });

  it.each(staleEvidenceCases)("classifies stale evidence for %s", (_name, record, expectedIssue, context = CURRENT_CONTEXT) => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([record], context);

    expect(result.technicalReview.status).toBe("Stale");
    expect(result.technicalReview.staleRecords).toHaveLength(1);
    expect(result.technicalReview.staleRecords[0].issues).toContain(expectedIssue);
  });

  it("classifies structurally valid non-current asset IDs as Stale without storage normalization", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "tech-other-asset", assetId: "asset-other-valid-safe-id", outcome: "Rejected", rejectionReason: "Wrong asset." }),
      studioRecord({ evidenceId: "studio-other-asset", assetId: "asset-other-valid-safe-id", outcome: "Failed", checks: studioChecks({ failurePathPassed: false }) })
    ], CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Stale", current: 0, stale: 1, invalid: 0 });
    expectTypeResult(result.studioValidation, { status: "Stale", current: 0, stale: 1, invalid: 0 });
    expect(result.technicalReview.staleRecords[0]).toMatchObject({ evidenceId: "tech-other-asset", outcome: "Rejected" });
    expect(result.studioValidation.staleRecords[0]).toMatchObject({ evidenceId: "studio-other-asset", outcome: "Failed" });
    expect(recordIds(result.records)).toEqual(["tech-other-asset", "studio-other-asset"]);
  });

  it.each([
    ["missing asset ID", undefined],
    ["null asset ID", null],
    ["numeric asset ID", 123],
    ["blank asset ID", ""],
    ["over-length asset ID", `A${"a".repeat(200)}`],
    ["multiline asset ID", "asset-one\nasset-two"],
    ["control-character asset ID", `asset${String.fromCharCode(7)}`],
    ["formula-source-bearing asset ID", "Patch(Requests,{})"]
  ])("classifies malformed asset identity as Invalid for %s", (_name, assetId) => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([technicalRecord({ assetId })], CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Invalid", current: 0, stale: 0, invalid: 1 });
    expect(result.technicalReview.invalidRecords[0].issues).toContain("Formula evidence record is malformed or missing required validation fields.");
  });

  it("preserves canonical storage normalization while allowing evaluator-only stale asset classification", () => {
    const canonical = technicalRecord({ evidenceId: "canonical-asset" });
    const nonCanonical = technicalRecord({ evidenceId: "non-canonical-asset", assetId: "asset-other-valid-safe-id" });

    expect(normalizeRecordLifecycleFormulaReviewEvidence([canonical])).toHaveLength(1);
    expect(normalizeRecordLifecycleFormulaReviewEvidence([nonCanonical])).toEqual([]);

    const result = evaluateRecordLifecycleFormulaReviewEvidence([nonCanonical], CURRENT_CONTEXT);
    expectTypeResult(result.technicalReview, { status: "Stale", current: 0, stale: 1, invalid: 0 });
    expect(result.technicalReview.staleRecords[0].evidenceId).toBe("non-canonical-asset");
  });

  it.each([
    ["unsupported schema version", technicalRecord({ evidenceSchemaVersion: "phase-5b.4d.2.2.0" }), "Formula evidence schema version is unsupported."],
    ["malformed evidence ID", technicalRecord({ evidenceId: "bad id" }), "Formula evidence record is malformed or missing required validation fields."],
    ["malformed timestamp", technicalRecord({ recordedAt: "2026-07-31 12:34:56" }), "Formula evidence record is malformed or missing required validation fields."],
    ["missing required technical field", technicalRecord({ reviewerRole: "" }), "Formula evidence record is malformed or missing required validation fields."],
    ["missing required Studio check", studioRecord({ checks: { ...studioChecks(), failurePathPassed: undefined } }), "Formula evidence record is malformed or missing required validation fields."]
  ])("classifies invalid evidence for %s", (_name, record, expectedIssue) => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([record], CURRENT_CONTEXT);
    const bucket = record.evidenceType === "Power Apps Studio Validation"
      ? result.studioValidation
      : result.technicalReview;

    expect(bucket.status).toBe("Invalid");
    expect(bucket.invalidRecords).toHaveLength(1);
    expect(bucket.invalidRecords[0].issues).toContain(expectedIssue);
  });

  it("marks duplicate evidence IDs invalid without hiding unrelated valid records", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "duplicate-id" }),
      technicalRecord({ evidenceId: "duplicate-id", recordedAt: "2026-07-31T13:00:00Z" }),
      technicalRecord({ evidenceId: "valid-current" })
    ], CURRENT_CONTEXT);

    expect(result.technicalReview.status).toBe("Current");
    expect(result.technicalReview.invalidRecords.map((record) => record.evidenceId)).toEqual(["duplicate-id", "duplicate-id"]);
    expect(result.technicalReview.currentRecords.map((record) => record.evidenceId)).toEqual(["valid-current"]);
  });

  it("marks duplicate IDs within Studio Validation evidence invalid", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      studioRecord({ evidenceId: "duplicate-studio" }),
      studioRecord({ evidenceId: "duplicate-studio", recordedAt: "2026-07-31T14:00:00Z" }),
      studioRecord({ evidenceId: "studio-valid-current" })
    ], CURRENT_CONTEXT);

    expectTypeResult(result.studioValidation, { status: "Current", current: 1, stale: 0, invalid: 2 });
    expect(recordIds(result.studioValidation.invalidRecords)).toEqual(["duplicate-studio", "duplicate-studio"]);
    expect(recordIds(result.studioValidation.currentRecords)).toEqual(["studio-valid-current"]);
  });

  it("marks the same duplicate ID across Technical Review and Studio Validation invalid for both affected records", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "shared-duplicate" }),
      studioRecord({ evidenceId: "shared-duplicate" }),
      technicalRecord({ evidenceId: "unrelated-tech-current" }),
      studioRecord({ evidenceId: "unrelated-studio-current" })
    ], CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Current", current: 1, stale: 0, invalid: 1 });
    expectTypeResult(result.studioValidation, { status: "Current", current: 1, stale: 0, invalid: 1 });
    expect(recordIds(result.technicalReview.invalidRecords)).toEqual(["shared-duplicate"]);
    expect(recordIds(result.studioValidation.invalidRecords)).toEqual(["shared-duplicate"]);
  });

  it("keeps unrelated current Technical Review evidence visible beside duplicate invalid evidence", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      studioRecord({ evidenceId: "duplicate-invalid" }),
      studioRecord({ evidenceId: "duplicate-invalid", recordedAt: "2026-07-31T14:00:00Z" }),
      technicalRecord({ evidenceId: "tech-current-unrelated" })
    ], CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Current", current: 1, stale: 0, invalid: 0 });
    expectTypeResult(result.studioValidation, { status: "Invalid", current: 0, stale: 0, invalid: 2 });
    expect(recordIds(result.technicalReview.currentRecords)).toEqual(["tech-current-unrelated"]);
  });

  it("keeps unrelated current Studio Validation evidence visible beside duplicate invalid evidence", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "duplicate-invalid" }),
      technicalRecord({ evidenceId: "duplicate-invalid", recordedAt: "2026-07-31T14:00:00Z" }),
      studioRecord({ evidenceId: "studio-current-unrelated" })
    ], CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Invalid", current: 0, stale: 0, invalid: 2 });
    expectTypeResult(result.studioValidation, { status: "Current", current: 1, stale: 0, invalid: 0 });
    expect(recordIds(result.studioValidation.currentRecords)).toEqual(["studio-current-unrelated"]);
  });

  it("keeps exact behavior when one duplicate-ID record is otherwise malformed", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "malformed-pair" }),
      technicalRecord({ evidenceId: "malformed-pair", recordedAt: "not-a-timestamp" })
    ], CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Current", current: 1, stale: 0, invalid: 1 });
    expect(recordIds(result.technicalReview.currentRecords)).toEqual(["malformed-pair"]);
    expect(result.technicalReview.invalidRecords[0].evidenceId).toBeUndefined();
    expect(result.technicalReview.invalidRecords[0].issues).not.toContain("Duplicate formula evidence ID.");
  });

  it("does not mutate input while evaluating duplicate IDs", () => {
    const records = [
      technicalRecord({ evidenceId: "duplicate-id" }),
      studioRecord({ evidenceId: "duplicate-id" }),
      studioRecord({ evidenceId: "studio-current" })
    ];
    const before = cloneDeep(records);

    evaluateRecordLifecycleFormulaReviewEvidence(records, CURRENT_CONTEXT);

    expect(records).toEqual(before);
  });

  it("retains stale history alongside newer current evidence", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({
        evidenceId: "older-stale",
        recordedAt: "2026-07-30T12:00:00Z",
        reviewContractChecksum: "fnv1a-older00"
      }),
      technicalRecord({
        evidenceId: "newer-current",
        recordedAt: "2026-07-31T12:00:00Z"
      })
    ], CURRENT_CONTEXT);

    expect(result.technicalReview.status).toBe("Current");
    expect(result.technicalReview.records.map((record) => [record.evidenceId, record.status])).toEqual([
      ["older-stale", "Stale"],
      ["newer-current", "Current"]
    ]);
  });

  it("keeps equivalent semantic results when input records are reordered", () => {
    const records = [
      technicalRecord({ evidenceId: "tech-current" }),
      technicalRecord({ evidenceId: "tech-stale", reviewContractChecksum: "fnv1a-stale00" }),
      technicalRecord({ evidenceId: "invalid technical id" }),
      studioRecord({ evidenceId: "studio-current" }),
      studioRecord({ evidenceId: "studio-stale", reviewContractVersion: "phase-5b.4d.2.0" }),
      studioRecord({ evidenceId: "invalid studio id" })
    ];

    const forward = evaluateRecordLifecycleFormulaReviewEvidence(records, CURRENT_CONTEXT);
    const reversed = evaluateRecordLifecycleFormulaReviewEvidence([...records].reverse(), CURRENT_CONTEXT);

    expect(semanticSummary(reversed)).toEqual(semanticSummary(forward));
  });

  it("preserves deterministic output order without selecting a newest-record-wins evidence record", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "older-current", recordedAt: "2026-07-30T12:00:00Z" }),
      technicalRecord({ evidenceId: "newer-current", recordedAt: "2026-07-31T12:00:00Z" }),
      technicalRecord({ evidenceId: "newest-stale", recordedAt: "2026-08-01T12:00:00Z", reviewContractChecksum: "fnv1a-stale00" })
    ], CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Current", current: 2, stale: 1, invalid: 0 });
    expect(recordIds(result.technicalReview.currentRecords)).toEqual(["older-current", "newer-current"]);
    expect(recordIds(result.technicalReview.staleRecords)).toEqual(["newest-stale"]);
    expect(recordIds(result.technicalReview.records)).toEqual(["older-current", "newer-current", "newest-stale"]);
  });

  it("does not let invalid records hide valid current evidence", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "invalid-source", notes: "Do not retain Patch(" }),
      technicalRecord({ evidenceId: "valid-current" })
    ], CURRENT_CONTEXT);

    expect(result.technicalReview.status).toBe("Current");
    expect(result.technicalReview.invalidRecords).toHaveLength(1);
    expect(result.technicalReview.currentRecords).toHaveLength(1);
  });

  it("does not let invalid records hide current Studio Validation evidence", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      studioRecord({ evidenceId: "invalid-studio-source", notes: "Do not retain Patch(" }),
      studioRecord({ evidenceId: "valid-studio-current" })
    ], CURRENT_CONTEXT);

    expectTypeResult(result.studioValidation, { status: "Current", current: 1, stale: 0, invalid: 1 });
    expect(recordIds(result.studioValidation.currentRecords)).toEqual(["valid-studio-current"]);
  });

  it("does not mutate the input evidence array or evidence objects", () => {
    const records = [
      technicalRecord({ evidenceId: "tech-current" }),
      studioRecord({ evidenceId: "studio-stale", reviewContractChecksum: "fnv1a-stale00" }),
      technicalRecord({ evidenceId: "invalid technical id" })
    ];
    const before = cloneDeep(records);

    evaluateRecordLifecycleFormulaReviewEvidence(records, CURRENT_CONTEXT);

    expect(records).toEqual(before);
  });

  it.each([
    {
      name: "top-level undefined",
      input: undefined,
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 0,
      collectionIssues: 0
    },
    {
      name: "top-level null",
      input: null,
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 0,
      collectionIssues: 0
    },
    {
      name: "top-level string",
      input: "not-an-array",
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Invalid", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 0,
      collectionIssues: 1
    },
    {
      name: "top-level number",
      input: 123,
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Invalid", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 0,
      collectionIssues: 1
    },
    {
      name: "top-level boolean",
      input: true,
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Invalid", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 0,
      collectionIssues: 1
    },
    {
      name: "plain object instead of array",
      input: { evidenceType: "Technical Review" },
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Invalid", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 0,
      collectionIssues: 1
    },
    {
      name: "sparse array",
      input: (() => {
        const sparse: unknown[] = [];
        sparse[1] = technicalRecord({ evidenceId: "sparse-current" });
        return sparse;
      })(),
      technical: { status: "Current", current: 1, stale: 0, invalid: 0 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 0,
      collectionIssues: 1
    },
    {
      name: "array containing null",
      input: [null],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "array containing a string",
      input: ["bad"],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "array containing a number",
      input: [123],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "array containing a boolean",
      input: [false],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "array containing an empty object",
      input: [{}],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "missing evidence ID",
      input: [technicalRecord({ evidenceId: undefined })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "invalid evidence ID",
      input: [technicalRecord({ evidenceId: "bad id" })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "missing recorded timestamp",
      input: [technicalRecord({ recordedAt: undefined })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "invalid recorded timestamp",
      input: [technicalRecord({ recordedAt: "not-a-timestamp" })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "unsupported schema version",
      input: [technicalRecord({ evidenceSchemaVersion: "phase-5b.4d.2.2.0" })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "unknown evidence type",
      input: [technicalRecord({ evidenceType: "Unknown Evidence" })],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "missing project ID",
      input: [technicalRecord({ projectId: undefined })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "missing asset ID",
      input: [technicalRecord({ assetId: undefined })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "missing review contract version",
      input: [technicalRecord({ reviewContractVersion: undefined })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "missing review contract checksum",
      input: [technicalRecord({ reviewContractChecksum: undefined })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "missing required Technical Review fields",
      input: [technicalRecord({ reviewerDisplayName: "", reviewerRole: "" })],
      technical: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "missing required Studio Validation fields",
      input: [studioRecord({ validationEnvironment: "" })],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "partial Studio Validation checks",
      input: [studioRecord({ checks: Object.fromEntries(RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS.slice(1).map((check) => [check, true])) })],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "incorrect Studio Validation check value types",
      input: [studioRecord({ checks: { ...studioChecks(), failurePathPassed: "yes" } })],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Invalid", current: 0, stale: 0, invalid: 1 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "mixed valid, stale, and invalid Technical Review records",
      input: [
        technicalRecord({ evidenceId: "tech-current" }),
        technicalRecord({ evidenceId: "tech-stale", reviewContractChecksum: "fnv1a-stale00" }),
        technicalRecord({ evidenceId: "invalid technical id" })
      ],
      technical: { status: "Current", current: 1, stale: 1, invalid: 1 },
      studio: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "mixed valid, stale, and invalid Studio Validation records",
      input: [
        studioRecord({ evidenceId: "studio-current" }),
        studioRecord({ evidenceId: "studio-stale", reviewContractVersion: "phase-5b.4d.2.0" }),
        studioRecord({ evidenceId: "invalid studio id" })
      ],
      technical: { status: "Not Provided", current: 0, stale: 0, invalid: 0 },
      studio: { status: "Current", current: 1, stale: 1, invalid: 1 },
      invalidRecords: 1,
      collectionIssues: 0
    },
    {
      name: "mixed valid, stale, and invalid records across both evidence types",
      input: [
        technicalRecord({ evidenceId: "tech-current" }),
        technicalRecord({ evidenceId: "tech-stale", reviewContractChecksum: "fnv1a-stale00" }),
        technicalRecord({ evidenceId: "invalid technical id" }),
        studioRecord({ evidenceId: "studio-current" }),
        studioRecord({ evidenceId: "studio-stale", reviewContractVersion: "phase-5b.4d.2.0" }),
        studioRecord({ evidenceId: "invalid studio id" })
      ],
      technical: { status: "Current", current: 1, stale: 1, invalid: 1 },
      studio: { status: "Current", current: 1, stale: 1, invalid: 1 },
      invalidRecords: 2,
      collectionIssues: 0
    }
  ] as const)("handles malformed runtime input: $name", ({ input, technical, studio, invalidRecords, collectionIssues }) => {
    let result: ReturnType<typeof evaluateRecordLifecycleFormulaReviewEvidence> | undefined;

    expect(() => {
      result = evaluateRecordLifecycleFormulaReviewEvidence(input, CURRENT_CONTEXT);
    }).not.toThrow();

    expect(result).toBeDefined();
    expectTypeResult(result!.technicalReview, technical);
    expectTypeResult(result!.studioValidation, studio);
    expect(result!.records.filter((record) => record.status === "Invalid")).toHaveLength(invalidRecords);
    expect(result!.collectionIssues).toHaveLength(collectionIssues);
  });

  it("records one collection issue for each sparse hole without fabricating evidence", () => {
    const sparse = new Array(3);
    const result = evaluateRecordLifecycleFormulaReviewEvidence(sparse, CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Not Provided", current: 0, stale: 0, invalid: 0 });
    expectTypeResult(result.studioValidation, { status: "Not Provided", current: 0, stale: 0, invalid: 0 });
    expect(result.records).toEqual([]);
    expect(result.collectionIssues).toEqual([
      "Formula evidence collection contains a sparse entry at index 0.",
      "Formula evidence collection contains a sparse entry at index 1.",
      "Formula evidence collection contains a sparse entry at index 2."
    ]);
    expect(0 in sparse).toBe(false);
    expect(1 in sparse).toBe(false);
    expect(2 in sparse).toBe(false);
  });

  it("keeps valid records before and after sparse holes without mutating or compacting input", () => {
    const sparse: unknown[] = [];
    sparse[0] = technicalRecord({ evidenceId: "before-hole" });
    sparse[2] = studioRecord({ evidenceId: "after-hole" });
    const beforeKeys = Object.keys(sparse);
    const beforeFirst = cloneDeep(sparse[0]);
    const beforeLast = cloneDeep(sparse[2]);

    const result = evaluateRecordLifecycleFormulaReviewEvidence(sparse, CURRENT_CONTEXT);

    expectTypeResult(result.technicalReview, { status: "Current", current: 1, stale: 0, invalid: 0 });
    expectTypeResult(result.studioValidation, { status: "Current", current: 1, stale: 0, invalid: 0 });
    expect(recordIds(result.records)).toEqual(["before-hole", "after-hole"]);
    expect(result.collectionIssues).toEqual(["Formula evidence collection contains a sparse entry at index 1."]);
    expect(Object.keys(sparse)).toEqual(beforeKeys);
    expect(sparse[0]).toEqual(beforeFirst);
    expect(sparse[2]).toEqual(beforeLast);
    expect(1 in sparse).toBe(false);
  });

  it("does not return formula source in evaluator results", () => {
    const result = evaluateRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "source-attempt", notes: "Patch(Requests,{Title:\"x\"})" }),
      studioRecord({ evidenceId: "studio-current" }),
      {
        evidenceType: "Technical Review",
        sourceContent: "Patch(Requests,{Title:\"x\"})",
        generatedSource: "Notify(\"done\")",
        copyableFormulaContent: "Set(varReady,true)",
        serializedFormulaContent: "IfError(Patch(Requests,{}),Notify(\"failed\"))"
      }
    ], CURRENT_CONTEXT);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("Patch(");
    expect(serialized).not.toContain("Notify(");
    expect(serialized).not.toContain("Set(");
    expect(serialized).not.toContain("IfError(");
    expect(serialized).not.toContain("Requests");
    expect(serialized).not.toContain("sourceContent");
    expect(serialized).not.toContain("generatedSource");
    expect(serialized).not.toContain("copyableFormulaContent");
    expect(serialized).not.toContain("serializedFormulaContent");
    expect(serialized).not.toContain("manualInstallationRequirements");
    expect(serialized).not.toContain("intendedPath");
  });

  it("does not promote project status, review status, approval, or readiness", () => {
    const evidence = normalizeRecordLifecycleFormulaReviewEvidence([technicalRecord(), studioRecord()]);
    const project = canvasProjectWithEvidence(evidence);
    project.readinessConfirmations = { projectTypeConfirmed: false, scopeReviewed: false };
    const projectBefore = cloneDeep(project);
    const registry = buildImplementationAssetRegistry(project, NOW);
    const registryBefore = cloneDeep(registry);
    const beforeReviewState = buildRecordLifecycleFormulaReviewState(registry);

    const result = evaluateRecordLifecycleFormulaReviewEvidence(evidence, CURRENT_CONTEXT);
    const afterReviewState = buildRecordLifecycleFormulaReviewState(registry);
    const formulaAsset = registry.assets.find((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID);

    expect(result.technicalReview.status).toBe("Current");
    expect(result.studioValidation.status).toBe("Current");
    expect(project.status).toBe("Intake Started");
    expect(project.reviewStatus).toBe("Not reviewed");
    expect(formulaAsset?.approvalStatus).not.toBe("Approved");
    expect(formulaAsset?.assetStatus).not.toBe("Ready for Export");
    expect(afterReviewState).toEqual(beforeReviewState);
    expect(project).toEqual(projectBefore);
    expect(registry).toEqual(registryBefore);
    expect(project.readinessConfirmations).toEqual(projectBefore.readinessConfirmations);
    expect(project.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual(projectBefore.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence);
    expect(registry.summary.blockedAssetCount).toBe(registryBefore.summary.blockedAssetCount);
    expect(registry.summary.readyAssetCount).toBe(registryBefore.summary.readyAssetCount);
    expect(registry.assets.map((asset) => [asset.assetId, asset.approvalStatus, asset.assetStatus])).toEqual(
      registryBefore.assets.map((asset) => [asset.assetId, asset.approvalStatus, asset.assetStatus])
    );
  });

  it("keeps evidence and evaluator states out of generated package, manifest, ZIP, and export-integrity output", async () => {
    const evidence = normalizeRecordLifecycleFormulaReviewEvidence([
      technicalRecord({ evidenceId: "internal-current-evaluation" })
    ]);
    const project = canvasProjectWithEvidence(evidence);
    const registry = buildImplementationAssetRegistry(project);
    const implementationManifest = createImplementationAssetManifest(registry, project);
    const generated = generateProjectPackage(project);
    const exportProject = { ...project, generatedDocuments: generated.documents, packageGeneratedAt: "2026-07-31T12:00:00.000Z" };
    const integrity = validateExportPackage(exportProject, "2026-07-31T12:00:00.000Z");
    const exportManifest = createExportManifest(exportProject, integrity);
    const zipText = await zipContentText(await createProjectArchive(exportProject, { exportedAt: "2026-07-31T12:00:00.000Z" }));
    const documentText = generated.documents.map((document) => document.content).join("\n");
    const documentByName = new Map(generated.documents.map((document) => [document.fileName, document.content]));

    expect(JSON.stringify(implementationManifest)).not.toContain("internal-current-evaluation");
    expect(documentText).not.toContain("internal-current-evaluation");
    expect(documentText).not.toContain("Formula evidence");
    expect(documentByName.get("ARCHITECT_INSTRUCTIONS.md")).not.toContain("internal-current-evaluation");
    expect(documentByName.get("CODEX_INSTRUCTIONS.md")).not.toContain("internal-current-evaluation");
    expect(documentByName.get("PHASED_CODEX_PROMPTS.md")).not.toContain("internal-current-evaluation");
    expect(JSON.stringify(exportManifest)).not.toContain("internal-current-evaluation");
    expect(JSON.stringify(integrity)).not.toContain("internal-current-evaluation");
    expect(zipText).not.toContain("internal-current-evaluation");
    expect(zipText).not.toContain("Formula evidence");
    expect(JSON.stringify({ exportManifest, integrity, implementationManifest })).not.toContain("sourceContent");
  });

  it("does not create evidence for TTI-like Draft projects or nonexistent current formula assets", () => {
    const project = createProject({
      identity: { id: "tti-like-draft", projectName: "TTI Software Licence Tracker" },
      intake: { appType: "powerAppsCanvas", appPurpose: "Draft tracker" }
    });
    project.status = "Intake Started";
    project.reviewStatus = "Review needed";
    project.powerPlatform = normalizePowerPlatformData({
      common: {
        securityReviewStatus: "blocked",
        testingPlanConfirmationStatus: "blocked",
        almConfirmationStatus: "blocked",
        deploymentResponsibilityStatus: "blocked",
        releaseApprovalStatus: "blocked"
      },
      canvas: {
        recordLifecycleTargets: [],
        recordLifecycleFormulaReviewEvidence: undefined,
        sharePointColumnSchemas: [],
        screenTargets: [],
        controlTargets: [],
        schemaStatus: "blocked",
        internalNameStatus: "blocked",
        yamlStatus: "blocked",
        delegationStatus: "blocked",
        powerFxStatus: "blocked",
        deleteRestrictions: PERMANENT_DELETE_BLOCKER
      }
    }, "powerAppsCanvas");
    const registryBefore = buildImplementationAssetRegistry(project, NOW);
    const reviewStateBefore = buildRecordLifecycleFormulaReviewState(registryBefore);
    const projectBefore = cloneDeep(project);

    const result = evaluateRecordLifecycleFormulaReviewEvidence(
      project.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence,
      {}
    );
    const registryAfter = buildImplementationAssetRegistry(project, NOW);
    const reviewStateAfter = buildRecordLifecycleFormulaReviewState(registryAfter);
    const projectJson = JSON.stringify(project);
    const registryJson = JSON.stringify(registryAfter);

    expect(project.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual([]);
    expect(result.technicalReview.status).toBe("Not Provided");
    expect(result.studioValidation.status).toBe("Not Provided");
    expect(project.status).toBe("Intake Started");
    expect(project.reviewStatus).toBe("Review needed");
    expect(registryAfter.packageReadiness).toBe("Draft");
    expect(registryAfter.assets.some((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID)).toBe(false);
    expect(registryJson).not.toContain("Patch(");
    expect(registryJson).not.toContain("Remove(");
    expect(registryJson).not.toContain("RemoveIf(");
    expect(registryJson).not.toContain("sourceContent\":\"Patch");
    expect(registryAfter.assets.some((asset) => asset.approvalStatus === "Approved")).toBe(false);
    expect(registryAfter.assets.some((asset) => asset.assetStatus === "Ready for Export")).toBe(false);
    expect(project.powerPlatform?.canvas?.sharePointColumnSchemas).toEqual([]);
    expect(project.powerPlatform?.canvas?.screenTargets).toEqual([]);
    expect(project.powerPlatform?.canvas?.controlTargets).toEqual([]);
    expect(project.powerPlatform?.canvas?.schemaStatus).toBe("blocked");
    expect(project.powerPlatform?.canvas?.internalNameStatus).toBe("blocked");
    expect(project.powerPlatform?.common.securityReviewStatus).toBe("blocked");
    expect(project.powerPlatform?.common.testingPlanConfirmationStatus).toBe("blocked");
    expect(project.powerPlatform?.canvas?.yamlStatus).toBe("blocked");
    expect(project.powerPlatform?.canvas?.delegationStatus).toBe("blocked");
    expect(project.powerPlatform?.common.almConfirmationStatus).toBe("blocked");
    expect(project.powerPlatform?.common.deploymentResponsibilityStatus).toBe("blocked");
    expect(project.powerPlatform?.common.releaseApprovalStatus).toBe("blocked");
    expect(project.powerPlatform?.canvas?.deleteRestrictions).toBe(PERMANENT_DELETE_BLOCKER);
    expect(reviewStateAfter).toEqual(reviewStateBefore);
    expect(registryAfter.summary.blockedAssetCount).toBe(registryBefore.summary.blockedAssetCount);
    expect(project).toEqual(projectBefore);
    expect(projectJson).not.toContain("ORG-4878");
    expect(projectJson).not.toContain("ND-DN");
    expect(projectJson).not.toContain("SoftwareTitles");
    expect(projectJson).not.toContain("SoftwareLicences");
    expect(projectJson).not.toContain("SoftwareUsers");
  });
});
