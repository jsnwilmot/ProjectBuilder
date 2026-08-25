// @ts-expect-error -- Vitest supplies Node APIs; the app tsconfig excludes Node ambient types.
import { webcrypto } from "node:crypto";
// @ts-expect-error -- Static source-isolation checks run in Vitest's Node environment.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createProject } from "../lib/createProject";
import {
  analyzePlanningClarificationReadinessEvidence,
  PLANNING_CLARIFICATION_READINESS_EVIDENCE_VERSION,
  type PlanningClarificationReadinessEvidenceAssessment,
  type PlanningClarificationReadinessEvidenceResult
} from "../lib/planningClarificationReadinessEvidence";
import { buildPlanningUserAnswerLocator } from "../lib/planningClarificationDecisionContract";
import { runPlanningClarificationGeneration } from "../lib/planningClarificationOrchestration";
import {
  createEmptyProjectPlanningState,
  isPlanningStatusOutputEligible,
  isPlanningStatusReadinessEligible,
  type PlanningConflictRecord,
  type PlanningDecisionRecord,
  type PlanningProposalRecord,
  type PlanningProposalValue,
  type PlanningSourceReference
} from "../lib/planningProposals";
import { getActivePlanningRulesForProjectType } from "../lib/planningRules";
import {
  getProjectById,
  materializeProjectPlanningClarificationHumanDecision,
  saveStorageState,
  type StorageAdapter
} from "../lib/projectRepository";
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import type { ProjectRecord } from "../types/project";

const projectId = "readiness-evidence-project";
const secretAnswer = "SECRET-3J2-ANSWER-94721";
const secretLocator = "SECRET-3J2-LOCATOR-58314";
const yamlRuleId = "pp.canvas.yamlplanning.confirmation";
const backendRuleId = "pp.canvas.schema.confirmation";

