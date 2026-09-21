import {
  classifyResolutionValue,
  ecommerceDecisions,
  ecommerceRequirementOutcomes,
  ecommerceResolvedSelections,
  isEcommerceRequiredSourceFieldResolved,
  normalizedEcommerceSelectionAnswer,
  validatedEcommerceConfiguration
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

describe("Ecommerce Pass 19 complete structured singleton selections", () => {
  it.each([
    "USD pending approval",
    "USD awaiting confirmation",
    "USD or CAD",
    "USD/CAD",
    "USD and CAD",
    "Maybe USD",
    "Probably CAD",
    "USD if approved",
    "USD subject to approval",
    "USD, pending final confirmation"
  ])("keeps incomplete currency answer %j unresolved", answer => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("CURRENCY", "Which checkout currency?", answer);

    expect(normalizedEcommerceSelectionAnswer("currency", answer)).toBeUndefined();
    expect(ecommerceDecisions(project).find(item => item.id === "CURRENCY")?.status).toBe("Needs answer");
    expect(ecommerceResolvedSelections(project).currency).toBeUndefined();
  });

  it.each([
    ["USD", "USD"],
    ["usd", "USD"],
    ["USD.", "USD"],
    ["CAD", "CAD"]
  ])("accepts complete currency answer %j", (answer, expected) => {
    expect(normalizedEcommerceSelectionAnswer("currency", answer)).toBe(expected);
  });

  it.each([
    "Guest checkout pending approval",
    "Guest checkout or authenticated checkout",
    "Guest checkout / account checkout",
    "Maybe guest checkout",
    "Guest checkout if approved"
  ])("keeps incomplete checkout answer %j unresolved", answer => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("CHECKOUT", "Which checkout mode?", answer);

    expect(normalizedEcommerceSelectionAnswer("checkoutMode", answer)).toBeUndefined();
    expect(ecommerceDecisions(project).find(item => item.id === "CHECKOUT")?.status).toBe("Needs answer");
    expect(ecommerceResolvedSelections(project).checkoutMode).toBeUndefined();
  });

  it.each([
    "Guest checkout",
    "authenticated checkout",
    "Authenticated customer checkout"
  ])("accepts complete checkout answer %j", answer => {
    expect(normalizedEcommerceSelectionAnswer("checkoutMode", answer)?.toLocaleLowerCase()).toBe(answer.toLocaleLowerCase());
  });

  it.each([
    "Square pending approval",
    "Square or Stripe",
    "Square / Stripe",
    "Maybe Square",
    "Square subject to approval",
    "Square awaiting confirmation"
  ])("keeps incomplete provider answer %j unresolved", answer => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("PROVIDER", "Which payment provider?", answer);

    expect(normalizedEcommerceSelectionAnswer("paymentProvider", answer)).toBeUndefined();
    expect(ecommerceDecisions(project).find(item => item.id === "PROVIDER")?.status).toBe("Needs answer");
    expect(ecommerceResolvedSelections(project).paymentProvider).toBeUndefined();
  });

  it.each(["Square", "Stripe Connect"])("accepts complete provider answer %j without a brand whitelist", answer => {
    expect(normalizedEcommerceSelectionAnswer("paymentProvider", answer)).toBe(answer);
  });

  it.each(["not Stripe", "no Stripe Connect", "without Square"])("keeps negative-only provider answer %j unresolved", answer => {
    expect(normalizedEcommerceSelectionAnswer("paymentProvider", answer)).toBeUndefined();
  });
});

