import { getReadinessSections } from "../../lib/projectSelectors";
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
  const selectedBackends = getSelectedCanvasDataSourceTypes(project);
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
        </div>
      ) : null}
    </aside>
  );
}

function CircleMessage() {
  return <span className="info-symbol" aria-hidden="true">i</span>;
}
