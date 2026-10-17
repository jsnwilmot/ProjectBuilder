import type { ProjectRecord, StorageState } from "../../types/project";
import type { CheckpointExpectation } from "./expectations";
import { CHECKPOINTS } from "./expectations";
import { A, B, CHECKLIST_IDS, DOCUMENT_PATHS } from "./fixtures";
import type { LifecycleObservation } from "./observe";

export type LifecycleInvariantId = `PB-INV-LIFECYCLE-00${1 | 2 | 3 | 4 | 5 | 6}`;
const allCheckpoints = CHECKPOINTS.map(checkpoint => checkpoint.id);
export const LIFECYCLE_CONTRACTS = [
  { id: "PB-INV-LIFECYCLE-001", statement: "Preserve identity, independently authored source inputs, and operation-specific mutation frames.", checkpoints: allCheckpoints },
  { id: "PB-INV-LIFECYCLE-002", statement: "Retain the specified documents and invalidate generation after the named mutations; reversion cannot restore freshness.", checkpoints: allCheckpoints },
  { id: "PB-INV-LIFECYCLE-003", statement: "Observe stored/display/review status, manual confirmations, Client Review and package readiness independently.", checkpoints: allCheckpoints },
  { id: "PB-INV-LIFECYCLE-004", statement: "Duplicate source inputs with new identity/lineage and without generated-package readiness.", checkpoints: ["B0"] },
  { id: "PB-INV-LIFECYCLE-005", statement: "Preserve source and package evidence through ordinary archive/restore with the specified active fallback.", checkpoints: ["B0", "B1", "B2", "B3", "B4"] },
  { id: "PB-INV-LIFECYCLE-006", statement: "Missing targets and the bounded failed write have no persisted transition.", checkpoints: ["C0", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"] }
].map(contract => ({
  ...contract, id: contract.id as LifecycleInvariantId,
  definitionVersion: "1.0.0" as const, observationVersion: "1.0.0" as const, authority: "none" as const,
  applicability: { projectTypes: ["ecommerceSite"], traces: ["A", "B", "C"], maximumProjects: 2 }
}));

export interface LifecycleViolation { code: string; expected: unknown; actual: unknown }
export interface LifecycleAssertionResult {
  invariantId: LifecycleInvariantId;
  definitionVersion: "1.0.0";
  observationVersion: "1.0.0";
  authority: "none";
  status: "satisfied" | "violated" | "notApplicable";
  checks: number;
  violations: LifecycleViolation[];
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, ordered(entry)])
  );
  return value;
}
function equal(left: unknown, right: unknown): boolean { return JSON.stringify(ordered(left)) === JSON.stringify(ordered(right)); }

/** Only the bounded lifecycle frame; derived review-card timestamps are intentionally separate. */
function frame(project: ProjectRecord) {
  return {
    identity: project.identity, client: project.client, intake: project.intake,
    createdAt: project.createdAt, updatedAt: project.updatedAt, archivedAt: project.archivedAt,
    sourceProjectId: project.sourceProjectId, duplicatedAt: project.duplicatedAt,
    generatedDocuments: project.generatedDocuments, generatedFileCount: project.generatedFileCount,
    packageGeneratedAt: project.packageGeneratedAt, readinessConfirmations: project.readinessConfirmations,
    status: project.status, reviewStatus: project.reviewStatus
  };
}

