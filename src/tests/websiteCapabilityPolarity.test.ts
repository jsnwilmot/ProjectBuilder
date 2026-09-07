import { classifyCapabilityOccurrences, type CapabilityPolarity, type WebsiteCapabilityField } from "../lib/websiteCapabilityIntent";
import { websiteCapabilitySelected, websiteRequirement } from "../lib/websiteRequirements";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { validateExportPackage } from "../lib/exportIntegrity";
import { DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { createNegativeCapabilityWebsite } from "./helpers/businessWebsite";

const families: Array<[WebsiteCapabilityField, string, string, string]> = [
  ["websiteForms", "implement name, email, and no online form", "implement no public contact form, and an approved online booking form", "Requested forms"],
  ["integrations", "implement without an external API", "implement no legacy integration, and an approved external API", "Requested integrations"],
  ["websiteAnalytics", "implement no third-party analytics", "implement no legacy analytics, and requested web analytics", "Approved analytics"],
  ["dataCollections", "create static content with no persistent customer database", "create no legacy database, and the approved customer database", "Requested application data"],
  ["dataEntities", "create no archived customer records", "create no legacy records, and approved customer records", "Requested data entities"],
  ["authenticationExpectation", "implement no organization authentication", "implement no legacy login, and required organization authentication", "Requested access controls"],
  ["reportsDashboards", "provide no monthly management report", "provide no legacy report, and an approved monthly service summary", "Requested reports"]
];
const polarities = (field: WebsiteCapabilityField, value: string) =>
  classifyCapabilityOccurrences(field, value).map(({ polarity }) => polarity);

describe("Deterministic capability occurrence polarity", () => {
  it.each(families)("classifies adjectival negation for %s", (field, negative) => {
    expect(polarities(field, negative)).toEqual(["negative"]);
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: negative });
    expect(websiteCapabilitySelected(project, field)).toBe(false);
  });

  it.each(families)("resets polarity for an explicit positive %s replacement", (field, _, replacement) => {
    expect(polarities(field, replacement)).toEqual(["negative", "positive"]);
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: replacement });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it.each(["public", "new customer", "locally hosted", "tenant-specific", "specially designed", "modern accessible"])(
    "accepts arbitrary descriptive words without an adjective whitelist: %s", (description) => {
      expect(polarities("websiteForms", `implement no ${description} booking form`)).toEqual(["negative"]);
    }
  );

  it.each<[WebsiteCapabilityField, string]>([
    ["dataCollections", "implement without persistent customer data"],
    ["authenticationExpectation", "implement no authenticated user login"]
  ])("keeps descriptive %s noun phrases negative: %s", (field, value) => {
    expect(polarities(field, value)).toEqual(["negative"]);
  });

  it.each<[string, CapabilityPolarity[]]>([
    ["no contact form or booking form", ["negative", "negative"]],
    ["neither contact form nor booking form", ["negative", "negative"]],
    ["no contact form, no booking form", ["negative", "negative"]],
    ["no contact form, and no booking form", ["negative", "negative"]],
    ["implement no contact form, and an approved booking form", ["negative", "positive"]],
    ["no contact form, and an approved online booking form", ["negative", "positive"]],
    ["implement no contact form or approved booking form", ["negative", "negative"]],
    ["implement neither a contact form nor an approved booking form", ["negative", "negative"]],
    ["implement without a form, a contact form, or a booking form", ["negative", "negative", "negative"]],
    ["implement name, email, phone, address, and an approved online booking form", ["positive"]],
    ["implement no approved online form", ["negative"]],
    ["implement without an approved online form", ["negative"]],
    ["implement no form, and no approved booking form", ["negative", "negative"]],
    ["implement a public form that is not approved", ["negative"]],
    ["implement static navigation, do not add an online form", ["negative"]],
    ["implement static navigation, don't use an online form", ["negative"]],
    ["implement static navigation, never enable an online form", ["negative"]],
    ["implement without errors, an approved online form", ["positive"]]
  ])("tracks independent noun phrases in %s", (value, expected) => {
    const occurrences = classifyCapabilityOccurrences("websiteForms", value);
    expect(occurrences.map(({ polarity }) => polarity)).toEqual(expected);
    for (const occurrence of occurrences) expect(value.slice(occurrence.start, occurrence.end)).toMatch(/forms?$/i);
  });

  it.each<[WebsiteCapabilityField, string]>([
    ["websiteForms", "implement no public contact form, but require an approved online booking form"],
    ["websiteAnalytics", "no analytics platform is approved, implement no legacy analytics, and use the approved replacement analytics platform"],
    ["dataCollections", "no database is required, create no legacy database, but create the approved customer database"],
    ["reportsDashboards", "no reports are required, provide no legacy report, but provide the approved monthly service summary"],
    ["websiteAnalytics", "implement page views, CTA events, conversion events, and approved analytics"],
    ["dataCollections", "create name, email, status, notes, and the approved customer database"],
    ["websiteAnalytics", "implement analytics without errors"],
    ["dataCollections", "create the database without data loss"],
    ["reportsDashboards", "provide reports without personal information"],
    ["authenticationExpectation", "implement authentication without anonymous access"]
  ])("preserves selected %s: %s", (field, value) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it.each<[WebsiteCapabilityField, string]>([
    ["dataCollections", "No data loss is acceptable"],
    ["websiteAnalytics", "No analytics errors are acceptable"],
    ["reportsDashboards", "Reports must not include personal information"],
    ["authenticationExpectation", "Authentication must not allow anonymous users"]
  ])("leaves descriptive %s polarity unclassified: %s", (field, value) => {
    expect(polarities(field, value)).toEqual(["unclassified"]);
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it("returns no occurrences for an unrelated request", () => {
    expect(classifyCapabilityOccurrences("websiteForms", "implement static navigation")).toEqual([]);
  });
});

describe("Occurrence polarity in generated website packages", () => {
  it.each(families)("generates only the selected %s replacement with unchanged intake", (field, _, replacement, row) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: replacement });
    const before = JSON.stringify(project);
    const result = { ...project, generatedDocuments: generateProjectPackage(project).documents };
    const text = (name: string) => result.generatedDocuments.find((doc) => doc.fileName === name)!.content;
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      expect(text(name)).toContain(row);
      for (const [otherField, , , otherRow] of families) if (otherField !== field) expect(text(name)).not.toContain(otherRow);
    }
    expect(text("PHASED_CODEX_PROMPTS.md")).toContain("Requested website services");
    expect(text("PHASED_CODEX_PROMPTS.md")).toContain(replacement);
    expect(JSON.stringify(project)).toBe(before);
    expect(result.generatedDocuments.map(({ fileName, folder }) => ({ fileName, folder }))).toEqual(DOCUMENT_LOCATIONS);
    expect(validateExportPackage(result).errors).toEqual([]);
    if (field === "dataCollections" || field === "dataEntities") {
      expect(text("DATA_MODEL.md")).toContain("Application data is requested.");
      expect(websiteRequirement(project, "fields").level).toBe("required");
    }
  });

  it.each(families)("omits implementation work for adjectivally negated %s", (field, negative) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: negative });
    const result = { ...project, generatedDocuments: generateProjectPackage(project).documents };
    const text = (name: string) => result.generatedDocuments.find((doc) => doc.fileName === name)!.content;
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"])
      for (const [, , , row] of families) expect(text(name)).not.toContain(row);
    expect(text("PHASED_CODEX_PROMPTS.md")).not.toContain("Requested website services");
    expect(text("DATA_MODEL.md")).toContain("No application database or persistent business data model is requested");
    expect(validateExportPackage(result).errors).toEqual([]);
  });
});
