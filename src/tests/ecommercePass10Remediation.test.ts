import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { createEcommerceFixture } from "./helpers/ecommerce";

const evidenceFields = ["requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens", "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary", "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria", "outOfScope", "accessibilityNotes"] as const;
function projectWithEvidence(text: string) {
  const project = createEcommerceFixture();
  for (const field of evidenceFields) project.intake[field] = "Recorded behavior.";
  project.intake.acceptanceNotes = text;
  return project;
}
function output(text: string) {
  return ecommerceTestRequirements(projectWithEvidence(text)).map(row => `${row.category}: ${row.expectedResult}`).join("\n");
}

const outstandingStates = [
  "not yet approved", "not yet confirmed", "not yet selected", "not yet accepted",
  "awaiting approval", "awaiting final approval", "awaiting confirmation", "pending approval",
  "pending final approval", "still pending approval", "remains unapproved", "has not been approved yet",
  "has not yet been confirmed", "has not yet been approved", "remains unconfirmed",
  "is under consideration", "remains under consideration", "under consideration"
];
describe("Ecommerce Pass 10 outstanding candidate approval", () => {
  it.each(outstandingStates)("keeps currency unresolved: USD %s", state => {
    const text = output(`USD ${state}`);
    expect(text).not.toContain("flow in USD");
    expect(text).toContain("resolve the recorded currency");
  });
  it.each(outstandingStates)("shares outstanding state with checkout: guest checkout %s", state => {
    const text = output(`guest checkout ${state}`);
    expect(text).not.toContain("recorded guest checkout flow");
    expect(text).toContain("resolve the recorded checkout mode");
  });
  it.each(outstandingStates)("shares outstanding state with provider: Square payments %s", state => {
    const text = output(`Square payments ${state}`);
    expect(text).not.toContain("using the recorded Square payment integration");
    expect(text).toContain("resolve the recorded payment provider");
  });
  it.each(["USD approved", "USD is approved", "USD now approved", "USD has been approved", "USD confirmed", "USD selected", "USD accepted", "currency confirmed as USD"])("preserves final approval: %s", source => {
    expect(output(source)).toContain("flow in USD");
    expect(output(source)).not.toContain("resolve the recorded currency");
  });
  it.each([
    ["USD not yet approved, but CAD approved", "CAD"],
    ["USD was awaiting approval, but USD is now approved", "USD"],
    ["Currency was undecided, but USD has now been selected", "USD"],
    ["USD pending approval; CAD approved", "CAD"], ["USD pending approval; CAD only", "CAD"]
  ])("selects genuinely later resolution: %s", (source, currency) => {
    expect(output(source)).toContain(`flow in ${currency}`);
    expect(output(source)).not.toContain("resolve the recorded currency");
  });
  it.each(["USD not supported, now approved", "no USD, CAD, or EUR support", "USD not approved; CAD pending approval"])("preserves negative precedence: %s", source => {
    expect(output(source)).not.toMatch(/flow in (?:USD|CAD|EUR)/);
    expect(output(source)).toContain("resolve the recorded currency");
  });
});

describe("Ecommerce Pass 10 candidate-relative business grammar", () => {
  it.each([
    ["inventory pending approval", "Inventory"], ["inventory model pending approval", "Inventory"],
    ["inventory handling TBD", "Inventory"], ["inventory model unknown", "Inventory"],
    ["pending approval for inventory", "Inventory"], ["approval pending for inventory", "Inventory"],
    ["shipping pending approval", "Shipping"], ["tax jurisdiction unconfirmed", "Tax"],
    ["tax jurisdiction unknown", "Tax"], ["return policy awaiting approval", "Refunds/returns"],
    ["return policy pending approval", "Refunds/returns"]
  ])("keeps actual decision unresolved: %s", (source, category) => {
    const rows = ecommerceTestRequirements(projectWithEvidence(source));
    expect(rows.map(row => row.category)).not.toContain(category);
    if (category !== "Inventory") expect(rows.find(row => row.category === "Scope dependencies")?.expectedResult).toContain("resolve the recorded");
  });
  it.each([
    ["Pending inventory refunds require review", "Inventory"],
    ["Pending inventory inspections require review", "Inventory"],
    ["Pending inventory transfers remain visible", "Inventory"],
    ["Unknown inventory transactions are quarantined", "Inventory"],
    ["Deferred inventory jobs retry later", "Inventory"],
    ["pending inventory reconciliation runs nightly", "Inventory"],
    ["unknown inventory transactions are flagged", "Inventory"],
    ["deferred inventory updates retry automatically", "Inventory"],
    ["pending shipping orders remain visible", "Shipping"],
    ["unknown tax transactions enter review", "Tax"],
    ["unknown tax transactions require manual review", "Tax"],
    ["pending refund requests require admin approval", "Refunds/returns"],
    ["pending refund requests require review", "Refunds/returns"],
    ["Pending inventory inspections prevent sale", "Inventory"],
    ["Charge VAT when an order is pending fulfillment", "Tax"],
    ["Pending inventory settlements complete overnight", "Inventory"],
    ["Unknown shipping exceptions enter review", "Shipping"],
    ["Deferred refund batches resume tomorrow", "Refunds/returns"]
  ])("preserves business noun phrase without noun whitelist: %s", (source, category) => {
    expect(ecommerceTestRequirements(projectWithEvidence(source)).map(row => row.category)).toContain(category);
  });
});

