import type { ProjectInputField } from "../../types/project";

/** Approved addendum literals. Fictional configuration is test data, never approval. */
export const A = "00000000-0000-4000-8000-000000000001";
export const B = "00000000-0000-4000-8000-000000000002";
export const M = "00000000-0000-4000-8000-000000000099";
export const T = [
  "2026-10-17T12:00:00.000Z", "2026-10-17T12:01:00.000Z", "2026-10-17T12:02:00.000Z",
  "2026-10-17T12:03:00.000Z", "2026-10-17T12:04:00.000Z", "2026-10-17T12:05:00.000Z",
  "2026-10-17T12:06:00.000Z", "2026-10-17T12:07:00.000Z", "2026-10-17T12:08:00.000Z",
  "2026-10-17T12:09:00.000Z", "2026-10-17T12:10:00.000Z", "2026-10-17T12:11:00.000Z",
  "2026-10-17T12:12:00.000Z", "2026-10-17T12:13:00.000Z", "2026-10-17T12:14:00.000Z",
  "2026-10-17T12:15:00.000Z", "2026-10-17T12:16:00.000Z", "2026-10-17T12:17:00.000Z"
] as const;

export const I = {
  identity: { id: A, projectName: "Lifecycle Test Store" },
  client: { clientName: "Synthetic Fixture Owner", businessName: "Lifecycle Test Store" },
  intake: { appType: "ecommerceSite" }
} as const;

export const C = {
  appPurpose: "Sell synthetic downloadable templates through one fictional storefront.",
  problemStatement: "The fixture needs a deterministic catalog-to-order journey.",
  targetPlatform: "Desktop and mobile browsers on loopback only",
  audienceVisibility: "Public-facing",
  targetUsers: "Synthetic shoppers; synthetic store operator",
  userRoles: "Guest; administrator",
  rolePermissionsSummary: "Guests purchase and view only their verified orders; administrators manage catalog and orders.",
  accessibilityNotes: "WCAG 2.2 AA; keyboard operation and screen-reader labels",
  requiredFeatures: "Catalog; shared cart; guest checkout; Square sandbox payments in USD; digital delivery; verified guest order lookup; administrator MFA.",
  featureDescription: "One synthetic downloadable template; payment verified server-side; expiring signed delivery links.",
  acceptanceNotes: "Guest purchases template SKU SYN-001 for USD 10.00 using Square sandbox; repeated webhook creates one order; verified guest sees only that order.",
  reportsDashboards: "Administrator order reconciliation report",
  screens: "Catalog; cart; guest checkout; verified order lookup; administrator",
  dataCollections: "Products; Orders; OrderItems; Payments",
  fields: "Product.id UUID; Product.sku unique; Product.price integer USD cents; Order.id UUID; Order.email normalized; Payment.eventId unique",
  keyFields: "Product.id; Product.sku; Order.id; Payment.eventId",
  integrations: "Square sandbox adapter; in-process synthetic email sink",
  workflows: "Guest cart -> Square sandbox payment -> verified order -> signed digital delivery",
  workflowTrigger: "Guest submits cart for checkout",
  workflowSteps: "Validate SKU and price; verify signed payment event; create order idempotently; issue expiring download link.",
  workflowOutcome: "Exactly one paid order and authorized download for the verified shopper.",
  permissionRules: "Deny by default; authorize orders and administration server-side.",
  sensitiveDataNotes: "Synthetic email only; payment tokens only; exclude card data and secret values.",
  authenticationExpectation: "Guest checkout; administrator MFA; order number plus email verification for guest order lookup.",
  risks: "Duplicate payment events mitigated by unique event IDs and idempotent order creation.",
  assumptions: "All people, assets, orders and configuration in this fixture are fictional test inputs.",
  constraints: "USD only; sandbox only; no external network calls or real payments.",
  outOfScope: "Physical shipping, local pickup, custom quotes, marketplace sellers and production deployment.",
  successCriteria: "The synthetic guest journey produces one USD 10.00 paid order with protected digital delivery.",
  brandStatus: "Established synthetic test brand",
  logoStatus: "Synthetic text wordmark supplied",
  primaryColors: "Ink #111111; white #FFFFFF",
  fontPreferences: "System sans-serif",
  brandTone: "Clear and factual",
  imageStyle: "Synthetic geometric template previews",
  contentSource: "Fictional fixture author supplies test catalog and copy.",
  approvedAssets: "Synthetic text wordmark and generated geometric preview; test-only assets.",
  accessibilityContrastNotes: "Ink #111111 on white #FFFFFF; visible keyboard focus",
  websitePages: "Catalog; cart; guest checkout; verified order lookup; administrator; privacy; terms",
  seoKeywords: "Synthetic downloadable templates",
  hostingStatus: "Node.js HTTP service on loopback in an isolated test process.",
  domainStatus: "localhost; loopback only",
  ecommerceStorefrontModel: "Unified storefront",
  ecommerceCartScope: "Shared cross-context cart",
  ecommerceRoutes: "/ | Lifecycle Test Store | synthetic downloadable templates",
  ecommerceDecisions: [
    "LC-PAYMENT | architecture | Answered | Which payment provider? | Fictional fixture decision | Square",
    "LC-CURRENCY | launch | Answered | Which checkout currency? | Fictional fixture decision | USD",
    "LC-CHECKOUT | architecture | Answered | Which checkout mode? | Fictional fixture decision | Guest checkout"
  ].join("\n"),
  ecommerceArchitecture: "Approved: runtime=Node.js 24; backend=Node HTTP service with synthetic payment adapter; database=in-memory synthetic catalog and orders; integrations=Square sandbox adapter and in-process email sink; repository=fictional lifecycle-store repository",
  ecommerceDeployment: "Approved: environments=isolated loopback development and test; source control=fictional lifecycle-store main branch; CI=node --test test/store.test.mjs; build=node --check src/store.mjs; deployment=start loopback process with node src/store.mjs; DNS=localhost loopback; secrets=TEST_PAYMENT_TOKEN secret name with synthetic value injected at runtime; migrations=reset in-memory schema per run; integrations=in-process payment and email adapters; observability=redacted test event log owned by fixture operator; backup=serialize synthetic memory snapshot; restore=load synthetic snapshot into new process; rollback=restart prior synthetic revision; smoke=GET catalog and exercise synthetic checkout; responsibilities=fixture operator owns test execution and cleanup",
  ecommercePhases: JSON.stringify([{
    objective: "Exercise the fictional sandbox store contract",
    prerequisites: "Synthetic catalog and in-process adapters initialized",
    files: "src/store.mjs; test/store.test.mjs in the fictional lifecycle-store repository",
    contracts: "SKU SYN-001 costs 1000 USD cents; signed payment event creates one order",
    security: "Server-side authorization; administrator MFA; secret values excluded from output",
    accessibility: "WCAG 2.2 AA keyboard and label checks",
    testCommands: "node --check src/store.mjs; node --test test/store.test.mjs",
    acceptanceCriteria: "One verified order; idempotent payment; protected digital download",
    evidence: "Synthetic event log and fictional-store test result",
    stopConditions: "Stop on unauthorized access, duplicate order or external network request"
  }])
} as const satisfies Partial<Record<ProjectInputField, string>>;

