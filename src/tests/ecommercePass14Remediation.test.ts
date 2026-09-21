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

describe("Ecommerce Pass 14 terminal decision attribution", () => {
  it.each([
    ["Pending USD approval by product steering committee", "currency", "USD"],
    ["Pending USD approval by the product steering committee", "currency", "USD"],
    ["Awaiting shipping decision from information security review board", "category", "Shipping"],
    ["Pending inventory confirmation by senior project management team", "category", "Inventory"],
    ["Pending guest checkout selection by ecommerce governance working group", "checkout", "guest checkout"]
  ])("keeps an arbitrary-length terminal actor attribution unresolved: %s", (source, kind, value) => {
    const text = output(source);
    if (kind === "currency") expect(text).not.toContain(`flow in ${value}`);
    else if (kind === "checkout") expect(text).not.toContain(`recorded ${value} flow`);
    else expect(categories(source)).not.toContain(value);
    expect(text).toContain("resolve the recorded");
  });

  it.each([
    ["Pending refund approval by managers triggers notifications", "Refunds/returns"],
    ["Pending refund approval by senior managers creates a task", "Refunds/returns"],
    ["Pending inventory confirmation by warehouse operators starts reconciliation", "Inventory"],
    ["Pending shipping decision by logistics staff generates an alert", "Shipping"],
    ["Pending tax approval by finance analysts requires documentation", "Tax"],
    ["Pending refund approval by product steering committee triggers notifications", "Refunds/returns"]
  ])("preserves business evidence after an attributed phrase continues into a predicate: %s", (source, category) => {
    expect(categories(source)).toContain(category);
  });

  it.each([
    ["Pending USD approval by client", "currency", "USD"],
    ["Awaiting shipping decision from owner", "category", "Shipping"],
    ["Pending inventory confirmation by stakeholder", "category", "Inventory"]
  ])("preserves an existing short terminal actor attribution: %s", (source, kind, value) => {
    const text = output(source);
    if (kind === "currency") expect(text).not.toContain(`flow in ${value}`);
    else expect(categories(source)).not.toContain(value);
    expect(text).toContain("resolve the recorded");
  });
});

describe("Ecommerce Pass 14 provider status continuations", () => {
  it.each([
    "payment provider: Square subject to client approval",
    "payments via Square subject to security approval",
    "payments through Stripe Connect under review",
    "payment provider is Square not yet approved",
    "payments via Square while approval is pending"
  ])("keeps a provider with a grammatical unresolved status non-positive: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it.each([
    ["payment provider: Square", "Square", ""],
    ["payments via Square", "Square", ""],
    ["payments via Square for online orders", "Square", "for online orders"],
    ["payments through Stripe Connect for guest checkout", "Stripe Connect", "for guest checkout"],
    ["webhooks from Square for payment events", "Square", "for payment events"],
    ["payments via Square when processing refunds", "Square", "when processing refunds"]
  ])("preserves positive provider evidence and excludes scope prose: %s", (source, provider, scope) => {
    const text = output(source);
    expect(text).toContain(`using the recorded ${provider} payment integration`);
    if (scope) expect(text).not.toContain(`recorded ${provider} ${scope} payment integration`);
  });

  it.each([
    "payment provider: Not sure",
    "payment provider is Unknown",
    "payments via TBD",
    "payment provider: Pending approval"
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
    "Credit card payments are supported"
  ])("preserves provider false-positive protection: %s", source => {
    expect(output(source)).not.toMatch(/using the recorded .* payment integration/);
  });
});
