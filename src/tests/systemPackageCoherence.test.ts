import { beforeAll, describe, expect, it, vi } from "vitest";
import { assertPackage, PACKAGE_CONTRACTS } from "./packageCoherence/contract";
import { EXPECTATIONS, PATHS, FOLDERS } from "./packageCoherence/expectations";
import { observeApprovedPackages } from "./packageCoherence/observe";
import { NEGATIVE_CONTROLS } from "./packageCoherence/sensitivity";
import type { PackageObservation } from "./packageCoherence/types";

let observations: PackageObservation[];
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const reads = vi.spyOn(Storage.prototype, "getItem");
  const writes = vi.spyOn(Storage.prototype, "setItem");
  const removals = vi.spyOn(Storage.prototype, "removeItem");
  try {
    observations = observeApprovedPackages(time => vi.setSystemTime(time));
    expect(reads).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled(); expect(removals).not.toHaveBeenCalled();
  } finally { vi.useRealTimers(); vi.restoreAllMocks(); }
}, 120_000); // Fixed seven isolated setups and fourteen generations, including coverage on hosted CI.

const observed = (id: string) => {
  const value = observations.find(o => o.caseId === id);
  if (!value) throw new Error(`Approved package checkpoint ${id} did not execute.`);
  return value;
};

describe("Phase 6D.5 bounded package coherence v1.0.0", () => {
  it.each(EXPECTATIONS)("$id satisfies every applicable independently authored contract", e => {
    for (const contract of PACKAGE_CONTRACTS.filter(c => c.cases.includes(e.id))) {
      const result = assertPackage(contract.id, observed(e.id));
      expect(result, JSON.stringify(result, null, 2)).toMatchObject({ invariantId: contract.id, authority: "none", definitionVersion: "1.0.0", observationVersion: "1.0.0", status: "satisfied", violations: [] });
      expect(result.checks).toBeGreaterThan(0);
    }
  });

  it("pins nine cases, all six contracts and exact applicability", () => {
    const allCases = ["PC-001", "PC-002", "PC-003", "PC-004", "PC-005", "PC-006", "PC-007", "PC-008", "PC-009"];
    expect(observations.map(o => o.caseId)).toEqual(allCases);
    expect(PACKAGE_CONTRACTS.map(c => c.id)).toEqual(["PB-INV-PACKAGE-001", "PB-INV-PACKAGE-002", "PB-INV-PACKAGE-003", "PB-INV-PACKAGE-004", "PB-INV-PACKAGE-005", "PB-INV-PACKAGE-006"]);
    expect(PACKAGE_CONTRACTS.map(c => c.cases.length)).toEqual([9, 9, 9, 9, 8, 3]);
    expect(PACKAGE_CONTRACTS.map(c => c.cases)).toEqual([
      allCases, allCases, allCases, allCases,
      ["PC-001", "PC-002", "PC-003", "PC-004", "PC-005", "PC-006", "PC-007", "PC-009"],
      ["PC-002", "PC-008", "PC-009"]
    ]);
    for (const contract of PACKAGE_CONTRACTS) expect(contract).toMatchObject({ authority: "none", definitionVersion: "1.0.0", observationVersion: "1.0.0", applicability: { projectType: "ecommerceSite", maximumProjects: 1 } });
    expect(PATHS).toHaveLength(19); expect(FOLDERS).toHaveLength(12);
    expect(FOLDERS.filter(f => f.expectedFileCount > 0)).toHaveLength(11);
  });

  it("pins the exact approved operation clocks and linked sequence", () => {
    const draft = [
      { operation: "create", time: "2026-10-17T12:00:00.000Z" }, { operation: "fields", time: "2026-10-17T12:01:00.000Z" },
      { operation: "generate", time: "2026-10-17T12:02:00.000Z" }, { operation: "save", time: "2026-10-17T12:03:00.000Z" }
    ];
    const reviewed = [...draft,
      { operation: "confirm:scopeReviewed", time: "2026-10-17T12:04:00.000Z" }, { operation: "confirm:acceptanceCriteriaReviewed", time: "2026-10-17T12:05:00.000Z" },
      { operation: "confirm:draftPackageReviewed", time: "2026-10-17T12:06:00.000Z" }, { operation: "generate", time: "2026-10-17T12:07:00.000Z" }, { operation: "save", time: "2026-10-17T12:07:00.000Z" }
    ];
    const stale = [...reviewed, { operation: "fields:purpose", time: "2026-10-17T12:08:00.000Z" }];
    expect(observed("PC-001").events).toEqual(draft);
    for (const id of ["PC-002", "PC-003", "PC-004", "PC-005", "PC-006", "PC-007"]) expect(observed(id).events).toEqual(reviewed);
    expect(observed("PC-008").events).toEqual(stale);
    expect(observed("PC-009").events).toEqual([...stale, { operation: "generate", time: "2026-10-17T12:10:00.000Z" }, { operation: "save", time: "2026-10-17T12:10:00.000Z" }]);
    expect(observed("PC-008").documents).toEqual(observed("PC-002").documents);
    expect(observed("PC-009").retainedReadyDocuments).toEqual(observed("PC-002").documents);
  });

  it("keeps oracle results deterministic and both observations and expectations unchanged", () => {
    const before = JSON.stringify({ observations, EXPECTATIONS, PACKAGE_CONTRACTS });
    const results = observations.flatMap(o => PACKAGE_CONTRACTS.filter(c => c.cases.includes(o.caseId)).map(c => {
      const first = assertPackage(c.id, o); expect(assertPackage(c.id, o)).toEqual(first); return first;
    }));
    expect(JSON.stringify({ observations, EXPECTATIONS, PACKAGE_CONTRACTS })).toBe(before);
    expect(results).toHaveLength(47);
    console.info(`[package coherence] 9 cases; ${results.length} applicable contracts; ${results.reduce((n, r) => n + r.checks, 0)} independent comparisons; ${NEGATIVE_CONTROLS.length} corruptions`);
  });
});

