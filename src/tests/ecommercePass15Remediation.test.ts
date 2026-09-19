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

describe("Ecommerce Pass 15 attributed decision boundaries", () => {
  it.each([
    ["Pending refund approval by managers alerts customers", "Refunds/returns"],
    ["Pending refund approval by managers emails customers", "Refunds/returns"],
    ["Pending refund approval by managers updates dashboards", "Refunds/returns"],
    ["Pending refund approval by senior managers notifies support", "Refunds/returns"],
    ["Pending inventory confirmation by warehouse operators launches reconciliation", "Inventory"],
    ["Pending shipping decision by logistics staff sends an alert", "Shipping"],
    ["Pending tax approval by finance analysts creates documentation", "Tax"],
    ["Pending refund approval by managers publishes receipts", "Refunds/returns"],
    ["Pending refund approval by managers escalates cases", "Refunds/returns"]
  ])("preserves business evidence after an attributed noun phrase continues into an unlisted predicate: %s", (source, category) => {
    expect(categories(source)).toContain(category);
  });

  it.each([
    ["Pending USD approval by product steering committee", "currency", "USD"],
    ["Pending USD approval by enterprise architecture board", "currency", "USD"],
    ["Awaiting shipping decision from information security review board", "category", "Shipping"],
    ["Pending inventory confirmation by business operations group", "category", "Inventory"],
    ["Pending guest checkout selection by ecommerce governance working group", "checkout", "guest checkout"],
    ["Pending USD approval by procurement steering committee", "currency", "USD"],
    ["Pending inventory confirmation by advanced systems board", "category", "Inventory"],
    ["Pending inventory confirmation by senior project management team", "category", "Inventory"]
  ])("keeps a terminal actor noun phrase unresolved without an actor-length cap: %s", (source, kind, value) => {
    const text = output(source);
    if (kind === "currency") expect(text).not.toContain(`flow in ${value}`);
    else if (kind === "checkout") expect(text).not.toContain(`recorded ${value} flow`);
    else expect(categories(source)).not.toContain(value);
    expect(text).toContain("resolve the recorded");
  });

  it.each([
    ["Pending refund approval by managers triggers notifications", "Refunds/returns"],
    ["Pending refund approval by managers creates a task", "Refunds/returns"],
    ["Pending refund approval by managers requires logging", "Refunds/returns"],
    ["Pending inventory confirmation by operators starts reconciliation", "Inventory"],
    ["Pending shipping decision by staff generates an alert", "Shipping"]
  ])("preserves the existing attributed action controls: %s", (source, category) => {
    expect(categories(source)).toContain(category);
  });

  it.each([
    ["Pending USD approval by client", "currency", "USD"],
    ["Awaiting shipping decision from owner", "category", "Shipping"],
    ["Pending inventory confirmation by senior project management team", "category", "Inventory"]
  ])("preserves true attributed decisions: %s", (source, kind, value) => {
    const text = output(source);
    if (kind === "currency") expect(text).not.toContain(`flow in ${value}`);
    else expect(categories(source)).not.toContain(value);
    expect(text).toContain("resolve the recorded");
  });
});

describe("Ecommerce Pass 15 provider decision-relative state", () => {
  it.each([
    ["payments via Square while refunds are pending", "Square"],
    ["payments via Square while orders are pending", "Square"],
    ["payments through Stripe Connect while shipments remain pending", "Stripe Connect"],
    ["payments via Square while transactions are pending", "Square"],
    ["payments via Square while payment captures are pending", "Square"],
    ["payments via Square for online orders", "Square"],
    ["payments via Square when processing refunds", "Square"],
    ["webhooks from Square for payment events", "Square"]
  ])("keeps a resolved provider positive when later context describes business state or scope: %s", (source, provider) => {
    const text = output(source);
    expect(text).toContain(`using the recorded ${provider} payment integration`);
    expect(text).not.toContain(`recorded ${provider} while`);
  });

  it.each([
    "payments via Square while approval is pending",
    "payments via Square while client approval is pending",
    "payments through Stripe Connect while confirmation is pending",
    "payments via Square while provider confirmation is pending",
    "payments via Square while the provider decision remains pending",
    "payment provider: Square subject to client approval",
    "payments via Square subject to security approval",
    "payments through Stripe Connect under review"
  ])("keeps provider-selection decision state unresolved: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it.each([
    "payment provider: Not sure",
    "payment provider is Unknown",
    "payments via TBD"
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
