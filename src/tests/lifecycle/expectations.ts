import { A, B, C, E, I, T } from "./fixtures";

export type DocumentReference = "empty" | "D0" | "D1" | "D2";
export type Operation = "create" | "fields" | "generate" | "save" | "confirmation" | "duplicate" | "activate" | "archive" | "restore" | "read" | "missingRead" | "missingFields" | "missingDuplicate" | "missingArchive" | "missingRestore" | "missingActivate" | "missingSave" | "failedFields";
export interface ProjectExpectation {
  id: string;
  identity: { id: string; projectName: string };
  client: { clientName: string; businessName: string };
  intake: Readonly<Record<string, string>>;
  storedStatus: string;
  displayStatus: string;
  reviewStatus: string;
  documentCount: number;
  stamp: string | null;
  documents: DocumentReference;
  confirmations: Readonly<Record<string, boolean>>;
  failedChecks: readonly string[];
  clientReviewReady: boolean;
  packageReadiness: "Draft" | "Ready for Codex";
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  sourceProjectId: string | null;
  duplicatedAt: string | null;
}
export interface CheckpointExpectation {
  id: string;
  time: string;
  operation: Operation;
  result: "project" | "package" | "storage" | "null";
  activeId: string;
  archivedIds: readonly string[];
  projects: readonly ProjectExpectation[];
  writeAttempts: number;
  writes: number;
  preserveBytes: boolean;
}

const none = {};
const scope = { scopeReviewed: true };
const acceptance = { scopeReviewed: true, acceptanceCriteriaReviewed: true };
const reviewed = { scopeReviewed: true, acceptanceCriteriaReviewed: true, draftPackageReviewed: true };
const four = ["scopeReviewed", "acceptanceCriteriaReviewed", "draftPackageReviewed", "codexInstructionsReady"];
const three = ["scopeReviewed", "acceptanceCriteriaReviewed", "draftPackageReviewed"];
const regenerate = ["codexInstructionsReady"];

// These helpers only abbreviate the approved literal matrix. They never inspect production.
function a(
  storedStatus: string, displayStatus: string, reviewStatus: string,
  documentCount: number, stamp: string | null, documents: DocumentReference,
  confirmations: Readonly<Record<string, boolean>>, failedChecks: readonly string[],
  clientReviewReady: boolean, packageReadiness: ProjectExpectation["packageReadiness"],
  updatedAt: string, source: "incomplete" | "complete" | "edited" = "complete", archivedAt: string | null = null
): ProjectExpectation {
  return {
    id: A, identity: I.identity, client: I.client,
    intake: source === "incomplete" ? I.intake : { ...I.intake, ...C, ...(source === "edited" ? E : {}) },
    storedStatus, displayStatus, reviewStatus, documentCount, stamp, documents, confirmations,
    failedChecks, clientReviewReady, packageReadiness, createdAt: T[0], updatedAt, archivedAt,
    sourceProjectId: null, duplicatedAt: null
  };
}
const readyA = (updatedAt: string, archivedAt: string | null = null) => a(
  "Ready for Codex", "Ready for Codex", "Approved", 19, T[10], "D2", reviewed, [], true, "Ready for Codex", updatedAt, "complete", archivedAt
);
const duplicate: ProjectExpectation = {
  id: B, identity: { id: B, projectName: "Lifecycle Test Store Copy" }, client: I.client,
  intake: { ...I.intake, ...C }, storedStatus: "Intake Complete", displayStatus: "Intake Complete",
  reviewStatus: "Review needed", documentCount: 0, stamp: null, documents: "empty",
  confirmations: reviewed, failedChecks: regenerate, clientReviewReady: false, packageReadiness: "Draft",
  createdAt: T[11], updatedAt: T[11], archivedAt: null, sourceProjectId: A, duplicatedAt: T[11]
};

function checkpoint(
  id: string, time: string, operation: Operation, result: CheckpointExpectation["result"],
  activeId: string, archivedIds: readonly string[], projects: readonly ProjectExpectation[],
  writes: number, preserveBytes = false, writeAttempts = writes
): CheckpointExpectation {
  return { id, time, operation, result, activeId, archivedIds, projects, writes, writeAttempts, preserveBytes };
}

