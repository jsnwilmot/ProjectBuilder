import { getReadinessSections } from "../../lib/projectSelectors";
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
    </aside>
  );
}

function CircleMessage() {
  return <span className="info-symbol" aria-hidden="true">i</span>;
}
