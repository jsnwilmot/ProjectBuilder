import type { ReactNode } from "react";
import {
  calculatePowerPlatformReadiness,
  createDefaultConnector,
  createDefaultConnectorField,
  createDefaultConnectorResource,
  createDefaultCanvasComponentTarget,
  createDefaultCanvasComponentUsageTarget,
  createDefaultCanvasControlTarget,
  createDefaultCanvasDataSourceReference,
  createDefaultCanvasScreenTarget,
  createDefaultDataverseColumn,
  createDefaultDataverseRelationship,
  createDefaultDataverseTable,
  createDefaultPowerPlatformData,
  createDefaultSharePointColumn,
  createDefaultSharePointLibrary,
  createDefaultSharePointList,
  formatPowerPlatformGateStatus,
  reconcileCanvasConnectorRoles,
  usesDataverse,
  usesOtherConnector,
  usesSharePoint
} from "../../lib/powerPlatform";
import type {
  CanvasDataSourceType,
  PowerAppsCanvasSubtype,
  SelectableCanvasDataSourceType,
  PowerPlatformApplicabilityDecision,
  PowerPlatformCanvasData,
  PowerPlatformCommonData,
  PowerPlatformConnector,
  ConnectorOperation,
  PowerPlatformDecisionStatus,
  PowerPlatformModelDrivenData,
  PowerPlatformProjectData,
  ProjectRecord
} from "../../types/project";
import { CircleAlert } from "../ui/Icons";

interface PowerPlatformIntakeProps {
  project: ProjectRecord;
  stageId: string;
  onUpdatePowerPlatform: (
    updater: (current: PowerPlatformProjectData | undefined, project: ProjectRecord) => PowerPlatformProjectData | undefined
  ) => void;
}

type CommonField = keyof PowerPlatformCommonData;
type CanvasField = keyof PowerPlatformCanvasData;
type ModelDrivenField = keyof PowerPlatformModelDrivenData;
type ConnectorField = keyof Omit<PowerPlatformConnector, "supportedOperations" | "classificationConfirmed" | "licensingConfirmed">;
type CanvasArrayField = {
  [K in keyof PowerPlatformCanvasData]: PowerPlatformCanvasData[K] extends Array<{ id: string }> ? K : never;
}[keyof PowerPlatformCanvasData];
type ModelDrivenArrayField = {
  [K in keyof PowerPlatformModelDrivenData]: PowerPlatformModelDrivenData[K] extends Array<{ id: string }> ? K : never;
}[keyof PowerPlatformModelDrivenData];

const canvasDataSourceOptions: Array<{ value: CanvasDataSourceType; label: string }> = [
  { value: "undecided", label: "Not decided yet" },
  { value: "sharePointList", label: "SharePoint list" },
  { value: "sharePointLibrary", label: "SharePoint document library" },
  { value: "microsoftList", label: "Microsoft List" },
  { value: "dataverse", label: "Dataverse" },
  { value: "excel", label: "Excel" },
  { value: "sqlServer", label: "SQL Server" },
  { value: "microsoft365Connector", label: "Microsoft 365 connector" },
  { value: "customConnector", label: "Custom connector" },
  { value: "externalApi", label: "External API" },
  { value: "otherConnector", label: "Other connector" },
  { value: "multiple", label: "Multiple data sources" }
];

const connectorClassificationOptions = ["unknown", "standard", "premium", "custom", "notApplicable"] as const;
const canvasSubtypeOptions: Array<{ value: PowerAppsCanvasSubtype | ""; label: string }> = [
  { value: "", label: "Select Canvas subtype" },
  { value: "blankResponsive", label: "Blank responsive" },
  { value: "tablet", label: "Tablet" },
  { value: "phone", label: "Phone" },
  { value: "sharePointCustomized", label: "SharePoint customized" },
  { value: "teamsEmbedded", label: "Teams embedded" },
  { value: "sharePointOnline", label: "SharePoint Online" },
  { value: "microsoftLists", label: "Microsoft Lists" },
  { value: "dataverse", label: "Dataverse" },
  { value: "otherConnector", label: "Other connector" },
  { value: "multipleDataSources", label: "Multiple data sources" },
  { value: "customPage", label: "Custom page" },
  { value: "other", label: "Other" }
];
const connectorOperations: ConnectorOperation[] = ["read", "create", "update", "delete", "archive", "restore", "upload", "download"];
const decisionStatusOptions: Array<{ value: PowerPlatformDecisionStatus; label: string }> = [
  { value: "notStarted", label: "Not started" },
  { value: "missingInformation", label: "Missing information" },
  { value: "reviewNeeded", label: "Review needed" },
  { value: "confirmed", label: "Confirmed" },
  { value: "blocked", label: "Blocked" },
  { value: "notApplicable", label: "Not applicable" }
];
const decisionValues = new Set(decisionStatusOptions.map((option) => option.value));
const selectableCanvasDataSources = canvasDataSourceOptions.filter((option): option is { value: SelectableCanvasDataSourceType; label: string } =>
  option.value !== "undecided" && option.value !== "multiple"
);

function clonePowerPlatformData(current: PowerPlatformProjectData | undefined, project: ProjectRecord): PowerPlatformProjectData {
  const base = current ?? createDefaultPowerPlatformData(project.intake.appType);
  return JSON.parse(JSON.stringify(base ?? createDefaultPowerPlatformData("microsoft365"))) as PowerPlatformProjectData;
}

function fieldId(scope: string, name: string): string {
  return `power-platform-${scope}-${name}`;
}

function controlledDecisionStatus(value: string | undefined): PowerPlatformDecisionStatus {
  return decisionValues.has(value as PowerPlatformDecisionStatus) ? value as PowerPlatformDecisionStatus : "missingInformation";
}

function TextField({
  id,
  label,
  description,
  value,
  onChange,
  multiline = false,
  required = false
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
}) {
  const descriptionId = `${id}-description`;
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="required-label">Required</span> : <span>Optional</span>}
      </label>
      <p id={descriptionId}>{description}</p>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={descriptionId}
          required={required}
          rows={4}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={descriptionId}
          required={required}
        />
      )}
    </div>
  );
}

function SelectField<TValue extends string>({
  id,
  label,
  description,
  value,
  options,
  onChange,
  required = false
}: {
  id: string;
  label: string;
  description: string;
  value: TValue;
  options: Array<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
  required?: boolean;
}) {
  const descriptionId = `${id}-description`;
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="required-label">Required</span> : <span>Optional</span>}
      </label>
      <p id={descriptionId}>{description}</p>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as TValue)}
        aria-describedby={descriptionId}
        required={required}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function DecisionStatusField({
  id,
  label,
  description,
  value,
  onChange,
  required = false
}: {
  id: string;
  label: string;
  description: string;
  value: string | undefined;
  onChange: (value: PowerPlatformDecisionStatus) => void;
  required?: boolean;
}) {
  return (
    <SelectField
      id={id}
      label={label}
      description={description}
      value={controlledDecisionStatus(value)}
      options={decisionStatusOptions}
      onChange={onChange}
      required={required}
    />
  );
}

