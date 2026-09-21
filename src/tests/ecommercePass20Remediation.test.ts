import {
  classifyResolutionValue,
  ecommerceDecisions,
  ecommerceRequirementOutcomes,
  ecommerceResolvedSelections,
  isEcommerceRequiredSourceFieldResolved,
  normalizedEcommerceSelectionAnswer
} from "../lib/ecommerceDecisions";
import { createEcommerceFixture } from "./helpers/ecommerce";

const evidenceFields = [
  "requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens",
  "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary",
  "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria",
  "outOfScope", "accessibilityNotes"
] as const;

function projectWithEvidence(text = "") {
  const project = createEcommerceFixture();
  for (const field of evidenceFields) project.intake[field] = "";
  project.intake.acceptanceNotes = text;
  project.intake.assumptions = "";
  project.intake.ecommerceDecisions = "";
  return project;
}

function decision(id: string, question: string, answer: string, status = "Answered", reason = "Approved") {
  return `${id} | launch | ${status} | ${question} | ${reason} | ${answer}`;
}

describe("Ecommerce Pass 20 structured provider approval state", () => {
  it.each([
    "Square not yet approved",
    "Square awaiting client approval",
    "Square awaiting stakeholder confirmation",
    "Stripe Connect awaiting security review"
  ])("keeps provider answer %j unresolved while approval remains outstanding", answer => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("PROVIDER", "Which payment provider?", answer);

    expect(normalizedEcommerceSelectionAnswer("paymentProvider", answer)).toBeUndefined();
    expect(ecommerceDecisions(project).find(item => item.id === "PROVIDER")?.status).toBe("Needs answer");
    expect(ecommerceResolvedSelections(project).paymentProvider).toBeUndefined();
  });

  it.each(["Square", "Stripe Connect"])("preserves complete approved provider %j", answer => {
    expect(normalizedEcommerceSelectionAnswer("paymentProvider", answer)).toBe(answer);
  });
});

describe("Ecommerce Pass 20 clause-relative N/A evidence uncertainty", () => {
  it("retains settled VAT evidence after an earlier pending tax-decision clause", () => {
    const project = projectWithEvidence("Tax decision pending for digital goods, but VAT applies to physical goods");
    project.intake.ecommerceDecisions = decision(
      "TAX-NA",
      "Is tax calculation required?",
      "",
      "Not applicable",
      "Not applicable for launch"
    );

    const tax = ecommerceRequirementOutcomes(project).find(item => item.domain === "tax");
    expect(tax?.positiveEvidence).toHaveLength(1);
    expect(tax?.conflict).toBe(true);
    expect(ecommerceDecisions(project).find(item => item.id === "EC-EVIDENCE-CONFLICT-TAX"))
      .toMatchObject({ status: "Needs answer" });
  });

  it("retains settled shipping evidence after an earlier pending shipping-decision clause", () => {
    const project = projectWithEvidence("Shipping decision pending for digital products, but live carrier shipping applies to physical products");
    project.intake.ecommerceDecisions = decision(
      "SHIP-NA",
      "Is shipping required at launch?",
      "",
      "Not applicable",
      "Not applicable for launch"
    );

    const shipping = ecommerceRequirementOutcomes(project).find(item => item.domain === "shipping");
    expect(shipping?.positiveEvidence).toHaveLength(1);
    expect(shipping?.conflict).toBe(true);
  });

  it("does not invent positive tax evidence from an unresolved tax-decision clause alone", () => {
    const project = projectWithEvidence("Tax decision pending for digital goods");
    project.intake.ecommerceDecisions = decision(
      "TAX-NA",
      "Is tax calculation required?",
      "",
      "Not applicable",
      "Not applicable for launch"
    );

    const tax = ecommerceRequirementOutcomes(project).find(item => item.domain === "tax");
    expect(tax?.positiveEvidence).toHaveLength(0);
    expect(tax?.conflict).toBe(false);
  });

  it("keeps earlier settled VAT evidence when a later tax-decision clause is pending", () => {
    const project = projectWithEvidence("VAT applies to physical goods, but tax decision pending for digital goods");
    project.intake.ecommerceDecisions = decision(
      "TAX-NA",
      "Is tax calculation required?",
      "",
      "Not applicable",
      "Not applicable for launch"
    );

    expect(ecommerceRequirementOutcomes(project).find(item => item.domain === "tax")?.conflict).toBe(true);
  });
});

describe("Ecommerce Pass 20 attributed not-yet-made decisions", () => {
  it.each([
    "Decision not yet made by client",
    "Decision not yet made by the client",
    "A decision has not yet been made",
    "The decision has not yet been made by owner"
  ])("classifies %j as unresolved", value => {
    expect(classifyResolutionValue(value)).toBe("unresolved");
  });

  it("keeps a required source field blocked for an attributed undecided value", () => {
    const project = createEcommerceFixture();
    project.intake.workflowSteps = "Decision not yet made by client";

    expect(isEcommerceRequiredSourceFieldResolved(project, "workflowSteps")).toBe(false);
    expect(ecommerceDecisions(project).map(item => item.id)).toContain("EC-FIELD-WORKFLOW-STEPS");
  });

  it("keeps a non-singleton Answered register record unresolved when no decision has been made", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision(
      "RETENTION",
      "What accounting retention period applies?",
      "A decision has not yet been made"
    );

    expect(ecommerceDecisions(project).find(item => item.id === "RETENTION")?.status).toBe("Needs answer");
  });

  it("preserves ordinary workflow state", () => {
    expect(classifyResolutionValue("Order has not yet been shipped")).toBe("resolved");
  });
});
