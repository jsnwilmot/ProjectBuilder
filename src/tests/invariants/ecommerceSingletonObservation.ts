import { ecommerceDecisions, ecommerceResolvedSelections, type EcommerceSelectionKind } from "../../lib/ecommerceDecisions";
import { ecommerceTestRequirements } from "../../lib/ecommerceTestRequirements";
import type { ProjectRecord } from "../../types/project";
import { createEcommerceFixture } from "../helpers/ecommerce";
import type { SingletonObservation } from "./singletonContract";

export interface EcommerceSingletonSource {
  readonly choiceId: EcommerceSelectionKind;
  readonly question: string;
  readonly answers: readonly string[];
  readonly narrative?: string;
}

/** Isolated synthetic input, never browser storage or the user's saved project. */
export function createSingletonProject(source: EcommerceSingletonSource): ProjectRecord {
  const project = createEcommerceFixture();
  // Isolate this bounded singleton from every narrative/configuration source.
  for (const field of Object.keys(project.intake) as Array<keyof typeof project.intake>) {
    if (typeof project.intake[field] === "string" && field !== "appType") {
      (project.intake as unknown as Record<string, unknown>)[field] = "";
    }
  }
  project.intake.acceptanceNotes = source.narrative ?? "";
  project.intake.ecommerceDecisions = source.answers.map((answer, index) =>
    `CHOICE-${index + 1} | launch | Answered | ${source.question} | Approved fixture answer | ${answer}`
  ).join("\n");
  project.reviewItems = [];
  return project;
}

// Diagnostic identities and subject mappings belong to this Ecommerce observer,
// not to the generic assertion contract. Expected IDs live independently in fixtures.
const observedConflictIds: Record<EcommerceSelectionKind, string> = {
  paymentProvider: "EC-SELECTION-CONFLICT-PAYMENT-PROVIDER",
  currency: "EC-SELECTION-CONFLICT-CURRENCY",
  checkoutMode: "EC-SELECTION-CONFLICT-CHECKOUT"
};

export function observeEcommerceSingleton(project: ProjectRecord, choiceId: EcommerceSelectionKind): SingletonObservation {
  const decisions = ecommerceDecisions(project);
  return {
    authority: "none",
    observationVersion: "1.0.0",
    projectType: project.intake.appType,
    choiceId,
    contributingRecordIds: decisions.filter(decision => /^CHOICE-\d+$/.test(decision.id) && decision.status === "Answered").map(decision => decision.id),
    selectedValue: ecommerceResolvedSelections(project)[choiceId]?.value ?? null,
    conflictIds: decisions.filter(decision => decision.id === observedConflictIds[choiceId] && decision.status === "Needs answer").map(decision => decision.id),
    verificationStatements: ecommerceTestRequirements(project)
      .filter(row => ["Checkout/payment", "Scope dependencies", "Webhooks/idempotency/reconciliation"].includes(row.category))
      .map(row => row.expectedResult)
  };
}
