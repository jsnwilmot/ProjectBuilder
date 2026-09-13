import { createExportManifest } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { getDocumentReviewStatus } from "../lib/documentReview";
import { ecommerceDecisionState, ecommerceReviewItems, ARCHITECTURE_KEYS, DEPLOYMENT_KEYS, PHASE_KEYS } from "../lib/ecommerceDecisions";
import { orphanMissingMarkers } from "../lib/canvasTraceability";
import { validateIntake } from "../lib/validateIntake";
import { websiteRequirement } from "../lib/websiteRequirements";
import { deriveReviewItems, updateReviewItemDecision } from "../lib/clientReview";
import { getProjectTypeFields } from "../data/projectTypes";
import { createEcommerceFixture } from "./helpers/ecommerce";
import type { ProjectRecord } from "../types/project";

const architecture = () => `Approved: ${ARCHITECTURE_KEYS.map(key => `${key}=approved ${key}`).join(";")}`;
const deployment = () => `Approved: ${DEPLOYMENT_KEYS.map(key => `${key}=approved ${key}`).join(";")}`;
const phases = () => JSON.stringify([Object.fromEntries(PHASE_KEYS.map(key => [key, `Approved ${key}`]))]);

function configured(): ProjectRecord {
  const project = createEcommerceFixture();
  project.intake.assumptions = "";
  project.intake.ecommerceDecisions = "";
  project.intake.ecommerceStorefrontModel = "Single merchant with multiple branded storefront contexts";
  project.intake.ecommerceCartScope = "Shared cross-context cart";
  project.intake.ecommerceArchitecture = architecture();
  project.intake.ecommerceDeployment = deployment();
  project.intake.ecommercePhases = phases();
  return project;
}

function generated(project: ProjectRecord): ProjectRecord {
  const result = generateProjectPackage(project);
  return { ...project, generatedDocuments: result.documents, generatedFileCount: result.documents.length };
}

function document(project: ProjectRecord, fileName: string) {
  return project.generatedDocuments.find(candidate => candidate.fileName === fileName)!;
}

