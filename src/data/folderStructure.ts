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

export interface DocumentLocation {
  fileName: string;
  folder: string;
}

export const CORE_DOCUMENT_LOCATIONS: readonly DocumentLocation[] = [
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

export const CANVAS_COMMON_DOCUMENT_LOCATIONS: readonly DocumentLocation[] = [
  { fileName: "DATA_SOURCE_SCHEMA.md", folder: "03_Data_Model" },
  { fileName: "POWER_FX_STANDARDS.md", folder: "07_Development" },
  { fileName: "DELEGATION_REGISTER.md", folder: "07_Development" },
  { fileName: "SCREEN_MAP.md", folder: "04_UI_UX" },
  { fileName: "CONTROL_INVENTORY.md", folder: "04_UI_UX" },
  { fileName: "APP_CONFIGURATION.md", folder: "02_Architecture" },
  { fileName: "YAML_MANIFEST.md", folder: "04_UI_UX" },
  { fileName: "CONNECTOR_REGISTER.md", folder: "01_Requirements" },
  { fileName: "LICENSING_ASSESSMENT.md", folder: "00_Project_Overview" },
  { fileName: "CONNECTION_REGISTER.md", folder: "07_Development" },
  { fileName: "IMPLEMENTATION_LOG.md", folder: "07_Development" },
  { fileName: "ALM_DEPLOYMENT_PLAN.md", folder: "09_Deployment" }
] as const;

export const CANVAS_SHAREPOINT_DOCUMENT_LOCATIONS: readonly DocumentLocation[] = [
  { fileName: "SHAREPOINT_SCHEMA.md", folder: "03_Data_Model" },
  { fileName: "INTERNAL_COLUMN_NAMES.md", folder: "03_Data_Model" }
] as const;

export const CANVAS_DATAVERSE_DOCUMENT_LOCATIONS: readonly DocumentLocation[] = [
  { fileName: "DATAVERSE_SCHEMA.md", folder: "03_Data_Model" },
  { fileName: "LOGICAL_NAMES.md", folder: "03_Data_Model" }
] as const;

export const CANVAS_OTHER_CONNECTOR_DOCUMENT_LOCATIONS: readonly DocumentLocation[] = [
  { fileName: "CONNECTOR_SCHEMA.md", folder: "03_Data_Model" }
] as const;

export const MODEL_DRIVEN_DOCUMENT_LOCATIONS: readonly DocumentLocation[] = [
  { fileName: "DATAVERSE_SCHEMA.md", folder: "03_Data_Model" },
  { fileName: "LOGICAL_NAMES.md", folder: "03_Data_Model" },
  { fileName: "SOLUTION_ARCHITECTURE.md", folder: "02_Architecture" },
  { fileName: "SOLUTION_COMPONENT_REGISTER.md", folder: "07_Development" },
  { fileName: "TABLE_RELATIONSHIPS.md", folder: "03_Data_Model" },
  { fileName: "FORMS_AND_VIEWS.md", folder: "04_UI_UX" },
  { fileName: "APP_NAVIGATION.md", folder: "04_UI_UX" },
  { fileName: "BUSINESS_RULES.md", folder: "05_Workflows" },
  { fileName: "BUSINESS_PROCESS_FLOWS.md", folder: "05_Workflows" },
  { fileName: "AUTOMATION_REGISTER.md", folder: "05_Workflows" },
  { fileName: "SECURITY_ROLES.md", folder: "06_Security" },
  { fileName: "CUSTOM_PAGES.md", folder: "04_UI_UX" },
  { fileName: "EXTENSION_REGISTER.md", folder: "07_Development" },
  { fileName: "CONNECTOR_REGISTER.md", folder: "01_Requirements" },
  { fileName: "LICENSING_ASSESSMENT.md", folder: "00_Project_Overview" },
  { fileName: "CONNECTION_REGISTER.md", folder: "07_Development" },
  { fileName: "ENVIRONMENT_VARIABLES.md", folder: "07_Development" },
  { fileName: "IMPLEMENTATION_LOG.md", folder: "07_Development" },
  { fileName: "ALM_DEPLOYMENT_PLAN.md", folder: "09_Deployment" }
] as const;

// Backward-compatible alias used by existing flows and tests.
export const DOCUMENT_LOCATIONS = CORE_DOCUMENT_LOCATIONS;
