import { describe, expect, it } from "vitest";
import { ecommerceDecisions, ecommerceDecisionState, ecommerceResolvedSelections } from "../lib/ecommerceDecisions";
import { ecommerceTestRequirements } from "../lib/ecommerceTestRequirements";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { createEcommerceFixture } from "./helpers/ecommerce";

const subjects = [
  {
    kind: "paymentProvider", question: "Which payment provider?", first: "Stripe", equivalent: "stripe", second: "Square",
    conflictId: "EC-SELECTION-CONFLICT-PAYMENT-PROVIDER",
    narratives: ["payments via Stripe", "payments via Square", "payments via Adyen"],
    dependency: "resolve the recorded payment provider",
    selected: /using the recorded Stripe payment integration/iu,
    forbidden: /using the recorded .+ payment integration|using the recorded .+ integration; replay/iu
  },
  {
    kind: "currency", question: "Which checkout currency?", first: "USD", equivalent: "usd", second: "CAD",
    conflictId: "EC-SELECTION-CONFLICT-CURRENCY",
    narratives: ["USD accepted", "CAD accepted", "EUR accepted"],
    dependency: "resolve the recorded currency", selected: /flow in USD/u,
    forbidden: /flow in (?:USD|CAD|EUR)/u
  },
  {
    kind: "checkoutMode", question: "Which checkout mode?", first: "Guest checkout", equivalent: "guest checkout", second: "authenticated checkout",
    conflictId: "EC-SELECTION-CONFLICT-CHECKOUT",
    narratives: ["Guest checkout approved", "authenticated checkout approved", "mixed checkout approved"],
    dependency: "resolve the recorded checkout mode", selected: /recorded guest checkout flow/iu,
    forbidden: /recorded (?:guest checkout|authenticated checkout|mixed checkout) flow/iu
  }
] as const;

type Subject = typeof subjects[number];
type Gate = "architecture" | "launch" | "optional";

function decision(id: string, question: string, answer: string, gate: Gate = "launch") {
  return `${id} | ${gate} | Answered | ${question} | Approved fixture answer | ${answer}`;
}

function projectWithEvidence(narrative: string, register: string) {
  const project = createEcommerceFixture();
  for (const field of [
    "requiredFeatures", "featureDescription", "workflows", "workflowTrigger", "workflowSteps", "screens",
    "websitePages", "dataEntities", "dataCollections", "fields", "integrations", "rolePermissionsSummary",
    "authenticationExpectation", "permissionRules", "constraints", "acceptanceNotes", "successCriteria",
    "outOfScope", "accessibilityNotes"
  ] as const) project.intake[field] = "Recorded behavior.";
  project.intake.assumptions = "";
  project.intake.acceptanceNotes = narrative;
  project.intake.ecommerceDecisions = register;
  return project;
}

function verification(project: ReturnType<typeof projectWithEvidence>) {
  return ecommerceTestRequirements(project).map(row => row.expectedResult).join("\n");
}

const conflictingCases = subjects.flatMap(subject => subject.narratives.flatMap(narrative =>
  [false, true].map(reversed => ({ ...subject, narrative, reversed }))
));

