import type {
  IntakeFieldDefinition,
  IntakeModuleId,
  ProjectInputField,
  ProjectType,
  ProjectTypePreset
} from "../types/project";

const CORE_MODULES = [
  "foundation",
  "users",
  "features",
  "data",
  "workflows",
  "security"
] as const satisfies readonly IntakeModuleId[];

export const PROJECT_TYPE_PRESETS: readonly ProjectTypePreset[] = [
  {
    value: "Static website",
    label: "Static website",
    description: "A focused informational site with mostly fixed content.",
    recommendedTargetPlatforms: ["Desktop web", "Mobile web"],
    requiredIntakeModules: [...CORE_MODULES, "website", "branding"],
    optionalIntakeModules: [],
    brandingRequirementLevel: "required",
    suggestedGeneratedDocumentNotes: ["Prioritize page structure, content readiness, SEO, accessibility, hosting, and launch assets."]
  },
  {
    value: "Business website",
    label: "Business website",
    description: "A public-facing company or service website designed to generate trust and enquiries.",
    recommendedTargetPlatforms: ["Desktop web", "Mobile web"],
    requiredIntakeModules: [...CORE_MODULES, "website", "branding"],
    optionalIntakeModules: [],
    brandingRequirementLevel: "required",
    suggestedGeneratedDocumentNotes: ["Connect services, service area, conversion paths, local search, trust signals, and brand assets."]
  },
  {
    value: "Web application",
    label: "Web application",
    description: "An interactive browser-based product for internal or public users.",
    recommendedTargetPlatforms: ["Desktop web", "Responsive web"],
    requiredIntakeModules: CORE_MODULES,
    optionalIntakeModules: ["branding"],
    brandingRequirementLevel: "conditional",
    suggestedGeneratedDocumentNotes: ["Clarify whether the product is internal or public-facing before finalizing branding and deployment guidance."]
  },
  {
    value: "Mobile app",
    label: "Mobile app",
    description: "A mobile product intended for both iOS and Android unless narrowed later.",
    recommendedTargetPlatforms: ["iOS", "Android"],
    requiredIntakeModules: [...CORE_MODULES, "mobile", "branding"],
    optionalIntakeModules: [],
    brandingRequirementLevel: "required",
    suggestedGeneratedDocumentNotes: ["Cover mobile permissions, offline behavior, sync, notifications, privacy, and store submission."]
  },
  {
    value: "Android app",
    label: "Android app",
    description: "A native or cross-platform app targeted specifically to Android.",
    recommendedTargetPlatforms: ["Android phones", "Android tablets"],
    requiredIntakeModules: [...CORE_MODULES, "mobile", "branding"],
    optionalIntakeModules: [],
    brandingRequirementLevel: "required",
    suggestedGeneratedDocumentNotes: ["Include Android device coverage, permissions, Play Store assets, privacy, and release requirements."]
  },
  {
    value: "iOS app",
    label: "iOS app",
    description: "A native or cross-platform app targeted specifically to Apple mobile devices.",
    recommendedTargetPlatforms: ["iPhone", "iPad"],
    requiredIntakeModules: [...CORE_MODULES, "mobile", "branding"],
    optionalIntakeModules: [],
    brandingRequirementLevel: "required",
    suggestedGeneratedDocumentNotes: ["Include Apple device coverage, permissions, App Store assets, privacy, and review requirements."]
  },
  {
    value: "Game",
    label: "Game",
    description: "An interactive game project with gameplay, art, audio, controls, and release needs.",
    recommendedTargetPlatforms: ["Web", "Desktop", "Mobile", "Console"],
    requiredIntakeModules: [...CORE_MODULES, "game", "branding"],
    optionalIntakeModules: [],
    brandingRequirementLevel: "required",
    suggestedGeneratedDocumentNotes: ["Treat the gameplay loop, controls, progression, content pipeline, performance, art, audio, and release target as first-class requirements."]
  },
  {
    value: "Dashboard or reporting project",
    label: "Dashboard or reporting project",
    description: "A decision-support product centered on metrics, filters, refreshes, and exports.",
    recommendedTargetPlatforms: ["Desktop web", "Large display"],
    requiredIntakeModules: [...CORE_MODULES, "dashboard"],
    optionalIntakeModules: ["branding"],
    brandingRequirementLevel: "optional",
    suggestedGeneratedDocumentNotes: ["Define KPI calculations, source ownership, refresh behavior, audience, permissions, and export expectations."]
  },
  {
    value: "Power Apps or Microsoft 365 app",
    label: "Power Apps or Microsoft 365 app",
    description: "An internal Microsoft 365 solution using Power Platform or related services.",
    recommendedTargetPlatforms: ["Power Apps", "Microsoft Teams", "SharePoint"],
    requiredIntakeModules: [...CORE_MODULES, "microsoft365"],
    optionalIntakeModules: ["branding", "automation", "dashboard"],
    brandingRequirementLevel: "optional",
    suggestedGeneratedDocumentNotes: ["Call out environments, connectors, data stores, DLP, licensing assumptions, permissions, flows, and reporting."]
  },
  {
    value: "Automation or workflow tool",
    label: "Automation or workflow tool",
    description: "A system that moves work between triggers, approvals, systems, and notifications.",
    recommendedTargetPlatforms: ["Cloud workflow", "Desktop automation", "Server process"],
    requiredIntakeModules: [...CORE_MODULES, "automation"],
    optionalIntakeModules: ["branding"],
    brandingRequirementLevel: "optional",
    suggestedGeneratedDocumentNotes: ["Make triggers, ordered steps, approvals, retries, logging, failure recovery, and notification ownership explicit."]
  },
  {
    value: "API or backend service",
    label: "API or backend service",
    description: "A service contract consumed by other applications or integrations.",
    recommendedTargetPlatforms: ["HTTPS API", "Cloud service", "Internal network"],
    requiredIntakeModules: [...CORE_MODULES, "api"],
    optionalIntakeModules: ["branding"],
    brandingRequirementLevel: "optional",
    suggestedGeneratedDocumentNotes: ["Define endpoints, consumers, data contracts, authentication expectations, errors, observability, and versioning."]
  },
  {
    value: "E-commerce site",
    label: "E-commerce site",
    description: "A public website supporting product discovery and online transactions.",
    recommendedTargetPlatforms: ["Desktop web", "Mobile web"],
    requiredIntakeModules: [...CORE_MODULES, "website", "branding"],
    optionalIntakeModules: [],
    brandingRequirementLevel: "required",
    suggestedGeneratedDocumentNotes: ["Include catalog structure, conversion flows, trust content, legal pages, transaction boundaries, brand assets, and operational ownership."]
  },
  {
    value: "AI assistant or chatbot",
    label: "AI assistant or chatbot",
    description: "A conversational assistant for internal teams or public users.",
    recommendedTargetPlatforms: ["Web", "Mobile", "Embedded chat"],
    requiredIntakeModules: CORE_MODULES,
    optionalIntakeModules: ["branding"],
    brandingRequirementLevel: "conditional",
    suggestedGeneratedDocumentNotes: ["State audience visibility, conversation boundaries, data handling, human escalation, tone, safety, and approved integrations."]
  },
  {
    value: "Desktop software",
    label: "Desktop software",
    description: "Installed software for Windows, macOS, or Linux.",
    recommendedTargetPlatforms: ["Windows", "macOS", "Linux"],
    requiredIntakeModules: CORE_MODULES,
    optionalIntakeModules: ["branding"],
    brandingRequirementLevel: "conditional",
    suggestedGeneratedDocumentNotes: ["Clarify operating systems, installation, updates, local storage, permissions, and whether the product is public-facing."]
  },
  {
    value: "Other digital project",
    label: "Other digital project",
    description: "A digital product that does not fit the listed presets.",
    recommendedTargetPlatforms: ["Unknown yet"],
    requiredIntakeModules: CORE_MODULES,
    optionalIntakeModules: ["branding"],
    brandingRequirementLevel: "conditional",
    suggestedGeneratedDocumentNotes: ["Document why the standard presets do not fit and resolve platform, audience, branding, and delivery assumptions explicitly."]
  }
];

