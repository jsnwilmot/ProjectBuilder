import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { createEcommerceFixture } from "./helpers/ecommerce";

const evidenceFields = ["requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens", "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary", "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria", "outOfScope", "accessibilityNotes"] as const;

function projectWithEvidence(text: string) {
  const project = createEcommerceFixture();
  for (const field of evidenceFields) project.intake[field] = "Recorded behavior.";
  project.intake.acceptanceNotes = text;
  return project;
}

const requirements = (text: string) => ecommerceTestRequirements(projectWithEvidence(text));
const output = (text: string) => requirements(text).map(row => `${row.category}: ${row.expectedResult}`).join("\n");
const categories = (text: string) => requirements(text).map(row => row.category);

describe("Ecommerce Pass 13 bounded explicit provider entities", () => {
  it.each([
    "payments via Square is pending approval",
    "payments through Stripe Connect is awaiting approval",
    "payment provider: Square pending approval",
    "payment provider is Stripe Connect awaiting confirmation"
  ])("keeps a provider with trailing unresolved status non-positive: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it.each([
    ["payments via Square for online orders", "Square", "for online orders"],
    ["payments through Stripe Connect for guest checkout", "Stripe Connect", "for guest checkout"],
    ["webhooks from Square for payment events", "Square", "for payment events"]
  ])("keeps trailing scope prose outside the provider entity: %s", (source, provider, scope) => {
    const text = output(source);
    expect(text).toContain(`using the recorded ${provider} payment integration`);
    expect(text).not.toContain(`recorded ${provider} ${scope} payment integration`);
  });

  it.each([
    ["payments via Square", "Square"],
    ["payments through Stripe Connect", "Stripe Connect"],
    ["payment provider: Square", "Square"],
    ["payment provider is Stripe Connect", "Stripe Connect"]
  ])("preserves simple explicit provider evidence: %s", (source, provider) => {
    expect(output(source)).toContain(`using the recorded ${provider} payment integration`);
  });

  it.each([
    "payment provider: Not sure",
    "payment provider: not sure",
    "payment provider is Unknown",
    "payments via TBD"
  ])("preserves complete unresolved provider rejection: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it("preserves a later valid provider after a complete unresolved value", () => {
    const text = output("payment provider: Not sure; payments via Square");
    expect(text).toContain("using the recorded Square payment integration");
    expect(text).not.toMatch(/recorded Not(?: sure)? payment integration/);
  });

  it.each([
    "Pending USD payments remain visible",
    "Failed CAD payments retry",
    "Online payments are required",
    "Credit card payments are supported",
    "Pending payments require review"
  ])("preserves provider false-positive protection: %s", source => {
    expect(output(source)).not.toMatch(/using the recorded .* payment integration/);
  });
});

describe("Ecommerce Pass 13 bounded decision attribution", () => {
  it.each([
    ["Pending refund approval by managers triggers notifications", "Refunds/returns"],
    ["Pending refund approval by managers creates a task", "Refunds/returns"],
    ["Pending refund approval by managers requires logging", "Refunds/returns"],
    ["Pending inventory confirmation by operators starts reconciliation", "Inventory"],
    ["Pending shipping decision by staff generates an alert", "Shipping"]
  ])("preserves business evidence when attribution is followed by an action: %s", (source, category) => {
    expect(categories(source)).toContain(category);
  });

  it.each([
    ["Pending USD approval by client", "currency", "USD"],
    ["Pending USD approval by the client", "currency", "USD"],
    ["Awaiting shipping decision from the owner", "category", "Shipping"],
    ["Pending inventory confirmation by security team", "category", "Inventory"],
    ["Pending guest checkout selection by project owner", "checkout", "guest checkout"]
  ])("preserves a complete attributed decision state: %s", (source, kind, value) => {
    const text = output(source);
    if (kind === "currency") expect(text).not.toContain(`flow in ${value}`);
    else if (kind === "checkout") expect(text).not.toContain(`recorded ${value} flow`);
    else expect(categories(source)).not.toContain(value);
    expect(text).toContain("resolve the recorded");
  });

  it.each([
    ["Pending inventory refunds require review", "Inventory"],
    ["Pending inventory approval requests require review", "Inventory"],
    ["Inventory approval requests are retained", "Inventory"],
    ["Pending shipping decision records are archived", "Shipping"],
    ["Pending refund approval tasks are assigned", "Refunds/returns"]
  ])("preserves business-object continuation: %s", (source, category) => {
    expect(categories(source)).toContain(category);
  });
});
