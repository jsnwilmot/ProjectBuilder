import type { PackageExpectation } from "./types";

/** Independently transcribed Architect addendum. No runtime production imports or fixture-derived outcomes. */
export const ID = "00000000-0000-4000-8000-000000000001";
export const NAME = "Lifecycle Test Store";
export const CLIENT = "Synthetic Fixture Owner";
export const EXPORT_TIME = "2026-10-17T13:00:00.000Z";
export const OLD_PURPOSE = "Sell synthetic downloadable templates through one fictional storefront.";
export const NEW_PURPOSE = "Sell synthetic downloadable templates through a keyboard-first fictional storefront.";
export const ACCEPTANCE = "Guest purchases template SKU SYN-001 for USD 10.00 using Square sandbox; repeated webhook creates one order; verified guest sees only that order.";
export const SUCCESS = "The synthetic guest journey produces one USD 10.00 paid order with protected digital delivery.";
export const STEPS = "Validate SKU and price; verify signed payment event; create order idempotently; issue expiring download link.";
export const PATHS = [
  "00_Project_Overview/README.md", "00_Project_Overview/PROJECT_SCOPE.md", "00_Project_Overview/NEXT_STEPS.md",
  "00_Project_Overview/CHANGE_LOG.md", "00_Project_Overview/HANDOFF_CHECKLIST.md", "01_Requirements/CLIENT_REQUIREMENTS.md",
  "01_Requirements/CLIENT_QUESTIONS.md", "01_Requirements/ACCEPTANCE_CRITERIA.md", "02_Architecture/ARCHITECT_INSTRUCTIONS.md",
  "02_Architecture/APP_BLUEPRINT.md", "03_Data_Model/DATA_MODEL.md", "04_UI_UX/SCREEN_MAP.md", "04_UI_UX/BRAND_GUIDE.md",
  "05_Workflows/WORKFLOW_MAP.md", "06_Security/SECURITY_MODEL.md", "07_Development/CODEX_INSTRUCTIONS.md",
  "08_Testing/TEST_PLAN.md", "09_Deployment/DEPLOYMENT_NOTES.md", "11_Codex_Prompts/PHASED_CODEX_PROMPTS.md"
];
export const FOLDERS = [
  { folder: "00_Project_Overview", expectedFileCount: 5 }, { folder: "01_Requirements", expectedFileCount: 3 },
  { folder: "02_Architecture", expectedFileCount: 2 }, { folder: "03_Data_Model", expectedFileCount: 1 },
  { folder: "04_UI_UX", expectedFileCount: 2 }, { folder: "05_Workflows", expectedFileCount: 1 },
  { folder: "06_Security", expectedFileCount: 1 }, { folder: "07_Development", expectedFileCount: 1 },
  { folder: "08_Testing", expectedFileCount: 1 }, { folder: "09_Deployment", expectedFileCount: 1 },
  { folder: "10_Documentation", expectedFileCount: 0 }, { folder: "11_Codex_Prompts", expectedFileCount: 1 }
];
export const DIAGNOSTICS = ["00_Project_Overview/EXPORT_MANIFEST.md", "project-manifest.json"];
export const REVIEW_FILES = ["PROJECT_SCOPE.md", "CLIENT_REQUIREMENTS.md", "ARCHITECT_INSTRUCTIONS.md", "APP_BLUEPRINT.md", "ACCEPTANCE_CRITERIA.md", "CODEX_INSTRUCTIONS.md", "PHASED_CODEX_PROMPTS.md"];
export const CUSTOM_FILES = ["CLIENT_QUESTIONS.md", "DEPLOYMENT_NOTES.md", "PHASED_CODEX_PROMPTS.md", "TEST_PLAN.md", "HANDOFF_CHECKLIST.md"];
export const CHECKS = [
  ["projectTypeConfirmed", "Project type confirmed"], ["scopeReviewed", "Scope reviewed"], ["requiredGapsResolved", "Required gaps resolved"],
  ["brandingConfirmed", "Branding confirmed if required"], ["screensConfirmed", "Screens or pages confirmed"], ["dataModelConfirmed", "Data model confirmed"],
  ["workflowsConfirmed", "Workflows confirmed"], ["securityConfirmed", "Security expectations confirmed"], ["acceptanceCriteriaReviewed", "Acceptance criteria reviewed"],
  ["clientQuestionsResolved", "Client questions resolved or not applicable"], ["draftPackageReviewed", "Draft package reviewed"], ["codexInstructionsReady", "Codex instructions ready"]
];
export const CHECK_ACTIONS: Record<string, string> = {
  scopeReviewed: "Confirm the project scope has been reviewed.",
  requiredGapsResolved: "Resolve each blocking missing-information review item.",
  workflowsConfirmed: "Complete and resolve the workflow review.",
  acceptanceCriteriaReviewed: "Confirm the acceptance criteria are testable and approved.",
  clientQuestionsResolved: "Resolve client questions, or mark them not applicable with a reason.",
  draftPackageReviewed: "Generate and review a Draft package before final readiness.",
  codexInstructionsReady: "Regenerate the package after the final review decisions."
};
const confirmed = { scopeReviewed: true, acceptanceCriteriaReviewed: true, draftPackageReviewed: true };
const clear = { unresolvedDecisionCount: 0, implementationBlockingDecisionCount: 0, launchBlockingDecisionCount: 0, planningReady: true, implementationReady: true, launchReady: true };
const ready = { status: "Ready for Codex", reviewStatus: "Approved", stamp: "2026-10-17T12:07:00.000Z", clientReady: true, packageReady: "Ready for Codex" as const, failedChecks: [], decisions: clear, checklistPassed: 12, markers: [], warnings: [], confirmations: confirmed };
const draft = { status: "Needs Review", reviewStatus: "Review needed", clientReady: false, packageReady: "Draft" as const };
export const EXPECTATIONS: PackageExpectation[] = [
  { ...ready, ...draft, id: "PC-001", stamp: "2026-10-17T12:03:00.000Z", confirmations: {}, failedChecks: ["scopeReviewed", "acceptanceCriteriaReviewed", "draftPackageReviewed"], checklistPassed: 9, warnings: ["Package readiness is Draft because 3 readiness blocker(s) remain."] },
  { ...ready, id: "PC-002" },
  { ...ready, ...draft, id: "PC-003", failedChecks: ["requiredGapsResolved", "workflowsConfirmed", "clientQuestionsResolved", "codexInstructionsReady"], checklistPassed: 8,
    decisions: { unresolvedDecisionCount: 1, implementationBlockingDecisionCount: 1, launchBlockingDecisionCount: 0, planningReady: true, implementationReady: false, launchReady: false },
    markers: [{ fileName: "CLIENT_REQUIREMENTS.md", marker: "[MISSING: steps]" }, { fileName: "CLIENT_QUESTIONS.md", marker: "[MISSING: EC-FIELD-WORKFLOW-STEPS]" }, { fileName: "WORKFLOW_MAP.md", marker: "[MISSING: steps]" }],
    warnings: ["3 missing-information marker(s) will remain in the export.", "Package readiness is Draft because 7 readiness blocker(s) remain."] },
  { ...ready, ...draft, id: "PC-004", failedChecks: ["requiredGapsResolved", "clientQuestionsResolved", "codexInstructionsReady"], checklistPassed: 9,
    decisions: { unresolvedDecisionCount: 3, implementationBlockingDecisionCount: 2, launchBlockingDecisionCount: 1, planningReady: true, implementationReady: false, launchReady: false },
    markers: ["PAYMENT-PROVIDER", "CURRENCY", "CHECKOUT"].map(choice => ({ fileName: "CLIENT_QUESTIONS.md", marker: `[MISSING: EC-SELECTION-CONFLICT-${choice}]` })),
    warnings: ["3 missing-information marker(s) will remain in the export.", "Package readiness is Draft because 7 readiness blocker(s) remain."] },
  { ...ready, id: "PC-005", decisions: { ...clear, unresolvedDecisionCount: 1 } },
  { ...ready, id: "PC-006" },
  { ...ready, ...draft, id: "PC-007", failedChecks: ["requiredGapsResolved", "clientQuestionsResolved", "codexInstructionsReady"], checklistPassed: 9,
    decisions: { unresolvedDecisionCount: 1, implementationBlockingDecisionCount: 0, launchBlockingDecisionCount: 1, planningReady: true, implementationReady: true, launchReady: false },
    markers: [{ fileName: "CLIENT_QUESTIONS.md", marker: "[MISSING: EC-EVIDENCE-CONFLICT-TAX]" }],
    warnings: ["1 missing-information marker(s) will remain in the export.", "Package readiness is Draft because 5 readiness blocker(s) remain."] },
  { ...ready, ...draft, id: "PC-008", stamp: null, failedChecks: ["codexInstructionsReady"], checklistPassed: 11, warnings: ["Package readiness is Draft because 1 readiness blocker(s) remain."] },
  { ...ready, id: "PC-009", stamp: "2026-10-17T12:10:00.000Z" }
];

