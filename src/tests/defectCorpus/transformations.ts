import { defectSeeds } from "./seeds";
import type { DefectSeed, Family, OperatorContract, TransformationCase } from "./types";

// Test-local, enumerated contracts; neither a production registry nor a resolver.
export const operators: readonly OperatorContract[] = [
  {
    family: "case-space", propertyId: "PB-PROP-CASE-001", version: "1.0.0",
    applicability: "The eleven explicitly listed singleton/narrative seeds; answers and narrative only.",
    preconditions: ["Known seed", "ASCII upper/lower case and outer spaces/tabs only", "Preserve IDs, question and record grammar"],
    expectedRelation: "Preserve independently specified selection, effective status, conflict and operative verification semantics.",
    exceptions: ["No arbitrary English, Unicode normalization, internal whitespace, raw escaped-register or provider shorthand guarantee"]
  },
  {
    family: "permutation", propertyId: "PB-PROP-ORDER-001", version: "1.0.0",
    applicability: "EC-004's two case-equivalent currency records only.",
    preconditions: ["Distinct valid IDs", "Exactly the authored usd/USD pair", "Reverse the complete records, retaining IDs"],
    expectedRelation: "Equivalent values retain agreement and canonical USD regardless of record order.",
    exceptions: ["No general record-order, duplicate-ID, conflicting-value or display-byte guarantee"]
  },
  {
    family: "equivalent", propertyId: "PB-PROP-DUPLICATE-001", version: "1.0.0",
    applicability: "EC-001/002/003 single authoritative selections with no narrative.",
    preconditions: ["One Answered CHOICE-1", "Authored equivalent value", "Unused valid CHOICE-2 ID"],
    expectedRelation: "Become an equivalent duplicate: retain the selection and both contributing IDs without a conflict.",
    exceptions: ["No invalid/reused ID, arbitrary provider equivalence, or alias normalization guarantee"]
  },
  {
    family: "conflict", propertyId: "PB-PROP-CONFLICT-001", version: "1.0.0",
    applicability: "EC-001/002/003 single authoritative selections with no narrative.",
    preconditions: ["One Answered CHOICE-1", "Authored distinct alternative", "Unused valid CHOICE-2 ID"],
    expectedRelation: "Retain both contributing IDs, expose the exact singleton conflict, select no winner, and require resolution in verification.",
    exceptions: ["No gate-policy change, invalid-ID behavior or automatic conflict remediation"]
  },
  {
    family: "negation", propertyId: "PB-PROP-NEGATION-001", version: "1.0.0",
    applicability: "EC-001/002/003 complete structured answer values only.",
    preconditions: ["One positive CHOICE-1", "No positive narrative", "Prefix the complete value with supported 'not '"],
    expectedRelation: "The record becomes Needs answer, contributes no effective selection, and leaves verification unresolved.",
    exceptions: ["No arbitrary English, double negation, coordinated narrative or denial-scope rewriting"]
  },
  {
    family: "uncertainty", propertyId: "PB-PROP-UNCERTAINTY-001", version: "1.0.0",
    applicability: "EC-001/002/003 complete structured answer values only.",
    preconditions: ["One positive CHOICE-1", "No positive narrative", "Use only '${value} pending approval' or 'Maybe ${value}'"],
    expectedRelation: "The record becomes Needs answer with no effective selection or value-specific verification.",
    exceptions: ["Business workflow pending states are not selection uncertainty; broader grammar is unexercised"]
  },
  {
    family: "replacement", propertyId: "PB-PROP-REPLACEMENT-001", version: "1.0.0",
    applicability: "EC-001/002/003 complete structured answer values only.",
    preconditions: ["One Answered CHOICE-1", "No positive narrative", "Use authored Stripe/CAD/authenticated checkout alternative"],
    expectedRelation: "Select only the replacement, keep CHOICE-1, remove the prior value from operative verification, and introduce no conflict.",
    exceptions: ["No aliases, unsupported choices, multi-record replacement or lifecycle behavior"]
  },
  {
    family: "unrelated", propertyId: "PB-PROP-UNRELATED-001", version: "1.0.0",
    applicability: "The eleven singleton/narrative seeds; append one closed business-state clause.",
    preconditions: ["Known seed", "Clause is exactly 'Stock records remain visible while orders are pending.'", "Separate with a semicolon"],
    expectedRelation: "Preserve selection, unresolved/conflict state and operative verification despite unrelated workflow pending state.",
    exceptions: ["No arbitrary clause insertion, cross-clause grammar, whole-document equality or new domain guarantee"]
  }
];

export const unrelatedClause = "Stock records remain visible while orders are pending.";

function failPrecondition(message: string): never {
  throw new Error(`Transformation not applicable: ${message}`);
}

