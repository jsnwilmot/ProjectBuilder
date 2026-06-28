import { useMemo, useState } from "react";
import { PROJECT_FOLDERS } from "../data/folderStructure";
import { sanitizeProjectFolderName } from "../lib/documentHelpers";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import {
  createProject,
  loadStorageState,
  saveGeneratedDocuments,
  setActiveProject as persistActiveProject,
  updateProjectFields
} from "../lib/projectRepository";
import { validateIntake } from "../lib/validateIntake";
import type {
  ProjectInputField,
  ProjectPackage,
  ProjectRecord,
  StorageState
} from "../types/project";

function initializeStorage(): StorageState {
  return loadStorageState();
}

export function useProjectBuilder() {
  const [storageState, setStorageState] = useState<StorageState>(initializeStorage);
  const project = useMemo<ProjectRecord | null>(
    () => storageState.projects.find((candidate) => candidate.identity.id === storageState.activeProjectId)
      ?? storageState.projects[0]
      ?? null,
    [storageState]
  );
  const projects = useMemo(
    () => [...storageState.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [storageState.projects]
  );

  const validationResult = useMemo(() => project ? validateIntake(project) : {
    isValid: false,
    missingFields: [],
    warnings: [],
    sectionResults: []
  }, [project]);
  const generatedPackage = useMemo<ProjectPackage | null>(() => {
    if (!project || project.generatedDocuments.length === 0) return null;
    return {
      projectId: project.identity.id,
      projectName: project.identity.projectName,
      rootFolder: sanitizeProjectFolderName(project.identity.projectName),
      folders: PROJECT_FOLDERS,
      documents: project.generatedDocuments
    };
  }, [project]);

  const refresh = () => setStorageState(loadStorageState());

  const updateIntake = (changes: Partial<Record<ProjectInputField, string>>) => {
    if (!project) return;
    updateProjectFields(project.identity.id, changes);
    refresh();
  };

  const markGenerated = () => {
    if (!project) return;
    const generated = generateProjectPackage(project);
    saveGeneratedDocuments(project.identity.id, generated.documents);
    refresh();
  };

  const createNewProject = (): ProjectRecord => {
    const created = createProject();
    refresh();
    return created;
  };

  const setActiveProject = (projectId: string) => {
    persistActiveProject(projectId);
    refresh();
  };

  return {
    storageState,
    project,
    projects,
    updateIntake,
    markGenerated,
    createNewProject,
    setActiveProject,
    validationResult,
    validationIssues: validationResult.missingFields,
    generatedPackage
  };
}