export const BASE_RECORDS = [
  { id: "LC-PAYMENT", gate: "architecture", status: "Answered", question: "Which payment provider?", answer: "Square", reason: "Fictional fixture decision" },
  { id: "LC-CURRENCY", gate: "launch", status: "Answered", question: "Which checkout currency?", answer: "USD", reason: "Fictional fixture decision" },
  { id: "LC-CHECKOUT", gate: "architecture", status: "Answered", question: "Which checkout mode?", answer: "Guest checkout", reason: "Fictional fixture decision" }
];
export const CONFLICT_RECORDS = [
  { id: "LC-PAYMENT-ALT", gate: "architecture", status: "Answered", question: "Which payment provider?", answer: "Stripe", reason: "Fictional contradictory fixture decision" },
  { id: "LC-CURRENCY-ALT", gate: "launch", status: "Answered", question: "Which checkout currency?", answer: "CAD", reason: "Fictional contradictory fixture decision" },
  { id: "LC-CHECKOUT-ALT", gate: "architecture", status: "Answered", question: "Which checkout mode?", answer: "Authenticated checkout", reason: "Fictional contradictory fixture decision" }
];
export const CONFLICTS = [
  { id: "EC-SELECTION-CONFLICT-PAYMENT-PROVIDER", gate: "architecture", question: "Resolve conflicting payment provider Decision Register answers", contributors: ["LC-PAYMENT=Square", "LC-PAYMENT-ALT=Stripe"] },
  { id: "EC-SELECTION-CONFLICT-CURRENCY", gate: "launch", question: "Resolve conflicting checkout currency Decision Register answers", contributors: ["LC-CURRENCY=USD", "LC-CURRENCY-ALT=CAD"] },
  { id: "EC-SELECTION-CONFLICT-CHECKOUT", gate: "architecture", question: "Resolve conflicting checkout mode Decision Register answers", contributors: ["LC-CHECKOUT=Guest checkout", "LC-CHECKOUT-ALT=Authenticated checkout"] }
];
export const OPTIONAL_RECORD = { id: "PC-OPTIONAL", gate: "optional", status: "Deferred", question: "Add wish lists?", reason: "Future synthetic release.", answer: "" };
export const TAX_RECORD = { id: "PC-TAX", gate: "launch", status: "Not applicable", question: "Tax calculation?", reason: "Fictional digital fixture excludes tax calculation.", answer: "" };
