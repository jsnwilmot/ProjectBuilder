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
function rows(text: string) {
  return ecommerceTestRequirements(projectWithEvidence(text));
}
function output(text: string) {
  return rows(text).map(row => `${row.category}: ${row.expectedResult}`).join("\n");
}

describe("Ecommerce Pass 11 candidate-bound decision tails", () => {
  it.each([
    ["Pending USD approval", "currency", "USD"],
    ["Pending USD final approval", "currency", "USD"],
    ["Awaiting USD confirmation", "currency", "USD"],
    ["Pending inventory approval", "category", "Inventory"],
    ["Pending inventory confirmation", "category", "Inventory"],
    ["Awaiting inventory approval", "category", "Inventory"],
    ["Pending guest checkout selection", "checkout", "guest checkout"],
    ["Pending Square payments confirmation", "provider", "Square"],
    ["Pending shipping decision", "category", "Shipping"],
    ["Pending inventory approval for launch", "category", "Inventory"]
  ])("keeps the candidate decision unresolved: %s", (source, kind, value) => {
    const text = output(source);
    if (kind === "currency") {
      expect(text).not.toContain(`flow in ${value}`);
      expect(text).toContain("resolve the recorded currency");
    } else if (kind === "checkout") {
      expect(text).not.toContain(`recorded ${value} flow`);
      expect(text).toContain("resolve the recorded checkout mode");
    } else if (kind === "provider") {
      expect(text).not.toContain(`recorded ${value} payment integration`);
      expect(text).toContain("resolve the recorded payment provider");
    } else {
      expect(rows(source).map(row => row.category)).not.toContain(value);
      if (value === "Shipping") expect(text).toContain("resolve the recorded shipping model");
    }
  });

  it.each([
    ["Pending inventory refunds require review", "Inventory"],
    ["Pending inventory transfers remain visible", "Inventory"],
    ["Pending inventory approval requests require review", "Inventory"],
    ["Inventory approval requests are retained for audit", "Inventory"],
    ["Pending shipping orders are shown to staff", "Shipping"],
    ["Pending shipping orders remain visible", "Shipping"],
    ["Pending refund approvals require manager review", "Refunds/returns"]
  ])("preserves continuing business-object prose: %s", (source, category) => {
    expect(rows(source).map(row => row.category)).toContain(category);
  });

  it.each([
    "USD approved", "USD now approved", "USD has been approved", "USD confirmed",
    "USD was awaiting approval, but USD is now approved"
  ])("preserves genuinely approved currency: %s", source => {
    expect(output(source)).toContain("flow in USD");
  });

  it.each([
    "USD not yet approved", "USD awaiting final approval", "USD pending approval",
    "USD has not yet been approved", "USD remains unconfirmed", "USD under consideration"
  ])("preserves Pass 10 outstanding postfixes: %s", source => {
    expect(output(source)).not.toContain("flow in USD");
    expect(output(source)).toContain("resolve the recorded currency");
  });
});

describe("Ecommerce Pass 11 provider semantic validation", () => {
  it.each([
    "payment provider: Pending", "payment provider is Unknown", "payments via TBD",
    "payment provider: Unconfirmed", "payment provider: Pending Approval", "payment provider: Not Sure"
  ])("rejects unresolved captured provider value: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).not.toMatch(/using the recorded .* integration; replay/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it.each([
    ["payment provider: Square", "Square"],
    ["payment provider is Stripe Connect", "Stripe Connect"],
    ["payments via Square", "Square"],
    ["payments through Stripe Connect", "Stripe Connect"],
    ["Square payments remain pending until fulfillment", "Square"],
    ["Square payments pending settlement", "Square"]
  ])("preserves resolved provider identity: %s", (source, provider) => {
    expect(output(source)).toContain(`using the recorded ${provider} payment integration`);
  });

  it.each(["Pending USD payments remain visible", "Failed CAD payments retry automatically"])("preserves false-provider rejection: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });

  it("allows a later independent valid provider after an unresolved placeholder", () => {
    const text = output("payment provider: Pending; payments via Square");
    expect(text).toContain("using the recorded Square payment integration");
    expect(text).not.toContain("resolve the recorded payment provider");
  });

  it("keeps generated documents synchronized without mutating intake", () => {
    const project = projectWithEvidence("Pending USD approval; payment provider: Unknown");
    const snapshot = structuredClone(project);
    const result = generateProjectPackage(project);
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      const content = result.documents.find(document => document.fileName === name)!.content;
      expect(content, name).not.toContain("flow in USD");
      expect(content, name).not.toContain("Unknown payment integration");
      expect(content, name).toContain("resolve the recorded currency");
      expect(content, name).toContain("resolve the recorded payment provider");
    }
    expect(project).toEqual(snapshot);
  });
});
