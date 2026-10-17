import { beforeAll, describe, expect, it, vi } from "vitest";
import { assertLifecycle, LIFECYCLE_CONTRACTS, type LifecycleInvariantId } from "./lifecycle/contract";
import { CHECKPOINTS } from "./lifecycle/expectations";
import { A, B, C, E, I, M, R, T } from "./lifecycle/fixtures";
import type { LifecycleObservation } from "./lifecycle/observe";
import { executeApprovedTraces } from "./lifecycle/traces";

let observations: LifecycleObservation[];
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const browserReads = vi.spyOn(Storage.prototype, "getItem");
  const browserWrites = vi.spyOn(Storage.prototype, "setItem");
  vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(B);
  try {
    observations = executeApprovedTraces(instant => vi.setSystemTime(instant));
    expect(browserReads).not.toHaveBeenCalled();
    expect(browserWrites).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
    vi.restoreAllMocks();
  }
});

function observation(id: string): LifecycleObservation {
  const found = observations.find(candidate => candidate.checkpoint === id);
  if (!found) throw new Error(`Approved checkpoint ${id} did not execute.`);
  return found;
}
function expectation(id: string) {
  const found = CHECKPOINTS.find(candidate => candidate.id === id);
  if (!found) throw new Error(`No independently authored expectation for ${id}.`);
  return found;
}

describe("Phase 6D.4 bounded Ecommerce lifecycle v1.0.0", () => {
  it.each(CHECKPOINTS)("$id checks the literal checkpoint and every applicable frame", expected => {
    const observed = observation(expected.id);
    const contracts = LIFECYCLE_CONTRACTS.filter(contract => contract.checkpoints.includes(expected.id));
    expect(contracts.length).toBeGreaterThanOrEqual(3);
    for (const contract of contracts) {
      const result = assertLifecycle(contract.id, observed, expected);
      expect(result, JSON.stringify({ checkpoint: expected.id, result }, null, 2)).toMatchObject({
        invariantId: contract.id, definitionVersion: "1.0.0", observationVersion: "1.0.0",
        authority: "none", status: "satisfied", violations: []
      });
      expect(result.checks).toBeGreaterThan(0);
    }
  });

  it("pins the approved budget, versions, applicability, identities and meaningful edit", () => {
    expect(observations.map(event => event.checkpoint)).toEqual([
      "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7g", "A7s", "A8", "A9", "A10g", "A10s",
      "B0", "B1", "B2", "B3", "B4", "C0", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"
    ]);
    expect(LIFECYCLE_CONTRACTS.map(contract => contract.id)).toEqual([
      "PB-INV-LIFECYCLE-001", "PB-INV-LIFECYCLE-002", "PB-INV-LIFECYCLE-003",
      "PB-INV-LIFECYCLE-004", "PB-INV-LIFECYCLE-005", "PB-INV-LIFECYCLE-006"
    ]);
    for (const contract of LIFECYCLE_CONTRACTS) expect(contract).toMatchObject({
      authority: "none", definitionVersion: "1.0.0", observationVersion: "1.0.0",
      applicability: { projectTypes: ["ecommerceSite"], traces: ["A", "B", "C"], maximumProjects: 2 }
    });
    expect([A, B, M]).toEqual([
      "00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000099"
    ]);
    expect(I.intake).toEqual({ appType: "ecommerceSite" });
    expect(E).toEqual({ appPurpose: "Sell synthetic downloadable templates through a keyboard-first fictional storefront." });
    expect(R).toEqual({ appPurpose: "Sell synthetic downloadable templates through one fictional storefront." });
    expect(C.appPurpose).toBe(R.appPurpose);
    expect(T).toHaveLength(18);
    expect(observations.every(event => event.projects.length <= 2)).toBe(true);
    expect(observations.filter(event => event.operation === "generate").map(event => event.checkpoint)).toEqual(["A2", "A7g", "A10g"]);
  });

  it("reports the exact number of independent contract comparisons across the 27 trace events", () => {
    const results = CHECKPOINTS.flatMap(expected => LIFECYCLE_CONTRACTS
      .filter(contract => contract.checkpoints.includes(expected.id))
      .map(contract => assertLifecycle(contract.id, observation(expected.id), expected)));
    expect(results.every(result => result.status === "satisfied")).toBe(true);
    expect(results.every(result => result.violations.length === 0)).toBe(true);
    console.info(`[lifecycle] 27 events; ${results.length} contract applications; ${results.reduce((total, result) => total + result.checks, 0)} passing independent comparisons`);
  });

  it("characterizes derived review-card timestamp refresh without treating it as source mutation", () => {
    for (const id of ["B0", "B1"]) {
      const observed = observation(id);
      for (const project of observed.projects) {
        expect(project.storedReviewCardTimes).toEqual([observed.time, observed.time, observed.time]);
        expect(project.projectedReviewCardTimes).toEqual([observed.time, observed.time, observed.time]);
      }
    }
    for (const project of observation("B4").projects) {
      expect(project.storedReviewCardTimes).toEqual([T[14], T[14], T[14]]);
      expect(project.projectedReviewCardTimes).toEqual([T[15], T[15], T[15]]);
    }
    expect(observation("B4").afterRaw).toBe(observation("B4").beforeRaw);
  });

  it("returns notApplicable, never satisfaction, outside the approved scope", () => {
    const actual = observation("A7s");
    const wrongDomain = structuredClone(actual);
    wrongDomain.projects[0].raw.intake.appType = "webApplication";
    const controls = [wrongDomain, { ...actual, checkpoint: "unapproved" }, { ...actual, operation: "archive" as const }];
    for (const observed of controls) for (const contract of LIFECYCLE_CONTRACTS) {
      const result = assertLifecycle(contract.id, observed, expectation("A7s"));
      expect(result).toMatchObject({ authority: "none", status: "notApplicable", checks: 0, violations: [] });
    }
    expect(assertLifecycle("PB-INV-LIFECYCLE-004", actual, expectation("A7s")).status).toBe("notApplicable");
  });

  it("keeps observations, expectations and repeated assertion results unchanged", () => {
    const actual = observation("A8");
    const expected = expectation("A8");
    const original = structuredClone({ actual, expected });
    for (const id of ["PB-INV-LIFECYCLE-001", "PB-INV-LIFECYCLE-002", "PB-INV-LIFECYCLE-003"] as const) {
      expect(assertLifecycle(id, actual, expected)).toEqual(assertLifecycle(id, actual, expected));
    }
    expect({ actual, expected }).toEqual(original);
  });
});

