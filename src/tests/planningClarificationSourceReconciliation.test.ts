// @ts-expect-error -- Vitest runs this static source isolation assertion in Node; the app tsconfig intentionally excludes Node ambient types.
import { readFileSync } from "node:fs";
// @ts-expect-error -- Vitest runs Web Crypto setup in Node; the app tsconfig intentionally excludes Node ambient types.
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PhaseGateId, PhaseGateResult } from "../lib/phaseGates";
import {
  generatePlanningClarificationBlueprints,
  type PlanningClarificationProposalBlueprint,
  type PlanningClarificationSourceBlueprint
} from "../lib/planningClarificationBlueprints";
import { generatePlanningClarificationDrafts } from "../lib/planningClarificationDrafts";
import { generatePlanningClarificationFingerprints } from "../lib/planningClarificationFingerprints";
import { reconcilePlanningClarifications } from "../lib/planningClarificationReconciliation";
import {
  reconcilePlanningClarificationSources,
  type PlanningClarificationSourceCurrentReconciliation,
  type PlanningClarificationSourceReconciliationIssueCode
} from "../lib/planningClarificationSourceReconciliation";
import {
  createEmptyProjectPlanningState,
  PLANNING_SCHEMA_VERSION,
  type PlanningSourceAvailability,
  type ProjectPlanningState
} from "../lib/planningProposals";
import { getPlanningRuleById, getPlanningRuleRegistry } from "../lib/planningRules";
import type { PowerPlatformGateStatus } from "../types/project";

const projectId = "tti-software-licence-tracker";
const timestamp = "2026-07-22T12:00:00.000Z";
const fingerprint = "a".repeat(64);

const ruleIds = [
  "pp.canvas.schema.confirmation",
  "pp.sharepoint.internalnames.confirmation",
  "pp.canvas.screentargets.confirmation",
  "pp.canvas.controltargets.confirmation",
  "pp.canvas.components.confirmation",
  "pp.canvas.yamlplanning.confirmation",
  "pp.canvas.delegation.confirmation",
  "pp.security.permissions.confirmation",
  "pp.testing.outcomes.confirmation",
  "pp.alm.rollback.confirmation",
  "pp.release.approval.confirmation"
] as const;

const ttiStatuses: Record<PhaseGateId, PowerPlatformGateStatus> = {
  schema: "reviewNeeded",
  internalNames: "reviewNeeded",
  screenTargets: "missingInformation",
  controlTargets: "missingInformation",
  componentTargets: "missingInformation",
  yaml: "reviewNeeded",
  delegation: "missingInformation",
  security: "reviewNeeded",
  testing: "reviewNeeded",
  alm: "reviewNeeded",
  releaseApproval: "reviewNeeded"
} as Record<PhaseGateId, PowerPlatformGateStatus>;

function gate(id: PhaseGateId, status: PowerPlatformGateStatus): PhaseGateResult {
  return {
    id,
    label: `Gate ${id}`,
    status,
    blockingReason: `TTI ${id} blocker remains unresolved.`,
    sourceSection: `TTI ${id} source section`
  };
}

async function ttiFixture() {
  const draftResult = generatePlanningClarificationDrafts({
    projectId,
    projectType: "powerAppsCanvas",
    gateResults: ruleIds.map((ruleId) => {
      const targetKey = getPlanningRuleById(ruleId)!.target.targetKey;
      return gate(targetKey, ttiStatuses[targetKey]);
    })
  });
  expect(draftResult.issues).toEqual([]);
  const blueprintResult = generatePlanningClarificationBlueprints({
    projectId,
    drafts: draftResult.drafts
  });
  expect(blueprintResult.issues).toEqual([]);
  const fingerprintResult = await generatePlanningClarificationFingerprints({
    projectId,
    sources: blueprintResult.sources,
    proposals: blueprintResult.proposals
  });
  expect(fingerprintResult.issues).toEqual([]);
  expect(blueprintResult.sources).toHaveLength(22);
  expect(blueprintResult.proposals).toHaveLength(11);
  return {
    sources: clone(blueprintResult.sources) as PlanningClarificationSourceBlueprint[],
    proposals: clone(blueprintResult.proposals) as PlanningClarificationProposalBlueprint[]
  };
}

