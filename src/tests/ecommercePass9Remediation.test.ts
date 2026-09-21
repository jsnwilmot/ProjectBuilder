import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { createEcommerceFixture } from "./helpers/ecommerce";

const evidenceFields = ["requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens", "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary", "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria", "outOfScope", "accessibilityNotes"] as const;
function projectWithEvidence(text: string) {
  const p = createEcommerceFixture();
  for (const field of evidenceFields) p.intake[field] = "Recorded behavior.";
  p.intake.acceptanceNotes = text;
  return p;
}
function output(text: string) {
  return ecommerceTestRequirements(projectWithEvidence(text)).map(r => `${r.category}: ${r.expectedResult}`).join("\n");
}

export const unresolvedCurrencyCases = [
  "not sure which currency, maybe usd", "currency pending approval: usd",
  "not sure whether currency should be usd", "not sure whether to use usd", "unsure if usd should be used",
  "currency pending approval, likely usd", "currency undecided: cad", "currency undecided, likely cad",
  "currency still unknown, maybe eur", "currency not confirmed: gbp", "awaiting currency decision: usd",
  "awaiting currency decision: eur", "awaiting approval of currency, usd", "currency to be determined, possibly cad",
  "payment currency TBD: eur", "payment currency TBD: gbp", "payment currency still unknown: gbp",
  "probably usd, pending approval", "usd maybe, still awaiting approval", "usd is being considered but not approved",
  "maybe usd", "possibly usd", "probably usd", "likely usd", "Currency may be USD; final decision pending.",
  "not certain whether to use usd", "don't know which currency, usd", "currency pending approval: usd, cad, or eur",
  "USD approved, pending approval"
];

describe("Ecommerce Pass 9 currency context", () => {
  it.each(unresolvedCurrencyCases)("does not authorize undecided currency: %s", source => {
    const p = projectWithEvidence(source);
    const snapshot = structuredClone(p);
    const rows = ecommerceTestRequirements(p);
    expect(rows.find(r => r.category === "Checkout/payment")!.expectedResult).not.toMatch(/flow in (?:USD|CAD|EUR|GBP)/);
    expect(rows.find(r => r.category === "Scope dependencies")?.expectedResult).toContain("resolve the recorded currency");
    expect(p).toEqual(snapshot);
  });
  it.each([
    "currency is usd", "currency: usd", "use usd", "checkout in usd", "usd only", "usd accepted", "usd supported",
    "approved currency is usd", "we will use usd", "payments are in usd", "currency confirmed as usd", "selected currency: usd",
    "checkout in Usd", "checkout in uSd", "Pending USD payments remain visible to admins.",
    "Unknown USD transactions are sent to manual review.",
    "Customers who are not sure which size to order can read the sizing guide; checkout in usd."
  ])("preserves selected currency and ordinary business states: %s", source => {
    expect(output(source)).toMatch(/flow in USD/);
    expect(output(source)).not.toContain("resolve the recorded currency");
  });
  it.each([
    ["USD pending approval; CAD accepted", "CAD"], ["USD pending approval, but CAD accepted", "CAD"],
    ["currency pending approval: USD, but CAD is approved", "CAD"],
    ["currency was pending approval, but USD is now approved", "USD"],
    ["not sure which currency initially; USD has now been approved", "USD"],
    ["We considered USD, but CAD is approved.", "CAD"],
    ["Currency was initially uncertain, but USD is now approved.", "USD"],
    ["Currency pending approval: USD, but CAD has since been approved.", "CAD"],
    ["currency pending approval: usd; cad accepted", "CAD"],
    ["USD pending approval, however CAD accepted", "CAD"],
    ["USD pending approval. CAD accepted", "CAD"], ["USD pending approval\nCAD accepted", "CAD"],
    ["maybe USD, now approved", "USD"]
  ])("respects later approval and segment boundaries: %s => %s", (source, currency) => {
    expect(output(source)).toMatch(new RegExp(`flow in ${currency}`));
    expect(output(source)).not.toContain("resolve the recorded currency");
  });
  it.each([
    ["do not support usd; cad only", "CAD"], ["no cad, usd, or eur support", ""],
    ["USD not supported; CAD accepted", "CAD"], ["No CAD, USD, or EUR support, but GBP is accepted", "GBP"],
    ["do not support usd; maybe cad", ""], ["USD not supported, maybe approved", ""]
  ])("preserves negative precedence and coordinated groups: %s", (source, currency) => {
    const text = output(source);
    if (currency) {
      expect(text).toMatch(new RegExp(`flow in ${currency}`));
      expect(text).not.toContain("resolve the recorded currency");
    } else {
      expect(text).not.toMatch(/flow in (?:USD|CAD|EUR|GBP)/);
      expect(text).toContain("resolve the recorded currency");
    }
  });
  it("keeps generated test-plan and acceptance currency dependencies synchronized", () => {
    const result = generateProjectPackage(projectWithEvidence("not sure which currency, maybe usd"));
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      const content = result.documents.find(d => d.fileName === name)!.content;
      expect(content, name).not.toMatch(/flow in USD/);
      expect(content, name).toContain("resolve the recorded currency");
    }
  });
});

