import JSZip from "jszip";
import { createProject } from "../lib/createProject";
import { createExportManifest } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { createProjectArchive } from "../lib/exportProjectPackage";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import {
  buildImplementationAssetRegistry,
  createImplementationAssetManifest,
  normalizeImplementationAssetRegistry,
  type ImplementationAsset,
  type ImplementationAssetRegistry
} from "../lib/implementationAssets";
import { normalizePowerPlatformData } from "../lib/powerPlatform";
import {
  buildRecordLifecycleFormulaReviewState,
  RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION
} from "../lib/recordLifecycleFormulaReviewState";
import {
  RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
  RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS,
  type RecordLifecycleFormulaStudioValidationChecks
} from "../lib/recordLifecycleFormulaEvidence";
import {
  buildRecordLifecycleFormulaReviewSummary,
  RECORD_LIFECYCLE_FORMULA_REVIEW_SUMMARY_SAFETY_NOTICES,
  type RecordLifecycleFormulaReviewSummary
} from "../lib/recordLifecycleFormulaReviewSummary";
import { CANVAS_RECORD_LIFECYCLE_ASSET_ID } from "../lib/recordLifecyclePlanning";
import {
  PERMANENT_DELETE_BLOCKER,
  RECORD_LIFECYCLE_POWER_FX_ASSET_ID
} from "../lib/recordLifecyclePowerFxGeneration";
import {
  createApplicabilityDecision,
  createDefaultCanvasControlTarget,
  createDefaultCanvasScreenTarget,
  createDefaultConnector,
  createDefaultSharePointColumn,
  createDefaultSharePointList
} from "../lib/powerPlatform";
import type {
  CanvasRecordLifecycleTarget,
  CanvasStateVariableTarget,
  ProjectRecord
} from "../types/project";
import { createGeneratedProject } from "./helpers/generatedProject";

