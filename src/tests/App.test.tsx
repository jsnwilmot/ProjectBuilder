import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../app/App";
import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import { countDocumentMissingMarkers, countPackageMissingMarkers } from "../lib/documentReview";
import * as exportProjectPackageModule from "../lib/exportProjectPackage";
import {
  createDefaultDataverseColumn,
  createDefaultDataverseRelationship,
  createDefaultDataverseTable,
  createDefaultSharePointColumn,
  createDefaultSharePointLibrary,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import { STORAGE_KEY, clearPersistenceWarning, saveStorageState } from "../lib/projectRepository";
import {
  calculateModelDrivenBusinessLogicGate,
  calculateModelDrivenExtensionsGate,
  calculateModelDrivenExternalConnectorSelectionGate,
  calculateModelDrivenSecurityArchitectureGate
} from "../lib/powerPlatform";
import { validateIntake } from "../lib/validateIntake";
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
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
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
    expect(screen.getByRole("button", { name: "Open Community Services Portal" })).toBeInTheDocument();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as {
      activeProjectId: string;
      projects: Array<{ identity: { id: string; projectName: string } }>;
    };
    expect(stored.projects).toHaveLength(2);
    expect(stored.projects.some((project) => project.identity.projectName === "Community Services Portal")).toBe(true);
    expect(stored.projects.find((project) => project.identity.id === stored.activeProjectId)?.identity.projectName).toBe("Second Project");

    await user.click(screen.getByRole("button", { name: "Open Community Services Portal" }));
    expect(screen.getByRole("heading", { name: "Community Services Portal" })).toBeInTheDocument();
  });

  it("duplicates, archives, views, and restores saved projects from Mission Control", async () => {
    const source = createProject({
      identity: { id: "managed-source", projectName: "Managed Project" },
      generatedDocuments: [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Managed" }]
    });
    seedApp([source]);
    const user = userEvent.setup();
    render(<App />);

    expect(
      within(screen.getByLabelText("Project counts")).getByText("Active projects").parentElement
    ).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Duplicate Managed Project" }));

    expect(screen.getByText(/Managed Project Copy created/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Managed Project Copy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Managed Project Copy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archive Managed Project Copy" }));
    expect(screen.getByText(/Managed Project Copy archived/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Managed Project Copy" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show archived (1)" }));
    expect(screen.getByRole("button", { name: "Open Managed Project Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore Managed Project Copy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restore Managed Project Copy" }));
    expect(screen.getByText(/Managed Project Copy restored/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive Managed Project Copy" })).toBeInTheDocument();
  });

  it("requires confirmation before deleting active and archived projects", async () => {
    const active = createProject({ identity: { id: "active-delete", projectName: "Active Delete" } });
    const archived = createProject({
      identity: { id: "archived-delete", projectName: "Archived Delete" },
      archivedAt: "2026-07-04T12:00:00.000Z"
    });
    seedApp([active, archived], active.identity.id);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Delete Active Delete" }));
    expect(screen.getByRole("dialog", { name: "Delete Active Delete?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Open Active Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Active Delete" }));
    await user.click(screen.getByRole("button", { name: "Permanently Delete" }));
    expect(screen.queryByRole("button", { name: "Open Active Delete" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show archived (1)" }));
    await user.click(screen.getByRole("button", { name: "Delete Archived Delete" }));
    expect(screen.getByRole("dialog", { name: "Delete Archived Delete?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Open Archived Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Archived Delete" }));
    await user.click(screen.getByRole("button", { name: "Permanently Delete" }));
    expect(screen.queryByRole("button", { name: "Open Archived Delete" })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).projects).toHaveLength(0);
  });

  it("keeps keyboard focus in the delete dialog and closes it with Escape", async () => {
    const project = createProject({
      identity: { id: "keyboard-delete", projectName: "Keyboard Delete" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    const deleteButton = screen.getByRole("button", { name: "Delete Keyboard Delete" });
    await user.click(deleteButton);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Permanently Delete" });
    expect(cancelButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Delete Keyboard Delete?" })).not.toBeInTheDocument();
    expect(deleteButton).toHaveFocus();
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
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
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

  it("shows conditional Power Platform intake sections for Canvas backends", async () => {
    const project = createProject({
      identity: { id: "canvas-ui", projectName: "Canvas UI" },
      intake: { appType: "powerAppsCanvas" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));

    expect(screen.getByRole("heading", { name: "Guided Power Platform readiness" })).toBeInTheDocument();
    const sourceSelect = screen.getByLabelText(/Primary Canvas data source/i);
    expect(sourceSelect).toHaveValue("undecided");

    await user.selectOptions(sourceSelect, "sharePointList");
    expect(screen.getByRole("heading", { name: "SharePoint or Microsoft Lists schema" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Canvas Dataverse schema" })).not.toBeInTheDocument();

    await user.selectOptions(sourceSelect, "dataverse");
    expect(screen.getByRole("heading", { name: "Canvas Dataverse schema" })).toBeInTheDocument();
  });

  it("shows only SharePoint and Dataverse schema sections for mixed Canvas selections through the UI", async () => {
    const project = createProject({
      identity: { id: "mixed-ui", projectName: "Mixed UI" },
      intake: { appType: "powerAppsCanvas" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));
    await user.selectOptions(screen.getByLabelText(/Primary Canvas data source/i), "multiple");
    await user.click(screen.getByLabelText("SharePoint list"));
    await user.click(screen.getByLabelText("Dataverse"));
    await user.click(screen.getByRole("button", { name: "Add connector" }));
    await screen.findByLabelText(/Data-source type/i);
    await user.click(screen.getByRole("button", { name: "Add connector" }));
    const connectorTypes = await screen.findAllByLabelText(/Data-source type/i);
    expect(connectorTypes[0]).toHaveValue("");
    await user.selectOptions(connectorTypes[0], "sharePointList");
    await user.selectOptions(connectorTypes[1], "dataverse");
    await user.selectOptions(screen.getAllByLabelText(/Connector role/i)[0], "primary");
    await user.selectOptions(screen.getAllByLabelText(/Connector role/i)[1], "secondary");

    expect(screen.getByText(/Selected backend assessments required: SharePoint list, Dataverse/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SharePoint or Microsoft Lists schema" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Canvas Dataverse schema" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Other connector schema" })).not.toBeInTheDocument();
  }, 15000);

  it("renders separated schema relationship fields through the guided intake UI", async () => {
    const project = createProject({
      identity: { id: "relationship-ui", projectName: "Relationship UI" },
      intake: { appType: "powerAppsCanvas" }
    });
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "dataverse"];
    project.powerPlatform!.canvas!.sharePointListSchemas = [
      createDefaultSharePointList({ id: "sp-list-requests", displayName: "Requests" })
    ];
    project.powerPlatform!.canvas!.sharePointLibrarySchemas = [
      createDefaultSharePointLibrary({ id: "sp-library-documents", displayName: "Documents" })
    ];
    project.powerPlatform!.canvas!.sharePointColumnSchemas = [
      createDefaultSharePointColumn({
        id: "sp-column-status",
        displayName: "Status",
        parentType: "list",
        parentId: "sp-list-requests"
      })
    ];
    project.powerPlatform!.canvas!.dataverseTableSchemas = [
      createDefaultDataverseTable({ id: "dv-table-account", displayName: "Account" }),
      createDefaultDataverseTable({ id: "dv-table-request", displayName: "Request" })
    ];
    project.powerPlatform!.canvas!.dataverseColumnSchemas = [
      createDefaultDataverseColumn({
        id: "dv-column-status",
        displayName: "Status",
        tableId: "dv-table-request"
      })
    ];
    project.powerPlatform!.canvas!.dataverseRelationshipSchemas = [
      createDefaultDataverseRelationship({
        id: "dv-relationship-account-request",
        relationshipSchemaName: "new_account_request",
        parentTableId: "dv-table-account",
        childTableId: "dv-table-request"
      })
    ];
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));

    expect(screen.getByLabelText(/Parent type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Parent list or library/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lookup list/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Lookup column/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Indexed status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Unique-value status/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Sensitive-data status/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText(/Folder structure/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/File-size expectations/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/Owning table/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Parent table/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Child table/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Required level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Choice definition/i)).toBeInTheDocument();
  });

  it("shows SharePoint and external API schema sections for mixed Canvas selections through the UI", async () => {
    const project = createProject({
      identity: { id: "mixed-api-ui", projectName: "Mixed API UI" },
      intake: { appType: "powerAppsCanvas" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));
    await user.selectOptions(screen.getByLabelText(/Primary Canvas data source/i), "multiple");
    await user.click(screen.getByLabelText("SharePoint list"));
    await user.click(screen.getByLabelText("External API"));

    expect(screen.getByRole("heading", { name: "SharePoint or Microsoft Lists schema" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Other connector schema" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Canvas Dataverse schema" })).not.toBeInTheDocument();
  });

  it("shows model-driven Power Platform schema and solution intake", async () => {
    const project = createProject({
      identity: { id: "model-ui", projectName: "Model UI" },
      intake: { appType: "powerAppsModelDriven" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));

    expect(screen.getByRole("heading", { name: "Guided Power Platform readiness" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Dataverse availability/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add table" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Publisher prefix/i)).toBeInTheDocument();
  });

  it("completes model-driven security architecture status through the rendered UI", async () => {
    const project = createProject({
      identity: { id: "model-security-ui", projectName: "Model Security UI" },
      intake: { appType: "powerAppsModelDriven" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Security: .* complete/i }));
    fireEvent.change(screen.getByLabelText(/Security roles/i), { target: { value: "Operations Manager" } });
    fireEvent.change(screen.getByLabelText(/Business units/i), { target: { value: "Operations" } });
    fireEvent.change(screen.getByLabelText(/Owner teams/i), { target: { value: "Operations owners" } });
    fireEvent.change(screen.getByLabelText(/Table privileges/i), { target: { value: "Read/write request tables" } });
    fireEvent.change(screen.getByLabelText(/Privilege depth/i), { target: { value: "Business unit" } });
    fireEvent.change(screen.getByLabelText(/Record ownership/i), { target: { value: "Team owned" } });
    fireEvent.change(screen.getByLabelText(/Sharing expectations/i), { target: { value: "No manual sharing" } });
    fireEvent.change(screen.getByLabelText(/Field security profiles/i), { target: { value: "Protect sensitive fields" } });
    fireEvent.change(screen.getByLabelText(/Team model applicability/i), { target: { value: "required" } });
    fireEvent.change(screen.getByLabelText(/Team model details/i), { target: { value: "Owner team and access team" } });
    fireEvent.change(screen.getByLabelText(/Team model confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Hierarchy security applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Hierarchy security not-applicable reason/i), { target: { value: "No hierarchy security" } });
    fireEvent.change(screen.getByLabelText(/Hierarchy security confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Field security applicability/i), { target: { value: "required" } });
    fireEvent.change(screen.getByLabelText(/Field security details/i), { target: { value: "Protect sensitive fields" } });
    fireEvent.change(screen.getByLabelText(/Field security confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Application users applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Application users not-applicable reason/i), { target: { value: "No application users" } });
    fireEvent.change(screen.getByLabelText(/Application users confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Service principals applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Service principals not-applicable reason/i), { target: { value: "No service principals" } });
    fireEvent.change(screen.getByLabelText(/Service principals confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Model-driven security architecture status/i), { target: { value: "confirmed" } });

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as { projects: ProjectRecord[] };
    expect(calculateModelDrivenSecurityArchitectureGate(stored.projects[0])).toBe("confirmed");
  }, 40000);

  it("honors model-driven not-applicable decisions entered through the rendered UI", async () => {
    const project = createProject({
      identity: { id: "model-na-ui", projectName: "Model NA UI" },
      intake: { appType: "powerAppsModelDriven" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Workflows: .* complete/i }));
    fireEvent.change(screen.getByLabelText(/Business rules applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Business rules not-applicable reason/i), { target: { value: "No business rules." } });
    fireEvent.change(screen.getByLabelText(/Business rules confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Business process flows applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Business process flows not-applicable reason/i), { target: { value: "No BPF." } });
    fireEvent.change(screen.getByLabelText(/Business process flows confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Automations applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Automations not-applicable reason/i), { target: { value: "No automation." } });
    fireEvent.change(screen.getByLabelText(/Automations confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Validation rules applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Validation rules not-applicable reason/i), { target: { value: "No validation rules." } });
    fireEvent.change(screen.getByLabelText(/Validation rules confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Duplicate prevention applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Duplicate prevention not-applicable reason/i), { target: { value: "No duplicate prevention." } });
    fireEvent.change(screen.getByLabelText(/Duplicate prevention confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Business logic status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Command bar applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Command bar not-applicable reason/i), { target: { value: "No command changes." } });
    fireEvent.change(screen.getByLabelText(/Command bar confirmation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Client-side JavaScript applicability/i), { target: { value: "notApplicable" } });
    fireEvent.change(screen.getByLabelText(/Client-side JavaScript not-applicable reason/i), { target: { value: "No scripts." } });
    fireEvent.change(screen.getByLabelText(/Client-side JavaScript confirmation status/i), { target: { value: "confirmed" } });

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as { projects: ProjectRecord[] };
    expect(calculateModelDrivenBusinessLogicGate(stored.projects[0])).toBe("confirmed");
    expect(validateIntake(stored.projects[0]).missingFields.some((issue) => issue.label.includes("business-process-flow"))).toBe(false);
    expect(calculateModelDrivenExtensionsGate(stored.projects[0])).not.toBe("confirmed");
  }, 40000);

  it("renders model-driven connector editor without legacy connector checkboxes", async () => {
    const project = createProject({
      identity: { id: "model-connector-ui", projectName: "Model Connector UI" },
      intake: { appType: "powerAppsModelDriven" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));
    await user.click(screen.getByRole("button", { name: "Add connector" }));

    expect(screen.getByLabelText(/Data-source type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Classification confirmation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Licensing confirmation/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Legacy classification checkbox/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Legacy licensing checkbox/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Connector role/i)).not.toBeInTheDocument();
  });

  it("requires controlled approval status for model-driven external connectors through the rendered UI", async () => {
    const project = createProject({
      identity: { id: "model-approval-ui", projectName: "Model Approval UI" },
      intake: { appType: "powerAppsModelDriven" }
    });
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));
    await user.click(screen.getByRole("button", { name: "Add connector" }));
    fireEvent.change(screen.getByLabelText(/Connector name/i), { target: { value: "External API" } });
    fireEvent.change(screen.getByLabelText(/Connector purpose/i), { target: { value: "Read account status" } });
    fireEvent.change(screen.getByLabelText(/Data source name/i), { target: { value: "Account API" } });
    fireEvent.change(screen.getByLabelText(/Data-source type/i), { target: { value: "externalApi" } });
    fireEvent.change(screen.getByLabelText(/Authentication method/i), { target: { value: "OAuth" } });
    fireEvent.change(screen.getByLabelText(/Gateway requirement/i), { target: { value: "No gateway" } });
    fireEvent.change(screen.getByLabelText(/Environment requirement/i), { target: { value: "Production variable" } });
    fireEvent.change(screen.getByLabelText(/DLP impact/i), { target: { value: "Business DLP" } });
    fireEvent.change(screen.getByLabelText(/Approval notes/i), { target: { value: "Not approved" } });
    let stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as { projects: ProjectRecord[] };
    expect(stored.projects[0].powerPlatform!.common.connectors[0].approvalStatus).toBe("Not approved");
    expect(calculateModelDrivenExternalConnectorSelectionGate(stored.projects[0])).toBe("reviewNeeded");

    fireEvent.change(screen.getByLabelText(/Approval confirmation status/i), { target: { value: "confirmed" } });
    stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!) as { projects: ProjectRecord[] };
    expect(calculateModelDrivenExternalConnectorSelectionGate(stored.projects[0])).toBe("confirmed");
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
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    expect(screen.getByRole("heading", { name: "Project Package Preview" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview README.md" }));
    expect(screen.getByRole("heading", { name: "README.md" })).toBeInTheDocument();
    expect(screen.getByText(/Community Services Portal/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mission Control" }));
    await user.click(screen.getByRole("button", { name: "Open Volunteer Management App" }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    await user.click(screen.getByRole("button", { name: "Preview README.md" }));
    expect(screen.getByText(/Volunteer Management App/)).toBeInTheDocument();
  });

  it("reviews all 19 generated documents with purposes, marker counts, preview, and copy actions", async () => {
    const project = createDraftGeneratedProject(createProject({
      identity: { id: "document-review-ui", projectName: "Document Review UI" },
      intake: { appType: "businessWebsite" }
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
    expect(within(summary).getByText("Readiness checklist").closest("div")).toHaveTextContent("13/13");
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
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));

    expect(screen.getByText(/Warnings present|Ready to export/)).toBeInTheDocument();
    expect(screen.getByText("19/19")).toBeInTheDocument();
    expect(screen.getByText("No export errors.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Use This Project Package" })).toBeInTheDocument();
  });

  it("downloads a verified package and reports success", async () => {
    seedApp([createGeneratedProject()]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    expect(screen.getByRole("button", { name: /Download verified package/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Download verified package/ }));

    expect(await screen.findByText("Export complete")).toBeInTheDocument();
    expect(screen.getByText(/Package downloaded successfully\./)).toBeInTheDocument();
  });

  it("shows a friendly error message when building the archive fails", async () => {
    seedApp([createGeneratedProject()]);
    const user = userEvent.setup();
    vi.spyOn(exportProjectPackageModule, "createProjectArchive").mockRejectedValue(
      new Error("The archive service is temporarily unavailable.")
    );
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: /Download verified package/ }));

    expect(await screen.findByText("Export failed")).toBeInTheDocument();
    expect(screen.getByText(/The archive service is temporarily unavailable\./)).toBeInTheDocument();
  });

  it("falls back to a generic error message when a non-Error value is thrown during export", async () => {
    seedApp([createGeneratedProject()]);
    const user = userEvent.setup();
    vi.spyOn(exportProjectPackageModule, "createProjectArchive").mockRejectedValue("boom");
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: /Download verified package/ }));

    expect(await screen.findByText("Export failed")).toBeInTheDocument();
    expect(screen.getByText(/The project archive could not be created\./)).toBeInTheDocument();
  });

  it("shows the underlying error message when copying a handoff document fails unexpectedly", async () => {
    seedApp([createGeneratedProject()]);
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: "Open export" }));
    await user.click(screen.getByRole("button", { name: "Copy Architect Instructions" }));

    // document.execCommand is not implemented in jsdom by default (and is not
    // stubbed in this test), so the copy-selection fallback itself throws,
    // exercising ExportPanel's own catch-and-report path rather than the
    // "selected" fallback message.
    expect(await screen.findByText(/execCommand/)).toBeInTheDocument();
  });

  it("requires a project type and shows website-specific questions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Create New Project" }));
    const projectType = screen.getByRole("combobox", { name: /Project type/i });
    expect(projectType).toBeRequired();
    await user.selectOptions(projectType, "businessWebsite");

    expect(screen.getByText("Use this for service business websites, local business sites, brochure sites, and marketing pages.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Domain status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hosting status/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Game genre/i)).not.toBeInTheDocument();
  });

  it("shows game-specific questions only for the game preset", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Create New Project" }));
    await user.selectOptions(screen.getByRole("combobox", { name: /Project type/i }), "game");

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
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
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

  it("shows a persistence warning when browser storage access is unavailable", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: localStorage is disabled in this context");
      }
    });

    try {
      render(<App />);
      expect(screen.getByText(/Saving is currently unavailable in this browser context\./)).toBeInTheDocument();
    } finally {
      clearPersistenceWarning();
      if (originalDescriptor) {
        Object.defineProperty(window, "localStorage", originalDescriptor);
      }
    }
  });

  it("uses the selection fallback when clipboard permission is denied", async () => {
    seedApp();
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("Denied"));
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(screen.getByRole("button", { name: /Generate (draft|ready) package/ }));
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
