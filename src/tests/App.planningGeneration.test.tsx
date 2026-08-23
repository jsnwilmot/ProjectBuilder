// @ts-expect-error -- Vitest supplies Web Crypto in Node; the app tsconfig excludes Node ambient types.
import { webcrypto } from "node:crypto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generationMocks = vi.hoisted(() => ({
  run: vi.fn(),
  actualRun: undefined as undefined | ((projectId: string) => Promise<unknown>)
}));

vi.mock("../lib/planningClarificationOrchestration", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/planningClarificationOrchestration")>();
  generationMocks.actualRun = actual.runPlanningClarificationGeneration;
  generationMocks.run.mockImplementation(actual.runPlanningClarificationGeneration);
  return { ...actual, runPlanningClarificationGeneration: generationMocks.run };
});

vi.mock("../components/AppShell/AppHeader", () => ({ AppHeader: () => null }));
vi.mock("../components/AppShell/AppNavigation", () => ({
  AppNavigation: ({ onNavigate }: { onNavigate: (view: "dashboard" | "intake" | "planning") => void }) => (
    <nav aria-label="Primary navigation">
      <button type="button" onClick={() => onNavigate("dashboard")}>Mission Control</button>
      <button type="button" onClick={() => onNavigate("intake")}>Guided Intake</button>
      <button type="button" onClick={() => onNavigate("planning")}>Planning</button>
    </nav>
  )
}));
vi.mock("../components/DocumentViewer/DocumentViewer", () => ({ DocumentViewer: () => null }));
vi.mock("../components/ExportPanel/ExportPanel", () => ({ ExportPanel: () => null }));
vi.mock("../components/IntakeBuilder/IntakeBuilder", () => ({ IntakeBuilder: () => <h1>Guided Intake Test View</h1> }));
vi.mock("../components/MissionControl/MissionControl", () => ({ MissionControl: () => <h1>Mission Control Test View</h1> }));

import { App } from "../app/App";
import { createProject } from "../lib/createProject";
import { loadStorageState, saveStorageState } from "../lib/projectRepository";
import { CURRENT_STORAGE_VERSION } from "../lib/storageVersion";
import type { ProjectRecord } from "../types/project";

const projectId = "app-planning-generation-project";

function canvasProject(): ProjectRecord {
  const project = createProject({
    identity: { id: projectId, projectName: "Planning Generation Project" },
    intake: { appType: "powerAppsCanvas", appPurpose: "Plan a controlled Canvas application." },
    now: "2026-08-23T12:00:00.000Z"
  });
  project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
  project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList"];
  return project;
}

function seed(project = canvasProject()) {
  saveStorageState({
    version: CURRENT_STORAGE_VERSION,
    activeProjectId: project.identity.id,
    projects: [project]
  });
}

async function generatePersistedPlanning() {
  seed();
  await generationMocks.actualRun!(projectId);
  expect(loadStorageState().projects[0].planning?.proposals.length).toBeGreaterThan(0);
}

