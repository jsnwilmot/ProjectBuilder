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

describe("Ecommerce Pass 16 conservative attributed-decision grammar", () => {
  it.each([
    ["Pending USD approval by global business operations group", "currency", "USD"],
    ["Pending USD approval by product steering committee", "currency", "USD"],
    ["Pending USD approval by enterprise business operations group", "currency", "USD"],
    ["Awaiting shipping decision from information security review board", "category", "Shipping"],
    ["Pending inventory confirmation by senior project management team", "category", "Inventory"],
    ["Pending guest checkout selection by ecommerce governance working group", "checkout", "guest checkout"],
    ["Pending USD approval by client", "currency", "USD"],
    ["Awaiting shipping decision from owner", "category", "Shipping"],
    ["Pending inventory confirmation by stakeholder", "category", "Inventory"]
  ])("keeps a structurally terminal attribution unresolved: %s", (source, kind, value) => {
    const text = output(source);
    if (kind === "currency") expect(text).not.toContain(`flow in ${value}`);
    else if (kind === "checkout") expect(text).not.toContain(`recorded ${value} flow`);
    else expect(categories(source)).not.toContain(value);
    expect(text).toContain("resolve the recorded");
  });

  it.each([
    ["Pending refund approval by managers alert customers", "Refunds/returns"],
    ["Pending refund approval by managers alerts customers", "Refunds/returns"],
    ["Pending refund approval by managers email customers", "Refunds/returns"],
    ["Pending refund approval by managers notify support", "Refunds/returns"],
    ["Pending refund approval by senior managers update dashboards", "Refunds/returns"],
    ["Pending inventory confirmation by warehouse operators launch reconciliation", "Inventory"],
    ["Pending shipping decision by logistics staff generate alerts", "Shipping"],
    ["Pending refund approval by managers triggers notifications", "Refunds/returns"],
    ["Pending refund approval by managers creates a task", "Refunds/returns"],
    ["Pending refund approval by managers requires logging", "Refunds/returns"],
    ["Pending inventory confirmation by operators starts reconciliation", "Inventory"],
    ["Pending shipping decision by staff generates an alert", "Shipping"],
    ["Pending refund approval by managers emails customers", "Refunds/returns"],
    ["Pending inventory confirmation by warehouse operators launches reconciliation", "Inventory"],
    ["Pending tax approval by finance analysts creates documentation", "Tax"]
  ])("preserves attributed business/action prose without a verb dictionary: %s", (source, category) => {
    expect(categories(source)).toContain(category);
  });
});

describe("Ecommerce Pass 16 provider-selection decision subjects", () => {
  it.each([
    ["payments via Square while refund approval is pending", "Square"],
    ["payments via Square while return approval is pending", "Square"],
    ["payments via Square while order approval is pending", "Square"],
    ["payments via Square while refunds are pending", "Square"],
    ["payments via Square while shipments remain pending", "Square"],
    ["payments via Square while transactions are pending", "Square"],
    ["payments via Square while the customer's refund approval is pending", "Square"],
    ["payments via Square while the warehouse team's shipment approval is pending", "Square"]
  ])("keeps provider evidence positive when another workflow or business object is pending: %s", (source, provider) => {
    const text = output(source);
    expect(text).toContain(`using the recorded ${provider} payment integration`);
    expect(text).not.toContain(`recorded ${provider} while`);
  });

  it.each([
    "payments via Square while approval is pending",
    "payments via Square while client approval is pending",
    "payments via Square while the approval is pending",
    "payments via Square while provider approval is pending",
    "payments via Square while payment provider confirmation is pending",
    "payments via Square while provider selection remains pending"
  ])("keeps an explicit or contextually bare provider decision unresolved: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it.each([
    "payments via Square while the client's approval is pending",
    "payments via Square while the customer’s approval is pending",
    "payments via Square while the owner's approval is pending",
    "payments through Stripe Connect while the stakeholder's confirmation is pending",
    "payments through Stripe Connect while the vendor’s confirmation remains pending",
    "payments via Square while the security team's approval is pending",
    "payments via Square while the project owner’s decision is pending"
  ])("supports a structural possessive provider-decision actor: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it.each([
    "payment provider: Square subject to client approval",
    "payments via Square subject to security approval",
    "payments through Stripe Connect under review"
  ])("preserves established unresolved provider conditions: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it.each([
    "payment provider: Not sure",
    "payment provider is Unknown",
    "payments via TBD",
    "payment provider: Pending approval"
  ])("preserves sentence-case unresolved provider rejection: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it("preserves the later resolved provider after an unresolved complete value", () => {
    const text = output("payment provider: Not sure; payments via Square");
    expect(text).toContain("using the recorded Square payment integration");
    expect(text).not.toMatch(/recorded Not(?: sure)? payment integration/);
  });

  it.each([
    "Pending USD payments remain visible",
    "Failed CAD payments retry",
    "Online payments are required",
    "Credit card payments are supported"
  ])("preserves provider false-positive protection: %s", source => {
    expect(output(source)).not.toMatch(/using the recorded .* payment integration/);
  });
});