export function PowerPlatformIntake({ project, stageId, onUpdatePowerPlatform }: PowerPlatformIntakeProps) {
  if (project.intake.appType !== "powerAppsCanvas" && project.intake.appType !== "powerAppsModelDriven") return null;

  const data = project.powerPlatform ?? createDefaultPowerPlatformData(project.intake.appType)!;
  const common = data.common;
  const canvas = data.canvas;
  const modelDriven = data.modelDriven;
  const readiness = calculatePowerPlatformReadiness(project);

  const updateCommon = (field: CommonField, value: string) => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      next.common[field] = value as never;
      return next;
    });
  };

  const updateCanvas = (field: CanvasField, value: unknown) => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      if (!next.canvas) return next;
      next.canvas[field] = value as never;
      if (field === "primaryDataSourceType" || field === "selectedDataSourceTypes") {
        const primaryType = next.canvas.primaryDataSourceType;
        if (primaryType !== "multiple") {
          next.canvas.selectedDataSourceTypes = [];
          next.canvas.secondaryConnectorIds = [];
          const primaryConnector = next.common.connectors.find((connector) => connector.id === next.canvas?.primaryConnectorId);
          if (!primaryConnector || primaryConnector.dataSourceType !== primaryType) next.canvas.primaryConnectorId = "";
        } else {
          const selectedTypes = new Set(next.canvas.selectedDataSourceTypes);
          next.canvas.secondaryConnectorIds = next.canvas.secondaryConnectorIds.filter((id) => {
            const connector = next.common.connectors.find((candidate) => candidate.id === id);
            return connector && selectedTypes.has(connector.dataSourceType as SelectableCanvasDataSourceType);
          });
          const primaryConnector = next.common.connectors.find((connector) => connector.id === next.canvas?.primaryConnectorId);
          if (!primaryConnector || !selectedTypes.has(primaryConnector.dataSourceType as SelectableCanvasDataSourceType)) next.canvas.primaryConnectorId = "";
        }
        const reconciled = reconcileCanvasConnectorRoles(next.common.connectors, next.canvas.primaryConnectorId, next.canvas.secondaryConnectorIds);
        next.common.connectors = reconciled.connectors;
        next.canvas.primaryConnectorId = reconciled.primaryConnectorId;
        next.canvas.secondaryConnectorIds = reconciled.secondaryConnectorIds;
      }
      return next;
    });
  };

  const updateModelDriven = (field: ModelDrivenField, value: unknown) => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      if (!next.modelDriven) return next;
      next.modelDriven[field] = value as never;
      return next;
    });
  };

  const updateConnector = (connectorId: string, field: ConnectorField, value: string) => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      next.common.connectors = next.common.connectors.map((connector) =>
        connector.id === connectorId ? { ...connector, [field]: value } : connector
      );
      return next;
    });
  };

  const updateConnectorOperation = (connectorId: string, operation: ConnectorOperation, value: boolean) => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      next.common.connectors = next.common.connectors.map((connector) =>
        connector.id === connectorId
          ? { ...connector, supportedOperations: { ...connector.supportedOperations, [operation]: value } }
          : connector
      );
      return next;
    });
  };

  const updateConnectorRole = (connectorId: string, role: "" | "primary" | "secondary") => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      if (!next.canvas) return next;
      const connectors = next.common.connectors.map((connector) => connector.id === connectorId ? { ...connector, canvasRole: role } : connector);
      const currentPrimary = role === "primary"
        ? connectorId
        : next.canvas.primaryConnectorId === connectorId
          ? ""
          : next.canvas.primaryConnectorId;
      const currentSecondary = role === "secondary"
        ? [...new Set([...next.canvas.secondaryConnectorIds, connectorId])]
        : next.canvas.secondaryConnectorIds.filter((id) => id !== connectorId);
      const reconciled = reconcileCanvasConnectorRoles(connectors, currentPrimary, currentSecondary);
      next.common.connectors = reconciled.connectors;
      next.canvas.primaryConnectorId = reconciled.primaryConnectorId;
      next.canvas.secondaryConnectorIds = reconciled.secondaryConnectorIds;
      return next;
    });
  };

  const addConnector = () => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      const selectedSources = next.canvas?.primaryDataSourceType === "multiple"
        ? next.canvas.selectedDataSourceTypes
        : next.canvas?.primaryDataSourceType && next.canvas.primaryDataSourceType !== "undecided"
          ? [next.canvas.primaryDataSourceType]
          : [];
      next.common.connectors = [
        ...next.common.connectors,
        createDefaultConnector({
          id: `connector-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          displayName: "New connector",
          dataSourceType: selectedSources.length === 1 ? selectedSources[0] : ""
        })
      ];
      return next;
    });
  };

  const removeConnector = (connectorId: string) => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      next.common.connectors = next.common.connectors.filter((connector) => connector.id !== connectorId);
      if (next.canvas) {
        if (next.canvas.primaryConnectorId === connectorId) next.canvas.primaryConnectorId = "";
        next.canvas.secondaryConnectorIds = next.canvas.secondaryConnectorIds.filter((id) => id !== connectorId);
        const reconciled = reconcileCanvasConnectorRoles(next.common.connectors, next.canvas.primaryConnectorId, next.canvas.secondaryConnectorIds);
        next.common.connectors = reconciled.connectors;
        next.canvas.primaryConnectorId = reconciled.primaryConnectorId;
        next.canvas.secondaryConnectorIds = reconciled.secondaryConnectorIds;
      }
      return next;
    });
  };

  const toggleSelectedDataSourceType = (sourceType: SelectableCanvasDataSourceType, selected: boolean) => {
    if (!canvas) return;
    const current = new Set(canvas.selectedDataSourceTypes);
    if (selected) current.add(sourceType);
    else current.delete(sourceType);
    updateCanvas("selectedDataSourceTypes", [...current]);
  };

  const updateCanvasRows = <K extends CanvasArrayField>(
    field: K,
    updater: (rows: PowerPlatformCanvasData[K]) => PowerPlatformCanvasData[K]
  ) => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      if (!next.canvas) return next;
      const rows = Array.isArray(next.canvas[field]) ? next.canvas[field] as PowerPlatformCanvasData[K] : [] as PowerPlatformCanvasData[K];
      next.canvas[field] = updater(rows) as never;
      return next;
    });
  };

  const updateModelDrivenRows = <K extends ModelDrivenArrayField>(
    field: K,
    updater: (rows: PowerPlatformModelDrivenData[K]) => PowerPlatformModelDrivenData[K]
  ) => {
    onUpdatePowerPlatform((current, currentProject) => {
      const next = clonePowerPlatformData(current, currentProject);
      if (!next.modelDriven) return next;
      const rows = Array.isArray(next.modelDriven[field]) ? next.modelDriven[field] as PowerPlatformModelDrivenData[K] : [] as PowerPlatformModelDrivenData[K];
      next.modelDriven[field] = updater(rows) as never;
      return next;
    });
  };

  return (
    <section className="tailored-intake power-platform-intake" aria-labelledby={`power-platform-${stageId}`}>
      <div className="tailored-intake-heading">
        <span>Power Platform</span>
        <h3 id={`power-platform-${stageId}`}>Guided Power Platform readiness</h3>
        <p>Capture platform decisions, schema evidence, licensing, and manual build gates before Codex prompts are prepared.</p>
      </div>

      <div className="power-platform-gate-list" aria-label="Power Platform readiness gates">
        {readiness.gates.map((gate) => (
          <div className={`power-platform-gate gate-${gate.status}`} key={gate.id}>
            <strong>{gate.label}</strong>
            <span>{formatPowerPlatformGateStatus(gate.status)}</span>
            <small>{gate.description}</small>
          </div>
        ))}
      </div>

      {stageId === "foundation" ? (
        <div className="field-stack">
          <TextField id={fieldId(stageId, "businessOwner")} label="Business owner" description="Person accountable for requirements and approval." value={common.businessOwner} onChange={(value) => updateCommon("businessOwner", value)} />
          <TextField id={fieldId(stageId, "appOwner")} label="App owner" description="Person accountable for ongoing ownership after launch." value={common.appOwner} onChange={(value) => updateCommon("appOwner", value)} />
          <TextField id={fieldId(stageId, "technicalOwner")} label="Technical owner" description="Person accountable for Power Platform technical decisions." value={common.technicalOwner} onChange={(value) => updateCommon("technicalOwner", value)} />
          <TextField id={fieldId(stageId, "supportOwner")} label="Support owner" description="Person or team accountable for support after launch." value={common.supportOwner} onChange={(value) => updateCommon("supportOwner", value)} />
          <TextField id={fieldId(stageId, "expectedUserCount")} label="Expected user count" description="Estimated named users and usage pattern." value={common.expectedUserCount} onChange={(value) => updateCommon("expectedUserCount", value)} />
          <TextField id={fieldId(stageId, "tenant")} label="Tenant" description="Microsoft tenant where the app will live." value={common.tenant} onChange={(value) => updateCommon("tenant", value)} />
          <TextField id={fieldId(stageId, "environment")} label="Environment" description="Target Power Platform environment or [MISSING: environment name]." value={common.environment} onChange={(value) => updateCommon("environment", value)} required />
          <TextField id={fieldId(stageId, "environmentType")} label="Environment type" description="Development, test, production, sandbox, or managed environment." value={common.environmentType} onChange={(value) => updateCommon("environmentType", value)} />
          <TextField id={fieldId(stageId, "developmentEnvironment")} label="Development environment" description="Development environment name or [MISSING: development environment]." value={common.developmentEnvironment} onChange={(value) => updateCommon("developmentEnvironment", value)} />
          <TextField id={fieldId(stageId, "testEnvironment")} label="Test environment" description="Test/UAT environment name or [MISSING: test environment]." value={common.testEnvironment} onChange={(value) => updateCommon("testEnvironment", value)} />
          <TextField id={fieldId(stageId, "productionEnvironment")} label="Production environment" description="Production environment name or [MISSING: production environment]." value={common.productionEnvironment} onChange={(value) => updateCommon("productionEnvironment", value)} />
          <DecisionStatusField id={fieldId(stageId, "environmentAccessStatus")} label="Environment access status" description="Confirm whether app makers have access to create and edit in this environment." value={common.environmentAccessStatus} onChange={(value) => updateCommon("environmentAccessStatus", value)} required />
          <TextField id={fieldId(stageId, "environmentCreationResponsibility")} label="Environment creation responsibility" description="Who creates or approves environments." value={common.environmentCreationResponsibility} onChange={(value) => updateCommon("environmentCreationResponsibility", value)} />
          <TextField id={fieldId(stageId, "managedEnvironmentRequirement")} label="Managed Environment requirement" description="Whether Managed Environments are required or not applicable." value={common.managedEnvironmentRequirement} onChange={(value) => updateCommon("managedEnvironmentRequirement", value)} />
          <TextField id={fieldId(stageId, "dlpPolicyRequirements")} label="DLP policy requirements" description="DLP policy group and connector policy expectations." value={common.dlpPolicyRequirements} onChange={(value) => updateCommon("dlpPolicyRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "administrativeLimitations")} label="Administrative limitations" description="Known tenant, admin, environment, or policy constraints." value={common.administrativeLimitations} onChange={(value) => updateCommon("administrativeLimitations", value)} multiline />
          <TextField id={fieldId(stageId, "currentPowerAppsLicences")} label="Current Power Apps licences" description="Known licence plan, or [MISSING: licence status]." value={common.currentPowerAppsLicences} onChange={(value) => updateCommon("currentPowerAppsLicences", value)} />
          <TextField id={fieldId(stageId, "currentPowerAutomateLicences")} label="Current Power Automate licences" description="Known Power Automate licence plan." value={common.currentPowerAutomateLicences} onChange={(value) => updateCommon("currentPowerAutomateLicences", value)} />
          <DecisionStatusField id={fieldId(stageId, "dataverseAvailability")} label="Dataverse availability" description="Confirm Dataverse availability. Do not assume it for Canvas." value={common.dataverseAvailability} onChange={(value) => updateCommon("dataverseAvailability", value)} />
          <DecisionStatusField id={fieldId(stageId, "premiumConnectorAvailability")} label="Premium connector availability" description="Confirm whether premium connectors are available." value={common.premiumConnectorAvailability} onChange={(value) => updateCommon("premiumConnectorAvailability", value)} />
          <DecisionStatusField id={fieldId(stageId, "customConnectorAvailability")} label="Custom connector availability" description="Confirm whether custom connectors are available." value={common.customConnectorAvailability} onChange={(value) => updateCommon("customConnectorAvailability", value)} />
          <TextField id={fieldId(stageId, "powerBiLicensing")} label="Power BI licensing" description="Power BI licensing or not-applicable decision." value={common.powerBiLicensing} onChange={(value) => updateCommon("powerBiLicensing", value)} />
          <TextField id={fieldId(stageId, "pcfRequirements")} label="PCF requirements" description="PCF control needs or not-applicable decision." value={common.pcfRequirements} onChange={(value) => updateCommon("pcfRequirements", value)} />
          <TextField id={fieldId(stageId, "licensingBudgetConstraints")} label="Licensing budget constraints" description="Budget limitations affecting licences." value={common.licensingBudgetConstraints} onChange={(value) => updateCommon("licensingBudgetConstraints", value)} multiline />
          <TextField id={fieldId(stageId, "licensingAssumptions")} label="Licensing assumptions" description="Assumptions to verify before Ready for Codex." value={common.licensingAssumptions} onChange={(value) => updateCommon("licensingAssumptions", value)} multiline />
          <TextField id={fieldId(stageId, "outstandingLicensingDecisions")} label="Outstanding licensing decisions" description="Open licence decisions." value={common.outstandingLicensingDecisions} onChange={(value) => updateCommon("outstandingLicensingDecisions", value)} multiline />
          <DecisionStatusField id={fieldId(stageId, "licensingConfirmationStatus")} label="Licensing confirmation status" description="Confirm whether required licences are approved and available." value={common.licensingConfirmationStatus} onChange={(value) => updateCommon("licensingConfirmationStatus", value)} required />
          <TextField id={fieldId(stageId, "solutionAware")} label="Standalone or solution-aware" description="Standalone app, solution-aware app, or decision pending." value={common.solutionAware} onChange={(value) => updateCommon("solutionAware", value)} />
          <TextField id={fieldId(stageId, "solutionName")} label="Solution name" description="Solution display name when applicable." value={common.solutionName} onChange={(value) => updateCommon("solutionName", value)} />
          <TextField id={fieldId(stageId, "solutionUniqueName")} label="Solution unique name" description="Solution unique name when applicable." value={common.solutionUniqueName} onChange={(value) => updateCommon("solutionUniqueName", value)} />
          <TextField id={fieldId(stageId, "publisherName")} label="Publisher" description="Dataverse publisher display name." value={common.publisherName} onChange={(value) => updateCommon("publisherName", value)} />
          <TextField id={fieldId(stageId, "publisherPrefix")} label="Publisher prefix" description="Publisher prefix used for schema/logical names." value={common.publisherPrefix} onChange={(value) => updateCommon("publisherPrefix", value)} />
        </div>
      ) : null}

      {stageId === "data" && canvas ? (
        <div className="field-stack">
          <SelectField
            id={fieldId(stageId, "primaryDataSourceType")}
            label="Primary Canvas data source"
            description="Choose the backend intentionally. The default is not decided; Dataverse and premium connectors are never assumed."
            value={canvas.primaryDataSourceType}
            options={canvasDataSourceOptions}
            onChange={(value) => updateCanvas("primaryDataSourceType", value)}
            required
          />
          {canvas.primaryDataSourceType === "multiple" ? (
            <fieldset className="connector-operations multi-source-selector">
              <legend>Selected Canvas data-source types</legend>
              {selectableCanvasDataSources.map((source) => (
                <label className="checkbox-row" key={source.value}>
                  <input
                    type="checkbox"
                    checked={canvas.selectedDataSourceTypes.includes(source.value)}
                    onChange={(event) => toggleSelectedDataSourceType(source.value, event.target.checked)}
                  />
                  {source.label}
                </label>
              ))}
            </fieldset>
          ) : null}
          <TextField id={fieldId(stageId, "sourcePurpose")} label="Source purpose" description="Explain what this source stores or retrieves." value={canvas.sourcePurpose} onChange={(value) => updateCanvas("sourcePurpose", value)} required />
          <TextField id={fieldId(stageId, "sourceOwnership")} label="Source ownership" description="Who owns schema and access decisions for this source?" value={canvas.sourceOwnership} onChange={(value) => updateCanvas("sourceOwnership", value)} required />
          <TextField id={fieldId(stageId, "sourceOfTruthDecision")} label="Source of truth decision" description="Identify which system wins when data conflicts." value={canvas.sourceOfTruthDecision} onChange={(value) => updateCanvas("sourceOfTruthDecision", value)} multiline />
          <ApplicabilityDecisionEditor
            id={fieldId(stageId, "fileApplicabilityDecision")}
            label="Files and attachments"
            value={canvas.fileApplicabilityDecision}
            onChange={(value) => updateCanvas("fileApplicabilityDecision", value)}
          />
          <TextField id={fieldId(stageId, "fileRequirements")} label="File storage requirement" description="Required file, attachment, library, or explicit file storage detail." value={canvas.fileRequirements} onChange={(value) => updateCanvas("fileRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "attachmentRequirements")} label="Attachment requirement" description="Attachment behavior, list/library linkage, or no-attachment detail." value={canvas.attachmentRequirements} onChange={(value) => updateCanvas("attachmentRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "fileUploadRequirements")} label="File upload requirement" description="Upload limits, user action, destination, and validation expectations." value={canvas.fileUploadRequirements} onChange={(value) => updateCanvas("fileUploadRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "fileDownloadRequirements")} label="File download requirement" description="Download, preview, or access behavior." value={canvas.fileDownloadRequirements} onChange={(value) => updateCanvas("fileDownloadRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "fileMetadataRequirements")} label="File metadata requirement" description="Metadata columns, naming, retention, and linkage requirements." value={canvas.fileMetadataRequirements} onChange={(value) => updateCanvas("fileMetadataRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "fileSizeRequirements")} label="File size requirement" description="Maximum file sizes, file types, and volume expectations." value={canvas.fileSizeRequirements} onChange={(value) => updateCanvas("fileSizeRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "filePermissionRequirements")} label="File permission requirement" description="Who can upload, view, download, delete, or share files." value={canvas.filePermissionRequirements} onChange={(value) => updateCanvas("filePermissionRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "fileValidationRequirements")} label="File validation requirement" description="Required validation for types, size, metadata, malware, or business rules." value={canvas.fileValidationRequirements} onChange={(value) => updateCanvas("fileValidationRequirements", value)} multiline />

          <ConnectorEditor
            connectors={common.connectors}
            selectedSourceTypes={canvas.primaryDataSourceType === "multiple" ? canvas.selectedDataSourceTypes : canvas.primaryDataSourceType === "undecided" ? [] : [canvas.primaryDataSourceType]}
            primaryConnectorId={canvas.primaryConnectorId}
            secondaryConnectorIds={canvas.secondaryConnectorIds}
            updateConnector={updateConnector}
            updateConnectorRole={updateConnectorRole}
            updateConnectorOperation={updateConnectorOperation}
            addConnector={addConnector}
            removeConnector={removeConnector}
            showCanvasRoles
          />

          {usesSharePoint(project) ? (
            <SchemaSection title="SharePoint or Microsoft Lists schema" notice="Internal column names are required before Codex-ready prompts can rely on SharePoint data.">
              <TextField id={fieldId(stageId, "sharePointSiteUrl")} label="SharePoint site URL" description="Site URL that owns the lists or libraries." value={canvas.sharePointSiteUrl} onChange={(value) => updateCanvas("sharePointSiteUrl", value)} />
              <SharePointSchemaEditor
                canvas={canvas}
                updateRows={updateCanvasRows}
              />
              <TextField id={fieldId(stageId, "sharePointListDefinitions")} label="Legacy SharePoint notes" description="Optional notes imported from earlier multiline intake." value={canvas.sharePointListDefinitions} onChange={(value) => updateCanvas("sharePointListDefinitions", value)} multiline />
              <DecisionStatusField id={fieldId(stageId, "internalNameStatus")} label="Internal name confirmation status" description="Overall fallback status for legacy notes. Structured rows remain authoritative." value={canvas.internalNameStatus} onChange={(value) => updateCanvas("internalNameStatus", value)} required />
            </SchemaSection>
          ) : null}

          {usesDataverse(project) ? (
            <SchemaSection title="Canvas Dataverse schema" notice="Logical names are required; display names alone are not Codex-ready.">
              <TextField id={fieldId(stageId, "dataverseEnvironment")} label="Dataverse environment" description="Environment containing the Dataverse tables." value={canvas.dataverseEnvironment} onChange={(value) => updateCanvas("dataverseEnvironment", value)} />
              <TextField id={fieldId(stageId, "dataverseSolution")} label="Dataverse solution" description="Solution name or [MISSING: solution name]." value={canvas.dataverseSolution} onChange={(value) => updateCanvas("dataverseSolution", value)} />
              <TextField id={fieldId(stageId, "dataversePublisherPrefix")} label="Publisher prefix" description="Publisher prefix used by Dataverse logical names." value={canvas.dataversePublisherPrefix} onChange={(value) => updateCanvas("dataversePublisherPrefix", value)} />
              <DataverseSchemaEditor
                tableRows={canvas.dataverseTableSchemas}
                columnRows={canvas.dataverseColumnSchemas}
                relationshipRows={canvas.dataverseRelationshipSchemas}
                updateRows={updateCanvasRows}
              />
              <TextField id={fieldId(stageId, "dataverseTableDefinitions")} label="Legacy Dataverse notes" description="Optional notes imported from earlier multiline intake." value={canvas.dataverseTableDefinitions} onChange={(value) => updateCanvas("dataverseTableDefinitions", value)} multiline />
              <DecisionStatusField id={fieldId(stageId, "dataverseSchemaConfirmationStatus")} label="Canvas Dataverse schema confirmation status" description="Confirm the structured Dataverse schema." value={canvas.dataverseSchemaConfirmationStatus} onChange={(value) => updateCanvas("dataverseSchemaConfirmationStatus", value)} required />
              <DecisionStatusField id={fieldId(stageId, "logicalNameStatus")} label="Logical name confirmation status" description="Overall logical-name confirmation status." value={canvas.logicalNameStatus} onChange={(value) => updateCanvas("logicalNameStatus", value)} required />
            </SchemaSection>
          ) : null}

          {usesOtherConnector(project) ? (
            <SchemaSection title="Other connector schema" notice="External schema and authentication details must be captured before implementation prompts are ready.">
              <OtherConnectorSchemaEditor
                resourceRows={canvas.connectorResourceSchemas}
                fieldRows={canvas.connectorFieldSchemas}
                connectors={common.connectors}
                updateRows={updateCanvasRows}
              />
              <TextField id={fieldId(stageId, "otherDataSources")} label="Other data-source notes" description="Optional notes imported from earlier multiline intake." value={canvas.otherDataSources} onChange={(value) => updateCanvas("otherDataSources", value)} multiline />
              <TextField id={fieldId(stageId, "otherConnectorConfirmationSource")} label="Schema confirmation source" description="Documentation, owner, export, or [MISSING: confirmation source]." value={canvas.otherConnectorConfirmationSource} onChange={(value) => updateCanvas("otherConnectorConfirmationSource", value)} required />
              <DecisionStatusField id={fieldId(stageId, "otherConnectorSchemaConfirmationStatus")} label="Other connector schema confirmation status" description="Confirm the structured connector schema." value={canvas.otherConnectorSchemaConfirmationStatus} onChange={(value) => updateCanvas("otherConnectorSchemaConfirmationStatus", value)} required />
            </SchemaSection>
          ) : null}
        </div>
      ) : null}

      {stageId === "features" && canvas ? (
        <div className="field-stack">
          <SelectField
            id={fieldId(stageId, "subtype")}
            label="Canvas subtype"
            description="Blank responsive, tablet, phone, SharePoint customized, Teams embedded, or other."
            value={canvas.subtype}
            options={canvasSubtypeOptions}
            onChange={(value) => updateCanvas("subtype", value)}
          />
          <TextField id={fieldId(stageId, "responsiveMode")} label="Responsive or fixed layout" description="Responsive, fixed, or pending decision." value={canvas.responsiveMode} onChange={(value) => updateCanvas("responsiveMode", value)} />
          <TextField id={fieldId(stageId, "targetDevices")} label="Target devices" description="Desktop, tablet, phone, Teams, browser, or other." value={canvas.targetDevices} onChange={(value) => updateCanvas("targetDevices", value)} />
          <TextField id={fieldId(stageId, "targetScreenSizes")} label="Target screen sizes" description="Required screen sizes or breakpoints." value={canvas.targetScreenSizes} onChange={(value) => updateCanvas("targetScreenSizes", value)} />
          <TextField id={fieldId(stageId, "orientation")} label="Orientation" description="Portrait, landscape, responsive, or mixed." value={canvas.orientation} onChange={(value) => updateCanvas("orientation", value)} />
          <TextField id={fieldId(stageId, "supportedBrowsers")} label="Supported browsers" description="Browser support expectations." value={canvas.supportedBrowsers} onChange={(value) => updateCanvas("supportedBrowsers", value)} />
          <TextField id={fieldId(stageId, "teamsEmbedding")} label="Teams embedding" description="Teams embedding requirement or not-applicable decision." value={canvas.teamsEmbedding} onChange={(value) => updateCanvas("teamsEmbedding", value)} />
          <TextField id={fieldId(stageId, "controlGeneration")} label="Modern or classic controls" description="Modern/classic control preference and constraints." value={canvas.controlGeneration} onChange={(value) => updateCanvas("controlGeneration", value)} />
          <TextField id={fieldId(stageId, "componentLibraryRequirement")} label="Component-library requirements" description="Reusable component/library requirements." value={canvas.componentLibraryRequirement} onChange={(value) => updateCanvas("componentLibraryRequirement", value)} />
          <ApplicabilityDecisionEditor id={fieldId(stageId, "componentApplicabilityDecision")} label="Canvas component applicability" value={canvas.componentApplicabilityDecision} onChange={(value) => updateCanvas("componentApplicabilityDecision", value)} />
          <TextField id={fieldId(stageId, "customPageRequirement")} label="Custom-page requirements" description="Custom page requirement or not-applicable decision." value={canvas.customPageRequirement} onChange={(value) => updateCanvas("customPageRequirement", value)} />
          <TextField id={fieldId(stageId, "offlineRequirements")} label="Offline requirements" description="Offline support requirement or not-applicable decision." value={canvas.offlineRequirements} onChange={(value) => updateCanvas("offlineRequirements", value)} />
          <TextField id={fieldId(stageId, "mobileDeviceCapabilities")} label="Mobile device capabilities" description="Camera, GPS, barcode, file, notification, or other mobile needs." value={canvas.mobileDeviceCapabilities} onChange={(value) => updateCanvas("mobileDeviceCapabilities", value)} />
          <TextField id={fieldId(stageId, "screenNames")} label="Canvas screen names" description="Screen names that should exist in the app." value={canvas.screenNames} onChange={(value) => updateCanvas("screenNames", value)} multiline />
          <TextField id={fieldId(stageId, "screenPurposes")} label="Screen purposes" description="Purpose of each screen." value={canvas.screenPurposes} onChange={(value) => updateCanvas("screenPurposes", value)} multiline />
          <TextField id={fieldId(stageId, "entryPoints")} label="Entry points" description="How users enter each flow." value={canvas.entryPoints} onChange={(value) => updateCanvas("entryPoints", value)} multiline />
          <TextField id={fieldId(stageId, "exitPoints")} label="Exit points" description="How users complete or leave each flow." value={canvas.exitPoints} onChange={(value) => updateCanvas("exitPoints", value)} multiline />
          <TextField id={fieldId(stageId, "navigationStructure")} label="Navigation structure" description="How users move between screens." value={canvas.navigationStructure} onChange={(value) => updateCanvas("navigationStructure", value)} multiline />
          <TextField id={fieldId(stageId, "containers")} label="Containers" description="Root and nested container planning." value={canvas.containers} onChange={(value) => updateCanvas("containers", value)} multiline />
          <TextField id={fieldId(stageId, "components")} label="Components" description="Reusable components." value={canvas.components} onChange={(value) => updateCanvas("components", value)} multiline />
          <TextField id={fieldId(stageId, "galleries")} label="Galleries" description="Galleries needed, source data, and selected-item behavior." value={canvas.galleries} onChange={(value) => updateCanvas("galleries", value)} multiline />
          <TextField id={fieldId(stageId, "forms")} label="Forms" description="Forms needed, modes, validation, and submit expectations." value={canvas.forms} onChange={(value) => updateCanvas("forms", value)} multiline />
          <TextField id={fieldId(stageId, "tables")} label="Tables" description="Table controls or data table expectations." value={canvas.tables} onChange={(value) => updateCanvas("tables", value)} multiline />
          <TextField id={fieldId(stageId, "dialogs")} label="Dialogs" description="Dialog, modal, and confirmation requirements." value={canvas.dialogs} onChange={(value) => updateCanvas("dialogs", value)} multiline />
          <TextField id={fieldId(stageId, "loadingStates")} label="Loading states" description="Loading behavior." value={canvas.loadingStates} onChange={(value) => updateCanvas("loadingStates", value)} multiline />
          <TextField id={fieldId(stageId, "emptyStates")} label="Empty states" description="Empty-state behavior." value={canvas.emptyStates} onChange={(value) => updateCanvas("emptyStates", value)} multiline />
          <TextField id={fieldId(stageId, "errorStates")} label="Error states" description="Error-state behavior." value={canvas.errorStates} onChange={(value) => updateCanvas("errorStates", value)} multiline />
          <TextField id={fieldId(stageId, "responsiveRules")} label="Responsive rules" description="Responsive layout rules." value={canvas.responsiveRules} onChange={(value) => updateCanvas("responsiveRules", value)} multiline />
          <TextField id={fieldId(stageId, "visibilityRules")} label="Visibility rules" description="Requirement-level visibility rules." value={canvas.visibilityRules} onChange={(value) => updateCanvas("visibilityRules", value)} multiline />
          <TextField id={fieldId(stageId, "displayModeRules")} label="Display-mode rules" description="Requirement-level display-mode rules." value={canvas.displayModeRules} onChange={(value) => updateCanvas("displayModeRules", value)} multiline />
          <TextField id={fieldId(stageId, "appFormulasRequirements")} label="Power Fx planning requirements" description="Describe formulas needed at a requirement level only. Do not write final formulas here." value={canvas.appFormulasRequirements} onChange={(value) => updateCanvas("appFormulasRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "startScreenRequirements")} label="StartScreen requirements" description="Requirement-level StartScreen planning." value={canvas.startScreenRequirements} onChange={(value) => updateCanvas("startScreenRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "onStartRequirements")} label="OnStart requirements" description="Requirement-level OnStart planning." value={canvas.onStartRequirements} onChange={(value) => updateCanvas("onStartRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "namedFormulaRequirements")} label="Named formulas" description="Requirement-level named formula planning." value={canvas.namedFormulaRequirements} onChange={(value) => updateCanvas("namedFormulaRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "globalVariableRequirements")} label="Global variables" description="Global variable planning." value={canvas.globalVariableRequirements} onChange={(value) => updateCanvas("globalVariableRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "contextVariableRequirements")} label="Context variables" description="Context variable planning." value={canvas.contextVariableRequirements} onChange={(value) => updateCanvas("contextVariableRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "collectionRequirements")} label="Collections" description="Collection planning." value={canvas.collectionRequirements} onChange={(value) => updateCanvas("collectionRequirements", value)} multiline />
          <CanvasImplementationTargetEditor canvas={canvas} common={common} updateRows={updateCanvasRows} />
          <TextField id={fieldId(stageId, "screenNamingConvention")} label="Screen naming convention" description="Approved convention for screen names." value={canvas.screenNamingConvention} onChange={(value) => updateCanvas("screenNamingConvention", value)} required />
          <TextField id={fieldId(stageId, "controlNamingConvention")} label="Control naming convention" description="Approved convention for control names." value={canvas.controlNamingConvention} onChange={(value) => updateCanvas("controlNamingConvention", value)} required />
          <TextField id={fieldId(stageId, "controlTypePrefixes")} label="Control-type prefixes" description="Approved prefixes for galleries, forms, buttons, labels, inputs, containers, and other controls." value={canvas.controlTypePrefixes} onChange={(value) => updateCanvas("controlTypePrefixes", value)} multiline required />
          <TextField id={fieldId(stageId, "variableNamingConvention")} label="Variable naming convention" description="Approved convention for global and context variables." value={canvas.variableNamingConvention} onChange={(value) => updateCanvas("variableNamingConvention", value)} required />
          <TextField id={fieldId(stageId, "collectionNamingConvention")} label="Collection naming convention" description="Approved convention for collections." value={canvas.collectionNamingConvention} onChange={(value) => updateCanvas("collectionNamingConvention", value)} required />
          <TextField id={fieldId(stageId, "componentNamingConvention")} label="Component naming convention" description="Approved convention for reusable components, even when components are not applicable." value={canvas.componentNamingConvention} onChange={(value) => updateCanvas("componentNamingConvention", value)} required />
          <TextField id={fieldId(stageId, "formulaFileNamingConvention")} label="Formula file naming convention" description="Approved convention for intended Power Fx output paths." value={canvas.formulaFileNamingConvention} onChange={(value) => updateCanvas("formulaFileNamingConvention", value)} required />
          <TextField id={fieldId(stageId, "yamlFileNamingConvention")} label="YAML file naming convention" description="Approved convention for intended Canvas YAML output paths." value={canvas.yamlFileNamingConvention} onChange={(value) => updateCanvas("yamlFileNamingConvention", value)} required />
          <DecisionStatusField id={fieldId(stageId, "namingStandardConfirmationStatus")} label="Naming-standard confirmation status" description="Controlled confirmation for all Canvas naming standards." value={canvas.namingStandardConfirmationStatus} onChange={(value) => updateCanvas("namingStandardConfirmationStatus", value)} required />
          <DecisionStatusField id={fieldId(stageId, "powerFxStatus")} label="Power Fx planning status" description="Controlled planning status. Does not generate formulas." value={canvas.powerFxStatus} onChange={(value) => updateCanvas("powerFxStatus", value)} />
          <TextField id={fieldId(stageId, "fullScreenYamlRequired")} label="YAML planning requirements" description="State whether full-screen YAML, control YAML, or source export is expected. Do not generate final YAML." value={canvas.fullScreenYamlRequired} onChange={(value) => updateCanvas("fullScreenYamlRequired", value)} multiline />
          <TextField id={fieldId(stageId, "controlLevelYamlRequired")} label="Control YAML requirement" description="Control-level YAML planning only." value={canvas.controlLevelYamlRequired} onChange={(value) => updateCanvas("controlLevelYamlRequired", value)} multiline />
          <TextField id={fieldId(stageId, "containerYamlRequired")} label="Container YAML requirement" description="Container YAML planning only." value={canvas.containerYamlRequired} onChange={(value) => updateCanvas("containerYamlRequired", value)} multiline />
          <TextField id={fieldId(stageId, "componentYamlRequired")} label="Component YAML requirement" description="Component YAML planning only." value={canvas.componentYamlRequired} onChange={(value) => updateCanvas("componentYamlRequired", value)} multiline />
          <TextField id={fieldId(stageId, "paYamlSourceRequired")} label=".pa.yaml requirement" description=".pa.yaml source requirement." value={canvas.paYamlSourceRequired} onChange={(value) => updateCanvas("paYamlSourceRequired", value)} multiline />
          <DecisionStatusField id={fieldId(stageId, "yamlStatus")} label="YAML planning status" description="Controlled planning status. Does not generate YAML." value={canvas.yamlStatus} onChange={(value) => updateCanvas("yamlStatus", value)} />
        </div>
      ) : null}

      {stageId === "workflows" && canvas ? (
        <div className="field-stack">
          <TextField id={fieldId(stageId, "createBehavior")} label="Create behavior" description="How records are created and validated." value={canvas.createBehavior} onChange={(value) => updateCanvas("createBehavior", value)} multiline />
          <TextField id={fieldId(stageId, "readBehavior")} label="Read behavior" description="How records are read and loaded." value={canvas.readBehavior} onChange={(value) => updateCanvas("readBehavior", value)} multiline />
          <TextField id={fieldId(stageId, "updateBehavior")} label="Update behavior" description="How edits are saved and conflicts handled." value={canvas.updateBehavior} onChange={(value) => updateCanvas("updateBehavior", value)} multiline />
          <TextField id={fieldId(stageId, "archiveBehavior")} label="Archive behavior" description="Archive requirements." value={canvas.archiveBehavior} onChange={(value) => updateCanvas("archiveBehavior", value)} multiline />
          <TextField id={fieldId(stageId, "restoreBehavior")} label="Restore behavior" description="Restore requirements." value={canvas.restoreBehavior} onChange={(value) => updateCanvas("restoreBehavior", value)} multiline />
          <TextField id={fieldId(stageId, "deleteRestrictions")} label="Delete restrictions" description="Delete restrictions and no-delete rules." value={canvas.deleteRestrictions} onChange={(value) => updateCanvas("deleteRestrictions", value)} multiline />
          <TextField id={fieldId(stageId, "validationRequirements")} label="Validation" description="Input and business validation requirements." value={canvas.validationRequirements} onChange={(value) => updateCanvas("validationRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "errorHandlingRequirements")} label="Errors" description="Error handling requirements." value={canvas.errorHandlingRequirements} onChange={(value) => updateCanvas("errorHandlingRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "notificationRequirements")} label="Notifications" description="In-app or external notification requirements." value={canvas.notificationRequirements} onChange={(value) => updateCanvas("notificationRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "searchRequirements")} label="Search" description="Search requirements." value={canvas.searchRequirements} onChange={(value) => updateCanvas("searchRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "filteringRequirements")} label="Filtering" description="Filter requirements." value={canvas.filteringRequirements} onChange={(value) => updateCanvas("filteringRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "sortingRequirements")} label="Sorting" description="Sorting requirements." value={canvas.sortingRequirements} onChange={(value) => updateCanvas("sortingRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "delegationRequirements")} label="Delegation requirements" description="Record volumes, filters, sorts, and non-delegable risk areas." value={canvas.delegationRequirements} onChange={(value) => updateCanvas("delegationRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "concurrentUpdateHandling")} label="Concurrent updates" description="Concurrent update expectations and conflict handling." value={canvas.concurrentUpdateHandling} onChange={(value) => updateCanvas("concurrentUpdateHandling", value)} multiline />
          <DecisionStatusField id={fieldId(stageId, "delegationStatus")} label="Delegation planning status" description="Controlled delegation planning status." value={canvas.delegationStatus} onChange={(value) => updateCanvas("delegationStatus", value)} />
          <TextField id={fieldId(stageId, "expectedInstallationMethod")} label="Expected installation method" description="Manual Studio build, source import, code view paste, or other." value={canvas.expectedInstallationMethod} onChange={(value) => updateCanvas("expectedInstallationMethod", value)} />
          <TextField id={fieldId(stageId, "codeViewPasteMethod")} label="Code View method" description="Code View paste method planning only." value={canvas.codeViewPasteMethod} onChange={(value) => updateCanvas("codeViewPasteMethod", value)} />
          <TextField id={fieldId(stageId, "existingSourceAvailability")} label="Existing source" description="Existing source availability." value={canvas.existingSourceAvailability} onChange={(value) => updateCanvas("existingSourceAvailability", value)} />
          <TextField id={fieldId(stageId, "existingAppDependencies")} label="Dependencies" description="Existing app dependencies." value={canvas.existingAppDependencies} onChange={(value) => updateCanvas("existingAppDependencies", value)} multiline />
          <TextField id={fieldId(stageId, "postPasteActions")} label="Post-paste actions" description="Post-paste action planning." value={canvas.postPasteActions} onChange={(value) => updateCanvas("postPasteActions", value)} multiline />
          <TextField id={fieldId(stageId, "validationResponsibility")} label="Validation responsibility" description="Who validates the app after manual build/paste/source import." value={canvas.validationResponsibility} onChange={(value) => updateCanvas("validationResponsibility", value)} />
          <TextField id={fieldId(stageId, "sourceControlApproach")} label="Source-control decision" description="Source-control approach for the Power Platform assets." value={common.sourceControlApproach} onChange={(value) => updateCommon("sourceControlApproach", value)} multiline />
          <TextField id={fieldId(stageId, "deploymentMethod")} label="Deployment method" description="Deployment method." value={common.deploymentMethod} onChange={(value) => updateCommon("deploymentMethod", value)} multiline />
          <TextField id={fieldId(stageId, "deploymentOwner")} label="Deployment owner" description="Named owner or team responsible for deployment." value={common.deploymentOwner} onChange={(value) => updateCommon("deploymentOwner", value)} required />
          <TextField id={fieldId(stageId, "deploymentResponsibility")} label="Deployment responsibility" description="Who handles deployment." value={common.deploymentResponsibility} onChange={(value) => updateCommon("deploymentResponsibility", value)} multiline />
          <DecisionStatusField id={fieldId(stageId, "deploymentResponsibilityStatus")} label="Deployment responsibility status" description="Controlled confirmation for deployment ownership." value={common.deploymentResponsibilityStatus} onChange={(value) => updateCommon("deploymentResponsibilityStatus", value)} required />
          <TextField id={fieldId(stageId, "deploymentStrategy")} label="Environment approach" description="Environment/deployment strategy." value={common.deploymentStrategy} onChange={(value) => updateCommon("deploymentStrategy", value)} multiline />
          <TextField id={fieldId(stageId, "connectionReferences")} label="Connection references decision" description="Connection references decision." value={common.connectionReferences} onChange={(value) => updateCommon("connectionReferences", value)} multiline />
          <TextField id={fieldId(stageId, "environmentVariables")} label="Environment variables decision" description="Environment variables decision." value={common.environmentVariables} onChange={(value) => updateCommon("environmentVariables", value)} multiline />
          <TextField id={fieldId(stageId, "pipelineRequirements")} label="Pipeline decision" description="Pipeline decision." value={common.pipelineRequirements} onChange={(value) => updateCommon("pipelineRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "rollbackExpectations")} label="Rollback decision" description="Rollback expectations." value={common.rollbackExpectations} onChange={(value) => updateCommon("rollbackExpectations", value)} multiline />
          <TextField id={fieldId(stageId, "releaseApprover")} label="Release approver" description="Named approver or approval role." value={common.releaseApprover} onChange={(value) => updateCommon("releaseApprover", value)} required />
          <TextField id={fieldId(stageId, "releaseApprovalResponsibility")} label="Release approval decision" description="Release approval responsibility." value={common.releaseApprovalResponsibility} onChange={(value) => updateCommon("releaseApprovalResponsibility", value)} multiline />
          <DecisionStatusField id={fieldId(stageId, "releaseApprovalStatus")} label="Release approval status" description="Controlled confirmation for release approval." value={common.releaseApprovalStatus} onChange={(value) => updateCommon("releaseApprovalStatus", value)} required />
          <DecisionStatusField id={fieldId(stageId, "almConfirmationStatus")} label="ALM confirmation status" description="Controlled ALM readiness status." value={common.almConfirmationStatus} onChange={(value) => updateCommon("almConfirmationStatus", value)} />
        </div>
      ) : null}

      {project.intake.appType === "powerAppsModelDriven" && modelDriven ? (
        <ModelDrivenSections
          stageId={stageId}
          common={common}
          modelDriven={modelDriven}
          updateCommon={updateCommon}
          updateConnector={updateConnector}
          updateConnectorOperation={updateConnectorOperation}
          addConnector={addConnector}
          removeConnector={removeConnector}
          updateModelDriven={updateModelDriven}
          updateRows={updateModelDrivenRows}
        />
      ) : null}

      {stageId === "security" ? (
        <div className="field-stack">
          <TextField id={fieldId(stageId, "authenticationRequirements")} label="Authentication requirements" description="Expected Microsoft Entra or app access behavior." value={common.authenticationRequirements} onChange={(value) => updateCommon("authenticationRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "authorizationRequirements")} label="Authorization requirements" description="Role, team, record, or data-source access rules." value={common.authorizationRequirements} onChange={(value) => updateCommon("authorizationRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "recordAccessRules")} label="Record access rules" description="Who can view, edit, assign, share, or delete records." value={common.recordAccessRules} onChange={(value) => updateCommon("recordAccessRules", value)} multiline />
          <TextField id={fieldId(stageId, "auditRequirements")} label="Audit requirements" description="Audit logs, history, and retention expectations." value={common.auditRequirements} onChange={(value) => updateCommon("auditRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "roleBasedInterfaceExpectations")} label="Role-based interface expectations" description="How screens/forms/views differ by role." value={common.roleBasedInterfaceExpectations} onChange={(value) => updateCommon("roleBasedInterfaceExpectations", value)} multiline />
          <TextField id={fieldId(stageId, "privacyRequirements")} label="Privacy requirements" description="Privacy and compliance handling." value={common.privacyRequirements} onChange={(value) => updateCommon("privacyRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "keyboardNavigationRequirements")} label="Keyboard navigation" description="Keyboard accessibility requirements." value={common.keyboardNavigationRequirements} onChange={(value) => updateCommon("keyboardNavigationRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "screenReaderRequirements")} label="Screen-reader requirements" description="Screen-reader expectations." value={common.screenReaderRequirements} onChange={(value) => updateCommon("screenReaderRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "accessibleLabelRequirements")} label="Accessible labels" description="Label requirements." value={common.accessibleLabelRequirements} onChange={(value) => updateCommon("accessibleLabelRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "focusOrderRequirements")} label="Focus order" description="Focus order expectations." value={common.focusOrderRequirements} onChange={(value) => updateCommon("focusOrderRequirements", value)} multiline />
          <TextField id={fieldId(stageId, "colourContrastRequirements")} label="Colour contrast" description="Contrast requirements." value={common.colourContrastRequirements} onChange={(value) => updateCommon("colourContrastRequirements", value)} multiline />
          <DecisionStatusField id={fieldId(stageId, "securityReviewStatus")} label="Security review status" description="Controlled status for security review completion." value={common.securityReviewStatus} onChange={(value) => updateCommon("securityReviewStatus", value)} required />
          <TextField id={fieldId(stageId, "functionalTesting")} label="Functional testing" description="Functional test scope required before handoff." value={common.functionalTesting} onChange={(value) => updateCommon("functionalTesting", value)} multiline />
          <TextField id={fieldId(stageId, "accessibilityTesting")} label="Accessibility testing" description="Keyboard, screen reader, labels, focus order, and contrast expectations." value={common.accessibilityTesting} onChange={(value) => updateCommon("accessibilityTesting", value)} multiline />
          <TextField id={fieldId(stageId, "connectorTesting")} label="Connector testing" description="Connector test expectations." value={common.connectorTesting} onChange={(value) => updateCommon("connectorTesting", value)} multiline />
          <TextField id={fieldId(stageId, "permissionTesting")} label="Permission testing" description="Permission and role test expectations." value={common.permissionTesting} onChange={(value) => updateCommon("permissionTesting", value)} multiline />
          <TextField id={fieldId(stageId, "performanceTesting")} label="Performance testing" description="Performance and volume test expectations." value={common.performanceTesting} onChange={(value) => updateCommon("performanceTesting", value)} multiline />
          <TextField id={fieldId(stageId, "deploymentTesting")} label="Deployment testing" description="Solution import, publishing, smoke test, and rollback checks." value={common.deploymentTesting} onChange={(value) => updateCommon("deploymentTesting", value)} multiline />
          <DecisionStatusField id={fieldId(stageId, "testingPlanConfirmationStatus")} label="Testing-plan confirmation status" description="Controlled status for testing readiness." value={common.testingPlanConfirmationStatus} onChange={(value) => updateCommon("testingPlanConfirmationStatus", value)} required />
        </div>
      ) : null}
    </section>
  );
}

function SchemaSection({ title, notice, children }: { title: string; notice: string; children: ReactNode }) {
  return (
    <section className="power-platform-schema-section" aria-label={title}>
      <div className="field-error neutral">
        <CircleAlert size={15} aria-hidden="true" />
        {notice}
      </div>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function ConnectorEditor({
  connectors,
  selectedSourceTypes,
  primaryConnectorId,
  secondaryConnectorIds,
  updateConnector,
  updateConnectorRole,
  updateConnectorOperation,
  addConnector,
  removeConnector,
  showCanvasRoles = false
}: {
  connectors: PowerPlatformConnector[];
  selectedSourceTypes: SelectableCanvasDataSourceType[];
  primaryConnectorId: string;
  secondaryConnectorIds: string[];
  updateConnector: (connectorId: string, field: ConnectorField, value: string) => void;
  updateConnectorRole: (connectorId: string, role: "" | "primary" | "secondary") => void;
  updateConnectorOperation: (connectorId: string, operation: ConnectorOperation, value: boolean) => void;
  addConnector: () => void;
  removeConnector: (connectorId: string) => void;
  showCanvasRoles?: boolean;
}) {
  const selectedSourceLabels = selectedSourceTypes.length
    ? selectableCanvasDataSources.filter((source) => selectedSourceTypes.includes(source.value)).map((source) => source.label).join(", ")
    : showCanvasRoles ? "No backend selected" : "Optional external connectors";

  return (
    <section className="connector-editor" aria-labelledby="connector-editor-title">
      <div className="tailored-intake-heading compact">
        <span>Connector register</span>
        <h4 id="connector-editor-title">Connectors and classification</h4>
        <p>Selected backend assessments required: {selectedSourceLabels}. Classification and licensing must be explicitly confirmed.</p>
      </div>
      {connectors.map((connector, index) => (
        <article className="connector-card" key={connector.id || index}>
          <div className="connector-card-heading">
            <strong>{connector.displayName || `Connector ${index + 1}`}</strong>
            <button className="button button-secondary" type="button" onClick={() => removeConnector(connector.id)}>Remove connector</button>
          </div>
          <SelectField
            id={`connector-${connector.id}-dataSourceType`}
            label="Data-source type"
            description="Select the backend this assessment covers."
            value={connector.dataSourceType as SelectableCanvasDataSourceType | ""}
            options={[{ value: "", label: "Select data-source type" }, ...selectableCanvasDataSources]}
            onChange={(value) => updateConnector(connector.id, "dataSourceType", value)}
            required
          />
          {showCanvasRoles ? (
            <SelectField
              id={`connector-${connector.id}-canvasRole`}
              label="Connector role"
              description="One primary assessment and zero or more secondary assessments are allowed."
              value={connector.id === primaryConnectorId ? "primary" : secondaryConnectorIds.includes(connector.id) ? "secondary" : connector.canvasRole ?? ""}
              options={[
                { value: "", label: "Unassigned" },
                { value: "primary", label: "Primary" },
                { value: "secondary", label: "Secondary" }
              ]}
              onChange={(value) => updateConnectorRole(connector.id, value as "" | "primary" | "secondary")}
            />
          ) : null}
          <TextField id={`connector-${connector.id}-displayName`} label="Connector name" description="Friendly connector or data-source name." value={connector.displayName} onChange={(value) => updateConnector(connector.id, "displayName", value)} required />
          <TextField id={`connector-${connector.id}-purpose`} label="Connector purpose" description="What this connector is used for." value={connector.purpose} onChange={(value) => updateConnector(connector.id, "purpose", value)} multiline />
          <TextField id={`connector-${connector.id}-dataSourceName`} label="Data source name" description="Exact source, list, API, table, or service name." value={connector.dataSourceName} onChange={(value) => updateConnector(connector.id, "dataSourceName", value)} />
          <SelectField
            id={`connector-${connector.id}-classification`}
            label="Connector classification"
            description="Standard, premium, custom, or explicitly not applicable."
            value={connector.connectorClassification}
            options={connectorClassificationOptions.map((value) => ({ value, label: value }))}
            onChange={(value) => updateConnector(connector.id, "connectorClassification", value)}
            required
          />
          <DecisionStatusField
            id={`connector-${connector.id}-classificationConfirmation`}
            label="Classification confirmation"
            description="Exact controlled status. Negative wording cannot confirm this gate."
            value={connector.classificationConfirmationStatus ?? "missingInformation"}
            onChange={(value) => updateConnector(connector.id, "classificationConfirmationStatus", value)}
            required
          />
          <TextField id={`connector-${connector.id}-licenceRequirement`} label="Licence requirement" description="Known licence impact, or [MISSING: licence requirement]." value={connector.licenceRequirement} onChange={(value) => updateConnector(connector.id, "licenceRequirement", value)} />
          <DecisionStatusField
            id={`connector-${connector.id}-licensingConfirmation`}
            label="Licensing confirmation"
            description="Exact controlled status for connector licensing."
            value={connector.licensingConfirmationStatus ?? "missingInformation"}
            onChange={(value) => updateConnector(connector.id, "licensingConfirmationStatus", value)}
            required
          />
          <TextField id={`connector-${connector.id}-auth`} label="Authentication method" description="How the connector authenticates." value={connector.authenticationMethod} onChange={(value) => updateConnector(connector.id, "authenticationMethod", value)} />
          <TextField id={`connector-${connector.id}-gateway`} label="Gateway requirement" description="Whether an on-premises data gateway is required." value={connector.gatewayRequirement} onChange={(value) => updateConnector(connector.id, "gatewayRequirement", value)} />
          <TextField id={`connector-${connector.id}-environment`} label="Environment requirement" description="Environment or tenant requirement for this connector." value={connector.environmentRequirement} onChange={(value) => updateConnector(connector.id, "environmentRequirement", value)} />
          <TextField id={`connector-${connector.id}-dlp`} label="DLP impact" description="Known DLP policy impact or restrictions." value={connector.dlpImpact} onChange={(value) => updateConnector(connector.id, "dlpImpact", value)} multiline />
          <TextField id={`connector-${connector.id}-delegation`} label="Delegation support" description="Known delegation, query, pagination, or throttling limits." value={connector.delegationSupport} onChange={(value) => updateConnector(connector.id, "delegationSupport", value)} />
          <TextField id={`connector-${connector.id}-volume`} label="Expected record volume" description="Expected record count or transaction volume." value={connector.expectedRecordVolume} onChange={(value) => updateConnector(connector.id, "expectedRecordVolume", value)} />
          <fieldset className="connector-operations">
            <legend>Supported operations</legend>
            {connectorOperations.map((operation) => (
              <label className="checkbox-row" key={operation}>
                <input
                  type="checkbox"
                  checked={connector.supportedOperations[operation] === true}
                  onChange={(event) => updateConnectorOperation(connector.id, operation, event.target.checked)}
                />
                {operation}
              </label>
            ))}
          </fieldset>
          <TextField id={`connector-${connector.id}-offline`} label="Offline support" description="Offline behavior or explicit no-offline decision." value={connector.offlineSupport} onChange={(value) => updateConnector(connector.id, "offlineSupport", value)} />
          <TextField id={`connector-${connector.id}-security`} label="Security notes" description="Security and permission notes for the connector." value={connector.securityNotes} onChange={(value) => updateConnector(connector.id, "securityNotes", value)} multiline />
          <TextField id={`connector-${connector.id}-required-permissions`} label="Required connector permissions" description="Exact permissions required for this connector. Generic security notes do not satisfy the permission gate." value={connector.requiredConnectorPermissions ?? ""} onChange={(value) => updateConnector(connector.id, "requiredConnectorPermissions", value)} multiline required />
          <TextField id={`connector-${connector.id}-permission-owner`} label="Permission owner" description="Named person or team that confirms connector permissions." value={connector.permissionOwner ?? ""} onChange={(value) => updateConnector(connector.id, "permissionOwner", value)} required />
          <TextField id={`connector-${connector.id}-permission-validation`} label="Permission validation method" description="How connector permissions will be tested or verified." value={connector.permissionValidationMethod ?? ""} onChange={(value) => updateConnector(connector.id, "permissionValidationMethod", value)} multiline required />
          <DecisionStatusField
            id={`connector-${connector.id}-permission-confirmation`}
            label="Permission confirmation status"
            description="Controlled status for connector permission readiness."
            value={connector.permissionConfirmationStatus ?? "missingInformation"}
            onChange={(value) => updateConnector(connector.id, "permissionConfirmationStatus", value)}
            required
          />
          <TextField id={`connector-${connector.id}-limitations`} label="Limitations" description="Known connector limitations, constraints, or blockers." value={connector.limitations} onChange={(value) => updateConnector(connector.id, "limitations", value)} multiline />
          <TextField id={`connector-${connector.id}-connectionOwner`} label="Connection owner" description="Named person or team that owns this connection after handoff. Approval notes do not satisfy ownership." value={connector.connectionOwner ?? ""} onChange={(value) => updateConnector(connector.id, "connectionOwner", value)} required />
          <TextField id={`connector-${connector.id}-connectionOwnerRole`} label="Connection owner role" description="Owner role, responsibility, or operational handoff responsibility." value={connector.connectionOwnerRole ?? ""} onChange={(value) => updateConnector(connector.id, "connectionOwnerRole", value)} required />
          <DecisionStatusField
            id={`connector-${connector.id}-connectionOwnershipStatus`}
            label="Connection ownership status"
            description="Exact controlled ownership status. Approval notes never confirm this gate."
            value={connector.connectionOwnershipStatus ?? "reviewNeeded"}
            onChange={(value) => updateConnector(connector.id, "connectionOwnershipStatus", value)}
            required
          />
          <TextField id={`connector-${connector.id}-connectionOwnershipNotes`} label="Connection ownership notes" description="Optional ownership limitations, service-account notes, or handoff notes." value={connector.connectionOwnershipNotes ?? ""} onChange={(value) => updateConnector(connector.id, "connectionOwnershipNotes", value)} multiline />
          <TextField id={`connector-${connector.id}-approvalNotes`} label="Approval notes" description="Approval, review, or blocker notes. Notes do not confirm readiness." value={connector.approvalStatus} onChange={(value) => updateConnector(connector.id, "approvalStatus", value)} />
          <DecisionStatusField
            id={`connector-${connector.id}-approvalConfirmationStatus`}
            label="Approval confirmation status"
            description="Exact controlled approval status. Approval notes never confirm this gate."
            value={connector.approvalConfirmationStatus ?? "missingInformation"}
            onChange={(value) => updateConnector(connector.id, "approvalConfirmationStatus", value)}
            required
          />
        </article>
      ))}
      <button className="button button-secondary" type="button" onClick={addConnector}>Add connector</button>
    </section>
  );
}

type CanvasRowUpdater = <K extends CanvasArrayField>(field: K, updater: (rows: PowerPlatformCanvasData[K]) => PowerPlatformCanvasData[K]) => void;
type ModelDrivenRowUpdater = <K extends ModelDrivenArrayField>(field: K, updater: (rows: PowerPlatformModelDrivenData[K]) => PowerPlatformModelDrivenData[K]) => void;
type DataverseRowUpdater = {
  (field: "dataverseTableSchemas", updater: (rows: PowerPlatformCanvasData["dataverseTableSchemas"]) => PowerPlatformCanvasData["dataverseTableSchemas"]): void;
  (field: "dataverseColumnSchemas", updater: (rows: PowerPlatformCanvasData["dataverseColumnSchemas"]) => PowerPlatformCanvasData["dataverseColumnSchemas"]): void;
  (field: "dataverseRelationshipSchemas", updater: (rows: PowerPlatformCanvasData["dataverseRelationshipSchemas"]) => PowerPlatformCanvasData["dataverseRelationshipSchemas"]): void;
};

function SharePointSchemaEditor({
  canvas,
  updateRows
}: {
  canvas: PowerPlatformCanvasData;
  updateRows: CanvasRowUpdater;
}) {
  const listOptions = canvas.sharePointListSchemas.map((list) => ({ value: list.id, label: list.displayName || list.id }));
  const libraryOptions = canvas.sharePointLibrarySchemas.map((library) => ({ value: library.id, label: library.displayName || library.id }));
  return (
    <div className="structured-schema-editor">
      <RecordGroup
        title="SharePoint lists"
        addLabel="Add list"
        onAdd={() => updateRows("sharePointListSchemas", (rows) => [...rows, createDefaultSharePointList()])}
        addPosition="bottom"
      >
        {canvas.sharePointListSchemas.map((row) => (
          <article className="schema-card" key={row.id}>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                updateRows("sharePointListSchemas", (rows) => rows.filter((item) => item.id !== row.id));
                updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.parentType === "list" && item.parentId === row.id ? { ...item, parentId: "", confirmationStatus: "reviewNeeded" } : item));
              }}
            >
              Remove list
            </button>
            <TextField id={`sp-list-${row.id}-display`} label="List display name" description="SharePoint list display name." value={row.displayName} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, displayName: value } : item))} required />
            <TextField id={`sp-list-${row.id}-purpose`} label="Purpose" description="What this list stores." value={row.purpose} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, purpose: value } : item))} />
            <TextField id={`sp-list-${row.id}-count`} label="Expected record count" description="Expected volume." value={row.expectedRecordCount} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, expectedRecordCount: value } : item))} />
            <TextField id={`sp-list-${row.id}-attachments`} label="Attachments enabled" description="Attachment expectation." value={row.attachmentsEnabled} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, attachmentsEnabled: value } : item))} />
            <TextField id={`sp-list-${row.id}-versioning`} label="Versioning expectation" description="Versioning requirements." value={row.versioningExpectation} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, versioningExpectation: value } : item))} />
            <TextField id={`sp-list-${row.id}-permissions`} label="Permission expectation" description="List permission expectations." value={row.permissionExpectation} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, permissionExpectation: value } : item))} />
            <TextField id={`sp-list-${row.id}-status`} label="Record status model" description="Status field/model expectations." value={row.recordStatusModel} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, recordStatusModel: value } : item))} />
            <TextField id={`sp-list-${row.id}-archive`} label="Archive behavior" description="Archive behavior." value={row.archiveBehavior} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, archiveBehavior: value } : item))} />
            <TextField id={`sp-list-${row.id}-restore`} label="Restore behavior" description="Restore behavior." value={row.restoreBehavior} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, restoreBehavior: value } : item))} />
            <DecisionStatusField id={`sp-list-${row.id}-confirmation`} label="Confirmation status" description="Controlled list confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} />
            <TextField id={`sp-list-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this row." value={row.confirmationSource} onChange={(value) => updateRows("sharePointListSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} />
          </article>
        ))}
      </RecordGroup>
      <RecordGroup
        title="SharePoint columns and internal names"
        addLabel="Add column"
        onAdd={() => updateRows("sharePointColumnSchemas", (rows) => [...rows, createDefaultSharePointColumn()])}
        addPosition="bottom"
      >
        {canvas.sharePointColumnSchemas.map((row) => (
          <article className="schema-card" key={row.id}>
            <button className="button button-secondary" type="button" onClick={() => updateRows("sharePointColumnSchemas", (rows) => rows.filter((item) => item.id !== row.id))}>Remove column</button>
            <SelectField
              id={`sp-column-${row.id}-parent-type`}
              label="Parent type"
              description="Choose whether this column belongs to a list or library."
              value={row.parentType}
              options={[
                { value: "", label: "Select parent type" },
                { value: "list", label: "List" },
                { value: "library", label: "Library" }
              ]}
              onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, parentType: value as "list" | "library" | "", parentId: "", confirmationStatus: "reviewNeeded" } : item))}
              required
            />
            <SelectField
              id={`sp-column-${row.id}-parent-id`}
              label="Parent list or library"
              description="Specific parent record for this column. This is never inferred."
              value={row.parentId}
              options={[{ value: "", label: "Select parent" }, ...(row.parentType === "library" ? libraryOptions : listOptions)]}
              onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, parentId: value, confirmationStatus: value ? item.confirmationStatus : "reviewNeeded" } : item))}
              required
            />
            <TextField id={`sp-column-${row.id}-display`} label="Display name" description="Column display name. Changing this does not alter internal name." value={row.displayName} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, displayName: value } : item))} required />
            <TextField id={`sp-column-${row.id}-internal`} label="Internal name" description="Exact SharePoint internal column name. Never derived." value={row.internalName} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, internalName: value } : item))} required />
            <TextField id={`sp-column-${row.id}-type`} label="Column type" description="Text, choice, lookup, person, date, number, etc." value={row.columnType} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, columnType: value } : item))} required />
            <TextField id={`sp-column-${row.id}-required`} label="Required status" description="Required, optional, conditional, or unknown." value={row.requiredStatus} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, requiredStatus: value } : item))} />
            <TextField id={`sp-column-${row.id}-default`} label="Default value" description="Default value if applicable." value={row.defaultValue} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, defaultValue: value } : item))} />
            <TextField id={`sp-column-${row.id}-choice`} label="Choice values" description="Choice values where applicable." value={row.choiceValues} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, choiceValues: value } : item))} />
            <TextField id={`sp-column-${row.id}-lookup-list`} label="Lookup list" description="Lookup target list where applicable." value={row.lookupList} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, lookupList: value } : item))} />
            <TextField id={`sp-column-${row.id}-lookup-column`} label="Lookup column" description="Lookup target column where applicable." value={row.lookupColumn} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, lookupColumn: value } : item))} />
            <TextField id={`sp-column-${row.id}-person`} label="Person-field behavior" description="Person/group behavior where applicable." value={row.personFieldBehavior} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, personFieldBehavior: value } : item))} />
            <TextField id={`sp-column-${row.id}-date`} label="Date and time behavior" description="Date/time handling where applicable." value={row.dateTimeBehavior} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, dateTimeBehavior: value } : item))} />
            <TextField id={`sp-column-${row.id}-indexed`} label="Indexed status" description="Index decision for this column." value={row.indexedStatus} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, indexedStatus: value } : item))} />
            <TextField id={`sp-column-${row.id}-unique`} label="Unique-value status" description="Unique-value decision for this column." value={row.uniqueValueStatus} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, uniqueValueStatus: value } : item))} />
            <TextField id={`sp-column-${row.id}-sensitive`} label="Sensitive-data status" description="Sensitive-data decision for this column." value={row.sensitiveDataStatus} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, sensitiveDataStatus: value } : item))} />
            <TextField id={`sp-column-${row.id}-notes`} label="Notes" description="Column notes." value={row.notes} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, notes: value } : item))} multiline />
            <DecisionStatusField id={`sp-column-${row.id}-confirmation`} label="Confirmation status" description="Controlled internal-name confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} />
            <TextField id={`sp-column-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this column." value={row.confirmationSource} onChange={(value) => updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} />
          </article>
        ))}
      </RecordGroup>
      <RecordGroup
        title="SharePoint libraries"
        addLabel="Add library"
        onAdd={() => updateRows("sharePointLibrarySchemas", (rows) => [...rows, createDefaultSharePointLibrary()])}
      >
        {canvas.sharePointLibrarySchemas.map((row) => (
          <article className="schema-card" key={row.id}>
            <TextField id={`sp-library-${row.id}-display`} label="Library name" description="Document library display name." value={row.displayName} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, displayName: value } : item))} />
            <TextField id={`sp-library-${row.id}-purpose`} label="Purpose" description="What this library stores." value={row.purpose} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, purpose: value } : item))} />
            <TextField id={`sp-library-${row.id}-folders`} label="Folder structure" description="Folder structure expectations." value={row.folderStructure} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, folderStructure: value } : item))} />
            <TextField id={`sp-library-${row.id}-content-types`} label="Content types" description="Content types required." value={row.contentTypes} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, contentTypes: value } : item))} />
            <TextField id={`sp-library-${row.id}-file-types`} label="File types" description="File types expected." value={row.fileTypes} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, fileTypes: value } : item))} />
            <TextField id={`sp-library-${row.id}-file-size`} label="File-size expectations" description="File-size expectations." value={row.fileSizeExpectations} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, fileSizeExpectations: value } : item))} />
            <TextField id={`sp-library-${row.id}-upload`} label="Upload behavior" description="Upload behavior." value={row.uploadBehavior} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, uploadBehavior: value } : item))} />
            <TextField id={`sp-library-${row.id}-download`} label="Download behavior" description="Download behavior." value={row.downloadBehavior} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, downloadBehavior: value } : item))} />
            <TextField id={`sp-library-${row.id}-versioning`} label="Versioning" description="Versioning requirements." value={row.versioning} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, versioning: value } : item))} />
            <TextField id={`sp-library-${row.id}-permissions`} label="Permissions" description="Library permissions." value={row.permissions} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, permissions: value } : item))} />
            <TextField id={`sp-library-${row.id}-retention`} label="Retention" description="Retention requirements." value={row.retention} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, retention: value } : item))} />
            <DecisionStatusField id={`sp-library-${row.id}-confirmation`} label="Confirmation status" description="Controlled library confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} />
            <TextField id={`sp-library-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this library." value={row.confirmationSource} onChange={(value) => updateRows("sharePointLibrarySchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                updateRows("sharePointLibrarySchemas", (rows) => rows.filter((item) => item.id !== row.id));
                updateRows("sharePointColumnSchemas", (rows) => rows.map((item) => item.parentType === "library" && item.parentId === row.id ? { ...item, parentId: "", confirmationStatus: "reviewNeeded" } : item));
              }}
            >
              Remove library
            </button>
          </article>
        ))}
      </RecordGroup>
    </div>
  );
}

