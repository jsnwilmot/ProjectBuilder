import { DOCUMENT_LOCATIONS, PROJECT_FOLDERS } from "../../data/folderStructure";
import { getProjectTypePreset } from "../../data/projectTypes";
import { deriveReviewItems, getClientReviewReadiness } from "../../lib/clientReview";
import { markdownList, markdownTable } from "../../lib/documentHelpers";
import { visibleIntakeFields } from "../../lib/projectCapabilities";
import { websiteDeferredRequirements, websiteRequirement, websiteRequirementText, websiteCapabilitySelected } from "../../lib/websiteRequirements";
import { WEBSITE_CAPABILITY_FIELDS } from "../../lib/websiteCapabilityIntent";
import type { ProjectInputField, ProjectRecord } from "../../types/project";

type TemplateProject = ProjectRecord & {
  generationContext?: { readiness?: { status: string }; documentStatuses?: Record<string, string> };
  currentDocumentName?: string;
};
type Template = (project: TemplateProject) => string;

const contentFields: ProjectInputField[] = ["websitePages", "websiteServices", "websiteContactMethod", "contentSource", "imagesAndContent", "testimonials", "seoKeywords", "serviceArea", "googleBusinessProfile"];
const brandFields: ProjectInputField[] = ["brandStatus", "logoStatus", "logoFiles", "primaryColors", "secondaryColors", "fontPreferences", "brandTone", "imageStyle", "iconStyle", "referenceSites", "brandRestrictions", "brandingNotes", "approvedAssets", "accessibilityContrastNotes", "faviconNeeded", "openGraphImageNeeded", "socialAssetsNeeded"];
const dataFields: ProjectInputField[] = ["dataSources", "dataEntities", "dataCollections", "fields", "fieldTypes", "requiredDataFields", "keyFields", "relationships", "dataOwnership", "dataRetentionNotes", "integrations", "websiteAnalytics"];
const journeyFields: ProjectInputField[] = ["workflows", "workflowName", "workflowTrigger", "workflowSteps", "workflowInputs", "workflowOutputs", "workflowRoles", "workflowDecisionPoints", "workflowFailureHandling", "workflowOutcome", "automations", "notifications", "websiteForms"];
const securityFields: ProjectInputField[] = ["authenticationExpectation", "authorizationExpectation", "userRoles", "roleDescriptions", "rolePermissionsSummary", "internalUsers", "externalUsers", "adminUsers", "permissionRules", "permissions", "roleAccessNotes", "sensitiveDataNotes", "auditLoggingNeeds", "dataProtectionExpectations", "complianceNotes", "legalPages", "risks"];

function sections(project: ProjectRecord, fields: ProjectInputField[]): string {
  const entries = fields.filter((field) => websiteRequirement(project, field).status !== "optional");
  return entries.length ? entries.map((field) => `### ${websiteRequirement(project, field).label}\n\n${websiteRequirementText(project, field)}`).join("\n\n")
    : "No additional requirements recorded. Optional blanks do not authorize additional scope.";
}

