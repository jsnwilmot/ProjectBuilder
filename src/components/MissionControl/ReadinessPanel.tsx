import { getProjectCompletionPercent, getReadinessSections } from "../../lib/projectSelectors";
import { getDocumentStatusSummary } from "../../lib/documentReview";
import {
  calculatePowerPlatformReadiness,
  formatCanvasDataSourceType,
  formatPowerPlatformGateStatus,
  getSelectedCanvasDataSourceTypes
} from "../../lib/powerPlatform";
import type { ProjectRecord } from "../../types/project";
import { ClipboardCheck, Database, Network, Rocket, ShieldCheck, Sparkles } from "../ui/Icons";

interface ReadinessPanelProps {
  project: ProjectRecord;
}

const readinessIcons = {
  requirements: ClipboardCheck,
  architecture: Network,
  "data-model": Database,
  "ui-workflows": Sparkles,
  security: ShieldCheck,
  "testing-deployment": Rocket
};

export function ReadinessPanel({ project }: ReadinessPanelProps) {
  const sections = getReadinessSections(project);
  const powerPlatformReadiness = calculatePowerPlatformReadiness(project);
  const answerCompletionPercent = getProjectCompletionPercent(project);
  const selectedBackends = getSelectedCanvasDataSourceTypes(project);
  const documentSummary = getDocumentStatusSummary(project);
  return (
    <aside className="readiness-panel" aria-labelledby="readiness-title">
      <h2 id="readiness-title">Project readiness</h2>
      <div className="readiness-list">
        {sections.map(({ id, label, percent, state, missingCount, warningCount }) => {
          const Icon = readinessIcons[id as keyof typeof readinessIcons];
          return (
            <div className="readiness-row" key={label}>
              <div className="readiness-icon"><Icon size={20} aria-hidden="true" /></div>
              <div className="readiness-content">
                <div className="readiness-heading">
                  <strong>{label}</strong>
                  <span>{percent}%</span>
                </div>
                <div className="readiness-state">{state}</div>
                <div className="readiness-state">
                  Missing: {missingCount ?? 0} | Warnings: {warningCount ?? 0}
                </div>
                <div className="progress-track" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="readiness-note">
        <CircleMessage />
        <p>
          <strong>8 guided stages</strong>
          Resolve missing details to build a stronger handoff.
        </p>
      </div>
      {answerCompletionPercent === 100 && powerPlatformReadiness.projectType !== "none" && !powerPlatformReadiness.isReadyForCodex ? (
        <div className="readiness-note">
          <CircleMessage />
          <p>
            <strong>Answers complete; confirmations remain</strong>
            Power Platform answers are fully populated, but one or more controlled readiness confirmations still need review.
          </p>
        </div>
      ) : null}
      {powerPlatformReadiness.projectType !== "none" ? (
        <div className="power-platform-readiness-summary">
          <h3>Power Platform gates</h3>
          {selectedBackends.length ? (
            <p>Selected backends: {selectedBackends.map(formatCanvasDataSourceType).join(", ")}</p>
          ) : null}
          <p>{powerPlatformReadiness.nextBlockingAction}</p>
          <ul>
            {powerPlatformReadiness.gates.slice(0, 6).map((gate) => (
              <li key={gate.id}>
                <span>{gate.label}</span>
                <strong>{formatPowerPlatformGateStatus(gate.status)}</strong>
              </li>
            ))}
          </ul>
          <h3>Document generation status</h3>
          <dl className="document-status-summary">
            <div><dt>Applicable documents</dt><dd>{documentSummary.applicableDocumentCount}</dd></div>
            <div><dt>Generated documents</dt><dd>{documentSummary.generatedDocumentCount}</dd></div>
            <div><dt>Ready documents</dt><dd>{documentSummary.readyDocuments}</dd></div>
            <div><dt>Review-required documents</dt><dd>{documentSummary.reviewRequiredDocuments}</dd></div>
            <div><dt>Draft documents</dt><dd>{documentSummary.draftDocuments}</dd></div>
            <div><dt>Not applicable documents</dt><dd>{documentSummary.notApplicableDocuments}</dd></div>
            <div><dt>Blocked by missing information</dt><dd>{documentSummary.blockedByMissingInformation}</dd></div>
            <div><dt>Architect instructions</dt><dd>{documentSummary.architectInstructionsStatus}</dd></div>
            <div><dt>Codex instructions</dt><dd>{documentSummary.codexInstructionsStatus}</dd></div>
            <div><dt>Codex phases</dt><dd>{documentSummary.codexPhasesStatus}</dd></div>
          </dl>
        </div>
      ) : null}
    </aside>
  );
}

function CircleMessage() {
  return <span className="info-symbol" aria-hidden="true">i</span>;
}
