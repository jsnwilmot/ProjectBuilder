import { generateProjectPackage } from "../lib/generateProjectPackage";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { createBusinessWebsite, createUmbrellaWebsite, websiteReviewDecision, withWebsiteReviews } from "./helpers/businessWebsite";
import { deriveReviewItems, getClientReviewReadiness } from "../lib/clientReview";
import { getOutstandingFields, validateIntake } from "../lib/validateIntake";
import { traceMissingMarkers } from "../lib/canvasTraceability";
import { validateExportPackage } from "../lib/exportIntegrity";
import { createProjectArchive, getExpectedArchivePaths } from "../lib/exportProjectPackage";
import { loadStorageState, saveStorageState } from "../lib/projectRepository";
import { createSeedProject } from "../data/seedProject";
import { PROJECT_TYPE_VALUES } from "../data/projectTypes";
import { DOCUMENT_LOCATIONS } from "../data/folderStructure";
import { expectedDocumentLocations } from "../lib/powerPlatform";
import type { ProjectInputField, ProjectRecord } from "../types/project";
import JSZip from "jszip";

function generated(project = withWebsiteReviews()): ProjectRecord {
  const result = generateProjectPackage(project);
  return { ...project, generatedDocuments: result.documents, generatedFileCount: result.documents.length, packageGeneratedAt: "2026-09-06T18:00:00.000Z" };
}

function documentContent(project: ProjectRecord, name: string): string {
  return project.generatedDocuments.find((doc) => doc.fileName === name)!.content;
}