function emptyPlanning(): ProjectPlanningState {
  return createEmptyProjectPlanningState();
}

function sourceRecord(
  source: PlanningClarificationSourceBlueprint,
  index: number,
  availability: PlanningSourceAvailability = "current",
  overrides: Record<string, unknown> = {}
): ProjectPlanningState["sources"][number] {
  return {
    sourceId: sourceUuid(index),
    sourceType: source.sourceType,
    locator: source.locator,
    label: source.label,
    authority: source.authority,
    availability,
    observedAt: timestamp,
    ...(source.version === undefined ? {} : { version: source.version }),
    ...(source.excerpt === undefined ? {} : { excerpt: source.excerpt }),
    ...overrides
  } as ProjectPlanningState["sources"][number];
}

function sourceIdMap(sources: readonly ProjectPlanningState["sources"][number][]): Map<string, string> {
  const byKey = new Map<string, string>();
  for (const source of sources) {
    const key = existingSourceKey(source);
    if (key) {
      byKey.set(key, source.sourceId);
    }
  }
  return byKey;
}

function proposalRecord(
  proposal: PlanningClarificationProposalBlueprint,
  index: number,
  sourceIds: readonly string[]
): ProjectPlanningState["proposals"][number] {
  return {
    proposalId: proposalUuid(index),
    proposalSchemaVersion: PLANNING_SCHEMA_VERSION,
    projectId: proposal.projectId,
    ruleSetId: proposal.ruleSetId,
    ruleSetVersion: proposal.ruleSetVersion,
    ruleId: proposal.ruleId,
    ruleVersion: proposal.ruleVersion,
    fingerprint,
    target: { ...proposal.target },
    category: proposal.category,
    status: proposal.status,
    value: { ...proposal.value },
    title: proposal.title,
    recommendation: proposal.recommendation,
    rationale: proposal.rationale,
    sourceIds: [...sourceIds],
    uncertainty: proposal.uncertainty,
    restriction: proposal.restriction,
    createdAt: timestamp,
    updatedAt: timestamp,
    consequence: proposal.consequence,
    readinessRequirementIds: [...proposal.readinessRequirementIds],
    applicableProjectTypes: [...proposal.applicableProjectTypes],
    applicableDomains: [...proposal.applicableDomains]
  };
}

async function planningWithSources(
  overrides: Partial<{
    sources: ProjectPlanningState["sources"];
    proposals: ProjectPlanningState["proposals"];
  }> = {}
): Promise<ProjectPlanningState> {
  const fixture = await ttiFixture();
  const sources = overrides.sources ?? fixture.sources.map((source, index) => sourceRecord(source, index + 1));
  const idsByKey = sourceIdMap(sources);
  const proposals = overrides.proposals ?? fixture.proposals.map((proposal, index) =>
    proposalRecord(proposal, index + 1, proposal.sourceKeys.map((sourceKey) => idsByKey.get(sourceKey)!))
  );
  return {
    ...emptyPlanning(),
    sources,
    proposals
  };
}

async function reconcile(overrides: Partial<{
  existingPlanning: unknown;
  sources: unknown;
  proposals: unknown;
  id: string;
}> = {}) {
  const fixture = await ttiFixture();
  return reconcilePlanningClarificationSources({
    projectId: overrides.id ?? projectId,
    existingPlanning: overrides.existingPlanning ?? emptyPlanning(),
    sources: overrides.sources ?? fixture.sources,
    proposals: overrides.proposals ?? fixture.proposals
  });
}

function sourceUuid(index: number): string {
  return `30000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function proposalUuid(index: number): string {
  return `40000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
}

