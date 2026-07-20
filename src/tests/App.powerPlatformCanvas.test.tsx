/* eslint-disable @typescript-eslint/no-unused-vars -- shared App UI test import block keeps split suites mechanically aligned */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { App } from "../app/App";
import { createSeedProject } from "../data/seedProject";
import { PowerPlatformIntake } from "../components/IntakeBuilder/PowerPlatformIntake";
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
import { STORAGE_KEY, clearPersistenceWarning } from "../lib/projectRepository";
import {
  calculateModelDrivenExternalConnectorSelectionGate,
  calculateModelDrivenSecurityArchitectureGate
} from "../lib/powerPlatform";
import { evaluatePhaseGate } from "../lib/phaseGates";
import type { ProjectRecord } from "../types/project";
import { createDraftGeneratedProject, createGeneratedProject } from "./helpers/generatedProject";
import { createReadyPreviewProject, seedApp } from "./helpers/appTestHelpers";

describe("App - power Platform Canvas", () => {
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
  }, 30000);

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
  }, 20000);

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

  it("keeps SharePoint list add action at the bottom while preserving row values", async () => {
    const project = createProject({
      identity: { id: "sp-list-bottom-ui", projectName: "SharePoint List Bottom UI" },
      intake: { appType: "powerAppsCanvas" }
    });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList"];
    project.powerPlatform!.canvas!.sharePointListSchemas = [
      createDefaultSharePointList({ id: "sp-list-one", displayName: "Requests" })
    ];
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));
    const listSection = screen.getByRole("heading", { name: "SharePoint lists" }).closest("section");
    expect(listSection).not.toBeNull();
    const listScope = within(listSection!);
    expect(listScope.getAllByRole("button", { name: "Add list" })).toHaveLength(1);
    const firstCard = listScope.getByRole("article");
    const addList = listScope.getByRole("button", { name: "Add list" });
    expect(Boolean(firstCard.compareDocumentPosition(addList) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(within(firstCard).getAllByRole("button")[0]).toHaveAccessibleName("Remove list");

    await user.clear(listScope.getByLabelText(/List display name/i));
    await user.type(listScope.getByLabelText(/List display name/i), "Updated Requests");
    await user.click(addList);
    expect(listScope.getAllByRole("button", { name: "Add list" })).toHaveLength(1);
    expect(listScope.getByDisplayValue("Updated Requests")).toBeInTheDocument();
    expect(listScope.getAllByRole("article")).toHaveLength(2);
    await user.click(within(listScope.getAllByRole("article")[1]).getByRole("button", { name: "Remove list" }));
    expect(listScope.getByDisplayValue("Updated Requests")).toBeInTheDocument();
    expect(listScope.getAllByRole("article")).toHaveLength(1);
  }, 30000);

  it("keeps SharePoint column add action at the bottom while preserving internal-name values", async () => {
    const project = createProject({
      identity: { id: "sp-column-bottom-ui", projectName: "SharePoint Column Bottom UI" },
      intake: { appType: "powerAppsCanvas" }
    });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList"];
    project.powerPlatform!.canvas!.sharePointListSchemas = [
      createDefaultSharePointList({ id: "sp-list-one", displayName: "Requests" })
    ];
    project.powerPlatform!.canvas!.sharePointColumnSchemas = [
      createDefaultSharePointColumn({
        id: "sp-column-one",
        parentType: "list",
        parentId: "sp-list-one",
        displayName: "Status",
        internalName: "Status"
      })
    ];
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));
    const columnSection = screen.getByRole("heading", { name: "SharePoint columns and internal names" }).closest("section");
    expect(columnSection).not.toBeNull();
    const columnScope = within(columnSection!);
    expect(columnScope.getAllByRole("button", { name: "Add column" })).toHaveLength(1);
    const firstCard = columnScope.getByRole("article");
    const addColumn = columnScope.getByRole("button", { name: "Add column" });
    expect(Boolean(firstCard.compareDocumentPosition(addColumn) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(within(firstCard).getAllByRole("button")[0]).toHaveAccessibleName("Remove column");

    await user.clear(columnScope.getByLabelText(/Internal name/i));
    await user.type(columnScope.getByLabelText(/Internal name/i), "RequestStatus");
    await user.click(addColumn);
    expect(columnScope.getAllByRole("button", { name: "Add column" })).toHaveLength(1);
    expect(columnScope.getByDisplayValue("RequestStatus")).toBeInTheDocument();
    expect(columnScope.getAllByRole("article")).toHaveLength(2);
    await user.click(within(columnScope.getAllByRole("article")[1]).getByRole("button", { name: "Remove column" }));
    expect(columnScope.getByDisplayValue("RequestStatus")).toBeInTheDocument();
    expect(columnScope.getAllByRole("article")).toHaveLength(1);
  }, 30000);

  it("keeps SharePoint list and column add actions available for empty collections", async () => {
    const project = createProject({
      identity: { id: "sp-empty-bottom-ui", projectName: "SharePoint Empty Bottom UI" },
      intake: { appType: "powerAppsCanvas" }
    });
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList"];
    project.powerPlatform!.canvas!.sharePointListSchemas = [];
    project.powerPlatform!.canvas!.sharePointColumnSchemas = [];
    seedApp([project]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Data: .* complete/i }));
    const listSection = screen.getByRole("heading", { name: "SharePoint lists" }).closest("section")!;
    const columnSection = screen.getByRole("heading", { name: "SharePoint columns and internal names" }).closest("section")!;
    expect(within(listSection).getAllByRole("button", { name: "Add list" })).toHaveLength(1);
    expect(within(columnSection).getAllByRole("button", { name: "Add column" })).toHaveLength(1);
  });

  it("allows Canvas subtype selection, navigation persistence, and storage reload", async () => {
    const project = createProject({
      identity: { id: "canvas-subtype-ui", projectName: "Canvas Subtype UI" },
      intake: { appType: "powerAppsCanvas" }
    });
    project.powerPlatform!.canvas!.subtype = "";
    seedApp([project]);
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.click(screen.getByRole("button", { name: /Features: .* complete/i }));
    const subtype = screen.getByLabelText(/Canvas subtype/i);
    expect(subtype).toBeEnabled();
    expect(subtype).toHaveAccessibleName(/Canvas subtype/i);
    await user.selectOptions(subtype, "blankResponsive");
    expect(subtype).toHaveValue("blankResponsive");

    const supportedSubtypes = [
      "tablet",
      "phone",
      "sharePointCustomized",
      "teamsEmbedded",
      "sharePointOnline",
      "microsoftLists",
      "dataverse",
      "otherConnector",
      "multipleDataSources",
      "customPage",
      "other"
    ];
    for (const value of supportedSubtypes) {
      await user.selectOptions(subtype, value);
      expect(subtype).toHaveValue(value);
    }

    subtype.focus();
    expect(subtype).toHaveFocus();
    await user.selectOptions(subtype, "customPage");
    expect(subtype).toHaveValue("customPage");
    await user.click(screen.getByRole("button", { name: /4 Data/i }));
    await user.click(screen.getByRole("button", { name: /3 Features/i }));
    expect(screen.getByLabelText(/Canvas subtype/i)).toHaveValue("customPage");

    unmount();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Features: .* complete/i }));
    expect(screen.getByLabelText(/Canvas subtype/i)).toHaveValue("customPage");
    const persisted = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(persisted.projects[0].powerPlatform.canvas.subtype).toBe("customPage");
  }, 30000);

  it("renders existing saved Canvas subtype and hides it for unrelated project types", async () => {
    const canvasProject = createProject({
      identity: { id: "canvas-subtype-existing", projectName: "Canvas Subtype Existing" },
      intake: { appType: "powerAppsCanvas" }
    });
    canvasProject.powerPlatform!.canvas!.subtype = "teamsEmbedded";
    const webProject = createProject({
      identity: { id: "web-project", projectName: "Web Project" },
      intake: { appType: "webApplication" }
    });
    seedApp([canvasProject, webProject], canvasProject.identity.id);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Features: .* complete/i }));
    expect(screen.getByLabelText(/Canvas subtype/i)).toHaveValue("teamsEmbedded");

    await user.click(screen.getByRole("button", { name: "Mission Control" }));
    await user.click(screen.getByRole("button", { name: /Open Web Project/i }));
    await user.click(screen.getByRole("button", { name: /Features: .* complete/i }));
    expect(screen.queryByLabelText(/Canvas subtype/i)).not.toBeInTheDocument();
  }, 30000);
});
