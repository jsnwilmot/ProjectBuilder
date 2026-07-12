import {
  PROJECT_TYPE_PRESETS,
  PROJECT_TYPE_VALUES,
  isProjectType,
  isSelectableProjectType,
  getProjectTypeFields,
  isBrandingRequired
} from "../data/projectTypes";

describe("project type presets", () => {
  it("defines every approved project type with complete preset metadata", () => {
    expect(PROJECT_TYPE_VALUES).toHaveLength(16);
    expect(PROJECT_TYPE_VALUES).toEqual(expect.arrayContaining([
      "staticWebsite",
      "businessWebsite",
      "webApplication",
      "mobileApp",
      "game",
      "dashboardReporting",
      "powerAppsCanvas",
      "powerAppsModelDriven",
      "automationWorkflow",
      "apiBackend",
      "ecommerceSite",
      "aiAssistantChatbot"
    ]));

    expect(isProjectType("microsoft365")).toBe(true);
    expect(isSelectableProjectType("microsoft365")).toBe(false);
    expect(PROJECT_TYPE_VALUES).not.toContain("microsoft365");

    for (const preset of PROJECT_TYPE_PRESETS) {
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.recommendedTargetPlatforms.length).toBeGreaterThan(0);
      expect(preset.requiredIntakeModules.length).toBeGreaterThan(0);
      expect(preset.suggestedGeneratedDocumentNotes.length).toBeGreaterThan(0);
    }
  });

  it("changes relevant fields and branding rules by preset", () => {
    const websiteFields = getProjectTypeFields("businessWebsite", "Public-facing", "features");
    const gameFields = getProjectTypeFields("game", "Public-facing", "features");

    expect(websiteFields.map((field) => field.name)).toContain("websitePages");
    expect(websiteFields.map((field) => field.name)).not.toContain("gameControls");
    expect(gameFields.map((field) => field.name)).toContain("gameControls");
    expect(isBrandingRequired("businessWebsite", "Public-facing")).toBe(true);
    expect(isBrandingRequired("webApplication", "Internal")).toBe(false);
    expect(isBrandingRequired("aiAssistantChatbot", "Public-facing")).toBe(true);
  });
});
