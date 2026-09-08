import { generateProjectPackage } from "../lib/generateProjectPackage";
import { websiteCapabilitySelected, websiteRequirement } from "../lib/websiteRequirements";
import type { WebsiteCapabilityField } from "../lib/websiteCapabilityIntent";
import { createNegativeCapabilityWebsite, websiteReviewDecision, withWebsiteReviews } from "./helpers/businessWebsite";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { validateExportPackage } from "../lib/exportIntegrity";
import { getClientReviewReadiness, deriveReviewItems } from "../lib/clientReview";
import { getOutstandingFields, validateIntake } from "../lib/validateIntake";
import { DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { PROJECT_TYPE_VALUES } from "../data/projectTypes";
import { createSeedProject } from "../data/seedProject";
import { expectedDocumentLocations } from "../lib/powerPlatform";
import type { ProjectRecord } from "../types/project";

const negativeCases: Array<[WebsiteCapabilityField, string]> = [
  ["websiteAnalytics", "No analytics platform is approved for Version 1."],
  ["websiteAnalytics", "No analytics are required."],
  ["websiteAnalytics", "Analytics are outside Version 1 scope."],
  ["websiteAnalytics", "Do not add analytics."],
  ["websiteAnalytics", "No tracking or marketing analytics."],
  ["dataCollections", "No database is required."],
  ["dataCollections", "Static site only. No persistent application data or database is required."],
  ["dataCollections", "No application data model is required."],
  ["dataCollections", "Static content only; no database."],
  ["dataCollections", "No data collections are required."],
  ["dataCollections", "No database is required. Provide static metadata."],
  ["dataEntities", "Static public content only; no database entities."],
  ["authenticationExpectation", "No authentication is required."],
  ["authenticationExpectation", "Public website with no login."],
  ["authenticationExpectation", "Public website. No login or authentication is required."],
  ["authenticationExpectation", "No user accounts."],
  ["authenticationExpectation", "Authentication is outside scope."],
  ["authenticationExpectation", "No access-control system is required."],
  ["websiteForms", "No forms are required."],
  ["websiteForms", "No contact form is approved."],
  ["websiteForms", "Forms are outside Version 1 scope."],
  ["integrations", "No integrations are required."],
  ["integrations", "No third-party integrations are approved."],
  ["integrations", "Integrations are outside Version 1 scope."],
  ["reportsDashboards", "No reports or dashboards are required."],
  ["reportsDashboards", "Reports and dashboards are outside Version 1 scope."]
];

const positiveCases: Array<[WebsiteCapabilityField, string, string]> = [
  ["websiteAnalytics", "Owner-approved analytics: navigation conversion events", "Approved analytics"],
  ["dataCollections", "Customer database: approved appointments", "Requested application data"],
  ["dataEntities", "Bookings and customer records", "Requested data entities"],
  ["authenticationExpectation", "Approved organization sign-in", "Requested access controls"],
  ["integrations", "Approved booking API for availability", "Requested integrations"],
  ["websiteForms", "Booking form: name, service and approved recipient", "Requested forms"],
  ["reportsDashboards", "Weekly service summary for the owner", "Requested reports"]
];

function generated(project = createNegativeCapabilityWebsite()): ProjectRecord {
  return { ...project, generatedDocuments: generateProjectPackage(project).documents, packageGeneratedAt: "2026-09-07T03:00:00.000Z" };
}
const content = (project: ProjectRecord, name: string) => project.generatedDocuments.find((doc) => doc.fileName === name)!.content;
const excludedRows = /Requested forms|Requested integrations|Approved analytics|Requested application data|Requested data entities|Requested access controls|Requested reports/;

describe("Third P1 reproducer", () => {
  it.each([
    ["No contact form is approved, implement name, email, and no online form", false],
    ["No contact form is approved, implement no contact form, and an approved booking form", true]
  ] as const)("classifies %s with selection %s", (value, selected) => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteForms = value;
    expect(websiteCapabilitySelected(project, "websiteForms")).toBe(selected);
  });
});

