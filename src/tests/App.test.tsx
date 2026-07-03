import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../app/App";
import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import { countDocumentMissingMarkers, countPackageMissingMarkers } from "../lib/documentReview";
import { STORAGE_KEY, saveStorageState } from "../lib/projectRepository";
import type { ProjectRecord } from "../types/project";
import { createDraftGeneratedProject, createGeneratedProject } from "./helpers/generatedProject";

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
    expect(screen.getByRole("heading", { name: "Project Package Preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview README.md" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview DATA_MODEL.md" }));
    expect(screen.getByRole("heading", { name: "DATA_MODEL.md" })).toBeInTheDocument();
    expect(screen.getByText(/\[MISSING: data sources\]/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to document list" }));
    await user.type(screen.getByRole("textbox", { name: "Search documents" }), "does-not-exist");
    expect(screen.getByRole("heading", { name: "No matching documents" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("button", { name: "Preview DATA_MODEL.md" })).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "Missing Information Review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Client Questions Review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ready for Codex checklist" })).toBeInTheDocument();
  });

  it("records not-applicable reasons and copies grouped client questions", async () => {
    const project = createProject({
      identity: { id: "client-review-ui", projectName: "Client Review UI" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));
    const firstStatus = screen.getAllByRole("combobox", { name: "Status" })[0];
    await user.selectOptions(firstStatus, "Not applicable");
    const reason = screen.getByLabelText(/Why this is not applicable/i);
    expect(reason).toHaveAttribute("aria-invalid", "true");
    await user.type(reason, "Confirmed outside this project.");
    expect(reason).toHaveValue("Confirmed outside this project.");

    await user.click(screen.getByRole("button", { name: "Copy all questions" }));
    expect(await navigator.clipboard.readText()).toContain("Foundation");
    expect(screen.getByText("Client questions copied.")).toBeInTheDocument();
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
    expect(screen.getByText(/Readiness blockers:/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What happens after generation?" })).toBeInTheDocument();
    expect(screen.getByText("Complete the Ready for Codex checklist.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    expect(screen.getByRole("heading", { name: "Project Package Preview" })).toBeInTheDocument();
    expect(screen.getByText("19 generated documents")).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "Project Package Preview" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview README.md" }));
    expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument();
    expect(screen.getByText(/Community Services Portal/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mission Control" }));
    await user.click(screen.getByRole("button", { name: "Select project Volunteer Management App" }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    await user.click(screen.getByRole("button", { name: "Preview README.md" }));
    expect(screen.getByText(/Volunteer Management App/)).toBeInTheDocument();
  });

  it("reviews all 19 generated documents with purposes, marker counts, preview, and copy actions", async () => {
    const project = createDraftGeneratedProject(createProject({
      identity: { id: "document-review-ui", projectName: "Document Review UI" },
      intake: { appType: "Business website" }
    }));
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));

    expect(screen.getByRole("heading", { name: "Project Package Preview" })).toBeInTheDocument();
    const reviewRegion = screen.getByRole("region", { name: "Generated document review" });
    expect(within(reviewRegion).getAllByRole("listitem")).toHaveLength(19);
    expect(screen.getByText("Defines approved scope, boundaries, assumptions, and success criteria.")).toBeInTheDocument();

    const scopeDocument = project.generatedDocuments.find((document) => document.fileName === "PROJECT_SCOPE.md")!;
    const scopeRow = screen.getByRole("button", { name: "Preview PROJECT_SCOPE.md" }).closest("article")!;
    expect(scopeRow).toHaveTextContent("00_Project_Overview");
    expect(scopeRow).toHaveTextContent(`${countDocumentMissingMarkers(scopeDocument.content)} missing marker`);

    const summary = screen.getByRole("region", { name: "Package summary" });
    expect(within(summary).getByText("Documents").closest("div")).toHaveTextContent("19/19");
    expect(within(summary).getByText("Missing markers").closest("div")).toHaveTextContent(
      String(countPackageMissingMarkers(project.generatedDocuments))
    );
    expect(within(summary).getByText("Package status").closest("div")).toHaveTextContent("Draft");
    expect(within(summary).getByText("Final readiness").closest("div")).toHaveTextContent("Not ready");
    expect(within(summary).getByText(/Missing information remains/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preview PROJECT_SCOPE.md" }));
    expect(screen.getByRole("heading", { name: "PROJECT_SCOPE.md" })).toBeInTheDocument();
    expect(screen.getByText(/# Project Scope/)).toHaveTextContent("Document Review UI");
    await user.click(screen.getByRole("button", { name: "Copy document" }));
    expect(await navigator.clipboard.readText()).toBe(scopeDocument.content);
    expect(screen.getByText("PROJECT_SCOPE.md copied.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to document list" }));

    await user.click(screen.getByRole("button", { name: "Quick copy ARCHITECT_INSTRUCTIONS.md" }));
    expect(await navigator.clipboard.readText()).toContain("# Architect Instructions");
    expect(screen.getByText("ARCHITECT_INSTRUCTIONS.md copied.")).toBeInTheDocument();
  });

  it("shows zero readiness blockers for a Ready for Codex package preview", async () => {
    seedApp([createGeneratedProject()]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));

    const summary = screen.getByRole("region", { name: "Package summary" });
    expect(within(summary).getByText("Package status").closest("div")).toHaveTextContent("Ready for Codex");
    expect(within(summary).getByText("Ready for Codex blockers").closest("div")).toHaveTextContent("0");
    expect(within(summary).getByText("Readiness checklist").closest("div")).toHaveTextContent("12/12");
    expect(within(summary).getByText("Final readiness").closest("div")).toHaveTextContent("Ready");
  });

  it("uses the clipboard selection fallback for document review copy actions", async () => {
    const project = createGeneratedProject();
    seedApp([project]);
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Documents" }));
    await user.click(screen.getByRole("button", { name: "Copy README.md" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("README.md copied.")).toBeInTheDocument();
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
    expect(screen.getByText("0/19")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Generate project package first" }));
    await user.click(screen.getByRole("button", { name: "Generate and save package" }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));

    expect(screen.getByText(/Warnings present|Ready to export/)).toBeInTheDocument();
    expect(screen.getByText("19/19")).toBeInTheDocument();
    expect(screen.getByText("No export errors.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Use This Project Package" })).toBeInTheDocument();
  });

  it("requires a project type and shows website-specific questions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Create New Project" }));
    const projectType = screen.getByRole("combobox", { name: /Project type/i });
    expect(projectType).toBeRequired();
    await user.selectOptions(projectType, "Business website");

    expect(screen.getByText("Use this for service business websites, local business sites, brochure sites, and marketing pages.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Domain status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hosting status/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Game genre/i)).not.toBeInTheDocument();
  });

  it("shows game-specific questions only for the game preset", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Create New Project" }));
    await user.selectOptions(screen.getByRole("combobox", { name: /Project type/i }), "Game");

    expect(screen.getByText("Use this for projects with a gameplay loop, controls, progression, art, audio, levels, or scoring.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Game genre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Target devices/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Domain status/i)).not.toBeInTheDocument();
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

  it("shows first-run guidance and prevents blank project routes", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Turn a rough project idea into a clear Codex handoff" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What it creates" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What it does not create" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create New Project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View Example Workflow" })).toBeInTheDocument();
    expect(screen.getByText("Choose type")).toBeInTheDocument();
    expect(screen.getByText("Review missing")).toBeInTheDocument();
    expect(screen.getByText("Review Codex output with GPT Architect")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guided Intake" }));
    expect(screen.getByRole("heading", { name: "Turn a rough project idea into a clear Codex handoff" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create New Project" }));
    expect(screen.getByRole("heading", { name: "Set the project foundation" })).toBeInTheDocument();
  });

  it("opens and closes the read-only example without creating a project", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "View Example Workflow" }));

    expect(screen.getByRole("heading", { name: "Sample Local Business Website" })).toBeInTheDocument();
    expect(screen.getByText("Business website")).toBeInTheDocument();
    expect(screen.getByText("Customers, Owner, Administrator")).toBeInTheDocument();
    expect(screen.getByText(/Service and contact pages, Brand guide, SEO notes, Phased Codex prompts/)).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Close example" }));
    expect(screen.queryByRole("heading", { name: "Sample Local Business Website" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("bypasses onboarding for existing projects and explains readiness states", () => {
    const readyProject = createGeneratedProject();
    seedApp([readyProject]);
    render(<App />);

    expect(screen.queryByRole("heading", { name: "Turn a rough project idea into a clear Codex handoff" })).not.toBeInTheDocument();
    expect(screen.getByText("Ready for Codex:").closest("p")).toHaveTextContent(
      "Ready for Codex: Scope, client review, and the readiness checklist are complete."
    );
  });

  it("explains Draft and Client Questions Pending for generated packages with blockers", () => {
    const draftProject = createDraftGeneratedProject(createProject({
      identity: { id: "draft-status-help", projectName: "Draft Status Help" }
    }));
    seedApp([draftProject]);
    render(<App />);

    expect(screen.getByText("Draft:").closest("p")).toHaveTextContent(
      "Draft: The package can be reviewed, but required information is still missing."
    );
    expect(screen.getByText("Client Questions Pending:").closest("p")).toHaveTextContent(
      "Client Questions Pending: Some client questions still need answers before the project can be Ready for Codex."
    );
  });

  it("recovers corrupt browser storage into the empty state", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not-json");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Turn a rough project idea into a clear Codex handoff" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create New Project" })).toBeInTheDocument();
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

  it("uses the selection fallback when client question clipboard access is denied", async () => {
    const project = createProject({
      identity: { id: "client-copy-fallback", projectName: "Client Copy Fallback" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));
    await user.click(screen.getByRole("button", { name: "Copy all questions" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("Client questions copied.")).toBeInTheDocument();
  });

  it("leaves client questions selected when browser copy commands are unavailable", async () => {
    const project = createProject({
      identity: { id: "client-selection-fallback", projectName: "Client Selection Fallback" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false)
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Scope Review" }));
    await user.click(screen.getByRole("button", { name: "Copy all questions" }));

    expect(screen.getByText("Client questions selected. Press Ctrl+C to copy.")).toBeInTheDocument();
    expect(screen.getByRole<HTMLTextAreaElement>("textbox", {
      name: "Selected text ready to copy"
    }).value).toContain("Foundation");

    await user.click(screen.getByRole("heading", { name: "Client Questions Review" }));
    expect(screen.queryByRole("textbox", { name: "Selected text ready to copy" })).not.toBeInTheDocument();
  });
});
