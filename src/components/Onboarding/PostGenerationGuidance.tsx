import { POST_GENERATION_WORKFLOW_STEPS } from "../../data/onboarding";

export function PostGenerationGuidance() {
  return (
    <section className="package-guidance post-generation-guidance" aria-labelledby="post-generation-title">
      <div>
        <span>Next workflow</span>
        <h3 id="post-generation-title">What happens after generation?</h3>
        <p>Use the package as a reviewed handoff. It does not build the final client application.</p>
      </div>
      <ol>
        {POST_GENERATION_WORKFLOW_STEPS.map((step) => <li key={step}>{step}</li>)}
      </ol>
    </section>
  );
}
