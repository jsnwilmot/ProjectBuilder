import type { GeneratedDocument, ProjectRecord } from "../types/project";

const platformTerms = [/Power Fx/gi, /Canvas YAML/gi, /Dataverse/gi, /SharePoint internal names/gi, /model-driven solution source/gi, /Power Apps Studio/gi, /Power Platform/gi, /publisher prefix/gi, /connection references/gi, /solution unique name/gi, /premium connector licensing/gi, /\bDLP\b/g, /tenant\/maker/gi];

/** Source-authored references remain legitimate; generated boilerplate cannot add them. */
export function projectTypeContentViolations(p: ProjectRecord, docs: GeneratedDocument[]): string[] {
  if (p.intake.appType !== "ecommerceSite") return [];
  const source = Object.values(p.intake).join("\n");
  const violations: string[] = [];
  for (const doc of docs) {
    const withoutSource = Object.values(p.intake).filter(v => v.length > 15).sort((a,b) => b.length-a.length).reduce((text, value) => text.split(value).join(""), doc.content);
    for (const pattern of platformTerms) {
      pattern.lastIndex = 0;
      const found = withoutSource.match(pattern);
      if (found?.some((term: string) => !source.includes(term))) violations.push(`${doc.fileName}: ${found[0]}`);
    }
    if (["TEST_PLAN.md", "ACCEPTANCE_CRITERIA.md"].includes(doc.fileName) && /intake persistence|package generation|ZIP export|generated package contains/i.test(withoutSource)) violations.push(`${doc.fileName}: builder self-test in target-app output`);
  }
  return violations;
}
