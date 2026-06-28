const unsafeCharacters = /[^a-z0-9_-]+/g;
const repeatedSeparators = /[-_]{2,}/g;

export function sanitizeProjectName(projectName: string): string {
  const sanitized = projectName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(unsafeCharacters, "-")
    .replace(repeatedSeparators, "-")
    .replace(/^[-_]+|[-_]+$/g, "");

  return sanitized || "untitled-project";
}
