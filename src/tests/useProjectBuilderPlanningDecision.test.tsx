import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectBuilder } from "../app/useProjectBuilder";
import type {
  PlanningClarificationDecisionRepositoryInput,
  PlanningClarificationDecisionRepositoryResult
} from "../lib/planningClarificationDecisionMaterialization";
import type { StorageState } from "../types/project";

const repositoryMocks = vi.hoisted(() => ({
  getPersistenceWarning: vi.fn(),
  loadStorageState: vi.fn(),
  materializeProjectPlanningClarificationHumanDecision: vi.fn()
}));

vi.mock("../lib/projectRepository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/projectRepository")>();
  return {
    ...actual,
    getPersistenceWarning: repositoryMocks.getPersistenceWarning,
    loadStorageState: repositoryMocks.loadStorageState,
    materializeProjectPlanningClarificationHumanDecision:
      repositoryMocks.materializeProjectPlanningClarificationHumanDecision
  };
});

const suppliedProjectId = "explicit-project-id";
const activeProjectId = "different-active-project-id";
const proposalId = "22222222-2222-4222-8222-000000000001";
const input: PlanningClarificationDecisionRepositoryInput = {
  proposalId,
  action: "reject",
  reason: "The planning item does not match the approved scope."
};

function state(id: string | null): StorageState {
  return { version: 5, activeProjectId: id, projects: [] };
}

function repositoryResult(
  outcome: PlanningClarificationDecisionRepositoryResult["outcome"],
  overrides: Partial<PlanningClarificationDecisionRepositoryResult> = {}
): PlanningClarificationDecisionRepositoryResult {
  return {
    outcome,
    projectId: suppliedProjectId,
    proposalId,
    action: input.action,
    issues: [],
    ...overrides
  };
}

function arrangeRepository(
  result: PlanningClarificationDecisionRepositoryResult,
  calls: string[]
): { refreshedState: StorageState } {
  const initialState = state(activeProjectId);
  const refreshedState = state("durable-refreshed-project-id");
  repositoryMocks.loadStorageState
    .mockImplementationOnce(() => initialState)
    .mockImplementation(() => {
      calls.push("loadStorageState");
      return refreshedState;
    });
  repositoryMocks.getPersistenceWarning
    .mockImplementationOnce(() => null)
    .mockImplementation(() => {
      calls.push("getPersistenceWarning");
      return "Durable persistence warning.";
    });
  repositoryMocks.materializeProjectPlanningClarificationHumanDecision.mockImplementation(
    async (projectId: string, repositoryInput: PlanningClarificationDecisionRepositoryInput) => {
      calls.push("repository");
      expect(projectId).toBe(suppliedProjectId);
      expect(repositoryInput).toBe(input);
      return result;
    }
  );
  return { refreshedState };
}

