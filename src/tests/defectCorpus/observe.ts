// @ts-expect-error -- Node builtins are available to Vitest, not the browser app's ambient types.
import { execFileSync } from "node:child_process";
import { expect } from "vitest";
import { ecommerceDecisions } from "../../lib/ecommerceDecisions";
import { createSingletonProject, observeEcommerceSingleton } from "../invariants/ecommerceSingletonObservation";
import { assertSingletonConflictOutput, assertSingletonState, type SingletonObservation } from "../invariants/singletonContract";
import type { DefectSeed, SemanticOracle, SourceFixture, TransformationCase } from "./types";

const repositorySha: string = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
export function serializeRegister(source: SourceFixture): string {
  return source.rawRegister ?? source.records.map(record =>
    `${record.id} | launch | Answered | ${source.question} | Approved fixture answer | ${record.answer}`
  ).join("\n");
}

export interface CorpusObservation {
  readonly authority: "none";
  readonly version: "1.0.0";
  readonly singleton: SingletonObservation;
  readonly records: readonly { readonly id: string; readonly status: string; readonly answer: string }[];
}

export function oracleViolations(observed: CorpusObservation, expected: SemanticOracle): readonly string[] {
  const violations: string[] = [];
  if (expected.singleton) {
    const result = expected.singleton.outcome === "conflicting"
      ? assertSingletonConflictOutput(observed.singleton, expected.singleton, expected.verification)
      : assertSingletonState(observed.singleton, expected.singleton);
    if (result.status !== "satisfied") violations.push(JSON.stringify(result));
  }
  const text = observed.singleton.verificationStatements.join("\n");
  for (const fragment of expected.verification.requiredFragments) {
    if (!text.includes(fragment)) violations.push(`Missing required verification: ${fragment}`);
  }
  for (const pattern of expected.requiredPatterns) {
    if (!new RegExp(pattern.source, pattern.flags).test(text)) violations.push(`Missing required verification pattern: ${pattern}`);
  }
  for (const pattern of expected.verification.forbiddenPatterns) {
    if (new RegExp(pattern.source, pattern.flags).test(text)) violations.push(`Forbidden verification: ${pattern}`);
  }
  // Compare independently authored record identities and effective statuses;
  // raw-parser fixtures additionally assert the exact decoded answer.
  const ids = expected.records.map(record => record.id).sort();
  if (JSON.stringify(observed.records.map(record => record.id).sort()) !== JSON.stringify(ids)) violations.push("Effective source record identities differ");
  for (const record of expected.records) {
    const actual = observed.records.find(candidate => candidate.id === record.id);
    if (!actual || actual.status !== record.status || (record.answer !== undefined && actual.answer !== record.answer)) {
      violations.push(`Record mismatch: ${JSON.stringify({ expected: record, actual })}`);
    }
  }
  return violations;
}

export function assertCorpusCase(seed: DefectSeed, transformation?: TransformationCase): void {
  const source = transformation?.source ?? seed.source;
  const expected = transformation?.expected ?? seed.expected;
  const register = serializeRegister(source);
  const sourceBefore = JSON.stringify(source);
  const project = createSingletonProject({ choiceId: source.choiceId, question: source.question, answers: [], narrative: source.narrative });
  project.intake.ecommerceDecisions = register;
  const projectBefore = JSON.stringify(project);
  const context = {
    property: transformation ? { id: transformation.operator.propertyId, version: transformation.operator.version } : { id: "PB-PROP-SEED-001", version: "1.0.0" },
    repositorySha,
    originalSeed: seed,
    exactTransformedInput: { project: JSON.parse(projectBefore), register, narrative: source.narrative },
    operator: transformation ? { contract: transformation.operator, parameters: transformation.parameters } : { family: "identity", parameters: {} },
    expectedRelation: transformation?.operator.expectedRelation ?? "Match the original seed's independently authored semantics.",
    expected
  };
  const diagnostic = (observed: unknown) => JSON.stringify({ ...context, observed }, (_key, value) => value instanceof RegExp ? value.toString() : value, 2);
  let observed: CorpusObservation;
  try {
    const decisions = ecommerceDecisions(project);
    // Synthetic conflict records are inspected by the 6D.2 observer separately.
    // Keep every Decision Register record (including parser diagnostics), rather
    // than the separate intake-field compatibility adapter's missing records.
    // Do not filter by expected IDs/statuses.
    observed = {
      authority: "none", version: "1.0.0",
      singleton: observeEcommerceSingleton(project, source.choiceId),
      records: decisions.filter(record => record.field === "ecommerceDecisions" && !record.id.startsWith("EC-SELECTION-CONFLICT-"))
        .map(record => ({ id: record.id, status: record.status, answer: record.answer }))
    };
  } catch (error) {
    throw new Error(diagnostic({ error: String(error) }));
  }
  const message = diagnostic(observed);
  expect(oracleViolations(observed, expected), message).toEqual([]);
  expect(JSON.stringify(project), message).toBe(projectBefore);
  expect(JSON.stringify(source), message).toBe(sourceBefore);
}
