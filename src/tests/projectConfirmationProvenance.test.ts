import { describe, expect, it } from "vitest";
import {
  PROJECT_CONFIRMATION_ACTION_ORIGIN,
  PROJECT_CONFIRMATION_ASSURANCE_TYPE,
  PROJECT_CONFIRMATION_CONTRACT_VERSION,
  PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
  PROJECT_CONFIRMATION_NORMALIZATION_VERSION,
  PROJECT_CONFIRMATION_PROVENANCE_ISSUE_CODES,
  PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
  PROJECT_CONFIRMATION_SOURCE_FIELD_IDS,
  PROJECT_CONFIRMATION_VALUE_KIND,
  isCanonicalProjectConfirmationUuid,
  isProjectConfirmationValueFingerprint,
  normalizeProjectConfirmationSourceText,
  validateProjectConfirmationProvenance,
  type ProjectConfirmationSourceFieldId,
  type ProjectFieldConfirmationEvent
} from "../lib/projectConfirmationProvenance";
import { getApplicableProjectConfirmationSourceFieldIds } from "../lib/projectConfirmationSourceRegistry";

const PROJECT_ID = "project-confirmation-contract-test";
const REVISION_IDS = [
  "10000000-0000-4000-8000-000000000001",
  "10000000-0000-4000-8000-000000000002",
  "10000000-0000-4000-8000-000000000003",
  "10000000-0000-4000-8000-000000000004",
  "10000000-0000-4000-8000-000000000005",
  "10000000-0000-4000-8000-000000000006",
  "10000000-0000-4000-8000-000000000007"
] as const;

function applicable(projectType: string): readonly ProjectConfirmationSourceFieldId[] {
  const result = getApplicableProjectConfirmationSourceFieldIds(
    PROJECT_CONFIRMATION_CONTRACT_VERSION,
    projectType
  );
  expect(result.outcome).toBe("resolved");
  return result.sourceFieldIds;
}

function revisionsFor(sourceFieldIds: readonly ProjectConfirmationSourceFieldId[]) {
  return Object.fromEntries(sourceFieldIds.map((sourceFieldId, index) => [
    sourceFieldId,
    { revisionId: REVISION_IDS[index] }
  ])) as Partial<Record<ProjectConfirmationSourceFieldId, { revisionId: string }>>;
}

function event(
  overrides: Partial<ProjectFieldConfirmationEvent> = {}
): ProjectFieldConfirmationEvent {
  return {
    confirmationId: "20000000-0000-4000-8000-000000000001",
    confirmationContractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    projectId: PROJECT_ID,
    sourceFieldId: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0],
    sourceFieldRevisionId: REVISION_IDS[0],
    valueKind: PROJECT_CONFIRMATION_VALUE_KIND,
    serializationVersion: PROJECT_CONFIRMATION_SERIALIZATION_VERSION,
    fingerprintVersion: PROJECT_CONFIRMATION_FINGERPRINT_VERSION,
    valueFingerprint: "a".repeat(64),
    confirmationActionId: "30000000-0000-4000-8000-000000000001",
    actionOrigin: PROJECT_CONFIRMATION_ACTION_ORIGIN,
    confirmedAt: "2026-08-27T12:00:00.000Z",
    actorAssurance: {
      contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
      assuranceType: PROJECT_CONFIRMATION_ASSURANCE_TYPE
    },
    ...overrides
  };
}

function provenance(
  sourceFieldIds: readonly ProjectConfirmationSourceFieldId[],
  confirmationEvents: readonly ProjectFieldConfirmationEvent[] = []
) {
  return {
    contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
    fieldRevisions: revisionsFor(sourceFieldIds),
    confirmationEvents
  };
}

