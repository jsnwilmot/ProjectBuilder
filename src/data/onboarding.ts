export const ONBOARDING_WORKFLOW_STEPS = [
  {
    title: "Create project",
    description: "Start a saved workspace for one project idea."
  },
  {
    title: "Choose type",
    description: "Select the closest project type so the intake shows relevant questions."
  },
  {
    title: "Complete intake",
    description: "Record the purpose, users, features, data, workflows, security, and delivery needs."
  },
  {
    title: "Review missing",
    description: "Resolve missing information or record why an item is deferred or not applicable."
  },
  {
    title: "Generate package",
    description: "Create the structured 19-document handoff package."
  },
  {
    title: "Confirm Ready",
    description: "Complete the readiness checklist and regenerate after final review."
  },
  {
    title: "Run phased prompts",
    description: "Open PHASED_CODEX_PROMPTS.md and run Phase 1 only."
  },
  {
    title: "Review Codex output with GPT Architect",
    description: "Paste the Codex report back into GPT Architect before starting the next phase."
  }
] as const;

export const POST_GENERATION_WORKFLOW_STEPS = [
  "Review PROJECT_SCOPE.md.",
  "Resolve all [MISSING: ...] markers.",
  "Review CLIENT_QUESTIONS.md with the client.",
  "Complete the Ready for Codex checklist.",
  "Copy ARCHITECT_INSTRUCTIONS.md into GPT Architect.",
  "Copy CODEX_INSTRUCTIONS.md into Codex setup, AGENTS.md, or repository instructions.",
  "Run Phase 1 only from PHASED_CODEX_PROMPTS.md.",
  "Paste Codex's completion report back into GPT Architect."
] as const;

export const EXAMPLE_PROJECT_WORKFLOW = {
  name: "Sample Local Business Website",
  projectType: "Business website",
  purpose: "Create a local business service site that helps customers understand the services and contact the business.",
  users: ["Customers", "Owner", "Administrator"],
  deliverables: ["Service and contact pages", "Brand guide", "SEO notes", "Phased Codex prompts"]
} as const;
