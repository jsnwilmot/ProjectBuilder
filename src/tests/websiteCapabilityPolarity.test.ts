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

const fourthFamilies: Array<[WebsiteCapabilityField, string, string]> = [
  ["websiteForms", "Implement a workflow with no errors affecting the booking form", "Implement no contact form, and booking form is approved"],
  ["integrations", "Enable a workflow with no failures related to the API", "Implement no legacy integration, and external API is approved"],
  ["websiteAnalytics", "Implement a workflow with no faults concerning analytics", "Implement no legacy analytics, and replacement analytics is approved"],
  ["dataCollections", "Create a workflow with no data loss in the database", "Create no legacy database, and customer database is approved"],
  ["dataEntities", "Create a workflow with no discrepancies within customer records", "Create no legacy records, and customer records are needed"],
  ["authenticationExpectation", "Implement a workflow with no anonymous access through authentication", "Implement no legacy login, and authentication is required"],
  ["reportsDashboards", "Provide a workflow with no personal information in reports", "Provide no legacy report, and monthly service summary is required"]
];

const fifthFamilies: Array<[WebsiteCapabilityField, string, string, string]> = [
  ["websiteForms", "Implement a workflow with no login or authentication errors affecting the booking form", "Implement no contact form, and booking form, which is approved", "Requested forms"],
  ["integrations", "Enable a workflow with no report or dashboard failures affecting the external API", "Implement no legacy integration, and external API, which is approved", "Requested integrations"],
  ["websiteAnalytics", "Implement a workflow with no database or data issues affecting analytics", "Implement no legacy analytics, and replacement analytics, which is requested", "Approved analytics"],
  ["dataCollections", "Create a workflow with no report or dashboard failures affecting the customer database", "Create no legacy database, and customer database, which is approved", "Requested application data"],
  ["dataEntities", "Create a workflow with no login or authentication issues affecting customer records", "Create no legacy records, and customer records, which are needed", "Requested data entities"],
  ["authenticationExpectation", "Implement a workflow with no API or integration failures affecting authentication", "Implement no legacy login, and authentication, which is required", "Requested access controls"],
  ["reportsDashboards", "Provide a workflow with no database or data issues affecting reports", "Provide no legacy report, and monthly service summary, which is approved", "Requested reports"]
];

describe("Fourth P1 reproducers", () => {
  it.each([
    "Implement a workflow with no errors affecting the booking form",
    "No contact form is approved, implement a workflow with no errors affecting an approved booking form",
    "Implement no contact form, and booking form is approved",
    "No contact form is approved, implement no contact form, and booking form is required"
  ])("selects forms: %s", (value) => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteForms = value;
    expect(websiteCapabilitySelected(project, "websiteForms")).toBe(true);
  });
});

describe("Fifth P1 reproducers", () => {
  it.each([
    "Implement a workflow with no login or authentication errors affecting the booking form",
    "No contact form is approved, implement a workflow with no login or authentication errors affecting the booking form",
    "Implement no contact form, and booking form, which is approved",
    "No contact form is approved, implement no contact form, and booking form, which is required"
  ])("selects forms: %s", (value) => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteForms = value;
    expect(websiteCapabilitySelected(project, "websiteForms")).toBe(true);
  });
});