const sensitivities: { name: string; id: string; invariant: LifecycleInvariantId; code: string; corrupt: (event: LifecycleObservation) => void }[] = [
  { name: "unrelated source edit", id: "B0", invariant: "PB-INV-LIFECYCLE-001", code: `${A}.intake.permissionRules`, corrupt: event => { event.projects[0].raw.intake.permissionRules = "Unauthorized changed policy"; } },
  { name: "resurrected timestamp after revert", id: "A9", invariant: "PB-INV-LIFECYCLE-002", code: `${A}.stamp`, corrupt: event => { event.projects[0].raw.packageGeneratedAt = T[7]; } },
  { name: "lost retained document", id: "A8", invariant: "PB-INV-LIFECYCLE-002", code: `${A}.retainedDocuments`, corrupt: event => { event.projects[0].raw.generatedDocuments[0].content = "Changed stale output"; } },
  { name: "stored status grants premature Ready", id: "A6", invariant: "PB-INV-LIFECYCLE-003", code: `${A}.storedStatus`, corrupt: event => { event.projects[0].raw.status = "Ready for Codex"; } },
  { name: "display grants premature Ready", id: "A6", invariant: "PB-INV-LIFECYCLE-003", code: `${A}.displayStatus`, corrupt: event => { event.projects[0].displayStatus = "Ready for Codex"; } },
  { name: "overall review label changes independently", id: "A6", invariant: "PB-INV-LIFECYCLE-003", code: `${A}.reviewStatus`, corrupt: event => { event.projects[0].raw.reviewStatus = "Approved"; } },
  { name: "Client Review grants premature Ready", id: "A6", invariant: "PB-INV-LIFECYCLE-003", code: `${A}.clientReviewReady`, corrupt: event => { event.projects[0].clientReviewReady = true; } },
  { name: "package grants premature Ready", id: "A6", invariant: "PB-INV-LIFECYCLE-003", code: `${A}.packageReadiness`, corrupt: event => { event.projects[0].packageReadiness = "Ready for Codex"; } },
  { name: "missing manual confirmation", id: "A7s", invariant: "PB-INV-LIFECYCLE-003", code: `${A}.confirmations`, corrupt: event => { event.projects[0].raw.readinessConfirmations.scopeReviewed = false; } },
  { name: "incorrect stored count", id: "A7s", invariant: "PB-INV-LIFECYCLE-003", code: `${A}.storedCount`, corrupt: event => { event.projects[0].raw.generatedFileCount = 18; } },
  { name: "inherited duplicate package", id: "B0", invariant: "PB-INV-LIFECYCLE-004", code: "duplicateDocuments", corrupt: event => { event.projects[1].raw.generatedDocuments = structuredClone(event.projects[0].raw.generatedDocuments); event.projects[1].raw.packageGeneratedAt = T[10]; } },
  { name: "archive loses review flags", id: "B2", invariant: "PB-INV-LIFECYCLE-005", code: `${A}.archiveFrame`, corrupt: event => { event.projects[0].raw.readinessConfirmations = {}; } },
  { name: "wrong archive fallback", id: "B2", invariant: "PB-INV-LIFECYCLE-005", code: "activeFallback", corrupt: event => { event.activeId = A; } },
  { name: "failed write changed persisted bytes", id: "C7", invariant: "PB-INV-LIFECYCLE-006", code: "failedTransitionBytes", corrupt: event => { event.afterRaw = `${event.afterRaw} `; } }
];

describe("Lifecycle oracle sensitivity", () => {
  it.each(sensitivities)("rejects $name", ({ id, invariant, code, corrupt }) => {
    const original = observation(id);
    expect(assertLifecycle(invariant, original, expectation(id)).status).toBe("satisfied");
    const wrong = structuredClone(original);
    corrupt(wrong);
    const result = assertLifecycle(invariant, wrong, expectation(id));
    expect(result.status).toBe("violated");
    expect(result.violations.map(violation => violation.code)).toContain(code);
    expect(original).toEqual(observation(id));
  });
});