function RecordGroup({
  title,
  addLabel,
  onAdd,
  children,
  addPosition = "top"
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
  addPosition?: "top" | "bottom";
}) {
  const addButton = <button className="button button-secondary" type="button" onClick={onAdd}>{addLabel}</button>;
  return (
    <section className="record-group" aria-label={title}>
      <div className="connector-card-heading">
        <h5>{title}</h5>
        {addPosition === "top" ? addButton : null}
      </div>
      {children}
      {addPosition === "bottom" ? addButton : null}
    </section>
  );
}

function listFromText(value: string): string[] {
  return value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
}

function textFromList(value: string[]): string {
  return value.join("; ");
}

function CanvasImplementationTargetEditor({
  canvas,
  common,
  updateRows
}: {
  canvas: PowerPlatformCanvasData;
  common: PowerPlatformCommonData;
  updateRows: CanvasRowUpdater;
}) {
  const screenOptions = canvas.screenTargets.map((screen) => ({ value: screen.id, label: screen.approvedScreenName || screen.displayName || screen.id }));
  const controlOptions = canvas.controlTargets.map((control) => ({ value: control.id, label: control.approvedControlName || control.id }));
  const connectorOptions = common.connectors.map((connector) => ({ value: connector.id, label: connector.displayName || connector.id }));
  const dataSourceOptions = [
    ...canvas.sharePointListSchemas.map((row) => ({ value: row.id, label: `SharePoint list: ${row.displayName || row.id}` })),
    ...canvas.sharePointLibrarySchemas.map((row) => ({ value: row.id, label: `SharePoint library: ${row.displayName || row.id}` })),
    ...canvas.dataverseTableSchemas.map((row) => ({ value: row.id, label: `Dataverse table: ${row.displayName || row.id}` })),
    ...canvas.connectorResourceSchemas.map((row) => ({ value: row.id, label: `Connector resource: ${row.resourceName || row.id}` }))
  ];

  return (
    <section className="structured-schema-editor" aria-label="Canvas implementation targets">
      <div className="field-error neutral">
        <CircleAlert size={15} aria-hidden="true" />
        Structured targets are future Codex output targets only. Project Builder Ai does not generate Power Fx or Canvas YAML source files.
      </div>
      <RecordGroup title="Structured screen targets" addLabel="Add screen target" onAdd={() => updateRows("screenTargets", (rows) => [...rows, createDefaultCanvasScreenTarget()])}>
        {canvas.screenTargets.map((row) => (
          <article className="schema-card" key={row.id}>
            <TextField id={`canvas-screen-${row.id}-id`} label="Stable screen ID" description="Traceable ID used in intended output paths. Do not derive from display label." value={row.id} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, id: value } : item))} required />
            <TextField id={`canvas-screen-${row.id}-display`} label="Display name" description="Human-facing screen label." value={row.displayName} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, displayName: value } : item))} />
            <TextField id={`canvas-screen-${row.id}-approved`} label="Approved screen name" description="Exact Power Apps screen name approved by Architect/client." value={row.approvedScreenName} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, approvedScreenName: value } : item))} required />
            <TextField id={`canvas-screen-${row.id}-purpose`} label="Purpose" description="Purpose of this screen." value={row.purpose} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, purpose: value } : item))} multiline required />
            <TextField id={`canvas-screen-${row.id}-type`} label="Screen type" description="Home, form, queue, detail, settings, dialog host, or other." value={row.screenType} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, screenType: value } : item))} />
            <TextField id={`canvas-screen-${row.id}-entry`} label="Entry points" description="How users reach this screen." value={row.entryPoints} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, entryPoints: value } : item))} multiline />
            <TextField id={`canvas-screen-${row.id}-exit`} label="Exit points" description="How users leave this screen." value={row.exitPoints} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, exitPoints: value } : item))} multiline />
            <ApplicabilityDecisionEditor id={`canvas-screen-${row.id}-data-source-decision`} label="Screen data-source applicability" value={row.dataSourceApplicabilityDecision} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dataSourceApplicabilityDecision: value } : item))} />
            <div className="nested-record-group" aria-label={`Data-source references for ${row.id}`}>
              <div className="connector-card-heading">
                <h6>Structured data-source references</h6>
                <button className="button button-secondary" type="button" onClick={() => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dataSourceReferences: [...item.dataSourceReferences, createDefaultCanvasDataSourceReference()] } : item))}>Add data-source reference</button>
              </div>
              {row.dataSourceReferences.map((reference, referenceIndex) => (
                <div className="inline-field-grid" key={`${row.id}-reference-${referenceIndex}`}>
                  <SelectField id={`canvas-screen-${row.id}-reference-${referenceIndex}-connector`} label="Connector" description="Selected and assigned connector assessment." value={reference.connectorId} options={[{ value: "", label: "Select connector" }, ...connectorOptions]} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dataSourceReferences: item.dataSourceReferences.map((candidate, index) => index === referenceIndex ? { ...candidate, connectorId: value } : candidate) } : item))} />
                  <SelectField id={`canvas-screen-${row.id}-reference-${referenceIndex}-entity`} label="Entity" description="Confirmed active list, library, table, or connector resource." value={reference.entityId} options={[{ value: "", label: "Select entity" }, ...dataSourceOptions]} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dataSourceReferences: item.dataSourceReferences.map((candidate, index) => index === referenceIndex ? { ...candidate, entityId: value } : candidate) } : item))} />
                  <button className="button button-secondary" type="button" onClick={() => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dataSourceReferences: item.dataSourceReferences.filter((_, index) => index !== referenceIndex) } : item))}>Remove reference</button>
                </div>
              ))}
            </div>
            <TextField id={`canvas-screen-${row.id}-entities`} label="Legacy screen entity IDs" description="Legacy review notes only; readiness uses structured connector/entity references above." value={textFromList(row.dataSourceEntityIds)} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dataSourceEntityIds: listFromText(value), referenceReviewNotes: item.referenceReviewNotes || "Legacy screen entity IDs require structured connector/entity review." } : item))} />
            <TextField id={`canvas-screen-${row.id}-sources`} label="Legacy data-source IDs" description="Legacy review notes only; readiness uses structured connector/entity references." value={textFromList(row.dataSourceIds)} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dataSourceIds: listFromText(value), referenceReviewNotes: item.referenceReviewNotes || "Legacy screen data-source IDs require review." } : item))} />
            <TextField id={`canvas-screen-${row.id}-reference-notes`} label="Reference review notes" description="Notes for migrated or ambiguous target references." value={row.referenceReviewNotes} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, referenceReviewNotes: value } : item))} multiline />
            <ApplicabilityDecisionEditor id={`canvas-screen-${row.id}-yaml-decision`} label="Screen YAML output" value={row.yamlOutputDecision} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlOutputDecision: value } : item))} />
            <TextField id={`canvas-screen-${row.id}-yaml-type`} label="YAML output type" description="Screen YAML output requirement or not applicable." value={row.yamlOutputType} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlOutputType: value } : item))} />
            <SelectField id={`canvas-screen-${row.id}-yaml-parent-type`} label="YAML parent type" description="Screen YAML parent must be app when YAML is required." value={row.yamlParentType} options={[{ value: "", label: "Select parent type" }, { value: "app", label: "App" }, { value: "none", label: "None" }]} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlParentType: value as never } : item))} />
            <TextField id={`canvas-screen-${row.id}-yaml-parent`} label="YAML parent ID" description="Parent relationship for intended YAML output, such as app-root." value={row.yamlParentId} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlParentId: value } : item))} />
            <TextField id={`canvas-screen-${row.id}-yaml-location`} label="YAML installation location" description="Where this YAML would be validated in Power Apps Studio." value={row.yamlInstallationLocation} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlInstallationLocation: value } : item))} />
            <TextField id={`canvas-screen-${row.id}-yaml-validation`} label="YAML validation responsibility" description="Person or team responsible for validation." value={row.yamlValidationResponsibility} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlValidationResponsibility: value } : item))} />
            <DecisionStatusField id={`canvas-screen-${row.id}-confirmation`} label="Confirmation status" description="Controlled screen target confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} required />
            <TextField id={`canvas-screen-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this screen target." value={row.confirmationSource} onChange={(value) => updateRows("screenTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} required />
            <button className="button button-secondary" type="button" onClick={() => updateRows("screenTargets", (rows) => rows.filter((item) => item.id !== row.id))}>Remove screen target</button>
          </article>
        ))}
      </RecordGroup>
      <RecordGroup title="Structured control targets" addLabel="Add control target" onAdd={() => updateRows("controlTargets", (rows) => [...rows, createDefaultCanvasControlTarget()])}>
        {canvas.controlTargets.map((row) => (
          <article className="schema-card" key={row.id}>
            <TextField id={`canvas-control-${row.id}-id`} label="Stable control ID" description="Traceable ID used in intended output paths. Do not derive from display label." value={row.id} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, id: value } : item))} required />
            <SelectField id={`canvas-control-${row.id}-screen`} label="Screen target" description="Confirmed parent screen target." value={row.screenId} options={[{ value: "", label: "Select screen" }, ...screenOptions]} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, screenId: value } : item))} required />
            <SelectField id={`canvas-control-${row.id}-parent`} label="Parent control ID" description="Optional parent container/control target." value={row.parentControlId} options={[{ value: "", label: "No parent control" }, ...controlOptions.filter((option) => option.value !== row.id)]} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, parentControlId: value } : item))} />
            <TextField id={`canvas-control-${row.id}-approved`} label="Approved control name" description="Exact approved Power Apps control name." value={row.approvedControlName} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, approvedControlName: value } : item))} required />
            <TextField id={`canvas-control-${row.id}-type`} label="Control type" description="Gallery, form, button, text input, label, container, component instance, etc." value={row.controlType} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, controlType: value } : item))} required />
            <TextField id={`canvas-control-${row.id}-purpose`} label="Purpose" description="What this control does." value={row.purpose} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, purpose: value } : item))} multiline required />
            <ApplicabilityDecisionEditor id={`canvas-control-${row.id}-formula-decision`} label="Formula output" value={row.formulaOutputDecision} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, formulaOutputDecision: value } : item))} />
            <TextField id={`canvas-control-${row.id}-operation`} label="Operation" description="read, create, update, archive, restore, search, upload, download, or other." value={row.operation} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, operation: value } : item))} required />
            <TextField id={`canvas-control-${row.id}-formulas`} label="Formula properties" description="Semicolon/comma-separated properties such as Items, OnSelect, OnSuccess." value={row.formulaProperties} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, formulaProperties: value } : item))} required />
            <TextField id={`canvas-control-${row.id}-connector`} label="Connector ID" description="Connector assessment ID used by formulas." value={row.connectorId} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, connectorId: value } : item))} />
            <SelectField id={`canvas-control-${row.id}-entity`} label="Entity ID" description="Structured list, library, table, or connector resource ID used by formulas." value={row.entityId} options={[{ value: "", label: "Select entity" }, ...dataSourceOptions]} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, entityId: value } : item))} />
            <TextField id={`canvas-control-${row.id}-legacy-source`} label="Legacy data-source ID" description="Legacy review note only; readiness uses Connector ID and Entity ID." value={row.dataSourceId} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dataSourceId: value, referenceReviewNotes: item.referenceReviewNotes || "Legacy data-source ID requires review." } : item))} />
            <TextField id={`canvas-control-${row.id}-legacy-entity`} label="Legacy data-source entity ID" description="Legacy review note only; readiness uses Entity ID." value={row.dataSourceEntityId} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dataSourceEntityId: value, referenceReviewNotes: item.referenceReviewNotes || "Legacy data-source entity ID requires review." } : item))} />
            <TextField id={`canvas-control-${row.id}-fields`} label="Required field IDs" description="Semicolon/comma-separated required field IDs for this target." value={textFromList(row.requiredFieldIds)} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, requiredFieldIds: listFromText(value) } : item))} />
            <ApplicabilityDecisionEditor id={`canvas-control-${row.id}-dependency-decision`} label="Formula dependencies" value={row.dependencyApplicabilityDecision} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dependencyApplicabilityDecision: value } : item))} />
            <TextField id={`canvas-control-${row.id}-dependencies`} label="Dependencies" description="Other controls, variables, collections, or data sources required by this target." value={row.dependencies} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, dependencies: value } : item))} multiline />
            <TextField id={`canvas-control-${row.id}-reference-notes`} label="Reference review notes" description="Notes for migrated or ambiguous target references." value={row.referenceReviewNotes} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, referenceReviewNotes: value } : item))} multiline />
            <TextField id={`canvas-control-${row.id}-visibility`} label="Visibility requirement" description="Visibility rule requirement." value={row.visibilityRequirement} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, visibilityRequirement: value } : item))} />
            <TextField id={`canvas-control-${row.id}-displaymode`} label="Display-mode requirement" description="Display mode rule requirement." value={row.displayModeRequirement} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, displayModeRequirement: value } : item))} />
            <TextField id={`canvas-control-${row.id}-accessible-label`} label="Accessible label requirement" description="Accessible label requirement." value={row.accessibleLabelRequirement} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, accessibleLabelRequirement: value } : item))} />
            <ApplicabilityDecisionEditor id={`canvas-control-${row.id}-yaml-decision`} label="Control YAML output" value={row.yamlOutputDecision} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlOutputDecision: value } : item))} />
            <TextField id={`canvas-control-${row.id}-yaml-type`} label="YAML output type" description="Control/container YAML output requirement." value={row.yamlOutputType} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlOutputType: value } : item))} />
            <SelectField id={`canvas-control-${row.id}-yaml-parent-type`} label="YAML parent type" description="Control YAML parent must be a valid screen or same-screen control." value={row.yamlParentType} options={[{ value: "", label: "Select parent type" }, { value: "screen", label: "Screen" }, { value: "control", label: "Control" }, { value: "none", label: "None" }]} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlParentType: value as never } : item))} />
            <TextField id={`canvas-control-${row.id}-yaml-parent`} label="YAML parent ID" description="Parent screen/container/control ID for intended YAML output." value={row.yamlParentId} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlParentId: value } : item))} />
            <TextField id={`canvas-control-${row.id}-yaml-location`} label="YAML installation location" description="Where this control YAML would be validated." value={row.yamlInstallationLocation} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlInstallationLocation: value } : item))} />
            <TextField id={`canvas-control-${row.id}-yaml-validation`} label="YAML validation responsibility" description="Person or team responsible for validation." value={row.yamlValidationResponsibility} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlValidationResponsibility: value } : item))} />
            <DecisionStatusField id={`canvas-control-${row.id}-confirmation`} label="Confirmation status" description="Controlled control target confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} required />
            <TextField id={`canvas-control-${row.id}-confirm-source`} label="Confirmation source" description="Who or what confirmed this control target." value={row.confirmationSource} onChange={(value) => updateRows("controlTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} required />
            <button className="button button-secondary" type="button" onClick={() => updateRows("controlTargets", (rows) => rows.filter((item) => item.id !== row.id))}>Remove control target</button>
          </article>
        ))}
      </RecordGroup>
      <RecordGroup title="Structured component targets" addLabel="Add component target" onAdd={() => updateRows("componentTargets", (rows) => [...rows, createDefaultCanvasComponentTarget()])}>
        {canvas.componentTargets.map((row) => (
          <article className="schema-card" key={row.id}>
            <TextField id={`canvas-component-${row.id}-id`} label="Stable component ID" description="Traceable component target ID." value={row.id} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, id: value } : item))} required />
            <TextField id={`canvas-component-${row.id}-approved`} label="Approved component name" description="Exact approved component name." value={row.approvedComponentName} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, approvedComponentName: value } : item))} required />
            <TextField id={`canvas-component-${row.id}-purpose`} label="Purpose" description="Reusable component purpose." value={row.purpose} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, purpose: value } : item))} multiline required />
            <TextField id={`canvas-component-${row.id}-inputs`} label="Inputs" description="Component inputs." value={row.inputs} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, inputs: value } : item))} multiline />
            <TextField id={`canvas-component-${row.id}-outputs`} label="Outputs" description="Component outputs." value={row.outputs} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, outputs: value } : item))} multiline />
            <TextField id={`canvas-component-${row.id}-locations`} label="Legacy parent or usage locations" description="Legacy review notes only; readiness uses structured usage targets below." value={row.parentOrUsageLocations} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, parentOrUsageLocations: value } : item))} multiline />
            <div className="nested-record-group" aria-label={`Usage targets for ${row.id}`}>
              <div className="connector-card-heading">
                <h6>Structured component usage targets</h6>
                <button className="button button-secondary" type="button" onClick={() => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, usageTargets: [...item.usageTargets, createDefaultCanvasComponentUsageTarget()] } : item))}>Add usage target</button>
              </div>
              {row.usageTargets.map((usage, usageIndex) => (
                <div className="schema-card compact" key={usage.id || `${row.id}-usage-${usageIndex}`}>
                  <TextField id={`canvas-component-${row.id}-usage-${usageIndex}-id`} label="Usage target ID" description="Stable usage record ID." value={usage.id} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, usageTargets: item.usageTargets.map((candidate, index) => index === usageIndex ? { ...candidate, id: value } : candidate) } : item))} />
                  <SelectField id={`canvas-component-${row.id}-usage-${usageIndex}-type`} label="Target type" description="Component usage target type." value={usage.targetType} options={[{ value: "screen", label: "Screen" }, { value: "control", label: "Control" }]} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, usageTargets: item.usageTargets.map((candidate, index) => index === usageIndex ? { ...candidate, targetType: (value === "control" ? "control" : "screen") as "screen" | "control", targetId: "" } : candidate) } : item))} />
                  <SelectField id={`canvas-component-${row.id}-usage-${usageIndex}-target`} label="Target" description="Structured screen or control target." value={usage.targetId} options={[{ value: "", label: usage.targetType === "control" ? "Select control" : "Select screen" }, ...(usage.targetType === "control" ? controlOptions : screenOptions)]} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, usageTargets: item.usageTargets.map((candidate, index) => index === usageIndex ? { ...candidate, targetId: value } : candidate) } : item))} />
                  <TextField id={`canvas-component-${row.id}-usage-${usageIndex}-purpose`} label="Purpose" description="Why the component is used at this screen/control." value={usage.purpose} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, usageTargets: item.usageTargets.map((candidate, index) => index === usageIndex ? { ...candidate, purpose: value } : candidate) } : item))} />
                  <DecisionStatusField id={`canvas-component-${row.id}-usage-${usageIndex}-status`} label="Usage confirmation status" description="Controlled confirmation for this usage target." value={usage.confirmationStatus} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, usageTargets: item.usageTargets.map((candidate, index) => index === usageIndex ? { ...candidate, confirmationStatus: value } : candidate) } : item))} />
                  <TextField id={`canvas-component-${row.id}-usage-${usageIndex}-source`} label="Usage confirmation source" description="Who or what confirmed this usage target." value={usage.confirmationSource} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, usageTargets: item.usageTargets.map((candidate, index) => index === usageIndex ? { ...candidate, confirmationSource: value } : candidate) } : item))} />
                  <button className="button button-secondary" type="button" onClick={() => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, usageTargets: item.usageTargets.filter((_, index) => index !== usageIndex) } : item))}>Remove usage target</button>
                </div>
              ))}
            </div>
            <ApplicabilityDecisionEditor id={`canvas-component-${row.id}-yaml-decision`} label="Component YAML output" value={row.yamlOutputDecision} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlOutputDecision: value } : item))} />
            <TextField id={`canvas-component-${row.id}-yaml-type`} label="YAML output type" description="Component YAML output requirement." value={row.yamlOutputType} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlOutputType: value } : item))} />
            <SelectField id={`canvas-component-${row.id}-yaml-parent-type`} label="YAML parent type" description="Component YAML parent must use approved component root or none." value={row.yamlParentType} options={[{ value: "", label: "Select parent type" }, { value: "component", label: "Component root" }, { value: "none", label: "None" }]} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlParentType: value as never } : item))} />
            <TextField id={`canvas-component-${row.id}-yaml-parent`} label="YAML parent ID" description="Parent relationship for intended component YAML output." value={row.yamlParentId} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlParentId: value } : item))} />
            <TextField id={`canvas-component-${row.id}-yaml-location`} label="YAML installation location" description="Where this component YAML would be validated." value={row.yamlInstallationLocation} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlInstallationLocation: value } : item))} />
            <TextField id={`canvas-component-${row.id}-yaml-validation`} label="YAML validation responsibility" description="Person or team responsible for validation." value={row.yamlValidationResponsibility} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, yamlValidationResponsibility: value } : item))} />
            <DecisionStatusField id={`canvas-component-${row.id}-confirmation`} label="Confirmation status" description="Controlled component target confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} required />
            <TextField id={`canvas-component-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this component target." value={row.confirmationSource} onChange={(value) => updateRows("componentTargets", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} required />
            <button className="button button-secondary" type="button" onClick={() => updateRows("componentTargets", (rows) => rows.filter((item) => item.id !== row.id))}>Remove component target</button>
          </article>
        ))}
      </RecordGroup>
    </section>
  );
}

