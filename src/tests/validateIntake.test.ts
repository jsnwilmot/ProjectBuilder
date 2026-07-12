import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import { getOutstandingFields, getStepCompletion, validateIntake } from "../lib/validateIntake";

describe("validateIntake", () => {
  it("returns a structured valid result and optional warnings", () => {
    const project = createSeedProject();
    const result = validateIntake(project);
    expect(result.isValid).toBe(true);
    expect(result.missingFields).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.sectionResults).toHaveLength(8);
    expect(result.sectionResults[0]).toMatchObject({
      stageId: "foundation",
      label: "Foundation",
      percentComplete: 100,
      isComplete: true
    });
    expect(getOutstandingFields(project).length).toBeGreaterThan(0);
    expect(getStepCompletion(project, 0)).toBe(100);
  });

  it("reports all required categories for an empty project", () => {
    const result = validateIntake(createProject({ identity: { id: "empty-project" } }));
    expect(result.isValid).toBe(false);
    expect(result.missingFields.map((issue) => issue.field)).toEqual(
      expect.arrayContaining([
        "appName",
        "clientName",
        "appType",
        "appPurpose",
        "problemStatement",
        "successCriteria",
        "targetUsers",
        "userRoles",
        "rolePermissionsSummary",
        "requiredFeatures",
        "featureDescription",
        "acceptanceNotes",
        "workflows",
        "workflowTrigger",
        "workflowSteps",
        "workflowOutcome",
        "dataCollections",
        "fields",
        "keyFields",
        "sensitiveDataNotes",
        "risks"
      ])
    );
  });

  it("flags weak optional signals as warnings", () => {
    const project = createProject({
      identity: { id: "warnings" },
      intake: {
        appPurpose: "Purpose",
        problemStatement: "Problem",
        successCriteria: "Success",
        targetUsers: "Users",
        userRoles: "Roles",
        rolePermissionsSummary: "Permissions",
        requiredFeatures: "Feature - Description",
        featureDescription: "Feature details",
        acceptanceNotes: "Acceptance",
        dataCollections: "Entity",
        fields: "Entity.field",
        keyFields: "Entity.id",
        workflows: "Workflow",
        workflowTrigger: "Trigger",
        workflowSteps: "Steps",
        workflowOutcome: "Outcome",
        sensitiveDataNotes: "None",
        risks: "No known risks"
      },
      client: { clientName: "Client" }
    });

    const warnings = validateIntake(project).warnings.map((warning) => warning.message);
    expect(warnings).toEqual(expect.arrayContaining([
      "No constraints listed.",
      "No assumptions listed.",
      "No integrations listed.",
      "No reports listed.",
      "No accessibility notes listed."
    ]));
  });

  it("requires a project type before intake can be complete", () => {
    const project = createSeedProject();
    project.intake.appType = "";

    const result = validateIntake(project);

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "appType" })])
    );
  });

  it("requires structured branding for website projects", () => {
    const project = createSeedProject();
    project.intake.appType = "businessWebsite";
    project.intake.brandStatus = "";
    project.intake.logoStatus = "";
    project.intake.primaryColors = "";

    const fields = validateIntake(project).missingFields.map((issue) => issue.field);

    expect(fields).toEqual(expect.arrayContaining(["brandStatus", "logoStatus", "primaryColors"]));
  });

  it("does not require full branding for an internal web application", () => {
    const project = createSeedProject();
    project.intake.audienceVisibility = "Internal";
    project.intake.brandStatus = "";
    project.intake.logoStatus = "";
    project.intake.primaryColors = "";
    project.intake.fontPreferences = "";
    project.intake.brandTone = "";
    project.intake.imageStyle = "";
    project.intake.contentSource = "";
    project.intake.approvedAssets = "";
    project.intake.accessibilityContrastNotes = "";

    const fields = validateIntake(project).missingFields.map((issue) => issue.field);

    expect(fields).not.toEqual(expect.arrayContaining(["brandStatus", "logoStatus", "primaryColors"]));
    expect(validateIntake(project).isValid).toBe(true);
  });

  it("applies required fields for website, game, dashboard, API, and automation presets", () => {
    const cases = [
      { appType: "businessWebsite" as const, fields: ["websitePages", "domainStatus", "seoKeywords"] },
      { appType: "game" as const, fields: ["gameGenre", "gameplayLoop", "gameControls", "gameArtStyle"] },
      { appType: "dashboardReporting" as const, fields: ["dashboardDataSources", "dashboardKpis", "dashboardRefreshFrequency", "dashboardAudience"] },
      { appType: "apiBackend" as const, fields: ["apiEndpoints", "dataContracts", "apiAuthentication", "apiConsumers"] },
      { appType: "automationWorkflow" as const, fields: ["automationTrigger", "automationSteps", "sourceSystem", "automationErrorHandling", "notificationRules"] }
    ];

    for (const testCase of cases) {
      const project = createSeedProject();
      project.intake.appType = testCase.appType;
      project.intake.audienceVisibility = "Internal";
      if (testCase.appType === "apiBackend") {
        project.intake.authenticationExpectation = "";
      }
      const fields = validateIntake(project).missingFields.map((issue) => issue.field);
      expect(fields, testCase.appType).toEqual(expect.arrayContaining(testCase.fields));
    }
  });

  it("surfaces Canvas Power Platform gates as intake blockers", () => {
    const project = createSeedProject();
    project.intake.appType = "powerAppsCanvas";
    project.powerPlatform = createProject({ intake: { appType: "powerAppsCanvas" } }).powerPlatform;

    const fields = validateIntake(project).missingFields.map((issue) => issue.field);

    expect(fields).toEqual(expect.arrayContaining([
      "m365Environment",
      "dataSources",
      "permissionRules",
      "successCriteria"
    ]));
  });

  it("requires SharePoint internal names when Canvas uses SharePoint", () => {
    const project = createSeedProject();
    project.intake.appType = "powerAppsCanvas";
    project.powerPlatform = createProject({ intake: { appType: "powerAppsCanvas" } }).powerPlatform;
    project.powerPlatform!.canvas!.primaryDataSourceType = "sharePointList";
    project.powerPlatform!.canvas!.sourcePurpose = "Track requests";
    project.powerPlatform!.canvas!.sourceOwnership = "Operations";

    const issues = validateIntake(project).missingFields;

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "sharePointLists" }),
      expect.objectContaining({ field: "keyFields" })
    ]));
  });

  it("requires model-driven Dataverse eligibility and schema gates", () => {
    const project = createSeedProject();
    project.intake.appType = "powerAppsModelDriven";
    project.powerPlatform = createProject({ intake: { appType: "powerAppsModelDriven" } }).powerPlatform;

    const fields = validateIntake(project).missingFields.map((issue) => issue.field);

    expect(fields).toEqual(expect.arrayContaining([
      "dataverseUse",
      "fields",
      "keyFields",
      "workflows"
    ]));
  });
});
