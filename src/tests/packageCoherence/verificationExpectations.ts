import type { CaseId } from "./types";

/** Independently authored complete row expectations for the approved synthetic C.
 * No production imports, observed-document snapshots, parsers or source-to-text builders.
 * Shared literals abbreviate identical approved facts; the two case variants are explicit. */
const standard = {
  "Catalog/storefront": "Verify every configured route resolves to its recorded brand/theme and catalog context; preserve merchant and item attribution, and hide unpublished items.",
  "Cart": "Add, change and remove eligible items; enforce the recorded shared or separate cart scope and calculate totals using the approved server-side pricing contract.",
  "Checkout/payment": "Test the recorded guest checkout flow in USD using the recorded Square payment integration; exercise approved success and failure outcomes, keep payment secrets out of client and log output, and verify server-calculated totals.",
  "Webhooks/idempotency/reconciliation": "Verify signatures and event authenticity using the recorded Square integration; replay valid events without duplicate charges or orders, and reconcile delayed, reordered and failed events with provider records.",
  "Digital delivery": "Test the recorded digital-product scope (required features: digital delivery; workflows: Guest cart -> Square sandbox payment -> verified order -> signed digital delivery; workflow steps: issue expiring download link.; success criteria: The synthetic guest journey produces one USD 10.00 paid order with protected digital delivery.); create authorized delivery or entitlements only after verified payment and prevent cross-order access.",
  "Order lookup": "Test the recorded order-access scope (required features: verified guest order lookup; screens: verified order lookup; pages: verified order lookup; authentication: order number plus email verification for guest order lookup.); use non-enumerating responses, rate limits and order-scoped authorization with the recorded verification method.",
  "Roles": "Test the recorded role and permission scope (required features: administrator MFA.; screens: administrator; pages: administrator; role permissions: administrators manage catalog and orders.; authentication: administrator MFA), including administrator MFA; enforce server-side authorization for privileged operations and prevent credential, role or unauthorized export access.",
  "Accessibility": "Test keyboard, focus, screen readers, labels and errors, contrast and reduced motion across configured commerce journeys against the recorded target (WCAG 2.2 AA; keyboard operation and screen-reader labels).",
  "Security": "Verify CSRF, XSS, injection and SSRF controls; isolate secrets, authenticate signed requests, secure privileged sessions, rate-limit sensitive operations and mask logs.",
  "Performance": "Measure configured storefront and transaction paths on recorded devices; agree budgets before acceptance and report actual measurements without invented thresholds.",
  "Backup/restore": "Restore an isolated backup and reconcile applicable orders, inventory and digital access; record evidence against the approved recovery objectives.",
  "Smoke testing": "After an approved deployment, verify configured routes, catalog, cart, checkout, applicable integrations, notifications, health and rollback using approved test data."
} as const;

const missingSteps = {
  ...standard,
  "Digital delivery": "Test the recorded digital-product scope (required features: digital delivery; workflows: Guest cart -> Square sandbox payment -> verified order -> signed digital delivery; success criteria: The synthetic guest journey produces one USD 10.00 paid order with protected digital delivery.); create authorized delivery or entitlements only after verified payment and prevent cross-order access."
};

const conflictingChoices = {
  ...standard,
  "Checkout/payment": "Test the recorded checkout flow; exercise approved success and failure outcomes, keep payment secrets out of client and log output, and verify server-calculated totals.",
  "Webhooks/idempotency/reconciliation": "Verify signatures and event authenticity using the recorded provider contract; replay valid events without duplicate charges or orders, and reconcile delayed, reordered and failed events with provider records.",
  "Scope dependencies": "resolve the recorded checkout mode before mode-specific checkout verification; resolve the recorded currency before currency-specific totals and payment verification; resolve the recorded payment provider before provider-specific webhook and refund verification. Do not treat an unresolved business choice as a passing result."
};

/** All nine applicability choices are literal; tax/optional/source-evidence cases
 * do not add operative verification categories or silently alter their instructions. */
export const VERIFICATION_RESULTS: Readonly<Record<CaseId, Readonly<Record<string, string>>>> = {
  "PC-001": standard,
  "PC-002": standard,
  "PC-003": missingSteps,
  "PC-004": conflictingChoices,
  "PC-005": standard,
  "PC-006": standard,
  "PC-007": standard,
  "PC-008": standard,
  "PC-009": standard
};
