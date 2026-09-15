import { websiteDocumentTemplates } from "./website";
import { ecommerceDecisionState, ecommercePhases, validatedEcommerceConfiguration, PHASE_KEYS } from "../../lib/ecommerceDecisions";
import { getClientReviewReadiness } from "../../lib/clientReview";
import { markdownTable } from "../../lib/documentHelpers";
import type { ProjectRecord } from "../../types/project";
import type { GeneratedPackageReadiness } from "../../lib/generatedPackageReadiness";
import { ecommerceTestRequirements } from "../../lib/ecommerceTestRequirements";

type Project = ProjectRecord & { generationContext?: { readiness?: GeneratedPackageReadiness; clientReview?: ReturnType<typeof getClientReviewReadiness>; documentStatuses?: Record<string,string> }; currentDocumentName?: string };
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
const table = (headers: string[], rows: string[][]) => markdownTable(headers, rows.map(row => row.map(cell)));
function renderConfiguration(value: ReturnType<typeof validatedEcommerceConfiguration>["ecommerceRoutes"]): string {
  return value.unresolved ? `Unresolved: ${value.decisionId}, ${value.question}.` : value.value;
}

function summary(p: Project): string {
  const state = ecommerceDecisionState(p);
  const review = p.generationContext?.clientReview ?? getClientReviewReadiness(p);
  const readiness = p.generationContext?.readiness;
  return `## Normalized readiness\n\n${table(["Measure", "Value"], [
    ["Package readiness", readiness?.status ?? "Draft"],
    ["Unresolved decisions", String(state.unresolved.length)],
    ["Implementation-blocking decisions", String(state.implementationBlockers.length)],
    ["Launch-blocking decisions", String(state.launchBlockers.length)],
    ["Missing markers", String(readiness?.missingMarkerCount ?? 0)],
    ["Readiness checklist", `${review.checklist.filter(c => c.passed).length}/${review.checklist.length}`],
    ["Planning", "Architecture review allowed; no implementation or release approval implied"],
    ["Implementation", state.implementationReady ? "Subject to recorded phase prerequisites and review approval" : "Blocked: resolve architecture prerequisites"],
    ["Launch", state.launchReady ? "Subject to release approval and passing tests" : "Blocked: unresolved production decisions"]
  ])}\n\n${review.blockers.map(b => `- ${b}`).join("\n") || "No outstanding client-review gates."}`;
}

function storefronts(p: Project): string {
  const configuration = validatedEcommerceConfiguration(p);
  return `## Storefront model and routing\n\n${renderConfiguration(configuration.ecommerceStorefrontModel)}\n\n### Approved route / brand-theme / catalog context mapping\n\n${renderConfiguration(configuration.ecommerceRoutes)}\n\n### Explicit cart scope\n\n${renderConfiguration(configuration.ecommerceCartScope)}\n\nStorefront contexts map routes to approved branding, theme and catalog visibility. Preserve merchant ownership, order-line context and attribution. Multiple contexts do not authorize outside sellers. Enforce the recorded cart scope in navigation, cart eligibility, checkout, orders and tests. Do not collapse branded contexts into a combined store unless that model is explicitly selected.\n\nCompare these decisions with the recorded pages, data, workflows and scope; contradictions require Architect resolution before implementation.`;
}

function questions(p: Project): string {
  const state = ecommerceDecisionState(p);
  const blocking = state.blockingUnresolvedDecisions.map(d => `[MISSING: ${d.id}] — ${d.question}; source: ${d.field}; gate: ${d.gate}`).join("\n\n") || "None.";
  const optional = state.optionalUnresolvedDecisions.map(d => `[OPTIONAL: ${d.id}] — ${d.question}; status: ${d.status}; source: ${d.field}; ${d.reason || "No optional implementation scope is approved."}`).join("\n\n") || "None.";
  return `# Client Questions\n\n${summary(p)}\n\n## Decision records\n\n${table(["ID", "Gate", "Status", "Question", "Reason / approved answer"], state.decisions.map(d => [d.id, d.gate, d.status, d.question, d.answer || d.reason]))}\n\n## Traceable unresolved requirements\n\n${blocking}\n\n## Optional / deferred items\n\n${optional}\n\nBlocking markers refer to decision records above and their visible intake sources. Optional items remain visible and traceable without approving scope or blocking readiness. Resolve OQ and EC-RECORD entries in Ecommerce Decision Register. Resolve dedicated configuration and required-field entries in their identified source intake fields; a review checkbox cannot resolve a business question.`;
}
function commerceChecks(p: Project) {
  return table(["ID", "Category", "Expected result"], ecommerceTestRequirements(p).map((check, index) => [`EC-TEST-${index + 1}`, check.category, check.expectedResult]));
}

function deployment(p: Project): string {
  const configuration = validatedEcommerceConfiguration(p);
  return `# Ecommerce Deployment Notes\n\n${summary(p)}\n\n## Approved architecture\n\n${renderConfiguration(configuration.ecommerceArchitecture)}\n\n## Recorded hosting and domain\n\n${p.intake.hostingStatus}\n\n${p.intake.domainStatus}\n\n## Web deployment contract\n\n${renderConfiguration(configuration.ecommerceDeployment)}\n\nThe approved contract must identify: environments (development/test/production); source control and branches; CI gates; runtime/build commands and output; deployment mechanism; DNS/routes/HTTPS; secret names and secure provisioning (never values); database migrations and compatibility; external integration endpoints/webhooks; observability and alert ownership; backup/restore; rollback; smoke tests; release approval and operational responsibilities. Missing configuration stays a decision, never an invented default.\n\n## Release procedure\n\n1. Resolve the applicable architecture/launch records in CLIENT_QUESTIONS.md. Inspect the selected repository and verify actual scripts and lockfile.\n2. Provision isolated environments with synthetic test data; run the approved CI, migrations and integration checks. Verify backups and restore before migration.\n3. Deploy to preview with approved DNS/routes, secure secrets and signed integrations; execute TEST_PLAN.md and smoke checks.\n4. Record revision, test evidence, backup and rollback identifier; obtain release approval.\n5. After approved production deployment verify branded routes, catalog, cart/checkout, payment reconciliation, notices and observability. Roll back using the tested procedure if smoke tests fail.\n\n${storefronts(p)}`;
}

