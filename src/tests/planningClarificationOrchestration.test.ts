// @ts-expect-error -- Vitest supplies Web Crypto in Node; the app tsconfig excludes Node ambient types.
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProject } from "../lib/createProject";
import * as phaseGates from "../lib/phaseGates";
import { runPlanningClarificationGeneration } from "../lib/planningClarificationOrchestration";
import {
  getProjectById,
  saveStorageState,
  type StorageAdapter
} from "../lib/projectRepository";
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import type { ProjectRecord } from "../types/project";

const projectId = "planning-orchestration-project";
const timestamp = "2026-08-23T12:00:00.000Z";

class MemoryStorage implements StorageAdapter {
  protected values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function canvasProject(id = projectId): ProjectRecord {
  const project = createProject({
    identity: { id, projectName: "Planning Orchestration" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Plan a controlled Canvas application."
    },
    now: timestamp
  });
  project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
  project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList"];
  return project;
}

function persist(storage: StorageAdapter, projects: ProjectRecord[], activeProjectId = projects[0]?.identity.id ?? null) {
  saveStorageState({ version: CURRENT_STORAGE_VERSION, activeProjectId, projects }, storage);
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("planning clarification orchestration", () => {
  it("uses the exact persisted Canvas project and real pipeline to materialize unresolved planning only on demand", async () => {
    const storage = new MemoryStorage();
    const requested = canvasProject();
    const other = canvasProject("other-project");
    const readinessBefore = JSON.stringify(requested.readinessConfirmations);
    persist(storage, [requested, other], other.identity.id);

    const result = await runPlanningClarificationGeneration(requested.identity.id, { storage });
    const persisted = getProjectById(requested.identity.id, storage)!;

    expect(result).toEqual({
      outcome: "generated",
      successful: true,
      message: "Planning generated from the current project state."
    });
    expect(persisted.planning?.sources.length).toBeGreaterThan(0);
    expect(persisted.planning?.proposals.length).toBeGreaterThan(0);
    expect(persisted.planning?.proposals.every((proposal) => proposal.status === "Needs Clarification")).toBe(true);
    expect(persisted.planning?.decisions).toEqual([]);
    expect(JSON.stringify(persisted.readinessConfirmations)).toBe(readinessBefore);
    expect(persisted.controlledApplyHistory).toEqual([]);
    expect(getProjectById(other.identity.id, storage)?.planning?.proposals).toEqual([]);
  });

  it("is idempotent when the canonical project and deterministic snapshot are unchanged", async () => {
    const storage = new MemoryStorage();
    const project = canvasProject();
    persist(storage, [project]);
    await runPlanningClarificationGeneration(project.identity.id, { storage });
    const first = getProjectById(project.identity.id, storage)!.planning!;
    const firstIds = {
      sources: first.sources.map((source) => source.sourceId),
      proposals: first.proposals.map((proposal) => proposal.proposalId),
      decisions: first.decisions.map((decision) => decision.decisionId)
    };

    const result = await runPlanningClarificationGeneration(project.identity.id, { storage });
    const second = getProjectById(project.identity.id, storage)!.planning!;

    expect(result.outcome).toBe("unchanged");
    expect(second.sources.map((source) => source.sourceId)).toEqual(firstIds.sources);
    expect(second.proposals.map((proposal) => proposal.proposalId)).toEqual(firstIds.proposals);
    expect(second.decisions.map((decision) => decision.decisionId)).toEqual(firstIds.decisions);
  });

  it("preserves predecessor history while the real lifecycle stales changed evidence and creates a linked replacement", async () => {
    const storage = new MemoryStorage();
    const project = canvasProject();
    persist(storage, [project]);
    await runPlanningClarificationGeneration(project.identity.id, { storage });
    const generated = getProjectById(project.identity.id, storage)!;
    const planning = generated.planning!;
    const predecessor = planning.proposals[0];
    const changedPlanning = {
      ...planning,
      proposals: planning.proposals.map((proposal, index) => index === 0 ? {
        ...proposal,
        applicableDomains: ["security" as const],
        fingerprint: "a".repeat(64)
      } : proposal)
    };
    persist(storage, [{ ...generated, planning: changedPlanning }]);

    const result = await runPlanningClarificationGeneration(project.identity.id, { storage });
    const refreshed = getProjectById(project.identity.id, storage)!.planning!;
    const oldProposal = refreshed.proposals.find((proposal) => proposal.proposalId === predecessor.proposalId)!;
    const replacement = refreshed.proposals.find((proposal) => proposal.proposalId === oldProposal.supersededByProposalId)!;

    expect(result.outcome).toBe("refreshed");
    expect(oldProposal).toMatchObject({ status: "Superseded", supersededByProposalId: replacement.proposalId });
    expect(replacement).toMatchObject({ status: "Needs Clarification", ruleId: predecessor.ruleId });
    expect(replacement.proposalId).not.toBe(predecessor.proposalId);
    expect(refreshed.decisions.some((decision) =>
      decision.proposalId === predecessor.proposalId && decision.action === "markStale"
    )).toBe(true);
    expect(refreshed.decisions.some((decision) =>
      decision.proposalId === predecessor.proposalId && decision.action === "supersede"
    )).toBe(true);
  });

  it("fails a deliberately invalid lifecycle closed without exposing raw details or fabricating history", async () => {
    const storage = new MemoryStorage();
    const project = canvasProject();
    persist(storage, [project]);
    await runPlanningClarificationGeneration(project.identity.id, { storage });
    const generated = getProjectById(project.identity.id, storage)!;
    const predecessor = generated.planning!.proposals[0];
    const readinessSourceId = predecessor.sourceIds.find((sourceId) =>
      generated.planning!.sources.find((source) => source.sourceId === sourceId)?.sourceType === "readinessPrerequisite"
    )!;
    const invalid = {
      ...generated,
      planning: {
        ...generated.planning!,
        sources: generated.planning!.sources.map((source) => source.sourceId === readinessSourceId ? {
          ...source,
          label: "SECRET previous readiness detail"
        } : source),
        proposals: generated.planning!.proposals.map((proposal, index) => index === 0 ? {
          ...proposal,
          applicableDomains: ["security"],
          fingerprint: "b".repeat(64)
        } : proposal)
      }
    } as unknown as ProjectRecord;
    persist(storage, [invalid]);
    const before = JSON.stringify(getProjectById(project.identity.id, storage)!.planning);

    const result = await runPlanningClarificationGeneration(project.identity.id, { storage });

    expect(result).toMatchObject({ outcome: "blocked", successful: false });
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(JSON.stringify(getProjectById(project.identity.id, storage)!.planning)).toBe(before);
  });

  it("does not fabricate questions when every active rule gate is resolved", async () => {
    const storage = new MemoryStorage();
    const project = canvasProject();
    persist(storage, [project]);
    vi.spyOn(phaseGates, "evaluatePhaseGate").mockImplementation((_project, gateId) => ({
      id: gateId,
      label: `Resolved ${gateId}`,
      status: "confirmed",
      blockingReason: "Resolved.",
      sourceSection: "Resolved readiness"
    }));

    const result = await runPlanningClarificationGeneration(project.identity.id, { storage });

    expect(result).toEqual({
      outcome: "unchanged",
      successful: true,
      message: "No unresolved clarification questions were generated."
    });
    expect(getProjectById(project.identity.id, storage)?.planning?.proposals).toEqual([]);
  });

  it("returns safe boundaries for missing and unsupported projects without repository writes", async () => {
    const storage = new MemoryStorage();
    const unsupported = createProject({
      identity: { id: "web-project", projectName: "Unsupported" },
      intake: { appType: "webApplication" },
      now: timestamp
    });
    persist(storage, [unsupported]);
    const before = JSON.stringify(getProjectById(unsupported.identity.id, storage));

    const unsupportedResult = await runPlanningClarificationGeneration(unsupported.identity.id, { storage });
    const missingResult = await runPlanningClarificationGeneration("missing-project", { storage });

    expect(unsupportedResult.outcome).toBe("unsupportedProjectType");
    expect(missingResult.outcome).toBe("projectNotFound");
    expect(JSON.stringify(getProjectById(unsupported.identity.id, storage))).toBe(before);
  });
});