/** Pure oracle: imports no production selector, resolver, validator, repository, or readiness code. */
export function assertLifecycle(
  invariantId: LifecycleInvariantId, observed: LifecycleObservation, expected: CheckpointExpectation
): LifecycleAssertionResult {
  const metadata = LIFECYCLE_CONTRACTS.find(contract => contract.id === invariantId)!;
  const applicable = metadata.checkpoints.includes(observed.checkpoint)
    && observed.checkpoint === expected.id && observed.operation === expected.operation
    && observed.projects.length > 0 && observed.projects.length <= 2
    && observed.projects.every(project => project.raw.intake.appType === "ecommerceSite")
    && observed.authority === "none" && observed.observationVersion === "1.0.0";
  const result: LifecycleAssertionResult = {
    invariantId, definitionVersion: "1.0.0", observationVersion: "1.0.0", authority: "none",
    status: "notApplicable", checks: 0, violations: []
  };
  if (!applicable) return result;
  const check = (code: string, actual: unknown, wanted: unknown) => {
    result.checks += 1;
    if (!equal(actual, wanted)) result.violations.push({ code, expected: wanted, actual });
  };
  const ids = expected.projects.map(project => project.id);
  const raw = (id: string) => observed.projects.find(project => project.raw.identity.id === id)?.raw;
  const before = observed.beforeRaw ? (JSON.parse(observed.beforeRaw) as StorageState).projects : [];

  if (invariantId === "PB-INV-LIFECYCLE-001") {
    check("storageVersion", observed.storageVersion, 7);
    check("projectIds", observed.projects.map(project => project.raw.identity.id), ids);
    check("activeId", observed.activeId, expected.activeId);
    check("archivedIds", [...observed.archivedIds].sort(), [...expected.archivedIds].sort());
    check("time", observed.time, expected.time);
    check("resultKind", observed.resultKind, expected.result);
    if (expected.result === "project") check("resultProjectId", observed.resultProjectId, expected.id === "B0" ? B : A);
    check("writeAttempts", observed.writeAttempts, expected.writeAttempts);
    check("writes", observed.writes, expected.writes);
    check("removals", observed.removals, 0);
    check("observerPreservesBytes", observed.afterObservationRaw, observed.afterRaw);
    if (expected.preserveBytes) check("operationPreservesBytes", observed.afterRaw, observed.beforeRaw);
    for (const project of expected.projects) {
      const actual = raw(project.id);
      check(`${project.id}.identity`, actual?.identity, project.identity);
      check(`${project.id}.client`, actual?.client, project.client);
      // Required literal keys must exist. All unspecified intake values must stay empty.
      const actualIntake: Record<string, string> = { ...actual?.intake };
      for (const key of new Set([...Object.keys(actualIntake), ...Object.keys(project.intake)])) {
        check(`${project.id}.intake.${key}`, actualIntake[key], project.intake[key] ?? "");
      }
      for (const key of ["createdAt", "updatedAt", "archivedAt", "sourceProjectId", "duplicatedAt"] as const) {
        check(`${project.id}.${key}`, actual?.[key], project[key]);
      }
    }
  }
  if (invariantId === "PB-INV-LIFECYCLE-002") {
    for (const project of expected.projects) {
      const actual = raw(project.id);
      check(`${project.id}.stamp`, actual?.packageGeneratedAt, project.stamp);
      const reference = project.documents === "empty" ? [] : observed.documentReferences[project.documents];
      check(`${project.id}.retainedDocuments`, actual?.generatedDocuments, reference);
    }
    if (expected.operation === "generate") {
      check("generatedCount", observed.generatedOutput?.length, 19);
      check("generatedPaths", observed.generatedOutput?.map(document => `${document.folder}/${document.fileName}`), DOCUMENT_PATHS);
      check("generatedBlankDocuments", observed.generatedOutput?.filter(document => !document.content.trim()).length, 0);
      check("generatedMissingMarkers", observed.generatedOutput?.filter(document => /\[MISSING:/.test(document.content)).length, 0);
    }
  }
  if (invariantId === "PB-INV-LIFECYCLE-003") {
    check("projectIds", observed.projects.map(project => project.raw.identity.id), ids);
    for (const project of expected.projects) {
      const actual = observed.projects.find(candidate => candidate.raw.identity.id === project.id);
      check(`${project.id}.storedStatus`, actual?.raw.status, project.storedStatus);
      check(`${project.id}.displayStatus`, actual?.displayStatus, project.displayStatus);
      check(`${project.id}.loadedStatus`, actual?.loadedStatus, project.storedStatus);
      check(`${project.id}.reviewStatus`, actual?.raw.reviewStatus, project.reviewStatus);
      check(`${project.id}.loadedReviewStatus`, actual?.loadedReviewStatus, project.reviewStatus);
      check(`${project.id}.confirmations`, actual?.raw.readinessConfirmations, project.confirmations);
      check(`${project.id}.storedCount`, actual?.raw.generatedFileCount, project.documentCount);
      check(`${project.id}.arrayCount`, actual?.raw.generatedDocuments.length, project.documentCount);
      check(`${project.id}.calculatedCount`, actual?.calculatedDocumentCount, project.documentCount);
      check(`${project.id}.clientReviewReady`, actual?.clientReviewReady, project.clientReviewReady);
      check(`${project.id}.packageReadiness`, actual?.packageReadiness, project.packageReadiness);
      check(`${project.id}.checklistIds`, actual?.checklistIds, CHECKLIST_IDS);
      check(`${project.id}.failedChecks`, actual?.failedChecks, project.failedChecks);
      check(`${project.id}.nonblankDocuments`, actual?.nonblankDocuments, project.documentCount);
      check(`${project.id}.missingMarkers`, actual?.missingMarkerDocuments, 0);
      check(`${project.id}.missingDocumentCount`, actual?.missingDocumentCount, project.documentCount === 0 ? 19 : 0);
      check(`${project.id}.contentBlockers`, actual?.contentBlockers, project.documentCount === 0 ? ["19 applicable document(s) are missing."] : []);
      if (expected.id !== "A0") check(`${project.id}.effectiveBlockingItems`, actual?.effectiveBlockingItems, 0);
    }
  }
  if (invariantId === "PB-INV-LIFECYCLE-004") {
    const source = raw(A);
    const copy = raw(B);
    check("duplicateIds", observed.projects.map(project => project.raw.identity.id), [A, B]);
    check("sourceFrame", source && frame(source), before[0] && frame(before[0]));
    check("duplicateIdentity", copy?.identity, { id: B, projectName: "Lifecycle Test Store Copy" });
    check("duplicateClient", copy?.client, source?.client);
    check("duplicateIntake", copy?.intake, source?.intake);
    check("duplicateFlags", copy?.readinessConfirmations, { scopeReviewed: true, acceptanceCriteriaReviewed: true, draftPackageReviewed: true });
    check("duplicateLineage", copy?.sourceProjectId, A);
    check("duplicateTime", copy?.duplicatedAt, expected.time);
    check("duplicateCreated", copy?.createdAt, expected.time);
    check("duplicateUpdated", copy?.updatedAt, expected.time);
    check("duplicateDocuments", copy?.generatedDocuments, []);
    check("duplicateStamp", copy?.packageGeneratedAt, null);
    check("duplicateStoredStatus", copy?.status, "Intake Complete");
    check("duplicateReview", copy?.reviewStatus, "Review needed");
    check("duplicateClientReadiness", observed.projects.find(project => project.raw.identity.id === B)?.clientReviewReady, false);
    check("duplicatePackageReadiness", observed.projects.find(project => project.raw.identity.id === B)?.packageReadiness, "Draft");
  }
  if (invariantId === "PB-INV-LIFECYCLE-005") {
    check("activeFallback", observed.activeId, expected.activeId);
    check("archiveMembership", observed.archivedIds, expected.archivedIds);
    check("preservedInventory", observed.projects.map(project => project.raw.identity.id), [A, B]);
    for (const project of expected.projects) {
      const current = raw(project.id);
      check(`${project.id}.archiveTime`, current?.archivedAt, project.archivedAt);
      check(`${project.id}.updatedTime`, current?.updatedAt, project.updatedAt);
      const previous = before.find(candidate => candidate.identity.id === project.id);
      if (current && previous) {
        check(`${project.id}.archiveFrame`, frame(current), {
          ...frame(previous), archivedAt: project.archivedAt, updatedAt: project.updatedAt
        });
      }
    }
  }
  if (invariantId === "PB-INV-LIFECYCLE-006") {
    check("failedTransitionBytes", observed.afterRaw, observed.beforeRaw);
    check("readPreservesBytes", observed.afterObservationRaw, observed.beforeRaw);
    check("failureResult", observed.resultKind, expected.result);
    check("successfulWrites", observed.writes, 0);
    check("writeAttempts", observed.writeAttempts, expected.writeAttempts);
    check("removals", observed.removals, 0);
    check("activeId", observed.activeId, B);
    check("archivedIds", observed.archivedIds, []);
    check("inventory", observed.projects.map(project => project.raw.identity.id), [A, B]);
  }
  result.status = result.violations.length ? "violated" : "satisfied";
  return result;
}
