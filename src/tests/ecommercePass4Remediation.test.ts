import { ecommerceDecisionState, ARCHITECTURE_KEYS, DEPLOYMENT_KEYS, PHASE_KEYS } from "../lib/ecommerceDecisions";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { orphanMissingMarkers } from "../lib/canvasTraceability";
import { createEcommerceFixture } from "./helpers/ecommerce";
import type { ProjectRecord } from "../types/project";

function approveBase(project = createEcommerceFixture()): ProjectRecord {
  project.intake.ecommerceArchitecture = `Approved: ${ARCHITECTURE_KEYS.map(key => `${key}=approved ${key}`).join(";")}`;
  project.intake.ecommerceDeployment = `Approved: ${DEPLOYMENT_KEYS.map(key => `${key}=approved ${key}`).join(";")}`;
  project.intake.ecommercePhases = JSON.stringify([
    Object.fromEntries(PHASE_KEYS.map(key => [key, `Approved ${key}`]))
  ]);
  project.intake.ecommerceDecisions = Array.from({ length: 20 }, (_, index) => {
    const id = `OQ-${String(index + 1).padStart(2, "0")}`;
    return `${id} | launch | Answered | Resolved fixture question ${index + 1}? | Approved by fixture owner | Approved fixture answer ${index + 1}`;
  }).join("\n");
  project.packageGeneratedAt = "2026-09-13T00:00:00.000Z";
  return project;
}

function generated(project: ProjectRecord): ProjectRecord {
  const result = generateProjectPackage(project);
  return { ...project, generatedDocuments: result.documents, generatedFileCount: result.documents.length };
}

function document(project: ProjectRecord, fileName: string): string {
  return project.generatedDocuments.find(candidate => candidate.fileName === fileName)!.content;
}

function commerceVerification(project: ProjectRecord): string[] {
  const testPlan = document(project, "TEST_PLAN.md").split("## Recorded acceptance evidence")[0];
  const acceptance = document(project, "ACCEPTANCE_CRITERIA.md").split("## Commerce verification")[1] ?? "";
  return [testPlan, acceptance];
}