export function transform(seed: DefectSeed, family: Family, parameters: Readonly<Record<string, string>>): TransformationCase {
  if (!defectSeeds.includes(seed) || !seed.propertyRefs.includes(family)) failPrecondition("seed/family is outside the enumerated scope");
  const operator = operators.find(candidate => candidate.family === family)!;
  const original = seed.source;
  let source = original;
  let expected = seed.expected;
  const profile = seed.choiceProfile;

  // Parameters are a closed set, not arbitrary parser input or general normalization.
  const allowed = parametersFor(seed, family);
  if (!allowed.some(candidate => JSON.stringify(candidate) === JSON.stringify(parameters))) failPrecondition("unsupported parameters, value or record ID");

  if (family === "case-space") {
    const convert = (value: string) => {
      if (!value) return value;
      const changed = parameters.case === "upper" ? value.toUpperCase() : value.toLowerCase();
      const padding = parameters.padding === "spaces" ? "  " : "\t";
      return `${padding}${changed}${padding}`;
    };
    source = { ...original, records: original.records.map(record => ({ ...record, answer: convert(record.answer) })), narrative: convert(original.narrative) };
  } else if (family === "permutation") {
    if (original.records.length !== 2 || original.records[0].id !== "CHOICE-1" || original.records[1].id !== "CHOICE-2"
      || original.records[0].answer !== "usd" || original.records[1].answer !== "USD") failPrecondition("not the authored equivalent pair");
    source = { ...original, records: [...original.records].reverse() };
  } else if (family === "unrelated") {
    source = { ...original, narrative: original.narrative ? `${original.narrative}; ${unrelatedClause}` : unrelatedClause };
  } else {
    if (!profile || original.rawRegister !== undefined || original.records.length !== 1 || original.records[0].id !== "CHOICE-1"
      || original.narrative !== "" || seed.expected.singleton?.outcome !== "resolved") failPrecondition("requires a single positive structured choice with no narrative");
    if (family === "equivalent" || family === "conflict") {
      const id = parameters.recordId;
      if (!/^CHOICE-[1-9]\d*$/.test(id) || original.records.some(record => record.id === id)) failPrecondition("record ID must be distinct and valid");
      source = { ...original, records: [...original.records, { id, answer: parameters.answer }] };
      expected = {
        singleton: family === "equivalent"
          ? { outcome: "equivalentDuplicate", contributingRecordIds: ["CHOICE-1", "CHOICE-2"], acceptableSelectedValues: profile.equivalentDisplays, conflictIds: [] }
          : { outcome: "conflicting", contributingRecordIds: ["CHOICE-1", "CHOICE-2"], conflictIds: [profile.conflictId] },
        verification: family === "equivalent" ? profile.resolved : profile.unresolved,
        requiredPatterns: family === "equivalent" ? [profile.selectedPattern] : [],
        records: [{ id: "CHOICE-1", status: "Answered" }, { id: "CHOICE-2", status: "Answered" }]
      };
    } else if (family === "replacement") {
      source = { ...original, records: [{ id: "CHOICE-1", answer: parameters.answer }] };
      expected = {
        singleton: { outcome: "resolved", contributingRecordIds: ["CHOICE-1"], acceptableSelectedValues: profile.alternateDisplays, conflictIds: [] },
        verification: { ...profile.resolved, forbiddenPatterns: [...profile.resolved.forbiddenPatterns, profile.selectedPattern] }, requiredPatterns: [profile.alternatePattern],
        records: [{ id: "CHOICE-1", status: "Answered" }]
      };
    } else {
      const value = original.records[0].answer;
      const answer = family === "negation" ? `not ${value}`
        : parameters.form === "pending" ? `${value} pending approval` : `Maybe ${value}`;
      source = { ...original, records: [{ id: "CHOICE-1", answer }] };
      expected = {
        singleton: { outcome: "missing", contributingRecordIds: [], conflictIds: [] },
        verification: profile.unresolved, requiredPatterns: [], records: [{ id: "CHOICE-1", status: "Needs answer" }]
      };
    }
  }
  return { name: `${seed.id} / ${operator.propertyId} / ${JSON.stringify(parameters)}`, seed, operator, parameters, source, expected };
}

function parametersFor(seed: DefectSeed, family: Family): readonly Readonly<Record<string, string>>[] {
  switch (family) {
    case "case-space": return [
      { case: "upper", padding: "spaces" }, { case: "lower", padding: "spaces" },
      { case: "upper", padding: "tabs" }, { case: "lower", padding: "tabs" }
    ];
    case "permutation": return [{ order: "reverse" }];
    case "equivalent": return [{ recordId: "CHOICE-2", answer: seed.choiceProfile!.equivalent }];
    case "conflict": return [{ recordId: "CHOICE-2", answer: seed.choiceProfile!.alternate }];
    case "negation": return [{ prefix: "not " }];
    case "uncertainty": return [{ form: "pending" }, { form: "maybe" }];
    case "replacement": return [{ answer: seed.choiceProfile!.alternate }];
    case "unrelated": return [{ clause: unrelatedClause }];
  }
}

// No composition or Cartesian expansion: each enumerated case applies one family.
export const transformationCases: readonly TransformationCase[] = defectSeeds.flatMap(seed =>
  seed.propertyRefs.flatMap(family => parametersFor(seed, family).map(parameters => transform(seed, family, parameters)))
);