describe("Compound capability exclusion and replacement", () => {
  const replacements: Array<[WebsiteCapabilityField, string, string]> = [
    ["websiteForms", "No contact form is approved, implement an approved booking form", "Requested forms"],
    ["websiteAnalytics", "No analytics platform is approved, implement the approved replacement analytics service", "Approved analytics"],
    ["dataCollections", "No current database exists, create the approved customer database", "Requested application data"],
    ["dataCollections", "No database is required, create the approved customer database", "Requested application data"],
    ["reportsDashboards", "No reports are required, except provide the approved monthly service summary", "Requested reports"],
    ["integrations", "No integrations are approved, enable the approved booking API", "Requested integrations"],
    ["dataEntities", "No database entities are required, create approved customer records", "Requested data entities"],
    ["authenticationExpectation", "No login is approved, implement approved organization authentication", "Requested access controls"]
  ];

  it.each(replacements)("retains requested %s in compound prose: %s", (field, value, row) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
    expect(websiteRequirement(project, field).status).toBe("answered");
    const result = generated(project);
    expect(result.generatedDocuments.map(({ fileName, folder }) => ({ fileName, folder }))).toEqual(DOCUMENT_LOCATIONS);
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      expect(content(result, name)).toContain(row);
      for (const [, , other] of positiveCases.filter(([otherField]) => otherField !== field)) expect(content(result, name)).not.toContain(other);
    }
    const phase = content(result, "PHASED_CODEX_PROMPTS.md").split("Requested website services")[1].split("## Phase")[0];
    expect(phase).toContain(value);
    expect(project.intake[field]).toBe(value);
  });

  it.each([", ", ", and ", ", except ", ", instead ", " and ", " except ", " instead "])(
    "recognizes an explicit replacement after %s", (connector) => {
      const project = createNegativeCapabilityWebsite();
      project.intake.websiteForms = `No contact form is approved${connector}implement an approved booking form`;
      expect(websiteCapabilitySelected(project, "websiteForms")).toBe(true);
    }
  );

  it.each<[WebsiteCapabilityField, string]>([
    ["websiteForms", "No contact form is approved."],
    ["websiteAnalytics", "No analytics are required."],
    ["dataCollections", "No database is required."],
    ["websiteForms", "No forms are approved, including contact forms, booking forms, and enquiry forms."],
    ["websiteAnalytics", "No analytics are required, implement an approved booking form."],
    ["websiteForms", "No contact form is approved, do not implement a booking form."],
    ["websiteForms", "No contact form is approved, except provide no booking form."],
    ["websiteForms", "No contact form is approved, implement static navigation, no booking form is approved."],
    ["dataCollections", "No database is required, provide static metadata."]
  ])("retains exclusion of %s without a positive replacement: %s", (field, value) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(false);
  });

  it.each<[WebsiteCapabilityField, string]>([
    ["websiteAnalytics", "No errors are acceptable in analytics event delivery."],
    ["dataCollections", "No data loss is acceptable."]
  ])("does not treat unrelated negative wording as exclusion of %s", (field, value) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it.each(["Not applicable", "Deferred"] as const)("keeps structured %s authoritative over compound replacement", (status) => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteForms = replacements[0][1];
    project.reviewItems = [websiteReviewDecision({ fieldKey: "websiteForms", status, deferredReason: "Revisit after launch" })];
    expect(websiteCapabilitySelected(project, "websiteForms")).toBe(false);
  });

  it("preserves Static Website export integrity and contact deferral with a replacement form", () => {
    const project = createNegativeCapabilityWebsite();
    project.intake.appType = "staticWebsite";
    project.intake.websiteForms = replacements[0][1];
    const result = generated(project);
    expect(content(result, "TEST_PLAN.md")).toContain("Requested forms");
    expect(validateExportPackage(result).errors).toEqual([]);
    expect(deriveReviewItems(result).find((item) => item.fieldKey === "websiteContactMethod")?.status).toBe("Deferred");
    expect(evaluateGeneratedPackageReadiness(withWebsiteReviews(result)).status).toBe("Draft");
  });
});