describe("Coordinated concern scope and punctuated predicates", () => {
  it.each(fifthFamilies)("ends coordinated unrelated concern scope for %s", (field, value) => {
    expect(polarities(field, value)).toEqual(["positive"]);
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it.each(fifthFamilies)("applies a punctuated trailing predicate for %s", (field, _, value) => {
    expect(polarities(field, value)).toEqual(["negative", "positive"]);
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it.each([
    "Implement a workflow with no login or authentication errors affecting the booking form",
    "Implement a workflow with no API or integration failures affecting the booking form",
    "Implement a workflow with no analytics or tracking issues affecting the booking form",
    "Implement a workflow with no database or data problems affecting the booking form",
    "Implement a workflow with no report or dashboard failures affecting the booking form"
  ])("does not extend a coordinated concern into forms: %s", (value) => {
    expect(polarities("websiteForms", value)).toEqual(["positive"]);
  });

  it.each<[WebsiteCapabilityField, string]>([
    ["authenticationExpectation", "Implement no login or authentication"],
    ["authenticationExpectation", "Implement neither login nor authentication"],
    ["authenticationExpectation", "Implement without login or authentication"],
    ["authenticationExpectation", "No login or authentication is approved"],
    ["integrations", "Implement no API or integration"],
    ["reportsDashboards", "Implement neither reports nor dashboards"],
    ["dataCollections", "Create no database or persistent data"]
  ])("preserves direct coordinated negation for %s: %s", (field, value) => {
    expect(polarities(field, value).every((polarity) => polarity === "negative")).toBe(true);
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(false);
  });

  it.each([
    "Implement no contact form, and booking form is approved",
    "Implement no contact form, and booking form, which is approved",
    "Implement no contact form, and booking form, which is required",
    "Implement no contact form, and booking form, which is requested",
    "Implement no contact form, and booking form, which is needed",
    "Implement no contact form, and booking form (which is approved)"
  ])("recognizes a bounded trailing positive predicate: %s", (value) => {
    expect(polarities("websiteForms", value)).toEqual(["negative", "positive"]);
  });

  it.each([
    "Booking form is not approved",
    "Booking form, which is not approved",
    "Booking form is excluded",
    "Booking form, which is excluded",
    "Booking form is outside scope",
    "Booking form (which is not approved)"
  ])("recognizes a bounded trailing negative predicate: %s", (value) => {
    expect(polarities("websiteForms", value)).toEqual(["negative"]);
  });
});

describe("Local relationships and trailing predicates", () => {
  it.each(fourthFamilies)("ends unrelated negative scope for %s", (field, value) => {
    const occurrences = classifyCapabilityOccurrences(field, value);
    const last = occurrences.at(-1)!;
    expect(last.polarity).toBe("positive");
    expect(last.end).toBe(value.length);
    expect(value.slice(last.start, last.end)).not.toBe("");
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it.each(fourthFamilies)("applies a trailing positive predicate for %s", (field, _, value) => {
    const occurrences = classifyCapabilityOccurrences(field, value);
    expect(occurrences.map(({ polarity }) => polarity)).toEqual(["negative", "positive"]);
    expect(value.slice(occurrences[1].end)).toMatch(/^ (?:is|are) (?:approved|required|requested|needed)$/);
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it.each(["affecting", "related to", "relating to", "regarding", "concerning", "in", "on", "through", "via", "within"])(
    "uses a relationship boundary after an intervening concern: %s", (relationship) => {
      expect(polarities("websiteForms", `Implement a workflow with no operational difficulties ${relationship} the booking form`)).toEqual(["positive"]);
    }
  );

  it.each(["is approved", "is required", "is requested", "is needed", "are approved", "are required", "are requested", "are needed"])(
    "classifies trailing %s before recording the occurrence", (predicate) => {
      expect(polarities("websiteForms", `Implement no contact form, and booking forms ${predicate}`)).toEqual(["negative", "positive"]);
    }
  );

  it.each<[WebsiteCapabilityField, string]>([
    ["websiteForms", "Implement the booking form with no validation errors"],
    ["websiteForms", "Implement the booking form with no errors in submission"],
    ["websiteForms", "Implement a workflow with no failures related to the booking form"],
    ["websiteForms", "Implement a workflow with no errors affecting an approved booking form"],
    ["websiteForms", "Implement the booking form without errors"],
    ["websiteAnalytics", "Implement analytics without errors"],
    ["dataCollections", "Create the customer database without data loss"],
    ["reportsDashboards", "Provide reports without personal information"],
    ["authenticationExpectation", "Implement authentication without anonymous access"],
    ["integrations", "Enable the API with no transmission errors"]
  ])("preserves positive %s despite an unrelated concern: %s", (field, value) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it.each<[WebsiteCapabilityField, string]>([
    ["websiteForms", "Implement no online booking form"],
    ["websiteForms", "Implement no modern accessible booking form"],
    ["websiteForms", "Implement no modern accessible online booking form"],
    ["integrations", "Implement without an external API"],
    ["dataCollections", "Create no persistent customer database"],
    ["authenticationExpectation", "Implement no organization authentication"],
    ["reportsDashboards", "Provide no monthly management report"],
    ["dataCollections", "Implement without persistent data in production"],
    ["websiteForms", "Booking form is not approved"],
    ["websiteForms", "Booking form is not required"],
    ["websiteForms", "Booking form is excluded"],
    ["websiteForms", "Booking form is outside scope"],
    ["websiteAnalytics", "Analytics are not approved"],
    ["dataCollections", "Customer database is not required"],
    ["websiteForms", "Implement no contact form, and no booking form is approved"],
    ["websiteForms", "Implement no contact form or booking form is approved"],
    ["websiteForms", "Implement no contact form, and booking form is not approved"],
    ["websiteForms", "No contact form is approved"],
    ["websiteForms", "Implement without a form regarding submissions"],
    ["websiteForms", "Implement without a form affecting submissions"]
  ])("preserves stronger direct or trailing negation for %s: %s", (field, value) => {
    expect(polarities(field, value).every((polarity) => polarity === "negative")).toBe(true);
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(false);
  });
});

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
  const selectedCases = [
    ...families,
    ...fourthFamilies.flatMap(([field, unrelated, trailing]) =>
      [unrelated, trailing].map((value): typeof families[number] => [field, "", value, families.find(([family]) => family === field)![3]])),
    ...fifthFamilies.flatMap(([field, unrelated, trailing, row]) =>
      [unrelated, trailing].map((value): typeof families[number] => [field, "", value, row]))
  ];
  it.each(selectedCases)("generates only the selected %s replacement with unchanged intake: %s %s", (field, _, replacement, row) => {
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
