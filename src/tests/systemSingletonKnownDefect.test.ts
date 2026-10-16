import { expect, it } from "vitest";
import { conflictingProviderNarrativeDefect as defect } from "./invariants/ecommerceSingletonCases";
import { createSingletonProject, observeEcommerceSingleton } from "./invariants/ecommerceSingletonObservation";
import { assertSingletonConflictOutput, assertSingletonState } from "./invariants/singletonContract";

// A real failing assertion on the authorized baseline, not it.fails/skip/todo.
// Separate production remediation must make this test green without changing its oracle.
it("PB-DEFECT-6D2-001 [known production defect]: conflicting structured providers cannot select a narrative winner", () => {
  const project = createSingletonProject(defect.source);
  const observation = observeEcommerceSingleton(project, defect.source.choiceId);
  expect(assertSingletonState(observation, defect.expected)).toMatchObject({ status: "satisfied", violations: [] });

  const result = assertSingletonConflictOutput(observation, defect.expected, defect.verification);
  expect(result, JSON.stringify({
    defectId: defect.id,
    classification: defect.classification,
    baselineSha: defect.baselineSha,
    source: project.intake.ecommerceDecisions,
    narrative: defect.source.narrative,
    observation,
    result
  }, null, 2)).toMatchObject({ status: "satisfied", violations: [] });
});
