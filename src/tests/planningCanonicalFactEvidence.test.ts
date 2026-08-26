// @ts-expect-error -- Vitest supplies Node APIs; the app tsconfig excludes Node ambient types.
import { webcrypto } from "node:crypto";
// @ts-expect-error -- Static source-isolation checks run in Vitest's Node environment.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createProject } from "../lib/createProject";
import {
  derivePlanningCanonicalFactEvidenceCandidates,
  PLANNING_CANONICAL_FACT_EVIDENCE_VERSION,
  PLANNING_CANONICAL_FACT_FINGERPRINT_VERSION,
  PLANNING_CANONICAL_FACT_SERIALIZATION_VERSION,
  serializePlanningCanonicalFactTextValue
} from "../lib/planningCanonicalFactEvidence";
import { runPlanningClarificationGeneration } from "../lib/planningClarificationOrchestration";
import {
  isPlanningStatusReadinessEligible,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningProposalValue,
  type PlanningSourceReference
} from "../lib/planningProposals";
import {
  getProjectById,
  materializeProjectPlanningClarificationHumanDecision,
  saveStorageState,
  type StorageAdapter
} from "../lib/projectRepository";
import {
  getProductionPlanningReadinessMapping,
  getProductionPlanningReadinessMappings
} from "../lib/planningReadinessMappingRegistry";
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import type { ProjectRecord } from "../types/project";

const YAML_RULE_ID = "pp.canvas.yamlplanning.confirmation";
const VALIDATION_VALUE = "Technical reviewer";
const RAW_SECRET = "SECRET-3J6A-RAW-ANSWER-94721";

