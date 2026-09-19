import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { createEcommerceFixture } from "./helpers/ecommerce";

const evidenceFields = ["requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens", "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary", "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria", "outOfScope", "accessibilityNotes"] as const;
function projectWithEvidence(text: string) {
  const project = createEcommerceFixture();
  for (const field of evidenceFields) project.intake[field] = "Recorded behavior.";
  project.intake.acceptanceNotes = text;
  return project;
}
const output = (text: string) => ecommerceTestRequirements(projectWithEvidence(text)).map(row => `${row.category}: ${row.expectedResult}`).join("\n");
const categories = (text: string) => ecommerceTestRequirements(projectWithEvidence(text)).map(row => row.category);

describe("Ecommerce Pass 12 complete explicit provider values", () => {
  it.each([
    "payment provider: Not sure", "payment provider: not sure", "payment provider is Unknown",
    "payment provider: Unsure", "payment provider: Unconfirmed", "payment provider: Pending",
    "payment provider: Pending approval", "payments via TBD", "payments through Unknown"
  ])("rejects the complete unresolved value: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it.each([
    ["payment provider: Not sure; payments via Square", "Square"],
    ["payment provider is Unknown; payment provider: Stripe Connect", "Stripe Connect"],
    ["payments via TBD; payments through Square", "Square"]
  ])("selects a later resolved provider without a truncated placeholder: %s", (source, provider) => {
    const text = output(source);
    expect(text).toContain(`using the recorded ${provider} payment integration`);
    expect(text).not.toMatch(/recorded (?:Not|Unknown|TBD) payment integration/);
  });

  it.each([
    ["payment provider: Square", "Square"], ["payment provider is Stripe Connect", "Stripe Connect"],
    ["payments via Square", "Square"], ["payments through Stripe Connect", "Stripe Connect"],
    ["webhooks from Square", "Square"], ["use Square for payments", "Square"]
  ])("preserves explicit resolved provider: %s", (source, provider) => {
    expect(output(source)).toContain(`using the recorded ${provider} payment integration`);
  });

  it.each(["Pending USD payments remain visible", "Failed CAD payments retry automatically", "Online payments are required", "Credit card payments are supported"])("preserves legacy false-provider rejection: %s", source => {
    expect(output(source)).not.toMatch(/using the recorded .* payment integration/);
  });
});

describe("Ecommerce Pass 12 attributed candidate decision tails", () => {
  it.each([
    ["Pending USD approval by client", "currency", "USD"],
    ["Pending USD approval by the client", "currency", "USD"],
    ["Awaiting USD confirmation from owner", "currency", "USD"],
    ["Pending inventory approval by stakeholder", "category", "Inventory"],
    ["Awaiting shipping decision from the owner", "category", "Shipping"],
    ["Pending guest checkout selection by client", "checkout", "guest checkout"],
    ["Pending Square payments confirmation by vendor", "provider", "Square"]
  ])("keeps attributed status unresolved: %s", (source, kind, value) => {
    const text = output(source);
    if (kind === "currency") expect(text).not.toContain(`flow in ${value}`);
    else if (kind === "checkout") expect(text).not.toContain(`recorded ${value} flow`);
    else if (kind === "provider") expect(text).not.toContain(`recorded ${value} payment integration`);
    else expect(categories(source)).not.toContain(value);
    expect(text).toContain("resolve the recorded");
  });

  it.each([
    ["Pending inventory approval requests require review", "Inventory"],
    ["Inventory approval requests remain visible", "Inventory"],
    ["Pending shipping decision records are archived", "Shipping"],
    ["Pending refund approval tasks require action", "Refunds/returns"]
  ])("preserves business-object continuation: %s", (source, category) => {
    expect(categories(source)).toContain(category);
  });

  it.each([
    ["Pending USD approval by client, but CAD approved", "CAD"],
    ["USD was awaiting approval by client, but USD is now approved", "USD"]
  ])("preserves later contrast resolution: %s", (source, currency) => {
    expect(output(source)).toContain(`flow in ${currency}`);
  });

  it.each(["USD approved", "USD confirmed", "Shipping approved"])("preserves explicit positive control: %s", source => {
    expect(output(source)).not.toContain("resolve the recorded currency");
  });
});
