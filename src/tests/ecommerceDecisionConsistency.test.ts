import { ecommerceDecisionState, ARCHITECTURE_KEYS, DEPLOYMENT_KEYS, PHASE_KEYS } from "../lib/ecommerceDecisions";
import { createEcommerceFixture } from "./helpers/ecommerce";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { deriveReviewItems, getClientReviewReadiness } from "../lib/clientReview";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { orphanMissingMarkers } from "../lib/canvasTraceability";
import { createExportManifest } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { projectTypeContentViolations } from "../lib/projectTypeContentValidation";
import { getProjectTypeFields } from "../data/projectTypes";
import { saveStorageState, loadStorageState } from "../lib/projectRepository";
import { createProject } from "../lib/createProject";

function generated(p = createEcommerceFixture()) {
  const result = generateProjectPackage(p);
  return {...p, generatedDocuments: result.documents, generatedFileCount: result.documents.length};
}
function approvedArchitecture() {
  const p = createEcommerceFixture();
  p.intake.ecommerceArchitecture = `Approved: ${ARCHITECTURE_KEYS.map(k => `${k}=fixture approved ${k}`).join(";")}`;
  p.intake.ecommerceDeployment = `Approved: ${DEPLOYMENT_KEYS.map(k => `${k}=fixture approved ${k}`).join(";")}`;
  p.intake.ecommercePhases = JSON.stringify([Object.fromEntries(PHASE_KEYS.map(k => [k, `Fixture approved ${k}`]))]);
  p.intake.ecommerceDecisions = "OQ-19 | architecture | Answered | Architecture approved? | Approved by fixture Architect | See approved contracts";
  return p;
}
describe("Ecommerce decisions and package consistency", () => {
  it("keeps every missing marker traceable and every decision visible", () => {
    const p = generated();
    expect(orphanMissingMarkers(p)).toEqual([]);
    const state = ecommerceDecisionState(p);
    expect(state.unresolved).toHaveLength(23);
    expect(deriveReviewItems(p).filter(i => i.id.startsWith("ecommerce-"))).toHaveLength(23);
  });
  it("uses the same counts/readiness in all documents and the manifest", () => {
    const p = generated();
    const state = ecommerceDecisionState(p);
    const readiness = evaluateGeneratedPackageReadiness(p);
    const manifest = createExportManifest(p, validateExportPackage(p));
    expect(manifest.readiness).toBe(readiness.status);
    expect(manifest.ecommerce?.unresolvedDecisionCount).toBe(state.unresolved.length);
    expect(manifest.missingInformationMarkerCount).toBe(readiness.missingMarkerCount);
    for (const doc of p.generatedDocuments) {
      expect(doc.content).toContain(`| Unresolved decisions | ${state.unresolved.length} |`);
      expect(doc.content).toContain(`| Missing markers | ${readiness.missingMarkerCount} |`);
      expect(doc.content).toContain(`| Package readiness | Draft |`);
    }
  });
  it("separates safe planning/implementation from launch decisions", () => {
    const p = approvedArchitecture();
    const state = ecommerceDecisionState(p);
    expect(state.planningReady).toBe(true);
    expect(state.implementationReady).toBe(true);
    expect(state.launchReady).toBe(false);
    expect(state.unresolved).toHaveLength(19);
    expect(getClientReviewReadiness(generated(p)).isReady).toBe(false);
  });
  it("requires approved answers and rejects checkbox-only question resolution", () => {
    const p = createEcommerceFixture();
    p.intake.ecommerceDecisions = "OQ-01 | launch | Answered | Threshold? | Claim only |";
    p.reviewItems = deriveReviewItems(p).map(i => ({...i, status: "Answered"}));
    expect(ecommerceDecisionState(p).unresolved.some(d => d.id === "OQ-01")).toBe(true);
    expect(deriveReviewItems(p).find(d => d.gateId === "OQ-01")?.status).toBe("Needs answer");
  });
  it("renders resolved legacy questions consistently without changing saved source requirements", () => {
    const p = approvedArchitecture();
    const original = p.intake.assumptions;
    const scope = generated(p).generatedDocuments.find(d => d.fileName === "PROJECT_SCOPE.md")!.content;
    expect(scope).toMatch(/OQ-19:[^\n]*Status: Answered/);
    expect(scope).not.toMatch(/OQ-19:[^\n]*Unanswered/);
    expect(p.intake.assumptions).toBe(original);
  });
  it("fails closed for malformed decision and phase contracts", () => {
    const p = approvedArchitecture();
    p.intake.ecommerceDecisions = "broken record";
    p.intake.ecommercePhases = '[{"objective":"Build"}]';
    p.intake.ecommerceArchitecture = "Approved: something";
    const ids = ecommerceDecisionState(p).implementationBlockers.map(d => d.id);
    expect(ids).toEqual(expect.arrayContaining(["EC-RECORD-1", "EC-PHASES", "EC-ARCHITECTURE"]));
  });
  it("does not infer cart scope from a branded-context selection", () => {
    const p = createEcommerceFixture(); p.intake.ecommerceCartScope = "";
    expect(ecommerceDecisionState(p).implementationBlockers.some(d => d.id === "EC-CART")).toBe(true);
    const documents = generated(p).generatedDocuments;
    for (const name of ["PROJECT_SCOPE.md","SCREEN_MAP.md","DATA_MODEL.md","WORKFLOW_MAP.md","ACCEPTANCE_CRITERIA.md","PHASED_CODEX_PROMPTS.md"]) {
      const text = documents.find(d => d.fileName === name)!.content;
      for (const route of ["/digitaldesigns","/3ddesigns","/apps","/petapparel"]) expect(text).toContain(route);
      expect(text).toContain("EC-CART");
    }
  });
  it("rejects duplicate or unsafe routes and missing brand/catalog context", () => {
    for (const routes of ["/apps | Apps | software\n/apps | Other | products", "/../admin | Apps | software", "/apps", "https://example.com | Apps | software"]) {
      const p = createEcommerceFixture(); p.intake.ecommerceRoutes = routes;
      expect(ecommerceDecisionState(p).implementationBlockers.some(d => d.id === "EC-ROUTES")).toBe(true);
    }
  });
  it("exposes ecommerce fields only for ecommerce and preserves old saved projects", () => {
    expect(getProjectTypeFields("ecommerceSite","Public-facing","features").some(f => f.name === "ecommerceCartScope")).toBe(true);
    expect(getProjectTypeFields("businessWebsite","Public-facing","features").some(f => f.name === "ecommerceCartScope")).toBe(false);
    const p = createEcommerceFixture();
    saveStorageState({ version: 1, activeProjectId: p.identity.id, projects: [p] }, window.localStorage);
    expect(loadStorageState().projects[0].intake.ecommerceRoutes).toBe(p.intake.ecommerceRoutes);
    expect(createProject({intake:{appType:"ecommerceSite"}}).intake.ecommerceCartScope).toBe("");
  });
  it("rejects contamination while preserving explicitly supplied source references", () => {
    const p = createEcommerceFixture();
    const doc = {fileName:"TEST_PLAN.md",folder:"08_Testing",content:"Use Power Apps Studio and verify ZIP export"};
    expect(projectTypeContentViolations(p,[doc])).toHaveLength(2);
    p.intake.constraints = "A comparison to Power Apps Studio is approved source context.";
    expect(projectTypeContentViolations(p,[{...doc,content:p.intake.constraints}])).toEqual([]);
    p.intake.appType = "powerAppsCanvas";
    expect(projectTypeContentViolations(p,[doc])).toEqual([]);
  });
});
