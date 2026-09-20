import { ecommerceDecisions } from "../lib/ecommerceDecisions";
import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { createEcommerceFixture } from "./helpers/ecommerce";

const evidenceFields = ["requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens", "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary", "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria", "outOfScope", "accessibilityNotes"] as const;

function projectWithEvidence(text = "Recorded behavior.") {
  const project = createEcommerceFixture();
  for (const field of evidenceFields) project.intake[field] = "Recorded behavior.";
  project.intake.acceptanceNotes = text;
  project.intake.ecommerceDecisions = "";
  return project;
}

function output(project: ReturnType<typeof projectWithEvidence>) {
  return ecommerceTestRequirements(project).map(row => `${row.category}: ${row.expectedResult}`).join("\n");
}

function decision(id: string, question: string, answer: string, status = "Answered", reason = "Approved") {
  return `${id} | launch | ${status} | ${question} | ${reason} | ${answer}`;
}

describe("Ecommerce Pass 17 effective Decision Register evidence", () => {
  it("uses a provider resolved only by an effective Answered decision", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("PAYMENT", "Which payment provider?", "Square");
    const text = output(project);
    expect(text).toContain("using the recorded Square payment integration");
    expect(text).toContain("recorded Square integration; replay valid events");
    expect(text).not.toContain("resolve the recorded payment provider");
  });

  it("uses a lowercase currency resolved only by an effective Answered decision", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("CURRENCY", "Which checkout currency?", "usd");
    const text = output(project);
    expect(text).toContain("flow in USD");
    expect(text).not.toContain("resolve the recorded currency");
  });

  it("uses a checkout mode resolved only by an effective Answered decision", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("CHECKOUT", "Which checkout mode?", "Guest checkout");
    const text = output(project);
    expect(text).toContain("recorded guest checkout flow");
    expect(text).not.toContain("resolve the recorded checkout mode");
  });

  it("combines provider, currency and checkout answers from the Decision Register", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = [
      decision("PAYMENT", "Which payment provider?", "Square"),
      decision("CURRENCY", "Which checkout currency?", "usd"),
      decision("CHECKOUT", "Which checkout mode?", "Guest checkout")
    ].join("\n");
    const text = output(project);
    expect(text).toContain("recorded guest checkout flow in USD using the recorded Square payment integration");
    expect(text).not.toContain("resolve the recorded");
  });

  it.each([
    ["CHOICE-17", "Which payment provider?", "Square", "using the recorded Square payment integration"],
    ["OPTION-42", "Which checkout currency?", "usd", "flow in USD"],
    ["ANSWER-9", "Which checkout mode?", "Guest checkout", "recorded guest checkout flow"]
  ])("uses question context instead of decision ID: %s", (id, question, answer, expected) => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision(id, question, answer);
    expect(output(project)).toContain(expected);
  });

  it.each([
    ["payment provider pending approval", decision("PAYMENT", "Which payment provider?", "Square"), "Square", "resolve the recorded payment provider"],
    ["Stripe payments", decision("PAYMENT", "Which payment provider?", "Square"), "Square", "recorded Stripe payment integration"],
    ["checkout in CAD", decision("CURRENCY", "Which checkout currency?", "USD"), "USD", "flow in CAD"],
    ["Authenticated checkout is approved", decision("CHECKOUT", "Which checkout mode?", "Guest checkout"), "guest checkout", "recorded authenticated checkout flow"]
  ])("gives the effective structured answer precedence over narrative evidence: %s", (narrative, register, selected, rejected) => {
    const project = projectWithEvidence(narrative);
    project.intake.ecommerceDecisions = register;
    const text = output(project);
    expect(text).toContain(selected === "Square" ? "recorded Square payment integration" : selected === "USD" ? "flow in USD" : "recorded guest checkout flow");
    expect(text).not.toContain(rejected);
  });

  it.each(["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"])("keeps %s synchronized with Decision Register-only choices", fileName => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = [
      decision("PAYMENT", "Which payment provider?", "Square"),
      decision("CURRENCY", "Which checkout currency?", "usd"),
      decision("CHECKOUT", "Which checkout mode?", "Guest checkout")
    ].join("\n");
    const content = generateProjectPackage(project).documents.find(document => document.fileName === fileName)!.content;
    expect(content).toContain("recorded guest checkout flow in USD using the recorded Square payment integration");
    expect(content).not.toContain("resolve the recorded payment provider");
    expect(content).not.toContain("resolve the recorded currency");
    expect(content).not.toContain("resolve the recorded checkout mode");
  });

  it.each([
    [decision("PAYMENT", "Which payment provider?", "", "Deferred", "Awaiting approval"), "payment provider"],
    [decision("PAYMENT", "Which payment provider?", "Not sure"), "payment provider"],
    [decision("CURRENCY", "Which checkout currency?", "TBD"), "currency"],
    [decision("CHECKOUT", "Which checkout mode?", "Unknown"), "checkout mode"],
    [decision("PAYMENT", "Which payment provider?", "", "Not applicable", "Not applicable"), "payment provider"]
  ])("does not authorize unresolved or inapplicable Decision Register evidence: %s", (register, dependency) => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = register;
    expect(output(project)).toContain(`resolve the recorded ${dependency}`);
  });

  it("does not invent semantic choice evidence from an unrelated Answered decision", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("SHIPPING-THRESHOLD", "What is the free shipping threshold?", "$100");
    const text = output(project);
    expect(text).toContain("resolve the recorded payment provider");
    expect(text).toContain("resolve the recorded currency");
    expect(text).toContain("resolve the recorded checkout mode");
    expect(text).not.toContain("$100 payment integration");
  });

  it.each(["not Stripe", "no Stripe Connect"])("keeps a negative-only structured provider answer unresolved: %s", answer => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("PAYMENT", "Which payment provider?", answer);
    expect(ecommerceDecisions(project).find(item => item.id === "PAYMENT")?.status).toBe("Needs answer");
    const text = output(project);
    expect(text).toContain("resolve the recorded payment provider");
    expect(text).not.toMatch(/using the recorded .* payment integration/);
  });
});

describe("Ecommerce Pass 17 explicit provider leading negation", () => {
  it("does not make a negative-only explicit provider positive", () => {
    const text = output(projectWithEvidence("payment provider is not Stripe"));
    expect(text).toContain("resolve the recorded payment provider");
    expect(text).not.toMatch(/using the recorded .* payment integration/);
    expect(text).not.toContain("recorded not Stripe");
  });

  it.each([
    "payment provider is not Stripe; payment provider is Square",
    "payment provider: not Stripe; payment provider: Square",
    "payment provider is not Stripe Connect; payments via Square",
    "payment provider: no Stripe; payments through Square"
  ])("selects a later positive provider after direct leading negation: %s", source => {
    const text = output(projectWithEvidence(source));
    expect(text).toContain("using the recorded Square payment integration");
    expect(text).not.toContain("recorded not Stripe");
    expect(text).not.toContain("recorded no Stripe");
    expect(text).not.toContain("recorded Connect payment integration");
  });

  it("preserves an unresolved placeholder before a later provider", () => {
    const text = output(projectWithEvidence("payment provider: Not sure; payments via Square"));
    expect(text).toContain("using the recorded Square payment integration");
    expect(text).not.toContain("recorded sure payment integration");
  });

  it.each([
    ["payment provider is Stripe", "Stripe"],
    ["payment provider: Square", "Square"],
    ["payments via Stripe Connect", "Stripe Connect"]
  ])("preserves positive explicit provider evidence: %s", (source, provider) => {
    expect(output(projectWithEvidence(source))).toContain(`using the recorded ${provider} payment integration`);
  });
});