describe("project confirmation provenance contract", () => {
  it("locks the approved contract and scalar metadata versions", () => {
    expect(PROJECT_CONFIRMATION_CONTRACT_VERSION).toBe("phase-5c.3c.3j.6b.3r");
    expect(PROJECT_CONFIRMATION_VALUE_KIND).toBe("text");
    expect(PROJECT_CONFIRMATION_NORMALIZATION_VERSION).toBe("normalized-project-string-v1");
    expect(PROJECT_CONFIRMATION_SERIALIZATION_VERSION).toBe("canonical-text-json-v1");
    expect(PROJECT_CONFIRMATION_FINGERPRINT_VERSION).toBe("sha256-v1");
    expect(PROJECT_CONFIRMATION_ASSURANCE_TYPE).toBe("unauthenticatedLocalOperator");
    expect(PROJECT_CONFIRMATION_ACTION_ORIGIN).toBe("localExplicitConfirmation");
  });

  it("accepts only canonical lowercase UUID syntax", () => {
    expect(isCanonicalProjectConfirmationUuid("10000000-0000-4000-8000-000000000001")).toBe(true);
    for (const value of [
      "10000000-0000-0000-0000-000000000001",
      "10000000-0000-4000-7000-000000000001",
      "10000000-0000-6000-8000-000000000001",
      "10000000-0000-4000-8000-00000000000Z",
      "10000000-0000-4000-8000-000000000001 ",
      "abcdefab-cdef-4abc-8def-abcdefabcdef".toUpperCase(),
      "project-1",
      "",
      null
    ]) expect(isCanonicalProjectConfirmationUuid(value)).toBe(false);
  });

  it("preserves direct non-normalizing confirmation fingerprint validation", () => {
    const fingerprint = "0123456789abcdef".repeat(4);
    expect(isProjectConfirmationValueFingerprint(fingerprint)).toBe(true);
    expect(isProjectConfirmationValueFingerprint(fingerprint.toUpperCase())).toBe(false);
    expect(isProjectConfirmationValueFingerprint(` ${fingerprint}`)).toBe(false);
    expect(isProjectConfirmationValueFingerprint(`${fingerprint} `)).toBe(false);
  });

  it("preserves exact stored string semantics without coercion", () => {
    expect(normalizeProjectConfirmationSourceText("  Yes  ")).toBe("  Yes  ");
    expect(normalizeProjectConfirmationSourceText("YES")).toBe("YES");
    expect(normalizeProjectConfirmationSourceText(1)).toBeNull();
    expect(normalizeProjectConfirmationSourceText(true)).toBeNull();
    expect(normalizeProjectConfirmationSourceText(null)).toBeNull();
  });

  it("validates and freezes a Canvas provenance state with exactly seven revisions", () => {
    const sourceFieldIds = applicable("powerAppsCanvas");
    const result = validateProjectConfirmationProvenance(
      provenance(sourceFieldIds, [event()]),
      { projectId: PROJECT_ID, applicableSourceFieldIds: sourceFieldIds }
    );
    expect(result.outcome).toBe("valid");
    if (result.outcome !== "valid") return;
    expect(Object.keys(result.provenance.fieldRevisions)).toHaveLength(7);
    expect(result.provenance.confirmationEvents).toHaveLength(1);
    expect(Object.isFrozen(result.provenance)).toBe(true);
    expect(Object.isFrozen(result.provenance.fieldRevisions)).toBe(true);
    expect(Object.isFrozen(result.provenance.confirmationEvents)).toBe(true);
    expect(result.provenance.confirmationEvents[0]).not.toHaveProperty("current");
    expect(result.provenance.confirmationEvents[0]).not.toHaveProperty("readinessAuthorized");
    expect(result.provenance.confirmationEvents[0]).not.toHaveProperty("projectionAuthorized");
    expect(result.provenance.confirmationEvents[0]).not.toHaveProperty("applyAuthorized");
  });

  it("accepts a valid linear chain for a known historical source when it is currently non-applicable", () => {
    const sourceFieldIds = applicable("webApplication");
    expect(sourceFieldIds).toEqual([]);
    const first = event();
    const second = event({
      confirmationId: "20000000-0000-4000-8000-000000000002",
      confirmationActionId: "30000000-0000-4000-8000-000000000002",
      confirmedAt: "2026-08-27T12:01:00.000Z",
      supersedesConfirmationId: first.confirmationId
    });
    const result = validateProjectConfirmationProvenance(
      provenance(sourceFieldIds, [first, second]),
      { projectId: PROJECT_ID, applicableSourceFieldIds: sourceFieldIds }
    );
    expect(result.outcome).toBe("valid");
  });

  it("rejects an unknown historical source while retaining quarantine boundaries", () => {
    const sourceFieldIds = applicable("webApplication");
    const result = validateProjectConfirmationProvenance(
      provenance(sourceFieldIds, [event({
        sourceFieldId: "project-field.unknown" as ProjectConfirmationSourceFieldId
      })]),
      { projectId: PROJECT_ID, applicableSourceFieldIds: sourceFieldIds }
    );
    expect(result).toMatchObject({
      outcome: "quarantined",
      rawProvenancePresent: true,
      provenance: null,
      provenanceWritesBlocked: true,
      wholeProjectWriteDisposition: "preserveRawProvenanceExactlyOrBlock"
    });
    expect(result.issueCodes).toContain("unsupportedSourceField");
  });

  it("requires the exact applicable revision key set", () => {
    const canvasIds = applicable("powerAppsCanvas");
    const missing = validateProjectConfirmationProvenance(
      provenance(canvasIds.slice(0, 6)),
      { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
    );
    const nonCanvasIds = applicable("webApplication");
    const unexpected = validateProjectConfirmationProvenance(
      provenance([PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[0]]),
      { projectId: PROJECT_ID, applicableSourceFieldIds: nonCanvasIds }
    );
    expect(missing.issueCodes).toContain("applicableRevisionSetMismatch");
    expect(unexpected.issueCodes).toContain("applicableRevisionSetMismatch");
  });

  it("rejects duplicate revision identities and malformed revisions", () => {
    const canvasIds = applicable("powerAppsCanvas");
    const state = provenance(canvasIds);
    state.fieldRevisions[canvasIds[1]] = { revisionId: REVISION_IDS[0] };
    const duplicate = validateProjectConfirmationProvenance(
      state,
      { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
    );
    expect(duplicate.issueCodes).toContain("duplicateRevisionIdentity");

    const malformed = provenance(canvasIds);
    malformed.fieldRevisions[canvasIds[0]] = { revisionId: "project-1" };
    expect(validateProjectConfirmationProvenance(
      malformed,
      { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
    ).issueCodes).toContain("invalidRevision");
  });

  it("fails closed on missing and unknown-version provenance", () => {
    const missing = validateProjectConfirmationProvenance(undefined, {
      projectId: PROJECT_ID,
      applicableSourceFieldIds: []
    });
    expect(missing).toMatchObject({ outcome: "quarantined", rawProvenancePresent: false });
    expect(missing.issueCodes).toEqual(["missingProvenance"]);

    const unsupported = validateProjectConfirmationProvenance({
      ...provenance([]),
      contractVersion: "phase-future"
    }, { projectId: PROJECT_ID, applicableSourceFieldIds: [] });
    expect(unsupported.issueCodes).toContain("unsupportedContractVersion");
  });

  it("rejects project, fingerprint, action, assurance, and authority-field violations", () => {
    const canvasIds = applicable("powerAppsCanvas");
    const cases: Array<[string, ProjectFieldConfirmationEvent, string]> = [
      ["project", event({ projectId: "another-project" }), "projectMismatch"],
      ["fingerprint", event({ valueFingerprint: "raw-value" }), "invalidFingerprint"],
      ["action", event({ confirmationActionId: "action-1" }), "invalidAction"],
      ["assurance", event({ actorAssurance: {
        contractVersion: PROJECT_CONFIRMATION_CONTRACT_VERSION,
        assuranceType: "authenticatedUser" as typeof PROJECT_CONFIRMATION_ASSURANCE_TYPE
      } }), "invalidAssurance"],
      ["authority", { ...event(), readinessAuthorized: true } as ProjectFieldConfirmationEvent, "invalidEvent"]
    ];
    for (const [, candidate, issueCode] of cases) {
      const result = validateProjectConfirmationProvenance(
        provenance(canvasIds, [candidate]),
        { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
      );
      expect(result.issueCodes).toContain(issueCode);
    }
  });

  it("enforces batch action identity", () => {
    const canvasIds = applicable("powerAppsCanvas");
    const first = event();
    const second = event({
      confirmationId: "20000000-0000-4000-8000-000000000002",
      sourceFieldId: canvasIds[1],
      sourceFieldRevisionId: REVISION_IDS[1]
    });
    const validBatch = validateProjectConfirmationProvenance(
      provenance(canvasIds, [first, second]),
      { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
    );
    expect(validBatch.outcome).toBe("valid");

    const inconsistentBatch = validateProjectConfirmationProvenance(
      provenance(canvasIds, [first, { ...second, confirmedAt: "2026-08-27T12:00:01.000Z" }]),
      { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
    );
    expect(inconsistentBatch.issueCodes).toContain("invalidAction");
  });

  it("accepts empty, single-event, and ordered linear confirmation chains", () => {
    const canvasIds = applicable("powerAppsCanvas");
    const first = event();

    const second = event({
      confirmationId: "20000000-0000-4000-8000-000000000002",
      confirmationActionId: "30000000-0000-4000-8000-000000000002",
      confirmedAt: "2026-08-27T12:01:00.000Z",
      supersedesConfirmationId: first.confirmationId
    });
    const third = event({
      confirmationId: "20000000-0000-4000-8000-000000000003",
      confirmationActionId: "30000000-0000-4000-8000-000000000003",
      confirmedAt: "2026-08-27T12:02:00.000Z",
      supersedesConfirmationId: second.confirmationId
    });

    for (const events of [[], [first], [first, second], [first, second, third]]) {
      expect(validateProjectConfirmationProvenance(
        provenance(canvasIds, events),
        { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
      ).outcome).toBe("valid");
    }
  });

  it("accepts independent ordered lineages for separate source fields", () => {
    const canvasIds = applicable("powerAppsCanvas");
    const firstA = event();
    const firstB = event({
      confirmationId: "20000000-0000-4000-8000-000000000002",
      sourceFieldId: canvasIds[1],
      sourceFieldRevisionId: REVISION_IDS[1]
    });
    const secondA = event({
      confirmationId: "20000000-0000-4000-8000-000000000003",
      confirmationActionId: "30000000-0000-4000-8000-000000000002",
      confirmedAt: "2026-08-27T12:01:00.000Z",
      supersedesConfirmationId: firstA.confirmationId
    });
    const secondB = event({
      confirmationId: "20000000-0000-4000-8000-000000000004",
      confirmationActionId: "30000000-0000-4000-8000-000000000002",
      confirmedAt: "2026-08-27T12:01:00.000Z",
      sourceFieldId: canvasIds[1],
      sourceFieldRevisionId: REVISION_IDS[1],
      supersedesConfirmationId: firstB.confirmationId
    });

    expect(validateProjectConfirmationProvenance(
      provenance(canvasIds, [firstA, firstB, secondA, secondB]),
      { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
    ).outcome).toBe("valid");
  });

  it("uses stored event order without sorting by timestamp or UUID", () => {
    const canvasIds = applicable("powerAppsCanvas");
    const first = event({
      confirmationId: "90000000-0000-4000-8000-000000000009",
      confirmedAt: "2026-08-27T12:02:00.000Z"
    });
    const second = event({
      confirmationId: "10000000-0000-4000-8000-000000000001",
      confirmationActionId: "30000000-0000-4000-8000-000000000002",
      confirmedAt: "2026-08-27T12:01:00.000Z",
      supersedesConfirmationId: first.confirmationId
    });

    expect(validateProjectConfirmationProvenance(
      provenance(canvasIds, [first, second]),
      { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
    ).outcome).toBe("valid");
  });

  it.each([
    ["a second same-source root", (first: ProjectFieldConfirmationEvent) => [
      first,
      event({
        confirmationId: "20000000-0000-4000-8000-000000000002",
        confirmationActionId: "30000000-0000-4000-8000-000000000002"
      })
    ]],
    ["a third same-source event with omitted supersession", (first: ProjectFieldConfirmationEvent) => {
      const second = event({
        confirmationId: "20000000-0000-4000-8000-000000000002",
        confirmationActionId: "30000000-0000-4000-8000-000000000002",
        supersedesConfirmationId: first.confirmationId
      });
      return [first, second, event({
        confirmationId: "20000000-0000-4000-8000-000000000003",
        confirmationActionId: "30000000-0000-4000-8000-000000000003"
      })];
    }],
    ["a later event superseding an older non-head event", (first: ProjectFieldConfirmationEvent) => {
      const second = event({
        confirmationId: "20000000-0000-4000-8000-000000000002",
        confirmationActionId: "30000000-0000-4000-8000-000000000002",
        supersedesConfirmationId: first.confirmationId
      });
      return [first, second, event({
        confirmationId: "20000000-0000-4000-8000-000000000003",
        confirmationActionId: "30000000-0000-4000-8000-000000000003",
        supersedesConfirmationId: first.confirmationId
      })];
    }],
    ["two independent roots for one source", (first: ProjectFieldConfirmationEvent) => [
      first,
      event({
        confirmationId: "20000000-0000-4000-8000-000000000002",
        confirmationActionId: "30000000-0000-4000-8000-000000000002"
      })
    ]],
    ["a branch from a historical event", (first: ProjectFieldConfirmationEvent) => {
      const second = event({
        confirmationId: "20000000-0000-4000-8000-000000000002",
        confirmationActionId: "30000000-0000-4000-8000-000000000002",
        supersedesConfirmationId: first.confirmationId
      });
      return [first, second, event({
        confirmationId: "20000000-0000-4000-8000-000000000003",
        confirmationActionId: "30000000-0000-4000-8000-000000000003",
        supersedesConfirmationId: first.confirmationId
      })];
    }],
    ["a cycle", (first: ProjectFieldConfirmationEvent) => {
      const secondId = "20000000-0000-4000-8000-000000000002";
      return [
        { ...first, supersedesConfirmationId: secondId },
        event({
          confirmationId: secondId,
          confirmationActionId: "30000000-0000-4000-8000-000000000002",
          supersedesConfirmationId: first.confirmationId
        })
      ];
    }],
    ["an unknown supersession ID", (first: ProjectFieldConfirmationEvent) => [
      first,
      event({
        confirmationId: "20000000-0000-4000-8000-000000000002",
        confirmationActionId: "30000000-0000-4000-8000-000000000002",
        supersedesConfirmationId: "90000000-0000-4000-8000-000000000099"
      })
    ]],
    ["a supersession to another source field", (first: ProjectFieldConfirmationEvent) => [
      first,
      event({
        confirmationId: "20000000-0000-4000-8000-000000000002",
        confirmationActionId: "30000000-0000-4000-8000-000000000002",
        sourceFieldId: PROJECT_CONFIRMATION_SOURCE_FIELD_IDS[1],
        sourceFieldRevisionId: REVISION_IDS[1],
        supersedesConfirmationId: first.confirmationId
      })
    ]],
    ["same-action supersession", (first: ProjectFieldConfirmationEvent) => [
      first,
      event({
        confirmationId: "20000000-0000-4000-8000-000000000002",
        supersedesConfirmationId: first.confirmationId
      })
    ]]
  ] as const)("fails closed on %s", (name, createEvents) => {
    const canvasIds = applicable("powerAppsCanvas");
    const result = validateProjectConfirmationProvenance(
      provenance(canvasIds, createEvents(event())),
      { projectId: PROJECT_ID, applicableSourceFieldIds: canvasIds }
    );

    expect(result.outcome).toBe("quarantined");
    expect(result.issueCodes).toContain("invalidSupersession");
    if (name === "same-action supersession") {
      expect(result.issueCodes).toContain("invalidAction");
    }
  });

  it("keeps every quarantine issue code bounded and free of raw evidence", () => {
    expect(PROJECT_CONFIRMATION_PROVENANCE_ISSUE_CODES).toHaveLength(13);
    expect(new Set(PROJECT_CONFIRMATION_PROVENANCE_ISSUE_CODES).size).toBe(13);
    expect(JSON.stringify(PROJECT_CONFIRMATION_PROVENANCE_ISSUE_CODES)).not.toContain("fingerprint=");
    expect(JSON.stringify(PROJECT_CONFIRMATION_PROVENANCE_ISSUE_CODES)).not.toContain("rawValue");
  });
});
