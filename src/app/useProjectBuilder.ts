import { useMemo, useState } from "react";
import { PROJECT_FOLDERS } from "../data/folderStructure";
import { createDemoStorageState } from "../data/seedProject";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import {
  createProject,
  loadStorageState,
  saveGeneratedDocuments,
  saveStorageState,
  setActiveProject as persistActiveProject,
  updateProject,
  updateProjectFields
} from "../lib/projectRepository";
import { sanitizeProjectName } from "../lib/sanitizeProjectName";
import { validateIntake } from "../lib/validateIntake";
import type {
  ProjectInputField,
  ProjectPackage,
  ProjectRecord,
  ProjectStatus,
  StorageState
} from "../types/project";

function initializeStorage(): StorageState {
  const stored = loadStorageState();
  if (stored.projects.length > 0) return stored;
  const demo = createDemoStorageState();
  saveStorageState(demo);
  return loadStorageState();
}

export function useProjectBuilder() {
  const [storageState, setStorageState] = useState<StorageState>(initializeStorage);
  const project = useMemo(
    () => storageState.projects.find((candidate) => candidate.identity.id === storageState.activeProjectId)
      ?? storageState.projects[0],
    [storageState]
  );
  const projects = useMemo(
    () => [...storageState.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [storageState.projects]
  );

  const validationResult = useMemo(() => validateIntake(project), [project]);
  const generatedPackage = useMemo<ProjectPackage | null>(() => {
    if (!validationResult.isValid) return null;
    if (project.generatedDocuments.length > 0) {
      return {
        projectId: project.identity.id,
        projectName: project.identity.projectName,
        rootFolder: sanitizeProjectName(project.identity.projectName),
        folders: PROJECT_FOLDERS,
        documents: project.generatedDocuments
      };
    }
    return generateProjectPackage(project);
  }, [project, validationResult.isValid]);

  const refresh = () => setStorageState(loadStorageState());

  const updateIntake = (changes: Partial<Record<ProjectInputField, string>>) => {
    updateProjectFields(project.identity.id, changes);
    refresh();
  };

  const setStatus = (status: ProjectStatus) => {
    updateProject(project.identity.id, { status });
    refresh();
  };

  const markGenerated = () => {
    if (!generatedPackage) return;
    saveGeneratedDocuments(project.identity.id, generatedPackage.documents);
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
    setStatus,
    markGenerated,
    createNewProject,
    setActiveProject,
    validationResult,
    validationIssues: validationResult.missingFields,
    outstandingFields: project.outstandingQuestions,
    generatedPackage
  };
}