export const PROJECT_TYPE_VALUES = PROJECT_TYPE_PRESETS.map((preset) => preset.value);

const presetMap = new Map<ProjectType, ProjectTypePreset>(
  PROJECT_TYPE_PRESETS.map((preset) => [preset.value, preset])
);

export const AUDIENCE_VISIBILITY_OPTIONS = [
  "Public-facing",
  "Internal",
  "Mixed internal and public",
  "Unknown yet",
  "Not applicable"
] as const;

export const BRANDING_FIELDS = [
  "brandStatus",
  "logoStatus",
  "logoFiles",
  "primaryColors",
  "secondaryColors",
  "fontPreferences",
  "brandTone",
  "imageStyle",
  "iconStyle",
  "referenceSites",
  "brandRestrictions",
  "faviconNeeded",
  "openGraphImageNeeded",
  "socialAssetsNeeded",
  "contentSource",
  "approvedAssets",
  "accessibilityContrastNotes"
] as const;

export const BRANDING_REQUIRED_FIELDS = [
  "brandStatus",
  "logoStatus",
  "primaryColors",
  "fontPreferences",
  "brandTone",
  "imageStyle",
  "contentSource",
  "approvedAssets",
  "accessibilityContrastNotes"
] as const;

const MODULE_REQUIRED_FIELDS: Partial<Record<IntakeModuleId, readonly ProjectInputField[]>> = {
  website: ["websitePages", "seoKeywords", "contentSource"],
  game: ["gameGenre", "gameTargetDevices", "gameplayLoop", "gameControls", "gameArtStyle"],
  dashboard: ["dashboardDataSources", "dashboardKpis", "dashboardRefreshFrequency", "dashboardAudience"],
  automation: [
    "automationTrigger",
    "automationSteps",
    "sourceSystem",
    "targetSystem",
    "automationErrorHandling",
    "notificationRules"
  ],
  api: ["apiEndpoints", "dataContracts", "apiConsumers"]
};

