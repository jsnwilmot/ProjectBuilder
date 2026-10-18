import {
  EXPECTATIONS, PATHS, FOLDERS, DIAGNOSTICS, ID, NAME, CLIENT, EXPORT_TIME, REVIEW_FILES, CUSTOM_FILES, CHECKS, CHECK_ACTIONS,
  BASE_RECORDS, CONFLICT_RECORDS, CONFLICTS, OPTIONAL_RECORD, TAX_RECORD, ACCEPTANCE, SUCCESS, STEPS, OLD_PURPOSE, NEW_PURPOSE
} from "./expectations";
import {
  STOREFRONT_FILES, ARCHITECTURE, DEPLOYMENT, PHASE, HOSTING, PLATFORM, DOMAIN, FEATURES, FEATURE_DESCRIPTION,
  AUTHENTICATION, CONSTRAINTS, OUT_OF_SCOPE, PAGES, DEPENDENCIES, UNRESOLVED_PREFIXES, CATEGORIES, SELECTED, CONFLICT_FORBIDDEN
} from "./projections";
import type { AssertionResult, InvariantId, PackageObservation } from "./types";

export const PACKAGE_CONTRACTS = [
  { id: "PB-INV-PACKAGE-001", statement: "Literal core inventory, folders, export integrity and manifest facts.", cases: ["PC-001", "PC-002", "PC-003", "PC-004", "PC-005", "PC-006", "PC-007", "PC-008", "PC-009"] },
  { id: "PB-INV-PACKAGE-002", statement: "Source decision records and traceable blocking/optional representations.", cases: ["PC-001", "PC-002", "PC-003", "PC-004", "PC-005", "PC-006", "PC-007", "PC-008", "PC-009"] },
  { id: "PB-INV-PACKAGE-003", statement: "Independently correct commerce verification in each artifact.", cases: ["PC-001", "PC-002", "PC-003", "PC-004", "PC-005", "PC-006", "PC-007", "PC-008", "PC-009"] },
  { id: "PB-INV-PACKAGE-004", statement: "Only existing document-specific storefront and configuration projections.", cases: ["PC-001", "PC-002", "PC-003", "PC-004", "PC-005", "PC-006", "PC-007", "PC-008", "PC-009"] },
  { id: "PB-INV-PACKAGE-005", statement: "Fresh summaries and handoff preserve distinct readiness dimensions.", cases: ["PC-001", "PC-002", "PC-003", "PC-004", "PC-005", "PC-006", "PC-007", "PC-009"] },
  { id: "PB-INV-PACKAGE-006", statement: "Only the approved Ready to stale to regenerated purpose-edit sequence.", cases: ["PC-002", "PC-008", "PC-009"] }
].map(contract => ({ ...contract, id: contract.id as InvariantId, definitionVersion: "1.0.0" as const, observationVersion: "1.0.0" as const, authority: "none" as const,
  applicability: { projectType: "ecommerceSite", maximumProjects: 1, fixture: "6D.4 C with approved 6D.5 changes" } }));

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, ordered(entry)]));
  return value;
}
const same = (a: unknown, b: unknown) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
const cell = (value: string) => value.replace(/\\\|/g, "|").replace(/<br>/g, "\n").trim();