function clone<T>(input: T): T {
  return JSON.parse(JSON.stringify(input)) as T;
}

function dispositions(current: readonly PlanningClarificationSourceCurrentReconciliation[]) {
  return current.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.disposition] = (counts[entry.disposition] ?? 0) + 1;
    return counts;
  }, {});
}

async function issueCodes(input: unknown): Promise<PlanningClarificationSourceReconciliationIssueCode[]> {
  return (await reconcilePlanningClarificationSources(input)).issues.map((entry) => entry.code);
}

function existingSourceKey(source: ProjectPlanningState["sources"][number]): string | null {
  if (source.sourceType === "projectRule" && source.locator.startsWith("planning-rule:") && source.version) {
    return `projectRule|${source.locator.slice("planning-rule:".length)}|${source.version}`;
  }
  if (source.sourceType === "readinessPrerequisite" && source.locator.startsWith("phase-gate:")) {
    return `readinessPrerequisite|${source.locator.slice("phase-gate:".length)}`;
  }
  return null;
}

function refreshFingerprintInputsForSourceChange(
  proposals: PlanningClarificationProposalBlueprint[],
  source: PlanningClarificationSourceBlueprint
): void {
  for (const proposal of proposals) {
    if (!proposal.sourceKeys.includes(source.sourceKey)) {
      continue;
    }
    const parsed = JSON.parse(proposal.fingerprintInput) as {
      sourceEvidence: Array<Record<string, unknown>>;
    };
    parsed.sourceEvidence = parsed.sourceEvidence.map((entry) =>
      entry.sourceKey === source.sourceKey
        ? {
            ...entry,
            sourceType: source.sourceType,
            locator: source.locator,
            label: source.label,
            authority: source.authority,
            availability: source.availability,
            version: source.version ?? null,
            excerpt: source.excerpt ?? null
          }
        : entry
    );
    proposal.fingerprintInput = JSON.stringify(parsed);
  }
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("planning clarification source reconciliation classification", () => {
  it("validates root input, project ID, collection shape, and existing planning normalization", async () => {
    await expect(reconcilePlanningClarificationSources(null)).resolves.toEqual({
      current: [],
      existingOnly: [],
      nonCurrent: [],
      issues: [expect.objectContaining({ code: "invalidInput" })]
    });
    await expect(issueCodes({ projectId: "", existingPlanning: {}, sources: [], proposals: [] })).resolves.toContain("invalidProjectId");
    await expect(issueCodes({ projectId: "x".repeat(201), existingPlanning: {}, sources: [], proposals: [] })).resolves.toContain("invalidProjectId");
    await expect(issueCodes({ projectId: "one\ntwo", existingPlanning: {}, sources: [], proposals: [] })).resolves.toContain("invalidProjectId");
    await expect(reconcile({ sources: {} })).resolves.toEqual(expect.objectContaining({ current: [], issues: [expect.objectContaining({ code: "invalidSources" })] }));
    await expect(reconcile({ proposals: {} })).resolves.toEqual(expect.objectContaining({ current: [], issues: [expect.objectContaining({ code: "invalidProposals" })] }));
    await expect(reconcile({ existingPlanning: [] })).resolves.toEqual(expect.objectContaining({ current: [], issues: [expect.objectContaining({ code: "invalidExistingPlanning" })] }));

    const fixture = await ttiFixture();
    const populated = await planningWithSources();
    const cases = [
      { ...emptyPlanning(), schemaVersion: "wrong" },
      { ...emptyPlanning(), sources: [null] },
      { ...populated, sources: [populated.sources[0], { ...populated.sources[0] }] },
      { ...populated, proposals: [{ ...populated.proposals[0], sourceIds: [sourceUuid(99)] }] }
    ];
    for (const existingPlanning of cases) {
      const result = await reconcilePlanningClarificationSources({
        projectId,
        existingPlanning,
        sources: fixture.sources,
        proposals: fixture.proposals
      });
      expect(result.current).toEqual([]);
      expect(result.existingOnly).toEqual([]);
      expect(result.nonCurrent).toEqual([]);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "existingPlanningNormalizationIssue" })
      ]));
    }
  });

  it("validates generated source/proposal contracts, source-set completeness, and source-key bindings", async () => {
    const fixture = await ttiFixture();
    expect((await reconcile()).issues).toEqual([]);

    const duplicate = [...fixture.sources, clone(fixture.sources[0])];
    expect((await reconcile({ sources: duplicate })).issues).toEqual([
      expect.objectContaining({ code: "duplicateSourceBlueprintKey", sourceKey: fixture.sources[0].sourceKey })
    ]);

    const unexpected = [
      ...fixture.sources,
      {
        sourceKey: "readinessPrerequisite|orphan",
        sourceType: "readinessPrerequisite",
        locator: "phase-gate:orphan",
        label: "Orphan source",
        authority: "approved",
        availability: "current"
      } satisfies PlanningClarificationSourceBlueprint
    ];
    expect((await reconcile({ sources: unexpected })).issues).toEqual([
      expect.objectContaining({ code: "unexpectedSourceBlueprint", sourceKey: "readinessPrerequisite|orphan" })
    ]);

    const generatedInvalid = clone(fixture.sources);
    generatedInvalid[0].label = "<script>alert(1)</script>";
    expect((await reconcile({ sources: generatedInvalid })).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "generatedPlanningInvalid", sourceIssueCode: "invalidSource" })
    ]));

    const bindingSources = clone(fixture.sources);
    const bindingProposals = clone(fixture.proposals);
    bindingSources[0].locator = "planning-rule:wrong-rule";
    refreshFingerprintInputsForSourceChange(bindingProposals, bindingSources[0]);
    expect((await reconcile({ sources: bindingSources, proposals: bindingProposals })).issues).toEqual([
      expect.objectContaining({ code: "invalidSourceKeyBinding", sourceKey: bindingSources[0].sourceKey, field: "locator" })
    ]);
  });

  it("classifies TTI Scenario A empty planning and Scenario B exact persisted current source matches", async () => {
    const empty = await reconcile();
    expect(empty.issues).toEqual([]);
    expect(empty.current).toHaveLength(22);
    expect(dispositions(empty.current)).toEqual({ newSource: 22 });
    expect(empty.existingOnly).toEqual([]);
    expect(empty.nonCurrent).toEqual([]);
    expect(empty.current.map((entry) => entry.sourceKey)).toEqual(
      getPlanningRuleRegistry()
        .flatMap((rule) => [`projectRule|${rule.ruleId}|${rule.ruleVersion}`, `readinessPrerequisite|${rule.target.targetKey}`])
        .sort()
    );

    const exact = await reconcile({ existingPlanning: await planningWithSources() });
    expect(exact.issues).toEqual([]);
    expect(exact.current).toHaveLength(22);
    expect(dispositions(exact.current)).toEqual({ exactMatch: 22 });
    expect(exact.current[0]).toMatchObject({
      disposition: "exactMatch",
      existingAvailability: "current"
    });
    expect(exact.current.map((entry) => entry.existingSourceId)).toContain(sourceUuid(1));
  });

  it("classifies Scenario C readiness evidence changes and Scenario D project-rule metadata changes without mutation", async () => {
    const fixture = await ttiFixture();
    const readinessIndex = fixture.sources.findIndex((source) => source.sourceType === "readinessPrerequisite");
    const readinessBase = await planningWithSources();
    const readinessPlanning = {
      ...readinessBase,
      sources: readinessBase.sources.map((source, index) => index === readinessIndex
        ? { ...source, excerpt: "Persisted readiness evidence changed." }
        : source)
    };
    const readinessBefore = JSON.stringify(readinessPlanning);
    const readiness = await reconcile({ existingPlanning: readinessPlanning });
    expect(dispositions(readiness.current)).toEqual({ changedSource: 1, exactMatch: 21 });
    expect(readiness.current.find((entry) => entry.sourceKey === fixture.sources[readinessIndex].sourceKey)).toMatchObject({
      disposition: "changedSource",
      existingSourceId: sourceUuid(readinessIndex + 1)
    });
    expect(JSON.stringify(readinessPlanning)).toBe(readinessBefore);

    const projectRuleIndex = fixture.sources.findIndex((source) => source.sourceType === "projectRule");
    const ruleBase = await planningWithSources();
    const rulePlanning = {
      ...ruleBase,
      sources: ruleBase.sources.map((source, index) => index === projectRuleIndex
        ? { ...source, label: "Persisted project rule label changed." }
        : source)
    };
    const rule = await reconcile({ existingPlanning: rulePlanning });
    expect(dispositions(rule.current)).toEqual({ changedSource: 1, exactMatch: 21 });
    expect(rule.current.find((entry) => entry.sourceKey === fixture.sources[projectRuleIndex].sourceKey)).toMatchObject({
      disposition: "changedSource",
      existingSourceId: sourceUuid(projectRuleIndex + 1)
    });
  });

  it("classifies Scenario E prior stale sources and Scenario F generated source removal without availability mutation", async () => {
    const fixture = await ttiFixture();
    const stalePlanning = await planningWithSources({
      sources: fixture.sources.map((source, index) => sourceRecord(source, index + 1, index === 0 ? "stale" : "current"))
    });
    const staleResult = await reconcile({ existingPlanning: stalePlanning });
    expect(staleResult.nonCurrent).toEqual([
      expect.objectContaining({
        sourceKey: fixture.sources[0].sourceKey,
        existingSourceId: sourceUuid(1),
        existingAvailability: "stale"
      })
    ]);
    expect(staleResult.current.find((entry) => entry.sourceKey === fixture.sources[0].sourceKey)).toMatchObject({ disposition: "newSource" });
    expect(stalePlanning.sources[0].availability).toBe("stale");

    const removedProposal = fixture.proposals[0];
    const removedKeys = new Set(removedProposal.sourceKeys);
    const removalResult = await reconcile({
      existingPlanning: await planningWithSources(),
      sources: fixture.sources.filter((source) => !removedKeys.has(source.sourceKey)),
      proposals: fixture.proposals.slice(1)
    });
    expect(removalResult.issues).toEqual([]);
    expect(removalResult.existingOnly).toHaveLength(2);
    expect(removalResult.existingOnly.map((entry) => entry.sourceKey)).toEqual([...removedKeys].sort());
    expect(dispositions(removalResult.current)).toEqual({ exactMatch: 20 });
  });

  it("handles Scenario G ambiguous current identity, Scenario H project-rule version changes, and unrelated sources", async () => {
    const fixture = await ttiFixture();
    const ambiguousPlanning = await planningWithSources({
      sources: [
        ...fixture.sources.map((source, index) => sourceRecord(source, index + 1)),
        sourceRecord(fixture.sources[0], 90)
      ]
    });
    const ambiguous = await reconcile({ existingPlanning: ambiguousPlanning });
    expect(ambiguous.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ambiguousExistingSourceKey", sourceKey: fixture.sources[0].sourceKey })
    ]));
    expect(ambiguous.current.map((entry) => entry.sourceKey)).not.toContain(fixture.sources[0].sourceKey);
    expect(ambiguous.current).toHaveLength(21);

    const currentProjectRule = fixture.sources.find((source) => source.sourceType === "projectRule")!;
    const oldSource = sourceRecord(
      {
        ...currentProjectRule,
        sourceKey: currentProjectRule.sourceKey.replace(/\|[^|]+$/, "|old-version"),
        version: "old-version"
      },
      91
    );
    const oldProposal = proposalRecord(fixture.proposals[0], 91, [oldSource.sourceId]);
    const versionChange = await reconcile({
      existingPlanning: {
        ...emptyPlanning(),
        sources: [oldSource],
        proposals: [oldProposal]
      }
    });
    expect(versionChange.existingOnly).toEqual([
      expect.objectContaining({
        sourceKey: existingSourceKey(oldSource),
        disposition: "noLongerGenerated",
        existingSourceId: oldSource.sourceId
      })
    ]);
    expect(versionChange.current.find((entry) => entry.sourceKey === currentProjectRule.sourceKey)).toMatchObject({ disposition: "newSource" });

    const unrelatedPlanning = await planningWithSources({
      sources: [
        ...fixture.sources.map((source, index) => sourceRecord(source, index + 1)),
        {
          sourceId: sourceUuid(92),
          sourceType: "userAnswer",
          locator: "intake:unrelated",
          label: "Unrelated source",
          authority: "confirmed",
          availability: "current",
          observedAt: timestamp
        }
      ] as ProjectPlanningState["sources"]
    });
    const unrelated = await reconcile({ existingPlanning: unrelatedPlanning });
    expect(unrelated.issues).toEqual([]);
    expect(dispositions(unrelated.current)).toEqual({ exactMatch: 22 });
  });

  it.each([
    ["current informational", "informational", "current"],
    ["current confirmed", "confirmed", "current"],
    ["stale historical", "informational", "stale"]
  ] as const)("excludes %s user-answer provenance from deterministic source reconciliation", async (_label, authority, availability) => {
    const planning = await planningWithSources();
    const userAnswerSource = {
      sourceId: sourceUuid(93),
      sourceType: "userAnswer",
      locator: `planning:userAnswer:${planning.proposals[0].proposalId}:${proposalUuid(93)}`,
      label: "User answer",
      authority,
      availability,
      observedAt: timestamp
    } as ProjectPlanningState["sources"][number];
    const existingPlanning = {
      ...planning,
      sources: [...planning.sources, userAnswerSource],
      proposals: planning.proposals.map((proposal, index) => index === 0 ? {
        ...proposal,
        sourceIds: [...proposal.sourceIds, userAnswerSource.sourceId]
      } : proposal)
    };
    const before = JSON.stringify(existingPlanning);

    const result = await reconcile({ existingPlanning });

    expect(result.issues).toEqual([]);
    expect(dispositions(result.current)).toEqual({ exactMatch: 22 });
    expect(result.existingOnly).toEqual([]);
    expect(result.nonCurrent).toEqual([]);
    expect(result.current.some((entry) => entry.existingSourceId === userAnswerSource.sourceId)).toBe(false);
    expect(JSON.stringify(result)).not.toContain(userAnswerSource.sourceId);
    expect(JSON.stringify(existingPlanning)).toBe(before);
  });

  it("reports unsupported non-user-answer lineage and unrecognized deterministic source identities without repairing history", async () => {
    const fixture = await ttiFixture();
    const unsupportedSource = {
      sourceId: sourceUuid(93),
      sourceType: "approvedDocument",
      locator: "approved-document:legacy",
      label: "Legacy approved document",
      authority: "approved",
      availability: "current",
      observedAt: timestamp
    } as ProjectPlanningState["sources"][number];
    const unsupportedProposal = proposalRecord(fixture.proposals[0], 93, [unsupportedSource.sourceId]);
    const unsupported = await reconcile({
      existingPlanning: {
        ...emptyPlanning(),
        sources: [unsupportedSource],
        proposals: [unsupportedProposal]
      }
    });
    expect(unsupported.issues).toEqual([
      expect.objectContaining({
        code: "unsupportedExistingClarificationSource",
        existingSourceId: unsupportedSource.sourceId,
        proposalId: unsupportedProposal.proposalId
      })
    ]);

    const unrecognizedSource = sourceRecord(fixture.sources[0], 94, "current", { locator: "planning-rule:" });
    const unrecognizedProposal = proposalRecord(fixture.proposals[0], 94, [unrecognizedSource.sourceId]);
    const unrecognized = await reconcile({
      existingPlanning: {
        ...emptyPlanning(),
        sources: [unrecognizedSource],
        proposals: [unrecognizedProposal]
      }
    });
    expect(unrecognized.issues).toEqual([
      expect.objectContaining({
        code: "unrecognizedExistingSourceIdentity",
        existingSourceId: unrecognizedSource.sourceId,
        proposalId: unrecognizedProposal.proposalId,
        field: "locator"
      })
    ]);
  });

  it("rejects delimiter-bearing persisted identity payloads without deriving malformed source keys", async () => {
    const fixture = await ttiFixture();
    const projectRuleSource = fixture.sources.find((source) => source.sourceType === "projectRule")!;
    const readinessSource = fixture.sources.find((source) => source.sourceType === "readinessPrerequisite")!;
    const cases = [
      {
        source: sourceRecord(projectRuleSource, 95, "current", {
          locator: "planning-rule:pp.canvas.schema.confirmation|legacy"
        }),
        proposal: fixture.proposals.find((proposal) => proposal.sourceKeys.includes(projectRuleSource.sourceKey))!,
        field: "locator",
        malformedKey: "projectRule|pp.canvas.schema.confirmation|legacy|1.0.0"
      },
      {
        source: sourceRecord(projectRuleSource, 96, "current", {
          version: "1.0.0|legacy"
        }),
        proposal: fixture.proposals.find((proposal) => proposal.sourceKeys.includes(projectRuleSource.sourceKey))!,
        field: "version",
        malformedKey: "projectRule|pp.canvas.schema.confirmation|1.0.0|legacy"
      },
      {
        source: sourceRecord(readinessSource, 97, "current", {
          locator: "phase-gate:schema|legacy"
        }),
        proposal: fixture.proposals.find((proposal) => proposal.sourceKeys.includes(readinessSource.sourceKey))!,
        field: "locator",
        malformedKey: "readinessPrerequisite|schema|legacy"
      }
    ] as const;

    for (const entry of cases) {
      const existingPlanning = {
        ...emptyPlanning(),
        sources: [entry.source],
        proposals: [proposalRecord(entry.proposal, 95, [entry.source.sourceId])]
      };
      const before = JSON.stringify(existingPlanning);
      const reconciled = await reconcile({ existingPlanning });

      expect(reconciled.issues).toEqual([
        expect.objectContaining({
          code: "unrecognizedExistingSourceIdentity",
          existingSourceId: entry.source.sourceId,
          field: entry.field
        })
      ]);
      expect(reconciled.existingOnly.map((source) => source.existingSourceId)).not.toContain(entry.source.sourceId);
      expect(reconciled.current.some((source) => source.existingSourceId === entry.source.sourceId)).toBe(false);
      expect(JSON.stringify(reconciled)).not.toContain(entry.malformedKey);
      expect(JSON.stringify(existingPlanning)).toBe(before);
    }
  });

  it("is deterministic across reversed existing and generated input order", async () => {
    const fixture = await ttiFixture();
    const existingPlanning = await planningWithSources();
    const forward = await reconcile({ existingPlanning });
    const reversed = await reconcile({
      existingPlanning: {
        ...existingPlanning,
        sources: [...existingPlanning.sources].reverse(),
        proposals: [...existingPlanning.proposals].reverse()
      },
      sources: [...fixture.sources].reverse(),
      proposals: [...fixture.proposals].reverse()
    });
    expect(reversed).toEqual(forward);
  });

  it("preserves immutability, defensive copies, and prior clarification contracts", async () => {
    const fixture = await ttiFixture();
    const existingPlanning = await planningWithSources();
    const root = {
      projectId,
      existingPlanning,
      sources: fixture.sources,
      proposals: fixture.proposals
    };
    const beforeRoot = JSON.stringify(root);
    const first = await reconcilePlanningClarificationSources(root);
    expect(JSON.stringify(root)).toBe(beforeRoot);

    (first.current as PlanningClarificationSourceCurrentReconciliation[]).pop();
    (first.existingOnly as Array<unknown>).push({ changed: true });
    (first.nonCurrent as Array<unknown>).push({ changed: true });
    (first.issues as Array<unknown>).push({ code: "invalidInput", message: "changed" });
    const second = await reconcile({ existingPlanning });
    expect(second.current).toHaveLength(22);
    expect(second.existingOnly).toEqual([]);
    expect(second.nonCurrent).toEqual([]);
    expect(second.issues).toEqual([]);

    const drafts = generatePlanningClarificationDrafts({
      projectId,
      projectType: "powerAppsCanvas",
      gateResults: ruleIds.map((ruleId) => gate(getPlanningRuleById(ruleId)!.target.targetKey, ttiStatuses[getPlanningRuleById(ruleId)!.target.targetKey]))
    });
    expect(drafts.drafts).toHaveLength(11);
    const blueprints = generatePlanningClarificationBlueprints({ projectId, drafts: drafts.drafts });
    expect(blueprints.sources).toHaveLength(22);
    expect((await generatePlanningClarificationFingerprints({
      projectId,
      sources: blueprints.sources,
      proposals: blueprints.proposals
    })).fingerprints).toHaveLength(11);
    expect((await reconcilePlanningClarifications({
      projectId,
      existingPlanning: emptyPlanning(),
      sources: blueprints.sources,
      proposals: blueprints.proposals,
      fingerprints: (await generatePlanningClarificationFingerprints({
        projectId,
        sources: blueprints.sources,
        proposals: blueprints.proposals
      })).fingerprints
    })).current).toHaveLength(11);
  });

  it("keeps source reconciliation local, read-only, TTI-safe, and isolated from readiness/output behavior", async () => {
    const result = await reconcile();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/HomeScreen|SubmitButton|AdminGroup|Patch\(|Set\(|Collect\(|screens:\s*\n|controls:\s*\n|release approved|owner assigned/i);
    expect(serialized).not.toMatch(/readyForCodex|readinessEligible|outputEligible|reviewStatus|projectStatus|packagePreview|manifest|zip/i);
    expect(serialized).not.toMatch(/sourceId":"[0-9a-f-]{36}","disposition":"newSource"/);

    const source = readFileSync("src/lib/planningClarificationSourceReconciliation.ts", "utf8");
    expect(source).not.toMatch(/randomUUID|Math\.random|crypto\.getRandomValues/);
    expect(source).not.toMatch(/Date\.now|new Date|performance\.now|createdAt:\s|updatedAt:\s|staleAt:\s|observedAt:\s/);
    expect(source).not.toMatch(/projectRepository|storageVersion|STORAGE_KEY|localStorage|browserStorage/);
    expect(source).not.toMatch(/from\s+["']\.\.?\/components|from\s+["']\.\.?\/app|use[A-Z][A-Za-z]+\(/);
    expect(source).not.toMatch(/generateProjectPackage|documentReview|exportManifest|exportProjectPackage|exportIntegrity/);
    expect(source).not.toMatch(/buildPhaseGateResults|evaluatePhaseGate|isPhaseGatePassing|PHASE_GATE_EVALUATORS/);
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|axios|navigator\.sendBeacon/);
    expect(source).not.toMatch(/provider|modelId|modelName|modelProvider|apiKey|api_key|accessToken|refreshToken|telemetry/i);
    expect(source).not.toMatch(/createPlanningProposal|createPlanningSource|appendDecision|createDependency|createConflict/);
    expect(source).not.toMatch(/markStale|markSuperseded|supersededByProposalId:\s|reopen|confirmProposal|rejectProposal/i);
  });
});