describe("PR #6 validation-boundary remediation regressions", () => {
  it("rejects unresolved tokens anywhere in implementation-gating configuration", () => {
    const cases: Array<[keyof ProjectRecord["intake"], string, string]> = [
      ["ecommerceStorefrontModel", "TBD marketplace", "EC-STOREFRONTS"],
      ["ecommerceStorefrontModel", "TBC marketplace", "EC-STOREFRONTS"],
      ["ecommerceStorefrontModel", "Marketplace pending", "EC-STOREFRONTS"],
      ["ecommerceCartScope", "Shared cross-context cart — unconfirmed", "EC-CART"],
      ["ecommerceCartScope", "Separate carts pending approval", "EC-CART"],
      ["ecommerceRoutes", "/tbd | Digital Designs | digital catalog", "EC-ROUTES"],
      ["ecommerceRoutes", "/apps | Pending brand | software catalog", "EC-ROUTES"],
      ["ecommerceRoutes", "/apps | Applications | TBD catalog", "EC-ROUTES"],
      ["ecommerceRoutes", "/apps | N/A | software catalog", "EC-ROUTES"],
      ["ecommerceRoutes", "/apps | Applications | software | extra", "EC-ROUTES"],
      ["ecommerceArchitecture", architecture().replace("backend=approved backend", "backend=TBD API"), "EC-ARCHITECTURE"],
      ["ecommerceDeployment", deployment().replace("DNS=approved DNS", "DNS=production pending"), "EC-DEPLOYMENT"],
      ["ecommercePhases", JSON.stringify([{ ...Object.fromEntries(PHASE_KEYS.map(key => [key, `Approved ${key}`])), objective: "TBD storefront build" }]), "EC-PHASES"]
    ];

    for (const [field, value, blocker] of cases) {
      const project = configured();
      (project.intake as unknown as Record<string, string>)[field] = value;
      expect(ecommerceDecisionState(project).implementationBlockers.map(item => item.id), `${field}: ${value}`).toContain(blocker);
    }
  });

  it("clears only the blocker whose structured source becomes valid", () => {
    const project = configured();
    project.intake.ecommerceStorefrontModel = "TBD marketplace";
    project.intake.ecommerceCartScope = "Separate carts pending";
    project.intake.ecommerceRoutes = "/pending | Pending | TBD";
    expect(ecommerceDecisionState(project).implementationBlockers.map(item => item.id)).toEqual(expect.arrayContaining([
      "EC-STOREFRONTS", "EC-CART", "EC-ROUTES"
    ]));

    project.intake.ecommerceStorefrontModel = "Marketplace";
    const blockers = ecommerceDecisionState(project).implementationBlockers.map(item => item.id);
    expect(blockers).not.toContain("EC-STOREFRONTS");
    expect(blockers).toEqual(expect.arrayContaining(["EC-CART", "EC-ROUTES"]));
  });

  it("accepts only canonical storefront and cart choices and exact complete route rows", () => {
    const foundationField = getProjectTypeFields("ecommerceSite", "Public-facing", "foundation")
      .find(field => field.name === "ecommerceStorefrontModel");
    const cartField = getProjectTypeFields("ecommerceSite", "Public-facing", "features")
      .find(field => field.name === "ecommerceCartScope");
    expect(foundationField).toMatchObject({ inputType: "select", options: ["Unified storefront", "Single merchant with multiple branded storefront contexts", "Marketplace"] });
    expect(cartField).toMatchObject({ inputType: "select", options: ["Shared cross-context cart", "Separate carts"] });
    for (const value of ["Unified storefront", "Single merchant with multiple branded storefront contexts", "Marketplace"]) {
      const project = configured();
      project.intake.ecommerceStorefrontModel = value;
      expect(ecommerceDecisionState(project).implementationBlockers.map(item => item.id)).not.toContain("EC-STOREFRONTS");
    }
    for (const value of ["Shared cross-context cart", "Separate carts"]) {
      const project = configured();
      project.intake.ecommerceCartScope = value;
      expect(ecommerceDecisionState(project).implementationBlockers.map(item => item.id)).not.toContain("EC-CART");
    }
    const project = configured();
    project.intake.ecommerceRoutes = "/digitaldesigns | Digital Designs | digital catalog\n/apps | Applications | software catalog";
    expect(ecommerceDecisionState(project).implementationBlockers.map(item => item.id)).not.toContain("EC-ROUTES");
  });

  it("preserves the first explicit decision and emits a deterministic blocker for a duplicate ID", () => {
    const architectureDuplicate = configured();
    architectureDuplicate.intake.ecommerceDecisions = [
      "OQ-50 | architecture | Answered | Runtime choice? | Approved | First approved answer",
      "OQ-50 | architecture | Answered | Runtime choice changed? | Approved | Second answer must not overwrite"
    ].join("\n");
    const architectureState = ecommerceDecisionState(architectureDuplicate);
    expect(architectureState.decisions.find(item => item.id === "OQ-50")?.answer).toBe("First approved answer");
    expect(architectureState.implementationBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "EC-RECORD-2", field: "ecommerceDecisions", reason: expect.stringMatching(/duplicate.*OQ-50.*line 2/i) })
    ]));

    const launchDuplicate = configured();
    launchDuplicate.intake.ecommerceDecisions = [
      "OQ-51 | launch | Answered | Shipping owner? | Approved | Operations",
      "OQ-51 | launch | Answered | Shipping owner changed? | Approved | Fulfillment"
    ].join("\n");
    const launchState = ecommerceDecisionState(launchDuplicate);
    expect(launchState.implementationReady).toBe(true);
    expect(launchState.launchReady).toBe(false);
    expect(launchState.launchBlockers.map(item => item.id)).toContain("EC-RECORD-2");
  });

  it("allows one explicit record to replace its imported legacy OQ record", () => {
    const project = configured();
    project.intake.assumptions = "OQ-01: What threshold applies? Unanswered; deferred pending client decision.";
    project.intake.ecommerceDecisions = "OQ-01 | launch | Answered | What threshold applies? | Approved by owner | CAD 125 before tax";
    const matching = ecommerceDecisionState(project).decisions.filter(item => item.id === "OQ-01");
    expect(matching).toHaveLength(1);
    expect(matching[0]).toMatchObject({ status: "Answered", answer: "CAD 125 before tax" });
    expect(ecommerceDecisionState(project).decisions.some(item => item.id.startsWith("EC-RECORD-"))).toBe(false);
  });

  it.each([
    ["workflowSteps", "EC-FIELD-WORKFLOW-STEPS", "WORKFLOW_MAP.md", "steps"],
    ["userRoles", "EC-FIELD-USER-ROLES", "SECURITY_MODEL.md", "user roles"],
    ["dataCollections", "EC-FIELD-DATA-COLLECTIONS", "DATA_MODEL.md", "tables, lists, or collections"]
  ] as const)("keeps a missing required ecommerce %s field synchronized and traceable", (field, decisionId, fileName, marker) => {
    const project = configured();
    project.intake[field] = "";
    expect(validateIntake(project).missingFields.map(item => item.field)).toContain(field);

    const rendered = generated(project);
    const state = ecommerceDecisionState(rendered);
    const readiness = evaluateGeneratedPackageReadiness(rendered);
    const manifest = createExportManifest(rendered, validateExportPackage(rendered));
    const questions = document(rendered, "CLIENT_QUESTIONS.md").content;

    expect(state.implementationBlockers.map(item => item.id)).toContain(decisionId);
    expect(ecommerceReviewItems(rendered, rendered.updatedAt).find(item => item.gateId === decisionId)).toMatchObject({
      fieldKey: field,
      resolutionMode: "source"
    });
    expect(questions).toContain(`[MISSING: ${decisionId}]`);
    expect(questions).toContain(`source: ${field}`);
    expect(document(rendered, fileName).content.toLowerCase()).toContain(`[missing: ${marker}]`);
    expect(getDocumentReviewStatus(document(rendered, fileName), rendered)).toBe("Draft");
    expect(orphanMissingMarkers(rendered)).toEqual([]);
    expect(readiness.status).toBe("Draft");
    expect(manifest.ecommerce?.unresolvedDecisionCount).toBe(state.unresolved.length);
    expect(manifest.ecommerce?.implementationBlockingDecisionCount).toBe(state.implementationBlockers.length);
    expect(manifest.missingInformationMarkerCount).toBe(readiness.missingMarkerCount);
  });

  it("does not manufacture required-field blockers for populated or genuinely optional ecommerce fields", () => {
    const project = configured();
    project.intake.testimonials = "";
    const ids = ecommerceDecisionState(project).decisions.map(item => item.id);
    expect(ids).not.toContain("EC-FIELD-WORKFLOW-STEPS");
    expect(ids).not.toContain("EC-FIELD-USER-ROLES");
    expect(ids).not.toContain("EC-FIELD-DATA-COLLECTIONS");
    expect(ids).not.toContain("EC-FIELD-TESTIMONIALS");
    expect(websiteRequirement(project, "testimonials").status).toBe("optional");
  });

  it("cannot conceal a blank ecommerce source with stored or direct review edits", () => {
    const project = configured();
    project.intake.workflowSteps = "";
    const initial = deriveReviewItems(project);
    const ordinary = initial.find(item => item.fieldKey === "workflowSteps" && !item.id.startsWith("ecommerce-"))!;
    project.reviewItems = initial.map(item => item.id === ordinary.id ? { ...item, status: "Answered" as const } : item);

    const refreshed = deriveReviewItems(project);
    expect(refreshed.find(item => item.id === ordinary.id)?.status).toBe("Needs answer");
    const sourceItem = refreshed.find(item => item.gateId === "EC-FIELD-WORKFLOW-STEPS")!;
    expect(updateReviewItemDecision(sourceItem, { status: "Answered" })).toEqual(sourceItem);
  });
});
