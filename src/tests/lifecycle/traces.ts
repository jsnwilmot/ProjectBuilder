import {
  archiveProject, createProject, duplicateProject, getProjectById, loadStorageState,
  restoreProject, saveGeneratedDocuments, setActiveProject, updateProjectFields, updateReadinessConfirmation
} from "../../lib/projectRepository";
import { generateProjectPackage } from "../../lib/generateProjectPackage";
import type { GeneratedDocument, ProjectPackage, ProjectRecord, StorageState } from "../../types/project";
import { A, C, E, I, M, R, T } from "./fixtures";
import type { Operation } from "./expectations";
import { LifecycleMemoryStorage, observeLifecycle, type LifecycleObservation } from "./observe";

/** Explicit approved script, not a transition engine or a generated state-space search. */
export function executeApprovedTraces(setClock: (instant: string) => void): LifecycleObservation[] {
  const storage = new LifecycleMemoryStorage();
  const observations: LifecycleObservation[] = [];
  const references: Record<string, GeneratedDocument[]> = {};
  let generated: ProjectPackage | undefined;
  const project = () => {
    const found = getProjectById(A, storage);
    if (!found) throw new Error("Approved trace prerequisite A is absent.");
    return found;
  };
  function event(
    checkpoint: string, time: string, operation: Operation,
    perform: () => ProjectRecord | ProjectPackage | StorageState | null,
    reference?: string
  ) {
    setClock(time);
    const beforeRaw = storage.raw();
    const counts = { attempts: storage.attempts, writes: storage.writes, removals: storage.removals };
    const result = perform();
    const resultKind = result === null ? "null" : "documents" in result ? "package" : "projects" in result ? "storage" : "project";
    const generatedOutput = result && "documents" in result ? result.documents : null;
    if (reference && generatedOutput) references[reference] = structuredClone(generatedOutput);
    observations.push(observeLifecycle(storage, {
      checkpoint, time, operation, resultKind,
      resultProjectId: result && "identity" in result ? result.identity.id : null,
      generatedOutput: generatedOutput && structuredClone(generatedOutput),
      documentReferences: structuredClone(references), beforeRaw,
      writeAttempts: storage.attempts - counts.attempts,
      writes: storage.writes - counts.writes, removals: storage.removals - counts.removals
    }));
  }
  const generate = () => { generated = generateProjectPackage(project()); return generated; };
  const save = () => {
    if (!generated) throw new Error("Approved trace has no generated input to save.");
    return saveGeneratedDocuments(A, generated.documents, storage);
  };

  event("A0", T[0], "create", () => createProject(I, storage));
  event("A1", T[1], "fields", () => updateProjectFields(A, C, storage));
  event("A2", T[2], "generate", generate, "D0");
  event("A3", T[3], "save", save);
  event("A4", T[4], "confirmation", () => updateReadinessConfirmation(A, "scopeReviewed", true, storage));
  event("A5", T[5], "confirmation", () => updateReadinessConfirmation(A, "acceptanceCriteriaReviewed", true, storage));
  event("A6", T[6], "confirmation", () => updateReadinessConfirmation(A, "draftPackageReviewed", true, storage));
  event("A7g", T[7], "generate", generate, "D1");
  event("A7s", T[7], "save", save);
  event("A8", T[8], "fields", () => updateProjectFields(A, E, storage));
  event("A9", T[9], "fields", () => updateProjectFields(A, R, storage));
  event("A10g", T[10], "generate", generate, "D2");
  event("A10s", T[10], "save", save);

  event("B0", T[11], "duplicate", () => duplicateProject(A, storage, T[11]));
  event("B1", T[12], "activate", () => setActiveProject(A, storage));
  event("B2", T[13], "archive", () => archiveProject(A, storage, T[13]));
  event("B3", T[14], "restore", () => restoreProject(A, storage, T[14]));
  event("B4", T[15], "read", () => loadStorageState(storage));

  event("C0", T[15], "missingRead", () => getProjectById(M, storage));
  event("C1", T[15], "missingFields", () => updateProjectFields(M, { appPurpose: "Rejected synthetic change" }, storage));
  event("C2", T[15], "missingDuplicate", () => duplicateProject(M, storage, T[15]));
  event("C3", T[15], "missingArchive", () => archiveProject(M, storage, T[15]));
  event("C4", T[15], "missingRestore", () => restoreProject(M, storage, T[15]));
  event("C5", T[15], "missingActivate", () => setActiveProject(M, storage));
  event("C6", T[15], "missingSave", () => saveGeneratedDocuments(M, [], storage));
  event("C7", T[16], "failedFields", () => {
    storage.failWrites = true;
    try { return updateProjectFields(A, { appPurpose: "Rejected synthetic change" }, storage); }
    finally { storage.failWrites = false; }
  });
  event("C8", T[17], "read", () => loadStorageState(storage));
  return observations;
}
