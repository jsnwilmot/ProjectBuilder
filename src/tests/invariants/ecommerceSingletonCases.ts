import type { EcommerceSingletonSource } from "./ecommerceSingletonObservation";
import type { SingletonExpectation, VerificationExpectation } from "./singletonContract";

/** Hand-authored scope and expected values; no production resolver/normalizer imports. */
export const singletonSubjects = [
  {
    choiceId: "paymentProvider", question: "Which payment provider?",
    first: "Square", equivalent: "square", second: "Stripe",
    conflictId: "EC-SELECTION-CONFLICT-PAYMENT-PROVIDER",
    verification: {
      requiredFragments: ["resolve the recorded payment provider"],
      forbiddenPatterns: [/using the recorded .+ payment integration/iu, /using the recorded .+ integration; replay/iu]
    }
  },
  {
    choiceId: "currency", question: "Which checkout currency?",
    first: "USD", equivalent: "usd", second: "CAD",
    conflictId: "EC-SELECTION-CONFLICT-CURRENCY",
    verification: {
      requiredFragments: ["resolve the recorded currency"],
      forbiddenPatterns: [/flow in (?:USD|CAD)/u]
    }
  },
  {
    choiceId: "checkoutMode", question: "Which checkout mode?",
    first: "Guest checkout", equivalent: "guest checkout", second: "authenticated checkout",
    conflictId: "EC-SELECTION-CONFLICT-CHECKOUT",
    verification: {
      requiredFragments: ["resolve the recorded checkout mode"],
      forbiddenPatterns: [/recorded (?:guest checkout|authenticated checkout) flow/iu]
    }
  }
] as const;

export interface SingletonCase {
  readonly id: string;
  readonly source: EcommerceSingletonSource;
  readonly expected: SingletonExpectation;
  readonly verification: VerificationExpectation;
}

// This is the bounded 6D.2 contract table, not a general corpus/property framework.
export const singletonCases: readonly SingletonCase[] = singletonSubjects.flatMap(subject => {
  const source = { choiceId: subject.choiceId, question: subject.question };
  return [
    {
      id: `${subject.choiceId}-missing`, source: { ...source, answers: [] },
      expected: { outcome: "missing", contributingRecordIds: [], conflictIds: [] },
      verification: subject.verification
    },
    {
      id: `${subject.choiceId}-resolved`, source: { ...source, answers: [subject.first] },
      expected: { outcome: "resolved", contributingRecordIds: ["CHOICE-1"], acceptableSelectedValues: [subject.first], conflictIds: [] },
      verification: subject.verification
    },
    {
      id: `${subject.choiceId}-equivalent`, source: { ...source, answers: [subject.first, subject.equivalent] },
      expected: {
        outcome: "equivalentDuplicate", contributingRecordIds: ["CHOICE-1", "CHOICE-2"],
        // Currency output is canonically uppercase; other display casing may follow either record.
        acceptableSelectedValues: subject.choiceId === "currency" ? ["USD"] : [subject.first, subject.equivalent], conflictIds: []
      },
      verification: subject.verification
    },
    {
      id: `${subject.choiceId}-conflicting`, source: { ...source, answers: [subject.first, subject.second] },
      expected: { outcome: "conflicting", contributingRecordIds: ["CHOICE-1", "CHOICE-2"], conflictIds: [subject.conflictId] },
      verification: subject.verification
    }
  ] satisfies SingletonCase[];
});

export const conflictingProviderNarrativeDefect = {
  id: "PB-DEFECT-6D2-001",
  classification: "known failing production behavior",
  baselineSha: "0495f52e20c8e962014b969ee435224fd6347f66",
  origin: "Phase 6D.1 read-only Ecommerce evidence probe",
  owner: "GPT Architect triage; Ecommerce production remediation requires separate authorization",
  source: {
    choiceId: "paymentProvider", question: "Which payment provider?",
    answers: ["Stripe", "Square"], narrative: "payments via Square"
  },
  expected: {
    outcome: "conflicting", contributingRecordIds: ["CHOICE-1", "CHOICE-2"],
    conflictIds: ["EC-SELECTION-CONFLICT-PAYMENT-PROVIDER"]
  },
  verification: {
    requiredFragments: ["resolve the recorded payment provider"],
    forbiddenPatterns: [/using the recorded .+ payment integration/iu, /using the recorded .+ integration; replay/iu]
  },
  historicalFailure: "Structured selection is conflicted, but narrative fallback emits Square-specific checkout and webhook verification instead of a provider dependency."
} as const satisfies SingletonCase & {
  classification: string; baselineSha: string; origin: string; owner: string; historicalFailure: string;
};
