import { generateProjectPackage } from "../lib/generateProjectPackage";
import { getClientReviewReadiness, deriveReviewItems, formatClientQuestions } from "../lib/clientReview";
import { evaluateGeneratedPackageReadiness } from "../lib/generatedPackageReadiness";
import { createEcommerceFixture } from "./helpers/ecommerce";

function fixture() {
  const p = createEcommerceFixture();
  p.generatedDocuments = generateProjectPackage(p).documents;
  p.generatedFileCount = p.generatedDocuments.length;
  return p;
}
const content = (name: string) => fixture().generatedDocuments.find(d => d.fileName === name)!.content;

describe("Ecommerce Draft 1 remediation", () => {
  it("excludes platform-only output from an ecommerce package", () => {
    expect(fixture().generatedDocuments.map(d => d.content).join("\n")).not.toMatch(/Power Fx|Canvas YAML|Dataverse|SharePoint internal|Power Apps Studio|publisher prefix|connection references|Power Platform/i);
  });
  it("generates target commerce tests instead of builder self-tests", () => {
    const text = content("TEST_PLAN.md");
    expect(text).not.toMatch(/intake persistence|package generation|ZIP export|document regeneration/i);
    for (const term of ["webhooks", "idempotency", "reconciliation", "tax", "shipping", "pickup", "inventory", "digital", "quotes", "guest", "refund", "accessibility", "backup", "smoke"]) expect(text.toLowerCase()).toContain(term);
  });
  it("uses web deployment contracts instead of solution publisher fields", () => {
    const text = content("DEPLOYMENT_NOTES.md");
    expect(text).not.toMatch(/solution unique|publisher|connection references/i);
    for (const term of ["CI", "migrations", "rollback", "secrets", "DNS", "smoke"]) expect(text).toContain(term);
  });
  it("preserves all twenty outstanding questions in review and generated output", () => {
    const p = fixture();
    const text = formatClientQuestions(deriveReviewItems(p));
    const doc = p.generatedDocuments.find(d => d.fileName === "CLIENT_QUESTIONS.md")!.content;
    for (let i = 1; i <= 20; i++) {
      const id = `OQ-${String(i).padStart(2, "0")}`;
      expect(text).toContain(id); expect(doc).toContain(id);
    }
  });
  it("keeps review readiness blocked by unresolved architecture despite checked reviews", () => {
    const p = fixture();
    expect(getClientReviewReadiness(p).isReady).toBe(false);
    expect(evaluateGeneratedPackageReadiness(p).status).toBe("Draft");
  });
  it("does not put builder export or document-count acceptance into client criteria", () => {
    expect(content("ACCEPTANCE_CRITERIA.md")).not.toMatch(/19 documents|ZIP export|package generation|Project Builder|export.*required|generated.*files/i);
  });
  it("emits an architecture-resolution phase instead of invented implementation actions", () => {
    const text = content("PHASED_CODEX_PROMPTS.md");
    expect(text).toMatch(/Phase 1: Architecture resolution/);
    expect(text).not.toMatch(/Power Apps|Power Fx|Canvas YAML|model-driven/i);
    for (const term of ["Prerequisites", "Files", "contracts", "Test commands", "Evidence", "Stop conditions"]) expect(text).toContain(term);
  });
});
