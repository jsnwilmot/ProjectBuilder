import type { ProjectRecord } from "../types/project";
import {
  buildRecordLifecycleFormulaReviewSummary,
  type RecordLifecycleFormulaReviewSummary
} from "./recordLifecycleFormulaReviewSummary";

export interface RecordLifecycleFormulaReviewPanelViewModelInput {
  project: ProjectRecord;
  implementationRegistry: unknown;
  reviewReference?: unknown;
}

export function buildRecordLifecycleFormulaReviewPanelViewModel(
  input: RecordLifecycleFormulaReviewPanelViewModelInput
): RecordLifecycleFormulaReviewSummary {
  return buildRecordLifecycleFormulaReviewSummary(input);
}
