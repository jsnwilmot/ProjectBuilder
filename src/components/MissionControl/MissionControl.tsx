import { DOCUMENT_LOCATIONS } from "../../data/folderStructure";
import {
  getActiveProjectSummary,
  getDashboardWarnings,
  getGeneratedFileCount,
  getNextActionDetails,
  getOutstandingQuestionCount,
  getProjectDisplayStatus,
  getRecentProjectSummaries
} from "../../lib/projectSelectors";
import { getFirstIncompleteStep } from "../../lib/validateIntake";
import type { ProjectRecord } from "../../types/project";
import { ChevronRight, Users } from "../ui/Icons";
import { ProgressRail } from "./ProgressRail";
import { ReadinessPanel } from "./ReadinessPanel";

interface MissionControlProps {
  project: ProjectRecord | null;
  projects: ProjectRecord[];
  onContinue: (step?: number) => void;
  onCreateProject: () => void;
  onSelectProject: (projectId: string) => void;
  onOpenView: (view: "dashboard" | "intake" | "scope" | "documents" | "export", stage?: number) => void;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function MissionControl({
  project,
  projects,
  onContinue,
  onCreateProject,
  onSelectProject,
  onOpenView
}: MissionControlProps) {
  if (!project) {
    return (
      <main className="page mission-control" id="main-content" tabIndex={-1}>
        <div className="page-heading">
          <div>
            <h1>Mission Control</h1>
            <p>No active project is available yet. Create a new project to begin intake.</p>
          </div>
        </div>
        <section className="project-command" aria-labelledby="empty-state-title">
          <h2 id="empty-state-title">No active project</h2>
          <p>Create a project to start Foundation intake. Your work will be saved in this browser.</p>
          <button className="button button-primary" onClick={onCreateProject}>Create your first project</button>
        </section>
      </main>
    );
  }

  const nextStep = getFirstIncompleteStep(project);
  const outstandingCount = getOutstandingQuestionCount(project);
  const generatedCount = getGeneratedFileCount(project);
  const nextAction = getNextActionDetails(project);
  const activeSummary = getActiveProjectSummary(project);
  const dashboardWarnings = getDashboardWarnings(project);
  const recentSummaries = getRecentProjectSummaries(projects, project.identity.id);

  const selectProject = (projectId: string) => {
    onSelectProject(projectId);
  };

  const openNextAction = () => {
    if (nextAction.targetView === "intake") onContinue(nextAction.targetStage ?? nextStep);
    else onOpenView(nextAction.targetView, nextAction.targetStage);
  };

  return (
    <main className="page mission-control" id="main-content" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <h1>Mission Control</h1>
          <p>Turn a rough idea into a structured, ready-for-Codex project package.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="project-command" aria-labelledby="active-project-title">
          <div className="project-command-heading">
            <div>
              <h2 id="active-project-title">{activeSummary?.projectName || "Untitled Project"}</h2>
              <span className="status-label">
                <span className="status-dot" aria-hidden="true" />
                {getProjectDisplayStatus(project)}
              </span>
            </div>
            <button className="button button-primary button-large" onClick={() => onContinue(nextStep)}>
              Continue intake
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <dl className="project-meta">
            <div><dt>Client</dt><dd>{activeSummary?.clientName || "Missing"}</dd></div>
            <div><dt>App type</dt><dd>{activeSummary?.appType || "Missing"}</dd></div>
            <div><dt>Last updated</dt><dd>{activeSummary?.lastUpdatedLabel || dateTimeFormatter.format(new Date(project.updatedAt))}</dd></div>
            <div><dt>Review status</dt><dd>{activeSummary?.reviewStatus || project.reviewStatus}</dd></div>
          </dl>

          <ProgressRail project={project} onSelectStep={onContinue} />

          <div className="action-summary">
            <button className="next-action" onClick={openNextAction}>
              <span className="action-icon"><Users size={21} aria-hidden="true" /></span>
              <span>
                <small>Next action</small>
                <strong>{nextAction.label}</strong>
                <em>{nextAction.description}</em>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <div className="summary-number">
              <small>Outstanding questions</small>
              <strong className={outstandingCount ? "warning-number" : ""}>{outstandingCount}</strong>
              <span>Questions need your input</span>
            </div>
            <div className="summary-number">
              <small>Generated documents</small>
              <strong>{generatedCount} <span>of {DOCUMENT_LOCATIONS.length}</span></strong>
              <span>Documents generated</span>
            </div>
          </div>

          {dashboardWarnings.length > 0 ? (
            <div className="review-banner has-errors" role="status" aria-live="polite">
              <Users size={20} aria-hidden="true" />
              <div>
                <h2>Dashboard warnings</h2>
                <p>{dashboardWarnings.map((warning) => warning.message).join(" ")}</p>
              </div>
            </div>
          ) : null}

          <div className="recent-projects">
            <h3>Recent projects</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Project name</th><th>Status</th><th>Last updated</th><th>Generated documents</th><th>Next action</th></tr>
                </thead>
                <tbody>
                  {recentSummaries.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          className="table-link"
                          onClick={() => selectProject(item.id)}
                          aria-label={`Select project ${item.projectName}`}
                          aria-pressed={item.isActive}
                        >
                          {item.projectName}
                          {item.isActive ? <strong> (Active)</strong> : null}
                        </button>
                      </td>
                      <td>
                        <span className={`table-status ${!item.isActive ? "secondary" : ""}`}>
                          <i />
                          {item.status}
                        </span>
                      </td>
                      <td>{item.lastUpdatedLabel}</td>
                      <td>{item.generatedFileCount} of {DOCUMENT_LOCATIONS.length}</td>
                      <td>{item.nextAction.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <ReadinessPanel project={project} />
      </div>
    </main>
  );
}