describe("Business Website package generation", () => {
  it("uses the recorded website deployment decisions without platform-specific requirements", () => {
    const project = createBusinessWebsite();
    const content = generateProjectPackage(project).documents.find((doc) => doc.fileName === "DEPLOYMENT_NOTES.md")!.content;
    expect(content).toContain(project.intake.hostingStatus);
    expect(content).not.toMatch(/publisher prefix|connection references|Power Platform solutions/i);
  });

  it("does not invent missing application requirements for a reviewed public website", () => {
    const project = withWebsiteReviews();
    const result = generateProjectPackage(project);
    const readiness = evaluateGeneratedPackageReadiness(project, result.documents);
    expect(readiness.missingMarkerCount).toBe(0);
    expect(readiness.blockers).toEqual([]);
  });

  it("writes a client test plan instead of testing the package builder", () => {
    const content = generateProjectPackage(createBusinessWebsite()).documents.find((doc) => doc.fileName === "TEST_PLAN.md")!.content;
    expect(content).toMatch(/navigation/i);
    expect(content).not.toMatch(/Project Builder|intake persistence|package generation|ZIP export|document regeneration/i);
  });

  it("uses alternate hosting, source control, repository, domain and generator answers", () => {
    const project = createBusinessWebsite();
    project.intake.hostingStatus = "Cloudflare Pages; GitHub; workshop/public-site; https://github.com/workshop/public-site; production branch main; Eleventy";
    project.intake.domainStatus = "workshop.example";
    project.intake.targetPlatform = "Static site generated with Eleventy";
    const content = documentContent(generated(project), "DEPLOYMENT_NOTES.md");
    for (const value of ["Cloudflare Pages", "GitHub", "workshop/public-site", "https://github.com/workshop/public-site", "workshop.example", "Eleventy", "branch main"]) expect(content).toContain(value);
    expect(content).not.toMatch(/Netlify|Astro|GitLab|npm.cmd/i);
  });

  it("respects a saved Not Applicable report decision in every affected document and review", () => {
    const project = withWebsiteReviews();
    project.reviewItems = [websiteReviewDecision()];
    const result = generated(project);
    for (const name of ["PROJECT_SCOPE.md", "CLIENT_REQUIREMENTS.md", "APP_BLUEPRINT.md"]) {
      expect(documentContent(result, name)).toContain("Not applicable — Reporting is outside");
      expect(documentContent(result, name)).not.toMatch(/\[MISSING: reports/i);
    }
    expect(getClientReviewReadiness(result).blockers).toEqual([]);
    expect(getOutstandingFields(result)).not.toContain("reportsDashboards");
    expect(deriveReviewItems(result).find((item) => item.fieldKey === "reportsDashboards")?.status).toBe("Not applicable");
  });

  it.each(["Not Applicable", "N/A", "None"])("recognizes the explicit %s answer without adding scope", (answer) => {
    const project = withWebsiteReviews();
    project.intake.reportsDashboards = answer;
    const result = generated(project);
    expect(documentContent(result, "PROJECT_SCOPE.md")).toContain(`Not applicable — ${answer}`);
    expect(evaluateGeneratedPackageReadiness(result).missingMarkerCount).toBe(0);
  });

  it("does not classify a requirement containing the word None as N/A", () => {
    const project = createBusinessWebsite();
    project.intake.reportsDashboards = "None of the current reports meet the owner's needs; provide a service summary.";
    const result = generated(project);
    expect(documentContent(result, "PROJECT_SCOPE.md")).toContain(project.intake.reportsDashboards);
    expect(documentContent(result, "TEST_PLAN.md")).toContain("Requested reports");
  });

  it("does not count blank optional application or branding fields as intake gaps", () => {
    const project = withWebsiteReviews();
    expect(validateIntake(project).missingFields).toEqual([]);
    expect(getOutstandingFields(project)).toEqual([]);
    const result = generated(project);
    for (const name of ["DATA_MODEL.md", "SCREEN_MAP.md", "WORKFLOW_MAP.md", "SECURITY_MODEL.md", "BRAND_GUIDE.md"]) {
      expect(documentContent(result, name)).not.toContain("[MISSING:");
    }
    expect(documentContent(result, "DATA_MODEL.md")).toContain("No application database or persistent business data model is requested");
    expect(documentContent(result, "SECURITY_MODEL.md")).toContain("Not applicable — None");
  });

  it("maps a single page to its recorded sections without requiring app screens", () => {
    const result = generated();
    expect(documentContent(result, "SCREEN_MAP.md")).toContain(result.intake.websitePages);
    expect(deriveReviewItems(result).some((item) => item.fieldKey === "screens" && item.status === "Needs answer")).toBe(false);
  });

  it("writes client acceptance criteria with feature and success-condition evidence", () => {
    const result = generated();
    const content = documentContent(result, "ACCEPTANCE_CRITERIA.md");
    expect(content).toContain(result.intake.successCriteria);
    expect(content).toContain(result.intake.acceptanceNotes);
    expect(content).not.toMatch(/Project Builder|package generation|export|persistence|Mission Control/i);
  });

  it.each(["ARCHITECT_INSTRUCTIONS.md", "CODEX_INSTRUCTIONS.md", "PHASED_CODEX_PROMPTS.md"])("keeps %s aligned with website architecture", (name) => {
    const content = documentContent(generated(), name);
    expect(content).toContain("Astro");
    expect(content).not.toMatch(/Power Platform|Power Apps|Power Fx|Power Automate|Dataverse|publisher|connection references|PCF/i);
  });

  it("includes requested forms, integrations and analytics only when selected", () => {
    const project = createBusinessWebsite();
    const basic = generated(project);
    expect(documentContent(basic, "TEST_PLAN.md")).not.toMatch(/Requested forms|Requested integrations|Approved analytics/);
    project.intake.websiteForms = "Booking form: name and requested service; approved processor; confirmation on success";
    project.intake.integrations = "Approved booking API for availability";
    project.intake.websiteAnalytics = "Owner-approved analytics: booking conversion events";
    const result = generated(project);
    expect(documentContent(result, "TEST_PLAN.md")).toMatch(/Requested forms[\s\S]*Requested integrations[\s\S]*Approved analytics/);
    expect(documentContent(result, "PHASED_CODEX_PROMPTS.md")).toContain("Requested website services");
    expect(documentContent(result, "CLIENT_REQUIREMENTS.md")).toContain(project.intake.websiteForms);
  });

  it("requires real field and access definitions when a website opts into application capabilities", () => {
    const project = createBusinessWebsite();
    project.intake.dataCollections = "Bookings";
    project.intake.authenticationExpectation = "Approved organization sign-in";
    const missing = validateIntake(project).missingFields.map((issue) => issue.field);
    expect(missing).toEqual(expect.arrayContaining(["fields", "keyFields", "userRoles", "permissionRules"]));
    const result = generated(project);
    expect(documentContent(result, "DATA_MODEL.md")).toContain("[MISSING: fields]");
    expect(documentContent(result, "SECURITY_MODEL.md")).toContain("[MISSING: permission rules]");
  });

  it("does not turn a deferred data architecture decision into missing table details", () => {
    const project = withWebsiteReviews();
    project.intake.dataCollections = "Database decision TBD by the owner before implementation.";
    const result = generated(project);
    expect(evaluateGeneratedPackageReadiness(result).missingMarkerCount).toBe(0);
    expect(evaluateGeneratedPackageReadiness(result).status).toBe("Draft");
    expect(documentContent(result, "DATA_MODEL.md")).toContain("Deferred — Database decision TBD");
  });

  it("preserves selected website search and service-area details without inventing defaults", () => {
    const project = createBusinessWebsite();
    project.intake.serviceArea = "Owner-defined service area: North Harbour";
    project.intake.googleBusinessProfile = "Existing owner-managed profile; no new profile setup";
    const content = documentContent(generated(project), "CLIENT_REQUIREMENTS.md");
    expect(content).toContain(project.intake.serviceArea);
    expect(content).toContain(project.intake.googleBusinessProfile);
    expect(content).toContain(project.intake.seoKeywords);
  });

  it("preserves an explicit owner TBD in legacy contact prose as a before-implementation action", () => {
    const project = withWebsiteReviews();
    project.intake.websiteContactMethod = "Contact section planned. Contact method and business contact details TBD by Project Owner before implementation.";
    const before = JSON.stringify(project);
    const result = generated(project);
    expect(JSON.stringify(project)).toBe(before);
    expect(validateIntake(result).isValid).toBe(true);
    expect(deriveReviewItems(result).find((item) => item.fieldKey === "websiteContactMethod")?.status).toBe("Deferred");
    for (const name of ["CLIENT_QUESTIONS.md", "HANDOFF_CHECKLIST.md", "NEXT_STEPS.md", "PROJECT_SCOPE.md", "CODEX_INSTRUCTIONS.md"]) {
      expect(documentContent(result, name)).toContain(`Deferred — ${project.intake.websiteContactMethod}`);
    }
    const readiness = evaluateGeneratedPackageReadiness(result);
    expect(readiness.missingMarkerCount).toBe(0);
    expect(readiness.status).toBe("Draft");
    expect(readiness.blockers).toContain("Content: Contact method");
  });

  it("retains structured allowed future deferrals without a missing marker or implementation blocker", () => {
    const project = withWebsiteReviews();
    project.reviewItems = [websiteReviewDecision({ status: "Deferred", notApplicableReason: "", deferredReason: "Owner will revisit reporting after launch." })];
    const result = generated(project);
    expect(documentContent(result, "CLIENT_QUESTIONS.md")).toContain("Deferred — Owner will revisit reporting after launch.");
    expect(evaluateGeneratedPackageReadiness(result).status).toBe("Ready for Codex");
  });

  it("blocks a before-implementation deferral even when the original warning allowed deferral", () => {
    const project = withWebsiteReviews();
    project.reviewItems = [websiteReviewDecision({ status: "Deferred", notApplicableReason: "", deferredReason: "Deferred by the owner until before implementation." })];
    const result = generated(project);
    expect(evaluateGeneratedPackageReadiness(result).status).toBe("Draft");
    expect(evaluateGeneratedPackageReadiness(result).missingMarkerCount).toBe(0);
  });

  it("requires reasons for review N/A and deferred decisions", () => {
    const project = withWebsiteReviews();
    project.reviewItems = [websiteReviewDecision({ notApplicableReason: "" })];
    expect(evaluateGeneratedPackageReadiness(generated(project)).missingMarkerCount).toBeGreaterThan(0);
    project.reviewItems = [websiteReviewDecision({ status: "Deferred", notApplicableReason: "", deferredReason: "" })];
    expect(getClientReviewReadiness(generated(project)).isReady).toBe(false);
  });

  it.each<ProjectInputField>(["appPurpose", "websitePages", "contentSource", "seoKeywords", "successCriteria"])("still marks genuinely missing %s and traces its editable source", (field) => {
    const project = withWebsiteReviews();
    project.intake[field as keyof typeof project.intake] = "";
    const result = generated(project);
    expect(validateIntake(project).missingFields.map((issue) => issue.field)).toContain(field);
    expect(evaluateGeneratedPackageReadiness(result).status).toBe("Draft");
    const traces = traceMissingMarkers(result).filter((trace) => trace.editableField === field);
    expect(traces.length).toBeGreaterThan(0);
    expect(traces.every((trace) => trace.canEditSource && !trace.orphan)).toBe(true);
    expect(evaluateGeneratedPackageReadiness(result).orphanMarkerCount).toBe(0);
  });

  it("does not let a stale Answered review suppress a newly cleared required field", () => {
    const project = withWebsiteReviews();
    project.intake.websitePages = "";
    project.reviewItems = deriveReviewItems(project).map((item) => ({ ...item, status: "Answered" }));
    expect(getClientReviewReadiness(project).isReady).toBe(false);
    expect(deriveReviewItems(project).find((item) => item.fieldKey === "websitePages")?.status).toBe("Needs answer");
  });

  it("retains the three manual client review gates", () => {
    const result = generated(createBusinessWebsite());
    expect(getClientReviewReadiness(result).checklist.filter((item) => item.manual && !item.passed).map((item) => item.id))
      .toEqual(["scopeReviewed", "acceptanceCriteriaReviewed", "draftPackageReviewed"]);
    expect(evaluateGeneratedPackageReadiness(result).missingMarkerCount).toBe(0);
    expect(evaluateGeneratedPackageReadiness(result).status).toBe("Draft");
  });

  it("disables navigation for obsolete platform sources and explains regeneration", () => {
    const project = createBusinessWebsite();
    const traces = traceMissingMarkers(project, [{ fileName: "DEPLOYMENT_NOTES.md", folder: "09_Deployment", content: "[MISSING: deployment method]\n[MISSING: source control approach]" }]);
    expect(traces).toHaveLength(2);
    expect(traces.every((trace) => trace.canEditSource === false && trace.reasonRejected.includes("Regenerate"))).toBe(true);
  });

  it("regenerates stale report markers from current review decisions without rewriting saved intake", () => {
    const project = withWebsiteReviews();
    project.reviewItems = [websiteReviewDecision()];
    project.generatedDocuments = [{ fileName: "PROJECT_SCOPE.md", folder: "00_Project_Overview", content: "[MISSING: reports or dashboards]" }];
    const before = JSON.stringify(project);
    expect(evaluateGeneratedPackageReadiness(generated(project)).missingMarkerCount).toBe(0);
    expect(JSON.stringify(project)).toBe(before);
  });

  it("preserves saved website intake and review decisions through the existing storage format", () => {
    const project = withWebsiteReviews();
    project.reviewItems = [websiteReviewDecision()];
    saveStorageState({ version: 1, activeProjectId: project.identity.id, projects: [project] }, window.localStorage);
    const restored = loadStorageState(window.localStorage).projects[0];
    expect(restored.intake).toEqual(project.intake);
    expect(restored.reviewItems).toEqual(project.reviewItems);
    expect(evaluateGeneratedPackageReadiness(generated(restored)).missingMarkerCount).toBe(0);
  });

  it("preserves all 19 documents, archive paths, manifests and integrity checks", async () => {
    const project = generated();
    expect(project.generatedDocuments.map(({ fileName, folder }) => ({ fileName, folder }))).toEqual(DOCUMENT_LOCATIONS);
    expect(validateExportPackage(project).errors).toEqual([]);
    const blob = await createProjectArchive(project, { exportedAt: "2026-09-06T18:00:00.000Z" });
    const bytes = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blob);
    });
    const archive = await JSZip.loadAsync(bytes);
    expect(Object.keys(archive.files)).toEqual(getExpectedArchivePaths(project));
    const manifest = JSON.parse(await archive.file("harbour-studio-website/project-manifest.json")!.async("string"));
    expect(manifest.generatedDocumentCount).toBe(19);
    project.generatedDocuments.pop();
    expect(validateExportPackage(project).isValid).toBe(false);
  });

  it("supports the static website preset with the same applicable website requirements", () => {
    const project = withWebsiteReviews();
    project.intake.appType = "staticWebsite";
    const result = generated(project);
    expect(evaluateGeneratedPackageReadiness(result).missingMarkerCount).toBe(0);
    expect(result.generatedDocuments).toHaveLength(19);
  });

  it("regresses the umbrella-site scenario without fabricating contact data or clearing review gates", () => {
    const result = generated(createUmbrellaWebsite());
    const readiness = evaluateGeneratedPackageReadiness(result);
    expect(result.generatedDocuments).toHaveLength(19);
    expect(readiness.missingMarkerCount).toBe(0);
    expect(readiness.orphanMarkerCount).toBe(0);
    expect(readiness.status).toBe("Draft");
    expect(readiness.contentBlockers).toEqual([]);
    expect(validateExportPackage(result).errors).toEqual([]);
    expect(readiness.blockers).toContain("Content: Contact method");
    expect(getClientReviewReadiness(result).checklist.filter((item) => item.manual && !item.passed)).toHaveLength(3);
    const deployment = documentContent(result, "DEPLOYMENT_NOTES.md");
    for (const value of ["Cloudflare Pages", "GitHub", "example-org/umbrella-site", "collective.example", "Eleventy"]) expect(deployment).toContain(value);
    expect(result.generatedDocuments.map((doc) => doc.content).join("\n")).not.toMatch(/Power Platform|Power Apps|Power Fx|Dataverse|publisher prefix|connection references/i);
    expect(documentContent(result, "BRAND_GUIDE.md")).toContain(result.intake.approvedAssets);
    expect(documentContent(result, "NEXT_STEPS.md")).toContain(result.intake.websiteContactMethod);
  });

  it.each(PROJECT_TYPE_VALUES.filter((type) => type !== "businessWebsite" && type !== "staticWebsite"))("preserves %s generation and the applicable document contract", (type) => {
    const project = createSeedProject();
    project.intake.appType = type;
    const result = generateProjectPackage(project);
    expect(result.documents.map(({ fileName, folder }) => ({ fileName, folder }))).toEqual(expectedDocumentLocations(project));
    expect(result.documents.every((doc) => doc.content.trim())).toBe(true);
    expect(result.documents.find((doc) => doc.fileName === "DATA_MODEL.md")!.content).toContain("Service requests");
    if (type === "powerAppsCanvas" || type === "powerAppsModelDriven") {
      expect(result.documents.find((doc) => doc.fileName === "CODEX_INSTRUCTIONS.md")!.content).toMatch(/Power Fx|model-driven/i);
    }
  });
});
