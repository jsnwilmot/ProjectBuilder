import type { ProjectState } from "../types/project";

const STORAGE_KEY = "gpt-project-builder:project:v1";

export function loadProject(fallback: () => ProjectState): ProjectState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as ProjectState : fallback();
  } catch {
    return fallback();
  }
}

export function saveProject(project: ProjectState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // The in-memory state remains usable when storage is unavailable.
  }
}