function DataverseSchemaEditor({
  tableRows,
  columnRows,
  relationshipRows,
  updateRows
}: {
  tableRows: PowerPlatformCanvasData["dataverseTableSchemas"];
  columnRows: PowerPlatformCanvasData["dataverseColumnSchemas"];
  relationshipRows: PowerPlatformCanvasData["dataverseRelationshipSchemas"];
  updateRows: DataverseRowUpdater;
}) {
  const tableField = "dataverseTableSchemas";
  const columnField = "dataverseColumnSchemas";
  const relationshipField = "dataverseRelationshipSchemas";
  const tableOptions = tableRows.map((table) => ({ value: table.id, label: table.displayName || table.logicalName || table.id }));
  return (
    <div className="structured-schema-editor">
      <RecordGroup title="Dataverse tables" addLabel="Add table" onAdd={() => updateRows(tableField, (rows) => [...rows, createDefaultDataverseTable()])}>
        {tableRows.map((row) => (
          <article className="schema-card" key={row.id}>
            <TextField id={`dv-table-${row.id}-display`} label="Table display name" description="Display name. Logical/schema names are separate and never derived." value={row.displayName} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, displayName: value } : item))} required />
            <TextField id={`dv-table-${row.id}-plural`} label="Plural display name" description="Plural table display name." value={row.pluralDisplayName} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, pluralDisplayName: value } : item))} />
            <TextField id={`dv-table-${row.id}-logical`} label="Logical name" description="Exact Dataverse logical name." value={row.logicalName} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, logicalName: value } : item))} required />
            <TextField id={`dv-table-${row.id}-schema`} label="Schema name" description="Exact Dataverse schema name." value={row.schemaName} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, schemaName: value } : item))} required />
            <TextField id={`dv-table-${row.id}-ownership`} label="Ownership type" description="User/team, organization, activity, virtual, or other." value={row.ownershipType} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, ownershipType: value } : item))} />
            <TextField id={`dv-table-${row.id}-primary-name`} label="Primary name column" description="Primary name column." value={row.primaryNameColumn} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, primaryNameColumn: value } : item))} />
            <TextField id={`dv-table-${row.id}-purpose`} label="Purpose" description="What this table stores." value={row.purpose} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, purpose: value } : item))} />
            <TextField id={`dv-table-${row.id}-count`} label="Expected record count" description="Expected record count." value={row.expectedRecordCount} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, expectedRecordCount: value } : item))} />
            <TextField id={`dv-table-${row.id}-audit`} label="Auditing" description="Audit requirements." value={row.auditStatus} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, auditStatus: value } : item))} />
            <TextField id={`dv-table-${row.id}-search`} label="Search requirement" description="Search requirements." value={row.searchRequirement} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, searchRequirement: value } : item))} />
            <TextField id={`dv-table-${row.id}-security`} label="Security notes" description="Security notes." value={row.securityNotes} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, securityNotes: value } : item))} multiline />
            <DecisionStatusField id={`dv-table-${row.id}-confirmation`} label="Confirmation status" description="Controlled table confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} />
            <TextField id={`dv-table-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this table." value={row.confirmationSource} onChange={(value) => updateRows(tableField, (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                updateRows(tableField, (rows) => rows.filter((item) => item.id !== row.id));
                updateRows(columnField, (rows) => rows.map((item) => item.tableId === row.id ? { ...item, tableId: "", confirmationStatus: "reviewNeeded" } : item));
                updateRows(relationshipField, (rows) => rows.map((item) => item.parentTableId === row.id || item.childTableId === row.id ? { ...item, parentTableId: item.parentTableId === row.id ? "" : item.parentTableId, childTableId: item.childTableId === row.id ? "" : item.childTableId, confirmationStatus: "reviewNeeded" } : item));
              }}
            >
              Remove table
            </button>
          </article>
        ))}
      </RecordGroup>
      <RecordGroup title="Dataverse columns" addLabel="Add column" onAdd={() => updateRows(columnField, (rows) => [...rows, createDefaultDataverseColumn()])}>
        {columnRows.map((row) => (
          <article className="schema-card" key={row.id}>
            <SelectField id={`dv-column-${row.id}-table`} label="Owning table" description="Structured Dataverse table this column belongs to. Never inferred." value={row.tableId} options={[{ value: "", label: "Select table" }, ...tableOptions]} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, tableId: value, confirmationStatus: value ? item.confirmationStatus : "reviewNeeded" } : item))} required />
            <TextField id={`dv-column-${row.id}-display`} label="Column display name" description="Display name. Logical/schema names are separate and never derived." value={row.displayName} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, displayName: value } : item))} required />
            <TextField id={`dv-column-${row.id}-logical`} label="Column logical name" description="Exact Dataverse column logical name." value={row.logicalName} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, logicalName: value } : item))} required />
            <TextField id={`dv-column-${row.id}-schema`} label="Column schema name" description="Exact Dataverse column schema name." value={row.schemaName} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, schemaName: value } : item))} required />
            <TextField id={`dv-column-${row.id}-type`} label="Data type" description="Dataverse data type." value={row.dataType} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, dataType: value } : item))} required />
            <TextField id={`dv-column-${row.id}-required`} label="Required level" description="Required level." value={row.requiredLevel} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, requiredLevel: value } : item))} />
            <TextField id={`dv-column-${row.id}-default`} label="Default value" description="Default value." value={row.defaultValue} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, defaultValue: value } : item))} />
            <TextField id={`dv-column-${row.id}-choice`} label="Choice definition" description="Choice definition." value={row.choiceDefinition} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, choiceDefinition: value } : item))} />
            <TextField id={`dv-column-${row.id}-lookup`} label="Lookup target" description="Lookup target." value={row.lookupTarget} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, lookupTarget: value } : item))} />
            <TextField id={`dv-column-${row.id}-calculated`} label="Calculated-column requirement" description="Calculated-column requirement." value={row.calculatedColumnRequirement} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, calculatedColumnRequirement: value } : item))} />
            <TextField id={`dv-column-${row.id}-formula`} label="Formula-column requirement" description="Formula-column requirement." value={row.formulaColumnRequirement} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, formulaColumnRequirement: value } : item))} />
            <TextField id={`dv-column-${row.id}-rollup`} label="Rollup-column requirement" description="Rollup-column requirement." value={row.rollupColumnRequirement} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, rollupColumnRequirement: value } : item))} />
            <TextField id={`dv-column-${row.id}-audit`} label="Audit status" description="Audit status." value={row.auditStatus} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, auditStatus: value } : item))} />
            <TextField id={`dv-column-${row.id}-sensitive`} label="Sensitive-data status" description="Sensitive-data status." value={row.sensitiveDataStatus} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, sensitiveDataStatus: value } : item))} />
            <DecisionStatusField id={`dv-column-${row.id}-confirmation`} label="Confirmation status" description="Controlled column confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} />
            <TextField id={`dv-column-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this column." value={row.confirmationSource} onChange={(value) => updateRows(columnField, (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} />
            <button className="button button-secondary" type="button" onClick={() => updateRows(columnField, (rows) => rows.filter((item) => item.id !== row.id))}>Remove column</button>
          </article>
        ))}
      </RecordGroup>
      <RecordGroup title="Dataverse relationships" addLabel="Add relationship" onAdd={() => updateRows(relationshipField, (rows) => [...rows, createDefaultDataverseRelationship()])}>
        {relationshipRows.map((row) => (
          <article className="schema-card" key={row.id}>
            <TextField id={`dv-relationship-${row.id}-schema`} label="Relationship schema name" description="Exact relationship schema name. Never derived." value={row.relationshipSchemaName} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, relationshipSchemaName: value } : item))} required />
            <TextField id={`dv-relationship-${row.id}-type`} label="Relationship type" description="One-to-many, many-to-one, many-to-many, etc." value={row.relationshipType} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, relationshipType: value } : item))} />
            <SelectField id={`dv-relationship-${row.id}-parent`} label="Parent table" description="Parent table record." value={row.parentTableId} options={[{ value: "", label: "Select parent table" }, ...tableOptions]} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, parentTableId: value, confirmationStatus: value ? item.confirmationStatus : "reviewNeeded" } : item))} required />
            <SelectField id={`dv-relationship-${row.id}-child`} label="Child table" description="Child table record." value={row.childTableId} options={[{ value: "", label: "Select child table" }, ...tableOptions]} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, childTableId: value, confirmationStatus: value ? item.confirmationStatus : "reviewNeeded" } : item))} required />
            <TextField id={`dv-relationship-${row.id}-required`} label="Required status" description="Relationship required status." value={row.requiredStatus} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, requiredStatus: value } : item))} />
            <TextField id={`dv-relationship-${row.id}-referential`} label="Referential behavior" description="Referential behavior." value={row.referentialBehavior} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, referentialBehavior: value } : item))} />
            <TextField id={`dv-relationship-${row.id}-cascade`} label="Cascade behavior" description="Cascade behavior." value={row.cascadeBehavior} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, cascadeBehavior: value } : item))} />
            <TextField id={`dv-relationship-${row.id}-navigation`} label="Navigation behavior" description="Navigation behavior." value={row.navigationBehavior} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, navigationBehavior: value } : item))} />
            <DecisionStatusField id={`dv-relationship-${row.id}-confirmation`} label="Confirmation status" description="Controlled relationship confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} />
            <TextField id={`dv-relationship-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this relationship." value={row.confirmationSource} onChange={(value) => updateRows(relationshipField, (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} />
            <button className="button button-secondary" type="button" onClick={() => updateRows(relationshipField, (rows) => rows.filter((item) => item.id !== row.id))}>Remove relationship</button>
          </article>
        ))}
      </RecordGroup>
    </div>
  );
}

function OtherConnectorSchemaEditor({
  resourceRows,
  fieldRows,
  connectors,
  updateRows
}: {
  resourceRows: PowerPlatformCanvasData["connectorResourceSchemas"];
  fieldRows: PowerPlatformCanvasData["connectorFieldSchemas"];
  connectors: PowerPlatformConnector[];
  updateRows: CanvasRowUpdater;
}) {
  const connectorOptions = connectors.map((connector) => ({ value: connector.id, label: connector.displayName || connector.dataSourceName || connector.id }));
  const resourceOptionsFor = (connectorId: string) => resourceRows
    .filter((resource) => resource.connectorId === connectorId)
    .map((resource) => ({ value: resource.id, label: resource.resourceName || resource.id }));
  return (
    <div className="structured-schema-editor">
      <RecordGroup title="Connector resources" addLabel="Add resource" onAdd={() => updateRows("connectorResourceSchemas", (rows) => [...rows, createDefaultConnectorResource({ connectorId: connectors[0]?.id ?? "" })])}>
        {resourceRows.map((row) => (
          <article className="schema-card" key={row.id}>
            <SelectField id={`connector-resource-${row.id}-connector`} label="Connector" description="Connector assessment this resource belongs to." value={row.connectorId} options={connectorOptions.length ? connectorOptions : [{ value: "", label: "Add connector assessment first" }]} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, connectorId: value } : item))} />
            <TextField id={`connector-resource-${row.id}-name`} label="Resource name" description="Resource, entity, table, API path, file, or dataset." value={row.resourceName} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, resourceName: value } : item))} required />
            <TextField id={`connector-resource-${row.id}-type`} label="Resource type" description="Resource type." value={row.resourceType} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, resourceType: value } : item))} />
            <TextField id={`connector-resource-${row.id}-purpose`} label="Purpose" description="Resource purpose." value={row.purpose} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, purpose: value } : item))} />
            <TextField id={`connector-resource-${row.id}-identifier`} label="Key or identifier" description="Primary identifier or key field." value={row.keyOrIdentifier} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, keyOrIdentifier: value } : item))} required />
            <TextField id={`connector-resource-${row.id}-auth`} label="Authentication requirement" description="Authentication requirement." value={row.authenticationRequirement} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, authenticationRequirement: value } : item))} required />
            <TextField id={`connector-resource-${row.id}-query-limits`} label="Query limitations" description="Query limitations." value={row.queryLimitations} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, queryLimitations: value } : item))} />
            <TextField id={`connector-resource-${row.id}-pagination`} label="Pagination" description="Pagination expectations." value={row.pagination} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, pagination: value } : item))} />
            <TextField id={`connector-resource-${row.id}-throttling`} label="Throttling" description="Throttling limits." value={row.throttling} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, throttling: value } : item))} />
            <TextField id={`connector-resource-${row.id}-gateway`} label="Gateway requirement" description="Gateway requirement." value={row.gatewayRequirement} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, gatewayRequirement: value } : item))} />
            <DecisionStatusField id={`connector-resource-${row.id}-confirmation`} label="Confirmation status" description="Controlled resource confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} />
            <TextField id={`connector-resource-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this resource." value={row.confirmationSource} onChange={(value) => updateRows("connectorResourceSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                updateRows("connectorResourceSchemas", (rows) => rows.filter((item) => item.id !== row.id));
                updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.resourceId === row.id ? { ...item, resourceId: "", confirmationStatus: "reviewNeeded" } : item));
              }}
            >
              Remove resource
            </button>
          </article>
        ))}
      </RecordGroup>
      <RecordGroup title="Connector fields" addLabel="Add field" onAdd={() => updateRows("connectorFieldSchemas", (rows) => [...rows, createDefaultConnectorField({ connectorId: connectors[0]?.id ?? "", resourceId: resourceRows[0]?.id ?? "" })])}>
        {fieldRows.map((row) => (
          <article className="schema-card" key={row.id}>
            <SelectField id={`connector-field-${row.id}-connector`} label="Connector" description="Connector assessment this field belongs to." value={row.connectorId} options={connectorOptions.length ? connectorOptions : [{ value: "", label: "Add connector assessment first" }]} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, connectorId: value, resourceId: "", confirmationStatus: "reviewNeeded" } : item))} />
            <SelectField id={`connector-field-${row.id}-resource`} label="Resource" description="Connector resource this field belongs to." value={row.resourceId} options={[{ value: "", label: "Select resource" }, ...resourceOptionsFor(row.connectorId)]} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, resourceId: value, confirmationStatus: value ? item.confirmationStatus : "reviewNeeded" } : item))} required />
            <TextField id={`connector-field-${row.id}-display`} label="Display name" description="Field display name." value={row.displayName} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, displayName: value } : item))} />
            <TextField id={`connector-field-${row.id}-identifier`} label="Field identifier" description="Exact connector field identifier. Never derived." value={row.fieldIdentifier} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, fieldIdentifier: value } : item))} required />
            <TextField id={`connector-field-${row.id}-type`} label="Field type" description="Connector field type." value={row.fieldType} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, fieldType: value } : item))} required />
            <TextField id={`connector-field-${row.id}-required`} label="Required status" description="Required status." value={row.requiredStatus} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, requiredStatus: value } : item))} />
            <TextField id={`connector-field-${row.id}-key`} label="Key status" description="Key status." value={row.keyStatus} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, keyStatus: value } : item))} />
            <TextField id={`connector-field-${row.id}-relationship`} label="Relationship" description="Relationship behavior." value={row.relationship} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, relationship: value } : item))} />
            <TextField id={`connector-field-${row.id}-read`} label="Read behavior" description="Read behavior." value={row.readBehavior} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, readBehavior: value } : item))} />
            <TextField id={`connector-field-${row.id}-create`} label="Create behavior" description="Create behavior." value={row.createBehavior} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, createBehavior: value } : item))} />
            <TextField id={`connector-field-${row.id}-update`} label="Update behavior" description="Update behavior." value={row.updateBehavior} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, updateBehavior: value } : item))} />
            <TextField id={`connector-field-${row.id}-delete`} label="Delete behavior" description="Delete behavior." value={row.deleteBehavior} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, deleteBehavior: value } : item))} />
            <DecisionStatusField id={`connector-field-${row.id}-confirmation`} label="Confirmation status" description="Controlled field confirmation status." value={row.confirmationStatus} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationStatus: value } : item))} />
            <TextField id={`connector-field-${row.id}-source`} label="Confirmation source" description="Who or what confirmed this field." value={row.confirmationSource} onChange={(value) => updateRows("connectorFieldSchemas", (rows) => rows.map((item) => item.id === row.id ? { ...item, confirmationSource: value } : item))} />
            <button className="button button-secondary" type="button" onClick={() => updateRows("connectorFieldSchemas", (rows) => rows.filter((item) => item.id !== row.id))}>Remove field</button>
          </article>
        ))}
      </RecordGroup>
    </div>
  );
}

