import { describe, expect, it } from "vitest";
import { PROJECT_TYPE_PRESETS } from "../data/projectTypes";
import { activeCanvasEntityReferences } from "../lib/canvasTargetValidation";
import { createProject } from "../lib/createProject";
import {
  buildCanvasRecordLifecyclePlanningModel,
  type CanvasRecordLifecycleActionPlan
} from "../lib/recordLifecyclePlanning";
import {
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultConnectorField,
  createDefaultConnectorResource,
  createDefaultDataverseColumn,
  createDefaultDataverseTable,
  createDefaultSharePointColumn,
  createDefaultSharePointLibrary,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import type {
  CanvasControlTarget,
  CanvasRecordLifecycleAction,
  CanvasRecordLifecycleTarget,
  CanvasStateVariableTarget,
  ProjectRecord
} from "../types/project";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function snapshot(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  return clone(value);
}

function control(id: string, approvedControlName: string, controlType: string, screenId = "screen-request"): CanvasControlTarget {
  return createDefaultCanvasControlTarget({
    id,
    screenId,
    approvedControlName,
    controlType,
    confirmationStatus: "confirmed",
    confirmationSource: "Architect"
  });
}

function lifecycleTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return {
    id: overrides.id ?? "archive-request",
    action: overrides.action ?? "archive",
    trigger: overrides.trigger ?? "controlOnSelect",
    triggerControlId: overrides.triggerControlId ?? "button-archive",
    screenTargetId: overrides.screenTargetId ?? "screen-request",
    connectorId: overrides.connectorId ?? "connector-sharepoint",
    entityId: overrides.entityId ?? "list-requests",
    recordContextType: overrides.recordContextType ?? "selectedRecord",
    recordContextReferenceId: overrides.recordContextReferenceId ?? "gallery-requests",
    archiveStrategy: overrides.archiveStrategy ?? "statusField",
    lifecycleFieldId: overrides.lifecycleFieldId ?? "field-status",
    archiveValue: overrides.archiveValue ?? "Archived",
    restoreValue: overrides.restoreValue ?? "Active",
    deleteStrategy: overrides.deleteStrategy ?? "missingDecision",
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    destructiveActionConfirmed: overrides.destructiveActionConfirmed ?? false,
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function restoreTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "restore-request",
    action: "restore",
    triggerControlId: "button-restore",
    sortOrder: 20,
    ...overrides
  });
}

function permanentDeleteTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "delete-request",
    action: "delete",
    triggerControlId: "button-delete",
    archiveStrategy: "notApplicable",
    lifecycleFieldId: "",
    archiveValue: "",
    restoreValue: "",
    deleteStrategy: "permanentDeleteApproved",
    destructiveActionConfirmed: true,
    sortOrder: 30,
    ...overrides
  });
}

