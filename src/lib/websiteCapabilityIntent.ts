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

const requestVerbs = "implement|create|add|provide|use|enable|require|retain|keep";
// Commas and conjunctions are boundaries only before explicit request verbs.
// Keep ordinary lists together; do not infer intent from arbitrary comma text.
const clauseBoundary = new RegExp(
  `[.;!?\\n]+|\\s+but\\s+|(?:,\\s*(?:(?:and|except|instead)\\s+)?|\\s+(?:and|except|instead)\\s+)(?=(?:${requestVerbs})\\s+)`,
  "i"
);

const requestStart = new RegExp(`^(?:${requestVerbs})\\s+`, "i");
const modifiers = "(?:(?:a|an|any|the|approved|owner-approved|new|existing|current|replacement|customer|organization)\\s+)*";
const capabilitySubject = `(?:${[...new Set(Object.values(subjects))].join("|")})\\b`;
// Negation applies to the adjacent capability phrase, optionally through a list
// of known capability phrases. Unrelated nouns end that scope ("without errors").
const negatedPrefix = new RegExp(
  `\\b(?:without|no|not|neither|nor|(?:do not|don't|never)\\s+(?:${requestVerbs}))\\s+(?:${modifiers}${capabilitySubject}\\s*(?:,\\s*(?:(?:and|or|nor)\\s+)?|(?:and|or|nor)\\s+))*${modifiers}$`,
  "i"
);
const negativePredicate = /^(?:\s+(?:that|which))?\s+(?:(?:is|are|remains?)\s+)?(?:not\s+(?:approved|required|needed|requested|in scope)\b|outside\b[^.!?]*\bscope\b|out of scope\b|excluded\b)/i;
// Do not interpret a capability noun modifying a different concern as its
// exclusion: "no data loss", "no analytics errors", etc.
const capabilityEnd = /^(?:$|\s*[,/:]|\s+(?:and|or|nor|is|are|required|approved|requested|needed|allowed|for|in|outside|with|without|that|which)\b)/i;

// A small, field-scoped compatibility grammar, not a general prose classifier.
// Match the capability itself as the negated subject, never arbitrary "no" words
// elsewhere ("no errors in analytics", "no existing database", etc.).
const rules = Object.fromEntries(WEBSITE_CAPABILITY_FIELDS.map((field) => {
  const subject = `(?:(?:any|the|approved|new)\\s+)?${subjects[field]}\\b`;
  // Distinguish "no data is required" from "no data loss is acceptable".
  const scopeEnd = "(?=$|\\s*(?:[,/:]|and\\b|or\\b|is\\b|are\\b|required\\b|approved\\b|requested\\b|needed\\b|for\\b|in\\b|outside\\b))";
  return [field, {
    exclusion: new RegExp(`^(?:(?:(?:public|static)\\s+(?:website|site)\\s+(?:with\\s+)?)?(?:no|without)\\s+${subject}${scopeEnd}|(?:do not|don't|never)\\s+(?:add|use|implement|enable|create|include|introduce|configure)\\s+${subject}${scopeEnd}|${subject}(?:\\s+(?:and|or)\\s+${subject})*\\s+(?:(?:is|are|remains?)\\s+)?(?:not\\s+(?:approved|required|needed|requested|in scope)\\b|outside\\b[^.!?]*\\bscope\\b|out of scope\\b|excluded\\b))`, "i"),
    subject: new RegExp(`\\b${subjects[field]}\\b`, "gi"),
    approval: new RegExp(`^${subject}\\s+(?:is|are)\\s+(?:required|approved|requested|needed)\\b`, "i")
  }];
})) as Record<WebsiteCapabilityField, { exclusion: RegExp; subject: RegExp; approval: RegExp }>;

function capabilityOccurrenceNegated(clause: string, start: number, end: number): boolean {
  const following = clause.slice(end);
  return negativePredicate.test(following)
    || (negatedPrefix.test(clause.slice(0, start)) && capabilityEnd.test(following));
}

/** Request detection, subject location and local negation are separate decisions.
 * Ordinary comma lists stay in the clause; each subject gets its own polarity.
 */
function capabilityClauseIntent(field: WebsiteCapabilityField, clause: string) {
  const rule = rules[field];
  const occurrences = [...clause.matchAll(rule.subject)].map((match) =>
    capabilityOccurrenceNegated(clause, match.index, match.index + match[0].length));
  return {
    excluded: rule.exclusion.test(clause) || occurrences.some((negated) => negated),
    requested: rule.approval.test(clause)
      || (requestStart.test(clause) && occurrences.some((negated) => !negated))
  };
}

/** Interpret legacy free text without changing the answer or its review status.
 * An independent positive replacement request prevents a negative clause from
 * suppressing the capability. Unrecognized descriptions retain legacy behavior;
 * structured N/A/Deferred decisions remain the authoritative way to settle scope.
 */
export function isExcludedWebsiteCapability(field: WebsiteCapabilityField, value: string): boolean {
  if (/^(?:no|not approved|excluded|out of scope|outside scope)[.!]?$/i.test(value.trim())) return true;
  const clauses = value.split(clauseBoundary).map((clause) => clause.trim()).filter(Boolean);
  const intents = clauses.map((clause) => capabilityClauseIntent(field, clause));
  return intents.some(({ excluded }) => excluded) && !intents.some(({ requested }) => requested);
}
