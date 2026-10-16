import { conflictingProviderNarrativeDefect } from "../invariants/ecommerceSingletonCases";
import type { ChoiceProfile, DefectSeed, Family, SemanticOracle, SourceFixture } from "./types";

// Semantic oracles have no production imports. Display alternatives are finite,
// not computed by the resolver or a copy of its normalization algorithm.
export const profiles = {
  paymentProvider: {
    equivalent: "square", alternate: "Stripe", equivalentDisplays: ["Square", "square", "SQUARE"], alternateDisplays: ["Stripe"],
    conflictId: "EC-SELECTION-CONFLICT-PAYMENT-PROVIDER",
    selectedPattern: /using the recorded Square payment integration/iu,
    alternatePattern: /using the recorded Stripe payment integration/iu,
    unresolved: { requiredFragments: ["resolve the recorded payment provider"], forbiddenPatterns: [/using the recorded .+ payment integration/iu, /using the recorded .+ integration; replay/iu] }
  },
  currency: {
    equivalent: "USD", alternate: "CAD", equivalentDisplays: ["USD"], alternateDisplays: ["CAD"],
    conflictId: "EC-SELECTION-CONFLICT-CURRENCY",
    selectedPattern: /flow in USD/iu, alternatePattern: /flow in CAD/iu,
    unresolved: { requiredFragments: ["resolve the recorded currency"], forbiddenPatterns: [/flow in [a-z]{3}\b/iu] }
  },
  checkoutMode: {
    equivalent: "guest checkout", alternate: "authenticated checkout",
    equivalentDisplays: ["Guest checkout", "guest checkout", "GUEST CHECKOUT"], alternateDisplays: ["authenticated checkout"],
    conflictId: "EC-SELECTION-CONFLICT-CHECKOUT",
    selectedPattern: /recorded Guest checkout flow/iu, alternatePattern: /recorded authenticated checkout flow/iu,
    unresolved: { requiredFragments: ["resolve the recorded checkout mode"], forbiddenPatterns: [/recorded (?:guest checkout|authenticated checkout) flow/iu] }
  }
} as const satisfies Record<string, ChoiceProfile>;

const noVerification = { requiredFragments: [], forbiddenPatterns: [] } as const;
const allFamilies: readonly Family[] = ["case-space", "equivalent", "conflict", "negation", "uncertainty", "replacement", "unrelated"];
const preserveFamilies: readonly Family[] = ["case-space", "unrelated"];
const missing = { outcome: "missing", contributingRecordIds: [], conflictIds: [] } as const;
const stateRef = ["PB-INV-SINGLETON-001"];
const pass = (number: number, title: string) => ({ file: `src/tests/ecommercePass${number}Remediation.test.ts`, case: title });

function seed(
  id: string, originatingRegression: DefectSeed["originatingRegression"], fixingCommit: string,
  incorrectBehavior: string, source: SourceFixture, expected: SemanticOracle,
  options: { classification?: DefectSeed["classification"]; propertyRefs?: readonly Family[]; choiceProfile?: ChoiceProfile; invariantRefs?: readonly string[] } = {}
): DefectSeed {
  return {
    id, version: "1.0.0", sourceDomain: "Ecommerce", projectType: "ecommerceSite",
    classification: options.classification ?? ["domain", "parser"], originatingRegression,
    history: { introducingCommit: null, fixingCommit, incorrectBehavior }, source, expected,
    invariantRefs: options.invariantRefs ?? stateRef, propertyRefs: options.propertyRefs ?? preserveFamilies,
    choiceProfile: options.choiceProfile,
    reproduction: `npm run test:unit -- src/tests/defectCorpus.test.ts -t ${id}`
  };
}