describe("Request subjects, local negation and ordinary field lists", () => {
  const requested: Array<[WebsiteCapabilityField, string]> = [
    ["websiteForms", "No contact form is approved, implement name, email, and an approved booking form"],
    ["websiteForms", "No contact form is approved, implement name, email, phone, and a booking form"],
    ["websiteAnalytics", "No analytics platform is approved, implement page views, CTA events, and the approved replacement analytics service"],
    ["dataCollections", "No current database exists, create customer name, email, status, and the approved customer database"],
    ["dataEntities", "No database entities are required, create name, email, and the approved customer records"],
    ["reportsDashboards", "No reports are required, except provide totals, status, and the approved monthly service summary"],
    ["authenticationExpectation", "No login is approved, implement the approved organization authentication"],
    ["integrations", "No integrations are approved, enable the approved booking API"],
    ["websiteForms", "Implement name, email, phone, message, and an approved booking form"],
    ["websiteForms", "Implement an approved booking form without analytics"],
    ["websiteForms", "Implement neither analytics nor reports, but implement an approved booking form"],
    ["websiteForms", "Implement a booking form without a contact form"],
    ["websiteForms", "Implement no contact form, but keep an approved booking form"],
    ["websiteForms", "Implement no contact form, with an approved booking form"],
    ["websiteForms", "No analytics are required, implement name, email, and an approved booking form."],
    ["websiteForms", "Implement a booking form, do not add analytics"],
    ["websiteAnalytics", "Implement analytics without errors in event delivery"],
    ["dataCollections", "Create the customer database without data loss"],
    ["reportsDashboards", "Provide reports without personal information"],
    ["authenticationExpectation", "Implement authentication without anonymous access"],
    ["websiteAnalytics", "No errors are acceptable in analytics event delivery"],
    ["dataCollections", "No data loss is acceptable"],
    ["reportsDashboards", "Reports must not include personal information"],
    ["authenticationExpectation", "Authentication must not allow anonymous users"],
    ["authenticationExpectation", "No anonymous access; authenticated users are required"]
  ];
  const excluded: Array<[WebsiteCapabilityField, string]> = [
    ["websiteForms", "No contact form is approved, implement the booking flow without a form"],
    ["websiteForms", "No contact form is approved, implement the flow with no form"],
    ["websiteForms", "No contact form is approved, implement the workflow without any forms"],
    ["websiteForms", "No contact form is approved, implement neither a contact form nor a booking form"],
    ["websiteForms", "No contact form is approved, implement the process but not a booking form"],
    ["websiteForms", "No contact form is approved, implement static navigation, no booking form is approved"],
    ["websiteAnalytics", "No analytics are required, implement navigation without analytics"],
    ["dataCollections", "No database is required, implement static content without persistent data"],
    ["dataEntities", "Implement static content without database entities"],
    ["integrations", "Implement availability without an API"],
    ["authenticationExpectation", "Implement public navigation without authentication"],
    ["reportsDashboards", "Implement the workflow without reports or dashboards"],
    ["websiteForms", "implement the booking flow without a form"],
    ["websiteForms", "implement the flow with no form"],
    ["websiteForms", "implement the workflow without any contact form"],
    ["websiteForms", "implement neither a contact form nor a booking form"],
    ["websiteForms", "implement the process, but not a booking form"],
    ["websiteForms", "implement static navigation, no booking form is approved"],
    ["websiteForms", "Implement not a booking form"],
    ["websiteForms", "Implement static navigation, do not add a booking form"],
    ["websiteForms", "Implement static navigation, don't use a booking form"],
    ["websiteForms", "Implement static navigation, never enable a booking form"],
    ["websiteForms", "Implement a booking form that is not approved"],
    ["websiteForms", "No forms are approved, including contact forms, booking forms, and enquiry forms"],
    ["websiteAnalytics", "No analytics are required, implement name, email, and an approved booking form."],
    ["websiteAnalytics", "Implement navigation without forms or analytics"],
    ["websiteForms", "Implement neither analytics nor a booking form"],
    ["websiteForms", "Implement the booking workflow without a form, a contact form, or a booking form"]
  ];

  it.each(requested)("selects %s from its non-negated requirement: %s", (field, value) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it.each(excluded)("does not select locally negated %s: %s", (field, value) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(false);
  });

  it.each(positiveCases)("renders only selected %s for a request with ordinary commas", (field, _, row) => {
    const project = createNegativeCapabilityWebsite();
    const value = requested.find(([candidate]) => candidate === field)![1];
    Object.assign(project.intake, { [field]: value });
    const before = JSON.stringify(project);
    const result = generated(project);
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      expect(content(result, name)).toContain(row);
      for (const [, , other] of positiveCases.filter(([otherField]) => otherField !== field)) expect(content(result, name)).not.toContain(other);
    }
    const phase = content(result, "PHASED_CODEX_PROMPTS.md").split("Requested website services")[1].split("## Phase")[0];
    expect(phase).toContain(value);
    expect(result.generatedDocuments.map(({ fileName, folder }) => ({ fileName, folder }))).toEqual(DOCUMENT_LOCATIONS);
    expect(validateExportPackage(result).errors).toEqual([]);
    expect(JSON.stringify(project)).toBe(before);
    if (field === "dataCollections" || field === "dataEntities") {
      expect(content(result, "DATA_MODEL.md")).toContain("Application data is requested.");
      expect(websiteRequirement(project, "fields").level).toBe("required");
      expect(websiteRequirement(project, "keyFields").level).toBe("required");
    }
  });

  it.each(positiveCases)("omits implementation work for locally negated %s", (field) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: excluded.find(([candidate]) => candidate === field)![1] });
    const result = generated(project);
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) expect(content(result, name)).not.toMatch(excludedRows);
    expect(content(result, "PHASED_CODEX_PROMPTS.md")).not.toContain("Requested website services");
    expect(content(result, "DATA_MODEL.md")).toContain("No application database or persistent business data model is requested");
    expect(validateIntake(project).missingFields).toEqual([]);
    expect(validateExportPackage(result).errors).toEqual([]);
  });

  it.each(["Not applicable", "Deferred"] as const)("preserves structured %s before a comma-list request", (status) => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteForms = requested[0][1];
    project.reviewItems = [websiteReviewDecision({ fieldKey: "websiteForms", status, deferredReason: "Revisit after launch" })];
    expect(websiteCapabilitySelected(project, "websiteForms")).toBe(false);
    expect(content(generated(project), "PHASED_CODEX_PROMPTS.md")).not.toContain("Requested website services");
  });
});

