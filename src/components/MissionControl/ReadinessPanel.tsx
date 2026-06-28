import { intakeSteps } from "../../data/intakeSteps";
import { getStepCompletion } from "../../lib/validateIntake";
import type { ProjectIntake } from "../../types/project";
import { ClipboardCheck, Database, Network, Rocket, ShieldCheck, Sparkles } from "../ui/Icons";

interface ReadinessPanelProps {
  intake: ProjectIntake;
}

const sections = [
  { label: "Requirements", steps: [0, 1, 2], icon: ClipboardCheck },
  { label: "Architecture", steps: [0, 3], icon: Network },
  { label: "Data model", steps: [3], icon: Database },
  { label: "UI & workflows", steps: [2, 4], icon: Sparkles },
  { label: "Security", steps: [5], icon: ShieldCheck },
  { label: "Testing & deployment", steps: [6, 7], icon: Rocket }
];

export function ReadinessPanel({ intake }: ReadinessPanelProps) {
  return (
    <aside className="readiness-panel" aria-labelledby="readiness-title">
      <h2 id="readiness-title">Project readiness</h2>
      <div className="readiness-list">
        {sections.map(({ label, steps, icon: Icon }) => {
          const percent = Math.round(
            steps.reduce((total, stepIndex) => total + getStepCompletion(intake, stepIndex), 0) / steps.length
          );
          const state = percent === 100 ? "Complete" : percent > 0 ? "In progress" : "Not started";
          return (
            <div className="readiness-row" key={label}>
              <div className="readiness-icon"><Icon size={20} aria-hidden="true" /></div>
              <div className="readiness-content">
                <div className="readiness-heading">
                  <strong>{label}</strong>
                  <span>{percent}%</span>
                </div>
                <div className="readiness-state">{state}</div>
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
          <strong>{intakeSteps.length} guided stages</strong>
          Resolve missing details to build a stronger handoff.
        </p>
      </div>
    </aside>
  );
}

function CircleMessage() {
  return <span className="info-symbol" aria-hidden="true">i</span>;
}