describe("PB-DEFECT-6D2-001 authoritative singleton conflicts and narrative fallback", () => {
  it.each(conflictingCases)("keeps $kind conflicted with '$narrative', reversed=$reversed", subject => {
    const records = [
      decision("CHOICE-A", subject.question, subject.first),
      decision("CHOICE-B", subject.question, subject.second)
    ];
    const project = projectWithEvidence(subject.narrative, (subject.reversed ? records.reverse() : records).join("\n"));
    const before = structuredClone(project);
    const state = ecommerceDecisionState(project);
    expect(state.decisions.find(item => item.id === subject.conflictId)).toMatchObject({ status: "Needs answer", gate: "launch" });
    expect(state.launchReady).toBe(false);
    expect(ecommerceResolvedSelections(project)[subject.kind]).toBeUndefined();

    const text = verification(project);
    expect(text).toContain(subject.dependency);
    expect(text).not.toMatch(subject.forbidden);
    const documents = generateProjectPackage(project).documents;
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      const content = documents.find(document => document.fileName === name)!.content;
      expect(content, name).toContain(subject.dependency);
      expect(content, name).not.toMatch(subject.forbidden);
    }
    expect(documents.find(document => document.fileName === "CLIENT_QUESTIONS.md")!.content).toContain(subject.conflictId);
    expect(project).toEqual(before);
    expect(ecommerceDecisionState(project)).toEqual(state);
  });

  it.each(subjects)("preserves legitimate $kind narrative fallback without structured choices", subject => {
    const project = projectWithEvidence(subject.narratives[0], "");
    expect(verification(project)).toMatch(subject.selected);
    expect(verification(project)).not.toContain(subject.dependency);
  });

  it.each(subjects)("preserves existing $kind fallback for an unresolved answer without a conflict", subject => {
    const project = projectWithEvidence(subject.narratives[0], decision("PENDING", subject.question, "TBD"));
    expect(ecommerceDecisions(project).find(item => item.id === "PENDING")?.status).toBe("Needs answer");
    expect(verification(project)).toMatch(subject.selected);
    expect(verification(project)).not.toContain(subject.dependency);
  });

  it.each(subjects)("preserves $kind structured precedence over a different narrative candidate", subject => {
    const project = projectWithEvidence(subject.narratives[1], decision("CHOICE-A", subject.question, subject.first));
    expect(verification(project)).toMatch(subject.selected);
    expect(verification(project)).not.toContain(subject.dependency);
  });

  it.each(subjects.flatMap(subject => [false, true].map(reversed => ({ ...subject, reversed }))))(
    "preserves equivalent $kind selections, reversed=$reversed", subject => {
      const records = [decision("CHOICE-A", subject.question, subject.first), decision("CHOICE-B", subject.question, subject.equivalent)];
      const project = projectWithEvidence(subject.narratives[1], (subject.reversed ? records.reverse() : records).join("\n"));
      expect(ecommerceDecisions(project).some(item => item.id === subject.conflictId)).toBe(false);
      expect(verification(project)).toMatch(subject.selected);
      expect(verification(project)).not.toContain(subject.dependency);
    }
  );

  it.each(subjects.flatMap(subject => ([
    ["optional", "optional", "optional"], ["launch", "optional", "launch"], ["launch", "architecture", "architecture"]
  ] as const).map(([firstGate, secondGate, expectedGate]) => ({ ...subject, firstGate, secondGate, expectedGate }))))(
    "preserves $kind conflict gate $expectedGate and suppresses its narrative winner", subject => {
      const project = projectWithEvidence(subject.narratives[0], [
        decision("CHOICE-A", subject.question, subject.first, subject.firstGate),
        decision("CHOICE-B", subject.question, subject.second, subject.secondGate)
      ].join("\n"));
      const before = ecommerceDecisionState(project);
      expect(before.decisions.find(item => item.id === subject.conflictId)?.gate).toBe(subject.expectedGate);
      expect(before.blockingUnresolvedDecisions.some(item => item.id === subject.conflictId)).toBe(subject.expectedGate !== "optional");
      expect(verification(project)).toContain(subject.dependency);
      expect(verification(project)).not.toMatch(subject.forbidden);
      expect(ecommerceDecisionState(project)).toEqual(before);
    }
  );

  it.each(subjects)("does not suppress other singleton choices when $kind is conflicted", subject => {
    const project = projectWithEvidence(subjects.map(item => item.narratives[0]).join("; "), [
      decision("CHOICE-A", subject.question, subject.first), decision("CHOICE-B", subject.question, subject.second)
    ].join("\n"));
    const text = verification(project);
    expect(text).toContain(subject.dependency);
    expect(text).not.toMatch(subject.forbidden);
    for (const other of subjects.filter(item => item.kind !== subject.kind)) {
      // The combined checkout sentence changes when another choice is missing;
      // test each remaining recorded choice without assuming sentence layout.
      if (other.kind === "currency") expect(text).toContain(" in USD");
      if (other.kind === "paymentProvider") expect(text).toContain("using the recorded Stripe payment integration");
      if (other.kind === "checkoutMode") expect(text).toContain("recorded guest checkout flow");
      expect(text).not.toContain(other.dependency);
    }
  });

  it("suppresses all three conflicting choices while retaining their individual dependencies", () => {
    const records = (subject: Subject, index: number) => [
      decision(`CHOICE-${index}-A`, subject.question, subject.first), decision(`CHOICE-${index}-B`, subject.question, subject.second)
    ];
    const project = projectWithEvidence(subjects.map(item => item.narratives[0]).join("; "), subjects.flatMap(records).join("\n"));
    const text = verification(project);
    for (const subject of subjects) {
      expect(text).toContain(subject.dependency);
      expect(text).not.toMatch(subject.forbidden);
    }
  });
});
