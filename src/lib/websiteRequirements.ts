import { INTAKE_STAGES } from "../data/intakeStages";
import type { IntakeValidationResult, ProjectInputField, ProjectRecord } from "../types/project";
import { missingMarker } from "./documentHelpers";
import { getProjectFieldValue } from "./projectFields";
import { visibleIntakeFields, websiteRequiredFields } from "./projectCapabilities";

export type RequirementLevel = "required" | "optional" | "inapplicable";
export type RequirementStatus = "answered" | "missing" | "optional" | "notApplicable" | "deferred";
export interface WebsiteRequirement {
  field: ProjectInputField;
  label: string;
  level: RequirementLevel;
  status: RequirementStatus;
  value: string;
  reason: string;
  blocksImplementation: boolean;
}

// Recognize explicit decisions, never arbitrary substrings (e.g. "None of the
// current reports work" is a requirement, not a not-applicable decision).
export function isExplicitNotApplicable(value: string): boolean {
  return /^(?:not applicable|n\/a|none|not required|no database|no authentication)(?:[.!]?|\s*[:;—–-]\s*.+)$/i.test(value.trim());
}

/** Compatibility projection for an explicit owner deadline in existing prose. */
export function isBeforeImplementationDeferral(value: string): boolean {
  return /\b(?:TBD|deferred?)\b[^.!?\n]*\bbefore implementation\b/i.test(value);
}

function recordedDecision(project: ProjectRecord, field: ProjectInputField) {
  return (project.reviewItems ?? []).filter((item) => item.fieldKey === field && item.source !== "gate")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function hasSelectedCapability(project: ProjectRecord, field: ProjectInputField): boolean {
  const decision = recordedDecision(project, field);
  if (decision?.status === "Not applicable" && decision.notApplicableReason.trim()) return false;
  if (decision?.status === "Deferred") return false;
  const value = getProjectFieldValue(project, field).trim();
  return Boolean(value) && !isExplicitNotApplicable(value) && !isBeforeImplementationDeferral(value);
}

export function websiteRequirement(project: ProjectRecord, field: ProjectInputField): WebsiteRequirement {
  const definition = visibleIntakeFields(project).find((entry) => entry.name === field);
  const required = websiteRequiredFields();
  // Existing structured application answers can opt the website into real data or
  // access requirements. No inference from project name, hosting provider, or prose scope.
  if (hasSelectedCapability(project, "dataCollections") || hasSelectedCapability(project, "dataEntities")) {
    required.add("fields");
    required.add("keyFields");
  }
  if (hasSelectedCapability(project, "authenticationExpectation")) {
    required.add("userRoles");
    required.add("permissionRules");
  }
  // Preserve the existing either/or hosting decision contract.
  if (!getProjectFieldValue(project, "hostingStatus").trim()) required.add("domainStatus");
  const level: RequirementLevel = !definition ? "inapplicable" : required.has(field) ? "required" : "optional";
  const value = getProjectFieldValue(project, field).trim();
  const decision = recordedDecision(project, field);
  const base = { field, label: definition?.label ?? field, value, level };
  if (level === "inapplicable") return { ...base, status: "notApplicable", reason: "Not applicable to the selected project type.", blocksImplementation: false };
  if (decision?.status === "Not applicable") {
    const reason = decision.notApplicableReason.trim();
    return { ...base, status: reason ? "notApplicable" : "missing", reason: reason || "A not-applicable reason is required.", blocksImplementation: !reason };
  }
  if (decision?.status === "Deferred") {
    const reason = decision.deferredReason.trim();
    return { ...base, status: "deferred", reason: reason || "A deferral reason is required.",
      blocksImplementation: !reason || decision.blocking || !decision.allowDeferred || isBeforeImplementationDeferral(reason) };
  }
  if (isBeforeImplementationDeferral(value)) {
    return { ...base, status: "deferred", reason: value, blocksImplementation: true };
  }
  if (isExplicitNotApplicable(value)) return { ...base, status: "notApplicable", reason: value, blocksImplementation: false };
  const status: RequirementStatus = value ? "answered" : level === "required" ? "missing" : "optional";
  return { ...base, status, reason: "", blocksImplementation: status === "missing" };
}

export function websiteRequirementText(project: ProjectRecord, field: ProjectInputField): string {
  const state = websiteRequirement(project, field);
  switch (state.status) {
    case "answered": return state.value;
    case "missing": return missingMarker(state.label.toLowerCase());
    case "optional": return "Not specified (optional; no additional scope approved).";
    case "notApplicable": return `Not applicable — ${state.reason}`;
    case "deferred": return `Deferred — ${state.reason}${state.blocksImplementation ? " Resolve before implementation readiness." : " Track as a future action; not approved implementation scope."}`;
  }
}

export function websiteSelected(project: ProjectRecord, field: ProjectInputField): boolean {
  return websiteRequirement(project, field).status === "answered";
}

export function websiteDeferredRequirements(project: ProjectRecord): WebsiteRequirement[] {
  return visibleIntakeFields(project).map((field) => websiteRequirement(project, field.name)).filter((state) => state.status === "deferred");
}

export function validateWebsiteIntake(project: ProjectRecord): IntakeValidationResult {
  const fields = visibleIntakeFields(project).map((field) => ({ ...field, state: websiteRequirement(project, field.name) }));
  const missingFields = fields.filter(({ state }) => state.status === "missing").map(({ name, label, state }) => ({
    field: name, label, message: state.reason || `${label} is required for this website.`
  }));
  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings: [],
    sectionResults: INTAKE_STAGES.map((stage) => {
      const stageFields = fields.filter((field) => field.stageId === stage.id);
      const tracked = stageFields.filter(({ state }) => state.level === "required" || state.status !== "optional");
      const missing = stageFields.filter(({ state }) => state.status === "missing");
      return {
        stageId: stage.id, label: stage.label,
        percentComplete: tracked.length ? Math.round(100 * tracked.filter(({ state }) => state.status !== "missing").length / tracked.length) : 100,
        isComplete: missing.length === 0,
        missingFields: missing.map((field) => field.name), warnings: []
      };
    })
  };
}
