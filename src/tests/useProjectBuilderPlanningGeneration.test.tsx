import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectBuilder } from "../app/useProjectBuilder";
import { createProject } from "../lib/createProject";
import { createEmptyProjectPlanningState, type PlanningProposalRecord } from "../lib/planningProposals";
import type { PlanningClarificationOrchestrationResult } from "../lib/planningClarificationOrchestration";
import type { StorageState } from "../types/project";

const orchestrationMocks = vi.hoisted(() => ({
  runPlanningClarificationGeneration: vi.fn()
}));

const repositoryMocks = vi.hoisted(() => ({
  getPersistenceWarning: vi.fn(),
  loadStorageState: vi.fn(),
  materializeProjectPlanningClarificationHumanDecision: vi.fn(),
  updateProjectFields: vi.fn(),
  updateReadinessConfirmation: vi.fn()
}));

vi.mock("../lib/planningClarificationOrchestration", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/planningClarificationOrchestration")>();
  return { ...actual, runPlanningClarificationGeneration: orchestrationMocks.runPlanningClarificationGeneration };
});

vi.mock("../lib/projectRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/projectRepository")>();
  return {
    ...actual,
    getPersistenceWarning: repositoryMocks.getPersistenceWarning,
    loadStorageState: repositoryMocks.loadStorageState,
    materializeProjectPlanningClarificationHumanDecision:
      repositoryMocks.materializeProjectPlanningClarificationHumanDecision,
    updateProjectFields: repositoryMocks.updateProjectFields,
    updateReadinessConfirmation: repositoryMocks.updateReadinessConfirmation
  };
});

const activeProjectId = "active-planning-project";

function state(withPlanning = false): StorageState {
  const project = createProject({
    identity: { id: activeProjectId, projectName: withPlanning ? "Persisted Planning" : "Before Planning" },
    intake: { appType: "powerAppsCanvas" },
    now: "2026-08-23T12:00:00.000Z"
  });
  if (withPlanning) {
    project.planning = createEmptyProjectPlanningState();
    project.planning.proposals = [{} as PlanningProposalRecord];
  }
  return { version: 6, activeProjectId, projects: [project] };
}

const generatedResult: PlanningClarificationOrchestrationResult = {
  outcome: "generated",
  successful: true,
  message: "Planning generated from the current project state."
};

describe("useProjectBuilder planning generation wiring", () => {
  beforeEach(() => {
    Object.values(orchestrationMocks).forEach((mock) => mock.mockReset());
    Object.values(repositoryMocks).forEach((mock) => mock.mockReset());
    repositoryMocks.getPersistenceWarning.mockReturnValue(null);
    repositoryMocks.loadStorageState.mockReturnValue(state(false));
    repositoryMocks.materializeProjectPlanningClarificationHumanDecision.mockResolvedValue({
      outcome: "projectNotFound",
      projectId: activeProjectId,
      proposalId: "22222222-2222-4222-8222-000000000001",
      action: "reject",
      issues: []
    });
  });

  it("exposes one Generate/Refresh action, passes the active project ID, returns its safe result, and reloads canonical planning", async () => {
    const refreshed = state(true);
    repositoryMocks.loadStorageState
      .mockReturnValueOnce(state(false))
      .mockReturnValue(refreshed);
    orchestrationMocks.runPlanningClarificationGeneration.mockResolvedValue(generatedResult);
    const { result } = renderHook(() => useProjectBuilder());
    let operationResult: PlanningClarificationOrchestrationResult | undefined;

    await act(async () => {
      operationResult = await result.current.generateOrRefreshPlanning(result.current.project!.identity.id);
    });

    expect(orchestrationMocks.runPlanningClarificationGeneration).toHaveBeenCalledOnce();
    expect(orchestrationMocks.runPlanningClarificationGeneration).toHaveBeenCalledWith(activeProjectId);
    expect(operationResult).toBe(generatedResult);
    expect(result.current.storageState).toBe(refreshed);
    expect(result.current.project?.planning?.proposals).toHaveLength(1);
    expect(result.current).not.toHaveProperty("generatePlanning");
    expect(result.current).not.toHaveProperty("refreshPlanning");
    expect(result.current).not.toHaveProperty("materializePlanningStaleTransitions");
  });

  it("reloads canonical state after a safe unsuccessful result", async () => {
    const refreshed = state(true);
    repositoryMocks.loadStorageState.mockReturnValueOnce(state(false)).mockReturnValue(refreshed);
    const blocked: PlanningClarificationOrchestrationResult = {
      outcome: "blocked",
      successful: false,
      message: "Planning could not be refreshed safely. Review the latest project information and try again."
    };
    orchestrationMocks.runPlanningClarificationGeneration.mockResolvedValue(blocked);
    const { result } = renderHook(() => useProjectBuilder());

    await act(async () => {
      expect(await result.current.generateOrRefreshPlanning(activeProjectId)).toBe(blocked);
    });

    expect(repositoryMocks.loadStorageState).toHaveBeenCalledTimes(2);
    expect(result.current.storageState).toBe(refreshed);
  });

  it("attempts repository refresh after an exception and preserves the primary error", async () => {
    const primary = new Error("primary orchestration failure");
    repositoryMocks.loadStorageState.mockReturnValueOnce(state(false)).mockReturnValue(state(true));
    orchestrationMocks.runPlanningClarificationGeneration.mockRejectedValue(primary);
    const { result } = renderHook(() => useProjectBuilder());
    let caught: unknown;

    await act(async () => {
      try {
        await result.current.generateOrRefreshPlanning(activeProjectId);
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBe(primary);
    expect(repositoryMocks.loadStorageState).toHaveBeenCalledTimes(2);
    expect(result.current.project?.planning?.proposals).toHaveLength(1);
  });

  it("does not generate on mount, intake update, or readiness update", () => {
    const { result } = renderHook(() => useProjectBuilder());

    act(() => result.current.updateIntake({ appPurpose: "Updated purpose" }));
    act(() => result.current.setReadinessConfirmation("scopeReviewed", true));

    expect(repositoryMocks.updateProjectFields).toHaveBeenCalledOnce();
    expect(repositoryMocks.updateReadinessConfirmation).toHaveBeenCalledOnce();
    expect(orchestrationMocks.runPlanningClarificationGeneration).not.toHaveBeenCalled();
  });

  it("leaves existing clarification decision submission independently callable", async () => {
    const { result } = renderHook(() => useProjectBuilder());
    const input = {
      proposalId: "22222222-2222-4222-8222-000000000001",
      action: "reject" as const,
      reason: "Out of approved scope."
    };

    await act(async () => {
      await result.current.submitPlanningClarificationDecision(activeProjectId, input);
    });

    expect(repositoryMocks.materializeProjectPlanningClarificationHumanDecision).toHaveBeenCalledWith(activeProjectId, input);
    expect(orchestrationMocks.runPlanningClarificationGeneration).not.toHaveBeenCalled();
  });
});