describe("Website capability selection is separate from answered requirements", () => {
  it.each(negativeCases)("does not select %s from %s", (field, value) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteRequirement(project, field).status).toBe("answered");
    expect(websiteCapabilitySelected(project, field)).toBe(false);
  });

  it.each(positiveCases)("selects positive %s and includes only its optional work", (field, value, row) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
    const result = generated(project);
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      expect(content(result, name)).toContain(row);
      for (const [, , other] of positiveCases.filter(([otherField]) => otherField !== field)) expect(content(result, name)).not.toContain(other);
    }
    const phase = content(result, "PHASED_CODEX_PROMPTS.md").split("Requested website services")[1].split("## Phase")[0];
    expect(phase).toContain(value);
    expect(phase).not.toContain("No analytics platform");
  });

  it.each(["None", "N/A", "Not Applicable", "Not approved", "No"])("does not activate whole-field exclusion %s", (answer) => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteAnalytics = answer;
    expect(websiteCapabilitySelected(project, "websiteAnalytics")).toBe(false);
  });

  it.each(["Not applicable", "Deferred"] as const)("honors structured %s before positive prose", (status) => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteAnalytics = "Implement approved analytics";
    project.reviewItems = [websiteReviewDecision({ fieldKey: "websiteAnalytics", status, deferredReason: "Revisit after launch" })];
    expect(websiteCapabilitySelected(project, "websiteAnalytics")).toBe(false);
  });

  it("does not turn a structured Answered exclusion into approval", () => {
    const project = createNegativeCapabilityWebsite();
    project.reviewItems = [websiteReviewDecision({ fieldKey: "websiteAnalytics", status: "Answered" })];
    expect(websiteRequirement(project, "websiteAnalytics").status).toBe("answered");
    expect(websiteCapabilitySelected(project, "websiteAnalytics")).toBe(false);
  });

  it("preserves the latest non-gate decision and rejects an invalid N/A without granting scope", () => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteAnalytics = "Implement approved analytics";
    project.reviewItems = [
      websiteReviewDecision({ fieldKey: "websiteAnalytics", status: "Answered" }),
      websiteReviewDecision({ fieldKey: "websiteAnalytics", notApplicableReason: "", updatedAt: "2026-09-08T00:00:00.000Z" }),
      websiteReviewDecision({ fieldKey: "websiteAnalytics", status: "Answered", source: "gate", updatedAt: "2026-09-09T00:00:00.000Z" })
    ];
    expect(websiteRequirement(project, "websiteAnalytics").status).toBe("missing");
    expect(websiteCapabilitySelected(project, "websiteAnalytics")).toBe(false);
  });

  it("does not select blank or inapplicable capabilities", () => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteAnalytics = "  ";
    expect(websiteCapabilitySelected(project, "websiteAnalytics")).toBe(false);
    project.intake.appType = "game";
    project.intake.websiteForms = "Approved booking form";
    expect(websiteCapabilitySelected(project, "websiteForms")).toBe(false);
  });

  it("scopes exclusion and replacement clauses to the same capability", () => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteAnalytics = "No analytics are required. Implement an approved booking form.";
    expect(websiteCapabilitySelected(project, "websiteAnalytics")).toBe(false);
    project.intake.websiteForms = "No analytics are required. Implement an approved booking form.";
    expect(websiteCapabilitySelected(project, "websiteForms")).toBe(true);
  });

  it.each<[WebsiteCapabilityField, string]>([
    ["authenticationExpectation", "No anonymous access; authenticated users are required."],
    ["websiteAnalytics", "No existing analytics platform is suitable; implement the owner-approved replacement analytics service."],
    ["dataCollections", "No current database exists; create the approved customer database."],
    ["reportsDashboards", "None of the current reports meet the owner's needs; provide a service summary."],
    ["websiteAnalytics", "No errors are acceptable in analytics event delivery."],
    ["websiteAnalytics", "No analytics errors are acceptable."],
    ["dataCollections", "No data loss is acceptable."],
    ["reportsDashboards", "Reports must not include personal details."],
    ["websiteForms", "No contact forms; implement an approved booking form."],
    ["websiteAnalytics", "No analytics platform is suitable; implement the approved replacement analytics service."]
  ])("preserves positive %s despite negative words: %s", (field, value) => {
    const project = createNegativeCapabilityWebsite();
    Object.assign(project.intake, { [field]: value });
    expect(websiteCapabilitySelected(project, field)).toBe(true);
  });

  it("does not require application fields or roles for negative capability prose", () => {
    const project = createNegativeCapabilityWebsite();
    expect(validateIntake(project).missingFields).toEqual([]);
    for (const field of ["fields", "keyFields", "userRoles", "permissionRules"] as const) expect(websiteRequirement(project, field).level).toBe("optional");
  });

  it("still requires dependent definitions for positively requested data and access", () => {
    const project = createNegativeCapabilityWebsite();
    project.intake.dataEntities = "Bookings";
    project.intake.authenticationExpectation = "Organization sign-in";
    expect(validateIntake(project).missingFields.map(({ field }) => field)).toEqual(expect.arrayContaining(["fields", "keyFields", "userRoles", "permissionRules"]));
  });

  it("retains genuine required-field markers with negative optional capabilities", () => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websitePages = "";
    expect(content(generated(project), "SCREEN_MAP.md")).toContain("[MISSING: website pages]");
    expect(validateIntake(project).isValid).toBe(false);
  });
});

