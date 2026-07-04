import { useEffect, useRef, useState } from "react";
import { DOCUMENT_LOCATIONS } from "../../data/folderStructure";
import {
  getProjectManagementCounts,
  getRecentProjectSummaries
} from "../../lib/projectSelectors";
import type { ProjectRecord } from "../../types/project";

interface SavedProjectManagementProps {
  projects: ProjectRecord[];
  activeProjectId: string | null;
  onOpen: (projectId: string) => void;
  onDuplicate: (projectId: string) => ProjectRecord | null;
  onArchive: (projectId: string) => ProjectRecord | null;
  onRestore: (projectId: string) => ProjectRecord | null;
  onDelete: (projectId: string) => void;
}

interface ProjectTableProps {
  title: string;
  description: string;
  projects: ProjectRecord[];
  activeProjectId: string | null;
  archived: boolean;
  onOpen: (projectId: string) => void;
  onDuplicate: (projectId: string) => void;
  onArchive: (projectId: string) => void;
  onRestore: (projectId: string) => void;
  onRequestDelete: (project: ProjectRecord) => void;
}

function ProjectTable({
  title,
  description,
  projects,
  activeProjectId,
  archived,
  onOpen,
  onDuplicate,
  onArchive,
  onRestore,
  onRequestDelete
}: ProjectTableProps) {
  const summaries = getRecentProjectSummaries(projects, activeProjectId);

  return (
    <section className="saved-project-group" aria-labelledby={`${archived ? "archived" : "active"}-projects-title`}>
      <div className="saved-project-group-heading">
        <div>
          <h3 id={`${archived ? "archived" : "active"}-projects-title`}>{title}</h3>
          <p>{description}</p>
        </div>
        <span>{projects.length}</span>
      </div>
      {summaries.length > 0 ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project name</th>
                <th>Status</th>
                <th>Last updated</th>
                <th>Generated documents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.projectName}</strong>
                    {item.isActive ? <span className="active-project-label">Active</span> : null}
                  </td>
                  <td>
                    <span className={`table-status ${archived ? "archived" : "secondary"}`}>
                      <i />
                      {archived ? "Archived" : item.status}
                    </span>
                  </td>
                  <td>{item.lastUpdatedLabel}</td>
                  <td>{item.generatedFileCount} of {DOCUMENT_LOCATIONS.length}</td>
                  <td>
                    <div className="project-row-actions" aria-label={`Actions for ${item.projectName}`}>
                      <button
                        className="button button-tertiary"
                        onClick={() => onOpen(item.id)}
                        aria-label={`Open ${item.projectName}`}
                      >
                        Open
                      </button>
                      <button
                        className="button button-tertiary"
                        onClick={() => onDuplicate(item.id)}
                        aria-label={`Duplicate ${item.projectName}`}
                      >
                        Duplicate
                      </button>
                      {archived ? (
                        <button
                          className="button button-tertiary"
                          onClick={() => onRestore(item.id)}
                          aria-label={`Restore ${item.projectName}`}
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          className="button button-tertiary"
                          onClick={() => onArchive(item.id)}
                          aria-label={`Archive ${item.projectName}`}
                        >
                          Archive
                        </button>
                      )}
                      <button
                        className="button button-danger-subtle"
                        onClick={() => {
                          const candidate = projects.find((project) => project.identity.id === item.id);
                          if (candidate) onRequestDelete(candidate);
                        }}
                        aria-label={`Delete ${item.projectName}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="saved-project-empty">
          {archived ? "No archived projects." : "No active projects. Create a project or restore an archived project."}
        </p>
      )}
    </section>
  );
}

export function SavedProjectManagement({
  projects,
  activeProjectId,
  onOpen,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete
}: SavedProjectManagementProps) {
  const [showArchived, setShowArchived] = useState(false);
  const [notice, setNotice] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<ProjectRecord | null>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const activeProjects = projects.filter((project) => !project.archivedAt);
  const archivedProjects = projects.filter((project) => Boolean(project.archivedAt));
  const counts = getProjectManagementCounts(projects);

  useEffect(() => {
    if (deleteCandidate) cancelDeleteRef.current?.focus();
  }, [deleteCandidate]);

  const duplicate = (projectId: string) => {
    const duplicated = onDuplicate(projectId);
    if (!duplicated) return;
    setNotice(`${duplicated.identity.projectName} created. Review the copied project before marking it Ready for Codex.`);
  };

  const archive = (projectId: string) => {
    const archived = onArchive(projectId);
    if (!archived) return;
    setNotice(`${archived.identity.projectName} archived. It is hidden from the active list and can be restored.`);
  };

  const restore = (projectId: string) => {
    const restored = onRestore(projectId);
    if (!restored) return;
    setNotice(`${restored.identity.projectName} restored to active projects.`);
  };

  const permanentlyDelete = () => {
    if (!deleteCandidate) return;
    const projectName = deleteCandidate.identity.projectName.trim() || "Untitled Project";
    onDelete(deleteCandidate.identity.id);
    setDeleteCandidate(null);
    setNotice(`${projectName} permanently deleted from this browser.`);
  };

  return (
    <section className="saved-project-management" aria-labelledby="saved-project-management-title">
      <div className="saved-project-management-heading">
        <div>
          <span className="eyebrow">Saved project management</span>
          <h2 id="saved-project-management-title">Projects</h2>
          <p>Open work, create a reusable copy, archive it without data loss, or delete it after confirmation.</p>
        </div>
        <button
          className="button button-secondary"
          onClick={() => setShowArchived((current) => !current)}
          aria-expanded={showArchived}
          aria-controls="archived-projects"
        >
          {showArchived ? "Hide archived" : `Show archived (${counts.archived})`}
        </button>
      </div>

      <dl className="project-management-summary" aria-label="Project counts">
        <div><dt>Active projects</dt><dd>{counts.active}</dd></div>
        <div><dt>Archived projects</dt><dd>{counts.archived}</dd></div>
        <div><dt>Ready for Codex</dt><dd>{counts.readyForCodex}</dd></div>
        <div><dt>Draft packages</dt><dd>{counts.draft}</dd></div>
        <div><dt>With blockers</dt><dd>{counts.withBlockers}</dd></div>
      </dl>

      {notice ? (
        <div className="project-management-notice" role="status" aria-live="polite">
          <p>{notice}</p>
          <button className="button button-tertiary" onClick={() => setNotice("")}>Dismiss</button>
        </div>
      ) : null}

      <ProjectTable
        title="Active projects"
        description="Duplicate creates a new copy. Archive hides a project without deleting its saved data."
        projects={activeProjects}
        activeProjectId={activeProjectId}
        archived={false}
        onOpen={onOpen}
        onDuplicate={duplicate}
        onArchive={archive}
        onRestore={restore}
        onRequestDelete={setDeleteCandidate}
      />

      {showArchived ? (
        <div id="archived-projects">
          <ProjectTable
            title="Archived projects"
            description="Archived projects retain their saved data and can be opened, duplicated, restored, or permanently deleted."
            projects={archivedProjects}
            activeProjectId={activeProjectId}
            archived
            onOpen={onOpen}
            onDuplicate={duplicate}
            onArchive={archive}
            onRestore={restore}
            onRequestDelete={setDeleteCandidate}
          />
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="confirmation-backdrop">
          <section
            className="delete-confirmation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirmation-title"
            aria-describedby="delete-confirmation-description"
          >
            <span className="eyebrow">Permanent action</span>
            <h2 id="delete-confirmation-title">Delete {deleteCandidate.identity.projectName.trim() || "Untitled Project"}?</h2>
            <p id="delete-confirmation-description">
              This permanently removes the saved project from this browser. This action cannot be undone.
            </p>
            <div className="delete-confirmation-actions">
              <button
                className="button button-secondary"
                onClick={() => setDeleteCandidate(null)}
                ref={cancelDeleteRef}
              >
                Cancel
              </button>
              <button className="button button-danger" onClick={permanentlyDelete}>
                Permanently Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