const NOW = "2026-07-31T12:00:00.000Z";

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createCanvasProject(formulaProperties = "OnSelect"): ProjectRecord {
  const project = createProject({
    identity: { id: "project-alpha", projectName: "Canvas Formula Summary" },
    client: { clientName: "Client", businessName: "Operations" },
    intake: {
      appType: "powerAppsCanvas",
      appPurpose: "Track approved service requests.",
      requiredFeatures: "Create and review requests.",
      workflows: "Submit request.",
      outOfScope: "Live deployment.",
      successCriteria: "Assets are reviewed before implementation.",
      accessibilityNotes: "Labels and keyboard order are required.",
      permissionRules: "Least privilege.",
      screens: "Request form",
      acceptanceNotes: "Create request is accepted.",
      targetUsers: "Requesters",
      userRoles: "Requester",
      dataSources: "SharePoint",
      dataEntities: "Requests",
      fields: "Title",
      dataCollections: "Requests",
      securityConfirmed: "Confirmed"
    } as Partial<ProjectRecord["intake"]>
  });
  const pp = project.powerPlatform!;
  pp.common.tenant = "Tenant";
  pp.common.environment = "Dev";
  pp.common.environmentAccessStatus = "confirmed";
  pp.common.authenticationRequirements = "Microsoft Entra ID.";
  pp.common.authorizationRequirements = "Least privilege.";
  pp.common.recordAccessRules = "Users see permitted records.";
  pp.common.auditRequirements = "Audit changes.";
  pp.common.privacyRequirements = "No secrets.";
  pp.common.securityReviewStatus = "confirmed";
  pp.common.functionalTesting = "Functional tests.";
  pp.common.connectorTesting = "Connector tests.";
  pp.common.permissionTesting = "Permission tests.";
  pp.common.securityTesting = "Security tests.";
  pp.common.accessibilityTesting = "Accessibility tests.";
  pp.common.performanceTesting = "Performance tests.";
  pp.common.volumeTesting = "Volume tests.";
  pp.common.integrationTesting = "Integration tests.";
  pp.common.regressionTesting = "Regression tests.";
  pp.common.userAcceptanceTesting = "User acceptance tests.";
  pp.common.deploymentTesting = "Deployment test plan only.";
  pp.common.productionSmokeTesting = "Production smoke tests.";
  pp.common.testingPlanConfirmationStatus = "confirmed";
  pp.common.sourceControlApproach = "Source-control notes.";
  pp.common.gitIntegration = "Not applicable.";
  pp.common.powerPlatformCliAvailability = "Not applicable.";
  pp.common.deploymentMethod = "Manual deployment.";
  pp.common.deploymentResponsibility = "Deployment owner handles external deployment.";
  pp.common.deploymentOwner = "Deployment owner";
  pp.common.deploymentResponsibilityStatus = "confirmed";
  pp.common.deploymentStrategy = "Dev/test/prod.";
  pp.common.connectionReferences = "SharePoint connection reference.";
  pp.common.environmentVariables = "SharePoint site URL.";
  pp.common.pipelineRequirements = "Manual approval.";
  pp.common.rollbackExpectations = "Restore previous app version.";
  pp.common.releaseApprovalResponsibility = "Business owner.";
  pp.common.almConfirmationStatus = "confirmed";
  pp.common.releaseApprovalStatus = "confirmed";
  pp.common.connectors = [
    createDefaultConnector({
      id: "connector-sharepoint",
      displayName: "SharePoint",
      dataSourceName: "Requests",
      dataSourceType: "sharePointList",
      canvasRole: "primary",
      connectorClassification: "standard",
      classificationConfirmationStatus: "confirmed",
      licenceRequirement: "Standard connector.",
      licensingConfirmationStatus: "confirmed",
      authenticationMethod: "Microsoft Entra ID",
      connectionOwner: "Operations owner",
      connectionOwnerRole: "Environment maker",
      connectionOwnershipStatus: "confirmed",
      requiredConnectorPermissions: "Read and write list items.",
      permissionOwner: "SharePoint owner",
      permissionValidationMethod: "Owner confirmation.",
      permissionConfirmationStatus: "confirmed",
      delegationSupport: "Delegation supported for indexed columns.",
      limitations: "Avoid non-delegable expressions.",
      supportedOperations: { read: true, create: true, update: true, delete: true, archive: true, restore: true },
      approvalConfirmationStatus: "confirmed"
    })
  ];
  const canvas = pp.canvas!;
  canvas.primaryDataSourceType = "sharePointList";
  canvas.primaryConnectorId = "connector-sharepoint";
  canvas.sourcePurpose = "Store requests.";
  canvas.sourceOwnership = "Operations.";
  canvas.sharePointSiteUrl = "https://contoso.sharepoint.com/sites/ops";
  canvas.sharePointSiteTitle = "Operations";
  canvas.sharePointSiteOwner = "Operations owner";
  canvas.sharePointAccessStatus = "confirmed";
  canvas.schemaStatus = "confirmed";
  canvas.internalNameStatus = "confirmed";
  canvas.sharePointListSchemas = [
    createDefaultSharePointList({
      id: "list-requests",
      displayName: "Requests",
      purpose: "Track requests.",
      expectedRecordCount: "1000",
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
    })
  ];
  canvas.screenNamingConvention = "scrName";
  canvas.controlNamingConvention = "prefixName";
  canvas.controlTypePrefixes = "btn for buttons";
  canvas.variableNamingConvention = "varName";
  canvas.collectionNamingConvention = "colName";
  canvas.componentNamingConvention = "cmpName";
  canvas.formulaFileNamingConvention = "property.fx";
  canvas.yamlFileNamingConvention = "target.yaml";
  canvas.namingStandardConfirmationStatus = "confirmed";
  canvas.appFormulasRequirements = "Use named formulas where applicable.";
  canvas.startScreenRequirements = "Start on home.";
  canvas.onStartRequirements = "Initialize state.";
  canvas.namedFormulaRequirements = "Use reusable formulas.";
  canvas.createBehavior = "Patch request.";
  canvas.readBehavior = "Read requests.";
  canvas.updateBehavior = "Update request.";
  canvas.validationRequirements = "Validate title.";
  canvas.errorHandlingRequirements = "Notify errors.";
  canvas.searchRequirements = "Search title.";
  canvas.filteringRequirements = "Filter by status.";
  canvas.sortingRequirements = "Sort by modified date.";
  canvas.powerFxStatus = "confirmed";
  canvas.expectedRecordCounts = "1000";
  canvas.delegationRequirements = "Use delegable filters.";
  canvas.delegationStatus = "confirmed";
  canvas.componentApplicabilityDecision = createApplicabilityDecision({
    status: "notApplicable",
    notApplicableReason: "No reusable components are required.",
    confirmationStatus: "confirmed"
  });
  canvas.screenTargets = [
    createDefaultCanvasScreenTarget({
      id: "screen-request-form",
      displayName: "Request form",
      approvedScreenName: "scrRequestForm",
      purpose: "Collect request details.",
      confirmationSource: "Architect",
      dataSourceApplicabilityDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "Screen does not need direct data-source binding.",
        confirmationStatus: "confirmed"
      }),
      confirmationStatus: "confirmed",
      yamlOutputDecision: createApplicabilityDecision({
        status: "required",
        details: "Generate screen YAML plan.",
        confirmationStatus: "confirmed"
      }),
      yamlOutputType: "Screen YAML",
      yamlParentType: "app",
      yamlInstallationLocation: "Power Apps Studio tree view",
      yamlValidationResponsibility: "Developer"
    })
  ];
  canvas.controlTargets = [
    createDefaultCanvasControlTarget({
      id: "control-save-request",
      screenId: "screen-request-form",
      approvedControlName: "btnSaveRequest",
      controlType: "Button",
      purpose: "Save the request.",
      operation: "create",
      formulaProperties,
      connectorId: "connector-sharepoint",
      entityId: "list-requests",
      requiredFieldIds: ["field-title"],
      dependencies: "Depends on confirmed SharePoint request list and Title field.",
      dependencyApplicabilityDecision: createApplicabilityDecision({
        status: "required",
        details: "Depends on confirmed SharePoint request list and Title field.",
        confirmationStatus: "confirmed"
      }),
      formulaOutputDecision: createApplicabilityDecision({
        status: "required",
        details: "Generate save formula plan.",
        confirmationStatus: "confirmed"
      }),
      yamlOutputDecision: createApplicabilityDecision({
        status: "notApplicable",
        notApplicableReason: "Existing button will be updated manually.",
        confirmationStatus: "confirmed"
      }),
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  return project;
}

function lifecycleTarget(overrides: Partial<CanvasRecordLifecycleTarget> = {}): CanvasRecordLifecycleTarget {
  return {
    id: overrides.id ?? "archive-request",
    action: overrides.action ?? "archive",
    trigger: overrides.trigger ?? "controlOnSelect",
    triggerControlId: overrides.triggerControlId ?? "control-archive-request",
    screenTargetId: overrides.screenTargetId ?? "screen-request-form",
    connectorId: overrides.connectorId ?? "connector-sharepoint",
    entityId: overrides.entityId ?? "list-requests",
    recordContextType: overrides.recordContextType ?? "selectedRecord",
    recordContextReferenceId: overrides.recordContextReferenceId ?? "control-request-gallery",
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

function restoreLifecycleTarget(): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "restore-request",
    action: "restore",
    triggerControlId: "control-restore-request",
    sortOrder: 20
  });
}

function deleteLifecycleTarget(): CanvasRecordLifecycleTarget {
  return lifecycleTarget({
    id: "delete-request",
    action: "delete",
    triggerControlId: "control-delete-request",
    archiveStrategy: "notApplicable",
    lifecycleFieldId: "",
    archiveValue: "",
    restoreValue: "",
    deleteStrategy: "permanentDeleteApproved",
    destructiveActionConfirmed: true,
    sortOrder: 30
  });
}

function savingStateVariable(overrides: Partial<CanvasStateVariableTarget> = {}): CanvasStateVariableTarget {
  return {
    id: overrides.id ?? "state-lifecycle-saving",
    implementationName: overrides.implementationName ?? "varLifecycleSaving",
    purpose: overrides.purpose ?? "Tracks lifecycle save state.",
    stateRole: overrides.stateRole ?? "savingState",
    initialValue: overrides.initialValue ?? { kind: "boolean", value: false },
    confirmationStatus: overrides.confirmationStatus ?? "confirmed",
    required: overrides.required ?? true,
    sortOrder: overrides.sortOrder ?? 10
  };
}

function createRecordLifecycleProject(targets: CanvasRecordLifecycleTarget[] = [lifecycleTarget(), restoreLifecycleTarget()]): ProjectRecord {
  const project = createCanvasProject();
  const canvas = project.powerPlatform!.canvas!;
  canvas.controlTargets = [
    ...canvas.controlTargets,
    createDefaultCanvasControlTarget({ id: "control-archive-request", screenId: "screen-request-form", approvedControlName: "btnArchiveRequest", controlType: "button", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "control-restore-request", screenId: "screen-request-form", approvedControlName: "btnRestoreRequest", controlType: "button", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "control-delete-request", screenId: "screen-request-form", approvedControlName: "btnDeleteRequest", controlType: "button", confirmationStatus: "confirmed", confirmationSource: "Architect" }),
    createDefaultCanvasControlTarget({ id: "control-request-gallery", screenId: "screen-request-form", approvedControlName: "galRequests", controlType: "gallery", confirmationStatus: "confirmed", confirmationSource: "Architect" })
  ];
  canvas.stateVariableTargets = [
    savingStateVariable(),
    {
      id: "state-selected-record",
      implementationName: "varSelectedRecord",
      purpose: "Selected request record.",
      stateRole: "selectedRecord",
      initialValue: { kind: "blank" },
      confirmationStatus: "confirmed",
      required: true,
      sortOrder: 20
    }
  ];
  canvas.sharePointColumnSchemas = [
    ...canvas.sharePointColumnSchemas,
    createDefaultSharePointColumn({
      id: "field-status",
      parentType: "list",
      parentId: "list-requests",
      displayName: "Status",
      internalName: "Status",
      columnType: "Single line of text",
      confirmationStatus: "confirmed",
      confirmationSource: "Architect"
    })
  ];
  canvas.recordLifecycleTargets = targets;
  return project;
}

function approveRegistry(registry: ImplementationAssetRegistry) {
  return {
    assets: registry.assets.map((asset) => ({
      assetId: asset.assetId,
      approvalStatus: "Approved",
      contentChecksum: asset.contentChecksum,
      generationVersion: asset.generationVersion
    }))
  };
}

function approvedRegistryFor(project: ProjectRecord): ImplementationAssetRegistry {
  return normalizeImplementationAssetRegistry(approveRegistry(buildImplementationAssetRegistry(project, NOW)), project, NOW);
}

function formulaAsset(registry: ImplementationAssetRegistry): ImplementationAsset {
  const asset = registry.assets.find((candidate) => candidate.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID);
  if (!asset) throw new Error("Record lifecycle formula asset missing");
  return asset;
}

function contextFor(project: ProjectRecord, registry: ImplementationAssetRegistry) {
  const reviewState = buildRecordLifecycleFormulaReviewState(registry);
  return {
    projectId: project.identity.id,
    assetId: reviewState.assetId,
    reviewContractVersion: reviewState.reviewContractVersion,
    reviewContractChecksum: reviewState.reviewContractChecksum
  };
}

function studioChecks(overrides: Partial<RecordLifecycleFormulaStudioValidationChecks> = {}): RecordLifecycleFormulaStudioValidationChecks {
  return Object.fromEntries(
    RECORD_LIFECYCLE_FORMULA_STUDIO_VALIDATION_CHECKS.map((check) => [check, overrides[check] ?? true])
  ) as RecordLifecycleFormulaStudioValidationChecks;
}

function technicalRecord(
  project: ProjectRecord,
  registry: ImplementationAssetRegistry,
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  const context = contextFor(project, registry);
  return {
    evidenceId: "tech-001",
    evidenceSchemaVersion: RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
    evidenceType: "Technical Review",
    projectId: context.projectId,
    assetId: context.assetId,
    reviewContractVersion: context.reviewContractVersion,
    reviewContractChecksum: context.reviewContractChecksum,
    reviewerDisplayName: "Jordan Reviewer",
    reviewerRole: "Technical reviewer",
    recordedAt: "2026-07-31T12:34:56-06:00",
    outcome: "Accepted",
    notes: "Reviewed against contract metadata.",
    ...overrides
  };
}

function studioRecord(
  project: ProjectRecord,
  registry: ImplementationAssetRegistry,
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  const context = contextFor(project, registry);
  return {
    evidenceId: "studio-001",
    evidenceSchemaVersion: RECORD_LIFECYCLE_FORMULA_EVIDENCE_SCHEMA_VERSION,
    evidenceType: "Power Apps Studio Validation",
    projectId: context.projectId,
    assetId: context.assetId,
    reviewContractVersion: context.reviewContractVersion,
    reviewContractChecksum: context.reviewContractChecksum,
    reviewerDisplayName: "Riley Validator",
    reviewerRole: "Studio validator",
    recordedAt: "2026-07-31T13:34:56-06:00",
    outcome: "Passed",
    validationEnvironment: "Power Apps test environment",
    checks: studioChecks(),
    ...overrides
  };
}

function setEvidence(project: ProjectRecord, evidence: unknown): void {
  const canvas = project.powerPlatform?.canvas;
  if (!canvas) throw new Error("Canvas evidence fixture requires Canvas Power Platform data.");
  canvas.recordLifecycleFormulaReviewEvidence = evidence as typeof canvas.recordLifecycleFormulaReviewEvidence;
}

function buildSummary(
  project: ProjectRecord,
  registry: unknown,
  reviewReference?: unknown
): RecordLifecycleFormulaReviewSummary {
  return buildRecordLifecycleFormulaReviewSummary({ project, implementationRegistry: registry, reviewReference });
}

function expectBaseSummaryShape(summary: RecordLifecycleFormulaReviewSummary): void {
  expect(summary.applicable).toBe(summary.reviewState !== "Not Applicable");
  expect(summary.reviewReference).toEqual({
    status: expect.any(String),
    issues: expect.any(Array)
  });
  expect(summary.formulaBlockers).toEqual(expect.any(Array));
  expect(summary.technicalReview).toMatchObject({
    evidenceType: "Technical Review",
    status: expect.any(String),
    recordCount: expect.any(Number),
    currentCount: expect.any(Number),
    staleCount: expect.any(Number),
    invalidCount: expect.any(Number),
    currentOutcomes: expect.any(Array),
    staleOutcomes: expect.any(Array),
    issues: expect.any(Array)
  });
  expect(summary.studioValidation).toMatchObject({
    evidenceType: "Power Apps Studio Validation",
    status: expect.any(String),
    recordCount: expect.any(Number),
    currentCount: expect.any(Number),
    staleCount: expect.any(Number),
    invalidCount: expect.any(Number),
    currentOutcomes: expect.any(Array),
    staleOutcomes: expect.any(Array),
    issues: expect.any(Array)
  });
  expect(summary.history).toEqual(expect.any(Array));
  expect(summary.collectionIssues).toEqual(expect.any(Array));
  expect(summary.safetyNotices).toEqual([...RECORD_LIFECYCLE_FORMULA_REVIEW_SUMMARY_SAFETY_NOTICES]);
}

function expectCounts(
  summary: RecordLifecycleFormulaReviewSummary,
  expected: {
    technical: [string, number, number, number];
    studio: [string, number, number, number];
    history: number;
  }
): void {
  const [technicalStatus, technicalCurrent, technicalStale, technicalInvalid] = expected.technical;
  const [studioStatus, studioCurrent, studioStale, studioInvalid] = expected.studio;
  expect(summary.technicalReview.status).toBe(technicalStatus);
  expect(summary.technicalReview.currentCount).toBe(technicalCurrent);
  expect(summary.technicalReview.staleCount).toBe(technicalStale);
  expect(summary.technicalReview.invalidCount).toBe(technicalInvalid);
  expect(summary.technicalReview.recordCount).toBe(technicalCurrent + technicalStale + technicalInvalid);
  expect(summary.studioValidation.status).toBe(studioStatus);
  expect(summary.studioValidation.currentCount).toBe(studioCurrent);
  expect(summary.studioValidation.staleCount).toBe(studioStale);
  expect(summary.studioValidation.invalidCount).toBe(studioInvalid);
  expect(summary.studioValidation.recordCount).toBe(studioCurrent + studioStale + studioInvalid);
  expect(summary.history).toHaveLength(expected.history);
}

function expectNoBoundaryLeaks(value: unknown): void {
  const serialized = JSON.stringify(value);
  for (const forbidden of [
    "sourceContent",
    "Patch(",
    "IfError(",
    "Notify(",
    "Set(",
    "Remove(",
    "RemoveIf(",
    "reviewerDisplayName",
    "reviewerRole",
    "validationEnvironment",
    "notes",
    "rejectionReason",
    "regenerationReason",
    "approvalStatus",
    "Ready for Export",
    "copyAllowed",
    "exportAllowed",
    "installable",
    "deployable",
    "readyForExport",
    "reviewComplete",
    "validationComplete",
    "manualInstallationRequirements",
    "intendedPath"
  ]) {
    expect(serialized).not.toContain(forbidden);
  }
}

async function zipContentText(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(blob);
  const textFiles = await Promise.all(
    Object.values(zip.files)
      .filter((file) => !file.dir)
      .map((file) => file.async("string"))
  );
  return textFiles.join("\n");
}

describe("record lifecycle formula review summary projection", () => {
  it("1. summarizes Formula Not Applicable with no evidence", () => {
    const project = createCanvasProject();
    const summary = buildSummary(project, buildImplementationAssetRegistry(project, NOW));

    expectBaseSummaryShape(summary);
    expect(summary.reviewState).toBe("Not Applicable");
    expect(summary.applicable).toBe(false);
    expect(summary.formulaIdentity).toBeUndefined();
    expect(summary.reviewReference.status).toBe("Not Provided");
    expect(summary.formulaBlockers).toEqual([]);
    expectCounts(summary, { technical: ["Not Provided", 0, 0, 0], studio: ["Not Provided", 0, 0, 0], history: 0 });
    expect(summary.collectionIssues).toEqual([]);
  });

  it("2. summarizes Formula Blocked before generation", () => {
    const project = createRecordLifecycleProject();
    const summary = buildSummary(project, buildImplementationAssetRegistry(project, NOW));

    expectBaseSummaryShape(summary);
    expect(summary.reviewState).toBe("Blocked");
    expect(summary.applicable).toBe(true);
    expect(summary.formulaIdentity).toBeUndefined();
    expect(summary.formulaBlockers).toContain("Record lifecycle formula review requires a valid generated lifecycle formula asset.");
    expectCounts(summary, { technical: ["Not Provided", 0, 0, 0], studio: ["Not Provided", 0, 0, 0], history: 0 });
  });

  it("3. summarizes missing formula asset with formula blockers", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    const summary = buildSummary(project, {
      ...registry,
      assets: registry.assets.filter((asset) => asset.assetId !== RECORD_LIFECYCLE_POWER_FX_ASSET_ID)
    });

    expectBaseSummaryShape(summary);
    expect(summary.reviewState).toBe("Blocked");
    expect(summary.formulaIdentity).toBeUndefined();
    expect(summary.formulaBlockers).toContain("Record lifecycle formula review requires a valid generated lifecycle formula asset.");
    expectCounts(summary, { technical: ["Not Provided", 0, 0, 0], studio: ["Not Provided", 0, 0, 0], history: 0 });
  });

  it("4. summarizes Review Required formula with no evidence", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.reviewState).toBe("Review Required");
    expect(summary.formulaIdentity).toMatchObject({
      assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
      reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION
    });
    expect(summary.formulaBlockers).toEqual([]);
    expectCounts(summary, { technical: ["Not Provided", 0, 0, 0], studio: ["Not Provided", 0, 0, 0], history: 0 });
    expectNoBoundaryLeaks(summary);
  });

  it("5. summarizes Current Technical Review only", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [technicalRecord(project, registry)]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.reviewState).toBe("Review Required");
    expect(summary.reviewReference.status).toBe("Not Provided");
    expect(summary.technicalReview.currentOutcomes).toEqual(["Accepted"]);
    expect(summary.studioValidation.currentOutcomes).toEqual([]);
    expectCounts(summary, { technical: ["Current", 1, 0, 0], studio: ["Not Provided", 0, 0, 0], history: 1 });
  });

  it("6. summarizes Current Studio Validation only", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [studioRecord(project, registry)]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.technicalReview.currentOutcomes).toEqual([]);
    expect(summary.studioValidation.currentOutcomes).toEqual(["Passed"]);
    expectCounts(summary, { technical: ["Not Provided", 0, 0, 0], studio: ["Current", 1, 0, 0], history: 1 });
  });

  it("7. summarizes both evidence types Current without approval", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [technicalRecord(project, registry), studioRecord(project, registry)]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.technicalReview.currentOutcomes).toEqual(["Accepted"]);
    expect(summary.studioValidation.currentOutcomes).toEqual(["Passed"]);
    expectCounts(summary, { technical: ["Current", 1, 0, 0], studio: ["Current", 1, 0, 0], history: 2 });
    expect(JSON.stringify(summary)).not.toContain("approved");
    expect(JSON.stringify(summary)).not.toContain("ready");
  });

  it.each([
    ["8. Current Technical Review with Accepted outcome", "Accepted"],
    ["9. Current Technical Review with Rejected outcome", "Rejected"],
    ["10. Current Technical Review with Regeneration Required outcome", "Regeneration Required"]
  ] as const)("%s", (_name, outcome) => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [technicalRecord(project, registry, { outcome })]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.technicalReview.currentOutcomes).toEqual([outcome]);
    expectCounts(summary, { technical: ["Current", 1, 0, 0], studio: ["Not Provided", 0, 0, 0], history: 1 });
    expect(summary.history[0]).toMatchObject({ evidenceType: "Technical Review", outcome, status: "Current" });
  });

  it.each([
    ["11. Current Studio Validation with Passed outcome", "Passed", studioChecks()],
    ["12. Current Studio Validation with Failed outcome", "Failed", studioChecks({ failurePathPassed: false })]
  ] as const)("%s", (_name, outcome, checks) => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [studioRecord(project, registry, { outcome, checks })]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.studioValidation.currentOutcomes).toEqual([outcome]);
    expectCounts(summary, { technical: ["Not Provided", 0, 0, 0], studio: ["Current", 1, 0, 0], history: 1 });
    expect(summary.history[0]).toMatchObject({ evidenceType: "Power Apps Studio Validation", outcome, status: "Current" });
  });

  it("13. summarizes Technical Review Stale", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [technicalRecord(project, registry, { reviewContractChecksum: "fnv1a-stale00" })]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.technicalReview.staleOutcomes).toEqual(["Accepted"]);
    expect(summary.technicalReview.issues).toContain("Formula evidence review contract checksum is stale.");
    expectCounts(summary, { technical: ["Stale", 0, 1, 0], studio: ["Not Provided", 0, 0, 0], history: 1 });
  });

  it("14. summarizes Studio Validation Stale", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [studioRecord(project, registry, { reviewContractVersion: "phase-5b.4d.2.0" })]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.studioValidation.staleOutcomes).toEqual(["Passed"]);
    expect(summary.studioValidation.issues).toContain("Formula evidence review contract version is stale.");
    expectCounts(summary, { technical: ["Not Provided", 0, 0, 0], studio: ["Stale", 0, 1, 0], history: 1 });
  });

  it("15. summarizes Technical Review Invalid", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [technicalRecord(project, registry, { evidenceId: "invalid id" })]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.technicalReview.issues).toContain("Formula evidence record is malformed or missing required validation fields.");
    expectCounts(summary, { technical: ["Invalid", 0, 0, 1], studio: ["Not Provided", 0, 0, 0], history: 1 });
  });

  it("16. summarizes Studio Validation Invalid", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [studioRecord(project, registry, { validationEnvironment: "" })]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.studioValidation.issues).toContain("Formula evidence record is malformed or missing required validation fields.");
    expectCounts(summary, { technical: ["Not Provided", 0, 0, 0], studio: ["Invalid", 0, 0, 1], history: 1 });
  });

  it("17. summarizes Current Technical Review with Stale Studio Validation", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [
      technicalRecord(project, registry, { evidenceId: "tech-current" }),
      studioRecord(project, registry, { evidenceId: "studio-stale", reviewContractChecksum: "fnv1a-stale00" })
    ]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.technicalReview.currentOutcomes).toEqual(["Accepted"]);
    expect(summary.studioValidation.staleOutcomes).toEqual(["Passed"]);
    expectCounts(summary, { technical: ["Current", 1, 0, 0], studio: ["Stale", 0, 1, 0], history: 2 });
  });

  it("18. summarizes Stale Technical Review with Current Studio Validation", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [
      technicalRecord(project, registry, { evidenceId: "tech-stale", reviewContractChecksum: "fnv1a-stale00" }),
      studioRecord(project, registry, { evidenceId: "studio-current" })
    ]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.technicalReview.staleOutcomes).toEqual(["Accepted"]);
    expect(summary.studioValidation.currentOutcomes).toEqual(["Passed"]);
    expectCounts(summary, { technical: ["Stale", 0, 1, 0], studio: ["Current", 1, 0, 0], history: 2 });
  });

  it("19. preserves Current evidence with older Stale history", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [
      technicalRecord(project, registry, { evidenceId: "older-stale", reviewContractChecksum: "fnv1a-stale00", recordedAt: "2026-07-01T12:00:00Z" }),
      technicalRecord(project, registry, { evidenceId: "current-now" })
    ]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.technicalReview.currentOutcomes).toEqual(["Accepted"]);
    expect(summary.technicalReview.staleOutcomes).toEqual(["Accepted"]);
    expect(summary.history.map((record) => record.evidenceId)).toEqual(["older-stale", "current-now"]);
    expectCounts(summary, { technical: ["Current", 1, 1, 0], studio: ["Not Provided", 0, 0, 0], history: 2 });
  });

  it("20. preserves Current evidence with Invalid history", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [
      technicalRecord(project, registry, { evidenceId: "invalid id" }),
      technicalRecord(project, registry, { evidenceId: "current-now" })
    ]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.history.map((record) => record.status)).toEqual(["Invalid", "Current"]);
    expectCounts(summary, { technical: ["Current", 1, 0, 1], studio: ["Not Provided", 0, 0, 0], history: 2 });
  });

  it("21. preserves duplicate evidence IDs as Invalid", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [
      technicalRecord(project, registry, { evidenceId: "duplicate-id" }),
      studioRecord(project, registry, { evidenceId: "duplicate-id" })
    ]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.history.map((record) => record.status)).toEqual(["Invalid", "Invalid"]);
    expect(summary.history.every((record) => record.issues.includes("Duplicate formula evidence ID."))).toBe(true);
    expectCounts(summary, { technical: ["Invalid", 0, 0, 1], studio: ["Invalid", 0, 0, 1], history: 2 });
  });

  it("22. preserves sparse evidence collection issues without fabricated history", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    const sparse: unknown[] = [];
    sparse[1] = technicalRecord(project, registry, { evidenceId: "after-hole" });
    setEvidence(project, sparse);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.collectionIssues).toEqual(["Formula evidence collection contains a sparse entry at index 0."]);
    expect(summary.history.map((record) => record.evidenceId)).toEqual(["after-hole"]);
    expectCounts(summary, { technical: ["Current", 1, 0, 0], studio: ["Not Provided", 0, 0, 0], history: 1 });
  });

  it("23. preserves malformed evidence collection issues", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, "not-an-array");
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.collectionIssues).toEqual(["Formula evidence collection must be an array."]);
    expect(summary.technicalReview.issues).toEqual(["Formula evidence collection must be an array."]);
    expect(summary.studioValidation.issues).toEqual(["Formula evidence collection must be an array."]);
    expectCounts(summary, { technical: ["Invalid", 0, 0, 0], studio: ["Invalid", 0, 0, 0], history: 0 });
  });

  it("24. preserves Current review contract with Stale review reference", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    const state = buildRecordLifecycleFormulaReviewState(registry);
    const summary = buildSummary(project, registry, {
      assetId: state.assetId,
      reviewContractVersion: state.reviewContractVersion,
      reviewContractChecksum: "fnv1a-stale00"
    });

    expectBaseSummaryShape(summary);
    expect(summary.reviewState).toBe("Review Required");
    expect(summary.reviewReference.status).toBe("Stale");
    expect(summary.reviewReference.issues).toContain("Formula review reference checksum is stale.");
  });

  it("25. preserves Invalid review reference with valid Current evidence", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [technicalRecord(project, registry)]);
    const summary = buildSummary(project, registry, {
      assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
      reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
      reviewContractChecksum: "Patch(Requests,{})"
    });

    expectBaseSummaryShape(summary);
    expect(summary.reviewReference.status).toBe("Invalid");
    expect(summary.reviewReference.issues).toContain("Formula review reference must not contain formula source.");
    expectCounts(summary, { technical: ["Current", 1, 0, 0], studio: ["Not Provided", 0, 0, 0], history: 1 });
  });

  it("26. keeps historical evidence stale when no current review contract exists", () => {
    const project = createRecordLifecycleProject();
    const registry = buildImplementationAssetRegistry(project, NOW);
    setEvidence(project, [technicalRecord(project, approvedRegistryFor(project), { evidenceId: "historical" })]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.reviewState).toBe("Blocked");
    expect(summary.formulaIdentity).toBeUndefined();
    expect(summary.technicalReview.issues).toContain("No current formula review contract is available.");
    expectCounts(summary, { technical: ["Stale", 0, 1, 0], studio: ["Not Provided", 0, 0, 0], history: 1 });
  });

  it("27. preserves permanent-delete blocker visibility", () => {
    const project = createRecordLifecycleProject([deleteLifecycleTarget()]);
    const registry = approvedRegistryFor(project);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.reviewState).toBe("Blocked");
    expect(summary.formulaIdentity).toBeUndefined();
    expect(summary.formulaBlockers).toContain(PERMANENT_DELETE_BLOCKER);
    expect(JSON.stringify(summary)).not.toContain("Remove(");
  });

  it("28. preserves multiple Current Technical outcomes without selecting a winner", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [
      technicalRecord(project, registry, { evidenceId: "tech-accepted", outcome: "Accepted" }),
      technicalRecord(project, registry, { evidenceId: "tech-rejected", outcome: "Rejected", rejectionReason: "Rejected for test." }),
      technicalRecord(project, registry, { evidenceId: "tech-regenerate", outcome: "Regeneration Required", regenerationReason: "Regenerate for test." })
    ]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.technicalReview.currentOutcomes).toEqual(["Accepted", "Rejected", "Regeneration Required"]);
    expect(summary.history.map((record) => record.outcome)).toEqual(["Accepted", "Rejected", "Regeneration Required"]);
    expect(JSON.stringify(summary)).not.toContain("primary");
    expect(JSON.stringify(summary)).not.toContain("latest");
    expectCounts(summary, { technical: ["Current", 3, 0, 0], studio: ["Not Provided", 0, 0, 0], history: 3 });
  });

  it("29. preserves multiple Current Studio outcomes without selecting a winner", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [
      studioRecord(project, registry, { evidenceId: "studio-passed", outcome: "Passed", checks: studioChecks() }),
      studioRecord(project, registry, { evidenceId: "studio-failed", outcome: "Failed", checks: studioChecks({ failurePathPassed: false }) })
    ]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.studioValidation.currentOutcomes).toEqual(["Passed", "Failed"]);
    expect(summary.history.map((record) => record.outcome)).toEqual(["Passed", "Failed"]);
    expect(JSON.stringify(summary)).not.toContain("primary");
    expect(JSON.stringify(summary)).not.toContain("latest");
    expectCounts(summary, { technical: ["Not Provided", 0, 0, 0], studio: ["Current", 2, 0, 0], history: 2 });
  });

  it("30. preserves input records in evaluator order", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [
      studioRecord(project, registry, { evidenceId: "studio-first" }),
      technicalRecord(project, registry, { evidenceId: "tech-second", reviewContractChecksum: "fnv1a-stale00" }),
      technicalRecord(project, registry, { evidenceId: "bad id" })
    ]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.history.map((record) => record.evidenceId ?? "[missing]")).toEqual(["studio-first", "tech-second", "[missing]"]);
    expect(summary.history.map((record) => record.status)).toEqual(["Current", "Stale", "Invalid"]);
  });

  it("31. does not select a latest record", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [
      technicalRecord(project, registry, { evidenceId: "newer", recordedAt: "2026-08-01T12:00:00Z", outcome: "Rejected", rejectionReason: "Newer does not win." }),
      technicalRecord(project, registry, { evidenceId: "older", recordedAt: "2026-07-01T12:00:00Z", outcome: "Accepted" })
    ]);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(summary.history.map((record) => record.evidenceId)).toEqual(["newer", "older"]);
    expect(summary.technicalReview.currentOutcomes).toEqual(["Accepted", "Rejected"]);
    expect(Object.keys(summary)).not.toContain("latestRecord");
    expect(Object.keys(summary)).not.toContain("primaryRecord");
  });

  it("32. keeps a TTI-like Draft project blocked, formula-free, and unchanged", () => {
    const project = createProject({
      identity: { id: "tti-like-draft", projectName: "TTI Software Licence Tracker" },
      intake: { appType: "powerAppsCanvas", appPurpose: "Draft tracker" }
    });
    project.status = "Intake Started";
    project.reviewStatus = "Review needed";
    project.powerPlatform = normalizePowerPlatformData({
      common: {
        securityReviewStatus: "blocked",
        testingPlanConfirmationStatus: "blocked",
        almConfirmationStatus: "blocked",
        deploymentResponsibilityStatus: "blocked",
        releaseApprovalStatus: "blocked"
      },
      canvas: {
        recordLifecycleTargets: [],
        recordLifecycleFormulaReviewEvidence: undefined,
        sharePointColumnSchemas: [],
        screenTargets: [],
        controlTargets: [],
        schemaStatus: "blocked",
        internalNameStatus: "blocked",
        yamlStatus: "blocked",
        delegationStatus: "blocked",
        powerFxStatus: "blocked",
        deleteRestrictions: PERMANENT_DELETE_BLOCKER
      }
    }, "powerAppsCanvas");
    const projectBefore = cloneDeep(project);
    const registry = buildImplementationAssetRegistry(project, NOW);
    const summary = buildSummary(project, registry);

    expectBaseSummaryShape(summary);
    expect(project.status).toBe("Intake Started");
    expect(project.reviewStatus).toBe("Review needed");
    expect(project.powerPlatform?.canvas?.schemaStatus).toBe("blocked");
    expect(project.powerPlatform?.canvas?.internalNameStatus).toBe("blocked");
    expect(project.powerPlatform?.canvas?.screenTargets).toEqual([]);
    expect(project.powerPlatform?.canvas?.controlTargets).toEqual([]);
    expect(project.powerPlatform?.canvas?.yamlStatus).toBe("blocked");
    expect(project.powerPlatform?.canvas?.delegationStatus).toBe("blocked");
    expect(project.powerPlatform?.common.securityReviewStatus).toBe("blocked");
    expect(project.powerPlatform?.common.testingPlanConfirmationStatus).toBe("blocked");
    expect(project.powerPlatform?.common.almConfirmationStatus).toBe("blocked");
    expect(project.powerPlatform?.common.deploymentResponsibilityStatus).toBe("blocked");
    expect(project.powerPlatform?.common.releaseApprovalStatus).toBe("blocked");
    expect(project.powerPlatform?.canvas?.deleteRestrictions).toBe(PERMANENT_DELETE_BLOCKER);
    expect(registry.assets.some((asset) => asset.assetId === RECORD_LIFECYCLE_POWER_FX_ASSET_ID)).toBe(false);
    expect(registry.assets.some((asset) => asset.assetId === CANVAS_RECORD_LIFECYCLE_ASSET_ID)).toBe(false);
    expect(summary.formulaIdentity).toBeUndefined();
    expect(summary.history).toEqual([]);
    expect(summary.technicalReview.status).toBe("Not Provided");
    expect(summary.studioValidation.status).toBe("Not Provided");
    expect(JSON.stringify(summary)).not.toContain("Patch(");
    expect(JSON.stringify(registry)).not.toContain("Patch(");
    expect(registry.assets.some((asset) => asset.approvalStatus === "Approved")).toBe(false);
    expect(registry.assets.some((asset) => asset.assetStatus === "Ready for Export")).toBe(false);
    expect(project).toEqual(projectBefore);
  });

  it("excludes formula source, identity, privacy, approval, readiness, and action boundary fields from serialized summaries", () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    const source = formulaAsset(registry).sourceContent;
    setEvidence(project, [
      technicalRecord(project, registry, {
        evidenceId: "private-tech",
        outcome: "Rejected",
        reviewerDisplayName: "Private Reviewer",
        reviewerRole: "Secret Role",
        notes: "Private note.",
        rejectionReason: "Private rejection reason."
      }),
      studioRecord(project, registry, {
        evidenceId: "private-studio",
        validationEnvironment: "Private environment"
      })
    ]);

    const summary = buildSummary(project, registry);
    const serialized = JSON.stringify(summary);

    expectNoBoundaryLeaks(summary);
    expect(serialized).not.toContain(source);
    expect(serialized).not.toContain("Private Reviewer");
    expect(serialized).not.toContain("Secret Role");
    expect(serialized).not.toContain("Private note");
    expect(serialized).not.toContain("Private rejection reason");
    expect(serialized).not.toContain("Private environment");
    expect(summary.history.every((record) => Object.keys(record).every((key) =>
      ["evidenceId", "evidenceType", "recordedAt", "outcome", "status", "issues"].includes(key)
    ))).toBe(true);
  });

  it("does not mutate project, registry, reference, evidence, generated documents, approvals, or readiness", () => {
    const project = createRecordLifecycleProject();
    project.status = "Needs Review";
    project.reviewStatus = "Review needed";
    project.readinessConfirmations = { projectTypeConfirmed: false, scopeReviewed: false };
    const registry = approvedRegistryFor(project);
    setEvidence(project, [technicalRecord(project, registry), studioRecord(project, registry)]);
    project.generatedDocuments = generateProjectPackage(project).documents;
    const reference = {
      assetId: RECORD_LIFECYCLE_POWER_FX_ASSET_ID,
      reviewContractVersion: RECORD_LIFECYCLE_FORMULA_REVIEW_CONTRACT_VERSION,
      reviewContractChecksum: buildRecordLifecycleFormulaReviewState(registry).reviewContractChecksum
    };
    const projectBefore = cloneDeep(project);
    const registryBefore = cloneDeep(registry);
    const referenceBefore = cloneDeep(reference);
    const formulaAssetBefore = cloneDeep(formulaAsset(registry));

    const summary = buildSummary(project, registry, reference);

    expect(summary.technicalReview.status).toBe("Current");
    expect(summary.studioValidation.status).toBe("Current");
    expect(project.status).toBe(projectBefore.status);
    expect(project.reviewStatus).toBe(projectBefore.reviewStatus);
    expect(project.readinessConfirmations).toEqual(projectBefore.readinessConfirmations);
    expect(project.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence).toEqual(projectBefore.powerPlatform?.canvas?.recordLifecycleFormulaReviewEvidence);
    expect(project.generatedDocuments).toEqual(projectBefore.generatedDocuments);
    expect(project.generatedDocuments).toHaveLength(projectBefore.generatedDocuments.length);
    expect(registry).toEqual(registryBefore);
    expect(reference).toEqual(referenceBefore);
    expect(formulaAsset(registry).approvalStatus).toBe(formulaAssetBefore.approvalStatus);
    expect(formulaAsset(registry).assetStatus).toBe(formulaAssetBefore.assetStatus);
    expect(JSON.stringify(summary)).not.toContain("approvalCandidate");
    expect(JSON.stringify(summary)).not.toContain("approval");
  });

  it("has no consumer in components, package generation, manifests, ZIP output, integrity, copy actions, or deployment output", async () => {
    const project = createRecordLifecycleProject();
    const registry = approvedRegistryFor(project);
    setEvidence(project, [technicalRecord(project, registry, { evidenceId: "summary-output-boundary" })]);
    const summary = buildSummary(project, registry);
    const implementationManifest = createImplementationAssetManifest(registry, project);
    const generated = generateProjectPackage(project);
    const exportProject = { ...project, generatedDocuments: generated.documents, packageGeneratedAt: NOW };
    const integrity = validateExportPackage(exportProject, NOW);
    const exportManifest = createExportManifest(exportProject, integrity);
    const zipText = await zipContentText(await createProjectArchive(createGeneratedProject(), { exportedAt: NOW }));
    const documentText = generated.documents.map((document) => document.content).join("\n");
    const documentByName = new Map(generated.documents.map((document) => [document.fileName, document.content]));

    expect(summary.history.map((record) => record.evidenceId)).toEqual(["summary-output-boundary"]);
    expect(JSON.stringify(implementationManifest)).not.toContain("summary-output-boundary");
    expect(documentText).not.toContain("summary-output-boundary");
    expect(documentByName.get("ARCHITECT_INSTRUCTIONS.md")).not.toContain("summary-output-boundary");
    expect(documentByName.get("CODEX_INSTRUCTIONS.md")).not.toContain("summary-output-boundary");
    expect(documentByName.get("PHASED_CODEX_PROMPTS.md")).not.toContain("summary-output-boundary");
    expect(JSON.stringify(exportManifest)).not.toContain("summary-output-boundary");
    expect(JSON.stringify(integrity)).not.toContain("summary-output-boundary");
    expect(zipText).not.toContain("summary-output-boundary");
    expect(zipText).not.toContain("Formula evidence");
  });

  it.each([
    ["malformed implementation registry", { assets: "not-array" }, undefined],
    ["malformed review reference", approvedRegistryFor(createRecordLifecycleProject()), "not-a-reference"],
    ["absent Power Platform data", buildImplementationAssetRegistry(createProject({ identity: { id: "plain" } }), NOW), undefined],
    ["absent Canvas data", buildImplementationAssetRegistry(createProject({ identity: { id: "plain", projectName: "Plain" } }), NOW), undefined]
  ] as const)("does not throw for %s", (_name, registry, reference) => {
    const project = createProject({ identity: { id: "runtime-safe", projectName: "Runtime Safe" } });
    project.powerPlatform = undefined;

    expect(() => buildSummary(project, registry, reference)).not.toThrow();
    expectBaseSummaryShape(buildSummary(project, registry, reference));
  });
});