describe("Production-style negative website package regression", () => {
  it("generates the standard contract without mutation, false markers or integrity errors", () => {
    const project = createNegativeCapabilityWebsite();
    const before = JSON.stringify(project);
    const result = generated(project);
    expect(JSON.stringify(project)).toBe(before);
    expect(result.generatedDocuments.map(({ fileName, folder }) => ({ fileName, folder }))).toEqual(DOCUMENT_LOCATIONS);
    const readiness = evaluateGeneratedPackageReadiness(result);
    expect(readiness.missingMarkerCount).toBe(0);
    expect(readiness.orphanMarkerCount).toBe(0);
    expect(readiness.contentBlockers).toEqual([]);
    expect(validateExportPackage(result).errors).toEqual([]);
    expect(result.generatedDocuments.map((doc) => doc.content).join("\n")).not.toMatch(/Power Platform|Power Apps|Dataverse|Power Fx/);
  });

  it("renders no requested persistent data model while preserving the negative answers", () => {
    const result = generated();
    expect(content(result, "DATA_MODEL.md")).toContain("No application database or persistent business data model is requested");
    expect(content(result, "DATA_MODEL.md")).not.toContain("Application data is requested.");
    expect(content(result, "DATA_MODEL.md")).toContain(result.intake.dataCollections);
  });

  it.each(["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"])("omits excluded capability rows from %s", (name) => {
    const text = content(generated(), name);
    expect(text).not.toMatch(excludedRows);
    expect(text).toMatch(/Navigation and page structure[\s\S]*Owner acceptance/);
  });

  it("omits the services phase when all optional services are excluded or deferred", () => {
    const text = content(generated(), "PHASED_CODEX_PROMPTS.md");
    expect(text).not.toContain("Requested website services");
    expect(text.match(/^## Phase /gm)).toHaveLength(7);
  });

  it("keeps several positive capabilities without including excluded capabilities", () => {
    const project = createNegativeCapabilityWebsite();
    project.intake.websiteAnalytics = "Approved analytics for navigation";
    project.intake.integrations = "Approved booking API";
    const result = generated(project);
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      expect(content(result, name)).toMatch(/Requested integrations[\s\S]*Approved analytics/);
      expect(content(result, name)).not.toMatch(/Requested forms|Requested application data|Requested data entities|Requested access controls|Requested reports/);
    }
    expect(content(result, "PHASED_CODEX_PROMPTS.md")).toContain("Requested website services");
  });

  it("keeps contact deferred, manual gates unapproved, and no unanswered intake", () => {
    const result = generated();
    expect(getClientReviewReadiness(result).checklist.filter((item) => item.manual && !item.passed)).toHaveLength(3);
    expect(deriveReviewItems(result).find((item) => item.fieldKey === "websiteContactMethod")?.status).toBe("Deferred");
    expect(evaluateGeneratedPackageReadiness(withWebsiteReviews(result)).status).toBe("Draft");
    expect(getOutstandingFields(result)).toEqual([]);
    expect(content(result, "CLIENT_QUESTIONS.md")).toContain("No unanswered intake questions.");
  });

  it("does not activate services from descriptive sources alone", () => {
    const project = createNegativeCapabilityWebsite();
    project.intake.dataSources = "Owner's approved static content and photographs";
    expect(content(generated(project), "PHASED_CODEX_PROMPTS.md")).not.toContain("Requested website services");
    expect(content(generated(project), "DATA_MODEL.md")).toContain(project.intake.dataSources);
  });

  it("applies the same correction to Static Website", () => {
    const project = createNegativeCapabilityWebsite();
    project.intake.appType = "staticWebsite";
    expect(content(generated(project), "TEST_PLAN.md")).not.toMatch(excludedRows);
  });

  it.each(PROJECT_TYPE_VALUES.filter((type) => type !== "businessWebsite" && type !== "staticWebsite"))("preserves the existing %s document family", (type) => {
    const project = createSeedProject();
    project.intake.appType = type;
    const result = generated(project);
    expect(result.generatedDocuments.map(({ fileName, folder }) => ({ fileName, folder }))).toEqual(expectedDocumentLocations(project));
    expect(content(result, "DATA_MODEL.md")).toContain("Service requests");
    if (type === "powerAppsCanvas" || type === "powerAppsModelDriven") expect(content(result, "CODEX_INSTRUCTIONS.md")).toMatch(/Power Fx|model-driven/i);
  });
});
