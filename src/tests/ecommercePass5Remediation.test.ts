import { ecommerceDecisionState, ecommerceReviewItems, ARCHITECTURE_KEYS, DEPLOYMENT_KEYS, PHASE_KEYS } from "../lib/ecommerceDecisions";
import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { createExportManifest } from "../lib/exportManifest";
import { validateExportPackage } from "../lib/exportIntegrity";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { getDocumentReviewStatus, getDocumentStatusSummary } from "../lib/documentReview";
import { requiredProjectFields } from "../lib/projectCapabilities";
import { validateIntake } from "../lib/validateIntake";
import { createEcommerceFixture } from "./helpers/ecommerce";
import type { ProjectInputField, ProjectRecord } from "../types/project";

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
  project.packageGeneratedAt = "2026-09-14T00:00:00.000Z";
  return project;
}

function generated(project: ProjectRecord): ProjectRecord {
  const result = generateProjectPackage(project);
  return { ...project, generatedDocuments: result.documents, generatedFileCount: result.documents.length };
}

function document(project: ProjectRecord, fileName: string) {
  return project.generatedDocuments.find(candidate => candidate.fileName === fileName)!;
}

function decisionId(field: ProjectInputField): string {
  return `EC-FIELD-${field.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toUpperCase()}`;
}

const EVIDENCE_FIELDS = [
  "requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens", "websitePages",
  "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary", "authenticationExpectation",
  "permissionRules", "constraints", "acceptanceNotes", "successCriteria", "outOfScope", "accessibilityNotes"
] as const;

function projectWithEvidence(text: string, field: typeof EVIDENCE_FIELDS[number] = "acceptanceNotes"): ProjectRecord {
  const project = createEcommerceFixture();
  for (const sourceField of EVIDENCE_FIELDS) project.intake[sourceField] = `Recorded ${sourceField} requirement.`;
  project.intake[field] = text;
  return project;
}

function outputFor(text: string, field?: typeof EVIDENCE_FIELDS[number]): string {
  return ecommerceTestRequirements(projectWithEvidence(text, field)).map(row => `${row.category}: ${row.expectedResult}`).join("\n");
}

