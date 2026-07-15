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
});
