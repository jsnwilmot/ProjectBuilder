import { describe, expect, it } from "vitest";
import { createProject } from "../lib/createProject";
import {
  normalizeCanvasFormModeTargets,
  orderCanvasFormModeTargets,
  validateCanvasFormModeTargets
} from "../lib/formModeTargets";
import { buildImplementationAssetRegistry } from "../lib/implementationAssets";
import {
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultSharePointColumn,
  createDefaultSharePointList,
  normalizePowerPlatformData
} from "../lib/powerPlatform";
import type { CanvasControlTarget, CanvasFormModeTarget, CanvasFormOperationTarget, ProjectRecord } from "../types/project";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function formOperationTarget(overrides: Partial<CanvasFormOperationTarget> = {}): CanvasFormOperationTarget {
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

function formModeTarget(overrides: Partial<CanvasFormModeTarget> = {}): CanvasFormModeTarget {
  return {
    id: overrides.id ?? "mode-new-request",
    formOperationTargetId: overrides.formOperationTargetId ?? "form-op-create-request",
    action: overrides.action ?? "new",
    triggerControlId: overrides.triggerControlId ?? "button-new-mode",
    trigger: overrides.trigger ?? "controlOnSelect",
    editRecordContextStatus: overrides.editRecordContextStatus ?? "notRequired",
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function editOperationTarget(overrides: Partial<CanvasFormOperationTarget> = {}): CanvasFormOperationTarget {
  return formOperationTarget({
    id: "form-op-edit-request",
    operation: "edit",
    submitControlId: "button-submit-edit",
    sortOrder: 20,
    ...overrides
  });
}

function editModeTarget(overrides: Partial<CanvasFormModeTarget> = {}): CanvasFormModeTarget {
  return formModeTarget({
    id: "mode-edit-request",
    formOperationTargetId: "form-op-edit-request",
    action: "edit",
    triggerControlId: "button-edit-mode",
    editRecordContextStatus: "confirmedExistingItemBinding",
    sortOrder: 20,
    ...overrides
  });
}

function createCanvasProject(
  formModeTargets: CanvasFormModeTarget[] = [formModeTarget()],
  formOperationTargets: CanvasFormOperationTarget[] = [formOperationTarget()]
): ProjectRecord {
  const project = createProject({
    identity: { id: "form-mode-project", projectName: "Form Mode Project" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Model form-mode actions.",
      requiredFeatures: "Create and edit records.",
      workflows: "Start form modes.",
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
    })
  ];
  const canvas = pp.canvas!;
  canvas.primaryDataSourceType = "sharePointList";
  canvas.selectedDataSourceTypes = ["sharePointList"];
  canvas.primaryConnectorId = "connector-sharepoint";
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
      id: "button-new-mode",
      screenId: "screen-request",
      approvedControlName: "btnNewMode",
      controlType: "button",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultCanvasControlTarget({
      id: "button-edit-mode",
      screenId: "screen-request",
      approvedControlName: "btnEditMode",
      controlType: "button",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultCanvasControlTarget({
      id: "button-other-screen",
      screenId: "screen-other",
      approvedControlName: "btnOther",
      controlType: "button",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    }),
    createDefaultCanvasControlTarget({
      id: "icon-new-mode",
      screenId: "screen-request",
      approvedControlName: "icoNewMode",
      controlType: "icon",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.sharePointListSchemas = [
    createDefaultSharePointList({
      id: "list-requests",
      displayName: "Requests",
      purpose: "Track requests.",
      expectedRecordCount: "50",
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
    })
  ];
  canvas.formOperationTargets = formOperationTargets;
  canvas.formModeTargets = formModeTargets;
  return project;
}

function expectValid(project: ProjectRecord, input: unknown = project.powerPlatform?.canvas?.formModeTargets) {
  const result = validateCanvasFormModeTargets(project, input);
  expect(result.eligibilityStatus).toBe("Valid");
  expect(result.blockingIssues).toEqual([]);
  return result;
}

function expectBlocked(project: ProjectRecord, input: unknown = project.powerPlatform?.canvas?.formModeTargets): string {
  const result = validateCanvasFormModeTargets(project, input);
  expect(result.eligibilityStatus).toBe("Blocked");
  expect(result.blockingIssues.length).toBeGreaterThan(0);
  return result.blockingIssues.join(" ");
}

function rawModeTarget(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...formModeTarget(), ...overrides };
}

function triggerControl(project: ProjectRecord, id = "button-new-mode"): CanvasControlTarget {
  const control = project.powerPlatform!.canvas!.controlTargets.find((candidate) => candidate.id === id);
  if (!control) throw new Error(`Missing fixture control ${id}`);
  return control;
}

describe("Canvas form-mode action target model", () => {
  it("defaults new Canvas projects to an empty form-mode list", () => {
    const project = createProject({
      identity: { projectName: "Default Canvas" },
      intake: { appType: "powerAppsCanvas" } as any
    });
    expect(project.powerPlatform?.canvas?.formModeTargets).toEqual([]);
  });

  it("normalizes legacy missing storage safely", () => {
    const normalized = normalizePowerPlatformData({ canvas: {} }, "powerAppsCanvas");
    expect(normalized?.canvas?.formModeTargets).toEqual([]);
    const project = createCanvasProject();
    delete (project.powerPlatform!.canvas as unknown as { formModeTargets?: CanvasFormModeTarget[] }).formModeTargets;
    expect(validateCanvasFormModeTargets(project).eligibilityStatus).toBe("Not Applicable");
  });

  it("returns Not Applicable for empty storage", () => {
    const project = createCanvasProject([]);
    const result = validateCanvasFormModeTargets(project);
    expect(result).toMatchObject({ targets: [], orderedTargets: [], blockingIssues: [], eligibilityStatus: "Not Applicable" });
  });

  it.each([
    ["non-array storage", 42],
    ["primitive record", [42]],
    ["partial record", [{ id: "mode-partial", action: "new" }]]
  ])("blocks %s", (_label, input) => {
    expectBlocked(createCanvasProject(), input);
  });

  it.each([
    ["new", formModeTarget(), "form-op-create-request"],
    ["edit", editModeTarget(), "form-op-edit-request"]
  ] as const)("normalizes a valid %s-mode target", (_label, input, operationTargetId) => {
    const normalized = normalizeCanvasFormModeTargets([input]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].formOperationTargetId).toBe(operationTargetId);
  });

  it.each([
    ["distinct new-mode trigger", [formModeTarget()], [formOperationTarget()]],
    ["distinct edit-mode trigger", [editModeTarget()], [editOperationTarget()]],
    ["new and edit triggers distinct from every submit button", [formModeTarget(), editModeTarget()], [formOperationTarget(), editOperationTarget()]]
  ] as const)("keeps valid %s passing", (_label, modeTargets, operationTargets) => {
    expectValid(createCanvasProject([...modeTargets], [...operationTargets]));
  });

  it.each([
    ["unsupported action", [{ ...formModeTarget(), action: "open" }]],
    ["unsupported trigger", [{ ...formModeTarget(), trigger: "screenVisible" }]],
    ["empty target ID", [{ ...formModeTarget(), id: "" }]],
    ["unsafe target ID", [{ ...formModeTarget(), id: "mode/new" }]]
  ])("blocks %s", (_label, targets) => {
    expectBlocked(createCanvasProject(targets as CanvasFormModeTarget[]), targets);
  });

  it("blocks a missing form-operation target", () => {
    expectBlocked(createCanvasProject([formModeTarget({ formOperationTargetId: "missing-operation" })]));
  });

  it("blocks when the referenced form-operation target is blocked", () => {
    const project = createCanvasProject([formModeTarget()], [formOperationTarget({ confirmationStatus: "reviewNeeded" })]);
    expectBlocked(project);
  });

  it.each([
    ["create/new", [formModeTarget()], [formOperationTarget()], "Valid"],
    ["create/edit", [formModeTarget({ action: "edit", editRecordContextStatus: "confirmedExistingItemBinding" })], [formOperationTarget()], "Blocked"],
    ["edit/edit", [editModeTarget()], [editOperationTarget()], "Valid"],
    ["edit/new", [editModeTarget({ action: "new", editRecordContextStatus: "notRequired" })], [editOperationTarget()], "Blocked"]
  ] as const)("enforces operation/action mapping for %s", (_label, modeTargets, operationTargets, expected) => {
    const result = validateCanvasFormModeTargets(createCanvasProject([...modeTargets], [...operationTargets]));
    expect(result.eligibilityStatus).toBe(expected);
  });

  it.each([
    ["new action with required context", [formModeTarget({ editRecordContextStatus: "confirmedExistingItemBinding" })]],
    ["edit action with notRequired context", [editModeTarget({ editRecordContextStatus: "notRequired" })]],
    ["edit action with missing decision", [editModeTarget({ editRecordContextStatus: "missingDecision" })]]
  ])("blocks %s", (_label, modeTargets) => {
    const operationTargets = modeTargets[0].action === "edit" ? [editOperationTarget()] : [formOperationTarget()];
    expectBlocked(createCanvasProject(modeTargets, operationTargets));
  });

  it.each([
    ["referenced form operation submit button", formModeTarget({ triggerControlId: "button-submit-create" })],
    ["another form operation submit button", formModeTarget({ triggerControlId: "button-submit-edit" })],
    ["edit operation submit button", editModeTarget({ triggerControlId: "button-submit-edit" })]
  ])("blocks using the %s as a form-mode trigger", (_label, modeTarget) => {
    const issues = expectBlocked(createCanvasProject([modeTarget], [formOperationTarget(), editOperationTarget()]));
    expect(issues).toContain("already owns a form-submission OnSelect responsibility");
  });

  it.each([
    ["missing trigger control", [formModeTarget({ triggerControlId: "missing-control" })]],
    ["cross-screen trigger control", [formModeTarget({ triggerControlId: "button-other-screen" })]],
    ["unconfirmed trigger control", [formModeTarget({ triggerControlId: "button-new-mode" })], { confirmationStatus: "reviewNeeded" }],
    ["non-button trigger control", [formModeTarget({ triggerControlId: "form-request" })]],
    ["icon trigger control", [formModeTarget({ triggerControlId: "icon-new-mode" })]],
    ["invalid trigger implementation name", [formModeTarget({ triggerControlId: "button-new-mode" })], { approvedControlName: "btn-new()" }]
  ] as Array<[string, CanvasFormModeTarget[], Partial<CanvasControlTarget>?]>)("blocks %s", (_label, modeTargets, controlOverride = {}) => {
    const project = createCanvasProject(modeTargets);
    Object.assign(project.powerPlatform!.canvas!.controlTargets.find((control) => control.id === "button-new-mode")!, controlOverride);
    expectBlocked(project);
  });

  it.each([
    ["missing", (control: CanvasControlTarget) => { delete (control as unknown as { approvedControlName?: unknown }).approvedControlName; }],
    ["undefined", (control: CanvasControlTarget) => { (control as unknown as { approvedControlName?: unknown }).approvedControlName = undefined; }],
    ["null", (control: CanvasControlTarget) => { (control as unknown as { approvedControlName?: unknown }).approvedControlName = null; }],
    ["non-string", (control: CanvasControlTarget) => { (control as unknown as { approvedControlName?: unknown }).approvedControlName = 42; }],
    ["blank", (control: CanvasControlTarget) => { control.approvedControlName = "   "; }],
    ["punctuated", (control: CanvasControlTarget) => { control.approvedControlName = "btn-new"; }],
    ["formula-looking", (control: CanvasControlTarget) => { control.approvedControlName = "If(true,btn)"; }]
  ])("blocks %s approved trigger-control name", (_label, mutate) => {
    const project = createCanvasProject();
    mutate(triggerControl(project));
    const issues = expectBlocked(project);
    expect(issues).toContain("invalid approved control name");
  });

  it.each([
    ["missing", (control: CanvasControlTarget) => { delete (control as unknown as { controlType?: unknown }).controlType; }],
    ["undefined", (control: CanvasControlTarget) => { (control as unknown as { controlType?: unknown }).controlType = undefined; }],
    ["null", (control: CanvasControlTarget) => { (control as unknown as { controlType?: unknown }).controlType = null; }],
    ["non-string", (control: CanvasControlTarget) => { (control as unknown as { controlType?: unknown }).controlType = 42; }],
    ["empty", (control: CanvasControlTarget) => { control.controlType = ""; }],
    ["unsupported", (control: CanvasControlTarget) => { control.controlType = "label"; }]
  ])("blocks %s trigger-control type without throwing", (_label, mutate) => {
    const project = createCanvasProject();
    mutate(triggerControl(project));
    const result = validateCanvasFormModeTargets(project);
    expect(result.eligibilityStatus).toBe("Blocked");
    expect(result.blockingIssues.join(" ")).toContain("not a confirmed button");
  });

  it.each([
    ["malformed screen ID", (control: CanvasControlTarget) => { (control as unknown as { screenId?: unknown }).screenId = null; }, "malformed screen reference"],
    ["malformed confirmation status", (control: CanvasControlTarget) => { (control as unknown as { confirmationStatus?: unknown }).confirmationStatus = 42; }, "unconfirmed trigger control"]
  ])("returns a controlled result for %s", (_label, mutate, expectedIssue) => {
    const project = createCanvasProject();
    mutate(triggerControl(project));
    const result = validateCanvasFormModeTargets(project);
    expect(result.eligibilityStatus).toBe("Blocked");
    expect(result.blockingIssues.join(" ")).toContain(expectedIssue);
  });

  it.each([
    ["missing required flag", () => { const record = rawModeTarget(); delete record.required; return record; }, "required"],
    ["non-Boolean required flag", () => rawModeTarget({ required: "true" }), "required must be Boolean"],
    ["missing sort order", () => { const record = rawModeTarget(); delete record.sortOrder; return record; }, "sortOrder"],
    ["string sort order", () => rawModeTarget({ sortOrder: "10" }), "sortOrder must be a finite number"],
    ["null sort order", () => rawModeTarget({ sortOrder: null }), "sortOrder must be a finite number"],
    ["infinite sort order", () => rawModeTarget({ sortOrder: Number.POSITIVE_INFINITY }), "sortOrder must be a finite number"]
  ])("blocks %s in raw target storage", (_label, buildRecord, expectedIssue) => {
    const result = validateCanvasFormModeTargets(createCanvasProject(), [buildRecord()]);
    expect(result.eligibilityStatus).toBe("Blocked");
    expect(result.blockingIssues.join(" ")).toContain(expectedIssue);
  });

  it("keeps complete raw target records valid", () => {
    expectValid(createCanvasProject(), [rawModeTarget()]);
  });

  it.each([
    ["duplicate target IDs", [formModeTarget(), editModeTarget({ id: "mode-new-request" })]],
    ["duplicate sort orders", [formModeTarget(), editModeTarget({ sortOrder: 10 })]],
    ["reused trigger controls", [formModeTarget(), editModeTarget({ triggerControlId: "button-new-mode" })]],
    ["same form-operation target", [formModeTarget(), formModeTarget({ id: "mode-new-again", triggerControlId: "button-edit-mode", sortOrder: 20 })]],
    ["duplicate new-mode targets for one form", [formModeTarget(), formModeTarget({ id: "mode-new-again", formOperationTargetId: "form-op-edit-request", triggerControlId: "button-edit-mode", sortOrder: 20 })]],
    ["duplicate edit-mode targets for one form", [editModeTarget(), editModeTarget({ id: "mode-edit-again", formOperationTargetId: "form-op-create-request", triggerControlId: "button-new-mode", sortOrder: 10 })]]
  ])("blocks %s", (_label, modeTargets) => {
    expectBlocked(createCanvasProject(modeTargets, [formOperationTarget(), editOperationTarget()]));
  });

  it("permits one new and one edit action for the same form with distinct buttons", () => {
    const result = expectValid(createCanvasProject([formModeTarget(), editModeTarget()], [formOperationTarget(), editOperationTarget()]));
    expect(result.orderedTargets.map((target) => target.action)).toEqual(["new", "edit"]);
  });

  it("orders targets by sort order then stable ID without depending on input order", () => {
    const unordered = [
      editModeTarget({ id: "mode-c", sortOrder: 30 }),
      formModeTarget({ id: "mode-a", sortOrder: 10 }),
      editModeTarget({ id: "mode-b", sortOrder: 20, triggerControlId: "button-edit-mode" })
    ];
    expect(orderCanvasFormModeTargets(unordered).map((target) => target.id)).toEqual(["mode-a", "mode-b", "mode-c"]);
    const forward = validateCanvasFormModeTargets(createCanvasProject([formModeTarget(), editModeTarget()], [formOperationTarget(), editOperationTarget()]));
    const reverse = validateCanvasFormModeTargets(createCanvasProject([editModeTarget(), formModeTarget()], [formOperationTarget(), editOperationTarget()]));
    expect(forward.orderedTargets.map((target) => target.id)).toEqual(reverse.orderedTargets.map((target) => target.id));
  });

  it("does not let meaningful malformed data become Not Applicable", () => {
    expectBlocked(createCanvasProject(), [{ action: "new" }]);
  });

  it("does not mutate project, target arrays, or existing form-operation targets", () => {
    const project = createCanvasProject([formModeTarget(), editModeTarget()], [formOperationTarget(), editOperationTarget()]);
    const before = clone(project);
    validateCanvasFormModeTargets(project);
    expect(project).toEqual(before);
  });

  it("does not create implementation assets or generated formulas", () => {
    const project = createCanvasProject([formModeTarget(), editModeTarget()], [formOperationTarget(), editOperationTarget()]);
    const result = validateCanvasFormModeTargets(project);
    const registry = buildImplementationAssetRegistry(project, "2026-07-18T00:00:00.000Z");
    const serializedResult = JSON.stringify(result);
    expect(registry.assets.map((asset) => asset.assetId)).not.toContain("asset-canvas-powerfx-form-mode-actions");
    expect(serializedResult).not.toContain("SubmitForm");
    expect(serializedResult).not.toContain(".fx");
    expect(serializedResult).not.toContain("Phase 5B.4");
  });

  it("keeps UI, export, and later form-mode planning or generation absent", () => {
    const result = validateCanvasFormModeTargets(createCanvasProject());
    expect(Object.keys(result)).toEqual(["targets", "orderedTargets", "blockingIssues", "missingDecisions", "eligibilityStatus"]);
    expect(JSON.stringify(result)).not.toContain("implementationAsset");
    expect(JSON.stringify(result)).not.toContain("export");
    expect(JSON.stringify(result)).not.toContain("planning");
  });
});
