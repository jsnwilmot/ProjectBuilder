import { createSeedProject } from "../data/seedProject";
import { createProject } from "../lib/createProject";
import {
  deriveReviewItems,
  formatClientQuestions,
  getClientReviewReadiness,
  groupClientQuestions,
  reviewItemBlocksReadiness,
  updateReviewItemDecision
} from "../lib/clientReview";

describe("client review workflow", () => {
  it("derives missing and weak review items with client-friendly metadata", () => {
    const project = createProject({
      identity: { id: "review", projectName: "Review Project" },
      intake: { appType: "Business website", audienceVisibility: "Public-facing" }
    });
    const items = deriveReviewItems(project, "2026-07-03T12:00:00.000Z");

    expect(items.some((item) => item.section === "Foundation" && item.fieldKey === "clientName")).toBe(true);
    expect(items.some((item) => item.section === "Features" && item.fieldKey === "screens" && item.source === "weak")).toBe(true);
    expect(items.every((item) => item.recommendedQuestion.length > 0)).toBe(true);
  });

  it("groups and formats unresolved client questions in the required section order", () => {
    const items = deriveReviewItems(createProject({ identity: { id: "questions" } }));
    const groups = groupClientQuestions(items);
    const text = formatClientQuestions(items);

    expect(groups[0].section).toBe("Foundation");
    expect(text).toContain("Foundation");
    expect(text).toContain("- ");
    expect(text).not.toContain("fieldKey");
  });

  it("clears Answered items and requires a reason for Not applicable", () => {
    const item = deriveReviewItems(createProject({ identity: { id: "decisions" } }))[0];
    const answered = updateReviewItemDecision(item, { status: "Answered" });
    const notApplicable = updateReviewItemDecision(item, { status: "Not applicable" });
    const explained = updateReviewItemDecision(notApplicable, { notApplicableReason: "This project has no client sponsor." });

    expect(reviewItemBlocksReadiness(answered)).toBe(false);
    expect(reviewItemBlocksReadiness(notApplicable)).toBe(true);
    expect(reviewItemBlocksReadiness(explained)).toBe(false);
  });

  it("keeps blocking deferred items blocked and permits explicitly allowed deferrals", () => {
    const project = createSeedProject();
    const items = deriveReviewItems(project);
    const allowed = items.find((item) => item.allowDeferred);
    expect(allowed).toBeDefined();

    const deferredAllowed = updateReviewItemDecision(allowed!, {
      status: "Deferred",
      deferredReason: "Client will confirm during visual design."
    });
    const blocking = {
      ...deferredAllowed,
      blocking: true,
      allowDeferred: false
    };

    expect(reviewItemBlocksReadiness(deferredAllowed)).toBe(false);
    expect(reviewItemBlocksReadiness(blocking)).toBe(true);
  });

  it("allows Ready for Codex only after review decisions, confirmations, and generation are complete", () => {
    const project = createSeedProject();
    const reviewed = {
      ...project,
      reviewItems: deriveReviewItems(project).map((item) => ({ ...item, status: "Answered" as const })),
      readinessConfirmations: {
        scopeReviewed: true,
        acceptanceCriteriaReviewed: true,
        draftPackageReviewed: true
      },
      packageGeneratedAt: "2026-07-03T12:00:00.000Z"
    };

    expect(getClientReviewReadiness(project).isReady).toBe(false);
    expect(getClientReviewReadiness(reviewed).isReady).toBe(true);

    const stale = { ...reviewed, packageGeneratedAt: null };
    expect(getClientReviewReadiness(stale).blockers).toContain(
      "Regenerate the package after the final review decisions."
    );
  });
});
