import { createBusinessWebsite, withWebsiteReviews } from "./businessWebsite";

/** Deterministic equivalent of the Rose & Paw Draft 1 intake; no customer data. */
export function createEcommerceFixture() {
  const p = withWebsiteReviews(createBusinessWebsite());
  p.identity.projectName = "Rose & Paw Ecommerce";
  p.client.clientName = "Rose & Paw";
  p.client.businessName = "Rose & Paw";
  p.intake.appType = "ecommerceSite";
  Object.assign(p.intake, {
    appPurpose: "Single merchant, shared platform, multiple branded storefront contexts.",
    targetPlatform: "Responsive web browsers on desktop, tablet and mobile",
    problemStatement: "Division sites need shared commerce operations and branded shopping contexts.",
    constraints: "All four divisions and selling models at launch; CAD; Canada-wide shipping; no invented production settings.",
    outOfScope: "Outside sellers, customer accounts in release 1, native apps, cryptocurrency, Stripe, replacement division websites",
    screens: "/digitaldesigns; /3ddesigns; /apps; /petapparel; shared cart; guest checkout; verified order status; administration",
    accessibilityNotes: "WCAG 2.2 AA; keyboard and screen readers",
    reportsDashboards: "Sales, division performance, inventory, fulfillment, quotes, tax, reconciliation, returns, security",
    websitePages: "/digitaldesigns; /3ddesigns; /apps; /petapparel; cart; guest checkout; order lookup; admin",
    hostingStatus: "Deferred OQ-19: hosting and backend architecture require approval before implementation.",
    requiredFeatures: "Physical products; digital delivery/software; fixed-price services; custom quotes/uploads; shared cross-division cart; Square CAD checkout; Canadian tax; live shipping; configurable pickup/free shipping; inventory; guest lookup; returns/refunds; role-based administration.",
    featureDescription: "Preserve branded contexts. Square signed webhooks, idempotent orders and reconciliation. Guest lookup requires order number, email and expiring email verification.",
    workflows: "Guest cart -> checkout -> Square payment -> order -> fulfillment; quotes -> approval -> payment; return -> refund",
    workflowTrigger: "Guest checkout or quote/return request",
    workflowSteps: "Validate cart; verify payment; create order idempotently; fulfill; notify",
    workflowOutcome: "One verified order with correct inventory and controlled delivery",
    userRoles: "Guest; administrator; fulfillment",
    rolePermissionsSummary: "Guest verified order only; admin MFA; fulfillment assigned orders only",
    permissionRules: "Deny by default; authorize server-side",
    dataEntities: "Division; Product; Order; OrderItem; Payment; QuoteRequest; NotificationRoute",
    dataCollections: "Products; Orders; Payments; Quotes",
    fields: "UUID; unique SKU; CAD integer minor units; normalized email; immutable order-item policy snapshots",
    keyFields: "UUID; SKU; non-guessable order number",
    integrations: "Square; transactional email; live carrier; Canadian tax; consent-aware analytics",
    authenticationExpectation: "Guest checkout; administrator MFA",
    acceptanceNotes: "Verify mixed-division cart, Square CAD checkout, stock, tax, shipping, pickup, guest verification, final-sale rules and WCAG 2.2 AA.",
    successCriteria: "Four branded routes transact through the shared platform with secure guest checkout.",
    assumptions: Array.from({ length: 20 }, (_, i) => `OQ-${String(i + 1).padStart(2, "0")}: ${i === 18 ? "Approve hosting/backend architecture before implementation" : `Confirm production decision ${i + 1}`}? Unanswered; deferred pending client decision.`).join("\n")
  });
  return p;
}
