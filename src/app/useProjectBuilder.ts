import { useMemo, useState } from "react";
import { PROJECT_FOLDERS } from "../data/folderStructure";
import { sanitizeProjectFolderName } from "../lib/documentHelpers";
import { generateProjectPackage } from "../lib/generateProjectPackage";
import {
  runPlanningClarificationGeneration,
  type PlanningClarificationOrchestrationResult
} from "../lib/planningClarificationOrchestration";
import {
  archiveProject,
  createProject,
  deleteProject,
  duplicateProject,
  getPersistenceWarning,
  loadStorageState,
  materializeProjectPlanningClarificationHumanDecision,
  restoreProject,
  saveGeneratedDocuments,
  setActiveProject as persistActiveProject,
  updateReadinessConfirmation,
  updateReviewItem,
  updateProjectFields,
  updateProjectPowerPlatform
} from "../lib/projectRepository";
import {
  buildPlanningClarificationDecisionFeedback,
  type PlanningClarificationDecisionFeedback
} from "../lib/planningClarificationDecisionFeedback";
import type { PlanningClarificationHumanDecisionAction } from "../lib/planningClarificationDecisionContract";
import type {
  PlanningClarificationDecisionRepositoryInput,
  PlanningClarificationDecisionRepositoryResult
} from "../lib/planningClarificationDecisionMaterialization";
import { validateIntake } from "../lib/validateIntake";
import type {
  ProjectInputField,
  ProjectPackage,
  PowerPlatformProjectData,
  ProjectRecord,
  ReadinessChecklistId,
  ReviewItem,
  StorageState
} from "../types/project";

function initializeStorage(): StorageState {
  return loadStorageState();
}

export interface PlanningClarificationDecisionSubmissionResult {
  repositoryResult: PlanningClarificationDecisionRepositoryResult;
  feedback: PlanningClarificationDecisionFeedback;
}

export function useProjectBuilder() {
  const [storageState, setStorageState] = useState<StorageState>(initializeStorage);
  const [persistenceWarning, setPersistenceWarning] = useState<string | null>(getPersistenceWarning());
  const project = useMemo<ProjectRecord | null>(
    () => storageState.projects.find((candidate) => candidate.identity.id === storageState.activeProjectId)
      ?? storageState.projects.find((candidate) => !candidate.archivedAt)
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

  const refresh = () => {
    setStorageState(loadStorageState());
    setPersistenceWarning(getPersistenceWarning());
  };

  const updateIntake = (changes: Partial<Record<ProjectInputField, string>>) => {
    if (!project) return;
    updateProjectFields(project.identity.id, changes);
    refresh();
  };

  const updatePowerPlatform = (
    updater: (current: PowerPlatformProjectData | undefined, project: ProjectRecord) => PowerPlatformProjectData | undefined
  ) => {
    if (!project) return;
    updateProjectPowerPlatform(project.identity.id, updater);
    refresh();
  };

  const markGenerated = () => {
    if (!project) return;
    const generated = generateProjectPackage(project);
    saveGeneratedDocuments(project.identity.id, generated.documents);
    refresh();
  };

  const updateClientReviewItem = (
    reviewItemId: string,
    changes: Partial<Pick<ReviewItem, "status" | "notApplicableReason" | "deferredReason">>
  ) => {
    if (!project) return;
    updateReviewItem(project.identity.id, reviewItemId, changes);
    refresh();
  };

  const setReadinessConfirmation = (checklistId: ReadinessChecklistId, checked: boolean) => {
    if (!project) return;
    updateReadinessConfirmation(project.identity.id, checklistId, checked);
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

  const duplicateSavedProject = (projectId: string): ProjectRecord | null => {
    const duplicated = duplicateProject(projectId);
    refresh();
    return duplicated;
  };

  const archiveSavedProject = (projectId: string): ProjectRecord | null => {
    const archived = archiveProject(projectId);
    refresh();
    return archived;
  };

  const restoreSavedProject = (projectId: string): ProjectRecord | null => {
    const restored = restoreProject(projectId);
    refresh();
    return restored;
  };

  const deleteSavedProject = (projectId: string) => {
    deleteProject(projectId);
    refresh();
  };

  const submitPlanningClarificationDecision = async (
    projectId: string,
    input: PlanningClarificationDecisionRepositoryInput<PlanningClarificationHumanDecisionAction>
  ): Promise<PlanningClarificationDecisionSubmissionResult> => {
    let submissionResult: PlanningClarificationDecisionSubmissionResult;

    try {
      const repositoryResult = await materializeProjectPlanningClarificationHumanDecision(projectId, input);
      submissionResult = {
        repositoryResult,
        feedback: buildPlanningClarificationDecisionFeedback(repositoryResult)
      };
    } catch (primaryError) {
      try {
        refresh();
      } catch {
        // Preserve the primary submission error after the mandatory refresh attempt.
      }
      throw primaryError;
    }

    refresh();
    return submissionResult;
  };

  const generateOrRefreshPlanning = async (projectId: string): Promise<PlanningClarificationOrchestrationResult> => {
    let result: PlanningClarificationOrchestrationResult;
    try {
      result = await runPlanningClarificationGeneration(projectId);
    } catch (primaryError) {
      try {
        refresh();
      } catch {
        // Preserve the primary orchestration error after the mandatory refresh attempt.
      }
      throw primaryError;
    }

    refresh();
    return result;
  };

  return {
    storageState,
    project,
    projects,
    updateIntake,
    updatePowerPlatform,
    updateClientReviewItem,
    setReadinessConfirmation,
    markGenerated,
    createNewProject,
    setActiveProject,
    duplicateSavedProject,
    archiveSavedProject,
    restoreSavedProject,
    deleteSavedProject,
    generateOrRefreshPlanning,
    submitPlanningClarificationDecision,
    validationResult,
    validationIssues: validationResult.missingFields,
    generatedPackage,
    persistenceWarning
  };
}
