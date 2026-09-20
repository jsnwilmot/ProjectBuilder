import { ARCHITECTURE_KEYS, DEPLOYMENT_KEYS, ecommerceDecisions, ecommerceDecisionState, ecommerceResolvedSelections, PHASE_KEYS } from "../lib/ecommerceDecisions";
import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { createEcommerceFixture } from "./helpers/ecommerce";

const evidenceFields = [
  "requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens",
  "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary",
  "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria",
  "outOfScope", "accessibilityNotes"
] as const;

function projectWithEvidence(text = "Recorded ecommerce behavior.") {
  const project = createEcommerceFixture();
  for (const field of evidenceFields) project.intake[field] = "";
  project.intake.acceptanceNotes = text;
  project.intake.assumptions = "";
  project.intake.ecommerceDecisions = "";
  return project;
}

function readyProject() {
  const project = createEcommerceFixture();
  project.intake.ecommerceArchitecture = `Approved: ${ARCHITECTURE_KEYS.map(key => `${key}=approved ${key}`).join(";")}`;
  project.intake.ecommerceDeployment = `Approved: ${DEPLOYMENT_KEYS.map(key => `${key}=approved ${key}`).join(";")}`;
  project.intake.ecommercePhases = JSON.stringify([Object.fromEntries(PHASE_KEYS.map(key => [key, `Approved ${key}`]))]);
  project.intake.ecommerceDecisions = Array.from({ length: 20 }, (_, index) => {
    const id = `OQ-${String(index + 1).padStart(2, "0")}`;
    return decision(id, "launch", "Answered", `Resolved fixture question ${index + 1}?`, "Approved by fixture owner", `Approved fixture answer ${index + 1}`);
  }).join("\n");
  return project;
}

function decision(id: string, gate: "architecture" | "launch" | "optional", status: string, question: string, reason: string, answer = "") {
  return `${id} | ${gate} | ${status} | ${question} | ${reason} | ${answer}`;
}

function requirementsText(project: ReturnType<typeof projectWithEvidence>) {
  return ecommerceTestRequirements(project).map(row => `${row.category}: ${row.expectedResult}`).join("\n");
}

function documentContent(project: ReturnType<typeof projectWithEvidence>, fileName: string) {
  return generateProjectPackage(project).documents.find(document => document.fileName === fileName)!.content;
}

describe("Ecommerce Pass 18 singleton Decision Register conflicts", () => {
  it.each([
    ["paymentProvider", "Which payment provider?", "Stripe", "Square", "EC-SELECTION-CONFLICT-PAYMENT-PROVIDER"],
    ["currency", "Which checkout currency?", "CAD", "USD", "EC-SELECTION-CONFLICT-CURRENCY"],
    ["checkoutMode", "Which checkout mode?", "Guest checkout", "authenticated checkout", "EC-SELECTION-CONFLICT-CHECKOUT"]
  ] as const)("blocks conflicting %s answers instead of selecting by register order", (kind, question, first, second, conflictId) => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = [
      decision("CHOICE-A", "launch", "Answered", question, "Approved", first),
      decision("CHOICE-B", "launch", "Answered", question, "Approved", second)
    ].join("\n");

    const conflict = ecommerceDecisions(project).find(item => item.id === conflictId);
    expect(conflict).toMatchObject({ status: "Needs answer", gate: "launch" });
    expect(conflict?.reason).toContain("CHOICE-A");
    expect(conflict?.reason).toContain("CHOICE-B");
    expect(conflict?.reason).toContain(first);
    expect(conflict?.reason).toContain(second);
    expect(ecommerceResolvedSelections(project)[kind]).toBeUndefined();
    expect(ecommerceDecisionState(project).launchReady).toBe(false);
  });

  it("does not emit provider-specific verification for conflicting providers", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = [
      decision("PROVIDER-ALPHA", "launch", "Answered", "Which payment provider?", "Approved", "Stripe"),
      decision("PROVIDER-BETA", "launch", "Answered", "Which payment provider?", "Approved", "Square")
    ].join("\n");
    const text = requirementsText(project);
    expect(text).toContain("resolve the recorded payment provider");
    expect(text).not.toContain("recorded Stripe payment integration");
    expect(text).not.toContain("recorded Square payment integration");
  });

  it("treats case-only provider duplicates as agreement and preserves one canonical selection", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = [
      decision("OPTION-17", "launch", "Answered", "Which payment provider?", "Approved", "Square"),
      decision("ANSWER-42", "launch", "Answered", "Which payment provider?", "Approved", "square")
    ].join("\n");
    expect(ecommerceDecisions(project).some(item => item.id.startsWith("EC-SELECTION-CONFLICT"))).toBe(false);
    expect(ecommerceResolvedSelections(project).paymentProvider?.value).toBe("Square");
    expect(requirementsText(project)).toContain("recorded Square payment integration");
  });

  it("treats normalized currency duplicates as agreement", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = [
      decision("OPTION-USD", "launch", "Answered", "Which checkout currency?", "Approved", "usd"),
      decision("ANSWER-USD", "launch", "Answered", "Which checkout currency?", "Approved", "USD")
    ].join("\n");
    expect(ecommerceDecisions(project).some(item => item.id.startsWith("EC-SELECTION-CONFLICT"))).toBe(false);
    expect(ecommerceResolvedSelections(project).currency?.value).toBe("USD");
  });

  it("uses the strongest contributing gate for a singleton conflict", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = [
      decision("OPTIONAL-PROVIDER", "optional", "Answered", "Which payment provider?", "Approved", "Stripe"),
      decision("ARCH-PROVIDER", "architecture", "Answered", "Which payment provider?", "Approved", "Square")
    ].join("\n");
    expect(ecommerceDecisions(project).find(item => item.id === "EC-SELECTION-CONFLICT-PAYMENT-PROVIDER")?.gate).toBe("architecture");
    expect(ecommerceDecisionState(project).implementationReady).toBe(false);
  });
});