describe("Ecommerce Pass 4 review remediation", () => {
  it("keeps optional Deferred and Needs answer decisions visible without readiness markers", () => {
    for (const record of [
      "OPT-01 | optional | Deferred | Add wish lists? | Future release |",
      "OPT-01 | optional | Needs answer | Add wish lists? | |"
    ]) {
      const project = approveBase();
      project.intake.ecommerceDecisions += `\n${record}`;
      const rendered = generated(project);
      const state = ecommerceDecisionState(rendered);
      const questions = document(rendered, "CLIENT_QUESTIONS.md");
      const readiness = evaluateGeneratedPackageReadiness(rendered);

      expect(state.unresolved.find(item => item.id === "OPT-01")?.gate).toBe("optional");
      expect(state.implementationBlockers.some(item => item.id === "OPT-01")).toBe(false);
      expect(state.launchBlockers.some(item => item.id === "OPT-01")).toBe(false);
      expect(questions).toContain("OPT-01");
      expect(questions).toContain("[OPTIONAL: OPT-01]");
      expect(questions).not.toContain("[MISSING: OPT-01]");
      expect(readiness.missingMarkerCount).toBe(0);
      expect(readiness.status).toBe("Ready for Codex");
      expect(orphanMissingMarkers(rendered)).toEqual([]);
    }
  });

  it("emits missing markers only for architecture and launch blockers in a mixed register", () => {
    const project = approveBase();
    project.intake.ecommerceDecisions += [
      "",
      "ARCH-01 | architecture | Deferred | Choose runtime? | Architect review |",
      "LAUNCH-01 | launch | Deferred | Approve release date? | Owner review |",
      "OPT-01 | optional | Deferred | Add wish lists? | Future release |",
      "OPT-02 | optional | Deferred | Add loyalty points? | Future release |"
    ].join("\n");
    const rendered = generated(project);
    const state = ecommerceDecisionState(rendered);
    const questions = document(rendered, "CLIENT_QUESTIONS.md");

    expect(state.unresolved.map(item => item.id)).toEqual(expect.arrayContaining(["ARCH-01", "LAUNCH-01", "OPT-01", "OPT-02"]));
    expect(state.unresolved).toHaveLength(4);
    expect(state.implementationBlockers.map(item => item.id)).toEqual(["ARCH-01"]);
    expect(state.launchBlockers.map(item => item.id)).toEqual(["LAUNCH-01"]);
    expect(questions).toContain("[MISSING: ARCH-01]");
    expect(questions).toContain("[MISSING: LAUNCH-01]");
    expect(questions).toContain("[OPTIONAL: OPT-01]");
    expect(questions).toContain("[OPTIONAL: OPT-02]");
    expect(evaluateGeneratedPackageReadiness(rendered).missingMarkerCount).toBe(2);
    expect(orphanMissingMarkers(rendered)).toEqual([]);
  });

  it("accepts the canonical root route without weakening route validation", () => {
    const valid = approveBase();
    valid.intake.ecommerceRoutes = "/ | Main Brand | Main Catalog";
    expect(ecommerceDecisionState(valid).implementationBlockers.map(item => item.id)).not.toContain("EC-ROUTES");

    const rootAndShop = approveBase();
    rootAndShop.intake.ecommerceRoutes = "/ | Main Brand | Main Catalog\n/shop | Shop Brand | Shop Catalog";
    expect(ecommerceDecisionState(rootAndShop).implementationBlockers.map(item => item.id)).not.toContain("EC-ROUTES");

    for (const routes of [
      "/ | Main Brand | Main Catalog\n/ | Other Brand | Other Catalog",
      "/ | | Main Catalog",
      "/ | TBD | Main Catalog",
      "/ | Main Brand | unknown",
      "// | Main Brand | Main Catalog"
    ]) {
      const invalid = approveBase();
      invalid.intake.ecommerceRoutes = routes;
      expect(ecommerceDecisionState(invalid).implementationBlockers.map(item => item.id), routes).toContain("EC-ROUTES");
    }
  });

  it("retains the normal Rose and Paw four-route routing control", () => {
    const project = createEcommerceFixture();
    expect(ecommerceDecisionState(project).implementationBlockers.map(item => item.id)).not.toContain("EC-ROUTES");
  });

  it("retains Rose and Paw-specific verification only because its intake records it", () => {
    const rendered = generated(createEcommerceFixture());
    for (const output of commerceVerification(rendered)) {
      for (const expected of ["guest checkout", "CAD", "Square", "Canadian", "live carrier", "30-day", "admin MFA"]) {
        expect(output).toContain(expected);
      }
    }
  });

  it("derives alternative-store verification without Rose and Paw assumptions", () => {
    const project = createEcommerceFixture();
    Object.assign(project.intake, {
      requiredFeatures: "Catalog; cart; authenticated customer checkout; Stripe payments; United States tax; standard shipping; inventory; 14-day returns; role-based administration.",
      featureDescription: "No local pickup. Account customers can view their orders.",
      workflows: "Authenticated customer checkout -> Stripe payment -> order; eligible return -> refund.",
      integrations: "Stripe payment and webhook services; United States tax service.",
      authenticationExpectation: "Authenticated customer accounts and an administrator role.",
      rolePermissionsSummary: "Administrators manage orders with server-side authorization.",
      constraints: "USD pricing and United States sales tax.",
      fields: "UUID; SKU; USD integer minor units.",
      acceptanceNotes: "Verify authenticated checkout in USD through Stripe, United States tax, no pickup, and 14-day returns.",
      successCriteria: "Account customers can order in USD."
    });
    const rendered = generated(project);

    for (const output of commerceVerification(rendered)) {
      expect(output).toMatch(/authenticated customer checkout/i);
      expect(output).toContain("USD");
      expect(output).toContain("Stripe");
      expect(output).toContain("United States tax");
      expect(output).toContain("14-day returns");
      expect(output).not.toMatch(/guest checkout|CAD|Square|Canadian tax|live carrier|30-day|admin MFA/i);
      expect(output).not.toContain("| Pickup |");
    }
  });

  it("uses neutral dependencies and universal checks for unresolved commerce scope", () => {
    const project = createEcommerceFixture();
    Object.assign(project.intake, {
      requiredFeatures: "Catalog and cart with checkout.",
      featureDescription: "Checkout mode, currency, payment provider, tax jurisdiction, shipping, returns, and order lookup remain unresolved.",
      workflows: "Purchase flow requires recorded decisions.",
      integrations: "Payment provider unresolved.",
      authenticationExpectation: "Checkout account model unresolved.",
      rolePermissionsSummary: "Privileged operations require server authorization.",
      constraints: "Currency and tax jurisdiction unresolved.",
      fields: "Product and order identifiers.",
      acceptanceNotes: "Business-specific commerce decisions remain unresolved.",
      successCriteria: "Configured ecommerce scope passes approved tests."
    });
    const rendered = generated(project);

    for (const output of commerceVerification(rendered)) {
      expect(output).not.toMatch(/guest checkout|CAD|Square|Canadian|live carrier|30-day|admin MFA|guest order/i);
      expect(output).toMatch(/resolve the recorded checkout mode/i);
      expect(output).toMatch(/resolve the recorded currency/i);
      expect(output).toContain("Accessibility");
      expect(output).toContain("Security");
      expect(output).toContain("Performance");
    }
  });
});
