import type { ProjectRecord } from "../types/project";

export interface EcommerceTestRequirement {
  category: string;
  expectedResult: string;
}

type EcommerceSourceField = keyof ProjectRecord["intake"];

const SOURCE_FIELDS: Array<[EcommerceSourceField, string]> = [
  ["requiredFeatures", "required features"],
  ["featureDescription", "feature description"],
  ["workflows", "workflows"],
  ["workflowTrigger", "workflow trigger"],
  ["workflowSteps", "workflow steps"],
  ["screens", "screens"],
  ["websitePages", "pages"],
  ["dataEntities", "data entities"],
  ["dataCollections", "data collections"],
  ["fields", "fields"],
  ["integrations", "integrations"],
  ["rolePermissionsSummary", "role permissions"],
  ["authenticationExpectation", "authentication"],
  ["permissionRules", "permission rules"],
  ["constraints", "constraints"],
  ["acceptanceNotes", "acceptance notes"],
  ["successCriteria", "success criteria"],
  ["outOfScope", "out of scope"],
  ["accessibilityNotes", "accessibility"],
  ["ecommerceStorefrontModel", "storefront model"],
  ["ecommerceRoutes", "storefront routes"],
  ["ecommerceCartScope", "cart scope"]
];

const UNRESOLVED = /\b(?:unresolved|unknown|pending|undecided|unconfirmed|TBD|to be determined|awaiting (?:decision|approval|confirmation)|needs? (?:decision|approval|confirmation))\b/i;

interface SourceFragment {
  field: EcommerceSourceField;
  label: string;
  text: string;
}

function sourceFragments(project: ProjectRecord): SourceFragment[] {
  return SOURCE_FIELDS.flatMap(([field, label]) => String(project.intake[field] ?? "")
    .split(/\r?\n|;\s*/)
    .map(text => text.trim())
    .filter(Boolean)
    .map(text => ({ field, label, text })));
}

function matching(project: ProjectRecord, pattern: RegExp): SourceFragment[] {
  return sourceFragments(project).filter(fragment => pattern.test(fragment.text));
}