// Selected representatives only. Original suites retain all broader history.
export const defectSeeds: readonly DefectSeed[] = [
  seed("PB-CORPUS-EC-001", pass(17, "uses a provider resolved only by an effective Answered decision"), "3929395ad296a9751fdb1795882f208af65ac934",
    "Structured-only provider selection did not drive verification.",
    { choiceId: "paymentProvider", question: "Which payment provider?", records: [{ id: "CHOICE-1", answer: "Square" }], narrative: "" },
    { singleton: { outcome: "resolved", contributingRecordIds: ["CHOICE-1"], acceptableSelectedValues: profiles.paymentProvider.equivalentDisplays, conflictIds: [] }, verification: noVerification, requiredPatterns: [profiles.paymentProvider.selectedPattern], records: [{ id: "CHOICE-1", status: "Answered" }] },
    { propertyRefs: allFamilies, choiceProfile: profiles.paymentProvider }),
  seed("PB-CORPUS-EC-002", pass(17, "uses a lowercase currency resolved only by an effective Answered decision"), "3929395ad296a9751fdb1795882f208af65ac934",
    "A lowercase structured currency did not supply canonical selected evidence.",
    { choiceId: "currency", question: "Which checkout currency?", records: [{ id: "CHOICE-1", answer: "usd" }], narrative: "" },
    { singleton: { outcome: "resolved", contributingRecordIds: ["CHOICE-1"], acceptableSelectedValues: ["USD"], conflictIds: [] }, verification: noVerification, requiredPatterns: [/flow in USD/iu], records: [{ id: "CHOICE-1", status: "Answered" }] },
    { propertyRefs: allFamilies, choiceProfile: profiles.currency }),
  seed("PB-CORPUS-EC-003", pass(17, "uses a checkout mode resolved only by an effective Answered decision"), "3929395ad296a9751fdb1795882f208af65ac934",
    "Structured-only checkout selection did not drive verification.",
    { choiceId: "checkoutMode", question: "Which checkout mode?", records: [{ id: "CHOICE-1", answer: "Guest checkout" }], narrative: "" },
    { singleton: { outcome: "resolved", contributingRecordIds: ["CHOICE-1"], acceptableSelectedValues: profiles.checkoutMode.equivalentDisplays, conflictIds: [] }, verification: noVerification, requiredPatterns: [profiles.checkoutMode.selectedPattern], records: [{ id: "CHOICE-1", status: "Answered" }] },
    { propertyRefs: allFamilies, choiceProfile: profiles.checkoutMode }),
  seed("PB-CORPUS-EC-004", pass(18, "treats normalized currency duplicates as agreement"), "29f7bb702f08f0c7b790ff9b8085d8b683d299ca",
    "Singleton agreement and conflicts were not reconciled as explicit group outcomes.",
    { choiceId: "currency", question: "Which checkout currency?", records: [{ id: "CHOICE-1", answer: "usd" }, { id: "CHOICE-2", answer: "USD" }], narrative: "" },
    { singleton: { outcome: "equivalentDuplicate", contributingRecordIds: ["CHOICE-1", "CHOICE-2"], acceptableSelectedValues: ["USD"], conflictIds: [] }, verification: noVerification, requiredPatterns: [/flow in USD/iu], records: [{ id: "CHOICE-1", status: "Answered" }, { id: "CHOICE-2", status: "Answered" }] },
    { propertyRefs: ["case-space", "permutation", "unrelated"], classification: ["generic", "domain"] }),
  seed("PB-DEFECT-6D2-001", { file: "src/tests/systemSingletonKnownDefect.test.ts", case: "PB-DEFECT-6D2-001 [known production defect]: conflicting structured providers cannot select a narrative winner" }, "fdb2a80b6b7e9bd9fb4cab906807c005f31f814f",
    conflictingProviderNarrativeDefect.historicalFailure,
    { choiceId: "paymentProvider", question: "Which payment provider?", records: [{ id: "CHOICE-1", answer: "Stripe" }, { id: "CHOICE-2", answer: "Square" }], narrative: "payments via Square" },
    { singleton: conflictingProviderNarrativeDefect.expected, verification: conflictingProviderNarrativeDefect.verification, requiredPatterns: [], records: [{ id: "CHOICE-1", status: "Answered" }, { id: "CHOICE-2", status: "Answered" }] },
    { classification: ["generic", "domain"], invariantRefs: ["PB-INV-SINGLETON-001", "PB-INV-SINGLETON-002"] }),
  seed("PB-CORPUS-EC-006", pass(12, "Ecommerce Pass 12 complete explicit provider values"), "df19da035343ff8da2eb95b903b9b6d83620eb56",
    "Partial provider extraction could turn the complete placeholder Not sure into a selected provider.",
    { choiceId: "paymentProvider", question: "Which payment provider?", records: [], narrative: "payment provider: Not sure" },
    { singleton: missing, verification: profiles.paymentProvider.unresolved, requiredPatterns: [], records: [] }),
  seed("PB-CORPUS-EC-007", pass(9, "Ecommerce Pass 9 currency context: currency pending approval: usd"), "c3ee6d0bb05fb45bafe4d845a21fe528c7f839b7",
    "A candidate token could escape its governing unresolved currency context.",
    { choiceId: "currency", question: "Which checkout currency?", records: [], narrative: "currency pending approval: usd" },
    { singleton: missing, verification: profiles.currency.unresolved, requiredPatterns: [], records: [] }),
  seed("PB-CORPUS-EC-008", pass(16, "Ecommerce Pass 16 provider-selection decision subjects: payments via Square while refund approval is pending"), "edeaeec307080186d1e4d02305693643949f71a1",
    "Pending business workflow approval incorrectly invalidated an otherwise resolved provider.",
    { choiceId: "paymentProvider", question: "Which payment provider?", records: [], narrative: "payments via Square while refund approval is pending" },
    { singleton: missing, verification: { requiredFragments: [], forbiddenPatterns: [/resolve the recorded payment provider/iu] }, requiredPatterns: [/using the recorded Square payment integration/iu], records: [] }),
  seed("PB-CORPUS-EC-009", pass(6, "preserves coordinated currency and checkout polarity across commas and contrasts"), "b8119a40a6ed72efe82a38251dd58ccbe8a78c4b",
    "Coordinated alternatives could lose the governing negative polarity.",
    { choiceId: "currency", question: "Which checkout currency?", records: [], narrative: "No CAD, USD, or EUR support" },
    { singleton: missing, verification: profiles.currency.unresolved, requiredPatterns: [], records: [] }),
  seed("PB-CORPUS-EC-010", pass(16, "Ecommerce Pass 16 conservative attributed-decision grammar: Pending USD approval by global business operations group"), "edeaeec307080186d1e4d02305693643949f71a1",
    "A terminal actor noun phrase could be misread as a predicate and release pending currency evidence.",
    { choiceId: "currency", question: "Which checkout currency?", records: [], narrative: "Pending USD approval by global business operations group" },
    { singleton: missing, verification: profiles.currency.unresolved, requiredPatterns: [], records: [] }),
  seed("PB-CORPUS-EC-011", pass(19, "Ecommerce Pass 19 complete structured singleton selections: USD or CAD"), "83488092d563581ae2521d7ed21fdba5893b97fa",
    "A structured alternative choice could be accepted by partial token matching.",
    { choiceId: "currency", question: "Which checkout currency?", records: [{ id: "CHOICE-1", answer: "USD or CAD" }], narrative: "" },
    { singleton: missing, verification: profiles.currency.unresolved, requiredPatterns: [], records: [{ id: "CHOICE-1", status: "Needs answer" }] }),
  seed("PB-CORPUS-EC-012", pass(6, "parses exactly six decision fields and preserves valid escaped content"), "b8119a40a6ed72efe82a38251dd58ccbe8a78c4b",
    "Literal escaped pipes could be split as field delimiters instead of decoded as answer content.",
    { choiceId: "currency", question: "", records: [], narrative: "", rawRegister: String.raw`OQ-06 | launch | Answered | Multiple pipes? | Approved | /shop \| Brand \| Catalog` },
    { verification: noVerification, requiredPatterns: [], records: [{ id: "OQ-06", status: "Answered", answer: "/shop | Brand | Catalog" }] },
    { classification: ["parser"], propertyRefs: [], invariantRefs: [] })
];
