import type { ProjectStatus } from "../types/project";

export const projectStatuses: readonly ProjectStatus[] = [
  "Intake Started",
  "Intake Complete",
  "Project Package Generated",
  "Architect Review Needed",
  "Ready for Codex",
  "In Development",
  "Needs Review",
  "Complete"
];

export const statusDescriptions: Record<ProjectStatus, string> = {
  "Intake Started": "Project details are being collected.",
  "Intake Complete": "Required intake details are ready for review.",
  "Project Package Generated": "The project documents have been generated.",
  "Architect Review Needed": "The package is waiting for Architect review.",
  "Ready for Codex": "The approved handoff is ready for development.",
  "In Development": "Codex is implementing the approved package.",
  "Needs Review": "Work is ready for human review.",
  Complete: "The approved project scope is complete."
};
