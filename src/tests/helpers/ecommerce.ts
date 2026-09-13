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
    ecommerceStorefrontModel: "Single merchant, shared platform, multiple branded storefront contexts",
    ecommerceRoutes: "/digitaldesigns | Digital Designs | digital catalog\n/3ddesigns | 3D Designs | physical/custom catalog\n/apps | Applications | software catalog\n/petapparel | Pet Apparel | apparel catalog",
    ecommerceCartScope: "Shared cross-division cart for eligible items, explicitly approved in source requirements",
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
    assumptions: [
      "What CAD order subtotal triggers free shipping",
      "Which live shipping provider supplies rates, labels and tracking",
      "Which physical categories qualify for shipping, pickup and free shipping",
      "What Lethbridge pickup location, hours, lead time and instructions apply",
      "Is Rose & Paw GST/HST registered and which destination-province taxes apply at launch",
      "Which launch catalog, prices, SKUs, variants, weights, dimensions, inventory and images are approved",
      "How are digital products delivered, licensed, activated, updated and limited",
      "Which fixed-price services can be purchased and what information is required",
      "Which custom work needs quotes and what upload file types/sizes are allowed",
      "Who pays return shipping and are original shipping fees refundable",
      "Are unopened pet-apparel sizing returns accepted and what hygiene restrictions apply",
      "What exact final-sale exceptions apply",
      "Which transactional email provider sends store messages",
      "When should sales/support addresses supplement the current business email",
      "What exact colour HEX values, production logo files and licensed web fonts are approved",
      "What legal business name and mailing/contact details appear on receipts/policies/tax documents",
      "What accounting, order, contact, verification, quote-file and audit retention periods apply",
      "Are reviews, wish lists, discount codes and consent-based abandoned-cart recovery in launch scope",
      "Approve hosting/backend architecture before implementation",
      "Who approves releases and owns backup/recovery/payment/shipping/email/domain responsibilities"
    ].map((question,i) => `OQ-${String(i+1).padStart(2,"0")}: ${question}? Unanswered; deferred pending client decision.`).join("\n")
  });
  return p;
}
