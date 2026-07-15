export const PACKAGE_USAGE_STEPS = [
  "Review PROJECT_SCOPE.md.",
  "Resolve every missing-information marker in the generated documents.",
  "Review CLIENT_REQUIREMENTS.md with the client.",
  "Review APP_BLUEPRINT.md as the Architect.",
  "Copy ARCHITECT_INSTRUCTIONS.md into the GPT Architect project or chat.",
  "Copy CODEX_INSTRUCTIONS.md into Codex setup, AGENTS.md, or repository instructions.",
  "Open PHASED_CODEX_PROMPTS.md.",
  "Run Phase 1 only in Codex.",
  "Paste Codex's completion report back into GPT Architect.",
  "GPT reviews Codex output and writes the next phase prompt."
] as const;
