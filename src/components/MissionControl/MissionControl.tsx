import { useState } from "react";
import { EXAMPLE_PROJECT_WORKFLOW } from "../../data/onboarding";
import { DOCUMENT_LOCATIONS } from "../../data/folderStructure";
import { getClientReviewReadiness } from "../../lib/clientReview";
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
import { WorkflowOverview } from "../Onboarding/WorkflowOverview";
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

function getStatusExplanations(project: ProjectRecord) {
  const readiness = getClientReviewReadiness(project);
  const explanations: Array<{ label: string; description: string }> = [];

  if (getGeneratedFileCount(project) > 0) {
    explanations.push(readiness.isReady
      ? {
          label: "Ready for Codex",
          description: "Scope, client review, and the readiness checklist are complete."
        }
      : {
          label: "Draft",
          description: "The package can be reviewed, but required information is still missing."
        });
  }

  if (readiness.unresolvedItems.length > 0) {
    explanations.push({
      label: "Client Questions Pending",
      description: "Some client questions still need answers before the project can be Ready for Codex."
    });
  }

  return explanations;
}

export function MissionControl({
  project,
  projects,
  onContinue,
  onCreateProject,
  onSelectProject,
  onOpenView
}: MissionControlProps) {
  const [showExample, setShowExample] = useState(false);

  if (!project) {
    return (
      <main className="page mission-control" id="main-content" tabIndex={-1}>
        <div className="page-heading">
          <div>
            <h1>Mission Control</h1>
            <p>Start with a rough idea and leave with a structured project package for review and phased development.</p>
          </div>
        </div>
        <div className="welcome-layout">
          <section className="welcome-panel" aria-labelledby="welcome-title">
            <span className="eyebrow">Welcome to GPT Project Builder</span>
            <h2 id="welcome-title">Turn a rough project idea into a clear Codex handoff</h2>
            <p className="welcome-intro">
              Create your first project, choose its type, complete the tailored intake, review missing information,
              generate the package, and move to Codex when the checklist is complete.
            </p>
            <div className="welcome-boundaries">
              <div>
                <h3>What it creates</h3>
                <p>A structured 19-document package with scope, requirements, architecture, testing, handoff guidance, and phased Codex prompts.</p>
              </div>
              <div>
                <h3>What it does not create</h3>
                <p>It does not build the final client application or replace review by the client, GPT Architect, or developer.</p>
              </div>
            </div>
            <div className="welcome-actions">
              <button className="button button-primary" onClick={onCreateProject}>Create New Project</button>
              <button
                className="button button-secondary"
                onClick={() => setShowExample((isOpen) => !isOpen)}
                aria-expanded={showExample}
                aria-controls="example-workflow"
              >
                {showExample ? "Close Example Workflow" : "View Example Workflow"}
              </button>
            </div>
          </section>

          <WorkflowOverview />
        </div>

        {showExample ? (
          <section className="example-workflow" id="example-workflow" aria-labelledby="example-workflow-title">
            <div className="example-workflow-heading">
              <div>
                <span>Read-only example</span>
                <h2 id="example-workflow-title">{EXAMPLE_PROJECT_WORKFLOW.name}</h2>
                <p>This preview is not saved and will not replace any project.</p>
              </div>
              <button className="button button-secondary" onClick={() => setShowExample(false)}>Close example</button>
            </div>
            <dl>
              <div>
                <dt>Project type</dt>
                <dd>{EXAMPLE_PROJECT_WORKFLOW.projectType}</dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{EXAMPLE_PROJECT_WORKFLOW.purpose}</dd>
              </div>
              <div>
                <dt>Users</dt>
                <dd>{EXAMPLE_PROJECT_WORKFLOW.users.join(", ")}</dd>
              </div>
              <div>
                <dt>Expected deliverables</dt>
                <dd>{EXAMPLE_PROJECT_WORKFLOW.deliverables.join(", ")}</dd>
              </div>
            </dl>
          </section>
        ) : null}
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
  const statusExplanations = getStatusExplanations(project);

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
              {statusExplanations.length > 0 ? (
                <div className="status-explanations">
                  {statusExplanations.map((item) => (
                    <p key={item.label}><strong>{item.label}:</strong> {item.description}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <button className="button button-primary button-large" onClick={() => onContinue(nextStep)}>
              Continue intake
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>

          <dl className="project-meta">
            <div><dt>Client</dt><dd>{activeSummary?.clientName || "Missing"}</dd></div>
            <div><dt>Project type</dt><dd>{activeSummary?.appType || "Missing"}</dd></div>
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
