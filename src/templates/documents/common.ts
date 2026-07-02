import type { ProjectTemplateData } from "../../types/project";

export const missing = (label: string) => `[MISSING: ${label}]`;

export function value(valueToRead: string, label: string): string {
  return valueToRead.trim() || missing(label);
}

export function list(valueToRead: string, label: string): string {
  if (!valueToRead.trim()) return `- ${missing(label)}`;
  return valueToRead
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

export const projectHeader = (intake: ProjectTemplateData) =>
  `**Project:** ${value(intake.appName, "app name")}  \n` +
  `**Client:** ${value(intake.clientName, "client name")}  \n` +
  `**Business or department:** ${value(intake.businessName, "business or department")}  \n` +
  `**Project type:** ${value(intake.appType, "project type")}`;

export const generatedNotice =
  "> Generated from the approved project intake. Missing decisions are shown explicitly and require review.";

export const section = (heading: string, body: string) => `## ${heading}\n\n${body}`;