class MemoryStorage implements StorageAdapter {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function canvasProject(id: string): ProjectRecord {
  const project = createProject({
    identity: { id, projectName: "Canonical fact evidence" },
    intake: { appType: "powerAppsCanvas", appPurpose: "Prove bounded Planning provenance." },
    now: "2026-08-25T12:00:00.000Z"
  });
  project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
  project.powerPlatform!.canvas!.selectedDataSourceTypes = [];
  return project;
}

function yamlAnswer(validationResponsibility = VALIDATION_VALUE): PlanningProposalValue {
  return {
    kind: "structuredRecord",
    value: {
      installationResponsibility: { kind: "text", value: "Canvas maker" },
      validationResponsibility: { kind: "text", value: validationResponsibility },
      yamlInstallationLocation: { kind: "text", value: "Approved Canvas app" },
      yamlParentRelationship: { kind: "text", value: "Approved parent relationship" }
    }
  };
}

function persist(storage: StorageAdapter, project: ProjectRecord): void {
  saveStorageState({
    version: CURRENT_STORAGE_VERSION,
    activeProjectId: project.identity.id,
    projects: [project]
  }, storage);
}

function sequence(...values: string[]): () => string {
  let index = 0;
  return () => values[index++]!;
}

async function confirmedProject(
  id: string,
  validationResponsibility = VALIDATION_VALUE
): Promise<ProjectRecord> {
  const storage = new MemoryStorage();
  persist(storage, canvasProject(id));
  expect((await runPlanningClarificationGeneration(id, { storage })).successful).toBe(true);
  const generated = getProjectById(id, storage)!;
  const proposal = yamlProposal(generated);
  expect((await materializeProjectPlanningClarificationHumanDecision(id, {
    proposalId: proposal.proposalId,
    action: "revise",
    value: yamlAnswer(validationResponsibility)
  }, storage, {
    now: () => "2026-08-25T12:01:00.000Z",
    uuid: sequence(
      "a1000000-0000-4000-8000-000000000001",
      "a1000000-0000-4000-8000-000000000002"
    )
  })).outcome).toBe("persisted");
  expect((await materializeProjectPlanningClarificationHumanDecision(id, {
    proposalId: proposal.proposalId,
    action: "confirm"
  }, storage, {
    now: () => "2026-08-25T12:02:00.000Z",
    uuid: sequence(
      "a1000000-0000-4000-8000-000000000003",
      "a1000000-0000-4000-8000-000000000004"
    )
  })).outcome).toBe("persisted");
  return getProjectById(id, storage)!;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function yamlProposal(project: ProjectRecord): PlanningProposalRecord {
  const proposal = project.planning!.proposals.find((entry) => entry.ruleId === YAML_RULE_ID);
  if (!proposal) throw new Error("Missing YAML proposal fixture.");
  return proposal;
}

function mutateProposal(
  project: ProjectRecord,
  mutate: (proposal: PlanningProposalRecord) => PlanningProposalRecord
): ProjectRecord {
  const candidate = clone(project);
  candidate.planning = {
    ...candidate.planning!,
    proposals: candidate.planning!.proposals.map((proposal) =>
      proposal.ruleId === YAML_RULE_ID ? mutate(proposal) : proposal
    )
  };
  return candidate;
}

function mutateConfirmedSource(
  project: ProjectRecord,
  mutate: (source: PlanningSourceReference) => PlanningSourceReference
): ProjectRecord {
  const candidate = clone(project);
  const proposal = yamlProposal(candidate);
  candidate.planning = {
    ...candidate.planning!,
    sources: candidate.planning!.sources.map((source) =>
      proposal.sourceIds.includes(source.sourceId) &&
      source.sourceType === "userAnswer" &&
      source.authority === "confirmed"
        ? mutate(source)
        : source
    )
  };
  return candidate;
}

function mutateConfirmationDecision(
  project: ProjectRecord,
  mutate: (decision: PlanningDecisionRecord) => PlanningDecisionRecord
): ProjectRecord {
  const candidate = clone(project);
  const proposal = yamlProposal(candidate);
  candidate.planning = {
    ...candidate.planning!,
    decisions: candidate.planning!.decisions.map((decision) =>
      decision.decisionId === proposal.lastDecisionId ? mutate(decision) : decision
    )
  };
  return candidate;
}

function blockingConflict(proposalId: string): PlanningConflictRecord {
  return {
    conflictId: "a2000000-0000-4000-8000-000000000001",
    projectId: "canonical-fact-project",
    conflictType: "confirmedDecisionMismatch",
    severity: "blocking",
    status: "open",
    involvedReferences: [{ kind: "proposalId", proposalId }],
    explanation: "Bounded conflict fixture.",
    blocking: true,
    createdAt: "2026-08-25T12:03:00.000Z"
  };
}

async function candidateFor(project: ProjectRecord) {
  const result = await derivePlanningCanonicalFactEvidenceCandidates(project);
  return result.outcome === "candidate" ? result.candidates[0] : undefined;
}

let baseline: ProjectRecord;

beforeAll(async () => {
  vi.stubGlobal("crypto", webcrypto);
  baseline = await confirmedProject("canonical-fact-project");
});

afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("derived Planning canonical-fact evidence", () => {
  it("derives exactly one bounded candidate from the current confirmed YAML answer", async () => {
    const proposal = yamlProposal(baseline);
    const source = baseline.planning!.sources.find((entry) =>
      proposal.sourceIds.includes(entry.sourceId) && entry.authority === "confirmed"
    )!;
    const result = await derivePlanningCanonicalFactEvidenceCandidates(clone(baseline));

    expect(result).toMatchObject({
      version: PLANNING_CANONICAL_FACT_EVIDENCE_VERSION,
      outcome: "candidate",
      projectId: baseline.identity.id,
      readinessAuthorized: false,
      projectionAuthorized: false,
      applyAuthorized: false,
      reasonCodes: []
    });
    if (result.outcome !== "candidate") return;
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toEqual({
      projectId: baseline.identity.id,
      mappingId: "planning-map.pp.canvas.yamlplanning.confirmation",
      mappingVersion: "1.0.0",
      ruleId: YAML_RULE_ID,
      ruleVersion: "1.0.0",
      proposalId: proposal.proposalId,
      proposalFingerprint: proposal.fingerprint,
      decisionId: proposal.lastDecisionId,
      confirmedSourceId: source.sourceId,
      answerFieldKey: "validationResponsibility",
      canonicalDestinationPath: "powerPlatform.canvas.validationResponsibility",
      destinationShape: "projectGlobalScalar",
      extractionKind: "directStructuredRecordField",
      sourceType: "userAnswer",
      sourceAuthority: "confirmed",
      sourceAvailability: "current",
      canonicalSerializationVersion: PLANNING_CANONICAL_FACT_SERIALIZATION_VERSION,
      fingerprintVersion: PLANNING_CANONICAL_FACT_FINGERPRINT_VERSION,
      valueFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      normalizedValue: VALIDATION_VALUE,
      readinessAuthorized: false,
      projectionAuthorized: false,
      applyAuthorized: false
    });
  });

  it("reads the normalized answer field directly and never the current ProjectRecord value", async () => {
    const project = clone(baseline);
    project.powerPlatform!.canvas!.validationResponsibility = RAW_SECRET;
    expect((await candidateFor(project))?.normalizedValue).toBe(VALIDATION_VALUE);
  });

  it("produces identical fingerprints for identical normalized values", async () => {
    const first = await candidateFor(clone(baseline));
    const second = await candidateFor(clone(baseline));
    expect(first?.valueFingerprint).toBe(second?.valueFingerprint);
    expect(serializePlanningCanonicalFactTextValue(VALIDATION_VALUE)).toBe(
      serializePlanningCanonicalFactTextValue(VALIDATION_VALUE)
    );
  });

  it("produces a different fingerprint for a changed normalized value", async () => {
    const changed = await confirmedProject("canonical-fact-changed", "Release reviewer");
    const first = await candidateFor(clone(baseline));
    const second = await candidateFor(changed);
    expect(first?.valueFingerprint).not.toBe(second?.valueFingerprint);
  });

  it("does not mutate or persist the candidate into ProjectRecord", async () => {
    const project = clone(baseline);
    const before = JSON.stringify(project);
    await derivePlanningCanonicalFactEvidenceCandidates(project);
    expect(JSON.stringify(project)).toBe(before);
    expect(JSON.stringify(project)).not.toMatch(/canonicalFactEvidence|valueFingerprint/);
  });

  it("registers exactly one static fact binding and leaves every other mapping at zero", () => {
    const mappings = getProductionPlanningReadinessMappings();
    expect(mappings.flatMap((entry) => entry.canonicalFactEvidenceBindings)).toHaveLength(1);
    expect(mappings.filter((entry) => entry.ruleId !== YAML_RULE_ID).every(
      (entry) => entry.canonicalFactEvidenceBindings.length === 0
    )).toBe(true);
  });

  it.each([
    "powerPlatform.canvas.fullScreenYamlRequired",
    "powerPlatform.canvas.controlLevelYamlRequired",
    "powerPlatform.canvas.containerYamlRequired",
    "powerPlatform.canvas.componentYamlRequired",
    "powerPlatform.canvas.paYamlSourceRequired",
    "powerPlatform.canvas.expectedInstallationMethod",
    "powerPlatform.canvas.existingSourceAvailability",
    "powerPlatform.canvas.yamlStatus"
  ])("has zero evidence bindings for unauthorized YAML destination %s", (destination) => {
    const bindings = getProductionPlanningReadinessMappings().flatMap(
      (entry) => entry.canonicalFactEvidenceBindings
    );
    expect(bindings.some((entry) => entry.canonicalDestinationPath === destination)).toBe(false);
  });

  it.each([
    "installationResponsibility",
    "yamlInstallationLocation",
    "yamlParentRelationship"
  ])("does not bind unauthorized YAML answer field %s", (answerFieldKey) => {
    const bindings = getProductionPlanningReadinessMappings().flatMap(
      (entry) => entry.canonicalFactEvidenceBindings
    );
    expect(bindings.some((entry) => entry.answerFieldKey === answerFieldKey)).toBe(false);
  });

  it.each([
    ["informational authority", (source: PlanningSourceReference) => ({ ...source, authority: "informational" as const })],
    ["stale availability", (source: PlanningSourceReference) => ({ ...source, availability: "stale" as const })],
    ["wrong source type", (source: PlanningSourceReference) => ({ ...source, sourceType: "approvedDocument" as const })],
    ["invalid lineage", (source: PlanningSourceReference) => ({ ...source, locator: "planning:userAnswer:wrong:lineage" })]
  ] as const)("fails closed for %s", async (_label, mutate) => {
    const result = await derivePlanningCanonicalFactEvidenceCandidates(
      mutateConfirmedSource(baseline, mutate)
    );
    expect(result.outcome).toBe("noCandidate");
    expect(result.candidates).toEqual([]);
  });

  it("fails closed when the confirmed source is missing", async () => {
    const project = clone(baseline);
    const proposal = yamlProposal(project);
    project.planning = {
      ...project.planning!,
      sources: project.planning!.sources.filter((source) =>
        !(proposal.sourceIds.includes(source.sourceId) && source.authority === "confirmed")
      )
    };
    expect((await derivePlanningCanonicalFactEvidenceCandidates(project)).outcome).toBe("noCandidate");
  });

  it.each([
    ["Not Applicable", {}],
    ["Stale", { staleReason: "sourceChanged", staleAt: "2026-08-25T12:04:00.000Z" }],
    ["Superseded", { supersededByProposalId: "a3000000-0000-4000-8000-000000000001" }]
  ] as const)("fails closed for %s Planning lifecycle state", async (status, metadata) => {
    const project = mutateProposal(baseline, (proposal) => ({ ...proposal, status, ...metadata }));
    expect((await derivePlanningCanonicalFactEvidenceCandidates(project)).candidates).toEqual([]);
  });

  it.each([
    ["wrong rule ID", (proposal: PlanningProposalRecord) => ({ ...proposal, ruleId: "pp.canvas.other.confirmation" })],
    ["wrong rule version", (proposal: PlanningProposalRecord) => ({ ...proposal, ruleVersion: "2.0.0" })],
    ["invalid answer kind", (proposal: PlanningProposalRecord) => ({ ...proposal, value: { kind: "text" as const, value: RAW_SECRET } })],
    ["missing answer field", (proposal: PlanningProposalRecord) => {
      const value = clone(proposal.value);
      if (value.kind === "structuredRecord") delete value.value.validationResponsibility;
      return { ...proposal, value };
    }],
    ["invalid answer field", (proposal: PlanningProposalRecord) => {
      const value = clone(proposal.value);
      if (value.kind === "structuredRecord") {
        value.value.validationResponsibility = { kind: "boolean", value: true };
      }
      return { ...proposal, value };
    }]
  ] as const)("fails closed for %s", async (_label, mutate) => {
    const result = await derivePlanningCanonicalFactEvidenceCandidates(mutateProposal(baseline, mutate));
    expect(result.outcome).toBe("noCandidate");
    expect(result.candidates).toEqual([]);
  });

  it("fails closed without the final Confirm decision", async () => {
    const project = clone(baseline);
    const finalDecisionId = yamlProposal(project).lastDecisionId;
    project.planning = {
      ...project.planning!,
      decisions: project.planning!.decisions.filter((entry) => entry.decisionId !== finalDecisionId)
    };
    expect((await derivePlanningCanonicalFactEvidenceCandidates(project)).candidates).toEqual([]);
  });

  it("fails closed for invalid final Confirm lineage", async () => {
    const project = mutateConfirmationDecision(baseline, (decision) => ({
      ...decision,
      sourceIds: decision.sourceIds?.slice(1)
    }));
    expect((await derivePlanningCanonicalFactEvidenceCandidates(project)).candidates).toEqual([]);
  });

  it("fails closed for an existing open blocking conflict", async () => {
    const project = clone(baseline);
    const proposal = yamlProposal(project);
    project.planning = {
      ...project.planning!,
      conflicts: [blockingConflict(proposal.proposalId)]
    };
    const result = await derivePlanningCanonicalFactEvidenceCandidates(project);
    expect(result).toMatchObject({
      outcome: "noCandidate",
      candidates: [],
      reasonCodes: ["conflictBlocksEvidence"]
    });
  });

  it("returns bounded failure codes without raw answers or fingerprints", async () => {
    const result = await derivePlanningCanonicalFactEvidenceCandidates(
      mutateProposal(baseline, (proposal) => ({
        ...proposal,
        value: { kind: "text", value: RAW_SECRET }
      }))
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(RAW_SECRET);
    expect(serialized).not.toMatch(/[a-f0-9]{64}/);
    expect(result.reasonCodes).toHaveLength(1);
  });

  it("keeps YAML mapping and all authority boundaries unchanged", () => {
    const mapping = getProductionPlanningReadinessMapping(YAML_RULE_ID)!;
    expect(mapping.classification).toBe("partialProjection");
    expect(mapping.canonicalMergePaths).toEqual([]);
    expect(mapping.projectorId).toBeNull();
    expect(mapping.projectionAuthorized).toBe(false);
    expect(mapping.readinessAuthorized).toBe(false);
    expect(mapping.applyAuthorized).toBe(false);
    expect(mapping.notApplicableProjectionAuthorized).toBe(false);
    expect(isPlanningStatusReadinessEligible("Confirmed")).toBe(false);
    expect(isPlanningStatusReadinessEligible("Not Applicable")).toBe(false);
    expect(CURRENT_STORAGE_VERSION).toBe(6);
  });

  it("has no repository, storage, UI, gate, output, clock, UUID, or logging capability", () => {
    const source = readFileSync("src/lib/planningCanonicalFactEvidence.ts", "utf8");
    expect(source).not.toMatch(/projectRepository|StorageAdapter|saveStorage|localStorage|sessionStorage/);
    expect(source).not.toMatch(/phaseGates|calculateCanvasYamlPlanningGate|updateProject|Date\.now|new Date|randomUUID|Math\.random/);
    expect(source).not.toMatch(/console\.|analytics|telemetry|document\.|dataset|throw new Error/);
    expect(source).not.toMatch(/controlledApply|generatedPackage|generateProjectPackage/);
  });
});
