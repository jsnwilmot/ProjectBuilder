import { createExportManifest } from "../lib/exportManifest";
import { ecommerceDecisionState, ARCHITECTURE_KEYS, DEPLOYMENT_KEYS, PHASE_KEYS } from "../lib/ecommerceDecisions";
import { validateExportPackage } from "../lib/exportIntegrity";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { getDocumentReviewStatus } from "../lib/documentReview";
import { createEcommerceFixture } from "./helpers/ecommerce";
import type { ProjectRecord } from "../types/project";

const meaningfulArchitecture = () => `Approved: ${ARCHITECTURE_KEYS.map(key => `${key}=approved ${key}`).join(";")}`;
const meaningfulDeployment = () => `Approved: ${DEPLOYMENT_KEYS.map(key => `${key}=approved ${key}`).join(";")}`;

function approveImplementation(project: ProjectRecord): ProjectRecord {
  project.intake.ecommerceArchitecture = meaningfulArchitecture();
  project.intake.ecommerceDeployment = meaningfulDeployment();
  project.intake.ecommercePhases = JSON.stringify([
    Object.fromEntries(PHASE_KEYS.map(key => [key, `Approved ${key}`]))
  ]);
  project.intake.ecommerceDecisions = "OQ-19 | architecture | Answered | Architecture approved? | Approved by Architect | Approved contracts recorded";
  return project;
}

function generated(project: ProjectRecord): ProjectRecord {
  const result = generateProjectPackage(project);
  return {
    ...project,
    generatedDocuments: result.documents,
    generatedFileCount: result.documents.length
  };
}

function document(project: ProjectRecord, fileName: string) {
  return project.generatedDocuments.find(candidate => candidate.fileName === fileName)!;
}