describe("App - explicit planning generation and refresh", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", webcrypto);
    window.localStorage.clear();
    generationMocks.run.mockReset();
    generationMocks.run.mockImplementation(generationMocks.actualRun!);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("materializes zero-state Canvas planning and rerenders persisted bound and unbound questions", async () => {
    const user = userEvent.setup();
    seed();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));
    expect(screen.getByText("0 planning items")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate planning" }));

    expect(await screen.findByText("Planning generated from the current project state.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Questions to answer" })).toBeInTheDocument();
    const boundCard = screen.getByRole("heading", { name: "Confirm Canvas YAML planning" }).closest("article")!;
    expect(within(boundCard).getByRole("button", { name: "Answer question" })).toBeInTheDocument();
    const backendCard = screen.getByRole("heading", { name: "Confirm the backend schema" }).closest("article")!;
    expect(within(backendCard).getByText(/answer structure is not registered/i)).toBeInTheDocument();
    expect(loadStorageState().projects[0].planning?.proposals.every((proposal) => proposal.status === "Needs Clarification")).toBe(true);
    expect(generationMocks.run).toHaveBeenCalledOnce();
  }, 30000);

  it("never generates while mounting or navigating among ordinary views", async () => {
    const user = userEvent.setup();
    seed();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Guided Intake" }));
    await user.click(screen.getByRole("button", { name: "Mission Control" }));
    await user.click(screen.getByRole("button", { name: "Planning" }));

    expect(screen.getByRole("button", { name: "Generate planning" })).toBeInTheDocument();
    expect(generationMocks.run).not.toHaveBeenCalled();
    expect(loadStorageState().projects[0].planning?.proposals).toEqual([]);
  });

  it("runs an unchanged Refresh planning exactly once without duplicates", async () => {
    const user = userEvent.setup();
    await generatePersistedPlanning();
    const before = loadStorageState().projects[0].planning!;
    generationMocks.run.mockClear();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));
    expect(generationMocks.run).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Refresh planning" }));

    expect(await screen.findByText("Planning is already current.")).toBeInTheDocument();
    expect(generationMocks.run).toHaveBeenCalledOnce();
    const after = loadStorageState().projects[0].planning!;
    expect(after.sources.map((source) => source.sourceId)).toEqual(before.sources.map((source) => source.sourceId));
    expect(after.proposals.map((proposal) => proposal.proposalId)).toEqual(before.proposals.map((proposal) => proposal.proposalId));
    expect(after.decisions).toEqual(before.decisions);
  }, 30000);

  it("preserves a saved answer and deferral through the explicit Refresh planning UI flow", async () => {
    const user = userEvent.setup();
    await generatePersistedPlanning();
    generationMocks.run.mockClear();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Planning" }));
    expect(generationMocks.run).not.toHaveBeenCalled();
    let yamlCard = screen.getByRole("heading", { name: "Confirm Canvas YAML planning" }).closest("article")!;
    await user.click(within(yamlCard).getByRole("button", { name: "Answer question" }));
    await user.type(within(yamlCard).getByRole("textbox", { name: /Installation responsibility/ }), "Solution owner");
    await user.type(within(yamlCard).getByRole("textbox", { name: /Validation responsibility/ }), "Technical reviewer");
    await user.type(within(yamlCard).getByRole("textbox", { name: /Application location/ }), "Approved Canvas app");
    await user.type(within(yamlCard).getByRole("textbox", { name: /Parent relationship/ }), "Approved parent relationship");
    await user.click(within(yamlCard).getByRole("button", { name: "Save answer for review" }));
    expect(await screen.findByText("Planning answer saved for review.")).toBeInTheDocument();

    yamlCard = screen.getByRole("heading", { name: "Confirm Canvas YAML planning" }).closest("article")!;
    await user.click(within(yamlCard).getByRole("button", { name: "Defer" }));
    await user.type(within(yamlCard).getByRole("textbox", { name: "Deferral reason" }), "Awaiting approved client evidence.");
    await user.click(within(yamlCard).getByRole("button", { name: "Defer decision" }));
    expect(await screen.findByText("Planning item deferred.")).toBeInTheDocument();

    const beforeRefresh = loadStorageState().projects[0].planning!;
    const deferred = beforeRefresh.proposals.find((proposal) => proposal.ruleId === "pp.canvas.yamlplanning.confirmation")!;
    expect(deferred).toMatchObject({
      status: "Deferred",
      value: {
        kind: "structuredRecord",
        value: {
          installationResponsibility: { kind: "text", value: "Solution owner" }
        }
      }
    });
    expect(beforeRefresh.decisions.map((decision) => decision.action)).toContain("revise");
    expect(beforeRefresh.decisions.at(-1)).toMatchObject({
      action: "defer",
      reason: "Awaiting approved client evidence."
    });
    expect(beforeRefresh.sources.filter((source) => source.sourceType === "userAnswer")).toHaveLength(1);
    expect(generationMocks.run).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Refresh planning" }));

    expect(await screen.findByText("Planning is already current.")).toBeInTheDocument();
    expect(screen.queryByText("Planning could not be refreshed safely. Review the latest project information and try again.")).not.toBeInTheDocument();
    expect(generationMocks.run).toHaveBeenCalledOnce();
    const afterRefresh = loadStorageState().projects[0].planning!;
    expect(afterRefresh).toEqual(beforeRefresh);
    expect(afterRefresh.proposals.find((proposal) => proposal.proposalId === deferred.proposalId)?.status).toBe("Deferred");
  }, 30000);

  it("blocks Refresh while a meaningful answer draft exists and enables it after explicit discard", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await generatePersistedPlanning();
    generationMocks.run.mockClear();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Planning" }));
    const yamlCard = screen.getByRole("heading", { name: "Confirm Canvas YAML planning" }).closest("article")!;
    await user.click(within(yamlCard).getByRole("button", { name: "Answer question" }));
    await user.type(within(yamlCard).getAllByRole("textbox")[0], "Solution owner");

    const refresh = screen.getByRole("button", { name: "Refresh planning" });
    expect(refresh).toBeDisabled();
    expect(screen.getByText("Finish or discard unsaved planning answers before refreshing planning.")).toBeInTheDocument();
    await user.click(refresh);
    expect(generationMocks.run).not.toHaveBeenCalled();
    expect(within(yamlCard).getAllByRole("textbox")[0]).toHaveValue("Solution owner");

    await user.click(within(yamlCard).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh planning" })).toBeEnabled());
    expect(confirm).toHaveBeenCalledOnce();
    expect(within(yamlCard).queryByDisplayValue("Solution owner")).not.toBeInTheDocument();
  }, 30000);

  it("translates an unexpected internal failure into generic focused UI feedback", async () => {
    const user = userEvent.setup();
    seed();
    generationMocks.run.mockRejectedValue(new Error("SECRET rule-id fingerprint source-id answer-content"));
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Planning" }));
    await user.click(screen.getByRole("button", { name: "Generate planning" }));

    const feedback = await screen.findByText("Planning could not be saved safely. Review the latest project state and try again.");
    await waitFor(() => expect(feedback).toHaveFocus());
    expect(document.body).not.toHaveTextContent("SECRET rule-id fingerprint source-id answer-content");
  });
});
