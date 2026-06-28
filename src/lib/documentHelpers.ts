import { sanitizeProjectName } from "./sanitizeProjectName";

export function missingMarker(description: string): string {
  return `[MISSING: ${description}]`;
}

export function safeText(value: string | null | undefined, description: string): string {
  const normalized = (value ?? "").trim();
  return normalized || missingMarker(description);
}

export function markdownList(items: string[]): string {
  if (items.length === 0) return "";
  return items.map((item) => `- ${item}`).join("\n");
}

export function listOrMissing(value: string | null | undefined, description: string): string {
  const entries = (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return entries.length > 0 ? markdownList(entries) : `- ${missingMarker(description)}`;
}

export function sectionOrMissing(title: string, value: string | null | undefined, description: string): string {
  return `## ${title}\n\n${safeText(value, description)}`;
}

export function markdownTable(headers: string[], rows: string[][]): string {
  const headerRow = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.length > 0
    ? rows.map((row) => `| ${row.map((cell) => cell || "-").join(" | ")} |`).join("\n")
    : `| ${headers.map(() => missingMarker("information")).join(" | ")} |`;
  return `${headerRow}\n${divider}\n${body}`;
}

export function formatDate(value: string | Date | undefined = undefined): string {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function normalizeFileName(fileName: string): string {
  const cleaned = fileName
    .replace(/[\\/]/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");
  return cleaned || "untitled.md";
}

export function sanitizeProjectFolderName(projectName: string): string {
  return sanitizeProjectName(projectName);
}