describe("Ecommerce Pass 19 multi-clause N/A evidence reconciliation", () => {
  it.each([
    ["tax", "No tax for gift cards, but VAT applies to physical goods", "Is tax calculation required?", "EC-EVIDENCE-CONFLICT-TAX"],
    ["shipping", "No shipping for digital downloads, but live carrier shipping applies to physical products", "Is shipping required at launch?", "EC-EVIDENCE-CONFLICT-SHIPPING"],
    ["pickup", "No pickup for software, but local pickup is available for physical orders", "Is pickup required at launch?", "EC-EVIDENCE-CONFLICT-PICKUP"],
    ["returns", "No returns on downloads, but physical items have 30-day returns", "Are returns and refunds required?", "EC-EVIDENCE-CONFLICT-RETURNS"]
  ] as const)("finds positive %s evidence after a negative clause", (domain, source, question, conflictId) => {
    const project = projectWithEvidence(source);
    project.intake.ecommerceDecisions = decision("EXCLUSION", question, "", "Not applicable", "Not applicable for launch");

    expect(ecommerceDecisions(project).find(item => item.id === conflictId)).toMatchObject({ status: "Needs answer" });
    expect(ecommerceRequirementOutcomes(project).find(item => item.domain === domain)?.positiveEvidence).toHaveLength(1);
  });

  it.each([
    ["tax", "No tax is required", "Is tax calculation required?"],
    ["tax", "Tax calculation is excluded", "Is tax calculation required?"],
    ["pickup", "No local pickup", "Is pickup required at launch?"],
    ["returns", "Returns are not offered", "Are returns and refunds required?"]
  ] as const)("keeps negative-only %s evidence non-conflicting: %j", (domain, source, question) => {
    const project = projectWithEvidence(source);
    project.intake.ecommerceDecisions = decision("EXCLUSION", question, "", "Not applicable", "Not applicable for launch");
    const outcome = ecommerceRequirementOutcomes(project).find(item => item.domain === domain);

    expect(outcome?.positiveEvidence).toHaveLength(0);
    expect(outcome?.conflict).toBe(false);
  });

  it("keeps positive scoped tax evidence when followed by a negative exception", () => {
    const project = projectWithEvidence("VAT applies to physical goods, but no tax for gift cards");
    project.intake.ecommerceDecisions = decision("EXCLUSION", "Is tax calculation required?", "", "Not applicable", "Not applicable for launch");

    expect(ecommerceDecisions(project).find(item => item.id === "EC-EVIDENCE-CONFLICT-TAX")).toMatchObject({ status: "Needs answer" });
  });
});

describe("Ecommerce Pass 19 unresolved decision/configuration phrases", () => {
  it.each([
    "Not yet decided",
    "not yet decided",
    "Not decided yet",
    "Still not decided",
    "Not yet confirmed",
    "Not yet selected",
    "Not yet approved",
    "Decision not yet made"
  ])("classifies decision-state phrase %j as unresolved", value => {
    expect(classifyResolutionValue(value)).toBe("unresolved");
  });

  it("preserves ordinary workflow state containing not yet", () => {
    expect(classifyResolutionValue("Order not yet shipped")).toBe("resolved");
    const project = createEcommerceFixture();
    project.intake.workflowSteps = "Order not yet shipped";
    expect(isEcommerceRequiredSourceFieldResolved(project, "workflowSteps")).toBe(true);
  });

  it("keeps a required Ecommerce source field unresolved", () => {
    const project = createEcommerceFixture();
    project.intake.workflowSteps = "Not yet decided";

    expect(isEcommerceRequiredSourceFieldResolved(project, "workflowSteps")).toBe(false);
    expect(ecommerceDecisions(project).map(item => item.id)).toContain("EC-FIELD-WORKFLOW-STEPS");
  });

  it.each([
    "/ | Not yet decided | catalog",
    "/store | Brand | Not yet decided"
  ])("rejects unresolved route mapping %j", routes => {
    const project = createEcommerceFixture();
    project.intake.ecommerceRoutes = routes;

    expect(validatedEcommerceConfiguration(project).ecommerceRoutes).toMatchObject({ unresolved: true, value: "" });
    expect(ecommerceDecisions(project).map(item => item.id)).toContain("EC-ROUTES");
  });

  it("preserves a complete route mapping", () => {
    const project = createEcommerceFixture();
    project.intake.ecommerceRoutes = "/ | Rose & Paw | catalog";

    expect(validatedEcommerceConfiguration(project).ecommerceRoutes).toMatchObject({ unresolved: false, value: project.intake.ecommerceRoutes });
  });
});