function createCanvasProject(targets: CanvasRecordLifecycleTarget[] = [lifecycleTarget()]): ProjectRecord {
  const project = createProject({
    identity: { id: "lifecycle-project", projectName: "Lifecycle Project" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Plan record lifecycle actions.",
      requiredFeatures: "Archive, restore, and delete records.",
      workflows: "Manage records.",
      targetUsers: "Users",
      userRoles: "User"
    } as any
  });
  const pp = project.powerPlatform!;
  pp.common.connectors = [
    createDefaultConnector({
      id: "connector-sharepoint",
      displayName: "SharePoint",
      dataSourceName: "Requests",
      dataSourceType: "sharePointList",
      canvasRole: "primary",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      connectionOwnershipStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      supportedOperations: { read: true, update: true, delete: true, archive: true, restore: true }
    }),
    createDefaultConnector({
      id: "connector-other",
      displayName: "Dataverse",
      dataSourceName: "Requests",
      dataSourceType: "dataverse",
      canvasRole: "secondary",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      connectionOwnershipStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      supportedOperations: { read: true, update: true, delete: true, archive: true, restore: true }
    })
  ];
  const canvas = pp.canvas!;
  canvas.primaryDataSourceType = "sharePointList";
  canvas.selectedDataSourceTypes = ["sharePointList", "dataverse"];
  canvas.primaryConnectorId = "connector-sharepoint";
  canvas.secondaryConnectorIds = ["connector-other"];
  canvas.screenTargets = [
    createDefaultCanvasScreenTarget({
      id: "screen-request",
      approvedScreenName: "scrRequest",
      purpose: "Request screen.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultCanvasScreenTarget({
      id: "screen-other",
      approvedScreenName: "scrOther",
      purpose: "Other screen.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.controlTargets = [
    control("button-archive", "btnArchive", "button"),
    control("button-restore", "btnRestore", "button"),
    control("button-delete", "btnDelete", "button"),
    control("gallery-requests", "galRequests", "gallery"),
    control("form-request", "frmRequest", "edit form")
  ];
  canvas.stateVariableTargets = [{
    id: "state-selected-record",
    implementationName: "varSelectedRecord",
    purpose: "Selected record.",
    initialValue: { kind: "blank" },
    confirmationStatus: "confirmed",
    required: true,
    sortOrder: 10
  } as CanvasStateVariableTarget];
  canvas.sharePointListSchemas = [
    createDefaultSharePointList({
      id: "list-requests",
      displayName: "Requests",
      purpose: "Track requests.",
      recordStatusModel: "Status field controls active/archive state.",
      archiveBehavior: "Set Status to Archived.",
      restoreBehavior: "Set Status to Active.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.sharePointColumnSchemas = [
    createDefaultSharePointColumn({
      id: "field-status",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Status",
      internalName: "Status",
      columnType: "Choice",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointColumn({
      id: "field-active",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Active",
      internalName: "Active",
      columnType: "Yes/No",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointColumn({
      id: "field-archived",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Archived",
      internalName: "Archived",
      columnType: "Boolean",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointColumn({
      id: "field-soft-delete",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Soft Deleted",
      internalName: "SoftDeleted",
      columnType: "Boolean",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.recordLifecycleTargets = targets;
  return project;
}

function addActiveSecondaryConnector(project: ProjectRecord, id: string, dataSourceType: string): void {
  project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
  project.powerPlatform!.common.connectors.push(createDefaultConnector({
    id,
    displayName: id,
    dataSourceName: id,
    dataSourceType,
    canvasRole: "secondary",
    classificationConfirmationStatus: "confirmed",
    licensingConfirmationStatus: "confirmed",
    approvalConfirmationStatus: "confirmed",
    connectionOwnershipStatus: "confirmed",
    permissionConfirmationStatus: "confirmed",
    supportedOperations: { read: true, update: true, delete: true, archive: true, restore: true }
  }));
  project.powerPlatform!.canvas!.secondaryConnectorIds.push(id);
  if (!project.powerPlatform!.canvas!.selectedDataSourceTypes.includes(dataSourceType as any)) {
    project.powerPlatform!.canvas!.selectedDataSourceTypes.push(dataSourceType as any);
  }
}

function addDataverseTable(project: ProjectRecord): void {
  project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
  project.powerPlatform!.canvas!.dataverseTableSchemas = [
    createDefaultDataverseTable({
      id: "table-requests",
      displayName: "Request",
      pluralDisplayName: "Requests",
      logicalName: "new_request",
      schemaName: "new_Request",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  project.powerPlatform!.canvas!.dataverseColumnSchemas = [
    createDefaultDataverseColumn({
      id: "column-status",
      tableId: "table-requests",
      displayName: "Status",
      logicalName: "new_status",
      schemaName: "new_Status",
      dataType: "Choice",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
}

function addSharePointLibrary(project: ProjectRecord): void {
  project.powerPlatform!.canvas!.sharePointLibrarySchemas = [
    createDefaultSharePointLibrary({
      id: "library-documents",
      displayName: "Documents",
      purpose: "Store documents.",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  project.powerPlatform!.canvas!.sharePointColumnSchemas.push(createDefaultSharePointColumn({
    id: "field-library-status",
    parentType: "library",
    parentId: "library-documents",
    displayName: "Status",
    internalName: "Status",
    columnType: "Choice",
    confirmationStatus: "confirmed",
    confirmationSource: "Architect"
  }));
}

function addConnectorResource(project: ProjectRecord): void {
  addActiveSecondaryConnector(project, "connector-api", "customConnector");
  project.powerPlatform!.canvas!.connectorResourceSchemas = [
    createDefaultConnectorResource({
      id: "resource-ticket",
      connectorId: "connector-api",
      resourceName: "Tickets",
      resourceType: "REST resource",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  project.powerPlatform!.canvas!.connectorFieldSchemas = [
    createDefaultConnectorField({
      id: "field-resource-archived",
      connectorId: "connector-api",
      resourceId: "resource-ticket",
      displayName: "Archived",
      fieldIdentifier: "archived",
      fieldType: "Boolean",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
}

function expectPlanned(project: ProjectRecord): CanvasRecordLifecycleActionPlan[] {
  const result = buildCanvasRecordLifecyclePlanningModel(project);
  expect(result.planningStatus).toBe("Planned");
  expect(result.blockingIssues).toEqual([]);
  expect(result.plans.length).toBeGreaterThan(0);
  return result.plans;
}

function expectBlocked(project: ProjectRecord): string {
  const result = buildCanvasRecordLifecyclePlanningModel(project);
  expect(result.planningStatus).toBe("Blocked");
  expect(result.plans).toEqual([]);
  expect(result.blockingIssues.length).toBeGreaterThan(0);
  return result.blockingIssues.join(" ");
}

function expectOptionalBehaviourNotPlanned(plan: CanvasRecordLifecycleActionPlan): void {
  expect(plan.refreshRequirement).toBe("notPlanned");
  expect(plan.navigationRequirement).toBe("notPlanned");
  expect(plan.notificationRequirement).toBe("notPlanned");
  expect(plan.orderedActionSteps.map((step) => step.type)).not.toContain("refreshDataSource");
  expect(plan.orderedActionSteps.map((step) => step.type)).not.toContain("notifySuccess");
  expect(plan.orderedActionSteps.map((step) => step.type)).not.toContain("notifyFailure");
  expect(plan.orderedActionSteps.map((step) => step.type)).not.toContain("updateLocalState");
  expect(plan.orderedActionSteps.map((step) => step.type)).not.toContain("navigate");
}

function expectMalformedProjectBlocked(input: unknown) {
  const before = snapshot(input);
  let result = buildCanvasRecordLifecyclePlanningModel(input);
  expect(() => {
    result = buildCanvasRecordLifecyclePlanningModel(input);
  }).not.toThrow();
  expect(result).toMatchObject({
    planningStatus: "Blocked",
    plans: [],
    orderedTargets: [],
    targets: [],
    required: false
  });
  expect(result.blockingIssues).toContain("Canvas record lifecycle planning requires a valid project record.");
  expect(result.blockingIssues.length).toBeGreaterThan(0);
  expect(result.planningStatus).not.toBe("Not Applicable");
  expect(input).toEqual(before);
  expect(buildCanvasRecordLifecyclePlanningModel(input)).toEqual(result);
  return result;
}

function expectCompletePlanningEnvelope(result: ReturnType<typeof buildCanvasRecordLifecyclePlanningModel>): void {
  expect(Array.isArray(result.plans)).toBe(true);
  expect(Array.isArray(result.targets)).toBe(true);
  expect(Array.isArray(result.orderedTargets)).toBe(true);
  expect(Array.isArray(result.blockingIssues)).toBe(true);
}

function canvasEnvelopeInput(mutate: (project: ProjectRecord & Record<string, unknown>) => void): ProjectRecord & Record<string, unknown> {
  const project = createCanvasProject([]) as ProjectRecord & Record<string, unknown>;
  mutate(project);
  return project;
}

function expectCanonicalEntity(project: ProjectRecord, entityId: string): NonNullable<ReturnType<typeof activeCanvasEntityReferences> extends Map<string, infer T> ? T : never> {
  const entity = activeCanvasEntityReferences(project).get(entityId);
  expect(entity).toBeDefined();
  return entity!;
}

describe("Canvas record lifecycle action planning", () => {
  it.each([
    ["null project", null],
    ["undefined project", undefined],
    ["string project", "not a project"],
    ["numeric project", 42],
    ["boolean project", true],
    ["function project", () => createCanvasProject()],
    ["array project", []],
    ["empty object", {}],
    ["missing intake", { identity: { id: "project", projectName: "Project" } }],
    ["null intake", { identity: { id: "project", projectName: "Project" }, intake: null }],
    ["primitive intake", { identity: { id: "project", projectName: "Project" }, intake: "powerAppsCanvas" }],
    ["missing appType", { identity: { id: "project", projectName: "Project" }, intake: {} }],
    ["non-string appType", { identity: { id: "project", projectName: "Project" }, intake: { appType: 42 } }],
    ["malformed project identity", { identity: { id: 42, projectName: "Project" }, intake: { appType: "powerAppsCanvas" } }],
    ["Canvas app with malformed powerPlatform", { identity: { id: "project", projectName: "Project" }, intake: { appType: "powerAppsCanvas" }, powerPlatform: [] }],
    ["Canvas app with malformed Canvas data", { identity: { id: "project", projectName: "Project" }, intake: { appType: "powerAppsCanvas" }, powerPlatform: { common: { connectors: [] }, canvas: null } }]
  ])("blocks malformed top-level project input without throwing: %s", (_label, input) => {
    const result = expectMalformedProjectBlocked(input);
    expect(result.plans).toEqual([]);
    expect(result.orderedTargets).toEqual([]);
    expect(result.targets).toEqual([]);
  });

  it.each([
    ["planningStatus Blocked", { planningStatus: "Blocked" }],
    ["planningStatus Planned", { planningStatus: "Planned" }],
    ["planningStatus null", { planningStatus: null }],
    ["planningStatus object", { planningStatus: { planningStatus: "Blocked" } }],
    ["plans", { plans: [{ planId: "untrusted-plan" }] }],
    ["targets", { targets: [{ id: "untrusted-target" }] }],
    ["orderedTargets", { orderedTargets: [{ id: "untrusted-ordered-target" }] }],
    ["blockingIssues", { blockingIssues: ["Untrusted blocker"] }],
    ["result", { result: { planningStatus: "Blocked" } }],
    ["kind", { kind: "result" }]
  ])("ignores user-controlled top-level result-like property: %s", (_label, extraProperties) => {
    const baselineProject = createCanvasProject([lifecycleTarget()]);
    const baseline = buildCanvasRecordLifecyclePlanningModel(baselineProject);
    const project = createCanvasProject([lifecycleTarget()]) as ProjectRecord & Record<string, unknown>;
    Object.assign(project, extraProperties);

    const result = buildCanvasRecordLifecyclePlanningModel(project);

    expectCompletePlanningEnvelope(result);
    expect(result).toEqual(baseline);
    expect(result).not.toBe(project);
    expect(result.planningStatus).toBe("Planned");
    expect(result.plans).toHaveLength(1);
  });

  it("keeps unknown extra project properties from changing valid planning output", () => {
    const baseline = buildCanvasRecordLifecyclePlanningModel(createCanvasProject([lifecycleTarget(), restoreTarget()]));
    const project = createCanvasProject([lifecycleTarget(), restoreTarget()]) as ProjectRecord & Record<string, unknown>;
    Object.assign(project, {
      planningStatus: "Blocked",
      plans: [{ planId: "untrusted" }],
      targets: [{ id: "untrusted" }],
      orderedTargets: [{ id: "untrusted" }],
      blockingIssues: ["untrusted"],
      result: { planningStatus: "Blocked" },
      kind: "result",
      unrelatedEnvelope: { nested: true }
    });

    const result = buildCanvasRecordLifecyclePlanningModel(project);

    expectCompletePlanningEnvelope(result);
    expect(result).toEqual(baseline);
    expect(result.plans.map((plan) => plan.planId)).toEqual(baseline.plans.map((plan) => plan.planId));
    expect(result.orderedTargets.map((target) => target.id)).toEqual(baseline.orderedTargets.map((target) => target.id));
  });

  it.each([
    ["blank appType", ""],
    ["whitespace-only appType", "   "],
    ["unsupported appType", "unsupported-type"],
    ["formula-looking appType", "Set(varType, powerAppsCanvas)"]
  ])("blocks invalid appType without partial output: %s", (_label, appType) => {
    const input = {
      identity: { id: "project", projectName: "Project" },
      intake: { appType },
      powerPlatform: { common: { connectors: [] }, canvas: { recordLifecycleTargets: [lifecycleTarget()] } }
    };
    const result = expectMalformedProjectBlocked(input);
    expect(result.plans).toEqual([]);
    expect(result.targets).toEqual([]);
    expect(result.orderedTargets).toEqual([]);
  });

  it.each(PROJECT_TYPE_PRESETS.filter((preset) => preset.value !== "powerAppsCanvas").map((preset) => [preset.value]))(
    "keeps recognized non-Canvas project type Not Applicable: %s",
    (appType) => {
      const project = createProject({
        identity: { id: `${appType}-project`, projectName: `${appType} Project` },
        intake: { appType } as any
      });
      const result = buildCanvasRecordLifecyclePlanningModel(project);
      expect(result).toMatchObject({
        planningStatus: "Not Applicable",
        plans: [],
        orderedTargets: [],
        targets: [],
        blockingIssues: [],
        required: false
      });
    }
  );

  it("continues Canvas app types into lifecycle planning validation", () => {
    const result = buildCanvasRecordLifecyclePlanningModel(createCanvasProject([lifecycleTarget()]));
    expect(result.planningStatus).toBe("Planned");
    expect(result.plans).toHaveLength(1);
    expect(result.targets).toHaveLength(1);
    expect(result.orderedTargets).toHaveLength(1);
  });

  it.each([
    ["missing identity", { intake: { appType: "powerAppsCanvas" } }],
    ["null identity", { identity: null, intake: { appType: "powerAppsCanvas" } }],
    ["primitive identity", { identity: "project", intake: { appType: "powerAppsCanvas" } }],
    ["missing ID", { identity: { projectName: "Project" }, intake: { appType: "powerAppsCanvas" } }],
    ["null ID", { identity: { id: null, projectName: "Project" }, intake: { appType: "powerAppsCanvas" } }],
    ["non-string ID", { identity: { id: 42, projectName: "Project" }, intake: { appType: "powerAppsCanvas" } }],
    ["blank ID", { identity: { id: "", projectName: "Project" }, intake: { appType: "powerAppsCanvas" } }],
    ["whitespace-only ID", { identity: { id: "   ", projectName: "Project" }, intake: { appType: "powerAppsCanvas" } }],
    ["missing project name", { identity: { id: "project" }, intake: { appType: "powerAppsCanvas" } }],
    ["null project name", { identity: { id: "project", projectName: null }, intake: { appType: "powerAppsCanvas" } }],
    ["non-string project name", { identity: { id: "project", projectName: 42 }, intake: { appType: "powerAppsCanvas" } }],
    ["blank project name", { identity: { id: "project", projectName: "" }, intake: { appType: "powerAppsCanvas" } }],
    ["whitespace-only project name", { identity: { id: "project", projectName: "   " }, intake: { appType: "powerAppsCanvas" } }]
  ])("blocks malformed project identity without partial output: %s", (_label, input) => {
    const result = expectMalformedProjectBlocked(input);
    expect(result.plans).toEqual([]);
    expect(result.targets).toEqual([]);
    expect(result.orderedTargets).toEqual([]);
  });

  it("keeps structurally valid non-Canvas projects Not Applicable", () => {
    const project = createProject({
      identity: { id: "website-project", projectName: "Website Project" },
      intake: { appType: "businessWebsite" }
    });
    const result = buildCanvasRecordLifecyclePlanningModel(project);
    expect(result).toMatchObject({
      planningStatus: "Not Applicable",
      plans: [],
      orderedTargets: [],
      targets: [],
      blockingIssues: [],
      required: false
    });
  });

  it("keeps valid Canvas projects planned after top-level project validation", () => {
    const result = buildCanvasRecordLifecyclePlanningModel(createCanvasProject([lifecycleTarget()]));
    expect(result.planningStatus).toBe("Planned");
    expect(result.plans).toHaveLength(1);
  });

  it("blocks malformed project input deterministically without partial planning output", () => {
    const input = {
      identity: { id: "project", projectName: "Project" },
      intake: { appType: "powerAppsCanvas" },
      powerPlatform: { common: "bad", canvas: { recordLifecycleTargets: [lifecycleTarget()] } }
    };
    const result = expectMalformedProjectBlocked(input);
    expect(result.plans).toEqual([]);
    expect(result.targets).toEqual([]);
    expect(buildCanvasRecordLifecyclePlanningModel(input)).toEqual(result);
  });

  it.each([
    ["canvas empty object", canvasEnvelopeInput((project) => { project.powerPlatform!.canvas = {} as any; })],
    ["missing screenTargets", canvasEnvelopeInput((project) => { delete (project.powerPlatform!.canvas as any).screenTargets; })],
    ["null screenTargets", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).screenTargets = null; })],
    ["primitive screenTargets", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).screenTargets = "screens"; })],
    ["primitive screen entry", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).screenTargets = [42]; })],
    ["missing controlTargets", canvasEnvelopeInput((project) => { delete (project.powerPlatform!.canvas as any).controlTargets; })],
    ["malformed stateVariableTargets", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).stateVariableTargets = [null]; })],
    ["malformed formOperationTargets", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).formOperationTargets = [false]; })],
    ["malformed formModeTargets", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).formModeTargets = ["mode"]; })],
    ["malformed sharePointListSchemas", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).sharePointListSchemas = [null]; })],
    ["malformed sharePointLibrarySchemas", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).sharePointLibrarySchemas = [1]; })],
    ["malformed sharePointColumnSchemas", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).sharePointColumnSchemas = [false]; })],
    ["malformed dataverseTableSchemas", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).dataverseTableSchemas = ["table"]; })],
    ["malformed dataverseColumnSchemas", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).dataverseColumnSchemas = [true]; })],
    ["malformed connectorResourceSchemas", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).connectorResourceSchemas = [null]; })],
    ["malformed connectorFieldSchemas", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).connectorFieldSchemas = [7]; })],
    ["connector array containing null", canvasEnvelopeInput((project) => { (project.powerPlatform!.common as any).connectors = [null]; })],
    ["connector array containing primitive", canvasEnvelopeInput((project) => { (project.powerPlatform!.common as any).connectors = ["SharePoint"]; })],
    ["missing selectedDataSourceTypes", canvasEnvelopeInput((project) => { delete (project.powerPlatform!.canvas as any).selectedDataSourceTypes; })],
    ["non-array selectedDataSourceTypes", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).selectedDataSourceTypes = "sharePointList"; })],
    ["missing secondaryConnectorIds", canvasEnvelopeInput((project) => { delete (project.powerPlatform!.canvas as any).secondaryConnectorIds; })],
    ["non-array secondaryConnectorIds", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).secondaryConnectorIds = "connector-other"; })],
    ["non-string primaryDataSourceType", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).primaryDataSourceType = 42; })],
    ["non-string primaryConnectorId", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).primaryConnectorId = null; })],
    ["primitive recordLifecycleTargets", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).recordLifecycleTargets = "targets"; })],
    ["object recordLifecycleTargets", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).recordLifecycleTargets = { id: "target" }; })],
    ["lifecycle target array containing null", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).recordLifecycleTargets = [null]; })],
    ["lifecycle target array containing primitive", canvasEnvelopeInput((project) => { (project.powerPlatform!.canvas as any).recordLifecycleTargets = ["target"]; })]
  ])("blocks malformed Canvas storage envelope without partial output: %s", (_label, input) => {
    const result = expectMalformedProjectBlocked(input);
    expect(result.plans).toEqual([]);
    expect(result.orderedTargets).toEqual([]);
    expect(result.targets).toEqual([]);
    expect(result.duplicatePlanIssues).toEqual([]);
    expect(buildCanvasRecordLifecyclePlanningModel(input)).toEqual(result);
  });

  it("keeps structurally valid Canvas projects with empty lifecycle targets Not Applicable", () => {
    const project = createCanvasProject([]);
    const result = buildCanvasRecordLifecyclePlanningModel(project);

    expect(result).toMatchObject({
      planningStatus: "Not Applicable",
      plans: [],
      orderedTargets: [],
      targets: [],
      blockingIssues: [],
      required: false
    });
  });

  it("keeps structurally valid Canvas projects with undefined lifecycle targets Not Applicable", () => {
    const project = createCanvasProject([]);
    delete (project.powerPlatform!.canvas as any).recordLifecycleTargets;

    const result = buildCanvasRecordLifecyclePlanningModel(project);

    expect(result).toMatchObject({
      planningStatus: "Not Applicable",
      plans: [],
      orderedTargets: [],
      targets: [],
      blockingIssues: [],
      required: false
    });
  });

  it.each([
    ["status field archive", lifecycleTarget(), "statusField", "field-status", "status", "Archived", "Active"],
    ["active flag archive", lifecycleTarget({ archiveStrategy: "activeFlag", lifecycleFieldId: "field-active", archiveValue: "false", restoreValue: "true" }), "activeFlag", "field-active", "boolean", "false", "true"],
    ["archived flag archive", lifecycleTarget({ archiveStrategy: "archivedFlag", lifecycleFieldId: "field-archived", archiveValue: "true", restoreValue: "false" }), "archivedFlag", "field-archived", "boolean", "true", "false"],
    ["soft-delete flag archive", lifecycleTarget({ archiveStrategy: "softDeleteFlag", lifecycleFieldId: "field-soft-delete", archiveValue: "true", restoreValue: "false" }), "softDeleteFlag", "field-soft-delete", "boolean", "true", "false"]
  ])("plans %s", (_label, target, strategy, fieldId, fieldType, targetValue, expectedCurrent) => {
    const [plan] = expectPlanned(createCanvasProject([target]));
    expect(plan).toMatchObject({
      actionType: "archive",
      lifecycleStrategy: strategy,
      lifecycleFieldId: fieldId,
      lifecycleFieldType: fieldType,
      targetLifecycleValue: targetValue,
      expectedCurrentLifecycleValue: expectedCurrent,
      connectorOperationType: "updateRecord",
      connectorOperationCapability: "update",
      planningStatus: "Planned"
    });
    expect(plan.preconditions.map((item) => item.type)).toContain("currentRecordNotArchived");
    expectOptionalBehaviourNotPlanned(plan);
    expect(plan.orderedActionSteps.map((step) => step.type)).toEqual([
      "validateRecordContext",
      "validateCurrentLifecycleState",
      "performConnectorMutation"
    ]);
  });

  it.each([
    ["status field restore", restoreTarget(), "statusField", "field-status", "status", "Active", "Archived"],
    ["active flag restore", restoreTarget({ archiveStrategy: "activeFlag", lifecycleFieldId: "field-active", archiveValue: "false", restoreValue: "true" }), "activeFlag", "field-active", "boolean", "true", "false"],
    ["archived flag restore", restoreTarget({ archiveStrategy: "archivedFlag", lifecycleFieldId: "field-archived", archiveValue: "true", restoreValue: "false" }), "archivedFlag", "field-archived", "boolean", "false", "true"],
    ["soft-delete flag restore", restoreTarget({ archiveStrategy: "softDeleteFlag", lifecycleFieldId: "field-soft-delete", archiveValue: "true", restoreValue: "false" }), "softDeleteFlag", "field-soft-delete", "boolean", "false", "true"]
  ])("plans %s", (_label, target, strategy, fieldId, fieldType, targetValue, expectedCurrent) => {
    const [plan] = expectPlanned(createCanvasProject([target]));
    expect(plan).toMatchObject({
      actionType: "restore",
      lifecycleStrategy: strategy,
      lifecycleFieldId: fieldId,
      lifecycleFieldType: fieldType,
      targetLifecycleValue: targetValue,
      expectedCurrentLifecycleValue: expectedCurrent,
      connectorOperationType: "updateRecord",
      connectorOperationCapability: "update"
    });
    expect(plan.preconditions.map((item) => item.type)).toContain("currentRecordArchived");
    expectOptionalBehaviourNotPlanned(plan);
    expect(plan.orderedActionSteps.map((step) => step.type)).toEqual([
      "validateRecordContext",
      "validateCurrentLifecycleState",
      "performConnectorMutation"
    ]);
  });

  it("plans permanent delete separately from archive and restore", () => {
    const [plan] = expectPlanned(createCanvasProject([permanentDeleteTarget()]));
    expect(plan).toMatchObject({
      actionType: "delete",
      lifecycleStrategy: "permanentDelete",
      lifecycleFieldId: "",
      lifecycleFieldType: "notApplicable",
      targetLifecycleValue: "",
      expectedCurrentLifecycleValue: "",
      connectorOperationType: "deleteRecord",
      connectorOperationCapability: "delete",
      permanentDeleteApprovalReference: "delete-request"
    });
    expect(plan.preconditions.map((item) => item.type)).toContain("permanentDeleteApproved");
    expectOptionalBehaviourNotPlanned(plan);
    expect(plan.orderedActionSteps.map((step) => step.type)).toEqual([
      "validateRecordContext",
      "performConnectorMutation"
    ]);
    expect(JSON.stringify(plan)).not.toMatch(/Patch|Remove|RemoveIf|UpdateIf|SubmitForm|ResetForm|Navigate\(|Notify\(|Refresh\(|Set\(|UpdateContext|Gallery\.Selected|Form\.Item/);
  });

  it.each([
    ["missing lifecycle field", lifecycleTarget({ lifecycleFieldId: "missing-field" }), "missing lifecycle field"],
    ["wrong field type", lifecycleTarget({ archiveStrategy: "statusField", lifecycleFieldId: "field-active" }), "statusField strategy"],
    ["missing connector update operation", lifecycleTarget(), "requires connector update capability"],
    ["invalid record context", lifecycleTarget({ recordContextReferenceId: "button-archive" }), "gallery or data-table"],
    ["archive/restore strategy inconsistency", [lifecycleTarget(), restoreTarget({ archiveStrategy: "activeFlag", lifecycleFieldId: "field-active", archiveValue: "false", restoreValue: "true" })], "must use the same archive strategy"],
    ["record not archived decision blocked by missing restore value", restoreTarget({ restoreValue: "" }), "restore value"],
    ["missing restore capability", restoreTarget(), "requires connector update capability"],
    ["invalid entity ownership", lifecycleTarget({ connectorId: "connector-other" }), "does not match canonical owner"]
  ])("blocks archive/restore planning issue: %s", (_label, targetOrTargets, expected) => {
    const targets = Array.isArray(targetOrTargets) ? targetOrTargets as CanvasRecordLifecycleTarget[] : [targetOrTargets as CanvasRecordLifecycleTarget];
    const project = createCanvasProject(targets);
    if (_label === "missing connector update operation" || _label === "missing restore capability") {
      project.powerPlatform!.common.connectors.find((connector) => connector.id === "connector-sharepoint")!.supportedOperations.update = false;
    }
    expect(expectBlocked(project)).toContain(expected);
  });

  it.each([
    ["missing permanent-delete approval", permanentDeleteTarget({ deleteStrategy: "missingDecision" }), "approved delete strategy"],
    ["unconfirmed permanent-delete approval", permanentDeleteTarget({ destructiveActionConfirmed: false }), "destructiveActionConfirmed true"],
    ["archive strategy not marked Not Applicable", permanentDeleteTarget({ archiveStrategy: "statusField" }), "archiveStrategy notApplicable"],
    ["missing delete capability", permanentDeleteTarget(), "not explicitly permitted"],
    ["archive strategy incorrectly reused", permanentDeleteTarget({ archiveStrategy: "activeFlag" }), "archiveStrategy notApplicable"],
    ["soft-delete incorrectly treated as permanent delete", permanentDeleteTarget({ deleteStrategy: "softDeleteOnly", lifecycleFieldId: "field-archived", archiveValue: "true" }), "explicit permanent-delete approval"]
  ])("blocks delete planning issue: %s", (_label, target, expected) => {
    const project = createCanvasProject([target]);
    if (_label === "missing delete capability") {
      project.powerPlatform!.common.connectors.find((connector) => connector.id === "connector-sharepoint")!.supportedOperations.delete = false;
    }
    expect(expectBlocked(project)).toContain(expected);
  });

  it.each([
    ["selected record control", lifecycleTarget({ recordContextType: "selectedRecord", recordContextReferenceId: "gallery-requests" }), "selectedRecordControl", "gallery-requests", "", ""],
    ["form item", lifecycleTarget({ recordContextType: "formItem", recordContextReferenceId: "form-request" }), "formItem", "", "form-request", ""],
    ["explicit record variable", lifecycleTarget({ recordContextType: "explicitRecordVariable", recordContextReferenceId: "state-selected-record" }), "explicitRecordVariable", "", "", "state-selected-record"]
  ])("preserves record context source for %s", (_label, target, source, selected, form, variable) => {
    const [plan] = expectPlanned(createCanvasProject([target]));
    expect(plan).toMatchObject({
      recordContextSource: source,
      selectedRecordControlId: selected,
      formId: form,
      explicitRecordVariableId: variable
    });
  });

  it("returns Not Applicable only when lifecycle target validation is not applicable", () => {
    const project = createCanvasProject([]);
    const result = buildCanvasRecordLifecyclePlanningModel(project);
    expect(result).toMatchObject({ planningStatus: "Not Applicable", plans: [], blockingIssues: [] });
  });

  it.each([
    ["zero compatible active connectors", (project: ProjectRecord) => {
      project.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
      project.powerPlatform!.canvas!.selectedDataSourceTypes = ["dataverse"];
      project.powerPlatform!.canvas!.primaryConnectorId = "connector-other";
      project.powerPlatform!.canvas!.secondaryConnectorIds = [];
    }, "inactive or unresolved entity"],
    ["exactly one compatible active connector", (_project: ProjectRecord) => undefined, ""],
    ["multiple compatible active connectors", (project: ProjectRecord) => addActiveSecondaryConnector(project, "connector-sharepoint-two", "sharePointList"), "ambiguous connector ownership"],
    ["explicit connector-resource ownership", (project: ProjectRecord) => {
      addConnectorResource(project);
      project.powerPlatform!.canvas!.recordLifecycleTargets = [lifecycleTarget({
        id: "archive-resource",
        connectorId: "connector-api",
        entityId: "resource-ticket",
        archiveStrategy: "archivedFlag",
        lifecycleFieldId: "field-resource-archived",
        archiveValue: "true",
        restoreValue: "false"
      })];
    }, ""],
    ["malformed primary connector ID", (project: ProjectRecord) => {
      (project.powerPlatform!.canvas as unknown as Record<string, unknown>).primaryConnectorId = "Patch(Data)";
    }, "primaryConnectorId must be a safe string ID"],
    ["malformed secondary connector IDs", (project: ProjectRecord) => {
      (project.powerPlatform!.canvas as unknown as Record<string, unknown>).secondaryConnectorIds = [42];
    }, "secondaryConnectorIds record 1"],
    ["malformed selected data-source types", (project: ProjectRecord) => {
      (project.powerPlatform!.canvas as unknown as Record<string, unknown>).selectedDataSourceTypes = ["unknownBackend"];
    }, "selectedDataSourceTypes record 1 is unsupported"],
    ["reconciliation blockers preserved", (project: ProjectRecord) => {
      project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
      project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "externalApi"];
      project.powerPlatform!.canvas!.secondaryConnectorIds = [];
    }, "No active Canvas connector is assigned"]
  ])("handles connector ownership case: %s", (_label, mutate, expected) => {
    const project = createCanvasProject();
    mutate(project);
    if (expected) expect(expectBlocked(project)).toContain(expected);
    else expectPlanned(project);
  });

  it("plans Dataverse ownership through the canonical active connector", () => {
    const project = createCanvasProject([lifecycleTarget({
      connectorId: "connector-other",
      entityId: "table-requests",
      lifecycleFieldId: "column-status"
    })]);
    addDataverseTable(project);
    const [plan] = expectPlanned(project);
    expect(plan).toMatchObject({ entityType: "dataverseTable", backendType: "dataverse", connectorId: "connector-other" });
    expect(plan).toMatchObject(expectCanonicalEntity(project, "table-requests"));
  });

  it("plans SharePoint-library ownership through the canonical active connector", () => {
    const project = createCanvasProject([lifecycleTarget({
      entityId: "library-documents",
      lifecycleFieldId: "field-library-status"
    })]);
    addSharePointLibrary(project);
    const [plan] = expectPlanned(project);
    expect(plan).toMatchObject({ entityType: "sharePointLibrary", backendType: "sharePointList", connectorId: "connector-sharepoint" });
    expect(plan).toMatchObject(expectCanonicalEntity(project, "library-documents"));
  });

  it("keeps SharePoint list entity type separate from the connector backend type", () => {
    const project = createCanvasProject();
    const [plan] = expectPlanned(project);
    expect(plan.entityType).toBe("sharePointList");
    expect(plan.backendType).toBe("sharePointList");
    expect(plan).toMatchObject(expectCanonicalEntity(project, "list-requests"));
  });

  it("preserves Microsoft Lists as the backend type for a SharePoint list entity", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.primaryDataSourceType = "microsoftList";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["microsoftList"];
    project.powerPlatform!.common.connectors.find((connector) => connector.id === "connector-sharepoint")!.dataSourceType = "microsoftList";
    const [plan] = expectPlanned(project);
    expect(plan.entityType).toBe("sharePointList");
    expect(plan.backendType).toBe("microsoftList");
    expect(plan).toMatchObject(expectCanonicalEntity(project, "list-requests"));
  });

  it("preserves SharePoint library backend type when the active connector is a library connector", () => {
    const project = createCanvasProject([lifecycleTarget({
      entityId: "library-documents",
      lifecycleFieldId: "field-library-status"
    })]);
    addSharePointLibrary(project);
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointLibrary";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointLibrary"];
    project.powerPlatform!.common.connectors.find((connector) => connector.id === "connector-sharepoint")!.dataSourceType = "sharePointLibrary";
    const [plan] = expectPlanned(project);
    expect(plan.entityType).toBe("sharePointLibrary");
    expect(plan.backendType).toBe("sharePointLibrary");
    expect(plan).toMatchObject(expectCanonicalEntity(project, "library-documents"));
  });

  it("preserves connector-resource backend type from canonical ownership", () => {
    const project = createCanvasProject([lifecycleTarget({
      id: "archive-resource",
      connectorId: "connector-api",
      entityId: "resource-ticket",
      archiveStrategy: "archivedFlag",
      lifecycleFieldId: "field-resource-archived",
      archiveValue: "true",
      restoreValue: "false"
    })]);
    addConnectorResource(project);
    const [plan] = expectPlanned(project);
    expect(plan.entityType).toBe("connectorResource");
    expect(plan.backendType).toBe("customConnector");
    expect(plan).toMatchObject(expectCanonicalEntity(project, "resource-ticket"));
  });

  it.each([
    ["null lifecycle collection", null, "must be an array"],
    ["primitive lifecycle collection", 42, "must be an array"],
    ["object lifecycle collection", {}, "must be an array"],
    ["null lifecycle entry", [null], "must be an object"],
    ["primitive lifecycle entry", ["bad"], "must be an object"],
    ["blank ID", [lifecycleTarget({ id: "" })], "ID is missing"],
    ["formula-looking ID", [lifecycleTarget({ id: "Patch(Data)" })], "unsafe"],
    ["unsupported action", [lifecycleTarget({ action: "Patch()" as CanvasRecordLifecycleAction })], "unsupported action"],
    ["malformed connector record", [lifecycleTarget()], "powerPlatform.common.connectors record 1 is malformed"],
    ["malformed current control", [lifecycleTarget()], "powerPlatform.canvas.controlTargets record 1 is malformed"],
    ["malformed field record", [lifecycleTarget()], "powerPlatform.canvas.sharePointColumnSchemas record 1 is malformed"]
  ])("blocks malformed runtime input without throwing: %s", (_label, targets, expected) => {
    const project = createCanvasProject(Array.isArray(targets) ? targets as CanvasRecordLifecycleTarget[] : [lifecycleTarget()]);
    if (_label.includes("collection") || _label.includes("entry")) {
      (project.powerPlatform!.canvas as unknown as Record<string, unknown>).recordLifecycleTargets = targets;
    }
    if (_label === "malformed connector record") {
      (project.powerPlatform!.common as unknown as Record<string, unknown>).connectors = [{ id: "connector-sharepoint" }];
    }
    if (_label === "malformed current control") {
      (project.powerPlatform!.canvas as unknown as Record<string, unknown>).controlTargets = [{ id: "button-archive" }];
    }
    if (_label === "malformed field record") {
      (project.powerPlatform!.canvas as unknown as Record<string, unknown>).sharePointColumnSchemas = [{ id: "field-status" }];
    }
    expect(() => buildCanvasRecordLifecyclePlanningModel(project)).not.toThrow();
    expect(expectBlocked(project)).toContain(expected);
  });

  it("does not create partial plans when any target is blocked", () => {
    const result = buildCanvasRecordLifecyclePlanningModel(createCanvasProject([
      lifecycleTarget(),
      restoreTarget({ triggerControlId: "missing-button", sortOrder: 20 })
    ]));
    expect(result.planningStatus).toBe("Blocked");
    expect(result.plans).toEqual([]);
  });

  it("orders plans deterministically by sort order, action, and ID", () => {
    const project = createCanvasProject([
      permanentDeleteTarget({ id: "delete-c", sortOrder: 30 }),
      lifecycleTarget({ id: "archive-a", sortOrder: 10 }),
      restoreTarget({ id: "restore-b", sortOrder: 20 })
    ]);
    expect(expectPlanned(project).map((plan) => plan.lifecycleTargetId)).toEqual(["archive-a", "restore-b", "delete-c"]);
  });

  it("keeps output stable when unrelated arrays are reordered", () => {
    const project = createCanvasProject([lifecycleTarget(), restoreTarget()]);
    const baseline = buildCanvasRecordLifecyclePlanningModel(project);
    project.powerPlatform!.canvas!.screenTargets.reverse();
    project.powerPlatform!.canvas!.controlTargets.reverse();
    project.powerPlatform!.common.connectors.reverse();
    project.powerPlatform!.canvas!.sharePointColumnSchemas.reverse();
    expect(buildCanvasRecordLifecyclePlanningModel(project)).toEqual(baseline);
  });

  it("blocks duplicate targets and duplicate plan identities instead of deduplicating", () => {
    const result = buildCanvasRecordLifecyclePlanningModel(createCanvasProject([
      lifecycleTarget({ id: "duplicate-target" }),
      lifecycleTarget({ id: "duplicate-target", triggerControlId: "button-restore", sortOrder: 20 })
    ]));
    expect(result.planningStatus).toBe("Blocked");
    expect(result.plans).toEqual([]);
    expect(result.blockingIssues.join(" ")).toContain("Duplicate lifecycle target ID");
  });

  it("does not mutate project input or current planning records", () => {
    const project = createCanvasProject([lifecycleTarget(), restoreTarget()]);
    const before = clone(project);
    buildCanvasRecordLifecyclePlanningModel(project);
    expect(project).toEqual(before);
  });

  it("repeated execution produces identical output", () => {
    const project = createCanvasProject([lifecycleTarget(), restoreTarget(), permanentDeleteTarget()]);
    expect(buildCanvasRecordLifecyclePlanningModel(project)).toEqual(buildCanvasRecordLifecyclePlanningModel(project));
  });

  it("returns controlled planning result shape", () => {
    const result = buildCanvasRecordLifecyclePlanningModel(createCanvasProject([lifecycleTarget()]));
    expect(result.planningStatus).toBe("Planned");
    expect(result.required).toBe(true);
    expect(result.duplicatePlanIssues).toEqual([]);
    expect(result.plans[0]).toHaveProperty("preconditions");
    expect(result.plans[0]).toHaveProperty("orderedActionSteps");
  });

  it("does not create implementation assets, formula fields, intended paths, YAML, UI integration, or export records", () => {
    const project = createCanvasProject([lifecycleTarget()]);
    const result = buildCanvasRecordLifecyclePlanningModel(project);
    expect((project as { implementationAssets?: unknown }).implementationAssets).toBeUndefined();
    expect(JSON.stringify(result)).not.toMatch(/\.fx|Patch\(|Remove\(|RemoveIf\(|UpdateIf\(|SubmitForm\(|ResetForm\(|Navigate\(|Notify\(|Refresh\(|Set\(|UpdateContext\(|Gallery\.Selected|Form\.Item|yaml|manifest|export/i);
  });
});