export const PROJECT_MODULE_FIELDS: Record<
  Exclude<IntakeModuleId, "foundation" | "users" | "features" | "data" | "workflows" | "security">,
  readonly (IntakeFieldDefinition & { stageId: "foundation" | "users" | "features" | "data" | "workflows" | "security" })[]
> = {
  branding: [
    { stageId: "features", name: "brandStatus", label: "Brand status", description: "State whether an approved brand already exists.", placeholder: "Established / partial / new brand needed / unknown yet" },
    { stageId: "features", name: "logoStatus", label: "Logo status", description: "State whether an approved, usable logo exists.", placeholder: "Approved / revision needed / new logo needed / not applicable" },
    { stageId: "features", name: "logoFiles", label: "Logo files", description: "List approved logo file names or locations. Do not upload secrets or private links.", placeholder: "logo-primary.svg; logo-mark.png", multiline: true },
    { stageId: "features", name: "primaryColors", label: "Primary colours", description: "List approved primary colours with values when known.", placeholder: "Navy #123456; white #FFFFFF", multiline: true },
    { stageId: "features", name: "secondaryColors", label: "Secondary colours", description: "List supporting colours and intended use.", placeholder: "Colour - value - use", multiline: true },
    { stageId: "features", name: "fontPreferences", label: "Font preferences", description: "List approved fonts or style preferences.", placeholder: "Heading font; body font; fallback requirements" },
    { stageId: "features", name: "brandTone", label: "Brand tone", description: "Describe the voice users should experience.", placeholder: "Clear, calm, practical, local" },
    { stageId: "features", name: "imageStyle", label: "Image style", description: "Describe photography, illustration, or screenshot direction.", placeholder: "Authentic local photography; no generic stock imagery", multiline: true },
    { stageId: "features", name: "iconStyle", label: "Icon style", description: "Describe the preferred icon treatment.", placeholder: "Outlined, simple, high contrast" },
    { stageId: "features", name: "referenceSites", label: "Reference sites", description: "List useful visual references and what to borrow or avoid.", placeholder: "URL - useful pattern", multiline: true },
    { stageId: "features", name: "brandRestrictions", label: "Brand restrictions", description: "List prohibited colours, treatments, words, or imagery.", placeholder: "Restriction - reason", multiline: true },
    { stageId: "features", name: "faviconNeeded", label: "Favicon needed", description: "State whether a favicon is required or already supplied.", placeholder: "Needed / supplied / not applicable" },
    { stageId: "features", name: "openGraphImageNeeded", label: "Open Graph image needed", description: "State whether a social sharing image is required.", placeholder: "Needed / supplied / not applicable" },
    { stageId: "features", name: "socialAssetsNeeded", label: "Social assets needed", description: "List required social or promotional asset sizes.", placeholder: "Platform - asset", multiline: true },
    { stageId: "features", name: "contentSource", label: "Content source", description: "Identify who supplies and approves copy, images, and product content.", placeholder: "Client provides approved copy by date; team supplies photography", multiline: true },
    { stageId: "features", name: "approvedAssets", label: "Approved assets", description: "List assets already approved for use.", placeholder: "Asset - owner - status", multiline: true },
    { stageId: "features", name: "accessibilityContrastNotes", label: "Accessibility contrast notes", description: "Record contrast constraints, known failures, and required checks.", placeholder: "Approved combinations and combinations to avoid", multiline: true }
  ],
  website: [
    { stageId: "features", name: "websitePages", label: "Website pages", description: "List required pages and their purpose.", placeholder: "Home - overview\nServices - service details\nContact - enquiry path", multiline: true },
    { stageId: "features", name: "websiteServices", label: "Services or products", description: "List services or product categories the site must explain.", placeholder: "Service - audience - outcome", multiline: true },
    { stageId: "features", name: "websiteContactMethod", label: "Contact method", description: "Define the primary conversion or contact path.", placeholder: "Phone, email, booking link, or contact form" },
    { stageId: "foundation", name: "domainStatus", label: "Domain status", description: "State whether a domain is owned, selected, or undecided.", placeholder: "Owned / needs purchase / unknown yet" },
    { stageId: "foundation", name: "hostingStatus", label: "Hosting status", description: "State whether hosting is selected or still a decision.", placeholder: "Selected / needs recommendation / unknown yet" },
    { stageId: "features", name: "seoKeywords", label: "SEO notes and keywords", description: "List priority services, locations, topics, and search intent.", placeholder: "Topic or phrase - target page", multiline: true },
    { stageId: "users", name: "serviceArea", label: "Service area", description: "Describe geographic service boundaries.", placeholder: "City, region, province, or remote service" },
    { stageId: "features", name: "googleBusinessProfile", label: "Google Business Profile", description: "State profile ownership and update needs.", placeholder: "Claimed / needs setup / not applicable / unknown yet" },
    { stageId: "features", name: "testimonials", label: "Testimonials", description: "List approved testimonials or the collection plan.", placeholder: "Approved / needed / not applicable", multiline: true },
    { stageId: "features", name: "websiteForms", label: "Website forms", description: "List forms, fields, recipients, and success behavior.", placeholder: "Form - fields - recipient - confirmation", multiline: true },
    { stageId: "data", name: "websiteAnalytics", label: "Website analytics", description: "State whether analytics is approved and what must be measured.", placeholder: "Not approved / platform - events - owner", multiline: true },
    { stageId: "security", name: "legalPages", label: "Legal pages", description: "List privacy, terms, accessibility, cookie, or other required pages.", placeholder: "Page - content owner - status", multiline: true },
    { stageId: "features", name: "imagesAndContent", label: "Images and content", description: "Describe content readiness, ownership, and gaps.", placeholder: "Content type - source - approval status", multiline: true }
  ],
  game: [
    { stageId: "foundation", name: "gameGenre", label: "Game genre", description: "Define the primary genre and subgenre.", placeholder: "Puzzle platformer; turn-based strategy" },
    { stageId: "foundation", name: "gameTargetDevices", label: "Target devices", description: "List required devices and input environments.", placeholder: "Desktop browser; Android phone; gamepad" },
    { stageId: "foundation", name: "gameEngine", label: "Game engine", description: "State the approved or candidate engine.", placeholder: "Phaser / Unity / Godot / unknown yet" },
    { stageId: "workflows", name: "gameplayLoop", label: "Gameplay loop", description: "Describe the repeated player actions and reward cycle.", placeholder: "Explore -> collect -> upgrade -> unlock", multiline: true },
    { stageId: "features", name: "gameControls", label: "Controls", description: "Define required inputs and remapping needs.", placeholder: "Keyboard, pointer, touch, controller", multiline: true },
    { stageId: "features", name: "gameLevels", label: "Levels or progression", description: "Describe level structure and progression.", placeholder: "Level count, difficulty curve, unlock model", multiline: true },
    { stageId: "features", name: "gameScoring", label: "Scoring", description: "Describe scoring, ranking, or win conditions.", placeholder: "Score sources, multipliers, leaderboards", multiline: true },
    { stageId: "features", name: "gameCharacters", label: "Characters", description: "List player, non-player, and enemy character needs.", placeholder: "Character - role - abilities", multiline: true },
    { stageId: "features", name: "gameArtStyle", label: "Art style", description: "Describe the approved visual direction.", placeholder: "2D pixel art; low-poly 3D; hand-painted", multiline: true },
    { stageId: "features", name: "gameAudio", label: "Audio", description: "List music, effects, voice, and accessibility needs.", placeholder: "Audio category - source - requirement", multiline: true },
    { stageId: "features", name: "gameMonetization", label: "Monetization", description: "State the approved business model.", placeholder: "Paid / free / ads / in-app purchases / none" },
    { stageId: "foundation", name: "gameStoreReleaseNeeds", label: "Store release needs", description: "List stores, ratings, assets, and release constraints.", placeholder: "Store - required assets - review needs", multiline: true }
  ],
  mobile: [
    { stageId: "foundation", name: "mobilePlatforms", label: "Mobile platforms", description: "Select iOS, Android, or both and note minimum versions.", placeholder: "iOS and Android; minimum versions" },
    { stageId: "features", name: "offlineSupport", label: "Offline support", description: "Describe behavior without a network connection.", placeholder: "Required / not required / unknown yet - behavior", multiline: true },
    { stageId: "features", name: "pushNotifications", label: "Push notifications", description: "List approved notification triggers and controls.", placeholder: "Trigger - recipient - opt-out behavior", multiline: true },
    { stageId: "security", name: "devicePermissions", label: "Device permissions", description: "List required device capabilities and why each is needed.", placeholder: "Camera - scan receipt; location - nearby services", multiline: true },
    { stageId: "security", name: "accountSystem", label: "Account system", description: "State account, sign-in, guest, and recovery expectations.", placeholder: "Guest only / account required / unknown yet", multiline: true },
    { stageId: "foundation", name: "appStoreRequirements", label: "App store requirements", description: "List store assets, listings, ratings, and release ownership.", placeholder: "Store - owner - asset/status", multiline: true },
    { stageId: "data", name: "dataSync", label: "Data sync", description: "Describe local/remote sync, conflicts, and refresh behavior.", placeholder: "Data - direction - frequency - conflict rule", multiline: true },
    { stageId: "security", name: "privacyRequirements", label: "Mobile privacy requirements", description: "List privacy disclosures, consent, tracking, and deletion expectations.", placeholder: "Requirement - owner - acceptance rule", multiline: true }
  ],
  dashboard: [
    { stageId: "data", name: "dashboardDataSources", label: "Dashboard data sources", description: "List source systems, owners, and access methods.", placeholder: "Source - owner - refresh method", multiline: true },
    { stageId: "features", name: "dashboardKpis", label: "KPIs", description: "Define each KPI, calculation, unit, and decision supported.", placeholder: "KPI - formula - unit - owner", multiline: true },
    { stageId: "data", name: "dashboardRefreshFrequency", label: "Refresh frequency", description: "State required freshness and refresh schedule.", placeholder: "Real-time / hourly / daily / monthly" },
    { stageId: "features", name: "dashboardFilters", label: "Filters", description: "List dimensions users need to filter.", placeholder: "Date, region, team, status", multiline: true },
    { stageId: "features", name: "drillThrough", label: "Drill-through", description: "Describe detail navigation from summary metrics.", placeholder: "Summary -> record detail", multiline: true },
    { stageId: "security", name: "dashboardPermissions", label: "Dashboard permissions", description: "Define row, metric, and export access.", placeholder: "Role - allowed data/actions", multiline: true },
    { stageId: "features", name: "dashboardExportNeeds", label: "Dashboard export needs", description: "List required download and sharing formats.", placeholder: "CSV / Excel / PDF / image / none" },
    { stageId: "users", name: "dashboardAudience", label: "Dashboard audience", description: "Identify decision-makers and operational users.", placeholder: "Audience - decisions - frequency", multiline: true }
  ],
  microsoft365: [
    { stageId: "data", name: "sharePointLists", label: "SharePoint lists", description: "List existing or proposed lists and owners.", placeholder: "List - purpose - owner", multiline: true },
    { stageId: "data", name: "dataverseUse", label: "Dataverse use", description: "State whether Dataverse is approved and what it stores.", placeholder: "Approved / not available / unknown yet - details", multiline: true },
    { stageId: "workflows", name: "powerAutomateFlows", label: "Power Automate flows", description: "List triggers, actions, approvals, and owners.", placeholder: "Flow - trigger - outcome - owner", multiline: true },
    { stageId: "features", name: "powerBiReports", label: "Power BI reports", description: "List required reports, audiences, and workspaces.", placeholder: "Report - audience - workspace", multiline: true },
    { stageId: "data", name: "m365Connectors", label: "Connectors", description: "List standard or premium connectors and licensing assumptions.", placeholder: "Connector - standard/premium - owner", multiline: true },
    { stageId: "foundation", name: "m365Environment", label: "Microsoft 365 environment", description: "Identify tenant and development/test/production environments.", placeholder: "Tenant - environment - owner", multiline: true },
    { stageId: "security", name: "dlpRestrictions", label: "DLP restrictions", description: "Record data loss prevention policies affecting connectors.", placeholder: "Policy - affected connector/data", multiline: true },
    { stageId: "security", name: "m365Permissions", label: "Microsoft 365 permissions", description: "Define groups, roles, sharing, and ownership.", placeholder: "Group/role - access", multiline: true }
  ],
  automation: [
    { stageId: "workflows", name: "automationTrigger", label: "Automation trigger", description: "Define the event or schedule that starts the automation.", placeholder: "Event, condition, or schedule", multiline: true },
    { stageId: "workflows", name: "automationSteps", label: "Automation steps", description: "List the ordered actions the automation performs.", placeholder: "1. Read source\n2. Validate\n3. Update target", multiline: true },
    { stageId: "data", name: "sourceSystem", label: "Source system", description: "Identify where the automation reads events or data.", placeholder: "System - owner - access method" },
    { stageId: "data", name: "targetSystem", label: "Target system", description: "Identify where the automation writes or sends results.", placeholder: "System - owner - access method" },
    { stageId: "workflows", name: "approvalSteps", label: "Approval steps", description: "Describe approvals, approvers, deadlines, and escalation.", placeholder: "Approval - role - timeout - escalation", multiline: true },
    { stageId: "workflows", name: "automationErrorHandling", label: "Failure handling", description: "Define expected handling for validation, connectivity, and write failures.", placeholder: "Failure - handling - owner", multiline: true },
    { stageId: "workflows", name: "retryLogic", label: "Retry logic", description: "State retry limits, delays, and non-retryable failures.", placeholder: "Failure - attempts - delay", multiline: true },
    { stageId: "security", name: "automationLogs", label: "Automation logs", description: "Define logged events, retention, and access.", placeholder: "Event - retention - audience", multiline: true },
    { stageId: "workflows", name: "notificationRules", label: "Notification rules", description: "State who is notified for success, delay, failure, and approval.", placeholder: "Condition - recipient - channel", multiline: true }
  ],
  api: [
    { stageId: "features", name: "apiEndpoints", label: "API endpoints", description: "List endpoint purpose, method, and version expectations.", placeholder: "METHOD /path - purpose - consumer", multiline: true },
    { stageId: "data", name: "dataContracts", label: "Data contracts", description: "Describe request, response, error, and compatibility rules.", placeholder: "Contract - fields - validation - errors", multiline: true },
    { stageId: "security", name: "apiAuthentication", label: "API authentication expectation", description: "State the expected caller authentication and authorization model.", placeholder: "API key / OAuth / service identity / none / unknown yet", multiline: true },
    { stageId: "users", name: "apiConsumers", label: "API consumers", description: "List systems, teams, or external clients that consume the service.", placeholder: "Consumer - use case - owner", multiline: true }
  ]
};

