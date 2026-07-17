import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import {
  normalizeCanvasFormOperationTargets,
  orderCanvasFormOperationTargets,
  validateCanvasFormOperationTargets
} from "../lib/formOperationTargets";
import { CANVAS_FORM_OPERATIONS_ASSET_ID } from "../lib/formOperationPlanning";
import { buildImplementationAssetRegistry } from "../lib/implementationAssets";
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
  createDefaultSharePointList,
  normalizePowerPlatformData
} from "../lib/powerPlatform";
import type { CanvasFormOperationTarget, ProjectRecord, SelectableCanvasDataSourceType } from "../types/project";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function target(overrides: Partial<CanvasFormOperationTarget> = {}): CanvasFormOperationTarget {
  return {
    id: overrides.id ?? "form-op-create-request",
    operation: overrides.operation ?? "create",
    screenId: overrides.screenId ?? "screen-request",
    formControlId: overrides.formControlId ?? "form-request",
    submitControlId: overrides.submitControlId ?? "button-submit-create",
    sourceConnectorId: overrides.sourceConnectorId ?? "connector-sharepoint",
    sourceEntityId: overrides.sourceEntityId ?? "list-requests",
    requiredFieldIds: overrides.requiredFieldIds ?? ["field-title"],
    submissionTrigger: overrides.submissionTrigger ?? "controlOnSelect",
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function createCanvasProject(formTargets: CanvasFormOperationTarget[] = [target()]): ProjectRecord {
  const project = createProject({
    identity: { id: "form-project", projectName: "Form Project" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Model form operations.",
      requiredFeatures: "Create and edit records.",
      workflows: "Submit form.",
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
      supportedOperations: { read: true, create: true, update: true }
    }),
    createDefaultConnector({
      id: "connector-other",
      displayName: "Other",
      dataSourceName: "Other",
      dataSourceType: "sharePointList",
      canvasRole: "secondary",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      connectionOwnershipStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      supportedOperations: { read: true, create: true, update: true }
    })
  ];
  const canvas = pp.canvas!;
  canvas.primaryDataSourceType = "sharePointList";
  canvas.selectedDataSourceTypes = ["sharePointList"];
  canvas.primaryConnectorId = "connector-sharepoint";
  canvas.secondaryConnectorIds = ["connector-other"];
  canvas.screenTargets = [
    createDefaultCanvasScreenTarget({
      id: "screen-request",
      approvedScreenName: "scrRequest",
      purpose: "Request form.",
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
    createDefaultCanvasControlTarget({
      id: "form-request",
      screenId: "screen-request",
      approvedControlName: "frmRequest",
      controlType: "edit form",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultCanvasControlTarget({
      id: "button-submit-create",
      screenId: "screen-request",
      approvedControlName: "btnSubmitCreate",
      controlType: "button",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultCanvasControlTarget({
      id: "button-submit-edit",
      screenId: "screen-request",
      approvedControlName: "btnSubmitEdit",
      controlType: "button",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultCanvasControlTarget({
      id: "control-other-screen",
      screenId: "screen-other",
      approvedControlName: "btnOther",
      controlType: "button",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.sharePointListSchemas = [
    createDefaultSharePointList({
      id: "list-requests",
      displayName: "Requests",
      purpose: "Requests.",
      expectedRecordCount: "50",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointList({
      id: "list-other",
      displayName: "OtherList",
      purpose: "Other.",
      expectedRecordCount: "10",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.sharePointColumnSchemas = [
    createDefaultSharePointColumn({
      id: "field-title",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Title",
      internalName: "Title",
      columnType: "Single line of text",
      requiredStatus: "required",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointColumn({
      id: "field-optional",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Optional",
      internalName: "Optional",
      columnType: "Single line of text",
      requiredStatus: "optional",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointColumn({
      id: "field-other",
      parentType: "list",
      parentId: "list-other",
      displayName: "Other",
      internalName: "Other",
      columnType: "Single line of text",
      requiredStatus: "required",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.formOperationTargets = formTargets;
  return project;
}

function expectBlocked(project: ProjectRecord, input: unknown = project.powerPlatform?.canvas?.formOperationTargets): string {
  const result = validateCanvasFormOperationTargets(project, input);
  expect(result.eligibilityStatus).toBe("Blocked");
  expect(result.blockingIssues.length).toBeGreaterThan(0);
  return result.blockingIssues.join(" ");
}

function addActiveConnectorResource(project: ProjectRecord, dataSourceType: SelectableCanvasDataSourceType = "externalApi"): void {
  const canvas = project.powerPlatform!.canvas!;
  const connectorId = `connector-${dataSourceType.toLowerCase()}`;
  project.powerPlatform!.common.connectors = [
    createDefaultConnector({
      id: connectorId,
      displayName: dataSourceType,
      dataSourceName: dataSourceType,
      dataSourceType,
      canvasRole: "primary",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      connectionOwnershipStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      supportedOperations: { read: true, create: true, update: true }
    })
  ];
  canvas.primaryDataSourceType = dataSourceType;
  canvas.selectedDataSourceTypes = [dataSourceType];
  canvas.primaryConnectorId = connectorId;
  canvas.secondaryConnectorIds = [];
  canvas.connectorResourceSchemas = [
    createDefaultConnectorResource({
      id: "resource-requests",
      connectorId,
      resourceName: "Requests",
      keyOrIdentifier: "id",
      authenticationRequirement: "service connection",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.connectorFieldSchemas = [
    createDefaultConnectorField({
      id: "field-api-title",
      connectorId,
      resourceId: "resource-requests",
      displayName: "Title",
      fieldIdentifier: "Title",
      fieldType: "text",
      requiredStatus: "required",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.formOperationTargets = [
    target({
      sourceConnectorId: connectorId,
      sourceEntityId: "resource-requests",
      requiredFieldIds: ["field-api-title"]
    })
  ];
}

function addActiveApiResource(project: ProjectRecord): void {
  addActiveConnectorResource(project, "externalApi");
}

describe("Canvas form operation targets", () => {
  it("defaults new Canvas projects to an empty form-operation list", () => {
    expect(createProject({ intake: { appType: "powerAppsCanvas" } as any }).powerPlatform!.canvas!.formOperationTargets).toEqual([]);
  });

  it("normalizes legacy Canvas projects missing the list to empty", () => {
    const project = createCanvasProject();
    const legacy = { ...project.powerPlatform!, canvas: { ...project.powerPlatform!.canvas!, formOperationTargets: undefined } };
    expect(normalizePowerPlatformData(legacy, "powerAppsCanvas")!.canvas!.formOperationTargets).toEqual([]);
  });

  it("malformed list and records do not throw", () => {
    expect(() => normalizeCanvasFormOperationTargets("bad")).not.toThrow();
    expect(() => normalizeCanvasFormOperationTargets([null, 1, {}, { id: "target-one" }])).not.toThrow();
  });

  it("normalizes valid create and edit targets", () => {
    expect(normalizeCanvasFormOperationTargets([target()])[0].operation).toBe("create");
    expect(normalizeCanvasFormOperationTargets([target({ id: "form-op-edit", operation: "edit", submitControlId: "button-submit-edit" })])[0].operation).toBe("edit");
  });

  it.each([
    ["unsupported operation", [target({ operation: "update" as any })]],
    ["unsupported submission trigger", [target({ submissionTrigger: "manual" as any })]],
    ["empty target ID", [target({ id: "" })]],
    ["unsafe target ID", [target({ id: "Patch(target)" })]]
  ])("blocks %s", (_label, targets) => {
    expectBlocked(createCanvasProject(targets));
  });

  it("blocks duplicate target IDs and duplicate sort orders", () => {
    expect(expectBlocked(createCanvasProject([target({ id: "dup" }), target({ id: "dup", submitControlId: "button-submit-edit", sortOrder: 20 })]))).toContain("Duplicate form operation target ID");
    expect(expectBlocked(createCanvasProject([target({ id: "one" }), target({ id: "two", submitControlId: "button-submit-edit" })]))).toContain("Duplicate form operation target sort order");
  });

  it("orders by sort order then stable ID", () => {
    expect(orderCanvasFormOperationTargets([
      target({ id: "b", sortOrder: 20 }),
      target({ id: "a", sortOrder: 10 }),
      target({ id: "c", sortOrder: 20 })
    ]).map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it.each([
    ["missing screen", () => createCanvasProject([target({ screenId: "missing-screen" })])],
    ["unconfirmed screen", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.screenTargets[0].confirmationStatus = "reviewNeeded";
      return project;
    }],
    ["invalid approved screen name", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.screenTargets[0].approvedScreenName = "scr Request";
      return project;
    }],
    ["missing form control", () => createCanvasProject([target({ formControlId: "missing-form" })])],
    ["form on another screen", () => createCanvasProject([target({ formControlId: "control-other-screen" })])],
    ["unconfirmed form control", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.controlTargets[0].confirmationStatus = "reviewNeeded";
      return project;
    }],
    ["unsupported form-control type", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.controlTargets[0].controlType = "gallery";
      return project;
    }],
    ["display form", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.controlTargets[0].controlType = "display form";
      return project;
    }],
    ["invalid form-control implementation name", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.controlTargets[0].approvedControlName = "frm Request";
      return project;
    }],
    ["missing submit control", () => createCanvasProject([target({ submitControlId: "missing-submit" })])],
    ["submit control on another screen", () => createCanvasProject([target({ submitControlId: "control-other-screen" })])],
    ["unconfirmed submit control", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.controlTargets[1].confirmationStatus = "reviewNeeded";
      return project;
    }],
    ["non-button submit control", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.controlTargets[1].controlType = "icon";
      return project;
    }],
    ["invalid submit-control implementation name", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.controlTargets[1].approvedControlName = "btn Submit";
      return project;
    }]
  ])("blocks %s", (_label, makeProject) => {
    expectBlocked(makeProject());
  });

  it.each([
    ["missing connector", () => createCanvasProject([target({ sourceConnectorId: "missing-connector" })])],
    ["unconfirmed connector", () => {
      const project = createCanvasProject();
      project.powerPlatform!.common.connectors[0].approvalConfirmationStatus = "reviewNeeded";
      return project;
    }],
    ["create without create support", () => {
      const project = createCanvasProject();
      project.powerPlatform!.common.connectors[0].supportedOperations.create = false;
      return project;
    }],
    ["edit without update support", () => {
      const project = createCanvasProject([target({ operation: "edit", submitControlId: "button-submit-edit" })]);
      project.powerPlatform!.common.connectors[0].supportedOperations.update = false;
      return project;
    }],
    ["missing entity", () => createCanvasProject([target({ sourceEntityId: "missing-entity" })])],
    ["entity belonging to another connector", () => createCanvasProject([target({ sourceEntityId: "list-requests", sourceConnectorId: "connector-other" })])],
    ["unconfirmed entity", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.sharePointListSchemas[0].confirmationStatus = "reviewNeeded";
      return project;
    }],
    ["invalid entity implementation name", () => {
      const project = createCanvasProject();
      project.powerPlatform!.canvas!.sharePointListSchemas[0].displayName = "Request List";
      return project;
    }]
  ])("blocks %s", (_label, makeProject) => {
    expectBlocked(makeProject());
  });

  it("keeps a valid active primary connector valid", () => {
    expect(validateCanvasFormOperationTargets(createCanvasProject()).eligibilityStatus).toBe("Valid");
  });

  it("blocks an inactive stored secondary connector in single-backend mode", () => {
    const project = createCanvasProject([target({ sourceConnectorId: "connector-other" })]);
    expect(expectBlocked(project)).toContain("inactive connector connector-other");
  });

  it("blocks connectors outside the selected backend types", () => {
    const project = createCanvasProject([target({ sourceConnectorId: "connector-api" })]);
    project.powerPlatform!.common.connectors.push(createDefaultConnector({
      id: "connector-api",
      displayName: "API",
      dataSourceName: "API",
      dataSourceType: "externalApi",
      canvasRole: "secondary",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      connectionOwnershipStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      supportedOperations: { read: true, create: true, update: true }
    }));
    expect(expectBlocked(project)).toContain("inactive connector connector-api");
  });

  it("blocks stale or mismatched primary connectors and surfaces reconciliation issues", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.primaryConnectorId = "connector-api";
    project.powerPlatform!.common.connectors.push(createDefaultConnector({
      id: "connector-api",
      displayName: "API",
      dataSourceName: "API",
      dataSourceType: "externalApi",
      canvasRole: "primary",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      connectionOwnershipStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      supportedOperations: { read: true, create: true, update: true }
    }));
    const issues = expectBlocked(project);
    expect(issues).toContain("Canvas connector selection");
    expect(issues).toContain("must match single Canvas backend sharePointList");
  });

  it("honors explicit connector-resource ownership only when the owner is active", () => {
    const active = createCanvasProject();
    addActiveApiResource(active);
    expect(validateCanvasFormOperationTargets(active).eligibilityStatus).toBe("Valid");

    const inactive = createCanvasProject();
    addActiveApiResource(inactive);
    inactive.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    inactive.powerPlatform!.canvas!.primaryConnectorId = "connector-api";
    expect(expectBlocked(inactive)).toContain("inactive connector-resource entity resource-requests");
  });

  it.each([
    "externalApi",
    "customConnector",
    "otherConnector",
    "microsoft365Connector",
    "sqlServer",
    "excel"
  ] satisfies SelectableCanvasDataSourceType[])("validates active connector-resource targets for %s", (dataSourceType) => {
    const project = createCanvasProject();
    addActiveConnectorResource(project, dataSourceType);
    expect(validateCanvasFormOperationTargets(project).eligibilityStatus).toBe("Valid");
  });

  it.each(["sqlServer", "excel"] satisfies SelectableCanvasDataSourceType[])("blocks inactive %s connector-resource owners", (dataSourceType) => {
    const project = createCanvasProject();
    addActiveConnectorResource(project, dataSourceType);
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    expect(expectBlocked(project)).toContain("inactive connector-resource entity resource-requests");
  });

  it("blocks connector-resource targets when explicit owner differs from the target connector", () => {
    const project = createCanvasProject();
    addActiveConnectorResource(project, "externalApi");
    project.powerPlatform!.common.connectors.push(createDefaultConnector({
      id: "connector-custom",
      displayName: "Custom",
      dataSourceName: "Custom",
      dataSourceType: "customConnector",
      canvasRole: "secondary",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      connectionOwnershipStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      supportedOperations: { read: true, create: true, update: true }
    }));
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["externalApi", "customConnector"];
    project.powerPlatform!.canvas!.secondaryConnectorIds = ["connector-custom"];
    project.powerPlatform!.canvas!.formOperationTargets[0].sourceConnectorId = "connector-custom";
    expect(expectBlocked(project)).toContain("does not belong to connector connector-custom");
  });

  it.each([
    ["create", "create", "button-submit-create"],
    ["edit", "update", "button-submit-edit"]
  ] as const)("blocks SQL Server %s targets without %s support", (operation, supportedOperation, submitControlId) => {
    const project = createCanvasProject();
    addActiveConnectorResource(project, "sqlServer");
    project.powerPlatform!.canvas!.formOperationTargets[0].operation = operation;
    project.powerPlatform!.canvas!.formOperationTargets[0].submitControlId = submitControlId;
    project.powerPlatform!.common.connectors[0].supportedOperations[supportedOperation] = false;
    expect(expectBlocked(project)).toContain(`does not support ${operation} operations`);
  });

  it.each([
    ["create", "create", "button-submit-create"],
    ["edit", "update", "button-submit-edit"]
  ] as const)("blocks Excel %s targets without %s support", (operation, supportedOperation, submitControlId) => {
    const project = createCanvasProject();
    addActiveConnectorResource(project, "excel");
    project.powerPlatform!.canvas!.formOperationTargets[0].operation = operation;
    project.powerPlatform!.canvas!.formOperationTargets[0].submitControlId = submitControlId;
    project.powerPlatform!.common.connectors[0].supportedOperations[supportedOperation] = false;
    expect(expectBlocked(project)).toContain(`does not support ${operation} operations`);
  });

  it("uses canonical SharePoint-family compatibility for SharePoint list schemas", () => {
    const project = createCanvasProject();
    project.powerPlatform!.common.connectors[0].dataSourceType = "microsoftList";
    project.powerPlatform!.canvas!.primaryDataSourceType = "microsoftList";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["microsoftList"];
    expect(validateCanvasFormOperationTargets(project).eligibilityStatus).toBe("Valid");
  });

  it("uses canonical SharePoint-family compatibility for SharePoint library schemas", () => {
    const project = createCanvasProject([target({
      sourceEntityId: "library-documents",
      requiredFieldIds: ["field-document-title"]
    })]);
    project.powerPlatform!.canvas!.sharePointLibrarySchemas = [
      createDefaultSharePointLibrary({
        id: "library-documents",
        displayName: "Documents",
        purpose: "Documents.",
        fileTypes: "PDF",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];
    project.powerPlatform!.canvas!.sharePointColumnSchemas.push(createDefaultSharePointColumn({
      id: "field-document-title",
      parentType: "library",
      parentId: "library-documents",
      displayName: "Title",
      internalName: "Title",
      columnType: "Single line of text",
      requiredStatus: "required",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }));
    expect(validateCanvasFormOperationTargets(project).eligibilityStatus).toBe("Valid");
  });

  it("keeps Dataverse table schemas limited to active Dataverse connectors", () => {
    const project = createCanvasProject([target({
      sourceEntityId: "table-request",
      requiredFieldIds: []
    })]);
    project.powerPlatform!.canvas!.dataverseTableSchemas = [
      createDefaultDataverseTable({
        id: "table-request",
        displayName: "Request",
        logicalName: "rp_request",
        schemaName: "rp_Request",
        ownershipType: "User or Team",
        primaryNameColumn: "rp_name",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];
    expect(expectBlocked(project)).toContain("no active compatible connector");
  });

  it("blocks entity validation when no compatible active connector exists", () => {
    const project = createCanvasProject([target({ sourceConnectorId: "connector-api" })]);
    project.powerPlatform!.common.connectors = [
      createDefaultConnector({
        id: "connector-api",
        displayName: "API",
        dataSourceName: "API",
        dataSourceType: "externalApi",
        canvasRole: "primary",
        classificationConfirmationStatus: "confirmed",
        licensingConfirmationStatus: "confirmed",
        approvalConfirmationStatus: "confirmed",
        connectionOwnershipStatus: "confirmed",
        permissionConfirmationStatus: "confirmed",
        supportedOperations: { read: true, create: true, update: true }
      })
    ];
    project.powerPlatform!.canvas!.primaryDataSourceType = "externalApi";
    project.powerPlatform!.canvas!.primaryConnectorId = "connector-api";
    project.powerPlatform!.canvas!.secondaryConnectorIds = [];
    const result = validateCanvasFormOperationTargets(project);
    expect(result.eligibilityStatus).toBe("Blocked");
    expect(result.blockingIssues.join(" ")).toContain("no active compatible connector");
    expect(result.missingDecisions.join(" ")).toContain("Confirm active connector ownership");
  });

  it("permits implicit entity ownership when exactly one compatible active connector exists regardless of connector array order", () => {
    const project = createCanvasProject();
    project.powerPlatform!.common.connectors.reverse();
    expect(validateCanvasFormOperationTargets(project).eligibilityStatus).toBe("Valid");
  });

  it("blocks ambiguous implicit entity ownership when multiple active compatible connectors exist", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "microsoftList"];
    project.powerPlatform!.common.connectors[1].dataSourceType = "microsoftList";
    const result = validateCanvasFormOperationTargets(project);
    expect(result.eligibilityStatus).toBe("Blocked");
    expect(result.blockingIssues.join(" ")).toContain("ambiguous connector ownership");
    expect(result.missingDecisions.join(" ")).toContain("Confirm the connector owner");
  });

  it("blocks duplicate, unknown, stale, unsafe, and other-entity required field references", () => {
    expect(expectBlocked(createCanvasProject([target({ requiredFieldIds: ["field-title", "field-title"] })]))).toContain("duplicate required field ID");
    expect(expectBlocked(createCanvasProject([target({ requiredFieldIds: ["missing-field"] })]))).toContain("unknown or stale required field");
    expect(expectBlocked(createCanvasProject([target({ requiredFieldIds: ["Patch(field)"] })]))).toContain("unsafe");
    expect(expectBlocked(createCanvasProject([target({ requiredFieldIds: ["field-other"] })]))).toContain("belongs to another entity");
  });

  it("passes valid required fields and allows empty required-field list only when schema confirms none are required", () => {
    expect(validateCanvasFormOperationTargets(createCanvasProject()).eligibilityStatus).toBe("Valid");
    const noRequiredProject = createCanvasProject([target({ requiredFieldIds: [] })]);
    noRequiredProject.powerPlatform!.canvas!.sharePointColumnSchemas[0].requiredStatus = "optional";
    expect(validateCanvasFormOperationTargets(noRequiredProject).eligibilityStatus).toBe("Valid");
    expect(expectBlocked(createCanvasProject([target({ requiredFieldIds: [] })]))).toContain("missing required field reference");
  });

  it("blocks unconfirmed fields and incomplete required-status classifications before accepting empty required fields", () => {
    const unconfirmed = createCanvasProject([target({ requiredFieldIds: [] })]);
    unconfirmed.powerPlatform!.canvas!.sharePointColumnSchemas[0].requiredStatus = "optional";
    unconfirmed.powerPlatform!.canvas!.sharePointColumnSchemas[0].confirmationStatus = "reviewNeeded";
    expect(expectBlocked(unconfirmed)).toContain("required-field completeness cannot be established");

    const blank = createCanvasProject([target({ requiredFieldIds: [] })]);
    blank.powerPlatform!.canvas!.sharePointColumnSchemas[0].requiredStatus = "";
    expect(expectBlocked(blank)).toContain("unknown required-status classification");

    const unknown = createCanvasProject([target({ requiredFieldIds: [] })]);
    unknown.powerPlatform!.canvas!.sharePointColumnSchemas[0].requiredStatus = "maybe";
    expect(expectBlocked(unknown)).toContain("unknown required-status classification");
  });

  it.each(["required", "mandatory", "yes", "true", "business required", "system required"])("enforces recognized required status %s", (requiredStatus) => {
    const project = createCanvasProject([target({ requiredFieldIds: [] })]);
    project.powerPlatform!.canvas!.sharePointColumnSchemas[0].requiredStatus = requiredStatus;
    expect(expectBlocked(project)).toContain("missing required field reference field-title");
  });

  it.each(["optional", "not required", "no", "false"])("accepts recognized optional status %s", (requiredStatus) => {
    const project = createCanvasProject([target({ requiredFieldIds: [] })]);
    project.powerPlatform!.canvas!.sharePointColumnSchemas[0].requiredStatus = requiredStatus;
    expect(validateCanvasFormOperationTargets(project).eligibilityStatus).toBe("Valid");
  });

  it("validates mixed confirmed required and optional fields", () => {
    const project = createCanvasProject([target({ requiredFieldIds: ["field-title"] })]);
    project.powerPlatform!.canvas!.sharePointColumnSchemas[0].requiredStatus = "business required";
    project.powerPlatform!.canvas!.sharePointColumnSchemas[1].requiredStatus = "not required";
    expect(validateCanvasFormOperationTargets(project).eligibilityStatus).toBe("Valid");
  });

  it("blocks empty field schemas because no confirmed zero-field decision exists", () => {
    const project = createCanvasProject([target({ requiredFieldIds: [] })]);
    project.powerPlatform!.canvas!.sharePointColumnSchemas = project.powerPlatform!.canvas!.sharePointColumnSchemas.filter((field) => field.parentId !== "list-requests");
    const result = validateCanvasFormOperationTargets(project);
    expect(result.eligibilityStatus).toBe("Blocked");
    expect(result.blockingIssues.join(" ")).toContain("cannot determine required fields");
    expect(result.missingDecisions.join(" ")).toContain("Confirm field schema");
  });

  it("validates Dataverse and connector-resource field requiredness with the same conservative classification", () => {
    const dataverse = createCanvasProject([target({
      sourceConnectorId: "connector-dataverse",
      sourceEntityId: "table-request",
      requiredFieldIds: ["column-name"]
    })]);
    dataverse.powerPlatform!.common.connectors = [
      createDefaultConnector({
        id: "connector-dataverse",
        displayName: "Dataverse",
        dataSourceName: "Dataverse",
        dataSourceType: "dataverse",
        canvasRole: "primary",
        classificationConfirmationStatus: "confirmed",
        licensingConfirmationStatus: "confirmed",
        approvalConfirmationStatus: "confirmed",
        connectionOwnershipStatus: "confirmed",
        permissionConfirmationStatus: "confirmed",
        supportedOperations: { read: true, create: true, update: true }
      })
    ];
    dataverse.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    dataverse.powerPlatform!.canvas!.primaryConnectorId = "connector-dataverse";
    dataverse.powerPlatform!.canvas!.secondaryConnectorIds = [];
    dataverse.powerPlatform!.canvas!.dataverseTableSchemas = [
      createDefaultDataverseTable({
        id: "table-request",
        displayName: "Request",
        logicalName: "rp_request",
        schemaName: "rp_Request",
        ownershipType: "User or Team",
        primaryNameColumn: "rp_name",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];
    dataverse.powerPlatform!.canvas!.dataverseColumnSchemas = [
      createDefaultDataverseColumn({
        id: "column-name",
        tableId: "table-request",
        displayName: "Name",
        logicalName: "rp_name",
        schemaName: "rp_Name",
        dataType: "Text",
        requiredLevel: "System Required",
        confirmationStatus: "confirmed",
        confirmationSource: "Architect"
      })
    ];
    expect(validateCanvasFormOperationTargets(dataverse).eligibilityStatus).toBe("Valid");

    const api = createCanvasProject();
    addActiveApiResource(api);
    expect(validateCanvasFormOperationTargets(api).eligibilityStatus).toBe("Valid");
  });

  it("blocks malformed raw target input instead of returning Not Applicable", () => {
    const project = createCanvasProject([]);
    expect(expectBlocked(project, "bad")).toContain("must be an array");
    expect(expectBlocked(project, [1])).toContain("must be an object");
    expect(expectBlocked(project, [{ id: "partial-target" }])).toContain("incomplete");
    expect(expectBlocked(project, [{ operation: "create" }])).toContain("incomplete");
    expect(expectBlocked(project, [{ ...target(), requiredFieldIds: "field-title" }])).toContain("requiredFieldIds must be an array");
    expect(expectBlocked(project, [{ ...target(), requiredFieldIds: ["field-title", " "] }])).toContain("empty or malformed required-field entry");
    expect(validateCanvasFormOperationTargets(project, []).eligibilityStatus).toBe("Not Applicable");
    expect(validateCanvasFormOperationTargets(project, undefined).eligibilityStatus).toBe("Not Applicable");
  });

  it("blocks duplicate submit controls and duplicate same-operation form targets", () => {
    expect(expectBlocked(createCanvasProject([target({ id: "one", sortOrder: 10 }), target({ id: "two", formControlId: "form-request", submitControlId: "button-submit-create", sortOrder: 20 })]))).toContain("Submit control");
    expect(expectBlocked(createCanvasProject([target({ id: "one", sortOrder: 10 }), target({ id: "two", formControlId: "form-request", submitControlId: "button-submit-edit", sortOrder: 20 })]))).toContain("duplicate create");
    expect(expectBlocked(createCanvasProject([target({ id: "one", operation: "edit", submitControlId: "button-submit-edit", sortOrder: 10 }), target({ id: "two", operation: "edit", submitControlId: "button-submit-create", sortOrder: 20 })]))).toContain("duplicate edit");
  });

  it("permits one create and one edit target for the same form when submit controls differ", () => {
    const project = createCanvasProject([
      target({ id: "create-one", operation: "create", submitControlId: "button-submit-create", sortOrder: 10 }),
      target({ id: "edit-one", operation: "edit", submitControlId: "button-submit-edit", sortOrder: 20 })
    ]);
    expect(validateCanvasFormOperationTargets(project).eligibilityStatus).toBe("Valid");
  });

  it("handles non-Canvas projects safely", () => {
    const project = createProject({ intake: { appType: "businessWebsite" } as any });
    expect(validateCanvasFormOperationTargets(project).eligibilityStatus).toBe("Not Applicable");
  });

  it("does not mutate project, target arrays, or required-field arrays", () => {
    const project = createCanvasProject();
    const before = clone(project);
    const targetArray = project.powerPlatform!.canvas!.formOperationTargets;
    const requiredFields = targetArray[0].requiredFieldIds;
    validateCanvasFormOperationTargets(project);
    expect(project).toEqual(before);
    expect(project.powerPlatform!.canvas!.formOperationTargets).toBe(targetArray);
    expect(project.powerPlatform!.canvas!.formOperationTargets[0].requiredFieldIds).toBe(requiredFields);
  });

  it("creates only the canonical planning asset and does not generate Power Fx", () => {
    const withoutFormTargets = buildImplementationAssetRegistry(createCanvasProject([])).assets.map((asset) => asset.assetId).sort();
    const withFormTargets = buildImplementationAssetRegistry(createCanvasProject()).assets.map((asset) => asset.assetId).sort();
    expect(withFormTargets).toEqual([...withoutFormTargets, CANVAS_FORM_OPERATIONS_ASSET_ID].sort());
    const resultText = JSON.stringify(validateCanvasFormOperationTargets(createCanvasProject()));
    expect(resultText).not.toContain("SubmitForm(");
    expect(resultText).not.toContain("NewForm(");
    expect(resultText).not.toContain("EditForm(");
    expect(resultText).not.toContain("Patch(");
  });
});
