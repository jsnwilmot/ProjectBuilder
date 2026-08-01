import { createProject } from "../lib/createProject";
import { buildImplementationAssetRegistry } from "../lib/implementationAssets";
import {
  buildRecordLifecycleFormulaReviewSummary,
  RECORD_LIFECYCLE_FORMULA_REVIEW_SUMMARY_SAFETY_NOTICES
} from "../lib/recordLifecycleFormulaReviewSummary";
import { buildRecordLifecycleFormulaReviewPanelViewModel } from "../lib/recordLifecycleFormulaReviewPanelViewModel";

const NOW = "2026-07-31T12:00:00.000Z";

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("buildRecordLifecycleFormulaReviewPanelViewModel", () => {
  it("returns the summary projection for a non-applicable project", () => {
    const project = createProject({
      identity: { id: "web-project", projectName: "Web Project" },
      intake: { appType: "webApplication" },
      now: NOW
    });
    const implementationRegistry = buildImplementationAssetRegistry(project, NOW);

    expect(buildRecordLifecycleFormulaReviewPanelViewModel({
      project,
      implementationRegistry,
      reviewReference: undefined
    })).toEqual(buildRecordLifecycleFormulaReviewSummary({
      project,
      implementationRegistry,
      reviewReference: undefined
    }));
  });

  it("preserves blocked malformed-registry behavior from the summary projection", () => {
    const project = createProject({
      identity: { id: "malformed-registry", projectName: "Malformed Registry" },
      intake: { appType: "powerAppsCanvas" },
      now: NOW
    });
    const implementationRegistry = { assets: "not-an-array" };

    const viewModel = buildRecordLifecycleFormulaReviewPanelViewModel({
      project,
      implementationRegistry
    });

    expect(viewModel).toEqual(buildRecordLifecycleFormulaReviewSummary({ project, implementationRegistry }));
    expect(viewModel.reviewState).toBe("Blocked");
    expect(viewModel.formulaBlockers).toContain("Formula review state requires an implementation asset array.");
  });

  it("passes review references through to the summary projection without parsing them locally", () => {
    const project = createProject({
      identity: { id: "reference-pass-through", projectName: "Reference Pass Through" },
      intake: { appType: "powerAppsCanvas" },
      now: NOW
    });
    const implementationRegistry = buildImplementationAssetRegistry(project, NOW);
    const reviewReference = {
      assetId: "record-lifecycle-power-fx",
      reviewContractVersion: "phase-5b.4d.2.1",
      reviewContractChecksum: "stale-checksum"
    };

    expect(buildRecordLifecycleFormulaReviewPanelViewModel({
      project,
      implementationRegistry,
      reviewReference
    })).toEqual(buildRecordLifecycleFormulaReviewSummary({
      project,
      implementationRegistry,
      reviewReference
    }));
  });

  it("does not mutate project input while building the panel view model", () => {
    const project = createProject({
      identity: { id: "immutability-project", projectName: "Immutability Project" },
      intake: { appType: "powerAppsCanvas" },
      now: NOW
    });
    const projectBefore = cloneDeep(project);
    const implementationRegistry = buildImplementationAssetRegistry(project, NOW);

    buildRecordLifecycleFormulaReviewPanelViewModel({
      project,
      implementationRegistry,
      reviewReference: undefined
    });

    expect(project).toEqual(projectBefore);
  });

  it("does not mutate registry input while delegating to the summary projection", () => {
    const project = createProject({
      identity: { id: "registry-immutability", projectName: "Registry Immutability" },
      intake: { appType: "powerAppsCanvas" },
      now: NOW
    });
    const implementationRegistry = { assets: [], dependencyIssues: ["Record lifecycle dependency is unresolved."] };
    const registryBefore = cloneDeep(implementationRegistry);

    buildRecordLifecycleFormulaReviewPanelViewModel({
      project,
      implementationRegistry,
      reviewReference: undefined
    });

    expect(implementationRegistry).toEqual(registryBefore);
  });

  it("returns safety notices from the shared summary contract", () => {
    const project = createProject({
      identity: { id: "safety-contract", projectName: "Safety Contract" },
      intake: { appType: "webApplication" },
      now: NOW
    });

    expect(buildRecordLifecycleFormulaReviewPanelViewModel({
      project,
      implementationRegistry: { assets: [] }
    }).safetyNotices).toEqual([...RECORD_LIFECYCLE_FORMULA_REVIEW_SUMMARY_SAFETY_NOTICES]);
  });

  it("keeps reviewer notes and formula source out of malformed summary output", () => {
    const project = createProject({
      identity: { id: "privacy-boundary", projectName: "Privacy Boundary" },
      intake: { appType: "powerAppsCanvas" },
      now: NOW
    });

    const output = JSON.stringify(buildRecordLifecycleFormulaReviewPanelViewModel({
      project,
      implementationRegistry: {
        assets: [],
        dependencyIssues: ["Record lifecycle dependency is unresolved."]
      },
      reviewReference: {
        assetId: "Patch({ raw: true })",
        reviewContractVersion: "phase-5b.4d.2.1",
        reviewContractChecksum: "fnv1a-checksum"
      }
    }));

    expect(output).not.toMatch(/reviewerDisplayName|reviewerRole|notes|Patch\(\{|sourceContent/i);
  });
});
