import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import {
  normalizeCanvasRecordLifecycleTargets,
  orderCanvasRecordLifecycleTargets,
  validateCanvasRecordLifecycleTargets
} from "../lib/recordLifecycleTargets";
import * as recordLifecycleTargetsModule from "../lib/recordLifecycleTargets";
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
import type {
  CanvasControlTarget,
  CanvasRecordLifecycleTarget,
  CanvasStateVariableTarget,
  ProjectRecord
} from "../types/project";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function softDeleteTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "soft-delete-request",
    action: "delete",
    triggerControlId: "button-delete",
    archiveStrategy: "notApplicable",
    lifecycleFieldId: "field-archived",
    archiveValue: "true",
    restoreValue: "",
    deleteStrategy: "softDeleteOnly",
    destructiveActionConfirmed: false,
    sortOrder: 30,
    ...overrides
  });
}

function permanentDeleteTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "permanent-delete-request",
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
      appPurpose: "Model record lifecycle actions.",
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
      displayName: "Other",
      dataSourceName: "Other",
      dataSourceType: "dataverse",
      canvasRole: "secondary",
      classificationConfirmationStatus: "confirmed",
      licensingConfirmationStatus: "confirmed",
      approvalConfirmationStatus: "confirmed",
      connectionOwnershipStatus: "confirmed",
      permissionConfirmationStatus: "confirmed",
      supportedOperations: { read: true, update: true }
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
    control("button-other", "btnOther", "button", "screen-other"),
    control("button-submit", "btnSubmit", "button"),
    control("button-mode", "btnMode", "button"),
    control("gallery-requests", "galRequests", "gallery"),
    control("table-requests", "tblRequests", "data table"),
    control("form-request", "frmRequest", "edit form"),
    control("icon-archive", "icoArchive", "icon"),
    control("label-archive", "lblArchive", "label")
  ];
  canvas.stateVariableTargets = [{
    id: "state-selected-record",
    implementationName: "varSelectedRecord",
    purpose: "Approved selected record reference.",
    initialValue: { kind: "blank" },
    confirmationStatus: "confirmed",
    required: true,
    sortOrder: 10
  } as CanvasStateVariableTarget];
  canvas.formOperationTargets = [{
    id: "form-op-create",
    operation: "create",
    screenId: "screen-request",
    formControlId: "form-request",
    submitControlId: "button-submit",
    sourceConnectorId: "connector-sharepoint",
    sourceEntityId: "list-requests",
    requiredFieldIds: ["field-title"],
    submissionTrigger: "controlOnSelect",
    confirmationStatus: "confirmed",
    required: true,
    sortOrder: 10
  }];
  canvas.formModeTargets = [{
    id: "form-mode-new",
    formOperationTargetId: "form-op-create",
    action: "new",
    triggerControlId: "button-mode",
    trigger: "controlOnSelect",
    editRecordContextStatus: "notRequired",
    confirmationStatus: "confirmed",
    required: true,
    sortOrder: 10
  }];
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
      id: "field-title",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Title",
      internalName: "Title",
      columnType: "Single line of text",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultSharePointColumn({
      id: "field-status",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Status",
      internalName: "Status",
      columnType: "Choice",
      choiceValues: "Active; Archived",
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
    })
  ];
  canvas.recordLifecycleTargets = targets;
  return project;
}

function confirmedConnector(id: string, dataSourceType: string, canvasRole: "primary" | "secondary" = "secondary") {
  return createDefaultConnector({
    id,
    displayName: id,
    dataSourceName: id,
    dataSourceType,
    canvasRole,
    classificationConfirmationStatus: "confirmed",
    licensingConfirmationStatus: "confirmed",
    approvalConfirmationStatus: "confirmed",
    connectionOwnershipStatus: "confirmed",
    permissionConfirmationStatus: "confirmed",
    supportedOperations: { read: true, update: true, delete: true, archive: true, restore: true }
  });
}

function addActiveSecondaryConnector(project: ProjectRecord, id: string, dataSourceType: string): void {
  project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
  project.powerPlatform!.common.connectors.push(confirmedConnector(id, dataSourceType));
  project.powerPlatform!.canvas!.secondaryConnectorIds.push(id);
  if (!project.powerPlatform!.canvas!.selectedDataSourceTypes.includes(dataSourceType as any)) {
    project.powerPlatform!.canvas!.selectedDataSourceTypes.push(dataSourceType as any);
  }
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
      id: "field-resource-deleted",
      connectorId: "connector-api",
      resourceId: "resource-ticket",
      displayName: "Deleted",
      fieldIdentifier: "deleted",
      fieldType: "Boolean",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
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

function rawLifecycleTarget(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...lifecycleTarget(), ...overrides };
}

function expectValid(project: ProjectRecord, input: unknown = project.powerPlatform?.canvas?.recordLifecycleTargets) {
  const result = validateCanvasRecordLifecycleTargets(project, input);
  expect(result.eligibilityStatus).toBe("Valid");
  expect(result.blockingIssues).toEqual([]);
  return result;
}