describe("Ecommerce Pass 18 Not applicable evidence reconciliation", () => {
  it("omits tax verification when tax is Not applicable and no positive source exists", () => {
    const project = projectWithEvidence();
    project.intake.ecommerceDecisions = decision("TAX-17", "launch", "Not applicable", "Is tax calculation required?", "Not applicable for launch");
    const text = requirementsText(project);
    expect(text).not.toMatch(/^Tax:/m);
    expect(text).not.toContain("resolve the recorded tax jurisdiction");
    expect(ecommerceDecisions(project).some(item => item.id === "EC-EVIDENCE-CONFLICT-TAX")).toBe(false);
  });

  it.each([
    ["tax", "Automatic Canadian tax calculation", "Is tax calculation required?", "EC-EVIDENCE-CONFLICT-TAX", /^Tax:/m],
    ["shipping", "Live carrier shipping", "Is shipping required at launch?", "EC-EVIDENCE-CONFLICT-SHIPPING", /^Shipping:/m],
    ["pickup", "Store pickup", "Is pickup required at launch?", "EC-EVIDENCE-CONFLICT-PICKUP", /^Pickup:/m],
    ["returns", "30-day physical returns", "Are returns and refunds required?", "EC-EVIDENCE-CONFLICT-RETURNS", /^Refunds\/returns:/m]
  ] as const)("blocks positive %s evidence that contradicts a Not applicable decision", (_domain, source, question, conflictId, rowPattern) => {
    const project = projectWithEvidence(source);
    project.intake.ecommerceDecisions = decision("EXCLUSION-17", "launch", "Not applicable", question, "Not applicable for launch");
    const conflict = ecommerceDecisions(project).find(item => item.id === conflictId);
    expect(conflict).toMatchObject({ status: "Needs answer", gate: "launch" });
    expect(conflict?.reason).toContain("EXCLUSION-17");
    expect(conflict?.reason).toContain("acceptance notes");
    expect(requirementsText(project)).not.toMatch(rowPattern);
    expect(ecommerceDecisionState(project).launchReady).toBe(false);
  });

  it("keeps unrelated Not applicable questions from suppressing commerce evidence", () => {
    const project = projectWithEvidence("Automatic Canadian tax calculation; live carrier shipping");
    project.intake.ecommerceDecisions = decision("REVIEWS-17", "launch", "Not applicable", "Are reviews required at launch?", "Not applicable for launch");
    const text = requirementsText(project);
    expect(text).toMatch(/^Tax:/m);
    expect(text).toMatch(/^Shipping:/m);
    expect(ecommerceDecisions(project).some(item => item.id.startsWith("EC-EVIDENCE-CONFLICT"))).toBe(false);
  });

  it("synchronizes N/A contradictions across questions, test plan and acceptance criteria", () => {
    const project = projectWithEvidence("Automatic Canadian tax calculation");
    project.intake.ecommerceDecisions = decision("TAX-NA", "launch", "Not applicable", "Is tax calculation required?", "Not applicable for launch");
    for (const fileName of ["CLIENT_QUESTIONS.md", "TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      const content = documentContent(project, fileName);
      expect(content).toContain("EC-EVIDENCE-CONFLICT-TAX");
      expect(content).not.toMatch(/\| Tax \| Test the recorded tax scope/);
    }
  });
});

describe("Ecommerce Pass 18 current-generation rendering", () => {
  it("does not carry an obsolete regenerate blocker or stale marker into a new package", () => {
    const project = readyProject();
    project.packageGeneratedAt = "2026-09-01T00:00:00.000Z";
    project.generatedDocuments = [{
      fileName: "README.md",
      folder: "00_Project_Overview",
      content: "# Old package\n\n[MISSING: obsolete previous-generation decision]"
    }];
    project.generatedFileCount = 1;

    const generated = generateProjectPackage(project);
    expect(generated.documents).toHaveLength(19);
    for (const document of generated.documents) {
      expect(document.content).not.toContain("Regenerate the package after the final review decisions.");
      expect(document.content).not.toContain("obsolete previous-generation decision");
    }
  });

  it("uses a new source blocker even when the old generated package was ready", () => {
    const project = readyProject();
    project.packageGeneratedAt = "2026-09-01T00:00:00.000Z";
    project.generatedDocuments = [{ fileName: "README.md", folder: "00_Project_Overview", content: "# Old ready package" }];
    project.generatedFileCount = 1;
    project.intake.ecommerceRoutes = "TBD";

    const generated = generateProjectPackage(project);
    const combined = generated.documents.map(document => document.content).join("\n");
    expect(generated.documents).toHaveLength(19);
    expect(combined).toContain("EC-ROUTES");
    expect(combined).not.toContain("# Old ready package");
  });
});
