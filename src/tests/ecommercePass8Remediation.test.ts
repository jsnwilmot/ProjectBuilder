import { ARCHITECTURE_KEYS, DEPLOYMENT_KEYS, PHASE_KEYS, classifyResolutionValue, ecommerceDecisionState, ecommerceReviewItems, hasMeaningfulResolvedValue, isEcommerceRequiredSourceFieldResolved } from "../lib/ecommerceDecisions";
import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { validateIntake } from "../lib/validateIntake";
import { createEcommerceFixture } from "./helpers/ecommerce";

function configured(assumptions = "Recorded assumptions.", register = "") {
  const p = createEcommerceFixture();
  p.intake.assumptions = assumptions;
  p.intake.ecommerceDecisions = register;
  p.intake.ecommerceArchitecture = `Approved: ${ARCHITECTURE_KEYS.map(k => `${k}=recorded ${k}`).join(";")}`;
  p.intake.ecommerceDeployment = `Approved: ${DEPLOYMENT_KEYS.map(k => `${k}=recorded ${k}`).join(";")}`;
  p.intake.ecommercePhases = JSON.stringify([Object.fromEntries(PHASE_KEYS.map(k => [k, `Recorded ${k}`]))]);
  return p;
}
const override = "OQ-05 | launch | Answered | Explicit choice? | Approved | Recorded choice";
const architecture = "OQ-05: Architecture decision required before implementation?";
const launch = "OQ-05: Launch configuration to confirm later?";

describe("Ecommerce Pass 8 legacy duplicates", () => {
  it.each([architecture, launch])("imports a single legacy record without a duplicate blocker: %s", source => {
    const state = ecommerceDecisionState(configured(source));
    expect(state.decisions.filter(d => d.id === "OQ-05")).toHaveLength(1);
    expect(state.decisions.filter(d => d.id.startsWith("EC-LEGACY-OQ-"))).toHaveLength(0);
  });
  it.each([[architecture, architecture], [architecture, launch], [launch, architecture]])("preserves first legacy occurrence and blocks duplicates: %s / %s", (first, second) => {
    const p = configured(`Notes\n${first}\n\n${second}\n${second}`);
    const state = ecommerceDecisionState(p);
    expect(state.decisions.find(d => d.id === "OQ-05")?.reason).toBe(first.slice("OQ-05: ".length));
    expect(state.decisions.filter(d => d.id.startsWith("EC-LEGACY-OQ-"))).toEqual([
      expect.objectContaining({ id: "EC-LEGACY-OQ-4", field: "assumptions", gate: "architecture", status: "Needs answer", reason: expect.stringMatching(/Duplicate OQ-05.*source line 4.*first occurrence remains effective/) }),
      expect.objectContaining({ id: "EC-LEGACY-OQ-5", gate: "architecture", status: "Needs answer" })
    ]);
    expect(state.implementationReady).toBe(false);
    expect(ecommerceDecisionState(p)).toEqual(state);
  });
  it("imports different IDs without duplicate blockers", () => {
    const state = ecommerceDecisionState(configured(`${launch}\nOQ-06: Another launch question?`));
    expect(state.decisions.map(d => d.id)).toEqual(["OQ-05", "OQ-06"]);
    expect(state.implementationReady).toBe(true);
  });
  it("allows the intended explicit override of a single legacy record", () => {
    const state = ecommerceDecisionState(configured(architecture, override));
    expect(state.decisions).toEqual([expect.objectContaining({ id: "OQ-05", status: "Answered", originField: "assumptions" })]);
    expect(state.implementationReady).toBe(true);
  });
  it("retains duplicate-source markers and readiness despite an explicit override", () => {
    const p = configured(`${launch}\n${architecture}`, override);
    const state = ecommerceDecisionState(p);
    expect(state.decisions.find(d => d.id === "OQ-05")?.status).toBe("Answered");
    expect(state.implementationBlockers.map(d => d.id)).toContain("EC-LEGACY-OQ-2");
    const review = ecommerceReviewItems(p, p.updatedAt).find(d => d.gateId === "EC-LEGACY-OQ-2");
    expect(review).toMatchObject({ blocking: true, resolutionFieldKey: "assumptions" });
    const result = generateProjectPackage(p);
    expect(result.documents.find(d => d.fileName === "CLIENT_QUESTIONS.md")?.content).toContain("[MISSING: EC-LEGACY-OQ-2]");
    const readiness = evaluateGeneratedPackageReadiness({ ...p, generatedDocuments: result.documents });
    expect(readiness.status).toBe("Draft");
    expect(readiness.missingMarkerCount).toBeGreaterThan(0);
  });
  it("prevents explicit records from overwriting a synthetic legacy blocker", () => {
    const p = configured(`${launch}\n${launch}`, `${override}\nEC-LEGACY-OQ-2 | optional | Answered | Hide defect? | Approved | Yes`);
    const state = ecommerceDecisionState(p);
    expect(state.implementationBlockers.map(d => d.id)).toContain("EC-LEGACY-OQ-2");
    expect(state.decisions.find(d => d.id === "EC-RECORD-2")?.status).toBe("Needs answer");
  });
  it("still rejects duplicate explicit decision IDs", () => {
    const state = ecommerceDecisionState(configured(launch, `${override}\n${override}`));
    expect(state.decisions.find(d => d.id === "EC-RECORD-2")?.reason).toMatch(/Duplicate explicit decision ID OQ-05/);
  });
});

