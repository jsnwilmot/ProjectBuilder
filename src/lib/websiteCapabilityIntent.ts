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
const allSubjects = new RegExp(`\\b(?:${[...new Set(Object.values(subjects))].join("|")})\\b`, "gi");
const negativePredicate = /^(?:\s+(?:that|which))?\s+(?:(?:is|are|remains?)\s+)?(?:not\s+(?:approved|required|needed|requested|in scope)\b|outside\b[^.!?]*\bscope\b|out of scope\b|excluded\b)/i;
const positivePredicate = /^(?:\s+(?:that|which))?\s+(?:is|are)\s+(?:approved|required|requested|needed)\b/i;
const relationshipStart = /^(?:affecting|regarding|concerning|in|on|through|via|within|(?:related|relating)\s+to)\b/i;
// Do not interpret a capability noun modifying a different concern as its
// exclusion: "no data loss", "no analytics errors", etc.
const capabilityEnd = /^(?:$|\s*[,/:]|\s+(?:and|or|nor|is|are|required|approved|requested|needed|allowed|for|in|outside|with|without|that|which)\b)/i;
const completesCapabilityNoun = (following: string) =>
  capabilityEnd.test(following) || relationshipStart.test(following.trimStart());

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

export type CapabilityPolarity = "positive" | "negative" | "unclassified";
export interface CapabilityOccurrence {
  start: number;
  end: number;
  polarity: CapabilityPolarity;
}

/** A relationship after an intervening concern starts a separate noun phrase.
 * Use capability noun completion, not a dictionary of concerns or adjectives.
 */
function hasInterveningConcern(clause: string, cueEnd: number, boundary: number): boolean {
  const phrase = clause.slice(cueEnd, boundary).trim();
  if (!phrase.replace(/\b(?:a|an|the|any)\b/gi, "").trim()) return false;
  return ![...phrase.matchAll(allSubjects)].some((match) =>
    completesCapabilityNoun(phrase.slice(match.index + match[0].length)));
}

/** Scan polarity segments, not adjectives. The vocabulary below is grammar:
 * cues and boundaries, never a list of permitted descriptive modifiers.
 */
export function classifyCapabilityOccurrences(field: WebsiteCapabilityField, clause: string): CapabilityOccurrence[] {
  const request = requestStart.test(clause);
  const baseline: CapabilityPolarity = request ? "positive" : "unclassified";
  let polarity: CapabilityPolarity = baseline;
  let capabilityInSegment = false;
  let positiveReset = false;
  let determinerReset = false;
  let negativeCueEnd: number | undefined;
  const occurrences = [...clause.matchAll(rules[field].subject)];
  const starts = new Map(occurrences.map((match) => [match.index, match]));
  // Carry negation through actual capability lists, not unrelated field lists.
  const capabilityEnds = new Set([...clause.matchAll(allSubjects)]
    .filter((match) => completesCapabilityNoun(clause.slice(match.index + match[0].length)))
    .map((match) => match.index + match[0].length));
  const result: CapabilityOccurrence[] = [];

  for (const token of clause.matchAll(/[a-z]+(?:[-'][a-z]+)*|[,;:.!?]/gi)) {
    const word = token[0].toLowerCase();
    if (word === ",") {
      if (!capabilityInSegment) polarity = baseline;
      capabilityInSegment = false;
      positiveReset = true;
      determinerReset = false;
    } else if (word === "and") {
      positiveReset = true;
      determinerReset = request;
    } else if (word === "or") {
      positiveReset = false;
      determinerReset = false;
    } else if (/^(?:no|without|not|neither|nor|never|don't)$/.test(word)) {
      polarity = "negative";
      negativeCueEnd = token.index + token[0].length;
      positiveReset = false;
      determinerReset = false;
    } else if (relationshipStart.test(clause.slice(token.index))) {
      if (polarity === "negative" && negativeCueEnd !== undefined
        && hasInterveningConcern(clause, negativeCueEnd, token.index)) {
        polarity = baseline;
        negativeCueEnd = undefined;
        capabilityInSegment = false;
        positiveReset = false;
        determinerReset = false;
      }
    } else if (/^(?:but|with|for|from|to|about|of|into|by|is|are|was|were|must|should|can|could|[;:.!?])$/.test(word)) {
      polarity = baseline;
      negativeCueEnd = undefined;
      capabilityInSegment = false;
      positiveReset = false;
      determinerReset = false;
    } else if (/^(?:approved|owner-approved|required|requested)$/.test(word)) {
      if (polarity !== "negative" || positiveReset) polarity = "positive";
    } else if (determinerReset && /^(?:a|an|the)$/.test(word)) {
      polarity = "positive";
      determinerReset = false;
    }

    const occurrence = starts.get(token.index);
    if (occurrence) {
      const end = occurrence.index + occurrence[0].length;
      const following = clause.slice(end);
      result.push({
        start: occurrence.index, end,
        polarity: negativePredicate.test(following) ? "negative"
          : positivePredicate.test(following) && (polarity !== "negative" || positiveReset) ? "positive"
          : polarity === "negative" && !completesCapabilityNoun(following) ? "unclassified" : polarity
      });
      positiveReset = false;
      determinerReset = false;
    }
    if (capabilityEnds.has(token.index + token[0].length)) capabilityInSegment = true;
  }
  return result;
}

/** Request detection, subject location and local negation are separate decisions.
 * Ordinary comma lists stay in the clause; each subject gets its own polarity.
 */
function capabilityClauseIntent(field: WebsiteCapabilityField, clause: string) {
  const rule = rules[field];
  const occurrences = classifyCapabilityOccurrences(field, clause);
  return {
    excluded: rule.exclusion.test(clause) || occurrences.some(({ polarity }) => polarity === "negative"),
    requested: rule.approval.test(clause)
      || occurrences.some(({ polarity }) => polarity === "positive")
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
