import {
  ecommerceDecisionState,
  hasMeaningfulResolvedValue,
  isEcommerceRequiredSourceFieldResolved
} from "../lib/ecommerceDecisions";
import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { createEcommerceFixture } from "./helpers/ecommerce";
import type { ProjectRecord } from "../types/project";

const EVIDENCE_FIELDS = [
  "requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens", "websitePages",
  "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary", "authenticationExpectation",
  "permissionRules", "constraints", "acceptanceNotes", "successCriteria", "outOfScope", "accessibilityNotes"
] as const;

function projectWithEvidence(text: string): ProjectRecord {
  const project = createEcommerceFixture();
  for (const field of EVIDENCE_FIELDS) project.intake[field] = `Recorded ${field} requirement.`;
  project.intake.acceptanceNotes = text;
  return project;
}

function outputFor(text: string): string {
  return ecommerceTestRequirements(projectWithEvidence(text))
    .map(row => `${row.category}: ${row.expectedResult}`)
    .join("\n");
}

function decisionProject(register: string): ProjectRecord {
  const project = createEcommerceFixture();
  project.intake.assumptions = "";
  project.intake.ecommerceDecisions = register;
  return project;
}

describe("Ecommerce Pass 6 parser remediation", () => {
  it("classifies compound decision deferrals without rejecting business prose", () => {
    const unresolved = [
      "TBD",
      "TBD after discovery",
      "TBD after client review",
      "pending approval",
      "pending client approval",
      "pending stakeholder approval",
      "pending confirmation",
      "pending decision",
      "pending discovery",
      "pending vendor selection",
      "unknown",
      "unknown until discovery",
      "unknown pending approval",
      "unconfirmed",
      "unconfirmed until testing",
      "undecided",
      "awaiting approval",
      "awaiting confirmation",
      "awaiting architecture decision",
      "awaiting vendor response",
      "needs approval",
      "needs confirmation",
      "needs decision",
      "not decided",
      "to be determined",
      "to be determined after discovery",
      "deferred until review",
      "no decision yet",
      "no approved approach"
    ];
    for (const value of unresolved) {
      expect(hasMeaningfulResolvedValue(value), value).toBe(false);

      const answered = decisionProject(`OQ-01 | launch | Answered | Provider? | Recorded | ${value}`);
      expect(ecommerceDecisionState(answered).decisions.find(item => item.id === "OQ-01")?.status, value).toBe("Needs answer");

      const notApplicable = decisionProject(`OQ-01 | launch | Not applicable | Provider? | ${value} |`);
      expect(ecommerceDecisionState(notApplicable).decisions.find(item => item.id === "OQ-01")?.status, value).toBe("Needs answer");

      const requiredField = createEcommerceFixture();
      requiredField.intake.workflowSteps = value;
      expect(isEcommerceRequiredSourceFieldResolved(requiredField, "workflowSteps"), value).toBe(false);
    }

    for (const value of [
      "Pending payments are unfulfilled.",
      "Pending orders remain visible to administrators.",
      "Unknown users receive a generic authorization error.",
      "Deferred jobs retry after five minutes."
    ]) {
      expect(hasMeaningfulResolvedValue(value), value).toBe(true);
      const project = createEcommerceFixture();
      project.intake.workflowSteps = value;
      expect(isEcommerceRequiredSourceFieldResolved(project, "workflowSteps"), value).toBe(true);
    }
  });

  it("parses exactly six decision fields and preserves valid escaped content", () => {
    const project = decisionProject([
      "OQ-01 | launch | Answered | Exact record? | Approved | Complete answer",
      "OQ-02 | launch | Answered | Empty answer? | Approved |",
      "OQ-03 | launch | Answered | Only five fields? | Approved",
      "OQ-04 | launch | Answered | Seven fields? | Approved | First | Discarded",
      String.raw`OQ-05 | launch | Answered | One pipe? | Approved | /shop \| Catalog`,
      String.raw`OQ-06 | launch | Answered | Multiple pipes? | Approved | /shop \| Brand \| Catalog`,
      String.raw`OQ-07 | launch | Answered | Backslash? | Approved | C:\\Catalog`,
      "OQ-08 | launch | Answered | Route map? | Approved | /shop | Brand | Catalog",
      String.raw`OQ-09 | launch | Answered | Escaped route map? | Approved | /shop \| Brand \| Catalog`,
      String.raw`OQ-09 | launch | Answered | Duplicate after parsing? | Approved | Duplicate`,
      String.raw`OQ-10 | launch | Answered | Placeholder after parsing? | Approved | pending client approval`
    ].join("\n"));
    const state = ecommerceDecisionState(project);
    const byId = new Map(state.decisions.map(item => [item.id, item]));

    expect(byId.get("OQ-01")).toMatchObject({ status: "Answered", answer: "Complete answer" });
    expect(byId.get("OQ-02")?.status).toBe("Needs answer");
    expect(byId.get("OQ-05")?.answer).toBe("/shop | Catalog");
    expect(byId.get("OQ-06")?.answer).toBe("/shop | Brand | Catalog");
    expect(byId.get("OQ-07")?.answer).toBe("C:\\Catalog");
    expect(byId.get("OQ-09")?.answer).toBe("/shop | Brand | Catalog");
    expect(byId.get("OQ-10")?.status).toBe("Needs answer");
    expect(byId.has("OQ-03")).toBe(false);
    expect(byId.has("OQ-04")).toBe(false);
    expect(byId.has("OQ-08")).toBe(false);
    expect(byId.get("EC-RECORD-3")?.reason).toMatch(/fewer than six unescaped fields/i);
    expect(byId.get("EC-RECORD-4")?.reason).toMatch(/more than six unescaped fields.*escape literal pipe.*\\\|/i);
    expect(byId.get("EC-RECORD-8")?.reason).toMatch(/more than six unescaped fields.*escape literal pipe.*\\\|/i);
    expect(byId.get("EC-RECORD-10")?.reason).toMatch(/duplicate.*OQ-09.*line 10/i);
  });

  it("fails closed on malformed decision-register escapes", () => {
    const project = decisionProject([
      String.raw`OQ-20 | launch | Answered | Bad escape? | Approved | value \q`,
      "OQ-21 | launch | Answered | Dangling escape? | Approved | value\\"
    ].join("\n"));
    const state = ecommerceDecisionState(project);
    expect(state.decisions.some(item => item.id === "OQ-20" || item.id === "OQ-21")).toBe(false);
    expect(state.decisions.find(item => item.id === "EC-RECORD-1")?.reason).toMatch(/malformed escape/i);
    expect(state.decisions.find(item => item.id === "EC-RECORD-2")?.reason).toMatch(/malformed escape/i);
  });

  it("preserves coordinated currency and checkout polarity across commas and contrasts", () => {
    const cases: Array<{ text: string; includes: RegExp[]; excludes: RegExp[] }> = [
      { text: "CAD only", includes: [/\bin CAD\b/], excludes: [] },
      { text: "No CAD", includes: [/resolve the recorded currency/i], excludes: [/\bin CAD\b/] },
      { text: "No CAD, USD, or EUR support", includes: [/resolve the recorded currency/i], excludes: [/\bin (?:CAD|USD|EUR)\b/] },
      { text: "Do not support CAD, USD, or EUR", includes: [/resolve the recorded currency/i], excludes: [/\bin (?:CAD|USD|EUR)\b/] },
      { text: "CAD, USD, and EUR are not supported", includes: [/resolve the recorded currency/i], excludes: [/\bin (?:CAD|USD|EUR)\b/] },
      { text: "No CAD, USD, or EUR support; GBP only", includes: [/\bin GBP\b/], excludes: [/\bin (?:CAD|USD|EUR)\b/] },
      { text: "No CAD, USD, or EUR support, but GBP is accepted", includes: [/\bin GBP\b/], excludes: [/\bin (?:CAD|USD|EUR)\b/] },
      { text: "USD is not supported; CAD accepted", includes: [/\bin CAD\b/], excludes: [/\bin USD\b/] },
      { text: "CAD accepted, USD not supported", includes: [/\bin CAD\b/], excludes: [/\bin USD\b/] },
      { text: "No guest or mixed checkout; authenticated checkout only", includes: [/recorded authenticated checkout/i], excludes: [/recorded (?:guest|mixed) checkout/i] },
      { text: "Guest checkout not supported; account checkout required", includes: [/recorded account checkout/i], excludes: [/recorded guest checkout/i] }
    ];

    for (const { text, includes, excludes } of cases) {
      const output = outputFor(text);
      for (const expected of includes) expect(output, text).toMatch(expected);
      for (const excluded of excludes) expect(output, text).not.toMatch(excluded);
    }
  });

  it("preserves complete provider names and applies the common polarity model", () => {
    const cases: Array<{ text: string; provider?: string }> = [
      { text: "Square payments", provider: "Square" },
      { text: "Stripe payments", provider: "Stripe" },
      { text: "Stripe Connect payments", provider: "Stripe Connect" },
      { text: "PayPal Commerce Platform payments", provider: "PayPal Commerce Platform" },
      { text: "Adyen payments", provider: "Adyen" },
      { text: "Use Stripe Connect payments", provider: "Stripe Connect" },
      { text: "payments through Stripe Connect", provider: "Stripe Connect" },
      { text: "payments via Stripe Connect", provider: "Stripe Connect" },
      { text: "Stripe Connect webhooks", provider: "Stripe Connect" },
      { text: "webhooks from Stripe Connect", provider: "Stripe Connect" },
      { text: "Do not use Square; Stripe Connect payments", provider: "Stripe Connect" },
      { text: "Stripe Connect not supported; Square payments", provider: "Square" },
      { text: "No Square or PayPal payments; Stripe Connect payments", provider: "Stripe Connect" },
      { text: "No Square, Stripe Connect, or PayPal" },
      { text: "Do not use Square." },
      { text: "Payment provider TBD." }
    ];

    for (const { text, provider } of cases) {
      const output = outputFor(text);
      if (provider) {
        expect(output, text).toContain(`recorded ${provider} payment integration`);
      } else {
        expect(output, text).not.toMatch(/using the recorded .* payment integration/i);
        expect(output, text).toMatch(/resolve the recorded payment provider/i);
      }
    }
  });

  it("keeps unresolved, negative, positive, and mixed provider evidence distinct", () => {
    expect(outputFor("Payment provider TBD.")).toMatch(/resolve the recorded payment provider/i);
    expect(outputFor("Do not use Square.")).toMatch(/resolve the recorded payment provider/i);
    expect(outputFor("Use Stripe Connect payments.")).toContain("recorded Stripe Connect payment integration");
    const mixed = outputFor("Do not use Square; use Stripe Connect payments.");
    expect(mixed).toContain("recorded Stripe Connect payment integration");
    expect(mixed).not.toMatch(/recorded Square/i);
  });

  it("does not create an MFA-specific requirement from negative evidence", () => {
    expect(outputFor("Admin MFA required")).toMatch(/including admin MFA/i);
    expect(outputFor("Admin MFA not required")).not.toMatch(/including admin MFA/i);
  });
});
