import {
  PROJECT_TYPE_PRESETS,
  PROJECT_TYPE_VALUES,
  getProjectTypeFields,
  isBrandingRequired
} from "../data/projectTypes";

describe("project type presets", () => {
  it("defines every approved project type with complete preset metadata", () => {
    expect(PROJECT_TYPE_VALUES).toHaveLength(15);
    expect(PROJECT_TYPE_VALUES).toEqual(expect.arrayContaining([
      "Static website",
      "Business website",
      "Web application",
      "Mobile app",
      "Game",
      "Dashboard or reporting project",
      "Power Apps or Microsoft 365 app",
      "Automation or workflow tool",
      "API or backend service",
      "E-commerce site",
      "AI assistant or chatbot"
    ]));

    for (const preset of PROJECT_TYPE_PRESETS) {
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.recommendedTargetPlatforms.length).toBeGreaterThan(0);
      expect(preset.requiredIntakeModules.length).toBeGreaterThan(0);
      expect(preset.suggestedGeneratedDocumentNotes.length).toBeGreaterThan(0);
    }
  });

  it("changes relevant fields and branding rules by preset", () => {
    const websiteFields = getProjectTypeFields("Business website", "Public-facing", "features");
    const gameFields = getProjectTypeFields("Game", "Public-facing", "features");

    expect(websiteFields.map((field) => field.name)).toContain("websitePages");
    expect(websiteFields.map((field) => field.name)).not.toContain("gameControls");
    expect(gameFields.map((field) => field.name)).toContain("gameControls");
    expect(isBrandingRequired("Business website", "Public-facing")).toBe(true);
    expect(isBrandingRequired("Web application", "Internal")).toBe(false);
    expect(isBrandingRequired("AI assistant or chatbot", "Public-facing")).toBe(true);
  });
});
