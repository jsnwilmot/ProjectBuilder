import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../app/App";
import { STORAGE_KEY } from "../lib/projectRepository";

describe("App", () => {
  it("opens the next incomplete stage when continuing intake", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Continue intake/i }));
    expect(screen.getByRole("heading", { name: "Generate the handoff package" })).toBeInTheDocument();
  });

  it("opens a selected intake stage from Mission Control", async () => {
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
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));
    expect(screen.getByRole("heading", { name: "Documentation Viewer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /DATA_MODEL\.md/i }));
    expect(screen.getByText(/\[MISSING: data sources\]/)).toBeInTheDocument();
  });

  it("creates and switches persisted projects without replacing existing records", async () => {
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
    expect(stored.projects).toHaveLength(4);
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

    expect(screen.getByText(/Missing required:/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    expect(screen.getByRole("heading", { name: "Documentation Viewer" })).toBeInTheDocument();
    expect(screen.getByText("16 files")).toBeInTheDocument();
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
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));
    expect(screen.getByRole("heading", { name: "Documentation Viewer" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument();
    expect(screen.getByText(/Community Services Portal/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mission Control" }));
    await user.click(screen.getByRole("button", { name: "Select project Volunteer Management App" }));
    await user.click(screen.getByRole("button", { name: "Documents" }));
    expect(screen.getByText(/Volunteer Management App/)).toBeInTheDocument();
  });
});