/** Expected values are literal design inputs, not snapshots or selector-generated values. */
export const CHECKPOINTS: readonly CheckpointExpectation[] = [
  checkpoint("A0", T[0], "create", "project", A, [], [a("Intake Started", "Intake Started", "Not reviewed", 0, null, "empty", none,
    ["scopeReviewed", "requiredGapsResolved", "brandingConfirmed", "screensConfirmed", "dataModelConfirmed", "workflowsConfirmed", "securityConfirmed", "acceptanceCriteriaReviewed", "clientQuestionsResolved", "draftPackageReviewed", "codexInstructionsReady"],
    false, "Draft", T[0], "incomplete")], 1),
  checkpoint("A1", T[1], "fields", "project", A, [], [a("Intake Complete", "Intake Complete", "Review needed", 0, null, "empty", none, four, false, "Draft", T[1])], 1),
  checkpoint("A2", T[2], "generate", "package", A, [], [a("Intake Complete", "Intake Complete", "Review needed", 0, null, "empty", none, four, false, "Draft", T[1])], 0, true),
  checkpoint("A3", T[3], "save", "project", A, [], [a("Needs Review", "Needs Review", "Review needed", 19, T[3], "D0", none, three, false, "Draft", T[3])], 1),
  checkpoint("A4", T[4], "confirmation", "project", A, [], [a("Needs Review", "Needs Review", "In review", 19, null, "D0", scope, ["acceptanceCriteriaReviewed", "draftPackageReviewed", "codexInstructionsReady"], false, "Draft", T[4])], 1),
  checkpoint("A5", T[5], "confirmation", "project", A, [], [a("Needs Review", "Needs Review", "In review", 19, null, "D0", acceptance, ["draftPackageReviewed", "codexInstructionsReady"], false, "Draft", T[5])], 1),
  checkpoint("A6", T[6], "confirmation", "project", A, [], [a("Needs Review", "Needs Review", "In review", 19, null, "D0", reviewed, regenerate, false, "Draft", T[6])], 1),
  checkpoint("A7g", T[7], "generate", "package", A, [], [a("Needs Review", "Needs Review", "In review", 19, null, "D0", reviewed, regenerate, false, "Draft", T[6])], 0, true),
  checkpoint("A7s", T[7], "save", "project", A, [], [a("Ready for Codex", "Ready for Codex", "Approved", 19, T[7], "D1", reviewed, [], true, "Ready for Codex", T[7])], 1),
  checkpoint("A8", T[8], "fields", "project", A, [], [a("Needs Review", "Needs Review", "Review needed", 19, null, "D1", reviewed, regenerate, false, "Draft", T[8], "edited")], 1),
  checkpoint("A9", T[9], "fields", "project", A, [], [a("Needs Review", "Needs Review", "Review needed", 19, null, "D1", reviewed, regenerate, false, "Draft", T[9])], 1),
  checkpoint("A10g", T[10], "generate", "package", A, [], [a("Needs Review", "Needs Review", "Review needed", 19, null, "D1", reviewed, regenerate, false, "Draft", T[9])], 0, true),
  checkpoint("A10s", T[10], "save", "project", A, [], [readyA(T[10])], 1),
  checkpoint("B0", T[11], "duplicate", "project", B, [], [readyA(T[10]), duplicate], 1),
  checkpoint("B1", T[12], "activate", "project", A, [], [readyA(T[10]), duplicate], 1),
  checkpoint("B2", T[13], "archive", "project", B, [A], [readyA(T[13], T[13]), duplicate], 1),
  checkpoint("B3", T[14], "restore", "project", B, [], [readyA(T[14]), duplicate], 1),
  checkpoint("B4", T[15], "read", "storage", B, [], [readyA(T[14]), duplicate], 0, true),
  checkpoint("C0", T[15], "missingRead", "null", B, [], [readyA(T[14]), duplicate], 0, true),
  checkpoint("C1", T[15], "missingFields", "null", B, [], [readyA(T[14]), duplicate], 0, true),
  checkpoint("C2", T[15], "missingDuplicate", "null", B, [], [readyA(T[14]), duplicate], 0, true),
  checkpoint("C3", T[15], "missingArchive", "null", B, [], [readyA(T[14]), duplicate], 0, true),
  checkpoint("C4", T[15], "missingRestore", "null", B, [], [readyA(T[14]), duplicate], 0, true),
  checkpoint("C5", T[15], "missingActivate", "null", B, [], [readyA(T[14]), duplicate], 0, true),
  checkpoint("C6", T[15], "missingSave", "null", B, [], [readyA(T[14]), duplicate], 0, true),
  checkpoint("C7", T[16], "failedFields", "null", B, [], [readyA(T[14]), duplicate], 0, true, 1),
  checkpoint("C8", T[17], "read", "storage", B, [], [readyA(T[14]), duplicate], 0, true)
];