describe("PR #6 automated review remediation regressions", () => {
  it("keeps placeholder-only answered and not-applicable decisions unresolved everywhere", () => {
    const placeholderCases = ["", "TBD", " unknown ", "Pending", "deferred", "unanswered", "T.B.D.", "unknown!"];
    for (const placeholder of placeholderCases) {
      const answered = createEcommerceFixture();
      answered.intake.ecommerceDecisions = `OQ-01 | launch | Answered | Shipping threshold? | Recorded | ${placeholder}`;
      expect(ecommerceDecisionState(answered).unresolved.some(item => item.id === "OQ-01")).toBe(true);

      const notApplicable = createEcommerceFixture();
      notApplicable.intake.ecommerceDecisions = `OQ-01 | launch | Not applicable | Shipping threshold? | ${placeholder} |`;
      expect(ecommerceDecisionState(notApplicable).unresolved.some(item => item.id === "OQ-01")).toBe(true);
    }

    const project = createEcommerceFixture();
    project.intake.ecommerceDecisions = [
      "OQ-01 | launch | Answered | Shipping threshold? | Recorded | TBD",
      "OQ-02 | launch | Not applicable | Shipping provider? | Deferred |"
    ].join("\n");
    const rendered = generated(project);
    const state = ecommerceDecisionState(rendered);
    const readiness = evaluateGeneratedPackageReadiness(rendered);
    const manifest = createExportManifest(rendered, validateExportPackage(rendered));
    const questions = document(rendered, "CLIENT_QUESTIONS.md").content;

    expect(state.unresolved.map(item => item.id)).toEqual(expect.arrayContaining(["OQ-01", "OQ-02"]));
    expect(questions).toContain("[MISSING: OQ-01]");
    expect(questions).toContain("[MISSING: OQ-02]");
    expect(readiness.missingMarkerCount).toBe(state.unresolved.length);
    expect(manifest.ecommerce?.unresolvedDecisionCount).toBe(state.unresolved.length);
    expect(manifest.missingInformationMarkerCount).toBe(readiness.missingMarkerCount);
  });

  it("accepts meaningful decision answers even when an unresolved word appears in context", () => {
    const project = createEcommerceFixture();
    project.intake.ecommerceDecisions = [
      "OQ-01 | launch | Answered | Shipping threshold? | Approved | Free shipping begins at CAD $125 before tax.",
      "OQ-04 | launch | Not applicable | Pickup details? | Local pickup is deferred to Release 2. |"
    ].join("\n");
    const unresolved = ecommerceDecisionState(project).unresolved.map(item => item.id);
    expect(unresolved).not.toContain("OQ-01");
    expect(unresolved).not.toContain("OQ-04");
  });

  it("rejects blank, placeholder, duplicate, and malformed approved contract entries", () => {
    for (const value of ["", " ", "     ", "TBD", "unknown"]) {
      const project = approveImplementation(createEcommerceFixture());
      project.intake.ecommerceArchitecture = meaningfulArchitecture().replace("runtime=approved runtime", `runtime=${value}`);
      expect(ecommerceDecisionState(project).implementationBlockers.map(item => item.id)).toContain("EC-ARCHITECTURE");
    }

    const duplicate = approveImplementation(createEcommerceFixture());
    duplicate.intake.ecommerceArchitecture = `${meaningfulArchitecture()};runtime=`;
    expect(ecommerceDecisionState(duplicate).implementationBlockers.map(item => item.id)).toContain("EC-ARCHITECTURE");

    const malformed = approveImplementation(createEcommerceFixture());
    malformed.intake.ecommerceArchitecture = meaningfulArchitecture().replace("runtime=approved runtime", "runtime approved runtime");
    expect(ecommerceDecisionState(malformed).implementationBlockers.map(item => item.id)).toContain("EC-ARCHITECTURE");

    for (const value of ["", "     ", "TBD", "unknown"]) {
      const project = approveImplementation(createEcommerceFixture());
      project.intake.ecommerceDeployment = meaningfulDeployment().replace("smoke=approved smoke", `smoke=${value}`);
      expect(ecommerceDecisionState(project).implementationBlockers.map(item => item.id)).toContain("EC-DEPLOYMENT");
    }
  });

  it("accepts complete meaningful architecture and deployment contracts", () => {
    const state = ecommerceDecisionState(approveImplementation(createEcommerceFixture()));
    expect(state.implementationBlockers).toEqual([]);
    expect(state.implementationReady).toBe(true);
  });

  it("keeps package launch blocked while allowing eligible implementation documents", () => {
    const rendered = generated(approveImplementation(createEcommerceFixture()));
    const state = ecommerceDecisionState(rendered);
    const readiness = evaluateGeneratedPackageReadiness(rendered);
    const questions = document(rendered, "CLIENT_QUESTIONS.md").content;
    const manifest = createExportManifest(rendered, validateExportPackage(rendered));

    expect(state.implementationReady).toBe(true);
    expect(state.launchReady).toBe(false);
    expect(state.unresolved).toHaveLength(19);
    expect(readiness.status).toBe("Draft");
    expect(manifest.readiness).toBe("Draft");
    expect(manifest.ecommerce?.unresolvedDecisionCount).toBe(19);
    expect(questions).toContain("[MISSING: OQ-01]");
    expect(getDocumentReviewStatus(document(rendered, "DATA_MODEL.md"), rendered)).toBe("Ready for Implementation");
    expect(getDocumentReviewStatus(document(rendered, "APP_BLUEPRINT.md"), rendered)).toBe("Review Required");
  });

  it("uses dedicated ecommerce fields for storefront and cart tests without duplicates", () => {
    const project = createEcommerceFixture();
    project.intake.requiredFeatures = "Customer purchasing";
    project.intake.featureDescription = "Customers can place an order.";
    project.intake.workflows = "Customer selects an item and completes an order.";
    project.intake.integrations = "Payment service";
    const rendered = generated(project);

    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      const content = document(rendered, name).content;
      expect(content).toContain("Catalog/storefront");
      expect(content).toContain("| Cart |");
    }

    project.intake.requiredFeatures = "Catalog storefront and cart";
    const withGenericSource = generated(project);
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      const content = document(withGenericSource, name).content;
      expect(content.match(/\| Catalog\/storefront \|/g)).toHaveLength(1);
      expect(content.match(/\| Cart \|/g)).toHaveLength(1);
    }
  });
});