function table(headers: string[], rows: string[][]): string {
  return markdownTable(headers, rows.map((row) => row.map((cell) => cell.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>"))));
}

function header(project: TemplateProject): string {
  return [
    `**Project:** ${websiteRequirementText(project, "appName")}`,
    `**Accountable client:** ${websiteRequirementText(project, "clientName")}`,
    `**Project type:** ${getProjectTypePreset(project.intake.appType)?.label ?? websiteRequirementText(project, "appType")}`,
    `**Document status:** ${project.generationContext?.documentStatuses?.[project.currentDocumentName ?? ""] ?? "Draft"}`,
    `**Package readiness:** ${project.generationContext?.readiness?.status ?? "Draft"}`,
    "This planning package requires the recorded client and Architect reviews before implementation."
  ].join("\n\n");
}

function deferred(project: ProjectRecord): string {
  const items = websiteDeferredRequirements(project);
  return items.length ? markdownList(items.map((item) => `${item.label}: ${websiteRequirementText(project, item.field)}`)) : "None recorded.";
}

function notApplicable(project: ProjectRecord): string {
  const states = visibleIntakeFields(project).map((field) => websiteRequirement(project, field.name)).filter((state) => state.status === "notApplicable");
  return states.length ? markdownList(states.map((state) => `${state.label}: ${state.reason}`)) : "None recorded.";
}

function reviewSummary(project: ProjectRecord): string {
  const review = getClientReviewReadiness(project);
  return `## Review actions\n\n${review.blockers.length ? markdownList(review.blockers) : "No outstanding Client Review actions."}

## Not applicable decisions

${notApplicable(project)}

## Deferred decisions and future actions

${deferred(project)}`;
}

function deployment(project: ProjectRecord): string {
  return `## Recorded deployment decisions

The Hosting status answer records hosting, source control, repository, branch and release choices together when supplied. Preserve those choices as recorded; do not invent missing repository settings or build commands.

${sections(project, ["hostingStatus", "domainStatus", "targetPlatform", "constraints"])}

## Supporting services

${sections(project, ["dataSources", "dataCollections", "authenticationExpectation", "integrations", "websiteForms", "websiteAnalytics"])}

## Build and release procedure

1. Inspect the selected repository and its existing scripts, generator configuration and lockfile. Confirm the build command and output directory from that evidence.
2. Build the website using the recorded technology and repository workflow. Validate the generated pages, assets, navigation and links in a preview environment.
3. Review domain, HTTPS, redirect and security-header settings supported by the selected host. Record the tested settings and preview URL.
4. Obtain the required release approval before publishing. Use the recorded source-control branch and deployment approach; resolve any unrecorded settings with the owner.
5. Check the live pages and assets after an approved release. Record the release identifier and a verified rollback procedure to the previous working release.

## Decisions to resolve before implementation

${deferred(project)}`;
}

interface WebsiteCheck { id: string; source: ProjectInputField; name: string; expected: string }

function checks(project: ProjectRecord): WebsiteCheck[] {
  const result: WebsiteCheck[] = [
    { id: "WEB-01", source: "websitePages", name: "Navigation and page structure", expected: "Every recorded page or section is reachable through its intended navigation; anchors and external links reach approved destinations." },
    { id: "WEB-02", source: "requiredFeatures", name: "Required visitor journeys", expected: "Exercise each required feature and verify its recorded behavior and acceptance notes." },
    { id: "WEB-03", source: "targetPlatform", name: "Responsive layout and browsers", expected: "Check small and large viewports and the browsers in the recorded target; confirm readable content and no unintended horizontal scrolling." },
    { id: "WEB-04", source: "accessibilityContrastNotes", name: "Accessibility and keyboard navigation", expected: "Check headings, labels, text contrast, visible focus, keyboard navigation, image alternatives and reduced-motion behavior where animation is used." },
    { id: "WEB-05", source: "approvedAssets", name: "Content and images", expected: "Compare rendered content and assets to the approved sources; verify image loading, dimensions, alternatives and ownership restrictions." },
    { id: "WEB-06", source: "seoKeywords", name: "SEO metadata", expected: "Verify page titles, descriptions, heading structure and search topics against the recorded SEO requirements." },
    { id: "WEB-07", source: "hostingStatus", name: "Build, performance and deployment", expected: "Run the repository's actual build and checks, inspect page and asset loading, and validate the selected host's preview, HTTPS and release configuration." },
    { id: "WEB-08", source: "sensitiveDataNotes", name: "Website security", expected: "Confirm no secrets are shipped to the browser; test safe external links and the agreed data-handling and host security settings." },
    { id: "WEB-09", source: "successCriteria", name: "Owner acceptance", expected: "Demonstrate each recorded success criterion and acceptance note to the accountable client." }
  ];
  for (const [field, name, expected] of [
    ["websiteForms", "Requested forms", "Verify the recorded fields, validation, recipient, success and failure behavior. Use only the approved processing service."],
    ["integrations", "Requested integrations", "Verify each approved external system, link or integration, including its failure behavior and access constraints."],
    ["websiteAnalytics", "Approved analytics", "Verify only the approved platform and events run, with the recorded consent and privacy requirements."],
    ["dataCollections", "Requested application data", "Verify the recorded entities, fields, keys, ownership and retention rules."],
    ["dataEntities", "Requested data entities", "Verify the recorded entities and their required field and key definitions."],
    ["authenticationExpectation", "Requested access controls", "Verify the recorded sign-in, authorization and role boundaries."],
    ["reportsDashboards", "Requested reports", "Verify each recorded report's data, audience and expected result."]
  ] as const) {
    if (websiteCapabilitySelected(project, field)) result.push({ id: `WEB-${result.length + 1}`, source: field, name, expected });
  }
  return result;
}

const scope = (project: ProjectRecord) => sections(project, ["appPurpose", "problemStatement", "targetUsers", "requiredFeatures", "featureDescription", "featurePriority", "featureOwner", "acceptanceNotes", "reportsDashboards", "outOfScope", "constraints", "assumptions", "successCriteria"]);

const phases: Array<{ name: string; objective: string; files: string; fields: ProjectInputField[]; test: string }> = [
  { name: "Project setup", objective: "Review the approved architecture, repository and deferred decisions; establish the recorded website toolchain.", files: "Existing repository configuration, build scripts and setup documentation; identify actual paths before editing.", fields: ["targetPlatform", "hostingStatus", "constraints"], test: "Run the repository's baseline checks and record the actual results." },
  { name: "Brand and global structure", objective: "Implement the approved typography, colours, assets and shared page structure.", files: "Website layout, global styles and approved asset files using the selected generator's conventions.", fields: brandFields, test: "Compare the layout and assets with the approved brand sources and check text contrast." },
  { name: "Header and navigation", objective: "Implement the navigation for the recorded pages or sections and approved external destinations.", files: "Header, navigation and shared layout source files.", fields: ["websitePages", "screens"], test: "Test anchors, links, keyboard focus and navigation at small and large viewports." },
  { name: "Content and service sections", objective: "Implement the approved content and visitor journeys. Resolve contact decisions before implementing contact behavior.", files: "Page or section templates, content files and the approved image assets.", fields: contentFields, test: "Check every required section against approved copy, assets, links and feature acceptance notes." },
  { name: "Responsive behavior and accessibility", objective: "Validate the website's layouts and interactions across the recorded devices and accessibility requirements.", files: "Relevant styles, layout components and accessibility fixes.", fields: ["targetPlatform", "accessibilityNotes", "accessibilityContrastNotes"], test: "Check keyboard use, focus, landmarks, image alternatives, contrast and narrow-screen layout." },
  { name: "SEO, performance and security", objective: "Implement the recorded search and security requirements and verify efficient page and asset loading.", files: "Page metadata, asset/build configuration and security settings supported by the selected host.", fields: ["seoKeywords", "legalPages", "sensitiveDataNotes", "risks"], test: "Verify metadata, asset sizes, HTTPS, safe links and the agreed security configuration." },
  { name: "Testing and deployment readiness", objective: "Run the client TEST_PLAN, demonstrate acceptance and prepare the approved release process.", files: "Website tests, deployment configuration and release/rollback documentation supported by the actual repository.", fields: ["acceptanceNotes", "successCriteria", "hostingStatus", "domainStatus"], test: "Record actual test results, preview verification, unresolved decisions and release approval requirements." }
];

function phasedPrompts(project: ProjectRecord): string {
  const applicable = WEBSITE_CAPABILITY_FIELDS.filter((field) => websiteCapabilitySelected(project, field));
  const selectedPhases = [...phases];
  if (applicable.length) selectedPhases.splice(4, 0, {
    name: "Requested website services", objective: "Implement only the services explicitly recorded in intake, using their approved architecture and data boundaries.",
    files: "The website files and service configuration needed for the recorded capabilities; confirm actual paths first.",
    fields: [...applicable], test: "Exercise each requested service's success, failure, access and data-handling behavior."
  });
  return selectedPhases.map((phase, index) => `## Phase ${index + 1}: ${phase.name}

### Objective

${phase.objective}

### Source requirements

${sections(project, phase.fields)}

### Files to create or update

${phase.files}

### Scope boundaries and missing decision rule

Follow the approved scope and actual repository conventions. Resolve blocking requirements and before-implementation deferrals before beginning dependent work. Ask the Architect about unrecorded decisions; do not invent business content, accounts or services.

### Acceptance criteria

The phase meets its source requirements and the applicable criteria in ACCEPTANCE_CRITERIA.md, with no unapproved scope added.

### Testing instructions

${phase.test}

### Reporting instructions

Report the files changed, requirements satisfied, actual checks and results, remaining decisions and the next authorized step. Publishing requires separate release approval.`).join("\n\n");
}

const bodies: Record<string, { title: string; render: Template }> = {
  "README.md": { title: "Project Overview", render: (p) => `## Purpose\n\n${websiteRequirementText(p, "appPurpose")}\n\n## Package contents\n\n${markdownList(DOCUMENT_LOCATIONS.map((doc) => `${doc.folder}/${doc.fileName}`))}\n\n## Folder structure\n\n${markdownList([...PROJECT_FOLDERS])}\n\n${reviewSummary(p)}` },
  "PROJECT_SCOPE.md": { title: "Project Scope", render: (p) => `${scope(p)}\n\n## Website content\n\n${sections(p, contentFields)}\n\n${reviewSummary(p)}` },
  "CLIENT_REQUIREMENTS.md": { title: "Client Requirements", render: (p) => `${scope(p)}\n\n## Content and structure\n\n${sections(p, contentFields)}\n\n## Data and requested integrations\n\n${sections(p, dataFields)}\n\n## Journeys and requested forms\n\n${sections(p, journeyFields)}\n\n## Security and accessibility\n\n${sections(p, [...securityFields, "accessibilityNotes"])}\n\n${deployment(p)}\n\n${reviewSummary(p)}` },
  "APP_BLUEPRINT.md": { title: "Website Blueprint", render: (p) => `## Purpose and boundaries\n\n${scope(p)}\n\n## Architecture decisions\n\n${sections(p, ["targetPlatform", "hostingStatus", "domainStatus", "dataSources", "authenticationExpectation"])}\n\n## Page and section structure\n\n${sections(p, ["websitePages", "screens"])}\n\n## Content, services and assets\n\n${sections(p, [...contentFields, "approvedAssets", "websiteForms", "integrations", "websiteAnalytics"])}\n\n${reviewSummary(p)}` },
  "DATA_MODEL.md": { title: "Data Model", render: (p) => `## Applicability\n\n${websiteCapabilitySelected(p, "dataCollections") || websiteCapabilitySelected(p, "dataEntities") ? "Application data is requested. Implement the recorded entities and their required field and key definitions." : "No application database or persistent business data model is requested in the data-entity answers. Static content and assets do not require invented tables or record-save workflows."}\n\n## Recorded data and integration decisions\n\n${sections(p, dataFields)}` },
  "SCREEN_MAP.md": { title: "Pages and Section Map", render: (p) => `## Website structure\n\n${sections(p, ["websitePages", "screens"])}\n\nA single page may use named sections as navigation targets. Implement the recorded structure and destinations.\n\n## Content and visitor journeys\n\n${sections(p, [...contentFields, "requiredFeatures", "featureDescription", "workflows"])}\n\n## Responsive and accessible navigation\n\n${sections(p, ["targetPlatform", "accessibilityNotes", "accessibilityContrastNotes"])}\n\nCheck links, anchors, keyboard focus and readable layouts against the client TEST_PLAN.` },
  "WORKFLOW_MAP.md": { title: "Visitor Journeys and Workflows", render: (p) => `## Applicability\n\nWebsite navigation may be the entire visitor journey. Application workflows, notifications and form processing require explicit scope.\n\n## Recorded journeys\n\n${sections(p, ["websitePages", "requiredFeatures", "featureDescription", ...journeyFields, "websiteContactMethod"])}\n\n## Future decisions\n\n${deferred(p)}` },
  "SECURITY_MODEL.md": { title: "Website Security", render: (p) => `## Recorded security and access decisions\n\n${sections(p, securityFields)}\n\n## Website implementation safeguards\n\nUse HTTPS, keep secrets out of browser code, review dependencies, and use safe external links. Review CSP and other security headers supported by the selected host against the actual asset and integration needs. Apply the recorded data-handling rules. Authentication, application roles and audit storage are implemented only when requested.\n\n## Requested external services\n\n${sections(p, ["websiteForms", "integrations", "websiteAnalytics"])}\n\n## Hosting constraints\n\n${sections(p, ["hostingStatus", "constraints"])}` },
  "BRAND_GUIDE.md": { title: "Brand Guide", render: (p) => `## Approved brand and assets\n\n${sections(p, brandFields)}\n\n## Content ownership\n\n${sections(p, ["contentSource", "imagesAndContent"])}\n\nUse recorded assets and restrictions. Optional supporting assets require an explicit scope decision before creating additional deliverables.` },
  "TEST_PLAN.md": { title: "Website Test Plan", render: (p) => `## Test scope\n\nValidate ${p.identity.projectName}'s visitor experience against the recorded requirements and actual repository workflow.\n\n${table(["ID", "Category", "Intake source", "Expected result"], checks(p).map((check) => [check.id, check.name, websiteRequirement(p, check.source).label, check.expected]))}\n\n## Required feature and acceptance evidence\n\n${sections(p, ["requiredFeatures", "featureDescription", "acceptanceNotes", "successCriteria"])}\n\n## Execution record\n\nRecord the tested revision, browser/device, viewport, steps, expected and actual result, and evidence for each applicable check. Obtain owner review of unresolved failures.\n\n## Deferred test dependencies\n\n${deferred(p)}` },
  "ACCEPTANCE_CRITERIA.md": { title: "Website Acceptance Criteria", render: (p) => `## Recorded success conditions\n\n${sections(p, ["successCriteria", "acceptanceNotes", "requiredFeatures", "featureDescription"])}\n\n## Verification criteria\n\n${table(["ID", "Criterion", "Intake requirement", "Verification"], checks(p).map((check) => [check.id, check.name, websiteRequirement(p, check.source).label, check.expected]))}\n\n## Owner review\n\nDemonstrate the recorded visitor journeys and success conditions. Record approval and unresolved issues before release.\n\n## Deferred decisions\n\n${deferred(p)}` },
  "DEPLOYMENT_NOTES.md": { title: "Website Deployment Notes", render: deployment },
  "ARCHITECT_INSTRUCTIONS.md": { title: "Architect Instructions", render: (p) => `## Role and authority\n\nGPT Architect reviews the client's website scope, architecture and acceptance criteria. Codex Developer implements only approved work. The accountable client approves business decisions.\n\n## Review process\n\nReview the website requirements, page/section map, assets, deployment answers and open decisions. Confirm the recorded technology and existing repository conventions. Approve a bounded implementation sequence with evidence for each phase.\n\n## Architecture and scope\n\n${sections(p, ["targetPlatform", "hostingStatus", "domainStatus", "constraints", "outOfScope", "requiredFeatures", "websitePages"])}\n\n## Blocked assumptions\n\nDo not invent contact information, assets, services, credentials or infrastructure. Optional blanks are not approved scope. Preserve not-applicable decisions. Resolve before-implementation deferrals before authorizing dependent work.\n\n${reviewSummary(p)}` },
  "CODEX_INSTRUCTIONS.md": { title: "Codex Instructions", render: (p) => `## Role and authority\n\nCodex Developer implements the Architect-approved website requirements for the accountable client. Read the repository instructions and inspect existing work first.\n\n## Technology and deployment answers\n\n${sections(p, ["targetPlatform", "hostingStatus", "domainStatus", "constraints"])}\n\n## Website implementation standards\n\nUse the recorded pages or sections, approved assets and content. Implement accessible navigation and responsive layouts. Validate SEO, performance, links and architecture-appropriate security. Add forms, analytics, data persistence or integrations only when the intake requests them.\n\n## Missing decision rule\n\nResolve required missing information and blocking deferrals with the owner and Architect before implementation. Record optional future actions without inventing answers.\n\n## Scope boundary rule\n\n${sections(p, ["requiredFeatures", "outOfScope"])}\n\n## Testing and reporting\n\nUse this website's TEST_PLAN and ACCEPTANCE_CRITERIA. Determine commands from the actual repository; report exact results and changed files. Obtain release approval before publishing.\n\n${reviewSummary(p)}` },
  "PHASED_CODEX_PROMPTS.md": { title: "Phased Website Implementation Prompts", render: (p) => `${reviewSummary(p)}\n\n${phasedPrompts(p)}` },
  "CLIENT_QUESTIONS.md": { title: "Client Questions", render: (p) => {
    const questions = deriveReviewItems(p).filter((item) => item.status === "Needs answer");
    return `## Questions grouped for client review\n\n${questions.length ? markdownList(questions.map((item) => `${item.section} — ${item.label}: ${item.recommendedQuestion}`)) : "No unanswered intake questions."}\n\n${reviewSummary(p)}`;
  } },
  "HANDOFF_CHECKLIST.md": { title: "Handoff Checklist", render: (p) => `## Readiness checklist\n\n${table(["Check", "Status", "Required action"], getClientReviewReadiness(p).checklist.filter((item) => item.id !== "powerPlatformGatesConfirmed").map((item) => [item.label, item.passed ? "Complete" : "Review required", item.passed ? "Recorded" : item.reason]))}\n\n## Package review\n\nReview all ${DOCUMENT_LOCATIONS.length} standard documents, their source decisions and export integrity. Document review does not authorize a production release.\n\n${reviewSummary(p)}` },
  "NEXT_STEPS.md": { title: "Next Steps", render: (p) => `## Next authorized actions\n\nReview the draft website package, resolve genuine requirements and before-implementation decisions, and complete the client and Architect review gates. Then follow PHASED_CODEX_PROMPTS.md for the approved website scope.\n\n${reviewSummary(p)}` },
  "CHANGE_LOG.md": { title: "Change Log", render: (p) => `## Package generation\n\nGenerated ${DOCUMENT_LOCATIONS.length} standard planning documents from the saved website intake and review decisions. Generation date: ${(p.packageGeneratedAt ?? p.updatedAt).slice(0, 10)}.\n\nThis entry records planning output, not implemented website features or a production deployment. Record subsequent approved scope changes, implementation results and releases here.\n\n${reviewSummary(p)}` }
};

export const websiteDocumentTemplates: Record<string, Template> = Object.fromEntries(
  Object.entries(bodies).map(([fileName, { title, render }]) => [fileName, (project: TemplateProject) => `# ${title}\n\n${header(project)}\n\n${render(project)}`])
);
