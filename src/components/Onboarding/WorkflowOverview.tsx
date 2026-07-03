import { ONBOARDING_WORKFLOW_STEPS } from "../../data/onboarding";

interface WorkflowOverviewProps {
  headingLevel?: "h2" | "h3";
}

export function WorkflowOverview({ headingLevel: Heading = "h2" }: WorkflowOverviewProps) {
  return (
    <section className="workflow-overview" aria-labelledby="workflow-overview-title">
      <div className="workflow-overview-heading">
        <span>How it works</span>
        <Heading id="workflow-overview-title">From rough idea to Codex handoff</Heading>
        <p>Project types get different questions, so each package stays relevant to the work being planned.</p>
      </div>
      <ol>
        {ONBOARDING_WORKFLOW_STEPS.map((step, index) => (
          <li key={step.title}>
            <span aria-hidden="true">{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
