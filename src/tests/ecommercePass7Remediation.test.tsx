import { render, screen, within } from "@testing-library/react";
import { ClientReviewWorkflow } from "../components/ClientReview/ClientReviewWorkflow";
import { ecommerceReviewItems, ARCHITECTURE_KEYS, DEPLOYMENT_KEYS, PHASE_KEYS } from "../lib/ecommerceDecisions";
import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { createEcommerceFixture } from "./helpers/ecommerce";
import type { ProjectRecord, ReviewItem } from "../types/project";

const evidenceFields = ["requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens", "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary", "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria", "outOfScope", "accessibilityNotes"] as const;
function withEvidence(text: string) {
  const p = createEcommerceFixture();
  for (const field of evidenceFields) p.intake[field] = "Recorded behavior.";
  p.intake.ecommerceStorefrontModel = "Unified storefront";
  p.intake.ecommerceRoutes = "/shop | Brand | catalog";
  p.intake.ecommerceCartScope = "Separate carts";
  p.intake.acceptanceNotes = text;
  return p;
}
function configured() {
  const p = createEcommerceFixture();
  p.intake.assumptions = "";
  p.intake.ecommerceDecisions = "";
  p.intake.ecommerceArchitecture = `Approved: ${ARCHITECTURE_KEYS.map(key => `${key}=recorded ${key}`).join(";")}`;
  p.intake.ecommerceDeployment = `Approved: ${DEPLOYMENT_KEYS.map(key => `${key}=recorded ${key}`).join(";")}`;
  p.intake.ecommercePhases = JSON.stringify([Object.fromEntries(PHASE_KEYS.map(key => [key, `Recorded ${key}`]))]);
  return p;
}
function doc(p: ProjectRecord, name: string) {
  return generateProjectPackage(p).documents.find(d => d.fileName === name)!.content;
}

