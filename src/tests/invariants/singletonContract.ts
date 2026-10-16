/** Phase 6D.2 test contracts only. These observations confer no production authority. */
export type SingletonOutcome = "missing" | "resolved" | "equivalentDuplicate" | "conflicting";

export interface InvariantMetadata {
  readonly id: `PB-INV-${string}`;
  readonly definitionVersion: "1.0.0";
  readonly observationVersion: "1.0.0";
  readonly authority: "none";
  readonly statement: string;
  readonly applicability: {
    readonly projectTypes: readonly string[];
    readonly choiceIds: readonly string[];
  };
  readonly expectedOutcomes: readonly SingletonOutcome[];
}

const applicability = {
  projectTypes: ["ecommerceSite"],
  choiceIds: ["paymentProvider", "currency", "checkoutMode"]
} as const;

export const SINGLETON_STATE_INVARIANT = {
  id: "PB-INV-SINGLETON-001",
  definitionVersion: "1.0.0",
  observationVersion: "1.0.0",
  authority: "none",
  statement: "Missing, singular, equivalent duplicate and conflicting current authoritative values retain their specified selection and conflict outcomes.",
  applicability,
  expectedOutcomes: ["missing", "resolved", "equivalentDuplicate", "conflicting"]
} as const satisfies InvariantMetadata;

export const SINGLETON_CONFLICT_OUTPUT_INVARIANT = {
  id: "PB-INV-SINGLETON-002",
  definitionVersion: "1.0.0",
  observationVersion: "1.0.0",
  authority: "none",
  statement: "A current authoritative singleton conflict cannot select a winner through downstream narrative fallback.",
  applicability,
  expectedOutcomes: ["conflicting"]
} as const satisfies InvariantMetadata;

export interface SingletonObservation {
  readonly authority: "none";
  readonly observationVersion: "1.0.0";
  readonly projectType: string;
  readonly choiceId: string;
  readonly contributingRecordIds: readonly string[];
  readonly selectedValue: string | null;
  readonly conflictIds: readonly string[];
  readonly verificationStatements: readonly string[];
}

// Expectations are authored by the test, never resolved from observed production values.
// Equivalent representations are enumerated explicitly; this contract has no normalizer.
export type SingletonExpectation = {
  readonly contributingRecordIds: readonly string[];
} & (
  | { readonly outcome: "missing"; readonly conflictIds: readonly [] }
  | { readonly outcome: "resolved" | "equivalentDuplicate"; readonly acceptableSelectedValues: readonly [string, ...string[]]; readonly conflictIds: readonly [] }
  | { readonly outcome: "conflicting"; readonly conflictIds: readonly [string, ...string[]] }
);

export interface VerificationExpectation {
  readonly requiredFragments: readonly string[];
  readonly forbiddenPatterns: readonly RegExp[];
}

export interface InvariantViolation {
  readonly code: "recordIds" | "selection" | "conflictIds" | "requiredVerification" | "forbiddenVerification";
  readonly expected: string | readonly string[] | null;
  readonly actual: string | readonly string[] | null;
}

export interface InvariantAssertionResult {
  readonly invariantId: InvariantMetadata["id"];
  readonly definitionVersion: "1.0.0";
  readonly observationVersion: "1.0.0";
  readonly authority: "none";
  readonly status: "satisfied" | "violated" | "notApplicable";
  readonly violations: readonly InvariantViolation[];
}

function result(metadata: InvariantMetadata, observation: SingletonObservation, outcome: SingletonOutcome, violations: InvariantViolation[]): InvariantAssertionResult {
  const applicable = metadata.applicability.projectTypes.includes(observation.projectType)
    && metadata.applicability.choiceIds.includes(observation.choiceId)
    && metadata.expectedOutcomes.includes(outcome);
  return {
    invariantId: metadata.id,
    definitionVersion: metadata.definitionVersion,
    observationVersion: observation.observationVersion,
    authority: "none",
    status: !applicable ? "notApplicable" : violations.length ? "violated" : "satisfied",
    violations: applicable ? violations : []
  };
}

function sameIds(actual: readonly string[], expected: readonly string[]): boolean {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

/** Compare an independently authored expectation with an observation, not raw source. */
export function assertSingletonState(observation: SingletonObservation, expected: SingletonExpectation): InvariantAssertionResult {
  const violations: InvariantViolation[] = [];
  if (!sameIds(observation.contributingRecordIds, expected.contributingRecordIds)) {
    violations.push({ code: "recordIds", expected: expected.contributingRecordIds, actual: observation.contributingRecordIds });
  }
  if (!sameIds(observation.conflictIds, expected.conflictIds)) {
    violations.push({ code: "conflictIds", expected: expected.conflictIds, actual: observation.conflictIds });
  }
  if (expected.outcome === "resolved" || expected.outcome === "equivalentDuplicate") {
    if (observation.selectedValue === null || !expected.acceptableSelectedValues.includes(observation.selectedValue)) {
      violations.push({ code: "selection", expected: expected.acceptableSelectedValues, actual: observation.selectedValue });
    }
  } else if (observation.selectedValue !== null) {
    violations.push({ code: "selection", expected: null, actual: observation.selectedValue });
  }
  return result(SINGLETON_STATE_INVARIANT, observation, expected.outcome, violations);
}

/** Text assertions describe operative output only; no narrative is interpreted as authority. */
export function assertSingletonConflictOutput(observation: SingletonObservation, expected: SingletonExpectation, verification: VerificationExpectation): InvariantAssertionResult {
  const violations = [...assertSingletonState(observation, expected).violations];
  const text = observation.verificationStatements.join("\n");
  for (const fragment of verification.requiredFragments) {
    if (!text.includes(fragment)) violations.push({ code: "requiredVerification", expected: fragment, actual: text });
  }
  for (const pattern of verification.forbiddenPatterns) {
    // Clone to avoid stateful g/y RegExp objects changing repeated assertion results.
    const matchingStatements = observation.verificationStatements.filter(statement => new RegExp(pattern.source, pattern.flags).test(statement));
    if (matchingStatements.length) {
      violations.push({ code: "forbiddenVerification", expected: `No match for /${pattern.source}/${pattern.flags}`, actual: matchingStatements });
    }
  }
  return result(SINGLETON_CONFLICT_OUTPUT_INVARIANT, observation, expected.outcome, violations);
}
