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

describe("App - power Platform Model Driven", () => {
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

  it("completes model-driven source availability through rendered intake fields", () => {
    const project = createProject({
      identity: { id: "model-na-ui", projectName: "Model NA UI" },
      intake: { appType: "powerAppsModelDriven" }
    });
    function Harness() {
      const [currentProject, setCurrentProject] = useState(project);
      return (
        <PowerPlatformIntake
          project={currentProject}
          stageId="workflows"
          onUpdatePowerPlatform={(updater) => {
            setCurrentProject((previous) => {
              const next = { ...previous, powerPlatform: updater(previous.powerPlatform, previous) };
              Object.assign(project, next);
              return next;
            });
          }}
        />
      );
    }
    render(<Harness />);

    fireEvent.change(screen.getByLabelText(/Source availability status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Source location/i), { target: { value: "https://dev.azure.com/contoso/source" } });
    fireEvent.change(screen.getByLabelText(/Source type/i), { target: { value: "Unpacked unmanaged solution" } });
    fireEvent.change(screen.getByLabelText(/Source validation status/i), { target: { value: "confirmed" } });
    fireEvent.change(screen.getByLabelText(/Source validation evidence/i), { target: { value: "Unpacked and reviewed by technical owner." } });
    fireEvent.change(screen.getByLabelText(/Solution version/i), { target: { value: "1.0.0.0" } });
    fireEvent.change(screen.getByLabelText(/Last unpacked date/i), { target: { value: "2026-07-12" } });

    expect(evaluatePhaseGate(project, "sourceAvailability").status).toBe("confirmed");
  }, 30000);

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
  }, 20000);

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
  }, 20000);
});