export function isProjectType(value: string): value is ProjectType {
  return presetMap.has(value as ProjectType);
}

export function getProjectTypePreset(value: string): ProjectTypePreset | null {
  return isProjectType(value) ? presetMap.get(value) ?? null : null;
}

export function isBrandingRequired(projectType: string, audienceVisibility: string): boolean {
  const preset = getProjectTypePreset(projectType);
  if (!preset) return false;
  if (preset.brandingRequirementLevel === "required") return true;
  if (preset.brandingRequirementLevel === "optional") return false;
  return audienceVisibility === "Public-facing" || audienceVisibility === "Mixed internal and public";
}

export function getActiveSpecializedModules(
  projectType: string,
  audienceVisibility: string
): Array<keyof typeof PROJECT_MODULE_FIELDS> {
  const preset = getProjectTypePreset(projectType);
  if (!preset) return [];
  const modules = [...preset.requiredIntakeModules, ...preset.optionalIntakeModules]
    .filter((module): module is keyof typeof PROJECT_MODULE_FIELDS => module in PROJECT_MODULE_FIELDS);
  if (isBrandingRequired(projectType, audienceVisibility) && !modules.includes("branding")) {
    modules.push("branding");
  }
  return [...new Set(modules)];
}

export function getProjectTypeFields(
  projectType: string,
  audienceVisibility: string,
  stageId: string
): IntakeFieldDefinition[] {
  const requiredFields = new Set(getProjectTypeRequiredFields(projectType, audienceVisibility));
  return getActiveSpecializedModules(projectType, audienceVisibility)
    .flatMap((module) => PROJECT_MODULE_FIELDS[module])
    .filter((field) => field.stageId === stageId)
    .map(({ stageId: _stageId, ...field }) => ({
      ...field,
      required: requiredFields.has(field.name)
    }));
}

export function getProjectTypeRequiredFields(
  projectType: string,
  audienceVisibility: string
): ProjectInputField[] {
  const preset = getProjectTypePreset(projectType);
  if (!preset) return [];
  const fields = preset.requiredIntakeModules.flatMap((module) => MODULE_REQUIRED_FIELDS[module] ?? []);
  if (isBrandingRequired(projectType, audienceVisibility)) fields.push(...BRANDING_REQUIRED_FIELDS);
  if (preset.brandingRequirementLevel === "conditional" && !audienceVisibility.trim()) {
    fields.push("audienceVisibility");
  }
  return [...new Set(fields)];
}