describe("Ecommerce Pass 9 shared option context", () => {
  it.each([
    "not sure which payment provider, maybe Stripe Connect payments",
    "payment provider pending approval: Square payments",
    "awaiting payment provider decision: payments via Stripe Connect",
    "payment provider still unknown: webhooks from Square"
  ])("does not authorize undecided supported provider syntax: %s", source => {
    const text = output(source);
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).toContain("resolve the recorded payment provider");
  });
  it.each(["Stripe Connect payments approved", "Square payments approved", "payments via Stripe Connect", "Square payments reconcile pending orders"])("preserves supported provider evidence: %s", source => {
    expect(output(source)).toMatch(/using the recorded (?:Square|Stripe Connect) payment integration/);
    expect(output(source)).not.toContain("resolve the recorded payment provider");
  });
  it.each(["not sure which checkout mode, maybe guest checkout", "checkout mode pending approval: guest checkout", "unsure whether to use authenticated checkout"])("does not authorize undecided checkout: %s", source => {
    expect(output(source)).not.toMatch(/recorded (?:guest|authenticated) checkout flow/);
    expect(output(source)).toContain("resolve the recorded checkout mode");
  });
  it.each(["guest checkout approved", "guest checkout shows pending orders"])("preserves supported checkout: %s", source => {
    expect(output(source)).toContain("recorded guest checkout flow");
    expect(output(source)).not.toContain("resolve the recorded checkout mode");
  });
  it.each(["not sure whether to require Admin MFA", "authentication pending approval: Admin MFA", "maybe Admin MFA"])("does not authorize uncertain MFA: %s", source => {
    expect(output(source)).not.toMatch(/including Admin MFA/i);
  });
  it("preserves approved MFA despite pending business objects", () => {
    expect(output("Admin MFA required for pending orders")).toMatch(/including Admin MFA/i);
  });
  it.each([
    ["tax jurisdiction pending approval: VAT", "Tax", "tax jurisdiction and model"],
    ["shipping model still unknown: shipping", "Shipping", "shipping model"],
    ["return policy pending approval: refunds", "Refunds/returns", "return and refund policy"]
  ])("uses shared unresolved detection for generic evidence: %s", (source, category, dependency) => {
    const rows = ecommerceTestRequirements(projectWithEvidence(source));
    expect(rows.map(r => r.category)).not.toContain(category);
    expect(rows.find(r => r.category === "Scope dependencies")?.expectedResult).toContain(`resolve the recorded ${dependency}`);
  });
  it.each([
    ["Charge VAT when an order is pending fulfillment.", "Tax"],
    ["Ship orders after payment is pending review; shipping uses Canada Post.", "Shipping"],
    ["Administrators can view pending orders.", "Roles"],
    ["Unknown users receive a generic authorization error; Admin MFA required.", "Roles"],
    ["Deferred jobs retry after five minutes; Square webhooks retry failed events.", "Webhooks/idempotency/reconciliation"],
    ["Customers who are not sure which size to order can read the sizing guide; inventory enforces availability.", "Inventory"]
  ])("does not let unrelated business uncertainty govern resolved evidence: %s", (source, category) => {
    expect(ecommerceTestRequirements(projectWithEvidence(source)).map(r => r.category)).toContain(category);
  });
});
