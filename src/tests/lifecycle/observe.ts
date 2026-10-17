import { getClientReviewReadiness } from "../../lib/clientReview";
import { evaluateGeneratedPackageReadiness } from "../../lib/generatedPackageReadiness";
import { getGeneratedFileCount, getProjectDisplayStatus } from "../../lib/projectSelectors";
import { loadStorageState, STORAGE_KEY, type StorageAdapter } from "../../lib/projectRepository";
import type { GeneratedDocument, ProjectRecord, StorageState } from "../../types/project";
import type { Operation } from "./expectations";

export class LifecycleMemoryStorage implements StorageAdapter {
  private readonly values = new Map<string, string>();
  attempts = 0;
  writes = 0;
  removals = 0;
  failWrites = false;
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void {
    this.attempts += 1;
    if (this.failWrites) throw new Error("synthetic setItem failure");
    this.values.set(key, value);
    this.writes += 1;
  }
  removeItem(key: string): void { this.values.delete(key); this.removals += 1; }
  raw(): string | null { return this.getItem(STORAGE_KEY); }
}

export interface ProjectObservation {
  raw: ProjectRecord;
  displayStatus: string;
  loadedStatus: string;
  loadedReviewStatus: string;
  calculatedDocumentCount: number;
  clientReviewReady: boolean;
  checklistIds: string[];
  failedChecks: string[];
  effectiveBlockingItems: number;
  packageReadiness: string;
  contentBlockers: string[];
  missingDocumentCount: number;
  nonblankDocuments: number;
  missingMarkerDocuments: number;
  storedReviewCardTimes: string[];
  projectedReviewCardTimes: string[];
}
export interface LifecycleObservation {
  authority: "none";
  observationVersion: "1.0.0";
  checkpoint: string;
  time: string;
  operation: Operation;
  resultKind: "project" | "package" | "storage" | "null";
  resultProjectId: string | null;
  generatedOutput: GeneratedDocument[] | null;
  documentReferences: Record<string, GeneratedDocument[]>;
  beforeRaw: string | null;
  afterRaw: string | null;
  afterObservationRaw: string | null;
  storageVersion: number;
  activeId: string | null;
  archivedIds: string[];
  projects: ProjectObservation[];
  writeAttempts: number;
  writes: number;
  removals: number;
}

/** Read both persisted labels and calculated projections; never turn projections into expectations. */
export function observeLifecycle(
  storage: LifecycleMemoryStorage,
  event: Omit<LifecycleObservation, "authority" | "observationVersion" | "afterRaw" | "afterObservationRaw" | "storageVersion" | "activeId" | "archivedIds" | "projects">
): LifecycleObservation {
  const afterRaw = storage.raw();
  if (!afterRaw) throw new Error("The approved trace must have created canonical Storage 7.");
  const persisted = JSON.parse(afterRaw) as StorageState;
  const loaded = loadStorageState(storage);
  const projects = persisted.projects.map(raw => {
    const projected = loaded.projects.find(project => project.identity.id === raw.identity.id);
    if (!projected) throw new Error(`Missing read projection for ${raw.identity.id}`);
    const review = getClientReviewReadiness(projected);
    const readiness = evaluateGeneratedPackageReadiness(projected);
    return {
      raw, displayStatus: getProjectDisplayStatus(projected), loadedStatus: projected.status,
      loadedReviewStatus: projected.reviewStatus, calculatedDocumentCount: getGeneratedFileCount(projected),
      clientReviewReady: review.isReady, checklistIds: review.checklist.map(check => check.id),
      failedChecks: review.checklist.filter(check => !check.passed).map(check => check.id),
      effectiveBlockingItems: review.unresolvedItems.length,
      packageReadiness: readiness.status, contentBlockers: readiness.contentBlockers,
      missingDocumentCount: readiness.missingDocumentCount,
      nonblankDocuments: raw.generatedDocuments.filter(document => document.content.trim()).length,
      missingMarkerDocuments: raw.generatedDocuments.filter(document => /\[MISSING:/.test(document.content)).length,
      storedReviewCardTimes: raw.reviewItems.filter(item => item.id.startsWith("ecommerce-")).map(item => item.updatedAt),
      projectedReviewCardTimes: projected.reviewItems.filter(item => item.id.startsWith("ecommerce-")).map(item => item.updatedAt)
    };
  });
  return {
    authority: "none", observationVersion: "1.0.0", ...event, afterRaw,
    afterObservationRaw: storage.raw(), storageVersion: persisted.version,
    activeId: persisted.activeProjectId,
    archivedIds: persisted.projects.filter(project => project.archivedAt !== null).map(project => project.identity.id),
    projects
  };
}
