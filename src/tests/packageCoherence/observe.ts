import { createProject, getProjectById, saveGeneratedDocuments, updateProjectFields, updateReadinessConfirmation } from "../../lib/projectRepository";
import { generateProjectPackage } from "../../lib/generateProjectPackage";
import { getClientReviewReadiness } from "../../lib/clientReview";
import { ecommerceDecisionState } from "../../lib/ecommerceDecisions";
import { getDocumentReviewItems } from "../../lib/documentReview";
import { evaluateGeneratedPackageReadiness } from "../../lib/generatedPackageReadiness";
import { validateExportPackage } from "../../lib/exportIntegrity";
import { createExportManifest, renderExportManifestMarkdown } from "../../lib/exportManifest";
import { getProjectDisplayStatus } from "../../lib/projectSelectors";
import type { StorageState } from "../../types/project";
import { I, C, E, T } from "../lifecycle/fixtures";
import { LifecycleMemoryStorage } from "../lifecycle/observe";
import { INPUT_CASES } from "./fixtures";
import type { CaseId, PackageObservation } from "./types";

/** Only this observer calls production. It never constructs semantic expected results. */
export function observeApprovedPackages(setClock: (time: string) => void): PackageObservation[] {
  const observations: PackageObservation[] = [];
  for (const fixture of INPUT_CASES) {
    const storage = new LifecycleMemoryStorage();
    const events: PackageObservation["events"] = [];
    const event = <R>(operation: string, time: string, action: () => R): R => {
      setClock(time);
      events.push({ operation, time });
      return action();
    };
    const current = () => {
      const project = getProjectById(I.identity.id, storage);
      if (!project) throw new Error("Approved package fixture project is absent.");
      return project;
    };
    event("create", T[0], () => createProject(I, storage));
    event("fields", T[1], () => updateProjectFields(I.identity.id, { ...C, ...fixture.changes }, storage));
    let output = event("generate", T[2], () => generateProjectPackage(current()));
    event("save", T[3], () => saveGeneratedDocuments(I.identity.id, output.documents, storage));
    if (fixture.confirm) {
      for (const [index, key] of (["scopeReviewed", "acceptanceCriteriaReviewed", "draftPackageReviewed"] as const).entries()) {
        event(`confirm:${key}`, T[index + 4], () => updateReadinessConfirmation(I.identity.id, key, true, storage));
      }
      output = event("generate", T[7], () => generateProjectPackage(current()));
      event("save", T[7], () => saveGeneratedDocuments(I.identity.id, output.documents, storage));
    }
    let retained: PackageObservation["retainedReadyDocuments"] = null;
    function capture(caseId: CaseId) {
      const before = storage.raw();
      const state = JSON.parse(before!) as StorageState;
      const project = state.projects[0];
      if (state.projects.length !== 1) throw new Error("Package fixture exceeds its one-project bound.");
      const review = getClientReviewReadiness(project);
      const decisions = ecommerceDecisionState(project);
      const integrity = validateExportPackage(project, "2026-10-17T13:00:00.000Z");
      const manifest = createExportManifest(project, integrity);
      const observed: PackageObservation = {
        authority: "none", observationVersion: "1.0.0", caseId, projectType: project.intake.appType,
        project, displayStatus: getProjectDisplayStatus(project), activeId: state.activeProjectId, storageVersion: state.version,
        folders: [...output.folders], documents: project.generatedDocuments,
        decisions: decisions.decisions.map(({ id, gate, status, question, answer, reason, field }) => ({ id, gate, status, question, answer, reason, field })),
        decisionSummary: {
          unresolvedDecisionCount: decisions.unresolved.length, implementationBlockingDecisionCount: decisions.implementationBlockers.length,
          launchBlockingDecisionCount: decisions.launchBlockers.length, planningReady: decisions.planningReady,
          implementationReady: decisions.implementationReady, launchReady: decisions.launchReady
        },
        review: { ready: review.isReady, checks: review.checklist.map(({ id, label, passed }) => ({ id, label, passed })) },
        readiness: evaluateGeneratedPackageReadiness(project),
        documentStatuses: Object.fromEntries(getDocumentReviewItems(project.generatedDocuments, project).map(d => [d.fileName, d.status])),
        integrity, manifest, markdownManifest: renderExportManifestMarkdown(manifest), events: [...events], retainedReadyDocuments: retained
      };
      if (storage.raw() !== before) throw new Error("Package observation modified injected storage.");
      observations.push(structuredClone(observed));
    }
    capture(fixture.id);
    if (fixture.id === "PC-002") {
      retained = structuredClone(current().generatedDocuments);
      event("fields:purpose", T[8], () => updateProjectFields(I.identity.id, E, storage));
      capture("PC-008");
      output = event("generate", T[10], () => generateProjectPackage(current()));
      event("save", T[10], () => saveGeneratedDocuments(I.identity.id, output.documents, storage));
      capture("PC-009");
    }
  }
  return observations.sort((a, b) => a.caseId.localeCompare(b.caseId));
}
