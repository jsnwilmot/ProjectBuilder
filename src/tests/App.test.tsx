import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../app/App";
import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import { STORAGE_KEY, saveStorageState } from "../lib/projectRepository";
import type { ProjectRecord } from "../types/project";

function seedApp(projects: ProjectRecord[] = [createSeedProject()], activeProjectId = projects[0]?.identity.id ?? null) {
  saveStorageState({ version: 1, activeProjectId, projects }, window.localStorage);
}

describe("App", () => {
  it("moves focus to the main landmark from the skip link", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Skip to main content" }));

    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("opens the next incomplete stage when continuing intake", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Continue intake/i }));
    expect(screen.getByRole("heading", { name: "Generate the handoff package" })).toBeInTheDocument();
  });

  it("opens a selected intake stage from Mission Control", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Mission Control" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Users: 100% complete/i }));

    expect(screen.getByRole("heading", { name: "Define users and roles" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Target users/i)).toHaveValue(
      "Residents\nProgram coordinators\nDepartment reviewers"
    );
  });

  it("shows generated documents without injecting HTML", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    expect(screen.getByRole("heading", { name: "Documentation Viewer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /DATA_MODEL\.md/i }));
    expect(screen.getByText(/\[MISSING: data sources\]/)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Search documents" }), "does-not-exist");
    expect(screen.getByRole("heading", { name: "No matching documents" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("heading", { name: "DATA_MODEL.md" })).toBeInTheDocument();
  });

  it("creates and switches persisted projects without replacing existing records", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    expect(screen.getByRole("heading", { name: "Set the project foundation" })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/App name/i), "Second Project");
    await user.click(screen.getByRole("button", { name: "Mission Control" }));

    expect(screen.getByRole("heading", { name: "Second Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select project Community Services Portal" })).toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as {
      activeProjectId: string;
      projects: Array<{ identity: { id: string; projectName: string } }>;
    };
    expect(stored.projects).toHaveLength(2);
    expect(stored.projects.some((project) => project.identity.projectName === "Community Services Portal")).toBe(true);
    expect(stored.projects.find((project) => project.identity.id === stored.activeProjectId)?.identity.projectName).toBe("Second Project");

    await user.click(screen.getByRole("button", { name: "Select project Community Services Portal" }));
    expect(screen.getByRole("heading", { name: "Community Services Portal" })).toBeInTheDocument();
  });

  it("shows missing information in the review stage", async () => {
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    await user.click(screen.getByRole("button", { name: "Scope Review" }));

    expect(screen.getByRole("heading", { name: "Review project readiness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scope Review" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("[MISSING: app purpose]")).toBeInTheDocument();
  });

  it("shows readiness counts in the generate stage and allows generation", async () => {
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    await user.click(screen.getByRole("button", { name: "Export" }));

    expect(screen.getByRole("button", { name: "Export" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/Required questions unresolved:/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    expect(screen.getByRole("heading", { name: "Documentation Viewer" })).toBeInTheDocument();
    expect(screen.getByText("16 generated documents")).toBeInTheDocument();
  });

  it("does not lose intake data when switching stages", async () => {
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    await user.type(screen.getByLabelText(/App name/i), "Stage Persistence App");

    await user.click(screen.getByRole("button", { name: "Continue to users" }));
    expect(screen.getByRole("heading", { name: "Define users and roles" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByLabelText(/App name/i)).toHaveValue("Stage Persistence App");
  });

  it("reads generated documents from the active project", async () => {
    const volunteerProject = createProject({
      identity: { id: "volunteer-management-app", projectName: "Volunteer Management App" },
      client: { clientName: "Volunteer Services" },
      intake: { appPurpose: "Coordinate volunteer applications." }
    });
    seedApp([createSeedProject(), volunteerProject]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    expect(screen.getByRole("heading", { name: "Documentation Viewer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument();
    expect(screen.getByText(/Community Services Portal/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mission Control" }));
    await user.click(screen.getByRole("button", { name: "Select project Volunteer Management App" }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    expect(screen.getByText(/Volunteer Management App/)).toBeInTheDocument();
  });

  it("blocks export before generation and reports readiness after generation", async () => {
    const user = userEvent.setup();
    render(<App />);

    const newProjectButton = screen
      .getAllByRole("button", { name: "New project" })
      .find((button) => !button.classList.contains("mobile-new-project"))!;
    await user.click(newProjectButton);
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));

    expect(screen.getByText("Cannot export yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate project package first" })).toBeInTheDocument();
    expect(screen.getByText("0/16")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate project package first" }));
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));

    expect(screen.getByText(/Warnings present|Ready to export/)).toBeInTheDocument();
    expect(screen.getByText("16/16")).toBeInTheDocument();
    expect(screen.getByText("No export errors.")).toBeInTheDocument();
  });

  it("copies active-project Architect instructions after generation", async () => {
    seedApp();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: "Copy Architect Instructions" }));

    const copiedText = await navigator.clipboard.readText();
    expect(copiedText).toContain("# Architect Instructions");
    expect(copiedText).toContain("Community Services Portal");
    expect(screen.getByText("Architect Instructions copied.")).toBeInTheDocument();
  });

  it("shows a useful empty state and prevents blank project routes", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "No active project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create your first project" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guided Intake" }));
    expect(screen.getByRole("heading", { name: "No active project" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create your first project" }));
    expect(screen.getByRole("heading", { name: "Set the project foundation" })).toBeInTheDocument();
  });

  it("recovers corrupt browser storage into the empty state", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not-json");
    render(<App />);

    expect(screen.getByRole("heading", { name: "No active project" })).toBeInTheDocument();
    expect(screen.getByText(/Create a project to start Foundation intake/)).toBeInTheDocument();
  });

  it("uses the selection fallback when clipboard permission is denied", async () => {
    seedApp();
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: "Copy Architect Instructions" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("Architect Instructions copied.")).toBeInTheDocument();
  });
});
