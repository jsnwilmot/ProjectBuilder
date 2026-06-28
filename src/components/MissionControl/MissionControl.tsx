import { DOCUMENT_LOCATIONS } from "../../data/folderStructure";
import { getFirstIncompleteStep } from "../../lib/validateIntake";
import type { ProjectState } from "../../types/project";
import { ChevronRight, Users } from "../ui/Icons";
import { ProgressRail } from "./ProgressRail";
import { ReadinessPanel } from "./ReadinessPanel";

interface MissionControlProps {
  project: ProjectState;
  outstandingCount: number;
  generatedCount: number;
  onContinue: (step?: number) => void;
}

const recentProjects = [
  { name: "Community Services Portal", status: "Intake Started", updated: "Current project", files: "0 of 16" },
  { name: "Volunteer Management App", status: "Scope Review", updated: "Example", files: "7 of 16" },
  { name: "Facilities Booking System", status: "Needs Review", updated: "Example", files: "3 of 16" }
];

export function MissionControl({
  project,
  outstandingCount,
  generatedCount,
  onContinue
}: MissionControlProps) {
  const nextStep = getFirstIncompleteStep(project.intake);
  const updated = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(project.metadata.lastUpdated));

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
              <h2 id="active-project-title">{project.intake.appName || "Untitled project"}</h2>
              <span className="status-label">
                <span className="status-dot" aria-hidden="true" />
                {project.metadata.status}
              </span>
            </div>
            <button className="button button-primary button-large" onClick={() => onContinue(nextStep)}>
              Continue intake
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <dl className="project-meta">
            <div><dt>Client</dt><dd>{project.intake.clientName || "Missing"}</dd></div>
            <div><dt>App type</dt><dd>{project.intake.appType || "Missing"}</dd></div>
            <div><dt>Last updated</dt><dd>{updated}</dd></div>
            <div><dt>Review status</dt><dd>{project.metadata.reviewStatus}</dd></div>
          </dl>

          <ProgressRail intake={project.intake} onSelectStep={onContinue} />

          <div className="action-summary">
            <button className="next-action" onClick={() => onContinue(nextStep)}>
              <span className="action-icon"><Users size={21} aria-hidden="true" /></span>
              <span>
                <small>Next action</small>
                <strong>Define {nextStep === 0 ? "the project foundation" : "remaining project details"}</strong>
                <em>Complete the next guided intake stage.</em>
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
                  {recentProjects.map((item, index) => (
                    <tr key={item.name}>
                      <td><button className="table-link" onClick={index === 0 ? () => onContinue(nextStep) : undefined}>{item.name}</button></td>
                      <td><span className={`table-status ${index > 0 ? "secondary" : ""}`}><i />{item.status}</span></td>
                      <td>{item.updated}</td>
                      <td>{index === 0 ? `${generatedCount} of 16` : item.files}</td>
                      <td>{index === 0 ? "Continue intake" : "Review example"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <ReadinessPanel intake={project.intake} />
      </div>
    </main>
  );
}