describe("useProjectBuilder planning clarification decision wiring", () => {
  beforeEach(() => {
    repositoryMocks.getPersistenceWarning.mockReset();
    repositoryMocks.loadStorageState.mockReset();
    repositoryMocks.materializeProjectPlanningClarificationHumanDecision.mockReset();
  });

  it("passes the explicit project ID and exact repository input, then refreshes persisted durable state", async () => {
    const calls: string[] = [];
    const persisted = repositoryResult("persisted", { action: "confirm" });
    const { refreshedState } = arrangeRepository(persisted, calls);
    const { result } = renderHook(() => useProjectBuilder());
    let submission: Awaited<ReturnType<typeof result.current.submitPlanningClarificationDecision>> | undefined;

    await act(async () => {
      submission = await result.current.submitPlanningClarificationDecision(suppliedProjectId, input);
    });

    expect(repositoryMocks.materializeProjectPlanningClarificationHumanDecision).toHaveBeenCalledOnce();
    expect(calls).toEqual([
      "repository",
      "loadStorageState",
      "getPersistenceWarning",
      "getPersistenceWarning"
    ]);
    expect(submission).toEqual({
      repositoryResult: persisted,
      feedback: { kind: "persisted", successful: true, message: "Planning decision confirmed." }
    });
    expect(result.current.storageState).toBe(refreshedState);
    expect(result.current.persistenceWarning).toBe("Durable persistence warning.");
    expect(result.current.storageState.activeProjectId).not.toBe(activeProjectId);
  });

  it.each([
    ["blocked", repositoryResult("blocked", {
      issues: [{ code: "invalidStatusTransition", message: "INTERNAL blocked detail" }]
    }), "blocked"],
    ["stateChanged", repositoryResult("blocked", {
      issues: [{ code: "projectChangedDuringDecisionMaterialization", message: "INTERNAL concurrent detail" }]
    }), "stateChanged"],
    ["projectNotFound", repositoryResult("projectNotFound", {
      issues: [{ code: "projectNotFound", message: "INTERNAL missing detail" }]
    }), "projectNotFound"],
    ["unsupportedProjectType", repositoryResult("unsupportedProjectType", {
      issues: [{ code: "unsupportedProjectType", message: "INTERNAL type detail" }]
    }), "unsupportedProjectType"],
    ["persistenceFailed", repositoryResult("persistenceFailed", {
      issues: [{ code: "persistenceFailed", message: "INTERNAL storage detail" }]
    }), "persistenceFailed"]
  ] as const)("refreshes after %s without retry or false success", async (_label, repositoryResponse, feedbackKind) => {
    const calls: string[] = [];
    arrangeRepository(repositoryResponse, calls);
    const { result } = renderHook(() => useProjectBuilder());
    let submission: Awaited<ReturnType<typeof result.current.submitPlanningClarificationDecision>> | undefined;

    await act(async () => {
      submission = await result.current.submitPlanningClarificationDecision(suppliedProjectId, input);
    });

    expect(repositoryMocks.materializeProjectPlanningClarificationHumanDecision).toHaveBeenCalledOnce();
    expect(calls).toEqual([
      "repository",
      "loadStorageState",
      "getPersistenceWarning",
      "getPersistenceWarning"
    ]);
    expect(submission?.repositoryResult).toBe(repositoryResponse);
    expect(submission?.feedback).toMatchObject({ kind: feedbackKind, successful: false });
    expect(JSON.stringify(submission?.feedback)).not.toContain("INTERNAL");
    expect(result.current.persistenceWarning).toBe("Durable persistence warning.");
  });

  it("refreshes through finally and propagates an unexpected repository rejection", async () => {
    const calls: string[] = [];
    const unexpectedError = new Error("Unexpected repository rejection");
    const initialState = state(activeProjectId);
    const refreshedState = state("durable-after-rejection");
    repositoryMocks.loadStorageState
      .mockImplementationOnce(() => initialState)
      .mockImplementation(() => {
        calls.push("loadStorageState");
        return refreshedState;
      });
    repositoryMocks.getPersistenceWarning
      .mockImplementationOnce(() => null)
      .mockImplementation(() => {
        calls.push("getPersistenceWarning");
        return "Warning after rejection.";
      });
    repositoryMocks.materializeProjectPlanningClarificationHumanDecision.mockImplementation(async () => {
      calls.push("repository");
      throw unexpectedError;
    });
    const { result } = renderHook(() => useProjectBuilder());
    let caught: unknown;

    await act(async () => {
      try {
        await result.current.submitPlanningClarificationDecision(suppliedProjectId, input);
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBe(unexpectedError);
    expect(calls).toEqual([
      "repository",
      "loadStorageState",
      "getPersistenceWarning",
      "getPersistenceWarning"
    ]);
    expect(repositoryMocks.materializeProjectPlanningClarificationHumanDecision).toHaveBeenCalledOnce();
    expect(result.current.storageState).toBe(refreshedState);
    expect(result.current.persistenceWarning).toBe("Warning after rejection.");
  });

  it("maps each explicit invocation to exactly one repository call without hook-level locking", async () => {
    const calls: string[] = [];
    arrangeRepository(repositoryResult("blocked"), calls);
    const { result } = renderHook(() => useProjectBuilder());

    await act(async () => {
      await result.current.submitPlanningClarificationDecision(suppliedProjectId, input);
      await result.current.submitPlanningClarificationDecision(suppliedProjectId, input);
    });

    expect(repositoryMocks.materializeProjectPlanningClarificationHumanDecision).toHaveBeenCalledTimes(2);
    expect(calls.filter((entry) => entry === "repository")).toHaveLength(2);
  });

  it("preserves every existing public hook operation and introduces no UI state", () => {
    const calls: string[] = [];
    arrangeRepository(repositoryResult("blocked"), calls);
    const { result } = renderHook(() => useProjectBuilder());

    for (const method of [
      "updateIntake",
      "updatePowerPlatform",
      "updateClientReviewItem",
      "setReadinessConfirmation",
      "markGenerated",
      "createNewProject",
      "setActiveProject",
      "duplicateSavedProject",
      "archiveSavedProject",
      "restoreSavedProject",
      "deleteSavedProject",
      "submitPlanningClarificationDecision"
    ] as const) {
      expect(result.current[method]).toEqual(expect.any(Function));
    }

    expect(result.current).not.toHaveProperty("answerDraft");
    expect(result.current).not.toHaveProperty("reasonDraft");
    expect(result.current).not.toHaveProperty("submittingProposal");
    expect(result.current).not.toHaveProperty("decisionFeedback");
  });
});