function expectBlocked(project: ProjectRecord, input: unknown = project.powerPlatform?.canvas?.recordLifecycleTargets): string {
  const result = validateCanvasRecordLifecycleTargets(project, input);
  expect(result.eligibilityStatus).toBe("Blocked");
  expect(result.blockingIssues.length).toBeGreaterThan(0);
  return result.blockingIssues.join(" ");
}

describe("Canvas record lifecycle action target model", () => {
  it("defaults new Canvas projects to an empty lifecycle target list", () => {
    const project = createProject({
      identity: { projectName: "Default Canvas" },
      intake: { appType: "powerAppsCanvas" } as any
    });
    expect(project.powerPlatform?.canvas?.recordLifecycleTargets).toEqual([]);
  });

  it("normalizes legacy missing storage safely", () => {
    const normalized = normalizePowerPlatformData({ canvas: {} }, "powerAppsCanvas");
    expect(normalized?.canvas?.recordLifecycleTargets).toEqual([]);
    const project = createCanvasProject();
    delete (project.powerPlatform!.canvas as unknown as { recordLifecycleTargets?: CanvasRecordLifecycleTarget[] }).recordLifecycleTargets;
    expect(validateCanvasRecordLifecycleTargets(project).eligibilityStatus).toBe("Not Applicable");
  });

  it("returns Not Applicable for empty storage", () => {
    const project = createCanvasProject([]);
    const result = validateCanvasRecordLifecycleTargets(project);
    expect(result).toMatchObject({ normalizedTargets: [], orderedTargets: [], blockingIssues: [], eligibilityStatus: "Not Applicable" });
  });

  it.each([
    ["non-array storage", "bad", "must be an array"],
    ["null target record", [null], "must be an object"],
    ["primitive target record", ["bad"], "must be an object"],
    ["partial target record", [{ id: "partial-lifecycle" }], "is incomplete"]
  ])("blocks raw malformed input: %s", (_label, input, expected) => {
    expect(expectBlocked(createCanvasProject(), input)).toContain(expected);
  });

  it("normalizes a valid archive target", () => {
    const target = normalizeCanvasRecordLifecycleTargets([rawLifecycleTarget({ id: " archive-request ", archiveValue: " Archived " })])[0];
    expect(target).toMatchObject({ id: "archive-request", action: "archive", archiveValue: "Archived" });
    expectValid(createCanvasProject([target]));
  });

  it("normalizes a valid restore target", () => {
    const project = createCanvasProject([restoreTarget()]);
    expectValid(project);
  });

  it("normalizes a valid soft-delete target", () => {
    expectValid(createCanvasProject([softDeleteTarget()]));
  });

  it("normalizes a valid permanent-delete target", () => {
    expectValid(createCanvasProject([permanentDeleteTarget()]));
  });

  it.each([
    ["unsupported action", { action: "Patch()" }, "unsupported action"],
    ["unsupported trigger", { trigger: "OnChange" }, "unsupported trigger"],
    ["empty target ID", { id: "" }, "ID is missing"],
    ["unsafe target ID", { id: "bad/id" }, "unsafe"],
    ["missing trigger control", { triggerControlId: "missing-button" }, "missing trigger control"],
    ["cross-screen trigger", { triggerControlId: "button-other" }, "not on screen"],
    ["unconfirmed trigger", {}, "unconfirmed trigger control"],
    ["non-button trigger", { triggerControlId: "icon-archive" }, "not a confirmed button"],
    ["submit trigger reuse", { triggerControlId: "button-submit" }, "form-submission"],
    ["form-mode trigger reuse", { triggerControlId: "button-mode" }, "form-mode"],
    ["missing screen", { screenTargetId: "missing-screen" }, "missing screen"],
    ["missing connector", { connectorId: "missing-connector" }, "missing connector"],
    ["missing entity", { entityId: "missing-list" }, "missing or unsupported entity"],
    ["wrong connector entity", { connectorId: "connector-other" }, "missing or unsupported entity"]
  ])("blocks target structure issue: %s", (_label, overrides, expected) => {
    const project = createCanvasProject([lifecycleTarget(overrides as Partial<CanvasRecordLifecycleTarget>)]);
    if (_label === "unconfirmed trigger") {
      project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "button-archive")!.confirmationStatus = "reviewNeeded";
    }
    expect(expectBlocked(project)).toContain(expected);
  });

  it("requires selectedRecord to reference a current same-screen gallery or data table", () => {
    expectValid(createCanvasProject([lifecycleTarget({ recordContextReferenceId: "table-requests" })]));
    expect(expectBlocked(createCanvasProject([lifecycleTarget({ recordContextReferenceId: "form-request" })]))).toContain("gallery or data-table");
  });

  it("requires formItem to reference a current same-screen form", () => {
    expectValid(createCanvasProject([lifecycleTarget({ recordContextType: "formItem", recordContextReferenceId: "form-request" })]));
    expect(expectBlocked(createCanvasProject([lifecycleTarget({ recordContextType: "formItem", recordContextReferenceId: "gallery-requests" })]))).toContain("form control");
  });

  it("requires explicitRecordVariable to reference an approved state-variable target", () => {
    expectValid(createCanvasProject([lifecycleTarget({ recordContextType: "explicitRecordVariable", recordContextReferenceId: "state-selected-record" })]));
    expect(expectBlocked(createCanvasProject([lifecycleTarget({ recordContextType: "explicitRecordVariable", recordContextReferenceId: "missing-state" })]))).toContain("missing state variable");
  });

  it("blocks missingDecision record context for required targets", () => {
    expect(expectBlocked(createCanvasProject([lifecycleTarget({ recordContextType: "missingDecision", recordContextReferenceId: "" })]))).toContain("record-context decision");
  });

  it.each([
    ["archive notApplicable", lifecycleTarget({ archiveStrategy: "notApplicable" }), "applicable archive strategy"],
    ["restore notApplicable", restoreTarget({ archiveStrategy: "notApplicable" }), "applicable archive strategy"],
    ["statusField incompatible field", lifecycleTarget({ lifecycleFieldId: "field-active" }), "statusField strategy"],
    ["statusField missing archive value", lifecycleTarget({ archiveValue: "" }), "archive value"],
    ["statusField missing restore value", lifecycleTarget({ restoreValue: "" }), "restore value"],
    ["statusField same values", lifecycleTarget({ archiveValue: "Archived", restoreValue: "Archived" }), "must differ"],
    ["activeFlag incompatible field", lifecycleTarget({ archiveStrategy: "activeFlag", lifecycleFieldId: "field-status", archiveValue: "false", restoreValue: "true" }), "Boolean-compatible"],
    ["activeFlag wrong values", lifecycleTarget({ archiveStrategy: "activeFlag", lifecycleFieldId: "field-active", archiveValue: "true", restoreValue: "false" }), "false and restoreValue true"],
    ["archivedFlag incompatible field", lifecycleTarget({ archiveStrategy: "archivedFlag", lifecycleFieldId: "field-status", archiveValue: "true", restoreValue: "false" }), "Boolean-compatible"],
    ["archivedFlag wrong values", lifecycleTarget({ archiveStrategy: "archivedFlag", lifecycleFieldId: "field-archived", archiveValue: "false", restoreValue: "true" }), "true and restoreValue false"],
    ["softDeleteFlag incompatible field", lifecycleTarget({ archiveStrategy: "softDeleteFlag", lifecycleFieldId: "field-status", archiveValue: "true", restoreValue: "false" }), "Boolean-compatible"]
  ])("validates archive and restore strategy: %s", (_label, target, expected) => {
    expect(expectBlocked(createCanvasProject([target]))).toContain(expected);
  });

  it.each([
    ["soft delete missing lifecycle field", softDeleteTarget({ lifecycleFieldId: "" }), "explicit lifecycle field"],
    ["soft delete bad value", softDeleteTarget({ archiveValue: "Deleted" }), "Boolean delete-active value"],
    ["soft delete statusField strategy", softDeleteTarget({ archiveStrategy: "statusField" }), "archiveStrategy notApplicable"],
    ["soft delete activeFlag strategy", softDeleteTarget({ archiveStrategy: "activeFlag" }), "archiveStrategy notApplicable"],
    ["soft delete archivedFlag strategy", softDeleteTarget({ archiveStrategy: "archivedFlag" }), "archiveStrategy notApplicable"],
    ["soft delete softDeleteFlag strategy", softDeleteTarget({ archiveStrategy: "softDeleteFlag" }), "archiveStrategy notApplicable"],
    ["permanent delete missing approval", permanentDeleteTarget({ destructiveActionConfirmed: false }), "destructiveActionConfirmed true"],
    ["permanent delete strategy mismatch", permanentDeleteTarget({ archiveStrategy: "activeFlag" }), "archiveStrategy notApplicable"],
    ["permanent delete unconfirmed", permanentDeleteTarget({ confirmationStatus: "reviewNeeded" }), "confirmed status"],
    ["delete missingDecision", softDeleteTarget({ deleteStrategy: "missingDecision" }), "approved delete strategy"],
    ["delete missingDecision strategy mismatch", softDeleteTarget({ deleteStrategy: "missingDecision", archiveStrategy: "softDeleteFlag" }), "archiveStrategy notApplicable"]
  ])("validates delete strategy: %s", (_label, target, expected) => {
    expect(expectBlocked(createCanvasProject([target]))).toContain(expected);
  });

  it("blocks permanent delete when the connector does not explicitly permit delete", () => {
    const project = createCanvasProject([permanentDeleteTarget()]);
    project.powerPlatform!.common.connectors.find((connector) => connector.id === "connector-sharepoint")!.supportedOperations.delete = false;
    expect(expectBlocked(project)).toContain("not explicitly permitted");
  });

  it("passes matching archive and restore pairs", () => {
    expectValid(createCanvasProject([lifecycleTarget(), restoreTarget()]));
  });

  it.each([
    ["mismatched field", restoreTarget({ lifecycleFieldId: "field-active", archiveStrategy: "activeFlag", archiveValue: "false", restoreValue: "true" }), "same lifecycle field"],
    ["mismatched strategy", restoreTarget({ archiveStrategy: "activeFlag", lifecycleFieldId: "field-active", archiveValue: "false", restoreValue: "true" }), "same archive strategy"],
    ["mismatched values", restoreTarget({ archiveValue: "Closed" }), "complementary values"],
    ["same trigger", restoreTarget({ triggerControlId: "button-archive" }), "distinct trigger controls"]
  ])("blocks inconsistent archive/restore pair: %s", (_label, restore, expected) => {
    expect(expectBlocked(createCanvasProject([lifecycleTarget(), restore]))).toContain(expected);
  });

  it.each([
    ["duplicate IDs", [lifecycleTarget(), lifecycleTarget({ triggerControlId: "button-restore" })], "Duplicate lifecycle target ID"],
    ["duplicate sort orders", [lifecycleTarget(), restoreTarget({ sortOrder: 10 })], "Duplicate lifecycle target sort order"],
    ["reused trigger controls", [lifecycleTarget(), restoreTarget({ triggerControlId: "button-archive" })], "used by multiple"],
    ["duplicate archive targets", [lifecycleTarget(), lifecycleTarget({ id: "archive-2", triggerControlId: "button-restore" })], "Duplicate lifecycle archive targets"],
    ["duplicate restore targets", [restoreTarget(), restoreTarget({ id: "restore-2", triggerControlId: "button-archive" })], "Duplicate lifecycle restore targets"],
    ["duplicate delete targets", [softDeleteTarget(), softDeleteTarget({ id: "delete-2", triggerControlId: "button-restore" })], "Duplicate lifecycle delete targets"],
    ["conflicting strategies", [lifecycleTarget(), restoreTarget({ archiveStrategy: "activeFlag", lifecycleFieldId: "field-active", archiveValue: "false", restoreValue: "true" })], "Conflicting archive strategies"]
  ])("detects duplicates and conflicts: %s", (_label, targets, expected) => {
    expect(expectBlocked(createCanvasProject(targets))).toContain(expected);
  });

  it("orders deterministically by sortOrder then ID", () => {
    const ordered = orderCanvasRecordLifecycleTargets([
      restoreTarget({ id: "target-b", sortOrder: 20 }),
      lifecycleTarget({ id: "target-c", sortOrder: 10 }),
      softDeleteTarget({ id: "target-a", sortOrder: 10 })
    ]);
    expect(ordered.map((target) => target.id)).toEqual(["target-a", "target-c", "target-b"]);
  });

  it("input order does not change ordered validation output", () => {
    const one = validateCanvasRecordLifecycleTargets(createCanvasProject([
      softDeleteTarget({ sortOrder: 30 }),
      lifecycleTarget({ sortOrder: 10 }),
      restoreTarget({ sortOrder: 20 })
    ]));
    const two = validateCanvasRecordLifecycleTargets(createCanvasProject([
      restoreTarget({ sortOrder: 20 }),
      lifecycleTarget({ sortOrder: 10 }),
      softDeleteTarget({ sortOrder: 30 })
    ]));
    expect(one.orderedTargets.map((target) => target.id)).toEqual(two.orderedTargets.map((target) => target.id));
  });

  it("does not let meaningful malformed data become Not Applicable", () => {
    expect(validateCanvasRecordLifecycleTargets(createCanvasProject(), [{ action: "Remove()" }]).eligibilityStatus).toBe("Blocked");
  });

  it.each([
    ["null controlTargets", "controlTargets", null, "powerPlatform.canvas.controlTargets must be an array"],
    ["primitive controlTargets", "controlTargets", "bad", "powerPlatform.canvas.controlTargets must be an array"],
    ["object controlTargets", "controlTargets", {}, "powerPlatform.canvas.controlTargets must be an array"],
    ["null screenTargets", "screenTargets", null, "powerPlatform.canvas.screenTargets must be an array"],
    ["null stateVariableTargets", "stateVariableTargets", null, "powerPlatform.canvas.stateVariableTargets must be an array"],
    ["null formOperationTargets", "formOperationTargets", null, "powerPlatform.canvas.formOperationTargets must be an array"],
    ["primitive formOperationTargets", "formOperationTargets", "bad", "powerPlatform.canvas.formOperationTargets must be an array"],
    ["null formModeTargets", "formModeTargets", null, "powerPlatform.canvas.formModeTargets must be an array"],
    ["primitive formModeTargets", "formModeTargets", "bad", "powerPlatform.canvas.formModeTargets must be an array"],
    ["null entity schema collection", "sharePointListSchemas", null, "powerPlatform.canvas.sharePointListSchemas must be an array"],
    ["null field schema collection", "sharePointColumnSchemas", null, "powerPlatform.canvas.sharePointColumnSchemas must be an array"]
  ])("blocks malformed current Canvas collection shapes without throwing: %s", (_label, property, value, expected) => {
    const project = createCanvasProject();
    (project.powerPlatform!.canvas as unknown as Record<string, unknown>)[property] = value;
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain(expected);
  });

  it("blocks malformed current connector collection shapes without throwing", () => {
    const project = createCanvasProject();
    (project.powerPlatform!.common as unknown as Record<string, unknown>).connectors = null;
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain("powerPlatform.common.connectors must be an array");
  });

  it.each([
    ["null control entry", "controlTargets", [null], "powerPlatform.canvas.controlTargets record 1 must be an object"],
    ["primitive control entry", "controlTargets", ["bad"], "powerPlatform.canvas.controlTargets record 1 must be an object"],
    ["partial trigger-control record", "controlTargets", [{ id: "button-archive" }], "powerPlatform.canvas.controlTargets record 1 is malformed"],
    ["null screen entry", "screenTargets", [null], "powerPlatform.canvas.screenTargets record 1 must be an object"],
    ["malformed state-variable record", "stateVariableTargets", [{ id: "state-selected-record" }], "powerPlatform.canvas.stateVariableTargets record 1 is malformed"],
    ["malformed form-operation record", "formOperationTargets", [{ id: "form-op-create" }], "powerPlatform.canvas.formOperationTargets record 1 is malformed"],
    ["malformed form-mode record", "formModeTargets", [{ id: "form-mode-new" }], "powerPlatform.canvas.formModeTargets record 1 is malformed"],
    ["malformed entity record", "sharePointListSchemas", [{ id: "list-requests" }], "powerPlatform.canvas.sharePointListSchemas record 1 is malformed"],
    ["malformed field record", "sharePointColumnSchemas", [{ id: "field-status" }], "powerPlatform.canvas.sharePointColumnSchemas record 1 is malformed"]
  ])("blocks malformed current records safely: %s", (_label, property, value, expected) => {
    const project = createCanvasProject();
    (project.powerPlatform!.canvas as unknown as Record<string, unknown>)[property] = value;
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain(expected);
  });

  it("blocks malformed connector records safely", () => {
    const project = createCanvasProject();
    (project.powerPlatform!.common as unknown as Record<string, unknown>).connectors = [{ id: "connector-sharepoint" }];
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain("powerPlatform.common.connectors record 1 is malformed");
  });

  it("does not treat malformed ownership collections as valid empty ownership sets", () => {
    const project = createCanvasProject([lifecycleTarget({ triggerControlId: "button-submit" })]);
    (project.powerPlatform!.canvas as unknown as Record<string, unknown>).formOperationTargets = null;
    const issues = expectBlocked(project);
    expect(issues).toContain("powerPlatform.canvas.formOperationTargets must be an array");
    expect(issues).not.toContain("Valid");
  });

  it("permits valid empty ownership collections", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.formOperationTargets = [];
    project.powerPlatform!.canvas!.formModeTargets = [];
    expectValid(project);
  });

  it.each([
    ["missing submitControlId", {}, "powerPlatform.canvas.formOperationTargets record 1 is malformed"],
    ["undefined submitControlId", { submitControlId: undefined }, "powerPlatform.canvas.formOperationTargets record 1 is malformed"],
    ["null submitControlId", { submitControlId: null }, "powerPlatform.canvas.formOperationTargets record 1 is malformed"],
    ["numeric submitControlId", { submitControlId: 42 }, "powerPlatform.canvas.formOperationTargets record 1 is malformed"],
    ["object submitControlId", { submitControlId: { id: "button-submit" } }, "powerPlatform.canvas.formOperationTargets record 1 is malformed"],
    ["blank submitControlId", { submitControlId: " " }, "powerPlatform.canvas.formOperationTargets record 1 is malformed"],
    ["formula-looking submitControlId", { submitControlId: "Patch(Data)" }, "powerPlatform.canvas.formOperationTargets record 1 is malformed"]
  ])("blocks malformed form-operation ownership IDs: %s", (_label, overrides, expected) => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.formOperationTargets = [{ id: "form-op-create", ...overrides } as any];
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    const issues = expectBlocked(project);
    expect(issues).toContain(expected);
    expect(issues).not.toContain("form-submission OnSelect responsibility");
  });

  it.each([
    ["missing triggerControlId", {}, "powerPlatform.canvas.formModeTargets record 1 is malformed"],
    ["undefined triggerControlId", { triggerControlId: undefined }, "powerPlatform.canvas.formModeTargets record 1 is malformed"],
    ["null triggerControlId", { triggerControlId: null }, "powerPlatform.canvas.formModeTargets record 1 is malformed"],
    ["numeric triggerControlId", { triggerControlId: 42 }, "powerPlatform.canvas.formModeTargets record 1 is malformed"],
    ["object triggerControlId", { triggerControlId: { id: "button-mode" } }, "powerPlatform.canvas.formModeTargets record 1 is malformed"],
    ["blank triggerControlId", { triggerControlId: " " }, "powerPlatform.canvas.formModeTargets record 1 is malformed"],
    ["formula-looking triggerControlId", { triggerControlId: "Navigate(Screen)" }, "powerPlatform.canvas.formModeTargets record 1 is malformed"]
  ])("blocks malformed form-mode ownership IDs: %s", (_label, overrides, expected) => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.formModeTargets = [{ id: "form-mode-new", ...overrides } as any];
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    const issues = expectBlocked(project);
    expect(issues).toContain(expected);
    expect(issues).not.toContain("form-mode OnSelect responsibility");
  });

  it("keeps valid ownership records valid", () => {
    expectValid(createCanvasProject());
  });

  it.each([
    ["null secondaryConnectorIds", null, "powerPlatform.canvas.secondaryConnectorIds must be an array"],
    ["primitive secondaryConnectorIds", 42, "powerPlatform.canvas.secondaryConnectorIds must be an array"],
    ["string secondaryConnectorIds", "connector-other", "powerPlatform.canvas.secondaryConnectorIds must be an array"],
    ["object secondaryConnectorIds", {}, "powerPlatform.canvas.secondaryConnectorIds must be an array"]
  ])("blocks malformed secondaryConnectorIds collection without throwing: %s", (_label, value, expected) => {
    const project = createCanvasProject();
    (project.powerPlatform!.canvas as unknown as Record<string, unknown>).secondaryConnectorIds = value;
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain(expected);
  });

  it.each([
    ["null secondary connector entry", [null], "powerPlatform.canvas.secondaryConnectorIds record 1 must be a safe string ID"],
    ["numeric secondary connector entry", [42], "powerPlatform.canvas.secondaryConnectorIds record 1 must be a safe string ID"],
    ["object secondary connector entry", [{ id: "connector-other" }], "powerPlatform.canvas.secondaryConnectorIds record 1 must be a safe string ID"],
    ["blank secondary connector entry", [" "], "powerPlatform.canvas.secondaryConnectorIds record 1 must be a safe string ID"],
    ["formula-looking secondary connector entry", ["Patch(Data)"], "powerPlatform.canvas.secondaryConnectorIds record 1 must be a safe string ID"]
  ])("blocks malformed secondaryConnectorIds entries: %s", (_label, value, expected) => {
    const project = createCanvasProject();
    (project.powerPlatform!.canvas as unknown as Record<string, unknown>).secondaryConnectorIds = value;
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain(expected);
  });

  it("permits a valid empty secondaryConnectorIds array", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.secondaryConnectorIds = [];
    expectValid(project);
  });

  it.each([
    ["null selectedDataSourceTypes", null, "powerPlatform.canvas.selectedDataSourceTypes must be an array"],
    ["primitive selectedDataSourceTypes", 42, "powerPlatform.canvas.selectedDataSourceTypes must be an array"],
    ["string selectedDataSourceTypes", "sharePointList", "powerPlatform.canvas.selectedDataSourceTypes must be an array"],
    ["object selectedDataSourceTypes", {}, "powerPlatform.canvas.selectedDataSourceTypes must be an array"]
  ])("blocks malformed selectedDataSourceTypes collection without throwing: %s", (_label, value, expected) => {
    const project = createCanvasProject();
    (project.powerPlatform!.canvas as unknown as Record<string, unknown>).selectedDataSourceTypes = value;
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain(expected);
  });

  it.each([
    ["null selected source entry", [null], "powerPlatform.canvas.selectedDataSourceTypes record 1 must be a supported string value"],
    ["numeric selected source entry", [42], "powerPlatform.canvas.selectedDataSourceTypes record 1 must be a supported string value"],
    ["object selected source entry", [{ type: "sharePointList" }], "powerPlatform.canvas.selectedDataSourceTypes record 1 must be a supported string value"],
    ["blank selected source entry", [" "], "powerPlatform.canvas.selectedDataSourceTypes record 1 must be a supported string value"],
    ["unsupported selected source entry", ["unknownBackend"], "powerPlatform.canvas.selectedDataSourceTypes record 1 is unsupported"],
    ["duplicate selected source entries", ["sharePointList", "sharePointList"], "powerPlatform.canvas.selectedDataSourceTypes record 2 is duplicated"]
  ])("blocks malformed selectedDataSourceTypes entries: %s", (_label, value, expected) => {
    const project = createCanvasProject();
    (project.powerPlatform!.canvas as unknown as Record<string, unknown>).selectedDataSourceTypes = value;
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain(expected);
  });

  it("blocks multiple-source mode with fewer than two valid selected source types", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList"];
    expect(expectBlocked(project)).toContain("at least two selected backend types");
  });

  it.each([
    ["missing primaryConnectorId", "", "powerPlatform.canvas.primaryConnectorId must be a safe string ID"],
    ["null primaryConnectorId", null, "powerPlatform.canvas.primaryConnectorId must be a safe string ID"],
    ["numeric primaryConnectorId", 42, "powerPlatform.canvas.primaryConnectorId must be a safe string ID"],
    ["object primaryConnectorId", { id: "connector-sharepoint" }, "powerPlatform.canvas.primaryConnectorId must be a safe string ID"],
    ["blank primaryConnectorId", " ", "powerPlatform.canvas.primaryConnectorId must be a safe string ID"],
    ["formula-looking primaryConnectorId", "LookUp(Connectors)", "powerPlatform.canvas.primaryConnectorId must be a safe string ID"]
  ])("blocks malformed primaryConnectorId: %s", (_label, value, expected) => {
    const project = createCanvasProject();
    (project.powerPlatform!.canvas as unknown as Record<string, unknown>).primaryConnectorId = value;
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain(expected);
  });

  it.each([
    ["null primaryDataSourceType", null, "powerPlatform.canvas.primaryDataSourceType is unsupported"],
    ["numeric primaryDataSourceType", 42, "powerPlatform.canvas.primaryDataSourceType is unsupported"],
    ["unknown primaryDataSourceType", "unknownBackend", "powerPlatform.canvas.primaryDataSourceType is unsupported"],
    ["formula-looking primaryDataSourceType", "Patch(Data)", "powerPlatform.canvas.primaryDataSourceType is unsupported"]
  ])("blocks malformed primaryDataSourceType: %s", (_label, value, expected) => {
    const project = createCanvasProject();
    (project.powerPlatform!.canvas as unknown as Record<string, unknown>).primaryDataSourceType = value;
    expect(() => validateCanvasRecordLifecycleTargets(project)).not.toThrow();
    expect(expectBlocked(project)).toContain(expected);
  });

  it("keeps connector reconciliation blockers visible", () => {
    const project = createCanvasProject();
    project.powerPlatform!.canvas!.primaryDataSourceType = "multiple";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["sharePointList", "externalApi"];
    project.powerPlatform!.canvas!.secondaryConnectorIds = [];
    expect(expectBlocked(project)).toContain("No active Canvas connector is assigned for selected backend externalApi.");
  });

  it("resolves one active compatible SharePoint connector as canonical owner", () => {
    expectValid(createCanvasProject([lifecycleTarget({ connectorId: "connector-sharepoint", entityId: "list-requests" })]));
  });

  it("blocks SharePoint ownership with zero active compatible connectors", () => {
    const project = createCanvasProject([lifecycleTarget({ connectorId: "connector-sharepoint", entityId: "list-requests" })]);
    project.powerPlatform!.canvas!.primaryDataSourceType = "dataverse";
    project.powerPlatform!.canvas!.selectedDataSourceTypes = ["dataverse"];
    project.powerPlatform!.canvas!.primaryConnectorId = "connector-other";
    project.powerPlatform!.canvas!.secondaryConnectorIds = [];
    expect(expectBlocked(project)).toContain("inactive or unresolved entity");
  });

  it("blocks ambiguous SharePoint connector ownership even when one compatible connector is named", () => {
    const project = createCanvasProject([lifecycleTarget({ connectorId: "connector-sharepoint", entityId: "list-requests" })]);
    addActiveSecondaryConnector(project, "connector-sharepoint-two", "sharePointList");
    expect(expectBlocked(project)).toContain("ambiguous connector ownership");
  });

  it("blocks a target connector that differs from the sole active SharePoint owner", () => {
    const project = createCanvasProject([lifecycleTarget({ connectorId: "connector-other", entityId: "list-requests" })]);
    expect(expectBlocked(project)).toContain("does not match canonical owner connector-sharepoint");
  });

  it("resolves one active compatible SharePoint-library connector as canonical owner", () => {
    const project = createCanvasProject([lifecycleTarget({
      entityId: "library-documents",
      lifecycleFieldId: "field-library-status"
    })]);
    addSharePointLibrary(project);
    expectValid(project);
  });

  it("blocks ambiguous SharePoint-library ownership", () => {
    const project = createCanvasProject([lifecycleTarget({
      entityId: "library-documents",
      lifecycleFieldId: "field-library-status"
    })]);
    addSharePointLibrary(project);
    addActiveSecondaryConnector(project, "connector-library-two", "sharePointLibrary");
    expect(expectBlocked(project)).toContain("ambiguous connector ownership");
  });

  it("resolves one active compatible Dataverse connector as canonical owner", () => {
    const project = createCanvasProject([lifecycleTarget({
      connectorId: "connector-other",
      entityId: "table-requests",
      lifecycleFieldId: "column-status"
    })]);
    addDataverseTable(project);
    expectValid(project);
  });

  it("blocks ambiguous Dataverse ownership", () => {
    const project = createCanvasProject([lifecycleTarget({
      connectorId: "connector-other",
      entityId: "table-requests",
      lifecycleFieldId: "column-status"
    })]);
    addDataverseTable(project);
    addActiveSecondaryConnector(project, "connector-dataverse-two", "dataverse");
    expect(expectBlocked(project)).toContain("ambiguous connector ownership");
  });

  it("requires connector-resource targets to match explicit stored connector owner", () => {
    const project = createCanvasProject([softDeleteTarget({
      connectorId: "connector-api",
      entityId: "resource-ticket",
      lifecycleFieldId: "field-resource-deleted"
    })]);
    addConnectorResource(project);
    expectValid(project);
  });

  it("blocks connector-resource target with different connector", () => {
    const project = createCanvasProject([softDeleteTarget({
      connectorId: "connector-sharepoint",
      entityId: "resource-ticket",
      lifecycleFieldId: "field-resource-deleted"
    })]);
    addConnectorResource(project);
    expect(expectBlocked(project)).toContain("does not match connector-resource owner connector-api");
  });

  it("blocks inactive connector-resource owner", () => {
    const project = createCanvasProject([softDeleteTarget({
      connectorId: "connector-api",
      entityId: "resource-ticket",
      lifecycleFieldId: "field-resource-deleted"
    })]);
    addConnectorResource(project);
    project.powerPlatform!.canvas!.secondaryConnectorIds = project.powerPlatform!.canvas!.secondaryConnectorIds.filter((id) => id !== "connector-api");
    project.powerPlatform!.canvas!.selectedDataSourceTypes = project.powerPlatform!.canvas!.selectedDataSourceTypes.filter((sourceType) => sourceType !== "customConnector");
    expect(expectBlocked(project)).toContain("inactive, missing, or incompatible connector-resource owner");
  });

  it("keeps missing and valid empty recordLifecycleTargets Not Applicable", () => {
    const project = createCanvasProject();
    delete (project.powerPlatform!.canvas as unknown as { recordLifecycleTargets?: CanvasRecordLifecycleTarget[] }).recordLifecycleTargets;
    expect(validateCanvasRecordLifecycleTargets(project).eligibilityStatus).toBe("Not Applicable");
    project.powerPlatform!.canvas!.recordLifecycleTargets = [];
    expect(validateCanvasRecordLifecycleTargets(project).eligibilityStatus).toBe("Not Applicable");
  });

  it("does not mutate project input, lifecycle arrays, screens, controls, connectors, entities, or fields", () => {
    const project = createCanvasProject([lifecycleTarget(), restoreTarget()]);
    const before = clone(project);
    validateCanvasRecordLifecycleTargets(project);
    expect(project).toEqual(before);
  });

  it("returns a controlled result shape", () => {
    const result = expectValid(createCanvasProject());
    expect(result.normalizedTargets).toHaveLength(1);
    expect(result.orderedTargets).toHaveLength(1);
    expect(result.missingDecisions).toEqual([]);
    expect(result.eligibilityStatus).toBe("Valid");
  });

  it("does not create implementation assets", () => {
    const project = createCanvasProject();
    validateCanvasRecordLifecycleTargets(project);
    expect((project as { implementationAssets?: unknown }).implementationAssets).toBeUndefined();
  });

  it("does not generate Power Fx or store record-selection expressions", () => {
    const result = expectValid(createCanvasProject());
    expect(JSON.stringify(result)).not.toMatch(/Patch|Remove|RemoveIf|UpdateIf|SubmitForm|ResetForm|Navigate|Notify|Refresh|Set\(|UpdateContext|Gallery\.Selected|Form\.Item/);
  });

  it("does not create .fx files, Canvas YAML, model-driven source, UI integration, export integration, or Phase 5B.4B planning", () => {
    expect(normalizeCanvasRecordLifecycleTargets([rawLifecycleTarget()])[0]).not.toHaveProperty("formula");
    expect(normalizeCanvasRecordLifecycleTargets([rawLifecycleTarget()])[0]).not.toHaveProperty("intendedPath");
    expect(normalizeCanvasRecordLifecycleTargets([rawLifecycleTarget()])[0]).not.toHaveProperty("yaml");
  });

  it("keeps later lifecycle generation absent", () => {
    expect(Object.keys(recordLifecycleTargetsModule).some((key) => /PowerFx|Planning|Asset|Formula|Generate/i.test(key))).toBe(false);
  });
});