function ApplicabilityDecisionEditor({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: PowerPlatformApplicabilityDecision;
  onChange: (value: PowerPlatformApplicabilityDecision) => void;
}) {
  return (
    <fieldset className="applicability-decision">
      <legend>{label}</legend>
      <SelectField
        id={`${id}-status`}
        label={`${label} applicability`}
        description="Required, not applicable, or undecided."
        value={value.status}
        options={[
          { value: "undecided", label: "Undecided" },
          { value: "required", label: "Required" },
          { value: "notApplicable", label: "Not applicable" }
        ]}
        onChange={(status) => onChange({ ...value, status: status as never })}
      />
      <TextField id={`${id}-details`} label={`${label} details`} description="Details required when applicable." value={value.details} onChange={(details) => onChange({ ...value, details })} multiline />
      <TextField id={`${id}-reason`} label={`${label} not-applicable reason`} description="Reason required when not applicable." value={value.notApplicableReason} onChange={(notApplicableReason) => onChange({ ...value, notApplicableReason })} multiline />
      <DecisionStatusField id={`${id}-confirmation`} label={`${label} confirmation status`} description="Confirm this applicability decision." value={value.confirmationStatus} onChange={(confirmationStatus) => onChange({ ...value, confirmationStatus })} />
    </fieldset>
  );
}

