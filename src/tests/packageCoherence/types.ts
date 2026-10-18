import type { ProjectRecord, GeneratedDocument } from "../../types/project";
import type { ExportIntegrityResult } from "../../lib/exportIntegrity";
import type { ExportManifest } from "../../lib/exportManifest";
import type { GeneratedPackageReadiness } from "../../lib/generatedPackageReadiness";

export type CaseId = `PC-00${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`;
export type InvariantId = `PB-INV-PACKAGE-00${1 | 2 | 3 | 4 | 5 | 6}`;
export interface DecisionFact { id: string; gate: string; status: string; question: string; answer: string; reason: string; field: string }
export interface DecisionSummary {
  unresolvedDecisionCount: number; implementationBlockingDecisionCount: number; launchBlockingDecisionCount: number;
  planningReady: boolean; implementationReady: boolean; launchReady: boolean;
}
export interface PackageObservation {
  authority: "none"; observationVersion: "1.0.0"; caseId: string; projectType: string;
  project: ProjectRecord; displayStatus: string; activeId: string | null; storageVersion: number;
  folders: string[]; documents: GeneratedDocument[]; decisions: DecisionFact[]; decisionSummary: DecisionSummary;
  review: { ready: boolean; checks: Array<{ id: string; label: string; passed: boolean }> };
  readiness: GeneratedPackageReadiness; documentStatuses: Record<string, string>;
  integrity: ExportIntegrityResult; manifest: ExportManifest; markdownManifest: string;
  events: Array<{ operation: string; time: string }>;
  retainedReadyDocuments: GeneratedDocument[] | null;
}
export interface PackageExpectation {
  id: CaseId; status: string; reviewStatus: string; stamp: string | null;
  clientReady: boolean; packageReady: "Draft" | "Ready for Codex"; failedChecks: string[];
  decisions: DecisionSummary; checklistPassed: number; markers: Array<{ fileName: string; marker: string }>;
  warnings: string[]; confirmations: Record<string, boolean>;
}
export interface Violation { location: string; expected: unknown; actual: unknown }
export interface AssertionResult {
  invariantId: InvariantId; authority: "none"; definitionVersion: "1.0.0"; observationVersion: "1.0.0";
  status: "satisfied" | "violated" | "notApplicable"; reason?: string; checks: number; violations: Violation[];
}
