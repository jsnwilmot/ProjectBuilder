export const DOCUMENT_PURPOSES: Readonly<Record<string, string>> = {
  "README.md": "Introduces the project package, its contents, and how GPT Architect and Codex should use it.",
  "PROJECT_SCOPE.md": "Defines approved scope, boundaries, assumptions, and success criteria.",
  "NEXT_STEPS.md": "Explains the review and phased implementation workflow after generation.",
  "CHANGE_LOG.md": "Records package generation history, decisions, testing, and remaining work.",
  "HANDOFF_CHECKLIST.md": "Confirms review and readiness before development begins.",
  "CLIENT_REQUIREMENTS.md": "Summarizes client-provided requirements, users, features, constraints, and outcomes.",
  "CLIENT_QUESTIONS.md": "Lists client questions, unresolved information, and deferred decisions.",
  "ACCEPTANCE_CRITERIA.md": "Defines observable conditions that must pass before the project is accepted.",
  "ARCHITECT_INSTRUCTIONS.md": "Guides GPT Architect during project review and Codex prompt creation.",
  "APP_BLUEPRINT.md": "Describes the proposed solution structure, modules, screens, data, and workflows.",
  "DATA_MODEL.md": "Defines the project entities, fields, relationships, sources, and ownership.",
  "SCREEN_MAP.md": "Maps required pages, screens, views, navigation, and user access.",
  "BRAND_GUIDE.md": "Records approved brand assets, visual direction, tone, and accessibility requirements.",
  "WORKFLOW_MAP.md": "Documents workflow triggers, steps, outcomes, approvals, and error handling.",
  "SECURITY_MODEL.md": "Defines roles, permissions, sensitive-data handling, risks, and security boundaries.",
  "CODEX_INSTRUCTIONS.md": "Guides Codex during implementation and defines development constraints.",
  "TEST_PLAN.md": "Defines required automated, manual, accessibility, responsive, and release testing.",
  "DEPLOYMENT_NOTES.md": "Records hosting, configuration, release, rollback, and operational requirements.",
  "PHASED_CODEX_PROMPTS.md": "Provides phase-by-phase implementation prompts for Codex."
};

export const QUICK_COPY_DOCUMENTS = [
  "ARCHITECT_INSTRUCTIONS.md",
  "CODEX_INSTRUCTIONS.md",
  "PHASED_CODEX_PROMPTS.md",
  "CLIENT_QUESTIONS.md",
  "NEXT_STEPS.md"
] as const;
