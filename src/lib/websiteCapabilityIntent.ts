/** Only these fields opt a website into additional implementation work.
 * dataSources describes content provenance; it never activates a service.
 */
export const WEBSITE_CAPABILITY_FIELDS = [
  "websiteForms", "integrations", "websiteAnalytics", "dataCollections",
  "dataEntities", "authenticationExpectation", "reportsDashboards"
] as const;
export type WebsiteCapabilityField = typeof WEBSITE_CAPABILITY_FIELDS[number];

const dataSubjects = "(?:(?:persistent|application|business|user)\\s+)*(?:databases?(?:\\s+entities)?|data(?:\\s+(?:collections?|models?|entities))?|records?|collections?|entities|persistence)";
const subjects: Record<WebsiteCapabilityField, string> = {
  websiteForms: "(?:(?:contact|booking|enquiry|inquiry|registration|signup|sign-up)\\s+)?forms?",
  integrations: "(?:(?:third[- ]party|external|data[- ]exchange)\\s+)?(?:integrations?|apis?|saas|processors?)",
  websiteAnalytics: "(?:(?:marketing|website|web)\\s+)?(?:analytics|tracking)(?:\\s+platforms?)?",
  dataCollections: dataSubjects,
  dataEntities: dataSubjects,
  authenticationExpectation: "(?:authentication|authenticated users|login|log[- ]in|sign[- ]in|(?:user|customer)\\s+accounts?|access[- ]control(?:\\s+systems?)?)",
  reportsDashboards: "(?:reports?|dashboards?|reporting|(?:service\\s+)?summar(?:y|ies))"
};

// A small, field-scoped compatibility grammar, not a general prose classifier.
// Match the capability itself as the negated subject, never arbitrary "no" words
// elsewhere ("no errors in analytics", "no existing database", etc.).
const rules = Object.fromEntries(WEBSITE_CAPABILITY_FIELDS.map((field) => {
  const subject = `(?:(?:any|the|approved|new)\\s+)?${subjects[field]}\\b`;
  // Distinguish "no data is required" from "no data loss is acceptable".
  const scopeEnd = "(?=$|\\s*(?:[,/:]|and\\b|or\\b|is\\b|are\\b|required\\b|approved\\b|requested\\b|needed\\b|for\\b|in\\b|outside\\b))";
  return [field, {
    exclusion: new RegExp(`^(?:(?:(?:public|static)\\s+(?:website|site)\\s+(?:with\\s+)?)?(?:no|without)\\s+${subject}${scopeEnd}|(?:do not|don't|never)\\s+(?:add|use|implement|enable|create|include|introduce|configure)\\s+${subject}${scopeEnd}|${subject}(?:\\s+(?:and|or)\\s+${subject})*\\s+(?:(?:is|are|remains?)\\s+)?(?:not\\s+(?:approved|required|needed|requested|in scope)\\b|outside\\b[^.!?]*\\bscope\\b|out of scope\\b|excluded\\b))`, "i"),
    request: new RegExp(`^(?:(?:implement|create|add|provide|use|enable|require|retain|keep)\\s+(?!no\\b)[^.!?]*\\b${subjects[field]}\\b|${subject}\\s+(?:is|are)\\s+(?:required|approved|requested|needed)\\b)`, "i")
  }];
})) as Record<WebsiteCapabilityField, { exclusion: RegExp; request: RegExp }>;

/** Interpret legacy free text without changing the answer or its review status.
 * An independent positive replacement request prevents a negative clause from
 * suppressing the capability. Unrecognized descriptions retain legacy behavior;
 * structured N/A/Deferred decisions remain the authoritative way to settle scope.
 */
export function isExcludedWebsiteCapability(field: WebsiteCapabilityField, value: string): boolean {
  if (/^(?:no|not approved|excluded|out of scope|outside scope)[.!]?$/i.test(value.trim())) return true;
  const clauses = value.split(/[.;!?\n]+|\s+but\s+/i).map((clause) => clause.trim()).filter(Boolean);
  const rule = rules[field];
  return clauses.some((clause) => rule.exclusion.test(clause))
    && !clauses.some((clause) => !rule.exclusion.test(clause) && rule.request.test(clause));
}
