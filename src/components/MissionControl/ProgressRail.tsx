import { intakeSteps } from "../../data/intakeSteps";
import { getStepCompletion } from "../../lib/validateIntake";
import type { ProjectRecord } from "../../types/project";

interface ProgressRailProps {
  project: ProjectRecord;
  onSelectStep: (index: number) => void;
}

export function ProgressRail({ project, onSelectStep }: ProgressRailProps) {
  return (
    <ol className="progress-rail" aria-label="Intake progress">
      {intakeSteps.map((step, index) => {
        const completion = getStepCompletion(project, index);
        return (
          <li key={step.id} className={completion === 100 ? "is-complete" : completion > 0 ? "is-current" : ""}>
            <button onClick={() => onSelectStep(index)} aria-label={`${step.label}: ${completion}% complete`}>
              <span className="step-number">{index + 1}</span>
              <span className="step-label">{step.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