class MemoryStorage implements StorageAdapter {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function canvasProject(id = projectId): ProjectRecord {
  const project = createProject({
    identity: { id, projectName: "Readiness evidence candidate" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Plan a controlled Canvas application."
    },
    now: "2026-08-24T12:00:00.000Z"
  });
  project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
  project.powerPlatform!.canvas!.selectedDataSourceTypes = [];
  return project;
}

function yamlAnswer(value = secretAnswer): PlanningProposalValue {
  return {
    kind: "structuredRecord",
    value: {
      installationResponsibility: { kind: "text", value },
      validationResponsibility: { kind: "text", value: "Technical reviewer" },
      yamlInstallationLocation: { kind: "text", value: "Approved Canvas app" },
      yamlParentRelationship: { kind: "text", value: "Approved parent relationship" }
    }
  };
}

function sharePointBackendAnswer(): PlanningProposalValue {
  return {
    kind: "structuredRecord",
    value: {
      dataSources: {
        kind: "structuredRecordList",
        value: [{
          dataSourceName: { kind: "text", value: "Projects" },
          purpose: { kind: "text", value: "Track project delivery" },
          expectedRecordVolume: { kind: "text", value: "Up to 10,000 records" },
          ownership: { kind: "text", value: "Operations" }
        }]
      },
      relationships: { kind: "text", value: "Projects link to assignments." },
      confirmationSource: { kind: "text", value: "Approved solution design" }
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

function uuidSequence(...ids: string[]): () => string {
  let index = 0;
  return () => ids[index++]!;
}

async function generateProject(id: string): Promise<ProjectRecord> {
  const storage = new MemoryStorage();
  const project = canvasProject(id);
  persist(storage, project);
  const generated = await runPlanningClarificationGeneration(id, { storage });
  expect(generated.successful).toBe(true);
  return getProjectById(id, storage)!;
}

async function generateConfirmedProject(id: string): Promise<ProjectRecord> {
  const storage = new MemoryStorage();
  const project = canvasProject(id);
  persist(storage, project);
  await runPlanningClarificationGeneration(id, { storage });
  const generated = getProjectById(id, storage)!;
  const proposal = generated.planning!.proposals.find((entry) => entry.ruleId === yamlRuleId)!;

  const revised = await materializeProjectPlanningClarificationHumanDecision(id, {
    proposalId: proposal.proposalId,
    action: "revise",
    value: yamlAnswer()
  }, storage, {
    now: () => "2026-08-24T12:01:00.000Z",
    uuid: uuidSequence(
      "91000000-0000-4000-8000-000000000001",
      "91000000-0000-4000-8000-000000000002"
    )
  });
  expect(revised.outcome).toBe("persisted");

  const confirmed = await materializeProjectPlanningClarificationHumanDecision(id, {
    proposalId: proposal.proposalId,
    action: "confirm"
  }, storage, {
    now: () => "2026-08-24T12:02:00.000Z",
    uuid: uuidSequence(
      "91000000-0000-4000-8000-000000000003",
      "91000000-0000-4000-8000-000000000004"
    )
  });
  expect(confirmed.outcome).toBe("persisted");
  return getProjectById(id, storage)!;
}

async function generateBackendProject(
  id: string,
  status: "Revised" | "Confirmed" | "Deferred"
): Promise<{ project: ProjectRecord; storage: StorageAdapter; proposalId: string }> {
  const storage = new MemoryStorage();
  persist(storage, canvasProject(id));
  const generation = await runPlanningClarificationGeneration(id, { storage });
  expect(generation.successful).toBe(true);
  const generated = getProjectById(id, storage)!;
  const proposal = generated.planning!.proposals.find((entry) => entry.ruleId === backendRuleId)!;

  const revised = await materializeProjectPlanningClarificationHumanDecision(id, {
    proposalId: proposal.proposalId,
    action: "revise",
    value: sharePointBackendAnswer()
  }, storage);
  expect(revised.outcome).toBe("persisted");

  if (status === "Confirmed") {
    const confirmed = await materializeProjectPlanningClarificationHumanDecision(id, {
      proposalId: proposal.proposalId,
      action: "confirm"
    }, storage);
    expect(confirmed.outcome).toBe("persisted");
  } else if (status === "Deferred") {
    const deferred = await materializeProjectPlanningClarificationHumanDecision(id, {
      proposalId: proposal.proposalId,
      action: "defer",
      reason: "Waiting for approved backend evidence."
    }, storage);
    expect(deferred.outcome).toBe("persisted");
  }

  return { project: getProjectById(id, storage)!, storage, proposalId: proposal.proposalId };
}

function cloneProject(project: ProjectRecord): ProjectRecord {
  return JSON.parse(JSON.stringify(project)) as ProjectRecord;
}

function yamlProposal(project: ProjectRecord): PlanningProposalRecord {
  const proposal = project.planning?.proposals.find((entry) => entry.ruleId === yamlRuleId);
  if (!proposal) throw new Error("Missing YAML proposal fixture");
  return proposal;
}

function yamlAssessment(
  result: PlanningClarificationReadinessEvidenceResult
): PlanningClarificationReadinessEvidenceAssessment | undefined {
  return result.outcome === "analyzed"
    ? result.assessments.find((entry) => entry.ruleId === yamlRuleId)
    : undefined;
}

function validatedCount(result: PlanningClarificationReadinessEvidenceResult): number {
  return result.outcome === "analyzed"
    ? result.assessments.filter((entry) => entry.disposition === "validatedCandidate").length
    : 0;
}

function mutateYamlProposal(
  project: ProjectRecord,
  mutate: (proposal: PlanningProposalRecord) => PlanningProposalRecord
): ProjectRecord {
  const candidate = cloneProject(project);
  candidate.planning = {
    ...candidate.planning!,
    proposals: candidate.planning!.proposals.map((proposal) =>
      proposal.ruleId === yamlRuleId ? mutate(proposal) : proposal
    )
  };
  return candidate;
}

function mutateConfirmedSource(
  project: ProjectRecord,
  mutate: (source: PlanningSourceReference) => PlanningSourceReference
): ProjectRecord {
  const candidate = cloneProject(project);
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
  const candidate = cloneProject(project);
  const proposal = yamlProposal(candidate);
  candidate.planning = {
    ...candidate.planning!,
    decisions: candidate.planning!.decisions.map((decision) =>
      decision.decisionId === proposal.lastDecisionId ? mutate(decision) : decision
    )
  };
  return candidate;
}

function blockingConflict(proposalId: string, overrides: Partial<PlanningConflictRecord> = {}): PlanningConflictRecord {
  return {
    conflictId: "92000000-0000-4000-8000-000000000001",
    projectId,
    conflictType: "confirmedDecisionMismatch",
    severity: "blocking",
    status: "open",
    involvedReferences: [{ kind: "proposalId", proposalId }],
    explanation: "Controlled conflict fixture.",
    blocking: true,
    createdAt: "2026-08-24T12:03:00.000Z",
    ...overrides
  };
}

function claimConfirmed(
  project: ProjectRecord,
  ruleId: string,
  value: PlanningProposalValue
): ProjectRecord {
  const candidate = cloneProject(project);
  const proposal = candidate.planning!.proposals.find((entry) => entry.ruleId === ruleId)!;
  const informationalSourceId = "93000000-0000-4000-8000-000000000001";
  const confirmedSourceId = "93000000-0000-4000-8000-000000000002";
  const reviseDecisionId = "93000000-0000-4000-8000-000000000003";
  const confirmDecisionId = "93000000-0000-4000-8000-000000000004";
  const informationalSource: PlanningSourceReference = {
    sourceId: informationalSourceId,
    sourceType: "userAnswer",
    locator: buildPlanningUserAnswerLocator(proposal.proposalId, reviseDecisionId)!,
    label: "User answer",
    authority: "informational",
    availability: "stale",
    observedAt: "2026-08-24T12:01:00.000Z"
  };
  const confirmedSource: PlanningSourceReference = {
    ...informationalSource,
    sourceId: confirmedSourceId,
    locator: buildPlanningUserAnswerLocator(proposal.proposalId, confirmDecisionId)!,
    authority: "confirmed",
    availability: "current",
    observedAt: "2026-08-24T12:02:00.000Z"
  };
  const reviseSourceIds = [...proposal.sourceIds, informationalSourceId];
  const confirmedSourceIds = [...proposal.sourceIds, confirmedSourceId];
  const decisions: PlanningDecisionRecord[] = [{
    decisionId: reviseDecisionId,
    proposalId: proposal.proposalId,
    projectId: candidate.identity.id,
    action: "revise",
    previousStatus: "Needs Clarification",
    resultingStatus: "Revised",
    origin: "userAction",
    recordedAt: "2026-08-24T12:01:00.000Z",
    value,
    sourceIds: reviseSourceIds,
    ruleSetVersion: proposal.ruleSetVersion
  }, {
    decisionId: confirmDecisionId,
    proposalId: proposal.proposalId,
    projectId: candidate.identity.id,
    action: "confirm",
    previousStatus: "Revised",
    resultingStatus: "Confirmed",
    origin: "userAction",
    recordedAt: "2026-08-24T12:02:00.000Z",
    sourceIds: confirmedSourceIds,
    ruleSetVersion: proposal.ruleSetVersion
  }];
  candidate.planning = {
    ...candidate.planning!,
    sources: [...candidate.planning!.sources, informationalSource, confirmedSource],
    proposals: candidate.planning!.proposals.map((entry) => entry.proposalId === proposal.proposalId
      ? {
          ...entry,
          status: "Confirmed",
          value,
          sourceIds: confirmedSourceIds,
          lastDecisionId: confirmDecisionId,
          updatedAt: "2026-08-24T12:02:00.000Z"
        }
      : entry),
    decisions: [...candidate.planning!.decisions, ...decisions]
  };
  return candidate;
}

function resolveYamlGate(project: ProjectRecord): ProjectRecord {
  const candidate = cloneProject(project);
  Object.assign(candidate.powerPlatform!.canvas!, {
    fullScreenYamlRequired: "Planning only",
    controlLevelYamlRequired: "Planning only",
    containerYamlRequired: "Planning only",
    componentYamlRequired: "Planning only",
    paYamlSourceRequired: "Approved source required",
    expectedInstallationMethod: "Manual controlled installation",
    existingSourceAvailability: "Not available",
    validationResponsibility: "Technical reviewer",
    yamlStatus: "confirmed"
  });
  return candidate;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  }
  return value;
}

let generatedBaseline: ProjectRecord;
let confirmedBaseline: ProjectRecord;

beforeAll(async () => {
  vi.stubGlobal("crypto", webcrypto);
  generatedBaseline = await generateProject(`${projectId}-generated`);
  confirmedBaseline = await generateConfirmedProject(projectId);
});

afterAll(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("planning clarification readiness evidence candidate analyzer", () => {
  it("returns the versioned 11-rule assessment contract in registry priority order", async () => {
    const result = await analyzePlanningClarificationReadinessEvidence(cloneProject(generatedBaseline));
    const rules = getActivePlanningRulesForProjectType("powerAppsCanvas");

    expect(result).toMatchObject({
      version: PLANNING_CLARIFICATION_READINESS_EVIDENCE_VERSION,
      outcome: "analyzed",
      projectId: generatedBaseline.identity.id,
      readinessAuthorized: false,
      reasonCodes: []
    });
    if (result.outcome !== "analyzed") return;
    expect(result.assessments).toHaveLength(11);
    expect(result.assessments.map((entry) => entry.ruleId)).toEqual(rules.map((rule) => rule.ruleId));
    expect(result.assessments.every((entry) =>
      entry.architectApprovalRequired &&
      entry.readinessAuthorized === false &&
      entry.disposition === "notCandidate"
    )).toBe(true);
  });

  it("returns no candidates for absent and canonical empty Planning", async () => {
    const absent = cloneProject(generatedBaseline);
    delete absent.planning;
    const empty = cloneProject(generatedBaseline);
    empty.planning = createEmptyProjectPlanningState();

    const absentResult = await analyzePlanningClarificationReadinessEvidence(absent);
    const emptyResult = await analyzePlanningClarificationReadinessEvidence(empty);
    expect(validatedCount(absentResult)).toBe(0);
    expect(validatedCount(emptyResult)).toBe(0);
    expect(JSON.stringify([absentResult, emptyResult])).not.toContain('"readinessAuthorized":true');
  });

  it("returns a safe unsupported result for non-Canvas projects", async () => {
    const project = createProject({
      identity: { id: "unsupported-project", projectName: "Unsupported" },
      intake: { appType: "webApplication" },
      now: "2026-08-24T12:00:00.000Z"
    });
    await expect(analyzePlanningClarificationReadinessEvidence(project)).resolves.toEqual({
      version: PLANNING_CLARIFICATION_READINESS_EVIDENCE_VERSION,
      outcome: "unsupportedProjectType",
      projectId: "unsupported-project",
      readinessAuthorized: false,
      assessments: [],
      reasonCodes: ["unsupportedProjectType"]
    });
  });

  it("proves a real current Confirmed candidate while returning identity metadata only", async () => {
    const result = await analyzePlanningClarificationReadinessEvidence(cloneProject(confirmedBaseline));
    const proposal = yamlProposal(confirmedBaseline);
    const confirmedSource = confirmedBaseline.planning!.sources.find((source) =>
      proposal.sourceIds.includes(source.sourceId) && source.authority === "confirmed"
    )!;
    const candidate = yamlAssessment(result);

    expect(candidate).toEqual({
      disposition: "validatedCandidate",
      projectId: confirmedBaseline.identity.id,
      ruleId: yamlRuleId,
      ruleVersion: "1.0.0",
      gateId: "yaml",
      architectApprovalRequired: true,
      readinessAuthorized: false,
      proposalId: proposal.proposalId,
      fingerprint: proposal.fingerprint,
      confirmationDecisionId: proposal.lastDecisionId,
      confirmedSourceId: confirmedSource.sourceId
    });
    expect(Object.keys(candidate!).sort()).toEqual([
      "architectApprovalRequired",
      "confirmationDecisionId",
      "confirmedSourceId",
      "disposition",
      "fingerprint",
      "gateId",
      "projectId",
      "proposalId",
      "readinessAuthorized",
      "ruleId",
      "ruleVersion"
    ]);
    expect(JSON.stringify(result)).not.toContain(secretAnswer);
    expect(JSON.stringify(result)).not.toContain("planning:userAnswer:");
  });

  it("is deterministic and does not mutate deeply frozen input", async () => {
    const input = deepFreeze(cloneProject(confirmedBaseline));
    const before = JSON.stringify(input);
    const first = await analyzePlanningClarificationReadinessEvidence(input);
    const second = await analyzePlanningClarificationReadinessEvidence(input);

    expect(second).toEqual(first);
    expect(JSON.stringify(input)).toBe(before);
    expect(JSON.stringify(first)).not.toMatch(/createdAt|updatedAt|recordedAt|observedAt|Date\.now|randomUUID/);
  });

  it.each([
    "Needs Clarification",
    "Revised",
    "Deferred",
    "Not Applicable",
    "Stale",
    "Superseded",
    "Blocked",
    "Rejected",
    "Proposed"
  ] as const)("never validates %s status as a candidate", async (status) => {
    const project = mutateYamlProposal(generatedBaseline, (proposal) => ({ ...proposal, status }));
    const result = await analyzePlanningClarificationReadinessEvidence(project);
    expect(validatedCount(result)).toBe(0);
  });

  it("keeps Not Applicable unmapped and unauthorized", async () => {
    const project = mutateYamlProposal(generatedBaseline, (proposal) => ({
      ...proposal,
      status: "Not Applicable",
      value: { kind: "notApplicable", reason: "Planning-only decision" }
    }));
    const result = await analyzePlanningClarificationReadinessEvidence(project);
    expect(validatedCount(result)).toBe(0);
    expect(JSON.stringify(result)).not.toContain('"readinessAuthorized":true');
  });

  it.each([
    ["authority", (source: PlanningSourceReference) => ({ ...source, authority: "informational" as const })],
    ["availability", (source: PlanningSourceReference) => ({ ...source, availability: "stale" as const })],
    ["source type", (source: PlanningSourceReference) => ({ ...source, sourceType: "approvedDocument" as const })],
    ["label", (source: PlanningSourceReference) => ({ ...source, label: "Confirmed response" })],
    ["locator", (source: PlanningSourceReference) => ({ ...source, locator: secretLocator })]
  ] as const)("fails closed for wrong confirmed-source %s", async (_label, mutate) => {
    const result = await analyzePlanningClarificationReadinessEvidence(
      mutateConfirmedSource(confirmedBaseline, mutate)
    );
    expect(validatedCount(result)).toBe(0);
    expect(JSON.stringify(result)).not.toContain(secretLocator);
  });

  it("fails closed for duplicate qualifying current confirmed sources", async () => {
    const project = cloneProject(confirmedBaseline);
    const proposal = yamlProposal(project);
    const source = project.planning!.sources.find((entry) =>
      proposal.sourceIds.includes(entry.sourceId) && entry.authority === "confirmed"
    )!;
    const duplicateId = "94000000-0000-4000-8000-000000000001";
    const duplicate = { ...source, sourceId: duplicateId };
    const sourceIds = [...proposal.sourceIds, duplicateId];
    project.planning = {
      ...project.planning!,
      sources: [...project.planning!.sources, duplicate],
      proposals: project.planning!.proposals.map((entry) => entry.proposalId === proposal.proposalId
        ? { ...entry, sourceIds }
        : entry),
      decisions: project.planning!.decisions.map((decision) => decision.decisionId === proposal.lastDecisionId
        ? { ...decision, sourceIds }
        : decision)
    };
    expect(validatedCount(await analyzePlanningClarificationReadinessEvidence(project))).toBe(0);
  });

  it.each([
    ["action", (decision: PlanningDecisionRecord) => ({ ...decision, action: "reject" as const })],
    ["origin", (decision: PlanningDecisionRecord) => ({ ...decision, origin: "deterministicRule" as const })],
    ["previous status", (decision: PlanningDecisionRecord) => ({ ...decision, previousStatus: "Needs Clarification" as const })],
    ["resulting status", (decision: PlanningDecisionRecord) => ({ ...decision, resultingStatus: "Revised" as const })],
    ["value", (decision: PlanningDecisionRecord) => ({ ...decision, value: yamlAnswer("Unexpected") })],
    ["reason", (decision: PlanningDecisionRecord) => ({ ...decision, reason: "Unexpected" })],
    ["source binding", (decision: PlanningDecisionRecord) => ({ ...decision, sourceIds: decision.sourceIds?.slice(1) })]
  ] as const)("fails closed for invalid confirmation-decision %s", async (_label, mutate) => {
    const result = await analyzePlanningClarificationReadinessEvidence(
      mutateConfirmationDecision(confirmedBaseline, mutate)
    );
    expect(validatedCount(result)).toBe(0);
  });

  it("fails closed for missing final decision and invalid revision lineage", async () => {
    const missingFinal = cloneProject(confirmedBaseline);
    const finalId = yamlProposal(missingFinal).lastDecisionId;
    missingFinal.planning = {
      ...missingFinal.planning!,
      decisions: missingFinal.planning!.decisions.filter((decision) => decision.decisionId !== finalId)
    };

    const missingRevision = cloneProject(confirmedBaseline);
    missingRevision.planning = {
      ...missingRevision.planning!,
      decisions: missingRevision.planning!.decisions.filter((decision) => decision.action !== "revise")
    };
    expect(validatedCount(await analyzePlanningClarificationReadinessEvidence(missingFinal))).toBe(0);
    expect(validatedCount(await analyzePlanningClarificationReadinessEvidence(missingRevision))).toBe(0);
  });

  it("fails closed for a schema-invalid Confirmed answer", async () => {
    const project = mutateYamlProposal(confirmedBaseline, (proposal) => ({
      ...proposal,
      value: { kind: "text", value: "schema-invalid" }
    }));
    const result = await analyzePlanningClarificationReadinessEvidence(project);
    expect(validatedCount(result)).toBe(0);
  });

  it("validates supported SharePoint backend evidence without authorizing readiness", async () => {
    const project = claimConfirmed(
      generatedBaseline,
      backendRuleId,
      sharePointBackendAnswer()
    );
    const result = await analyzePlanningClarificationReadinessEvidence(project);
    const assessment = result.outcome === "analyzed"
      ? result.assessments.find((entry) => entry.ruleId === backendRuleId)
      : undefined;
    expect(assessment).toMatchObject({
      disposition: "validatedCandidate",
      readinessAuthorized: false
    });
    expect(result.readinessAuthorized).toBe(false);
  });

  it("fails an unsupported canonical backend closed as answerSchemaUnavailable", async () => {
    const project = claimConfirmed(generatedBaseline, backendRuleId, sharePointBackendAnswer());
    project.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = [];
    const result = await analyzePlanningClarificationReadinessEvidence(project);
    expect(validatedCount(result)).toBe(0);
    expect(result.readinessAuthorized).toBe(false);
  });

  it.each(["Revised", "Confirmed", "Deferred"] as const)(
    "preserves a supported SharePoint backend %s answer through deterministic Refresh",
    async (status) => {
      const id = `${projectId}-backend-refresh-${status.toLowerCase()}`;
      const before = await generateBackendProject(id, status);
      const refresh = await runPlanningClarificationGeneration(id, { storage: before.storage });
      expect(refresh.outcome).toBe("unchanged");
      const after = getProjectById(id, before.storage)!;
      expect(after.planning).toEqual(before.project.planning);
      expect(after.planning!.proposals.find((proposal) => proposal.proposalId === before.proposalId))
        .toMatchObject({ status, value: sharePointBackendAnswer() });
      expect(after.planning!.proposals.filter((proposal) => proposal.ruleId === backendRuleId)).toHaveLength(1);
    }
  );

  it("blocks Refresh and denies current SharePoint answer authority after a canonical backend change", async () => {
    const id = `${projectId}-backend-refresh-changed`;
    const before = await generateBackendProject(id, "Confirmed");
    const changed = getProjectById(id, before.storage)!;
    changed.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    changed.powerPlatform!.canvas!.selectedDataSourceTypes = [];
    persist(before.storage, changed);

    const refresh = await runPlanningClarificationGeneration(id, { storage: before.storage });
    const after = getProjectById(id, before.storage)!;
    const prior = after.planning!.proposals.find((proposal) => proposal.proposalId === before.proposalId);
    const assessment = await analyzePlanningClarificationReadinessEvidence(after);

    expect(refresh).toEqual({
      outcome: "blocked",
      successful: false,
      message: "Planning could not be refreshed safely. Review the latest project information and try again."
    });
    expect(prior?.status).toBe("Confirmed");
    expect(validatedCount(assessment)).toBe(0);
    expect(assessment.readinessAuthorized).toBe(false);
  });

  it("blocks open blocking conflicts through every supported proposal reference location", async () => {
    const targetProposalId = yamlProposal(confirmedBaseline).proposalId;
    const otherProposal = confirmedBaseline.planning!.proposals.find(
      (proposal) => proposal.proposalId !== targetProposalId
    )!;
    const otherSourceId = otherProposal.sourceIds[0];
    for (const references of [
      { involvedReferences: [{ kind: "proposalId" as const, proposalId: targetProposalId }] },
      {
        involvedReferences: [{ kind: "sourceId" as const, sourceId: otherSourceId }],
        affectedProposalIds: [targetProposalId]
      },
      {
        involvedReferences: [{ kind: "proposalId" as const, proposalId: otherProposal.proposalId }],
        resolutionOptionProposalIds: [targetProposalId]
      }
    ]) {
      const project = cloneProject(confirmedBaseline);
      project.planning = {
        ...project.planning!,
        conflicts: [blockingConflict(yamlProposal(project).proposalId, references)]
      };
      expect(yamlAssessment(await analyzePlanningClarificationReadinessEvidence(project))).toMatchObject({
        disposition: "blocked",
        reason: "blockingConflict"
      });
    }
  });

  it("does not independently block resolved or nonblocking conflicts", async () => {
    for (const overrides of [
      { status: "resolved" as const, resolvedAt: "2026-08-24T12:04:00.000Z" },
      { severity: "warning" as const, blocking: false }
    ]) {
      const project = cloneProject(confirmedBaseline);
      project.planning = {
        ...project.planning!,
        conflicts: [blockingConflict(yamlProposal(project).proposalId, overrides)]
      };
      expect(yamlAssessment(await analyzePlanningClarificationReadinessEvidence(project))?.disposition)
        .toBe("validatedCandidate");
    }
  });

  it("does not validate stale current-context evidence before Refresh", async () => {
    const project = mutateYamlProposal(confirmedBaseline, (proposal) => ({
      ...proposal,
      applicableDomains: ["security"],
      fingerprint: "c".repeat(64)
    }));
    expect(validatedCount(await analyzePlanningClarificationReadinessEvidence(project))).toBe(0);
  });

  it("does not preserve predecessor authority after deterministic Refresh replacement", async () => {
    const storage = new MemoryStorage();
    const changed = mutateYamlProposal(confirmedBaseline, (proposal) => ({
      ...proposal,
      applicableDomains: ["security"],
      fingerprint: "d".repeat(64)
    }));
    persist(storage, changed);
    const refreshed = await runPlanningClarificationGeneration(changed.identity.id, { storage });
    expect(refreshed.outcome).toBe("refreshed");
    const project = getProjectById(changed.identity.id, storage)!;
    const yamlProposals = project.planning!.proposals.filter((proposal) => proposal.ruleId === yamlRuleId);
    expect(yamlProposals.some((proposal) => proposal.status === "Superseded")).toBe(true);
    expect(yamlProposals.some((proposal) => proposal.status === "Needs Clarification")).toBe(true);
    expect(validatedCount(await analyzePlanningClarificationReadinessEvidence(project))).toBe(0);
  });

  it("reports clarificationNotCurrentlyRequired when the canonical YAML gate is already resolved", async () => {
    const project = resolveYamlGate(canvasProject("resolved-yaml-project"));
    project.planning = createEmptyProjectPlanningState();
    const assessment = yamlAssessment(await analyzePlanningClarificationReadinessEvidence(project));
    expect(assessment).toMatchObject({
      disposition: "notCandidate",
      reason: "clarificationNotCurrentlyRequired",
      readinessAuthorized: false
    });
  });

  it("fails malformed Planning closed with bounded issue codes and no raw content", async () => {
    const project = cloneProject(confirmedBaseline);
    project.planning = {
      ...project.planning!,
      schemaVersion: "unsupported-secret-schema" as never
    };
    const result = await analyzePlanningClarificationReadinessEvidence(project);
    expect(result).toEqual({
      version: PLANNING_CLARIFICATION_READINESS_EVIDENCE_VERSION,
      outcome: "blocked",
      projectId: project.identity.id,
      readinessAuthorized: false,
      assessments: [],
      reasonCodes: ["invalidPlanning"]
    });
    expect(JSON.stringify(result)).not.toContain("unsupported-secret-schema");
  });

  it("preserves the existing readiness and output helper hard boundaries", () => {
    expect(isPlanningStatusReadinessEligible("Confirmed")).toBe(false);
    expect(isPlanningStatusReadinessEligible("Not Applicable")).toBe(false);
    expect(isPlanningStatusOutputEligible("Confirmed")).toBe(false);
  });

  it("has zero readiness consumers, mappings, approval persistence, repository writes, clocks, or UUID allocation", () => {
    const analyzer = readFileSync("src/lib/planningClarificationReadinessEvidence.ts", "utf8");
    for (const file of [
      "phaseGates.ts",
      "powerPlatform.ts",
      "clientReview.ts",
      "generatedPackageReadiness.ts",
      "generateProjectPackage.ts"
    ]) {
      const source = readFileSync(`src/lib/${file}`, "utf8");
      expect(source).not.toContain("planningClarificationReadinessEvidence");
    }
    expect(analyzer).not.toMatch(/projectRepository|StorageAdapter|packageGeneratedAt\s*=|generatedDocuments\s*=|Date\.now|new Date|randomUUID|Math\.random/);
    expect(analyzer).not.toMatch(/mappingId|mappingVersion|canonicalPath|architectApprovalSatisfied|architectApproved/);
    expect(analyzer).not.toContain("getPlanningSourcePrecedence");
    expect(analyzer).not.toContain("isPlanningStatusReadinessEligible(");
    expect(analyzer).not.toContain("isPlanningStatusOutputEligible(");
  });
});
