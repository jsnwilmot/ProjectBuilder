/** Literal, independently authored source projections. No template imports. */
export const STOREFRONT_FILES = ["PROJECT_SCOPE.md", "CLIENT_REQUIREMENTS.md", "APP_BLUEPRINT.md", "DATA_MODEL.md", "SCREEN_MAP.md", "WORKFLOW_MAP.md", "ACCEPTANCE_CRITERIA.md", "DEPLOYMENT_NOTES.md", "PHASED_CODEX_PROMPTS.md"];
export const ARCHITECTURE = "Approved: runtime=Node.js 24; backend=Node HTTP service with synthetic payment adapter; database=in-memory synthetic catalog and orders; integrations=Square sandbox adapter and in-process email sink; repository=fictional lifecycle-store repository";
export const DEPLOYMENT = "Approved: environments=isolated loopback development and test; source control=fictional lifecycle-store main branch; CI=node --test test/store.test.mjs; build=node --check src/store.mjs; deployment=start loopback process with node src/store.mjs; DNS=localhost loopback; secrets=TEST_PAYMENT_TOKEN secret name with synthetic value injected at runtime; migrations=reset in-memory schema per run; integrations=in-process payment and email adapters; observability=redacted test event log owned by fixture operator; backup=serialize synthetic memory snapshot; restore=load synthetic snapshot into new process; rollback=restart prior synthetic revision; smoke=GET catalog and exercise synthetic checkout; responsibilities=fixture operator owns test execution and cleanup";
export const PHASE = {
  objective: "Exercise the fictional sandbox store contract", prerequisites: "Synthetic catalog and in-process adapters initialized",
  files: "src/store.mjs; test/store.test.mjs in the fictional lifecycle-store repository",
  contracts: "SKU SYN-001 costs 1000 USD cents; signed payment event creates one order",
  security: "Server-side authorization; administrator MFA; secret values excluded from output",
  accessibility: "WCAG 2.2 AA keyboard and label checks", testCommands: "node --check src/store.mjs; node --test test/store.test.mjs",
  acceptanceCriteria: "One verified order; idempotent payment; protected digital download", evidence: "Synthetic event log and fictional-store test result",
  stopConditions: "Stop on unauthorized access, duplicate order or external network request"
};
export const HOSTING = "Node.js HTTP service on loopback in an isolated test process.";
export const PLATFORM = "Desktop and mobile browsers on loopback only";
export const DOMAIN = "localhost; loopback only";
export const FEATURES = "Catalog; shared cart; guest checkout; Square sandbox payments in USD; digital delivery; verified guest order lookup; administrator MFA.";
export const FEATURE_DESCRIPTION = "One synthetic downloadable template; payment verified server-side; expiring signed delivery links.";
export const AUTHENTICATION = "Guest checkout; administrator MFA; order number plus email verification for guest order lookup.";
export const CONSTRAINTS = "USD only; sandbox only; no external network calls or real payments.";
export const OUT_OF_SCOPE = "Physical shipping, local pickup, custom quotes, marketplace sellers and production deployment.";
export const PAGES = "Catalog; cart; guest checkout; verified order lookup; administrator; privacy; terms";
export const DEPENDENCIES = [
  "resolve the recorded checkout mode before mode-specific checkout verification",
  "resolve the recorded currency before currency-specific totals and payment verification",
  "resolve the recorded payment provider before provider-specific webhook and refund verification"
];
export const UNRESOLVED_PREFIXES = ["resolve the recorded checkout mode", "resolve the recorded currency", "resolve the recorded payment provider"];
export const CATEGORIES = ["Catalog/storefront", "Cart", "Checkout/payment", "Webhooks/idempotency/reconciliation", "Digital delivery", "Order lookup", "Roles", "Accessibility", "Security", "Performance", "Backup/restore", "Smoke testing"];
export const SELECTED = ["Test the recorded guest checkout flow in USD using the recorded Square payment integration", "Verify signatures and event authenticity using the recorded Square integration"];
export const CONFLICT_FORBIDDEN = [
  "using the recorded Square payment integration", "using the recorded Stripe payment integration",
  "using the recorded Square integration; replay", "using the recorded Stripe integration; replay",
  "flow in USD", "flow in CAD", "recorded guest checkout flow", "recorded authenticated checkout flow"
];
