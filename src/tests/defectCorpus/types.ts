import type { EcommerceSelectionKind } from "../../lib/ecommerceDecisions";
import type { SingletonExpectation, VerificationExpectation } from "../invariants/singletonContract";

export type Family = "case-space" | "permutation" | "equivalent" | "conflict" | "negation" | "uncertainty" | "replacement" | "unrelated";
export type Classification = "generic" | "domain" | "parser" | "lifecycle" | "package-coherence";
export interface SourceFixture {
  readonly choiceId: EcommerceSelectionKind;
  readonly question: string;
  readonly records: readonly { readonly id: string; readonly answer: string }[];
  readonly narrative: string;
  /** A literal grammar fixture bypasses structured record serialization. */
  readonly rawRegister?: string;
}
export interface SemanticOracle {
  readonly singleton?: SingletonExpectation;
  readonly verification: VerificationExpectation;
  readonly requiredPatterns: readonly RegExp[];
  readonly records: readonly { readonly id: string; readonly status: "Answered" | "Needs answer"; readonly answer?: string }[];
}
/** All semantic values below are authored fixtures, never production-derived. */
export interface ChoiceProfile {
  readonly equivalent: string;
  readonly alternate: string;
  readonly equivalentDisplays: readonly [string, ...string[]];
  readonly alternateDisplays: readonly [string, ...string[]];
  readonly conflictId: string;
  readonly selectedPattern: RegExp;
  readonly alternatePattern: RegExp;
  readonly unresolved: VerificationExpectation;
}
export interface DefectSeed {
  readonly id: string;
  readonly version: "1.0.0";
  readonly sourceDomain: "Ecommerce";
  readonly projectType: "ecommerceSite";
  readonly classification: readonly Classification[];
  readonly originatingRegression: { readonly file: string; readonly case: string };
  readonly history: { readonly introducingCommit: null; readonly fixingCommit: string; readonly incorrectBehavior: string };
  readonly invariantRefs: readonly string[];
  readonly propertyRefs: readonly Family[];
  readonly source: SourceFixture;
  readonly expected: SemanticOracle;
  readonly choiceProfile?: ChoiceProfile;
  readonly reproduction: string;
}
export interface OperatorContract {
  readonly family: Family;
  readonly propertyId: `PB-PROP-${string}`;
  readonly version: "1.0.0";
  readonly applicability: string;
  readonly preconditions: readonly string[];
  readonly expectedRelation: string;
  readonly exceptions: readonly string[];
}
export interface TransformationCase {
  readonly name: string;
  readonly seed: DefectSeed;
  readonly operator: OperatorContract;
  readonly parameters: Readonly<Record<string, string>>;
  readonly source: SourceFixture;
  readonly expected: SemanticOracle;
}
