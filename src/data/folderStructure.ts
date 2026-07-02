export const PROJECT_FOLDERS = [
  "00_Project_Overview",
  "01_Requirements",
  "02_Architecture",
  "03_Data_Model",
  "04_UI_UX",
  "05_Workflows",
  "06_Security",
  "07_Development",
  "08_Testing",
  "09_Deployment",
  "10_Documentation",
  "11_Codex_Prompts"
] as const;

export const DOCUMENT_LOCATIONS = [
  { fileName: "README.md", folder: "00_Project_Overview" },
  { fileName: "PROJECT_SCOPE.md", folder: "00_Project_Overview" },
  { fileName: "NEXT_STEPS.md", folder: "00_Project_Overview" },
  { fileName: "CHANGE_LOG.md", folder: "00_Project_Overview" },
  { fileName: "HANDOFF_CHECKLIST.md", folder: "00_Project_Overview" },
  { fileName: "CLIENT_REQUIREMENTS.md", folder: "01_Requirements" },
  { fileName: "CLIENT_QUESTIONS.md", folder: "01_Requirements" },
  { fileName: "ACCEPTANCE_CRITERIA.md", folder: "01_Requirements" },
  { fileName: "ARCHITECT_INSTRUCTIONS.md", folder: "02_Architecture" },
  { fileName: "APP_BLUEPRINT.md", folder: "02_Architecture" },
  { fileName: "DATA_MODEL.md", folder: "03_Data_Model" },
  { fileName: "SCREEN_MAP.md", folder: "04_UI_UX" },
  { fileName: "BRAND_GUIDE.md", folder: "04_UI_UX" },
  { fileName: "WORKFLOW_MAP.md", folder: "05_Workflows" },
  { fileName: "SECURITY_MODEL.md", folder: "06_Security" },
  { fileName: "CODEX_INSTRUCTIONS.md", folder: "07_Development" },
  { fileName: "TEST_PLAN.md", folder: "08_Testing" },
  { fileName: "DEPLOYMENT_NOTES.md", folder: "09_Deployment" },
  { fileName: "PHASED_CODEX_PROMPTS.md", folder: "11_Codex_Prompts" }
] as const;
