import type { CaseId, InvariantId, PackageObservation } from "./types";

export interface NegativeControl {
  family: string; name: string; caseId: CaseId; invariantId: InvariantId; locations: string[];
  corrupt: (observation: PackageObservation) => void;
}
const inventory: InvariantId = "PB-INV-PACKAGE-001";
const trace: InvariantId = "PB-INV-PACKAGE-002";
const verification: InvariantId = "PB-INV-PACKAGE-003";
const configuration: InvariantId = "PB-INV-PACKAGE-004";
const readiness: InvariantId = "PB-INV-PACKAGE-005";
const freshness: InvariantId = "PB-INV-PACKAGE-006";
const both = ["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"];
function edit(o: PackageObservation, name: string, from: string, to: string) {
  const doc = o.documents.find(d => d.fileName === name)!;
  if (!doc.content.includes(from)) throw new Error(`Sensitivity prerequisite missing: ${name}: ${from}`);
  doc.content = doc.content.replace(from, to);
}
function control(family: string, name: string, caseId: CaseId, invariantId: InvariantId, locations: string[], corrupt: NegativeControl["corrupt"]): NegativeControl {
  return { family, name, caseId, invariantId, locations, corrupt };
}

/** Corrupt observed copies only. These literals are authored separately from the contract's expected facts. */
export const NEGATIVE_CONTROLS: NegativeControl[] = [
  control("NEG-001", "remove README while claiming nineteen files", "PC-002", inventory, ["core.paths"], o => { o.documents = o.documents.filter(d => d.fileName !== "README.md"); }),
  ...([
    ["schema", "manifest.packageSchemaVersion", (o: PackageObservation) => { o.manifest.packageSchemaVersion = 2; }],
    ["identity", "manifest.activeProjectId", (o: PackageObservation) => { o.manifest.activeProjectId = "wrong-project"; }],
    ["client", "manifest.clientName", (o: PackageObservation) => { o.manifest.clientName = "Other client"; }],
    ["type", "manifest.appType", (o: PackageObservation) => { o.manifest.appType = "Business website"; }],
    ["root", "manifest.rootFolder", (o: PackageObservation) => { o.manifest.rootFolder = "wrong-root"; }],
    ["count", "manifest.generatedDocumentCount", (o: PackageObservation) => { o.manifest.generatedDocumentCount = 21; }],
    ["folder count", "manifest.folderStructure", (o: PackageObservation) => { o.manifest.folderStructure[10].expectedFileCount = 1; }],
    ["extra manifest file", "manifest.files", (o: PackageObservation) => { o.manifest.files.push({ folder: "00_Project_Overview", fileName: "EXPORT_MANIFEST.md", path: "00_Project_Overview/EXPORT_MANIFEST.md" }); }],
    ["diagnostics", "manifest.diagnosticFiles", (o: PackageObservation) => { o.manifest.diagnosticFiles = []; }],
    ["Markdown shared fact", "markdownManifest.summary", (o: PackageObservation) => { o.markdownManifest = o.markdownManifest.replace("| Package schema version | 3 |", "| Package schema version | 2 |"); }]
  ] as const).map(([name, location, mutate]) => control("NEG-002", name, "PC-002", inventory, [location], mutate)),
  ...([
    ["marker", "CLIENT_QUESTIONS.md:blocking:EC-SELECTION-CONFLICT-PAYMENT-PROVIDER", "[MISSING: EC-SELECTION-CONFLICT-PAYMENT-PROVIDER]", "[OPTIONAL: EC-SELECTION-CONFLICT-PAYMENT-PROVIDER]"],
    ["contributor", "CLIENT_QUESTIONS.md:conflict:EC-SELECTION-CONFLICT-PAYMENT-PROVIDER", "LC-PAYMENT-ALT=Stripe", "erased contributor"],
    ["source", "CLIENT_QUESTIONS.md:blocking:EC-SELECTION-CONFLICT-PAYMENT-PROVIDER", "source: ecommerceDecisions; gate: architecture", "source: unknown; gate: architecture"],
    ["gate", "CLIENT_QUESTIONS.md:blocking:EC-SELECTION-CONFLICT-CURRENCY", "source: ecommerceDecisions; gate: launch", "source: ecommerceDecisions; gate: optional"]
  ] as const).map(([name, location, from, to]) => control("NEG-003", name, "PC-004", trace, [location], o => edit(o, "CLIENT_QUESTIONS.md", from, to))),
  ...both.map(name => control("NEG-004", `${name} wrong provider`, "PC-002", verification, [`${name}:verification`], o => edit(o, name, "using the recorded Square payment integration", "using the recorded Stripe payment integration"))),
  control("NEG-005", "both artifacts agree on wrong CAD checkout", "PC-002", verification, both.map(n => `${n}:verification`), o => both.forEach(n => edit(o, n, "guest checkout flow in USD", "guest checkout flow in CAD"))),
  ...["checkout mode", "currency", "payment provider"].flatMap(choice => both.map(name => control("NEG-006", `${name} selected plus unresolved ${choice}`, "PC-002", verification, [`${name}:verification:forbidden:resolve the recorded ${choice}`], o => edit(o, name, "verify server-calculated totals.", `verify server-calculated totals; resolve the recorded ${choice}.`)))),
  ...([
    ["provider", "using the recorded Square payment integration"], ["currency", "flow in USD"], ["checkout", "recorded guest checkout flow"]
  ] as const).flatMap(([choice, winner]) => both.map(name => control("NEG-007", `${name} conflicting ${choice} winner`, "PC-004", verification, [`${name}:verification:forbidden:${winner}`], o => edit(o, name, "Test the recorded checkout flow;", `Test the recorded checkout flow; ${winner};`)))),
  control("NEG-008", "optional becomes blocking", "PC-005", trace, ["CLIENT_QUESTIONS.md:optional"], o => edit(o, "CLIENT_QUESTIONS.md", "[OPTIONAL: PC-OPTIONAL]", "[MISSING: PC-OPTIONAL]")),
  control("NEG-008", "optional falsely answered", "PC-005", trace, ["CLIENT_QUESTIONS.md:ledger:PC-OPTIONAL"], o => edit(o, "CLIENT_QUESTIONS.md", "| PC-OPTIONAL | optional | Deferred |", "| PC-OPTIONAL | optional | Answered |")),
  ...both.map(name => control("NEG-009", `${name} excluded tax becomes operative`, "PC-006", verification, [`${name}:verification:categories`], o => edit(o, name, "| EC-TEST-1 |", "| EC-TEST-99 | Tax | Test Canadian tax calculation. |\n| EC-TEST-1 |"))),
  control("NEG-009", "N/A reason erased", "PC-006", trace, ["CLIENT_QUESTIONS.md:ledger:PC-TAX"], o => edit(o, "CLIENT_QUESTIONS.md", "Fictional digital fixture excludes tax calculation.", "")),
  control("NEG-010", "tax conflict evidence erased", "PC-007", trace, ["CLIENT_QUESTIONS.md:taxConflict"], o => edit(o, "CLIENT_QUESTIONS.md", "positive evidence remains (acceptance notes:", "positive evidence remains (unknown source:")),
  ...(["cart", "route"] as const).map(kind => control("NEG-011", kind, "PC-002", configuration, [`APP_BLUEPRINT.md:storefront:${kind === "cart" ? "cart" : "routes"}`], o => edit(o, "APP_BLUEPRINT.md", kind === "cart" ? "Shared cross-context cart" : "/ | Lifecycle Test Store | synthetic downloadable templates", kind === "cart" ? "Separate carts" : "/wrong | Other store | unrelated catalog"))),
  control("NEG-012", "all summaries and both manifests share the wrong marker count", "PC-002", readiness, ["TEST_PLAN.md:readinessSummary", "ACCEPTANCE_CRITERIA.md:readinessSummary"], o => {
    for (const d of o.documents) d.content = d.content.replace("| Missing markers | 0 |", "| Missing markers | 1 |");
    o.manifest.missingInformationMarkerCount = 1;
    o.markdownManifest = o.markdownManifest.replace("| Missing information markers | 0 |", "| Missing information markers | 1 |");
  }),
  control("NEG-013", "stale current state and manifests claim Ready", "PC-008", freshness, ["current.packageReadiness", "current.manifestReadiness"], o => {
    o.readiness.status = "Ready for Codex"; o.manifest.readiness = "Ready for Codex";
    o.markdownManifest = o.markdownManifest.replace("| Package readiness | Draft |", "| Package readiness | Ready for Codex |");
  }),
  ...["README.md", "PROJECT_SCOPE.md", "CLIENT_REQUIREMENTS.md", "APP_BLUEPRINT.md"].map(name => control("NEG-014", `${name} regeneration retains obsolete purpose`, "PC-009", freshness, [`${name}:purpose`], o => edit(o, name, "Sell synthetic downloadable templates through a keyboard-first fictional storefront.", "Sell synthetic downloadable templates through one fictional storefront."))),
  control("NEG-015", "supported document missing section", "PC-002", verification, ["ACCEPTANCE_CRITERIA.md:section:## Commerce verification:count"], o => edit(o, "ACCEPTANCE_CRITERIA.md", "## Commerce verification", "## Unknown verification")),
  control("NEG-015", "supported document duplicated section", "PC-002", verification, ["ACCEPTANCE_CRITERIA.md:section:## Commerce verification:count"], o => { o.documents.find(d => d.fileName === "ACCEPTANCE_CRITERIA.md")!.content += "\n\n## Commerce verification\n\nDuplicate."; }),
  control("NEG-015", "supported table duplicated", "PC-002", verification, ["TEST_PLAN.md:table:| ID | Category | Expected result |:count"], o => edit(o, "TEST_PLAN.md", "| ID | Category | Expected result |", "| ID | Category | Expected result |\n\n| ID | Category | Expected result |"))
];