describe("Ecommerce Pass 10 explicit provider discovery", () => {
  const falseProviders = [
    "Pending USD payments remain visible to admins", "Failed CAD payments retry automatically",
    "Failed CAD payments are retried", "USD payments are accepted", "Canadian payments are supported",
    "Online payments are required", "Guest payments are allowed", "Pending payments require review",
    "Successful payments trigger fulfillment", "Failed payments trigger notifications", "Credit card payments are supported"
  ];
  it.each(falseProviders)("does not invent provider: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).not.toMatch(/using the recorded .* integration; replay/);
    expect(text).toContain("resolve the recorded payment provider");
  });
  it.each(["CAD", "USD", "EUR", "GBP", "AUD", "NZD", "JPY", "CNY", "INR", "CHF", "SEK", "NOK", "DKK", "MXN", "BRL"])("never interprets currency as provider: %s", currency => {
    for (const source of [`${currency} payments accepted`, `payments via ${currency}`, `payment provider: ${currency}`]) {
      expect(output(source), source).not.toMatch(/using the recorded .* payment integration/);
      expect(output(source), source).toContain("resolve the recorded payment provider");
    }
  });
  it.each([
    ["Square payments", "Square"], ["Stripe Connect payments", "Stripe Connect"],
    ["payments via Square", "Square"], ["payments through Stripe Connect", "Stripe Connect"],
    ["payments from Acme Commerce", "Acme Commerce"], ["webhooks from Square", "Square"],
    ["Square payment integration", "Square"], ["payment provider: Square", "Square"],
    ["payment provider is Stripe Connect", "Stripe Connect"], ["use Square for payments", "Square"],
    ["Acme Commerce payment provider", "Acme Commerce"],
    ["payments via PayPal Commerce Platform", "PayPal Commerce Platform"],
    ["USD payments through Square", "Square"]
  ])("preserves named relationship and complete name: %s", (source, provider) => {
    expect(output(source)).toContain(`using the recorded ${provider} payment integration`);
    expect(output(source)).not.toContain("resolve the recorded payment provider");
  });
  it("separates ordinary currency evidence from provider identity without mutating intake", () => {
    const project = projectWithEvidence("Pending USD payments remain visible to admins");
    const before = structuredClone(project);
    const text = ecommerceTestRequirements(project).map(row => row.expectedResult).join("\n");
    expect(text).toContain("flow in USD");
    expect(text).toContain("resolve the recorded payment provider");
    expect(text).not.toContain("Pending USD payment integration");
    expect(project).toEqual(before);
    expect(output("USD payments through Square")).toContain("flow in USD using the recorded Square payment integration");
  });
  it("keeps generated acceptance and test-plan evidence synchronized", () => {
    const result = generateProjectPackage(projectWithEvidence("USD awaiting final approval; Pending payments require review"));
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      const content = result.documents.find(document => document.fileName === name)!.content;
      expect(content, name).not.toContain("flow in USD");
      expect(content, name).not.toContain("Pending payment integration");
      expect(content, name).toContain("resolve the recorded currency");
      expect(content, name).toContain("resolve the recorded payment provider");
    }
  });
});
