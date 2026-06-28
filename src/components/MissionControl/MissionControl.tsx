import { DOCUMENT_LOCATIONS } from "../../data/folderStructure";
import {
  getGeneratedFileCount,
  getNextAction,
  getOutstandingQuestionCount,
  getProjectDisplayStatus
} from "../../lib/projectSelectors";
import { getFirstIncompleteStep } from "../../lib/validateIntake";
import type { ProjectRecord } from "../../types/project";
import { ChevronRight, Users } from "../ui/Icons";
import { ProgressRail } from "./ProgressRail";
import { ReadinessPanel } from "./ReadinessPanel";

interface MissionControlProps {
  project: ProjectRecord;
  projects: ProjectRecord[];
  onContinue: (step?: number) => void;
  onSelectProject: (projectId: string) => void;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function MissionControl({
  project,
  projects,
  onContinue,
  onSelectProject
}: MissionControlProps) {
  const nextStep = getFirstIncompleteStep(project);
  const outstandingCount = getOutstandingQuestionCount(project);
  const generatedCount = getGeneratedFileCount(project);
  const nextAction = getNextAction(project);

  const selectProject = (projectId: string) => {
    onSelectProject(projectId);
    if (projectId === project.identity.id) onContinue(getFirstIncompleteStep(project));
  };

  return (
    <main className="page mission-control" id="main-content">
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
              <h2 id="active-project-title">{project.identity.projectName || "Untitled project"}</h2>
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
            <div><dt>Client</dt><dd>{project.client.clientName || "Missing"}</dd></div>
            <div><dt>App type</dt><dd>{project.intake.appType || "Missing"}</dd></div>
            <div><dt>Last updated</dt><dd>{dateTimeFormatter.format(new Date(project.updatedAt))}</dd></div>
            <div><dt>Review status</dt><dd>{project.reviewStatus}</dd></div>
          </dl>

          <ProgressRail project={project} onSelectStep={onContinue} />

          <div className="action-summary">
            <button className="next-action" onClick={() => onContinue(nextStep)}>
              <span className="action-icon"><Users size={21} aria-hidden="true" /></span>
              <span>
                <small>Next action</small>
                <strong>{nextAction}</strong>
                <em>Complete the next guided project action.</em>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <div className="summary-number">
              <small>Outstanding questions</small>
              <strong className={outstandingCount ? "warning-number" : ""}>{outstandingCount}</strong>
              <span>Questions need your input</span>
            </div>
            <div className="summary-number">
              <small>Generated files</small>
              <strong>{generatedCount} <span>of {DOCUMENT_LOCATIONS.length}</span></strong>
              <span>Files generated</span>
            </div>
          </div>

          <div className="recent-projects">
            <h3>Recent projects</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Project name</th><th>Status</th><th>Last updated</th><th>Generated files</th><th>Next action</th></tr>
                </thead>
                <tbody>
                  {projects.map((item) => (
                    <tr key={item.identity.id}>
                      <td>
                        <button className="table-link" onClick={() => selectProject(item.identity.id)}>
                          {item.identity.projectName || "Untitled project"}
                        </button>
                      </td>
                      <td>
                        <span className={`table-status ${item.identity.id !== project.identity.id ? "secondary" : ""}`}>
                          <i />
                          {getProjectDisplayStatus(item)}
                        </span>
                      </td>
                      <td>{dateTimeFormatter.format(new Date(item.updatedAt))}</td>
                      <td>{getGeneratedFileCount(item)} of {DOCUMENT_LOCATIONS.length}</td>
                      <td>{getNextAction(item)}</td>
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