function isNegative(fragment: SourceFragment, subject: string): boolean {
  if (fragment.field === "outOfScope") return true;
  const escaped = subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\b)(?:no|without|exclude(?:d)?|outside(?: the)? scope|out of scope)\\b[^.;\\n]{0,60}\\b${escaped}\\b|\\b${escaped}\\b[^.;\\n]{0,40}\\bnot (?:approved|required|supported|in scope)\\b`, "i").test(fragment.text);
}

function evidence(project: ProjectRecord, pattern: RegExp, subject: string): SourceFragment[] {
  const matches = matching(project, pattern);
  return matches.filter(fragment => !isNegative(fragment, subject) && !UNRESOLVED.test(fragment.text));
}

function describeEvidence(fragments: SourceFragment[]): string {
  return fragments.slice(0, 5).map(fragment => `${fragment.label}: ${fragment.text}`).join("; ");
}

function firstMatch(project: ProjectRecord, pattern: RegExp): string {
  for (const { field, text } of sourceFragments(project)) {
    if (field === "outOfScope") continue;
    if (UNRESOLVED.test(text)) continue;
    const match = text.match(pattern);
    if (match) return match[1] ?? match[0];
  }
  return "";
}

function mentionedButUnresolved(project: ProjectRecord, pattern: RegExp): boolean {
  return matching(project, pattern).some(fragment => UNRESOLVED.test(fragment.text));
}

/** Build verification only from universal commerce invariants and recorded intake evidence. */
export function ecommerceTestRequirements(project: ProjectRecord): EcommerceTestRequirement[] {
  const checkoutMode = firstMatch(project, /\b(guest checkout|authenticated customer checkout|authenticated checkout|account checkout|mixed checkout)\b/i).toLocaleLowerCase();
  const currency = firstMatch(project, /\b(CAD|USD|EUR|GBP|AUD|NZD|JPY|CNY|INR|CHF|SEK|NOK|DKK|MXN|BRL)\b/);
  const paymentProvider = firstMatch(project, /\b([A-Z][A-Za-z0-9&.-]+)\s+(?:payments?|webhooks?)\b/);
  const tax = evidence(project, /\btax(?:es|ation)?\b|\bGST\b|\bHST\b|\bVAT\b/i, "tax");
  const shipping = evidence(project, /\bshipping\b|\bcarrier\b/i, "shipping");
  const pickup = evidence(project, /\bpickup\b|\bpick-up\b/i, "pickup");
  const inventory = evidence(project, /\binventory\b|\bstock\b/i, "inventory");
  const digital = evidence(project, /\bdigital\b|\bsoftware\b|\bdownload\b|\bentitlement\b/i, "digital");
  const quotes = evidence(project, /\bquotes?\b|\buploads?\b|\bcustom work\b/i, "quote");
  const lookup = evidence(project, /\border lookup\b|\border status\b|\bguest lookup\b/i, "lookup");
  const returns = evidence(project, /\breturns?\b|\brefunds?\b|\bfinal[- ]sale\b/i, "return");
  const roles = evidence(project, /\broles?\b|\badmin(?:istrator)?\b|\bpermissions?\b|\bprivileged\b/i, "role");
  const mfa = firstMatch(project, /\b(admin(?:istrator)? MFA)\b/i);
  const accessibilityTarget = String(project.intake.accessibilityNotes ?? "").trim();
  const dependencies: string[] = [];

  if (!checkoutMode) dependencies.push("resolve the recorded checkout mode before mode-specific checkout verification");
  if (!currency) dependencies.push("resolve the recorded currency before currency-specific totals and payment verification");
  if (!paymentProvider) dependencies.push("resolve the recorded payment provider before provider-specific webhook and refund verification");
  if (!tax.length && mentionedButUnresolved(project, /\btax(?:es|ation)?\b|\bjurisdiction\b|\bGST\b|\bHST\b|\bVAT\b/i)) dependencies.push("resolve the recorded tax jurisdiction and model before tax verification");
  if (!shipping.length && mentionedButUnresolved(project, /\bshipping\b|\bcarrier\b/i)) dependencies.push("resolve the recorded shipping model before shipping verification");
  if (!returns.length && mentionedButUnresolved(project, /\breturns?\b|\brefunds?\b/i)) dependencies.push("resolve the recorded return and refund policy before policy verification");

  const rows: EcommerceTestRequirement[] = [
    {
      category: "Catalog/storefront",
      expectedResult: "Verify every configured route resolves to its recorded brand/theme and catalog context; preserve merchant and item attribution, and hide unpublished items."
    },
    {
      category: "Cart",
      expectedResult: "Add, change and remove eligible items; enforce the recorded shared or separate cart scope and calculate totals using the approved server-side pricing contract."
    },
    {
      category: "Checkout/payment",
      expectedResult: `Test the recorded ${checkoutMode || "checkout"} flow${currency ? ` in ${currency}` : ""}${paymentProvider ? ` using the recorded ${paymentProvider} payment integration` : ""}; exercise approved success and failure outcomes, keep payment secrets out of client and log output, and verify server-calculated totals.`
    }
  ];

  if (dependencies.length) rows.push({
    category: "Scope dependencies",
    expectedResult: `${dependencies.join("; ")}. Do not treat an unresolved business choice as a passing result.`
  });
  if (paymentProvider || matching(project, /\bwebhooks?\b|\bidempoten/i).some(fragment => !UNRESOLVED.test(fragment.text))) rows.push({
    category: "Webhooks/idempotency/reconciliation",
    expectedResult: `Verify signatures and event authenticity using the recorded ${paymentProvider ? `${paymentProvider} integration` : "provider contract"}; replay valid events without duplicate charges or orders, and reconcile delayed, reordered and failed events with provider records.`
  });
  if (tax.length) rows.push({ category: "Tax", expectedResult: `Test the recorded tax scope (${describeEvidence(tax)}), including approved categories, jurisdiction rules and rounding; unresolved tax decisions block release.` });
  if (shipping.length) rows.push({ category: "Shipping", expectedResult: `Test the recorded shipping scope (${describeEvidence(shipping)}), including applicable rate failures, address validation, eligibility and approved thresholds.` });
  if (pickup.length) rows.push({ category: "Pickup", expectedResult: `Test only the recorded pickup scope (${describeEvidence(pickup)}); show approved locations, timing and instructions only for eligible carts.` });
  if (inventory.length) rows.push({ category: "Inventory", expectedResult: `Test the recorded inventory scope (${describeEvidence(inventory)}), including concurrent availability changes and approved order, cancellation and refund adjustments; prevent overselling.` });
  if (digital.length) rows.push({ category: "Digital delivery", expectedResult: `Test the recorded digital-product scope (${describeEvidence(digital)}); create authorized delivery or entitlements only after verified payment and prevent cross-order access.` });
  if (quotes.length) rows.push({ category: "Quotes/uploads", expectedResult: `Test the recorded quote or upload scope (${describeEvidence(quotes)}); enforce approved file restrictions and authorization through review, approval, payment and delivery.` });
  if (lookup.length) rows.push({ category: "Order lookup", expectedResult: `Test the recorded order-access scope (${describeEvidence(lookup)}); use non-enumerating responses, rate limits and order-scoped authorization with the recorded verification method.` });
  if (returns.length) rows.push({ category: "Refunds/returns", expectedResult: `Test the recorded return and refund policy (${describeEvidence(returns)}), including eligibility, item policy snapshots, approved exceptions, provider failures and inventory/order reconciliation.` });
  if (roles.length) rows.push({ category: "Roles", expectedResult: `Test the recorded role and permission scope (${describeEvidence(roles)})${mfa ? `, including ${mfa}` : ""}; enforce server-side authorization for privileged operations and prevent credential, role or unauthorized export access.` });

  rows.push(
    { category: "Accessibility", expectedResult: `Test keyboard, focus, screen readers, labels and errors, contrast and reduced motion across configured commerce journeys${accessibilityTarget ? ` against the recorded target (${accessibilityTarget})` : " after the accessibility target is recorded"}.` },
    { category: "Security", expectedResult: "Verify CSRF, XSS, injection and SSRF controls; isolate secrets, authenticate signed requests, secure privileged sessions, rate-limit sensitive operations and mask logs." },
    { category: "Performance", expectedResult: "Measure configured storefront and transaction paths on recorded devices; agree budgets before acceptance and report actual measurements without invented thresholds." },
    { category: "Backup/restore", expectedResult: "Restore an isolated backup and reconcile applicable orders, inventory and digital access; record evidence against the approved recovery objectives." },
    { category: "Smoke testing", expectedResult: "After an approved deployment, verify configured routes, catalog, cart, checkout, applicable integrations, notifications, health and rollback using approved test data." }
  );
  return rows;
}