/** Pure, bounded oracle. No runtime production imports, generated snapshots or selector-derived expectations. */
export function assertPackage(invariantId: InvariantId, o: PackageObservation): AssertionResult {
  const metadata = PACKAGE_CONTRACTS.find(c => c.id === invariantId)!;
  const e = EXPECTATIONS.find(candidate => candidate.id === o.caseId);
  const result: AssertionResult = { invariantId, authority: "none", definitionVersion: "1.0.0", observationVersion: "1.0.0", status: "notApplicable", checks: 0, violations: [] };
  if (!e || !metadata.cases.includes(o.caseId) || o.projectType !== "ecommerceSite" || o.project.intake.appType !== "ecommerceSite"
    || o.authority !== "none" || o.observationVersion !== "1.0.0") {
    result.reason = "Outside the explicitly listed Ecommerce cases, invariant checkpoints, or observation version.";
    return result;
  }
  const check = (location: string, actual: unknown, expected: unknown) => {
    result.checks++;
    if (!same(actual, expected)) result.violations.push({ location, actual, expected });
  };
  const contains = (location: string, text: string, required: string) => check(`${location}:required:${required}`, text.includes(required), true);
  const excludes = (location: string, text: string, forbidden: string) => check(`${location}:forbidden:${forbidden}`, text.includes(forbidden), false);
  const doc = (name: string) => {
    const found = o.documents.filter(d => d.fileName === name);
    check(`${name}:documentCount`, found.length, 1);
    return found[0]?.content ?? "";
  };
  function section(name: string, heading: string, source = doc(name)): string {
    const lines = source.split(/\r?\n/);
    const matches = lines.flatMap((line, index) => line.trim() === heading ? [index] : []);
    check(`${name}:section:${heading}:count`, matches.length, 1);
    if (matches.length !== 1) return "";
    const start = matches[0];
    const depth = heading.match(/^#+/)![0].length;
    const end = lines.findIndex((line, index) => index > start && new RegExp(`^#{1,${depth}} `).test(line));
    return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
  }
  function table(name: string, header: string, source = doc(name)): string[][] {
    const lines = source.split(/\r?\n/);
    const starts = lines.flatMap((line, index) => line.trim() === header ? [index] : []);
    check(`${name}:table:${header}:count`, starts.length, 1);
    if (starts.length !== 1) return [];
    const rows: string[][] = [];
    for (let i = starts[0] + 2; i < lines.length && lines[i].trim().startsWith("|"); i++) {
      rows.push(lines[i].trim().slice(1, -1).split(/(?<!\\)\|/).map(cell));
    }
    return rows;
  }
  const markers = o.documents.flatMap(d => [...d.content.matchAll(/\[MISSING:[^\]]+\]/g)].map(m => ({ fileName: d.fileName, marker: m[0] })));
  const manifestFacts = {
    packageSchemaVersion: 3, activeProjectId: ID, projectName: NAME, clientName: CLIENT, appType: "E-commerce site",
    projectStatus: e.status, reviewStatus: e.reviewStatus, exportedAt: EXPORT_TIME, generatedDocumentCount: 19,
    expectedDocumentCount: 19, missingInformationMarkerCount: e.markers.length, readiness: e.packageReady,
    exportWarnings: e.warnings, exportErrors: [], rootFolder: "lifecycle-test-store", folderStructure: FOLDERS,
    files: PATHS.map(path => { const [folder, fileName] = path.split("/"); return { fileName, folder, path }; }), diagnosticFiles: DIAGNOSTICS,
    ecommerce: { ...e.decisions, checklistPassed: e.checklistPassed, checklistTotal: 12 }
  };
  if (invariantId === "PB-INV-PACKAGE-001") {
    check("core.paths", o.documents.map(d => `${d.folder}/${d.fileName}`).sort(), [...PATHS].sort());
    check("core.nonblank", o.documents.filter(d => d.content.trim()).length, 19);
    check("core.folders", o.folders, FOLDERS.map(f => f.folder));
    check("core.diagnosticsExcluded", o.documents.some(d => DIAGNOSTICS.includes(`${d.folder}/${d.fileName}`) || d.fileName === "project-manifest.json"), false);
    for (const [key, value] of Object.entries(manifestFacts)) check(`manifest.${key}`, o.manifest[key as keyof typeof o.manifest], value);
    const expectedIntegrity = { isValid: true, errors: [], warnings: e.warnings, fileCount: 19, expectedFileCount: 19, missingFiles: [], extraFiles: [], unsafePaths: [], duplicatePaths: [], folderMapStatus: "valid", generatedAt: EXPORT_TIME,
      manifestSummary: { schemaVersion: 3, rootFolder: "lifecycle-test-store", expectedFileCount: 19, missingMarkerCount: e.markers.length, readiness: e.packageReady, manifestPath: "00_Project_Overview/EXPORT_MANIFEST.md" } };
    check("exportIntegrity", o.integrity, expectedIntegrity);
    const md = "EXPORT_MANIFEST.md";
    const fields = table(md, "| Field | Value |", section(md, "## Package summary", o.markdownManifest));
    check("markdownManifest.summary", fields, [
      ["Package schema version", "3"], ["Active project id", ID], ["Project name", NAME], ["Client name", CLIENT], ["Project type", "E-commerce site"],
      ["Project status", e.status], ["Review status", e.reviewStatus], ["Exported date", EXPORT_TIME], ["ZIP root folder", "lifecycle-test-store"],
      ["Generated documents", "19"], ["Expected documents", "19"], ["Missing information markers", String(e.markers.length)], ["Package readiness", e.packageReady]
    ]);
    for (const [heading, wanted] of [["## Export warnings", e.warnings], ["## Export errors", []], ["## Diagnostic files", DIAGNOSTICS]] as const) {
      check(`markdownManifest.${heading}`, section(md, heading, o.markdownManifest), wanted.length ? wanted.map(v => `- ${v}`).join("\n") : "- None");
    }
    check("markdownManifest.folders", table(md, "| Folder | Expected files |", section(md, "## Folder structure", o.markdownManifest)), FOLDERS.map(f => [f.folder, String(f.expectedFileCount)]));
    check("markdownManifest.files", table(md, "| File | Folder | Export path |", section(md, "## Expected file list", o.markdownManifest)), manifestFacts.files.map(f => [f.fileName, f.folder, f.path]));
  }
  if (invariantId === "PB-INV-PACKAGE-002") {
    check("decisions.summary", o.decisionSummary, e.decisions);
    check("decisions.markers", markers, e.markers);
    const name = "CLIENT_QUESTIONS.md";
    const ledger = section(name, "## Decision records");
    const rows = table(name, "| ID | Gate | Status | Question | Reason / approved answer |", ledger);
    const blocking = section(name, "## Traceable unresolved requirements");
    const optional = section(name, "## Optional / deferred items").split("\n\nBlocking markers")[0];
    const source = [...BASE_RECORDS, ...(e.id === "PC-004" ? CONFLICT_RECORDS : []), ...(e.id === "PC-005" ? [OPTIONAL_RECORD] : []), ...(["PC-006", "PC-007"].includes(e.id) ? [TAX_RECORD] : [])];
    for (const record of source) {
      check(`decisions.${record.id}`, o.decisions.find(d => d.id === record.id), { ...record, field: "ecommerceDecisions" });
      check(`${name}:ledger:${record.id}`, rows.filter(row => row[0] === record.id), [[record.id, record.gate, record.status, record.question, record.answer || record.reason]]);
    }
    const derived = e.id === "PC-003" ? [{ id: "EC-FIELD-WORKFLOW-STEPS", gate: "architecture", question: "Provide required ecommerce intake field: Steps", field: "workflowSteps" }]
      : e.id === "PC-004" ? CONFLICTS.map(d => ({ ...d, field: "ecommerceDecisions" }))
      : e.id === "PC-007" ? [{ id: "EC-EVIDENCE-CONFLICT-TAX", gate: "launch", question: "Reconcile conflicting tax requirements", field: "ecommerceDecisions" }] : [];
    check("decisions.ids", o.decisions.map(d => d.id), [...source.map(d => d.id), ...derived.map(d => d.id)]);
    check(`${name}:ledger:ids`, rows.map(row => row[0]), [...source.map(d => d.id), ...derived.map(d => d.id)]);
    for (const d of derived) {
      const actual = o.decisions.find(candidate => candidate.id === d.id);
      for (const [key, value] of Object.entries({ id: d.id, gate: d.gate, status: "Needs answer", question: d.question, field: d.field, answer: "" })) check(`decisions.${d.id}.${key}`, actual?.[key as keyof typeof actual], value);
      const row = rows.filter(row => row[0] === d.id);
      check(`${name}:ledger:${d.id}:count`, row.length, 1);
      check(`${name}:ledger:${d.id}:facts`, row[0]?.slice(0, 4), [d.id, d.gate, "Needs answer", d.question]);
      contains(`${name}:blocking:${d.id}`, blocking, `[MISSING: ${d.id}] — ${d.question}; source: ${d.field}; gate: ${d.gate}`);
    }
    if (!derived.length) check(`${name}:blocking:none`, blocking, "None.");
    for (const conflict of e.id === "PC-004" ? CONFLICTS : []) for (const contributor of conflict.contributors) {
      contains(`${name}:conflict:${conflict.id}`, rows.find(row => row[0] === conflict.id)?.[4] ?? "", contributor);
      contains(`decisions.${conflict.id}.reason`, o.decisions.find(d => d.id === conflict.id)?.reason ?? "", contributor);
    }
    if (e.id === "PC-003") for (const name of ["CLIENT_REQUIREMENTS.md", "WORKFLOW_MAP.md"]) {
      const parent = section(name, name === "CLIENT_REQUIREMENTS.md" ? "## Journeys and requested forms" : "## Recorded journeys");
      check(`${name}:steps`, section(name, "### Steps", parent), "[MISSING: steps]");
      excludes(`${name}:steps`, parent, STEPS);
    }
    if (e.id === "PC-005") {
      contains(`${name}:optional`, optional, "[OPTIONAL: PC-OPTIONAL] — Add wish lists?; status: Deferred; source: ecommerceDecisions; Future synthetic release.");
      excludes(`${name}:optional`, doc(name), "[MISSING: PC-OPTIONAL]");
    } else check(`${name}:optional:none`, optional, "None.");
    if (e.id === "PC-007") for (const fact of ["PC-TAX", "acceptance notes", "Calculate Canadian tax."]) {
      contains(`${name}:taxConflict`, rows.find(row => row[0] === "EC-EVIDENCE-CONFLICT-TAX")?.[4] ?? "", fact);
      contains("decisions.taxConflict.reason", o.decisions.find(d => d.id === "EC-EVIDENCE-CONFLICT-TAX")?.reason ?? "", fact);
    }
  }
  if (invariantId === "PB-INV-PACKAGE-003") {
    const artifacts: string[][][] = [];
    for (const name of ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"]) {
      const content = doc(name);
      const operative = name === "TEST_PLAN.md" ? content.split("## Recorded acceptance evidence")[0] : section(name, "## Commerce verification", content);
      if (name === "TEST_PLAN.md") section(name, "## Recorded acceptance evidence", content);
      const rows = table(name, "| ID | Category | Expected result |", operative);
      artifacts.push(rows);
      const categories = [...CATEGORIES];
      if (e.id === "PC-004") categories.splice(3, 0, "Scope dependencies");
      check(`${name}:verification:categories`, rows.map(row => row[1]), categories);
      check(`${name}:verification:ids`, rows.map(row => row[0]), categories.map((_, index) => `EC-TEST-${index + 1}`));
      const instructions = rows.filter(row => ["Checkout/payment", "Webhooks/idempotency/reconciliation", "Scope dependencies"].includes(row[1])).map(row => row[2]).join("\n");
      if (e.id === "PC-004") {
        for (const required of ["Test the recorded checkout flow;", "using the recorded provider contract; replay", ...DEPENDENCIES]) contains(`${name}:verification`, instructions, required);
        for (const forbidden of CONFLICT_FORBIDDEN) excludes(`${name}:verification`, instructions, forbidden);
      } else {
        for (const selected of SELECTED) contains(`${name}:verification`, instructions, selected);
        for (const dependency of UNRESOLVED_PREFIXES) excludes(`${name}:verification`, operative, dependency);
        for (const wrong of ["using the recorded Stripe", "flow in CAD", "recorded authenticated checkout flow"]) excludes(`${name}:verification`, instructions, wrong);
      }
      excludes(`${name}:verification`, operative, "resolve the recorded tax jurisdiction");
      if (e.id === "PC-005") for (const futureScope of ["wish list", "wishlist"]) excludes(`${name}:optionalScope`, operative.toLowerCase(), futureScope);
      if (e.id === "PC-007") contains(`${name}:taxConflict`, section(name, "## Normalized readiness", content), "EC-EVIDENCE-CONFLICT-TAX");
      const evidence = name === "TEST_PLAN.md" ? section(name, "## Recorded acceptance evidence", content) : section(name, "## Recorded success conditions", content);
      for (const fact of [ACCEPTANCE + (e.id === "PC-007" ? " Calculate Canadian tax." : ""), SUCCESS]) contains(`${name}:sourceEvidence`, evidence, fact);
      if (name === "ACCEPTANCE_CRITERIA.md") for (const fact of [FEATURES, FEATURE_DESCRIPTION]) contains(`${name}:sourceEvidence`, evidence, fact);
    }
    check("verification.crossArtifactRows", artifacts[0], artifacts[1]);
  }
  if (invariantId === "PB-INV-PACKAGE-004") {
    for (const name of STOREFRONT_FILES) {
      const content = section(name, "## Storefront model and routing");
      check(`${name}:storefront:model`, content.split("### Approved route / brand-theme / catalog context mapping")[0].trim(), "Unified storefront");
      check(`${name}:storefront:routes`, section(name, "### Approved route / brand-theme / catalog context mapping", content), "/ | Lifecycle Test Store | synthetic downloadable templates");
      contains(`${name}:storefront:cart`, section(name, "### Explicit cart scope", content), "Shared cross-context cart");
      excludes(`${name}:storefront:cart`, content, "Separate carts");
    }
    check("DEPLOYMENT_NOTES.md:architecture", section("DEPLOYMENT_NOTES.md", "## Approved architecture"), ARCHITECTURE);
    check("DEPLOYMENT_NOTES.md:hosting", section("DEPLOYMENT_NOTES.md", "## Recorded hosting and domain"), `${HOSTING}\n\n${DOMAIN}`);
    contains("DEPLOYMENT_NOTES.md:deployment", section("DEPLOYMENT_NOTES.md", "## Web deployment contract"), DEPLOYMENT);
    for (const [name, heading] of [["APP_BLUEPRINT.md", "## Architecture decisions"], ["ARCHITECT_INSTRUCTIONS.md", "## Architecture and scope"], ["CODEX_INSTRUCTIONS.md", "## Technology and deployment answers"]]) {
      const content = section(name, heading);
      for (const fact of [PLATFORM, HOSTING, DOMAIN]) contains(`${name}:sourceProjection`, content, fact);
      if (name === "APP_BLUEPRINT.md") contains(`${name}:authentication`, content, AUTHENTICATION);
      else contains(`${name}:constraints`, content, CONSTRAINTS);
      if (name === "ARCHITECT_INSTRUCTIONS.md") for (const fact of [OUT_OF_SCOPE, FEATURES, PAGES]) contains(`${name}:scope`, content, fact);
    }
    const architect = section("ARCHITECT_INSTRUCTIONS.md", "## Role and authority");
    for (const fact of ["GPT Architect reviews", "Codex Developer implements only approved work.", "The accountable client approves business decisions."]) contains("ARCHITECT_INSTRUCTIONS.md:authority", architect, fact);
    const codex = doc("CODEX_INSTRUCTIONS.md");
    contains("CODEX_INSTRUCTIONS.md:authority", section("CODEX_INSTRUCTIONS.md", "## Role and authority", codex), "Codex Developer implements the Architect-approved website requirements for the accountable client.");
    contains("CODEX_INSTRUCTIONS.md:phaseBoundary", codex, "Implementation is allowed only by approved phase contracts after architecture blockers are resolved.");
    for (const fact of [FEATURES, OUT_OF_SCOPE]) contains("CODEX_INSTRUCTIONS.md:scope", section("CODEX_INSTRUCTIONS.md", "## Scope boundary rule", codex), fact);
    const phases = doc("PHASED_CODEX_PROMPTS.md");
    if (["PC-003", "PC-004"].includes(e.id)) {
      const resolution = section("PHASED_CODEX_PROMPTS.md", "## Phase 1: Architecture resolution", phases);
      contains("PHASED_CODEX_PROMPTS.md:blocked", resolution, "No implementation-ready phase is approved.");
      for (const id of e.id === "PC-003" ? ["EC-FIELD-WORKFLOW-STEPS"] : ["EC-SELECTION-CONFLICT-PAYMENT-PROVIDER", "EC-SELECTION-CONFLICT-CHECKOUT"]) contains("PHASED_CODEX_PROMPTS.md:prerequisites", resolution, id);
      excludes("PHASED_CODEX_PROMPTS.md:blocked", phases, "## Phase 1: Exercise the fictional sandbox store contract");
    } else {
      const phase = section("PHASED_CODEX_PROMPTS.md", "## Phase 1: Exercise the fictional sandbox store contract", phases);
      for (const [key, value] of Object.entries(PHASE)) contains(`PHASED_CODEX_PROMPTS.md:phase:${key}`, section("PHASED_CODEX_PROMPTS.md", `### ${key}`, phase), value);
      excludes("PHASED_CODEX_PROMPTS.md:phase", phases, "## Phase 1: Architecture resolution");
    }
  }
  const currentState = () => {
    check("current.storedStatus", o.project.status, e.status);
    check("current.displayStatus", o.displayStatus, e.status);
    check("current.reviewStatus", o.project.reviewStatus, e.reviewStatus);
    check("current.stamp", o.project.packageGeneratedAt, e.stamp);
    check("current.confirmations", o.project.readinessConfirmations, e.confirmations);
    check("current.clientReady", o.review.ready, e.clientReady);
    check("current.checklist", o.review.checks.map(c => [c.id, c.label, c.passed]), CHECKS.map(([id, label]) => [id, label, !e.failedChecks.includes(id)]));
    check("current.packageReadiness", o.readiness.status, e.packageReady);
    check("current.readinessClientReady", o.readiness.clientReviewReady, e.clientReady);
    check("current.manifestReadiness", o.manifest.readiness, e.packageReady);
    check("current.decisionSummary", o.decisionSummary, e.decisions);
  };
  if (invariantId === "PB-INV-PACKAGE-005") {
    currentState();
    check("current.markers", markers, e.markers);
    for (const key of ["prohibitedContentCount", "missingDocumentCount", "blankDocumentCount", "duplicateExpectedPathCount", "missingTemplateCount", "orphanMarkerCount"] as const) check(`current.${key}`, o.readiness[key], 0);
    check("current.missingMarkerCount", o.readiness.missingMarkerCount, e.markers.length);
    for (const name of PATHS.map(path => path.split("/")[1])) {
      const content = doc(name);
      const summary = table(name, "| Measure | Value |", section(name, "## Normalized readiness", content));
      check(`${name}:readinessSummary`, summary, [
        ["Package readiness", e.packageReady], ["Unresolved decisions", String(e.decisions.unresolvedDecisionCount)],
        ["Implementation-blocking decisions", String(e.decisions.implementationBlockingDecisionCount)], ["Launch-blocking decisions", String(e.decisions.launchBlockingDecisionCount)],
        ["Missing markers", String(e.markers.length)], ["Readiness checklist", `${e.checklistPassed}/12`],
        ["Planning", "Architecture review allowed; no implementation or release approval implied"],
        ["Implementation", e.decisions.implementationReady ? "Subject to recorded phase prerequisites and review approval" : "Blocked: resolve architecture prerequisites"],
        ["Launch", e.decisions.launchReady ? "Subject to release approval and passing tests" : "Blocked: unresolved production decisions"]
      ]);
      const status = ["PC-003", "PC-004"].includes(e.id) || (e.id === "PC-007" && ["CLIENT_QUESTIONS.md", "DEPLOYMENT_NOTES.md"].includes(name)) ? "Draft" : REVIEW_FILES.includes(name) ? "Review Required" : "Ready for Implementation";
      check(`${name}:documentStatus`, o.documentStatuses[name], status);
      if (!CUSTOM_FILES.includes(name)) {
        for (const [label, value] of [["Project", NAME], ["Accountable client", CLIENT], ["Project type", "E-commerce site"], ["Document status", status], ["Package readiness", e.packageReady]]) contains(`${name}:header`, content.split(/^## /m)[0], `**${label}:** ${value}`);
      }
    }
    const handoff = table("HANDOFF_CHECKLIST.md", "| Gate | Status | Action |");
    check("HANDOFF_CHECKLIST.md:gates", handoff, CHECKS.map(([id, label]) => [label, e.failedChecks.includes(id) ? "Blocked" : "Complete", e.failedChecks.includes(id) ? CHECK_ACTIONS[id] : "Recorded"]));
    contains("CHANGE_LOG.md:generationDate", section("CHANGE_LOG.md", "## Package generation"), "Generation date: 2026-10-17.");
  }
  if (invariantId === "PB-INV-PACKAGE-006") {
    currentState();
    check("sequence.activeId", o.activeId, ID);
    check("sequence.storageVersion", o.storageVersion, 7);
    check("sequence.documentCount", o.project.generatedFileCount, 19);
    check("sequence.identity", o.project.identity, { id: ID, projectName: NAME });
    check("sequence.documentStatuses", o.documentStatuses, Object.fromEntries(PATHS.map(path => {
      const name = path.split("/")[1];
      return [name, REVIEW_FILES.includes(name) ? "Review Required" : "Ready for Implementation"];
    })));
    const purpose = e.id === "PC-002" ? OLD_PURPOSE : NEW_PURPOSE;
    check("sequence.sourcePurpose", o.project.intake.appPurpose, purpose);
    if (e.id === "PC-008") {
      check("sequence.retainedDocuments", o.documents, o.retainedReadyDocuments);
      check("sequence.retainedCount", o.retainedReadyDocuments?.length, 19);
      for (const name of PATHS.map(path => path.split("/")[1])) {
        const summary = table(name, "| Measure | Value |", section(name, "## Normalized readiness"));
        check(`${name}:historicalReadiness`, summary.find(row => row[0] === "Package readiness")?.[1], "Ready for Codex");
        check(`${name}:historicalChecklist`, summary.find(row => row[0] === "Readiness checklist")?.[1], "12/12");
      }
      check("sequence.manifestChecklist", o.manifest.ecommerce?.checklistPassed, 11);
    }
    for (const name of ["README.md", "PROJECT_SCOPE.md", "CLIENT_REQUIREMENTS.md", "APP_BLUEPRINT.md"]) {
      let source = name === "README.md" ? section(name, "## Purpose") : name === "APP_BLUEPRINT.md" ? section(name, "## Purpose and boundaries") : doc(name);
      if (name !== "README.md") source = section(name, "### App purpose", source);
      check(`${name}:purpose`, source, e.id === "PC-009" ? NEW_PURPOSE : OLD_PURPOSE);
    }
    if (e.id === "PC-009") {
      check("sequence.replacedDocuments", same(o.documents, o.retainedReadyDocuments), false);
      for (const name of ["README.md", "PROJECT_SCOPE.md", "CLIENT_REQUIREMENTS.md", "APP_BLUEPRINT.md"]) excludes(`${name}:obsoletePurpose`, doc(name), OLD_PURPOSE);
    }
  }
  result.status = result.violations.length ? "violated" : "satisfied";
  return result;
}