function ModelDrivenSections({
  stageId,
  common,
  modelDriven,
  updateCommon,
  updateConnector,
  updateConnectorOperation,
  addConnector,
  removeConnector,
  updateModelDriven,
  updateRows
}: {
  stageId: string;
  common: PowerPlatformCommonData;
  modelDriven: PowerPlatformModelDrivenData;
  updateCommon: (field: CommonField, value: string) => void;
  updateConnector: (connectorId: string, field: ConnectorField, value: string) => void;
  updateConnectorOperation: (connectorId: string, operation: ConnectorOperation, value: boolean) => void;
  addConnector: () => void;
  removeConnector: (connectorId: string) => void;
  updateModelDriven: (field: ModelDrivenField, value: unknown) => void;
  updateRows: ModelDrivenRowUpdater;
}) {
  if (stageId === "data") {
    return (
      <div className="field-stack">
        <DecisionStatusField id={fieldId(stageId, "dataverseAvailability")} label="Dataverse availability" description="Confirm Dataverse is available before treating this as model-driven ready." value={common.dataverseAvailability || modelDriven.dataverseAvailability} onChange={(value) => updateCommon("dataverseAvailability", value)} required />
        <DecisionStatusField id={fieldId(stageId, "modelDrivenLicensingStatus")} label="Model-driven licensing" description="Confirm model-driven app licensing." value={modelDriven.modelDrivenLicensingStatus} onChange={(value) => updateModelDriven("modelDrivenLicensingStatus", value)} required />
        <DecisionStatusField id={fieldId(stageId, "modelEnvironmentAccessStatus")} label="Model-driven environment access" description="Confirm environment access." value={modelDriven.environmentAccessStatus} onChange={(value) => updateModelDriven("environmentAccessStatus", value)} required />
        <DecisionStatusField id={fieldId(stageId, "solutionPermissionStatus")} label="Solution creation permission" description="Confirm solution creation permission." value={modelDriven.solutionPermissionStatus} onChange={(value) => updateModelDriven("solutionPermissionStatus", value)} required />
        <DecisionStatusField id={fieldId(stageId, "tableCreationPermissionStatus")} label="Table creation permission" description="Confirm table creation permission." value={modelDriven.tableCreationPermissionStatus} onChange={(value) => updateModelDriven("tableCreationPermissionStatus", value)} required />
        <DecisionStatusField id={fieldId(stageId, "securityRoleConfigurationPermissionStatus")} label="Security-role configuration permission" description="Confirm security-role configuration permission." value={modelDriven.securityRoleConfigurationPermissionStatus} onChange={(value) => updateModelDriven("securityRoleConfigurationPermissionStatus", value)} required />
        <DecisionStatusField id={fieldId(stageId, "importPermissionStatus")} label="Solution import permission" description="Confirm solution import permission." value={modelDriven.importPermissionStatus} onChange={(value) => updateModelDriven("importPermissionStatus", value)} required />
        <DecisionStatusField id={fieldId(stageId, "deploymentPermissionStatus")} label="Production deployment permission" description="Confirm production deployment permission." value={modelDriven.deploymentPermissionStatus} onChange={(value) => updateModelDriven("deploymentPermissionStatus", value)} required />
        <TextField id={fieldId(stageId, "solutionName")} label="Solution name" description="Solution that will contain the app and components." value={common.solutionName} onChange={(value) => updateCommon("solutionName", value)} />
        <TextField id={fieldId(stageId, "publisherName")} label="Publisher name" description="Dataverse publisher display name." value={common.publisherName} onChange={(value) => updateCommon("publisherName", value)} />
        <TextField id={fieldId(stageId, "publisherPrefix")} label="Publisher prefix" description="Publisher prefix used for logical names." value={common.publisherPrefix} onChange={(value) => updateCommon("publisherPrefix", value)} required />
        <DataverseSchemaEditor
          tableRows={modelDriven.dataverseTableSchemas}
          columnRows={modelDriven.dataverseColumnSchemas}
          relationshipRows={modelDriven.dataverseRelationshipSchemas}
          updateRows={updateRows}
        />
        <TextField id={fieldId(stageId, "tableDefinitions")} label="Legacy table notes" description="Optional notes imported from earlier multiline intake." value={modelDriven.tableDefinitions} onChange={(value) => updateModelDriven("tableDefinitions", value)} multiline />
        <DecisionStatusField id={fieldId(stageId, "dataverseSchemaConfirmationStatus")} label="Dataverse schema confirmation status" description="Confirm the structured Dataverse schema." value={modelDriven.dataverseSchemaConfirmationStatus} onChange={(value) => updateModelDriven("dataverseSchemaConfirmationStatus", value)} required />
        <DecisionStatusField id={fieldId(stageId, "logicalNameStatus")} label="Logical name confirmation status" description="Confirm logical names." value={modelDriven.logicalNameStatus} onChange={(value) => updateModelDriven("logicalNameStatus", value)} required />
        <ConnectorEditor
          connectors={common.connectors}
          selectedSourceTypes={[]}
          primaryConnectorId=""
          secondaryConnectorIds={[]}
          updateConnector={updateConnector}
          updateConnectorRole={() => undefined}
          updateConnectorOperation={updateConnectorOperation}
          addConnector={addConnector}
          removeConnector={removeConnector}
        />
      </div>
    );
  }

  if (stageId === "features") {
    return (
      <div className="field-stack">
        <TextField id={fieldId(stageId, "formDefinitions")} label="Forms" description="Main forms, quick create forms, business required behavior, and field placement." value={modelDriven.formDefinitions} onChange={(value) => updateModelDriven("formDefinitions", value)} multiline required />
        <TextField id={fieldId(stageId, "viewDefinitions")} label="Views" description="Public/personal views, filters, columns, sorting, and audience." value={modelDriven.viewDefinitions} onChange={(value) => updateModelDriven("viewDefinitions", value)} multiline required />
        <TextField id={fieldId(stageId, "navigationDefinitions")} label="Navigation" description="App areas, groups, subareas, and table placement." value={modelDriven.navigationDefinitions} onChange={(value) => updateModelDriven("navigationDefinitions", value)} multiline required />
        <TextField id={fieldId(stageId, "charts")} label="Charts" description="Chart requirements." value={modelDriven.charts} onChange={(value) => updateModelDriven("charts", value)} multiline />
        <TextField id={fieldId(stageId, "dashboards")} label="Dashboards" description="Dashboard requirements." value={modelDriven.dashboards} onChange={(value) => updateModelDriven("dashboards", value)} multiline />
        <TextField id={fieldId(stageId, "appPages")} label="App pages" description="App page requirements." value={modelDriven.appPages} onChange={(value) => updateModelDriven("appPages", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "chartsDecision")} label="Charts" value={modelDriven.chartsDecision} onChange={(value) => updateModelDriven("chartsDecision", value)} />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "dashboardsDecision")} label="Dashboards" value={modelDriven.dashboardsDecision} onChange={(value) => updateModelDriven("dashboardsDecision", value)} />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "appPagesDecision")} label="App pages" value={modelDriven.appPagesDecision} onChange={(value) => updateModelDriven("appPagesDecision", value)} />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "customPagesDecision")} label="Custom pages" value={modelDriven.customPagesDecision} onChange={(value) => updateModelDriven("customPagesDecision", value)} />
        <DecisionStatusField id={fieldId(stageId, "formsAndViewsStatus")} label="Forms and views status" description="Confirm that forms, views, chart, dashboard, app-page, and custom-page decisions have been reviewed." value={modelDriven.formsAndViewsStatus} onChange={(value) => updateModelDriven("formsAndViewsStatus", value)} required />
        <DecisionStatusField id={fieldId(stageId, "navigationStatus")} label="Navigation status" description="Confirm model-driven navigation requirements have been reviewed." value={modelDriven.navigationStatus} onChange={(value) => updateModelDriven("navigationStatus", value)} required />
        <TextField id={fieldId(stageId, "customPages")} label="Custom pages" description="Custom pages needed inside the model-driven app, if any." value={modelDriven.customPages} onChange={(value) => updateModelDriven("customPages", value)} multiline />
      </div>
    );
  }

  if (stageId === "workflows") {
    return (
      <div className="field-stack">
        <TextField id={fieldId(stageId, "solutionArchitecture")} label="Solution architecture" description="Solution layers, dependencies, environments, and component boundaries." value={modelDriven.solutionArchitecture} onChange={(value) => updateModelDriven("solutionArchitecture", value)} multiline required />
        <TextField id={fieldId(stageId, "businessRules")} label="Business rules" description="Requirement-level business rules. Do not generate final implementation logic here." value={modelDriven.businessRules} onChange={(value) => updateModelDriven("businessRules", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "businessRulesDecision")} label="Business rules" value={modelDriven.businessRulesDecision} onChange={(value) => updateModelDriven("businessRulesDecision", value)} />
        <TextField id={fieldId(stageId, "validationRules")} label="Validation rules" description="Model-driven validation rules and requirement checks." value={modelDriven.validationRules} onChange={(value) => updateModelDriven("validationRules", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "validationRulesDecision")} label="Validation rules" value={modelDriven.validationRulesDecision} onChange={(value) => updateModelDriven("validationRulesDecision", value)} />
        <TextField id={fieldId(stageId, "duplicatePrevention")} label="Duplicate prevention" description="Duplicate detection or prevention requirements." value={modelDriven.duplicatePrevention} onChange={(value) => updateModelDriven("duplicatePrevention", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "duplicatePreventionDecision")} label="Duplicate prevention" value={modelDriven.duplicatePreventionDecision} onChange={(value) => updateModelDriven("duplicatePreventionDecision", value)} />
        <TextField id={fieldId(stageId, "businessProcessFlows")} label="Business process flows" description="Stages, tables, required fields, branches, and roles." value={modelDriven.businessProcessFlows} onChange={(value) => updateModelDriven("businessProcessFlows", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "businessProcessFlowsDecision")} label="Business process flows" value={modelDriven.businessProcessFlowsDecision} onChange={(value) => updateModelDriven("businessProcessFlowsDecision", value)} />
        <TextField id={fieldId(stageId, "automations")} label="Automations" description="Cloud flows, classic workflows, plugins, or manual steps needed." value={modelDriven.automations} onChange={(value) => updateModelDriven("automations", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "automationsDecision")} label="Automations" value={modelDriven.automationsDecision} onChange={(value) => updateModelDriven("automationsDecision", value)} />
        <DecisionStatusField id={fieldId(stageId, "businessLogicStatus")} label="Business logic status" description="Confirm business rules, business process flows, and automations have been reviewed." value={modelDriven.businessLogicStatus} onChange={(value) => updateModelDriven("businessLogicStatus", value)} required />
        <TextField id={fieldId(stageId, "commandBarRules")} label="Command bar" description="Command bar customization requirements." value={modelDriven.commandBarRules} onChange={(value) => updateModelDriven("commandBarRules", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "commandBarRulesDecision")} label="Command bar" value={modelDriven.commandBarRulesDecision} onChange={(value) => updateModelDriven("commandBarRulesDecision", value)} />
        <TextField id={fieldId(stageId, "clientSideJavaScript")} label="Client-side JavaScript" description="Client-side JavaScript requirements, if any." value={modelDriven.clientSideJavaScript} onChange={(value) => updateModelDriven("clientSideJavaScript", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "clientSideJavaScriptDecision")} label="Client-side JavaScript" value={modelDriven.clientSideJavaScriptDecision} onChange={(value) => updateModelDriven("clientSideJavaScriptDecision", value)} />
        <TextField id={fieldId(stageId, "webResources")} label="Web resources" description="Web resource requirements." value={modelDriven.webResources} onChange={(value) => updateModelDriven("webResources", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "webResourcesDecision")} label="Web resources" value={modelDriven.webResourcesDecision} onChange={(value) => updateModelDriven("webResourcesDecision", value)} />
        <TextField id={fieldId(stageId, "htmlWebResources")} label="HTML web resources" description="HTML web resource requirements, if any." value={modelDriven.htmlWebResources} onChange={(value) => updateModelDriven("htmlWebResources", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "htmlWebResourcesDecision")} label="HTML web resources" value={modelDriven.htmlWebResourcesDecision} onChange={(value) => updateModelDriven("htmlWebResourcesDecision", value)} />
        <TextField id={fieldId(stageId, "imageWebResources")} label="Image web resources" description="Image web resource requirements, if any." value={modelDriven.imageWebResources} onChange={(value) => updateModelDriven("imageWebResources", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "imageWebResourcesDecision")} label="Image web resources" value={modelDriven.imageWebResourcesDecision} onChange={(value) => updateModelDriven("imageWebResourcesDecision", value)} />
        <TextField id={fieldId(stageId, "plugins")} label="Plug-ins" description="Plug-in requirements." value={modelDriven.plugins} onChange={(value) => updateModelDriven("plugins", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "pluginsDecision")} label="Plug-ins" value={modelDriven.pluginsDecision} onChange={(value) => updateModelDriven("pluginsDecision", value)} />
        <TextField id={fieldId(stageId, "customWorkflowActivities")} label="Custom workflow activities" description="Custom workflow activity requirements, if any." value={modelDriven.customWorkflowActivities} onChange={(value) => updateModelDriven("customWorkflowActivities", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "customWorkflowActivitiesDecision")} label="Custom workflow activities" value={modelDriven.customWorkflowActivitiesDecision} onChange={(value) => updateModelDriven("customWorkflowActivitiesDecision", value)} />
        <TextField id={fieldId(stageId, "customApis")} label="Custom APIs" description="Custom API requirements." value={modelDriven.customApis} onChange={(value) => updateModelDriven("customApis", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "customApisDecision")} label="Custom APIs" value={modelDriven.customApisDecision} onChange={(value) => updateModelDriven("customApisDecision", value)} />
        <TextField id={fieldId(stageId, "pcfControls")} label="PCF" description="PCF control requirements." value={modelDriven.pcfControls} onChange={(value) => updateModelDriven("pcfControls", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "pcfControlsDecision")} label="PCF" value={modelDriven.pcfControlsDecision} onChange={(value) => updateModelDriven("pcfControlsDecision", value)} />
        <TextField id={fieldId(stageId, "azureIntegrations")} label="Azure integrations" description="Azure integration requirements, if any." value={modelDriven.azureIntegrations} onChange={(value) => updateModelDriven("azureIntegrations", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "azureIntegrationsDecision")} label="Azure integrations" value={modelDriven.azureIntegrationsDecision} onChange={(value) => updateModelDriven("azureIntegrationsDecision", value)} />
        <TextField id={fieldId(stageId, "externalServices")} label="External services" description="External service requirements." value={modelDriven.externalServices} onChange={(value) => updateModelDriven("externalServices", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "externalServicesDecision")} label="External services" value={modelDriven.externalServicesDecision} onChange={(value) => updateModelDriven("externalServicesDecision", value)} />
        <DecisionStatusField id={fieldId(stageId, "extensionsStatus")} label="Extensions status" description="Confirm all model-driven extension applicability decisions have been reviewed." value={modelDriven.extensionsStatus} onChange={(value) => updateModelDriven("extensionsStatus", value)} required />
        <TextField id={fieldId(stageId, "environmentVariables")} label="Environment variables" description="Environment variable values needed for ALM." value={common.environmentVariables} onChange={(value) => updateCommon("environmentVariables", value)} multiline />
        <TextField id={fieldId(stageId, "connectionReferences")} label="Connection references" description="Connection references needed for flows, custom connectors, or integrations." value={common.connectionReferences} onChange={(value) => updateCommon("connectionReferences", value)} multiline />
        <TextField id={fieldId(stageId, "sourceControlApproach")} label="Source-control decision" description="Source-control approach." value={common.sourceControlApproach} onChange={(value) => updateCommon("sourceControlApproach", value)} multiline />
        <DecisionStatusField id={fieldId(stageId, "sourceAvailabilityStatus")} label="Source availability status" description="Controlled source availability. Free-text descriptions do not confirm source availability." value={modelDriven.sourceAvailabilityStatus} onChange={(value) => updateModelDriven("sourceAvailabilityStatus", value)} required />
        <TextField id={fieldId(stageId, "sourceLocation")} label="Source location" description="Repository, solution export path, or approved source location when source is required." value={modelDriven.sourceLocation} onChange={(value) => updateModelDriven("sourceLocation", value)} />
        <TextField id={fieldId(stageId, "sourceType")} label="Source type" description="Unpacked solution, managed/unmanaged export, repository source, or not-applicable context." value={modelDriven.sourceType} onChange={(value) => updateModelDriven("sourceType", value)} />
        <DecisionStatusField id={fieldId(stageId, "sourceValidationStatus")} label="Source validation status" description="Controlled validation status for the source package or repository." value={modelDriven.sourceValidationStatus} onChange={(value) => updateModelDriven("sourceValidationStatus", value)} />
        <TextField id={fieldId(stageId, "sourceValidationEvidence")} label="Source validation evidence" description="How the source was validated, by whom, and when." value={modelDriven.sourceValidationEvidence} onChange={(value) => updateModelDriven("sourceValidationEvidence", value)} multiline />
        <TextField id={fieldId(stageId, "solutionVersion")} label="Solution version" description="Version of the model-driven solution represented by the source." value={modelDriven.solutionVersion} onChange={(value) => updateModelDriven("solutionVersion", value)} />
        <TextField id={fieldId(stageId, "lastUnpackedDate")} label="Last unpacked date" description="Date the solution source was last unpacked or synchronized." value={modelDriven.lastUnpackedDate} onChange={(value) => updateModelDriven("lastUnpackedDate", value)} />
        <TextField id={fieldId(stageId, "sourceNotes")} label="Source notes" description="Preserved legacy source notes, gaps, and source limitations." value={modelDriven.sourceNotes} onChange={(value) => updateModelDriven("sourceNotes", value)} multiline />
        <TextField id={fieldId(stageId, "deploymentMethod")} label="Deployment method" description="Deployment method." value={common.deploymentMethod} onChange={(value) => updateCommon("deploymentMethod", value)} multiline />
        <TextField id={fieldId(stageId, "deploymentResponsibility")} label="Deployment responsibility" description="Deployment responsibility." value={common.deploymentResponsibility} onChange={(value) => updateCommon("deploymentResponsibility", value)} multiline />
        <TextField id={fieldId(stageId, "deploymentStrategy")} label="Deployment strategy" description="Deployment strategy." value={common.deploymentStrategy} onChange={(value) => updateCommon("deploymentStrategy", value)} multiline />
        <TextField id={fieldId(stageId, "pipelineRequirements")} label="Pipeline requirements" description="Pipeline requirements." value={common.pipelineRequirements} onChange={(value) => updateCommon("pipelineRequirements", value)} multiline />
        <TextField id={fieldId(stageId, "rollbackExpectations")} label="Rollback expectations" description="Rollback expectations." value={common.rollbackExpectations} onChange={(value) => updateCommon("rollbackExpectations", value)} multiline />
        <TextField id={fieldId(stageId, "releaseApprovalResponsibility")} label="Release approval responsibility" description="Release approval responsibility." value={common.releaseApprovalResponsibility} onChange={(value) => updateCommon("releaseApprovalResponsibility", value)} multiline />
        <DecisionStatusField id={fieldId(stageId, "almConfirmationStatus")} label="ALM confirmation status" description="Controlled ALM readiness status." value={common.almConfirmationStatus} onChange={(value) => updateCommon("almConfirmationStatus", value)} />
        <DecisionStatusField id={fieldId(stageId, "almReadinessStatus")} label="Model-driven ALM readiness status" description="Confirm the model-driven ALM plan is ready for Codex handoff." value={modelDriven.almReadinessStatus} onChange={(value) => updateModelDriven("almReadinessStatus", value)} />
        <DecisionStatusField id={fieldId(stageId, "solutionArchitectureConfirmationStatus")} label="Solution architecture confirmation status" description="Controlled architecture confirmation status." value={modelDriven.solutionArchitectureConfirmationStatus} onChange={(value) => updateModelDriven("solutionArchitectureConfirmationStatus", value)} required />
      </div>
    );
  }

  if (stageId === "security") {
    return (
      <div className="field-stack">
        <TextField id={fieldId(stageId, "securityRoles")} label="Security roles" description="Roles, privileges, and privilege depth by table." value={modelDriven.securityRoles} onChange={(value) => updateModelDriven("securityRoles", value)} multiline required />
        <TextField id={fieldId(stageId, "businessUnits")} label="Business units" description="Business units." value={modelDriven.businessUnits} onChange={(value) => updateModelDriven("businessUnits", value)} multiline />
        <TextField id={fieldId(stageId, "ownerTeams")} label="Owner teams" description="Owner teams." value={modelDriven.ownerTeams} onChange={(value) => updateModelDriven("ownerTeams", value)} multiline />
        <TextField id={fieldId(stageId, "accessTeams")} label="Access teams" description="Access teams." value={modelDriven.accessTeams} onChange={(value) => updateModelDriven("accessTeams", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "teamModelDecision")} label="Team model" value={modelDriven.teamModelDecision} onChange={(value) => updateModelDriven("teamModelDecision", value)} />
        <TextField id={fieldId(stageId, "tablePrivileges")} label="Table privileges" description="Table privileges and privilege depth by role." value={modelDriven.tablePrivileges} onChange={(value) => updateModelDriven("tablePrivileges", value)} multiline />
        <TextField id={fieldId(stageId, "privilegeDepth")} label="Privilege depth" description="User, business unit, parent-child, or organization-level depth decisions." value={modelDriven.privilegeDepth} onChange={(value) => updateModelDriven("privilegeDepth", value)} multiline />
        <TextField id={fieldId(stageId, "hierarchySecurity")} label="Hierarchy security" description="Hierarchy security requirements or explicit not-applicable decision." value={modelDriven.hierarchySecurity} onChange={(value) => updateModelDriven("hierarchySecurity", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "hierarchySecurityDecision")} label="Hierarchy security" value={modelDriven.hierarchySecurityDecision} onChange={(value) => updateModelDriven("hierarchySecurityDecision", value)} />
        <TextField id={fieldId(stageId, "sharingExpectations")} label="Sharing expectations" description="Record sharing and reassignment expectations." value={modelDriven.sharingExpectations} onChange={(value) => updateModelDriven("sharingExpectations", value)} multiline />
        <TextField id={fieldId(stageId, "recordOwnership")} label="Record ownership" description="User/team ownership model and owner changes." value={modelDriven.recordOwnership} onChange={(value) => updateModelDriven("recordOwnership", value)} multiline />
        <TextField id={fieldId(stageId, "sensitiveFields")} label="Sensitive fields" description="Sensitive fields and protection requirements." value={modelDriven.sensitiveFields} onChange={(value) => updateModelDriven("sensitiveFields", value)} multiline />
        <TextField id={fieldId(stageId, "fieldSecurityProfiles")} label="Field security profiles" description="Sensitive fields and field-level security requirements." value={modelDriven.fieldSecurityProfiles} onChange={(value) => updateModelDriven("fieldSecurityProfiles", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "fieldSecurityDecision")} label="Field security" value={modelDriven.fieldSecurityDecision} onChange={(value) => updateModelDriven("fieldSecurityDecision", value)} />
        <TextField id={fieldId(stageId, "applicationUsers")} label="Application users" description="Application users required for integrations or automation." value={modelDriven.applicationUsers} onChange={(value) => updateModelDriven("applicationUsers", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "applicationUsersDecision")} label="Application users" value={modelDriven.applicationUsersDecision} onChange={(value) => updateModelDriven("applicationUsersDecision", value)} />
        <TextField id={fieldId(stageId, "servicePrincipals")} label="Service principals" description="Service principals required for integration, import, or deployment." value={modelDriven.servicePrincipals} onChange={(value) => updateModelDriven("servicePrincipals", value)} multiline />
        <ApplicabilityDecisionEditor id={fieldId(stageId, "servicePrincipalsDecision")} label="Service principals" value={modelDriven.servicePrincipalsDecision} onChange={(value) => updateModelDriven("servicePrincipalsDecision", value)} />
        <DecisionStatusField
          id={fieldId(stageId, "securityArchitectureStatus")}
          label="Model-driven security architecture status"
          description="Confirm that security roles, business units, teams, privileges, ownership, sharing, and field security have been reviewed."
          value={modelDriven.securityArchitectureStatus}
          onChange={(value) => updateModelDriven("securityArchitectureStatus", value)}
          required
        />
      </div>
    );
  }

  return null;
}
