import { describe, expect, it } from "vitest";
import { singletonCases } from "./invariants/ecommerceSingletonCases";
import { createSingletonProject, observeEcommerceSingleton } from "./invariants/ecommerceSingletonObservation";
import {
  assertSingletonConflictOutput, assertSingletonState,
  SINGLETON_CONFLICT_OUTPUT_INVARIANT, SINGLETON_STATE_INVARIANT
} from "./invariants/singletonContract";

describe("Phase 6D.2 bounded singleton invariant contracts", () => {
  it("pins stable identities, explicit versions, authority-free scope and expected outcomes", () => {
    expect(SINGLETON_STATE_INVARIANT).toMatchObject({
      id: "PB-INV-SINGLETON-001", definitionVersion: "1.0.0", observationVersion: "1.0.0", authority: "none",
      applicability: { projectTypes: ["ecommerceSite"], choiceIds: ["paymentProvider", "currency", "checkoutMode"] },
      expectedOutcomes: ["missing", "resolved", "equivalentDuplicate", "conflicting"]
    });
    expect(SINGLETON_CONFLICT_OUTPUT_INVARIANT).toMatchObject({
      id: "PB-INV-SINGLETON-002", definitionVersion: "1.0.0", observationVersion: "1.0.0", authority: "none",
      expectedOutcomes: ["conflicting"]
    });
    expect(singletonCases).toHaveLength(12);
  });

  it.each(singletonCases)("$id observes existing APIs without changing the source", ({ source, expected }) => {
    const project = createSingletonProject(source);
    const before = structuredClone(project);
    const observation = observeEcommerceSingleton(project, source.choiceId);
    expect(assertSingletonState(observation, expected)).toMatchObject({
      invariantId: "PB-INV-SINGLETON-001", definitionVersion: "1.0.0", observationVersion: "1.0.0",
      authority: "none", status: "satisfied", violations: []
    });
    expect(project).toEqual(before);
  });

  it.each(singletonCases.filter(testCase => testCase.source.answers.length === 2))(
    "$id preserves the specified semantic outcome when record order reverses", ({ source, expected }) => {
      const project = createSingletonProject(source);
      project.intake.ecommerceDecisions = project.intake.ecommerceDecisions.split("\n").reverse().join("\n");
      expect(assertSingletonState(observeEcommerceSingleton(project, source.choiceId), expected))
        .toMatchObject({ status: "satisfied", violations: [] });
    }
  );

  it.each(singletonCases.filter(testCase => testCase.expected.outcome === "conflicting"))(
    "$id retains unresolved downstream verification without narrative fallback", ({ source, expected, verification }) => {
      const observation = observeEcommerceSingleton(createSingletonProject(source), source.choiceId);
      expect(assertSingletonConflictOutput(observation, expected, verification))
        .toMatchObject({ invariantId: "PB-INV-SINGLETON-002", status: "satisfied", violations: [] });
    }
  );

  it("reports independent violations instead of deriving expected results from observed winners", () => {
    const testCase = singletonCases[3];
    const observation = observeEcommerceSingleton(createSingletonProject(testCase.source), testCase.source.choiceId);
    const result = assertSingletonConflictOutput({
      ...observation, contributingRecordIds: ["CHOICE-2"], selectedValue: "Square", conflictIds: [],
      verificationStatements: ["Test using the recorded Square payment integration"]
    }, testCase.expected, testCase.verification);
    expect(result.status).toBe("violated");
    expect(result.violations.map(violation => violation.code)).toEqual([
      "recordIds", "conflictIds", "selection", "requiredVerification", "forbiddenVerification"
    ]);
    expect(result.authority).toBe("none");
  });

  it("does not count an unsupported choice or outcome as invariant satisfaction", () => {
    const testCase = singletonCases[0];
    const observation = observeEcommerceSingleton(createSingletonProject(testCase.source), testCase.source.choiceId);
    expect(assertSingletonState({ ...observation, choiceId: "unsupported-choice" }, testCase.expected).status).toBe("notApplicable");
    expect(assertSingletonConflictOutput(observation, testCase.expected, testCase.verification).status).toBe("notApplicable");
  });

  it("keeps assertion results reproducible and observations unchanged", () => {
    const testCase = singletonCases[3];
    const observation = observeEcommerceSingleton(createSingletonProject(testCase.source), testCase.source.choiceId);
    const before = structuredClone(observation);
    const verification = { requiredFragments: [], forbiddenPatterns: [/resolve/g] };
    const first = assertSingletonConflictOutput(observation, testCase.expected, verification);
    expect(first.status).toBe("violated");
    expect(assertSingletonConflictOutput(observation, testCase.expected, verification)).toEqual(first);
    expect(observation).toEqual(before);
  });
});