// The approved addendum's literal is keyboard-first, not the earlier probe's wording.
export const E = { appPurpose: "Sell synthetic downloadable templates through a keyboard-first fictional storefront." } as const;
export const R = { appPurpose: "Sell synthetic downloadable templates through one fictional storefront." } as const;

/** Independently enumerated; do not import the production document registry. */
export const DOCUMENT_PATHS = [
  "00_Project_Overview/README.md", "00_Project_Overview/PROJECT_SCOPE.md",
  "00_Project_Overview/NEXT_STEPS.md", "00_Project_Overview/CHANGE_LOG.md",
  "00_Project_Overview/HANDOFF_CHECKLIST.md", "01_Requirements/CLIENT_REQUIREMENTS.md",
  "01_Requirements/CLIENT_QUESTIONS.md", "01_Requirements/ACCEPTANCE_CRITERIA.md",
  "02_Architecture/ARCHITECT_INSTRUCTIONS.md", "02_Architecture/APP_BLUEPRINT.md",
  "03_Data_Model/DATA_MODEL.md", "04_UI_UX/SCREEN_MAP.md", "04_UI_UX/BRAND_GUIDE.md",
  "05_Workflows/WORKFLOW_MAP.md", "06_Security/SECURITY_MODEL.md",
  "07_Development/CODEX_INSTRUCTIONS.md", "08_Testing/TEST_PLAN.md",
  "09_Deployment/DEPLOYMENT_NOTES.md", "11_Codex_Prompts/PHASED_CODEX_PROMPTS.md"
] as const;

export const CHECKLIST_IDS = [
  "projectTypeConfirmed", "scopeReviewed", "requiredGapsResolved", "brandingConfirmed",
  "screensConfirmed", "dataModelConfirmed", "workflowsConfirmed", "securityConfirmed",
  "acceptanceCriteriaReviewed", "clientQuestionsResolved", "draftPackageReviewed", "codexInstructionsReady"
] as const;