describe("Ecommerce Pass 7 remediation", () => {
  it.each([
    ["Charge VAT when an order is pending fulfillment.", "Tax"],
    ["Pending orders are charged VAT.", "Tax"],
    ["Shipping for pending orders uses Canada Post.", "Shipping"],
    ["Ship pending orders only after payment clears; shipping uses Canada Post.", "Shipping"],
    ["Pending inventory inspections prevent sale.", "Inventory"],
    ["Stock marked pending inspection cannot be sold.", "Inventory"],
    ["Refund pending payments after reconciliation.", "Refunds/returns"],
    ["Administrators can view pending orders.", "Roles"],
    ["Admin can view pending orders.", "Roles"],
    ["Digital delivery waits for pending payments to clear.", "Digital delivery"],
    ["Uploads for pending quotes require authorization.", "Quotes/uploads"],
    ["Order lookup shows pending fulfillment.", "Order lookup"],
    ["Pickup excludes stock pending inspection.", "Pickup"],
    ["Webhooks reconcile pending payments.", "Webhooks/idempotency/reconciliation"]
  ])("preserves resolved business-state evidence: %s", (text, category) => {
    const rows = ecommerceTestRequirements(withEvidence(text));
    expect(rows.map(row => row.category)).toContain(category);
    const deps = rows.find(row => row.category === "Scope dependencies")?.expectedResult ?? "";
    if (category === "Tax") expect(deps).not.toMatch(/resolve the recorded tax/);
    if (category === "Shipping") expect(deps).not.toMatch(/resolve the recorded shipping/);
    if (category === "Refunds/returns") expect(deps).not.toMatch(/resolve the recorded return/);
  });

  it.each([
    ["VAT pending client approval.", "Tax", /resolve the recorded tax/],
    ["pending approval for VAT.", "Tax", /resolve the recorded tax/],
    ["VAT to be determined.", "Tax", /resolve the recorded tax/],
    ["Tax jurisdiction pending approval.", "Tax", /resolve the recorded tax/],
    ["Tax jurisdiction awaiting client decision.", "Tax", /resolve the recorded tax/],
    ["Shipping provider pending approval.", "Shipping", /resolve the recorded shipping/],
    ["Shipping model unknown.", "Shipping", /resolve the recorded shipping/],
    ["Inventory model pending approval.", "Inventory", undefined],
    ["Return policy pending client approval.", "Refunds/returns", /resolve the recorded return/],
    ["Administrator role model pending approval.", "Roles", undefined],
    ["Digital delivery model pending approval.", "Digital delivery", undefined],
    ["Pickup location pending approval.", "Pickup", undefined],
    ["Upload policy pending approval.", "Quotes/uploads", undefined],
    ["Order lookup method pending approval.", "Order lookup", undefined],
    ["Webhooks integration pending vendor confirmation.", "Webhooks/idempotency/reconciliation", undefined]
  ] as const)("keeps subject deferrals unresolved: %s", (text, category, dependency) => {
    const rows = ecommerceTestRequirements(withEvidence(text));
    expect(rows.map(row => row.category)).not.toContain(category);
    if (dependency) expect(rows.find(row => row.category === "Scope dependencies")?.expectedResult).toMatch(dependency);
  });

  it("preserves enumerated scope despite unrelated pending business states", () => {
    const output = ecommerceTestRequirements(withEvidence("Guest checkout shows pending orders; CAD totals include pending payments; Square payments reconcile pending transactions; Admin MFA required for pending orders.")).map(row => row.expectedResult).join("\n");
    expect(output).toMatch(/guest checkout flow in CAD using the recorded Square payment integration/);
    expect(output).toMatch(/including Admin MFA/i);
  });

  it.each([
    ["ecommerceStorefrontModel", "TBD marketplace", "EC-STOREFRONTS"],
    ["ecommerceRoutes", "/apps | Pending brand | Apps catalog", "EC-ROUTES"],
    ["ecommerceRoutes", "/apps | Brand | unknown", "EC-ROUTES"],
    ["ecommerceCartScope", "TBD shared or separate", "EC-CART"]
  ] as const)("renders rejected %s as its unresolved decision", (field, value, id) => {
    const p = configured(); p.intake[field] = value;
    const names = ["PROJECT_SCOPE.md", "CLIENT_REQUIREMENTS.md", "APP_BLUEPRINT.md", "DATA_MODEL.md", "SCREEN_MAP.md", "WORKFLOW_MAP.md", "ACCEPTANCE_CRITERIA.md", "DEPLOYMENT_NOTES.md", "PHASED_CODEX_PROMPTS.md"];
    const documents = generateProjectPackage(p).documents;
    for (const name of names) {
      const content = documents.find(d => d.fileName === name)!.content;
      expect(content, name).toContain(`Unresolved: ${id}`);
      expect(content, name).not.toContain(value);
    }
    expect(doc(p, "CLIENT_QUESTIONS.md")).toContain(`[MISSING: ${id}]`);
  });

  it("renders valid storefront configuration and isolates a routes-only failure", () => {
    const p = configured(); p.intake.ecommerceRoutes = "/apps | Rose & Paw Applications | Apps catalog";
    const valid = doc(p, "APP_BLUEPRINT.md");
    expect(valid).toContain(p.intake.ecommerceStorefrontModel);
    expect(valid).toContain(p.intake.ecommerceRoutes);
    expect(valid).toContain(p.intake.ecommerceCartScope);
    p.intake.ecommerceRoutes = "/apps | Pending brand | Apps catalog";
    const mixed = doc(p, "APP_BLUEPRINT.md");
    expect(mixed).toContain("Unresolved: EC-ROUTES");
    expect(mixed).not.toContain("Unresolved: EC-STOREFRONTS");
    expect(mixed).not.toContain("Unresolved: EC-CART");
  });

  it.each(["ecommerceArchitecture", "ecommerceDeployment"] as const)("does not render rejected %s as an approved contract", field => {
    const p = configured(); const raw = `${p.intake[field]}; extra=pending approval`; p.intake[field] = raw.replace("runtime=recorded runtime", "runtime=TBD").replace("DNS=recorded DNS", "DNS=TBD");
    const content = doc(p, "DEPLOYMENT_NOTES.md");
    expect(content).toContain(`Unresolved: ${field === "ecommerceArchitecture" ? "EC-ARCHITECTURE" : "EC-DEPLOYMENT"}`);
    expect(content).not.toContain(p.intake[field]);
  });

  it("keeps legacy OQ provenance separate from its resolution target", () => {
    const p = configured(); p.intake.assumptions = "OQ-01: What is the shipping threshold?";
    const item = ecommerceReviewItems(p, p.updatedAt).find(i => i.gateId === "OQ-01")!;
    expect(item).toMatchObject({fieldKey: "assumptions", sourceFieldLabel: "Assumptions", resolutionMode: "source", resolutionFieldKey: "ecommerceDecisions", resolutionFieldLabel: "Ecommerce Decision Register"});
    expect((item as ReviewItem & {resolutionInstruction?: string}).resolutionInstruction).toMatch(/Add or update OQ-01.*Ecommerce Decision Register/);
    p.intake.ecommerceDecisions = "OQ-01 | launch | Answered | Threshold? | Approved | CAD 125";
    expect(ecommerceReviewItems(p, p.updatedAt).find(i => i.gateId === "OQ-01")).toMatchObject({status: "Answered", resolutionMode: "source", resolutionFieldKey: "ecommerceDecisions"});
  });

  it("provides actual resolution locations for dedicated, malformed and required-field cards", () => {
    const p = configured();
    p.intake.ecommerceStorefrontModel = ""; p.intake.ecommerceRoutes = ""; p.intake.ecommerceCartScope = ""; p.intake.workflowSteps = "";
    p.intake.ecommerceDecisions = "bad record";
    const items = ecommerceReviewItems(p, p.updatedAt);
    for (const [id, key, label] of [
      ["EC-STOREFRONTS", "ecommerceStorefrontModel", /Storefront Model/i],
      ["EC-ROUTES", "ecommerceRoutes", /Storefront Routes and Contexts/i],
      ["EC-CART", "ecommerceCartScope", /Cart Scope Decision/i],
      ["EC-FIELD-WORKFLOW-STEPS", "workflowSteps", /Workflow Steps/i],
      ["EC-RECORD-1", "ecommerceDecisions", /Ecommerce Decision Register/]
    ] as const) {
      expect(items.find(i => i.gateId === id)).toMatchObject({resolutionMode: "source", resolutionFieldKey: key, resolutionFieldLabel: expect.stringMatching(label)});
    }
  });

  it("shows actionable OQ guidance while keeping source-controlled cards read-only", () => {
    const p = configured(); p.intake.assumptions = "OQ-01: What is the shipping threshold?";
    p.reviewItems = ecommerceReviewItems(p, p.updatedAt);
    render(<ClientReviewWorkflow project={p} onUpdateReviewItem={vi.fn()} onToggleReadiness={vi.fn()} />);
    const card = screen.getByRole("heading", {name: /OQ-01: What is the shipping threshold/}).closest("article")!;
    expect(within(card).getByText("Assumptions")).toBeInTheDocument();
    expect(within(card).getByText("Ecommerce Decision Register")).toBeInTheDocument();
    expect(within(card).getByText(/Add or update OQ-01.*Ecommerce Decision Register/)).toBeInTheDocument();
    expect(within(card).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(card).queryByText("Update the source intake field to resolve this item.")).not.toBeInTheDocument();
  });

  it("preserves ordinary review controls and supports saved cards without new metadata", () => {
    const p = configured(); p.intake.appType = "businessWebsite";
    p.reviewItems = [{id:"ordinary", section:"Foundation", fieldKey:"appPurpose", label:"Confirm purpose", reason:"Confirm", recommendedQuestion:"Purpose?", status:"Needs answer", notApplicableReason:"", deferredReason:"", blocking:true, allowDeferred:false, source:"missing", updatedAt:p.updatedAt}];
    render(<ClientReviewWorkflow project={p} onUpdateReviewItem={vi.fn()} onToggleReadiness={vi.fn()} />);
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.queryByText("Resolve in")).not.toBeInTheDocument();
  });
});