describe("Ecommerce Pass 5 review remediation", () => {
  it("keeps every placeholder-only required source field unresolved and traceable across package surfaces", () => {
    const cases: Array<[ProjectInputField, string]> = [
      ["workflowSteps", "TBD"],
      ["userRoles", "unknown"],
      ["dataCollections", "pending"],
      ["requiredFeatures", "   "],
      ["successCriteria", "to be determined"],
      ["workflowOutcome", "unconfirmed"],
      ["fields", "unanswered"]
    ];

    for (const [field, placeholder] of cases) {
      const project = approveBase();
      expect(requiredProjectFields(project).has(field), field).toBe(true);
      (project.intake as unknown as Record<string, string>)[field] = placeholder;
      const id = decisionId(field);

      expect(validateIntake(project).missingFields.map(item => item.field), `${field}: validation`).toContain(field);
      const state = ecommerceDecisionState(project);
      expect(state.decisions, `${field}: decision`).toEqual(expect.arrayContaining([
        expect.objectContaining({ id, field, gate: "architecture", status: "Needs answer" })
      ]));
      expect(state.implementationBlockers.map(item => item.id), `${field}: implementation`).toContain(id);
      expect(state.implementationReady, `${field}: implementation readiness`).toBe(false);
      expect(ecommerceReviewItems(project, project.updatedAt).find(item => item.gateId === id), `${field}: review`).toMatchObject({
        fieldKey: field,
        blocking: true,
        resolutionMode: "source"
      });

      const rendered = generated(project);
      const questions = document(rendered, "CLIENT_QUESTIONS.md").content;
      const readiness = evaluateGeneratedPackageReadiness(rendered);
      const manifest = createExportManifest(rendered, validateExportPackage(rendered));
      expect(questions, `${field}: questions`).toContain(`[MISSING: ${id}]`);
      expect(questions, `${field}: traceability`).toContain(`source: ${field}`);
      expect(readiness.missingMarkerCount, `${field}: missing markers`).toBeGreaterThan(0);
      expect(readiness.status, `${field}: package readiness`).toBe("Draft");
      expect(manifest.readiness, `${field}: manifest readiness`).toBe("Draft");
      expect(manifest.missingInformationMarkerCount, `${field}: manifest markers`).toBe(readiness.missingMarkerCount);
      expect(getDocumentReviewStatus(document(rendered, "CLIENT_QUESTIONS.md"), rendered), `${field}: document status`).toBe("Draft");
      expect(getDocumentStatusSummary(rendered).draftDocuments, `${field}: viewer status`).toBeGreaterThan(0);
    }
  }, 15_000);

  it("accepts meaningful required prose, including prose that uses a placeholder word in business context", () => {
    const controls: Array<[ProjectInputField, string]> = [
      ["workflowSteps", "Validate the cart, authorize payment, create one order, and notify fulfillment."],
      ["workflowSteps", "Orders with pending payment remain unfulfilled."],
      ["userRoles", "Guest customers and administrators with separate server-side permissions."],
      ["dataCollections", "Products, orders, payments, and immutable order-item policy snapshots."],
      ["successCriteria", "Every configured storefront completes an authorized order without cross-order access."]
    ];
    for (const [field, value] of controls) {
      const project = approveBase();
      (project.intake as unknown as Record<string, string>)[field] = value;
      expect(validateIntake(project).missingFields.map(item => item.field), field).not.toContain(field);
      expect(ecommerceDecisionState(project).decisions.map(item => item.id), field).not.toContain(decisionId(field));
    }

    const optional = approveBase();
    optional.intake.testimonials = "TBD";
    expect(requiredProjectFields(optional).has("testimonials")).toBe(false);
    expect(ecommerceDecisionState(optional).decisions.map(item => item.id)).not.toContain("EC-FIELD-TESTIMONIALS");
  });

  it("selects only positive checkout, currency, provider, and MFA evidence", () => {
    const cases: Array<{ text: string; includes: string[]; excludes: RegExp[] }> = [
      { text: "Guest checkout; CAD accepted; Square payments; Admin MFA", includes: ["guest checkout", "CAD", "Square", "Admin MFA"], excludes: [] },
      { text: "No guest checkout; authenticated customer checkout", includes: ["authenticated customer checkout"], excludes: [/recorded guest checkout/i] },
      { text: "Guest checkout not supported; account checkout required", includes: ["account checkout"], excludes: [/recorded guest checkout/i] },
      { text: "Do not support USD; EUR only", includes: ["EUR"], excludes: [/\bin USD\b/] },
      { text: "USD not supported; CAD accepted", includes: ["CAD"], excludes: [/\bin USD\b/] },
      { text: "No CAD; USD only", includes: ["USD"], excludes: [/\bin CAD\b/] },
      { text: "Do not use Square; Stripe payments", includes: ["Stripe"], excludes: [/recorded Square/i] },
      { text: "Square not supported; Stripe webhooks", includes: ["Stripe"], excludes: [/recorded Square/i] },
      { text: "Guest checkout; authenticated checkout not supported", includes: ["guest checkout"], excludes: [/recorded authenticated checkout/i] },
      { text: "No guest checkout, authenticated checkout only", includes: ["authenticated checkout"], excludes: [/recorded guest checkout/i] },
      { text: "Admin MFA not required", includes: [], excludes: [/including admin MFA/i] }
    ];

    for (const { text, includes, excludes } of cases) {
      const output = outputFor(text);
      for (const expected of includes) expect(output, text).toContain(expected);
      for (const excluded of excludes) expect(output, text).not.toMatch(excluded);
    }
  });

  it("keeps negative-only, unresolved, and out-of-scope choices neutral without inventing alternatives", () => {
    const cases: Array<{ text: string; field?: typeof EVIDENCE_FIELDS[number]; absent: RegExp; dependency: RegExp }> = [
      { text: "No guest checkout", absent: /recorded guest checkout/i, dependency: /resolve the recorded checkout mode/i },
      { text: "Do not support USD", absent: /\bin USD\b/, dependency: /resolve the recorded currency/i },
      { text: "Without Square", absent: /recorded Square/i, dependency: /resolve the recorded payment provider/i },
      { text: "Checkout mode TBD", absent: /recorded guest checkout|recorded authenticated checkout/i, dependency: /resolve the recorded checkout mode/i },
      { text: "Currency unknown", absent: /\bin (?:CAD|USD|EUR)\b/, dependency: /resolve the recorded currency/i },
      { text: "Payment provider pending", absent: /using the recorded .* payment integration/i, dependency: /resolve the recorded payment provider/i },
      { text: "Guest checkout", field: "outOfScope", absent: /recorded guest checkout/i, dependency: /resolve the recorded checkout mode/i }
    ];

    for (const { text, field, absent, dependency } of cases) {
      const output = outputFor(text, field);
      expect(output, text).not.toMatch(absent);
      expect(output, text).toMatch(dependency);
    }
  });

  it("preserves Rose and Paw and alternative-store source controls", () => {
    const rose = ecommerceTestRequirements(createEcommerceFixture()).map(row => row.expectedResult).join("\n");
    for (const expected of ["guest checkout", "CAD", "Square", "Canadian", "admin MFA"]) expect(rose).toContain(expected);

    const alternative = projectWithEvidence("Authenticated customer checkout; EUR accepted; Stripe payments; European VAT; Administrator roles without MFA.");
    const output = ecommerceTestRequirements(alternative).map(row => row.expectedResult).join("\n");
    for (const expected of ["authenticated customer checkout", "EUR", "Stripe", "European VAT"]) expect(output).toContain(expected);
    expect(output).not.toMatch(/recorded guest checkout|\bin CAD\b|recorded Square|Canadian tax|including .*MFA/i);
  });
});
