import { C } from "../lifecycle/fixtures";
import type { ProjectInputField } from "../../types/project";
import type { CaseId } from "./types";

/** Approved input reuse only. Expected results never read this module. */
export const EXTRA_CONFLICTS = [
  "LC-PAYMENT-ALT | architecture | Answered | Which payment provider? | Fictional contradictory fixture decision | Stripe",
  "LC-CURRENCY-ALT | launch | Answered | Which checkout currency? | Fictional contradictory fixture decision | CAD",
  "LC-CHECKOUT-ALT | architecture | Answered | Which checkout mode? | Fictional contradictory fixture decision | Authenticated checkout"
].join("\n");
export const OPTIONAL = "PC-OPTIONAL | optional | Deferred | Add wish lists? | Future synthetic release. |";
export const TAX = "PC-TAX | launch | Not applicable | Tax calculation? | Fictional digital fixture excludes tax calculation. |";
export const INPUT_CASES: Array<{ id: CaseId; changes: Partial<Record<ProjectInputField, string>>; confirm: boolean }> = [
  { id: "PC-001", changes: {}, confirm: false },
  { id: "PC-002", changes: {}, confirm: true },
  { id: "PC-003", changes: { workflowSteps: "TBD" }, confirm: true },
  { id: "PC-004", changes: { ecommerceDecisions: `${C.ecommerceDecisions}\n${EXTRA_CONFLICTS}` }, confirm: true },
  { id: "PC-005", changes: { ecommerceDecisions: `${C.ecommerceDecisions}\n${OPTIONAL}` }, confirm: true },
  { id: "PC-006", changes: { ecommerceDecisions: `${C.ecommerceDecisions}\n${TAX}` }, confirm: true },
  { id: "PC-007", changes: { ecommerceDecisions: `${C.ecommerceDecisions}\n${TAX}`, acceptanceNotes: `${C.acceptanceNotes} Calculate Canadian tax.` }, confirm: true }
];