describe("Ecommerce Pass 8 uncertainty", () => {
  it.each(["not sure", "Not Sure.", "unsure", "uncertain", "not certain", "not known", "don't know", "do not know", "not sure yet", "unsure pending client confirmation", "not certain until discovery"])("keeps uncertainty unresolved across established consumers: %s", value => {
    expect(classifyResolutionValue(value)).toBe("unresolved");
    expect(hasMeaningfulResolvedValue(value)).toBe(false);
    for (const register of [`OQ-05 | architecture | Answered | Choice? | Approved | ${value}`, `OQ-05 | architecture | Not applicable | Choice? | ${value} |`]) {
      expect(ecommerceDecisionState(configured("Recorded assumptions.", register)).decisions.find(d => d.id === "OQ-05")?.status).toBe("Needs answer");
    }
    const p = configured(); p.intake.workflowSteps = value;
    expect(isEcommerceRequiredSourceFieldResolved(p, "workflowSteps")).toBe(false);
    expect(validateIntake(p).missingFields.map(d => d.field)).toContain("workflowSteps");
    expect(ecommerceDecisionState(p).implementationBlockers.map(d => d.id)).toContain("EC-FIELD-WORKFLOW-STEPS");
    const result = generateProjectPackage(p);
    expect(result.documents.find(d => d.fileName === "CLIENT_QUESTIONS.md")?.content).toContain("[MISSING: EC-FIELD-WORKFLOW-STEPS]");
  });
  it.each([
    "Customers who are not sure which size to choose can open the sizing guide.",
    "Unknown users receive a generic authorization error.", "Pending payments are unfulfilled.",
    "Deferred jobs retry after five minutes.", "Uncertain inventory records require manual inspection."
  ])("preserves valid business prose across consumers: %s", value => {
    expect(classifyResolutionValue(value)).toBe("resolved");
    expect(hasMeaningfulResolvedValue(value)).toBe(true);
    const p = configured("Recorded assumptions.", `OQ-05 | architecture | Answered | Choice? | Approved | ${value}`);
    expect(ecommerceDecisionState(p).implementationReady).toBe(true);
    p.intake.ecommerceDecisions = `OQ-05 | architecture | Not applicable | Choice? | ${value} |`;
    expect(ecommerceDecisionState(p).implementationReady).toBe(true);
    p.intake.workflowSteps = value;
    expect(isEcommerceRequiredSourceFieldResolved(p, "workflowSteps")).toBe(true);
    expect(validateIntake(p).missingFields.map(d => d.field)).not.toContain("workflowSteps");
  });
});

describe("Ecommerce Pass 8 currency evidence", () => {
  it.each([
    ["checkout in usd", "USD"], ["cad", "CAD"], ["Cad", "CAD"], ["USD accepted", "USD"],
    ["usd accepted", "USD"], ["eUr accepted", "EUR"], ["do not support usd; cad only", "CAD"],
    ["no cad, usd, or eur support", ""], ["no usd; gbp accepted", "GBP"],
    ["currency usd pending approval", ""], ["USD is not supported; CAD accepted", "CAD"],
    ["cad, usd, and eur are not supported; gBp accepted", "GBP"],
    ["no cad, usd, or eur support, but gBp is accepted", "GBP"], ["currency usd not sure yet", ""]
  ])("normalizes only positive captured currency: %s => %s", (source, currency) => {
    const p = configured();
    const fields = ["requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens", "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary", "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria", "outOfScope", "accessibilityNotes"] as const;
    for (const field of fields) p.intake[field] = "Recorded behavior.";
    p.intake.acceptanceNotes = source;
    const snapshot = structuredClone(p);
    const rows = ecommerceTestRequirements(p);
    const checkout = rows.find(r => r.category === "Checkout/payment")!.expectedResult;
    const dependencies = rows.find(r => r.category === "Scope dependencies")?.expectedResult ?? "";
    if (currency) {
      expect(checkout).toContain(`flow in ${currency}`);
      expect(dependencies).not.toContain("resolve the recorded currency");
    } else {
      expect(checkout).not.toMatch(/flow in (?:CAD|USD|EUR|GBP)/);
      expect(dependencies).toContain("resolve the recorded currency");
    }
    expect(p).toEqual(snapshot);
  });
});