function phases(p: Project): string {
  const state = ecommerceDecisionState(p);
  const title = `# Phased Ecommerce Codex Prompts\n\n${summary(p)}\n\n${storefronts(p)}`;
  if (!state.implementationReady) return `${title}\n\n## Phase 1: Architecture resolution\n\n### Objective\nResolve architecture, route/cart boundaries, deployment and executable phase contracts with GPT Architect. No implementation-ready phase is approved.\n\n### Prerequisites and gate status\nPlanning allowed. Implementation blocked by: ${state.implementationBlockers.map(d => d.id).join(", ")}.\n\n### Files to review or update\n02_Architecture/APP_BLUEPRINT.md; 02_Architecture/ARCHITECT_INSTRUCTIONS.md; 01_Requirements/CLIENT_QUESTIONS.md; 09_Deployment/DEPLOYMENT_NOTES.md; 11_Codex_Prompts/PHASED_CODEX_PROMPTS.md. Actual target repository paths remain unapproved.\n\n### Required contracts\nRecord runtime/backend/database, repository, provider boundaries, cart scope, route/theme/catalog mapping, deployment/rollback and phase-specific files and commands. Preserve all business requirements and unresolved launch values.\n\n### Security and accessibility\nCarry forward SECURITY_MODEL.md, least privilege, payment verification, guest lookup protection and the approved accessibility target.\n\n### Test commands\nNot yet approved. Inspect the selected repository scripts and record exact baseline/build/test commands; do not invent commands or a technology stack.\n\n### Acceptance criteria\nArchitect and accountable client approve the architecture and each dependent contract. Every phase has exact files, prerequisites, implementation contracts, security/accessibility checks, test commands, acceptance evidence and stop conditions.\n\n### Evidence\nReport approved decisions, remaining question IDs, repository/script evidence, risk tradeoffs and gate status.\n\n### Stop conditions\nStop before application code or deployment while any architecture prerequisite is unresolved. Production decisions may remain deferred for planning but must block dependent release work.`;
  return `${title}\n\n${ecommercePhases(p).map((phase, index) => `## Phase ${index+1}: ${phase.objective}\n\n${PHASE_KEYS.map(key => [key, phase[key]]).map(([key,value]) => `### ${key}\n\n${value}`).join("\n\n")}\n\nLaunch remains gated by the normalized decision register and release approval.`).join("\n\n")}`;
}

const modelDocs = new Set(["PROJECT_SCOPE.md", "CLIENT_REQUIREMENTS.md", "APP_BLUEPRINT.md", "DATA_MODEL.md", "SCREEN_MAP.md", "WORKFLOW_MAP.md", "ACCEPTANCE_CRITERIA.md"]);
export const ecommerceDocumentTemplates = Object.fromEntries(Object.entries(websiteDocumentTemplates).map(([name, base]) => [name, (p: Project) => {
  if (name === "CLIENT_QUESTIONS.md") return questions(p);
  if (name === "DEPLOYMENT_NOTES.md") return deployment(p);
  if (name === "PHASED_CODEX_PROMPTS.md") return phases(p);
  if (name === "TEST_PLAN.md") return `# Ecommerce Application Test Plan\n\n${summary(p)}\n\n${commerceChecks(p)}\n\n## Recorded acceptance evidence\n\n${p.intake.acceptanceNotes}\n\n${p.intake.successCriteria}\n\nRecord revision, environment, browser/device, expected/actual result and evidence. Use synthetic data; execute only applicable tests against approved configuration. Unresolved values are test dependencies, never passing results.`;
  if (name === "HANDOFF_CHECKLIST.md") {
    const review = p.generationContext?.clientReview ?? getClientReviewReadiness(p);
    return `# Handoff Checklist\n\n${summary(p)}\n\n${table(["Gate","Status","Action"], review.checklist.map(c => [c.label,c.passed ? "Complete" : "Blocked",c.passed ? "Recorded" : c.reason]))}`;
  }
  // Retain the source question while displaying its current explicit decision,
  // rather than repeating obsolete "Unanswered" prose after an approved answer.
  const decisions = new Map(ecommerceDecisionState(p).decisions.map(d => [d.id,d]));
  const assumptions = p.intake.assumptions.replace(/(^|\n)\s*(OQ-\d+)\s*:[^\n]+/g, (line, prefix: string, id: string) => {
    const d = decisions.get(id);
    return d ? `${prefix}${id}: ${d.question} Status: ${d.status}. ${d.answer || d.reason}` : line;
  });
  const content = base({...p, intake: {...p.intake, assumptions}});
  return `${content}\n\n${summary(p)}${modelDocs.has(name) ? `\n\n${storefronts(p)}` : ""}${name === "ACCEPTANCE_CRITERIA.md" ? `\n\n## Commerce verification\n\n${commerceChecks(p)}` : ""}${name === "CODEX_INSTRUCTIONS.md" ? "\n\nImplementation is allowed only by approved phase contracts after architecture blockers are resolved. Otherwise run the architecture-resolution phase. Do not infer technology or cross-store cart behavior." : ""}`;
}])) as Record<string, (p: Project) => string>;
