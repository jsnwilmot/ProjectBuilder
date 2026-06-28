import { useEffect, useMemo, useState } from "react";
import { createSeedProject } from "../data/seedProject";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import { loadProject, saveProject } from "../lib/projectStorage";
import { getOutstandingFields, validateIntake } from "../lib/validateIntake";
import type { ProjectIntake, ProjectPackage, ProjectState, ProjectStatus } from "../types/project";

export function useProjectBuilder() {
  const [project, setProject] = useState<ProjectState>(() => loadProject(createSeedProject));

  useEffect(() => saveProject(project), [project]);

  const validationIssues = useMemo(() => validateIntake(project.intake), [project.intake]);
  const outstandingFields = useMemo(() => getOutstandingFields(project.intake), [project.intake]);
  const generatedPackage = useMemo<ProjectPackage | null>(() => {
    if (validationIssues.length > 0) return null;
    return generateProjectPackage(project.intake);
  }, [project.intake, validationIssues.length]);

  const updateIntake = (changes: Partial<ProjectIntake>) => {
    setProject((current) => ({
      ...current,
      intake: { ...current.intake, ...changes },
      metadata: {
        ...current.metadata,
        status: current.metadata.status === "Project Package Generated" ? "Intake Started" : current.metadata.status,
        lastUpdated: new Date().toISOString(),
        reviewStatus: "Needs review"
      }
    }));
  };

  const setStatus = (status: ProjectStatus) => {
    setProject((current) => ({
      ...current,
      metadata: { ...current.metadata, status, lastUpdated: new Date().toISOString() }
    }));
  };

  const markGenerated = () => setStatus("Project Package Generated");
  const resetProject = () => setProject(createSeedProject());

  return {
    project,
    updateIntake,
    setStatus,
    markGenerated,
    resetProject,
    validationIssues,
    outstandingFields,
    generatedPackage
  };
}