describe("Package oracle sensitivity NEG-001 through NEG-015", () => {
  it.each(NEGATIVE_CONTROLS)("$family / $name", control => {
    const original = observed(control.caseId);
    expect(assertPackage(control.invariantId, original).status).toBe("satisfied");
    const corrupted = structuredClone(original);
    control.corrupt(corrupted);
    const result = assertPackage(control.invariantId, corrupted);
    expect(result.invariantId).toBe(control.invariantId);
    expect(result.status, JSON.stringify(result.violations)).toBe("violated");
    for (const location of control.locations) expect(result.violations.some(v => v.location.startsWith(location)), JSON.stringify(result.violations)).toBe(true);
    if (control.family === "NEG-012") {
      const manifest = assertPackage("PB-INV-PACKAGE-001", corrupted);
      expect(manifest.status).toBe("violated");
      expect(manifest.violations.map(v => v.location)).toEqual(expect.arrayContaining(["manifest.missingInformationMarkerCount", "markdownManifest.summary"]));
    }
  });

  it("NEG-015 unsupported domain, case, version and stale fresh-contract applicability never satisfy", () => {
    for (const patch of [{ projectType: "powerAppsCanvas" }, { caseId: "PC-UNKNOWN" }, { observationVersion: "2.0.0" }]) {
      const unsupported = { ...structuredClone(observed("PC-002")), ...patch } as PackageObservation;
      for (const contract of PACKAGE_CONTRACTS) expect(assertPackage(contract.id, unsupported)).toMatchObject({ status: "notApplicable", checks: 0, violations: [], reason: expect.any(String) });
    }
    expect(assertPackage("PB-INV-PACKAGE-005", observed("PC-008")).status).toBe("notApplicable");
    expect(assertPackage("PB-INV-PACKAGE-006", observed("PC-001")).status).toBe("notApplicable");
  });

  it("pins every approved negative-control family and preserves legitimate source evidence", () => {
    expect([...new Set(NEGATIVE_CONTROLS.map(c => c.family))]).toEqual(Array.from({ length: 15 }, (_, i) => `NEG-${String(i + 1).padStart(3, "0")}`));
    const conflict = observed("PC-004");
    for (const word of ["Square", "USD"]) expect(conflict.documents.find(d => d.fileName === "TEST_PLAN.md")!.content).toContain(word);
    // Guest checkout remains in the approved ledger and acceptance source projection;
    // the Test Plan's acceptance excerpt does not contain that phrase.
    for (const name of ["CLIENT_QUESTIONS.md", "ACCEPTANCE_CRITERIA.md"]) expect(conflict.documents.find(d => d.fileName === name)!.content.toLowerCase()).toContain("guest checkout");
    expect(assertPackage("PB-INV-PACKAGE-003", conflict).status).toBe("satisfied");
    for (const id of ["PC-006", "PC-007"]) {
      const plan = observed(id).documents.find(d => d.fileName === "TEST_PLAN.md")!.content;
      expect(plan).toContain("| Digital delivery |"); expect(plan).toContain("| Order lookup |");
      expect(assertPackage("PB-INV-PACKAGE-003", observed(id)).status).toBe("satisfied");
    }
  });
});
